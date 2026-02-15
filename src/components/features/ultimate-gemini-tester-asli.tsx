import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { createPortal } from "react-dom";
import {
  X,
  Terminal,
  Settings,
  Database,
  Key,
  Globe,
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  Loader2,
  Sparkles,
  FlaskConical,
  Activity,
  Zap,
  Square,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Copy,
  Filter,
  Server,
  FileText,
  RotateCw,
  Save,
  Rocket,
  Repeat,
  Eye,
  EyeOff,
} from "lucide-react";
import { UltimateGeminiTester as UltimateGeminiTesterService } from "@/services/ultimateGeminiTester";

// ============================================================================
// SVG ICONS - Custom Gradient Icons
// ============================================================================

const SVGIcons = {
  Terminal: () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="terminalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00ff88" />
          <stop offset="100%" stopColor="#00ccff" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect
        x="2"
        y="4"
        width="20"
        height="16"
        rx="2"
        stroke="url(#terminalGrad)"
        strokeWidth="2"
        fill="none"
        filter="url(#glow)"
      />
      <path
        d="M6 8L10 12L6 16"
        stroke="url(#terminalGrad)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#glow)"
      />
      <line
        x1="12"
        y1="16"
        x2="18"
        y2="16"
        stroke="url(#terminalGrad)"
        strokeWidth="2"
        strokeLinecap="round"
        filter="url(#glow)"
      />
    </svg>
  ),

  Cpu: () => (
    <svg
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      className="animate-pulse"
    >
      <defs>
        <linearGradient id="cpuGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff00ff" />
          <stop offset="50%" stopColor="#00ffff" />
          <stop offset="100%" stopColor="#ffff00" />
        </linearGradient>
      </defs>
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="2"
        stroke="url(#cpuGrad)"
        strokeWidth="2"
        fill="none"
        filter="url(#glow)"
      />
      <rect
        x="8"
        y="8"
        width="8"
        height="8"
        rx="1"
        fill="url(#cpuGrad)"
        opacity="0.5"
      />
      <line
        x1="2"
        y1="8"
        x2="4"
        y2="8"
        stroke="url(#cpuGrad)"
        strokeWidth="2"
      />
      <line
        x1="2"
        y1="12"
        x2="4"
        y2="12"
        stroke="url(#cpuGrad)"
        strokeWidth="2"
      />
      <line
        x1="2"
        y1="16"
        x2="4"
        y2="16"
        stroke="url(#cpuGrad)"
        strokeWidth="2"
      />
      <line
        x1="20"
        y1="8"
        x2="22"
        y2="8"
        stroke="url(#cpuGrad)"
        strokeWidth="2"
      />
      <line
        x1="20"
        y1="12"
        x2="22"
        y2="12"
        stroke="url(#cpuGrad)"
        strokeWidth="2"
      />
      <line
        x1="20"
        y1="16"
        x2="22"
        y2="16"
        stroke="url(#cpuGrad)"
        strokeWidth="2"
      />
      <line
        x1="8"
        y1="2"
        x2="8"
        y2="4"
        stroke="url(#cpuGrad)"
        strokeWidth="2"
      />
      <line
        x1="12"
        y1="2"
        x2="12"
        y2="4"
        stroke="url(#cpuGrad)"
        strokeWidth="2"
      />
      <line
        x1="16"
        y1="2"
        x2="16"
        y2="4"
        stroke="url(#cpuGrad)"
        strokeWidth="2"
      />
      <line
        x1="8"
        y1="20"
        x2="8"
        y2="22"
        stroke="url(#cpuGrad)"
        strokeWidth="2"
      />
      <line
        x1="12"
        y1="20"
        x2="12"
        y2="22"
        stroke="url(#cpuGrad)"
        strokeWidth="2"
      />
      <line
        x1="16"
        y1="20"
        x2="16"
        y2="22"
        stroke="url(#cpuGrad)"
        strokeWidth="2"
      />
    </svg>
  ),

  Settings: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="settingsGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00ff88" />
          <stop offset="100%" stopColor="#00ccff" />
        </linearGradient>
      </defs>
      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="url(#settingsGrad)"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M12 1v6m0 6v6M1 12h6m6 0h6"
        stroke="url(#settingsGrad)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M4.22 4.22l4.24 4.24m7.07 7.07l4.24 4.24M4.22 19.78l4.24-4.24m7.07-7.07l4.24-4.24"
        stroke="url(#settingsGrad)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),

  Database: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="dbGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ff00ff" />
          <stop offset="100%" stopColor="#00ffff" />
        </linearGradient>
      </defs>
      <ellipse
        cx="12"
        cy="5"
        rx="9"
        ry="3"
        stroke="url(#dbGrad)"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"
        stroke="url(#dbGrad)"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3"
        stroke="url(#dbGrad)"
        strokeWidth="2"
      />
    </svg>
  ),

  Key: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="keyGrad">
          <stop offset="0%" stopColor="#ffd700" />
          <stop offset="100%" stopColor="#ffaa00" />
        </linearGradient>
      </defs>
      <circle
        cx="8"
        cy="8"
        r="6"
        stroke="url(#keyGrad)"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M14 14l8 8m-2-8v4h-4"
        stroke="url(#keyGrad)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  ),

  Globe: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="globeGrad">
          <stop offset="0%" stopColor="#00ffff" />
          <stop offset="100%" stopColor="#0088ff" />
        </linearGradient>
      </defs>
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="url(#globeGrad)"
        strokeWidth="2"
        fill="none"
      />
      <path
        d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
        stroke="url(#globeGrad)"
        strokeWidth="2"
      />
    </svg>
  ),

  Play: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="playGrad">
          <stop offset="0%" stopColor="#00ff88" />
          <stop offset="100%" stopColor="#00ff00" />
        </linearGradient>
      </defs>
      <path d="M5 3l14 9-14 9V3z" fill="url(#playGrad)" filter="url(#glow)" />
    </svg>
  ),

  Check: () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="checkGrad">
          <stop offset="0%" stopColor="#00ff88" />
          <stop offset="100%" stopColor="#00cc66" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#checkGrad)" opacity="0.2" />
      <path
        d="M9 12l2 2 4-4"
        stroke="url(#checkGrad)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#glow)"
      />
    </svg>
  ),

  Alert: () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="alertGrad">
          <stop offset="0%" stopColor="#ffaa00" />
          <stop offset="100%" stopColor="#ff8800" />
        </linearGradient>
      </defs>
      <path
        d="M12 2L2 20h20L12 2z"
        stroke="url(#alertGrad)"
        strokeWidth="2"
        fill="url(#alertGrad)"
        opacity="0.2"
        filter="url(#glow)"
      />
      <line
        x1="12"
        y1="9"
        x2="12"
        y2="13"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <circle cx="12" cy="17" r="1" fill="#fff" />
    </svg>
  ),

  X: () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="xGrad">
          <stop offset="0%" stopColor="#ff0066" />
          <stop offset="100%" stopColor="#ff0000" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" fill="url(#xGrad)" opacity="0.2" />
      <path
        d="M15 9l-6 6m0-6l6 6"
        stroke="url(#xGrad)"
        strokeWidth="2"
        strokeLinecap="round"
        filter="url(#glow)"
      />
    </svg>
  ),

  Clock: () => (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="clockGrad">
          <stop offset="0%" stopColor="#00ccff" />
          <stop offset="100%" stopColor="#0088ff" />
        </linearGradient>
      </defs>
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="url(#clockGrad)"
        strokeWidth="2"
        fill="url(#clockGrad)"
        opacity="0.2"
        filter="url(#glow)"
      />
      <path
        d="M12 6v6l4 2"
        stroke="url(#clockGrad)"
        strokeWidth="2"
        strokeLinecap="round"
        filter="url(#glow)"
      />
    </svg>
  ),

  Download: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <defs>
        <linearGradient id="downloadGrad">
          <stop offset="0%" stopColor="#00ff88" />
          <stop offset="100%" stopColor="#00cc66" />
        </linearGradient>
      </defs>
      <path
        d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"
        stroke="url(#downloadGrad)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#glow)"
      />
    </svg>
  ),

  Refresh: () => (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin"
    >
      <defs>
        <linearGradient id="refreshGrad">
          <stop offset="0%" stopColor="#00ffff" />
          <stop offset="100%" stopColor="#00ccff" />
        </linearGradient>
      </defs>
      <path
        d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16"
        stroke="url(#refreshGrad)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#glow)"
      />
    </svg>
  ),
};

// ============================================================================
// CONFIGURATION & CONSTANTS (از فایل اصلی)
// ============================================================================

const CONFIG = {
  GEMINI_API: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/",
    cdnUrl: "https://generativelanguage.googleapis.com/v1beta/",
    timeout: 30000,
    maxRetries: 3,
    rateLimit: 60,
    delayBetweenRequests: 1000,
    exponentialBackoff: true,
    backoffMultiplier: 2,
    maxBackoffDelay: 10000,
  },

  MODELS: {
    // Gemini 3 Family (Latest)
    "gemini-3-pro": {
      family: "3.0",
      tier: "pro",
      capabilities: [
        "text",
        "image",
        "video",
        "audio",
        "streaming",
        "function_calling",
        "thinking",
      ],
      contextWindow: 2000000,
      description: "Most intelligent model with Pro-grade reasoning",
    },
    "gemini-3-flash": {
      family: "3.0",
      tier: "flash",
      capabilities: ["text", "image", "streaming", "function_calling"],
      contextWindow: 1000000,
      description: "Frontier intelligence built for speed",
    },
    "gemini-3-flash-preview": {
      family: "3.0",
      tier: "experimental",
      capabilities: ["text", "image", "streaming", "function_calling"],
      contextWindow: 1000000,
      description: "Preview of Gemini 3 Flash",
    },
    "gemini-3-pro-preview": {
      family: "3.0",
      tier: "experimental",
      capabilities: [
        "text",
        "image",
        "video",
        "streaming",
        "function_calling",
        "deep_think",
      ],
      contextWindow: 2000000,
      description: "Preview of Gemini 3 with deep thinking mode",
    },

    // Gemini 2.5 Family
    "gemini-2.5-pro": {
      family: "2.5",
      tier: "pro",
      capabilities: [
        "text",
        "image",
        "video",
        "audio",
        "streaming",
        "function_calling",
        "adaptive_thinking",
      ],
      contextWindow: 2000000,
      description: "High-capability model with adaptive thinking",
    },
    "gemini-2.5-flash": {
      family: "2.5",
      tier: "flash",
      capabilities: [
        "text",
        "image",
        "streaming",
        "function_calling",
        "thinking_budgets",
      ],
      contextWindow: 1000000,
      description: "Lightning-fast with controllable thinking",
    },
    "gemini-2.5-flash-lite": {
      family: "2.5",
      tier: "lite",
      capabilities: ["text", "image", "streaming"],
      contextWindow: 1000000,
      description: "Cost-optimized for high-throughput",
    },
    "gemini-2.5-flash-preview-09-2025": {
      family: "2.5",
      tier: "preview",
      capabilities: ["text", "image", "streaming"],
      contextWindow: 1000000,
      description: "Preview version",
    },
    "gemini-2.5-flash-lite-preview-09-2025": {
      family: "2.5",
      tier: "preview",
      capabilities: ["text", "image", "streaming"],
      contextWindow: 1000000,
      description: "Preview lite version",
    },
    "gemini-2.5-flash-native-audio": {
      family: "2.5",
      tier: "audio",
      capabilities: [
        "text",
        "audio",
        "streaming",
        "live_api",
        "function_calling",
      ],
      contextWindow: 1000000,
      description: "Live API with native audio generation",
    },

    // Gemma Family
    "gemma-3-1b-it": {
      family: "gemma",
      tier: "1b",
      capabilities: ["text", "streaming"],
      contextWindow: 8192,
      description: "Gemma 3 1B Instruct",
    },
    "gemma-3-4b-it": {
      family: "gemma",
      tier: "4b",
      capabilities: ["text", "streaming"],
      contextWindow: 8192,
      description: "Gemma 3 4B Instruct",
    },
    "gemma-3-12b-it": {
      family: "gemma",
      tier: "12b",
      capabilities: ["text", "streaming"],
      contextWindow: 8192,
      description: "Gemma 3 12B Instruct",
    },
    "gemma-3-27b-it": {
      family: "gemma",
      tier: "27b",
      capabilities: ["text", "streaming"],
      contextWindow: 8192,
      description: "Gemma 3 27B Instruct",
    },
    "gemma-3n-e4b-it": {
      family: "gemma",
      tier: "e4b",
      capabilities: ["text", "streaming"],
      contextWindow: 8192,
      description: "Gemma 3n E4B Instruct",
    },
    "gemma-3n-e2b-it": {
      family: "gemma",
      tier: "e2b",
      capabilities: ["text", "streaming"],
      contextWindow: 8192,
      description: "Gemma 3n E2B Instruct",
    },

    // Legacy models
    "gemini-flash-latest": {
      family: "1.5",
      tier: "flash",
      capabilities: ["text", "image", "streaming", "function_calling"],
      contextWindow: 1000000,
      description: "Latest Flash model",
    },
    "gemini-flash-lite-latest": {
      family: "1.5",
      tier: "lite",
      capabilities: ["text", "image", "streaming"],
      contextWindow: 1000000,
      description: "Latest Flash Lite model",
    },
    "gemini-robotics-er-1.5-preview": {
      family: "robotics",
      tier: "experimental",
      capabilities: ["text", "streaming"],
      contextWindow: 1000000,
      description: "Robotics ER 1.5 Preview",
    },
  },

  BYPASS: {
    methods: ["system-proxy", "auto", "cdn-fallback"],
    fallback: ["cdn", "retry", "alternative-endpoint"],
  },

  PERFORMANCE: {
    trackResponseTimes: true,
    trackErrors: true,
    calculateAverages: true,
  },
};

// ============================================================================
// LOGGER CLASS (از فایل اصلی)
// ============================================================================

class Logger {
  verbose: boolean;
  startTime: number;
  addLogCallback:
    | ((level: string, message: string, data?: unknown) => void)
    | null;

  constructor(
    verbose = false,
    addLogCallback:
      | ((level: string, message: string, data?: unknown) => void)
      | null = null,
  ) {
    this.verbose = verbose;
    this.startTime = Date.now();
    this.addLogCallback = addLogCallback;
  }

  log(level: string, message: string, data: unknown = null) {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(2);
    const icons = {
      info: "ℹ️",
      success: "✅",
      warning: "⚠️",
      error: "❌",
      debug: "🔍",
      test: "🧪",
      bypass: "🔓",
      speed: "⚡",
      model: "🤖",
    };

    const icon = icons[level] || "•";
    const logMessage = `[${elapsed}s] ${icon} ${message}`;

    if (this.addLogCallback) {
      this.addLogCallback(level, logMessage, data);
    }

    console.log(logMessage);
    if (data && this.verbose) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  info(msg: string, data?: unknown) {
    this.log("info", msg, data);
  }
  success(msg: string, data?: unknown) {
    this.log("success", msg, data);
  }
  warning(msg: string, data?: unknown) {
    this.log("warning", msg, data);
  }
  error(msg: string, data?: unknown) {
    this.log("error", msg, data);
  }
  debug(msg: string, data?: unknown) {
    if (this.verbose) this.log("debug", msg, data);
  }
  test(msg: string, data?: unknown) {
    this.log("test", msg, data);
  }
  bypass(msg: string, data?: unknown) {
    this.log("bypass", msg, data);
  }
  speed(msg: string, data?: unknown) {
    this.log("speed", msg, data);
  }
  model(msg: string, data?: unknown) {
    this.log("model", msg, data);
  }
  section(title: string) {
    this.log("info", `\n${"─".repeat(76)}\n  ${title}\n${"─".repeat(76)}`);
  }
}

// ============================================================================
// DNS MANAGER - Enhanced with Caching, Smart Rotation, and Failover
// ============================================================================

type DNSServerEntry = {
  name: string;
  primary: string;
  secondary: string;
  host: string;
};
type DNSServersMap = {
  us: DNSServerEntry[];
  global: DNSServerEntry[];
  secure: DNSServerEntry[];
};

class DNSManager {
  logger: Logger;
  region: string;
  activeDNS: DNSServerEntry | null;
  primaryDNS: DNSServerEntry | null;
  secondaryDNS: DNSServerEntry | null;
  dnsCache: Map<
    string,
    { result: boolean; responseTime: number; timestamp: number }
  >;
  cacheTTL: number;
  dnsPerformance: Map<
    string,
    {
      totalTests: number;
      successfulTests: number;
      avgResponseTime: number;
      lastTestTime: number | null;
    }
  >;
  failoverHistory: unknown[];
  dnsServers: DNSServersMap;

  constructor(logger: Logger, region = "us", cacheTTL = 300000) {
    // 5 minutes default cache
    this.logger = logger;
    this.region = region;
    this.activeDNS = null;
    this.primaryDNS = null;
    this.secondaryDNS = null;
    this.dnsCache = new Map(); // Cache DNS test results
    this.cacheTTL = cacheTTL; // Time to live for cache entries
    this.dnsPerformance = new Map(); // Track DNS performance metrics
    this.failoverHistory = []; // Track failover events

    // DNS Servers by region
    this.dnsServers = {
      us: [
        {
          name: "Google US",
          primary: "8.8.8.8",
          secondary: "8.8.4.4",
          host: "dns.google",
        },
        {
          name: "Cloudflare US",
          primary: "1.1.1.1",
          secondary: "1.0.0.1",
          host: "cloudflare-dns.com",
        },
        {
          name: "Quad9 US",
          primary: "9.9.9.9",
          secondary: "149.112.112.112",
          host: "dns.quad9.net",
        },
      ],
      global: [
        {
          name: "OpenDNS",
          primary: "208.67.222.222",
          secondary: "208.67.220.220",
          host: "resolver1.opendns.com",
        },
        {
          name: "Cisco Umbrella",
          primary: "208.67.222.222",
          secondary: "208.67.220.220",
          host: "umbrella.cisco.com",
        },
      ],
      secure: [
        {
          name: "Cloudflare Secure",
          primary: "1.1.1.2",
          secondary: "1.0.0.2",
          host: "security.cloudflare-dns.com",
        },
        {
          name: "Quad9 Secure",
          primary: "9.9.9.11",
          secondary: "149.112.112.11",
          host: "dns11.quad9.net",
        },
      ],
    };
  }

  /**
   * Get cached DNS test result if available and not expired
   */
  getCachedResult(dns) {
    const cacheKey = `${dns.host}-${dns.primary}`;
    const cached = this.dnsCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.result;
    }

    return null;
  }

  /**
   * Cache DNS test result
   */
  cacheResult(dns, result, responseTime) {
    const cacheKey = `${dns.host}-${dns.primary}`;
    this.dnsCache.set(cacheKey, {
      result,
      responseTime,
      timestamp: Date.now(),
    });

    // Update performance metrics
    if (!this.dnsPerformance.has(cacheKey)) {
      this.dnsPerformance.set(cacheKey, {
        totalTests: 0,
        successfulTests: 0,
        avgResponseTime: 0,
        lastTestTime: null,
      });
    }

    const perf = this.dnsPerformance.get(cacheKey);
    perf.totalTests++;
    if (result) {
      perf.successfulTests++;
      perf.avgResponseTime =
        (perf.avgResponseTime * (perf.totalTests - 1) + responseTime) /
        perf.totalTests;
    }
    perf.lastTestTime = Date.now();
  }

  /**
   * Select best DNS based on performance metrics and caching
   */
  async selectBestDNS() {
    this.logger.info("🔍 Testing DNS servers for optimal performance...");

    const servers = [
      ...(this.dnsServers[this.region] || this.dnsServers.us),
      ...this.dnsServers.global,
    ];

    // Check cache first and prioritize cached successful results
    const cachedResults = servers
      .map((dns) => {
        const cached = this.getCachedResult(dns);
        const perf = this.dnsPerformance.get(`${dns.host}-${dns.primary}`);
        return {
          dns,
          cached,
          performance: perf,
          score: cached
            ? perf
              ? perf.successfulTests / perf.totalTests
              : 1
            : 0,
        };
      })
      .sort((a, b) => b.score - a.score);

    // Test cached successful DNS first
    for (const { dns, cached } of cachedResults) {
      if (cached === true) {
        try {
          // Quick validation test
          const works = await this.testDNS(dns, true); // Quick test
          if (works) {
            this.activeDNS = dns;
            this.primaryDNS = dns;
            this.logger.success(
              `✓ Selected DNS (cached): ${dns.name} (${dns.primary})`,
            );
            return dns;
          }
        } catch (error) {
          this.logger.debug(
            `Cached DNS ${dns.name} validation failed: ${error.message}`,
          );
          // Remove from cache if validation fails
          this.dnsCache.delete(`${dns.host}-${dns.primary}`);
        }
      }
    }

    // Test all DNS servers if no cached result works
    const testResults = [];
    for (const dns of servers) {
      try {
        const startTime = Date.now();
        const works = await this.testDNS(dns);
        const responseTime = Date.now() - startTime;

        this.cacheResult(dns, works, responseTime);

        if (works) {
          testResults.push({ dns, responseTime });
        }
      } catch (error) {
        this.logger.debug(`DNS ${dns.name} test failed: ${error.message}`);
        this.cacheResult(dns, false, 0);
      }
    }

    // Select fastest working DNS
    if (testResults.length > 0) {
      testResults.sort((a, b) => a.responseTime - b.responseTime);
      this.activeDNS = testResults[0].dns;
      this.primaryDNS = testResults[0].dns;
      this.secondaryDNS = testResults.length > 1 ? testResults[1].dns : null;

      this.logger.success(
        `✓ Selected DNS: ${this.activeDNS.name} (${this.activeDNS.primary}) - ${testResults[0].responseTime}ms`,
      );
      return this.activeDNS;
    }

    // Failover: Try secondary DNS if primary fails
    if (this.secondaryDNS) {
      this.logger.warning(
        "Primary DNS failed, attempting failover to secondary...",
      );
      this.failoverHistory.push({
        timestamp: Date.now(),
        from: this.primaryDNS?.name || "unknown",
        to: this.secondaryDNS.name,
        reason: "primary_failed",
      });

      this.activeDNS = this.secondaryDNS;
      this.logger.success(`✓ Failover to: ${this.secondaryDNS.name}`);
      return this.secondaryDNS;
    }

    this.logger.warning("No optimal DNS found, using system default");
    return null;
  }

  async testDNS(dns, quickTest = false) {
    // Check cache first
    const cached = this.getCachedResult(dns);
    if (cached !== null && !quickTest) {
      return cached;
    }

    try {
      const testUrl = `https://${dns.host}`;
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        quickTest ? 2000 : 3000,
      );

      const response = await fetch(testUrl, {
        method: "HEAD",
        signal: controller.signal,
        mode: "no-cors", // Avoid CORS issues
      });

      clearTimeout(timeout);
      const responseTime = Date.now() - (quickTest ? Date.now() : Date.now());

      if (!quickTest) {
        this.cacheResult(dns, true, responseTime);
      }

      return true;
    } catch (error) {
      if (!quickTest) {
        this.cacheResult(dns, false, 0);
      }
      return false;
    }
  }

  getActiveDNS() {
    return this.activeDNS;
  }

  getPrimaryDNS() {
    return this.primaryDNS;
  }

  getSecondaryDNS() {
    return this.secondaryDNS;
  }

  getPerformanceMetrics() {
    const metrics = {};
    this.dnsPerformance.forEach((perf, key) => {
      metrics[key] = {
        ...perf,
        successRate:
          perf.totalTests > 0
            ? (perf.successfulTests / perf.totalTests) * 100
            : 0,
      };
    });
    return metrics;
  }

  getFailoverHistory() {
    return this.failoverHistory;
  }

  /**
   * Smart DNS rotation based on performance
   */
  async rotateDNS() {
    this.logger.info("🔄 Rotating to next DNS server...");

    const servers = [
      ...(this.dnsServers[this.region] || this.dnsServers.us),
      ...this.dnsServers.global,
    ];

    // Get current index
    const currentIndex = servers.findIndex(
      (s) =>
        s.name === this.activeDNS?.name &&
        s.primary === this.activeDNS?.primary,
    );

    // Try next servers in order, prioritizing by performance
    const remainingServers = [
      ...servers.slice(currentIndex + 1),
      ...servers.slice(0, currentIndex),
    ];

    for (const nextDNS of remainingServers) {
      const works = await this.testDNS(nextDNS);
      if (works) {
        this.activeDNS = nextDNS;
        this.logger.success(`✓ Rotated to: ${nextDNS.name}`);
        return nextDNS;
      }
    }

    return null;
  }

  /**
   * Clear DNS cache
   */
  clearCache() {
    this.dnsCache.clear();
    this.logger.info("DNS cache cleared");
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.dnsCache.size,
      entries: Array.from(this.dnsCache.entries()).map(([key, value]) => ({
        key,
        age: Date.now() - value.timestamp,
        result: value.result,
        responseTime: value.responseTime,
      })),
    };
  }
}

