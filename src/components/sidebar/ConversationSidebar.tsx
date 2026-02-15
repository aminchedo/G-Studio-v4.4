import React, { useState } from 'react';
import {
  useConversationSummaries,
  useConversationActions,
  useConversationStore,
} from '@/stores/conversationStore';

export const ConversationSidebar: React.FC = () => {
  const conversations = useConversationSummaries();
  const currentConversationId = useConversationStore(state => state.currentConversationId);
  const {
    createConversation,
    setCurrentConversation,
    deleteConversation,
    pinConversation,
    archiveConversation,
  } = useConversationActions();

  const [searchQuery, setSearchQuery] = useState('');

  const handleNewConversation = () => {
    const title = `New Chat ${new Date().toLocaleTimeString()}`;
    createConversation(title);
  };

  const filteredConversations = conversations.filter(conv =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="conversation-sidebar">
      <div className="sidebar-header">
        <h2>Conversations</h2>
        <button onClick={handleNewConversation} className="new-conversation-btn">
          + New Chat
        </button>
      </div>

      <div className="search-container">
        <input
          type="text"
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="conversations-list">
        {filteredConversations.length === 0 ? (
          <div className="empty-state">
            <p>No conversations yet</p>
            <p className="empty-subtitle">Create one to get started</p>
          </div>
        ) : (
          filteredConversations.map(conv => (
            <div
              key={conv.id}
              className={`conversation-item ${
                conv.id === currentConversationId ? 'active' : ''
              } ${conv.pinned ? 'pinned' : ''}`}
              onClick={() => setCurrentConversation(conv.id)}
            >
              <div className="conversation-header">
                <h3 className="conversation-title">{conv.title}</h3>
                <div className="conversation-actions">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      pinConversation(conv.id, !conv.pinned);
                    }}
                    className="action-btn"
                    title={conv.pinned ? 'Unpin' : 'Pin'}
                  >
                    {conv.pinned ? '📌' : '📍'}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Archive this conversation?')) {
                        archiveConversation(conv.id, true);
                      }
                    }}
                    className="action-btn"
                    title="Archive"
                  >
                    📦
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Delete this conversation?')) {
                        deleteConversation(conv.id);
                      }
                    }}
                    className="action-btn delete"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              {conv.lastMessage && (
                <p className="conversation-preview">
                  {conv.lastMessage.substring(0, 60)}
                  {conv.lastMessage.length > 60 ? '...' : ''}
                </p>
              )}

              <div className="conversation-meta">
                <span className="message-count">{conv.messageCount} messages</span>
                <span className="updated-time">
                  {new Date(conv.updated).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};
