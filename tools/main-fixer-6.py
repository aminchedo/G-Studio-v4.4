#!/usr/bin/env python3
"""
Enterprise Code Intelligence Platform — Safe Refactor Edition v3.0
===================================================================
A professional-grade structural analysis tool for TypeScript/React/Electron projects
with non-destructive safe archive capabilities and enterprise-grade decision engine.

Author: Senior Software Architect
Purpose: Deep semantic analysis with conservative refactoring recommendations
Output: Timestamped reports with self-contained interactive HTML dashboard + Safe archive packages
Version: 3.0.0
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
import time

# ============================================================================
# CONFIGURATION
# ============================================================================

class Config:
    """Global configuration constants"""
    TOOL_VERSION = "3.0.0"
    SIMILARITY_THRESHOLD = 0.85
    RECENT_DAYS_BLOCKER = 30
    ARCHIVE_SCORE_THRESHOLD = 75
    INVESTIGATE_LOW_THRESHOLD = 60
    INVESTIGATE_MEDIUM_THRESHOLD = 45
    STABILITY_THRESHOLD = 4.0
    COMPLEXITY_HIGH_THRESHOLD = 50
    MAX_FILE_SIZE_FOR_SIMILARITY = 500_000  # 500KB
    SIZE_DIFF_RATIO_THRESHOLD = 3.0  # Skip similarity if sizes differ by 3x

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
    KEEP_AS_IS = "KEEP_AS_IS"
    INVESTIGATE = "INVESTIGATE"
    SAFE_TO_ARCHIVE = "SAFE_TO_ARCHIVE"
    SAFE_TO_REMOVE = "SAFE_TO_REMOVE"
    MERGE_INTO_ANOTHER_FILE = "MERGE_INTO_ANOTHER_FILE"
    REFACTOR_FOR_CLARITY = "REFACTOR_FOR_CLARITY"
    WIRE_TO_APPLICATION = "WIRE_TO_APPLICATION"

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
    FRAMEWORK_CORE = "FRAMEWORK_CORE"
    UNKNOWN = "UNKNOWN"

# ============================================================================
# CONSTANTS
# ============================================================================

IGNORE_PATTERNS = {
    'backup', 'archive', 'temp', 'tmp', 'dist', 'build', 'final',
    'node_modules', '.git', '.vscode', 'coverage', '.next', 'out',
    '__pycache__', '.pytest_cache', '.mypy_cache', 'vendor',
    'refactor_temp', 'refactor_archive', 'reports'
}

FILE_EXTENSIONS = {
    '.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss',
    '.html', '.md', '.yml', '.yaml', '.env'
}

ENTRY_POINT_PATTERNS = {
    'main.ts', 'main.tsx', 'index.ts', 'index.tsx',
    'app.ts', 'app.tsx', '_app.tsx', 'main.js'
}

FRAMEWORK_CORE_PATTERNS = {
    'createContext', 'configureStore', 'createStore', 'createSlice',
    'setup', 'register', 'bootstrap', 'initialize', 'configure'
}

INFRASTRUCTURE_PATHS = {
    '/core/', '/runtime/', '/boot/', '/init/', '/config/',
    '/setup/', '/framework/', '/platform/'
}

DYNAMIC_IMPORT_PATTERNS = [
    r'import\s*\(',
    r'React\.lazy\s*\(',
    r'require\s*\(',
    r'loadable\s*\('
]

SIDE_EFFECT_PATTERNS = [
    'fetch', 'axios', 'XMLHttpRequest', 'WebSocket',
    'addEventListener', 'setInterval', 'setTimeout',
    'localStorage', 'sessionStorage', 'indexedDB'
]

HOOK_PATTERNS = [
    'useState', 'useEffect', 'useContext', 'useReducer',
    'useCallback', 'useMemo', 'useRef', 'useLayoutEffect',
    'useImperativeHandle', 'useDebugValue'
]

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
class ArchiveDecision:
    """Decision result for archive eligibility"""
    allowed: bool
    decision: Recommendation
    score: float
    reasons: List[str]
    blockers: List[str]

@dataclass
class FileInfo:
    """Complete metadata for a single file"""
    path: str
    relative_path: str
    name: str
    extension: str
    size: int
    lines: int
    content_hash: str
    structural_hash: str
    modified: float
    category: FileCategory
    exports: List[str] = field(default_factory=list)
    imports: List[str] = field(default_factory=list)
    dependencies: Set[str] = field(default_factory=set)
    dependents: Set[str] = field(default_factory=set)
    dependents_count: int = 0
    is_entry_point: bool = False
    risk_level: RiskLevel = RiskLevel.LOW
    recommendation: Recommendation = Recommendation.KEEP_AS_IS
    short_reason: str = ""
    stability_score: float = 0.0
    any_count: int = 0
    complexity_estimate: int = 0
    is_react_component: bool = False
    is_custom_hook: bool = False
    component_type: str = ""
    is_dynamic_imported: bool = False
    is_test_file: bool = False
    is_barrel_exported: bool = False
    duplicate_cluster_id: Optional[str] = None
    last_modified_days: int = 0
    exported_symbols: List[str] = field(default_factory=list)
    has_side_effects: bool = False
    hook_usage: List[str] = field(default_factory=list)
    
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
    cluster_id: str
    files: List[str]
    cluster_size: int
    similarity_score: float
    exported_files_count: int
    recent_files_count: int
    suggested_base_file: str
    suggested_merge_target: Optional[str]
    diff_summary: List[str]
    risk_level: RiskLevel
    recommendation: Recommendation
    confidence_score: float
    type: str = "structural"
    
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
    metadata: Dict[str, Any]
    files: Dict[str, Dict[str, Any]]
    duplicate_clusters: List[Dict[str, Any]]
    same_name_conflicts: List[Dict[str, Any]]
    unused_candidates: List[str]
    unwired_candidates: List[str]
    merge_suggestions: List[Dict[str, Any]]
    archive_candidates: List[str]
    category_distribution: Dict[str, int]
    risk_distribution: Dict[str, int]

# ============================================================================
# LOGGING SYSTEM
# ============================================================================

class AnalysisLogger:
    """Runtime logging system"""
    
    def __init__(self, log_path: str):
        self.log_path = log_path
        self.start_time = time.time()
        self.warnings: List[str] = []
        self.log_lines: List[str] = []
        
        self._log(f"Analysis started at {datetime.now().isoformat()}")
        self._log(f"Tool version: {Config.TOOL_VERSION}")
    
    def _log(self, message: str):
        """Add log entry"""
        timestamp = datetime.now().strftime('%H:%M:%S')
        line = f"[{timestamp}] {message}"
        self.log_lines.append(line)
        print(line)
    
    def info(self, message: str):
        """Log info message"""
        self._log(f"INFO: {message}")
    
    def warning(self, message: str):
        """Log warning"""
        self.warnings.append(message)
        self._log(f"WARNING: {message}")
    
    def error(self, message: str):
        """Log error"""
        self._log(f"ERROR: {message}")
    
    def finalize(self):
        """Write log to file"""
        elapsed = time.time() - self.start_time
        self._log(f"Analysis completed in {elapsed:.2f} seconds")
        self._log(f"Total warnings: {len(self.warnings)}")
        
        with open(self.log_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(self.log_lines))

# ============================================================================
# REPORT FOLDER MANAGER
# ============================================================================

def create_timestamped_report_folder(base_path: Path) -> Path:
    """
    Create timestamped report folder structure.
    
    Returns:
        Path to the created timestamped folder
    """
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    report_folder = base_path / 'reports' / timestamp
    report_folder.mkdir(parents=True, exist_ok=True)
    
    # Create subdirectories
    (report_folder / 'archives').mkdir(exist_ok=True)
    
    return report_folder

# ============================================================================
# FILE SCANNER
# ============================================================================

class ProjectScanner:
    """Scans and catalogs all project files"""
    
    def __init__(self, root_path: str, logger: AnalysisLogger, scope_path: Optional[str] = None):
        self.root = Path(root_path).resolve()
        self.scope = Path(scope_path).resolve() if scope_path else self.root
        self.logger = logger
        self.files: Dict[str, FileInfo] = {}
        self.components: List[ComponentInfo] = []
        
    def should_ignore(self, path: Path) -> bool:
        """Check if path should be ignored"""
        parts = path.parts
        return any(pattern in parts or pattern in path.name.lower() 
                  for pattern in IGNORE_PATTERNS)
    
    def scan(self) -> Tuple[Dict[str, FileInfo], List[ComponentInfo]]:
        """Perform complete project scan"""
        self.logger.info(f"Scanning project structure from: {self.scope}")
        
        for root, dirs, files in os.walk(self.scope):
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
                    self.logger.warning(f"Error analyzing {file_path}: {e}")
        
        self.logger.info(f"Scanned {len(self.files)} files")
        return self.files, self.components
    
    def _analyze_file(self, path: Path) -> FileInfo:
        """Extract complete metadata from a file"""
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        lines = content.count('\n') + 1
        size = path.stat().st_size
        modified = path.stat().st_mtime
        
        content_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()
        structural_hash = self._compute_structural_hash(content)
        
        exports = self._extract_exports(content)
        imports = self._extract_imports(content)
        
        category = self._classify_file(path, content)
        
        any_count = len(re.findall(r':\s*any\b', content))
        complexity_estimate = self._compute_complexity(content)
        
        is_entry = path.name in ENTRY_POINT_PATTERNS
        
        is_react_component, component_type = self._detect_react_component(content)
        is_custom_hook = self._detect_custom_hook(path.name, content)
        
        is_dynamic_imported = self._detect_dynamic_import(content)
        is_test_file = self._is_test_file(path)
        
        has_side_effects = self._detect_side_effects(content)
        hook_usage = self._extract_hook_usage(content)
        
        if is_react_component:
            component_info = self._extract_component_info(path, content)
            if component_info:
                self.components.append(component_info)
        
        relative = path.relative_to(self.root)
        
        last_modified_days = int((time.time() - modified) / 86400)
        
        return FileInfo(
            path=str(path),
            relative_path=str(relative),
            name=path.name,
            extension=path.suffix,
            size=size,
            lines=lines,
            content_hash=content_hash,
            structural_hash=structural_hash,
            modified=modified,
            category=category,
            exports=exports,
            exported_symbols=exports,
            imports=imports,
            is_entry_point=is_entry,
            any_count=any_count,
            complexity_estimate=complexity_estimate,
            is_react_component=is_react_component,
            is_custom_hook=is_custom_hook,
            component_type=component_type,
            is_dynamic_imported=is_dynamic_imported,
            is_test_file=is_test_file,
            last_modified_days=last_modified_days,
            has_side_effects=has_side_effects,
            hook_usage=hook_usage
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
        """Classify file by purpose with enhanced detection"""
        rel_path = str(path).lower()
        name = path.name.lower()
        
        # Framework core detection
        if any(pattern in content for pattern in FRAMEWORK_CORE_PATTERNS):
            if any(infra_path in rel_path for infra_path in INFRASTRUCTURE_PATHS):
                return FileCategory.FRAMEWORK_CORE
        
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
        
        if 'test' in rel_path or 'spec' in rel_path or '__tests__' in rel_path:
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
        """Compute cyclomatic complexity estimate"""
        score = 0
        score += content.count('if ')
        score += content.count('for ')
        score += content.count('while ')
        score += content.count('switch ')
        score += content.count('case ')
        score += content.count('&&')
        score += content.count('||')
        score += content.count('? ')
        score += content.count('catch ')
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
    
    def _detect_dynamic_import(self, content: str) -> bool:
        """Detect dynamic import patterns"""
        return any(re.search(pattern, content) for pattern in DYNAMIC_IMPORT_PATTERNS)
    
    def _is_test_file(self, path: Path) -> bool:
        """Check if file is a test file"""
        name = path.name.lower()
        path_str = str(path).lower()
        return (name.endswith('.test.ts') or 
                name.endswith('.test.tsx') or 
                name.endswith('.spec.ts') or 
                name.endswith('.spec.tsx') or
                '__tests__' in path_str)
    
    def _detect_side_effects(self, content: str) -> bool:
        """Detect side effects in code"""
        return any(pattern in content for pattern in SIDE_EFFECT_PATTERNS)
    
    def _extract_hook_usage(self, content: str) -> List[str]:
        """Extract React hooks used in file"""
        hooks = []
        for hook in HOOK_PATTERNS:
            if hook in content:
                hooks.append(hook)
        
        # Custom hooks
        for match in re.finditer(r'(use[A-Z]\w+)\s*\(', content):
            hook_name = match.group(1)
            if hook_name not in hooks:
                hooks.append(hook_name)
        
        return hooks
    
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
        
        hooks_used = self._extract_hook_usage(content)
        
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
# STRUCTURAL SIMILARITY ANALYZER
# ============================================================================

class StructuralSimilarityAnalyzer:
    """Advanced structural similarity computation"""
    
    @staticmethod
    def _normalize_for_comparison(content: str) -> str:
        """
        Normalize code for structural comparison.
        
        Pipeline:
        1. Remove comments (single-line, multi-line, JSX)
        2. Replace string literals with __STR__
        3. Replace numeric literals with __NUM__
        4. Normalize whitespace
        5. Replace variable names with placeholders
        
        Args:
            content: Source code content
            
        Returns:
            Normalized string for comparison
        """
        # Remove single-line comments
        content = re.sub(r'//.*?$', '', content, flags=re.MULTILINE)
        
        # Remove block comments
        content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
        
        # Remove JSX comments
        content = re.sub(r'\{/\*.*?\*/\}', '', content, flags=re.DOTALL)
        
        # Replace string literals
        content = re.sub(r'"(?:[^"\\]|\\.)*"', '__STR__', content)
        content = re.sub(r"'(?:[^'\\]|\\.)*'", '__STR__', content)
        content = re.sub(r'`(?:[^`\\]|\\.)*`', '__STR__', content)
        
        # Replace numeric literals
        content = re.sub(r'\b\d+\.?\d*\b', '__NUM__', content)
        
        # Normalize whitespace
        content = re.sub(r'\s+', ' ', content)
        content = re.sub(r'\n+', '\n', content)
        
        # Variable name normalization (basic)
        var_names = re.findall(r'\b[a-z_][a-zA-Z0-9_]*\b', content)
        var_map = {}
        var_counter = 0
        for name in set(var_names):
            if name not in ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while']:
                if name not in var_map:
                    var_map[name] = f'v{var_counter}'
                    var_counter += 1
        
        for original, placeholder in var_map.items():
            content = re.sub(r'\b' + re.escape(original) + r'\b', placeholder, content)
        
        return content.strip()
    
    @staticmethod
    def _tokenize(content: str) -> Tuple[List[str], Set[str]]:
        """
        Tokenize normalized content.
        
        Returns:
            Tuple of (token_sequence, token_set)
        """
        # Split by whitespace and punctuation
        tokens = re.findall(r'\w+|[^\w\s]', content)
        return tokens, set(tokens)
    
    @staticmethod
    def compute_structural_similarity(file_a: str, file_b: str) -> float:
        """
        Compute structural similarity between two files.
        
        Uses combined metric:
        - 60% sequence similarity (SequenceMatcher)
        - 40% Jaccard similarity (token set overlap)
        
        Args:
            file_a: Path to first file
            file_b: Path to second file
            
        Returns:
            Similarity score in [0.0, 1.0]
        """
        try:
            # Size pre-check
            size_a = Path(file_a).stat().st_size
            size_b = Path(file_b).stat().st_size
            
            if max(size_a, size_b) > Config.MAX_FILE_SIZE_FOR_SIMILARITY:
                return 0.0
            
            if size_a > 0 and size_b > 0:
                ratio = max(size_a, size_b) / min(size_a, size_b)
                if ratio > Config.SIZE_DIFF_RATIO_THRESHOLD:
                    return 0.0
            
            # Read and normalize
            with open(file_a, 'r', encoding='utf-8', errors='ignore') as f:
                content_a = f.read()
            with open(file_b, 'r', encoding='utf-8', errors='ignore') as f:
                content_b = f.read()
            
            normalized_a = StructuralSimilarityAnalyzer._normalize_for_comparison(content_a)
            normalized_b = StructuralSimilarityAnalyzer._normalize_for_comparison(content_b)
            
            # Tokenize
            seq_a, set_a = StructuralSimilarityAnalyzer._tokenize(normalized_a)
            seq_b, set_b = StructuralSimilarityAnalyzer._tokenize(normalized_b)
            
            # Sequence similarity
            sequence_ratio = SequenceMatcher(None, seq_a, seq_b).ratio()
            
            # Jaccard similarity
            intersection = len(set_a & set_b)
            union = len(set_a | set_b)
            jaccard_ratio = intersection / union if union > 0 else 0.0
            
            # Combined metric
            similarity = 0.6 * sequence_ratio + 0.4 * jaccard_ratio
            
            return similarity
            
        except Exception:
            return 0.0

# ============================================================================
# ADVANCED DIFF SUMMARIZER
# ============================================================================

class DiffSummarizer:
    """Generate human-readable diff summaries"""
    
    @staticmethod
    def generate_diff_summary(file_a: str, file_b: str, content_a: str, content_b: str) -> List[str]:
        """
        Generate 3-5 bullet point differences between files.
        
        Analyzes:
        - Hook usage differences
        - Export type differences
        - Side effect presence
        - JSX complexity
        - Prop/interface differences
        
        Args:
            file_a: Path to first file
            file_b: Path to second file
            content_a: Content of first file
            content_b: Content of second file
            
        Returns:
            List of human-readable difference descriptions
        """
        summary = []
        
        # Hook differences
        hooks_a = DiffSummarizer._count_hooks(content_a)
        hooks_b = DiffSummarizer._count_hooks(content_b)
        
        for hook, count_a in hooks_a.items():
            count_b = hooks_b.get(hook, 0)
            if count_a != count_b:
                diff = abs(count_a - count_b)
                which = Path(file_a).name if count_a > count_b else Path(file_b).name
                summary.append(f"{which} has {diff} more {hook} call(s)")
        
        # Export type differences
        has_default_a = 'export default' in content_a
        has_default_b = 'export default' in content_b
        
        if has_default_a != has_default_b:
            which = Path(file_a).name if has_default_a else Path(file_b).name
            summary.append(f"{which} uses default export")
        
        # Side effects
        side_effects_a = any(pattern in content_a for pattern in SIDE_EFFECT_PATTERNS)
        side_effects_b = any(pattern in content_b for pattern in SIDE_EFFECT_PATTERNS)
        
        if side_effects_a and not side_effects_b:
            summary.append(f"{Path(file_a).name} includes side effects (fetch/storage/timers)")
        elif side_effects_b and not side_effects_a:
            summary.append(f"{Path(file_b).name} includes side effects (fetch/storage/timers)")
        
        # JSX complexity
        jsx_count_a = content_a.count('<')
        jsx_count_b = content_b.count('<')
        
        if abs(jsx_count_a - jsx_count_b) > 10:
            which = Path(file_a).name if jsx_count_a > jsx_count_b else Path(file_b).name
            summary.append(f"{which} has more complex JSX structure")
        
        # Interface/prop differences
        interface_count_a = content_a.count('interface ')
        interface_count_b = content_b.count('interface ')
        
        if interface_count_a != interface_count_b:
            diff = abs(interface_count_a - interface_count_b)
            which = Path(file_a).name if interface_count_a > interface_count_b else Path(file_b).name
            summary.append(f"{which} defines {diff} more interface(s)")
        
        # Memoization
        has_memo_a = 'useMemo' in content_a or 'useCallback' in content_a or 'React.memo' in content_a
        has_memo_b = 'useMemo' in content_b or 'useCallback' in content_b or 'React.memo' in content_b
        
        if has_memo_a and not has_memo_b:
            summary.append(f"{Path(file_a).name} uses memoization")
        elif has_memo_b and not has_memo_a:
            summary.append(f"{Path(file_b).name} uses memoization")
        
        # Return top 5
        if not summary:
            summary.append("Files are nearly identical in structure")
        
        return summary[:5]
    
    @staticmethod
    def _count_hooks(content: str) -> Dict[str, int]:
        """Count hook usage in content"""
        counts = {}
        for hook in HOOK_PATTERNS:
            count = len(re.findall(rf'\b{hook}\s*\(', content))
            if count > 0:
                counts[hook] = count
        return counts

# ============================================================================
# DUPLICATE DETECTOR (MULTI-LAYER)
# ============================================================================

class DuplicateDetector:
    """Advanced multi-layer duplicate detection engine"""
    
    def __init__(self, files: Dict[str, FileInfo], logger: AnalysisLogger):
        self.files = files
        self.logger = logger
        self.clusters: List[DuplicateCluster] = []
        self.cluster_counter = 0
    
    def analyze(self) -> List[DuplicateCluster]:
        """Perform all duplicate detection layers"""
        self.logger.info("Detecting duplicates (multi-layer)...")
        
        self._detect_exact_duplicates()
        self._detect_structural_duplicates()
        
        self.logger.info(f"Found {len(self.clusters)} duplicate clusters")
        return self.clusters
    
    def _detect_exact_duplicates(self):
        """Layer 1: Find files with identical content"""
        hash_groups = defaultdict(list)
        
        for path, meta in self.files.items():
            if meta.size > 100 and not meta.is_test_file:
                hash_groups[meta.content_hash].append(path)
        
        for content_hash, paths in hash_groups.items():
            if len(paths) > 1:
                self._create_cluster(paths, 1.0, 'exact')
    
    def _detect_structural_duplicates(self):
        """Layer 2: Find files with similar structure"""
        processed = set()
        
        # Group by structural hash first for efficiency
        struct_groups = defaultdict(list)
        for path, meta in self.files.items():
            if path not in processed and not meta.is_test_file and meta.size > 100:
                struct_groups[meta.structural_hash].append(path)
        
        for struct_hash, candidates in struct_groups.items():
            if len(candidates) < 2:
                continue
            
            # Compute pairwise similarities
            for i, path_a in enumerate(candidates):
                if path_a in processed:
                    continue
                
                cluster = [path_a]
                
                for path_b in candidates[i+1:]:
                    if path_b in processed:
                        continue
                    
                    similarity = StructuralSimilarityAnalyzer.compute_structural_similarity(
                        path_a, path_b
                    )
                    
                    if similarity >= Config.SIMILARITY_THRESHOLD:
                        cluster.append(path_b)
                        processed.add(path_b)
                
                if len(cluster) > 1:
                    # Compute average similarity
                    similarities = []
                    for j in range(len(cluster)):
                        for k in range(j+1, len(cluster)):
                            sim = StructuralSimilarityAnalyzer.compute_structural_similarity(
                                cluster[j], cluster[k]
                            )
                            similarities.append(sim)
                    
                    avg_similarity = sum(similarities) / len(similarities) if similarities else 0.85
                    self._create_cluster(cluster, avg_similarity, 'structural')
                    processed.update(cluster)
    
    def _create_cluster(self, paths: List[str], similarity: float, cluster_type: str):
        """Create a duplicate cluster with recommendations"""
        self.cluster_counter += 1
        cluster_id = f"dup_{self.cluster_counter:04d}"
        
        # Compute metrics
        exported_count = sum(1 for p in paths if self.files[p].exports)
        recent_count = sum(1 for p in paths if self.files[p].last_modified_days < 60)
        
        # Select base file
        file_scores = []
        for path in paths:
            meta = self.files[path]
            score = (
                meta.stability_score * 10 +
                len(meta.dependents) * 20 +
                len(meta.exports) * 5 +
                meta.last_modified_days * 0.1  # Older is better for base
            )
            file_scores.append((path, score))
        
        file_scores.sort(key=lambda x: x[1], reverse=True)
        suggested_base = file_scores[0][0]
        
        # Select merge target (second best)
        suggested_merge_target = file_scores[1][0] if len(file_scores) > 1 else None
        
        # Generate diff summary
        diff_summary = []
        if len(paths) >= 2:
            try:
                with open(paths[0], 'r', encoding='utf-8', errors='ignore') as f:
                    content_a = f.read()
                with open(paths[1], 'r', encoding='utf-8', errors='ignore') as f:
                    content_b = f.read()
                
                diff_summary = DiffSummarizer.generate_diff_summary(
                    paths[0], paths[1], content_a, content_b
                )
            except:
                diff_summary = ["Unable to generate diff summary"]
        
        # Determine risk and recommendation
        if cluster_type == 'exact':
            risk = RiskLevel.LOW
            recommendation = Recommendation.MERGE_INTO_ANOTHER_FILE
            confidence = 0.95
        else:
            # Check for diverging implementations
            has_exports = any(self.files[p].exports for p in paths)
            has_recent = any(self.files[p].last_modified_days < 30 for p in paths)
            
            if has_exports and has_recent:
                risk = RiskLevel.HIGH
                recommendation = Recommendation.INVESTIGATE
                confidence = 0.60
            else:
                risk = RiskLevel.MEDIUM
                recommendation = Recommendation.INVESTIGATE
                confidence = 0.75
        
        cluster = DuplicateCluster(
            cluster_id=cluster_id,
            files=paths,
            cluster_size=len(paths),
            similarity_score=similarity,
            exported_files_count=exported_count,
            recent_files_count=recent_count,
            suggested_base_file=suggested_base,
            suggested_merge_target=suggested_merge_target,
            diff_summary=diff_summary,
            risk_level=risk,
            recommendation=recommendation,
            confidence_score=confidence,
            type=cluster_type
        )
        
        self.clusters.append(cluster)
        
        # Mark files with cluster ID
        for path in paths:
            self.files[path].duplicate_cluster_id = cluster_id

# ============================================================================
# DEPENDENCY GRAPH BUILDER
# ============================================================================

class DependencyGraphBuilder:
    """Build cross-reference dependency graph with barrel awareness"""
    
    def __init__(self, files: Dict[str, FileInfo], logger: AnalysisLogger):
        self.files = files
        self.logger = logger
        self.barrel_files: Set[str] = set()
    
    def build(self):
        """Build dependency relationships"""
        self.logger.info("Building dependency graph...")
        
        # Identify barrel files
        self._identify_barrels()
        
        # Build direct dependencies
        for path, meta in self.files.items():
            for imp in meta.imports:
                resolved = self._resolve_import(path, imp)
                if resolved and resolved in self.files:
                    self.files[resolved].dependents.add(path)
                    meta.dependencies.add(resolved)
        
        # Update dependents count
        for path, meta in self.files.items():
            meta.dependents_count = len(meta.dependents)
        
        # Mark barrel-exported files
        self._mark_barrel_exports()
        
        self.logger.info("Dependency graph built")
    
    def _identify_barrels(self):
        """Identify barrel/index files"""
        for path, meta in self.files.items():
            if meta.name in {'index.ts', 'index.tsx', 'index.js', 'index.jsx'}:
                # Check if it re-exports
                try:
                    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    export_count = len(re.findall(r'export\s+\{', content))
                    export_from_count = len(re.findall(r'export\s+.*\s+from', content))
                    
                    if export_count > 2 or export_from_count > 2:
                        self.barrel_files.add(path)
                except:
                    pass
    
    def _mark_barrel_exports(self):
        """Mark files that are exported via barrels"""
        for barrel_path in self.barrel_files:
            try:
                with open(barrel_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                # Extract re-exported files
                for match in re.finditer(r'export\s+.*\s+from\s+[\'"]([^\'"]+)[\'"]', content):
                    import_path = match.group(1)
                    resolved = self._resolve_import(barrel_path, import_path)
                    if resolved and resolved in self.files:
                        self.files[resolved].is_barrel_exported = True
            except:
                pass
    
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
    
    def __init__(self, files: Dict[str, FileInfo], logger: AnalysisLogger):
        self.files = files
        self.logger = logger
        self.unused: List[str] = []
        self.unwired: List[str] = []
        
    def analyze(self):
        """Perform usage analysis"""
        self.logger.info("Analyzing file usage patterns...")
        
        self._detect_unused()
        self._detect_unwired()
        
        self.logger.info(f"Found {len(self.unused)} unused files")
        self.logger.info(f"Found {len(self.unwired)} unwired features")
    
    def _detect_unused(self):
        """Detect likely unused files with false-positive reduction"""
        for path, meta in self.files.items():
            # Skip entry points
            if meta.is_entry_point:
                continue
            
            # Skip config, assets, tests
            if meta.category in {FileCategory.CONFIGURATION, FileCategory.ASSET, FileCategory.TEST}:
                continue
            
            # Skip framework core
            if meta.category == FileCategory.FRAMEWORK_CORE:
                continue
            
            # Skip dynamically imported
            if meta.is_dynamic_imported:
                continue
            
            # Skip barrel-exported
            if meta.is_barrel_exported:
                continue
            
            # Check usage
            if meta.dependents_count == 0 and meta.exports:
                self.unused.append(path)
    
    def _detect_unwired(self):
        """Detect features not integrated into app"""
        for path, meta in self.files.items():
            if path in self.unused:
                continue
            
            # Look for substantial files with no dependents
            if (meta.dependents_count == 0 and 
                meta.lines > 50 and 
                len(meta.exports) > 2 and
                meta.category in {FileCategory.SERVICE, FileCategory.UI_COMPONENT, 
                                 FileCategory.CUSTOM_HOOK, FileCategory.CORE_LOGIC} and
                not meta.is_dynamic_imported and
                not meta.is_barrel_exported):
                self.unwired.append(path)

# ============================================================================
# STABILITY & RISK CALCULATOR
# ============================================================================

class StabilityCalculator:
    """Calculate stability and risk scores with enhanced logic"""
    
    def __init__(self, files: Dict[str, FileInfo], logger: AnalysisLogger):
        self.files = files
        self.logger = logger
    
    def calculate(self):
        """Calculate all scores"""
        self.logger.info("Computing stability and risk metrics...")
        
        for path, meta in self.files.items():
            meta.stability_score = self._compute_stability(meta)
            meta.risk_level = self._compute_risk_level(meta)
            meta.recommendation = self._compute_recommendation(meta)
            meta.short_reason = self._generate_reasoning(meta)
        
        self.logger.info("Stability and risk metrics computed")
    
    def _compute_stability(self, meta: FileInfo) -> float:
        """Compute stability score (0-10) with enhanced factors"""
        score = 0.0
        
        # Dependents weight (max 4.0)
        score += min(meta.dependents_count * 0.4, 4.0)
        
        # Export count weight (max 2.0)
        score += min(len(meta.exports) * 0.2, 2.0)
        
        # Size/complexity weight (max 2.0)
        score += min(meta.lines * 0.01, 1.0)
        score += min(meta.complexity_estimate * 0.02, 1.0)
        
        # Recency weight (max 2.0)
        age_days = meta.last_modified_days
        score += max(2.0 - (age_days * 0.01), 0)
        
        # Type safety penalty
        if meta.any_count > 0:
            score -= min(meta.any_count * 0.1, 1.0)
        
        # Barrel export boost
        if meta.is_barrel_exported:
            score += 1.0
        
        # Dynamic import boost
        if meta.is_dynamic_imported:
            score += 1.5
        
        # Framework core boost
        if meta.category == FileCategory.FRAMEWORK_CORE:
            score += 2.0
        
        return max(min(score, 10.0), 0.0)
    
    def _compute_risk_level(self, meta: FileInfo) -> RiskLevel:
        """Compute refactoring risk level"""
        risk_score = 0
        
        # High dependents = high risk
        risk_score += min(meta.dependents_count * 5, 50)
        
        # Entry points are critical
        if meta.is_entry_point:
            risk_score += 40
        
        # Critical categories
        if meta.category in {FileCategory.PAGE_OR_ROUTE, FileCategory.CONTEXT, 
                            FileCategory.STORE_OR_STATE, FileCategory.FRAMEWORK_CORE}:
            risk_score += 30
        
        # Side effects increase risk
        if meta.has_side_effects:
            risk_score += 15
        
        # High complexity
        if meta.complexity_estimate > Config.COMPLEXITY_HIGH_THRESHOLD:
            risk_score += 20
        
        # Dynamic import protection
        if meta.is_dynamic_imported:
            risk_score += 25
        
        # Weak typing
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
        # Always keep critical files
        if meta.is_entry_point or meta.category == FileCategory.FRAMEWORK_CORE:
            return Recommendation.KEEP_AS_IS
        
        # Keep high-risk categories with dependents
        if meta.category in {FileCategory.PAGE_OR_ROUTE, FileCategory.CONTEXT, 
                            FileCategory.STORE_OR_STATE}:
            if meta.dependents_count > 0:
                return Recommendation.KEEP_AS_IS
        
        # Critical risk always keep
        if meta.risk_level == RiskLevel.CRITICAL:
            return Recommendation.KEEP_AS_IS
        
        # High risk investigate
        if meta.risk_level == RiskLevel.HIGH:
            return Recommendation.INVESTIGATE
        
        # Dynamic imports always keep
        if meta.is_dynamic_imported:
            return Recommendation.KEEP_AS_IS
        
        # Barrel exports keep
        if meta.is_barrel_exported and meta.dependents_count > 0:
            return Recommendation.KEEP_AS_IS
        
        # Recent modifications
        if meta.last_modified_days < Config.RECENT_DAYS_BLOCKER:
            return Recommendation.KEEP_AS_IS
        
        # Check archive eligibility (preliminary)
        if (meta.risk_level in {RiskLevel.LOW, RiskLevel.MEDIUM} and
            meta.stability_score < Config.STABILITY_THRESHOLD and
            meta.dependents_count == 0 and
            meta.last_modified_days > Config.RECENT_DAYS_BLOCKER and
            not meta.exports):
            return Recommendation.SAFE_TO_ARCHIVE
        
        # No dependents but has exports
        if meta.dependents_count == 0 and meta.exports:
            if meta.last_modified_days > 90:
                return Recommendation.INVESTIGATE
            else:
                return Recommendation.KEEP_AS_IS
        
        return Recommendation.KEEP_AS_IS
    
    def _generate_reasoning(self, meta: FileInfo) -> str:
        """Generate short reasoning for recommendation"""
        reasons = []
        
        if meta.is_entry_point:
            reasons.append("Entry point")
        
        if meta.dependents_count > 5:
            reasons.append(f"High dependents ({meta.dependents_count})")
        
        if meta.stability_score > 7:
            reasons.append(f"High stability ({meta.stability_score:.1f}/10)")
        
        if meta.dependents_count == 0:
            reasons.append("No dependents")
        
        if meta.last_modified_days > 90:
            reasons.append(f"Not modified in {meta.last_modified_days} days")
        
        if meta.is_dynamic_imported:
            reasons.append("Dynamically imported")
        
        if meta.is_barrel_exported:
            reasons.append("Exported via barrel")
        
        if meta.has_side_effects:
            reasons.append("Contains side effects")
        
        if meta.any_count > 5:
            reasons.append(f"Weak typing ({meta.any_count} 'any')")
        
        return " | ".join(reasons) if reasons else "Standard file"

# ============================================================================
# ARCHIVE DECISION ENGINE
# ============================================================================

class ArchiveDecisionEngine:
    """Enterprise-grade archive eligibility evaluation"""
    
    def __init__(self, files: Dict[str, FileInfo], logger: AnalysisLogger):
        self.files = files
        self.logger = logger
    
    def evaluate_archive_candidate(self, file_info: FileInfo) -> ArchiveDecision:
        """
        Evaluate if a file is eligible for archiving with enterprise-grade checks.
        
        Hard blockers immediately disqualify a file.
        If no blockers, compute confidence score and determine recommendation.
        
        Args:
            file_info: File metadata to evaluate
            
        Returns:
            ArchiveDecision with allowed status, score, and reasoning
        """
        blockers = []
        reasons = []
        
        # === HARD BLOCKERS ===
        
        # Category blockers
        if file_info.category in {FileCategory.PAGE_OR_ROUTE, FileCategory.CONTEXT, 
                                  FileCategory.STORE_OR_STATE, FileCategory.FRAMEWORK_CORE}:
            blockers.append(f"Critical category: {file_info.category.value}")
        
        # Dynamic import blocker
        if file_info.is_dynamic_imported:
            blockers.append("Dynamically imported")
        
        # Recent modification blocker
        if file_info.last_modified_days < Config.RECENT_DAYS_BLOCKER:
            blockers.append(f"Recently modified ({file_info.last_modified_days} days ago)")
        
        # Dependents blocker
        if file_info.dependents_count > 0:
            blockers.append(f"Has {file_info.dependents_count} dependents")
        
        # Barrel export blocker
        if file_info.is_barrel_exported:
            blockers.append("Exported via barrel index")
        
        # Infrastructure path blocker
        if any(infra in file_info.path.lower() for infra in INFRASTRUCTURE_PATHS):
            blockers.append("Infrastructure/core path")
        
        # Test fixture blocker (tests that other tests depend on)
        if file_info.is_test_file and file_info.dependents_count > 0:
            blockers.append("Test fixture with dependents")
        
        # Entry point blocker
        if file_info.is_entry_point:
            blockers.append("Entry point file")
        
        # If any hard blockers, return immediately
        if blockers:
            return ArchiveDecision(
                allowed=False,
                decision=Recommendation.KEEP_AS_IS,
                score=0.0,
                reasons=reasons,
                blockers=blockers
            )
        
        # === CONFIDENCE SCORE CALCULATION ===
        
        score = 50.0  # Baseline
        
        # Positive factors (increase confidence)
        if file_info.dependents_count == 0:
            score += 15
            reasons.append("No dependents found")
        
        if not file_info.exports:
            score += 10
            reasons.append("No exports")
        
        if file_info.last_modified_days > 180:
            score += 10
            reasons.append(f"Not modified in {file_info.last_modified_days} days")
        elif file_info.last_modified_days > 90:
            score += 5
            reasons.append(f"Not modified in {file_info.last_modified_days} days")
        
        if file_info.stability_score < 3.0:
            score += 8
            reasons.append(f"Low stability ({file_info.stability_score:.1f}/10)")
        
        if file_info.lines < 50:
            score += 5
            reasons.append("Small file")
        
        if file_info.category in {FileCategory.UTILITY, FileCategory.UNKNOWN}:
            score += 5
        
        # Negative factors (decrease confidence)
        if file_info.exports and len(file_info.exports) > 0:
            score -= 10
            reasons.append(f"Has {len(file_info.exports)} exports")
        
        if file_info.has_side_effects:
            score -= 15
            reasons.append("Contains side effects")
        
        if file_info.complexity_estimate > 20:
            score -= 10
            reasons.append(f"High complexity ({file_info.complexity_estimate})")
        
        if file_info.is_react_component:
            score -= 8
            reasons.append("React component")
        
        if file_info.is_custom_hook:
            score -= 8
            reasons.append("Custom hook")
        
        if len(file_info.hook_usage) > 3:
            score -= 5
            reasons.append(f"Uses {len(file_info.hook_usage)} hooks")
        
        if file_info.any_count > 5:
            score -= 5
        
        # Determine decision based on score
        if score >= Config.ARCHIVE_SCORE_THRESHOLD:
            decision = Recommendation.SAFE_TO_ARCHIVE
        elif score >= Config.INVESTIGATE_LOW_THRESHOLD:
            decision = Recommendation.INVESTIGATE
            reasons.append("Low risk but needs review")
        elif score >= Config.INVESTIGATE_MEDIUM_THRESHOLD:
            decision = Recommendation.INVESTIGATE
            reasons.append("Medium risk - careful review needed")
        else:
            decision = Recommendation.KEEP_AS_IS
            reasons.append("Risk too high for archival")
        
        return ArchiveDecision(
            allowed=(score >= Config.INVESTIGATE_MEDIUM_THRESHOLD),
            decision=decision,
            score=score,
            reasons=reasons,
            blockers=[]
        )

# ============================================================================
# ARCHIVE BUILDER
# ============================================================================

class ArchiveBuilder:
    """Build safe non-destructive archive packages"""
    
    def __init__(self, project_path: str, report_folder: Path, files: Dict[str, FileInfo], logger: AnalysisLogger):
        self.project_path = Path(project_path)
        self.report_folder = report_folder
        self.files = files
        self.logger = logger
        self.archive_dir = report_folder / 'refactor_temp' / 'archived_files'
        
    def create_safe_archive(self, candidates: List[str], keep_temp: bool = False) -> Optional[str]:
        """
        Create safe archive package with verification.
        
        Args:
            candidates: List of file paths to archive
            keep_temp: Whether to keep temp folder after zipping
            
        Returns:
            Path to created archive or None if failed
        """
        if not candidates:
            self.logger.warning("No files to archive")
            return None
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        archive_name = f"refactor_archive_{timestamp}.zip"
        archives_folder = self.report_folder / 'archives'
        archives_folder.mkdir(exist_ok=True)
        archive_path = archives_folder / archive_name
        
        self.logger.info(f"Creating safe archive package: {archive_name}")
        
        # Create temp directory
        self.archive_dir.mkdir(parents=True, exist_ok=True)
        
        # Metadata for archive
        metadata = {
            'timestamp': timestamp,
            'total_files': len(candidates),
            'tool_version': Config.TOOL_VERSION,
            'files': []
        }
        
        # Copy files
        copied_count = 0
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
                    'reasoning': meta.short_reason,
                    'last_modified_days': meta.last_modified_days
                })
                
                copied_count += 1
                
            except Exception as e:
                self.logger.error(f"Error archiving {file_path}: {e}")
        
        # Write metadata
        metadata_path = self.archive_dir.parent / 'metadata.json'
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)
        
        # Create ZIP
        try:
            with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for root, dirs, files in os.walk(self.archive_dir.parent):
                    for file in files:
                        file_path = Path(root) / file
                        arcname = file_path.relative_to(self.archive_dir.parent)
                        zipf.write(file_path, arcname)
            
            # Verify ZIP integrity
            with zipfile.ZipFile(archive_path, 'r') as zipf:
                zip_entries = zipf.namelist()
                assert len(zip_entries) > 0, "ZIP file is empty"
                self.logger.info(f"ZIP verification passed: {len(zip_entries)} entries")
            
        except Exception as e:
            self.logger.error(f"Error creating ZIP: {e}")
            return None
        
        # Clean temp if requested
        if not keep_temp:
            try:
                shutil.rmtree(self.archive_dir.parent)
            except:
                pass
        
        # Create archive metadata summary
        archive_metadata = {
            'archive_file': archive_name,
            'created_at': timestamp,
            'files_archived': copied_count,
            'total_size': sum(self.files[f].size for f in candidates),
            'archive_path': str(archive_path)
        }
        
        archive_metadata_path = self.report_folder / 'archive_metadata.json'
        with open(archive_metadata_path, 'w', encoding='utf-8') as f:
            json.dump(archive_metadata, f, indent=2)
        
        self.logger.info(f"Archive created successfully: {archive_path}")
        self.logger.info(f"Archived {copied_count} files")
        
        return str(archive_path)

# ============================================================================
# REPORT GENERATOR
# ============================================================================

class ReportGenerator:
    """Generate all report formats"""
    
    def __init__(self, report: AnalysisReport, report_folder: Path, logger: AnalysisLogger):
        self.report = report
        self.report_folder = report_folder
        self.logger = logger
    
    def generate_all(self):
        """Generate all report formats"""
        self.logger.info("Generating reports...")
        
        self.generate_full_json()
        self.generate_summary_json()
        self.generate_high_risk_csv()
        self.generate_html_dashboard()
        
        self.logger.info(f"All reports generated in: {self.report_folder}")
    
    def generate_full_json(self):
        """Generate full_report.json"""
        output_path = self.report_folder / 'full_report.json'
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(asdict(self.report), f, indent=2, default=str)
        
        self.logger.info(f"Full report: {output_path.name}")
    
    def generate_summary_json(self):
        """Generate summary_report.json"""
        output_path = self.report_folder / 'summary_report.json'
        
        summary = {
            'metadata': self.report.metadata,
            'totals': {
                'files': len(self.report.files),
                'duplicates': len(self.report.duplicate_clusters),
                'unused': len(self.report.unused_candidates),
                'unwired': len(self.report.unwired_candidates),
                'archive_candidates': len(self.report.archive_candidates)
            },
            'category_distribution': self.report.category_distribution,
            'risk_distribution': self.report.risk_distribution
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2)
        
        self.logger.info(f"Summary report: {output_path.name}")
    
    def generate_high_risk_csv(self):
        """Generate high_risk.csv"""
        output_path = self.report_folder / 'high_risk.csv'
        
        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['File', 'Risk', 'Stability', 'Recommendation', 'Reasoning'])
            
            for path, file_data in self.report.files.items():
                if file_data['risk_level'] in ['HIGH', 'CRITICAL']:
                    writer.writerow([
                        file_data['relative_path'],
                        file_data['risk_level'],
                        f"{file_data['stability_score']:.1f}",
                        file_data['recommendation'],
                        file_data['short_reason']
                    ])
        
        self.logger.info(f"High risk CSV: {output_path.name}")
    
    def generate_html_dashboard(self):
        """Generate optimization_dashboard.html"""
        output_path = self.report_folder / 'optimization_dashboard.html'
        
        html = self._build_html()
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html)
        
        self.logger.info(f"HTML dashboard: {output_path.name}")
    
    def _build_html(self) -> str:
        """Build complete HTML document"""
        files_json = json.dumps(self.report.files, default=str)
        duplicates_json = json.dumps(self.report.duplicate_clusters, default=str)
        
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Intelligence Dashboard — {self.report.metadata['start_time']}</title>
    <style>{self._get_styles()}</style>
</head>
<body>
    <div class="dashboard">
        {self._build_header()}
        {self._build_safety_banner()}
        {self._build_summary()}
        {self._build_duplicates_section()}
        {self._build_unused_section()}
        {self._build_archive_section()}
    </div>
    <script>
        const filesData = {files_json};
        const duplicatesData = {duplicates_json};
        {self._get_scripts()}
    </script>
</body>
</html>"""
    
    def _get_styles(self) -> str:
        """Generate CSS styles"""
        return """
* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
    --bg-primary: #0a0e27;
    --bg-secondary: #141b3a;
    --bg-card: rgba(20, 27, 58, 0.8);
    --border: rgba(99, 102, 241, 0.2);
    --text-primary: #e2e8f0;
    --text-secondary: #94a3b8;
    --accent: #6366f1;
    --success: #10b981;
    --warning: #f59e0b;
    --danger: #ef4444;
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
}

.header h1 {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 8px;
    background: linear-gradient(135deg, var(--accent), #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.safety-banner {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05));
    border: 2px solid var(--success);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 30px;
    text-align: center;
}

.safety-banner h2 {
    color: var(--success);
    font-size: 20px;
    margin-bottom: 10px;
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
}

.stat-card .label {
    color: var(--text-secondary);
    font-size: 13px;
    text-transform: uppercase;
    margin-bottom: 8px;
}

.stat-card .value {
    font-size: 32px;
    font-weight: 700;
}

.section {
    background: var(--bg-card);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 30px;
    margin-bottom: 30px;
}

.section-title {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 20px;
}

.cluster {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 16px;
}

.file-list {
    list-style: none;
    margin: 12px 0;
}

.file-item {
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    margin-bottom: 8px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
}

.badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    margin-left: 8px;
}

.badge.low { background: rgba(16, 185, 129, 0.2); color: var(--success); }
.badge.medium { background: rgba(245, 158, 11, 0.2); color: var(--warning); }
.badge.high { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
.badge.critical { background: rgba(239, 68, 68, 0.3); color: #ff6b6b; }

table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
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
}

tr:hover {
    background: rgba(255, 255, 255, 0.05);
}
"""
    
    def _build_header(self) -> str:
        """Build header section"""
        return f"""
<div class="header">
    <h1>🔬 Code Intelligence Dashboard v{Config.TOOL_VERSION}</h1>
    <div style="color: var(--text-secondary); margin-top: 8px;">
        <strong>Project:</strong> {self.report.metadata['scan_root']}<br>
        <strong>Generated:</strong> {self.report.metadata['start_time']}<br>
        <strong>Report Folder:</strong> {self.report.metadata['report_folder']}
    </div>
</div>
"""
    
    def _build_safety_banner(self) -> str:
        """Build safety notice banner"""
        return """
<div class="safety-banner">
    <h2>✅ ANALYSIS OUTPUT — NO FILES WERE MODIFIED</h2>
    <p><strong>This is a read-only analysis.</strong> Archive actions require explicit user confirmation.</p>
    <p>No source files have been altered, moved, or deleted.</p>
</div>
"""
    
    def _build_summary(self) -> str:
        """Build summary cards"""
        return f"""
<div class="summary-grid">
    <div class="stat-card">
        <div class="label">Total Files</div>
        <div class="value">{len(self.report.files):,}</div>
    </div>
    <div class="stat-card">
        <div class="label">Duplicate Clusters</div>
        <div class="value">{len(self.report.duplicate_clusters)}</div>
    </div>
    <div class="stat-card">
        <div class="label">Unused Files</div>
        <div class="value">{len(self.report.unused_candidates)}</div>
    </div>
    <div class="stat-card">
        <div class="label">Unwired Features</div>
        <div class="value">{len(self.report.unwired_candidates)}</div>
    </div>
    <div class="stat-card">
        <div class="label">Archive Candidates</div>
        <div class="value">{len(self.report.archive_candidates)}</div>
    </div>
</div>
"""
    
    def _build_duplicates_section(self) -> str:
        """Build duplicates section"""
        html = f"""
<div class="section">
    <h2 class="section-title">📋 Duplicate Clusters ({len(self.report.duplicate_clusters)})</h2>
"""
        
        for cluster in self.report.duplicate_clusters[:10]:
            html += f"""
    <div class="cluster">
        <div style="margin-bottom: 12px;">
            <strong>Cluster {cluster['cluster_id']}</strong>
            <span class="badge {cluster['risk_level'].lower()}">{cluster['risk_level']}</span>
            <span style="margin-left: 12px; color: var(--text-secondary);">
                {cluster['similarity_score']:.0%} similar | {cluster['cluster_size']} files
            </span>
        </div>
        <div style="color: var(--text-secondary); margin-bottom: 8px;">
            <strong>Suggested Base:</strong> {Path(cluster['suggested_base_file']).name}
        </div>
        <div style="color: var(--text-secondary);">
            <strong>Recommendation:</strong> {cluster['recommendation']}
        </div>
    </div>
"""
        
        html += "</div>"
        return html
    
    def _build_unused_section(self) -> str:
        """Build unused files section"""
        html = f"""
<div class="section">
    <h2 class="section-title">🗑️ Unused Files ({len(self.report.unused_candidates)})</h2>
    <p style="color: var(--text-secondary); margin-bottom: 20px;">
        Files with exports but no dependents. Review before archiving.
    </p>
    <ul class="file-list">
"""
        
        for file_path in self.report.unused_candidates[:20]:
            file_data = self.report.files[file_path]
            html += f"""
        <li class="file-item">
            {file_data['relative_path']}
            <span style="color: var(--text-secondary); margin-left: 12px;">
                {file_data['category']} | Stability: {file_data['stability_score']:.1f}/10
            </span>
        </li>
"""
        
        if len(self.report.unused_candidates) > 20:
            html += f"""
        <li class="file-item" style="text-align: center;">
            ... and {len(self.report.unused_candidates) - 20} more
        </li>
"""
        
        html += """
    </ul>
</div>
"""
        return html
    
    def _build_archive_section(self) -> str:
        """Build archive candidates section"""
        html = f"""
<div class="section">
    <h2 class="section-title">📦 Archive Candidates ({len(self.report.archive_candidates)})</h2>
    <p style="color: var(--text-secondary); margin-bottom: 20px;">
        Files that meet safety criteria for archiving. Use CLI to create archive.
    </p>
"""
        
        if self.report.archive_candidates:
            html += '<table><thead><tr><th>File</th><th>Category</th><th>Risk</th><th>Stability</th></tr></thead><tbody>'
            
            for file_path in self.report.archive_candidates[:20]:
                file_data = self.report.files[file_path]
                html += f"""
            <tr>
                <td>{file_data['relative_path']}</td>
                <td>{file_data['category']}</td>
                <td><span class="badge {file_data['risk_level'].lower()}">{file_data['risk_level']}</span></td>
                <td>{file_data['stability_score']:.1f}/10</td>
            </tr>
"""
            
            html += '</tbody></table>'
        else:
            html += '<p style="color: var(--text-secondary);">No files currently eligible for archiving.</p>'
        
        html += '</div>'
        return html
    
    def _get_scripts(self) -> str:
        """Generate JavaScript"""
        return """
console.log('Dashboard initialized');
console.log('Files loaded:', Object.keys(filesData).length);
console.log('Duplicate clusters:', duplicatesData.length);
"""

