# 🚀 G-Studio - Complete Conversational IDE

**A fully-integrated conversational IDE powered by Google Gemini 2.0 with voice input/output and complete MCP tools access.**

## ✨ What You're Getting

This is a **complete, production-ready IDE** with:

### 🎯 Core Features
- **💬 Conversational Code Writing**: Describe what you want, get complete production code
- **🎤 Voice Input**: Speak naturally to write code
- **🔊 Voice Output**: AI reads responses aloud automatically
- **🧠 Long-term Memory**: AI remembers your preferences across sessions
- **🔧 Git Integration**: Status, diff, commit via conversation or voice
- **🎨 Design Tools**: Color palette generation
- **📱 Three View Modes**: Code-only, Voice-only, or Split view

### 🛠️ Technical Stack
- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **AI Model**: Google Gemini 2.0 Flash
- **Desktop**: Electron 28
- **Tools**: 10 MCP tools (Memory, Git, Design)
- **Voice**: Web Speech API (built-in browser support)

## 📦 Package Contents

```
g-studio-complete/
├── src/
│   ├── components/
│   │   ├── ConversationalCodeInterface.tsx    # Main code interface
│   │   ├── VoiceConversationUI.tsx            # Voice input/output UI
│   │   └── IntegratedConversationalIDE.tsx    # Combined interface
│   ├── lib/
│   │   ├── GeminiAPIClient.ts                 # Gemini integration
│   │   └── MCPToolsManager-Production.ts       # MCP tools manager
│   └── types.d.ts                             # TypeScript definitions
├── electron/
│   ├── MCPServerManager.ts                    # MCP server lifecycle
│   └── preload.ts                             # Secure IPC bridge
├── mcp-servers/                               # All MCP servers included!
│   ├── memory-mcp-server/
│   ├── git-mcp-server/
│   ├── design-tools-mcp-server/
│   └── install.sh / install.bat
├── config/
│   └── mcp-config.example.json
├── scripts/
│   └── setup.sh / setup.bat
└── package.json
```

## 🚀 One-Command Setup

### Automatic Installation

**macOS/Linux:**
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

**Windows:**
```cmd
scripts\setup.bat
```

This will:
1. ✅ Install all Node dependencies
2. ✅ Build all MCP servers
3. ✅ Setup configuration files
4. ✅ Verify everything works
5. ✅ Start the IDE

### Manual Installation (if needed)

```bash
# 1. Install dependencies
npm install

# 2. Setup MCP servers
cd mcp-servers
./install.sh  # or install.bat on Windows

# 3. Copy config
cp config/mcp-config.example.json config/mcp-config.json

# 4. Start development
npm run dev
```

## 🎯 Quick Start Guide

