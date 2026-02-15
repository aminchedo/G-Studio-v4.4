#!/usr/bin/env python3
"""Apply activation patches for medium-potential components. LOW risk only."""
import argparse
import json
import os
import shutil
import sys
from pathlib import Path
from datetime import datetime

def find_abs_path(rel_path, files_dict, scan_root):
    rel_norm = rel_path.replace("/", os.sep)
    for k in files_dict:
        if k.replace("/", "\\").endswith(rel_norm.replace("/", "\\")):
            return k
        if rel_path.replace("/", "\\") in k.replace("/", "\\"):
            return k
    return str(Path(scan_root) / rel_path.replace("/", os.sep))

def get_exports(full_report, rel_path):
    files = full_report.get("files", {})
    root = full_report.get("metadata", {}).get("scan_root", ".")
    abs_path = find_abs_path(rel_path, files, root)
    info = files.get(abs_path, {})
    exports = info.get("exported_symbols", [])
    if not exports:
        stem = Path(rel_path).stem
        return ["default"] if stem else []
    safe = [e for e in exports if e and e != "default"][:3]
    return safe if safe else (["default"] if "default" in exports else exports[:1])

def find_index(parent_rel):
    p = Path(parent_rel.replace("/", os.sep))
    for name in ("index.ts", "index.tsx"):
        idx = p / name
        if idx.exists():
            return str(idx).replace("\\", "/")
    return None

def apply_export(index_path, comp_path, exports, backup_ts, dry_run: bool):
    stem = Path(comp_path).stem
    line = f"export {{ {', '.join(str(e) for e in exports)} }} from './{stem}'"
    if not os.path.exists(index_path):
        if dry_run:
            return "would_create", index_path
        parent = Path(index_path).parent
        parent.mkdir(parents=True, exist_ok=True)
        with open(index_path, "w", encoding="utf-8") as f:
            f.write(f"export {{ {', '.join(str(e) for e in exports)} }} from './{stem}'\n")
        return "applied", "created"
    with open(index_path, "r", encoding="utf-8") as f:
        content = f.read()
    if line.strip() in content or f"from './{stem}'" in content:
        return "exists", "already exported"
    backup = f"{index_path}.backup.{backup_ts}"
    if dry_run:
        return "would_apply", backup
    shutil.copy2(index_path, backup)
    new_content = content.rstrip() + "\n" + line + "\n"
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(new_content)
    return "applied", backup

def main():
    parser = argparse.ArgumentParser(description="Apply activation exports to barrel indexes (with backups).")
    parser.add_argument("report_folder", nargs="?", default="reports/latest", help="Report folder (default: reports/latest)")
    parser.add_argument("--include-medium", action="store_true", help="Include MEDIUM risk items (still blocks HIGH).")
    parser.add_argument("--dry-run", action="store_true", help="Do not modify source or activation JSON; report what would be applied.")
    args = parser.parse_args()

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_folder = args.report_folder
    rp = Path(report_folder)
    if not (rp / "medium_candidates_activation.json").exists():
        print(json.dumps({"error": "no activation file"}))
        return 1
    data = json.load(open(rp / "medium_candidates_activation.json", encoding="utf-8"))
    full_report = json.load(open(rp / "full_report.json", encoding="utf-8"))
    applied = []
    would_apply = []
    include_medium = bool(args.include_medium)
    for c in data.get("candidates", []):
        risk = c.get("estimated_risk")
        if risk == "HIGH":
            continue
        if risk == "MEDIUM" and not include_medium:
            continue
        if c.get("status") == "applied":
            continue
        path = c["path"]
        parent = str(Path(path).parent).replace("\\", "/")
        index_path = find_index(parent)
        if not index_path:
            # Allow creating index for src/, types/, governance/, vscode-extension/, scripts/
            # Skip __tests__ and .test. files for barrel exports
            if path.endswith(".test.ts") or path.endswith(".test.tsx"):
                continue
            if (parent.startswith("src/") or parent == "types" or parent.startswith("governance/")
                or parent.startswith("vscode-extension/") or parent == "scripts"):
                index_path = f"{parent}/index.ts"
        if not index_path:
            continue
        exports = get_exports(full_report, path)
        if not exports:
            continue
        status, msg = apply_export(index_path, path, exports, ts, dry_run=bool(args.dry_run))
        if status == "applied":
            applied.append({"id": c["id"], "path": path, "target": index_path})
            c["status"] = "applied"
            c["applied_at"] = ts
        elif status == "exists" and c.get("status") == "pending_approval":
            c["status"] = "applied"
            c["applied_at"] = ts
        elif status in ("would_apply", "would_create"):
            would_apply.append({"id": c.get("id"), "path": path, "target": index_path, "action": status})

    if not args.dry_run:
        with open(rp / "medium_candidates_activation.json", "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    patch_dir = rp / "patches"
    patch_dir.mkdir(parents=True, exist_ok=True)
    for i, a in enumerate(applied if not args.dry_run else would_apply):
        tag = "dry_run" if args.dry_run else "activation"
        (patch_dir / f"{tag}_{a['id']}_{i}.diff").write_text(f"+ {a.get('action','applied')} {a['path']}\n")
    try:
        import importlib.util
        spec = importlib.util.spec_from_file_location("transfer_summary", Path(__file__).parent / "transfer_summary.py")
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        mod.emit_transfer_summary(
            timestamp=rp.name,
            total_scanned=len(full_report.get("files", {})),
            n_moved=0,
            remaining_unused=data["total_candidates"] - (len(applied) if not args.dry_run else 0),
            patches_generated=data["total_candidates"],
            patches_applied=(len(applied) if not args.dry_run else 0),
            pending_manual=data["medium_risk"] + data["high_risk"],
        )
    except Exception:
        pass
    if args.dry_run:
        (rp / "apply_activation_dry_run.json").write_text(
            json.dumps({"timestamp": ts, "would_apply": would_apply, "count": len(would_apply)}, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        print(json.dumps({"applied": 0, "total": data["total_candidates"], "would_apply": len(would_apply), "list": would_apply}))
    else:
        print(json.dumps({"applied": len(applied), "total": data["total_candidates"], "list": applied}))
    return 0

if __name__ == "__main__":
    sys.exit(main())
