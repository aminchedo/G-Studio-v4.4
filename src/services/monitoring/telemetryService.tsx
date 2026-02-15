/**
 * TelemetryService - Application observability and monitoring
 * 
 * Purpose: Track application health, performance, and usage
 * - Tool execution metrics
 * - Performance monitoring
 * - Error tracking
 * - Usage analytics
 * - Health checks
 * 
 * Usage: Automatic tracking with manual metric recording
 */

import { ErrorContext } from '../errorHandler';

export interface TelemetryMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
  unit?: string;
}

export interface TelemetryEvent {
  name: string;
  timestamp: number;
  properties?: Record<string, any>;
  duration?: number;
}

export interface ToolExecutionMetric {
  toolName: string;
  success: boolean;
  duration: number;
  timestamp: number;
  error?: string;
  args?: Record<string, any>;
}

export interface PerformanceMetric {
  operation: string;
  duration: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface HealthStatus {
  healthy: boolean;
  checks: Record<string, {
    status: 'pass' | 'fail' | 'warn';
    message?: string;
    timestamp: number;
  }>;
  uptime: number;
  version: string;
}

export class TelemetryService {
  private static metrics: TelemetryMetric[] = [];
  private static events: TelemetryEvent[] = [];
  private static toolExecutions: ToolExecutionMetric[] = [];
  private static performanceMetrics: PerformanceMetric[] = [];
  private static errors: ErrorContext[] = [];
  
  private static maxMetrics = 1000;
  private static maxEvents = 500;
  private static maxToolExecutions = 500;
  private static maxPerformanceMetrics = 500;
  private static maxErrors = 100;
  
  private static startTime = Date.now();
  private static enabled = true;

  /**
   * Initialize telemetry service
   */
  static initialize(options: {
    enabled?: boolean;
    maxMetrics?: number;
    maxEvents?: number;
  } = {}) {
    this.enabled = options.enabled ?? true;
    this.maxMetrics = options.maxMetrics ?? 1000;
    this.maxEvents = options.maxEvents ?? 500;
    this.startTime = Date.now();
  }

  /**
   * Record a metric
   */
  static recordMetric(
    name: string,
    value: number,
    tags?: Record<string, string>,
    unit?: string
  ): void {
    if (!this.enabled) return;

    const metric: TelemetryMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags,
      unit,
    };

    this.metrics.push(metric);
    this.trimArray(this.metrics, this.maxMetrics);
  }

  /**
   * Record an event
   */
  static recordEvent(
    name: string,
    properties?: Record<string, any>,
    duration?: number
  ): void {
    if (!this.enabled) return;

    const event: TelemetryEvent = {
      name,
      timestamp: Date.now(),
      properties,
      duration,
    };

    this.events.push(event);
    this.trimArray(this.events, this.maxEvents);
  }

  /**
   * Record tool execution
   */
  static recordToolExecution(
    toolName: string,
    success: boolean,
    duration: number,
    error?: string,
    args?: Record<string, any>
  ): void {
    if (!this.enabled) return;

    const metric: ToolExecutionMetric = {
      toolName,
      success,
      duration,
      timestamp: Date.now(),
      error,
      args: this.sanitizeArgs(args),
    };

    this.toolExecutions.push(metric);
    this.trimArray(this.toolExecutions, this.maxToolExecutions);

    // Also record as metric
    this.recordMetric('tool_execution', 1, {
      tool: toolName,
      success: success.toString(),
    });
    this.recordMetric('tool_duration', duration, {
      tool: toolName,
    }, 'ms');
  }

  /**
   * Record performance metric
   */
  static recordPerformance(
    operation: string,
    duration: number,
    metadata?: Record<string, any>
  ): void {
    if (!this.enabled) return;

    const metric: PerformanceMetric = {
      operation,
      duration,
      timestamp: Date.now(),
      metadata,
    };

    this.performanceMetrics.push(metric);
    this.trimArray(this.performanceMetrics, this.maxPerformanceMetrics);

    // Also record as metric
    this.recordMetric('performance', duration, {
      operation,
    }, 'ms');
  }