### 1. Get Gemini API Key (FREE)
Visit [Google AI Studio](https://makersuite.google.com/app/apikey) and create a key.

### 2. Launch G-Studio
```bash
npm run dev
```

### 3. First Use
- Enter your Gemini API key when prompted
- Choose your view mode (Split view recommended)
- Start talking or typing!

### 4. Try Voice Commands

**Enable microphone**, then speak:

```
"Create a React component for user authentication"
```

AI will:
- Listen to your voice ✅
- Write complete TypeScript code ✅
- Read the response aloud ✅
- Show syntax-highlighted code ✅

## 💡 Usage Examples

### Example 1: Voice-to-Code

**You** (speaking): "Create a TypeScript function to debounce API calls"

**AI** (responds and speaks):
```typescript
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
```

### Example 2: Memory + Voice

**You**: "Remember that I prefer functional components with TypeScript"

**AI**: *[Uses memory_store tool]* "✓ Stored! I'll use functional components with TypeScript in all future code."

Later...

**You**: "Create a button component"

**AI**: *[Retrieves from memory]* "Creating a functional component with TypeScript as you prefer..."

### Example 3: Git Workflow

**You**: "Show what changed and create a commit"

**AI**: 
- *[Uses git_status]* "You have changes in 3 files..."
- *[Uses git_diff]* "Here are the modifications..."
- *[Uses git_commit]* "✓ Committed with message: feat: add new features"

### Example 4: Design with Voice

**You** (speaking): "Generate a complementary color palette using hex 3498db"

**AI** (shows and speaks):
```
Here's your complementary palette:
• #3498db - Primary Blue
• #e67e22 - Complementary Orange

Perfect for creating visual contrast in your UI!
```

## 🎨 View Modes

### 1. Code Only Mode
- Full-screen code interface
- Text-based conversation
- Keyboard-focused workflow

### 2. Voice Only Mode
- Full-screen voice interface  
- Hands-free operation
- Visual audio feedback

### 3. Split View Mode (Recommended)
- Code interface on left (2/3 screen)
- Voice controls on right (1/3 screen)
- Best of both worlds

## 🛠️ Available Tools

### Memory Tools (6)
- `memory_store` - Store information
- `memory_retrieve` - Get stored data
- `memory_search` - Search memories
- `memory_list` - List all keys
- `memory_delete` - Delete entries
- `memory_update` - Update entries

### Git Tools (3)
- `git_status` - Repository status
- `git_diff` - View changes
- `git_commit` - Commit changes

### Design Tools (1)
- `generate_color_palette` - Color harmonies

## ⚙️ Configuration

### MCP Servers
Edit `config/mcp-config.json`:

```json
{
  "mcpServers": {
    "memory": {
      "command": "node",
      "args": ["./mcp-servers/memory-mcp-server/build/memory-mcp-server.js"],
      "env": {
        "MEMORY_STORE_PATH": "./data/memory-store.json"
      }
    },
    "git": {
      "command": "node",
      "args": ["./mcp-servers/git-mcp-server/build/git-mcp-server.js"],
      "env": {
        "GIT_REPO_PATH": "."
      }
    },
    "design-tools": {
      "command": "node",
      "args": ["./mcp-servers/design-tools-mcp-server/build/design-mcp-server.js"]
    }
  }
}
```

### Voice Settings
- **Input**: Adjustable in voice panel
- **Output**: Select from available system voices
- **Language**: English (US) by default

### Gemini Settings
- **Model**: gemini-2.0-flash-exp (default)
- **Temperature**: 0.7
- **Max Tool Calls**: 5 per conversation

## 🔧 Development

### Project Structure
```
src/
├── components/          # React components
├── lib/                # Core libraries
├── hooks/              # Custom React hooks
└── types.d.ts          # TypeScript definitions

electron/
├── MCPServerManager.ts # MCP lifecycle
└── preload.ts          # IPC bridge

mcp-servers/
├── memory-mcp-server/  # Memory storage
├── git-mcp-server/     # Git operations
└── design-tools-mcp-server/ # Design utilities
```

### Adding Features

**New MCP Tool:**
1. Create new MCP server in `mcp-servers/`
2. Add to `config/mcp-config.json`
3. Rebuild: `cd mcp-servers/your-server && npm run build`
4. Restart G-Studio

**Custom Voice Commands:**
Edit system prompt in `src/lib/GeminiAPIClient.ts`

**UI Customization:**
All components use Tailwind - edit classes directly

## 🐛 Troubleshooting

### Voice Not Working
**Issue**: Microphone not detected

**Solution**:
```bash
# Check browser permissions
# Chrome: chrome://settings/content/microphone
# Allow microphone access for localhost
```

### MCP Tools Not Loading
**Issue**: Tools show as unavailable

**Solution**:
```bash
# Check MCP server status in DevTools console
window.mcpBridge.getStatus()

# Rebuild MCP servers
cd mcp-servers
./install.sh
```

### Gemini API Errors
**Issue**: 429 Rate limit errors

**Solution**:
- Free tier: 60 requests/minute
- Wait 60 seconds or upgrade to paid tier
- Reduce max tool calls in settings

### Build Errors
**Issue**: TypeScript compilation fails

**Solution**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
npm run build
```

## 📚 Documentation

- **Quick Start**: This README
- **MCP Tools**: See `mcp-servers/README.md`
- **Integration Guide**: See `mcp-servers/MCP_INTEGRATION_GUIDE.md`
- **Voice API**: Web Speech API docs

## 🎓 Tips & Best Practices

### Voice Input Tips
1. **Speak clearly** in a quiet environment
2. **Pause briefly** between commands
3. **Use natural language** - no special syntax
4. **Say "stop"** to end listening

### Getting Best Code
1. **Be specific**: "Create a React hook for data fetching with caching and error handling"
2. **Provide context**: "Using TypeScript and functional components"
3. **Use memory**: "Remember I prefer arrow functions"

### Workflow Tips
1. **Start with voice** for quick ideas
2. **Switch to text** for complex code
3. **Use split view** for best experience
4. **Let AI read code** while you review visually

## 🔐 Security & Privacy

- ✅ API key stored locally only
- ✅ MCP servers run in isolated processes
- ✅ No data sent to external servers (except Gemini API)
- ✅ Voice processing happens in-browser
- ✅ Memory stored locally in JSON files

## 🚢 Building for Production

```bash
# Build the application
npm run build

# Package for your platform
npm run package

# Output in dist/ folder
```

## 📊 System Requirements

**Minimum:**
- Node.js 18+
- 4GB RAM
- Chrome/Edge browser (for voice)
- Internet connection (for Gemini API)

**Recommended:**
- Node.js 20+
- 8GB RAM
- macOS/Windows/Linux
- Microphone for voice input
- Speakers for voice output

## 🆘 Support

**Having issues?**

1. Check [Troubleshooting](#troubleshooting) section
2. Review MCP server logs in DevTools
3. Verify API key is valid
4. Test MCP tools individually

## 📝 License

MIT License - Free to use and modify

## 🎉 What's Next?

You now have a **complete conversational IDE** with:
- ✅ Voice input and output
- ✅ Code generation via conversation
- ✅ Full MCP tools access
- ✅ Memory across sessions
- ✅ Git integration
- ✅ Design utilities
- ✅ Production-ready code

**Start building amazing things with AI!** 🚀

---

## Quick Command Reference

```bash
# Development
npm run dev                    # Start development server
npm run build                  # Build for production
npm run package                # Create distributable

# MCP Servers
npm run setup:mcp             # Setup MCP servers (Unix)
npm run setup:mcp:win         # Setup MCP servers (Windows)

# Type Checking
npm run type-check            # Check TypeScript types
npm run lint                  # Lint code
```

**Ready to code with AI? Run `npm run dev` and let's go!** 🎯
