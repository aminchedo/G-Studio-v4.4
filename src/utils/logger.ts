/**
 * createLogger - Refactored from class Logger
 * 
 * Factory function for creating logger instances
 * Supports multiple log levels, structured logging, and output customization
 */

// Types
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  namespace: string;
  message: string;
  data?: unknown;
  stack?: string;
}

export interface LoggerOptions {
  namespace?: string;
  level?: LogLevel;
  enabled?: boolean;
  useColors?: boolean;
  showTimestamp?: boolean;
  persistLogs?: boolean;
  maxLogSize?: number;
  onLog?: (entry: LogEntry) => void;
}

export interface Logger {
  debug: (message: string, data?: unknown) => void;
  info: (message: string, data?: unknown) => void;
  warn: (message: string, data?: unknown) => void;
  error: (message: string, error?: Error | unknown) => void;
  log: (level: LogLevel, message: string, data?: unknown) => void;
  setLevel: (level: LogLevel) => void;
  enable: () => void;
  disable: () => void;
  getHistory: () => LogEntry[];
  clearHistory: () => void;
  child: (namespace: string) => Logger;
}

// Log level priority
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

// Console colors
const COLORS: Record<LogLevel, string> = {
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m',  // Green
  warn: '\x1b[33m',  // Yellow
  error: '\x1b[31m', // Red
  silent: '',
};

const RESET_COLOR = '\x1b[0m';

// Default options
const DEFAULT_OPTIONS: Required<LoggerOptions> = {
  namespace: 'App',
  level: 'info',
  enabled: true,
  useColors: typeof process !== 'undefined',
  showTimestamp: true,
  persistLogs: false,
  maxLogSize: 1000,
  onLog: () => {},
};

/**
 * Create a logger instance
 */
export function createLogger(options: LoggerOptions = {}): Logger {
  const config = { ...DEFAULT_OPTIONS, ...options };
  
  let currentLevel = config.level;
  let isEnabled = config.enabled;
  const history: LogEntry[] = [];

  // Check if log level should be output
  const shouldLog = (level: LogLevel): boolean => {
    if (!isEnabled || level === 'silent') return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
  };

  // Format timestamp
  const formatTimestamp = (): string => {
    return new Date().toISOString();
  };

  // Format log message
  const formatMessage = (level: LogLevel, message: string): string => {
    const parts: string[] = [];
    
    if (config.showTimestamp) {
      parts.push(`[${formatTimestamp()}]`);
    }
    
    parts.push(`[${config.namespace}]`);
    parts.push(`[${level.toUpperCase()}]`);
    parts.push(message);
    
    return parts.join(' ');
  };

  // Create log entry
  const createEntry = (
    level: LogLevel,
    message: string,
    data?: unknown,
    stack?: string
  ): LogEntry => ({
    timestamp: formatTimestamp(),
    level,
    namespace: config.namespace,
    message,
    data,
    stack,
  });

  // Add to history
  const addToHistory = (entry: LogEntry): void => {
    if (!config.persistLogs) return;
    
    history.push(entry);
    
    // Trim history if needed
    if (history.length > config.maxLogSize) {
      history.splice(0, history.length - config.maxLogSize);
    }
  };

  // Output to console
  const output = (level: LogLevel, formattedMessage: string, data?: unknown): void => {
    const consoleMethod = level === 'debug' ? 'log' : level;
    const color = config.useColors ? COLORS[level] : '';
    const reset = config.useColors ? RESET_COLOR : '';
    
    if (data !== undefined) {
      console[consoleMethod](`${color}${formattedMessage}${reset}`, data);
    } else {
      console[consoleMethod](`${color}${formattedMessage}${reset}`);
    }
  };

  // Main log function
  const log = (level: LogLevel, message: string, data?: unknown): void => {
    if (!shouldLog(level)) return;
    
    const entry = createEntry(level, message, data);
    const formattedMessage = formatMessage(level, message);
    
    output(level, formattedMessage, data);
    addToHistory(entry);
    config.onLog(entry);
  };

  // Public API
  const logger: Logger = {
    debug: (message: string, data?: unknown) => log('debug', message, data),
    
    info: (message: string, data?: unknown) => log('info', message, data),
    
    warn: (message: string, data?: unknown) => log('warn', message, data),
    
    error: (message: string, error?: Error | unknown) => {
      const stack = error instanceof Error ? error.stack : undefined;
      const data = error instanceof Error 
        ? { message: error.message, name: error.name }
        : error;
      
      const entry = createEntry('error', message, data, stack);
      const formattedMessage = formatMessage('error', message);
      
      if (shouldLog('error')) {
        output('error', formattedMessage, error);
        addToHistory(entry);
        config.onLog(entry);
      }
    },
    
    log,
    
    setLevel: (level: LogLevel) => {
      currentLevel = level;
    },
    
    enable: () => {
      isEnabled = true;
    },
    
    disable: () => {
      isEnabled = false;
    },
    
    getHistory: () => [...history],
    
    clearHistory: () => {
      history.length = 0;
    },
    
    child: (namespace: string) => {
      return createLogger({
        ...config,
        namespace: `${config.namespace}:${namespace}`,
      });
    },
  };

  return logger;
}

// Global logger instance
let globalLogger: Logger | null = null;

/**
 * Get or create global logger
 */
export function getLogger(namespace?: string): Logger {
  if (!globalLogger) {
    globalLogger = createLogger({ namespace: 'App' });
  }
  
  if (namespace) {
    return globalLogger.child(namespace);
  }
  
  return globalLogger;
}

/**
 * Set global logger
 */
export function setGlobalLogger(logger: Logger): void {
  globalLogger = logger;
}

// React hook for logging
import { useMemo, useCallback } from 'react';

export interface UseLoggerOptions extends LoggerOptions {
  componentName?: string;
}

export function useLogger(options: UseLoggerOptions = {}): Logger {
  const logger = useMemo(() => {
    const namespace = options.componentName || options.namespace || 'Component';
    return createLogger({ ...options, namespace });
  }, [options.componentName, options.namespace]);

  return logger;
}

// Utility to create scoped logger for services
export function createServiceLogger(serviceName: string): Logger {
  return createLogger({
    namespace: `Service:${serviceName}`,
    persistLogs: true,
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  });
}

// Backward compatibility
export class Logger {
  private logger: ReturnType<typeof createLogger>;

  constructor(namespace = 'App') {
    this.logger = createLogger({ namespace });
  }

  debug(message: string, data?: unknown): void {
    this.logger.debug(message, data);
  }

  info(message: string, data?: unknown): void {
    this.logger.info(message, data);
  }

  warn(message: string, data?: unknown): void {
    this.logger.warn(message, data);
  }

  error(message: string, error?: Error | unknown): void {
    this.logger.error(message, error);
  }

  setLevel(level: LogLevel): void {
    this.logger.setLevel(level);
  }
}

export default createLogger;
