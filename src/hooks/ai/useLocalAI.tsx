/**
 * useLocalAI - Local AI model management hook
 * 
 * Manages downloading, loading, and running local AI models
 * Supports Hugging Face models and custom model sources
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// Types
export interface LocalModel {
  id: string;
  name: string;
  size: number;
  format: string;
  path: string;
  isLoaded: boolean;
  capabilities: string[];
  source: 'huggingface' | 'custom' | 'local';
  metadata?: {
    description?: string;
    author?: string;
    license?: string;
    contextLength?: number;
    parameters?: string;
  };
}

export interface DownloadProgress {
  modelId: string;
  progress: number;
  status: 'pending' | 'downloading' | 'completed' | 'error' | 'paused';
  bytesDownloaded: number;
  totalBytes: number;
  speed: number;
  eta: number;
  error?: string;
}

export interface InferenceOptions {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  stream?: boolean;
  stopSequences?: string[];
  repeatPenalty?: number;
}

export interface InferenceResult {
  success: boolean;
  output: string;
  tokens: number;
  duration: number;
  tokensPerSecond: number;
  error?: string;
}

export interface UseLocalAIReturn {
  // State
  models: LocalModel[];
  activeModel: string | null;
  downloadProgress: Record<string, DownloadProgress>;
  isLoading: boolean;
  isInferencing: boolean;
  error: string | null;
  
  // Model Management
  downloadModel: (modelId: string, source?: 'huggingface' | 'custom', url?: string) => Promise<void>;
  cancelDownload: (modelId: string) => void;
  pauseDownload: (modelId: string) => void;
  resumeDownload: (modelId: string) => void;
  deleteModel: (modelId: string) => Promise<void>;
  loadModel: (modelId: string) => Promise<void>;
  unloadModel: (modelId: string) => Promise<void>;
  
  // Inference
  inference: (prompt: string, options?: InferenceOptions) => Promise<InferenceResult>;
  streamInference: (
    prompt: string,
    onToken: (token: string) => void,
    options?: InferenceOptions
  ) => Promise<InferenceResult>;
  cancelInference: () => void;
  
  // Utilities
  setActiveModel: (modelId: string) => void;
  refreshModels: () => Promise<void>;
  getModelInfo: (modelId: string) => LocalModel | undefined;
  estimateMemoryUsage: (modelId: string) => number;
}

// Simulated model registry (in production, would be from actual storage)
const MODEL_REGISTRY: Record<string, Omit<LocalModel, 'isLoaded' | 'path'>> = {
  'TinyLlama-1.1B': {
    id: 'TinyLlama-1.1B',
    name: 'TinyLlama 1.1B',
    size: 637000000,
    format: 'GGUF',
    capabilities: ['chat', 'completion'],
    source: 'huggingface',
    metadata: {
      description: 'Small but capable language model',
      parameters: '1.1B',
      contextLength: 2048,
    },
  },
  'Phi-2': {
    id: 'Phi-2',
    name: 'Microsoft Phi-2',
    size: 1600000000,
    format: 'GGUF',
    capabilities: ['chat', 'completion', 'code'],
    source: 'huggingface',
    metadata: {
      description: 'Efficient small language model by Microsoft',
      author: 'Microsoft',
      parameters: '2.7B',
      contextLength: 2048,
    },
  },
  'Mistral-7B': {
    id: 'Mistral-7B',
    name: 'Mistral 7B',
    size: 4100000000,
    format: 'GGUF',
    capabilities: ['chat', 'completion', 'code', 'reasoning'],
    source: 'huggingface',
    metadata: {
      description: 'High-quality 7B parameter model',
      author: 'Mistral AI',
      parameters: '7B',
      contextLength: 8192,
    },
  },
};

/**
 * useLocalAI hook
 */
