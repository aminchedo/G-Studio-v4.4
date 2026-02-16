/**
 * AI Module - Main Integration Component
 * 
 * This component integrates all AI features:
 * - Settings Hub
 * - Conversation Window
 * - Agent features
 */

import React, { useState, useCallback } from 'react';
import { AISettingsHub } from '@/features/ai/AISettingsHub';
import { EnhancedConversationWindow } from '@/components/conversation/EnhancedConversationWindow';
import type { AIConfig } from '@/features/ai/AISettingsHub/types';

interface AIModuleProps {
  // Settings
  showSettings?: boolean;
  onSettingsClose?: () => void;
  onSettingsSave?: (config: AIConfig) => void;
  initialConfig?: Partial<AIConfig>;
  
  // Conversation
  showConversation?: boolean;
  onConversationClose?: () => void;
  onSendMessage?: (message: string) => Promise<string>;
  
  // General
  apiKey?: string;
  className?: string;
}

export const AIModule: React.FC<AIModuleProps> = ({
  showSettings = false,
  onSettingsClose = () => {},
  onSettingsSave = () => {},
  initialConfig = {},
  showConversation = false,
  onConversationClose = () => {},
  onSendMessage = async (msg) => `Echo: ${msg}`,
  apiKey = '',
  className = ''
}) => {
  const [config, setConfig] = useState<Partial<AIConfig>>(initialConfig);

  const handleSettingsSave = useCallback((newConfig: AIConfig) => {
    setConfig(newConfig);
    onSettingsSave(newConfig);
    onSettingsClose();
  }, [onSettingsSave, onSettingsClose]);

  return (
    <div className={className}>
      {/* AI Settings Hub */}
      {showSettings && (
        <AISettingsHub
          isOpen={showSettings}
          onClose={onSettingsClose}
          config={config}
          onSave={handleSettingsSave}
          apiKey={apiKey}
        />
      )}

      {/* Conversation Window */}
      {showConversation && (
        <div className="fixed inset-0 z-50">
          <EnhancedConversationWindow
            onSendMessage={onSendMessage}
            showSearch={true}
            showExport={true}
            allowEdit={true}
            allowDelete={true}
          />
        </div>
      )}
    </div>
  );
};

export default AIModule;
