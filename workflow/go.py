#!/usr/bin/env python3
"""
GO - Master Orchestrator (Fully Autonomous)
============================================
Workflow input: main-fixer-9.v3.py
Reads reports from the folder that main-fixer creates, then advances.

Usage: python workflow/go.py

When you say "go to next step" — just run this file. The workflow advances automatically.

Input: tools/main-fixer-9.v3.py
Output: reports/latest/ — canonical “latest” project state (static folder)

Workflow state saved to: workflow/workflow_state.json + mcp-audit.log
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

# Import config from same folder
from config import (
    ROOT,
    TOOLS_DIR,
    REPORTS_DIR,
    LATEST_REPORT_DIR,
    AUDIT_LOG,
    STATE_FILE,
    MAIN_FIXER_SCRIPT,
    REPORT_POSTPROCESS_SCRIPT,
)

def ts_compact():
    return datetime.now().strftime("%Y%m%d_%H%M%S")

def now():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def run(cmd, cwd: Path | None = None, timeout: int = 300):
    """Run a command, return (exit_code, stdout, stderr)."""
    try:
        r = subprocess.run(
            cmd,
            cwd=str(cwd or ROOT),
            capture_output=True,
            text=True,
            timeout=timeout, shell=(os.name == "nt")
        )
        return r.returncode, r.stdout, r.stderr
    except subprocess.TimeoutExpired:
        return -1, "", "TIMEOUT"
    except Exception as e:
        return -1, "", str(e)

def py(*args, timeout: int = 120):
    """Run a python script."""
    cmd = [sys.executable] + [str(a) for a in args]
    return run(cmd, timeout=timeout)

def load_json(p: Path):
    with open(p, encoding="utf-8") as f:
        return json.load(f)

def save_json(p: Path, d: dict):
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "w", encoding="utf-8", newline="\n") as f:
        json.dump(d, f, indent=2, ensure_ascii=False)

def audit(msg):
    """Write to MCP audit log — always up to date with latest status."""
    line = f"{now()} - {msg}"
    with AUDIT_LOG.open("a", encoding="utf-8") as f:
        f.write(line + "\n")

def say(msg):
    print(f"[{now()}] {msg}")

def ensure_latest_dir() -> Path:
    LATEST_REPORT_DIR.mkdir(parents=True, exist_ok=True)
    return LATEST_REPORT_DIR

def save_workflow_state(state: dict):
    """Save workflow state in MCP-friendly format for agents."""
    state["_updated"] = now()
    state["_workflow_input"] = str(MAIN_FIXER_SCRIPT)
    state["_reports_dir"] = str(REPORTS_DIR)
    state["_latest_reports_dir"] = str(LATEST_REPORT_DIR)
    save_json(STATE_FILE, state)

def load_workflow_state() -> dict:
    """Load workflow state if exists."""
    if STATE_FILE.exists():
        try:
            return load_json(STATE_FILE)
        except Exception:
            pass
    return {}

# ---------------------------------------------------------------------------
# Step implementations
# ---------------------------------------------------------------------------

def step_scan(report_dir: Path, resume: bool, dry_run: bool):
    """Step 1 - Run main-fixer-9.v3.py (workflow input), write into reports/latest/."""
    audit("STEP 1/10: Running main-fixer-9.v3.py (workflow input)...")
    say("STEP 1/10  Running main-fixer-9.v3.py...")

    summary_path = report_dir / "summary_report.json"
    if resume and summary_path.exists():
        audit("STEP 1 NOTE: --resume enabled; using existing reports/latest/ without re-scan")
        say("  -> Using existing reports/latest/ (resume)")
        summary = load_json(summary_path)
        return summary

    args = [MAIN_FIXER_SCRIPT, "--analyze-only", "--report-folder", report_dir]
    if dry_run:
        # main-fixer --analyze-only is already non-destructive; add --dry-run for consistency
        args.append("--dry-run")
    code, out, err = py(*args, timeout=300)
    if code != 0:
        say(f"  WARNING: main-fixer exited {code}")
        audit(f"STEP 1 WARNING: main-fixer exited {code}")

    if not summary_path.exists():
        say("  ERROR: No summary_report.json generated in reports/latest/")
        audit("STEP 1 ERROR: No summary_report.json generated")
        sys.exit(1)

    summary = load_json(summary_path)
    unused = summary["totals"]["unused"]
    files  = summary["totals"]["files"]
    say(f"  -> Report: latest | {files} files, {unused} unused")
    audit(f"STEP 1 DONE: Report latest | {files} files, {unused} unused")
    return summary


def step_extract(report_dir: Path):
    """Step 2 - Extract medium candidates from report folder."""
    audit("STEP 2/10: Extracting candidates from report...")
    say("STEP 2/10  Extracting candidates...")
    code, out, _ = py(TOOLS_DIR / "extract_medium_candidates.py", str(report_dir))
    info = {}
    for line in (out or "").strip().splitlines():
        try:
            info = json.loads(line)
        except Exception:
            pass
    count = info.get("count", "?")
    say(f"  -> {count} candidates extracted")
    audit(f"STEP 2 DONE: {count} candidates extracted")
    return count


def step_plan(report_dir: Path):
    """Step 3 - Build activation plan from report."""
    audit("STEP 3/10: Building activation plan...")
    say("STEP 3/10  Building activation plan...")
    code, out, _ = py(TOOLS_DIR / "activation_plan.py", str(report_dir))
    info = {}
    for line in (out or "").strip().splitlines():
        try:
            info = json.loads(line)
        except Exception:
            pass
    say(f"  -> L:{info.get('low','?')} M:{info.get('medium','?')} H:{info.get('high','?')}")
    audit(f"STEP 3 DONE: L:{info.get('low','?')} M:{info.get('medium','?')} H:{info.get('high','?')}")
    return info


def step_apply(report_dir: Path, dry_run: bool, verify_only: bool):
    """Step 4 - Apply LOW + MEDIUM components (or simulate if --dry-run/--verify-only)."""
    if verify_only:
        audit("STEP 4/10: VERIFY-ONLY - skipping apply (simulating)...")
        say("STEP 4/10  VERIFY-ONLY - skipping apply (simulating)...")
    else:
        audit("STEP 4/10: Applying LOW + MEDIUM components...")
        say("STEP 4/10  Applying LOW + MEDIUM components...")

    cmd = [TOOLS_DIR / "apply_activation.py", str(report_dir), "--include-medium"]
    if dry_run or verify_only:
        cmd.append("--dry-run")
    code, out, _ = py(*cmd)
    info = {}
    for line in (out or "").strip().splitlines():
        try:
            info = json.loads(line)
        except Exception:
            pass
    applied_count = info.get("applied", 0)
    would_apply_count = info.get("would_apply", applied_count)
    if dry_run or verify_only:
        say(f"  -> {would_apply_count} would be applied")
        audit(f"STEP 4 DONE: {would_apply_count} would be applied")
    else:
        say(f"  -> {applied_count} newly applied")
        audit(f"STEP 4 DONE: {applied_count} newly applied")
    return info


def step_rescan(report_dir: Path, dry_run: bool):
    """Step 5 - Re-run main-fixer to verify impact (writes into reports/latest/)."""
    audit("STEP 5/10: Re-scanning (main-fixer) to verify impact...")
    say("STEP 5/10  Re-scanning...")
    args = [MAIN_FIXER_SCRIPT, "--analyze-only", "--report-folder", report_dir]
    if dry_run:
        args.append("--dry-run")
    code, out, err = py(*args, timeout=300)

    summary_path = report_dir / "summary_report.json"
    if not summary_path.exists():
        say("  ERROR: No summary_report.json after rescan")
        audit("STEP 5 ERROR: No summary_report.json after rescan")
        sys.exit(1)
    summary2 = load_json(summary_path)
    unused2 = summary2["totals"]["unused"]
    files2  = summary2["totals"]["files"]
    say(f"  -> Report: latest | {files2} files, {unused2} unused")
    audit(f"STEP 5 DONE: latest | {files2} files, {unused2} unused")
    return summary2


def step_fix_barrels(report_dir: Path, dry_run: bool, verify_only: bool):
    """Step 6 - Fix duplicate exports in barrel index files."""
    if verify_only:
        audit("STEP 6/10: VERIFY-ONLY - skipping barrel fixes (simulating)...")
        say("STEP 6/10  VERIFY-ONLY - skipping barrel fixes (simulating)...")
    else:
        audit("STEP 6/10: Fixing barrel duplicate exports...")
        say("STEP 6/10  Fixing barrel duplicate exports...")

    cmd = [TOOLS_DIR / "fix_barrels_v3.py", "--report-folder", str(report_dir)]
    if dry_run or verify_only:
        cmd.append("--dry-run")
    code, out, _ = py(*cmd)
    fixes = 0
    for line in (out or "").strip().splitlines():
        if "Total:" in line:
            try:
                fixes = int(re.search(r"(\d+)", line).group(1))
            except Exception:
                pass
            break
    say(f"  -> {fixes} duplicate symbols removed")
    if dry_run or verify_only:
        audit(f"STEP 6 DONE: {fixes} duplicates would be removed from barrels")
    else:
        audit(f"STEP 6 DONE: {fixes} duplicate symbols removed from barrels")
    return fixes


def step_autofix():
    """Step 7 - Auto-fix known deterministic issues.
    NOTE: .ts->.tsx rename disabled (was too aggressive, caused false positives).
    Only fix_barrels and other safe fixes run here.
    """
    audit("STEP 7/10: Auto-fixing known issues (conservative mode)...")
    say("STEP 7/10  Auto-fixing known issues...")
    # ts->tsx rename disabled: too aggressive, caused false positives per mcp-audit
    fixes = 0
    say(f"  -> {fixes} auto-fixes applied (ts->tsx disabled)")
    audit(f"STEP 7 DONE: {fixes} auto-fixes (ts->tsx disabled)")
    return fixes


def step_typecheck(enabled: bool):
    """Step 8 - TypeScript type-check (read-only)."""
    if not enabled:
        audit("STEP 8/10: TypeScript type-check skipped (disabled by flags)")
        return {"enabled": False, "skipped": True}
    audit("STEP 8/10: Running TypeScript type-check...")
    say("STEP 8/10  Running TypeScript type-check (tsc --noEmit)...")
    code, out, err = run(["npx", "tsc", "--noEmit"], timeout=120)
    combined = (out or "") + (err or "")
    error_lines = [l for l in combined.splitlines() if ": error TS" in l]
    n_errors = len(error_lines)
    if code == 0:
        say(f"  -> PASSED (0 errors)")
        audit("STEP 8 DONE: TypeScript PASSED (0 errors)")
    else:
        say(f"  -> {n_errors} TS errors detected (exit {code})")
        audit(f"STEP 8 DONE: TypeScript {n_errors} errors (exit {code})")
    return {
        "enabled": True,
        "exit_code": code,
        "ts_errors": n_errors,
        "passed": code == 0,
        "sample_errors": error_lines[:10],
    }


def step_lint(enabled: bool):
    """Lint (read-only)."""
    if not enabled:
        audit("LINT: skipped (disabled by flags)")
        return {"enabled": False, "skipped": True}
    audit("LINT: Running ESLint...")
    say("LINT     Running ESLint (npm run lint)...")
    code, out, err = run(["npm", "run", "lint"], timeout=240)
    combined = (out or "") + (err or "")
    passed = code == 0
    audit(f"LINT: {'PASSED' if passed else 'FAILED'} (exit {code})")
    return {"enabled": True, "exit_code": code, "passed": passed, "output_tail": combined.strip()[-500:]}


def step_smoke_test(enabled: bool):
    """Step 9 - Smoke test (build). Note: may create dist/ but does not modify source."""
    if not enabled:
        audit("STEP 9/10: Smoke test skipped (disabled by flags)")
        return {"enabled": False, "skipped": True}
    audit("STEP 9/10: Running smoke test (npm run build)...")
    say("STEP 9/10  Running smoke test (npm run build)...")
    code, out, err = run(["npm", "run", "build"], timeout=180)
    combined = (out or "") + (err or "")
    if code == 0:
        say(f"  -> PASSED")
        audit("STEP 9 DONE: Smoke test PASSED")
    else:
        say(f"  -> FAILED (exit {code})")
        audit(f"STEP 9 DONE: Smoke test FAILED (exit {code})")
    return {
        "enabled": True,
        "exit_code": code,
        "passed": code == 0,
        "output_tail": combined.strip()[-500:] if combined else "",
    }


def write_workflow_artifacts(
    report_dir: Path,
    run_ts: str,
    summary_before: dict,
    summary_after: dict,
    plan_info: dict,
    apply_info: dict,
    ts_result: dict,
    lint_result: dict,
    smoke_result: dict,
    dry_run: bool,
    verify_only: bool,
) -> dict:
    """Write go_report.json + workflow_state.json + mcp_memory_snapshot.json + workflow_verification.json."""
    audit("STEP 10/10: Writing final report and workflow state...")
    say("STEP 10/10 Writing final report...")

    unused_before = summary_before["totals"]["unused"]
    unused_after  = summary_after["totals"]["unused"]
    reduction     = unused_before - unused_after
    pct           = (reduction / unused_before * 100) if unused_before else 0

    # Activation plan output lives in the report folder (reports/latest/)
    act_file = report_dir / "medium_candidates_activation.json"

    n_applied = n_pending = 0
    candidates_list = []
    if act_file and act_file.exists():
        act_data = load_json(act_file)
        n_applied = sum(1 for c in act_data.get("candidates", []) if c.get("status") == "applied")
        n_pending = sum(1 for c in act_data.get("candidates", []) if c.get("status") != "applied")
        candidates_list = [
            {"id": c.get("id"), "path": c.get("path")}
            for c in act_data.get("candidates", [])
            if c.get("id") and c.get("path")
        ]

    ts_ok = bool(ts_result.get("passed")) if ts_result.get("enabled", True) else True
    lint_ok = bool(lint_result.get("passed")) if lint_result.get("enabled", True) else True
    smoke_ok = bool(smoke_result.get("passed")) if smoke_result.get("enabled", True) else True
    overall = "SUCCESS" if (ts_ok and lint_ok and smoke_ok) else "FAILED"

    report = {
        "workflow": "workflow/go.py - Master Orchestrator",
        "workflow_input": str(MAIN_FIXER_SCRIPT),
        "timestamp": run_ts,
        "report_folder": str(report_dir),
        "mode": {"dry_run": dry_run, "verify_only": verify_only},
        "before": {
            "files": summary_before["totals"]["files"],
            "unused": unused_before,
        },
        "after": {
            "files": summary_after["totals"]["files"],
            "unused": unused_after,
        },
        "activation": {
            "applied": n_applied,
            "pending": n_pending,
            "new_this_run": apply_info.get("applied", 0),
        },
        "impact": {
            "reduction": reduction,
            "reduction_pct": round(pct, 2),
        },
        "typescript": ts_result,
        "lint": lint_result,
        "smoke_test": smoke_result,
        "status": overall,
    }

    out_path = report_dir / "go_report.json"
    save_json(out_path, report)

    # Activation summary artifacts (workflow-owned, always written to reports/latest/)
    final_summary = {
        "timestamp": run_ts,
        "report_folder": str(report_dir),
        "mode": {"dry_run": dry_run, "verify_only": verify_only},
        "total_candidates": (plan_info.get("low", 0) or 0) + (plan_info.get("medium", 0) or 0) + (plan_info.get("high", 0) or 0),
        "applied": n_applied,
        "already_applied": 0,
        "pending": n_pending,
        "skipped": 0,
        "verification": {
            "typescript": ts_result,
            "lint": lint_result,
            "smoke": smoke_result,
            "passed": bool(ts_ok and lint_ok and smoke_ok),
        },
        "applied_components": apply_info.get("list", []),
        "risk_breakdown": {
            "low": plan_info.get("low", 0),
            "medium": plan_info.get("medium", 0),
            "high": plan_info.get("high", 0),
        },
    }
    save_json(report_dir / "final_summary.json", final_summary)

    activation_summary_py = report_dir / "activation_summary.py"
    if not activation_summary_py.exists():
        activation_summary_py.write_text(
            f"""#!/usr/bin/env python3
