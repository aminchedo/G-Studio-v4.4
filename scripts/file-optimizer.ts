#!/usr/bin/env tsx
/**
 * File Analysis and Optimization Script
 * 
 * Analyzes project files to identify:
 * - Unused files
 * - Redundant files (duplicates between root and src)
 * - Outdated files
 * - Consolidation opportunities
 * 
 * Usage:
 *   tsx scripts/file-optimizer.ts [--dry-run] [--execute] [--report-only] [--git] [--report=path]
 * 
 * Options:
 *   --dry-run      Run analysis without making changes (default)
 *   --execute      Actually perform file operations
 *   --report-only  Only generate report, don't suggest cleanup
 *   --git          Automatically stage and commit changes (requires --execute)
 *   --report=path  Specify custom report output path (default: file-optimization-report.md)
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

// Configuration
const ROOT_DIR = process.cwd();
const SRC_DIR = path.join(ROOT_DIR, 'src');
const IGNORE_DIRS = [
  'node_modules',
  'dist',
  'build',
  'release',
  '.git',
  '.vscode',
  'screenshots',
  '__tests__',
  'coverage',
  '.project-intel',
  'hsperfdata_root',
  'node-compile-cache',
];
const IGNORE_FILES = [
  '.gitignore',
  '.gitattributes',
  '.DS_Store',
  'Thumbs.db',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
];
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.html', '.css', '.scss', '.json', '.cjs', '.mjs'];
const IMPORT_PATTERNS = [
  /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
  /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  /from\s+['"]([^'"]+)['"]/g,
];

interface FileInfo {
  path: string;
  relativePath: string;
  name: string;
  extension: string;
  content: string;
  size: number;
  lastModified: Date;
  isInRoot: boolean;
  isInSrc: boolean;
}

interface FileReference {
  file: string;
  references: string[];
  referenceCount: number;
}

interface DuplicateFile {
  rootFile: FileInfo;
  srcFile: FileInfo;
  similarity: 'identical' | 'similar' | 'different';
  contentDiff?: string;
}

interface DirectoryComparison {
  srcDir: string;
  rootDir: string;
  files: FileComparison[];
}

interface FileComparison {
  fileName: string;
  srcFile?: FileInfo;
  rootFile?: FileInfo;
  completeness: {
    srcScore: number;
    rootScore: number;
    winner: 'src' | 'root' | 'equal';
    reasons: string[];
  };
  recommendation: {
    action: 'replace' | 'remove' | 'keep-both' | 'merge';
    target?: FileInfo;
    source?: FileInfo;
    reason: string;
  };
}

interface AnalysisResult {
  unusedFiles: FileInfo[];
  duplicateFiles: DuplicateFile[];
  outdatedFiles: {
    file: FileInfo;
    newerVersion: FileInfo;
    reason: string;
  }[];
  consolidationSuggestions: {
    action: 'move' | 'remove' | 'merge';
    source: FileInfo;
    target?: FileInfo;
    reason: string;
  }[];
  directoryComparisons: DirectoryComparison[];
  replacementSuggestions: {
    file: FileInfo;
    replacement: FileInfo;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }[];
}

class FileAnalyzer {
  private allFiles: Map<string, FileInfo> = new Map();
  private fileReferences: Map<string, FileReference> = new Map();
  private rootFiles: FileInfo[] = [];
  private srcFiles: FileInfo[] = [];

  /**
   * Scan all files in the project
   */
  scanFiles(): void {
    console.log('📁 Scanning project files...');
    this.scanDirectory(ROOT_DIR, true);
    console.log(`✓ Found ${this.allFiles.size} files`);
  }

  private scanDirectory(dir: string, isRoot: boolean = false): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(ROOT_DIR, fullPath);

        // Skip ignored directories
        if (entry.isDirectory()) {
          if (IGNORE_DIRS.includes(entry.name) || IGNORE_DIRS.some(ignored => relativePath.includes(ignored))) {
            continue;
          }
          this.scanDirectory(fullPath, isRoot && entry.name !== 'src');
          continue;
        }

        // Skip ignored files
        if (IGNORE_FILES.includes(entry.name)) {
          continue;
        }

        // Process file
        const stats = fs.statSync(fullPath);
        const fileInfo: FileInfo = {
          path: fullPath,
          relativePath,
          name: entry.name,
          extension: path.extname(entry.name),
          content: '',
          size: stats.size,
          lastModified: stats.mtime,
          isInRoot: isRoot && !relativePath.startsWith('src'),
          isInSrc: relativePath.startsWith('src'),
        };

        // Read content for source files
        if (SOURCE_EXTENSIONS.includes(fileInfo.extension) || fileInfo.name.endsWith('.config.js') || fileInfo.name.endsWith('.config.ts')) {
          try {
            fileInfo.content = fs.readFileSync(fullPath, 'utf-8');
          } catch (error) {
            console.warn(`⚠️  Could not read ${relativePath}: ${error}`);
          }
        }

        this.allFiles.set(relativePath, fileInfo);

        if (fileInfo.isInRoot) {
          this.rootFiles.push(fileInfo);
        }
        if (fileInfo.isInSrc) {
          this.srcFiles.push(fileInfo);
        }
      }
    } catch (error) {
      console.warn(`⚠️  Error scanning ${dir}: ${error}`);
    }
  }

  /**
   * Track file references from imports
   */
  trackReferences(): void {
    console.log('🔍 Tracking file references...');
    let referenceCount = 0;

    for (const [relativePath, fileInfo] of this.allFiles.entries()) {
      if (!fileInfo.content) continue;

      const references: string[] = [];
      
      // Extract all import/require statements
      for (const pattern of IMPORT_PATTERNS) {
        let match;
        while ((match = pattern.exec(fileInfo.content)) !== null) {
          const importPath = match[1];
          if (importPath && !importPath.startsWith('.') && !importPath.startsWith('/')) {
            // Skip node_modules imports
            if (importPath.includes('node_modules') || importPath.startsWith('@')) {
              continue;
            }
          }
          
          // Resolve the actual file path
          const resolvedPath = this.resolveImportPath(importPath, fileInfo.path);
          if (resolvedPath) {
            references.push(resolvedPath);
            referenceCount++;
          }
        }
      }

      // Also check for dynamic references (e.g., in HTML, CSS)
      this.extractDynamicReferences(fileInfo, references);

      if (references.length > 0) {
        this.fileReferences.set(relativePath, {
          file: relativePath,
          references,
          referenceCount: references.length,
        });
      }
    }

    console.log(`✓ Tracked ${referenceCount} file references`);
  }

  private resolveImportPath(importPath: string, fromFile: string): string | null {
    // Handle relative imports
    if (importPath.startsWith('.')) {
      const dir = path.dirname(fromFile);
      let resolved = path.resolve(dir, importPath);
      
      // Try with extensions
      for (const ext of ['', '.ts', '.tsx', '.js', '.jsx', '.json']) {
        const withExt = resolved + ext;
        if (fs.existsSync(withExt)) {
          return path.relative(ROOT_DIR, withExt);
        }
      }
      
      // Try as directory with index
      for (const ext of ['.ts', '.tsx', '.js', '.jsx']) {
        const indexFile = path.join(resolved, `index${ext}`);
        if (fs.existsSync(indexFile)) {
          return path.relative(ROOT_DIR, indexFile);
        }
      }
    }

    // Handle root-level imports (e.g., from root directory)
    if (!importPath.startsWith('.') && !importPath.startsWith('/') && !importPath.includes('node_modules')) {
      // Try resolving from root
      const rootPath = path.resolve(ROOT_DIR, importPath);
      for (const ext of ['', '.ts', '.tsx', '.js', '.jsx', '.json']) {
        const withExt = rootPath + ext;
        if (fs.existsSync(withExt)) {
          return path.relative(ROOT_DIR, withExt);
        }
      }
    }

    // Handle @ alias (points to root)
    if (importPath.startsWith('@/')) {
      const aliasPath = importPath.replace('@/', '');
      const rootPath = path.resolve(ROOT_DIR, aliasPath);
      for (const ext of ['', '.ts', '.tsx', '.js', '.jsx', '.json']) {
        const withExt = rootPath + ext;
        if (fs.existsSync(withExt)) {
          return path.relative(ROOT_DIR, withExt);
        }
      }
    }

    return null;
  }

  private extractDynamicReferences(fileInfo: FileInfo, references: string[]): void {
    // Check HTML files for script/src references
    if (fileInfo.extension === '.html') {
      const scriptMatches = fileInfo.content.matchAll(/src=["']([^"']+)["']/g);
      for (const match of scriptMatches) {
        const resolved = this.resolveImportPath(match[1], fileInfo.path);
        if (resolved) references.push(resolved);
      }
    }

    // Check CSS files for @import and url()
    if (fileInfo.extension === '.css' || fileInfo.extension === '.scss') {
      const importMatches = fileInfo.content.matchAll(/@import\s+['"]([^'"]+)['"]/g);
      for (const match of importMatches) {
        const resolved = this.resolveImportPath(match[1], fileInfo.path);
        if (resolved) references.push(resolved);
      }

      const urlMatches = fileInfo.content.matchAll(/url\(['"]?([^'")]+)['"]?\)/g);
      for (const match of urlMatches) {
        const resolved = this.resolveImportPath(match[1], fileInfo.path);
        if (resolved) references.push(resolved);
      }
    }
  }

  /**
   * Identify unused files
   */
  identifyUnusedFiles(): FileInfo[] {
    console.log('🔎 Identifying unused files...');
    const unused: FileInfo[] = [];
    const referencedFiles = new Set<string>();

    // Collect all referenced files
    for (const ref of this.fileReferences.values()) {
      for (const refPath of ref.references) {
        referencedFiles.add(refPath);
      }
    }

    // Special files that are always considered used
    const alwaysUsed = new Set([
      'package.json',
      'tsconfig.json',
      'vite.config.ts',
      'tailwind.config.js',
      'postcss.config.js',
      'jest.config.js',
      'jest.setup.js',
      'index.html',
      'index.tsx',
      'index.css',
      'index-enhanced.css',
      'electron/main.cjs',
      'electron/preload.cjs',
      '.gitignore',
    ]);

    // Check root files
    for (const file of this.rootFiles) {
      if (alwaysUsed.has(file.name) || alwaysUsed.has(file.relativePath)) {
        continue;
      }

      // Check if file is referenced
      if (!referencedFiles.has(file.relativePath)) {
        // Check if it's a config file that might be used by build tools
        if (this.isConfigFile(file)) {
          continue; // Config files are considered used
        }
        unused.push(file);
      }
    }

    // Check src files
    for (const file of this.srcFiles) {
      if (!referencedFiles.has(file.relativePath)) {
        // Entry point files are always used
        if (file.name === 'index.ts' || file.name === 'index.tsx' || file.relativePath === 'src/index.ts') {
          continue;
        }
        unused.push(file);
      }
    }

    console.log(`✓ Found ${unused.length} potentially unused files`);
    return unused;
  }

  private isConfigFile(file: FileInfo): boolean {
    const configNames = [
      'config',
      'vite.config',
      'tsconfig',
      'tailwind.config',
      'postcss.config',
      'jest.config',
      'webpack.config',
      '.eslintrc',
      '.prettierrc',
    ];
    return configNames.some(name => file.name.includes(name));
  }

  /**
   * Find duplicate files between root and src
   */
  findDuplicates(): DuplicateFile[] {
    console.log('🔄 Finding duplicate files...');
    const duplicates: DuplicateFile[] = [];

    // Compare root files with src files
    for (const rootFile of this.rootFiles) {
      // Skip config files and special files
      if (this.isConfigFile(rootFile) || rootFile.name.startsWith('.')) {
        continue;
      }

      // Find matching file in src
      const matchingSrcFile = this.srcFiles.find(
        srcFile => srcFile.name === rootFile.name && srcFile.extension === rootFile.extension
      );

      if (matchingSrcFile) {
        const similarity = this.compareFiles(rootFile, matchingSrcFile);
        duplicates.push({
          rootFile,
          srcFile: matchingSrcFile,
          similarity,
          contentDiff: similarity !== 'identical' ? this.getContentDiff(rootFile, matchingSrcFile) : undefined,
        });
      }
    }

    console.log(`✓ Found ${duplicates.length} duplicate file pairs`);
    return duplicates;
  }

  private compareFiles(file1: FileInfo, file2: FileInfo): 'identical' | 'similar' | 'different' {
    if (!file1.content || !file2.content) {
      return 'different';
    }

    if (file1.content === file2.content) {
      return 'identical';
    }

    // Calculate similarity (simple line-based comparison)
    const lines1 = file1.content.split('\n');
    const lines2 = file2.content.split('\n');
    const maxLines = Math.max(lines1.length, lines2.length);
    const minLines = Math.min(lines1.length, lines2.length);
    
    if (minLines === 0) return 'different';
    
    const similarity = minLines / maxLines;
    return similarity > 0.8 ? 'similar' : 'different';
  }

  private getContentDiff(file1: FileInfo, file2: FileInfo): string {
    if (!file1.content || !file2.content) {
      return 'Cannot compare: one or both files have no content';
    }

    const lines1 = file1.content.split('\n');
    const lines2 = file2.content.split('\n');
    const maxLines = Math.max(lines1.length, lines2.length);
    
    const diff: string[] = [];
    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';
      if (line1 !== line2) {
        diff.push(`Line ${i + 1}:`);
        if (line1) diff.push(`  - ${line1}`);
        if (line2) diff.push(`  + ${line2}`);
      }
    }

    return diff.slice(0, 20).join('\n'); // Limit to first 20 differences
  }

  /**
   * Identify outdated files
   */
  identifyOutdatedFiles(duplicates: DuplicateFile[]): AnalysisResult['outdatedFiles'] {
    console.log('⏰ Identifying outdated files...');
    const outdated: AnalysisResult['outdatedFiles'] = [];

    for (const dup of duplicates) {
      if (dup.similarity === 'identical') continue;

      // Determine which file is newer
      const rootNewer = dup.rootFile.lastModified > dup.srcFile.lastModified;
      const newerFile = rootNewer ? dup.rootFile : dup.srcFile;
      const olderFile = rootNewer ? dup.srcFile : dup.rootFile;

      // Check file size (larger might be more complete)
      const sizeDiff = Math.abs(dup.rootFile.size - dup.srcFile.size);
      const sizeDiffPercent = (sizeDiff / Math.max(dup.rootFile.size, dup.srcFile.size)) * 100;

      let reason = '';
      if (rootNewer) {
        reason = `Root file is newer (${dup.rootFile.lastModified.toISOString()} vs ${dup.srcFile.lastModified.toISOString()})`;
      } else {
        reason = `Src file is newer (${dup.srcFile.lastModified.toISOString()} vs ${dup.rootFile.lastModified.toISOString()})`;
      }

      if (sizeDiffPercent > 10) {
        reason += ` and ${newerFile.size > olderFile.size ? 'larger' : 'smaller'} (${sizeDiffPercent.toFixed(1)}% difference)`;
      }

      outdated.push({
        file: olderFile,
        newerVersion: newerFile,
        reason,
      });
    }

    console.log(`✓ Found ${outdated.length} outdated files`);
    return outdated;
  }

  /**
   * Compare directories between src and root
   */
  compareSrcAndRootDirectories(): DirectoryComparison[] {
    console.log('📂 Comparing src and root directories...');
    const comparisons: DirectoryComparison[] = [];
    const srcDirs = new Set<string>();
    const rootDirs = new Set<string>();

    // Collect all directories in src
    for (const file of this.srcFiles) {
      const dirPath = path.dirname(file.relativePath);
      if (dirPath !== 'src' && dirPath.startsWith('src/')) {
        const dirName = dirPath.replace('src/', '');
        srcDirs.add(dirName);
      }
    }

    // Collect all directories in root
    for (const file of this.rootFiles) {
      const dirPath = path.dirname(file.relativePath);
      if (dirPath !== '.' && !dirPath.startsWith('src/') && !dirPath.includes('/')) {
        rootDirs.add(dirPath);
      } else if (dirPath.includes('/') && !dirPath.startsWith('src/')) {
        const firstDir = dirPath.split('/')[0];
        rootDirs.add(firstDir);
      }
    }

    // Compare directories
    for (const dirName of srcDirs) {
      if (rootDirs.has(dirName)) {
        const comparison = this.compareDirectory(dirName);
        if (comparison && comparison.files.length > 0) {
          comparisons.push(comparison);
        }
      }
    }

    console.log(`✓ Compared ${comparisons.length} directory pairs`);
    return comparisons;
  }

  private compareDirectory(dirName: string): DirectoryComparison | null {
    const srcDir = `src/${dirName}`;
    const rootDir = dirName;
    const files: FileComparison[] = [];

    // Get all files in src directory
    const srcDirFiles = this.srcFiles.filter(f => 
      f.relativePath.startsWith(srcDir + '/') || 
      (f.relativePath.startsWith(srcDir) && path.dirname(f.relativePath) === srcDir)
    );

    // Get all files in root directory
    const rootDirFiles = this.rootFiles.filter(f => {
      const fileDir = path.dirname(f.relativePath);
      return fileDir === rootDir || fileDir.startsWith(rootDir + '/');
    });

    // Create a map of files by name
    const srcFilesMap = new Map<string, FileInfo>();
    const rootFilesMap = new Map<string, FileInfo>();

    for (const file of srcDirFiles) {
      const fileName = path.basename(file.name, file.extension);
      const key = `${fileName}${file.extension}`;
      srcFilesMap.set(key, file);
    }

    for (const file of rootDirFiles) {
      const fileName = path.basename(file.name, file.extension);
      const key = `${fileName}${file.extension}`;
      rootFilesMap.set(key, file);
    }

    // Compare files
    const allFileNames = new Set([...srcFilesMap.keys(), ...rootFilesMap.keys()]);
    
    for (const fileName of allFileNames) {
      const srcFile = srcFilesMap.get(fileName);
      const rootFile = rootFilesMap.get(fileName);

      if (srcFile || rootFile) {
        const comparison = this.compareFileVersions(fileName, srcFile, rootFile);
        if (comparison) {
          files.push(comparison);
        }
      }
    }

    if (files.length === 0) return null;

    return {
      srcDir,
      rootDir,
      files,
    };
  }

  private compareFileVersions(
    fileName: string,
    srcFile?: FileInfo,
    rootFile?: FileInfo
  ): FileComparison | null {
    if (!srcFile && !rootFile) return null;

    // Calculate completeness scores
    const srcScore = this.calculateCompletenessScore(srcFile);
    const rootScore = this.calculateCompletenessScore(rootFile);

    const reasons: string[] = [];
    let winner: 'src' | 'root' | 'equal' = 'equal';

    if (!srcFile) {
      winner = 'root';
      reasons.push('File only exists in root directory');
    } else if (!rootFile) {
      winner = 'src';
      reasons.push('File only exists in src directory');
    } else {
      // Both files exist, compare them
      if (srcScore > rootScore) {
        winner = 'src';
        reasons.push(`Src file has higher completeness score (${srcScore.toFixed(2)} vs ${rootScore.toFixed(2)})`);
      } else if (rootScore > srcScore) {
        winner = 'root';
        reasons.push(`Root file has higher completeness score (${rootScore.toFixed(2)} vs ${srcScore.toFixed(2)})`);
      } else {
        winner = 'equal';
        reasons.push('Files have similar completeness scores');
      }

      // Check modification dates
      if (srcFile.lastModified > rootFile.lastModified) {
        const daysDiff = Math.floor((srcFile.lastModified.getTime() - rootFile.lastModified.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff > 7) {
          reasons.push(`Src file is ${daysDiff} days newer`);
          if (winner === 'equal') winner = 'src';
        }
      } else if (rootFile.lastModified > srcFile.lastModified) {
        const daysDiff = Math.floor((rootFile.lastModified.getTime() - srcFile.lastModified.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff > 7) {
          reasons.push(`Root file is ${daysDiff} days newer`);
          if (winner === 'equal') winner = 'root';
        }
      }

      // Check file sizes
      const sizeDiff = Math.abs(srcFile.size - rootFile.size);
      const sizeDiffPercent = (sizeDiff / Math.max(srcFile.size, rootFile.size)) * 100;
      if (sizeDiffPercent > 20) {
        if (srcFile.size > rootFile.size) {
          reasons.push(`Src file is ${sizeDiffPercent.toFixed(1)}% larger (likely more complete)`);
          if (winner === 'equal') winner = 'src';
        } else {
          reasons.push(`Root file is ${sizeDiffPercent.toFixed(1)}% larger (likely more complete)`);
          if (winner === 'equal') winner = 'root';
        }
      }
    }

    // Generate recommendation
    let recommendation: FileComparison['recommendation'];
    
    if (!rootFile) {
      // File only in src - no action needed
      recommendation = {
        action: 'keep-both',
        reason: 'File only exists in src directory, no root equivalent',
      };
    } else if (!srcFile) {
      // File only in root - consider moving to src
      recommendation = {
        action: 'move',
        source: rootFile,
        target: { ...rootFile, relativePath: `src/${rootFile.relativePath}`, isInSrc: true, isInRoot: false },
        reason: 'File exists only in root, consider moving to src for better organization',
      };
    } else if (winner === 'src' && srcScore > rootScore + 0.1) {
      // Src is more complete - replace root
      const isRootUsed = this.isFileReferenced(rootFile.relativePath);
      if (!isRootUsed) {
        recommendation = {
          action: 'replace',
          source: rootFile,
          target: srcFile,
          reason: `Src file is more complete and root file is not used. Replace root with src version.`,
        };
      } else {
        recommendation = {
          action: 'merge',
          source: rootFile,
          target: srcFile,
          reason: `Src file is more complete but root file is still referenced. Consider updating imports to use src version.`,
        };
      }
    } else if (winner === 'root' && rootScore > srcScore + 0.1) {
      // Root is more complete - move to src
      recommendation = {
        action: 'move',
        source: rootFile,
        target: srcFile,
        reason: `Root file is more complete. Move to src and replace src version.`,
      };
    } else {
      // Files are similar
      const isRootUsed = this.isFileReferenced(rootFile.relativePath);
      const isSrcUsed = this.isFileReferenced(srcFile.relativePath);
      
      if (!isRootUsed && isSrcUsed) {
        recommendation = {
          action: 'remove',
          source: rootFile,
          reason: 'Files are similar, but only src version is used. Remove root version.',
        };
      } else if (isRootUsed && !isSrcUsed) {
        recommendation = {
          action: 'remove',
          source: srcFile,
          reason: 'Files are similar, but only root version is used. Remove src version.',
        };
      } else {
        recommendation = {
          action: 'keep-both',
          reason: 'Files are similar and both may be used. Review manually.',
        };
      }
    }

    return {
      fileName,
      srcFile,
      rootFile,
      completeness: {
        srcScore,
        rootScore,
        winner,
        reasons,
      },
      recommendation,
    };
  }

  private calculateCompletenessScore(file?: FileInfo): number {
    if (!file) return 0;

    let score = 0;

    // Base score from file size (larger files might be more complete)
    score += Math.min(file.size / 10000, 1) * 0.2; // Max 0.2 points

    // Content analysis
    if (file.content) {
      const lines = file.content.split('\n');
      const nonEmptyLines = lines.filter(l => l.trim().length > 0).length;
      
      // More non-empty lines = more complete
      score += Math.min(nonEmptyLines / 100, 1) * 0.3; // Max 0.3 points

      // Check for exports (indicates functionality)
      const exportCount = (file.content.match(/\bexport\b/g) || []).length;
      score += Math.min(exportCount / 10, 1) * 0.2; // Max 0.2 points

      // Check for imports (indicates integration)
      const importCount = (file.content.match(/\bimport\b/g) || []).length;
      score += Math.min(importCount / 10, 1) * 0.1; // Max 0.1 points

      // Check for comments/documentation
      const commentLines = lines.filter(l => l.trim().startsWith('//') || l.trim().startsWith('*') || l.trim().startsWith('/**')).length;
      score += Math.min(commentLines / 20, 1) * 0.1; // Max 0.1 points

      // Check for TODO/FIXME (indicates incomplete work)
      const todoCount = (file.content.match(/\b(TODO|FIXME|XXX|HACK)\b/gi) || []).length;
      score -= Math.min(todoCount / 5, 1) * 0.1; // Penalty up to 0.1 points
    }

    // Recency bonus (newer files might be more up-to-date)
    const daysSinceModification = (Date.now() - file.lastModified.getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceModification < 30) {
      score += 0.1; // Bonus for recent files
    }

    return Math.max(0, Math.min(1, score)); // Clamp between 0 and 1
  }

  private isFileReferenced(relativePath: string): boolean {
    // Check if file is referenced in any imports
    for (const ref of this.fileReferences.values()) {
      if (ref.references.includes(relativePath)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generate replacement suggestions from directory comparisons
   */
  generateReplacementSuggestions(comparisons: DirectoryComparison[]): AnalysisResult['replacementSuggestions'] {
    console.log('🔄 Generating replacement suggestions...');
    const suggestions: AnalysisResult['replacementSuggestions'] = [];

    for (const comparison of comparisons) {
      for (const fileComp of comparison.files) {
        if (fileComp.recommendation.action === 'replace' && fileComp.recommendation.source && fileComp.recommendation.target) {
          // Determine priority
          let priority: 'high' | 'medium' | 'low' = 'medium';
          const scoreDiff = fileComp.completeness.srcScore - fileComp.completeness.rootScore;
          
          if (scoreDiff > 0.3 || !this.isFileReferenced(fileComp.rootFile!.relativePath)) {
            priority = 'high';
          } else if (scoreDiff > 0.1) {
            priority = 'medium';
          } else {
            priority = 'low';
          }

          suggestions.push({
            file: fileComp.recommendation.source,
            replacement: fileComp.recommendation.target,
            reason: fileComp.recommendation.reason,
            priority,
          });
        }
      }
    }

    console.log(`✓ Generated ${suggestions.length} replacement suggestions`);
    return suggestions;
  }

  /**
   * Generate consolidation suggestions
   */
  generateConsolidationSuggestions(
    unused: FileInfo[],
    duplicates: DuplicateFile[],
    outdated: AnalysisResult['outdatedFiles']
  ): AnalysisResult['consolidationSuggestions'] {
    console.log('💡 Generating consolidation suggestions...');
    const suggestions: AnalysisResult['consolidationSuggestions'] = [];

    // Suggest removing unused root files
    for (const file of unused) {
      if (file.isInRoot) {
        suggestions.push({
          action: 'remove',
          source: file,
          reason: 'File is not referenced anywhere in the codebase',
        });
      }
    }

    // Suggest consolidating duplicates
    for (const dup of duplicates) {
      if (dup.similarity === 'identical') {
        // If identical, suggest removing root version and keeping src
        suggestions.push({
          action: 'remove',
          source: dup.rootFile,
          reason: `Identical to ${dup.srcFile.relativePath}. Prefer src version for better organization.`,
        });
      } else {
        // If different, suggest keeping the newer/more complete version
        const newer = dup.rootFile.lastModified > dup.srcFile.lastModified ? dup.rootFile : dup.srcFile;
        const older = newer === dup.rootFile ? dup.srcFile : dup.rootFile;
        
        if (newer.isInSrc && older.isInRoot) {
          suggestions.push({
            action: 'remove',
            source: older,
            reason: `Outdated version. Newer version exists in ${newer.relativePath}`,
          });
        } else if (newer.isInRoot && older.isInSrc) {
          suggestions.push({
            action: 'move',
            source: newer,
            target: older,
            reason: `Move to src directory and replace older version`,
          });
        }
      }
    }

    // Suggest replacing outdated files
    for (const outdatedFile of outdated) {
      if (outdatedFile.file.isInRoot && outdatedFile.newerVersion.isInSrc) {
        suggestions.push({
          action: 'remove',
          source: outdatedFile.file,
          reason: `Outdated: ${outdatedFile.reason}`,
        });
      } else if (outdatedFile.file.isInSrc && outdatedFile.newerVersion.isInRoot) {
        suggestions.push({
          action: 'move',
          source: outdatedFile.newerVersion,
          target: outdatedFile.file,
          reason: `Replace outdated src file with newer root version: ${outdatedFile.reason}`,
        });
      }
    }

    console.log(`✓ Generated ${suggestions.length} consolidation suggestions`);
    return suggestions;
  }

  /**
   * Run complete analysis
   */
  analyze(): AnalysisResult {
    this.scanFiles();
    this.trackReferences();
    
    const unused = this.identifyUnusedFiles();
    const duplicates = this.findDuplicates();
    const outdated = this.identifyOutdatedFiles(duplicates);
    const directoryComparisons = this.compareSrcAndRootDirectories();
    const replacementSuggestions = this.generateReplacementSuggestions(directoryComparisons);
    const suggestions = this.generateConsolidationSuggestions(unused, duplicates, outdated);

    return {
      unusedFiles: unused,
      duplicateFiles: duplicates,
      outdatedFiles: outdated,
      consolidationSuggestions: suggestions,
      directoryComparisons,
      replacementSuggestions,
    };
  }
}

/**
 * Generate comprehensive report
 */
function generateReport(result: AnalysisResult, outputPath?: string): string {
  const report: string[] = [];
  
  report.push('# File Analysis and Optimization Report\n');
  report.push(`Generated: ${new Date().toISOString()}\n`);
  report.push('---\n\n');

  // Summary
  report.push('## Summary\n\n');
  report.push(`- **Unused Files**: ${result.unusedFiles.length}`);
  report.push(`- **Duplicate Files**: ${result.duplicateFiles.length}`);
  report.push(`- **Outdated Files**: ${result.outdatedFiles.length}`);
  report.push(`- **Directory Comparisons**: ${result.directoryComparisons.length}`);
  report.push(`- **Replacement Suggestions**: ${result.replacementSuggestions.length}`);
  report.push(`- **Consolidation Suggestions**: ${result.consolidationSuggestions.length}\n\n`);

  // Unused Files
  if (result.unusedFiles.length > 0) {
    report.push('## 🔴 Unused Files\n\n');
    report.push('These files are not referenced anywhere in the codebase:\n\n');
    for (const file of result.unusedFiles) {
      report.push(`- \`${file.relativePath}\` (${(file.size / 1024).toFixed(2)} KB, modified: ${file.lastModified.toISOString().split('T')[0]})\n`);
    }
    report.push('\n');
  }

  // Duplicate Files
  if (result.duplicateFiles.length > 0) {
    report.push('## 🔄 Duplicate Files\n\n');
    report.push('Files that exist in both root and src directories:\n\n');
    for (const dup of result.duplicateFiles) {
      report.push(`### ${dup.rootFile.name}\n\n`);
      report.push(`- **Root**: \`${dup.rootFile.relativePath}\` (${(dup.rootFile.size / 1024).toFixed(2)} KB)\n`);
      report.push(`- **Src**: \`${dup.srcFile.relativePath}\` (${(dup.srcFile.size / 1024).toFixed(2)} KB)\n`);
      report.push(`- **Similarity**: ${dup.similarity}\n`);
      if (dup.contentDiff) {
        report.push(`- **Differences**:\n\`\`\`\n${dup.contentDiff}\n\`\`\`\n`);
      }
      report.push('\n');
    }
  }

  // Outdated Files
  if (result.outdatedFiles.length > 0) {
    report.push('## ⏰ Outdated Files\n\n');
    for (const outdated of result.outdatedFiles) {
      report.push(`### ${outdated.file.name}\n\n`);
      report.push(`- **Current**: \`${outdated.file.relativePath}\`\n`);
      report.push(`- **Newer Version**: \`${outdated.newerVersion.relativePath}\`\n`);
      report.push(`- **Reason**: ${outdated.reason}\n\n`);
    }
  }

  // Directory Comparisons
  if (result.directoryComparisons.length > 0) {
    report.push('## 📂 Directory Comparisons (src vs root)\n\n');
    report.push('Detailed comparison of files in src subdirectories with their root equivalents:\n\n');
    
    for (const comparison of result.directoryComparisons) {
      report.push(`### ${comparison.srcDir} vs ${comparison.rootDir}\n\n`);
      report.push(`**Files compared**: ${comparison.files.length}\n\n`);
      
      for (const fileComp of comparison.files) {
        report.push(`#### ${fileComp.fileName}\n\n`);
        
        if (fileComp.srcFile && fileComp.rootFile) {
          report.push(`- **Src**: \`${fileComp.srcFile.relativePath}\` (${(fileComp.srcFile.size / 1024).toFixed(2)} KB, modified: ${fileComp.srcFile.lastModified.toISOString().split('T')[0]})\n`);
          report.push(`- **Root**: \`${fileComp.rootFile.relativePath}\` (${(fileComp.rootFile.size / 1024).toFixed(2)} KB, modified: ${fileComp.rootFile.lastModified.toISOString().split('T')[0]})\n`);
        } else if (fileComp.srcFile) {
          report.push(`- **Src**: \`${fileComp.srcFile.relativePath}\` (only in src)\n`);
        } else if (fileComp.rootFile) {
          report.push(`- **Root**: \`${fileComp.rootFile.relativePath}\` (only in root)\n`);
        }
        
        report.push(`- **Completeness Score**: Src: ${fileComp.completeness.srcScore.toFixed(2)}, Root: ${fileComp.completeness.rootScore.toFixed(2)}\n`);
        report.push(`- **Winner**: ${fileComp.completeness.winner.toUpperCase()}\n`);
        report.push(`- **Reasons**:\n`);
        for (const reason of fileComp.completeness.reasons) {
          report.push(`  - ${reason}\n`);
        }
        report.push(`- **Recommendation**: ${fileComp.recommendation.action.toUpperCase()}\n`);
        report.push(`  - ${fileComp.recommendation.reason}\n\n`);
      }
      report.push('---\n\n');
    }
  }

  // Replacement Suggestions
  if (result.replacementSuggestions.length > 0) {
    report.push('## 🔄 Replacement Suggestions\n\n');
    report.push('Files that should be replaced with their more complete versions:\n\n');
    
    // Group by priority
    const byPriority = {
      high: result.replacementSuggestions.filter(s => s.priority === 'high'),
      medium: result.replacementSuggestions.filter(s => s.priority === 'medium'),
      low: result.replacementSuggestions.filter(s => s.priority === 'low'),
    };

    if (byPriority.high.length > 0) {
      report.push('### 🔴 High Priority\n\n');
      for (const suggestion of byPriority.high) {
        report.push(`- **Replace**: \`${suggestion.file.relativePath}\`\n`);
        report.push(`  - **With**: \`${suggestion.replacement.relativePath}\`\n`);
        report.push(`  - **Reason**: ${suggestion.reason}\n\n`);
      }
    }

    if (byPriority.medium.length > 0) {
      report.push('### 🟡 Medium Priority\n\n');
      for (const suggestion of byPriority.medium) {
        report.push(`- **Replace**: \`${suggestion.file.relativePath}\`\n`);
        report.push(`  - **With**: \`${suggestion.replacement.relativePath}\`\n`);
        report.push(`  - **Reason**: ${suggestion.reason}\n\n`);
      }
    }

    if (byPriority.low.length > 0) {
      report.push('### 🟢 Low Priority\n\n');
      for (const suggestion of byPriority.low) {
        report.push(`- **Replace**: \`${suggestion.file.relativePath}\`\n`);
        report.push(`  - **With**: \`${suggestion.replacement.relativePath}\`\n`);
        report.push(`  - **Reason**: ${suggestion.reason}\n\n`);
      }
    }
  }

  // Consolidation Suggestions
  if (result.consolidationSuggestions.length > 0) {
    report.push('## 💡 Consolidation Suggestions\n\n');
    report.push('### Recommended Actions\n\n');
    
    const byAction = {
      remove: result.consolidationSuggestions.filter(s => s.action === 'remove'),
      move: result.consolidationSuggestions.filter(s => s.action === 'move'),
      merge: result.consolidationSuggestions.filter(s => s.action === 'merge'),
    };

    if (byAction.remove.length > 0) {
      report.push('#### Remove Files\n\n');
      for (const suggestion of byAction.remove) {
        report.push(`- **Remove**: \`${suggestion.source.relativePath}\`\n`);
        report.push(`  - Reason: ${suggestion.reason}\n\n`);
      }
    }

    if (byAction.move.length > 0) {
      report.push('#### Move/Replace Files\n\n');
      for (const suggestion of byAction.move) {
        report.push(`- **Move**: \`${suggestion.source.relativePath}\` → \`${suggestion.target?.relativePath || 'target'}\`\n`);
        report.push(`  - Reason: ${suggestion.reason}\n\n`);
      }
    }

    if (byAction.merge.length > 0) {
      report.push('#### Merge Files\n\n');
      for (const suggestion of byAction.merge) {
        report.push(`- **Merge**: \`${suggestion.source.relativePath}\` + \`${suggestion.target?.relativePath || 'target'}\`\n`);
        report.push(`  - Reason: ${suggestion.reason}\n\n`);
      }
    }
  }

  // Git Commands
  report.push('## 🔧 Git Commands\n\n');
  report.push('If you want to stage these changes for commit:\n\n');
  report.push('```bash\n');
  
  const filesToRemove = result.consolidationSuggestions
    .filter(s => s.action === 'remove')
    .map(s => s.source.relativePath);
  
  const filesToMove = result.consolidationSuggestions
    .filter(s => s.action === 'move' && s.target)
    .map(s => ({ from: s.source.relativePath, to: s.target!.relativePath }));

  const filesToReplace = result.replacementSuggestions
    .map(s => ({ from: s.file.relativePath, to: s.replacement.relativePath }));
  
  if (filesToRemove.length > 0) {
    report.push('# Remove unused/duplicate files\n');
    report.push(`git rm ${filesToRemove.map(f => `"${f}"`).join(' ')}\n\n`);
  }

  if (filesToReplace.length > 0) {
    report.push('# Replace files with more complete versions\n');
    for (const replace of filesToReplace) {
      report.push(`# Replace ${replace.from} with ${replace.to}\n`);
      report.push(`cp "${replace.to}" "${replace.from}"\n`);
      report.push(`git add "${replace.from}"\n\n`);
    }
  }

  if (filesToMove.length > 0) {
    report.push('# Move files to proper locations\n');
    for (const move of filesToMove) {
      report.push(`git mv "${move.from}" "${move.to}"\n`);
    }
    report.push('\n');
  }

  if (filesToRemove.length > 0 || filesToMove.length > 0) {
    report.push('# Commit changes\n');
    report.push('git commit -m "chore: optimize project structure - remove unused files and consolidate duplicates"\n');
  }

  report.push('```\n\n');
  report.push('---\n\n');
  report.push('*Report generated by file-optimizer.ts*\n');

  const reportText = report.join('');
  
  if (outputPath) {
    fs.writeFileSync(outputPath, reportText, 'utf-8');
    console.log(`✓ Report saved to ${outputPath}`);
  }

  return reportText;
}

/**
 * Check if git is available and repository is clean
 */
function checkGitStatus(): { isGitRepo: boolean; isClean: boolean; hasChanges: boolean } {
  try {
    // Check if git is available
    execSync('git --version', { stdio: 'ignore' });
    
    // Check if we're in a git repo
    try {
      execSync('git rev-parse --git-dir', { stdio: 'ignore' });
    } catch {
      return { isGitRepo: false, isClean: false, hasChanges: false };
    }

    // Check if working directory is clean
    const status = execSync('git status --porcelain', { encoding: 'utf-8' });
    const hasChanges = status.trim().length > 0;

    return {
      isGitRepo: true,
      isClean: !hasChanges,
      hasChanges,
    };
  } catch {
    return { isGitRepo: false, isClean: false, hasChanges: false };
  }
}

/**
 * Stage changes in git
 */
function stageGitChanges(result: AnalysisResult): void {
  try {
    const filesToRemove = result.consolidationSuggestions
      .filter(s => s.action === 'remove')
      .map(s => s.source.relativePath)
      .filter(file => fs.existsSync(path.join(ROOT_DIR, file))); // Only stage files that still exist

    const filesToMove = result.consolidationSuggestions
      .filter(s => s.action === 'move' && s.target)
      .map(s => ({ from: s.source.relativePath, to: s.target!.relativePath }))
      .filter(move => fs.existsSync(path.join(ROOT_DIR, move.from))); // Only move files that still exist

    if (filesToRemove.length > 0) {
      execSync(`git rm ${filesToRemove.map(f => `"${f}"`).join(' ')}`, { 
        stdio: 'inherit',
        cwd: ROOT_DIR,
      });
    }

    if (filesToMove.length > 0) {
      for (const move of filesToMove) {
        execSync(`git mv "${move.from}" "${move.to}"`, { 
          stdio: 'inherit',
          cwd: ROOT_DIR,
        });
      }
    }

    console.log('✓ Changes staged in git');
  } catch (error: any) {
    console.warn(`⚠️  Failed to stage git changes: ${error.message || error}`);
  }
}

/**
 * Create git commit
 */
function createGitCommit(message: string = 'chore: optimize project structure'): void {
  try {
    // Check if there are staged changes
    const status = execSync('git diff --cached --name-only', { 
      encoding: 'utf-8',
      cwd: ROOT_DIR,
    });
    
    if (status.trim().length === 0) {
      console.log('ℹ️  No staged changes to commit');
      return;
    }

    execSync(`git commit -m "${message}"`, { 
      stdio: 'inherit',
      cwd: ROOT_DIR,
    });
    console.log('✓ Changes committed to git');
  } catch (error: any) {
    console.warn(`⚠️  Failed to create git commit: ${error.message || error}`);
  }
}

/**
 * Execute cleanup actions
 */
function executeCleanup(result: AnalysisResult, dryRun: boolean = true, useGit: boolean = false): void {
  console.log('\n🧹 Executing cleanup...');
  if (dryRun) {
    console.log('⚠️  DRY RUN MODE - No files will be modified\n');
  }

  const backupDir = path.join(ROOT_DIR, '.file-optimizer-backup');
  
  if (!dryRun) {
    // Create backup directory
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
  }

  let removedCount = 0;
  let movedCount = 0;
  let replacedCount = 0;

  for (const suggestion of result.consolidationSuggestions) {
    if (suggestion.action === 'remove') {
      if (dryRun) {
        console.log(`[DRY RUN] Would remove: ${suggestion.source.relativePath}`);
      } else {
        try {
          // Backup file
          const backupPath = path.join(backupDir, suggestion.source.relativePath);
          const backupDirPath = path.dirname(backupPath);
          if (!fs.existsSync(backupDirPath)) {
            fs.mkdirSync(backupDirPath, { recursive: true });
          }
          fs.copyFileSync(suggestion.source.path, backupPath);
          
          // Remove file
          fs.unlinkSync(suggestion.source.path);
          console.log(`✓ Removed: ${suggestion.source.relativePath}`);
          removedCount++;
        } catch (error) {
          console.error(`✗ Failed to remove ${suggestion.source.relativePath}: ${error}`);
        }
      }
    } else if (suggestion.action === 'move' && suggestion.target) {
      if (dryRun) {
        console.log(`[DRY RUN] Would move: ${suggestion.source.relativePath} → ${suggestion.target.relativePath}`);
      } else {
        try {
          // Backup target if it exists
          if (fs.existsSync(suggestion.target.path)) {
            const backupPath = path.join(backupDir, suggestion.target.relativePath);
            const backupDirPath = path.dirname(backupPath);
            if (!fs.existsSync(backupDirPath)) {
              fs.mkdirSync(backupDirPath, { recursive: true });
            }
            fs.copyFileSync(suggestion.target.path, backupPath);
            fs.unlinkSync(suggestion.target.path);
          }
          
          // Ensure target directory exists
          const targetDir = path.dirname(suggestion.target.path);
          if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
          }
          
          // Move file
          fs.copyFileSync(suggestion.source.path, suggestion.target.path);
          fs.unlinkSync(suggestion.source.path);
          console.log(`✓ Moved: ${suggestion.source.relativePath} → ${suggestion.target.relativePath}`);
          movedCount++;
        } catch (error) {
          console.error(`✗ Failed to move ${suggestion.source.relativePath}: ${error}`);
        }
      }
    }

    // Handle replacement suggestions
    for (const suggestion of result.replacementSuggestions) {
      if (dryRun) {
        console.log(`[DRY RUN] Would replace: ${suggestion.file.relativePath} with ${suggestion.replacement.relativePath}`);
      } else {
        try {
          // Backup target file
          const backupPath = path.join(backupDir, suggestion.file.relativePath);
          const backupDirPath = path.dirname(backupPath);
          if (!fs.existsSync(backupDirPath)) {
            fs.mkdirSync(backupDirPath, { recursive: true });
          }
          
          if (fs.existsSync(suggestion.file.path)) {
            fs.copyFileSync(suggestion.file.path, backupPath);
          }
          
          // Copy replacement file to target location
          if (fs.existsSync(suggestion.replacement.path)) {
            // Ensure target directory exists
            const targetDir = path.dirname(suggestion.file.path);
            if (!fs.existsSync(targetDir)) {
              fs.mkdirSync(targetDir, { recursive: true });
            }
            
            fs.copyFileSync(suggestion.replacement.path, suggestion.file.path);
            console.log(`✓ Replaced: ${suggestion.file.relativePath} with ${suggestion.replacement.relativePath}`);
            replacedCount++;
          } else {
            console.warn(`⚠️  Replacement file not found: ${suggestion.replacement.relativePath}`);
          }
        } catch (error) {
          console.error(`✗ Failed to replace ${suggestion.file.relativePath}: ${error}`);
        }
      }
    }
  }

  if (!dryRun) {
    console.log(`\n✓ Cleanup complete: ${removedCount} files removed, ${movedCount} files moved, ${replacedCount} files replaced`);
    console.log(`✓ Backup created in: ${backupDir}`);

    // Git integration
    if (useGit) {
      const gitStatus = checkGitStatus();
      if (gitStatus.isGitRepo) {
        console.log('\n📝 Git integration:');
        if (gitStatus.hasChanges) {
          console.log('⚠️  Working directory has uncommitted changes');
          console.log('   Consider committing or stashing changes before running optimization');
        } else {
          try {
            stageGitChanges(result);
            createGitCommit('chore: optimize project structure - remove unused files and consolidate duplicates');
          } catch (error) {
            console.warn(`⚠️  Git operations failed: ${error}`);
          }
        }
      } else {
        console.log('ℹ️  Not a git repository, skipping git operations');
      }
    }
  } else {
    console.log(`\n[DRY RUN] Would remove ${removedCount} files, move ${movedCount} files, replace ${replacedCount} files`);
  }
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || !args.includes('--execute');
  const reportOnly = args.includes('--report-only');
  const useGit = args.includes('--git');
  const reportPath = args.find(arg => arg.startsWith('--report='))?.split('=')[1] || 'file-optimization-report.md';

  console.log('🚀 File Analysis and Optimization Script\n');
  console.log('=' .repeat(50) + '\n');

  const analyzer = new FileAnalyzer();
  const result = analyzer.analyze();

  // Generate report
  const report = generateReport(result, reportPath);
  console.log('\n' + '='.repeat(50));
  console.log('\n📊 Analysis Complete!\n');
  console.log(report);

  // Execute cleanup if requested
  if (!reportOnly && !dryRun) {
    console.log('\n⚠️  WARNING: About to modify files. Press Ctrl+C to cancel...');
    setTimeout(() => {
      executeCleanup(result, false, useGit);
    }, 3000);
  } else if (!reportOnly) {
    console.log('\n💡 Run with --execute to apply changes (currently in dry-run mode)');
    console.log('💡 Add --git flag to automatically stage and commit changes');
  }
}

// Run if executed directly
const isMainModule = 
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.includes('file-optimizer') ||
  process.argv[1]?.endsWith('file-optimizer.ts');

if (isMainModule) {
  main();
}

export { FileAnalyzer, generateReport, executeCleanup };
