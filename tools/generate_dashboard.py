import json
import base64
from pathlib import Path

def generate_dashboard(json_report_path: str, output_path: str = "optimization_dashboard.html"):
    """Generate a complete HTML dashboard from JSON report"""
    
    with open(json_report_path, 'r', encoding='utf-8') as f:
        report = json.load(f)
    
    # Create dashboard HTML
    dashboard = f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Optimization Dashboard</title>
    <style>
        :root {{
            --primary-color: #2563eb;
            --secondary-color: #7c3aed;
            --success-color: #10b981;
            --warning-color: #f59e0b;
            --danger-color: #ef4444;
            --dark-bg: #0f172a;
            --dark-card: #1e293b;
            --dark-border: #334155;
            --text-primary: #f1f5f9;
            --text-secondary: #94a3b8;
            --radius: 8px;
            --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
        }}
        
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: var(--dark-bg);
            color: var(--text-primary);
            line-height: 1.6;
        }}
        
        .container {{
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }}
        
        .header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 20px 0;
            border-bottom: 1px solid var(--dark-border);
            margin-bottom: 30px;
        }}
        
        .header h1 {{
            font-size: 28px;
            background: linear-gradient(135deg, var(--primary-color), var(--secondary-color));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }}
        
        .summary-cards {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        
        .card {{
            background: var(--dark-card);
            border-radius: var(--radius);
            padding: 20px;
            box-shadow: var(--shadow);
            border: 1px solid var(--dark-border);
            transition: transform 0.2s;
        }}
        
        .card:hover {{
            transform: translateY(-2px);
        }}
        
        .card h3 {{
            color: var(--text-secondary);
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 10px;
        }}
        
        .card .value {{
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 5px;
        }}
        
        .card.total .value {{ color: var(--primary-color); }}
        .card.unused .value {{ color: var(--danger-color); }}
        .card.duplicate .value {{ color: var(--warning-color); }}
        .card.risk .value {{ color: var(--success-color); }}
        
        .collapsible-section {{
            margin-bottom: 30px;
        }}
        
        .section-header {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px;
            background: var(--dark-card);
            border-radius: var(--radius);
            cursor: pointer;
            border: 1px solid var(--dark-border);
            margin-bottom: 10px;
            transition: all 0.3s;
        }}
        
        .section-header:hover {{
            background: #2d3748;
        }}
        
        .section-header h2 {{
            font-size: 18px;
            display: flex;
            align-items: center;
            gap: 10px;
        }}
        
        .section-header .badge {{
            background: var(--primary-color);
            color: white;
            padding: 3px 10px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }}
        
        .section-content {{
            background: var(--dark-card);
            border-radius: var(--radius);
            padding: 20px;
            border: 1px solid var(--dark-border);
            display: none;
        }}
        
        .section-content.active {{
            display: block;
            animation: slideDown 0.3s ease;
        }}
        
        @keyframes slideDown {{
            from {{ opacity: 0; transform: translateY(-10px); }}
            to {{ opacity: 1; transform: translateY(0); }}
        }}
        
        .file-list {{
            list-style: none;
        }}
        
        .file-item {{
            padding: 12px 15px;
            border-bottom: 1px solid var(--dark-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: background 0.2s;
        }}
        
        .file-item:hover {{
            background: rgba(255, 255, 255, 0.05);
        }}
        
        .file-item:last-child {{
            border-bottom: none;
        }}
        
        .file-path {{
            font-family: 'Monaco', 'Courier New', monospace;
            font-size: 13px;
            color: var(--text-primary);
        }}
        
        .file-size {{
            color: var(--text-secondary);
            font-size: 12px;
        }}
        
        .risk-badge {{
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }}
        
        .risk-low {{ background: var(--success-color); color: white; }}
        .risk-medium {{ background: var(--warning-color); color: black; }}
        .risk-high {{ background: var(--danger-color); color: white; }}
        
        .chart-container {{
            width: 100%;
            height: 200px;
            margin: 20px 0;
            position: relative;
        }}
        
        .phase-timeline {{
            display: flex;
            flex-direction: column;
            gap: 15px;
        }}
        
        .phase-item {{
            display: flex;
            gap: 15px;
            padding: 15px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: var(--radius);
            border-left: 4px solid var(--primary-color);
        }}
        
        .phase-item.phase-2 {{ border-left-color: var(--secondary-color); }}
        .phase-item.phase-3 {{ border-left-color: var(--warning-color); }}
        .phase-item.phase-4 {{ border-left-color: var(--danger-color); }}
        
        .phase-number {{
            background: var(--primary-color);
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            flex-shrink: 0;
        }}
        
        .phase-2 .phase-number {{ background: var(--secondary-color); }}
        .phase-3 .phase-number {{ background: var(--warning-color); }}
        .phase-4 .phase-number {{ background: var(--danger-color); }}
        
        .phase-content h4 {{
            margin-bottom: 5px;
        }}
        
        .phase-content .time {{
            color: var(--text-secondary);
            font-size: 14px;
            margin-bottom: 10px;
        }}
        
        .phase-content ul {{
            padding-left: 20px;
            color: var(--text-secondary);
        }}
        
        .phase-content li {{
            margin-bottom: 5px;
            font-size: 14px;
        }}
        
        .table {{
            width: 100%;
            border-collapse: collapse;
        }}
        
        .table th {{
            text-align: left;
            padding: 12px 15px;
            background: rgba(255, 255, 255, 0.1);
            color: var(--text-secondary);
            font-weight: 600;
            font-size: 14px;
        }}
        
        .table td {{
            padding: 12px 15px;
            border-bottom: 1px solid var(--dark-border);
        }}
        
        .table tr:hover td {{
            background: rgba(255, 255, 255, 0.05);
        }}
        
        .recommendation {{
            padding: 15px;
            background: rgba(37, 99, 235, 0.1);
            border-left: 4px solid var(--primary-color);
            border-radius: var(--radius);
            margin: 10px 0;
        }}
        
        .footer {{
            text-align: center;
            padding: 30px 0;
            color: var(--text-secondary);
            font-size: 14px;
            border-top: 1px solid var(--dark-border);
            margin-top: 50px;
        }}
        
        .toggle-icon {{
            transition: transform 0.3s;
        }}
        
        .toggle-icon.rotated {{
            transform: rotate(180deg);
        }}
        
        @media (max-width: 768px) {{
            .summary-cards {{
                grid-template-columns: 1fr;
            }}
            
            .container {{
                padding: 10px;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Project Optimization Dashboard</h1>
            <div class="risk-badge risk-{report['risk_assessment']['overall_risk'].lower()}">
                {report['risk_assessment']['overall_risk']} Risk
            </div>
        </div>
        
        <!-- Summary Cards -->
        <div class="summary-cards">
            <div class="card total">
                <h3>Total Files</h3>
                <div class="value">{report['total_files']}</div>
                <div class="description">Across all directories</div>
            </div>
            
            <div class="card unused">
                <h3>Unused Files</h3>
                <div class="value">{len(report['unused_files'])}</div>
                <div class="description">Not imported anywhere</div>
            </div>
            
            <div class="card duplicate">
                <h3>Duplicate Groups</h3>
                <div class="value">{len(report['duplicate_files'])}</div>
                <div class="description">Identical content found</div>
            </div>
            
            <div class="card risk">
                <h3>Risk Score</h3>
                <div class="value">{report['risk_assessment']['risk_score']}/10</div>
                <div class="description">{report['risk_assessment']['overall_risk']} Risk</div>
            </div>
        </div>
        
        <!-- Risk Assessment Chart -->
        <div class="collapsible-section">
            <div class="section-header" onclick="toggleSection('risk-chart')">
                <h2>📊 Risk Assessment</h2>
                <span class="badge">Interactive</span>
            </div>
            <div id="risk-chart" class="section-content active">
                <div class="chart-container">
                    <canvas id="riskChart" width="400" height="200"></canvas>
                </div>
                <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-top: 20px;">
                    <div>
                        <div style="color: var(--success-color); font-weight: bold;">Low Risk</div>
                        <div>{report['risk_assessment']['low_risk_items']} items</div>
                    </div>
                    <div>
                        <div style="color: var(--warning-color); font-weight: bold;">Medium Risk</div>
                        <div>{report['risk_assessment']['medium_risk_items']} items</div>
                    </div>
                    <div>
                        <div style="color: var(--danger-color); font-weight: bold;">High Risk</div>
                        <div>{report['risk_assessment']['high_risk_items']} items</div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Unused Files -->
        <div class="collapsible-section">
            <div class="section-header" onclick="toggleSection('unused-files')">
                <h2>🗑️ Unused Files</h2>
                <span class="badge">{len(report['unused_files'])} files</span>
            </div>
            <div id="unused-files" class="section-content">
                <ul class="file-list">
                    {"".join([f'''
                    <li class="file-item">
                        <div>
                            <div class="file-path">{file['path']}</div>
                            <div class="file-size">{file['size']} bytes • {file['type']}</div>
                        </div>
                        <div class="risk-badge risk-low">Safe to remove</div>
                    </li>
                    ''' for file in report['unused_files'][:50]])}
                    
                    {f'<li class="file-item" style="justify-content: center; color: var(--text-secondary);">... and {len(report["unused_files"]) - 50} more files</li>' if len(report['unused_files']) > 50 else ''}
                </ul>
            </div>
        </div>
        
        <!-- Duplicate Files -->
        <div class="collapsible-section">
            <div class="section-header" onclick="toggleSection('duplicate-files')">
                <h2>📝 Duplicate Files</h2>
                <span class="badge">{len(report['duplicate_files'])} groups</span>
            </div>
            <div id="duplicate-files" class="section-content">
                {generate_duplicate_table(report['duplicate_files'])}
            </div>
        </div>
        
        <!-- Merge Recommendations -->
        <div class="collapsible-section">
            <div class="section-header" onclick="toggleSection('merge-recommendations')">
                <h2>🔄 Merge Recommendations</h2>
                <span class="badge">{len(report['merge_recommendations'])} suggestions</span>
            </div>
            <div id="merge-recommendations" class="section-content">
                {generate_merge_recommendations(report['merge_recommendations'])}
            </div>
        </div>
        
        <!-- Refactor Plan -->
        <div class="collapsible-section">
            <div class="section-header" onclick="toggleSection('refactor-plan')">
                <h2>🗺️ Refactoring Roadmap</h2>
                <span class="badge">4 Phases</span>
            </div>
            <div id="refactor-plan" class="section-content">
                <div class="phase-timeline">
                    {generate_phase_timeline(report['refactor_plan'])}
                </div>
            </div>
        </div>
        
        <!-- Architecture Analysis -->
        <div class="collapsible-section">
            <div class="section-header" onclick="toggleSection('architecture')">
                <h2>🏗️ Architecture Analysis</h2>
                <span class="badge">Patterns</span>
            </div>
            <div id="architecture" class="section-content">
                {generate_architecture_table(report['architecture_analysis'])}
            </div>
        </div>
        
        <div class="footer">
            Generated from {report['project_root']} • {report['scan_date']} • 
            <a href="#" style="color: var(--primary-color); text-decoration: none;" onclick="exportReport()">Export Report</a>
        </div>
    </div>
    
    <script>
        // Toggle section visibility
        function toggleSection(sectionId) {{
            const section = document.getElementById(sectionId);
            const header = section.previousElementSibling;
            const icon = header.querySelector('.toggle-icon');
            
            section.classList.toggle('active');
            
            if (icon) {{
                icon.classList.toggle('rotated');
            }}
        }}
        
        // Initialize all sections as collapsed except first
        document.addEventListener('DOMContentLoaded', function() {{
            const sections = document.querySelectorAll('.section-content');
            sections.forEach((section, index) => {{
                if (index !== 0) {{  // Keep first section open
                    section.classList.remove('active');
                }}
            }});
            
            // Initialize chart
            drawRiskChart();
        }});
        
        // Draw risk chart
        function drawRiskChart() {{
            const ctx = document.getElementById('riskChart').getContext('2d');
            
            // Simple bar chart without external library
            const data = {{
                low: {report['risk_assessment']['low_risk_items']},
                medium: {report['risk_assessment']['medium_risk_items']},
                high: {report['risk_assessment']['high_risk_items']}
            }};
            
            const colors = {{
                low: '#10b981',
                medium: '#f59e0b',
                high: '#ef4444'
            }};
            
            const canvas = ctx.canvas;
            const width = canvas.width;
            const height = canvas.height;
            const barWidth = 80;
            const spacing = 40;
            const maxValue = Math.max(data.low, data.medium, data.high);
            
            // Clear canvas
            ctx.clearRect(0, 0, width, height);
            
            // Draw bars
            Object.entries(data).forEach(([key, value], index) => {{
                const x = 50 + (index * (barWidth + spacing));
                const barHeight = (value / maxValue) * (height - 80);
                const y = height - 60 - barHeight;
                
                // Draw bar
                ctx.fillStyle = colors[key];
                ctx.fillRect(x, y, barWidth, barHeight);
                
                // Draw label
                ctx.fillStyle = '#f1f5f9';
                ctx.font = '14px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText(key.toUpperCase(), x + barWidth / 2, height - 30);
                
                // Draw value
                ctx.fillStyle = '#f1f5f9';
                ctx.fillText(value, x + barWidth / 2, y - 10);
            }});
        }}
        
        // Export report as JSON
        function exportReport() {{
            const dataStr = JSON.stringify({json.dumps(report, indent=2)}, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
            
            const exportFileDefaultName = 'project_analysis_report.json';
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
        }}
        
        // Add toggle icons to headers
        document.querySelectorAll('.section-header').forEach(header => {{
            const icon = document.createElement('span');
            icon.innerHTML = '▼';
            icon.className = 'toggle-icon';
            icon.style.marginLeft = '10px';
            header.appendChild(icon);
        }});
    </script>
</body>
</html>
"""
    
    # Helper functions for generating HTML content
    def generate_duplicate_table(duplicate_files):
        if not duplicate_files:
            return '<div style="color: var(--text-secondary); text-align: center; padding: 40px;">No duplicate files found 🎉</div>'
        
        table_rows = []
        for group in duplicate_files:
            files_html = '<br>'.join(group['files'])
            table_rows.append(f'''
            <tr>
                <td>{len(group['files'])} files</td>
                <td>{files_html}</td>
                <td><span class="risk-badge risk-medium">Merge recommended</span></td>
            </tr>
            ''')
        
        return f'''
        <table class="table">
            <thead>
                <tr>
                    <th>Count</th>
                    <th>Files</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                {''.join(table_rows)}
            </tbody>
        </table>
        '''
    
    def generate_merge_recommendations(recommendations):
        if not recommendations:
            return '<div style="color: var(--text-secondary); text-align: center; padding: 40px;">No merge recommendations</div>'
        
        rec_html = []
        for rec in recommendations:
            files_list = '<br>'.join([f'• {f}' for f in rec['files']])
            rec_html.append(f'''
            <div class="recommendation">
                <strong>Keep: {rec['best_version']}</strong><br>
                <div style="margin: 10px 0; color: var(--text-secondary); font-size: 14px;">
                    {files_list}
                </div>
                <div style="font-size: 14px;">📋 {rec['recommendation']}</div>
            </div>
            ''')
        
        return ''.join(rec_html)
    
    def generate_phase_timeline(phases):
        phase_html = []
        for phase in phases:
            actions_list = ''.join([f'<li>{action}</li>' for action in phase['actions']])
            phase_html.append(f'''
            <div class="phase-item phase-{phase['phase']}">
                <div class="phase-number">{phase['phase']}</div>
                <div class="phase-content">
                    <h4>{phase['name']}</h4>
                    <div class="time">⏱️ {phase['estimated_time']} • Risk: <span class="risk-badge risk-{phase['risk'].lower()}">{phase['risk']}</span></div>
                    <ul>{actions_list}</ul>
                </div>
            </div>
            ''')
        return ''.join(phase_html)
    
    def generate_architecture_table(architecture):
        rows = [
            ('Components', architecture.get('components', 0)),
            ('Services', architecture.get('services', 0)),
            ('Hooks', architecture.get('hooks', 0)),
            ('Contexts/Stores', architecture.get('contexts', 0)),
            ('Utility Files', architecture.get('utils', 0)),
        ]
        
        table_rows = []
        for name, count in rows:
            table_rows.append(f'''
            <tr>
                <td>{name}</td>
                <td>{count}</td>
                <td>{'✅' if count < 20 else '⚠️' if count < 50 else '❌'}</td>
            </tr>
            ''')
        
        # Add duplicate patterns
        for dup in architecture.get('duplicate_hooks', []):
            table_rows.append(f'''
            <tr style="background: rgba(245, 158, 11, 0.1);">
                <td colspan="3">
                    <strong>Duplicate Hook:</strong> {dup['pattern']}<br>
                    <small>{', '.join(dup['files'][:3])}{'...' if len(dup['files']) > 3 else ''}</small>
                </td>
            </tr>
            ''')
        
        return f'''
        <table class="table">
            <thead>
                <tr>
                    <th>Pattern</th>
                    <th>Count</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                {''.join(table_rows)}
            </tbody>
        </table>
        '''
    
    # Write HTML file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(dashboard)
    
    print(f"✓ Dashboard generated: {output_path}")
    return output_path

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        json_path = sys.argv[1]
    else:
        json_path = "analysis_report.json"
    
    if not Path(json_path).exists():
        print(f"Error: {json_path} not found. Run analyze_project.py first.")
        sys.exit(1)
    
    generate_dashboard(json_path)