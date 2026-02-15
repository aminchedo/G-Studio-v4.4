/**
 * G Studio v2.3.0 - Onboarding System
 * 
 * User onboarding with:
 * - Welcome tour
 * - Feature highlights
 * - Interactive tutorials
 * - Contextual help
 */

import React, { 
  memo, 
  useState, 
  useCallback, 
  useEffect,
  createContext,
  useContext 
} from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Code,
  MessageSquare,
  FolderTree,
  Settings,
  Mic,
  Zap,
  Lightbulb,
  ArrowRight,
  Check
} from 'lucide-react';
import { useTheme } from '@/theme/themeSystem';

// ============================================================================
// TYPES
// ============================================================================

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  target?: string;        // CSS selector for highlight
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
  action?: () => void;    // Optional action to perform
}

export interface OnboardingTour {
  id: string;
  name: string;
  description: string;
  steps: OnboardingStep[];
}

// ============================================================================
// ONBOARDING TOURS
// ============================================================================

export const WELCOME_TOUR: OnboardingTour = {
  id: 'welcome',
  name: 'Welcome to G Studio',
  description: 'Learn the basics of coding through conversation',
  steps: [
    {
      id: 'welcome',
      title: 'Welcome to G Studio! 🎉',
      description: 'G Studio is an AI-powered IDE where you can code through natural conversation. Let me show you around.',
      icon: Sparkles,
      position: 'center',
    },
    {
      id: 'chat',
      title: 'Chat with AI',
      description: 'This is where the magic happens! Ask me to create files, analyze code, fix bugs, or explain concepts. Just type naturally.',
      icon: MessageSquare,
      target: '[data-tour="chat-panel"]',
      position: 'left',
    },
    {
      id: 'editor',
      title: 'Code Editor',
      description: 'Your code appears here with syntax highlighting, auto-completion, and live preview. I can edit files directly when you ask.',
      icon: Code,
      target: '[data-tour="editor"]',
      position: 'right',
    },
    {
      id: 'sidebar',
      title: 'File Explorer',
      description: 'Browse and manage your project files. Drag and drop to reorganize, right-click for more options.',
      icon: FolderTree,
      target: '[data-tour="sidebar"]',
      position: 'right',
    },
    {
      id: 'voice',
      title: 'Voice Input',
      description: 'Click the microphone to talk to me! Voice coding is faster and more natural than typing.',
      icon: Mic,
      target: '[data-tour="voice-button"]',
      position: 'top',
    },
    {
      id: 'commands',
      title: 'Quick Commands',
      description: 'Type "/" to see quick commands like /create, /fix, /analyze, and more. They speed up common tasks.',
      icon: Zap,
      target: '[data-tour="input-area"]',
      position: 'top',
    },
    {
      id: 'settings',
      title: 'Customize Your Experience',
      description: 'Configure AI models, themes, voice settings, and more. Make G Studio work the way you like.',
      icon: Settings,
      target: '[data-tour="settings-button"]',
      position: 'bottom',
    },
    {
      id: 'done',
      title: "You're Ready!",
      description: 'Start by telling me what you want to build. Say something like "Create a React component for a login form" and watch the magic!',
      icon: Lightbulb,
      position: 'center',
    },
  ],
};

export const FEATURES_TOUR: OnboardingTour = {
  id: 'features',
  name: 'Advanced Features',
  description: 'Discover powerful capabilities',
  steps: [
    {
      id: 'multi-agent',
      title: 'Multi-Agent Collaboration',
      description: 'Enable multiple AI agents to work together on complex tasks. Each agent specializes in different areas.',
      icon: Sparkles,
      position: 'center',
    },
    {
      id: 'local-ai',
      title: 'Local AI Support',
      description: 'Connect to LM Studio for offline AI processing. Your code stays private on your machine.',
      icon: Zap,
      position: 'center',
    },
    {
      id: 'mcp-tools',
      title: '60+ Built-in Tools',
      description: 'I have access to file operations, code analysis, refactoring, testing, and much more.',
      icon: Code,
      position: 'center',
    },
  ],
};

// ============================================================================
// ONBOARDING STORE
// ============================================================================

interface OnboardingState {
  hasCompletedWelcome: boolean;
  completedTours: string[];
  currentTour: OnboardingTour | null;
  currentStep: number;
  isActive: boolean;
  
