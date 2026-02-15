import { useState } from 'react';
import { FileData } from '@/types';

export function useEditorState() {
  const [files, setFiles] = useState<Record<string, FileData>>({});
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [activeFile, setActiveFile] = useState<string | null>(null);

  return { 
    files, 
    setFiles, 
    openFiles, 
    setOpenFiles, 
    activeFile, 
    setActiveFile 
  };
}