// ============================================================================
// REQUEST QUEUE - Intelligent Request Queueing and Throttling
// ============================================================================

interface RequestQueueOptions {
  rateLimit?: number;
  delayBetweenRequests?: number;
  maxConcurrent?: number;
  throttleDelay?: number;
  exponentialBackoff?: boolean;
  backoffMultiplier?: number;
  maxBackoffDelay?: number;
}

interface QueuedRequest {
  id: number;
  fn: () => Promise<unknown>;
  priority: number;
  metadata: { maxRetries?: number };
  resolve: (v: unknown) => void;
  reject: (e: unknown) => void;
  retries: number;
  maxRetries: number;
  addedAt: number;
}

class RequestQueue {
  logger: Logger;
  queue: QueuedRequest[];
  processing: boolean;
  rateLimit: number;
  delayBetweenRequests: number;
  maxConcurrent: number;
  activeRequests: number;
  requestCount: number;
  lastResetTime: number;
  priorityQueue: QueuedRequest[];
  throttleDelay: number;
  exponentialBackoff: boolean;
  backoffMultiplier: number;
  maxBackoffDelay: number;

  constructor(logger: Logger, options: RequestQueueOptions = {}) {
    this.logger = logger;
    this.queue = [];
    this.processing = false;
    this.rateLimit = options.rateLimit ?? 60; // requests per minute
    this.delayBetweenRequests = options.delayBetweenRequests ?? 1000; // 1 second
    this.maxConcurrent = options.maxConcurrent ?? 1;
    this.activeRequests = 0;
    this.requestCount = 0;
    this.lastResetTime = Date.now();
    this.priorityQueue = []; // High priority requests
    this.throttleDelay = options.throttleDelay ?? 100;
    this.exponentialBackoff = options.exponentialBackoff !== false;
    this.backoffMultiplier = options.backoffMultiplier ?? 2;
    this.maxBackoffDelay = options.maxBackoffDelay ?? 10000;
  }

  /**
   * Add request to queue with optional priority
   */
  async enqueue(requestFn, priority = 0, metadata = {}) {
    return new Promise((resolve, reject) => {
      const request = {
        id: Date.now() + Math.random(),
        fn: requestFn,
        priority,
        metadata,
        resolve,
        reject,
        retries: 0,
        maxRetries: metadata.maxRetries || 3,
        addedAt: Date.now(),
      };

      if (priority > 0) {
        // Insert into priority queue (sorted by priority)
        const insertIndex = this.priorityQueue.findIndex(
          (r) => r.priority < priority,
        );
        if (insertIndex === -1) {
          this.priorityQueue.push(request);
        } else {
          this.priorityQueue.splice(insertIndex, 0, request);
        }
      } else {
        this.queue.push(request);
      }

      this.processQueue();
    });
  }

  /**
   * Process queue with rate limiting and throttling
   */
  async processQueue() {
    if (this.processing || this.activeRequests >= this.maxConcurrent) {
      return;
    }

    this.processing = true;

    while (
      (this.priorityQueue.length > 0 || this.queue.length > 0) &&
      this.activeRequests < this.maxConcurrent
    ) {
      // Check rate limit
      const now = Date.now();
      if (now - this.lastResetTime >= 60000) {
        this.requestCount = 0;
        this.lastResetTime = now;
      }

      if (this.requestCount >= this.rateLimit) {
        const waitTime = 60000 - (now - this.lastResetTime);
        if (waitTime > 0) {
          this.logger.debug(`Rate limit reached, waiting ${waitTime}ms...`);
          await this.sleep(waitTime);
          this.requestCount = 0;
          this.lastResetTime = Date.now();
        }
      }

      // Get next request (priority first)
      let request = this.priorityQueue.shift() || this.queue.shift();

      if (!request) break;

      this.activeRequests++;
      this.requestCount++;

      // Execute request with throttling
      this.executeRequest(request).finally(() => {
        this.activeRequests--;
        // Add delay between requests
        if (this.queue.length > 0 || this.priorityQueue.length > 0) {
          setTimeout(() => this.processQueue(), this.delayBetweenRequests);
        } else {
          this.processing = false;
        }
      });
    }

    if (this.queue.length === 0 && this.priorityQueue.length === 0) {
      this.processing = false;
    }
  }

  /**
   * Execute request with retry logic and exponential backoff
   */
  async executeRequest(request) {
    try {
      const result = await request.fn();
      request.resolve(result);
      return result;
    } catch (error) {
      request.retries++;

      if (request.retries < request.maxRetries && this.isRetryable(error)) {
        // Exponential backoff
        const delay = this.exponentialBackoff
          ? Math.min(
              this.throttleDelay *
                Math.pow(this.backoffMultiplier, request.retries - 1),
              this.maxBackoffDelay,
            )
          : this.throttleDelay * request.retries;

        this.logger.debug(
          `Request failed, retrying in ${delay}ms (attempt ${request.retries}/${request.maxRetries})...`,
        );

        await this.sleep(delay);

        // Re-queue with same priority
        if (request.priority > 0) {
          this.priorityQueue.push(request);
        } else {
          this.queue.push(request);
        }

        this.processQueue();
      } else {
        request.reject(error);
      }
    }
  }

  isRetryable(error) {
    const msg = error?.message || String(error);
    return (
      msg.includes("timeout") ||
      msg.includes("429") ||
      msg.includes("500") ||
      msg.includes("503") ||
      msg.includes("504") ||
      msg.includes("network") ||
      msg.includes("ECONNRESET") ||
      error.name === "AbortError"
    );
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Get queue statistics
   */
  getStats() {
    return {
      queueLength: this.queue.length,
      priorityQueueLength: this.priorityQueue.length,
      activeRequests: this.activeRequests,
      requestCount: this.requestCount,
      rateLimit: this.rateLimit,
      processing: this.processing,
    };
  }

  /**
   * Clear queue
   */
  clear() {
    this.queue = [];
    this.priorityQueue = [];
    this.processing = false;
    this.activeRequests = 0;
  }
}

// ============================================================================
// API KEY MANAGER - Automatic Rotation and Performance Monitoring
// ============================================================================

interface APIKeyEntry {
  key: string;
  index: number;
  performance: {
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    rateLimitedRequests: number;
    avgResponseTime: number;
    lastUsed: number | null;
    lastError: string | null;
    errors: unknown[];
  };
  status: string;
  rateLimitResetTime: number | null;
  consecutiveFailures: number;
}

class APIKeyManager {
  logger: Logger;
  apiKeys: APIKeyEntry[];
  currentKeyIndex: number;
  rotationHistory: unknown[];
  performanceThreshold: number;

  constructor(logger: Logger, apiKeys: string[] = []) {
    this.logger = logger;
    this.apiKeys = apiKeys.map((key) => ({
      key,
      index: 0,
      performance: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        rateLimitedRequests: 0,
        avgResponseTime: 0,
        lastUsed: null,
        lastError: null,
        errors: [],
      },
      status: "active", // active, rate_limited, failed, disabled
      rateLimitResetTime: null,
      consecutiveFailures: 0,
    }));

    this.currentKeyIndex = 0;
    this.rotationHistory = [];
    this.performanceThreshold = 0.8; // 80% success rate threshold
  }

  /**
   * Get current API key
   */
  getCurrentKey() {
    if (this.apiKeys.length === 0) return null;
    return this.apiKeys[this.currentKeyIndex];
  }

  /**
   * Get best performing API key
   */
  getBestKey() {
    if (this.apiKeys.length === 0) return null;

    const activeKeys = this.apiKeys.filter((k) => k.status === "active");
    if (activeKeys.length === 0) {
      // Reset all keys if all are rate limited
      this.apiKeys.forEach((k) => {
        if (
          k.status === "rate_limited" &&
          k.rateLimitResetTime &&
          Date.now() > k.rateLimitResetTime
        ) {
          k.status = "active";
          k.rateLimitResetTime = null;
        }
      });
      return this.apiKeys.find((k) => k.status === "active") || this.apiKeys[0];
    }

    // Sort by success rate and average response time
    activeKeys.sort((a, b) => {
      const aRate =
        a.performance.totalRequests > 0
          ? a.performance.successfulRequests / a.performance.totalRequests
          : 0;
      const bRate =
        b.performance.totalRequests > 0
          ? b.performance.successfulRequests / b.performance.totalRequests
          : 0;

      if (Math.abs(aRate - bRate) < 0.05) {
        // If success rates are similar, prefer faster one
        return a.performance.avgResponseTime - b.performance.avgResponseTime;
      }

      return bRate - aRate;
    });

    return activeKeys[0];
  }

  /**
   * Rotate to next API key
   */
  rotateKey(reason = "manual") {
    if (this.apiKeys.length <= 1) return this.getCurrentKey();

    const oldKey = this.getCurrentKey();
    const bestKey = this.getBestKey();

    if (bestKey && bestKey !== oldKey) {
      this.currentKeyIndex = this.apiKeys.indexOf(bestKey);

      this.rotationHistory.push({
        timestamp: Date.now(),
        from: oldKey?.key?.substring(0, 8) + "...",
        to: bestKey.key.substring(0, 8) + "...",
        reason,
      });

      this.logger.info(`🔄 Rotated API key: ${reason}`);
      return bestKey;
    }

    // Round-robin rotation
    this.currentKeyIndex = (this.currentKeyIndex + 1) % this.apiKeys.length;

    this.rotationHistory.push({
      timestamp: Date.now(),
      from: oldKey?.key?.substring(0, 8) + "...",
      to: this.getCurrentKey().key.substring(0, 8) + "...",
      reason,
    });

    this.logger.info(`🔄 Rotated API key (round-robin): ${reason}`);
    return this.getCurrentKey();
  }

  /**
   * Record request result for performance tracking
   */
  recordRequest(keyIndex, success, responseTime, error = null) {
    const key = this.apiKeys[keyIndex];
    if (!key) return;

    key.performance.totalRequests++;
    key.performance.lastUsed = Date.now();

    if (success) {
      key.performance.successfulRequests++;
      key.consecutiveFailures = 0;

      // Update average response time
      if (responseTime) {
        const total = key.performance.totalRequests;
        key.performance.avgResponseTime =
          (key.performance.avgResponseTime * (total - 1) + responseTime) /
          total;
      }
    } else {
      key.performance.failedRequests++;
      key.consecutiveFailures++;
      key.performance.lastError = error;

      if (error) {
        key.performance.errors.push({
          error,
          timestamp: Date.now(),
        });

        // Keep only last 10 errors
        if (key.performance.errors.length > 10) {
          key.performance.errors.shift();
        }
      }

      // Check if rate limited
      if (error?.includes("429") || error?.includes("rate limit")) {
        key.performance.rateLimitedRequests++;
        key.status = "rate_limited";
        key.rateLimitResetTime = Date.now() + 60000; // Reset after 1 minute

        this.logger.warning(
          `API key ${keyIndex} rate limited, will reset at ${new Date(key.rateLimitResetTime).toLocaleTimeString()}`,
        );
      }

      // Disable key if too many consecutive failures
      if (key.consecutiveFailures >= 5) {
        key.status = "disabled";
        this.logger.error(
          `API key ${keyIndex} disabled due to ${key.consecutiveFailures} consecutive failures`,
        );
      }
    }

    // Check performance threshold
    const successRate =
      key.performance.totalRequests > 0
        ? key.performance.successfulRequests / key.performance.totalRequests
        : 0;

    if (
      successRate < this.performanceThreshold &&
      key.performance.totalRequests >= 10
    ) {
      this.logger.warning(
        `API key ${keyIndex} performance below threshold: ${(successRate * 100).toFixed(1)}%`,
      );
    }
  }

  /**
   * Get performance metrics for all keys
   */
  getPerformanceMetrics() {
    return this.apiKeys.map((key, index) => ({
      index,
      key: key.key.substring(0, 8) + "...",
      status: key.status,
      performance: {
        ...key.performance,
        successRate:
          key.performance.totalRequests > 0
            ? (key.performance.successfulRequests /
                key.performance.totalRequests) *
              100
            : 0,
      },
      consecutiveFailures: key.consecutiveFailures,
      rateLimitResetTime: key.rateLimitResetTime,
    }));
  }

  /**
   * Get rotation history
   */
  getRotationHistory() {
    return this.rotationHistory;
  }

  /**
   * Add new API key
   */
  addKey(key) {
    this.apiKeys.push({
      key,
      index: this.apiKeys.length,
      performance: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        rateLimitedRequests: 0,
        avgResponseTime: 0,
        lastUsed: null,
        lastError: null,
        errors: [],
      },
      status: "active",
      rateLimitResetTime: null,
      consecutiveFailures: 0,
    });

    this.logger.info(`Added new API key (total: ${this.apiKeys.length})`);
  }

  /**
   * Remove API key
   */
  removeKey(index) {
    if (index >= 0 && index < this.apiKeys.length) {
      this.apiKeys.splice(index, 1);
      if (this.currentKeyIndex >= this.apiKeys.length) {
        this.currentKeyIndex = 0;
      }
      this.logger.info(`Removed API key (remaining: ${this.apiKeys.length})`);
    }
  }
}

// ============================================================================
// BYPASS MANAGER (از فایل اصلی)
// ============================================================================

class BypassManager {
  options: Record<string, unknown>;
  logger: Logger;
  activeBypass: { method: string; proxy?: string; detected?: string[] } | null;
  dnsManager: DNSManager;

  constructor(options: Record<string, unknown>, logger: Logger) {
    this.options = options;
    this.logger = logger;
    this.activeBypass = null;
    this.dnsManager = new DNSManager(
      logger,
      (options.region as string) || "us",
    );
  }

  async setup() {
    const mode = this.options.bypassMode || "auto";

    if (mode === "none") {
      return { success: false, method: "none" };
    }

    this.logger.bypass("Initializing bypass mechanisms...");

    // Step 1: Smart DNS Selection
    if (this.options.smartDNS !== false) {
      await this.dnsManager.selectBestDNS();
    }

    // Step 2: Custom Proxy
    if (this.options.proxy) {
      const result = await this.testProxy(this.options.proxy, "custom-proxy");
      if (result.success) return result;
    }

    // Step 3: System Proxy
    if (mode === "auto" || mode === "system-proxy") {
      const system = await this.checkSystemProxy();
      if (system.success) return system;
    }

    // Step 4: CDN Fallback
    if (mode === "auto") {
      this.logger.bypass("CDN fallback available");
      this.activeBypass = { method: "cdn-fallback" };
      return { success: true, method: "cdn-fallback" };
    }

    this.logger.warning("No bypass method succeeded, continuing without proxy");
    return { success: false, method: "none" };
  }

  async checkSystemProxy() {
    try {
      const testResponse = await fetch("https://www.google.com", {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
      });

      if (testResponse.ok || testResponse.status === 301) {
        this.logger.success("System proxy detected and working");
        this.activeBypass = { method: "system-proxy" };
        return { success: true, method: "system-proxy" };
      }
    } catch (error) {
      this.logger.debug(`System proxy check failed: ${error.message}`);
    }

    return { success: false, method: "none" };
  }

  async testProxy(proxyUrl, method) {
    this.logger.debug(`Proxy test for ${method}: ${proxyUrl}`);
    return { success: false, method: "none" };
  }

  getActiveBypass() {
    return this.activeBypass;
  }

  getDNSManager() {
    return this.dnsManager;
  }

  async rotateDNS() {
    return await this.dnsManager.rotateDNS();
  }
}

// ============================================================================
// STREAM MANAGER - Single Active Stream Enforcement and Cooldown Management
// ============================================================================

class StreamManager {
  logger: Logger;
  activeStreams: Map<
    string,
    {
      requestId: string;
      abortController: AbortController;
      model: string;
      startTime: number;
    }
  >;
  cooldowns: Map<string, { until: number; reason: string }>;
  minCooldownMs: number;

  constructor(logger: Logger) {
    this.logger = logger;
    this.activeStreams = new Map();
    this.cooldowns = new Map();
    this.minCooldownMs = 10000; // Minimum 10 seconds after 429
  }

  /**
   * Check if a stream can be started for this API key
   */
  canStartStream(apiKey, requestId, model) {
    // Check if already in cooldown
    const cooldown = this.cooldowns.get(apiKey);
    if (cooldown && Date.now() < cooldown.until) {
      const remaining = Math.ceil((cooldown.until - Date.now()) / 1000);
      this.logger.warning(
        `Stream blocked: API key in cooldown (${remaining}s remaining) - ${cooldown.reason}`,
      );
      return {
        allowed: false,
        reason: "cooldown",
        remainingSeconds: remaining,
        message: `Rate limited. Please wait ${remaining} seconds before trying again.`,
      };
    }

    // Check if there's already an active stream for this API key
    const activeStream = this.activeStreams.get(apiKey);
    if (activeStream) {
      this.logger.warning(
        `Stream blocked: Active stream already exists for this API key (requestId: ${activeStream.requestId})`,
      );
      return {
        allowed: false,
        reason: "active_stream",
        activeRequestId: activeStream.requestId,
        message:
          "Another request is already in progress. Please wait for it to complete.",
      };
    }

    return { allowed: true };
  }

  /**
   * Register a new stream (enforces single active stream)
   */
  registerStream(apiKey, requestId, model) {
    // Check if allowed
    const check = this.canStartStream(apiKey, requestId, model);
    if (!check.allowed) {
      throw new Error(check.message);
    }

    // Abort any existing stream (shouldn't happen due to check, but safety)
    const existing = this.activeStreams.get(apiKey);
    if (existing && existing.abortController) {
      this.logger.warning(
        `Aborting existing stream ${existing.requestId} to start new stream ${requestId}`,
      );
      existing.abortController.abort();
    }

    // Create abort controller for this stream
    const abortController = new AbortController();

    // Register new stream
    this.activeStreams.set(apiKey, {
      requestId,
      abortController,
      model,
      startTime: Date.now(),
    });

    this.logger.info(
      `Stream registered: ${requestId} for model ${model} (API key: ${apiKey.substring(0, 8)}...)`,
    );

    return abortController;
  }

  /**
   * Unregister a stream
   */
  unregisterStream(apiKey, requestId) {
    const active = this.activeStreams.get(apiKey);
    if (active && active.requestId === requestId) {
      this.activeStreams.delete(apiKey);
      this.logger.info(`Stream unregistered: ${requestId}`);
      return true;
    }
    return false;
  }

  /**
   * Handle 429 rate limit - abort stream and set cooldown
   */
  handleRateLimit(apiKey, requestId, reason = "HTTP 429") {
    // Abort active stream
    const active = this.activeStreams.get(apiKey);
    if (active && active.abortController) {
      this.logger.warning(`Aborting stream ${requestId} due to rate limit`);
      active.abortController.abort();
      this.activeStreams.delete(apiKey);
    }

    // Set cooldown (minimum 10 seconds)
    const cooldownUntil = Date.now() + this.minCooldownMs;
    this.cooldowns.set(apiKey, {
      until: cooldownUntil,
      reason: reason,
    });

    this.logger.error(
      `Rate limit cooldown set: ${Math.ceil(this.minCooldownMs / 1000)}s (${reason})`,
    );
  }

  /**
   * Check if in cooldown
   */
  isInCooldown(apiKey) {
    const cooldown = this.cooldowns.get(apiKey);
    if (!cooldown) return false;

    if (Date.now() >= cooldown.until) {
      // Cooldown expired, remove it
      this.cooldowns.delete(apiKey);
      return false;
    }

    return true;
  }

  /**
   * Get remaining cooldown time
   */
  getRemainingCooldown(apiKey) {
    const cooldown = this.cooldowns.get(apiKey);
    if (!cooldown) return 0;

    const remaining = cooldown.until - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * Get active stream info
   */
  getActiveStream(apiKey) {
    return this.activeStreams.get(apiKey);
  }

  /**
   * Clear all streams (emergency cleanup)
   */
  clearAll() {
    this.activeStreams.forEach((stream, apiKey) => {
      if (stream.abortController) {
        stream.abortController.abort();
      }
    });
    this.activeStreams.clear();
    this.logger.warning("All active streams cleared");
  }
}

// ============================================================================
// API CONFIGURATION VALIDATOR - Smart API Key Validation and Management
// ============================================================================

class APIConfigValidator {
  logger: Logger;
  validationCache: Map<string, { result: unknown; timestamp: number }>;
  cacheTTL: number;

  constructor(logger: Logger) {
    this.logger = logger;
    this.validationCache = new Map();
    this.cacheTTL = 300000; // 5 minutes
  }

  /**
   * Validate API key format without making network requests
   */
  validateKeyFormat(apiKey) {
    if (!apiKey || typeof apiKey !== "string") {
      return {
        valid: false,
        error: "API_KEY_MISSING",
        message: "API key is missing or invalid type",
        suggestion: 'Please enter a valid API key starting with "AIza"',
      };
    }

    const trimmed = apiKey.trim();

    if (trimmed.length === 0) {
      return {
        valid: false,
        error: "API_KEY_EMPTY",
        message: "API key cannot be empty",
        suggestion: "Please enter your API key",
      };
    }

    if (trimmed.length < 20) {
      return {
        valid: false,
        error: "API_KEY_TOO_SHORT",
        message: "API key appears to be too short",
        suggestion:
          "Please check your API key. Valid keys are typically 39 characters long",
      };
    }

    if (!trimmed.startsWith("AIza")) {
      return {
        valid: false,
        error: "API_KEY_INVALID_FORMAT",
        message: "API key format appears incorrect",
        suggestion:
          'Valid Gemini API keys start with "AIza". Please verify your key.',
      };
    }

    return {
      valid: true,
      error: null,
      message: "API key format is valid",
      suggestion: null,
    };
  }

  /**
   * Check if API key is already validated (cached)
   */
  isKeyCached(apiKey) {
    const cached = this.validationCache.get(apiKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.result;
    }
    return null;
  }

  /**
   * Cache validation result
   */
  cacheValidation(apiKey, result) {
    this.validationCache.set(apiKey, {
      result,
      timestamp: Date.now(),
    });
  }

