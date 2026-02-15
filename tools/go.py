#!/usr/bin/env python3
"""
Redirect: Run workflow/go.py
===========================
This file redirects to the workflow orchestrator.
Workflow files live in workflow/ (separate from tools/).

Usage: python tools/go.py  →  runs python workflow/go.py
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
WORKFLOW_GO = ROOT / "workflow" / "go.py"

if __name__ == "__main__":
    sys.exit(subprocess.call([sys.executable, str(WORKFLOW_GO)] + sys.argv[1:]))
