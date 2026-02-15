/**
 * Message list type definitions
 */
import type { Message } from "@/types/types";

export interface MessageItemProps {
  message: Message;
}

export interface MessageListVirtualizedProps {
  messages: Message[];
  isLoading?: boolean;
  height?: number;
}
