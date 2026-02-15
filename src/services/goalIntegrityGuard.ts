/**
 * Autonomous Goal Integrity Guard
 * 
 * Prevents goal drift during autonomous execution.
 */

import { TokenOptimizer } from './tokenOptimizer';

interface GoalSnapshot {
  originalIntent: string;
  originalTaskType: string;
  timestamp: number;
}

interface StepGoal {
  stepNumber: number;
  stepDescription: string;
  similarity: number; // 0-1 similarity to original goal
}

export class GoalIntegrityGuard {
  private static readonly DRIFT_THRESHOLD = 0.3; // If similarity drops below 0.3, it's drift
  private static goalSnapshots: Map<string, GoalSnapshot> = new Map();

  /**
   * Lock original goal for an execution
   */
  static lockGoal(executionId: string, originalIntent: string, taskType: string): void {
    this.goalSnapshots.set(executionId, {
      originalIntent,
      originalTaskType: taskType,
      timestamp: Date.now(),
    });
  }

  /**
   * Check if step deviates from original goal
   */
  static checkGoalDrift(
    executionId: string,
    stepNumber: number,
    stepDescription: string
  ): { hasDrift: boolean; similarity: number; reason?: string } {
    const snapshot = this.goalSnapshots.get(executionId);
    if (!snapshot) {
      // No snapshot means no goal locked, allow step
      return { hasDrift: false, similarity: 1.0 };
    }

    // Calculate similarity between original goal and step description
    const similarity = this.calculateSimilarity(snapshot.originalIntent, stepDescription);

    if (similarity < this.DRIFT_THRESHOLD) {
      return {
        hasDrift: true,
        similarity,
        reason: `Step ${stepNumber} deviates significantly from original goal (similarity: ${similarity.toFixed(2)} < ${this.DRIFT_THRESHOLD})`,
      };
    }

    return { hasDrift: false, similarity };
  }

  /**
   * Calculate semantic similarity between two texts
   * Simple word-overlap based similarity
   */
  private static calculateSimilarity(text1: string, text2: string): number {
    // Normalize texts
    const words1 = new Set(
      text1.toLowerCase()
        .split(/\W+/)
        .filter(w => w.length > 2)
    );
    const words2 = new Set(
      text2.toLowerCase()
        .split(/\W+/)
        .filter(w => w.length > 2)
    );

    if (words1.size === 0 && words2.size === 0) return 1.0;
    if (words1.size === 0 || words2.size === 0) return 0.0;

    // Calculate Jaccard similarity
    let intersection = 0;
    for (const word of words2) {
      if (words1.has(word)) intersection++;
    }

    const union = new Set([...words1, ...words2]).size;
    return union > 0 ? intersection / union : 0.0;
  }

  /**
   * Release goal snapshot
   */
  static releaseGoal(executionId: string): void {
    this.goalSnapshots.delete(executionId);
  }

  /**
   * Get goal snapshot
   */
  static getGoal(executionId: string): GoalSnapshot | null {
    return this.goalSnapshots.get(executionId) || null;
  }
}
