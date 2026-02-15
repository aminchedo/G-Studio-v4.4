#!/usr/bin/env python3
"""
System Verification - Check for runtime and build errors
"""
import json
import subprocess
import sys
from pathlib import Path
from datetime import datetime

def log(msg):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"{timestamp} - {msg}")

def verify_typescript():
    """Run TypeScript check"""
    log("Running TypeScript check...")
    try:
        result = subprocess.run(
            ["npx", "tsc", "--noEmit"],
            cwd=Path.cwd(),
            capture_output=True,
            text=True,
            timeout=120
        )
        return {
            "passed": result.returncode == 0,
            "exit_code": result.returncode,
            "output": result.stdout[:500] if result.stdout else result.stderr[:500]
        }
    except Exception as e:
        return {"passed": False, "error": str(e)}

def verify_lint():
    """Run lint check"""
    log("Running lint check...")
    try:
        result = subprocess.run(
            ["npx", "eslint", "src", "--max-warnings", "999"],
            cwd=Path.cwd(),
            capture_output=True,
            text=True,
            timeout=120
        )
        return {
            "passed": result.returncode == 0,
            "exit_code": result.returncode,
            "output": result.stdout[:500] if result.stdout else result.stderr[:500]
        }
    except Exception as e:
        return {"passed": False, "error": str(e)}

def main():
    log("="*70)
    log("SYSTEM VERIFICATION - Starting")
    log("="*70)
    
    verification = {
        "timestamp": datetime.now().strftime("%Y%m%d_%H%M%S"),
        "typescript": verify_typescript(),
        "lint": verify_lint()
    }
    
    all_passed = verification["typescript"]["passed"] and verification["lint"]["passed"]
    
    log("="*70)
    log("SYSTEM VERIFICATION - Complete")
    log(f"TypeScript: {'PASSED' if verification['typescript']['passed'] else 'FAILED'}")
    log(f"Lint: {'PASSED' if verification['lint']['passed'] else 'FAILED'}")
    log(f"Overall: {'PASSED' if all_passed else 'FAILED'}")
    log("="*70)
    
    # Save results to latest report folder (or create new)
    reports_dir = Path("reports")
    report_folder = None
    if reports_dir.exists():
        folders = sorted(
            [f for f in reports_dir.iterdir() if f.is_dir() and f.name.startswith("202")],
            reverse=True,
        )
        report_folder = folders[0] if folders else None
    if not report_folder:
        report_folder = reports_dir / datetime.now().strftime("%Y%m%d_%H%M%S")
    report_folder.mkdir(parents=True, exist_ok=True)
    with open(report_folder / "verification_results.json", "w", encoding="utf-8") as f:
        json.dump(verification, f, indent=2)
    
    return 0 if all_passed else 1

if __name__ == "__main__":
    sys.exit(main())
