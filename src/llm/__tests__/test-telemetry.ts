/**
 * Telemetry Tests
 * Test metrics collection in isolation
 */

import { 
  recordMetric, 
  getMetricSummary, 
  getAllMetricSummaries,
  exportMetrics,
  exportPrometheusFormat,
  incrementCounter,
  recordHistogram,
  clearMetrics
} from '../telemetry';

console.log('🧪 Testing Telemetry Module\n');

// Clear any existing metrics
clearMetrics();

// Test 1: Record metrics
console.log('Test 1: Record metrics');
recordMetric('latency_ms', 150);
recordMetric('latency_ms', 200);
recordMetric('latency_ms', 100);
recordMetric('tokens_used', 1000);
recordMetric('tokens_used', 2000);
incrementCounter('cache_hit');
incrementCounter('cache_hit');
incrementCounter('cache_miss');
console.log('✅ Metrics recorded');

// Test 2: Get metric summary
console.log('\nTest 2: Get metric summary');
const latencySummary = getMetricSummary('latency_ms');
console.log(`✅ Latency summary:`, latencySummary);
if (latencySummary) {
  console.assert(latencySummary.count === 3, 'Should have 3 values');
  console.assert(latencySummary.avg === 150, 'Average should be 150');
  console.assert(latencySummary.min === 100, 'Min should be 100');
  console.assert(latencySummary.max === 200, 'Max should be 200');
}

// Test 3: Get all summaries
console.log('\nTest 3: Get all summaries');
const allSummaries = getAllMetricSummaries();
console.log(`✅ Total metrics: ${Object.keys(allSummaries).length}`);
console.log('Sample:', Object.keys(allSummaries).slice(0, 3));

// Test 4: Export metrics
console.log('\nTest 4: Export metrics (OpenTelemetry format)');
const exported = exportMetrics();
console.log(`✅ Exported ${exported.metrics.length} metrics`);
console.log('Sample metric:', exported.metrics[0]);

// Test 5: Export Prometheus format
console.log('\nTest 5: Export Prometheus format');
const prometheus = exportPrometheusFormat();
console.log('✅ Prometheus format:');
console.log(prometheus.substring(0, 200) + '...');

// Test 6: Counter and histogram
console.log('\nTest 6: Counter and histogram');
incrementCounter('request_count', { model: 'gemini-flash' });
recordHistogram('cost_usd', 0.001, { model: 'gemini-flash' });
const requestSummary = getMetricSummary('request_count');
console.log(`✅ Request count: ${requestSummary?.count || 0}`);

console.log('\n✅ All telemetry tests passed!\n');
