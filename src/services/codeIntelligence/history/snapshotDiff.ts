/**
 * Snapshot Diff Engine - Efficient diffing between snapshots
 */

import { Snapshot, FileMetadata } from '../../../types/codeIntelligence';

export interface SnapshotDiff {
  addedFiles: string[];
  removedFiles: string[];
  modifiedFiles: string[];
  unchangedFiles: string[];
  similarity: number;
  detailedDiffs?: Record<string, {
    oldHash: string;
    newHash: string;
    addedLines?: number;
    removedLines?: number;
  }>;
}

export interface SnapshotMetadata {
  id: string;
  timestamp: number;
  commitHash?: string;
  commitMessage?: string;
  commitAuthor?: string;
  tags?: string[];
  description?: string;
}

export class SnapshotDiffEngine {
  /**
   * Compute efficient diff between two snapshots with detailed diffs
   */
  diffSnapshots(oldSnapshot: Snapshot, newSnapshot: Snapshot, includeDetails: boolean = false): SnapshotDiff {
    const oldFiles = new Set(Object.keys(oldSnapshot.files));
    const newFiles = new Set(Object.keys(newSnapshot.files));

    const addedFiles: string[] = [];
    const removedFiles: string[] = [];
    const modifiedFiles: string[] = [];
    const unchangedFiles: string[] = [];
    const detailedDiffs: Record<string, {
      oldHash: string;
      newHash: string;
      addedLines?: number;
      removedLines?: number;
    }> = {};

    // Find added files
    newFiles.forEach(file => {
      if (!oldFiles.has(file)) {
        addedFiles.push(file);
        if (includeDetails) {
          const newFile = newSnapshot.files[file];
          detailedDiffs[file] = {
            oldHash: '',
            newHash: newFile?.hash || '',
            addedLines: newFile?.lines || 0
          };
        }
      }
    });

    // Find removed files
    oldFiles.forEach(file => {
      if (!newFiles.has(file)) {
        removedFiles.push(file);
        if (includeDetails) {
          const oldFile = oldSnapshot.files[file];
          detailedDiffs[file] = {
            oldHash: oldFile?.hash || '',
            newHash: '',
            removedLines: oldFile?.lines || 0
          };
        }
      }
    });

    // Find modified and unchanged files
    oldFiles.forEach(file => {
      if (newFiles.has(file)) {
        const oldFile = oldSnapshot.files[file];
        const newFile = newSnapshot.files[file];
        const oldHash = oldFile?.hash;
        const newHash = newFile?.hash;
        
        if (oldHash === newHash) {
          unchangedFiles.push(file);
        } else {
          modifiedFiles.push(file);
          if (includeDetails) {
            detailedDiffs[file] = {
              oldHash: oldHash || '',
              newHash: newHash || '',
              addedLines: Math.max(0, (newFile?.lines || 0) - (oldFile?.lines || 0)),
              removedLines: Math.max(0, (oldFile?.lines || 0) - (newFile?.lines || 0))
            };
          }
        }
      }
    });

    // Calculate similarity
    const totalFiles = Math.max(oldFiles.size, newFiles.size, 1);
    const similarity = unchangedFiles.length / totalFiles;

    return {
      addedFiles,
      removedFiles,
      modifiedFiles,
      unchangedFiles,
      similarity,
      detailedDiffs: includeDetails ? detailedDiffs : undefined
    };
  }

  /**
   * Delta compression for snapshot storage
   */
  createDelta(oldSnapshot: Snapshot, newSnapshot: Snapshot): {
    baseId: string;
    timestamp: number;
    added: Record<string, FileMetadata>;
    removed: string[];
    modified: Record<string, { oldHash: string; newHash: string }>;
  } {
    const diff = this.diffSnapshots(oldSnapshot, newSnapshot);

    const added: Record<string, FileMetadata> = {};
    diff.addedFiles.forEach(file => {
      added[file] = newSnapshot.files[file];
    });

    const modified: Record<string, { oldHash: string; newHash: string }> = {};
    diff.modifiedFiles.forEach(file => {
      modified[file] = {
        oldHash: oldSnapshot.files[file]?.hash || '',
        newHash: newSnapshot.files[file]?.hash || ''
      };
    });

    return {
      baseId: oldSnapshot.id,
      timestamp: newSnapshot.timestamp,
      added,
      removed: diff.removedFiles,
      modified
    };
  }

  /**
   * Fast comparison using hashing
   */
  compareHashes(oldSnapshot: Snapshot, newSnapshot: Snapshot): {
    changed: boolean;
    changedFiles: string[];
  } {
    const changedFiles: string[] = [];
    const allFiles = new Set([
      ...Object.keys(oldSnapshot.files),
      ...Object.keys(newSnapshot.files)
    ]);

    allFiles.forEach(file => {
      const oldHash = oldSnapshot.files[file]?.hash;
      const newHash = newSnapshot.files[file]?.hash;

      if (oldHash !== newHash) {
        changedFiles.push(file);
      }
    });

    return {
      changed: changedFiles.length > 0,
      changedFiles
    };
  }

  /**
   * Extract metadata from snapshot (if available)
   */
  extractMetadata(snapshot: Snapshot): SnapshotMetadata {
    // Try to extract metadata from snapshot properties
    // This assumes metadata might be stored in snapshot properties
    const metadata: SnapshotMetadata = {
      id: snapshot.id,
      timestamp: snapshot.timestamp
    };

    // Check if snapshot has metadata properties (extend Snapshot type if needed)
    const snapshotAny = snapshot as any;
    if (snapshotAny.metadata) {
      metadata.commitHash = snapshotAny.metadata.commitHash;
      metadata.commitMessage = snapshotAny.metadata.commitMessage;
      metadata.commitAuthor = snapshotAny.metadata.commitAuthor;
      metadata.tags = snapshotAny.metadata.tags;
      metadata.description = snapshotAny.metadata.description;
    }

    return metadata;
  }
}
