/**
 * MessageItem - Single message with clear role, typography, and formatting
 * Optimized for readability: fonts, spacing, user vs assistant distinction
 */
import React from "react";
import type { Message } from "@/types/types";
import { User, Sparkles, AlertCircle } from "lucide-react";

export interface MessageItemProps {
  message: Message;
}

function formatTime(ts: Date | number): string {
  const d = typeof ts === "number" ? new Date(ts) : ts;
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday)
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    d.toLocaleDateString([], { month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  );
}

export const MessageItem: React.FC<MessageItemProps> = ({ message }) => {
  const role = message.role || "user";
  const content = typeof message.content === "string" ? message.content : "";
  const isUser = role === "user";
  const isModel = role === "model" || role === "assistant";
  const timeStr =
    message.timestamp != null ? formatTime(message.timestamp) : "";
  const isError = Boolean(message.isError);
  const toolCalls = Array.isArray(message.toolCalls) ? message.toolCalls : [];
  const toolResults = Array.isArray(message.toolResults)
    ? message.toolResults
    : [];

  const messageBodyStyle: React.CSSProperties = {
    fontFamily: "var(--font-sans)",
    fontSize: "12px",
    lineHeight: 1.6,
    letterSpacing: "0.01em",
  };

  return (
    <div
      className={`message-item rounded-lg overflow-hidden transition-colors ${
        isUser
          ? "bg-slate-700/40 border border-slate-600/30"
          : "bg-slate-800/30 border border-slate-700/20"
      } ${isError ? "border-red-500/50 bg-red-950/20" : ""}`}
    >
      <div
        className={`flex items-center gap-2 px-3 py-1.5 border-b shrink-0 ${
          isError ? "border-red-500/30" : "border-slate-700/30"
        }`}
      >
        {isUser ? (
          <div className="w-6 h-6 rounded-md bg-slate-600/50 flex items-center justify-center flex-shrink-0">
            <User
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3 h-3 text-slate-300"
            />
          </div>
        ) : (
          <div className="w-6 h-6 rounded-md bg-slate-700/70 flex items-center justify-center flex-shrink-0 ring-1 ring-slate-600/30">
            <Sparkles
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3 h-3 text-purple-400"
            />
          </div>
        )}
        <span
          className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 flex-1 truncate"
          style={{ fontFamily: "var(--font-sans)" }}
        >
          {isUser ? "You" : "Assistant"}
        </span>
        {timeStr && (
          <span
            className="text-[10px] text-slate-500 tabular-nums flex-shrink-0"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            {timeStr}
          </span>
        )}
      </div>
      <div className="px-3 py-2 min-h-[2rem]">
        {isError && (
          <div
            className="flex items-center gap-1.5 mb-1.5 text-red-400 text-[11px]"
            style={{ fontFamily: "var(--font-sans)" }}
          >
            <AlertCircle
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-3 h-3 flex-shrink-0"
            />
            <span>Send failed.</span>
          </div>
        )}
        <div
          className={`whitespace-pre-wrap break-words ${isError ? "text-red-200/90" : "text-slate-200"}`}
          style={messageBodyStyle}
        >
          {content || (message.isLoading ? "" : "—")}
        </div>

        {/* Tool calls / results */}
        {(toolCalls.length > 0 || toolResults.length > 0) && (
          <div className="mt-2 space-y-2">
            {toolCalls.length > 0 && (
              <div className="rounded-md border border-slate-700/40 bg-slate-900/30 px-2 py-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Tool calls
                </div>
                <div className="space-y-1">
                  {toolCalls.map((c) => (
                    <div
                      key={c.id}
                      className="text-[11px] text-slate-200/90"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      <span className="text-purple-300">{c.name}</span>
                      <span className="text-slate-500"> </span>
                      <span className="text-slate-400">
                        {(() => {
                          try {
                            const args = (c.arguments ?? c.args ?? {}) as any;
                            const s = JSON.stringify(args);
                            return s.length > 180 ? s.slice(0, 180) + "…" : s;
                          } catch {
                            return "{}";
                          }
                        })()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {toolResults.length > 0 && (
              <div className="rounded-md border border-slate-700/40 bg-slate-900/30 px-2 py-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                  Tool results
                </div>
                <div className="space-y-1">
                  {toolResults.map((r) => (
                    <div
                      key={r.toolCallId}
                      className="text-[11px] text-slate-200/90"
                      style={{ fontFamily: "var(--font-mono)" }}
                    >
                      <span className="text-purple-300">
                        {r.name || "tool"}
                      </span>
                      <span className="text-slate-500"> </span>
                      {r.error ? (
                        <span className="text-red-300">
                          Error: {String(r.error)}
                        </span>
                      ) : (
                        <span className="text-emerald-300">OK</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        {message.isLoading && (
          <span className="inline-flex gap-0.5 mt-1.5">
            <span
              className="w-1 h-1 rounded-full bg-purple-400 animate-bounce"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="w-1 h-1 rounded-full bg-purple-400 animate-bounce"
              style={{ animationDelay: "120ms" }}
            />
            <span
              className="w-1 h-1 rounded-full bg-purple-400 animate-bounce"
              style={{ animationDelay: "240ms" }}
            />
          </span>
        )}
      </div>
    </div>
  );
};
