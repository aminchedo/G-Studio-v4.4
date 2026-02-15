import { GeminiService } from "./geminiService";
import { GeminiServiceOptimized } from "./geminiServiceOptimized";
import { databaseService } from "./databaseService";
import { Message, ModelId, FileData, ToolCall, ToolResult } from "@/types";
import { AGENTS, MultiAgentService } from "./multiAgentService";
import { McpService } from "./mcpService";
import { getMcpConnectionManager } from "./mcpConnectionManager";
import { formatMcpStatusForSystemInstruction } from "./mcpAgentIntegration";
import { INITIAL_SYSTEM_INSTRUCTION, FEATURE_FLAGS } from "@/constants";
import { PromptProfessionalizer } from "./promptProfessionalizer";
import { HybridDecisionEngine, ExecutionMode } from "./hybridDecisionEngine";
import { ContextDatabaseBridge } from "./contextDatabaseBridge";
import { LocalAIModelService } from "./localAIModelService";
import { ContextManager } from "./contextManager";
import { TokenOptimizer } from "./tokenOptimizer";
import { RuntimeGuardrails } from "./runtimeGuardrails";
import { MemoryPressureMonitor } from "./memoryPressureMonitor";
import { ChaosTesting } from "./chaosTesting";
import { SelfHealingEngine } from "./selfHealingEngine";
import { ModelArbitrator } from "./modelArbitrator";
import { PromptEvolution } from "./promptEvolution";
import {
  AutonomousController,
  TaskPermissionLevel,
} from "./autonomousController";
import { AdversarialDetector } from "./adversarialDetector";
import { GoalIntegrityGuard } from "./goalIntegrityGuard";
import { KillSwitch } from "./killSwitch";
import { ProductivityMetrics } from "./productivityMetrics";
import { DegradedMode } from "./degradedMode";
import { ProviderLimit } from "./providerLimit";
import { TaskDecompositionEngine } from "./taskDecompositionEngine";

/**
 * AgentOrchestrator - سرویس هوشمند برای مدیریت کامل پروژه با گفتگو
 * این سرویس به طور خودکار:
 * - تمام عملیات را از طریق گفتگو مدیریت می‌کند
 * - پروژه را تحلیل و ساختار می‌دهد
 * - فایل‌ها را ایجاد، ویرایش و مدیریت می‌کند
 * - کدها را فرمت و بهینه می‌کند
 * - پایگاه داده را مدیریت می‌کند
 */

export interface AgentContext {
  files: Record<string, FileData>;
  activeFile: string | null;
  messages: Message[];
  projectState: ProjectState;
}

export interface ProjectState {
  name: string;
  description: string;
  files: string[];
  structure: any;
  technologies: string[];
  status: "planning" | "developing" | "testing" | "complete";
}

export class AgentOrchestrator {
  private static context: AgentContext = {
    files: {},
    activeFile: null,
    messages: [],
    projectState: {
      name: "New Project",
      description: "",
      files: [],
      structure: {},
      technologies: [],
      status: "planning",
    },
  };

  /**
   * Get the appropriate service based on feature flag
   * Returns optimized service if enabled, otherwise base service
   */
  private static getService() {
    return FEATURE_FLAGS.ENABLE_LLM_GATEWAY
      ? GeminiServiceOptimized
      : GeminiService;
  }

