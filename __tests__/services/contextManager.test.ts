import { ContextManager } from '@/services/contextManager';

describe('ContextManager Service', () => {
  let manager: ContextManager;

  beforeEach(() => {
    manager = new ContextManager();
  });

  afterEach(() => {
    manager.clear();
  });

  describe('Context Management', () => {
    it('should add context successfully', () => {
      manager.addContext('test-id', {
        type: 'file',
        content: 'test content',
        metadata: { filename: 'test.ts' }
      });

      const context = manager.getContext('test-id');
      expect(context).toBeDefined();
      expect(context?.content).toBe('test content');
    });

    it('should remove context successfully', () => {
      manager.addContext('test-id', {
        type: 'file',
        content: 'test content'
      });

      manager.removeContext('test-id');
      
      const context = manager.getContext('test-id');
      expect(context).toBeUndefined();
    });

    it('should update existing context', () => {
      manager.addContext('test-id', {
        type: 'file',
        content: 'original'
      });

      manager.updateContext('test-id', {
        content: 'updated'
      });

      const context = manager.getContext('test-id');
      expect(context?.content).toBe('updated');
    });

    it('should clear all contexts', () => {
      manager.addContext('id1', { type: 'file', content: 'content1' });
      manager.addContext('id2', { type: 'file', content: 'content2' });

      manager.clear();

      expect(manager.getAllContexts()).toHaveLength(0);
    });
  });

  describe('Context Querying', () => {
    beforeEach(() => {
      manager.addContext('file1', {
        type: 'file',
        content: 'typescript content',
        metadata: { language: 'typescript' }
      });
      manager.addContext('file2', {
        type: 'file',
        content: 'javascript content',
        metadata: { language: 'javascript' }
      });
      manager.addContext('conv1', {
        type: 'conversation',
        content: 'chat message'
      });
    });

    it('should get all contexts', () => {
      const contexts = manager.getAllContexts();
      expect(contexts).toHaveLength(3);
    });

    it('should filter contexts by type', () => {
      const fileContexts = manager.getContextsByType('file');
      expect(fileContexts).toHaveLength(2);
    });

    it('should search contexts by content', () => {
      const results = manager.searchContexts('typescript');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('file1');
    });

    it('should search contexts by metadata', () => {
      const results = manager.searchContexts('javascript', { searchMetadata: true });
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('Context Limits', () => {
    it('should enforce maximum context size', () => {
      const largeContent = 'x'.repeat(1000000);
      
      expect(() => {
        manager.addContext('large', {
          type: 'file',
          content: largeContent
        });
      }).toThrow(/size limit/i);
    });

    it('should enforce maximum number of contexts', () => {
      const maxContexts = 100;
      
      for (let i = 0; i < maxContexts + 1; i++) {
        manager.addContext(`id${i}`, {
          type: 'file',
          content: `content${i}`
        });
      }

      expect(manager.getAllContexts().length).toBeLessThanOrEqual(maxContexts);
    });
  });

  describe('Context Priority', () => {
    it('should maintain context priority order', () => {
      manager.addContext('low', { type: 'file', content: 'low', priority: 1 });
      manager.addContext('high', { type: 'file', content: 'high', priority: 10 });
      manager.addContext('medium', { type: 'file', content: 'medium', priority: 5 });

      const contexts = manager.getSortedContexts();
      expect(contexts[0].id).toBe('high');
      expect(contexts[1].id).toBe('medium');
      expect(contexts[2].id).toBe('low');
    });
  });

  describe('Context Serialization', () => {
    it('should export contexts to JSON', () => {
      manager.addContext('test', {
        type: 'file',
        content: 'test content'
      });

      const json = manager.exportToJSON();
      expect(json).toContain('test');
      expect(json).toContain('test content');
    });

    it('should import contexts from JSON', () => {
      const json = JSON.stringify([
        { id: 'imported', type: 'file', content: 'imported content' }
      ]);

      manager.importFromJSON(json);

      const context = manager.getContext('imported');
      expect(context).toBeDefined();
      expect(context?.content).toBe('imported content');
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid context ID', () => {
      expect(() => {
        manager.addContext('', { type: 'file', content: 'test' });
      }).toThrow(/invalid.*id/i);
    });

    it('should handle duplicate context ID', () => {
      manager.addContext('duplicate', { type: 'file', content: 'first' });
      
      expect(() => {
        manager.addContext('duplicate', { type: 'file', content: 'second' });
      }).toThrow(/already exists/i);
    });

    it('should handle invalid context type', () => {
      expect(() => {
        manager.addContext('test', { type: 'invalid' as any, content: 'test' });
      }).toThrow(/invalid.*type/i);
    });
  });
});
