# G-Studio v2.3.0 - Advanced AI-Powered IDE

<div align="center">

![G-Studio Logo](assets/icon-256.png)

**A Modern, AI-Powered Development Environment**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.2-61dafb.svg)](https://reactjs.org/)
[![Electron](https://img.shields.io/badge/Electron-Latest-47848f.svg)](https://www.electronjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[Features](#-features) • [Installation](#-installation) • [Documentation](#-documentation) • [Project Structure](#-project-structure)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Project Structure](#-project-structure)
- [Documentation](#-documentation)
- [Development](#-development)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

G-Studio is a next-generation IDE that combines the power of AI with modern development tools. Built with TypeScript, React, and Electron, it provides an intelligent coding experience with features like:

- 🤖 **AI-Powered Assistance** - Multiple AI providers (Gemini, OpenAI, Custom)
- 🎤 **Voice Chat** - Persian and English voice interaction
- 🔧 **Custom Providers** - Add any OpenAI-compatible AI service
- 📊 **Code Intelligence** - Advanced code analysis and suggestions
- 🎨 **Modern UI** - Beautiful, responsive interface
- 🌍 **Multilingual** - Full Persian (RTL) and English support

---

## ✨ Features

### AI Integration
- **Multiple AI Providers**: Gemini, OpenAI, Anthropic, and custom providers
- **Voice Chat**: Speech-to-text and text-to-speech in Persian and English
- **Smart Model Selection**: Automatic model recommendation based on task
- **Streaming Responses**: Real-time AI responses
- **Context Management**: Intelligent context handling for better responses

### Code Intelligence
- **Code Analysis**: AST-based code understanding
- **Dependency Mapping**: Visualize code dependencies
- **Impact Analysis**: See the impact of code changes
- **Refactoring Suggestions**: AI-powered refactoring recommendations
- **Code Metrics**: Track code quality and complexity

### Development Tools
- **Monaco Editor**: Full-featured code editor
- **Live Preview**: Real-time preview of changes
- **Diff Viewer**: Compare code changes
- **File Tree**: Virtualized file explorer
- **Terminal Integration**: Built-in terminal

### User Experience
- **Dark/Light Theme**: Customizable themes
- **Keyboard Shortcuts**: Extensive keyboard support
- **Command Palette**: Quick access to all features
- **Responsive Design**: Works on all screen sizes
- **Accessibility**: WCAG compliant

---

## 🚀 Installation

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- Git

### Install Dependencies

```bash
# Using npm
npm install

# Using pnpm
pnpm install
```

### Development Mode

```bash
# Start development server
npm run dev

# Start Electron app
npm run electron:dev
```

### Production Build

```bash
# Build for production
npm run build

# Build Electron app
npm run electron:build
```

---

## 🎬 Quick Start

### 1. Setup API Key

Open Settings (Ctrl+,) and enter your AI provider API key:
- **Gemini**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
- **OpenAI**: Get from [OpenAI Platform](https://platform.openai.com/api-keys)

### 2. Start Coding

1. Open a file or create a new one
2. Start typing and get AI suggestions
3. Use Ctrl+Space for code completion
4. Press Ctrl+K for AI chat

### 3. Voice Chat

1. Click the microphone icon or press Ctrl+M
2. Allow microphone access
3. Speak in Persian or English
4. Get AI responses with voice

---

## 📁 Project Structure

```
G-Studio-v2.3.0-Complete/
├── 📂 components/              # React components
│   ├── 📂 common/             # Shared components
│   │   ├── ErrorBoundary.tsx
│   │   ├── Icons.tsx
│   │   ├── NotificationToast.tsx
│   │   └── ...
│   ├── 📂 modals/             # Modal dialogs
│   │   ├── AgentModal.tsx
│   │   ├── CommandPalette.tsx
│   │   ├── SettingsModal.tsx
│   │   ├── VoiceChatModal.tsx
│   │   └── ...
│   ├── 📂 panels/             # Side panels
│   │   ├── CodeMetricsPanel.tsx
│   │   ├── PreviewPanel.tsx
│   │   ├── SystemStatusPanel.tsx
│   │   └── ...
│   ├── 📂 editor/             # Editor components
│   │   ├── CodeEditor.tsx
│   │   ├── EditorTabs.tsx
│   │   ├── DiffViewer.tsx
│   │   └── ...
│   ├── 📂 chat/               # Chat components
│   │   ├── InputArea.tsx
│   │   ├── MessageList.tsx
│   │   ├── StreamingStatus.tsx
│   │   └── ...
│   ├── 📂 ai/                 # AI components
│   │   ├── AISettingsHub.tsx
│   │   ├── AgentSelector.tsx
│   │   ├── MultiAgentStatus.tsx
│   │   └── ...
│   ├── 📂 code-intelligence/  # Code analysis
│   │   ├── CodeIntelligenceDashboard.tsx
│   │   ├── DependencyGraph.tsx
│   │   ├── RefactoringSuggestions.tsx
│   │   └── ...
│   ├── 📂 layout/             # Layout components
│   │   ├── Sidebar.tsx
│   │   ├── Ribbon.tsx
│   │   ├── FileTree.tsx
│   │   └── ...
│   ├── 📂 AISettingsHub/      # AI settings
│   ├── 📂 ribbon/             # Ribbon components
│   ├── 📂 file-tree/          # File tree
│   ├── 📂 message-list/       # Message list
│   └── 📂 gemini-tester/      # Gemini tester
│
├── 📂 services/               # Business logic
│   ├── 📂 ai/                 # AI services
│   │   ├── geminiService.ts
│   │   ├── modelSelectionService.ts
│   │   ├── smartModelSelector.ts
│   │   └── ...
│   ├── 📂 aiProviders/        # AI provider system
│   │   ├── base.ts
│   │   ├── factory.ts
│   │   ├── custom.ts
│   │   ├── openai.ts
│   │   ├── storage.ts
│   │   └── types.ts
│   ├── 📂 code/               # Code services
│   │   ├── codeCompletionService.ts
│   │   └── filesystemAdapter.ts
│   ├── 📂 codeIntelligence/   # Code analysis
│   ├── 📂 monitoring/         # Monitoring
│   │   ├── telemetryService.ts
│   │   ├── llmMonitor.ts
│   │   └── ...
│   ├── 📂 security/           # Security
│   │   ├── policyEngine.ts
│   │   ├── secureStorage.ts
│   │   └── ...
│   ├── 📂 storage/            # Data storage
│   │   ├── databaseService.ts
│   │   ├── contextManager.ts
│   │   └── ...
│   ├── 📂 network/            # Network
│   │   ├── circuitBreaker.ts
│   │   ├── rateLimitService.ts
│   │   └── ...
│   ├── 📂 policies/           # Policy files
│   └── 📂 errorHandling/      # Error handling
│
├── 📂 hooks/                  # React hooks
│   ├── 📂 ai/                 # AI hooks
│   ├── 📂 code/               # Code hooks
│   ├── 📂 core/               # Core hooks
│   ├── 📂 utils/              # Utility hooks
│   ├── 📂 voice/              # Voice hooks
│   ├── useSpeechRecognition.ts
│   ├── useEditorState.ts
│   ├── useChatState.ts
│   └── ...
│
├── 📂 contexts/               # React contexts
│   ├── AppStateContext.tsx
│   ├── ModalContext.tsx
│   ├── DatabaseContext.tsx
│   └── ...
│
├── 📂 types/                  # TypeScript types
│   ├── common.ts
│   ├── codeIntelligence.ts
│   └── prettier.d.ts
│
├── 📂 utils/                  # Utility functions
│   ├── apiClient.ts
│   ├── errorHandler.ts
│   ├── logger.ts
│   └── ...
│
├── 📂 styles/                 # Stylesheets
│   └── design-tokens.css
│
├── 📂 assets/                 # Static assets
│   ├── icon-256.png
│   └── ...
│
├── 📂 docs/                   # Documentation
│   ├── 📂 guides/             # User guides
│   │   ├── CUSTOM_PROVIDERS_GUIDE.md
│   │   └── VOICE_CHAT_GUIDE.md
│   ├── INTEGRATION_SUMMARY.md
│   ├── PHASE_6_IMPLEMENTATION_COMPLETE.md
│   ├── STATE_MANAGEMENT_GUIDE.md
│   └── ...
│
├── 📂 electron/               # Electron main process
│   ├── main.cjs
│   └── preload.cjs
│
├── 📂 public/                 # Public assets
├── 📂 scripts/                # Build scripts
├── 📂 __tests__/              # Tests
│
├── 📂 components/app/         # Main app components
│   ├── App.tsx                # Main app component
│   ├── AppNew.tsx             # Refactored app component
│   └── AppProvider.tsx        # App context provider
├── index.tsx                  # Entry point
├── index.html                 # HTML template
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript configuration
├── tailwind.config.js         # Tailwind configuration
├── package.json               # Dependencies
└── README.md                  # This file
```

---

## 📚 Documentation

### User Guides
- [Custom Providers Guide](docs/guides/CUSTOM_PROVIDERS_GUIDE.md) - Add custom AI providers
- [Voice Chat Guide](docs/guides/VOICE_CHAT_GUIDE.md) - Use voice chat features
- [Quick Start Guide](docs/QUICK_START_GUIDE.md) - Get started quickly

### Technical Documentation
- [Integration Summary](docs/INTEGRATION_SUMMARY.md) - Complete integration overview
- [State Management Guide](docs/STATE_MANAGEMENT_GUIDE.md) - State management patterns
- [Phase 6 Implementation](docs/PHASE_6_IMPLEMENTATION_COMPLETE.md) - Provider system details
- [NexusAI Integration](docs/NEXUSAI_INTEGRATION_COMPLETE.md) - NexusAI features

### API Documentation
- [AI Providers API](services/aiProviders/README.md) - Provider system API
- [Code Intelligence API](services/codeIntelligence/README.md) - Code analysis API

---

## 🛠️ Development

### Tech Stack

- **Frontend**: React 18, TypeScript 5
- **UI**: Tailwind CSS, Lucide Icons
- **Editor**: Monaco Editor
- **Build**: Vite
- **Desktop**: Electron
- **State**: React Context, Zustand
- **AI**: Google Gemini, OpenAI

### Development Commands

```bash
# Start development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format

# Run tests
npm run test

# Build for production
npm run build
```

### Project Scripts

Restructure validation
- Script: scripts/tmp_rovodev_validate_restructure.ps1
- Purpose: Safely verifies that no legacy root-level /components imports exist, creates a timestamped backup, performs a no-op normalization pass for legacy paths, and runs a type-check.
- Usage:
  - Windows PowerShell: powershell -ExecutionPolicy Bypass -File scripts/tmp_rovodev_validate_restructure.ps1
  - Notes:
    - The script excludes node_modules, dist, coverage, and .git from backups
    - It is idempotent; if no legacy imports exist, it will make no changes
    - Keep this script around to re-validate after future refactors


| Script | Description |
|--------|-------------|
| `dev` | Start development server |
| `build` | Build for production |
| `preview` | Preview production build |
| `electron:dev` | Start Electron in development |
| `electron:build` | Build Electron app |
| `type-check` | Run TypeScript type checking |
| `lint` | Run ESLint |
| `format` | Format code with Prettier |
| `test` | Run tests |

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow the existing code style
- Add tests for new features
- Update documentation

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Google Gemini](https://ai.google.dev/) - AI provider
- [OpenAI](https://openai.com/) - AI provider
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code editor
- [React](https://reactjs.org/) - UI framework
- [Electron](https://www.electronjs.org/) - Desktop framework
- [Tailwind CSS](https://tailwindcss.com/) - CSS framework

---

## 📞 Support

- 📧 Email: support@gstudio.dev
- 💬 Discord: [Join our community](https://discord.gg/gstudio)
- 🐛 Issues: [GitHub Issues](https://github.com/gstudio/issues)
- 📖 Docs: [Documentation](https://docs.gstudio.dev)

---

<div align="center">

**Made with ❤️ by the G-Studio Team**

[Website](https://gstudio.dev) • [Documentation](https://docs.gstudio.dev) • [Blog](https://blog.gstudio.dev)

</div>