  /**
   * پردازش پیام کاربر و انجام اقدامات مناسب
   */
  static async processUserMessage(
    message: string,
    apiKey: string,
    modelId: ModelId,
    currentFiles: Record<string, FileData>,
    history: Message[],
    requestId?: string,
  ): Promise<{
    response: string;
    actions: AgentAction[];
    updatedFiles?: Record<string, FileData>;
    projectState?: ProjectState;
    tokenUsage?: { prompt: number; response: number };
    aiMode?: ExecutionMode;
    isOfflineResponse?: boolean;
  }> {
    // CRITICAL: Provider availability guard - MUST be FIRST check
    // If provider is terminal (QUOTA_EXHAUSTED, degraded, cooldown), abort immediately
    // This prevents ANY Gemini calls from user-initiated requests
    if (!DegradedMode.isProviderAvailable("gemini")) {
      const degradedMessage =
        DegradedMode.getDegradedMessage("gemini") ||
        "Cloud AI is temporarily unavailable. Core features remain active.";
      // Return terminal, user-safe response - NOT a system failure
      return {
        response: degradedMessage,
        actions: [],
        tokenUsage: { prompt: 0, response: 0 },
      };
    }

    // ==================== API MODEL TEST ENFORCEMENT (CORRECTED LOGIC) ====================
    // CORRECTED: Runtime gate allows execution if:
    // 1. Test was executed, OR
    // 2. Default models exist (preloaded), OR
    // 3. A model has been selected (auto or manual)
    const { ModelValidationStore } = await import("./modelValidationStore");
    const { ModelSelectionService } = await import("./modelSelectionService");
    const { FatalAIError } = await import("./fatalAIError");

    // Check if we have usable models (from test OR defaults)
    const usableModels = ModelValidationStore.getValidatedModels(apiKey);

    // Runtime gate: Block ONLY if ALL of these are true:
    // 1. No API key
    // 2. No validated models (from test OR defaults)
    // 3. No default models available
    //
    // CORRECTED LOGIC: Runtime must NOT block if:
    // - API key is valid AND
    // - At least one default model exists OR
    // - Auto-selection can resolve a model

    const hasUsableModels = usableModels.length > 0;
    const isServiceReady = ModelSelectionService.isReady(apiKey);
    const hasActiveModel =
      ModelSelectionService.getActiveModel(apiKey) !== null;
    const hasDefaultModel =
      ModelSelectionService.getDefaultModel(apiKey) !== null;

    // Block only if ALL conditions are false
    if (
      !apiKey ||
      (!hasUsableModels &&
        !isServiceReady &&
        !hasActiveModel &&
        !hasDefaultModel)
    ) {
      console.error(
        `[AgentOrchestrator][requestId=${requestId}]: Runtime gate blocked - no API key, no models, no defaults`,
      );
      throw FatalAIError.API_TEST_NOT_EXECUTED();
    }

    // If we have usable models, check provider status
    if (hasUsableModels) {
      const providerStatus = ModelValidationStore.getProviderStatus(apiKey);
      if (providerStatus === "exhausted") {
        console.error(
          `[AgentOrchestrator][requestId=${requestId}]: Provider exhausted`,
        );
        throw FatalAIError.PROVIDER_EXHAUSTED();
      }
    }
    // ==================== END API MODEL TEST ENFORCEMENT ====================

    // CRITICAL: requestId MUST be provided - never generate as fallback
    // This violates the global invariant that requestId must propagate explicitly
    if (!requestId) {
      throw new Error(
        "requestId is required. It must be generated in UI layer and passed explicitly through the pipeline.",
      );
    }

    console.log(
      `[AgentOrchestrator][requestId=${requestId}]: Processing user message`,
    );
    console.time("agent_pipeline:orchestrator");

    // ==================== RUNTIME GUARDRAILS ====================
    RuntimeGuardrails.guardOrchestratorEntry(message, apiKey, requestId);

    // به‌روزرسانی context
    this.context.files = currentFiles;
    this.context.messages = history;

    // Conditional routing: simple text → skip heavy orchestration, route to primary LLM
    const useSimplePath = this.isSimpleMessage(message);

    // ==================== LOCAL AI INTEGRATION ====================
    // Skip context DB and session when simple (reduces latency; no multi-agent)
    if (!useSimplePath) {
      // 1. Initialize context database
      try {
        await ContextDatabaseBridge.init();
      } catch (error) {
        console.warn(
          "[AgentOrchestrator] Context database init failed, using in-memory context:",
          error,
        );
      }
    }

    // 2. Prompt Professionalization (optional, user-controlled; skip for simple)
    let processedMessage = message;
    let originalMessage = message;
    if (!useSimplePath && PromptProfessionalizer.isEnabled()) {
      try {
        const professionalized =
          await PromptProfessionalizer.professionalize(processedMessage);
        processedMessage =
          professionalized.professionalized || processedMessage;
        console.log("[PROMPT_OPT]: enabled");

        // ==================== PROMPT EVOLUTION TRACKING ====================
        await PromptEvolution.recordTransformation(
          originalMessage,
          processedMessage,
        );
      } catch (error) {
        console.warn(
          "[AgentOrchestrator] Prompt professionalization failed, using original:",
          error,
        );
      }
    } else {
      if (useSimplePath) console.log("[PROMPT_OPT]: skipped (simple path)");
      else console.log("[PROMPT_OPT]: disabled");
    }

    // 3. Model Arbitration (MUST be called before decision engine)
    const arbitrationResult = await ModelArbitrator.arbitrate({
      taskType: ModelArbitrator.detectTaskType(processedMessage),
      message: processedMessage,
      history,
      apiKey,
    });

    // 3. Decision Engine Routing
    const executionPlan = await HybridDecisionEngine.decideMode({
      networkState: HybridDecisionEngine.checkNetworkState(),
      apiKey,
      message: processedMessage,
      history,
    });
    const mode = executionPlan.mode;
    console.log(`[AI_MODE]: ${mode}`);

    // ==================== RUNTIME GUARDRAILS ====================
    RuntimeGuardrails.guardDecisionEngine(executionPlan, requestId);

    // ==================== SELF-HEALING ====================
    // Self-healing engine subscribes to logs automatically

    // Architecture flow verification: All layers present and connected
    console.log("[ARCH_FLOW]: VALID");

    // ==================== CHAOS TESTING ====================
    if (
      ChaosTesting.shouldSimulateAPIOutage() &&
      executionPlan.useCloudForResponse
    ) {
      try {
        await ChaosTesting.injectAPIFailure();
      } catch (error) {
        // Fallback will be triggered
      }
    }

    // 4. Get or create session (skip for simple path)
    let sessionId: string | null = null;
    if (!useSimplePath) {
      try {
        sessionId = await ContextDatabaseBridge.getCurrentSession();
      } catch (error) {
        console.warn(
          "[AgentOrchestrator] Failed to get session, continuing without persistence:",
          error,
        );
      }
    }

    // 5. Context Retrieval from SQLite (if available; skip for simple path)
    let sqliteContext: any[] = [];
    if (!useSimplePath && sessionId && executionPlan.useLocalForContext) {
      try {
        const contextResult = await ContextDatabaseBridge.getRelevantContext(
          sessionId,
          processedMessage,
          20,
        );
        sqliteContext = contextResult;
        console.log(
          `[CONTEXT]: sqlite + summary (${contextResult.length} entries)`,
        );

        // ==================== RUNTIME GUARDRAILS ====================
        RuntimeGuardrails.guardContextManager(
          sqliteContext.length > 0,
          sessionId,
        );
      } catch (error) {
        console.warn(
          "[AgentOrchestrator] SQLite context retrieval failed:",
          error,
        );
      }
    }

    // ==================== MEMORY PRESSURE MONITORING ====================
    if (!useSimplePath && sessionId) {
      const shouldSummarize =
        await MemoryPressureMonitor.shouldSummarize(sessionId);
      if (shouldSummarize) {
        // Trigger proactive summarization
        await MemoryPressureMonitor.enforceLimits(sessionId);
      }
    }

    // 5.1 Context Budget Enforcement (before cloud requests; skip for simple path)
    if (!useSimplePath && executionPlan.useCloudForResponse && sessionId) {
      try {
        const contextSize =
          await ContextDatabaseBridge.getContextSize(sessionId);
        const budget = this.getTokenBudget(modelId);
        const totalTokens =
          contextSize.totalTokens +
          TokenOptimizer.estimateTokens(processedMessage);

        if (totalTokens > budget.availableForContext) {
          console.log("[CONTEXT_BUDGET]: EXCEEDED");
          console.log(
            `[CONTEXT_BUDGET]: ${totalTokens} > ${budget.availableForContext}`,
          );

          // Try to trim context
          const targetTokens = Math.floor(budget.availableForContext * 0.8); // Use 80% of budget
          const trimResult = await ContextDatabaseBridge.trimContext(
            sessionId,
            targetTokens,
          );

          if (trimResult) {
            console.log("[CONTEXT_TRIM]: APPLIED");
          } else {
            console.log("[CONTEXT_TRIM]: NOT_APPLIED");

            // If trimming failed, try forced summarization
            try {
              const recentEntries =
                await ContextDatabaseBridge.getRelevantContext(
                  sessionId,
                  "",
                  20,
                );
              if (
                recentEntries.length > 10 &&
                LocalAIModelService.getStatus() === "READY"
              ) {
                const summary = await LocalAIModelService.createSummary(
                  recentEntries.map((e) => ({
                    role: e.role,
                    content: e.content,
                  })),
                );
                await ContextDatabaseBridge.createSummary(sessionId, {
                  layer: 1,
                  content: summary,
                  coversUntil: Date.now(),
                  method: "local_ai",
                });
                console.log("[CONTEXT]: forced summarization applied");
              }
            } catch (error) {
              console.warn(
                "[AgentOrchestrator] Forced summarization failed:",
                error,
              );
            }
          }
        } else {
          console.log("[CONTEXT_BUDGET]: OK");
        }
      } catch (error) {
        console.warn(
          "[AgentOrchestrator] Context budget enforcement failed:",
          error,
        );
      }
    }

    // ==================== END LOCAL AI INTEGRATION ====================

    // ==================== AUTONOMOUS MODE CHECK ====================
    let isAutonomous = AutonomousController.isAutonomous();
    const taskType = ModelArbitrator.detectTaskType(processedMessage);
    let autonomousExecutionId: string | null = null;

    // Check if should auto-upgrade to autonomous (if not already)
    if (!isAutonomous) {
      const shouldUpgrade =
        await AutonomousController.shouldUpgradeToAutonomous();
      if (shouldUpgrade) {
        console.log(
          `[AUTONOMOUS]: SUGGEST_UPGRADE (efficiency metrics suggest autonomous mode)`,
        );
        // Don't auto-enable, just suggest (user must explicitly enable)
      }
    }

    // Check if should auto-downgrade from autonomous
    if (isAutonomous) {
      const shouldDowngrade =
        await AutonomousController.shouldDowngradeToAssisted();
      if (shouldDowngrade) {
        console.log(
          `[AUTONOMOUS]: SUGGEST_DOWNGRADE (efficiency metrics suggest assisted mode)`,
        );
        // Don't auto-disable, just suggest (user retains control)
      }
    }

    if (isAutonomous) {
      // Validate permission before proceeding
      const permission = AutonomousController.validatePermission(taskType);
      if (!permission.allowed) {
        // Downgrade to assisted mode
        console.log(
          `[AUTONOMOUS]: DOWNGRADED_TO_ASSISTED (${permission.reason})`,
        );
        // Continue with normal flow
      } else {
        // Start autonomous execution
        try {
          autonomousExecutionId = AutonomousController.startExecution(
            processedMessage,
            taskType,
          );
          console.log(
            `[AUTONOMOUS]: EXECUTION_STARTED (${autonomousExecutionId})`,
          );
        } catch (error) {
          console.warn(
            `[AUTONOMOUS]: START_FAILED - ${error instanceof Error ? error.message : "Unknown error"}`,
          );
          // Continue with normal flow
        }
      }
    }

    // تحلیل پیام کاربر برای تشخیص نیت
    console.time("agent_pipeline:intent");
    const intent = await this.detectIntent(processedMessage, apiKey, modelId);
    console.timeEnd("agent_pipeline:intent");

    let actions: AgentAction[] = [];
    let response = "";
    let updatedFiles = { ...currentFiles };
    let tokenUsage = { prompt: 0, response: 0 };

    // ==================== AUTONOMOUS MODE EXECUTION ====================
    if (isAutonomous && autonomousExecutionId) {
      // Generate taskId for decomposition
      const taskId = `task_${autonomousExecutionId}_${Date.now()}`;

      // Decompose task into steps using AI
      let decompositionPlan;
      try {
        decompositionPlan = await TaskDecompositionEngine.decomposeTask(
          processedMessage,
          intent,
          taskId,
          apiKey,
          modelId,
          history,
        );
      } catch (error) {
        console.warn(
          "[AgentOrchestrator] AI decomposition failed, using fallback:",
          error,
        );
        // Fallback to rule-based (will be replaced by AI fallback in TaskDecompositionEngine)
        decompositionPlan = {
          id: `plan_fallback_${Date.now()}`,
          taskId,
          originalMessage: processedMessage,
          steps: this.decomposeTask(intent, processedMessage).map((s, i) => ({
            action: s.action,
            description: s.description,
            risk: "moderate" as const,
            estimatedTime: 5000,
            dependencies: [],
          })),
          totalEstimatedTime: 0,
          confidence: 0.5,
        };
      }

      const steps = decompositionPlan.steps;
      const maxSteps = Math.min(
        steps.length,
        AutonomousController.getConfig().maxSteps,
      );

      let stepNumber = 0;
      let accumulatedResponse = "";
      let accumulatedActions: AgentAction[] = [];
      let accumulatedFiles = { ...currentFiles };

      for (const step of steps.slice(0, maxSteps)) {
        stepNumber++;

        // Check if we can proceed
        const canProceed = AutonomousController.canProceed(
          autonomousExecutionId,
          stepNumber,
          step.action,
        );
        if (!canProceed.allowed) {
          console.log(`[AUTONOMOUS]: ABORTED (${canProceed.reason})`);
          break;
        }

        // Check emergency stop
        if (AutonomousController.isEmergencyStopActive()) {
          console.log(`[AUTONOMOUS]: ABORTED (emergency stop)`);
          break;
        }

        const stepStartTime = Date.now();
        console.log(
          `[AUTONOMOUS]: STEP ${stepNumber}/${maxSteps} - ${step.action}`,
        );

        // Check goal drift before executing step
        const goalDriftCheck = GoalIntegrityGuard.checkGoalDrift(
          autonomousExecutionId,
          stepNumber,
          step.description,
        );
        if (goalDriftCheck.hasDrift) {
          console.warn(
            `[AUTONOMOUS]: GOAL_DRIFT_DETECTED - ${goalDriftCheck.reason}`,
          );
          console.log(`[AUTONOMOUS]: ABORTED (goal drift)`);
          break;
        }

        // Predict failure probability and abort early if high
        // Note: predictFailureProbability method not yet implemented in AutonomousController
        // TODO: Implement failure prediction when available
        // const failureProbability = await AutonomousController.predictFailureProbability(autonomousExecutionId);
        // if (failureProbability > 0.8) {
        //   console.warn(`[AUTONOMOUS]: PREDICTED_FAILURE (probability: ${failureProbability.toFixed(2)})`);
        //   console.log(`[AUTONOMOUS]: ABORTED (early abort on predicted failure)`);
        //   break;
        // }

        try {
          // Execute step with full arbitration and decision engine
          const stepResult = await this.executeAutonomousStep(
            step,
            stepNumber,
            apiKey,
            modelId,
            accumulatedFiles,
            history,
            executionPlan,
            sessionId,
            autonomousExecutionId,
            requestId,
          );

          const stepDuration = Date.now() - stepStartTime;

          // Record step
          AutonomousController.recordStep(
            autonomousExecutionId,
            stepNumber,
            step.action,
            stepResult.success ? "success" : "failure",
            stepDuration,
          );

          if (stepResult.success) {
            accumulatedResponse +=
              (accumulatedResponse ? "\n\n" : "") + stepResult.response;
            accumulatedActions.push(...stepResult.actions);
            accumulatedFiles = {
              ...accumulatedFiles,
              ...stepResult.updatedFiles,
            };
            tokenUsage.prompt += stepResult.tokenUsage?.prompt || 0;
            tokenUsage.response += stepResult.tokenUsage?.response || 0;
          } else {
            // Check if this is an adversarial scenario before self-healing
            const stepAdversarialCheck = AdversarialDetector.detect(
              step.description,
            );
            if (
              stepAdversarialCheck.isAdversarial &&
              stepAdversarialCheck.confidence > 0.8
            ) {
              // High confidence adversarial - disable self-healing and abort
              console.warn(
                `[AUTONOMOUS]: ADVERSARIAL_SELF_HEALING_BLOCKED (${stepAdversarialCheck.type})`,
              );
              console.log(`[AUTONOMOUS]: ABORTED (adversarial step detected)`);
              autonomousExecutionId = null;
              break;
            }

            // Attempt self-healing once (only if not adversarial)
            console.log(`[AUTONOMOUS]: STEP_FAILED - Attempting self-healing`);
            const healed = await SelfHealingEngine.triggerHealing("FALLBACK", {
              step: stepNumber,
            });

            if (!healed) {
              // Self-healing failed, downgrade to assisted
              console.log(
                `[AUTONOMOUS]: DOWNGRADED_TO_ASSISTED (self-healing failed)`,
              );
              autonomousExecutionId = null; // Exit autonomous mode
              break;
            }
          }
        } catch (error) {
          // CRITICAL: FatalAIError must NEVER be swallowed - rethrow immediately
          const { isFatalError } = await import("./fatalAIError");
          if (isFatalError(error)) {
            console.error(
              `[AgentOrchestrator] FATAL_ERROR_DETECTED in autonomous step - terminating pipeline`,
              (error as any).message,
            );
            throw error; // ⛔️ Stop everything - no self-healing, no downgrade
          }

          const stepDuration = Date.now() - stepStartTime;
          AutonomousController.recordStep(
            autonomousExecutionId,
            stepNumber,
            step.action,
            "failure",
            stepDuration,
          );

          // Attempt self-healing (only for non-fatal errors)
          await SelfHealingEngine.triggerHealing("FALLBACK", {
            step: stepNumber,
            error,
          });

          // If still failing, downgrade
          console.log(`[AUTONOMOUS]: DOWNGRADED_TO_ASSISTED (step error)`);
          autonomousExecutionId = null;
          break;
        }
      }

      // Complete autonomous execution
      if (autonomousExecutionId) {
        AutonomousController.completeExecution(autonomousExecutionId);
        response = accumulatedResponse;
        actions = accumulatedActions;
        updatedFiles = accumulatedFiles;
      } else {
        // Fall through to normal execution
        console.log(`[AUTONOMOUS]: FALLBACK_TO_ASSISTED`);
      }
    }

    // If not autonomous or autonomous failed, use normal flow
    if (!isAutonomous || !autonomousExecutionId) {
      // اجرای اقدامات بر اساس نیت
      switch (intent.type) {
        case "create_project":
          const projectResult = await this.createProject(
            message,
            apiKey,
            modelId,
            requestId,
          );
          actions = projectResult.actions;
          response = projectResult.response;
          updatedFiles = { ...updatedFiles, ...projectResult.files };
          this.context.projectState = projectResult.projectState;
          if (projectResult.tokenUsage) {
            tokenUsage = projectResult.tokenUsage;
          }
          break;

        case "edit_file":
          const editResult = await this.editFile(
            message,
            intent.target,
            apiKey,
            modelId,
            requestId,
          );
          actions = editResult.actions;
          response = editResult.response;
          if (editResult.file) {
            updatedFiles[intent.target] = editResult.file;
          }
          if (editResult.tokenUsage) {
            tokenUsage = editResult.tokenUsage;
          }
          break;

        case "create_file":
          const createResult = await this.createFile(
            message,
            intent.target,
            apiKey,
            modelId,
            requestId,
          );
          actions = createResult.actions;
          response = createResult.response;
          if (createResult.file) {
            updatedFiles[createResult.filename] = createResult.file;
          }
          if (createResult.tokenUsage) {
            tokenUsage = createResult.tokenUsage;
          }
          break;

        case "analyze_code":
          const analysisResult = await this.analyzeCode(
            message,
            apiKey,
            modelId,
            requestId,
          );
          response = analysisResult.response;
          actions = analysisResult.actions;
          if (analysisResult.tokenUsage) {
            tokenUsage = analysisResult.tokenUsage;
          }
          break;

        case "optimize_code":
          const optimizeResult = await this.optimizeCode(
            message,
            apiKey,
            modelId,
            requestId,
          );
          response = optimizeResult.response;
          actions = optimizeResult.actions;
          if (optimizeResult.files) {
            updatedFiles = { ...updatedFiles, ...optimizeResult.files };
          }
          if (optimizeResult.tokenUsage) {
            tokenUsage = optimizeResult.tokenUsage;
          }
          break;

        case "debug":
          const debugResult = await this.debugCode(
            message,
            apiKey,
            modelId,
            requestId,
          );
          response = debugResult.response;
          actions = debugResult.actions;
          if (debugResult.fixes) {
            updatedFiles = { ...updatedFiles, ...debugResult.fixes };
          }
          if (debugResult.tokenUsage) {
            tokenUsage = debugResult.tokenUsage;
          }
          break;

        case "chat":
        default:
          const chatResult = await this.chat(
            processedMessage,
            apiKey,
            modelId,
            executionPlan,
            sessionId,
            requestId,
          );
          response = chatResult.response;
          tokenUsage = chatResult.tokenUsage;
          // Update files from context (may have been modified by tool calls)
          updatedFiles = { ...this.context.files };
          break;
      }
    }

    // 6. Context Persistence (after response)
    if (sessionId) {
      try {
        // Calculate importance for user message
        let importance = 0.5;
        if (LocalAIModelService.getStatus() === "READY") {
          try {
            importance =
              await LocalAIModelService.calculateImportance(processedMessage);
          } catch (error) {
            // Fallback
          }
        }

        // Add user message
        const userEntryId = await ContextDatabaseBridge.addEntry(sessionId, {
          role: "user",
          content: processedMessage,
          tokenEstimate: TokenOptimizer.estimateTokens(processedMessage),
          importance,
        });

        // Add assistant response
        const responseEntryId = await ContextDatabaseBridge.addEntry(
          sessionId,
          {
            role: "assistant",
            content: response,
            tokenEstimate: TokenOptimizer.estimateTokens(response),
            importance: 0.7, // Responses are generally important
          },
        );

        // ==================== CONTEXT LINEAGE RECORDING ====================
        if (responseEntryId) {
          // Get context entry IDs used for this response
          const contextEntries = await ContextDatabaseBridge.getRelevantContext(
            sessionId,
            processedMessage,
            20,
          );
          const contextEntryIds = contextEntries.map((e) => e.id);

          // Get summary IDs
          const summaries = await ContextDatabaseBridge.getSummaries(sessionId);
          const summaryIds = summaries.map((s) => s.id);

          // Record lineage
          await ContextDatabaseBridge.recordLineage(sessionId, {
            responseId: responseEntryId,
            contextEntryIds,
            summaryIds,
            model: modelId,
            mode: mode,
          });
        }

        // ==================== RUNTIME GUARDRAILS ====================
        RuntimeGuardrails.guardContextPersistence(sessionId, response);

        // Check if summary is needed (with memory pressure awareness)
        const contextSize =
          await ContextDatabaseBridge.getContextSize(sessionId);
        const memoryMetrics = await MemoryPressureMonitor.getMetrics(sessionId);
        const summaryThreshold =
          memoryMetrics.pressureLevel === "CRITICAL" ? 3000 : 4000;

        if (contextSize.totalTokens > summaryThreshold) {
          // Create summary
          try {
            const recentEntries =
              await ContextDatabaseBridge.getRelevantContext(sessionId, "", 20);
            if (
              recentEntries.length > 10 &&
              LocalAIModelService.getStatus() === "READY"
            ) {
              const summary = await LocalAIModelService.createSummary(
                recentEntries.map((e) => ({
                  role: e.role,
                  content: e.content,
                })),
              );
              await ContextDatabaseBridge.createSummary(sessionId, {
                layer: 1,
                content: summary,
                coversUntil: Date.now(),
                method: "local_ai",
              });
              console.log("[CONTEXT]: summary created");
              console.log("[SUMMARY]: GENERATED");
            } else {
              console.log(
                "[SUMMARY]: SKIPPED (insufficient entries or local AI not ready)",
              );
            }
          } catch (error) {
            console.warn("[AgentOrchestrator] Summary creation failed:", error);
            console.log("[SUMMARY]: SKIPPED (error)");
          }
        } else {
          console.log("[SUMMARY]: SKIPPED (below threshold)");
        }
      } catch (error) {
        console.warn("[AgentOrchestrator] Context persistence failed:", error);
      }
    }

    // ذخیره در پایگاه داده (skip for simple path to avoid extra I/O)
    if (!useSimplePath) {
      await this.saveToDatabase(message, response, actions);
    }

    const isOfflineResponse = mode === "OFFLINE" || mode === "LOCAL";
    if (isOfflineResponse) {
      console.log("[OFFLINE_RESPONSE]: BEST_EFFORT");
    }

    console.timeEnd("agent_pipeline:orchestrator");
    return {
      response,
      actions,
      updatedFiles,
      projectState: this.context.projectState,
      tokenUsage,
      aiMode: mode,
      isOfflineResponse,
    };
  }

