/**
 * ProgressIndicators Component - Progress Bars and Loading States
 * Provides various progress indicators for long-running operations
 */

import React, { useState, useEffect } from "react";
import { Loader2, CheckCircle, XCircle, Clock, Zap, X } from "lucide-react";

export interface ProgressStep {
  id: string;
  label: string;
  status: "pending" | "active" | "completed" | "error";
  progress?: number; // 0-100
  message?: string;
  timestamp?: Date;
}

export interface ProgressIndicatorProps {
  steps: ProgressStep[];
  currentStep?: number;
  onCancel?: () => void;
  showTimeEstimate?: boolean;
  estimatedTime?: number; // milliseconds
  compact?: boolean;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  steps,
  currentStep = 0,
  onCancel,
  showTimeEstimate = false,
  estimatedTime,
  compact = false,
}) => {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [startTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Date.now() - startTime);
    }, 100);

    return () => clearInterval(interval);
  }, [startTime]);

  const getStepIcon = (step: ProgressStep) => {
    switch (step.status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case "error":
        return <XCircle className="w-4 h-4 text-red-400" />;
      case "active":
        return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
      default:
        return (
          <div className="w-4 h-4 rounded-full border-2 border-slate-600" />
        );
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
      return `${minutes}m ${remainingSeconds}s`;
    }
    return `${seconds}s`;
  };

  const calculateRemainingTime = () => {
    if (!estimatedTime || currentStep === 0) return null;

    const avgTimePerStep = elapsedTime / currentStep;
    const remainingSteps = steps.length - currentStep;
    const remaining = avgTimePerStep * remainingSteps;

    return Math.max(0, remaining);
  };

  const remainingTime = calculateRemainingTime();

  if (compact) {
    const activeStep = steps[currentStep];
    const totalProgress = (currentStep / steps.length) * 100;

    return (
      <div className="bg-slate-800 border border-slate-700 rounded-lg p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
            <span className="text-sm text-white">
              {activeStep?.label || "Processing..."}
            </span>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-1 hover:bg-slate-700 rounded transition-colors"
              title="Cancel"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all duration-300"
              style={{ width: `${totalProgress}%` }}
            />
          </div>
          <span className="text-xs text-slate-400">
            {currentStep}/{steps.length}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
          <h3 className="text-sm font-semibold text-white">Processing</h3>
        </div>

        <div className="flex items-center gap-3">
          {showTimeEstimate && (
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <Clock className="w-3 h-3" />
              {remainingTime !== null ? (
                <span>~{formatTime(remainingTime)} remaining</span>
              ) : (
                <span>{formatTime(elapsedTime)} elapsed</span>
              )}
            </div>
          )}

          {onCancel && (
            <button
              onClick={onCancel}
              className="px-3 py-1 text-xs text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Steps */}
      <div className="p-4 space-y-3">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex-shrink-0 mt-0.5">{getStepIcon(step)}</div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-sm font-medium ${
                    step.status === "completed"
                      ? "text-green-400"
                      : step.status === "error"
                        ? "text-red-400"
                        : step.status === "active"
                          ? "text-blue-400"
                          : "text-slate-400"
                  }`}
                >
                  {step.label}
                </span>

                {step.timestamp && step.status === "completed" && (
                  <span className="text-xs text-slate-500">
                    {step.timestamp.toLocaleTimeString()}
                  </span>
                )}
              </div>

              {step.message && (
                <p className="text-xs text-slate-400 mb-2">{step.message}</p>
              )}

              {/* Progress Bar for Active Step */}
              {step.status === "active" && step.progress !== undefined && (
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${step.progress}%` }}
                    />
                  </div>
                  <span className="text-xs text-slate-400">
                    {step.progress}%
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Overall Progress */}
      <div className="px-4 py-3 bg-slate-800 border-t border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
          <span>Overall Progress</span>
          <span>
            {currentStep} of {steps.length} steps completed
          </span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

