import React, { useState } from "react";
import { sendAgentTelemetry } from "@/utils/agentTelemetry";
import {
  X,
  Code2,
  FileJson,
  Palette,
  FileText,
  Globe,
  FileCode,
  Plus,
} from "lucide-react";

export interface EditorTabsProps {
  openFiles: string[];
  activeFile: string | null;
  onFileSelect: (filename: string) => void;
  onFileClose: (filename: string) => void;
  onCreateFile?: () => void;
}

const getIcon = (filename: string) => {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "tsx":
    case "ts":
      return <Code2 strokeWidth={1.5} className="w-3.5 h-3.5 text-ocean-500" />;
    case "json":
      return (
        <FileJson strokeWidth={1.5} className="w-3.5 h-3.5 text-orange-500" />
      );
    case "css":
      return (
        <Palette strokeWidth={1.5} className="w-3.5 h-3.5 text-pink-500" />
      );
    case "html":
      return (
        <Globe strokeWidth={1.5} className="w-3.5 h-3.5 text-emerald-500" />
      );
    case "js":
    case "jsx":
      return (
        <FileCode strokeWidth={1.5} className="w-3.5 h-3.5 text-amber-500" />
      );
    default:
      return (
        <FileText strokeWidth={1.5} className="w-3.5 h-3.5 text-slate-400" />
      );
  }
};

export const EditorTabs: React.FC<EditorTabsProps> = React.memo(
  ({ openFiles, activeFile, onFileSelect, onFileClose, onCreateFile }) => {
    const [draggedTab, setDraggedTab] = useState<string | null>(null);

    const handleDragStart = (e: React.DragEvent, file: string) => {
      setDraggedTab(file);
      e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: React.DragEvent, targetFile: string) => {
      e.preventDefault();
      if (draggedTab && draggedTab !== targetFile) {
        // In a real app, this would reorder tabs
        console.log("Reordering tabs:", draggedTab, "to", targetFile);
      }
      setDraggedTab(null);
    };

    if (openFiles.length === 0 && !onCreateFile) return null;

    return (
      <div className="flex bg-slate-900/80 backdrop-blur-md border-b border-slate-800/60 pt-2 px-2 gap-1 overflow-x-auto h-[44px] select-none no-scrollbar items-end z-20">
        {onCreateFile && (
          <button
            onClick={onCreateFile}
            className="flex items-center justify-center w-8 h-8 rounded-md hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 transition-colors mb-1"
            title="New File"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
        {openFiles.map((file) => {
          const isActive = activeFile === file;
          return (
            <div
              key={file}
              draggable
              onDragStart={(e) => handleDragStart(e, file)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, file)}
              onClick={() => {
                sendAgentTelemetry({
                  location: "EditorTabs.tsx:36",
                  message: "Editor tab clicked",
                  data: { file, isActive: activeFile === file },
                  hypothesisId: "H",
                });
                onFileSelect(file);
              }}
              className={`group relative flex items-center gap-2 px-4 py-2.5 min-w-[120px] max-w-[200px] cursor-pointer transition-all duration-200 rounded-t-lg border-t border-x text-[11px] font-medium ${
                isActive
                  ? "bg-slate-950 text-purple-400 border-b-2 border-purple-500 shadow-sm h-[36px]"
                  : "bg-transparent border-transparent text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 h-[34px] mb-[1px]"
              } ${draggedTab === file ? "opacity-50" : ""}`}
            >
              <span className="flex-shrink-0 opacity-90">{getIcon(file)}</span>
              <span className="truncate flex-1">{file.split("/").pop()}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  sendAgentTelemetry({
                    location: "EditorTabs.tsx:48",
                    message: "Editor tab close clicked",
                    data: { file },
                    hypothesisId: "I",
                  });
                  if (typeof onFileClose === "function") onFileClose(file);
                }}
                className="p-1 rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100 hover:bg-slate-700/60 text-slate-400"
              >
                <X strokeWidth={1.5} className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    );
  },
);