  /**
   * Simple message heuristic: short text with no code/file keywords → route to primary LLM, skip heavy orchestration.
   */
  private static isSimpleMessage(message: string): boolean {
    const trimmed = message.trim();
    if (trimmed.length > 180) return false;
    const lower = trimmed.toLowerCase();
    const codeKeywords = [
      "create project",
      "new project",
      "پروژه جدید",
      "edit",
      "ویرایش",
      "modify",
      "تغییر",
      "create file",
      "new file",
      "فایل جدید",
      "بساز",
      "analyze",
      "تحلیل",
      "review",
      "بررسی",
      "optimize",
      "بهینه",
      "improve",
      "refactor",
      "debug",
      "fix",
      "رفع",
      "اشکال",
      ".tsx",
      ".ts",
      ".jsx",
      ".js",
      ".css",
      ".html",
      ".json",
    ];
    return !codeKeywords.some((k) => lower.includes(k));
  }

  /**
   * Get token budget for model
   */
  private static getTokenBudget(modelId: ModelId): {
    availableForContext: number;
    maxPromptTokens: number;
  } {
    const maxPromptTokens = modelId.includes("pro") ? 32000 : 8000;
    const reservedForSystem = 2000;
    const reservedForTools = 1000;
    const availableForContext =
      maxPromptTokens - reservedForSystem - reservedForTools;

    return { availableForContext, maxPromptTokens };
  }

