/**
 * useContextManager - Refactored from class ContextManager
 *
 * Manages conversation context and history for AI interactions
 * Handles context windowing, summarization, and persistence
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  ReactNode,
  useMemo,
} from "react";

// Types
export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  metadata?: {
    model?: string;
    tokens?: number;
    toolCalls?: unknown[];
  };
}

export interface ContextWindow {
  messages: Message[];
  systemInstruction: string;
  totalTokens: number;
  maxTokens: number;
}

export interface ContextStats {
  totalMessages: number;
  totalTokens: number;
  averageMessageLength: number;
  oldestMessageAge: number;
}

export interface UseContextManagerOptions {
  maxTokens?: number;
  maxMessages?: number;
  systemInstruction?: string;
  persistKey?: string;
  onContextChange?: (context: ContextWindow) => void;
}

export interface UseContextManagerReturn {
  // State
  messages: Message[];
  systemInstruction: string;
  totalTokens: number;
  stats: ContextStats;
  // Methods
  addMessage: (message: Omit<Message, "id" | "timestamp">) => Message;
  removeMessage: (messageId: string) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  clearMessages: () => void;
  setSystemInstruction: (instruction: string) => void;
  // Context Management
  getContextWindow: (maxTokens?: number) => ContextWindow;
  summarizeContext: () => Promise<string>;
  trimContext: (targetTokens: number) => Message[];
  exportContext: () => string;
  importContext: (json: string) => void;
  // Utilities
  estimateTokens: (text: string) => number;
  findMessage: (messageId: string) => Message | undefined;
  getMessagesByRole: (role: Message["role"]) => Message[];
}

// Token estimation (simple approximation)
const estimateTokenCount = (text: string): number => {
  // Rough estimate: ~4 characters per token for English
  return Math.ceil(text.length / 4);
};

// Generate message ID
const generateMessageId = (): string =>
  `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// Default options
const DEFAULT_OPTIONS: Required<
  Omit<UseContextManagerOptions, "persistKey" | "onContextChange">
> = {
  maxTokens: 100000,
  maxMessages: 100,
  systemInstruction: "",
};

/**
 * Context Manager factory (for non-React contexts)
 */
