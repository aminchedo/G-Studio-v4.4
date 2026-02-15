#!/usr/bin/env python3
"""Inject activation plan section into agent_actions.html."""
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
    rows = []
    for c in data.get("candidates", [])[:60]:
        risk = c.get("estimated_risk", "LOW")
        feas = c.get("feasibility", "feasible")
        feat = ", ".join(c.get("potential_features", [])[:3])
        low_btn = '<button class="btn-approve" data-id="{}">Approve</button>'.format(c["id"]) if risk == "LOW" else ""
        rows.append(f"""
<tr><td><code>{html_escape(c["path"])}</code></td><td>{html_escape(c["minimal_patch_summary"])}</td>
<td>{c.get("estimated_lines_changed", 2)}</td><td>{risk}</td><td>{html_escape(feat)}</td>
<td>{low_btn}<button class="btn-review" data-id="{c["id"]}">Review</button><button class="btn-skip" data-id="{c["id"]}">Skip</button></td></tr>""")
    section = f"""
<div class="section" id="activation-plan-section">
<div class="section-header"><h2 class="section-title"><span class="section-icon">🔧</span> Activation Plan ({data["total_candidates"]})</h2></div>
<div class="section-description">Dry-run. Low: {data["low_risk"]}, Medium: {data["medium_risk"]}, High: {data["high_risk"]}. Await approval.</div>
<div class="section-content">
<table><thead><tr><th>Path</th><th>Patch</th><th>Lines</th><th>Risk</th><th>Features</th><th>Actions</th></tr></thead><tbody>
{"".join(rows)}
</tbody></table>
</div>
</div>
"""
    marker = '<div class="section">\n    <div class="section-header">\n        <h2 class="section-title">\n            <span class="section-icon">🗑️</span>\n            Unused Files'
    if marker in html and "activation-plan-section" not in html:
        html = html.replace(marker, section + "\n" + marker)
        html_path.write_text(html, encoding="utf-8")
    return 0

if __name__ == "__main__":
    sys.exit(main())
