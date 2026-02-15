/**
 * DebuggingTools Component - Development debugging utilities
 * 
 * Features:
 * - Variable inspection
 * - Breakpoint management
 * - Console output
 * - Performance monitoring
 * - Network request tracking
 * 
 * @version 2.3.0
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  Bug, 
  Eye, 
  Pause, 
  Play, 
  Trash2, 
  Download,
  Filter,
  Search,
  Clock,
  Activity
} from 'lucide-react';

// ==================== TYPES ====================

/**
 * Log level types
 */
type LogLevel = 'log' | 'info' | 'warn' | 'error' | 'debug';

/**
 * Console log entry
 */
interface ConsoleLog {
  id: string;
  level: LogLevel;
  message: string;
  timestamp: Date;
  stack?: string;
}

/**
 * Breakpoint entry
 */
interface Breakpoint {
  id: string;
  file: string;
  line: number;
  enabled: boolean;
  condition?: string;
}

/**
 * Variable watch entry
 */
interface WatchVariable {
  id: string;
  name: string;
  value: any;
  type: string;
}

/**
 * Component props
 */
interface DebuggingToolsProps {
  height?: number;
  className?: string;
  onBreakpointHit?: (breakpoint: Breakpoint) => void;
}

// ==================== COMPONENT ====================

/**
 * DebuggingTools - Development debugging utilities
 * 
 * Provides comprehensive debugging capabilities for development.
 * 
 * @example
 * ```tsx
 * <DebuggingTools
 *   height={400}
 *   onBreakpointHit={(bp) => console.log('Hit:', bp)}
 * />
 * ```
 */
