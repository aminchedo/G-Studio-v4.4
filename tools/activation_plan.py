#!/usr/bin/env python3
"""Review & plan activation of medium-potential components. Dry-run only."""
import json
import sys
from pathlib import Path

def load_or_extract(report_folder):
    rp = Path(report_folder)
    mc = rp / "medium_candidates.json"
    if mc.exists():
        return json.load(open(mc, encoding="utf-8"))
    import subprocess
    subprocess.run([sys.executable, str(Path(__file__).parent / "extract_medium_candidates.py"), str(rp)], check=True)
    return json.load(open(mc, encoding="utf-8"))

def assess_feasibility(cand, full_report):
    files = full_report.get("files", {})
    scan_root = full_report.get("metadata", {}).get("scan_root", ".")
    abs_path = str(Path(scan_root) / cand["path"].replace("/", "\\"))
    if abs_path not in files:
        for k in files:
            if cand["path"].replace("/", "\\") in k or k.endswith(cand["path"].replace("/", "\\")):
                abs_path = k
                break
    info = files.get(abs_path, {})
    if not info:
        return "unknown", "HIGH"
    exports = info.get("exported_symbols", [])
    lines = info.get("lines", 0)
    cat = info.get("category", "UNKNOWN")
    feas = "feasible" if exports and lines > 5 else "low"
    risk = info.get("risk_level", "LOW")
    if risk in ("HIGH", "CRITICAL"):
        risk = "HIGH"
    elif risk == "MEDIUM" or lines > 400:
        risk = "MEDIUM"
    else:
        risk = "LOW"
    return feas, risk

def build_patch_summary(cand):
    p = Path(cand["path"])
    parent = p.parent
    if parent.as_posix().startswith("src/"):
        idx = parent / "index.ts"
        return f"add export to {idx.as_posix()}"
    return "add barrel export in parent index"

def main():
    report_folder = sys.argv[1] if len(sys.argv) >= 2 else "reports/20260211_073443"
    rp = Path(report_folder)
    full_report = json.load(open(rp / "full_report.json", encoding="utf-8"))
    mc = rp / "medium_candidates.json"
    if not mc.exists():
        import subprocess
        subprocess.run([sys.executable, str(Path(__file__).parent / "extract_medium_candidates.py"), str(rp)], check=True, capture_output=True)
    data = json.load(open(rp / "medium_candidates.json", encoding="utf-8"))
    candidates = data.get("candidates", [])
    plans = []
    for c in candidates:
        feas, risk = assess_feasibility(c, full_report)
        patch = build_patch_summary(c)
        plans.append({
            "id": c["id"],
            "path": c["path"],
            "feasibility": feas,
            "estimated_risk": risk.upper(),
            "minimal_patch_summary": patch,
            "estimated_lines_changed": c.get("estimated_lines_changed", 2),
            "potential_features": c.get("potential_features", []),
            "why_unused": c.get("why_unused", ""),
            "conflicts": c.get("conflicts", []),
            "tests_to_run": c.get("tests_to_run", ["smoke: --analyze-only", "lint"]),
            "status": "pending_approval",
        })
    out = {
        "timestamp": rp.name,
        "scan_root": data.get("scan_root", ""),
        "total_candidates": len(plans),
        "low_risk": len([p for p in plans if p["estimated_risk"] == "LOW"]),
        "medium_risk": len([p for p in plans if p["estimated_risk"] == "MEDIUM"]),
        "high_risk": len([p for p in plans if p["estimated_risk"] == "HIGH"]),
        "candidates": plans,
    }
    out_path = rp / "medium_candidates_activation.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=2, ensure_ascii=False)
    return out_path, out

if __name__ == "__main__":
    out_path, data = main()
    print(json.dumps({"path": str(out_path), "total": data["total_candidates"], "low": data["low_risk"], "medium": data["medium_risk"], "high": data["high_risk"]}))
