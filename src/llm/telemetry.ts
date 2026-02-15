/**
 * Telemetry and Metrics Collection
 * OpenTelemetry-compatible metrics export
 * Tracks latency, token usage, cache hits, costs, and more
 */

export type MetricName =
  | 'latency_ms'
  | 'tokens_used'
  | 'tokens_prompt'
  | 'tokens_completion'
  | 'cache_hit'
  | 'cache_miss'
  | 'cost_usd'
  | 'quota_exceeded'
  | 'request_count'
  | 'error_count';

export interface MetricValue {
  value: number;
  timestamp: number;
  labels?: Record<string, string>;
}

export interface MetricSummary {
  name: string;
  count: number;
  sum: number;
  avg: number;
  min: number;
  max: number;
  latest: number;
}

// In-memory metrics storage
const metrics: Map<string, MetricValue[]> = new Map();

/**
 * Record a metric value
 */
export function recordMetric(
  name: MetricName,
  value: number,
  labels?: Record<string, string>
): void {
  const key = name;
  if (!metrics.has(key)) {
    metrics.set(key, []);
  }
  
  const metricValues = metrics.get(key)!;
  metricValues.push({
    value,
    timestamp: Date.now(),
    labels,
  });
  
  // Keep only last 10000 values per metric (prevent memory leak)
  if (metricValues.length > 10000) {
    metricValues.shift();
  }
}

/**
 * Get metric summary
 */
export function getMetricSummary(name: MetricName): MetricSummary | null {
  const values = metrics.get(name);
  if (!values || values.length === 0) {
    return null;
  }
  
  const numericValues = values.map(v => v.value);
  const sum = numericValues.reduce((a, b) => a + b, 0);
  const avg = sum / numericValues.length;
  const min = Math.min(...numericValues);
  const max = Math.max(...numericValues);
  const latest = numericValues[numericValues.length - 1];
  
  return {
    name,
    count: values.length,
    sum,
    avg,
    min,
    max,
    latest,
  };
}

/**
 * Get all metric summaries
 */
export function getAllMetricSummaries(): Record<string, MetricSummary> {
  const summaries: Record<string, MetricSummary> = {};
  
  for (const name of metrics.keys()) {
    const summary = getMetricSummary(name as MetricName);
    if (summary) {
      summaries[name] = summary;
    }
  }
  
  return summaries;
}

/**
 * Export metrics in OpenTelemetry-compatible format
 * Returns metrics in a format suitable for Prometheus/OTEL collectors
 */
export function exportMetrics(): {
  metrics: Array<{
    name: string;
    type: 'counter' | 'gauge' | 'histogram';
    value: number;
    labels?: Record<string, string>;
  }>;
  summaries: Record<string, MetricSummary>;
} {
  const exported: Array<{
    name: string;
    type: 'counter' | 'gauge' | 'histogram';
    value: number;
    labels?: Record<string, string>;
  }> = [];
  
  for (const [name, values] of metrics.entries()) {
    if (values.length === 0) continue;
    
    // Determine metric type based on name
    let type: 'counter' | 'gauge' | 'histogram' = 'gauge';
    if (name.includes('count') || name.includes('hit') || name.includes('miss')) {
      type = 'counter';
    } else if (name.includes('latency') || name.includes('tokens') || name.includes('cost')) {
      type = 'histogram';
    }
    
    // Export latest value
    const latest = values[values.length - 1];
    exported.push({
      name: `llm_${name}`,
      type,
      value: latest.value,
      labels: latest.labels,
    });
  }
  
  return {
    metrics: exported,
    summaries: getAllMetricSummaries(),
  };
}

/**
 * Export metrics in Prometheus format
 */
export function exportPrometheusFormat(): string {
  const exported = exportMetrics();
  const lines: string[] = [];
  
  for (const metric of exported.metrics) {
    const labels = metric.labels
      ? `{${Object.entries(metric.labels).map(([k, v]) => `${k}="${v}"`).join(',')}}`
      : '';
    
    lines.push(`# TYPE ${metric.name} ${metric.type}`);
    lines.push(`${metric.name}${labels} ${metric.value}`);
  }
  
  return lines.join('\n') + '\n';
}

/**
 * Clear all metrics (use with caution)
 */
export function clearMetrics(): void {
  metrics.clear();
}

/**
 * Get metrics for a specific time range
 */
export function getMetricsInRange(
  name: MetricName,
  startTime: number,
  endTime: number
): MetricValue[] {
  const values = metrics.get(name);
  if (!values) {
    return [];
  }
  
  return values.filter(v => v.timestamp >= startTime && v.timestamp <= endTime);
}

/**
 * Increment a counter metric
 */
export function incrementCounter(
  name: MetricName,
  labels?: Record<string, string>
): void {
  recordMetric(name, 1, labels);
}

/**
 * Record a histogram value
 */
export function recordHistogram(
  name: MetricName,
  value: number,
  labels?: Record<string, string>
): void {
  recordMetric(name, value, labels);
}
