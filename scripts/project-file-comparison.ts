#!/usr/bin/env tsx
/**
 * Project File Comparison and Optimization Script
 * 
 * This script performs comprehensive analysis of files in src/ and root directories:
 * 1. Compares files with the same name in both locations
 * 2. Determines which version is more complete/up-to-date
 * 3. Identifies redundant and unused files
 * 4. Suggests replacements and consolidations
 * 5. Generates a detailed report with actionable steps
 * 
 * Usage:
 *   tsx scripts/project-file-comparison.ts [options]
 * 
 * Options:
 *   --dry-run      Run analysis without making changes (default)
 *   --execute      Actually perform file operations
 *   --report=path  Specify custom report output path (default: project-file-comparison-report.md)
 *   --verbose      Show detailed comparison information
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
  '.file-optimizer-backup',
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

interface FileInfo {
  path: string;
  relativePath: string;
  name: string;
  extension: string;
  content: string;
  size: number;
  lines: number;
  lastModified: Date;
  isInRoot: boolean;
  isInSrc: boolean;
  directory: string;
}

interface FileComparison {
  fileName: string;
  srcFile?: FileInfo;
  rootFile?: FileInfo;
  completeness: {
    srcScore: number;
    rootScore: number;
    winner: 'src' | 'root' | 'equal' | 'src-only' | 'root-only';
    reasons: string[];
  };
  usage: {
    srcUsed: boolean;
    rootUsed: boolean;
    references: string[];
  };
  recommendation: {
    action: 'replace' | 'remove' | 'keep-both' | 'merge' | 'move-to-src' | 'move-to-root' | 'no-action';
    target?: FileInfo;
    source?: FileInfo;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  };
  differences?: {
    contentDiff: string;
    sizeDiff: number;
    sizeDiffPercent: number;
    dateDiff: number;
    lineDiff: number;
  };
}

interface DirectoryComparison {
  directoryName: string;
  srcPath: string;
  rootPath: string;
  files: FileComparison[];
  summary: {
    totalFiles: number;
    srcOnly: number;
    rootOnly: number;
    duplicates: number;
    recommendations: {
      replace: number;
      remove: number;
      move: number;
      keepBoth: number;
    };
  };
}

interface AnalysisReport {
  timestamp: Date;
  summary: {
    totalFilesScanned: number;
    srcFiles: number;
    rootFiles: number;
    duplicatePairs: number;
    directoriesCompared: number;
  };
  directoryComparisons: DirectoryComparison[];
  redundantFiles: {
    file: FileInfo;
    reason: string;
    recommendation: string;
  }[];
  unusedFiles: {
    file: FileInfo;
    location: 'src' | 'root';
    references: string[];
  }[];
  actionableSteps: {
    high: Array<{
      action: string;
      description: string;
      files: string[];
    }>;
    medium: Array<{
      action: string;
      description: string;
      files: string[];
    }>;
    low: Array<{
      action: string;
      description: string;
      files: string[];
    }>;
  };
}

class ProjectFileComparator {
  private allFiles: Map<string, FileInfo> = new Map();
  private fileReferences: Map<string, Set<string>> = new Map();
  private srcFiles: FileInfo[] = [];
  private rootFiles: FileInfo[] = [];
  private verbose: boolean = false;

  constructor(verbose: boolean = false) {
    this.verbose = verbose;
  }

  /**
   * Scan all files in the project
   */
  scanFiles(): void {
    console.log('📁 Scanning project files...');
    this.scanDirectory(ROOT_DIR, true);
    console.log(`✓ Found ${this.allFiles.size} files (${this.srcFiles.length} in src, ${this.rootFiles.length} in root)`);
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
          lines: 0,
          lastModified: stats.mtime,
          isInRoot: isRoot && !relativePath.startsWith('src/'),
          isInSrc: relativePath.startsWith('src/'),
          directory: path.dirname(relativePath),
        };

        // Read content for source files
        if (SOURCE_EXTENSIONS.includes(fileInfo.extension) || fileInfo.name.endsWith('.config.js') || fileInfo.name.endsWith('.config.ts')) {
          try {
            fileInfo.content = fs.readFileSync(fullPath, 'utf-8');
            fileInfo.lines = fileInfo.content.split('\n').length;
          } catch (error) {
            if (this.verbose) {
              console.warn(`⚠️  Could not read ${relativePath}: ${error}`);
            }
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
      if (this.verbose) {
        console.warn(`⚠️  Error scanning ${dir}: ${error}`);
      }
    }
  }

  /**
   * Track file references from imports
   */
  trackReferences(): void {
    console.log('🔍 Tracking file references...');
    const importPatterns = [
      /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
      /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
      /from\s+['"]([^'"]+)['"]/g,
    ];

    for (const [relativePath, fileInfo] of this.allFiles.entries()) {
      if (!fileInfo.content) continue;

      const references = new Set<string>();

      // Extract all import/require statements
      for (const pattern of importPatterns) {
        let match;
        while ((match = pattern.exec(fileInfo.content)) !== null) {
          const importPath = match[1];
          if (!importPath || importPath.startsWith('http') || importPath.startsWith('data:')) {
            continue;
          }

          // Resolve the actual file path
          const resolvedPath = this.resolveImportPath(importPath, fileInfo.path);
          if (resolvedPath && this.allFiles.has(resolvedPath)) {
            references.add(resolvedPath);
          }
        }
      }

      if (references.size > 0) {
        this.fileReferences.set(relativePath, references);
      }
    }

    const totalRefs = Array.from(this.fileReferences.values()).reduce((sum, refs) => sum + refs.size, 0);
    console.log(`✓ Tracked ${totalRefs} file references`);
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

    // Handle root-level imports
    if (!importPath.startsWith('.') && !importPath.startsWith('/') && !importPath.includes('node_modules')) {
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

  /**
   * Check if a file is referenced
   */
  private isFileReferenced(relativePath: string): boolean {
    // Check if file is referenced in any imports
    for (const [file, refs] of this.fileReferences.entries()) {
      if (refs.has(relativePath)) {
        return true;
      }
    }

    // Check if it's a special file that's always used
    const alwaysUsed = [
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
      'electron/main.cjs',
      'electron/preload.cjs',
    ];

    if (alwaysUsed.includes(path.basename(relativePath)) || alwaysUsed.includes(relativePath)) {
      return true;
    }

    return false;
  }

  /**
   * Get all files that reference a given file
   */
  private getFileReferences(relativePath: string): string[] {
    const references: string[] = [];
    for (const [file, refs] of this.fileReferences.entries()) {
      if (refs.has(relativePath)) {
        references.push(file);
      }
    }
    return references;
  }

  /**
   * Compare directories between src and root
   */
  compareDirectories(): DirectoryComparison[] {
    console.log('📂 Comparing src and root directories...');
    const comparisons: DirectoryComparison[] = [];

    // Get unique directory names from src
    const srcDirs = new Set<string>();
    for (const file of this.srcFiles) {
      const dirPath = file.directory;
      if (dirPath !== 'src' && dirPath.startsWith('src/')) {
        const dirName = dirPath.replace('src/', '');
        if (dirName && !dirName.includes('node_modules')) {
          srcDirs.add(dirName);
        }
      }
    }

    // Get unique directory names from root
    const rootDirs = new Set<string>();
    for (const file of this.rootFiles) {
      const dirPath = file.directory;
      if (dirPath !== '.' && !dirPath.startsWith('src/') && !dirPath.includes('node_modules')) {
        // Extract first-level directory
        const parts = dirPath.split(path.sep);
        if (parts.length > 0 && parts[0] !== '.') {
          rootDirs.add(parts[0]);
        }
      }
    }

    // Compare directories that exist in both
    const commonDirs = new Set([...srcDirs].filter(d => rootDirs.has(d)));

    for (const dirName of commonDirs) {
      const comparison = this.compareDirectory(dirName);
      if (comparison && comparison.files.length > 0) {
        comparisons.push(comparison);
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
      f.directory === srcDir || f.directory.startsWith(srcDir + '/')
    );

    // Get all files in root directory
    const rootDirFiles = this.rootFiles.filter(f => {
      const fileDir = f.directory;
      return fileDir === rootDir || fileDir.startsWith(rootDir + '/') || fileDir.startsWith(rootDir + path.sep);
    });

    // Create a map of files by name
    const srcFilesMap = new Map<string, FileInfo>();
    const rootFilesMap = new Map<string, FileInfo>();

    for (const file of srcDirFiles) {
      const key = file.name;
      srcFilesMap.set(key, file);
    }

    for (const file of rootDirFiles) {
      const key = file.name;
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

    // Calculate summary
    const summary = {
      totalFiles: files.length,
      srcOnly: files.filter(f => !f.rootFile).length,
      rootOnly: files.filter(f => !f.srcFile).length,
      duplicates: files.filter(f => f.srcFile && f.rootFile).length,
      recommendations: {
        replace: files.filter(f => f.recommendation.action === 'replace').length,
        remove: files.filter(f => f.recommendation.action === 'remove').length,
        move: files.filter(f => f.recommendation.action === 'move-to-src' || f.recommendation.action === 'move-to-root').length,
        keepBoth: files.filter(f => f.recommendation.action === 'keep-both').length,
      },
    };

    return {
      directoryName: dirName,
      srcPath: srcDir,
      rootPath: rootDir,
      files,
      summary,
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

    // Check usage
    const srcUsed = srcFile ? this.isFileReferenced(srcFile.relativePath) : false;
    const rootUsed = rootFile ? this.isFileReferenced(rootFile.relativePath) : false;
    const srcReferences = srcFile ? this.getFileReferences(srcFile.relativePath) : [];
    const rootReferences = rootFile ? this.getFileReferences(rootFile.relativePath) : [];

    // Determine winner
    const reasons: string[] = [];
    let winner: 'src' | 'root' | 'equal' | 'src-only' | 'root-only' = 'equal';

    if (!srcFile) {
      winner = 'root-only';
      reasons.push('File only exists in root directory');
    } else if (!rootFile) {
      winner = 'src-only';
      reasons.push('File only exists in src directory');
    } else {
      // Both files exist, compare them
      if (srcScore > rootScore + 0.1) {
        winner = 'src';
        reasons.push(`Src file has higher completeness score (${srcScore.toFixed(2)} vs ${rootScore.toFixed(2)})`);
      } else if (rootScore > srcScore + 0.1) {
        winner = 'root';
        reasons.push(`Root file has higher completeness score (${rootScore.toFixed(2)} vs ${srcScore.toFixed(2)})`);
      } else {
        winner = 'equal';
        reasons.push('Files have similar completeness scores');
      }

      // Check modification dates
      const dateDiff = Math.floor((srcFile.lastModified.getTime() - rootFile.lastModified.getTime()) / (1000 * 60 * 60 * 24));
      if (Math.abs(dateDiff) > 7) {
        if (dateDiff > 0) {
          reasons.push(`Src file is ${dateDiff} days newer`);
          if (winner === 'equal') winner = 'src';
        } else {
          reasons.push(`Root file is ${Math.abs(dateDiff)} days newer`);
          if (winner === 'equal') winner = 'root';
        }
      }

      // Check file sizes
      const sizeDiff = srcFile.size - rootFile.size;
      const sizeDiffPercent = (Math.abs(sizeDiff) / Math.max(srcFile.size, rootFile.size)) * 100;
      if (sizeDiffPercent > 20) {
        if (sizeDiff > 0) {
          reasons.push(`Src file is ${sizeDiffPercent.toFixed(1)}% larger (likely more complete)`);
          if (winner === 'equal') winner = 'src';
        } else {
          reasons.push(`Root file is ${Math.abs(sizeDiffPercent).toFixed(1)}% larger (likely more complete)`);
          if (winner === 'equal') winner = 'root';
        }
      }
    }

    // Calculate differences
    let differences: FileComparison['differences'] | undefined;
    if (srcFile && rootFile) {
      const sizeDiff = srcFile.size - rootFile.size;
      const sizeDiffPercent = (Math.abs(sizeDiff) / Math.max(srcFile.size, rootFile.size)) * 100;
      const dateDiff = Math.floor((srcFile.lastModified.getTime() - rootFile.lastModified.getTime()) / (1000 * 60 * 60 * 24));
      const lineDiff = srcFile.lines - rootFile.lines;

      differences = {
        contentDiff: this.getContentDiff(srcFile, rootFile),
        sizeDiff,
        sizeDiffPercent,
        dateDiff,
        lineDiff,
      };
    }

    // Generate recommendation
    const recommendation = this.generateRecommendation(
      srcFile,
      rootFile,
      srcScore,
      rootScore,
      srcUsed,
      rootUsed,
      winner,
      reasons
    );

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
      usage: {
        srcUsed,
        rootUsed,
        references: [...new Set([...srcReferences, ...rootReferences])],
      },
      recommendation,
      differences,
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
      const commentLines = lines.filter(l => {
        const trimmed = l.trim();
        return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/**') || trimmed.startsWith('/*');
      }).length;
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

  private getContentDiff(file1: FileInfo, file2: FileInfo): string {
    if (!file1.content || !file2.content) {
      return 'Cannot compare: one or both files have no content';
    }

    const lines1 = file1.content.split('\n');
    const lines2 = file2.content.split('\n');
    const maxLines = Math.max(lines1.length, lines2.length);

    const diff: string[] = [];
    let diffCount = 0;
    for (let i = 0; i < maxLines && diffCount < 20; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';
      if (line1 !== line2) {
        diff.push(`Line ${i + 1}:`);
        if (line1) diff.push(`  - ${line1.substring(0, 100)}${line1.length > 100 ? '...' : ''}`);
        if (line2) diff.push(`  + ${line2.substring(0, 100)}${line2.length > 100 ? '...' : ''}`);
        diffCount++;
      }
    }

    if (diffCount >= 20) {
      diff.push('... (more differences)');
    }

    return diff.join('\n');
  }

  private generateRecommendation(
    srcFile: FileInfo | undefined,
    rootFile: FileInfo | undefined,
    srcScore: number,
    rootScore: number,
    srcUsed: boolean,
    rootUsed: boolean,
    winner: 'src' | 'root' | 'equal' | 'src-only' | 'root-only',
    reasons: string[]
  ): FileComparison['recommendation'] {
    if (!rootFile) {
      // File only in src - no action needed
      return {
        action: 'no-action',
        reason: 'File only exists in src directory, no root equivalent',
        priority: 'low',
      };
    }

    if (!srcFile) {
      // File only in root - consider moving to src
      return {
        action: 'move-to-src',
        source: rootFile,
        target: { ...rootFile, relativePath: `src/${rootFile.relativePath}`, isInSrc: true, isInRoot: false },
        reason: 'File exists only in root, consider moving to src for better organization',
        priority: rootUsed ? 'medium' : 'low',
      };
    }

    // Both files exist
    if (winner === 'src' && srcScore > rootScore + 0.1) {
      // Src is more complete
      if (!rootUsed) {
        return {
          action: 'replace',
          source: rootFile,
          target: srcFile,
          reason: `Src file is more complete (score: ${srcScore.toFixed(2)} vs ${rootScore.toFixed(2)}) and root file is not used. Replace root with src version.`,
          priority: 'high',
        };
      } else {
        return {
          action: 'merge',
          source: rootFile,
          target: srcFile,
          reason: `Src file is more complete but root file is still referenced. Consider updating imports to use src version.`,
          priority: 'medium',
        };
      }
    } else if (winner === 'root' && rootScore > srcScore + 0.1) {
      // Root is more complete
      if (!srcUsed) {
        return {
          action: 'replace',
          source: srcFile,
          target: rootFile,
          reason: `Root file is more complete (score: ${rootScore.toFixed(2)} vs ${srcScore.toFixed(2)}) and src file is not used. Replace src with root version.`,
          priority: 'high',
        };
      } else {
        return {
          action: 'move-to-src',
          source: rootFile,
          target: srcFile,
          reason: `Root file is more complete. Move to src and replace src version.`,
          priority: 'medium',
        };
      }
    } else {
      // Files are similar
      if (!rootUsed && srcUsed) {
        return {
          action: 'remove',
          source: rootFile,
          reason: 'Files are similar, but only src version is used. Remove root version.',
          priority: 'high',
        };
      } else if (rootUsed && !srcUsed) {
        return {
          action: 'remove',
          source: srcFile,
          reason: 'Files are similar, but only root version is used. Remove src version.',
          priority: 'high',
        };
      } else if (!rootUsed && !srcUsed) {
        // Neither is used - prefer src for organization
        return {
          action: 'remove',
          source: rootFile,
          reason: 'Files are similar and neither is used. Remove root version to maintain src organization.',
          priority: 'medium',
        };
      } else {
        return {
          action: 'keep-both',
          reason: 'Files are similar and both are used. Review manually to determine if consolidation is possible.',
          priority: 'low',
        };
      }
    }
  }

  /**
   * Identify unused files
   */
  identifyUnusedFiles(): AnalysisReport['unusedFiles'] {
    console.log('🔎 Identifying unused files...');
    const unused: AnalysisReport['unusedFiles'] = [];

    for (const file of this.allFiles.values()) {
      if (this.isFileReferenced(file.relativePath)) {
        continue;
      }

      // Skip config files
      if (file.name.includes('config') || file.name.startsWith('.')) {
        continue;
      }

      unused.push({
        file,
        location: file.isInSrc ? 'src' : 'root',
        references: [],
      });
    }

    console.log(`✓ Found ${unused.length} potentially unused files`);
    return unused;
  }

  /**
   * Generate complete analysis report
   */
  analyze(): AnalysisReport {
    this.scanFiles();
    this.trackReferences();

    const directoryComparisons = this.compareDirectories();
    const unusedFiles = this.identifyUnusedFiles();

    // Generate actionable steps
    const actionableSteps = this.generateActionableSteps(directoryComparisons, unusedFiles);

    // Identify redundant files
    const redundantFiles = this.identifyRedundantFiles(directoryComparisons);

    return {
      timestamp: new Date(),
      summary: {
        totalFilesScanned: this.allFiles.size,
        srcFiles: this.srcFiles.length,
        rootFiles: this.rootFiles.length,
        duplicatePairs: directoryComparisons.reduce((sum, comp) => sum + comp.summary.duplicates, 0),
        directoriesCompared: directoryComparisons.length,
      },
      directoryComparisons,
      redundantFiles,
      unusedFiles,
      actionableSteps,
    };
  }

  private identifyRedundantFiles(comparisons: DirectoryComparison[]): AnalysisReport['redundantFiles'] {
    const redundant: AnalysisReport['redundantFiles'] = [];

    for (const comparison of comparisons) {
      for (const fileComp of comparison.files) {
        if (fileComp.recommendation.action === 'remove' || fileComp.recommendation.action === 'replace') {
          const file = fileComp.recommendation.source || fileComp.rootFile || fileComp.srcFile;
          if (file) {
            redundant.push({
              file,
              reason: fileComp.recommendation.reason,
              recommendation: fileComp.recommendation.action === 'remove' ? 'Remove this file' : 'Replace with better version',
            });
          }
        }
      }
    }

    return redundant;
  }

  private generateActionableSteps(
    comparisons: DirectoryComparison[],
    unusedFiles: AnalysisReport['unusedFiles']
  ): AnalysisReport['actionableSteps'] {
    const steps: AnalysisReport['actionableSteps'] = {
      high: [],
      medium: [],
      low: [],
    };

    // Collect high priority actions
    const highReplace: string[] = [];
    const highRemove: string[] = [];

    for (const comparison of comparisons) {
      for (const fileComp of comparison.files) {
        if (fileComp.recommendation.priority === 'high') {
          if (fileComp.recommendation.action === 'replace' && fileComp.recommendation.source) {
            highReplace.push(fileComp.recommendation.source.relativePath);
          } else if (fileComp.recommendation.action === 'remove' && fileComp.recommendation.source) {
            highRemove.push(fileComp.recommendation.source.relativePath);
          }
        }
      }
    }

    if (highReplace.length > 0) {
      steps.high.push({
        action: 'replace',
        description: 'Replace outdated/incomplete files with better versions',
        files: highReplace,
      });
    }

    if (highRemove.length > 0) {
      steps.high.push({
        action: 'remove',
        description: 'Remove redundant files that are not used',
        files: highRemove,
      });
    }

    // Collect medium priority actions
    const mediumMove: string[] = [];
    const mediumRemove: string[] = [];

    for (const comparison of comparisons) {
      for (const fileComp of comparison.files) {
        if (fileComp.recommendation.priority === 'medium') {
          if (fileComp.recommendation.action === 'move-to-src' && fileComp.recommendation.source) {
            mediumMove.push(fileComp.recommendation.source.relativePath);
          } else if (fileComp.recommendation.action === 'remove' && fileComp.recommendation.source) {
            mediumRemove.push(fileComp.recommendation.source.relativePath);
          }
        }
      }
    }

    if (mediumMove.length > 0) {
      steps.medium.push({
        action: 'move',
        description: 'Move files to src directory for better organization',
        files: mediumMove,
      });
    }

    if (mediumRemove.length > 0) {
      steps.medium.push({
        action: 'remove',
        description: 'Remove unused files',
        files: mediumRemove,
      });
    }

    return steps;
  }
}

/**
 * Generate comprehensive markdown report
 */
function generateReport(report: AnalysisReport, outputPath?: string): string {
  const lines: string[] = [];

  lines.push('# Project File Comparison and Optimization Report\n');
  lines.push(`**Generated:** ${report.timestamp.toISOString()}\n`);
  lines.push('---\n\n');

  // Executive Summary
  lines.push('## 📊 Executive Summary\n\n');
  lines.push(`- **Total Files Scanned:** ${report.summary.totalFilesScanned}`);
  lines.push(`- **Files in src/:** ${report.summary.srcFiles}`);
  lines.push(`- **Files in root:** ${report.summary.rootFiles}`);
  lines.push(`- **Duplicate File Pairs:** ${report.summary.duplicatePairs}`);
  lines.push(`- **Directories Compared:** ${report.summary.directoriesCompared}`);
  lines.push(`- **Redundant Files Found:** ${report.redundantFiles.length}`);
  lines.push(`- **Unused Files Found:** ${report.unusedFiles.length}\n\n`);

  // Actionable Steps
  lines.push('## 🎯 Actionable Steps\n\n');

  if (report.actionableSteps.high.length > 0) {
    lines.push('### 🔴 High Priority\n\n');
    for (const step of report.actionableSteps.high) {
      lines.push(`#### ${step.action.toUpperCase()}: ${step.description}\n\n`);
      for (const file of step.files) {
        lines.push(`- \`${file}\`\n`);
      }
      lines.push('\n');
    }
  }

  if (report.actionableSteps.medium.length > 0) {
    lines.push('### 🟡 Medium Priority\n\n');
    for (const step of report.actionableSteps.medium) {
      lines.push(`#### ${step.action.toUpperCase()}: ${step.description}\n\n`);
      for (const file of step.files) {
        lines.push(`- \`${file}\`\n`);
      }
      lines.push('\n');
    }
  }

  if (report.actionableSteps.low.length > 0) {
    lines.push('### 🟢 Low Priority\n\n');
    for (const step of report.actionableSteps.low) {
      lines.push(`#### ${step.action.toUpperCase()}: ${step.description}\n\n`);
      for (const file of step.files) {
        lines.push(`- \`${file}\`\n`);
      }
      lines.push('\n');
    }
  }

  // Directory Comparisons
  if (report.directoryComparisons.length > 0) {
    lines.push('## 📂 Directory Comparisons\n\n');
    for (const comparison of report.directoryComparisons) {
      lines.push(`### ${comparison.directoryName}\n\n`);
      lines.push(`- **Src Path:** \`${comparison.srcPath}\``);
      lines.push(`- **Root Path:** \`${comparison.rootPath}\``);
      lines.push(`- **Total Files:** ${comparison.summary.totalFiles}`);
      lines.push(`- **Src Only:** ${comparison.summary.srcOnly}`);
      lines.push(`- **Root Only:** ${comparison.summary.rootOnly}`);
      lines.push(`- **Duplicates:** ${comparison.summary.duplicates}\n\n`);

      // Show file comparisons
      if (comparison.files.length > 0) {
        lines.push('#### File Details\n\n');
        for (const fileComp of comparison.files) {
          lines.push(`##### ${fileComp.fileName}\n\n`);
          
          if (fileComp.srcFile) {
            lines.push(`**Src:** \`${fileComp.srcFile.relativePath}\` `);
            lines.push(`(${(fileComp.srcFile.size / 1024).toFixed(2)} KB, ${fileComp.srcFile.lines} lines, `);
            lines.push(`modified: ${fileComp.srcFile.lastModified.toISOString().split('T')[0]})\n`);
          }
          
          if (fileComp.rootFile) {
            lines.push(`**Root:** \`${fileComp.rootFile.relativePath}\` `);
            lines.push(`(${(fileComp.rootFile.size / 1024).toFixed(2)} KB, ${fileComp.rootFile.lines} lines, `);
            lines.push(`modified: ${fileComp.rootFile.lastModified.toISOString().split('T')[0]})\n`);
          }

          lines.push(`\n**Completeness:** Src: ${fileComp.completeness.srcScore.toFixed(2)}, `);
          lines.push(`Root: ${fileComp.completeness.rootScore.toFixed(2)}, `);
          lines.push(`Winner: ${fileComp.completeness.winner}\n`);

          lines.push(`**Usage:** Src: ${fileComp.usage.srcUsed ? '✅ Used' : '❌ Not Used'}, `);
          lines.push(`Root: ${fileComp.usage.rootUsed ? '✅ Used' : '❌ Not Used'}\n`);

          if (fileComp.differences) {
            lines.push(`\n**Differences:**\n`);
            lines.push(`- Size: ${fileComp.differences.sizeDiff > 0 ? '+' : ''}${(fileComp.differences.sizeDiff / 1024).toFixed(2)} KB `);
            lines.push(`(${fileComp.differences.sizeDiffPercent.toFixed(1)}%)\n`);
            lines.push(`- Lines: ${fileComp.differences.lineDiff > 0 ? '+' : ''}${fileComp.differences.lineDiff}\n`);
            lines.push(`- Date: ${fileComp.differences.dateDiff > 0 ? '+' : ''}${fileComp.differences.dateDiff} days\n`);
          }

          lines.push(`\n**Recommendation:** ${fileComp.recommendation.action} `);
          lines.push(`(${fileComp.recommendation.priority} priority)\n`);
          lines.push(`- ${fileComp.recommendation.reason}\n\n`);

          if (fileComp.completeness.reasons.length > 0) {
            lines.push('**Reasons:**\n');
            for (const reason of fileComp.completeness.reasons) {
              lines.push(`- ${reason}\n`);
            }
            lines.push('\n');
          }
        }
      }
      lines.push('---\n\n');
    }
  }

  // Redundant Files
  if (report.redundantFiles.length > 0) {
    lines.push('## 🔴 Redundant Files\n\n');
    lines.push('Files that are redundant and can be removed or replaced:\n\n');
    for (const redundant of report.redundantFiles) {
      lines.push(`- **\`${redundant.file.relativePath}\`**`);
      lines.push(` (${(redundant.file.size / 1024).toFixed(2)} KB)\n`);
      lines.push(`  - Reason: ${redundant.reason}\n`);
      lines.push(`  - Recommendation: ${redundant.recommendation}\n\n`);
    }
  }

  // Unused Files
  if (report.unusedFiles.length > 0) {
    lines.push('## ⚠️ Unused Files\n\n');
    lines.push('Files that are not referenced anywhere in the codebase:\n\n');
    for (const unused of report.unusedFiles) {
      lines.push(`- **\`${unused.file.relativePath}\`**`);
      lines.push(` (${unused.location}, ${(unused.file.size / 1024).toFixed(2)} KB)\n`);
    }
    lines.push('\n');
  }

  // Git Commands
  lines.push('## 🔧 Suggested Git Commands\n\n');
  lines.push('If you want to apply the recommended changes:\n\n');
  lines.push('```bash\n');

  const filesToRemove = [
    ...report.actionableSteps.high.filter(s => s.action === 'remove').flatMap(s => s.files),
    ...report.actionableSteps.medium.filter(s => s.action === 'remove').flatMap(s => s.files),
  ];

  const filesToReplace = report.actionableSteps.high.filter(s => s.action === 'replace').flatMap(s => s.files);

  if (filesToRemove.length > 0) {
    lines.push('# Remove redundant files\n');
    for (const file of filesToRemove) {
      lines.push(`git rm "${file}"\n`);
    }
    lines.push('\n');
  }

  if (filesToReplace.length > 0) {
    lines.push('# Note: Replacements require manual review\n');
    lines.push('# Copy content from better version to replace outdated version\n\n');
  }

  lines.push('# Commit changes\n');
  lines.push('git commit -m "chore: optimize project structure - remove redundant files"\n');
  lines.push('```\n\n');

  lines.push('---\n\n');
  lines.push('*Report generated by project-file-comparison.ts*\n');

  const reportText = lines.join('');

  if (outputPath) {
    fs.writeFileSync(outputPath, reportText, 'utf-8');
    console.log(`✓ Report saved to ${outputPath}`);
  }

  return reportText;
}

/**
 * Main execution
 */
function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose');
  const reportPath = args.find(arg => arg.startsWith('--report='))?.split('=')[1] || 'project-file-comparison-report.md';

  console.log('🚀 Project File Comparison and Optimization Script\n');
  console.log('='.repeat(60) + '\n');

  const comparator = new ProjectFileComparator(verbose);
  const report = comparator.analyze();

  // Generate and save report
  const reportText = generateReport(report, reportPath);
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Analysis Complete!\n');
  console.log(`Summary:`);
  console.log(`  - Total files scanned: ${report.summary.totalFilesScanned}`);
  console.log(`  - Duplicate pairs found: ${report.summary.duplicatePairs}`);
  console.log(`  - Redundant files: ${report.redundantFiles.length}`);
  console.log(`  - Unused files: ${report.unusedFiles.length}`);
  console.log(`  - High priority actions: ${report.actionableSteps.high.length}`);
  console.log(`  - Medium priority actions: ${report.actionableSteps.medium.length}`);
  console.log(`\n📄 Full report saved to: ${reportPath}\n`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('project-file-comparison')) {
  main();
}

export { ProjectFileComparator, generateReport, AnalysisReport };
