import { expect, afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';
// Polyfill IndexedDB for test environment
import 'fake-indexeddb/auto';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock crypto.randomUUID
if (!global.crypto) {
  global.crypto = {
    randomUUID: () => Math.random().toString(36).substring(2, 15),
  } as Crypto;
}

// Suppress console errors in tests (optional)
if (import.meta.env.TEST) {
  global.console = {
    ...console,
    error: vi.fn(),
    warn: vi.fn(),
  };
}

// Provide a minimal `jest` shim for tests that use Jest globals
if (!(globalThis as any).jest) {
  (globalThis as any).jest = {
    fn: vi.fn,
    spyOn: vi.spyOn,
    mock: (...args: any[]) => (vi as any).mock?.(...args) || vi.fn(),
    clearAllMocks: vi.clearAllMocks,
    resetAllMocks: vi.resetAllMocks,
  };
}
