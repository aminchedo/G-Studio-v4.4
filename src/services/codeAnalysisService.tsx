/**
 * Code Analysis Service - AI-powered code analysis for quality and security
 * Provides real-time error detection, performance suggestions, and security scanning
 */

import { GeminiService } from './ai/geminiService';
import { ErrorHandler, ErrorCode } from './errorHandler';
import { TelemetryService } from './telemetryService';

export interface CodeIssue {
  id: string;
  type: 'error' | 'warning' | 'info' | 'hint';
  severity: 'critical' | 'high' | 'medium' | 'low';
  line: number;
  column: number;
  message: string;
  source: 'lint' | 'security' | 'performance' | 'style' | 'ai';
  fix?: {
    description: string;
    code: string;
  };
}

export interface AnalysisResult {
  fileId: string;
  fileName: string;
  issues: CodeIssue[];
  metrics: {
    complexity: number;
    maintainability: number;
    coverage?: number;
    errorCount: number;
    warningCount: number;
  };
  timestamp: number;
}

class CodeAnalysisService {
  private static instance: CodeAnalysisService;
  private geminiService: GeminiService | null = null;
  private analysisCache: Map<string, AnalysisResult> = new Map();
  private readonly CACHE_DURATION = 300000; // 5 minutes

  private constructor() {
    try {
      const apiKey = this.getApiKey();
      if (apiKey) {
        this.geminiService = new GeminiService(apiKey);
      }
    } catch (e) {
      console.warn('[CodeAnalysisService] Could not initialize Gemini service');
    }
  }

  static getInstance(): CodeAnalysisService {
    if (!CodeAnalysisService.instance) {
      CodeAnalysisService.instance = new CodeAnalysisService();
    }
    return CodeAnalysisService.instance;
  }

