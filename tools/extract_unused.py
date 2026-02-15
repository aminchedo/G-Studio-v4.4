#!/usr/bin/env python3
"""Extract unused components from analysis report"""
import json
import sys
from pathlib import Path

def extract_unused(report_path):
    """Extract unused files from full report"""
    with open(report_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    unused_files = []
    unwired_files = []
    
    for path, info in data['files'].items():
        if info.get('is_unused', False):
            unused_files.append({
                'path': info['relative_path'],
                'category': info['category'],
                'risk': info['risk_level'],
                'reason': info.get('recommendation', 'UNKNOWN'),
                'dependents': info.get('dependents_count', 0),
                'exported_symbols': info.get('exported_symbols', []),
                'lines': info.get('lines', 0)
            })
        
        # Check for unwired (has exports but not used)
        if (info.get('exported_symbols') and 
            len(info.get('exported_symbols', [])) > 0 and 
            info.get('dependents_count', 0) == 0 and
            not info.get('is_unused', False)):
            unwired_files.append({
                'path': info['relative_path'],
                'category': info['category'],
                'exports': info.get('exported_symbols', []),
                'reason': 'Has exports but no dependents (unwired)'
            })
    
    return {
        'unused': unused_files,
        'unwired': unwired_files,
        'total_files': data['metadata'].get('total_files', len(data['files']))
    }

if __name__ == '__main__':
    report_path = sys.argv[1] if len(sys.argv) > 1 else 'reports/20260211_064631/full_report.json'
    results = extract_unused(report_path)
    
    print(json.dumps(results, indent=2))
