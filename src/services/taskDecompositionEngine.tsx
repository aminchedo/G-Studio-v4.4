/**
 * AI-based Task Decomposition Engine
 * 
 * Replaces rule-based planning with AI reasoning.
 * Generates structured, enforceable plans.
 * 
 * INVARIANT: All Gemini calls MUST go through the guarded entry point
 * with proper requestId and API Model Test enforcement.
 */

import { ModelArbitrator } from './ai/modelArbitrator';
import { HybridDecisionEngine, ExecutionMode } from './hybridDecisionEngine';
import { LocalAIModelService } from './ai/localAIModelService';
import { GeminiService } from './ai/geminiService';
import { ModelId } from '@/types/types';
import { ContextDatabaseBridge } from './storage/contextDatabaseBridge';
import { PlanningFeedbackService } from './planningFeedback';
import { FatalAIError } from './fatalAIError';
import { ModelValidationStore } from './ai/modelValidationStore';
import { DegradedMode } from './network/degradedMode';

/**
 * INVARIANT ASSERTION: Verify API Model Test enforcement before any Gemini call
 */
function assertAPIModelTestEnforcement(apiKey: string, requestId: string): void {
  if (!ModelValidationStore.hasTestBeenExecuted(apiKey)) {
    throw FatalAIError.API_TEST_NOT_EXECUTED();
  }
  if (!DegradedMode.isProviderAvailable('gemini')) {
    throw FatalAIError.PROVIDER_EXHAUSTED();
  }
  const usableModels = ModelValidationStore.getValidatedModels(apiKey);
  if (usableModels.length === 0) {
    throw FatalAIError.ZERO_USABLE_MODELS();
  }
  if (!requestId) {
    throw new Error('INVARIANT_VIOLATION: requestId is required for all Gemini calls');
  }
}

export interface DecomposedStep {
  action: string;
  description: string;
  risk: 'safe' | 'moderate' | 'risky';
  estimatedTime: number; // milliseconds
  dependencies?: string[]; // Step IDs this depends on
}

export interface DecompositionPlan {
  id: string;
  taskId: string;
  originalMessage: string;
  steps: DecomposedStep[];
  totalEstimatedTime: number;
  confidence: number;
}