# ============================================================================
# MAIN ORCHESTRATOR
# ============================================================================

class CodeIntelligencePlatform:
    """Main orchestrator for analysis"""
    
    def __init__(self, project_path: str, scope_path: Optional[str] = None):
        self.project_path = Path(project_path).resolve()
        self.scope_path = scope_path
        self.report_folder: Optional[Path] = None
        self.logger: Optional[AnalysisLogger] = None
        self.files: Dict[str, FileInfo] = {}
        self.components: List[ComponentInfo] = []
        self.report: Optional[AnalysisReport] = None
        
    def analyze(self) -> AnalysisReport:
        """Perform complete analysis"""
        # Create report folder
        self.report_folder = create_timestamped_report_folder(self.project_path)
        
        # Initialize logger
        log_path = self.report_folder / 'runtime_log.txt'
        self.logger = AnalysisLogger(str(log_path))
        
        self.logger.info("="*70)
        self.logger.info("ENTERPRISE CODE INTELLIGENCE PLATFORM")
        self.logger.info("="*70)
        self.logger.info(f"Scan root: {self.project_path}")
        self.logger.info(f"Report folder: {self.report_folder}")
        
        start_time = datetime.now()
        
        try:
            # Phase 1: Scan
            scanner = ProjectScanner(str(self.project_path), self.logger, self.scope_path)
            self.files, self.components = scanner.scan()
            
            # Phase 2: Build dependency graph
            graph_builder = DependencyGraphBuilder(self.files, self.logger)
            graph_builder.build()
            
            # Phase 3: Detect duplicates
            duplicate_detector = DuplicateDetector(self.files, self.logger)
            duplicates = duplicate_detector.analyze()
            
            # Phase 4: Usage analysis
            usage_analyzer = UsageAnalyzer(self.files, self.logger)
            usage_analyzer.analyze()
            
            # Phase 5: Stability & risk
            stability_calc = StabilityCalculator(self.files, self.logger)
            stability_calc.calculate()
            
            # Phase 6: Archive eligibility (preliminary)
            archive_engine = ArchiveDecisionEngine(self.files, self.logger)
            archive_candidates = []
            
            for path, meta in self.files.items():
                decision = archive_engine.evaluate_archive_candidate(meta)
                if decision.decision == Recommendation.SAFE_TO_ARCHIVE:
                    archive_candidates.append(path)
            
            end_time = datetime.now()
            
            # Build report
            self.report = AnalysisReport(
                metadata={
                    'tool_version': Config.TOOL_VERSION,
                    'scan_root': str(self.project_path),
                    'ignored_folders': list(IGNORE_PATTERNS),
                    'start_time': start_time.isoformat(),
                    'end_time': end_time.isoformat(),
                    'report_folder': str(self.report_folder),
                    'warnings': self.logger.warnings
                },
                files={
                    path: {
                        'path': meta.path,
                        'relative_path': meta.relative_path,
                        'size': meta.size,
                        'lines': meta.lines,
                        'category': meta.category.value,
                        'content_hash': meta.content_hash,
                        'structural_hash': meta.structural_hash,
                        'exported_symbols': meta.exported_symbols,
                        'dependents_count': meta.dependents_count,
                        'dependents': list(meta.dependents),
                        'stability_score': meta.stability_score,
                        'risk_level': meta.risk_level.value,
                        'recommendation': meta.recommendation.value,
                        'short_reason': meta.short_reason,
                        'last_modified_days': meta.last_modified_days,
                        'complexity_estimate': meta.complexity_estimate,
                        'any_count': meta.any_count,
                        'is_dynamic_imported': meta.is_dynamic_imported,
                        'is_test_file': meta.is_test_file,
                        'duplicate_cluster_id': meta.duplicate_cluster_id
                    }
                    for path, meta in self.files.items()
                },
                duplicate_clusters=[
                    {
                        'cluster_id': c.cluster_id,
                        'files': c.files,
                        'cluster_size': c.cluster_size,
                        'similarity_score': c.similarity_score,
                        'exported_files_count': c.exported_files_count,
                        'recent_files_count': c.recent_files_count,
                        'suggested_base_file': c.suggested_base_file,
                        'suggested_merge_target': c.suggested_merge_target,
                        'diff_summary': c.diff_summary,
                        'risk_level': c.risk_level.value,
                        'recommendation': c.recommendation.value,
                        'confidence_score': c.confidence_score
                    }
                    for c in duplicates
                ],
                same_name_conflicts=[],
                unused_candidates=usage_analyzer.unused,
                unwired_candidates=usage_analyzer.unwired,
                merge_suggestions=[],
                archive_candidates=archive_candidates,
                category_distribution=dict(Counter(f.category.value for f in self.files.values())),
                risk_distribution=dict(Counter(f.risk_level.value for f in self.files.values()))
            )
            
            # Generate reports
            report_gen = ReportGenerator(self.report, self.report_folder, self.logger)
            report_gen.generate_all()
            
            self.logger.info("="*70)
            self.logger.info("ANALYSIS COMPLETE")
            self.logger.info("="*70)
            
            self.logger.finalize()
            
            return self.report
            
        except Exception as e:
            self.logger.error(f"Analysis failed: {e}")
            self.logger.finalize()
            raise

