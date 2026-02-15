/**
 * StateTransaction - Safe state synchronization wrapper
 * 
 * Purpose: Prevent state/database desynchronization
 * - Atomic operations (all-or-nothing)
 * - Automatic rollback on failure
 * - Optimistic updates with error recovery
 * - Transaction logging
 * 
 * Usage: Wrap file operations that update both state and database
 * 
 * @example
 * await StateTransaction.execute({
 *   stateUpdate: () => setFiles(prev => ({...prev, [path]: newFile})),
 *   dbOperation: () => databaseService.saveFile(fileData),
 *   rollback: () => setFiles(prev => ({...prev, [path]: oldFile})),
 * });
 */

import { ErrorHandler, ErrorCode } from './errorHandler';
import { databaseService } from './storage/databaseService';

export interface TransactionOptions<T = any> {
  // State update function (executed first)
  stateUpdate: () => void | Promise<void>;
  
  // Database operation (executed second)
  dbOperation: () => Promise<T>;
  
  // Rollback function (executed if dbOperation fails)
  rollback: () => void | Promise<void>;
  
  // Optional: Validation before execution
  validate?: () => boolean | Promise<boolean>;
  
  // Optional: Success callback
  onSuccess?: (result: T) => void | Promise<void>;
  
  // Optional: Error callback
  onError?: (error: any) => void | Promise<void>;
  
  // Optional: Transaction metadata
  metadata?: {
    operation: string;
    context?: Record<string, any>;
  };
}

export interface TransactionResult<T = any> {
  success: boolean;
  data?: T;
  error?: any;
  rolledBack: boolean;
  duration: number;
  timestamp: number;
}

export interface TransactionLog {
  id: string;
  operation: string;
  success: boolean;
  duration: number;
  timestamp: number;
  error?: string;
  rolledBack: boolean;
}

export class StateTransaction {
  private static transactionLog: TransactionLog[] = [];
  private static maxLogSize = 50;
  private static activeTransactions = new Set<string>();

  /**
   * Execute a state transaction with automatic rollback
   * 
   * @param options - Transaction configuration
   * @returns Transaction result with success status
   */
  static async execute<T = any>(
    options: TransactionOptions<T>
  ): Promise<TransactionResult<T>> {
    const startTime = Date.now();
    const transactionId = this.generateTransactionId();
    const operation = options.metadata?.operation || 'unknown';
    
    // Mark transaction as active
    this.activeTransactions.add(transactionId);
    
    let rolledBack = false;
    let stateUpdated = false;
    
    try {
      // Step 1: Validate (if provided)
      if (options.validate) {
        const isValid = await options.validate();
        if (!isValid) {
          throw new Error('Transaction validation failed');
        }
      }
      
      // Step 2: Execute state update (optimistic)
      await options.stateUpdate();
      stateUpdated = true;
      
      // Step 3: Execute database operation
      const result = await options.dbOperation();
      
      // Step 4: Success callback (if provided)
      if (options.onSuccess) {
        await options.onSuccess(result);
      }
      
      // Log success
      this.logTransaction({
        id: transactionId,
        operation,
        success: true,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        rolledBack: false,
      });
      
      return {
        success: true,
        data: result,
        rolledBack: false,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      };
      
    } catch (error) {
      // Rollback state if it was updated
      if (stateUpdated) {
        try {
          await options.rollback();
          rolledBack = true;
        } catch (rollbackError) {
          // Rollback failed - critical error
          ErrorHandler.handle(rollbackError, 'STATE_TRANSACTION', {
            code: ErrorCode.STATE_SYNC_FAILED,
            context: {
              operation,
              originalError: error,
              transactionId,
            },
            recoverable: false,
          });
        }
      }
      
      // Error callback (if provided)
      if (options.onError) {
        try {
          await options.onError(error);
        } catch {
          // Ignore error callback failures
        }
      }
      
      // Log failure
      this.logTransaction({
        id: transactionId,
        operation,
        success: false,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : String(error),
        rolledBack,
      });
      
      // Handle error
      ErrorHandler.handle(error, 'STATE_TRANSACTION', {
        code: ErrorCode.DB_TRANSACTION_FAILED,
        context: {
          operation,
          rolledBack,
          transactionId,
        },
      });
      
      return {
        success: false,
        error,
        rolledBack,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      };
      
    } finally {
      // Mark transaction as complete
      this.activeTransactions.delete(transactionId);
    }
  }

