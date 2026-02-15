#!/usr/bin/env python3
"""
Fix ALL duplicate export issues in barrel index files.
Strategy: parse all export statements, track ALL exported symbols globally,
remove any line that re-exports an already-exported symbol.
"""
import argparse
import json
import re
import shutil
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "src"

def fix_barrel(index_file: Path, dry_run: bool, backup_ts: str):
    try:
        content = index_file.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return 0, None

    lines = content.split("\n")
    exported_symbols = set()  # all symbols already exported
    new_lines = []
    fixes = 0
    seen_defaults = set()  # track default exports per module

    for line in lines:
        stripped = line.strip()

        # Match export lines: export [type] { sym1, sym2 } from 'module'
        m = re.match(
            r"^export\s+(type\s+)?\{\s*(.+?)\s*\}\s+from\s+['\"](.+?)['\"]",
            stripped
        )
        if m:
            is_type = bool(m.group(1))
            symbols_str = m.group(2)
            module = m.group(3)
            
            # Parse individual symbols (handle "default as X" aliases)
            symbols = []
            for s in symbols_str.split(","):
                s = s.strip()
                if not s:
                    continue
                # Handle "default as Name" or "Name as Alias"
                parts = s.split(" as ")
                exported_name = parts[-1].strip() if len(parts) > 1 else s.strip()
                symbols.append((s, exported_name))
            
            # Filter out duplicates
            new_symbols = []
            for orig, name in symbols:
                if name == "default":
                    key = f"default:{module}"
                    if key in seen_defaults:
                        fixes += 1
                        continue
                    seen_defaults.add(key)
                    new_symbols.append(orig)
                elif name not in exported_symbols:
                    exported_symbols.add(name)
                    new_symbols.append(orig)
                else:
                    fixes += 1
            
            if not new_symbols:
                # Entire line is duplicate
                continue
            elif len(new_symbols) < len(symbols):
                # Some symbols removed
                prefix = "export type" if is_type else "export"
                new_line = f"{prefix} {{ {', '.join(new_symbols)} }} from '{module}'"
                new_lines.append(new_line)
            else:
                new_lines.append(line)
            continue

        # Match: export * from 'module'
        m2 = re.match(r"^export\s+\*\s+from\s+['\"](.+?)['\"]", stripped)
        if m2:
            new_lines.append(line)
            continue

        # Match multi-line export blocks: export { or export type {
        # These are kept as-is but we track the symbols
        m3 = re.match(r"^export\s+(type\s+)?\{", stripped)
        if m3 and "from" not in stripped and "}" not in stripped:
            # This is the start of a multi-line export block - keep it
            # We need to parse through to the closing }
            new_lines.append(line)
            continue

        # Track symbols in multi-line export blocks
        if stripped and not stripped.startswith("//") and not stripped.startswith("/*") and not stripped.startswith("*"):
            # Check if this looks like a symbol in a multi-line export
            m4 = re.match(r"^(\w+),?\s*$", stripped)
            if m4 and new_lines:
                prev = new_lines[-1].strip() if new_lines else ""
                # If we're inside an export block
                if "export" in prev or any(re.match(r"^\w+,?\s*$", new_lines[i].strip()) for i in range(max(0, len(new_lines)-5), len(new_lines))):
                    sym = m4.group(1)
                    exported_symbols.add(sym)

        new_lines.append(line)

    if fixes > 0:
        while new_lines and not new_lines[-1].strip():
            new_lines.pop()
        if dry_run:
            return fixes, None
        backup_path = Path(str(index_file) + f".backup.{backup_ts}")
        try:
            shutil.copy2(index_file, backup_path)
        except Exception:
            # If backup fails, do not write changes
            return fixes, None
        index_file.write_text("\n".join(new_lines) + "\n", encoding="utf-8", newline="\n")
        return fixes, str(backup_path)

    return fixes, None

def main():
    parser = argparse.ArgumentParser(description="Fix duplicate exports in barrel index files (with backups).")
    parser.add_argument("--dry-run", action="store_true", help="Do not modify files; report what would change.")
    parser.add_argument("--report-folder", type=str, default=None, help="Optional report folder to write barrel_fix_report.json into.")
    args = parser.parse_args()

    backup_ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    total = 0
    files_fixed = 0
    details = []
    for f in list(ROOT.rglob("index.ts")) + list(ROOT.rglob("index.tsx")):
        n, backup = fix_barrel(f, dry_run=args.dry_run, backup_ts=backup_ts)
        if n > 0:
            total += n
            files_fixed += 1
            print(f"  fixed: {f.relative_to(ROOT.parent)} ({n} dups)")
            details.append(
                {
                    "file": str(f.relative_to(ROOT.parent)).replace("\\", "/"),
                    "duplicates_removed": n,
                    "backup": backup,
                    "dry_run": bool(args.dry_run),
                }
            )
    print(f"\nTotal: {total} duplicate symbols removed from {files_fixed} files")

    if args.report_folder:
        out = {
            "timestamp": backup_ts,
            "dry_run": bool(args.dry_run),
            "total_duplicates_removed": total,
            "files_touched": files_fixed,
            "details": details,
        }
        rp = Path(args.report_folder)
        rp.mkdir(parents=True, exist_ok=True)
        (rp / "barrel_fix_report.json").write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")

if __name__ == "__main__":
    main()
