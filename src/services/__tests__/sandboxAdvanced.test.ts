/**
 * SandboxAdvanced Tests
 * 
 * Test suite for Phase 7B: Advanced Sandbox Features
 */

import {
  NetworkMonitor,
  MemoryTracker,
  CallStackMonitor,
  ResourceQuotaManager,
  AuditLogger,
  SandboxProfiles,
  NetworkPolicy,
  MemoryLimits,
  CallStackLimits,
  ResourceQuota,
} from '../sandboxAdvanced';

describe('NetworkMonitor', () => {
  beforeEach(() => {
    NetworkMonitor.clearLog();
  });

  describe('Request Validation', () => {
    it('should allow requests to whitelisted domains', () => {
      const policy: NetworkPolicy = {
        allowedDomains: ['example.com', 'api.github.com'],
        blockedDomains: [],
        maxRequestsPerMinute: 10,
        maxResponseSize: 1024 * 1024,
        timeout: 5000,
      };

      const result = NetworkMonitor.isRequestAllowed('https://example.com/api', policy);
      expect(result.allowed).toBe(true);
    });

    it('should block requests to non-whitelisted domains', () => {
      const policy: NetworkPolicy = {
        allowedDomains: ['example.com'],
        blockedDomains: [],
        maxRequestsPerMinute: 10,
        maxResponseSize: 1024 * 1024,
        timeout: 5000,
      };

      const result = NetworkMonitor.isRequestAllowed('https://malicious.com/api', policy);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not in allowlist');
    });

    it('should block requests to blacklisted domains', () => {
      const policy: NetworkPolicy = {
        allowedDomains: ['*'],
        blockedDomains: ['malicious.com', 'spam.net'],
        maxRequestsPerMinute: 10,
        maxResponseSize: 1024 * 1024,
        timeout: 5000,
      };

      const result = NetworkMonitor.isRequestAllowed('https://malicious.com/api', policy);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('blocked');
    });

    it('should enforce rate limits', () => {
      const policy: NetworkPolicy = {
        allowedDomains: ['*'],
        blockedDomains: [],
        maxRequestsPerMinute: 2,
        maxResponseSize: 1024 * 1024,
        timeout: 5000,
      };

      // First two requests should succeed
      expect(NetworkMonitor.isRequestAllowed('https://example.com/1', policy).allowed).toBe(true);
      expect(NetworkMonitor.isRequestAllowed('https://example.com/2', policy).allowed).toBe(true);

      // Third request should be rate limited
      const result = NetworkMonitor.isRequestAllowed('https://example.com/3', policy);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('Rate limit');
    });

    it('should validate response size', () => {
      const policy: NetworkPolicy = {
        allowedDomains: ['*'],
        blockedDomains: [],
        maxRequestsPerMinute: 10,
        maxResponseSize: 1024, // 1KB
        timeout: 5000,
      };

      expect(NetworkMonitor.isResponseSizeAllowed(500, policy).allowed).toBe(true);
      expect(NetworkMonitor.isResponseSizeAllowed(2000, policy).allowed).toBe(false);
    });
  });

  describe('Statistics', () => {
    it('should track request statistics', () => {
      const policy: NetworkPolicy = {
        allowedDomains: ['*'],
        blockedDomains: ['blocked.com'],
        maxRequestsPerMinute: 10,
        maxResponseSize: 1024 * 1024,
        timeout: 5000,
      };

      NetworkMonitor.isRequestAllowed('https://example.com/1', policy);
      NetworkMonitor.isRequestAllowed('https://example.com/2', policy);
      NetworkMonitor.isRequestAllowed('https://blocked.com/api', policy);

      const stats = NetworkMonitor.getStats();
      expect(stats.totalRequests).toBe(3);
      expect(stats.allowedRequests).toBe(2);
      expect(stats.blockedRequests).toBe(1);
    });
  });
});