  /**
   * Validate API key configuration before initialization
   */
  validateConfiguration(apiKeys) {
    const errors = [];
    const warnings = [];
    const validKeys = [];

    if (!apiKeys || apiKeys.length === 0) {
      return {
        valid: false,
        errors: ["No API keys provided"],
        warnings: [],
        validKeys: [],
        message: "Please configure at least one API key to continue",
      };
    }

    apiKeys.forEach((key, index) => {
      const formatCheck = this.validateKeyFormat(key);

      if (!formatCheck.valid) {
        errors.push({
          keyIndex: index + 1,
          error: formatCheck.error,
          message: formatCheck.message,
          suggestion: formatCheck.suggestion,
        });
      } else {
        validKeys.push({
          key: key,
          index: index,
          masked: this.maskKey(key),
        });
      }
    });

    if (validKeys.length === 0) {
      return {
        valid: false,
        errors: errors.map((e) => `Key ${e.keyIndex}: ${e.message}`),
        warnings: warnings,
        validKeys: [],
        message: "No valid API keys found. Please check your configuration.",
      };
    }

    if (errors.length > 0 && validKeys.length > 0) {
      warnings.push(
        `${errors.length} invalid key(s) detected, but ${validKeys.length} valid key(s) available`,
      );
    }

    return {
      valid: validKeys.length > 0,
      errors: errors,
      warnings: warnings,
      validKeys: validKeys,
      message:
        validKeys.length > 0
          ? `Configuration valid: ${validKeys.length} API key(s) ready`
          : "Configuration invalid: Please check your API keys",
    };
  }

  /**
   * Mask API key for logging
   */
  maskKey(apiKey) {
    if (!apiKey || apiKey.length < 10) return "***";
    return apiKey.substring(0, 8) + "..." + apiKey.substring(apiKey.length - 4);
  }

  /**
   * Get context-specific error message based on error type
   */
  getContextualErrorMessage(error, apiKey = null) {
    const errorMsg = error?.message || String(error);
    const status = error?.status || error?.response?.status;
    const category = error?.category;

    // Network errors
    if (
      category === "network" ||
      errorMsg.includes("network") ||
      errorMsg.includes("ECONN") ||
      errorMsg.includes("fetch") ||
      errorMsg.includes("timeout")
    ) {
      return {
        title: "Network Connection Issue",
        message:
          "Unable to connect to the Gemini API. This is likely a network or connectivity problem.",
        details: errorMsg,
        suggestions: [
          "Check your internet connection",
          "Verify your network settings",
          "Try using a different DNS server (Smart DNS is enabled)",
          "Check if a firewall or proxy is blocking the connection",
        ],
        isConfigIssue: false,
      };
    }

    // Authentication errors
    if (
      category === "authentication" ||
      status === 401 ||
      status === 403 ||
      errorMsg.includes("401") ||
      errorMsg.includes("403") ||
      errorMsg.includes("unauthorized") ||
      errorMsg.includes("forbidden")
    ) {
      const is401 =
        status === 401 ||
        errorMsg.includes("401") ||
        errorMsg.includes("unauthorized");

      return {
        title: is401 ? "Invalid API Key" : "API Key Permission Denied",
        message: is401
          ? "The API key provided is invalid or has been revoked."
          : "The API key does not have permission to access this resource.",
        details: errorMsg,
        suggestions: is401
          ? [
              'Verify the API key is correct (should start with "AIza")',
              "Check if the key was copied completely",
              "Generate a new API key from Google AI Studio",
              "Ensure no extra spaces or characters were added",
            ]
          : [
              "Check if billing is enabled for your Google Cloud project",
              "Verify API quotas and limits",
              "Ensure the API key has the necessary permissions",
              "Check if the model requires special access",
            ],
        isConfigIssue: true,
      };
    }

    // Rate limiting
    if (
      category === "rate_limit" ||
      status === 429 ||
      errorMsg.includes("429") ||
      errorMsg.includes("rate limit") ||
      errorMsg.includes("quota")
    ) {
      return {
        title: "Rate Limit Exceeded",
        message: "Too many requests. The API rate limit has been reached.",
        details: errorMsg,
        suggestions: [
          "Wait a few minutes before retrying",
          "Enable auto-rotation to use multiple API keys",
          "Reduce request frequency",
          "Check your API quota limits in Google Cloud Console",
        ],
        isConfigIssue: false,
      };
    }

    // Server errors
    if (
      category === "server" ||
      (status >= 500 && status < 600) ||
      errorMsg.includes("500") ||
      errorMsg.includes("502") ||
      errorMsg.includes("503")
    ) {
      return {
        title: "API Service Unavailable",
        message: "The Gemini API service is temporarily unavailable.",
        details: errorMsg,
        suggestions: [
          "This is usually temporary - try again in a few moments",
          "Check Google Cloud Status page for service updates",
          "Retry with exponential backoff (automatic)",
        ],
        isConfigIssue: false,
      };
    }

    // Not found errors
    if (
      category === "not_found" ||
      status === 404 ||
      errorMsg.includes("404")
    ) {
      return {
        title: "Resource Not Found",
        message: "The requested model or endpoint was not found.",
        details: errorMsg,
        suggestions: [
          "Verify the model name is correct",
          "Check if the model is available in your region",
          "Ensure you are using the correct API endpoint",
        ],
        isConfigIssue: false,
      };
    }

    // Generic error
    return {
      title: "API Request Failed",
      message: "An error occurred while communicating with the API.",
      details: errorMsg.substring(0, 200),
      suggestions: [
        "Check the error details above",
        "Verify your API key is valid",
        "Check your network connection",
        "Review the console logs for more information",
      ],
      isConfigIssue: false,
    };
  }

  /**
   * Clear validation cache
   */
  clearCache() {
    this.validationCache.clear();
    this.logger?.info("API validation cache cleared");
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.validationCache.size,
      entries: Array.from(this.validationCache.entries()).map(
        ([key, value]) => ({
          key: this.maskKey(key),
          age: Date.now() - value.timestamp,
          result: value.result,
        }),
      ),
    };
  }
}

// ============================================================================
// SCHEDULER - Request Scheduling and Auto-Reset
// ============================================================================

interface ScheduledTaskEntry {
  id: string;
  type: string;
  timeoutId?: ReturnType<typeof setTimeout>;
  scheduledFor?: number;
}

class Scheduler {
  logger: Logger;
  scheduledTasks: ScheduledTaskEntry[];
  activeIntervals: Map<string, ReturnType<typeof setInterval>>;
  autoResetIntervals: Map<string, ReturnType<typeof setInterval>>;

  constructor(logger: Logger) {
    this.logger = logger;
    this.scheduledTasks = [];
    this.activeIntervals = new Map();
    this.autoResetIntervals = new Map();
  }

  /**
   * Schedule a task to run at a specific time or interval
   */
  scheduleTask(taskId, taskFn, schedule) {
    // Remove existing task if any
    this.cancelTask(taskId);

    if (schedule.type === "once") {
      // Schedule for specific time
      const delay = schedule.time - Date.now();
      if (delay > 0) {
        const timeoutId = setTimeout(() => {
          this.logger.info(`Executing scheduled task: ${taskId}`);
          taskFn();
          this.scheduledTasks = this.scheduledTasks.filter(
            (t) => t.id !== taskId,
          );
        }, delay);

        this.scheduledTasks.push({
          id: taskId,
          type: "once",
          timeoutId,
          scheduledFor: schedule.time,
        });

        this.logger.info(
          `Scheduled task ${taskId} for ${new Date(schedule.time).toLocaleString()}`,
        );
      }
    } else if (schedule.type === "interval") {
      // Schedule recurring task
      const intervalId = setInterval(() => {
        this.logger.info(`Executing recurring task: ${taskId}`);
        taskFn();
      }, schedule.interval);

      this.activeIntervals.set(taskId, intervalId);

      this.logger.info(
        `Scheduled recurring task ${taskId} every ${schedule.interval}ms`,
      );
    } else if (schedule.type === "daily") {
      // Schedule daily task at specific time
      const scheduleDaily = () => {
        const now = new Date();
        const targetTime = new Date(now);
        const [hours, minutes] = schedule.time.split(":").map(Number);
        targetTime.setHours(hours, minutes, 0, 0);

        if (targetTime <= now) {
          targetTime.setDate(targetTime.getDate() + 1);
        }

        const delay = targetTime.getTime() - now.getTime();

        setTimeout(() => {
          this.logger.info(`Executing daily task: ${taskId}`);
          taskFn();
          scheduleDaily(); // Schedule next day
        }, delay);
      };

      scheduleDaily();
      this.logger.info(`Scheduled daily task ${taskId} at ${schedule.time}`);
    }
  }

  /**
   * Cancel a scheduled task
   */
  cancelTask(taskId) {
    // Cancel one-time tasks
    const task = this.scheduledTasks.find((t) => t.id === taskId);
    if (task) {
      clearTimeout(task.timeoutId);
      this.scheduledTasks = this.scheduledTasks.filter((t) => t.id !== taskId);
      this.logger.info(`Cancelled scheduled task: ${taskId}`);
    }

    // Cancel interval tasks
    const intervalId = this.activeIntervals.get(taskId);
    if (intervalId) {
      clearInterval(intervalId);
      this.activeIntervals.delete(taskId);
      this.logger.info(`Cancelled recurring task: ${taskId}`);
    }

    // Cancel auto-reset intervals
    const resetInterval = this.autoResetIntervals.get(taskId);
    if (resetInterval) {
      clearInterval(resetInterval);
      this.autoResetIntervals.delete(taskId);
      this.logger.info(`Cancelled auto-reset for: ${taskId}`);
    }
  }

  /**
   * Setup auto-reset for API key rate limits
   */
  setupAutoReset(keyId, resetFn, checkInterval = 60000) {
    this.cancelTask(`auto-reset-${keyId}`);

    const intervalId = setInterval(() => {
      resetFn();
    }, checkInterval);

    this.autoResetIntervals.set(`auto-reset-${keyId}`, intervalId);
    this.logger.info(
      `Auto-reset enabled for ${keyId} (checking every ${checkInterval}ms)`,
    );
  }

  /**
   * Get all scheduled tasks
   */
  getScheduledTasks() {
    return {
      oneTime: this.scheduledTasks.map((t) => ({
        id: t.id,
        scheduledFor: t.scheduledFor,
        timeRemaining: t.scheduledFor - Date.now(),
      })),
      recurring: Array.from(this.activeIntervals.keys()),
      autoReset: Array.from(this.autoResetIntervals.keys()),
    };
  }

  /**
   * Clear all scheduled tasks
   */
  clearAll() {
    this.scheduledTasks.forEach((t) => clearTimeout(t.timeoutId));
    this.activeIntervals.forEach((id) => clearInterval(id));
    this.autoResetIntervals.forEach((id) => clearInterval(id));

    this.scheduledTasks = [];
    this.activeIntervals.clear();
    this.autoResetIntervals.clear();

    this.logger.info("All scheduled tasks cleared");
  }
}

// ============================================================================
// ERROR CATEGORIZER - Categorized Error Handling
// ============================================================================

class ErrorCategorizer {
  static categorize(error) {
    const msg = error?.message || String(error);
    const status = error?.status || error?.response?.status;

    // DNS/Network Errors
    if (
      msg.includes("network") ||
      msg.includes("ECONN") ||
      msg.includes("ENOTFOUND") ||
      msg.includes("timeout") ||
      error.name === "AbortError" ||
      msg.includes("fetch")
    ) {
      return {
        category: "network",
        type: "dns_network_error",
        severity: "high",
        retryable: true,
        action: "retry_with_backoff",
        message: "Network or DNS resolution error. Check internet connection.",
        suggestedFix:
          "Verify internet connection, try different DNS server, or check proxy settings.",
      };
    }

    // Rate Limiting Errors
    if (
      status === 429 ||
      msg.includes("429") ||
      msg.includes("rate limit") ||
      msg.includes("quota") ||
      msg.includes("exceeded")
    ) {
      return {
        category: "rate_limit",
        type: "rate_limit_exceeded",
        severity: "medium",
        retryable: true,
        action: "retry_with_exponential_backoff",
        message: "Rate limit exceeded. Too many requests.",
        suggestedFix:
          "Wait before retrying, use API key rotation, or reduce request frequency.",
      };
    }

    // Authentication Errors
    if (
      status === 401 ||
      status === 403 ||
      msg.includes("401") ||
      msg.includes("403") ||
      msg.includes("unauthorized") ||
      msg.includes("forbidden") ||
      msg.includes("permission")
    ) {
      return {
        category: "authentication",
        type: status === 401 ? "unauthorized" : "forbidden",
        severity: "critical",
        retryable: false,
        action: "check_credentials",
        message:
          status === 401
            ? "Unauthorized. Invalid API key."
            : "Forbidden. Check API key permissions.",
        suggestedFix:
          "Verify API key is correct and has proper permissions/billing enabled.",
      };
    }

    // Server Errors
    if (
      status >= 500 ||
      msg.includes("500") ||
      msg.includes("502") ||
      msg.includes("503") ||
      msg.includes("504") ||
      msg.includes("server error")
    ) {
      return {
        category: "server",
        type: "server_error",
        severity: "medium",
        retryable: true,
        action: "retry_with_backoff",
        message: "Server error. API service temporarily unavailable.",
        suggestedFix: "Retry after a short delay. This is usually temporary.",
      };
    }

    // Not Found Errors
    if (status === 404 || msg.includes("404") || msg.includes("not found")) {
      return {
        category: "not_found",
        type: "resource_not_found",
        severity: "low",
        retryable: false,
        action: "check_endpoint",
        message: "Resource not found. Invalid endpoint or model.",
        suggestedFix: "Verify the endpoint URL and model name are correct.",
      };
    }

    // Bad Request Errors
    if (
      status === 400 ||
      msg.includes("400") ||
      msg.includes("bad request") ||
      msg.includes("invalid")
    ) {
      return {
        category: "client_error",
        type: "bad_request",
        severity: "medium",
        retryable: false,
        action: "check_request",
        message: "Bad request. Invalid request parameters.",
        suggestedFix: "Check request body, parameters, and format.",
      };
    }

    // Unknown/Generic Errors
    return {
      category: "unknown",
      type: "unknown_error",
      severity: "low",
      retryable: true,
      action: "retry_with_backoff",
      message: msg.substring(0, 100),
      suggestedFix: "Check error details and try again.",
    };
  }

  static getRetryDelay(category, attempt, baseDelay = 1000) {
    if (category === "rate_limit") {
      // Exponential backoff for rate limits
      return Math.min(baseDelay * Math.pow(2, attempt), 60000); // Max 60 seconds
    }

    if (category === "network" || category === "server") {
      // Exponential backoff for network/server errors
      return Math.min(baseDelay * Math.pow(2, attempt), 10000); // Max 10 seconds
    }

    // Linear backoff for other retryable errors
    return baseDelay * (attempt + 1);
  }
}

// ============================================================================
// SMART HTTP CLIENT - Enhanced with Queue, Key Management, and Error Handling
// ============================================================================

interface RequestOptions {
  useCDN?: boolean;
  method?: string;
  maxRetries?: number;
  timeout?: number;
  priority?: number;
  useQueue?: boolean;
  model?: string;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  body?: string | unknown;
}

interface ErrorStatsCount {
  network: number;
  rate_limit: number;
  authentication: number;
  server: number;
  not_found: number;
  client_error: number;
  unknown: number;
}

class SmartHTTPClient {
  apiKey: string;
  logger: Logger;
  bypassManager: BypassManager | null;
  apiKeyManager: APIKeyManager | null;
  requestQueue: RequestQueue | null;
  baseUrl: string;
  performanceStats: unknown[];
  errorStats: ErrorStatsCount;

  constructor(
    apiKey: string,
    logger: Logger,
    bypassManager: BypassManager | null = null,
    apiKeyManager: APIKeyManager | null = null,
    requestQueue: RequestQueue | null = null,
  ) {
    this.apiKey = apiKey;
    this.logger = logger;
    this.bypassManager = bypassManager;
    this.apiKeyManager = apiKeyManager;
    this.requestQueue = requestQueue;
    this.baseUrl = CONFIG.GEMINI_API.baseUrl;
    this.performanceStats = [];
    this.errorStats = {
      network: 0,
      rate_limit: 0,
      authentication: 0,
      server: 0,
      not_found: 0,
      client_error: 0,
      unknown: 0,
    };
  }

  async request(endpoint: string, options: RequestOptions = {}) {
    const url = `${options.useCDN ? CONFIG.GEMINI_API.cdnUrl : this.baseUrl}${endpoint}`;
    const method = options.method || "GET";
    const maxRetries = options.maxRetries ?? CONFIG.GEMINI_API.maxRetries;
    const timeout = options.timeout ?? CONFIG.GEMINI_API.timeout;
    const priority = options.priority ?? 0;

    // Use request queue if available
    if (this.requestQueue && options.useQueue !== false) {
      return this.requestQueue.enqueue(
        () =>
          this.executeRequest(
            url,
            method,
            options,
            timeout,
            maxRetries,
            endpoint,
          ),
        priority,
        { endpoint, method, ...options },
      );
    }

    // Direct execution without queue
    return this.executeRequest(
      url,
      method,
      options,
      timeout,
      maxRetries,
      endpoint,
    );
  }