# ============================================================================
# INTERACTIVE CLI
# ============================================================================

class InteractiveCLI:
    """Interactive command-line interface"""
    
    def __init__(self, platform: CodeIntelligencePlatform):
        self.platform = platform
        self.report: Optional[AnalysisReport] = None
        
    def run(self):
        """Run interactive CLI"""
        try:
            self._print_banner()
            self._print_help()
            
            while True:
                self._print_menu()
                choice = input(f"\n{Colors.OKCYAN}Select option: {Colors.ENDC}").strip()
                
                if choice == '1':
                    self._full_analysis()
                elif choice == '2':
                    self._show_high_risk()
                elif choice == '3':
                    self._show_unused_unwired()
                elif choice == '4':
                    self._show_duplicate_clusters()
                elif choice == '5':
                    self._show_category_distribution()
                elif choice == '6':
                    self._export_reports()
                elif choice == '7':
                    self._view_file_details()
                elif choice == '8':
                    self._create_archive()
                elif choice == '9':
                    self._open_dashboard()
                elif choice == '0':
                    print(f"\n{Colors.OKGREEN}✓ Exiting safely. No files were modified.{Colors.ENDC}\n")
                    break
                else:
                    print(f"{Colors.FAIL}❌ Invalid option{Colors.ENDC}")
                
                input(f"\n{Colors.WARNING}Press Enter to continue...{Colors.ENDC}")
                
        except KeyboardInterrupt:
            print(f"\n\n{Colors.WARNING}⚠️  Operation cancelled. Exiting safely.{Colors.ENDC}\n")
    
    def _print_banner(self):
        """Print CLI banner"""
        print(f"\n{Colors.BOLD}{Colors.HEADER}")
        print("=" * 70)
        print("🔬 ENTERPRISE CODE INTELLIGENCE PLATFORM v" + Config.TOOL_VERSION)
        print("=" * 70)
        print(f"{Colors.ENDC}")
        print(f"{Colors.OKGREEN}✓ Analysis-only by default — no source changes{Colors.ENDC}")
        print(f"{Colors.OKGREEN}✓ Archive creates copies only — review before apply{Colors.ENDC}")
        print(f"{Colors.OKGREEN}✓ No Git integration used{Colors.ENDC}\n")
    
    def _print_help(self):
        """Print help text"""
        print(f"{Colors.BOLD}CONFIGURATION:{Colors.ENDC}")
        print(f"  Similarity Threshold: {Config.SIMILARITY_THRESHOLD}")
        print(f"  Recent Days Blocker: {Config.RECENT_DAYS_BLOCKER}")
        print(f"  Archive Score Threshold: {Config.ARCHIVE_SCORE_THRESHOLD}\n")
    
    def _print_menu(self):
        """Print main menu"""
        print(f"\n{Colors.BOLD}MAIN MENU:{Colors.ENDC}")
        print(f"{Colors.OKCYAN}1.{Colors.ENDC} Full Analysis")
        print(f"{Colors.OKCYAN}2.{Colors.ENDC} Show High Risk Files Only")
        print(f"{Colors.OKCYAN}3.{Colors.ENDC} Show Unused & Unwired Components")
        print(f"{Colors.OKCYAN}4.{Colors.ENDC} Show Duplicate Clusters with Merge Suggestions")
        print(f"{Colors.OKCYAN}5.{Colors.ENDC} Show File Category Distribution")
        print(f"{Colors.OKCYAN}6.{Colors.ENDC} Export Reports (JSON + CSV)")
        print(f"{Colors.OKCYAN}7.{Colors.ENDC} View Single File Details")
        print(f"{Colors.OKCYAN}8.{Colors.ENDC} Create Safe Refactor Archive")
        print(f"{Colors.OKCYAN}9.{Colors.ENDC} Open HTML Dashboard")
        print(f"{Colors.FAIL}0.{Colors.ENDC} Exit")
    
    def _ensure_analysis(self):
        """Ensure analysis has been run"""
        if not self.report:
            print(f"\n{Colors.WARNING}⚠️  Please run Full Analysis first (option 1){Colors.ENDC}")
            return False
        return True
    
    def _full_analysis(self):
        """Perform full analysis"""
        print(f"\n{Colors.BOLD}=== FULL ANALYSIS ==={Colors.ENDC}\n")
        
        self.report = self.platform.analyze()
        
        print(f"\n{Colors.BOLD}SUMMARY:{Colors.ENDC}")
        print(f"  Total Files: {len(self.report.files):,}")
        print(f"  Duplicate Clusters: {len(self.report.duplicate_clusters)}")
        print(f"  Unused Files: {len(self.report.unused_candidates)}")
        print(f"  Unwired Features: {len(self.report.unwired_candidates)}")
        print(f"  Archive Candidates: {len(self.report.archive_candidates)}")
        print(f"\n{Colors.OKGREEN}✓ Reports saved to: {self.platform.report_folder}{Colors.ENDC}")
    
    def _show_high_risk(self):
        """Show high-risk files"""
        if not self._ensure_analysis():
            return
        
        print(f"\n{Colors.BOLD}=== HIGH RISK FILES ==={Colors.ENDC}\n")
        
        high_risk = [
            (path, data) for path, data in self.report.files.items()
            if data['risk_level'] in ['HIGH', 'CRITICAL']
        ]
        
        if not high_risk:
            print(f"{Colors.OKGREEN}✓ No high-risk files found{Colors.ENDC}")
            return
        
        for path, data in high_risk[:20]:
            print(f"\n{Colors.FAIL}File:{Colors.ENDC} {data['relative_path']}")
            print(f"  Risk: {data['risk_level']}")
            print(f"  Category: {data['category']}")
            print(f"  Dependents: {data['dependents_count']}")
            print(f"  Stability: {data['stability_score']:.1f}/10")
            print(f"  Reasoning: {data['short_reason']}")
        
        if len(high_risk) > 20:
            print(f"\n{Colors.WARNING}... and {len(high_risk) - 20} more{Colors.ENDC}")
    
    def _show_unused_unwired(self):
        """Show unused and unwired files"""
        if not self._ensure_analysis():
            return
        
        print(f"\n{Colors.BOLD}=== UNUSED & UNWIRED FILES ==={Colors.ENDC}\n")
        
        print(f"{Colors.BOLD}Unused Files ({len(self.report.unused_candidates)}):{Colors.ENDC}")
        for file_path in self.report.unused_candidates[:10]:
            data = self.report.files[file_path]
            print(f"  • {data['relative_path']} ({data['category']})")
        
        if len(self.report.unused_candidates) > 10:
            print(f"  ... and {len(self.report.unused_candidates) - 10} more")
        
        print(f"\n{Colors.BOLD}Unwired Features ({len(self.report.unwired_candidates)}):{Colors.ENDC}")
        for file_path in self.report.unwired_candidates[:10]:
            data = self.report.files[file_path]
            print(f"  • {data['relative_path']} ({data['lines']} lines)")
        
        if len(self.report.unwired_candidates) > 10:
            print(f"  ... and {len(self.report.unwired_candidates) - 10} more")
    
    def _show_duplicate_clusters(self):
        """Show duplicate clusters"""
        if not self._ensure_analysis():
            return
        
        print(f"\n{Colors.BOLD}=== DUPLICATE CLUSTERS ==={Colors.ENDC}\n")
        
        if not self.report.duplicate_clusters:
            print(f"{Colors.OKGREEN}✓ No duplicate clusters found{Colors.ENDC}")
            return
        
        for cluster in self.report.duplicate_clusters[:5]:
            print(f"\n{Colors.BOLD}Cluster {cluster['cluster_id']}{Colors.ENDC}")
            print(f"  Similarity: {cluster['similarity_score']:.0%}")
            print(f"  Risk: {cluster['risk_level']}")
            print(f"  Recommendation: {cluster['recommendation']}")
            print(f"  Base: {Path(cluster['suggested_base_file']).name}")
            print(f"  Files: {cluster['cluster_size']}")
            print(f"  Differences:")
            for diff in cluster['diff_summary']:
                print(f"    - {diff}")
        
        if len(self.report.duplicate_clusters) > 5:
            print(f"\n{Colors.WARNING}... and {len(self.report.duplicate_clusters) - 5} more{Colors.ENDC}")
    
    def _show_category_distribution(self):
        """Show category distribution"""
        if not self._ensure_analysis():
            return
        
        print(f"\n{Colors.BOLD}=== FILE CATEGORY DISTRIBUTION ==={Colors.ENDC}\n")
        
        for category, count in sorted(self.report.category_distribution.items(), 
                                     key=lambda x: x[1], reverse=True):
            percentage = (count / len(self.report.files)) * 100
            bar = '█' * int(percentage / 2)
            print(f"{category:20} {count:5} ({percentage:5.1f}%) {bar}")
    
    def _export_reports(self):
        """Export reports (already done during analysis)"""
        if not self._ensure_analysis():
            return
        
        print(f"\n{Colors.OKGREEN}✓ Reports already exported during analysis{Colors.ENDC}")
        print(f"  Location: {self.platform.report_folder}")
        print(f"  Files:")
        print(f"    - full_report.json")
        print(f"    - summary_report.json")
        print(f"    - high_risk.csv")
        print(f"    - optimization_dashboard.html")
        print(f"    - runtime_log.txt")
    
    def _view_file_details(self):
        """View file details"""
        if not self._ensure_analysis():
            return
        
        print(f"\n{Colors.BOLD}=== VIEW FILE DETAILS ==={Colors.ENDC}\n")
        
        search = input(f"{Colors.OKCYAN}Enter file name or path: {Colors.ENDC}").strip()
        
        matches = [
            (path, data) for path, data in self.report.files.items()
            if search.lower() in path.lower()
        ]
        
        if not matches:
            print(f"{Colors.FAIL}❌ No matches found{Colors.ENDC}")
            return
        
        if len(matches) > 1:
            print(f"\n{Colors.WARNING}Multiple matches:{Colors.ENDC}")
            for i, (path, data) in enumerate(matches[:10], 1):
                print(f"{i}. {data['relative_path']}")
            
            choice = input(f"\n{Colors.OKCYAN}Select (1-{min(len(matches), 10)}): {Colors.ENDC}").strip()
            try:
                idx = int(choice) - 1
                if 0 <= idx < len(matches):
                    path, data = matches[idx]
                else:
                    return
            except:
                return
        else:
            path, data = matches[0]
        
        print(f"\n{Colors.BOLD}FILE DETAILS:{Colors.ENDC}")
        print(f"  Path: {data['relative_path']}")
        print(f"  Category: {data['category']}")
        print(f"  Size: {data['size']:,} bytes ({data['lines']:,} lines)")
        print(f"  Risk: {data['risk_level']}")
        print(f"  Recommendation: {data['recommendation']}")
        print(f"  Stability: {data['stability_score']:.1f}/10")
        print(f"  Dependents: {data['dependents_count']}")
        print(f"  Reasoning: {data['short_reason']}")
        print(f"  Last Modified: {data['last_modified_days']} days ago")
    
    def _create_archive(self):
        """Create safe archive"""
        if not self._ensure_analysis():
            return
        
        print(f"\n{Colors.BOLD}=== CREATE SAFE REFACTOR ARCHIVE ==={Colors.ENDC}\n")
        
        if not self.report.archive_candidates:
            print(f"{Colors.WARNING}⚠️  No files eligible for archiving{Colors.ENDC}")
            return
        
        # Show preview
        print(f"{Colors.OKGREEN}Archive Preview:{Colors.ENDC}")
        print(f"  Candidate Files: {len(self.report.archive_candidates)}")
        
        total_size = sum(
            self.report.files[f]['size'] 
            for f in self.report.archive_candidates
        )
        print(f"  Total Size: {total_size / 1024:.1f} KB")
        
        print(f"\n{Colors.WARNING}⚠️ SAFETY NOTICE:{Colors.ENDC}")
        print(f"  • This will NOT modify or delete your source files")
        print(f"  • Archive will create COPIES only")
        print(f"  • Archive stored in: {self.platform.report_folder / 'archives'}")
        print(f"  • You must review the analysis before proceeding")
        
        confirm = input(f"\n{Colors.OKCYAN}Proceed with safe archive creation? (y/N): {Colors.ENDC}").strip().lower()
        
        if confirm != 'y':
            print(f"{Colors.WARNING}Archive creation cancelled{Colors.ENDC}")
            return
        
        # Re-evaluate eligibility
        print(f"\n{Colors.OKCYAN}Re-evaluating archive candidates...{Colors.ENDC}")
        
        archive_engine = ArchiveDecisionEngine(self.platform.files, self.platform.logger)
        verified_candidates = []
        
        for file_path in self.report.archive_candidates:
            meta = self.platform.files[file_path]
            decision = archive_engine.evaluate_archive_candidate(meta)
            if decision.allowed and decision.decision == Recommendation.SAFE_TO_ARCHIVE:
                verified_candidates.append(file_path)
        
        if not verified_candidates:
            print(f"{Colors.FAIL}❌ No files passed re-verification{Colors.ENDC}")
            return
        
        print(f"{Colors.OKGREEN}✓ {len(verified_candidates)} files verified for archival{Colors.ENDC}")
        
        # Create archive
        builder = ArchiveBuilder(
            str(self.platform.project_path),
            self.platform.report_folder,
            self.platform.files,
            self.platform.logger
        )
        
        archive_path = builder.create_safe_archive(verified_candidates, keep_temp=False)
        
        if archive_path:
            print(f"\n{Colors.OKGREEN}✓ Archive created successfully{Colors.ENDC}")
            print(f"  Location: {archive_path}")
            print(f"  Files archived: {len(verified_candidates)}")
            print(f"\n{Colors.BOLD}⚠️  NO SOURCE FILES WERE MODIFIED OR DELETED{Colors.ENDC}")
    
    def _open_dashboard(self):
        """Open HTML dashboard"""
        if not self._ensure_analysis():
            return
        
        dashboard_path = self.platform.report_folder / 'optimization_dashboard.html'
        
        if dashboard_path.exists():
            print(f"\n{Colors.OKGREEN}✓ Dashboard location:{Colors.ENDC}")
            print(f"  {dashboard_path}")
            print(f"\n  Open this file in your browser to view the interactive dashboard.")
        else:
            print(f"{Colors.FAIL}❌ Dashboard not found{Colors.ENDC}")

# ============================================================================
# ENTRY POINT
# ============================================================================

def main():
    """Main entry point"""
    import sys
    
    if len(sys.argv) < 2:
        print(f"{Colors.FAIL}Usage: python analyzer.py <project_path> [scope_path]{Colors.ENDC}")
        sys.exit(1)
    
    project_path = sys.argv[1]
    scope_path = sys.argv[2] if len(sys.argv) > 2 else None
    
    if not Path(project_path).exists():
        print(f"{Colors.FAIL}❌ Error: Path does not exist: {project_path}{Colors.ENDC}")
        sys.exit(1)
    
    platform = CodeIntelligencePlatform(project_path, scope_path)
    cli = InteractiveCLI(platform)
    cli.run()

if __name__ == '__main__':
    main()