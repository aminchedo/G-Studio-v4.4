/**
 * useRuntimeGuardrails - Runtime guardrails and policy enforcement hook
 * 
 * Provides resource limits, security checks, and policy enforcement
 * for safe AI and code execution
 */

import { useState, useCallback, useRef, useMemo } from 'react';

// Types
export type GuardrailType = 'resource' | 'security' | 'compliance' | 'rate' | 'content';
export type GuardrailAction = 'warn' | 'block' | 'throttle' | 'log';
export type ViolationSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface Guardrail {
  id: string;
  name: string;
  type: GuardrailType;
  condition: (context: GuardrailContext) => boolean | Promise<boolean>;
  action: GuardrailAction;
  message: string;
  severity: ViolationSeverity;
  enabled: boolean;
  metadata?: Record<string, unknown>;
}

export interface GuardrailContext {
  operation: string;
  resource?: string;
  user?: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface Violation {
  id: string;
  guardrailId: string;
  guardrailName: string;
  timestamp: number;
  context: GuardrailContext;
  severity: ViolationSeverity;
  action: GuardrailAction;
  message: string;
  resolved: boolean;
}

export interface GuardrailResult {
  allowed: boolean;
  violations: Violation[];
  warnings: string[];
  throttled: boolean;
  throttleDelay?: number;
}

export interface ResourceLimits {
  maxMemoryMB: number;
  maxCpuPercent: number;
  maxRequestsPerMinute: number;
  maxConcurrentOperations: number;
  maxTokensPerRequest: number;
  maxResponseSizeKB: number;
}

export interface UseRuntimeGuardrailsReturn {
  // State
  guardrails: Guardrail[];
  violations: Violation[];
  isEnabled: boolean;
  resourceUsage: ResourceLimits;
  
  // Actions
  checkGuardrail: (operation: string, context?: Partial<GuardrailContext>) => Promise<GuardrailResult>;
  enforceLimit: (resource: keyof ResourceLimits, currentValue: number) => GuardrailResult;
  
  // Management
  setGuardrails: (guardrails: Guardrail[]) => void;
  addGuardrail: (guardrail: Guardrail) => void;
  removeGuardrail: (guardrailId: string) => void;
  enableGuardrail: (guardrailId: string) => void;
  disableGuardrail: (guardrailId: string) => void;
  
  // Violations
  clearViolations: () => void;
  resolveViolation: (violationId: string) => void;
  getViolationsByType: (type: GuardrailType) => Violation[];
  
