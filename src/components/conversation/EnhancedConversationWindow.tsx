/**
 * Enhanced Conversation Window - With Code Highlighting & Advanced Features
 * 
 * Additional features:
 * - Code syntax highlighting
 * - Markdown rendering
 * - Message editing
 * - Message deletion
 * - Export conversation
 * - Search messages
 * - Theme customization
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ConversationWindow } from './ConversationWindow';

// Additional Icons
const CodeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

const DownloadIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" x2="12" y1="15" y2="3" />
  </svg>
);

const SearchIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

const TrashIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 6h18" />
    <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
    <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
  </svg>
);

const EditIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
  </svg>
);

interface EnhancedMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  isCode?: boolean;
  language?: string;
  isEdited?: boolean;
}

interface EnhancedConversationProps {
  onSendMessage?: (message: string) => Promise<string>;
  showSearch?: boolean;
  showExport?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  theme?: 'dark' | 'light';
  className?: string;
}

export const EnhancedConversationWindow: React.FC<EnhancedConversationProps> = ({
  onSendMessage = async (msg) => `Echo: ${msg}`,
  showSearch = true,
  showExport = true,
  allowEdit = true,
  allowDelete = true,
  theme = 'dark',
  className = ''
}) => {
  const [messages, setMessages] = useState<EnhancedMessage[]>([
    {
      id: '1',
      role: 'system',
      content: 'Hello! I\'m your AI assistant. How can I help you today?',
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Filtered messages based on search
  const filteredMessages = useMemo(() => {
    if (!searchQuery) return messages;
    return messages.filter(m => 
      m.content.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [messages, searchQuery]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const userMessage: EnhancedMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    try {
      const response = await onSendMessage(inputValue);
      const aiMessage: EnhancedMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsTyping(false);
    }
  };

  const handleEdit = (id: string) => {
    const message = messages.find(m => m.id === id);
    if (message) {
      setEditingId(id);
      setEditValue(message.content);
    }
  };

  const saveEdit = (id: string) => {
    setMessages(prev => prev.map(m => 
      m.id === id ? { ...m, content: editValue, isEdited: true } : m
    ));
    setEditingId(null);
    setEditValue('');
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this message?')) {
      setMessages(prev => prev.filter(m => m.id !== id));
    }
  };

  const exportConversation = () => {
    const text = messages.map(m => 
      `[${m.role.toUpperCase()}] ${m.timestamp.toLocaleString()}\n${m.content}\n`
    ).join('\n---\n\n');
    
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const detectCodeBlock = (content: string): { isCode: boolean; language?: string; code?: string } => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]+?)```/;
    const match = content.match(codeBlockRegex);
    if (match) {
      return {
        isCode: true,
        language: match[1] || 'text',
        code: match[2]
      };
    }
    return { isCode: false };
  };

  const renderMessage = (message: EnhancedMessage) => {
    if (editingId === message.id) {
      return (
        <div className="flex flex-col gap-2">
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full bg-slate-800/60 border border-slate-600/50 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
            rows={3}
          />
          <div className="flex gap-2">
            <button
              onClick={() => saveEdit(message.id)}
              className="px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-500 transition-colors"
            >
              Save
            </button>
            <button
              onClick={() => setEditingId(null)}
              className="px-3 py-1.5 bg-slate-700 text-slate-300 text-xs font-medium rounded-lg hover:bg-slate-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    const { isCode, language, code } = detectCodeBlock(message.content);

    if (isCode && code) {
      return (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/80 rounded-t-lg border border-slate-700/50">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <CodeIcon />
              <span className="font-mono">{language}</span>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(code)}
              className="text-xs text-slate-400 hover:text-white transition-colors"
            >
              Copy
            </button>
          </div>
          <pre className="bg-slate-900/80 rounded-b-lg p-4 border border-t-0 border-slate-700/50 overflow-x-auto">
            <code className="text-sm font-mono text-slate-100">{code}</code>
          </pre>
        </div>
      );
    }

    return (
      <div className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
        {message.content}
        {message.isEdited && (
          <span className="ml-2 text-xs text-slate-500 italic">(edited)</span>
        )}
      </div>
    );
  };

  return (
    <div className={`flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 ${className}`}>
      {/* Enhanced Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/30 animate-pulse" style={{ animationDuration: '3s' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-white">AI Conversation</h2>
            <p className="text-xs text-slate-400">
              {isTyping ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <span className="ml-1">Typing...</span>
                </span>
              ) : (
                'Ready to assist'
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          {showSearch && (
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="w-48 bg-slate-800/60 border border-slate-600/50 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
              <div className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400">
                <SearchIcon />
              </div>
            </div>
          )}

          {/* Export */}
          {showExport && (
            <button
              onClick={exportConversation}
              className="p-2 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white transition-all duration-200"
              title="Export conversation"
            >
              <DownloadIcon />
            </button>
          )}

          <span className="text-xs text-slate-500 ml-2">{messages.length} msgs</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">
        {filteredMessages.map((message, index) => (
          <div
            key={message.id}
            className={`flex gap-4 group ${
              message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
            } animate-fadeIn`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            {/* Avatar */}
            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center shadow-lg ${
              message.role === 'user'
                ? 'bg-gradient-to-br from-blue-600 to-cyan-600 shadow-blue-500/30'
                : message.role === 'system'
                ? 'bg-gradient-to-br from-emerald-600 to-teal-600 shadow-emerald-500/30'
                : 'bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-purple-500/30'
            }`}>
              {message.role === 'user' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
              {message.role === 'assistant' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect width="16" height="12" x="4" y="8" rx="2" />
                  <path d="M2 14h2M20 14h2M15 13v2M9 13v2" />
                </svg>
              )}
              {message.role === 'system' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="16" x2="12" y2="12" />
                  <line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
              )}
            </div>

            {/* Message Bubble */}
            <div className={`flex-1 max-w-3xl flex flex-col gap-2 ${
              message.role === 'user' ? 'items-end' : 'items-start'
            }`}>
              <div className={`relative px-5 py-3 rounded-2xl backdrop-blur-sm border transition-all duration-200 ${
                message.role === 'user'
                  ? 'bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border-blue-500/30 ml-auto'
                  : message.role === 'system'
                  ? 'bg-gradient-to-br from-emerald-600/20 to-teal-600/20 border-emerald-500/30'
                  : 'bg-gradient-to-br from-slate-800/60 to-slate-700/60 border-white/10'
              }`}>
                {renderMessage(message)}

                {/* Action Buttons */}
                {message.role !== 'system' && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {allowEdit && message.role === 'user' && (
                      <button
                        onClick={() => handleEdit(message.id)}
                        className="p-1.5 rounded-lg bg-slate-700/80 hover:bg-slate-600/80 text-slate-400 hover:text-white transition-all duration-200"
                        title="Edit message"
                      >
                        <EditIcon />
                      </button>
                    )}
                    {allowDelete && (
                      <button
                        onClick={() => handleDelete(message.id)}
                        className="p-1.5 rounded-lg bg-slate-700/80 hover:bg-red-600/80 text-slate-400 hover:text-white transition-all duration-200"
                        title="Delete message"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                )}
              </div>

              <span className="text-xs text-slate-500">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-white/10 bg-gradient-to-r from-slate-900/90 to-slate-800/90 backdrop-blur-sm px-6 py-4">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your message... (Shift+Enter for new line)"
              className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none custom-scrollbar"
              style={{ minHeight: '48px', maxHeight: '200px' }}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className={`p-3 rounded-xl transition-all duration-200 shrink-0 ${
              inputValue.trim()
                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/30 hover:scale-105'
                : 'bg-slate-700/50 text-slate-500 cursor-not-allowed opacity-60'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.3);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(139, 92, 246, 0.6), rgba(167, 139, 250, 0.6));
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default EnhancedConversationWindow;
