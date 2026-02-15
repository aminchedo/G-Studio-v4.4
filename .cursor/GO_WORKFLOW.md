# GO — Fully Autonomous Workflow

## One Command. Zero Manual Steps.

### To run (go to next step):

```bash
python workflow/go.py
```

Or (redirect): `python tools/go.py` → runs `workflow/go.py`

When you say **"go to next step"** — run the above. No other action needed.

---

## Workflow Input

**main-fixer-9.v3.py** (in `tools/`)

The workflow runs main-fixer first. It creates `reports/<timestamp>/`. The workflow reads that folder and advances based on its contents.

---

## Folder Structure

| Folder        | Purpose                                       |
| ------------- | --------------------------------------------- |
| **workflow/** | Orchestrator — separate from tools            |
| **tools/**    | General tools (main-fixer, fix_barrels, etc.) |
| **reports/**  | Report folders created by main-fixer          |

---

## What It Does Automatically

| Step | Action                                              |
| ---- | --------------------------------------------------- |
| 1    | Run main-fixer-9.v3.py → read created report folder |
| 2    | Extract medium candidates                           |
| 3    | Build activation plan                               |
| 4    | Apply LOW + MEDIUM components                       |
| 5    | Re-scan (main-fixer) to verify impact               |
| 6    | Fix barrel duplicate exports                        |
| 7    | Auto-fix (.ts → .tsx for JSX)                       |
| 8    | TypeScript type-check                               |
| 9    | Smoke test (npm run build)                          |
| 10   | Write report + workflow state + MCP audit           |

---

## Outputs

| File                                              | Purpose                           |
| ------------------------------------------------- | --------------------------------- |
| `workflow/workflow_state.json`                    | Workflow state (MCP format)       |
| `mcp-audit.log`                                   | Step-by-step audit (project root) |
| `reports/<timestamp>/go_report.json`              | Full run report                   |
| `reports/<timestamp>/optimization_dashboard.html` | HTML dashboard                    |
