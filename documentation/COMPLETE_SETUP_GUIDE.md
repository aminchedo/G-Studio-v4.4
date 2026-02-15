# 🎯 Complete G-Studio Setup Guide

## What You Have

This is a **COMPLETE, WORKING** conversational IDE with:

✅ **All Components Built**
✅ **All MCP Servers Included**  
✅ **Voice Input/Output**
✅ **Automated Setup Scripts**
✅ **Production-Ready Code**

Everything is ready to run. Just follow the steps below.

## 📦 Package Contents

```
g-studio-complete/
├── src/                        ← React app (COMPLETE)
├── electron/                   ← Electron main process (READY)
├── mcp-servers/                ← All 3 servers (BUILT)
├── config/                     ← Configuration (READY)
├── scripts/                    ← Setup automation (READY)
├── package.json                ← Dependencies defined
├── index.html                  ← Entry point
├── vite.config.ts             ← Build config
├── tailwind.config.js         ← Styling config
└── README.md                   ← Full documentation
```

## 🚀 Installation (Choose One Method)

### Method 1: Automatic Setup (RECOMMENDED)

**macOS/Linux:**

```bash
cd g-studio-complete
./scripts/setup.sh
```

**Windows:**

```cmd
cd g-studio-complete
scripts\setup.bat
```

This ONE command will:

1. ✅ Install all dependencies
2. ✅ Build all MCP servers
3. ✅ Create configuration
4. ✅ Verify everything
5. ✅ Offer to start immediately

### Method 2: Manual Setup

```bash
# 1. Install dependencies
npm install

# 2. Setup MCP servers
cd mcp-servers && ./install.sh && cd ..

# 3. Create config
cp config/mcp-config.example.json config/mcp-config.json

# 4. Start
npm run dev
```

## 🎯 First Run

1. **Get API Key** (FREE):
   - Visit https://makersuite.google.com/app/apikey
   - Create a new key
   - Copy it

2. **Launch G-Studio**:

   ```bash
   npm run dev
   ```

3. **Enter API Key**:
   - Interface will prompt you
   - Paste your key
   - Click "Save & Continue"

4. **Start Using**:
   - Choose view mode (Split recommended)
   - Start typing or speaking!

## 💬 Try These First Commands

### Text Commands

```
"Create a React component for user login"
"Show me the git status"
"Generate a color palette using #3498db"
"Remember that I prefer functional components"
```

### Voice Commands (Click microphone first)

```
[Speak]: "Create a TypeScript function for data fetching"
[Speak]: "Show what changed in git"
[Speak]: "Generate complementary colors"
```

## 🎨 View Modes

### Split View (Recommended)

- Code interface (left 2/3)
- Voice controls (right 1/3)
- Best for normal workflow

### Code Only

- Full-screen code interface
- Keyboard-focused
- Maximum code visibility

### Voice Only

- Full-screen voice interface
- Hands-free operation
- Perfect for dictation

## 🛠️ Available Tools

### Memory (6 tools)

- Store/retrieve data
- Search memories
- List all keys
- Update/delete entries

### Git (3 tools)

- Repository status
- View diffs
- Commit changes

### Design (1 tool)

- Color palette generation
- 6 harmony schemes

## ⚙️ Configuration

### Change MCP Server Paths

Edit `config/mcp-config.json`:

```json
{
  "mcpServers": {
    "memory": {
      "env": {
        "MEMORY_STORE_PATH": "./your/path/memory.json"
      }
    },
    "git": {
      "env": {
        "GIT_REPO_PATH": "/path/to/your/repo"
      }
    }
  }
}
```

### Change Voice Settings

- Click settings icon in voice panel
- Enable/disable input or output
- Select different voice
- Adjust language

### Change Gemini Model

Edit `src/lib/GeminiAPIClient.ts`:

```typescript
this.model = "gemini-2.0-flash-exp"; // Fast
// or
this.model = "gemini-1.5-pro"; // More capable
```

## 🐛 Troubleshooting

### "npm not found"

**Install Node.js from https://nodejs.org/**

### "MCP servers not starting"

```bash
cd mcp-servers
./install.sh  # or install.bat on Windows
```

### "Voice not working"

- Check browser permissions
- Allow microphone access
- Chrome/Edge work best

### "API key invalid"

- Verify key from Google AI Studio
- Check for extra spaces
- Regenerate if needed

### "Build errors"

```bash
rm -rf node_modules
npm install
```

## 📊 System Requirements

**Minimum:**

- Node.js 18+
- 4GB RAM
- Internet (for Gemini API)

**Recommended:**

- Node.js 20+
- 8GB RAM
- Microphone (for voice)
- Chrome/Edge browser

## 🎓 Usage Tips

### For Best Code Generation

1. Be specific about requirements
2. Mention language and framework
3. Use memory to store preferences
4. Provide context

### For Voice Input

1. Speak clearly and naturally
2. Pause briefly between commands
3. Use "Remember..." to store info
4. Say "Stop" to end listening

### For MCP Tools

1. Tools are called automatically
2. Watch tool execution in real-time
3. Results shown immediately
4. Can chain multiple tools

## 📝 Quick Command Reference

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run package          # Create distributable

# MCP Servers
npm run setup:mcp        # Setup servers (Unix)
npm run setup:mcp:win    # Setup servers (Windows)
```

## 🔐 Security

- ✅ API key stored locally only
- ✅ MCP servers isolated
- ✅ No external data sent (except Gemini)
- ✅ Voice processing in-browser
- ✅ Memory stored locally

## 🆘 Need Help?

1. Check this guide
2. Read README.md
3. Review MCP server docs
4. Check browser console
5. Verify API key

## 🎉 You're Ready!

Everything is set up and ready to go. Just run:

```bash
./scripts/setup.sh  # or setup.bat on Windows
```

Then start coding with AI! 🚀

---

## Final Checklist

Before running, verify:

- ✅ Node.js 18+ installed
- ✅ In `g-studio-complete` directory
- ✅ Have Gemini API key ready
- ✅ Microphone connected (for voice)

Then:

```bash
./scripts/setup.sh
```

**That's it!** The script does everything else automatically.

## What Happens Next

1. Script installs dependencies (2-3 min)
2. Builds MCP servers (1-2 min)
3. Creates configuration
4. Verifies installation
5. Offers to start immediately

Total time: **5 minutes**

Then you can start having conversations with AI and writing code through natural language! 🎯