\"\"\"Activation Summary — {run_ts}\"\"\"
import json
from pathlib import Path

def main():
    summary = json.load(open(Path(__file__).parent / "final_summary.json", encoding="utf-8"))
    print("=" * 60)
    print(f"ACTIVATION SUMMARY — {{summary['timestamp']}}")
    print("=" * 60)
    print(f"Applied:         {{summary['applied']}}")
    print(f"Pending:         {{summary['pending']}}")
    print(f"TS Passed:       {{bool(summary['verification']['typescript'].get('passed', False)) if summary['verification']['typescript'].get('enabled', True) else True}}")
    print(f"Lint Passed:     {{bool(summary['verification']['lint'].get('passed', False)) if summary['verification']['lint'].get('enabled', True) else True}}")
    print(f"Smoke Passed:    {{bool(summary['verification']['smoke'].get('passed', False)) if summary['verification']['smoke'].get('enabled', True) else True}}")
    print("=" * 60)

if __name__ == "__main__":
    main()
""",
            encoding="utf-8",
            newline="\n",
        )

    # Finalization artifact (workflow-owned)
    finalization_report = {
        "timestamp": run_ts,
        "report_folder": str(report_dir),
        "workflow_entry": str(Path(__file__).as_posix()),
        "workflow_input": str(MAIN_FIXER_SCRIPT),
        "mode": {"dry_run": dry_run, "verify_only": verify_only},
        "artifacts": sorted([p.name for p in report_dir.glob("*") if p.is_file()]),
        "summary": report,
        "workflow_state_path": str(STATE_FILE),
    }
    save_json(report_dir / "FINALIZATION_REPORT.json", finalization_report)
    fin_sum_py = report_dir / "finalization_summary.py"
    if not fin_sum_py.exists():
        fin_sum_py.write_text(
            f"""#!/usr/bin/env python3