  /**
   * Record error
   */
  static recordError(errorContext: ErrorContext): void {
    if (!this.enabled) return;

    this.errors.push(errorContext);
    this.trimArray(this.errors, this.maxErrors);

    // Also record as metric
    this.recordMetric('error_count', 1, {
      code: errorContext.code,
      recoverable: errorContext.recoverable.toString(),
    });
  }

  /**
   * Start performance timer
   */
  static startTimer(operation: string): () => void {
    const startTime = Date.now();
    
    return () => {
      const duration = Date.now() - startTime;
      this.recordPerformance(operation, duration);
      return duration;
    };
  }

  /**
   * Wrap async operation with timing
   */
  static async measureAsync<T>(
    operation: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - startTime;
      this.recordPerformance(operation, duration, metadata);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordPerformance(operation, duration, {
        ...metadata,
        error: true,
      });
      throw error;
    }
  }

  /**
   * Wrap sync operation with timing
   */
  static measureSync<T>(
    operation: string,
    fn: () => T,
    metadata?: Record<string, any>
  ): T {
    const startTime = Date.now();
    try {
      const result = fn();
      const duration = Date.now() - startTime;
      this.recordPerformance(operation, duration, metadata);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordPerformance(operation, duration, {
        ...metadata,
        error: true,
      });
      throw error;
    }
  }

  /**
   * Get tool execution statistics
   */
  static getToolStats(): {
    total: number;
    successful: number;
    failed: number;
    byTool: Record<string, {
      total: number;
      successful: number;
      failed: number;
      avgDuration: number;
    }>;
    avgDuration: number;
  } {
    const byTool: Record<string, {
      total: number;
      successful: number;
      failed: number;
      totalDuration: number;
    }> = {};

    let totalDuration = 0;

    for (const execution of this.toolExecutions) {
      if (!byTool[execution.toolName]) {
        byTool[execution.toolName] = {
          total: 0,
          successful: 0,
          failed: 0,
          totalDuration: 0,
        };
      }

      byTool[execution.toolName].total++;
      if (execution.success) {
        byTool[execution.toolName].successful++;
      } else {
        byTool[execution.toolName].failed++;
      }
      byTool[execution.toolName].totalDuration += execution.duration;
      totalDuration += execution.duration;
    }

    // Calculate averages
    const byToolWithAvg: Record<string, {
      total: number;
      successful: number;
      failed: number;
      avgDuration: number;
    }> = {};

    for (const [tool, stats] of Object.entries(byTool)) {
      byToolWithAvg[tool] = {
        total: stats.total,
        successful: stats.successful,
        failed: stats.failed,
        avgDuration: stats.total > 0 ? stats.totalDuration / stats.total : 0,
      };
    }

    return {
      total: this.toolExecutions.length,
      successful: this.toolExecutions.filter(e => e.success).length,
      failed: this.toolExecutions.filter(e => !e.success).length,
      byTool: byToolWithAvg,
      avgDuration: this.toolExecutions.length > 0 
        ? totalDuration / this.toolExecutions.length 
        : 0,
    };
  }

  /**
   * Get performance statistics
   */
  static getPerformanceStats(): {
    byOperation: Record<string, {
      count: number;
      avgDuration: number;
      minDuration: number;
      maxDuration: number;
      p50: number;
      p95: number;
      p99: number;
    }>;
  } {
    const byOperation: Record<string, number[]> = {};

    for (const metric of this.performanceMetrics) {
      if (!byOperation[metric.operation]) {
        byOperation[metric.operation] = [];
      }
      byOperation[metric.operation].push(metric.duration);
    }

    const stats: Record<string, {
      count: number;
      avgDuration: number;
      minDuration: number;
      maxDuration: number;
      p50: number;
      p95: number;
      p99: number;
    }> = {};

    for (const [operation, durations] of Object.entries(byOperation)) {
      const sorted = [...durations].sort((a, b) => a - b);
      const sum = durations.reduce((a, b) => a + b, 0);

      stats[operation] = {
        count: durations.length,
        avgDuration: sum / durations.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        p50: this.percentile(sorted, 50),
        p95: this.percentile(sorted, 95),
        p99: this.percentile(sorted, 99),
      };
    }

    return { byOperation: stats };
  }

  /**
   * Get health status
   */
  static getHealthStatus(): HealthStatus {
    const checks: HealthStatus['checks'] = {};

    // Check error rate
    const recentErrors = this.errors.filter(
      e => Date.now() - e.timestamp < 60000 // Last minute
    );
    checks['error_rate'] = {
      status: recentErrors.length > 10 ? 'fail' : recentErrors.length > 5 ? 'warn' : 'pass',
      message: `${recentErrors.length} errors in last minute`,
      timestamp: Date.now(),
    };

    // Check tool success rate
    const recentTools = this.toolExecutions.filter(
      e => Date.now() - e.timestamp < 60000
    );
    const successRate = recentTools.length > 0
      ? recentTools.filter(e => e.success).length / recentTools.length
      : 1;
    checks['tool_success_rate'] = {
      status: successRate < 0.8 ? 'fail' : successRate < 0.95 ? 'warn' : 'pass',
      message: `${(successRate * 100).toFixed(1)}% success rate`,
      timestamp: Date.now(),
    };

    // Check performance
    const recentPerf = this.performanceMetrics.filter(
      m => Date.now() - m.timestamp < 60000
    );
    const avgDuration = recentPerf.length > 0
      ? recentPerf.reduce((sum, m) => sum + m.duration, 0) / recentPerf.length
      : 0;
    checks['performance'] = {
      status: avgDuration > 1000 ? 'warn' : 'pass',
      message: `${avgDuration.toFixed(0)}ms average duration`,
      timestamp: Date.now(),
    };

    const healthy = Object.values(checks).every(c => c.status !== 'fail');

    return {
      healthy,
      checks,
      uptime: Date.now() - this.startTime,
      version: '2.0.0',
    };
  }

  /**
   * Get recent metrics
   */
  static getRecentMetrics(count: number = 100): TelemetryMetric[] {
    return this.metrics.slice(-count);
  }

  /**
   * Get recent events
   */
  static getRecentEvents(count: number = 100): TelemetryEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Get recent tool executions
   */
  static getRecentToolExecutions(count: number = 100): ToolExecutionMetric[] {
    return this.toolExecutions.slice(-count);
  }

  /**
   * Get recent errors
   */
  static getRecentErrors(count: number = 100): ErrorContext[] {
    return this.errors.slice(-count);
  }

  /**
   * Clear all telemetry data
   */
  static clear(): void {
    this.metrics = [];
    this.events = [];
    this.toolExecutions = [];
    this.performanceMetrics = [];
    this.errors = [];
  }

  /**
   * Enable/disable telemetry
   */
  static setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if telemetry is enabled
   */
  static isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Get summary statistics
   */
  static getSummary(): {
    uptime: number;
    metricsCount: number;
    eventsCount: number;
    toolExecutionsCount: number;
    errorsCount: number;
    healthStatus: HealthStatus;
  } {
    return {
      uptime: Date.now() - this.startTime,
      metricsCount: this.metrics.length,
      eventsCount: this.events.length,
      toolExecutionsCount: this.toolExecutions.length,
      errorsCount: this.errors.length,
      healthStatus: this.getHealthStatus(),
    };
  }

  /**
   * Helper: Trim array to max size
   */
  private static trimArray<T>(array: T[], maxSize: number): void {
    if (array.length > maxSize) {
      array.splice(0, array.length - maxSize);
    }
  }

  /**
   * Helper: Calculate percentile
   */
  private static percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  /**
   * Helper: Sanitize args for logging
   */
  private static sanitizeArgs(args?: Record<string, any>): Record<string, any> | undefined {
    if (!args) return undefined;

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(args)) {
      // Truncate long strings
      if (typeof value === 'string' && value.length > 100) {
        sanitized[key] = value.substring(0, 100) + '...';
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}
