/**
 * Snapshot Manager - Manages snapshot lifecycle, retention, compression, and export/import
 */

// Use dynamic imports for Node.js modules (Electron compatibility)
const fs = typeof window === "undefined" ? require("fs") : null;
const path = typeof window === "undefined" ? require("path") : null;
const zlib = typeof window === "undefined" ? require("zlib") : null;
import { Snapshot } from "../../../types/codeIntelligence";
import { SnapshotMetadata } from "./snapshotDiff";

export interface SnapshotRetentionPolicy {
  maxSnapshots?: number; // Maximum number of snapshots to keep
  maxAge?: number; // Maximum age in milliseconds
  keepTagged?: boolean; // Always keep tagged snapshots
  compressionThreshold?: number; // Compress snapshots older than this (ms)
}

export class SnapshotManager {
  private readonly SNAPSHOT_DIR: string;
  private readonly METADATA_DIR: string;
  private retentionPolicy: SnapshotRetentionPolicy;

  constructor(retentionPolicy: SnapshotRetentionPolicy = {}) {
    this.SNAPSHOT_DIR = path
      ? path.join(".project-intel", "history", "snapshots")
      : ".project-intel/history/snapshots";
    this.METADATA_DIR = path
      ? path.join(".project-intel", "history", "metadata")
      : ".project-intel/history/metadata";
    this.retentionPolicy = {
      maxSnapshots: retentionPolicy.maxSnapshots || 100,
      maxAge: retentionPolicy.maxAge || 30 * 24 * 60 * 60 * 1000, // 30 days
      keepTagged: retentionPolicy.keepTagged !== false,
      compressionThreshold:
        retentionPolicy.compressionThreshold || 7 * 24 * 60 * 60 * 1000, // 7 days
    };
  }

  /**
   * Apply retention policy - remove old snapshots
   */
  applyRetentionPolicy(): { removed: number; compressed: number } {
    if (!fs || !path) {
      return { removed: 0, compressed: 0 };
    }

    try {
      const snapshots = this.listAllSnapshots();
      const now = Date.now();
      let removed = 0;
      let compressed = 0;

      // Get tagged snapshots (should be kept)
      const taggedSnapshots = new Set<string>();
      if (this.retentionPolicy.keepTagged) {
        snapshots.forEach((snapshot) => {
          const metadata = this.loadMetadata(snapshot.id);
          if (metadata && metadata.tags && metadata.tags.length > 0) {
            taggedSnapshots.add(snapshot.id);
          }
        });
      }

      // Sort by timestamp (oldest first)
      const sorted = snapshots.sort((a, b) => a.timestamp - b.timestamp);

      // Remove snapshots that exceed max age (unless tagged)
      sorted.forEach((snapshot) => {
        const age = now - snapshot.timestamp;
        const isTagged = taggedSnapshots.has(snapshot.id);

        if (
          !isTagged &&
          this.retentionPolicy.maxAge &&
          age > this.retentionPolicy.maxAge
        ) {
          this.deleteSnapshot(snapshot.id);
          removed++;
        } else if (age > (this.retentionPolicy.compressionThreshold || 0)) {
          // Compress old snapshots
          if (!this.isCompressed(snapshot.id)) {
            this.compressSnapshot(snapshot.id);
            compressed++;
          }
        }
      });

      // Remove oldest snapshots if we exceed max count (unless tagged)
      const remaining = sorted.filter((s) => {
        const isTagged = taggedSnapshots.has(s.id);
        return isTagged || !this.isDeleted(s.id);
      });

      if (
        this.retentionPolicy.maxSnapshots &&
        remaining.length > this.retentionPolicy.maxSnapshots
      ) {
        const toRemove = remaining.slice(
          0,
          remaining.length - this.retentionPolicy.maxSnapshots,
        );
        toRemove.forEach((snapshot) => {
          if (!taggedSnapshots.has(snapshot.id)) {
            this.deleteSnapshot(snapshot.id);
            removed++;
          }
        });
      }

      return { removed, compressed };
    } catch (error) {
      console.error(
        "[SnapshotManager] Failed to apply retention policy:",
        error,
      );
      return { removed: 0, compressed: 0 };
    }
  }

