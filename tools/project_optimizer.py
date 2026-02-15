#!/usr/bin/env python3
import os
import json
import hashlib
import re
import ast
import sys
import shutil
from pathlib import Path
from typing import Dict, List, Set, Tuple, Any, Optional
from dataclasses import dataclass, field
from collections import defaultdict
from datetime import datetime
import statistics


@dataclass
class FileInfo:
    path: str
    full_path: Path
    type: str
    size: int
    lines: int
    imports: List[str]
    exports: List[str]
    functions: List[str]
    classes: List[str]
    components: List[str]
    hooks: List[str]
    complexity: int
    hash: str
    dependencies: Set[str] = field(default_factory=set)
    dependents: Set[str] = field(default_factory=set)
    last_modified: float = 0
    maintainability: float = 0


class ProjectOptimizer:
    def __init__(self, project_root: str, reports_base: str = "reports"):
        self.root = Path(project_root).resolve()
        self.files: Dict[str, FileInfo] = {}
        self.imports: Dict[str, Set[str]] = defaultdict(set)
        self.reverse_imports: Dict[str, Set[str]] = defaultdict(set)
        self.component_map: Dict[str, List[str]] = defaultdict(list)
        self.hook_map: Dict[str, List[str]] = defaultdict(list)
        
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        self.report_dir = Path(reports_base) / timestamp
        self.report_dir.mkdir(parents=True, exist_ok=True)
        
    def run(self):
        print("🔍 Analyzing project...")
        
        files = self._scan()
        print(f"✅ Scanned {len(files)} files")
        
        self._build_graph(files)
        
        results = {
            'unused': self._find_unused(),
            'duplicates': self._find_duplicates(),
            'duplicate_components': self._find_duplicate_components(),
            'duplicate_hooks': self._find_duplicate_hooks(),
            'similar': self._find_similar(),
            'stats': self._get_stats()
        }
        
        report = self._generate_report(results)
        self._save_report(report)
        self._generate_dashboard(report)
        
        return report
    
    def _scan(self) -> List[FileInfo]:
        all_files = []
        exclude_dirs = {
            'node_modules', '__pycache__', '.git', 'dist', 'build',
            '.next', '.nuxt', '.vite', '.cache', '.idea', '.vscode',
            'backups', 'backup', '.backup'
        }
        
        exclude_patterns = [
            r'\.backup$', r'\.bak$', r'~$', r'\.swp$',
            r'backup_\d+', r'_backup', r'\.old$'
        ]
        
        for root, dirs, files in os.walk(self.root):
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in exclude_dirs]
            
            for file in files:
                if file.startswith('.') or file.endswith(('.pyc', '.map')):
                    continue
                
                if any(re.search(pattern, file) for pattern in exclude_patterns):
                    continue
                    
                path = Path(root) / file
                rel_path = str(path.relative_to(self.root))
                
                try:
                    info = self._analyze_file(path, rel_path)
                    all_files.append(info)
                    self.files[rel_path] = info
                except Exception as e:
                    print(f"⚠️ Error analyzing {rel_path}: {e}")
        
        return all_files
    
    def _analyze_file(self, path: Path, rel_path: str) -> FileInfo:
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        file_type = self._detect_type(path)
        imports = self._extract_imports(content, file_type)
        exports = self._extract_exports(content, file_type)
        functions, classes = self._extract_definitions(content, file_type)
        components, hooks = self._extract_react(content, file_type)
        complexity = self._calculate_complexity(content)
        maintainability = self._calculate_maintainability(content, complexity)
        file_hash = hashlib.md5(content.encode()).hexdigest()
        
        return FileInfo(
            path=rel_path,
            full_path=path,
            type=file_type,
            size=len(content),
            lines=content.count('\n') + 1,
            imports=imports,
            exports=exports,
            functions=functions,
            classes=classes,
            components=components,
            hooks=hooks,
            complexity=complexity,
            hash=file_hash,
            last_modified=path.stat().st_mtime,
            maintainability=maintainability
        )
    
    def _detect_type(self, path: Path) -> str:
        ext = path.suffix.lower()
        types = {
            '.js': 'javascript', '.jsx': 'react', '.ts': 'typescript',
            '.tsx': 'react-ts', '.py': 'python', '.vue': 'vue',
            '.css': 'css', '.scss': 'scss', '.html': 'html', '.json': 'json'
        }
        return types.get(ext, 'other')
    
    def _extract_imports(self, content: str, file_type: str) -> List[str]:
        imports = []
        
        if file_type in ['javascript', 'react', 'typescript', 'react-ts']:
            patterns = [
                r'from\s+[\'"]([^"\']+)[\'"]',
                r'require\([\'"]([^"\']+)[\'"]\)',
                r'import\s+.*from\s+[\'"]([^"\']+)[\'"]'
            ]
            for pattern in patterns:
                imports.extend(re.findall(pattern, content))
        
        elif file_type == 'python':
            try:
                tree = ast.parse(content)
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            imports.append(alias.name)
                    elif isinstance(node, ast.ImportFrom):
                        if node.module:
                            imports.append(node.module)
            except:
                pass
        
        return list(set(imports))
    
    def _extract_exports(self, content: str, file_type: str) -> List[str]:
        exports = []
        
        if file_type in ['javascript', 'react', 'typescript', 'react-ts']:
            patterns = [
                r'export\s+(?:const|let|var|function|class|default)?\s*([A-Za-z_$][\w$]*)',
                r'export\s*\{([^}]+)\}'
            ]
            for pattern in patterns:
                matches = re.findall(pattern, content)
                for match in matches:
                    if isinstance(match, str):
                        if ',' in match:
                            exports.extend([e.strip() for e in match.split(',')])
                        else:
                            exports.append(match)
        
        return list(set(exports))
    
    def _extract_definitions(self, content: str, file_type: str) -> Tuple[List[str], List[str]]:
        functions, classes = [], []
        
        if file_type in ['javascript', 'react', 'typescript', 'react-ts']:
            functions = list(set(re.findall(r'(?:function|const|let|var)\s+([A-Z_a-z$][\w$]*)\s*(?:=|:|\()', content)))
            classes = list(set(re.findall(r'class\s+([A-Z][\w]*)', content)))
        
        elif file_type == 'python':
            try:
                tree = ast.parse(content)
                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef):
                        functions.append(node.name)
                    elif isinstance(node, ast.ClassDef):
                        classes.append(node.name)
            except:
                pass
        
        return functions, classes
    
    def _extract_react(self, content: str, file_type: str) -> Tuple[List[str], List[str]]:
        components, hooks = [], []
        
        if file_type in ['react', 'react-ts']:
            components = list(set(re.findall(r'(?:function|const)\s+([A-Z][\w]*)\s*[=:]?\s*(?:\(|React\.FC)', content)))
            hooks = list(set(re.findall(r'use([A-Z][\w]*)', content)))
        
        return components, hooks
    
    def _calculate_complexity(self, content: str) -> int:
        complexity = 1
        complexity += content.count('if ')
        complexity += content.count('else')
        complexity += content.count('for ')
        complexity += content.count('while ')
        complexity += content.count('&&')
        complexity += content.count('||')
        complexity += content.count('case ')
        complexity += content.count('catch')
        complexity += content.count('?')
        return complexity
    
    def _calculate_maintainability(self, content: str, complexity: int) -> float:
        lines = content.count('\n') + 1
        volume = len(content)
        
        if lines == 0:
            return 100
        
        effort = volume * complexity
        maintainability = max(0, min(100, 171 - 5.2 * (effort ** 0.23) - 0.23 * complexity - 16.2 * (lines ** 0.5)))
        return round(maintainability, 1)
    
    def _build_graph(self, files: List[FileInfo]):
        for file in files:
            for imp in file.imports:
                resolved = self._resolve_import(imp, file.path)
                if resolved and resolved in self.files:
                    self.imports[file.path].add(resolved)
                    self.reverse_imports[resolved].add(file.path)
                    file.dependencies.add(resolved)
                    self.files[resolved].dependents.add(file.path)
    
    def _resolve_import(self, imp: str, from_file: str) -> Optional[str]:
        if imp.startswith('.'):
            base_dir = Path(from_file).parent
            resolved = (base_dir / imp).resolve()
            
            for ext in ['', '.js', '.jsx', '.ts', '.tsx', '.py', '/index.js', '/index.tsx']:
                check_path = str(resolved.with_suffix('')) + ext
                rel_path = str(Path(check_path).relative_to(self.root))
                if rel_path in self.files:
                    return rel_path
        return None
    
    def _find_unused(self) -> List[FileInfo]:
        unused = []
        entry_patterns = ['index', 'main', 'app', '__init__', 'setup']
        
        for file_path, file_info in self.files.items():
            if any(pattern in file_path.lower() for pattern in entry_patterns):
                continue
            
            if len(file_info.dependents) == 0 and len(file_info.exports) > 0:
                unused.append(file_info)
        
        return sorted(unused, key=lambda f: f.size, reverse=True)
    
    def _find_duplicates(self) -> List[List[FileInfo]]:
        hash_map = defaultdict(list)
        for file_info in self.files.values():
            hash_map[file_info.hash].append(file_info)
        
        return [files for files in hash_map.values() if len(files) > 1]
    
    def _find_duplicate_components(self) -> List[Dict]:
        component_locations = defaultdict(list)
        for file_path, file_info in self.files.items():
            for comp in file_info.components:
                component_locations[comp].append(file_path)
        
        duplicates = []
        for comp_name, locations in component_locations.items():
            if len(locations) > 1:
                duplicates.append({
                    'name': comp_name,
                    'count': len(locations),
                    'locations': locations
                })
        
        return sorted(duplicates, key=lambda x: x['count'], reverse=True)
    
    def _find_duplicate_hooks(self) -> List[Dict]:
        hook_locations = defaultdict(list)
        for file_path, file_info in self.files.items():
            for hook in file_info.hooks:
                hook_locations[hook].append(file_path)
        
        duplicates = []
        for hook_name, locations in hook_locations.items():
            if len(locations) > 1:
                duplicates.append({
                    'name': f'use{hook_name}',
                    'count': len(locations),
                    'locations': locations
                })
        
        return sorted(duplicates, key=lambda x: x['count'], reverse=True)
    
    def _find_similar(self) -> List[List[FileInfo]]:
        name_groups = defaultdict(list)
        for file_info in self.files.values():
            name = Path(file_info.path).stem
            if not any(x in name.lower() for x in ['test', 'spec', 'index']):
                name_groups[name].append(file_info)
        
        return [files for files in name_groups.values() if len(files) > 1]
    
    def _get_stats(self) -> Dict:
        complexities = [f.complexity for f in self.files.values()]
        maintainabilities = [f.maintainability for f in self.files.values()]
        
        return {
            'total_files': len(self.files),
            'total_lines': sum(f.lines for f in self.files.values()),
            'total_size': sum(f.size for f in self.files.values()),
            'avg_complexity': round(statistics.mean(complexities), 1) if complexities else 0,
            'max_complexity': max(complexities) if complexities else 0,
            'avg_maintainability': round(statistics.mean(maintainabilities), 1) if maintainabilities else 0,
            'orphaned_files': sum(1 for f in self.files.values() if len(f.dependents) == 0),
            'highly_connected': sum(1 for f in self.files.values() if len(f.dependents) > 10)
        }
    
    def _generate_report(self, results: Dict) -> Dict:
        return {
            'timestamp': datetime.now().isoformat(),
            'project_root': str(self.root),
            'summary': results['stats'],
            'unused_files': [
                {
                    'path': f.path,
                    'type': f.type,
                    'size': f.size,
                    'lines': f.lines,
                    'complexity': f.complexity,
                    'exports': f.exports
                }
                for f in results['unused']
            ],
            'duplicate_files': [
                {
                    'hash': group[0].hash,
                    'count': len(group),
                    'files': [
                        {'path': f.path, 'size': f.size, 'lines': f.lines}
                        for f in group
                    ],
                    'savings_potential': (len(group) - 1) * group[0].size
                }
                for group in results['duplicates']
            ],
            'duplicate_components': results['duplicate_components'],
            'duplicate_hooks': results['duplicate_hooks'],
            'similar_files': [
                {
                    'name': Path(group[0].path).stem,
                    'count': len(group),
                    'files': [
                        {
                            'path': f.path,
                            'directory': str(Path(f.path).parent),
                            'lines': f.lines,
                            'complexity': f.complexity
                        }
                        for f in group
                    ]
                }
                for group in results['similar']
            ],
            'recommendations': self._generate_recommendations(results)
        }
    
    def _generate_recommendations(self, results: Dict) -> List[str]:
        recs = []
        
        if results['unused']:
            recs.append(f"Remove {len(results['unused'])} unused files")
        
        if results['duplicates']:
            savings = sum((len(g) - 1) * g[0].size for g in results['duplicates'])
            recs.append(f"Merge {len(results['duplicates'])} duplicate groups (save {savings:,} bytes)")
        
        if results['duplicate_components']:
            recs.append(f"Consolidate {len(results['duplicate_components'])} duplicate components")
        
        if results['duplicate_hooks']:
            recs.append(f"Merge {len(results['duplicate_hooks'])} duplicate hooks")
        
        return recs
    
    def _save_report(self, report: Dict):
        json_path = self.report_dir / 'analysis_report.json'
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        print(f"✅ Report saved: {json_path}")
    
    def _generate_dashboard(self, report: Dict):
        html_path = self.report_dir / 'dashboard.html'
        
        html = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Project Analysis Dashboard</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
            color: #f1f5f9; padding: 20px;
        }}
        .container {{ max-width: 1400px; margin: 0 auto; }}
        .header {{ 
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            padding: 30px; border-radius: 12px; margin-bottom: 30px;
        }}
        .header h1 {{ font-size: 32px; margin-bottom: 10px; }}
        .header p {{ opacity: 0.9; }}
        .stats-grid {{ 
            display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px; margin-bottom: 30px;
        }}
        .stat-card {{ 
            background: #1e293b; padding: 20px; border-radius: 8px;
            border-left: 4px solid #6366f1;
        }}
        .stat-value {{ font-size: 36px; font-weight: bold; color: #60a5fa; }}
        .stat-label {{ color: #94a3b8; margin-top: 5px; }}
        .section {{ background: #1e293b; padding: 25px; border-radius: 8px; margin-bottom: 20px; }}
        .section h2 {{ margin-bottom: 20px; color: #60a5fa; }}
        .file-list {{ list-style: none; }}
        .file-item {{ 
            padding: 15px; margin-bottom: 10px; background: #0f172a;
            border-radius: 6px; display: flex; justify-content: space-between;
            align-items: center; transition: all 0.2s;
        }}
        .file-item:hover {{ background: #1e293b; transform: translateX(5px); }}
        .file-path {{ font-family: 'Monaco', monospace; color: #f1f5f9; }}
        .file-meta {{ display: flex; gap: 15px; color: #94a3b8; font-size: 13px; }}
        .badge {{ 
            padding: 4px 12px; border-radius: 4px; font-size: 12px; font-weight: 600;
        }}
        .badge-danger {{ background: #ef4444; color: white; }}
        .badge-warning {{ background: #f59e0b; color: white; }}
        .badge-info {{ background: #3b82f6; color: white; }}
        .recommendations {{ 
            background: #065f46; border-left: 4px solid #10b981;
            padding: 20px; border-radius: 8px;
        }}
        .recommendations ul {{ margin-left: 20px; margin-top: 10px; }}
        .recommendations li {{ margin: 8px 0; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Project Optimization Dashboard</h1>
            <p>{report['project_root']}</p>
            <p>Generated: {report['timestamp']}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">{report['summary']['total_files']}</div>
                <div class="stat-label">Total Files</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{len(report['unused_files'])}</div>
                <div class="stat-label">Unused Files</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{len(report['duplicate_files'])}</div>
                <div class="stat-label">Duplicate Groups</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{len(report['duplicate_components'])}</div>
                <div class="stat-label">Duplicate Components</div>
            </div>
        </div>
        
        <div class="section recommendations">
            <h2>🎯 Recommendations</h2>
            <ul>
                {"".join(f"<li>{rec}</li>" for rec in report['recommendations'])}
            </ul>
        </div>
        
        <div class="section">
            <h2>🗑️ Unused Files ({len(report['unused_files'])})</h2>
            <ul class="file-list">
                {"".join(f'''
                <li class="file-item">
                    <div class="file-path">{f['path']}</div>
                    <div class="file-meta">
                        <span>{f['lines']} lines</span>
                        <span>{f['size']:,} bytes</span>
                        <span class="badge badge-danger">Can Remove</span>
                    </div>
                </li>
                ''' for f in report['unused_files'][:20])}
            </ul>
        </div>
        
        <div class="section">
            <h2>📝 Duplicate Files ({len(report['duplicate_files'])})</h2>
            <ul class="file-list">
                {"".join(f'''
                <li class="file-item">
                    <div>
                        <div class="file-path">{g['count']} identical files</div>
                        <div class="file-meta" style="margin-top: 8px;">
                            {"<br>".join(f"• " + f['path'] for f in g['files'][:3])}
                        </div>
                    </div>
                    <div class="file-meta">
                        <span class="badge badge-warning">Save {g['savings_potential']:,} bytes</span>
                    </div>
                </li>
                ''' for g in report['duplicate_files'][:10])}
            </ul>
        </div>
        
        <div class="section">
            <h2>⚛️ Duplicate Components ({len(report['duplicate_components'])})</h2>
            <ul class="file-list">
                {"".join(f'''
                <li class="file-item">
                    <div>
                        <div class="file-path">{comp['name']}</div>
                        <div class="file-meta" style="margin-top: 8px; font-size: 11px;">
                            {"<br>".join(f"• " + loc for loc in comp['locations'][:3])}
                        </div>
                    </div>
                    <div class="file-meta">
                        <span class="badge badge-info">{comp['count']} copies</span>
                    </div>
                </li>
                ''' for comp in report['duplicate_components'][:15])}
            </ul>
        </div>
        
        <div class="section">
            <h2>🪝 Duplicate Hooks ({len(report['duplicate_hooks'])})</h2>
            <ul class="file-list">
                {"".join(f'''
                <li class="file-item">
                    <div>
                        <div class="file-path">{hook['name']}</div>
                        <div class="file-meta" style="margin-top: 8px; font-size: 11px;">
                            {"<br>".join(f"• " + loc for loc in hook['locations'][:3])}
                        </div>
                    </div>
                    <div class="file-meta">
                        <span class="badge badge-info">{hook['count']} copies</span>
                    </div>
                </li>
                ''' for hook in report['duplicate_hooks'][:15])}
            </ul>
        </div>
    </div>
</body>
</html>'''
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)
        
        print(f"✅ Dashboard created: {html_path}")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Project Optimizer - Find unused and duplicate code")
    parser.add_argument('path', nargs='?', default='.', help='Project path')
    parser.add_argument('--reports', default='reports', help='Reports base directory')
    
    args = parser.parse_args()
    
    try:
        optimizer = ProjectOptimizer(args.path, args.reports)
        report = optimizer.run()
        
        print("\n" + "="*60)
        print("📊 OPTIMIZATION SUMMARY")
        print("="*60)
        print(f"Total files: {report['summary']['total_files']}")
        print(f"Unused files: {len(report['unused_files'])}")
        print(f"Duplicate groups: {len(report['duplicate_files'])}")
        print(f"Duplicate components: {len(report['duplicate_components'])}")
        print(f"Duplicate hooks: {len(report['duplicate_hooks'])}")
        print("="*60)
        print(f"\n📂 Reports saved to: {optimizer.report_dir}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