  /**
   * Analyze code for issues
   */
  async analyzeCode(
    code: string,
    fileName: string,
    language: string = 'typescript'
  ): Promise<AnalysisResult> {
    try {
      const cacheKey = this.getCacheKey(code, fileName);

      // Check cache
      const cached = this.analysisCache.get(cacheKey);
      if (cached && this.isCacheValid(cached.timestamp)) {
        return cached;
      }

      const issues = await this.detectIssues(code, fileName, language);
      const metrics = this.calculateMetrics(code, issues);

      const result: AnalysisResult = {
        fileId: this.getCacheKey(code, fileName),
        fileName,
        issues,
        metrics,
        timestamp: Date.now(),
      };

      this.analysisCache.set(cacheKey, result);
      TelemetryService.recordEvent('code_analyzed', {
        fileName,
        issueCount: issues.length,
        language,
      });

      return result;
    } catch (error: any) {
      ErrorHandler.handle(error, 'CODE_ANALYSIS_FAILED', {
        code: ErrorCode.TOOL_EXECUTION_FAILED,
      });

      return {
        fileId: this.getCacheKey(code, fileName),
        fileName,
        issues: [],
        metrics: { complexity: 0, maintainability: 100, errorCount: 0, warningCount: 0 },
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Detect code issues using basic analysis and AI
   * @private
   */
  private async detectIssues(code: string, fileName: string, language: string): Promise<CodeIssue[]> {
    const issues: CodeIssue[] = [];

    // Basic static analysis
    issues.push(...this.detectCommonIssues(code, language));

    // AI-powered analysis if available
    if (this.geminiService) {
      try {
        const aiIssues = await this.detectAIIssues(code, fileName, language);
        issues.push(...aiIssues);
      } catch (e) {
        console.warn('[CodeAnalysisService] AI analysis failed, using static analysis only');
      }
    }

    // Deduplicate and sort by severity
    return this.deduplicateAndSort(issues);
  }

  /**
   * Static analysis for common issues
   * @private
   */
  private detectCommonIssues(code: string, language: string): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const lines = code.split('\n');

    lines.forEach((line, lineNumber) => {
      const lineNum = lineNumber + 1;
      const trimmed = line.trim();

      // Detect console.log statements
      if (/console\.(log|debug|info)\s*\(/.test(trimmed)) {
        issues.push({
          id: `console-${lineNum}`,
          type: 'hint',
          severity: 'low',
          line: lineNum,
          column: line.indexOf('console'),
          message: 'Remove console statements in production code',
          source: 'lint',
        });
      }

      // Detect TODO comments
      if (/\/\/\s*TODO|\/\/\s*FIXME/.test(trimmed)) {
        issues.push({
          id: `todo-${lineNum}`,
          type: 'info',
          severity: 'low',
          line: lineNum,
          column: line.indexOf('//'),
          message: 'Incomplete task found in code',
          source: 'style',
        });
      }

      // Detect unused variables (simple heuristic)
      const varMatch = line.match(/\b(const|let|var)\s+(\w+)/);
      if (varMatch && !code.includes(varMatch[2] + '.') && !code.includes(varMatch[2] + '(')) {
        issues.push({
          id: `unused-${lineNum}-${varMatch[2]}`,
          type: 'hint',
          severity: 'low',
          line: lineNum,
          column: line.indexOf(varMatch[2]),
          message: `Variable '${varMatch[2]}' appears to be unused`,
          source: 'lint',
        });
      }

      // Detect long lines
      if (line.length > 100) {
        issues.push({
          id: `long-line-${lineNum}`,
          type: 'hint',
          severity: 'low',
          line: lineNum,
          column: 100,
          message: 'Line is too long (>100 characters)',
          source: 'style',
        });
      }

      // Detect potential security issues
      if (/eval\s*\(|innerHTML|dangerouslySetInnerHTML/.test(trimmed)) {
        issues.push({
          id: `security-${lineNum}`,
          type: 'warning',
          severity: 'high',
          line: lineNum,
          column: line.indexOf(trimmed),
          message: 'Potential security vulnerability detected',
          source: 'security',
        });
      }

      // Detect any
      if (/:\s*any\b|as\s+any\b/.test(trimmed)) {
        issues.push({
          id: `any-${lineNum}`,
          type: 'hint',
          severity: 'medium',
          line: lineNum,
          column: line.indexOf('any'),
          message: 'Using "any" type weakens type safety',
          source: 'lint',
        });
      }
    });

    return issues;
  }

  /**
   * AI-powered issue detection using Gemini
   * @private
   */
  private async detectAIIssues(code: string, fileName: string, language: string): Promise<CodeIssue[]> {
    if (!this.geminiService) return [];

    try {
      const prompt = `Analyze this ${language} code for issues, security problems, and best practices. 
Return only a JSON array of issues with format: {line, severity, message}. Code:\n\n${code.substring(0, 2000)}`;

      const response = await (this.geminiService as any).generateContent(prompt);
      const text = response?.response?.text?.() || '';

      // Parse JSON issues from response
      try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const parsedIssues = JSON.parse(jsonMatch[0]);
          return parsedIssues
            .map((issue: any, idx: number) => ({
              id: `ai-issue-${idx}`,
              type: 'warning' as const,
              severity: issue.severity || 'medium',
              line: issue.line || 1,
              column: 0,
              message: issue.message || 'Code quality issue',
              source: 'ai' as const,
            }))
            .slice(0, 5); // Limit to top 5 AI issues
        }
      } catch (e) {
        console.warn('[CodeAnalysisService] Failed to parse AI issues');
      }

      return [];
    } catch (error) {
      console.warn('[CodeAnalysisService] AI analysis error:', error);
      return [];
    }
  }

  /**
   * Calculate code metrics
   * @private
   */
  private calculateMetrics(code: string, issues: CodeIssue[]) {
    const lines = code.split('\n');
    const errorCount = issues.filter(i => i.type === 'error').length;
    const warningCount = issues.filter(i => i.type === 'warning').length;

    // Simple complexity calculation (cyclomatic complexity approximation)
    const complexityMatches = code.match(/if|for|while|switch|catch|&&|\|\|/g) || [];
    const complexity = Math.min(complexityMatches.length, 30);

    // Maintainability index (simplified)
    const maintainability = Math.max(
      0,
      100 -
        complexity * 2 -
        (errorCount * 10 + warningCount * 5) -
        (lines.length > 500 ? 20 : 0) -
        (code.match(/\/\//g)?.length || 0) < 20 ? 10 : 0
    );

    return {
      complexity: complexity / 10,
      maintainability: Math.round(maintainability),
      errorCount,
      warningCount,
    };
  }

  /**
   * Deduplicate issues and sort by severity
   * @private
   */
  private deduplicateAndSort(issues: CodeIssue[]): CodeIssue[] {
    const seen = new Set<string>();
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };

    return issues
      .filter(issue => {
        const key = `${issue.line}-${issue.message}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  }

  /**
   * Get API key from environment or storage
   * @private
   */
  private getApiKey(): string | null {
    if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_API_KEY) {
      return (import.meta as any).env.VITE_GOOGLE_API_KEY;
    }
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('google_api_key');
    }
    return null;
  }

  /**
   * Get cache key
   * @private
   */
  private getCacheKey(code: string, fileName: string): string {
    return `${fileName}-${code.length}-${Date.now() % 10000}`;
  }

  /**
   * Check if cache is still valid
   * @private
   */
  private isCacheValid(timestamp: number): boolean {
    return Date.now() - timestamp < this.CACHE_DURATION;
  }

  /**
   * Clear analysis cache
   */
  clearCache(): void {
    this.analysisCache.clear();
  }
}

export const codeAnalysisService = CodeAnalysisService.getInstance();
