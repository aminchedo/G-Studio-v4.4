// Existing exports (keep for backward compatibility)
export { MessageBubble } from "./MessageBubble";
export { EnhancedInputArea } from "./EnhancedInputArea";
export { EnhancedMessageList } from "./EnhancedMessageList";

// New exports (better components)
export { ChatWelcome } from "./ChatWelcome";
export { ChatPanelHeader } from "./ChatPanelHeader";
export { MessageItem } from "./message-list/MessageItem";
export { MessageListVirtualized } from "./message-list/MessageListVirtualized";
export { SidebarInputArea } from "./SidebarInputArea";
export type {
  MessageItemProps,
  MessageListVirtualizedProps,
} from "./message-list/MessageTypes";
