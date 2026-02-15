// Jest setup file
require('@testing-library/jest-dom');

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
  takeRecords: jest.fn().mockReturnValue([]),
}));

// Mock Monaco Editor
jest.mock('@monaco-editor/react', () => {
  const React = require('react');
  const mockMonaco = {
    languages: {
      registerCompletionItemProvider: jest.fn(() => ({ dispose: jest.fn() })),
      registerCodeActionProvider: jest.fn(() => ({ dispose: jest.fn() })),
      CompletionItemKind: {
        Function: 1,
        Method: 2,
        Variable: 3,
        Class: 4,
        Interface: 5,
        Module: 6,
        Property: 7,
        Keyword: 14,
        Snippet: 15,
      },
      CompletionItemInsertTextRule: {
        InsertAsSnippet: 4,
      }
    },
    IDisposable: {},
  };

  return {
    __esModule: true,
    default: ({ value, onChange, ...props }) => {
      return React.createElement('textarea', {
        'data-testid': 'monaco-editor',
        value: value || '',
        onChange: (e) => onChange && onChange(e.target.value),
        ...props
      });
    },
    useMonaco: jest.fn(() => mockMonaco),
    loader: {
      init: jest.fn(() => Promise.resolve()),
    }
  };
});

// Also mock the underlying monaco-editor to avoid `define is not defined` errors
jest.mock('monaco-editor', () => ({
  editor: {
    create: jest.fn(),
    defineTheme: jest.fn(),
  },
  languages: {
    register: jest.fn(),
    setMonarchTokensProvider: jest.fn(),
    // Minimal CompletionItemKind stub for tests
    CompletionItemKind: {
      Function: 1,
      Method: 2,
      Variable: 3,
      Class: 4,
      Interface: 5,
      Module: 6,
      Property: 7,
      Keyword: 14,
      Snippet: 15,
    },
  },
}));

// Mock prettier to avoid dynamic import issues
jest.mock('prettier', () => ({
  format: jest.fn((code) => code),
  __esModule: true,
}));

jest.mock('prettier/plugins/babel', () => ({
  default: {},
  __esModule: true,
}));

jest.mock('prettier/plugins/typescript', () => ({
  default: {},
  __esModule: true,
}));

// Suppress console errors in tests for known warnings
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
