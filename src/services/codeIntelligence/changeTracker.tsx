/**
 * Change Tracker - Tracks changes and creates snapshots
 */

import { 
  fs, 
  path,
  safeProcessCwd,
  safePathJoin,
  isNodeModulesAvailable
} from './nodeCompat';
import { Snapshot, FileMetadata, ASTSnapshot, DependencyGraph } from '@/types/codeIntelligence';
import { Indexer } from './indexer';
import { ASTExtractor } from './astExtractor';
import { DependencyMapper } from './dependencyMapper';
import { DependencyGraph as DepGraph } from '@/types/codeIntelligence';

export class ChangeTracker {
  private readonly HISTORY_DIR: string;
  private indexer: Indexer;
  private astExtractor: ASTExtractor;
  private dependencyMapper: DependencyMapper;

  constructor() {
    this.indexer = new Indexer();
    this.astExtractor = new ASTExtractor();
    this.dependencyMapper = new DependencyMapper();
    this.HISTORY_DIR = safePathJoin('.project-intel', 'history', 'snapshots');
  }

  /**
   * Create a snapshot of the current codebase state
   */
  async createSnapshot(rootDir: string = safeProcessCwd()): Promise<Snapshot> {
    // Index all files
    const files = await this.indexer.scanProject(rootDir);

    // Extract AST for all files
    const astSnapshots: Record<string, ASTSnapshot> = {};
    for (const [filePath, metadata] of Object.entries(files)) {
      try {
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(rootDir, filePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          astSnapshots[filePath] = this.astExtractor.extractAST(filePath, content);
        }
      } catch (error) {
        console.warn(`[ChangeTracker] Failed to extract AST for ${filePath}:`, error);
      }
    }

    // Build dependency graph
    const dependencyGraph = this.dependencyMapper.buildDependencyGraph(astSnapshots);

    // Create snapshot
    const snapshot: Snapshot = {
      id: this.generateSnapshotId(),
      timestamp: Date.now(),
      files,
      astSnapshots,
      dependencyGraph
    };

    // Save snapshot
    this.saveSnapshot(snapshot);

    return snapshot;
  }

  /**
   * Compare two snapshots and detect changes
   */
  compareSnapshots(oldSnapshot: Snapshot, newSnapshot: Snapshot): {
    added: string[];
    removed: string[];
    modified: string[];
  } {
    const oldFiles = new Set(Object.keys(oldSnapshot.files));
    const newFiles = new Set(Object.keys(newSnapshot.files));

    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];

    // Find added files
    newFiles.forEach(file => {
      if (!oldFiles.has(file)) {
        added.push(file);
      }
    });

    // Find removed files
    oldFiles.forEach(file => {
      if (!newFiles.has(file)) {
        removed.push(file);
      }
    });

    // Find modified files
    oldFiles.forEach(file => {
      if (newFiles.has(file)) {
        const oldHash = oldSnapshot.files[file]?.hash;
        const newHash = newSnapshot.files[file]?.hash;
        if (oldHash !== newHash) {
          modified.push(file);
        }
      }
    });

