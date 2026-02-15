#!/usr/bin/env tsx
/**
 * Source Directory Analysis and Optimization Script
 * 
 * This script performs comprehensive analysis of files in the src/ directory:
 * 1. Checks for equivalent files in root directory
 * 2. Determines if src files are used in the project (CODE FILES ONLY)
 * 3. Analyzes if src files are functional and can be used
 * 4. Generates detailed report with findings and recommendations
 * 
 * IMPORTANT: This script ONLY analyzes code files (.ts, .tsx, .js, .jsx, .css, etc.)
 * Documentation files (.md, .README, .txt, etc.) are EXCLUDED from reference tracking
 * and usage analysis, as they are not part of the actual source code.
 * 
 * Usage:
 *   tsx scripts/src-directory-analyzer.ts [options]
 * 
 * Options:
 *   --report=path  Specify custom report output path (default: src-directory-analysis-report.md)
 *   --verbose      Show detailed analysis information
 *   --check-syntax Check TypeScript/JavaScript syntax (requires tsx/tsc)
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
// Code file extensions that should be analyzed
const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.json'];
// Documentation file extensions that should be EXCLUDED from reference tracking
const DOCUMENTATION_EXTENSIONS = ['.md', '.markdown', '.txt', '.readme', '.mdx'];
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
  lines: number;
  lastModified: Date;
  directory: string;
  isInSrc: boolean;
  isInRoot: boolean;
}

interface EquivalentFile {
  srcFile: FileInfo;
  rootFile?: FileInfo;
  similarity: 'identical' | 'similar' | 'different' | 'not-found';
  similarityScore: number;
  differences?: {
    sizeDiff: number;
    lineDiff: number;
    dateDiff: number;
    contentDiff: string;
  };
}

interface FileUsage {
  file: FileInfo;
  isUsed: boolean;
  references: string[];
  referenceCount: number;
  importPaths: string[];
}

interface FileUsability {
  file: FileInfo;
  isUsable: boolean;
  hasSyntaxErrors: boolean;
  hasExports: boolean;
  hasImports: boolean;
  purpose: 'component' | 'service' | 'utility' | 'type' | 'hook' | 'store' | 'config' | 'unknown';
  issues: string[];
  suggestions: string[];
}

interface SrcFileAnalysis {
  file: FileInfo;
  equivalent?: EquivalentFile;
  usage: FileUsage;
  usability: FileUsability;
  recommendation: {
    action: 'keep' | 'remove' | 'consolidate' | 'integrate' | 'review';
    reason: string;
    priority: 'high' | 'medium' | 'low';
  };
}

interface AnalysisReport {
  timestamp: Date;
  summary: {
    totalSrcFiles: number;
    filesWithEquivalents: number;
    unusedFiles: number;
    unusableFiles: number;
    filesToIntegrate: number;
    filesToRemove: number;
    filesToConsolidate: number;
  };
  filesWithEquivalents: EquivalentFile[];
  unusedFiles: FileUsage[];
  usableButUnusedFiles: Array<{
    file: FileInfo;
    usability: FileUsability;
    usage: FileUsage;
  }>;
  recommendations: {
    high: SrcFileAnalysis[];
    medium: SrcFileAnalysis[];
    low: SrcFileAnalysis[];
  };
  detailedAnalysis: SrcFileAnalysis[];
}

class SrcDirectoryAnalyzer {
  private allFiles: Map<string, FileInfo> = new Map();
  private srcFiles: FileInfo[] = [];
  private rootFiles: FileInfo[] = [];
  private fileReferences: Map<string, Set<string>> = new Map();
  private verbose: boolean = false;
  private checkSyntax: boolean = false;

  constructor(verbose: boolean = false, checkSyntax: boolean = false) {
    this.verbose = verbose;
    this.checkSyntax = checkSyntax;
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
          directory: path.dirname(relativePath),
          isInSrc: false,
          isInRoot: false,
        };

        // Normalize path separators to handle Windows backslashes (e.g., "src\\components\\...")
        const normalizedRelative = relativePath.split(path.sep).join('/');
        // Correctly set flags using normalized path
        fileInfo.isInSrc = normalizedRelative.startsWith('src/');
        fileInfo.isInRoot = isRoot && !normalizedRelative.startsWith('src/');


        // Read content for source files only (exclude documentation files)
        const isDocumentationFile = DOCUMENTATION_EXTENSIONS.includes(fileInfo.extension.toLowerCase()) ||
                                   fileInfo.name.toLowerCase().endsWith('.readme') ||
                                   fileInfo.name.toLowerCase() === 'readme';
        
        if (!isDocumentationFile && (CODE_EXTENSIONS.includes(fileInfo.extension) || 
            fileInfo.name.endsWith('.config.js') || 
            fileInfo.name.endsWith('.config.ts'))) {
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

        if (fileInfo.isInSrc) {
          this.srcFiles.push(fileInfo);
        }
        if (fileInfo.isInRoot) {
          this.rootFiles.push(fileInfo);
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
   * IMPORTANT: Only checks code files, NOT documentation files (.md, .README, etc.)
   */
  trackReferences(): void {
    console.log('🔍 Tracking file references (code files only, excluding documentation)...');
    let referenceCount = 0;
    let skippedFiles = 0;

    for (const [relativePath, fileInfo] of this.allFiles.entries()) {
      // Skip files without content
      if (!fileInfo.content) {
        skippedFiles++;
        continue;
      }

      // EXCLUDE documentation files from reference tracking
      const isDocumentationFile = DOCUMENTATION_EXTENSIONS.includes(fileInfo.extension.toLowerCase()) ||
                                 fileInfo.name.toLowerCase().endsWith('.readme') ||
                                 fileInfo.name.toLowerCase() === 'readme' ||
                                 fileInfo.name.toLowerCase().startsWith('readme.');
      
      if (isDocumentationFile) {
        skippedFiles++;
        continue;
      }

      // Only process code files
      if (!CODE_EXTENSIONS.includes(fileInfo.extension) && 
          !fileInfo.name.endsWith('.config.js') && 
          !fileInfo.name.endsWith('.config.ts')) {
        skippedFiles++;
        continue;
      }

      const references = new Set<string>();

      // Extract all import/require statements
      for (const pattern of IMPORT_PATTERNS) {
        let match;
        const content = fileInfo.content;
        while ((match = pattern.exec(content)) !== null) {
          const importPath = match[1];
          if (!importPath || importPath.startsWith('http') || importPath.startsWith('data:')) {
            continue;
          }

          // Resolve the actual file path
          const resolvedPath = this.resolveImportPath(importPath, fileInfo.path);
          if (resolvedPath && this.allFiles.has(resolvedPath)) {
            // Only track references to code files, not documentation
            const targetFile = this.allFiles.get(resolvedPath);
            if (targetFile && !DOCUMENTATION_EXTENSIONS.includes(targetFile.extension.toLowerCase()) &&
                !targetFile.name.toLowerCase().endsWith('.readme') &&
                targetFile.name.toLowerCase() !== 'readme') {
              references.add(resolvedPath);
              referenceCount++;
            }
          }
        }
      }

      if (references.size > 0) {
        this.fileReferences.set(relativePath, references);
      }
    }

    if (this.verbose) {
      console.log(`  Skipped ${skippedFiles} documentation/non-code files`);
    }
    console.log(`✓ Tracked ${referenceCount} file references (code files only)`);
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
   * Check for equivalent files in root directory
   */
  findEquivalentFiles(): EquivalentFile[] {
    console.log('🔄 Finding equivalent files in root directory...');
    const equivalents: EquivalentFile[] = [];

    for (const srcFile of this.srcFiles) {
      // Skip config files and special files
      if (srcFile.name.startsWith('.') || srcFile.name.includes('config')) {
        continue;
      }

      // Find potential equivalent in root
      const rootEquivalent = this.findRootEquivalent(srcFile);
      
      if (rootEquivalent) {
        const similarity = this.compareFiles(srcFile, rootEquivalent);
        const similarityScore = this.calculateSimilarityScore(srcFile, rootEquivalent);
        
        equivalents.push({
          srcFile,
          rootFile: rootEquivalent,
          similarity,
          similarityScore,
          differences: this.calculateDifferences(srcFile, rootEquivalent),
        });
      } else {
        equivalents.push({
          srcFile,
          similarity: 'not-found',
          similarityScore: 0,
        });
      }
    }

    const found = equivalents.filter(e => e.rootFile).length;
    console.log(`✓ Found ${found} files with equivalents in root directory`);
    return equivalents;
  }

  private findRootEquivalent(srcFile: FileInfo): FileInfo | undefined {
    // Strategy 1: Same name in equivalent directory
    const srcDir = srcFile.directory.split(path.sep).join('/').replace(/^src\//, '');
    const potentialRootPath = path.join(srcDir, srcFile.name);
    
    // Check if file exists in root at equivalent location
    for (const rootFile of this.rootFiles) {
      if (rootFile.name === srcFile.name) {
        // Check if directory structure is similar
        const rootDir = rootFile.directory;
        if (rootDir === srcDir || rootDir.endsWith(srcDir) || srcDir.endsWith(rootDir)) {
          return rootFile;
        }
      }
    }

    // Strategy 2: Same name anywhere in root
    for (const rootFile of this.rootFiles) {
      if (rootFile.name === srcFile.name && rootFile.extension === srcFile.extension) {
        return rootFile;
      }
    }

    return undefined;
  }

  private compareFiles(file1: FileInfo, file2: FileInfo): 'identical' | 'similar' | 'different' {
    if (!file1.content || !file2.content) {
      return 'different';
    }

    if (file1.content === file2.content) {
      return 'identical';
    }

    // Calculate similarity
    const similarity = this.calculateSimilarityScore(file1, file2);
    if (similarity > 0.9) return 'identical';
    if (similarity > 0.7) return 'similar';
    return 'different';
  }

  private calculateSimilarityScore(file1: FileInfo, file2: FileInfo): number {
    if (!file1.content || !file2.content) {
      return 0;
    }

    // Simple line-based similarity
    const lines1 = file1.content.split('\n');
    const lines2 = file2.content.split('\n');
    const maxLines = Math.max(lines1.length, lines2.length);
    const minLines = Math.min(lines1.length, lines2.length);
    
    if (maxLines === 0) return 0;
    
    let matchingLines = 0;
    for (let i = 0; i < minLines; i++) {
      if (lines1[i].trim() === lines2[i].trim()) {
        matchingLines++;
      }
    }

    return matchingLines / maxLines;
  }

  private calculateDifferences(file1: FileInfo, file2: FileInfo): EquivalentFile['differences'] {
    return {
      sizeDiff: file1.size - file2.size,
      lineDiff: file1.lines - file2.lines,
      dateDiff: Math.floor((file1.lastModified.getTime() - file2.lastModified.getTime()) / (1000 * 60 * 60 * 24)),
      contentDiff: this.getContentDiff(file1, file2),
    };
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
    for (let i = 0; i < maxLines && diffCount < 10; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';
      if (line1.trim() !== line2.trim()) {
        diff.push(`Line ${i + 1}:`);
        if (line1) diff.push(`  - ${line1.substring(0, 80)}${line1.length > 80 ? '...' : ''}`);
        if (line2) diff.push(`  + ${line2.substring(0, 80)}${line2.length > 80 ? '...' : ''}`);
        diffCount++;
      }
    }

    if (diffCount >= 10) {
      diff.push('... (more differences)');
    }

    return diff.join('\n');
  }

  /**
   * Check if src files are used in the project
   * IMPORTANT: Only checks code files for references, NOT documentation files
   */
  checkFileUsage(): FileUsage[] {
    console.log('📊 Checking file usage (code files only, excluding documentation)...');
    const usages: FileUsage[] = [];

    for (const srcFile of this.srcFiles) {
      // Skip documentation files from usage analysis
      const isDocumentationFile = DOCUMENTATION_EXTENSIONS.includes(srcFile.extension.toLowerCase()) ||
                                 srcFile.name.toLowerCase().endsWith('.readme') ||
                                 srcFile.name.toLowerCase() === 'readme';
      
      if (isDocumentationFile) {
        // Documentation files are always considered "not used" in code context
        usages.push({
          file: srcFile,
          isUsed: false,
          references: [],
          referenceCount: 0,
          importPaths: [],
        });
        continue;
      }

      const references = this.getFileReferences(srcFile.relativePath);
      const importPaths = this.getImportPaths(srcFile.relativePath);
      
      usages.push({
        file: srcFile,
        isUsed: references.length > 0,
        references,
        referenceCount: references.length,
        importPaths,
      });
    }

    const usedCount = usages.filter(u => u.isUsed).length;
    console.log(`✓ ${usedCount} of ${usages.length} src code files are used (documentation files excluded)`);
    return usages;
  }

  private getFileReferences(relativePath: string): string[] {
    const references: string[] = [];
    for (const [file, refs] of this.fileReferences.entries()) {
      if (refs.has(relativePath)) {
        references.push(file);
      }
    }
    return references;
  }

  private getImportPaths(relativePath: string): string[] {
    const importPaths: string[] = [];
    const fileName = path.basename(relativePath, path.extname(relativePath));
    const dirName = path.dirname(relativePath);
    const normalizedDirName = dirName.split(path.sep).join('/');

    // Check all CODE files for imports that might reference this file
    // EXCLUDE documentation files from this check
    for (const [filePath, fileInfo] of this.allFiles.entries()) {
      if (!fileInfo.content) continue;

      // Skip documentation files
      const isDocumentationFile = DOCUMENTATION_EXTENSIONS.includes(fileInfo.extension.toLowerCase()) ||
                                 fileInfo.name.toLowerCase().endsWith('.readme') ||
                                 fileInfo.name.toLowerCase() === 'readme';
      if (isDocumentationFile) continue;

      // Only check code files
      if (!CODE_EXTENSIONS.includes(fileInfo.extension) && 
          !fileInfo.name.endsWith('.config.js') && 
          !fileInfo.name.endsWith('.config.ts')) {
        continue;
      }

      // Check various import patterns
      const patterns = [
        new RegExp(`from\\s+['"]\\.\\.?/.*${fileName}['"]`, 'g'),
        new RegExp(`from\\s+['"]@/${normalizedDirName.replace(/^src\//, '')}/${fileName}['"]`, 'g'),
        new RegExp(`require\\s*\\(\\s*['"]\\.\\.?/.*${fileName}['"]`, 'g'),
      ];

      for (const pattern of patterns) {
        if (pattern.test(fileInfo.content)) {
          importPaths.push(filePath);
          break;
        }
      }
    }

    return importPaths;
  }

  /**
   * Check if src files are usable/functional
   */
  checkFileUsability(usages: FileUsage[]): FileUsability[] {
    console.log('🔧 Checking file usability...');
    const usabilityResults: FileUsability[] = [];

    for (const srcFile of this.srcFiles) {
      const usage = usages.find(u => u.file.relativePath === srcFile.relativePath);
      const usability = this.analyzeUsability(srcFile, usage);
      usabilityResults.push(usability);
    }

    const usableCount = usabilityResults.filter(u => u.isUsable).length;
    console.log(`✓ ${usableCount} of ${usabilityResults.length} src files are usable`);
    return usabilityResults;
  }

  private analyzeUsability(file: FileInfo, usage?: FileUsage): FileUsability {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let isUsable = true;
    let hasSyntaxErrors = false;
    let hasExports = false;
    let hasImports = false;
    let purpose: FileUsability['purpose'] = 'unknown';

    if (!file.content) {
      return {
        file,
        isUsable: false,
        hasSyntaxErrors: false,
        hasExports: false,
        hasImports: false,
        purpose: 'unknown',
        issues: ['File has no readable content'],
        suggestions: ['Check if file is binary or has encoding issues'],
      };
    }

    // Check for exports
    hasExports = /\bexport\b/.test(file.content);
    if (!hasExports && file.extension !== '.css' && file.extension !== '.json') {
      issues.push('File has no exports');
      suggestions.push('Add exports if this file should be imported elsewhere');
    }

    // Check for imports
    hasImports = /\bimport\b/.test(file.content) || /\brequire\b/.test(file.content);

    // Determine purpose based on file location and content
    purpose = this.determinePurpose(file);

    // Check for syntax errors (basic checks)
    if (this.checkSyntax && (file.extension === '.ts' || file.extension === '.tsx')) {
      hasSyntaxErrors = this.checkTypeScriptSyntax(file);
      if (hasSyntaxErrors) {
        isUsable = false;
        issues.push('Potential TypeScript syntax errors');
        suggestions.push('Run tsc --noEmit to check for syntax errors');
      }
    }

    // Check for common issues
    if (file.content.includes('TODO') || file.content.includes('FIXME')) {
      issues.push('Contains TODO/FIXME markers');
      suggestions.push('Complete or remove TODO/FIXME items');
    }

    if (file.content.includes('@ts-ignore') || file.content.includes('@ts-nocheck')) {
      issues.push('Contains TypeScript ignore directives');
      suggestions.push('Consider fixing type issues instead of ignoring them');
    }

    // Check if file is used
    if (!usage?.isUsed) {
      if (hasExports && purpose !== 'unknown') {
        suggestions.push('File appears functional but is not used - consider integrating it');
      }
    }

    return {
      file,
      isUsable,
      hasSyntaxErrors,
      hasExports,
      hasImports,
      purpose,
      issues,
      suggestions,
    };
  }

  private determinePurpose(file: FileInfo): FileUsability['purpose'] {
    const dir = file.directory.toLowerCase();
    const name = file.name.toLowerCase();

    if (dir.includes('component') || name.includes('component')) {
      return 'component';
    }
    if (dir.includes('service') || name.includes('service')) {
      return 'service';
    }
    if (dir.includes('hook') || name.startsWith('use')) {
      return 'hook';
    }
    if (dir.includes('store') || name.includes('store')) {
      return 'store';
    }
    if (dir.includes('type') || name.includes('type') || name.includes('interface') || name.includes('enum')) {
      return 'type';
    }
    if (dir.includes('util') || dir.includes('utils') || name.includes('util')) {
      return 'utility';
    }
    if (name.includes('config') || name.includes('config')) {
      return 'config';
    }

    // Analyze content
    if (file.content.includes('export const') || file.content.includes('export function')) {
      if (file.content.includes('React') || file.content.includes('JSX')) {
        return 'component';
      }
      if (file.content.includes('useState') || file.content.includes('useEffect')) {
        return 'hook';
      }
      return 'utility';
    }

    return 'unknown';
  }

  private checkTypeScriptSyntax(file: FileInfo): boolean {
    if (!this.checkSyntax) return false;

    try {
      // Try to compile the file
      execSync(`tsc --noEmit "${file.path}"`, {
        stdio: 'ignore',
        timeout: 5000,
      });
      return false;
    } catch {
      // If compilation fails, might have syntax errors
      // But this is not definitive - file might have dependencies
      return true;
    }
  }

  /**
   * Generate recommendations for each file
   */
  generateRecommendations(
    equivalents: EquivalentFile[],
    usages: FileUsage[],
    usabilityResults: FileUsability[]
  ): SrcFileAnalysis[] {
    console.log('💡 Generating recommendations...');
    const analyses: SrcFileAnalysis[] = [];

    for (const srcFile of this.srcFiles) {
      const equivalent = equivalents.find(e => e.srcFile.relativePath === srcFile.relativePath);
      const usage = usages.find(u => u.file.relativePath === srcFile.relativePath);
      const usability = usabilityResults.find(u => u.file.relativePath === srcFile.relativePath);

      if (!usage || !usability) continue;

      const recommendation = this.generateRecommendation(equivalent, usage, usability);
      
      analyses.push({
        file: srcFile,
        equivalent,
        usage,
        usability,
        recommendation,
      });
    }

    console.log(`✓ Generated recommendations for ${analyses.length} files`);
    return analyses;
  }

  private generateRecommendation(
    equivalent: EquivalentFile | undefined,
    usage: FileUsage,
    usability: FileUsability
  ): SrcFileAnalysis['recommendation'] {
    // If file has equivalent and is identical
    if (equivalent?.rootFile && equivalent.similarity === 'identical') {
      if (!usage.isUsed && equivalent.rootFile) {
        return {
          action: 'remove',
          reason: 'File is identical to root version and not used',
          priority: 'high',
        };
      }
      return {
        action: 'consolidate',
        reason: 'File is identical to root version - consider consolidating',
        priority: 'medium',
      };
    }

    // If file is not used
    if (!usage.isUsed) {
      if (!usability.isUsable) {
        return {
          action: 'remove',
          reason: 'File is not used and has usability issues',
          priority: 'high',
        };
      }
      if (usability.hasExports && usability.purpose !== 'unknown') {
        return {
          action: 'integrate',
          reason: `File appears functional (${usability.purpose}) but is not used - consider integrating`,
          priority: 'medium',
        };
      }
      return {
        action: 'review',
        reason: 'File is not used - review if it should be removed or integrated',
        priority: 'low',
      };
    }

    // If file is used but has issues
    if (usage.isUsed && !usability.isUsable) {
      return {
        action: 'review',
        reason: 'File is used but has usability issues - needs attention',
        priority: 'high',
      };
    }

    // If file has equivalent but is different
    if (equivalent?.rootFile && equivalent.similarity !== 'identical') {
      return {
        action: 'consolidate',
        reason: 'File has equivalent in root with differences - consider consolidating',
        priority: 'medium',
      };
    }

    // File is used and usable
    return {
      action: 'keep',
      reason: 'File is used and functional',
      priority: 'low',
    };
  }

  /**
   * Run complete analysis
   */
  analyze(): AnalysisReport {
    this.scanFiles();
    this.trackReferences();

    const equivalents = this.findEquivalentFiles();
    const usages = this.checkFileUsage();
    const usabilityResults = this.checkFileUsability(usages);
    const analyses = this.generateRecommendations(equivalents, usages, usabilityResults);

    // Organize recommendations
    const recommendations = {
      high: analyses.filter(a => a.recommendation.priority === 'high'),
      medium: analyses.filter(a => a.recommendation.priority === 'medium'),
      low: analyses.filter(a => a.recommendation.priority === 'low'),
    };

    // Calculate summary
    const summary = {
      totalSrcFiles: this.srcFiles.length,
      filesWithEquivalents: equivalents.filter(e => e.rootFile).length,
      unusedFiles: usages.filter(u => !u.isUsed).length,
      unusableFiles: usabilityResults.filter(u => !u.isUsable).length,
      filesToIntegrate: analyses.filter(a => a.recommendation.action === 'integrate').length,
      filesToRemove: analyses.filter(a => a.recommendation.action === 'remove').length,
      filesToConsolidate: analyses.filter(a => a.recommendation.action === 'consolidate').length,
    };

    // Get usable but unused files
    const usableButUnused = analyses
      .filter(a => !a.usage.isUsed && a.usability.isUsable && a.usability.hasExports)
      .map(a => ({
        file: a.file,
        usability: a.usability,
        usage: a.usage,
      }));

    return {
      timestamp: new Date(),
      summary,
      filesWithEquivalents: equivalents.filter(e => e.rootFile),
      unusedFiles: usages.filter(u => !u.isUsed),
      usableButUnusedFiles: usableButUnused,
      recommendations,
      detailedAnalysis: analyses,
    };
  }
}

/**
 * Generate comprehensive markdown report
 */
function generateReport(report: AnalysisReport, outputPath?: string): string {
  const lines: string[] = [];

  lines.push('# Source Directory Analysis Report\n');
  lines.push(`**Generated:** ${report.timestamp.toISOString()}\n`);
  lines.push('---\n\n');
  
  // Important Note
  lines.push('## ⚠️ Important Note\n\n');
  lines.push('**This analysis focuses on CODE FILES ONLY.**\n\n');
  lines.push('Documentation files (`.md`, `.README`, `.txt`, etc.) are **EXCLUDED** from:\n');
  lines.push('- Reference tracking\n');
  lines.push('- Usage analysis\n');
  lines.push('- Import path detection\n\n');
  lines.push('Only actual source code files (`.ts`, `.tsx`, `.js`, `.jsx`, `.css`, etc.) are analyzed for usage and references.\n\n');
  lines.push('---\n\n');

  // Executive Summary
  lines.push('## 📊 Executive Summary\n\n');
  lines.push(`- **Total src Files:** ${report.summary.totalSrcFiles}`);
  lines.push(`- **Files with Equivalents in Root:** ${report.summary.filesWithEquivalents}`);
  lines.push(`- **Unused Files:** ${report.summary.unusedFiles}`);
  lines.push(`- **Unusable Files:** ${report.summary.unusableFiles}`);
  lines.push(`- **Files to Integrate:** ${report.summary.filesToIntegrate}`);
  lines.push(`- **Files to Remove:** ${report.summary.filesToRemove}`);
  lines.push(`- **Files to Consolidate:** ${report.summary.filesToConsolidate}\n\n`);

  // High Priority Recommendations
  if (report.recommendations.high.length > 0) {
    lines.push('## 🔴 High Priority Recommendations\n\n');
    for (const analysis of report.recommendations.high) {
      lines.push(`### ${analysis.file.name}\n\n`);
      lines.push(`- **Path:** \`${analysis.file.relativePath}\``);
      lines.push(`- **Action:** ${analysis.recommendation.action.toUpperCase()}`);
      lines.push(`- **Reason:** ${analysis.recommendation.reason}\n`);
      
      if (analysis.equivalent?.rootFile) {
        lines.push(`- **Equivalent:** \`${analysis.equivalent.rootFile.relativePath}\` (${analysis.equivalent.similarity})\n`);
      }
      
      lines.push(`- **Used:** ${analysis.usage.isUsed ? '✅ Yes' : '❌ No'} (${analysis.usage.referenceCount} references)`);
      lines.push(`- **Usable:** ${analysis.usability.isUsable ? '✅ Yes' : '❌ No'}`);
      lines.push(`- **Purpose:** ${analysis.usability.purpose}\n`);
      
      if (analysis.usability.issues.length > 0) {
        lines.push('**Issues:**\n');
        for (const issue of analysis.usability.issues) {
          lines.push(`- ${issue}\n`);
        }
        lines.push('\n');
      }
      
      lines.push('---\n\n');
    }
  }

  // Medium Priority Recommendations
  if (report.recommendations.medium.length > 0) {
    lines.push('## 🟡 Medium Priority Recommendations\n\n');
    for (const analysis of report.recommendations.medium) {
      lines.push(`### ${analysis.file.name}\n\n`);
      lines.push(`- **Path:** \`${analysis.file.relativePath}\``);
      lines.push(`- **Action:** ${analysis.recommendation.action.toUpperCase()}`);
      lines.push(`- **Reason:** ${analysis.recommendation.reason}\n`);
      lines.push(`- **Used:** ${analysis.usage.isUsed ? '✅ Yes' : '❌ No'}`);
      lines.push(`- **Usable:** ${analysis.usability.isUsable ? '✅ Yes' : '❌ No'}\n`);
      lines.push('---\n\n');
    }
  }

  // Files with Equivalents
  if (report.filesWithEquivalents.length > 0) {
    lines.push('## 🔄 Files with Equivalents in Root Directory\n\n');
    lines.push('These files in src/ have corresponding files in the root directory:\n\n');
    
    for (const equiv of report.filesWithEquivalents) {
      lines.push(`### ${equiv.srcFile.name}\n\n`);
      lines.push(`- **Src:** \`${equiv.srcFile.relativePath}\` `);
      lines.push(`(${(equiv.srcFile.size / 1024).toFixed(2)} KB, ${equiv.srcFile.lines} lines)\n`);
      lines.push(`- **Root:** \`${equiv.rootFile!.relativePath}\` `);
      lines.push(`(${(equiv.rootFile!.size / 1024).toFixed(2)} KB, ${equiv.rootFile!.lines} lines)\n`);
      lines.push(`- **Similarity:** ${equiv.similarity} (${(equiv.similarityScore * 100).toFixed(1)}%)\n`);
      
      if (equiv.differences) {
        lines.push(`- **Size Difference:** ${equiv.differences.sizeDiff > 0 ? '+' : ''}${(equiv.differences.sizeDiff / 1024).toFixed(2)} KB\n`);
        lines.push(`- **Line Difference:** ${equiv.differences.lineDiff > 0 ? '+' : ''}${equiv.differences.lineDiff} lines\n`);
        lines.push(`- **Date Difference:** ${equiv.differences.dateDiff > 0 ? '+' : ''}${equiv.differences.dateDiff} days\n`);
      }
      
      lines.push('\n');
    }
  }

  // Unused Files
  if (report.unusedFiles.length > 0) {
    lines.push('## ⚠️ Unused Files\n\n');
    lines.push('These files in src/ are not referenced anywhere in the project:\n\n');
    
    for (const unused of report.unusedFiles) {
      lines.push(`- **\`${unused.file.relativePath}\`** `);
      lines.push(`(${(unused.file.size / 1024).toFixed(2)} KB, ${unused.file.lines} lines)\n`);
    }
    lines.push('\n');
  }

  // Usable But Unused Files
  if (report.usableButUnusedFiles.length > 0) {
    lines.push('## 💡 Files That Can Be Integrated\n\n');
    lines.push('These files appear functional and could be integrated into the project:\n\n');
    
    for (const item of report.usableButUnusedFiles) {
      lines.push(`### ${item.file.name}\n\n`);
      lines.push(`- **Path:** \`${item.file.relativePath}\``);
      lines.push(`- **Purpose:** ${item.usability.purpose}`);
      lines.push(`- **Has Exports:** ${item.usability.hasExports ? '✅ Yes' : '❌ No'}`);
      lines.push(`- **Has Imports:** ${item.usability.hasImports ? '✅ Yes' : '❌ No'}\n`);
      
      if (item.usability.suggestions.length > 0) {
        lines.push('**Suggestions:**\n');
        for (const suggestion of item.usability.suggestions) {
          lines.push(`- ${suggestion}\n`);
        }
        lines.push('\n');
      }
      
      lines.push('---\n\n');
    }
  }

  // Detailed Analysis
  lines.push('## 📋 Detailed Analysis\n\n');
  lines.push('Complete analysis of all src files:\n\n');
  
  for (const analysis of report.detailedAnalysis) {
    lines.push(`### ${analysis.file.name}\n\n`);
    lines.push(`- **Path:** \`${analysis.file.relativePath}\``);
    lines.push(`- **Size:** ${(analysis.file.size / 1024).toFixed(2)} KB`);
    lines.push(`- **Lines:** ${analysis.file.lines}`);
    lines.push(`- **Last Modified:** ${analysis.file.lastModified.toISOString().split('T')[0]}\n`);
    lines.push(`- **Used:** ${analysis.usage.isUsed ? '✅ Yes' : '❌ No'}`);
    if (analysis.usage.isUsed) {
      lines.push(`  - References: ${analysis.usage.referenceCount}`);
      if (analysis.usage.references.length > 0) {
        lines.push(`  - Referenced by: ${analysis.usage.references.slice(0, 3).join(', ')}${analysis.usage.references.length > 3 ? '...' : ''}\n`);
      }
    }
    lines.push(`- **Usable:** ${analysis.usability.isUsable ? '✅ Yes' : '❌ No'}`);
    lines.push(`- **Purpose:** ${analysis.usability.purpose}`);
    lines.push(`- **Has Exports:** ${analysis.usability.hasExports ? '✅ Yes' : '❌ No'}`);
    lines.push(`- **Has Imports:** ${analysis.usability.hasImports ? '✅ Yes' : '❌ No'}\n`);
    
    if (analysis.equivalent?.rootFile) {
      lines.push(`- **Equivalent in Root:** \`${analysis.equivalent.rootFile.relativePath}\` (${analysis.equivalent.similarity})\n`);
    }
    
    lines.push(`- **Recommendation:** ${analysis.recommendation.action.toUpperCase()} (${analysis.recommendation.priority} priority)`);
    lines.push(`  - ${analysis.recommendation.reason}\n`);
    
    if (analysis.usability.issues.length > 0) {
      lines.push('**Issues:**\n');
      for (const issue of analysis.usability.issues) {
        lines.push(`- ${issue}\n`);
      }
    }
    
    if (analysis.usability.suggestions.length > 0) {
      lines.push('**Suggestions:**\n');
      for (const suggestion of analysis.usability.suggestions) {
        lines.push(`- ${suggestion}\n`);
      }
    }
    
    lines.push('\n---\n\n');
  }

  // Action Items
  lines.push('## ✅ Action Items\n\n');
  
  const removeFiles = report.detailedAnalysis.filter(a => a.recommendation.action === 'remove');
  const integrateFiles = report.detailedAnalysis.filter(a => a.recommendation.action === 'integrate');
  const consolidateFiles = report.detailedAnalysis.filter(a => a.recommendation.action === 'consolidate');

  if (removeFiles.length > 0) {
    lines.push('### Files to Remove\n\n');
    for (const analysis of removeFiles) {
      lines.push(`- \`${analysis.file.relativePath}\` - ${analysis.recommendation.reason}\n`);
    }
    lines.push('\n');
  }

  if (integrateFiles.length > 0) {
    lines.push('### Files to Integrate\n\n');
    for (const analysis of integrateFiles) {
      lines.push(`- \`${analysis.file.relativePath}\` (${analysis.usability.purpose}) - ${analysis.recommendation.reason}\n`);
    }
    lines.push('\n');
  }

  if (consolidateFiles.length > 0) {
    lines.push('### Files to Consolidate\n\n');
    for (const analysis of consolidateFiles) {
      lines.push(`- \`${analysis.file.relativePath}\``);
      if (analysis.equivalent?.rootFile) {
        lines.push(` with \`${analysis.equivalent.rootFile.relativePath}\``);
      }
      lines.push(` - ${analysis.recommendation.reason}\n`);
    }
    lines.push('\n');
  }

  lines.push('---\n\n');
  lines.push('*Report generated by src-directory-analyzer.ts*\n');

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
  const checkSyntax = args.includes('--check-syntax');
  const reportPath = args.find(arg => arg.startsWith('--report='))?.split('=')[1] || 'src-directory-analysis-report.md';

  console.log('🚀 Source Directory Analysis Script\n');
  console.log('='.repeat(60) + '\n');

  const analyzer = new SrcDirectoryAnalyzer(verbose, checkSyntax);
  const report = analyzer.analyze();

  // Generate and save report
  const reportText = generateReport(report, reportPath);
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Analysis Complete!\n');
  console.log(`Summary:`);
  console.log(`  - Total src files: ${report.summary.totalSrcFiles}`);
  console.log(`  - Files with equivalents: ${report.summary.filesWithEquivalents}`);
  console.log(`  - Unused files: ${report.summary.unusedFiles}`);
  console.log(`  - Unusable files: ${report.summary.unusableFiles}`);
  console.log(`  - Files to integrate: ${report.summary.filesToIntegrate}`);
  console.log(`  - Files to remove: ${report.summary.filesToRemove}`);
  console.log(`  - Files to consolidate: ${report.summary.filesToConsolidate}`);
  console.log(`\n📄 Full report saved to: ${reportPath}\n`);
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('src-directory-analyzer')) {
  main();
}

export { SrcDirectoryAnalyzer, generateReport, AnalysisReport };
