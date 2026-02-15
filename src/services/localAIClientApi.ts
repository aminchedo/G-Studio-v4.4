/**
 * Local AI Client API
 * 
 * Client-side API handlers for interacting with the local AI model
 * Works in browser environment - calls LocalAIApiService directly
 */

import { LocalAIApiService, LocalAIRequest, LocalAIResponse, ModelStatusResponse } from './localAIApiService';
import { LocalAILogger } from './localAILogger';

export class LocalAIClientApi {
  /**
   * Initialize the client API
   */
  static async initialize(): Promise<void> {
    await LocalAIApiService.initialize();
  }

  /**
   * Send a chat message to the local model
   */
  static async chat(
    prompt: string,
    options?: {
      maxTokens?: number;
      temperature?: number;
      timeout?: number;
      systemPrompt?: string;
      context?: Array<{ role: string; content: string }>;
      requestId?: string;
    }
  ): Promise<LocalAIResponse> {
    const request: LocalAIRequest = {
      prompt,
      options: {
        maxTokens: options?.maxTokens,
        temperature: options?.temperature,
        timeout: options?.timeout,
        systemPrompt: options?.systemPrompt,
      },
      requestId: options?.requestId,
      context: options?.context,
    };

    return await LocalAIApiService.processRequest(request);
  }

  /**
   * Get model status
   */
  static async getStatus(): Promise<ModelStatusResponse> {
    return await LocalAIApiService.getModelStatus();
  }

  /**
   * Load model
   */
  static async loadModel(): Promise<{ success: boolean; error?: string }> {
    return await LocalAIApiService.loadModel();
  }

  /**
   * Unload model
   */
  static async unloadModel(): Promise<{ success: boolean; error?: string }> {
    return await LocalAIApiService.unloadModel();
  }

  /**
   * Download model with progress callback
   */
  static async downloadModel(
    onProgress?: (progress: { bytesDownloaded: number; totalBytes: number; percentage: number; speed: number }) => void
  ): Promise<{ success: boolean; error?: string }> {
    return await LocalAIApiService.downloadModel(onProgress);
  }

  /**
   * Health check
   */
  static async healthCheck(): Promise<{
    healthy: boolean;
    status: string;
    health: string;
  }> {
    return await LocalAIApiService.healthCheck();
  }

  /**
   * Get logs
   */
  static async getLogs(filter?: {
    type?: string;
    category?: string;
    startTime?: number;
    endTime?: number;
    searchText?: string;
  }) {
    return await LocalAIApiService.getLogs(filter);
  }

  /**
   * Get statistics
   */
  static async getStatistics() {
    return await LocalAIApiService.getStatistics();
  }

  /**
   * Subscribe to real-time log updates
   */
  static subscribeToLogs(
    callback: (entry: any) => void
  ): () => void {
    return LocalAILogger.subscribe(callback);
  }

  /**
   * Export logs as JSON
   */
  static async exportLogs(filter?: {
    type?: string;
    category?: string;
    startTime?: number;
    endTime?: number;
    searchText?: string;
  }): Promise<string> {
    return await LocalAILogger.exportLogs(filter);
  }

  /**
   * Clear logs
   */
  static async clearLogs(): Promise<void> {
    return await LocalAILogger.clearLogs();
  }
}
