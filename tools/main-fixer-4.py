#!/usr/bin/env python3
"""
Enterprise Code Intelligence Platform — Safe Refactor Edition
==============================================================
A professional-grade structural analysis tool for TypeScript/React/Electron projects
with non-destructive safe archive capabilities.

Author: Senior Software Architect
Purpose: Deep semantic analysis with conservative refactoring recommendations
Output: Self-contained interactive HTML dashboard + Safe archive packages
"""

import os
import re
import json
import hashlib
import shutil
import zipfile
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict, Counter
from typing import Dict, List, Set, Tuple, Optional, Any
from dataclasses import dataclass, asdict, field
from difflib import SequenceMatcher
from enum import Enum
import csv

# ============================================================================
# ENUMS
# ============================================================================

class RiskLevel(Enum):
    """Risk classification levels"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class Recommendation(Enum):
    """Action recommendations"""
    SAFE_TO_ARCHIVE = "SAFE_TO_ARCHIVE"
    INVESTIGATE = "INVESTIGATE"
    MERGE = "MERGE"
    REFACTOR_FOR_CLARITY = "REFACTOR_FOR_CLARITY"
    KEEP = "KEEP"
    REVIEW = "REVIEW"

class FileCategory(Enum):
    """File classification categories"""
    UI_COMPONENT = "UI_COMPONENT"
    CUSTOM_HOOK = "CUSTOM_HOOK"
    PAGE_OR_ROUTE = "PAGE_OR_ROUTE"
    CONTEXT = "CONTEXT"
    STORE_OR_STATE = "STORE_OR_STATE"
    UTILITY = "UTILITY"
    SERVICE = "SERVICE"
    CORE_LOGIC = "CORE_LOGIC"
    TEST = "TEST"
    CONFIGURATION = "CONFIGURATION"
    ASSET = "ASSET"
    SCRIPT = "SCRIPT"
    UNKNOWN = "UNKNOWN"

# ============================================================================
# CONFIGURATION & CONSTANTS
# ============================================================================

IGNORE_PATTERNS = {
    'backup', 'archive', 'temp', 'tmp', 'dist', 'build', 'final',
    'node_modules', '.git', '.vscode', 'coverage', '.next', 'out',
    '__pycache__', '.pytest_cache', '.mypy_cache', 'vendor',
    'refactor_temp', 'refactor_archive'
}

FILE_EXTENSIONS = {
    '.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss',
    '.html', '.md', '.yml', '.yaml', '.env'
}

ENTRY_POINT_PATTERNS = {
    'main.ts', 'main.tsx', 'index.ts', 'index.tsx',
    'app.ts', 'app.tsx', '_app.tsx', 'main.js'
}

STRUCTURAL_SIMILARITY_THRESHOLD = 0.85
STABILITY_THRESHOLD = 4.0
DAYS_SINCE_MODIFICATION = 30

# ============================================================================
# ANSI COLOR CODES
# ============================================================================

class Colors:
    """ANSI color codes for terminal output"""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

# ============================================================================
# DATA STRUCTURES
# ============================================================================

@dataclass
class FileInfo:
    """Complete metadata for a single file"""
    path: str
    relative_path: str
    name: str
    extension: str
    size: int
    lines: int
    hash: str
    structural_hash: str
    modified: float
    category: FileCategory
    exports: List[str] = field(default_factory=list)
    imports: List[str] = field(default_factory=list)
    dependencies: Set[str] = field(default_factory=set)
    dependents: Set[str] = field(default_factory=set)
    references: int = 0
    is_entry_point: bool = False
    risk_level: RiskLevel = RiskLevel.LOW
    recommendation: Recommendation = Recommendation.KEEP
    reasoning: str = ""
    stability_score: float = 0.0
    any_count: int = 0
    complexity_score: int = 0
    is_react_component: bool = False
    is_custom_hook: bool = False
    component_type: str = ""
    
@dataclass
class ComponentInfo:
    """React component specific information"""
    name: str
    file_path: str
    is_default_export: bool
    is_named_export: bool
    is_function_component: bool
    is_arrow_component: bool
    props_interface: Optional[str] = None
    hooks_used: List[str] = field(default_factory=list)
    
@dataclass
class DuplicateCluster:
    """Group of duplicate or similar files"""
    cluster_id: int
    similarity: float
    files: List[str]
    type: str
    recommended_action: Recommendation
    confidence: float
    reasoning: List[str]
    suggested_base_file: str
    diff_summary: List[str] = field(default_factory=list)
    merge_strategy: Optional[Dict[str, Any]] = None
    
@dataclass
class SameNameConflict:
    """Files with identical names in different locations"""
    name: str
    locations: List[str]
    recommended_keep: str
    confidence: float
    risk_level: RiskLevel
    reasoning: List[str]

@dataclass
class AnalysisReport:
    """Complete analysis results"""
    timestamp: str
    project_path: str
    total_files: int
    total_lines: int
    total_size: int
    files: Dict[str, FileInfo]
    components: List[ComponentInfo]
    duplicates: List[DuplicateCluster]
    same_name_conflicts: List[SameNameConflict]
    unused_files: List[str]
    unwired_features: List[str]
    archive_candidates: List[str]
    category_distribution: Dict[str, int]
    risk_distribution: Dict[str, int]

# ============================================================================
# FILE SCANNER
# ============================================================================

class ProjectScanner:
    """Scans and catalogs all project files"""
    
    def __init__(self, root_path: str):
        self.root = Path(root_path).resolve()
        self.files: Dict[str, FileInfo] = {}
        self.components: List[ComponentInfo] = []
        
    def should_ignore(self, path: Path) -> bool:
        """Check if path should be ignored"""
        parts = path.parts
        return any(pattern in parts or pattern in path.name.lower() 
                  for pattern in IGNORE_PATTERNS)
    
    def scan(self) -> Tuple[Dict[str, FileInfo], List[ComponentInfo]]:
        """Perform complete project scan"""
        print(f"{Colors.OKCYAN}🔍 Scanning project structure...{Colors.ENDC}")
        
        for root, dirs, files in os.walk(self.root):
            dirs[:] = [d for d in dirs if not self.should_ignore(Path(root) / d)]
            
            for file in files:
                file_path = Path(root) / file
                
                if self.should_ignore(file_path):
                    continue
                    
                if file_path.suffix not in FILE_EXTENSIONS:
                    continue
                
                try:
                    metadata = self._analyze_file(file_path)
                    self.files[str(file_path)] = metadata
                except Exception as e:
                    print(f"{Colors.WARNING}⚠️  Error analyzing {file_path}: {e}{Colors.ENDC}")
        
        print(f"{Colors.OKGREEN}✓ Scanned {len(self.files)} files{Colors.ENDC}")
        return self.files, self.components
    
    def _analyze_file(self, path: Path) -> FileInfo:
        """Extract complete metadata from a file"""
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        lines = content.count('\n') + 1
        size = path.stat().st_size
        modified = path.stat().st_mtime
        
        file_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()
        structural_hash = self._compute_structural_hash(content)
        
        exports = self._extract_exports(content)
        imports = self._extract_imports(content)
        
        category = self._classify_file(path, content)
        
        any_count = len(re.findall(r':\s*any\b', content))
        complexity_score = self._compute_complexity(content)
        
        is_entry = path.name in ENTRY_POINT_PATTERNS
        
        is_react_component, component_type = self._detect_react_component(content)
        is_custom_hook = self._detect_custom_hook(path.name, content)
        
        if is_react_component:
            component_info = self._extract_component_info(path, content)
            if component_info:
                self.components.append(component_info)
        
        relative = path.relative_to(self.root)
        
        return FileInfo(
            path=str(path),
            relative_path=str(relative),
            name=path.name,
            extension=path.suffix,
            size=size,
            lines=lines,
            hash=file_hash,
            structural_hash=structural_hash,
            modified=modified,
            category=category,
            exports=exports,
            imports=imports,
            is_entry_point=is_entry,
            any_count=any_count,
            complexity_score=complexity_score,
            is_react_component=is_react_component,
            is_custom_hook=is_custom_hook,
            component_type=component_type
        )
    
    def _compute_structural_hash(self, content: str) -> str:
        """Compute hash of normalized structure"""
        content = re.sub(r'//.*?$', '', content, flags=re.MULTILINE)
        content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
        content = re.sub(r'\s+', ' ', content)
        return hashlib.sha256(content.encode('utf-8')).hexdigest()
    
    def _extract_exports(self, content: str) -> List[str]:
        """Extract all exported symbols"""
        exports = []
        
        for match in re.finditer(r'export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)', content):
            exports.append(match.group(1))
        
        for match in re.finditer(r'export\s+\{([^}]+)\}', content):
            names = match.group(1).split(',')
            exports.extend([n.strip().split()[0] for n in names if n.strip()])
        
        if re.search(r'export\s+default', content):
            exports.append('default')
        
        return list(set(exports))
    
    def _extract_imports(self, content: str) -> List[str]:
        """Extract all import statements"""
        imports = []
        
        for match in re.finditer(r'import\s+.*?from\s+[\'"]([^\'"]+)[\'"]', content):
            imports.append(match.group(1))
        
        for match in re.finditer(r'require\([\'"]([^\'"]+)[\'"]\)', content):
            imports.append(match.group(1))
        
        return imports
    
    def _classify_file(self, path: Path, content: str) -> FileCategory:
        """Classify file by purpose"""
        rel_path = str(path).lower()
        name = path.name.lower()
        
        if self._detect_custom_hook(path.name, content):
            return FileCategory.CUSTOM_HOOK
        
        if 'route' in rel_path or 'page' in rel_path or '_app' in name:
            return FileCategory.PAGE_OR_ROUTE
        
        if 'context' in rel_path or 'Context' in path.name:
            return FileCategory.CONTEXT
        
        if 'store' in rel_path or 'state' in rel_path or 'redux' in rel_path:
            return FileCategory.STORE_OR_STATE
        
        if 'component' in rel_path or path.suffix in {'.tsx', '.jsx'}:
            if self._detect_react_component(content)[0]:
                return FileCategory.UI_COMPONENT
        
        if 'service' in rel_path or 'api' in rel_path:
            return FileCategory.SERVICE
        
        if 'util' in rel_path or 'helper' in rel_path:
            return FileCategory.UTILITY
        
        if 'test' in rel_path or 'spec' in rel_path:
            return FileCategory.TEST
        
        if 'config' in rel_path or path.suffix in {'.json', '.yml', '.yaml'}:
            return FileCategory.CONFIGURATION
        
        if 'asset' in rel_path or path.suffix in {'.css', '.scss'}:
            return FileCategory.ASSET
        
        if 'script' in rel_path:
            return FileCategory.SCRIPT
        
        if 'React.Component' in content or 'useState' in content:
            return FileCategory.UI_COMPONENT
        
        if 'describe(' in content or 'it(' in content:
            return FileCategory.TEST
        
        return FileCategory.CORE_LOGIC
    
    def _compute_complexity(self, content: str) -> int:
        """Compute simple complexity score"""
        score = 0
        score += content.count('if ')
        score += content.count('for ')
        score += content.count('while ')
        score += content.count('switch ')
        score += content.count('case ')
        score += content.count('&&')
        score += content.count('||')
        return score
    
    def _detect_react_component(self, content: str) -> Tuple[bool, str]:
        """Detect if file contains React component"""
        function_pattern = r'function\s+([A-Z]\w+)\s*\([^)]*\)\s*\{[^}]*return\s*\('
        arrow_pattern = r'const\s+([A-Z]\w+)\s*[=:]\s*\([^)]*\)\s*=>\s*\{?[^}]*return\s*\('
        arrow_direct_pattern = r'const\s+([A-Z]\w+)\s*[=:]\s*\([^)]*\)\s*=>\s*\('
        
        if re.search(function_pattern, content):
            return True, "function"
        if re.search(arrow_pattern, content) or re.search(arrow_direct_pattern, content):
            return True, "arrow"
        if 'React.Component' in content or 'Component' in content and 'extends' in content:
            return True, "class"
        
        return False, ""
    
    def _detect_custom_hook(self, filename: str, content: str) -> bool:
        """Detect custom React hooks"""
        if not filename.startswith('use') and not 'use' in filename.lower():
            return False
        
        hook_pattern = r'export\s+(?:const|function)\s+(use[A-Z]\w+)'
        return bool(re.search(hook_pattern, content))
    
    def _extract_component_info(self, path: Path, content: str) -> Optional[ComponentInfo]:
        """Extract detailed component information"""
        function_match = re.search(r'function\s+([A-Z]\w+)\s*\([^)]*\)', content)
        arrow_match = re.search(r'const\s+([A-Z]\w+)\s*[=:]\s*\([^)]*\)\s*=>', content)
        
        name = None
        is_function = False
        is_arrow = False
        
        if function_match:
            name = function_match.group(1)
            is_function = True
        elif arrow_match:
            name = arrow_match.group(1)
            is_arrow = True
        
        if not name:
            return None
        
        is_default = 'export default' in content
        is_named = f'export {{{name}}}' in content or f'export const {name}' in content or f'export function {name}' in content
        
        hooks_used = []
        for hook in ['useState', 'useEffect', 'useContext', 'useReducer', 'useCallback', 'useMemo', 'useRef']:
            if hook in content:
                hooks_used.append(hook)
        
        props_match = re.search(r'interface\s+\w*Props\s*\{[^}]+\}', content)
        props_interface = props_match.group(0) if props_match else None
        
        return ComponentInfo(
            name=name,
            file_path=str(path),
            is_default_export=is_default,
            is_named_export=is_named,
            is_function_component=is_function,
            is_arrow_component=is_arrow,
            props_interface=props_interface,
            hooks_used=hooks_used
        )

# ============================================================================
# DUPLICATE DETECTOR (MULTI-LAYER)
# ============================================================================

class DuplicateDetector:
    """Advanced multi-layer duplicate detection engine"""
    
    def __init__(self, files: Dict[str, FileInfo]):
        self.files = files
        self.clusters: List[DuplicateCluster] = []
        self.cluster_id = 0
    
    def analyze(self) -> List[DuplicateCluster]:
        """Perform all duplicate detection layers"""
        print(f"{Colors.OKCYAN}🔍 Detecting duplicates (multi-layer)...{Colors.ENDC}")
        
        self._detect_exact_duplicates()
        self._detect_structural_duplicates()
        self._detect_semantic_duplicates()
        
        print(f"{Colors.OKGREEN}✓ Found {len(self.clusters)} duplicate clusters{Colors.ENDC}")
        return self.clusters
    
    def _detect_exact_duplicates(self):
        """Layer 1: Find files with identical content"""
        hash_groups = defaultdict(list)
        
        for path, meta in self.files.items():
            if meta.size > 100:
                hash_groups[meta.hash].append(path)
        
        for file_hash, paths in hash_groups.items():
            if len(paths) > 1:
                self._create_cluster(paths, 1.0, 'exact')
    
    def _detect_structural_duplicates(self):
        """Layer 2: Find files with similar structure (≥85% similarity)"""
        processed = set()
        
        for path1, meta1 in self.files.items():
            if path1 in processed or meta1.size < 100:
                continue
            
            similar_files = [path1]
            
            for path2, meta2 in self.files.items():
                if path2 <= path1 or path2 in processed or meta2.size < 100:
                    continue
                
                if meta1.structural_hash == meta2.structural_hash:
                    similarity = self._compute_structural_similarity(path1, path2)
                    if similarity >= STRUCTURAL_SIMILARITY_THRESHOLD:
                        similar_files.append(path2)
                        processed.add(path2)
            
            if len(similar_files) > 1:
                avg_sim = sum(
                    self._compute_structural_similarity(similar_files[0], f)
                    for f in similar_files[1:]
                ) / (len(similar_files) - 1)
                
                self._create_cluster(similar_files, avg_sim, 'structural')
                processed.update(similar_files)
    
    def _detect_semantic_duplicates(self):
        """Layer 3: Find files with similar API surface"""
        export_groups = defaultdict(list)
        
        for path, meta in self.files.items():
            if meta.exports and len(meta.exports) >= 2:
                signature = tuple(sorted(meta.exports))
                export_groups[signature].append(path)
        
        for signature, paths in export_groups.items():
            if len(paths) > 1:
                if any(set(paths).issubset(set(c.files)) for c in self.clusters):
                    continue
                
                self._create_cluster(paths, 0.75, 'semantic')
    
    def _compute_structural_similarity(self, path1: str, path2: str) -> float:
        """Compute structural similarity between two files"""
        try:
            with open(path1, 'r', encoding='utf-8', errors='ignore') as f1:
                content1 = f1.read()
            with open(path2, 'r', encoding='utf-8', errors='ignore') as f2:
                content2 = f2.read()
            
            normalized1 = self._normalize_for_comparison(content1)
            normalized2 = self._normalize_for_comparison(content2)
            
            return SequenceMatcher(None, normalized1, normalized2).ratio()
        except:
            return 0.0
    
    def _normalize_for_comparison(self, content: str) -> str:
        """Normalize code for structural comparison"""
        content = re.sub(r'//.*?$', '', content, flags=re.MULTILINE)
        content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
        content = re.sub(r'["\'].*?["\']', '""', content)
        content = re.sub(r'\b\d+\b', '0', content)
        content = re.sub(r'\s+', ' ', content)
        
        var_names = re.findall(r'\b[a-z_][a-zA-Z0-9_]*\b', content)
        var_map = {name: f'VAR{i}' for i, name in enumerate(set(var_names))}
        for original, placeholder in var_map.items():
            content = re.sub(r'\b' + original + r'\b', placeholder, content)
        
        return content
    
    def _create_cluster(self, paths: List[str], similarity: float, cluster_type: str):
        """Create a duplicate cluster with recommendations"""
        self.cluster_id += 1
        
        file_scores = []
        for path in paths:
            meta = self.files[path]
            score = (
                len(meta.dependents) * 20 +
                meta.stability_score * 10 +
                len(meta.exports) * 5 +
                meta.lines * 0.1 -
                meta.any_count * 2
            )
            file_scores.append((path, score))
        
        file_scores.sort(key=lambda x: x[1], reverse=True)
        suggested_base = file_scores[0][0]
        
        reasoning = self._generate_reasoning(paths, suggested_base)
        confidence = self._compute_confidence(paths, similarity)
        diff_summary = self._generate_diff_summary(paths, suggested_base)
        merge_strategy = self._create_merge_strategy(paths, suggested_base)
        
        action = Recommendation.MERGE if confidence > 0.8 else Recommendation.REVIEW
        
        cluster = DuplicateCluster(
            cluster_id=self.cluster_id,
            similarity=similarity,
            files=paths,
            type=cluster_type,
            recommended_action=action,
            confidence=confidence,
            reasoning=reasoning,
            suggested_base_file=suggested_base,
            diff_summary=diff_summary,
            merge_strategy=merge_strategy
        )
        
        self.clusters.append(cluster)
    
    def _generate_reasoning(self, paths: List[str], base: str) -> List[str]:
        """Generate human-readable reasoning"""
        reasoning = []
        
        base_meta = self.files[base]
        reasoning.append(f"Suggested base: {Path(base).name}")
        reasoning.append(f"Base has {len(base_meta.dependents)} dependents")
        reasoning.append(f"Base stability score: {base_meta.stability_score:.1f}/10")
        
        for path in paths:
            if path != base:
                meta = self.files[path]
                if len(meta.dependents) == 0:
                    reasoning.append(f"{Path(path).name} has no dependents")
                if meta.any_count > base_meta.any_count:
                    reasoning.append(f"{Path(path).name} has weaker typing")
        
        return reasoning
    
    def _compute_confidence(self, paths: List[str], similarity: float) -> float:
        """Compute confidence score for recommendation"""
        confidence = similarity * 0.6
        
        deps = [len(self.files[p].dependents) for p in paths]
        if max(deps) > sum(deps) * 0.7:
            confidence += 0.2
        
        sizes = [self.files[p].size for p in paths]
        if max(sizes) / (min(sizes) + 1) < 1.5:
            confidence += 0.1
        
        return min(confidence, 0.99)
    
    def _generate_diff_summary(self, paths: List[str], base: str) -> List[str]:
        """Generate 3-5 bullet point differences"""
        summary = []
        base_meta = self.files[base]
        
        for path in paths[:3]:
            if path != base:
                meta = self.files[path]
                
                if meta.lines != base_meta.lines:
                    summary.append(f"Line count: {base_meta.lines} vs {meta.lines}")
                
                unique_exports = set(meta.exports) - set(base_meta.exports)
                if unique_exports:
                    summary.append(f"Unique exports in {Path(path).name}: {', '.join(list(unique_exports)[:3])}")
                
                if meta.complexity_score != base_meta.complexity_score:
                    summary.append(f"Complexity: {base_meta.complexity_score} vs {meta.complexity_score}")
        
        if not summary:
            summary.append("Files are nearly identical")
        
        return summary[:5]
    
    def _create_merge_strategy(self, paths: List[str], base: str) -> Dict[str, Any]:
        """Create detailed merge strategy"""
        base_meta = self.files[base]
        
        preserve = []
        remove = []
        
        for path in paths:
            if path != base:
                meta = self.files[path]
                
                unique_exports = set(meta.exports) - set(base_meta.exports)
                if unique_exports:
                    preserve.append(f"Unique exports from {Path(path).name}: {', '.join(unique_exports)}")
                
                try:
                    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    if 'try' in content and 'catch' in content:
                        if 'try' not in open(base, 'r', encoding='utf-8', errors='ignore').read():
                            preserve.append(f"Error handling from {Path(path).name}")
                except:
                    pass
                
                remove.append(Path(path).name)
        
        total_deps = sum(len(self.files[p].dependents) for p in paths)
        impact = "Low" if total_deps < 5 else "Medium" if total_deps < 15 else "High"
        
        return {
            'base_file': str(Path(base).relative_to(Path(base).parents[len(Path(base).parents) - 1])),
            'preserve': preserve if preserve else ["All logic from base file"],
            'remove': remove,
            'impact_estimate': f"{impact} UI risk"
        }

# ============================================================================
# SAME-NAME CONFLICT ANALYZER
# ============================================================================

class SameNameAnalyzer:
    """Detect and analyze same-name file conflicts"""
    
    def __init__(self, files: Dict[str, FileInfo]):
        self.files = files
        self.conflicts: List[SameNameConflict] = []
    
    def analyze(self) -> List[SameNameConflict]:
        """Find and analyze same-name conflicts"""
        print(f"{Colors.OKCYAN}🔍 Analyzing same-name conflicts...{Colors.ENDC}")
        
        name_groups = defaultdict(list)
        
        for path, meta in self.files.items():
            name_groups[meta.name].append(path)
        
        for name, paths in name_groups.items():
            if len(paths) > 1:
                conflict = self._analyze_conflict(name, paths)
                self.conflicts.append(conflict)
        
        print(f"{Colors.OKGREEN}✓ Found {len(self.conflicts)} naming conflicts{Colors.ENDC}")
        return self.conflicts
    
    def _analyze_conflict(self, name: str, paths: List[str]) -> SameNameConflict:
        """Analyze a specific naming conflict"""
        scores = []
        for path in paths:
            meta = self.files[path]
            score = (
                len(meta.dependents) * 20 +
                len(meta.exports) * 10 +
                meta.stability_score * 5 +
                meta.lines * 0.5 +
                (100 if meta.is_entry_point else 0) -
                meta.any_count * 5
            )
            scores.append((path, score))
        
        scores.sort(key=lambda x: x[1], reverse=True)
        recommended = scores[0][0]
        
        if len(scores) > 1:
            score_diff = scores[0][1] - scores[1][1]
            confidence = min(0.5 + (score_diff / 100), 0.95)
        else:
            confidence = 0.9
        
        max_deps = max(len(self.files[p].dependents) for p in paths)
        risk = RiskLevel.HIGH if max_deps > 10 else RiskLevel.MEDIUM if max_deps > 3 else RiskLevel.LOW
        
        reasoning = self._generate_conflict_reasoning(paths, recommended)
        
        return SameNameConflict(
            name=name,
            locations=paths,
            recommended_keep=recommended,
            confidence=confidence,
            risk_level=risk,
            reasoning=reasoning
        )
    
    def _generate_conflict_reasoning(self, paths: List[str], recommended: str) -> List[str]:
        """Generate reasoning for conflict resolution"""
        reasoning = []
        
        rec_meta = self.files[recommended]
        reasoning.append(f"Recommended: {Path(recommended).relative_to(Path(recommended).parents[2])}")
        reasoning.append(f"Has {len(rec_meta.dependents)} dependents")
        reasoning.append(f"Stability score: {rec_meta.stability_score:.1f}/10")
        
        for path in paths:
            if path != recommended:
                meta = self.files[path]
                rel_path = Path(path).relative_to(Path(path).parents[2])
                
                if len(meta.dependents) == 0:
                    reasoning.append(f"{rel_path}: No dependents")
                if meta.size < rec_meta.size * 0.5:
                    reasoning.append(f"{rel_path}: Significantly smaller")
                if not meta.exports:
                    reasoning.append(f"{rel_path}: No exports")
        
        return reasoning

# ============================================================================
# DEPENDENCY GRAPH BUILDER
# ============================================================================

class DependencyGraphBuilder:
    """Build cross-reference dependency graph"""
    
    def __init__(self, files: Dict[str, FileInfo]):
        self.files = files
    
    def build(self):
        """Build dependency relationships"""
        print(f"{Colors.OKCYAN}🔍 Building dependency graph...{Colors.ENDC}")
        
        for path, meta in self.files.items():
            for imp in meta.imports:
                resolved = self._resolve_import(path, imp)
                if resolved and resolved in self.files:
                    self.files[resolved].dependents.add(path)
                    meta.dependencies.add(resolved)
        
        print(f"{Colors.OKGREEN}✓ Dependency graph built{Colors.ENDC}")
    
    def _resolve_import(self, from_path: str, import_path: str) -> Optional[str]:
        """Resolve import statement to actual file path"""
        if import_path.startswith('.'):
            base_dir = Path(from_path).parent
            target = (base_dir / import_path).resolve()
            
            for ext in ['.ts', '.tsx', '.js', '.jsx', '']:
                candidate = str(target) + ext
                if candidate in self.files:
                    return candidate
                
                index_candidate = str(target / 'index') + ext
                if index_candidate in self.files:
                    return index_candidate
        
        return None

# ============================================================================
# USAGE ANALYZER
# ============================================================================

class UsageAnalyzer:
    """Analyze file usage and detect unused/unwired features"""
    
    def __init__(self, files: Dict[str, FileInfo]):
        self.files = files
        self.unused: List[str] = []
        self.unwired: List[str] = []
        
    def analyze(self):
        """Perform usage analysis"""
        print(f"{Colors.OKCYAN}🔍 Analyzing file usage patterns...{Colors.ENDC}")
        
        self._detect_unused()
        self._detect_unwired()
        
        print(f"{Colors.OKGREEN}✓ Found {len(self.unused)} unused files{Colors.ENDC}")
        print(f"{Colors.OKGREEN}✓ Found {len(self.unwired)} unwired features{Colors.ENDC}")
    
    def _detect_unused(self):
        """Detect likely unused files"""
        for path, meta in self.files.items():
            if meta.is_entry_point:
                continue
            
            if meta.category in {FileCategory.CONFIGURATION, FileCategory.ASSET}:
                continue
            
            if len(meta.dependents) == 0 and meta.exports:
                self.unused.append(path)
    
    def _detect_unwired(self):
        """Detect features not integrated into app"""
        for path, meta in self.files.items():
            if path in self.unused:
                continue
            
            if (len(meta.dependents) == 0 and 
                meta.lines > 50 and 
                len(meta.exports) > 2 and
                meta.category in {FileCategory.SERVICE, FileCategory.UI_COMPONENT, 
                                 FileCategory.CUSTOM_HOOK, FileCategory.CORE_LOGIC}):
                self.unwired.append(path)

# ============================================================================
# STABILITY & RISK CALCULATOR
# ============================================================================

class StabilityCalculator:
    """Calculate stability and risk scores"""
    
    def __init__(self, files: Dict[str, FileInfo]):
        self.files = files
    
    def calculate(self):
        """Calculate all scores"""
        print(f"{Colors.OKCYAN}🔍 Computing stability and risk metrics...{Colors.ENDC}")
        
        for path, meta in self.files.items():
            meta.stability_score = self._compute_stability(meta)
            meta.risk_level = self._compute_risk_level(meta)
            meta.recommendation = self._compute_recommendation(meta)
            meta.reasoning = self._generate_reasoning(meta)
        
        print(f"{Colors.OKGREEN}✓ Stability and risk metrics computed{Colors.ENDC}")
    
    def _compute_stability(self, meta: FileInfo) -> float:
        """Compute stability score (0-10)"""
        score = 0.0
        
        score += min(len(meta.dependents) * 0.4, 4.0)
        score += min(len(meta.exports) * 0.2, 2.0)
        score += min(meta.lines * 0.01, 2.0)
        
        age_days = (datetime.now().timestamp() - meta.modified) / 86400
        score += max(2.0 - (age_days * 0.01), 0)
        
        if meta.any_count > 0:
            score -= min(meta.any_count * 0.1, 1.0)
        
        return max(min(score, 10.0), 0.0)
    
    def _compute_risk_level(self, meta: FileInfo) -> RiskLevel:
        """Compute refactoring risk level"""
        risk_score = 0
        
        risk_score += min(len(meta.dependents) * 5, 50)
        
        if meta.is_entry_point:
            risk_score += 30
        
        if meta.category in {FileCategory.PAGE_OR_ROUTE, FileCategory.CONTEXT, 
                            FileCategory.STORE_OR_STATE}:
            risk_score += 20
        
        risk_score += min(meta.any_count * 2, 20)
        
        if risk_score >= 70:
            return RiskLevel.CRITICAL
        elif risk_score >= 50:
            return RiskLevel.HIGH
        elif risk_score >= 30:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW
    
    def _compute_recommendation(self, meta: FileInfo) -> Recommendation:
        """Compute recommendation based on metrics"""
        if meta.is_entry_point:
            return Recommendation.KEEP
        
        if meta.category in {FileCategory.PAGE_OR_ROUTE, FileCategory.CONTEXT, 
                            FileCategory.STORE_OR_STATE}:
            if len(meta.dependents) > 0:
                return Recommendation.KEEP
        
        if meta.risk_level == RiskLevel.CRITICAL:
            return Recommendation.KEEP
        
        if meta.risk_level == RiskLevel.HIGH:
            return Recommendation.INVESTIGATE
        
        age_days = (datetime.now().timestamp() - meta.modified) / 86400
        
        if (meta.risk_level in {RiskLevel.LOW, RiskLevel.MEDIUM} and
            meta.stability_score < STABILITY_THRESHOLD and
            len(meta.dependents) == 0 and
            age_days > DAYS_SINCE_MODIFICATION and
            not meta.exports):
            return Recommendation.SAFE_TO_ARCHIVE
        
        if len(meta.dependents) == 0 and meta.exports and age_days > DAYS_SINCE_MODIFICATION:
            return Recommendation.INVESTIGATE
        
        return Recommendation.KEEP
    
    def _generate_reasoning(self, meta: FileInfo) -> str:
        """Generate reasoning for recommendation"""
        reasons = []
        
        if meta.is_entry_point:
            reasons.append("Entry point file")
        
        if len(meta.dependents) > 5:
            reasons.append(f"High dependent count ({len(meta.dependents)})")
        
        if meta.stability_score > 7:
            reasons.append(f"High stability ({meta.stability_score:.1f}/10)")
        
        if len(meta.dependents) == 0:
            reasons.append("No dependents found")
        
        age_days = (datetime.now().timestamp() - meta.modified) / 86400
        if age_days > DAYS_SINCE_MODIFICATION:
            reasons.append(f"Not modified in {int(age_days)} days")
        
        if meta.any_count > 5:
            reasons.append(f"Weak typing ({meta.any_count} 'any' usages)")
        
        return " | ".join(reasons) if reasons else "Standard file"

# ============================================================================
# ARCHIVE BUILDER
# ============================================================================

class ArchiveBuilder:
    """Build safe non-destructive archive packages"""
    
    def __init__(self, project_path: str, files: Dict[str, FileInfo]):
        self.project_path = Path(project_path)
        self.files = files
        self.archive_dir = self.project_path / 'refactor_temp' / 'archived_files'
        
    def create_archive(self, candidates: List[str]) -> str:
        """Create safe archive package"""
        if not candidates:
            print(f"{Colors.WARNING}⚠️  No files to archive{Colors.ENDC}")
            return ""
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        archive_name = f"refactor_archive_{timestamp}.zip"
        archive_path = self.project_path / archive_name
        
        print(f"{Colors.OKCYAN}📦 Creating safe archive package...{Colors.ENDC}")
        
        self.archive_dir.mkdir(parents=True, exist_ok=True)
        
        metadata = {
            'timestamp': timestamp,
            'total_files': len(candidates),
            'files': []
        }
        
        for file_path in candidates:
            try:
                source = Path(file_path)
                relative = source.relative_to(self.project_path)
                target = self.archive_dir / relative
                
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, target)
                
                meta = self.files[file_path]
                metadata['files'].append({
                    'path': str(relative),
                    'size': meta.size,
                    'lines': meta.lines,
                    'category': meta.category.value,
                    'risk_level': meta.risk_level.value,
                    'stability_score': meta.stability_score,
                    'recommendation': meta.recommendation.value,
                    'reasoning': meta.reasoning
                })
                
            except Exception as e:
                print(f"{Colors.WARNING}⚠️  Error archiving {file_path}: {e}{Colors.ENDC}")
        
        metadata_path = self.archive_dir / 'metadata.json'
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)
        
        with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(self.archive_dir):
                for file in files:
                    file_path = Path(root) / file
                    arcname = file_path.relative_to(self.archive_dir.parent)
                    zipf.write(file_path, arcname)
        
        shutil.rmtree(self.archive_dir)
        
        print(f"{Colors.OKGREEN}✓ Archive created: {archive_name}{Colors.ENDC}")
        print(f"{Colors.OKGREEN}✓ {len(candidates)} files archived safely{Colors.ENDC}")
        print(f"{Colors.BOLD}⚠️  NO FILES WERE MODIFIED OR DELETED{Colors.ENDC}")
        
        return str(archive_path)

# ============================================================================
# REPORT GENERATOR
# ============================================================================

class ReportGenerator:
    """Generate interactive HTML dashboard and exports"""
    
    def __init__(self, report: AnalysisReport):
        self.report = report
    
    def generate_html(self, output_path: str):
        """Generate complete HTML report"""
        print(f"{Colors.OKCYAN}📊 Generating HTML dashboard...{Colors.ENDC}")
        
        html = self._build_html()
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html)
        
        print(f"{Colors.OKGREEN}✓ Dashboard saved to: {output_path}{Colors.ENDC}")
    
    def export_json(self, output_path: str):
        """Export full report as JSON"""
        print(f"{Colors.OKCYAN}📄 Exporting JSON report...{Colors.ENDC}")
        
        data = {
            'timestamp': self.report.timestamp,
            'project_path': self.report.project_path,
            'summary': {
                'total_files': self.report.total_files,
                'total_lines': self.report.total_lines,
                'total_size': self.report.total_size,
                'duplicates': len(self.report.duplicates),
                'conflicts': len(self.report.same_name_conflicts),
                'unused': len(self.report.unused_files),
                'unwired': len(self.report.unwired_features),
                'archive_candidates': len(self.report.archive_candidates)
            },
            'files': [
                {
                    'path': meta.relative_path,
                    'category': meta.category.value,
                    'risk': meta.risk_level.value,
                    'recommendation': meta.recommendation.value,
                    'stability': meta.stability_score,
                    'dependents': len(meta.dependents),
                    'reasoning': meta.reasoning
                }
                for meta in self.report.files.values()
            ],
            'duplicates': [
                {
                    'cluster_id': d.cluster_id,
                    'similarity': d.similarity,
                    'files': d.files,
                    'suggested_base': d.suggested_base_file,
                    'action': d.recommended_action.value
                }
                for d in self.report.duplicates
            ]
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        
        print(f"{Colors.OKGREEN}✓ JSON report saved to: {output_path}{Colors.ENDC}")
    
    def export_csv(self, output_path: str):
        """Export high-risk summary as CSV"""
        print(f"{Colors.OKCYAN}📄 Exporting CSV summary...{Colors.ENDC}")
        
        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['File', 'Category', 'Risk', 'Recommendation', 'Stability', 'Dependents', 'Reasoning'])
            
            for meta in self.report.files.values():
                if meta.risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}:
                    writer.writerow([
                        meta.relative_path,
                        meta.category.value,
                        meta.risk_level.value,
                        meta.recommendation.value,
                        f"{meta.stability_score:.1f}",
                        len(meta.dependents),
                        meta.reasoning
                    ])
        
        print(f"{Colors.OKGREEN}✓ CSV summary saved to: {output_path}{Colors.ENDC}")
    
    def _build_html(self) -> str:
        """Build complete HTML document"""
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Intelligence Dashboard — {datetime.now().strftime('%Y-%m-%d %H:%M')}</title>
    <style>{self._get_styles()}</style>
</head>
<body>
    <div class="dashboard">
        {self._build_header()}
        {self._build_safety_notice()}
        {self._build_summary()}
        {self._build_charts()}
        {self._build_search()}
        {self._build_duplicates()}
        {self._build_conflicts()}
        {self._build_unused()}
        {self._build_unwired()}
        {self._build_archive_candidates()}
    </div>
    <script>{self._get_scripts()}</script>
</body>
</html>"""
    
    def _get_styles(self) -> str:
        """Generate CSS styles"""
        return """
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

:root {
    --bg-primary: #0a0e27;
    --bg-secondary: #141b3a;
    --bg-card: rgba(20, 27, 58, 0.6);
    --border: rgba(99, 102, 241, 0.2);
    --text-primary: #e2e8f0;
    --text-secondary: #94a3b8;
    --accent: #6366f1;
    --success: #10b981;
    --warning: #f59e0b;
    --danger: #ef4444;
    --glass: rgba(255, 255, 255, 0.05);
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: linear-gradient(135deg, var(--bg-primary) 0%, #1a1f3a 100%);
    color: var(--text-primary);
    min-height: 100vh;
    line-height: 1.6;
}

.dashboard {
    max-width: 1600px;
    margin: 0 auto;
    padding: 20px;
}

.header {
    background: var(--bg-card);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 30px;
    margin-bottom: 20px;
    position: sticky;
    top: 20px;
    z-index: 100;
}

.header h1 {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 8px;
    background: linear-gradient(135deg, var(--accent), #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.header .meta {
    color: var(--text-secondary);
    font-size: 14px;
}

.safety-notice {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05));
    border: 2px solid var(--success);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 30px;
    text-align: center;
}

.safety-notice h2 {
    color: var(--success);
    font-size: 20px;
    margin-bottom: 10px;
}

.safety-notice p {
    color: var(--text-secondary);
    font-size: 14px;
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.stat-card {
    background: var(--bg-card);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    transition: all 0.3s ease;
}

.stat-card:hover {
    transform: translateY(-4px);
    border-color: var(--accent);
    box-shadow: 0 8px 32px rgba(99, 102, 241, 0.2);
}

.stat-card .label {
    color: var(--text-secondary);
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
}

.stat-card .value {
    font-size: 32px;
    font-weight: 700;
    color: var(--text-primary);
}

.stat-card .subtext {
    color: var(--text-secondary);
    font-size: 12px;
    margin-top: 8px;
}

.section {
    background: var(--bg-card);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 30px;
    margin-bottom: 30px;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border);
}

.section-title {
    font-size: 20px;
    font-weight: 600;
}

.badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
}

.badge.success { background: rgba(16, 185, 129, 0.2); color: var(--success); }
.badge.warning { background: rgba(245, 158, 11, 0.2); color: var(--warning); }
.badge.danger { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
.badge.info { background: rgba(99, 102, 241, 0.2); color: var(--accent); }
.badge.low { background: rgba(16, 185, 129, 0.2); color: var(--success); }
.badge.medium { background: rgba(245, 158, 11, 0.2); color: var(--warning); }
.badge.high { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
.badge.critical { background: rgba(239, 68, 68, 0.3); color: #ff6b6b; }

.search-box {
    width: 100%;
    padding: 14px 20px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 12px;
    color: var(--text-primary);
    font-size: 15px;
    margin-bottom: 20px;
    transition: all 0.3s ease;
}

.search-box:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.filter-group {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
}

.filter-btn {
    padding: 8px 16px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 14px;
}

.filter-btn:hover,
.filter-btn.active {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
}

.cluster {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 16px;
    transition: all 0.3s ease;
}

.cluster:hover {
    border-color: var(--accent);
}

.cluster-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    cursor: pointer;
}

.cluster-title {
    font-size: 16px;
    font-weight: 600;
}

.cluster-content {
    display: none;
    padding-top: 16px;
    border-top: 1px solid var(--border);
}

.cluster.expanded .cluster-content {
    display: block;
}

.file-list {
    list-style: none;
    margin: 12px 0;
}

.file-item {
    padding: 12px;
    background: var(--glass);
    border-radius: 8px;
    margin-bottom: 8px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
}

.recommendation {
    background: rgba(16, 185, 129, 0.1);
    border-left: 3px solid var(--success);
    padding: 16px;
    border-radius: 8px;
    margin-top: 16px;
}

.recommendation-title {
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--success);
}

.reasoning-list {
    list-style: none;
    margin-top: 12px;
}

.reasoning-list li {
    padding: 6px 0;
    padding-left: 20px;
    position: relative;
}

.reasoning-list li:before {
    content: "→";
    position: absolute;
    left: 0;
    color: var(--accent);
}

.chart-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.chart {
    background: var(--bg-card);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    min-height: 300px;
}

.chart-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
}

table {
    width: 100%;
    border-collapse: collapse;
}

th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid var(--border);
}

th {
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

tr:hover {
    background: var(--glass);
}

.progress-bar {
    width: 100%;
    height: 8px;
    background: var(--bg-secondary);
    border-radius: 4px;
    overflow: hidden;
    margin: 8px 0;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), #8b5cf6);
    border-radius: 4px;
    transition: width 0.6s ease;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

.section {
    animation: fadeIn 0.6s ease;
}

.confidence-high { color: var(--success); }
.confidence-medium { color: var(--warning); }
.confidence-low { color: var(--danger); }
"""
    
    def _build_header(self) -> str:
        """Build header section"""
        return f"""
<div class="header">
    <h1>🔬 Code Intelligence Dashboard — Safe Refactor Edition</h1>
    <div class="meta">
        <strong>Project:</strong> {self.report.project_path} | 
        <strong>Generated:</strong> {self.report.timestamp} |
        <strong>Analysis Engine:</strong> Enterprise Static Analyzer v3.0
    </div>
</div>
"""
    
    def _build_safety_notice(self) -> str:
        """Build safety notice"""
        return """
<div class="safety-notice">
    <h2>✅ SAFE NON-DESTRUCTIVE MODE ENABLED</h2>
    <p><strong>NO FILES WERE MODIFIED</strong> | <strong>NO FILES WERE DELETED</strong> | <strong>SAFE ARCHIVE STRATEGY ACTIVE</strong></p>
    <p>All recommendations are conservative. Archive packages preserve original structure.</p>
</div>
"""
    
    def _build_summary(self) -> str:
        """Build executive summary"""
        potential_savings = sum(
            self.report.files[f].size 
            for cluster in self.report.duplicates 
            for f in cluster.files[1:]
        )
        
        return f"""
<div class="summary-grid">
    <div class="stat-card">
        <div class="label">Total Files</div>
        <div class="value">{self.report.total_files:,}</div>
        <div class="subtext">Across all categories</div>
    </div>
    <div class="stat-card">
        <div class="label">Total Lines</div>
        <div class="value">{self.report.total_lines:,}</div>
        <div class="subtext">{self.report.total_size / 1024 / 1024:.1f} MB</div>
    </div>
    <div class="stat-card">
        <div class="label">Duplicate Clusters</div>
        <div class="value">{len(self.report.duplicates)}</div>
        <div class="subtext">{potential_savings / 1024:.0f} KB potential savings</div>
    </div>
    <div class="stat-card">
        <div class="label">Naming Conflicts</div>
        <div class="value">{len(self.report.same_name_conflicts)}</div>
        <div class="subtext">Same name, different paths</div>
    </div>
    <div class="stat-card">
        <div class="label">Unused Files</div>
        <div class="value">{len(self.report.unused_files)}</div>
        <div class="subtext">No references found</div>
    </div>
    <div class="stat-card">
        <div class="label">Archive Candidates</div>
        <div class="value">{len(self.report.archive_candidates)}</div>
        <div class="subtext">Safe to archive</div>
    </div>
</div>
"""
    
    def _build_charts(self) -> str:
        """Build charts section"""
        categories = json.dumps(list(self.report.category_distribution.keys()))
        category_counts = json.dumps(list(self.report.category_distribution.values()))
        
        return f"""
<div class="chart-container">
    <div class="chart">
        <div class="chart-title">File Category Distribution</div>
        <canvas id="categoryChart"></canvas>
    </div>
    <div class="chart">
        <div class="chart-title">Risk Distribution</div>
        <canvas id="riskChart"></canvas>
    </div>
</div>
<script>
window.chartData = {{
    categories: {categories},
    categoryCounts: {category_counts}
}};
</script>
"""
    
    def _build_search(self) -> str:
        """Build search and filter section"""
        return """
<div class="section">
    <div class="section-header">
        <h2 class="section-title">🔍 File Explorer</h2>
    </div>
    <input type="text" id="searchBox" class="search-box" placeholder="Search files by name or path...">
    <div class="filter-group">
        <button class="filter-btn active" data-filter="all">All Files</button>
        <button class="filter-btn" data-filter="unused">Unused</button>
        <button class="filter-btn" data-filter="duplicate">Duplicates</button>
        <button class="filter-btn" data-filter="high-risk">High Risk</button>
        <button class="filter-btn" data-filter="archive">Archive Candidates</button>
    </div>
    <div id="fileList"></div>
</div>
"""
    
    def _build_duplicates(self) -> str:
        """Build duplicates section"""
        html = f"""
<div class="section">
    <div class="section-header">
        <h2 class="section-title">📋 Duplicate Clusters</h2>
        <span class="badge info">{len(self.report.duplicates)} clusters</span>
    </div>
"""
        
        for cluster in self.report.duplicates:
            confidence_class = (
                'confidence-high' if cluster.confidence > 0.8 
                else 'confidence-medium' if cluster.confidence > 0.6 
                else 'confidence-low'
            )
            
            html += f"""
    <div class="cluster" data-cluster-id="{cluster.cluster_id}">
        <div class="cluster-header" onclick="toggleCluster({cluster.cluster_id})">
            <div>
                <span class="cluster-title">Cluster #{cluster.cluster_id}</span>
                <span class="badge {cluster.type}">{cluster.type}</span>
                <span class="badge {confidence_class}">{cluster.similarity:.0%} similar</span>
            </div>
            <span>▼</span>
        </div>
        <div class="cluster-content">
            <ul class="file-list">
"""
            for file in cluster.files:
                rel_path = Path(file).relative_to(Path(self.report.project_path))
                is_base = file == cluster.suggested_base_file
                html += f'                <li class="file-item">{"⭐ " if is_base else ""}{rel_path}</li>\n'
            
            html += f"""            </ul>
            <div class="recommendation">
                <div class="recommendation-title">💡 Recommended Action: {cluster.recommended_action.value} (Confidence: {cluster.confidence:.0%})</div>
                <ul class="reasoning-list">
"""
            for reason in cluster.reasoning:
                html += f'                    <li>{reason}</li>\n'
            
            html += """                </ul>
                <div style="margin-top: 12px;">
                    <strong>Differences:</strong>
                    <ul class="reasoning-list">
"""
            for diff in cluster.diff_summary:
                html += f'                        <li>{diff}</li>\n'
            
            html += """                    </ul>
                </div>
            </div>
        </div>
    </div>
"""
        
        html += "</div>"
        return html
    
    def _build_conflicts(self) -> str:
        """Build same-name conflicts section"""
        html = f"""
<div class="section">
    <div class="section-header">
        <h2 class="section-title">⚠️ Same-Name Conflicts</h2>
        <span class="badge warning">{len(self.report.same_name_conflicts)} conflicts</span>
    </div>
    <table>
        <thead>
            <tr>
                <th>File Name</th>
                <th>Locations</th>
                <th>Recommended</th>
                <th>Risk</th>
                <th>Confidence</th>
            </tr>
        </thead>
        <tbody>
"""
        
        for conflict in self.report.same_name_conflicts:
            risk_badge = f'badge {conflict.risk_level.value.lower()}'
            confidence_class = (
                'confidence-high' if conflict.confidence > 0.8 
                else 'confidence-medium' if conflict.confidence > 0.6 
                else 'confidence-low'
            )
            
            html += f"""
            <tr>
                <td><strong>{conflict.name}</strong></td>
                <td>{len(conflict.locations)} locations</td>
                <td style="font-family: monospace; font-size: 12px;">
                    {Path(conflict.recommended_keep).relative_to(Path(self.report.project_path))}
                </td>
                <td><span class="{risk_badge}">{conflict.risk_level.value}</span></td>
                <td class="{confidence_class}">{conflict.confidence:.0%}</td>
            </tr>
"""
        
        html += """
        </tbody>
    </table>
</div>
"""
        return html
    
    def _build_unused(self) -> str:
        """Build unused files section"""
        html = f"""
<div class="section">
    <div class="section-header">
        <h2 class="section-title">🗑️ Unused Files</h2>
        <span class="badge danger">{len(self.report.unused_files)} files</span>
    </div>
    <p style="color: var(--text-secondary); margin-bottom: 20px;">
        Files with exports but no dependents. Review carefully before archiving.
    </p>
    <ul class="file-list">
"""
        
        for file in self.report.unused_files[:50]:
            rel_path = Path(file).relative_to(Path(self.report.project_path))
            meta = self.report.files[file]
            html += f"""
        <li class="file-item">
            {rel_path}
            <span style="color: var(--text-secondary); margin-left: 12px;">
                {meta.lines} lines | {len(meta.exports)} exports | Stability: {meta.stability_score:.1f}/10
            </span>
        </li>
"""
        
        if len(self.report.unused_files) > 50:
            html += f"""
        <li class="file-item" style="text-align: center; color: var(--text-secondary);">
            ... and {len(self.report.unused_files) - 50} more
        </li>
"""
        
        html += """
    </ul>
</div>
"""
        return html
    
    def _build_unwired(self) -> str:
        """Build unwired features section"""
        html = f"""
<div class="section">
    <div class="section-header">
        <h2 class="section-title">🔌 Unwired Features</h2>
        <span class="badge warning">{len(self.report.unwired_features)} features</span>
    </div>
    <p style="color: var(--text-secondary); margin-bottom: 20px;">
        Substantial features with meaningful logic that are not integrated into the application.
    </p>
    <ul class="file-list">
"""
        
        for file in self.report.unwired_features:
            rel_path = Path(file).relative_to(Path(self.report.project_path))
            meta = self.report.files[file]
            html += f"""
        <li class="file-item">
            {rel_path}
            <span style="color: var(--text-secondary); margin-left: 12px;">
                {meta.lines} lines | {len(meta.exports)} exports | {meta.category.value}
            </span>
        </li>
"""
        
        html += """
    </ul>
</div>
"""
        return html
    
    def _build_archive_candidates(self) -> str:
        """Build archive candidates section"""
        html = f"""
<div class="section">
    <div class="section-header">
        <h2 class="section-title">📦 Safe Archive Candidates</h2>
        <span class="badge success">{len(self.report.archive_candidates)} files</span>
    </div>
    <p style="color: var(--text-secondary); margin-bottom: 20px;">
        Files that meet all safety criteria for archiving: Low/Medium risk, no dependents, not modified recently.
    </p>
    <ul class="file-list">
"""
        
        for file in self.report.archive_candidates[:50]:
            rel_path = Path(file).relative_to(Path(self.report.project_path))
            meta = self.report.files[file]
            html += f"""
        <li class="file-item">
            {rel_path}
            <span style="color: var(--text-secondary); margin-left: 12px;">
                {meta.category.value} | Risk: {meta.risk_level.value} | Stability: {meta.stability_score:.1f}/10
            </span>
        </li>
"""
        
        if len(self.report.archive_candidates) > 50:
            html += f"""
        <li class="file-item" style="text-align: center; color: var(--text-secondary);">
            ... and {len(self.report.archive_candidates) - 50} more
        </li>
"""
        
        html += """
    </ul>
</div>
"""
        return html
    
    def _get_scripts(self) -> str:
        """Generate JavaScript for interactivity"""
        files_json = json.dumps([
            {
                'path': meta.relative_path,
                'name': meta.name,
                'category': meta.category.value,
                'size': meta.size,
                'lines': meta.lines,
                'dependents': len(meta.dependents),
                'risk': meta.risk_level.value,
                'stability': meta.stability_score,
                'recommendation': meta.recommendation.value
            }
            for meta in self.report.files.values()
        ])
        
        return f"""
const files = {files_json};

function toggleCluster(id) {{
    const cluster = document.querySelector(`[data-cluster-id="${{id}}"]`);
    cluster.classList.toggle('expanded');
}}

const searchBox = document.getElementById('searchBox');
if (searchBox) {{
    searchBox.addEventListener('input', (e) => {{
        const term = e.target.value.toLowerCase();
        console.log('Searching for:', term);
    }});
}}

document.querySelectorAll('.filter-btn').forEach(btn => {{
    btn.addEventListener('click', (e) => {{
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const filter = e.target.dataset.filter;
        console.log('Filter:', filter);
    }});
}});

function renderCategoryChart() {{
    const canvas = document.getElementById('categoryChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const data = window.chartData;
    
    const maxValue = Math.max(...data.categoryCounts);
    const barWidth = canvas.width / data.categories.length;
    const barSpacing = 10;
    
    data.categories.forEach((cat, i) => {{
        const barHeight = (data.categoryCounts[i] / maxValue) * (canvas.height - 40);
        const x = i * barWidth + barSpacing;
        const y = canvas.height - barHeight - 20;
        
        ctx.fillStyle = '#6366f1';
        ctx.fillRect(x, y, barWidth - barSpacing * 2, barHeight);
        
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '10px sans-serif';
        ctx.fillText(data.categoryCounts[i], x + 5, y - 5);
    }});
}}

setTimeout(() => {{
    renderCategoryChart();
}}, 100);

console.log('✓ Dashboard initialized');
console.log(`📊 Loaded ${{files.length}} files`);
"""

