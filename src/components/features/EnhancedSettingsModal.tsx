/**
 * EnhancedSettingsModal - Modular settings interface with 4 configuration tabs
 * Includes AI Settings, MCP Settings, Editor Settings, and UI Settings
 */

import React, { useState, useEffect } from 'react';
import { Settings, Download, Upload, RotateCcw } from 'lucide-react';

interface SettingsState {
  ai: {
    model: string;
    temperature: number;
    maxTokens: number;
    systemPrompt: string;
    responseMode: 'streaming' | 'complete';
  };
  mcp: {
    enabled: boolean;
    servers: Array<{
      id: string;
      name: string;
      enabled: boolean;
      autoStart: boolean;
      customArgs: string;
    }>;
  };
  editor: {
    fontSize: number;
    indentSize: number;
    useSpaces: boolean;
    minimap: boolean;
    autoFormat: boolean;
    autoSave: boolean;
    autoSaveDelay: number;
    lineNumbers: boolean;
  };
  ui: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    leftPanelWidth: number;
    rightPanelWidth: number;
    bottomPanelHeight: number;
    fontFamily: string;
  };
}

interface EnhancedSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialSettings?: Partial<SettingsState>;
  onSettingsSave?: (settings: SettingsState) => void;
}

export const EnhancedSettingsModal: React.FC<EnhancedSettingsModalProps> = ({
  isOpen,
  onClose,
  initialSettings,
  onSettingsSave,
}) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'mcp' | 'editor' | 'ui'>('ai');
  const [settings, setSettings] = useState<SettingsState>(
    initialSettings as any || {
      ai: {
        model: 'gemini-2.0-flash-exp',
        temperature: 0.7,
        maxTokens: 8000,
        systemPrompt: 'You are a helpful AI coding assistant.',
        responseMode: 'streaming',
      },
      mcp: {
        enabled: true,
        servers: [],
      },
      editor: {
        fontSize: 14,
        indentSize: 2,
        useSpaces: true,
        minimap: true,
        autoFormat: true,
        autoSave: true,
        autoSaveDelay: 2000,
        lineNumbers: true,
      },
      ui: {
        theme: 'auto',
        language: 'en',
        leftPanelWidth: 250,
        rightPanelWidth: 300,
        bottomPanelHeight: 200,
        fontFamily: 'Fira Code, monospace',
      },
    }
  );

  const handleSave = () => {
    localStorage.setItem('app-settings', JSON.stringify(settings));
    onSettingsSave?.(settings);
    onClose();
  };

  const handleReset = () => {
    if (confirm('Reset all settings to defaults?')) {
      const defaults: SettingsState = {
        ai: {
          model: 'gemini-2.0-flash-exp',
          temperature: 0.7,
          maxTokens: 8000,
          systemPrompt: 'You are a helpful AI coding assistant.',
          responseMode: 'streaming',
        },
        mcp: {
          enabled: true,
          servers: [],
        },
        editor: {
          fontSize: 14,
          indentSize: 2,
          useSpaces: true,
          minimap: true,
          autoFormat: true,
          autoSave: true,
          autoSaveDelay: 2000,
          lineNumbers: true,
        },
        ui: {
          theme: 'auto',
          language: 'en',
          leftPanelWidth: 250,
          rightPanelWidth: 300,
          bottomPanelHeight: 200,
          fontFamily: 'Fira Code, monospace',
        },
      };
      setSettings(defaults);
    }
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `settings-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = (event: any) => {
        try {
          const imported = JSON.parse(event.target.result);
          setSettings({ ...settings, ...imported });
        } catch (err) {
          alert('Invalid settings file');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-modal__header">
          <div className="settings-modal__title">
            <Settings size={20} />
            Settings
          </div>
          <button
            className="settings-modal__close"
            onClick={onClose}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="settings-modal__tabs">
          <button
            className={`settings-modal__tab ${activeTab === 'ai' ? 'active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            🧠 AI Settings
          </button>
          <button
            className={`settings-modal__tab ${activeTab === 'mcp' ? 'active' : ''}`}
            onClick={() => setActiveTab('mcp')}
          >
            🔧 MCP Settings
          </button>
          <button
            className={`settings-modal__tab ${activeTab === 'editor' ? 'active' : ''}`}
            onClick={() => setActiveTab('editor')}
          >
            ✏️ Editor Settings
          </button>
          <button
            className={`settings-modal__tab ${activeTab === 'ui' ? 'active' : ''}`}
            onClick={() => setActiveTab('ui')}
          >
            🎨 UI Settings
          </button>
        </div>

        {/* Content */}
        <div className="settings-modal__content">
          {/* AI Settings */}
          {activeTab === 'ai' && (
            <div className="settings-section">
              <h3>AI Model Configuration</h3>
              <div className="setting-group">
                <label>Model ID</label>
                <input
                  type="text"
                  value={settings.ai.model}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ai: { ...settings.ai, model: e.target.value },
                    })
                  }
                  placeholder="gemini-2.0-flash-exp"
                />
              </div>

              <div className="setting-group">
                <label>Temperature ({settings.ai.temperature.toFixed(2)})</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={settings.ai.temperature}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ai: { ...settings.ai, temperature: parseFloat(e.target.value) },
                    })
                  }
                />
                <span className="slider-hint">Lower = more deterministic, Higher = more creative</span>
              </div>

              <div className="setting-group">
                <label>Max Tokens</label>
                <input
                  type="number"
                  value={settings.ai.maxTokens}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ai: { ...settings.ai, maxTokens: parseInt(e.target.value) },
                    })
                  }
                  min="100"
                  max="32000"
                />
              </div>

              <div className="setting-group">
                <label>Response Mode</label>
                <select
                  value={settings.ai.responseMode}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ai: { ...settings.ai, responseMode: e.target.value as any },
                    })
                  }
                >
                  <option value="streaming">Streaming</option>
                  <option value="complete">Complete</option>
                </select>
              </div>

              <div className="setting-group">
                <label>System Prompt</label>
                <textarea
                  value={settings.ai.systemPrompt}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ai: { ...settings.ai, systemPrompt: e.target.value },
                    })
                  }
                  rows={4}
                />
              </div>
            </div>
          )}

          {/* MCP Settings */}
          {activeTab === 'mcp' && (
            <div className="settings-section">
              <h3>Model Context Protocol (MCP)</h3>
              <div className="setting-group">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={settings.mcp.enabled}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        mcp: { ...settings.mcp, enabled: e.target.checked },
                      })
                    }
                  />
                  <span>Enable MCP</span>
                </label>
              </div>

              <div className="mcp-servers">
                <h4>Configured Servers</h4>
                {settings.mcp.servers.length === 0 ? (
                  <p className="empty-state">No MCP servers configured yet.</p>
                ) : (
                  settings.mcp.servers.map((server) => (
                    <div key={server.id} className="mcp-server-item">
                      <div className="mcp-server-name">{server.name}</div>
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={server.enabled}
                          onChange={() => {
                            // Update server
                          }}
                        />
                        <span>Enabled</span>
                      </label>
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={server.autoStart}
                          onChange={() => {
                            // Update server
                          }}
                        />
                        <span>Auto-start</span>
                      </label>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Editor Settings */}
          {activeTab === 'editor' && (
            <div className="settings-section">
              <h3>Editor Configuration</h3>
              <div className="setting-group">
                <label>Font Size (px)</label>
                <input
                  type="number"
                  value={settings.editor.fontSize}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      editor: { ...settings.editor, fontSize: parseInt(e.target.value) },
                    })
                  }
                  min="10"
                  max="24"
                />
              </div>

              <div className="setting-group">
                <label>Indent Size</label>
                <select
                  value={settings.editor.indentSize}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      editor: { ...settings.editor, indentSize: parseInt(e.target.value) },
                    })
                  }
                >
                  <option value="2">2 spaces</option>
                  <option value="4">4 spaces</option>
                  <option value="8">8 spaces</option>
                </select>
              </div>

              <div className="setting-group">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={settings.editor.useSpaces}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        editor: { ...settings.editor, useSpaces: e.target.checked },
                      })
                    }
                  />
                  <span>Use Spaces (instead of tabs)</span>
                </label>
              </div>

              <div className="setting-group">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={settings.editor.minimap}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        editor: { ...settings.editor, minimap: e.target.checked },
                      })
                    }
                  />
                  <span>Show Minimap</span>
                </label>
              </div>

              <div className="setting-group">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={settings.editor.autoFormat}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        editor: { ...settings.editor, autoFormat: e.target.checked },
                      })
                    }
                  />
                  <span>Auto Format on Save</span>
                </label>
              </div>

              <div className="setting-group">
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={settings.editor.autoSave}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        editor: { ...settings.editor, autoSave: e.target.checked },
                      })
                    }
                  />
                  <span>Auto Save</span>
                </label>
              </div>

              {settings.editor.autoSave && (
                <div className="setting-group">
                  <label>Auto Save Delay (ms)</label>
                  <input
                    type="number"
                    value={settings.editor.autoSaveDelay}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        editor: { ...settings.editor, autoSaveDelay: parseInt(e.target.value) },
                      })
                    }
                    min="1000"
                    max="30000"
                  />
                </div>
              )}
            </div>
          )}

          {/* UI Settings */}
          {activeTab === 'ui' && (
            <div className="settings-section">
              <h3>User Interface Configuration</h3>
              <div className="setting-group">
                <label>Theme</label>
                <select
                  value={settings.ui.theme}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ui: { ...settings.ui, theme: e.target.value as any },
                    })
                  }
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="auto">Auto (system)</option>
                </select>
              </div>

              <div className="setting-group">
                <label>Language</label>
                <select
                  value={settings.ui.language}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ui: { ...settings.ui, language: e.target.value },
                    })
                  }
                >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="zh">中文</option>
                </select>
              </div>

              <div className="setting-group">
                <label>Font Family</label>
                <input
                  type="text"
                  value={settings.ui.fontFamily}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ui: { ...settings.ui, fontFamily: e.target.value },
                    })
                  }
                  placeholder="Fira Code, monospace"
                />
              </div>

              <h4>Panel Widths</h4>
              <div className="setting-group">
                <label>Left Panel Width (px)</label>
                <input
                  type="number"
                  value={settings.ui.leftPanelWidth}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ui: { ...settings.ui, leftPanelWidth: parseInt(e.target.value) },
                    })
                  }
                  min="200"
                  max="600"
                />
              </div>

              <div className="setting-group">
                <label>Right Panel Width (px)</label>
                <input
                  type="number"
                  value={settings.ui.rightPanelWidth}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ui: { ...settings.ui, rightPanelWidth: parseInt(e.target.value) },
                    })
                  }
                  min="200"
                  max="600"
                />
              </div>

              <div className="setting-group">
                <label>Bottom Panel Height (px)</label>
                <input
                  type="number"
                  value={settings.ui.bottomPanelHeight}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      ui: { ...settings.ui, bottomPanelHeight: parseInt(e.target.value) },
                    })
                  }
                  min="100"
                  max="600"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="settings-modal__footer">
          <div className="settings-modal__actions">
            <button
              className="btn btn-secondary"
              onClick={handleImport}
              title="Import settings from file"
            >
              <Upload size={16} />
              Import
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleExport}
              title="Export settings to file"
            >
              <Download size={16} />
              Export
            </button>
            <button
              className="btn btn-secondary"
              onClick={handleReset}
              title="Reset to defaults"
            >
              <RotateCcw size={16} />
              Reset
            </button>
          </div>
          <div className="settings-modal__buttons">
            <button className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn btn-primary" onClick={handleSave}>
              Save Settings
            </button>
          </div>
        </div>

        <style>{`
          .settings-modal-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 2000;
          }

          .settings-modal {
            background: white;
            border-radius: 8px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
            width: 90%;
            max-width: 700px;
            max-height: 80vh;
            display: flex;
            flex-direction: column;
          }

          .settings-modal__header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 16px 20px;
            border-bottom: 1px solid #eee;
          }

          .settings-modal__title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 18px;
            font-weight: 600;
          }

          .settings-modal__close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #999;
            padding: 0;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 4px;
            transition: all 0.2s;
          }

          .settings-modal__close:hover {
            background: #f0f0f0;
            color: #333;
          }

          .settings-modal__tabs {
            display: flex;
            border-bottom: 1px solid #eee;
            background: #f9f9f9;
          }

          .settings-modal__tab {
            flex: 1;
            padding: 12px 16px;
            border: none;
            background: none;
            cursor: pointer;
            font-size: 13px;
            border-bottom: 2px solid transparent;
            transition: all 0.2s;
            color: #666;
          }

          .settings-modal__tab.active {
            color: #0066cc;
            border-bottom-color: #0066cc;
            background: white;
          }

          .settings-modal__content {
            flex: 1;
            overflow-y: auto;
            padding: 20px;
          }

          .settings-section h3 {
            margin-top: 0;
            margin-bottom: 16px;
            font-size: 15px;
            font-weight: 600;
          }

          .settings-section h4 {
            margin-top: 16px;
            margin-bottom: 12px;
            font-size: 13px;
            font-weight: 600;
            color: #666;
          }

          .setting-group {
            margin-bottom: 16px;
            display: flex;
            flex-direction: column;
            gap: 6px;
          }

          .setting-group label {
            font-size: 13px;
            font-weight: 500;
            color: #333;
          }

          .setting-group input[type="text"],
          .setting-group input[type="number"],
          .setting-group select,
          .setting-group textarea {
            padding: 8px 12px;
            border: 1px solid #ccc;
            border-radius: 4px;
            font-size: 13px;
            font-family: inherit;
          }

          .setting-group input[type="range"] {
            width: 100%;
          }

          .slider-hint {
            font-size: 11px;
            color: #999;
          }

          .setting-group input[type="text"]:focus,
          .setting-group input[type="number"]:focus,
          .setting-group select:focus,
          .setting-group textarea:focus {
            outline: none;
            border-color: #0066cc;
            box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
          }

          .setting-group.checkbox {
            flex-direction: row;
            align-items: center;
            gap: 8px;
          }

          .checkbox {
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            font-weight: normal;
          }

          .checkbox input[type="checkbox"] {
            width: auto;
          }

          .mcp-servers {
            margin-top: 12px;
          }

          .empty-state {
            text-align: center;
            color: #999;
            font-size: 13px;
            padding: 16px 0;
          }

          .mcp-server-item {
            padding: 12px;
            border: 1px solid #eee;
            border-radius: 4px;
            margin-bottom: 8px;
          }

          .mcp-server-name {
            font-weight: 500;
            margin-bottom: 8px;
          }

          .settings-modal__footer {
            padding: 16px 20px;
            border-top: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f9f9f9;
            gap: 12px;
          }

          .settings-modal__actions {
            display: flex;
            gap: 8px;
          }

          .settings-modal__buttons {
            display: flex;
            gap: 8px;
          }

          .btn {
            padding: 8px 16px;
            border: 1px solid #ccc;
            border-radius: 4px;
            background: white;
            cursor: pointer;
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 6px;
            white-space: nowrap;
          }

          .btn:hover {
            border-color: #999;
          }

          .btn-primary {
            background: #0066cc;
            color: white;
            border-color: #0066cc;
          }

          .btn-primary:hover {
            background: #0052a3;
            border-color: #0052a3;
          }

          .btn-secondary {
            background: white;
            color: #333;
          }
        `}</style>
      </div>
    </div>
  );
};
