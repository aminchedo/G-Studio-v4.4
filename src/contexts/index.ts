/**
 * G Studio v2.0.0 - Contexts Index
 * 
 * Exports all context providers and hooks
 */

export {
  NotificationProvider,
  useNotification,
  showNotification,
  showSuccess,
  showError,
  showWarning,
  showInfo,
  setGlobalNotificationDispatch,
} from './NotificationContext';
export type { Notification, NotificationType } from './NotificationContext';

export {
  DatabaseProvider,
  useDatabase,
  initDatabaseSingleton,
  getDatabaseSingleton,
} from './DatabaseContext';
export type {
  DatabaseProject,
  DatabaseConversation,
  DatabaseFile,
  DatabaseSnippet,
} from './DatabaseContext';

export {
  LMStudioProvider,
  useLMStudioContext,
  useLMStudioOptional,
} from './LMStudioProvider';
export type {
  LMStudioContextValue,
  LMStudioProviderProps,
} from './LMStudioProvider';