# ============================================================================
# INTERACTIVE CLI
# ============================================================================

class InteractiveCLI:
    """Interactive command-line interface"""
    
    def __init__(self, platform):
        self.platform = platform
        self.report: Optional[AnalysisReport] = None
        
    def run(self):
        """Run interactive CLI"""
        try:
            self._print_banner()
            
            while True:
                self._print_menu()
                choice = input(f"\n{Colors.OKCYAN}Select option: {Colors.ENDC}").strip()
                
                if choice == '1':
                    self._full_analysis()
                elif choice == '2':
                    self._high_risk_only()
                elif choice == '3':
                    self._unused_unwired()
                elif choice == '4':
                    self._duplicate_clusters()
                elif choice == '5':
                    self._category_distribution()
                elif choice == '6':
                    self._export_reports()
                elif choice == '7':
                    self._view_file_details()
                elif choice == '8':
                    self._create_archive()
                elif choice == '9':
                    self._generate_dashboard()
                elif choice == '0':
                    print(f"\n{Colors.OKGREEN}✓ Exiting safely. No files were modified.{Colors.ENDC}\n")
                    break
                else:
                    print(f"{Colors.FAIL}❌ Invalid option{Colors.ENDC}")
                
                input(f"\n{Colors.WARNING}Press Enter to continue...{Colors.ENDC}")
                
        except KeyboardInterrupt:
            print(f"\n\n{Colors.WARNING}⚠️  Interrupted by user. Exiting safely.{Colors.ENDC}\n")
    
    def _print_banner(self):
        """Print CLI banner"""
        print(f"\n{Colors.BOLD}{Colors.HEADER}")
        print("=" * 70)
        print("🔬 ENTERPRISE CODE INTELLIGENCE PLATFORM — SAFE REFACTOR EDITION")
        print("=" * 70)
        print(f"{Colors.ENDC}")
        print(f"{Colors.OKGREEN}✓ Non-destructive analysis mode{Colors.ENDC}")
        print(f"{Colors.OKGREEN}✓ Safe archive strategy enabled{Colors.ENDC}")
        print(f"{Colors.OKGREEN}✓ No files will be modified or deleted{Colors.ENDC}\n")
    
    def _print_menu(self):
        """Print main menu"""
        print(f"\n{Colors.BOLD}MAIN MENU:{Colors.ENDC}")
        print(f"{Colors.OKCYAN}1.{Colors.ENDC} Full Analysis")
        print(f"{Colors.OKCYAN}2.{Colors.ENDC} High Risk Only")
        print(f"{Colors.OKCYAN}3.{Colors.ENDC} Unused & Unwired Files")
        print(f"{Colors.OKCYAN}4.{Colors.ENDC} Duplicate Clusters")
        print(f"{Colors.OKCYAN}5.{Colors.ENDC} File Category Distribution")
        print(f"{Colors.OKCYAN}6.{Colors.ENDC} Export Reports (JSON + CSV)")
        print(f"{Colors.OKCYAN}7.{Colors.ENDC} View File Details")
        print(f"{Colors.OKCYAN}8.{Colors.ENDC} Create Safe Refactor Archive")
        print(f"{Colors.OKCYAN}9.{Colors.ENDC} Generate HTML Dashboard")
        print(f"{Colors.FAIL}0.{Colors.ENDC} Exit")
    
    def _ensure_analysis(self):
        """Ensure analysis has been run"""
        if not self.report:
            print(f"\n{Colors.WARNING}⚠️  Running analysis first...{Colors.ENDC}\n")
            self.report = self.platform.analyze()
    
    def _full_analysis(self):
        """Perform full analysis"""
        print(f"\n{Colors.BOLD}=== FULL ANALYSIS ==={Colors.ENDC}\n")
        self.report = self.platform.analyze()
        
        print(f"\n{Colors.BOLD}SUMMARY:{Colors.ENDC}")
        print(f"Total Files: {self.report.total_files:,}")
        print(f"Total Lines: {self.report.total_lines:,}")
        print(f"Duplicate Clusters: {len(self.report.duplicates)}")
        print(f"Same-Name Conflicts: {len(self.report.same_name_conflicts)}")
        print(f"Unused Files: {len(self.report.unused_files)}")
        print(f"Unwired Features: {len(self.report.unwired_features)}")
        print(f"Archive Candidates: {len(self.report.archive_candidates)}")
        
        print(f"\n{Colors.BOLD}RISK DISTRIBUTION:{Colors.ENDC}")
        for risk, count in self.report.risk_distribution.items():
            print(f"  {risk}: {count}")
    
    def _high_risk_only(self):
        """Show high-risk files only"""
        self._ensure_analysis()
        
        print(f"\n{Colors.BOLD}=== HIGH RISK FILES ==={Colors.ENDC}\n")
        
        high_risk = [
            (path, meta) for path, meta in self.report.files.items()
            if meta.risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}
        ]
        
        if not high_risk:
            print(f"{Colors.OKGREEN}✓ No high-risk files found{Colors.ENDC}")
            return
        
        for path, meta in high_risk[:20]:
            print(f"\n{Colors.FAIL}File:{Colors.ENDC} {meta.relative_path}")
            print(f"  Risk: {meta.risk_level.value}")
            print(f"  Category: {meta.category.value}")
            print(f"  Dependents: {len(meta.dependents)}")
            print(f"  Stability: {meta.stability_score:.1f}/10")
            print(f"  Reasoning: {meta.reasoning}")
        
        if len(high_risk) > 20:
            print(f"\n{Colors.WARNING}... and {len(high_risk) - 20} more{Colors.ENDC}")
    
    def _unused_unwired(self):
        """Show unused and unwired files"""
        self._ensure_analysis()
        
        print(f"\n{Colors.BOLD}=== UNUSED & UNWIRED FILES ==={Colors.ENDC}\n")
        
        print(f"{Colors.BOLD}Unused Files ({len(self.report.unused_files)}):{Colors.ENDC}")
        for file in self.report.unused_files[:10]:
            meta = self.report.files[file]
            print(f"  • {meta.relative_path} ({meta.category.value})")
        
        if len(self.report.unused_files) > 10:
            print(f"  ... and {len(self.report.unused_files) - 10} more")
        
        print(f"\n{Colors.BOLD}Unwired Features ({len(self.report.unwired_features)}):{Colors.ENDC}")
        for file in self.report.unwired_features[:10]:
            meta = self.report.files[file]
            print(f"  • {meta.relative_path} ({meta.lines} lines, {len(meta.exports)} exports)")
        
        if len(self.report.unwired_features) > 10:
            print(f"  ... and {len(self.report.unwired_features) - 10} more")
    
    def _duplicate_clusters(self):
        """Show duplicate clusters"""
        self._ensure_analysis()
        
        print(f"\n{Colors.BOLD}=== DUPLICATE CLUSTERS ==={Colors.ENDC}\n")
        
        if not self.report.duplicates:
            print(f"{Colors.OKGREEN}✓ No duplicate clusters found{Colors.ENDC}")
            return
        
        for cluster in self.report.duplicates[:5]:
            print(f"\n{Colors.BOLD}Cluster #{cluster.cluster_id}{Colors.ENDC} ({cluster.type}, {cluster.similarity:.0%} similar)")
            print(f"Suggested Base: {Path(cluster.suggested_base_file).name}")
            print(f"Action: {cluster.recommended_action.value} (Confidence: {cluster.confidence:.0%})")
            print(f"Files:")
            for file in cluster.files:
                print(f"  • {Path(file).relative_to(Path(self.report.project_path))}")
        
        if len(self.report.duplicates) > 5:
            print(f"\n{Colors.WARNING}... and {len(self.report.duplicates) - 5} more clusters{Colors.ENDC}")
    
    def _category_distribution(self):
        """Show category distribution"""
        self._ensure_analysis()
        
        print(f"\n{Colors.BOLD}=== FILE CATEGORY DISTRIBUTION ==={Colors.ENDC}\n")
        
        for category, count in sorted(self.report.category_distribution.items(), key=lambda x: x[1], reverse=True):
            percentage = (count / self.report.total_files) * 100
            print(f"{category:20} {count:5} ({percentage:5.1f}%)")
    
    def _export_reports(self):
        """Export reports"""
        self._ensure_analysis()
        
        print(f"\n{Colors.BOLD}=== EXPORT REPORTS ==={Colors.ENDC}\n")
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        reports_dir = self.platform.project_path / 'reports'
        reports_dir.mkdir(exist_ok=True)
        
        generator = ReportGenerator(self.report)
        
        json_path = reports_dir / f'analysis_report_{timestamp}.json'
        generator.export_json(str(json_path))
        
        csv_path = reports_dir / f'high_risk_summary_{timestamp}.csv'
        generator.export_csv(str(csv_path))
        
        print(f"\n{Colors.OKGREEN}✓ Reports exported to: {reports_dir}{Colors.ENDC}")
    
    def _view_file_details(self):
        """View details for a specific file"""
        self._ensure_analysis()
        
        print(f"\n{Colors.BOLD}=== VIEW FILE DETAILS ==={Colors.ENDC}\n")
        
        search = input(f"{Colors.OKCYAN}Enter file name or path: {Colors.ENDC}").strip()
        
        matches = [
            (path, meta) for path, meta in self.report.files.items()
            if search.lower() in path.lower()
        ]
        
        if not matches:
            print(f"{Colors.FAIL}❌ No matches found{Colors.ENDC}")
            return
        
        if len(matches) > 1:
            print(f"\n{Colors.WARNING}Multiple matches found:{Colors.ENDC}")
            for i, (path, meta) in enumerate(matches[:10], 1):
                print(f"{i}. {meta.relative_path}")
            
            choice = input(f"\n{Colors.OKCYAN}Select file (1-{min(len(matches), 10)}): {Colors.ENDC}").strip()
            try:
                idx = int(choice) - 1
                if 0 <= idx < len(matches):
                    path, meta = matches[idx]
                else:
                    print(f"{Colors.FAIL}❌ Invalid selection{Colors.ENDC}")
                    return
            except:
                print(f"{Colors.FAIL}❌ Invalid input{Colors.ENDC}")
                return
        else:
            path, meta = matches[0]
        
        print(f"\n{Colors.BOLD}FILE DETAILS:{Colors.ENDC}")
        print(f"Path: {meta.relative_path}")
        print(f"Category: {meta.category.value}")
        print(f"Size: {meta.size:,} bytes ({meta.lines:,} lines)")
        print(f"Risk Level: {meta.risk_level.value}")
        print(f"Recommendation: {meta.recommendation.value}")
        print(f"Stability Score: {meta.stability_score:.1f}/10")
        print(f"Dependents: {len(meta.dependents)}")
        print(f"Dependencies: {len(meta.dependencies)}")
        print(f"Exports: {len(meta.exports)}")
        print(f"Reasoning: {meta.reasoning}")
        
        if meta.is_react_component:
            print(f"Component Type: {meta.component_type}")
        if meta.is_custom_hook:
            print(f"Custom Hook: Yes")
    
    def _create_archive(self):
        """Create safe archive package"""
        self._ensure_analysis()
        
        print(f"\n{Colors.BOLD}=== CREATE SAFE REFACTOR ARCHIVE ==={Colors.ENDC}\n")
        
        if not self.report.archive_candidates:
            print(f"{Colors.WARNING}⚠️  No files eligible for archiving{Colors.ENDC}")
            return
        
        print(f"{Colors.OKGREEN}Found {len(self.report.archive_candidates)} archive candidates{Colors.ENDC}")
        print(f"\n{Colors.WARNING}This will create a ZIP archive containing:{Colors.ENDC}")
        print(f"  • All candidate files (preserving structure)")
        print(f"  • metadata.json with full analysis")
        print(f"  • {Colors.BOLD}NO FILES WILL BE DELETED FROM PROJECT{Colors.ENDC}")
        
        confirm = input(f"\n{Colors.OKCYAN}Proceed with archive creation? (yes/no): {Colors.ENDC}").strip().lower()
        
        if confirm != 'yes':
            print(f"{Colors.WARNING}Archive creation cancelled{Colors.ENDC}")
            return
        
        builder = ArchiveBuilder(str(self.platform.project_path), self.report.files)
        archive_path = builder.create_archive(self.report.archive_candidates)
        
        if archive_path:
            print(f"\n{Colors.OKGREEN}✓ Archive created successfully{Colors.ENDC}")
            print(f"  Location: {archive_path}")
    
    def _generate_dashboard(self):
        """Generate HTML dashboard"""
        self._ensure_analysis()
        
        print(f"\n{Colors.BOLD}=== GENERATE HTML DASHBOARD ==={Colors.ENDC}\n")
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        reports_dir = self.platform.project_path / 'reports'
        reports_dir.mkdir(exist_ok=True)
        
        output_path = reports_dir / f'dashboard_{timestamp}.html'
        
        generator = ReportGenerator(self.report)
        generator.generate_html(str(output_path))
        
        print(f"\n{Colors.OKGREEN}✓ Dashboard generated{Colors.ENDC}")
        print(f"  Location: {output_path}")
        print(f"  Open in browser to view interactive report")

