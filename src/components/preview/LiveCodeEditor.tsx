/**
 * LiveCodeEditor - Live preview code editor placeholder
 */
import React from "react";

interface LiveCodeEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  language?: string;
}

export const LiveCodeEditor: React.FC<LiveCodeEditorProps> = () => {
  return (
    <div className="live-code-editor min-h-[200px] bg-bgSecondary rounded border border-borderSubtle" />
  );
};