describe('MemoryTracker', () => {
  beforeEach(() => {
    MemoryTracker.clearMeasurements();
  });

  describe('Limit Checking', () => {
    it('should check array length limits', () => {
      const limits: MemoryLimits = {
        maxHeapSize: 100 * 1024 * 1024,
        maxArrayLength: 100,
        maxStringLength: 1000,
        maxObjectDepth: 10,
      };

      const smallArray = new Array(50);
      const largeArray = new Array(200);

      expect(MemoryTracker.checkLimits(smallArray, limits).allowed).toBe(true);
      expect(MemoryTracker.checkLimits(largeArray, limits).allowed).toBe(false);
    });

    it('should check string length limits', () => {
      const limits: MemoryLimits = {
        maxHeapSize: 100 * 1024 * 1024,
        maxArrayLength: 1000,
        maxStringLength: 100,
        maxObjectDepth: 10,
      };

      const shortString = 'short';
      const longString = 'a'.repeat(200);

      expect(MemoryTracker.checkLimits(shortString, limits).allowed).toBe(true);
      expect(MemoryTracker.checkLimits(longString, limits).allowed).toBe(false);
    });

    it('should check object depth limits', () => {
      const limits: MemoryLimits = {
        maxHeapSize: 100 * 1024 * 1024,
        maxArrayLength: 1000,
        maxStringLength: 1000,
        maxObjectDepth: 3,
      };

      const shallowObject = { a: { b: 1 } };
      const deepObject = { a: { b: { c: { d: { e: 1 } } } } };

      expect(MemoryTracker.checkLimits(shallowObject, limits).allowed).toBe(true);
      expect(MemoryTracker.checkLimits(deepObject, limits).allowed).toBe(false);
    });

    it('should return violations list', () => {
      const limits: MemoryLimits = {
        maxHeapSize: 100 * 1024 * 1024,
        maxArrayLength: 10,
        maxStringLength: 10,
        maxObjectDepth: 2,
      };

      const largeArray = new Array(20);
      const result = MemoryTracker.checkLimits(largeArray, limits);

      expect(result.allowed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0]).toContain('Array length');
    });
  });

  describe('Memory Measurement', () => {
    it('should measure memory usage', () => {
      const memory = MemoryTracker.measureMemory();

      expect(memory).toHaveProperty('heapUsed');
      expect(memory).toHaveProperty('heapTotal');
      expect(memory).toHaveProperty('external');
      expect(memory).toHaveProperty('rss');
    });

    it('should track memory statistics', () => {
      MemoryTracker.measureMemory();
      MemoryTracker.measureMemory();

      const stats = MemoryTracker.getStats();

      expect(stats).toHaveProperty('currentHeapUsed');
      expect(stats).toHaveProperty('peakHeapUsed');
      expect(stats).toHaveProperty('averageHeapUsed');
    });
  });
});

describe('CallStackMonitor', () => {
  const executionId = 'test-exec-1';

  describe('Stack Tracking', () => {
    it('should track function calls', () => {
      CallStackMonitor.enterFunction(executionId, 'functionA');
      CallStackMonitor.enterFunction(executionId, 'functionB');

      const stats = CallStackMonitor.getStats();
      expect(stats.activeExecutions).toBe(1);
      expect(stats.maxStackDepth).toBe(2);

      CallStackMonitor.exitFunction(executionId);
      CallStackMonitor.exitFunction(executionId);
      CallStackMonitor.clearExecution(executionId);
    });

    it('should detect recursion', () => {
      CallStackMonitor.enterFunction(executionId, 'recursive');
      CallStackMonitor.enterFunction(executionId, 'recursive');
      CallStackMonitor.enterFunction(executionId, 'recursive');

      const stats = CallStackMonitor.getStats();
      expect(stats.maxRecursionDepth).toBe(3);

      CallStackMonitor.clearExecution(executionId);
    });

    it('should enforce stack depth limits', () => {
      const limits: CallStackLimits = {
        maxDepth: 5,
        maxRecursion: 10,
        trackingEnabled: true,
      };

      for (let i = 0; i < 3; i++) {
        CallStackMonitor.enterFunction(executionId, `function${i}`);
      }

      expect(CallStackMonitor.checkLimits(executionId, limits).allowed).toBe(true);

      for (let i = 3; i < 10; i++) {
        CallStackMonitor.enterFunction(executionId, `function${i}`);
      }

      expect(CallStackMonitor.checkLimits(executionId, limits).allowed).toBe(false);

      CallStackMonitor.clearExecution(executionId);
    });

    it('should enforce recursion limits', () => {
      const limits: CallStackLimits = {
        maxDepth: 100,
        maxRecursion: 3,
        trackingEnabled: true,
      };

      CallStackMonitor.enterFunction(executionId, 'recursive');
      CallStackMonitor.enterFunction(executionId, 'recursive');
      expect(CallStackMonitor.checkLimits(executionId, limits).allowed).toBe(true);

      CallStackMonitor.enterFunction(executionId, 'recursive');
      CallStackMonitor.enterFunction(executionId, 'recursive');
      expect(CallStackMonitor.checkLimits(executionId, limits).allowed).toBe(false);

      CallStackMonitor.clearExecution(executionId);
    });
  });
});

