/**
 * FilesystemAdapter Tests - Phase 1 & Phase 2
 * 
 * Phase 1 Validates:
 * - Default behavior unchanged (memory mode)
 * - Filesystem mode properly blocked
 * - No side effects
 * - Backward compatibility
 * 
 * Phase 2 Validates:
 * - Real filesystem operations
 * - Tool whitelist enforcement
 * - Sandbox permission checks
 * - Path validation
 * - State synchronization
 * - Telemetry logging
 * - Error recovery
 */

import { FilesystemAdapter } from '../filesystemAdapter';
import { McpService } from '../mcpService';
import { FileOperations } from '../../runtime/toolRuntime';
import { SandboxManager } from '../sandboxManager';
import { TelemetryService } from '../telemetryService';

// Mock dependencies
jest.mock('../mcpService', () => ({
  McpService: {
    executeToolInternal: jest.fn(),
  },
}));

jest.mock('../../runtime/toolRuntime', () => ({
  FileOperations: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
  },
}));

jest.mock('../sandboxManager', () => ({
  SandboxManager: {
    execute: jest.fn(),
  },
  SandboxMode: {
    STRICT: 'strict',
    CONTROLLED: 'controlled',
    TRUSTED: 'trusted',
  },
  Capability: {
    FS_READ: 'fs:read',
    FS_WRITE: 'fs:write',
    STATE_READ: 'state:read',
    STATE_WRITE: 'state:write',
  },
}));

jest.mock('../telemetryService', () => ({
  TelemetryService: {
    recordEvent: jest.fn(),
  },
}));

describe('FilesystemAdapter - Phase 1', () => {
  const mockFiles = {};
  const mockCallbacks = {
    setFiles: jest.fn(),
    setOpenFiles: jest.fn(),
    setActiveFile: jest.fn(),
    getActiveFile: jest.fn(),
    getOpenFiles: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ENABLE_FILESYSTEM_MODE;
    
    // Default mock implementations
    (SandboxManager.execute as jest.Mock).mockResolvedValue({
      success: true,
      metadata: {
        violations: [],
        duration: 10,
        timestamp: Date.now(),
        mode: 'controlled',
        capabilitiesUsed: [],
      },
    });
  });

  describe('Memory Mode (Default)', () => {
    it('should route to existing McpService.executeToolInternal', async () => {
      const mockResult = { success: true, message: 'Test' };
      (McpService.executeToolInternal as jest.Mock).mockResolvedValue(mockResult);

      const result = await FilesystemAdapter.execute(
        'read_file',
        { path: 'test.ts' },
        mockFiles,
        mockCallbacks,
        'memory'
      );

      expect(McpService.executeToolInternal).toHaveBeenCalledWith(
        'read_file',
        { path: 'test.ts' },
        mockFiles,
        mockCallbacks
      );
      expect(result).toEqual(mockResult);
    });

    it('should default to memory mode when mode not specified', async () => {
      const mockResult = { success: true, message: 'Test' };
      (McpService.executeToolInternal as jest.Mock).mockResolvedValue(mockResult);

      await FilesystemAdapter.execute(
        'read_file',
        { path: 'test.ts' },
        mockFiles,
        mockCallbacks
        // mode parameter omitted - should default to 'memory'
      );

      expect(McpService.executeToolInternal).toHaveBeenCalled();
    });

    it('should preserve all existing tool behavior', async () => {
      const tools = ['read_file', 'write_code', 'create_file', 'delete_file'];
      
      for (const tool of tools) {
        const mockResult = { success: true, message: `${tool} executed` };
        (McpService.executeToolInternal as jest.Mock).mockResolvedValue(mockResult);

        const result = await FilesystemAdapter.execute(
          tool,
          { path: 'test.ts' },
          mockFiles,
          mockCallbacks,
          'memory'
        );

        expect(result).toEqual(mockResult);
      }
    });
  });

  describe('Filesystem Mode (Blocked in Phase 1)', () => {
    it('should execute filesystem operations when filesystem mode is enabled', async () => {
      (FileOperations.readFile as jest.Mock).mockResolvedValue({
        success: true,
        content: 'test content',
      });

      const result = await FilesystemAdapter.execute(
        'read_file',
        { path: 'test.ts' },
        mockFiles,
        mockCallbacks,
        'filesystem'
      );

      expect(result.success).toBe(true);
      expect(result.data?.content).toBe('test content');
    });

    it('should block non-whitelisted tools in filesystem mode', async () => {
      const result = await FilesystemAdapter.execute(
        'write_code',
        { path: 'test.ts' },
        mockFiles,
        mockCallbacks,
        'filesystem'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('TOOL_NOT_WHITELISTED');
      expect(result.message).toContain('write_code');
    });

    it('should not call McpService.executeToolInternal in filesystem mode', async () => {
      try {
        await FilesystemAdapter.execute(
          'read_file',
          { path: 'test.ts' },
          mockFiles,
          mockCallbacks,
          'filesystem'
        );
      } catch {
        // Expected to throw
      }

      expect(McpService.executeToolInternal).not.toHaveBeenCalled();
    });
  });

  describe('Mode Detection', () => {
    it('should detect filesystem mode from environment variable', () => {
      process.env.ENABLE_FILESYSTEM_MODE = 'true';
      expect(FilesystemAdapter.isFilesystemModeEnabled()).toBe(true);
      expect(FilesystemAdapter.getCurrentMode()).toBe('filesystem');
    });

    it('should default to memory mode when env var not set', () => {
      expect(FilesystemAdapter.isFilesystemModeEnabled()).toBe(false);
      expect(FilesystemAdapter.getCurrentMode()).toBe('memory');
    });

    it('should default to memory mode when env var is false', () => {
      process.env.ENABLE_FILESYSTEM_MODE = 'false';
      expect(FilesystemAdapter.isFilesystemModeEnabled()).toBe(false);
      expect(FilesystemAdapter.getCurrentMode()).toBe('memory');
    });
  });

  describe('Backward Compatibility', () => {
    it('should not modify callback behavior', async () => {
      const mockResult = { success: true, message: 'Test' };
      (McpService.executeToolInternal as jest.Mock).mockResolvedValue(mockResult);

      await FilesystemAdapter.execute(
        'write_code',
        { path: 'test.ts', content: 'code' },
        mockFiles,
        mockCallbacks,
        'memory'
      );

      // Callbacks should be passed through unchanged
      expect(McpService.executeToolInternal).toHaveBeenCalledWith(
        'write_code',
        { path: 'test.ts', content: 'code' },
        mockFiles,
        mockCallbacks
      );
    });

    it('should preserve error handling', async () => {
      const mockError = new Error('Test error');
      (McpService.executeToolInternal as jest.Mock).mockRejectedValue(mockError);

      await expect(
        FilesystemAdapter.execute(
          'read_file',
          { path: 'test.ts' },
          mockFiles,
          mockCallbacks,
          'memory'
        )
      ).rejects.toThrow('Test error');
    });
  });
});

