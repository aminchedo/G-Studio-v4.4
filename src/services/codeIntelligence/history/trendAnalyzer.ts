/**
 * Trend Analyzer - Analyze change patterns over time
 */

import { Snapshot } from '../../../types/codeIntelligence';
import { SnapshotDiffEngine } from './snapshotDiff';

export interface TrendReport {
  complexityTrend: 'increasing' | 'decreasing' | 'stable';
  dependencyGrowth: number;
  changeFrequency: number;
  riskTrend: 'increasing' | 'decreasing' | 'stable';
  recommendations: string[];
  cyclomaticComplexity?: {
    trend: 'increasing' | 'decreasing' | 'stable';
    current: number;
    average: number;
  };
  regressionDetected?: {
    type: 'complexity_spike' | 'risk_spike' | 'dependency_spike';
    severity: 'low' | 'medium' | 'high';
    timestamp: number;
    description: string;
  }[];
}

export class TrendAnalyzer {
  private diffEngine: SnapshotDiffEngine;

  constructor() {
    this.diffEngine = new SnapshotDiffEngine();
  }

  /**
   * Analyze trends from snapshot history
   * Enhanced with cyclomatic complexity analysis and regression detection
   */
  analyzeTrends(snapshots: Snapshot[]): TrendReport {
    if (snapshots.length < 2) {
      return {
        complexityTrend: 'stable',
        dependencyGrowth: 0,
        changeFrequency: 0,
        riskTrend: 'stable',
        recommendations: ['Need more snapshots for trend analysis']
      };
    }

    // Sort by timestamp
    const sorted = [...snapshots].sort((a, b) => a.timestamp - b.timestamp);

    // Calculate complexity trend (file count + total lines as proxy for cyclomatic complexity)
    const fileCounts = sorted.map(s => Object.keys(s.files).length);
    const lineCounts = sorted.map(s => 
      Object.values(s.files).reduce((sum, f) => sum + (f.lines || 0), 0)
    );
    const complexityTrend = this.calculateTrend(fileCounts);

    // Calculate cyclomatic complexity (simplified: function count + average lines per file)
    const functionCounts = sorted.map(s => 
      Object.values(s.astSnapshots).reduce((sum, ast) => 
        sum + ast.nodes.filter(n => n.type === 'function').length, 0
      )
    );
    const avgLinesPerFile = sorted.map(s => {
      const files = Object.values(s.files);
      return files.length > 0 
        ? files.reduce((sum, f) => sum + (f.lines || 0), 0) / files.length 
        : 0;
    });
    const cyclomaticComplexity = functionCounts.map((funcCount, i) => 
      funcCount * (1 + avgLinesPerFile[i] / 100) // Simplified cyclomatic complexity
    );
    const complexityTrendDetailed = this.calculateTrend(cyclomaticComplexity);

    // Calculate dependency growth
    const dependencyCounts = sorted.map(s => Object.keys(s.dependencyGraph.nodes).length);
    const dependencyGrowth = dependencyCounts[dependencyCounts.length - 1] - dependencyCounts[0];
    const dependencyGrowthTrend = this.calculateTrend(dependencyCounts);

    // Calculate change frequency
    let totalChanges = 0;
    for (let i = 1; i < sorted.length; i++) {
      const diff = this.diffEngine.diffSnapshots(sorted[i - 1], sorted[i]);
      totalChanges += diff.modifiedFiles.length + diff.addedFiles.length + diff.removedFiles.length;
    }
    const timeSpan = sorted[sorted.length - 1].timestamp - sorted[0].timestamp;
    const changeFrequency = timeSpan > 0 ? (totalChanges / timeSpan) * 1000 * 60 * 60 : 0; // Changes per hour

    // Calculate risk trend (circular dependencies as proxy)
    const circularDepCounts = sorted.map(s => s.dependencyGraph.circularDependencies.length);
    const riskTrend = this.calculateTrend(circularDepCounts);

    // Regression detection
    const regressions = this.detectRegressions(sorted, {
      complexity: cyclomaticComplexity,
      risk: circularDepCounts,
      dependencies: dependencyCounts
    });

    // Generate recommendations
    const recommendations: string[] = [];
    if (complexityTrend === 'increasing') {
      recommendations.push('Consider refactoring to reduce complexity');
    }
    if (dependencyGrowth > 10) {
      recommendations.push('High dependency growth detected - review architecture');
    }
    if (changeFrequency > 10) {
      recommendations.push('High change frequency - consider more frequent snapshots');
    }
    if (riskTrend === 'increasing') {
      recommendations.push('Circular dependencies increasing - review module boundaries');
    }
    if (regressions.length > 0) {
      recommendations.push(`${regressions.length} regression(s) detected - review recent changes`);
    }
    if (recommendations.length === 0) {
      recommendations.push('Project trends are healthy');
    }

    return {
      complexityTrend,
      dependencyGrowth,
      changeFrequency,
      riskTrend,
      recommendations,
      cyclomaticComplexity: {
        trend: complexityTrendDetailed,
        current: cyclomaticComplexity[cyclomaticComplexity.length - 1] || 0,
        average: cyclomaticComplexity.reduce((a, b) => a + b, 0) / cyclomaticComplexity.length
      },
      regressionDetected: regressions.length > 0 ? regressions : undefined
    };
  }

