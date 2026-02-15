/**
 * Context Abstraction Service
 * Provides structural summaries instead of raw source code
 * Integrates with existing code intelligence services to generate safe context
 */

export interface CodeContextAbstraction {
  projectSummary: {
    totalFiles: number;
    languages: string[];
    mainEntryPoints: string[];
  };
  changedFiles: Array<{
    path: string;
    changeType: 'created' | 'modified' | 'deleted';
    impactScore: number;
  }>;
  dependencyImpact: {
    affectedFiles: string[];
    circularDependencies: string[][];
    externalDeps: Record<string, string[]>;
  };
  riskScore: number; // 0-1
  history: string[]; // Change history summaries
}

/**
 * Generate context abstraction from project state
 * This provides structural summaries without exposing raw code
 */
export async function generateContextAbstraction(options: {
  files?: Record<string, { name: string; content: string; language: string }>;
  changedFiles?: string[];
  projectRoot?: string;
}): Promise<CodeContextAbstraction> {
  const { files = {}, changedFiles = [], projectRoot } = options;

  try {
    // Extract project summary from files
    const projectSummary = extractProjectSummary(files);

    // Analyze changed files
    const changedFilesAnalysis = analyzeChangedFiles(files, changedFiles);

    // Extract dependency impact (if code intelligence services are available)
    const dependencyImpact = await extractDependencyImpact(files, changedFiles, projectRoot);

    // Calculate risk score
    const riskScore = calculateRiskScore(changedFilesAnalysis, dependencyImpact);

    // Generate history summaries
    const history = generateHistorySummaries(changedFiles);

    return {
      projectSummary,
      changedFiles: changedFilesAnalysis,
      dependencyImpact,
      riskScore,
      history,
    };
  } catch (error) {
    // Graceful degradation: return minimal context if analysis fails
    console.warn('[ContextAbstraction] Failed to generate full context:', error);
    return {
      projectSummary: {
        totalFiles: Object.keys(files).length,
        languages: extractLanguages(files),
        mainEntryPoints: [],
      },
      changedFiles: changedFiles.map(path => ({
        path,
        changeType: 'modified' as const,
        impactScore: 0.5,
      })),
      dependencyImpact: {
        affectedFiles: [],
        circularDependencies: [],
        externalDeps: {},
      },
      riskScore: 0.5,
      history: [],
    };
  }
}

/**
 * Extract project summary from files
 */
function extractProjectSummary(files: Record<string, { name: string; content: string; language: string }>): {
  totalFiles: number;
  languages: string[];
  mainEntryPoints: string[];
} {
  const languages = extractLanguages(files);
  const mainEntryPoints = extractMainEntryPoints(files);

  return {
    totalFiles: Object.keys(files).length,
    languages,
    mainEntryPoints,
  };
}

/**
 * Extract languages from files
 */
function extractLanguages(files: Record<string, { name: string; content: string; language: string }>): string[] {
  const languageSet = new Set<string>();
  Object.values(files).forEach(file => {
    if (file.language) {
      languageSet.add(file.language);
    }
  });
  return Array.from(languageSet);
}

/**
 * Extract main entry points (package.json main, index files, etc.)
 */
function extractMainEntryPoints(files: Record<string, { name: string; content: string; language: string }>): string[] {
  const entryPoints: string[] = [];

  // Look for package.json
  for (const [path, file] of Object.entries(files)) {
    if (file.name === 'package.json') {
      try {
        const pkg = JSON.parse(file.content);
        if (pkg.main) {
          entryPoints.push(pkg.main);
        }
        if (pkg.module) {
          entryPoints.push(pkg.module);
        }
      } catch {
        // Invalid JSON, skip
      }
    }

    // Look for common entry point patterns
    if (file.name.match(/^(index|main|app|server)\.(ts|tsx|js|jsx)$/i)) {
      entryPoints.push(path);
    }
  }

  return entryPoints.slice(0, 10); // Limit to top 10
}

/**
 * Analyze changed files
 */
function analyzeChangedFiles(
  files: Record<string, { name: string; content: string; language: string }>,
  changedFiles: string[]
): Array<{ path: string; changeType: 'created' | 'modified' | 'deleted'; impactScore: number }> {
  return changedFiles.map(path => {
    const file = files[path];
    const changeType: 'created' | 'modified' | 'deleted' = file ? 'modified' : 'deleted';

    // Calculate impact score based on file type and location
    let impactScore = 0.5; // Default

    if (file) {
      // Higher impact for core files
      if (path.includes('index') || path.includes('main') || path.includes('app')) {
        impactScore = 0.8;
      }

      // Higher impact for configuration files
      if (path.includes('config') || path.includes('package.json') || path.includes('tsconfig')) {
        impactScore = 0.9;
      }

      // Lower impact for tests
      if (path.includes('test') || path.includes('spec')) {
        impactScore = 0.3;
      }

      // Lower impact for documentation
      if (path.includes('docs') || path.includes('README')) {
        impactScore = 0.2;
      }
    } else {
      // Deleted files have medium impact
      impactScore = 0.6;
    }

    return {
      path,
      changeType,
      impactScore,
    };
  });
}

/**
 * Extract dependency impact using code intelligence services
 * Gracefully degrades if services are not available
 */
