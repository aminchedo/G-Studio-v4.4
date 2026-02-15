#!/usr/bin/env python3
"""Apply low-risk patches with backups and validation"""
import json
import sys
import shutil
from pathlib import Path
from datetime import datetime

def backup_file(file_path: str, timestamp: str) -> str:
    """Create backup of file before modification"""
    if not Path(file_path).exists():
        return None
    
    backup_path = f"{file_path}.backup.{timestamp}"
    shutil.copy2(file_path, backup_path)
    return backup_path

def apply_patch(patch_data: dict, timestamp: str, dry_run: bool = False) -> dict:
    """Apply a single patch"""
    target_file = patch_data.get('target_file', '')
    patch_type = patch_data.get('patch_type', '')
    diff_line = patch_data.get('diff_line', '')
    
    result = {
        'target_file': target_file,
        'status': 'pending',
        'message': '',
        'backup': None
    }
    
    if not target_file:
        result['status'] = 'skipped'
        result['message'] = 'No target file specified'
        return result
    
    # Check if file needs to be created
    if patch_type == 'create':
        if Path(target_file).exists():
            result['status'] = 'skipped'
            result['message'] = 'File already exists'
            return result
        
        if dry_run:
            result['status'] = 'would_create'
            result['message'] = f'Would create {target_file}'
            return result
        
        # Create parent directory
        Path(target_file).parent.mkdir(parents=True, exist_ok=True)
        
        # Create file with new content
        new_content = patch_data.get('new_content', '')
        with open(target_file, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        result['status'] = 'created'
        result['message'] = f'Created {target_file}'
        return result
    
    # Append to existing file
    if not Path(target_file).exists():
        result['status'] = 'error'
        result['message'] = f'File not found: {target_file}'
        return result
    
    # Backup original
    backup_path = backup_file(target_file, timestamp)
    result['backup'] = backup_path
    
    # Read current content
    with open(target_file, 'r', encoding='utf-8') as f:
        current_content = f.read()
    
    # Check if already applied
    if diff_line and diff_line in current_content:
        result['status'] = 'already_applied'
        result['message'] = 'Export already exists'
        return result
    
    if dry_run:
        result['status'] = 'would_apply'
        result['message'] = f'Would add: {diff_line[:50]}...'
        return result
    
    # Apply patch (append line)
    new_content = current_content
    if not current_content.endswith('\n'):
        new_content += '\n'
    new_content += diff_line + '\n'
    
    # Write updated content
    with open(target_file, 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    result['status'] = 'applied'
    result['message'] = f'Added export to {target_file}'
    
    return result

def main():
    """Apply all patches"""
    patches_file = sys.argv[1] if len(sys.argv) > 1 else 'reports/20260211_064615/patches_generated.json'
    dry_run = '--dry-run' in sys.argv
    
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    
    with open(patches_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    patches = data.get('patches', [])
    
    results = {
        'timestamp': timestamp,
        'dry_run': dry_run,
        'total': len(patches),
        'applied': 0,
        'created': 0,
        'skipped': 0,
        'already_applied': 0,
        'errors': 0,
        'details': []
    }
    
    print(f"{'DRY RUN: ' if dry_run else ''}Applying {len(patches)} patches...")
    print(f"Timestamp: {timestamp}")
    print()
    
    for i, patch in enumerate(patches, 1):
        patch_id = patch.get('patch_id', f'patch_{i}')
        print(f"[{i}/{len(patches)}] {patch_id}...", end=' ')
        
        result = apply_patch(patch, timestamp, dry_run)
        results['details'].append({
            'patch_id': patch_id,
            **result
        })
        
        # Update counters
        if result['status'] == 'applied':
            results['applied'] += 1
        elif result['status'] == 'created':
            results['created'] += 1
        elif result['status'] == 'skipped':
            results['skipped'] += 1
        elif result['status'] == 'already_applied':
            results['already_applied'] += 1
        elif result['status'] == 'error':
            results['errors'] += 1
        
        print(f"{result['status']}: {result['message']}")
    
    # Save results
    results_file = f"reports/20260211_064615/apply_results_{timestamp}.json"
    with open(results_file, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print()
    print("=" * 60)
    print("SUMMARY:")
    print(f"  Total patches: {results['total']}")
    print(f"  Applied: {results['applied']}")
    print(f"  Created: {results['created']}")
    print(f"  Skipped: {results['skipped']}")
    print(f"  Already applied: {results['already_applied']}")
    print(f"  Errors: {results['errors']}")
    print(f"\nResults saved: {results_file}")

if __name__ == '__main__':
    main()
