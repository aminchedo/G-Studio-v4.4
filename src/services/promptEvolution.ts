/**
 * Prompt Intelligence Feedback Loop
 * 
 * Tracks prompt evolution, detects regressions, and enables adaptive updates.
 */

import { SecureStorage } from './secureStorage';
import { LocalAIModelService } from './localAIModelService';
import { ProductivityMetrics } from './productivityMetrics';

interface PromptVersion {
  version: number;
  template: string;
  metrics: {
    avgLatency: number;
    successRate: number;
    userSatisfaction: number; // 0-1, inferred from corrections
    timestamp: number;
  };
}

interface PromptComparison {
  original: string;
  professionalized: string;
  userCorrection?: string;
  timestamp: number;
}

export class PromptEvolution {
  private static readonly STORAGE_KEY = 'gstudio_prompt_evolution';
  private static readonly VERSION_KEY = 'gstudio_prompt_version';
  private static currentVersion: number = 1;
  private static versions: Map<number, PromptVersion> = new Map();
  private static comparisons: PromptComparison[] = [];

  /**
   * Initialize prompt evolution tracking
   */
  static async initialize(): Promise<void> {
    try {
      const stored = await SecureStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        this.currentVersion = stored.currentVersion || 1;
        if (stored.versions) {
          this.versions = new Map(stored.versions);
        }
        if (stored.comparisons) {
          this.comparisons = stored.comparisons;
        }
      }
    } catch (error) {
      console.warn('[PromptEvolution] Failed to load history:', error);
    }
  }

  /**
   * Record prompt transformation
   */
  static async recordTransformation(
    original: string,
    professionalized: string,
    taskId?: string
  ): Promise<void> {
    const comparison: PromptComparison = {
      original,
      professionalized,
      timestamp: Date.now(),
    };

    this.comparisons.push(comparison);
    
    // Keep only last 100 comparisons
    if (this.comparisons.length > 100) {
      this.comparisons = this.comparisons.slice(-100);
    }

    // Record prompt effectiveness metric
    if (taskId) {
      const comparisonResult = this.comparePrompts(original, professionalized);
      const beforeQuality = comparisonResult.similarity; // Lower similarity = more improvement potential
      const afterQuality = 1.0; // Assume professionalized is better
      const improvement = afterQuality - beforeQuality;
      
      ProductivityMetrics.recordPromptEffectiveness(
        taskId,
        beforeQuality,
        afterQuality,
        improvement
      );
    }

    await this.saveState();
  }

  /**
   * Record user correction signal
   */
  static async recordCorrection(
    original: string,
    professionalized: string,
    userCorrection: string
  ): Promise<void> {
    const comparison: PromptComparison = {
      original,
      professionalized,
      userCorrection,
      timestamp: Date.now(),
    };

    this.comparisons.push(comparison);
    await this.saveState();

    // Analyze if regression detected
    await this.analyzeRegression();
  }

  /**
   * Analyze for prompt regression
   */
  private static async analyzeRegression(): Promise<void> {
    // Get recent comparisons with corrections
    const recentCorrections = this.comparisons
      .filter(c => c.userCorrection)
      .slice(-20); // Last 20 corrections

    if (recentCorrections.length < 5) {
      // Not enough data
      console.log('[PROMPT_EVOLUTION]: STABLE (insufficient data)');
      return;
    }

    // Calculate correction rate
    const correctionRate = recentCorrections.length / 20;
    
    if (correctionRate > 0.3) {
      // High correction rate suggests regression
      console.log('[PROMPT_EVOLUTION]: REGRESSED');
      console.warn('[PromptEvolution] High correction rate detected, prompt may need adjustment');
    } else if (correctionRate < 0.1) {
      // Low correction rate suggests improvement
      console.log('[PROMPT_EVOLUTION]: IMPROVED');
    } else {
      console.log('[PROMPT_EVOLUTION]: STABLE');
    }
  }

  /**
   * Get current prompt version
   */
  static getCurrentVersion(): number {
    return this.currentVersion;
  }

  /**
   * Get prompt version history
   */
  static getVersionHistory(): PromptVersion[] {
    return Array.from(this.versions.values()).sort((a, b) => b.version - a.version);
  }

  /**
   * Save state
   */
  private static async saveState(): Promise<void> {
    try {
      await SecureStorage.setItem(this.STORAGE_KEY, {
        currentVersion: this.currentVersion,
        versions: Array.from(this.versions.entries()),
        comparisons: this.comparisons.slice(-100), // Keep last 100
      });
    } catch (error) {
      console.error('[PromptEvolution] Failed to save state:', error);
    }
  }

  /**
   * Compare prompts for similarity
   */
  static comparePrompts(original: string, transformed: string): {
    similarity: number; // 0-1
    changes: string[];
  } {
    // Simple similarity based on word overlap
    const originalWords = new Set(original.toLowerCase().split(/\W+/).filter(w => w.length > 2));
    const transformedWords = new Set(transformed.toLowerCase().split(/\W+/).filter(w => w.length > 2));

    let common = 0;
    for (const word of transformedWords) {
      if (originalWords.has(word)) common++;
    }

    const union = new Set([...originalWords, ...transformedWords]).size;
    const similarity = union > 0 ? common / union : 0;

    // Detect significant changes
    const changes: string[] = [];
    if (transformed.length > original.length * 1.5) {
      changes.push('expanded');
    }
    if (transformed.length < original.length * 0.7) {
      changes.push('condensed');
    }

    return { similarity, changes };
  }
}

// Initialize on import
PromptEvolution.initialize().catch(console.error);
