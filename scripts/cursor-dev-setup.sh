#!/usr/bin/env bash
# =============================================
# Cursor-ready setup: Node.js/React + Python + Free MCP Tools
# Safe for GitHub Codespaces — no source files touched, only dev-tools installed
# On Windows: run in Git Bash or WSL (e.g. bash scripts/cursor-dev-setup.sh)
# =============================================

set -e

echo "🔍 Detecting project type..."

PROJECT_TYPE="unknown"
if [ -f package.json ]; then
  PROJECT_TYPE="node"
elif [ -f pyproject.toml ] || [ -f requirements.txt ]; then
  PROJECT_TYPE="python"
fi

echo "Detected project type: $PROJECT_TYPE"

# =====================
# Node.js / React Setup
# =====================
if [ "$PROJECT_TYPE" = "node" ]; then
  echo "⚡ Setting up Node.js/React tools..."

  # Install only missing or optional dev tools (ESLint/Prettier/Vitest already in this repo)
  echo "Installing optional dev tools: npm-run-all..."
  npm install --save-dev npm-run-all 2>/dev/null || true

  # ESLint: do NOT run --init; this repo uses eslint.config.js (flat config)
  if [ -f eslint.config.js ] || [ -f .eslintrc.cjs ] || [ -f .eslintrc.json ]; then
    echo "ESLint config exists, skipping initialization."
  else
    echo "No ESLint config found. Run: npx eslint --init (interactive)"
  fi

  # Prettier: create minimal config only if missing
  if [ ! -f .prettierrc ] && [ ! -f .prettierrc.json ] && [ ! -f .prettierrc.js ]; then
    echo '{}' > .prettierrc
    echo "Created default .prettierrc"
  else
    echo "Prettier config exists, skipping."
  fi

  # Optional: Nx or Turborepo for MCP/build orchestration (only if neither exists)
  if [ ! -f nx.json ] && [ ! -f turbo.json ]; then
    echo "Optional: add Nx or Turborepo for task orchestration? Skipping auto-init to avoid changing repo structure."
    echo "  To add later: npx nx init  OR  npx turbo init"
  else
    echo "Nx/Turbo config exists, skipping."
  fi

  # Add convenience script only if missing (do not overwrite existing lint/format/test)
  if ! grep -q '"run-all"' package.json 2>/dev/null && grep -q '"npm-run-all"' package.json 2>/dev/null; then
    echo "Adding script 'run-all' (type-check + lint + build) if npm-run-all is present..."
    node -e "
      const p = require('./package.json');
      if (!p.scripts['run-all']) {
        p.scripts['run-all'] = 'run-s type-check lint build';
        require('fs').writeFileSync('package.json', JSON.stringify(p, null, 2));
        console.log('Added script: run-all');
      }
    " 2>/dev/null || true
  fi

  echo "✅ Node.js/React setup complete!"
fi

# =====================
# Python Setup (only if Python project files present)
# =====================
if [ "$PROJECT_TYPE" = "python" ]; then
  echo "🐍 Setting up Python tools..."

  if [ ! -d ".venv" ]; then
    python3 -m venv .venv 2>/dev/null || python -m venv .venv
    echo "Created virtual environment .venv"
  else
    echo "Virtual environment exists, skipping."
  fi

  if [ -d ".venv" ]; then
    # shellcheck source=/dev/null
    source .venv/bin/activate 2>/dev/null || true
  fi

  echo "Installing Flake8, Pylint, Black, Pytest, isort, Nox..."
  pip install --upgrade pip -q
  pip install flake8 pylint black pytest isort nox -q 2>/dev/null || true

  if [ ! -f pyproject.toml ]; then
    cat > pyproject.toml << 'PY'
[tool.black]
line-length = 88

[tool.isort]
profile = "black"
PY
    echo "Created pyproject.toml with Black + isort defaults"
  fi

  if [ ! -f pytest.ini ]; then
    printf "[pytest]\naddopts = -ra -q\n" > pytest.ini
    echo "Created pytest.ini"
  fi

  if [ ! -f noxfile.py ]; then
    echo "import nox" > noxfile.py
    echo "Created basic noxfile.py"
  fi

  echo "✅ Python setup complete!"
fi

# =====================
# Reporting
# =====================
echo ""
echo "📋 Installation report:"

if [ "$PROJECT_TYPE" = "node" ]; then
  echo "- Node.js dev tools (existing + optional):"
  npm list --depth=0 2>/dev/null | head -30
  echo "- Config files: eslint.config.js or .eslintrc*, .prettierrc (if created)"
  echo "- Run: npm run lint, npm run format, npm run test, npm run type-check, npm run build"
  [ -f package.json ] && grep -q '"run-all"' package.json && echo "- Run: npm run run-all"
fi

if [ "$PROJECT_TYPE" = "python" ]; then
  echo "- Python tools:"
  pip list 2>/dev/null | head -20
  echo "- Config: pyproject.toml, pytest.ini, noxfile.py"
  echo "- Run: black ., isort ., flake8 ., pylint <module>, pytest, nox"
fi

echo ""
echo "✅ Cursor setup finished! No source files were modified."
