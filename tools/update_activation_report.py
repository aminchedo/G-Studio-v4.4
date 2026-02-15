#!/usr/bin/env python3
"""Update agent_actions.html with applied status from activation.json."""
import json
import sys
from pathlib import Path

def html_escape(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")

def main():
    rp = Path(sys.argv[1] if len(sys.argv) >= 2 else "reports/20260211_073443")
    data = json.load(open(rp / "medium_candidates_activation.json", encoding="utf-8"))
    html_path = rp / "agent_actions.html"
    if not html_path.exists():
        return 1
    html = html_path.read_text(encoding="utf-8")
    n_applied = sum(1 for c in data["candidates"] if c.get("status") == "applied")
    n_pending = sum(1 for c in data["candidates"] if c.get("status") == "pending_approval")
    desc = f"Applied: {n_applied} | Pending: {n_pending} | Low: {data['low_risk']} M: {data['medium_risk']} H: {data['high_risk']}"
    import re
    pat = re.compile(r'<div class="section-description">Applied: \d+ \| Pending: \d+ \| Low:.*?</div>')
    if pat.search(html):
        html = pat.sub(f'<div class="section-description">{desc}</div>', html, count=1)
    elif 'Activation Plan' in html:
        html = html.replace(
            '<div class="section-description">Dry-run. Low:',
            f'<div class="section-description">{desc}',
            1
        )
    html_path.write_text(html, encoding="utf-8")
    return 0

if __name__ == "__main__":
    sys.exit(main())