  /**
   * Execute multiple transactions in sequence
   * Stops on first failure and rolls back all previous transactions
   */
  static async executeSequence<T = any>(
    transactions: TransactionOptions<T>[]
  ): Promise<TransactionResult<T[]>> {
    const results: T[] = [];
    const executedTransactions: number[] = [];
    const startTime = Date.now();
    
    try {
      for (let i = 0; i < transactions.length; i++) {
        const result = await this.execute(transactions[i]);
        
        if (!result.success) {
          // Rollback all previous transactions
          for (let j = executedTransactions.length - 1; j >= 0; j--) {
            const idx = executedTransactions[j];
            try {
              await transactions[idx].rollback();
            } catch (rollbackError) {
              ErrorHandler.handle(rollbackError, 'STATE_TRANSACTION', {
                code: ErrorCode.STATE_SYNC_FAILED,
                context: { transactionIndex: idx },
              });
            }
          }
          
          return {
            success: false,
            error: result.error,
            rolledBack: true,
            duration: Date.now() - startTime,
            timestamp: Date.now(),
          };
        }
        
        results.push(result.data!);
        executedTransactions.push(i);
      }
      
      return {
        success: true,
        data: results,
        rolledBack: false,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      };
      
    } catch (error) {
      return {
        success: false,
        error,
        rolledBack: true,
        duration: Date.now() - startTime,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Create a file operation transaction
   * Convenience wrapper for common file operations
   */
  static createFileTransaction(
    filename: string,
    newContent: string,
    oldContent: string | null,
    setFiles: (updater: (prev: any) => any) => void,
    language: string = 'plaintext'
  ): TransactionOptions<void> {
    return {
      stateUpdate: () => {
        setFiles((prev: any) => ({
          ...prev,
          [filename]: {
            name: filename,
            content: newContent,
            language,
          },
        }));
      },
      
      dbOperation: async () => {
        await databaseService.saveFile({
          path: filename,
          content: newContent,
          language,
          timestamp: Date.now(),
        });
      },
      
      rollback: () => {
        if (oldContent !== null) {
          // Restore old content
          setFiles((prev: any) => ({
            ...prev,
            [filename]: {
              name: filename,
              content: oldContent,
              language,
            },
          }));
        } else {
          // Remove file (it was new)
          setFiles((prev: any) => {
            const next = { ...prev };
            delete next[filename];
            return next;
          });
        }
      },
      
      metadata: {
        operation: 'file_save',
        context: { filename },
      },
    };
  }

  /**
   * Create a file deletion transaction
   */
  static createFileDeleteTransaction(
    filename: string,
    fileContent: string,
    setFiles: (updater: (prev: any) => any) => void,
    language: string = 'plaintext'
  ): TransactionOptions<void> {
    return {
      stateUpdate: () => {
        setFiles((prev: any) => {
          const next = { ...prev };
          delete next[filename];
          return next;
        });
      },
      
      dbOperation: async () => {
        // Find and delete file from database
        // Note: databaseService doesn't have a direct deleteFile by path
        // This is a limitation we'll note for future improvement
        // For now, we'll just ensure state is consistent
        return Promise.resolve();
      },
      
      rollback: () => {
        // Restore deleted file
        setFiles((prev: any) => ({
          ...prev,
          [filename]: {
            name: filename,
            content: fileContent,
            language,
          },
        }));
      },
      
      metadata: {
        operation: 'file_delete',
        context: { filename },
      },
    };
  }

  /**
   * Generate unique transaction ID
   */
  private static generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Log transaction to history
   */
  private static logTransaction(log: TransactionLog): void {
    this.transactionLog.push(log);
    
    // Keep log size manageable
    if (this.transactionLog.length > this.maxLogSize) {
      this.transactionLog.shift();
    }
  }

  /**
   * Get recent transactions
   */
  static getRecentTransactions(count: number = 10): TransactionLog[] {
    return this.transactionLog.slice(-count);
  }

  /**
   * Get transaction statistics
   */
  static getTransactionStats(): {
    total: number;
    successful: number;
    failed: number;
    rolledBack: number;
    averageDuration: number;
    activeCount: number;
  } {
    const successful = this.transactionLog.filter(t => t.success).length;
    const failed = this.transactionLog.filter(t => !t.success).length;
    const rolledBack = this.transactionLog.filter(t => t.rolledBack).length;
    const totalDuration = this.transactionLog.reduce((sum, t) => sum + t.duration, 0);
    
    return {
      total: this.transactionLog.length,
      successful,
      failed,
      rolledBack,
      averageDuration: this.transactionLog.length > 0 
        ? totalDuration / this.transactionLog.length 
        : 0,
      activeCount: this.activeTransactions.size,
    };
  }

  /**
   * Clear transaction log
   */
  static clearTransactionLog(): void {
    this.transactionLog = [];
  }

  /**
   * Check if any transactions are currently active
   */
  static hasActiveTransactions(): boolean {
    return this.activeTransactions.size > 0;
  }

  /**
   * Wait for all active transactions to complete
   */
  static async waitForActiveTransactions(timeoutMs: number = 5000): Promise<boolean> {
    const startTime = Date.now();
    
    while (this.activeTransactions.size > 0) {
      if (Date.now() - startTime > timeoutMs) {
        return false; // Timeout
      }
      
      // Wait 100ms before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    return true; // All transactions completed
  }
}

/**
 * React hook for using state transactions
 * Provides a convenient way to use transactions in React components
 */
export function useStateTransaction() {
  return {
    execute: StateTransaction.execute.bind(StateTransaction),
    executeSequence: StateTransaction.executeSequence.bind(StateTransaction),
    createFileTransaction: StateTransaction.createFileTransaction.bind(StateTransaction),
    createFileDeleteTransaction: StateTransaction.createFileDeleteTransaction.bind(StateTransaction),
    getStats: StateTransaction.getTransactionStats.bind(StateTransaction),
    getRecent: StateTransaction.getRecentTransactions.bind(StateTransaction),
  };
}
