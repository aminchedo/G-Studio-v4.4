import React, {
  useState,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from "react";
import {
  Code2,
  FileText,
  Bug,
  Zap,
  MessageSquare,
  LayoutGrid,
} from "lucide-react";

type ActionMode = "write" | "explain" | "fix" | "optimize" | "review";

export interface EnhancedInputAreaRef {
  appendText: (text: string) => void;
}

interface EnhancedInputAreaProps {
  onSend: (message: string, files?: File[]) => void;
  disabled?: boolean;
  isProcessing?: boolean;
  onVoiceToggle?: () => void;
  isListening?: boolean;
  /** Live speech-to-text transcript while listening (Persian, etc.) */
  voiceTranscript?: string;
  onAgentDialog?: () => void;
  agentConnected?: boolean;
  mcpToolsCount?: number;
  currentAIMode?: string;
  speechLanguage?: string;
}

/** Distinct color theme per action for the quick-action panel */
const ACTION_THEMES: Record<
  ActionMode,
  { bg: string; border: string; text: string; shadow: string }
> = {
  write: {
    bg: "bg-blue-500/25",
    border: "border-blue-400/50",
    text: "text-blue-200",
    shadow: "shadow-blue-500/20",
  },
  explain: {
    bg: "bg-emerald-500/25",
    border: "border-emerald-400/50",
    text: "text-emerald-200",
    shadow: "shadow-emerald-500/20",
  },
  fix: {
    bg: "bg-amber-500/25",
    border: "border-amber-400/50",
    text: "text-amber-200",
    shadow: "shadow-amber-500/20",
  },
  optimize: {
    bg: "bg-violet-500/25",
    border: "border-violet-400/50",
    text: "text-violet-200",
    shadow: "shadow-violet-500/20",
  },
  review: {
    bg: "bg-rose-500/25",
    border: "border-rose-400/50",
    text: "text-rose-200",
    shadow: "shadow-rose-500/20",
  },
};

const ACTION_CONFIG: Record<
  ActionMode,
  {
    label: string;
    placeholder: string;
    promptPrefix: string;
    Icon: React.ComponentType<{
      className?: string;
      strokeWidth?: number | string;
    }>;
  }
> = {
  write: {
    label: "Write",
    placeholder: "Write code for:",
    promptPrefix: "Write code for: ",
    Icon: Code2,
  },
  explain: {
    label: "Exp",
    placeholder: "Explain this in detail:",
    promptPrefix: "Explain this in detail: ",
    Icon: FileText,
  },
  fix: {
    label: "Fix",
    placeholder: "Find and fix bugs in:",
    promptPrefix: "Find and fix bugs in: ",
    Icon: Bug,
  },
  optimize: {
    label: "Opt",
    placeholder: "Optimize and improve:",
    promptPrefix: "Optimize and improve: ",
    Icon: Zap,
  },
  review: {
    label: "Review",
    placeholder: "Review this code:",
    promptPrefix: "Review this code: ",
    Icon: MessageSquare,
  },
};

export const EnhancedInputArea = forwardRef<
  EnhancedInputAreaRef,
  EnhancedInputAreaProps
>(
  (
    {
      onSend,
      disabled = false,
      isProcessing = false,
      onVoiceToggle,
      isListening = false,
      voiceTranscript = "",
      speechLanguage = "fa-IR",
    },
    ref,
  ) => {
    const [message, setMessage] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [selectedAction, setSelectedAction] = useState<ActionMode>("explain");
    const [showQuickActions, setShowQuickActions] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const textareaMaxHeightPx = 176; /* 11rem - matches --chat-input-max-h */

    const displayValue =
      message + (voiceTranscript ? (message ? " " : "") + voiceTranscript : "");

    useImperativeHandle(
      ref,
      () => ({
        appendText(text: string) {
          if (!text.trim()) return;
          setMessage((prev) => (prev ? prev + " " + text.trim() : text.trim()));
        },
      }),
      [],
    );

    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        const newHeight = Math.min(
          textareaRef.current.scrollHeight,
          textareaMaxHeightPx,
        );
        textareaRef.current.style.height = newHeight + "px";
      }
    }, [message, voiceTranscript]);

    const currentConfig = ACTION_CONFIG[selectedAction];

    const handleSend = () => {
      const textToSend = displayValue.trim();
      if ((!textToSend && files.length === 0) || disabled) return;
      const text = textToSend
        ? textToSend.startsWith(currentConfig.promptPrefix)
          ? textToSend
          : currentConfig.promptPrefix + textToSend
        : currentConfig.promptPrefix;
      onSend(text, files);
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
      if (e.target.files) setFiles(Array.from(e.target.files));
    };

    const btnSize = "w-10 h-10 min-w-[2.5rem] min-h-[2.5rem]";

    return (
      <div
        className="relative bg-slate-800/40 backdrop-blur-xl border-t border-white/10"
        dir="ltr"
      >
        {/* Top: Quick actions – icon only, minimal, justified left; panel below when open */}
        <div className="px-3 pt-2 pb-1.5">
          <div className="flex items-center justify-start">
            <button
              type="button"
              onClick={() => setShowQuickActions((v) => !v)}
              className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-all duration-200 active:scale-95 text-slate-400 hover:text-slate-200 hover:bg-white/5 border-white/10 shrink-0 ${
                showQuickActions
                  ? "bg-white/10 border-white/20 text-slate-200"
                  : ""
              }`}
              title={showQuickActions ? "Hide quick actions" : "Quick actions"}
            >
              <LayoutGrid className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
          {showQuickActions && (
            <div className="mt-2 rounded-xl border border-white/10 bg-slate-800/90 backdrop-blur-md p-2 shadow-xl">
              <div className="grid grid-cols-5 gap-1.5">
                {(Object.keys(ACTION_CONFIG) as ActionMode[]).map((mode) => {
                  const config = ACTION_CONFIG[mode];
                  const Icon = config.Icon;
                  const theme = ACTION_THEMES[mode];
                  const isActive = selectedAction === mode;
                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setSelectedAction(mode);
                        setShowQuickActions(false);
                      }}
                      className={`flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg border transition-all duration-200 active:scale-95 min-w-0 overflow-hidden ${theme.bg} ${theme.border} ${theme.text} ${
                        isActive
                          ? `ring-2 ring-white/40 shadow-lg ${theme.shadow}`
                          : "hover:opacity-90"
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" strokeWidth={1.75} />
                      <span className="text-[10px] font-semibold leading-tight truncate w-full text-center">
                        {config.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Files preview */}
        {files.length > 0 && (
          <div className="px-3 pb-2 flex items-center gap-2 flex-wrap">
            {files.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-2.5 py-1 bg-slate-700/50 rounded-lg border border-white/10 text-xs text-slate-300"
              >
                {file.name}
                <button
                  type="button"
                  onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                  className="p-0.5 hover:bg-white/10 rounded opacity-70 hover:opacity-100"
                >
                  <svg
                    className="w-3 h-3"
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
        )}

        {/* Chat input row: mic | textarea | attach | send – scalable min-height */}
        <div className="chat-input-row">
          <div
            className={`rounded-xl border overflow-hidden transition-shadow duration-200 ${
              isFocused
                ? "border-blue-500/40 ring-2 ring-blue-500/20"
                : "border-white/10"
            } bg-slate-700/50 backdrop-blur-sm`}
          >
            <div className="flex items-center gap-2 p-2 min-h-[3.25rem]">
              {onVoiceToggle && (
                <button
                  type="button"
                  onClick={onVoiceToggle}
                  disabled={disabled}
                  className={`flex items-center justify-center flex-shrink-0 rounded-full border transition-all duration-200 active:scale-95 ${btnSize} ${
                    isListening
                      ? "bg-sky-500/40 text-sky-200 border-sky-400/50 shadow-md shadow-sky-500/20 animate-pulse"
                      : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white hover:border-white/20"
                  } disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:ring-offset-2 focus:ring-offset-slate-800`}
                  title={
                    isListening
                      ? "Stop"
                      : `Speech to text (${speechLanguage === "fa-IR" ? "فارسی" : speechLanguage})`
                  }
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                </button>
              )}

              <div className="flex-1 min-w-0 flex items-center">
                <textarea
                  ref={textareaRef}
                  value={displayValue}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (voiceTranscript) {
                      if (v.endsWith(voiceTranscript)) {
                        setMessage(
                          v
                            .slice(0, v.length - voiceTranscript.length)
                            .trimEnd(),
                        );
                      }
                    } else {
                      setMessage(v);
                    }
                  }}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  placeholder={currentConfig.placeholder}
                  disabled={disabled}
                  rows={1}
                  className="w-full min-h-[2.25rem] max-h-[11rem] py-2 px-3 bg-transparent text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-0 text-xs leading-relaxed border-0 rounded-lg disabled:opacity-70 disabled:cursor-not-allowed text-left"
                  dir="auto"
                />
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled}
                  className={`flex items-center justify-center rounded-full border transition-all duration-200 active:scale-95 ${btnSize} bg-white/5 border-white/10 text-slate-400 hover:bg-white/10 hover:text-white hover:border-white/20 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-sky-400/50 focus:ring-offset-2 focus:ring-offset-slate-800`}
                  title="Attach"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
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
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={disabled || (!message.trim() && files.length === 0)}
                  className={`flex items-center justify-center rounded-full flex-shrink-0 transition-all duration-200 active:scale-95 disabled:active:scale-100 ${btnSize} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                    !disabled && (displayValue.trim() || files.length > 0)
                      ? "bg-sky-500 hover:bg-sky-400 focus:ring-sky-400 text-white shadow-md shadow-sky-500/30"
                      : "bg-slate-600/60 text-slate-400 cursor-not-allowed"
                  }`}
                  title="Send"
                >
                  {isProcessing ? (
                    <svg
                      className="w-5 h-5 animate-spin"
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
                      className="w-5 h-5 ml-0.5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  },
);
EnhancedInputArea.displayName = "EnhancedInputArea";
