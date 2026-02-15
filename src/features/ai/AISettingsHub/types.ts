import {
  ModelId,
  PersonaType,
  ResponseStyleType,
  CodeStyleType,
  ExecutionModeType,
} from "@/mcp/runtime/types";

export interface AIConfig {
  modelId: ModelId;
  temperature: number;
  topP: number;
  topK: number;
  maxOutputTokens: number;
  stopSequences?: string[];
  apiKey: string;
  selectionMode: "auto" | "manual";
  persona: PersonaType;
  responseStyle: ResponseStyleType;
  codeStyle: CodeStyleType;
  autoFormat: boolean;
  voiceEnabled: boolean;
  language: string;
  voiceModel: string;
  autoSend: boolean;
  confidenceThreshold: number;
  localAIEnabled: boolean;
  localModel: string;
  offlineMode: "auto" | "manual";
  fallbackToCloud: boolean;
  promptImprovement: boolean;
  promptMode: "deterministic" | "creative";
  notifications: boolean;
  apiEndpoint?: string;
  executionMode?: ExecutionModeType;
  selectedModel?: ModelId;
  maxTokens?: number;
  enableStreaming?: boolean;
  localEndpoint?: string;
  voiceEngine?: string;
  continuousListening?: boolean;
  ttsVoice?: string;
  ttsRate?: number;
  ttsPitch?: number;
  ttsVolume?: number;
  ttsEnabled?: boolean;
  autoSpeak?: boolean;
}

export const DEFAULT_CONFIG: AIConfig = {
  modelId: ModelId.Gemini3FlashPreview,
  temperature: 0.7,
  topP: 0.9,
  topK: 0.8,
  maxOutputTokens: 2048,
  apiKey: "",
  selectionMode: "auto",
  persona: "professional",
  responseStyle: "detailed",
  codeStyle: "modern",
  autoFormat: true,
  voiceEnabled: false,
  language: "en-US",
  voiceModel: "Vosk",
  autoSend: true,
  confidenceThreshold: 0.7,
  localAIEnabled: false,
  localModel: "",
  offlineMode: "auto",
  fallbackToCloud: true,
  promptImprovement: false,
  promptMode: "deterministic",
  notifications: true,
};

export interface ModelInfo {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  pricePerToken: number;
  contextWindow: number;
  inputTokenLimit?: number;
  outputTokenLimit?: number;
}
