import { StateTransaction } from '@/services/stateTransaction';

describe('StateTransaction', () => {
  beforeEach(() => {
    StateTransaction.clearTransactionLog();
  });

  describe('execute', () => {
    it('should execute successful transaction', async () => {
      let stateValue = 'initial';
      let dbValue = 'initial';

      const result = await StateTransaction.execute({
        stateUpdate: () => {
          stateValue = 'updated';
        },
        dbOperation: async () => {
          dbValue = 'updated';
          return 'success';
        },
        rollback: () => {
          stateValue = 'initial';
        },
      });

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.rolledBack).toBe(false);
      expect(stateValue).toBe('updated');
      expect(dbValue).toBe('updated');
    });

    it('should rollback on database failure', async () => {
      let stateValue = 'initial';

      const result = await StateTransaction.execute({
        stateUpdate: () => {
          stateValue = 'updated';
        },
        dbOperation: async () => {
          throw new Error('DB failed');
        },
        rollback: () => {
          stateValue = 'initial';
        },
      });

      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(true);
      expect(stateValue).toBe('initial'); // Rolled back
    });

    it('should not rollback if state update fails', async () => {
      let stateValue = 'initial';
      let dbValue = 'initial';

      const result = await StateTransaction.execute({
        stateUpdate: () => {
          throw new Error('State update failed');
        },
        dbOperation: async () => {
          dbValue = 'updated';
          return 'success';
        },
        rollback: () => {
          stateValue = 'rollback';
        },
      });

      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(false); // State never updated
      expect(stateValue).toBe('initial');
      expect(dbValue).toBe('initial'); // DB operation never ran
    });

    it('should validate before execution', async () => {
      let executed = false;

      const result = await StateTransaction.execute({
        validate: () => false,
        stateUpdate: () => {
          executed = true;
        },
        dbOperation: async () => 'success',
        rollback: () => {},
      });

      expect(result.success).toBe(false);
      expect(executed).toBe(false);
    });

    it('should call success callback', async () => {
      let callbackCalled = false;

      const result = await StateTransaction.execute({
        stateUpdate: () => {},
        dbOperation: async () => 'success',
        rollback: () => {},
        onSuccess: () => {
          callbackCalled = true;
        },
      });

      expect(result.success).toBe(true);
      expect(callbackCalled).toBe(true);
    });

    it('should call error callback', async () => {
      let callbackCalled = false;

      const result = await StateTransaction.execute({
        stateUpdate: () => {},
        dbOperation: async () => {
          throw new Error('Failed');
        },
        rollback: () => {},
        onError: () => {
          callbackCalled = true;
        },
      });

      expect(result.success).toBe(false);
      expect(callbackCalled).toBe(true);
    });

    it('should include metadata in transaction', async () => {
      const result = await StateTransaction.execute({
        stateUpdate: () => {},
        dbOperation: async () => 'success',
        rollback: () => {},
        metadata: {
          operation: 'test_operation',
          context: { key: 'value' },
        },
      });

      expect(result.success).toBe(true);

      const recent = StateTransaction.getRecentTransactions(1);
      expect(recent[0].operation).toBe('test_operation');
    });
  });

  describe('executeSequence', () => {
    it('should execute sequence of transactions', async () => {
      let value1 = 0;
      let value2 = 0;
      let value3 = 0;

      const result = await StateTransaction.executeSequence([
        {
          stateUpdate: () => { value1 = 1; },
          dbOperation: async () => {},
          rollback: () => { value1 = 0; },
        },
        {
          stateUpdate: () => { value2 = 2; },
          dbOperation: async () => {},
          rollback: () => { value2 = 0; },
        },
        {
          stateUpdate: () => { value3 = 3; },
          dbOperation: async () => {},
          rollback: () => { value3 = 0; },
        },
      ]);

      expect(result.success).toBe(true);
      expect(value1).toBe(1);
      expect(value2).toBe(2);
      expect(value3).toBe(3);
    });

    it('should rollback all on failure', async () => {
      let value1 = 0;
      let value2 = 0;
      let value3 = 0;

      const result = await StateTransaction.executeSequence([
        {
          stateUpdate: () => { value1 = 1; },
          dbOperation: async () => {},
          rollback: () => { value1 = 0; },
        },
        {
          stateUpdate: () => { value2 = 2; },
          dbOperation: async () => {},
          rollback: () => { value2 = 0; },
        },
        {
          stateUpdate: () => { value3 = 3; },
          dbOperation: async () => {
            throw new Error('Failed');
          },
          rollback: () => { value3 = 0; },
        },
      ]);

      expect(result.success).toBe(false);
      expect(result.rolledBack).toBe(true);
      expect(value1).toBe(0); // Rolled back
      expect(value2).toBe(0); // Rolled back
      expect(value3).toBe(0); // Rolled back
    });
  });

  describe('createFileTransaction', () => {
    it('should create file save transaction', () => {
      const setFiles = jest.fn();
      const transaction = StateTransaction.createFileTransaction(
        'test.ts',
        'new content',
        'old content',
        setFiles,
        'typescript'
      );

      expect(transaction.stateUpdate).toBeDefined();
      expect(transaction.dbOperation).toBeDefined();
      expect(transaction.rollback).toBeDefined();
      expect(transaction.metadata?.operation).toBe('file_save');
    });

    it('should update state on execution', async () => {
      let files: any = {};
      const setFiles = (updater: any) => {
        files = updater(files);
      };

      const transaction = StateTransaction.createFileTransaction(
        'test.ts',
        'new content',
        null,
        setFiles,
        'typescript'
      );

      transaction.stateUpdate();

      expect(files['test.ts']).toBeDefined();
      expect(files['test.ts'].content).toBe('new content');
    });

    it('should rollback to old content', async () => {
      let files: any = { 'test.ts': { name: 'test.ts', content: 'old', language: 'typescript' } };
      const setFiles = (updater: any) => {
        files = updater(files);
      };

      const transaction = StateTransaction.createFileTransaction(
        'test.ts',
        'new content',
        'old content',
        setFiles,
        'typescript'
      );

      transaction.stateUpdate();
      expect(files['test.ts'].content).toBe('new content');

      transaction.rollback();
      expect(files['test.ts'].content).toBe('old content');
    });

    it('should remove file on rollback if it was new', async () => {
      let files: any = {};
      const setFiles = (updater: any) => {
        files = updater(files);
      };

      const transaction = StateTransaction.createFileTransaction(
        'test.ts',
        'new content',
        null, // No old content (new file)
        setFiles,
        'typescript'
      );

      transaction.stateUpdate();
      expect(files['test.ts']).toBeDefined();

      transaction.rollback();
      expect(files['test.ts']).toBeUndefined();
    });
  });

  describe('transaction log', () => {
    it('should log transactions', async () => {
      await StateTransaction.execute({
        stateUpdate: () => {},
        dbOperation: async () => 'success',
        rollback: () => {},
      });

      const recent = StateTransaction.getRecentTransactions(1);
      expect(recent).toHaveLength(1);
      expect(recent[0].success).toBe(true);
    });

    it('should limit log size', async () => {
      for (let i = 0; i < 60; i++) {
        await StateTransaction.execute({
          stateUpdate: () => {},
          dbOperation: async () => {},
          rollback: () => {},
        });
      }

      const recent = StateTransaction.getRecentTransactions(100);
      expect(recent.length).toBeLessThanOrEqual(50);
    });

    it('should clear transaction log', async () => {
      await StateTransaction.execute({
        stateUpdate: () => {},
        dbOperation: async () => {},
        rollback: () => {},
      });

      expect(StateTransaction.getRecentTransactions()).toHaveLength(1);

      StateTransaction.clearTransactionLog();
      expect(StateTransaction.getRecentTransactions()).toHaveLength(0);
    });
  });

  describe('transaction statistics', () => {
    it('should track transaction statistics', async () => {
      await StateTransaction.execute({
        stateUpdate: () => {},
        dbOperation: async () => 'success',
        rollback: () => {},
      });

      await StateTransaction.execute({
        stateUpdate: () => {},
        dbOperation: async () => {
          throw new Error('Failed');
        },
        rollback: () => {},
      });

      const stats = StateTransaction.getTransactionStats();
      expect(stats.total).toBe(2);
      expect(stats.successful).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.rolledBack).toBe(1);
    });

    it('should calculate average duration', async () => {
      await StateTransaction.execute({
        stateUpdate: () => {},
        dbOperation: async () => {
          await new Promise(resolve => setTimeout(resolve, 10));
        },
        rollback: () => {},
      });

      const stats = StateTransaction.getTransactionStats();
      expect(stats.averageDuration).toBeGreaterThan(0);
    });
  });

  describe('active transactions', () => {
    it('should track active transactions', async () => {
      const promise = StateTransaction.execute({
        stateUpdate: () => {},
        dbOperation: async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
        },
        rollback: () => {},
      });

      expect(StateTransaction.hasActiveTransactions()).toBe(true);

      await promise;

      expect(StateTransaction.hasActiveTransactions()).toBe(false);
    });

    it('should wait for active transactions', async () => {
      const promise = StateTransaction.execute({
        stateUpdate: () => {},
        dbOperation: async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
        },
        rollback: () => {},
      });

      const waited = await StateTransaction.waitForActiveTransactions(1000);
      expect(waited).toBe(true);
    });

    it('should timeout waiting for transactions', async () => {
      const promise = StateTransaction.execute({
        stateUpdate: () => {},
        dbOperation: async () => {
          await new Promise(resolve => setTimeout(resolve, 200));
        },
        rollback: () => {},
      });

      const waited = await StateTransaction.waitForActiveTransactions(50);
      expect(waited).toBe(false);

      await promise; // Clean up
    });
  });
});