\"\"\"Finalization Summary — {run_ts}\"\"\"
import json
from pathlib import Path

def main():
    report = json.load(open(Path(__file__).parent / "FINALIZATION_REPORT.json", encoding="utf-8"))
    print("=" * 60)
    print(f"FINALIZATION SUMMARY — {{report['timestamp']}}")
    print("=" * 60)
    print(f"Status: {{report['summary']['status']}}")
    print(f"Reports folder: {{report['report_folder']}}")
    print("=" * 60)

if __name__ == "__main__":
    main()
""",
            encoding="utf-8",
            newline="\n",
        )

    # Save workflow state in MCP-friendly format
    workflow_state = {
        "last_run": run_ts,
        "status": overall,
        "report_folder": str(report_dir),
        "report_path": str(out_path),
        "unused_before": unused_before,
        "unused_after": unused_after,
        "reduction": reduction,
        "scanned_files_count": summary_after["totals"]["files"],
        "candidates": candidates_list,
        "applied_count": n_applied,
        "pending_count": n_pending,
        "verification_results": {
            "typescript": ts_result,
            "lint": lint_result,
            "smoke": smoke_result,
        },
        "steps_completed": 10,
    }
    save_workflow_state(workflow_state)

    # MCP-friendly snapshot in reports/latest/
    mcp_snapshot = {
        "run_timestamp": run_ts,
        "scanned_files_count": summary_after["totals"]["files"],
        "candidates": candidates_list,
        "applied_count": n_applied,
        "pending_count": n_pending,
        "verification_results": {
            "typescript": ts_result,
            "lint": lint_result,
            "smoke": smoke_result,
        },
    }
    mcp_snapshot_path = report_dir / "mcp_memory_snapshot.json"
    save_json(mcp_snapshot_path, mcp_snapshot)

    # Postprocess (manifest + ensure agent_actions.html) - does not open HTML by default
    code_pp, out_pp, err_pp = py(REPORT_POSTPROCESS_SCRIPT, str(report_dir), "--no-open", timeout=120)
    if code_pp != 0:
        audit(f"POSTPROCESS WARNING: report_postprocess exited {code_pp}")

    # Verification report (machine-readable)
    issues = []
    status = "OK"
    if ts_result.get("enabled", True) and not ts_ok:
        status = "FAIL"
        issues.append(
            {
                "id": "typescript-check-failed",
                "severity": "CRITICAL",
                "summary": f"TypeScript type-check failed with {ts_result.get('ts_errors')} errors.",
                "remediation": [
                    "Fix the TypeScript errors or run with --skip-ts to bypass (not recommended for production)."
                ],
            }
        )
    if lint_result.get("enabled", True) and not lint_ok:
        status = "FAIL"
        issues.append(
            {
                "id": "lint-failed",
                "severity": "MAJOR",
                "summary": "ESLint failed.",
                "remediation": [
                    "Fix lint errors or run with --skip-lint to bypass (not recommended for production)."
                ],
            }
        )
    if smoke_result.get("enabled", True) and not smoke_ok:
        status = "FAIL"
        issues.append(
            {
                "id": "smoke-test-failed",
                "severity": "MAJOR",
                "summary": "Smoke test (npm run build) failed.",
                "remediation": [
                    "Fix build/type errors or run with --skip-smoke to bypass during investigation."
                ],
            }
        )
    if any(r.get("skipped") for r in (ts_result, lint_result, smoke_result) if isinstance(r, dict)):
        if status == "OK":
            status = "WARN"

    verification = {
        "timestamp": run_ts,
        "status": status,
        "orchestrator_present": Path(__file__).exists(),
        "entrypoint_invoked": True,
        "reports_created": sorted([str(p.relative_to(ROOT)).replace("\\", "/") for p in report_dir.glob("*") if p.is_file()]),
        "workflow_state_snapshot": str(STATE_FILE),
        "mcp_memory_snapshot": str(mcp_snapshot_path),
        "auto_apply_policy": {"low": True, "medium": True, "high_blocked": True},
        "backups_policy": True,
        "audit_log_written": True,
        "ts_check_enabled": bool(ts_result.get("enabled", True)),
        "conversion_ts_to_tsx_disabled": True,
        "issues": issues,
    }
    verification_path = report_dir / "workflow_verification.json"
    save_json(verification_path, verification)

    # MCP audit log — final status
    audit("=" * 60)
    audit(f"WORKFLOW COMPLETE @ {run_ts}")
    audit(f"Status: {overall}")
    audit(f"Report folder: {report_dir}")
    audit(f"Before: {unused_before} unused | After: {unused_after} unused | Reduction: {reduction} ({pct:.1f}%)")
    audit(f"Activation: applied={n_applied} | pending={n_pending} | new={apply_info.get('applied', 0)}")
    audit(f"TypeScript: {'PASSED' if ts_ok else str(ts_result['ts_errors']) + ' errors'}")
    audit(f"Lint: {'PASSED' if lint_ok else 'FAILED'}")
    audit(f"Smoke test: {'PASSED' if smoke_ok else 'FAILED'}")
    audit(f"Report: {out_path}")
    audit(f"Workflow state: {STATE_FILE}")
    audit("=" * 60)

    return report


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main():
    parser = argparse.ArgumentParser(description="Master workflow orchestrator (safe, autonomous).")
    parser.add_argument("--dry-run", action="store_true", help="Simulate all destructive steps; do not modify source files.")
    parser.add_argument("--verify-only", action="store_true", help="Verification-only mode; skips destructive steps.")
    parser.add_argument("--resume", action="store_true", help="Reuse existing reports/latest/ if present and skip initial scan.")
    parser.add_argument("--skip-ts", action="store_true", help="Skip TypeScript check.")
    parser.add_argument("--skip-lint", action="store_true", help="Skip ESLint.")
    parser.add_argument("--skip-smoke", action="store_true", help="Skip smoke build.")
    args = parser.parse_args()

    run_timestamp = ts_compact()
    t0 = time.time()
    report_dir = ensure_latest_dir()

    audit("=" * 60)
    audit(f"WORKFLOW START @ {run_timestamp} — Input: main-fixer-9.v3.py — reports/latest/")
    audit("=" * 60)

    say("=" * 70)
    say("GO - Master Orchestrator (workflow/)")
    say(f"  Input: {MAIN_FIXER_SCRIPT.name}")
    say(f"  Reports: {report_dir}")
    say(f"  Mode: dry_run={args.dry_run} verify_only={args.verify_only} resume={args.resume}")
    say("=" * 70)

    # 1. Scan (main-fixer-9.v3.py)
    summary1 = step_scan(report_dir, resume=args.resume, dry_run=args.dry_run or args.verify_only)

    # 2. Extract
    step_extract(report_dir)

    # 3. Plan
    plan_info = step_plan(report_dir)

    # 4. Apply
    apply_info = step_apply(report_dir, dry_run=args.dry_run, verify_only=args.verify_only)

    # 5. Re-scan
    summary2 = step_rescan(report_dir, dry_run=args.dry_run or args.verify_only)

    # 6. Fix barrels
    step_fix_barrels(report_dir, dry_run=args.dry_run, verify_only=args.verify_only)

    # 7. Auto-fix
    step_autofix()

    # 8. TypeScript check (read-only)
    ts_result = step_typecheck(enabled=not args.skip_ts)

    # Lint (read-only)
    lint_result = step_lint(enabled=not args.skip_lint)

    # 9. Smoke test (may create dist/)
    smoke_result = step_smoke_test(enabled=not args.skip_smoke)

    # 10. Report
    report = write_workflow_artifacts(
        report_dir=report_dir,
        run_ts=run_timestamp,
        summary_before=summary1,
        summary_after=summary2,
        plan_info=plan_info,
        apply_info=apply_info,
        ts_result=ts_result,
        lint_result=lint_result,
        smoke_result=smoke_result,
        dry_run=args.dry_run,
        verify_only=args.verify_only,
    )

    elapsed = round(time.time() - t0, 1)

    say("=" * 70)
    say("DONE")
    say(f"  Unused: {report['before']['unused']} -> {report['after']['unused']} "
        f"(-{report['impact']['reduction']}, -{report['impact']['reduction_pct']}%)")
    say(f"  Applied: {report['activation']['applied']} | Pending: {report['activation']['pending']}")
    ts_final = "SKIPPED" if ts_result.get("skipped") else ("PASSED" if ts_result.get("passed") else str(ts_result.get("ts_errors")) + " errors")
    say(f"  TypeScript: {ts_final}")
    lint_final = "SKIPPED" if lint_result.get("skipped") else ("PASSED" if lint_result.get("passed") else "FAILED")
    say(f"  Lint: {lint_final}")
    smoke_final = "SKIPPED" if smoke_result.get("skipped") else ("PASSED" if smoke_result.get("passed") else "FAILED")
    say(f"  Smoke test: {smoke_final}")
    say(f"  Status: {report['status']}")
    say(f"  Elapsed: {elapsed}s")
    say(f"  Report: {report_dir / 'go_report.json'}")
    say(f"  State: {STATE_FILE}")
    say(f"  MCP log: {AUDIT_LOG}")
    say("=" * 70)

    return 0


if __name__ == "__main__":
    sys.exit(main())