# ============================================================================
# MAIN ORCHESTRATOR
# ============================================================================

class CodeIntelligencePlatform:
    """Main orchestrator for analysis"""
    
    def __init__(self, project_path: str):
        self.project_path = Path(project_path).resolve()
        self.scanner = ProjectScanner(str(self.project_path))
        self.files: Dict[str, FileInfo] = {}
        self.components: List[ComponentInfo] = []
        
    def analyze(self) -> AnalysisReport:
        """Perform complete analysis"""
        print("\n" + "="*70)
        print(f"{Colors.BOLD}🚀 ENTERPRISE CODE INTELLIGENCE PLATFORM{Colors.ENDC}")
        print("="*70 + "\n")
        
        self.files, self.components = self.scanner.scan()
        
        graph_builder = DependencyGraphBuilder(self.files)
        graph_builder.build()
        
        duplicate_detector = DuplicateDetector(self.files)
        duplicates = duplicate_detector.analyze()
        
        conflict_analyzer = SameNameAnalyzer(self.files)
        conflicts = conflict_analyzer.analyze()
        
        usage_analyzer = UsageAnalyzer(self.files)
        usage_analyzer.analyze()
        
        stability_calc = StabilityCalculator(self.files)
        stability_calc.calculate()
        
        archive_candidates = [
            path for path, meta in self.files.items()
            if meta.recommendation == Recommendation.SAFE_TO_ARCHIVE
        ]
        
        report = AnalysisReport(
            timestamp=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            project_path=str(self.project_path),
            total_files=len(self.files),
            total_lines=sum(f.lines for f in self.files.values()),
            total_size=sum(f.size for f in self.files.values()),
            files=self.files,
            components=self.components,
            duplicates=duplicates,
            same_name_conflicts=conflicts,
            unused_files=usage_analyzer.unused,
            unwired_features=usage_analyzer.unwired,
            archive_candidates=archive_candidates,
            category_distribution=Counter(f.category.value for f in self.files.values()),
            risk_distribution=Counter(f.risk_level.value for f in self.files.values())
        )
        
        print("\n" + "="*70)
        print(f"{Colors.OKGREEN}✓ ANALYSIS COMPLETE{Colors.ENDC}")
        print("="*70 + "\n")
        
        return report

# ============================================================================
# ENTRY POINT
# ============================================================================

def main():
    """Main entry point"""
    import sys
    
    if len(sys.argv) < 2:
        print(f"{Colors.FAIL}Usage: python analyzer.py <project_path>{Colors.ENDC}")
        sys.exit(1)
    
    project_path = sys.argv[1]
    
    if not Path(project_path).exists():
        print(f"{Colors.FAIL}❌ Error: Path does not exist: {project_path}{Colors.ENDC}")
        sys.exit(1)
    
    platform = CodeIntelligencePlatform(project_path)
    cli = InteractiveCLI(platform)
    cli.run()

if __name__ == '__main__':
    main()