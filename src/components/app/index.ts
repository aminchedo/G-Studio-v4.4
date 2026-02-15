/**
 * App Components - Main application entry points
 *
 * Centralized exports for all app-level components
 */

export { default as App } from "@/components/app/App";
// AppNew archived to _archive_temp_chat_cleanup (chat-legacy-backup.zip)
export {
  default as AppProvider,
  withAppProvider,
} from "@/components/app/AppProvider";
export type { AppProviderConfig } from "@/components/app/AppProvider";
export { MinimalAppProvider } from "@/providers/MinimalAppProvider";
export { DevAppProvider } from "@/providers/DevAppProvider";
