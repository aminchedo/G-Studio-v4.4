#!/bin/bash

# G-Studio Complete Setup Script
# Automatically installs and configures everything

set -e  # Exit on error

echo "================================================"
echo "  G-Studio Conversational IDE - Setup"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo -e "${BLUE}[1/6]${NC} Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}⚠️  Node.js not found!${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi
NODE_VERSION=$(node --version)
echo -e "${GREEN}✓${NC} Node.js ${NODE_VERSION} found"
echo ""

# Install dependencies
echo -e "${BLUE}[2/6]${NC} Installing dependencies..."
npm install
echo -e "${GREEN}✓${NC} Dependencies installed"
echo ""

# Setup MCP servers
echo -e "${BLUE}[3/6]${NC} Setting up MCP servers..."
cd mcp-servers

# Make install script executable
chmod +x install.sh

# Run MCP server installation
if ./install.sh; then
    echo -e "${GREEN}✓${NC} MCP servers installed successfully"
else
    echo -e "${YELLOW}⚠️  MCP server installation had issues${NC}"
    echo "   You can retry later with: cd mcp-servers && ./install.sh"
fi
cd ..
echo ""

# Setup configuration
echo -e "${BLUE}[4/6]${NC} Setting up configuration..."
if [ ! -f "config/mcp-config.json" ]; then
    cp config/mcp-config.example.json config/mcp-config.json
    echo -e "${GREEN}✓${NC} Configuration file created"
else
    echo -e "${GREEN}✓${NC} Configuration file already exists"
fi
echo ""

# Create data directory
echo -e "${BLUE}[5/6]${NC} Creating data directories..."
mkdir -p data
echo -e "${GREEN}✓${NC} Data directories created"
echo ""

# Verify installation
echo -e "${BLUE}[6/6]${NC} Verifying installation..."

# Check if all key files exist
ERRORS=0

if [ ! -f "src/components/IntegratedConversationalIDE.tsx" ]; then
    echo -e "${YELLOW}⚠️${NC}  Main component missing"
    ERRORS=$((ERRORS + 1))
fi

if [ ! -d "mcp-servers/memory-mcp-server/build" ]; then
    echo -e "${YELLOW}⚠️${NC}  Memory server not built"
    ERRORS=$((ERRORS + 1))
fi

if [ ! -d "mcp-servers/git-mcp-server/build" ]; then
    echo -e "${YELLOW}⚠️${NC}  Git server not built"
    ERRORS=$((ERRORS + 1))
fi

if [ ! -d "mcp-servers/design-tools-mcp-server/build" ]; then
    echo -e "${YELLOW}⚠️${NC}  Design tools server not built"
    ERRORS=$((ERRORS + 1))
fi

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓${NC} All components verified"
else
    echo -e "${YELLOW}⚠️${NC}  Found $ERRORS issues - review above"
fi
echo ""

# Final instructions
echo "================================================"
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo "================================================"
echo ""
echo "Next steps:"
echo ""
echo "1. Get your FREE Gemini API key:"
echo "   → https://makersuite.google.com/app/apikey"
echo ""
echo "2. Start G-Studio:"
echo -e "   ${BLUE}npm run dev${NC}"
echo ""
echo "3. Enter your API key when prompted"
echo ""
echo "4. Start coding with AI! Try:"
echo "   - Type: 'Create a React component...'"
echo "   - Voice: 'Generate a color palette...'"
echo ""
echo "📚 Read README.md for full documentation"
echo ""

# Offer to start immediately
read -p "Start G-Studio now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Starting G-Studio..."
    echo ""
    npm run dev
fi
