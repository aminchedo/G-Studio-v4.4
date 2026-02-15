/**
 * useCodeIntelligence - Code analysis and intelligence hook
 *
 * Provides code analysis, metrics, dependency mapping, and insights
 * Supports AST analysis, complexity calculation, and breaking change detection
 */

import { useState, useCallback, useRef, useMemo } from "react";

// Types
export interface CodeMetrics {
  linesOfCode: number;
  linesOfComments: number;
  blankLines: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  technicalDebt: number;
  codeSmells: CodeSmell[];
  coverage?: number;
}

export interface CodeSmell {
  type: string;
  severity: "low" | "medium" | "high";
  message: string;
  line?: number;
  column?: number;
  suggestion?: string;
}

export interface CodeIssue {
  id: string;
  type: "error" | "warning" | "info" | "hint";
  message: string;
  severity: "low" | "medium" | "high" | "critical";
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  source?: string;
  fix?: {
    description: string;
    changes: Array<{ start: number; end: number; replacement: string }>;
  };
}

export interface AnalysisResult {
  filePath: string;
  language: string;
  metrics: CodeMetrics;
  issues: CodeIssue[];
  suggestions: string[];
  dependencies: string[];
  exports: string[];
  imports: ImportInfo[];
  functions: FunctionInfo[];
  classes: ClassInfo[];
  analyzedAt: number;
}

export interface ImportInfo {
  source: string;
  specifiers: string[];
  isDefault: boolean;
  isDynamic: boolean;
  line: number;
}

export interface FunctionInfo {
  name: string;
  line: number;
  endLine: number;
  parameters: string[];
  returnType?: string;
  complexity: number;
  isAsync: boolean;
  isExported: boolean;
}

export interface ClassInfo {
  name: string;
  line: number;
  endLine: number;
  methods: FunctionInfo[];
  properties: string[];
  extends?: string;
  implements?: string[];
  isExported: boolean;
}

export interface DependencyNode {
  id: string;
  name: string;
  type: "file" | "module" | "package";
  path: string;
}

export interface DependencyEdge {
  source: string;
  target: string;
  type: "import" | "export" | "reference";
}

export interface DependencyGraph {
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export interface ChangeAnalysis {
  additions: number;
  deletions: number;
  modifications: number;
  breakingChanges: BreakingChange[];
  impactedFiles: string[];
  riskLevel: "low" | "medium" | "high";
}

export interface BreakingChange {
  type: "removed" | "renamed" | "signature-changed" | "type-changed";
  location: string;
  description: string;
  migration?: string;
}

export interface UseCodeIntelligenceReturn {
  // State
  analysisResults: Map<string, AnalysisResult>;
  dependencies: DependencyGraph;
  projectMetrics: CodeMetrics | null;
  isAnalyzing: boolean;
  error: string | null;

  // Analysis Actions
  analyzeFile: (
    filePath: string,
    content: string,
    language?: string,
  ) => Promise<AnalysisResult>;
  analyzeProject: (files: Record<string, string>) => Promise<void>;
  trackChanges: (
    beforeCode: string,
    afterCode: string,
    filePath?: string,
  ) => Promise<ChangeAnalysis>;
  detectBreakingChanges: (
    oldVersion: string,
    newVersion: string,
  ) => Promise<BreakingChange[]>;

  // Query Actions
  getFileAnalysis: (filePath: string) => AnalysisResult | undefined;
  getFileDependencies: (filePath: string) => string[];
  getFileDependents: (filePath: string) => string[];
  findReferences: (
    symbol: string,
    filePath?: string,
  ) => Array<{ file: string; line: number }>;

  // Utilities
  calculateComplexity: (code: string) => number;
  suggestRefactoring: (filePath: string) => string[];
  clearAnalysis: () => void;
}

// Language detection
const detectLanguage = (filePath: string): string => {
  const ext = filePath.split(".").pop()?.toLowerCase() || "";
  const langMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    java: "java",
    go: "go",
    rs: "rust",
    rb: "ruby",
    php: "php",
    cs: "csharp",
    cpp: "cpp",
    c: "c",
  };
  return langMap[ext] || "unknown";
};

