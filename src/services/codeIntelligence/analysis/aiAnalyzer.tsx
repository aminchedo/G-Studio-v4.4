/**
 * AI Analyzer - Uses Gemini service for AI-powered code analysis (advisory only)
 */

import { fs, path, safePathJoin } from '../nodeCompat';
import { GeminiService } from '../../ai/geminiService';
import { AIAnalysisReport, ChangeReport, Snapshot } from '@/types/codeIntelligence';

export class AIAnalyzer {
  private readonly REPORTS_DIR = safePathJoin('.project-intel', 'reports');
  private geminiService: GeminiService;

  constructor() {
    this.geminiService = new GeminiService();
  }

  /**
   * Analyze breaking changes with AI
   */
  async analyzeBreakingChanges(
    changeReports: ChangeReport[],
    oldSnapshot: Snapshot,
    newSnapshot: Snapshot
  ): Promise<AIAnalysisReport[]> {
    const reports: AIAnalysisReport[] = [];

    for (const changeReport of changeReports) {
      if (changeReport.riskLevel === 'BREAKING' || changeReport.riskLevel === 'RISKY') {
        try {
          const analysis = await this.analyzeChange(changeReport, oldSnapshot, newSnapshot);
          reports.push(analysis);
        } catch (error) {
          console.warn(`[AIAnalyzer] Failed to analyze ${changeReport.filePath}:`, error);
        }
      }
    }

    // Save reports
    this.saveReports(reports);

    return reports;
  }

  /**
   * Analyze a single change
   */
  private async analyzeChange(
    changeReport: ChangeReport,
    oldSnapshot: Snapshot,
    newSnapshot: Snapshot
  ): Promise<AIAnalysisReport> {
    const prompt = this.buildAnalysisPrompt(changeReport, oldSnapshot, newSnapshot);

    try {
      // Use Gemini service to analyze
      const response = await (this as any).geminiService?.generateResponse?.(
        [{ role: 'user', content: prompt }],
        'gemini-flash-latest' as any
      );

      const analysisText = typeof response === 'string' ? response : response.content || '';

      // Parse analysis (simple extraction)
      const impact = this.extractSection(analysisText, 'Impact:');
      const suggestions = this.extractSuggestions(analysisText);
      const riskAssessment = this.extractSection(analysisText, 'Risk Assessment:') || changeReport.riskLevel;

      const report: AIAnalysisReport = {
        filePath: changeReport.filePath,
        timestamp: Date.now(),
        analysis: {
          impact: impact || 'Analysis completed',
          suggestions,
          riskAssessment
        },
        model: 'gemini-flash-latest'
      };

      return report;
    } catch (error) {
      // Fallback report if AI analysis fails
      return {
        filePath: changeReport.filePath,
        timestamp: Date.now(),
        analysis: {
          impact: 'AI analysis unavailable',
          suggestions: [],
          riskAssessment: changeReport.riskLevel
        },
        model: 'none'
      };
    }
  }

  /**
   * Build analysis prompt for AI
   */
  private buildAnalysisPrompt(
    changeReport: ChangeReport,
    oldSnapshot: Snapshot,
    newSnapshot: Snapshot
  ): string {
    const oldAST = oldSnapshot.astSnapshots[changeReport.filePath];
    const newAST = newSnapshot.astSnapshots[changeReport.filePath];

    let prompt = `Analyze the following code change and provide impact assessment:\n\n`;
    prompt += `File: ${changeReport.filePath}\n`;
    prompt += `Risk Level: ${changeReport.riskLevel}\n\n`;
    prompt += `Changes:\n`;
    changeReport.changes.forEach(change => {
      prompt += `- ${change.description}\n`;
      if (change.before) prompt += `  Before: ${change.before}\n`;
      if (change.after) prompt += `  After: ${change.after}\n`;
    });

    if (oldAST && newAST) {
      prompt += `\nOld AST nodes: ${oldAST.nodes.length}\n`;
      prompt += `New AST nodes: ${newAST.nodes.length}\n`;
      prompt += `Old exports: ${oldAST.exports.map(e => e.name).join(', ')}\n`;
      prompt += `New exports: ${newAST.exports.map(e => e.name).join(', ')}\n`;
    }

    prompt += `\nPlease provide:\n`;
    prompt += `1. Impact: What is the potential impact of these changes?\n`;
    prompt += `2. Suggestions: What refactoring or migration steps are recommended? (advisory only)\n`;
    prompt += `3. Risk Assessment: Confirm or adjust the risk level (SAFE/RISKY/BREAKING)\n`;
    prompt += `\nNote: This is advisory analysis only. Do not suggest automatic code changes.`;

    return prompt;
  }

  /**
   * Extract section from AI response
   */
  private extractSection(text: string, section: string): string | null {
    const regex = new RegExp(`${section}\\s*([^\\n]+(?:\\n(?!\\d+\\.|\\n)[^\\n]+)*)`, 'i');
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  }

  /**
   * Extract suggestions from AI response
   */
  private extractSuggestions(text: string): string[] {
    const suggestions: string[] = [];
    
    // Look for numbered or bulleted lists
    const lines = text.split('\n');
    let inSuggestions = false;

    for (const line of lines) {
      if (line.toLowerCase().includes('suggestion') || line.toLowerCase().includes('recommendation')) {
        inSuggestions = true;
        continue;
      }

      if (inSuggestions) {
        const trimmed = line.trim();
        if (trimmed.match(/^[-*•]\s+/) || trimmed.match(/^\d+\.\s+/)) {
          suggestions.push(trimmed.replace(/^[-*•]\s+/, '').replace(/^\d+\.\s+/, ''));
        } else if (trimmed && !trimmed.match(/^[A-Z]/)) {
          // Continue previous suggestion
          if (suggestions.length > 0) {
            suggestions[suggestions.length - 1] += ' ' + trimmed;
          }
        } else if (trimmed && trimmed.match(/^[A-Z]/) && trimmed.length > 50) {
          // New section, stop
          break;
        }
      }
    }

    return suggestions.filter(s => s.length > 0);
  }

  /**
   * Save analysis reports to disk
   */
  private saveReports(reports: AIAnalysisReport[]): void {
    try {
      if (!fs || !fs.existsSync(this.REPORTS_DIR)) {
        if (fs) {
          fs.mkdirSync(this.REPORTS_DIR, { recursive: true });
        }
      }

      const reportPath = safePathJoin(this.REPORTS_DIR, 'ai-analysis.json');
      const existingReports = this.loadReports();
      const allReports = [...existingReports, ...reports];
      
      if (fs) {
        fs.writeFileSync(reportPath, JSON.stringify(allReports, null, 2));
      }
    } catch (error) {
      console.error('[AIAnalyzer] Failed to save reports:', error);
    }
  }

  /**
   * Load existing analysis reports
   */
  loadReports(): AIAnalysisReport[] {
    try {
      const reportPath = safePathJoin(this.REPORTS_DIR, 'ai-analysis.json');
      if (fs && fs.existsSync(reportPath)) {
        const content = fs.readFileSync(reportPath, 'utf8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn('[AIAnalyzer] Failed to load reports:', error);
    }
    return [];
  }
}
