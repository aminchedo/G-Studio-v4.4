/**
 * Settings Integration Service
 * Wires modern settings to the application and ensures proper persistence
 */

import { useSettingsStore } from '@/components/Settings/settingsStore';
import { ModelDiscoveryService, ModelDiscoveryProgress } from '@/services/modelDiscoveryService';
import { ModelValidationStore } from '@/services/modelValidationStore';
import { useState, useCallback, useEffect } from 'react';

export interface SettingsIntegration {
  // API Keys
  apiKeys: {
    google: string;
    openai: string;
    anthropic: string;
    cohere: string;
    huggingface: string;
  };
  
  // Model Discovery
  discoveredModels: any[];
  activeModel: any | null;
  isDiscovering: boolean;
  discoveryProgress: ModelDiscoveryProgress | null;
  
  // Actions
  discoverModels: (apiKey: string) => Promise<void>;
  setActiveModel: (model: any) => void;
  refreshModels: () => void;
}

/**
 * Hook to integrate settings with the application
 * Provides access to settings and ensures proper persistence
 */
export function useSettingsIntegration(): SettingsIntegration {
  const { settings, updateSettings } = useSettingsStore();
  const [discoveredModels, setDiscoveredModels] = useState<any[]>([]);
  const [activeModel, setActiveModelState] = useState<any | null>(null);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryProgress, setDiscoveryProgress] = useState<ModelDiscoveryProgress | null>(null);

  // Load discovered models on mount
  useEffect(() => {
    const googleApiKey = settings.apiKeys.google;
    if (googleApiKey) {
      const models = ModelValidationStore.getValidatedModelInfos(googleApiKey);
      setDiscoveredModels(models);
      
      const active = ModelValidationStore.getActiveModel(googleApiKey);
      setActiveModelState(active);
    }
  }, [settings.apiKeys.google]);

  // Discover models function
  const discoverModels = useCallback(async (apiKey: string) => {
    if (!apiKey) {
      console.error('[SettingsIntegration] Cannot discover models: API key is required');
      return;
    }

    setIsDiscovering(true);
    
    try {
      const result = await ModelDiscoveryService.discoverModels(apiKey, (progress) => {
        setDiscoveryProgress(progress);
      });

      if (result.success) {
        setDiscoveredModels(result.discoveredModels);
        
        // Get auto-selected best model
        const bestModel = ModelValidationStore.getActiveModel(apiKey);
        setActiveModelState(bestModel);
        
        console.log(`[SettingsIntegration] Model discovery complete: ${result.totalAvailable} models available`);
      } else {
        console.error('[SettingsIntegration] Model discovery failed:', result.error);
      }
    } catch (error) {
      console.error('[SettingsIntegration] Model discovery error:', error);
    } finally {
      setIsDiscovering(false);
    }
  }, []);

  // Set active model
  const setActiveModel = useCallback((model: any) => {
    const googleApiKey = settings.apiKeys.google;
    if (googleApiKey && model) {
      ModelValidationStore.setActiveModel(googleApiKey, model);
      setActiveModelState(model);
    }
  }, [settings.apiKeys.google]);

  // Refresh models
  const refreshModels = useCallback(() => {
    const googleApiKey = settings.apiKeys.google;
    if (googleApiKey) {
      // Clear cache and rediscover
      ModelDiscoveryService.clearCache(googleApiKey);
      ModelValidationStore.clearResults(googleApiKey);
      discoverModels(googleApiKey);
    }
  }, [settings.apiKeys.google, discoverModels]);

  return {
    apiKeys: settings.apiKeys,
    discoveredModels,
    activeModel,
    isDiscovering,
    discoveryProgress,
    discoverModels,
    setActiveModel,
    refreshModels,
  };
}

/**
 * Initialize settings integration on app startup
 * Ensures proper persistence and loads cached data
 */
export function initializeSettingsIntegration(): void {
  console.log('[SettingsIntegration] Initializing settings integration...');
  
  // Verify localStorage is available
  try {
    const testKey = 'gstudio_storage_test';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    console.log('[SettingsIntegration] ✅ LocalStorage available');
  } catch (error) {
    console.error('[SettingsIntegration] ❌ LocalStorage not available:', error);
  }
  
  // Load persisted settings
  const settingsStore = useSettingsStore.getState();
  console.log('[SettingsIntegration] Settings loaded:', {
    hasGoogleKey: !!settingsStore.settings.apiKeys.google,
    theme: settingsStore.settings.appearance.theme,
    language: settingsStore.settings.general.language,
  });
  
  // Check for discovered models
  const googleApiKey = settingsStore.settings.apiKeys.google;
  if (googleApiKey) {
    const hasTestRun = ModelValidationStore.hasTestBeenExecuted(googleApiKey);
    const models = ModelValidationStore.getValidatedModelInfos(googleApiKey);
    const activeModel = ModelValidationStore.getActiveModel(googleApiKey);
    
    console.log('[SettingsIntegration] Model status:', {
      hasTestRun,
      modelCount: models.length,
      activeModel: activeModel?.id || 'none',
    });
  }
  
  console.log('[SettingsIntegration] ✅ Initialization complete');
}

/**
 * Sync settings with API key changes
 * Automatically triggers model discovery when API key is set
 */
export function syncSettingsWithApiKey(apiKey: string): void {
  if (!apiKey) return;
  
  const hasTestRun = ModelValidationStore.hasTestBeenExecuted(apiKey);
  
  if (!hasTestRun) {
    console.log('[SettingsIntegration] New API key detected, triggering model discovery...');
    
    // Trigger discovery in background
    ModelDiscoveryService.discoverModels(apiKey, (progress) => {
      console.log('[SettingsIntegration] Discovery progress:', progress.message);
    }).then((result) => {
      if (result.success) {
        console.log(`[SettingsIntegration] ✅ Discovered ${result.totalAvailable} models`);
      }
    });
  }
}

/**
 * Export settings as JSON
 */
export function exportSettingsAsJSON(): string {
  const settingsStore = useSettingsStore.getState();
  return settingsStore.exportSettings();
}

/**
 * Import settings from JSON
 */
export function importSettingsFromJSON(jsonString: string): boolean {
  const settingsStore = useSettingsStore.getState();
  return settingsStore.importSettings(jsonString);
}

/**
 * Reset all settings to defaults
 */
export function resetAllSettings(): void {
  const settingsStore = useSettingsStore.getState();
  settingsStore.resetSettings();
  
  // Also clear model validation
  const googleApiKey = settingsStore.settings.apiKeys.google;
  if (googleApiKey) {
    ModelValidationStore.clearResults(googleApiKey);
    ModelDiscoveryService.clearCache(googleApiKey);
  }
}
