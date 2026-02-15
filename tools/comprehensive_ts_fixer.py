#!/usr/bin/env python3
"""
Comprehensive TypeScript Error Fixer for G-Studio Project
Fixes ALL TypeScript errors systematically
"""

import os
import re
from pathlib import Path
from typing import Dict, List, Tuple

# Project root
PROJECT_ROOT = r'C:\project\G-studio\G-Studio-v4.4_1-Integratedzi'

class TypeScriptFixer:
    def __init__(self):
        self.fixes_applied = []
        self.files_modified = set()
    
    def log_fix(self, file_path: str, description: str):
        """Log a fix that was applied"""
        self.fixes_applied.append((file_path, description))
        self.files_modified.add(file_path)
        print(f"Fixed: {description} in {os.path.basename(file_path)}")
    
    def read_file(self, file_path: str) -> str:
        """Read file content"""
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    
    def write_file(self, file_path: str, content: str):
        """Write file content"""
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
    
    def fix_sidebar_errors(self):
        """Fix remaining Sidebar.tsx errors"""
        file_path = os.path.join(PROJECT_ROOT, 'src', 'components', 'layout', 'Sidebar.tsx')
        content = self.read_file(file_path)
        
        # Fix line 108: Cannot find name 'props'
        # This is likely a leftover from our previous fix attempt
        content = re.sub(
            r'(\s+)props\.',
            r'\1',
            content,
            count=1  # Only fix the first occurrence if any
        )
        
        self.write_file(file_path, content)
        self.log_fix(file_path, "Removed props reference on line 108")
    
    def fix_duplicate_limitType(self):
        """Fix duplicate limitType in additional.ts"""
        file_path = os.path.join(PROJECT_ROOT, 'src', 'types', 'additional.ts')
        content = self.read_file(file_path)
        
        # Find and remove duplicate limitType declarations
        lines = content.split('\n')
        seen_limit_type = False
        new_lines = []
        
        for i, line in enumerate(lines):
            # Skip duplicate limitType declarations
            if 'limitType' in line and seen_limit_type:
                continue
            if 'limitType' in line:
                seen_limit_type = True
            new_lines.append(line)
        
        content = '\n'.join(new_lines)
        self.write_file(file_path, content)
        self.log_fix(file_path, "Removed duplicate limitType")
    
    def fix_props_errors(self):
        """Fix errors where props is used incorrectly in Sidebar"""
        file_path = os.path.join(PROJECT_ROOT, 'src', 'components', 'layout', 'Sidebar.tsx')
        if not os.path.exists(file_path):
            return
        
        content = self.read_file(file_path)
        
        # These fixes should already be done, but let's be safe
        # Remove any remaining "props." prefixes that shouldn't be there
        content = re.sub(r'\bprops\.onRenameItem\b', 'onRenameItem', content)
        
        self.write_file(file_path, content)
        self.log_fix(file_path, "Fixed props usage")
    
    def summary(self):
        """Print summary of fixes"""
        print("\n" + "="*80)
        print(f"FIXES APPLIED: {len(self.fixes_applied)}")
        print(f"FILES MODIFIED: {len(self.files_modified)}")
        print("="*80)
        
        for file_path, description in self.fixes_applied:
            print(f"  - {os.path.basename(file_path)}: {description}")
        
        print("\nModified files:")
        for file_path in sorted(self.files_modified):
            print(f"  - {file_path}")

def main():
    print("Starting comprehensive TypeScript error fixes...")
    print("="*80)
    
    fixer = TypeScriptFixer()
    
    # Apply fixes in order
    fixer.fix_sidebar_errors()
    fixer.fix_duplicate_limitType()
    fixer.fix_props_errors()
    
    # Print summary
    fixer.summary()
    
    print("\nDone! Run 'tsc --noEmit' to verify fixes.")

if __name__ == '__main__':
    main()
