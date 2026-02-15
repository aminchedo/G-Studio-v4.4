#!/usr/bin/env python3
"""
G-Studio Ultimate Component Analyzer
Advanced detection of unwired, unused, and duplicate components with rich reporting
"""

import os
import re
import json
import hashlib
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
    used_hooks: List[str] = field(default_factory=list)
    props_interface: Optional[str] = None


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
    maintainability: float
    content_hash: str
    dependencies: Set[str] = field(default_factory=set)
    dependents: Set[str] = field(default_factory=set)
    last_modified: float = 0
    used_components: Set[str] = field(default_factory=set)
    used_hooks: Set[str] = field(default_factory=set)


class GStudioUltimateAnalyzer:
    """Ultimate analyzer combining all best features"""
    
    def __init__(self, project_root: str, reports_base: str = "reports"):
        self.root = Path(project_root).resolve()
        self.files: Dict[str, FileInfo] = {}
        self.all_components: Dict[str, List[ComponentInfo]] = defaultdict(list)
        self.all_hooks: Dict[str, List[str]] = defaultdict(list)
        self.component_usage: Dict[str, Set[str]] = defaultdict(set)
        self.hook_usage: Dict[str, Set[str]] = defaultdict(set)
        self.import_map: Dict[str, Set[str]] = defaultdict(set)
        self.reverse_import_map: Dict[str, Set[str]] = defaultdict(set)
        
        # Centralized reports with timestamp
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        self.report_dir = Path(reports_base) / timestamp
        self.report_dir.mkdir(parents=True, exist_ok=True)
        
        self.exclude_dirs = {
            'node_modules', '__pycache__', '.git', 'dist', 'build', 'coverage',
            '.next', '.nuxt', '.vite', '.cache', '.idea', '.vscode', '.turbo',
            'backups', 'backup', '.backup', '__archive__', '.codefixer_backups',
            'public', '.parcel-cache', 'reports'
        }
        
        self.exclude_patterns = [
            r'\.backup', r'\.bak$', r'~$', r'\.swp$', r'backup_\d+',
            r'_backup', r'\.old$', r'\.orig$', r'\.test\.', r'\.spec\.',
            r'\.stories\.', r'\.d\.ts$'
        ]

    # ============================================
    # INTERACTIVE MENU SYSTEM
    # ============================================
    
    def show_menu(self):
        """Enhanced interactive menu"""
        while True:
            self._clear_screen()
            self._print_header()
            
            print(f"\n📁 Project: {self.root}")
            print(f"📂 Reports: {self.report_dir}")
            print()
            
            menu_items = [
                ("1", "🔍", "Full Analysis", "Complete scan with all reports"),
                ("2", "⚛️", "Component Analysis", "Deep component analysis"),
                ("3", "🗑️", "Unused Components", "Find unused React components"),
                ("4", "🔌", "Unwired Components", "Components not imported anywhere"),
                ("5", "📝", "Duplicate Components", "Multiple component definitions"),
                ("6", "🪝", "Hook Analysis", "Custom hooks usage analysis"),
                ("7", "📦", "Orphan Files", "Files with no dependents"),
                ("8", "🔄", "Duplicate Files", "Identical file content"),
                ("9", "📊", "Project Statistics", "Metrics and complexity"),
                ("r", "🎯", "Refactoring Plan", "Step-by-step roadmap"),
                ("h", "📈", "HTML Dashboard", "Generate visual report"),
                ("0", "🚪", "Exit", "Close analyzer"),
            ]
            
            self._print_menu(menu_items)
            
            choice = input("\n💡 Select option: ").strip().lower()
            
            if choice == '1':
                self.run_full_analysis()
            elif choice == '2':
                self.run_component_analysis()
            elif choice == '3':
                self.analyze_unused_components()
            elif choice == '4':
                self.analyze_unwired_components()
            elif choice == '5':
                self.analyze_duplicate_components()
            elif choice == '6':
                self.analyze_hooks()
            elif choice == '7':
                self.analyze_orphan_files()
            elif choice == '8':
                self.analyze_duplicate_files()
            elif choice == '9':
                self.show_statistics()
            elif choice == 'r':
                self.show_refactor_plan()
            elif choice == 'h':
                self.generate_html_dashboard()
            elif choice == '0':
                print(f"\n👋 Analysis complete! Reports saved to: {self.report_dir}")
                break
            else:
                print("\n❌ Invalid option!")
                input("Press Enter to continue...")
    
    def _print_header(self):
        """Print attractive header"""
        print("╔" + "═" * 78 + "╗")
        print("║" + " " * 18 + "🏗️  G-STUDIO ULTIMATE ANALYZER" + " " * 28 + "║")
        print("║" + " " * 15 + "Advanced Component & Architecture Analysis" + " " * 19 + "║")
        print("╚" + "═" * 78 + "╝")
    
    def _print_menu(self, items: List[Tuple]):
        """Print formatted menu"""
        print("┌" + "─" * 78 + "┐")
        for key, icon, title, desc in items:
            print(f"│  [{key:>1}] {icon}  {title:<28} {desc:<35} │")
        print("└" + "─" * 78 + "┘")
    
    def _clear_screen(self):
        os.system('cls' if os.name == 'nt' else 'clear')

    # ============================================
    # MAIN ANALYSIS WORKFLOWS
    # ============================================
    
    def run_full_analysis(self):
        """Complete comprehensive analysis"""
        print("\n" + "=" * 80)
        print("🔍 STARTING COMPREHENSIVE ANALYSIS")
        print("=" * 80)
        
        print("\n[1/6] 📂 Scanning project files...")
        self._scan_project()
        print(f"      ✅ Scanned {len(self.files)} files")
        
        print("\n[2/6] 🔗 Building dependency graph...")
        self._build_dependency_graph()
        print("      ✅ Dependency graph complete")
        
        print("\n[3/6] 🧩 Analyzing component usage...")
        self._analyze_component_usage()
        print("      ✅ Component analysis complete")
        
        print("\n[4/6] 📊 Generating analysis results...")
        results = self._generate_comprehensive_analysis()
        print("      ✅ Analysis complete")
        
        print("\n[5/6] 💾 Saving reports...")
        report = self._create_comprehensive_report(results)
        self._save_json_report(report)
        print(f"      ✅ JSON saved")
        
        print("\n[6/6] 🎨 Creating HTML dashboard...")
        self._generate_html_dashboard_full(report)
        print(f"      ✅ Dashboard created")
        
        print("\n" + "=" * 80)
        print("✅ ANALYSIS COMPLETE")
        print("=" * 80)
        
        self._display_summary(report)
        
        print(f"\n📂 All reports saved to: {self.report_dir}")
        print(f"   • JSON Report:     {self.report_dir / 'full_analysis.json'}")
        print(f"   • HTML Dashboard:  {self.report_dir / 'dashboard.html'}")
        
        input("\nPress Enter to continue...")
    
    def run_component_analysis(self):
        """Deep component-focused analysis"""
        print("\n🔍 Running component analysis...")
        
        if not self.files:
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
                # Fixed: Use 'component' key instead of 'name'
                print(f"   • {comp['component']} in {comp['file']}")
                print(f"     Type: {comp.get('type', 'unknown')} | Line: {comp.get('line', '?')}")
                print(f"     Reason: {comp['reason']}")
        
        if results['duplicate_components']:
            print(f"\n📝 Duplicate Components (top 10):")
            for comp in results['duplicate_components'][:10]:
                print(f"   • {comp['name']} ({comp['count']} definitions)")
                for loc in comp['locations'][:3]:
                    print(f"     - {loc['file']}:{loc['line']}")
        
        # Save detailed report
        self._save_component_report(results)
        print(f"\n📄 Detailed report: {self.report_dir / 'components.html'}")
        
        input("\nPress Enter to continue...")
    
    def analyze_unused_components(self):
        """Find unused React components"""
        print("\n🔍 Analyzing unused components...")
        
        if not self.files:
            self._scan_project()
            self._build_dependency_graph()
            self._analyze_component_usage()
        
        unused = self._find_unused_components()
        
        print(f"\n📊 Found {len(unused)} unused components")
        print("=" * 80)
        
        # Categorize by severity
        high = [c for c in unused if c['severity'] == 'high']
        medium = [c for c in unused if c['severity'] == 'medium']
        low = [c for c in unused if c['severity'] == 'low']
        
        if high:
            print(f"\n🔴 High Priority ({len(high)} components):")
            for comp in high[:10]:
                print(f"   • {comp['name']} ({comp['type']})")
                print(f"     File: {comp['file']}:{comp['line']}")
        
        if medium:
            print(f"\n🟡 Medium Priority ({len(medium)} components):")
            for comp in medium[:10]:
                print(f"   • {comp['name']} in {comp['file']}")
        
        if low:
            print(f"\n🟢 Low Priority ({len(low)} components)")
        
        self._save_html_report('unused_components', unused, 'Unused Components')
        print(f"\n📄 Detailed report: {self.report_dir / 'unused_components.html'}")
        
        input("\nPress Enter to continue...")
    
    def analyze_unwired_components(self):
        """Find components not imported anywhere"""
        print("\n🔍 Scanning for unwired components...")
        
        if not self.files:
            self._scan_project()
            self._build_dependency_graph()
            self._analyze_component_usage()
        
        unwired = self._find_unwired_components()
        
        print(f"\n📊 Found {len(unwired)} unwired components")
        print("=" * 80)
        
        for comp in unwired[:20]:
            print(f"\n⚛️  {comp['component']}")
            print(f"   File: {comp['file']}:{comp.get('line', '?')}")
            print(f"   Type: {comp.get('type', 'unknown')}")
            print(f"   Reason: {comp['reason']}")
            if comp.get('suggestion'):
                print(f"   💡 {comp['suggestion']}")
        
        if len(unwired) > 20:
            print(f"\n... and {len(unwired) - 20} more")
        
        self._save_html_report('unwired_components', unwired, 'Unwired Components')
        print(f"\n📄 Detailed report: {self.report_dir / 'unwired_components.html'}")
        
        input("\nPress Enter to continue...")
    
    def analyze_duplicate_components(self):
        """Find duplicate component definitions"""
        print("\n🔍 Analyzing duplicate components...")
        
        if not self.files:
            self._scan_project()
            self._build_dependency_graph()
        
        duplicates = self._find_duplicate_components()
        
        print(f"\n📊 Found {len(duplicates)} duplicate component names")
        print("=" * 80)
        
        for dup in duplicates[:15]:
            print(f"\n📦 {dup['name']} ({dup['count']} definitions)")
            for loc in dup['locations'][:5]:
                print(f"   • {loc['file']}:{loc['line']} ({loc['type']})")
        
        self._save_html_report('duplicate_components', duplicates, 'Duplicate Components')
        print(f"\n📄 Detailed report: {self.report_dir / 'duplicate_components.html'}")
        
        input("\nPress Enter to continue...")
    
    def analyze_hooks(self):
        """Analyze custom hooks"""
        print("\n🔍 Analyzing custom hooks...")
        
        if not self.files:
            self._scan_project()
            self._build_dependency_graph()
            self._analyze_component_usage()
        
        unused_hooks = self._find_unused_hooks()
        duplicate_hooks = self._find_duplicate_hooks()
        
        print(f"\n📊 Hook Analysis Results")
        print("=" * 80)
        print(f"   • Total hooks: {sum(len(h) for h in self.all_hooks.values())}")
        print(f"   • Unused hooks: {len(unused_hooks)}")
        print(f"   • Duplicate hooks: {len(duplicate_hooks)}")
        
        if unused_hooks:
            print(f"\n🗑️  Unused Hooks ({len(unused_hooks)}):")
            for hook in unused_hooks[:10]:
                print(f"   • {hook['name']} in {hook['file']}")
        
        if duplicate_hooks:
            print(f"\n📝 Duplicate Hooks ({len(duplicate_hooks)}):")
            for hook in duplicate_hooks[:10]:
                print(f"   • {hook['name']} ({hook['count']} definitions)")
        
        self._save_html_report('hooks_analysis', {'unused': unused_hooks, 'duplicates': duplicate_hooks}, 'Hooks Analysis')
        print(f"\n📄 Detailed report: {self.report_dir / 'hooks_analysis.html'}")
        
        input("\nPress Enter to continue...")
    
    def analyze_orphan_files(self):
        """Find files with no dependents"""
        print("\n🔍 Analyzing orphan files...")
        
        if not self.files:
            self._scan_project()
            self._build_dependency_graph()
        
        orphans = self._find_orphan_files()
        
        print(f"\n📊 Found {len(orphans)} orphan files")
        print("=" * 80)
        
        for orphan in orphans[:20]:
            print(f"\n📄 {orphan['path']}")
            print(f"   {orphan['lines']} lines • {orphan['size']:,} bytes")
            if orphan.get('components'):
                print(f"   Components: {', '.join(orphan['components'][:3])}")
        
        self._save_html_report('orphan_files', orphans, 'Orphan Files')
        print(f"\n📄 Detailed report: {self.report_dir / 'orphan_files.html'}")
        
        input("\nPress Enter to continue...")
    
    def analyze_duplicate_files(self):
        """Find files with identical content"""
        print("\n🔍 Analyzing duplicate files...")
        
        if not self.files:
            self._scan_project()
        
        duplicates = self._find_duplicate_files()
        
        total_savings = sum(d['savings_potential'] for d in duplicates)
        
        print(f"\n📊 Found {len(duplicates)} duplicate file groups")
        print(f"💾 Potential savings: {total_savings:,} bytes")
        print("=" * 80)
        
        for dup in duplicates[:10]:
            print(f"\n📦 Group {dup['group_id']} ({dup['count']} files)")
            print(f"   Savings: {dup['savings_potential']:,} bytes")
            for file in dup['files'][:3]:
                print(f"   • {file['path']}")
        
        self._save_html_report('duplicate_files', duplicates, 'Duplicate Files')
        print(f"\n📄 Detailed report: {self.report_dir / 'duplicate_files.html'}")
        
        input("\nPress Enter to continue...")
    
    def show_statistics(self):
        """Display project statistics"""
        print("\n📊 Generating project statistics...")
        
        if not self.files:
            self._scan_project()
            self._build_dependency_graph()
        
        stats = self._get_comprehensive_stats()
        
        print("\n" + "=" * 80)
        print("📈 PROJECT STATISTICS")
        print("=" * 80)
        
        print(f"\n📁 Files & Code:")
        print(f"   • Total files: {stats['total_files']}")
        print(f"   • Total lines: {stats['total_lines']:,}")
        print(f"   • Total size: {stats['total_size']:,} bytes")
        
        print(f"\n⚛️  Components & Hooks:")
        print(f"   • Total components: {stats['total_components']}")
        print(f"   • Total hooks: {stats['total_hooks']}")
        
        print(f"\n📊 Complexity:")
        print(f"   • Average complexity: {stats['avg_complexity']:.1f}")
        print(f"   • Max complexity: {stats['max_complexity']}")
        print(f"   • Average maintainability: {stats['avg_maintainability']:.1f}")
        
        print(f"\n🔗 Dependencies:")
        print(f"   • Orphaned files: {stats['orphaned_files']}")
        print(f"   • Highly connected: {stats['highly_connected']}")
        
        input("\nPress Enter to continue...")
    
    def show_refactor_plan(self):
        """Generate refactoring roadmap"""
        print("\n🎯 Generating refactoring plan...")
        
        if not self.files:
            self._scan_project()
            self._build_dependency_graph()
            self._analyze_component_usage()
        
        results = self._generate_comprehensive_analysis()
        plan = self._create_refactor_plan(results)
        
        print("\n" + "=" * 80)
        print("🎯 REFACTORING ROADMAP")
        print("=" * 80)
        
        for phase in plan:
            risk_colors = {'LOW': '🟢', 'MEDIUM': '🟡', 'HIGH': '🔴'}
            print(f"\n{risk_colors.get(phase['risk'], '⚪')} PHASE {phase['phase']}: {phase['name']}")
            print(f"   Risk: {phase['risk']} | Duration: {phase['duration']}")
            print(f"   Tasks:")
            for task in phase['tasks']:
                print(f"      • {task}")
        
        self._save_html_report('refactor_plan', plan, 'Refactoring Plan')
        print(f"\n📄 Detailed plan: {self.report_dir / 'refactor_plan.html'}")
        
        input("\nPress Enter to continue...")
    
    def generate_html_dashboard(self):
        """Generate standalone HTML dashboard"""
        print("\n🎨 Generating HTML dashboard...")
        
        if not self.files:
            self._scan_project()
            self._build_dependency_graph()
            self._analyze_component_usage()
        
        results = self._generate_comprehensive_analysis()
        report = self._create_comprehensive_report(results)
        self._generate_html_dashboard_full(report)
        
        print(f"\n✅ Dashboard created: {self.report_dir / 'dashboard.html'}")
        
        input("\nPress Enter to continue...")

    # ============================================
    # FILE SCANNING & ANALYSIS
    # ============================================
    
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
                except Exception:
                    pass
    
    def _analyze_file(self, path: Path, rel_path: str) -> Optional[FileInfo]:
        """Analyze single file"""
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
        
        # Register components and hooks
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
            maintainability=maintainability,
            content_hash=content_hash,
            last_modified=path.stat().st_mtime,
            used_components=used_components,
            used_hooks=used_hooks
        )
    
    def _detect_file_type(self, path: Path) -> str:
        ext = path.suffix.lower()
        return {'.tsx': 'react-ts', '.jsx': 'react', '.ts': 'typescript', 
                '.js': 'javascript', '.mjs': 'module'}.get(ext, 'unknown')
    
    def _extract_imports(self, content: str) -> List[Dict[str, Any]]:
        """Extract import statements"""
        imports = []
        
        # ES6 imports
        pattern = r"import\s+(?:(\{[^}]+\})|(\*\s+as\s+\w+)|(\w+))?\s*,?\s*(?:(\{[^}]+\})|(\w+))?\s*from\s+['\"]([^'\"]+)['\"]"
        for match in re.finditer(pattern, content):
            source = match.group(6)
            import_info = {'source': source, 'named': [], 'default': None, 'namespace': None}
            imports.append(import_info)
        
        return imports
    
    def _extract_exports(self, content: str) -> Tuple[List[str], Optional[str]]:
        """Extract exports"""
        exports = []
        default_export = None
        
        exports.extend(re.findall(r"export\s+(?:const|let|var|function|class)\s+(\w+)", content))
        
        match = re.search(r"export\s+default\s+(?:function|class)?\s*(\w+)", content)
        if match:
            default_export = match.group(1)
        
        return list(set(exports)), default_export
    
    def _extract_functions(self, content: str) -> List[str]:
        patterns = [
            r"function\s+(\w+)\s*\(",
            r"const\s+(\w+)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>",
        ]
        functions = []
        for pattern in patterns:
            functions.extend(re.findall(pattern, content))
        return list(set(functions))
    
    def _extract_classes(self, content: str) -> List[str]:
        return list(set(re.findall(r"class\s+(\w+)", content)))
    
    def _extract_components(self, content: str, file_path: str) -> List[ComponentInfo]:
        """Extract React components"""
        components = []
        
        # Function components
        func_pattern = r"(?:export\s+)?(?:default\s+)?function\s+([A-Z]\w*)\s*\("
        for match in re.finditer(func_pattern, content):
            name = match.group(1)
            line_num = content[:match.start()].count('\n') + 1
            is_exported = 'export' in content[max(0, match.start()-20):match.start()+20]
            is_default = 'default' in content[max(0, match.start()-20):match.start()+20]
            
            components.append(ComponentInfo(
                name=name, file_path=file_path, component_type='function',
                line_number=line_num, is_exported=is_exported, is_default_export=is_default
            ))
        
        # Arrow components
        arrow_pattern = r"(?:export\s+)?(?:default\s+)?const\s+([A-Z]\w*)\s*(?::\s*(?:React\.)?FC)?\s*=\s*(?:\([^)]*\)|[^=])\s*=>"
        for match in re.finditer(arrow_pattern, content):
            name = match.group(1)
            if name not in [c.name for c in components]:
                line_num = content[:match.start()].count('\n') + 1
                is_exported = 'export' in content[max(0, match.start()-20):match.start()+20]
                is_default = 'default' in content[max(0, match.start()-20):match.start()+20]
                
                components.append(ComponentInfo(
                    name=name, file_path=file_path, component_type='arrow',
                    line_number=line_num, is_exported=is_exported, is_default_export=is_default
                ))
        
        return components
    
    def _extract_hooks(self, content: str) -> List[str]:
        return list(set(re.findall(r"(?:export\s+)?(?:const|function)\s+(use[A-Z]\w*)", content)))
    
    def _extract_used_components(self, content: str) -> Set[str]:
        return set(re.findall(r"<([A-Z]\w*)(?:\s|>|/)", content))
    
    def _extract_used_hooks(self, content: str) -> Set[str]:
        return set(re.findall(r'\b(use[A-Z]\w*)\s*\(', content))
    
    def _calculate_complexity(self, content: str) -> int:
        complexity = 1
        for pattern in [r'\bif\s*\(', r'\bfor\s*\(', r'\bwhile\s*\(', r'&&', r'\|\|', r'\?\?']:
            complexity += len(re.findall(pattern, content))
        return complexity
    
    def _calculate_maintainability(self, content: str, complexity: int) -> float:
        lines = content.count('\n') + 1
        if lines == 0:
            return 100.0
        volume = len(content)
        effort = volume * complexity
        maintainability = max(0, min(100, 171 - 5.2 * (effort ** 0.23) - 0.23 * complexity - 16.2 * (lines ** 0.5)))
        return round(maintainability, 1)

    # ============================================
    # DEPENDENCY GRAPH
    # ============================================
    
    def _build_dependency_graph(self):
        """Build dependency graph"""
        for file_path, file_info in self.files.items():
            file_dir = Path(file_path).parent
            
            for imp in file_info.imports:
                source = imp['source']
                if not source.startswith('.'):
                    continue
                
                resolved = self._resolve_import(source, file_dir)
                if resolved and resolved in self.files:
                    self.import_map[file_path].add(resolved)
                    self.reverse_import_map[resolved].add(file_path)
                    file_info.dependencies.add(resolved)
                    self.files[resolved].dependents.add(file_path)
    
    def _resolve_import(self, source: str, from_dir: Path) -> Optional[str]:
        """Resolve relative import"""
        resolved = (from_dir / source).resolve()
        
        for ext in ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx']:
            check_path = str(resolved.with_suffix('')) + ext
            try:
                rel_path = str(Path(check_path).relative_to(self.root))
                if rel_path in self.files:
                    return rel_path
            except:
                pass
        return None
    
    def _analyze_component_usage(self):
        """Track component and hook usage"""
        for file_path, file_info in self.files.items():
            for comp_name in file_info.used_components:
                self.component_usage[comp_name].add(file_path)
            for hook_name in file_info.used_hooks:
                self.hook_usage[hook_name].add(file_path)

    # ============================================
    # ANALYSIS FUNCTIONS
    # ============================================
    
    def _generate_comprehensive_analysis(self) -> Dict[str, Any]:
        """Generate complete analysis"""
        return {
            'unused_components': self._find_unused_components(),
            'unwired_components': self._find_unwired_components(),
            'duplicate_components': self._find_duplicate_components(),
            'orphan_files': self._find_orphan_files(),
            'unused_hooks': self._find_unused_hooks(),
            'duplicate_hooks': self._find_duplicate_hooks(),
            'duplicate_files': self._find_duplicate_files(),
            'stats': self._get_comprehensive_stats()
        }
    
    def _generate_component_analysis(self) -> Dict[str, Any]:
        """Generate component-focused analysis"""
        return {
            'total_components': sum(len(c) for c in self.all_components.values()),
            'total_hooks': sum(len(h) for h in self.all_hooks.values()),
            'unused_components': self._find_unused_components(),
            'unwired_components': self._find_unwired_components(),
            'duplicate_components': self._find_duplicate_components(),
            'unused_hooks': self._find_unused_hooks()
        }
    
    def _find_unused_components(self) -> List[Dict]:
        """Find unused components"""
        unused = []
        entry_patterns = ['index', 'main', 'app', 'App', 'entry', 'root']
        
        for comp_name, comp_list in self.all_components.items():
            for comp in comp_list:
                if any(p in comp.file_path.lower() for p in entry_patterns):
                    continue
                
                usage_files = self.component_usage.get(comp_name, set())
                external_usage = usage_files - {comp.file_path}
                
                if not external_usage and comp.is_exported:
                    severity = 'high' if comp.is_exported and not comp.is_default_export else 'medium'
                    unused.append({
                        'name': comp_name,
                        'file': comp.file_path,
                        'line': comp.line_number,
                        'type': comp.component_type,
                        'is_default': comp.is_default_export,
                        'severity': severity
                    })
        
        return sorted(unused, key=lambda x: x['severity'], reverse=True)
    
    def _find_unwired_components(self) -> List[Dict]:
        """Find unwired components"""
        unwired = []
        
        for comp_name, comp_list in self.all_components.items():
            for comp in comp_list:
                if not comp.is_exported:
                    usage_files = self.component_usage.get(comp_name, set())
                    if not usage_files or comp.file_path not in usage_files:
                        unwired.append({
                            'component': comp_name,
                            'file': comp.file_path,
                            'line': comp.line_number,
                            'type': comp.component_type,
                            'reason': 'Not exported and not used',
                            'suggestion': 'Export if needed or remove'
                        })
                elif len(self.files[comp.file_path].dependents) == 0:
                    unwired.append({
                        'component': comp_name,
                        'file': comp.file_path,
                        'line': comp.line_number,
                        'type': comp.component_type,
                        'reason': 'Exported but file has no imports',
                        'suggestion': 'Check dynamic imports or remove'
                    })
        
        return unwired
    
    def _find_duplicate_components(self) -> List[Dict]:
        """Find duplicate components"""
        duplicates = []
        
        for comp_name, comp_list in self.all_components.items():
            if len(comp_list) > 1:
                duplicates.append({
                    'name': comp_name,
                    'count': len(comp_list),
                    'locations': [
                        {'file': c.file_path, 'line': c.line_number, 'type': c.component_type}
                        for c in comp_list
                    ]
                })
        
        return sorted(duplicates, key=lambda x: x['count'], reverse=True)
    
    def _find_orphan_files(self) -> List[Dict]:
        """Find orphan files"""
        orphans = []
        entry_patterns = ['index', 'main', 'app']
        
        for file_path, file_info in self.files.items():
            if any(p in file_path.lower() for p in entry_patterns):
                continue
            
            if not file_info.dependents and (file_info.exports or file_info.default_export):
                orphans.append({
                    'path': file_path,
                    'type': file_info.file_type,
                    'size': file_info.size,
                    'lines': file_info.lines,
                    'components': [c.name for c in file_info.components]
                })
        
        return sorted(orphans, key=lambda x: x['size'], reverse=True)
    
    def _find_unused_hooks(self) -> List[Dict]:
        """Find unused hooks"""
        unused = []
        
        for hook_name, hook_files in self.all_hooks.items():
            for hook_file in hook_files:
                usage_files = self.hook_usage.get(hook_name, set())
                external_usage = usage_files - {hook_file}
                
                if not external_usage:
                    unused.append({'name': hook_name, 'file': hook_file})
        
        return unused
    
    def _find_duplicate_hooks(self) -> List[Dict]:
        """Find duplicate hooks"""
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
        """Find duplicate files"""
        hash_map = defaultdict(list)
        for file_info in self.files.values():
            hash_map[file_info.content_hash].append(file_info)
        
        duplicates = []
        for group_id, files in enumerate(hash_map.values()):
            if len(files) > 1:
                duplicates.append({
                    'group_id': group_id,
                    'count': len(files),
                    'files': [{'path': f.path, 'size': f.size} for f in files],
                    'savings_potential': (len(files) - 1) * files[0].size
                })
        
        return sorted(duplicates, key=lambda x: x['savings_potential'], reverse=True)
    
    def _get_comprehensive_stats(self) -> Dict:
        """Get project stats"""
        complexities = [f.complexity for f in self.files.values()]
        maintainabilities = [f.maintainability for f in self.files.values()]
        
        return {
            'total_files': len(self.files),
            'total_lines': sum(f.lines for f in self.files.values()),
            'total_size': sum(f.size for f in self.files.values()),
            'total_components': sum(len(c) for c in self.all_components.values()),
            'total_hooks': sum(len(h) for h in self.all_hooks.values()),
            'avg_complexity': round(statistics.mean(complexities), 1) if complexities else 0,
            'max_complexity': max(complexities) if complexities else 0,
            'avg_maintainability': round(statistics.mean(maintainabilities), 1) if maintainabilities else 0,
            'orphaned_files': sum(1 for f in self.files.values() if not f.dependents),
            'highly_connected': sum(1 for f in self.files.values() if len(f.dependents) > 10)
        }
    
    def _create_refactor_plan(self, results: Dict) -> List[Dict]:
        """Create refactoring plan"""
        return [
            {
                'phase': 1,
                'name': 'Quick Wins',
                'tasks': [f"Remove {len(results['unused_components'])} unused components"],
                'risk': 'LOW',
                'duration': '1-2 days'
            },
            {
                'phase': 2,
                'name': 'Component Consolidation',
                'tasks': [f"Merge {len(results['duplicate_components'])} duplicates"],
                'risk': 'MEDIUM',
                'duration': '3-5 days'
            },
            {
                'phase': 3,
                'name': 'Architecture Enhancement',
                'tasks': ['Refactor high-complexity components'],
                'risk': 'HIGH',
                'duration': '1-2 weeks'
            }
        ]

    # ============================================
    # REPORT GENERATION
    # ============================================
    
    def _create_comprehensive_report(self, results: Dict) -> Dict:
        """Create comprehensive report"""
        return {
            'timestamp': datetime.now().isoformat(),
            'project_root': str(self.root),
            'summary': results['stats'],
            'unused_components': results['unused_components'],
            'unwired_components': results['unwired_components'],
            'duplicate_components': results['duplicate_components'],
            'orphan_files': results['orphan_files'],
            'unused_hooks': results['unused_hooks'],
            'duplicate_hooks': results['duplicate_hooks'],
            'duplicate_files': results['duplicate_files'],
            'refactor_plan': self._create_refactor_plan(results)
        }
    
    def _save_json_report(self, report: Dict):
        """Save JSON report"""
        json_path = self.report_dir / 'full_analysis.json'
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False, default=str)
    
    def _display_summary(self, report: Dict):
        """Display summary"""
        print("\n📊 ANALYSIS SUMMARY")
        print("=" * 80)
        print(f"   • Unused Components: {len(report['unused_components'])}")
        print(f"   • Unwired Components: {len(report['unwired_components'])}")
        print(f"   • Duplicate Components: {len(report['duplicate_components'])}")
        print(f"   • Orphan Files: {len(report['orphan_files'])}")
    
    def _save_component_report(self, results: Dict):
        """Save component analysis HTML report"""
        html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Component Analysis</title>
    <style>
        body {{ font-family: sans-serif; background: #0f172a; color: #f1f5f9; padding: 20px; }}
        .container {{ max-width: 1200px; margin: 0 auto; }}
        h1 {{ color: #60a5fa; }}
        .stat {{ background: #1e293b; padding: 15px; margin: 10px 0; border-radius: 8px; }}
        .item {{ background: #0f172a; padding: 10px; margin: 5px 0; border-radius: 6px; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>⚛️  Component Analysis Report</h1>
        <div class="stat">Total Components: {results['total_components']}</div>
        <div class="stat">Unused: {len(results['unused_components'])}</div>
        <div class="stat">Unwired: {len(results['unwired_components'])}</div>
        <div class="stat">Duplicates: {len(results['duplicate_components'])}</div>
        
        <h2>Unused Components</h2>
        {"".join(f'<div class="item">{c["name"]} - {c["file"]}</div>' for c in results['unused_components'][:50])}
        
        <h2>Unwired Components</h2>
        {"".join(f'<div class="item">{c["component"]} - {c["file"]}<br><small>{c["reason"]}</small></div>' for c in results['unwired_components'][:50])}
    </div>
</body>
</html>'''
        
        with open(self.report_dir / 'components.html', 'w', encoding='utf-8') as f:
            f.write(html)

    # ============================================
    # HTML GENERATION
    # ============================================
    
    def _generate_html_dashboard_full(self, report: Dict):
        """Generate HTML dashboard"""
        html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>G-Studio Analysis Dashboard</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{ font-family: -apple-system, sans-serif; background: #0f172a; color: #f1f5f9; padding: 20px; }}
        .container {{ max-width: 1400px; margin: 0 auto; }}
        .header {{ background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 30px; border-radius: 12px; margin-bottom: 20px; }}
        .header h1 {{ font-size: 32px; }}
        .stats {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; }}
        .stat-card {{ background: #1e293b; padding: 20px; border-radius: 8px; }}
        .stat-value {{ font-size: 36px; color: #60a5fa; font-weight: bold; }}
        .stat-label {{ color: #94a3b8; font-size: 13px; margin-top: 5px; }}
        .section {{ background: #1e293b; padding: 20px; border-radius: 8px; margin-bottom: 15px; }}
        .section h2 {{ color: #60a5fa; margin-bottom: 15px; }}
        .item {{ padding: 10px; background: #0f172a; margin: 8px 0; border-radius: 6px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏗️ G-Studio Analysis Dashboard</h1>
            <p>Generated: {report['timestamp']}</p>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <div class="stat-value">{report['summary']['total_files']}</div>
                <div class="stat-label">Total Files</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{len(report['unused_components'])}</div>
                <div class="stat-label">Unused Components</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{len(report['unwired_components'])}</div>
                <div class="stat-label">Unwired Components</div>
            </div>
        </div>
        
        <div class="section">
            <h2>🗑️ Unused Components</h2>
            {"".join(f'<div class="item">{c["name"]} - {c["file"]}</div>' for c in report['unused_components'][:30])}
        </div>
        
        <div class="section">
            <h2>🔌 Unwired Components</h2>
            {"".join(f'<div class="item">{c["component"]} - {c["file"]}</div>' for c in report['unwired_components'][:30])}
        </div>
    </div>
</body>
</html>'''
        
        html_path = self.report_dir / 'dashboard.html'
        with open(html_path, 'w', encoding='utf-8') as f:
            f.write(html)
    
    def _save_html_report(self, name: str, data: Any, title: str):
        """Save individual HTML report"""
        html = f'''<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>{title}</title>
<style>body{{font-family:sans-serif;background:#0f172a;color:#f1f5f9;padding:20px;}}</style>
</head><body><h1>{title}</h1><pre>{json.dumps(data, indent=2)}</pre></body></html>'''
        
        with open(self.report_dir / f'{name}.html', 'w', encoding='utf-8') as f:
            f.write(html)


# ============================================
# MAIN ENTRY POINT
# ============================================

def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Usage: python analyzer.py <project_root>")
        sys.exit(1)
    
    project_root = sys.argv[1]
    
    if not os.path.isdir(project_root):
        print(f"❌ Error: '{project_root}' is not a valid directory")
        sys.exit(1)
    
    analyzer = GStudioUltimateAnalyzer(project_root)
    analyzer.show_menu()


if __name__ == '__main__':
    main()