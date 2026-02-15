import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Conversation, Message, ConversationContext, ConversationSummary } from '@/types/conversation';

interface ConversationState {
  // State - Using Record instead of Map to avoid serialization issues
  conversations: Record<string, Conversation>;
  currentConversationId: string | null;
  
  // Actions
  createConversation: (title: string, context?: ConversationContext) => string;
  loadConversation: (id: string) => Conversation | null;
  deleteConversation: (id: string) => void;
  archiveConversation: (id: string, archived: boolean) => void;
  pinConversation: (id: string, pinned: boolean) => void;
  setCurrentConversation: (id: string | null) => void;
  updateConversationTitle: (id: string, title: string) => void;
  addMessage: (conversationId: string, message: Omit<Message, 'id' | 'timestamp'>) => string;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  addTag: (conversationId: string, tag: string) => void;
  removeTag: (conversationId: string, tag: string) => void;
  clearConversations: () => void;
  /** List non-archived conversations (sorted) */
  listConversations: () => Conversation[];
  /** Search conversations by title/message content */
  searchConversations: (query: string) => Conversation[];
  /** Filter conversations (e.g. by archived) */
  filterConversations: (opts?: { archived?: boolean }) => Conversation[];
  /** Export conversation as JSON or markdown string */
  exportConversation: (id: string, format: 'json' | 'markdown') => string;
  /** Update conversation context */
  updateContext: (id: string, context: Partial<ConversationContext>) => void;
}

export const useConversationStore = create<ConversationState>()(
  persist(
    (set, get) => ({
      conversations: {},
      currentConversationId: null,

      createConversation: (title: string, context?: ConversationContext) => {
        const id = crypto.randomUUID();
        const now = new Date();
        
        const conversation: Conversation = {
          id,
          title,
          created: now,
          updated: now,
          messages: [],
          context: context || {},
          tags: [],
          archived: false,
          pinned: false,
        };
        
        set(state => ({
          conversations: {
            ...state.conversations,
            [id]: conversation,
          },
          currentConversationId: id,
        }));
        
        return id;
      },

      loadConversation: (id: string) => {
        const conversation = get().conversations[id];
        return conversation || null;
      },

      deleteConversation: (id: string) => {
        set(state => {
          const { [id]: removed, ...rest } = state.conversations;
          return {
            conversations: rest,
            currentConversationId: state.currentConversationId === id 
              ? null 
              : state.currentConversationId,
          };
        });
      },

      archiveConversation: (id: string, archived: boolean) => {
        set(state => {
          const conversation = state.conversations[id];
          if (!conversation) return state;

          return {
            conversations: {
              ...state.conversations,
              [id]: {
                ...conversation,
                archived,
                updated: new Date(),
              },
            },
          };
        });
      },

      pinConversation: (id: string, pinned: boolean) => {
        set(state => {
          const conversation = state.conversations[id];
          if (!conversation) return state;

          return {
            conversations: {
              ...state.conversations,
              [id]: {
                ...conversation,
                pinned,
                updated: new Date(),
              },
            },
          };
        });
      },

      setCurrentConversation: (id: string | null) => {
        set({ currentConversationId: id });
      },

      updateConversationTitle: (id: string, title: string) => {
        set(state => {
          const conversation = state.conversations[id];
          if (!conversation) return state;

          return {
            conversations: {
              ...state.conversations,
              [id]: {
                ...conversation,
                title,
                updated: new Date(),
              },
            },
          };
        });
      },

      addMessage: (conversationId: string, messageData: Omit<Message, 'id' | 'timestamp'>) => {
        const messageId = crypto.randomUUID();
        const message: Message = {
          ...messageData,
          id: messageId,
          timestamp: new Date(),
        };

        set(state => {
          const conversation = state.conversations[conversationId];
          if (!conversation) return state;

          return {
            conversations: {
              ...state.conversations,
              [conversationId]: {
                ...conversation,
                messages: [...conversation.messages, message],
                updated: new Date(),
              },
            },
          };
        });

        return messageId;
      },

      updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => {
        set(state => {
          const conversation = state.conversations[conversationId];
          if (!conversation) return state;

          const messageIndex = conversation.messages.findIndex(m => m.id === messageId);
          if (messageIndex === -1) return state;

          const updatedMessages = [...conversation.messages];
          updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex]!,
            ...updates,
          };

          return {
            conversations: {
              ...state.conversations,
              [conversationId]: {
                ...conversation,
                messages: updatedMessages,
                updated: new Date(),
              },
            },
          };
        });
      },

      deleteMessage: (conversationId: string, messageId: string) => {
        set(state => {
          const conversation = state.conversations[conversationId];
          if (!conversation) return state;

          return {
            conversations: {
              ...state.conversations,
              [conversationId]: {
                ...conversation,
                messages: conversation.messages.filter(m => m.id !== messageId),
                updated: new Date(),
              },
            },
          };
        });
      },

      addTag: (conversationId: string, tag: string) => {
        set(state => {
          const conversation = state.conversations[conversationId];
          if (!conversation || conversation.tags.includes(tag)) return state;

          return {
            conversations: {
              ...state.conversations,
              [conversationId]: {
                ...conversation,
                tags: [...conversation.tags, tag],
                updated: new Date(),
              },
            },
          };
        });
      },

      removeTag: (conversationId: string, tag: string) => {
        set(state => {
          const conversation = state.conversations[conversationId];
          if (!conversation) return state;

          return {
            conversations: {
              ...state.conversations,
              [conversationId]: {
                ...conversation,
                tags: conversation.tags.filter(t => t !== tag),
                updated: new Date(),
              },
            },
          };
        });
      },

      clearConversations: () => {
        set({
          conversations: {},
          currentConversationId: null,
        });
      },

      listConversations: () => {
        const state = get();
        return Object.values(state.conversations)
          .filter(c => !c.archived)
          .sort((a, b) => {
            if ((a.pinned ?? false) !== (b.pinned ?? false)) return (a.pinned ? -1 : 1);
            return b.updated.getTime() - a.updated.getTime();
          });
      },

      searchConversations: (query: string) => {
        const q = query.trim().toLowerCase();
        if (!q) return get().listConversations();
        const state = get();
        return Object.values(state.conversations)
          .filter(c => !c.archived && (
            c.title.toLowerCase().includes(q) ||
            c.messages.some(m => String(m.content).toLowerCase().includes(q))
          ))
          .sort((a, b) => b.updated.getTime() - a.updated.getTime());
      },

      filterConversations: (opts?: { archived?: boolean }) => {
        const state = get();
        let list = Object.values(state.conversations);
        if (opts?.archived !== undefined) {
          list = list.filter(c => c.archived === opts.archived);
        } else {
          list = list.filter(c => !c.archived);
        }
        return list.sort((a, b) => b.updated.getTime() - a.updated.getTime());
      },

      exportConversation: (id: string, format: 'json' | 'markdown') => {
        const conversation = get().conversations[id];
        if (!conversation) return '';
        if (format === 'json') {
          return JSON.stringify(conversation, null, 2);
        }
        const lines = [`# ${conversation.title}\n`];
        for (const m of conversation.messages) {
          lines.push(`## ${m.role}\n${String(m.content)}\n`);
        }
        return lines.join('');
      },

      updateContext: (id: string, context: Partial<ConversationContext>) => {
        set(state => {
          const conversation = state.conversations[id];
          if (!conversation) return state;
          return {
            conversations: {
              ...state.conversations,
              [id]: {
                ...conversation,
                context: { ...conversation.context, ...context },
                updated: new Date(),
              },
            },
          };
        });
      },
    }),
    {
      name: 'gstudio-conversations',
      version: 1,
    }
  )
);

