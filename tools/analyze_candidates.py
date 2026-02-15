#!/usr/bin/env python3
"""Analyze unused/unwired candidates for minimal-fix opportunities"""
import json
import sys
from pathlib import Path
from collections import defaultdict

def analyze_candidates(report_path):
    """Analyze and categorize fix opportunities"""
    with open(report_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Categorize files
    unused_files = []
    unwired_files = []
    potential_fixes = defaultdict(list)
    
    for path, info in data['files'].items():
        rel_path = info['relative_path']
        category = info['category']
        exports = info.get('exported_symbols', [])
        dependents = info.get('dependents_count', 0)
        is_unused = info.get('is_unused', False)
        recommendation = info.get('recommendation', 'UNKNOWN')
        
        # Skip test files, config files we shouldn't touch
        if category in ['TEST', 'CONFIGURATION', 'ASSET', 'SCRIPT']:
            continue
        
        # Unwired: has exports but no dependents
        if exports and len(exports) > 0 and dependents == 0:
            reason = "never_imported"
            if any(kw in rel_path.lower() for kw in ['component', 'modal', 'panel', 'view']):
                reason = "ui_not_registered"
            elif any(kw in rel_path.lower() for kw in ['service', 'provider', 'api']):
                reason = "service_not_initialized"
            elif any(kw in rel_path.lower() for kw in ['hook', 'use']):
                reason = "hook_not_used"
            elif category == 'STORE_OR_STATE':
                reason = "store_not_connected"
            
            unwired_files.append({
                'path': rel_path,
                'category': category,
                'exports': exports[:5],  # First 5 exports
                'export_count': len(exports),
                'reason': reason,
                'risk': info.get('risk_level', 'LOW'),
                'lines': info.get('lines', 0)
            })
            
            potential_fixes[reason].append(rel_path)
        
        # Truly unused (marked by analysis)
        if is_unused:
            unused_files.append({
                'path': rel_path,
                'category': category,
                'recommendation': recommendation,
                'risk': info.get('risk_level', 'LOW'),
                'lines': info.get('lines', 0)
            })
    
    # Sort by fix complexity
    fix_priority = {
        'ui_not_registered': 1,      # Add to registry
        'service_not_initialized': 2, # Add init call
        'hook_not_used': 3,           # Add import/usage
        'store_not_connected': 4,     # Connect to provider
        'never_imported': 5           # Add export in index
    }
    
    unwired_files.sort(key=lambda x: (fix_priority.get(x['reason'], 99), -len(x['exports'])))
    
    return {
        'summary': {
            'total_unwired': len(unwired_files),
            'total_unused': len(unused_files),
            'by_reason': {k: len(v) for k, v in potential_fixes.items()},
            'timestamp': '20260211_064615'
        },
        'unwired': unwired_files[:50],  # Top 50 candidates
        'unused': unused_files[:20],     # Top 20 unused
        'fix_groups': {k: v[:10] for k, v in potential_fixes.items()}  # Top 10 per group
    }

if __name__ == '__main__':
    report_path = sys.argv[1] if len(sys.argv) > 1 else 'reports/20260211_064631/full_report.json'
    results = analyze_candidates(report_path)
    
    # Output as UTF-8
    print(json.dumps(results, indent=2, ensure_ascii=False))
