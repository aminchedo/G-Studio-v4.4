/**
 * Smart Productivity Metrics Engine
 * 
 * Measures real system efficiency:
 * - Time-to-useful-answer
 * - Retry count
 * - Autonomous efficiency
 * - Prompt effectiveness
 * - Model ROI
 * - Self-healing impact
 */

import { ContextDatabaseBridge } from '../storage/contextDatabaseBridge';

export type MetricType = 
  | 'TIME_TO_ANSWER'
  | 'RETRY_COUNT'
  | 'AUTONOMOUS_EFFICIENCY'
  | 'PROMPT_EFFECTIVENESS'
  | 'MODEL_ROI'
  | 'SELF_HEALING_IMPACT';

export interface ProductivityMetric {
  id: string;
  taskId: string;
  stepId?: string;
  metricType: MetricType;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface MetricAggregation {
  metricType: MetricType;
  average: number;
  min: number;
  max: number;
  count: number;
  lastValue: number;
}

export class ProductivityMetrics {
  private static taskStartTimes: Map<string, number> = new Map();
  private static taskFirstResponseTimes: Map<string, number> = new Map();
  private static taskRetryCounts: Map<string, number> = new Map();

  /**
   * Record task start
   */
  static recordTaskStart(taskId: string): void {
    this.taskStartTimes.set(taskId, Date.now());
    this.taskRetryCounts.set(taskId, 0);
  }

  /**
   * Record first useful response
   */
  static recordFirstResponse(taskId: string): void {
    const startTime = this.taskStartTimes.get(taskId);
    if (startTime) {
      const timeToAnswer = Date.now() - startTime;
      this.taskFirstResponseTimes.set(taskId, timeToAnswer);
      this.recordMetric({
        taskId,
        metricType: 'TIME_TO_ANSWER',
        value: timeToAnswer,
        metadata: { unit: 'ms' },
      });
    }
  }

  /**
   * Record retry count
   */
  static recordRetry(taskId: string, stepId?: string): void {
    const currentCount = this.taskRetryCounts.get(taskId) || 0;
    const newCount = currentCount + 1;
    this.taskRetryCounts.set(taskId, newCount);
    
    this.recordMetric({
      taskId,
      stepId,
      metricType: 'RETRY_COUNT',
      value: newCount,
      metadata: { retryNumber: newCount },
    });
  }

  /**
   * Record autonomous efficiency
   */
  static recordAutonomousEfficiency(
    taskId: string,
    stepsUsed: number,
    stepsPlanned: number,
    successRate: number
  ): void {
    const efficiency = stepsPlanned > 0 ? (stepsUsed / stepsPlanned) : 1.0;
    
    this.recordMetric({
      taskId,
      metricType: 'AUTONOMOUS_EFFICIENCY',
      value: efficiency,
      metadata: {
        stepsUsed,
        stepsPlanned,
        successRate,
      },
    });
  }

  /**
   * Record prompt effectiveness
   */
  static recordPromptEffectiveness(
    taskId: string,
    beforeQuality: number,
    afterQuality: number,
    improvement: number
  ): void {
    this.recordMetric({
      taskId,
      metricType: 'PROMPT_EFFECTIVENESS',
      value: improvement,
      metadata: {
        beforeQuality,
        afterQuality,
        improvement,
      },
    });
  }

  /**
   * Record model ROI
   */
  static recordModelROI(
    taskId: string,
    stepId: string,
    model: string,
    quality: number,
    latency: number,
    cost: number
  ): void {
    // ROI = quality / (latency_ms / 1000 + cost)
    const roi = quality / ((latency / 1000) + (cost || 0.001));
    
    this.recordMetric({
      taskId,
      stepId,
      metricType: 'MODEL_ROI',
      value: roi,
      metadata: {
        model,
        quality,
        latency,
        cost,
      },
    });
  }

  /**
   * Record self-healing impact
   */
  static recordSelfHealingImpact(
    taskId: string,
    stepId: string,
    recoverySuccess: boolean,
    timeSaved: number
  ): void {
    this.recordMetric({
      taskId,
      stepId,
      metricType: 'SELF_HEALING_IMPACT',
      value: recoverySuccess ? 1 : 0,
      metadata: {
        recoverySuccess,
        timeSaved,
      },
    });
  }