export const createContextManager = (
  options: UseContextManagerOptions = {},
) => {
  const config = { ...DEFAULT_OPTIONS, ...options };

  let messages: Message[] = [];
  let systemInstruction = config.systemInstruction;
  const listeners = new Set<(messages: Message[]) => void>();

  const notify = () => {
    listeners.forEach((listener) => listener([...messages]));
  };

  const estimateTokens = (text: string): number => estimateTokenCount(text);

  const calculateTotalTokens = (): number => {
    let total = estimateTokens(systemInstruction);
    messages.forEach((msg) => {
      total += estimateTokens(msg.content);
    });
    return total;
  };

  const addMessage = (message: Omit<Message, "id" | "timestamp">): Message => {
    const newMessage: Message = {
      ...message,
      id: generateMessageId(),
      timestamp: Date.now(),
    };

    messages = [...messages, newMessage];

    // Trim if over max messages
    if (messages.length > config.maxMessages) {
      messages = messages.slice(-config.maxMessages);
    }

    notify();
    return newMessage;
  };

  const removeMessage = (messageId: string): void => {
    messages = messages.filter((m) => m.id !== messageId);
    notify();
  };

  const updateMessage = (
    messageId: string,
    updates: Partial<Message>,
  ): void => {
    messages = messages.map((m) =>
      m.id === messageId ? { ...m, ...updates } : m,
    );
    notify();
  };

  const clearMessages = (): void => {
    messages = [];
    notify();
  };

  const setSystemInstructionFn = (instruction: string): void => {
    systemInstruction = instruction;
  };

  const getContextWindow = (maxTokens?: number): ContextWindow => {
    const limit = maxTokens || config.maxTokens;
    let totalTokens = estimateTokens(systemInstruction);
    const windowMessages: Message[] = [];

    // Add messages from most recent, respecting token limit
    for (let i = messages.length - 1; i >= 0; i--) {
      const msgTokens = estimateTokens(messages[i].content);
      if (totalTokens + msgTokens > limit) break;
      totalTokens += msgTokens;
      windowMessages.unshift(messages[i]);
    }

    return {
      messages: windowMessages,
      systemInstruction,
      totalTokens,
      maxTokens: limit,
    };
  };

  const trimContext = (targetTokens: number): Message[] => {
    const trimmed: Message[] = [];
    let currentTokens = estimateTokens(systemInstruction);

    for (let i = messages.length - 1; i >= 0; i--) {
      const msgTokens = estimateTokens(messages[i].content);
      if (currentTokens + msgTokens > targetTokens) break;
      currentTokens += msgTokens;
      trimmed.unshift(messages[i]);
    }

    messages = trimmed;
    notify();
    return trimmed;
  };

  const exportContext = (): string => {
    return JSON.stringify({
      messages,
      systemInstruction,
      exportedAt: Date.now(),
    });
  };

  const importContext = (json: string): void => {
    const data = JSON.parse(json);
    messages = data.messages || [];
    systemInstruction = data.systemInstruction || "";
    notify();
  };

  const getStats = (): ContextStats => {
    const totalTokens = calculateTotalTokens();
    const totalLength = messages.reduce((sum, m) => sum + m.content.length, 0);
    const oldestMessage = messages[0];

    return {
      totalMessages: messages.length,
      totalTokens,
      averageMessageLength:
        messages.length > 0 ? totalLength / messages.length : 0,
      oldestMessageAge: oldestMessage
        ? Date.now() - oldestMessage.timestamp
        : 0,
    };
  };

  const subscribe = (listener: (messages: Message[]) => void) => {
    listeners.add(listener);
    listener([...messages]);
    return () => listeners.delete(listener);
  };

  return {
    getMessages: () => [...messages],
    getSystemInstruction: () => systemInstruction,
    getTotalTokens: calculateTotalTokens,
    getStats,
    addMessage,
    removeMessage,
    updateMessage,
    clearMessages,
    setSystemInstruction: setSystemInstructionFn,
    getContextWindow,
    trimContext,
    exportContext,
    importContext,
    estimateTokens,
    subscribe,
  };
};

/**
 * useContextManager hook
 */