export class TaskDecompositionEngine {
  /**
   * Decompose task using AI
   * CRITICAL: requestId MUST be provided from UI layer
   */
  static async decomposeTask(
    message: string,
    intent: any,
    taskId: string,
    apiKey: string,
    modelId: ModelId,
    history: any[],
    requestId?: string
  ): Promise<DecompositionPlan> {
    // CRITICAL: requestId MUST be provided - NO FALLBACK GENERATION
    if (!requestId) {
      throw new Error('CODE_BUG: requestId is required in decomposeTask(). It must be generated in UI layer and passed explicitly.');
    }
    
    // INVARIANT ASSERTION: Verify API Model Test enforcement
    assertAPIModelTestEnforcement(apiKey, requestId);
    // Use ModelArbitrator to select model for decomposition
    const arbitrationResult = await ModelArbitrator.arbitrate({
      taskType: ModelArbitrator.detectTaskType(message),
      message: `Decompose this task into steps: ${message}`,
      history,
      apiKey,
    });

    // Get execution plan
    const executionPlan = await HybridDecisionEngine.decideMode({
      networkState: HybridDecisionEngine.checkNetworkState(),
      apiKey,
      message,
      history,
    });

    // Generate decomposition using AI
    let decomposition = await this.generateDecomposition(
      message,
      intent,
      arbitrationResult.selectedModel,
      executionPlan.mode,
      apiKey,
      requestId
    );

    // Apply feedback from previous executions
    const taskType = ModelArbitrator.detectTaskType(message);
    const feedbacks = await PlanningFeedbackService.getFeedbackForTaskType(taskType);
    if (feedbacks.length > 0) {
      decomposition.steps = PlanningFeedbackService.applyFeedbackToDecomposition(
        decomposition.steps,
        taskType,
        feedbacks
      );
      console.log(`[DECOMPOSITION]: FEEDBACK_APPLIED (${feedbacks.length} adjustments)`);
    }

    // Store decomposition plan
    const plan: DecompositionPlan = {
      id: `plan_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      taskId,
      originalMessage: message,
      steps: decomposition.steps,
      totalEstimatedTime: decomposition.totalEstimatedTime,
      confidence: decomposition.confidence,
    };

    await ContextDatabaseBridge.recordDecompositionPlan(plan);
    console.log(`[DECOMPOSITION]: GENERATED (${decomposition.steps.length} steps, confidence: ${decomposition.confidence.toFixed(2)})`);

    return plan;
  }

  /**
   * Generate decomposition using AI
   * CRITICAL: requestId MUST be provided for cloud API calls
   */
  private static async generateDecomposition(
    message: string,
    intent: any,
    modelId: ModelId,
    mode: ExecutionMode,
    apiKey: string,
    requestId: string
  ): Promise<{
    steps: DecomposedStep[];
    totalEstimatedTime: number;
    confidence: number;
  }> {
    const systemPrompt = `You are a task decomposition expert. Your job is to break down user tasks into clear, ordered steps.

Output format (JSON):
{
  "steps": [
    {
      "action": "step_action_name",
      "description": "Clear description of what this step does",
      "risk": "safe|moderate|risky",
      "estimatedTime": 5000,
      "dependencies": []
    }
  ],
  "totalEstimatedTime": 20000,
  "confidence": 0.85
}

Rules:
- Steps must be ordered and executable
- Risk levels: safe (no side effects), moderate (some risk), risky (significant risk)
- Estimated time in milliseconds
- Dependencies are step indices (0-based) that must complete before this step
- Confidence: 0-1, how confident you are in this decomposition
- Keep steps focused and atomic
- Maximum 10 steps`;

    try {
      let result: string;

      if (mode === 'OFFLINE' || (mode === 'LOCAL' && LocalAIModelService.getStatus() === 'READY')) {
        // Use local AI
        const localResult = await LocalAIModelService.infer(
          `Decompose this task: ${message}\n\nIntent type: ${intent.type}`,
          {
            systemPrompt,
            maxTokens: 1024,
            timeout: 15000,
          }
        );
        result = localResult.text;
      } else {
        // Use cloud API - MUST pass requestId
        const history: any[] = [];
        const stream = GeminiService.streamChat(
          modelId,
          history,
          `Decompose this task: ${message}\n\nIntent type: ${intent.type}`,
          undefined,
          systemPrompt,
          apiKey,
          true,  // useCache
          true,  // useMinimalContext
          false, // apiKeyValidated
          requestId // CRITICAL: Pass requestId
        );

        let fullResponse = '';
        for await (const chunk of stream) {
          // CRITICAL: Check for provider limit (quota exhaustion)
          if (chunk.providerLimit) {
            throw FatalAIError.PROVIDER_EXHAUSTED();
          }
          if (chunk.text) {
            fullResponse += chunk.text;
          }
        }
        result = fullResponse;
      }

      // Parse JSON response
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate and normalize steps
      const steps: DecomposedStep[] = (parsed.steps || []).map((step: any, index: number) => ({
        action: step.action || `step_${index}`,
        description: step.description || step.action || 'Unnamed step',
        risk: this.normalizeRisk(step.risk),
        estimatedTime: step.estimatedTime || 5000,
        dependencies: step.dependencies || [],
      }));

      return {
        steps,
        totalEstimatedTime: parsed.totalEstimatedTime || steps.reduce((sum, s) => sum + s.estimatedTime, 0),
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0.7)),
      };
    } catch (error) {
      console.warn('[TaskDecompositionEngine] AI decomposition failed, using fallback:', error);
      console.log(`[DECOMPOSITION]: REJECTED`);
      
      // Fallback to simple rule-based decomposition
      return this.fallbackDecomposition(message, intent);
    }
  }

  /**
   * Normalize risk level
   */
  private static normalizeRisk(risk: any): 'safe' | 'moderate' | 'risky' {
    if (typeof risk === 'string') {
      const lower = risk.toLowerCase();
      if (lower === 'safe') return 'safe';
      if (lower === 'moderate' || lower === 'medium') return 'moderate';
      if (lower === 'risky' || lower === 'risk' || lower === 'high') return 'risky';
    }
    return 'moderate'; // Default
  }

  /**
   * Fallback decomposition (rule-based)
   */
  private static fallbackDecomposition(
    message: string,
    intent: any
  ): {
    steps: DecomposedStep[];
    totalEstimatedTime: number;
    confidence: number;
  } {
    const steps: DecomposedStep[] = [];

    switch (intent.type) {
      case 'create_file':
        steps.push(
          { action: 'analyze_requirements', description: 'Analyze file requirements', risk: 'safe', estimatedTime: 2000 },
          { action: 'generate_code', description: 'Generate code structure', risk: 'moderate', estimatedTime: 5000 },
          { action: 'validate_code', description: 'Validate generated code', risk: 'safe', estimatedTime: 3000 }
        );
        break;
      case 'edit_file':
        steps.push(
          { action: 'analyze_current', description: 'Analyze current file state', risk: 'safe', estimatedTime: 2000 },
          { action: 'plan_changes', description: 'Plan required changes', risk: 'moderate', estimatedTime: 3000 },
          { action: 'apply_changes', description: 'Apply changes', risk: 'risky', estimatedTime: 4000 },
          { action: 'validate_changes', description: 'Validate changes', risk: 'safe', estimatedTime: 2000 }
        );
        break;
      case 'analyze_code':
        steps.push(
          { action: 'read_code', description: 'Read and parse code', risk: 'safe', estimatedTime: 2000 },
          { action: 'analyze_structure', description: 'Analyze code structure', risk: 'safe', estimatedTime: 4000 },
          { action: 'generate_insights', description: 'Generate analysis insights', risk: 'safe', estimatedTime: 3000 }
        );
        break;
      case 'optimize_code':
        steps.push(
          { action: 'identify_issues', description: 'Identify optimization opportunities', risk: 'safe', estimatedTime: 3000 },
          { action: 'plan_optimizations', description: 'Plan optimization strategy', risk: 'moderate', estimatedTime: 4000 },
          { action: 'apply_optimizations', description: 'Apply optimizations', risk: 'risky', estimatedTime: 5000 },
          { action: 'verify_optimizations', description: 'Verify improvements', risk: 'safe', estimatedTime: 2000 }
        );
        break;
      case 'debug':
        steps.push(
          { action: 'identify_bug', description: 'Identify the bug', risk: 'safe', estimatedTime: 3000 },
          { action: 'analyze_root_cause', description: 'Analyze root cause', risk: 'safe', estimatedTime: 4000 },
          { action: 'propose_fix', description: 'Propose fix', risk: 'moderate', estimatedTime: 3000 },
          { action: 'apply_fix', description: 'Apply fix', risk: 'risky', estimatedTime: 4000 },
          { action: 'verify_fix', description: 'Verify fix works', risk: 'safe', estimatedTime: 2000 }
        );
        break;
      default:
        steps.push({ action: 'respond', description: 'Generate response', risk: 'safe', estimatedTime: 5000 });
    }

    return {
      steps,
      totalEstimatedTime: steps.reduce((sum, s) => sum + s.estimatedTime, 0),
      confidence: 0.5, // Low confidence for fallback
    };
  }
}
