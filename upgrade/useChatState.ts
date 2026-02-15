import { useState } from 'react';
import { Message } from '@/types';

export function useChatState() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [tokenUsage, setTokenUsage] = useState({ prompt: 0, response: 0 });

  return {
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    tokenUsage,
    setTokenUsage
  };
}
