import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Mic,
  MicOff,
  Bot,
  Zap,
  Code,
  FileText,
  Settings,
  Sparkles,
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

interface ImprovedChatBarProps {
  onSend: (message: string, files?: File[]) => void;
  onVoiceStart: () => void;
  onVoiceStop: () => void;
  onAgentDialog: () => void;
  disabled?: boolean;
  isProcessing?: boolean;
  isListening?: boolean;
  agentConnected?: boolean;
  mcpToolsAvailable?: number;
}

export const ImprovedChatBar: React.FC<ImprovedChatBarProps> = ({
  onSend,
  onVoiceStart,
  onVoiceStop,
  onAgentDialog,
  disabled = false,
  isProcessing = false,
  isListening = false,
  agentConnected = true,
  mcpToolsAvailable = 6,
}) => {
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  const handleSend = () => {
    if ((!message.trim() && files.length === 0) || disabled) return;
    onSend(message, files);
    setMessage('');
    setFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  const quickActions = [
    {
      icon: Code,
      label: 'Write Code',
      prompt: 'Write code for: ',
      color: 'from-blue-500 to-blue-600',
    },
    {
      icon: FileText,
      label: 'Explain',
      prompt: 'Explain this: ',
      color: 'from-green-500 to-green-600',
    },
    {
      icon: Zap,
      label: 'Fix Bug',
      prompt: 'Fix this bug: ',
      color: 'from-yellow-500 to-yellow-600',
    },
    {
      icon: Sparkles,
      label: 'Improve',
      prompt: 'Improve this code: ',
      color: 'from-purple-500 to-purple-600',
    },
  ];

  const handleQuickAction = (prompt: string) => {
    setMessage(prompt);
    setShowQuickActions(false);
    textareaRef.current?.focus();
  };

  const handleVoiceToggle = () => {
    if (isListening) {
      onVoiceStop();
    } else {
      onVoiceStart();
    }
  };

  return (
    <div className="relative bg-slate-900/95 backdrop-blur-lg border-t border-white/10">
      {/* Status Bar */}
      <div className="px-4 py-2 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Agent Status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${agentConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-xs text-slate-400">
              Agent {agentConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* MCP Tools */}
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-purple-400" />
            <span className="text-xs text-slate-400">
              {mcpToolsAvailable} tools available
            </span>
          </div>

          {/* Processing Indicator */}
          {isProcessing && (
            <div className="flex items-center gap-2">
              <Loader2 className="w-3 h-3 text-blue-400 animate-spin" />
              <span className="text-xs text-blue-400">AI is thinking...</span>
            </div>
          )}

          {/* Listening Indicator */}
          {isListening && (
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs text-red-400">Listening...</span>
            </div>
          )}
        </div>

        {/* Agent Dialog Button */}
        <button
          onClick={onAgentDialog}
          className="flex items-center gap-1.5 px-3 py-1 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg transition-colors"
          title="Talk to Agent"
        >
          <Bot className="w-3 h-3 text-purple-400" />
          <span className="text-xs text-purple-400">Talk to Agent</span>
        </button>
      </div>

      {/* Quick Actions (Expandable) */}
      {showQuickActions && (
        <div className="px-4 py-3 border-b border-white/10 bg-slate-800/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">Quick Actions</span>
            <button
              onClick={() => setShowQuickActions(false)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-3 h-3 text-slate-400" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => handleQuickAction(action.prompt)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg bg-gradient-to-br ${action.color} hover:opacity-90 transition-opacity`}
                >
                  <Icon className="w-5 h-5 text-white" />
                  <span className="text-xs font-medium text-white">{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* File Preview */}
      {files.length > 0 && (
        <div className="px-4 py-2 border-b border-white/10 bg-slate-800/30">
          <div className="flex items-center gap-2 flex-wrap">
            {files.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-1 bg-slate-700/50 rounded-lg text-xs text-slate-300"
              >
                <FileText className="w-3 h-3" />
                <span>{file.name}</span>
                <button
                  onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                  className="p-0.5 hover:bg-white/10 rounded"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Input Area */}
      <div className="p-4">
        <div className="flex gap-3">
          {/* Textarea Container */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI anything, request code, or use voice input..."
              disabled={disabled}
              rows={1}
              className="w-full px-4 py-3 pr-12 bg-slate-800/50 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
              style={{
                maxHeight: '150px',
                minHeight: '48px',
              }}
            />

            {/* Quick Actions Toggle */}
            <button
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="absolute right-3 top-3 p-1.5 hover:bg-white/10 rounded-lg transition-colors"
              title="Quick Actions"
            >
              <Sparkles className={`w-4 h-4 ${showQuickActions ? 'text-purple-400' : 'text-slate-400'}`} />
            </button>
          </div>

          {/* Action Buttons Column */}
          <div className="flex flex-col gap-2">
            {/* Voice Button */}
            <button
              onClick={handleVoiceToggle}
              disabled={disabled}
              className={`p-3 rounded-xl transition-all ${
                isListening
                  ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                  : 'bg-slate-800/50 hover:bg-slate-800/70 border border-white/10'
              } disabled:opacity-50`}
              title={isListening ? 'Stop Listening' : 'Voice Input'}
            >
              {isListening ? (
                <MicOff className="w-5 h-5 text-white" />
              ) : (
                <Mic className="w-5 h-5 text-slate-400" />
              )}
            </button>

            {/* File Attachment */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="p-3 bg-slate-800/50 hover:bg-slate-800/70 border border-white/10 rounded-xl transition-all disabled:opacity-50"
              title="Attach File"
            >
              <Paperclip className="w-5 h-5 text-slate-400" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={disabled || (!message.trim() && files.length === 0)}
              className="p-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
              title="Send Message"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 text-white animate-spin" />
              ) : (
                <Send className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>

        {/* Keyboard Hint */}
        <div className="mt-2 text-xs text-slate-500 text-center">
          Press <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">Enter</kbd> to send,{' '}
          <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">Shift+Enter</kbd> for new line
        </div>
      </div>
    </div>
  );
};