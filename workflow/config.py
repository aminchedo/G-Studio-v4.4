#!/usr/bin/env python3
"""
Workflow Configuration — Paths for autonomous workflow.
All paths relative to project root. Workflow folder is separate from tools/.
"""
from pathlib import Path

# Project root (parent of workflow/)
ROOT = Path(__file__).resolve().parent.parent

# Workflow folder — separate from general tools
WORKFLOW_DIR = ROOT / "workflow"

# Tools folder — contains main-fixer, extract, apply, etc.
TOOLS_DIR = ROOT / "tools"

# Reports folder — main-fixer creates timestamped subfolders here
REPORTS_DIR = ROOT / "reports"

# Static latest report folder — canonical current project state
LATEST_REPORT_DIR = REPORTS_DIR / "latest"

# MCP audit log — always up to date with latest status
AUDIT_LOG = ROOT / "mcp-audit.log"

# Workflow state — persisted format for MCP/agents
STATE_FILE = WORKFLOW_DIR / "workflow_state.json"

# Main-fixer script (input for workflow)
MAIN_FIXER_SCRIPT = TOOLS_DIR / "main-fixer-9.v3.py"

# Default report postprocessor
REPORT_POSTPROCESS_SCRIPT = TOOLS_DIR / "report_postprocess.py"
