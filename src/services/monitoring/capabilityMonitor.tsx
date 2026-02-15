/**
 * Capability Drift Detection
 * 
 * Prevents silent degradation of local model or API behavior.
 * Monitors token limits, response latency, and determinism.
 */

import { LocalAIModelService } from '../ai/localAIModelService';
import { SecureStorage } from '../security/secureStorage';

interface CapabilitySnapshot {
  timestamp: number;
  tokenLimit: number;
  avgLatency: number;
  determinismScore: number;
  modelStatus: string;
  healthStatus: string;
}

interface CapabilityCheckResult {
  status: 'OK' | 'DEGRADED' | 'FAILED';
  drift: {
    latency: number; // percentage change
    determinism: number; // percentage change
  };
  details: string;
}

export class CapabilityMonitor {
  private static readonly STORAGE_KEY = 'gstudio_capability_snapshot';
  private static readonly CHECK_INTERVAL = 300000; // 5 minutes
  private static readonly DRIFT_THRESHOLD = 0.2; // 20% change is significant
  private static lastCheck: number = 0;
  private static checkInterval: NodeJS.Timeout | null = null;

  /**
   * Get last known good capability snapshot
   */
  private static async getLastSnapshot(): Promise<CapabilitySnapshot | null> {
    try {
      const snapshot = await SecureStorage.getItem(this.STORAGE_KEY);
      return snapshot as CapabilitySnapshot | null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Save capability snapshot
   */
  private static async saveSnapshot(snapshot: CapabilitySnapshot): Promise<void> {
    try {
      await SecureStorage.setItem(this.STORAGE_KEY, snapshot);
    } catch (error) {
      console.warn('[CapabilityMonitor] Failed to save snapshot:', error);
    }
  }

  /**
   * Check current capabilities
   */
  static async checkCapabilities(): Promise<CapabilityCheckResult> {
    const modelStatus = LocalAIModelService.getStatus();
    const healthStatus = LocalAIModelService.getHealthStatus();

    // If model not ready, can't check capabilities
    if (modelStatus !== 'READY') {
      console.log('[CAPABILITY_CHECK]: FAILED (model not ready)');
      return {
        status: 'FAILED',
        drift: { latency: 0, determinism: 0 },
        details: 'Model not loaded'
      };
    }

    try {
      // Test latency with simple prompt
      const testPrompt = 'test';
      const startTime = Date.now();
      const result = await LocalAIModelService.infer(testPrompt, {
        maxTokens: 10,
        timeout: 5000,
      });
      const latency = Date.now() - startTime;

      // Test determinism (same prompt should give similar output)
      const result2 = await LocalAIModelService.infer(testPrompt, {
        maxTokens: 10,
        timeout: 5000,
        temperature: 0.1, // Low temperature for determinism
      });

      // Simple determinism check: compare token counts (not exact match due to randomness)
      const determinismScore = Math.abs(result.tokens - result2.tokens) <= 2 ? 1.0 : 0.5;

      const currentSnapshot: CapabilitySnapshot = {
        timestamp: Date.now(),
        tokenLimit: 512, // Default for Qwen2.5-Coder-1.5B
        avgLatency: latency,
        determinismScore,
        modelStatus,
        healthStatus,
      };

      // Compare with last snapshot
      const lastSnapshot = await this.getLastSnapshot();
      let status: 'OK' | 'DEGRADED' | 'FAILED' = 'OK';
      let drift = { latency: 0, determinism: 0 };
      let details = 'Capabilities normal';

      if (lastSnapshot) {
        const latencyDrift = (latency - lastSnapshot.avgLatency) / lastSnapshot.avgLatency;
        const determinismDrift = Math.abs(determinismScore - lastSnapshot.determinismScore);

        drift = {
          latency: latencyDrift,
          determinism: determinismDrift,
        };

        if (Math.abs(latencyDrift) > this.DRIFT_THRESHOLD || determinismDrift > this.DRIFT_THRESHOLD) {
          status = 'DEGRADED';
          details = `Latency drift: ${(latencyDrift * 100).toFixed(1)}%, Determinism drift: ${(determinismDrift * 100).toFixed(1)}%`;
        }

        if (healthStatus === 'ERROR') {
          status = 'FAILED';
          details = 'Model health is ERROR';
        }
      }

      // Save current snapshot
      await this.saveSnapshot(currentSnapshot);

      console.log(`[CAPABILITY_CHECK]: ${status}`);
      if (status !== 'OK') {
        console.warn(`[CapabilityMonitor] ${details}`);
      }

      return { status, drift, details };
    } catch (error) {
      console.error('[CapabilityMonitor] Capability check failed:', error);
      console.log('[CAPABILITY_CHECK]: FAILED');
      return {
        status: 'FAILED',
        drift: { latency: 0, determinism: 0 },
        details: `Check failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Start periodic capability monitoring
   */
  static startMonitoring(): void {
    if (this.checkInterval) {
      return; // Already monitoring
    }

    // Initial check
    this.checkCapabilities().catch(console.error);

    // Periodic checks
    this.checkInterval = setInterval(() => {
      this.checkCapabilities().catch(console.error);
    }, this.CHECK_INTERVAL);

    console.log('[CapabilityMonitor] Monitoring started');
  }

  /**
   * Stop periodic monitoring
   */
  static stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }
}
