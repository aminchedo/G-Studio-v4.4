# G-Studio Code Intelligence – Pro Workflow

This project uses **`tools/g_studio_intelligence_v7.3.2.py`** to get detailed code intelligence (wiring, duplicates, recommendations, exports). Use it locally or via GitHub Actions.

---

## 1. Run in GitHub Actions (automatic)

- **Workflow:** [Code Intelligence](.github/workflows/intelligence.yml)
- **When:** On every push/PR to `main`, weekly (Monday 06:00 UTC), or manually (**Actions** → Code Intelligence → Run workflow).
- **Output:** After the run, open the job → **Artifacts** → download `gstudio-intelligence-reports` (HTML, CSV, JSON).

---

## 2. Run locally to get more info

From the **project root** (`C:\project\G-studio\G-Studio-v4.4_1-Integratedzi`):

```bash
# Basic (TS/JS/TSX only, report in ./gstudio-reports)
python tools/g_studio_intelligence_v7.3.2.py .

# Full options – more info (CSV, duplicates, recommendations)
python tools/g_studio_intelligence_v7.3.2.py . --csv --enable-duplicates --enable-recommendations --verbose

# Only files changed since last commit
python tools/g_studio_intelligence_v7.3.2.py . -c --output-dir ./gstudio-reports

# Custom output dir
python tools/g_studio_intelligence_v7.3.2.py . --output-dir ./artifacts/intelligence-$(date +%Y%m%d)
```

**Optional deps** (progress bars, colors, better parsing):

```bash
pip install -r tools/requirements-intelligence.txt
```

---

## 3. What you get

| Output          | Description                                                          |
| --------------- | -------------------------------------------------------------------- |
| HTML dashboard  | `gstudio-reports/*.html` – wiring, components, value score           |
| CSV             | `--csv` – tables for import/analysis                                 |
| JSON            | Cache/report data for tooling                                        |
| Duplicates      | `--enable-duplicates` – structural duplicate clusters                |
| Recommendations | `--enable-recommendations` – merge/archive/wire/refactor suggestions |

---

## 4. CI workflow summary

| Step      | Action                                                                                          |
| --------- | ----------------------------------------------------------------------------------------------- |
| Checkout  | Full repo                                                                                       |
| Python    | 3.11                                                                                            |
| Deps      | `pip install -r tools/requirements-intelligence.txt`                                            |
| Run       | `python tools/g_studio_intelligence_v7.3.2.py . --output-dir ./gstudio-reports --csv --verbose` |
| Artifacts | `gstudio-reports/` uploaded for 30 days                                                         |

Reports are in **Actions** → run → **Artifacts**.