export function useLocalAI(): UseLocalAIReturn {
  // State
  const [models, setModels] = useState<LocalModel[]>([]);
  const [activeModel, setActiveModelState] = useState<string | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<Record<string, DownloadProgress>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isInferencing, setIsInferencing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs
  const downloadControllersRef = useRef<Map<string, AbortController>>(new Map());
  const inferenceControllerRef = useRef<AbortController | null>(null);

  // Initialize models from storage
  useEffect(() => {
    refreshModels();
  }, []);

  // Refresh models list
  const refreshModels = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      // In production, this would scan local storage/file system
      // For now, return models from registry that are "downloaded"
      const storedModels = localStorage.getItem('localAI_models');
      if (storedModels) {
        setModels(JSON.parse(storedModels));
      }
    } catch (err) {
      setError('Failed to load models');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Download model
  const downloadModel = useCallback(async (
    modelId: string,
    source: 'huggingface' | 'custom' = 'huggingface',
    url?: string
  ): Promise<void> => {
    const modelInfo = MODEL_REGISTRY[modelId];
    if (!modelInfo && !url) {
      throw new Error(`Model ${modelId} not found in registry`);
    }

    const controller = new AbortController();
    downloadControllersRef.current.set(modelId, controller);

    const totalBytes = modelInfo?.size || 1000000000;
    
    setDownloadProgress(prev => ({
      ...prev,
      [modelId]: {
        modelId,
        progress: 0,
        status: 'downloading',
        bytesDownloaded: 0,
        totalBytes,
        speed: 0,
        eta: 0,
      },
    }));

    try {
      // Simulate download progress
      // In production, this would use fetch with progress tracking
      const simulateDownload = async () => {
        const chunkSize = totalBytes / 100;
        let downloaded = 0;
        const startTime = Date.now();

        for (let i = 0; i < 100; i++) {
          if (controller.signal.aborted) {
            throw new Error('Download cancelled');
          }

          await new Promise(resolve => setTimeout(resolve, 50));
          downloaded += chunkSize;
          
          const elapsed = (Date.now() - startTime) / 1000;
          const speed = downloaded / elapsed;
          const remaining = totalBytes - downloaded;
          const eta = remaining / speed;

          setDownloadProgress(prev => ({
            ...prev,
            [modelId]: {
              ...prev[modelId],
              progress: (i + 1),
              bytesDownloaded: downloaded,
              speed,
              eta,
            },
          }));
        }
      };

      await simulateDownload();

      // Add model to list
      const newModel: LocalModel = {
        ...(modelInfo || {
          id: modelId,
          name: modelId,
          size: totalBytes,
          format: 'GGUF',
          capabilities: ['chat'],
          source,
        }),
        path: `/models/${modelId}`,
        isLoaded: false,
      };

      setModels(prev => {
        const updated = [...prev.filter(m => m.id !== modelId), newModel];
        localStorage.setItem('localAI_models', JSON.stringify(updated));
        return updated;
      });

      setDownloadProgress(prev => ({
        ...prev,
        [modelId]: {
          ...prev[modelId],
          progress: 100,
          status: 'completed',
          bytesDownloaded: totalBytes,
        },
      }));
    } catch (err) {
      setDownloadProgress(prev => ({
        ...prev,
        [modelId]: {
          ...prev[modelId],
          status: 'error',
          error: err instanceof Error ? err.message : 'Download failed',
        },
      }));
      throw err;
    } finally {
      downloadControllersRef.current.delete(modelId);
    }
  }, []);

  // Cancel download
  const cancelDownload = useCallback((modelId: string) => {
    const controller = downloadControllersRef.current.get(modelId);
    if (controller) {
      controller.abort();
      downloadControllersRef.current.delete(modelId);
    }
    setDownloadProgress(prev => {
      const updated = { ...prev };
      delete updated[modelId];
      return updated;
    });
  }, []);

  // Pause download
  const pauseDownload = useCallback((modelId: string) => {
    setDownloadProgress(prev => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        status: 'paused',
      },
    }));
  }, []);

  // Resume download
  const resumeDownload = useCallback((modelId: string) => {
    setDownloadProgress(prev => ({
      ...prev,
      [modelId]: {
        ...prev[modelId],
        status: 'downloading',
      },
    }));
  }, []);

  // Delete model
  const deleteModel = useCallback(async (modelId: string): Promise<void> => {
    setModels(prev => {
      const updated = prev.filter(m => m.id !== modelId);
      localStorage.setItem('localAI_models', JSON.stringify(updated));
      return updated;
    });

    if (activeModel === modelId) {
      setActiveModelState(null);
    }
  }, [activeModel]);

  // Load model
  const loadModel = useCallback(async (modelId: string): Promise<void> => {
    const model = models.find(m => m.id === modelId);
    if (!model) {
      throw new Error(`Model ${modelId} not found`);
    }

    setIsLoading(true);
    try {
      // Simulate model loading
      await new Promise(resolve => setTimeout(resolve, 1000));

      setModels(prev =>
        prev.map(m =>
          m.id === modelId ? { ...m, isLoaded: true } : m
        )
      );
      setActiveModelState(modelId);
    } catch (err) {
      setError(`Failed to load model: ${err}`);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [models]);

  // Unload model
  const unloadModel = useCallback(async (modelId: string): Promise<void> => {
    setModels(prev =>
      prev.map(m =>
        m.id === modelId ? { ...m, isLoaded: false } : m
      )
    );

    if (activeModel === modelId) {
      setActiveModelState(null);
    }
  }, [activeModel]);

  // Set active model
  const setActiveModel = useCallback((modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (model) {
      setActiveModelState(modelId);
    }
  }, [models]);

  // Inference
  const inference = useCallback(async (
    prompt: string,
    options: InferenceOptions = {}
  ): Promise<InferenceResult> => {
    if (!activeModel) {
      throw new Error('No model loaded');
    }

    setIsInferencing(true);
    inferenceControllerRef.current = new AbortController();

    const startTime = Date.now();

    try {
      // Simulate inference
      // In production, this would call the actual inference engine
      await new Promise(resolve => setTimeout(resolve, 500));

      const output = `[Simulated response from ${activeModel}]\n\nBased on your prompt: "${prompt.substring(0, 50)}..."\n\nThis is a simulated response. In production, this would be generated by the local AI model.`;
      const tokens = Math.ceil(output.length / 4);
      const duration = Date.now() - startTime;

      return {
        success: true,
        output,
        tokens,
        duration,
        tokensPerSecond: tokens / (duration / 1000),
      };
    } catch (err) {
      return {
        success: false,
        output: '',
        tokens: 0,
        duration: Date.now() - startTime,
        tokensPerSecond: 0,
        error: err instanceof Error ? err.message : 'Inference failed',
      };
    } finally {
      setIsInferencing(false);
      inferenceControllerRef.current = null;
    }
  }, [activeModel]);

  // Stream inference
  const streamInference = useCallback(async (
    prompt: string,
    onToken: (token: string) => void,
    options: InferenceOptions = {}
  ): Promise<InferenceResult> => {
    if (!activeModel) {
      throw new Error('No model loaded');
    }

    setIsInferencing(true);
    inferenceControllerRef.current = new AbortController();

    const startTime = Date.now();
    let output = '';
    let tokens = 0;

    try {
      // Simulate streaming inference
      const response = `This is a simulated streaming response from ${activeModel}. Each word is sent as a separate token to demonstrate streaming functionality.`;
      const words = response.split(' ');

      for (const word of words) {
        if (inferenceControllerRef.current?.signal.aborted) {
          throw new Error('Inference cancelled');
        }

        await new Promise(resolve => setTimeout(resolve, 50));
        const token = word + ' ';
        output += token;
        tokens++;
        onToken(token);
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        output,
        tokens,
        duration,
        tokensPerSecond: tokens / (duration / 1000),
      };
    } catch (err) {
      return {
        success: false,
        output,
        tokens,
        duration: Date.now() - startTime,
        tokensPerSecond: 0,
        error: err instanceof Error ? err.message : 'Inference failed',
      };
    } finally {
      setIsInferencing(false);
      inferenceControllerRef.current = null;
    }
  }, [activeModel]);

  // Cancel inference
  const cancelInference = useCallback(() => {
    if (inferenceControllerRef.current) {
      inferenceControllerRef.current.abort();
      inferenceControllerRef.current = null;
    }
    setIsInferencing(false);
  }, []);

  // Get model info
  const getModelInfo = useCallback((modelId: string): LocalModel | undefined => {
    return models.find(m => m.id === modelId);
  }, [models]);

  // Estimate memory usage
  const estimateMemoryUsage = useCallback((modelId: string): number => {
    const model = models.find(m => m.id === modelId);
    if (!model) return 0;
    // Rough estimate: model size * 1.2 for runtime overhead
    return model.size * 1.2;
  }, [models]);

  // Cleanup
  useEffect(() => {
    return () => {
      downloadControllersRef.current.forEach(controller => controller.abort());
      if (inferenceControllerRef.current) {
        inferenceControllerRef.current.abort();
      }
    };
  }, []);

  return {
    models,
    activeModel,
    downloadProgress,
    isLoading,
    isInferencing,
    error,
    downloadModel,
    cancelDownload,
    pauseDownload,
    resumeDownload,
    deleteModel,
    loadModel,
    unloadModel,
    inference,
    streamInference,
    cancelInference,
    setActiveModel,
    refreshModels,
    getModelInfo,
    estimateMemoryUsage,
  };
}

export default useLocalAI;