  /**
   * Detect regressions (spikes in complexity, risk, or dependencies)
   */
  private detectRegressions(
    snapshots: Snapshot[],
    metrics: {
      complexity: number[];
      risk: number[];
      dependencies: number[];
    }
  ): Array<{
    type: 'complexity_spike' | 'risk_spike' | 'dependency_spike';
    severity: 'low' | 'medium' | 'high';
    timestamp: number;
    description: string;
  }> {
    const regressions: Array<{
      type: 'complexity_spike' | 'risk_spike' | 'dependency_spike';
      severity: 'low' | 'medium' | 'high';
      timestamp: number;
      description: string;
    }> = [];

    // Calculate moving averages and standard deviations
    const windowSize = Math.min(5, Math.floor(snapshots.length / 2));
    if (windowSize < 2) {
      return regressions;
    }

    // Detect complexity spikes
    for (let i = windowSize; i < metrics.complexity.length; i++) {
      const window = metrics.complexity.slice(i - windowSize, i);
      const avg = window.reduce((a, b) => a + b, 0) / window.length;
      const stdDev = Math.sqrt(
        window.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / window.length
      );
      const current = metrics.complexity[i];
      const threshold = avg + 2 * stdDev; // 2 standard deviations

      if (current > threshold) {
        const severity = current > avg + 3 * stdDev ? 'high' : 
                        current > avg + 2.5 * stdDev ? 'medium' : 'low';
        regressions.push({
          type: 'complexity_spike',
          severity,
          timestamp: snapshots[i].timestamp,
          description: `Complexity spike detected: ${current.toFixed(1)} (avg: ${avg.toFixed(1)})`
        });
      }
    }

    // Detect risk spikes
    for (let i = windowSize; i < metrics.risk.length; i++) {
      const window = metrics.risk.slice(i - windowSize, i);
      const avg = window.reduce((a, b) => a + b, 0) / window.length;
      const current = metrics.risk[i];

      if (current > avg * 1.5) { // 50% increase
        const severity = current > avg * 2 ? 'high' : 
                        current > avg * 1.75 ? 'medium' : 'low';
        regressions.push({
          type: 'risk_spike',
          severity,
          timestamp: snapshots[i].timestamp,
          description: `Risk spike detected: ${current} circular deps (avg: ${avg.toFixed(1)})`
        });
      }
    }

    // Detect dependency spikes
    for (let i = windowSize; i < metrics.dependencies.length; i++) {
      const window = metrics.dependencies.slice(i - windowSize, i);
      const avg = window.reduce((a, b) => a + b, 0) / window.length;
      const current = metrics.dependencies[i];
      const growth = current - metrics.dependencies[i - 1];

      if (growth > avg * 0.2) { // 20% growth in single step
        const severity = growth > avg * 0.3 ? 'high' : 
                        growth > avg * 0.25 ? 'medium' : 'low';
        regressions.push({
          type: 'dependency_spike',
          severity,
          timestamp: snapshots[i].timestamp,
          description: `Dependency spike detected: +${growth} dependencies (avg growth: ${(avg * 0.1).toFixed(1)})`
        });
      }
    }

    return regressions;
  }

  /**
   * Calculate trend direction from array of values
   */
  private calculateTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 2) {
      return 'stable';
    }

    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    const threshold = (firstAvg + secondAvg) / 2 * 0.1; // 10% threshold

    if (secondAvg > firstAvg + threshold) {
      return 'increasing';
    } else if (secondAvg < firstAvg - threshold) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }
}
