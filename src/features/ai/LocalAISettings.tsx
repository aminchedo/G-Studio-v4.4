/**
 * Local AI Settings Component
 * 
 * Compact, minimal UI for managing local AI:
 * - Attractive sliders with metallic highlights
 * - Minimal toggles and controls
 * - Modern aesthetic
 */

import React, { useState, useEffect } from 'react';
import { Download, Pause, Play, Square, Loader2, CheckCircle, XCircle, AlertCircle, Cpu, Zap, Sliders as SlidersIcon } from 'lucide-react';
import { LocalAIModelService, DownloadProgress } from '@/services/ai/localAIModelService';
import { PromptProfessionalizer } from '@/services/promptProfessionalizer';
import { HybridDecisionEngine } from '@/services/hybridDecisionEngine';

// Minimal Slider Component with metallic aesthetic
const MinimalSlider: React.FC<{
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  color?: string;
}> = ({ label, value, onChange, min = 0, max = 100, step = 1, unit = '', color = '#3b82f6' }) => {
  const percentage = ((value - min) / (max - min)) * 100;
  
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-medium text-slate-600">{label}</label>
        <span className="text-[10px] font-semibold text-slate-700 px-1.5 py-0.5 rounded bg-slate-100/80">
          {value}{unit}
        </span>
      </div>
      <div className="relative h-1.5 bg-slate-200/60 rounded-full overflow-hidden">
        <div 
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-200"
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(90deg, ${color} 0%, ${color}dd 100%)`,
            boxShadow: `0 0 8px ${color}40`
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
      </div>
    </div>
  );
};

// Minimal Toggle Component
const MinimalToggle: React.FC<{
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  color?: string;
}> = ({ label, checked, onChange, color = '#3b82f6' }) => {
  return (
    <label className="flex items-center justify-between cursor-pointer group">
      <span className="text-[11px] font-medium text-slate-700">{label}</span>
      <div 
        className={`relative w-9 h-5 rounded-full transition-all duration-200 ${
          checked ? 'bg-opacity-100' : 'bg-slate-300'
        }`}
        style={checked ? { 
          background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
          boxShadow: `0 2px 6px ${color}30`
        } : undefined}
        onClick={() => onChange(!checked)}
      >
        <div 
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-200 ${
            checked ? 'left-[18px]' : 'left-0.5'
          }`}
          style={{
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.15)'
          }}
        />
      </div>
    </label>
  );
};