  startTour: (tour: OnboardingTour) => void;
  nextStep: () => void;
  prevStep: () => void;
  skipTour: () => void;
  completeTour: () => void;
  resetOnboarding: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      hasCompletedWelcome: false,
      completedTours: [],
      currentTour: null,
      currentStep: 0,
      isActive: false,

      startTour: (tour) => {
        set({
          currentTour: tour,
          currentStep: 0,
          isActive: true,
        });
      },

      nextStep: () => {
        const { currentTour, currentStep } = get();
        if (currentTour && currentStep < currentTour.steps.length - 1) {
          set({ currentStep: currentStep + 1 });
        } else {
          get().completeTour();
        }
      },

      prevStep: () => {
        const { currentStep } = get();
        if (currentStep > 0) {
          set({ currentStep: currentStep - 1 });
        }
      },

      skipTour: () => {
        set({
          currentTour: null,
          currentStep: 0,
          isActive: false,
        });
      },

      completeTour: () => {
        const { currentTour, completedTours } = get();
        if (currentTour) {
          const newCompleted = [...completedTours, currentTour.id];
          set({
            completedTours: newCompleted,
            hasCompletedWelcome: currentTour.id === 'welcome' || get().hasCompletedWelcome,
            currentTour: null,
            currentStep: 0,
            isActive: false,
          });
        }
      },

      resetOnboarding: () => {
        set({
          hasCompletedWelcome: false,
          completedTours: [],
          currentTour: null,
          currentStep: 0,
          isActive: false,
        });
      },
    }),
    {
      name: 'gstudio-onboarding',
    }
  )
);

// ============================================================================
// TOOLTIP COMPONENT
// ============================================================================

interface TooltipProps {
  step: OnboardingStep;
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  isDark: boolean;
}

