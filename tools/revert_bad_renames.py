#!/usr/bin/env python3
"""Revert .tsx files that don't actually contain JSX back to .ts."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "src"

def has_real_jsx(content):
    """Check if file has actual JSX (React elements), not just generics or strings."""
    lines = content.split("\n")
    for line in lines:
        stripped = line.strip()
        # Skip comments, strings, console.warn/log with string literals
        if stripped.startswith("//") or stripped.startswith("*") or stripped.startswith("/*"):
            continue
        # Detect actual JSX return patterns:
        # return (<div  or  return <div  or  <Component  followed by props/closing
        if re.search(r'return\s*\(\s*<[a-zA-Z]', stripped):
            return True
        if re.search(r'return\s+<[a-zA-Z]', stripped):
            return True
        # JSX fragments: return (<> or <>
        if re.search(r'return\s*\(\s*<>', stripped):
            return True
        # Standalone JSX element assignment: const x = <Component
        if re.search(r'=\s*<[A-Z][a-zA-Z]+[\s/>]', stripped):
            return True
    return False

count = 0
for tsx_file in ROOT.rglob("*.tsx"):
    try:
        content = tsx_file.read_text(encoding="utf-8", errors="ignore")
        if not has_real_jsx(content):
            new_path = tsx_file.with_suffix(".ts")
            if not new_path.exists():
                tsx_file.rename(new_path)
                print(f"  reverted: {tsx_file.name} -> {new_path.name}")
                count += 1
    except Exception as e:
        print(f"  error: {tsx_file.name}: {e}")

print(f"\nReverted {count} files")
