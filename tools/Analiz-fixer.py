#!/usr/bin/env python3
"""
G-Studio Ultimate Component & Architecture Analyzer
Combines deep component analysis with architecture optimization
"""

import os
import json
import hashlib
import re
import ast
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple, Any, Optional
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
    complexity: int = 0


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
    maintainability: float = 0
    used_components: Set[str] = field(default_factory=set)
    used_hooks: Set[str] = field(default_factory=set)


class UnifiedAnalyzer:
    def __init__(self, project_root: str, reports_base: str = "reports"):
        self.root = Path(project_root).resolve()
        self.files: Dict[str, FileInfo] = {}
        
        # Component tracking
        self.all_components: Dict[str, List[ComponentInfo]] = defaultdict(list)
        self.all_hooks: Dict[str, List[str]] = defaultdict(list)
        self.component_usage: Dict[str, Set[str]] = defaultdict(set)
        self.hook_usage: Dict[str, Set[str]] = defaultdict(set)
        
        # Dependency tracking
        self.import_map: Dict[str, Set[str]] = defaultdict(set)
        self.reverse_import_map: Dict[str, Set[str]] = defaultdict(set)
        self.component_map: Dict[str, List[str]] = defaultdict(list)
        self.hook_map: Dict[str, List[str]] = defaultdict(list)
        
        # Centralized reports with timestamp
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        self.report_dir = Path(reports_base) / timestamp
        self.report_dir.mkdir(parents=True, exist_ok=True)
        
        self.exclude_dirs = {
            'node_modules', '__pycache__', '.git', 'dist', 'build', 'coverage',
            '.next', '.nuxt', '.vite', '.cache', '.idea', '.vscode', '.turbo',
            'backups', 'backup', '.backup', 'reports', '__archive__', 
            '.codefixer_backups', 'public', '.parcel-cache'
        }
        
        self.exclude_patterns = [
            r'\.backup', r'\.bak$', r'~$', r'\.swp$', r'backup_\d+',
            r'_backup', r'\.old$', r'\.orig$', r'\.test\.', r'\.spec\.',
            r'\.stories\.', r'\.d\.ts$'
        ]

    def show_menu(self):
        """Interactive menu with all analysis options"""
        while True:
            self._clear_screen()
            self._print_header()
            
            print("\n📁 Project:", str(self.root))
            print("📂 Reports:", str(self.report_dir))
            print()
            
            menu_items = [
                ("1", "🔍", "Full Analysis", "Complete scan with all reports"),
                ("2", "⚛️", "Component Analysis", "Deep component & hook analysis"),
                ("3", "🔌", "Unwired Components", "Find components not imported"),
                ("4", "🗑️", "Unused Files", "Identify dead code"),
                ("5", "📝", "Duplicate Detection", "Find duplicate code"),
                ("6", "🏗️", "Architecture Issues", "Structural problems"),
                ("7", "📊", "Project Statistics", "Metrics & complexity"),
                ("8", "🎯", "Refactoring Plan", "Step-by-step roadmap"),
                ("9", "📈", "HTML Dashboard", "Interactive report"),
                ("0", "🚪", "Exit", "Close analyzer"),
            ]
            
            self._print_menu(menu_items)
            
            choice = input("\n💡 Select option: ").strip()
            
            if choice == '1':
                self.run_full_analysis()
            elif choice == '2':
                self.run_component_analysis()
            elif choice == '3':
                self.find_unwired_components()
            elif choice == '4':
                self.find_unused_files()
            elif choice == '5':
                self.find_duplicates()
            elif choice == '6':
                self.analyze_architecture()
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
        print("╔" + "═" * 68 + "╗")
        print("║" + " " * 12 + "🏗️  G-STUDIO ULTIMATE ANALYZER" + " " * 23 + "║")
        print("║" + " " * 10 + "Component Analysis & Architecture Optimization" + " " * 11 + "║")
        print("╚" + "═" * 68 + "╝")

    def _print_menu(self, items: List[Tuple]):
        print("┌" + "─" * 68 + "┐")
        for key, icon, title, desc in items:
            print(f"│  [{key}] {icon}  {title:<25} {desc:<30} │")
        print("└" + "─" * 68 + "┘")

    def _clear_screen(self):
        os.system('cls' if os.name == 'nt' else 'clear')

    def run_full_analysis(self):
        """Complete analysis with all features"""
        print("\n" + "=" * 70)
        print("🔍 STARTING COMPREHENSIVE ANALYSIS")
        print("=" * 70)
        
        print("\n[1/7] 📂 Scanning project files...")
        self._scan_project()
        print(f"      ✅ Scanned {len(self.files)} files")
        
        print("\n[2/7] 🔗 Building dependency graph...")
        self._build_dependency_graph()
        print("      ✅ Dependency graph complete")
        
        print("\n[3/7] ⚛️  Analyzing components...")
        self._analyze_component_usage()
        print("      ✅ Component analysis complete")
        
        print("\n[4/7] 🔍 Detecting issues...")
        results = self._generate_full_analysis()
        print("      ✅ Issue detection complete")
        
        print("\n[5/7] 📝 Creating reports...")
        report = self._create_unified_report(results)
        self._save_json_report(report)
        print("      ✅ JSON report saved")
        
        print("\n[6/7] 🎨 Generating HTML dashboard...")
        self._generate_ultimate_dashboard(report)
        print("      ✅ Dashboard created")
        
        print("\n[7/7] 📊 Displaying summary...")
        self._display_summary(report)
        
        print("\n" + "=" * 70)
        print("✅ ANALYSIS COMPLETE")
        print("=" * 70)
        print(f"\n📂 Reports saved to: {self.report_dir}")
        print(f"   • JSON: {self.report_dir / 'complete_analysis.json'}")
        print(f"   • HTML: {self.report_dir / 'dashboard.html'}")
        
        input("\nPress Enter to continue...")

    def run_component_analysis(self):
        """Deep component-focused analysis"""
        print("\n🔍 Running component analysis...")
        self._scan_project()
        self._build_dependency_graph()
        self._analyze_component_usage()
        
        results = self._generate_component_analysis()
        
        print(f"\n⚛️  COMPONENT ANALYSIS RESULTS")
        print("=" * 70)
        print(f"Total Components:     {results['total_components']}")
        print(f"Unused Components:    {len(results['unused_components'])}")
        print(f"Unwired Components:   {len(results['unwired_components'])}")
        print(f"Duplicate Components: {len(results['duplicate_components'])}")
        print(f"Total Hooks:          {results['total_hooks']}")
        print(f"Unused Hooks:         {len(results['unused_hooks'])}")
        
        if results['unused_components']:
            print(f"\n🗑️  Unused Components (top 10):")
            for comp in results['unused_components'][:10]:
                print(f"   • {comp['name']} in {comp['file']}")
                print(f"     Type: {comp['type']} | Line: {comp['line']}")
        
        if results['unwired_components']:
            print(f"\n🔌 Unwired Components (top 10):")
            for comp in results['unwired_components'][:10]:
                print(f"   • {comp['name']} in {comp['file']}")
                print(f"     Reason: {comp['reason']}")
        
        # Save detailed report
        self._save_component_report(results)
        print(f"\n📄 Detailed report: {self.report_dir / 'components.html'}")
        
        input("\nPress Enter to continue...")

    def find_unwired_components(self):
        """Find components not imported anywhere"""
        print("\n🔍 Scanning for unwired components...")
        self._scan_project()
        self._build_dependency_graph()
        self._analyze_component_usage()
        
        unwired = self._find_unwired_components()
        
        print(f"\n📊 Found {len(unwired)} unwired components")
        print("=" * 70)
        
        for comp in unwired[:20]:
            print(f"\n⚛️  {comp['component']}")
            print(f"   File: {comp['file']}:{comp.get('line', '?')}")
            print(f"   Type: {comp.get('type', 'unknown')}")
            print(f"   Reason: {comp['reason']}")
        
        if len(unwired) > 20:
            print(f"\n... and {len(unwired) - 20} more")
        
        self._save_unwired_report(unwired)
        print(f"\n📄 Detailed report: {self.report_dir / 'unwired_components.html'}")
        
        input("\nPress Enter to continue...")

    def _scan_project(self):
        """Scan all project files"""
        valid_extensions = {'.ts', '.tsx', '.js', '.jsx', '.mjs'}
        
        for root, dirs, files in os.walk(self.root):
            dirs[:] = [d for d in dirs if d not in self.exclude_dirs and not d.startswith('.')]
            
            for file in files:
                if file.startswith('.'):
                    continue
                    
                file_path = Path(root) / file
                
                if file_path.suffix not in valid_extensions:
                    continue
                
                if any(re.search(p, str(file_path)) for p in self.exclude_patterns):
                    continue
                
                rel_path = str(file_path.relative_to(self.root))
                
                try:
                    info = self._analyze_file(file_path, rel_path)
                    if info:
                        self.files[rel_path] = info
                except Exception as e:
                    print(f"⚠️  Error analyzing {rel_path}: {e}")

    def _analyze_file(self, path: Path, rel_path: str) -> Optional[FileInfo]:
        """Analyze single file with deep component detection"""
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
        maintainability = self._calculate_maintainability(content, complexity)
        content_hash = hashlib.md5(content.encode()).hexdigest()
        
        # Register components
        for comp in components:
            self.all_components[comp.name].append(comp)
        
        # Register hooks
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
            maintainability=maintainability,
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
        """Extract ES6 and CommonJS imports"""
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
        """Extract named and default exports"""
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
        """Extract function definitions"""
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
        """Extract class definitions"""
        return list(set(re.findall(r"class\s+(\w+)", content)))

    def _extract_components(self, content: str, file_path: str) -> List[ComponentInfo]:
        """Extract React components with detailed info"""
        components = []
        
        # Function components
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
                used_hooks=self._find_hooks_in_component(content, match.start()),
                complexity=self._calculate_component_complexity(content, match.start())
            ))
        
        # Arrow function components
        arrow_pattern = r"(?:export\s+)?(?:default\s+)?const\s+([A-Z]\w*)\s*(?::\s*(?:React\.)?FC[^=]*)?\s*=\s*(?:\([^)]*\)|[^=])\s*=>"
        for match in re.finditer(arrow_pattern, content):
            name = match.group(1)
            if name in [c.name for c in components]:
                continue
                
            line_num = content[:match.start()].count('\n') + 1
            is_exported = 'export' in content[max(0, match.start()-20):match.start()+len(match.group())]
            is_default = 'default' in content[max(0, match.start()-20):match.start()+len(match.group())]
            
            components.append(ComponentInfo(
                name=name,
                file_path=file_path,
                component_type='arrow',
                line_number=line_num,
                is_exported=is_exported,
                is_default_export=is_default,
                used_hooks=self._find_hooks_in_component(content, match.start()),
                complexity=self._calculate_component_complexity(content, match.start())
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
                is_default_export=is_default,
                complexity=self._calculate_component_complexity(content, match.start())
            ))
        
        return components

    def _find_hooks_in_component(self, content: str, start_pos: int) -> List[str]:
        """Find hooks used in component"""
        hook_pattern = r'\b(use[A-Z]\w*)\s*\('
        end_pos = min(start_pos + 2000, len(content))
        component_content = content[start_pos:end_pos]
        return list(set(re.findall(hook_pattern, component_content)))

    def _calculate_component_complexity(self, content: str, start_pos: int) -> int:
        """Calculate complexity for a specific component"""
        end_pos = min(start_pos + 2000, len(content))
        component_content = content[start_pos:end_pos]
        return self._calculate_complexity(component_content)

    def _extract_hooks(self, content: str) -> List[str]:
        """Extract custom hook definitions"""
        hooks = []
        hook_patterns = [
            r"(?:export\s+)?(?:const|function)\s+(use[A-Z]\w*)\s*(?:=|<|\()",
        ]
        
        for pattern in hook_patterns:
            hooks.extend(re.findall(pattern, content))
        
        return list(set(hooks))

    def _extract_used_components(self, content: str) -> Set[str]:
        """Extract component usage in JSX"""
        used = set()
        
        # JSX usage
        jsx_pattern = r"<([A-Z]\w*)(?:\s|>|/)"
        used.update(re.findall(jsx_pattern, content))
        
        # createElement
        ref_pattern = r"(?:createElement|cloneElement)\s*\(\s*([A-Z]\w*)"
        used.update(re.findall(ref_pattern, content))
        
        return used

    def _extract_used_hooks(self, content: str) -> Set[str]:
        """Extract hook usage"""
        hook_pattern = r'\b(use[A-Z]\w*)\s*\('
        return set(re.findall(hook_pattern, content))

    def _calculate_complexity(self, content: str) -> int:
        """Calculate cyclomatic complexity"""
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

    def _calculate_maintainability(self, content: str, complexity: int) -> float:
        """Calculate maintainability index"""
        lines = content.count('\n') + 1
        volume = len(content)
        
        if lines == 0:
            return 100
        
        effort = volume * complexity
        maintainability = max(0, min(100, 171 - 5.2 * (effort ** 0.23) - 0.23 * complexity - 16.2 * (lines ** 0.5)))
        return round(maintainability, 1)

    def _build_dependency_graph(self):
        """Build complete dependency graph"""
        # Create path variants for import resolution
        path_variants = {}
        for rel_path in self.files:
            stem = Path(rel_path).stem
            parent = Path(rel_path).parent
            
            path_variants[rel_path] = rel_path
            path_variants[str(parent / stem)] = rel_path
            path_variants['./' + str(parent / stem)] = rel_path
            
            if stem == 'index':
                path_variants[str(parent)] = rel_path
                path_variants['./' + str(parent)] = rel_path
        
        # Build dependency graph
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
        
        # Build component and hook maps
        for path, info in self.files.items():
            for comp in info.components:
                self.component_map[comp.name].append(path)
            for hook in info.hooks:
                self.hook_map[hook].append(path)

    def _analyze_component_usage(self):
        """Analyze component and hook usage patterns"""
        for file_path, file_info in self.files.items():
            for comp_name in file_info.used_components:
                self.component_usage[comp_name].add(file_path)
            
            for hook_name in file_info.used_hooks:
                self.hook_usage[hook_name].add(file_path)

    def _generate_full_analysis(self) -> Dict[str, Any]:
        """Generate complete analysis results"""
        return {
            'unused_files': self._find_unused_files(),
            'unused_components': self._find_unused_components(),
            'unwired_components': self._find_unwired_components(),
            'duplicate_components': self._find_duplicate_components(),
            'duplicate_hooks': self._find_duplicate_hooks(),
            'duplicate_files': self._find_duplicate_files(),
            'orphan_files': self._find_orphan_files(),
            'unused_hooks': self._find_unused_hooks(),
            'architecture_issues': self._analyze_architecture_issues(),
            'similar_files': self._find_similar_files(),
            'stats': self._get_statistics()
        }

    def _generate_component_analysis(self) -> Dict[str, Any]:
        """Generate component-focused analysis"""
        return {
            'total_components': sum(len(c) for c in self.all_components.values()),
            'total_hooks': sum(len(h) for h in self.all_hooks.values()),
            'unused_components': self._find_unused_components(),
            'unwired_components': self._find_unwired_components(),
            'duplicate_components': self._find_duplicate_components(),
            'duplicate_hooks': self._find_duplicate_hooks(),
            'unused_hooks': self._find_unused_hooks()
        }

    def _find_unused_files(self) -> List[Dict]:
        """Find files with no dependents"""
        unused = []
        entry_patterns = ['index', 'main', 'app', '__init__', 'setup']
        
        for file_path, file_info in self.files.items():
            if any(pattern in file_path.lower() for pattern in entry_patterns):
                continue
            
            if len(file_info.dependents) == 0 and len(file_info.exports) > 0:
                potential = self._assess_potential_value(file_info)
                unused.append({
                    'path': file_info.path,
                    'type': file_info.file_type,
                    'size': file_info.size,
                    'lines': file_info.lines,
                    'complexity': file_info.complexity,
                    'exports': file_info.exports,
                    'components': [c.name for c in file_info.components],
                    'hooks': file_info.hooks,
                    'potential_value': potential
                })
        
        return sorted(unused, key=lambda f: f['potential_value']['score'])

    def _assess_potential_value(self, file_info: FileInfo) -> Dict:
        """Assess the value of potentially unused file"""
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

    def _find_unused_components(self) -> List[Dict]:
        """Find components that are exported but never used"""
        unused = []
        entry_patterns = ['index', 'main', 'app', 'App', 'entry', 'root']
        
        for comp_name, comp_list in self.all_components.items():
            for comp in comp_list:
                # Skip entry files
                if any(p in comp.file_path.lower() for p in entry_patterns):
                    continue
                
                # Check external usage
                usage_files = self.component_usage.get(comp_name, set())
                external_usage = usage_files - {comp.file_path}
                
                if not external_usage and comp.is_exported:
                    unused.append({
                        'name': comp_name,
                        'file': comp.file_path,
                        'line': comp.line_number,
                        'type': comp.component_type,
                        'is_default': comp.is_default_export,
                        'severity': 'high' if comp.is_exported else 'low',
                        'hooks_used': comp.used_hooks,
                        'complexity': comp.complexity
                    })
        
        return sorted(unused, key=lambda x: x['severity'], reverse=True)

    def _find_unwired_components(self) -> List[Dict]:
        """Find components not exported and not used"""
        unwired = []
        
        for comp_name, comp_list in self.all_components.items():
            for comp in comp_list:
                if not comp.is_exported:
                    usage_files = self.component_usage.get(comp_name, set())
                    if comp.file_path not in usage_files or len(usage_files) == 0:
                        unwired.append({
                            'component': comp_name,
                            'file': comp.file_path,
                            'line': comp.line_number,
                            'type': comp.component_type,
                            'reason': 'Not exported and not used internally',
                            'complexity': comp.complexity,
                            'hooks_used': comp.used_hooks
                        })
        
        return unwired

    def _find_duplicate_components(self) -> List[Dict]:
        """Find components with same name in multiple files"""
        duplicates = []
        
        for comp_name, comp_list in self.all_components.items():
            if len(comp_list) > 1:
                duplicates.append({
                    'name': comp_name,
                    'count': len(comp_list),
                    'locations': [
                        {
                            'file': c.file_path,
                            'line': c.line_number,
                            'type': c.component_type,
                            'is_exported': c.is_exported,
                            'complexity': c.complexity
                        }
                        for c in comp_list
                    ]
                })
        
        return sorted(duplicates, key=lambda x: x['count'], reverse=True)

    def _find_duplicate_hooks(self) -> List[Dict]:
        """Find hooks with same name in multiple files"""
        duplicates = []
        
        for hook_name, hook_files in self.all_hooks.items():
            if len(hook_files) > 1:
                duplicates.append({
                    'name': hook_name,
                    'count': len(hook_files),
                    'files': hook_files
                })
        
        return sorted(duplicates, key=lambda x: x['count'], reverse=True)

    def _find_duplicate_files(self) -> List[Dict]:
        """Find files with identical content"""
        hash_map = defaultdict(list)
        for file_info in self.files.values():
            hash_map[file_info.content_hash].append(file_info)
        
        duplicates = []
        for content_hash, files in hash_map.items():
            if len(files) > 1:
                duplicates.append({
                    'hash': content_hash,
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
                    'potential_savings': (len(files) - 1) * files[0].size
                })
        
        return sorted(duplicates, key=lambda x: x['potential_savings'], reverse=True)

    def _find_orphan_files(self) -> List[Dict]:
        """Find files with no dependents"""
        orphans = []
        entry_patterns = ['index', 'main', 'app', '__init__', 'setup']
        
        for file_path, file_info in self.files.items():
            if any(p in file_path.lower() for p in entry_patterns):
                continue
            
            if not file_info.dependents and (file_info.exports or file_info.default_export):
                orphans.append({
                    'path': file_path,
                    'type': file_info.file_type,
                    'size': file_info.size,
                    'lines': file_info.lines,
                    'exports': file_info.exports,
                    'default_export': file_info.default_export,
                    'components': [c.name for c in file_info.components],
                    'hooks': file_info.hooks
                })
        
        return orphans

    def _find_unused_hooks(self) -> List[Dict]:
        """Find hooks that are defined but never used"""
        unused = []
        
        for hook_name, hook_files in self.all_hooks.items():
            for hook_file in hook_files:
                usage_files = self.hook_usage.get(hook_name, set())
                external_usage = usage_files - {hook_file}
                
                if not external_usage:
                    unused.append({
                        'name': hook_name,
                        'file': hook_file,
                        'usage_count': len(usage_files)
                    })
        
        return unused

    def _analyze_architecture_issues(self) -> Dict:
        """Identify architectural problems"""
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
                    'hook': hook,
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

    def _find_similar_files(self) -> List[Dict]:
        """Find files with similar names in different directories"""
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

    def _get_statistics(self) -> Dict:
        """Calculate project statistics"""
        complexities = [f.complexity for f in self.files.values()]
        maintainabilities = [f.maintainability for f in self.files.values()]
        
        file_types = defaultdict(int)
        for info in self.files.values():
            file_types[info.file_type] += 1
        
        return {
            'total_files': len(self.files),
            'total_lines': sum(f.lines for f in self.files.values()),
            'total_size': sum(f.size for f in self.files.values()),
            'total_components': sum(len(c) for c in self.all_components.values()),
            'total_hooks': sum(len(h) for h in self.all_hooks.values()),
            'avg_complexity': round(statistics.mean(complexities), 1) if complexities else 0,
            'max_complexity': max(complexities) if complexities else 0,
            'avg_maintainability': round(statistics.mean(maintainabilities), 1) if maintainabilities else 0,
            'orphaned_files': sum(1 for f in self.files.values() if len(f.dependents) == 0),
            'highly_connected': sum(1 for f in self.files.values() if len(f.dependents) > 10),
            'file_types': dict(file_types)
        }

    def _create_unified_report(self, results: Dict[str, Any]) -> Dict[str, Any]:
        """Create comprehensive unified report"""
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
                'action': f"Consolidate {len(results['duplicate_components'])} duplicate components",
                'impact': 'Reduce confusion and maintenance burden'
            })
        
        if results['duplicate_files']:
            total_savings = sum(d['potential_savings'] for d in results['duplicate_files'])
            recommendations.append({
                'priority': 'low',
                'action': f"Merge {len(results['duplicate_files'])} duplicate file groups",
                'impact': f'Save {total_savings:,} bytes'
            })
        
        unused_count = len(results['unused_files'])
        dup_groups = len(results['duplicate_files'])
        similar_groups = len(results['similar_files'])
        
        risk_score = unused_count * 0.1 + dup_groups * 0.3 + similar_groups * 0.2
        
        if risk_score > 2:
            overall_risk = 'HIGH'
        elif risk_score > 1:
            overall_risk = 'MEDIUM'
        else:
            overall_risk = 'LOW'
        
        return {
            'timestamp': datetime.now().isoformat(),
            'project_root': str(self.root),
            'report_dir': str(self.report_dir),
            'summary': results['stats'],
            'unused_files': results['unused_files'],
            'unused_components': results['unused_components'],
            'unwired_components': results['unwired_components'],
            'duplicate_components': results['duplicate_components'],
            'duplicate_hooks': results['duplicate_hooks'],
            'duplicate_files': results['duplicate_files'],
            'orphan_files': results['orphan_files'],
            'unused_hooks': results['unused_hooks'],
            'architecture_issues': results['architecture_issues'],
            'similar_files': results['similar_files'],
            'recommendations': recommendations,
            'refactor_plan': self._create_refactor_plan(results),
            'risk_assessment': {
                'overall_risk': overall_risk,
                'risk_score': round(risk_score, 2),
                'risk_factors': {
                    'unused_files': unused_count,
                    'duplicate_groups': dup_groups,
                    'similar_groups': similar_groups
                }
            }
        }

    def _create_refactor_plan(self, results: Dict) -> List[Dict]:
        """Create phased refactoring plan"""
        plan = []
        
        # Phase 1
        phase1_tasks = []
        if results['unused_files']:
            safe_count = sum(1 for f in results['unused_files'] if f['potential_value']['score'] < 30)
            phase1_tasks.append(f"Remove {safe_count} safe-to-delete unused files")
        if results['duplicate_files']:
            phase1_tasks.append(f"Consolidate {len(results['duplicate_files'])} duplicate file groups")
        
        plan.append({
            'phase': 1,
            'name': 'Quick Wins & Cleanup',
            'tasks': phase1_tasks,
            'risk': 'LOW',
            'duration': '1-2 days'
        })
        
        # Phase 2
        phase2_tasks = []
        if results['duplicate_components']:
            phase2_tasks.append(f"Merge {len(results['duplicate_components'])} duplicate components")
        if results['duplicate_hooks']:
            phase2_tasks.append(f"Consolidate {len(results['duplicate_hooks'])} duplicate hooks")
        
        plan.append({
            'phase': 2,
            'name': 'Component Consolidation',
            'tasks': phase2_tasks,
            'risk': 'MEDIUM',
            'duration': '3-5 days'
        })
        
        # Phase 3
        phase3_tasks = [
            "Wire up unused services and utilities",
            "Refactor high-complexity components",
            "Improve maintainability scores"
        ]
        
        plan.append({
            'phase': 3,
            'name': 'Architecture Enhancement',
            'tasks': phase3_tasks,
            'risk': 'HIGH',
            'duration': '1-2 weeks'
        })
        
        return plan

    def _save_json_report(self, report: Dict[str, Any]):
        """Save JSON report"""
        json_path = self.report_dir / 'complete_analysis.json'
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False, default=str)

    def _save_component_report(self, results: Dict[str, Any]):
        """Save component-specific HTML report"""
        html_path = self.report_dir / 'components.html'
        
        html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Component Analysis Report</title>
    <style>
        body {{ font-family: sans-serif; background: #0f172a; color: #f1f5f9; padding: 20px; }}
        .container {{ max-width: 1200px; margin: 0 auto; }}
        h1 {{ color: #60a5fa; }}
        .stats {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin: 20px 0; }}
        .stat {{ background: #1e293b; padding: 15px; border-radius: 8px; }}
        .stat-value {{ font-size: 32px; font-weight: bold; color: #60a5fa; }}
        .stat-label {{ font-size: 13px; color: #94a3b8; }}
        .section {{ background: #1e293b; padding: 20px; margin: 15px 0; border-radius: 8px; }}
        .item {{ background: #0f172a; padding: 12px; margin: 8px 0; border-radius: 6px; }}
        .badge {{ padding: 4px 10px; border-radius: 4px; font-size: 11px; font-weight: 600; }}
        .badge-danger {{ background: #dc2626; color: white; }}
        .badge-warning {{ background: #d97706; color: white; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>⚛️  Component Analysis Report</h1>
        <p>Generated: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</p>
        
        <div class="stats">
            <div class="stat">
                <div class="stat-value">{results['total_components']}</div>
                <div class="stat-label">Total Components</div>
            </div>
            <div class="stat">
                <div class="stat-value">{len(results['unused_components'])}</div>
                <div class="stat-label">Unused Components</div>
            </div>
            <div class="stat">
                <div class="stat-value">{len(results['unwired_components'])}</div>
                <div class="stat-label">Unwired Components</div>
            </div>
        </div>
        
        <div class="section">
            <h2>🗑️ Unused Components</h2>
            {"".join(f'<div class="item"><strong>{c["name"]}</strong> in {c["file"]}:{c["line"]} <span class="badge badge-danger">{c["type"]}</span></div>' for c in results['unused_components'][:30])}
        </div>
        
        <div class="section">
            <h2>🔌 Unwired Components</h2>
            {"".join(f'<div class="item"><strong>{c["component"]}</strong> in {c["file"]} <span class="badge badge-warning">{c["reason"]}</span></div>' for c in results['unwired_components'][:30])}
        </div>
    </div>
</body>
</html>'''
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)

    def _save_unwired_report(self, unwired: List[Dict]):
        """Save unwired components HTML report"""
        html_path = self.report_dir / 'unwired_components.html'
        
        html = f'''<!DOCTYPE html>
<html lang="en">
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
            <div class="meta">File: {comp["file"]}:{comp.get("line", "?")}</div>
            <div class="meta">Type: {comp.get("type", "unknown")}</div>
            <div class="meta">Reason: {comp["reason"]}</div>
        </div>
        ''' for comp in unwired)}
    </div>
</body>
</html>'''
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)

    def _generate_ultimate_dashboard(self, report: Dict[str, Any]):
        """Generate comprehensive HTML dashboard"""
        html_path = self.report_dir / 'dashboard.html'
        
        html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>G-Studio Ultimate Analysis Dashboard</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%);
            color: #e2e8f0;
            line-height: 1.6;
            min-height: 100vh;
            padding: 20px;
        }}
        .container {{ max-width: 1600px; margin: 0 auto; }}
        .header {{
            background: linear-gradient(135deg, #6366f1, #8b5cf6);
            padding: 40px;
            border-radius: 16px;
            margin-bottom: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }}
        .header h1 {{ font-size: 36px; margin-bottom: 10px; }}
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        .stat-card {{
            background: #1e293b;
            padding: 25px;
            border-radius: 12px;
            border-left: 4px solid #6366f1;
            transition: transform 0.3s;
        }}
        .stat-card:hover {{ transform: translateY(-5px); }}
        .stat-value {{ font-size: 42px; font-weight: bold; color: #60a5fa; }}
        .stat-label {{ color: #94a3b8; font-size: 13px; margin-top: 5px; }}
        .section {{
            background: #1e293b;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 25px;
        }}
        .section h2 {{ color: #60a5fa; margin-bottom: 20px; }}
        .list-item {{
            padding: 15px;
            margin-bottom: 10px;
            background: #0f172a;
            border-radius: 8px;
            transition: all 0.2s;
        }}
        .list-item:hover {{ background: #1e293b; transform: translateX(5px); }}
        .badge {{
            padding: 5px 12px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 600;
            margin-left: 10px;
        }}
        .badge-danger {{ background: rgba(239, 68, 68, 0.2); color: #ef4444; }}
        .badge-warning {{ background: rgba(245, 158, 11, 0.2); color: #f59e0b; }}
        .badge-success {{ background: rgba(16, 185, 129, 0.2); color: #10b981; }}
        .footer {{
            margin-top: 50px;
            padding: 25px;
            text-align: center;
            border-top: 2px solid #334155;
            color: #94a3b8;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏗️ G-Studio Ultimate Analysis</h1>
            <p>Project: {report['project_root']}</p>
            <p>Generated: {report['timestamp']}</p>
            <p style="margin-top: 10px; padding: 8px 20px; background: rgba(239,68,68,0.2); border-radius: 20px; display: inline-block; font-weight: 600;">
                Risk: {report['risk_assessment']['overall_risk']} ({report['risk_assessment']['risk_score']})
            </p>
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
                <div class="stat-value">{len(report['unwired_components'])}</div>
                <div class="stat-label">Unwired Components</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{len(report['duplicate_components'])}</div>
                <div class="stat-label">Duplicate Components</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{report['summary']['avg_maintainability']:.0f}</div>
                <div class="stat-label">Avg Maintainability</div>
            </div>
        </div>
        
        <div class="section">
            <h2>🔌 Unwired Components ({len(report['unwired_components'])})</h2>
            {"".join(f'<div class="list-item"><strong>{c["component"]}</strong> in {c["file"]} <span class="badge badge-warning">{c["reason"]}</span></div>' for c in report['unwired_components'][:20])}
        </div>
        
        <div class="section">
            <h2>🗑️ Unused Components ({len(report['unused_components'])})</h2>
            {"".join(f'<div class="list-item"><strong>{c["name"]}</strong> in {c["file"]}:{c["line"]} <span class="badge badge-danger">{c["type"]}</span></div>' for c in report['unused_components'][:20])}
        </div>
        
        <div class="section">
            <h2>📝 Duplicate Components ({len(report['duplicate_components'])})</h2>
            {"".join(f'<div class="list-item"><strong>{c["name"]}</strong> <span class="badge badge-warning">{c["count"]} copies</span></div>' for c in report['duplicate_components'][:15])}
        </div>
        
        <div class="section">
            <h2>🎯 Recommendations</h2>
            {"".join(f'<div class="list-item"><strong>[{r["priority"].upper()}]</strong> {r["action"]}<br><small style="color: #94a3b8;">{r["impact"]}</small></div>' for r in report['recommendations'])}
        </div>
        
        <div class="footer">
            <p><strong>G-Studio Ultimate Analyzer</strong></p>
            <p style="font-size: 13px; color: #64748b; margin-top: 10px;">⚠️ Always backup before making changes</p>
        </div>
    </div>
</body>
</html>'''
        
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)

    def _display_summary(self, report: Dict[str, Any]):
        """Display analysis summary"""
        print("\n" + "=" * 70)
        print("📊 ANALYSIS SUMMARY")
        print("=" * 70)
        print(f"Total files:           {report['summary']['total_files']}")
        print(f"Total components:      {report['summary']['total_components']}")
        print(f"Unused components:     {len(report['unused_components'])}")
        print(f"Unwired components:    {len(report['unwired_components'])}")
        print(f"Duplicate components:  {len(report['duplicate_components'])}")
        print(f"Unused files:          {len(report['unused_files'])}")
        print(f"Risk level:            {report['risk_assessment']['overall_risk']}")
        print("=" * 70)

    # Placeholder methods for menu options
    def find_unused_files(self):
        print("\n🔍 Finding unused files...")
        self._scan_project()
        self._build_dependency_graph()
        unused = self._find_unused_files()
        print(f"\n📊 Found {len(unused)} unused files")
        for f in unused[:15]:
            print(f"  • {f['path']} ({f['lines']} lines)")
        input("\nPress Enter to continue...")

    def find_duplicates(self):
        print("\n🔍 Finding duplicates...")
        self._scan_project()
        duplicates = self._find_duplicate_files()
        print(f"\n📊 Found {len(duplicates)} duplicate groups")
        for d in duplicates[:10]:
            print(f"  • {d['count']} copies, save {d['potential_savings']:,} bytes")
        input("\nPress Enter to continue...")

    def analyze_architecture(self):
        print("\n🔍 Analyzing architecture...")
        self._scan_project()
        self._build_dependency_graph()
        issues = self._analyze_architecture_issues()
        print(f"\n📊 Architecture Issues:")
        print(f"  Unwired services:      {len(issues['unwired_services'])}")
        print(f"  Dead utilities:        {len(issues['dead_utilities'])}")
        print(f"  Multiple layouts:      {len(issues['multiple_layouts'])}")
        input("\nPress Enter to continue...")

    def show_statistics(self):
        print("\n🔍 Calculating statistics...")
        self._scan_project()
        stats = self._get_statistics()
        print(f"\n📊 PROJECT STATISTICS")
        print(f"  Total files:           {stats['total_files']}")
        print(f"  Total components:      {stats['total_components']}")
        print(f"  Total hooks:           {stats['total_hooks']}")
        print(f"  Avg complexity:        {stats['avg_complexity']:.1f}")
        print(f"  Avg maintainability:   {stats['avg_maintainability']:.1f}/100")
        input("\nPress Enter to continue...")

    def generate_refactor_plan(self):
        print("\n🔍 Generating refactoring plan...")
        self._scan_project()
        self._build_dependency_graph()
        results = self._generate_full_analysis()
        plan = self._create_refactor_plan(results)
        print(f"\n🎯 REFACTORING ROADMAP")
        for phase in plan:
            print(f"\nPhase {phase['phase']}: {phase['name']}")
            print(f"  Duration: {phase['duration']} | Risk: {phase['risk']}")
            for task in phase['tasks']:
                print(f"    • {task}")
        input("\nPress Enter to continue...")

    def export_dashboard(self):
        print("\n🔍 Generating dashboard...")
        self._scan_project()
        self._build_dependency_graph()
        self._analyze_component_usage()
        results = self._generate_full_analysis()
        report = self._create_unified_report(results)
        self._save_json_report(report)
        self._generate_ultimate_dashboard(report)
        print(f"\n✅ Dashboard exported!")
        print(f"   JSON: {self.report_dir / 'complete_analysis.json'}")
        print(f"   HTML: {self.report_dir / 'dashboard.html'}")
        input("\nPress Enter to continue...")


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="G-Studio Ultimate Component & Architecture Analyzer")
    parser.add_argument('path', nargs='?', default='.', help='Project path')
    parser.add_argument('--reports', default='reports', help='Reports directory')
    parser.add_argument('--no-menu', action='store_true', help='Skip menu and run full analysis')
    
    args = parser.parse_args()
    
    try:
        analyzer = UnifiedAnalyzer(args.path, args.reports)
        
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