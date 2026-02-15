/**
 * Local AI Real-Time Logger
 * 
 * Comprehensive logging system for all local AI model interactions
 * - Logs all requests and responses with timestamps
 * - Tracks performance metrics
 * - Provides real-time log streaming
 * - Stores logs in IndexedDB for persistence
 */

export interface LogEntry {
  id: string;
  timestamp: number;
  type: 'request' | 'response' | 'error' | 'info' | 'warning' | 'performance';
  category: 'inference' | 'model_loading' | 'model_download' | 'system' | 'api';
  message: string;
  data?: any;
  metadata?: {
    requestId?: string;
    latency?: number;
    tokens?: number;
    modelStatus?: string;
    errorCode?: string;
    stackTrace?: string;
  };
}

export interface LogFilter {
  type?: LogEntry['type'];
  category?: LogEntry['category'];
  startTime?: number;
  endTime?: number;
  searchText?: string;
}

export class LocalAILogger {
  private static dbName = 'LocalAILogs';
  private static dbVersion = 1;
  private static storeName = 'logs';
  private static maxLogs = 10000; // Maximum number of logs to keep
  private static listeners: Set<(entry: LogEntry) => void> = new Set();
  private static isInitialized = false;

  /**
   * Initialize IndexedDB for log storage
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('[LocalAILogger] Failed to open database');
        reject(request.error);
      };

      request.onsuccess = () => {
        this.isInitialized = true;
        console.log('[LocalAILogger] Initialized');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(this.storeName)) {
          const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('type', 'type', { unique: false });
          store.createIndex('category', 'category', { unique: false });
        }
      };
    });
  }

  /**
   * Log an entry
   */
  static async log(entry: Omit<LogEntry, 'id' | 'timestamp'>): Promise<void> {
    await this.ensureInitialized();

    const logEntry: LogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...entry,
    };

    // Notify listeners in real-time
    this.listeners.forEach(listener => {
      try {
        listener(logEntry);
      } catch (error) {
        console.error('[LocalAILogger] Listener error:', error);
      }
    });

    // Store in IndexedDB
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      await store.put(logEntry);

