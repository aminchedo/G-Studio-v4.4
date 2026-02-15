/**
 * G Studio v2.3.0 - Real-Time Collaboration Component
 * 
 * Shows active collaborators and their cursors/selections
 */

import React, { memo, useState, useCallback, useEffect } from 'react';
import { Users, Circle, MessageSquare, Eye, Edit3, Wifi, WifiOff } from 'lucide-react';
import { create } from 'zustand';

// ============================================================================
// TYPES
// ============================================================================

export interface Collaborator {
  id: string;
  name: string;
  avatar?: string;
  color: string;
  cursorPosition?: { line: number; column: number };
  selection?: { start: { line: number; column: number }; end: { line: number; column: number } };
  activeFile?: string;
  status: 'active' | 'idle' | 'away';
  lastActivity: number;
}

export interface CollaborationMessage {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: number;
  type: 'message' | 'join' | 'leave' | 'edit';
}

interface CollaborationState {
  isConnected: boolean;
  collaborators: Collaborator[];
  messages: CollaborationMessage[];
  isEnabled: boolean;
  roomId: string | null;
  
  connect: (roomId: string) => void;
  disconnect: () => void;
  addCollaborator: (collaborator: Collaborator) => void;
  removeCollaborator: (id: string) => void;
  updateCollaborator: (id: string, updates: Partial<Collaborator>) => void;
  sendMessage: (content: string) => void;
  setEnabled: (enabled: boolean) => void;
}

// ============================================================================
// COLLABORATION STORE
// ============================================================================

export const useCollaborationStore = create<CollaborationState>((set, get) => ({
  isConnected: false,
  collaborators: [],
  messages: [],
  isEnabled: false,
  roomId: null,

  connect: (roomId) => {
    // Simulate connection
    set({ isConnected: true, roomId });
    
    // Add system message
    const message: CollaborationMessage = {
      id: Date.now().toString(),
      userId: 'system',
      userName: 'System',
      content: 'Connected to collaboration session',
      timestamp: Date.now(),
      type: 'join',
    };
    set((state) => ({ messages: [...state.messages, message] }));
  },

  disconnect: () => {
    set({ isConnected: false, roomId: null, collaborators: [] });
  },

  addCollaborator: (collaborator) => {
    set((state) => ({
      collaborators: [...state.collaborators, collaborator],
      messages: [...state.messages, {
        id: Date.now().toString(),
        userId: collaborator.id,
        userName: collaborator.name,
        content: `${collaborator.name} joined`,
        timestamp: Date.now(),
        type: 'join',
      }],
    }));
  },

  removeCollaborator: (id) => {
    const collaborator = get().collaborators.find(c => c.id === id);
    set((state) => ({
      collaborators: state.collaborators.filter(c => c.id !== id),
      messages: collaborator ? [...state.messages, {
        id: Date.now().toString(),
        userId: id,
        userName: collaborator.name,
        content: `${collaborator.name} left`,
        timestamp: Date.now(),
        type: 'leave',
      }] : state.messages,
    }));
  },

  updateCollaborator: (id, updates) => {
    set((state) => ({
      collaborators: state.collaborators.map(c =>
        c.id === id ? { ...c, ...updates, lastActivity: Date.now() } : c
      ),
    }));
  },

  sendMessage: (content) => {
    const message: CollaborationMessage = {
      id: Date.now().toString(),
      userId: 'me',
      userName: 'You',
      content,
      timestamp: Date.now(),
      type: 'message',
    };
    set((state) => ({ messages: [...state.messages, message] }));
  },

  setEnabled: (isEnabled) => set({ isEnabled }),
}));

// ============================================================================
// COLLABORATOR AVATAR
// ============================================================================

