# Error Handling Best Practices

## Quick Reference Guide for Robust Error Handling

---

## 1. Promise Rejection Handling

### ❌ DON'T: Leave promises unhandled
```typescript
async function fetchData() {
  const data = await fetch('/api/data');
  return data.json(); // Unhandled rejection if fetch fails
}
```

### ✅ DO: Always wrap in try-catch
```typescript
async function fetchData() {
  try {
    const data = await fetch('/api/data');
    return await data.json();
  } catch (error) {
    console.error('Error fetching data:', error);
    throw error; // Re-throw if caller should handle it
  }
}
```

### ✅ DO: Use .catch() for fire-and-forget
```typescript
async function logEvent() {
  fetch('/api/log', { method: 'POST' })
    .catch(error => {
      // Silently fail - logging is not critical
      console.debug('Logging failed:', error);
    });
}
```

---

## 2. Network Error Handling

### ❌ DON'T: Assume network is always available
```typescript
function sendData(data) {
  fetch('/api/endpoint', {
    method: 'POST',
    body: JSON.stringify(data)
  }); // No error handling
}
```

### ✅ DO: Check availability and retry
```typescript
async function sendData(data, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('/api/endpoint', {
        method: 'POST',
        body: JSON.stringify(data),
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (response.ok) {
        return await response.json();
      }
      
      // Server error, retry
      if (response.status >= 500 && i < retries - 1) {
        await new Promise(resolve => 
          setTimeout(resolve, 1000 * Math.pow(2, i))
        );
        continue;
      }
      
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === retries - 1) {
        console.error('Failed after retries:', error);
        throw error;
      }
      // Retry
      await new Promise(resolve => 
        setTimeout(resolve, 1000 * Math.pow(2, i))
      );
    }
  }
}
```

### ✅ DO: Implement circuit breaker pattern
```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailTime = 0;
  private readonly threshold = 5;
  private readonly timeout = 60000; // 1 minute
  
  async execute(fn: () => Promise<any>) {
    // Check if circuit is open
    if (this.failures >= this.threshold) {
      const timeSinceLastFail = Date.now() - this.lastFailTime;
      if (timeSinceLastFail < this.timeout) {
        throw new Error('Circuit breaker is open');
      }
      // Try to close circuit
      this.failures = 0;
    }
    
    try {
      const result = await fn();
      this.failures = 0; // Reset on success
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailTime = Date.now();
      throw error;
    }
  }
}
```

---

## 3. Async/Await Error Patterns

### Pattern 1: Try-Catch with Cleanup
```typescript
async function processFile(filename: string) {
  let file = null;
  try {
    file = await openFile(filename);
    const data = await readFile(file);
    return processData(data);
  } catch (error) {
    console.error('Error processing file:', error);
    throw error;
  } finally {
    // Always cleanup
    if (file) {
      await closeFile(file);
    }
  }
}
```

### Pattern 2: Multiple Operations
```typescript
async function multiStepOperation() {
  try {
    const step1 = await operation1();
    console.log('Step 1 complete');
    
    const step2 = await operation2(step1);
    console.log('Step 2 complete');
    
    const step3 = await operation3(step2);
    console.log('Step 3 complete');
    
    return step3;
  } catch (error) {
    console.error('Operation failed at step:', error);
    // Rollback if needed
    await rollback();
    throw error;
  }
}
```

### Pattern 3: Parallel Operations
```typescript
async function parallelOperations() {
  try {
    const [result1, result2, result3] = await Promise.all([
      operation1(),
      operation2(),
      operation3()
    ]);
    
    return { result1, result2, result3 };
  } catch (error) {
    console.error('One or more operations failed:', error);
    throw error;
  }
}
```

### Pattern 4: Graceful Degradation
```typescript
async function fetchWithFallback() {
  try {
    return await fetchFromPrimarySource();
  } catch (primaryError) {
    console.warn('Primary source failed, trying fallback:', primaryError);
    
    try {
      return await fetchFromFallbackSource();
    } catch (fallbackError) {
      console.error('Both sources failed:', fallbackError);
      return getDefaultData();
    }
  }
}
```

