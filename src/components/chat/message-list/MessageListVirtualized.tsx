/**
 * MessageListVirtualized Component
 * High-performance virtualized message list using react-window
 * Only renders visible messages for optimal performance with long conversations
 */

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import { VariableSizeList as List } from "react-window"; // correct named import
import { MessageItem } from "@/components/chat/message-list/MessageItem";
import type { Message } from "@/types/types";
import { History, Download, XCircle, ChevronRight } from "lucide-react";

interface MessageListVirtualizedProps {
  messages: Message[];
  isLoading?: boolean;
  height?: number;
}

export const MessageListVirtualized: React.FC<MessageListVirtualizedProps> =
  React.memo(({ messages, isLoading, height = 600 }) => {
    const listRef = useRef<any>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Auto-scroll to bottom when messages change (including streaming updates)
    useEffect(() => {
      if (listRef.current && messages.length > 0) {
        requestAnimationFrame(() => {
          listRef.current?.scrollToItem(messages.length - 1, "end");
        });
      }
    }, [messages.length, messages[messages.length - 1]?.content?.length ?? 0]);

    // Export messages
    const handleExportMessages = useCallback(() => {
      const data = JSON.stringify(messages, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `messages-${new Date().toISOString()}.json`;
      link.click();
    }, [messages]);

    // Group messages by date for history
    const groupedMessages = useMemo(() => {
      return messages.reduce(
        (acc, msg) => {
          const date = new Date(msg.timestamp).toLocaleDateString();
          if (!acc[date]) {
            acc[date] = [];
          }
          acc[date].push(msg);
          return acc;
        },
        {} as Record<string, Message[]>,
      );
    }, [messages]);

    // Row renderer
    const Row = useCallback(
      ({ index, style }: { index: number; style: React.CSSProperties }) => {
        const message = messages[index];

        return (
          <div style={style} className="px-2">
            <MessageItem message={message} />
          </div>
        );
      },
      [messages],
    );

    // Calculate dynamic item size based on message content
    const getItemSize = useCallback(
      (index: number) => {
        const message = messages[index];
        const contentLength = message.content?.length || 0;
        const hasToolCalls = message.toolCalls && message.toolCalls.length > 0;
        const hasToolResults =
          message.toolResults && message.toolResults.length > 0;

        // Base height
        let height = 80;

        // Add height for content (rough estimate: 20px per 100 chars)
        height += Math.min(Math.ceil(contentLength / 100) * 20, 400);

        // Add height for tool calls/results
        if (hasToolCalls) height += message.toolCalls!.length * 60;
        if (hasToolResults) height += message.toolResults!.length * 60;

        return height;
      },
      [messages],
    );

    return (
      <div className="flex-1 flex flex-col bg-transparent min-h-0 relative">
        {/* Activity Bar - Right Side */}
        <div className="absolute right-0 top-0 bottom-0 w-10 flex flex-col items-center py-3 gap-2 z-20">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`p-2 rounded-xl transition-all duration-200 shadow-lg ${
              sidebarOpen
                ? "bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-purple-500/30"
                : "bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700/60 hover:border-purple-500/40 hover:shadow-purple-500/10"
            }`}
            title={sidebarOpen ? "Close History" : "Open History"}
          >
            {sidebarOpen ? (
              <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
            ) : (
              <History className="w-4 h-4" strokeWidth={2.5} />
            )}
          </button>
        </div>

        {/* Messages Area - Left Side */}
        <div
          className={`flex-1 flex flex-col min-h-0 transition-all duration-300 ${sidebarOpen ? "mr-[240px]" : "mr-10"}`}
        >
          <List
            ref={listRef}
            height={height}
            itemCount={messages.length}
            itemSize={getItemSize}
            width="100%"
            className="no-scrollbar px-4 pt-8 pb-4"
          >
            {Row}
          </List>
        </div>

        {/* Sidebar - Right Side */}
        <div
          className={`absolute right-0 top-0 bottom-0 w-[240px] bg-slate-900/95 backdrop-blur-sm border-l border-slate-700/60 shadow-xl transition-transform duration-300 z-10 flex flex-col ${sidebarOpen ? "translate-x-0" : "translate-x-full"}`}
        >
          {/* Sidebar Header */}
          <div className="px-2 py-1.5 border-b border-slate-700/60 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1.5 flex-1">
              <h3 className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                <History className="w-3 h-3" />
                <span>History</span>
              </h3>
              <button
                onClick={handleExportMessages}
                className="p-1 hover:bg-slate-800/50 rounded transition-colors text-slate-400 hover:text-slate-200"
                title="Export messages"
              >
                <Download className="w-3 h-3" />
              </button>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 hover:bg-slate-700/50 rounded transition-colors text-slate-400 hover:text-slate-200"
              title="Close"
            >
              <XCircle className="w-3 h-3" />
            </button>
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {Object.entries(groupedMessages).length === 0 ? (
              <div className="px-3 py-6 text-center text-slate-500 text-[10px]">
                <History className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                <p>No history</p>
              </div>
            ) : (
              <div className="px-1.5 py-1.5 space-y-0.5">
                {Object.entries(groupedMessages)
                  .sort(
                    (a, b) =>
                      new Date(b[0]).getTime() - new Date(a[0]).getTime(),
                  )
                  .map(([date, dateMessages]) => (
                    <div key={date} className="mb-2">
                      <div className="px-1.5 py-0.5 text-[9px] font-medium text-slate-500 mb-0.5">
                        {date}
                      </div>
                      <div className="space-y-0.5">
                        {dateMessages.map((msg, idx) => {
                          let displayContent = msg.content;
                          if (displayContent.includes("Welcome to G Studio!")) {
                            displayContent = "🎉 Welcome to G Studio!";
                          }
                          return (
                            <button
                              key={msg.id}
                              onClick={() => {
                                const messageIndex = messages.findIndex(
                                  (m) => m.id === msg.id,
                                );
                                if (messageIndex !== -1 && listRef.current) {
                                  listRef.current.scrollToItem(
                                    messageIndex,
                                    "center",
                                  );
                                }
                              }}
                              className="w-full text-left px-1.5 py-1 rounded hover:bg-slate-800/50 transition-colors"
                            >
                              <div className="text-[10px] text-slate-300 line-clamp-1">
                                {displayContent.substring(0, 50)}
                                {displayContent.length > 50 ? "..." : ""}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  });

MessageListVirtualized.displayName = "MessageListVirtualized";
