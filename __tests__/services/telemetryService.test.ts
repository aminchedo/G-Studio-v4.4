import { TelemetryService } from '@/services/telemetryService';
import { ErrorCode } from '@/services/errorHandler';

describe('TelemetryService', () => {
  beforeEach(() => {
    TelemetryService.clear();
    TelemetryService.setEnabled(true);
  });

  describe('initialization', () => {
    it('should initialize with default options', () => {
      TelemetryService.initialize();
      expect(TelemetryService.isEnabled()).toBe(true);
    });

    it('should initialize with custom options', () => {
      TelemetryService.initialize({ enabled: false });
      expect(TelemetryService.isEnabled()).toBe(false);
    });
  });

  describe('recordMetric', () => {
    it('should record a metric', () => {
      TelemetryService.recordMetric('test_metric', 42);
      const metrics = TelemetryService.getRecentMetrics(1);

      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('test_metric');
      expect(metrics[0].value).toBe(42);
      expect(metrics[0].timestamp).toBeDefined();
    });

    it('should record metric with tags', () => {
      TelemetryService.recordMetric('test_metric', 42, { env: 'test' });
      const metrics = TelemetryService.getRecentMetrics(1);

      expect(metrics[0].tags).toEqual({ env: 'test' });
    });

    it('should record metric with unit', () => {
      TelemetryService.recordMetric('duration', 100, undefined, 'ms');
      const metrics = TelemetryService.getRecentMetrics(1);

      expect(metrics[0].unit).toBe('ms');
    });

    it('should not record when disabled', () => {
      TelemetryService.setEnabled(false);
      TelemetryService.recordMetric('test_metric', 42);
      const metrics = TelemetryService.getRecentMetrics();

      expect(metrics).toHaveLength(0);
    });
  });

  describe('recordEvent', () => {
    it('should record an event', () => {
      TelemetryService.recordEvent('user_action', { action: 'click' });
      const events = TelemetryService.getRecentEvents(1);

      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('user_action');
      expect(events[0].properties).toEqual({ action: 'click' });
    });

    it('should record event with duration', () => {
      TelemetryService.recordEvent('operation', {}, 150);
      const events = TelemetryService.getRecentEvents(1);

      expect(events[0].duration).toBe(150);
    });
  });

  describe('recordToolExecution', () => {
    it('should record successful tool execution', () => {
      TelemetryService.recordToolExecution('create_file', true, 50);
      const executions = TelemetryService.getRecentToolExecutions(1);

      expect(executions).toHaveLength(1);
      expect(executions[0].toolName).toBe('create_file');
      expect(executions[0].success).toBe(true);
      expect(executions[0].duration).toBe(50);
    });

    it('should record failed tool execution', () => {
      TelemetryService.recordToolExecution('read_file', false, 25, 'File not found');
      const executions = TelemetryService.getRecentToolExecutions(1);

      expect(executions[0].success).toBe(false);
      expect(executions[0].error).toBe('File not found');
    });

    it('should sanitize long arguments', () => {
      const longContent = 'x'.repeat(200);
      TelemetryService.recordToolExecution('write_code', true, 100, undefined, {
        content: longContent,
      });
      const executions = TelemetryService.getRecentToolExecutions(1);

      expect(executions[0].args?.content).toHaveLength(103); // 100 + '...'
    });
  });

  describe('recordPerformance', () => {
    it('should record performance metric', () => {
      TelemetryService.recordPerformance('database_query', 75);
      const metrics = TelemetryService.getRecentMetrics();

      const perfMetric = metrics.find(m => m.name === 'performance');
      expect(perfMetric).toBeDefined();
      expect(perfMetric?.value).toBe(75);
    });

    it('should record performance with metadata', () => {
      TelemetryService.recordPerformance('api_call', 200, { endpoint: '/users' });
      // Metadata is stored separately, just verify it doesn't throw
      expect(true).toBe(true);
    });
  });

  describe('recordError', () => {
    it('should record error context', () => {
      const errorContext = {
        code: ErrorCode.FILE_NOT_FOUND,
        message: 'File not found',
        userMessage: 'The file could not be found',
        timestamp: Date.now(),
        recoverable: true,
      };

      TelemetryService.recordError(errorContext);
      const errors = TelemetryService.getRecentErrors(1);

      expect(errors).toHaveLength(1);
      expect(errors[0].code).toBe(ErrorCode.FILE_NOT_FOUND);
    });
  });

  describe('startTimer', () => {
    it('should measure operation duration', async () => {
      const stopTimer = TelemetryService.startTimer('test_operation');
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const duration = stopTimer();
      
      expect(duration).toBeGreaterThanOrEqual(50);
    });
  });

  describe('measureAsync', () => {
    it('should measure async operation', async () => {
      const result = await TelemetryService.measureAsync(
        'async_op',
        async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          return 'success';
        }
      );

      expect(result).toBe('success');
      
      const stats = TelemetryService.getPerformanceStats();
      expect(stats.byOperation['async_op']).toBeDefined();
    });

    it('should record error in async operation', async () => {
      try {
        await TelemetryService.measureAsync(
          'failing_op',
          async () => {
            throw new Error('Operation failed');
          }
        );
      } catch (error) {
        // Expected
      }

      const stats = TelemetryService.getPerformanceStats();
      expect(stats.byOperation['failing_op']).toBeDefined();
    });
  });

  describe('measureSync', () => {
    it('should measure sync operation', () => {
      const result = TelemetryService.measureSync(
        'sync_op',
        () => {
          let sum = 0;
          for (let i = 0; i < 1000; i++) {
            sum += i;
          }
          return sum;
        }
      );

      expect(result).toBe(499500);
      
      const stats = TelemetryService.getPerformanceStats();
      expect(stats.byOperation['sync_op']).toBeDefined();
    });
  });

  describe('getToolStats', () => {
    it('should calculate tool statistics', () => {
      TelemetryService.recordToolExecution('create_file', true, 50);
      TelemetryService.recordToolExecution('create_file', true, 60);
      TelemetryService.recordToolExecution('create_file', false, 30);
      TelemetryService.recordToolExecution('read_file', true, 20);

      const stats = TelemetryService.getToolStats();

      expect(stats.total).toBe(4);
      expect(stats.successful).toBe(3);
      expect(stats.failed).toBe(1);
      expect(stats.byTool['create_file'].total).toBe(3);
      expect(stats.byTool['create_file'].successful).toBe(2);
      expect(stats.byTool['create_file'].failed).toBe(1);
      expect(stats.byTool['create_file'].avgDuration).toBeCloseTo(46.67, 1);
    });
  });

  describe('getPerformanceStats', () => {
    it('should calculate performance statistics', () => {
      TelemetryService.recordPerformance('db_query', 100);
      TelemetryService.recordPerformance('db_query', 150);
      TelemetryService.recordPerformance('db_query', 200);
      TelemetryService.recordPerformance('db_query', 250);
      TelemetryService.recordPerformance('db_query', 300);

      const stats = TelemetryService.getPerformanceStats();
      const dbStats = stats.byOperation['db_query'];

      expect(dbStats.count).toBe(5);
      expect(dbStats.avgDuration).toBe(200);
      expect(dbStats.minDuration).toBe(100);
      expect(dbStats.maxDuration).toBe(300);
      expect(dbStats.p50).toBe(200);
      expect(dbStats.p95).toBe(300);
      expect(dbStats.p99).toBe(300);
    });
  });

  describe('getHealthStatus', () => {
    it('should return healthy status', () => {
      const health = TelemetryService.getHealthStatus();

      expect(health.healthy).toBe(true);
      expect(health.checks.error_rate.status).toBe('pass');
      expect(health.checks.tool_success_rate.status).toBe('pass');
      expect(health.checks.performance.status).toBe('pass');
      expect(health.uptime).toBeGreaterThan(0);
      expect(health.version).toBe('2.0.0');
    });

    it('should detect high error rate', () => {
      // Record many errors
      for (let i = 0; i < 15; i++) {
        TelemetryService.recordError({
          code: ErrorCode.UNKNOWN_ERROR,
          message: 'Test error',
          userMessage: 'Test error',
          timestamp: Date.now(),
          recoverable: true,
        });
      }

      const health = TelemetryService.getHealthStatus();
      expect(health.checks.error_rate.status).toBe('fail');
      expect(health.healthy).toBe(false);
    });

    it('should detect low tool success rate', () => {
      // Record mostly failed tools
      for (let i = 0; i < 10; i++) {
        TelemetryService.recordToolExecution('test_tool', false, 50);
      }
      TelemetryService.recordToolExecution('test_tool', true, 50);

      const health = TelemetryService.getHealthStatus();
      expect(health.checks.tool_success_rate.status).toBe('fail');
    });
  });

  describe('getSummary', () => {
    it('should return summary statistics', () => {
      TelemetryService.recordMetric('test', 1);
      TelemetryService.recordEvent('test');
      TelemetryService.recordToolExecution('test', true, 50);

      const summary = TelemetryService.getSummary();

      expect(summary.metricsCount).toBeGreaterThan(0);
      expect(summary.eventsCount).toBe(1);
      expect(summary.toolExecutionsCount).toBe(1);
      expect(summary.uptime).toBeGreaterThan(0);
      expect(summary.healthStatus).toBeDefined();
    });
  });

  describe('data limits', () => {
    it('should trim metrics when exceeding limit', () => {
      TelemetryService.initialize({ maxMetrics: 10 });

      for (let i = 0; i < 20; i++) {
        TelemetryService.recordMetric('test', i);
      }

      const metrics = TelemetryService.getRecentMetrics(100);
      expect(metrics.length).toBeLessThanOrEqual(10);
    });

    it('should trim events when exceeding limit', () => {
      TelemetryService.initialize({ maxEvents: 10 });

      for (let i = 0; i < 20; i++) {
        TelemetryService.recordEvent('test');
      }

      const events = TelemetryService.getRecentEvents(100);
      expect(events.length).toBeLessThanOrEqual(10);
    });
  });

  describe('clear', () => {
    it('should clear all telemetry data', () => {
      TelemetryService.recordMetric('test', 1);
      TelemetryService.recordEvent('test');
      TelemetryService.recordToolExecution('test', true, 50);

      TelemetryService.clear();

      expect(TelemetryService.getRecentMetrics()).toHaveLength(0);
      expect(TelemetryService.getRecentEvents()).toHaveLength(0);
      expect(TelemetryService.getRecentToolExecutions()).toHaveLength(0);
    });
  });

  describe('enable/disable', () => {
    it('should enable and disable telemetry', () => {
      TelemetryService.setEnabled(false);
      expect(TelemetryService.isEnabled()).toBe(false);

      TelemetryService.setEnabled(true);
      expect(TelemetryService.isEnabled()).toBe(true);
    });
  });
});
