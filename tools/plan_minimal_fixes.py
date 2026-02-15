#!/usr/bin/env python3
"""Generate minimal-fix action plans for unwired components"""
import json
import sys
from pathlib import Path
from typing import Dict, List, Any

def generate_fix_plan(candidate: Dict[str, Any]) -> Dict[str, Any]:
    """Generate a minimal-fix plan for a single candidate"""
    path = candidate['path']
    reason = candidate['reason']
    category = candidate['category']
    exports = candidate.get('exports', [])
    risk = candidate.get('risk', 'LOW')
    
    plan = {
        'component': path,
        'reason': reason,
        'category': category,
        'exports': exports,
        'risk': risk,
        'estimated_lines_changed': 0,
        'files_to_modify': [],
        'action_summary': '',
        'patch_type': 'low-risk'
    }
    
    # Determine minimal fix based on reason
    if reason == 'ui_not_registered':
        # UI components - need lazy loading or registration
        if 'barrel_export' in category.lower() or path.endswith('index.ts'):
            # Already exported, just needs to be imported
            plan['action_summary'] = f"Add import in main App component or relevant parent"
            plan['files_to_modify'] = [path, 'src/components/app/App.tsx']
            plan['estimated_lines_changed'] = 2
            plan['specific_action'] = f"Add: import {{ {exports[0] if exports else 'default'} }} from '@/{path.replace(chr(92), '/')}'"
        else:
            # Need to export in index
            plan['action_summary'] = f"Export component in parent index.ts"
            parent_dir = str(Path(path).parent / 'index.ts')
            plan['files_to_modify'] = [parent_dir]
            plan['estimated_lines_changed'] = 1
            plan['specific_action'] = f"Add: export {{ {', '.join(exports[:3])} }} from './{Path(path).stem}'"
    
    elif reason == 'service_not_initialized':
        # Services - need initialization
        plan['action_summary'] = f"Add service initialization in app bootstrap"
        plan['files_to_modify'] = ['src/services/index.ts', 'src/components/app/App.tsx']
        plan['estimated_lines_changed'] = 3
        plan['specific_action'] = f"Initialize service in app startup or create lazy loader"
    
    elif reason == 'hook_not_used':
        # Hooks - create a small demo or add to existing component
        plan['action_summary'] = f"Add hook import in relevant component (optional/demo)"
        plan['files_to_modify'] = [path]
        plan['estimated_lines_changed'] = 1
        plan['specific_action'] = f"Document usage or add to hooks index for future use"
        plan['patch_type'] = 'manual-review'  # Don't auto-apply hooks
    
    elif reason == 'store_not_connected':
        # Stores - need provider wrapper
        plan['action_summary'] = f"Connect store to app provider"
        plan['files_to_modify'] = [path, 'src/components/app/AppProvider.tsx']
        plan['estimated_lines_changed'] = 5
        plan['specific_action'] = f"Wrap app with store provider or add to combined provider"
    
    elif reason == 'never_imported':
        # Just needs export in parent index
        plan['action_summary'] = f"Add export in parent index file"
        parent_dir = str(Path(path).parent / 'index.ts')
        plan['files_to_modify'] = [parent_dir]
        plan['estimated_lines_changed'] = 1
        plan['specific_action'] = f"Add barrel export"
    
    # Adjust risk based on category and files to modify
    if category == 'BARREL_EXPORT':
        plan['patch_type'] = 'low-risk'
    elif category == 'TYPE_DEFINITION':
        plan['patch_type'] = 'low-risk'
    elif risk in ['HIGH', 'CRITICAL']:
        plan['patch_type'] = 'manual-review'
    elif plan['estimated_lines_changed'] > 5:
        plan['patch_type'] = 'medium-risk'
    
    return plan

def main():
    """Generate fix plans for all candidates"""
    candidates_file = sys.argv[1] if len(sys.argv) > 1 else 'reports/20260211_064615/candidates_prioritized.json'
    
    with open(candidates_file, 'r', encoding='utf-8-sig') as f:
        data = json.load(f)
    
    unwired = data.get('unwired', [])
    
    # Generate plans
    plans = []
    low_risk_count = 0
    medium_risk_count = 0
    manual_review_count = 0
    
    for candidate in unwired[:100]:  # Top 100 candidates
        plan = generate_fix_plan(candidate)
        plans.append(plan)
        
        if plan['patch_type'] == 'low-risk':
            low_risk_count += 1
        elif plan['patch_type'] == 'medium-risk':
            medium_risk_count += 1
        else:
            manual_review_count += 1
    
    output = {
        'metadata': {
            'timestamp': '20260211_064615',
            'total_plans': len(plans),
            'low_risk_auto_apply': low_risk_count,
            'medium_risk_manual': medium_risk_count,
            'manual_review_only': manual_review_count
        },
        'plans': plans
    }
    
    print(json.dumps(output, indent=2, ensure_ascii=False))

if __name__ == '__main__':
    main()
