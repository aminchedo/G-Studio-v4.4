/**
 * Local AI Test Panel
 * 
 * Interactive panel for testing the local AI model in browser mode
 * Allows direct interaction with the model for testing and demonstration
 */

import React, { useState, useEffect } from 'react';
import { Send, Loader2, CheckCircle, XCircle, AlertCircle, Cpu } from 'lucide-react';
import { LocalAIModelService, InferenceResult } from '@/services/localAIModelService';

export const LocalAITestPanel: React.FC = () => {
  const [modelStatus, setModelStatus] = useState(LocalAIModelService.getStatus());
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inferenceStats, setInferenceStats] = useState<{ latency: number; tokens: number } | null>(null);

  useEffect(() => {
    // Poll for status updates
    const interval = setInterval(() => {
      setModelStatus(LocalAIModelService.getStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleInitialize = async () => {
    try {
      await LocalAIModelService.initialize();
      setModelStatus(LocalAIModelService.getStatus());
    } catch (err: any) {
      setError(`Initialization failed: ${err.message}`);
    }
  };

  const handleLoadModel = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await LocalAIModelService.loadModel();
      setModelStatus(LocalAIModelService.getStatus());
    } catch (err: any) {
      setError(`Load failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInfer = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    if (modelStatus !== 'READY') {
      setError('Model is not ready. Please load the model first.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setResponse(null);
    setInferenceStats(null);

    try {
      const startTime = Date.now();
      const result: InferenceResult = await LocalAIModelService.infer(prompt, {
        maxTokens: 512,
        temperature: 0.7,
        timeout: 30000,
      });
      
      const latency = Date.now() - startTime;
      setResponse(result.text);
      setInferenceStats({
        latency: result.latency,
        tokens: result.tokens,
      });
    } catch (err: any) {
      setError(`Inference failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = () => {
    switch (modelStatus) {
      case 'READY':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'ERROR':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'LOADING':
        return <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-400" />;
    }
  };

  const getStatusText = () => {
    switch (modelStatus) {
      case 'NOT_INSTALLED':
        return 'Not Installed';
      case 'UNLOADED':
        return 'Ready (Not Loaded)';
      case 'LOADING':
        return 'Loading...';
      case 'READY':
        return 'Ready';
      case 'ERROR':
        return 'Error';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-4 p-6 bg-slate-900/50 border border-slate-700/60 rounded-xl">
      <div className="flex items-center gap-3 mb-4">
        <Cpu className="w-6 h-6 text-purple-400" />
        <h3 className="text-lg font-semibold text-slate-200">Local AI Model Test</h3>
      </div>

      {/* Status */}
      <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            {getStatusIcon()}
            <span className="text-sm text-slate-200">{getStatusText()}</span>
          </div>
          {modelStatus === 'NOT_INSTALLED' && (
            <button
              onClick={handleInitialize}
              className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
            >
              Initialize
            </button>
          )}
          {(modelStatus === 'UNLOADED' || modelStatus === 'NOT_INSTALLED') && (
            <button
              onClick={handleLoadModel}
              disabled={isLoading}
              className="text-xs px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Loading...' : 'Load Model'}
            </button>
          )}
        </div>
        {modelStatus === 'NOT_INSTALLED' && (
          <p className="text-xs text-slate-400 mt-2">
            💡 In browser mode, you need to download the model first via Settings → Local AI
          </p>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-3 bg-red-900/20 border border-red-700/40 rounded-lg">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="space-y-2">
        <label className="text-sm text-slate-300">Prompt:</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Enter your prompt here (e.g., 'Write a hello world function in Python')"
          className="w-full px-4 py-3 bg-slate-800/60 border border-slate-700/60 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
          rows={4}
          disabled={modelStatus !== 'READY' || isLoading}
        />
        <button
          onClick={handleInfer}
          disabled={modelStatus !== 'READY' || isLoading || !prompt.trim()}
          className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Run Inference
            </>
          )}
        </button>
      </div>

      {/* Response */}
      {response && (
        <div className="space-y-2">
          <label className="text-sm text-slate-300">Response:</label>
          <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-lg">
            <pre className="text-sm text-slate-200 whitespace-pre-wrap font-mono">
              {response}
            </pre>
          </div>
          {inferenceStats && (
            <div className="flex gap-4 text-xs text-slate-400">
              <span>Latency: {inferenceStats.latency}ms</span>
              <span>Tokens: ~{inferenceStats.tokens}</span>
            </div>
          )}
        </div>
      )}

      {/* Info */}
      <div className="p-3 bg-blue-900/20 border border-blue-700/40 rounded-lg">
        <p className="text-xs text-blue-300">
          <strong>Note:</strong> In browser mode, full inference requires WebAssembly setup. 
          For complete functionality, use Electron mode (npm run electron:dev).
        </p>
      </div>
    </div>
  );
};