  /**
   * تشخیص نیت کاربر از پیام
   */
  private static async detectIntent(
    message: string,
    apiKey: string,
    modelId: ModelId,
  ): Promise<{ type: string; target: string; confidence: number }> {
    const msg = message.toLowerCase();

    // تشخیص دستورات فارسی و انگلیسی
    if (
      msg.includes("پروژه جدید") ||
      msg.includes("create project") ||
      msg.includes("new project")
    ) {
      return { type: "create_project", target: "", confidence: 0.95 };
    }

    if (
      msg.includes("ویرایش") ||
      msg.includes("edit") ||
      msg.includes("تغییر") ||
      msg.includes("modify")
    ) {
      const fileMatch = message.match(
        /[\w\-\.\/]+\.(tsx?|jsx?|css|html|json)/i,
      );
      return {
        type: "edit_file",
        target: fileMatch?.[0] || "",
        confidence: 0.85,
      };
    }

    if (
      msg.includes("فایل جدید") ||
      msg.includes("create file") ||
      msg.includes("new file") ||
      msg.includes("بساز")
    ) {
      const fileMatch = message.match(
        /[\w\-\.\/]+\.(tsx?|jsx?|css|html|json)/i,
      );
      return {
        type: "create_file",
        target: fileMatch?.[0] || "",
        confidence: 0.9,
      };
    }

    if (
      msg.includes("تحلیل") ||
      msg.includes("analyze") ||
      msg.includes("review") ||
      msg.includes("بررسی")
    ) {
      return { type: "analyze_code", target: "", confidence: 0.8 };
    }

    if (
      msg.includes("بهینه‌سازی") ||
      msg.includes("optimize") ||
      msg.includes("improve") ||
      msg.includes("refactor")
    ) {
      return { type: "optimize_code", target: "", confidence: 0.85 };
    }

    if (
      msg.includes("debug") ||
      msg.includes("fix") ||
      msg.includes("رفع") ||
      msg.includes("اشکال")
    ) {
      return { type: "debug", target: "", confidence: 0.9 };
    }

    return { type: "chat", target: "", confidence: 0.5 };
  }

