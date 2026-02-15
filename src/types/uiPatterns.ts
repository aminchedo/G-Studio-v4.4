/**
 * UI Pattern Library - G Studio
 * 
 * Consistent Tailwind class patterns for all components
 * Use these patterns to ensure visual consistency across the application
 */

export const UIPatterns = {
  // ==================== PANELS ====================
  panel: {
    base: 'bg-white border border-slate-200/60 rounded-xl shadow-lg ring-1 ring-black/5',
    glass: 'bg-white/95 backdrop-blur-sm border border-slate-200/60 rounded-xl shadow-lg ring-1 ring-black/5',
    dark: 'bg-slate-900/95 backdrop-blur-sm border border-slate-700/60 rounded-xl shadow-lg ring-1 ring-white/5',
    hover: 'transition-all duration-200 hover:shadow-xl hover:ring-2 hover:ring-primary-500/20',
    padding: {
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
      xl: 'p-8'
    }
  },

  // ==================== BUTTONS ====================
  button: {
    // Primary button
    primary: 'px-4 py-2 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ring-1 ring-primary-700/50 hover:ring-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
    
    // Secondary button
    secondary: 'px-4 py-2 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ring-1 ring-slate-200 hover:ring-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
    
    // Ghost button
    ghost: 'px-4 py-2 bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-600 hover:text-slate-900 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
    
    // Danger button
    danger: 'px-4 py-2 bg-error-600 hover:bg-error-700 active:bg-error-800 text-white font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 ring-1 ring-error-700/50 hover:ring-error-600 focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed',
    
    // Icon button
    icon: 'p-2 bg-transparent hover:bg-slate-100 active:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2',
    
    // Small size
    sm: 'px-3 py-1.5 text-sm',
    
    // Large size
    lg: 'px-6 py-3 text-base',
  },

  // ==================== INPUTS ====================
  input: {
    base: 'w-full px-3 py-2 bg-white border border-slate-300 rounded-lg shadow-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed',
    error: 'border-error-500 focus:ring-error-500 focus:border-error-500',
    success: 'border-success-500 focus:ring-success-500 focus:border-success-500',
    textarea: 'min-h-[100px] resize-none',
  },

  // ==================== BADGES ====================
  badge: {
    base: 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ring-1 ring-inset',
    primary: 'bg-primary-50 text-primary-700 ring-primary-600/20',
    secondary: 'bg-slate-100 text-slate-700 ring-slate-600/20',
    success: 'bg-success-50 text-success-700 ring-success-600/20',
    warning: 'bg-warning-50 text-warning-700 ring-warning-600/20',
    error: 'bg-error-50 text-error-700 ring-error-600/20',
    info: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  },

  // ==================== CARDS ====================
  card: {
    base: 'bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden',
    interactive: 'cursor-pointer hover:border-primary-300 hover:shadow-lg hover:ring-2 hover:ring-primary-500/20',
    header: 'px-6 py-4 border-b border-slate-200 bg-slate-50/50',
    body: 'px-6 py-4',
    footer: 'px-6 py-4 border-t border-slate-200 bg-slate-50/50',
  },

  // ==================== MODALS ====================
  modal: {
    overlay: 'fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4',
    container: 'bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden ring-1 ring-black/5',
    header: 'px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white',
    body: 'px-6 py-6 overflow-y-auto',
    footer: 'px-6 py-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-end gap-3',
    closeButton: 'absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200',
  },

  // ==================== TABS ====================
  tabs: {
    container: 'flex gap-1 p-1 bg-slate-100 rounded-lg',
    tab: 'px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 rounded-md transition-all duration-200',
    tabActive: 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5',
  },

  // ==================== TOOLTIPS ====================
  tooltip: {
    base: 'absolute z-50 px-2 py-1 text-xs text-white bg-slate-900 rounded-md shadow-lg pointer-events-none',
    arrow: 'absolute w-2 h-2 bg-slate-900 transform rotate-45',
  },

  // ==================== DIVIDERS ====================
  divider: {
    horizontal: 'h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent',
    vertical: 'w-px bg-gradient-to-b from-transparent via-slate-200 to-transparent',
  },

  // ==================== SCROLLBARS ====================
  scrollbar: {
    thin: 'scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 hover:scrollbar-thumb-slate-400',
    custom: '[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-slate-400',
  },

  // ==================== TRANSITIONS ====================
  transition: {
    fast: 'transition-all duration-150 ease-in-out',
    normal: 'transition-all duration-200 ease-in-out',
    slow: 'transition-all duration-300 ease-in-out',
    fadeIn: 'animate-in fade-in duration-200',
    slideIn: 'animate-in slide-in-from-bottom-4 duration-300',
  },

  // ==================== FOCUS STATES ====================
  focus: {
    ring: 'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
    ringInset: 'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500',
  },

  // ==================== TEXT STYLES ====================
  text: {
    heading: 'text-slate-900 font-semibold tracking-tight',
    subheading: 'text-slate-700 font-medium',
    body: 'text-slate-600 leading-relaxed',
    muted: 'text-slate-500 text-sm',
    error: 'text-error-600 text-sm font-medium',
    success: 'text-success-600 text-sm font-medium',
  },

  // ==================== LOADING STATES ====================
  loading: {
    spinner: 'animate-spin h-5 w-5 text-primary-600',
    skeleton: 'animate-pulse bg-slate-200 rounded',
    shimmer: 'relative overflow-hidden before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent',
  },

  // ==================== CHAT SPECIFIC ====================
  chat: {
    messageUser: 'ml-auto max-w-[80%] bg-primary-600 text-white px-4 py-2.5 rounded-2xl rounded-tr-sm shadow-md',
    messageAssistant: 'mr-auto max-w-[80%] bg-white border border-slate-200 text-slate-900 px-4 py-2.5 rounded-2xl rounded-tl-sm shadow-sm',
    messageSystem: 'mx-auto max-w-[90%] bg-slate-100 text-slate-600 px-3 py-2 rounded-lg text-sm text-center',
    inputContainer: 'sticky bottom-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 p-4',
    avatar: 'w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-medium text-sm',
  },

  // ==================== CODE EDITOR SPECIFIC ====================
  editor: {
    container: 'bg-slate-900 rounded-lg overflow-hidden shadow-lg ring-1 ring-black/10',
    toolbar: 'bg-slate-800 border-b border-slate-700 px-4 py-2 flex items-center gap-2',
    tab: 'px-3 py-1.5 text-sm text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-700 rounded-t-lg border-t border-x border-slate-700 transition-colors duration-150',
    tabActive: 'bg-slate-900 text-white border-slate-600',
  },

  // ==================== FILE TREE SPECIFIC ====================
  fileTree: {
    item: 'flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer transition-colors duration-150',
    itemActive: 'bg-primary-50 text-primary-700 font-medium',
    folder: 'font-medium',
    indent: 'pl-4',
  },
} as const;

// Type exports for TypeScript
export type UIPatternKey = keyof typeof UIPatterns;
export type ButtonVariant = keyof typeof UIPatterns.button;
export type BadgeVariant = 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';

// Helper function to combine patterns
export function combinePatterns(...patterns: string[]): string {
  return patterns.filter(Boolean).join(' ');
}

// Helper function to get pattern safely
export function getPattern(path: string): string {
  const keys = path.split('.');
  let current: any = UIPatterns;
  
  for (const key of keys) {
    if (current[key] === undefined) {
      console.warn(`Pattern not found: ${path}`);
      return '';
    }
    current = current[key];
  }
  
  return typeof current === 'string' ? current : '';
}
