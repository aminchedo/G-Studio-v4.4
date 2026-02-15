/**
 * SandboxIntegration Tests
 * 
 * Test suite for sandbox integration with MCP Service
 */

import { SandboxIntegration } from '../sandboxIntegration';
import { SandboxMode, Capability } from '../sandboxManager';

// Mock McpService
jest.mock('../mcpService', () => ({
  McpService: {
    executeTool: jest.fn(async (tool, args) => ({
      success: true,
      message: `Tool ${tool} executed`,
      data: { tool, args },
    })),
  },
}));

describe('SandboxIntegration', () => {
  beforeEach(() => {
    // Reset configuration before each test
    SandboxIntegration.resetConfig();
  });

  describe('Configuration Management', () => {
    it('should have default configuration', () => {
      const config = SandboxIntegration.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.defaultMode).toBe(SandboxMode.CONTROLLED);
      expect(config.toolConfigs).toBeDefined();
    });

    it('should allow configuration updates', () => {
      SandboxIntegration.configure({
        enabled: false,
        defaultMode: SandboxMode.STRICT,
      });

      const config = SandboxIntegration.getConfig();

      expect(config.enabled).toBe(false);
      expect(config.defaultMode).toBe(SandboxMode.STRICT);
    });

    it('should enable/disable sandbox', () => {
      SandboxIntegration.setEnabled(false);
      expect(SandboxIntegration.isEnabled()).toBe(false);

      SandboxIntegration.setEnabled(true);
      expect(SandboxIntegration.isEnabled()).toBe(true);
    });

    it('should configure individual tools', () => {
      SandboxIntegration.configureTool('custom_tool', {
        mode: SandboxMode.TRUSTED,
        timeout: 5000,
      });

      const toolConfig = SandboxIntegration.getToolConfig('custom_tool');

      expect(toolConfig).toBeDefined();
      expect(toolConfig?.mode).toBe(SandboxMode.TRUSTED);
      expect(toolConfig?.timeout).toBe(5000);
    });

    it('should reset configuration to defaults', () => {
      SandboxIntegration.configure({
        enabled: false,
        defaultMode: SandboxMode.TRUSTED,
      });

      SandboxIntegration.resetConfig();

      const config = SandboxIntegration.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.defaultMode).toBe(SandboxMode.CONTROLLED);
    });
  });

  describe('Tool Execution with Sandbox', () => {
    it('should execute tool with sandbox when enabled', async () => {
      SandboxIntegration.setEnabled(true);

      const result = await SandboxIntegration.executeToolWithSandbox(
        'read_file',
        { path: 'test.ts' },
        {},
        {} as any
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('read_file');
    });

    it('should bypass sandbox when disabled', async () => {
      SandboxIntegration.setEnabled(false);

      const result = await SandboxIntegration.executeToolWithSandbox(
        'read_file',
        { path: 'test.ts' },
        {},
        {} as any
      );

      expect(result.success).toBe(true);
      // Should call McpService directly
    });

    it('should use tool-specific configuration', async () => {
      SandboxIntegration.configureTool('read_file', {
        mode: SandboxMode.STRICT,
        timeout: 1000,
      });

      const result = await SandboxIntegration.executeToolWithSandbox(
        'read_file',
        { path: 'test.ts' },
        {},
        {} as any
      );

      expect(result.success).toBe(true);
    });

    it('should handle execution errors gracefully', async () => {
      // Mock McpService to throw error
      const { McpService } = require('../mcpService');
      McpService.executeTool.mockRejectedValueOnce(new Error('Execution failed'));

      const result = await SandboxIntegration.executeToolWithSandbox(
        'read_file',
        { path: 'test.ts' },
        {},
        {} as any
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Capability Inference', () => {
    it('should infer read capabilities for read tools', () => {
      const config = SandboxIntegration.getToolConfig('read_file');
      
      // read_file should be in STRICT mode by default
      expect(config?.mode).toBe(SandboxMode.STRICT);
    });

    it('should infer write capabilities for write tools', () => {
      const config = SandboxIntegration.getToolConfig('write_code');
      
      expect(config?.mode).toBe(SandboxMode.CONTROLLED);
      expect(config?.capabilities).toContain(Capability.FS_WRITE);
      expect(config?.capabilities).toContain(Capability.STATE_WRITE);
    });

    it('should configure utility tools as TRUSTED', () => {
      const config = SandboxIntegration.getToolConfig('calculate');
      
      expect(config?.mode).toBe(SandboxMode.TRUSTED);
      expect(config?.timeout).toBe(1000);
    });
  });

  describe('Default Tool Configurations', () => {
    it('should have STRICT mode for read-only tools', () => {
      const readTools = [
        'read_file',
        'search_files',
        'search_in_file',
        'get_file_info',
        'get_line',
        'get_lines',
        'project_overview',
      ];

      for (const tool of readTools) {
        const config = SandboxIntegration.getToolConfig(tool);
        expect(config?.mode).toBe(SandboxMode.STRICT);
      }
    });

    it('should have CONTROLLED mode for write tools', () => {
      const writeTools = [
        'create_file',
        'write_code',
        'edit_file',
        'delete_file',
        'move_file',
      ];

      for (const tool of writeTools) {
        const config = SandboxIntegration.getToolConfig(tool);
        expect(config?.mode).toBe(SandboxMode.CONTROLLED);
      }
    });

    it('should have TRUSTED mode for utility tools', () => {
      const utilityTools = [
        'calculate',
        'get_current_time',
        'generate_uuid',
        'hash_text',
        'base64_encode',
        'base64_decode',
      ];

      for (const tool of utilityTools) {
        const config = SandboxIntegration.getToolConfig(tool);
        expect(config?.mode).toBe(SandboxMode.TRUSTED);
      }
    });

    it('should have appropriate timeouts for different tool types', () => {
      // Fast utility tools
      expect(SandboxIntegration.getToolConfig('get_current_time')?.timeout).toBe(100);
      expect(SandboxIntegration.getToolConfig('generate_uuid')?.timeout).toBe(100);

      // Medium speed tools
      expect(SandboxIntegration.getToolConfig('calculate')?.timeout).toBe(1000);
      expect(SandboxIntegration.getToolConfig('hash_text')?.timeout).toBe(2000);

      // File operations
      expect(SandboxIntegration.getToolConfig('create_file')?.timeout).toBe(10000);
      expect(SandboxIntegration.getToolConfig('delete_file')?.timeout).toBe(5000);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should provide sandbox statistics', () => {
      const stats = SandboxIntegration.getStats();

      expect(stats).toBeDefined();
      expect(stats.totalExecutions).toBeGreaterThanOrEqual(0);
      expect(stats.successfulExecutions).toBeGreaterThanOrEqual(0);
      expect(stats.failedExecutions).toBeGreaterThanOrEqual(0);
    });

    it('should provide recent execution history', () => {
      const recent = SandboxIntegration.getRecentExecutions(10);

      expect(Array.isArray(recent)).toBe(true);
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain same interface as McpService.executeTool', async () => {
      const result = await SandboxIntegration.executeToolWithSandbox(
        'read_file',
        { path: 'test.ts' },
        {},
        {} as any
      );

      // Should return McpToolResult format
      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('message');
    });

    it('should not break existing tool execution when sandbox is disabled', async () => {
      SandboxIntegration.setEnabled(false);

      const result = await SandboxIntegration.executeToolWithSandbox(
        'write_code',
        { path: 'test.ts', content: 'code' },
        {},
        {} as any
      );

      expect(result.success).toBe(true);
    });

    it('should preserve tool result data structure', async () => {
      const result = await SandboxIntegration.executeToolWithSandbox(
        'read_file',
        { path: 'test.ts' },
        {},
        {} as any
      );

      expect(result.data).toBeDefined();
      expect(result.data.tool).toBe('read_file');
      expect(result.data.args).toEqual({ path: 'test.ts' });
    });
  });

  describe('Error Scenarios', () => {
    it('should handle capability violations', async () => {
      // Configure tool with insufficient capabilities
      SandboxIntegration.configureTool('write_code', {
        mode: SandboxMode.STRICT, // STRICT mode blocks writes
        capabilities: [Capability.FS_READ],
      });

      const result = await SandboxIntegration.executeToolWithSandbox(
        'write_code',
        { path: 'test.ts', content: 'code' },
        {},
        {} as any
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle timeout violations', async () => {
      // Mock slow execution
      const { McpService } = require('../mcpService');
      McpService.executeTool.mockImplementationOnce(async () => {
        await new Promise(resolve => setTimeout(resolve, 200));
        return { success: true };
      });

      SandboxIntegration.configureTool('read_file', {
        timeout: 50, // Very short timeout
      });

      const result = await SandboxIntegration.executeToolWithSandbox(
        'read_file',
        { path: 'test.ts' },
        {},
        {} as any
      );

      expect(result.success).toBe(false);
    });

    it('should handle path violations in CONTROLLED mode', async () => {
      SandboxIntegration.configureTool('write_code', {
        mode: SandboxMode.CONTROLLED,
        capabilities: [Capability.FS_WRITE, Capability.STATE_WRITE],
        allowedPaths: ['src/**'], // Only allow src directory
      });

      const result = await SandboxIntegration.executeToolWithSandbox(
        'write_code',
        { path: 'config/settings.json', content: 'code' },
        {},
        {} as any
      );

      expect(result.success).toBe(false);
    });
  });

  describe('Integration with Existing Systems', () => {
    it('should work with ErrorHandler', async () => {
      const { McpService } = require('../mcpService');
      McpService.executeTool.mockRejectedValueOnce(new Error('Test error'));

      const result = await SandboxIntegration.executeToolWithSandbox(
        'read_file',
        { path: 'test.ts' },
        {},
        {} as any
      );

      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
      expect(result.error).toBeDefined();
    });

    it('should record telemetry for executions', async () => {
      await SandboxIntegration.executeToolWithSandbox(
        'read_file',
        { path: 'test.ts' },
        {},
        {} as any
      );

      const stats = SandboxIntegration.getStats();
      expect(stats.totalExecutions).toBeGreaterThan(0);
    });
  });
});
