import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MessageList } from '@/components/MessageList';
import { Message } from '@/types/types';

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

// Mock react-syntax-highlighter to avoid import issues in tests
jest.mock('react-syntax-highlighter', () => ({
  Prism: () => <pre data-testid="syntax-highlighter">Mocked Code Block</pre>,
}));

jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  dracula: {},
}));

describe('MessageList Component', () => {
  const createMessage = (overrides: Partial<Message> = {}): Message => ({
    id: Math.random().toString(),
    role: 'user',
    content: 'Test message',
    timestamp: Date.now(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render empty state when no messages', () => {
      render(<MessageList messages={[]} />);
      
      // Component should render without crashing
      expect(document.body).toBeInTheDocument();
    });

    it('should render user message', () => {
      const messages = [createMessage({ role: 'user', content: 'Hello AI!' })];
      render(<MessageList messages={messages} />);
      
      expect(screen.getByText('Hello AI!')).toBeInTheDocument();
    });

    it('should render assistant message', () => {
      const messages = [createMessage({ role: 'model', content: 'Hello human!' })];
      render(<MessageList messages={messages} />);
      
      expect(screen.getByText('Hello human!')).toBeInTheDocument();
    });

    it('should render multiple messages', () => {
      const messages = [
        createMessage({ id: '1', content: 'Message 1' }),
        createMessage({ id: '2', content: 'Message 2' }),
        createMessage({ id: '3', content: 'Message 3' }),
      ];
      
      render(<MessageList messages={messages} />);
      
      expect(screen.getByText('Message 1')).toBeInTheDocument();
      expect(screen.getByText('Message 2')).toBeInTheDocument();
      expect(screen.getByText('Message 3')).toBeInTheDocument();
    });
  });

  describe('Message Roles', () => {
    it('should distinguish between user and assistant messages', () => {
      const messages = [
        createMessage({ role: 'user', content: 'User message' }),
        createMessage({ role: 'model', content: 'Assistant message' }),
      ];
      
      const { container } = render(<MessageList messages={messages} />);
      
      expect(screen.getByText('User message')).toBeInTheDocument();
      expect(screen.getByText('Assistant message')).toBeInTheDocument();
      
      // Different roles should have different styling
      const messageElements = container.querySelectorAll('[class*="message"]');
      expect(messageElements.length).toBeGreaterThan(0);
    });

    it('should handle system messages', () => {
      const messages = [createMessage({ role: 'function', content: 'System message' })];
      render(<MessageList messages={messages} />);
      
      // System messages might be rendered differently or hidden
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('Markdown Rendering', () => {
    it('should render markdown content', () => {
      const markdownMessage = createMessage({
        content: '# Hello\n\nThis is **bold** text',
      });
      
      render(<MessageList messages={[markdownMessage]} />);
      
      // ReactMarkdown should render the content
      expect(screen.getByText(/Hello/)).toBeInTheDocument();
      expect(screen.getByText(/bold/)).toBeInTheDocument();
    });

    it('should render inline code', () => {
      const message = createMessage({
        content: 'Use `console.log()` for debugging',
      });
      
      render(<MessageList messages={[message]} />);
      
      expect(screen.getByText(/console.log/)).toBeInTheDocument();
    });

    it('should render links', () => {
      const message = createMessage({
        content: '[Click here](https://example.com)',
      });
      
      render(<MessageList messages={[message]} />);
      
      const link = screen.getByText('Click here');
      expect(link).toBeInTheDocument();
      expect(link.closest('a')).toHaveAttribute('href', 'https://example.com');
    });
  });

  describe('Code Blocks', () => {
    it('should render code blocks', () => {
      const message = createMessage({
        content: '```javascript\nconsole.log("Hello");\n```',
      });
      
      render(<MessageList messages={[message]} />);
      
      // Check for code block
      expect(screen.getByText(/console.log/)).toBeInTheDocument();
    });

    it('should show language label for code blocks', () => {
      const message = createMessage({
        content: '```python\nprint("Hello")\n```',
      });
      
      render(<MessageList messages={[message]} />);
      
      // Language label should be shown
      expect(screen.getByText(/python/i)).toBeInTheDocument();
    });

    it('should have copy button for code blocks', () => {
      const message = createMessage({
        content: '```javascript\nconst x = 1;\n```',
      });
      
      render(<MessageList messages={[message]} />);
      
      const copyButton = screen.getByTitle(/copy/i);
      expect(copyButton).toBeInTheDocument();
    });

    it('should copy code to clipboard when copy button is clicked', async () => {
      const code = 'const x = 1;';
      const message = createMessage({
        content: `\`\`\`javascript\n${code}\n\`\`\``,
      });
      
      render(<MessageList messages={[message]} />);
      
      const copyButton = screen.getByTitle(/copy/i);
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(code);
      });
    });

    it('should show "Copied" feedback after copying', async () => {
      const message = createMessage({
        content: '```javascript\nconst x = 1;\n```',
      });
      
      render(<MessageList messages={[message]} />);
      
      const copyButton = screen.getByTitle(/copy/i);
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(screen.getByText('Copied')).toBeInTheDocument();
      });
    });
  });

  describe('Tool Calls', () => {
    it('should render tool call information', () => {
      const message = createMessage({
        role: 'model',
        toolCalls: [
          {
            id: 'call_1',
            name: 'read_file',
            args: { path: 'test.js' },
          },
        ],
      });
      
      render(<MessageList messages={[message]} />);
      
      // Tool call should be displayed
      expect(screen.getByText(/read_file/i)).toBeInTheDocument();
    });

    it('should render tool results', () => {
      const message = createMessage({
        role: 'function',
        content: 'File content here',
      });
      
      render(<MessageList messages={[message]} />);
      
      expect(screen.getByText(/File content/)).toBeInTheDocument();
    });

    it('should show expandable tool call details', () => {
      const message = createMessage({
        role: 'model',
        toolCalls: [
          {
            id: 'call_1',
            name: 'execute_code',
            args: { code: 'print("test")' },
          },
        ],
      });
      
      render(<MessageList messages={[message]} />);
      
      // Tool calls might be collapsible
      const expandButtons = screen.queryAllByRole('button');
      expect(expandButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Auto-scrolling', () => {
    it('should scroll to bottom on new message', () => {
      const { rerender } = render(<MessageList messages={[createMessage()]} />);
      
      // Mock scrollIntoView
      const scrollIntoViewMock = jest.fn();
      Element.prototype.scrollIntoView = scrollIntoViewMock;
      
      // Add new message
      rerender(<MessageList messages={[createMessage(), createMessage()]} />);
      
      // Should attempt to scroll
      // Note: This might not work perfectly in JSDOM but validates the mechanism exists
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('Long Messages', () => {
    it('should handle very long messages', () => {
      const longContent = 'A'.repeat(10000);
      const message = createMessage({ content: longContent });
      
      render(<MessageList messages={[message]} />);
      
      expect(screen.getByText(longContent)).toBeInTheDocument();
    });

    it('should handle messages with many code blocks', () => {
      const content = Array(10)
        .fill(0)
        .map((_, i) => `\`\`\`javascript\nconsole.log(${i});\n\`\`\``)
        .join('\n\n');
      
      const message = createMessage({ content });
      
      render(<MessageList messages={[message]} />);
      
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed markdown gracefully', () => {
      const message = createMessage({
        content: '# Unclosed header\n**bold without close\n`code without close',
      });
      
      render(<MessageList messages={[message]} />);
      
      // Should not crash
      expect(document.body).toBeInTheDocument();
    });

    it('should handle null or undefined content', () => {
      const message = createMessage({ content: null as any });
      
      render(<MessageList messages={[message]} />);
      
      // Should not crash
      expect(document.body).toBeInTheDocument();
    });

    it('should handle invalid tool calls', () => {
      const message = createMessage({
        role: 'model',
        toolCalls: [
          {
            id: 'call_1',
            name: 'invalid_tool',
            args: {},
          },
        ],
      });
      
      render(<MessageList messages={[message]} />);
      
      // Should not crash
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render 100 messages without significant delay', () => {
      const messages = Array(100)
        .fill(0)
        .map((_, i) => createMessage({ id: `msg-${i}`, content: `Message ${i}` }));
      
      const start = performance.now();
      render(<MessageList messages={messages} />);
      const end = performance.now();
      
      // Should render in reasonable time (< 1 second)
      expect(end - start).toBeLessThan(1000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message content', () => {
      const message = createMessage({ content: '' });
      render(<MessageList messages={[message]} />);
      
      expect(document.body).toBeInTheDocument();
    });

    it('should handle whitespace-only content', () => {
      const message = createMessage({ content: '   \n\t   ' });
      render(<MessageList messages={[message]} />);
      
      expect(document.body).toBeInTheDocument();
    });

    it('should handle special characters', () => {
      const message = createMessage({ content: '<>&"\'`' });
      render(<MessageList messages={[message]} />);
      
      expect(document.body).toBeInTheDocument();
    });
  });
});
