/**
 * G Studio v2.3.0 - Accessibility Utilities
 * 
 * ARIA helpers, screen reader support, and keyboard navigation
 */

import React, { useEffect, useRef, useState, useCallback, memo } from 'react';

// ============================================================================
// SCREEN READER ONLY
// ============================================================================

/**
 * Visually hidden text for screen readers
 */
export const ScreenReaderOnly: React.FC<{ children: React.ReactNode }> = memo(({ children }) => (
  <span
    style={{
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: 0,
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      borderWidth: 0,
    }}
  >
    {children}
  </span>
));

ScreenReaderOnly.displayName = 'ScreenReaderOnly';

// ============================================================================
// LIVE REGION
// ============================================================================

/**
 * Announce messages to screen readers
 */
export interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive';
}

export const LiveRegion: React.FC<LiveRegionProps> = memo(({ message, politeness = 'polite' }) => (
  <div
    role="status"
    aria-live={politeness}
    aria-atomic="true"
    className="sr-only"
    style={{
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: 0,
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0, 0, 0, 0)',
      whiteSpace: 'nowrap',
      borderWidth: 0,
    }}
  >
    {message}
  </div>
));

LiveRegion.displayName = 'LiveRegion';

// ============================================================================
// SKIP LINK
// ============================================================================

/**
 * Skip navigation link for keyboard users
 */
export interface SkipLinkProps {
  targetId: string;
  children?: React.ReactNode;
}

export const SkipLink: React.FC<SkipLinkProps> = memo(({ targetId, children = 'Skip to main content' }) => (
  <a
    href={`#${targetId}`}
    className="
      sr-only focus:not-sr-only
      fixed top-4 left-4 z-[9999]
      bg-blue-600 text-white px-4 py-2 rounded-lg
      focus:outline-none focus:ring-2 focus:ring-white
      transition-all duration-200
    "
  >
    {children}
  </a>
));

SkipLink.displayName = 'SkipLink';

// ============================================================================
// FOCUS TRAP
// ============================================================================

/**
 * Traps focus within a container (useful for modals)
 */
export interface FocusTrapProps {
  children: React.ReactNode;
  active?: boolean;
  returnFocusOnDeactivate?: boolean;
}

export const FocusTrap: React.FC<FocusTrapProps> = memo(({ 
  children, 
  active = true,
  returnFocusOnDeactivate = true 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return;

    // Store current focus
    previousFocus.current = document.activeElement as HTMLElement;

    // Get focusable elements
    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element
    firstElement?.focus();

    // Handle tab key
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      
      // Return focus
      if (returnFocusOnDeactivate && previousFocus.current) {
        previousFocus.current.focus();
      }
    };
  }, [active, returnFocusOnDeactivate]);

  return (
    <div ref={containerRef}>
      {children}
    </div>
  );
});

FocusTrap.displayName = 'FocusTrap';

// ============================================================================
// KEYBOARD NAVIGATION HOOK
// ============================================================================

export interface UseKeyboardNavigationOptions {
  onEnter?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  enabled?: boolean;
}

export function useKeyboardNavigation(options: UseKeyboardNavigationOptions) {
  const {
    onEnter,
    onEscape,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    enabled = true,
  } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Enter':
          onEnter?.();
          break;
        case 'Escape':
          onEscape?.();
          break;
        case 'ArrowUp':
          e.preventDefault();
          onArrowUp?.();
          break;
        case 'ArrowDown':
          e.preventDefault();
          onArrowDown?.();
          break;
        case 'ArrowLeft':
          onArrowLeft?.();
          break;
        case 'ArrowRight':
          onArrowRight?.();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onEnter, onEscape, onArrowUp, onArrowDown, onArrowLeft, onArrowRight]);
}

// ============================================================================
// ROVING TABINDEX HOOK
// ============================================================================

export interface UseRovingTabIndexOptions {
  itemCount: number;
  orientation?: 'horizontal' | 'vertical' | 'both';
  loop?: boolean;
}

export function useRovingTabIndex(options: UseRovingTabIndexOptions) {
  const { itemCount, orientation = 'vertical', loop = true } = options;
  const [focusedIndex, setFocusedIndex] = useState(0);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, index: number) => {
    let newIndex = index;

    const isVertical = orientation === 'vertical' || orientation === 'both';
    const isHorizontal = orientation === 'horizontal' || orientation === 'both';

    switch (e.key) {
      case 'ArrowUp':
        if (isVertical) {
          e.preventDefault();
          newIndex = index > 0 ? index - 1 : (loop ? itemCount - 1 : 0);
        }
        break;
      case 'ArrowDown':
        if (isVertical) {
          e.preventDefault();
          newIndex = index < itemCount - 1 ? index + 1 : (loop ? 0 : itemCount - 1);
        }
        break;
      case 'ArrowLeft':
        if (isHorizontal) {
          e.preventDefault();
          newIndex = index > 0 ? index - 1 : (loop ? itemCount - 1 : 0);
        }
        break;
      case 'ArrowRight':
        if (isHorizontal) {
          e.preventDefault();
          newIndex = index < itemCount - 1 ? index + 1 : (loop ? 0 : itemCount - 1);
        }
        break;
      case 'Home':
        e.preventDefault();
        newIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        newIndex = itemCount - 1;
        break;
    }

    if (newIndex !== index) {
      setFocusedIndex(newIndex);
    }
  }, [itemCount, orientation, loop]);

  const getItemProps = useCallback((index: number) => ({
    tabIndex: focusedIndex === index ? 0 : -1,
    onKeyDown: (e: React.KeyboardEvent) => handleKeyDown(e, index),
    onFocus: () => setFocusedIndex(index),
  }), [focusedIndex, handleKeyDown]);

  return { focusedIndex, setFocusedIndex, getItemProps };
}

// ============================================================================
// REDUCED MOTION HOOK
// ============================================================================

export function useReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

// ============================================================================
// HIGH CONTRAST HOOK
// ============================================================================

export function useHighContrast(): boolean {
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: more)');
    setPrefersHighContrast(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersHighContrast(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersHighContrast;
}

// ============================================================================
// ANNOUNCE FUNCTION
// ============================================================================

let announceRegion: HTMLDivElement | null = null;

/**
 * Announce a message to screen readers
 */
export function announce(message: string, politeness: 'polite' | 'assertive' = 'polite') {
  if (!announceRegion) {
    announceRegion = document.createElement('div');
    announceRegion.setAttribute('aria-live', politeness);
    announceRegion.setAttribute('aria-atomic', 'true');
    announceRegion.setAttribute('role', 'status');
    announceRegion.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border-width: 0;
    `;
    document.body.appendChild(announceRegion);
  }

  // Clear and set message (triggers announcement)
  announceRegion.textContent = '';
  setTimeout(() => {
    if (announceRegion) {
      announceRegion.textContent = message;
    }
  }, 100);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  ScreenReaderOnly,
  LiveRegion,
  SkipLink,
  FocusTrap,
  useKeyboardNavigation,
  useRovingTabIndex,
  useReducedMotion,
  useHighContrast,
  announce,
};