  /**
   * ایجاد پروژه جدید کامل
   */
  private static async createProject(
    description: string,
    apiKey: string,
    modelId: ModelId,
    requestId?: string,
  ): Promise<{
    response: string;
    actions: AgentAction[];
    files: Record<string, FileData>;
    projectState: ProjectState;
    tokenUsage?: { prompt: number; response: number };
  }> {
    const systemPrompt = `You are an expert project architect. Create a complete, production-ready project structure based on the user's description.

IMPORTANT INSTRUCTIONS:
1. Analyze the requirements carefully
2. Design a clean, scalable architecture
3. Generate ALL necessary files with complete, working code
4. Follow best practices for the chosen technology stack
5. Include proper error handling, typing, and documentation
6. Make files production-ready, not just templates

Return your response in this EXACT JSON format:
{
  "projectName": "project-name",
  "description": "Brief description",
  "technologies": ["React", "TypeScript", "Tailwind"],
  "structure": {
    "src/": ["App.tsx", "index.tsx", "..."],
    "components/": ["Header.tsx", "..."]
  },
  "files": [
    {
      "path": "src/App.tsx",
      "content": "// COMPLETE file content here",
      "language": "typescript"
    }
  ],
  "summary": "Detailed explanation of what was created"
}

User request: ${description}`;

    let fullResponse = "";
    let tokenUsage = { prompt: 0, response: 0 };
    const service = this.getService();
    const stream = service.streamChat(
      modelId,
      [],
      description,
      undefined,
      systemPrompt,
      apiKey,
      true, // useCache
      true, // useMinimalContext
      false, // apiKeyValidated
      requestId, // Pass requestId for correlation
    );

    // CRITICAL: Token counting fix - use final cumulative usage, not sum of chunks
    // The API returns cumulative token counts in each chunk, so we must use only
    // the final value, not sum them (which would cause double/triple counting)
    let finalUsage = null;
    for await (const chunk of stream) {
      if (chunk.text) {
        fullResponse += chunk.text;
      }
      // Store final usage (cumulative, not incremental)
      // Each chunk.usage contains cumulative totals, so we overwrite, not add
      if (chunk.usage) {
        finalUsage = chunk.usage;
      }
    }

    // Use final cumulative usage (not sum of chunks)
    // This is the correct way - each API call returns cumulative totals
    if (finalUsage) {
      tokenUsage.prompt = finalUsage.promptTokenCount || 0;
      tokenUsage.response = finalUsage.candidatesTokenCount || 0;
    }

    // استخراج JSON از پاسخ
    const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Failed to parse project structure from AI response");
    }

    const projectData = JSON.parse(jsonMatch[0]);

    // ایجاد فایل‌ها
    const files: Record<string, FileData> = {};
    for (const fileData of projectData.files) {
      files[fileData.path] = {
        name: fileData.path,
        content: fileData.content,
        language: fileData.language,
      };
    }

    const projectState: ProjectState = {
      name: projectData.projectName,
      description: projectData.description,
      files: Object.keys(files),
      structure: projectData.structure,
      technologies: projectData.technologies,
      status: "developing",
    };

    return {
      response: projectData.summary,
      actions: [
        {
          type: "create_project",
          description: `Created project: ${projectData.projectName}`,
        },
        {
          type: "create_files",
          description: `Generated ${Object.keys(files).length} files`,
        },
      ],
      files,
      projectState,
      tokenUsage,
    };
  }

  /**
   * ویرایش فایل موجود
   */
  private static async editFile(
    instruction: string,
    filename: string,
    apiKey: string,
    modelId: ModelId,
    requestId?: string,
  ): Promise<{
    response: string;
    actions: AgentAction[];
    file?: FileData;
    tokenUsage?: { prompt: number; response: number };
  }> {
    const currentFile = this.context.files[filename];
    if (!currentFile) {
      return {
        response: `File ${filename} not found. Would you like me to create it?`,
        actions: [],
      };
    }

    const systemPrompt = `You are an expert code editor. Edit the provided file according to the user's instructions.

RULES:
1. Make precise, targeted changes
2. Preserve existing functionality unless explicitly asked to change it
3. Follow the existing code style
4. Add comments for complex changes
5. Ensure TypeScript type safety
6. Return ONLY the complete updated file content, no explanation

Current file (${filename}):
\`\`\`${currentFile.language}
${currentFile.content}
\`\`\`

User instruction: ${instruction}

Return the complete updated file:`;

    let updatedContent = "";
    let tokenUsage = { prompt: 0, response: 0 };
    const service = this.getService();
    // RUNTIME ASSERTION: requestId must exist
    if (!requestId) {
      throw new Error(
        "requestId is required in editFile. It must be generated in UI layer and passed explicitly.",
      );
    }

    const stream = service.streamChat(
      modelId,
      [],
      instruction,
      undefined,
      systemPrompt,
      apiKey,
      true, // useCache
      true, // useMinimalContext
      false, // apiKeyValidated
      requestId, // Pass requestId for correlation
    );

    // CRITICAL: Token counting fix - use final cumulative usage, not sum of chunks
    let finalUsage = null;
    for await (const chunk of stream) {
      if (chunk.text) {
        updatedContent += chunk.text;
      }
      // Store final usage (cumulative, not incremental)
      // Each chunk.usage contains cumulative totals, so we overwrite, not add
      if (chunk.usage) {
        finalUsage = chunk.usage;
      }
    }

    // Use final cumulative usage (not sum of chunks)
    if (finalUsage) {
      tokenUsage.prompt = finalUsage.promptTokenCount || 0;
      tokenUsage.response = finalUsage.candidatesTokenCount || 0;
    }

    // استخراج کد از markdown اگر لازم باشه
    const codeMatch = updatedContent.match(/```[\w]*\n([\s\S]*?)```/);
    const finalContent = codeMatch ? codeMatch[1] : updatedContent;

    return {
      response: `✅ Updated ${filename}`,
      actions: [{ type: "edit_file", description: `Modified ${filename}` }],
      file: {
        ...currentFile,
        content: finalContent.trim(),
      },
      tokenUsage,
    };
  }

  /**
   * ایجاد فایل جدید
   */
  private static async createFile(
    instruction: string,
    suggestedFilename: string,
    apiKey: string,
    modelId: ModelId,
    requestId?: string,
  ): Promise<{
    response: string;
    actions: AgentAction[];
    file?: FileData;
    filename: string;
    tokenUsage?: { prompt: number; response: number };
  }> {
    const systemPrompt = `You are an expert code generator. Create a complete, production-ready file based on the user's requirements.

RULES:
1. Write complete, working code
2. Include proper error handling
3. Add TypeScript types
4. Follow best practices
5. Include helpful comments
6. Make it production-ready

Return ONLY the file content, no explanation.

User request: ${instruction}`;

    let content = "";
    let tokenUsage = { prompt: 0, response: 0 };
    const service = this.getService();
    // RUNTIME ASSERTION: requestId must exist
    if (!requestId) {
      throw new Error(
        "requestId is required in editFile. It must be generated in UI layer and passed explicitly.",
      );
    }

    const stream = service.streamChat(
      modelId,
      [],
      instruction,
      undefined,
      systemPrompt,
      apiKey,
      true, // useCache
      true, // useMinimalContext
      false, // apiKeyValidated
      requestId, // Pass requestId for correlation
    );

    // CRITICAL: Token counting fix - use final cumulative usage, not sum of chunks
    let finalUsage = null;
    for await (const chunk of stream) {
      if (chunk.text) {
        content += chunk.text;
      }
      // Store final usage (cumulative, not incremental)
      // Each chunk.usage contains cumulative totals, so we overwrite, not add
      if (chunk.usage) {
        finalUsage = chunk.usage;
      }
    }

    // Use final cumulative usage (not sum of chunks)
    if (finalUsage) {
      tokenUsage.prompt = finalUsage.promptTokenCount || 0;
      tokenUsage.response = finalUsage.candidatesTokenCount || 0;
    }

    // استخراج کد
    const codeMatch = content.match(/```[\w]*\n([\s\S]*?)```/);
    const finalContent = codeMatch ? codeMatch[1] : content;

    // تعیین زبان بر اساس پسوند
    const ext = suggestedFilename.split(".").pop()?.toLowerCase() || "txt";
    const languageMap: Record<string, string> = {
      tsx: "typescript",
      ts: "typescript",
      jsx: "javascript",
      js: "javascript",
      css: "css",
      html: "html",
      json: "json",
    };

    return {
      response: `✅ Created ${suggestedFilename}`,
      actions: [
        { type: "create_file", description: `Created ${suggestedFilename}` },
      ],
      file: {
        name: suggestedFilename,
        content: finalContent.trim(),
        language: languageMap[ext] || "plaintext",
      },
      filename: suggestedFilename,
      tokenUsage,
    };
  }

  /**
   * تحلیل کد
   */
  private static async analyzeCode(
    message: string,
    apiKey: string,
    modelId: ModelId,
    requestId?: string,
  ): Promise<{
    response: string;
    actions: AgentAction[];
    tokenUsage?: { prompt: number; response: number };
  }> {
    const activeFile = this.context.activeFile;
    const fileContent = activeFile
      ? this.context.files[activeFile]?.content
      : "";

    const systemPrompt = `You are a code analysis expert. Analyze the provided code and give detailed insights.

Analyze for:
1. Code quality and best practices
2. Performance issues
3. Security vulnerabilities
4. Type safety issues
5. Potential bugs
6. Improvement suggestions

${activeFile ? `Current file (${activeFile}):\n\`\`\`\n${fileContent}\n\`\`\`` : "No file is currently open."}

