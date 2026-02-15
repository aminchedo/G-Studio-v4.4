/**
 * Metrics ↔ Decomposition Feedback Loop
 *
 * Analyzes metrics to improve task decomposition over time.
 */

import {
  ProductivityMetrics,
  MetricAggregation,
} from "./monitoring/productivityMetrics";
import { ContextDatabaseBridge } from "./storage/contextDatabaseBridge";
import {
  TaskDecompositionEngine,
  DecomposedStep,
} from "./taskDecompositionEngine";

export type AdjustmentType =
  | "STEP_GRANULARITY"
  | "RISK_ESTIMATION"
  | "MODEL_SELECTION_HINT"
  | "TIME_ESTIMATION";

export interface PlanningFeedback {
  id: string;
  taskType: string;
  adjustmentType: AdjustmentType;
  adjustmentValue: any;
  reason: string;
  appliedAt: number;
}

export class PlanningFeedbackService {
  private static readonly MIN_SAMPLES_FOR_FEEDBACK = 5;
  private static readonly OVER_PLANNING_THRESHOLD = 0.3; // If >30% steps unused, over-planning
  private static readonly UNDER_PLANNING_THRESHOLD = 0.5; // If >50% steps fail, under-planning

  /**
   * Analyze metrics and generate feedback
   */
  static async analyzeAndGenerateFeedback(
    taskType: string,
  ): Promise<PlanningFeedback[]> {
    const feedbacks: PlanningFeedback[] = [];

    // Get autonomous efficiency metrics
    const efficiencyMetrics = await ProductivityMetrics.getAggregatedMetrics(
      "AUTONOMOUS_EFFICIENCY",
      taskType,
      50,
    );

    if (
      !efficiencyMetrics ||
      efficiencyMetrics.count < this.MIN_SAMPLES_FOR_FEEDBACK
    ) {
      return feedbacks; // Not enough data
    }

    // Analyze step granularity
    const granularityFeedback = await this.analyzeStepGranularity(
      taskType,
      efficiencyMetrics,
    );
    if (granularityFeedback) {
      feedbacks.push(granularityFeedback);
    }

    // Analyze risk estimation
    const riskFeedback = await this.analyzeRiskEstimation(taskType);
    if (riskFeedback) {
      feedbacks.push(riskFeedback);
    }

    // Analyze time estimation
    const timeFeedback = await this.analyzeTimeEstimation(taskType);
    if (timeFeedback) {
      feedbacks.push(timeFeedback);
    }

    // Analyze model selection
    const modelFeedback = await this.analyzeModelSelection(taskType);
    if (modelFeedback) {
      feedbacks.push(modelFeedback);
    }

    // Store feedbacks
    for (const feedback of feedbacks) {
      await ContextDatabaseBridge.recordPlanningFeedback(feedback);
      console.log(
        `[PLANNING_FEEDBACK]: APPLIED (${feedback.adjustmentType} for ${taskType})`,
      );
    }

    return feedbacks;
  }

  /**
   * Analyze step granularity
   */
  private static async analyzeStepGranularity(
    taskType: string,
    efficiencyMetrics: MetricAggregation,
  ): Promise<PlanningFeedback | null> {
    // If efficiency is too high (>1.3), steps are too granular (over-planning)
    // If efficiency is too low (<0.7), steps are too coarse (under-planning)

    if (efficiencyMetrics.average > 1.3) {
      return {
        id: `feedback_${Date.now()}_granularity`,
        taskType,
        adjustmentType: "STEP_GRANULARITY" as any as any,
        adjustmentValue: { action: "merge_steps", factor: 0.8 },
        reason: `Over-planning detected: efficiency ${efficiencyMetrics.average.toFixed(2)} > 1.3. Steps should be merged.`,
        appliedAt: Date.now(),
      };
    }

    if (efficiencyMetrics.average < 0.7) {
      return {
        id: `feedback_${Date.now()}_granularity`,
        taskType,
        adjustmentType: "STEP_GRANULARITY" as any as any,
        adjustmentValue: { action: "split_steps", factor: 1.2 },
        reason: `Under-planning detected: efficiency ${efficiencyMetrics.average.toFixed(2)} < 0.7. Steps should be split.`,
        appliedAt: Date.now(),
      };
    }

    return null;
  }

  /**
   * Analyze risk estimation
   */
  private static async analyzeRiskEstimation(
    taskType: string,
  ): Promise<PlanningFeedback | null> {
    // Get retry metrics to identify failure-prone steps
    const retryMetrics = await ProductivityMetrics.getAggregatedMetrics(
      "RETRY_COUNT",
      taskType,
      50,
    );

    if (!retryMetrics || retryMetrics.count < this.MIN_SAMPLES_FOR_FEEDBACK) {
      return null;
    }

    // If average retry count is high, risk estimation may be too low
    if (retryMetrics.average > 2) {
      return {
        id: `feedback_${Date.now()}_risk`,
        taskType,
        adjustmentType: "RISK_ESTIMATION" as any as any,
        adjustmentValue: { action: "increase_risk", factor: 1.2 },
        reason: `High retry count (${retryMetrics.average.toFixed(2)}) suggests risk estimation is too low.`,
        appliedAt: Date.now(),
      };
    }

    return null;
  }