// Calculate cyclomatic complexity (simplified)
const calculateCyclomaticComplexity = (code: string): number => {
  const patterns = [
    /\bif\b/g,
    /\belse\s+if\b/g,
    /\bfor\b/g,
    /\bwhile\b/g,
    /\bcase\b/g,
    /\bcatch\b/g,
    /\b\?\s*:/g, // ternary
    /\&\&/g,
    /\|\|/g,
  ];

  let complexity = 1; // Base complexity
  for (const pattern of patterns) {
    const matches = code.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  }

  return complexity;
};

// Calculate maintainability index (simplified)
const calculateMaintainabilityIndex = (
  linesOfCode: number,
  complexity: number,
  commentRatio: number,
): number => {
  // Simplified formula based on Microsoft's maintainability index
  const volume = linesOfCode * Math.log2(linesOfCode + 1);
  const mi = Math.max(
    0,
    ((171 -
      5.2 * Math.log(volume) -
      0.23 * complexity +
      50 * Math.sin(Math.sqrt(2.4 * commentRatio))) *
      100) /
      171,
  );
  return Math.round(mi);
};

// Detect code smells
const detectCodeSmells = (code: string, language: string): CodeSmell[] => {
  const smells: CodeSmell[] = [];
  const lines = code.split("\n");

  // Long method detection
  lines.forEach((line, index) => {
    // Very long lines
    if (line.length > 120) {
      smells.push({
        type: "long-line",
        severity: "low",
        message: `Line exceeds 120 characters (${line.length})`,
        line: index + 1,
        suggestion: "Consider breaking this line into multiple lines",
      });
    }

    // TODO/FIXME comments
    if (/\b(TODO|FIXME|HACK|XXX)\b/i.test(line)) {
      smells.push({
        type: "pending-work",
        severity: "medium",
        message: "Unresolved TODO/FIXME comment",
        line: index + 1,
      });
    }

    // Magic numbers
    if (
      /[^a-zA-Z_][0-9]{2,}[^a-zA-Z_0-9]/.test(line) &&
      !/const|let|var|=/.test(line.split("//")[0])
    ) {
      smells.push({
        type: "magic-number",
        severity: "low",
        message: "Magic number detected",
        line: index + 1,
        suggestion: "Consider extracting to a named constant",
      });
    }

    // Console.log in production code
    if (/console\.(log|debug|info)\(/.test(line)) {
      smells.push({
        type: "console-statement",
        severity: "low",
        message: "Console statement detected",
        line: index + 1,
        suggestion: "Remove console statements or use proper logging",
      });
    }
  });

  // Long file detection
  if (lines.length > 500) {
    smells.push({
      type: "long-file",
      severity: "medium",
      message: `File has ${lines.length} lines, consider splitting`,
      suggestion: "Break this file into smaller, more focused modules",
    });
  }

  return smells;
};

// Parse imports
const parseImports = (code: string, language: string): ImportInfo[] => {
  const imports: ImportInfo[] = [];
  const lines = code.split("\n");

  lines.forEach((line, index) => {
    // ES6 imports
    const esImportMatch = line.match(
      /import\s+(?:(\{[^}]+\})|(\*\s+as\s+\w+)|(\w+))?\s*(?:,\s*(?:(\{[^}]+\})|(\w+)))?\s*from\s*['"]([^'"]+)['"]/,
    );
    if (esImportMatch) {
      const specifiers: string[] = [];
      let isDefault = false;

      if (esImportMatch[1]) {
        // Named imports
        specifiers.push(
          ...esImportMatch[1]
            .replace(/[{}]/g, "")
            .split(",")
            .map((s) => s.trim()),
        );
      }
      if (esImportMatch[2]) {
        // Namespace import
        specifiers.push(esImportMatch[2].replace("* as ", "").trim());
      }
      if (esImportMatch[3]) {
        // Default import
        specifiers.push(esImportMatch[3]);
        isDefault = true;
      }
      if (esImportMatch[4]) {
        specifiers.push(
          ...esImportMatch[4]
            .replace(/[{}]/g, "")
            .split(",")
            .map((s) => s.trim()),
        );
      }
      if (esImportMatch[5]) {
        specifiers.push(esImportMatch[5]);
        isDefault = true;
      }

      imports.push({
        source: esImportMatch[6],
        specifiers,
        isDefault,
        isDynamic: false,
        line: index + 1,
      });
    }

    // Dynamic imports
    const dynamicMatch = line.match(/import\s*\(\s*['"]([^'"]+)['"]\s*\)/);
    if (dynamicMatch) {
      imports.push({
        source: dynamicMatch[1],
        specifiers: [],
        isDefault: false,
        isDynamic: true,
        line: index + 1,
      });
    }

    // CommonJS requires
    const requireMatch = line.match(
      /(?:const|let|var)\s+(?:(\{[^}]+\})|(\w+))\s*=\s*require\s*\(\s*['"]([^'"]+)['"]\s*\)/,
    );
    if (requireMatch) {
      const specifiers: string[] = [];
      if (requireMatch[1]) {
        specifiers.push(
          ...requireMatch[1]
            .replace(/[{}]/g, "")
            .split(",")
            .map((s) => s.trim()),
        );
      }
      if (requireMatch[2]) {
        specifiers.push(requireMatch[2]);
      }

      imports.push({
        source: requireMatch[3],
        specifiers,
        isDefault: !!requireMatch[2],
        isDynamic: false,
        line: index + 1,
      });
    }
  });

  return imports;
};

