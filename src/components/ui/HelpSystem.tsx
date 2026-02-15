/**
 * HelpSystem Component - Contextual Help and Documentation
 * Provides searchable help, tutorials, and contextual assistance
 */

import React, { useState, useMemo } from 'react';
import { HelpCircle, Search, Book, Video, FileText, ExternalLink, X, ChevronRight, Lightbulb } from 'lucide-react';

export interface HelpArticle {
  id: string;
  title: string;
  content: string;
  category: 'getting-started' | 'features' | 'shortcuts' | 'troubleshooting' | 'api' | 'advanced';
  tags: string[];
  videoUrl?: string;
  relatedArticles?: string[];
}

export interface HelpSystemProps {
  articles?: HelpArticle[];
  contextualHelp?: string; // Current context for contextual help
  onClose?: () => void;
}

const defaultArticles: HelpArticle[] = [
  {
    id: 'getting-started',
    title: 'Getting Started with G-Studio',
    content: `# Welcome to G-Studio!

G-Studio is an AI-powered IDE that helps you build applications faster with intelligent assistance.

## Quick Start

1. **Create a new file**: Press Ctrl+N or click the "New File" button
2. **Open Command Palette**: Press Ctrl+K to access all commands
3. **Start coding**: Begin typing and get AI-powered suggestions
4. **Preview your work**: Toggle preview with Ctrl+Shift+P

## Key Features

- **AI Assistant**: Get intelligent code suggestions and explanations
- **Live Preview**: See your changes in real-time
- **Code Navigation**: Jump to definitions and find references
- **Diff Viewer**: Review and accept AI-suggested changes
- **Multi-file Support**: Work with multiple files simultaneously

## Next Steps

- Check out the [Features Guide](#features)
- Learn [Keyboard Shortcuts](#shortcuts)
- Watch our [Video Tutorials](#videos)`,
    category: 'getting-started',
    tags: ['basics', 'introduction', 'quickstart'],
    relatedArticles: ['keyboard-shortcuts', 'command-palette'],
  },
  {
    id: 'command-palette',
    title: 'Using the Command Palette',
    content: `# Command Palette

The Command Palette is your quick access to all G-Studio features.

## Opening the Palette

Press **Ctrl+K** (or **Cmd+K** on Mac) to open the command palette.

## Features

- **Fuzzy Search**: Type partial matches to find commands quickly
- **Recent Commands**: Your most-used commands appear first
- **Categories**: Commands are organized by type (File, Edit, View, etc.)
- **Keyboard Shortcuts**: See shortcuts for each command

## Tips

- Use arrow keys to navigate
- Press Enter to execute
- Press Escape to close
- Commands are searchable by name or shortcut

## Popular Commands

- **New File** (Ctrl+N): Create a new file
- **Save File** (Ctrl+S): Save current file
- **Format Code** (Shift+Alt+F): Format your code
- **Go to Symbol** (Ctrl+Shift+O): Navigate to symbols`,
    category: 'features',
    tags: ['command-palette', 'shortcuts', 'navigation'],
    relatedArticles: ['keyboard-shortcuts', 'getting-started'],
  },
  {
    id: 'keyboard-shortcuts',
    title: 'Keyboard Shortcuts',
    content: `# Keyboard Shortcuts

Master G-Studio with these essential keyboard shortcuts.

## File Operations

- **Ctrl+N**: New File
- **Ctrl+O**: Open File
- **Ctrl+S**: Save File
- **Ctrl+W**: Close File

## Editing

- **Ctrl+Z**: Undo
- **Ctrl+Y**: Redo
- **Ctrl+F**: Find
- **Ctrl+H**: Replace
- **Shift+Alt+F**: Format Code

## Navigation

- **Ctrl+P**: Quick Open
- **Ctrl+G**: Go to Line
- **F12**: Go to Definition
- **Shift+F12**: Find References

## View

- **Ctrl+B**: Toggle Sidebar
- **Ctrl+Shift+P**: Toggle Preview
- **Ctrl+\`**: Toggle Terminal

## Customization

Press **Ctrl+/** to open the keyboard shortcuts panel where you can customize shortcuts.`,
    category: 'shortcuts',
    tags: ['keyboard', 'shortcuts', 'hotkeys'],
    relatedArticles: ['command-palette', 'getting-started'],
  },
  {
    id: 'diff-viewer',
    title: 'Using the Diff Viewer',
    content: `# Diff Viewer

Review and manage code changes with the visual diff viewer.

## Features

- **Side-by-side or Unified View**: Choose your preferred layout
- **Accept/Reject Changes**: Review changes individually
- **Syntax Highlighting**: Color-coded diffs
- **Change Explanations**: Understand why changes were made

## Usage

1. When AI suggests changes, the diff viewer opens automatically
2. Review each change (hunks)
3. Select changes to accept or reject
4. Click "Accept All" or "Reject All" for bulk actions

## Tips

- Use checkboxes to select multiple hunks
- Hover over changes to see explanations
- Press Escape to close without applying changes`,
    category: 'features',
    tags: ['diff', 'changes', 'review', 'ai'],
    relatedArticles: ['ai-assistant', 'code-review'],
  },
  {
    id: 'troubleshooting-api',
    title: 'Troubleshooting API Issues',
    content: `# Troubleshooting API Issues

Common API problems and solutions.

## Invalid API Key

**Problem**: "Invalid API Key" error

**Solution**:
1. Open Settings (Ctrl+,)
2. Check your API key is correct
3. Ensure no extra spaces
4. Try regenerating your key

## Rate Limit Exceeded

**Problem**: "Too Many Requests" error

**Solution**:
1. Wait 60 seconds before retrying
2. Check your API quota
3. Consider upgrading your plan

## Network Errors

**Problem**: "Network Error" or "Failed to fetch"

**Solution**:
1. Check your internet connection
2. Verify firewall settings
3. Try disabling VPN temporarily
4. Check if the API service is online

## Quota Exceeded

**Problem**: "Quota Exceeded" error

**Solution**:
1. Check your usage in Settings
2. Wait for quota reset (usually monthly)
3. Upgrade your plan for more quota`,
    category: 'troubleshooting',
    tags: ['api', 'errors', 'troubleshooting'],
    relatedArticles: ['getting-started', 'settings'],
  },
];

