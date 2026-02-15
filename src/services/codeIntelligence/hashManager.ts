/**
 * Hash Manager - Generates and manages content hashes for change detection
 */

import { 
  crypto, 
  fs, 
  path,
  safePathJoin, 
  safeExistsSync, 
  safeReadFileSync, 
  safeWriteFileSync,
  safeMkdirSync,
  isNodeModulesAvailable 
} from './nodeCompat';

export class HashManager {
  private static readonly HASHES_FILE = safePathJoin('.project-intel', 'index', 'hashes.json');
  private hashRegistry: Record<string, string> = {};

  constructor() {
    this.loadRegistry();
  }

  /**
   * Generate SHA-256 hash for file content
   */
  generateHash(content: string): string {
    if (!crypto) {
      // Fallback simple hash
      let hash = 0;
      for (let i = 0; i < content.length; i++) {
        const char = content.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash).toString(16);
    }
    return crypto.createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * Get hash for a file path
   */
  getHash(filePath: string): string | null {
    return this.hashRegistry[filePath] || null;
  }

  /**
   * Set hash for a file path
   */
  setHash(filePath: string, hash: string): void {
    this.hashRegistry[filePath] = hash;
  }

  /**
   * Check if file has changed by comparing hashes
   */
  hasChanged(filePath: string, currentHash: string): boolean {
    const storedHash = this.getHash(filePath);
    return storedHash !== currentHash;
  }

  /**
   * Load hash registry from disk
   */
  private loadRegistry(): void {
    try {
      if (safeExistsSync(HashManager.HASHES_FILE)) {
        const content = safeReadFileSync(HashManager.HASHES_FILE, 'utf8');
        if (content) {
          this.hashRegistry = JSON.parse(content);
        }
      }
    } catch (error) {
      console.warn('[HashManager] Failed to load hash registry:', error);
      this.hashRegistry = {};
    }
  }

  /**
   * Save hash registry to disk
   */
  saveRegistry(): void {
    if (!isNodeModulesAvailable()) {
      console.warn('[HashManager] File system not available (browser mode)');
      return;
    }
    
    try {
      const dir = safePathJoin('.project-intel', 'index');
      if (!safeExistsSync(dir)) {
        safeMkdirSync(dir, { recursive: true });
      }
      safeWriteFileSync(HashManager.HASHES_FILE, JSON.stringify(this.hashRegistry, null, 2));
    } catch (error) {
      console.error('[HashManager] Failed to save hash registry:', error);
    }
  }

  /**
   * Remove hash for a deleted file
   */
  removeHash(filePath: string): void {
    delete this.hashRegistry[filePath];
  }

  /**
   * Get all tracked files
   */
  getTrackedFiles(): string[] {
    return Object.keys(this.hashRegistry);
  }
}
