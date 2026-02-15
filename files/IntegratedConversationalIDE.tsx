import React, { useState, useRef, useEffect } from 'react';
import { ConversationalCodeInterface } from './ConversationalCodeInterface';
import { VoiceConversationUI } from './VoiceConversationUI';
import { Mic, Code, Layout, Maximize2, Minimize2 } from 'lucide-react';

type ViewMode = 'code' | 'voice' | 'split';

export const IntegratedConversationalIDE: React.FC = () => {
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [voiceInput, setVoiceInput] = useState('');
  const codeInterfaceRef = useRef<any>(null);

  const handleVoiceTranscript = (text: string) => {
    setVoiceInput(prev => prev + ' ' + text);
  };

  const handleVoiceSpeechEnd = () => {
    // When voice input ends, optionally send to code interface
    if (voiceInput.trim()) {
      // This would trigger the code interface to process the voice input
      console.log('Voice input complete:', voiceInput);
      
      // Clear voice input after processing
      setTimeout(() => setVoiceInput(''), 500);
    }
  };

  const handleAIResponse = (response: string) => {
    // When AI responds, speak it if voice is enabled
    if ((window as any).__voiceConversation?.speak) {
      (window as any).__voiceConversation.speak(response);
    }
  };

  return (
    <div className="integrated-conversational-ide h-full flex flex-col bg-gray-950">
      {/* Header with View Controls */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Code className="w-5 h-5 text-purple-400" />
            <h1 className="text-lg font-bold text-white">G-Studio Conversational IDE</h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('code')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'code'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Code className="w-4 h-4 inline mr-1" />
              Code Only
            </button>

            <button
              onClick={() => setViewMode('voice')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'voice'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Mic className="w-4 h-4 inline mr-1" />
              Voice Only
            </button>

            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'split'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <Layout className="w-4 h-4 inline mr-1" />
              Split View
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Code Interface */}
        {(viewMode === 'code' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-2/3' : 'w-full'} border-r border-gray-800`}>
            <ConversationalCodeInterface
              ref={codeInterfaceRef}
              onAIResponse={handleAIResponse}
              externalInput={voiceInput}
            />
          </div>
        )}

        {/* Voice Interface */}
        {(viewMode === 'voice' || viewMode === 'split') && (
          <div className={`${viewMode === 'split' ? 'w-1/3' : 'w-full'} p-4 overflow-y-auto`}>
            <VoiceConversationUI
              onTranscript={handleVoiceTranscript}
              onSpeechEnd={handleVoiceSpeechEnd}
              enabled={true}
            />

            {/* Voice Input Preview */}
            {voiceInput && (
              <div className="mt-4 p-4 bg-gray-900 rounded-lg border border-purple-600">
                <div className="flex items-center gap-2 mb-2">
                  <Mic className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-medium text-purple-400">Voice Input</span>
                </div>
                <p className="text-gray-300 text-sm">{voiceInput}</p>
              </div>
            )}

            {/* Quick Actions */}
            <div className="mt-4 space-y-2">
              <h3 className="text-sm font-medium text-gray-400 mb-2">Voice Commands</h3>
              
              <div className="space-y-2">
                <div className="p-3 bg-gray-900 rounded-lg border border-gray-800">
                  <p className="text-xs font-medium text-gray-300">"Create a React component..."</p>
                  <p className="text-xs text-gray-500 mt-1">Generate code with voice</p>
                </div>

                <div className="p-3 bg-gray-900 rounded-lg border border-gray-800">
                  <p className="text-xs font-medium text-gray-300">"Show me the git status"</p>
                  <p className="text-xs text-gray-500 mt-1">Check repository state</p>
                </div>

                <div className="p-3 bg-gray-900 rounded-lg border border-gray-800">
                  <p className="text-xs font-medium text-gray-300">"Generate color palette..."</p>
                  <p className="text-xs text-gray-500 mt-1">Design tools via voice</p>
                </div>

                <div className="p-3 bg-gray-900 rounded-lg border border-gray-800">
                  <p className="text-xs font-medium text-gray-300">"Remember that I prefer..."</p>
                  <p className="text-xs text-gray-500 mt-1">Store preferences</p>
                </div>
              </div>
            </div>

            {/* Tips */}
            <div className="mt-4 p-4 bg-purple-900/20 border border-purple-700/50 rounded-lg">
              <h4 className="text-sm font-medium text-purple-300 mb-2">💡 Pro Tips</h4>
              <ul className="text-xs text-purple-200 space-y-1">
                <li>• Speak naturally - no special commands needed</li>
                <li>• AI will read responses aloud automatically</li>
                <li>• Use "Remember..." to store preferences</li>
                <li>• Say "Show me..." to use tools</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-gray-900 border-t border-gray-800 px-4 py-2 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-4">
          <span>View: {viewMode === 'code' ? 'Code Only' : viewMode === 'voice' ? 'Voice Only' : 'Split View'}</span>
          <span>•</span>
          <span>MCP Tools: 10 available</span>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          <span>Ready</span>
        </div>
      </div>
    </div>
  );
};

export default IntegratedConversationalIDE;
