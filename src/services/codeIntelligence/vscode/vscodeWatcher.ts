/**
 * VS Code Watcher - Passive file watcher for VS Code integration
 */

// Use dynamic imports for Node.js modules (Electron compatibility)
const chokidar = typeof window === 'undefined' ? require('chokidar') : null;
const path = typeof window === 'undefined' ? require('path') : null;
import { Indexer } from '../indexer';
import { ASTExtractor } from '../astExtractor';
import { ChangeTracker } from '../changeTracker';

export class VSCodeWatcher {
  private watcher: chokidar.FSWatcher | null = null;
  private indexer: Indexer;
  private astExtractor: ASTExtractor;
  private changeTracker: ChangeTracker;
  private rootDir: string;
  private isWatching: boolean = false;

  constructor(rootDir: string = (() => {
    const { safeProcessCwd } = require('../nodeCompat');
    return safeProcessCwd();
  })()) {
    this.rootDir = rootDir;
    this.indexer = new Indexer();
    this.astExtractor = new ASTExtractor();
    this.changeTracker = new ChangeTracker();
  }

  /**
   * Start watching for file changes
   */
  startWatching(): void {
    if (this.isWatching) {
      return;
    }

    const watchPatterns = [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx'
    ];

    const ignorePatterns = [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/release/**',
      '**/.project-intel/**',
      '**/hsperfdata_root/**',
      '**/node-compile-cache/**'
    ];

    this.watcher = chokidar.watch(watchPatterns, {
      cwd: this.rootDir,
      ignored: ignorePatterns,
      ignoreInitial: true,
      persistent: true
    });

    // Handle file changes
    this.watcher.on('change', async (filePath: string) => {
      await this.handleFileChange(filePath);
    });

    // Handle file additions
    this.watcher.on('add', async (filePath: string) => {
      await this.handleFileChange(filePath);
    });

    // Handle file removals
    this.watcher.on('unlink', async (filePath: string) => {
      await this.handleFileRemoval(filePath);
    });

    this.isWatching = true;
    console.log('[VSCodeWatcher] Started watching for file changes');
  }

  /**
   * Stop watching for file changes
   */
  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
      this.isWatching = false;
      console.log('[VSCodeWatcher] Stopped watching for file changes');
    }
  }

  /**
   * Handle file change event - uses incremental diff-aware analysis
   */
  private async handleFileChange(filePath: string): Promise<void> {
    try {
      const fullPath = path.join(this.rootDir, filePath);
      
      // Update index incrementally
      await this.indexer.indexFile(filePath, this.rootDir);

      // Extract AST only for changed file
      try {
        if (fs) {
          const content = fs.readFileSync(fullPath, 'utf8');
          this.astExtractor.extractAST(filePath, content);
        }
      } catch (error) {
        console.warn(`[VSCodeWatcher] Failed to extract AST for ${filePath}:`, error);
      }

      // Trigger incremental change tracking (diff-aware)
      // This only analyzes the changed file and its impact graph
      try {
        await this.changeTracker.trackIncrementalChanges([filePath], this.rootDir);
      } catch (error) {
        console.warn(`[VSCodeWatcher] Failed to track incremental changes:`, error);
      }
    } catch (error) {
      console.warn(`[VSCodeWatcher] Failed to handle change for ${filePath}:`, error);
    }
  }

  /**
   * Handle file removal event
   */
  private async handleFileRemoval(filePath: string): Promise<void> {
    try {
      this.indexer.removeFile(filePath);
    } catch (error) {
      console.warn(`[VSCodeWatcher] Failed to handle removal for ${filePath}:`, error);
    }
  }

  /**
   * Check if watcher is active
   */
  isActive(): boolean {
    return this.isWatching;
  }
}
