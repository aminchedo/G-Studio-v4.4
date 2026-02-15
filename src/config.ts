// @ts-nocheck
/**
 * CONFIGURATION & CONSTANTS
 * Centralized configuration for Gemini API Tester
 */

/**
 * Get API key from environment or localStorage
 */
export const getApiKey = (): string => {
  // Priority: environment variable > localStorage
  const envKey = import.meta.env.VITE_GEMINI_API_KEY;
  
  if (envKey && envKey !== 'your_gemini_api_key_here' && envKey.length > 10) {
    console.log('✅ API key loaded from environment');
    return envKey;
  }
  
  try {
    const storedKey = localStorage.getItem('gstudio_api_key');
    if (storedKey && storedKey.length > 10) {
      console.log('✅ API key loaded from localStorage');
      return storedKey;
    }
  } catch (e) {
    console.warn('Cannot access localStorage:', e);
  }
  
  console.warn('⚠️ No API key found in environment or localStorage');
  return '';
};

/**
 * Save API key to localStorage
 */
export const setApiKey = (key: string): void => {
  try {
    if (key && key.length > 10) {
      localStorage.setItem('gstudio_api_key', key);
      console.log('✅ API key saved to localStorage');
    }
  } catch (e) {
    console.error('Cannot save API key to localStorage:', e);
  }
};

/**
 * Validate API key format
 */
export const isValidApiKey = (key: string): boolean => {
  return key && key.startsWith('AIzaSy') && key.length > 30;
};

