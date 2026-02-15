/**
 * GeminiTesterControls - Test Control Panel
 * 
 * Component for test execution controls and progress display
 */

import React from 'react';
import { Play, Square, RefreshCw, Download, Trash2, TrendingUp, Clock, CheckCircle2 } from 'lucide-react';
import { useTestControls, useGeminiTester } from './GeminiTesterContext';

export const GeminiTesterControls: React.FC = React.memo(() => {
  const { testing, progress, successRate, startTest, stopTest, clearResults } = useTestControls();
  const { results, exportResults } = useGeminiTester();

  /**
   * Format time remaining
   */
  const formatTimeRemaining = (): string => {
    if (!testing || progress.current === 0) return '--:--';
    
    const avgTimePerModel = 2; // seconds (estimate)
    const remaining = (progress.total - progress.current) * avgTimePerModel;
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-2">Test Controls</h2>
        <p className="text-sm text-slate-400">
          Start testing, monitor progress, and manage results
        </p>
      </div>

      {/* Main Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Start/Stop Button */}
        <button
          onClick={testing ? stopTest : startTest}
          disabled={testing && progress.current === 0}
          className={`flex items-center justify-center gap-3 px-6 py-4 rounded-lg font-medium transition-all ${
            testing
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {testing ? (
            <>
              <Square className="w-5 h-5" />
              Stop Testing
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Start Testing
            </>
          )}
        </button>

        {/* Clear Results Button */}
        <button
          onClick={clearResults}
          disabled={testing || !results}
          className="flex items-center justify-center gap-3 px-6 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 rounded-lg font-medium text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-5 h-5" />
          Clear Results
        </button>
      </div>

      {/* Progress Section */}
      {(testing || results) && (
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-300 font-medium">
                Progress: {progress.current} / {progress.total} models
              </span>
              <span className="text-slate-400">
                {progress.percentage}%
              </span>
            </div>
            
            <div className="relative h-3 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-300 ease-out"
                style={{ width: `${progress.percentage}%` }}
              />
              {testing && (
                <div
                  className="absolute inset-y-0 left-0 bg-blue-400/30 animate-pulse"
                  style={{ width: `${progress.percentage + 5}%` }}
                />
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Success Rate */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-xs text-slate-400 font-medium">Success Rate</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-white">
                  {successRate}%
                </span>
                {successRate >= 80 && (
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                )}
              </div>
            </div>

            {/* Time Remaining */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span className="text-xs text-slate-400 font-medium">
                  {testing ? 'Time Remaining' : 'Completed'}
                </span>
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                {testing ? formatTimeRemaining() : '✓'}
              </div>
            </div>

            {/* Models Tested */}
            <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-slate-400 font-medium">Models Tested</span>
              </div>
              <div className="text-2xl font-bold text-white">
                {progress.current}
                <span className="text-lg text-slate-400 ml-1">/ {progress.total}</span>
              </div>
            </div>
          </div>

          {/* Status Message */}
          {testing && (
            <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-blue-400 animate-spin" />
                <div className="flex-1">
                  <p className="text-sm text-blue-300 font-medium">
                    Testing in progress...
                  </p>
                  <p className="text-xs text-blue-200 mt-1">
                    Please wait while we test all available models. This may take a few minutes.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Completion Message */}
          {!testing && results && progress.current === progress.total && (
            <div className="bg-green-900/20 border border-green-800/30 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-400" />
                <div className="flex-1">
                  <p className="text-sm text-green-300 font-medium">
                    Testing complete!
                  </p>
                  <p className="text-xs text-green-200 mt-1">
                    Successfully tested {progress.total} models. Check the Results tab for details.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Export Section */}
      {results && !testing && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Download className="w-5 h-5 text-yellow-400" />
            <h3 className="text-lg font-medium text-white">Export Results</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => exportResults('json')}
              className="flex items-center justify-center gap-3 px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-yellow-600 rounded-lg font-medium text-white transition-all"
            >
              <Download className="w-5 h-5 text-yellow-400" />
              Export as JSON
            </button>

            <button
              onClick={() => exportResults('csv')}
              className="flex items-center justify-center gap-3 px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-yellow-600 rounded-lg font-medium text-white transition-all"
            >
              <Download className="w-5 h-5 text-yellow-400" />
              Export as CSV
            </button>
          </div>

          <p className="text-xs text-slate-400 text-center">
            Export your test results for analysis or sharing
          </p>
        </div>
      )}

      {/* Empty State */}
      {!testing && !results && (
        <div className="bg-slate-800 border border-slate-700 rounded-lg p-8 text-center">
          <Play className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400 mb-2">No tests running</p>
          <p className="text-sm text-slate-500">
            Configure your API key and click "Start Testing" to begin
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-4">
        <p className="text-sm text-slate-300 mb-2">
          <strong>ℹ️ About Testing:</strong>
        </p>
        <ul className="text-sm text-slate-400 space-y-1 ml-4 list-disc">
          <li>Testing discovers and validates all available Gemini models</li>
          <li>Each model is tested for accessibility, streaming, and multimodal support</li>
          <li>Results are cached for 24 hours to speed up subsequent tests</li>
          <li>You can stop testing at any time - partial results will be saved</li>
        </ul>
      </div>
    </div>
  );
});

GeminiTesterControls.displayName = 'GeminiTesterControls';
