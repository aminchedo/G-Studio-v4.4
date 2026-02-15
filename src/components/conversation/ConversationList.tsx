/**
 * ConversationList Component
 * 
 * Displays list of conversations with search and filter
 */

import React, { useState, useMemo } from 'react';
import { useConversationStore } from '@/stores/conversationStore';
import { Search, Archive, Trash2, Download, Plus, MessageSquare } from 'lucide-react';

interface ConversationListProps {
  onSelectConversation?: (id: string) => void;
  onNewConversation?: () => void;
  currentConversationId?: string | null;
  isOpen?: boolean;
  onClose?: () => void;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  onSelectConversation,
  onNewConversation,
  currentConversationId,
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  
  const listConversations = useConversationStore(state => state.listConversations);
  const searchConversations = useConversationStore(state => state.searchConversations);
  const archiveConversation = useConversationStore(state => state.archiveConversation);
  const deleteConversation = useConversationStore(state => state.deleteConversation);
  const exportConversation = useConversationStore(state => state.exportConversation);

  // Get conversations based on search
  const conversations = useMemo(() => {
    if (searchQuery.trim()) {
      return searchConversations(searchQuery);
    }
    return listConversations();
  }, [searchQuery, listConversations, searchConversations]);

  const handleExport = (id: string, format: 'json' | 'markdown') => {
    const exported = exportConversation(id, format);
    const blob = new Blob([exported], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${id}.${format === 'json' ? 'json' : 'md'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Delete conversation "${title}"?`)) {
      deleteConversation(id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">Conversations</h2>
          <button
            onClick={onNewConversation}
            className="p-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
            title="New Conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
        </div>
        
        {/* Filters */}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`text-xs px-2 py-1 rounded transition-colors ${
              showArchived 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            <Archive className="w-3 h-3 inline mr-1" />
            Archived
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4">
            <MessageSquare className="w-12 h-12 mb-2 opacity-50" />
            <p className="text-sm text-center">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
            {!searchQuery && (
              <button
                onClick={onNewConversation}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm transition-colors"
              >
                Start New Conversation
              </button>
            )}
          </div>
        ) : (
          <div className="p-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className={`
                  group p-3 mb-2 rounded cursor-pointer transition-colors
                  ${currentConversationId === conv.id 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }
                `}
                onClick={() => onSelectConversation(conv.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate mb-1">
                      {conv.title}
                    </h3>
                    <p className="text-xs opacity-75 truncate">
                      {conv.lastMessage || 'No messages'}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs opacity-60">
                      <span>{conv.messageCount} messages</span>
                      <span>•</span>
                      <span>{new Date(conv.updated).toLocaleDateString()}</span>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExport(conv.id, 'markdown');
                      }}
                      className="p-1 hover:bg-slate-600 rounded"
                      title="Export as Markdown"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        archiveConversation(conv.id, true);
                      }}
                      className="p-1 hover:bg-slate-600 rounded"
                      title="Archive"
                    >
                      <Archive className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(conv.id, conv.title);
                      }}
                      className="p-1 hover:bg-red-600 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                
                {/* Tags */}
                {conv.tags && conv.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {conv.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-slate-700 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
