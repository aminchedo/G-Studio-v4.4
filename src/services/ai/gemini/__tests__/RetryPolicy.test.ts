import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RetryPolicy } from '../RetryPolicy';
import { GeminiError } from '@/types';

describe('RetryPolicy', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should succeed on first attempt', async () => {
    const policy = new RetryPolicy({
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: ['RATE_LIMIT_EXCEEDED'],
    });

    const successFn = vi.fn().mockResolvedValue('success');
    
    const result = await policy.execute(successFn);
    
    expect(result).toBe('success');
    expect(successFn).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors', async () => {
    const policy = new RetryPolicy({
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: ['RATE_LIMIT_EXCEEDED'],
    });

    const error = new GeminiError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429, true);
    const failTwiceThenSucceed = vi.fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');

    const promise = policy.execute(failTwiceThenSucceed);

    // Fast-forward through retries
    await vi.runAllTimersAsync();

    const result = await promise;

    expect(result).toBe('success');
    expect(failTwiceThenSucceed).toHaveBeenCalledTimes(3);
  });

  it('should not retry non-retryable errors', async () => {
    const policy = new RetryPolicy({
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: ['RATE_LIMIT_EXCEEDED'],
    });

    const error = new GeminiError('Invalid request', 'INVALID_REQUEST', 400, false);
    const failFn = vi.fn().mockRejectedValue(error);

    await expect(policy.execute(failFn)).rejects.toThrow(error);
    expect(failFn).toHaveBeenCalledTimes(1);
  });

  it('should respect max attempts', async () => {
    const policy = new RetryPolicy({
      maxAttempts: 2,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: ['RATE_LIMIT_EXCEEDED'],
    });

    const error = new GeminiError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429, true);
    const alwaysFailFn = vi.fn().mockRejectedValue(error);

    const promise = policy.execute(alwaysFailFn);

    await vi.runAllTimersAsync();

    await expect(promise).rejects.toThrow(error);
    expect(alwaysFailFn).toHaveBeenCalledTimes(2);
  });

  it('should use exponential backoff', async () => {
    const policy = new RetryPolicy({
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      retryableErrors: ['RATE_LIMIT_EXCEEDED'],
    });

    const error = new GeminiError('Rate limit exceeded', 'RATE_LIMIT_EXCEEDED', 429, true);
    const failTwice = vi.fn()
      .mockRejectedValueOnce(error)
      .mockRejectedValueOnce(error)
      .mockResolvedValue('success');

    const onRetry = vi.fn();
    const promise = policy.execute(failTwice, onRetry);

    await vi.runAllTimersAsync();
    await promise;

    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(onRetry).toHaveBeenCalledWith(1, error);
    expect(onRetry).toHaveBeenCalledWith(2, error);
  });
});
