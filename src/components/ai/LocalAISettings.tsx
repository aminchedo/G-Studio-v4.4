/**
 * Local AI Settings Component
 * 
 * Dedicated UI for managing local AI model:
 * - Download progress
 * - Model activation
 * - Status display
 * - Settings toggles
 */

import React, { useState, useEffect } from 'react';
import { Download, Pause, Play, Square, Loader2, CheckCircle, XCircle, AlertCircle, Cpu, Zap } from 'lucide-react';
import { LocalAIModelService, DownloadProgress } from '@/services/localAIModelService';
import { PromptProfessionalizer } from '@/services/promptProfessionalizer';
import { HybridDecisionEngine } from '@/services/hybridDecisionEngine';

export const LocalAISettings: React.FC = () => {
  const [modelStatus, setModelStatus] = useState(LocalAIModelService.getStatus());
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [promptImprovementEnabled, setPromptImprovementEnabled] = useState(false);
  const [promptMode, setPromptMode] = useState<'deterministic' | 'creative'>('deterministic');
  const [aiModePreference, setAiModePreference] = useState<string>('auto');
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize services
    const initServices = async () => {
      try {
        await LocalAIModelService.initialize();
        await PromptProfessionalizer.initialize();
        await HybridDecisionEngine.initialize();

        // Load settings
        try {
          const enabled = PromptProfessionalizer.isEnabled();
          setPromptImprovementEnabled(enabled);
          const mode = PromptProfessionalizer.getMode();
          setPromptMode(mode);
          const pref = HybridDecisionEngine.getUserPreference();
          setAiModePreference(pref || 'auto');
        } catch (error) {
          console.warn('[LocalAISettings] Failed to load settings:', error);
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('[LocalAISettings] Initialization failed:', error);
        if (typeof window !== 'undefined' && (window as any).showError) {
          (window as any).showError('Failed to initialize Local AI services');
        }
      }
    };

    initServices();

    // Poll for status updates
    const interval = setInterval(() => {
      setModelStatus(LocalAIModelService.getStatus());
      setDownloadProgress(LocalAIModelService.getDownloadProgress());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleDownload = async () => {
    // Check if initialized
    if (!isInitialized) {
      const errorMsg = 'Local AI services are still initializing. Please wait...';
      if (typeof window !== 'undefined' && (window as any).showError) {
        (window as any).showError(errorMsg);
      } else {
        console.error(errorMsg);
      }
      return;
    }

    // Check if Electron IPC is available
    if (typeof window === 'undefined' || !(window as any).electron?.ipcRenderer) {
      const errorMsg = 'Electron IPC is not available. Download requires Electron environment.';
      if (typeof window !== 'undefined' && (window as any).showError) {
        (window as any).showError(errorMsg);
      } else {
        console.error(errorMsg);
      }
      return;
    }

    setIsDownloading(true);
    try {
      await LocalAIModelService.downloadModel((progress) => {
        setDownloadProgress(progress);
      });
      console.log('[UI_ACTION]: EXECUTED (download)');
    } catch (error: any) {
      console.error('Download failed:', error);
      console.log('[UI_ACTION]: FAILED (download)');
      const errorMsg = `Download failed: ${error.message || 'Unknown error'}`;
      if (typeof window !== 'undefined' && (window as any).showError) {
        (window as any).showError(errorMsg);
      } else {
        console.error(errorMsg);
      }
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
      setModelStatus(LocalAIModelService.getStatus());
    }
  };

  const handlePauseDownload = () => {
    try {
      LocalAIModelService.pauseDownload();
      setIsDownloading(false);
      setModelStatus(LocalAIModelService.getStatus());
      console.log('[UI_ACTION]: EXECUTED (pause)');
    } catch (error) {
      console.error('Pause failed:', error);
      console.log('[UI_ACTION]: FAILED (pause)');
    }
  };

  const handleResumeDownload = async () => {
    setIsDownloading(true);
    try {
      await LocalAIModelService.resumeDownload((progress) => {
        setDownloadProgress(progress);
      });
      console.log('[UI_ACTION]: EXECUTED (resume)');
    } catch (error: any) {
      console.error('Resume failed:', error);
      console.log('[UI_ACTION]: FAILED (resume)');
      const errorMsg = `Resume failed: ${error.message}`;
      if (typeof window !== 'undefined' && (window as any).showError) {
        (window as any).showError(errorMsg);
      } else {
        console.error(errorMsg);
      }
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
      setModelStatus(LocalAIModelService.getStatus());
    }
  };

  const handleStopDownload = () => {
    try {
      LocalAIModelService.stopDownload();
      setIsDownloading(false);
      setDownloadProgress(null);
      setModelStatus(LocalAIModelService.getStatus());
      console.log('[UI_ACTION]: EXECUTED (stop)');
    } catch (error) {
      console.error('Stop failed:', error);
      console.log('[UI_ACTION]: FAILED (stop)');
    }
  };

  const handleLoadModel = async () => {
    setIsLoading(true);
    try {
      await LocalAIModelService.loadModel();
      setModelStatus(LocalAIModelService.getStatus());
      console.log('[UI_ACTION]: EXECUTED (load)');
    } catch (error: any) {
      console.error('Load failed:', error);
      console.log('[UI_ACTION]: FAILED (load)');
      const errorMsg = `Failed to load model: ${error.message}`;
      if (typeof window !== 'undefined' && (window as any).showError) {
        (window as any).showError(errorMsg);
      } else {
        console.error(errorMsg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUnloadModel = async () => {
    try {
      await LocalAIModelService.unloadModel();
      setModelStatus(LocalAIModelService.getStatus());
    } catch (error: any) {
      console.error('Unload failed:', error);
    }
  };

  const handleTogglePromptImprovement = async (enabled: boolean) => {
    try {
      await PromptProfessionalizer.setEnabled(enabled);
      setPromptImprovementEnabled(enabled);
      console.log('[UI_ACTION]: EXECUTED (toggle prompt improvement)');
    } catch (error) {
      console.error('Toggle failed:', error);
      console.log('[UI_ACTION]: FAILED (toggle prompt improvement)');
    }
  };

  const handleSetPromptMode = async (mode: 'deterministic' | 'creative') => {
    try {
      await PromptProfessionalizer.setMode(mode);
      setPromptMode(mode);
      console.log('[UI_ACTION]: EXECUTED (set prompt mode)');
    } catch (error) {
      console.error('Set mode failed:', error);
      console.log('[UI_ACTION]: FAILED (set prompt mode)');
    }
  };

  const handleSetAIMode = async (mode: string) => {
    try {
      if (mode === 'auto') {
        await HybridDecisionEngine.setUserPreference(null);
      } else {
        await HybridDecisionEngine.setUserPreference(mode as any);
      }
      setAiModePreference(mode);
      console.log('[UI_ACTION]: EXECUTED (set AI mode)');
    } catch (error) {
      console.error('Set AI mode failed:', error);
      console.log('[UI_ACTION]: FAILED (set AI mode)');
    }
  };

  const getStatusIcon = () => {
    switch (modelStatus) {
      case 'READY':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'ERROR':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'DOWNLOADING':
        return <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />;
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
      case 'DOWNLOADING':
        return 'Downloading...';
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
    <div className="space-y-6">
      {/* Model Status */}
      <section>
        <h4 className="text-xs text-purple-300 mb-3 flex items-center gap-2 uppercase tracking-widest">
          <Cpu strokeWidth={1.5} className="w-4 h-4" /> Local AI Model
        </h4>
        <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl">
          {modelStatus === 'NOT_INSTALLED' && (
            <div className="mb-4 p-3 bg-purple-900/20 border border-purple-700/40 rounded-lg">
              <p className="text-xs text-purple-200 leading-relaxed">
                💡 <strong>Recommended:</strong> Download the local AI model for optimal offline usage and faster responses. The model works completely offline once downloaded.
              </p>
            </div>
          )}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {getStatusIcon()}
              <span className="text-sm text-slate-200">{getStatusText()}</span>
            </div>
            {modelStatus === 'READY' && (
              <button
                onClick={handleUnloadModel}
                className="text-xs text-slate-400 hover:text-slate-200 px-3 py-1 rounded-lg border border-slate-700/60 hover:border-slate-600 transition-colors"
              >
                Unload
              </button>
            )}
          </div>

          {/* Download Progress */}
          {downloadProgress && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  {((downloadProgress.bytesDownloaded / downloadProgress.totalBytes) * 100).toFixed(1)}%
                </span>
                <span className="text-slate-400">
                  {(downloadProgress.speed / 1024 / 1024).toFixed(2)} MB/s
                </span>
              </div>
              <div className="w-full bg-slate-700/40 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${downloadProgress.percentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            {modelStatus === 'NOT_INSTALLED' || modelStatus === 'UNLOADED' ? (
              <button
                onClick={handleDownload}
                disabled={isDownloading}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Download Model
                  </>
                )}
              </button>
            ) : null}

            {modelStatus === 'DOWNLOADING' && (
              <>
                <button
                  onClick={handlePauseDownload}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition-colors flex items-center gap-2"
                >
                  <Pause className="w-4 h-4" />
                  Pause
                </button>
                <button
                  onClick={handleStopDownload}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg transition-colors flex items-center gap-2"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </button>
              </>
            )}

            {(modelStatus === 'UNLOADED' && downloadProgress && downloadProgress.percentage < 100) && (
              <button
                onClick={handleResumeDownload}
                disabled={isDownloading}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Resuming...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Resume Download
                  </>
                )}
              </button>
            )}

            {(modelStatus === 'UNLOADED' || modelStatus === 'NOT_INSTALLED') && modelStatus !== 'NOT_INSTALLED' && (
              <button
                onClick={handleLoadModel}
                disabled={isLoading}
                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Load Model
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Prompt Improvement */}
      <section>
        <h4 className="text-xs text-purple-300 mb-3 flex items-center gap-2 uppercase tracking-widest">
          <Zap strokeWidth={1.5} className="w-4 h-4" /> Prompt Improvement
        </h4>
        <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-slate-200">Enable Prompt Improvement</span>
            <input
              type="checkbox"
              checked={promptImprovementEnabled}
              onChange={(e) => handleTogglePromptImprovement(e.target.checked)}
              className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-purple-600 focus:ring-purple-500 focus:ring-offset-slate-900"
            />
          </label>

          {promptImprovementEnabled && (
            <div className="space-y-2">
              <label className="text-xs text-slate-400">Mode:</label>
              <select
                value={promptMode}
                onChange={(e) => handleSetPromptMode(e.target.value as 'deterministic' | 'creative')}
                className="w-full px-3 py-2 bg-slate-700/60 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="deterministic">Deterministic (Preserve Exact Meaning)</option>
                <option value="creative">Creative (Enhance Clarity)</option>
              </select>
            </div>
          )}
        </div>
      </section>

      {/* AI Mode Preference */}
      <section>
        <h4 className="text-xs text-purple-300 mb-3 flex items-center gap-2 uppercase tracking-widest">
          <Cpu strokeWidth={1.5} className="w-4 h-4" /> AI Mode Preference
        </h4>
        <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-xl">
          <select
            value={aiModePreference}
            onChange={(e) => handleSetAIMode(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/60 border border-slate-600 rounded-lg text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="auto">Auto (Recommended)</option>
            <option value="CLOUD">Cloud Only</option>
            <option value="LOCAL">Local Only</option>
            <option value="HYBRID">Hybrid</option>
          </select>
          <p className="text-xs text-slate-400 mt-2">
            Auto mode intelligently chooses between cloud and local AI based on network, task complexity, and availability.
          </p>
        </div>
      </section>
    </div>
  );
};
