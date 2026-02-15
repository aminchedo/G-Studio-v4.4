/**
 * Smart Model Selector - Intelligent AI Model Selection
 *
 * Automatically recommends the best AI model based on:
 * - Task type (coding, chat, analysis, reasoning)
 * - User priority (cost, speed, quality, balanced)
 * - Estimated token usage
 * - Model capabilities and availability
 *
 * Inspired by nexusai-editor-4's intelligent model selection system
 */

import { ModelId } from "@/mcp/runtime/types";

export interface ModelOption {
  id: string;
  name: string;
  provider: "google" | "openai" | "anthropic" | "local" | "custom";

  // Performance metrics
  speed: "very-fast" | "fast" | "medium" | "slow";
  quality: "excellent" | "good" | "fair";

  // Cost (USD per million tokens, 0 for local)
  costPerMillionTokens: number;

  // Capabilities
  capabilities: {
    coding: boolean;
    reasoning: boolean;
    longContext: boolean;
    multimodal: boolean;
    streaming: boolean;
  };

  // Availability
  available: boolean;
  endpoint?: string;

  // Context window
  contextWindow: number;

  // Additional metadata
  description?: string;
  maxOutputTokens?: number;
}

export interface TaskRequirements {
  type: "coding" | "chat" | "analysis" | "reasoning" | "quick-question";
  priority: "cost" | "speed" | "quality" | "balanced";
  estimatedTokens?: number;
  requiresLongContext?: boolean;
  requiresMultimodal?: boolean;
}

export interface ModelRecommendation {
  model: ModelOption;
  score: number;
  reasoning: string;
  estimatedCost: number;
  estimatedTime: number; // seconds
  alternatives: Array<{
    model: ModelOption;
    score: number;
    reasoning: string;
  }>;
}

class SmartModelSelector {
  private availableModels: ModelOption[] = [];
  private userPreferences = {
    maxCostPerRequest: 0.1, // $0.10 max per request
    preferLocal: false, // Prefer cloud models by default
    qualityThreshold: "good" as "excellent" | "good" | "fair",
    maxWaitTime: 30, // seconds
  };

  constructor() {
    this.initializeModels();
  }

  /**
   * Initialize available models
   */
  private initializeModels() {
    this.availableModels = this.getGoogleModels();
    // Can be extended with OpenAI, Anthropic, etc.
  }

  /**
   * Get Google Gemini models
   */
  private getGoogleModels(): ModelOption[] {
    return [
      {
        id: ModelId.Gemini2Flash,
        name: "Gemini 2.0 Flash",
        provider: "google",
        speed: "very-fast",
        quality: "excellent",
        costPerMillionTokens: 0.075, // Input: $0.075, Output: $0.30
        capabilities: {
          coding: true,
          reasoning: true,
          longContext: true,
          multimodal: true,
          streaming: true,
        },
        available: true,
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        description: "Latest Gemini model with multimodal capabilities",
      },
      {
        id: ModelId.Gemini2FlashThinking,
        name: "Gemini 2.0 Flash Thinking",
        provider: "google",
        speed: "fast",
        quality: "excellent",
        costPerMillionTokens: 0.075,
        capabilities: {
          coding: true,
          reasoning: true,
          longContext: true,
          multimodal: true,
          streaming: true,
        },
        available: true,
        contextWindow: 65536,
        maxOutputTokens: 8192,
        description: "Optimized for complex reasoning tasks",
      },
      {
        id: ModelId.Gemini15Pro,
        name: "Gemini 1.5 Pro",
        provider: "google",
        speed: "fast",
        quality: "excellent",
        costPerMillionTokens: 1.25, // Input: $1.25, Output: $5.00
        capabilities: {
          coding: true,
          reasoning: true,
          longContext: true,
          multimodal: true,
          streaming: true,
        },
        available: true,
        contextWindow: 2000000,
        maxOutputTokens: 8192,
        description: "Most capable Gemini model with massive context",
      },
      {
        id: ModelId.Gemini15Flash,
        name: "Gemini 1.5 Flash",
        provider: "google",
        speed: "very-fast",
        quality: "good",
        costPerMillionTokens: 0.075,
        capabilities: {
          coding: true,
          reasoning: true,
          longContext: true,
          multimodal: true,
          streaming: true,
        },
        available: true,
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        description: "Fast and efficient for most tasks",
      },
      {
        id: ModelId.Gemini15Flash8B,
        name: "Gemini 1.5 Flash-8B",
        provider: "google",
        speed: "very-fast",
        quality: "good",
        costPerMillionTokens: 0.0375, // Input: $0.0375, Output: $0.15
        capabilities: {
          coding: true,
          reasoning: true,
          longContext: true,
          multimodal: false,
          streaming: true,
        },
        available: true,
        contextWindow: 1000000,
        maxOutputTokens: 8192,
        description: "Smallest and fastest Gemini model",
      },
    ];
  }

