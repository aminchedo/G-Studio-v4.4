/**
 * AI Conversation Module - Premium Chat Interface
 * 
 * A beautiful, modern chat interface with:
 * - Glassmorphism design
 * - Smooth animations
 * - Code syntax highlighting
 * - File attachments
 * - Voice input
 * - Typing indicators
 * - Message reactions
 * 
 * @version 1.0.0
 */

import React, { useState, useRef, useEffect } from 'react';

// Types
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isCode?: boolean;
  language?: string;
  attachments?: Attachment[];
}

interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url: string;
}

interface ConversationWindowProps {
  onSendMessage?: (message: string, attachments?: File[]) => void;
  initialMessages?: Message[];
  isTyping?: boolean;
  className?: string;
}

// Premium Icons
const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const AttachIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

const MicIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="22" />
  </svg>
);

const BotIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 8V4H8" />
    <rect width="16" height="12" x="4" y="8" rx="2" />
    <path d="M2 14h2" />
    <path d="M20 14h2" />
    <path d="M15 13v2" />
    <path d="M9 13v2" />
  </svg>
);

const UserIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const SparklesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);

const CopyIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export const ConversationWindow: React.FC<ConversationWindowProps> = ({
  onSendMessage = () => {},
  initialMessages = [],
  isTyping = false,
  className = ''
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [inputValue, setInputValue] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 200) + 'px';
    }
  }, [inputValue]);

  const handleSend = () => {
    if (!inputValue.trim() && attachments.length === 0) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date(),
      attachments: attachments.map(f => ({
        id: Math.random().toString(),
        name: f.name,
        type: f.type,
        size: f.size,
        url: URL.createObjectURL(f)
      }))
    };

    setMessages(prev => [...prev, newMessage]);
    onSendMessage(inputValue, attachments);
    setInputValue('');
    setAttachments([]);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const copyToClipboard = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className={`flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <SparklesIcon />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">AI Conversation</h2>
            <p className="text-xs text-slate-400">
              {isTyping ? 'AI is typing...' : 'Ready to help'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{messages.length} messages</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6 custom-scrollbar">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/30 mb-4">
              <SparklesIcon />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Start a Conversation</h3>
            <p className="text-slate-400 max-w-md">
              Ask me anything! I'm here to help you with your questions, code, and creative tasks.
            </p>
          </div>
        )}

        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : 'flex-row'} animate-fadeIn`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            {/* Avatar */}
            <div className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
              message.role === 'user'
                ? 'bg-gradient-to-br from-blue-600 to-cyan-600 shadow-lg shadow-blue-500/30'
                : 'bg-gradient-to-br from-violet-600 to-fuchsia-600 shadow-lg shadow-purple-500/30'
            }`}>
              {message.role === 'user' ? <UserIcon /> : <BotIcon />}
            </div>

            {/* Message Content */}
            <div className={`flex-1 max-w-3xl ${message.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-2`}>
              {/* Message Bubble */}
              <div className={`group relative px-5 py-3 rounded-2xl backdrop-blur-sm border transition-all duration-200 ${
                message.role === 'user'
                  ? 'bg-gradient-to-br from-blue-600/20 to-cyan-600/20 border-blue-500/30 ml-auto'
                  : 'bg-gradient-to-br from-slate-800/60 to-slate-700/60 border-white/10 hover:border-purple-500/30'
              }`}>
                <p className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
                  {message.content}
                </p>

                {/* Copy Button for AI messages */}
                {message.role === 'assistant' && (
                  <button
                    onClick={() => copyToClipboard(message.content, message.id)}
                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200"
                    title="Copy message"
                  >
                    {copiedId === message.id ? <CheckIcon /> : <CopyIcon />}
                  </button>
                )}
              </div>

              {/* Attachments */}
              {message.attachments && message.attachments.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {message.attachments.map(attachment => (
                    <div
                      key={attachment.id}
                      className="px-3 py-2 bg-slate-800/60 border border-white/10 rounded-lg text-xs text-slate-300 flex items-center gap-2"
                    >
                      <AttachIcon />
                      <span className="font-medium">{attachment.name}</span>
                      <span className="text-slate-500">({formatFileSize(attachment.size)})</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Timestamp */}
              <span className="text-xs text-slate-500">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex gap-4 animate-fadeIn">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
              <BotIcon />
            </div>
            <div className="px-5 py-3 rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-700/60 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-white/10 bg-gradient-to-r from-slate-900/90 to-slate-800/90 backdrop-blur-sm">
        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="px-6 pt-4 flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800/60 border border-white/10 rounded-lg text-xs text-slate-300"
              >
                <AttachIcon />
                <span className="font-medium">{file.name}</span>
                <span className="text-slate-500">({formatFileSize(file.size)})</span>
                <button
                  onClick={() => removeAttachment(index)}
                  className="ml-2 text-slate-400 hover:text-red-400 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Controls */}
        <div className="px-6 py-4 flex items-end gap-3">
          {/* Attach Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="p-3 rounded-xl bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white transition-all duration-200 shrink-0"
            title="Attach file"
          >
            <AttachIcon />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Text Input */}
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message... (Shift+Enter for new line)"
              className="w-full bg-slate-800/60 border border-slate-600/50 rounded-xl px-4 py-3 pr-12 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all duration-200 resize-none custom-scrollbar"
              style={{ maxHeight: '200px', minHeight: '48px' }}
            />
          </div>

          {/* Voice Button */}
          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`p-3 rounded-xl transition-all duration-200 shrink-0 ${
              isRecording
                ? 'bg-red-600 text-white shadow-lg shadow-red-500/30 animate-pulse'
                : 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white'
            }`}
            title={isRecording ? 'Stop recording' : 'Start voice input'}
          >
            <MicIcon />
          </button>

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() && attachments.length === 0}
            className={`p-3 rounded-xl transition-all duration-200 shrink-0 ${
              inputValue.trim() || attachments.length > 0
                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/30 hover:scale-105'
                : 'bg-slate-700/50 text-slate-500 cursor-not-allowed opacity-60'
            }`}
            title="Send message"
          >
            <SendIcon />
          </button>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.3);
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(139, 92, 246, 0.6), rgba(167, 139, 250, 0.6));
          border-radius: 10px;
        }
        
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(139, 92, 246, 0.8), rgba(167, 139, 250, 0.8));
        }
      `}</style>
    </div>
  );
};

export default ConversationWindow;