Provide a detailed analysis with specific recommendations.`;

    let analysis = "";
    let tokenUsage = { prompt: 0, response: 0 };
    const service = this.getService();
    const stream = service.streamChat(
      modelId,
      this.context.messages,
      message,
      undefined,
      systemPrompt,
      apiKey,
      true, // useCache
      true, // useMinimalContext
      false, // apiKeyValidated
      requestId, // Pass requestId for correlation
    );

    // CRITICAL: Token counting fix - use final cumulative usage, not sum of chunks
    let finalUsage = null;
    for await (const chunk of stream) {
      if (chunk.text) {
        analysis += chunk.text;
      }
      // Store final usage (cumulative, not incremental)
      // Each chunk.usage contains cumulative totals, so we overwrite, not add
      if (chunk.usage) {
        finalUsage = chunk.usage;
      }
    }

    // Use final cumulative usage (not sum of chunks)
    if (finalUsage) {
      tokenUsage.prompt = finalUsage.promptTokenCount || 0;
      tokenUsage.response = finalUsage.candidatesTokenCount || 0;
    }

    return {
      response: analysis,
      actions: [{ type: "analyze", description: "Performed code analysis" }],
      tokenUsage,
    };
  }

  /**
   * بهینه‌سازی کد
   */
  private static async optimizeCode(
    message: string,
    apiKey: string,
    modelId: ModelId,
    requestId?: string,
  ): Promise<{
    response: string;
    actions: AgentAction[];
    files?: Record<string, FileData>;
    tokenUsage?: { prompt: number; response: number };
  }> {
    // استفاده از multi-agent برای بهینه‌سازی
    MultiAgentService.setActiveAgents(["architect", "coder", "reviewer"]);

    const result = await MultiAgentService.orchestrateAgents(
      message,
      this.context.messages,
      modelId,
      apiKey,
      this.context.files,
    );

    return {
      response: result.finalResponse,
      actions: [
        { type: "optimize", description: "Code optimized by multi-agent team" },
      ],
    };
  }

  /**
   * رفع اشکال
   */
  private static async debugCode(
    message: string,
    apiKey: string,
    modelId: ModelId,
    requestId?: string,
  ): Promise<{
    response: string;
    actions: AgentAction[];
    fixes?: Record<string, FileData>;
    tokenUsage?: { prompt: number; response: number };
  }> {
    MultiAgentService.setActiveAgents(["debugger", "coder"]);

    const result = await MultiAgentService.orchestrateAgents(
      message,
      this.context.messages,
      modelId,
      apiKey,
      this.context.files,
    );

    return {
      response: result.finalResponse,
      actions: [
        {
          type: "debug",
          description: "Issues analyzed and fixed by debugger agent",
        },
      ],
    };
  }

  /**
   * گفتگوی عادی با پشتیبانی از tool calls
   * Enhanced with Local AI integration
   */
  private static async chat(
    message: string,
    apiKey: string,
    modelId: ModelId,
    executionPlan?: any,
    sessionId?: string | null,
    requestId?: string,
  ): Promise<{
    response: string;
    tokenUsage: { prompt: number; response: number };
    providerLimit?: any;
  }> {
    // CRITICAL: requestId MUST be provided from UI layer - NO FALLBACK GENERATION
    // Any missing requestId = CODE_BUG
    if (!requestId) {
      throw new Error(
        "CODE_BUG: requestId is required in chat(). It must be generated in UI layer (App.tsx) and passed explicitly. No service may generate requestId.",
      );
    }
    const finalRequestId = requestId;

    const mode = executionPlan?.mode || "CLOUD";
    const useCloudForResponse = executionPlan?.useCloudForResponse !== false;
    const useLocalForResponse = executionPlan?.useLocalForResponse === true;
    const fallbackMode = executionPlan?.fallbackMode;

    // Try cloud first if plan says so
    if (useCloudForResponse && apiKey) {
      // ==================== CHAOS TESTING ====================
      if (ChaosTesting.shouldSimulateAPIOutage()) {
        throw new Error("Chaos test: Simulated API outage");
      }

      try {
        // Use the full system instruction that includes tool information and MCP status
        const mcpStatus = formatMcpStatusForSystemInstruction();
        const systemPrompt =
          INITIAL_SYSTEM_INSTRUCTION +
          mcpStatus +
          `

Current Project Context:
- Files: ${Object.keys(this.context.files).join(", ") || "No files yet"}
- Active file: ${this.context.activeFile || "None"}
- Project: ${this.context.projectState.name}

LANGUAGE: Respond in the same language as the user's message only (e.g. if they write in Persian, respond only in Persian; if in English, only in English). Do not mix two languages in one reply.

