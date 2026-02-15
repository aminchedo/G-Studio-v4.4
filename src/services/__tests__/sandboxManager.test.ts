/**
 * SandboxManager Tests
 * 
 * Comprehensive test suite for Phase 7A: Core Sandbox Infrastructure
 */

import { SandboxManager, SandboxMode, Capability, SandboxConfig } from '../sandboxManager';
import { ErrorCode } from '../errorHandler';

describe('SandboxManager', () => {
  beforeEach(() => {
    // Clear execution log before each test
    SandboxManager.clearLog();
  });

  describe('Configuration Validation', () => {
    it('should reject invalid sandbox mode', async () => {
      const config: any = {
        mode: 'invalid_mode',
        capabilities: [],
      };

      const result = await SandboxManager.execute({
        tool: 'test_tool',
        args: {},
        config,
        executor: async () => ({ success: true }),
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('validation');
    });

    it('should reject missing capabilities array', async () => {
      const config: any = {
        mode: SandboxMode.STRICT,
        capabilities: null,
      };

      const result = await SandboxManager.execute({
        tool: 'test_tool',
        args: {},
        config,
        executor: async () => ({ success: true }),
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('validation');
    });

    it('should reject timeout outside valid range', async () => {
      const config: SandboxConfig = {
        mode: SandboxMode.CONTROLLED,
        capabilities: [],
        timeout: 500000, // > 300000ms
      };

      const result = await SandboxManager.execute({
        tool: 'test_tool',
        args: {},
        config,
        executor: async () => ({ success: true }),
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('validation');
    });

    it('should accept valid configuration', async () => {
      const config: SandboxConfig = {
        mode: SandboxMode.CONTROLLED,
        capabilities: [Capability.FS_READ, Capability.STATE_READ],
        timeout: 5000,
      };

      const result = await SandboxManager.execute({
        tool: 'read_file',
        args: { path: 'test.ts' },
        config,
        executor: async () => ({ success: true, message: 'OK' }),
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Capability Enforcement', () => {
    it('should block write operations in STRICT mode', async () => {
      const config: SandboxConfig = {
        mode: SandboxMode.STRICT,
        capabilities: [Capability.FS_READ], // Only read allowed
      };

      const result = await SandboxManager.execute({
        tool: 'write_code',
        args: { path: 'test.ts', content: 'code' },
        config,
        executor: async () => ({ success: true }),
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('capability');
      expect(result.metadata.violations.length).toBeGreaterThan(0);
      expect(result.metadata.violations[0].type).toBe('capability');
    });

    it('should allow read operations in STRICT mode', async () => {
      const config: SandboxConfig = {
        mode: SandboxMode.STRICT,
        capabilities: [Capability.FS_READ, Capability.STATE_READ],
      };

      const result = await SandboxManager.execute({
        tool: 'read_file',
        args: { path: 'test.ts' },
        config,
        executor: async () => ({ success: true, message: 'File read' }),
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true, message: 'File read' });
    });

    it('should allow write operations in CONTROLLED mode with proper capabilities', async () => {
      const config: SandboxConfig = {
        mode: SandboxMode.CONTROLLED,
        capabilities: [Capability.FS_WRITE, Capability.STATE_WRITE],
      };

      const result = await SandboxManager.execute({
        tool: 'write_code',
        args: { path: 'test.ts', content: 'code' },
        config,
        executor: async () => ({ success: true, message: 'File written' }),
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true, message: 'File written' });
    });

    it('should block operations without required capabilities', async () => {
      const config: SandboxConfig = {
        mode: SandboxMode.CONTROLLED,
        capabilities: [Capability.FS_READ], // Missing FS_WRITE
      };

      const result = await SandboxManager.execute({
        tool: 'write_code',
        args: { path: 'test.ts', content: 'code' },
        config,
        executor: async () => ({ success: true }),
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('capability');
      expect(result.error?.code).toBe(ErrorCode.PERMISSION_DENIED);
    });

    it('should allow all operations in TRUSTED mode', async () => {
      const config: SandboxConfig = {
        mode: SandboxMode.TRUSTED,
        capabilities: [
          Capability.FS_READ,
          Capability.FS_WRITE,
          Capability.FS_DELETE,
          Capability.STATE_READ,
          Capability.STATE_WRITE,
        ],
      };

      const result = await SandboxManager.execute({
        tool: 'write_code',
        args: { path: 'test.ts', content: 'code' },
        config,
        executor: async () => ({ success: true, message: 'Executed' }),
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Timeout Enforcement', () => {
    it('should timeout long-running operations', async () => {
      const config: SandboxConfig = {
        mode: SandboxMode.CONTROLLED,
        capabilities: [Capability.FS_READ, Capability.STATE_READ],
        timeout: 100, // 100ms timeout
      };

      const result = await SandboxManager.execute({
        tool: 'read_file',
        args: { path: 'test.ts' },
        config,
        executor: async () => {
          // Simulate long operation
          await new Promise(resolve => setTimeout(resolve, 500));
          return { success: true };
        },
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('timeout');
      expect(result.error?.message).toContain('timeout');
    });

    it('should complete fast operations within timeout', async () => {
      const config: SandboxConfig = {
        mode: SandboxMode.CONTROLLED,
        capabilities: [Capability.FS_READ, Capability.STATE_READ],
        timeout: 1000, // 1s timeout
      };

      const result = await SandboxManager.execute({
        tool: 'read_file',
        args: { path: 'test.ts' },
        config,
        executor: async () => {
          // Fast operation
          await new Promise(resolve => setTimeout(resolve, 10));
          return { success: true, message: 'Fast' };
        },
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ success: true, message: 'Fast' });
    });

    it('should use default timeout when not specified', async () => {
      const config: SandboxConfig = {
        mode: SandboxMode.CONTROLLED,
        capabilities: [Capability.FS_READ, Capability.STATE_READ],
        // No timeout specified - should use default 30s
      };

      const result = await SandboxManager.execute({
        tool: 'read_file',
        args: { path: 'test.ts' },
        config,
        executor: async () => ({ success: true }),
      });

      expect(result.success).toBe(true);
    });
  });

  describe('Path Validation (CONTROLLED mode)', () => {
    it('should allow whitelisted paths', async () => {
      const config: SandboxConfig = {
        mode: SandboxMode.CONTROLLED,
        capabilities: [Capability.FS_WRITE, Capability.STATE_WRITE],
        allowedPaths: ['src/**', 'components/**'],
      };

      const result = await SandboxManager.execute({
        tool: 'write_code',
        args: { path: 'src/utils/helper.ts', content: 'code' },
        config,
        executor: async () => ({ success: true }),
      });

      expect(result.success).toBe(true);
    });

    it('should block non-whitelisted paths', async () => {
      const config: SandboxConfig = {
        mode: SandboxMode.CONTROLLED,
        capabilities: [Capability.FS_WRITE, Capability.STATE_WRITE],
        allowedPaths: ['src/**'],
      };

      const result = await SandboxManager.execute({
        tool: 'write_code',
        args: { path: 'config/settings.json', content: 'code' },
        config,
        executor: async () => ({ success: true }),
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('validation');
      expect(result.metadata.violations[0].type).toBe('path');
    });

    it('should allow all paths when allowedPaths is empty', async () => {
      const config: SandboxConfig = {
        mode: SandboxMode.CONTROLLED,
        capabilities: [Capability.FS_WRITE, Capability.STATE_WRITE],
        allowedPaths: [], // Empty = allow all
      };

      const result = await SandboxManager.execute({
        tool: 'write_code',
        args: { path: 'any/path/file.ts', content: 'code' },
        config,
        executor: async () => ({ success: true }),
      });

      expect(result.success).toBe(true);
    });

    it('should support wildcard patterns in allowed paths', async () => {
      const config: SandboxConfig = {
        mode: SandboxMode.CONTROLLED,
        capabilities: [Capability.FS_WRITE, Capability.STATE_WRITE],
        allowedPaths: ['src/*.ts', 'components/**'],
      };

      const result1 = await SandboxManager.execute({
        tool: 'write_code',
        args: { path: 'src/index.ts', content: 'code' },
        config,
        executor: async () => ({ success: true }),
      });

      const result2 = await SandboxManager.execute({
        tool: 'write_code',
        args: { path: 'components/Button/index.tsx', content: 'code' },
        config,
        executor: async () => ({ success: true }),
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle executor errors gracefully', async () => {
      const config: SandboxConfig = {
        mode: SandboxMode.CONTROLLED,
        capabilities: [Capability.FS_READ, Capability.STATE_READ],
      };

      const result = await SandboxManager.execute({
        tool: 'read_file',
        args: { path: 'test.ts' },
        config,
        executor: async () => {
          throw new Error('Executor failed');
        },
      });

      expect(result.success).toBe(false);
      expect(result.error?.type).toBe('execution');
      expect(result.error?.message).toContain('Executor failed');
    });

    it('should preserve error details', async () => {
      const config: SandboxConfig = {
        mode: SandboxMode.CONTROLLED,
        capabilities: [Capability.FS_READ, Capability.STATE_READ],
      };

      const customError = new Error('Custom error message');
      const result = await SandboxManager.execute({
        tool: 'read_file',
        args: { path: 'test.ts' },
        config,
        executor: async () => {
          throw customError;
        },
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('Custom error message');
    });
  });

  describe('Metadata and Telemetry', () => {
    it('should record execution metadata', async () => {
      const config: SandboxConfig = {
        mode: SandboxMode.CONTROLLED,
        capabilities: [Capability.FS_READ, Capability.STATE_READ],
      };

      const result = await SandboxManager.execute({
        tool: 'read_file',
        args: { path: 'test.ts' },
        config,
        executor: async () => ({ success: true }),
      });

      expect(result.metadata).toBeDefined();
      expect(result.metadata.duration).toBeGreaterThanOrEqual(0);
      expect(result.metadata.timestamp).toBeGreaterThan(0);
      expect(result.metadata.mode).toBe(SandboxMode.CONTROLLED);
      expect(result.metadata.capabilitiesUsed).toContain(Capability.FS_READ);
      expect(result.metadata.capabilitiesUsed).toContain(Capability.STATE_READ);
      expect(Array.isArray(result.metadata.violations)).toBe(true);
    });

    it('should track violations in metadata', async () => {
      const config: SandboxConfig = {
        mode: SandboxMode.STRICT,
        capabilities: [Capability.FS_READ],
      };

      const result = await SandboxManager.execute({
        tool: 'write_code',
        args: { path: 'test.ts', content: 'code' },
        config,
        executor: async () => ({ success: true }),
      });

      expect(result.metadata.violations.length).toBeGreaterThan(0);
      expect(result.metadata.violations[0].type).toBe('capability');
      expect(result.metadata.violations[0].severity).toBe('critical');
    });
  });

  describe('Statistics and Logging', () => {
    it('should track execution statistics', async () => {
      const config: SandboxConfig = {
        mode: SandboxMode.CONTROLLED,
        capabilities: [Capability.FS_READ, Capability.STATE_READ],
      };

      // Execute multiple operations
      await SandboxManager.execute({
        tool: 'read_file',
        args: { path: 'test1.ts' },
        config,
        executor: async () => ({ success: true }),
      });

      await SandboxManager.execute({
        tool: 'read_file',
        args: { path: 'test2.ts' },
        config,
        executor: async () => ({ success: true }),
      });

      const stats = SandboxManager.getStats();

      expect(stats.totalExecutions).toBe(2);
      expect(stats.successfulExecutions).toBe(2);
      expect(stats.failedExecutions).toBe(0);
      expect(stats.byMode[SandboxMode.CONTROLLED]).toBe(2);
    });

    it('should track failed executions', async () => {
      const config: SandboxConfig = {
        mode: SandboxMode.STRICT,
        capabilities: [],
      };

      await SandboxManager.execute({
        tool: 'write_code',
        args: { path: 'test.ts', content: 'code' },
        config,
        executor: async () => ({ success: true }),
      });

      const stats = SandboxManager.getStats();

      expect(stats.failedExecutions).toBe(1);
      expect(stats.violations).toBeGreaterThan(0);
    });

    it('should provide recent execution history', async () => {
      const config: SandboxConfig = {
        mode: SandboxMode.CONTROLLED,
        capabilities: [Capability.FS_READ, Capability.STATE_READ],
      };

      await SandboxManager.execute({
        tool: 'read_file',
        args: { path: 'test.ts' },
        config,
        executor: async () => ({ success: true }),
      });

      const recent = SandboxManager.getRecentExecutions(10);

      expect(recent.length).toBe(1);
      expect(recent[0].tool).toBe('read_file');
      expect(recent[0].mode).toBe(SandboxMode.CONTROLLED);
      expect(recent[0].success).toBe(true);
    });

    it('should clear execution log', async () => {
      const config: SandboxConfig = {
        mode: SandboxMode.CONTROLLED,
        capabilities: [Capability.FS_READ],
      };

      await SandboxManager.execute({
        tool: 'read_file',
        args: { path: 'test.ts' },
        config,
        executor: async () => ({ success: true }),
      });

      SandboxManager.clearLog();

      const stats = SandboxManager.getStats();
      expect(stats.totalExecutions).toBe(0);
    });
  });

  describe('Active Execution Tracking', () => {
    it('should track active executions', async () => {
      const config: SandboxConfig = {
        mode: SandboxMode.CONTROLLED,
        capabilities: [Capability.FS_READ],
        timeout: 1000,
      };

      const promise = SandboxManager.execute({
        tool: 'read_file',
        args: { path: 'test.ts' },
        config,
        executor: async () => {
          // Check during execution
          expect(SandboxManager.hasActiveExecutions()).toBe(true);
          expect(SandboxManager.getActiveExecutionCount()).toBeGreaterThan(0);
          
          await new Promise(resolve => setTimeout(resolve, 100));
          return { success: true };
        },
      });

      await promise;

      // After execution completes
      expect(SandboxManager.hasActiveExecutions()).toBe(false);
      expect(SandboxManager.getActiveExecutionCount()).toBe(0);
    });
  });

  describe('Backward Compatibility', () => {
    it('should not break existing tool execution patterns', async () => {
      const config: SandboxConfig = {
        mode: SandboxMode.CONTROLLED,
        capabilities: [Capability.FS_READ, Capability.STATE_READ],
      };

      // Simulate existing tool execution
      const result = await SandboxManager.execute({
        tool: 'read_file',
        args: { path: 'test.ts' },
        config,
        executor: async (args) => {
          // Original tool logic
          return {
            success: true,
            message: `File ${args.path} read successfully`,
            data: { content: 'file content' },
          };
        },
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({
        success: true,
        message: 'File test.ts read successfully',
        data: { content: 'file content' },
      });
    });
  });
});
