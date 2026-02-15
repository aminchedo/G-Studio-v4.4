/**
 * src/utils/logger.ts
 *
 * Professional, TypeScript-friendly logger factory.
 * - createLogger: factory for logger instances
 * - getLogger / setGlobalLogger: global logger management
 * - useLogger: React hook to obtain a memoized logger (for components)
 * - createServiceLogger: helper for service-scoped loggers
 *
 * Design goals:
 * - Strict typing (no implicit any)
 * - Safe console access and handling of "silent" level
 * - Optional persistent in-memory history
 * - Light browser/node coloring support
 * - Backwards-compatible simple class wrapper (LoggerClient)
 */

import { useMemo } from 'react';

/* =========================
   Types
   ========================= */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  namespace: string;
  message: string;
  data?: unknown;
  stack?: string | undefined;
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

export interface LoggerApi {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, error?: Error | unknown): void;
  log(level: Exclude<LogLevel, 'silent'>, message: string, data?: unknown): void;
  setLevel(level: LogLevel): void;
  enable(): void;
  disable(): void;
  getHistory(): ReadonlyArray<LogEntry>;
  clearHistory(): void;
  child(namespace: string, opts?: Partial<LoggerOptions>): LoggerApi;
}

/* =========================
   Constants
   ========================= */

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

// Browser CSS colors (used when running in browser)
const BROWSER_COLORS: Record<Exclude<LogLevel, 'silent'>, string> = {
  debug: 'color: #2aa198', // cyan-ish
  info: 'color: #2aa549', // green
  warn: 'color: #d58900', // amber
  error: 'color: #d11a2a', // red
};

// Node ANSI colors fallback
const NODE_COLORS: Record<Exclude<LogLevel, 'silent'>, string> = {
  debug: '\x1b[36m',
  info: '\x1b[32m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
};
const RESET_COLOR = '\x1b[0m';

/* =========================
   Defaults
   ========================= */

const DEFAULT_OPTIONS: Required<LoggerOptions> = {
  namespace: 'App',
  level: 'info',
  enabled: true,
  useColors: true,
  showTimestamp: true,
  persistLogs: false,
  maxLogSize: 1000,
  onLog: () => {},
};

/* =========================
   Helper utilities
   ========================= */

const isBrowser = typeof window !== 'undefined' && typeof window.document !== 'undefined';
const nowISOString = (): string => new Date().toISOString();

/* Safe console method resolver */
function resolveConsoleMethod(level: Exclude<LogLevel, 'silent'>): keyof Console {
  switch (level) {
    case 'debug':
      return (typeof console.debug !== 'undefined' ? 'debug' : 'log') as keyof Console;
    case 'info':
      return 'info';
    case 'warn':
      return 'warn';
    case 'error':
      return 'error';
    default:
      return 'log';
  }
}

/* =========================
   createLogger
   ========================= */

export function createLogger(options: LoggerOptions = {}): LoggerApi {
  const config: Required<LoggerOptions> = { ...DEFAULT_OPTIONS, ...options };

  let currentLevel: LogLevel = config.level;
  let enabled = Boolean(config.enabled);
  const history: LogEntry[] = [];

  const shouldLog = (level: LogLevel): boolean => {
    if (!enabled || level === 'silent') return false;
    return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
  };

  const formatMessage = (level: LogLevel, namespace: string, message: string): string => {
    const parts: string[] = [];
    if (config.showTimestamp) parts.push(`[${nowISOString()}]`);
    parts.push(`[${namespace}]`);
    parts.push(`[${level.toUpperCase()}]`);
    parts.push(message);
    return parts.join(' ');
  };

  const createEntry = (level: LogLevel, namespace: string, message: string, data?: unknown, stack?: string | undefined): LogEntry => ({
    timestamp: nowISOString(),
    level,
    namespace,
    message,
    data,
    stack,
  });

  const addToHistory = (entry: LogEntry): void => {
    if (!config.persistLogs) return;
    history.push(entry);
    if (history.length > config.maxLogSize) {
      history.splice(0, history.length - config.maxLogSize);
    }
  };

  const outputToConsole = (level: Exclude<LogLevel, 'silent'>, formatted: string, data?: unknown): void => {
    const method = resolveConsoleMethod(level);
    try {
      if (config.useColors) {
        if (isBrowser) {
          // Browser: use CSS styling
          const color = BROWSER_COLORS[level];
          if (data !== undefined) {
            // print formatted + data
            (console as any)[method](`%c${formatted}`, color, data);
          } else {
            (console as any)[method](`%c${formatted}`, color);
          }
        } else {
          // Node: ANSI coloring
          const color = NODE_COLORS[level];
          if (data !== undefined) {
            (console as any)[method](`${color}${formatted}${RESET_COLOR}`, data);
          } else {
            (console as any)[method](`${color}${formatted}${RESET_COLOR}`);
          }
        }
      } else {
        if (data !== undefined) {
          (console as any)[method](formatted, data);
        } else {
          (console as any)[method](formatted);
        }
      }
    } catch (e) {
      // If console is not available or something fails, silently ignore
      // but do not throw — logging should not break application flow
    }
  };

  const baseLog = (level: Exclude<LogLevel, 'silent'>, namespace: string, message: string, data?: unknown, stack?: string | undefined): void => {
    if (!shouldLog(level)) return;
    const formatted = formatMessage(level, namespace, message);
    const entry = createEntry(level, namespace, message, data, stack);
    outputToConsole(level, formatted, data);
    addToHistory(entry);
    try {
      config.onLog(entry);
    } catch {
      // swallow onLog errors
    }
  };

  const api: LoggerApi = {
    debug: (message: string, data?: unknown) => baseLog('debug', config.namespace, message, data),
    info: (message: string, data?: unknown) => baseLog('info', config.namespace, message, data),
    warn: (message: string, data?: unknown) => baseLog('warn', config.namespace, message, data),
    error: (message: string, error?: Error | unknown) => {
      const stack = error instanceof Error ? error.stack : undefined;
      const data = error instanceof Error ? { name: error.name, message: error.message } : error;
      baseLog('error', config.namespace, message, data, stack);
    },
    log: (level: Exclude<LogLevel, 'silent'>, message: string, data?: unknown) => baseLog(level, config.namespace, message, data),
    setLevel: (level: LogLevel) => { currentLevel = level; },
    enable: () => { enabled = true; },
    disable: () => { enabled = false; },
    getHistory: () => history.slice(),
    clearHistory: () => { history.length = 0; },
    child: (namespace: string, opts?: Partial<LoggerOptions>) => {
      // child inherits parent's persist/level unless overridden
      return createLogger({
        ...config,
        ...(opts || {}),
        namespace: `${config.namespace}:${namespace}`,
      });
    },
  };

  return api;
}

