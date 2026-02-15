import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, RefreshCw, Maximize2, Minimize2, Monitor, Smartphone, Tablet, AlertCircle, CheckCircle, X, Code2, Eye, Terminal as TerminalIcon, ChevronDown, ChevronUp, Gauge, Inspect } from 'lucide-react';

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

export const PreviewPanel: React.FC<PreviewPanelProps> = ({ files, activeFile, onClose }) => {
  const [previewMode, setPreviewMode] = useState<PreviewMode>('desktop');
  const [viewMode, setViewMode] = useState<ViewMode>('preview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [showConsole, setShowConsole] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [networkSpeed, setNetworkSpeed] = useState<'Fast' | 'Slow' | 'Offline'>('Fast');
  const [elementInfo, setElementInfo] = useState<{
    tagName: string;
    classes: string;
    id: string;
    styles: Record<string, string>;
  } | null>(null);
  const [showElementInspector, setShowElementInspector] = useState(false);
  
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const refreshTimerRef = useRef<NodeJS.Timeout>();

  // Device emulation presets
  const devicePresets = {
    'iPhone 14': { width: '375px', height: '667px' },
    'iPad': { width: '768px', height: '1024px' },
    'Desktop': { width: '100%', height: '100%' }
  };

  // Network throttling (simulated)
  const changeNetworkSpeed = (speed: 'Fast' | 'Slow' | 'Offline') => {
    setNetworkSpeed(speed);
    // In a real implementation, this would throttle network requests
    console.log(`Network speed set to: ${speed}`);
  };

  // Element inspector
  const inspectElement = useCallback((event: MouseEvent) => {
    if (!showElementInspector || !iframeRef.current) return;
    
    try {
      const iframe = iframeRef.current;
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) return;

      const element = iframeDoc.elementFromPoint(
        event.clientX - iframe.getBoundingClientRect().left,
        event.clientY - iframe.getBoundingClientRect().top
      );

      if (element) {
        const computedStyles = iframe.contentWindow?.getComputedStyle(element);
        if (computedStyles) {
          setElementInfo({
            tagName: element.tagName,
            classes: element.className || '',
            id: element.id || '',
            styles: {
              width: computedStyles.width,
              height: computedStyles.height,
              margin: computedStyles.margin,
              padding: computedStyles.padding,
              backgroundColor: computedStyles.backgroundColor,
              color: computedStyles.color
            }
          });
        }
      }
    } catch (err) {
      // Cross-origin restrictions may prevent inspection
      console.warn('Element inspection failed (cross-origin):', err);
    }
  }, [showElementInspector]);

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

      // If we have React/JSX code, try to compile it
      if (js.includes('React') || js.includes('jsx') || js.includes('tsx')) {
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
  ${html}
  
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
      
      // Transform JSX elements to React.createElement calls
      // This is a simplified version - real JSX compilation is much more complex
      transformed = transformed.replace(
        /<(\w+)([^>]*)>(.*?)<\/\1>/gs,
        (_, tag, attrs, children) => {
          const props = attrs.trim() ? `{${attrs}}` : 'null';
          return `React.createElement('${tag}', ${props}, '${children}')`;
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
  
  // Auto-refresh when files change
  useEffect(() => {
    // Only refresh if we have files and iframe is ready
    if (!iframeRef.current || !files || Object.keys(files).length === 0) {
      return;
    }

    // Create a stable string representation of files to detect changes
    const filesString = JSON.stringify(files);
    
    // Only refresh if files actually changed
    if (filesString === prevFilesRef.current) {
      return;
    }
    
    // Update ref BEFORE any async operations to prevent race conditions
    prevFilesRef.current = filesString;

    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
    }

    refreshTimerRef.current = setTimeout(() => {
      setIsRefreshing(true);
      setConsoleLogs([]);
      
      if (iframeRef.current) {
        // Generate HTML directly here to avoid dependency issues
        try {
          let html = '';
          let css = '';
          let js = '';

          if (files && typeof files === 'object') {
            Object.values(files).forEach((file: any) => {
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
                js += content
                  .replace(/:\s*\w+(\[\])?(?=\s*[,;=)\]])/g, '')
                  .replace(/interface\s+\w+\s*{[^}]*}/g, '')
                  .replace(/type\s+\w+\s*=\s*[^;]+;/g, '');
              }
            });
          }

          if (js.includes('React') || js.includes('jsx') || js.includes('tsx')) {
            // Simple JSX to JS compiler (basic transformation)
            try {
              let transformed = js;
              transformed = transformed.replace(
                /<(\w+)([^>]*)>(.*?)<\/\1>/gs,
                (_, tag, attrs, children) => {
                  const props = attrs.trim() ? `{${attrs}}` : 'null';
                  return `React.createElement('${tag}', ${props}, '${children}')`;
                }
              );
              js = transformed;
            } catch (err) {
              console.error('JSX compilation error:', err);
            }
          }

          const previewDoc = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview</title>
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
  ${html}
  
  <script>
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

          const blob = new Blob([previewDoc], { type: 'text/html' });
          const url = URL.createObjectURL(blob);
          
          iframeRef.current.src = url;
          
          setTimeout(() => {
            setIsRefreshing(false);
            URL.revokeObjectURL(url);
          }, 300);
        } catch (err: any) {
          setIsRefreshing(false);
          setError(`Preview error: ${err.message}`);
        }
      }
    }, 500); // Debounce 500ms

    return () => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
    };
  }, [files]);

  const refreshPreview = useCallback(() => {
    setIsRefreshing(true);
    setConsoleLogs([]);
    
    if (iframeRef.current) {
      const previewHTML = generatePreviewHTML();
      const blob = new Blob([previewHTML], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      iframeRef.current.src = url;
      
      setTimeout(() => {
        setIsRefreshing(false);
        URL.revokeObjectURL(url);
      }, 300);
    }
  }, [generatePreviewHTML]);

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
          <span className="text-sm text-white">Live Preview</span>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); setIsCollapsed(!isCollapsed); }}
          className="p-1 rounded hover:bg-slate-800/50 transition-colors"
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
                <div className="flex gap-1 ml-4 bg-slate-800 p-1 rounded-lg">
                  <button
                    onClick={(e) => { e.stopPropagation(); setViewMode('preview'); }}
                    className={`px-3 py-1.5 rounded-md text-xs transition-all ${
                      viewMode === 'preview' 
                        ? 'bg-slate-900 text-white shadow-sm' 
                        : 'text-white hover:bg-slate-700'
                    }`}
                  >
                    Preview
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setViewMode('split'); }}
                    className={`px-3 py-1.5 rounded-md text-xs transition-all ${
                      viewMode === 'split' 
                        ? 'bg-slate-900 text-white shadow-sm' 
                        : 'text-white hover:bg-slate-700'
                    }`}
                  >
                    Split
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); setViewMode('code'); }}
                    className={`px-3 py-1.5 rounded-md text-xs transition-all ${
                      viewMode === 'code' 
                        ? 'bg-slate-900 text-white shadow-sm' 
                        : 'text-white hover:bg-slate-700'
                    }`}
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
                  onClick={(e) => { e.stopPropagation(); setShowElementInspector(!showElementInspector); }}
                  className={`rounded-lg transition-colors w-9 h-9 flex items-center justify-center relative ${
                    showElementInspector 
                      ? 'text-white bg-slate-800/50' 
                      : 'text-white hover:bg-slate-800/50'
                  }`}
                  title="Element Inspector"
                  style={{ willChange: 'background-color' }}
                >
                  <Inspect size={16} strokeWidth={2} className="text-white" />
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
          <div className="flex-1 flex overflow-hidden">
            {/* Preview Area */}
            <div className={`flex-1 flex items-center justify-center bg-slate-900 p-6 overflow-auto relative ${
              viewMode === 'code' ? 'hidden' : ''
            }`}>
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
                  sandbox="allow-scripts allow-forms"
                  title="Preview"
                  onClick={showElementInspector ? (e) => inspectElement(e.nativeEvent) : undefined}
                  style={{ cursor: showElementInspector ? 'crosshair' : 'default' }}
                />
              </div>

              {/* Element Inspector Info Panel */}
              {showElementInspector && elementInfo && (
                <div className="absolute top-4 right-4 bg-slate-800 border border-slate-700 rounded-lg p-4 max-w-xs shadow-2xl z-10">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                      <Inspect className="w-3.5 h-3.5" />
                      Element Info
                    </h4>
                    <button
                      onClick={() => {
                        setElementInfo(null);
                        setShowElementInspector(false);
                      }}
                      className="text-slate-400 hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-slate-400">Tag:</span>
                      <span className="text-slate-200 ml-2 font-mono">{elementInfo.tagName}</span>
                    </div>
                    {elementInfo.id && (
                      <div>
                        <span className="text-slate-400">ID:</span>
                        <span className="text-slate-200 ml-2 font-mono">{elementInfo.id}</span>
                      </div>
                    )}
                    {elementInfo.classes && (
                      <div>
                        <span className="text-slate-400">Classes:</span>
                        <span className="text-slate-200 ml-2 font-mono">{elementInfo.classes}</span>
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-700">
                      <span className="text-slate-400 block mb-1">Styles:</span>
                      <pre className="text-[10px] text-slate-300 font-mono bg-slate-900 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(elementInfo.styles, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Code View (if split or code mode) */}
            {(viewMode === 'split' || viewMode === 'code') && (
              <div className="flex-1 bg-slate-950 overflow-auto">
                <div className="p-4 font-mono text-sm text-slate-300">
                  <pre className="whitespace-pre-wrap">{generatePreviewHTML()}</pre>
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
};
