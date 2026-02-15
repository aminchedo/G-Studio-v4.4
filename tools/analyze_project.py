import os
import json
import ast
import hashlib
import difflib
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
import re

class ProjectAnalyzer:
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.import_graph = {}
        self.file_dependencies = {}
        self.file_hashes = {}
        self.function_signatures = {}
        
    def scan_project(self):
        """Recursively scan all files in the project"""
        file_data = []
        excluded_dirs = {'.git', 'node_modules', '__pycache__', '.venv', 'dist', 'build'}
        excluded_ext = {'.pyc', '.pyo', '.so', '.dll', '.exe'}
        
        for root, dirs, files in os.walk(self.project_root):
            # Filter out excluded directories
            dirs[:] = [d for d in dirs if d not in excluded_dirs]
            
            for file in files:
                filepath = Path(root) / file
                rel_path = filepath.relative_to(self.project_root)
                
                # Skip excluded extensions
                if any(str(rel_path).endswith(ext) for ext in excluded_ext):
                    continue
                
                try:
                    with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                        
                    file_type = self._detect_file_type(filepath)
                    imports = self._extract_imports(content, file_type)
                    exports = self._extract_exports(content, file_type)
                    
                    file_info = {
                        'path': str(rel_path),
                        'full_path': str(filepath),
                        'type': file_type,
                        'size': len(content),
                        'lines': content.count('\n') + 1,
                        'imports': imports,
                        'exports': exports,
                        'hash': self._calculate_hash(content),
                        'complexity': self._calculate_complexity(content, file_type),
                        'last_modified': os.path.getmtime(filepath)
                    }
                    
                    file_data.append(file_info)
                    
                except Exception as e:
                    print(f"Error reading {filepath}: {e}")
        
        return file_data
    
    def _detect_file_type(self, filepath: Path) -> str:
        ext = filepath.suffix.lower()
        if ext in ['.js', '.jsx', '.ts', '.tsx']:
            return 'javascript'
        elif ext == '.py':
            return 'python'
        elif ext in ['.css', '.scss', '.sass']:
            return 'css'
        elif ext in ['.html', '.htm']:
            return 'html'
        elif ext == '.json':
            return 'json'
        elif ext in ['.md', '.txt']:
            return 'text'
        else:
            return 'other'
    
    def _extract_imports(self, content: str, file_type: str) -> List[str]:
        imports = []
        
        if file_type == 'python':
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
                
        elif file_type == 'javascript':
            # Match ES6 imports
            es6_imports = re.findall(
                r'import\s+(?:(?:\{[^}]*\}|\* as \w+|\w+)\s+from\s+)?[\'"]([^"\']+)[\'"]',
                content
            )
            imports.extend(es6_imports)
            
            # Match require statements
            requires = re.findall(
                r'require\([\'"]([^"\']+)[\'"]\)',
                content
            )
            imports.extend(requires)
            
            # Match dynamic imports
            dynamic_imports = re.findall(
                r'import\([\'"]([^"\']+)[\'"]\)',
                content
            )
            imports.extend(dynamic_imports)
        
        return list(set(imports))
    
    def _extract_exports(self, content: str, file_type: str) -> List[str]:
        exports = []
        
        if file_type == 'python':
            # Look for __all__ declarations
            all_matches = re.findall(r'__all__\s*=\s*\[([^\]]+)\]', content)
            for match in all_matches:
                exports.extend([exp.strip(" '") for exp in match.split(',')])
                
        elif file_type == 'javascript':
            # Match export statements
            export_matches = re.findall(
                r'export\s+(?:const|let|var|function|class|default|async\s+function)?\s*([a-zA-Z_$][\w$]*)',
                content
            )
            exports.extend(export_matches)
            
            # Match export { x, y } pattern
            named_exports = re.findall(
                r'export\s*\{([^}]+)\}',
                content
            )
            for export_group in named_exports:
                exports.extend([exp.strip() for exp in export_group.split(',')])
        
        return list(set(exports))
    
    def _calculate_hash(self, content: str) -> str:
        return hashlib.md5(content.encode()).hexdigest()
    
    def _calculate_complexity(self, content: str, file_type: str) -> int:
        """Calculate simple complexity score"""
        lines = content.split('\n')
        complexity = 0
        
        for line in lines:
            line = line.strip()
            # Count control structures
            if any(keyword in line for keyword in ['if', 'for', 'while', 'catch', 'switch', '&&', '||', '?']):
                complexity += 1
            # Count function/method definitions
            if re.search(r'(def |function |class |=>)', line):
                complexity += 2
            # Count nested brackets/braces
            complexity += line.count('{') + line.count('[') + line.count('(')
        
        return complexity
    
    def build_dependency_graph(self, file_data: List[Dict]) -> Dict:
        """Build graph of file dependencies"""
        graph = {}
        reverse_graph = {}
        
        for file_info in file_data:
            file_path = file_info['path']
            graph[file_path] = set()
            reverse_graph[file_path] = set()
        
        for file_info in file_data:
            file_path = file_info['path']
            imports = file_info['imports']
            
            for imp in imports:
                # Try to find which file this import refers to
                target_file = self._resolve_import(imp, file_info['path'], file_data)
                if target_file:
                    graph[file_path].add(target_file)
                    reverse_graph[target_file].add(file_path)
        
        return graph, reverse_graph
    
    def _resolve_import(self, import_str: str, source_path: str, file_data: List[Dict]) -> Optional[str]:
        """Resolve import string to actual file path"""
        # Simple implementation - can be extended based on project structure
        source_dir = str(Path(source_path).parent)
        
        for file_info in file_data:
            file_path = file_info['path']
            filename = Path(file_path).name
            stem = Path(file_path).stem
            
            # Check exact matches
            if import_str in file_path or import_str in filename or import_str in stem:
                return file_path
            
            # Check relative paths
            if import_str.startswith('.'):
                resolved = str(Path(source_dir) / import_str).replace('./', '')
                if resolved in file_path or file_path.startswith(resolved):
                    return file_path
        
        return None
    
    def find_unused_files(self, file_data: List[Dict], reverse_graph: Dict) -> List[Dict]:
        """Find files not imported by any other file"""
        unused = []
        
        for file_info in file_data:
            file_path = file_info['path']
            
            # Skip if it's an entry point or configuration file
            if self._is_entry_point(file_path):
                continue
            
            # Check if any other file imports this one
            if not reverse_graph.get(file_path):
                unused.append({
                    'path': file_path,
                    'type': file_info['type'],
                    'size': file_info['size'],
                    'reason': 'No imports found'
                })
        
        return unused
    
    def _is_entry_point(self, file_path: str) -> bool:
        """Check if file is likely an entry point"""
        entry_patterns = [
            'index.', 'main.', 'app.', '__init__.', 'App.', 
            'package.json', 'manifest.json', 'webpack.config',
            'setup.py', 'requirements.txt', '.env'
        ]
        
        filename = Path(file_path).name
        return any(pattern in filename for pattern in entry_patterns)
    
    def find_duplicate_files(self, file_data: List[Dict]) -> List[List[Dict]]:
        """Find files with identical or similar content"""
        hash_groups = {}
        
        for file_info in file_data:
            file_hash = file_info['hash']
            if file_hash not in hash_groups:
                hash_groups[file_hash] = []
            hash_groups[file_hash].append(file_info)
        
        # Return groups with more than one file
        duplicates = [group for group in hash_groups.values() if len(group) > 1]
        
        # Also find similar files (similar names, different content)
        similar_files = self._find_similar_by_name(file_data)
        
        return duplicates, similar_files
    
    def _find_similar_by_name(self, file_data: List[Dict]) -> List[List[Dict]]:
        """Find files with similar names"""
        name_groups = {}
        
        for file_info in file_data:
            filename = Path(file_info['path']).name
            stem = Path(file_info['path']).stem
            
            # Group by filename stem (without extension)
            if stem not in name_groups:
                name_groups[stem] = []
            name_groups[stem].append(file_info)
        
        # Return groups with same name in different directories
        similar = []
        for stem, files in name_groups.items():
            if len(files) > 1:
                # Check if they're in different directories
                dirs = set(str(Path(f['path']).parent) for f in files)
                if len(dirs) > 1:
                    similar.append(files)
        
        return similar
    
    def compare_similar_files(self, file_group: List[Dict]) -> Dict:
        """Compare similar files and recommend best version"""
        if len(file_group) < 2:
            return {}
        
        # Read file contents
        for file_info in file_group:
            full_path = self.project_root / file_info['path']
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                file_info['content'] = f.read()
        
        # Calculate metrics for each file
        metrics = []
        for file_info in file_group:
            metrics.append({
                'path': file_info['path'],
                'complexity': file_info['complexity'],
                'lines': file_info['lines'],
                'exports': len(file_info['exports']),
                'maintainability': self._calculate_maintainability(file_info),
                'reusability': self._calculate_reusability(file_info)
            })
        
        # Sort by maintainability (higher is better)
        metrics.sort(key=lambda x: x['maintainability'], reverse=True)
        
        return {
            'files': [m['path'] for m in metrics],
            'best_version': metrics[0]['path'],
            'metrics': metrics,
            'recommendation': self._generate_recommendation(file_group, metrics)
        }
    
    def _calculate_maintainability(self, file_info: Dict) -> float:
        """Calculate maintainability index (simplified)"""
        lines = file_info['lines']
        complexity = file_info['complexity']
        
        if lines == 0:
            return 100
        
        # Simple maintainability formula
        maintainability = max(0, 100 - (complexity / lines) * 100 - (lines / 100))
        return round(maintainability, 2)
    
    def _calculate_reusability(self, file_info: Dict) -> float:
        """Calculate reusability score"""
        exports = len(file_info['exports'])
        imports = len(file_info['imports'])
        
        if imports == 0:
            return 0
        
        # Files that export many things but import few are more reusable
        reusability = (exports / max(1, imports)) * 50
        return min(100, round(reusability, 2))
    
    def _generate_recommendation(self, file_group: List[Dict], metrics: List[Dict]) -> str:
        """Generate merge/replace recommendation"""
        if len(file_group) <= 2:
            return f"Keep {metrics[0]['path']} and delete others"
        
        # Check if files are significantly different
        contents = [f['content'] for f in file_group]
        similarity_scores = []
        
        for i in range(len(contents)):
            for j in range(i + 1, len(contents)):
                similarity = difflib.SequenceMatcher(
                    None, contents[i], contents[j]
                ).ratio()
                similarity_scores.append(similarity)
        
        avg_similarity = sum(similarity_scores) / len(similarity_scores) if similarity_scores else 0
        
        if avg_similarity > 0.8:
            return f"Merge all into {metrics[0]['path']}"
        elif avg_similarity > 0.5:
            return f"Keep {metrics[0]['path']} as base, selectively merge functionality"
        else:
            return f"Keep {metrics[0]['path']}, review others for unique features"
    
    def analyze_architecture(self, file_data: List[Dict]) -> Dict:
        """Analyze architectural patterns and issues"""
        components = []
        services = []
        hooks = []
        contexts = []
        utils = []
        
        for file_info in file_data:
            filepath = file_info['path'].lower()
            
            if any(term in filepath for term in ['component', 'ui', 'view']):
                components.append(file_info)
            elif any(term in filepath for term in ['service', 'api', 'provider']):
                services.append(file_info)
            elif any(term in filepath for term in ['hook', 'usewhatever']):
                hooks.append(file_info)
            elif any(term in filepath for term in ['context', 'store', 'reducer']):
                contexts.append(file_info)
            elif any(term in filepath for term in ['util', 'helper', 'common']):
                utils.append(file_info)
        
        # Find duplicate patterns
        duplicate_hooks = self._find_duplicate_patterns(hooks, 'hooks')
        duplicate_services = self._find_duplicate_patterns(services, 'services')
        
        return {
            'components': len(components),
            'services': len(services),
            'hooks': len(hooks),
            'contexts': len(contexts),
            'utils': len(utils),
            'duplicate_hooks': duplicate_hooks,
            'duplicate_services': duplicate_services
        }
    
    def _find_duplicate_patterns(self, files: List[Dict], pattern_type: str) -> List[List[str]]:
        """Find files with duplicate functionality"""
        # Group by export names
        export_groups = {}
        
        for file_info in files:
            for export in file_info['exports']:
                if export not in export_groups:
                    export_groups[export] = []
                export_groups[export].append(file_info['path'])
        
        # Return groups with same export in multiple files
        duplicates = []
        for export, paths in export_groups.items():
            if len(paths) > 1:
                duplicates.append({
                    'pattern': export,
                    'files': paths,
                    'type': pattern_type
                })
        
        return duplicates
    
    def generate_refactor_plan(self, analysis_results: Dict) -> List[Dict]:
        """Generate phased refactoring plan"""
        plan = [
            {
                'phase': 1,
                'name': 'Quick Wins',
                'actions': [
                    'Remove obviously unused utility files',
                    'Delete duplicate config files',
                    'Update package.json to remove unused dependencies',
                    'Add TODO comments for questionable files'
                ],
                'risk': 'Low',
                'estimated_time': '1-2 days'
            },
            {
                'phase': 2,
                'name': 'Merge Candidates',
                'actions': [
                    'Merge similar components',
                    'Consolidate duplicate hooks',
                    'Unify service implementations',
                    'Create shared utility modules'
                ],
                'risk': 'Medium',
                'estimated_time': '3-5 days'
            },
            {
                'phase': 3,
                'name': 'Structural Improvements',
                'actions': [
                    'Refactor complex components',
                    'Implement proper dependency injection',
                    'Setup shared state management',
                    'Create consistent API layer'
                ],
                'risk': 'High',
                'estimated_time': '1-2 weeks'
            },
            {
                'phase': 4,
                'name': 'Architecture Optimization',
                'actions': [
                    'Implement micro-frontends if applicable',
                    'Setup advanced code splitting',
                    'Optimize build process',
                    'Add comprehensive testing'
                ],
                'risk': 'High',
                'estimated_time': '2-3 weeks'
            }
        ]
        
        # Customize based on findings
        if analysis_results.get('unused_files'):
            plan[0]['actions'].append(f"Archive {len(analysis_results['unused_files'])} unused files")
        
        if analysis_results.get('duplicate_files'):
            plan[1]['actions'].append(f"Consolidate {len(analysis_results['duplicate_files'])} duplicate file groups")
        
        return plan
    
    def generate_risk_assessment(self, analysis_results: Dict) -> Dict:
        """Generate risk assessment summary"""
        total_files = len(analysis_results.get('file_data', []))
        unused_count = len(analysis_results.get('unused_files', []))
        duplicate_groups = len(analysis_results.get('duplicate_files', []))
        similar_groups = len(analysis_results.get('similar_files', []))
        
        # Calculate risk scores
        risk_score = (unused_count * 0.1) + (duplicate_groups * 0.3) + (similar_groups * 0.2)
        
        if risk_score > 2:
            overall_risk = 'High'
        elif risk_score > 1:
            overall_risk = 'Medium'
        else:
            overall_risk = 'Low'
        
        return {
            'total_files': total_files,
            'unused_files': unused_count,
            'duplicate_groups': duplicate_groups,
            'similar_groups': similar_groups,
            'risk_score': round(risk_score, 2),
            'overall_risk': overall_risk,
            'high_risk_items': duplicate_groups,
            'medium_risk_items': similar_groups,
            'low_risk_items': unused_count
        }

