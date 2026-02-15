/**
 * G Studio v2.3.0 - Features Index
 * 
 * Central export for all feature modules
 */

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

export {
  useKeyboardStore,
  useKeyboardShortcuts,
  useShortcutAction,
  useShortcut,
  useKeyboardContext,
  getShortcutsByCategory,
  keysToString,
  DEFAULT_SHORTCUTS,
} from './keyboard/keyboardShortcuts';

export type {
  Shortcut,
  ShortcutCategory,
  ShortcutContext,
  ShortcutAction,
} from './keyboard/keyboardShortcuts';

// ============================================================================
// ONBOARDING
// ============================================================================

export {
  OnboardingOverlay,
  useOnboardingStore,
  useOnboarding,
  useAutoStartOnboarding,
  WELCOME_TOUR,
  FEATURES_TOUR,
  onboardingStyles,
} from './onboarding/OnboardingSystem';

export type {
  OnboardingStep,
  OnboardingTour,
} from './onboarding/OnboardingSystem';

// ============================================================================
// COLLABORATION
// ============================================================================

export {
  CollaborationIndicator,
  CollaboratorCursors,
  useCollaborationStore,
} from './collaboration/CollaborationIndicator';

export type {
  Collaborator,
  CollaborationMessage,
} from './collaboration/CollaborationIndicator';

// ============================================================================
// AI SUGGESTIONS
// ============================================================================

export {
  AISuggestionsPanel,
  InlineSuggestion,
  useSuggestionsStore,
} from './ai/AISuggestions';

export type {
  AISuggestion,
  SuggestionContext,
} from './ai/AISuggestions';

// ============================================================================
// HELP SYSTEM
// ============================================================================

export {
  Tooltip,
  HelpButton,
  HelpModal,
  TooltipProvider,
  helpContent,
} from './help/HelpSystem';

export type {
  TooltipContent,
  TooltipPosition,
  TooltipProps,
} from './help/HelpSystem';
export { PreviewPane } from './PreviewPane'
