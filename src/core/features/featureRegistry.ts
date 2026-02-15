/**
 * Feature registry: in-memory feature flags and lazy-load manager.
 * Used by FeaturePanel for toggling and loading features.
 */

export interface FeatureDef {
  id: string;
  name: string;
  description: string;
  category: string;
  enabled: boolean;
}

export const FEATURES: Record<string, FeatureDef> = {
  "code-completion": {
    id: "code-completion",
    name: "Code Completion",
    description: "AI-powered code suggestions and autocomplete",
    category: "editor",
    enabled: true,
  },
  "multi-agent": {
    id: "multi-agent",
    name: "Multi-Agent Collaboration",
    description: "Orchestrate Architect, Coder, Reviewer, Debugger, Documenter",
    category: "ai",
    enabled: true,
  },
  voice: {
    id: "voice",
    name: "Voice Conversation",
    description: "Speech input and output for chat",
    category: "ai",
    enabled: true,
  },
  terminal: {
    id: "terminal",
    name: "Integrated Terminal",
    description: "Built-in terminal for commands",
    category: "tools",
    enabled: true,
  },
  debugging: {
    id: "debugging",
    name: "Debugging Tools",
    description: "Development debugging utilities",
    category: "tools",
    enabled: true,
  },
};

export const featureManager = {
  async loadFeature(_featureId: string): Promise<void> {
    // Lazy-load placeholder: features are loaded by the app when enabled.
    // Can be extended to dynamic import() per feature.
  },
};
