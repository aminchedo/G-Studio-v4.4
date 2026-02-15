/**
 * PerformanceMetrics Component - Measure Preview Performance
 * Tracks and displays performance metrics for the preview panel
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Activity, Zap, Clock, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  status: 'good' | 'warning' | 'poor';
  threshold: { good: number; warning: number };
}

export interface PerformanceMetricsProps {
  previewRef?: React.RefObject<HTMLIFrameElement>;
  onMetricsUpdate?: (metrics: PerformanceMetric[]) => void;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const PerformanceMetrics: React.FC<PerformanceMetricsProps> = ({
  previewRef,
  onMetricsUpdate,
  autoRefresh = true,
  refreshInterval = 5000,
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [isCollecting, setIsCollecting] = useState(false);
  const [history, setHistory] = useState<{ timestamp: Date; metrics: PerformanceMetric[] }[]>([]);

  // Collect performance metrics
  const collectMetrics = useCallback(async () => {
    if (!previewRef?.current) return;

    setIsCollecting(true);

    try {
      const iframeWindow = previewRef.current.contentWindow;
      if (!iframeWindow) return;

      const newMetrics: PerformanceMetric[] = [];

      // Get performance data
      if (iframeWindow.performance) {
        const perfData = iframeWindow.performance;
        const navigation = perfData.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

        if (navigation) {
          // Page Load Time
          const loadTime = navigation.loadEventEnd - navigation.fetchStart;
          newMetrics.push({
            name: 'Page Load Time',
            value: Math.round(loadTime),
            unit: 'ms',
            status: loadTime < 1000 ? 'good' : loadTime < 3000 ? 'warning' : 'poor',
            threshold: { good: 1000, warning: 3000 },
          });

          // DOM Content Loaded
          const domContentLoaded = navigation.domContentLoadedEventEnd - navigation.fetchStart;
          newMetrics.push({
            name: 'DOM Content Loaded',
            value: Math.round(domContentLoaded),
            unit: 'ms',
            status: domContentLoaded < 800 ? 'good' : domContentLoaded < 2000 ? 'warning' : 'poor',
            threshold: { good: 800, warning: 2000 },
          });

          // First Paint
          const paintEntries = perfData.getEntriesByType('paint');
          const firstPaint = paintEntries.find(e => e.name === 'first-paint');
          if (firstPaint) {
            newMetrics.push({
              name: 'First Paint',
              value: Math.round(firstPaint.startTime),
              unit: 'ms',
              status: firstPaint.startTime < 500 ? 'good' : firstPaint.startTime < 1500 ? 'warning' : 'poor',
              threshold: { good: 500, warning: 1500 },
            });
          }
        }

        // Memory Usage (if available)
        if ((perfData as any).memory) {
          const memory = (perfData as any).memory;
          const usedMemory = memory.usedJSHeapSize / 1048576; // Convert to MB
          newMetrics.push({
            name: 'Memory Usage',
            value: Math.round(usedMemory * 10) / 10,
            unit: 'MB',
            status: usedMemory < 50 ? 'good' : usedMemory < 100 ? 'warning' : 'poor',
            threshold: { good: 50, warning: 100 },
          });
        }
      }

      // Count DOM elements
      const iframeDoc = previewRef.current.contentDocument;
      if (iframeDoc) {
        const elementCount = iframeDoc.getElementsByTagName('*').length;
        newMetrics.push({
          name: 'DOM Elements',
          value: elementCount,
          unit: 'elements',
          status: elementCount < 500 ? 'good' : elementCount < 1500 ? 'warning' : 'poor',
          threshold: { good: 500, warning: 1500 },
        });

        // Count scripts
        const scriptCount = iframeDoc.getElementsByTagName('script').length;
        newMetrics.push({
          name: 'Scripts',
          value: scriptCount,
          unit: 'files',
          status: scriptCount < 10 ? 'good' : scriptCount < 20 ? 'warning' : 'poor',
          threshold: { good: 10, warning: 20 },
        });

        // Count stylesheets
        const styleCount = iframeDoc.getElementsByTagName('link').length + 
                          iframeDoc.getElementsByTagName('style').length;
        newMetrics.push({
          name: 'Stylesheets',
          value: styleCount,
          unit: 'files',
          status: styleCount < 5 ? 'good' : styleCount < 10 ? 'warning' : 'poor',
          threshold: { good: 5, warning: 10 },
        });
      }

      setMetrics(newMetrics);
      setHistory(prev => [...prev.slice(-19), { timestamp: new Date(), metrics: newMetrics }]);
      onMetricsUpdate?.(newMetrics);
    } catch (error) {
      console.error('Failed to collect metrics:', error);
    } finally {
      setIsCollecting(false);
    }
  }, [previewRef, onMetricsUpdate]);

  // Auto-refresh metrics
  useEffect(() => {
    if (!autoRefresh) return;

    collectMetrics();
    const interval = setInterval(collectMetrics, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, collectMetrics]);

  // Get status color
  const getStatusColor = (status: PerformanceMetric['status']) => {
    switch (status) {
      case 'good': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'poor': return 'text-red-400';
    }
  };

  // Get status icon
  const getStatusIcon = (status: PerformanceMetric['status']) => {
    switch (status) {
      case 'good': return <TrendingUp className="w-4 h-4" />;
      case 'warning': return <Activity className="w-4 h-4" />;
      case 'poor': return <TrendingDown className="w-4 h-4" />;
    }
  };

  // Calculate overall score
  const calculateScore = (): number => {
    if (metrics.length === 0) return 0;
    const goodCount = metrics.filter(m => m.status === 'good').length;
    return Math.round((goodCount / metrics.length) * 100);
  };

  const score = calculateScore();

  return (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          <h3 className="font-semibold">Performance Metrics</h3>
        </div>
        <button
          onClick={collectMetrics}
          disabled={isCollecting}
          className="p-2 rounded hover:bg-slate-700 disabled:opacity-50 transition-colors"
          title="Refresh Metrics"
        >
          <RefreshCw className={`w-4 h-4 ${isCollecting ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Overall Score */}
      <div className="p-4 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Performance Score</span>
          <span className={`text-2xl font-bold ${
            score >= 80 ? 'text-green-400' :
            score >= 60 ? 'text-yellow-400' :
            'text-red-400'
          }`}>
            {score}%
          </span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              score >= 80 ? 'bg-green-500' :
              score >= 60 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      {/* Metrics List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {metrics.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No metrics available</p>
            <p className="text-sm mt-1">Load a preview to see performance data</p>
          </div>
        ) : (
          metrics.map((metric, index) => (
            <div key={index} className="p-3 bg-slate-800 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={getStatusColor(metric.status)}>
                    {getStatusIcon(metric.status)}
                  </div>
                  <span className="text-sm font-medium">{metric.name}</span>
                </div>
                <span className="text-lg font-bold">
                  {metric.value} <span className="text-sm text-slate-400">{metric.unit}</span>
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>Good: &lt; {metric.threshold.good}{metric.unit}</span>
                <span>•</span>
                <span>Warning: &lt; {metric.threshold.warning}{metric.unit}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* History Chart (Simple) */}
      {history.length > 0 && (
        <div className="p-4 border-t border-slate-700">
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Performance History
          </h4>
          <div className="h-20 flex items-end gap-1">
            {history.slice(-20).map((entry, index) => {
              const avgScore = entry.metrics.filter(m => m.status === 'good').length / entry.metrics.length * 100;
              return (
                <div
                  key={index}
                  className="flex-1 bg-slate-700 rounded-t transition-all hover:bg-slate-600"
                  style={{ height: `${avgScore}%` }}
                  title={`${Math.round(avgScore)}% at ${entry.timestamp.toLocaleTimeString()}`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Tips */}
      <div className="p-4 border-t border-slate-700 bg-slate-800/50">
        <p className="text-xs text-slate-400">
          💡 Tip: Keep DOM elements under 500 and load time under 1s for optimal performance
        </p>
      </div>
    </div>
  );
};

export default PerformanceMetrics;