// ==================== PHASE 2 TESTS ====================

describe('FilesystemAdapter - Phase 2', () => {
  const mockFiles = {};
  const mockCallbacks = {
    setFiles: jest.fn(),
    setOpenFiles: jest.fn(() => []),
    setActiveFile: jest.fn(),
    getActiveFile: jest.fn(),
    getOpenFiles: jest.fn(() => []),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.ENABLE_FILESYSTEM_MODE;
    
    // Default mock implementations
    (SandboxManager.execute as jest.Mock).mockResolvedValue({
      success: true,
      metadata: {
        violations: [],
        duration: 10,
        timestamp: Date.now(),
        mode: 'controlled',
        capabilitiesUsed: [],
      },
    });
    
    (FileOperations.readFile as jest.Mock).mockResolvedValue({
      success: true,
      content: 'test content',
    });
    
    (FileOperations.writeFile as jest.Mock).mockResolvedValue({
      success: true,
    });
  });

  describe('Tool Whitelist Enforcement', () => {
    it('should allow read_file in filesystem mode', async () => {
      (FileOperations.readFile as jest.Mock).mockResolvedValue({
        success: true,
        content: 'file content',
      });

      const result = await FilesystemAdapter.execute(
        'read_file',
        { path: 'test.ts' },
        mockFiles,
        mockCallbacks,
        'filesystem'
      );

      expect(result.success).toBe(true);
      expect(FileOperations.readFile).toHaveBeenCalledWith('test.ts');
    });

    it('should allow write_file in filesystem mode', async () => {
      (FileOperations.writeFile as jest.Mock).mockResolvedValue({
        success: true,
      });

      const result = await FilesystemAdapter.execute(
        'write_file',
        { path: 'test.ts', content: 'new content' },
        mockFiles,
        mockCallbacks,
        'filesystem'
      );

      expect(result.success).toBe(true);
      expect(FileOperations.writeFile).toHaveBeenCalledWith('test.ts', 'new content');
    });

    it('should block non-whitelisted tools', async () => {
      const result = await FilesystemAdapter.execute(
        'delete_file',
        { path: 'test.ts' },
        mockFiles,
        mockCallbacks,
        'filesystem'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('TOOL_NOT_WHITELISTED');
      expect(TelemetryService.recordEvent).toHaveBeenCalledWith(
        'filesystem_tool_blocked',
        expect.objectContaining({
          tool: 'delete_file',
          reason: 'not_whitelisted',
        })
      );
    });

    it('should block create_file tool', async () => {
      const result = await FilesystemAdapter.execute(
        'create_file',
        { path: 'test.ts' },
        mockFiles,
        mockCallbacks,
        'filesystem'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('TOOL_NOT_WHITELISTED');
    });
  });

  describe('Path Validation', () => {
    it('should reject paths with directory traversal', async () => {
      const result = await FilesystemAdapter.execute(
        'read_file',
        { path: '../../../etc/passwd' },
        mockFiles,
        mockCallbacks,
        'filesystem'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_PATH');
      expect(TelemetryService.recordEvent).toHaveBeenCalledWith(
        'filesystem_path_blocked',
        expect.objectContaining({
          reason: expect.stringContaining('traversal'),
        })
      );
    });

    it('should reject paths with suspicious patterns', async () => {
      const result = await FilesystemAdapter.execute(
        'read_file',
        { path: '~/secret.txt' },
        mockFiles,
        mockCallbacks,
        'filesystem'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('INVALID_PATH');
    });

    it('should accept valid relative paths', async () => {
      (FileOperations.readFile as jest.Mock).mockResolvedValue({
        success: true,
        content: 'content',
      });

      const result = await FilesystemAdapter.execute(
        'read_file',
        { path: 'src/test.ts' },
        mockFiles,
        mockCallbacks,
        'filesystem'
      );

      expect(result.success).toBe(true);
    });

    it('should require path parameter', async () => {
      const result = await FilesystemAdapter.execute(
        'read_file',
        {},
        mockFiles,
        mockCallbacks,
        'filesystem'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('MISSING_PATH');
    });
  });

  describe('Sandbox Permission Checks', () => {
    it('should check sandbox permissions before execution', async () => {
      (FileOperations.readFile as jest.Mock).mockResolvedValue({
        success: true,
        content: 'content',
      });

      await FilesystemAdapter.execute(
        'read_file',
        { path: 'test.ts' },
        mockFiles,
        mockCallbacks,
        'filesystem'
      );

      expect(SandboxManager.execute).toHaveBeenCalled();
    });

    it('should block execution if sandbox denies permission', async () => {
      (SandboxManager.execute as jest.Mock).mockResolvedValue({
        success: false,
        error: { message: 'Permission denied' },
        metadata: {
          violations: [{ severity: 'critical', message: 'Access denied' }],
          duration: 10,
          timestamp: Date.now(),
          mode: 'controlled',
          capabilitiesUsed: [],
        },
      });

      const result = await FilesystemAdapter.execute(
        'read_file',
        { path: 'test.ts' },
        mockFiles,
        mockCallbacks,
        'filesystem'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('PERMISSION_DENIED');
    });

    it('should block on critical sandbox violations', async () => {
      (SandboxManager.execute as jest.Mock).mockResolvedValue({
        success: true,
        metadata: {
          violations: [
            { severity: 'critical', message: 'Critical violation', type: 'capability', timestamp: Date.now() }
          ],
          duration: 10,
          timestamp: Date.now(),
          mode: 'controlled',
          capabilitiesUsed: [],
        },
      });

      const result = await FilesystemAdapter.execute(
        'read_file',
        { path: 'test.ts' },
        mockFiles,
        mockCallbacks,
        'filesystem'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('PERMISSION_DENIED');
    });
  });

  describe('State Synchronization', () => {
    it('should sync filesystem changes back to memory after write', async () => {
      (FileOperations.writeFile as jest.Mock).mockResolvedValue({
        success: true,
      });
      
      (FileOperations.readFile as jest.Mock).mockResolvedValue({
        success: true,
        content: 'written content',
      });

      await FilesystemAdapter.execute(
        'write_file',
        { path: 'test.ts', content: 'written content' },
        mockFiles,
        mockCallbacks,
        'filesystem'
      );

      // Should read back from filesystem
      expect(FileOperations.readFile).toHaveBeenCalledWith('test.ts');
      
      // Should update in-memory state
      expect(mockCallbacks.setFiles).toHaveBeenCalled();
      expect(mockCallbacks.setActiveFile).toHaveBeenCalledWith('test.ts');
    });

    it('should not sync on read operations', async () => {
      (FileOperations.readFile as jest.Mock).mockResolvedValue({
        success: true,
        content: 'content',
      });

      await FilesystemAdapter.execute(
        'read_file',
        { path: 'test.ts' },
        mockFiles,
        mockCallbacks,
        'filesystem'
      );

      // setFiles should not be called for read operations
      expect(mockCallbacks.setFiles).not.toHaveBeenCalled();
    });

    it('should handle sync failures gracefully', async () => {
      (FileOperations.writeFile as jest.Mock).mockResolvedValue({
        success: true,
      });
      
      (FileOperations.readFile as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Read failed',
      });

      const result = await FilesystemAdapter.execute(
        'write_file',
        { path: 'test.ts', content: 'content' },
        mockFiles,
        mockCallbacks,
        'filesystem'
      );

      // Write should still succeed even if sync fails
      expect(result.success).toBe(true);
      
      // Should log sync failure
      expect(TelemetryService.recordEvent).toHaveBeenCalledWith(
        'filesystem_state_sync',
        expect.objectContaining({
          success: false,
        })
      );
    });
  });

  describe('Telemetry Logging', () => {
    it('should log successful filesystem operations', async () => {
      (FileOperations.readFile as jest.Mock).mockResolvedValue({
        success: true,
        content: 'content',
      });

      await FilesystemAdapter.execute(
        'read_file',
        { path: 'test.ts' },
        mockFiles,
        mockCallbacks,
        'filesystem'
      );

      expect(TelemetryService.recordEvent).toHaveBeenCalledWith(
        'filesystem_tool_execution',
        expect.objectContaining({
          tool: 'read_file',
          success: true,
          path: 'test.ts',
        })
      );
    });

    it('should log failed operations', async () => {
      (FileOperations.readFile as jest.Mock).mockResolvedValue({
        success: false,
        error: 'File not found',
      });

      await FilesystemAdapter.execute(
        'read_file',
        { path: 'missing.ts' },
        mockFiles,
        mockCallbacks,
        'filesystem'
      );

      expect(TelemetryService.recordEvent).toHaveBeenCalledWith(
        'filesystem_tool_execution',
        expect.objectContaining({
          tool: 'read_file',
          success: false,
        })
      );
    });
  });

  describe('Error Recovery', () => {
    it('should handle filesystem errors gracefully', async () => {
      (FileOperations.readFile as jest.Mock).mockResolvedValue({
        success: false,
        error: 'ENOENT: file not found',
      });

      const result = await FilesystemAdapter.execute(
        'read_file',
        { path: 'missing.ts' },
        mockFiles,
        mockCallbacks,
        'filesystem'
      );

      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to read file');
    });

    it('should handle unexpected errors', async () => {
      (FileOperations.readFile as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );

      const result = await FilesystemAdapter.execute(
        'read_file',
        { path: 'test.ts' },
        mockFiles,
        mockCallbacks,
        'filesystem'
      );

      expect(result.success).toBe(false);
      expect(TelemetryService.recordEvent).toHaveBeenCalledWith(
        'filesystem_tool_error',
        expect.objectContaining({
          tool: 'read_file',
        })
      );
    });
  });

  describe('Integration', () => {
    it('should execute complete read workflow', async () => {
      (FileOperations.readFile as jest.Mock).mockResolvedValue({
        success: true,
        content: 'test content',
      });

      const result = await FilesystemAdapter.execute(
        'read_file',
        { path: 'src/test.ts' },
        mockFiles,
        mockCallbacks,
        'filesystem'
      );

      expect(result.success).toBe(true);
      expect(result.data?.content).toBe('test content');
      expect(result.data?.mode).toBe('filesystem');
      expect(SandboxManager.execute).toHaveBeenCalled();
      expect(TelemetryService.recordEvent).toHaveBeenCalled();
    });

    it('should execute complete write workflow with sync', async () => {
      (FileOperations.writeFile as jest.Mock).mockResolvedValue({
        success: true,
      });
      
      (FileOperations.readFile as jest.Mock).mockResolvedValue({
        success: true,
        content: 'new content',
      });

      const result = await FilesystemAdapter.execute(
        'write_file',
        { path: 'src/test.ts', content: 'new content' },
        mockFiles,
        mockCallbacks,
        'filesystem'
      );

      expect(result.success).toBe(true);
      expect(FileOperations.writeFile).toHaveBeenCalled();
      expect(FileOperations.readFile).toHaveBeenCalled();
      expect(mockCallbacks.setFiles).toHaveBeenCalled();
      expect(mockCallbacks.setActiveFile).toHaveBeenCalledWith('src/test.ts');
      expect(TelemetryService.recordEvent).toHaveBeenCalledWith(
        'filesystem_state_sync',
        expect.objectContaining({ success: true })
      );
    });
  });
});