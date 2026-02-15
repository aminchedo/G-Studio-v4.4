#!/usr/bin/env python3
import json
from pathlib import Path

act_file = Path("reports/20260211_073443/medium_candidates_activation.json")
data = json.load(open(act_file))

pending = [c for c in data['candidates'] if c.get('status') == 'pending_approval']
applied = [c for c in data['candidates'] if c.get('status') == 'applied']

print(f"Applied: {len(applied)}")
print(f"Pending: {len(pending)}\n")

if pending:
    print("Pending components:")
    for c in pending:
        print(f"  - {c['path']}")
        print(f"    Risk: {c['estimated_risk']}")
        print(f"    Reason: {c.get('why_unused', 'N/A')}\n")