describe('ResourceQuotaManager', () => {
  const executionId = 'test-exec-1';

  beforeEach(() => {
    ResourceQuotaManager.clearQuota(executionId);
  });

  describe('Quota Tracking', () => {
    it('should track CPU time', () => {
      const quota: ResourceQuota = {
        maxCpuTime: 1000,
        maxDiskSpace: 1024 * 1024,
        maxFileSize: 1024 * 1024,
        maxApiCalls: 10,
        maxConcurrentOperations: 5,
      };

      ResourceQuotaManager.initializeQuota(executionId, quota);
      ResourceQuotaManager.trackCpuTime(executionId, 500);

      expect(ResourceQuotaManager.checkQuota(executionId, quota).allowed).toBe(true);

      ResourceQuotaManager.trackCpuTime(executionId, 600);
      expect(ResourceQuotaManager.checkQuota(executionId, quota).allowed).toBe(false);
    });

    it('should track disk space', () => {
      const quota: ResourceQuota = {
        maxCpuTime: 10000,
        maxDiskSpace: 1024,
        maxFileSize: 1024 * 1024,
        maxApiCalls: 10,
        maxConcurrentOperations: 5,
      };

      ResourceQuotaManager.initializeQuota(executionId, quota);
      ResourceQuotaManager.trackDiskSpace(executionId, 500);

      expect(ResourceQuotaManager.checkQuota(executionId, quota).allowed).toBe(true);

      ResourceQuotaManager.trackDiskSpace(executionId, 600);
      expect(ResourceQuotaManager.checkQuota(executionId, quota).allowed).toBe(false);
    });

    it('should track API calls', () => {
      const quota: ResourceQuota = {
        maxCpuTime: 10000,
        maxDiskSpace: 1024 * 1024,
        maxFileSize: 1024 * 1024,
        maxApiCalls: 3,
        maxConcurrentOperations: 5,
      };

      ResourceQuotaManager.initializeQuota(executionId, quota);
      ResourceQuotaManager.trackApiCall(executionId);
      ResourceQuotaManager.trackApiCall(executionId);

      expect(ResourceQuotaManager.checkQuota(executionId, quota).allowed).toBe(true);

      ResourceQuotaManager.trackApiCall(executionId);
      ResourceQuotaManager.trackApiCall(executionId);

      expect(ResourceQuotaManager.checkQuota(executionId, quota).allowed).toBe(false);
    });

    it('should track concurrent operations', () => {
      const quota: ResourceQuota = {
        maxCpuTime: 10000,
        maxDiskSpace: 1024 * 1024,
        maxFileSize: 1024 * 1024,
        maxApiCalls: 100,
        maxConcurrentOperations: 2,
      };

      ResourceQuotaManager.initializeQuota(executionId, quota);
      ResourceQuotaManager.trackConcurrentOp(executionId, true);
      ResourceQuotaManager.trackConcurrentOp(executionId, true);

      expect(ResourceQuotaManager.checkQuota(executionId, quota).allowed).toBe(true);

      ResourceQuotaManager.trackConcurrentOp(executionId, true);
      expect(ResourceQuotaManager.checkQuota(executionId, quota).allowed).toBe(false);

      ResourceQuotaManager.trackConcurrentOp(executionId, false);
      expect(ResourceQuotaManager.checkQuota(executionId, quota).allowed).toBe(true);
    });

    it('should return violations list', () => {
      const quota: ResourceQuota = {
        maxCpuTime: 100,
        maxDiskSpace: 100,
        maxFileSize: 1024 * 1024,
        maxApiCalls: 1,
        maxConcurrentOperations: 1,
      };

      ResourceQuotaManager.initializeQuota(executionId, quota);
      ResourceQuotaManager.trackCpuTime(executionId, 200);
      ResourceQuotaManager.trackApiCall(executionId);
      ResourceQuotaManager.trackApiCall(executionId);

      const result = ResourceQuotaManager.checkQuota(executionId, quota);

      expect(result.allowed).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe('Statistics', () => {
    it('should provide quota statistics', () => {
      const quota: ResourceQuota = {
        maxCpuTime: 10000,
        maxDiskSpace: 1024 * 1024,
        maxFileSize: 1024 * 1024,
        maxApiCalls: 100,
        maxConcurrentOperations: 5,
      };

      ResourceQuotaManager.initializeQuota(executionId, quota);
      ResourceQuotaManager.trackCpuTime(executionId, 500);
      ResourceQuotaManager.trackApiCall(executionId);

      const stats = ResourceQuotaManager.getStats();

      expect(stats.activeQuotas).toBe(1);
      expect(stats.totalCpuTime).toBe(500);
      expect(stats.totalApiCalls).toBe(1);
    });
  });
});

describe('AuditLogger', () => {
  beforeEach(() => {
    AuditLogger.clearLogs();
    AuditLogger.setEnabled(true);
  });

  describe('Logging', () => {
    it('should log audit entries', () => {
      AuditLogger.log({
        tool: 'write_code',
        action: 'file_write',
        result: 'success',
        severity: 'info',
      });

      const logs = AuditLogger.getLogs();
      expect(logs.length).toBe(1);
      expect(logs[0].tool).toBe('write_code');
      expect(logs[0].result).toBe('success');
    });

    it('should include metadata in logs', () => {
      AuditLogger.log({
        tool: 'delete_file',
        action: 'file_delete',
        result: 'blocked',
        severity: 'warning',
        reason: 'Insufficient permissions',
        metadata: { path: 'important.txt' },
      });

      const logs = AuditLogger.getLogs();
      expect(logs[0].reason).toBe('Insufficient permissions');
      expect(logs[0].metadata).toEqual({ path: 'important.txt' });
    });

    it('should filter logs by criteria', () => {
      AuditLogger.log({
        tool: 'read_file',
        action: 'file_read',
        result: 'success',
        severity: 'info',
      });

      AuditLogger.log({
        tool: 'write_code',
        action: 'file_write',
        result: 'failure',
        severity: 'error',
      });

      const errorLogs = AuditLogger.getLogs({ severity: 'error' });
      expect(errorLogs.length).toBe(1);
      expect(errorLogs[0].tool).toBe('write_code');

      const successLogs = AuditLogger.getLogs({ result: 'success' });
      expect(successLogs.length).toBe(1);
      expect(successLogs[0].tool).toBe('read_file');
    });

    it('should respect enabled flag', () => {
      AuditLogger.setEnabled(false);

      AuditLogger.log({
        tool: 'test_tool',
        action: 'test_action',
        result: 'success',
        severity: 'info',
      });

      const logs = AuditLogger.getLogs();
      expect(logs.length).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should provide audit statistics', () => {
      AuditLogger.log({
        tool: 'read_file',
        action: 'file_read',
        result: 'success',
        severity: 'info',
      });

      AuditLogger.log({
        tool: 'write_code',
        action: 'file_write',
        result: 'failure',
        severity: 'error',
      });

      AuditLogger.log({
        tool: 'write_code',
        action: 'file_write',
        result: 'blocked',
        severity: 'warning',
      });

      const stats = AuditLogger.getStats();

      expect(stats.totalLogs).toBe(3);
      expect(stats.byResult.success).toBe(1);
      expect(stats.byResult.failure).toBe(1);
      expect(stats.byResult.blocked).toBe(1);
      expect(stats.bySeverity.error).toBe(1);
      expect(stats.byTool.write_code).toBe(2);
    });
  });
});

describe('SandboxProfiles', () => {
  describe('Default Profiles', () => {
    it('should have strict profile', () => {
      const profile = SandboxProfiles.getProfile('strict');

      expect(profile).toBeDefined();
      expect(profile?.name).toBe('strict');
      expect(profile?.auditEnabled).toBe(true);
    });

    it('should have controlled profile', () => {
      const profile = SandboxProfiles.getProfile('controlled');

      expect(profile).toBeDefined();
      expect(profile?.name).toBe('controlled');
    });

    it('should have trusted profile', () => {
      const profile = SandboxProfiles.getProfile('trusted');

      expect(profile).toBeDefined();
      expect(profile?.name).toBe('trusted');
      expect(profile?.auditEnabled).toBe(false);
    });

    it('should list all profiles', () => {
      const profiles = SandboxProfiles.listProfiles();

      expect(profiles.length).toBeGreaterThanOrEqual(3);
      expect(profiles.map(p => p.name)).toContain('strict');
      expect(profiles.map(p => p.name)).toContain('controlled');
      expect(profiles.map(p => p.name)).toContain('trusted');
    });
  });

  describe('Custom Profiles', () => {
    it('should add custom profile', () => {
      const customProfile = SandboxProfiles.getProfile('controlled')!;
      customProfile.name = 'custom';
      customProfile.description = 'Custom profile';

      SandboxProfiles.addProfile(customProfile);

      const retrieved = SandboxProfiles.getProfile('custom');
      expect(retrieved).toBeDefined();
      expect(retrieved?.description).toBe('Custom profile');
    });

    it('should remove profile', () => {
      const customProfile = SandboxProfiles.getProfile('controlled')!;
      customProfile.name = 'temp';

      SandboxProfiles.addProfile(customProfile);
      expect(SandboxProfiles.getProfile('temp')).toBeDefined();

      SandboxProfiles.removeProfile('temp');
      expect(SandboxProfiles.getProfile('temp')).toBeUndefined();
    });
  });
});
