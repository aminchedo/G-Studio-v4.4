"""Phase 1 Intelligence Extraction - Parse reports for reintegration candidates."""
import json
import sys

def main():
    with open('reports/latest/full_report.json', 'r', encoding='utf-8') as f:
        data = json.load(f)

    # Unused = dependents_count 0, LOW risk, exclude config/test
    unused_low = []
    for path, info in data['files'].items():
        if info.get('dependents_count', 0) == 0 and info.get('risk_level') == 'LOW':
            cat = info.get('category', '')
            rel = info.get('relative_path', '')
            if 'CONFIGURATION' not in cat and 'TEST' not in cat:
                if not rel.endswith('.html') and not rel.endswith('.json') and not rel.endswith('.md'):
                    if 'src' in rel:
                        unused_low.append({
                            'path': rel,
                            'category': cat,
                            'stability': info.get('stability_score', 0),
                            'complexity': info.get('complexity_estimate', 0),
                            'any_count': info.get('any_count', 0),
                            'exported': info.get('exported_symbols', [])[:5]
                        })

    unused_low.sort(key=lambda x: (-x['stability'], x['complexity'], x['any_count']))

    print('=== TOP 5 UNUSED LOW-RISK (src only) ===')
    for i, u in enumerate(unused_low[:5]):
        print(f"{i+1}. {u['path']} | category={u['category']} | stability={u['stability']:.1f} | any={u['any_count']} | exports={u['exported']}")

    # Duplicate clusters
    clusters = {}
    for path, info in data['files'].items():
        cid = info.get('duplicate_cluster_id')
        if cid:
            if cid not in clusters:
                clusters[cid] = []
            clusters[cid].append({
                'path': info.get('relative_path'),
                'deps': info.get('dependents_count', 0),
                'risk': info.get('risk_level'),
                'stability': info.get('stability_score', 0)
            })

    print('\n=== LOW-RISK DUPLICATE CLUSTERS ===')
    for cid, members in clusters.items():
        all_low = all(m['risk'] == 'LOW' for m in members)
        if all_low:
            print(f'{cid}: {len(members)} members')
            for m in members:
                print(f"  - {m['path']} deps={m['deps']} risk={m['risk']}")

    # Single safest reintegration: unused LOW with exports, type definitions or utilities
    candidates = [u for u in unused_low if u['any_count'] == 0 and u['category'] in ('TYPE_DEFINITION', 'UTILITY', 'CUSTOM_HOOK', 'UI_COMPONENT')]
    if candidates:
        best = candidates[0]
        print(f'\n=== SAFEST REINTEGRATION CANDIDATE ===')
        print(json.dumps(best, indent=2))

if __name__ == '__main__':
    main()
