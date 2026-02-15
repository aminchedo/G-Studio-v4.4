#!/usr/bin/env python3
"""
G-Studio Advanced Architecture Analyzer
Production-ready codebase analysis with interactive menu and rich HTML reporting
"""

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


class ProjectAnalyzer:
    def __init__(self, project_root: str, reports_base: str = "reports"):
        self.root = Path(project_root).resolve()
        self.files: Dict[str, FileInfo] = {}
        self.imports: Dict[str, Set[str]] = defaultdict(set)
        self.reverse_imports: Dict[str, Set[str]] = defaultdict(set)
        self.component_map: Dict[str, List[str]] = defaultdict(list)
        self.hook_map: Dict[str, List[str]] = defaultdict(list)
        
        # Centralized reports with date-time stamp
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        self.report_dir = Path(reports_base) / timestamp
        self.report_dir.mkdir(parents=True, exist_ok=True)
        
        self.exclude_dirs = {
            'node_modules', '__pycache__', '.git', 'dist', 'build',
            '.next', '.nuxt', '.vite', '.cache', '.idea', '.vscode',
            'backups', 'backup', '.backup', 'reports'
        }
        
        self.exclude_patterns = [
            r'\.backup$', r'\.bak$', r'~$', r'\.swp$',
            r'backup_\d+', r'_backup', r'\.old$'
        ]
    
    def show_menu(self):
        """Enhanced interactive menu with modern design"""
        while True:
            self._clear_screen()
            self._print_header()
            
            print("\n📁 Project:", str(self.root))
            print("📂 Reports:", str(self.report_dir))
            print()
            
            menu_items = [
                ("1", "🔍", "Full Analysis", "Complete project scan with all reports"),
                ("2", "🗑️", "Find Unused Files", "Identify dead code and unused modules"),
                ("3", "📝", "Find Duplicates", "Detect duplicate files and code"),
                ("4", "⚛️", "React Analysis", "Find duplicate components & hooks"),
                ("5", "🔧", "Architecture Issues", "Identify structural problems"),
                ("6", "🔌", "Unwired Components", "Find components not imported anywhere"),
                ("7", "📊", "Project Statistics", "View metrics and complexity"),
                ("8", "🎯", "Refactoring Plan", "Generate step-by-step roadmap"),
                ("9", "📈", "HTML Dashboard", "Generate interactive visual report"),
                ("0", "🚪", "Exit", "Close analyzer"),
            ]
            
            self._print_menu(menu_items)
            
            choice = input("\n💡 Select option: ").strip()
            
            if choice == '1':
                self.run_full_analysis()
            elif choice == '2':
                self.find_unused_files()
            elif choice == '3':
                self.find_duplicate_files()
            elif choice == '4':
                self.find_duplicate_components()
            elif choice == '5':
                self.analyze_architecture()
            elif choice == '6':
                self.find_unwired_components()
            elif choice == '7':
                self.show_statistics()
            elif choice == '8':
                self.generate_refactor_plan()
            elif choice == '9':
                self.export_dashboard()
            elif choice == '0':
                print("\n👋 Analysis complete! Reports saved to:", self.report_dir)
                break
            else:
                print("\n❌ Invalid option!")
                input("Press Enter to continue...")
    
    def _print_header(self):
        """Print attractive header"""
        print("╔" + "═" * 68 + "╗")
        print("║" + " " * 15 + "🏗️  G-STUDIO ARCHITECTURE ANALYZER" + " " * 19 + "║")
        print("║" + " " * 15 + "Advanced Code Analysis & Optimization" + " " * 16 + "║")
        print("╚" + "═" * 68 + "╝")
    
    def _print_menu(self, items: List[Tuple]):
        """Print formatted menu"""
        print("┌" + "─" * 68 + "┐")
        for key, icon, title, desc in items:
            print(f"│  [{key}] {icon}  {title:<25} {desc:<30} │")
        print("└" + "─" * 68 + "┘")
    
    def _clear_screen(self):
        os.system('cls' if os.name == 'nt' else 'clear')
    
    def run_full_analysis(self):
        """Complete project analysis with all features"""
        print("\n" + "=" * 70)
        print("🔍 STARTING COMPREHENSIVE ANALYSIS")
        print("=" * 70)
        
        print("\n[1/6] 📂 Scanning project files...")
        files = self._scan()
        print(f"      ✅ Scanned {len(files)} files")
        
        print("\n[2/6] 🔗 Building dependency graph...")
        self._build_graph(files)
        print("      ✅ Dependency graph complete")
        
        print("\n[3/6] 🔍 Analyzing code patterns...")
        results = {
            'unused': self._find_unused(),
            'duplicates': self._find_duplicates(),
            'duplicate_components': self._find_duplicate_components(),
            'duplicate_hooks': self._find_duplicate_hooks(),
            'similar': self._find_similar(),
            'architecture': self._analyze_architecture_issues(),
            'unwired': self._find_unwired_components(),
            'stats': self._get_stats()
        }
        print("      ✅ Pattern analysis complete")
        
        print("\n[4/6] 📝 Generating reports...")
        report = self._generate_report(results)
        self._save_report(report)
        print(f"      ✅ JSON report saved")
        
        print("\n[5/6] 🎨 Creating HTML dashboard...")
        self._generate_modern_dashboard(report)
        print(f"      ✅ Dashboard created")
        
        print("\n[6/6] 📊 Generating summary...")
        self._display_summary(report)
        
        print("\n" + "=" * 70)
        print("✅ ANALYSIS COMPLETE")
        print("=" * 70)
        print(f"\n📂 All reports saved to: {self.report_dir}")
        print(f"   • JSON Report:  {self.report_dir / 'analysis_report.json'}")
        print(f"   • HTML Dashboard: {self.report_dir / 'dashboard.html'}")
        
        input("\n Press Enter to continue...")
    
    def find_unused_files(self):
        """Find unused files with detailed analysis"""
        print("\n🔍 Analyzing unused files...")
        files = self._scan()
        self._build_graph(files)
        unused = self._find_unused()
        
        print(f"\n📊 Found {len(unused)} unused files")
        print("=" * 70)
        
        # Categorize by risk
        safe_to_remove = [f for f in unused if f['potential_value']['score'] < 30]
        review_first = [f for f in unused if 30 <= f['potential_value']['score'] < 60]
        keep_or_refactor = [f for f in unused if f['potential_value']['score'] >= 60]
        
        print(f"\n🟢 Safe to Remove ({len(safe_to_remove)} files):")
        for file in safe_to_remove[:10]:
            print(f"   • {file['path']}")
            print(f"     {file['lines']} lines | {file['size']} bytes")
        
        print(f"\n🟡 Review First ({len(review_first)} files):")
        for file in review_first[:10]:
            print(f"   • {file['path']}")
            print(f"     {file['potential_value']['recommendation']}")
        
        print(f"\n🔴 Keep or Refactor ({len(keep_or_refactor)} files):")
        for file in keep_or_refactor[:10]:
            print(f"   • {file['path']}")
            print(f"     Reasons: {', '.join(file['potential_value']['reasons'])}")
        
        # Save detailed report
        self._save_unused_report(unused)
        print(f"\n📄 Detailed report: {self.report_dir / 'unused_files.html'}")
        
        input("\nPress Enter to continue...")
    
    def find_unwired_components(self):
        """Find components that are not imported anywhere"""
        print("\n🔍 Scanning for unwired components...")
        files = self._scan()
        self._build_graph(files)
        unwired = self._find_unwired_components()
        
        print(f"\n📊 Found {len(unwired)} unwired components")
        print("=" * 70)
        
        for comp in unwired[:20]:
            print(f"\n⚛️  {comp['component']}")
            print(f"   File: {comp['file']}")
            print(f"   Reason: {comp['reason']}")
        
        if len(unwired) > 20:
            print(f"\n... and {len(unwired) - 20} more")
        
        self._save_unwired_report(unwired)
        print(f"\n📄 Detailed report: {self.report_dir / 'unwired_components.html'}")
        
        input("\nPress Enter to continue...")
    
    # [Previous scanning and analysis methods remain the same]
    def _scan(self) -> List[FileInfo]:
        """Scan project files"""
        all_files = []
        
        for root, dirs, files in os.walk(self.root):
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in self.exclude_dirs]
            
            for file in files:
                if file.startswith('.') or file.endswith(('.pyc', '.map')):
                    continue
                
                if any(re.search(pattern, file) for pattern in self.exclude_patterns):
                    continue
                    
                path = Path(root) / file
                rel_path = str(path.relative_to(self.root))
                
                try:
                    info = self._analyze_file(path, rel_path)
                    all_files.append(info)
                    self.files[rel_path] = info
                except Exception as e:
                    pass
        
        return all_files
    
    def _analyze_file(self, path: Path, rel_path: str) -> FileInfo:
        """Analyze single file"""
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
        
        for path, info in self.files.items():
            for comp in info.components:
                self.component_map[comp].append(path)
            for hook in info.hooks:
                self.hook_map[hook].append(path)
    
    def _resolve_import(self, imp: str, from_file: str) -> Optional[str]:
        if imp.startswith('.'):
            base_dir = Path(from_file).parent
            resolved = (base_dir / imp).resolve()
            
            for ext in ['', '.js', '.jsx', '.ts', '.tsx', '.py', '/index.js', '/index.tsx']:
                check_path = str(resolved.with_suffix('')) + ext
                try:
                    rel_path = str(Path(check_path).relative_to(self.root))
                    if rel_path in self.files:
                        return rel_path
                except:
                    pass
        return None
    
    def _find_unused(self) -> List[Dict]:
        unused = []
        entry_patterns = ['index', 'main', 'app', '__init__', 'setup']
        
        for file_path, file_info in self.files.items():
            if any(pattern in file_path.lower() for pattern in entry_patterns):
                continue
            
            if len(file_info.dependents) == 0 and len(file_info.exports) > 0:
                potential = self._assess_potential_value(file_info)
                unused.append({
                    'path': file_info.path,
                    'type': file_info.type,
                    'size': file_info.size,
                    'lines': file_info.lines,
                    'complexity': file_info.complexity,
                    'exports': file_info.exports,
                    'components': file_info.components,
                    'hooks': file_info.hooks,
                    'potential_value': potential
                })
        
        return sorted(unused, key=lambda f: f['potential_value']['score'])
    
    def _assess_potential_value(self, file_info: FileInfo) -> Dict:
        score = 0
        reasons = []
        
        if len(file_info.components) > 0:
            score += 30
            reasons.append("Contains components")
        
        if len(file_info.hooks) > 0:
            score += 25
            reasons.append("Contains custom hooks")
        
        if len(file_info.exports) > 3:
            score += 20
            reasons.append("Multiple exports")
        
        if file_info.complexity > 50:
            score += 15
            reasons.append("High complexity")
        
        if file_info.lines > 100:
            score += 10
            reasons.append("Substantial code")
        
        if score < 30:
            recommendation = "Safe to remove"
        elif score < 60:
            recommendation = "Review before removing"
        else:
            recommendation = "Keep or refactor"
        
        return {
            'score': score,
            'reasons': reasons,
            'recommendation': recommendation
        }
    
    def _find_duplicates(self) -> List[Dict]:
        hash_map = defaultdict(list)
        for file_info in self.files.values():
            hash_map[file_info.hash].append(file_info)
        
        duplicates = []
        for group_id, files in enumerate(hash_map.values()):
            if len(files) > 1:
                duplicates.append({
                    'group_id': group_id,
                    'hash': files[0].hash,
                    'count': len(files),
                    'files': [
                        {
                            'path': f.path,
                            'size': f.size,
                            'lines': f.lines,
                            'dependents': len(f.dependents)
                        }
                        for f in files
                    ],
                    'savings_potential': (len(files) - 1) * files[0].size
                })
        
        return sorted(duplicates, key=lambda x: x['savings_potential'], reverse=True)
    
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
    
    def _find_similar(self) -> List[Dict]:
        name_groups = defaultdict(list)
        for file_info in self.files.values():
            name = Path(file_info.path).stem
            if not any(x in name.lower() for x in ['test', 'spec', 'index']):
                name_groups[name].append(file_info)
        
        similar = []
        for name, files in name_groups.items():
            if len(files) > 1:
                dirs = set(Path(f.path).parent for f in files)
                if len(dirs) > 1:
                    similar.append({
                        'name': name,
                        'files': [
                            {
                                'path': f.path,
                                'directory': str(Path(f.path).parent),
                                'lines': f.lines,
                                'complexity': f.complexity,
                                'maintainability': f.maintainability
                            }
                            for f in files
                        ]
                    })
        
        return similar
    
    def _analyze_architecture_issues(self) -> Dict:
        issues = {
            'duplicate_components': [],
            'duplicate_hooks': [],
            'unwired_services': [],
            'dead_utilities': [],
            'multiple_layouts': []
        }
        
        for comp, paths in self.component_map.items():
            if len(paths) > 1:
                issues['duplicate_components'].append({
                    'component': comp,
                    'count': len(paths),
                    'files': paths
                })
        
        for hook, paths in self.hook_map.items():
            if len(paths) > 1:
                issues['duplicate_hooks'].append({
                    'hook': f'use{hook}',
                    'count': len(paths),
                    'files': paths
                })
        
        for path, info in self.files.items():
            if ('service' in path.lower() or 'api' in path.lower()) and not info.dependents:
                issues['unwired_services'].append({
                    'service': path,
                    'exports': info.exports,
                    'functions': info.functions
                })
        
        for path, info in self.files.items():
            if ('util' in path.lower() or 'helper' in path.lower()) and not info.dependents:
                issues['dead_utilities'].append({
                    'file': path,
                    'functions': info.functions,
                    'size': info.size
                })
        
        layout_files = [path for path in self.files.keys() if 'layout' in path.lower()]
        if len(layout_files) > 1:
            issues['multiple_layouts'] = layout_files
        
        return issues
    
    def _find_unwired_components(self) -> List[Dict]:
        unwired = []
        
        for path, info in self.files.items():
            for comp in info.components:
                if len(self.component_map[comp]) == 1 and len(info.dependents) == 0:
                    unwired.append({
                        'component': comp,
                        'file': path,
                        'reason': 'No imports found',
                        'exports': info.exports,
                        'lines': info.lines
                    })
        
        return unwired
    
    def _get_stats(self) -> Dict:
        complexities = [f.complexity for f in self.files.values()]
        maintainabilities = [f.maintainability for f in self.files.values()]
        
        file_types = defaultdict(int)
        for info in self.files.values():
            file_types[info.type] += 1
        
        return {
            'total_files': len(self.files),
            'total_lines': sum(f.lines for f in self.files.values()),
            'total_size': sum(f.size for f in self.files.values()),
            'avg_complexity': round(statistics.mean(complexities), 1) if complexities else 0,
            'max_complexity': max(complexities) if complexities else 0,
            'avg_maintainability': round(statistics.mean(maintainabilities), 1) if maintainabilities else 0,
            'orphaned_files': sum(1 for f in self.files.values() if len(f.dependents) == 0),
            'highly_connected': sum(1 for f in self.files.values() if len(f.dependents) > 10),
            'file_types': dict(file_types)
        }
    
    def _create_refactor_plan(self, results: Dict) -> List[Dict]:
        plan = []
        
        # Phase 1: Quick Wins
        phase1_tasks = []
        if results['unused']:
            safe_count = sum(1 for f in results['unused'] if f['potential_value']['score'] < 30)
            phase1_tasks.append(f"Remove {safe_count} safe-to-delete unused files")
        if results['duplicates']:
            phase1_tasks.append(f"Consolidate {len(results['duplicates'])} duplicate file groups")
        phase1_tasks.append("Add TODO comments to suspicious files")
        
        plan.append({
            'phase': 1,
            'name': 'Quick Wins & Cleanup',
            'tasks': phase1_tasks,
            'risk': 'LOW',
            'duration': '1-2 days'
        })
        
        # Phase 2: Component Consolidation
        phase2_tasks = []
        if results['duplicate_components']:
            phase2_tasks.append(f"Merge {len(results['duplicate_components'])} duplicate components")
        if results['duplicate_hooks']:
            phase2_tasks.append(f"Consolidate {len(results['duplicate_hooks'])} duplicate hooks")
        if results['similar']:
            phase2_tasks.append(f"Review and merge {len(results['similar'])} similar file groups")
        
        plan.append({
            'phase': 2,
            'name': 'Component Consolidation',
            'tasks': phase2_tasks,
            'risk': 'MEDIUM',
            'duration': '3-5 days'
        })
        
        # Phase 3: Architecture Refactoring
        phase3_tasks = [
            "Wire up unused services and utilities",
            "Refactor high-complexity components",
            "Improve maintainability scores",
            "Create unified API layer"
        ]
        
        plan.append({
            'phase': 3,
            'name': 'Architecture Enhancement',
            'tasks': phase3_tasks,
            'risk': 'HIGH',
            'duration': '1-2 weeks'
        })
        
        return plan
    
    def _generate_report(self, results: Dict) -> Dict:
        merge_recs = []
        for similar in results['similar']:
            files = similar['files']
            if len(files) > 1:
                best = max(files, key=lambda x: x['maintainability'])
                merge_recs.append({
                    'common_name': similar['name'],
                    'files': [f['path'] for f in files],
                    'best_candidate': best['path'],
                    'best_maintainability': best['maintainability'],
                    'risk_level': 'LOW' if len(files) == 2 else 'MEDIUM'
                })
        
        unused_count = len(results['unused'])
        dup_groups = len(results['duplicates'])
        similar_groups = len(results['similar'])
        
        risk_score = unused_count * 0.1 + dup_groups * 0.3 + similar_groups * 0.2
        
        if risk_score > 2:
            overall_risk = 'HIGH'
        elif risk_score > 1:
            overall_risk = 'MEDIUM'
        else:
            overall_risk = 'LOW'
        
        return {
            'project_metadata': {
                'root': str(self.root),
                'analysis_date': datetime.now().isoformat(),
                'total_files': len(self.files)
            },
            'languages': list(results['stats']['file_types'].keys()),
            'statistics': {
                'complexity_analysis': {
                    'average_complexity': results['stats']['avg_complexity'],
                    'max_complexity': results['stats']['max_complexity'],
                    'complex_files': sum(1 for f in self.files.values() if f.complexity > 50),
                    'average_maintainability': results['stats']['avg_maintainability']
                },
                'file_type_distribution': {
                    ftype: (count / len(self.files) * 100)
                    for ftype, count in results['stats']['file_types'].items()
                },
                'dependency_analysis': {
                    'orphaned_files': results['stats']['orphaned_files'],
                    'highly_connected': results['stats']['highly_connected']
                }
            },
            'unused_files': results['unused'],
            'duplicate_files': results['duplicates'],
            'duplicate_components': results['duplicate_components'],
            'duplicate_hooks': results['duplicate_hooks'],
            'similar_files': results['similar'],
            'architecture_issues': results['architecture'],
            'unwired_components': results['unwired'],
            'merge_recommendations': merge_recs,
            'refactor_plan': self._create_refactor_plan(results),
            'risk_assessment': {
                'overall_risk': overall_risk,
                'risk_score': round(risk_score, 2),
                'risk_factors': {
                    'unused_files': unused_count,
                    'duplicate_groups': dup_groups,
                    'similar_groups': similar_groups
                },
                'high_risk_items': [
                    hook for hook in results['duplicate_hooks'] if hook['count'] > 3
                ]
            }
        }
    
    def _save_report(self, report: Dict):
        """Save JSON report"""
        json_path = self.report_dir / 'analysis_report.json'
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        print(f"      ✅ JSON report: {json_path}")
    
    def _generate_modern_dashboard(self, report: Dict):
        """Generate modern interactive HTML dashboard"""
        html_path = self.report_dir / 'dashboard.html'
        
        html = self._build_dashboard_html(report)
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)
        
        print(f"      ✅ HTML dashboard: {html_path}")
    
    def _build_dashboard_html(self, report: Dict) -> str:
        """Build complete HTML dashboard"""
        return f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>G-Studio Architecture Analysis</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        {self._get_dashboard_css()}
    </style>
