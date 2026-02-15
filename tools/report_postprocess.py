import os
import json
import shutil
import traceback
import time
import webbrowser
import argparse
import sys
from pathlib import Path

LOG_PATH = Path("mcp-audit.log")

def log(msg):
    t = time.strftime("%Y-%m-%d %H:%M:%S")
    with LOG_PATH.open("a", encoding="utf-8") as f:
        f.write(f"{t} - {msg}\n")

def safe_load_json(path):
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception as e:
        log(f"ERROR reading JSON {path}: {e}")
        return None

def build_manifest(report_folder, timestamp=None):
    try:
        report_folder = Path(report_folder)
        if timestamp is None:
            timestamp = report_folder.name

        full_report = safe_load_json(report_folder / "full_report.json") or {}
        metadata = full_report.get("metadata", {})
        scan_root = metadata.get("scan_root", str(Path.cwd()))

        def normalize(p):
            try:
                p = str(p)
                if p.lower().endswith(".md"):
                    return None
                if "backup" in p.lower():
                    return None
                try:
                    return str(Path(p).resolve().relative_to(Path(scan_root).resolve())).replace("\\", "/")
                except ValueError:
                    return p.replace(scan_root, "").lstrip("/\\").replace("\\", "/")
            except Exception:
                return str(p)

        unused_raw = full_report.get("unused_candidates", []) or []
        candidates = [normalize(p) for p in unused_raw]
        candidates = [p for p in candidates if p]

        manifest = {
            "timestamp": timestamp,
            "scan_root": scan_root,
            "unused_count": len(candidates),
            "candidates": candidates,
            "paths": {
                "dependency_graph": str((report_folder / "dependency_graph.json").as_posix()),
                "full_report": str((report_folder / "full_report.json").as_posix()),
                "summary_report": str((report_folder / "summary_report.json").as_posix()),
                "agent_actions_html": str((report_folder / "agent_actions.html").as_posix()),
            },
            "metadata": metadata,
        }
        out_path = report_folder / "manifest.json"
        with out_path.open("w", encoding="utf-8") as fh:
            json.dump(manifest, fh, indent=2, ensure_ascii=False)
        log(f"Manifest written: {out_path}")
        return manifest, out_path
    except Exception as e:
        log("Exception in build_manifest: " + traceback.format_exc())
        return None, None

def ensure_agent_actions(report_folder):
    rp = Path(report_folder)
    agent = rp / "agent_actions.html"
    opt = rp / "optimization_dashboard.html"
    if not agent.exists() and opt.exists():
        shutil.copy2(opt, agent)
        log(f"Copied optimization_dashboard.html to agent_actions.html")

def open_dashboard(report_folder):
    try:
        ensure_agent_actions(report_folder)
        html_path = Path(report_folder) / "agent_actions.html"
        if html_path.exists():
            webbrowser.open(f"file://{html_path.resolve()}")
            log(f"Opened dashboard: {html_path}")
            return True
        else:
            log(f"Dashboard not found at {html_path}")
            return False
    except Exception:
        log("Exception while opening dashboard: " + traceback.format_exc())
        return False

def postprocess_reports(report_folder, open_dashboard_after=None):
    """open_dashboard_after: if True, open HTML dashboard; if False, skip. Default: False."""
    try:
        ts = Path(report_folder).name
        log(f"postprocess start for {report_folder}")
        # Always ensure agent_actions.html exists for downstream tools/manifests
        ensure_agent_actions(report_folder)
        manifest, manifest_path = build_manifest(report_folder, timestamp=ts)
        if manifest is None:
            log("Manifest build failed")
            print(f"ERROR: manifest build failed for {report_folder}")
            return 1
        opened = False
        if open_dashboard_after:
            opened = open_dashboard(report_folder)
        print(f"Confirm: postprocess complete - timestamp: {ts}")
        log(f"postprocess complete for {report_folder}, opened={opened}")
        return 0
    except Exception:
        log("Unhandled exception in postprocess_reports: " + traceback.format_exc())
        print(f"Confirm: postprocess failed - timestamp: {time.strftime('%Y%m%d_%H%M%S')}")
        return 2

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Postprocess reports: manifest + agent_actions.html (no auto-open by default).")
    parser.add_argument("report_folder", help="Path to report folder (e.g., reports/latest)")
    parser.add_argument("--open", action="store_true", help="Open agent_actions.html in a browser (opt-in).")
    parser.add_argument("--no-open", action="store_true", help="Explicitly do not open HTML (default behavior).")
    args = parser.parse_args()
    sys.exit(postprocess_reports(args.report_folder, open_dashboard_after=bool(args.open)))
