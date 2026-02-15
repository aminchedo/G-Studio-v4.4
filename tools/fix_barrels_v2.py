#!/usr/bin/env python3
"""
Fix ALL barrel export issues in index.ts files:
1. Remove exact duplicate lines
2. Remove duplicate symbol exports (same symbol from different lines for same module)
3. Convert type-only exports to use `export type { ... }`
"""
import re
from pathlib import Path
from collections import defaultdict

ROOT = Path(__file__).resolve().parent.parent / "src"

def get_defined_types(filepath):
    """Get all type/interface names defined in a file."""
    types = set()
    try:
        content = filepath.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return types
    for m in re.finditer(r'(?:export\s+)?(?:type|interface)\s+(\w+)', content):
        types.add(m.group(1))
    return types

def find_source(barrel_dir, module_ref):
    """Resolve './foo' to the actual file."""
    name = module_ref.lstrip("./")
    for ext in ('.ts', '.tsx', '.d.ts'):
        p = barrel_dir / f"{name}{ext}"
        if p.exists():
            return p
    subdir = barrel_dir / name
    if subdir.is_dir():
        for ext in ('.ts', '.tsx'):
            idx = subdir / f"index{ext}"
            if idx.exists():
                return idx
    return None

def fix_barrel(index_file):
    try:
        content = index_file.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return 0
    
    lines = content.split("\n")
    barrel_dir = index_file.parent
    
    # Phase 1: Parse all export lines, track symbols per module
    # Structure: module -> [(line_idx, symbols, is_type_export, original_line)]
    module_exports = defaultdict(list)
    non_export_lines = []  # (line_idx, line)
    
    for i, line in enumerate(lines):
        stripped = line.strip()
        # Match: export [type] { symbols } from 'module'
        m = re.match(
            r"^export\s+(type\s+)?\{\s*(.+?)\s*\}\s+from\s+['\"](.+?)['\"]",
            stripped
        )
        if m:
            is_type = bool(m.group(1))
            symbols = [s.strip() for s in m.group(2).split(",") if s.strip()]
            module = m.group(3)
            module_exports[module].append((i, symbols, is_type, line))
        elif stripped:
            non_export_lines.append((i, line))
        else:
            non_export_lines.append((i, line))
    
    # Phase 2: Deduplicate - for each module, merge all symbols, split into value vs type
    new_export_lines = []
    fixes = 0
    
    for module in sorted(module_exports.keys()):
        entries = module_exports[module]
        all_symbols = []
        seen = set()
        for _, symbols, _, _ in entries:
            for s in symbols:
                if s not in seen:
                    seen.add(s)
                    all_symbols.append(s)
        
        # Check which symbols are types
        source = find_source(barrel_dir, module)
        defined_types = get_defined_types(source) if source else set()
        
        type_symbols = [s for s in all_symbols if s in defined_types]
        value_symbols = [s for s in all_symbols if s not in defined_types]
        
        # Generate clean export lines
        original_count = sum(len(syms) for _, syms, _, _ in entries)
        original_lines = len(entries)
        
        if value_symbols:
            new_export_lines.append(
                f"export {{ {', '.join(value_symbols)} }} from '{module}'"
            )
        if type_symbols:
            new_export_lines.append(
                f"export type {{ {', '.join(type_symbols)} }} from '{module}'"
            )
        
        new_count = len(value_symbols) + len(type_symbols)
        new_lines_count = (1 if value_symbols else 0) + (1 if type_symbols else 0)
        
        if original_lines != new_lines_count or original_count != new_count:
            fixes += 1
    
    if fixes == 0:
        return 0
    
    # Rebuild file: comments/blanks at top, then sorted exports
    header_lines = []
    for _, line in sorted(non_export_lines):
        stripped = line.strip()
        if stripped.startswith("//") or stripped.startswith("/*") or stripped.startswith("*") or not stripped:
            header_lines.append(line)
        else:
            # Keep non-export code lines in place
            header_lines.append(line)
    
    # Remove trailing blanks from header
    while header_lines and not header_lines[-1].strip():
        header_lines.pop()
    
    result = "\n".join(header_lines)
    if header_lines:
        result += "\n"
    result += "\n".join(new_export_lines)
    result += "\n"
    
    index_file.write_text(result, encoding="utf-8")
    return fixes

def main():
    total = 0
    files = 0
    for f in ROOT.rglob("index.ts"):
        n = fix_barrel(f)
        if n:
            total += n
            files += 1
            print(f"  fixed: {f.relative_to(ROOT.parent)} ({n} dedup)")
    for f in ROOT.rglob("index.tsx"):
        n = fix_barrel(f)
        if n:
            total += n
            files += 1
            print(f"  fixed: {f.relative_to(ROOT.parent)} ({n} dedup)")
    print(f"\nTotal: {total} fixes in {files} files")

if __name__ == "__main__":
    main()