export const HelpSystem: React.FC<HelpSystemProps> = ({
  articles = defaultArticles,
  contextualHelp,
  onClose,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);

  // Filter articles
  const filteredArticles = useMemo(() => {
    return articles.filter(article => {
      const matchesSearch = searchQuery === '' ||
        article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        article.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesCategory = activeCategory === 'all' || article.category === activeCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [articles, searchQuery, activeCategory]);

  const categories = [
    { id: 'all', label: 'All', icon: Book },
    { id: 'getting-started', label: 'Getting Started', icon: Lightbulb },
    { id: 'features', label: 'Features', icon: FileText },
    { id: 'shortcuts', label: 'Shortcuts', icon: HelpCircle },
    { id: 'troubleshooting', label: 'Troubleshooting', icon: HelpCircle },
    { id: 'api', label: 'API', icon: FileText },
    { id: 'advanced', label: 'Advanced', icon: Book },
  ];

  const handleClose = () => {
    setIsOpen(false);
    setSelectedArticle(null);
    onClose?.();
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg transition-colors z-50"
        title="Help & Documentation"
      >
        <HelpCircle className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-6xl h-[85vh] bg-slate-900 rounded-lg shadow-2xl border border-slate-700 flex">
        {/* Sidebar */}
        <div className="w-80 border-r border-slate-800 flex flex-col">
          {/* Header */}
          <div className="px-4 py-4 border-b border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-semibold text-white">Help</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-1 hover:bg-slate-800 rounded transition-colors"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search help..."
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="px-4 py-3 border-b border-slate-800">
            <div className="space-y-1">
              {categories.map(cat => {
                const Icon = cat.icon;
                const count = articles.filter(a => 
                  cat.id === 'all' || a.category === cat.id
                ).length;
                
                return (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setActiveCategory(cat.id);
                      setSelectedArticle(null);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded transition-colors ${
                      activeCategory === cat.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4" />
                      <span className="text-sm">{cat.label}</span>
                    </div>
                    <span className="text-xs opacity-60">{count}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Articles List */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            {filteredArticles.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No articles found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredArticles.map(article => (
                  <button
                    key={article.id}
                    onClick={() => setSelectedArticle(article)}
                    className={`w-full text-left px-3 py-2 rounded transition-colors ${
                      selectedArticle?.id === article.id
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{article.title}</span>
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    </div>
                    {article.videoUrl && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-blue-400">
                        <Video className="w-3 h-3" />
                        <span>Video available</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col">
          {selectedArticle ? (
            <>
              {/* Article Header */}
              <div className="px-6 py-4 border-b border-slate-800">
                <h1 className="text-2xl font-bold text-white mb-2">
                  {selectedArticle.title}
                </h1>
                <div className="flex flex-wrap gap-2">
                  {selectedArticle.tags.map(tag => (
                    <span
                      key={tag}
                      className="px-2 py-1 bg-slate-800 text-slate-300 text-xs rounded"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Article Content */}
              <div className="flex-1 overflow-y-auto px-6 py-6">
                {/* Video */}
                {selectedArticle.videoUrl && (
                  <div className="mb-6 bg-slate-800 rounded-lg overflow-hidden">
                    <div className="aspect-video flex items-center justify-center">
                      <Video className="w-12 h-12 text-slate-600" />
                      <p className="text-slate-400 ml-3">Video tutorial</p>
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="prose prose-invert max-w-none">
                  <div
                    className="text-slate-300 leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: selectedArticle.content
                        .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-bold text-white mb-4 mt-6">$1</h1>')
                        .replace(/^## (.+)$/gm, '<h2 class="text-xl font-semibold text-white mb-3 mt-5">$1</h2>')
                        .replace(/^### (.+)$/gm, '<h3 class="text-lg font-medium text-white mb-2 mt-4">$1</h3>')
                        .replace(/^\*\*(.+?)\*\*:/gm, '<strong class="text-white">$1:</strong>')
                        .replace(/^\- (.+)$/gm, '<li class="ml-4 mb-1">$1</li>')
                        .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 mb-1">$2</li>')
                        .replace(/\n\n/g, '</p><p class="mb-4">')
                        .replace(/^(.+)$/gm, '<p class="mb-4">$1</p>')
                    }}
                  />
                </div>

                {/* Related Articles */}
                {selectedArticle.relatedArticles && selectedArticle.relatedArticles.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-slate-800">
                    <h3 className="text-lg font-semibold text-white mb-3">Related Articles</h3>
                    <div className="space-y-2">
                      {selectedArticle.relatedArticles.map(relatedId => {
                        const related = articles.find(a => a.id === relatedId);
                        if (!related) return null;
                        
                        return (
                          <button
                            key={relatedId}
                            onClick={() => setSelectedArticle(related)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-slate-800 hover:bg-slate-750 rounded transition-colors text-left"
                          >
                            <span className="text-sm text-slate-300">{related.title}</span>
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-400">
              <div className="text-center">
                <Book className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Select an article to read</p>
                <p className="text-sm">Choose from the list on the left</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Contextual Help Tooltip
export interface ContextualHelpProps {
  topic: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const ContextualHelp: React.FC<ContextualHelpProps> = ({
  topic,
  content,
  position = 'top',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
  };

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="p-1 hover:bg-slate-800 rounded transition-colors"
        title={topic}
      >
        <HelpCircle className="w-4 h-4 text-slate-400" />
      </button>

      {isVisible && (
        <div className={`absolute z-50 ${positionClasses[position]}`}>
          <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-3 max-w-xs">
            <p className="text-xs font-semibold text-white mb-1">{topic}</p>
            <p className="text-xs text-slate-300">{content}</p>
          </div>
        </div>
      )}
    </div>
  );
};
