#!/usr/bin/env python3
"""
Fix syntax errors in Sidebar.tsx and ModelsTab.tsx
These errors were caused by improper regex replacements.
"""

import os
import re

def fix_sidebar():
    """Fix Sidebar.tsx syntax errors"""
    filepath = r'C:\project\G-studio\G-Studio-v4.4_1-Integratedzi\src\components\layout\Sidebar.tsx'
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix 1: Remove 'props.' prefix from interface definition (line 27)
    content = content.replace(
        '  props.onRenameItem?: (oldPath: string, newName: string) => void;',
        '  onRenameItem?: (oldPath: string, newName: string) => void;'
    )
    
    # Fix 2: Remove 'props.' prefix from JSX prop (line 165)
    content = content.replace(
        '                props.onRenameItem={handleRenameItem}',
        '                onRenameItem={handleRenameItem}'
    )
    
    # Fix 3: Remove 'props.' prefix from destructuring (line 258)
    # This is tricky because it's in a long line, so we'll use a more targeted replacement
    content = re.sub(
        r'files, onFileSelect, selectedFile: selectedFileProp, activeFile, onCreateFile, onDeleteFile, onFileDelete, props\.onRenameItem,',
        'files, onFileSelect, selectedFile: selectedFileProp, activeFile, onCreateFile, onDeleteFile, onFileDelete, onRenameItem,',
        content
    )
    
    # Fix 4: Remove 'props.' prefix from usage (line 263)
    content = content.replace(
        '  const handleRenameItem = props.onRenameItem ?? (onFileRename ? (oldPath: string, _newName: string) => { onFileRename(oldPath); } : () => {});',
        '  const handleRenameItem = onRenameItem ?? (onFileRename ? (oldPath: string, _newName: string) => { onFileRename(oldPath); } : () => {});'
    )
    
    # Fix 5: Remove 'props.' prefix from JSX prop (line 677)
    # Use a more specific pattern to avoid replacing the wrong occurrence
    content = re.sub(
        r'(\s+)props\.onRenameItem=\{handleRenameItem\}',
        r'\1onRenameItem={handleRenameItem}',
        content
    )
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✓ Fixed Sidebar.tsx")

def fix_models_tab():
    """Fix ModelsTab.tsx syntax error"""
    filepath = r'C:\project\G-studio\G-Studio-v4.4_1-Integratedzi\src\features\ai\AISettingsHub\ModelsTab.tsx'
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix: Can't call method on number literal directly - need parentheses or use toLocaleString on variable
    content = content.replace(
        '                {config.maxTokens ?? 2048.toLocaleString()}',
        '                {config.maxTokens?.toLocaleString() ?? \'2048\'}'
    )
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print(f"✓ Fixed ModelsTab.tsx")

if __name__ == '__main__':
    print("Fixing syntax errors caused by previous script...")
    fix_sidebar()
    fix_models_tab()
    print("\n✓ All syntax errors fixed!")
