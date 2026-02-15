/**
 * AI Settings Hub - Component Exports
 */

export { ConnectionTab } from './ConnectionTab';
export { ModelsTab } from './ModelsTab';
export { APITestTab } from './APITestTab';
export { BehaviorTab } from './BehaviorTab';
export { VoiceInputTab } from './VoiceInputTab';
export { VoiceOutputTab } from './VoiceOutputTab';
export { LocalAITab } from './LocalAITab';
export { ProvidersTab } from './ProvidersTab';
export { CustomProviderModal } from './CustomProviderModal';

export type { 
  AIConfig, 
  PersonaType, 
  ResponseStyleType, 
  CodeStyleType, 
  ExecutionModeType,
  ModelInfo,
  AgentConfig,
  TestResult,
  ConnectionStatus,
} from "@/types/types";

export { DEFAULT_CONFIG } from "@/types/types";

