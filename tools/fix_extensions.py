#!/usr/bin/env python3
"""
Fix file extensions: .ts files containing JSX must be .tsx.
Detects JSX by checking for React import + JSX syntax patterns.
"""
import argparse
import json
import re
import shutil
from datetime import datetime
from pathlib import Path

DEFAULT_ROOT = Path(__file__).resolve().parent.parent / "src"

# Pattern: file imports React AND contains JSX-like return statements or JSX elements
JSX_INDICATORS = [
    # JSX elements with HTML tags
    re.compile(r'<(div|span|p|h[1-6]|ul|li|ol|a|button|input|form|table|tr|td|th|img|section|header|footer|nav|main|article|aside|label|select|option|textarea|br|hr)[\s/>]'),
    # JSX elements with React components (PascalCase)
    re.compile(r'<[A-Z][a-zA-Z]+[\s/>]'),
    # JSX fragments
    re.compile(r'<>|</>'),
    # JSX className attribute
    re.compile(r'className='),
    # JSX onClick, onChange etc
    re.compile(r'on[A-Z][a-zA-Z]+=\{'),
    # JSX style={{ 
    re.compile(r'style=\{\{'),
]

REACT_IMPORT = re.compile(r"import\s+.*(?:React|react|from\s+['\"]react['\"])")

def needs_tsx(filepath):
    """Check if a .ts file actually contains JSX and should be .tsx."""
    try:
        content = filepath.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return False
    
    # Must have React import or 'react' reference
    has_react = bool(REACT_IMPORT.search(content))
    if not has_react:
        # Also check for jsx pragma or React.FC
        has_react = "React.FC" in content or "React.createElement" in content or "jsx" in content.split("\n")[0]
    
    if not has_react:
        return False
    
    # Must have at least one JSX indicator
    for pattern in JSX_INDICATORS:
        if pattern.search(content):
            return True
    
    return False

def main():
    parser = argparse.ArgumentParser(description="Fix .ts/.tsx extensions safely (disabled by default).")
    parser.add_argument("--enable", action="store_true", help="Explicitly enable destructive renames.")
    parser.add_argument("--dry-run", action="store_true", help="Report what would be renamed; do not rename.")
    parser.add_argument("--root", type=str, default=str(DEFAULT_ROOT), help="Root directory to scan (default: src).")
    parser.add_argument("--report-folder", type=str, default=None, help="Optional report folder to write ts_to_tsx_report.json into.")
    args = parser.parse_args()

    if not args.enable:
        print("ERROR: .ts -> .tsx conversion is disabled by default. Re-run with --enable (and consider --dry-run first).")
        return 2

    root = Path(args.root)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    count = 0
    details = []
    for ts_file in root.rglob("*.ts"):
        if ts_file.suffix == ".ts" and not ts_file.name.endswith(".d.ts"):
            if needs_tsx(ts_file):
                new_path = ts_file.with_suffix(".tsx")
                if not new_path.exists():
                    backup = Path(str(ts_file) + f".backup.{ts}")
                    if args.dry_run:
                        details.append({"from": str(ts_file), "to": str(new_path), "backup": str(backup), "action": "would_rename"})
                        count += 1
                        continue
                    shutil.copy2(ts_file, backup)
                    ts_file.rename(new_path)
                    details.append({"from": str(ts_file), "to": str(new_path), "backup": str(backup), "action": "renamed"})
                    count += 1
    
    print(f"Renamed {count} .ts -> .tsx files")
    if args.report_folder:
        rp = Path(args.report_folder)
        rp.mkdir(parents=True, exist_ok=True)
        (rp / "ts_to_tsx_report.json").write_text(json.dumps({"timestamp": ts, "count": count, "details": details, "dry_run": bool(args.dry_run)}, indent=2), encoding="utf-8")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
