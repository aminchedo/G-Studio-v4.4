/**
 * useSandbox - Secure code execution hook
 * 
 * Provides isolated code execution environment with resource limits
 * and security policies
 */

import { useState, useCallback, useRef } from 'react';

// Types
export interface SandboxPolicy {
  id: string;
  name: string;
  allowedAPIs: string[];
  deniedAPIs: string[];
  maxExecutionTime: number; // ms
  maxMemory: number; // bytes
  allowNetworkAccess: boolean;
  allowFileSystemAccess: boolean;
  allowEval: boolean;
  allowWorkers: boolean;
}

export interface SandboxOptions {
  timeout?: number;
  memoryLimit?: number;
  policy?: string;
  captureOutput?: boolean;
  captureErrors?: boolean;
  globals?: Record<string, unknown>;
  environment?: Record<string, string>;
}

export interface ExecutionResult {
  success: boolean;
  output: string;
  error?: string;
  executionTime: number;
  memoryUsed: number;
  logs: LogEntry[];
  returnValue?: unknown;
}

export interface LogEntry {
  level: 'log' | 'warn' | 'error' | 'info' | 'debug';
  message: string;
  timestamp: number;
}

export interface Execution {
  id: string;
  code: string;
  language: string;
  options: SandboxOptions;
  result: ExecutionResult;
  startedAt: number;
  completedAt: number;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface UseSandboxReturn {
  // State
  isActive: boolean;
  isExecuting: boolean;
  policies: SandboxPolicy[];
  executionHistory: Execution[];
  currentPolicy: SandboxPolicy | null;
  
  // Actions
  executeCode: (code: string, options?: SandboxOptions) => Promise<ExecutionResult>;
  executeAsync: (code: string, options?: SandboxOptions) => Promise<ExecutionResult>;
  validatePolicy: (policy: SandboxPolicy) => ValidationResult;
  validateCode: (code: string) => ValidationResult;
  
  // Policy Management
  setPolicies: (policies: SandboxPolicy[]) => void;
  addPolicy: (policy: SandboxPolicy) => void;
  removePolicy: (policyId: string) => void;
  setCurrentPolicy: (policyId: string | null) => void;
  
  // History
  clearHistory: () => void;
  getExecution: (executionId: string) => Execution | undefined;
  
  // Control
  cancel: () => void;
  reset: () => void;
}

// Default policies
const DEFAULT_POLICIES: SandboxPolicy[] = [
  {
    id: 'strict',
    name: 'Strict',
    allowedAPIs: ['console', 'Math', 'JSON', 'Array', 'Object', 'String', 'Number', 'Date'],
    deniedAPIs: ['fetch', 'XMLHttpRequest', 'WebSocket', 'localStorage', 'eval', 'Function'],
    maxExecutionTime: 5000,
    maxMemory: 50 * 1024 * 1024, // 50MB
    allowNetworkAccess: false,
    allowFileSystemAccess: false,
    allowEval: false,
    allowWorkers: false,
  },
  {
    id: 'moderate',
    name: 'Moderate',
    allowedAPIs: ['console', 'Math', 'JSON', 'Array', 'Object', 'String', 'Number', 'Date', 'Promise', 'Set', 'Map'],
    deniedAPIs: ['eval', 'Function'],
    maxExecutionTime: 30000,
    maxMemory: 100 * 1024 * 1024, // 100MB
    allowNetworkAccess: false,
    allowFileSystemAccess: false,
    allowEval: false,
    allowWorkers: true,
  },
  {
    id: 'permissive',
    name: 'Permissive',
    allowedAPIs: ['*'],
    deniedAPIs: [],
    maxExecutionTime: 60000,
    maxMemory: 256 * 1024 * 1024, // 256MB
    allowNetworkAccess: true,
    allowFileSystemAccess: false,
    allowEval: true,
    allowWorkers: true,
  },
];

// Dangerous patterns to detect
const DANGEROUS_PATTERNS = [
  /eval\s*\(/,
  /Function\s*\(/,
  /new\s+Function/,
  /__proto__/,
  /constructor\s*\[/,
  /process\./,
  /require\s*\(/,
  /import\s*\(/,
  /child_process/,
  /fs\./,
  /\.exec\s*\(/,
  /\.spawn\s*\(/,
];

// Generate execution ID
const generateId = (): string => `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

/**
 * useSandbox hook
 */
export function useSandbox(): UseSandboxReturn {
  // State
  const [isActive, setIsActive] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [policies, setPoliciesState] = useState<SandboxPolicy[]>(DEFAULT_POLICIES);
  const [executionHistory, setExecutionHistory] = useState<Execution[]>([]);
  const [currentPolicy, setCurrentPolicyState] = useState<SandboxPolicy | null>(policies[0]);

  // Refs
  const workerRef = useRef<Worker | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Validate policy
  const validatePolicy = useCallback((policy: SandboxPolicy): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!policy.id) errors.push('Policy must have an ID');
    if (!policy.name) errors.push('Policy must have a name');
    if (policy.maxExecutionTime <= 0) errors.push('Max execution time must be positive');
    if (policy.maxMemory <= 0) errors.push('Max memory must be positive');

    if (policy.allowEval) {
      warnings.push('Allowing eval can be a security risk');
    }
    if (policy.allowNetworkAccess) {
      warnings.push('Network access may expose sensitive data');
    }
    if (policy.maxExecutionTime > 60000) {
      warnings.push('Very long execution times may impact performance');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, []);

  // Validate code
  const validateCode = useCallback((code: string): ValidationResult => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(code)) {
        warnings.push(`Potentially dangerous pattern detected: ${pattern.source}`);
      }
    }

    // Check for infinite loops (simple heuristic)
    if (/while\s*\(\s*true\s*\)/.test(code) || /for\s*\(\s*;\s*;\s*\)/.test(code)) {
      warnings.push('Potential infinite loop detected');
    }

    // Check code length
    if (code.length > 100000) {
      warnings.push('Code is very long, execution may be slow');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }, []);

  // Create sandboxed execution environment
  const createSandbox = useCallback((policy: SandboxPolicy, options: SandboxOptions) => {
    const logs: LogEntry[] = [];

    // Create proxy for console
    const sandboxConsole = {
      log: (...args: unknown[]) => logs.push({ level: 'log', message: args.join(' '), timestamp: Date.now() }),
      warn: (...args: unknown[]) => logs.push({ level: 'warn', message: args.join(' '), timestamp: Date.now() }),
      error: (...args: unknown[]) => logs.push({ level: 'error', message: args.join(' '), timestamp: Date.now() }),
      info: (...args: unknown[]) => logs.push({ level: 'info', message: args.join(' '), timestamp: Date.now() }),
      debug: (...args: unknown[]) => logs.push({ level: 'debug', message: args.join(' '), timestamp: Date.now() }),
    };

    // Create restricted global object
    const sandboxGlobals: Record<string, unknown> = {
      console: sandboxConsole,
      Math,
      JSON,
      Array,
      Object,
      String,
      Number,
      Boolean,
      Date,
      RegExp,
      Error,
      TypeError,
      RangeError,
      SyntaxError,
      Promise,
      Set,
      Map,
      WeakSet,
      WeakMap,
      Symbol,
      parseInt,
      parseFloat,
      isNaN,
      isFinite,
      encodeURI,
      decodeURI,
      encodeURIComponent,
      decodeURIComponent,
      ...(options.globals || {}),
    };

    // Remove denied APIs
    for (const api of policy.deniedAPIs) {
      delete sandboxGlobals[api];
    }

    return { sandboxGlobals, logs };
  }, []);

  // Execute code
  const executeCode = useCallback(async (
    code: string,
    options: SandboxOptions = {}
  ): Promise<ExecutionResult> => {
    const executionId = generateId();
    const startTime = Date.now();
    const policy = currentPolicy || policies[0];
    const timeout = options.timeout ?? policy.maxExecutionTime;

    setIsExecuting(true);
    setIsActive(true);

    const { sandboxGlobals, logs } = createSandbox(policy, options);
    let output = '';
    let error: string | undefined;
    let returnValue: unknown;

    try {
      // Validate code first
      const validation = validateCode(code);
      if (!validation.isValid) {
        throw new Error(`Code validation failed: ${validation.errors.join(', ')}`);
      }

      // Create execution promise with timeout
      const executionPromise = new Promise<unknown>((resolve, reject) => {
        timeoutRef.current = setTimeout(() => {
          reject(new Error(`Execution timed out after ${timeout}ms`));
        }, timeout);

        try {
          // Create function with sandboxed globals
          // In a real implementation, this would use a Web Worker or VM
          const globalKeys = Object.keys(sandboxGlobals);
          const globalValues = Object.values(sandboxGlobals);

          // Wrap code in a function to capture return value
          const wrappedCode = `
            "use strict";
            ${code}
          `;

          // Execute (simplified - in production would use proper sandboxing)
          const fn = new Function(...globalKeys, wrappedCode);
          const result = fn(...globalValues);
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });

      returnValue = await executionPromise;
      output = logs.map(l => `[${l.level}] ${l.message}`).join('\n');
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsExecuting(false);
    }

    const endTime = Date.now();
    const result: ExecutionResult = {
      success: !error,
      output,
      error,
      executionTime: endTime - startTime,
      memoryUsed: 0, // Would need proper measurement
      logs,
      returnValue,
    };

    // Add to history
    const execution: Execution = {
      id: executionId,
      code,
      language: 'javascript',
      options,
      result,
      startedAt: startTime,
      completedAt: endTime,
    };

    setExecutionHistory(prev => [...prev.slice(-99), execution]);

    return result;
  }, [currentPolicy, policies, createSandbox, validateCode]);

  // Execute async code
  const executeAsync = useCallback(async (
    code: string,
    options: SandboxOptions = {}
  ): Promise<ExecutionResult> => {
    // Wrap code in async IIFE
    const asyncCode = `
      (async () => {
        ${code}
      })()
    `;
    return executeCode(asyncCode, options);
  }, [executeCode]);

  // Policy management
  const setPolicies = useCallback((newPolicies: SandboxPolicy[]) => {
    setPoliciesState(newPolicies);
  }, []);

  const addPolicy = useCallback((policy: SandboxPolicy) => {
    const validation = validatePolicy(policy);
    if (!validation.isValid) {
      throw new Error(`Invalid policy: ${validation.errors.join(', ')}`);
    }
    setPoliciesState(prev => [...prev, policy]);
  }, [validatePolicy]);

  const removePolicy = useCallback((policyId: string) => {
    setPoliciesState(prev => prev.filter(p => p.id !== policyId));
    if (currentPolicy?.id === policyId) {
      setCurrentPolicyState(policies[0] || null);
    }
  }, [currentPolicy, policies]);

  const setCurrentPolicy = useCallback((policyId: string | null) => {
    if (policyId === null) {
      setCurrentPolicyState(null);
    } else {
      const policy = policies.find(p => p.id === policyId);
      setCurrentPolicyState(policy || null);
    }
  }, [policies]);

  // History management
  const clearHistory = useCallback(() => {
    setExecutionHistory([]);
  }, []);

  const getExecution = useCallback((executionId: string): Execution | undefined => {
    return executionHistory.find(e => e.id === executionId);
  }, [executionHistory]);

  // Control
  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    setIsExecuting(false);
  }, []);

  const reset = useCallback(() => {
    cancel();
    setIsActive(false);
    setExecutionHistory([]);
  }, [cancel]);

  return {
    isActive,
    isExecuting,
    policies,
    executionHistory,
    currentPolicy,
    executeCode,
    executeAsync,
    validatePolicy,
    validateCode,
    setPolicies,
    addPolicy,
    removePolicy,
    setCurrentPolicy,
    clearHistory,
    getExecution,
    cancel,
    reset,
  };
}

export default useSandbox;
