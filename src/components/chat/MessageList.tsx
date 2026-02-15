import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  User,
  Bot,
  Copy,
  Check,
  Terminal,
  CheckCircle2,
  XCircle,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Activity,
  FilePlus,
  FileEdit,
  FileSearch,
  Trash,
  Play,
  FileText,
  ArrowRight,
  Heart,
  ThumbsUp,
  PartyPopper,
  Download,
  MessageSquare,
  Search,
  History,
  ChevronLeft,
} from "lucide-react";
import { Message, ToolCall, ToolResult } from "@/types";

interface MessageListProps {
  messages: Message[];
  isLoading?: boolean;
}

const CodeBlock: React.FC<{ language: string; children: string }> = ({
  language,
  children,
}) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-xl overflow-hidden my-4 border border-slate-200 shadow-md bg-[#282a36] group relative ring-1 ring-black/5">
      <div className="flex items-center justify-between px-4 py-2 bg-[#1e1f29] border-b border-[#44475a] text-slate-300">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded bg-[#44475a] border border-[#6272a4]/30 shadow-sm">
            <Terminal strokeWidth={1.5} className="w-3 h-3 text-[#ff79c6]" />
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#bd93f9] font-mono select-none">
            {language || "TEXT"}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 px-2.5 py-1 rounded-md hover:bg-white/10 transition-all text-[#6272a4] hover:text-white border border-transparent hover:border-white/5 active:scale-95"
          title="Copy Code"
        >
          {copied ? (
            <>
              <Check strokeWidth={1.5} className="w-3.5 h-3.5 text-[#50fa7b]" />
              <span className="text-[10px] font-bold text-[#50fa7b] animate-in fade-in slide-in-from-right-1">
                Copied
              </span>
            </>
          ) : (
            <>
              <Copy strokeWidth={1.5} className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                Copy
              </span>
            </>
          )}
        </button>
      </div>
      <div className="relative">
        <SyntaxHighlighter
          language={language}
          style={dracula}
          PreTag="div"
          customStyle={{
            margin: 0,
            padding: "1.5rem",
            fontSize: "11px",
            lineHeight: "1.6",
            fontFamily: '"JetBrains Mono", monospace',
            background: "#282a36",
          }}
          codeTagProps={{
            style: { fontFamily: '"JetBrains Mono", monospace' },
          }}
        >
          {children}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

const getToolInfo = (name: string, args: any) => {
  const target = args.path || args.filename || args.source || args.target || "";
  switch (name) {
    case "create_file":
      return {
        label: "Create",
        desc: target,
        icon: FilePlus,
        color: "text-emerald-600",
        bg: "bg-emerald-50/50",
        border: "border-emerald-100",
      };
    case "write_code":
      return {
        label: "Update",
        desc: target,
        icon: FileEdit,
        color: "text-ocean-600",
        bg: "bg-ocean-50/50",
        border: "border-ocean-100",
      };
    case "read_file":
      return {
        label: "Read",
        desc: target,
        icon: FileText,
        color: "text-slate-600",
        bg: "bg-slate-50/50",
        border: "border-slate-200",
      };
    case "delete_file":
      return {
        label: "Delete",
        desc: target,
        icon: Trash,
        color: "text-burgundy-600",
        bg: "bg-burgundy-50/50",
        border: "border-burgundy-100",
      };
    case "move_file":
      return {
        label: "Move",
        desc: `${target} → ${args.destination}`,
        icon: ArrowRight,
        color: "text-ocean-600",
        bg: "bg-ocean-50/50",
        border: "border-ocean-100",
      };
    case "project_overview":
      return {
        label: "Scan",
        desc: "Project Structure",
        icon: FileSearch,
        color: "text-amber-600",
        bg: "bg-amber-50/50",
        border: "border-amber-100",
      };
    case "run":
      return {
        label: "Exec",
        desc: args.command,
        icon: Play,
        color: "text-slate-600",
        bg: "bg-slate-100",
        border: "border-slate-200",
      };
    case "search_files":
      return {
        label: "Search",
        desc: `"${args.query}"`,
        icon: FileSearch,
        color: "text-ocean-600",
        bg: "bg-ocean-50/50",
        border: "border-ocean-100",
      };
    case "format_file":
      return {
        label: "Format",
        desc: target,
        icon: Sparkles,
        color: "text-pink-600",
        bg: "bg-pink-50/50",
        border: "border-pink-100",
      };
    default:
      return {
        label: name,
        desc: target,
        icon: Activity,
        color: "text-slate-600",
        bg: "bg-slate-50/50",
        border: "border-slate-200",
      };
  }
};

const ToolLog: React.FC<{
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}> = ({ toolCalls, toolResults }) => {
  const [expanded, setExpanded] = useState(false);

  if (toolCalls) {
    return (
      <div className="my-3 space-y-2">
        {toolCalls.map((call, i) => {
          const info = getToolInfo(call.name, call.args);
          const Icon = info.icon;
          return (
            <div
              key={i}
              className={`rounded-lg border ${info.border} ${info.bg} overflow-hidden shadow-sm transition-all duration-200 hover:shadow-md`}
            >
              <div
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-3 px-3.5 py-2.5 cursor-pointer hover:opacity-80 transition-opacity"
              >
                <div
                  className={`p-1.5 rounded-lg bg-slate-800 border ${info.border} shadow-sm`}
                >
                  <Icon
                    strokeWidth={1.5}
                    className={`w-3.5 h-3.5 ${info.color}`}
                  />
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-black uppercase tracking-wider ${info.color}`}
                    >
                      {info.label}
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-300 truncate font-mono">
                    {info.desc}
                  </span>
                </div>
                {expanded ? (
                  <ChevronDown
                    strokeWidth={1.5}
                    className="w-3.5 h-3.5 text-slate-400"
                  />
                ) : (
                  <ChevronRight
                    strokeWidth={1.5}
                    className="w-3.5 h-3.5 text-slate-400"
                  />
                )}
              </div>

              {expanded && (
                <div className="px-3.5 py-2.5 border-t border-slate-700/50 bg-slate-800/60 text-[10px] font-mono text-slate-400 break-all leading-relaxed animate-fade-in">
                  {JSON.stringify(call.args, null, 2)}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  if (toolResults) {
    return (
      <div className="my-2 space-y-1">
        {toolResults.map((res, i) => {
          const isError =
            typeof res.result === "string" &&
            res.result.toLowerCase().includes("error");
          if (isError || expanded) {
            return (
              <div
                key={i}
                className={`rounded-xl border text-[11px] font-mono p-3.5 ${
                  isError
                    ? "bg-red-900/30 border-red-800 text-red-200"
                    : "bg-slate-800 border-slate-700 text-slate-300 shadow-sm"
                } animate-fade-in`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold">{res.name} Result</span>
                  {isError ? (
                    <XCircle strokeWidth={1.5} className="w-3.5 h-3.5" />
                  ) : (
                    <CheckCircle2
                      strokeWidth={1.5}
                      className="w-3.5 h-3.5 text-emerald-500"
                    />
                  )}
                </div>
                <div className="opacity-90 whitespace-pre-wrap max-h-32 overflow-y-auto custom-scrollbar">
                  {String(res.result)}
                </div>
              </div>
            );
          }
          return (
            <div
              key={i}
              className="flex items-center gap-2 text-[10px] text-emerald-600 font-bold uppercase tracking-wider px-1 py-1 animate-fade-in"
            >
              <CheckCircle2 strokeWidth={1.5} className="w-3.5 h-3.5" />
              <span>Action Completed</span>
              <button
                onClick={() => setExpanded(true)}
                className="ml-auto text-slate-400 hover:text-slate-600 underline decoration-dotted"
              >
                details
              </button>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

export const MessageList: React.FC<MessageListProps> = React.memo(
  ({ messages, isLoading }) => {
    const bottomRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [messageReactions, setMessageReactions] = useState<
      Record<string, string[]>
    >({});
    const [messageThreads, setMessageThreads] = useState<
      Record<string, Array<{ id: string; text: string; timestamp: number }>>
    >({});
    const [searchQuery, setSearchQuery] = useState("");
    const [editingMessageId, setEditingMessageId] = useState<string | null>(
      null,
    );
    const [editedContent, setEditedContent] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Auto-scroll to bottom when messages change
    useEffect(() => {
      if (bottomRef.current && scrollContainerRef.current) {
        // Use requestAnimationFrame to ensure DOM is updated
        requestAnimationFrame(() => {
          bottomRef.current?.scrollIntoView({
            behavior: "smooth",
            block: "end",
          });
        });
      }
    }, [messages, isLoading]);

    const handleReaction = (messageId: string, reaction: string) => {
      setMessageReactions((prev) => {
        const reactions = prev[messageId] || [];
        if (reactions.includes(reaction)) {
          return {
            ...prev,
            [messageId]: reactions.filter((r) => r !== reaction),
          };
        }
        return { ...prev, [messageId]: [...reactions, reaction] };
      });
    };

    const handleCreateThread = (messageId: string) => {
      const threadText = prompt("Enter your reply:");
      if (threadText) {
        setMessageThreads((prev) => ({
          ...prev,
          [messageId]: [
            ...(prev[messageId] || []),
            {
              id: Date.now().toString(),
              text: threadText,
              timestamp: Date.now(),
            },
          ],
        }));
      }
    };

    const handleEditMessage = (messageId: string, currentContent: string) => {
      setEditingMessageId(messageId);
      setEditedContent(currentContent);
    };

    const handleSaveEdit = (messageId: string) => {
      // In a real app, this would update the message via API
      // For now, we'll just clear the editing state
      setEditingMessageId(null);
      setEditedContent("");
      if (typeof window !== "undefined" && (window as any).showInfo) {
        (window as any).showInfo(
          "Message edit saved (local only - not persisted)",
        );
      }
    };

    const handleExportMessages = () => {
      const data = JSON.stringify(messages, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `messages-${new Date().toISOString()}.json`;
      link.click();
    };

    const filteredMessages = searchQuery
      ? messages.filter((msg) =>
          msg.content.toLowerCase().includes(searchQuery.toLowerCase()),
        )
      : messages;

    // Group messages by date for history
    const groupedMessages = messages.reduce(
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
          <div
            ref={scrollContainerRef}
            className={`flex-1 overflow-y-auto scroll-smooth bg-transparent min-h-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ${messages.length === 0 ? "pt-32 pb-4 px-4" : "px-4 pt-8 pb-4 space-y-3"}`}
          >
            {filteredMessages.map((msg, index) => (
              <div
                key={msg.id}
                data-message-id={msg.id}
                className={`flex gap-2.5 animate-fade-in ${msg.role === "user" ? "flex-row-reverse" : "flex-row"} ${index === 0 ? "mt-0" : ""}`}
              >
                {/* Avatar */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-200 ${
                    msg.role === "user"
                      ? "bg-slate-700 text-slate-300"
                      : "bg-purple-600 text-white"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-3.5 h-3.5"
                    />
                  ) : (
                    <Bot
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-3.5 h-3.5"
                    />
                  )}
                </div>

                <div
                  className={`flex flex-col max-w-[85%] min-w-0 ${msg.role === "user" ? "items-end" : "items-start"}`}
                >
                  {/* Metadata - Hidden for minimal design */}
                  {/* <div className={`flex items-center gap-2 mb-1 px-1 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
               <span className="text-[9px] font-medium text-slate-500">{msg.role === 'user' ? 'User' : 'Assistant'}</span>
               <span className="text-[9px] text-slate-500">•</span>
               <span className="text-[9px] text-slate-500 font-mono">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div> */}

                  {/* Bubble */}
                  <div
                    className={`rounded-lg ${index === 0 && filteredMessages.length === 1 ? "px-3 py-2" : "px-3 py-2"} text-[12px] leading-relaxed w-full transition-all ${
                      msg.role === "user"
                        ? "bg-purple-600 text-white"
                        : msg.role === "function"
                          ? "bg-transparent border-0 p-0 shadow-none"
                          : msg.isError
                            ? "bg-red-900/50 text-red-200"
                            : "bg-slate-800/60 text-slate-200"
                    }`}
                  >
                    {msg.image && (
                      <img
                        src={
                          typeof msg.image === "string"
                            ? msg.image
                            : (msg.image as { url: string }).url
                        }
                        className="mb-4 max-h-[240px] rounded-xl border border-slate-200 shadow-sm"
                        alt="Input"
                      />
                    )}

                    {msg.toolCalls && <ToolLog toolCalls={msg.toolCalls} />}
                    {msg.toolResults && (
                      <ToolLog toolResults={msg.toolResults} />
                    )}

                    {msg.role !== "function" && (
                      <div
                        className={`prose prose-sm max-w-none text-[11.5px] ${
                          msg.role === "user"
                            ? "prose-invert prose-p:text-slate-50 prose-a:text-white prose-code:text-ocean-200 prose-p:text-[11.5px] prose-headings:text-[13px] prose-li:text-[11.5px]"
                            : "prose-invert prose-p:text-slate-300 prose-headings:text-slate-100 prose-a:text-purple-400 prose-code:text-purple-300 prose-code:bg-purple-900/50 prose-code:px-1 prose-code:rounded-md prose-p:text-[11.5px] prose-headings:text-[13px] prose-li:text-[11.5px]"
                        }`}
                      >
                        <ReactMarkdown
                          components={{
                            code({ className, children, ...props }: any) {
                              const inline = !className;
                              const match = /language-(\w+)/.exec(
                                className || "",
                              );
                              return !inline ? (
                                <CodeBlock
                                  language={match ? match[1] : "text"}
                                  children={String(children).replace(/\n$/, "")}
                                />
                              ) : (
                                <code
                                  className={`px-1.5 py-0.5 rounded-md font-mono text-[9.5px] border ${
                                    msg.role === "user"
                                      ? "bg-white/10 text-white border-white/10"
                                      : "bg-slate-100 text-slate-700 border-slate-200"
                                  }`}
                                >
                                  {children}
                                </code>
                              );
                            },
                          }}
                        >
                          {msg.content}
                        </ReactMarkdown>
                        {msg.isLoading && (
                          <div className="flex items-center gap-2 mt-4 text-ocean-600 bg-ocean-50 w-fit px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wider border border-ocean-100 animate-pulse">
                            <Activity
                              strokeWidth={1.5}
                              className="w-3.5 h-3.5 animate-spin"
                            />{" "}
                            Thinking...
                          </div>
                        )}
                      </div>
                    )}

                    {/* Message Actions: Reactions, Edit, Thread - Hidden for minimal design */}
                    {false && msg.role !== "function" && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-700/30">
                        {/* Reactions */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleReaction(msg.id, "👍")}
                            className={`p-1 rounded transition-colors ${
                              messageReactions[msg.id]?.includes("👍")
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/50"
                            }`}
                            title="Like"
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleReaction(msg.id, "❤️")}
                            className={`p-1 rounded transition-colors ${
                              messageReactions[msg.id]?.includes("❤️")
                                ? "bg-rose-500/20 text-rose-400"
                                : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/50"
                            }`}
                            title="Love"
                          >
                            <Heart className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleReaction(msg.id, "🎉")}
                            className={`p-1 rounded transition-colors ${
                              messageReactions[msg.id]?.includes("🎉")
                                ? "bg-amber-500/20 text-amber-400"
                                : "text-slate-400 hover:text-slate-300 hover:bg-slate-700/50"
                            }`}
                            title="Celebrate"
                          >
                            <PartyPopper className="w-3 h-3" />
                          </button>
                        </div>

                        {/* Show reactions */}
                        {messageReactions[msg.id] &&
                          messageReactions[msg.id].length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              {messageReactions[msg.id].join(" ")}
                            </div>
                          )}

                        <div className="flex-1" />

                        {/* Edit button (for user messages) */}
                        {msg.role === "user" && (
                          <button
                            onClick={() =>
                              handleEditMessage(msg.id, msg.content)
                            }
                            className="px-2 py-1 text-[10px] text-slate-400 hover:text-slate-300 hover:bg-slate-700/50 rounded transition-colors"
                          >
                            Edit
                          </button>
                        )}

                        {/* Thread button */}
                        <button
                          onClick={() => handleCreateThread(msg.id)}
                          className="px-2 py-1 text-[10px] text-slate-400 hover:text-slate-300 hover:bg-slate-700/50 rounded transition-colors flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          Reply
                        </button>
                      </div>
                    )}

                    {/* Edit Mode */}
                    {editingMessageId === msg.id && (
                      <div className="mt-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                        <textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 resize-none"
                          rows={4}
                        />
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => handleSaveEdit(msg.id)}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-[10px] font-medium hover:bg-emerald-700 transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingMessageId(null);
                              setEditedContent("");
                            }}
                            className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-[10px] font-medium hover:bg-slate-600 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Thread Replies */}
                    {messageThreads[msg.id] &&
                      messageThreads[msg.id].length > 0 && (
                        <div className="mt-3 ml-6 pl-4 border-l-2 border-slate-700 space-y-2">
                          {messageThreads[msg.id].map((thread) => (
                            <div
                              key={thread.id}
                              className="p-2 bg-slate-800/30 rounded-lg"
                            >
                              <p className="text-xs text-slate-300">
                                {thread.text}
                              </p>
                              <p className="text-[10px] text-slate-500 mt-1">
                                {new Date(
                                  thread.timestamp,
                                ).toLocaleTimeString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
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
                        {dateMessages.map((msg) => {
                          // Shorten welcome message
                          let displayContent = msg.content;
                          if (displayContent.includes("Welcome to G Studio!")) {
                            displayContent = "🎉 Welcome to G Studio!";
                          }
                          return (
                            <button
                              key={msg.id}
                              onClick={() => {
                                const element = document.querySelector(
                                  `[data-message-id="${msg.id}"]`,
                                );
                                if (element) {
                                  element.scrollIntoView({
                                    behavior: "smooth",
                                    block: "center",
                                  });
                                }
                              }}
                              className="w-full text-left px-1.5 py-1 rounded hover:bg-slate-800/50 transition-colors group"
                            >
                              <div className="flex items-start gap-1.5">
                                <div
                                  className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 mt-0.5 ${
                                    msg.role === "user"
                                      ? "bg-slate-700 text-slate-300"
                                      : "bg-purple-600 text-white"
                                  }`}
                                >
                                  {msg.role === "user" ? (
                                    <User className="w-2.5 h-2.5" />
                                  ) : (
                                    <Bot className="w-2.5 h-2.5" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[10px] text-slate-300 line-clamp-1 group-hover:text-slate-200 transition-colors">
                                    {displayContent.substring(0, 50)}
                                    {displayContent.length > 50 ? "..." : ""}
                                  </div>
                                </div>
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
  },
);
