/**
 * Button Feedback System - Provides visual and haptic feedback for button interactions
 * Improves user experience with clear action confirmation
 */

import React, { useState, useCallback } from 'react';
import { Check, AlertCircle, Loader2, Info as InfoIcon } from 'lucide-react';

export type FeedbackType = 'success' | 'error' | 'pending' | 'info';

interface ButtonFeedbackConfig {
  duration?: number;
  haptic?: boolean;
  showIcon?: boolean;
  autoReset?: boolean;
}

const DEFAULT_CONFIG: ButtonFeedbackConfig = {
  duration: 2000,
  haptic: true,
  showIcon: true,
  autoReset: true,
};

/**
 * Hook for managing button feedback state
 */
export const useButtonFeedback = (config?: ButtonFeedbackConfig) => {
  const [feedback, setFeedback] = useState<{ type: FeedbackType; message?: string } | null>(null);
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const showFeedback = useCallback(
    (type: FeedbackType, message?: string) => {
      // Haptic feedback
      if (finalConfig.haptic && typeof navigator !== 'undefined' && (navigator as any).vibrate) {
        (navigator as any).vibrate(type === 'success' ? 20 : type === 'error' ? [10, 20, 10] : 10);
      }

      setFeedback({ type, message });

      if (finalConfig.autoReset) {
        setTimeout(() => {
          setFeedback(null);
        }, finalConfig.duration);
      }
    },
    [finalConfig]
  );

  const clearFeedback = useCallback(() => {
    setFeedback(null);
  }, []);

  return { feedback, showFeedback, clearFeedback };
};

/**
 * Feedback Badge Component
 */
interface FeedbackBadgeProps {
  type: FeedbackType;
  message?: string;
  showIcon?: boolean;
}

export const FeedbackBadge: React.FC<FeedbackBadgeProps> = ({
  type,
  message,
  showIcon = true,
}) => {
  const getStyles = () => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-emerald-500/20 border-emerald-500/40',
          text: 'text-emerald-700 dark:text-emerald-400',
          icon: Check,
        };
      case 'error':
        return {
          bg: 'bg-red-500/20 border-red-500/40',
          text: 'text-red-700 dark:text-red-400',
          icon: AlertCircle,
        };
      case 'pending':
        return {
          bg: 'bg-amber-500/20 border-amber-500/40',
          text: 'text-amber-700 dark:text-amber-400',
          icon: Loader2,
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-500/20 border-blue-500/40',
          text: 'text-blue-700 dark:text-blue-400',
          icon: InfoIcon,
        };
    }
  };

  const styles = getStyles();
  const IconComponent = styles.icon;
  const isAnimating = type === 'pending';
  const className = `flex items-center gap-2 px-3 py-2 rounded-lg border ${styles.bg} ${styles.text} text-xs font-medium animate-in fade-in slide-in-from-bottom-2 duration-200`;
  const iconClassName = `w-4 h-4 ${isAnimating ? 'animate-spin' : ''}`;

  return React.createElement(
    'div',
    { className },
    showIcon && React.createElement(IconComponent, { className: iconClassName }),
    message && React.createElement('span', {}, message)
  );
};

/**
 * Enhanced Button Wrapper with Feedback
 */
interface EnhancedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode;
  label?: string;
  onClickAsync?: (showFeedback: (type: FeedbackType, message?: string) => void) => Promise<void>;
  feedbackConfig?: ButtonFeedbackConfig;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children?: React.ReactNode;
}

export const EnhancedButton: React.FC<EnhancedButtonProps> = ({
  icon,
  label,
  onClickAsync,
  feedbackConfig,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className,
  disabled,
  ...props
}) => {
  const { feedback, showFeedback } = useButtonFeedback(feedbackConfig);
  const [isLoadingState, setIsLoading] = useState(false);

  const handleClick = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || isLoadingState) return;

      if (onClickAsync) {
        setIsLoading(true);
        try {
          await onClickAsync(showFeedback);
        } catch (error) {
          console.error('Button action failed:', error);
          showFeedback('error', 'Action failed');
        } finally {
          setIsLoading(false);
        }
      }
    },
    [onClickAsync, showFeedback, disabled, isLoadingState]
  );

  const getVariantClass = () => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 text-white';
      case 'secondary':
        return 'bg-slate-700 hover:bg-slate-600 text-slate-100';
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'success':
        return 'bg-emerald-600 hover:bg-emerald-700 text-white';
      default:
        return 'bg-slate-700 hover:bg-slate-600 text-white';
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm';
      case 'lg':
        return 'px-6 py-3 text-lg';
      case 'md':
      default:
        return 'px-4 py-2 text-base';
    }
  };

  const buttonClass = `flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 ${getVariantClass()} ${getSizeClass()} ${className || ''}`;

  return React.createElement(
    'div',
    { className: 'flex flex-col gap-2' },
    React.createElement(
      'button',
      {
        ...props,
        disabled: disabled || isLoadingState,
        onClick: handleClick,
        className: buttonClass,
      },
      isLoadingState ? React.createElement(Loader2, { className: 'w-4 h-4 animate-spin' }) : icon,
      label || children
    ),
    feedback && React.createElement(FeedbackBadge, { type: feedback.type, message: feedback.message })
  );
};