export const CONFIG = {
  GEMINI_API: {
    baseUrl: 'https://generativelanguage.googleapis.com/v1/', // v1 for stable models (per documentation)
    cdnUrl: 'https://generativelanguage.googleapis.com/v1beta/', // v1beta for preview/experimental
    timeout: 30000,
    maxRetries: 3,
    rateLimit: 60,
    delayBetweenRequests: 1000,
    exponentialBackoff: true,
    backoffMultiplier: 2,
    maxBackoffDelay: 10000,
    jitterMs: 300, // ENHANCED: Jitter for retry delays (per documentation)
  },
  
  // ENHANCED: Safety settings (per Google AI Platform documentation)
  SAFETY: {
    enabled: true,
    monitorForProblems: true,
    feedbackMechanism: true,
    defaultSafetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
    ]
  },
  
  MODELS: {
    'gemini-3-pro': { family: '3.0', tier: 'pro', capabilities: ['text', 'image', 'video', 'audio', 'streaming', 'function_calling', 'thinking'], contextWindow: 2000000, description: 'Most intelligent model with Pro-grade reasoning' },
    'gemini-3-flash': { family: '3.0', tier: 'flash', capabilities: ['text', 'image', 'streaming', 'function_calling'], contextWindow: 1000000, description: 'Frontier intelligence built for speed' },
    'gemini-3-flash-preview': { family: '3.0', tier: 'experimental', capabilities: ['text', 'image', 'streaming', 'function_calling'], contextWindow: 1000000, description: 'Preview of Gemini 3 Flash' },
    'gemini-3-pro-preview': { family: '3.0', tier: 'experimental', capabilities: ['text', 'image', 'video', 'streaming', 'function_calling', 'deep_think'], contextWindow: 2000000, description: 'Preview of Gemini 3 with deep thinking mode' },
    'gemini-2.5-pro': { family: '2.5', tier: 'pro', capabilities: ['text', 'image', 'video', 'audio', 'streaming', 'function_calling', 'adaptive_thinking'], contextWindow: 2000000, description: 'High-capability model with adaptive thinking' },
    'gemini-2.5-flash': { family: '2.5', tier: 'flash', capabilities: ['text', 'image', 'streaming', 'function_calling', 'thinking_budgets'], contextWindow: 1000000, description: 'Lightning-fast with controllable thinking' },
    'gemini-2.5-flash-lite': { family: '2.5', tier: 'lite', capabilities: ['text', 'image', 'streaming'], contextWindow: 1000000, description: 'Cost-optimized for high-throughput' },
    'gemini-2.5-flash-preview-09-2025': { family: '2.5', tier: 'preview', capabilities: ['text', 'image', 'streaming'], contextWindow: 1000000, description: 'Preview version' },
    'gemini-2.5-flash-lite-preview-09-2025': { family: '2.5', tier: 'preview', capabilities: ['text', 'image', 'streaming'], contextWindow: 1000000, description: 'Preview lite version' },
    'gemini-2.5-flash-native-audio': { family: '2.5', tier: 'audio', capabilities: ['text', 'audio', 'streaming', 'live_api', 'function_calling'], contextWindow: 1000000, description: 'Live API with native audio generation' },
    'gemma-3-1b-it': { family: 'gemma', tier: '1b', capabilities: ['text', 'streaming'], contextWindow: 8192, description: 'Gemma 3 1B Instruct' },
    'gemma-3-4b-it': { family: 'gemma', tier: '4b', capabilities: ['text', 'streaming'], contextWindow: 8192, description: 'Gemma 3 4B Instruct' },
    'gemma-3-12b-it': { family: 'gemma', tier: '12b', capabilities: ['text', 'streaming'], contextWindow: 8192, description: 'Gemma 3 12B Instruct' },
    'gemma-3-27b-it': { family: 'gemma', tier: '27b', capabilities: ['text', 'streaming'], contextWindow: 8192, description: 'Gemma 3 27B Instruct' },
    'gemma-3n-e4b-it': { family: 'gemma', tier: 'e4b', capabilities: ['text', 'streaming'], contextWindow: 8192, description: 'Gemma 3n E4B Instruct' },
    'gemma-3n-e2b-it': { family: 'gemma', tier: 'e2b', capabilities: ['text', 'streaming'], contextWindow: 8192, description: 'Gemma 3n E2B Instruct' },
    'gemini-flash-latest': { family: '1.5', tier: 'flash', capabilities: ['text', 'image', 'streaming', 'function_calling'], contextWindow: 1000000, description: 'Latest Flash model' },
    'gemini-flash-lite-latest': { family: '1.5', tier: 'lite', capabilities: ['text', 'image', 'streaming'], contextWindow: 1000000, description: 'Latest Flash Lite model' },
    'gemini-robotics-er-1.5-preview': { family: 'robotics', tier: 'experimental', capabilities: ['text', 'streaming'], contextWindow: 1000000, description: 'Robotics ER 1.5 Preview' },
  },

  BYPASS: {
    methods: ['smartsni', 'sni-fragment', 'ech', 'reality', 'system-proxy', 'cloudflare-warp', 'v2ray', 'xray', 'shadowsocks', 'tor', 'psiphon', 'static-ip-vpn', 'dns-over-https', 'dns-over-tls', 'auto', 'cdn-fallback'],
    fallback: ['cdn', 'retry', 'alternative-endpoint', 'alternative-dns', 'ip-rotation'],
    smartsni: {
      port: 8080,
      binary: './smartSNI',
      startupDelay: 2000,
      browserMode: true
    },
    cloudflareWarp: {
      ports: [40000],
      protocols: ['socks5', 'http']
    },
    v2ray: {
      commonPorts: [10808, 10809, 10086, 1080, 1081, 1082, 1083, 1084, 1085, 1086, 1087, 1088, 1089, 1090, 8080, 8081, 8082, 8888, 9999, 443, 80],
      protocols: ['socks5', 'http', 'vmess', 'vless'],
      // V2Ray API endpoints for stats and control (if available)
      apiEndpoints: {
        stats: 'http://127.0.0.1:10085/stats', // Default stats API port
        config: 'http://127.0.0.1:10085/config' // Config API (if enabled)
      },
      // Protocol-specific optimizations
      protocolOptimizations: {
        socks5: {
          // SOCKS5 is more efficient for TCP connections
          preferredFor: ['api', 'streaming'],
          keepAlive: true,
          timeout: 30000
        },
        http: {
          // HTTP proxy is better for HTTP/HTTPS requests
          preferredFor: ['http', 'https'],
          keepAlive: true,
          timeout: 20000
        }
      },
      // DNS servers optimized for V2Ray usage (prioritized for proxy environments)
      optimizedDNS: [
        { name: 'Cloudflare', primary: '1.1.1.1', secondary: '1.0.0.1', host: 'cloudflare-dns.com', region: 'global', priority: 1 },
        { name: 'Google', primary: '8.8.8.8', secondary: '8.8.4.4', host: 'dns.google', region: 'global', priority: 2 },
        { name: 'Quad9', primary: '9.9.9.9', secondary: '149.112.112.112', host: 'dns.quad9.net', region: 'global', priority: 3 },
        { name: 'OpenDNS', primary: '208.67.222.222', secondary: '208.67.220.220', host: 'opendns.com', region: 'global', priority: 4 }
      ],
      // Performance monitoring thresholds
      performanceThresholds: {
        minLatency: 50, // ms - below this is excellent
        maxLatency: 500, // ms - above this triggers optimization
        minSuccessRate: 0.95, // 95% success rate minimum
        healthCheckInterval: 60000 // Check health every 60 seconds
      }
    },
    xray: {
      commonPorts: [10808, 10809, 443],
      protocols: ['socks5', 'http', 'vmess', 'vless', 'reality', 'xtls']
    },
    shadowsocks: {
      commonPorts: [1080, 8388, 10808],
      protocols: ['socks5']
    },
    tor: {
      commonPorts: [9050, 9150],
      protocols: ['socks5']
    },
    psiphon: {
      commonPorts: [1080],
      protocols: ['http', 'socks5']
    },
    dnsOverHttps: {
      providers: [
        'https://cloudflare-dns.com/dns-query',
        'https://dns.google/dns-query',
        'https://1.1.1.1/dns-query',
        'https://8.8.8.8/dns-query'
      ]
    },
    dnsOverTls: {
      providers: [
        '1.1.1.1:853',
        '8.8.8.8:853',
        '9.9.9.9:853'
      ]
    },
    alternativeEndpoints: [
      'https://generativelanguage.googleapis.com',
      'https://ai.google.dev',
      'https://makersuite.google.com'
    ],
    staticIPVPN: {
      recommended: true,
      note: 'Use VPN with static IP from non-sanctioned countries for better reliability'
    }
  },

  PERFORMANCE: {
    trackResponseTimes: true,
    trackErrors: true,
    calculateAverages: true
  }
};
