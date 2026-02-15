/**
 * useConversation Hook
 *
 * NEW: Conversation management hook
 * Provides easy access to conversation features
 */

import { useCallback } from "react";
import {
  useConversationStore,
  useCurrentConversation,
  useConversationActions,
} from "@/stores/conversationStore";
import type { Message } from "@/mcp/runtime/types";

export function useConversation() {
  const currentConversation = useCurrentConversation();
  const actions = useConversationActions();

  // Get current messages
  const messages = currentConversation?.messages || [];

  // Add message to current conversation (store expects Omit<Message, 'id'|'timestamp'>)
  const addMessage = useCallback(
    (message: Message) => {
      if (currentConversation) {
        const { id: _id, timestamp: _ts, ...rest } = message;
        actions.addMessage(currentConversation.id, rest);
      }
    },
    [currentConversation, actions],
  );

  // Create new conversation and set as current
  const startNewConversation = useCallback(
    (title: string) => {
      const id = actions.createConversation(title);
      actions.setCurrentConversation(id);
      return id;
    },
    [actions],
  );

  // Update current conversation context
  const updateContext = useCallback(
    (context: Partial<Record<string, unknown>>) => {
      if (currentConversation) {
        actions.updateContext(currentConversation!.id, context);
      }
    },
    [currentConversation, actions],
  );

  // Export current conversation
  const exportConversation = useCallback(
    (format: "json" | "markdown" = "markdown") => {
      if (currentConversation) {
        return actions.exportConversation(currentConversation!.id, format);
      }
      return "";
    },
    [currentConversation, actions],
  );

  return {
    // State
    conversation: currentConversation,
    messages,
    hasConversation: !!currentConversation,

    // Actions
    addMessage,
    startNewConversation,
    updateContext,
    exportConversation,

    // Direct access to all actions
    ...actions,
  };
}

// Hook for conversation list
export function useConversationList() {
  const listConversations = useConversationStore(
    (state) => state.listConversations,
  );
  const searchConversations = useConversationStore(
    (state) => state.searchConversations,
  );
  const filterConversations = useConversationStore(
    (state) => state.filterConversations,
  );

  return {
    listConversations,
    searchConversations,
    filterConversations,
  };
}
