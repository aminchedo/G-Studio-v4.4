/**
 * Conversation Module Demo
 * 
 * This file demonstrates how to use the Conversation components
 * in your G-Studio application.
 */

import React, { useState } from 'react';
import { ConversationWindow } from './ConversationWindow';
import { EnhancedConversationWindow } from './EnhancedConversationWindow';

export const ConversationDemo: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<'basic' | 'enhanced'>('enhanced');
  const [apiKey, setApiKey] = useState('');

  // Simulate AI response
  const handleSendMessage = async (message: string): Promise<string> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simple echo response for demo
    // In production, replace this with actual AI API call
    return `I received your message: "${message}". This is a demo response. Connect a real AI API to see actual responses!`;
  };

  // Handle file attachments (basic version)
  const handleSendWithAttachments = (message: string, files?: File[]) => {
    console.log('Message:', message);
    console.log('Attachments:', files);
    // Handle message and files here
  };

  return (
    <div className="w-full h-screen bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto h-full flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-1">
              Conversation Module Demo
            </h1>
            <p className="text-sm text-slate-400">
              Choose between Basic and Enhanced conversation interfaces
            </p>
          </div>

          {/* Toggle */}
          <div className="flex items-center gap-3 bg-slate-800/60 rounded-xl p-1.5 border border-white/10">
            <button
              onClick={() => setActiveDemo('basic')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeDemo === 'basic'
                  ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Basic
            </button>
            <button
              onClick={() => setActiveDemo('enhanced')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeDemo === 'enhanced'
                  ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Enhanced
            </button>
          </div>
        </div>

        {/* Info Panel */}
        <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-1">
                {activeDemo === 'basic' ? 'Basic Conversation' : 'Enhanced Conversation'}
              </h3>
              <p className="text-xs text-slate-300">
                {activeDemo === 'basic' 
                  ? 'Simple chat interface with message sending, file attachments, and voice input support.'
                  : 'Advanced interface with code highlighting, message editing, search, export, and more features.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Conversation Component */}
        <div className="flex-1 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
          {activeDemo === 'basic' ? (
            <ConversationWindow
              onSendMessage={handleSendWithAttachments}
              isTyping={false}
            />
          ) : (
            <EnhancedConversationWindow
              onSendMessage={handleSendMessage}
              showSearch={true}
              showExport={true}
              allowEdit={true}
              allowDelete={true}
            />
          )}
        </div>

        {/* Feature List */}
        <div className="grid grid-cols-2 gap-4">
          {activeDemo === 'basic' ? (
            <>
              <div className="bg-slate-800/40 rounded-xl p-4 border border-white/10">
                <h4 className="text-xs font-semibold text-emerald-400 mb-2">✓ Features</h4>
                <ul className="space-y-1 text-xs text-slate-400">
                  <li>• Message sending with Enter key</li>
                  <li>• File attachments support</li>
                  <li>• Voice input button</li>
                  <li>• Auto-scrolling messages</li>
                  <li>• Copy message content</li>
                  <li>• Responsive textarea</li>
                </ul>
              </div>
              <div className="bg-slate-800/40 rounded-xl p-4 border border-white/10">
                <h4 className="text-xs font-semibold text-purple-400 mb-2">⚡ Props</h4>
                <ul className="space-y-1 text-xs text-slate-400 font-mono">
                  <li>onSendMessage: function</li>
                  <li>initialMessages: Message[]</li>
                  <li>isTyping: boolean</li>
                  <li>className: string</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              <div className="bg-slate-800/40 rounded-xl p-4 border border-white/10">
                <h4 className="text-xs font-semibold text-emerald-400 mb-2">✓ Enhanced Features</h4>
                <ul className="space-y-1 text-xs text-slate-400">
                  <li>• Code syntax highlighting</li>
                  <li>• Message editing & deletion</li>
                  <li>• Search functionality</li>
                  <li>• Export conversations</li>
                  <li>• Markdown rendering</li>
                  <li>• System messages</li>
                </ul>
              </div>
              <div className="bg-slate-800/40 rounded-xl p-4 border border-white/10">
                <h4 className="text-xs font-semibold text-purple-400 mb-2">⚡ Props</h4>
                <ul className="space-y-1 text-xs text-slate-400 font-mono">
                  <li>onSendMessage: async function</li>
                  <li>showSearch: boolean</li>
                  <li>showExport: boolean</li>
                  <li>allowEdit: boolean</li>
                  <li>allowDelete: boolean</li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConversationDemo;
