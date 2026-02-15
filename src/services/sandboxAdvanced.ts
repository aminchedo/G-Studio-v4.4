/**
 * SandboxAdvanced - Advanced Sandbox Features
 * 
 * Purpose: Extended sandbox capabilities for Phase 7B
 * - Network isolation and monitoring
 * - Memory usage tracking
 * - Call stack depth protection
 * - Resource quotas
 * - Audit logging
 * - Sandbox profiles
 * 
 * Phase 7B: Advanced Sandbox Features
 */

import { ErrorHandler, ErrorCode } from './errorHandler';
import { TelemetryService } from './telemetryService';
import { SandboxMode, Capability } from './sandboxManager';

// ==================== TYPES ====================

export interface NetworkPolicy {
  allowedDomains: string[];
  blockedDomains: string[];
  maxRequestsPerMinute: number;
  maxResponseSize: number; // bytes
  timeout: number; // ms
}

export interface MemoryLimits {
  maxHeapSize: number; // bytes
  maxArrayLength: number;
  maxStringLength: number;
  maxObjectDepth: number;
}

export interface ResourceQuota {
  maxCpuTime: number; // ms
  maxDiskSpace: number; // bytes
  maxFileSize: number; // bytes
  maxApiCalls: number;
  maxConcurrentOperations: number;
}

export interface CallStackLimits {
  maxDepth: number;
  maxRecursion: number;
  trackingEnabled: boolean;
}

export interface AuditLogEntry {
  id: string;
  timestamp: number;
  tool: string;
  user?: string;
  action: string;
  result: 'success' | 'failure' | 'blocked';
  reason?: string;
  metadata?: Record<string, any>;
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export interface SandboxProfile {
  name: string;
  description: string;
  mode: SandboxMode;
  capabilities: Capability[];
  networkPolicy: NetworkPolicy;
  memoryLimits: MemoryLimits;
  resourceQuota: ResourceQuota;
  callStackLimits: CallStackLimits;
  auditEnabled: boolean;
}

// ==================== NETWORK MONITOR ====================

export class NetworkMonitor {
  private static requestLog: Array<{
    url: string;
    timestamp: number;
    allowed: boolean;
    reason?: string;
  }> = [];
  
  private static requestCounts = new Map<string, number[]>();
  private static maxLogSize = 1000;

  /**
   * Check if network request is allowed
   */
  static isRequestAllowed(
    url: string,
    policy: NetworkPolicy
  ): { allowed: boolean; reason?: string } {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      // Check blocked domains first
      if (policy.blockedDomains.some(blocked => domain.includes(blocked))) {
        this.logRequest(url, false, 'Domain is blocked');
        return { allowed: false, reason: 'Domain is blocked' };
      }

      // Check allowed domains
      if (policy.allowedDomains.length > 0) {
        const isAllowed = policy.allowedDomains.some(allowed => 
          domain.includes(allowed) || allowed === '*'
        );
        
        if (!isAllowed) {
          this.logRequest(url, false, 'Domain not in allowlist');
          return { allowed: false, reason: 'Domain not in allowlist' };
        }
      }

      // Check rate limit
      const now = Date.now();
      const recentRequests = this.getRecentRequests(domain, now - 60000); // Last minute
      
      if (recentRequests >= policy.maxRequestsPerMinute) {
        this.logRequest(url, false, 'Rate limit exceeded');
        return { allowed: false, reason: 'Rate limit exceeded' };
      }

      // Track request
      this.trackRequest(domain, now);
      this.logRequest(url, true);
      
      return { allowed: true };

    } catch (error) {
      this.logRequest(url, false, 'Invalid URL');
      return { allowed: false, reason: 'Invalid URL' };
    }
  }

  /**
   * Validate response size
   */
  static isResponseSizeAllowed(
    size: number,
    policy: NetworkPolicy
  ): { allowed: boolean; reason?: string } {
    if (size > policy.maxResponseSize) {
      return {
        allowed: false,
        reason: `Response size ${size} exceeds limit ${policy.maxResponseSize}`,
      };
    }
    return { allowed: true };
  }

  private static trackRequest(domain: string, timestamp: number): void {
    if (!this.requestCounts.has(domain)) {
      this.requestCounts.set(domain, []);
    }
    this.requestCounts.get(domain)!.push(timestamp);
  }