  async executeRequest(url, method, options, timeout, maxRetries, endpoint) {
    let lastError = null;
    let currentApiKey = this.apiKey;
    let currentKeyIndex = this.apiKeyManager?.getCurrentKey()?.index || 0;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // Get best API key if manager available
        if (this.apiKeyManager) {
          const bestKey = this.apiKeyManager.getBestKey();
          if (bestKey) {
            currentApiKey = bestKey.key;
            currentKeyIndex = bestKey.index;
          }
        }

        const startTime = Date.now();
        const result = await this.makeRequest(
          url,
          method,
          options,
          timeout,
          currentApiKey,
        );
        const responseTime = Date.now() - startTime;

        // Record performance
        if (this.apiKeyManager) {
          this.apiKeyManager.recordRequest(
            currentKeyIndex,
            result.success,
            responseTime,
            result.error,
          );
        }

        if (CONFIG.PERFORMANCE.trackResponseTimes) {
          this.performanceStats.push({
            url: endpoint,
            responseTime: result.responseTime,
            success: result.success,
            timestamp: Date.now(),
          });
        }

        if (result.success) {
          return result;
        }

        // Categorize error
        const errorCategory = ErrorCategorizer.categorize({
          message: result.error,
          status: result.status,
        });

        this.errorStats[errorCategory.category] =
          (this.errorStats[errorCategory.category] || 0) + 1;
        lastError = { ...result, category: errorCategory };

        // Handle rate limiting with key rotation
        if (
          errorCategory.category === "rate_limit" &&
          this.apiKeyManager &&
          this.apiKeyManager.apiKeys.length > 1
        ) {
          this.logger.warning("Rate limit detected, rotating API key...");
          this.apiKeyManager.rotateKey("rate_limit");
          await this.sleep(1000); // Wait before retry
          continue;
        }

        // Handle network errors with DNS rotation
        if (
          errorCategory.category === "network" &&
          this.bypassManager &&
          attempt < maxRetries
        ) {
          this.logger.bypass("Network error detected, trying DNS rotation...");
          await this.bypassManager.rotateDNS();
        }

        // Retry logic with categorized backoff
        if (attempt < maxRetries && errorCategory.retryable) {
          const delay = ErrorCategorizer.getRetryDelay(
            errorCategory.category,
            attempt - 1,
          );

          this.logger.debug(
            `Retrying in ${delay}ms... (${errorCategory.type})`,
          );
          await this.sleep(delay);

          // Try CDN on second attempt
          if (attempt === 2 && !options.useCDN) {
            this.logger.bypass("Trying CDN fallback on retry...");
            options.useCDN = true;
            url = `${CONFIG.GEMINI_API.cdnUrl}${endpoint}`;
          }

          continue;
        }

        // Non-retryable error
        if (!errorCategory.retryable) {
          this.logger.error(`Non-retryable error: ${errorCategory.message}`);
          return {
            success: false,
            responseTime: 0,
            error: errorCategory.message,
            category: errorCategory,
            status: result.status,
          };
        }
      } catch (error) {
        lastError = error;
        const errorCategory = ErrorCategorizer.categorize(error);
        this.errorStats[errorCategory.category] =
          (this.errorStats[errorCategory.category] || 0) + 1;

        this.logger.debug(
          `Attempt ${attempt}/${maxRetries} failed: ${errorCategory.message}`,
        );

        if (attempt < maxRetries && errorCategory.retryable) {
          const delay = ErrorCategorizer.getRetryDelay(
            errorCategory.category,
            attempt - 1,
          );

          this.logger.debug(
            `Retrying in ${delay}ms... (${errorCategory.type})`,
          );
          await this.sleep(delay);

          // Try CDN on second attempt
          if (attempt === 2 && !options.useCDN) {
            this.logger.bypass("Trying CDN fallback on retry...");
            options.useCDN = true;
            url = `${CONFIG.GEMINI_API.cdnUrl}${endpoint}`;
          }

          // Try DNS rotation on network errors
          if (errorCategory.category === "network" && this.bypassManager) {
            this.logger.bypass(
              "Network error detected, trying DNS rotation...",
            );
            await this.bypassManager.rotateDNS();
          }

          continue;
        }
      }
    }

    // All retries exhausted
    const finalError =
      lastError?.category ||
      ErrorCategorizer.categorize(
        lastError || { message: "Max retries exceeded" },
      );

    return {
      success: false,
      responseTime: 0,
      error: finalError.message || "Max retries exceeded",
      category: finalError,
      status: lastError?.status,
    };
  }

  async makeRequest(url, method, options, timeout, apiKey = null) {
    const startTime = Date.now();
    const keyToUse = apiKey || this.apiKey;

    const urlWithKey = url.includes("?")
      ? `${url}&key=${encodeURIComponent(keyToUse)}`
      : `${url}?key=${encodeURIComponent(keyToUse)}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(urlWithKey, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          data,
          responseTime,
          status: response.status,
        };
      } else {
        const errorText = await response.text();
        const error = new Error(`HTTP ${response.status}: ${errorText}`);
        (error as any).status = response.status;
        throw error;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        (error as any).status = (error as any).status || 0;
      }
      throw error;
    }
  }

  isRetryable(error) {
    const msg = error.message || String(error);
    return (
      msg.includes("timeout") ||
      msg.includes("429") ||
      msg.includes("500") ||
      msg.includes("503") ||
      msg.includes("504") ||
      msg.includes("network") ||
      msg.includes("ECONNRESET") ||
      error.name === "AbortError"
    );
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getPerformanceStats() {
    return this.performanceStats;
  }

  getErrorStats() {
    return this.errorStats;
  }

  getErrorSummary() {
    const total = Object.values(this.errorStats).reduce((a, b) => a + b, 0);
    return {
      total,
      byCategory: this.errorStats,
      mostCommon:
        Object.entries(this.errorStats).sort(([, a], [, b]) => b - a)[0]?.[0] ||
        "none",
    };
  }

  /**
   * Stream request - SSE streaming for Gemini API
   * This is the ONLY place that makes streaming calls to generativelanguage.googleapis.com
   */
  async *streamRequest(
    endpoint,
    options = {},
    streamManager = null,
    requestId = null,
  ) {
    const url = `${options.useCDN ? CONFIG.GEMINI_API.cdnUrl : this.baseUrl}${endpoint}`;
    const method = options.method || "POST";
    const timeout = options.timeout || CONFIG.GEMINI_API.timeout;
    const model = options.model || "unknown";

    let currentApiKey = this.apiKey;
    let currentKeyIndex = this.apiKeyManager?.getCurrentKey()?.index || 0;

    // Get best API key if manager available
    if (this.apiKeyManager) {
      const bestKey = this.apiKeyManager.getBestKey();
      if (bestKey) {
        currentApiKey = bestKey.key;
        currentKeyIndex = bestKey.index;
      }
    }

    // Check stream manager for cooldown and active streams
    if (streamManager) {
      const canStart = streamManager.canStartStream(
        currentApiKey,
        requestId || "stream",
        model,
      );
      if (!canStart.allowed) {
        throw new Error(canStart.message);
      }

      // Register stream
      const abortController = streamManager.registerStream(
        currentApiKey,
        requestId || "stream",
        model,
      );
      options.signal = abortController.signal; // Use stream manager's abort controller
    }

    const urlWithKey = url.includes("?")
      ? `${url}&key=${encodeURIComponent(currentApiKey)}`
      : `${url}?key=${encodeURIComponent(currentApiKey)}`;

    let streamError = null;
    let responseStatus = null;

    try {
      const response = await fetch(urlWithKey, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: options.signal,
      });

      responseStatus = response.status;

      // Handle 429 rate limit
      if (response.status === 429) {
        if (streamManager) {
          streamManager.handleRateLimit(
            currentApiKey,
            requestId || "stream",
            "HTTP 429",
          );
        }

        // Record error
        if (this.apiKeyManager) {
          this.apiKeyManager.recordRequest(
            currentKeyIndex,
            false,
            0,
            "Rate limit exceeded (429)",
          );
        }

        this.errorStats.rate_limit++;

        throw new Error("Rate limit exceeded. Please wait before retrying.");
      }

      if (!response.ok) {
        const errorText = await response.text();
        const error = new Error(`HTTP ${response.status}: ${errorText}`);
        (error as any).status = response.status;

        // Record error
        if (this.apiKeyManager) {
          this.apiKeyManager.recordRequest(
            currentKeyIndex,
            false,
            0,
            error.message,
          );
        }

        throw error;
      }

      // Check if response is streaming (SSE)
      const contentType = response.headers.get("content-type") || "";
      const isStreaming =
        contentType.includes("text/event-stream") ||
        contentType.includes("stream");

      if (!isStreaming || !response.body) {
        // Non-streaming response
        const data = await response.json();
        yield { type: "data", data };
        return;
      }

      // Streaming response - read SSE stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || ""; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();

              if (dataStr === "[DONE]") {
                return;
              }

              try {
                const data = JSON.parse(dataStr);
                yield { type: "chunk", data };
              } catch (parseError) {
                // Skip invalid JSON
                this.logger?.debug(
                  `Failed to parse SSE data: ${dataStr.substring(0, 100)}`,
                );
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      streamError = error;

      // Handle abort
      if (error.name === "AbortError") {
        this.logger?.info(`Stream aborted: ${requestId || "stream"}`);
        return; // Clean abort, don't throw
      }

      // Handle 429
      if (
        responseStatus === 429 ||
        error.message?.includes("429") ||
        error.message?.includes("Rate limit")
      ) {
        if (streamManager) {
          streamManager.handleRateLimit(
            currentApiKey,
            requestId || "stream",
            "HTTP 429",
          );
        }

        this.errorStats.rate_limit++;

        throw new Error("Rate limit exceeded. Please wait before retrying.");
      }

      // Record error
      if (this.apiKeyManager) {
        this.apiKeyManager.recordRequest(
          currentKeyIndex,
          false,
          0,
          error.message,
        );
      }

      // Categorize and throw
      const errorCategory = ErrorCategorizer.categorize(error);
      this.errorStats[errorCategory.category] =
        (this.errorStats[errorCategory.category] || 0) + 1;

      throw error;
    } finally {
      // Always unregister stream
      if (streamManager) {
        streamManager.unregisterStream(currentApiKey, requestId || "stream");
      }
    }
  }
}

// ============================================================================
// MODEL ENRICHMENT (از فایل اصلی)
// ============================================================================

function enrichModelInfo(modelName) {
  if (CONFIG.MODELS[modelName]) {
    return CONFIG.MODELS[modelName];
  }

  for (const [name, info] of Object.entries(CONFIG.MODELS)) {
    if (modelName.includes(name) || name.includes(modelName.split("-")[0])) {
      return info;
    }
  }

  let family = "unknown";
  let tier = "unknown";

  if (modelName.includes("gemini-3")) family = "3.0";
  else if (modelName.includes("gemini-2.5")) family = "2.5";
  else if (modelName.includes("gemini-2.0")) family = "2.0";
  else if (modelName.includes("gemini-1.5")) family = "1.5";
  else if (modelName.includes("gemini-1.0")) family = "1.0";
  else if (modelName.includes("gemma")) family = "gemma";
  else if (modelName.includes("robotics")) family = "robotics";

  if (modelName.includes("pro")) tier = "pro";
  else if (modelName.includes("flash")) tier = "flash";
  else if (modelName.includes("lite")) tier = "lite";
  else if (modelName.includes("preview")) tier = "preview";
  else if (modelName.includes("exp")) tier = "experimental";

  return {
    family,
    tier,
    capabilities: ["text", "streaming"],
    contextWindow: family === "3.0" || family === "2.5" ? 1000000 : 8192,
    description: `Discovered model: ${modelName}`,
  };
}

// ============================================================================
// ULTIMATE GEMINI TESTER CLASS (از فایل اصلی)
// ============================================================================

interface UltimateGeminiTesterResults {
  timestamp: string;
  apiKey: string;
  bypassMethod: string;
  models: {
    total: number;
    discovered: unknown[];
    accessible: unknown[];
    restricted: unknown[];
    failed: unknown[];
  };
  capabilities: Record<string, unknown[]>;
  performance: {
    totalTime: number;
    avgResponseTime: number;
    fastest?: unknown;
    slowest?: unknown;
    modelStats: unknown[];
  };
  errors: unknown[];
}

class UltimateGeminiTester {
  options: Record<string, unknown>;
  logger: Logger;
  configValidator: APIConfigValidator;
  bypassManager: BypassManager;
  apiKeyManager: APIKeyManager;
  requestQueue: RequestQueue;
  streamManager: StreamManager;
  client: SmartHTTPClient | null;
  currentKeyIndex: number;
  results: UltimateGeminiTesterResults;

  constructor(options: Record<string, unknown>) {
    this.options = options;
    this.logger = new Logger(
      (options.verbose as boolean) || false,
      (options.addLogCallback as
        | ((level: string, message: string, data?: unknown) => void)
        | null) ?? null,
    );

    // Initialize API Configuration Validator
    this.configValidator = new APIConfigValidator(this.logger);

    // Validate configuration early
    const apiKeys = options.apiKeys || (options.apiKey ? [options.apiKey] : []);
    const configCheck = this.configValidator.validateConfiguration(apiKeys);

    if (!configCheck.valid) {
      this.logger.error("API configuration validation failed");
      configCheck.errors.forEach((err) => {
        if (typeof err === "string") {
          this.logger.error(`  - ${err}`);
        } else {
          this.logger.error(`  - Key ${err.keyIndex}: ${err.message}`);
          if (err.suggestion) {
            this.logger.info(`    Suggestion: ${err.suggestion}`);
          }
        }
      });

      // Don't throw, but log warnings - let initialization continue for graceful handling
      this.logger.warning("Continuing with available valid keys...");
    } else {
      this.logger.info(
        `Configuration validated: ${configCheck.validKeys.length} valid API key(s)`,
      );
      if (configCheck.warnings.length > 0) {
        configCheck.warnings.forEach((warning) => this.logger.warning(warning));
      }
    }

    this.bypassManager = new BypassManager(options, this.logger);

    // Initialize API Key Manager with validated keys only
    const validKeys = configCheck.validKeys.map((vk) => vk.key);
    this.apiKeyManager = new APIKeyManager(
      this.logger,
      validKeys.length > 0 ? validKeys : apiKeys,
    );

    // Initialize Request Queue
    this.requestQueue = new RequestQueue(this.logger, {
      rateLimit: options.rateLimit || CONFIG.GEMINI_API.rateLimit,
      delayBetweenRequests:
        options.delayBetweenRequests || CONFIG.GEMINI_API.delayBetweenRequests,
      maxConcurrent: options.maxConcurrent || 1,
      exponentialBackoff: options.exponentialBackoff !== false,
      backoffMultiplier:
        options.backoffMultiplier || CONFIG.GEMINI_API.backoffMultiplier,
      maxBackoffDelay:
        options.maxBackoffDelay || CONFIG.GEMINI_API.maxBackoffDelay,
    });

    // Initialize Stream Manager (enforces single active stream per API key)
    this.streamManager = new StreamManager(this.logger);

    this.client = null;
    this.currentKeyIndex = 0;

    this.results = {
      timestamp: new Date().toISOString(),
      apiKey: this.maskApiKey(options.apiKey || options.apiKeys?.[0]),
      bypassMethod: "none",
      models: {
        total: 0,
        discovered: [],
        accessible: [],
        restricted: [],
        failed: [],
      },
      capabilities: {
        streaming: [],
        function_calling: [],
        multimodal: [],
        live_api: [],
        code_execution: [],
      },
      performance: {
        totalTime: 0,
        avgResponseTime: 0,
        fastest: null,
        slowest: null,
        modelStats: [],
      },
      errors: [],
    };
  }

  maskApiKey(key) {
    if (!key || key.length < 10) return "***";
    return key.substring(0, 8) + "..." + key.substring(key.length - 4);
  }

  async initialize() {
    this.logger.section("ULTIMATE GEMINI API TESTER v4.0 (Browser)");

    // Log configuration details
    const apiKey = this.options.apiKey || this.options.apiKeys?.[0];
    const maskedKey = this.configValidator.maskKey(apiKey);
    this.logger.info(`API Key: ${maskedKey}`);
    this.logger.info(`Total Keys: ${this.apiKeyManager?.apiKeys?.length || 1}`);
    this.logger.info(`Bypass Mode: ${this.options.bypassMode || "auto"}`);
    this.logger.info(`DNS Region: ${this.options.region || "us"}`);
    this.logger.info(
      `Smart DNS: ${this.options.smartDNS !== false ? "enabled" : "disabled"}`,
    );

    // Setup bypass
    const bypassResult = await this.bypassManager.setup();
    if (bypassResult.success) {
      this.results.bypassMethod = bypassResult.method;
      this.logger.success(`Bypass active: ${bypassResult.method}`);

      const activeDNS = this.bypassManager.getDNSManager().getActiveDNS();
      if (activeDNS) {
        this.logger.success(
          `Active DNS: ${activeDNS.name} (${activeDNS.primary})`,
        );
      }
    }

    // Initialize HTTP client
    this.client = new SmartHTTPClient(
      apiKey,
      this.logger,
      this.bypassManager,
      this.apiKeyManager,
      this.requestQueue,
    );

    // Validate API key with enhanced error handling
    try {
      await this.validateApiKey();
      this.logger.info(
        "✅ Initialization complete - API key validated and ready",
      );
    } catch (error) {
      // Enhanced error logging
      const errorInfo = this.configValidator.getContextualErrorMessage(
        error,
        apiKey,
      );
      this.logger.error(`❌ Initialization failed: ${errorInfo.title}`);
      this.logger.error(`   ${errorInfo.message}`);

      // Only throw if it's a configuration issue
      if (errorInfo.isConfigIssue) {
        throw new Error(errorInfo.message);
      } else {
        // For network issues, log but continue
        this.logger.warning(
          "⚠️ Network issue detected, but continuing initialization...",
        );
      }
    }
  }

  async validateApiKey() {
    // First check format without network request
    const apiKey = this.options.apiKey || this.options.apiKeys?.[0];

    if (!this.configValidator) {
      this.configValidator = new APIConfigValidator(this.logger);
    }

    // Format validation
    const formatCheck = this.configValidator.validateKeyFormat(apiKey);
    if (!formatCheck.valid) {
      const errorMsg = `${formatCheck.message}. ${formatCheck.suggestion}`;
      this.logger.error(`API key format validation failed: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Check cache
    const cached = this.configValidator.isKeyCached(apiKey);
    if (cached?.valid === true) {
      this.logger.info("API key validation (cached): valid");
      return true;
    }

    this.logger.info("Validating API key with API...");

    try {
      const response = await this.client.request("models", {
        timeout: 10000,
        useQueue: false, // Don't queue validation requests
      });

      if (response.success) {
        // Cache successful validation
        this.configValidator.cacheValidation(apiKey, {
          valid: true,
          timestamp: Date.now(),
        });
        this.logger.success("API key is valid and authenticated");
        return true;
      } else {
        // Get contextual error message
        const errorInfo = this.configValidator.getContextualErrorMessage({
          message: response.error,
          status: response.status,
          category: response.category,
        });

        this.logger.error(`API key validation failed: ${errorInfo.title}`);
        this.logger.error(`Details: ${errorInfo.message}`);

        if (errorInfo.suggestions.length > 0) {
          this.logger.info("Suggestions:");
          errorInfo.suggestions.forEach((suggestion, idx) => {
            this.logger.info(`  ${idx + 1}. ${suggestion}`);
          });
        }

        // Cache failed validation (shorter TTL for failures)
        this.configValidator.cacheValidation(apiKey, {
          valid: false,
          error: errorInfo,
          timestamp: Date.now(),
        });

        throw new Error(errorInfo.message);
      }
    } catch (error) {
      // Enhanced error handling
      const errorInfo = this.configValidator.getContextualErrorMessage(
        error,
        apiKey,
      );

      this.logger.error(`API key validation failed: ${errorInfo.title}`);
      this.logger.error(`Details: ${errorInfo.message}`);

      if (errorInfo.suggestions.length > 0) {
        this.logger.info("Suggestions:");
        errorInfo.suggestions.forEach((suggestion, idx) => {
          this.logger.info(`  ${idx + 1}. ${suggestion}`);
        });
      }

      // Only throw config-related errors, not network issues
      if (errorInfo.isConfigIssue) {
        throw new Error(errorInfo.message);
      } else {
        // For network issues, log but don't fail initialization
        this.logger.warning(
          "Network issue detected during validation, but continuing...",
        );
        return false;
      }
    }
  }

  async discoverModels() {
    this.logger.section("MODEL DISCOVERY");
    this.logger.info("Fetching available models from API...");

    try {
      const response = await this.client.request("models", { timeout: 15000 });

      if (!response.success || !response.data?.models) {
        throw new Error("Failed to fetch models");
      }

      const models = response.data.models
        .filter((m) =>
          m.supportedGenerationMethods?.includes("generateContent"),
        )
        .map((m) => {
          const modelName = m.name.replace("models/", "");
          return {
            name: modelName,
            displayName: m.displayName || m.name,
            description: m.description || "No description",
            supportedMethods: m.supportedGenerationMethods || [],
            version: m.version || "unknown",
            inputTokenLimit: m.inputTokenLimit || 0,
            outputTokenLimit: m.outputTokenLimit || 0,
            ...enrichModelInfo(modelName),
          };
        });

      this.results.models.discovered = models;
      this.results.models.total = models.length;

      this.logger.success(`Discovered ${models.length} models from API`);

      return models;
    } catch (error) {
      this.logger.error("Model discovery failed: " + error.message);
      throw error;
    }
  }

  async testAllModels(models) {
    this.logger.section("MODEL TESTING");

    const usableModels = [];
    const rejectedModels = [];
    let rateLimitedCount = 0;

    for (let i = 0; i < models.length; i++) {
      const model = models[i];
      this.logger.test(`[${i + 1}/${models.length}] Testing: ${model.name}`);

      const result = await this.testModel(model);

      if (result.accessible) {
        usableModels.push(model.name);
        this.results.models.accessible.push(result);

        if (result.streaming)
          this.results.capabilities.streaming.push(model.name);
        if (result.functionCalling)
          this.results.capabilities.function_calling.push(model.name);
        if (result.multimodal)
          this.results.capabilities.multimodal.push(model.name);
        if (result.liveApi) this.results.capabilities.live_api.push(model.name);
        if (result.codeExecution)
          this.results.capabilities.code_execution.push(model.name);

        if (result.responseTime) {
          this.results.performance.modelStats.push({
            name: model.name,
            responseTime: result.responseTime,
          });
        }
      } else if (result.error?.includes("403")) {
        this.results.models.restricted.push(result);
        rejectedModels.push({
          modelId: model.name,
          reason: "permission_denied",
          isModelScoped: true,
        });
      } else if (result.error?.includes("429")) {
        rateLimitedCount++;
        usableModels.push(model.name);
        this.results.models.accessible.push(result);
      } else {
        this.results.models.failed.push(result);
        rejectedModels.push({
          modelId: model.name,
          reason: this.parseErrorReason(result.error),
          isModelScoped: true,
        });
      }

      if (i < models.length - 1) {
        await this.sleep(CONFIG.GEMINI_API.delayBetweenRequests);
      }
    }

    this.calculatePerformance();

    return {
      usableModels,
      rejectedModels,
      providerStatus: rateLimitedCount > 0 ? "rate_limited" : "ok",
      testedAt: Date.now(),
    };
  }

  async testModel(model) {
    const result = {
      name: model.name,
      accessible: false,
      streaming: false,
      functionCalling: false,
      multimodal: false,
      liveApi: false,
      codeExecution: false,
      responseTime: null,
      error: null,
    };

    try {
      const accessTest = await this.testBasicAccess(model);
      result.accessible = accessTest.success;
      result.responseTime = accessTest.responseTime;

      if (!accessTest.success) {
        result.error = accessTest.error || "Unknown error";
        this.logger.error(`  ✗ ${model.name}: ${accessTest.error}`);
        return result;
      }

      this.logger.success(`  ✓ Accessible (${accessTest.responseTime}ms)`);

      if (model.capabilities.includes("streaming")) {
        result.streaming = true;
        this.logger.success("  ✓ Streaming supported");
      }
      if (model.capabilities.includes("function_calling")) {
        result.functionCalling = true;
        this.logger.success("  ✓ Function calling supported");
      }
      if (
        model.capabilities.includes("image") ||
        model.capabilities.includes("video")
      ) {
        result.multimodal = true;
        this.logger.success("  ✓ Multimodal supported");
      }
      if (model.capabilities.includes("live_api")) {
        result.liveApi = true;
        this.logger.success("  ✓ Live API supported");
      }
      if (model.capabilities.includes("code_execution")) {
        result.codeExecution = true;
        this.logger.success("  ✓ Code execution supported");
      }
    } catch (error) {
      result.error = error.message;
      this.logger.error(`  ✗ Error: ${error.message}`);
    }

    return result;
  }

  async testBasicAccess(model) {
    const startTime = Date.now();

    try {
      const response = await this.client.request(
        `models/${model.name}:generateContent`,
        {
          method: "POST",
          body: {
            contents: [
              {
                parts: [{ text: "Hi" }],
              },
            ],
            generationConfig: {
              maxOutputTokens: 10,
            },
          },
          timeout: 15000,
        },
      );

      return {
        success: response.success,
        responseTime: Date.now() - startTime,
        error: response.error,
      };
    } catch (error) {
      return {
        success: false,
        error: this.parseError(error),
        responseTime: Date.now() - startTime,
      };
    }
  }

  parseError(error) {
    const msg = error?.message || String(error);

    if (msg.includes("403")) return "Permission Denied (check billing/quotas)";
    if (msg.includes("404")) return "Model Not Found";
    if (msg.includes("429")) return "Rate Limit Exceeded";
    if (msg.includes("400")) return "Bad Request (possible restrictions)";
    if (msg.includes("timeout") || msg.includes("AbortError"))
      return "Request Timeout";

    return msg.substring(0, 100);
  }

  parseErrorReason(error) {
    if (!error) return "unknown";

    if (error.includes("403") || error.includes("Permission"))
      return "permission_denied";
    if (error.includes("404") || error.includes("Not Found"))
      return "not_found";
    if (error.includes("429") || error.includes("Rate Limit"))
      return "rate_limited";
    if (error.includes("quota") || error.includes("exhausted"))
      return "quota_exhausted";
    if (error.includes("timeout") || error.includes("Timeout"))
      return "timeout";
    if (error.includes("network") || error.includes("ECONN"))
      return "network_error";
    if (error.includes("incompatible") || error.includes("unsupported"))
      return "incompatible";

    return "unknown";
  }

  calculatePerformance() {
    const stats = this.results.performance.modelStats;

    if (stats.length === 0) return;

    const times = stats.map((s) => s.responseTime);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const fastest = stats.reduce((min, s) =>
      s.responseTime < min.responseTime ? s : min,
    );
    const slowest = stats.reduce((max, s) =>
      s.responseTime > max.responseTime ? s : max,
    );

    this.results.performance.avgResponseTime = Math.round(avg);
    this.results.performance.fastest = fastest;
    this.results.performance.slowest = slowest;
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getResults() {
    return this.results;
  }

  getClient() {
    return this.client;
  }

  getAPIKeyManager() {
    return this.apiKeyManager;
  }

  getRequestQueue() {
    return this.requestQueue;
  }

  getBypassManager() {
    return this.bypassManager;
  }

  getConfigValidator() {
    return this.configValidator;
  }

  getStreamManager() {
    return this.streamManager;
  }

  /**
   * Stream chat completion - THE ONLY METHOD ALLOWED TO STREAM FROM GEMINI API
   * This enforces:
   * - Single active stream per API key
   * - 429 cooldowns (minimum 10s)
   * - Clean error normalization
   * - Model integrity (no silent fallbacks)
   */
  async *streamChat(
    modelId,
    contents,
    generationConfig = {},
    requestId = null,
  ) {
    const apiKey = this.options.apiKey || this.options.apiKeys?.[0];

    if (!apiKey) {
      throw new Error("API key is required");
    }

    // Validate model is explicitly provided (no silent fallback)
    if (!modelId) {
      throw new Error("Model ID is required. Silent fallback is not allowed.");
    }

    // Build endpoint
    const endpoint = `models/${modelId}:streamGenerateContent?alt=sse`;

    // Build request body
    const body = {
      contents: contents,
      generationConfig: generationConfig,
    };

    // Stream using SmartHTTPClient (which enforces single stream via StreamManager)
    try {
      for await (const chunk of this.client.streamRequest(
        endpoint,
        {
          method: "POST",
          body: body,
          model: modelId,
          timeout: 30000,
        },
        this.streamManager,
        requestId || `stream-${Date.now()}`,
      )) {
        // Normalize chunk data for UI consumption
        if (chunk.type === "chunk" && chunk.data) {
          const candidates = chunk.data.candidates || [];
          for (const candidate of candidates) {
            const content = candidate.content;
            if (content && content.parts) {
              for (const part of content.parts) {
                if (part.text) {
                  yield {
                    text: part.text,
                    toolCalls: part.functionCalls
                      ? part.functionCalls.map((fc: any) => ({
                          name: fc.name,
                          args: fc.args || {},
                        }))
                      : undefined,
                    usage: chunk.data.usageMetadata,
                  };
                }
              }
            }
          }
        } else if (chunk.type === "data") {
          // Non-streaming response
          const candidates = chunk.data.candidates || [];
          for (const candidate of candidates) {
            const content = candidate.content;
            if (content && content.parts) {
              let fullText = "";
              const toolCalls = [];

              for (const part of content.parts) {
                if (part.text) {
                  fullText += part.text;
                }
                if (part.functionCalls) {
                  toolCalls.push(
                    ...part.functionCalls.map((fc: any) => ({
                      name: fc.name,
                      args: fc.args || {},
                    })),
                  );
                }
              }

              if (fullText) {
                yield {
                  text: fullText,
                  toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
                  usage: chunk.data.usageMetadata,
                };
              }
            }
          }
        }
      }
    } catch (error) {
      // Normalize errors for UI
      const errorCategory = ErrorCategorizer.categorize(error);

      // If it's a rate limit, the stream manager already handled cooldown
      if (errorCategory.category === "rate_limit") {
        throw new Error("Rate limit exceeded. Please wait before retrying.");
      }

      // Re-throw with normalized message
      throw new Error(errorCategory.message || error.message);
    }
  }

  /**
   * Get current API configuration status
   */
  getConfigStatus() {
    const apiKey = this.options.apiKey || this.options.apiKeys?.[0];
    const keyManager = this.apiKeyManager;
    const queue = this.requestQueue;
    const streamMgr = this.streamManager;

    return {
      apiKey: this.configValidator.maskKey(apiKey),
      totalKeys: keyManager?.apiKeys?.length || 1,
      activeKeys:
        keyManager?.apiKeys?.filter((k) => k.status === "active").length || 1,
      queueStats: queue?.getStats() || null,
      bypassMethod: this.results.bypassMethod,
      dnsActive:
        this.bypassManager?.getDNSManager()?.getActiveDNS()?.name ||
        "System Default",
      activeStream: streamMgr
        ? (() => {
            const active = streamMgr.getActiveStream(apiKey);
            return active
              ? {
                  requestId: active.requestId,
                  model: active.model,
                  duration: Date.now() - active.startTime,
                }
              : null;
          })()
        : null,
      inCooldown: streamMgr ? streamMgr.isInCooldown(apiKey) : false,
      cooldownRemaining: streamMgr ? streamMgr.getRemainingCooldown(apiKey) : 0,
    };
  }
}

