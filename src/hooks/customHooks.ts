/**
 * Custom Context Hooks
 *
 * The analysis identified 16 wiring issues where direct useContext() calls
 * should be replaced with custom hooks for better encapsulation and error handling.
 *
 * Create these hooks to fix the wiring issues identified in the analysis.
 */

import { useContext } from "react";

// ============================================
// APP STATE CONTEXT
// ============================================
import { AppStateContext } from "@/contexts/AppStateContext";

export const useAppStateContext = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error("useAppStateContext must be used within AppStateProvider");
  }
  return context;
};

// ============================================
// DATABASE CONTEXT
// ============================================
import { DatabaseContext } from "@/contexts/DatabaseContext";

export const useDatabaseContext = () => {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error("useDatabaseContext must be used within DatabaseProvider");
  }
  return context;
};

// ============================================
// LM STUDIO CONTEXT
// ============================================
import { LMStudioContext } from "@/contexts/LMStudioProvider";

export const useLMStudioContext = () => {
  const context = useContext(LMStudioContext);
  if (!context) {
    throw new Error("useLMStudioContext must be used within LMStudioProvider");
  }
  return context;
};

// ============================================
// MODAL CONTEXT
// ============================================
import { ModalContext } from "@/contexts/ModalContext";

export const useModalContext = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModalContext must be used within ModalProvider");
  }
  return context;
};

// Split into separate hooks for better granularity
export const useModals = () => {
  const context = useModalContext();
  return context.modals;
};

export const useModalActions = () => {
  const context = useModalContext();
  return {
    openModal: context.openModal,
    closeModal: context.closeModal,
    toggleModal: context.toggleModal,
  };
};

// ============================================
// NOTIFICATION CONTEXT
// ============================================
import { NotificationContext } from "@/contexts/NotificationContext";

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error(
      "useNotificationContext must be used within NotificationProvider",
    );
  }
  return context;
};

// ============================================
// GEMINI TESTER CONTEXT
// ============================================
import { GeminiTesterContext } from "@/features/ai/gemini-tester/GeminiTesterContext";

export const useGeminiTesterContext = () => {
  const context = useContext(GeminiTesterContext);
  if (!context) {
    throw new Error(
      "useGeminiTesterContext must be used within GeminiTesterProvider",
    );
  }
  return context;
};

// ============================================
// TOOLTIP CONTEXT
// ============================================
import { TooltipContext } from "@/features/help/HelpSystem";

export const useTooltipContext = () => {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error("useTooltipContext must be used within TooltipProvider");
  }
  return context;
};

// ============================================
// AGENT ORCHESTRATOR CONTEXT (re-export from core)
// ============================================
export { useAgentOrchestratorContext } from "@/hooks/core/useAgentOrchestrator";

// ============================================
// AUTONOMOUS MODE CONTEXT (re-export from core)
// ============================================
export { useAutonomousModeContext } from "@/hooks/core/useAutonomousMode";

// ============================================
// CONTEXT MANAGER CONTEXT (re-export from core)
// ============================================
export { useContextManagerContext } from "@/hooks/core/useContextManager";

// ============================================
// GEMINI CONTEXT (re-export from core)
// ============================================
export { useGeminiContext } from "@/hooks/core/useGemini";

// ============================================
// MCP CONTEXT (re-export from core)
// ============================================
export { useMcpContext } from "@/hooks/core/useMcp";

// ============================================
// MODEL SELECTION CONTEXT (re-export from core)
// ============================================
export { useModelSelectionContext } from "@/hooks/core/useModelSelection";

// ============================================
// SPEECH RECOGNITION CONTEXT (re-export from voice)
// ============================================
export { useSpeechRecognitionContext } from "@/hooks/voice/useSpeechRecognition";

// ============================================
// VOICE COMMANDS CONTEXT (re-export from voice)
// ============================================
export { useVoiceCommandsContext } from "@/hooks/voice/useVoiceCommands";

// ============================================
// TOOLS CONTEXT (for ModalManager integration)
// ============================================
// If you have a ToolsContext, add it here
export const useTools = () => {
  // Return your tools state
  // This is a placeholder - adjust based on your actual implementation
  return {
    availableTools: [],
    activeTool: null,
  };
};

export const useToolActions = () => {
  // Return your tool actions
  return {
    selectTool: (toolId: string) => {},
    executeTool: (toolId: string, params: any) => {},
  };
};

// ============================================
// CODE METRICS HOOK
// ============================================
export const useCodeMetrics = () => {
  // Return code metrics state
  // This is a placeholder - adjust based on your actual implementation
  return {
    lines: 0,
    complexity: 0,
    maintainability: 0,
  };
};

// ============================================
// USAGE EXAMPLE
// ============================================
/*
// Before (Direct useContext - NOT RECOMMENDED):
import { useContext } from 'react';
import { ModalContext } from '@/contexts/ModalContext';

function MyComponent() {
  const modalContext = useContext(ModalContext);
  // ...
}

// After (Custom Hook - RECOMMENDED):
import { useModalContext, useModals, useModalActions } from '@/hooks/customHooks';

function MyComponent() {
  const modals = useModals();
  const modalActions = useModalActions();
  
  // Now you have:
  // - Better error handling (throws if not in provider)
  // - Better encapsulation
  // - Easier to mock in tests
  // - Better TypeScript inference
}
*/
