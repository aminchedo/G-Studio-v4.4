/**
 * GeminiTesterConfig - Enhanced Configuration Constants
 * 
 * Centralized configuration for the Gemini Tester module with improved structure
 */

import { Config } from './GeminiTesterTypes';

export const CONFIG: Config = {
  GEMINI_API: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/',
    timeout: 30000,
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
    rateLimit: 60, // requests per minute
    rateLimitWindow: 60000, // 1 minute in ms
    tokenLimit: {
      input: 2000000, // 2M tokens default
      output: 8192 // 8K tokens default
    }
  },
  MODELS: {
    // Gemini 3.0 Series
    'gemini-3-pro': { 
      family: '3.0', 
      tier: 'pro', 
      capabilities: ['text', 'image', 'video', 'audio', 'streaming', 'function_calling'],
      inputTokenLimit: 2000000,
      outputTokenLimit: 8192
    },
    'gemini-3-flash': { 
      family: '3.0', 
      tier: 'flash', 
      capabilities: ['text', 'image', 'streaming', 'function_calling'],
      inputTokenLimit: 1000000,
      outputTokenLimit: 8192
    },
    
    // Gemini 2.5 Series
    'gemini-2.5-pro': { 
      family: '2.5', 
      tier: 'pro', 
      capabilities: ['text', 'image', 'video', 'audio', 'streaming', 'function_calling'],
      inputTokenLimit: 2000000,
      outputTokenLimit: 8192
    },
    'gemini-2.5-flash': { 
      family: '2.5', 
      tier: 'flash', 
      capabilities: ['text', 'image', 'streaming', 'function_calling'],
      inputTokenLimit: 1000000,
      outputTokenLimit: 8192
    },
    'gemini-2.5-flash-lite': { 
      family: '2.5', 
      tier: 'lite', 
      capabilities: ['text', 'image', 'streaming'],
      inputTokenLimit: 500000,
      outputTokenLimit: 4096
    },
    
    // Gemini 2.0 Series
    'gemini-2.0-flash': { 
      family: '2.0', 
      tier: 'flash', 
      capabilities: ['text', 'image', 'streaming', 'function_calling'],
      inputTokenLimit: 1000000,
      outputTokenLimit: 8192
    },
    'gemini-2.0-flash-lite': { 
      family: '2.0', 
      tier: 'lite', 
      capabilities: ['text', 'streaming'],
      inputTokenLimit: 500000,
      outputTokenLimit: 4096
    },
    
    // Gemini 1.5 Series (Legacy)
    'gemini-1.5-pro': { 
      family: '1.5', 
      tier: 'pro', 
      capabilities: ['text', 'image', 'video', 'audio', 'streaming', 'function_calling'],
      inputTokenLimit: 2000000,
      outputTokenLimit: 8192
    },
    'gemini-1.5-flash': { 
      family: '1.5', 
      tier: 'flash', 
      capabilities: ['text', 'image', 'streaming', 'function_calling'],
      inputTokenLimit: 1000000,
      outputTokenLimit: 8192
    }
  },
  RECOMMENDATIONS: {
    bestForSpeed: 'gemini-2.5-flash-lite',
    bestForQuality: 'gemini-3-pro',
    bestForBalance: 'gemini-2.5-flash',
    bestForLatest: 'gemini-3-flash',
    bestForRobotics: 'gemini-robotics-er-1.5-preview',
    bestForSmall: 'gemma-3-1b-it',
    bestForLarge: 'gemma-3-27b-it'
  },
  CACHE: {
    modelInfoTTL: 24 * 60 * 60 * 1000, // 24 hours
    testResultsTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
    storageKey: 'gemini_model_cache_v3'
  },
  GEOGRAPHICAL: {
    allowedRegions: ['US', 'EU', 'ASIA', 'GLOBAL'],
    restrictedRegions: [],
    checkRegionOnInit: false
  }
};