  /**
   * Analyze time estimation
   */
  private static async analyzeTimeEstimation(
    taskType: string,
  ): Promise<PlanningFeedback | null> {
    // Get time-to-answer metrics
    const timeMetrics = await ProductivityMetrics.getAggregatedMetrics(
      "TIME_TO_ANSWER",
      taskType,
      50,
    );

    if (!timeMetrics || timeMetrics.count < this.MIN_SAMPLES_FOR_FEEDBACK) {
      return null;
    }

    // Compare with decomposition plan estimates
    // This would require storing actual execution times per step
    // For now, we'll use a simple heuristic

    return {
      id: `feedback_${Date.now()}_time`,
      taskType,
      adjustmentType: "TIME_ESTIMATION" as any as any,
      adjustmentValue: {
        action: "calibrate_time",
        averageTime: timeMetrics.average,
        calibrationFactor: 1.0,
      },
      reason: `Calibrating time estimates based on average execution time: ${timeMetrics.average.toFixed(0)}ms`,
      appliedAt: Date.now(),
    };
  }

  /**
   * Analyze model selection
   */
  private static async analyzeModelSelection(
    taskType: string,
  ): Promise<PlanningFeedback | null> {
    // Get model ROI metrics
    const roiMetrics = await ProductivityMetrics.getAggregatedMetrics(
      "MODEL_ROI",
      taskType,
      50,
    );

    if (!roiMetrics || roiMetrics.count < this.MIN_SAMPLES_FOR_FEEDBACK) {
      return null;
    }

    // If ROI is consistently low, suggest different model
    if (roiMetrics.average < 0.5) {
      return {
        id: `feedback_${Date.now()}_model`,
        taskType,
        adjustmentType: "MODEL_SELECTION_HINT" as any as any,
        adjustmentValue: {
          action: "prefer_alternative",
          currentROI: roiMetrics.average,
        },
        reason: `Low model ROI (${roiMetrics.average.toFixed(2)}) suggests alternative model may be better.`,
        appliedAt: Date.now(),
      };
    }

    return null;
  }

  /**
   * Get feedback for task type
   */
  static async getFeedbackForTaskType(
    taskType: string,
  ): Promise<PlanningFeedback[]> {
    return (await ContextDatabaseBridge.getPlanningFeedback(
      taskType,
      20,
    )) as PlanningFeedback[];
  }

  /**
   * Apply feedback to decomposition
   */
  static applyFeedbackToDecomposition(
    steps: DecomposedStep[],
    taskType: string,
    feedbacks: PlanningFeedback[],
  ): DecomposedStep[] {
    let adjustedSteps = [...steps];

    for (const feedback of feedbacks) {
      if (feedback.adjustmentType === "STEP_GRANULARITY") {
        const { action, factor } = feedback.adjustmentValue;
        if (action === "merge_steps" && adjustedSteps.length > 1) {
          // Merge adjacent steps
          const merged: DecomposedStep[] = [];
          for (let i = 0; i < adjustedSteps.length; i += 2) {
            if (i + 1 < adjustedSteps.length) {
              merged.push({
                action: `${adjustedSteps[i].action}_and_${adjustedSteps[i + 1].action}`,
                description: `${adjustedSteps[i].description} and ${adjustedSteps[i + 1].description}`,
                risk:
                  adjustedSteps[i].risk === "risky" ||
                  adjustedSteps[i + 1].risk === "risky"
                    ? "risky"
                    : adjustedSteps[i].risk === "moderate" ||
                        adjustedSteps[i + 1].risk === "moderate"
                      ? "moderate"
                      : "safe",
                estimatedTime:
                  adjustedSteps[i].estimatedTime +
                  adjustedSteps[i + 1].estimatedTime,
                dependencies: [
                  ...(adjustedSteps[i].dependencies || []),
                  ...(adjustedSteps[i + 1].dependencies || []),
                ],
              });
            } else {
              merged.push(adjustedSteps[i]);
            }
          }
          adjustedSteps = merged;
        } else if (action === "split_steps" && adjustedSteps.length < 10) {
          // Split steps (simplified - would need AI to properly split)
          const split: DecomposedStep[] = [];
          for (const step of adjustedSteps) {
            split.push({
              ...step,
              estimatedTime: Math.floor(step.estimatedTime * 0.6),
            });
            split.push({
              action: `${step.action}_verify`,
              description: `Verify ${step.description}`,
              risk: "safe",
              estimatedTime: Math.floor(step.estimatedTime * 0.4),
              dependencies: [step.action],
            });
          }
          adjustedSteps = split;
        }
      } else if (feedback.adjustmentType === "RISK_ESTIMATION") {
        const { factor } = feedback.adjustmentValue;
        adjustedSteps = adjustedSteps.map((step) => {
          if (step.risk === "safe" && factor > 1.0) {
            return { ...step, risk: "moderate" as const };
          } else if (step.risk === "moderate" && factor > 1.0) {
            return { ...step, risk: "risky" as const };
          }
          return step;
        });
      } else if (feedback.adjustmentType === "TIME_ESTIMATION") {
        const { calibrationFactor } = feedback.adjustmentValue;
        adjustedSteps = adjustedSteps.map((step) => ({
          ...step,
          estimatedTime: Math.floor(step.estimatedTime * calibrationFactor),
        }));
      }
    }

    return adjustedSteps;
  }
}
