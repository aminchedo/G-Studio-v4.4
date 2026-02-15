/**
 * Code Intelligence Dashboard - Enhanced visualization of code intelligence data
 * Features: Beautiful UI, responsive design, interactive visualizations, tab icons
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, AlertTriangle, CheckCircle, Info, 
  FileCode, GitBranch, TrendingUp, Clock,
  X, RefreshCw, Settings, BarChart3,
  LayoutDashboard, GitCompare, Network, Calendar,
  Map, Network as Graph, Grid3x3, FolderTree, Brain,
  Maximize2, Minimize2, Download, Filter
} from 'lucide-react';
import { 
  BreakingChangeReport, 
  ChangeReport, 
  DependencyGraph,
  Snapshot,
  AIAnalysisReport
} from '@/types/codeIntelligence';
import { CodeIntelligenceTimeline } from '@/components/CodeIntelligenceTimeline';
import { CodeIntelligenceImpactMap } from '@/components/CodeIntelligenceImpactMap';
import { DependencyGraph as DependencyGraphComponent } from '@/components/DependencyGraph';
import { ImpactHeatmap } from '@/components/ImpactHeatmap';
import { ProjectTree } from '@/components/layout/ProjectTree';

interface CodeIntelligenceDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  api: any; // CodeIntelligenceAPI instance
}

type TabType = 'overview' | 'changes' | 'dependencies' | 'timeline' | 'impact-map' | 'graph' | 'heatmap' | 'tree' | 'ai-analysis';

interface TabConfig {
  id: TabType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const TABS: TabConfig[] = [
  { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" />, description: 'Project summary and statistics' },
  { id: 'changes', label: 'Changes', icon: <GitCompare className="w-4 h-4" />, description: 'Breaking changes and modifications' },
  { id: 'dependencies', label: 'Dependencies', icon: <Network className="w-4 h-4" />, description: 'Dependency relationships' },
  { id: 'timeline', label: 'Timeline', icon: <Calendar className="w-4 h-4" />, description: 'Change history over time' },
  { id: 'impact-map', label: 'Impact Map', icon: <Map className="w-4 h-4" />, description: 'Visual dependency impact map' },
  { id: 'graph', label: 'Graph', icon: <Graph className="w-4 h-4" />, description: 'Interactive dependency graph' },
  { id: 'heatmap', label: 'Heatmap', icon: <Grid3x3 className="w-4 h-4" />, description: 'Impact heatmap visualization' },
  { id: 'tree', label: 'Tree', icon: <FolderTree className="w-4 h-4" />, description: 'Project file structure' },
  { id: 'ai-analysis', label: 'AI Analysis', icon: <Brain className="w-4 h-4" />, description: 'AI-powered insights' },
];

export const CodeIntelligenceDashboard: React.FC<CodeIntelligenceDashboardProps> = ({
  isOpen,
  onClose,
  api
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [breakingChangeReport, setBreakingChangeReport] = useState<BreakingChangeReport | null>(null);
  const [dependencyGraph, setDependencyGraph] = useState<DependencyGraph | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [aiReports, setAiReports] = useState<AIAnalysisReport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      disconnectWebSocket();
    };
  }, [isOpen]);

  // ESC key handler
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load dependency graph
      const graph = api.getDependencyGraph();
      setDependencyGraph(graph);

      // Load snapshots
      const snapshotList = api.listSnapshots();
      setSnapshots(snapshotList);

      // Load AI reports
      const reports = api.getAIAnalysisReports();
      setAiReports(reports);

      // Try to detect breaking changes
      try {
        const changeReport = await api.detectBreakingChangesFromLatest();
        setBreakingChangeReport(changeReport);
      } catch (error) {
        console.warn('Failed to detect breaking changes:', error);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSnapshot = async () => {
    setIsLoading(true);
    try {
      await api.createSnapshot();
      await loadData();
    } catch (error) {
      console.error('Failed to create snapshot:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const connectWebSocket = () => {
    try {
      // Use environment variable or fallback to default
      const wsHost = import.meta.env.VITE_WS_HOST || 'localhost:3001';
      const wsUrl = `ws://${wsHost}/ws`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('[Dashboard] WebSocket connected');
        setWsConnected(true);
        ws.send(JSON.stringify({ type: 'subscribe', paths: [] }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'file_changed' || data.type === 'snapshot_created') {
            loadData();
          }
        } catch (error) {
          console.error('[Dashboard] Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('[Dashboard] WebSocket error:', error);
        setWsConnected(false);
      };

      ws.onclose = () => {
        console.log('[Dashboard] WebSocket disconnected');
        setWsConnected(false);
        setTimeout(() => {
          if (isOpen) {
            connectWebSocket();
          }
        }, 3000);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[Dashboard] Failed to create WebSocket connection:', error);
      setWsConnected(false);
    }
  };

  const disconnectWebSocket = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
      setWsConnected(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className={`fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 transition-all duration-300 ${
        isFullscreen ? 'p-0' : ''
      }`}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className={`
          bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900
          border border-slate-200/70 dark:border-slate-700/70 shadow-2xl rounded-xl
          flex flex-col transition-all duration-300
          ${isFullscreen ? 'w-full h-full rounded-none' : 'w-full max-w-7xl h-[92vh]'}
        `}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Enhanced Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200/70 dark:border-slate-700/70 bg-gradient-to-r from-purple-50/50 to-indigo-50/50 dark:from-purple-900/20 dark:to-indigo-900/20">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg shadow-lg">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                Code Intelligence Dashboard
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time code analysis and visualization
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
              title={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            >
              {isFullscreen ? <Minimize2 className="w-5 h-5 text-slate-600 dark:text-slate-300" /> : <Maximize2 className="w-5 h-5 text-slate-600 dark:text-slate-300" />}
            </button>
            <button
              onClick={handleCreateSnapshot}
              disabled={isLoading}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="font-medium">Create Snapshot</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>

        {/* Enhanced Tabs with Icons */}
        <div className="flex border-b border-slate-200/70 dark:border-slate-700/70 bg-white/50 dark:bg-slate-800/50 overflow-x-auto scrollbar-hide">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
                group relative flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all duration-200 whitespace-nowrap
                ${activeTab === tab.id
                  ? 'text-purple-600 dark:text-purple-400 bg-gradient-to-b from-purple-50/50 to-transparent dark:from-purple-900/20 border-b-2 border-purple-600 dark:border-purple-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50/50 dark:hover:bg-slate-700/30'
                }
              `}
              title={tab.description}
            >
              <span className={activeTab === tab.id ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500 dark:text-slate-400'}>
                {tab.icon}
              </span>
              <span>{tab.label}</span>
              {activeTab === tab.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-purple-600 to-indigo-600" />
              )}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-3 px-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                {wsConnected ? 'Live' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Enhanced Content Area */}
        <div className="flex-1 overflow-hidden relative">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm z-10">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <RefreshCw className="w-12 h-12 animate-spin text-purple-600" />
                  <div className="absolute inset-0 w-12 h-12 border-4 border-purple-200 rounded-full animate-ping opacity-75" />
                </div>
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Loading dashboard data...</p>
              </div>
            </div>
          ) : (
            <div className="h-full overflow-y-auto p-6 bg-gradient-to-br from-slate-50/30 via-white to-slate-50/30 dark:from-slate-900/30 dark:via-slate-800 dark:to-slate-900/30">
              {activeTab === 'overview' && <OverviewTab 
                breakingChangeReport={breakingChangeReport}
                dependencyGraph={dependencyGraph}
                snapshots={snapshots}
              />}
              {activeTab === 'changes' && <ChangesTab breakingChangeReport={breakingChangeReport} />}
              {activeTab === 'dependencies' && <DependenciesTab dependencyGraph={dependencyGraph} />}
              {activeTab === 'timeline' && <TimelineTab 
                breakingChangeReports={breakingChangeReport ? [breakingChangeReport] : []}
                snapshots={snapshots}
              />}
              {activeTab === 'impact-map' && <ImpactMapTab dependencyGraph={dependencyGraph} />}
              {activeTab === 'graph' && <GraphTab 
                dependencyGraph={dependencyGraph}
                selectedFile={selectedFile}
                onFileSelect={setSelectedFile}
              />}
              {activeTab === 'heatmap' && <HeatmapTab dependencyGraph={dependencyGraph} />}
              {activeTab === 'tree' && <TreeTab 
                files={api.getAllFileMetadata()}
                cpg={api.getCPG()}
                onFileSelect={setSelectedFile}
                searchQuery={searchQuery}
              />}
              {activeTab === 'ai-analysis' && <AIAnalysisTab aiReports={aiReports} />}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Enhanced Overview Tab
const OverviewTab: React.FC<{
  breakingChangeReport: BreakingChangeReport | null;
  dependencyGraph: DependencyGraph | null;
  snapshots: Snapshot[];
}> = ({ breakingChangeReport, dependencyGraph, snapshots }) => {
  const totalFiles = dependencyGraph ? Object.keys(dependencyGraph.nodes).length : 0;
  const circularDeps = dependencyGraph?.circularDependencies.length || 0;
  const totalDependencies = dependencyGraph ? Object.values(dependencyGraph.nodes).reduce((sum, node) => sum + node.dependencies.length, 0) : 0;

  return (
    <div className="space-y-6">
      {/* Enhanced Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FileCode className="w-6 h-6" />}
          label="Total Files"
          value={totalFiles.toString()}
          color="from-blue-500 to-cyan-500"
          bgColor="from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20"
        />
        <StatCard
          icon={<GitBranch className="w-6 h-6" />}
          label="Dependencies"
          value={totalDependencies.toString()}
          color="from-indigo-500 to-purple-500"
          bgColor="from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20"
        />
        <StatCard
          icon={<AlertTriangle className="w-6 h-6" />}
          label="Circular Deps"
          value={circularDeps.toString()}
          color={circularDeps > 0 ? "from-red-500 to-orange-500" : "from-emerald-500 to-teal-500"}
          bgColor={circularDeps > 0 ? "from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20" : "from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20"}
        />
        <StatCard
          icon={<Clock className="w-6 h-6" />}
          label="Snapshots"
          value={snapshots.length.toString()}
          color="from-purple-500 to-pink-500"
          bgColor="from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20"
        />
      </div>

      {/* Breaking Changes Summary */}
      {breakingChangeReport && (
        <div className="bg-gradient-to-br from-amber-50 via-white to-amber-50/30 dark:from-amber-900/20 dark:via-slate-800 dark:to-amber-900/10 rounded-xl p-6 border border-amber-200/50 dark:border-amber-800/50 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Breaking Changes Summary</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricBox
              label="Total"
              value={breakingChangeReport.summary.total}
              color="text-slate-700 dark:text-slate-300"
            />
            <MetricBox
              label="Safe"
              value={breakingChangeReport.summary.safe}
              color="text-emerald-600 dark:text-emerald-400"
              icon={<CheckCircle className="w-4 h-4" />}
            />
            <MetricBox
              label="Risky"
              value={breakingChangeReport.summary.risky}
              color="text-amber-600 dark:text-amber-400"
              icon={<AlertTriangle className="w-4 h-4" />}
            />
            <MetricBox
              label="Breaking"
              value={breakingChangeReport.summary.breaking}
              color="text-red-600 dark:text-red-400"
              icon={<AlertTriangle className="w-4 h-4" />}
            />
          </div>
        </div>
      )}

      {/* Recent Snapshots */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-purple-600" />
          Recent Snapshots
        </h3>
        <div className="space-y-3">
          {snapshots.slice(0, 5).map((snapshot, idx) => (
            <div 
              key={snapshot.id} 
              className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-700 dark:to-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-bold">
                  {idx + 1}
                </div>
                <div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{snapshot.id}</div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {new Date(snapshot.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/40 rounded-lg">
                <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                  {Object.keys(snapshot.files).length} files
                </span>
              </div>
            </div>
          ))}
          {snapshots.length === 0 && (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No snapshots yet. Create one to start tracking changes.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Enhanced Stat Card
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  bgColor: string;
}> = ({ icon, label, value, color, bgColor }) => {
  return (
    <div className={`bg-gradient-to-br ${bgColor} rounded-xl p-5 border border-slate-200/50 dark:border-slate-700/50 shadow-lg hover:shadow-xl transition-all duration-300`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`p-2.5 bg-gradient-to-br ${color} rounded-lg text-white shadow-md`}>
          {icon}
        </div>
      </div>
      <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-1">{value}</div>
      <div className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</div>
    </div>
  );
};

// Metric Box Component
const MetricBox: React.FC<{
  label: string;
  value: number;
  color: string;
  icon?: React.ReactNode;
}> = ({ label, value, color, icon }) => {
  return (
    <div className="text-center p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      {icon && <div className="flex justify-center mb-2">{icon}</div>}
      <div className={`text-3xl font-bold ${color} mb-1`}>{value}</div>
      <div className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</div>
    </div>
  );
};

// Enhanced Changes Tab
const ChangesTab: React.FC<{
  breakingChangeReport: BreakingChangeReport | null;
}> = ({ breakingChangeReport }) => {
  if (!breakingChangeReport || breakingChangeReport.changes.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
          <Info className="w-12 h-12 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No Changes Detected</h3>
        <p className="text-slate-500 dark:text-slate-400">Create a snapshot to start tracking changes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {breakingChangeReport.changes.map((change, index) => (
        <ChangeCard key={index} change={change} />
      ))}
    </div>
  );
};

// Enhanced Change Card
const ChangeCard: React.FC<{ change: ChangeReport }> = ({ change }) => {
  const riskColors = {
    SAFE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
    RISKY: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-800',
    BREAKING: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300 border-red-200 dark:border-red-800'
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-lg hover:shadow-xl transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <FileCode className="w-5 h-5 text-slate-500" />
            <span className="font-semibold text-slate-900 dark:text-slate-100">{change.filePath}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-bold border ${riskColors[change.riskLevel]}`}>
              {change.riskLevel}
            </span>
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400 ml-8">
            {change.changeType.charAt(0).toUpperCase() + change.changeType.slice(1)}
          </div>
        </div>
      </div>
      <div className="mt-4 space-y-2">
        {change.changes.map((detail, idx) => (
          <div key={idx} className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
            <div className="font-medium text-slate-900 dark:text-slate-100 mb-2">{detail.description}</div>
            {detail.before && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded border-l-2 border-red-500">
                <div className="text-xs font-semibold text-red-700 dark:text-red-400 mb-1">Before:</div>
                <div className="text-sm text-slate-700 dark:text-slate-300 font-mono">{detail.before}</div>
              </div>
            )}
            {detail.after && (
              <div className="mt-2 p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded border-l-2 border-emerald-500">
                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">After:</div>
                <div className="text-sm text-slate-700 dark:text-slate-300 font-mono">{detail.after}</div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// Enhanced Dependencies Tab
const DependenciesTab: React.FC<{
  dependencyGraph: DependencyGraph | null;
}> = ({ dependencyGraph }) => {
  if (!dependencyGraph) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
          <Info className="w-12 h-12 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No Dependency Graph</h3>
        <p className="text-slate-500 dark:text-slate-400">Run indexing to build the dependency graph.</p>
      </div>
    );
  }

  const nodes = Object.values(dependencyGraph.nodes);

  return (
    <div className="space-y-6">
      {dependencyGraph.circularDependencies.length > 0 && (
        <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-50 dark:from-amber-900/20 dark:via-orange-900/20 dark:to-amber-900/20 border-2 border-amber-300 dark:border-amber-700 rounded-xl p-5 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Circular Dependencies</h3>
            <span className="px-2 py-1 bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 rounded-full text-xs font-bold">
              {dependencyGraph.circularDependencies.length}
            </span>
          </div>
          <div className="space-y-2">
            {dependencyGraph.circularDependencies.map((cycle, idx) => (
              <div key={idx} className="text-sm font-mono bg-white dark:bg-slate-800 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                {cycle.join(' → ')}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-lg">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Network className="w-5 h-5 text-indigo-600" />
          Dependency Graph
        </h3>
        <div className="space-y-3 max-h-[600px] overflow-y-auto">
          {nodes.map(node => (
            <div key={node.file} className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all">
              <div className="font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-indigo-500" />
                {node.file}
              </div>
              {node.dependencies.length > 0 && (
                <div className="text-sm mb-2">
                  <span className="font-medium text-slate-600 dark:text-slate-400">Depends on:</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {node.dependencies.map((dep, idx) => (
                      <span key={idx} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded text-xs font-medium">
                        {dep}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {node.dependents.length > 0 && (
                <div className="text-sm">
                  <span className="font-medium text-slate-600 dark:text-slate-400">Used by:</span>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {node.dependents.map((dep, idx) => (
                      <span key={idx} className="px-2 py-1 bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 rounded text-xs font-medium">
                        {dep}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Timeline Tab
const TimelineTab: React.FC<{
  breakingChangeReports: BreakingChangeReport[];
  snapshots?: Snapshot[];
}> = ({ breakingChangeReports, snapshots = [] }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Calendar className="w-6 h-6 text-purple-600" />
          Change Timeline
        </h3>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
        <CodeIntelligenceTimeline 
          breakingChangeReports={breakingChangeReports}
          snapshots={snapshots}
          width={Math.min(1200, window.innerWidth - 200)}
          height={500}
        />
      </div>
    </div>
  );
};

// Impact Map Tab
const ImpactMapTab: React.FC<{
  dependencyGraph: DependencyGraph | null;
}> = ({ dependencyGraph }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Map className="w-6 h-6 text-indigo-600" />
          Impact Map
        </h3>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
        <CodeIntelligenceImpactMap 
          dependencyGraph={dependencyGraph}
          width={Math.min(1200, window.innerWidth - 200)}
          height={600}
        />
      </div>
    </div>
  );
};

// Graph Tab
const GraphTab: React.FC<{
  dependencyGraph: DependencyGraph | null;
  selectedFile: string | null;
  onFileSelect: (file: string) => void;
}> = ({ dependencyGraph, selectedFile, onFileSelect }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Graph className="w-6 h-6 text-purple-600" />
          Dependency Graph
        </h3>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
        <DependencyGraphComponent
          dependencyGraph={dependencyGraph}
          selectedFile={selectedFile || undefined}
          onFileSelect={onFileSelect}
          width={Math.min(1200, window.innerWidth - 200)}
          height={600}
        />
      </div>
    </div>
  );
};

// Heatmap Tab
const HeatmapTab: React.FC<{
  dependencyGraph: DependencyGraph | null;
}> = ({ dependencyGraph }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Grid3x3 className="w-6 h-6 text-orange-600" />
          Impact Heatmap
        </h3>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
        <ImpactHeatmap 
          dependencyGraph={dependencyGraph} 
          width={Math.min(1200, window.innerWidth - 200)} 
          height={600} 
        />
      </div>
    </div>
  );
};

// Tree Tab
const TreeTab: React.FC<{
  files: Record<string, any>;
  cpg: any;
  onFileSelect: (file: string) => void;
  searchQuery: string;
}> = ({ files, cpg, onFileSelect, searchQuery }) => {
  const [query, setQuery] = useState(searchQuery);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <FolderTree className="w-6 h-6 text-emerald-600" />
          Project Structure
        </h3>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Filter className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search files..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
        <ProjectTree
          files={files}
          cpg={cpg}
          onFileSelect={onFileSelect}
          searchQuery={query}
          className="h-[600px]"
        />
      </div>
    </div>
  );
};

// AI Analysis Tab
const AIAnalysisTab: React.FC<{
  aiReports: AIAnalysisReport[];
}> = ({ aiReports }) => {
  if (aiReports.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
          <Brain className="w-12 h-12 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300 mb-2">No AI Analysis Available</h3>
        <p className="text-slate-500 dark:text-slate-400">Breaking changes will trigger AI analysis automatically.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {aiReports.map((report, idx) => (
        <div key={idx} className="bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-purple-900/20 dark:via-slate-800 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <div className="font-semibold text-slate-900 dark:text-slate-100">{report.filePath}</div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                {new Date(report.timestamp).toLocaleString()}
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <div className="font-semibold text-sm mb-2 text-slate-700 dark:text-slate-300">Impact Assessment</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">{report.analysis.impact}</div>
            </div>
            {report.analysis.suggestions.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                <div className="font-semibold text-sm mb-2 text-slate-700 dark:text-slate-300">Suggestions</div>
                <ul className="list-disc list-inside text-sm text-slate-600 dark:text-slate-400 space-y-1">
                  {report.analysis.suggestions.map((suggestion, sidx) => (
                    <li key={sidx}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
              <div className="font-semibold text-sm mb-2 text-slate-700 dark:text-slate-300">Risk Assessment</div>
              <div className="text-sm text-slate-600 dark:text-slate-400">{report.analysis.riskAssessment}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