def main():
    # Get project root from user or use current directory
    project_root = input("Enter project path (or press Enter for current directory): ").strip()
    if not project_root:
        project_root = os.getcwd()
    
    print(f"Analyzing project: {project_root}")
    
    analyzer = ProjectAnalyzer(project_root)
    
    # Step 1: Scan project
    print("Scanning project files...")
    file_data = analyzer.scan_project()
    print(f"Found {len(file_data)} files")
    
    # Step 2: Build dependency graph
    print("Building dependency graph...")
    graph, reverse_graph = analyzer.build_dependency_graph(file_data)
    
    # Step 3: Find unused files
    print("Finding unused files...")
    unused_files = analyzer.find_unused_files(file_data, reverse_graph)
    
    # Step 4: Find duplicates
    print("Finding duplicate files...")
    duplicate_files, similar_files = analyzer.find_duplicate_files(file_data)
    
    # Step 5: Compare similar files
    print("Comparing similar files...")
    merge_recommendations = []
    for file_group in similar_files:
        comparison = analyzer.compare_similar_files(file_group)
        if comparison:
            merge_recommendations.append(comparison)
    
    # Step 6: Analyze architecture
    print("Analyzing architecture...")
    architecture = analyzer.analyze_architecture(file_data)
    
    # Step 7: Generate refactor plan
    print("Generating refactor plan...")
    refactor_plan = analyzer.generate_refactor_plan({
        'file_data': file_data,
        'unused_files': unused_files,
        'duplicate_files': duplicate_files,
        'similar_files': similar_files
    })
    
    # Step 8: Risk assessment
    print("Assessing risks...")
    risk_assessment = analyzer.generate_risk_assessment({
        'file_data': file_data,
        'unused_files': unused_files,
        'duplicate_files': duplicate_files,
        'similar_files': similar_files
    })
    
    # Step 9: Generate JSON report
    report = {
        'project_root': project_root,
        'scan_date': str(Path(__file__).stat().st_mtime),
        'total_files': len(file_data),
        'file_types': {
            f['type']: len([fd for fd in file_data if fd['type'] == f['type']])
            for f in file_data
        },
        'unused_files': unused_files,
        'duplicate_files': [
            {
                'files': [f['path'] for f in group],
                'hash': group[0]['hash'] if group else ''
            }
            for group in duplicate_files
        ],
        'similar_named_files': [
            {
                'files': [f['path'] for f in group],
                'common_name': Path(group[0]['path']).stem if group else ''
            }
            for group in similar_files
        ],
        'merge_recommendations': merge_recommendations,
        'architecture_analysis': architecture,
        'refactor_plan': refactor_plan,
        'risk_assessment': risk_assessment,
        'replace_recommendations': []
    }
    
    # Step 10: Save JSON report
    output_path = Path(project_root) / 'analysis_report.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"\n✓ Analysis complete!")
    print(f"✓ Report saved to: {output_path}")
    print(f"\nSummary:")
    print(f"  - Total files: {report['total_files']}")
    print(f"  - Unused files: {len(report['unused_files'])}")
    print(f"  - Duplicate groups: {len(report['duplicate_files'])}")
    print(f"  - Similar name groups: {len(report['similar_named_files'])}")
    print(f"  - Overall risk: {risk_assessment['overall_risk']}")
    
    return report

if __name__ == "__main__":
    main()