#!/usr/bin/env python3
"""
G-Studio Component Analyzer & Optimizer
Identifies unused, unwired, and duplicate components with detailed reporting
"""

import os
import re
import json
import hashlib
import ast
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional, Any
from dataclasses import dataclass, field
from collections import defaultdict
from datetime import datetime
import statistics


@dataclass
class ComponentInfo:
    name: str
    file_path: str
    component_type: str  # 'function' | 'class' | 'arrow' | 'hook'
    line_number: int
    is_exported: bool
    is_default_export: bool
    props_interface: Optional[str] = None
    used_hooks: List[str] = field(default_factory=list)
    jsx_children: List[str] = field(default_factory=list)


@dataclass
class FileInfo:
    path: str
    full_path: Path
    file_type: str
    size: int
    lines: int
    imports: List[Dict[str, Any]]
    exports: List[str]
    default_export: Optional[str]
    functions: List[str]
    classes: List[str]
    components: List[ComponentInfo]
    hooks: List[str]
    complexity: int
    content_hash: str
    dependencies: Set[str] = field(default_factory=set)
    dependents: Set[str] = field(default_factory=set)
    last_modified: float = 0
    used_components: Set[str] = field(default_factory=set)
    used_hooks: Set[str] = field(default_factory=set)


@dataclass
class WiringIssue:
    component_name: str
    file_path: str
    issue_type: str  # 'unused' | 'unwired' | 'no_replacement' | 'orphan'
    severity: str  # 'high' | 'medium' | 'low'
    description: str
    suggestion: str
    related_files: List[str] = field(default_factory=list)


