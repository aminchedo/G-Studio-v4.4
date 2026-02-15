#!/usr/bin/env python3
"""Save patches as individual .diff files"""
import json
import sys
from pathlib import Path

def save_patches():
    """Save patches to individual files and create manifest"""
    patches_file = sys.argv[1] if len(sys.argv) > 1 else 'reports/20260211_064615/patches_generated.json'
    output_dir = sys.argv[2] if len(sys.argv) > 2 else 'reports/20260211_064615/patches'
    
    with open(patches_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    patches = data.get('patches', [])
    manifest = data.get('manifest', {})
    
    # Create output directory
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    # Save each patch
    for patch in patches:
        patch_id = patch.get('patch_id', 'unknown')
        target_file = patch.get('target_file', '')
        diff_line = patch.get('diff_line', '')
        action = patch.get('action', '')
        
        # Create simple unified diff format
        diff_content = f"""--- {target_file}
+++ {target_file}
@@ -0,0 +1,1 @@
+{diff_line}
"""
        
        # Save patch file
        patch_filename = f"{patch_id}.diff"
        patch_path = Path(output_dir) / patch_filename
        
        with open(patch_path, 'w', encoding='utf-8') as f:
            f.write(diff_content)
        
        print(f"Saved: {patch_filename}")
    
    # Save manifest
    manifest_path = Path(output_dir) / 'patches_manifest.json'
    with open(manifest_path, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2, ensure_ascii=False)
    
    print(f"\nManifest saved: {manifest_path}")
    print(f"Total patches: {len(patches)}")
    print(f"Low risk: {manifest.get('low_risk', 0)}")
    print(f"Manual review: {manifest.get('manual_review', 0)}")

if __name__ == '__main__':
    save_patches()
