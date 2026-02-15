/**
 * Code Metrics Panel
 * Displays comprehensive code quality metrics and statistics
 */

import React from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  FileCode,
  GitBranch,
  Layers,
  Zap,
} from 'lucide-react';
import type { CodeMetrics } from '@/stores/codeIntelligenceStore';

interface CodeMetricsPanelProps {
  metrics: CodeMetrics | null;
  isLoading?: boolean;
}

interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  status?: 'good' | 'warning' | 'error';
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  icon: Icon,
  label,
  value,
  trend,
  status = 'good',
  subtitle,
}) => {
  const statusColors = {
    good: 'text-emerald-600 dark:text-emerald-400',
    warning: 'text-amber-600 dark:text-amber-400',
    error: 'text-red-600 dark:text-red-400',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${statusColors[status]}`} />
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {label}
          </span>
        </div>
        {TrendIcon && (
          <TrendIcon className={`w-4 h-4 ${trend === 'up' ? 'text-emerald-500' : 'text-red-500'}`} />
        )}
      </div>
      <div className="mt-2">
        <div className={`text-2xl font-bold ${statusColors[status]}`}>
          {value}
        </div>
        {subtitle && (
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};

const QualityScoreCard: React.FC<{ score: number }> = ({ score }) => {
  const getScoreStatus = (score: number): 'good' | 'warning' | 'error' => {
    if (score >= 80) return 'good';
    if (score >= 60) return 'warning';
    return 'error';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    if (score >= 60) return 'Needs Improvement';
    return 'Poor';
  };

  const status = getScoreStatus(score);
  const label = getScoreLabel(score);

  const statusColors = {
    good: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20',
    warning: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20',
    error: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20',
  };

  return (
    <div className={`rounded-lg p-6 border-2 ${statusColors[status]}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {status === 'good' ? (
            <CheckCircle className="w-8 h-8 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-amber-600 dark:text-amber-400" />
          )}
          <div>
            <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Overall Quality Score
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {label}
            </div>
          </div>
        </div>
        <div className="text-4xl font-bold">
          {score}
          <span className="text-2xl text-slate-500">/100</span>
        </div>
      </div>
      <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
        <div
          className={`h-3 rounded-full transition-all duration-500 ${
            status === 'good'
              ? 'bg-emerald-500'
              : status === 'warning'
              ? 'bg-amber-500'
              : 'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
};

export const CodeMetricsPanel: React.FC<CodeMetricsPanelProps> = ({
  metrics,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 dark:text-slate-400">
        <BarChart3 className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg font-medium">No metrics available</p>
        <p className="text-sm">Run an analysis to see code metrics</p>
      </div>
    );
  }

  const qualityScore = Math.round(
    (metrics.maintainabilityIndex * 0.4 +
      (100 - metrics.technicalDebtRatio) * 0.3 +
      (100 - metrics.duplicationPercentage) * 0.2 +
      metrics.testCoverage * 0.1)
  );

  const getComplexityStatus = (complexity: number): 'good' | 'warning' | 'error' => {
    if (complexity <= 10) return 'good';
    if (complexity <= 20) return 'warning';
    return 'error';
  };

  const getTechnicalDebtStatus = (ratio: number): 'good' | 'warning' | 'error' => {
    if (ratio <= 5) return 'good';
    if (ratio <= 10) return 'warning';
    return 'error';
  };

  return (
    <div className="space-y-6">
      {/* Quality Score */}
      <QualityScoreCard score={qualityScore} />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          icon={FileCode}
          label="Lines of Code"
          value={metrics.linesOfCode.toLocaleString()}
          subtitle={`${metrics.numberOfFiles} files`}
          status="good"
        />

        <MetricCard
          icon={Layers}
          label="Functions & Classes"
          value={`${metrics.numberOfFunctions + metrics.numberOfClasses}`}
          subtitle={`${metrics.numberOfFunctions} functions, ${metrics.numberOfClasses} classes`}
          status="good"
        />

        <MetricCard
          icon={GitBranch}
          label="Avg Complexity"
          value={metrics.averageComplexity.toFixed(1)}
          subtitle={`Max: ${metrics.maxComplexity}`}
          status={getComplexityStatus(metrics.averageComplexity)}
        />

        <MetricCard
          icon={Zap}
          label="Maintainability"
          value={`${metrics.maintainabilityIndex}%`}
          subtitle="Index score"
          status={metrics.maintainabilityIndex >= 70 ? 'good' : metrics.maintainabilityIndex >= 50 ? 'warning' : 'error'}
        />

        <MetricCard
          icon={AlertTriangle}
          label="Technical Debt"
          value={`${metrics.technicalDebtRatio.toFixed(1)}%`}
          subtitle="Debt ratio"
          status={getTechnicalDebtStatus(metrics.technicalDebtRatio)}
        />

        <MetricCard
          icon={BarChart3}
          label="Code Duplication"
          value={`${metrics.duplicationPercentage.toFixed(1)}%`}
          subtitle="Duplicate code"
          status={metrics.duplicationPercentage <= 5 ? 'good' : metrics.duplicationPercentage <= 10 ? 'warning' : 'error'}
        />

        <MetricCard
          icon={CheckCircle}
          label="Test Coverage"
          value={`${metrics.testCoverage}%`}
          subtitle="Code coverage"
          status={metrics.testCoverage >= 80 ? 'good' : metrics.testCoverage >= 60 ? 'warning' : 'error'}
        />
      </div>

      {/* Detailed Stats */}
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 border border-slate-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
          Detailed Statistics
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-600 dark:text-slate-400">Total Files:</span>
            <span className="ml-2 font-medium text-slate-900 dark:text-white">
              {metrics.numberOfFiles}
            </span>
          </div>
          <div>
            <span className="text-slate-600 dark:text-slate-400">Total Functions:</span>
            <span className="ml-2 font-medium text-slate-900 dark:text-white">
              {metrics.numberOfFunctions}
            </span>
          </div>
          <div>
            <span className="text-slate-600 dark:text-slate-400">Total Classes:</span>
            <span className="ml-2 font-medium text-slate-900 dark:text-white">
              {metrics.numberOfClasses}
            </span>
          </div>
          <div>
            <span className="text-slate-600 dark:text-slate-400">Avg Lines/File:</span>
            <span className="ml-2 font-medium text-slate-900 dark:text-white">
              {Math.round(metrics.linesOfCode / metrics.numberOfFiles)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