export function useContextManager(
  options: UseContextManagerOptions = {},
): UseContextManagerReturn {
  const config = useMemo(() => ({ ...DEFAULT_OPTIONS, ...options }), [options]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [systemInstruction, setSystemInstructionState] = useState(
    config.systemInstruction,
  );

  const managerRef = useRef(createContextManager(options));

  // Sync with manager
  useEffect(() => {
    const unsubscribe = managerRef.current.subscribe(setMessages);
    return unsubscribe;
  }, []);

  // Load from persistence
  useEffect(() => {
    if (options.persistKey) {
      try {
        const stored = localStorage.getItem(options.persistKey);
        if (stored) {
          managerRef.current.importContext(stored);
        }
      } catch (error) {
        console.warn(
          "[ContextManager] Failed to load persisted context:",
          error,
        );
      }
    }
  }, [options.persistKey]);

  // Save to persistence
  useEffect(() => {
    if (options.persistKey && messages.length > 0) {
      try {
        localStorage.setItem(
          options.persistKey,
          managerRef.current.exportContext(),
        );
      } catch (error) {
        console.warn("[ContextManager] Failed to persist context:", error);
      }
    }
  }, [messages, options.persistKey]);

  // Notify on context change
  useEffect(() => {
    if (options.onContextChange) {
      options.onContextChange(managerRef.current.getContextWindow());
    }
  }, [messages, systemInstruction, options.onContextChange]);

  const estimateTokens = useCallback(
    (text: string) => estimateTokenCount(text),
    [],
  );

  const totalTokens = useMemo(() => {
    let total = estimateTokens(systemInstruction);
    messages.forEach((msg) => {
      total += estimateTokens(msg.content);
    });
    return total;
  }, [messages, systemInstruction, estimateTokens]);

  const stats = useMemo((): ContextStats => {
    const totalLength = messages.reduce((sum, m) => sum + m.content.length, 0);
    const oldestMessage = messages[0];

    return {
      totalMessages: messages.length,
      totalTokens,
      averageMessageLength:
        messages.length > 0 ? totalLength / messages.length : 0,
      oldestMessageAge: oldestMessage
        ? Date.now() - oldestMessage.timestamp
        : 0,
    };
  }, [messages, totalTokens]);

  const addMessage = useCallback(
    (message: Omit<Message, "id" | "timestamp">): Message => {
      return managerRef.current.addMessage(message);
    },
    [],
  );

  const removeMessage = useCallback((messageId: string) => {
    managerRef.current.removeMessage(messageId);
  }, []);

  const updateMessage = useCallback(
    (messageId: string, updates: Partial<Message>) => {
      managerRef.current.updateMessage(messageId, updates);
    },
    [],
  );

  const clearMessages = useCallback(() => {
    managerRef.current.clearMessages();
  }, []);

  const setSystemInstruction = useCallback((instruction: string) => {
    managerRef.current.setSystemInstruction(instruction);
    setSystemInstructionState(instruction);
  }, []);

  const getContextWindow = useCallback((maxTokens?: number): ContextWindow => {
    return managerRef.current.getContextWindow(maxTokens);
  }, []);

  const summarizeContext = useCallback(async (): Promise<string> => {
    // Simple summarization - in production, could use AI
    const recentMessages = messages.slice(-10);
    const summary = recentMessages
      .map((m) => `${m.role}: ${m.content.substring(0, 100)}...`)
      .join("\n");
    return `Context Summary (${messages.length} messages):\n${summary}`;
  }, [messages]);

  const trimContext = useCallback((targetTokens: number): Message[] => {
    return managerRef.current.trimContext(targetTokens);
  }, []);

  const exportContext = useCallback((): string => {
    return managerRef.current.exportContext();
  }, []);

  const importContext = useCallback((json: string) => {
    managerRef.current.importContext(json);
  }, []);

  const findMessage = useCallback(
    (messageId: string): Message | undefined => {
      return messages.find((m) => m.id === messageId);
    },
    [messages],
  );

  const getMessagesByRole = useCallback(
    (role: Message["role"]): Message[] => {
      return messages.filter((m) => m.role === role);
    },
    [messages],
  );

  return {
    messages,
    systemInstruction,
    totalTokens,
    stats,
    addMessage,
    removeMessage,
    updateMessage,
    clearMessages,
    setSystemInstruction,
    getContextWindow,
    summarizeContext,
    trimContext,
    exportContext,
    importContext,
    estimateTokens,
    findMessage,
    getMessagesByRole,
  };
}

// Context
const ContextManagerContext = createContext<UseContextManagerReturn | null>(
  null,
);

interface ContextManagerProviderProps {
  children: ReactNode;
  options?: UseContextManagerOptions;
}

export const ContextManagerProvider: React.FC<ContextManagerProviderProps> = ({
  children,
  options,
}) => {
  const contextManager = useContextManager(options);
  return (
    <ContextManagerContext.Provider value={contextManager}>
      {children}
    </ContextManagerContext.Provider>
  );
};

export const useContextManagerContext = (): UseContextManagerReturn => {
  const context = useContext(ContextManagerContext);
  if (!context) {
    throw new Error(
      "useContextManagerContext must be used within a ContextManagerProvider",
    );
  }
  return context;
};

// Backward compatibility
export const ContextManager = {
  create: createContextManager,
};

export default useContextManager;
