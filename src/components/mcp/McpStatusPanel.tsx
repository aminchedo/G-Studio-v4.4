import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Tool, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface Tool {
  name: string;
  description: string;
  available: boolean;
}

interface McpStatusPanelProps {
  onTestTool?: (toolName: string) => void;
}

export const McpStatusPanel: React.FC<McpStatusPanelProps> = ({ onTestTool }) => {
  const [connected, setConnected] = useState(false);
  const [tools, setTools] = useState<Tool[]>([]);
  const [testing, setTesting] = useState<string | null>(null);

  // Available MCP tools
  const mcpTools: Tool[] = [
    { name: 'create_file', description: 'Create new files', available: true },
    { name: 'read_file', description: 'Read file contents', available: true },
    { name: 'edit_file', description: 'Edit existing files', available: true },
    { name: 'delete_file', description: 'Delete files', available: true },
    { name: 'search_files', description: 'Search in files', available: true },
    { name: 'run', description: 'Execute commands', available: true },
  ];

  useEffect(() => {
    setTools(mcpTools);
    // Simulate connection check
    setConnected(true);
  }, []);

  const handleTestTool = async (toolName: string) => {
    setTesting(toolName);
    setTimeout(() => {
      setTesting(null);
      onTestTool?.(toolName);
    }, 1000);
  };

  return (
    <div className="bg-slate-800/50 rounded-xl border border-white/10 p-4 space-y-4">
      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {connected ? (
            <Wifi className="w-5 h-5 text-green-400" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-400" />
          )}
          <span className="text-sm font-medium text-white">
            MCP Status: {connected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
        <span className={`text-xs px-2 py-1 rounded ${connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
          {connected ? 'Active' : 'Offline'}
        </span>
      </div>

      {/* Available Tools */}
      <div>
        <h4 className="text-xs font-semibold text-slate-300 mb-2 uppercase tracking-wide">
          Available Tools ({tools.filter(t => t.available).length}/{tools.length})
        </h4>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {tools.map((tool) => (
            <div
              key={tool.name}
              className="flex items-center justify-between p-2 rounded bg-slate-700/30 hover:bg-slate-700/50 transition-colors group"
            >
              <div className="flex items-center gap-2 flex-1">
                <Tool className="w-4 h-4 text-purple-400" />
                <div className="flex-1">
                  <div className="text-xs font-medium text-white">{tool.name}</div>
                  <div className="text-[10px] text-slate-400">{tool.description}</div>
                </div>
              </div>
              <button
                onClick={() => handleTestTool(tool.name)}
                disabled={!tool.available || testing === tool.name}
                className="px-2 py-1 text-xs rounded bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 disabled:opacity-50 transition-colors"
              >
                {testing === tool.name ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  'Test'
                )}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Agent Communication Test */}
      <div className="border-t border-white/10 pt-3">
        <button
          onClick={() => onTestTool?.('agent_ping')}
          className="w-full px-3 py-2 bg-purple-600/20 text-purple-400 rounded-lg hover:bg-purple-600/30 transition-colors text-sm font-medium"
        >
          Test Agent Communication
        </button>
      </div>
    </div>
  );
};