// Simple Loading Spinner
export interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  text?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "md",
  text,
  className = "",
}) => {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Loader2 className={`${sizeClasses[size]} text-blue-400 animate-spin`} />
      {text && <span className="text-sm text-slate-300">{text}</span>}
    </div>
  );
};

// Skeleton Loader
export interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  variant?: "text" | "circular" | "rectangular";
}

export const Skeleton: React.FC<SkeletonProps> = ({
  width = "100%",
  height = "1rem",
  className = "",
  variant = "rectangular",
}) => {
  const variantClasses = {
    text: "rounded",
    circular: "rounded-full",
    rectangular: "rounded-lg",
  };

  return (
    <div
      className={`bg-slate-700 animate-pulse ${variantClasses[variant]} ${className}`}
      style={{ width, height }}
    />
  );
};

// Progress Toast
export interface ProgressToastProps {
  message: string;
  progress: number; // 0-100
  onClose?: () => void;
}

export const ProgressToast: React.FC<ProgressToastProps> = ({
  message,
  progress,
  onClose,
}) => {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-4 min-w-[300px]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-white">{message}</span>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-slate-400">{progress}%</span>
      </div>
    </div>
  );
};

// Indeterminate Progress Bar
export interface IndeterminateProgressProps {
  message?: string;
  className?: string;
}

export const IndeterminateProgress: React.FC<IndeterminateProgressProps> = ({
  message,
  className = "",
}) => {
  return (
    <div className={className}>
      {message && <p className="text-sm text-slate-300 mb-2">{message}</p>}
      <div className="h-1 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full w-1/3 bg-blue-500 animate-[slide_1.5s_ease-in-out_infinite]" />
      </div>
      <style>{`
        @keyframes slide {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(400%);
          }
        }
      `}</style>
    </div>
  );
};

// Hook for managing progress
export const useProgress = (totalSteps: number) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isCancelled, setIsCancelled] = useState(false);

  const initializeSteps = (stepLabels: string[]) => {
    const initialSteps: ProgressStep[] = stepLabels.map((label, index) => ({
      id: `step-${index}`,
      label,
      status: "pending",
    }));
    setSteps(initialSteps);
    setCurrentStep(0);
    setIsComplete(false);
    setIsCancelled(false);
  };

  const startStep = (stepIndex: number, message?: string) => {
    setSteps((prev) =>
      prev.map((step, index) =>
        index === stepIndex
          ? { ...step, status: "active", message, timestamp: new Date() }
          : step,
      ),
    );
    setCurrentStep(stepIndex);
  };

  const updateStepProgress = (stepIndex: number, progress: number) => {
    setSteps((prev) =>
      prev.map((step, index) =>
        index === stepIndex ? { ...step, progress } : step,
      ),
    );
  };

  const completeStep = (stepIndex: number, message?: string) => {
    setSteps((prev) =>
      prev.map((step, index) =>
        index === stepIndex
          ? { ...step, status: "completed", message, timestamp: new Date() }
          : step,
      ),
    );

    if (stepIndex === totalSteps - 1) {
      setIsComplete(true);
    }
  };

  const errorStep = (stepIndex: number, message: string) => {
    setSteps((prev) =>
      prev.map((step, index) =>
        index === stepIndex
          ? { ...step, status: "error", message, timestamp: new Date() }
          : step,
      ),
    );
  };

  const cancel = () => {
    setIsCancelled(true);
  };

  const reset = () => {
    setSteps((prev) =>
      prev.map((step) => ({ ...step, status: "pending", progress: undefined })),
    );
    setCurrentStep(0);
    setIsComplete(false);
    setIsCancelled(false);
  };

  return {
    steps,
    currentStep,
    isComplete,
    isCancelled,
    initializeSteps,
    startStep,
    updateStepProgress,
    completeStep,
    errorStep,
    cancel,
    reset,
  };
};
