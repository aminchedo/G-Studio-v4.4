/**
 * G Studio v2.3.0 - Tooltip & Help System
 *
 * Advanced tooltip system with:
 * - Contextual help content
 * - Interactive tutorials
 * - Feature discovery
 */

import React, {
  memo,
  useState,
  useCallback,
  useEffect,
  useRef,
  createContext,
  useContext,
  ReactNode,
} from "react";
import {
  HelpCircle,
  X,
  ChevronRight,
  ExternalLink,
  Keyboard,
  Info,
  Lightbulb,
  BookOpen,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface TooltipContent {
  title?: string;
  description: string;
  shortcut?: string;
  link?: { text: string; url: string };
  tips?: string[];
}

export type TooltipPosition = "top" | "bottom" | "left" | "right" | "auto";
export type TooltipTrigger = "hover" | "click" | "focus" | "manual";

export interface TooltipProps {
  content: string | TooltipContent;
  children: ReactNode;
  position?: TooltipPosition;
  trigger?: TooltipTrigger;
  delay?: number;
  disabled?: boolean;
  maxWidth?: number;
  interactive?: boolean;
}

// ============================================================================
// HELP CONTENT DATABASE
// ============================================================================

export const helpContent: Record<string, TooltipContent> = {
  // Editor
  "editor.save": {
    title: "Save File",
    description: "Save the current file to preserve your changes.",
    shortcut: "Ctrl+S",
  },
  "editor.format": {
    title: "Format Code",
    description:
      "Automatically format your code using Prettier for consistent style.",
    shortcut: "Ctrl+Shift+F",
  },
  "editor.undo": {
    title: "Undo",
    description: "Reverse the last action.",
    shortcut: "Ctrl+Z",
  },
  "editor.redo": {
    title: "Redo",
    description: "Restore the previously undone action.",
    shortcut: "Ctrl+Y",
  },

  // Chat
  "chat.send": {
    title: "Send Message",
    description:
      "Send your message to the AI assistant. Be specific about what you need.",
    shortcut: "Enter",
    tips: [
      "Be specific about the task",
      "Mention file names when relevant",
      "Use /commands for quick actions",
    ],
  },
  "chat.voice": {
    title: "Voice Input",
    description:
      "Click to start speaking. The AI will transcribe your speech and respond.",
    tips: [
      "Speak clearly",
      "Pause briefly between sentences",
      'Say "stop" to end recording',
    ],
  },
  "chat.clear": {
    title: "Clear Chat",
    description: "Start a new conversation while preserving your files.",
    shortcut: "Ctrl+L",
  },

  // Sidebar
  "sidebar.files": {
    title: "File Explorer",
    description:
      "Browse and manage your project files. Right-click for more options.",
    tips: [
      "Drag files to reorganize",
      "Double-click to open",
      "Right-click for context menu",
    ],
  },
  "sidebar.search": {
    title: "Search Files",
    description: "Search across all files in your project.",
    shortcut: "Ctrl+Shift+F",
  },

  // AI Features
  "ai.suggestions": {
    title: "AI Suggestions",
    description: "Get intelligent suggestions based on your code context.",
    shortcut: "Ctrl+Space",
    tips: [
      "Select code to get specific suggestions",
      "Higher confidence = more relevant",
    ],
  },
  "ai.explain": {
    title: "Explain Code",
    description: "Get a detailed explanation of the selected code.",
    shortcut: "Ctrl+E",
  },

  // Toolbar
  "toolbar.preview": {
    title: "Live Preview",
    description: "See your code rendered in real-time as you edit.",
    shortcut: "Ctrl+P",
  },
  "toolbar.terminal": {
    title: "Terminal",
    description: "Access the integrated terminal to run commands.",
    shortcut: "Ctrl+`",
  },
  "toolbar.settings": {
    title: "Settings",
    description: "Configure G Studio to your preferences.",
    shortcut: "Ctrl+,",
  },

  // Models
  "model.select": {
    title: "Select AI Model",
    description:
      "Choose which AI model to use. Different models have different capabilities and speeds.",
    tips: [
      "Flash models are faster but less capable",
      "Pro models are slower but more accurate",
      "Experimental models have newest features",
    ],
  },
};

// ============================================================================
// TOOLTIP CONTEXT
// ============================================================================

interface TooltipContextValue {
  activeTooltip: string | null;
  setActiveTooltip: (id: string | null) => void;
  isDark: boolean;
}

const TooltipContext = createContext<TooltipContextValue>({
  activeTooltip: null,
  setActiveTooltip: () => {},
  isDark: true,
});

export const TooltipProvider: React.FC<{
  children: ReactNode;
  isDark?: boolean;
}> = ({ children, isDark = true }) => {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  return (
    <TooltipContext.Provider
      value={{ activeTooltip, setActiveTooltip, isDark }}
    >
      {children}
    </TooltipContext.Provider>
  );
};

// Hook to access TooltipContext
export const useTooltipContext = (): TooltipContextValue => {
  const context = useContext(TooltipContext);
  if (!context) {
    throw new Error("useTooltipContext must be used within a TooltipProvider");
  }
  return context;
};

// ============================================================================
// TOOLTIP COMPONENT
// ============================================================================

export const Tooltip: React.FC<TooltipProps> = memo(
  ({
    content,
    children,
    position = "top",
    trigger = "hover",
    delay = 300,
    disabled = false,
    maxWidth = 280,
    interactive = false,
  }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const triggerRef = useRef<HTMLDivElement>(null);
    const tooltipRef = useRef<HTMLDivElement>(null);
    const timeoutRef = useRef<NodeJS.Timeout>();
    const { isDark } = useTooltipContext();

    const showTooltip = useCallback(() => {
      if (disabled) return;

      timeoutRef.current = setTimeout(() => {
        if (triggerRef.current) {
          const rect = triggerRef.current.getBoundingClientRect();
          const pos = calculatePosition(rect, position, maxWidth);
          setCoords(pos);
          setIsVisible(true);
        }
      }, delay);
    }, [disabled, delay, position, maxWidth]);

    const hideTooltip = useCallback(() => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setIsVisible(false);
    }, []);

    useEffect(() => {
      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, []);

    const triggerProps = {
      hover: {
        onMouseEnter: showTooltip,
        onMouseLeave: hideTooltip,
      },
      click: {
        onClick: () => setIsVisible(!isVisible),
      },
      focus: {
        onFocus: showTooltip,
        onBlur: hideTooltip,
      },
      manual: {},
    }[trigger];

    const tooltipContent =
      typeof content === "string" ? { description: content } : content;

    return (
      <>
        <div ref={triggerRef} {...triggerProps} className="inline-block">
          {children}
        </div>

        {isVisible && (
          <div
            ref={tooltipRef}
            role="tooltip"
            className={`fixed z-[9999] animate-in fade-in duration-200 ${
              interactive ? "pointer-events-auto" : "pointer-events-none"
            }`}
            style={{
              left: coords.x,
              top: coords.y,
              maxWidth,
            }}
            onMouseEnter={interactive ? () => setIsVisible(true) : undefined}
            onMouseLeave={interactive ? hideTooltip : undefined}
          >
            <div
              className={`rounded-lg shadow-xl border p-3 ${
                isDark
                  ? "bg-slate-800 border-slate-700 text-white"
                  : "bg-white border-gray-200 text-gray-900"
              }`}
            >
              {tooltipContent.title && (
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">
                    {tooltipContent.title}
                  </span>
                  {tooltipContent.shortcut && (
                    <kbd
                      className={`px-1.5 py-0.5 rounded text-xs ${
                        isDark
                          ? "bg-slate-700 text-slate-300"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {tooltipContent.shortcut}
                    </kbd>
                  )}
                </div>
              )}

              <p
                className={`text-sm ${isDark ? "text-slate-300" : "text-gray-600"}`}
              >
                {tooltipContent.description}
              </p>

              {tooltipContent.tips && tooltipContent.tips.length > 0 && (
                <ul
                  className={`mt-2 text-xs space-y-1 ${
                    isDark ? "text-slate-400" : "text-gray-500"
                  }`}
                >
                  {tooltipContent.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <Lightbulb className="w-3 h-3 mt-0.5 text-yellow-500" />
                      {tip}
                    </li>
                  ))}
                </ul>
              )}

              {tooltipContent.link && (
                <a
                  href={tooltipContent.link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-1 mt-2 text-xs ${
                    isDark
                      ? "text-blue-400 hover:text-blue-300"
                      : "text-blue-600 hover:text-blue-500"
                  }`}
                >
                  {tooltipContent.link.text}
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Arrow */}
            <div
              className={`absolute w-2 h-2 rotate-45 ${
                isDark
                  ? "bg-slate-800 border-slate-700"
                  : "bg-white border-gray-200"
              }`}
              style={getArrowStyle(position)}
            />
          </div>
        )}
      </>
    );
  },
);

Tooltip.displayName = "Tooltip";

// ============================================================================
// HELP BUTTON
// ============================================================================

export const HelpButton: React.FC<{
  helpId: string;
  size?: "sm" | "md" | "lg";
}> = memo(({ helpId, size = "sm" }) => {
  const content = helpContent[helpId];
  const sizes = { sm: "w-4 h-4", md: "w-5 h-5", lg: "w-6 h-6" };

  if (!content) return null;

  return (
    <Tooltip content={content} position="top" interactive>
      <button className="opacity-50 hover:opacity-100 transition-opacity">
        <HelpCircle className={sizes[size]} />
      </button>
    </Tooltip>
  );
});

HelpButton.displayName = "HelpButton";

// ============================================================================
// HELP MODAL
// ============================================================================

export const HelpModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  isDark?: boolean;
}> = memo(({ isOpen, onClose, isDark = true }) => {
  const [activeSection, setActiveSection] = useState("getting-started");

  if (!isOpen) return null;

  const sections = [
    { id: "getting-started", label: "Getting Started", icon: BookOpen },
    { id: "shortcuts", label: "Keyboard Shortcuts", icon: Keyboard },
    { id: "features", label: "Features", icon: Lightbulb },
    { id: "tips", label: "Tips & Tricks", icon: Info },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={`relative w-full max-w-3xl max-h-[80vh] rounded-2xl shadow-2xl overflow-hidden ${
          isDark ? "bg-slate-800" : "bg-white"
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center justify-between px-6 py-4 border-b ${
            isDark ? "border-slate-700" : "border-gray-200"
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              <HelpCircle className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2
                className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}
              >
                Help Center
              </h2>
              <p
                className={`text-sm ${isDark ? "text-slate-400" : "text-gray-500"}`}
              >
                Learn how to use G Studio effectively
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg transition-colors ${
              isDark
                ? "hover:bg-slate-700 text-slate-400"
                : "hover:bg-gray-100 text-gray-500"
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex h-[60vh]">
          {/* Sidebar */}
          <div
            className={`w-56 border-r p-4 ${
              isDark
                ? "border-slate-700 bg-slate-800/50"
                : "border-gray-200 bg-gray-50"
            }`}
          >
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeSection === section.id
                      ? isDark
                        ? "bg-blue-600/20 text-blue-400"
                        : "bg-blue-100 text-blue-700"
                      : isDark
                        ? "text-slate-300 hover:bg-slate-700"
                        : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <section.icon className="w-4 h-4" />
                  {section.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Main content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeSection === "getting-started" && (
              <div
                className={`space-y-4 ${isDark ? "text-slate-300" : "text-gray-600"}`}
              >
                <h3
                  className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  Getting Started
                </h3>
                <p>
                  G Studio is an AI-powered IDE where you can code through
                  natural conversation. Simply tell the AI what you want to
                  build, and it will help you create, edit, and manage your
                  code.
                </p>
                <div className="space-y-3">
                  <StepItem number={1} title="Start a conversation">
                    Type your request in the chat panel. For example: "Create a
                    React component for a login form"
                  </StepItem>
                  <StepItem number={2} title="Review the code">
                    The AI will generate code and show it in the editor. You can
                    make changes or ask for modifications.
                  </StepItem>
                  <StepItem number={3} title="Iterate and refine">
                    Continue the conversation to refine the code. Ask for
                    explanations, fixes, or new features.
                  </StepItem>
                </div>
              </div>
            )}

            {activeSection === "shortcuts" && (
              <div className="space-y-4">
                <h3
                  className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  Keyboard Shortcuts
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <ShortcutItem
                    shortcut="Ctrl+S"
                    description="Save file"
                    isDark={isDark}
                  />
                  <ShortcutItem
                    shortcut="Ctrl+N"
                    description="New file"
                    isDark={isDark}
                  />
                  <ShortcutItem
                    shortcut="Ctrl+Shift+F"
                    description="Format code"
                    isDark={isDark}
                  />
                  <ShortcutItem
                    shortcut="Ctrl+Space"
                    description="AI suggestions"
                    isDark={isDark}
                  />
                  <ShortcutItem
                    shortcut="Ctrl+B"
                    description="Toggle sidebar"
                    isDark={isDark}
                  />
                  <ShortcutItem
                    shortcut="Ctrl+J"
                    description="Toggle chat"
                    isDark={isDark}
                  />
                  <ShortcutItem
                    shortcut="Ctrl+P"
                    description="Toggle preview"
                    isDark={isDark}
                  />
                  <ShortcutItem
                    shortcut="Ctrl+,"
                    description="Settings"
                    isDark={isDark}
                  />
                </div>
              </div>
            )}

            {activeSection === "features" && (
              <div
                className={`space-y-4 ${isDark ? "text-slate-300" : "text-gray-600"}`}
              >
                <h3
                  className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  Features
                </h3>
                <FeatureItem
                  title="Conversation-Based Coding"
                  description="Write code by describing what you want in plain language."
                />
                <FeatureItem
                  title="60+ MCP Tools"
                  description="The AI has access to file operations, code analysis, refactoring, and more."
                />
                <FeatureItem
                  title="Voice Input"
                  description="Speak to code even faster. Click the microphone to start."
                />
                <FeatureItem
                  title="Live Preview"
                  description="See your changes rendered in real-time."
                />
                <FeatureItem
                  title="Local AI Support"
                  description="Connect to LM Studio for private, offline AI processing."
                />
              </div>
            )}

            {activeSection === "tips" && (
              <div
                className={`space-y-4 ${isDark ? "text-slate-300" : "text-gray-600"}`}
              >
                <h3
                  className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
                >
                  Tips & Tricks
                </h3>
                <TipItem tip="Be specific in your requests. Instead of 'make a button', say 'create a blue submit button with hover effects'." />
                <TipItem tip="Use /commands for quick actions: /create, /fix, /analyze, /refactor" />
                <TipItem tip="Select code before asking questions to get context-aware answers." />
                <TipItem tip="Press Ctrl+Space to get AI suggestions based on your current code." />
                <TipItem tip="Use voice input for longer descriptions - it's faster than typing!" />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

HelpModal.displayName = "HelpModal";

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const StepItem: React.FC<{
  number: number;
  title: string;
  children: ReactNode;
}> = ({ number, title, children }) => (
  <div className="flex gap-3">
    <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center flex-shrink-0 font-bold">
      {number}
    </div>
    <div>
      <div className="font-medium text-white">{title}</div>
      <div className="text-sm opacity-80">{children}</div>
    </div>
  </div>
);

const ShortcutItem: React.FC<{
  shortcut: string;
  description: string;
  isDark: boolean;
}> = ({ shortcut, description, isDark }) => (
  <div
    className={`flex items-center justify-between p-3 rounded-lg ${
      isDark ? "bg-slate-700/50" : "bg-gray-100"
    }`}
  >
    <span className={`text-sm ${isDark ? "text-slate-300" : "text-gray-600"}`}>
      {description}
    </span>
    <kbd
      className={`px-2 py-1 rounded text-xs font-mono ${
        isDark ? "bg-slate-600 text-slate-200" : "bg-gray-200 text-gray-700"
      }`}
    >
      {shortcut}
    </kbd>
  </div>
);

const FeatureItem: React.FC<{ title: string; description: string }> = ({
  title,
  description,
}) => (
  <div className="flex items-start gap-3">
    <ChevronRight className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
    <div>
      <div className="font-medium text-white">{title}</div>
      <div className="text-sm opacity-80">{description}</div>
    </div>
  </div>
);

const TipItem: React.FC<{ tip: string }> = ({ tip }) => (
  <div className="flex items-start gap-3 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
    <Lightbulb className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
    <p className="text-sm">{tip}</p>
  </div>
);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function calculatePosition(
  rect: DOMRect,
  position: TooltipPosition,
  maxWidth: number,
): { x: number; y: number } {
  const padding = 8;

  switch (position) {
    case "top":
      return {
        x: rect.left + rect.width / 2 - maxWidth / 2,
        y: rect.top - padding - 10,
      };
    case "bottom":
      return {
        x: rect.left + rect.width / 2 - maxWidth / 2,
        y: rect.bottom + padding,
      };
    case "left":
      return {
        x: rect.left - maxWidth - padding,
        y: rect.top + rect.height / 2,
      };
    case "right":
      return {
        x: rect.right + padding,
        y: rect.top + rect.height / 2,
      };
    default:
      return {
        x: rect.left + rect.width / 2 - maxWidth / 2,
        y: rect.top - padding - 10,
      };
  }
}

function getArrowStyle(position: TooltipPosition): React.CSSProperties {
  switch (position) {
    case "top":
      return {
        bottom: -4,
        left: "50%",
        transform: "translateX(-50%) rotate(45deg)",
      };
    case "bottom":
      return {
        top: -4,
        left: "50%",
        transform: "translateX(-50%) rotate(45deg)",
      };
    case "left":
      return {
        right: -4,
        top: "50%",
        transform: "translateY(-50%) rotate(45deg)",
      };
    case "right":
      return {
        left: -4,
        top: "50%",
        transform: "translateY(-50%) rotate(45deg)",
      };
    default:
      return {};
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  Tooltip,
  HelpButton,
  HelpModal,
  TooltipProvider,
  helpContent,
};