// ============================================================================
// REACT UI COMPONENT
// ============================================================================

interface GeminiTesterProProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function GeminiTesterPro({
  isOpen = true,
  onClose,
}: GeminiTesterProProps) {
  const [apiKeys, setApiKeys] = useState([""]);
  const [testing, setTesting] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [results, setResults] = useState(null);
  const [logs, setLogs] = useState([]);
  const [config, setConfig] = useState({
    bypassMode: "auto",
    region: "us",
    smartDNS: true,
    verbose: false,
    quickTest: false,
    saveResults: true,
    autoRetry: true,
    autoRotation: false, // Auto-rotation toggle
    enableScheduling: false, // Scheduling toggle
    scheduleTime: "00:00", // Default schedule time
    autoResetKeys: true, // Auto-reset rate-limited keys
  });
  const [scheduler] = useState(
    () =>
      new Scheduler({
        info: (msg) => addLog("info", msg),
        success: (msg) => addLog("success", msg),
        warning: (msg) => addLog("warning", msg),
        error: (msg) => addLog("error", msg),
        debug: (msg) => addLog("info", msg),
      }),
  );
  const [activeTab, setActiveTab] = useState("setup");
  const [liveTestResults, setLiveTestResults] = useState<any[]>([]);
  const [testingLive, setTestingLive] = useState(false);
  const logsEndRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState<boolean[]>([]);

  // Progress and cancellation state
  const [progress, setProgress] = useState({
    current: 0,
    total: 0,
    percentage: 0,
  });
  const [successRate, setSuccessRate] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [expandedLogs, setExpandedLogs] = useState<Set<number>>(new Set());

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    // Use requestAnimationFrame to prevent infinite loops and optimize scrolling
    if (logs.length > 0 && logsEndRef.current) {
      const timeoutId = setTimeout(() => {
        logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [logs.length]); // Only depend on logs.length, not the entire logs array

  // Memoize addLog to prevent unnecessary re-renders and infinite loops
  const addLog = useCallback(
    (type: string, message: string, data: any = null) => {
      const log = {
        id: Date.now() + Math.random(),
        type,
        message,
        data,
        timestamp: new Date().toLocaleTimeString(),
      };

      setLogs((prev) => [...prev, log]);
    },
    [],
  ); // Empty deps - function doesn't depend on any state

  /**
   * Run Full Test - Complete model testing with discovery, validation, and analytics
   *
   * This function:
   * 1. Validates API key(s) input
   * 2. Initializes UltimateGeminiTesterService with configuration
   * 3. Discovers all available models from API
   * 4. Tests each model for accessibility, capabilities, and performance
   * 5. Collects results and saves if configured
   * 6. Handles auto-rotation if enabled and rate limits are hit
   *
   * @returns {Promise<void>}
   */
  const runFullTest = async () => {
    // Enhanced validation using APIConfigValidator
    const configValidator = new APIConfigValidator({
      info: (msg) => addLog("info", msg),
      success: (msg) => addLog("success", msg),
      warning: (msg) => addLog("warning", msg),
      error: (msg) => addLog("error", msg),
    });

    const configCheck = configValidator.validateConfiguration(apiKeys);

    if (!configCheck.valid) {
      addLog("error", `❌ Configuration Error: ${configCheck.message}`);

      // Show specific errors for each invalid key
      if (Array.isArray(configCheck.errors)) {
        configCheck.errors.forEach((err) => {
          if (typeof err === "string") {
            addLog("error", `   • ${err}`);
          } else {
            addLog("error", `   • Key ${err.keyIndex}: ${err.message}`);
            if (err.suggestion) {
              addLog("info", `     💡 ${err.suggestion}`);
            }
          }
        });
      }

      // If no valid keys, stop here
      if (configCheck.validKeys.length === 0) {
        addLog("error", "❌ Cannot proceed without at least one valid API key");
        return;
      }

      // If some keys are invalid but we have valid ones, continue with warning
      if (configCheck.validKeys.length > 0) {
        addLog(
          "warning",
          `⚠️ Continuing with ${configCheck.validKeys.length} valid API key(s)...`,
        );
      }
    } else {
      addLog(
        "success",
        `✅ Configuration validated: ${configCheck.validKeys.length} API key(s) ready`,
      );
    }

    // Use validated keys
    const validApiKeys = configCheck.validKeys.map((vk) => vk.key);
    if (validApiKeys.length === 0) {
      addLog(
        "error",
        "❌ No valid API keys available. Please check your configuration.",
      );
      return;
    }

    // Initialize test state
    setTesting(true);
    setIsCancelling(false);
    setResults(null);
    setLogs([]);
    // Initialize progress to show it's ready (will be updated when models are discovered)
    setProgress({ current: 0, total: 1, percentage: 0 });
    setSuccessRate(0);
    setActiveTab("logs");

    // Create AbortController for cancellation
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    addLog(
      "info",
      `🚀 Starting full model test with ${validApiKeys.length} API key(s)...`,
    );

    let currentKeyIndex = 0;
    let testResults: any = null;
    let finalResults: any = null;
    let testedModels = 0;
    let successfulModels = 0;

    try {
      // Main testing loop with auto-rotation support
      while (currentKeyIndex < validApiKeys.length) {
        const currentApiKey = validApiKeys[currentKeyIndex];
        addLog(
          "info",
          `🔑 Using API key ${currentKeyIndex + 1}/${validApiKeys.length}${config.autoRotation ? " (Auto-rotation enabled)" : ""}`,
        );

        try {
          // Initialize tester service with current configuration
          const tester = new UltimateGeminiTesterService({
            apiKey: currentApiKey,
            apiKeys: validApiKeys, // Pass all keys for rotation support
            bypassMode: config.bypassMode,
            region: config.region,
            smartDNS: config.smartDNS,
            verbose: config.verbose,
            addLogCallback: addLog,
          });

          // Step 1: Initialize and validate API key
          addLog("info", "⚙️ Initializing tester service...");
          addLog(
            "info",
            `   • API Key: ${currentApiKey.substring(0, 8)}...${currentApiKey.substring(currentApiKey.length - 4)}`,
          );
          addLog("info", `   • Bypass Mode: ${config.bypassMode}`);
          addLog("info", `   • DNS Region: ${config.region}`);
          addLog(
            "info",
            `   • Smart DNS: ${config.smartDNS ? "enabled" : "disabled"}`,
          );
          addLog(
            "info",
            `   • Auto-Rotation: ${config.autoRotation ? "enabled" : "disabled"}`,
          );

          await tester.initialize();
          addLog("success", "✅ Service initialized successfully");

          // Log API key manager status if available
          const keyManager = tester.getAPIKeyManager();
          if (keyManager) {
            const keyMetrics = keyManager.getPerformanceMetrics();
            if (keyMetrics && keyMetrics.length > 0) {
              addLog("info", `   • Active API Keys: ${keyMetrics.length}`);
              keyMetrics.forEach((key, idx) => {
                if (key.status === "active") {
                  addLog(
                    "info",
                    `     - Key ${idx + 1}: ${key.status} (${key.performance.successRate.toFixed(1)}% success rate)`,
                  );
                }
              });
            }
          }

          // Step 2: Discover available models
          addLog("info", "🔍 Discovering models from API...");

          // Check for cancellation before discovery
          if (signal.aborted) {
            throw new Error("Test cancelled by user");
          }

          let models: any[] = [];
          try {
            models = await tester.discoverModels();
          } catch (discoverError: any) {
            if (
              signal.aborted ||
              discoverError?.message?.includes("cancelled") ||
              discoverError?.message?.includes("abort")
            ) {
              addLog("warning", "⚠️ Model discovery was cancelled");
              throw new Error("Test cancelled by user");
            }
            addLog(
              "error",
              `❌ Failed to discover models: ${discoverError?.message || "Unknown error"}`,
            );
            throw discoverError;
          }

          // Check for cancellation after discovery
          if (signal.aborted) {
            throw new Error("Test cancelled by user");
          }

          if (!models || models.length === 0) {
            addLog(
              "warning",
              "⚠️ No models discovered. Check API key and network connection.",
            );
            throw new Error("No models discovered");
          }

          addLog("success", `✅ Discovered ${models.length} models`);

          // Initialize progress BEFORE starting tests
          setProgress({ current: 0, total: models.length, percentage: 0 });
          setSuccessRate(0);

          // Step 3: Test all models with progress tracking
          addLog(
            "info",
            `🧪 Testing ${models.length} models for accessibility and capabilities...`,
          );

          // Check for cancellation before starting tests
          if (signal.aborted) {
            throw new Error("Test cancelled by user");
          }

          // Track progress during testing - called for EACH model test
          const progressCallback = (current: number, total: number) => {
            // Check for cancellation FIRST
            if (signal.aborted) {
              addLog("warning", "⚠️ Scan was cancelled during progress update");
              throw new Error("Test cancelled by user");
            }

            const percentage = Math.round((current / total) * 100);
            setProgress({ current, total, percentage });

            // Estimate success rate (will be updated after completion)
            if (current > 0) {
              const estimatedRate = Math.round((current / total) * 80); // Conservative estimate
              setSuccessRate(estimatedRate);
            }

            // Periodic status updates every 10 models to prevent silent abandonment
            if (current % 10 === 0 || current === total) {
              addLog(
                "info",
                `📊 Progress: ${current}/${total} models tested (${percentage}%)`,
              );
            }
          };

          // Start testing with progress callback and error handling
          try {
            testResults = await tester.testAllModels(models, progressCallback);
          } catch (testError: any) {
            // Check if it was aborted
            if (
              signal.aborted ||
              testError?.message?.includes("cancelled") ||
              testError?.message?.includes("abort")
            ) {
              addLog(
                "warning",
                "⚠️ Scan was cancelled or aborted during model testing",
              );
              throw new Error("Test cancelled by user");
            }
            // Re-throw other errors with context
            addLog(
              "error",
              `❌ Error during model testing: ${testError?.message || "Unknown error"}`,
            );
            throw testError;
          }

          // Check for cancellation after tests
          if (signal.aborted) {
            addLog(
              "warning",
              "⚠️ Scan was cancelled after model testing completed",
            );
            throw new Error("Test cancelled by user");
          }

          // Calculate actual success rate
          testedModels = models.length;
          successfulModels = testResults.usableModels?.length || 0;
          const rate =
            testedModels > 0
              ? Math.round((successfulModels / testedModels) * 100)
              : 0;
          setSuccessRate(rate);
          setProgress({
            current: testedModels,
            total: testedModels,
            percentage: 100,
          });

          // Step 4: Get final results - CRITICAL: Use the SAME results object
          finalResults = tester.getResults();

          // Verify consistency: Log what we're actually storing
          const accessibleCount = finalResults.models?.accessible?.length || 0;
          const restrictedCount = finalResults.models?.restricted?.length || 0;
          const failedCount = finalResults.models?.failed?.length || 0;

          addLog("info", `📊 Final Results Summary:`);
          addLog("info", `   • Accessible: ${accessibleCount} models`);
          addLog("info", `   • Restricted: ${restrictedCount} models`);
          addLog("info", `   • Failed: ${failedCount} models`);
          addLog("info", `   • Total Tested: ${testedModels} models`);

          // Verify consistency between testResults and finalResults
          if (testResults.usableModels.length !== accessibleCount) {
            addLog(
              "warning",
              `⚠️ Inconsistency detected: usableModels (${testResults.usableModels.length}) != accessible (${accessibleCount})`,
            );
            addLog(
              "warning",
              `   This may be due to 429 rate-limited models being counted differently`,
            );
          }

          // Ensure results are set before tab switch
          if (finalResults && finalResults.models) {
            setResults(finalResults);
            addLog(
              "success",
              `✅ Testing complete! ${accessibleCount}/${testedModels} models accessible (${rate}% success rate)`,
            );
          } else {
            addLog(
              "warning",
              "⚠️ No results to display. Test may have completed with no data.",
            );
            setResults(null);
          }

          // Step 5: Final verification - Quick test on accessible models
          // CRITICAL: Use the SAME tester service with bypass/DNS to ensure consistency
          if (testResults.usableModels && testResults.usableModels.length > 0) {
            addLog(
              "info",
              `🔍 Performing final verification on ${testResults.usableModels.length} accessible models using same bypass/DNS settings...`,
            );
            const verificationResults: {
              model: string;
              verified: boolean;
              error?: string;
              responseTime?: number;
            }[] = [];

            // Use the SAME tester instance and client that was used for initial testing
            // This ensures bypass/DNS settings are consistent
            const client = tester.getClient();
            const bypassMethod = tester.getResults().bypassMethod;
            addLog(
              "info",
              `🔓 Using same bypass method for verification: ${bypassMethod}`,
            );

            for (const model of testResults.usableModels.slice(
              0,
              Math.min(10, testResults.usableModels.length),
            )) {
              try {
                const startTime = Date.now();

                // Use the tester's client which has bypass/DNS logic
                const result = await client.request(
                  `models/${model}:generateContent?key=${currentApiKey}`,
                  {
                    method: "POST",
                    body: {
                      contents: [
                        {
                          parts: [{ text: "test" }],
                        },
                      ],
                    },
                    timeout: 15000, // Same timeout as initial test
                    maxRetries: 2, // Allow retries
                  },
                );

                const responseTime = Date.now() - startTime;
                const verified = result.success && result.data;

                verificationResults.push({
                  model,
                  verified,
                  responseTime,
                  error: verified
                    ? undefined
                    : result.error || `HTTP ${result.status || "Unknown"}`,
                });

                if (verified) {
                  addLog("success", `✅ ${model} verified (${responseTime}ms)`);
                } else {
                  addLog(
                    "warning",
                    `⚠️ ${model} verification failed: ${result.error || "Unknown error"}`,
                  );
                }
              } catch (error: any) {
                verificationResults.push({
                  model,
                  verified: false,
                  error: error?.message || "Unknown error",
                });
                addLog(
                  "warning",
                  `⚠️ ${model} verification error: ${error?.message || "Unknown"}`,
                );
              }

              // Use same delay as initial test (1 second) to avoid rate limits
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }

            const verifiedCount = verificationResults.filter(
              (r) => r.verified,
            ).length;
            const totalVerified = verificationResults.length;
            addLog(
              "info",
              `📊 Verification complete: ${verifiedCount}/${totalVerified} models verified successfully`,
            );

            if (verifiedCount < totalVerified) {
              const failedModels = verificationResults
                .filter((r) => !r.verified)
                .map((r) => r.model);
              addLog(
                "warning",
                `⚠️ ${failedModels.length} model(s) failed verification: ${failedModels.join(", ")}`,
              );
              addLog(
                "info",
                "💡 These models may have been rate-limited during verification or require different bypass settings",
              );

              // Remove failed models from accessible list to keep results consistent
              if (
                finalResults &&
                finalResults.models &&
                finalResults.models.accessible
              ) {
                finalResults.models.accessible =
                  finalResults.models.accessible.filter(
                    (m: any) => !failedModels.includes(m.name),
                  );
                setResults({ ...finalResults });
                addLog(
                  "info",
                  `📊 Updated accessible models: removed ${failedModels.length} failed model(s) from verification`,
                );
              }
            } else {
              addLog(
                "success",
                `✅ All ${verifiedCount} models verified successfully with ${bypassMethod} bypass`,
              );
            }
          }

          // Step 5: Save results if configured
          if (config.saveResults) {
            try {
              const resultsData = {
                ...testResults,
                fullResults: finalResults,
                testedAt: new Date().toISOString(),
                apiKeyUsed: currentApiKey.substring(0, 8) + "...",
                config: {
                  bypassMode: config.bypassMode,
                  region: config.region,
                  smartDNS: config.smartDNS,
                  autoRotation: config.autoRotation,
                },
              };

              // Try Electron storage first, fallback to localStorage
              if ((window as any).storage?.set) {
                await (window as any).storage.set(
                  "gemini-test-results",
                  JSON.stringify(resultsData),
                );
                addLog("info", "💾 Results saved to Electron storage");
              } else {
                localStorage.setItem(
                  "gemini-test-results",
                  JSON.stringify(resultsData),
                );
                addLog("info", "💾 Results saved to localStorage");
              }
            } catch (e: any) {
              addLog(
                "warning",
                `⚠️ Could not save results: ${e?.message || "Unknown error"}`,
              );
            }
          }

          // Success - break out of rotation loop
          break;
        } catch (error: any) {
          // Enhanced error handling with contextual messages
          const errorInfo = configValidator.getContextualErrorMessage(
            error,
            currentApiKey,
          );

          addLog(
            "error",
            `❌ Error with API key ${currentKeyIndex + 1}: ${errorInfo.title}`,
          );
          addLog("error", `   ${errorInfo.message}`);

          if (errorInfo.details && errorInfo.details !== errorInfo.message) {
            addLog(
              "info",
              `   Details: ${errorInfo.details.substring(0, 150)}`,
            );
          }

          // Show suggestions
          if (errorInfo.suggestions && errorInfo.suggestions.length > 0) {
            addLog("info", "   💡 Suggestions:");
            errorInfo.suggestions.slice(0, 3).forEach((suggestion, idx) => {
              addLog("info", `      ${idx + 1}. ${suggestion}`);
            });
          }

          const isRateLimit =
            errorInfo.title.includes("Rate Limit") ||
            error?.message?.includes("429") ||
            error?.message?.includes("rate limit");

          // Auto-rotation: Try next key if rate limited and auto-rotation is enabled
          if (
            config.autoRotation &&
            isRateLimit &&
            currentKeyIndex < validApiKeys.length - 1
          ) {
            currentKeyIndex++;
            addLog(
              "warning",
              `🔄 Rate limit detected. Rotating to API key ${currentKeyIndex + 1}...`,
            );
            await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1s before retry
            continue;
          }

          // Network errors: Try next key if available
          if (
            errorInfo.title.includes("Network") &&
            currentKeyIndex < validApiKeys.length - 1
          ) {
            currentKeyIndex++;
            addLog(
              "warning",
              `🔄 Network issue detected. Trying API key ${currentKeyIndex + 1}...`,
            );
            await new Promise((resolve) => setTimeout(resolve, 1000));
            continue;
          }

          // If last key or auto-rotation disabled, throw error with context
          if (
            currentKeyIndex === validApiKeys.length - 1 ||
            !config.autoRotation
          ) {
            // Only throw if it's a configuration issue, otherwise log and continue
            if (errorInfo.isConfigIssue) {
              throw new Error(errorInfo.message);
            } else {
              addLog(
                "warning",
                "⚠️ Non-critical error, but continuing with available data...",
              );
              break; // Exit loop but don't throw
            }
          }
        }
      }

      addLog("success", "🎉 Full test completed successfully!");
      // Only switch to results tab if we have results to display
      // Use finalResults (local variable) instead of results (state) since state update is async
      if (
        finalResults &&
        finalResults.models &&
        (finalResults.models.accessible?.length > 0 ||
          finalResults.models.restricted?.length > 0 ||
          finalResults.models.failed?.length > 0)
      ) {
        setActiveTab("results");
      } else {
        addLog(
          "info",
          "💡 No results to display. Check the Console tab for details.",
        );
        setActiveTab("logs");
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Unknown error";

      // Check if scan was abandoned/cancelled
      if (
        signal?.aborted ||
        errorMessage.includes("cancelled") ||
        errorMessage.includes("abort") ||
        isCancelling
      ) {
        addLog("warning", "⚠️ Scan was cancelled or abandoned");
        if (testedModels > 0) {
          const partialRate = Math.round(
            (successfulModels / testedModels) * 100,
          );
          addLog(
            "info",
            `📊 Partial results: ${successfulModels}/${testedModels} models tested (${partialRate}% success)`,
          );

          // Try to save partial results if available
          if (finalResults && finalResults.models) {
            setResults(finalResults);
            addLog("info", "💾 Partial results saved. Check Results tab.");
          }
        } else {
          addLog(
            "warning",
            "⚠️ Scan was abandoned before any models were tested",
          );
          addLog("info", "💡 This may happen if:");
          addLog("info", "   • Network connection was interrupted");
          addLog("info", "   • API rate limits were exceeded");
          addLog("info", "   • The scan was manually cancelled");
        }
      } else {
        // Enhanced error reporting for other errors
        const errorInfo = configValidator.getContextualErrorMessage(error);

        addLog("error", `💥 Scan failed: ${errorInfo.title}`);
        addLog("error", `   ${errorInfo.message}`);

        // Check if we have partial results to save
        if (testedModels > 0 && finalResults && finalResults.models) {
          addLog("warning", "⚠️ Scan failed but partial results are available");
          setResults(finalResults);
          addLog("info", "💾 Partial results saved. Check Results tab.");
        }

        if (errorInfo.suggestions && errorInfo.suggestions.length > 0) {
          addLog("info", "   💡 Suggestions:");
          errorInfo.suggestions.forEach((suggestion, idx) => {
            addLog("info", `      ${idx + 1}. ${suggestion}`);
          });
        }

        // Only show generic tip if it's not a config issue
        if (!errorInfo.isConfigIssue) {
          addLog(
            "info",
            "💡 Tip: This may be a temporary issue. Check your network connection and try again.",
          );
        }
      }
    } finally {
      // Always reset testing state
      setTesting(false);
      setIsCancelling(false);

      // Clear abort controller
      if (abortControllerRef.current) {
        abortControllerRef.current = null;
      }

      // Final status update
      if (testedModels > 0) {
        addLog(
          "info",
          `📊 Final status: ${testedModels} models processed, ${successfulModels} successful`,
        );
      } else {
        addLog("warning", "⚠️ Scan completed with no models tested");
      }
    }
  };

  /**
   * Stop Test - Cancel ongoing test operation
   *
   * This function:
   * 1. Aborts the current test operation
   * 2. Cleans up resources
   * 3. Preserves partial results if available
   *
   * @returns {void}
   */
  const stopTest = () => {
    if (!testing && !discovering) {
      addLog("warning", "⚠️ No active test to stop");
      return;
    }

    setIsCancelling(true);
    addLog("warning", "🛑 Stopping test...");

    // Abort current operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Reset states
    setTesting(false);
    setDiscovering(false);
    setIsCancelling(false);

    addLog("info", "✅ Test stopped successfully");
  };

  /**
   * Discover Only - Fast model discovery without full testing
   *
   * This function:
   * 1. Validates API key input
   * 2. Initializes tester service
   * 3. Discovers all available models from Gemini API
   * 4. Displays discovered models count and details
   *
   * Use this for quick discovery when you only need to see available models
   * without running full capability tests.
   *
   * @returns {Promise<void>}
   */
  const discoverOnly = async () => {
    // Validation: Check if at least one API key is provided
    if (!apiKeys[0] || !apiKeys[0].trim()) {
      addLog(
        "error",
        "❌ Please enter at least one API key to discover models",
      );
      return;
    }

    // Filter out empty API keys
    const validApiKeys = apiKeys.filter((key) => key && key.trim());
    if (validApiKeys.length === 0) {
      addLog("error", "❌ No valid API keys found");
      return;
    }

    // Initialize discovery state
    setDiscovering(true);
    setLogs([]);
    setActiveTab("logs");
    addLog(
      "info",
      `🔍 Starting model discovery with API key ${validApiKeys[0].substring(0, 8)}...`,
    );

    try {
      // Initialize tester service
      const tester = new UltimateGeminiTesterService({
        apiKey: validApiKeys[0],
        apiKeys: validApiKeys,
        bypassMode: config.bypassMode,
        region: config.region,
        smartDNS: config.smartDNS,
        verbose: config.verbose,
        addLogCallback: addLog,
      });

      // Step 1: Initialize service
      addLog("info", "⚙️ Initializing service...");
      await tester.initialize();
      addLog("success", "✅ Service initialized");

      // Step 2: Discover models
      addLog("info", "🔍 Fetching models from Gemini API...");
      const models = await tester.discoverModels();

      // Step 3: Display results
      addLog("success", `✅ Discovery complete! Found ${models.length} models`);

      // Log model families if verbose
      if (config.verbose && models.length > 0) {
        const families = new Set(models.map((m: any) => m.family || "unknown"));
        addLog("info", `📊 Model families: ${Array.from(families).join(", ")}`);

        const tiers = new Set(models.map((m: any) => m.tier || "unknown"));
        addLog("info", `📊 Model tiers: ${Array.from(tiers).join(", ")}`);
      }

      // Show sample models (first 5)
      if (models.length > 0) {
        addLog(
          "info",
          `📋 Sample models: ${models
            .slice(0, 5)
            .map((m: any) => m.name)
            .join(", ")}${models.length > 5 ? "..." : ""}`,
        );
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Unknown error";
      addLog("error", `❌ Discovery failed: ${errorMessage}`);

      // Enhanced error context with specific suggestions
      const configValidator = new APIConfigValidator({
        info: (msg) => addLog("info", msg),
        success: (msg) => addLog("success", msg),
        warning: (msg) => addLog("warning", msg),
        error: (msg) => addLog("error", msg),
      });

      const errorInfo = configValidator.getContextualErrorMessage(error);

      addLog("error", `❌ Discovery failed: ${errorInfo.title}`);
      addLog("error", `   ${errorInfo.message}`);

      if (errorInfo.suggestions && errorInfo.suggestions.length > 0) {
        addLog("info", "   💡 Suggestions:");
        errorInfo.suggestions.slice(0, 3).forEach((suggestion, idx) => {
          addLog("info", `      ${idx + 1}. ${suggestion}`);
        });
      }
    } finally {
      setDiscovering(false);
    }
  };

  /**
   * Download Results - Export test results as JSON file
   *
   * This function:
   * 1. Validates that results exist
   * 2. Creates a JSON blob with formatted results
   * 3. Triggers browser download
   * 4. Includes metadata (timestamp, config, etc.)
   *
   * @returns {void}
   */
  const downloadResults = () => {
    if (!results) {
      addLog("warning", "⚠️ No results to download. Run a test first.");
      return;
    }

    try {
      // Prepare comprehensive export data
      const exportData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          version: "4.0",
          tester: "Ultimate Gemini API Tester",
        },
        config: {
          bypassMode: config.bypassMode,
          region: config.region,
          smartDNS: config.smartDNS,
          autoRotation: config.autoRotation,
          verbose: config.verbose,
        },
        results: results,
        summary: {
          totalModels: results.models?.total || 0,
          accessible: results.models?.accessible?.length || 0,
          restricted: results.models?.restricted?.length || 0,
          failed: results.models?.failed?.length || 0,
          avgResponseTime: results.performance?.avgResponseTime || 0,
        },
      };

      // Create JSON blob
      const jsonString = JSON.stringify(exportData, null, 2);
      const blob = new Blob([jsonString], {
        type: "application/json;charset=utf-8",
      });

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gemini-test-results-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      addLog("success", "💾 Results downloaded successfully");
    } catch (error: any) {
      addLog(
        "error",
        `❌ Download failed: ${error?.message || "Unknown error"}`,
      );
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto"
      onClick={() => onClose?.()}
      style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      <div
        className="bg-slate-50/95 backdrop-blur-md border border-slate-200/70 shadow-xl rounded-2xl w-full max-w-5xl flex flex-col overflow-hidden h-[90vh] my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Enhanced Design */}
        <div className="flex items-center justify-between p-3 border-b border-slate-200/70 bg-gradient-to-r from-white to-purple-50/30 sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-600 via-purple-500 to-blue-600 flex items-center justify-center shadow-xl shadow-purple-600/30 ring-2 ring-purple-100">
                <FlaskConical
                  className="w-6 h-6 text-white"
                  strokeWidth={2.5}
                />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <div>
              <h2 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-blue-600 tracking-tight">
                Gemini Model Tester
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <div className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 rounded-full">
                  <Activity className="w-2.5 h-2.5 text-purple-600" />
                  <span className="text-[8px] font-bold text-purple-700 uppercase tracking-wider">
                    v4.0 Pro
                  </span>
                </div>
                <span className="text-[8px] font-semibold text-slate-500">
                  •
                </span>
                <span className="text-[8px] font-semibold text-slate-500">
                  Advanced Testing Suite
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => onClose?.()}
            className="p-2.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
          >
            <X strokeWidth={1.5} className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar & Success Rate - Enhanced */}
        {(testing || discovering) && (
          <div className="px-4 py-2 bg-gradient-to-r from-purple-50 via-blue-50 to-indigo-50 border-b border-purple-200/50">
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-3 flex-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${testing ? "bg-purple-500 animate-pulse" : "bg-blue-500 animate-pulse"}`}
                  ></div>
                  <span className="text-xs font-bold text-slate-700">
                    {testing ? "Testing Models" : "Discovering Models"}
                  </span>
                </div>
                {progress.total > 0 && (
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <span className="font-semibold">
                      {progress.current}/{progress.total}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="font-bold text-purple-600">
                      {progress.percentage}%
                    </span>
                  </div>
                )}
              </div>
              {successRate > 0 && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-lg border border-emerald-200">
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-bold text-emerald-700">
                    {successRate}% Success
                  </span>
                </div>
              )}
              <button
                onClick={stopTest}
                className="px-3 py-1.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-lg text-xs font-bold hover:from-red-600 hover:to-rose-700 transition-all shadow-lg shadow-red-500/30 flex items-center gap-1.5"
              >
                <Square className="w-3.5 h-3.5" />
                Stop
              </button>
            </div>
            {progress.total > 0 && (
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500 transition-all duration-300 ease-out rounded-full shadow-lg"
                  style={{ width: `${progress.percentage}%` }}
                ></div>
              </div>
            )}
          </div>
        )}

        {/* Tabs - Enhanced Design */}
        <div className="flex px-4 pt-1.5 pb-1.5 border-b border-slate-200/70 gap-2 bg-gradient-to-r from-white to-purple-50/20 backdrop-blur-md sticky top-[72px] z-10">
          {[
            { id: "setup", label: "Setup", icon: Settings },
            { id: "logs", label: "Console", icon: Terminal },
            { id: "results", label: "Results", icon: Database },
            { id: "live", label: "Live Test", icon: Play },
            { id: "performance", label: "Performance", icon: BarChart3 },
            { id: "keys", label: "API Keys", icon: Key },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-all duration-200 relative ${
                activeTab === tab.id
                  ? "text-purple-600 border-b-2 border-purple-600"
                  : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <tab.icon
                strokeWidth={2}
                className={`w-4 h-4 ${activeTab === tab.id ? "text-purple-600" : "text-slate-400"}`}
              />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Setup Tab */}
        {activeTab === "setup" && (
          <div className="p-4 bg-white overflow-y-auto flex-1 flex flex-col">
            <div className="space-y-4">
              <div className="relative bg-gradient-to-br from-purple-50/90 via-blue-50/70 to-white/50 rounded-2xl p-6 border-2 border-purple-300/80 shadow-2xl shadow-purple-200/50 backdrop-blur-md overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-purple-50/30 to-blue-50/40 rounded-2xl"></div>
                <div className="absolute top-0 left-0 w-40 h-40 bg-purple-300/30 rounded-full blur-3xl -ml-20 -mt-20 animate-pulse"></div>
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-blue-200/25 rounded-full blur-2xl -mr-16 -mb-16"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-purple-100/20 via-transparent to-transparent"></div>

                <label className="relative z-10 text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3 mb-5">
                  <div className="p-2.5 bg-gradient-to-br from-purple-500 via-purple-600 to-blue-500 rounded-xl shadow-xl shadow-purple-500/60 ring-2 ring-purple-300/60 ring-offset-2 ring-offset-purple-50/50">
                    <Key className="w-4.5 h-4.5 text-white" strokeWidth={3} />
                  </div>
                  <span className="text-[11px] letter-spacing-wider drop-shadow-sm">
                    API Keys
                  </span>
                  {apiKeys.length > 1 && (
                    <span className="ml-auto text-[9px] text-purple-800 font-black bg-gradient-to-r from-purple-100 via-purple-50 to-blue-100 px-3 py-1.5 rounded-full border-2 border-purple-300/70 shadow-md shadow-purple-200/40">
                      {apiKeys.length} Keys
                    </span>
                  )}
                </label>

                <div className="relative z-10 space-y-3">
                  {apiKeys.map((key, index) => {
                    const uniqueKey =
                      key && key.length > 10
                        ? `api-key-input-${key.substring(0, 8)}-${index}`
                        : `api-key-input-empty-${index}`;
                    const isVisible = showApiKeys[index] || false;
                    // Initialize showApiKeys array if needed
                    if (showApiKeys.length <= index) {
                      setShowApiKeys([
                        ...showApiKeys,
                        ...new Array(index + 1 - showApiKeys.length).fill(
                          false,
                        ),
                      ]);
                    }
                    return (
                      <div
                        key={uniqueKey}
                        className="flex gap-3 relative group"
                      >
                        <div className="flex-1 relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-100/30 to-blue-100/20 rounded-xl blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          <input
                            type={isVisible ? "text" : "password"}
                            value={key}
                            onChange={(e) => {
                              const newKeys = [...apiKeys];
                              newKeys[index] = e.target.value;
                              setApiKeys(newKeys);
                            }}
                            placeholder={`API Key ${index + 1} (AIza...)`}
                            className="relative w-full pl-12 pr-20 py-3.5 bg-white/98 backdrop-blur-lg border-2 border-slate-300/90 rounded-xl focus:outline-none focus:ring-4 focus:ring-purple-500/30 focus:border-purple-500 font-mono text-xs font-bold text-slate-900 shadow-lg shadow-slate-300/40 transition-all duration-300 hover:border-purple-400/80 hover:shadow-xl hover:shadow-purple-300/40 placeholder:text-slate-400/70"
                          />
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 p-1.5 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg">
                            <Key
                              className="w-4 h-4 text-purple-500/80 drop-shadow-sm"
                              strokeWidth={2.5}
                            />
                          </div>
                          <button
                            onClick={() => {
                              const newShowApiKeys = [...showApiKeys];
                              if (newShowApiKeys.length <= index) {
                                newShowApiKeys.push(
                                  ...new Array(
                                    index + 1 - newShowApiKeys.length,
                                  ).fill(false),
                                );
                              }
                              newShowApiKeys[index] = !newShowApiKeys[index];
                              setShowApiKeys(newShowApiKeys);
                            }}
                            className="absolute right-12 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200 shadow-sm bg-white/80 backdrop-blur-sm"
                            type="button"
                          >
                            {isVisible ? (
                              <EyeOff className="w-4 h-4" strokeWidth={2.5} />
                            ) : (
                              <Eye className="w-4 h-4" strokeWidth={2.5} />
                            )}
                          </button>
                          {apiKeys.length > 1 && (
                            <button
                              onClick={() => {
                                setApiKeys(
                                  apiKeys.filter((_, i) => i !== index),
                                );
                                setShowApiKeys(
                                  showApiKeys.filter((_, i) => i !== index),
                                );
                              }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100 shadow-sm"
                            >
                              <X className="w-4 h-4" strokeWidth={2.5} />
                            </button>
                          )}
                        </div>
                        {index === 0 && (
                          <div className="flex items-center px-3.5 py-2.5 bg-gradient-to-r from-emerald-100 via-emerald-50 to-teal-100 rounded-xl border-2 border-emerald-400/80 shadow-lg shadow-emerald-300/40 backdrop-blur-sm ring-1 ring-emerald-200/50">
                            <CheckCircle2
                              className="w-3.5 h-3.5 text-emerald-600 mr-1.5"
                              strokeWidth={2.5}
                            />
                            <span className="text-[9px] font-black text-emerald-800 uppercase tracking-wider drop-shadow-sm">
                              Primary
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={() => {
                    setApiKeys([...apiKeys, ""]);
                    setShowApiKeys([...showApiKeys, false]);
                  }}
                  className="relative z-10 mt-3 w-full px-3 py-2 text-xs font-semibold text-purple-600 hover:text-purple-700 bg-white/80 hover:bg-white border border-purple-300/60 hover:border-purple-400 rounded-lg transition-all flex items-center justify-center gap-1.5 hover:shadow-md hover:shadow-purple-200/30 backdrop-blur-sm"
                >
                  <span className="text-sm">+</span>
                  <span>Add Another Key</span>
                </button>
              </div>

              {/* DNS Region Selection - Enhanced */}
              <div className="relative bg-gradient-to-br from-blue-50/90 via-indigo-50/70 to-white/50 rounded-2xl p-6 border-2 border-blue-300/80 shadow-2xl shadow-blue-200/50 backdrop-blur-md overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-blue-50/30 to-indigo-50/40 rounded-2xl"></div>
                <div className="absolute top-0 right-0 w-40 h-40 bg-blue-300/30 rounded-full blur-3xl -mr-20 -mt-20 animate-pulse"></div>
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-indigo-200/25 rounded-full blur-2xl -ml-16 -mb-16"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-blue-100/20 via-transparent to-transparent"></div>
                <label className="relative z-10 text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3 mb-5">
                  <div className="p-2.5 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-500 rounded-xl shadow-xl shadow-blue-500/60 ring-2 ring-blue-300/60 ring-offset-2 ring-offset-blue-50/50">
                    <Globe className="w-4.5 h-4.5 text-white" strokeWidth={3} />
                  </div>
                  <span className="text-[11px] letter-spacing-wider drop-shadow-sm">
                    DNS Region
                  </span>
                </label>
                <select
                  value={config.region}
                  onChange={(e) =>
                    setConfig({ ...config, region: e.target.value })
                  }
                  className="relative z-10 w-full px-5 py-3.5 bg-white/98 backdrop-blur-lg border-2 border-slate-300/90 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/30 focus:border-blue-500 text-xs font-bold text-slate-900 shadow-lg shadow-slate-300/40 transition-all duration-300 hover:border-blue-400/80 hover:shadow-xl hover:shadow-blue-300/40"
                >
                  <option value="us">
                    🇺🇸 United States (Google, Cloudflare, Quad9)
                  </option>
                  <option value="global">🌍 Global (OpenDNS, Cisco)</option>
                  <option value="secure">🔒 Secure (Malware blocking)</option>
                </select>
                <p className="relative z-10 text-[10px] text-slate-700 font-bold mt-4 flex items-center gap-2.5">
                  <span className="w-2 h-2 bg-blue-500 rounded-full shadow-md shadow-blue-400/60 ring-2 ring-blue-200/50"></span>
                  <span className="drop-shadow-sm">
                    Smart DNS automatically tests and selects fastest server
                  </span>
                </p>
              </div>

              {/* Options Grid - Enhanced with Auto-Rotation - Fixed Height Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <label
                  className={`relative overflow-hidden flex items-center gap-3.5 p-4 h-20 rounded-2xl border-2 cursor-pointer transition-all duration-300 group ${
                    config.smartDNS
                      ? "bg-gradient-to-br from-purple-50/95 via-purple-100/80 to-blue-50/95 border-purple-500/90 shadow-2xl shadow-purple-400/50 hover:shadow-3xl hover:shadow-purple-500/60 hover:scale-[1.03] ring-2 ring-purple-400/70 backdrop-blur-lg"
                      : "bg-white/98 backdrop-blur-xl border-slate-300/95 hover:border-purple-400/80 hover:bg-purple-50/60 hover:shadow-xl hover:shadow-purple-300/40 hover:scale-[1.02]"
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-200/20 via-transparent to-blue-200/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-300/40 to-blue-300/40 rounded-full blur-3xl -mr-12 -mt-12"></div>
                  <div className="absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-br from-purple-200/30 to-blue-200/30 rounded-full blur-2xl -ml-8 -mb-8"></div>
                  <div className="relative z-10 w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-gradient-to-br from-purple-100/40 to-blue-100/30 backdrop-blur-sm">
                    <Globe
                      className={`w-6 h-6 transition-all duration-300 ${
                        config.smartDNS
                          ? "text-purple-500/75"
                          : "text-slate-400/65"
                      }`}
                      strokeWidth={2.5}
                    />
                  </div>
                  <input
                    type="checkbox"
                    checked={config.smartDNS}
                    onChange={(e) =>
                      setConfig({ ...config, smartDNS: e.target.checked })
                    }
                    className="relative z-10 w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500/50 accent-purple-600 cursor-pointer"
                  />
                  <div className="relative z-10 flex-1 min-w-0">
                    <span
                      className={`text-xs font-black block transition-colors mb-1 tracking-tight ${
                        config.smartDNS ? "text-purple-800" : "text-slate-800"
                      }`}
                    >
                      Smart DNS
                    </span>
                    <span className="text-[10px] text-slate-600 font-bold tracking-wide">
                      Auto-select fastest
                    </span>
                  </div>
                  {config.smartDNS && (
                    <div className="relative z-10 pr-1">
                      <div className="p-2 bg-gradient-to-br from-purple-500 via-purple-600 to-blue-500 rounded-xl shadow-xl shadow-purple-500/60 animate-pulse ring-2 ring-purple-300/50">
                        <Server
                          className="w-4 h-4 text-white"
                          strokeWidth={2.5}
                        />
                      </div>
                      <div className="absolute inset-0 bg-purple-400 rounded-xl blur-lg opacity-60 animate-ping"></div>
                    </div>
                  )}
                </label>

                <label
                  className={`relative overflow-hidden flex items-center gap-3.5 p-4 h-20 rounded-2xl border-2 cursor-pointer transition-all duration-300 group ${
                    config.verbose
                      ? "bg-gradient-to-br from-emerald-50/95 via-emerald-100/80 to-teal-50/95 border-emerald-500/90 shadow-2xl shadow-emerald-400/50 hover:shadow-3xl hover:shadow-emerald-500/60 hover:scale-[1.03] ring-2 ring-emerald-400/70 backdrop-blur-lg"
                      : "bg-white/98 backdrop-blur-xl border-slate-300/95 hover:border-emerald-400/80 hover:bg-emerald-50/60 hover:shadow-xl hover:shadow-emerald-300/40 hover:scale-[1.02]"
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-200/20 via-transparent to-teal-200/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-emerald-300/50 to-teal-300/50 rounded-full blur-3xl -mr-14 -mt-14"></div>
                  <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-br from-emerald-200/40 to-teal-200/40 rounded-full blur-2xl -ml-10 -mb-10"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-white/30 via-transparent to-transparent rounded-2xl"></div>
                  <div className="relative z-10 w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-100/40 to-teal-100/30 backdrop-blur-sm">
                    <Terminal
                      className={`w-6 h-6 transition-all duration-300 ${
                        config.verbose
                          ? "text-emerald-500/75"
                          : "text-slate-400/65"
                      }`}
                      strokeWidth={2.5}
                    />
                  </div>
                  <input
                    type="checkbox"
                    checked={config.verbose}
                    onChange={(e) =>
                      setConfig({ ...config, verbose: e.target.checked })
                    }
                    className="relative z-10 w-4 h-4 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500/50 accent-emerald-600 cursor-pointer"
                  />
                  <div className="relative z-10 flex-1 min-w-0">
                    <span
                      className={`text-xs font-black block transition-colors mb-1 tracking-tight ${
                        config.verbose ? "text-emerald-800" : "text-slate-800"
                      }`}
                    >
                      Verbose
                    </span>
                    <span className="text-[10px] text-slate-600 font-bold tracking-wide">
                      Detailed logs
                    </span>
                  </div>
                  {config.verbose && (
                    <div className="relative z-10 pr-1">
                      <div className="p-2 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-500 rounded-xl shadow-xl shadow-emerald-500/60 animate-pulse ring-2 ring-emerald-300/50">
                        <FileText
                          className="w-4 h-4 text-white"
                          strokeWidth={2.5}
                        />
                      </div>
                      <div className="absolute inset-0 bg-emerald-400 rounded-xl blur-lg opacity-60 animate-ping"></div>
                    </div>
                  )}
                </label>

                <label
                  className={`relative overflow-hidden flex items-center gap-3.5 p-4 h-20 rounded-2xl border-2 cursor-pointer transition-all duration-300 group ${
                    config.autoRetry
                      ? "bg-gradient-to-br from-amber-50/95 via-amber-100/80 to-orange-50/95 border-amber-500/90 shadow-2xl shadow-amber-400/50 hover:shadow-3xl hover:shadow-amber-500/60 hover:scale-[1.03] ring-2 ring-amber-400/70 backdrop-blur-lg"
                      : "bg-white/98 backdrop-blur-xl border-slate-300/95 hover:border-amber-400/80 hover:bg-amber-50/60 hover:shadow-xl hover:shadow-amber-300/40 hover:scale-[1.02]"
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-200/20 via-transparent to-orange-200/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-br from-amber-300/50 to-orange-300/50 rounded-full blur-3xl -mr-14 -mt-14"></div>
                  <div className="absolute bottom-0 left-0 w-20 h-20 bg-gradient-to-br from-amber-200/40 to-orange-200/40 rounded-full blur-2xl -ml-10 -mb-10"></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-white/30 via-transparent to-transparent rounded-2xl"></div>
                  <div className="relative z-10 w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-gradient-to-br from-amber-100/40 to-orange-100/30 backdrop-blur-sm">
                    <RotateCw
                      className={`w-6 h-6 transition-all duration-300 ${
                        config.autoRetry
                          ? "text-amber-500/75"
                          : "text-slate-400/65"
                      }`}
                      strokeWidth={2.5}
                    />
                  </div>
                  <input
                    type="checkbox"
                    checked={config.autoRetry}
                    onChange={(e) =>
                      setConfig({ ...config, autoRetry: e.target.checked })
                    }
                    className="relative z-10 w-4 h-4 text-amber-600 rounded focus:ring-2 focus:ring-amber-500/50 accent-amber-600 cursor-pointer"
                  />
                  <div className="relative z-10 flex-1 min-w-0">
                    <span
                      className={`text-xs font-black block transition-colors mb-1 tracking-tight ${
                        config.autoRetry ? "text-amber-800" : "text-slate-800"
                      }`}
                    >
                      Auto-Retry
                    </span>
                    <span className="text-[10px] text-slate-600 font-bold tracking-wide">
                      Smart retry
                    </span>
                  </div>
                  {config.autoRetry && (
                    <div className="relative z-10 pr-1">
                      <div className="p-2 bg-gradient-to-br from-amber-500 via-amber-600 to-orange-500 rounded-xl shadow-xl shadow-amber-500/60 animate-pulse ring-2 ring-amber-300/50">
                        <RotateCw
                          className="w-4 h-4 text-white animate-spin"
                          strokeWidth={2.5}
                          style={{ animationDuration: "2s" }}
                        />
                      </div>
                      <div className="absolute inset-0 bg-amber-400 rounded-xl blur-lg opacity-60 animate-ping"></div>
                    </div>
                  )}
                </label>

                <label
                  className={`relative overflow-hidden flex items-center gap-3.5 p-4 h-20 rounded-2xl border-2 cursor-pointer transition-all duration-300 group ${
                    config.saveResults
                      ? "bg-gradient-to-br from-blue-50/95 via-blue-100/80 to-indigo-50/95 border-blue-500/90 shadow-2xl shadow-blue-400/50 hover:shadow-3xl hover:shadow-blue-500/60 hover:scale-[1.03] ring-2 ring-blue-400/70 backdrop-blur-lg"
                      : "bg-white/98 backdrop-blur-xl border-slate-300/95 hover:border-blue-400/80 hover:bg-blue-50/60 hover:shadow-xl hover:shadow-blue-300/40 hover:scale-[1.02]"
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-200/10 via-transparent to-indigo-200/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-2xl -mr-10 -mt-10"></div>
                  <div className="relative z-10 w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-gradient-to-br from-blue-100/40 to-indigo-100/30 backdrop-blur-sm">
                    <Download
                      className={`w-6 h-6 transition-all duration-300 ${
                        config.saveResults
                          ? "text-blue-500/75"
                          : "text-slate-400/65"
                      }`}
                      strokeWidth={2.5}
                    />
                  </div>
                  <input
                    type="checkbox"
                    checked={config.saveResults}
                    onChange={(e) =>
                      setConfig({ ...config, saveResults: e.target.checked })
                    }
                    className="relative z-10 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500/50 accent-blue-600 cursor-pointer"
                  />
                  <div className="relative z-10 flex-1 min-w-0">
                    <span
                      className={`text-xs font-black block transition-colors mb-1 tracking-tight ${
                        config.saveResults ? "text-blue-800" : "text-slate-800"
                      }`}
                    >
                      Save Results
                    </span>
                    <span className="text-[10px] text-slate-600 font-bold tracking-wide">
                      Export data
                    </span>
                  </div>
                  {config.saveResults && (
                    <div className="relative z-10 pr-1">
                      <div className="p-2 bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-500 rounded-xl shadow-xl shadow-blue-500/60 animate-pulse ring-2 ring-blue-300/50">
                        <Save
                          className="w-4 h-4 text-white"
                          strokeWidth={2.5}
                        />
                      </div>
                      <div className="absolute inset-0 bg-blue-400 rounded-xl blur-lg opacity-60 animate-ping"></div>
                    </div>
                  )}
                </label>

                <label
                  className={`relative overflow-hidden flex items-center gap-3.5 p-4 h-20 rounded-2xl border-2 cursor-pointer transition-all duration-300 group ${
                    config.quickTest
                      ? "bg-gradient-to-br from-pink-50/95 via-pink-100/80 to-rose-50/95 border-pink-500/90 shadow-2xl shadow-pink-400/50 hover:shadow-3xl hover:shadow-pink-500/60 hover:scale-[1.03] ring-2 ring-pink-400/70 backdrop-blur-lg"
                      : "bg-white/98 backdrop-blur-xl border-slate-300/95 hover:border-pink-400/80 hover:bg-pink-50/60 hover:shadow-xl hover:shadow-pink-300/40 hover:scale-[1.02]"
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-pink-200/10 via-transparent to-rose-200/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-pink-200/30 to-rose-200/30 rounded-full blur-2xl -mr-10 -mt-10"></div>
                  <div className="relative z-10 w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-gradient-to-br from-pink-100/40 to-rose-100/30 backdrop-blur-sm">
                    <Zap
                      className={`w-6 h-6 transition-all duration-300 ${
                        config.quickTest
                          ? "text-pink-500/75"
                          : "text-slate-400/65"
                      }`}
                      strokeWidth={2.5}
                    />
                  </div>
                  <input
                    type="checkbox"
                    checked={config.quickTest}
                    onChange={(e) =>
                      setConfig({ ...config, quickTest: e.target.checked })
                    }
                    className="relative z-10 w-4 h-4 text-pink-600 rounded focus:ring-2 focus:ring-pink-500/50 accent-pink-600 cursor-pointer"
                  />
                  <div className="relative z-10 flex-1 min-w-0">
                    <span
                      className={`text-xs font-black block transition-colors mb-1 tracking-tight ${
                        config.quickTest ? "text-pink-800" : "text-slate-800"
                      }`}
                    >
                      Quick Test
                    </span>
                    <span className="text-[10px] text-slate-600 font-bold tracking-wide">
                      Fast mode
                    </span>
                  </div>
                  {config.quickTest && (
                    <div className="relative z-10 pr-1">
                      <div className="p-2 bg-gradient-to-br from-pink-500 via-pink-600 to-rose-500 rounded-xl shadow-xl shadow-pink-500/60 animate-pulse ring-2 ring-pink-300/50">
                        <Rocket
                          className="w-4 h-4 text-white"
                          strokeWidth={2.5}
                        />
                      </div>
                      <div className="absolute inset-0 bg-pink-400 rounded-xl blur-lg opacity-60 animate-ping"></div>
                    </div>
                  )}
                </label>

                {/* Auto-Rotation as 6th Card - Enhanced */}
                <label
                  className={`relative overflow-hidden flex items-center gap-3.5 p-4 h-20 rounded-2xl border-2 cursor-pointer transition-all duration-300 group ${
                    config.autoRotation
                      ? "bg-gradient-to-br from-emerald-50/95 via-emerald-100/80 to-teal-50/95 border-emerald-500/90 shadow-2xl shadow-emerald-400/50 hover:shadow-3xl hover:shadow-emerald-500/60 hover:scale-[1.03] ring-2 ring-emerald-400/70 backdrop-blur-lg"
                      : "bg-white/98 backdrop-blur-xl border-slate-300/95 hover:border-emerald-400/80 hover:bg-emerald-50/60 hover:shadow-xl hover:shadow-emerald-300/40 hover:scale-[1.02]"
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-200/10 via-transparent to-teal-200/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-emerald-200/30 to-teal-200/30 rounded-full blur-2xl -mr-10 -mt-10"></div>
                  <div className="relative z-10 w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-100/40 to-teal-100/30 backdrop-blur-sm">
                    <Activity
                      className={`w-6 h-6 transition-all duration-300 ${
                        config.autoRotation
                          ? "text-emerald-500/75"
                          : "text-slate-400/65"
                      }`}
                      strokeWidth={2.5}
                    />
                  </div>
                  <input
                    type="checkbox"
                    checked={config.autoRotation}
                    onChange={(e) =>
                      setConfig({ ...config, autoRotation: e.target.checked })
                    }
                    className="relative z-10 w-4 h-4 text-emerald-600 rounded focus:ring-2 focus:ring-emerald-500/50 accent-emerald-600 cursor-pointer"
                  />
                  <div className="relative z-10 flex-1 min-w-0">
                    <span
                      className={`text-xs font-black block transition-colors mb-1 tracking-tight ${
                        config.autoRotation
                          ? "text-emerald-800"
                          : "text-slate-800"
                      }`}
                    >
                      Auto-Rotation
                    </span>
                    <span className="text-[10px] text-slate-600 font-bold tracking-wide">
                      {config.autoRotation
                        ? "Rotate keys on limits"
                        : "Single key mode"}
                    </span>
                  </div>
                  {config.autoRotation && (
                    <div className="relative z-10 pr-1">
                      <div className="p-2 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-500 rounded-xl shadow-xl shadow-emerald-500/60 animate-pulse ring-2 ring-emerald-300/50">
                        <Repeat
                          className="w-4 h-4 text-white"
                          strokeWidth={2.5}
                        />
                      </div>
                      <div className="absolute inset-0 bg-emerald-400 rounded-xl blur-lg opacity-60 animate-ping"></div>
                    </div>
                  )}
                </label>

                {/* Auto-Reset Keys - 7th Card */}
                <label
                  className={`relative overflow-hidden flex items-center gap-3.5 p-4 h-20 rounded-2xl border-2 cursor-pointer transition-all duration-300 group ${
                    config.autoResetKeys
                      ? "bg-gradient-to-br from-indigo-50/95 via-indigo-100/80 to-purple-50/95 border-indigo-500/90 shadow-2xl shadow-indigo-400/50 hover:shadow-3xl hover:shadow-indigo-500/60 hover:scale-[1.03] ring-2 ring-indigo-400/70 backdrop-blur-lg"
                      : "bg-white/98 backdrop-blur-xl border-slate-300/95 hover:border-indigo-400/80 hover:bg-indigo-50/60 hover:shadow-xl hover:shadow-indigo-300/40 hover:scale-[1.02]"
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-200/10 via-transparent to-purple-200/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-200/30 to-purple-200/30 rounded-full blur-2xl -mr-10 -mt-10"></div>
                  <div className="relative z-10 w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden bg-gradient-to-br from-indigo-100/40 to-purple-100/30 backdrop-blur-sm">
                    <RefreshCw
                      className={`w-6 h-6 transition-all duration-300 ${
                        config.autoResetKeys
                          ? "text-indigo-500/75"
                          : "text-slate-400/65"
                      }`}
                      strokeWidth={2.5}
                    />
                  </div>
                  <input
                    type="checkbox"
                    checked={config.autoResetKeys}
                    onChange={(e) =>
                      setConfig({ ...config, autoResetKeys: e.target.checked })
                    }
                    className="relative z-10 w-4 h-4 text-indigo-600 rounded focus:ring-2 focus:ring-indigo-500/50 accent-indigo-600 cursor-pointer"
                  />
                  <div className="relative z-10 flex-1 min-w-0">
                    <span
                      className={`text-xs font-black block transition-colors mb-1 tracking-tight ${
                        config.autoResetKeys
                          ? "text-indigo-800"
                          : "text-slate-800"
                      }`}
                    >
                      Auto-Reset Keys
                    </span>
                    <span className="text-[10px] text-slate-600 font-bold tracking-wide">
                      {config.autoResetKeys
                        ? "Auto-reset rate limits"
                        : "Manual reset"}
                    </span>
                  </div>
                  {config.autoResetKeys && (
                    <div className="relative z-10 pr-1">
                      <div className="p-2 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-500 rounded-xl shadow-xl shadow-indigo-500/60 animate-pulse ring-2 ring-indigo-300/50">
                        <RefreshCw
                          className="w-4 h-4 text-white animate-spin"
                          strokeWidth={2.5}
                          style={{ animationDuration: "3s" }}
                        />
                      </div>
                      <div className="absolute inset-0 bg-indigo-400 rounded-xl blur-lg opacity-60 animate-ping"></div>
                    </div>
                  )}
                </label>
              </div>

              {/* Scheduling Section */}
              {config.enableScheduling && (
                <div className="relative bg-gradient-to-br from-violet-50/90 via-purple-50/70 to-white/50 rounded-2xl p-6 border-2 border-violet-300/80 shadow-2xl shadow-violet-200/50 backdrop-blur-md overflow-hidden mt-4">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/60 via-violet-50/30 to-purple-50/40 rounded-2xl"></div>
                  <label className="relative z-10 text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-3 mb-5">
                    <div className="p-2.5 bg-gradient-to-br from-violet-500 via-violet-600 to-purple-500 rounded-xl shadow-xl shadow-violet-500/60 ring-2 ring-violet-300/60 ring-offset-2 ring-offset-violet-50/50">
                      <Clock
                        className="w-4.5 h-4.5 text-white"
                        strokeWidth={3}
                      />
                    </div>
                    <span className="text-[11px] letter-spacing-wider drop-shadow-sm">
                      Test Scheduling
                    </span>
                  </label>
                  <div className="relative z-10 space-y-3">
                    <div className="flex items-center gap-3">
                      <label className="text-xs font-bold text-slate-700 min-w-[100px]">
                        Schedule Time:
                      </label>
                      <input
                        type="time"
                        value={config.scheduleTime}
                        onChange={(e) =>
                          setConfig({ ...config, scheduleTime: e.target.value })
                        }
                        className="px-3 py-2 bg-white/98 backdrop-blur-lg border-2 border-slate-300/90 rounded-xl focus:outline-none focus:ring-4 focus:ring-violet-500/30 focus:border-violet-500 text-xs font-bold shadow-lg"
                      />
                    </div>
                    <p className="text-[10px] text-slate-700 font-bold flex items-center gap-2.5">
                      <span className="w-2 h-2 bg-violet-500 rounded-full shadow-md"></span>
                      <span className="drop-shadow-sm">
                        Tests will run automatically at the scheduled time
                      </span>
                    </p>
                  </div>
                </div>
              )}

              {/* Action Buttons - Enhanced */}
              <div className="flex gap-2.5 pt-3 border-t border-slate-200/50">
                <button
                  onClick={runFullTest}
                  disabled={testing || discovering || !apiKeys[0]}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 text-white rounded-xl font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xl shadow-purple-600/30 hover:shadow-2xl hover:shadow-purple-600/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 group relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                  {testing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin relative z-10" />
                      <span className="relative z-10">Testing Models...</span>
                    </>
                  ) : (
                    <>
                      <div className="p-1 bg-white/20 rounded-lg group-hover:bg-white/30 transition-all relative z-10">
                        <Zap className="w-4 h-4" />
                      </div>
                      <span className="relative z-10">Run Full Test</span>
                    </>
                  )}
                </button>

                <button
                  onClick={discoverOnly}
                  disabled={testing || discovering || !apiKeys[0]}
                  className="px-4 py-3 bg-white border-2 border-purple-500/70 text-purple-600 rounded-xl font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 hover:border-purple-600 hover:shadow-lg flex items-center justify-center gap-2"
                >
                  {discovering ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Discovering...</span>
                    </>
                  ) : (
                    <>
                      <Globe className="w-4 h-4" />
                      <span>Discover</span>
                    </>
                  )}
                </button>

                {(testing || discovering) && (
                  <button
                    onClick={stopTest}
                    className="px-4 py-3 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-bold text-xs hover:from-red-600 hover:to-rose-700 transition-all shadow-xl shadow-red-500/30 hover:shadow-2xl hover:shadow-red-500/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
                  >
                    <Square className="w-4 h-4" />
                    <span>Stop</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Logs Tab - Enhanced with Categories */}
        {activeTab === "logs" && (
          <div className="p-3 bg-white overflow-hidden flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 text-purple-400" />
                Console Output
              </h3>
              <button
                onClick={() => setLogs([])}
                className="text-[10px] font-medium px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-all"
              >
                Clear
              </button>
            </div>

            {/* Progress Bar - Fixed at Top */}
            {(testing || discovering) && progress.total > 0 && (
              <div className="mb-3 bg-slate-50 rounded-lg p-2 border border-slate-200 shadow-sm sticky top-0 z-20">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-700">
                    {progress.current} / {progress.total} models
                  </span>
                  <span className="text-xs font-black text-purple-600">
                    {progress.percentage}%
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 via-blue-500 to-indigo-500 transition-all duration-300 ease-out rounded-full shadow-md"
                    style={{ width: `${progress.percentage}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="rounded-lg p-3 flex-1 overflow-y-auto font-mono text-[10px] bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700 shadow-2xl shadow-slate-900/50 relative">
              {logs.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <Terminal className="w-16 h-16 text-slate-400/30 mx-auto mb-3" />
                    <p className="text-slate-400 text-xs font-medium mb-1">
                      &gt; Console Ready
                    </p>
                    <p className="text-slate-500 text-[10px]">
                      Run a test to see logs here
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {logs.map((log) => {
                    const getCategory = (type: string) => {
                      if (type === "error")
                        return {
                          bg: "bg-red-500/20",
                          border: "border-red-500/50",
                          icon: "❌",
                          label: "ERROR",
                        };
                      if (type === "success")
                        return {
                          bg: "bg-emerald-500/20",
                          border: "border-emerald-500/50",
                          icon: "✅",
                          label: "SUCCESS",
                        };
                      if (type === "warning")
                        return {
                          bg: "bg-amber-500/20",
                          border: "border-amber-500/50",
                          icon: "⚠️",
                          label: "WARNING",
                        };
                      if (type === "info")
                        return {
                          bg: "bg-blue-500/20",
                          border: "border-blue-500/50",
                          icon: "ℹ️",
                          label: "INFO",
                        };
                      if (type === "test")
                        return {
                          bg: "bg-purple-500/20",
                          border: "border-purple-500/50",
                          icon: "🧪",
                          label: "TEST",
                        };
                      if (type === "bypass")
                        return {
                          bg: "bg-cyan-500/20",
                          border: "border-cyan-500/50",
                          icon: "🔓",
                          label: "BYPASS",
                        };
                      return {
                        bg: "bg-slate-500/20",
                        border: "border-slate-500/50",
                        icon: "•",
                        label: "LOG",
                      };
                    };

                    const category = getCategory(log.type);

                    const isLongMessage =
                      log.message && log.message.length > 100;
                    const isExpanded = expandedLogs.has(log.id);

                    return (
                      <div
                        key={log.id}
                        className={`${category.bg} ${category.border} border-l-2 rounded px-2 py-1.5 hover:opacity-80 transition-all`}
                      >
                        <div className="flex items-start gap-2">
                          <span className="text-[9px] text-slate-400 font-semibold min-w-[45px]">
                            {log.timestamp}
                          </span>
                          <span className="text-xs mr-1">{category.icon}</span>
                          <span
                            className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${category.bg} ${category.border} border min-w-[60px] text-center`}
                          >
                            {category.label}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span
                              className={`${
                                log.type === "error"
                                  ? "text-red-300"
                                  : log.type === "success"
                                    ? "text-emerald-300"
                                    : log.type === "warning"
                                      ? "text-amber-300"
                                      : log.type === "info"
                                        ? "text-blue-300"
                                        : log.type === "test"
                                          ? "text-purple-300"
                                          : log.type === "bypass"
                                            ? "text-cyan-300"
                                            : "text-slate-300"
                              } font-medium break-words ${isLongMessage && !isExpanded ? "line-clamp-2" : ""}`}
                            >
                              {log.message}
                            </span>
                            {isLongMessage && (
                              <button
                                onClick={() => {
                                  const newExpanded = new Set(expandedLogs);
                                  if (isExpanded) {
                                    newExpanded.delete(log.id);
                                  } else {
                                    newExpanded.add(log.id);
                                  }
                                  setExpandedLogs(newExpanded);
                                }}
                                className="ml-2 text-[9px] text-cyan-400 hover:text-cyan-300 font-semibold underline"
                              >
                                {isExpanded ? "کمتر" : "بیشتر..."}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        )}

        {/* Live Test Tab - New */}
        {activeTab === "live" && (
          <div className="p-4 bg-white overflow-y-auto flex-1 flex flex-col">
            <div className="mb-4">
              <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-2">
                <Play className="w-4 h-4 text-purple-500" />
                Live Model Testing
              </h3>
              <p className="text-xs text-slate-600 mb-4">
                Test the top 5 most important models with real requests to
                verify they work correctly.
              </p>
              {results &&
              results.models &&
              results.models.accessible &&
              results.models.accessible.length > 0 ? (
                <button
                  onClick={async () => {
                    if (testingLive) return;
                    setTestingLive(true);
                    setLiveTestResults([]);
                    addLog(
                      "info",
                      "🧪 Starting live test on top 5 models with same bypass/DNS settings...",
                    );

                    const topModels = results.models.accessible
                      .sort((a: any, b: any) => {
                        const aPriority =
                          a.name?.includes("3") || a.name?.includes("flash")
                            ? 2
                            : 1;
                        const bPriority =
                          b.name?.includes("3") || b.name?.includes("flash")
                            ? 2
                            : 1;
                        if (aPriority !== bPriority)
                          return bPriority - aPriority;
                        return (
                          (a.avgResponseTime || 9999) -
                          (b.avgResponseTime || 9999)
                        );
                      })
                      .slice(0, 5);

                    const testResults: any[] = [];
                    const validApiKey =
                      apiKeys.find((k) => k && k.length > 10) || apiKeys[0];

                    // Initialize tester service with same config as initial test
                    try {
                      const tester = new UltimateGeminiTesterService({
                        apiKey: validApiKey,
                        apiKeys: apiKeys.filter((k) => k && k.length > 10),
                        bypassMode: config.bypassMode,
                        region: config.region,
                        smartDNS: config.smartDNS,
                        verbose: config.verbose,
                        addLogCallback: addLog,
                      });

                      await tester.initialize();
                      const bypassMethod = tester.getResults().bypassMethod;
                      addLog("info", `🔓 Using bypass method: ${bypassMethod}`);
                      addLog(
                        "info",
                        `🌐 DNS Region: ${config.region}, Smart DNS: ${config.smartDNS ? "enabled" : "disabled"}`,
                      );

                      const client = tester.getClient();

                      for (const model of topModels) {
                        try {
                          addLog(
                            "test",
                            `Testing ${model.name} with ${bypassMethod}...`,
                          );
                          const startTime = Date.now();

                          // Use the tester's client which has bypass/DNS logic
                          const result = await client.request(
                            `models/${model.name}:generateContent?key=${validApiKey}`,
                            {
                              method: "POST",
                              body: {
                                contents: [
                                  {
                                    parts: [
                                      {
                                        text: "Write a simple JavaScript function that adds two numbers. Only return the code, no explanation.",
                                      },
                                    ],
                                  },
                                ],
                              },
                              timeout: 15000,
                              maxRetries: 2,
                            },
                          );

                          const responseTime = Date.now() - startTime;

                          if (result.success && result.data) {
                            const generatedText =
                              result.data.candidates?.[0]?.content?.parts?.[0]
                                ?.text || "No text generated";

                            testResults.push({
                              model: model.name,
                              success: true,
                              responseTime,
                              response:
                                generatedText.substring(0, 200) +
                                (generatedText.length > 200 ? "..." : ""),
                              fullResponse: generatedText,
                            });

                            addLog(
                              "success",
                              `✅ ${model.name} responded in ${responseTime}ms`,
                            );
                          } else {
                            testResults.push({
                              model: model.name,
                              success: false,
                              responseTime: result.responseTime || 0,
                              error:
                                result.error ||
                                `HTTP ${result.status || "Unknown"}`,
                            });

                            addLog(
                              "error",
                              `❌ ${model.name} failed: ${result.error || "Unknown error"}`,
                            );
                          }
                        } catch (error: any) {
                          testResults.push({
                            model: model.name,
                            success: false,
                            error: error?.message || "Unknown error",
                          });

                          addLog(
                            "error",
                            `❌ ${model.name} error: ${error?.message || "Unknown"}`,
                          );
                        }

                        await new Promise((resolve) =>
                          setTimeout(resolve, 1000),
                        );
                      }
                    } catch (error: any) {
                      addLog(
                        "error",
                        `💥 Failed to initialize tester: ${error?.message || "Unknown error"}`,
                      );
                      addLog(
                        "warning",
                        "⚠️ Falling back to direct API calls (bypass may not work)",
                      );

                      // Fallback to direct calls if tester initialization fails
                      for (const model of topModels) {
                        try {
                          addLog(
                            "test",
                            `Testing ${model.name} (direct, no bypass)...`,
                          );
                          const startTime = Date.now();

                          const response = await fetch(
                            `https://generativelanguage.googleapis.com/v1beta/models/${model.name}:generateContent?key=${validApiKey}`,
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                contents: [
                                  {
                                    parts: [
                                      {
                                        text: "Write a simple JavaScript function that adds two numbers. Only return the code, no explanation.",
                                      },
                                    ],
                                  },
                                ],
                              }),
                              signal: AbortSignal.timeout(15000),
                            },
                          );

                          const responseTime = Date.now() - startTime;

                          if (response.ok) {
                            const data = await response.json();
                            const generatedText =
                              data.candidates?.[0]?.content?.parts?.[0]?.text ||
                              "No text generated";

                            testResults.push({
                              model: model.name,
                              success: true,
                              responseTime,
                              response:
                                generatedText.substring(0, 200) +
                                (generatedText.length > 200 ? "..." : ""),
                              fullResponse: generatedText,
                            });

                            addLog(
                              "success",
                              `✅ ${model.name} responded in ${responseTime}ms`,
                            );
                          } else {
                            const errorText = await response.text();
                            testResults.push({
                              model: model.name,
                              success: false,
                              responseTime,
                              error: `HTTP ${response.status}: ${errorText.substring(0, 100)}`,
                            });

                            addLog(
                              "error",
                              `❌ ${model.name} failed: HTTP ${response.status}`,
                            );
                          }
                        } catch (error: any) {
                          testResults.push({
                            model: model.name,
                            success: false,
                            error: error?.message || "Unknown error",
                          });

                          addLog(
                            "error",
                            `❌ ${model.name} error: ${error?.message || "Unknown"}`,
                          );
                        }

                        await new Promise((resolve) =>
                          setTimeout(resolve, 1000),
                        );
                      }
                    }

                    setLiveTestResults(testResults);
                    const successCount = testResults.filter(
                      (r) => r.success,
                    ).length;
                    addLog(
                      "success",
                      `🎉 Live test complete: ${successCount}/5 models working`,
                    );

                    // Filter out failed models from accessible list if they failed in live test
                    if (successCount < 5) {
                      const failedModels = testResults
                        .filter((r) => !r.success)
                        .map((r) => r.model);
                      addLog(
                        "warning",
                        `⚠️ ${failedModels.length} model(s) failed live test: ${failedModels.join(", ")}`,
                      );
                      addLog(
                        "info",
                        "💡 These models may not work with current bypass/DNS settings",
                      );
                      addLog(
                        "info",
                        "💡 Consider re-running the full test or adjusting bypass/DNS settings",
                      );

                      // Update results to remove failed models from accessible list
                      if (
                        results &&
                        results.models &&
                        results.models.accessible
                      ) {
                        const updatedResults = {
                          ...results,
                          models: {
                            ...results.models,
                            accessible: results.models.accessible.filter(
                              (m: any) => !failedModels.includes(m.name),
                            ),
                          },
                        };
                        setResults(updatedResults);
                        addLog(
                          "info",
                          `📊 Updated accessible models list: removed ${failedModels.length} failed model(s)`,
                        );
                      }
                    }

                    setTestingLive(false);
                  }}
                  disabled={
                    testingLive ||
                    !results ||
                    !results.models ||
                    !results.models.accessible ||
                    results.models.accessible.length === 0
                  }
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-xs disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-500/30 hover:shadow-xl hover:shadow-purple-500/40 flex items-center gap-2"
                >
                  {testingLive ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Testing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4" />
                      <span>Test Top 5 Models</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <p className="text-sm text-slate-600">
                    Run a full test first to discover models.
                  </p>
                </div>
              )}
            </div>

            {liveTestResults.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider">
                  Test Results
                </h4>
                {liveTestResults.map((result, index) => (
                  <div
                    key={`live-test-${result.model}-${index}-${result.success ? "success" : "error"}`}
                    className={`p-4 rounded-xl border-2 ${
                      result.success
                        ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300 shadow-lg"
                        : "bg-gradient-to-br from-red-50 to-rose-50 border-red-300 shadow-lg"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : (
                          <AlertCircle className="w-5 h-5 text-red-600" />
                        )}
                        <span className="font-black text-sm text-slate-800">
                          {result.model}
                        </span>
                      </div>
                      {result.responseTime && (
                        <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {result.responseTime}ms
                        </span>
                      )}
                    </div>

                    {result.success ? (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-slate-700 mb-1">
                          Response:
                        </p>
                        <div className="bg-slate-900 rounded-lg p-3 font-mono text-[10px] text-emerald-300 overflow-x-auto">
                          <pre className="whitespace-pre-wrap">
                            {result.response}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-red-700 mb-1">
                          Error:
                        </p>
                        <div className="bg-red-50 rounded-lg p-3 text-xs text-red-700">
                          {result.error}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Results Tab - Enhanced */}
        {activeTab === "results" && (
          <div className="p-3 bg-white overflow-y-auto flex-1 flex flex-col">
            {!results ? (
              <div className="flex-1 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 via-blue-50/30 to-transparent"></div>
                <div className="text-center relative z-10">
                  <div className="mb-6 relative inline-block">
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-blue-600/20 blur-3xl rounded-full"></div>
                    <div className="relative bg-white/80 backdrop-blur-sm p-8 rounded-2xl border border-purple-200/50 shadow-xl">
                      <Database className="w-20 h-20 text-purple-300 mx-auto mb-4" />
                      <h3 className="text-lg font-bold text-slate-700 mb-2">
                        No Test Results Yet
                      </h3>
                      <p className="text-slate-500 text-sm mb-4">
                        Run a full test to see detailed results
                      </p>
                      <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
                        <Zap className="w-4 h-4" />
                        <span>Click "Run Full Test" to begin</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Success Rate Banner - Enhanced */}
                {(() => {
                  const total = results.models?.total || 0;
                  const accessible = results.models?.accessible?.length || 0;
                  const successRate =
                    total > 0 ? Math.round((accessible / total) * 100) : 0;
                  const rateColor =
                    successRate >= 80
                      ? "from-emerald-500 to-teal-500"
                      : successRate >= 50
                        ? "from-amber-500 to-orange-500"
                        : "from-red-500 to-rose-500";
                  const rateBg =
                    successRate >= 80
                      ? "from-emerald-50 to-teal-50"
                      : successRate >= 50
                        ? "from-amber-50 to-orange-50"
                        : "from-red-50 to-rose-50";

                  return (
                    <div
                      className={`bg-gradient-to-r ${rateBg} border-2 rounded-xl p-3 shadow-lg`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div
                            className={`p-3 bg-gradient-to-br ${rateColor} rounded-xl shadow-lg`}
                          >
                            <BarChart3 className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                              Success Rate
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span
                                className={`text-4xl font-black bg-gradient-to-r ${rateColor} bg-clip-text text-transparent`}
                              >
                                {successRate}%
                              </span>
                              <span className="text-sm text-slate-500">
                                ({accessible}/{total} models)
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">
                              Avg Response
                            </div>
                            <div className="text-lg font-black text-slate-700">
                              {results.performance?.avgResponseTime || 0}ms
                            </div>
                          </div>
                          <div className="w-16 h-16 relative">
                            <svg className="transform -rotate-90 w-16 h-16">
                              <circle
                                cx="32"
                                cy="32"
                                r="28"
                                stroke="currentColor"
                                strokeWidth="6"
                                fill="none"
                                className="text-slate-200"
                              />
                              <circle
                                cx="32"
                                cy="32"
                                r="28"
                                stroke="currentColor"
                                strokeWidth="6"
                                fill="none"
                                strokeDasharray={`${2 * Math.PI * 28}`}
                                strokeDashoffset={`${2 * Math.PI * 28 * (1 - successRate / 100)}`}
                                className={`${
                                  successRate >= 80
                                    ? "text-emerald-500"
                                    : successRate >= 50
                                      ? "text-amber-500"
                                      : "text-red-500"
                                } transition-all duration-500`}
                                strokeLinecap="round"
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span
                                className={`text-xs font-black ${
                                  successRate >= 80
                                    ? "text-emerald-600"
                                    : successRate >= 50
                                      ? "text-amber-600"
                                      : "text-red-600"
                                }`}
                              >
                                {successRate}%
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Stats Grid - Enhanced */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                  <div className="bg-gradient-to-br from-emerald-50 via-emerald-100 to-teal-50 border-2 border-emerald-300 rounded-lg p-3 transition-all hover:shadow-xl hover:scale-105 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-200/30 rounded-full -mr-10 -mt-10"></div>
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 mb-2 relative z-10" />
                    <div className="text-3xl font-black text-emerald-700 mt-2 relative z-10">
                      {results.models?.accessible?.length || 0}
                    </div>
                    <div className="text-xs font-bold text-emerald-600 uppercase tracking-wider mt-1 relative z-10">
                      Accessible
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-amber-50 via-amber-100 to-orange-50 border-2 border-amber-300 rounded-xl p-5 transition-all hover:shadow-xl hover:scale-105 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-amber-200/30 rounded-full -mr-10 -mt-10"></div>
                    <AlertCircle className="w-8 h-8 text-amber-600 mb-2 relative z-10" />
                    <div className="text-3xl font-black text-amber-700 mt-2 relative z-10">
                      {results.models?.restricted?.length || 0}
                    </div>
                    <div className="text-xs font-bold text-amber-600 uppercase tracking-wider mt-1 relative z-10">
                      Restricted
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-red-50 via-red-100 to-rose-50 border-2 border-red-300 rounded-xl p-5 transition-all hover:shadow-xl hover:scale-105 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-red-200/30 rounded-full -mr-10 -mt-10"></div>
                    <X className="w-8 h-8 text-red-600 mb-2 relative z-10" />
                    <div className="text-3xl font-black text-red-700 mt-2 relative z-10">
                      {results.models?.failed?.length || 0}
                    </div>
                    <div className="text-xs font-bold text-red-600 uppercase tracking-wider mt-1 relative z-10">
                      Failed
                    </div>
                  </div>

                  <div className="bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-50 border-2 border-blue-300 rounded-xl p-5 transition-all hover:shadow-xl hover:scale-105 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-blue-200/30 rounded-full -mr-10 -mt-10"></div>
                    <Clock className="w-8 h-8 text-blue-600 mb-2 relative z-10" />
                    <div className="text-3xl font-black text-blue-700 mt-2 relative z-10">
                      {results.performance?.avgResponseTime || 0}ms
                    </div>
                    <div className="text-xs font-bold text-blue-600 uppercase tracking-wider mt-1 relative z-10">
                      Avg Time
                    </div>
                  </div>
                </div>

                {/* Accessible Models - Enhanced */}
                {results.models?.accessible?.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                        <div className="p-1.5 bg-emerald-100 rounded-lg">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        </div>
                        <span>
                          Accessible Models ({results.models.accessible.length})
                        </span>
                      </h3>
                      <button
                        onClick={() => {
                          const accessibleNames = results.models.accessible
                            .map((m: any) => m.name)
                            .join("\n");
                          navigator.clipboard.writeText(accessibleNames);
                          addLog(
                            "success",
                            "✅ Model names copied to clipboard",
                          );
                        }}
                        className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition-all flex items-center gap-1.5"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        Copy Names
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {results.models.accessible.map(
                        (model: any, idx: number) => (
                          <div
                            key={`accessible-model-${model.name}-${model.responseTime || 0}-${idx}`}
                            className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-200 rounded-xl p-4 transition-all hover:shadow-lg hover:border-emerald-300 hover:scale-[1.02] group"
                          >
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <div className="font-bold text-slate-900 text-sm mb-1 group-hover:text-emerald-700 transition-colors">
                                  {model.name}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-slate-600">
                                  <span className="px-2 py-0.5 bg-white rounded-md border border-slate-200 font-semibold">
                                    {model.family || "unknown"}
                                  </span>
                                  <span className="px-2 py-0.5 bg-white rounded-md border border-slate-200">
                                    {model.tier || "unknown"}
                                  </span>
                                </div>
                              </div>
                              <div className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-black shadow-md">
                                {model.responseTime || 0}ms
                              </div>
                            </div>
                            {model.capabilities &&
                              Array.isArray(model.capabilities) &&
                              model.capabilities.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {model.capabilities
                                    .slice(0, 3)
                                    .map((cap: string) => (
                                      <span
                                        key={cap}
                                        className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-700 rounded-md"
                                      >
                                        {cap}
                                      </span>
                                    ))}
                                  {model.capabilities.length > 3 && (
                                    <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded-md">
                                      +{model.capabilities.length - 3}
                                    </span>
                                  )}
                                </div>
                              )}
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* Restricted Models - Enhanced */}
                {results.models?.restricted?.length > 0 && (
                  <div>
                    <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <div className="p-1.5 bg-amber-100 rounded-lg">
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                      </div>
                      <span>
                        Restricted Models ({results.models.restricted.length})
                      </span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {results.models.restricted.map(
                        (model: any, idx: number) => (
                          <div
                            key={`restricted-model-${model.name}-${idx}-${model.error || "unknown"}`}
                            className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-4 transition-all hover:shadow-lg hover:border-amber-300"
                          >
                            <div className="font-bold text-amber-900 text-sm mb-2">
                              {model.name}
                            </div>
                            <div className="text-xs text-amber-700 bg-amber-100/50 rounded-lg px-2 py-1.5 border border-amber-200">
                              {model.error || "Access restricted"}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {/* Action Buttons - Enhanced */}
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={downloadResults}
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 text-white rounded-xl font-bold text-sm transition-all shadow-xl shadow-purple-600/30 hover:shadow-2xl hover:shadow-purple-600/40 hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download JSON Report
                  </button>
                  <button
                    onClick={() => {
                      const summary = `Success Rate: ${Math.round(((results.models?.accessible?.length || 0) / (results.models?.total || 1)) * 100)}%\nAccessible: ${results.models?.accessible?.length || 0}\nRestricted: ${results.models?.restricted?.length || 0}\nFailed: ${results.models?.failed?.length || 0}\nAvg Response: ${results.performance?.avgResponseTime || 0}ms`;
                      navigator.clipboard.writeText(summary);
                      addLog("success", "✅ Summary copied to clipboard");
                    }}
                    className="px-6 py-3.5 bg-white border-2 border-purple-500/70 text-purple-600 rounded-xl font-bold text-sm transition-all hover:bg-purple-50 hover:border-purple-600 hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Summary
                  </button>
                  <button
                    onClick={() => {
                      setResults(null);
                      setLogs([]);
                      setProgress({ current: 0, total: 0, percentage: 0 });
                      setSuccessRate(0);
                      addLog("info", "🔄 Results cleared");
                    }}
                    className="px-6 py-3.5 bg-white border-2 border-slate-300 text-slate-600 rounded-xl font-bold text-sm transition-all hover:bg-slate-50 hover:border-slate-400 hover:shadow-lg flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Clear
                  </button>
                </div>
              </div>
            )}

            {/* Performance Dashboard Tab */}
            {activeTab === "performance" && (
              <div className="p-4 bg-white overflow-y-auto flex-1 flex flex-col relative">
                {/* Background overlay with blur effect */}
                {testing && (
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-50/80 via-blue-50/60 to-indigo-50/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-xl">
                    <div className="text-center">
                      <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-2" />
                      <p className="text-sm font-semibold text-slate-700">
                        Loading performance data...
                      </p>
                    </div>
                  </div>
                )}

                <div className="mb-4 relative z-0">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-2">
                    <BarChart3 className="w-4 h-4 text-purple-500" />
                    Performance Metrics Dashboard
                  </h3>
                  <p className="text-xs text-slate-600">
                    Real-time performance monitoring and analytics for API
                    requests, DNS, and system health.
                  </p>
                </div>

                {results ? (
                  <div className="space-y-4 relative z-0">
                    {/* Request Performance Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Clock className="w-5 h-5 text-blue-600" />
                          <span className="text-xs font-bold text-blue-600">
                            Avg Response
                          </span>
                        </div>
                        <div className="text-2xl font-black text-blue-700">
                          {results.performance?.avgResponseTime || 0}ms
                        </div>
                        {results.performance?.fastest && (
                          <div className="text-xs text-blue-600 mt-1">
                            Fastest: {results.performance.fastest.name} (
                            {results.performance.fastest.responseTime}ms)
                          </div>
                        )}
                      </div>

                      <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <Activity className="w-5 h-5 text-purple-600" />
                          <span className="text-xs font-bold text-purple-600">
                            Total Requests
                          </span>
                        </div>
                        <div className="text-2xl font-black text-purple-700">
                          {results.performance?.modelStats?.length || 0}
                        </div>
                        <div className="text-xs text-purple-600 mt-1">
                          Models tested
                        </div>
                      </div>

                      <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-2">
                          <TrendingUp className="w-5 h-5 text-emerald-600" />
                          <span className="text-xs font-bold text-emerald-600">
                            Success Rate
                          </span>
                        </div>
                        <div className="text-2xl font-black text-emerald-700">
                          {(() => {
                            const total = results.models?.total || 0;
                            const accessible =
                              results.models?.accessible?.length || 0;
                            return total > 0
                              ? Math.round((accessible / total) * 100)
                              : 0;
                          })()}
                          %
                        </div>
                        <div className="text-xs text-emerald-600 mt-1">
                          {results.models?.accessible?.length || 0}/
                          {results.models?.total || 0} models
                        </div>
                      </div>
                    </div>

                    {/* DNS Performance */}
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 border-2 border-slate-300 rounded-xl p-4">
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        DNS Performance
                      </h4>
                      <div className="text-sm text-slate-600">
                        <p>
                          Active DNS: {results.bypassMethod || "System Default"}
                        </p>
                        <p className="text-xs mt-1">
                          DNS caching and failover mechanisms are active
                        </p>
                      </div>
                    </div>

                    {/* Response Time Distribution */}
                    {results.performance?.modelStats &&
                    results.performance.modelStats.length > 0 ? (
                      <div className="bg-white border-2 border-slate-300 rounded-xl p-4">
                        <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">
                          Response Time Distribution
                        </h4>
                        <div className="space-y-2">
                          {results.performance.modelStats
                            .sort(
                              (a: any, b: any) =>
                                b.responseTime - a.responseTime,
                            )
                            .slice(0, 10)
                            .map((stat: any, idx: number) => {
                              const maxTime = Math.max(
                                ...results.performance.modelStats.map(
                                  (s: any) => s.responseTime,
                                ),
                              );
                              const percentage =
                                maxTime > 0
                                  ? (stat.responseTime / maxTime) * 100
                                  : 0;
                              return (
                                <div
                                  key={`perf-stat-${stat.name}-${stat.responseTime}-${idx}`}
                                  className="flex items-center gap-3"
                                >
                                  <div className="text-xs font-semibold text-slate-700 min-w-[200px] truncate">
                                    {stat.name || `Model ${idx + 1}`}
                                  </div>
                                  <div className="flex-1 bg-slate-200 rounded-full h-2 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all ${
                                        stat.responseTime < 1000
                                          ? "bg-emerald-500"
                                          : stat.responseTime < 3000
                                            ? "bg-amber-500"
                                            : "bg-red-500"
                                      }`}
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                  <div className="text-xs font-bold text-slate-600 min-w-[60px] text-right">
                                    {stat.responseTime}ms
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6 text-center">
                        <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500 font-semibold">
                          No performance data available
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          Run a test to see response time distribution
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center relative z-0">
                    <div className="text-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-8 border-2 border-slate-200">
                      <div className="relative inline-block mb-4">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-200/20 to-blue-200/20 blur-2xl rounded-full"></div>
                        <BarChart3 className="w-16 h-16 text-slate-300 mx-auto relative" />
                      </div>
                      <h4 className="text-lg font-bold text-slate-700 mb-2">
                        No Performance Data
                      </h4>
                      <p className="text-slate-500 text-sm mb-4">
                        Run a full test to see performance metrics
                      </p>
                      <button
                        onClick={() => setActiveTab("setup")}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm font-semibold hover:shadow-lg transition-all"
                      >
                        Go to Setup
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* API Keys Management Tab */}
            {activeTab === "keys" && (
              <div className="p-4 bg-white overflow-y-auto flex-1 flex flex-col">
                <div className="mb-4">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-2">
                    <Key className="w-4 h-4 text-purple-500" />
                    API Key Management
                  </h3>
                  <p className="text-xs text-slate-600">
                    Monitor and manage your API keys with real-time performance
                    tracking and automatic rotation.
                  </p>
                </div>

                <div className="space-y-3">
                  {apiKeys.map((key, index) => {
                    const keyStatus =
                      key && key.length > 10 ? "active" : "inactive";
                    const maskedKey =
                      key && key.length > 10
                        ? `${key.substring(0, 8)}...${key.substring(key.length - 4)}`
                        : "Not configured";
                    const uniqueKey =
                      key && key.length > 10
                        ? `api-key-${key.substring(0, 8)}-${key.substring(key.length - 4)}-${index}`
                        : `api-key-empty-${index}`;

                    return (
                      <div
                        key={uniqueKey}
                        className={`border-2 rounded-xl p-4 transition-all ${
                          keyStatus === "active"
                            ? "bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-300"
                            : "bg-gradient-to-br from-slate-50 to-slate-100 border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div
                              className={`p-2 rounded-lg ${
                                keyStatus === "active"
                                  ? "bg-emerald-100"
                                  : "bg-slate-200"
                              }`}
                            >
                              <Key
                                className={`w-4 h-4 ${
                                  keyStatus === "active"
                                    ? "text-emerald-600"
                                    : "text-slate-400"
                                }`}
                              />
                            </div>
                            <div>
                              <div className="font-bold text-sm text-slate-800">
                                API Key {index + 1}{" "}
                                {index === 0 && (
                                  <span className="text-xs text-emerald-600">
                                    (Primary)
                                  </span>
                                )}
                              </div>
                              <div className="text-xs font-mono text-slate-600 mt-1">
                                {maskedKey}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {keyStatus === "active" ? (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 rounded-lg">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                <span className="text-xs font-bold text-emerald-700">
                                  Active
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 rounded-lg">
                                <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                                <span className="text-xs font-bold text-slate-600">
                                  Inactive
                                </span>
                              </div>
                            )}
                            {apiKeys.length > 1 && (
                              <button
                                onClick={() => {
                                  const newKeys = apiKeys.filter(
                                    (_, i) => i !== index,
                                  );
                                  setApiKeys(newKeys);
                                  setShowApiKeys(
                                    showApiKeys.filter((_, i) => i !== index),
                                  );
                                  addLog(
                                    "info",
                                    `Removed API key ${index + 1}`,
                                  );
                                }}
                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {keyStatus === "active" && (
                          <div className="mt-3 pt-3 border-t border-emerald-200">
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-slate-600">Status:</span>
                                <span className="ml-2 font-bold text-emerald-700">
                                  Ready
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-600">
                                  Auto-Rotation:
                                </span>
                                <span
                                  className={`ml-2 font-bold ${config.autoRotation ? "text-emerald-700" : "text-slate-500"}`}
                                >
                                  {config.autoRotation ? "Enabled" : "Disabled"}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <button
                    onClick={() => {
                      setApiKeys([...apiKeys, ""]);
                      setShowApiKeys([...showApiKeys, false]);
                    }}
                    className="w-full px-4 py-3 text-sm font-semibold text-purple-600 hover:text-purple-700 bg-white border-2 border-purple-300 hover:border-purple-400 rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <span className="text-lg">+</span>
                    <span>Add Another API Key</span>
                  </button>

                  {apiKeys.length > 1 && (
                    <div className="mt-4 p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-blue-600" />
                        <span className="text-xs font-black text-blue-700 uppercase tracking-wider">
                          Multi-Key Benefits
                        </span>
                      </div>
                      <ul className="text-xs text-blue-700 space-y-1">
                        <li>• Automatic rotation on rate limits</li>
                        <li>• Performance-based key selection</li>
                        <li>• Increased request throughput</li>
                        <li>• Failover protection</li>
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Render modal outside of Ribbon using Portal (separate window effect)
  return createPortal(modalContent, document.body);
}

// Note: Local classes (UltimateGeminiTester, SmartHTTPClient, BypassManager, Logger, DNSManager)
// are kept for backward compatibility but are not exported.
// Use UltimateGeminiTesterService from '../services/ultimateGeminiTester' instead.
// are kept for backward compatibility but are not exported.
// Use UltimateGeminiTesterService from '../services/ultimateGeminiTester' instead.
