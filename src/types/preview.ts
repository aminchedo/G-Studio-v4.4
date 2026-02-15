/**
 * Preview-specific types for G-Studio v3.0.0
 * 
 * NEW types for enhanced preview features
 */

// Import base types
import type { PreviewConfig as BasePreviewConfig, PreviewError as BasePreviewError } from './additional';

// Re-export for convenience
export type PreviewConfig = BasePreviewConfig;
export type PreviewError = BasePreviewError;

// ==================== PREVIEW RENDERER TYPES ====================

export interface PreviewRenderOptions {
  html: string;
  css?: string;
  javascript?: string;
  config?: PreviewConfig;
  sandbox?: boolean;
  captureErrors?: boolean;
  captureConsole?: boolean;
}

export interface PreviewRenderResult {
  success: boolean;
  errors: PreviewError[];
  warnings: string[];
  consoleOutput: ConsoleMessage[];
  renderTime: number;
}

export interface ConsoleMessage {
  level: 'log' | 'warn' | 'error' | 'info';
  args: any[];
  timestamp: Date;
}

// ==================== HOT RELOAD TYPES ====================

export interface HotReloadConfig {
  enabled: boolean;
  debounceMs: number;
  preserveState?: boolean;
  reloadOnError?: boolean;
  showReloadIndicator?: boolean;
}

export interface HotReloadEvent {
  type: 'reload' | 'error' | 'success';
  timestamp: Date;
  changes?: string[];
  error?: Error;
}

// ==================== SPLIT VIEW TYPES ====================

export interface SplitViewConfig {
  orientation: 'horizontal' | 'vertical';
  ratio: number;
  minSize: number;
  maxSize: number;
  resizable: boolean;
  collapsible?: boolean;
}

export interface SplitViewState {
  leftSize: number;
  rightSize: number;
  isResizing: boolean;
  isCollapsed: boolean;
}

// ==================== RESPONSIVE TESTING TYPES ====================

export interface DevicePreset {
  id: string;
  name: string;
  width: number;
  height: number;
  userAgent?: string;
  pixelRatio?: number;
  touch?: boolean;
}

export interface ResponsiveTestConfig {
  device: DevicePreset;
  orientation: 'portrait' | 'landscape';
  zoom: number;
}

// Common device presets
export const DEVICE_PRESETS: DevicePreset[] = [
  {
    id: 'iphone-14',
    name: 'iPhone 14',
    width: 390,
    height: 844,
    pixelRatio: 3,
    touch: true
  },
  {
    id: 'ipad-pro',
    name: 'iPad Pro',
    width: 1024,
    height: 1366,
    pixelRatio: 2,
    touch: true
  },
  {
    id: 'desktop-hd',
    name: 'Desktop HD',
    width: 1920,
    height: 1080,
    pixelRatio: 1,
    touch: false
  }
];

// ==================== PREVIEW SYNC TYPES ====================

export interface PreviewSyncConfig {
  syncScroll?: boolean;
  syncSelection?: boolean;
  syncCursor?: boolean;
  highlightChanges?: boolean;
}

export interface PreviewSyncState {
  scrollPosition: number;
  cursorPosition?: { line: number; column: number };
  selection?: { start: number; end: number };
}
