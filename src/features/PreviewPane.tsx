import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  RefreshCw,
  Maximize2,
  Minimize2,
  Download,
  Copy,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { FileData } from "@/types";
import { EmptyFilePreview } from "@/components/panels/EmptyFilePreview";

interface PreviewPaneProps {
  files: Record<string, FileData>;
  activeFile: string | null;
}

export const PreviewPane: React.FC<PreviewPaneProps> = ({
  files,
  activeFile,
}) => {
  const [output, setOutput] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"html" | "react" | "console">(
    "html",
  );
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [logs, setLogs] = useState<
    Array<{
      type: "log" | "error" | "warn";
      message: string;
      timestamp: number;
    }>
  >([]);
  const [iframeContent, setIframeContent] = useState<string>("");
  const [isCollapsed, setIsCollapsed] = useState(false);

  const runCode = async () => {
    setIsRunning(true);
    setError(null);
    setOutput("");
    setLogs([]);

    try {
      if (!activeFile || !files[activeFile]) {
        throw new Error("No active file to preview");
      }

      const file = files[activeFile];
      const ext = activeFile.split(".").pop()?.toLowerCase();

      // HTML Preview
      if (ext === "html") {
        setPreviewMode("html");
        const htmlContent = file.content;

        // Inject console capture script
        const enhancedHtml = htmlContent.replace(
          "</head>",
          `<script>
            window.parent.postMessage({ type: 'ready' }, '*');
            const originalConsole = {
              log: console.log,
              error: console.error,
              warn: console.warn
            };
            console.log = (...args) => {
              originalConsole.log(...args);
              window.parent.postMessage({ type: 'log', level: 'log', message: args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ') }, '*');
            };
            console.error = (...args) => {
              originalConsole.error(...args);
              window.parent.postMessage({ type: 'log', level: 'error', message: args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ') }, '*');
            };
            console.warn = (...args) => {
              originalConsole.warn(...args);
              window.parent.postMessage({ type: 'log', level: 'warn', message: args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ') }, '*');
            };
            window.onerror = (msg, url, line, col, error) => {
              window.parent.postMessage({ type: 'log', level: 'error', message: \`Error: \${msg} at line \${line}\` }, '*');
            };
          </script></head>`,
        );

        setIframeContent(enhancedHtml);
        setOutput("HTML rendered successfully");
      }
      // React/JSX Preview
      else if (ext === "jsx" || ext === "tsx") {
        setPreviewMode("react");

        const reactCode = file.content;
        const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>body { margin: 0; padding: 20px; font-family: system-ui; }</style>
</head>
<body>
  <div id="root"></div>
  <script type="text/babel">
    ${reactCode}
    
    const rootElement = document.getElementById('root');
    const root = ReactDOM.createRoot(rootElement);
    
    // Try to find and render the default export or first component
    const componentName = Object.keys(window).find(key => 
      typeof window[key] === 'function' && 
      /^[A-Z]/.test(key) &&
      !['React', 'ReactDOM'].includes(key)
    );
    
    if (componentName) {
      const Component = window[componentName];
      root.render(React.createElement(Component));
      window.parent.postMessage({ type: 'log', level: 'log', message: 'Component rendered: ' + componentName }, '*');
    } else if (typeof App !== 'undefined') {
      root.render(React.createElement(App));
    } else {
      document.getElementById('root').innerHTML = '<div style="color: red;">No React component found. Export a component or create an App component.</div>';
    }
  </script>
  <script>
    window.onerror = (msg, url, line, col, error) => {
      window.parent.postMessage({ type: 'log', level: 'error', message: \`Error: \${msg} at line \${line}\` }, '*');
    };
  </script>
</body>
</html>`;

        setIframeContent(htmlTemplate);
        setOutput("React component rendered");
      }
      // JavaScript Console Preview
      else if (ext === "js" || ext === "ts") {
        setPreviewMode("console");

        const jsCode = file.content;
        const capturedLogs: Array<{
          type: "log" | "error" | "warn";
          message: string;
        }> = [];

        // Create isolated console
        const mockConsole = {
          log: (...args: any[]) => {
            const message = args
              .map((a) =>
                typeof a === "object" ? JSON.stringify(a, null, 2) : String(a),
              )
              .join(" ");
            capturedLogs.push({ type: "log", message });
          },
          error: (...args: any[]) => {
            const message = args
              .map((a) =>
                typeof a === "object" ? JSON.stringify(a, null, 2) : String(a),
              )
              .join(" ");
            capturedLogs.push({ type: "error", message });
          },
          warn: (...args: any[]) => {
            const message = args
              .map((a) =>
                typeof a === "object" ? JSON.stringify(a, null, 2) : String(a),
              )
              .join(" ");
            capturedLogs.push({ type: "warn", message });
          },
        };

        try {
          // Execute code with mocked console
          const func = new Function("console", jsCode);
          func(mockConsole);

          setLogs(
            capturedLogs.map((log, i) => ({
              ...log,
              timestamp: Date.now() + i,
            })),
          );

          setOutput(`Executed successfully. ${capturedLogs.length} log(s)`);
        } catch (err: any) {
          setLogs([
            {
              type: "error",
              message: err.message || String(err),
              timestamp: Date.now(),
            },
          ]);
          throw err;
        }
      }
      // CSS Preview
      else if (ext === "css") {
        const cssContent = file.content;
        const htmlTemplate = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${cssContent}</style>
</head>
<body>
  <h1>CSS Preview</h1>
  <p>This is a paragraph to test your CSS.</p>
  <button>Button</button>
  <div class="container">
    <div class="box">Box 1</div>
    <div class="box">Box 2</div>
  </div>
</body>
</html>`;

        setIframeContent(htmlTemplate);
        setOutput("CSS applied to preview");
      } else {
        throw new Error(
          `Preview not supported for .${ext} files. Supported: html, jsx, tsx, js, ts, css`,
        );
      }
    } catch (err: any) {
      setError(err.message || "Unknown error");
      console.error("Preview error:", err);
    } finally {
      setIsRunning(false);
    }
  };

  // Listen for iframe messages
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "log") {
        setLogs((prev) => [
          ...prev,
          {
            type: event.data.level,
            message: event.data.message,
            timestamp: Date.now(),
          },
        ]);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Auto-run on file change
  useEffect(() => {
    if (activeFile && files[activeFile]) {
      const ext = activeFile.split(".").pop()?.toLowerCase();
      if (["html", "jsx", "tsx", "js", "ts", "css"].includes(ext || "")) {
        runCode();
      }
    }
  }, [activeFile, files]);

  const handleRefresh = () => {
    runCode();
  };

  const handleDownloadHtml = () => {
    if (!activeFile || !files[activeFile]) return;

    const blob = new Blob([files[activeFile].content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeFile;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyOutput = () => {
    if (logs.length > 0) {
      const text = logs
        .map((l) => `[${l.type.toUpperCase()}] ${l.message}`)
        .join("\n");
      navigator.clipboard.writeText(text);
    }
  };

  const handleOpenInNewTab = () => {
    if (!activeFile || !files[activeFile]) return;

    const blob = new Blob([files[activeFile].content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <div
      className={`flex flex-col h-full bg-slate-900 ${isFullscreen ? "fixed inset-0 z-[9999]" : ""}`}
    >
      {/* Title Bar - Always Visible */}
      <div
        className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800/60 cursor-pointer hover:bg-slate-900/50 transition-colors shrink-0"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <Play className="w-4 h-4 text-white" />
          <h3 className="text-sm text-white">Live Preview</h3>
          {activeFile && (
            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded">
              {activeFile.split("/").pop()}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsCollapsed(!isCollapsed);
            }}
            className="p-1 rounded hover:bg-slate-800/50 transition-colors"
          >
            {isCollapsed ? (
              <ChevronDown size={16} className="text-white" />
            ) : (
              <ChevronUp size={16} className="text-white" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      {!isCollapsed && (
        <>
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800/60 shrink-0">
            <div className="flex items-center gap-2">
              {previewMode !== "console" && (
                <>
                  <button
                    onClick={handleRefresh}
                    disabled={isRunning}
                    className="p-1.5 hover:bg-slate-800 rounded transition-colors disabled:opacity-50"
                    title="Refresh preview"
                  >
                    <RefreshCw
                      className={`w-4 h-4 text-white ${isRunning ? "animate-spin" : ""}`}
                    />
                  </button>

                  <button
                    onClick={handleDownloadHtml}
                    className="p-1.5 hover:bg-slate-800 rounded transition-colors"
                    title="Download file"
                  >
                    <Download className="w-4 h-4 text-white" />
                  </button>

                  <button
                    onClick={handleOpenInNewTab}
                    className="p-1.5 hover:bg-slate-800 rounded transition-colors"
                    title="Open in new tab"
                  >
                    <ExternalLink className="w-4 h-4 text-white" />
                  </button>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {logs.length > 0 && (
                <button
                  onClick={handleCopyOutput}
                  className="p-1.5 hover:bg-slate-800 rounded transition-colors"
                  title="Copy console output"
                >
                  <Copy className="w-4 h-4 text-slate-400" />
                </button>
              )}

              <button
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 hover:bg-slate-800 rounded transition-colors"
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4 text-slate-400" />
                ) : (
                  <Maximize2 className="w-4 h-4 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          {/* Status Bar */}
          {(output || error) && (
            <div
              className={`px-4 py-2 text-xs border-b shrink-0 ${
                error
                  ? "bg-red-900/30 border-red-800 text-red-300"
                  : "bg-emerald-900/30 border-emerald-800 text-emerald-300"
              }`}
            >
              <div className="flex items-center gap-2">
                {error ? (
                  <XCircle className="w-3.5 h-3.5" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span className="font-mono">{error || output}</span>
              </div>
            </div>
          )}

          {/* Preview Area */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {previewMode === "console" ? (
              <div className="flex-1 overflow-auto p-4 bg-slate-900 font-mono text-xs">
                {logs.length === 0 ? (
                  <div className="text-slate-500 text-center py-8">
                    No console output yet. Run the code to see results.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {logs.map((log, i) => (
                      <div
                        key={i}
                        className={`py-1 px-2 rounded ${
                          log.type === "error"
                            ? "text-red-400 bg-red-950/30"
                            : log.type === "warn"
                              ? "text-yellow-400 bg-yellow-950/30"
                              : "text-emerald-400"
                        }`}
                      >
                        <span className="text-slate-500 mr-2">
                          [{new Date(log.timestamp).toLocaleTimeString()}]
                        </span>
                        <span
                          className={`font-bold mr-2 ${
                            log.type === "error"
                              ? "text-red-500"
                              : log.type === "warn"
                                ? "text-yellow-500"
                                : "text-emerald-500"
                          }`}
                        >
                          {log.type.toUpperCase()}
                        </span>
                        <span className="whitespace-pre-wrap">
                          {log.message}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                className="w-full h-full bg-white border-0"
                sandbox="allow-scripts allow-forms allow-modals"
                srcDoc={iframeContent}
                title="Preview"
              />
            )}
          </div>

          {/* Console Panel (for non-console modes) */}
          {previewMode !== "console" && logs.length > 0 && (
            <div className="h-32 border-t border-slate-200 bg-slate-900 overflow-auto shrink-0">
              <div className="p-2 space-y-1 font-mono text-xs">
                {logs.map((log, i) => (
                  <div
                    key={i}
                    className={`py-1 px-2 rounded ${
                      log.type === "error"
                        ? "text-red-400 bg-red-950/30"
                        : log.type === "warn"
                          ? "text-yellow-400 bg-yellow-950/30"
                          : "text-emerald-400"
                    }`}
                  >
                    <span className="text-slate-500 mr-2">
                      [{new Date(log.timestamp).toLocaleTimeString()}]
                    </span>
                    <span
                      className={`font-bold mr-2 ${
                        log.type === "error"
                          ? "text-red-500"
                          : log.type === "warn"
                            ? "text-yellow-500"
                            : "text-emerald-500"
                      }`}
                    >
                      {log.type.toUpperCase()}
                    </span>
                    <span>{log.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {!activeFile && <EmptyFilePreview />}
        </>
      )}
    </div>
  );
};
