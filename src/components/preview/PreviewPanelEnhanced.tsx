/**
 * Enhanced Preview Panel
 * 
 * This is an enhanced version of PreviewPanel that can be enabled/disabled
 * via FEATURE_FLAGS.ENABLE_ENHANCED_PREVIEW.
 * 
 * Currently, this is identical to PreviewPanel, but can be extended with
 * additional features in the future.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, RefreshCw, Maximize2, Minimize2, Monitor, Smartphone, Tablet, AlertCircle, CheckCircle, X, Code2, Eye, Terminal as TerminalIcon, ChevronDown, ChevronUp, FileCode } from 'lucide-react';

interface PreviewPanelProps {
  files: Record<string, { name: string; content: string; language: string }>;
  activeFile?: string;
  onClose?: () => void;
}

type PreviewMode = 'desktop' | 'tablet' | 'mobile';
type ViewMode = 'preview' | 'split' | 'code';

interface ConsoleLog {
  type: 'log' | 'error' | 'warn' | 'info';
  message: string;
  timestamp: number;
}

// Helper to parse HTML attributes to React props
const parseAttributes = (attrs: string): string => {
  if (!attrs.trim()) return 'null';
  
  try {
    // Simple attribute parser - converts HTML attributes to object
    const props: Record<string, string> = {};
    const attrRegex = /(\w+)(?:=["']([^"']*)["'])?/g;
    let match;
    
    while ((match = attrRegex.exec(attrs)) !== null) {
      const key = match[1];
      const value = match[2] || 'true';
      // Convert className from class
      const propKey = key === 'class' ? 'className' : key;
      props[propKey] = value;
    }
    
    return JSON.stringify(props);
  } catch (e) {
    return 'null';
  }
};

export const PreviewPanelEnhanced: React.FC<PreviewPanelProps> = React.memo(({ files, activeFile, onClose }) => {
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [showConsole, setShowConsole] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentHtml, setCurrentHtml] = useState<string>('');
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout>();
  const isInitialLoadRef = useRef(true);
  const currentHtmlRef = useRef<string>('');

  // Generate preview HTML
  const generatePreviewHTML = useCallback(() => {
    try {
      let html = '';
      let css = '';
      let js = '';

      // Extract HTML, CSS, JS from files
      // Safety check: ensure files is an object
      if (!files || typeof files !== 'object') {
        return '<html><body><div style="padding: 20px; color: #666; font-family: monospace;">No files to preview</div></body></html>';
      }
      
      Object.values(files).forEach(file => {
        // Safety check: ensure file has required properties
        if (!file || typeof file !== 'object') return;
        
        const content = file.content || '';
        const fileName = file.name || '';
        const fileLanguage = file.language || '';
        
        if (fileLanguage === 'html' || fileName.endsWith('.html')) {
          html += content;
        } else if (fileLanguage === 'css' || fileName.endsWith('.css')) {
          css += content;
        } else if (fileLanguage === 'javascript' || fileLanguage === 'typescript' || 
                   fileName.endsWith('.js') || fileName.endsWith('.ts')) {
          // Remove TypeScript types for preview
          js += content
            .replace(/:\s*\w+(\[\])?(?=\s*[,;=)\]])/g, '') // Remove type annotations
            .replace(/interface\s+\w+\s*{[^}]*}/g, '') // Remove interfaces
            .replace(/type\s+\w+\s*=\s*[^;]+;/g, ''); // Remove type aliases
        }
      });

      // Check if we need React
      const needsReact = js.includes('React') || js.includes('jsx') || js.includes('tsx') || 
                        js.includes('React.createElement') || js.includes('createElement');

      // If we have React/JSX code, try to compile it
      if (needsReact) {
        js = compileJSX(js);
      }

      // Build complete HTML document
      const previewDoc = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
  ${needsReact ? `
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  ` : ''}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #d1d5db;
      padding: 20px;
    }
    ${css}
  </style>
</head>
<body>
  ${html || '<div id="root"></div>'}
  
  <script>
    // Capture console logs
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;
    
    window.addEventListener('error', (e) => {
      window.parent.postMessage({ 
        type: 'console', 
        level: 'error', 
        message: e.message + ' at ' + e.filename + ':' + e.lineno 
      }, '*');
    });

    console.log = function(...args) {
      originalLog.apply(console, args);
      window.parent.postMessage({ type: 'console', level: 'log', message: args.join(' ') }, '*');
    };

    console.error = function(...args) {
      originalError.apply(console, args);
      window.parent.postMessage({ type: 'console', level: 'error', message: args.join(' ') }, '*');
    };

    console.warn = function(...args) {
      originalWarn.apply(console, args);
      window.parent.postMessage({ type: 'console', level: 'warn', message: args.join(' ') }, '*');
    };

    console.info = function(...args) {
      originalInfo.apply(console, args);
      window.parent.postMessage({ type: 'console', level: 'info', message: args.join(' ') }, '*');
    };

    try {
      ${js}
    } catch (error) {
      console.error('Runtime error:', error.message);
    }
  </script>
</body>
</html>`;

      setError(null);
      return previewDoc;
    } catch (err: any) {
      const errorMsg = `Preview error: ${err.message}`;
      setError(errorMsg);
      return `<html><body><div style="padding: 20px; color: #dc2626; font-family: monospace;">${errorMsg}</div></body></html>`;
    }
  }, [files]);

  // Simple JSX to JS compiler (basic transformation)
  const compileJSX = (code: string): string => {
    try {
      // This is a very basic JSX transformation
      // In production, you'd use Babel or similar
      let transformed = code;
      
      // Remove TypeScript/JSX syntax that won't work in browser
      // Remove export/import statements (they're not needed in preview)
      transformed = transformed.replace(/export\s+(default\s+)?/g, '');
      transformed = transformed.replace(/import\s+.*?from\s+['"].*?['"];?\s*/g, '');
      
      // Transform JSX elements to React.createElement calls
      // Handle self-closing tags
      transformed = transformed.replace(
        /<(\w+)([^>]*)\s*\/>/g,
        (_, tag, attrs) => {
          const props = parseAttributes(attrs);
          return `React.createElement('${tag}', ${props})`;
        }
      );
      
      // Handle opening/closing tags (nested)
      transformed = transformed.replace(
        /<(\w+)([^>]*)>(.*?)<\/\1>/gs,
        (_, tag, attrs, children) => {
          const props = parseAttributes(attrs);
          // Try to parse children as JSX or keep as string
          const processedChildren = children.trim();
          const childrenCode = processedChildren.startsWith('<') 
            ? processedChildren // Will be processed recursively
            : `'${processedChildren.replace(/'/g, "\\'")}'`;
          return `React.createElement('${tag}', ${props}, ${childrenCode})`;
        }
      );

      return transformed;
    } catch (err) {
      console.error('JSX compilation error:', err);
      return code;
    }
  };

  // Track previous files to detect actual changes
  const prevFilesRef = useRef<string>('');
  
  // Load preview into iframe with proper cleanup
  const loadPreview = useCallback((htmlContent: string) => {
    if (!iframeRef.current) return;

    // Use srcDoc instead of blob URL to prevent white screen issues
    // srcDoc is more reliable and doesn't require URL management
    setIsRefreshing(true);
    setError(null);
    
    try {
      const iframe = iframeRef.current;
      
      // Set up load handler with fallback timer
      let fallbackTimer: NodeJS.Timeout;
      const handleLoad = () => {
        clearTimeout(fallbackTimer);
        setIsRefreshing(false);
      };

      // Fallback: if load event doesn't fire (rare), set refreshing to false after a delay
      fallbackTimer = setTimeout(() => {
        setIsRefreshing(false);
      }, 1000);
      
      // Remove any existing listeners first to prevent duplicates
      iframe.removeEventListener('load', handleLoad);
      iframe.addEventListener('load', handleLoad, { once: true });
      
      // Store current HTML for code view (both ref and state)
      currentHtmlRef.current = htmlContent;
      setCurrentHtml(htmlContent);
      
      // Set srcDoc directly - this is more stable than blob URLs
      // Setting srcdoc triggers the load event
      iframe.srcdoc = htmlContent;
    } catch (err: any) {
      setIsRefreshing(false);
      setError(`Preview error: ${err.message}`);
    }
  }, []);

  // Auto-refresh when files change
  useEffect(() => {
    // Initial load or refresh when files change
    const shouldLoad = isInitialLoadRef.current || (files && Object.keys(files).length > 0);
    
    if (!iframeRef.current || !shouldLoad) {
      // Even if we don't load the iframe, generate HTML for code view
      if (files && Object.keys(files).length > 0) {
        const previewHTML = generatePreviewHTML();
        currentHtmlRef.current = previewHTML;
        setCurrentHtml(previewHTML);
      }
      return;
    }

    // Create a stable string representation of files to detect changes
    const filesString = JSON.stringify(files);
    
    // Only refresh if files actually changed (skip on initial load)
    if (!isInitialLoadRef.current && filesString === prevFilesRef.current) {
      return;
    }
    
    // Update ref BEFORE any async operations to prevent race conditions
    prevFilesRef.current = filesString;
    isInitialLoadRef.current = false;

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = setTimeout(() => {
      setIsRefreshing(true);
      setConsoleLogs([]);
      setError(null);
      
      // Call generatePreviewHTML directly instead of using callback dependency
      const previewHTML = generatePreviewHTML();
      loadPreview(previewHTML);
    }, 500); // Debounce 500ms

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]); // Only depend on files, not the callbacks

  // No cleanup needed - srcDoc doesn't require URL management

  const refreshPreview = useCallback(() => {
    setIsRefreshing(true);
    setConsoleLogs([]);
    setError(null);
    
    const previewHTML = generatePreviewHTML();
    currentHtmlRef.current = previewHTML;
    setCurrentHtml(previewHTML);
    
    if (iframeRef.current) {
      loadPreview(previewHTML);
    }
  }, [generatePreviewHTML, loadPreview]);

  // Handle console messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'console') {
        const log: ConsoleLog = {
          type: event.data.level,
          message: event.data.message,
          timestamp: Date.now()
        };
        setConsoleLogs(prev => [...prev.slice(-99), log]); // Keep last 100 logs
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getPreviewWidth = () => {
    switch (previewMode) {
      case 'mobile': return '375px';
      case 'tablet': return '768px';
      case 'desktop': return '100%';
    }
  };

  const getConsoleIcon = (type: ConsoleLog['type']) => {
    switch (type) {
      case 'error': return <AlertCircle size={14} className="text-red-500" />;
      case 'warn': return <AlertCircle size={14} className="text-yellow-500" />;
      case 'info': return <CheckCircle size={14} className="text-blue-500" />;
      default: return <TerminalIcon size={14} className="text-slate-400" />;
    }
  };

  return (
    <div className={`flex flex-col h-full bg-slate-900 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Title Bar - Always Visible */}
      <div 
        className="flex items-center justify-between px-4 py-2.5 bg-slate-950 border-b border-slate-800/60 cursor-pointer hover:bg-slate-900/50 transition-colors shrink-0"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-white" />
          <span className="text-sm text-white">Live Preview (Enhanced)</span>
        </div>
        <button 
          onClick={(e) => { 
            e.stopPropagation(); 
            e.preventDefault();
            setIsCollapsed(prev => !prev); 
          }}
          className="p-1 rounded hover:bg-slate-800/50 transition-colors"
          type="button"
        >
          {isCollapsed ? (
            <ChevronDown size={16} className="text-white" />
          ) : (
            <ChevronUp size={16} className="text-white" />
          )}
        </button>
      </div>
      
      {/* Collapsible Content */}
      {!isCollapsed && (
        <>
          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-slate-800/60 bg-slate-950 shrink-0">
            <div className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                {/* View Mode Selector */}
                <div className="flex gap-1 bg-slate-800 p-1 rounded-lg">
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      e.preventDefault();
                      setViewMode('preview'); 
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs transition-colors min-w-[60px] text-center ${
                      viewMode === 'preview' 
                        ? 'bg-slate-900 text-white' 
                        : 'text-white hover:bg-slate-700'
                    }`}
                    style={{ willChange: 'background-color' }}
                    type="button"
                  >
                    Preview
                  </button>
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      e.preventDefault();
                      setViewMode('split'); 
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs transition-colors min-w-[60px] text-center ${
                      viewMode === 'split' 
                        ? 'bg-slate-900 text-white' 
                        : 'text-white hover:bg-slate-700'
                    }`}
                    style={{ willChange: 'background-color' }}
                    type="button"
                  >
                    Split
                  </button>
                  <button
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      e.preventDefault();
                      setViewMode('code'); 
                    }}
                    className={`px-3 py-1.5 rounded-md text-xs transition-colors min-w-[60px] text-center ${
                      viewMode === 'code' 
                        ? 'bg-slate-900 text-white' 
                        : 'text-white hover:bg-slate-700'
                    }`}
                    style={{ willChange: 'background-color' }}
                    type="button"
                  >
                    Code
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Device Mode Selector */}
                <div className="flex gap-1 bg-slate-800 p-1 rounded-lg">
                  <button
                    onClick={(e) => { e.stopPropagation(); setPreviewMode('desktop'); }}
                    className={`rounded-md transition-colors w-9 h-9 flex items-center justify-center ${
                      previewMode === 'desktop' 
                        ? 'bg-slate-900 text-white' 
                        : 'text-white hover:bg-slate-700'
                    }`}
                    title="Desktop"
                    style={{ willChange: 'background-color' }}
                  >
                    <Monitor size={16} strokeWidth={2} className="text-white" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setPreviewMode('tablet'); }}
                    className={`rounded-md transition-colors w-9 h-9 flex items-center justify-center ${
                      previewMode === 'tablet' 
                        ? 'bg-slate-900 text-white' 
                        : 'text-white hover:bg-slate-700'
                    }`}
                    title="Tablet"
                    style={{ willChange: 'background-color' }}
                  >
                    <Tablet size={16} strokeWidth={2} className="text-white" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setPreviewMode('mobile'); }}
                    className={`rounded-md transition-colors w-9 h-9 flex items-center justify-center ${
                      previewMode === 'mobile' 
                        ? 'bg-slate-900 text-white' 
                        : 'text-white hover:bg-slate-700'
                    }`}
                    title="Mobile"
                    style={{ willChange: 'background-color' }}
                  >
                    <Smartphone size={16} strokeWidth={2} className="text-white" />
                  </button>
                </div>

                <div className="w-px h-6 bg-slate-700" />

                {/* Actions */}
                <button
                  onClick={(e) => { e.stopPropagation(); refreshPreview(); }}
                  disabled={isRefreshing}
                  className="text-white hover:bg-slate-800/50 rounded-lg transition-colors disabled:opacity-50 w-9 h-9 flex items-center justify-center"
                  title="Refresh (auto-refreshes on change)"
                  style={{ willChange: 'background-color' }}
                >
                  <RefreshCw size={16} strokeWidth={2} className={`text-white ${isRefreshing ? 'animate-spin' : ''}`} />
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); setShowConsole(!showConsole); }}
                  className={`rounded-lg transition-colors w-9 h-9 flex items-center justify-center relative ${
                    showConsole 
                      ? 'text-white bg-slate-800/50' 
                      : 'text-white hover:bg-slate-800/50'
                  }`}
                  title="Toggle Console"
                  style={{ willChange: 'background-color' }}
                >
                  <TerminalIcon size={16} strokeWidth={2} className="text-white" />
                  {consoleLogs.length > 0 && (
                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
                  className="text-white hover:bg-slate-800/50 rounded-lg transition-colors w-9 h-9 flex items-center justify-center"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
                  style={{ willChange: 'background-color' }}
                >
                  {isFullscreen ? <Minimize2 size={16} strokeWidth={2} className="text-white" /> : <Maximize2 size={16} strokeWidth={2} className="text-white" />}
                </button>

                {onClose && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onClose(); }}
                    className="text-white hover:bg-red-900/50 rounded-lg transition-colors w-9 h-9 flex items-center justify-center"
                    title="Close Preview"
                    style={{ willChange: 'background-color' }}
                  >
                    <X size={16} strokeWidth={2} className="text-white" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="px-4 py-3 bg-red-900/30 border-b border-red-800 flex items-start gap-3">
              <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-red-200">Preview Error</p>
                <p className="text-xs text-red-300 mt-1 font-mono">{error}</p>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 flex overflow-hidden" style={{ minHeight: 0 }}>
            {/* Preview Area - Always render but hide when in code-only mode */}
            <div 
              className={`flex-1 flex items-center justify-center bg-slate-900 p-6 overflow-auto ${
                viewMode === 'code' ? 'hidden' : viewMode === 'split' ? 'border-r border-slate-800' : ''
              }`}
              style={{ 
                display: viewMode === 'code' ? 'none' : 'flex',
                minWidth: viewMode === 'split' ? '50%' : 'auto',
                maxWidth: viewMode === 'split' ? '50%' : 'none'
              }}
            >
              <div 
                className="bg-slate-950 rounded-lg shadow-2xl overflow-hidden transition-all duration-300 border border-slate-700/40"
                style={{ 
                  width: getPreviewWidth(),
                  height: previewMode === 'mobile' ? '667px' : '100%',
                  maxHeight: '100%',
                  boxShadow: '0 20px 60px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05)'
                }}
              >
                <iframe
                  ref={iframeRef}
                  className="w-full h-full border-0 bg-[#d1d5db]"
                  sandbox="allow-scripts allow-forms allow-modals"
                  title="Preview"
                  key="preview-iframe"
                />
              </div>
            </div>

            {/* Code View (if split or code mode) */}
            {(viewMode === 'split' || viewMode === 'code') && (
              <div 
                className={`flex-1 bg-slate-950 overflow-hidden ${viewMode === 'code' ? '' : 'border-l border-slate-800'}`}
                style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}
              >
                {/* Code View Header */}
                <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 shrink-0">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <FileCode size={14} className="text-slate-500" />
                    <span className="font-medium">HTML Source</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-500">
                      {(currentHtml || currentHtmlRef.current || generatePreviewHTML()).split('\n').length} lines
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const code = currentHtml || currentHtmlRef.current || generatePreviewHTML();
                      navigator.clipboard.writeText(code);
                    }}
                    className="px-2 py-1 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                    title="Copy code"
                  >
                    Copy
                  </button>
                </div>
                
                {/* Code Content with Structured Display */}
                <div className="flex-1 overflow-auto" style={{ minHeight: 0 }}>
                  <div className="p-4 font-mono text-sm text-slate-300">
                    <pre className="whitespace-pre-wrap break-words text-xs leading-relaxed">
                      <code className="block text-slate-300">
                        {(() => {
                          const html = currentHtml || currentHtmlRef.current || generatePreviewHTML();
                          // Escape HTML for safe display
                          return html
                            .replace(/&/g, '&amp;')
                            .replace(/</g, '&lt;')
                            .replace(/>/g, '&gt;')
                            .replace(/"/g, '&quot;')
                            .replace(/'/g, '&apos;');
                        })()}
                      </code>
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Console */}
          {showConsole && (
            <div className="h-48 border-t border-slate-700 bg-slate-950 flex flex-col">
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <TerminalIcon size={14} className="text-white" />
                  <span>Console</span>
                  {consoleLogs.length > 0 && (
                    <span className="text-xs text-slate-500">({consoleLogs.length})</span>
                  )}
                </div>
                <button
                  onClick={() => setConsoleLogs([])}
                  className="text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Clear
                </button>
              </div>
              <div className="flex-1 overflow-auto p-2 space-y-1">
                {consoleLogs.length === 0 ? (
                  <div className="text-slate-500 text-xs text-center py-8">
                    Console is empty
                  </div>
                ) : (
                  consoleLogs.map((log, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-2 px-2 py-1 hover:bg-slate-900 rounded font-mono text-xs"
                    >
                      {getConsoleIcon(log.type)}
                      <span className={`flex-1 ${
                        log.type === 'error' ? 'text-red-400' :
                        log.type === 'warn' ? 'text-yellow-400' :
                        log.type === 'info' ? 'text-blue-400' :
                        'text-slate-300'
                      }`}>
                        {log.message}
                      </span>
                      <span className="text-slate-500 text-[10px]">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
});

PreviewPanelEnhanced.displayName = 'PreviewPanelEnhanced';