class ComponentAnalyzer:
    def __init__(self, project_root: str, reports_base: str = "reports"):
        self.root = Path(project_root).resolve()
        self.files: Dict[str, FileInfo] = {}
        self.all_components: Dict[str, List[ComponentInfo]] = defaultdict(list)
        self.all_hooks: Dict[str, List[str]] = defaultdict(list)
        self.component_usage: Dict[str, Set[str]] = defaultdict(set)
        self.hook_usage: Dict[str, Set[str]] = defaultdict(set)
        self.import_map: Dict[str, Set[str]] = defaultdict(set)
        self.reverse_import_map: Dict[str, Set[str]] = defaultdict(set)
        
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        self.report_dir = Path(reports_base) / timestamp
        self.report_dir.mkdir(parents=True, exist_ok=True)

    def run(self) -> Dict[str, Any]:
        print("🔍 Scanning project...")
        self._scan_project()
        print(f"✅ Found {len(self.files)} files")
        
        print("🔗 Building dependency graph...")
        self._build_dependency_graph()
        
        print("🧩 Analyzing components...")
        self._analyze_component_usage()
        
        print("📊 Generating report...")
        results = self._generate_analysis()
        
        report = self._create_report(results)
        self._save_json_report(report)
        self._generate_dashboard(report)
        
        return report

    def _scan_project(self):
        exclude_dirs = {
            'node_modules', '__pycache__', '.git', 'dist', 'build', 'coverage',
            '.next', '.nuxt', '.vite', '.cache', '.idea', '.vscode', '.turbo',
            'backups', 'backup', '.backup', '__archive__', '.codefixer_backups',
            'public', '.parcel-cache'
        }
        
        exclude_patterns = [
            r'\.backup', r'\.bak$', r'~$', r'\.swp$', r'backup_\d+',
            r'_backup', r'\.old$', r'\.orig$', r'\.test\.', r'\.spec\.',
            r'\.stories\.', r'\.d\.ts$'
        ]
        
        valid_extensions = {'.ts', '.tsx', '.js', '.jsx', '.mjs'}
        
        for root, dirs, files in os.walk(self.root):
            dirs[:] = [d for d in dirs if d not in exclude_dirs and not d.startswith('.')]
            
            for file in files:
                if file.startswith('.'):
                    continue
                    
                file_path = Path(root) / file
                
                if file_path.suffix not in valid_extensions:
                    continue
                
                if any(re.search(p, str(file_path)) for p in exclude_patterns):
                    continue
                
                rel_path = str(file_path.relative_to(self.root))
                
                try:
                    info = self._analyze_file(file_path, rel_path)
                    if info:
                        self.files[rel_path] = info
                except Exception as e:
                    print(f"⚠️ Error analyzing {rel_path}: {e}")

    def _analyze_file(self, path: Path, rel_path: str) -> Optional[FileInfo]:
        try:
            content = path.read_text(encoding='utf-8', errors='ignore')
        except Exception:
            return None
        
        if not content.strip():
            return None
        
        file_type = self._detect_file_type(path)
        imports = self._extract_imports(content)
        exports, default_export = self._extract_exports(content)
        functions = self._extract_functions(content)
        classes = self._extract_classes(content)
        components = self._extract_components(content, rel_path)
        hooks = self._extract_hooks(content)
        used_components = self._extract_used_components(content)
        used_hooks = self._extract_used_hooks(content)
        complexity = self._calculate_complexity(content)
        content_hash = hashlib.md5(content.encode()).hexdigest()
        
        for comp in components:
            self.all_components[comp.name].append(comp)
        
        for hook in hooks:
            self.all_hooks[hook].append(rel_path)
        
        return FileInfo(
            path=rel_path,
            full_path=path,
            file_type=file_type,
            size=len(content),
            lines=content.count('\n') + 1,
            imports=imports,
            exports=exports,
            default_export=default_export,
            functions=functions,
            classes=classes,
            components=components,
            hooks=hooks,
            complexity=complexity,
            content_hash=content_hash,
            last_modified=path.stat().st_mtime,
            used_components=used_components,
            used_hooks=used_hooks
        )

    def _detect_file_type(self, path: Path) -> str:
        ext = path.suffix.lower()
        type_map = {
            '.tsx': 'react-ts',
            '.jsx': 'react',
            '.ts': 'typescript',
            '.js': 'javascript',
            '.mjs': 'module'
        }
        return type_map.get(ext, 'unknown')

    def _extract_imports(self, content: str) -> List[Dict[str, Any]]:
        imports = []
        
        # ES6 imports
        pattern = r"import\s+(?:(\{[^}]+\})|(\*\s+as\s+\w+)|(\w+))?\s*,?\s*(?:(\{[^}]+\})|(\w+))?\s*from\s+['\"]([^'\"]+)['\"]"
        for match in re.finditer(pattern, content):
            named = match.group(1) or match.group(4)
            namespace = match.group(2)
            default = match.group(3) or match.group(5)
            source = match.group(6)
            
            import_info = {'source': source, 'named': [], 'default': None, 'namespace': None}
            
            if named:
                names = re.findall(r'(\w+)(?:\s+as\s+(\w+))?', named)
                import_info['named'] = [{'name': n[0], 'alias': n[1] or n[0]} for n in names]
            
            if default:
                import_info['default'] = default
            
            if namespace:
                ns_match = re.search(r'\*\s+as\s+(\w+)', namespace)
                if ns_match:
                    import_info['namespace'] = ns_match.group(1)
            
            imports.append(import_info)
        
        # require statements
        require_pattern = r"(?:const|let|var)\s+(?:(\{[^}]+\})|(\w+))\s*=\s*require\(['\"]([^'\"]+)['\"]\)"
        for match in re.finditer(require_pattern, content):
            destructured = match.group(1)
            name = match.group(2)
            source = match.group(3)
            
            import_info = {'source': source, 'named': [], 'default': None, 'namespace': None}
            
            if destructured:
                names = re.findall(r'(\w+)', destructured)
                import_info['named'] = [{'name': n, 'alias': n} for n in names]
            elif name:
                import_info['default'] = name
            
            imports.append(import_info)
        
        return imports

    def _extract_exports(self, content: str) -> Tuple[List[str], Optional[str]]:
        exports = []
        default_export = None
        
        # Named exports
        named_pattern = r"export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)"
        exports.extend(re.findall(named_pattern, content))
        
        # Export { ... }
        export_block_pattern = r"export\s*\{([^}]+)\}"
        for match in re.finditer(export_block_pattern, content):
            names = re.findall(r'(\w+)(?:\s+as\s+\w+)?', match.group(1))
            exports.extend(names)
        
        # Default export
        default_patterns = [
            r"export\s+default\s+(?:function|class)\s+(\w+)",
            r"export\s+default\s+(\w+)",
        ]
        for pattern in default_patterns:
            match = re.search(pattern, content)
            if match:
                default_export = match.group(1)
                break
        
        return list(set(exports)), default_export

    def _extract_functions(self, content: str) -> List[str]:
        functions = []
        
        patterns = [
            r"function\s+(\w+)\s*\(",
            r"const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>",
            r"const\s+(\w+)\s*=\s*(?:async\s*)?function",
        ]
        
        for pattern in patterns:
            functions.extend(re.findall(pattern, content))
        
        return list(set(functions))

    def _extract_classes(self, content: str) -> List[str]:
        return list(set(re.findall(r"class\s+(\w+)", content)))

    def _extract_components(self, content: str, file_path: str) -> List[ComponentInfo]:
        components = []
        lines = content.split('\n')
        
        # Function components (PascalCase)
        func_pattern = r"(?:export\s+)?(?:default\s+)?function\s+([A-Z]\w*)\s*\("
        for match in re.finditer(func_pattern, content):
            name = match.group(1)
            line_num = content[:match.start()].count('\n') + 1
            is_exported = 'export' in content[max(0, match.start()-20):match.start()+len(match.group())]
            is_default = 'default' in content[max(0, match.start()-20):match.start()+len(match.group())]
            
            components.append(ComponentInfo(
                name=name,
                file_path=file_path,
                component_type='function',
                line_number=line_num,
                is_exported=is_exported,
                is_default_export=is_default,
                used_hooks=self._find_hooks_in_component(content, match.start())
            ))
        
        # Arrow function components
        arrow_pattern = r"(?:export\s+)?(?:default\s+)?const\s+([A-Z]\w*)\s*(?::\s*(?:React\.)?FC[^=]*)?\s*=\s*(?:\([^)]*\)|[^=])\s*=>"
        for match in re.finditer(arrow_pattern, content):
            name = match.group(1)
            line_num = content[:match.start()].count('\n') + 1
            is_exported = 'export' in content[max(0, match.start()-20):match.start()+len(match.group())]
            is_default = 'default' in content[max(0, match.start()-20):match.start()+len(match.group())]
            
            if name not in [c.name for c in components]:
                components.append(ComponentInfo(
                    name=name,
                    file_path=file_path,
                    component_type='arrow',
                    line_number=line_num,
                    is_exported=is_exported,
                    is_default_export=is_default,
                    used_hooks=self._find_hooks_in_component(content, match.start())
                ))
        
        # Class components
        class_pattern = r"(?:export\s+)?(?:default\s+)?class\s+([A-Z]\w*)\s+extends\s+(?:React\.)?(?:Component|PureComponent)"
        for match in re.finditer(class_pattern, content):
            name = match.group(1)
            line_num = content[:match.start()].count('\n') + 1
            is_exported = 'export' in content[max(0, match.start()-20):match.start()+len(match.group())]
            is_default = 'default' in content[max(0, match.start()-20):match.start()+len(match.group())]
            
            components.append(ComponentInfo(
                name=name,
                file_path=file_path,
                component_type='class',
                line_number=line_num,
                is_exported=is_exported,
                is_default_export=is_default
            ))
        
        return components

    def _find_hooks_in_component(self, content: str, start_pos: int) -> List[str]:
        # Find the component body and extract hooks
        hooks = []
        hook_pattern = r'\b(use[A-Z]\w*)\s*\('
        
        # Simple extraction from nearby content
        end_pos = min(start_pos + 2000, len(content))
        component_content = content[start_pos:end_pos]
        hooks = list(set(re.findall(hook_pattern, component_content)))
        
        return hooks

    def _extract_hooks(self, content: str) -> List[str]:
        hooks = []
        
        # Custom hooks (useXxx = ...)
        hook_patterns = [
            r"(?:export\s+)?(?:const|function)\s+(use[A-Z]\w*)\s*(?:=|<|\()",
        ]
        
        for pattern in hook_patterns:
            hooks.extend(re.findall(pattern, content))
        
        return list(set(hooks))

    def _extract_used_components(self, content: str) -> Set[str]:
        used = set()
        
        # JSX usage: <ComponentName or <ComponentName>
        jsx_pattern = r"<([A-Z]\w*)(?:\s|>|/)"
        used.update(re.findall(jsx_pattern, content))
        
        # Direct references in code
        ref_pattern = r"(?:createElement|cloneElement)\s*\(\s*([A-Z]\w*)"
        used.update(re.findall(ref_pattern, content))
        
        return used

    def _extract_used_hooks(self, content: str) -> Set[str]:
        hook_pattern = r'\b(use[A-Z]\w*)\s*\('
        return set(re.findall(hook_pattern, content))

    def _calculate_complexity(self, content: str) -> int:
        complexity = 1
        
        patterns = [
            (r'\bif\s*\(', 1),
            (r'\belse\s+if\s*\(', 1),
            (r'\belse\b', 1),
            (r'\bfor\s*\(', 1),
            (r'\bwhile\s*\(', 1),
            (r'\bswitch\s*\(', 1),
            (r'\bcase\s+', 1),
            (r'\bcatch\s*\(', 1),
            (r'\?\s*[^:]+\s*:', 1),
            (r'&&', 1),
            (r'\|\|', 1),
            (r'\?\?', 1),
        ]
        
        for pattern, weight in patterns:
            complexity += len(re.findall(pattern, content)) * weight
        
        return complexity

    def _build_dependency_graph(self):
        path_variants = {}
        for rel_path in self.files:
            stem = Path(rel_path).stem
            parent = Path(rel_path).parent
            
            # Various import path formats
            path_variants[rel_path] = rel_path
            path_variants[str(parent / stem)] = rel_path
            path_variants['./' + str(parent / stem)] = rel_path
            
            if stem == 'index':
                path_variants[str(parent)] = rel_path
                path_variants['./' + str(parent)] = rel_path
        
        for file_path, file_info in self.files.items():
            file_dir = Path(file_path).parent
            
            for imp in file_info.imports:
                source = imp['source']
                
                # Skip external packages
                if not source.startswith('.') and not source.startswith('/'):
                    continue
                
                # Resolve relative path
                if source.startswith('.'):
                    resolved = (file_dir / source).as_posix()
                    resolved = os.path.normpath(resolved)
                else:
                    resolved = source
                
                # Find matching file
                target = None
                for variant, actual_path in path_variants.items():
                    if resolved == variant or resolved.endswith(variant):
                        target = actual_path
                        break
                
                # Try with extensions
                if not target:
                    for ext in ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js']:
                        check = resolved + ext
                        if check in path_variants:
                            target = path_variants[check]
                            break
                
                if target and target in self.files:
                    self.import_map[file_path].add(target)
                    self.reverse_import_map[target].add(file_path)
                    file_info.dependencies.add(target)
                    self.files[target].dependents.add(file_path)

    def _analyze_component_usage(self):
        # Track where each component is used
        for file_path, file_info in self.files.items():
            for comp_name in file_info.used_components:
                self.component_usage[comp_name].add(file_path)
            
            for hook_name in file_info.used_hooks:
                self.hook_usage[hook_name].add(file_path)

    def _generate_analysis(self) -> Dict[str, Any]:
        unused_components = []
        unwired_components = []
        duplicate_components = []
        orphan_files = []
        unused_hooks = []
        duplicate_hooks = []
        
        entry_patterns = ['index', 'main', 'app', 'App', 'entry', 'root']
        
        # Find unused components
        for comp_name, comp_list in self.all_components.items():
            usage_count = len(self.component_usage.get(comp_name, set()))
            
            for comp in comp_list:
                # Skip if it's in an entry file
                if any(p in comp.file_path.lower() for p in entry_patterns):
                    continue
                
                # Check if component is used anywhere except its own file
                usage_files = self.component_usage.get(comp_name, set())
                external_usage = usage_files - {comp.file_path}
                
                if not external_usage and comp.is_exported:
                    unused_components.append({
                        'name': comp_name,
                        'file': comp.file_path,
                        'line': comp.line_number,
                        'type': comp.component_type,
                        'is_default': comp.is_default_export,
                        'severity': 'high' if comp.is_exported else 'low',
                        'hooks_used': comp.used_hooks
                    })
        
        # Find unwired components (defined but not exported and not used)
        for comp_name, comp_list in self.all_components.items():
            for comp in comp_list:
                if not comp.is_exported:
                    usage_files = self.component_usage.get(comp_name, set())
                    if comp.file_path not in usage_files or len(usage_files) == 0:
                        unwired_components.append({
                            'name': comp_name,
                            'file': comp.file_path,
                            'line': comp.line_number,
                            'type': comp.component_type,
                            'reason': 'Not exported and not used internally'
                        })
        
        # Find duplicate components
        for comp_name, comp_list in self.all_components.items():
            if len(comp_list) > 1:
                duplicate_components.append({
                    'name': comp_name,
                    'count': len(comp_list),
                    'locations': [
                        {
                            'file': c.file_path,
                            'line': c.line_number,
                            'type': c.component_type,
                            'is_exported': c.is_exported
                        }
                        for c in comp_list
                    ]
                })
        
        # Find orphan files (no dependents)
        for file_path, file_info in self.files.items():
            if any(p in file_path.lower() for p in entry_patterns):
                continue
            
            if not file_info.dependents and (file_info.exports or file_info.default_export):
                orphan_files.append({
                    'path': file_path,
                    'type': file_info.file_type,
                    'size': file_info.size,
                    'lines': file_info.lines,
                    'exports': file_info.exports,
                    'default_export': file_info.default_export,
                    'components': [c.name for c in file_info.components],
                    'hooks': file_info.hooks
                })
        
        # Find unused hooks
        for hook_name, hook_files in self.all_hooks.items():
            usage_count = len(self.hook_usage.get(hook_name, set()))
            
            for hook_file in hook_files:
                usage_files = self.hook_usage.get(hook_name, set())
                external_usage = usage_files - {hook_file}
                
                if not external_usage:
                    unused_hooks.append({
                        'name': hook_name,
                        'file': hook_file,
                        'usage_count': usage_count
                    })
        
        # Find duplicate hooks
        for hook_name, hook_files in self.all_hooks.items():
            if len(hook_files) > 1:
                duplicate_hooks.append({
                    'name': hook_name,
                    'count': len(hook_files),
                    'files': hook_files
                })
        
        # Find duplicate files (same content)
        hash_map = defaultdict(list)
        for file_path, file_info in self.files.items():
            hash_map[file_info.content_hash].append(file_info)
        
        duplicate_files = []
        for content_hash, files in hash_map.items():
            if len(files) > 1:
                duplicate_files.append({
                    'hash': content_hash,
                    'count': len(files),
                    'files': [
                        {
                            'path': f.path,
                            'size': f.size,
                            'lines': f.lines
                        }
                        for f in files
                    ],
                    'potential_savings': (len(files) - 1) * files[0].size
                })
        
        # Calculate stats
        complexities = [f.complexity for f in self.files.values()]
        
        stats = {
            'total_files': len(self.files),
            'total_lines': sum(f.lines for f in self.files.values()),
            'total_size': sum(f.size for f in self.files.values()),
            'total_components': sum(len(c) for c in self.all_components.values()),
            'total_hooks': sum(len(h) for h in self.all_hooks.values()),
            'avg_complexity': round(statistics.mean(complexities), 1) if complexities else 0,
            'max_complexity': max(complexities) if complexities else 0,
            'file_types': self._count_file_types()
        }
        
        return {
            'unused_components': unused_components,
            'unwired_components': unwired_components,
            'duplicate_components': duplicate_components,
            'orphan_files': orphan_files,
            'unused_hooks': unused_hooks,
            'duplicate_hooks': duplicate_hooks,
            'duplicate_files': duplicate_files,
            'stats': stats
        }

    def _count_file_types(self) -> Dict[str, int]:
        types = defaultdict(int)
        for f in self.files.values():
            types[f.file_type] += 1
        return dict(types)

    def _create_report(self, results: Dict[str, Any]) -> Dict[str, Any]:
        recommendations = []
        
        if results['unused_components']:
            recommendations.append({
                'priority': 'high',
                'action': f"Review {len(results['unused_components'])} unused components for removal",
                'impact': 'Reduce bundle size and improve maintainability'
            })
        
        if results['unwired_components']:
            recommendations.append({
                'priority': 'medium',
                'action': f"Wire or remove {len(results['unwired_components'])} unwired components",
                'impact': 'Clean up dead code'
            })
        
        if results['duplicate_components']:
            recommendations.append({
                'priority': 'high',
                'action': f"Consolidate {len(results['duplicate_components'])} duplicate component definitions",
                'impact': 'Reduce confusion and maintenance burden'
            })
        
        if results['orphan_files']:
            recommendations.append({
                'priority': 'medium',
                'action': f"Review {len(results['orphan_files'])} orphan files",
                'impact': 'Identify dead code or missing imports'
            })
        
        if results['duplicate_files']:
            total_savings = sum(d['potential_savings'] for d in results['duplicate_files'])
            recommendations.append({
                'priority': 'low',
                'action': f"Merge {len(results['duplicate_files'])} duplicate file groups",
                'impact': f'Save {total_savings:,} bytes'
            })
        
        return {
            'timestamp': datetime.now().isoformat(),
            'project_root': str(self.root),
            'report_dir': str(self.report_dir),
            'summary': results['stats'],
            'unused_components': sorted(results['unused_components'], key=lambda x: x['severity'], reverse=True),
            'unwired_components': results['unwired_components'],
            'duplicate_components': sorted(results['duplicate_components'], key=lambda x: x['count'], reverse=True),
            'orphan_files': sorted(results['orphan_files'], key=lambda x: x['size'], reverse=True),
            'unused_hooks': results['unused_hooks'],
            'duplicate_hooks': sorted(results['duplicate_hooks'], key=lambda x: x['count'], reverse=True),
            'duplicate_files': sorted(results['duplicate_files'], key=lambda x: x['potential_savings'], reverse=True),
            'recommendations': recommendations
        }

    def _save_json_report(self, report: Dict[str, Any]):
        json_path = self.report_dir / 'component_analysis.json'
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False, default=str)
        print(f"✅ JSON report saved: {json_path}")

    def _generate_dashboard(self, report: Dict[str, Any]):
        html_path = self.report_dir / 'dashboard.html'
        
        html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Component Analysis Dashboard</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f172a; color: #e2e8f0; line-height: 1.5;
        }}
        .container {{ max-width: 1400px; margin: 0 auto; padding: 20px; }}
        
        .header {{
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            padding: 24px; border-radius: 12px; margin-bottom: 24px;
        }}
        .header h1 {{ font-size: 28px; font-weight: 700; margin-bottom: 8px; }}
        .header-meta {{ font-size: 14px; opacity: 0.9; }}
        
        .stats-grid {{
            display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 16px; margin-bottom: 24px;
        }}
        .stat-card {{
            background: #1e293b; padding: 16px; border-radius: 8px;
            border-left: 3px solid #6366f1;
        }}
        .stat-value {{ font-size: 32px; font-weight: 700; color: #60a5fa; }}
        .stat-label {{ font-size: 13px; color: #94a3b8; margin-top: 4px; }}
        
        .section {{
            background: #1e293b; border-radius: 8px; margin-bottom: 20px;
            overflow: hidden;
        }}
        .section-header {{
            padding: 16px 20px; border-bottom: 1px solid #334155;
            display: flex; justify-content: space-between; align-items: center;
        }}
        .section-title {{ font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px; }}
        .section-count {{ 
            background: #334155; padding: 4px 12px; border-radius: 12px;
            font-size: 13px; color: #94a3b8;
        }}
        .section-body {{ padding: 0; }}
        
        .item {{
            padding: 12px 20px; border-bottom: 1px solid #334155;
            display: flex; justify-content: space-between; align-items: flex-start;
            transition: background 0.15s;
        }}
        .item:hover {{ background: #334155; }}
        .item:last-child {{ border-bottom: none; }}
        
        .item-main {{ flex: 1; min-width: 0; }}
        .item-name {{ 
            font-family: 'Monaco', 'Menlo', monospace; font-size: 14px;
            color: #f1f5f9; font-weight: 500;
        }}
        .item-path {{
            font-size: 12px; color: #64748b; margin-top: 4px;
            white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
        }}
        .item-meta {{
            display: flex; gap: 8px; align-items: center; flex-shrink: 0; margin-left: 16px;
        }}
        
        .badge {{
            padding: 4px 10px; border-radius: 4px; font-size: 11px;
            font-weight: 600; text-transform: uppercase;
        }}
        .badge-danger {{ background: #dc2626; color: white; }}
        .badge-warning {{ background: #d97706; color: white; }}
        .badge-info {{ background: #2563eb; color: white; }}
        .badge-success {{ background: #059669; color: white; }}
        .badge-muted {{ background: #475569; color: #e2e8f0; }}
        
        .tag {{
            padding: 2px 8px; border-radius: 4px; font-size: 11px;
            background: #334155; color: #94a3b8;
        }}
        
        .recommendations {{
            background: linear-gradient(135deg, #065f46, #047857);
            border-radius: 8px; padding: 20px; margin-bottom: 24px;
        }}
        .recommendations h3 {{ margin-bottom: 12px; font-size: 16px; }}
        .rec-item {{
            padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.1);
            display: flex; align-items: flex-start; gap: 12px;
        }}
        .rec-item:last-child {{ border-bottom: none; }}
        .rec-priority {{
            padding: 2px 8px; border-radius: 4px; font-size: 10px;
            font-weight: 600; text-transform: uppercase; flex-shrink: 0;
        }}
        .rec-priority-high {{ background: #dc2626; }}
        .rec-priority-medium {{ background: #d97706; }}
        .rec-priority-low {{ background: #2563eb; }}
        
        .empty-state {{
            padding: 40px 20px; text-align: center; color: #64748b;
        }}
        
        .locations-list {{
            margin-top: 8px; padding-left: 16px;
        }}
        .locations-list li {{
            font-size: 12px; color: #64748b; margin: 4px 0;
            list-style: none;
        }}
        .locations-list li::before {{
            content: "→"; margin-right: 8px; color: #475569;
        }}
        
        .tabs {{
            display: flex; gap: 4px; padding: 12px 20px; background: #0f172a;
            border-bottom: 1px solid #334155; overflow-x: auto;
        }}
        .tab {{
            padding: 8px 16px; border-radius: 6px; font-size: 13px;
            cursor: pointer; transition: all 0.15s; white-space: nowrap;
            background: transparent; border: none; color: #94a3b8;
        }}
        .tab:hover {{ background: #334155; color: #e2e8f0; }}
        .tab.active {{ background: #6366f1; color: white; }}
        
        .tab-content {{ display: none; }}
        .tab-content.active {{ display: block; }}
        
        @media (max-width: 768px) {{
            .stats-grid {{ grid-template-columns: repeat(2, 1fr); }}
            .item {{ flex-direction: column; }}
            .item-meta {{ margin-left: 0; margin-top: 8px; }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Component Analysis Dashboard</h1>
            <div class="header-meta">
                <div>Project: {report['project_root']}</div>
                <div>Generated: {report['timestamp']}</div>
            </div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">{report['summary']['total_files']}</div>
                <div class="stat-label">Total Files</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{report['summary']['total_components']}</div>
                <div class="stat-label">Components</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{len(report['unused_components'])}</div>
                <div class="stat-label">Unused Components</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{len(report['duplicate_components'])}</div>
                <div class="stat-label">Duplicate Components</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{len(report['orphan_files'])}</div>
                <div class="stat-label">Orphan Files</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{len(report['unwired_components'])}</div>
                <div class="stat-label">Unwired Components</div>
            </div>
        </div>
        
        <div class="recommendations">
            <h3>🎯 Recommendations</h3>
            {self._render_recommendations(report['recommendations'])}
        </div>
        
        <div class="section">
            <div class="tabs">
                <button class="tab active" onclick="showTab('unused')">Unused ({len(report['unused_components'])})</button>
                <button class="tab" onclick="showTab('unwired')">Unwired ({len(report['unwired_components'])})</button>
                <button class="tab" onclick="showTab('duplicates')">Duplicates ({len(report['duplicate_components'])})</button>
                <button class="tab" onclick="showTab('orphans')">Orphan Files ({len(report['orphan_files'])})</button>
                <button class="tab" onclick="showTab('hooks')">Hooks ({len(report['unused_hooks']) + len(report['duplicate_hooks'])})</button>
                <button class="tab" onclick="showTab('files')">Duplicate Files ({len(report['duplicate_files'])})</button>
            </div>
            
            <div id="tab-unused" class="tab-content active">
                {self._render_unused_components(report['unused_components'])}
            </div>
            
            <div id="tab-unwired" class="tab-content">
                {self._render_unwired_components(report['unwired_components'])}
            </div>
            
            <div id="tab-duplicates" class="tab-content">
                {self._render_duplicate_components(report['duplicate_components'])}
            </div>
            
            <div id="tab-orphans" class="tab-content">
                {self._render_orphan_files(report['orphan_files'])}
            </div>
            
            <div id="tab-hooks" class="tab-content">
                {self._render_hooks(report['unused_hooks'], report['duplicate_hooks'])}
            </div>
            
            <div id="tab-files" class="tab-content">
                {self._render_duplicate_files(report['duplicate_files'])}
            </div>
        </div>
    </div>
    
    <script>
        function showTab(tabId) {{
            document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.tab').forEach(el => el.classList.remove('active'));
            document.getElementById('tab-' + tabId).classList.add('active');
            event.target.classList.add('active');
        }}
    </script>
</body>
</html>'''
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)
        
        print(f"✅ Dashboard created: {html_path}")

    def _render_recommendations(self, recommendations: List[Dict]) -> str:
        if not recommendations:
            return '<div class="empty-state">No recommendations</div>'
        
        html = ''
        for rec in recommendations:
            priority_class = f"rec-priority-{rec['priority']}"
            html += f'''
            <div class="rec-item">
                <span class="rec-priority {priority_class}">{rec['priority']}</span>
                <div>
                    <div>{rec['action']}</div>
                    <div style="font-size: 12px; opacity: 0.8; margin-top: 2px;">{rec['impact']}</div>
                </div>
            </div>'''
        return html

    def _render_unused_components(self, components: List[Dict]) -> str:
        if not components:
            return '<div class="empty-state">✅ No unused components found</div>'
        
        html = '<div class="section-body">'
        for comp in components[:50]:
            severity_class = 'badge-danger' if comp['severity'] == 'high' else 'badge-warning'
            html += f'''
            <div class="item">
                <div class="item-main">
                    <div class="item-name">{comp['name']}</div>
                    <div class="item-path">{comp['file']}:{comp['line']}</div>
                </div>
                <div class="item-meta">
                    <span class="tag">{comp['type']}</span>
                    {'<span class="tag">default</span>' if comp.get('is_default') else ''}
                    <span class="badge {severity_class}">Unused</span>
                </div>
            </div>'''
        
        if len(components) > 50:
            html += f'<div class="empty-state">... and {len(components) - 50} more</div>'
        
        html += '</div>'
        return html

    def _render_unwired_components(self, components: List[Dict]) -> str:
        if not components:
            return '<div class="empty-state">✅ No unwired components found</div>'
        
        html = '<div class="section-body">'
        for comp in components[:50]:
            html += f'''
            <div class="item">
                <div class="item-main">
                    <div class="item-name">{comp['name']}</div>
                    <div class="item-path">{comp['file']}:{comp['line']}</div>
                    <div style="font-size: 12px; color: #f59e0b; margin-top: 4px;">{comp['reason']}</div>
                </div>
                <div class="item-meta">
                    <span class="tag">{comp['type']}</span>
                    <span class="badge badge-warning">Unwired</span>
                </div>
            </div>'''
        
        if len(components) > 50:
            html += f'<div class="empty-state">... and {len(components) - 50} more</div>'
        
        html += '</div>'
        return html

    def _render_duplicate_components(self, components: List[Dict]) -> str:
        if not components:
            return '<div class="empty-state">✅ No duplicate components found</div>'
        
        html = '<div class="section-body">'
        for comp in components[:30]:
            locations_html = '<ul class="locations-list">'
            for loc in comp['locations'][:5]:
                locations_html += f'<li>{loc["file"]}:{loc["line"]} ({loc["type"]})</li>'
            if len(comp['locations']) > 5:
                locations_html += f'<li>... and {len(comp["locations"]) - 5} more</li>'
            locations_html += '</ul>'
            
            html += f'''
            <div class="item">
                <div class="item-main">
                    <div class="item-name">{comp['name']}</div>
                    {locations_html}
                </div>
                <div class="item-meta">
                    <span class="badge badge-info">{comp['count']} copies</span>
                </div>
            </div>'''
        
        html += '</div>'
        return html

    def _render_orphan_files(self, files: List[Dict]) -> str:
        if not files:
            return '<div class="empty-state">✅ No orphan files found</div>'
        
        html = '<div class="section-body">'
        for f in files[:50]:
            components = ', '.join(f['components'][:3]) if f['components'] else 'None'
            if len(f['components']) > 3:
                components += f' +{len(f["components"]) - 3}'
            
            html += f'''
            <div class="item">
                <div class="item-main">
                    <div class="item-name">{f['path']}</div>
                    <div class="item-path">
                        {f['lines']} lines • {f['size']:,} bytes • Components: {components}
                    </div>
                </div>
                <div class="item-meta">
                    <span class="tag">{f['type']}</span>
                    <span class="badge badge-muted">No imports</span>
                </div>
            </div>'''
        
        if len(files) > 50:
            html += f'<div class="empty-state">... and {len(files) - 50} more</div>'
        
        html += '</div>'
        return html

    def _render_hooks(self, unused: List[Dict], duplicates: List[Dict]) -> str:
        html = '<div class="section-body">'
        
        if duplicates:
            html += '<div style="padding: 12px 20px; background: #334155; font-weight: 600;">Duplicate Hooks</div>'
            for hook in duplicates[:20]:
                html += f'''
                <div class="item">
                    <div class="item-main">
                        <div class="item-name">{hook['name']}</div>
                        <div class="item-path">{', '.join(hook['files'][:3])}</div>
                    </div>
                    <div class="item-meta">
                        <span class="badge badge-info">{hook['count']} copies</span>
                    </div>
                </div>'''
        
        if unused:
            html += '<div style="padding: 12px 20px; background: #334155; font-weight: 600; margin-top: 1px;">Unused Hooks</div>'
            for hook in unused[:20]:
                html += f'''
                <div class="item">
                    <div class="item-main">
                        <div class="item-name">{hook['name']}</div>
                        <div class="item-path">{hook['file']}</div>
                    </div>
                    <div class="item-meta">
                        <span class="badge badge-warning">Unused</span>
                    </div>
                </div>'''
        
        if not unused and not duplicates:
            html = '<div class="empty-state">✅ No hook issues found</div>'
        
        html += '</div>'
        return html

    def _render_duplicate_files(self, files: List[Dict]) -> str:
        if not files:
            return '<div class="empty-state">✅ No duplicate files found</div>'
        
        html = '<div class="section-body">'
        for group in files[:20]:
            files_html = '<ul class="locations-list">'
            for f in group['files'][:5]:
                files_html += f'<li>{f["path"]} ({f["lines"]} lines)</li>'
            if len(group['files']) > 5:
                files_html += f'<li>... and {len(group["files"]) - 5} more</li>'
            files_html += '</ul>'
            
            html += f'''
            <div class="item">
                <div class="item-main">
                    <div class="item-name">{group['count']} identical files</div>
                    {files_html}
                </div>
                <div class="item-meta">
                    <span class="badge badge-success">Save {group['potential_savings']:,} bytes</span>
                </div>
            </div>'''
        
        html += '</div>'
        return html


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Component Analyzer - Find unused and unwired components")
    parser.add_argument('path', nargs='?', default='.', help='Project path')
    parser.add_argument('--reports', '-r', default='reports', help='Reports output directory')
    
    args = parser.parse_args()
    
    print("🏗️  G-Studio Component Analyzer")
    print("=" * 50)
    
    try:
        analyzer = ComponentAnalyzer(args.path, args.reports)
        report = analyzer.run()
        
        print("\n" + "=" * 50)
        print("📊 ANALYSIS SUMMARY")
        print("=" * 50)
        print(f"Total files: {report['summary']['total_files']}")
        print(f"Total components: {report['summary']['total_components']}")
        print(f"Unused components: {len(report['unused_components'])}")
        print(f"Unwired components: {len(report['unwired_components'])}")
        print(f"Duplicate components: {len(report['duplicate_components'])}")
        print(f"Orphan files: {len(report['orphan_files'])}")
        print(f"Duplicate files: {len(report['duplicate_files'])}")
        print("=" * 50)
        print(f"\n📂 Reports saved to: {report['report_dir']}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())