    return { added, removed, modified };
  }

  /**
   * Get the latest snapshot
   */
  getLatestSnapshot(): Snapshot | null {
    try {
      if (!fs.existsSync(this.HISTORY_DIR)) {
        return null;
      }

      const snapshots = fs.readdirSync(this.HISTORY_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          try {
            const content = fs.readFileSync(path.join(this.HISTORY_DIR, f), 'utf8');
            return JSON.parse(content) as Snapshot;
          } catch {
            return null;
          }
        })
        .filter((s): s is Snapshot => s !== null)
        .sort((a: any, b: any) => b.timestamp - a.timestamp);

      return snapshots[0] || null;
    } catch (error) {
      console.warn('[ChangeTracker] Failed to get latest snapshot:', error);
      return null;
    }
  }

  /**
   * Get snapshot by ID
   */
  getSnapshot(snapshotId: string): Snapshot | null {
    try {
      const snapshotPath = path.join(this.HISTORY_DIR, `${snapshotId}.json`);
      if (fs.existsSync(snapshotPath)) {
        const content = fs.readFileSync(snapshotPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn(`[ChangeTracker] Failed to get snapshot ${snapshotId}:`, error);
    }
    return null;
  }

  /**
   * Track incremental changes - only analyze changed files and their impact graph
   */
  async trackIncrementalChanges(changedFiles: string[], rootDir: string = safeProcessCwd()): Promise<{
    changedFiles: string[];
    impactSet: string[];
    snapshot: Snapshot | null;
  }> {
    if (!fs || !path) {
      return { changedFiles: [], impactSet: [], snapshot: null };
    }

    // Get latest snapshot for comparison
    const latestSnapshot = this.getLatestSnapshot();
    if (!latestSnapshot) {
      // No previous snapshot, create full snapshot
      return {
        changedFiles,
        impactSet: changedFiles,
        snapshot: await this.createSnapshot(rootDir)
      };
    }

    // Incrementally index changed files
    const updatedFiles = await this.indexer.incrementalIndex(changedFiles, rootDir);

    // Build impact graph using BFS from changed nodes
    const impactSet = this.computeImpactSet(changedFiles, latestSnapshot.dependencyGraph);

    // Extract AST only for files in impact set
    const astSnapshots: Record<string, ASTSnapshot> = {};
    const allFilesToProcess = new Set([...changedFiles, ...impactSet]);

    for (const filePath of allFilesToProcess) {
      try {
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(rootDir, filePath);
        if (fs.existsSync(fullPath)) {
          const content = fs.readFileSync(fullPath, 'utf8');
          astSnapshots[filePath] = this.astExtractor.extractAST(filePath, content);
        }
      } catch (error) {
        console.warn(`[ChangeTracker] Failed to extract AST for ${filePath}:`, error);
      }
    }

    // Merge with existing AST snapshots (only update changed/impacted files)
    const mergedASTSnapshots = { ...latestSnapshot.astSnapshots };
    Object.entries(astSnapshots).forEach(([filePath, ast]) => {
      mergedASTSnapshots[filePath] = ast;
    });

    // Rebuild dependency graph (incremental update)
    const dependencyGraph = this.dependencyMapper.buildDependencyGraph(mergedASTSnapshots);

    // Get all file metadata
    const allFiles = this.indexer.loadIndex();

    // Create new snapshot
    const snapshot: Snapshot = {
      id: this.generateSnapshotId(),
      timestamp: Date.now(),
      files: allFiles,
      astSnapshots: mergedASTSnapshots,
      dependencyGraph
    };

    this.saveSnapshot(snapshot);

    return {
      changedFiles,
      impactSet: Array.from(impactSet),
      snapshot
    };
  }

  /**
   * Compute impact set using BFS from changed nodes
   * Finds all files that depend on changed files (transitive closure)
   * Enhanced with cycle detection to prevent infinite loops
   */
  private computeImpactSet(changedFiles: string[], dependencyGraph: DependencyGraph): Set<string> {
    const impactSet = new Set<string>(changedFiles);
    const visited = new Set<string>();
    const queue: Array<{ file: string; path: string[] }> = changedFiles.map(f => ({ file: f, path: [f] }));

    // BFS traversal to find all dependents with cycle detection
    while (queue.length > 0) {
      const { file: currentFile, path: currentPath } = queue.shift()!;
      
      if (visited.has(currentFile)) {
        continue;
      }
      visited.add(currentFile);

      const node = dependencyGraph.nodes[currentFile];
      if (!node) {
        continue;
      }

      // Add all dependents to impact set
      node.dependents.forEach(dependent => {
        // Cycle detection: if dependent is already in current path, we have a cycle
        if (currentPath.includes(dependent)) {
          // Circular dependency detected, but still add to impact set
          // (circular deps mean both files affect each other)
          if (!impactSet.has(dependent)) {
            impactSet.add(dependent);
            console.warn(`[ChangeTracker] Circular dependency detected: ${currentPath.join(' -> ')} -> ${dependent}`);
          }
        } else if (!impactSet.has(dependent)) {
          impactSet.add(dependent);
          // Add to queue with updated path for cycle detection
          queue.push({ file: dependent, path: [...currentPath, dependent] });
        }
      });
    }

    return impactSet;
  }

  /**
   * List all snapshots
   */
  listSnapshots(): Snapshot[] {
    try {
      if (!fs.existsSync(this.HISTORY_DIR)) {
        return [];
      }

      return fs.readdirSync(this.HISTORY_DIR)
        .filter(f => f.endsWith('.json'))
        .map(f => {
          try {
            const content = fs.readFileSync(path.join(this.HISTORY_DIR, f), 'utf8');
            return JSON.parse(content) as Snapshot;
          } catch {
            return null;
          }
        })
        .filter((s): s is Snapshot => s !== null)
        .sort((a: any, b: any) => b.timestamp - a.timestamp);
    } catch (error) {
      console.warn('[ChangeTracker] Failed to list snapshots:', error);
      return [];
    }
  }

  /**
   * Save snapshot to disk
   */
  private saveSnapshot(snapshot: Snapshot): void {
    try {
      if (!fs.existsSync(this.HISTORY_DIR)) {
        fs.mkdirSync(this.HISTORY_DIR, { recursive: true });
      }

      const snapshotPath = path.join(this.HISTORY_DIR, `${snapshot.id}.json`);
      fs.writeFileSync(snapshotPath, JSON.stringify(snapshot, null, 2));
    } catch (error) {
      console.error('[ChangeTracker] Failed to save snapshot:', error);
    }
  }

  /**
   * Generate unique snapshot ID
   */
  private generateSnapshotId(): string {
    return `snapshot_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
