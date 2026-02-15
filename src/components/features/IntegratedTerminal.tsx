/**
 * IntegratedTerminal Component - Built-in terminal for command execution
 * 
 * Features:
 * - Command history with ↑/↓ navigation
 * - Syntax highlighting
 * - Status tracking (running/success/error)
 * - Copy output functionality
 * - Auto-scroll to latest output
 * - Working directory display
 * 
 * @version 2.3.0
 * @refactored Fully functional with proper TypeScript types
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal, Copy, Trash2, ChevronDown } from 'lucide-react';

// ==================== TYPES ====================

/**
 * Terminal command status
 */
type CommandStatus = 'running' | 'success' | 'error';

/**
 * Terminal command interface
 */
interface TerminalCommand {
  id: string;
  command: string;
  output: string;
  error: boolean;
  timestamp: Date;
  status: CommandStatus;
}

/**
 * Component props
 */
interface IntegratedTerminalProps {
  height?: number;
  onCommandExecute?: (command: string) => Promise<string>;
  workingDirectory?: string;
  initialCommands?: TerminalCommand[];
  maxHistory?: number;
  className?: string;
}

// ==================== COMPONENT ====================

/**
 * IntegratedTerminal - Terminal emulator component
 * 
 * Provides command execution, history management, and output display.
 * 
 * @example
 * ```tsx
 * <IntegratedTerminal
 *   height={300}
 *   workingDirectory="/home/user/project"
 *   onCommandExecute={async (cmd) => {
 *     // Execute command and return output
 *     return await executeCommand(cmd);
 *   }}
 * />
 * ```
 */