// Parse functions
const parseFunctions = (code: string, language: string): FunctionInfo[] => {
  const functions: FunctionInfo[] = [];
  const lines = code.split("\n");

  // Simple regex-based function detection
  const functionPatterns = [
    // Arrow functions
    /(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(async\s+)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>/,
    // Regular functions
    /(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)/,
    // Method definitions
    /(?:async\s+)?(\w+)\s*\(([^)]*)\)\s*(?::\s*[^{]+)?\s*\{/,
  ];

  lines.forEach((line, index) => {
    for (const pattern of functionPatterns) {
      const match = line.match(pattern);
      if (match) {
        const name = match[1];
        const isAsync = line.includes("async");
        const isExported = line.includes("export");

        // Find function end (simplified)
        let endLine = index + 1;
        let braceCount = 0;
        for (let i = index; i < lines.length; i++) {
          braceCount += (lines[i].match(/\{/g) || []).length;
          braceCount -= (lines[i].match(/\}/g) || []).length;
          if (braceCount <= 0 && i > index) {
            endLine = i + 1;
            break;
          }
        }

        // Calculate complexity for this function
        const functionCode = lines.slice(index, endLine).join("\n");
        const complexity = calculateCyclomaticComplexity(functionCode);

        functions.push({
          name,
          line: index + 1,
          endLine,
          parameters: [], // Would need proper parsing
          isAsync,
          isExported,
          complexity,
        });
        break;
      }
    }
  });

  return functions;
};

/**
 * useCodeIntelligence hook
 */
export function useCodeIntelligence(
  workspacePath?: string,
): UseCodeIntelligenceReturn {
  // State
  const [analysisResults, setAnalysisResults] = useState<
    Map<string, AnalysisResult>
  >(new Map());
  const [dependencies, setDependencies] = useState<DependencyGraph>({
    nodes: [],
    edges: [],
  });
  const [projectMetrics, setProjectMetrics] = useState<CodeMetrics | null>(
    null,
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Analyze single file
  const analyzeFile = useCallback(
    async (
      filePath: string,
      content: string,
      language?: string,
    ): Promise<AnalysisResult> => {
      setIsAnalyzing(true);
      setError(null);

      try {
        const detectedLanguage = language || detectLanguage(filePath);
        const lines = content.split("\n");
        const codeLines = lines.filter(
          (l) =>
            l.trim() &&
            !l.trim().startsWith("//") &&
            !l.trim().startsWith("/*"),
        );
        const commentLines = lines.filter(
          (l) =>
            l.trim().startsWith("//") ||
            l.trim().startsWith("/*") ||
            l.trim().startsWith("*"),
        );
        const blankLines = lines.filter((l) => !l.trim());

        const complexity = calculateCyclomaticComplexity(content);
        const commentRatio = commentLines.length / Math.max(1, lines.length);
        const maintainabilityIndex = calculateMaintainabilityIndex(
          codeLines.length,
          complexity,
          commentRatio,
        );

        const metrics: CodeMetrics = {
          linesOfCode: codeLines.length,
          linesOfComments: commentLines.length,
          blankLines: blankLines.length,
          cyclomaticComplexity: complexity,
          maintainabilityIndex,
          technicalDebt: Math.max(0, 100 - maintainabilityIndex) * 0.1, // Hours estimate
          codeSmells: detectCodeSmells(content, detectedLanguage),
        };

        const imports = parseImports(content, detectedLanguage);
        const functions = parseFunctions(content, detectedLanguage);

        const result: AnalysisResult = {
          filePath,
          language: detectedLanguage,
          metrics,
          issues: metrics.codeSmells.map((smell, i) => ({
            id: `${filePath}-${i}`,
            type: "warning" as const,
            message: smell.message,
            severity: smell.severity,
            line: smell.line || 1,
            column: 1,
          })),
          suggestions: [],
          dependencies: imports.map((i) => i.source),
          exports: [],
          imports,
          functions,
          classes: [],
          analyzedAt: Date.now(),
        };

        // Add suggestions based on metrics
        if (metrics.cyclomaticComplexity > 10) {
          result.suggestions.push(
            "Consider breaking down complex functions into smaller ones",
          );
        }
        if (metrics.maintainabilityIndex < 50) {
          result.suggestions.push(
            "Code maintainability is low. Consider refactoring",
          );
        }
        if (metrics.codeSmells.length > 5) {
          result.suggestions.push(
            `Address ${metrics.codeSmells.length} code smells detected`,
          );
        }

        setAnalysisResults((prev) => new Map(prev).set(filePath, result));
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Analysis failed";
        setError(errorMessage);
        throw err;
      } finally {
        setIsAnalyzing(false);
      }
    },
    [],
  );

  // Analyze entire project
  const analyzeProject = useCallback(
    async (files: Record<string, string>): Promise<void> => {
      setIsAnalyzing(true);
      setError(null);

      try {
        const results = new Map<string, AnalysisResult>();
        const nodes: DependencyNode[] = [];
        const edges: DependencyEdge[] = [];

        // Analyze each file
        for (const [filePath, content] of Object.entries(files)) {
          const result = await analyzeFile(filePath, content);
          results.set(filePath, result);

          // Add to dependency graph
          nodes.push({
            id: filePath,
            name: filePath.split("/").pop() || filePath,
            type: "file",
            path: filePath,
          });

          // Add dependency edges
          for (const dep of result.dependencies) {
            edges.push({
              source: filePath,
              target: dep,
              type: "import",
            });
          }
        }

        setAnalysisResults(results);
        setDependencies({ nodes, edges });

        // Calculate project-wide metrics
        const allMetrics = Array.from(results.values()).map((r) => r.metrics);
        if (allMetrics.length > 0) {
          const totalLOC = allMetrics.reduce(
            (sum, m) => sum + m.linesOfCode,
            0,
          );
          const avgComplexity =
            allMetrics.reduce((sum, m) => sum + m.cyclomaticComplexity, 0) /
            allMetrics.length;
          const avgMaintainability =
            allMetrics.reduce((sum, m) => sum + m.maintainabilityIndex, 0) /
            allMetrics.length;
          const allSmells = allMetrics.flatMap((m) => m.codeSmells);

          setProjectMetrics({
            linesOfCode: totalLOC,
            linesOfComments: allMetrics.reduce(
              (sum, m) => sum + m.linesOfComments,
              0,
            ),
            blankLines: allMetrics.reduce((sum, m) => sum + m.blankLines, 0),
            cyclomaticComplexity: Math.round(avgComplexity),
            maintainabilityIndex: Math.round(avgMaintainability),
            technicalDebt: allMetrics.reduce(
              (sum, m) => sum + m.technicalDebt,
              0,
            ),
            codeSmells: allSmells,
          });
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Project analysis failed",
        );
      } finally {
        setIsAnalyzing(false);
      }
    },
    [analyzeFile],
  );

  // Track changes between two versions
  const trackChanges = useCallback(
    async (
      beforeCode: string,
      afterCode: string,
      filePath?: string,
    ): Promise<ChangeAnalysis> => {
      const beforeLines = beforeCode.split("\n");
      const afterLines = afterCode.split("\n");

      // Simple line-based diff
      const additions = afterLines.filter(
        (l) => !beforeLines.includes(l),
      ).length;
      const deletions = beforeLines.filter(
        (l) => !afterLines.includes(l),
      ).length;
      const modifications = Math.min(additions, deletions);

      const breakingChanges: BreakingChange[] = [];

      // Detect breaking changes (simplified)
      const beforeExports: string[] =
        beforeCode.match(
          /export\s+(?:const|function|class|interface|type)\s+(\w+)/g,
        ) || [];
      const afterExports: string[] =
        afterCode.match(
          /export\s+(?:const|function|class|interface|type)\s+(\w+)/g,
        ) || [];

      for (const exp of beforeExports) {
        if (!afterExports.includes(exp as string)) {
          const name = exp.match(/(\w+)$/)?.[1];
          breakingChanges.push({
            type: "removed",
            location: filePath || "unknown",
            description: `Exported symbol "${name}" was removed`,
          });
        }
      }

      const riskLevel =
        breakingChanges.length > 0
          ? "high"
          : additions + deletions > 100
            ? "medium"
            : "low";

      return {
        additions,
        deletions,
        modifications,
        breakingChanges,
        impactedFiles: filePath ? [filePath] : [],
        riskLevel,
      };
    },
    [],
  );

  // Detect breaking changes
  const detectBreakingChanges = useCallback(
    async (
      oldVersion: string,
      newVersion: string,
    ): Promise<BreakingChange[]> => {
      const analysis = await trackChanges(oldVersion, newVersion);
      return analysis.breakingChanges;
    },
    [trackChanges],
  );

  // Get file analysis
  const getFileAnalysis = useCallback(
    (filePath: string): AnalysisResult | undefined => {
      return analysisResults.get(filePath);
    },
    [analysisResults],
  );

  // Get file dependencies
  const getFileDependencies = useCallback(
    (filePath: string): string[] => {
      return dependencies.edges
        .filter((e) => e.source === filePath)
        .map((e) => e.target);
    },
    [dependencies],
  );

  // Get file dependents
  const getFileDependents = useCallback(
    (filePath: string): string[] => {
      return dependencies.edges
        .filter((e) => e.target === filePath)
        .map((e) => e.source);
    },
    [dependencies],
  );

  // Find references
  const findReferences = useCallback(
    (
      symbol: string,
      filePath?: string,
    ): Array<{ file: string; line: number }> => {
      const refs: Array<{ file: string; line: number }> = [];
      // This would need actual code parsing in production
      return refs;
    },
    [],
  );

  // Calculate complexity
  const calculateComplexity = useCallback((code: string): number => {
    return calculateCyclomaticComplexity(code);
  }, []);

  // Suggest refactoring
  const suggestRefactoring = useCallback(
    (filePath: string): string[] => {
      const result = analysisResults.get(filePath);
      if (!result) return [];
      return result.suggestions;
    },
    [analysisResults],
  );

  // Clear analysis
  const clearAnalysis = useCallback(() => {
    setAnalysisResults(new Map());
    setDependencies({ nodes: [], edges: [] });
    setProjectMetrics(null);
    setError(null);
  }, []);

  return {
    analysisResults,
    dependencies,
    projectMetrics,
    isAnalyzing,
    error,
    analyzeFile,
    analyzeProject,
    trackChanges,
    detectBreakingChanges,
    getFileAnalysis,
    getFileDependencies,
    getFileDependents,
    findReferences,
    calculateComplexity,
    suggestRefactoring,
    clearAnalysis,
  };
}

export default useCodeIntelligence;