  /**
   * Calculate model score based on task requirements
   */
  private calculateScore(model: ModelOption, task: TaskRequirements): number {
    let score = 0;

    // Base availability
    if (!model.available) return 0;

    // Task type matching
    if (task.type === "coding" && model.capabilities.coding) score += 30;
    if (task.type === "reasoning" && model.capabilities.reasoning) score += 30;
    if (task.type === "analysis" && model.capabilities.reasoning) score += 25;
    if (task.type === "quick-question") score += 20; // Any model can handle

    // Priority-based scoring
    switch (task.priority) {
      case "cost":
        // Favor cheaper models
        if (model.costPerMillionTokens < 0.1) score += 40;
        else if (model.costPerMillionTokens < 0.5) score += 30;
        else if (model.costPerMillionTokens < 1.0) score += 20;
        else score += 10;
        break;

      case "speed":
        // Favor fast models
        if (model.speed === "very-fast") score += 40;
        else if (model.speed === "fast") score += 30;
        else if (model.speed === "medium") score += 15;
        break;

      case "quality":
        // Favor high quality models
        if (model.quality === "excellent") score += 40;
        else if (model.quality === "good") score += 25;
        else score += 10;
        break;

      case "balanced":
        // Balance between cost, speed, and quality
        if (model.costPerMillionTokens < 0.2) score += 15;
        if (model.speed === "very-fast" || model.speed === "fast") score += 15;
        if (model.quality === "excellent") score += 20;
        else if (model.quality === "good") score += 15;
        break;
    }

    // Context window requirements
    if (task.requiresLongContext) {
      if (model.contextWindow >= 1000000) score += 20;
      else if (model.contextWindow >= 100000) score += 15;
      else if (model.contextWindow >= 32000) score += 10;
      else if (model.contextWindow < 8000) score -= 20;
    }

    // Multimodal requirements
    if (task.requiresMultimodal) {
      if (model.capabilities.multimodal) score += 30;
      else score -= 50; // Heavy penalty
    }

    // Estimated cost check
    if (task.estimatedTokens && model.provider !== "local") {
      const estimatedCost =
        (task.estimatedTokens / 1000000) * model.costPerMillionTokens;
      if (estimatedCost > this.userPreferences.maxCostPerRequest) {
        score -= 30; // Penalty for expensive requests
      }
    }

    return Math.max(0, score);
  }

  /**
   * Get model recommendation for a task
   */
  async recommend(task: TaskRequirements): Promise<ModelRecommendation> {
    // Calculate scores for all models (deterministic: same task => same order; tiebreak by model id)
    const scoredModels = this.availableModels
      .map((model) => ({
        model,
        score: this.calculateScore(model, task),
      }))
      .filter((item) => item.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score || (a.model.id < b.model.id ? -1 : a.model.id > b.model.id ? 1 : 0),
      );

    if (scoredModels.length === 0) {
      throw new Error("No suitable models available for this task");
    }

    const best = scoredModels[0];
    const alternatives = scoredModels.slice(1, 4).map((item) => ({
      model: item.model,
      score: item.score,
      reasoning: this.generateReasoning(item.model, task),
    }));

    // Calculate estimated cost and time
    const estimatedTokens = task.estimatedTokens || 1000;
    const estimatedCost =
      best.model.provider === "local"
        ? 0
        : (estimatedTokens / 1000000) * best.model.costPerMillionTokens;

    const estimatedTime = this.estimateResponseTime(
      best.model,
      estimatedTokens,
    );

    return {
      model: best.model,
      score: best.score,
      reasoning: this.generateReasoning(best.model, task),
      estimatedCost,
      estimatedTime,
      alternatives,
    };
  }

  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    model: ModelOption,
    task: TaskRequirements,
  ): string {
    const reasons: string[] = [];

    if (model.provider === "local") {
      reasons.push("Free (local model)");
    } else {
      const cost = model.costPerMillionTokens;
      if (cost < 0.1) reasons.push("Very low cost");
      else if (cost < 0.5) reasons.push("Low cost");
      else if (cost < 1.0) reasons.push("Moderate cost");
      else reasons.push("Premium quality");
    }

    if (model.speed === "very-fast") reasons.push("Very fast");
    else if (model.speed === "fast") reasons.push("Fast");

    if (model.quality === "excellent") reasons.push("Excellent quality");
    else if (model.quality === "good") reasons.push("Good quality");

    if (task.type === "coding" && model.capabilities.coding) {
      reasons.push("Optimized for coding");
    }

    if (model.contextWindow > 100000) {
      reasons.push("Large context window");
    }

    if (model.capabilities.multimodal) {
      reasons.push("Multimodal support");
    }

    return reasons.join(" • ");
  }

  /**
   * Estimate response time
   */
  private estimateResponseTime(model: ModelOption, tokens: number): number {
    // Base time by speed
    let baseTime = 0;
    switch (model.speed) {
      case "very-fast":
        baseTime = 1;
        break;
      case "fast":
        baseTime = 2;
        break;
      case "medium":
        baseTime = 5;
        break;
      case "slow":
        baseTime = 10;
        break;
    }

    // Add time based on tokens (rough estimate)
    const tokenTime = (tokens / 1000) * 0.3;

    return baseTime + tokenTime;
  }

  /**
   * Update user preferences
   */
  setPreferences(prefs: Partial<typeof this.userPreferences>) {
    this.userPreferences = { ...this.userPreferences, ...prefs };
  }

  /**
   * Get current preferences
   */
  getPreferences() {
    return { ...this.userPreferences };
  }

  /**
   * Get all available models
   */
  getAvailableModels(): ModelOption[] {
    return this.availableModels.filter((m) => m.available);
  }

  /**
   * Get model by ID
   */
  getModelById(id: string): ModelOption | undefined {
    return this.availableModels.find((m) => m.id === id);
  }

  /**
   * Quick recommendation for common scenarios
   */
  quickRecommend(
    scenario: "fast-chat" | "deep-coding" | "long-analysis" | "budget",
  ): ModelOption {
    const models = this.availableModels;

    switch (scenario) {
      case "fast-chat":
        return models.find((m) => m.id === ModelId.Gemini2Flash) || models[0];
      case "deep-coding":
        return (
          models.find((m) => m.id === ModelId.Gemini2FlashThinking) || models[0]
        );
      case "long-analysis":
        return models.find((m) => m.id === ModelId.Gemini15Pro) || models[0];
      case "budget":
        return (
          models.find((m) => m.id === ModelId.Gemini15Flash8B) || models[0]
        );
      default:
        return models[0];
    }
  }
}

export const smartModelSelector = new SmartModelSelector();
