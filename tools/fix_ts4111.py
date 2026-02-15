#!/usr/bin/env python3
"""
Fix TS4111 errors: Convert dot notation to bracket notation for index signatures
This is a safe mechanical transformation identified by TypeScript compiler
"""

import re
import subprocess
import sys
from pathlib import Path

def get_ts4111_errors():
    """Get all TS4111 errors from TypeScript compiler"""
    result = subprocess.run(
        ['npm', 'run', 'type-check'],
        capture_output=True,
        text=True,
        cwd='/home/claude'
    )
    
    errors = []
    for line in result.stdout.split('\n') + result.stderr.split('\n'):
        if 'TS4111' in line:
            # Parse: src/file.ts(line,col): error TS4111: Property 'prop' comes from...
            match = re.match(r'^([^(]+)\((\d+),(\d+)\):.*Property \'([^\']+)\'', line)
            if match:
                filepath, line_num, col, prop_name = match.groups()
                errors.append({
                    'file': filepath,
                    'line': int(line_num),
                    'col': int(col),
                    'property': prop_name
                })
    
    return errors

def fix_file(filepath, error_lines):
    """Fix all TS4111 errors in a single file"""
    path = Path('/home/claude') / filepath
    
    if not path.exists():
        print(f"⚠️  File not found: {filepath}")
        return 0
    
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
    
    fixed_count = 0
    # Sort by line number descending to avoid offset issues
    error_lines_sorted = sorted(error_lines, key=lambda x: x['line'], reverse=True)
    
    for error in error_lines_sorted:
        line_idx = error['line'] - 1  # Convert to 0-indexed
        if line_idx >= len(lines):
            continue
            
        line = lines[line_idx]
        prop = error['property']
        
        # Match: object.property → object['property']
        # Be careful to match the exact property at the right column
        pattern = r'\b(\w+)\.' + re.escape(prop) + r'\b'
        replacement = r"\1['" + prop + "']"
        
        new_line = re.sub(pattern, replacement, line)
        
        if new_line != line:
            lines[line_idx] = new_line
            fixed_count += 1
    
    if fixed_count > 0:
        with open(path, 'w', encoding='utf-8') as f:
            f.writelines(lines)
    
    return fixed_count

def main():
    print("🔍 Detecting TS4111 errors...")
    errors = get_ts4111_errors()
    
    if not errors:
        print("✅ No TS4111 errors found!")
        return 0
    
    print(f"📊 Found {len(errors)} TS4111 errors in {len(set(e['file'] for e in errors))} files")
    
    # Group errors by file
    files_errors = {}
    for error in errors:
        filepath = error['file']
        if filepath not in files_errors:
            files_errors[filepath] = []
        files_errors[filepath].append(error)
    
    total_fixed = 0
    for filepath, file_errors in files_errors.items():
        fixed = fix_file(filepath, file_errors)
        if fixed > 0:
            print(f"✅ {filepath}: fixed {fixed} errors")
            total_fixed += fixed
    
    print(f"\n🎯 Total fixed: {total_fixed} errors")
    return 0

if __name__ == '__main__':
    sys.exit(main())
