/**
 * Notification Toast Component
 * Replaces alert(), confirm(), and prompt() with proper UI
 */

import React, { useState, useEffect } from "react";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

export type NotificationType = "success" | "error" | "warning" | "info";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration?: number;
}

interface NotificationToastProps {
  notifications?: Notification[];
  notification?: Notification | null; // Keep for backward compatibility
  onClose?: (id?: string) => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notifications: propNotifications,
  notification,
  onClose,
}) => {
  const [notifications, setNotifications] = React.useState<Notification[]>([]);

  useEffect(() => {
    // Support both new (multiple) and old (single) API
    if (propNotifications) {
      setNotifications(propNotifications);
    } else if (notification) {
      setNotifications([notification]);
    } else {
      // Subscribe to notification manager for multiple notifications
      const unsubscribe = notificationManager.subscribe(setNotifications);
      return unsubscribe;
    }
  }, [propNotifications, notification]);

  if (notifications.length === 0) return null;

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const colors = {
    success: "bg-emerald-500/20 border-emerald-500/40 text-emerald-400",
    error: "bg-red-500/20 border-red-500/40 text-red-400",
    warning: "bg-amber-500/20 border-amber-500/40 text-amber-400",
    info: "bg-blue-500/20 border-blue-500/40 text-blue-400",
  };

  return (
    <div className="fixed top-20 right-4 z-[200] flex flex-col gap-3 max-h-[70vh] overflow-y-auto overflow-x-hidden">
      {notifications.map((notif) => {
        const Icon = icons[notif.type];
        const colorClass = colors[notif.type];

        return (
          <div
            key={notif.id}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg border backdrop-blur-md shadow-lg min-w-[300px] max-w-[500px] animate-in slide-in-from-right duration-300 ${colorClass}`}
          >
            <Icon className="w-5 h-5 flex-shrink-0" />
            <button
              onClick={() => {
                if (onClose) {
                  onClose(notif.id);
                } else {
                  notificationManager.remove(notif.id);
                }
              }}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <p className="flex-1 text-sm font-medium">{notif.message}</p>
          </div>
        );
      })}
    </div>
  );
};

// Default auto-dismiss durations (ms) – all toasts auto-remove so they don't accumulate
const DEFAULT_DURATIONS: Record<NotificationType, number> = {
  success: 4000,
  error: 6000,
  warning: 5000,
  info: 4000,
};

// Global notification manager with multiple notifications support
class NotificationManager {
  private listeners: Set<(notifications: Notification[]) => void> = new Set();
  private notifications: Notification[] = [];
  private maxNotifications = 3;
  private timeouts: Map<string, ReturnType<typeof setTimeout>> = new Map();

  show(notification: Omit<Notification, "id">) {
    // Deduplicate: remove any existing notification with same type and message
    this.notifications = this.notifications.filter(
      (n) =>
        !(n.type === notification.type && n.message === notification.message),
    );

    const id = Math.random().toString(36).substring(2, 15);
    const duration =
      notification.duration !== undefined
        ? notification.duration
        : DEFAULT_DURATIONS[notification.type];
    const newNotification = { ...notification, id, duration };

    // Add to beginning; keep only max so they don't overlap
    this.notifications = [newNotification, ...this.notifications].slice(
      0,
      this.maxNotifications,
    );

    // Always auto-remove after duration so toasts are deleted and don't stay
    const t = setTimeout(() => {
      this.timeouts.delete(id);
      this.remove(id);
    }, duration);
    this.timeouts.set(id, t);

    this.notifyListeners();
  }

  remove(id: string) {
    const t = this.timeouts.get(id);
    if (t) {
      clearTimeout(t);
      this.timeouts.delete(id);
    }
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.notifyListeners();
  }

  /** Remove all notifications with the same type and message (e.g. to clear duplicates) */
  removeByMessage(type: NotificationType, message: string) {
    this.notifications.forEach((n) => {
      if (n.type === type && n.message === message) {
        const t = this.timeouts.get(n.id);
        if (t) {
          clearTimeout(t);
          this.timeouts.delete(n.id);
        }
      }
    });
    this.notifications = this.notifications.filter(
      (n) => !(n.type === type && n.message === message),
    );
    this.notifyListeners();
  }

  clear() {
    this.timeouts.forEach((t) => clearTimeout(t));
    this.timeouts.clear();
    this.notifications = [];
    this.notifyListeners();
  }

  subscribe(listener: (notifications: Notification[]) => void) {
    this.listeners.add(listener);
    // Immediately notify with current notifications
    listener(this.notifications);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener([...this.notifications]));
  }
}

export const notificationManager = new NotificationManager();

// Helper functions to replace alert/confirm/prompt
export const showNotification = (
  type: NotificationType,
  message: string,
  duration?: number,
) => {
  notificationManager.show({ type, message, duration });
};

export const showSuccess = (message: string, duration?: number) =>
  showNotification("success", message, duration);
export const showError = (message: string, duration?: number) =>
  showNotification("error", message, duration);
export const showWarning = (message: string, duration?: number) =>
  showNotification("warning", message, duration);
export const showInfo = (message: string, duration?: number) =>
  showNotification("info", message, duration);
