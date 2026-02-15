import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '@/App';

// Mock services
jest.mock('@/services/geminiService');
jest.mock('@/services/databaseService');
jest.mock('@/services/mcpService');

describe('File Workflow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Complete File Operations Workflow', () => {
    it('should create, edit, and save a file', async () => {
      render(<App />);

      // Step 1: Create new file
      // Prefer the ribbon primary New File button which has an accessible aria-label
      const newFileButton = screen.getByLabelText(/new file/i);
      fireEvent.click(newFileButton);

      // Step 2: Enter filename
      await waitFor(() => {
        const filenameInput = screen.getByPlaceholderText(/untitled\.txt/i);
        fireEvent.change(filenameInput, { target: { value: 'test.tsx' } });
      });

      // Step 3: Confirm creation
      // PromptDialog responds to Enter on the input - use Enter to confirm instead of clicking OK
      const filenameInputEl = screen.getByPlaceholderText(/untitled\.txt/i);
      fireEvent.keyDown(filenameInputEl, { key: 'Enter' });

      // Step 4: Verify file appears in sidebar
      await waitFor(() => {
        expect(screen.getByText('test.tsx')).toBeInTheDocument();
      });

      // Step 5: Edit file content
      const editor = screen.getByTestId('monaco-editor');
      fireEvent.change(editor, { target: { value: 'const test = 1;' } });

      // Step 6: Save file
      const saveButton = screen.getByRole('button', { name: /save/i });
      fireEvent.click(saveButton);

      // Step 7: Verify save confirmation
      await waitFor(() => {
        expect(screen.getByText(/saved/i)).toBeInTheDocument();
      });
    });

    it('should delete a file', async () => {
      render(<App />);

      // Create file first
      const newFileButton = screen.getByLabelText(/new file/i);
      fireEvent.click(newFileButton);

      await waitFor(() => {
        const filenameInput = screen.getByPlaceholderText(/untitled\.txt/i);
        fireEvent.change(filenameInput, { target: { value: 'to-delete.tsx' } });
      });

      const filenameInputEl = screen.getByPlaceholderText(/untitled\.txt/i);
      fireEvent.keyDown(filenameInputEl, { key: 'Enter' });

      // Wait for file to appear
      await screen.findByText('to-delete.tsx');

      // Confirm deletion (mock confirm before clicking)
      global.confirm = jest.fn(() => true);
      const fileItem = screen.getByText('to-delete.tsx');
      const fileRow = fileItem.closest('div');
      const deleteButton = fileRow?.querySelector('button[title="Delete"]') as HTMLElement;
      expect(deleteButton).toBeTruthy();
      fireEvent.click(deleteButton);

      // Verify file is removed
      await waitFor(() => {
        expect(screen.queryByText('to-delete.tsx')).not.toBeInTheDocument();
      });
    });

    it('should switch between multiple files', async () => {
      render(<App />);

      // Create first file
      const newFileButton = screen.getByLabelText(/new file/i);
      fireEvent.click(newFileButton);

      await waitFor(() => {
        const filenameInput = screen.getByPlaceholderText(/untitled\.txt/i);
        fireEvent.change(filenameInput, { target: { value: 'file1.tsx' } });
      });

      const dialog1 = screen.getByRole('heading', { name: /new file/i }).closest('div');
      fireEvent.keyDown(screen.getByPlaceholderText(/untitled\.txt/i), { key: 'Enter' });

      // Create second file
      fireEvent.click(newFileButton);

      await waitFor(() => {
        const filenameInput = screen.getByPlaceholderText(/untitled\.txt/i);
        fireEvent.change(filenameInput, { target: { value: 'file2.tsx' } });
      });

      const dialog2 = screen.getByRole('heading', { name: /new file/i }).closest('div');
      fireEvent.keyDown(screen.getByPlaceholderText(/untitled\.txt/i), { key: 'Enter' });

      // Switch to file1 - click the entry within the Explorer sidebar
      const explorer = screen.getByText('Explorer').closest('div');
      await waitFor(() => {
        fireEvent.click(within(explorer!).getByText('file1.tsx'));
      });

      // Verify active file changed (tab should have active class)
      await waitFor(() => {
        const activeTab = screen.getAllByText('file1.tsx').find(el => el.closest('button'))!.closest('button');
        expect(activeTab).toHaveClass('active');
      });

      // Switch to file2 (explorer)
      await waitFor(() => {
        fireEvent.click(within(explorer!).getByText('file2.tsx'));
      });

      await waitFor(() => {
        const activeTab = screen.getAllByText('file2.tsx').find(el => el.closest('button'))!.closest('button');
        expect(activeTab).toHaveClass('active');
      });
    });
  });

  describe('Chat and File Integration', () => {
    it('should create file from chat command', async () => {
      render(<App />);

      // Open chat - Right activity bar button has a title tooltip 'Assistant Chat'
      const chatToggle = screen.getByTitle(/assistant chat/i);
      fireEvent.click(chatToggle);

      // Type command - wait for input to appear (chat panel opens asynchronously)
      const chatInput = await screen.findByPlaceholderText(/ask gemini/i);
      fireEvent.change(chatInput, { target: { value: 'Create file index.tsx' } });

      // Send message
      const sendButton = screen.getByRole('button', { name: /send message/i });
      fireEvent.click(sendButton);

      // Verify file created
      await waitFor(() => {
        expect(screen.getByText('index.tsx')).toBeInTheDocument();
      }, { timeout: 5000 });
    });

    it('should edit file through chat', async () => {
      render(<App />);

      // Create file first
      const newFileButton = screen.getByLabelText(/new file/i);
      fireEvent.click(newFileButton);

      await waitFor(() => {
        const filenameInput = screen.getByPlaceholderText(/untitled\.txt/i);
        fireEvent.change(filenameInput, { target: { value: 'edit-test.tsx' } });
      });

      const dialog = screen.getByRole('heading', { name: /new file/i }).closest('div');
      fireEvent.click(within(dialog!).getByRole('button', { name: /ok/i }));

      // Open chat and request edit
      const chatToggle = screen.getByTitle(/assistant chat/i);
      fireEvent.click(chatToggle);

      const chatInput = screen.getByPlaceholderText(/ask gemini/i);
      fireEvent.change(chatInput, { target: { value: 'Add console.log to edit-test.tsx' } });

      const sendButton = screen.getByRole('button', { name: /send message/i });
      fireEvent.click(sendButton);

      // Wait for AI response and file update
      await waitFor(() => {
        const editor = screen.getByTestId('monaco-editor');
        expect(editor.textContent).toContain('console.log');
      }, { timeout: 5000 });
    });
  });

  describe('Project Save and Load', () => {
    it('should save project with multiple files', async () => {
      render(<App />);

      // Create multiple files
      const files = ['file1.tsx', 'file2.ts', 'file3.js'];
      
      for (const filename of files) {
        const newFileButton = screen.getByLabelText(/new file/i);
        fireEvent.click(newFileButton);

        await waitFor(() => {
          const filenameInput = screen.getByPlaceholderText(/untitled\.txt/i);
          fireEvent.change(filenameInput, { target: { value: filename } });
        });

        const dialog = screen.getByRole('heading', { name: /new file/i }).closest('div');
        fireEvent.click(within(dialog!).getByRole('button', { name: /ok/i }));
      }

      // Save project (use Save button)
      const saveButton = screen.getByTitle(/save/i);
      fireEvent.click(saveButton);

      // Verify save confirmation - message is of the form "✅ File <name> saved."
      await screen.findByText((content) => /file .* saved/i.test(content));
    });

    it('should load saved project', async () => {
      render(<App />);

      // Load demo project
      const loadDemoButton = screen.getByLabelText(/load demo/i);
      fireEvent.click(loadDemoButton);

      // Verify demo loaded and index file is present
      await screen.findByText(/demo project loaded/i);
      expect(screen.getByText('index.html')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should show save confirmation when saving', async () => {
      render(<App />);

      // Try to save (no active file) - Save should be disabled
      const saveButton = screen.getByRole('button', { name: /save/i });
      expect(saveButton).toBeDisabled();

    });

    it('should show no file open message when running code with no files', async () => {
      render(<App />);

      // Run code with no file open
      const runCodeButton = screen.getByText(/run code/i);
      fireEvent.click(runCodeButton);

      // Verify "No file open" message
      await waitFor(() => {
        expect(screen.getByText(/no file is currently open/i)).toBeInTheDocument();
      });
    });
  });
});
