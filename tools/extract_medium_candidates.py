#!/usr/bin/env python3
"""Extract medium-potential unused components. Python only."""
import json
import re
import sys
from pathlib import Path
from collections import defaultdict

def slugify(s):
    s = Path(s).stem
    s = re.sub(r"[^a-zA-Z0-9]+", "-", s)
    return s.lower().strip("-")

def why_unused(info, path):
    deps = info.get("dependents_count", 0)
    exports = info.get("exported_symbols", [])
    if deps == 0 and exports:
        return "never imported; exists as independent component"
    if deps == 0:
        return "no dependents; not wired"
    return "unregistered or gated"

def infer_features(path, category, exports):
    path_l = path.lower()
    features = []
    if "panel" in path_l or "modal" in path_l or "view" in path_l:
        features.append("UI panel/view")
    if "chat" in path_l or "conversation" in path_l:
        features.append("chat/conversation features")
    if "history" in path_l or "analytics" in path_l:
        features.append("history/analytics view")
    if "agent" in path_l or "ai" in path_l:
        features.append("AI/agent capabilities")
    if "code" in path_l or "intelligence" in path_l:
        features.append("code intelligence")
    if "preview" in path_l:
        features.append("preview features")
    if "help" in path_l or "onboarding" in path_l:
        features.append("help/onboarding")
    if "collaboration" in path_l:
        features.append("collaboration")
    if "keyboard" in path_l or "shortcut" in path_l:
        features.append("keyboard shortcuts")
    if "setting" in path_l or "config" in path_l:
        features.append("settings/config")
    if "service" in path_l or "provider" in path_l:
        features.append("service layer")
    if category == "UI_COMPONENT":
        features.append("UI component") if not features else None
    if "store" in path_l or "context" in path_l:
        features.append("state/store")
    if not features:
        features = ["component functionality"]
    return list(dict.fromkeys(features))[:10]

def minimal_patch(path):
    p = Path(path)
    parent = p.parent
    stem = p.stem
    if parent.as_posix().startswith("src/"):
        idx = parent / "index.ts"
        return f"add export to {idx.as_posix()}"
    return f"add barrel export in parent index"

def estimate_risk(info, path, category):
    risk = info.get("risk_level", "LOW")
    lines = info.get("lines", 0)
    if risk in ("HIGH", "CRITICAL") or lines > 500:
        return "high"
    if risk == "MEDIUM" or lines > 200:
        return "medium"
    return "low"

def estimate_lines(path):
    return 2

def get_conflicts(path, files, dup_clusters):
    path_abs = str(Path(path).resolve())
    conflicts = []
    for c in dup_clusters:
        files_c = c.get("files", [])
        if any(path_abs in f or f.endswith(path) for f in files_c):
            conflicts.extend([Path(f).name for f in files_c if f != path_abs])
    return conflicts[:5]

def confidence(info, path, category):
    c = 0.5
    if category in ("UI_COMPONENT", "SERVICE", "CUSTOM_HOOK"):
        c += 0.2
    if info.get("lines", 0) in range(50, 500):
        c += 0.15
    if info.get("exported_symbols"):
        c += 0.1
    return min(0.95, c)

def main():
    report_folder = sys.argv[1] if len(sys.argv) >= 2 else "reports/20260211_072445"
    rp = Path(report_folder)
    full = json.load(open(rp / "full_report.json", encoding="utf-8"))
    graph = json.load(open(rp / "dependency_graph.json", encoding="utf-8"))
    files = full.get("files", {})
    unused = full.get("unused_candidates", [])
    scan_root = full.get("metadata", {}).get("scan_root", ".")
    dup_clusters = full.get("duplicate_clusters", [])

    def rel(p):
        try:
            return str(Path(p).relative_to(Path(scan_root)))
        except ValueError:
            return p.replace(scan_root, "").lstrip("/\\").replace("\\", "/")

    candidates = []
    for abs_path in unused:
        rel_path = rel(abs_path)
        if rel_path.lower().endswith(".md") or "backup" in rel_path.lower():
            continue
        info = files.get(abs_path, {})
        if not info:
            continue
        cat = info.get("category", "UNKNOWN")
        if cat in ("TEST", "ASSET", "CONFIGURATION"):
            continue
        lines = info.get("lines", 0)
        if lines < 10:
            continue
        exports = info.get("exported_symbols", [])
        if not exports and "ts" not in rel_path.lower() and "tsx" not in rel_path.lower():
            continue
        cid = slugify(rel_path)
        features = infer_features(rel_path, cat, exports)
        risk = estimate_risk(info, rel_path, cat)
        patch = minimal_patch(rel_path)
        lines_est = estimate_lines(rel_path)
        conf = confidence(info, rel_path, cat)
        conflicts = get_conflicts(rel_path, files, dup_clusters)
        deps = info.get("dependents", []) or []
        deps_rel = [rel(d) for d in deps[:5]] if deps else []
        candidates.append({
            "id": cid,
            "path": rel_path.replace("\\", "/"),
            "why_unused": why_unused(info, rel_path),
            "potential_features": features,
            "minimal_patch_summary": patch,
            "estimated_lines_changed": lines_est,
            "estimated_risk": risk,
            "dependencies": deps_rel,
            "conflicts": conflicts,
            "tests_to_run": ["smoke: --analyze-only", "lint"],
            "confidence_score": round(conf, 2),
        })

    risk_ord = {"low": 1, "medium": 2, "high": 3}
    candidates.sort(
        key=lambda c: (c["confidence_score"] / risk_ord.get(c["estimated_risk"], 1)),
        reverse=True
    )

    out = {
        "timestamp": rp.name,
        "scan_root": scan_root,
        "candidates": candidates,
    }
    out_path = rp / "medium_candidates.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    return out_path, out

if __name__ == "__main__":
    out_path, data = main()
    print(json.dumps({"path": str(out_path), "count": len(data["candidates"])}))
