/**
 * Context Growth & Memory Pressure Control
 * 
 * Ensures long-running sessions remain stable.
 * Enforces hard upper bounds and proactive summarization.
 */

import { ContextDatabaseBridge } from '../storage/contextDatabaseBridge';
import { LocalAIModelService } from '../ai/localAIModelService';

export type MemoryPressureLevel = 'SAFE' | 'PRESSURE' | 'CRITICAL';

interface MemoryMetrics {
  contextTokens: number;
  contextEntries: number;
  summaryLayers: number;
  inMemoryTokens: number;
  pressureLevel: MemoryPressureLevel;
}

export class MemoryPressureMonitor {
  private static readonly MAX_CONTEXT_TOKENS = 8000;
  private static readonly PRESSURE_THRESHOLD = 6000; // 75% of max
  private static readonly CRITICAL_THRESHOLD = 7200; // 90% of max
  private static readonly MAX_SUMMARY_LAYERS = 3;
  private static readonly MAX_IN_MEMORY_TOKENS = 16000; // For Electron

  /**
   * Get current memory metrics
   */
  static async getMetrics(sessionId: string | null): Promise<MemoryMetrics> {
    let contextTokens = 0;
    let contextEntries = 0;
    let summaryLayers = 0;

    if (sessionId) {
      try {
        const contextSize = await ContextDatabaseBridge.getContextSize(sessionId);
        contextTokens = contextSize.totalTokens;
        contextEntries = contextSize.entryCount;

        const summaries = await ContextDatabaseBridge.getSummaries(sessionId);
        summaryLayers = summaries.length;
      } catch (error) {
        console.warn('[MemoryPressureMonitor] Failed to get context metrics:', error);
      }
    }

    // Estimate in-memory tokens (context + current message processing)
    const inMemoryTokens = contextTokens + 2000; // Rough estimate for current processing

    // Determine pressure level
    let pressureLevel: MemoryPressureLevel = 'SAFE';
    if (contextTokens >= this.CRITICAL_THRESHOLD) {
      pressureLevel = 'CRITICAL';
    } else if (contextTokens >= this.PRESSURE_THRESHOLD) {
      pressureLevel = 'PRESSURE';
    }

    // Check in-memory limit
    if (inMemoryTokens > this.MAX_IN_MEMORY_TOKENS) {
      pressureLevel = 'CRITICAL';
    }

    // Check summary layers
    if (summaryLayers > this.MAX_SUMMARY_LAYERS) {
      pressureLevel = pressureLevel === 'SAFE' ? 'PRESSURE' : 'CRITICAL';
    }

    console.log(`[MEMORY]: ${pressureLevel}`);

    return {
      contextTokens,
      contextEntries,
      summaryLayers,
      inMemoryTokens,
      pressureLevel,
    };
  }

  /**
   * Check if proactive summarization is needed
   */
  static async shouldSummarize(sessionId: string | null): Promise<boolean> {
    const metrics = await this.getMetrics(sessionId);
    return metrics.pressureLevel === 'PRESSURE' || metrics.pressureLevel === 'CRITICAL';
  }

  /**
   * Enforce memory limits
   */
  static async enforceLimits(sessionId: string | null): Promise<void> {
    const metrics = await this.getMetrics(sessionId);

    if (metrics.pressureLevel === 'CRITICAL') {
      // Aggressive trimming
      if (sessionId) {
        try {
          await ContextDatabaseBridge.trimContext(sessionId, this.PRESSURE_THRESHOLD);
          console.log('[MemoryPressureMonitor] Aggressive context trimming applied');
        } catch (error) {
          console.error('[MemoryPressureMonitor] Failed to trim context:', error);
        }
      }
    } else if (metrics.pressureLevel === 'PRESSURE') {
      // Proactive summarization should be triggered by agentOrchestrator
      console.log('[MemoryPressureMonitor] Pressure detected - summarization recommended');
    }
  }

  /**
   * Get Electron memory usage (if available)
   */
  static getElectronMemoryUsage(): { heapUsed: number; heapTotal: number } | null {
    if (typeof process !== 'undefined' && (process as any).memoryUsage) {
      const usage = (process as any).memoryUsage();
      return {
        heapUsed: usage.heapUsed || 0,
        heapTotal: usage.heapTotal || 0,
      };
    }
    return null;
  }
}
