/**
 * Modal Context - Centralized Modal Management
 *
 * Manages all modal states in one place to reduce prop drilling
 * and provide consistent modal behavior across the app.
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";

// ==================== TYPES ====================

type ModalType =
  | "settings"
  | "agent"
  | "mcpTool"
  | "agentSelector"
  | "codeIntelligence"
  | "geminiTester"
  | "aiSettingsHub"
  | "speechTest"
  | "projectStructure"
  | "toolHistory"
  | "toolChains"
  | "toolManager"
  | "codeMetrics"
  | "toolUsageAnalytics"
  | "conversationList"
  | "contextViewer"
  | "voiceChat"
  | "commandPalette"
  | "enhancedSettings";

type AgentModalTab = "connection" | "voice" | "identity";

interface ModalState {
  // Modal open states
  isOpen: (modal: ModalType) => boolean;
  open: (modal: ModalType) => void;
  close: (modal: ModalType) => void;
  toggle: (modal: ModalType) => void;
  closeAll: () => void;

  // Agent Modal specific
  agentModalTab: AgentModalTab;
  setAgentModalTab: (tab: AgentModalTab) => void;
  openAgentModal: (tab?: AgentModalTab) => void;

  // MCP Tool Modal specific
  mcpToolName: string;
  openMcpToolModal: (toolName: string) => void;
}

// ==================== CONTEXT ====================

const ModalContext = createContext<ModalState | undefined>(undefined);

// ==================== PROVIDER ====================

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider: React.FC<ModalProviderProps> = ({ children }) => {
  // Track which modals are open
  const [openModals, setOpenModals] = useState<Set<ModalType>>(new Set());

  // Agent modal specific state
  const [agentModalTab, setAgentModalTab] =
    useState<AgentModalTab>("connection");

  // MCP tool modal specific state
  const [mcpToolName, setMcpToolName] = useState("");

  // Check if a modal is open
  const isOpen = useCallback(
    (modal: ModalType): boolean => {
      return openModals.has(modal);
    },
    [openModals],
  );

  // Open a modal
  const open = useCallback((modal: ModalType) => {
    setOpenModals((prev) => new Set(prev).add(modal));
  }, []);

  // Close a modal
  const close = useCallback((modal: ModalType) => {
    setOpenModals((prev) => {
      const next = new Set(prev);
      next.delete(modal);
      return next;
    });
  }, []);

  // Toggle a modal
  const toggle = useCallback((modal: ModalType) => {
    setOpenModals((prev) => {
      const next = new Set(prev);
      if (next.has(modal)) {
        next.delete(modal);
      } else {
        next.add(modal);
      }
      return next;
    });
  }, []);

  // Close all modals
  const closeAll = useCallback(() => {
    setOpenModals(new Set());
  }, []);

  // Open agent modal with specific tab
  const openAgentModal = useCallback(
    (tab: AgentModalTab = "connection") => {
      setAgentModalTab(tab);
      open("agent");
    },
    [open],
  );

  // Open MCP tool modal with specific tool
  const openMcpToolModal = useCallback(
    (toolName: string) => {
      setMcpToolName(toolName);
      open("mcpTool");
    },
    [open],
  );

  // Memoize context value
  const value = useMemo<ModalState>(
    () => ({
      isOpen,
      open,
      close,
      toggle,
      closeAll,
      agentModalTab,
      setAgentModalTab,
      openAgentModal,
      mcpToolName,
      openMcpToolModal,
    }),
    [
      isOpen,
      open,
      close,
      toggle,
      closeAll,
      agentModalTab,
      openAgentModal,
      mcpToolName,
      openMcpToolModal,
    ],
  );

  return (
    <ModalContext.Provider value={value}>{children}</ModalContext.Provider>
  );
};

// ==================== HOOK ====================

export const useModal = (): ModalState => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
};

// Alias for consistency with naming convention
export const useModalContext = useModal;

// ==================== CONVENIENCE HOOKS ====================

/**
 * Hook for a specific modal
 * Returns { isOpen, open, close, toggle } for that modal
 */
export const useSpecificModal = (modalType: ModalType) => {
  const { isOpen, open, close, toggle } = useModal();

  return useMemo(
    () => ({
      isOpen: isOpen(modalType),
      open: () => open(modalType),
      close: () => close(modalType),
      toggle: () => toggle(modalType),
    }),
    [isOpen, open, close, toggle, modalType],
  );
};

/**
 * Hook for settings modal
 */
export const useSettingsModal = () => useSpecificModal("settings");

/**
 * Hook for agent modal with tab support
 */
export const useAgentModal = () => {
  const { isOpen, openAgentModal, close, agentModalTab, setAgentModalTab } =
    useModal();

  return useMemo(
    () => ({
      isOpen: isOpen("agent"),
      open: openAgentModal,
      close: () => close("agent"),
      tab: agentModalTab,
      setTab: setAgentModalTab,
    }),
    [isOpen, openAgentModal, close, agentModalTab, setAgentModalTab],
  );
};

/**
 * Hook for MCP tool modal
 */
export const useMcpToolModal = () => {
  const { isOpen, openMcpToolModal, close, mcpToolName } = useModal();

  return useMemo(
    () => ({
      isOpen: isOpen("mcpTool"),
      open: openMcpToolModal,
      close: () => close("mcpTool"),
      toolName: mcpToolName,
    }),
    [isOpen, openMcpToolModal, close, mcpToolName],
  );
};

/**
 * Hook for AI Settings Hub modal
 */
export const useAISettingsHubModal = () => useSpecificModal("aiSettingsHub");

/**
 * Hook for Gemini Tester modal
 */
export const useGeminiTesterModal = () => useSpecificModal("geminiTester");

/**
 * Hook for Code Intelligence modal
 */
export const useCodeIntelligenceModal = () =>
  useSpecificModal("codeIntelligence");

/**
 * Hook for Voice Chat modal
 */
export const useVoiceChatModal = () => useSpecificModal("voiceChat");

/**
 * Hook for Command Palette modal
 */
export const useCommandPaletteModal = () => useSpecificModal("commandPalette");

/**
 * Hook for Enhanced Settings Panel modal
 */
export const useEnhancedSettingsModal = () =>
  useSpecificModal("enhancedSettings");

/**
 * Hook for ribbon modals
 */
export const useRibbonModals = () => {
  const modal = useModal();

  return useMemo(
    () => ({
      projectStructure: {
        isOpen: modal.isOpen("projectStructure"),
        open: () => modal.open("projectStructure"),
        close: () => modal.close("projectStructure"),
      },
      toolHistory: {
        isOpen: modal.isOpen("toolHistory"),
        open: () => modal.open("toolHistory"),
        close: () => modal.close("toolHistory"),
      },
      toolChains: {
        isOpen: modal.isOpen("toolChains"),
        open: () => modal.open("toolChains"),
        close: () => modal.close("toolChains"),
      },
      toolManager: {
        isOpen: modal.isOpen("toolManager"),
        open: () => modal.open("toolManager"),
        close: () => modal.close("toolManager"),
      },
      codeMetrics: {
        isOpen: modal.isOpen("codeMetrics"),
        open: () => modal.open("codeMetrics"),
        close: () => modal.close("codeMetrics"),
      },
      toolUsageAnalytics: {
        isOpen: modal.isOpen("toolUsageAnalytics"),
        open: () => modal.open("toolUsageAnalytics"),
        close: () => modal.close("toolUsageAnalytics"),
      },
    }),
    [modal],
  );
};
