import { ErrorHandler, ErrorCode, withErrorHandling, withErrorHandlingSync } from '@/services/errorHandler';

describe('ErrorHandler', () => {
  beforeEach(() => {
    ErrorHandler.clearErrorLog();
  });

  describe('handle', () => {
    it('should handle basic errors', () => {
      const error = new Error('Test error');
      const context = ErrorHandler.handle(error, 'TEST');

      expect(context.code).toBeDefined();
      expect(context.message).toBe('Test error');
      expect(context.userMessage).toBeDefined();
      expect(context.timestamp).toBeDefined();
    });

    it('should infer API key errors', () => {
      const error = new Error('API key is invalid');
      const context = ErrorHandler.handle(error, 'API');

      expect(context.code).toBe(ErrorCode.API_KEY_INVALID);
      expect(context.userMessage).toContain('API key');
    });

    it('should infer file not found errors', () => {
      const error = new Error('File not found');
      const context = ErrorHandler.handle(error, 'FILE_OPERATION');

      expect(context.code).toBe(ErrorCode.FILE_NOT_FOUND);
    });

    it('should provide suggestions for recoverable errors', () => {
      const error = new Error('API key is missing');
      const context = ErrorHandler.handle(error, 'API');

      expect(context.suggestion).toBeDefined();
      expect(context.recoverable).toBe(true);
    });

    it('should mark unrecoverable errors', () => {
      const error = new Error('API key is invalid');
      const context = ErrorHandler.handle(error, 'API');

      expect(context.recoverable).toBe(false);
    });

    it('should preserve stack traces', () => {
      const error = new Error('Test error');
      const context = ErrorHandler.handle(error, 'TEST');

      expect(context.stack).toBeDefined();
    });

    it('should support custom error codes', () => {
      const error = new Error('Custom error');
      const context = ErrorHandler.handle(error, 'TEST', {
        code: ErrorCode.VALIDATION_ERROR,
      });

      expect(context.code).toBe(ErrorCode.VALIDATION_ERROR);
    });

    it('should support custom user messages', () => {
      const error = new Error('Technical error');
      const context = ErrorHandler.handle(error, 'TEST', {
        userMessage: 'User-friendly message',
      });

      expect(context.userMessage).toBe('User-friendly message');
    });

    it('should support silent mode', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const error = new Error('Silent error');
      ErrorHandler.handle(error, 'TEST', { silent: true });

      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('error log', () => {
    it('should add errors to log', () => {
      const error = new Error('Test error');
      ErrorHandler.handle(error, 'TEST');

      const recent = ErrorHandler.getRecentErrors(1);
      expect(recent).toHaveLength(1);
      expect(recent[0].message).toBe('Test error');
    });

    it('should limit log size', () => {
      // Add more than max log size
      for (let i = 0; i < 150; i++) {
        ErrorHandler.handle(new Error(`Error ${i}`), 'TEST', { silent: true });
      }

      const recent = ErrorHandler.getRecentErrors(200);
      expect(recent.length).toBeLessThanOrEqual(100);
    });

    it('should clear error log', () => {
      ErrorHandler.handle(new Error('Test'), 'TEST', { silent: true });
      expect(ErrorHandler.getRecentErrors()).toHaveLength(1);

      ErrorHandler.clearErrorLog();
      expect(ErrorHandler.getRecentErrors()).toHaveLength(0);
    });
  });

  describe('error statistics', () => {
    it('should track error statistics', () => {
      ErrorHandler.handle(new Error('Error 1'), 'TEST', { silent: true });
      ErrorHandler.handle(new Error('API key missing'), 'API', { silent: true });
      ErrorHandler.handle(new Error('API key invalid'), 'API', { silent: true });

      const stats = ErrorHandler.getErrorStats();
      expect(stats.total).toBe(3);
      expect(stats.byCode[ErrorCode.API_KEY_MISSING]).toBe(1);
      expect(stats.byCode[ErrorCode.API_KEY_INVALID]).toBe(1);
    });

    it('should track recoverable vs unrecoverable', () => {
      ErrorHandler.handle(new Error('API key missing'), 'API', { silent: true });
      ErrorHandler.handle(new Error('API key invalid'), 'API', { silent: true });

      const stats = ErrorHandler.getErrorStats();
      expect(stats.recoverable).toBeGreaterThan(0);
      expect(stats.unrecoverable).toBeGreaterThan(0);
    });
  });

  describe('formatForUI', () => {
    it('should format error for UI display', () => {
      const error = new Error('Test error');
      const context = ErrorHandler.handle(error, 'TEST', { silent: true });
      const formatted = ErrorHandler.formatForUI(context);

      expect(formatted.title).toBeDefined();
      expect(formatted.message).toBeDefined();
      expect(formatted.severity).toBeDefined();
    });

    it('should set severity based on recoverability', () => {
      const recoverableError = new Error('API key missing');
      const recoverableContext = ErrorHandler.handle(recoverableError, 'API', { silent: true });
      const recoverableFormatted = ErrorHandler.formatForUI(recoverableContext);
      expect(recoverableFormatted.severity).toBe('warning');

      const unrecoverableError = new Error('API key invalid');
      const unrecoverableContext = ErrorHandler.handle(unrecoverableError, 'API', { silent: true });
      const unrecoverableFormatted = ErrorHandler.formatForUI(unrecoverableContext);
      expect(unrecoverableFormatted.severity).toBe('error');
    });
  });

  describe('createToolError', () => {
    it('should create tool error result', () => {
      const error = new Error('Tool failed');
      const result = ErrorHandler.createToolError(error, 'test_tool', { arg: 'value' });

      expect(result.success).toBe(false);
      expect(result.message).toBeDefined();
      expect(result.error).toBe('Tool failed');
      expect(result.code).toBeDefined();
    });
  });

  describe('withErrorHandling', () => {
    it('should wrap successful async operations', async () => {
      const operation = async () => 'success';
      const result = await withErrorHandling(operation, 'TEST');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('success');
      }
    });

    it('should wrap failed async operations', async () => {
      const operation = async () => {
        throw new Error('Operation failed');
      };
      const result = await withErrorHandling(operation, 'TEST');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Operation failed');
      }
    });
  });

  describe('withErrorHandlingSync', () => {
    it('should wrap successful sync operations', () => {
      const operation = () => 'success';
      const result = withErrorHandlingSync(operation, 'TEST');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe('success');
      }
    });

    it('should wrap failed sync operations', () => {
      const operation = () => {
        throw new Error('Operation failed');
      };
      const result = withErrorHandlingSync(operation, 'TEST');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toBe('Operation failed');
      }
    });
  });
});