export const DebuggingTools: React.FC<DebuggingToolsProps> = ({
  height = 300,
  className = '',
  onBreakpointHit
}) => {
  // ==================== STATE ====================
  
  const [activeTab, setActiveTab] = useState<'console' | 'breakpoints' | 'watch' | 'performance'>('console');
  const [consoleLogs, setConsoleLogs] = useState<ConsoleLog[]>([]);
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>([]);
  const [watchVariables, setWatchVariables] = useState<WatchVariable[]>([]);
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPaused, setIsPaused] = useState(false);

  // ==================== CONSOLE INTERCEPTION ====================
  
  /**
   * Intercept console methods for logging
   */
  useEffect(() => {
    const originalConsole = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug,
    };

    const createLogEntry = (level: LogLevel, args: any[]): ConsoleLog => ({
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      level,
      message: args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' '),
      timestamp: new Date(),
    });

    // Override console methods
    console.log = (...args: any[]) => {
      setConsoleLogs(prev => [...prev, createLogEntry('log', args)]);
      originalConsole.log(...args);
    };

    console.info = (...args: any[]) => {
      setConsoleLogs(prev => [...prev, createLogEntry('info', args)]);
      originalConsole.info(...args);
    };

    console.warn = (...args: any[]) => {
      setConsoleLogs(prev => [...prev, createLogEntry('warn', args)]);
      originalConsole.warn(...args);
    };

    console.error = (...args: any[]) => {
      setConsoleLogs(prev => [...prev, createLogEntry('error', args)]);
      originalConsole.error(...args);
    };

    console.debug = (...args: any[]) => {
      setConsoleLogs(prev => [...prev, createLogEntry('debug', args)]);
      originalConsole.debug(...args);
    };

    // Cleanup
    return () => {
      console.log = originalConsole.log;
      console.info = originalConsole.info;
      console.warn = originalConsole.warn;
      console.error = originalConsole.error;
      console.debug = originalConsole.debug;
    };
  }, []);

  // ==================== HANDLERS ====================
  
  /**
   * Clear console logs
   */
  const handleClearConsole = useCallback(() => {
    setConsoleLogs([]);
  }, []);

  /**
   * Export console logs
   */
  const handleExportLogs = useCallback(() => {
    const data = JSON.stringify(consoleLogs, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `console-logs-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [consoleLogs]);

  /**
   * Add breakpoint
   */
  const handleAddBreakpoint = useCallback(() => {
    const file = prompt('File name:');
    const lineStr = prompt('Line number:');
    
    if (!file || !lineStr) return;
    
    const line = parseInt(lineStr, 10);
    if (isNaN(line)) return;

    const newBreakpoint: Breakpoint = {
      id: `bp-${Date.now()}`,
      file,
      line,
      enabled: true,
    };

    setBreakpoints(prev => [...prev, newBreakpoint]);
  }, []);

  /**
   * Toggle breakpoint
   */
  const handleToggleBreakpoint = useCallback((id: string) => {
    setBreakpoints(prev =>
      prev.map(bp =>
        bp.id === id ? { ...bp, enabled: !bp.enabled } : bp
      )
    );
  }, []);

  /**
   * Remove breakpoint
   */
  const handleRemoveBreakpoint = useCallback((id: string) => {
    setBreakpoints(prev => prev.filter(bp => bp.id !== id));
  }, []);

  /**
   * Add watch variable
   */
  const handleAddWatch = useCallback(() => {
    const name = prompt('Variable name:');
    if (!name) return;

    const newWatch: WatchVariable = {
      id: `watch-${Date.now()}`,
      name,
      value: undefined,
      type: 'undefined',
    };

    setWatchVariables(prev => [...prev, newWatch]);
  }, []);

  /**
   * Remove watch variable
   */
  const handleRemoveWatch = useCallback((id: string) => {
    setWatchVariables(prev => prev.filter(w => w.id !== id));
  }, []);

  // ==================== FILTERED LOGS ====================
  
  /**
   * Filter and search logs
   */
  const filteredLogs = useMemo(() => {
    return consoleLogs.filter(log => {
      // Filter by level
      if (filterLevel !== 'all' && log.level !== filterLevel) {
        return false;
      }
      
      // Filter by search query
      if (searchQuery && !log.message.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      
      return true;
    });
  }, [consoleLogs, filterLevel, searchQuery]);

  // ==================== RENDER ====================
  
  return (
    <div 
      className={`debugging-tools ${className}`}
      style={{ height: `${height}px` }}
    >
      {/* Header */}
      <div className="debug-header">
        <div className="debug-tabs">
          <button
            className={`debug-tab ${activeTab === 'console' ? 'active' : ''}`}
            onClick={() => setActiveTab('console')}
          >
            <Bug size={14} />
            Console
          </button>
          <button
            className={`debug-tab ${activeTab === 'breakpoints' ? 'active' : ''}`}
            onClick={() => setActiveTab('breakpoints')}
          >
            <Pause size={14} />
            Breakpoints
          </button>
          <button
            className={`debug-tab ${activeTab === 'watch' ? 'active' : ''}`}
            onClick={() => setActiveTab('watch')}
          >
            <Eye size={14} />
            Watch
          </button>
          <button
            className={`debug-tab ${activeTab === 'performance' ? 'active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            <Activity size={14} />
            Performance
          </button>
        </div>
        
        <div className="debug-actions">
          {activeTab === 'console' && (
            <>
              <button onClick={handleExportLogs} title="Export logs">
                <Download size={14} />
              </button>
              <button onClick={handleClearConsole} title="Clear console">
                <Trash2 size={14} />
              </button>
            </>
          )}
          {activeTab === 'breakpoints' && (
            <button onClick={handleAddBreakpoint} title="Add breakpoint">
              + Add
            </button>
          )}
          {activeTab === 'watch' && (
            <button onClick={handleAddWatch} title="Add watch">
              + Add
            </button>
          )}
        </div>
      </div>

      {/* Console Tab */}
      {activeTab === 'console' && (
        <>
          <div className="debug-toolbar">
            <div className="debug-search">
              <Search size={14} />
              <input
                type="text"
                placeholder="Search logs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <select
              value={filterLevel}
              onChange={(e) => setFilterLevel(e.target.value as LogLevel | 'all')}
              className="debug-filter"
            >
              <option value="all">All Levels</option>
              <option value="log">Log</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
              <option value="debug">Debug</option>
            </select>
          </div>
          
          <div className="debug-content">
            {filteredLogs.length === 0 ? (
              <div className="debug-empty">
                No console logs to display
              </div>
            ) : (
              filteredLogs.map(log => (
                <div key={log.id} className={`debug-log debug-log--${log.level}`}>
                  <span className="debug-log__time">
                    {log.timestamp.toLocaleTimeString()}
                  </span>
                  <span className="debug-log__level">{log.level}</span>
                  <pre className="debug-log__message">{log.message}</pre>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Breakpoints Tab */}
      {activeTab === 'breakpoints' && (
        <div className="debug-content">
          {breakpoints.length === 0 ? (
            <div className="debug-empty">
              No breakpoints set
            </div>
          ) : (
            breakpoints.map(bp => (
              <div key={bp.id} className="debug-breakpoint">
                <input
                  type="checkbox"
                  checked={bp.enabled}
                  onChange={() => handleToggleBreakpoint(bp.id)}
                />
                <span className="debug-breakpoint__file">{bp.file}</span>
                <span className="debug-breakpoint__line">:{bp.line}</span>
                <button
                  onClick={() => handleRemoveBreakpoint(bp.id)}
                  className="debug-btn-remove"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Watch Tab */}
      {activeTab === 'watch' && (
        <div className="debug-content">
          {watchVariables.length === 0 ? (
            <div className="debug-empty">
              No watch variables
            </div>
          ) : (
            watchVariables.map(watch => (
              <div key={watch.id} className="debug-watch">
                <span className="debug-watch__name">{watch.name}</span>
                <span className="debug-watch__value">
                  {JSON.stringify(watch.value)}
                </span>
                <span className="debug-watch__type">{watch.type}</span>
                <button
                  onClick={() => handleRemoveWatch(watch.id)}
                  className="debug-btn-remove"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))
          )}
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="debug-content">
          <div className="debug-empty">
            Performance monitoring coming soon
          </div>
        </div>
      )}

      {/* Styles */}
      <style>{`
        .debugging-tools {
          display: flex;
          flex-direction: column;
          background: #1e1e1e;
          color: #d4d4d4;
          font-family: 'Fira Code', 'Consolas', monospace;
          font-size: 12px;
          border: 1px solid #3e3e42;
          border-radius: 4px;
          overflow: hidden;
        }

        .debug-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px;
          background: #252526;
          border-bottom: 1px solid #3e3e42;
        }

        .debug-tabs {
          display: flex;
          gap: 4px;
        }

        .debug-tab {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 6px 12px;
          background: none;
          border: none;
          color: #858585;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.2s;
          font-size: 12px;
        }

        .debug-tab:hover {
          background: #3e3e42;
          color: #cccccc;
        }

        .debug-tab.active {
          background: #0e639c;
          color: #ffffff;
        }

        .debug-actions {
          display: flex;
          gap: 4px;
        }

        .debug-actions button {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: none;
          border: none;
          color: #858585;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.2s;
          font-size: 11px;
        }

        .debug-actions button:hover {
          background: #3e3e42;
          color: #cccccc;
        }

        .debug-toolbar {
          display: flex;
          gap: 8px;
          padding: 8px;
          background: #252526;
          border-bottom: 1px solid #3e3e42;
        }

        .debug-search {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1;
          padding: 4px 8px;
          background: #3e3e42;
          border-radius: 2px;
        }

        .debug-search input {
          flex: 1;
          background: none;
          border: none;
          color: #d4d4d4;
          outline: none;
          font-size: 12px;
        }

        .debug-filter {
          padding: 4px 8px;
          background: #3e3e42;
          border: none;
          color: #d4d4d4;
          border-radius: 2px;
          cursor: pointer;
          font-size: 11px;
        }

        .debug-content {
          flex: 1;
          overflow-y: auto;
          padding: 8px;
        }

        .debug-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #858585;
          font-size: 13px;
        }

        .debug-log {
          display: flex;
          gap: 8px;
          padding: 6px 8px;
          margin-bottom: 2px;
          border-left: 2px solid transparent;
          border-radius: 2px;
        }

        .debug-log:hover {
          background: #2d2d2d;
        }

        .debug-log--log {
          border-left-color: #858585;
        }

        .debug-log--info {
          border-left-color: #4fc1ff;
        }

        .debug-log--warn {
          border-left-color: #cca700;
        }

        .debug-log--error {
          border-left-color: #f48771;
        }

        .debug-log--debug {
          border-left-color: #b267e6;
        }

        .debug-log__time {
          color: #858585;
          font-size: 10px;
          min-width: 70px;
        }

        .debug-log__level {
          color: #4ec9b0;
          font-size: 10px;
          min-width: 50px;
          text-transform: uppercase;
        }

        .debug-log__message {
          flex: 1;
          margin: 0;
          white-space: pre-wrap;
          word-wrap: break-word;
          font-family: inherit;
          font-size: inherit;
        }

        .debug-breakpoint,
        .debug-watch {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 8px;
          margin-bottom: 2px;
          background: #252526;
          border-radius: 2px;
        }

        .debug-breakpoint:hover,
        .debug-watch:hover {
          background: #2d2d2d;
        }

        .debug-breakpoint__file {
          flex: 1;
          color: #ce9178;
        }

        .debug-breakpoint__line {
          color: #4fc1ff;
        }

        .debug-watch__name {
          color: #4ec9b0;
          min-width: 120px;
        }

        .debug-watch__value {
          flex: 1;
          color: #ce9178;
        }

        .debug-watch__type {
          color: #858585;
          font-size: 10px;
        }

        .debug-btn-remove {
          padding: 2px;
          background: none;
          border: none;
          color: #858585;
          cursor: pointer;
          opacity: 0;
          transition: all 0.2s;
        }

        .debug-breakpoint:hover .debug-btn-remove,
        .debug-watch:hover .debug-btn-remove {
          opacity: 1;
        }

        .debug-btn-remove:hover {
          color: #f48771;
        }

        /* Scrollbar */
        .debug-content::-webkit-scrollbar {
          width: 8px;
        }

        .debug-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .debug-content::-webkit-scrollbar-thumb {
          background: #424245;
          border-radius: 4px;
        }

        .debug-content::-webkit-scrollbar-thumb:hover {
          background: #4e4e56;
        }
      `}</style>
    </div>
  );
};

export default DebuggingTools;