---

## 4. Error Logging Best Practices

### ✅ DO: Log with context
```typescript
try {
  await operation();
} catch (error) {
  console.error('Operation failed:', {
    operation: 'fetchUserData',
    userId: user.id,
    timestamp: new Date().toISOString(),
    error: error.message,
    stack: error.stack
  });
}
```

### ✅ DO: Use structured logging
```typescript
class Logger {
  error(message: string, context?: any) {
    console.error(JSON.stringify({
      level: 'ERROR',
      message,
      context,
      timestamp: new Date().toISOString(),
      stack: new Error().stack
    }));
  }
  
  warn(message: string, context?: any) {
    console.warn(JSON.stringify({
      level: 'WARN',
      message,
      context,
      timestamp: new Date().toISOString()
    }));
  }
}
```

---

## 5. Network Request Patterns

### Pattern 1: Timeout Handling
```typescript
async function fetchWithTimeout(url: string, timeout = 5000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}
```

### Pattern 2: Retry with Exponential Backoff
```typescript
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = baseDelay * Math.pow(2, i);
      console.log(`Retry ${i + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Should not reach here');
}
```

### Pattern 3: Connection Check
```typescript
async function checkConnection(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 1000);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    });
    
    return response.ok;
  } catch (error) {
    return false;
  }
}
```

---

## 6. Error Types and Handling

### Custom Error Classes
```typescript
class NetworkError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'NetworkError';
  }
}

class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// Usage
try {
  await operation();
} catch (error) {
  if (error instanceof NetworkError) {
    // Handle network errors
    console.error('Network error:', error.statusCode);
  } else if (error instanceof ValidationError) {
    // Handle validation errors
    console.error('Validation error:', error.field);
  } else {
    // Handle unknown errors
    console.error('Unknown error:', error);
  }
}
```

---

## 7. Dependency Management

### Check for Deprecated Packages
```bash
# Check for outdated packages
pnpm outdated

# Check for security vulnerabilities
pnpm audit

# Update all packages
pnpm update

# Update to latest versions (interactive)
npx npm-check-updates -u
pnpm install
```

### Regular Maintenance Schedule
- **Weekly:** Check for security updates
- **Monthly:** Review outdated packages
- **Quarterly:** Major version updates
- **Annually:** Full dependency audit

---

## 8. Testing Error Handling

### Test Network Failures
```typescript
describe('Network error handling', () => {
  it('should retry on failure', async () => {
    const mockFetch = jest.fn()
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ ok: true, json: () => ({}) });
    
    global.fetch = mockFetch;
    
    const result = await retryWithBackoff(() => fetch('/api'));
    
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
  });
});
```

### Test Promise Rejections
```typescript
describe('Promise rejection handling', () => {
  it('should handle rejected promises', async () => {
    const operation = async () => {
      throw new Error('Operation failed');
    };
    
    await expect(operation()).rejects.toThrow('Operation failed');
  });
});
```

---

## Quick Checklist

Before deploying code, verify:

- [ ] All async functions have try-catch blocks
- [ ] Network requests have timeout handling
- [ ] Retry logic for transient failures
- [ ] Proper error logging with context
- [ ] Graceful degradation for non-critical features
- [ ] No deprecated dependencies
- [ ] Error boundaries in React components
- [ ] Circuit breakers for external services
- [ ] Cleanup in finally blocks
- [ ] Custom error types for better handling

---

## Resources

- [MDN: Promise Error Handling](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises#error_handling)
- [Node.js Error Handling Best Practices](https://nodejs.org/en/docs/guides/error-handling/)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Retry Pattern](https://docs.microsoft.com/en-us/azure/architecture/patterns/retry)

---

**Remember:** Good error handling is not about preventing errors, but about handling them gracefully when they occur!
