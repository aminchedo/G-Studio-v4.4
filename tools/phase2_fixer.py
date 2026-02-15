#!/usr/bin/env python3
"""
Phase 2: More targeted TypeScript fixes
"""

import os
import re
import sys
from pathlib import Path
import shutil

class Phase2Fixer:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        
    def restore_from_backup(self, backup_dir: str, file_path: str):
        """Restore a file from backup"""
        backup_path = Path(backup_dir) / file_path
        target_path = self.project_root / file_path
        
        if backup_path.exists():
            shutil.copy2(backup_path, target_path)
            print(f"Restored: {file_path}")
            return True
        return False
        
    def fix_sidebar_carefully(self):
        """Fix Sidebar.tsx without breaking syntax"""
        print("Fixing Sidebar.tsx carefully...")
        
        file_path = self.project_root / 'src/components/layout/Sidebar.tsx'
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Only add optional chaining for specific function calls that we know exist
        # Remove the onRenameItem reference at line 108 if it exists
        lines = content.split('\n')
        new_lines = []
        
        for i, line in enumerate(lines):
            # Skip lines that reference undefined onRenameItem
            if 'onRenameItem' in line and 'props.onRenameItem' not in line and 'onRenameItem?' not in line:
                # Comment it out instead of removing
                new_lines.append('      // ' + line.lstrip())
            else:
                new_lines.append(line)
        
        content = '\n'.join(new_lines)
        
        with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(content)
            
    def fix_models_tab_carefully(self):
        """Fix ModelsTab.tsx numeric literal issue"""
        print("Fixing ModelsTab.tsx...")
        
        file_path = self.project_root / 'src/features/ai/AISettingsHub/ModelsTab.tsx'
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        # Fix the specific line with numeric literal issue
        # The issue is likely: config.maxTokens ?? 2048
        # Should be: (config.maxTokens ?? 2048)
        content = re.sub(
            r'(\w+\.\w+)\s*\?\?\s*(\d+)(?!\s*[,;\)])',
            r'(\1 ?? \2)',
            content
        )
        
        with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(content)
            
    def run_phase2_fixes(self):
        """Run phase 2 fixes"""
        print("=" * 80)
        print("PHASE 2: TARGETED FIXES")
        print("=" * 80)
        print()
        
        # Find most recent backup
        backups = sorted([d for d in self.project_root.glob("backups_*") if d.is_dir()])
        if backups:
            latest_backup = backups[-1]
            print(f"Using backup: {latest_backup}")
            
            # Restore Sidebar.tsx from backup
            self.restore_from_backup(latest_backup, 'src/components/layout/Sidebar.tsx')
            
        # Apply careful fixes
        self.fix_sidebar_carefully()
        self.fix_models_tab_carefully()
        
        print()
        print("Phase 2 fixes completed")

if __name__ == "__main__":
    project_root = r"C:\project\G-studio\G-Studio-v4.4_1-Integratedzi"
    
    fixer = Phase2Fixer(project_root)
    fixer.run_phase2_fixes()
    
    sys.exit(0)
