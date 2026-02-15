/**
 * Local AI API Service
 * 
 * Backend API service for interacting with the local AI model
 * - Handles HTTP requests for model inference
 * - Manages model loading/unloading
 * - Provides real-time streaming responses
 * - Integrates with logging system
 */

import { LocalAIModelService, InferenceOptions, InferenceResult } from './localAIModelService';
import { LocalAILogger } from './localAILogger';

export interface LocalAIRequest {
  prompt: string;
  options?: InferenceOptions;
  requestId?: string;
  context?: Array<{ role: string; content: string }>;
}

export interface LocalAIResponse {
  success: boolean;
  response?: string;
  error?: string;
  metadata?: {
    requestId: string;
    latency: number;
    tokens: number;
    modelStatus: string;
  };
}

export interface ModelStatusResponse {
  status: string;
  health: 'OK' | 'DEGRADED' | 'ERROR';
  isLoaded: boolean;
  lastLatency?: number;
}

export class LocalAIApiService {
  private static isInitialized = false;

  /**
   * Initialize the API service
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize logger
      await LocalAILogger.initialize();
      
      // Initialize model service
      await LocalAIModelService.initialize();
      
      await LocalAILogger.log({
        type: 'info',
        category: 'system',
        message: 'Local AI API Service initialized',
      });

      this.isInitialized = true;
    } catch (error: any) {
      await LocalAILogger.logError(
        'Failed to initialize Local AI API Service',
        error
      );
      throw error;
    }
  }

  /**
   * Process a chat request with the local model
   */
  static async processRequest(
    request: LocalAIRequest
  ): Promise<LocalAIResponse> {
    const requestId = request.requestId || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    try {
      await this.ensureInitialized();

      // Log request
      await LocalAILogger.logRequest(
        `Processing request: ${request.prompt.substring(0, 100)}...`,
        { prompt: request.prompt, options: request.options },
        { requestId }
      );

      // Check model status
      const modelStatus = LocalAIModelService.getStatus();
      if (modelStatus !== 'READY' && modelStatus !== 'LOADING') {
        // Try to load model if not loaded
        if (modelStatus === 'UNLOADED' || modelStatus === 'NOT_INSTALLED') {
          await LocalAILogger.logModelLoading(
            'Model not loaded, attempting to load...',
            modelStatus
          );

          try {
            await LocalAIModelService.loadModel();
            await LocalAILogger.logModelLoading(
              'Model loaded successfully',
              'READY'
            );
          } catch (error: any) {
            await LocalAILogger.logError(
              'Failed to load model',
              error,
              { requestId }
            );
            return {
              success: false,
              error: `Model not available: ${error.message}`,
              metadata: {
                requestId,
                latency: Date.now() - startTime,
                tokens: 0,
                modelStatus,
              },
            };
          }
        } else {
          return {
            success: false,
            error: `Model status: ${modelStatus}. Please ensure the model is downloaded and loaded.`,
            metadata: {
              requestId,
              latency: Date.now() - startTime,
              tokens: 0,
              modelStatus,
            },
          };
        }
      }

      // Build prompt with context if provided
      let fullPrompt = request.prompt;
      if (request.context && request.context.length > 0) {
        const contextText = request.context
          .map(msg => `${msg.role}: ${msg.content}`)
          .join('\n\n');
        fullPrompt = `Context:\n${contextText}\n\nUser: ${request.prompt}\n\nAssistant:`;
      }

      // Run inference
      const inferenceOptions: InferenceOptions = {
        maxTokens: request.options?.maxTokens || 512,
        temperature: request.options?.temperature || 0.7,
        timeout: request.options?.timeout || 30000,
        systemPrompt: request.options?.systemPrompt,
      };

      const result: InferenceResult = await LocalAIModelService.infer(
        fullPrompt,
        inferenceOptions
      );

      const latency = Date.now() - startTime;

      // Log response
      await LocalAILogger.logResponse(
        `Response generated: ${result.text.substring(0, 100)}...`,
        { response: result.text },
        {
          requestId,
          latency: result.latency,
          tokens: result.tokens,
          modelStatus: LocalAIModelService.getStatus(),
        }
      );

      // Log performance
      await LocalAILogger.logPerformance(
        'Inference completed',
        result.latency,
        result.tokens,
        { requestId }
      );

      return {
        success: true,
        response: result.text,
        metadata: {
          requestId,
          latency: result.latency,
          tokens: result.tokens,
          modelStatus: LocalAIModelService.getStatus(),
        },
      };
    } catch (error: any) {
      const latency = Date.now() - startTime;

      await LocalAILogger.logError(
        `Request failed: ${error.message}`,
        error,
        { requestId }
      );

      return {
        success: false,
        error: error.message || 'Unknown error occurred',
        metadata: {
          requestId,
          latency,
          tokens: 0,
          modelStatus: LocalAIModelService.getStatus(),
        },
      };
    }
  }

