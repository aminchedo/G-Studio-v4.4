/**
 * Node.js Compatibility Layer
 * 
 * Provides safe alternatives to Node.js-only functions that don't work in browser
 * 
 * @example
 * // Instead of:
 * const currentDir = process.cwd();  // ❌ Fails in browser
 * 
 * // Use:
 * const currentDir = safeProcessCwd();  // ✅ Works everywhere
 */

// Detect environment
export const isNode = typeof window === 'undefined';
export const isElectron = typeof window !== 'undefined' && (window as any).electron !== undefined;
export const isBrowser = typeof window !== 'undefined' && !isElectron;

// Safe module imports
export const crypto = isNode ? require('crypto') : null;
export const fs = isNode ? require('fs') : null;
export const path = isNode ? require('path') : null;
export const zlib = isNode ? require('zlib') : null;

/**
 * Safe process.cwd() replacement
 * Returns current working directory in Node.js, or a default path in browser
 * 
 * @returns Current working directory or '/workspace' as fallback
 */
export function safeProcessCwd(): string {
  if (typeof process !== 'undefined' && typeof process.cwd === 'function') {
    try {
      return process.cwd();
    } catch (error) {
      console.warn('[nodeCompat] process.cwd() failed, using fallback:', error);
      return '/workspace';
    }
  }
  // Browser fallback
  return '/workspace';
}

/**
 * Safe path.join that works in browser
 */
export function safePathJoin(...parts: string[]): string {
  if (path) {
    return path.join(...parts);
  }
  // Browser fallback
  return parts.join('/').replace(/\/+/g, '/');
}

/**
 * Safe path.dirname that works in browser
 */
export function safePathDirname(filePath: string): string {
  if (path) {
    return path.dirname(filePath);
  }
  // Browser fallback
  const parts = filePath.split('/');
  parts.pop();
  return parts.join('/') || '.';
}

/**
 * Safe path.relative that works in browser
 */
export function safePathRelative(from: string, to: string): string {
  if (path) {
    return path.relative(from, to);
  }
  // Browser fallback - simple implementation
  const fromParts = from.split('/').filter(p => p);
  const toParts = to.split('/').filter(p => p);
  
  let i = 0;
  while (i < fromParts.length && i < toParts.length && fromParts[i] === toParts[i]) {
    i++;
  }
  
  const upCount = fromParts.length - i;
  const remainingParts = toParts.slice(i);
  
  return '../'.repeat(upCount) + remainingParts.join('/');
}

/**
 * Safe path.isAbsolute that works in browser
 */
export function safePathIsAbsolute(filePath: string): boolean {
  if (path) {
    return path.isAbsolute(filePath);
  }
  // Browser fallback
  return filePath.startsWith('/') || /^[a-zA-Z]:/.test(filePath);
}

/**
 * Safe fs.existsSync that works in browser
 */
export function safeExistsSync(filePath: string): boolean {
  if (fs && fs.existsSync) {
    return fs.existsSync(filePath);
  }
  // Browser fallback - always return false
  return false;
}

/**
 * Safe fs.readFileSync that works in browser
 */
export function safeReadFileSync(filePath: string, encoding: string = 'utf8'): string | null {
  if (fs && fs.readFileSync) {
    try {
      return fs.readFileSync(filePath, encoding);
    } catch (error) {
      console.warn(`[nodeCompat] Failed to read file ${filePath}:`, error);
      return null;
    }
  }
  // Browser fallback
  console.warn('[nodeCompat] File system not available in browser mode');
  return null;
}

/**
 * Safe fs.writeFileSync that works in browser
 */
export function safeWriteFileSync(filePath: string, content: string): boolean {
  if (fs && fs.writeFileSync) {
    try {
      fs.writeFileSync(filePath, content);
      return true;
    } catch (error) {
      console.error(`[nodeCompat] Failed to write file ${filePath}:`, error);
      return false;
    }
  }
  // Browser fallback
  console.warn('[nodeCompat] File system not available in browser mode');
  return false;
}

/**
 * Safe fs.mkdirSync that works in browser
 */
export function safeMkdirSync(dirPath: string, options?: any): boolean {
  if (fs && fs.mkdirSync) {
    try {
      fs.mkdirSync(dirPath, options);
      return true;
    } catch (error) {
      console.error(`[nodeCompat] Failed to create directory ${dirPath}:`, error);
      return false;
    }
  }
  // Browser fallback
  console.warn('[nodeCompat] File system not available in browser mode');
  return false;
}

/**
 * Check if running in Node.js environment
 */
export function isNodeEnvironment(): boolean {
  return typeof process !== 'undefined' && typeof process.cwd === 'function';
}

/**
 * Check if running in browser environment
 */
export function isBrowserEnvironment(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Check if Node.js modules are available
 */
export function isNodeModulesAvailable(): boolean {
  return !!(fs && path && crypto);
}

/**
 * Log warning if trying to use Node.js features in browser
 */
export function warnIfBrowser(operation: string): void {
  if (isBrowser) {
    console.warn(`[nodeCompat] ${operation} is not available in browser mode. This feature requires Electron or Node.js environment.`);
  }
}

