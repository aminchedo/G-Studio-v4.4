import React, { useState, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

interface Message {
  id: string;
  role: "user" | "model" | "assistant";
  content: string;
  timestamp: number;
  isLoading?: boolean;
  toolCalls?: ToolCall[];
  image?: string;
  error?: boolean;
}

interface ToolCall {
  name: string;
  arguments: any;
  result?: any;
  status: "pending" | "success" | "error";
}

interface MessageBubbleProps {
  message: Message;
  isLatest?: boolean;
  onRetry?: () => void;
  onRegenerate?: () => void;
  isLastAssistant?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isLatest = false,
  onRetry,
  onRegenerate,
  isLastAssistant = false,
}) => {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const isUser = message.role === "user";
  const isAI = message.role === "model" || message.role === "assistant";

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopyFeedback("Copied!");
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch {
      setCopyFeedback("Failed");
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopyFeedback("Copied!");
      setTimeout(() => setCopyFeedback(null), 2000);
    } catch (err) {
      setCopyFeedback("Failed to copy");
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  const formattedTime = useMemo(() => {
    const date = new Date(message.timestamp);
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }, [message.timestamp]);

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} chat-message-gap group chat-message-bubble-enter`}
    >
      <div
        className={`flex gap-3 max-w-[85%] ${isUser ? "flex-row-reverse" : "flex-row"}`}
      >
        {/* Avatar */}
        <div className="flex-shrink-0">
          {isUser ? (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg transition-shadow duration-200">
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
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg transition-shadow duration-200">
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
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          {/* Header + actions */}
          <div
            className={`flex items-center gap-2 mb-1 ${isUser ? "justify-end" : "justify-start"}`}
          >
            <span className="text-xs font-semibold text-slate-300">
              {isUser ? "You" : "AI Assistant"}
            </span>
            <span className="text-xs text-slate-500">{formattedTime}</span>
            {/* Copy message - show on hover */}
            <button
              type="button"
              onClick={handleCopyMessage}
              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-all focus:outline-none focus:ring-1 focus:ring-white/20"
              title="Copy message"
            >
              {copyFeedback ? (
                <span className="text-[10px] font-medium text-green-400">
                  {copyFeedback}
                </span>
              ) : (
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
              )}
            </button>
            {/* Retry - only for error messages */}
            {message.error && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-red-400/50"
                title="Retry"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Retry
              </button>
            )}
            {/* Regenerate - last assistant message only, when not streaming */}
            {isLastAssistant && isAI && !message.isLoading && onRegenerate && (
              <button
                type="button"
                onClick={onRegenerate}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-600/40 hover:bg-slate-600/60 text-slate-300 text-xs font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-slate-400/50"
                title="Regenerate"
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Regenerate
              </button>
            )}
          </div>

          {/* Message Bubble */}
          <div
            className={`rounded-2xl px-4 py-3 transition-shadow duration-200 ${
              isUser
                ? "bg-gradient-to-br from-purple-600 to-purple-700 text-white chat-bubble-user"
                : "bg-slate-800/50 backdrop-blur-sm text-slate-100 border border-white/10 chat-bubble-assistant"
            } ${isLatest && message.isLoading ? "animate-pulse" : ""}`}
          >
            {/* Image if present */}
            {message.image && (
              <div className="mb-3 rounded-lg overflow-hidden">
                <img
                  src={message.image}
                  alt="Uploaded"
                  className="max-w-full h-auto"
                />
              </div>
            )}

            {/* Loading state */}
            {message.isLoading ? (
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div
                    className="w-2 h-2 bg-blue-400 rounded-full chat-typing-dot"
                    style={{ animationDelay: "0ms" }}
                  />
                  <div
                    className="w-2 h-2 bg-blue-400 rounded-full chat-typing-dot"
                    style={{ animationDelay: "150ms" }}
                  />
                  <div
                    className="w-2 h-2 bg-blue-400 rounded-full chat-typing-dot"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
                <span className="text-sm text-slate-400">
                  AI is thinking...
                </span>
              </div>
            ) : (
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      const match = /language-(\w+)/.exec(className || "");
                      const codeString = String(children).replace(/\n$/, "");

                      return !inline && match ? (
                        <div className="relative group/code my-4 chat-code-block-wrap">
                          {/* Language Badge */}
                          <div className="absolute top-0 left-0 px-3 py-1 bg-slate-700/80 backdrop-blur-sm rounded-tl-lg rounded-br-lg text-xs font-mono text-slate-300 border-b border-r border-white/10">
                            {match[1]}
                          </div>

                          {/* Copy Button */}
                          <button
                            onClick={() => handleCopyCode(codeString)}
                            className="absolute top-2 right-2 px-3 py-1.5 bg-slate-700/80 hover:bg-slate-600/80 backdrop-blur-sm rounded-lg text-xs font-medium text-slate-300 transition-all opacity-0 group-hover/code:opacity-100 flex items-center gap-1.5"
                          >
                            {copyFeedback ? (
                              <>
                                <svg
                                  className="w-3.5 h-3.5 text-green-400"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M5 13l4 4L19 7"
                                  />
                                </svg>
                                {copyFeedback}
                              </>
                            ) : (
                              <>
                                <svg
                                  className="w-3.5 h-3.5"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                                  />
                                </svg>
                                Copy
                              </>
                            )}
                          </button>

                          {/* Code Block */}
                          <SyntaxHighlighter
                            style={vscDarkPlus}
                            language={match[1]}
                            PreTag="div"
                            className="!mt-0 !mb-0 !rounded-xl !bg-slate-900/50 !border !border-white/10"
                            customStyle={{
                              margin: 0,
                              padding: "1rem",
                              paddingTop: "2.5rem",
                              fontSize: "0.875rem",
                              lineHeight: "1.5",
                            }}
                            {...props}
                          >
                            {codeString}
                          </SyntaxHighlighter>
                        </div>
                      ) : (
                        <code
                          className="px-1.5 py-0.5 bg-slate-700/50 rounded text-cyan-400 font-mono text-sm chat-inline-code"
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                    p({ children }) {
                      return (
                        <p className="mb-3 last:mb-0 leading-relaxed">
                          {children}
                        </p>
                      );
                    },
                    ul({ children }) {
                      return (
                        <ul className="list-disc list-inside space-y-1 mb-3">
                          {children}
                        </ul>
                      );
                    },
                    ol({ children }) {
                      return (
                        <ol className="list-decimal list-inside space-y-1 mb-3">
                          {children}
                        </ol>
                      );
                    },
                    li({ children }) {
                      return <li className="ml-2">{children}</li>;
                    },
                    h1({ children }) {
                      return (
                        <h1 className="text-xl font-bold mb-3 mt-4 first:mt-0">
                          {children}
                        </h1>
                      );
                    },
                    h2({ children }) {
                      return (
                        <h2 className="text-lg font-bold mb-2 mt-3 first:mt-0">
                          {children}
                        </h2>
                      );
                    },
                    h3({ children }) {
                      return (
                        <h3 className="text-base font-semibold mb-2 mt-3 first:mt-0">
                          {children}
                        </h3>
                      );
                    },
                    blockquote({ children }) {
                      return (
                        <blockquote className="border-l-4 border-blue-500 pl-4 py-2 my-3 bg-blue-500/10 rounded-r-lg">
                          {children}
                        </blockquote>
                      );
                    },
                    a({ href, children }) {
                      return (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 underline underline-offset-2"
                        >
                          {children}
                        </a>
                      );
                    },
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}

            {/* Tool Calls Display */}
            {message.toolCalls && message.toolCalls.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-white/10 pt-4">
                <div className="flex items-center gap-2 mb-2">
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
                  <span className="text-xs font-semibold text-slate-300 uppercase tracking-wide">
                    Tools Used
                  </span>
                </div>
                {message.toolCalls.map((tool, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 bg-slate-900/50 rounded-lg border border-white/5"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {tool.status === "success" ? (
                        <svg
                          className="w-4 h-4 text-green-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      ) : tool.status === "error" ? (
                        <svg
                          className="w-4 h-4 text-red-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      ) : (
                        <svg
                          className="w-4 h-4 text-blue-400 animate-spin"
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
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono text-cyan-400">
                        {tool.name}
                      </div>
                      {tool.result && (
                        <div className="text-xs text-slate-400 mt-0.5 truncate">
                          {typeof tool.result === "string"
                            ? tool.result
                            : JSON.stringify(tool.result)}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