// Optimized selectors with proper memoization
export const useCurrentConversation = () => {
  return useConversationStore(state => {
    const currentId = state.currentConversationId;
    return currentId ? state.conversations[currentId] || null : null;
  });
};

export const useConversationList = () => {
  return useConversationStore(state =>
    Object.values(state.conversations)
      .filter(c => !c.archived)
      .sort((a, b) => {
        // Pinned conversations first
        if (a.pinned !== b.pinned) {
          return a.pinned ? -1 : 1;
        }
        // Then by updated date
        return b.updated.getTime() - a.updated.getTime();
      })
  );
};

export const useArchivedConversations = () => {
  return useConversationStore(state =>
    Object.values(state.conversations)
      .filter(c => c.archived)
      .sort((a, b) => b.updated.getTime() - a.updated.getTime())
  );
};

export const useConversationSummaries = (): ConversationSummary[] => {
  return useConversationStore(state =>
    Object.values(state.conversations)
      .filter(c => !c.archived)
      .map(c => ({
        id: c.id,
        title: c.title,
        lastMessage: c.messages[c.messages.length - 1]?.content ?? undefined,
        messageCount: c.messages.length,
        updated: c.updated,
        pinned: c.pinned || false,
      }))
      .sort((a, b) => {
        if (a.pinned !== b.pinned) {
          return a.pinned ? -1 : 1;
        }
        return b.updated.getTime() - a.updated.getTime();
      })
  );
};

export const useConversationById = (id: string | null) => {
  return useConversationStore(state => {
    return id ? state.conversations[id] || null : null;
  });
};

export const useConversationActions = () => {
  return useConversationStore(state => ({
    createConversation: state.createConversation,
    loadConversation: state.loadConversation,
    deleteConversation: state.deleteConversation,
    archiveConversation: state.archiveConversation,
    pinConversation: state.pinConversation,
    setCurrentConversation: state.setCurrentConversation,
    updateConversationTitle: state.updateConversationTitle,
    addMessage: state.addMessage,
    updateMessage: state.updateMessage,
    deleteMessage: state.deleteMessage,
    addTag: state.addTag,
    removeTag: state.removeTag,
    clearConversations: state.clearConversations,
    listConversations: state.listConversations,
    searchConversations: state.searchConversations,
    exportConversation: state.exportConversation,
    updateContext: state.updateContext,
    filterConversations: state.filterConversations,
  }));
};
