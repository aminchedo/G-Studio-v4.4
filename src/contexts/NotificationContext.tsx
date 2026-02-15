/**
 * NotificationContext - Refactored from class NotificationManager
 * 
 * Provides notification management via React Context and hooks
 * Replaces alert(), confirm(), and prompt() with proper UI
 */

import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';

// Types
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

interface NotificationState {
  notifications: Notification[];
  maxNotifications: number;
}

type NotificationAction =
  | { type: 'ADD'; payload: Notification }
  | { type: 'REMOVE'; payload: string }
  | { type: 'CLEAR' };

interface NotificationContextValue {
  notifications: Notification[];
  show: (notification: Omit<Notification, 'id'>) => void;
  remove: (id: string) => void;
  clear: () => void;
  showSuccess: (message: string, duration?: number) => void;
  showError: (message: string, duration?: number) => void;
  showWarning: (message: string, duration?: number) => void;
  showInfo: (message: string, duration?: number) => void;
}

// Reducer
const notificationReducer = (
  state: NotificationState,
  action: NotificationAction
): NotificationState => {
  switch (action.type) {
    case 'ADD':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications].slice(0, state.maxNotifications),
      };
    case 'REMOVE':
      return {
        ...state,
        notifications: state.notifications.filter((n) => n.id !== action.payload),
      };
    case 'CLEAR':
      return {
        ...state,
        notifications: [],
      };
    default:
      return state;
  }
};

// Context
const NotificationContext = createContext<NotificationContextValue | null>(null);

// ID Generator
const generateId = (): string => Math.random().toString(36).substring(2, 15);

// Provider Component
interface NotificationProviderProps {
  children: ReactNode;
  maxNotifications?: number;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
  maxNotifications = 5,
}) => {
  const [state, dispatch] = useReducer(notificationReducer, {
    notifications: [],
    maxNotifications,
  });

  const show = useCallback((notification: Omit<Notification, 'id'>) => {
    const id = generateId();
    const fullNotification: Notification = { ...notification, id };
    
    dispatch({ type: 'ADD', payload: fullNotification });
    
    // Auto-remove after duration
    if (notification.duration !== undefined && notification.duration > 0) {
      setTimeout(() => {
        dispatch({ type: 'REMOVE', payload: id });
      }, notification.duration);
    }
  }, []);

  const remove = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', payload: id });
  }, []);

  const clear = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  const showSuccess = useCallback(
    (message: string, duration = 4000) => {
      show({ type: 'success', message, duration });
    },
    [show]
  );

  const showError = useCallback(
    (message: string, duration = 6000) => {
      show({ type: 'error', message, duration });
    },
    [show]
  );

  const showWarning = useCallback(
    (message: string, duration = 5000) => {
      show({ type: 'warning', message, duration });
    },
    [show]
  );

  const showInfo = useCallback(
    (message: string, duration = 4000) => {
      show({ type: 'info', message, duration });
    },
    [show]
  );

  const value: NotificationContextValue = {
    notifications: state.notifications,
    show,
    remove,
    clear,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

// Hook
export const useNotification = (): NotificationContextValue => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// Backward compatibility - Global notification functions for non-React contexts
let globalDispatch: ((action: NotificationAction) => void) | null = null;

export const setGlobalNotificationDispatch = (
  dispatch: (action: NotificationAction) => void
): void => {
  globalDispatch = dispatch;
};

export const showNotification = (
  type: NotificationType,
  message: string,
  duration?: number
): void => {
  if (globalDispatch) {
    const id = generateId();
    globalDispatch({ type: 'ADD', payload: { id, type, message, duration } });
    if (duration && duration > 0) {
      setTimeout(() => {
        globalDispatch?.({ type: 'REMOVE', payload: id });
      }, duration);
    }
  } else {
    console.warn('[Notification] No provider available, using console:', message);
  }
};

export const showSuccess = (message: string): void => showNotification('success', message, 4000);
export const showError = (message: string): void => showNotification('error', message, 6000);
export const showWarning = (message: string): void => showNotification('warning', message, 5000);
export const showInfo = (message: string): void => showNotification('info', message, 4000);

export default NotificationContext;
