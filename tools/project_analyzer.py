#!/usr/bin/env python3
"""
Advanced Project Analysis and Refactoring Agent
Deep architectural analysis with intelligent recommendations
"""

import os
import json
import ast
import hashlib
import difflib
import re
import sys
from pathlib import Path
from dataclasses import dataclass, field
from typing import Dict, List, Set, Tuple, Optional, Any
from collections import defaultdict
import statistics
import math


@dataclass
class FileInfo:
    """Complete metadata for a file"""
    path: str
    full_path: Path
    type: str
    size: int
    lines: int
    imports: List[str]
    exports: List[str]
    functions: List[str]
    classes: List[str]
    hooks: List[str]  # React hooks
    components: List[str]  # React components
    hash: str
    complexity: int
    maintainability: float
    dependencies: Set[str] = field(default_factory=set)
    dependents: Set[str] = field(default_factory=set)
    last_modified: float = 0
    content: str = ""


class ProjectAnalyzer:
    """Advanced analysis engine for codebase optimization"""
    
    def __init__(self, project_root: str):
        self.project_root = Path(project_root).resolve()
        self.file_map: Dict[str, FileInfo] = {}
        self.import_graph: Dict[str, Set[str]] = defaultdict(set)
        self.reverse_graph: Dict[str, Set[str]] = defaultdict(set)
        self.component_registry: Dict[str, List[str]] = defaultdict(list)
        self.hook_registry: Dict[str, List[str]] = defaultdict(list)
        self.service_registry: Dict[str, List[str]] = defaultdict(list)
        
    def analyze(self) -> Dict[str, Any]:
        """Main analysis entry point"""
        print("🔍 Starting deep architectural analysis...")
        
        # Step 1: Comprehensive scan
        print("📁 Scanning project structure...")
        file_infos = self._scan_project()
        
        # Step 2: Build dependency graphs
        print("🕸️ Building dependency graph...")
        self._build_dependency_graph(file_infos)
        
        # Step 3: Detect architectural patterns
        print("🏗️ Analyzing architecture patterns...")
        architecture = self._analyze_architecture()
        
        # Step 4: Find issues
        print("🎯 Identifying optimization opportunities...")
        unused_files = self._find_unused_files()
        duplicate_files = self._find_duplicate_files()
        similar_files = self._find_similar_files()
        merge_recommendations = self._analyze_merge_candidates(similar_files)
        
        # Step 5: Generate recommendations
        print("💡 Generating optimization plan...")
        replace_recommendations = self._generate_replace_recommendations()
        refactor_plan = self._generate_refactor_plan({
            'unused_files': unused_files,
            'duplicate_files': duplicate_files,
            'similar_files': similar_files
        })
        risk_assessment = self._generate_risk_assessment({
            'unused_files': unused_files,
            'duplicate_files': duplicate_files,
            'architecture': architecture
        })
        
        # Step 6: Compile report
        report = {
            "project_metadata": {
                "root": str(self.project_root),
                "total_files": len(file_infos),
                "total_lines": sum(f.lines for f in file_infos),
                "languages": self._count_languages(file_infos),
                "analysis_date": str(Path(__file__).stat().st_mtime)
            },
            "unused_files": [
                {
                    "path": f.path,
                    "type": f.type,
                    "size": f.size,
                    "lines": f.lines,
                    "reason": self._get_unused_reason(f.path),
                    "potential_value": self._assess_potential_value(f)
                }
                for f in unused_files
            ],
            "duplicate_files": [
                {
                    "group_id": f"dup_{i}",
                    "files": [
                        {
                            "path": file.path,
                            "hash": file.hash,
                            "size": file.size,
                            "dependents": len(file.dependents)
                        }
                        for file in group
                    ],
                    "total_size": sum(f.size for f in group),
                    "savings_potential": (len(group) - 1) * group[0].size if group else 0
                }
                for i, group in enumerate(duplicate_files)
            ],
            "similar_named_files": [
                {
                    "common_name": Path(group[0].path).stem,
                    "files": [
                        {
                            "path": f.path,
                            "directory": str(Path(f.path).parent),
                            "lines": f.lines,
                            "complexity": f.complexity,
                            "maintainability": f.maintainability
                        }
                        for f in group
                    ],
                    "directory_count": len(set(Path(f.path).parent for f in group))
                }
                for group in similar_files
            ],
            "merge_recommendations": merge_recommendations,
            "replace_recommendations": replace_recommendations,
            "architecture_issues": architecture,
            "refactor_plan": refactor_plan,
            "risk_assessment": risk_assessment,
            "statistics": {
                "file_type_distribution": self._get_file_type_distribution(file_infos),
                "complexity_analysis": self._analyze_complexity(file_infos),
                "dependency_analysis": self._analyze_dependencies()
            }
        }
        
        return report
    
    def _scan_project(self) -> List[FileInfo]:
        """Deep recursive scan of project"""
        file_infos = []
        excluded_dirs = {'.git', 'node_modules', '__pycache__', '.next', '.nuxt', 
                        'dist', 'build', 'out', '.cache', '.idea', '.vscode'}
        excluded_files = {'.DS_Store', 'Thumbs.db', '.env.local'}
        
        for root, dirs, files in os.walk(self.project_root):
            # Filter directories
            dirs[:] = [d for d in dirs if d not in excluded_dirs]
            
            for filename in files:
                if filename in excluded_files:
                    continue
                    
                filepath = Path(root) / filename
                rel_path = str(filepath.relative_to(self.project_root))
                
                try:
                    # Read file content
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    # Detect file type
                    file_type = self._detect_file_type(filepath)
                    
                    # Parse file based on type
                    imports, exports = self._parse_file(content, file_type, rel_path)
                    functions, classes = self._extract_definitions(content, file_type)
                    hooks, components = self._extract_react_elements(content, file_type)
                    
                    # Calculate metrics
                    complexity = self._calculate_complexity(content, file_type)
                    maintainability = self._calculate_maintainability(content, complexity)
                    
                    file_info = FileInfo(
                        path=rel_path,
                        full_path=filepath,
                        type=file_type,
                        size=len(content),
                        lines=content.count('\n') + 1,
                        imports=imports,
                        exports=exports,
                        functions=functions,
                        classes=classes,
                        hooks=hooks,
                        components=components,
                        hash=hashlib.md5(content.encode()).hexdigest(),
                        complexity=complexity,
                        maintainability=maintainability,
                        last_modified=filepath.stat().st_mtime,
                        content=content
                    )
                    
                    file_infos.append(file_info)
                    self.file_map[rel_path] = file_info
                    
                    # Register special elements
                    for hook in hooks:
                        self.hook_registry[hook].append(rel_path)
                    for component in components:
                        self.component_registry[component].append(rel_path)
                    if 'service' in rel_path.lower() or 'api' in rel_path.lower():
                        for export in exports:
                            self.service_registry[export].append(rel_path)
                            
                except Exception as e:
                    print(f"⚠️ Could not analyze {rel_path}: {e}")
        
        return file_infos
    
    def _detect_file_type(self, filepath: Path) -> str:
        """Detect programming language/framework"""
        ext = filepath.suffix.lower()
        mapping = {
            '.js': 'javascript',
            '.jsx': 'react',
            '.ts': 'typescript',
            '.tsx': 'react_typescript',
            '.py': 'python',
            '.vue': 'vue',
            '.svelte': 'svelte',
            '.css': 'css',
            '.scss': 'scss',
            '.sass': 'sass',
            '.less': 'less',
            '.html': 'html',
            '.json': 'json',
            '.md': 'markdown',
            '.yml': 'yaml',
            '.yaml': 'yaml',
            '.graphql': 'graphql',
            '.gql': 'graphql'
        }
        return mapping.get(ext, 'unknown')
    
    def _parse_file(self, content: str, file_type: str, filepath: str) -> Tuple[List[str], List[str]]:
        """Parse imports and exports from file"""
        imports, exports = [], []
        
        if file_type in ['javascript', 'typescript', 'react', 'react_typescript']:
            # ES6 imports
            import_patterns = [
                r'import\s+.*from\s+[\'"]([^"\']+)[\'"]',
                r'require\([\'"]([^"\']+)[\'"]\)',
                r'import\([\'"]([^"\']+)[\'"]\)',
                r'from\s+[\'"]([^"\']+)[\'"]'
            ]
            
            for pattern in import_patterns:
                imports.extend(re.findall(pattern, content))
            
            # Exports
            export_patterns = [
                r'export\s+(?:const|let|var|function|class|default|async\s+function)?\s*([a-zA-Z_$][\w$]*)',
                r'export\s*\{([^}]+)\}',
                r'export\s+default\s+([a-zA-Z_$][\w$]*)'
            ]
            
            for pattern in export_patterns:
                matches = re.findall(pattern, content)
                for match in matches:
                    if isinstance(match, str):
                        if ',' in match:
                            exports.extend([e.strip() for e in match.split(',')])
                        else:
                            exports.append(match.strip())
        
        elif file_type == 'python':
            try:
                tree = ast.parse(content)
                
                # Imports
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        imports.extend([alias.name for alias in node.names])
                    elif isinstance(node, ast.ImportFrom):
                        if node.module:
                            imports.append(node.module)
                
                # Exports (from __all__)
                for node in ast.walk(tree):
                    if isinstance(node, ast.Assign):
                        for target in node.targets:
                            if isinstance(target, ast.Name) and target.id == '__all__':
                                if isinstance(node.value, ast.List):
                                    exports.extend([
                                        e.s for e in node.value.elts 
                                        if isinstance(e, ast.Str) or (hasattr(e, 'value') and isinstance(e.value, str))
                                    ])
            except:
                pass
        
        # Clean imports (remove relative paths, keep package names)
        clean_imports = []
        for imp in imports:
            if imp.startswith('.'):
                # Resolve relative import
                base_dir = str(Path(filepath).parent)
                resolved = str((Path(base_dir) / imp).resolve().relative_to(self.project_root))
                clean_imports.append(resolved)
            else:
                clean_imports.append(imp.split('/')[0])  # Keep only package name
        
        return clean_imports, list(set(exports))
    
    def _extract_definitions(self, content: str, file_type: str) -> Tuple[List[str], List[str]]:
        """Extract function and class definitions"""
        functions, classes = [], []
        
        if file_type in ['javascript', 'typescript', 'react', 'react_typescript']:
            # Function definitions
            func_patterns = [
                r'function\s+([a-zA-Z_$][\w$]*)\s*\(',
                r'const\s+([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s*)?\([^)]*\)\s*=>',
                r'([a-zA-Z_$][\w$]*)\s*\([^)]*\)\s*\{'
            ]
            
            for pattern in func_patterns:
                functions.extend(re.findall(pattern, content))
            
            # Class definitions
            class_matches = re.findall(r'class\s+([a-zA-Z_$][\w$]*)', content)
            classes.extend(class_matches)
        
        elif file_type == 'python':
            try:
                tree = ast.parse(content)
                for node in ast.walk(tree):
                    if isinstance(node, ast.FunctionDef):
                        functions.append(node.name)
                    elif isinstance(node, ast.AsyncFunctionDef):
                        functions.append(node.name)
                    elif isinstance(node, ast.ClassDef):
                        classes.append(node.name)
            except:
                pass
        
        return list(set(functions)), list(set(classes))
    
    def _extract_react_elements(self, content: str, file_type: str) -> Tuple[List[str], List[str]]:
        """Extract React hooks and components"""
        hooks, components = [], []
        
        if file_type in ['react', 'react_typescript', 'javascript', 'typescript']:
            # React hooks (useXXX)
            hook_matches = re.findall(r'const\s+([uU]se[A-Z][a-zA-Z]*)\s*=', content)
            hooks.extend([h for h in hook_matches if h.lower().startswith('use')])
            
            # React components
            comp_patterns = [
                r'const\s+([A-Z][a-zA-Z]*)\s*=\s*(?:\([^)]*\)\s*=>|function)',
                r'function\s+([A-Z][a-zA-Z]*)\s*\([^)]*\)\s*\{',
                r'class\s+([A-Z][a-zA-Z]*)\s+extends\s+(?:Component|React\.Component)'
            ]
            
            for pattern in comp_patterns:
                components.extend(re.findall(pattern, content))
        
        return list(set(hooks)), list(set(components))
    
    def _calculate_complexity(self, content: str, file_type: str) -> int:
        """Calculate cyclomatic complexity approximation"""
        lines = content.split('\n')
        complexity = 0
        
        complexity_keywords = {
            'if', 'else', 'elif', 'case', 'default', 'for', 'while', 'do',
            'catch', 'finally', '&&', '||', '?', '??', '?.', 'try', 'throw'
        }
        
        for line in lines:
            line = line.strip()
            # Skip comments and empty lines
            if not line or line.startswith(('//', '#', '/*', '*', '*/')):
                continue
            
            # Count decision points
            for keyword in complexity_keywords:
                if keyword in line:
                    complexity += 1
            
            # Count nesting
            complexity += line.count('{') + line.count('(') + line.count('[')
        
        return complexity
    
    def _calculate_maintainability(self, content: str, complexity: int) -> float:
        """Calculate maintainability index (0-100)"""
        lines = content.count('\n') + 1
        if lines == 0 or complexity == 0:
            return 100.0
        
        # Simplified maintainability index
        halstead_volume = lines * math.log2(len(set(content.split())) + 1)
        maintainability = max(0, min(100, 
            171 - 5.2 * math.log(halstead_volume) - 0.23 * complexity - 16.2 * math.log(lines)
        ))
        
        return round(maintainability, 2)
    
    def _build_dependency_graph(self, file_infos: List[FileInfo]):
        """Build comprehensive dependency graph"""
        # First pass: map files by name and path
        file_by_name = {}
        for info in file_infos:
            filename = Path(info.path).name
            file_by_name[filename] = info.path
            file_by_name[Path(info.path).stem] = info.path
        
        # Build graph
        for info in file_infos:
            source = info.path
            for imp in info.imports:
                # Try to resolve import
                target = self._resolve_import(imp, source, file_by_name, file_infos)
                if target:
                    self.import_graph[source].add(target)
                    self.reverse_graph[target].add(source)
                    info.dependencies.add(target)
                    if target in self.file_map:
                        self.file_map[target].dependents.add(source)
    
    def _resolve_import(self, imp: str, source: str, file_by_name: Dict, 
                       file_infos: List[FileInfo]) -> Optional[str]:
        """Resolve import to actual file path"""
        source_dir = str(Path(source).parent)
        
        # Check direct match
        if imp in self.file_map:
            return imp
        
        # Check by filename
        if imp in file_by_name:
            return file_by_name[imp]
        
        # Check relative paths
        if imp.startswith('.'):
            # Try to resolve relative path
            try:
                abs_path = (Path(self.project_root) / source_dir / imp).resolve()
                rel_path = str(abs_path.relative_to(self.project_root))
                
                # Try with extensions
                for ext in ['', '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte']:
                    test_path = rel_path + ext
                    if test_path in self.file_map:
                        return test_path
                    
                    # Also check index files
                    test_path_index = str(Path(rel_path) / f"index{ext}")
                    if test_path_index in self.file_map:
                        return test_path_index
            except:
                pass
        
        # Fuzzy match by stem
        imp_stem = Path(imp).stem
        for info in file_infos:
            if Path(info.path).stem == imp_stem:
                return info.path
        
        return None
    
    def _find_unused_files(self) -> List[FileInfo]:
        """Find files not imported by any other file"""
        unused = []
        entry_points = self._identify_entry_points()
        
        for path, info in self.file_map.items():
            # Skip entry points and configuration files
            if path in entry_points or self._is_config_file(path):
                continue
            
            # Check if file has dependents
            if not info.dependents:
                unused.append(info)
        
        return unused
    
    def _identify_entry_points(self) -> Set[str]:
        """Identify entry point files"""
        entry_points = set()
        entry_patterns = [
            'index.', 'main.', 'app.', 'App.', '__main__.',
            'package.json', 'manifest.json', 'webpack.config',
            'next.config', 'vue.config', 'angular.json',
            'setup.py', 'requirements.txt', '.env'
        ]
        
        for path in self.file_map.keys():
            filename = Path(path).name
            if any(pattern in filename for pattern in entry_patterns):
                entry_points.add(path)
        
        return entry_points
    
    def _is_config_file(self, path: str) -> bool:
        """Check if file is a configuration file"""
        config_patterns = [
            '.config.', '.env', 'dockerfile', 'docker-compose',
            'package.json', 'tsconfig.json', 'webpack.config',
            'babel.config', 'jest.config', '.eslintrc', '.prettierrc',
            'tailwind.config', 'postcss.config'
        ]
        
        filename = Path(path).name.lower()
        return any(pattern in filename for pattern in config_patterns)
    
    def _get_unused_reason(self, path: str) -> str:
        """Determine why file is unused"""
        info = self.file_map[path]
        
        if info.exports:
            return "Has exports but no imports found"
        elif info.hooks or info.components:
            return f"Unused React {'hook' if info.hooks else 'component'}"
        elif info.functions or info.classes:
            return "Contains functions/classes but not imported"
        else:
            return "Utility file with no imports"
    
    def _assess_potential_value(self, file_info: FileInfo) -> Dict[str, Any]:
        """Assess potential value of unused file"""
        value_score = 0
        reasons = []
        
        # Check for complex logic
        if file_info.complexity > 10:
            value_score += 30
            reasons.append("Contains complex logic")
        
        # Check for utility functions
        if len(file_info.functions) > 3:
            value_score += 20
            reasons.append("Multiple utility functions")
        
        # Check for React hooks/components
        if file_info.hooks or file_info.components:
            value_score += 40
            reasons.append("Contains React elements")
        
        # Check for exports
        if file_info.exports:
            value_score += 25
            reasons.append("Has named exports")
        
        return {
            "score": min(100, value_score),
            "reasons": reasons,
            "recommendation": "Review before deletion" if value_score > 50 else "Safe to archive"
        }
    
    def _find_duplicate_files(self) -> List[List[FileInfo]]:
        """Find files with identical content"""
        hash_groups = defaultdict(list)
        
        for info in self.file_map.values():
            hash_groups[info.hash].append(info)
        
        # Return groups with more than one file
        return [group for group in hash_groups.values() if len(group) > 1]
    
    def _find_similar_files(self) -> List[List[FileInfo]]:
        """Find files with similar names in different directories"""
        name_groups = defaultdict(list)
        
        for info in self.file_map.values():
            stem = Path(info.path).stem
            name_groups[stem].append(info)
        
        similar = []
        for stem, files in name_groups.items():
            if len(files) > 1:
                # Check if in different directories
                dirs = set(str(Path(f.path).parent) for f in files)
                if len(dirs) > 1:
                    similar.append(files)
        
        return similar
    
    def _analyze_merge_candidates(self, similar_files: List[List[FileInfo]]) -> List[Dict]:
        """Analyze and recommend merges for similar files"""
        recommendations = []
        
        for group in similar_files:
            if len(group) < 2:
                continue
            
            # Compare each pair
            comparisons = []
            for i in range(len(group)):
                for j in range(i + 1, len(group)):
                    similarity = self._compare_files(group[i], group[j])
                    comparisons.append({
                        'file1': group[i].path,
                        'file2': group[j].path,
                        'similarity': similarity,
                        'recommendation': self._get_merge_recommendation(
                            group[i], group[j], similarity
                        )
                    })
            
            # Find best candidate
            best_file = max(group, key=lambda f: f.maintainability)
            
            recommendations.append({
                'group_id': f"merge_{len(recommendations)}",
                'common_name': Path(group[0].path).stem,
                'files': [f.path for f in group],
                'best_candidate': best_file.path,
                'best_maintainability': best_file.maintainability,
                'comparisons': comparisons,
                'merge_strategy': self._generate_merge_strategy(group),
                'ui_impact': self._assess_ui_impact(group),
                'risk_level': self._assess_merge_risk(group)
            })
        
        return recommendations
    
    def _compare_files(self, file1: FileInfo, file2: FileInfo) -> float:
        """Calculate similarity between two files"""
        # Content similarity
        seq_matcher = difflib.SequenceMatcher(None, file1.content, file2.content)
        content_similarity = seq_matcher.ratio()
        
        # Structure similarity
        struct_similarity = self._compare_structure(file1, file2)
        
        # Weighted average
        return round(0.7 * content_similarity + 0.3 * struct_similarity, 3)
    
    def _compare_structure(self, file1: FileInfo, file2: FileInfo) -> float:
        """Compare file structure (exports, functions, etc.)"""
        similarities = []
        
        # Compare exports
        exports1 = set(file1.exports)
        exports2 = set(file2.exports)
        if exports1 or exports2:
            export_sim = len(exports1 & exports2) / max(len(exports1 | exports2), 1)
            similarities.append(export_sim)
        
        # Compare functions
        funcs1 = set(file1.functions)
        funcs2 = set(file2.functions)
        if funcs1 or funcs2:
            func_sim = len(funcs1 & funcs2) / max(len(funcs1 | funcs2), 1)
            similarities.append(func_sim)
        
        # Compare complexity
        if file1.complexity > 0 and file2.complexity > 0:
            comp_sim = 1 - abs(file1.complexity - file2.complexity) / max(file1.complexity, file2.complexity)
            similarities.append(comp_sim)
        
        return statistics.mean(similarities) if similarities else 0.5
    
    def _get_merge_recommendation(self, file1: FileInfo, file2: FileInfo, similarity: float) -> str:
        """Generate merge recommendation"""
        if similarity > 0.9:
            return f"Keep {file1.path} (virtually identical)"
        elif similarity > 0.7:
            if file1.maintainability > file2.maintainability:
                return f"Keep {file1.path}, merge improvements into it"
            else:
                return f"Keep {file2.path}, merge improvements into it"
        elif similarity > 0.4:
            return f"Merge both into new unified version"
        else:
            return "Keep separate (different functionality)"
    
    def _generate_merge_strategy(self, files: List[FileInfo]) -> str:
        """Generate detailed merge strategy"""
        best = max(files, key=lambda f: f.maintainability)
        others = [f for f in files if f != best]
        
        strategy = [
            f"1. Use {best.path} as base implementation",
            f"2. Analyze {len(others)} similar files for unique features",
            "3. Create migration plan with feature flags if needed",
            "4. Update imports gradually",
            "5. Add deprecation warnings before removal"
        ]
        
        return "\n".join(strategy)
    
    def _assess_ui_impact(self, files: List[FileInfo]) -> str:
        """Assess UI impact of merging files"""
        # Check if any file contains UI components
        has_ui = any(f.components or 'component' in f.path.lower() for f in files)
        
        if not has_ui:
            return "No UI impact (non-visual files)"
        
        # Check for inline styles or CSS
        has_styles = any('style' in f.content.lower() or 'className' in f.content for f in files)
        
        if has_styles:
            return "Medium UI impact (contains styling)"
        else:
            return "Low UI impact (logic only)"
    
    def _assess_merge_risk(self, files: List[FileInfo]) -> str:
        """Assess risk level of merging files"""
        # Calculate risk factors
        risk_score = 0
        
        # More files = higher risk
        risk_score += min(len(files) * 10, 30)
        
        # Check if files are imported elsewhere
        import_count = sum(len(f.dependents) for f in files)
        if import_count > 5:
            risk_score += 40
        elif import_count > 0:
            risk_score += 20
        
        # Check for complex logic
        if any(f.complexity > 50 for f in files):
            risk_score += 30
        
        # Determine risk level
        if risk_score > 70:
            return "High"
        elif risk_score > 40:
            return "Medium"
        else:
            return "Low"
    
    def _generate_replace_recommendations(self) -> List[Dict]:
        """Generate recommendations for replacing inferior implementations"""
        recommendations = []
        
        # Find duplicate hooks
        for hook_name, file_paths in self.hook_registry.items():
            if len(file_paths) > 1:
                # Compare implementations
                files = [self.file_map[p] for p in file_paths if p in self.file_map]
                if len(files) >= 2:
                    best = max(files, key=lambda f: f.maintainability)
                    worst = min(files, key=lambda f: f.maintainability)
                    
                    if best.maintainability - worst.maintainability > 20:  # Significant difference
                        recommendations.append({
                            'type': 'hook',
                            'name': hook_name,
                            'replace': worst.path,
                            'with': best.path,
                            'improvement': round(best.maintainability - worst.maintainability, 1),
                            'risk': 'Low' if len(worst.dependents) == 0 else 'Medium'
                        })
        
        # Find duplicate components
        for comp_name, file_paths in self.component_registry.items():
            if len(file_paths) > 1:
                files = [self.file_map[p] for p in file_paths if p in self.file_map]
                if len(files) >= 2:
                    best = max(files, key=lambda f: f.maintainability)
                    others = [f for f in files if f != best]
                    
                    for other in others:
                        if best.maintainability - other.maintainability > 15:
                            recommendations.append({
                                'type': 'component',
                                'name': comp_name,
                                'replace': other.path,
                                'with': best.path,
                                'improvement': round(best.maintainability - other.maintainability, 1),
                                'ui_impact': 'Low' if 'style' not in other.content else 'Review needed'
                            })
        
        return recommendations
    
    def _analyze_architecture(self) -> Dict[str, Any]:
        """Analyze architectural patterns and issues"""
        issues = {
            'duplicate_hooks': [],
            'duplicate_components': [],
            'unwired_services': [],
            'redundant_stores': [],
            'multiple_layouts': [],
            'dead_utilities': []
        }
        
        # Find duplicate hooks
        for hook_name, paths in self.hook_registry.items():
            if len(paths) > 1:
                issues['duplicate_hooks'].append({
                    'hook': hook_name,
                    'files': paths,
                    'count': len(paths)
                })
        
        # Find duplicate components
        for comp_name, paths in self.component_registry.items():
            if len(paths) > 1:
                issues['duplicate_components'].append({
                    'component': comp_name,
                    'files': paths,
                    'count': len(paths)
                })
        
        # Find unwired services (services with no dependents)
        for export_name, paths in self.service_registry.items():
            for path in paths:
                if path in self.file_map and not self.file_map[path].dependents:
                    issues['unwired_services'].append({
                        'service': export_name,
                        'file': path,
                        'exports': self.file_map[path].exports
                    })
        
        # Find layout files
        layout_files = [p for p in self.file_map.keys() if 'layout' in p.lower()]
        if len(layout_files) > 1:
            issues['multiple_layouts'] = layout_files
        
        # Find dead utility files (utilities with no dependents)
        for path, info in self.file_map.items():
            if ('util' in path.lower() or 'helper' in path.lower()) and not info.dependents:
                issues['dead_utilities'].append({
                    'file': path,
                    'functions': info.functions,
                    'complexity': info.complexity
                })
        
        return issues
    
    def _generate_refactor_plan(self, findings: Dict) -> List[Dict]:
        """Generate 4-phase refactoring plan"""
        unused_count = len(findings.get('unused_files', []))
        duplicate_groups = len(findings.get('duplicate_files', []))
        similar_groups = len(findings.get('similar_files', []))
        
        return [
            {
                'phase': 1,
                'name': 'Quick Wins & Safety',
                'duration': '1-3 days',
                'risk': 'Low',
                'tasks': [
                    f"Archive {unused_count} unused files (move to /archive)",
                    "Add deprecation warnings to duplicate files",
                    "Update documentation with new architecture",
                    "Setup feature flags for risky changes"
                ],
                'success_criteria': [
                    "Zero production incidents",
                    "All tests passing",
                    "Documentation updated"
                ]
            },
            {
                'phase': 2,
                'name': 'Consolidation & Merge',
                'duration': '1-2 weeks',
                'risk': 'Medium',
                'tasks': [
                    f"Merge {duplicate_groups} duplicate file groups",
                    f"Consolidate {similar_groups} similar implementations",
                    "Create shared utility modules",
                    "Unify error handling patterns"
                ],
                'success_criteria': [
                    "20% reduction in file count",
                    "Improved code reuse metrics",
                    "No breaking UI changes"
                ]
            },
            {
                'phase': 3,
                'name': 'Structural Improvement',
                'duration': '2-3 weeks',
                'risk': 'Medium-High',
                'tasks': [
                    "Refactor complex components",
                    "Implement proper dependency injection",
                    "Setup centralized state management",
                    "Create consistent API layer"
                ],
                'success_criteria': [
                    "30% reduction in complexity",
                    "Improved test coverage",
                    "Better separation of concerns"
                ]
            },
            {
                'phase': 4,
                'name': 'Architecture Optimization',
                'duration': '3-4 weeks',
                'risk': 'High',
                'tasks': [
                    "Implement micro-frontends if applicable",
                    "Setup advanced code splitting",
                    "Optimize build process",
                    "Add comprehensive monitoring"
                ],
                'success_criteria': [
                    "50% faster build times",
                    "Improved Lighthouse scores",
                    "Better developer experience"
                ]
            }
        ]
    
    def _generate_risk_assessment(self, findings: Dict) -> Dict[str, Any]:
        """Generate comprehensive risk assessment"""
        unused_files = findings.get('unused_files', [])
        duplicate_files = findings.get('duplicate_files', [])
        architecture = findings.get('architecture', {})
        
        # Calculate risk scores
        risk_factors = {
            'unused_code_risk': len(unused_files) * 0.1,
            'duplication_risk': len(duplicate_files) * 0.3,
            'architecture_debt': len(architecture.get('duplicate_hooks', [])) * 0.2,
            'complexity_risk': sum(1 for f in self.file_map.values() if f.complexity > 50) * 0.15
        }
        
        total_risk = sum(risk_factors.values())
        
        # Determine risk level
        if total_risk > 3:
            risk_level = 'High'
        elif total_risk > 1.5:
            risk_level = 'Medium'
        else:
            risk_level = 'Low'
        
        return {
            'overall_risk': risk_level,
            'risk_score': round(total_risk, 2),
            'risk_factors': risk_factors,
            'high_risk_items': [
                item for item in architecture.get('duplicate_hooks', []) 
                if item['count'] > 2
            ],
            'mitigation_strategy': [
                "Implement gradual migration with feature flags",
                "Maintain comprehensive test coverage",
                "Use canary deployments for risky changes",
                "Keep rollback plans for each phase"
            ],
            'ui_stability_guarantee': "All visual changes will be behind feature flags initially"
        }
    
    def _count_languages(self, file_infos: List[FileInfo]) -> Dict[str, int]:
        """Count files by language"""
        counts = defaultdict(int)
        for info in file_infos:
            counts[info.type] += 1
        return dict(counts)
    
    def _get_file_type_distribution(self, file_infos: List[FileInfo]) -> Dict[str, float]:
        """Calculate file type distribution percentages"""
        total = len(file_infos)
        if total == 0:
            return {}
        
        counts = self._count_languages(file_infos)
        return {lang: round(count/total * 100, 1) for lang, count in counts.items()}
    
    def _analyze_complexity(self, file_infos: List[FileInfo]) -> Dict[str, Any]:
        """Analyze complexity distribution"""
        complexities = [f.complexity for f in file_infos]
        maintainabilities = [f.maintainability for f in file_infos]
        
        return {
            'average_complexity': round(statistics.mean(complexities), 1) if complexities else 0,
            'max_complexity': max(complexities) if complexities else 0,
            'complex_files': sum(1 for c in complexities if c > 50),
            'average_maintainability': round(statistics.mean(maintainabilities), 1) if maintainabilities else 0,
            'low_maintainability_files': sum(1 for m in maintainabilities if m < 50)
        }
    
    def _analyze_dependencies(self) -> Dict[str, Any]:
        """Analyze dependency graph"""
        if not self.file_map:
            return {}
        
        dependency_counts = [len(info.dependencies) for info in self.file_map.values()]
        dependent_counts = [len(info.dependents) for info in self.file_map.values()]
        
        return {
            'max_dependencies': max(dependency_counts) if dependency_counts else 0,
            'avg_dependencies': round(statistics.mean(dependency_counts), 1) if dependency_counts else 0,
            'orphaned_files': sum(1 for count in dependent_counts if count == 0),
            'highly_connected': sum(1 for count in dependent_counts if count > 10)
        }


