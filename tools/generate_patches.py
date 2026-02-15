#!/usr/bin/env python3
"""Generate unified diff patches for minimal fixes"""
import json
import sys
from pathlib import Path
from typing import Dict, List
import os

def read_file_safe(path: str) -> List[str]:
    """Read file or return empty if doesn't exist"""
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return f.readlines()
    except FileNotFoundError:
        return []
    except Exception:
        try:
            with open(path, 'r', encoding='utf-8-sig') as f:
                return f.readlines()
        except:
            return []

def generate_index_export_patch(plan: Dict) -> Dict:
    """Generate patch for adding exports to index.ts"""
    component = plan['component']
    files_to_modify = plan.get('files_to_modify', [])
    specific_action = plan.get('specific_action', '')
    
    if not files_to_modify:
        return None
    
    # Get the index file to modify
    index_file = files_to_modify[0]
    
    # Check if file exists
    if not os.path.exists(index_file):
        # Need to create the file
        new_content = f"// Auto-generated barrel export\n{specific_action}\n"
        return {
            'patch_id': f"patch_{Path(component).stem}",
            'component': component,
            'target_file': index_file,
            'patch_type': 'create',
            'new_content': new_content,
            'risk': plan['risk'],
            'action': specific_action
        }
    
    # File exists, append export
    current_lines = read_file_safe(index_file)
    
    # Extract export line from specific_action
    if 'export' in specific_action:
        export_line = specific_action.replace('Add: ', '').strip()
        if not export_line.endswith('\n'):
            export_line += '\n'
        
        # Check if already exists
        export_check = export_line.split('from')[0].strip()
        already_exists = any(export_check in line for line in current_lines)
        
        if already_exists:
            return None  # Skip if already exported
        
        # Generate patch
        new_lines = current_lines + [export_line]
        
        return {
            'patch_id': f"patch_{Path(component).stem}",
            'component': component,
            'target_file': index_file,
            'patch_type': 'append',
            'old_content': ''.join(current_lines),
            'new_content': ''.join(new_lines),
            'diff_line': export_line.strip(),
            'risk': plan['risk'],
            'action': specific_action
        }
    
    return None

def main():
    """Generate all patches"""
    fix_plans_file = sys.argv[1] if len(sys.argv) > 1 else 'reports/20260211_064615/fix_plans.json'
    
    with open(fix_plans_file, 'r', encoding='utf-8-sig') as f:
        data = json.load(f)
    
    plans = data.get('plans', [])
    
    patches = []
    low_risk_patches = []
    manifest = {
        'timestamp': '20260211_064615',
        'total_patches': 0,
        'low_risk': 0,
        'manual_review': 0,
        'patches': []
    }
    
    for plan in plans:
        if plan['patch_type'] != 'low-risk':
            continue
        
        # Generate patch for index exports
        if any('index.ts' in f for f in plan.get('files_to_modify', [])):
            patch = generate_index_export_patch(plan)
            if patch:
                patches.append(patch)
                
                # Save individual patch
                patch_filename = f"{patch['patch_id']}.json"
                manifest['patches'].append({
                    'id': patch['patch_id'],
                    'component': patch['component'],
                    'target_file': patch['target_file'],
                    'patch_file': patch_filename,
                    'risk': patch['risk'],
                    'action': patch['action'],
                    'lines_changed': 1
                })
                
                if patch['risk'] in ['LOW', 'MEDIUM']:
                    manifest['low_risk'] += 1
                else:
                    manifest['manual_review'] += 1
    
    manifest['total_patches'] = len(patches)
    
    # Output
    output = {
        'manifest': manifest,
        'patches': patches
    }
    
    # Write to file instead of stdout to avoid encoding issues
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'reports/20260211_064615/patches_generated.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"Generated {len(patches)} patches. Output: {output_file}")

if __name__ == '__main__':
    main()