async function extractDependencyImpact(
  files: Record<string, { name: string; content: string; language: string }>,
  changedFiles: string[],
  projectRoot?: string
): Promise<{
  affectedFiles: string[];
  circularDependencies: string[][];
  externalDeps: Record<string, string[]>;
}> {
  try {
    // Try to use code intelligence services if available
    // This is optional and will gracefully degrade if not available
    const affectedFiles = new Set<string>(changedFiles);

    // Simple dependency analysis from file imports
    const externalDeps: Record<string, string[]> = {};
    const circularDependencies: string[][] = [];

    // Extract imports from changed files
    for (const filePath of changedFiles) {
      const file = files[filePath];
      if (!file) continue;

      const imports = extractImports(file.content);
      externalDeps[filePath] = imports.external;

      // Find files that import this file
      for (const [otherPath, otherFile] of Object.entries(files)) {
        if (otherPath === filePath) continue;
        if (otherFile.content.includes(filePath) || otherFile.content.includes(file.name)) {
          affectedFiles.add(otherPath);
        }
      }
    }

    return {
      affectedFiles: Array.from(affectedFiles),
      circularDependencies,
      externalDeps,
    };
  } catch (error) {
    // Graceful degradation
    console.warn('[ContextAbstraction] Dependency analysis failed:', error);
    return {
      affectedFiles: changedFiles,
      circularDependencies: [],
      externalDeps: {},
    };
  }
}

/**
 * Extract imports from file content
 */
function extractImports(content: string): { external: string[]; internal: string[] } {
  const external: string[] = [];
  const internal: string[] = [];

  // Match ES6 imports
  const es6Imports = content.matchAll(/import\s+(?:{[^}]+}|[^;]+)\s+from\s+['"]([^'"]+)['"]/g);
  for (const match of es6Imports) {
    const source = match[1];
    if (source.startsWith('.')) {
      internal.push(source);
    } else {
      external.push(source);
    }
  }

  // Match CommonJS requires
  const requireImports = content.matchAll(/require\s*\(\s*['"]([^'"]+)['"]\s*\)/g);
  for (const match of requireImports) {
    const source = match[1];
    if (source.startsWith('.')) {
      internal.push(source);
    } else {
      external.push(source);
    }
  }

  return { external: [...new Set(external)], internal: [...new Set(internal)] };
}

/**
 * Calculate risk score based on changes
 */
function calculateRiskScore(
  changedFiles: Array<{ path: string; changeType: 'created' | 'modified' | 'deleted'; impactScore: number }>,
  dependencyImpact: { affectedFiles: string[]; circularDependencies: string[][]; externalDeps: Record<string, string[]> }
): number {
  // Base risk from changed files
  const avgImpact = changedFiles.reduce((sum, f) => sum + f.impactScore, 0) / Math.max(changedFiles.length, 1);

  // Increase risk if many files are affected
  const affectedRatio = dependencyImpact.affectedFiles.length / Math.max(changedFiles.length, 1);
  const affectedMultiplier = Math.min(affectedRatio, 2.0); // Cap at 2x

  // Increase risk if circular dependencies exist
  const circularMultiplier = dependencyImpact.circularDependencies.length > 0 ? 1.2 : 1.0;

  // Calculate final risk score (0-1)
  const riskScore = Math.min(avgImpact * affectedMultiplier * circularMultiplier, 1.0);

  return Math.round(riskScore * 100) / 100; // Round to 2 decimal places
}

/**
 * Generate history summaries
 */
function generateHistorySummaries(changedFiles: string[]): string[] {
  if (changedFiles.length === 0) {
    return [];
  }

  const summaries: string[] = [];

  // Group by file type
  const byType: Record<string, string[]> = {};
  changedFiles.forEach(path => {
    const ext = path.split('.').pop() || 'other';
    if (!byType[ext]) {
      byType[ext] = [];
    }
    byType[ext].push(path);
  });

  // Generate summaries
  Object.entries(byType).forEach(([type, files]) => {
    if (files.length === 1) {
      summaries.push(`Modified ${type} file: ${files[0]}`);
    } else {
      summaries.push(`Modified ${files.length} ${type} files`);
    }
  });

  return summaries.slice(0, 10); // Limit to 10 summaries
}

/**
 * Format context abstraction as text for injection into prompts
 */
export function formatContextAbstraction(context: CodeContextAbstraction): string {
  const parts: string[] = [];

  parts.push('## Project Summary');
  parts.push(`- Total files: ${context.projectSummary.totalFiles}`);
  parts.push(`- Languages: ${context.projectSummary.languages.join(', ') || 'N/A'}`);
  if (context.projectSummary.mainEntryPoints.length > 0) {
    parts.push(`- Main entry points: ${context.projectSummary.mainEntryPoints.join(', ')}`);
  }

  if (context.changedFiles.length > 0) {
    parts.push('\n## Recent Changes');
    context.changedFiles.slice(0, 10).forEach(file => {
      parts.push(`- ${file.changeType.toUpperCase()}: ${file.path} (impact: ${(file.impactScore * 100).toFixed(0)}%)`);
    });
  }

  if (context.dependencyImpact.affectedFiles.length > 0) {
    parts.push('\n## Dependency Impact');
    parts.push(`- Affected files: ${context.dependencyImpact.affectedFiles.length}`);
    if (context.dependencyImpact.circularDependencies.length > 0) {
      parts.push(`- Circular dependencies detected: ${context.dependencyImpact.circularDependencies.length}`);
    }
  }

  parts.push(`\n## Risk Assessment`);
  parts.push(`- Risk score: ${(context.riskScore * 100).toFixed(0)}%`);

  if (context.history.length > 0) {
    parts.push('\n## Change History');
    context.history.forEach(summary => {
      parts.push(`- ${summary}`);
    });
  }

  return parts.join('\n');
}
