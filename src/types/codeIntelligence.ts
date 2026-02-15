/**
 * Code Intelligence System Type Definitions
 * All types for the non-invasive code intelligence layer
 */

export interface FileMetadata {
  path: string;
  hash: string;
  size: number;
  lines: number;
  language: 'typescript' | 'javascript' | 'tsx' | 'jsx' | 'other';
  lastModified: number;
  indexedAt: number;
}

export interface ASTNode {
  type: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'enum';
  name: string;
  signature?: string;
  parameters?: ParameterInfo[];
  returnType?: string;
  exports?: string[];
  location: {
    start: number;
    end: number;
    line: number;
  };
}

export interface ParameterInfo {
  name: string;
  type: string;
  optional: boolean;
  defaultValue?: string;
}

export interface ASTSnapshot {
  filePath: string;
  hash: string;
  timestamp: number;
  nodes: ASTNode[];
  imports: ImportInfo[];
  exports: ExportInfo[];
  parseErrors?: string[];
}

export interface ImportInfo {
  source: string;
  specifiers: string[];
  isTypeOnly: boolean;
  isExternal: boolean;
}

export interface ExportInfo {
  name: string;
  type: 'named' | 'default' | 'namespace';
  isType: boolean;
}

export interface DependencyNode {
  file: string;
  dependencies: string[];
  dependents: string[];
  isExternal: boolean;
}

export interface DependencyGraph {
  nodes: Record<string, DependencyNode>;
  circularDependencies: string[][];
  externalDependencies: Record<string, string[]>;
  timestamp: number;
}

export interface ChangeReport {
  filePath: string;
  changeType: 'added' | 'removed' | 'modified';
  riskLevel: 'SAFE' | 'RISKY' | 'BREAKING';
  changes: ChangeDetail[];
  timestamp: number;
}

export interface ChangeDetail {
  type: 'export_removed' | 'signature_changed' | 'parameter_changed' | 'return_type_changed' | 'type_changed' | 'internal_change';
  description: string;
  before?: string;
  after?: string;
  affectedSymbols?: string[];
}

export interface Snapshot {
  id: string;
  timestamp: number;
  files: Record<string, FileMetadata>;
  astSnapshots: Record<string, ASTSnapshot>;
  dependencyGraph: DependencyGraph;
}

export interface BreakingChangeReport {
  snapshotId: string;
  timestamp: number;
  changes: ChangeReport[];
  summary: {
    total: number;
    safe: number;
    risky: number;
    breaking: number;
  };
}

export interface AIAnalysisReport {
  filePath: string;
  timestamp: number;
  analysis: {
    impact: string;
    suggestions: string[];
    riskAssessment: string;
  };
  model: string;
}

export interface CodeIntelligenceConfig {
  enabled: boolean;
  autoIndex: boolean;
  watchFiles: boolean;
  aiAnalysisEnabled: boolean;
  snapshotInterval: number; // milliseconds
}

// Code Property Graph (CPG) Types
export interface CPGNode {
  id: string;
  type: 'file' | 'function' | 'class' | 'variable' | 'statement' | 'expression' | 'control-flow';
  name: string;
  filePath: string;
  location?: {
    start: number;
    end: number;
    line: number;
  };
  properties?: Record<string, any>;
}

export interface CPGEdge {
  id: string;
  source: string; // Node ID
  target: string; // Node ID
  type: 'syntax' | 'control-flow' | 'data-flow' | 'call' | 'import' | 'export';
  properties?: Record<string, any>;
}

export interface CodePropertyGraph {
  nodes: Record<string, CPGNode>;
  edges: CPGEdge[];
  fileNodes: Record<string, string[]>; // filePath -> node IDs
  timestamp: number;
}