  private static getRecentRequests(domain: string, since: number): number {
    const requests = this.requestCounts.get(domain) || [];
    return requests.filter(ts => ts >= since).length;
  }

  private static logRequest(url: string, allowed: boolean, reason?: string): void {
    this.requestLog.push({ url, timestamp: Date.now(), allowed, reason });
    
    if (this.requestLog.length > this.maxLogSize) {
      this.requestLog.shift();
    }
  }

  static getRequestLog(count: number = 100): typeof NetworkMonitor.requestLog {
    return this.requestLog.slice(-count);
  }

  static clearLog(): void {
    this.requestLog = [];
    this.requestCounts.clear();
  }

  static getStats(): {
    totalRequests: number;
    allowedRequests: number;
    blockedRequests: number;
    byDomain: Record<string, number>;
  } {
    const byDomain: Record<string, number> = {};
    
    for (const [domain, requests] of this.requestCounts.entries()) {
      byDomain[domain] = requests.length;
    }

    return {
      totalRequests: this.requestLog.length,
      allowedRequests: this.requestLog.filter(r => r.allowed).length,
      blockedRequests: this.requestLog.filter(r => !r.allowed).length,
      byDomain,
    };
  }
}

// ==================== MEMORY TRACKER ====================

export class MemoryTracker {
  private static measurements: Array<{
    timestamp: number;
    heapUsed: number;
    heapTotal: number;
    external: number;
  }> = [];
  
  private static maxMeasurements = 1000;

  /**
   * Check if value exceeds memory limits
   */
  static checkLimits(
    value: any,
    limits: MemoryLimits
  ): { allowed: boolean; reason?: string; violations: string[] } {
    const violations: string[] = [];

    // Check array length
    if (Array.isArray(value) && value.length > limits.maxArrayLength) {
      violations.push(`Array length ${value.length} exceeds limit ${limits.maxArrayLength}`);
    }

    // Check string length
    if (typeof value === 'string' && value.length > limits.maxStringLength) {
      violations.push(`String length ${value.length} exceeds limit ${limits.maxStringLength}`);
    }

    // Check object depth
    if (typeof value === 'object' && value !== null) {
      const depth = this.getObjectDepth(value);
      if (depth > limits.maxObjectDepth) {
        violations.push(`Object depth ${depth} exceeds limit ${limits.maxObjectDepth}`);
      }
    }

    return {
      allowed: violations.length === 0,
      reason: violations.length > 0 ? violations[0] : undefined,
      violations,
    };
  }

  /**
   * Measure current memory usage
   */
  static measureMemory(): {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  } {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      
      this.measurements.push({
        timestamp: Date.now(),
        heapUsed: usage.heapUsed,
        heapTotal: usage.heapTotal,
        external: usage.external,
      });

      if (this.measurements.length > this.maxMeasurements) {
        this.measurements.shift();
      }

      return usage;
    }

    // Browser environment - estimate
    return {
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      rss: 0,
    };
  }

  /**
   * Check if heap size exceeds limit
   */
  static isHeapSizeAllowed(
    limits: MemoryLimits
  ): { allowed: boolean; reason?: string } {
    const memory = this.measureMemory();
    
    if (memory.heapUsed > limits.maxHeapSize) {
      return {
        allowed: false,
        reason: `Heap size ${memory.heapUsed} exceeds limit ${limits.maxHeapSize}`,
      };
    }

    return { allowed: true };
  }

  private static getObjectDepth(obj: any, depth: number = 0): number {
    if (depth > 100) return depth; // Prevent infinite recursion
    if (typeof obj !== 'object' || obj === null) return depth;

    let maxDepth = depth;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const childDepth = this.getObjectDepth(obj[key], depth + 1);
        maxDepth = Math.max(maxDepth, childDepth);
      }
    }

    return maxDepth;
  }

  static getStats(): {
    currentHeapUsed: number;
    currentHeapTotal: number;
    peakHeapUsed: number;
    averageHeapUsed: number;
  } {
    const current = this.measureMemory();
    const peakHeapUsed = Math.max(...this.measurements.map(m => m.heapUsed), 0);
    const averageHeapUsed = this.measurements.length > 0
      ? this.measurements.reduce((sum, m) => sum + m.heapUsed, 0) / this.measurements.length
      : 0;

    return {
      currentHeapUsed: current.heapUsed,
      currentHeapTotal: current.heapTotal,
      peakHeapUsed,
      averageHeapUsed,
    };
  }

  static clearMeasurements(): void {
    this.measurements = [];
  }
}