  /**
   * Get model status
   */
  static async getModelStatus(): Promise<ModelStatusResponse> {
    await this.ensureInitialized();

    const status = LocalAIModelService.getStatus();
    const health = LocalAIModelService.getHealthStatus();
    const lastLatency = LocalAIModelService.getLastLatency();

    return {
      status,
      health,
      isLoaded: status === 'READY',
      lastLatency: lastLatency > 0 ? lastLatency : undefined,
    };
  }

  /**
   * Load model
   */
  static async loadModel(): Promise<{ success: boolean; error?: string }> {
    await this.ensureInitialized();

    try {
      await LocalAILogger.logModelLoading('Loading model...', 'LOADING');
      await LocalAIModelService.loadModel();
      await LocalAILogger.logModelLoading('Model loaded successfully', 'READY');
      return { success: true };
    } catch (error: any) {
      await LocalAILogger.logError('Failed to load model', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Unload model
   */
  static async unloadModel(): Promise<{ success: boolean; error?: string }> {
    await this.ensureInitialized();

    try {
      await LocalAILogger.logModelLoading('Unloading model...', 'UNLOADING');
      await LocalAIModelService.unloadModel();
      await LocalAILogger.logModelLoading('Model unloaded', 'UNLOADED');
      return { success: true };
    } catch (error: any) {
      await LocalAILogger.logError('Failed to unload model', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Download model
   */
  static async downloadModel(
    progressCallback?: (progress: { bytesDownloaded: number; totalBytes: number; percentage: number; speed: number }) => void
  ): Promise<{ success: boolean; error?: string }> {
    await this.ensureInitialized();

    try {
      await LocalAILogger.logModelDownload('Starting model download...', 0);

      await LocalAIModelService.downloadModel((progress) => {
        const percentage = progress.percentage;
        await LocalAILogger.logModelDownload(
          `Download progress: ${percentage.toFixed(1)}%`,
          percentage,
          progress
        );
        if (progressCallback) {
          progressCallback(progress);
        }
      });

      await LocalAILogger.logModelDownload('Model download completed', 100);
      return { success: true };
    } catch (error: any) {
      await LocalAILogger.logError('Model download failed', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Health check
   */
  static async healthCheck(): Promise<{
    healthy: boolean;
    status: string;
    health: string;
  }> {
    await this.ensureInitialized();

    try {
      const status = LocalAIModelService.getStatus();
      const health = LocalAIModelService.getHealthStatus();
      const isHealthy = status === 'READY' && health === 'OK';

      if (isHealthy) {
        // Run a quick inference test
        const testResult = await LocalAIModelService.healthCheck();
        return {
          healthy: testResult,
          status,
          health,
        };
      }

      return {
        healthy: false,
        status,
        health,
      };
    } catch (error: any) {
      await LocalAILogger.logError('Health check failed', error);
      return {
        healthy: false,
        status: 'ERROR',
        health: 'ERROR',
      };
    }
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
    await this.ensureInitialized();
    return await LocalAILogger.getLogs(filter);
  }

  /**
   * Get statistics
   */
  static async getStatistics() {
    await this.ensureInitialized();
    return await LocalAILogger.getStatistics();
  }

  /**
   * Private helpers
   */
  private static async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }
}
