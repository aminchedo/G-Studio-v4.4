/**
 * Indexer - Scans and indexes project files
 */

import { 
  fs, 
  path,
  safeProcessCwd,
  safePathJoin,
  safePathRelative,
  safePathIsAbsolute,
  safeExistsSync,
  safeReadFileSync,
  safeWriteFileSync,
  safeMkdirSync,
  isNodeModulesAvailable
} from './nodeCompat';
import { FileMetadata } from '@/types/codeIntelligence';
import { HashManager } from './hashManager';

export class Indexer {
  private hashManager: HashManager;
  private readonly TARGET_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];
  private readonly IGNORE_DIRS = ['node_modules', '.git', 'dist', 'build', 'release', '.project-intel', 'hsperfdata_root', 'node-compile-cache'];
  private readonly INDEX_FILE: string;
  // Incremental hashing cache - only hash files that have mtime changes
  private mtimeCache: Record<string, number> = {};

  constructor() {
    this.hashManager = new HashManager();
    this.INDEX_FILE = safePathJoin('.project-intel', 'index', 'files.json');
    this.loadMtimeCache();
  }

  /**
   * Scan project and build initial index
   */
  async scanProject(rootDir: string = safeProcessCwd()): Promise<Record<string, FileMetadata>> {
    if (!fs || !path) {
      console.warn('[Indexer] Node.js modules not available');
      return {};
    }

    const files: Record<string, FileMetadata> = {};
    const gitignorePatterns = this.loadGitignore(rootDir);

    const scanDirectory = (dir: string): void => {
      try {
        if (!fs) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          const relativePath = path.relative(rootDir, fullPath);

          // Skip ignored directories
          if (entry.isDirectory()) {
            if (this.IGNORE_DIRS.includes(entry.name) || this.shouldIgnore(relativePath, gitignorePatterns)) {
              continue;
            }
            scanDirectory(fullPath);
            continue;
          }

          // Process files
          if (entry.isFile()) {
            if (!path || !fs) return;
            const ext = path.extname(entry.name);
            if (this.TARGET_EXTENSIONS.includes(ext) && !this.shouldIgnore(relativePath, gitignorePatterns)) {
              try {
                const content = fs.readFileSync(fullPath, 'utf8');
                const hash = this.hashManager.generateHash(content);
                const stats = fs.statSync(fullPath);

                files[relativePath] = {
                  path: relativePath,
                  hash,
                  size: stats.size,
                  lines: content.split('\n').length,
                  language: this.detectLanguage(ext),
                  lastModified: stats.mtimeMs,
                  indexedAt: Date.now()
                };

                this.hashManager.setHash(relativePath, hash);
              } catch (error) {
                console.warn(`[Indexer] Failed to index ${relativePath}:`, error);
              }
            }
          }
        }
      } catch (error) {
        console.warn(`[Indexer] Failed to scan directory ${dir}:`, error);
      }
    };

    scanDirectory(rootDir);
    this.hashManager.saveRegistry();
    this.saveIndex(files);
    return files;
  }

  /**
   * Update index for a single file
   */
  async indexFile(filePath: string, rootDir: string = safeProcessCwd()): Promise<FileMetadata | null> {
    if (!fs || !path) {
      return null;
    }

    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(rootDir, filePath);
    const relativePath = path.relative(rootDir, fullPath);

    if (!fs.existsSync(fullPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      const hash = this.hashManager.generateHash(content);
      const stats = fs.statSync(fullPath);
      const ext = path.extname(fullPath);

      if (!this.TARGET_EXTENSIONS.includes(ext)) {
        return null;
      }

      const metadata: FileMetadata = {
        path: relativePath,
        hash,
        size: stats.size,
        lines: content.split('\n').length,
        language: this.detectLanguage(ext),
        lastModified: stats.mtimeMs,
        indexedAt: Date.now()
      };

      this.hashManager.setHash(relativePath, hash);
      this.hashManager.saveRegistry();

      // Update index
      const index = this.loadIndex();
      index[relativePath] = metadata;
      this.saveIndex(index);

      return metadata;
    } catch (error) {
      console.warn(`[Indexer] Failed to index file ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Remove file from index
   */
  removeFile(filePath: string): void {
    const index = this.loadIndex();
    delete index[filePath];
    this.hashManager.removeHash(filePath);
    this.hashManager.saveRegistry();
    this.saveIndex(index);
  }

  /**
   * Load existing index
   */
  loadIndex(): Record<string, FileMetadata> {
    try {
      if (fs.existsSync(this.INDEX_FILE)) {
        const content = fs.readFileSync(this.INDEX_FILE, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn('[Indexer] Failed to load index:', error);
    }
    return {};
  }

  /**
   * Save index to disk
   */
  private saveIndex(index: Record<string, FileMetadata>): void {
    if (!fs || !path) {
      return;
    }

    try {
      const dir = path.dirname(this.INDEX_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.INDEX_FILE, JSON.stringify(index, null, 2));
    } catch (error) {
      console.error('[Indexer] Failed to save index:', error);
    }
  }

  /**
   * Detect language from file extension
   */
  private detectLanguage(ext: string): FileMetadata['language'] {
    switch (ext) {
      case '.ts':
        return 'typescript';
      case '.tsx':
        return 'tsx';
      case '.js':
        return 'javascript';
      case '.jsx':
        return 'jsx';
      default:
        return 'other';
    }
  }

  /**
   * Load .gitignore patterns
   */
  private loadGitignore(rootDir: string): string[] {
    if (!fs || !path) {
      return [];
    }

    const gitignorePath = path.join(rootDir, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
      return [];
    }

    try {
      const content = fs.readFileSync(gitignorePath, 'utf8');
      return content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
    } catch {
      return [];
    }
  }

  /**
   * Check if path should be ignored
   */
  private shouldIgnore(relativePath: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
      if (this.matchesPattern(relativePath, pattern)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Simple pattern matching for gitignore patterns
   */
  private matchesPattern(path: string, pattern: string): boolean {
    // Convert gitignore pattern to regex-like matching
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(path);
    }
    return path.includes(pattern);
  }

  /**
   * Incremental indexing - only process changed files
   * Optimized: Only hash files if mtime changed (performance optimization)
   */
  async incrementalIndex(changedFiles: string[], rootDir: string = safeProcessCwd()): Promise<Record<string, FileMetadata>> {
    if (!fs || !path) {
      console.warn('[Indexer] Node.js modules not available');
      return {};
    }

    const updatedFiles: Record<string, FileMetadata> = {};
    const existingIndex = this.loadIndex();

    for (const filePath of changedFiles) {
      try {
        const fullPath = path.isAbsolute(filePath) ? filePath : path.join(rootDir, filePath);
        const relativePath = path.relative(rootDir, fullPath);

        if (!fs.existsSync(fullPath)) {
          // File was deleted
          this.removeFile(relativePath);
          delete this.mtimeCache[relativePath];
          continue;
        }

        const stats = fs.statSync(fullPath);
        const ext = path.extname(fullPath);

        if (!this.TARGET_EXTENSIONS.includes(ext)) {
          continue;
        }

        // Optimization: Check mtime first before hashing
        const cachedMtime = this.mtimeCache[relativePath];
        if (cachedMtime === stats.mtimeMs) {
          // mtime unchanged, skip hashing (file likely unchanged)
          continue;
        }

        // mtime changed, need to hash and check
        const content = fs.readFileSync(fullPath, 'utf8');
        const hash = this.hashManager.generateHash(content);
        
        // Check if file actually changed (content hash)
        const existingHash = this.hashManager.getHash(relativePath);
        if (existingHash === hash) {
          // Content unchanged despite mtime change, update mtime cache only
          this.mtimeCache[relativePath] = stats.mtimeMs;
          continue;
        }

        // File actually changed
        updatedFiles[relativePath] = {
          path: relativePath,
          hash,
          size: stats.size,
          lines: content.split('\n').length,
          language: this.detectLanguage(ext),
          lastModified: stats.mtimeMs,
          indexedAt: Date.now()
        };

        this.hashManager.setHash(relativePath, hash);
        this.mtimeCache[relativePath] = stats.mtimeMs;
      } catch (error) {
        console.warn(`[Indexer] Failed to incrementally index ${filePath}:`, error);
      }
    }

    // Merge with existing index
    const mergedIndex = { ...existingIndex, ...updatedFiles };
    this.hashManager.saveRegistry();
    this.saveMtimeCache();
    this.saveIndex(mergedIndex);

    return updatedFiles;
  }

  /**
   * Get hash manager instance
   */
  getHashManager(): HashManager {
    return this.hashManager;
  }

  /**
   * Load mtime cache from disk
   */
  private loadMtimeCache(): void {
    if (!fs || !path) {
      return;
    }

    try {
      const cacheFile = path.join('.project-intel', 'index', 'mtime-cache.json');
      if (fs.existsSync(cacheFile)) {
        const content = fs.readFileSync(cacheFile, 'utf8');
        this.mtimeCache = JSON.parse(content);
      }
    } catch (error) {
      console.warn('[Indexer] Failed to load mtime cache:', error);
      this.mtimeCache = {};
    }
  }

  /**
   * Save mtime cache to disk
   */
  private saveMtimeCache(): void {
    if (!fs || !path) {
      return;
    }

    try {
      const cacheFile = path.join('.project-intel', 'index', 'mtime-cache.json');
      const dir = path.dirname(cacheFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(cacheFile, JSON.stringify(this.mtimeCache, null, 2));
    } catch (error) {
      console.error('[Indexer] Failed to save mtime cache:', error);
    }
  }
}