// ==================== CALL STACK MONITOR ====================

export class CallStackMonitor {
  private static callStacks = new Map<string, string[]>();
  private static recursionCounts = new Map<string, number>();

  /**
   * Track function call
   */
  static enterFunction(executionId: string, functionName: string): void {
    if (!this.callStacks.has(executionId)) {
      this.callStacks.set(executionId, []);
    }
    this.callStacks.get(executionId)!.push(functionName);

    // Track recursion
    const stack = this.callStacks.get(executionId)!;
    const recursionCount = stack.filter(f => f === functionName).length;
    this.recursionCounts.set(`${executionId}:${functionName}`, recursionCount);
  }

  /**
   * Exit function call
   */
  static exitFunction(executionId: string): void {
    const stack = this.callStacks.get(executionId);
    if (stack && stack.length > 0) {
      stack.pop();
    }
  }

  /**
   * Check if call stack exceeds limits
   */
  static checkLimits(
    executionId: string,
    limits: CallStackLimits
  ): { allowed: boolean; reason?: string } {
    if (!limits.trackingEnabled) {
      return { allowed: true };
    }

    const stack = this.callStacks.get(executionId) || [];

    // Check stack depth
    if (stack.length > limits.maxDepth) {
      return {
        allowed: false,
        reason: `Call stack depth ${stack.length} exceeds limit ${limits.maxDepth}`,
      };
    }

    // Check recursion depth
    for (const [key, count] of this.recursionCounts.entries()) {
      if (key.startsWith(executionId) && count > limits.maxRecursion) {
        const functionName = key.split(':')[1];
        return {
          allowed: false,
          reason: `Recursion depth ${count} for ${functionName} exceeds limit ${limits.maxRecursion}`,
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Clear execution tracking
   */
  static clearExecution(executionId: string): void {
    this.callStacks.delete(executionId);
    
    // Clear recursion counts for this execution
    for (const key of this.recursionCounts.keys()) {
      if (key.startsWith(executionId)) {
        this.recursionCounts.delete(key);
      }
    }
  }

  static getStats(): {
    activeExecutions: number;
    maxStackDepth: number;
    maxRecursionDepth: number;
  } {
    const maxStackDepth = Math.max(
      ...[...this.callStacks.values()].map(stack => stack.length),
      0
    );
    const maxRecursionDepth = Math.max(...this.recursionCounts.values(), 0);

    return {
      activeExecutions: this.callStacks.size,
      maxStackDepth,
      maxRecursionDepth,
    };
  }
}

// ==================== RESOURCE QUOTA MANAGER ====================

export class ResourceQuotaManager {
  private static quotas = new Map<string, {
    cpuTime: number;
    diskSpace: number;
    apiCalls: number;
    concurrentOps: number;
    startTime: number;
  }>();

  /**
   * Initialize quota for execution
   */
  static initializeQuota(executionId: string, quota: ResourceQuota): void {
    this.quotas.set(executionId, {
      cpuTime: 0,
      diskSpace: 0,
      apiCalls: 0,
      concurrentOps: 0,
      startTime: Date.now(),
    });
  }

  /**
   * Track CPU time
   */
  static trackCpuTime(executionId: string, duration: number): void {
    const quota = this.quotas.get(executionId);
    if (quota) {
      quota.cpuTime += duration;
    }
  }

  /**
   * Track disk space
   */
  static trackDiskSpace(executionId: string, bytes: number): void {
    const quota = this.quotas.get(executionId);
    if (quota) {
      quota.diskSpace += bytes;
    }
  }

  /**
   * Track API call
   */
  static trackApiCall(executionId: string): void {
    const quota = this.quotas.get(executionId);
    if (quota) {
      quota.apiCalls++;
    }
  }

  /**
   * Track concurrent operation
   */
  static trackConcurrentOp(executionId: string, increment: boolean): void {
    const quota = this.quotas.get(executionId);
    if (quota) {
      quota.concurrentOps += increment ? 1 : -1;
    }
  }

  /**
   * Check if quota is exceeded
   */
  static checkQuota(
    executionId: string,
    limits: ResourceQuota
  ): { allowed: boolean; reason?: string; violations: string[] } {
    const quota = this.quotas.get(executionId);
    if (!quota) {
      return { allowed: true, violations: [] };
    }

    const violations: string[] = [];

    if (quota.cpuTime > limits.maxCpuTime) {
      violations.push(`CPU time ${quota.cpuTime}ms exceeds limit ${limits.maxCpuTime}ms`);
    }

    if (quota.diskSpace > limits.maxDiskSpace) {
      violations.push(`Disk space ${quota.diskSpace} bytes exceeds limit ${limits.maxDiskSpace} bytes`);
    }

    if (quota.apiCalls > limits.maxApiCalls) {
      violations.push(`API calls ${quota.apiCalls} exceeds limit ${limits.maxApiCalls}`);
    }

    if (quota.concurrentOps > limits.maxConcurrentOperations) {
      violations.push(`Concurrent operations ${quota.concurrentOps} exceeds limit ${limits.maxConcurrentOperations}`);
    }

    return {
      allowed: violations.length === 0,
      reason: violations.length > 0 ? violations[0] : undefined,
      violations,
    };
  }

  /**
   * Clear quota tracking
   */
  static clearQuota(executionId: string): void {
    this.quotas.delete(executionId);
  }

  static getStats(): {
    activeQuotas: number;
    totalCpuTime: number;
    totalDiskSpace: number;
    totalApiCalls: number;
  } {
    let totalCpuTime = 0;
    let totalDiskSpace = 0;
    let totalApiCalls = 0;

    for (const quota of this.quotas.values()) {
      totalCpuTime += quota.cpuTime;
      totalDiskSpace += quota.diskSpace;
      totalApiCalls += quota.apiCalls;
    }

    return {
      activeQuotas: this.quotas.size,
      totalCpuTime,
      totalDiskSpace,
      totalApiCalls,
    };
  }
}

// ==================== AUDIT LOGGER ====================

export class AuditLogger {
  private static logs: AuditLogEntry[] = [];
  private static maxLogs = 10000;
  private static enabled = true;

  /**
   * Log audit entry
   */
  static log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
    if (!this.enabled) return;

    const fullEntry: AuditLogEntry = {
      ...entry,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    this.logs.push(fullEntry);

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Record in telemetry
    TelemetryService.recordEvent('audit_log', {
      tool: entry.tool,
      action: entry.action,
      result: entry.result,
      severity: entry.severity,
    });
  }

  /**
   * Get audit logs
   */
  static getLogs(filter?: {
    tool?: string;
    user?: string;
    result?: AuditLogEntry['result'];
    severity?: AuditLogEntry['severity'];
    since?: number;
    limit?: number;
  }): AuditLogEntry[] {
    let filtered = [...this.logs];

    if (filter) {
      if (filter.tool) {
        filtered = filtered.filter(log => log.tool === filter.tool);
      }
      if (filter.user) {
        filtered = filtered.filter(log => log.user === filter.user);
      }
      if (filter.result) {
        filtered = filtered.filter(log => log.result === filter.result);
      }
      if (filter.severity) {
        filtered = filtered.filter(log => log.severity === filter.severity);
      }
      if (filter.since) {
        filtered = filtered.filter(log => log.timestamp >= filter.since);
      }
      if (filter.limit) {
        filtered = filtered.slice(-filter.limit);
      }
    }

    return filtered;
  }

  /**
   * Get audit statistics
   */
  static getStats(): {
    totalLogs: number;
    byResult: Record<string, number>;
    bySeverity: Record<string, number>;
    byTool: Record<string, number>;
  } {
    const byResult: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};
    const byTool: Record<string, number> = {};

    for (const log of this.logs) {
      byResult[log.result] = (byResult[log.result] || 0) + 1;
      bySeverity[log.severity] = (bySeverity[log.severity] || 0) + 1;
      byTool[log.tool] = (byTool[log.tool] || 0) + 1;
    }

    return {
      totalLogs: this.logs.length,
      byResult,
      bySeverity,
      byTool,
    };
  }

  /**
   * Clear audit logs
   */
  static clearLogs(): void {
    this.logs = [];
  }

  /**
   * Enable/disable audit logging
   */
  static setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  private static generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

// ==================== SANDBOX PROFILES ====================

export class SandboxProfiles {
  private static profiles = new Map<string, SandboxProfile>();

  /**
   * Initialize default profiles
   */
  static initializeDefaults(): void {
    // Strict profile - maximum security
    this.profiles.set('strict', {
      name: 'strict',
      description: 'Maximum security - read-only operations',
      mode: SandboxMode.STRICT,
      capabilities: [Capability.FS_READ, Capability.STATE_READ],
      networkPolicy: {
        allowedDomains: [],
        blockedDomains: ['*'],
        maxRequestsPerMinute: 0,
        maxResponseSize: 0,
        timeout: 0,
      },
      memoryLimits: {
        maxHeapSize: 50 * 1024 * 1024, // 50MB
        maxArrayLength: 10000,
        maxStringLength: 100000,
        maxObjectDepth: 10,
      },
      resourceQuota: {
        maxCpuTime: 5000,
        maxDiskSpace: 0,
        maxFileSize: 0,
        maxApiCalls: 0,
        maxConcurrentOperations: 1,
      },
      callStackLimits: {
        maxDepth: 50,
        maxRecursion: 10,
        trackingEnabled: true,
      },
      auditEnabled: true,
    });

    // Controlled profile - balanced security
    this.profiles.set('controlled', {
      name: 'controlled',
      description: 'Balanced security - limited write operations',
      mode: SandboxMode.CONTROLLED,
      capabilities: [
        Capability.FS_READ,
        Capability.FS_WRITE,
        Capability.STATE_READ,
        Capability.STATE_WRITE,
      ],
      networkPolicy: {
        allowedDomains: ['localhost', '127.0.0.1'],
        blockedDomains: [],
        maxRequestsPerMinute: 10,
        maxResponseSize: 1024 * 1024, // 1MB
        timeout: 5000,
      },
      memoryLimits: {
        maxHeapSize: 100 * 1024 * 1024, // 100MB
        maxArrayLength: 100000,
        maxStringLength: 1000000,
        maxObjectDepth: 20,
      },
      resourceQuota: {
        maxCpuTime: 30000,
        maxDiskSpace: 10 * 1024 * 1024, // 10MB
        maxFileSize: 1024 * 1024, // 1MB
        maxApiCalls: 100,
        maxConcurrentOperations: 5,
      },
      callStackLimits: {
        maxDepth: 100,
        maxRecursion: 50,
        trackingEnabled: true,
      },
      auditEnabled: true,
    });

    // Trusted profile - minimal restrictions
    this.profiles.set('trusted', {
      name: 'trusted',
      description: 'Minimal restrictions - full access',
      mode: SandboxMode.TRUSTED,
      capabilities: [
        Capability.FS_READ,
        Capability.FS_WRITE,
        Capability.FS_DELETE,
        Capability.FS_MOVE,
        Capability.STATE_READ,
        Capability.STATE_WRITE,
        Capability.EXEC_COMMAND,
      ],
      networkPolicy: {
        allowedDomains: ['*'],
        blockedDomains: [],
        maxRequestsPerMinute: 100,
        maxResponseSize: 10 * 1024 * 1024, // 10MB
        timeout: 30000,
      },
      memoryLimits: {
        maxHeapSize: 500 * 1024 * 1024, // 500MB
        maxArrayLength: 1000000,
        maxStringLength: 10000000,
        maxObjectDepth: 50,
      },
      resourceQuota: {
        maxCpuTime: 300000,
        maxDiskSpace: 100 * 1024 * 1024, // 100MB
        maxFileSize: 10 * 1024 * 1024, // 10MB
        maxApiCalls: 1000,
        maxConcurrentOperations: 20,
      },
      callStackLimits: {
        maxDepth: 500,
        maxRecursion: 100,
        trackingEnabled: false,
      },
      auditEnabled: false,
    });
  }

  /**
   * Get profile by name
   */
  static getProfile(name: string): SandboxProfile | undefined {
    return this.profiles.get(name);
  }

  /**
   * Add custom profile
   */
  static addProfile(profile: SandboxProfile): void {
    this.profiles.set(profile.name, profile);
  }

  /**
   * List all profiles
   */
  static listProfiles(): SandboxProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * Remove profile
   */
  static removeProfile(name: string): boolean {
    return this.profiles.delete(name);
  }
}

// Initialize default profiles
SandboxProfiles.initializeDefaults();
