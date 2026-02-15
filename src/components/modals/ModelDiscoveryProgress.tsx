/**
 * Model Discovery Progress Component
 * Shows real-time progress during model discovery
 */

import React, { useEffect, useState } from 'react';
import { ModelDiscoveryProgress } from '@/services/modelDiscoveryService';

interface ModelDiscoveryProgressProps {
  progress: ModelDiscoveryProgress | null;
  onClose?: () => void;
}

export const ModelDiscoveryProgressModal: React.FC<ModelDiscoveryProgressProps> = ({
  progress,
  onClose,
}) => {
  if (!progress) return null;

  const isComplete = progress.phase === 'complete';
  const isError = progress.phase === 'error';
  const percentage = progress.totalCount > 0
    ? Math.round((progress.scannedCount / progress.totalCount) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl border border-gray-200/50 bg-white p-8 shadow-2xl dark:border-gray-800/50 dark:bg-gray-900">
        
        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
              {isComplete ? (
                <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : isError ? (
                <svg className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-7 w-7 animate-spin text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {isComplete ? 'Discovery Complete!' : isError ? 'Discovery Failed' : 'Discovering Models'}
              </h2>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {progress.message}
              </p>
            </div>
          </div>
          
          {(isComplete || isError) && onClose && (
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Progress Bar */}
        {!isComplete && !isError && (
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Progress
              </span>
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {percentage}%
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
                style={{ width: `${percentage}%` }}
              />
            </div>
            <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {progress.scannedCount} of {progress.totalCount} models scanned
            </div>
          </div>
        )}

        {/* Current Model */}
        {progress.currentModel && !isComplete && !isError && (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Currently Testing
                </div>
                <div className="font-mono text-xs text-blue-700 dark:text-blue-300">
                  {progress.currentModel}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="grid grid-cols-2 gap-4">
          {/* Working Models */}
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-900/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-900 dark:text-green-100">
                  {progress.workingModels.length}
                </div>
                <div className="text-sm text-green-700 dark:text-green-300">
                  Available
                </div>
              </div>
            </div>
          </div>

          {/* Failed Models */}
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500">
                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-900 dark:text-red-100">
                  {progress.failedModels.length}
                </div>
                <div className="text-sm text-red-700 dark:text-red-300">
                  Unavailable
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Success Message */}
        {isComplete && progress.workingModels.length > 0 && (
          <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-900/20">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-500 text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-green-900 dark:text-green-100">
                  Models Ready to Use!
                </h4>
                <p className="mt-1 text-sm text-green-700 dark:text-green-300">
                  Successfully discovered {progress.workingModels.length} available models. 
                  The best model has been automatically selected for you. You can change it 
                  anytime in the model selector.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {isError && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500 text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-red-900 dark:text-red-100">
                  Discovery Failed
                </h4>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                  {progress.message}
                </p>
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">
                  Please check your API key and try again.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Close Button */}
        {(isComplete || isError) && onClose && (
          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-3 font-semibold text-white shadow-lg transition-all hover:shadow-xl hover:from-blue-600 hover:to-blue-700"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Compact notification toast for model discovery
 */
interface ModelDiscoveryToastProps {
  message: string;
  type: 'info' | 'success' | 'error';
  onClose: () => void;
}

export const ModelDiscoveryToast: React.FC<ModelDiscoveryToastProps> = ({
  message,
  type,
  onClose,
}) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const colors = {
    info: 'from-blue-500 to-blue-600 border-blue-200 dark:border-blue-900',
    success: 'from-green-500 to-green-600 border-green-200 dark:border-green-900',
    error: 'from-red-500 to-red-600 border-red-200 dark:border-red-900',
  };

  const icons = {
    info: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    success: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
  };

  return (
    <div className="fixed bottom-8 right-8 z-50 animate-slide-up">
      <div className={`flex items-center gap-3 rounded-xl border bg-white p-4 shadow-lg dark:bg-gray-900 ${colors[type]}`}>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-r ${colors[type]} text-white`}>
          {icons[type]}
        </div>
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {message}
        </p>
        <button
          onClick={onClose}
          className="ml-2 rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};
