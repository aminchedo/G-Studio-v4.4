#!/usr/bin/env python3
"""
Fix barrel export files (index.ts) to remove duplicates and fix TS1205/TS2300 errors.

1. Remove duplicate export lines
2. Convert `export { TypeName }` to `export type { TypeName }` where TypeName is a type/interface
"""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "src"

def is_type_export(symbol, source_file):
    """Check if symbol is a type/interface in the source file."""
    try:
        content = source_file.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return False
    # Check if it's defined as type, interface, or enum
    if re.search(rf'(?:export\s+)?(?:type|interface)\s+{re.escape(symbol)}\b', content):
        return True
    return False

def find_source_file(barrel_dir, module_name):
    """Find the actual source file for a module reference."""
    for ext in ('.ts', '.tsx', '.d.ts'):
        candidate = barrel_dir / f"{module_name}{ext}"
        if candidate.exists():
            return candidate
    # Check subdirectory with index
    subdir = barrel_dir / module_name
    if subdir.is_dir():
        for ext in ('.ts', '.tsx'):
            idx = subdir / f"index{ext}"
            if idx.exists():
                return idx
    return None

def fix_barrel(index_file):
    """Fix a single barrel file. Returns number of fixes."""
    try:
        content = index_file.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return 0
    
    lines = content.split("\n")
    seen_exports = set()  # track (symbols_tuple, module) pairs
    new_lines = []
    fixes = 0
    barrel_dir = index_file.parent
    
    for line in lines:
        stripped = line.strip()
        if not stripped or stripped.startswith("//"):
            new_lines.append(line)
            continue
        
        # Parse export lines: export { A, B } from './module'
        # or: export type { A } from './module'
        match = re.match(
            r"^export\s+(?:type\s+)?\{\s*(.+?)\s*\}\s+from\s+['\"](.+?)['\"]",
            stripped
        )
        if match:
            symbols_str = match.group(1)
            module = match.group(2)
            symbols = tuple(s.strip() for s in symbols_str.split(","))
            key = (symbols, module)
            
            if key in seen_exports:
                # Duplicate - skip
                fixes += 1
                continue
            seen_exports.add(key)
            
            # Check for individual symbol duplicates across different export lines
            # for the same module
            module_key = module
            existing_symbols = set()
            for prev_key in seen_exports:
                if prev_key[1] == module_key and prev_key != key:
                    existing_symbols.update(prev_key[0])
            
            # Filter out symbols already exported
            new_symbols = [s for s in symbols if s not in existing_symbols]
            if not new_symbols:
                fixes += 1
                continue
            
            # Check if all symbols are types -> use export type
            source = find_source_file(barrel_dir, module.lstrip("./"))
            if source:
                all_types = all(is_type_export(s, source) for s in new_symbols)
                if all_types and "export type" not in stripped:
                    new_line = f"export type {{ {', '.join(new_symbols)} }} from '{module}'"
                    new_lines.append(new_line)
                    fixes += 1
                    continue
            
            if len(new_symbols) != len(symbols):
                new_line = f"export {{ {', '.join(new_symbols)} }} from '{module}'"
                new_lines.append(new_line)
                fixes += 1
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)
    
    if fixes > 0:
        # Remove trailing empty lines, add single newline at end
        while new_lines and not new_lines[-1].strip():
            new_lines.pop()
        new_content = "\n".join(new_lines) + "\n"
        index_file.write_text(new_content, encoding="utf-8")
    
    return fixes

def main():
    total_fixes = 0
    files_fixed = 0
    
    for index_file in ROOT.rglob("index.ts"):
        fixes = fix_barrel(index_file)
        if fixes > 0:
            total_fixes += fixes
            files_fixed += 1
    
    for index_file in ROOT.rglob("index.tsx"):
        fixes = fix_barrel(index_file)
        if fixes > 0:
            total_fixes += fixes
            files_fixed += 1
    
    print(f"Fixed {total_fixes} issues in {files_fixed} barrel files")

if __name__ == "__main__":
    main()