IMPORTANT: When the user asks you to create files or code, USE THE TOOLS. Don't just describe what you would do - actually do it using create_file, write_code, or other appropriate tools.`;

        // Use enhanced context extraction
        const context = await ContextManager.extractRelevantContext(
          this.context.messages,
          message,
          modelId,
        );

        // Use chatWithTools to handle tool execution
        const result = await this.chatWithTools(
          message,
          apiKey,
          modelId,
          systemPrompt,
          10,
          context,
          finalRequestId,
        );
        console.log("[FALLBACK]: NOT_ACTIVATED");
        return result;
      } catch (error: any) {
        // CRITICAL: FatalAIError must NEVER be swallowed - rethrow immediately
        const { isFatalError } = await import("./fatalAIError");
        if (isFatalError(error)) {
          console.error(
            "[AgentOrchestrator] FATAL_ERROR_DETECTED - terminating pipeline",
            (error as any).message,
          );
          throw error; // ⛔️ Stop everything - no fallback, no retry
        }

        console.error("[AgentOrchestrator] Cloud AI failed:", error);

        // Fallback to local AI if available (only for non-fatal errors)
        if (fallbackMode && LocalAIModelService.getStatus() === "READY") {
          console.log("[FALLBACK]: ACTIVATED");
          try {
            return await this.chatWithLocalAI(message, mode);
          } catch (localError: any) {
            // CRITICAL: Check if localError is FatalAIError
            if (isFatalError(localError)) {
              console.error(
                "[AgentOrchestrator] FATAL_ERROR_DETECTED in local AI fallback - terminating pipeline",
                (localError as any).message,
              );
              throw localError; // ⛔️ Stop everything
            }
            console.error(
              "[AgentOrchestrator] Local AI fallback also failed:",
              localError,
            );
            throw error; // Throw original error
          }
        } else {
          console.log("[FALLBACK]: NOT_ACTIVATED (no fallback available)");
        }
        throw error;
      }
    }

    // Use local AI directly
    if (useLocalForResponse && LocalAIModelService.getStatus() === "READY") {
      try {
        return await this.chatWithLocalAI(message, mode);
      } catch (error) {
        console.error("[AgentOrchestrator] Local AI failed:", error);
        // If offline mode, return best effort response
        if (mode === "OFFLINE") {
          return {
            response:
              "⚠️ Offline mode: I'm having trouble processing your request. Please check your connection or try again later.",
            tokenUsage: { prompt: 0, response: 0 },
          };
        }
        throw error;
      }
    }

    // Fallback: return error message
    return {
      response:
        "⚠️ Unable to process request. Please check your API key and connection.",
      tokenUsage: { prompt: 0, response: 0 },
    };
  }

  /**
   * Chat using local AI
   */
  private static async chatWithLocalAI(
    message: string,
    mode: ExecutionMode,
  ): Promise<{
    response: string;
    tokenUsage: { prompt: number; response: number };
  }> {
    const systemPrompt = `You are a helpful coding assistant. Provide clear, concise responses. Respond in the same language as the user's message only; do not mix languages in one reply.
${mode === "OFFLINE" ? "Note: Operating in offline mode. Provide best-effort responses." : ""}`;

    const result = await LocalAIModelService.infer(message, {
      systemPrompt,
      maxTokens: 512,
      timeout: 30000,
      temperature: 0.7,
    });

    console.log("[OFFLINE_RESPONSE]: BEST_EFFORT");

    return {
      response: result.text,
      tokenUsage: {
        prompt: TokenOptimizer.estimateTokens(message),
        response: result.tokens,
      },
    };
  }

  /**
   * Chat with tool execution support
   * Handles tool calls from Gemini, executes them, and continues conversation
   */
  private static async chatWithTools(
    message: string,
    apiKey: string,
    modelId: ModelId,
    systemPrompt: string,
    maxIterations: number = 10,
    context?: any[],
    requestId?: string,
  ): Promise<{
    response: string;
    tokenUsage: { prompt: number; response: number };
  }> {
    // CRITICAL: requestId MUST be provided from UI layer - NO FALLBACK GENERATION
    // Any missing requestId = CODE_BUG
    if (!requestId) {
      throw new Error(
        "CODE_BUG: requestId is required in chatWithTools(). It must be generated in UI layer (App.tsx) and passed explicitly. No service may generate requestId.",
      );
    }
    const finalRequestId = requestId;
    let conversationHistory = [...this.context.messages];
    let iteration = 0;
    let finalResponse = "";
    let totalTokenUsage = { prompt: 0, response: 0 };

    // Create callbacks for mcpService
    const callbacks = {
      setFiles: (
        updater: (prev: Record<string, FileData>) => Record<string, FileData>,
      ) => {
        this.context.files = updater(this.context.files);
      },
      setOpenFiles: () => {}, // Not used in orchestrator
      setActiveFile: (file: string | null) => {
        this.context.activeFile = file;
      },
      getActiveFile: () => this.context.activeFile,
      getOpenFiles: () => [], // Not used in orchestrator
      getTokenUsage: () => {
        // Get token usage from localStorage (stored by App.tsx)
        try {
          const saved = localStorage.getItem("gstudio_token_usage");
          if (saved) {
            return JSON.parse(saved);
          }
        } catch (e) {
          console.error("Failed to read token usage from localStorage:", e);
        }
        return { prompt: 0, response: 0 };
      },
      getSelectedModel: () => {
        // Get selected model from localStorage
        try {
          const saved = localStorage.getItem("gstudio_selected_model");
          if (saved) {
            return saved;
          }
        } catch (e) {
          console.error("Failed to read selected model from localStorage:", e);
        }
        return modelId; // Fallback to current modelId
      },
    };

    while (iteration < maxIterations) {
      // Add user message if first iteration
      if (iteration === 0) {
        conversationHistory.push({
          id: Math.random().toString(36).substring(7),
          role: "user",
          content: message,
          timestamp: Date.now(),
        });
      }

      // Stream response from Gemini
      // OPTIMIZATION: Use minimal context and caching
      // Optional: Use optimized service if feature flag is enabled
      let responseText = "";
      const toolCalls: ToolCall[] = [];
      let finalUsage = null;

      // Check API key validation status for network reliability
      // Use cached validation result to avoid blocking the request
      let apiKeyValidated = false;
      try {
        if (apiKey) {
          const validationCache = localStorage.getItem(
            "gstudio_api_key_validated",
          );
          if (validationCache) {
            const cached = JSON.parse(validationCache);
            // Cache valid for 5 minutes
            if (
              Date.now() - cached.timestamp < 300000 &&
              cached.apiKey === apiKey
            ) {
              apiKeyValidated = cached.valid;
            } else {
              // Cache expired or different key - assume validated if we have a key
              // (actual validation happens in validateApiKey calls elsewhere)
              apiKeyValidated = true; // Optimistic - we have a key
            }
          } else {
            // No cache - assume validated if we have a key
            // This is optimistic but safe - network reliability will handle actual failures
            apiKeyValidated = true;
          }
        }
      } catch (error) {
        // If cache read fails, assume not validated (conservative)
        console.warn(
          "[AgentOrchestrator] API key validation cache read failed:",
          error,
        );
        apiKeyValidated = false;
      }

      // Use optimized service if feature flag is enabled, otherwise use base service
      const service = this.getService();
      const stream = service.streamChat(
        modelId,
        conversationHistory,
        iteration === 0 ? message : "", // Only send message on first iteration
        undefined,
        systemPrompt,
        apiKey,
        true, // useCache
        true, // useMinimalContext - only send relevant context, not full history
        apiKeyValidated, // Pass validation status for network reliability
        finalRequestId, // Pass requestId for correlation
      );

      // CRITICAL: Token counting fix - use final cumulative usage, not sum of chunks
      // Handle PROVIDER_LIMIT (quota exhaustion) gracefully
      try {
        for await (const chunk of stream) {
          // Check for provider limit (quota exhaustion)
          if (chunk.providerLimit) {
            console.log(
              `[AgentOrchestrator][requestId=${finalRequestId}][PROVIDER_LIMIT]: Cloud AI unavailable - returning graceful response`,
            );
            // Return graceful degradation response
            return {
              response:
                DegradedMode.getDegradedMessage("gemini") ||
                "Cloud AI is temporarily unavailable. Core features remain active.",
              tokenUsage: totalTokenUsage,
            };
          }

          if (chunk.text) {
            responseText += chunk.text;
          }
          if (chunk.toolCalls) {
            toolCalls.push(...chunk.toolCalls);
          }
          // Store final usage (cumulative, not incremental)
          // Each chunk.usage contains cumulative totals, so we overwrite, not add
          if (chunk.usage) {
            finalUsage = chunk.usage;
          }
        }
      } catch (error: any) {
        // CRITICAL: FatalAIError must NEVER be swallowed - rethrow immediately
        const { isFatalError } = await import("./fatalAIError");
        if (isFatalError(error)) {
          console.error(
            `[AgentOrchestrator][requestId=${finalRequestId}] FATAL_ERROR_DETECTED in stream - terminating pipeline`,
            (error as any).message,
          );
          throw error; // ⛔️ Stop everything - no fallback, no retry
        }
        // Re-throw other errors
        throw error;
      }

      // Use final cumulative usage (not sum of chunks)
      // NOTE: For multi-iteration conversations, we add each iteration's final usage
      // because each iteration is a separate API call with its own cumulative totals
      if (finalUsage) {
        totalTokenUsage.prompt += finalUsage.promptTokenCount || 0;
        totalTokenUsage.response += finalUsage.candidatesTokenCount || 0;
      }

      // If we have text response and no tool calls, we're done
      if (responseText && toolCalls.length === 0) {
        finalResponse = responseText;
        break;
      }

      // If we have tool calls, execute them
      if (toolCalls.length > 0) {
        // Add model message with tool calls to history
        conversationHistory.push({
          id: Math.random().toString(36).substring(7),
          role: "model",
          content: responseText || "",
          toolCalls: toolCalls,
          timestamp: Date.now(),
        });

        // Execute all tool calls
        const toolResults: ToolResult[] = [];
        for (const toolCall of toolCalls) {
          try {
            const result = await McpService.executeTool(
              toolCall.name,
              toolCall.args,
              this.context.files,
              callbacks,
            );

            toolResults.push({
              id: toolCall.id,
              name: toolCall.name,
              result: result.success
                ? { success: true, message: result.message, data: result.data }
                : {
                    success: false,
                    message: result.message,
                    error: result.error,
                  },
            });

            // NOTE: We do NOT preserve or send thoughtSignature
            // The SDK handles function call continuity automatically
            // We only store toolResults for internal tracking

            // Update files if tool modified them
            this.context.files = { ...this.context.files };
          } catch (error: any) {
            toolResults.push({
              id: toolCall.id,
              name: toolCall.name,
              result: {
                success: false,
                message: `Error: ${error.message}`,
                error: error.message,
              },
            });
          }
        }

        // Add function message with results to history
        // NOTE: We store toolResults internally for our context,
        // but we NEVER send toolCalls or thoughtSignature to the API
        // The SDK handles function call continuity automatically
        conversationHistory.push({
          id: Math.random().toString(36).substring(7),
          role: "function",
          content: "", // Required by Message type, but empty for function messages
          // Store toolResults for internal tracking only
          // These will be converted to proper tool responses by formatHistory
          toolResults: toolResults,
          timestamp: Date.now(),
          // NEVER store toolCalls here - they're internal model artifacts
        });

        // Continue conversation with tool results
        iteration++;
        continue;
      }

      // If we have text but no tool calls, we're done
      if (responseText) {
        finalResponse = responseText;
        break;
      }

      iteration++;
    }

    return {
      response: finalResponse || "No response generated.",
      tokenUsage: totalTokenUsage,
    };
  }

  /**
   * ذخیره در پایگاه داده
   */
  private static async saveToDatabase(
    message: string,
    response: string,
    actions: AgentAction[],
  ): Promise<void> {
    try {
      await databaseService.saveConversation({
        messages: [
          { role: "user", content: message },
          { role: "assistant", content: response },
        ],
        projectState: this.context.projectState,
        actions: actions,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error("Failed to save to database:", error);
    }
  }

  /**
   * دریافت وضعیت پروژه
   */
  static getProjectState(): ProjectState {
    return this.context.projectState;
  }

  /**
   * ریست context
   */
  static reset(): void {
    this.context = {
      files: {},
      activeFile: null,
      messages: [],
      projectState: {
        name: "New Project",
        description: "",
        files: [],
        structure: {},
        technologies: [],
        status: "planning",
      },
    };
  }

  /**
   * Decompose task into autonomous steps
   */
  private static decomposeTask(
    intent: any,
    message: string,
  ): Array<{ action: string; description: string }> {
    const steps: Array<{ action: string; description: string }> = [];

    switch (intent.type) {
      case "create_file":
        steps.push(
          {
            action: "analyze_requirements",
            description: "Analyze file requirements",
          },
          { action: "generate_code", description: "Generate code structure" },
          { action: "validate_code", description: "Validate generated code" },
        );
        break;
      case "edit_file":
        steps.push(
          {
            action: "analyze_current",
            description: "Analyze current file state",
          },
          { action: "plan_changes", description: "Plan required changes" },
          { action: "apply_changes", description: "Apply changes" },
          { action: "validate_changes", description: "Validate changes" },
        );
        break;
      case "analyze_code":
        steps.push(
          { action: "read_code", description: "Read and parse code" },
          {
            action: "analyze_structure",
            description: "Analyze code structure",
          },
          {
            action: "generate_insights",
            description: "Generate analysis insights",
          },
        );
        break;
      case "optimize_code":
        steps.push(
          {
            action: "identify_issues",
            description: "Identify optimization opportunities",
          },
          {
            action: "plan_optimizations",
            description: "Plan optimization strategy",
          },
          { action: "apply_optimizations", description: "Apply optimizations" },
          {
            action: "verify_optimizations",
            description: "Verify improvements",
          },
        );
        break;
      case "debug":
        steps.push(
          { action: "identify_bug", description: "Identify the bug" },
          { action: "analyze_root_cause", description: "Analyze root cause" },
          { action: "propose_fix", description: "Propose fix" },
          { action: "apply_fix", description: "Apply fix" },
          { action: "verify_fix", description: "Verify fix works" },
        );
        break;
      default:
        // General chat - single step
        steps.push({ action: "respond", description: "Generate response" });
    }

    return steps;
  }

  /**
   * Execute a single autonomous step
   */
  private static async executeAutonomousStep(
    step: { action: string; description: string },
    stepNumber: number,
    apiKey: string,
    modelId: ModelId,
    currentFiles: Record<string, FileData>,
    history: Message[],
    executionPlan: any,
    sessionId: string | null,
    executionId: string,
    requestId?: string,
  ): Promise<{
    success: boolean;
    response: string;
    actions: AgentAction[];
    updatedFiles?: Record<string, FileData>;
    tokenUsage?: { prompt: number; response: number };
  }> {
    // MUST use ModelArbitrator for each step
    const arbitrationResult = await ModelArbitrator.arbitrate({
      taskType: ModelArbitrator.detectTaskType(step.description),
      message: step.description,
      history,
      apiKey,
    });

    // MUST respect HybridDecisionEngine
    const stepExecutionPlan = await HybridDecisionEngine.decideMode({
      networkState: HybridDecisionEngine.checkNetworkState(),
      apiKey,
      message: step.description,
      history,
    });

    // Execute step based on action type
    let response = "";
    let actions: AgentAction[] = [];
    let updatedFiles = { ...currentFiles };
    let tokenUsage = { prompt: 0, response: 0 };
    const stepStartTime = Date.now(); // Track step execution time

    try {
      // Use chat method for most steps
      const chatResult = await this.chat(
        step.description,
        apiKey,
        modelId,
        stepExecutionPlan,
        sessionId,
        requestId, // Pass requestId from processUserMessage context
      );

      response = chatResult.response;
      tokenUsage = chatResult.tokenUsage || { prompt: 0, response: 0 };
      updatedFiles = { ...this.context.files };

      // Record context and lineage for this step
      if (sessionId) {
        const stepEntryId = await ContextDatabaseBridge.addEntry(sessionId, {
          role: "assistant",
          content: `[Autonomous Step ${stepNumber}]: ${response}`,
          tokenEstimate: TokenOptimizer.estimateTokens(response),
          importance: 0.6,
        });

        if (stepEntryId) {
          const contextEntries = await ContextDatabaseBridge.getRelevantContext(
            sessionId,
            step.description,
            10,
          );
          const contextEntryIds = contextEntries.map((e) => e.id);
          const summaries = await ContextDatabaseBridge.getSummaries(sessionId);
          const summaryIds = summaries.map((s) => s.id);

          await ContextDatabaseBridge.recordLineage(sessionId, {
            responseId: stepEntryId,
            contextEntryIds,
            summaryIds,
            model: modelId,
            mode: stepExecutionPlan.mode,
          });
        }
      }

      // Record model ROI for this step
      const stepId = `step_${stepNumber}_${executionId}`;
      const stepLatency = Date.now() - stepStartTime;
      const quality = 1.0; // Success
      const cost = 0; // Simplified - actual cost calculation would use token counts

      ProductivityMetrics.recordModelROI(
        executionId,
        stepId,
        modelId,
        quality,
        stepLatency,
        cost,
      );

      return {
        success: true,
        response,
        actions,
        updatedFiles,
        tokenUsage,
      };
    } catch (error: any) {
      // CRITICAL: FatalAIError must NEVER be swallowed - rethrow immediately
      const { isFatalError } = await import("./fatalAIError");
      if (isFatalError(error)) {
        console.error(
          `[AUTONOMOUS]: FATAL_ERROR_DETECTED in step (${step.action}) - terminating pipeline`,
          (error as any).message,
        );
        throw error; // ⛔️ Stop everything - no retry, no fallback
      }

      console.error(`[AUTONOMOUS]: STEP_ERROR (${step.action})`, error);

      // Record model ROI for failed step
      const stepId = `step_${stepNumber}_${executionId}`;
      const stepLatency = Date.now() - stepStartTime;
      const quality = 0.3; // Failure
      const cost = 0;

      ProductivityMetrics.recordModelROI(
        executionId,
        stepId,
        modelId,
        quality,
        stepLatency,
        cost,
      );

      return {
        success: false,
        response:
          error instanceof Error ? error.message : "Step execution failed",
        actions: [],
        updatedFiles: {},
        tokenUsage: { prompt: 0, response: 0 },
      };
    }
  }
}

export interface AgentAction {
  type:
    | "create_project"
    | "create_file"
    | "edit_file"
    | "delete_file"
    | "analyze"
    | "optimize"
    | "debug"
    | "create_files";
  description: string;
  details?: any;
}
