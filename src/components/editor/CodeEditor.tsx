import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Save,
  Wand2,
  CheckCircle2,
  FileCode,
  ChevronRight,
  Terminal,
  Cpu,
  Coins,
  Loader2,
  Search,
  X,
  ArrowUp,
  ArrowDown,
  Hash,
  Copy,
  Maximize2,
  Minimize2,
  Moon,
  Sun,
} from "lucide-react";
import Editor, { useMonaco, loader } from "@monaco-editor/react";
import type { IDisposable } from "monaco-editor";
import { CodeCompletionService } from "@/services/codeCompletionService";
// @ts-ignore
import prettier from "prettier";
// @ts-ignore
import parserBabel from "prettier/plugins/babel";
// @ts-ignore
import parserEstree from "prettier/plugins/estree";
// @ts-ignore
import parserMarkdown from "prettier/plugins/markdown";

interface CodeEditorProps {
  // Backwards-compatible: accept either filename/content or a File object
  filename?: string;
  content?: string;
  file?: {
    name: string;
    content: string;
    language?: string;
    path?: string;
  };
  // onSave kept for older callers; onChange is used by App.tsx
  onSave?: (filename: string, newContent: string) => void;
  onChange?: (newContent: string) => void;
  onClose?: () => void;
  modelName?: string;
  tokenCount?: number;
  minimapEnabled?: boolean;
  onFindRequest?: () => void;
  onUndoRequest?: () => void;
  onRedoRequest?: () => void;
  theme?: "dark" | "light" | string;
}

const LANGUAGE_MAP: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  json: "json",
  css: "css",
  scss: "scss",
  less: "less",
  html: "html",
  md: "markdown",
  markdown: "markdown",
  py: "python",
  java: "java",
  c: "c",
  cpp: "cpp",
  go: "go",
  rs: "rust",
  php: "php",
  rb: "ruby",
  sh: "shell",
  bash: "shell",
  yaml: "yaml",
  yml: "yaml",
  xml: "xml",
  sql: "sql",
  dockerfile: "dockerfile",
};

const getLanguage = (filename: string): string => {
  if (filename == null || typeof filename !== "string") return "plaintext";
  const parts = filename.split(".");
  if (parts.length < 2) return "plaintext";
  const ext = parts.pop()?.toLowerCase();
  return ext && LANGUAGE_MAP[ext] ? LANGUAGE_MAP[ext] : "plaintext";
};

