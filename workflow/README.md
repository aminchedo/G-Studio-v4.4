# Workflow — Autonomous Orchestrator

This folder is **separate from tools/**. It contains the autonomous workflow that drives the project forward.

## Workflow Input

**main-fixer-9.v3.py** (in `tools/`)

The workflow runs main-fixer first. It creates a report folder in `reports/<timestamp>/`. The workflow reads that folder and takes the next steps based on its contents.

## Usage

```bash
python workflow/go.py
```

When you say **"go to next step"** — run the above. No other action needed.

## What It Does

1. Runs **main-fixer-9.v3.py** → creates `reports/<timestamp>/`
2. Reads the report folder
3. Extracts candidates, builds plan, applies activation
4. Re-scans with main-fixer
5. Fixes barrels, auto-fixes, runs TypeScript check, smoke test
6. Saves workflow state

## Outputs

| File                                 | Purpose                               |
| ------------------------------------ | ------------------------------------- |
| `workflow/workflow_state.json`       | Workflow state (MCP-friendly format)  |
| `mcp-audit.log`                      | Step-by-step audit log (project root) |
| `reports/<timestamp>/go_report.json` | Full run report                       |

## Folder Structure

```
workflow/           ← This folder (separate from tools/)
  go.py             ← Main orchestrator
  config.py         ← Paths and config
  workflow_state.json  ← Auto-generated
  README.md

tools/              ← General tools (main-fixer, fix_barrels, etc.)
  main-fixer-9.v3.py
  extract_medium_candidates.py
  ...

reports/            ← Report folders created by main-fixer
  <timestamp>/
```
