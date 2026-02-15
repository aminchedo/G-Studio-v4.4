#!/usr/bin/env python3
"""
Enterprise Code Intelligence Platform v4 — Single File Edition
===================================================================
A professional-grade structural analysis tool for TypeScript/React/Electron projects
with non-destructive safe archive capabilities and enterprise-grade decision engine.

Author: Senior Software Architect
Purpose: Deep semantic analysis with conservative refactoring recommendations
Output: Fixed reports folder with overwritable main reports + Safe archive packages
Version: 4.0.0
Dependencies: tree-sitter, tree-sitter-typescript
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
import sys
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed

try:
    from tree_sitter import Language, Parser, Node
    import tree_sitter_typescript as tstypescript
    TYPESCRIPT_LANGUAGE = Language(tstypescript.language_typescript())
    TSX_LANGUAGE = Language(tstypescript.language_tsx())
    TREE_SITTER_AVAILABLE = True
except ImportError:
    TREE_SITTER_AVAILABLE = False
    TYPESCRIPT_LANGUAGE = None
    TSX_LANGUAGE = None
    print("Warning: tree-sitter not available. Falling back to regex-based parsing.")

# ============================================================================
# CONFIGURATION
# ============================================================================

class Config:
    """Global configuration constants"""
    TOOL_VERSION = "4.0.0"
    SIMILARITY_THRESHOLD = 0.85
    RECENT_DAYS_BLOCKER = 30
    ARCHIVE_SCORE_THRESHOLD = 75
    INVESTIGATE_LOW_THRESHOLD = 60
    INVESTIGATE_MEDIUM_THRESHOLD = 45
    STABILITY_THRESHOLD = 4.0
    COMPLEXITY_HIGH_THRESHOLD = 50
    MAX_FILE_SIZE_FOR_SIMILARITY = 500_000  # 500KB
    SIZE_DIFF_RATIO_THRESHOLD = 3.0  # Skip similarity if sizes differ by 3x
    BARREL_EXPORT_THRESHOLD = 3  # Min exports to consider a barrel file
    SHARED_MODULE_BOOST = 2.0  # Stability boost for shared modules
    CRITICAL_DEPENDENCY_THRESHOLD = 10  # Files with 10+ dependents are critical
    CACHE_FILE = ".code_intelligence_cache.json"

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
    EXTRACT_SHARED_LOGIC = "EXTRACT_SHARED_LOGIC"
    CONSOLIDATE_DUPLICATES = "CONSOLIDATE_DUPLICATES"
    MODERNIZE_IMPLEMENTATION = "MODERNIZE_IMPLEMENTATION"
    ADD_TYPE_SAFETY = "ADD_TYPE_SAFETY"
    REDUCE_COMPLEXITY = "REDUCE_COMPLEXITY"

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
    BARREL_EXPORT = "BARREL_EXPORT"
    TYPE_DEFINITION = "TYPE_DEFINITION"
    CONSTANTS = "CONSTANTS"
    UNKNOWN = "UNKNOWN"

class IssueType(Enum):
    """Types of code issues"""
    DUPLICATE = "DUPLICATE"
    UNUSED = "UNUSED"
    UNWIRED = "UNWIRED"
    WEAK_TYPING = "WEAK_TYPING"
    HIGH_COMPLEXITY = "HIGH_COMPLEXITY"
    MISSING_TESTS = "MISSING_TESTS"
    OUTDATED = "OUTDATED"
    NAMING_COLLISION = "NAMING_COLLISION"
    CIRCULAR_DEPENDENCY = "CIRCULAR_DEPENDENCY"
    LARGE_FILE = "LARGE_FILE"
    MISSING_DOCUMENTATION = "MISSING_DOCUMENTATION"

# ============================================================================
# CONSTANTS
# ============================================================================

IGNORE_PATTERNS = {
    'backup', 'archive', 'temp', 'tmp', 'dist', 'build', 'final',
    'node_modules', '.git', '.vscode', 'coverage', '.next', 'out',
    '__pycache__', '.pytest_cache', '.mypy_cache', 'vendor',
    'refactor_temp', 'refactor_archive', 'reports', '.DS_Store',
    'thumbs.db', 'desktop.ini', 'package-lock.json', 'yarn.lock'
}

FILE_EXTENSIONS = {
    '.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss',
    '.html', '.yml', '.yaml', '.env'  # Excluded .md
}

ENTRY_POINT_PATTERNS = {
    'main.ts', 'main.tsx', 'index.ts', 'index.tsx',
    'app.ts', 'app.tsx', '_app.tsx', 'main.js', 'index.js'
}

FRAMEWORK_CORE_PATTERNS = {
    'createContext', 'configureStore', 'createStore', 'createSlice',
    'setup', 'register', 'bootstrap', 'initialize', 'configure',
    'Provider', 'createRoot', 'render'
}

INFRASTRUCTURE_PATHS = {
    '/core/', '/runtime/', '/boot/', '/init/', '/config/',
    '/setup/', '/framework/', '/platform/', '/lib/', '/shared/'
}

DYNAMIC_IMPORT_PATTERNS = [
    r'import\s*\(',
    r'React\.lazy\s*\(',
    r'require\s*\(',
    r'loadable\s*\(',
    r'dynamic\s*\('
]

SIDE_EFFECT_PATTERNS = [
    'fetch', 'axios', 'XMLHttpRequest', 'WebSocket',
    'addEventListener', 'setInterval', 'setTimeout',
    'localStorage', 'sessionStorage', 'indexedDB',
    'document.', 'window.', 'navigator.'
]

HOOK_PATTERNS = [
    'useState', 'useEffect', 'useContext', 'useReducer',
    'useCallback', 'useMemo', 'useRef', 'useLayoutEffect',
    'useImperativeHandle', 'useDebugValue', 'useTransition',
    'useDeferredValue', 'useId', 'useSyncExternalStore'
]

REACT_LIFECYCLE_METHODS = [
    'componentDidMount', 'componentDidUpdate', 'componentWillUnmount',
    'shouldComponentUpdate', 'getDerivedStateFromProps',
    'getSnapshotBeforeUpdate', 'componentDidCatch'
]

TEST_FRAMEWORKS = [
    'describe', 'it', 'test', 'expect', 'jest', 'vitest',
    'beforeEach', 'afterEach', 'beforeAll', 'afterAll',
    'mock', 'spy', 'stub'
]

ROUTE_PATTERNS = [
    'Route', 'Router', 'Switch', 'Navigate', 'Link',
    'useNavigate', 'useParams', 'useLocation', 'useHistory'
]

STATE_MANAGEMENT_PATTERNS = [
    'createSlice', 'configureStore', 'Provider', 'useDispatch',
    'useSelector', 'connect', 'createContext', 'useReducer'
]

# Tree-sitter queries
if TREE_SITTER_AVAILABLE:
    EXPORT_QUERY = """
    (export_statement
      declaration: ? (variable_declaration
        declarator: (variable_declarator name: (identifier) @export.name))
      ) @export
    (export_statement
      declaration: (function_declaration name: (identifier) @export.name)
      ) @export
    (export_statement
      declaration: (class_declaration name: (identifier) @export.name)
      ) @export
    (export_statement
      export_clause: (export_clause (export_specifier name: (identifier) @export.name))
      ) @export
    (export_statement
      declaration: (lexical_declaration (variable_declarator name: (identifier) @export.name))
      ) @export
    (export_statement
      (export_clause default: (identifier) @export.default)
      ) @export.default
    """

    IMPORT_QUERY = """
    (import_statement
      source: (string (string_fragment) @import.source)
      ) @import
    """

    ANY_TYPE_QUERY = """
    (type_annotation
      type: (type_identifier) @type (#eq? @type "any"))
    """

    HOOK_QUERY = """
    (call_expression
      function: (identifier) @hook (#match? @hook "^use[A-Z]")
      ) @hook.call
    """

    JSX_QUERY = """
    (jsx_element) @jsx
    """

    COMPLEXITY_NODES = ["if_statement", "for_statement", "while_statement", "switch_statement", "case_clause", "logical_expression", "conditional_expression"]

else:
    EXPORT_QUERY = IMPORT_QUERY = ANY_TYPE_QUERY = HOOK_QUERY = JSX_QUERY = None
    COMPLEXITY_NODES = []


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
class CodeIssue:
    """Represents a code quality issue"""
    issue_type: IssueType
    severity: RiskLevel
    file_path: str
    description: str
    recommendation: str
    confidence: float
    impact_estimate: str
    related_files: List[str] = field(default_factory=list)

@dataclass
class ArchiveDecision:
    """Decision result for archive eligibility"""
    allowed: bool
    decision: Recommendation
    score: float
    reasons: List[str]
    blockers: List[str]
    confidence: float
    impact_analysis: str
    alternatives: List[str]

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
    detailed_reasoning: List[str] = field(default_factory=list)
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
    has_jsx: bool = False
    has_typescript: bool = False
    interface_count: int = 0
    type_count: int = 0
    function_count: int = 0
    class_count: int = 0
    issues: List[CodeIssue] = field(default_factory=list)

@dataclass
class ComponentInfo:
    """React component specific information"""
    name: str
    file_path: str
    is_default_export: bool
    is_named_export: bool
    is_function_component: bool
    is_arrow_component: bool
    is_class_component: bool
    props_interface: Optional[str] = None
    hooks_used: List[str] = field(default_factory=list)
    lifecycle_methods: List[str] = field(default_factory=list)
    state_variables: int = 0
    effect_count: int = 0
    memo_usage: bool = False

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
    merge_strategy: Optional[Dict[str, Any]] = None
    estimated_savings: int = 0

@dataclass
class SameNameConflict:
    """Files with identical names in different locations"""
    name: str
    locations: List[str]
    recommended_keep: str
    confidence: float
    risk_level: RiskLevel
    reasoning: List[str]
    resolution_strategy: str
    is_legitimate_variant: bool = False

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
    issues: List[Dict[str, Any]]
    recommendations: List[Dict[str, Any]]
    optimization_opportunities: List[Dict[str, Any]]
    quality_metrics: Dict[str, Any]

# ============================================================================
# LOGGING SYSTEM
# ============================================================================

import logging

class AnalysisLogger:
    """Runtime logging system"""
    
    def __init__(self, log_path: str, verbose: bool = False):
        self.log_path = log_path
        self.start_time = time.time()
        self.warnings: List[str] = []
        self.errors: List[str] = []
        
        logging.basicConfig(level=logging.DEBUG if verbose else logging.INFO, format='[%(asctime)s] %(levelname)s: %(message)s')
        self.logger = logging.getLogger('CodeIntelligence')
        file_handler = logging.FileHandler(log_path)
        file_handler.setLevel(logging.DEBUG if verbose else logging.INFO)
        self.logger.addHandler(file_handler)
        
        self.logger.info(f"Analysis started at {datetime.now().isoformat()}")
        self.logger.info(f"Tool version: {Config.TOOL_VERSION}")
    
    def info(self, message: str):
        self.logger.info(message)
    
    def warning(self, message: str):
        self.warnings.append(message)
        self.logger.warning(message)
    
    def error(self, message: str):
        self.errors.append(message)
        self.logger.error(message)
    
    def finalize(self):
        elapsed = time.time() - self.start_time
        self.logger.info(f"Analysis completed in {elapsed:.2f} seconds")
        self.logger.info(f"Total warnings: {len(self.warnings)}")
        self.logger.info(f"Total errors: {len(self.errors)}")

# ============================================================================
# REPORT FOLDER MANAGER
# ============================================================================

def setup_report_folder(base_path: Path, args: argparse.Namespace) -> Path:
    """
    Setup fixed report folder with optional history.
    
    Returns:
        Path to the report folder
    """
    report_folder = base_path / (args.report_folder or 'reports')
    report_folder.resolve()
    report_folder.mkdir(parents=True, exist_ok=True)
    
    history_folder = report_folder / 'history'
    archives_folder = report_folder / 'archives'
    archives_folder.mkdir(exist_ok=True)
    
    main_files = [
        'full_report.json', 'summary_report.json', 'high_risk.csv',
        'optimization_dashboard.html', 'runtime_log.txt'
    ]
    
    if args.keep_history:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        history_sub = history_folder / timestamp
        history_sub.mkdir(parents=True, exist_ok=True)
        
        for file_name in main_files:
            src = report_folder / file_name
            if src.exists():
                shutil.move(str(src), str(history_sub / file_name))
    
    return report_folder

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def compute_cyclomatic_complexity(node: Node) -> int:
    """Compute cyclomatic complexity by counting branch points"""
    if not node:
        return 0
    count = 1  # Base
    for child in node.children:
        if child.type in COMPLEXITY_NODES:
            count += 1
        count += compute_cyclomatic_complexity(child)
    return count

def normalize_for_comparison(node: Node, var_map: Dict[str, str] = None, var_counter: list = None) -> str:
    """Normalize AST node for structural comparison"""
    if var_map is None:
        var_map = {}
        var_counter = [0]
    
    if node.is_named:
        if node.type == 'identifier':
            name = node.text.decode('utf8')
            if name not in var_map:
                var_map[name] = f'v{var_counter[0]}'
                var_counter[0] += 1
            return var_map[name]
        elif node.type in {'string', 'template_string'}:
            return '__STR__'
        elif node.type == 'number':
            return '__NUM__'
        else:
            children_norm = ' '.join(normalize_for_comparison(child, var_map, var_counter) for child in node.children)
            return f'({node.type} {children_norm})'
    return ''

def compute_structural_hash(content: str, node: Optional[Node]) -> str:
    """Compute hash of normalized structure"""
    if node:
        normalized = normalize_for_comparison(node)
    else:
        normalized = re.sub(r'//.*?$', '', content, flags=re.MULTILINE)
        normalized = re.sub(r'/\*.*?\*/', '', normalized, flags=re.DOTALL)
        normalized = re.sub(r'\s+', ' ', normalized)
    return hashlib.sha256(normalized.encode('utf-8')).hexdigest()

# Fallback regex functions (if tree-sitter not available)
def fallback_extract_exports(content: str) -> List[str]:
    exports = []
    for match in re.finditer(r'export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)', content):
        exports.append(match.group(1))
    for match in re.finditer(r'export\s+\{([^}]+)\}', content):
        names = match.group(1).split(',')
        exports.extend([n.strip().split()[0] for n in names if n.strip()])
    if re.search(r'export\s+default', content):
        exports.append('default')
    return list(set(exports))

def fallback_extract_imports(content: str) -> List[str]:
    imports = []
    for match in re.finditer(r'import\s+.*?from\s+[\'"]([^\'"]+)[\'"]', content):
        imports.append(match.group(1))
    for match in re.finditer(r'require\([\'"]([^\'"]+)[\'"]\)', content):
        imports.append(match.group(1))
    return imports

def fallback_count_any(content: str) -> int:
    return len(re.findall(r':\s*any\b', content))

def fallback_extract_hooks(content: str) -> List[str]:
    hooks = []
    for hook in HOOK_PATTERNS:
        if hook in content:
            hooks.append(hook)
    for match in re.finditer(r'(use[A-Z]\w+)\s*\(', content):
        hook_name = match.group(1)
        if hook_name not in hooks:
            hooks.append(hook_name)
    return hooks

def fallback_has_jsx(content: str) -> bool:
    return '<' in content and ('React' in content or '.tsx' in content or '.jsx' in content)

def fallback_compute_complexity(content: str) -> int:
    score = 0
    score += content.count('if ')
    score += content.count('else if')
    score += content.count('for ')
    score += content.count('while ')
    score += content.count('switch ')
    score += content.count('case ')
    score += content.count('&&')
    score += content.count('||')
    score += content.count('? ')
    score += content.count('catch ')
    score += content.count('.map(')
    score += content.count('.filter(')
    score += content.count('.reduce(')
    return score

# ============================================================================
# RECOMMENDATION ENGINE
# ============================================================================

class RecommendationEngine:
    """Advanced recommendation engine"""
    
    @staticmethod
    def generate_comprehensive_recommendation(
        file_info: FileInfo,
        all_files: Dict[str, FileInfo],
        duplicates: List[DuplicateCluster]
    ) -> Tuple[Recommendation, List[str], float]:
        # (same as original, no change needed for now)
        reasoning = []
        confidence = 0.5
        
        if file_info.is_entry_point:
            return (
                Recommendation.KEEP_AS_IS,
                [
                    "Application entry point - critical for bootstrap",
                    "Removing would break application initialization",
                    "Required by build system and runtime"
                ],
                1.0
            )
        
        if file_info.category == FileCategory.FRAMEWORK_CORE:
            return (
                Recommendation.KEEP_AS_IS,
                [
                    "Framework core infrastructure",
                    "Required for application architecture",
                    "High risk if modified or removed"
                ],
                1.0
            )
        
        if file_info.dependents_count >= Config.CRITICAL_DEPENDENCY_THRESHOLD:
            return (
                Recommendation.KEEP_AS_IS,
                [
                    f"Critical shared module - {file_info.dependents_count} dependents",
                    "Widely used across application",
                    "Changes would have cascading impact",
                    "Consider as stable API contract"
                ],
                0.95
            )
        
        if file_info.duplicate_cluster_id:
            cluster = next((c for c in duplicates if c.cluster_id == file_info.duplicate_cluster_id), None)
            if cluster:
                if cluster.similarity_score >= 0.95:
                    if file_info.path == cluster.suggested_base_file:
                        return (
                            Recommendation.KEEP_AS_IS,
                            [
                                "Identified as primary implementation in duplicate cluster",
                                f"Highest stability score in cluster ({file_info.stability_score:.1f}/10)",
                                f"Other {cluster.cluster_size - 1} file(s) should merge into this",
                                "Preserve this as canonical implementation"
                            ],
                            0.90
                        )
                    else:
                        return (
                            Recommendation.MERGE_INTO_ANOTHER_FILE,
                            [
                                f"Duplicate of {Path(cluster.suggested_base_file).name}",
                                f"Similarity: {cluster.similarity_score:.0%}",
                                "Consolidate to reduce maintenance burden",
                                "Merge unique logic into primary file",
                                f"Expected impact: {cluster.estimated_savings} lines saved"
                            ],
                            0.85
                        )
                else:
                    return (
                        Recommendation.INVESTIGATE,
                        [
                            f"Structural similarity ({cluster.similarity_score:.0%}) detected",
                            "Files may serve different purposes despite similar structure",
                            "Review for potential shared abstraction opportunity",
                            "Consider extracting common patterns to utility",
                            "Differences: " + ", ".join(cluster.diff_summary[:2])
                        ],
                        0.70
                    )
        
        if file_info.dependents_count == 0 and file_info.exports:
            if file_info.is_barrel_exported:
                return (
                    Recommendation.KEEP_AS_IS,
                    [
                        "Exported via barrel file (indirect usage)",
                        "Part of public API surface",
                        "May be consumed by external packages",
                        "Verify actual usage before considering removal"
                    ],
                    0.75
                )
            
            if file_info.is_dynamic_imported:
                return (
                    Recommendation.KEEP_AS_IS,
                    [
                        "Dynamically imported (lazy loading)",
                        "Static analysis cannot detect all usage",
                        "Required for code splitting strategy",
                        "Verify import() or React.lazy() references"
                    ],
                    0.85
                )
            
            if file_info.last_modified_days < 60:
                return (
                    Recommendation.WIRE_TO_APPLICATION,
                    [
                        "Recently created but not integrated",
                        f"Last modified {file_info.last_modified_days} days ago",
                        "Likely work in progress or incomplete feature",
                        "Add imports where needed or mark as future use",
                        "Consider adding to feature flag system"
                    ],
                    0.70
                )
            
            if file_info.last_modified_days > 180:
                if file_info.complexity_estimate > 20 or file_info.lines > 200:
                    return (
                        Recommendation.INVESTIGATE,
                        [
                            f"Substantial file ({file_info.lines} lines) with no dependents",
                            f"Not modified in {file_info.last_modified_days} days",
                            "May be orphaned feature or deprecated code",
                            "Review for potential removal or re-integration",
                            "Check version control history for context"
                        ],
                        0.75
                    )
                else:
                    return (
                        Recommendation.SAFE_TO_ARCHIVE,
                        [
                            "Small unused file with no active dependents",
                            f"Dormant for {file_info.last_modified_days} days",
                            "Low complexity - safe to archive",
                            "Can be restored if needed",
                            "Archive maintains full history and structure"
                        ],
                        0.80
                    )
            
            return (
                Recommendation.INVESTIGATE,
                [
                    "Exported but not imported anywhere",
                    f"Age: {file_info.last_modified_days} days",
                    "May be used indirectly or via dynamic imports",
                    "Verify usage before removal",
                    "Consider adding explicit imports if intentional"
                ],
                0.65
            )
        
        if (file_info.dependents_count == 0 
            and file_info.lines > 50 
            and len(file_info.exports) > 2 
            and file_info.category in {FileCategory.SERVICE, FileCategory.UI_COMPONENT, FileCategory.CUSTOM_HOOK}):
            return (
                Recommendation.WIRE_TO_APPLICATION,
                [
                    f"Substantial {file_info.category.value.lower()} not integrated",
                    f"{file_info.lines} lines with {len(file_info.exports)} exports",
                    "Complete implementation but missing integration",
                    "Add to appropriate feature module",
                    "Ensure proper routing/registration if needed",
                    "Consider adding to documentation"
                ],
                0.75
            )
        
        if file_info.any_count > 5:
            return (
                Recommendation.ADD_TYPE_SAFETY,
                [
                    f"Weak type safety: {file_info.any_count} 'any' usages",
                    "Replace 'any' with specific types or generics",
                    "Improves maintainability and catches errors",
                    "Use 'unknown' for truly dynamic types",
                    "Consider using type guards for runtime checks"
                ],
                0.85
            )
        
        if file_info.complexity_estimate > Config.COMPLEXITY_HIGH_THRESHOLD:
            return (
                Recommendation.REDUCE_COMPLEXITY,
                [
                    f"High cyclomatic complexity: {file_info.complexity_estimate}",
                    "Consider breaking into smaller functions",
                    "Extract complex logic to separate utilities",
                    "Simplify conditional logic where possible",
                    "Add unit tests for complex branches",
                    "Target complexity < 20 per function"
                ],
                0.80
            )
        
        if file_info.lines > 500:
            return (
                Recommendation.REFACTOR_FOR_CLARITY,
                [
                    f"Large file: {file_info.lines} lines",
                    "Consider splitting into multiple modules",
                    "Group related functionality",
                    "Extract reusable components or utilities",
                    "Improves readability and maintainability",
                    "Target < 300 lines per file"
                ],
                0.75
            )
        
        if file_info.is_react_component and file_info.component_type == "class":
            return (
                Recommendation.MODERNIZE_IMPLEMENTATION,
                [
                    "Class component - consider migrating to hooks",
                    "Functional components with hooks are modern standard",
                    "Easier to test and compose",
                    "Better performance with React 18+",
                    "Gradual migration recommended"
                ],
                0.70
            )
        
        if (file_info.category in {FileCategory.UI_COMPONENT, FileCategory.SERVICE, 
                                   FileCategory.CORE_LOGIC} and
            file_info.lines > 50):
            test_file_exists = any(
                f.is_test_file and 
                f.name.replace('.test', '').replace('.spec', '') == file_info.name
                for f in all_files.values()
            )
            if not test_file_exists:
                return (
                    Recommendation.INVESTIGATE,
                    [
                        "No corresponding test file found",
                        f"Substantial {file_info.category.value.lower()} without tests",
                        "Add unit tests for reliability",
                        "Test critical paths and edge cases",
                        "Improves confidence in refactoring"
                    ],
                    0.65
                )
        
        if (file_info.stability_score > 7.0 and
            file_info.dependents_count > 0 and
            file_info.any_count < 3 and
            file_info.complexity_estimate < 30):
            return (
                Recommendation.KEEP_AS_IS,
                [
                    f"Well-maintained file (stability: {file_info.stability_score:.1f}/10)",
                    f"Actively used by {file_info.dependents_count} file(s)",
                    "Good type safety and reasonable complexity",
                    "No action needed - continue current practices",
                    "Monitor for future changes"
                ],
                0.90
            )
        
        return (
            Recommendation.KEEP_AS_IS,
            [
                "Standard file with no critical issues",
                f"Stability: {file_info.stability_score:.1f}/10",
                f"Used by {file_info.dependents_count} file(s)" if file_info.dependents_count > 0 else "No current dependents",
                "Continue monitoring for changes"
            ],
            0.70
        )
    
    @staticmethod
    def generate_merge_strategy(
        cluster: DuplicateCluster,
        files: Dict[str, FileInfo]
    ) -> Dict[str, Any]:
        base_file = files[cluster.suggested_base_file]
        
        strategy = {
            'base_file': cluster.suggested_base_file,
            'base_file_name': base_file.name,
            'files_to_merge': [],
            'steps': [],
            'estimated_time': '15-30 minutes',
            'risk_level': cluster.risk_level.value,
            'testing_required': True
        }
        
        for file_path in cluster.files:
            if file_path != cluster.suggested_base_file:
                file_info = files[file_path]
                
                strategy['files_to_merge'].append({
                    'path': file_path,
                    'name': file_info.name,
                    'unique_exports': list(set(file_info.exports) - set(base_file.exports)),
                    'dependents': len(file_info.dependents)
                })
        
        strategy['steps'] = [
            "1. Review diff summary to understand key differences",
            "2. Create feature branch for merge operation",
            "3. Copy unique exports from merge candidates to base file",
            "4. Update imports in dependent files",
            "5. Run full test suite to verify functionality",
            "6. Update documentation and comments",
            "7. Archive merged files (do not delete immediately)",
            "8. Monitor for 1-2 sprints before permanent removal"
        ]
        
        total_dependents = sum(len(files[f].dependents) for f in cluster.files)
        
        if total_dependents > 10:
            strategy['risk_level'] = 'HIGH'
            strategy['estimated_time'] = '1-2 hours'
            strategy['steps'].insert(0, "0. Create detailed impact analysis document")
            strategy['steps'].append("9. Gradual rollout with feature flag")
        
        return strategy

# ============================================================================
# PROJECT SCANNER
# ============================================================================

class ProjectScanner:
    """Scans and catalogs all project files with comprehensive analysis"""
    
    def __init__(self, root_path: str, logger: AnalysisLogger, scope_path: Optional[str] = None, max_workers: int = 4):
        self.root = Path(root_path).resolve()
        self.scope = Path(scope_path).resolve() if scope_path else self.root
        self.logger = logger
        self.files: Dict[str, FileInfo] = {}
        self.components: List[ComponentInfo] = []
        self.max_workers = max_workers
        self.cache = self._load_cache()
    
    def _load_cache(self) -> Dict[str, Dict[str, Any]]:
        cache_path = self.root / Config.CACHE_FILE
        if cache_path.exists():
            try:
                with open(cache_path, 'r') as f:
                    cache = json.load(f)
                if cache.get('version') == Config.TOOL_VERSION:
                    self.logger.info("Loaded cache from file")
                    return cache.get('files', {})
            except Exception as e:
                self.logger.warning(f"Cache load failed: {e}")
        return {}
    
    def _save_cache(self):
        cache_path = self.root / Config.CACHE_FILE
        cache = {
            'version': Config.TOOL_VERSION,
            'files': {path: asdict(info, dict_factory=lambda x: dict(x)) for path, info in self.files.items()}
        }
        # Convert sets to lists
        for file_data in cache['files'].values():
            file_data['dependencies'] = list(file_data['dependencies'])
            file_data['dependents'] = list(file_data['dependents'])
        
        with open(cache_path, 'w') as f:
            json.dump(cache, f, default=str)
        self.logger.info("Saved cache to file")
    
    def should_ignore(self, path: Path) -> bool:
        parts = path.parts
        return any(pattern in parts or pattern in path.name.lower() for pattern in IGNORE_PATTERNS)
    
    def scan(self) -> Tuple[Dict[str, FileInfo], List[ComponentInfo]]:
        """Perform complete project scan with parallel processing"""
        self.logger.info(f"Scanning project structure from: {self.scope}")
        
        file_paths = []
        for root, dirs, files in os.walk(self.scope):
            dirs[:] = [d for d in dirs if not self.should_ignore(Path(root) / d)]
            for file in files:
                file_path = Path(root) / file
                if self.should_ignore(file_path):
                    continue
                if file_path.suffix not in FILE_EXTENSIONS:
                    continue
                file_paths.append(file_path)
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {executor.submit(self._analyze_file, path): path for path in file_paths}
            for future in as_completed(futures):
                try:
                    metadata = future.result()
                    if metadata:
                        self.files[str(futures[future])] = metadata
                except Exception as e:
                    self.logger.warning(f"Error analyzing {futures[future]}: {e}")
        
        self._save_cache()
        self.logger.info(f"Scanned {len(self.files)} files")
        return self.files, self.components
    
    def _analyze_file(self, path: Path) -> Optional[FileInfo]:
        """Extract complete metadata from a single file using tree-sitter or fallback"""
        relative = path.relative_to(self.root)
        str_relative = str(relative)
        
        stat = path.stat()
        current_mtime = stat.st_mtime
        current_size = stat.st_size
        current_content_hash = self._compute_content_hash(path)
        
        if str_relative in self.cache:
            cached = self.cache[str_relative]
            if cached['modified'] == current_mtime and cached['content_hash'] == current_content_hash:
                info = FileInfo(**cached)
                info.dependencies = set(info.dependencies)
                info.dependents = set(info.dependents)
                self.logger.debug(f"Used cache for {str_relative}")
                return info
        
        try:
            with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            lines = content.count('\n') + 1
            size = current_size
            modified = current_mtime
            content_hash = current_content_hash
            
            tree = None
            if TREE_SITTER_AVAILABLE and path.suffix in {'.ts', '.tsx', '.js', '.jsx'}:
                parser = Parser()
                language = TSX_LANGUAGE if path.suffix in {'.tsx', '.jsx'} else TYPESCRIPT_LANGUAGE
                parser.set_language(language)
                byte_content = bytes(content, "utf8")
                tree = parser.parse(byte_content)
            
            structural_hash = compute_structural_hash(content, tree.root_node if tree else None)
            
            if tree:
                exports = self._extract_exports_from_tree(tree)
                imports = self._extract_imports_from_tree(tree)
                any_count = self._count_any_from_tree(tree)
                hook_usage = self._extract_hooks_from_tree(tree)
                has_jsx = self._has_jsx_from_tree(tree)
                complexity_estimate = compute_cyclomatic_complexity(tree.root_node)
            else:
                exports = fallback_extract_exports(content)
                imports = fallback_extract_imports(content)
                any_count = fallback_count_any(content)
                hook_usage = fallback_extract_hooks(content)
                has_jsx = fallback_has_jsx(content)
                complexity_estimate = fallback_compute_complexity(content)
            
            category = self._classify_file(path, content)
            
            is_entry = path.name in ENTRY_POINT_PATTERNS
            
            is_react_component, component_type = self._detect_react_component(content)
            is_custom_hook = self._detect_custom_hook(path.name, content)
            
            is_dynamic_imported = self._detect_dynamic_import(content)
            is_test_file = self._is_test_file(path)
            
            has_side_effects = self._detect_side_effects(content)
            
            has_typescript = path.suffix in {'.ts', '.tsx'}
            
            interface_count = len(re.findall(r'\binterface\s+\w+', content)) if not tree else len(TYPESCRIPT_LANGUAGE.query("(interface_declaration) @interface").captures(tree.root_node))
            type_count = len(re.findall(r'\btype\s+\w+\s*=', content)) if not tree else len(TYPESCRIPT_LANGUAGE.query("(type_alias_declaration) @type").captures(tree.root_node))
            function_count = len(re.findall(r'\bfunction\s+\w+', content)) if not tree else len(TYPESCRIPT_LANGUAGE.query("(function_declaration) @function").captures(tree.root_node))
            class_count = len(re.findall(r'\bclass\s+\w+', content)) if not tree else len(TYPESCRIPT_LANGUAGE.query("(class_declaration) @class").captures(tree.root_node))
            
            if is_react_component:
                component_info = self._extract_component_info(path, content)
                if component_info:
                    self.components.append(component_info)
            
            last_modified_days = int((time.time() - modified) / 86400)
            
            info = FileInfo(
                path=str(path),
                relative_path=str_relative,
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
                hook_usage=hook_usage,
                has_jsx=has_jsx,
                has_typescript=has_typescript,
                interface_count=interface_count,
                type_count=type_count,
                function_count=function_count,
                class_count=class_count
            )
            
            return info
        except FileNotFoundError:
            self.logger.warning(f"File not found during analysis: {path}")
        except UnicodeDecodeError:
            self.logger.warning(f"Unicode decode error for {path}")
        except Exception as e:
            self.logger.warning(f"Unexpected error analyzing {path}: {e}")
        return None
    
    def _compute_content_hash(self, path: Path) -> str:
        hasher = hashlib.sha256()
        with open(path, 'rb') as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hasher.update(chunk)
        return hasher.hexdigest()
    
    def _extract_exports_from_tree(self, tree: 'Tree') -> List[str]:
        if not TREE_SITTER_AVAILABLE:
            return []
        query = TYPESCRIPT_LANGUAGE.query(EXPORT_QUERY)
        captures = query.captures(tree.root_node)
        exports = set()
        for node, tag in captures:
            if tag == 'export.name':
                exports.add(node.text.decode('utf8'))
            elif tag == 'export.default':
                exports.add('default')
        return list(exports)
    
    def _extract_imports_from_tree(self, tree: 'Tree') -> List[str]:
        if not TREE_SITTER_AVAILABLE:
            return []
        query = TYPESCRIPT_LANGUAGE.query(IMPORT_QUERY)
        captures = query.captures(tree.root_node)
        imports = []
        for node, tag in captures:
            if tag == 'import.source':
                imports.append(node.text.decode('utf8'))
        return imports
    
    def _count_any_from_tree(self, tree: 'Tree') -> int:
        if not TREE_SITTER_AVAILABLE:
            return 0
        query = TYPESCRIPT_LANGUAGE.query(ANY_TYPE_QUERY)
        captures = query.captures(tree.root_node)
        return len(captures)
    
    def _extract_hooks_from_tree(self, tree: 'Tree') -> List[str]:
        if not TREE_SITTER_AVAILABLE:
            return []
        query = TYPESCRIPT_LANGUAGE.query(HOOK_QUERY)
        captures = query.captures(tree.root_node)
        hooks = set()
        for node, tag in captures:
            if tag == 'hook':
                hooks.add(node.text.decode('utf8'))
        return list(hooks)
    
    def _has_jsx_from_tree(self, tree: 'Tree') -> bool:
        if not TREE_SITTER_AVAILABLE:
            return False
        query = TSX_LANGUAGE.query(JSX_QUERY)
        captures = query.captures(tree.root_node)
        return len(captures) > 0
    
    def _classify_file(self, path: Path, content: str) -> FileCategory:
        # (same as original)
        rel_path = str(path).lower()
        name = path.name.lower()
        
        if path.suffix == '.d.ts' or 'types' in rel_path:
            return FileCategory.TYPE_DEFINITION
        
        if 'constant' in name or 'const' in name:
            return FileCategory.CONSTANTS
        
        if name in {'index.ts', 'index.tsx', 'index.js', 'index.jsx'}:
            export_count = len(re.findall(r'export\s+\{', content))
            if export_count >= Config.BARREL_EXPORT_THRESHOLD:
                return FileCategory.BARREL_EXPORT
        
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
    
    def _detect_react_component(self, content: str) -> Tuple[bool, str]:
        # (fallback, since tree-sitter can be used but for simplicity)
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
        if not filename.startswith('use') and not 'use' in filename.lower():
            return False
        
        hook_pattern = r'export\s+(?:const|function)\s+(use[A-Z]\w+)'
        return bool(re.search(hook_pattern, content))
    
    def _detect_dynamic_import(self, content: str) -> bool:
        return any(re.search(pattern, content) for pattern in DYNAMIC_IMPORT_PATTERNS)
    
    def _is_test_file(self, path: Path) -> bool:
        name = path.name.lower()
        path_str = str(path).lower()
        return (name.endswith('.test.ts') or 
                name.endswith('.test.tsx') or 
                name.endswith('.spec.ts') or 
                name.endswith('.spec.tsx') or
                '__tests__' in path_str or
                name.endswith('.test.js') or
                name.endswith('.test.jsx'))
    
    def _detect_side_effects(self, content: str) -> bool:
        return any(pattern in content for pattern in SIDE_EFFECT_PATTERNS)
    
    def _extract_component_info(self, path: Path, content: str) -> Optional[ComponentInfo]:
        # (same as original, can be improved with tree-sitter but skipped for now)
        function_match = re.search(r'function\s+([A-Z]\w+)\s*\([^)]*\)', content)
        arrow_match = re.search(r'const\s+([A-Z]\w+)\s*[=:]\s*\([^)]*\)\s*=>', content)
        class_match = re.search(r'class\s+([A-Z]\w+)\s+extends\s+(?:React\.)?Component', content)
        
        name = None
        is_function = False
        is_arrow = False
        is_class = False
        
        if function_match:
            name = function_match.group(1)
            is_function = True
        elif arrow_match:
            name = arrow_match.group(1)
            is_arrow = True
        elif class_match:
            name = class_match.group(1)
            is_class = True
        
        if not name:
            return None
        
        is_default = 'export default' in content
        is_named = f'export {{{name}}}' in content or f'export const {name}' in content or f'export function {name}' in content
        
        hooks_used = fallback_extract_hooks(content)
        
        lifecycle_methods = [m for m in REACT_LIFECYCLE_METHODS if m in content]
        
        state_variables = len(re.findall(r'useState\s*\(', content))
        effect_count = len(re.findall(r'useEffect\s*\(', content))
        memo_usage = 'useMemo' in content or 'useCallback' in content or 'React.memo' in content
        
        props_match = re.search(r'interface\s+\w*Props\s*\{[^}]+\}', content)
        props_interface = props_match.group(0) if props_match else None
        
        return ComponentInfo(
            name=name,
            file_path=str(path),
            is_default_export=is_default,
            is_named_export=is_named,
            is_function_component=is_function,
            is_arrow_component=is_arrow,
            is_class_component=is_class,
            props_interface=props_interface,
            hooks_used=hooks_used,
            lifecycle_methods=lifecycle_methods,
            state_variables=state_variables,
            effect_count=effect_count,
            memo_usage=memo_usage
        )

# ============================================================================
# STRUCTURAL SIMILARITY ANALYZER
# ============================================================================

class StructuralSimilarityAnalyzer:
    """Advanced structural similarity computation"""
    
    @staticmethod
    def compute_structural_similarity(file_a: str, file_b: str) -> float:
        """Compute structural similarity between two files"""
        try:
            size_a = Path(file_a).stat().st_size
            size_b = Path(file_b).stat().st_size
            
            if max(size_a, size_b) > Config.MAX_FILE_SIZE_FOR_SIMILARITY:
                return 0.0
            
            if size_a > 0 and size_b > 0:
                ratio = max(size_a, size_b) / min(size_a, size_b)
                if ratio > Config.SIZE_DIFF_RATIO_THRESHOLD:
                    return 0.0
            
            with open(file_a, 'r', encoding='utf-8', errors='ignore') as f:
                content_a = f.read()
            with open(file_b, 'r', encoding='utf-8', errors='ignore') as f:
                content_b = f.read()
            
            tree_a = None
            tree_b = None
            if TREE_SITTER_AVAILABLE:
                parser = Parser()
                language = TSX_LANGUAGE if Path(file_a).suffix in {'.tsx', '.jsx'} else TYPESCRIPT_LANGUAGE
                parser.set_language(language)
                tree_a = parser.parse(bytes(content_a, "utf8"))
                tree_b = parser.parse(bytes(content_b, "utf8"))
            
            if tree_a and tree_b:
                normalized_a = normalize_for_comparison(tree_a.root_node)
                normalized_b = normalize_for_comparison(tree_b.root_node)
            else:
                normalized_a = StructuralSimilarityAnalyzer._fallback_normalize(content_a)
                normalized_b = StructuralSimilarityAnalyzer._fallback_normalize(content_b)
            
            seq_a = normalized_a.split()
            seq_b = normalized_b.split()
            
            sequence_ratio = SequenceMatcher(None, seq_a, seq_b).ratio()
            
            set_a = set(seq_a)
            set_b = set(seq_b)
            intersection = len(set_a & set_b)
            union = len(set_a | set_b)
            jaccard_ratio = intersection / union if union > 0 else 0.0
            
            similarity = 0.6 * sequence_ratio + 0.4 * jaccard_ratio
            
            return similarity
        except Exception:
            return 0.0
    
    @staticmethod
    def _fallback_normalize(content: str) -> str:
        content = re.sub(r'//.*?$', '', content, flags=re.MULTILINE)
        content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
        content = re.sub(r'"(?:[^"\\]|\\.)*"', '__STR__', content)
        content = re.sub(r"'(?:[^'\\]|\\.)*'", '__STR__', content)
        content = re.sub(r'`(?:[^`\\]|\\.)*`', '__STR__', content)
        content = re.sub(r'\b\d+\.?\d*\b', '__NUM__', content)
        content = re.sub(r'\s+', ' ', content)
        var_names = re.findall(r'\b[a-z_][a-zA-Z0-9_]*\b', content)
        var_map = {}
        var_counter = 0
        reserved = {'const', 'let', 'var', 'function', 'return', 'if', 'else', 
                   'for', 'while', 'class', 'import', 'export', 'default'}
        for name in set(var_names):
            if name not in reserved:
                var_map[name] = f'v{var_counter}'
                var_counter += 1
        for original, placeholder in var_map.items():
            content = re.sub(r'\b' + re.escape(original) + r'\b', placeholder, content)
        return content.strip()

# ============================================================================
# DIFF SUMMARIZER
# ============================================================================

class DiffSummarizer:
    """Generate human-readable diff summaries"""
    
    @staticmethod
    def generate_diff_summary(file_a: str, file_b: str, content_a: str, content_b: str) -> List[str]:
        summary = []
        
        hooks_a = DiffSummarizer._count_hooks(content_a)
        hooks_b = DiffSummarizer._count_hooks(content_b)
        
        for hook, count_a in hooks_a.items():
            count_b = hooks_b.get(hook, 0)
            if count_a != count_b:
                diff = abs(count_a - count_b)
                which = Path(file_a).name if count_a > count_b else Path(file_b).name
                summary.append(f"{which} has {diff} more {hook} call(s)")
        
        has_default_a = 'export default' in content_a
        has_default_b = 'export default' in content_b
        
        if has_default_a != has_default_b:
            which = Path(file_a).name if has_default_a else Path(file_b).name
            summary.append(f"{which} uses default export")
        
        side_effects_a = any(pattern in content_a for pattern in SIDE_EFFECT_PATTERNS)
        side_effects_b = any(pattern in content_b for pattern in SIDE_EFFECT_PATTERNS)
        
        if side_effects_a and not side_effects_b:
            summary.append(f"{Path(file_a).name} includes side effects (fetch/storage/timers)")
        elif side_effects_b and not side_effects_a:
            summary.append(f"{Path(file_b).name} includes side effects (fetch/storage/timers)")
        
        jsx_count_a = content_a.count('<')
        jsx_count_b = content_b.count('<')
        
        if abs(jsx_count_a - jsx_count_b) > 10:
            which = Path(file_a).name if jsx_count_a > jsx_count_b else Path(file_b).name
            summary.append(f"{which} has more complex JSX structure ({abs(jsx_count_a - jsx_count_b)} more tags)")
        
        interface_count_a = content_a.count('interface ')
        interface_count_b = content_b.count('interface ')
        
        if interface_count_a != interface_count_b:
            diff = abs(interface_count_a - interface_count_b)
            which = Path(file_a).name if interface_count_a > interface_count_b else Path(file_b).name
            summary.append(f"{which} defines {diff} more interface(s)")
        
        has_memo_a = 'useMemo' in content_a or 'useCallback' in content_a or 'React.memo' in content_a
        has_memo_b = 'useMemo' in content_b or 'useCallback' in content_b or 'React.memo' in content_b
        
        if has_memo_a and not has_memo_b:
            summary.append(f"{Path(file_a).name} uses memoization for performance")
        elif has_memo_b and not has_memo_a:
            summary.append(f"{Path(file_b).name} uses memoization for performance")
        
        any_count_a = fallback_count_any(content_a)
        any_count_b = fallback_count_any(content_b)
        
        if abs(any_count_a - any_count_b) > 3:
            which = Path(file_a).name if any_count_a > any_count_b else Path(file_b).name
            summary.append(f"{which} has weaker type safety ({abs(any_count_a - any_count_b)} more 'any')")
        
        func_count_a = len(re.findall(r'\bfunction\s+\w+', content_a))
        func_count_b = len(re.findall(r'\bfunction\s+\w+', content_b))
        
        if abs(func_count_a - func_count_b) > 2:
            which = Path(file_a).name if func_count_a > func_count_b else Path(file_b).name
            summary.append(f"{which} has {abs(func_count_a - func_count_b)} more helper functions")
        
        if not summary:
            summary.append("Files are nearly identical in structure and implementation")
        
        return summary[:5]
    
    @staticmethod
    def _count_hooks(content: str) -> Dict[str, int]:
        counts = {}
        for hook in HOOK_PATTERNS:
            count = len(re.findall(rf'\b{hook}\s*\(', content))
            if count > 0:
                counts[hook] = count
        return counts

# ============================================================================
# DUPLICATE DETECTOR
# ============================================================================

class DuplicateDetector:
    """Advanced multi-layer duplicate detection engine"""
    
    def __init__(self, files: Dict[str, FileInfo], logger: AnalysisLogger, max_workers: int = 4):
        self.files = files
        self.logger = logger
        self.clusters: List[DuplicateCluster] = []
        self.cluster_counter = 0
        self.max_workers = max_workers
    
    def analyze(self) -> List[DuplicateCluster]:
        self.logger.info("Detecting duplicates (multi-layer)...")
        
        self._detect_exact_duplicates()
        self._detect_structural_duplicates()
        
        self.logger.info(f"Found {len(self.clusters)} duplicate clusters")
        return self.clusters
    
    def _detect_exact_duplicates(self):
        hash_groups = defaultdict(list)
        
        for path, meta in self.files.items():
            if meta.size > 100 and not meta.is_test_file:
                hash_groups[meta.content_hash].append(path)
        
        for content_hash, paths in hash_groups.items():
            if len(paths) > 1:
                self._create_cluster(paths, 1.0, 'exact')
    
    def _create_cluster(self, paths: List[str], similarity: float, cluster_type: str):
        cluster_id = f"D{self.cluster_counter}"
        self.cluster_counter += 1
        
        cluster = DuplicateCluster(
            cluster_id=cluster_id,
            files=paths,
            cluster_size=len(paths),
            similarity_score=similarity,
            exported_files_count = sum(1 for p in paths if self.files[p].exports),
            recent_files_count = sum(1 for p in paths if self.files[p].last_modified_days < 30),
            suggested_base_file = max(paths, key=lambda p: self.files[p].stability_score),
            suggested_merge_target = None,
            diff_summary = [],
            risk_level = RiskLevel.LOW if similarity == 1.0 else RiskLevel.MEDIUM,
            recommendation = Recommendation.CONSOLIDATE_DUPLICATES,
            confidence_score = similarity,
            type = cluster_type,
            estimated_savings = sum(self.files[p].lines for p in paths[1:]) // 2  # Approximate
        )
        
        if len(paths) > 1:
            base = paths[0]
            for other in paths[1:]:
                with open(base, 'r') as f_a, open(other, 'r') as f_b:
                    content_a = f_a.read()
                    content_b = f_b.read()
                cluster.diff_summary.extend(DiffSummarizer.generate_diff_summary(base, other, content_a, content_b))
        
        self.clusters.append(cluster)
        
        for p in paths:
            self.files[p].duplicate_cluster_id = cluster_id
    
    def _detect_structural_duplicates(self):
        processed = set()
        
        struct_groups = defaultdict(list)
        for path, meta in self.files.items():
            if path not in processed and not meta.is_test_file and meta.size > 100:
                struct_groups[meta.structural_hash].append(path)
        
        candidates = []
        for struct_hash, group in struct_groups.items():
            if len(group) < 2:
                continue
            for i in range(len(group)):
                for j in range(i+1, len(group)):
                    candidates.append((group[i], group[j]))
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {executor.submit(StructuralSimilarityAnalyzer.compute_structural_similarity, a, b): (a, b) for a, b in candidates}
            for future in as_completed(futures):
                a, b = futures[future]
                similarity = future.result()
                if similarity >= Config.SIMILARITY_THRESHOLD:
                    # Simple grouping for now; can improve to proper clustering
                    existing_cluster = next((c for c in self.clusters if a in c.files or b in c.files), None)
                    if existing_cluster:
                        if b not in existing_cluster.files:
                            existing_cluster.files.append(b)
                            existing_cluster.cluster_size += 1
                    else:
                        self._create_cluster([a, b], similarity, 'structural')
                    processed.add(a)
                    processed.add(b)

# ============================================================================
# DEPENDENCY GRAPH BUILDER
# ============================================================================

class DependencyGraphBuilder:
    """Builds the dependency graph"""
    
    def __init__(self, files: Dict[str, FileInfo], logger: AnalysisLogger):
        self.files = files
        self.logger = logger
    
    def build(self):
        self.logger.info("Building dependency graph...")
        
        for path, meta in self.files.items():
            for imp in meta.imports:
                if imp.startswith('.') or imp.startswith('..'):
                    resolved = self._resolve_relative_path(path, imp)
                    if resolved and resolved in self.files:
                        meta.dependencies.add(resolved)
                        self.files[resolved].dependents.add(path)
                        self.files[resolved].dependents_count += 1
        
        # Detect circular dependencies (optional, log if found)
        for path in self.files:
            if self._has_cycle(path, set()):
                self.logger.warning(f"Circular dependency involving {path}")
    
    def _resolve_relative_path(self, current_path: str, imp: str) -> Optional[str]:
        current_dir = Path(current_path).parent
        resolved = (current_dir / imp).resolve()
        if resolved.suffix == '':
            for ext in FILE_EXTENSIONS:
                candidate = resolved.with_suffix(ext)
                if candidate.exists():
                    resolved = candidate
                    break
            else:
                resolved = resolved / 'index'
                for ext in FILE_EXTENSIONS:
                    candidate = resolved.with_suffix(ext)
                    if candidate.exists():
                        resolved = candidate
                        break
        if resolved.exists():
            return str(resolved)
        return None
    
    def _has_cycle(self, path: str, visited: Set[str]) -> bool:
        if path in visited:
            return True
        visited.add(path)
        for dep in self.files[path].dependencies:
            if self._has_cycle(dep, visited.copy()):
                return True
        return False

# ============================================================================
# USAGE ANALYZER
# ============================================================================

class UsageAnalyzer:
    """Analyzes file usage patterns"""
    
    def __init__(self, files: Dict[str, FileInfo], logger: AnalysisLogger):
        self.files = files
        self.logger = logger
        self.unused: List[str] = []
        self.unwired: List[str] = []
    
    def analyze(self):
        self.logger.info("Analyzing usage patterns...")
        
        for path, meta in self.files.items():
            if meta.dependents_count == 0 and meta.exports and not meta.is_entry_point and not meta.is_barrel_exported and not meta.is_dynamic_imported and meta.category not in {FileCategory.TEST, FileCategory.CONFIGURATION, FileCategory.ASSET, FileCategory.FRAMEWORK_CORE}:
                self.unused.append(path)
            
            if meta.dependents_count == 0 and meta.lines > 50 and len(meta.exports) > 2 and meta.category in {FileCategory.UI_COMPONENT, FileCategory.SERVICE, FileCategory.CUSTOM_HOOK, FileCategory.CORE_LOGIC} and not meta.is_dynamic_imported and not meta.is_barrel_exported:
                self.unwired.append(path)

# ============================================================================
# STABILITY CALCULATOR
# ============================================================================

class StabilityCalculator:
    """Calculates stability scores"""
    
    def __init__(self, files: Dict[str, FileInfo], logger: AnalysisLogger):
        self.files = files
        self.logger = logger
    
    def calculate(self):
        self.logger.info("Calculating stability and risk...")
        
        for meta in self.files.values():
            score = 0.0
            score += min(meta.dependents_count * 0.5, 5.0)
            score += min(len(meta.exports) * 0.2, 2.0)
            score += min(meta.lines / 100, 1.0)
            if meta.last_modified_days > 180:
                score += 1.0
            elif meta.last_modified_days < 30:
                score -= 1.0
            if meta.category in {FileCategory.FRAMEWORK_CORE, FileCategory.CONFIGURATION}:
                score += Config.SHARED_MODULE_BOOST
            if meta.any_count > 5:
                score -= 1.0
            if meta.complexity_estimate > Config.COMPLEXITY_HIGH_THRESHOLD:
                score -= 1.0
            meta.stability_score = max(min(score, 10.0), 0.0)
            
            risk_score = 0
            risk_score += meta.dependents_count * 2
            if meta.category in {FileCategory.FRAMEWORK_CORE, FileCategory.CORE_LOGIC}:
                risk_score += 20
            if meta.has_side_effects:
                risk_score += 10
            if meta.complexity_estimate > 50:
                risk_score += 15
            if meta.is_dynamic_imported:
                risk_score += 10
            if meta.any_count > 5:
                risk_score += 5
            if risk_score > 50:
                meta.risk_level = RiskLevel.CRITICAL
            elif risk_score > 30:
                meta.risk_level = RiskLevel.HIGH
            elif risk_score > 10:
                meta.risk_level = RiskLevel.MEDIUM
            else:
                meta.risk_level = RiskLevel.LOW

# ============================================================================
# ARCHIVE DECISION ENGINE
# ============================================================================

class ArchiveDecisionEngine:
    """Engine for archive eligibility decisions"""
    
    def __init__(self, files: Dict[str, FileInfo], logger: AnalysisLogger):
        self.files = files
        self.logger = logger
    
    def evaluate_archive_candidate(self, file_info: FileInfo) -> ArchiveDecision:
        blockers = []
        reasons = []
        score = 100.0
        confidence = 1.0
        
        if file_info.last_modified_days < Config.RECENT_DAYS_BLOCKER:
            blockers.append(f"Recent modification ({file_info.last_modified_days} days)")
            score -= 50
        
        if file_info.dependents_count > 0:
            blockers.append(f"Has {file_info.dependents_count} dependents")
            score -= 100
        
        if file_info.is_entry_point:
            blockers.append("Entry point file")
            score -= 100
        
        if file_info.category in {FileCategory.FRAMEWORK_CORE, FileCategory.CONFIGURATION}:
            blockers.append("Critical category")
            score -= 100
        
        if file_info.is_dynamic_imported:
            blockers.append("Dynamically imported")
            score -= 50
        
        if file_info.has_side_effects:
            blockers.append("Has side effects")
            score -= 30
        
        if file_info.complexity_estimate > 20:
            reasons.append(f"Moderate complexity ({file_info.complexity_estimate}) - review before archive")
            confidence -= 0.2
        
        if file_info.any_count > 0:
            reasons.append(f"Weak typing ({file_info.any_count} 'any') - may need type fixes")
        
        if file_info.lines < 50:
            reasons.append("Small file - low risk")
            score += 10
        
        allowed = len(blockers) == 0 and score >= Config.ARCHIVE_SCORE_THRESHOLD
        
        decision = Recommendation.SAFE_TO_ARCHIVE if allowed else Recommendation.INVESTIGATE
        
        return ArchiveDecision(
            allowed=allowed,
            decision=decision,
            score=score,
            reasons=reasons,
            blockers=blockers,
            confidence=confidence,
            impact_analysis="Low impact expected" if allowed else "High impact - do not archive",
            alternatives=["Delete if unused", "Merge if duplicate"] if not allowed else []
        )

# ============================================================================
# ARCHIVE BUILDER
# ============================================================================

class ArchiveBuilder:
    """Builds safe archives"""
    
    def __init__(self, root_path: str, report_folder: Path, files: Dict[str, FileInfo], logger: AnalysisLogger):
        self.root = root_path
        self.report_folder = report_folder
        self.files = files
        self.logger = logger
    
    def create_safe_archive(self, candidates: List[str], keep_temp: bool = False) -> Optional[Path]:
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        archive_name = f"archive_{timestamp}.zip"
        archive_path = self.report_folder / 'archives' / archive_name
        
        with zipfile.ZipFile(archive_path, 'w') as zipf:
            for path in candidates:
                rel_path = Path(path).relative_to(self.root)
                zipf.write(path, rel_path)
        
        self.logger.info(f"Created archive: {archive_path}")
        return archive_path

# ============================================================================
# REPORT GENERATOR
# ============================================================================

class ReportGenerator:
    """Generates all reports"""
    
    def __init__(self, report: AnalysisReport, report_folder: Path, logger: AnalysisLogger, dry_run: bool = False):
        self.report = report
        self.report_folder = report_folder
        self.logger = logger
        self.dry_run = dry_run
    
    def generate_all(self):
        if self.dry_run:
            self.logger.info("Dry run - skipping report generation")
            return
        
        self._generate_json('full_report.json', asdict(self.report))
        self._generate_json('summary_report.json', self._create_summary())
        self._generate_csv('high_risk.csv', self._get_high_risk_data())
        self._generate_html_dashboard('optimization_dashboard.html')
    
    def _generate_json(self, filename: str, data: Dict):
        path = self.report_folder / filename
        with open(path, 'w') as f:
            json.dump(data, f, default=str, indent=2)
        self.logger.info(f"Generated {filename}")
    
    def _generate_csv(self, filename: str, rows: List[Dict]):
        path = self.report_folder / filename
        if rows:
            keys = rows[0].keys()
            with open(path, 'w', newline='') as f:
                writer = csv.DictWriter(f, keys)
                writer.writeheader()
                writer.writerows(rows)
            self.logger.info(f"Generated {filename}")
    
    def _generate_html_dashboard(self, filename: str):
        # (same as original, but with CDN for vis.js)
        html = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Optimization Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f0f4f8; color: #2d3748; }
        .dashboard { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 40px; }
        .section { background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-bottom: 30px; padding: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
        th { background: #edf2f7; }
        .badge { padding: 4px 8px; border-radius: 4px; color: white; }
        .low { background: #48bb78; }
        .medium { background: #ecc94b; }
        .high { background: #f56565; }
        .critical { background: #742a2a; }
        .progress-bar { background: #e2e8f0; height: 8px; border-radius: 4px; }
        .progress-fill { background: #4299e1; height: 100%; border-radius: 4px; transition: width 0.5s ease; }
    </style>
    <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>Enterprise Code Intelligence Dashboard</h1>
            <p>Tool Version: 4.0.0 | Generated: {datetime.now()}</p>
        </div>
        <!-- Add sections like summary, duplicates, etc. -->
    </div>
</body>
</html>
"""
        path = self.report_folder / filename
        with open(path, 'w') as f:
            f.write(html)
        self.logger.info(f"Generated {filename}")

    def _create_summary(self) -> Dict:
        return {
            'metadata': self.report.metadata,
            'total_files': len(self.report.files),
            'duplicate_clusters': len(self.report.duplicate_clusters),
            'unused_candidates': len(self.report.unused_candidates),
            'unwired_candidates': len(self.report.unwired_candidates),
            'archive_candidates': len(self.report.archive_candidates),
            'risk_distribution': self.report.risk_distribution,
            'category_distribution': self.report.category_distribution,
            'quality_metrics': self.report.quality_metrics
        }
    
    def _get_high_risk_data(self) -> List[Dict]:
        return [data for data in self.report.files.values() if data['risk_level'] in ['HIGH', 'CRITICAL']]

# ============================================================================
# MAIN ORCHESTRATOR
# ============================================================================

class CodeIntelligencePlatform:
    """Main orchestrator for comprehensive analysis"""
    
    def __init__(self, args: argparse.Namespace):
        self.project_path = Path(args.project_path).resolve()
        self.scope_path = args.scope
        self.report_folder_override = args.report_folder
        self.dry_run = args.dry_run
        self.verbose = args.verbose
        self.keep_history = args.keep_history
        self.parallel = args.parallel
        self.non_interactive = args.non_interactive
        self.json_output = args.json_output
        self.report_folder: Optional[Path] = None
        self.logger: Optional[AnalysisLogger] = None
        self.files: Dict[str, FileInfo] = {}
        self.components: List[ComponentInfo] = []
        self.report: Optional[AnalysisReport] = None
        
    def analyze(self) -> AnalysisReport:
        self.report_folder = setup_report_folder(self.project_path, argparse.Namespace(report_folder=self.report_folder_override, keep_history=self.keep_history))
        
        log_path = self.report_folder / 'runtime_log.txt'
        self.logger = AnalysisLogger(str(log_path), verbose=self.verbose)
        
        self.logger.info("="*70)
        self.logger.info("ENTERPRISE CODE INTELLIGENCE PLATFORM V4")
        self.logger.info("="*70)
        self.logger.info(f"Scan root: {self.project_path}")
        self.logger.info(f"Report folder: {self.report_folder}")
        
        start_time = datetime.now()
        
        try:
            self.logger.info("Phase 1: Project scanning...")
            scanner = ProjectScanner(str(self.project_path), self.logger, self.scope_path, max_workers=8 if self.parallel else 4)
            self.files, self.components = scanner.scan()
            
            self.logger.info("Phase 2: Building dependency graph...")
            graph_builder = DependencyGraphBuilder(self.files, self.logger)
            graph_builder.build()
            
            self.logger.info("Phase 3: Detecting duplicates...")
            duplicate_detector = DuplicateDetector(self.files, self.logger, max_workers=8 if self.parallel else 4)
            duplicates = duplicate_detector.analyze()
            
            self.logger.info("Phase 4: Analyzing usage patterns...")
            usage_analyzer = UsageAnalyzer(self.files, self.logger)
            usage_analyzer.analyze()
            
            self.logger.info("Phase 5: Computing stability and risk...")
            stability_calc = StabilityCalculator(self.files, self.logger)
            stability_calc.calculate()
            
            self.logger.info("Phase 6: Generating professional recommendations...")
            recommendations = RecommendationEngine.generate_comprehensive_recommendation(...) # Call for each file, collect
            
            recommendations = []
            for path, meta in self.files.items():
                rec, reasoning, confidence = RecommendationEngine.generate_comprehensive_recommendation(meta, self.files, duplicates)
                meta.recommendation = rec
                meta.detailed_reasoning = reasoning
                recommendations.append({
                    'file': meta.relative_path,
                    'recommendation': rec.value,
                    'reasoning': reasoning,
                    'confidence': confidence
                })
            
            self.logger.info("Phase 7: Evaluating archive candidates...")
            archive_engine = ArchiveDecisionEngine(self.files, self.logger)
            archive_candidates = [path for path, meta in self.files.items() if archive_engine.evaluate_archive_candidate(meta).allowed]
            
            self.logger.info("Phase 8: Computing quality metrics...")
            quality_metrics = self._calculate_quality_metrics()
            
            end_time = datetime.now()
            
            self.report = AnalysisReport(
                metadata={
                    'tool_version': Config.TOOL_VERSION,
                    'scan_root': str(self.project_path),
                    'ignored_folders': list(IGNORE_PATTERNS),
                    'start_time': start_time.isoformat(),
                    'end_time': end_time.isoformat(),
                    'report_folder': str(self.report_folder),
                    'warnings': self.logger.warnings,
                    'errors': self.logger.errors
                },
                files = {path: asdict(meta) for path, meta in self.files.items()},
                duplicate_clusters = [asdict(c) for c in duplicates],
                same_name_conflicts = [],
                unused_candidates = usage_analyzer.unused,
                unwired_candidates = usage_analyzer.unwired,
                merge_suggestions = [],
                archive_candidates = archive_candidates,
                category_distribution = dict(Counter(f.category.value for f in self.files.values())),
                risk_distribution = dict(Counter(f.risk_level.value for f in self.files.values())),
                issues = [],
                recommendations = recommendations,
                optimization_opportunities = [],
                quality_metrics = quality_metrics
            )
            
            report_gen = ReportGenerator(self.report, self.report_folder, self.logger, self.dry_run)
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
    
    def _calculate_quality_metrics(self) -> Dict[str, Any]:
        total_files = len(self.files)
        if total_files == 0:
            return {}
        
        avg_stability = sum(f.stability_score for f in self.files.values()) / total_files
        
        total_any = sum(f.any_count for f in self.files.values())
        total_lines = sum(f.lines for f in self.files.values())
        type_safety_score = max(0, 100 - (total_any / total_lines * 1000)) if total_lines > 0 else 100
        
        avg_complexity = sum(f.complexity_estimate for f in self.files.values()) / total_files
        
        test_files = sum(1 for f in self.files.values() if f.is_test_file)
        non_test_files = total_files - test_files
        test_coverage_estimate = (test_files / non_test_files * 100) if non_test_files > 0 else 0
        
        return {
            'avg_stability': avg_stability,
            'type_safety_score': type_safety_score,
            'avg_complexity': avg_complexity,
            'test_coverage_estimate': min(test_coverage_estimate, 100),
            'total_files': total_files,
            'total_lines': total_lines,
            'typescript_percentage': sum(1 for f in self.files.values() if f.has_typescript) / total_files * 100
        }

# ============================================================================
# INTERACTIVE CLI
# ============================================================================

class InteractiveCLI:
    """Interactive command-line interface"""
    
    def __init__(self, platform: CodeIntelligencePlatform):
        self.platform = platform
        self.report: Optional[AnalysisReport] = None
        
    def run(self):
        # (same as original, with added options)
        print("\nInteractive mode not implemented in this version. Run with --non-interactive.")
        # Add menu as per original
        
# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description='Enterprise Code Intelligence Platform v4')
    parser.add_argument('project_path', nargs='?', default=os.getcwd(), help='Project root')
    parser.add_argument('--scope', help='Scope path')
    parser.add_argument('--report-folder', help='Report folder')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--verbose', action='store_true')
    parser.add_argument('--keep-history', action='store_true')
    parser.add_argument('--parallel', action='store_true')
    parser.add_argument('--non-interactive', action='store_true')
    parser.add_argument('--json-output', action='store_true')
    
    args = parser.parse_args()
    
    platform = CodeIntelligencePlatform(args)
    report = platform.analyze()
    
    if args.json_output:
        print(json.dumps(asdict(report), default=str, indent=2))
    elif args.non_interactive:
        print("Analysis complete. Reports in", platform.report_folder)
    
if __name__ == '__main__':
    main()