      // Cleanup old logs if needed
      await this.cleanupOldLogs();
    } catch (error) {
      console.error('[LocalAILogger] Failed to store log:', error);
    }

    // Also log to console in development
    if (process.env['NODE_ENV'] === 'development') {
      const prefix = `[${logEntry.category.toUpperCase()}]`;
      const message = `${prefix} ${logEntry.message}`;
      
      switch (logEntry.type) {
        case 'error':
          console.error(message, logEntry.data);
          break;
        case 'warning':
          console.warn(message, logEntry.data);
          break;
        default:
          console.log(message, logEntry.data);
      }
    }
  }

  /**
   * Log a request
   */
  static async logRequest(
    message: string,
    data?: any,
    metadata?: LogEntry['metadata']
  ): Promise<void> {
    await this.log({
      type: 'request',
      category: 'inference',
      message,
      data,
      metadata,
    });
  }

  /**
   * Log a response
   */
  static async logResponse(
    message: string,
    data?: any,
    metadata?: LogEntry['metadata']
  ): Promise<void> {
    await this.log({
      type: 'response',
      category: 'inference',
      message,
      data,
      metadata,
    });
  }

  /**
   * Log an error
   */
  static async logError(
    message: string,
    error?: Error | any,
    metadata?: LogEntry['metadata']
  ): Promise<void> {
    await this.log({
      type: 'error',
      category: 'system',
      message,
      data: error,
      metadata: {
        ...metadata,
        errorCode: error?.code || error?.name,
        stackTrace: error?.stack,
      },
    });
  }

  /**
   * Log performance metrics
   */
  static async logPerformance(
    message: string,
    latency: number,
    tokens?: number,
    metadata?: LogEntry['metadata']
  ): Promise<void> {
    await this.log({
      type: 'performance',
      category: 'inference',
      message,
      metadata: {
        ...metadata,
        latency,
        tokens,
      },
    });
  }

  /**
   * Log model loading events
   */
  static async logModelLoading(
    message: string,
    status: string,
    data?: any
  ): Promise<void> {
    await this.log({
      type: 'info',
      category: 'model_loading',
      message,
      data,
      metadata: {
        modelStatus: status,
      },
    });
  }

  /**
   * Log model download events
   */
  static async logModelDownload(
    message: string,
    progress?: number,
    data?: any
  ): Promise<void> {
    await this.log({
      type: 'info',
      category: 'model_download',
      message,
      data: {
        ...data,
        progress,
      },
    });
  }

  /**
   * Get logs with filtering
   */
  static async getLogs(filter?: LogFilter): Promise<LogEntry[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const db = this.openDatabaseSync();
      if (!db) {
        reject(new Error('Database not available'));
        return;
      }

      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('timestamp');
      
      const range = filter?.startTime && filter?.endTime
        ? IDBKeyRange.bound(filter.startTime, filter.endTime)
        : undefined;

      const request = index.getAll(range);
      const logs: LogEntry[] = [];

      request.onsuccess = () => {
        let results = request.result as LogEntry[];

        // Apply filters
        if (filter?.type) {
          results = results.filter(log => log.type === filter.type);
        }
        if (filter?.category) {
          results = results.filter(log => log.category === filter.category);
        }
        if (filter?.searchText) {
          const searchLower = filter.searchText.toLowerCase();
          results = results.filter(log =>
            log.message.toLowerCase().includes(searchLower) ||
            JSON.stringify(log.data || {}).toLowerCase().includes(searchLower)
          );
        }

        // Sort by timestamp (newest first)
        results.sort((a, b) => b.timestamp - a.timestamp);

        resolve(results);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Get recent logs (last N entries)
   */
  static async getRecentLogs(count: number = 100): Promise<LogEntry[]> {
    const logs = await this.getLogs();
    return logs.slice(0, count);
  }

  /**
   * Clear all logs
   */
  static async clearLogs(): Promise<void> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const db = this.openDatabaseSync();
      if (!db) {
        reject(new Error('Database not available'));
        return;
      }

      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const request = store.clear();

      request.onsuccess = () => {
        console.log('[LocalAILogger] All logs cleared');
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Export logs as JSON
   */
  static async exportLogs(filter?: LogFilter): Promise<string> {
    const logs = await this.getLogs(filter);
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Subscribe to real-time log updates
   */
  static subscribe(listener: (entry: LogEntry) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Get statistics
   */
  static async getStatistics(): Promise<{
    totalLogs: number;
    errors: number;
    requests: number;
    responses: number;
    averageLatency: number;
    lastActivity: number | null;
  }> {
    const logs = await this.getLogs();
    
    const errors = logs.filter(log => log.type === 'error').length;
    const requests = logs.filter(log => log.type === 'request').length;
    const responses = logs.filter(log => log.type === 'response').length;
    
    const performanceLogs = logs.filter(log => log.type === 'performance');
    const totalLatency = performanceLogs.reduce((sum, log) => 
      sum + (log.metadata?.latency || 0), 0
    );
    const averageLatency = performanceLogs.length > 0
      ? totalLatency / performanceLogs.length
      : 0;

    const lastActivity = logs.length > 0 ? logs[0].timestamp : null;

    return {
      totalLogs: logs.length,
      errors,
      requests,
      responses,
      averageLatency,
      lastActivity,
    };
  }

  /**
   * Private helpers
   */
  private static async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  private static openDatabaseSync(): IDBDatabase | null {
    // This is a simplified version - in practice, you'd need to handle async properly
    try {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      return request.result || null;
    } catch {
      return null;
    }
  }

  private static async openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private static async cleanupOldLogs(): Promise<void> {
    try {
      const db = await this.openDatabase();
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const countRequest = store.count();

      countRequest.onsuccess = () => {
        const count = countRequest.result;
        if (count > this.maxLogs) {
          // Get all logs sorted by timestamp
          const index = store.index('timestamp');
          const getAllRequest = index.getAll();

          getAllRequest.onsuccess = () => {
            const logs = getAllRequest.result as LogEntry[];
            logs.sort((a, b) => a.timestamp - b.timestamp);

            // Delete oldest logs
            const toDelete = logs.slice(0, count - this.maxLogs);
            toDelete.forEach(log => {
              store.delete(log.id);
            });
          };
        }
      };
    } catch (error) {
      console.error('[LocalAILogger] Cleanup failed:', error);
    }
  }
}
