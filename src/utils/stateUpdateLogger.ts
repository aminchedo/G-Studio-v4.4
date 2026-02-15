/**
 * State Update Logger
 * 
 * Comprehensive logging for state updates to track STATE_UPDATE_FAILED errors
 */

export interface StateUpdateLog {
  timestamp: number;
  component: string;
  stateKey: string;
  operation: 'set' | 'update' | 'delete' | 'clear';
  success: boolean;
  error?: string;
  dataSize?: number;
}

class StateUpdateLogger {
  private static logs: StateUpdateLog[] = [];
  private static maxLogs = 1000;

  /**
   * Log a state update attempt
   */
  static log(
    component: string,
    stateKey: string,
    operation: StateUpdateLog['operation'],
    success: boolean,
    error?: string,
    dataSize?: number
  ): void {
    const log: StateUpdateLog = {
      timestamp: Date.now(),
      component,
      stateKey,
      operation,
      success,
      error,
      dataSize,
    };

    this.logs.push(log);

    // Keep only last N logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      if (success) {
        console.log(`[StateUpdate] ${component}.${stateKey} - ${operation} - SUCCESS`, {
          dataSize: dataSize ? `${(dataSize / 1024).toFixed(2)}KB` : undefined,
        });
      } else {
        console.error(`[StateUpdate] ${component}.${stateKey} - ${operation} - FAILED`, {
          error,
          dataSize: dataSize ? `${(dataSize / 1024).toFixed(2)}KB` : undefined,
        });
      }
    }
  }

  /**
   * Get recent logs
   */
  static getRecentLogs(count: number = 100): StateUpdateLog[] {
    return this.logs.slice(-count);
  }

  /**
   * Get logs for a specific component
   */
  static getLogsForComponent(component: string): StateUpdateLog[] {
    return this.logs.filter(log => log.component === component);
  }

  /**
   * Get failed updates
   */
  static getFailedUpdates(): StateUpdateLog[] {
    return this.logs.filter(log => !log.success);
  }

  /**
   * Clear logs
   */
  static clear(): void {
    this.logs = [];
  }

  /**
   * Get statistics
   */
  static getStats(): {
    total: number;
    successful: number;
    failed: number;
    failureRate: number;
    recentFailures: StateUpdateLog[];
  } {
    const total = this.logs.length;
    const successful = this.logs.filter(log => log.success).length;
    const failed = this.logs.filter(log => !log.success).length;
    const failureRate = total > 0 ? (failed / total) * 100 : 0;
    const recentFailures = this.logs
      .filter(log => !log.success)
      .slice(-10);

    return {
      total,
      successful,
      failed,
      failureRate,
      recentFailures,
    };
  }
}

/**
 * Safe state setter wrapper
 */
export function safeStateSetter<T>(
  component: string,
  stateKey: string,
  setter: (value: T) => void,
  value: T
): void {
  try {
    const dataSize = typeof value === 'string' 
      ? new Blob([value]).size 
      : new Blob([JSON.stringify(value)]).size;

    setter(value);
    StateUpdateLogger.log(component, stateKey, 'set', true, undefined, dataSize);
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    StateUpdateLogger.log(component, stateKey, 'set', false, errorMessage);
    
    console.error(`[StateUpdate] Failed to update ${component}.${stateKey}:`, {
      error: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      value: typeof value === 'object' ? JSON.stringify(value).substring(0, 100) : String(value).substring(0, 100),
    });
    
    throw error;
  }
}

export { StateUpdateLogger };
