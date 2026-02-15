import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Sidebar } from '@/components/Sidebar';
import { ModelId } from '@/types/types';

const mockFiles = {
  'file1.tsx': { name: 'file1.tsx', content: 'content1', language: 'typescript' },
  'file2.ts': { name: 'file2.ts', content: 'content2', language: 'typescript' },
  'file3.js': { name: 'file3.js', content: 'content3', language: 'javascript' },
};

describe('Sidebar Component', () => {
  const mockProps = {
    files: mockFiles,
    selectedModel: ModelId.GeminiFlashLatest,
    onSelectModel: jest.fn(),
    onClearChat: jest.fn(),
    onFileSelect: jest.fn(),
    selectedFile: 'file1.tsx',
    onCreateFile: jest.fn(),
    onDeleteFile: jest.fn(),
    onRenameItem: jest.fn(),
    onOpenSettings: jest.fn(),
    onLoadProject: jest.fn(),
    onTriggerTool: jest.fn(),
    onToggleSidebar: jest.fn(),
    sidebarVisible: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render file list', () => {
      render(<Sidebar {...mockProps} />);
      
      expect(screen.getByText('file1.tsx')).toBeInTheDocument();
      expect(screen.getByText('file2.ts')).toBeInTheDocument();
      expect(screen.getByText('file3.js')).toBeInTheDocument();
    });

    it('should highlight selected file', () => {
      render(<Sidebar {...mockProps} />);
      
      const selectedFile = screen.getByText('file1.tsx').closest('div');
      expect(selectedFile).toHaveClass('bg-primary-50');
    });

    it('should render model selector', () => {
      render(<Sidebar {...mockProps} />);
      
      expect(screen.getByText(/gemini-pro/i)).toBeInTheDocument();
    });
  });

  describe('File Operations', () => {
    it('should call onFileSelect when file is clicked', () => {
      render(<Sidebar {...mockProps} />);
      
      fireEvent.click(screen.getByText('file2.ts'));
      
      expect(mockProps.onFileSelect).toHaveBeenCalledWith('file2.ts');
    });

    it('should call onCreateFile when create button is clicked', () => {
      render(<Sidebar {...mockProps} />);
      
      const createButton = screen.getByRole('button', { name: /new file/i });
      fireEvent.click(createButton);
      
      expect(mockProps.onCreateFile).toHaveBeenCalled();
    });

    it('should call onDeleteFile when delete is clicked', () => {
      render(<Sidebar {...mockProps} />);
      
      const deleteButton = screen.getAllByRole('button', { name: /delete/i })[0];
      fireEvent.click(deleteButton);
      
      expect(mockProps.onDeleteFile).toHaveBeenCalled();
    });
  });

  describe('Model Selection', () => {
    it('should call onSelectModel when model changes', () => {
      render(<Sidebar {...mockProps} />);
      
      const modelSelector = screen.getByRole('combobox');
      fireEvent.change(modelSelector, { target: { value: 'gemini-ultra' } });
      
      expect(mockProps.onSelectModel).toHaveBeenCalledWith('gemini-ultra');
    });
  });

  describe('Empty State', () => {
    it('should show empty state when no files', () => {
      render(<Sidebar {...mockProps} files={{}} />);
      
      expect(screen.getByText(/no files/i)).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('should filter files based on search', () => {
      render(<Sidebar {...mockProps} />);
      
      const searchInput = screen.getByPlaceholderText(/search/i);
      fireEvent.change(searchInput, { target: { value: 'file1' } });
      
      expect(screen.getByText('file1.tsx')).toBeInTheDocument();
      expect(screen.queryByText('file2.ts')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should be keyboard navigable', () => {
      render(<Sidebar {...mockProps} />);
      
      const firstFile = screen.getByText('file1.tsx');
      firstFile.focus();
      
      expect(firstFile).toHaveFocus();
    });

    it('should have proper ARIA labels', () => {
      render(<Sidebar {...mockProps} />);
      
      const sidebar = screen.getByRole('navigation') || screen.getByRole('complementary');
      expect(sidebar).toBeInTheDocument();
    });
  });
});