  // Configuration
  setEnabled: (enabled: boolean) => void;
  setResourceLimits: (limits: Partial<ResourceLimits>) => void;
}

// Default resource limits
const DEFAULT_RESOURCE_LIMITS: ResourceLimits = {
  maxMemoryMB: 512,
  maxCpuPercent: 80,
  maxRequestsPerMinute: 60,
  maxConcurrentOperations: 10,
  maxTokensPerRequest: 8192,
  maxResponseSizeKB: 1024,
};

// Generate ID
const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Default guardrails
const createDefaultGuardrails = (): Guardrail[] => [
  {
    id: 'memory-limit',
    name: 'Memory Limit',
    type: 'resource',
    condition: (ctx) => {
      const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;
      const limitBytes = DEFAULT_RESOURCE_LIMITS.maxMemoryMB * 1024 * 1024;
      return memoryUsage > limitBytes;
    },
    action: 'warn',
    message: 'Memory usage exceeds limit',
    severity: 'medium',
    enabled: true,
  },
  {
    id: 'rate-limit',
    name: 'Rate Limit',
    type: 'rate',
    condition: () => false, // Implemented separately
    action: 'throttle',
    message: 'Request rate exceeded',
    severity: 'low',
    enabled: true,
  },
  {
    id: 'dangerous-code',
    name: 'Dangerous Code Detection',
    type: 'security',
    condition: (ctx) => {
      const dangerousPatterns = [
        /eval\s*\(/,
        /Function\s*\(/,
        /__proto__/,
        /child_process/,
        /require\s*\(\s*['"]fs['"]\s*\)/,
      ];
      const code = ctx.metadata?.code as string || '';
      return dangerousPatterns.some(p => p.test(code));
    },
    action: 'block',
    message: 'Dangerous code pattern detected',
    severity: 'critical',
    enabled: true,
  },
  {
    id: 'large-request',
    name: 'Large Request Detection',
    type: 'resource',
    condition: (ctx) => {
      const tokens = ctx.metadata?.tokens as number || 0;
      return tokens > DEFAULT_RESOURCE_LIMITS.maxTokensPerRequest;
    },
    action: 'warn',
    message: 'Request exceeds token limit',
    severity: 'medium',
    enabled: true,
  },
  {
    id: 'sensitive-data',
    name: 'Sensitive Data Detection',
    type: 'compliance',
    condition: (ctx) => {
      const sensitivePatterns = [
        /\b\d{16}\b/, // Credit card
        /\b\d{3}-\d{2}-\d{4}\b/, // SSN
        /password\s*[:=]/i,
        /api[_-]?key\s*[:=]/i,
        /secret\s*[:=]/i,
      ];
      const content = ctx.metadata?.content as string || '';
      return sensitivePatterns.some(p => p.test(content));
    },
    action: 'block',
    message: 'Sensitive data detected in request',
    severity: 'high',
    enabled: true,
  },
];

/**
 * useRuntimeGuardrails hook
 */
export function useRuntimeGuardrails(): UseRuntimeGuardrailsReturn {
  // State
  const [guardrails, setGuardrailsState] = useState<Guardrail[]>(createDefaultGuardrails);
  const [violations, setViolations] = useState<Violation[]>([]);
  const [isEnabled, setIsEnabled] = useState(true);
  const [resourceLimits, setResourceLimitsState] = useState<ResourceLimits>(DEFAULT_RESOURCE_LIMITS);

  // Rate limiting state
  const requestTimestampsRef = useRef<number[]>([]);
  const concurrentOperationsRef = useRef(0);

  // Check rate limit
  const checkRateLimit = useCallback((): { exceeded: boolean; waitTime: number } => {
    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window
    
    // Clean old timestamps
    requestTimestampsRef.current = requestTimestampsRef.current.filter(
      ts => ts > windowStart
    );

    const currentCount = requestTimestampsRef.current.length;
    
    if (currentCount >= resourceLimits.maxRequestsPerMinute) {
      const oldestTimestamp = requestTimestampsRef.current[0];
      const waitTime = oldestTimestamp + 60000 - now;
      return { exceeded: true, waitTime: Math.max(0, waitTime) };
    }

    requestTimestampsRef.current.push(now);
    return { exceeded: false, waitTime: 0 };
  }, [resourceLimits.maxRequestsPerMinute]);

  // Check concurrent operations
  const checkConcurrentLimit = useCallback((): boolean => {
    return concurrentOperationsRef.current >= resourceLimits.maxConcurrentOperations;
  }, [resourceLimits.maxConcurrentOperations]);

  // Create violation
  const createViolation = useCallback((
    guardrail: Guardrail,
    context: GuardrailContext
  ): Violation => ({
    id: generateId(),
    guardrailId: guardrail.id,
    guardrailName: guardrail.name,
    timestamp: Date.now(),
    context,
    severity: guardrail.severity,
    action: guardrail.action,
    message: guardrail.message,
    resolved: false,
  }), []);

  // Check guardrail
  const checkGuardrail = useCallback(async (
    operation: string,
    contextOverrides?: Partial<GuardrailContext>
  ): Promise<GuardrailResult> => {
    if (!isEnabled) {
      return { allowed: true, violations: [], warnings: [], throttled: false };
    }

    const context: GuardrailContext = {
      operation,
      timestamp: Date.now(),
      ...contextOverrides,
    };

    const result: GuardrailResult = {
      allowed: true,
      violations: [],
      warnings: [],
      throttled: false,
    };

    // Check rate limit
    const rateCheck = checkRateLimit();
    if (rateCheck.exceeded) {
      result.throttled = true;
      result.throttleDelay = rateCheck.waitTime;
      result.warnings.push(`Rate limit exceeded. Wait ${Math.ceil(rateCheck.waitTime / 1000)}s`);
    }

    // Check concurrent operations
    if (checkConcurrentLimit()) {
      result.warnings.push('Maximum concurrent operations reached');
    }

    // Check all enabled guardrails
    for (const guardrail of guardrails) {
      if (!guardrail.enabled) continue;

      try {
        const triggered = await guardrail.condition(context);
        
        if (triggered) {
          const violation = createViolation(guardrail, context);
          result.violations.push(violation);
          setViolations(prev => [...prev.slice(-99), violation]);

          switch (guardrail.action) {
            case 'block':
              result.allowed = false;
              break;
            case 'warn':
              result.warnings.push(guardrail.message);
              break;
            case 'throttle':
              result.throttled = true;
              result.throttleDelay = 1000;
              break;
            case 'log':
              console.warn(`[Guardrail] ${guardrail.name}: ${guardrail.message}`);
              break;
          }
        }
      } catch (error) {
        console.error(`[Guardrail] Error checking ${guardrail.id}:`, error);
      }
    }

    return result;
  }, [isEnabled, guardrails, checkRateLimit, checkConcurrentLimit, createViolation]);

  // Enforce resource limit
  const enforceLimit = useCallback((
    resource: keyof ResourceLimits,
    currentValue: number
  ): GuardrailResult => {
    const limit = resourceLimits[resource];
    const exceeded = currentValue > limit;

    if (exceeded) {
      const violation: Violation = {
        id: generateId(),
        guardrailId: `limit-${resource}`,
        guardrailName: `${resource} limit`,
        timestamp: Date.now(),
        context: {
          operation: 'resource-check',
          timestamp: Date.now(),
          metadata: { resource, currentValue, limit },
        },
        severity: 'medium',
        action: 'warn',
        message: `${resource} exceeded: ${currentValue} > ${limit}`,
        resolved: false,
      };

      setViolations(prev => [...prev.slice(-99), violation]);

      return {
        allowed: false,
        violations: [violation],
        warnings: [violation.message],
        throttled: false,
      };
    }

    return { allowed: true, violations: [], warnings: [], throttled: false };
  }, [resourceLimits]);

  // Management functions
  const setGuardrails = useCallback((newGuardrails: Guardrail[]) => {
    setGuardrailsState(newGuardrails);
  }, []);

  const addGuardrail = useCallback((guardrail: Guardrail) => {
    setGuardrailsState(prev => [...prev, guardrail]);
  }, []);

  const removeGuardrail = useCallback((guardrailId: string) => {
    setGuardrailsState(prev => prev.filter(g => g.id !== guardrailId));
  }, []);

  const enableGuardrail = useCallback((guardrailId: string) => {
    setGuardrailsState(prev =>
      prev.map(g => g.id === guardrailId ? { ...g, enabled: true } : g)
    );
  }, []);

  const disableGuardrail = useCallback((guardrailId: string) => {
    setGuardrailsState(prev =>
      prev.map(g => g.id === guardrailId ? { ...g, enabled: false } : g)
    );
  }, []);

  // Violation management
  const clearViolations = useCallback(() => {
    setViolations([]);
  }, []);

  const resolveViolation = useCallback((violationId: string) => {
    setViolations(prev =>
      prev.map(v => v.id === violationId ? { ...v, resolved: true } : v)
    );
  }, []);

  const getViolationsByType = useCallback((type: GuardrailType): Violation[] => {
    return violations.filter(v => {
      const guardrail = guardrails.find(g => g.id === v.guardrailId);
      return guardrail?.type === type;
    });
  }, [violations, guardrails]);

  // Configuration
  const setEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
  }, []);

  const setResourceLimits = useCallback((limits: Partial<ResourceLimits>) => {
    setResourceLimitsState(prev => ({ ...prev, ...limits }));
  }, []);

  return {
    guardrails,
    violations,
    isEnabled,
    resourceUsage: resourceLimits,
    checkGuardrail,
    enforceLimit,
    setGuardrails,
    addGuardrail,
    removeGuardrail,
    enableGuardrail,
    disableGuardrail,
    clearViolations,
    resolveViolation,
    getViolationsByType,
    setEnabled,
    setResourceLimits,
  };
}

export default useRuntimeGuardrails;