</head>
<body>
    <div class="dashboard">
        {self._build_header(report)}
        {self._build_summary_cards(report)}
        {self._build_main_content(report)}
        {self._build_charts(report)}
        {self._build_footer()}
    </div>
    
    <script>
        {self._get_dashboard_js(report)}
    </script>
</body>
</html>'''
    
    def _get_dashboard_css(self) -> str:
        """Return modern CSS for dashboard"""
        return """
        :root {
            --primary: #6366f1;
            --secondary: #8b5cf6;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --dark-bg: #0f172a;
            --dark-card: #1e293b;
            --text-primary: #f1f5f9;
            --text-secondary: #94a3b8;
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, var(--dark-bg) 0%, #1e1b4b 100%);
            color: var(--text-primary);
            line-height: 1.6;
            min-height: 100vh;
        }
        
        .dashboard {
            max-width: 1600px;
            margin: 0 auto;
            padding: 30px;
        }
        
        .header {
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            border-radius: 16px;
            padding: 40px;
            margin-bottom: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.4);
            animation: slideDown 0.5s ease;
        }
        
        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .header h1 {
            font-size: 36px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 15px;
        }
        
        .header-meta {
            display: flex;
            gap: 30px;
            margin-top: 15px;
            font-size: 14px;
            opacity: 0.95;
        }
        
        .risk-badge {
            display: inline-block;
            padding: 8px 20px;
            border-radius: 50px;
            font-weight: 700;
            font-size: 14px;
            margin-top: 15px;
        }
        
        .risk-high { background: var(--danger); }
        .risk-medium { background: var(--warning); color: #000; }
        .risk-low { background: var(--success); }
        
        .summary-cards {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .card {
            background: var(--dark-card);
            border-radius: 12px;
            padding: 25px;
            border-left: 4px solid var(--primary);
            transition: all 0.3s;
        }
        
        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(99,102,241,0.3);
        }
        
        .card-value {
            font-size: 42px;
            font-weight: bold;
            color: #60a5fa;
            margin-bottom: 8px;
        }
        
        .card-label {
            color: var(--text-secondary);
            font-size: 13px;
            text-transform: uppercase;
        }
        
        .section {
            background: var(--dark-card);
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 25px;
        }
        
        .section h2 {
            margin-bottom: 20px;
            color: #60a5fa;
            font-size: 22px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .list-item {
            padding: 15px;
            margin-bottom: 10px;
            background: var(--dark-bg);
            border-radius: 8px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: all 0.2s;
        }
        
        .list-item:hover {
            background: #1e293b;
            transform: translateX(5px);
        }
        
        .file-path {
            font-family: 'Monaco', monospace;
            font-size: 13px;
        }
        
        .badge {
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            margin-left: 10px;
        }
        
        .badge-success { background: rgba(16, 185, 129, 0.2); color: var(--success); }
        .badge-warning { background: rgba(245, 158, 11, 0.2); color: var(--warning); }
        .badge-danger { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
        
        .footer {
            margin-top: 50px;
            padding: 25px;
            text-align: center;
            border-top: 2px solid #334155;
            color: var(--text-secondary);
        }
        
        @media (max-width: 768px) {
            .dashboard { padding: 15px; }
            .summary-cards { grid-template-columns: 1fr; }
        }
        """
    
    def _build_header(self, report: Dict) -> str:
        """Build dashboard header"""
        risk = report['risk_assessment']['overall_risk']
        return f'''
        <div class="header">
            <h1><i class="fas fa-chart-network"></i> G-Studio Architecture Analysis</h1>
            <div class="header-meta">
                <span>📁 {report['project_metadata']['root']}</span>
                <span>📅 {report['project_metadata']['analysis_date']}</span>
                <span>📊 {report['project_metadata']['total_files']} files</span>
            </div>
            <div class="risk-badge risk-{risk.lower()}">
                Risk Level: {risk} (Score: {report['risk_assessment']['risk_score']})
            </div>
        </div>
        '''
    
    def _build_summary_cards(self, report: Dict) -> str:
        """Build summary cards"""
        stats = report['statistics']['complexity_analysis']
        cards = f'''
        <div class="summary-cards">
            <div class="card">
                <div class="card-value">{report['project_metadata']['total_files']}</div>
                <div class="card-label">Total Files</div>
            </div>
            <div class="card">
                <div class="card-value">{len(report['unused_files'])}</div>
                <div class="card-label">Unused Files</div>
            </div>
            <div class="card">
                <div class="card-value">{len(report['duplicate_files'])}</div>
                <div class="card-label">Duplicate Groups</div>
            </div>
            <div class="card">
                <div class="card-value">{len(report['duplicate_components'])}</div>
                <div class="card-label">Duplicate Components</div>
            </div>
            <div class="card">
                <div class="card-value">{len(report['unwired_components'])}</div>
                <div class="card-label">Unwired Components</div>
            </div>
            <div class="card">
                <div class="card-value">{stats['average_maintainability']:.0f}</div>
                <div class="card-label">Avg Maintainability</div>
            </div>
        </div>
        '''
        return cards
    
    def _build_main_content(self, report: Dict) -> str:
        """Build main content sections"""
        content = ""
        
        # Unwired Components
        if report['unwired_components']:
            content += f'''
            <div class="section">
                <h2><i class="fas fa-plug"></i> Unwired Components ({len(report['unwired_components'])})</h2>
                <div>
            '''
            for comp in report['unwired_components'][:15]:
                content += f'''
                <div class="list-item">
                    <div>
                        <div class="file-path">{comp['component']}</div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
                            {comp['file']}
                        </div>
                    </div>
                    <span class="badge badge-warning">{comp['reason']}</span>
                </div>
                '''
            content += "</div></div>"
        
        # Unused Files
        if report['unused_files']:
            content += f'''
            <div class="section">
                <h2><i class="fas fa-trash-alt"></i> Unused Files ({len(report['unused_files'])})</h2>
                <div>
            '''
            for file in report['unused_files'][:20]:
                badge_class = 'badge-success' if file['potential_value']['score'] < 50 else 'badge-warning'
                content += f'''
                <div class="list-item">
                    <div class="file-path">{file['path']}</div>
                    <div>
                        <span style="color: #94a3b8; font-size: 12px;">{file['lines']} lines</span>
                        <span class="badge {badge_class}">{file['potential_value']['recommendation']}</span>
                    </div>
                </div>
                '''
            content += "</div></div>"
        
        # Duplicate Components
        if report['duplicate_components']:
            content += f'''
            <div class="section">
                <h2><i class="fas fa-copy"></i> Duplicate Components ({len(report['duplicate_components'])})</h2>
                <div>
            '''
            for comp in report['duplicate_components'][:15]:
                content += f'''
                <div class="list-item">
                    <div>
                        <div class="file-path">{comp['name']}</div>
                        <div style="font-size: 11px; color: #64748b; margin-top: 3px;">
                            {"<br>".join(comp['locations'][:3])}
                        </div>
                    </div>
                    <span class="badge badge-danger">{comp['count']} copies</span>
                </div>
                '''
            content += "</div></div>"
        
        # Refactoring Plan
        content += f'''
        <div class="section">
            <h2><i class="fas fa-road"></i> Refactoring Roadmap</h2>
            <div>
        '''
        for phase in report['refactor_plan']:
            risk_class = f"risk-{phase['risk'].lower()}"
            content += f'''
            <div class="list-item">
                <div>
                    <div style="font-weight: 600;">Phase {phase['phase']}: {phase['name']}</div>
                    <div style="font-size: 12px; color: #94a3b8; margin-top: 5px;">
                        Duration: {phase['duration']} • {len(phase['tasks'])} tasks
                    </div>
                </div>
                <span class="badge badge-{risk_class.replace('risk-', '')}">{phase['risk']}</span>
            </div>
            '''
        content += "</div></div>"
        
        return content
    
    def _build_charts(self, report: Dict) -> str:
        """Build charts section (placeholder for future enhancement)"""
        return ""
    
    def _build_footer(self) -> str:
        """Build footer"""
        return '''
        <div class="footer">
            <p style="font-size: 16px; font-weight: bold; margin-bottom: 10px;">
                G-Studio Architecture Analyzer
            </p>
            <p style="font-size: 13px; color: #64748b;">
                ⚠️ Always backup your code before making changes
            </p>
        </div>
        '''
    
    def _get_dashboard_js(self, report: Dict) -> str:
        """Return dashboard JavaScript"""
        return f"""
        console.log('Dashboard loaded');
        
        // Add interactive features here
        document.querySelectorAll('.list-item').forEach(item => {{
            item.addEventListener('click', function() {{
                this.style.background = '#2d3748';
                setTimeout(() => {{
                    this.style.background = '';
                }}, 200);
            }});
        }});
        """
    
    def _save_unused_report(self, unused: List[Dict]):
        """Save detailed unused files HTML report"""
        html_path = self.report_dir / 'unused_files.html'
        
        html = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Unused Files Report</title>
    <style>
        body {{ font-family: sans-serif; background: #0f172a; color: #f1f5f9; padding: 20px; }}
        .container {{ max-width: 1200px; margin: 0 auto; }}
        h1 {{ color: #60a5fa; }}
        .file {{ background: #1e293b; padding: 15px; margin: 10px 0; border-radius: 8px; }}
        .safe {{ border-left: 4px solid #10b981; }}
        .review {{ border-left: 4px solid #f59e0b; }}
        .keep {{ border-left: 4px solid #ef4444; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🗑️ Unused Files Report</h1>
        <p>Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</p>
        <p>Total unused files: {len(unused)}</p>
        
        <h2>Safe to Remove</h2>
        {"".join(f'<div class="file safe"><strong>{f["path"]}</strong><br>{f["lines"]} lines | {f["potential_value"]["recommendation"]}</div>' 
                 for f in unused if f["potential_value"]["score"] < 30)}
        
        <h2>Review First</h2>
        {"".join(f'<div class="file review"><strong>{f["path"]}</strong><br>{f["lines"]} lines | {", ".join(f["potential_value"]["reasons"])}</div>' 
                 for f in unused if 30 <= f["potential_value"]["score"] < 60)}
        
        <h2>Keep or Refactor</h2>
        {"".join(f'<div class="file keep"><strong>{f["path"]}</strong><br>{f["lines"]} lines | {", ".join(f["potential_value"]["reasons"])}</div>' 
                 for f in unused if f["potential_value"]["score"] >= 60)}
    </div>
</body>
</html>'''
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)
    
    def _save_unwired_report(self, unwired: List[Dict]):
        """Save detailed unwired components HTML report"""
        html_path = self.report_dir / 'unwired_components.html'
        
        html = f'''<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Unwired Components Report</title>
    <style>
        body {{ font-family: sans-serif; background: #0f172a; color: #f1f5f9; padding: 20px; }}
        .container {{ max-width: 1200px; margin: 0 auto; }}
        h1 {{ color: #60a5fa; }}
        .component {{ background: #1e293b; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #f59e0b; }}
        .meta {{ color: #94a3b8; font-size: 14px; margin-top: 5px; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>🔌 Unwired Components Report</h1>
        <p>Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</p>
        <p>Total unwired components: {len(unwired)}</p>
        
        {"".join(f'''
        <div class="component">
            <strong>{comp["component"]}</strong>
            <div class="meta">File: {comp["file"]}</div>
            <div class="meta">Reason: {comp["reason"]}</div>
            <div class="meta">Lines: {comp.get("lines", "N/A")}</div>
        </div>
        ''' for comp in unwired)}
    </div>
</body>
</html>'''
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)
    
    # Continue with other menu methods (find_duplicate_files, analyze_architecture, etc.)
    def find_duplicate_files(self):
        """Find duplicate files only"""
        print("\n🔍 Scanning for duplicates...")
        files = self._scan()
        duplicates = self._find_duplicates()
        
        print(f"\n📊 Found {len(duplicates)} duplicate groups:")
        print("=" * 70)
        
        total_savings = 0
        for group in duplicates[:10]:
            print(f"\n📝 {len(group['files'])} identical files (save {group['savings_potential']:,} bytes)")
            for f in group['files'][:3]:
                print(f"   • {f['path']}")
            if len(group['files']) > 3:
                print(f"   ... and {len(group['files']) - 3} more")
            total_savings += group['savings_potential']
        
        print(f"\n💾 Total potential savings: {total_savings:,} bytes")
        input("\nPress Enter to continue...")
    
    def find_duplicate_components(self):
        """Find duplicate React components and hooks"""
        print("\n🔍 Scanning for duplicate components and hooks...")
        files = self._scan()
        self._build_graph(files)
        
        dup_components = self._find_duplicate_components()
        dup_hooks = self._find_duplicate_hooks()
        
        print(f"\n⚛️  Duplicate Components: {len(dup_components)}")
        print("=" * 70)
        for comp in dup_components[:10]:
            print(f"\n• {comp['name']} ({comp['count']} copies)")
            for loc in comp['locations'][:3]:
                print(f"  → {loc}")
        
        print(f"\n🪝 Duplicate Hooks: {len(dup_hooks)}")
        print("=" * 70)
        for hook in dup_hooks[:10]:
            print(f"\n• {hook['name']} ({hook['count']} copies)")
            for loc in hook['locations'][:3]:
                print(f"  → {loc}")
        
        input("\nPress Enter to continue...")
    
    def analyze_architecture(self):
        """Architecture issues analysis"""
        print("\n🔍 Analyzing architecture...")
        files = self._scan()
        self._build_graph(files)
        
        issues = self._analyze_architecture_issues()
        unwired = self._find_unwired_components()
        
        print("\n🏗️  ARCHITECTURE ISSUES")
        print("=" * 70)
        
        print(f"\n🔧 Unwired Services: {len(issues['unwired_services'])}")
        for service in issues['unwired_services'][:5]:
            print(f"  • {service['service']}")
            if service['exports']:
                print(f"    Exports: {', '.join(service['exports'][:3])}")
        
        print(f"\n⚠️  Dead Utilities: {len(issues['dead_utilities'])}")
        for util in issues['dead_utilities'][:5]:
            print(f"  • {util['file']}")
            if util['functions']:
                print(f"    Functions: {', '.join(util['functions'][:3])}")
        
        print(f"\n🔌 Unwired Components: {len(unwired)}")
        for comp in unwired[:5]:
            print(f"  • {comp['component']} in {comp['file']}")
            print(f"    Reason: {comp['reason']}")
        
        input("\nPress Enter to continue...")
    
    def show_statistics(self):
        """Display project statistics"""
        print("\n🔍 Calculating statistics...")
        files = self._scan()
        self._build_graph(files)
        stats = self._get_stats()
        
        print("\n📊 PROJECT STATISTICS")
        print("=" * 70)
        print(f"Total Files:           {stats['total_files']}")
        print(f"Total Lines:           {stats['total_lines']:,}")
        print(f"Total Size:            {stats['total_size']:,} bytes")
        print(f"Average Complexity:    {stats['avg_complexity']:.1f}")
        print(f"Max Complexity:        {stats['max_complexity']}")
        print(f"Avg Maintainability:   {stats['avg_maintainability']:.1f}/100")
        print(f"Orphaned Files:        {stats['orphaned_files']}")
        print(f"Highly Connected:      {stats['highly_connected']}")
        
        print("\n📁 File Types:")
        for ftype, count in sorted(stats['file_types'].items(), key=lambda x: x[1], reverse=True):
            print(f"  {ftype:15} {count:4} files")
        
        input("\nPress Enter to continue...")
    
    def generate_refactor_plan(self):
        """Generate refactoring roadmap"""
        print("\n🔍 Generating refactoring plan...")
        files = self._scan()
        self._build_graph(files)
        
        results = {
            'unused': self._find_unused(),
            'duplicates': self._find_duplicates(),
            'duplicate_components': self._find_duplicate_components(),
            'duplicate_hooks': self._find_duplicate_hooks(),
            'similar': self._find_similar(),
            'architecture': self._analyze_architecture_issues()
        }
        
        plan = self._create_refactor_plan(results)
        
        print("\n🎯 REFACTORING ROADMAP")
        print("=" * 70)
        
        for phase in plan:
            print(f"\n📌 Phase {phase['phase']}: {phase['name']}")
            print(f"   Duration: {phase['duration']} | Risk: {phase['risk']}")
            print("   Tasks:")
            for task in phase['tasks']:
                print(f"     • {task}")
        
        input("\nPress Enter to continue...")
    
    def export_dashboard(self):
        """Export interactive dashboard"""
        print("\n🔍 Running analysis for dashboard...")
        files = self._scan()
        self._build_graph(files)
        
        results = {
            'unused': self._find_unused(),
            'duplicates': self._find_duplicates(),
            'duplicate_components': self._find_duplicate_components(),
            'duplicate_hooks': self._find_duplicate_hooks(),
            'similar': self._find_similar(),
            'architecture': self._analyze_architecture_issues(),
            'unwired': self._find_unwired_components(),
            'stats': self._get_stats()
        }
        
        report = self._generate_report(results)
        self._save_report(report)
        self._generate_modern_dashboard(report)
        
        print(f"\n✅ Dashboard exported successfully!")
        print(f"   📄 JSON: {self.report_dir / 'analysis_report.json'}")
        print(f"   🌐 HTML: {self.report_dir / 'dashboard.html'}")
        
        input("\nPress Enter to continue...")
    
    def _display_summary(self, report: Dict):
        """Display analysis summary"""
        print("\n" + "=" * 70)
        print("📊 ANALYSIS SUMMARY")
        print("=" * 70)
        print(f"Total files:          {report['project_metadata']['total_files']}")
        print(f"Unused files:         {len(report['unused_files'])}")
        print(f"Duplicate groups:     {len(report['duplicate_files'])}")
        print(f"Duplicate components: {len(report['duplicate_components'])}")
        print(f"Duplicate hooks:      {len(report['duplicate_hooks'])}")
        print(f"Unwired components:   {len(report['unwired_components'])}")
        print(f"Risk level:           {report['risk_assessment']['overall_risk']}")
        print("=" * 70)


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="G-Studio Advanced Architecture Analyzer")
    parser.add_argument('path', nargs='?', default='.', help='Project path')
    parser.add_argument('--reports', default='reports', help='Reports directory')
    parser.add_argument('--no-menu', action='store_true', help='Skip menu and run full analysis')
    
    args = parser.parse_args()
    
    try:
        analyzer = ProjectAnalyzer(args.path, args.reports)
        
        if args.no_menu:
            analyzer.run_full_analysis()
        else:
            analyzer.show_menu()
        
    except KeyboardInterrupt:
        print("\n\n👋 Analysis interrupted by user")
        return 1
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == "__main__":
    sys.exit(main())