def save_json_report(report: Dict, output_path: str = "analysis_report.json"):
    """Save analysis report as JSON"""
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    print(f"✅ JSON report saved to: {output_path}")


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Project Architecture Analyzer")
    parser.add_argument("path", nargs="?", default=".", 
                       help="Project root path (default: current directory)")
    parser.add_argument("--output", "-o", default="analysis_report.json",
                       help="Output JSON file path")
    
    args = parser.parse_args()
    
    try:
        # Initialize analyzer
        analyzer = ProjectAnalyzer(args.path)
        
        # Run analysis
        report = analyzer.analyze()
        
        # Save report
        save_json_report(report, args.output)
        
        # Print summary
        print("\n" + "="*60)
        print("📊 ANALYSIS SUMMARY")
        print("="*60)
        print(f"Total files analyzed: {report['project_metadata']['total_files']}")
        print(f"Unused files found: {len(report['unused_files'])}")
        print(f"Duplicate file groups: {len(report['duplicate_files'])}")
        print(f"Similar file groups: {len(report['similar_named_files'])}")
        print(f"Merge recommendations: {len(report['merge_recommendations'])}")
        print(f"Risk level: {report['risk_assessment']['overall_risk']}")
        print("="*60)
        
        # Generate dashboard
        from dashboard_generator import generate_dashboard
        generate_dashboard(report, "optimization_dashboard.html")
        
    except Exception as e:
        print(f"❌ Analysis failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()