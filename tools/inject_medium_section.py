#!/usr/bin/env python3
"""Inject medium-potential candidates section into agent_actions.html."""
import json
import sys
from pathlib import Path

def html_escape(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")

def build_section(candidates, ts):
    rows = []
    for c in candidates[:50]:
        risk = c.get("estimated_risk", "low")
        feat = ", ".join(c.get("potential_features", [])[:3])
        benefit = f"Adds {feat} - estimated gain: +{c.get('estimated_lines_changed', 2)} lines"
        low_btn = f'<button class="btn-approve" data-id="{c["id"]}">Approve auto-apply</button>' if risk == "low" else ""
        rows.append(f"""
<tr data-id="{c["id"]}">
<td><code>{html_escape(c["path"])}</code></td>
<td>{html_escape(c["why_unused"])}</td>
<td>{html_escape(", ".join(c.get("potential_features", [])))}</td>
<td>{html_escape(c["minimal_patch_summary"])}</td>
<td>{c.get("estimated_lines_changed", 2)}</td>
<td>{html_escape(risk)}</td>
<td>{html_escape(benefit)}</td>
<td>{low_btn}<button class="btn-review" data-id="{c["id"]}">Manual review</button><button class="btn-skip" data-id="{c["id"]}">Skip</button></td>
</tr>""")
    return f"""
<div class="section" id="medium-potential-section">
<div class="section-header">
<h2 class="section-title"><span class="section-icon">⭐</span> Medium-Potential Candidates ({len(candidates)})</h2>
</div>
<div class="section-description">Unused components with medium-high potential. Review and approve to enable.</div>
<div class="section-content">
<table><thead><tr><th>Path</th><th>Why unused</th><th>Features</th><th>Patch</th><th>Lines</th><th>Risk</th><th>Benefit</th><th>Actions</th></tr></thead><tbody>
{"".join(rows)}
</tbody></table>
</div>
</div>
"""

def main():
    rp = Path(sys.argv[1] if len(sys.argv) >= 2 else "reports/20260211_072445")
    data = json.load(open(rp / "medium_candidates.json", encoding="utf-8"))
    html_path = rp / "agent_actions.html"
    html = html_path.read_text(encoding="utf-8")
    section = build_section(data["candidates"], data["timestamp"])
    marker = '<div class="section">\n    <div class="section-header">\n        <h2 class="section-title">\n            <span class="section-icon">🗑️</span>\n            Unused Files'
    if marker in html:
        html = html.replace(marker, section + "\n" + marker)
        html_path.write_text(html, encoding="utf-8")
    return 0

if __name__ == "__main__":
    sys.exit(main())