const CollaboratorAvatar: React.FC<{
  collaborator: Collaborator;
  size?: 'sm' | 'md' | 'lg';
  showStatus?: boolean;
}> = memo(({ collaborator, size = 'md', showStatus = true }) => {
  const sizes = { sm: 'w-6 h-6', md: 'w-8 h-8', lg: 'w-10 h-10' };
  const statusColors = {
    active: 'bg-green-500',
    idle: 'bg-yellow-500',
    away: 'bg-gray-400',
  };

  return (
    <div className="relative">
      <div
        className={`${sizes[size]} rounded-full flex items-center justify-center text-white font-medium`}
        style={{ backgroundColor: collaborator.color }}
        title={collaborator.name}
      >
        {collaborator.avatar ? (
          <img
            src={collaborator.avatar}
            alt={collaborator.name}
            className="w-full h-full rounded-full object-cover"
          />
        ) : (
          <span className="text-xs">{collaborator.name.charAt(0).toUpperCase()}</span>
        )}
      </div>
      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-800 ${statusColors[collaborator.status]}`}
        />
      )}
    </div>
  );
});

CollaboratorAvatar.displayName = 'CollaboratorAvatar';

// ============================================================================
// COLLABORATION INDICATOR
// ============================================================================

export const CollaborationIndicator: React.FC<{
  isDark?: boolean;
}> = memo(({ isDark = true }) => {
  const { isConnected, collaborators, isEnabled } = useCollaborationStore();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isEnabled) return null;

  const activeCollaborators = collaborators.filter(c => c.status === 'active');

  return (
    <div className="relative">
      {/* Main indicator button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all ${
          isDark
            ? 'bg-slate-700 hover:bg-slate-600 text-slate-200'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        } ${isConnected ? 'ring-2 ring-green-500/30' : ''}`}
      >
        {isConnected ? (
          <Wifi className="w-4 h-4 text-green-400" />
        ) : (
          <WifiOff className="w-4 h-4 text-gray-400" />
        )}
        <Users className="w-4 h-4" />
        <span className="text-sm font-medium">{activeCollaborators.length}</span>
        
        {/* Avatar stack */}
        {activeCollaborators.length > 0 && (
          <div className="flex -space-x-2 ml-1">
            {activeCollaborators.slice(0, 3).map((collab) => (
              <CollaboratorAvatar
                key={collab.id}
                collaborator={collab}
                size="sm"
                showStatus={false}
              />
            ))}
            {activeCollaborators.length > 3 && (
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                isDark ? 'bg-slate-600 text-slate-300' : 'bg-gray-300 text-gray-600'
              }`}>
                +{activeCollaborators.length - 3}
              </div>
            )}
          </div>
        )}
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div className={`absolute top-full right-0 mt-2 w-72 rounded-xl shadow-xl border z-50 ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'
        }`}>
          {/* Header */}
          <div className={`px-4 py-3 border-b ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between">
              <span className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Collaborators
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                isConnected
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>

          {/* Collaborator list */}
          <div className="max-h-64 overflow-y-auto">
            {collaborators.length === 0 ? (
              <div className={`px-4 py-6 text-center ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No collaborators yet</p>
                <p className="text-xs mt-1">Share the link to invite others</p>
              </div>
            ) : (
              <div className="py-2">
                {collaborators.map((collab) => (
                  <div
                    key={collab.id}
                    className={`flex items-center gap-3 px-4 py-2 ${
                      isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <CollaboratorAvatar collaborator={collab} />
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium text-sm ${
                        isDark ? 'text-white' : 'text-gray-900'
                      }`}>
                        {collab.name}
                      </div>
                      <div className={`text-xs flex items-center gap-1 ${
                        isDark ? 'text-slate-400' : 'text-gray-500'
                      }`}>
                        {collab.activeFile ? (
                          <>
                            <Edit3 className="w-3 h-3" />
                            {collab.activeFile.split('/').pop()}
                          </>
                        ) : (
                          <>
                            <Eye className="w-3 h-3" />
                            Viewing
                          </>
                        )}
                      </div>
                    </div>
                    <div
                      className={`w-2 h-2 rounded-full ${
                        collab.status === 'active' ? 'bg-green-500' :
                        collab.status === 'idle' ? 'bg-yellow-500' : 'bg-gray-400'
                      }`}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className={`px-4 py-3 border-t ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
            <button
              className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDark
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Open Chat
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

CollaborationIndicator.displayName = 'CollaborationIndicator';

// ============================================================================
// CURSOR OVERLAY
// ============================================================================

export const CollaboratorCursors: React.FC<{
  collaborators: Collaborator[];
  lineHeight: number;
  charWidth: number;
}> = memo(({ collaborators, lineHeight, charWidth }) => {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {collaborators.map((collab) => {
        if (!collab.cursorPosition) return null;
        
        const top = (collab.cursorPosition.line - 1) * lineHeight;
        const left = collab.cursorPosition.column * charWidth;

        return (
          <div
            key={collab.id}
            className="absolute transition-all duration-100"
            style={{ top, left }}
          >
            {/* Cursor line */}
            <div
              className="w-0.5 animate-pulse"
              style={{
                height: lineHeight,
                backgroundColor: collab.color,
              }}
            />
            {/* Name tag */}
            <div
              className="absolute -top-5 left-0 px-2 py-0.5 rounded text-xs text-white whitespace-nowrap"
              style={{ backgroundColor: collab.color }}
            >
              {collab.name}
            </div>
          </div>
        );
      })}
    </div>
  );
});

CollaboratorCursors.displayName = 'CollaboratorCursors';

// ============================================================================
// EXPORTS
// ============================================================================

export default CollaborationIndicator;
