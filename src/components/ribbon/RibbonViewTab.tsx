import React, { useState, useEffect } from 'react';
import { Terminal, Layers, Activity, ZoomIn, ZoomOut, Layout } from 'lucide-react';
import { InspectorIcon, MinimapIcon, PreviewIcon, FormatIcon } from '@/components/icons';
import { Code2 } from 'lucide-react';
import { RibbonGroup, RibbonDivider, RibbonButton } from './RibbonComponents';

interface RibbonViewTabProps {
  isExpanded: boolean;
  chatVisible: boolean;
  sidebarVisible?: boolean;
  inspectorVisible?: boolean;
  previewVisible?: boolean;
  monitorVisible?: boolean;
  minimapEnabled?: boolean;
  editorVisible?: boolean;
  onToggleChat: () => void;
  onToggleSidebar?: () => void;
  onToggleInspector?: () => void;
  onTogglePreview?: () => void;
  onToggleMonitor?: () => void;
  onToggleMinimap?: () => void;
  onToggleEditor?: () => void;
  onFormatFile?: () => void;
  activeFile?: string | null;
}

export const RibbonViewTab: React.FC<RibbonViewTabProps> = ({
  isExpanded,
  chatVisible,
  sidebarVisible,
  inspectorVisible,
  previewVisible,
  monitorVisible,
  minimapEnabled,
  editorVisible,
  onToggleChat,
  onToggleSidebar,
  onToggleInspector,
  onTogglePreview,
  onToggleMonitor,
  onToggleMinimap,
  onToggleEditor,
  onFormatFile,
  activeFile
}) => {
  const [layout, setLayout] = useState<'default' | 'split' | 'preview' | 'balanced'>('default');
  const [zoomLevel, setZoomLevel] = useState(100);

  // Load layout and zoom from localStorage
  useEffect(() => {
    try {
      const savedLayout = localStorage.getItem('gstudio_view_layout');
      if (savedLayout) {
        setLayout(savedLayout as 'default' | 'split' | 'preview' | 'balanced');
      }
      const savedZoom = localStorage.getItem('gstudio_view_zoom');
      if (savedZoom) {
        setZoomLevel(parseInt(savedZoom) || 100);
      }
    } catch (e) {
      console.warn('Failed to load view settings:', e);
    }
  }, []);

  // Apply zoom level to document
  useEffect(() => {
    document.documentElement.style.zoom = `${zoomLevel}%`;
    try {
      localStorage.setItem('gstudio_view_zoom', zoomLevel.toString());
    } catch (e) {
      console.warn('Failed to save zoom level:', e);
    }
  }, [zoomLevel]);

  // Apply layout
  useEffect(() => {
    try {
      localStorage.setItem('gstudio_view_layout', layout);
      // Apply layout class to body for global layout control
      document.body.className = document.body.className.replace(/layout-\w+/g, '');
      document.body.classList.add(`layout-${layout}`);
    } catch (e) {
      console.warn('Failed to save layout:', e);
    }
  }, [layout]);

  return (
    <div className="flex items-center h-full animate-fade-in gap-10">
      <RibbonGroup label="Panels" isExpanded={isExpanded}>
        <RibbonButton 
          icon={Terminal} 
          label={chatVisible ? "Hide Console" : "Show Console"} 
          onClick={onToggleChat} 
          active={chatVisible}
          color="text-ocean-600"
          isExpanded={isExpanded}
          inactive={false}
        />
        <RibbonButton 
          icon={Layers} 
          label="Sidebar" 
          onClick={onToggleSidebar || undefined} 
          active={sidebarVisible} 
          color="text-ocean-600" 
          isExpanded={isExpanded} 
          inactive={!onToggleSidebar}
        />
        <RibbonButton 
          icon={InspectorIcon} 
          label="Inspector" 
          onClick={onToggleInspector || undefined} 
          active={inspectorVisible} 
          color="text-ocean-600" 
          isExpanded={isExpanded} 
          inactive={!onToggleInspector}
        />
        <RibbonButton 
          icon={Activity} 
          label="Monitor" 
          onClick={onToggleMonitor || undefined} 
          active={monitorVisible} 
          color="text-ocean-600" 
          isExpanded={isExpanded} 
          inactive={!onToggleMonitor}
        />
      </RibbonGroup>
      <RibbonDivider />
      <RibbonGroup label="Editor" isExpanded={isExpanded}>
        <RibbonButton 
          icon={Code2} 
          label={editorVisible ? "Hide Editor" : "Show Editor"} 
          onClick={onToggleEditor || undefined} 
          active={editorVisible}
          color="text-ocean-600" 
          isExpanded={isExpanded}
          inactive={!onToggleEditor}
        />
        <RibbonButton 
          icon={FormatIcon} 
          label="Format" 
          onClick={onFormatFile ? () => { if (activeFile) onFormatFile(); } : undefined} 
          color="text-ocean-600" 
          isExpanded={isExpanded} 
          inactive={!activeFile || !onFormatFile}
        />
        <RibbonButton 
          icon={MinimapIcon} 
          label="Minimap" 
          onClick={onToggleMinimap || undefined} 
          active={minimapEnabled} 
          color="text-ocean-600" 
          isExpanded={isExpanded} 
          inactive={!onToggleMinimap}
        />
        <RibbonButton 
          icon={PreviewIcon} 
          label="Preview" 
          onClick={onTogglePreview || undefined} 
          active={previewVisible} 
          color="text-ocean-600" 
          isExpanded={isExpanded} 
          inactive={!onTogglePreview}
        />
      </RibbonGroup>
      <RibbonDivider />
      <RibbonGroup label="Layout" isExpanded={isExpanded}>
        {isExpanded && (
          <div className="space-y-2">
            <select
              value={layout}
              onChange={(e) => setLayout(e.target.value as 'default' | 'split' | 'preview' | 'balanced')}
              className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="default">Default</option>
              <option value="split">Split View</option>
              <option value="preview">Preview Focus</option>
              <option value="balanced">Balanced</option>
            </select>
          </div>
        )}
        <RibbonButton 
          icon={Layout} 
          label="Layout" 
          onClick={() => {}} 
          color="text-ocean-600" 
          isExpanded={isExpanded}
          inactive={false}
        />
      </RibbonGroup>
      <RibbonDivider />
      <RibbonGroup label="Zoom" isExpanded={isExpanded}>
        {isExpanded && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-slate-300 font-medium min-w-[50px] text-center">{zoomLevel}%</span>
              <button
                onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded text-slate-300"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
            <input
              type="range"
              min="50"
              max="200"
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
          </div>
        )}
        <RibbonButton 
          icon={ZoomIn} 
          label={`${zoomLevel}%`} 
          onClick={() => setZoomLevel(100)} 
          color="text-ocean-600" 
          isExpanded={isExpanded}
          inactive={false}
        />
      </RibbonGroup>
    </div>
  );
};
