import React, { useState } from 'react';
import {
  X,
  Cpu,
  Zap,
  Settings,
  Palette,
  Shield,
  Wifi,
  Check,
} from 'lucide-react';
import { ModelId, ModelOption } from '@/types';
import { SUPPORTED_MODELS } from '@/constants';
import { McpStatusPanel } from '@/components/mcp/McpStatusPanel';

interface SettingsModalImprovedProps {
  isOpen: boolean;
  onClose: () => void;
  selectedModel: ModelId;
  onSelectModel: (id: ModelId) => void;
}

type Tab = 'models' | 'connection' | 'mcp' | 'behavior' | 'appearance';

export const SettingsModalImproved: React.FC<SettingsModalImprovedProps> = ({
  isOpen,
  onClose,
  selectedModel,
  onSelectModel,
}) => {
  const [activeTab, setActiveTab] = useState<Tab>('models');

  if (!isOpen) return null;

  const tabs = [
    { id: 'models' as Tab, label: 'AI Models', icon: Cpu, color: 'purple' },
    { id: 'connection' as Tab, label: 'API', icon: Wifi, color: 'blue' },
    { id: 'mcp' as Tab, label: 'MCP Tools', icon: Shield, color: 'green' },
    { id: 'behavior' as Tab, label: 'Behavior', icon: Zap, color: 'amber' },
    { id: 'appearance' as Tab, label: 'Appearance', icon: Palette, color: 'pink' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 backdrop-blur-md bg-black/50" />
      <div
        className="relative bg-slate-900 rounded-2xl border border-white/10 w-full max-w-4xl h-[600px] flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Settings className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Settings</h2>
              <p className="text-xs text-slate-400">Configure G-Studio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body with Tabs - FIXED HEIGHT, NO SCROLLING */}
        <div className="flex-1 flex min-h-0">
          {/* Tab Sidebar */}
          <div className="w-48 border-r border-white/10 p-3 space-y-1 shrink-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const colorClasses = {
                purple: isActive ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' : '',
                blue: isActive ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : '',
                green: isActive ? 'bg-green-500/10 text-green-400 border-green-500/30' : '',
                amber: isActive ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : '',
                pink: isActive ? 'bg-pink-500/10 text-pink-400 border-pink-500/30' : '',
              };
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                    isActive
                      ? `${colorClasses[tab.color]} border`
                      : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Tab Content - SCROLLABLE WITHIN FIXED AREA */}
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto p-6">
              {activeTab === 'models' && (
                <ModelsTab selectedModel={selectedModel} onSelectModel={onSelectModel} />
              )}
              {activeTab === 'connection' && <ConnectionTab />}
              {activeTab === 'mcp' && <McpTab />}
              {activeTab === 'behavior' && <BehaviorTab />}
              {activeTab === 'appearance' && <AppearanceTab />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Tab Components
const ModelsTab: React.FC<{
  selectedModel: ModelId;
  onSelectModel: (id: ModelId) => void;
}> = ({ selectedModel, onSelectModel }) => (
  <div className="space-y-4">
    <div>
      <h3 className="text-sm font-semibold text-white mb-1">Select AI Model</h3>
      <p className="text-xs text-slate-400">Choose the model for your tasks</p>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {SUPPORTED_MODELS.map((model: ModelOption) => (
        <button
          key={model.id}
          onClick={() => onSelectModel(model.id)}
          className={`p-4 rounded-xl border text-left transition-all ${
            selectedModel === model.id
              ? 'bg-purple-500/10 border-purple-500/40 ring-1 ring-purple-500/20'
              : 'bg-slate-800/50 border-white/10 hover:bg-slate-800/70 hover:border-purple-500/20'
          }`}
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-sm font-semibold text-white">{model.name}</span>
            {selectedModel === model.id && (
              <Check className="w-4 h-4 text-purple-400" />
            )}
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">{model.description}</p>
        </button>
      ))}
    </div>
  </div>
);

const ConnectionTab: React.FC = () => (
  <div className="space-y-4">
    <div>
      <h3 className="text-sm font-semibold text-white mb-1">API Configuration</h3>
      <p className="text-xs text-slate-400">Manage your API connections</p>
    </div>
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-slate-300 mb-1.5">Gemini API Key</label>
        <input
          type="password"
          placeholder="Enter your API key..."
          className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="flex items-center justify-between p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <span className="text-xs text-blue-300">API Status: Connected</span>
        <button className="px-3 py-1 text-xs bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/30">
          Test Connection
        </button>
      </div>
    </div>
  </div>
);

const McpTab: React.FC = () => (
  <div className="space-y-4">
    <div>
      <h3 className="text-sm font-semibold text-white mb-1">MCP Tools Status</h3>
      <p className="text-xs text-slate-400">Monitor and test available tools</p>
    </div>
    <McpStatusPanel onTestTool={(tool) => console.log('Testing tool:', tool)} />
  </div>
);

const BehaviorTab: React.FC = () => (
  <div className="space-y-4">
    <div>
      <h3 className="text-sm font-semibold text-white mb-1">Agent Behavior</h3>
      <p className="text-xs text-slate-400">Configure how the AI behaves</p>
    </div>
    <div className="space-y-3">
      <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
        <div>
          <div className="text-sm font-medium text-white">Auto-execute tools</div>
          <div className="text-xs text-slate-400">Let AI use tools automatically</div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input type="checkbox" className="sr-only peer" defaultChecked />
          <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-amber-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
        </label>
      </div>
    </div>
  </div>
);

const AppearanceTab: React.FC = () => (
  <div className="space-y-4">
    <div>
      <h3 className="text-sm font-semibold text-white mb-1">UI Appearance</h3>
      <p className="text-xs text-slate-400">Customize the interface</p>
    </div>
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-slate-300 mb-2">Theme</label>
        <div className="grid grid-cols-2 gap-2">
          {['Dark', 'Light', 'Auto'].map((theme) => (
            <button
              key={theme}
              className="px-4 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-sm text-white hover:bg-slate-800/70 hover:border-pink-500/20"
            >
              {theme}
            </button>
          ))}
        </div>
      </div>
    </div>
  </div>
);