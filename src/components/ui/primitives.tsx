/**
 * G Studio v2.3.0 - UI Primitives
 * 
 * Reusable UI components with accessibility support
 * Built with Tailwind CSS for consistent styling
 */

import React, { memo, forwardRef, ButtonHTMLAttributes, InputHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

// ============================================================================
// BUTTON COMPONENT
// ============================================================================

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  ...props
}, ref) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 active:bg-blue-800',
    secondary: 'bg-slate-700 text-white hover:bg-slate-600 focus:ring-slate-500 active:bg-slate-800',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 active:bg-red-800',
    ghost: 'bg-transparent text-slate-300 hover:bg-slate-700 focus:ring-slate-500',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-6 py-3 text-base gap-2',
  };

  return (
    <button
      ref={ref}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : leftIcon}
      {children}
      {!isLoading && rightIcon}
    </button>
  );
});

Button.displayName = 'Button';

// ============================================================================
// INPUT COMPONENT
// ============================================================================

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className = '',
  id,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-300 mb-1.5"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-4 py-2.5 rounded-lg border bg-slate-800 text-white
            placeholder:text-slate-500
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            disabled:opacity-50 disabled:cursor-not-allowed
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            ${error ? 'border-red-500' : 'border-slate-600'}
            ${className}
          `}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p id={`${inputId}-error`} className="mt-1.5 text-sm text-red-400" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={`${inputId}-helper`} className="mt-1.5 text-sm text-slate-500">
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

// ============================================================================
// BADGE COMPONENT
// ============================================================================

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = memo(({ 
  children, 
  variant = 'default',
  size = 'md' 
}) => {
  const variants = {
    default: 'bg-slate-700 text-slate-300',
    success: 'bg-green-500/20 text-green-400',
    warning: 'bg-yellow-500/20 text-yellow-400',
    error: 'bg-red-500/20 text-red-400',
    info: 'bg-blue-500/20 text-blue-400',
  };
  
  const sizes = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-1 text-sm',
  };

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variants[variant]} ${sizes[size]}`}>
      {children}
    </span>
  );
});

Badge.displayName = 'Badge';

// ============================================================================
// TOOLTIP COMPONENT
// ============================================================================

export interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const Tooltip: React.FC<TooltipProps> = memo(({ 
  children, 
  content,
  position = 'top' 
}) => {
  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative group inline-block">
      {children}
      <div 
        className={`
          absolute ${positions[position]} z-50
          px-2 py-1 text-xs text-white bg-slate-900 rounded shadow-lg
          opacity-0 invisible group-hover:opacity-100 group-hover:visible
          transition-all duration-150 whitespace-nowrap
          pointer-events-none
        `}
        role="tooltip"
      >
        {content}
      </div>
    </div>
  );
});

Tooltip.displayName = 'Tooltip';

// ============================================================================
// SKELETON COMPONENT
// ============================================================================

export interface SkeletonProps {
  width?: string;
  height?: string;
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
}

export const Skeleton: React.FC<SkeletonProps> = memo(({ 
  width = '100%', 
  height = '1rem',
  className = '',
  variant = 'text'
}) => {
  const variants = {
    text: 'rounded',
    circular: 'rounded-full',
    rectangular: 'rounded-lg',
  };

  return (
    <div 
      className={`animate-pulse bg-slate-700 ${variants[variant]} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
});

Skeleton.displayName = 'Skeleton';

// ============================================================================
// DIVIDER COMPONENT
// ============================================================================

export interface DividerProps {
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const Divider: React.FC<DividerProps> = memo(({ 
  orientation = 'horizontal',
  className = '' 
}) => {
  const styles = orientation === 'horizontal'
    ? 'w-full h-px'
    : 'h-full w-px';

  return (
    <div 
      className={`bg-slate-700 ${styles} ${className}`}
      role="separator"
      aria-orientation={orientation}
    />
  );
});

Divider.displayName = 'Divider';

// ============================================================================
// SPINNER COMPONENT
// ============================================================================

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Spinner: React.FC<SpinnerProps> = memo(({ 
  size = 'md',
  className = '' 
}) => {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <Loader2 
      className={`animate-spin text-blue-500 ${sizes[size]} ${className}`}
      aria-label="Loading"
    />
  );
});

Spinner.displayName = 'Spinner';

// ============================================================================
// AVATAR COMPONENT
// ============================================================================

export interface AvatarProps {
  src?: string;
  alt?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = memo(({ 
  src, 
  alt = 'Avatar',
  fallback,
  size = 'md',
  className = '' 
}) => {
  const sizes = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  const initials = fallback || alt.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (src) {
    return (
      <img 
        src={src} 
        alt={alt}
        className={`rounded-full object-cover ${sizes[size]} ${className}`}
      />
    );
  }

  return (
    <div 
      className={`
        rounded-full bg-gradient-to-br from-blue-500 to-purple-600
        flex items-center justify-center text-white font-medium
        ${sizes[size]} ${className}
      `}
      aria-label={alt}
    >
      {initials}
    </div>
  );
});

Avatar.displayName = 'Avatar';

// ============================================================================
// CARD COMPONENT
// ============================================================================

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = memo(({ 
  children, 
  className = '',
  padding = 'md' 
}) => {
  const paddings = {
    none: '',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  };

  return (
    <div className={`bg-slate-800 rounded-xl border border-slate-700 ${paddings[padding]} ${className}`}>
      {children}
    </div>
  );
});

Card.displayName = 'Card';

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  Button,
  Input,
  Badge,
  Tooltip,
  Skeleton,
  Divider,
  Spinner,
  Avatar,
  Card,
};
