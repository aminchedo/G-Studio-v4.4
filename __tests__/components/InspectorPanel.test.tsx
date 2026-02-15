import React from 'react';
import { render, screen } from '@testing-library/react';
import { InspectorPanel } from '@/components/InspectorPanel';
import { FileData } from '@/types/types';

describe('InspectorPanel', () => {
  const mockFiles: Record<string, FileData> = {
    'test.ts': {
      name: 'test.ts',
      content: 'const x = 1;',
      language: 'typescript'
    }
  };

  const defaultProps = {
    activeFile: 'test.ts',
    files: mockFiles,
    openFiles: ['test.ts'],
    tokenUsage: { prompt: 100, response: 50 }
  };

  it('renders without crashing', () => {
    render(<InspectorPanel {...defaultProps} />);
    expect(screen.getByText('Inspector')).toBeInTheDocument();
  });

  it('displays token usage correctly', () => {
    render(<InspectorPanel {...defaultProps} />);
    expect(screen.getByText(/150/)).toBeInTheDocument(); // Total tokens
  });

  it('displays file information when active file is selected', () => {
    render(<InspectorPanel {...defaultProps} />);
    expect(screen.getByText('test.ts')).toBeInTheDocument();
  });

  it('shows "No file selected" when no active file', () => {
    render(<InspectorPanel {...defaultProps} activeFile={null} />);
    expect(screen.getByText('No file selected')).toBeInTheDocument();
  });
});