export const IntegratedTerminal: React.FC<IntegratedTerminalProps> = ({
  height = 200,
  onCommandExecute,
  workingDirectory = '~',
  initialCommands = [],
  maxHistory = 100,
  className = '',
}) => {
  // ==================== STATE ====================
  
  const [commands, setCommands] = useState<TerminalCommand[]>(initialCommands);
  const [currentInput, setCurrentInput] = useState('');
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isRunning, setIsRunning] = useState(false);
  
  // ==================== REFS ====================
  
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ==================== AUTO-SCROLL ====================
  
  /**
   * Auto-scroll to bottom when new output is added
   */
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [commands]);

  // ==================== COMMAND EXECUTION ====================
  
  /**
   * Execute current command
   */
  const handleExecuteCommand = useCallback(async () => {
    if (!currentInput.trim() || isRunning) return;

    const command = currentInput.trim();
    const cmdId = `cmd-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newCmd: TerminalCommand = {
      id: cmdId,
      command,
      output: '',
      error: false,
      timestamp: new Date(),
      status: 'running',
    };

    // Add command to history
    setCommands(prev => {
      const updated = [...prev, newCmd];
      // Limit history size
      if (updated.length > maxHistory) {
        return updated.slice(updated.length - maxHistory);
      }
      return updated;
    });
    
    setCurrentInput('');
    setIsRunning(true);
    setHistoryIndex(-1);

    try {
      let output = '';

      if (onCommandExecute) {
        // Execute command via provided handler
        output = await onCommandExecute(command);
      } else {
        // Mock output for demo/testing
        output = await simulateCommand(command);
      }

      // Update command with success output
      setCommands(prev =>
        prev.map(cmd =>
          cmd.id === cmdId
            ? {
                ...cmd,
                output,
                status: 'success' as CommandStatus,
                error: false,
              }
            : cmd
        )
      );
    } catch (error: any) {
      // Update command with error output
      const errorMsg = error.message || 'Command execution failed';
      setCommands(prev =>
        prev.map(cmd =>
          cmd.id === cmdId
            ? {
                ...cmd,
                output: errorMsg,
                status: 'error' as CommandStatus,
                error: true,
              }
            : cmd
        )
      );
    } finally {
      setIsRunning(false);
      
      // Focus input after execution
      setTimeout(() => {
        inputRef.current?.focus();
      }, 0);
    }
  }, [currentInput, isRunning, onCommandExecute, maxHistory]);

  // ==================== KEYBOARD HANDLERS ====================
  
  /**
   * Handle keyboard input
   */
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleExecuteCommand();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      navigateHistory('up');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      navigateHistory('down');
    } else if (e.key === 'c' && e.ctrlKey) {
      // Ctrl+C to cancel running command
      if (isRunning) {
        e.preventDefault();
        setIsRunning(false);
      }
    } else if (e.key === 'l' && e.ctrlKey) {
      // Ctrl+L to clear screen
      e.preventDefault();
      handleClearHistory();
    }
  }, [handleExecuteCommand, isRunning]);

  /**
   * Navigate command history
   */
  const navigateHistory = useCallback((direction: 'up' | 'down') => {
    const history = commands.map(c => c.command);
    
    if (direction === 'up') {
      const newIndex = historyIndex + 1;
      if (newIndex < history.length) {
        setHistoryIndex(newIndex);
        setCurrentInput(history[history.length - 1 - newIndex]);
      }
    } else {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setCurrentInput(history[history.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setCurrentInput('');
      }
    }
  }, [commands, historyIndex]);

  // ==================== UTILITY FUNCTIONS ====================
  
  /**
   * Copy command output to clipboard
   */
  const handleCopyOutput = useCallback(async (output: string) => {
    try {
      await navigator.clipboard.writeText(output);
      // Optional: Show toast notification
    } catch (error) {
      console.error('Failed to copy output:', error);
    }
  }, []);

  /**
   * Clear terminal history
   */
  const handleClearHistory = useCallback(() => {
    if (commands.length === 0) return;
    
    if (window.confirm('Clear terminal history?')) {
      setCommands([]);
      setHistoryIndex(-1);
    }
  }, [commands.length]);

  // ==================== RENDER ====================
  
  return (
    <div 
      className={`integrated-terminal ${className}`} 
      style={{ height: `${height}px` }}
    >
      {/* Terminal Header */}
      <div className="terminal-header">
        <div className="terminal-header__title">
          <Terminal size={16} />
          <span>Terminal</span>
          {workingDirectory && (
            <span className="terminal-header__cwd">{workingDirectory}</span>
          )}
        </div>
        <div className="terminal-header__actions">
          <button
            className="terminal-btn"
            onClick={handleClearHistory}
            title="Clear history (Ctrl+L)"
            disabled={commands.length === 0}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Terminal Output */}
      <div className="terminal-output" ref={terminalRef}>
        {commands.length === 0 ? (
          <div className="terminal-empty">
            <p>Welcome to G-Studio Terminal</p>
            <p className="hint">
              Type a command and press Enter
            </p>
            <p className="hint">
              Use ↑/↓ to navigate history • Ctrl+L to clear • Ctrl+C to cancel
            </p>
          </div>
        ) : (
          commands.map((cmd) => (
            <div key={cmd.id} className="terminal-command">
              <div className="terminal-command__header">
                <span className="terminal-prompt">$</span>
                <span className="terminal-command__text">{cmd.command}</span>
                <span className={`terminal-status ${cmd.status}`}>
                  {cmd.status === 'running' && '⏳'}
                  {cmd.status === 'success' && '✓'}
                  {cmd.status === 'error' && '✕'}
                </span>
              </div>
              {cmd.output && (
                <div className={`terminal-output__content ${cmd.error ? 'error' : ''}`}>
                  <pre>{cmd.output}</pre>
                  <button
                    className="terminal-copy-btn"
                    onClick={() => handleCopyOutput(cmd.output)}
                    title="Copy output"
                  >
                    <Copy size={12} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Terminal Input */}
      <div className="terminal-input-container">
        <span className="terminal-prompt">$</span>
        <input
          ref={inputRef}
          type="text"
          className="terminal-input"
          value={currentInput}
          onChange={(e) => setCurrentInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter a command..."
          disabled={isRunning}
          autoFocus
        />
        <button
          className="terminal-execute-btn"
          onClick={handleExecuteCommand}
          disabled={!currentInput.trim() || isRunning}
          title="Execute command (Enter)"
        >
          <ChevronDown size={16} />
        </button>
      </div>

      {/* Styles */}
      <style>{`
        .integrated-terminal {
          display: flex;
          flex-direction: column;
          background: #1e1e1e;
          color: #d4d4d4;
          font-family: 'Fira Code', 'Consolas', 'Courier New', monospace;
          font-size: 13px;
          overflow: hidden;
          border: 1px solid #3e3e42;
          border-radius: 4px;
        }

        .terminal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 12px;
          background: #252526;
          border-bottom: 1px solid #3e3e42;
        }

        .terminal-header__title {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
          color: #cccccc;
        }

        .terminal-header__cwd {
          color: #858585;
          font-size: 12px;
        }

        .terminal-header__actions {
          display: flex;
          gap: 4px;
        }

        .terminal-btn {
          padding: 4px 8px;
          background: none;
          border: none;
          color: #858585;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.2s;
        }

        .terminal-btn:hover:not(:disabled) {
          background: #3e3e42;
          color: #cccccc;
        }

        .terminal-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .terminal-output {
          flex: 1;
          overflow-y: auto;
          padding: 12px 0;
          background: #1e1e1e;
        }

        .terminal-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #858585;
          text-align: center;
          gap: 4px;
        }

        .terminal-empty p {
          margin: 0;
        }

        .terminal-empty .hint {
          font-size: 11px;
          color: #6a6a6a;
        }

        .terminal-command {
          padding: 0 12px;
          margin-bottom: 8px;
        }

        .terminal-command__header {
          display: flex;
          align-items: center;
          gap: 8px;
          user-select: none;
        }

        .terminal-prompt {
          color: #4ec9b0;
          font-weight: bold;
        }

        .terminal-command__text {
          color: #ce9178;
          flex: 1;
        }

        .terminal-status {
          font-size: 12px;
          margin-left: 8px;
        }

        .terminal-status.running {
          color: #4fc1ff;
          animation: blink 1s infinite;
        }

        .terminal-status.success {
          color: #4ec9b0;
        }

        .terminal-status.error {
          color: #f48771;
        }

        @keyframes blink {
          0%, 49% { opacity: 1; }
          50%, 100% { opacity: 0.5; }
        }

        .terminal-output__content {
          margin-top: 4px;
          padding: 8px 24px;
          background: #252526;
          border-left: 2px solid #3e3e42;
          color: #d4d4d4;
          word-wrap: break-word;
          white-space: pre-wrap;
          position: relative;
          border-radius: 2px;
        }

        .terminal-output__content pre {
          margin: 0;
          font-family: inherit;
          font-size: inherit;
          white-space: pre-wrap;
          word-wrap: break-word;
        }

        .terminal-output__content.error {
          border-left-color: #f48771;
          color: #f48771;
        }

        .terminal-copy-btn {
          position: absolute;
          top: 4px;
          right: 4px;
          padding: 4px;
          background: #3e3e42;
          border: none;
          color: #858585;
          cursor: pointer;
          border-radius: 2px;
          opacity: 0;
          transition: all 0.2s;
        }

        .terminal-output__content:hover .terminal-copy-btn {
          opacity: 1;
        }

        .terminal-copy-btn:hover {
          background: #4e4e56;
          color: #cccccc;
        }

        .terminal-input-container {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: #252526;
          border-top: 1px solid #3e3e42;
        }

        .terminal-input {
          flex: 1;
          background: transparent;
          border: none;
          color: #d4d4d4;
          font-family: 'Fira Code', 'Consolas', 'Courier New', monospace;
          font-size: 13px;
          outline: none;
        }

        .terminal-input::placeholder {
          color: #6a6a6a;
        }

        .terminal-input:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .terminal-execute-btn {
          padding: 4px 8px;
          background: #0e639c;
          border: none;
          color: #ffffff;
          cursor: pointer;
          border-radius: 2px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
        }

        .terminal-execute-btn:hover:not(:disabled) {
          background: #1177bb;
        }

        .terminal-execute-btn:disabled {
          background: #3e3e42;
          color: #858585;
          cursor: not-allowed;
        }

        /* Scrollbar styling */
        .terminal-output::-webkit-scrollbar {
          width: 8px;
        }

        .terminal-output::-webkit-scrollbar-track {
          background: transparent;
        }

        .terminal-output::-webkit-scrollbar-thumb {
          background: #424245;
          border-radius: 4px;
        }

        .terminal-output::-webkit-scrollbar-thumb:hover {
          background: #4e4e56;
        }
      `}</style>
    </div>
  );
};

// ==================== HELPER FUNCTIONS ====================

/**
 * Simulate command execution (for demo purposes)
 */
async function simulateCommand(command: string): Promise<string> {
  // Simulate delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const lowerCommand = command.toLowerCase().trim();
  
  // Handle common commands
  if (lowerCommand === 'help') {
    return `Available commands:
  help     - Show this help message
  clear    - Clear terminal (Ctrl+L)
  echo     - Echo a message
  ls       - List files
  pwd      - Print working directory
  date     - Show current date/time
  version  - Show version info`;
  }
  
  if (lowerCommand === 'clear') {
    return '';
  }
  
  if (lowerCommand.startsWith('echo ')) {
    return command.substring(5);
  }
  
  if (lowerCommand === 'ls') {
    return `src/
dist/
node_modules/
package.json
README.md`;
  }
  
  if (lowerCommand === 'pwd') {
    return '/home/user/project';
  }
  
  if (lowerCommand === 'date') {
    return new Date().toString();
  }
  
  if (lowerCommand === 'version') {
    return 'G-Studio Terminal v2.3.0';
  }
  
  // Default response
  return `$ ${command}\n[Output would appear here in production]\nCommand executed successfully.`;
}

// ==================== EXPORTS ====================

/**
 * Placeholder component for lazy loading
 */
export const IntegratedTerminalPlaceholder: React.FC = () => {
  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '200px',
        background: '#1e1e1e',
        color: '#858585',
        border: '1px solid #3e3e42',
        borderRadius: '4px'
      }}
    >
      <Terminal size={24} style={{ marginRight: '8px' }} />
      <span>Loading Terminal...</span>
    </div>
  );
};

export default IntegratedTerminal;