export const CodeEditor: React.FC<CodeEditorProps> = ({
  filename: filenameProp,
  content: contentProp,
  file,
  onSave,
  onChange,
  modelName,
  tokenCount,
  minimapEnabled = true,
  onFindRequest,
  onUndoRequest,
  onRedoRequest,
  theme,
}) => {
  const filename = filenameProp ?? "";
  // Prefer `file` when provided (App.tsx passes a FileData object)
  const content = contentProp ?? file?.content ?? "";
  const effectiveFilename = filenameProp ?? file?.name ?? "untitled";
  const [editorValue, setEditorValue] = useState(content);
  const [isDirty, setIsDirty] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "formatting">("idle");
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [isReplaceMode, setIsReplaceMode] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const [currentMatch, setCurrentMatch] = useState(0);
  const [showGoToLine, setShowGoToLine] = useState(false);
  const [goToLineNumber, setGoToLineNumber] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lineCount, setLineCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const editorRef = useRef<any>(null);
  const monaco = useMonaco();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const goToLineInputRef = useRef<HTMLInputElement>(null);

  // Load theme preference from localStorage
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem("gstudio_editor_theme");
      if (savedTheme) {
        setIsDarkTheme(savedTheme === "dark");
      }
    } catch (e) {
      console.warn("Failed to load theme preference:", e);
    }
  }, []);

  // Sync with external `theme` prop when provided by parent (App.tsx)
  useEffect(() => {
    if (theme === "dark" || theme === "light") {
      setIsDarkTheme(theme === "dark");
    }
  }, [theme]);

  // Update internal value when prop changes (e.g. from AI or file switch)
  useEffect(() => {
    const safeContent = content ?? "";
    setEditorValue(safeContent);
    setIsDirty(false);
    // Update counts from content prop
    const lines = safeContent.split("\n").length;
    setLineCount(lines);
    setCharCount(safeContent.length);
  }, [filename, content]);

  // Update minimap when prop changes
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateOptions({
        minimap: {
          enabled: minimapEnabled,
          side: "right",
          showSlider: "always",
          renderCharacters: true,
          maxColumn: 120,
        },
      });
      // Force layout update
      setTimeout(() => {
        editorRef.current?.layout();
      }, 50);
    }
  }, [minimapEnabled]);

  // Force layout update when content changes significantly
  useEffect(() => {
    if (editorRef.current) {
      setTimeout(() => {
        editorRef.current?.layout();
      }, 100);
    }
  }, [filename]);

  // Setup advanced Monaco features
  useEffect(() => {
    if (!monaco || !editorRef.current) return;

    const language = getLanguage(filename);
    const disposables: IDisposable[] = [];

    // Register comprehensive autocomplete using CodeCompletionService
    if (language === "typescript" || language === "javascript") {
      try {
        const dispose =
          CodeCompletionService.registerCompletionProvider(language);
        disposables.push(dispose);
      } catch (error) {
        console.warn("Failed to register CodeCompletionService:", error);
      }
    }

    // Register basic autocomplete providers for common languages (fallback)
    const disposeCompletion = monaco.languages.registerCompletionItemProvider(
      "typescript",
      {
        provideCompletionItems: (model, position) => {
          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const suggestions = [
            // React hooks
            {
              label: "useState",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText:
                "const [${1:state}, set${1/(.*)/${1:/capitalize}/}] = useState($2);",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "React useState hook",
              range,
            },
            {
              label: "useEffect",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText: "useEffect(() => {\n\t$0\n}, []);",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "React useEffect hook",
              range,
            },
            {
              label: "useCallback",
              kind: monaco.languages.CompletionItemKind.Function,
              insertText:
                "const ${1:callback} = useCallback(() => {\n\t$0\n}, []);",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "React useCallback hook",
              range,
            },
            // Common patterns
            {
              label: "interface",
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: "interface ${1:Name} {\n\t$0\n}",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "TypeScript interface",
              range,
            },
            {
              label: "class",
              kind: monaco.languages.CompletionItemKind.Class,
              insertText:
                "class ${1:Name} {\n\tconstructor() {\n\t\t$0\n\t}\n}",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Class definition",
              range,
            },
            {
              label: "try-catch",
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText:
                "try {\n\t$0\n} catch (error) {\n\tconsole.error(error);\n}",
              insertTextRules:
                monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: "Try-catch block",
              range,
            },
          ];

          return { suggestions };
        },
      },
    );

    // Register code actions
    const disposeCodeAction = monaco.languages.registerCodeActionProvider(
      "typescript",
      {
        provideCodeActions: (model, range, context) => {
          const actions: any[] = [];

          context.markers.forEach((marker) => {
            if (marker.message.includes("console")) {
              actions.push({
                title: "Remove console statement",
                kind: "quickfix",
                diagnostics: [marker],
                edit: {
                  edits: [
                    {
                      resource: model.uri,
                      edit: {
                        range: marker,
                        text: "",
                      },
                    },
                  ],
                },
              });
            }
          });

          return { actions, dispose: () => {} };
        },
      },
    );

    // Register hover provider
    const disposeHover = monaco.languages.registerHoverProvider("typescript", {
      provideHover: (model, position) => {
        const word = model.getWordAtPosition(position);
        if (!word) return null;

        const docs: Record<string, string> = {
          useState:
            "**useState** - React Hook\n\nReturns a stateful value and a function to update it.",
          useEffect:
            "**useEffect** - React Hook\n\nAccepts a function that contains imperative code.",
          console:
            "**console** - Global object\n\nProvides access to the browser's debugging console.",
        };

        const content = docs[word.word];
        if (!content) return null;

        return {
          range: new monaco.Range(
            position.lineNumber,
            word.startColumn,
            position.lineNumber,
            word.endColumn,
          ),
          contents: [{ value: content }],
        };
      },
    });

    return () => {
      disposeCompletion.dispose();
      disposeCodeAction.dispose();
      disposeHover.dispose();
      // Dispose all CodeCompletionService providers
      disposables.forEach((d) => d.dispose());
    };
  }, [monaco, filename]);

  const handleEditorChange = (value: string | undefined) => {
    const nextVal = value || "";
    setEditorValue(nextVal);
    setIsDirty(nextVal !== content);
    // Update counts
    const lines = nextVal.split("\n").length;
    setLineCount(lines);
    setCharCount(nextVal.length);
    // Notify parent (App.tsx uses onChange)
    if (onChange) onChange(nextVal);
  };

  // Expose editor functions globally for Ribbon
  useEffect(() => {
    if (editorRef.current) {
      (window as any).__editorUndo = () => {
        editorRef.current?.trigger("ribbon", "undo", null);
      };
      (window as any).__editorRedo = () => {
        editorRef.current?.trigger("ribbon", "redo", null);
      };
      (window as any).__editorFind = () => {
        setShowSearch(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      };
      (window as any).__editorGoToLine = (line?: number) => {
        if (line) {
          editorRef.current?.revealLineInCenter(line);
          editorRef.current?.setPosition({ lineNumber: line, column: 1 });
          editorRef.current?.focus();
        } else {
          setShowGoToLine(true);
          setTimeout(() => goToLineInputRef.current?.focus(), 100);
        }
      };
      (window as any).__editorToggleWordWrap = () => {
        const current = editorRef.current?.getOption(
          monaco?.editor.EditorOption.wordWrap,
        );
        editorRef.current?.updateOptions({
          wordWrap: current === "on" ? "off" : "on",
        });
      };
    }
    return () => {
      delete (window as any).__editorUndo;
      delete (window as any).__editorRedo;
      delete (window as any).__editorFind;
      delete (window as any).__editorGoToLine;
      delete (window as any).__editorToggleWordWrap;
    };
  }, [monaco]);

  const handleSave = useCallback(() => {
    if (onSave) {
      onSave(effectiveFilename, editorValue);
    } else if (onChange) {
      onChange(editorValue);
    }
    setIsDirty(false);
    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  }, [effectiveFilename, editorValue, onSave, onChange]);

  // Keyboard shortcut for save
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", down);
    return () => window.removeEventListener("keydown", down);
  }, [handleSave]);

  // Auto-save on inactivity
  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(() => {
      handleSave();
    }, 3000);
    return () => clearTimeout(timer);
  }, [editorValue, isDirty, handleSave]);

  const handleFormat = async () => {
    if (!editorRef.current) return;

    // Try built-in Monaco formatting first for supported langs
    try {
      const model = editorRef.current.getModel();
      if (model) {
        // Trigger generic action, but we might want Prettier for specific langs
        // await editorRef.current.getAction('editor.action.formatDocument').run();
        // Fallback to prettier logic below to ensure consistency with previous behavior
      }
    } catch (e) {
      // Monaco formatting not available or failed - will use Prettier fallback below
      console.warn(
        "Monaco built-in formatting unavailable, using Prettier:",
        e,
      );
    }

    try {
      const lang = getLanguage(filename);
      let parser = null;
      if (lang === "typescript" || lang === "javascript") parser = "babel-ts";
      else if (lang === "json") parser = "json";
      else if (lang === "markdown") parser = "markdown";

      if (parser) {
        setStatus("formatting");
        const formatted = await prettier.format(editorValue, {
          parser,
          plugins: [parserBabel, parserEstree, parserMarkdown],
          semi: true,
          singleQuote: true,
          printWidth: 100,
          trailingComma: "es5",
        });
        setEditorValue(formatted);
        // If we want to mark it as dirty after format, we can.
        // Or strictly we can save it immediately.
        setIsDirty(true);
        setStatus("idle");
        return;
      }
    } catch (e) {
      console.warn("Prettier format failed, checking monaco support", e);
    }

    setStatus("idle");
  };

  // Search functionality
  const handleSearch = useCallback(
    (query: string, isRegex: boolean = false, matchCase: boolean = false) => {
      if (!editorRef.current || !query) {
        setMatchCount(0);
        setCurrentMatch(0);
        return;
      }

      const model = editorRef.current.getModel();
      if (!model) return;

      const matches = model.findMatches(
        query,
        false,
        isRegex,
        matchCase,
        null,
        false,
      );
      setMatchCount(matches.length);

      if (matches.length > 0) {
        setCurrentMatch(1);
        editorRef.current.setPosition(matches[0].range.getStartPosition());
        editorRef.current.revealLineInCenter(matches[0].range.startLineNumber);
      }
    },
    [],
  );

  const handleFindNext = useCallback(() => {
    if (!editorRef.current || !searchQuery) return;
    editorRef.current.getAction("editor.action.nextMatchFindAction")?.run();
  }, [searchQuery]);

  const handleFindPrevious = useCallback(() => {
    if (!editorRef.current || !searchQuery) return;
    editorRef.current.getAction("editor.action.previousMatchFindAction")?.run();
  }, [searchQuery]);

  const handleReplace = useCallback(() => {
    if (!editorRef.current || !searchQuery || !replaceQuery) return;
    editorRef.current.getAction("editor.action.replaceOne")?.run();
  }, [searchQuery, replaceQuery]);

  const handleReplaceAll = useCallback(() => {
    if (!editorRef.current || !searchQuery || !replaceQuery) return;
    editorRef.current.getAction("editor.action.replaceAll")?.run();
  }, [searchQuery, replaceQuery]);

  const handleGoToLine = useCallback(() => {
    if (!editorRef.current || !goToLineNumber) return;
    const line = parseInt(goToLineNumber);
    if (isNaN(line) || line < 1) return;

    const model = editorRef.current.getModel();
    if (!model) return;

    const lineCount = model.getLineCount();
    if (line > lineCount) return;

    editorRef.current.setPosition({ lineNumber: line, column: 1 });
    editorRef.current.revealLineInCenter(line);
    setShowGoToLine(false);
    setGoToLineNumber("");
  }, [goToLineNumber]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + F for search
      if ((e.metaKey || e.ctrlKey) && e.key === "f" && !e.shiftKey) {
        e.preventDefault();
        setShowSearch(true);
        setIsReplaceMode(false);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      // Cmd/Ctrl + H for replace
      if ((e.metaKey || e.ctrlKey) && e.key === "h") {
        e.preventDefault();
        setShowSearch(true);
        setIsReplaceMode(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      // Cmd/Ctrl + G for go to line
      if ((e.metaKey || e.ctrlKey) && e.key === "g" && !e.shiftKey) {
        e.preventDefault();
        setShowGoToLine(true);
        setTimeout(() => goToLineInputRef.current?.focus(), 100);
      }
      // Escape to close search
      if (e.key === "Escape" && (showSearch || showGoToLine)) {
        e.preventDefault();
        setShowSearch(false);
        setShowGoToLine(false);
      }
      // F11 for fullscreen
      if (e.key === "F11") {
        e.preventDefault();
        setIsFullscreen(!isFullscreen);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSearch, showGoToLine, isFullscreen]);

  // Expose editor actions to parent via window
  useEffect(() => {
    if (onFindRequest) {
      const handleFind = () => {
        setShowSearch(true);
        setIsReplaceMode(false);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      };
      (window as any).__editorFind = handleFind;
    }
    if (onUndoRequest) {
      const handleUndo = () => {
        if (editorRef.current) {
          editorRef.current.trigger("editor", "undo", {});
        }
      };
      (window as any).__editorUndo = handleUndo;
    }
    if (onRedoRequest) {
      const handleRedo = () => {
        if (editorRef.current) {
          editorRef.current.trigger("editor", "redo", {});
        }
      };
      (window as any).__editorRedo = handleRedo;
    }
    return () => {
      delete (window as any).__editorFind;
      delete (window as any).__editorUndo;
      delete (window as any).__editorRedo;
    };
  }, [onFindRequest, onUndoRequest, onRedoRequest]);

  // Update search when query changes
  useEffect(() => {
    if (showSearch && searchQuery) {
      handleSearch(searchQuery);
    }
  }, [searchQuery, showSearch, handleSearch]);

  // Update theme when isDarkTheme changes
  useEffect(() => {
    if (monaco && editorRef.current) {
      monaco.editor.setTheme(isDarkTheme ? "gemini-dark" : "gemini-light");
      try {
        localStorage.setItem(
          "gstudio_editor_theme",
          isDarkTheme ? "dark" : "light",
        );
      } catch (e) {
        console.warn("Failed to save theme preference:", e);
      }
    }
  }, [isDarkTheme, monaco]);

  const handleThemeToggle = () => {
    setIsDarkTheme(!isDarkTheme);
  };

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;

    // Expose editor functions globally for Ribbon integration
    (window as any).__editorGoToLine = (line: number) => {
      editor.revealLineInCenter(line);
      editor.setPosition({ lineNumber: line, column: 1 });
      editor.focus();
    };
    (window as any).__editorToggleWordWrap = () => {
      const current = editor.getOption(monaco?.editor.EditorOption.wordWrap);
      editor.updateOptions({
        wordWrap: current === "off" ? "on" : "off",
      });
    };

    if (!monaco) {
      console.warn("Monaco instance not available");
      return;
    }

    // Define enhanced custom dark theme
    monaco.editor.defineTheme("gemini-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "64748b", fontStyle: "italic" },
        { token: "keyword", foreground: "a855f7", fontStyle: "bold" },
        { token: "string", foreground: "10b981" },
        { token: "number", foreground: "f59e0b" },
        { token: "type", foreground: "c084fc" },
        { token: "function", foreground: "7dd3fc" },
        { token: "variable", foreground: "cbd5e1" },
        { token: "constant", foreground: "f472b6" },
        { token: "operator", foreground: "94a3b8" },
        { token: "delimiter", foreground: "64748b" },
      ],
      colors: {
        "editor.background": "#0f172a",
        "editor.foreground": "#f1f5f9",
        "editor.lineHighlightBackground": "#1e293b",
        "editor.selectionBackground": "#334155",
        "editorCursor.foreground": "#a855f7",
        "editorLineNumber.foreground": "#475569",
        "editorLineNumber.activeForeground": "#a855f7",
        "editor.selectionHighlightBackground": "#1e293b",
        "editorIndentGuide.background": "#334155",
        "editorIndentGuide.activeBackground": "#475569",
        "editorWhitespace.foreground": "#1e293b",
      },
    });

    // Define light theme
    monaco.editor.defineTheme("gemini-light", {
      base: "vs",
      inherit: true,
      rules: [
        { token: "comment", foreground: "94a3b8", fontStyle: "italic" },
        { token: "keyword", foreground: "7c3aed", fontStyle: "bold" },
        { token: "string", foreground: "059669" },
        { token: "number", foreground: "d97706" },
        { token: "type", foreground: "9333ea" },
        { token: "function", foreground: "0284c7" },
        { token: "variable", foreground: "1e293b" },
        { token: "constant", foreground: "db2777" },
        { token: "operator", foreground: "64748b" },
        { token: "delimiter", foreground: "94a3b8" },
      ],
      colors: {
        "editor.background": "#ffffff",
        "editor.foreground": "#1e293b",
        "editor.lineHighlightBackground": "#f1f5f9",
        "editor.selectionBackground": "#e2e8f0",
        "editorCursor.foreground": "#7c3aed",
        "editorLineNumber.foreground": "#cbd5e1",
        "editorLineNumber.activeForeground": "#7c3aed",
        "editor.selectionHighlightBackground": "#f1f5f9",
        "editorIndentGuide.background": "#e2e8f0",
        "editorIndentGuide.activeBackground": "#cbd5e1",
        "editorWhitespace.foreground": "#f1f5f9",
      },
    });

    // Apply theme based on state
    monaco.editor.setTheme(isDarkTheme ? "gemini-dark" : "gemini-light");

    // Configure editor with all options
    editor.updateOptions({
      minimap: {
        enabled: minimapEnabled,
        side: "right",
        showSlider: "always",
        renderCharacters: true,
        maxColumn: 120,
      },
      scrollBeyondLastLine: false,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
      fontLigatures: true,
      smoothScrolling: true,
      padding: { top: 16, bottom: 16 },
      renderLineHighlight: "all",
      lineHeight: 1.6,
      letterSpacing: 0.5,
    });

    // Force layout update to ensure proper rendering
    setTimeout(() => {
      editor.layout();
      // Update counts after editor is mounted
      const model = editor.getModel();
      if (model) {
        setLineCount(model.getLineCount());
        setCharCount(model.getValue().length);
      }
    }, 100);

    // Handle window resize
    const handleResize = () => {
      editor.layout();
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  };

  return (
    <div className="flex flex-col h-full bg-white relative group">
      {/* Editor Toolbar */}
      <div className="flex items-center justify-between px-6 h-[48px] bg-white border-b border-slate-100 relative z-30 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-slate-50 rounded-lg border border-slate-100">
            <FileCode
              strokeWidth={1.5}
              className="w-3.5 h-3.5 text-slate-500"
            />
          </div>
          <div className="flex items-center gap-1.5 text-[12px] font-medium text-slate-500 font-mono tracking-tight">
            {(filename || "untitled").split("/").map((part, idx, arr) => (
              <React.Fragment key={idx}>
                <span
                  className={
                    idx === arr.length - 1
                      ? "text-slate-800 font-bold"
                      : "hover:text-slate-700 transition-colors cursor-default"
                  }
                >
                  {part}
                </span>
                {idx < arr.length - 1 && (
                  <ChevronRight
                    strokeWidth={1.5}
                    className="w-3 h-3 text-slate-300"
                  />
                )}
              </React.Fragment>
            ))}
          </div>
          {isDirty && (
            <div
              className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse ml-2 ring-2 ring-amber-100"
              title="Unsaved changes"
            />
          )}
        </div>

        <div className="flex items-center gap-2">
          {status === "saved" && (
            <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1.5 animate-fade-in bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100">
              <CheckCircle2 strokeWidth={1.5} className="w-3.5 h-3.5" /> Saved
            </span>
          )}
          {status === "formatting" && (
            <span className="text-[10px] font-bold text-ocean-600 animate-pulse bg-ocean-50 px-2 py-1 rounded-md border border-ocean-100">
              Formatting...
            </span>
          )}

          <div className="h-4 w-px bg-slate-200 mx-2" />

          <button
            onClick={handleFormat}
            className="p-1.5 text-slate-400 hover:text-ocean-600 hover:bg-ocean-50 rounded-lg transition-colors relative z-40"
            title="Format Code"
            style={{ pointerEvents: "auto" }}
          >
            <Wand2 strokeWidth={1.5} className="w-4 h-4" />
          </button>
          <button
            onClick={handleThemeToggle}
            className="p-1.5 text-slate-400 hover:text-ocean-600 hover:bg-ocean-50 rounded-lg transition-colors relative z-40"
            title={`Switch to ${isDarkTheme ? "Light" : "Dark"} Theme`}
          >
            {isDarkTheme ? (
              <Sun strokeWidth={1.5} className="w-4 h-4" />
            ) : (
              <Moon strokeWidth={1.5} className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={handleSave}
            disabled={!isDirty}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide transition-all ${
              isDirty
                ? "bg-ocean-600 text-white hover:bg-ocean-700 shadow-sm"
                : "bg-slate-50 text-slate-400 border border-slate-200"
            }`}
          >
            <Save strokeWidth={1.5} className="w-3.5 h-3.5" /> Save
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div
        className="relative flex-1 overflow-hidden bg-white"
        style={{ minHeight: 0 }}
      >
        <Editor
          key={filename} // Force remount on file change to ensure clean state and correct model
          height="100%"
          path={filename}
          language={getLanguage(filename)}
          value={editorValue}
          onChange={handleEditorChange}
          onMount={handleEditorDidMount}
          loading={
            <div className="flex items-center justify-center h-full text-slate-400 gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Loading Editor...</span>
            </div>
          }
          theme={isDarkTheme ? "gemini-dark" : "gemini-light"}
          options={{
            minimap: {
              enabled: minimapEnabled,
              side: "right",
              showSlider: "always",
              renderCharacters: true,
              maxColumn: 120,
            },
            scrollBeyondLastLine: false,
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', 'Consolas', monospace",
            fontLigatures: true,
            wordWrap: "on",
            automaticLayout: true,
            lineNumbers: "on",
            renderLineHighlight: "all",
            selectOnLineNumbers: true,
            roundedSelection: false,
            readOnly: false,
            cursorStyle: "line",
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
            tabSize: 2,
            insertSpaces: true,
            detectIndentation: false,
            trimAutoWhitespace: true,
            formatOnPaste: true,
            formatOnType: false,
            bracketPairColorization: {
              enabled: true,
            },
            suggest: {
              showKeywords: true,
              showSnippets: true,
            },
            quickSuggestions: {
              other: true,
              comments: false,
              strings: true,
            },
            acceptSuggestionOnEnter: "on",
            tabCompletion: "on",
            wordBasedSuggestions: "allDocuments",
            parameterHints: {
              enabled: true,
            },
            hover: {
              enabled: true,
            },
            links: true,
            colorDecorators: true,
            folding: true,
            foldingStrategy: "auto",
            showFoldingControls: "always",
            unfoldOnClickAfterEndOfLine: false,
            matchBrackets: "always",
            renderWhitespace: "selection",
            renderControlCharacters: false,
            guides: {
              indentation: true,
              bracketPairs: true,
              highlightActiveIndentation: true,
            },
            rulers: [],
            codeLens: false,
            scrollbar: {
              vertical: "auto",
              horizontal: "auto",
              useShadows: false,
              verticalHasArrows: false,
              horizontalHasArrows: false,
              verticalScrollbarSize: 10,
              horizontalScrollbarSize: 10,
            },
            overviewRulerLanes: 0,
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            fixedOverflowWidgets: false,
            contextmenu: true,
            mouseWheelZoom: false,
            multiCursorModifier: "ctrlCmd",
            accessibilitySupport: "auto",
            inlineSuggest: {
              enabled: true,
            },
            padding: {
              top: 16,
              bottom: 16,
            },
            lineHeight: 1.6,
            letterSpacing: 0.5,
          }}
        />
      </div>

      {/* Status Bar */}
      <div className="h-8 bg-white border-t border-slate-100 flex items-center justify-between px-6 text-[10px] font-bold text-slate-400 font-mono select-none uppercase tracking-wider relative z-20 shrink-0">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 text-slate-500">
            <Terminal strokeWidth={1.5} className="w-3 h-3" />
            {getLanguage(filename)}
          </span>
          <span className="text-slate-200">|</span>
          <span>UTF-8</span>
          <span className="text-slate-200">|</span>
          <span>
            {editorRef.current?.getModel()?.getLineCount() || lineCount} lines
          </span>
          <span className="text-slate-200">|</span>
          <span>
            {(
              editorRef.current?.getModel()?.getValue().length || charCount
            ).toLocaleString()}{" "}
            chars
          </span>
          {editorRef.current?.getModel() &&
            editorRef.current.getSelection() && (
              <>
                <span className="text-slate-200">|</span>
                <span className="text-ocean-600">
                  {editorRef.current
                    ?.getModel()
                    ?.getValueInRange(editorRef.current.getSelection())
                    ?.length || 0}{" "}
                  selected
                </span>
              </>
            )}
        </div>
        <div className="flex items-center gap-4">
          {editorRef.current && (
            <span className="text-slate-400">
              Ln {editorRef.current.getPosition()?.lineNumber || 1}, Col{" "}
              {editorRef.current.getPosition()?.column || 1}
            </span>
          )}
          {modelName && (
            <>
              <div className="h-3 w-px bg-slate-200" />
              <span className="flex items-center gap-1.5 text-ocean-600 bg-ocean-50 px-2 py-0.5 rounded-full">
                <Cpu strokeWidth={1.5} className="w-3 h-3" /> {modelName}
              </span>
            </>
          )}
          {tokenCount !== undefined && tokenCount > 0 && (
            <>
              <div className="h-3 w-px bg-slate-200" />
              <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                <Coins strokeWidth={1.5} className="w-3 h-3" />{" "}
                {tokenCount.toLocaleString()}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