const OnboardingTooltip: React.FC<TooltipProps> = memo(({
  step,
  currentIndex,
  totalSteps,
  onNext,
  onPrev,
  onSkip,
  isDark,
}) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalSteps - 1;
  const Icon = step.icon;

  useEffect(() => {
    if (step.target) {
      const element = document.querySelector(step.target);
      if (element) {
        const rect = element.getBoundingClientRect();
        const tooltipWidth = 320;
        const tooltipHeight = 200;

        let top = 0;
        let left = 0;

        switch (step.position) {
          case 'top':
            top = rect.top - tooltipHeight - 16;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            break;
          case 'bottom':
            top = rect.bottom + 16;
            left = rect.left + rect.width / 2 - tooltipWidth / 2;
            break;
          case 'left':
            top = rect.top + rect.height / 2 - tooltipHeight / 2;
            left = rect.left - tooltipWidth - 16;
            break;
          case 'right':
            top = rect.top + rect.height / 2 - tooltipHeight / 2;
            left = rect.right + 16;
            break;
          default:
            top = window.innerHeight / 2 - tooltipHeight / 2;
            left = window.innerWidth / 2 - tooltipWidth / 2;
        }

        // Clamp to viewport
        top = Math.max(16, Math.min(window.innerHeight - tooltipHeight - 16, top));
        left = Math.max(16, Math.min(window.innerWidth - tooltipWidth - 16, left));

        setPosition({ top, left });
      }
    } else {
      // Center position
      setPosition({
        top: window.innerHeight / 2 - 100,
        left: window.innerWidth / 2 - 160,
      });
    }
  }, [step]);

  return (
    <div
      className={`fixed z-[9999] w-80 rounded-2xl shadow-2xl ${
        isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'
      }`}
      style={{ top: position.top, left: position.left }}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        isDark ? 'border-slate-700' : 'border-gray-200'
      }`}>
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isDark ? 'bg-blue-500/20' : 'bg-blue-100'
          }`}>
            <Icon className={`w-4 h-4 ${isDark ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            {currentIndex + 1} of {totalSteps}
          </span>
        </div>
        <button
          onClick={onSkip}
          className={`p-1 rounded-lg transition-colors ${
            isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-gray-500'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        <h3 className={`text-lg font-semibold mb-2 ${
          isDark ? 'text-white' : 'text-gray-900'
        }`}>
          {step.title}
        </h3>
        <p className={`text-sm leading-relaxed ${
          isDark ? 'text-slate-300' : 'text-gray-600'
        }`}>
          {step.description}
        </p>
      </div>

      {/* Progress bar */}
      <div className={`h-1 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
        <div
          className="h-full bg-blue-500 transition-all duration-300"
          style={{ width: `${((currentIndex + 1) / totalSteps) * 100}%` }}
        />
      </div>

      {/* Footer */}
      <div className={`flex items-center justify-between px-4 py-3 border-t ${
        isDark ? 'border-slate-700' : 'border-gray-200'
      }`}>
        <button
          onClick={onPrev}
          disabled={isFirst}
          className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition-colors ${
            isFirst
              ? 'opacity-50 cursor-not-allowed'
              : isDark 
                ? 'hover:bg-slate-700 text-slate-300' 
                : 'hover:bg-gray-100 text-gray-700'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        
        <button
          onClick={onNext}
          className={`flex items-center gap-1 px-4 py-1.5 text-sm rounded-lg transition-colors ${
            isDark 
              ? 'bg-blue-600 hover:bg-blue-700 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isLast ? (
            <>
              <Check className="w-4 h-4" />
              Get Started
            </>
          ) : (
            <>
              Next
              <ChevronRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    </div>
  );
});

OnboardingTooltip.displayName = 'OnboardingTooltip';

// ============================================================================
// SPOTLIGHT COMPONENT
// ============================================================================

const Spotlight: React.FC<{ target?: string; isDark: boolean }> = memo(({ target, isDark }) => {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (target) {
      const element = document.querySelector(target);
      if (element) {
        setRect(element.getBoundingClientRect());
        
        // Add highlight class
        element.classList.add('onboarding-highlight');
        return () => element.classList.remove('onboarding-highlight');
      }
    }
    setRect(null);
  }, [target]);

  if (!rect) {
    return (
      <div className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm" />
    );
  }

  // Create cutout for the target element
  const padding = 8;
  const clipPath = `
    polygon(
      0% 0%, 
      0% 100%, 
      ${rect.left - padding}px 100%, 
      ${rect.left - padding}px ${rect.top - padding}px, 
      ${rect.right + padding}px ${rect.top - padding}px, 
      ${rect.right + padding}px ${rect.bottom + padding}px, 
      ${rect.left - padding}px ${rect.bottom + padding}px, 
      ${rect.left - padding}px 100%, 
      100% 100%, 
      100% 0%
    )
  `;

  return (
    <div
      className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm transition-all duration-300"
      style={{ clipPath }}
    />
  );
});

Spotlight.displayName = 'Spotlight';

// ============================================================================
// ONBOARDING OVERLAY
// ============================================================================

export const OnboardingOverlay: React.FC = memo(() => {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark' || effectiveTheme === 'high-contrast';
  
  const { currentTour, currentStep, isActive, nextStep, prevStep, skipTour } = useOnboardingStore();

  if (!isActive || !currentTour) {
    return null;
  }

  const step = currentTour.steps[currentStep];

  return (
    <>
      <Spotlight target={step.target} isDark={isDark} />
      <OnboardingTooltip
        step={step}
        currentIndex={currentStep}
        totalSteps={currentTour.steps.length}
        onNext={nextStep}
        onPrev={prevStep}
        onSkip={skipTour}
        isDark={isDark}
      />
    </>
  );
});

OnboardingOverlay.displayName = 'OnboardingOverlay';

// ============================================================================
// HOOKS
// ============================================================================

export function useOnboarding() {
  const store = useOnboardingStore();
  
  const startWelcomeTour = useCallback(() => {
    if (!store.hasCompletedWelcome) {
      store.startTour(WELCOME_TOUR);
    }
  }, [store]);

  const startFeaturesTour = useCallback(() => {
    store.startTour(FEATURES_TOUR);
  }, [store]);

  return {
    ...store,
    startWelcomeTour,
    startFeaturesTour,
  };
}

// ============================================================================
// AUTO-START HOOK
// ============================================================================

export function useAutoStartOnboarding() {
  const { hasCompletedWelcome, startTour } = useOnboardingStore();

  useEffect(() => {
    // Start welcome tour for new users after a short delay
    if (!hasCompletedWelcome) {
      const timer = setTimeout(() => {
        startTour(WELCOME_TOUR);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedWelcome, startTour]);
}

// ============================================================================
// CSS
// ============================================================================

export const onboardingStyles = `
  .onboarding-highlight {
    position: relative;
    z-index: 9999;
    box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.5);
    border-radius: 8px;
  }
`;

// ============================================================================
// EXPORTS
// ============================================================================

export default OnboardingOverlay;