export const LocalAISettings: React.FC = () => {
  const [modelStatus, setModelStatus] = useState(LocalAIModelService.getStatus());
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [promptImprovementEnabled, setPromptImprovementEnabled] = useState(false);
  const [promptMode, setPromptMode] = useState<'deterministic' | 'creative'>('deterministic');
  const [aiModePreference, setAiModePreference] = useState<string>('auto');
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Slider states for demonstration
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [topP, setTopP] = useState(0.9);
  const [frequencyPenalty, setFrequencyPenalty] = useState(0);
  const [presencePenalty, setPresencePenalty] = useState(0);

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
    <div className="space-y-4">
      {/* Model Parameters - Compact with Attractive Sliders */}
      <section>
        <h4 className="text-[10px] text-purple-600 mb-2.5 flex items-center gap-1.5 uppercase tracking-wider font-semibold">
          <SlidersIcon strokeWidth={2} className="w-3 h-3" /> Model Parameters
        </h4>
        <div className="p-3 bg-white/60 border border-slate-200/60 rounded-lg space-y-3">
          <MinimalSlider
            label="Temperature"
            value={temperature}
            onChange={setTemperature}
            min={0}
            max={2}
            step={0.1}
            color="#a855f7"
          />
          <MinimalSlider
            label="Max Tokens"
            value={maxTokens}
            onChange={setMaxTokens}
            min={256}
            max={4096}
            step={256}
            color="#a855f7"
          />
          <MinimalSlider
            label="Top P"
            value={topP}
            onChange={setTopP}
            min={0}
            max={1}
            step={0.05}
            color="#a855f7"
          />
          <MinimalSlider
            label="Frequency Penalty"
            value={frequencyPenalty}
            onChange={setFrequencyPenalty}
            min={0}
            max={2}
            step={0.1}
            color="#a855f7"
          />
          <MinimalSlider
            label="Presence Penalty"
            value={presencePenalty}
            onChange={setPresencePenalty}
            min={0}
            max={2}
            step={0.1}
            color="#a855f7"
          />
        </div>
      </section>

      {/* Model Status - Compact */}
      <section>
        <h4 className="text-[10px] text-purple-600 mb-2.5 flex items-center gap-1.5 uppercase tracking-wider font-semibold">
          <Cpu strokeWidth={2} className="w-3 h-3" /> Local AI Model
        </h4>
        <div className="p-3 bg-white/60 border border-slate-200/60 rounded-lg">
          {modelStatus === 'NOT_INSTALLED' && (
            <div className="mb-3 p-2 bg-purple-500/8 border border-purple-300/40 rounded-md">
              <p className="text-[10px] text-purple-700 leading-relaxed">
                💡 Download the local AI model for offline usage
              </p>
            </div>
          )}
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              {getStatusIcon()}
              <span className="text-[11px] font-medium text-slate-700">{getStatusText()}</span>
            </div>
            {modelStatus === 'READY' && (
              <button
                onClick={handleUnloadModel}
                className="text-[10px] text-slate-500 hover:text-slate-700 px-2 py-1 rounded-md border border-slate-300/50 hover:border-slate-400/50 transition-all"
              >
                Unload
              </button>
            )}
          </div>

          {/* Download Progress - Compact */}
          {downloadProgress && (
            <div className="mt-3 space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-slate-600 font-medium">
                  {((downloadProgress.bytesDownloaded / downloadProgress.totalBytes) * 100).toFixed(1)}%
                </span>
                <span className="text-slate-500">
                  {(downloadProgress.speed / 1024 / 1024).toFixed(2)} MB/s
                </span>
              </div>
              <div className="w-full bg-slate-200/60 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-1.5 rounded-full transition-all duration-300"
                  style={{ 
                    width: `${downloadProgress.percentage}%`,
                    background: 'linear-gradient(90deg, #a855f7 0%, #9333ea 100%)',
                    boxShadow: '0 0 8px rgba(168, 85, 247, 0.4)'
                  }}
                />
              </div>
            </div>
          )}

          {/* Actions - Compact */}
          <div className="flex gap-1.5 mt-3">
            {modelStatus === 'NOT_INSTALLED' || modelStatus === 'UNLOADED' ? (
              <button
                onClick={handleDownload}
                disabled={isDownloading || modelStatus === ('DOWNLOADING' as any)}
                className="flex-1 px-3 py-1.5 text-white text-[10px] font-semibold rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                style={{
                  background: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)',
                  boxShadow: '0 2px 6px rgba(168, 85, 247, 0.25)'
                }}
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Downloading...
                  </>
                ) : (
                  <>
                    <Download className="w-3 h-3" />
                    Download
                  </>
                )}
              </button>
            ) : null}

            {modelStatus === ('DOWNLOADING' as any) && (
              <>
                <button
                  onClick={handlePauseDownload}
                  className="px-3 py-1.5 bg-slate-600 hover:bg-slate-700 text-white text-[10px] font-semibold rounded-md transition-all flex items-center gap-1"
                >
                  <Pause className="w-3 h-3" />
                  Pause
                </button>
                <button
                  onClick={handleStopDownload}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-semibold rounded-md transition-all flex items-center gap-1"
                >
                  <Square className="w-3 h-3" />
                  Stop
                </button>
              </>
            )}

            {(modelStatus === 'UNLOADED' && downloadProgress && downloadProgress.percentage < 100) && (
              <button
                onClick={handleResumeDownload}
                disabled={isDownloading}
                className="flex-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-semibold rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Resuming...
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    Resume
                  </>
                )}
              </button>
            )}

            {(modelStatus === 'UNLOADED' || modelStatus === 'NOT_INSTALLED') && modelStatus !== 'NOT_INSTALLED' && (
              <button
                onClick={handleLoadModel}
                disabled={isLoading}
                className="flex-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3" />
                    Load
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Prompt Improvement - Compact with Toggle */}
      <section>
        <h4 className="text-[10px] text-purple-600 mb-2.5 flex items-center gap-1.5 uppercase tracking-wider font-semibold">
          <Zap strokeWidth={2} className="w-3 h-3" /> Prompt Enhancement
        </h4>
        <div className="p-3 bg-white/60 border border-slate-200/60 rounded-lg space-y-2.5">
          <MinimalToggle
            label="Enable Prompt Improvement"
            checked={promptImprovementEnabled}
            onChange={handleTogglePromptImprovement}
            color="#a855f7"
          />

          {promptImprovementEnabled && (
            <div className="space-y-1.5 pt-1">
              <label className="text-[10px] font-medium text-slate-600">Mode</label>
              <select
                value={promptMode}
                onChange={(e) => handleSetPromptMode(e.target.value as 'deterministic' | 'creative')}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300/60 rounded-md text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-400"
              >
                <option value="deterministic">Deterministic</option>
                <option value="creative">Creative</option>
              </select>
            </div>
          )}
        </div>
      </section>

      {/* AI Mode Preference - Compact */}
      <section>
        <h4 className="text-[10px] text-purple-600 mb-2.5 flex items-center gap-1.5 uppercase tracking-wider font-semibold">
          <Cpu strokeWidth={2} className="w-3 h-3" /> AI Mode
        </h4>
        <div className="p-3 bg-white/60 border border-slate-200/60 rounded-lg">
          <select
            value={aiModePreference}
            onChange={(e) => handleSetAIMode(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white border border-slate-300/60 rounded-md text-[11px] text-slate-700 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-400"
          >
            <option value="auto">Auto (Recommended)</option>
            <option value="CLOUD">Cloud Only</option>
            <option value="LOCAL">Local Only</option>
            <option value="HYBRID">Hybrid</option>
          </select>
          <p className="text-[9px] text-slate-500 mt-1.5 leading-relaxed">
            Auto mode intelligently chooses between cloud and local AI
          </p>
        </div>
      </section>
    </div>
  );
};