  /**
   * Compress a snapshot using gzip
   */
  compressSnapshot(snapshotId: string): boolean {
    if (!fs || !path || !zlib) {
      return false;
    }

    try {
      const snapshotPath = path.join(this.SNAPSHOT_DIR, `${snapshotId}.json`);
      const compressedPath = path.join(
        this.SNAPSHOT_DIR,
        `${snapshotId}.json.gz`,
      );

      if (!fs.existsSync(snapshotPath)) {
        return false;
      }

      const content = fs.readFileSync(snapshotPath);
      const compressed = zlib.gzipSync(content);
      fs.writeFileSync(compressedPath, compressed);
      fs.unlinkSync(snapshotPath); // Remove uncompressed version

      return true;
    } catch (error) {
      console.error(
        `[SnapshotManager] Failed to compress snapshot ${snapshotId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Decompress a snapshot
   */
  decompressSnapshot(snapshotId: string): boolean {
    if (!fs || !path || !zlib) {
      return false;
    }

    try {
      const compressedPath = path.join(
        this.SNAPSHOT_DIR,
        `${snapshotId}.json.gz`,
      );
      const snapshotPath = path.join(this.SNAPSHOT_DIR, `${snapshotId}.json`);

      if (!fs.existsSync(compressedPath)) {
        return false;
      }

      const compressed = fs.readFileSync(compressedPath);
      const decompressed = zlib.gunzipSync(compressed);
      fs.writeFileSync(snapshotPath, decompressed);

      return true;
    } catch (error) {
      console.error(
        `[SnapshotManager] Failed to decompress snapshot ${snapshotId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Check if snapshot is compressed
   */
  isCompressed(snapshotId: string): boolean {
    if (!fs || !path) {
      return false;
    }

    const compressedPath = path.join(
      this.SNAPSHOT_DIR,
      `${snapshotId}.json.gz`,
    );
    return fs.existsSync(compressedPath);
  }

  /**
   * Check if snapshot is deleted
   */
  private isDeleted(snapshotId: string): boolean {
    if (!fs || !path) {
      return false;
    }

    const snapshotPath = path.join(this.SNAPSHOT_DIR, `${snapshotId}.json`);
    const compressedPath = path.join(
      this.SNAPSHOT_DIR,
      `${snapshotId}.json.gz`,
    );
    return !fs.existsSync(snapshotPath) && !fs.existsSync(compressedPath);
  }

  /**
   * Delete a snapshot
   */
  deleteSnapshot(snapshotId: string): boolean {
    if (!fs || !path) {
      return false;
    }

    try {
      const snapshotPath = path.join(this.SNAPSHOT_DIR, `${snapshotId}.json`);
      const compressedPath = path.join(
        this.SNAPSHOT_DIR,
        `${snapshotId}.json.gz`,
      );
      const metadataPath = path.join(this.METADATA_DIR, `${snapshotId}.json`);

      if (fs.existsSync(snapshotPath)) {
        fs.unlinkSync(snapshotPath);
      }
      if (fs.existsSync(compressedPath)) {
        fs.unlinkSync(compressedPath);
      }
      if (fs.existsSync(metadataPath)) {
        fs.unlinkSync(metadataPath);
      }

      return true;
    } catch (error) {
      console.error(
        `[SnapshotManager] Failed to delete snapshot ${snapshotId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Tag a snapshot
   */
  tagSnapshot(snapshotId: string, tags: string[]): boolean {
    const metadata = this.loadMetadata(snapshotId);
    if (!metadata) {
      return false;
    }

    metadata.tags = [...new Set([...(metadata.tags || []), ...tags])];
    return this.saveMetadata(snapshotId, metadata);
  }

  /**
   * Remove tags from a snapshot
   */
  untagSnapshot(snapshotId: string, tags: string[]): boolean {
    const metadata = this.loadMetadata(snapshotId);
    if (!metadata) {
      return false;
    }

    if (metadata.tags) {
      metadata.tags = metadata.tags.filter((tag) => !tags.includes(tag));
    }
    return this.saveMetadata(snapshotId, metadata);
  }

  /**
   * Export snapshot to file
   */
  exportSnapshot(snapshotId: string, exportPath: string): boolean {
    if (!fs || !path) {
      return false;
    }

    try {
      // Load snapshot (decompress if needed)
      const snapshot = this.loadSnapshot(snapshotId);
      if (!snapshot) {
        return false;
      }

      // Load metadata if available
      const metadata = this.loadMetadata(snapshotId);
      const exportData = {
        snapshot,
        metadata,
      };

      // Ensure export directory exists
      const exportDir = path.dirname(exportPath);
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
      }

      fs.writeFileSync(exportPath, JSON.stringify(exportData, null, 2));
      return true;
    } catch (error) {
      console.error(
        `[SnapshotManager] Failed to export snapshot ${snapshotId}:`,
        error,
      );
      return false;
    }
  }

  /**
   * Import snapshot from file
   */
  importSnapshot(importPath: string): string | null {
    if (!fs || !path) {
      return null;
    }

    try {
      const content = fs.readFileSync(importPath, "utf8");
      const importData = JSON.parse(content);

      const snapshot: Snapshot = importData.snapshot;
      const metadata: SnapshotMetadata | undefined = importData.metadata;

      // Save snapshot
      const snapshotPath = path.join(this.SNAPSHOT_DIR, `${snapshot.id}.json`);
      const snapshotDir = path.dirname(snapshotPath);
      if (!fs.existsSync(snapshotDir)) {
        fs.mkdirSync(snapshotDir, { recursive: true });
      }
      fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));

      // Save metadata if available
      if (metadata) {
        this.saveMetadata(snapshot.id, metadata);
      }

      return snapshot.id;
    } catch (error) {
      console.error(
        `[SnapshotManager] Failed to import snapshot from ${importPath}:`,
        error,
      );
      return null;
    }
  }

  /**
   * Load snapshot (handles compressed snapshots)
   */
  private loadSnapshot(snapshotId: string): Snapshot | null {
    if (!fs || !path) {
      return null;
    }

    try {
      const snapshotPath = path.join(this.SNAPSHOT_DIR, `${snapshotId}.json`);
      const compressedPath = path.join(
        this.SNAPSHOT_DIR,
        `${snapshotId}.json.gz`,
      );

      if (fs.existsSync(snapshotPath)) {
        const content = fs.readFileSync(snapshotPath, "utf8");
        return JSON.parse(content);
      } else if (fs.existsSync(compressedPath) && zlib) {
        const compressed = fs.readFileSync(compressedPath);
        const decompressed = zlib.gunzipSync(compressed);
        return JSON.parse(decompressed.toString("utf8"));
      }
    } catch (error) {
      console.error(
        `[SnapshotManager] Failed to load snapshot ${snapshotId}:`,
        error,
      );
    }

    return null;
  }

  /**
   * List all snapshots
   */
  private listAllSnapshots(): Snapshot[] {
    if (!fs || !path) {
      return [];
    }

    try {
      if (!fs.existsSync(this.SNAPSHOT_DIR)) {
        return [];
      }

      const files = fs.readdirSync(this.SNAPSHOT_DIR);
      const snapshots: Snapshot[] = [];

      files.forEach((file) => {
        if (file.endsWith(".json") || file.endsWith(".json.gz")) {
          const snapshotId = file.replace(/\.json(\.gz)?$/, "");
          const snapshot = this.loadSnapshot(snapshotId);
          if (snapshot) {
            snapshots.push(snapshot);
          }
        }
      });

      return snapshots;
    } catch (error) {
      console.error("[SnapshotManager] Failed to list snapshots:", error);
      return [];
    }
  }

  /**
   * Load metadata for a snapshot
   */
  loadMetadata(snapshotId: string): SnapshotMetadata | null {
    if (!fs || !path) {
      return null;
    }

    try {
      const metadataPath = path.join(this.METADATA_DIR, `${snapshotId}.json`);
      if (fs.existsSync(metadataPath)) {
        const content = fs.readFileSync(metadataPath, "utf8");
        return JSON.parse(content);
      }
    } catch (error) {
      console.error(
        `[SnapshotManager] Failed to load metadata for ${snapshotId}:`,
        error,
      );
    }

    return null;
  }

  /**
   * Save metadata for a snapshot
   */
  saveMetadata(snapshotId: string, metadata: SnapshotMetadata): boolean {
    if (!fs || !path) {
      return false;
    }

    try {
      if (!fs.existsSync(this.METADATA_DIR)) {
        fs.mkdirSync(this.METADATA_DIR, { recursive: true });
      }

      const metadataPath = path.join(this.METADATA_DIR, `${snapshotId}.json`);
      fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
      return true;
    } catch (error) {
      console.error(
        `[SnapshotManager] Failed to save metadata for ${snapshotId}:`,
        error,
      );
      return false;
    }
  }
}