  /**
   * Record a metric
   */
  private static async recordMetric(metric: Omit<ProductivityMetric, 'id' | 'timestamp'>): Promise<void> {
    try {
      const id = `metric_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const timestamp = Date.now();

      await ContextDatabaseBridge.recordProductivityMetric({
        id,
        taskId: metric.taskId,
        stepId: metric.stepId,
        metricType: metric.metricType,
        value: metric.value,
        timestamp,
        metadata: metric.metadata,
      });

      console.log(`[METRICS]: RECORDED (${metric.metricType})`);
    } catch (error) {
      console.warn('[ProductivityMetrics] Failed to record metric:', error);
    }
  }

  /**
   * Get aggregated metrics
   */
  static async getAggregatedMetrics(
    metricType: MetricType,
    taskType?: string,
    limit: number = 100
  ): Promise<MetricAggregation | null> {
    try {
      const metrics = await ContextDatabaseBridge.getProductivityMetrics(metricType, taskType, limit);
      
      if (metrics.length === 0) {
        return null;
      }

      const values = metrics.map(m => m.value);
      const sum = values.reduce((a, b) => a + b, 0);
      const average = sum / values.length;
      const min = Math.min(...values);
      const max = Math.max(...values);
      const lastValue = values[values.length - 1];

      console.log(`[METRICS]: AGGREGATED (${metricType}, count: ${metrics.length})`);

      return {
        metricType,
        average,
        min,
        max,
        count: metrics.length,
        lastValue,
      };
    } catch (error) {
      console.warn('[ProductivityMetrics] Failed to aggregate metrics:', error);
      return null;
    }
  }

  /**
   * Get task completion summary
   */
  static async getTaskSummary(taskId: string): Promise<{
    timeToAnswer?: number;
    retryCount: number;
    autonomousEfficiency?: number;
    modelROI?: number;
  }> {
    try {
      const timeToAnswer = this.taskFirstResponseTimes.get(taskId);
      const retryCount = this.taskRetryCounts.get(taskId) || 0;

      const efficiencyMetrics = await ContextDatabaseBridge.getProductivityMetrics(
        'AUTONOMOUS_EFFICIENCY',
        undefined,
        1,
        taskId
      );
      const autonomousEfficiency = efficiencyMetrics.length > 0 ? efficiencyMetrics[0].value : undefined;

      const roiMetrics = await ContextDatabaseBridge.getProductivityMetrics(
        'MODEL_ROI',
        undefined,
        1,
        taskId
      );
      const modelROI = roiMetrics.length > 0 ? roiMetrics[0].value : undefined;

      return {
        timeToAnswer,
        retryCount,
        autonomousEfficiency,
        modelROI,
      };
    } catch (error) {
      console.warn('[ProductivityMetrics] Failed to get task summary:', error);
      return {
        retryCount: this.taskRetryCounts.get(taskId) || 0,
      };
    }
  }

  /**
   * Get overall metrics summary
   */
  static getMetrics(): {
    totalTasks: number;
    successfulTasks: number;
    failedTasks: number;
  } {
    // Count tasks from start times
    const totalTasks = this.taskStartTimes.size;
    
    // Count successful tasks (those with first response and no retries or low retries)
    let successfulTasks = 0;
    let failedTasks = 0;
    
    for (const [taskId, retryCount] of this.taskRetryCounts.entries()) {
      const hasResponse = this.taskFirstResponseTimes.has(taskId);
      if (hasResponse && retryCount <= 1) {
        successfulTasks++;
      } else if (retryCount > 2 || !hasResponse) {
        failedTasks++;
      } else {
        successfulTasks++; // Default to success if unclear
      }
    }
    
    return {
      totalTasks,
      successfulTasks,
      failedTasks,
    };
  }

  /**
   * Clean up task tracking
   */
  static cleanupTask(taskId: string): void {
    this.taskStartTimes.delete(taskId);
    this.taskFirstResponseTimes.delete(taskId);
    this.taskRetryCounts.delete(taskId);
  }
}