/* =========================
   Global logger helpers
   ========================= */

let globalLogger: LoggerApi | null = null;

export function getLogger(namespace?: string): LoggerApi {
  if (!globalLogger) {
    globalLogger = createLogger({ namespace: 'App' });
  }
  if (namespace) return globalLogger.child(namespace);
  return globalLogger;
}

export function setGlobalLogger(logger: LoggerApi): void {
  globalLogger = logger;
}

/* =========================
   React hook: useLogger
   =========================
   Returns a memoized logger instance for a component.
   Options are shallow-checked by namespace/level/enabled to avoid re-creation.
*/

export interface UseLoggerOptions extends LoggerOptions {
  componentName?: string;
}

export function useLogger(opts: UseLoggerOptions = {}): LoggerApi {
  // destructure stable keys to use as deps
  const namespace = opts.componentName || opts.namespace || 'Component';
  const level = opts.level ?? undefined;
  const enabled = opts.enabled ?? undefined;
  const useColors = opts.useColors ?? undefined;

  return useMemo(() => {
    // Only pass the options we actually care about to avoid recreating unnecessarily
    const optsToPass: LoggerOptions = {
      namespace,
      ...(level ? { level } : {}),
      ...(enabled !== undefined ? { enabled } : {}),
      ...(useColors !== undefined ? { useColors } : {}),
      showTimestamp: opts.showTimestamp ?? true,
      persistLogs: opts.persistLogs ?? false,
      maxLogSize: opts.maxLogSize ?? 1000,
      onLog: opts.onLog ?? (() => {}),
    };
    return createLogger(optsToPass);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [namespace, level, enabled, useColors, opts.showTimestamp, opts.persistLogs, opts.maxLogSize]);
}

/* =========================
   Convenience: createServiceLogger
   ========================= */

export function createServiceLogger(serviceName: string, override?: Partial<LoggerOptions>): LoggerApi {
  const env = process && (process.env ? process.env['NODE_ENV'] : undefined);
  const defaultLevel: LogLevel = env === 'development' ? 'debug' : 'info';

  return createLogger({
    namespace: `Service:${serviceName}`,
    persistLogs: true,
    level: override?.level ?? defaultLevel,
    ...override,
  });
}

/* =========================
   Backwards-compatible class wrapper
   =========================
   Named LoggerClient to avoid name collision with interface types.
*/

export class LoggerClient {
  private logger: LoggerApi;

  constructor(namespace = 'App') {
    this.logger = createLogger({ namespace });
  }

  debug(message: string, data?: unknown): void { this.logger.debug(message, data); }
  info(message: string, data?: unknown): void { this.logger.info(message, data); }
  warn(message: string, data?: unknown): void { this.logger.warn(message, data); }
  error(message: string, error?: Error | unknown): void { this.logger.error(message, error); }
  log(level: Exclude<LogLevel, 'silent'>, message: string, data?: unknown): void { this.logger.log(level, message, data); }
  setLevel(level: LogLevel): void { this.logger.setLevel(level); }
  enable(): void { this.logger.enable(); }
  disable(): void { this.logger.disable(); }
  getHistory(): ReadonlyArray<LogEntry> { return this.logger.getHistory(); }
  clearHistory(): void { this.logger.clearHistory(); }
  child(namespace: string, opts?: Partial<LoggerOptions>): LoggerApi { return this.logger.child(namespace, opts); }
}

/* =========================
   Default export (factory)
   ========================= */

export default createLogger;
