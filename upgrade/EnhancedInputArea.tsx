import React, { useState, useRef, useEffect } from "react";

interface EnhancedInputAreaProps {
  onSend: (message: string, files?: File[]) => void;
  disabled?: boolean;
  isProcessing?: boolean;
  onVoiceToggle?: () => void;
  isListening?: boolean;
  onAgentDialog?: () => void;
  agentConnected?: boolean;
  mcpToolsCount?: number;
  currentAIMode?: string;
}

export const EnhancedInputArea: React.FC<EnhancedInputAreaProps> = ({
  onSend,
  disabled = false,
  isProcessing = false,
  onVoiceToggle,
  isListening = false,
  onAgentDialog,
  agentConnected = true,
  mcpToolsCount = 6,
  currentAIMode = "online",
}) => {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = Math.min(textareaRef.current.scrollHeight, 200);
      textareaRef.current.style.height = newHeight + "px";
    }
  }, [message]);

  const handleSend = () => {
    if ((!message.trim() && files.length === 0) || disabled) return;
    onSend(message, files);
    setMessage("");
    setFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
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
      label: "Write Code",
      prompt: "Write code for: ",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
          />
        </svg>
      ),
      gradient: "from-blue-500 via-blue-600 to-cyan-600",
    },
    {
      label: "Explain",
      prompt: "Explain this in detail: ",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
      gradient: "from-green-500 via-green-600 to-emerald-600",
    },
    {
      label: "Fix Bug",
      prompt: "Find and fix bugs in: ",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      gradient: "from-yellow-500 via-orange-500 to-red-500",
    },
    {
      label: "Optimize",
      prompt: "Optimize and improve: ",
      icon: (
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      ),
      gradient: "from-purple-500 via-purple-600 to-pink-600",
    },
  ];

  return (
    <div className="relative bg-gradient-to-b from-slate-900/95 to-slate-950/98 backdrop-blur-xl border-t border-white/10">
      {/* Enhanced Status Bar */}
      <div className="px-6 py-3 border-b border-white/5 bg-slate-900/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Agent Status */}
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${agentConnected ? "bg-emerald-400" : "bg-red-400"}`}
                />
                {agentConnected && (
                  <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-75" />
                )}
              </div>
              <span className="text-xs font-medium text-slate-300">
                {agentConnected ? "Agent Online" : "Agent Offline"}
              </span>
            </div>

            {/* MCP Tools Counter */}
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 text-purple-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span className="text-xs font-medium text-slate-300">
                <span className="text-purple-400">{mcpToolsCount}</span> Tools
                Active
              </span>
            </div>

            {/* AI Mode */}
            <div className="flex items-center gap-2">
              {currentAIMode === "online" ? (
                <>
                  <svg
                    className="w-4 h-4 text-cyan-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="text-xs font-medium text-cyan-400">
                    Cloud AI
                  </span>
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 text-amber-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
                    />
                  </svg>
                  <span className="text-xs font-medium text-amber-400">
                    Local AI
                  </span>
                </>
              )}
            </div>

            {/* Processing Indicator */}
            {isProcessing && (
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div
                    className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <div
                    className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
                <span className="text-xs font-medium text-blue-400">
                  Processing...
                </span>
              </div>
            )}

            {/* Voice Listening Indicator */}
            {isListening && (
              <div className="flex items-center gap-2">
                <div className="relative flex items-center gap-1">
                  <div className="w-1 h-3 bg-red-400 rounded-full animate-pulse" />
                  <div
                    className="w-1 h-5 bg-red-400 rounded-full animate-pulse"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="w-1 h-4 bg-red-400 rounded-full animate-pulse"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
                <span className="text-xs font-medium text-red-400">
                  Listening...
                </span>
              </div>
            )}
          </div>

          {/* Talk to Agent Button */}
          {onAgentDialog && (
            <button
              onClick={onAgentDialog}
              className="group flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-600/20 to-purple-700/20 hover:from-purple-600/30 hover:to-purple-700/30 border border-purple-500/30 hover:border-purple-500/50 rounded-lg transition-all duration-200"
            >
              <svg
                className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span className="text-xs font-semibold text-purple-400">
                Talk to Agent
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Actions Panel */}
      {showQuickActions && (
        <div className="px-6 py-4 border-b border-white/5 bg-slate-900/50 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <svg
                className="w-4 h-4 text-cyan-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
              Quick Actions
            </span>
            <button
              onClick={() => setShowQuickActions(false)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg
                className="w-4 h-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map((action, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setMessage(action.prompt);
                  setShowQuickActions(false);
                  textareaRef.current?.focus();
                }}
                className={`group relative overflow-hidden flex flex-col items-center gap-2.5 p-4 rounded-xl bg-gradient-to-br ${action.gradient} hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl`}
              >
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors" />
                <div className="relative text-white group-hover:scale-110 transition-transform">
                  {action.icon}
                </div>
                <span className="relative text-xs font-semibold text-white text-center">
                  {action.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Files Preview */}
      {files.length > 0 && (
        <div className="px-6 py-3 border-b border-white/5 bg-slate-900/30">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Attached:
            </span>
            {files.map((file, idx) => (
              <div
                key={idx}
                className="group flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-800/70 border border-white/10 rounded-lg transition-colors"
              >
                <svg
                  className="w-3.5 h-3.5 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                  />
                </svg>
                <span className="text-xs font-medium text-slate-300">
                  {file.name}
                </span>
                <button
                  onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                  className="p-0.5 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg
                    className="w-3 h-3 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Input Container */}
      <div className="p-6">
        <div
          className={`relative rounded-2xl chat-input-wrap ${
            isFocused
              ? "ring-2 ring-purple-500/50 shadow-lg shadow-purple-500/20"
              : "ring-1 ring-white/10"
          }`}
        >
          <div className="flex gap-3 items-end">
            {/* Textarea Container */}
            <div className="flex-1 relative">
              <textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Ask anything... Type your message or use voice input"
                disabled={disabled}
                rows={1}
                className={`w-full px-5 py-4 pr-14 bg-slate-800/50 backdrop-blur-sm text-white resize-none focus:outline-none rounded-2xl text-sm leading-relaxed chat-placeholder-subtle ${disabled ? "chat-input-disabled" : ""}`}
                style={{
                  maxHeight: "200px",
                  minHeight: "56px",
                }}
              />

              {/* Quick Actions Toggle (inside textarea) */}
              <button
                onClick={() => setShowQuickActions(!showQuickActions)}
                className={`absolute right-4 top-4 p-2 rounded-lg transition-all duration-200 ${
                  showQuickActions
                    ? "bg-purple-600/20 text-purple-400"
                    : "hover:bg-white/10 text-slate-400 hover:text-slate-300"
                }`}
                title="Quick Actions"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </button>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              {/* Voice Input Button */}
              {onVoiceToggle && (
                <button
                  onClick={onVoiceToggle}
                  disabled={disabled}
                  className={`group relative p-3.5 rounded-xl transition-all duration-200 disabled:opacity-50 ${
                    isListening
                      ? "bg-gradient-to-br from-red-600 to-red-700 shadow-lg shadow-red-500/50 animate-pulse"
                      : "bg-slate-800/50 hover:bg-slate-800/70 border border-white/10 hover:border-purple-500/30"
                  }`}
                  title={isListening ? "Stop Listening" : "Voice Input"}
                >
                  {isListening ? (
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-5 h-5 text-slate-400 group-hover:text-purple-400 transition-colors"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                      />
                    </svg>
                  )}
                </button>
              )}

              {/* File Attachment Button */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="group p-3.5 bg-slate-800/50 hover:bg-slate-800/70 border border-white/10 hover:border-cyan-500/30 rounded-xl transition-all duration-200 disabled:opacity-50"
                title="Attach Files"
              >
                <svg
                  className="w-5 h-5 text-slate-400 group-hover:text-cyan-400 transition-colors"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
                  />
                </svg>
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
                className={`group relative p-3.5 rounded-xl chat-send-btn disabled:opacity-50 disabled:cursor-not-allowed ${
                  isProcessing
                    ? "bg-gradient-to-br from-blue-600 to-cyan-600"
                    : "bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 shadow-lg shadow-purple-500/30"
                }`}
                title="Send Message"
              >
                {isProcessing ? (
                  <svg
                    className="w-5 h-5 text-white animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Keyboard Hints */}
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <kbd className="px-2 py-1 bg-slate-800/50 border border-white/10 rounded text-slate-400 font-mono">
                Enter
              </kbd>
              <span>to send</span>
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="px-2 py-1 bg-slate-800/50 border border-white/10 rounded text-slate-400 font-mono">
                Shift + Enter
              </kbd>
              <span>new line</span>
            </span>
          </div>
          <span className="text-slate-600">{message.length} characters</span>
        </div>
      </div>
    </div>
  );
};
