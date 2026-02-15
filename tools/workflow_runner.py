#!/usr/bin/env python3
"""Auto-Scan workflow runner - Python only. No MD generation."""
import json
import os
import shutil
import sys
from pathlib import Path
from datetime import datetime

IGNORE_EXT = ('.md', '.markdown', '.backup', '_v2.py', '_v3.backup')
IGNORE_PATTERNS = ('backup', 'temp', 'node_modules', 'reports', '.git')

def norm_path(p):
    return p.replace('\\', '/')

def should_ignore(rel_path):
    rel = norm_path(rel_path).lower()
    if any(rel.endswith(x) or x in rel for x in IGNORE_EXT):
        return True
    if any(pt in rel for pt in IGNORE_PATTERNS):
        return True
    if rel.endswith('.md') or '/.md' in rel:
        return True
    return False

def is_source_file(rel_path):
    ext = Path(rel_path).suffix.lower()
    return ext in ('.ts', '.tsx', '.js', '.jsx', '.py')

def extract_candidates(report_path, timestamp):
    with open(report_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    files = data.get('files', {})
    raw = data.get('unused_candidates', [])
    root = Path(data.get('metadata', {}).get('scan_root', '.'))
    candidates = []
    for abs_path in raw:
        try:
            rel = Path(abs_path).relative_to(root)
        except ValueError:
            rel = Path(abs_path)
        rel_str = norm_path(str(rel))
        if should_ignore(rel_str):
            continue
        if not is_source_file(rel_str):
            continue
        info = files.get(abs_path, {})
        if not info:
            continue
        exports = info.get('exported_symbols', [])
        deps = info.get('dependents_count', 0)
        risk = info.get('risk_level', 'LOW')
        cat = info.get('category', 'UNKNOWN')
        candidates.append({
            'path': rel_str,
            'abs_path': abs_path,
            'category': cat,
            'exports': exports[:5],
            'export_count': len(exports),
            'dependents': deps,
            'risk': risk,
            'reason': 'never_imported'
        })
    return candidates, data

def plan_patches(candidates):
    plans = []
    for c in candidates[:60]:
        path = c['path']
        parent = str(Path(path).parent)
        stem = Path(path).stem
        if parent == '.':
            continue
        index_path = f"{parent.replace(chr(92), '/')}/index.ts"
        if not index_path.startswith('src/') and not index_path.startswith('governance/'):
            continue
        exports = c.get('exports', [])
        if not exports:
            exports = ['default'] if stem else []
        safe_exports = [e for e in exports if e and e != 'default'][:3]
        if not safe_exports and 'default' in exports:
            safe_exports = ['default']
        if not safe_exports:
            safe_exports = ['default']
        mod = stem
        line = f"export {{ {', '.join(str(x) for x in safe_exports)} }} from './{mod}'"
        plans.append({
            'component': path,
            'target_file': index_path,
            'diff_line': line,
            'risk': c['risk'],
            'patch_type': 'low-risk' if c['risk'] in ('LOW', 'MEDIUM') else 'medium-risk'
        })
    return plans

def apply_patch(plan, ts):
    target = plan['target_file']
    line = plan['diff_line']
    if not os.path.exists(target):
        return {'status': 'skip', 'msg': f'no index: {target}'}
    with open(target, 'r', encoding='utf-8') as f:
        content = f.read()
    if line.strip() in content:
        return {'status': 'exists', 'msg': 'already exported'}
    backup = f"{target}.backup.{ts}"
    shutil.copy2(target, backup)
    new_content = content.rstrip() + '\n' + line + '\n'
    with open(target, 'w', encoding='utf-8') as f:
        f.write(new_content)
    return {'status': 'applied', 'backup': backup}

def main():
    ts = sys.argv[1] if len(sys.argv) > 1 else datetime.now().strftime('%Y%m%d_%H%M%S')
    report_dir = f'reports/{ts}'
    report_path = f'{report_dir}/full_report.json'
    if not os.path.exists(report_path):
        rep_dirs = [d for d in os.listdir('reports') if os.path.isdir(f'reports/{d}') and d.isdigit()]
        if rep_dirs:
            latest = sorted(rep_dirs)[-1]
            report_path = f'reports/{latest}/full_report.json'
            ts = latest
            report_dir = f'reports/{ts}'
    if not os.path.exists(report_path):
        print(json.dumps({'error': 'no full_report.json found'}))
        return 1
    candidates, _ = extract_candidates(report_path, ts)
    plans = plan_patches(candidates)
    low_risk = [p for p in plans if p['patch_type'] == 'low-risk']
    patch_ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    patch_dir = Path(f'{report_dir}/patches')
    patch_dir.mkdir(parents=True, exist_ok=True)
    applied = []
    for i, p in enumerate(low_risk[:35]):
        diff_path = patch_dir / f"{Path(p['component']).stem}_{i}.diff"
        with open(diff_path, 'w', encoding='utf-8') as f:
            f.write(f"--- {p['target_file']}\n+++ {p['target_file']}\n@@ +1 @@\n+{p['diff_line']}\n")
        res = apply_patch(p, patch_ts)
        if res['status'] == 'applied':
            applied.append({'component': p['component'], 'target': p['target_file']})
    manifest = {
        'timestamp': ts,
        'patch_timestamp': patch_ts,
        'total_candidates': len(candidates),
        'total_plans': len(plans),
        'low_risk_plans': len(low_risk),
        'applied': len(applied),
        'patches': [{'component': p['component'], 'target': p['target_file'], 'risk': p['risk']} for p in low_risk]
    }
    with open(patch_dir / 'patches_manifest.json', 'w', encoding='utf-8') as f:
        json.dump(manifest, f, indent=2)
    out = {
        'timestamp': ts,
        'candidates_count': len(candidates),
        'plans_count': len(plans),
        'low_risk_count': len(low_risk),
        'applied_count': len(applied),
        'applied': applied,
        'manifest_path': f'{report_dir}/patches/patches_manifest.json'
    }
    with open(f'{report_dir}/workflow_result.json', 'w', encoding='utf-8') as f:
        json.dump(out, f, indent=2)
    full_data = json.load(open(report_path, encoding='utf-8'))
    total_scanned = len(full_data.get('files', {}))
    remaining = len(candidates) - len(applied)
    import importlib.util
    spec = importlib.util.spec_from_file_location("transfer_summary", Path(__file__).parent / "transfer_summary.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    mod.emit_transfer_summary(
        timestamp=ts,
        total_scanned=total_scanned,
        n_moved=0,
        remaining_unused=remaining,
        patches_generated=len(plans),
        patches_applied=len(applied),
        pending_manual=len([p for p in plans if p['patch_type'] != 'low-risk']),
    )
    print(json.dumps(out, indent=2))
    return 0

if __name__ == '__main__':
    sys.exit(main())
