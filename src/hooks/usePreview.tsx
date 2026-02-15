/**
 * usePreview Hook
 * 
 * NEW: Preview management hook
 * Manages preview state and configuration
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { PreviewConfig, PreviewError } from '@/types/preview';

interface UsePreviewOptions {
  html: string;
  css?: string;
  javascript?: string;
  config?: Partial<PreviewConfig>;
  onError?: (error: PreviewError) => void;
}

export function usePreview(options: UsePreviewOptions) {
  const { html, css = '', javascript = '', config = {}, onError } = options;
  
  // Preview configuration
  const [previewConfig, setPreviewConfig] = useState<PreviewConfig>({
    mode: 'split',
    splitOrientation: 'horizontal',
    splitRatio: 0.5,
    hotReload: true,
    autoSave: false,
    syncScroll: false,
    refreshRate: 300,
    ...config,
  });
  
  // Preview state
  const [errors, setErrors] = useState<PreviewError[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  
  // Refs
  const refreshTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Update preview config
  const updateConfig = useCallback((updates: Partial<PreviewConfig>) => {
    setPreviewConfig(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Toggle view mode
  const toggleViewMode = useCallback(() => {
    setPreviewConfig(prev => {
      const modes: PreviewConfig['mode'][] = ['split', 'code', 'preview'];
      const currentIndex = modes.indexOf(prev.mode);
      const nextIndex = (currentIndex + 1) % modes.length;
      return { ...prev, mode: modes[nextIndex] };
    });
  }, []);
  
  // Toggle split orientation
  const toggleOrientation = useCallback(() => {
    setPreviewConfig(prev => ({
      ...prev,
      splitOrientation: prev.splitOrientation === 'horizontal' ? 'vertical' : 'horizontal',
    }));
  }, []);
  
  // Update split ratio
  const updateSplitRatio = useCallback((ratio: number) => {
    setPreviewConfig(prev => ({
      ...prev,
      splitRatio: Math.max(0.1, Math.min(0.9, ratio)),
    }));
  }, []);
  
  // Add error
  const addError = useCallback((error: PreviewError) => {
    setErrors(prev => [...prev, error]);
    onError?.(error);
  }, [onError]);
  
  // Clear errors
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);
  
  // Refresh preview
  const refresh = useCallback(() => {
    setIsRefreshing(true);
    setLastRefresh(new Date());
    
    // Simulate refresh delay
    setTimeout(() => {
      setIsRefreshing(false);
    }, 100);
  }, []);
  
  // Auto-refresh on content change (with debouncing)
  useEffect(() => {
    if (previewConfig.hotReload) {
      clearTimeout(refreshTimeoutRef.current);
      refreshTimeoutRef.current = setTimeout(() => {
        refresh();
      }, previewConfig.refreshRate);
    }
    
    return () => {
      clearTimeout(refreshTimeoutRef.current);
    };
  }, [html, css, javascript, previewConfig.hotReload, previewConfig.refreshRate, refresh]);
  
  // Save config to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('gstudio-preview-config', JSON.stringify(previewConfig));
    } catch (error) {
      console.warn('Failed to save preview config:', error);
    }
  }, [previewConfig]);
  
  // Load config from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('gstudio-preview-config');
      if (saved) {
        const savedConfig = JSON.parse(saved);
        setPreviewConfig(prev => ({ ...prev, ...savedConfig }));
      }
    } catch (error) {
      console.warn('Failed to load preview config:', error);
    }
  }, []);
  
  return {
    // State
    config: previewConfig,
    errors,
    isRefreshing,
    lastRefresh,
    
    // Actions
    updateConfig,
    toggleViewMode,
    toggleOrientation,
    updateSplitRatio,
    addError,
    clearErrors,
    refresh,
  };
}

// Hook for preview errors
export function usePreviewErrors() {
  const [errors, setErrors] = useState<PreviewError[]>([]);
  
  const addError = useCallback((error: PreviewError) => {
    setErrors(prev => [...prev, error]);
  }, []);
  
  const clearErrors = useCallback(() => {
    setErrors([]);
  }, []);
  
  const removeError = useCallback((index: number) => {
    setErrors(prev => prev.filter((_, i) => i !== index));
  }, []);
  
  return {
    errors,
    hasErrors: errors.length > 0,
    errorCount: errors.length,
    addError,
    clearErrors,
    removeError,
  };
}
