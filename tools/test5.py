#!/usr/bin/env python3
"""
Enterprise Code Intelligence Platform v6.0 – Unified Edition
================================================================
A comprehensive static analysis tool for TypeScript/JavaScript/React/Electron projects.
Merges the best features of v4.1 (AST accuracy, dependency graph visualisation) and
v5.0 (unwired classification, wiring suggestions, modern HTML dashboard).

Git/GitHub integration has been completely removed – all analysis is based on
file system metadata and code structure only.

Features:
- AST‑accurate parsing via tree‑sitter (TypeScript, JavaScript, optional Python)
- Fixed report folder with overwrite (always latest) + history move
- Excludes .md files and configurable ignore patterns
- File hash cache for incremental runs with hit rate reporting
- Parallel scanning & similarity computation
- Interactive & non‑interactive CLI
- Self‑contained HTML dashboard with vis‑network dependency graph
- Safe archive (ZIP, never modifies sources)
- Enhanced unwired detection (orphaned useful, dead code, new feature)
- Automatic wiring suggestions via structural & export/import similarity
- Optional TypeScript compiler resolver stub (extensible)
- Issue tracking for unwired components, duplicates, high risk
- Progress bar (tqdm optional)
- Comprehensive dataclasses and type hints
- Unit test skeletons (commented)

Author: Code Intelligence Team (merged)
Version: 6.0.0
"""

# =============================================================================
# IMPORTS (standard library + optional external)
# =============================================================================
import os
import sys
import json
import hashlib
import shutil
import zipfile
import argparse
import time
import csv
import re
from pathlib import Path
from datetime import datetime
from collections import defaultdict, Counter
from typing import (
    Dict, List, Set, Tuple, Optional, Any, Union, Callable, Iterator
)
from dataclasses import dataclass, field, asdict
from enum import Enum, auto
from difflib import SequenceMatcher
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
from functools import lru_cache
import traceback
import logging
import platform
import mimetypes

# Progress bar (optional)
try:
    from tqdm import tqdm
    TQDM_AVAILABLE = True
except ImportError:
    TQDM_AVAILABLE = False

# Tree‑sitter – mandatory for TypeScript/JavaScript parsing
try:
    from tree_sitter import Language, Parser, Node
    import tree_sitter_typescript
    TREE_SITTER_AVAILABLE = True
except ImportError:
    TREE_SITTER_AVAILABLE = False

# Optional: tree‑sitter‑python for Python support
try:
    from tree_sitter_python import language_python
    TREE_SITTER_PYTHON_AVAILABLE = True
except ImportError:
    TREE_SITTER_PYTHON_AVAILABLE = False

# Optional: TypeScript compiler API (for future accurate resolution)
try:
    import typescript  # requires `pip install typescript`
    TS_COMPILER_AVAILABLE = True
except ImportError:
    TS_COMPILER_AVAILABLE = False

# =============================================================================
# GLOBAL CONFIGURATION (all tunable parameters)
# =============================================================================
class Config:
    """Global configuration – override via env or CLI flags."""
    VERSION = "6.0.0"
    CACHE_FILE = ".code_intelligence_cache.json"
    DEFAULT_REPORT_DIR = "reports"
    ARCHIVES_SUBDIR = "archives"
    HISTORY_SUBDIR = "history"

    # File extensions
    TS_EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx'}
    PY_EXTENSIONS = {'.py'} if TREE_SITTER_PYTHON_AVAILABLE else set()
    SUPPORTED_EXTENSIONS = TS_EXTENSIONS | PY_EXTENSIONS
    EXCLUDED_EXTENSIONS = {'.md', '.markdown'}
    ASSET_EXTENSIONS = {
        '.css', '.scss', '.sass', '.less', '.json', '.svg',
        '.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff',
        '.woff2', '.ttf', '.eot'
    }

    # Default ignore patterns (case‑insensitive substring match)
    DEFAULT_IGNORE_PATTERNS = [
        'node_modules', 'dist', 'build', '.git', '.next', 'coverage',
        '__pycache__', '.pytest_cache', '.vscode', '.idea',
        '*.min.js', '*.bundle.js', '*.chunk.js', 'venv', 'env'
    ]

    # -------------------------------------------------------------------------
    # Analysis thresholds
    # -------------------------------------------------------------------------
    # Duplicate detection
    SIMILARITY_THRESHOLD = 0.85
    SIZE_DIFF_RATIO_THRESHOLD = 3.0
    MAX_FILE_SIZE_FOR_SIMILARITY = 500_000  # 500KB

    # Unwired detection (no Git, based on file recency)
    MIN_LINES_FOR_UNWIRED = 50
    MIN_EXPORTS_FOR_UNWIRED = 2
    RECENT_CHANGE_DAYS = 30
    STALE_DAYS = 180

    # Wiring suggestions
    WIRING_SIMILARITY_THRESHOLD = 0.3

    # Barrel export threshold
    BARREL_EXPORT_THRESHOLD = 3

    # Stability & risk
    STABILITY_WEIGHTS = {
        'dependents': 0.30,
        'exports': 0.20,
        'size': 0.15,
        'recency': 0.15,
        'penalties': 0.20
    }
    COMPLEXITY_HIGH_THRESHOLD = 50
    CRITICAL_DEPENDENCY_THRESHOLD = 10
    SHARED_MODULE_BOOST = 2.0

    # Archive decisions
    ARCHIVE_SCORE_THRESHOLD = 75
    INVESTIGATE_LOW_THRESHOLD = 60
    INVESTIGATE_MEDIUM_THRESHOLD = 45

    # Performance
    MAX_WORKERS_IO = min(8, (os.cpu_count() or 1))
    MAX_WORKERS_CPU = min(4, (os.cpu_count() or 1))

    # -------------------------------------------------------------------------
    # Pattern lists (regex / substring)
    # -------------------------------------------------------------------------
    ENTRY_POINT_PATTERNS = {
        'main.ts', 'main.tsx', 'index.ts', 'index.tsx',
        'app.ts', 'app.tsx', '_app.tsx', 'main.js', 'index.js',
        'main.py', '__main__.py', 'app.py', 'cli.py'
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


# =============================================================================
# LOGGING SETUP (coloured, tqdm friendly)
# =============================================================================
class ColouredFormatter(logging.Formatter):
    """Custom formatter with ANSI colour support."""
    COLOURS = {
        'DEBUG': '\033[36m',
        'INFO': '\033[32m',
        'WARNING': '\033[33m',
        'ERROR': '\033[31m',
        'CRITICAL': '\033[35m',
        'RESET': '\033[0m'
    }

    def __init__(self, fmt=None, datefmt=None, use_colour=True):
        super().__init__(fmt, datefmt)
        self.use_colour = use_colour and sys.stdout.isatty()

    def format(self, record):
        if self.use_colour:
            levelname = record.levelname
            if levelname in self.COLOURS:
                record.levelname = f"{self.COLOURS[levelname]}{levelname}{self.COLOURS['RESET']}"
        return super().format(record)


def setup_logging(verbose: bool = False) -> logging.Logger:
    """Configure root logger with coloured output."""
    level = logging.DEBUG if verbose else logging.INFO

    # Windows colour compatibility
    if platform.system() == 'Windows':
        try:
            import ctypes
            kernel32 = ctypes.windll.kernel32
            kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
        except:
            pass

    logger = logging.getLogger('CodeIntelligence')
    logger.setLevel(level)
    logger.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(level)
    formatter = ColouredFormatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%H:%M:%S'
    )
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    return logger


# =============================================================================
# ENUMS
# =============================================================================
class FileCategory(Enum):
    """File type classification."""
    UI_COMPONENT = "UI Component"
    CUSTOM_HOOK = "Custom Hook"
    PAGE_OR_ROUTE = "Page/Route"
    CONTEXT = "Context"
    STORE_OR_STATE = "Store/State"
    SERVICE = "Service"
    UTILITY = "Utility"
    CORE_LOGIC = "Core Logic"
    TEST = "Test"
    CONFIGURATION = "Configuration"
    ASSET = "Asset"
    SCRIPT = "Script"
    FRAMEWORK_CORE = "Framework Core"
    BARREL = "Barrel"
    TYPE_DEFINITION = "Type Definition"
    CONSTANTS = "Constants"
    PYTHON_MODULE = "Python Module"
    STYLE = "Style"
    ENTRY_POINT = "Entry Point"
    UNKNOWN = "Unknown"


class RiskLevel(Enum):
    """Risk level classification."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class Recommendation(Enum):
    """Action recommendation."""
    KEEP = "KEEP"
    INVESTIGATE = "INVESTIGATE"
    REFACTOR = "REFACTOR"
    ARCHIVE = "ARCHIVE"
    DELETE = "DELETE"
    MERGE = "MERGE"
    WIRE = "WIRE"
    ADD_TYPE_SAFETY = "ADD_TYPE_SAFETY"
    REDUCE_COMPLEXITY = "REDUCE_COMPLEXITY"
    MODERNIZE_IMPLEMENTATION = "MODERNIZE_IMPLEMENTATION"
    EXTRACT_SHARED_LOGIC = "EXTRACT_SHARED_LOGIC"


class IssueType(Enum):
    """Code issue classification."""
    DUPLICATE = "Duplicate"
    UNUSED = "Unused"
    UNWIRED = "Unwired"
    WEAK_TYPING = "Weak Typing"
    HIGH_COMPLEXITY = "High Complexity"
    MISSING_TESTS = "Missing Tests"
    OUTDATED = "Outdated"
    NAMING_COLLISION = "Naming Collision"
    CIRCULAR_DEPENDENCY = "Circular Dependency"
    LARGE_FILE = "Large File"
    MISSING_DOCUMENTATION = "Missing Documentation"


class UnwiredType(Enum):
    """Unwired component sub‑classification (without Git)."""
    ORPHANED_USEFUL = "orphaned_useful"   # old but non‑trivial, might be still useful
    DEAD_CODE = "dead_code"               # old, small, possibly abandoned
    NEW_FEATURE = "new_feature"           # recently created, not yet integrated
    UNKNOWN = "unknown"                  # fallback


# =============================================================================
# DATA CLASSES
# =============================================================================
@dataclass
class CodeIssue:
    """A single code quality issue."""
    issue_type: IssueType
    severity: RiskLevel
    file_path: str
    description: str
    recommendation: str
    confidence: float
    impact_estimate: str
    related_files: List[str] = field(default_factory=list)
    line: Optional[int] = None
    suggestion: Optional[str] = None


@dataclass
class ComponentInfo:
    """React/UI component metadata."""
    name: str
    is_functional: bool
    has_jsx: bool
    hooks_used: List[str] = field(default_factory=list)
    props_count: int = 0
    state_count: int = 0
    is_class_component: bool = False
    lifecycle_methods: List[str] = field(default_factory=list)
    memo_usage: bool = False


@dataclass
class WiringSuggestion:
    """Suggestion for wiring an unwired component."""
    target_file: str
    similarity_score: float
    reason: str
    integration_point: str
    common_exports: List[str] = field(default_factory=list)
    common_imports: List[str] = field(default_factory=list)


@dataclass
class DuplicateCluster:
    """Group of duplicate or structurally similar files."""
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
    type: str  # "exact" or "structural"
    estimated_savings: int = 0


@dataclass
class ArchiveDecision:
    """Decision about archiving a file."""
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
    """Complete metadata for a single file, extracted via AST + fallback."""
    # Basic identification
    path: str
    relative_path: str
    name: str
    extension: str
    size: int
    lines: int

    # Content hashes
    content_hash: str
    structural_hash: str

    # Timestamps
    modified: float
    days_since_modified: int

    # Category & flags
    category: FileCategory
    is_entry_point: bool = False
    is_test_file: bool = False
    is_barrel_file: bool = False
    is_barrel_exported: bool = False
    is_dynamic_imported: bool = False
    has_side_effects: bool = False

    # Code structure
    imports: List[str] = field(default_factory=list)
    exports: List[str] = field(default_factory=list)
    exported_symbols: List[str] = field(default_factory=list)
    dependencies: Set[str] = field(default_factory=set)
    dependents: Set[str] = field(default_factory=set)
    dependents_count: int = 0

    # React / component info
    is_react_component: bool = False
    is_custom_hook: bool = False
    component_type: str = ""  # "function", "arrow", "class"
    component: Optional[ComponentInfo] = None
    hook_usage: List[str] = field(default_factory=list)
    has_jsx: bool = False

    # TypeScript quality metrics
    has_typescript: bool = False
    any_count: int = 0
    interface_count: int = 0
    type_count: int = 0
    function_count: int = 0
    class_count: int = 0

    # Complexity
    complexity_estimate: int = 0
    cognitive_complexity: int = 0

    # Duplicates
    duplicate_cluster_id: Optional[str] = None
    duplicate_of: Optional[str] = None
    structural_duplicates: List[str] = field(default_factory=list)

    # Analysis results
    stability_score: float = 0.0
    risk_level: RiskLevel = RiskLevel.LOW
    risk_score: float = 0.0
    recommendation: Recommendation = Recommendation.KEEP
    short_reason: str = ""
    detailed_reasoning: List[str] = field(default_factory=list)
    recommendation_confidence: float = 0.0

    # Unwired classification (no Git)
    unwired_type: Optional[UnwiredType] = None
    wiring_suggestions: List[WiringSuggestion] = field(default_factory=list)

    # Issues
    issues: List[CodeIssue] = field(default_factory=list)


@dataclass
class AnalysisReport:
    """Complete analysis report."""
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
    dependency_graph: Dict[str, List[str]] = field(default_factory=dict)
    cache_hit_rate: float = 0.0
    analysis_duration_seconds: float = 0.0


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================
def compute_hash(content: str) -> str:
    """SHA256 hash of content."""
    return hashlib.sha256(content.encode('utf-8')).hexdigest()


def normalize_path(path: Union[str, Path], base: Path) -> str:
    """Return path relative to base, as string."""
    p = Path(path).resolve()
    try:
        return str(p.relative_to(base))
    except ValueError:
        return str(p)


def should_ignore(path: Path, ignore_patterns: List[str]) -> bool:
    """Check if path matches any ignore pattern (substring or glob)."""
    path_str = str(path)
    for pattern in ignore_patterns:
        if pattern in path_str:
            return True
        if path.match(pattern):
            return True
    return False


def jaccard_similarity(set1: Set, set2: Set) -> float:
    """Jaccard index of two sets."""
    if not set1 and not set2:
        return 1.0
    if not set1 or not set2:
        return 0.0
    inter = len(set1 & set2)
    union = len(set1 | set2)
    return inter / union if union else 0.0


def sequence_similarity(seq1: List, seq2: List) -> float:
    """SequenceMatcher ratio."""
    return SequenceMatcher(None, seq1, seq2).ratio()


# =============================================================================
# FILE CACHE (with hit rate)
# =============================================================================
class FileCache:
    """Persistent cache of file metadata for incremental runs."""

    def __init__(self, cache_path: Path, version: str, logger: logging.Logger):
        self.cache_path = cache_path
        self.version = version
        self.logger = logger
        self.data: Dict[str, Dict] = {}
        self.hits = 0
        self.misses = 0
        self._load()

    def _load(self):
        if self.cache_path.exists():
            try:
                with open(self.cache_path, 'r', encoding='utf-8') as f:
                    cached = json.load(f)
                if cached.get('version') == self.version:
                    self.data = cached.get('files', {})
                    self.logger.debug(f"Cache loaded from {self.cache_path}")
            except Exception as e:
                self.logger.debug(f"Cache load failed: {e}")

    def save(self):
        try:
            self.cache_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.cache_path, 'w', encoding='utf-8') as f:
                json.dump({
                    'version': self.version,
                    'timestamp': datetime.now().isoformat(),
                    'files': self.data
                }, f, indent=2)
            self.logger.debug(f"Cache saved to {self.cache_path}")
        except Exception as e:
            self.logger.debug(f"Cache save failed: {e}")

    def get(self, file_path: str, mtime: float) -> Optional[Dict]:
        if file_path in self.data:
            cached = self.data[file_path]
            if cached.get('mtime') == mtime:
                self.hits += 1
                return cached
        self.misses += 1
        return None

    def set(self, file_path: str, mtime: float, data: Dict):
        self.data[file_path] = {'mtime': mtime, **data}

    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return self.hits / total if total else 0.0


# =============================================================================
# TREE‑SITTER PARSER (with structural hash)
# =============================================================================
class TreeSitterParser:
    """AST parser using tree‑sitter – supports TypeScript/TSX/JavaScript and Python."""

    def __init__(self):
        self.logger = logging.getLogger('CodeIntelligence')
        self.parser = None
        self.ts_lang = None
        self.tsx_lang = None
        self.py_lang = None

        if TREE_SITTER_AVAILABLE:
            try:
                self.ts_lang = Language(tree_sitter_typescript.language_typescript())
                self.tsx_lang = Language(tree_sitter_typescript.language_tsx())
                self.parser = Parser()
                if TREE_SITTER_PYTHON_AVAILABLE:
                    self.py_lang = Language(language_python())
                self.logger.info("Tree‑sitter initialised successfully.")
            except Exception as e:
                self.logger.error(f"Tree‑sitter initialisation failed: {e}")
                self.parser = None

    def parse(self, content: str, file_path: str) -> Optional[Node]:
        """Parse file content, return root node."""
        if not self.parser:
            return None
        ext = Path(file_path).suffix
        try:
            if ext in {'.tsx', '.jsx'}:
                self.parser.set_language(self.tsx_lang)
            elif ext in {'.ts', '.js'}:
                self.parser.set_language(self.ts_lang)
            elif ext == '.py' and self.py_lang:
                self.parser.set_language(self.py_lang)
            else:
                return None
            tree = self.parser.parse(bytes(content, 'utf-8'))
            return tree.root_node
        except Exception as e:
            self.logger.debug(f"Parse error for {file_path}: {e}")
            return None

    # -------------------------------------------------------------------------
    # Extraction methods
    # -------------------------------------------------------------------------
    def extract_imports(self, node: Node, content: str) -> List[str]:
        """Extract import module names."""
        imports = []

        def walk(n: Node):
            if n.type == 'import_statement':
                for child in n.children:
                    if child.type == 'string':
                        imports.append(content[child.start_byte:child.end_byte].strip('\'"'))
                        break
            elif n.type in {'import_from_statement', 'import_statement'} and n.type != 'import_statement':
                # Python
                module_node = n.child_by_field_name('module')
                if module_node:
                    imports.append(content[module_node.start_byte:module_node.end_byte])
            for child in n.children:
                walk(child)

        walk(node)
        return imports

    def extract_exports(self, node: Node, content: str) -> List[str]:
        """Extract exported names (including default)."""
        exports = []

        def walk(n: Node):
            if n.type == 'export_statement':
                # default export
                if 'default' in content[n.start_byte:n.end_byte]:
                    exports.append('default')
                # named exports
                for child in n.children:
                    if child.type == 'export_clause':
                        for spec in child.children:
                            if spec.type == 'export_specifier':
                                name_node = spec.child_by_field_name('name')
                                if name_node:
                                    exports.append(content[name_node.start_byte:name_node.end_byte])
                    elif child.type in {'function_declaration', 'class_declaration', 'lexical_declaration'}:
                        name_node = self._find_identifier(child, content)
                        if name_node:
                            exports.append(name_node)
            elif n.type == 'export_default':
                exports.append('default')
            for child in n.children:
                walk(child)

        walk(node)
        return list(set(exports))

    def _find_identifier(self, node: Node, content: str) -> Optional[str]:
        if node.type == 'identifier':
            return content[node.start_byte:node.end_byte]
        for child in node.children:
            res = self._find_identifier(child, content)
            if res:
                return res
        return None

    def extract_hooks(self, node: Node, content: str) -> List[str]:
        """Extract React hook calls."""
        hooks = []

        def walk(n: Node):
            if n.type == 'call_expression':
                func = n.child_by_field_name('function')
                if func and func.type == 'identifier':
                    name = content[func.start_byte:func.end_byte]
                    if name.startswith('use'):
                        hooks.append(name)
            for child in n.children:
                walk(child)

        walk(node)
        return list(set(hooks))

    def has_jsx(self, node: Node) -> bool:
        """Check if file contains JSX."""
        def walk(n: Node) -> bool:
            if n.type in {'jsx_element', 'jsx_self_closing_element', 'jsx_fragment'}:
                return True
            return any(walk(child) for child in n.children)
        return walk(node)

    def count_any(self, node: Node, content: str) -> int:
        """Count 'any' type annotations."""
        count = 0

        def walk(n: Node):
            nonlocal count
            if n.type == 'predefined_type':
                if content[n.start_byte:n.end_byte] == 'any':
                    count += 1
            for child in n.children:
                walk(child)

        walk(node)
        return count

    def calculate_complexity(self, node: Node) -> int:
        """Cyclomatic complexity estimation."""
        complexity = 1
        decision_nodes = {
            'if_statement', 'while_statement', 'for_statement', 'for_in_statement',
            'do_statement', 'switch_case', 'catch_clause', 'ternary_expression',
            'binary_expression'
        }

        def walk(n: Node):
            nonlocal complexity
            if n.type in decision_nodes:
                if n.type == 'binary_expression':
                    for child in n.children:
                        if child.type in {'&&', '||'}:
                            complexity += 1
                            break
                else:
                    complexity += 1
            for child in n.children:
                walk(child)

        walk(node)
        return complexity

    def structural_hash(self, node: Node, content: str) -> str:
        """Normalise AST (replace identifiers/literals with placeholders) and hash."""
        tokens = []

        def walk(n: Node):
            if n.type in {'identifier', 'string', 'number', 'template_string'}:
                tokens.append(f"_{n.type}_")
            elif n.type not in {'comment', 'whitespace'}:
                tokens.append(n.type)
                for child in n.children:
                    walk(child)

        walk(node)
        normalised = ' '.join(tokens)
        return compute_hash(normalised)


# =============================================================================
# REGEX FALLBACK PARSER (when tree‑sitter unavailable)
# =============================================================================
class RegexParser:
    """Fallback parser using improved regex patterns."""

    IMPORT_PATTERN = re.compile(
        r'import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?["\']([^"\']+)["\']',
        re.MULTILINE
    )
    EXPORT_PATTERN = re.compile(
        r'export\s+(?:default\s+)?(?:const|let|var|function|class|interface|type|enum)\s+(\w+)',
        re.MULTILINE
    )
    HOOK_PATTERN = re.compile(r'\b(use[A-Z]\w*)\s*\(', re.MULTILINE)
    JSX_PATTERN = re.compile(r'<[A-Z]\w*(?:\s+[^>]*)?>|<>[^<]*<\/>', re.MULTILINE)
    ANY_PATTERN = re.compile(r':\s*any\b', re.MULTILINE)
    PY_IMPORT_PATTERN = re.compile(r'(?:from\s+(\S+)\s+import|import\s+(\S+))', re.MULTILINE)
    PY_DEF_PATTERN = re.compile(r'(?:def|class)\s+(\w+)', re.MULTILINE)

    def extract_imports(self, content: str, ext: str = '.ts') -> List[str]:
        if ext == '.py':
            matches = self.PY_IMPORT_PATTERN.findall(content)
            return [m[0] or m[1] for m in matches]
        return self.IMPORT_PATTERN.findall(content)

    def extract_exports(self, content: str, ext: str = '.ts') -> List[str]:
        if ext == '.py':
            return self.PY_DEF_PATTERN.findall(content)
        exports = self.EXPORT_PATTERN.findall(content)
        if 'export default' in content:
            exports.append('default')
        return list(set(exports))

    def extract_hooks(self, content: str) -> List[str]:
        return list(set(self.HOOK_PATTERN.findall(content)))

    def has_jsx(self, content: str) -> bool:
        return bool(self.JSX_PATTERN.search(content))

    def count_any(self, content: str) -> int:
        return len(self.ANY_PATTERN.findall(content))

    def calculate_complexity(self, content: str) -> int:
        keywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch', '&&', '||', '?']
        return 1 + sum(content.count(k) for k in keywords)

    def structural_hash(self, content: str) -> str:
        # Normalise: remove comments, string literals, numbers
        content = re.sub(r'//.*?$', '', content, flags=re.MULTILINE)
        content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
        content = re.sub(r'"(?:[^"\\]|\\.)*"', '""', content)
        content = re.sub(r"'(?:[^'\\]|\\.)*'", "''", content)
        content = re.sub(r'`(?:[^`\\]|\\.)*`', '``', content)
        content = re.sub(r'\b\d+\b', '0', content)
        content = re.sub(r'\s+', ' ', content)
        return compute_hash(content)


# =============================================================================
# PROJECT SCANNER
# =============================================================================
class ProjectScanner:
    """Scans project directory, extracts file metadata using AST or regex."""

    def __init__(self, root_path: Path, logger: logging.Logger,
                 scope: Optional[Path] = None,
                 ignore_patterns: Optional[List[str]] = None,
                 cache: Optional[FileCache] = None):
        self.root = root_path.resolve()
        self.scope = (scope or self.root).resolve()
        self.logger = logger
        self.cache = cache
        self.ignore_patterns = list(Config.DEFAULT_IGNORE_PATTERNS)
        if ignore_patterns:
            self.ignore_patterns.extend(ignore_patterns)

        self.ts_parser = TreeSitterParser()
        self.regex_parser = RegexParser()
        self.files: Dict[str, FileInfo] = {}

    def scan(self, use_parallel: bool = True) -> Dict[str, FileInfo]:
        """Scan all eligible files and return FileInfo dict keyed by relative path."""
        self.logger.info(f"Scanning project: {self.scope}")
        all_files = self._find_files()
        self.logger.info(f"Found {len(all_files)} candidate files.")

        if use_parallel:
            self.files = self._scan_parallel(all_files)
        else:
            self.files = self._scan_sequential(all_files)

        self.logger.info(f"Successfully analysed {len(self.files)} files.")
        return self.files

    def _find_files(self) -> List[Path]:
        files = []
        for root, dirs, filenames in os.walk(self.scope):
            root_path = Path(root)
            # Filter directories in‑place
            dirs[:] = [d for d in dirs if not should_ignore(root_path / d, self.ignore_patterns)]
            for filename in filenames:
                file_path = root_path / filename
                if should_ignore(file_path, self.ignore_patterns):
                    continue
                if file_path.suffix.lower() in Config.EXCLUDED_EXTENSIONS:
                    continue
                if (file_path.suffix.lower() in Config.SUPPORTED_EXTENSIONS or
                        file_path.suffix.lower() in Config.ASSET_EXTENSIONS):
                    files.append(file_path)
        return files

    def _scan_sequential(self, files: List[Path]) -> Dict[str, FileInfo]:
        result = {}
        iterator = tqdm(files, desc="Scanning files") if TQDM_AVAILABLE else files
        for file_path in iterator:
            try:
                info = self._analyse_file(file_path)
                if info:
                    result[info.relative_path] = info
            except Exception as e:
                self.logger.error(f"Error analysing {file_path}: {e}")
        return result

    def _scan_parallel(self, files: List[Path]) -> Dict[str, FileInfo]:
        result = {}
        with ThreadPoolExecutor(max_workers=Config.MAX_WORKERS_IO) as executor:
            future_to_file = {executor.submit(self._analyse_file, f): f for f in files}
            iterator = as_completed(future_to_file)
            if TQDM_AVAILABLE:
                iterator = tqdm(iterator, total=len(files), desc="Scanning files")
            for future in iterator:
                try:
                    info = future.result()
                    if info:
                        result[info.relative_path] = info
                except Exception as e:
                    file_path = future_to_file[future]
                    self.logger.error(f"Error analysing {file_path}: {e}")
        return result

    def _analyse_file(self, file_path: Path) -> Optional[FileInfo]:
        try:
            stat = file_path.stat()
            mtime = stat.st_mtime
            relative = normalize_path(file_path, self.root)

            # Check cache
            if self.cache:
                cached = self.cache.get(relative, mtime)
                if cached:
                    # Reconstruct FileInfo from cache (basic)
                    return self._from_cache(file_path, cached)

            # Read file
            with open(file_path, 'rb') as f:
                content_bytes = f.read()
            content = content_bytes.decode('utf-8', errors='ignore')
            lines = content.count('\n') + 1
            content_hash = compute_hash(content)

            ext = file_path.suffix.lower()
            info = FileInfo(
                path=str(file_path),
                relative_path=relative,
                name=file_path.name,
                extension=ext,
                size=stat.st_size,
                lines=lines,
                content_hash=content_hash,
                structural_hash="",  # filled later
                modified=mtime,
                days_since_modified=int((time.time() - mtime) / 86400),
                category=FileCategory.UNKNOWN,
                has_typescript=ext in {'.ts', '.tsx'},
                has_jsx=ext in {'.tsx', '.jsx'}
            )

            # Parse with tree‑sitter if available
            if TREE_SITTER_AVAILABLE and self.ts_parser.parser and ext in Config.SUPPORTED_EXTENSIONS:
                ast = self.ts_parser.parse(content, str(file_path))
                if ast:
                    self._extract_with_ast(ast, content, info, ext)
                    info.structural_hash = self.ts_parser.structural_hash(ast, content)
                else:
                    self._extract_with_regex(content, info, ext)
                    info.structural_hash = self.regex_parser.structural_hash(content)
            else:
                self._extract_with_regex(content, info, ext)
                info.structural_hash = self.regex_parser.structural_hash(content)

            # Classification & flags
            info.category = self._classify_file(file_path, content, info)
            info.is_entry_point = file_path.name in Config.ENTRY_POINT_PATTERNS
            info.is_test_file = self._is_test_file(file_path)
            info.is_barrel_file = self._is_barrel_file(file_path, info.exports, info.imports)

            # Cache
            if self.cache:
                self.cache.set(relative, mtime, {
                    'content_hash': info.content_hash,
                    'structural_hash': info.structural_hash,
                    'lines': info.lines,
                    'category': info.category.value,
                    'imports': info.imports,
                    'exports': info.exports,
                    'complexity': info.complexity_estimate,
                    'any_count': info.any_count,
                    'is_barrel_file': info.is_barrel_file,
                    'is_test_file': info.is_test_file,
                    'is_entry_point': info.is_entry_point,
                })

            return info

        except Exception as e:
            self.logger.debug(f"Failed to analyse {file_path}: {e}")
            return None

    def _from_cache(self, file_path: Path, cached: Dict) -> FileInfo:
        stat = file_path.stat()
        relative = normalize_path(file_path, self.root)
        return FileInfo(
            path=str(file_path),
            relative_path=relative,
            name=file_path.name,
            extension=file_path.suffix.lower(),
            size=stat.st_size,
            lines=cached['lines'],
            content_hash=cached['content_hash'],
            structural_hash=cached['structural_hash'],
            modified=stat.st_mtime,
            days_since_modified=int((time.time() - stat.st_mtime) / 86400),
            category=FileCategory(cached['category']),
            imports=cached['imports'],
            exports=cached['exports'],
            exported_symbols=cached['exports'].copy(),
            complexity_estimate=cached.get('complexity', 0),
            any_count=cached.get('any_count', 0),
            is_barrel_file=cached.get('is_barrel_file', False),
            is_test_file=cached.get('is_test_file', False),
            is_entry_point=cached.get('is_entry_point', False),
        )

    # -------------------------------------------------------------------------
    # AST extraction
    # -------------------------------------------------------------------------
    def _extract_with_ast(self, ast: Node, content: str, info: FileInfo, ext: str):
        info.imports = self.ts_parser.extract_imports(ast, content)
        info.exports = self.ts_parser.extract_exports(ast, content)
        info.exported_symbols = info.exports.copy()
        info.hook_usage = self.ts_parser.extract_hooks(ast, content)
        info.has_jsx = self.ts_parser.has_jsx(ast)
        info.any_count = self.ts_parser.count_any(ast, content)
        info.complexity_estimate = self.ts_parser.calculate_complexity(ast)

        # React component detection
        self._detect_react_components(ast, content, info)

        # Side effects & dynamic imports
        self._detect_side_effects_and_dynamic(content, info)

        # Count interfaces, types, functions, classes
        if ext in {'.ts', '.tsx'}:
            info.interface_count = len([n for n in ast.children if n.type == 'interface_declaration'])
            info.type_count = len([n for n in ast.children if n.type == 'type_alias_declaration'])
        info.function_count = len([n for n in ast.children if n.type == 'function_declaration'])
        info.class_count = len([n for n in ast.children if n.type == 'class_declaration'])

    def _extract_with_regex(self, content: str, info: FileInfo, ext: str):
        info.imports = self.regex_parser.extract_imports(content, ext)
        info.exports = self.regex_parser.extract_exports(content, ext)
        info.exported_symbols = info.exports.copy()
        info.hook_usage = self.regex_parser.extract_hooks(content)
        info.has_jsx = self.regex_parser.has_jsx(content)
        info.any_count = self.regex_parser.count_any(content)
        info.complexity_estimate = self.regex_parser.calculate_complexity(content)

        # Basic React detection
        if re.search(r'function\s+[A-Z]\w+\s*\([^)]*\)\s*\{[^}]*return\s*\(?<', content) or \
           re.search(r'const\s+[A-Z]\w+\s*=\s*\([^)]*\)\s*=>\s*\(?<', content):
            info.is_react_component = True
            info.component_type = 'function'
        elif 'React.Component' in content or ('Component' in content and 'extends' in content):
            info.is_react_component = True
            info.component_type = 'class'

        if info.name.startswith('use') and re.search(r'export\s+(?:const|function)\s+(use[A-Z]\w+)', content):
            info.is_custom_hook = True

        self._detect_side_effects_and_dynamic(content, info)

        # Counts
        info.interface_count = len(re.findall(r'\binterface\s+\w+', content))
        info.type_count = len(re.findall(r'\btype\s+\w+\s*=', content))
        info.function_count = len(re.findall(r'\bfunction\s+\w+', content))
        info.class_count = len(re.findall(r'\bclass\s+\w+', content))

    def _detect_react_components(self, ast: Node, content: str, info: FileInfo):
        # Function/arrow components with JSX
        funcs = [n for n in ast.children if n.type in {'function_declaration', 'arrow_function'}]
        for node in funcs:
            if self.ts_parser.has_jsx(node):
                info.is_react_component = True
                info.component_type = 'function' if node.type == 'function_declaration' else 'arrow'
                # extract name
                name_node = self.ts_parser._find_identifier(node, content)
                if name_node:
                    info.exported_symbols.append(name_node)
                break
        # Class components
        classes = [n for n in ast.children if n.type == 'class_declaration']
        for node in classes:
            text = content[node.start_byte:node.end_byte]
            if 'extends' in text and ('Component' in text or 'React.Component' in text):
                info.is_react_component = True
                info.component_type = 'class'
                break
        # Custom hooks
        for node in funcs:
            name_node = self.ts_parser._find_identifier(node, content)
            if name_node and name_node.startswith('use'):
                if self.ts_parser.extract_hooks(node, content):
                    info.is_custom_hook = True
                    break

    def _detect_side_effects_and_dynamic(self, content: str, info: FileInfo):
        info.has_side_effects = any(p in content for p in Config.SIDE_EFFECT_PATTERNS)
        info.is_dynamic_imported = any(re.search(p, content) for p in Config.DYNAMIC_IMPORT_PATTERNS)

    # -------------------------------------------------------------------------
    # File classification
    # -------------------------------------------------------------------------
    def _classify_file(self, path: Path, content: str, info: FileInfo) -> FileCategory:
        rel = str(path).lower()
        name = path.name.lower()

        if path.suffix == '.d.ts' or 'types' in rel:
            return FileCategory.TYPE_DEFINITION
        if 'constant' in name or 'const' in name:
            return FileCategory.CONSTANTS
        if name in {'index.ts', 'index.tsx', 'index.js', 'index.jsx'} and len(info.exports) >= Config.BARREL_EXPORT_THRESHOLD:
            return FileCategory.BARREL
        if any(p in content for p in Config.FRAMEWORK_CORE_PATTERNS) and \
           any(infra in rel for infra in Config.INFRASTRUCTURE_PATHS):
            return FileCategory.FRAMEWORK_CORE
        if info.is_custom_hook:
            return FileCategory.CUSTOM_HOOK
        if 'route' in rel or 'page' in rel or '_app' in name:
            return FileCategory.PAGE_OR_ROUTE
        if 'context' in rel or 'Context' in path.name:
            return FileCategory.CONTEXT
        if 'store' in rel or 'state' in rel or 'redux' in rel:
            return FileCategory.STORE_OR_STATE
        if 'component' in rel or path.suffix in {'.tsx', '.jsx'}:
            if info.is_react_component:
                return FileCategory.UI_COMPONENT
        if 'service' in rel or 'api' in rel:
            return FileCategory.SERVICE
        if 'util' in rel or 'helper' in rel:
            return FileCategory.UTILITY
        if 'test' in rel or 'spec' in rel or '__tests__' in rel:
            return FileCategory.TEST
        if 'config' in rel or path.suffix in {'.json', '.yml', '.yaml'}:
            return FileCategory.CONFIGURATION
        if 'asset' in rel or path.suffix in {'.css', '.scss'}:
            return FileCategory.ASSET
        if 'script' in rel:
            return FileCategory.SCRIPT
        if info.is_react_component:
            return FileCategory.UI_COMPONENT
        if 'describe(' in content or 'it(' in content:
            return FileCategory.TEST
        if path.suffix == '.py':
            return FileCategory.PYTHON_MODULE
        if path.suffix in Config.ASSET_EXTENSIONS:
            return FileCategory.ASSET
        if info.is_entry_point:
            return FileCategory.ENTRY_POINT
        return FileCategory.CORE_LOGIC

    def _is_test_file(self, path: Path) -> bool:
        name = path.name.lower()
        return any(x in name for x in ['test', 'spec', '__tests__'])

    def _is_barrel_file(self, path: Path, exports: List[str], imports: List[str]) -> bool:
        if path.name not in {'index.ts', 'index.tsx', 'index.js', 'index.jsx'}:
            return False
        # Heuristic: at least 3 exports and some imports re‑exported
        return len(exports) >= Config.BARREL_EXPORT_THRESHOLD and len(imports) > 0


# =============================================================================
# DEPENDENCY GRAPH BUILDER
# =============================================================================
class DependencyGraphBuilder:
    """Builds dependency graph, resolves relative imports, marks barrels and dynamic imports."""

    def __init__(self, project_root: Path, files: Dict[str, FileInfo], logger: logging.Logger):
        self.project_root = project_root
        self.files = files
        self.logger = logger
        self.graph: Dict[str, List[str]] = defaultdict(list)
        self.ts_resolver = None
        if TS_COMPILER_AVAILABLE:
            # Stub for future TypeScript compiler API integration
            pass

    def build(self) -> Dict[str, List[str]]:
        self.logger.info("Building dependency graph...")
        for path, meta in self.files.items():
            for imp in meta.imports:
                resolved = self._resolve_import(path, imp)
                if resolved and resolved in self.files:
                    self.files[resolved].dependents.add(path)
                    meta.dependencies.add(resolved)
                    self.graph[path].append(resolved)

        for path, meta in self.files.items():
            meta.dependents_count = len(meta.dependents)

        self._mark_barrel_exports()
        self._detect_dynamic_imports()
        self.logger.info(f"Dependency graph built: {len(self.graph)} nodes.")
        return dict(self.graph)

    def _resolve_import(self, from_file: str, import_path: str) -> Optional[str]:
        if not import_path.startswith('.'):
            return None
        from_path = Path(self.project_root) / from_file
        from_dir = from_path.parent
        target = (from_dir / import_path).resolve()

        # Try with supported extensions
        for ext in Config.SUPPORTED_EXTENSIONS:
            candidate = target.with_suffix(ext)
            rel = normalize_path(candidate, self.project_root)
            if rel in self.files:
                return rel
        # Try index files
        for ext in Config.SUPPORTED_EXTENSIONS:
            candidate = target / f'index{ext}'
            rel = normalize_path(candidate, self.project_root)
            if rel in self.files:
                return rel
        return None

    def _mark_barrel_exports(self):
        for path, meta in self.files.items():
            if meta.is_barrel_file:
                for dep in meta.dependencies:
                    if dep in self.files:
                        self.files[dep].is_barrel_exported = True

    def _detect_dynamic_imports(self):
        pattern = re.compile(r'import\s*\(["\']([^"\']+)["\']\)')
        for path, meta in self.files.items():
            try:
                with open(meta.path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                for match in pattern.findall(content):
                    resolved = self._resolve_import(path, match)
                    if resolved and resolved in self.files:
                        self.files[resolved].is_dynamic_imported = True
            except:
                pass


# =============================================================================
# DUPLICATE DETECTOR
# =============================================================================
class DuplicateDetector:
    """Detects exact and structural duplicates using content/structural hashes and similarity."""

    def __init__(self, files: Dict[str, FileInfo], logger: logging.Logger):
        self.files = files
        self.logger = logger
        self.clusters: List[DuplicateCluster] = []
        self.cluster_counter = 0

    def detect(self, use_parallel: bool = True) -> List[DuplicateCluster]:
        self.logger.info("Detecting duplicates...")
        self._detect_exact_duplicates()
        self._detect_structural_duplicates(use_parallel)
        self.logger.info(f"Found {len(self.clusters)} duplicate clusters.")
        return self.clusters

    def _detect_exact_duplicates(self):
        hash_groups = defaultdict(list)
        for path, meta in self.files.items():
            if meta.category not in {FileCategory.ASSET, FileCategory.CONFIGURATION}:
                hash_groups[meta.content_hash].append(path)
        for h, paths in hash_groups.items():
            if len(paths) > 1:
                self._create_cluster(paths, 1.0, 'exact')

    def _detect_structural_duplicates(self, use_parallel: bool):
        # Group by structural hash first
        struct_groups = defaultdict(list)
        for path, meta in self.files.items():
            if meta.category not in {FileCategory.ASSET, FileCategory.CONFIGURATION} and not meta.duplicate_of:
                struct_groups[meta.structural_hash].append(path)

        candidate_groups = [paths for paths in struct_groups.values() if len(paths) > 1]

        if use_parallel:
            with ProcessPoolExecutor(max_workers=Config.MAX_WORKERS_CPU) as executor:
                futures = [executor.submit(self._analyse_group, group) for group in candidate_groups]
                for future in as_completed(futures):
                    try:
                        cluster = future.result()
                        if cluster:
                            self.clusters.append(cluster)
                    except Exception as e:
                        self.logger.error(f"Error in structural analysis: {e}")
        else:
            for group in candidate_groups:
                cluster = self._analyse_group(group)
                if cluster:
                    self.clusters.append(cluster)

    def _analyse_group(self, group: List[str]) -> Optional[DuplicateCluster]:
        if len(group) < 2:
            return None

        # Compute pairwise similarity
        base = group[0]
        base_info = self.files[base]
        base_exports_imports = set(base_info.exports + base_info.imports)

        cluster_files = [base]
        for other in group[1:]:
            other_info = self.files[other]
            other_set = set(other_info.exports + other_info.imports)
            sim = jaccard_similarity(base_exports_imports, other_set)
            if sim >= Config.SIMILARITY_THRESHOLD:
                cluster_files.append(other)

        if len(cluster_files) < 2:
            return None

        # Compute average similarity
        total_sim = 0.0
        count = 0
        for i, a in enumerate(cluster_files):
            for b in cluster_files[i+1:]:
                a_set = set(self.files[a].exports + self.files[a].imports)
                b_set = set(self.files[b].exports + self.files[b].imports)
                total_sim += jaccard_similarity(a_set, b_set)
                count += 1
        avg_sim = total_sim / count if count else Config.SIMILARITY_THRESHOLD

        self._create_cluster(cluster_files, avg_sim, 'structural')
        return self.clusters[-1]  # last created

    def _create_cluster(self, paths: List[str], similarity: float, ctype: str):
        self.cluster_counter += 1
        cid = f"dup_{self.cluster_counter:04d}"

        exported = sum(1 for p in paths if self.files[p].exports)
        recent = sum(1 for p in paths if self.files[p].days_since_modified < 60)

        # Score files for base selection (stability + dependents + exports)
        scored = []
        for p in paths:
            m = self.files[p]
            score = (m.stability_score * 10 + len(m.dependents) * 20 +
                     len(m.exports) * 5 + (10 if not m.has_side_effects else 0) -
                     m.any_count * 2)
            scored.append((p, score))
        scored.sort(key=lambda x: x[1], reverse=True)
        base = scored[0][0]
        merge_target = scored[1][0] if len(scored) > 1 else None

        diff_summary = ["Files are structurally similar."]
        if ctype == 'exact':
            risk = RiskLevel.LOW
            rec = Recommendation.MERGE
            conf = 0.95
        else:
            has_exports = any(self.files[p].exports for p in paths)
            has_dependents = any(len(self.files[p].dependents) > 0 for p in paths)
            if has_exports and has_dependents:
                risk = RiskLevel.HIGH
                rec = Recommendation.INVESTIGATE
                conf = 0.60
            elif has_exports or has_dependents:
                risk = RiskLevel.MEDIUM
                rec = Recommendation.MERGE
                conf = 0.75
            else:
                risk = RiskLevel.LOW
                rec = Recommendation.MERGE
                conf = 0.80

        total_lines = sum(self.files[p].lines for p in paths)
        base_lines = self.files[base].lines
        savings = total_lines - base_lines

        cluster = DuplicateCluster(
            cluster_id=cid,
            files=paths,
            cluster_size=len(paths),
            similarity_score=similarity,
            exported_files_count=exported,
            recent_files_count=recent,
            suggested_base_file=base,
            suggested_merge_target=merge_target,
            diff_summary=diff_summary,
            risk_level=risk,
            recommendation=rec,
            confidence_score=conf,
            type=ctype,
            estimated_savings=savings
        )
        self.clusters.append(cluster)
        for p in paths:
            self.files[p].duplicate_cluster_id = cid
            if p != base:
                self.files[p].duplicate_of = base


# =============================================================================
# USAGE ANALYZER (with unwired classification – no Git)
# =============================================================================
class UsageAnalyzer:
    """Identifies unused files and unwired components, classifies unwired by recency."""

    def __init__(self, files: Dict[str, FileInfo], logger: logging.Logger):
        self.files = files
        self.logger = logger
        self.unused: List[str] = []
        self.unwired: List[str] = []

    def analyze(self) -> Tuple[List[str], List[str]]:
        self.logger.info("Analyzing usage patterns...")
        self._detect_unused()
        self._detect_unwired()
        self.logger.info(f"Unused files: {len(self.unused)}, Unwired components: {len(self.unwired)}")
        return self.unused, self.unwired

    def _detect_unused(self):
        for path, meta in self.files.items():
            if meta.is_entry_point or meta.category in {
                FileCategory.CONFIGURATION, FileCategory.ASSET, FileCategory.TEST,
                FileCategory.FRAMEWORK_CORE, FileCategory.BARREL
            }:
                continue
            if meta.is_dynamic_imported or meta.is_barrel_exported:
                continue
            if meta.dependents_count == 0 and meta.exports:
                self.unused.append(path)

    def _detect_unwired(self):
        for path, meta in self.files.items():
            if path in self.unused:
                continue
            if (meta.dependents_count == 0 and
                meta.lines >= Config.MIN_LINES_FOR_UNWIRED and
                len(meta.exports) >= Config.MIN_EXPORTS_FOR_UNWIRED and
                meta.category in {
                    FileCategory.SERVICE, FileCategory.UI_COMPONENT,
                    FileCategory.CUSTOM_HOOK, FileCategory.CORE_LOGIC,
                    FileCategory.PYTHON_MODULE
                } and
                not meta.is_dynamic_imported and
                not meta.is_barrel_exported and
                not meta.is_entry_point):

                # Classify without Git
                meta.unwired_type = self._classify_unwired(meta)
                self.unwired.append(path)

    def _classify_unwired(self, meta: FileInfo) -> UnwiredType:
        """Classify unwired component based on recency and size/exports."""
        days = meta.days_since_modified
        if days <= Config.RECENT_CHANGE_DAYS:
            return UnwiredType.NEW_FEATURE
        elif days >= Config.STALE_DAYS:
            return UnwiredType.DEAD_CODE
        else:
            # If it has reasonable exports and size, consider orphaned useful
            if len(meta.exports) >= 3 and meta.lines >= 100:
                return UnwiredType.ORPHANED_USEFUL
            else:
                return UnwiredType.DEAD_CODE

    def get_similar_files(self, file_path: str, top_n: int = 3) -> List[Tuple[str, float]]:
        """Find files with similar exports/imports to suggest wiring."""
        file_info = self.files.get(file_path)
        if not file_info:
            return []
        exports_set = set(file_info.exports)
        if not exports_set:
            return []
        similarities = []
        for path, other in self.files.items():
            if path == file_path or other.category != file_info.category:
                continue
            other_exports = set(other.exports)
            if not other_exports:
                continue
            sim = jaccard_similarity(exports_set, other_exports)
            if sim >= Config.WIRING_SIMILARITY_THRESHOLD:
                similarities.append((path, sim))
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:top_n]


# =============================================================================
# WIRING ENGINE (generates suggestions for unwired components)
# =============================================================================
class WiringEngine:
    """Generates wiring suggestions for unwired components based on similarity to wired files."""

    def __init__(self, files: Dict[str, FileInfo], unwired_paths: List[str]):
        self.files = files
        self.unwired_paths = unwired_paths

    def generate_suggestions(self):
        """Populate wiring_suggestions for each unwired file."""
        for path in self.unwired_paths:
            if path not in self.files:
                continue
            suggestions = self._suggest_for_file(path)
            self.files[path].wiring_suggestions = suggestions

    def _suggest_for_file(self, unwired_path: str) -> List[WiringSuggestion]:
        unwired = self.files[unwired_path]
        suggestions = []
        for path, candidate in self.files.items():
            if path == unwired_path or path in self.unwired_paths:
                continue
            if len(candidate.dependents) == 0:
                continue
            score = self._calculate_similarity(unwired, candidate)
            if score >= Config.WIRING_SIMILARITY_THRESHOLD:
                common_exports = list(set(unwired.exports) & set(candidate.exports))
                common_imports = list(set(unwired.imports) & set(candidate.imports))
                suggestions.append(WiringSuggestion(
                    target_file=path,
                    similarity_score=score,
                    reason=self._explain_similarity(unwired, candidate, score),
                    integration_point=self._suggest_integration(candidate),
                    common_exports=common_exports[:5],
                    common_imports=common_imports[:5]
                ))
        suggestions.sort(key=lambda x: x.similarity_score, reverse=True)
        return suggestions[:5]  # top 5

    def _calculate_similarity(self, a: FileInfo, b: FileInfo) -> float:
        """Combine category, export/import Jaccard, structural hash."""
        score = 0.0
        # Category match (40%)
        if a.category == b.category:
            score += 0.4
        # Exports Jaccard (30%)
        exports_sim = jaccard_similarity(set(a.exports), set(b.exports))
        imports_sim = jaccard_similarity(set(a.imports), set(b.imports))
        score += 0.3 * (exports_sim + imports_sim) / 2
        # Structural hash match (20%)
        if a.structural_hash == b.structural_hash:
            score += 0.2
        # Recency similarity (10%) – both recent or both old
        recency_a = 1.0 / (1 + a.days_since_modified / 30)
        recency_b = 1.0 / (1 + b.days_since_modified / 30)
        recency_sim = 1 - abs(recency_a - recency_b)
        score += 0.1 * recency_sim
        return min(score, 1.0)

    def _explain_similarity(self, a: FileInfo, b: FileInfo, score: float) -> str:
        reasons = []
        if a.category == b.category:
            reasons.append(f"Same category ({a.category.value})")
        common_exports = set(a.exports) & set(b.exports)
        if common_exports:
            reasons.append(f"Common exports: {', '.join(list(common_exports)[:3])}")
        common_imports = set(a.imports) & set(b.imports)
        if len(common_imports) > 2:
            reasons.append(f"{len(common_imports)} common dependencies")
        return " | ".join(reasons) if reasons else f"Similarity: {score:.0%}"

    def _suggest_integration(self, candidate: FileInfo) -> str:
        if candidate.is_barrel_file:
            return f"Add to barrel exports in {candidate.relative_path}"
        elif candidate.dependents:
            return f"Used by {len(candidate.dependents)} files – integrate similarly"
        else:
            return "Direct import recommended"


# =============================================================================
# STABILITY & RISK CALCULATOR
# =============================================================================
class StabilityCalculator:
    """Computes stability score and risk level for each file."""

    def __init__(self, files: Dict[str, FileInfo], logger: logging.Logger):
        self.files = files
        self.logger = logger

    def calculate(self):
        self.logger.info("Computing stability and risk...")
        for meta in self.files.values():
            meta.stability_score = self._compute_stability(meta)
            meta.risk_score = self._compute_risk_score(meta)
            meta.risk_level = self._risk_level_from_score(meta.risk_score)
            meta.short_reason = self._generate_short_reason(meta)

    def _compute_stability(self, meta: FileInfo) -> float:
        """Stability score 0-100."""
        score = 0.0
        weights = Config.STABILITY_WEIGHTS
        # Dependents (more = more stable)
        if meta.dependents:
            dep_score = min(len(meta.dependents) / 10, 1.0)
            score += weights['dependents'] * dep_score * 100
        # Exports (more = more useful)
        if meta.exports:
            exp_score = min(len(meta.exports) / 5, 1.0)
            score += weights['exports'] * exp_score * 100
        # Size (moderate = better)
        size_score = 1.0 - abs(meta.lines - 200) / 500
        size_score = max(0, min(1, size_score))
        score += weights['size'] * size_score * 100
        # Recency (recent changes = active)
        recency_score = 1.0 / (1 + meta.days_since_modified / 30)
        score += weights['recency'] * recency_score * 100
        # Penalties
        penalty = 0
        if meta.is_test_file:
            penalty += 0.2
        if meta.duplicate_of:
            penalty += 0.5
        if len(meta.issues) > 3:
            penalty += 0.3
        score -= weights['penalties'] * penalty * 100
        return max(0, min(100, score))

    def _compute_risk_score(self, meta: FileInfo) -> float:
        """Risk score 0-100."""
        risk = 0.0
        # Complexity
        if meta.complexity_estimate > Config.COMPLEXITY_HIGH_THRESHOLD:
            risk += 20
        elif meta.complexity_estimate > 20:
            risk += 10
        # Type safety
        if meta.any_count > 5:
            risk += 15
        elif meta.any_count > 0:
            risk += 5
        # Size
        if meta.lines > 500:
            risk += 15
        elif meta.lines > 300:
            risk += 10
        # Issues
        risk += len(meta.issues) * 5
        # Unused/unwired
        if meta.dependents_count == 0 and not meta.is_entry_point:
            risk += 20
        # Duplicates
        if meta.duplicate_of:
            risk += 25
        return min(100, risk)

    def _risk_level_from_score(self, score: float) -> RiskLevel:
        if score >= 70:
            return RiskLevel.CRITICAL
        if score >= 50:
            return RiskLevel.HIGH
        if score >= 30:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW

    def _generate_short_reason(self, meta: FileInfo) -> str:
        reasons = []
        if meta.is_entry_point:
            reasons.append("Entry point")
        if meta.dependents_count > 5:
            reasons.append(f"High dependents ({meta.dependents_count})")
        if meta.stability_score > 70:
            reasons.append(f"High stability ({meta.stability_score:.1f}/100)")
        if meta.dependents_count == 0 and meta.exports:
            reasons.append("No dependents")
        if meta.days_since_modified > 180:
            reasons.append(f"Not modified in {meta.days_since_modified} days")
        if meta.is_dynamic_imported:
            reasons.append("Dynamically imported")
        if meta.is_barrel_exported:
            reasons.append("Exported via barrel")
        if meta.has_side_effects:
            reasons.append("Contains side effects")
        if meta.any_count > 5:
            reasons.append(f"Weak typing ({meta.any_count} 'any')")
        return " | ".join(reasons) if reasons else "Standard file"


# =============================================================================
# RECOMMENDATION ENGINE
# =============================================================================
class RecommendationEngine:
    """Generates file‑specific recommendations based on all analysis data."""

    def __init__(self, files: Dict[str, FileInfo], duplicates: List[DuplicateCluster],
                 unused: List[str], unwired: List[str], logger: logging.Logger):
        self.files = files
        self.duplicates = duplicates
        self.unused = unused
        self.unwired = unwired
        self.logger = logger

    def generate_recommendations(self):
        self.logger.info("Generating recommendations...")
        for meta in self.files.values():
            rec, reasons, conf = self._recommend_for_file(meta)
            meta.recommendation = rec
            meta.detailed_reasoning = reasons
            meta.recommendation_confidence = conf

    def _recommend_for_file(self, meta: FileInfo) -> Tuple[Recommendation, List[str], float]:
        # Critical / entry point
        if meta.is_entry_point:
            return Recommendation.KEEP, [
                "Application entry point – critical",
                "Required for bootstrap"
            ], 1.0
        if meta.category == FileCategory.FRAMEWORK_CORE:
            return Recommendation.KEEP, [
                "Framework core infrastructure",
                "High risk if modified"
            ], 1.0
        if meta.dependents_count >= Config.CRITICAL_DEPENDENCY_THRESHOLD:
            return Recommendation.KEEP, [
                f"Critical shared module – {meta.dependents_count} dependents"
            ], 0.95

        # Duplicate
        if meta.duplicate_of:
            return Recommendation.MERGE, [
                f"Duplicate of {Path(meta.duplicate_of).name}",
                f"Confidence: {self.files[meta.duplicate_of].stability_score:.0f}/100"
            ], 0.95
        if meta.duplicate_cluster_id:
            cluster = next((c for c in self.duplicates if c.cluster_id == meta.duplicate_cluster_id), None)
            if cluster:
                if meta.path == cluster.suggested_base_file:
                    return Recommendation.KEEP, [
                        "Primary implementation in duplicate cluster",
                        f"Other {cluster.cluster_size-1} files should merge into this"
                    ], 0.90
                else:
                    return Recommendation.MERGE, [
                        f"Similar to {Path(cluster.suggested_base_file).name}",
                        f"Similarity: {cluster.similarity_score:.0%}"
                    ], 0.85

        # Unwired classification
        if meta.unwired_type:
            if meta.unwired_type == UnwiredType.DEAD_CODE:
                return Recommendation.ARCHIVE, [
                    "Unwired dead code with no recent activity",
                    f"Not modified in {meta.days_since_modified} days"
                ], 0.80
            elif meta.unwired_type == UnwiredType.NEW_FEATURE:
                return Recommendation.WIRE, [
                    "New feature not yet integrated",
                    "Review and wire to application"
                ], 0.70
            elif meta.unwired_type == UnwiredType.ORPHANED_USEFUL:
                return Recommendation.WIRE, [
                    "Orphaned component with substantial exports",
                    "Consider wiring or explicit deprecation"
                ], 0.75

        # Unused (no dependents, but not in unwired category)
        if meta.path in self.unused:
            if meta.days_since_modified > 180 and meta.lines < 200:
                return Recommendation.ARCHIVE, [
                    "Small unused file, dormant for a long time"
                ], 0.80
            else:
                return Recommendation.INVESTIGATE, [
                    "Exported but not imported",
                    "Verify usage before removal"
                ], 0.65

        # Type safety
        if meta.any_count > 5:
            return Recommendation.ADD_TYPE_SAFETY, [
                f"Weak type safety: {meta.any_count} 'any' usages",
                "Replace with specific types"
            ], 0.85

        # High complexity
        if meta.complexity_estimate > Config.COMPLEXITY_HIGH_THRESHOLD:
            return Recommendation.REDUCE_COMPLEXITY, [
                f"High cyclomatic complexity: {meta.complexity_estimate}",
                "Break into smaller functions"
            ], 0.80

        # Large file
        if meta.lines > 500:
            return Recommendation.REFACTOR, [
                f"Large file: {meta.lines} lines",
                "Split into multiple modules"
            ], 0.75

        # Outdated React patterns
        if meta.is_react_component and meta.component_type == "class":
            return Recommendation.MODERNIZE_IMPLEMENTATION, [
                "Class component – migrate to functional with hooks"
            ], 0.70

        # Missing tests (simple heuristic)
        if meta.category in {FileCategory.UI_COMPONENT, FileCategory.SERVICE, FileCategory.CORE_LOGIC} and meta.lines > 50:
            test_exists = any(
                f.is_test_file and
                f.name.replace('.test', '').replace('.spec', '') == meta.name
                for f in self.files.values()
            )
            if not test_exists:
                return Recommendation.INVESTIGATE, [
                    "No corresponding test file found",
                    "Add unit tests"
                ], 0.65

        # Default
        return Recommendation.KEEP, [
            f"Stability: {meta.stability_score:.1f}/100",
            f"Used by {meta.dependents_count} file(s)" if meta.dependents_count else "No dependents"
        ], 0.70


# =============================================================================
# ARCHIVE DECISION ENGINE
# =============================================================================
class ArchiveDecisionEngine:
    """Evaluates whether a file is safe to archive."""

    def __init__(self, files: Dict[str, FileInfo], logger: logging.Logger):
        self.files = files
        self.logger = logger

    def evaluate_archive_candidate(self, file_info: FileInfo) -> ArchiveDecision:
        blockers = []
        reasons = []
        alternatives = []

        # Hard blockers
        if file_info.category in {
            FileCategory.PAGE_OR_ROUTE, FileCategory.CONTEXT,
            FileCategory.STORE_OR_STATE, FileCategory.FRAMEWORK_CORE,
            FileCategory.BARREL, FileCategory.ENTRY_POINT
        }:
            blockers.append(f"Critical category: {file_info.category.value}")
        if file_info.is_dynamic_imported:
            blockers.append("Dynamically imported – required for code splitting")
        if file_info.days_since_modified < Config.RECENT_CHANGE_DAYS:
            blockers.append(f"Recently modified ({file_info.days_since_modified} days ago)")
        if file_info.dependents_count > 0:
            blockers.append(f"Has {file_info.dependents_count} active dependents")
        if file_info.is_barrel_exported:
            blockers.append("Exported via barrel – part of public API")
        if file_info.is_entry_point:
            blockers.append("Application entry point – absolutely critical")
        if any(infra in file_info.path.lower() for infra in Config.INFRASTRUCTURE_PATHS):
            blockers.append("Infrastructure/core path")

        if blockers:
            return ArchiveDecision(
                allowed=False,
                decision=Recommendation.KEEP,
                score=0.0,
                reasons=reasons,
                blockers=blockers,
                confidence=1.0,
                impact_analysis=f"Archiving would break {file_info.dependents_count} dependent(s)" if file_info.dependents_count else "Critical system file",
                alternatives=["Keep as-is", "Refactor if problematic"]
            )

        # Confidence scoring
        score = 50.0
        if file_info.dependents_count == 0:
            score += 15
            reasons.append("No active dependents")
        if not file_info.exports:
            score += 10
            reasons.append("No exports – internal implementation only")
        if file_info.days_since_modified > 180:
            score += 10
            reasons.append(f"Dormant for {file_info.days_since_modified} days")
        elif file_info.days_since_modified > 90:
            score += 5
            reasons.append(f"Not modified in {file_info.days_since_modified} days")
        if file_info.stability_score < 30:
            score += 8
            reasons.append(f"Low stability ({file_info.stability_score:.1f}/100)")
        if file_info.lines < 50:
            score += 5
            reasons.append("Small file – low impact")
        if file_info.category in {FileCategory.UTILITY, FileCategory.UNKNOWN}:
            score += 5
            reasons.append("Non‑critical category")

        # Penalties
        if file_info.exports:
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
            reasons.append("React component – may be reusable")
        if file_info.is_custom_hook:
            score -= 8
            reasons.append("Custom hook – potential shared logic")
        if len(file_info.hook_usage) > 3:
            score -= 5
            reasons.append(f"Uses {len(file_info.hook_usage)} hooks")
        if file_info.any_count > 5:
            score -= 5
            reasons.append("Weak type safety")

        if score >= Config.ARCHIVE_SCORE_THRESHOLD:
            return ArchiveDecision(
                allowed=True,
                decision=Recommendation.ARCHIVE,
                score=score,
                reasons=reasons,
                blockers=[],
                confidence=0.85,
                impact_analysis="Minimal – no active dependencies",
                alternatives=["Archive with full metadata", "Restore if needed"]
            )
        elif score >= Config.INVESTIGATE_LOW_THRESHOLD:
            return ArchiveDecision(
                allowed=True,
                decision=Recommendation.INVESTIGATE,
                score=score,
                reasons=reasons + ["Low risk but needs manual review"],
                blockers=[],
                confidence=0.70,
                impact_analysis="Low risk, verify before archiving",
                alternatives=["Review usage history", "Archive after verification"]
            )
        elif score >= Config.INVESTIGATE_MEDIUM_THRESHOLD:
            return ArchiveDecision(
                allowed=True,
                decision=Recommendation.INVESTIGATE,
                score=score,
                reasons=reasons + ["Medium risk – careful review required"],
                blockers=[],
                confidence=0.55,
                impact_analysis="Medium risk, thorough review required",
                alternatives=["Detailed code review", "Check for dynamic references"]
            )
        else:
            return ArchiveDecision(
                allowed=False,
                decision=Recommendation.KEEP,
                score=score,
                reasons=reasons,
                blockers=["Risk too high for archival"],
                confidence=0.40,
                impact_analysis="Risk too high for archival",
                alternatives=["Keep as-is", "Monitor", "Reconsider after refactoring"]
            )


# =============================================================================
# ARCHIVE BUILDER (Safe ZIP creation)
# =============================================================================
class ArchiveBuilder:
    """Creates a ZIP archive of selected files with metadata, never modifies sources."""

    def __init__(self, project_path: Path, report_folder: Path,
                 files: Dict[str, FileInfo], logger: logging.Logger):
        self.project_path = project_path
        self.report_folder = report_folder
        self.files = files
        self.logger = logger

    def create_safe_archive(self, candidates: List[str], dry_run: bool = False) -> Optional[Path]:
        if not candidates:
            self.logger.warning("No files to archive")
            return None

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        archive_name = f"refactor_archive_{timestamp}.zip"
        archives_dir = self.report_folder / Config.ARCHIVES_SUBDIR
        archives_dir.mkdir(parents=True, exist_ok=True)
        archive_path = archives_dir / archive_name

        if dry_run:
            self.logger.info(f"[DRY RUN] Would create archive: {archive_path} with {len(candidates)} files")
            return None

        temp_dir = self.report_folder / f"temp_archive_{timestamp}"
        temp_dir.mkdir(parents=True)

        metadata = {
            'timestamp': timestamp,
            'total_files': len(candidates),
            'tool_version': Config.VERSION,
            'files': []
        }

        copied = 0
        for file_path in candidates:
            try:
                src = Path(file_path)
                if not src.exists():
                    continue
                rel = src.relative_to(self.project_path)
                dst = temp_dir / rel
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dst)
                meta = self.files.get(file_path)
                if meta:
                    metadata['files'].append({
                        'path': str(rel),
                        'size': meta.size,
                        'lines': meta.lines,
                        'category': meta.category.value,
                        'risk_level': meta.risk_level.value,
                        'stability_score': meta.stability_score,
                        'recommendation': meta.recommendation.value,
                        'reasoning': meta.short_reason,
                        'last_modified_days': meta.days_since_modified
                    })
                copied += 1
            except Exception as e:
                self.logger.error(f"Error archiving {file_path}: {e}")

        with open(temp_dir / 'metadata.json', 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)

        try:
            with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for root, _, files in os.walk(temp_dir):
                    for file in files:
                        file_path = Path(root) / file
                        arcname = file_path.relative_to(temp_dir.parent)
                        zipf.write(file_path, arcname)
            self.logger.info(f"Archive created: {archive_path} ({copied} files)")
        except Exception as e:
            self.logger.error(f"ZIP creation failed: {e}")
            shutil.rmtree(temp_dir, ignore_errors=True)
            return None

        # Create "latest" symlink/copy
        latest_link = archives_dir / "latest_archive.zip"
        try:
            if latest_link.exists():
                latest_link.unlink()
            shutil.copy2(archive_path, latest_link)
        except:
            pass

        shutil.rmtree(temp_dir, ignore_errors=True)
        return archive_path


# =============================================================================
# REPORT GENERATOR (JSON, CSV, HTML with vis-network)
# =============================================================================
class ReportGenerator:
    """Generates all output artifacts: JSON, CSV, HTML dashboard with dependency graph."""

    def __init__(self, report: AnalysisReport, report_folder: Path, logger: logging.Logger):
        self.report = report
        self.report_folder = report_folder
        self.logger = logger
        self.files_dict = report.files

    def generate_all(self):
        self.logger.info("Generating reports...")
        self.generate_full_json()
        self.generate_summary_json()
        self.generate_high_risk_csv()
        self.generate_dependency_graph_json()
        self.generate_html_dashboard()
        self.generate_report_index()
        self.logger.info(f"Reports saved to {self.report_folder}")

    def generate_full_json(self):
        path = self.report_folder / 'full_report.json'
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(asdict(self.report), f, indent=2, default=str)
        self.logger.info(f"  Wrote {path.name}")

    def generate_summary_json(self):
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
            'risk_distribution': self.report.risk_distribution,
            'quality_metrics': self.report.quality_metrics
        }
        path = self.report_folder / 'summary_report.json'
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2)
        self.logger.info(f"  Wrote {path.name}")

    def generate_high_risk_csv(self):
        path = self.report_folder / 'high_risk.csv'
        with open(path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['File', 'Risk', 'Stability', 'Recommendation', 'Reasoning'])
            for p, d in self.report.files.items():
                if d['risk_level'] in ['HIGH', 'CRITICAL']:
                    writer.writerow([
                        d['relative_path'],
                        d['risk_level'],
                        f"{d['stability_score']:.1f}",
                        d['recommendation'],
                        d['short_reason']
                    ])
        self.logger.info(f"  Wrote {path.name}")

    def generate_dependency_graph_json(self):
        """Generate JSON for vis-network."""
        nodes = []
        edges = []
        node_ids = set()
        for path, data in self.report.files.items():
            node_id = data['relative_path']
            node_ids.add(node_id)
            # Color coding
            if path in self.report.unused_candidates:
                color = '#ef4444'
                status = 'unused'
            elif path in self.report.unwired_candidates:
                color = '#f59e0b'
                status = 'unwired'
            elif data['risk_level'] == 'CRITICAL':
                color = '#dc2626'
                status = 'critical'
            elif data['risk_level'] == 'HIGH':
                color = '#f97316'
                status = 'high_risk'
            elif data['dependents_count'] > 0:
                color = '#10b981'
                status = 'used'
            else:
                color = '#94a3b8'
                status = 'neutral'
            size = 10 + min(data['dependents_count'] * 2, 40)
            nodes.append({
                'id': node_id,
                'label': Path(node_id).name,
                'title': f"{node_id}\nDependents: {data['dependents_count']}\nRisk: {data['risk_level']}",
                'color': color,
                'size': size,
                'status': status,
                'category': data['category'],
                'risk': data['risk_level'],
                'dependents': data['dependents_count'],
                'lines': data['lines']
            })
        for path, data in self.report.files.items():
            source = data['relative_path']
            for dep in data.get('dependencies', []):
                if dep in self.report.files:
                    target = self.report.files[dep]['relative_path']
                    if target in node_ids:
                        edges.append({'from': source, 'to': target, 'arrows': 'to'})
        graph = {
            'nodes': nodes,
            'edges': edges,
            'metadata': {
                'total_nodes': len(nodes),
                'total_edges': len(edges),
                'unused_count': len(self.report.unused_candidates),
                'unwired_count': len(self.report.unwired_candidates)
            }
        }
        path = self.report_folder / 'dependency_graph.json'
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(graph, f, indent=2)
        self.logger.info(f"  Wrote {path.name}")

    def generate_html_dashboard(self):
        html = self._build_dashboard_html()
        path = self.report_folder / 'optimization_dashboard.html'
        with open(path, 'w', encoding='utf-8') as f:
            f.write(html)
        self.logger.info(f"  Wrote {path.name}")

    def _build_dashboard_html(self) -> str:
        # Unwired table rows (no Git columns)
        unwired_rows = ""
        for path in self.report.unwired_candidates[:50]:
            data = self.files_dict.get(path, {})
            unwired_type = data.get('unwired_type', 'unknown').replace('_', ' ').title()
            unwired_rows += f"""
            <tr>
                <td><code class="file-path">{data.get('relative_path', path)}</code></td>
                <td><span class="badge badge-{data.get('category', '').lower().replace(' ', '-')}">{data.get('category', '')}</span></td>
                <td><span class="badge badge-{data.get('unwired_type', 'unknown').replace('_', '-')}">{unwired_type}</span></td>
                <td class="text-center">{len(data.get('exported_symbols', []))}</td>
                <td class="text-center">{data.get('lines', 0)}</td>
                <td class="text-center">{data.get('days_since_modified', 0)}d</td>
                <td><span class="badge badge-{data.get('risk_level', 'LOW').lower()}">{data.get('risk_level', 'LOW')}</span></td>
            </tr>
            """

        # High risk rows
        high_risk_rows = ""
        for p, d in list(self.report.files.items())[:30]:
            if d['risk_level'] in ['HIGH', 'CRITICAL']:
                high_risk_rows += f"""
                <tr>
                    <td><code class="file-path">{d['relative_path']}</code></td>
                    <td><span class="badge badge-{d['risk_level'].lower()}">{d['risk_level']}</span></td>
                    <td class="text-center">{d['dependents_count']}</td>
                    <td class="text-center">{d['complexity_estimate']}</td>
                    <td>{d.get('short_reason', '')}</td>
                </tr>
                """

        # Recommendations
        rec_rows = defaultdict(list)
        for rec in self.report.recommendations:
            rec_rows[rec['action']].append(rec)
        recommendations_html = ""
        for action, items in rec_rows.items():
            if action in ['ARCHIVE', 'MERGE', 'WIRE', 'REFACTOR']:
                rows = ""
                for item in items[:10]:
                    rows += f"""
                    <tr>
                        <td><code class="file-path">{item['file']}</code></td>
                        <td class="text-center">{item['confidence']:.0f}%</td>
                        <td>{', '.join(item['reasoning'][:2])}</td>
                    </tr>
                    """
                recommendations_html += f"""
                <div class="recommendation-group">
                    <h3>{action} ({len(items)} files)</h3>
                    <table class="data-table">
                        <thead><tr><th>File</th><th>Confidence</th><th>Reason</th></tr></thead>
                        <tbody>{rows}</tbody>
                    </table>
                </div>
                """

        # Duplicate clusters
        dup_rows = ""
        for c in self.report.duplicate_clusters[:10]:
            dup_rows += f"""
            <tr>
                <td><code>{c['cluster_id']}</code></td>
                <td class="text-center">{c['similarity_score']:.0%}</td>
                <td class="text-center">{c['cluster_size']}</td>
                <td><code class="file-path">{Path(c['suggested_base_file']).name}</code></td>
                <td class="text-center">{c['estimated_savings']:,}</td>
            </tr>
            """

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Intelligence Dashboard v{Config.VERSION}</title>
    <script src="https://unpkg.com/vis-network@9.1.2/dist/vis-network.min.js"></script>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #e2e8f0;
            background: #0a0e27;
            padding: 20px;
        }}
        .container {{ max-width: 1600px; margin: 0 auto; }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        .header h1 {{ font-size: 2.2em; margin-bottom: 10px; }}
        .subtitle {{ opacity: 0.9; font-size: 1.1em; }}
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
            gap: 20px;
            margin: 20px 0;
        }}
        .stat-card {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        .stat-value {{ font-size: 2.2em; font-weight: bold; }}
        .stat-label {{ font-size: 0.9em; opacity: 0.9; }}
        .section {{
            background: #141b3a;
            padding: 25px;
            border-radius: 12px;
            margin-bottom: 30px;
            border: 1px solid #6366f1;
        }}
        .section h2 {{
            color: #a5b4fc;
            margin-bottom: 20px;
            border-bottom: 2px solid #6366f1;
            padding-bottom: 10px;
        }}
        #graph {{
            width: 100%;
            height: 600px;
            background: #0f1330;
            border-radius: 8px;
            border: 1px solid #6366f1;
        }}
        .data-table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
        }}
        .data-table th {{
            background: #1e1f4b;
            color: #e2e8f0;
            padding: 12px;
            text-align: left;
            border-bottom: 2px solid #6366f1;
        }}
        .data-table td {{
            padding: 12px;
            border-bottom: 1px solid #2d3748;
        }}
        .data-table tr:hover {{ background: #1a1f3a; }}
        .text-center {{ text-align: center; }}
        .badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.8em;
            font-weight: 600;
            text-transform: uppercase;
        }}
        .badge-critical {{ background: #ef4444; color: white; }}
        .badge-high {{ background: #f97316; color: white; }}
        .badge-medium {{ background: #f59e0b; color: white; }}
        .badge-low {{ background: #10b981; color: white; }}
        .badge-orphaned-useful {{ background: #ed8936; color: white; }}
        .badge-dead-code {{ background: #e53e3e; color: white; }}
        .badge-new-feature {{ background: #4299e1; color: white; }}
        .badge-unknown {{ background: #a0aec0; color: white; }}
        .file-path {{
            font-family: 'Monaco', 'Courier New', monospace;
            background: #1a1f3a;
            padding: 2px 6px;
            border-radius: 4px;
        }}
        .footer {{
            text-align: center;
            padding: 20px;
            color: #94a3b8;
        }}
        .recommendation-group {{ margin-bottom: 25px; }}
        .recommendation-group h3 {{
            color: #a5b4fc;
            margin-bottom: 10px;
            padding-left: 10px;
            border-left: 4px solid #6366f1;
        }}
        @media (max-width: 768px) {{
            .stats-grid {{ grid-template-columns: repeat(2, 1fr); }}
        }}
    </style>
</head>
<body>
<div class="container">
    <div class="header">
        <h1>📊 Enterprise Code Intelligence v{Config.VERSION}</h1>
        <p class="subtitle">Analysis: {self.report.metadata.get('start_time', '')[:19].replace('T', ' ')}</p>
        <p>Project: <code>{self.report.metadata.get('scan_root', '')}</code></p>
    </div>

    <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">{len(self.report.files)}</div><div class="stat-label">Files</div></div>
        <div class="stat-card"><div class="stat-value">{len(self.report.duplicate_clusters)}</div><div class="stat-label">Duplicate Clusters</div></div>
        <div class="stat-card"><div class="stat-value">{len(self.report.unused_candidates)}</div><div class="stat-label">Unused</div></div>
        <div class="stat-card"><div class="stat-value">{len(self.report.unwired_candidates)}</div><div class="stat-label">Unwired</div></div>
        <div class="stat-card"><div class="stat-value">{len(self.report.archive_candidates)}</div><div class="stat-label">Archive Candidates</div></div>
        <div class="stat-card"><div class="stat-value">{self.report.cache_hit_rate:.0%}</div><div class="stat-label">Cache Hit Rate</div></div>
    </div>

    <div class="section">
        <h2>🕸️ Dependency Graph</h2>
        <div id="graph"></div>
    </div>

    <div class="section">
        <h2>🔌 Unwired Components</h2>
        <p>Files with exports but no dependents, classified by age and size.</p>
        <table class="data-table sortable">
            <thead>
                <tr>
                    <th>File</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Exports</th>
                    <th>Lines</th>
                    <th>Last Modified</th>
                    <th>Risk</th>
                </tr>
            </thead>
            <tbody>
                {unwired_rows}
            </tbody>
        </table>
        {f"<p><em>... and {len(self.report.unwired_candidates) - 50} more unwired components</em></p>" if len(self.report.unwired_candidates) > 50 else ""}
    </div>

    <div class="section">
        <h2>⚠️ High Risk Files</h2>
        <table class="data-table sortable">
            <thead>
                <tr>
                    <th>File</th>
                    <th>Risk</th>
                    <th>Dependents</th>
                    <th>Complexity</th>
                    <th>Reason</th>
                </tr>
            </thead>
            <tbody>
                {high_risk_rows}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>📦 Duplicate Clusters</h2>
        <table class="data-table sortable">
            <thead>
                <tr>
                    <th>Cluster ID</th>
                    <th>Similarity</th>
                    <th>Files</th>
                    <th>Base File</th>
                    <th>Savings (lines)</th>
                </tr>
            </thead>
            <tbody>
                {dup_rows}
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>💡 Recommendations</h2>
        {recommendations_html}
    </div>

    <div class="footer">
        <p>Generated by Code Intelligence Platform v{Config.VERSION}</p>
        <p>Analysis duration: {self.report.analysis_duration_seconds:.2f}s</p>
    </div>
</div>
<script>
    fetch('dependency_graph.json')
        .then(r => r.json())
        .then(data => {{
            const nodes = new vis.DataSet(data.nodes);
            const edges = new vis.DataSet(data.edges);
            const container = document.getElementById('graph');
            const network = new vis.Network(container, {{nodes, edges}}, {{
                nodes: {{ shape: 'dot', font: {{ color: '#e2e8f0' }} }},
                edges: {{ color: {{ color: '#64748b', highlight: '#6366f1' }} }},
                physics: {{ enabled: true }}
            }});
        }});
    // Simple table sorting
    document.querySelectorAll('.sortable th').forEach(th => {{
        th.style.cursor = 'pointer';
        th.addEventListener('click', function() {{
            const table = this.closest('table');
            const tbody = table.querySelector('tbody');
            const rows = Array.from(tbody.querySelectorAll('tr'));
            const index = Array.from(this.parentNode.children).indexOf(this);
            const isNumeric = rows.every(row => !isNaN(parseFloat(row.cells[index]?.textContent)));
            rows.sort((a, b) => {{
                const aVal = a.cells[index]?.textContent.trim();
                const bVal = b.cells[index]?.textContent.trim();
                if (isNumeric) return parseFloat(aVal) - parseFloat(bVal);
                return aVal.localeCompare(bVal);
            }});
            rows.forEach(row => tbody.appendChild(row));
        }});
    }});
</script>
</body>
</html>"""

    def generate_report_index(self):
        """Create an index.html linking to the latest report."""
        index_path = self.report_folder.parent / 'index.html'
        html = f"""<!DOCTYPE html>
<html>
<head><title>Code Intelligence Reports</title></head>
<body>
<h1>📋 Code Intelligence Reports</h1>
<p>Latest analysis: {self.report.metadata.get('start_time', '')[:19]}</p>
<ul>
    <li><a href="{self.report_folder.name}/optimization_dashboard.html">Dashboard</a></li>
    <li><a href="{self.report_folder.name}/full_report.json">Full JSON</a></li>
    <li><a href="{self.report_folder.name}/summary_report.json">Summary JSON</a></li>
    <li><a href="{self.report_folder.name}/high_risk.csv">High Risk CSV</a></li>
    <li><a href="{self.report_folder.name}/dependency_graph.json">Dependency Graph JSON</a></li>
</ul>
</body>
</html>"""
        with open(index_path, 'w', encoding='utf-8') as f:
            f.write(html)
        self.logger.info(f"  Wrote index.html")


# =============================================================================
# ORCHESTRATOR – CodeIntelligencePlatform
# =============================================================================
class CodeIntelligencePlatform:
    """Main orchestrator – runs the full analysis pipeline."""

    def __init__(self, project_path: Path, scope: Optional[Path] = None,
                 report_folder: Optional[Path] = None, keep_history: bool = False,
                 parallel: bool = True, dry_run: bool = False,
                 verbose: bool = False):
        self.project_path = project_path.resolve()
        self.scope = scope.resolve() if scope else self.project_path
        self.report_folder = report_folder.resolve() if report_folder else Path.cwd() / Config.DEFAULT_REPORT_DIR
        self.keep_history = keep_history
        self.parallel = parallel
        self.dry_run = dry_run
        self.verbose = verbose

        self.logger = setup_logging(verbose)
        self.files: Dict[str, FileInfo] = {}
        self.report: Optional[AnalysisReport] = None

    def analyze(self) -> AnalysisReport:
        # Prepare report folder (overwrite or archive history)
        if self.report_folder.exists() and self.keep_history:
            history_dir = self.report_folder / Config.HISTORY_SUBDIR / datetime.now().strftime('%Y%m%d_%H%M%S')
            history_dir.mkdir(parents=True, exist_ok=True)
            for f in self.report_folder.glob('*'):
                if f.is_file() and f.name not in [Config.ARCHIVES_SUBDIR, Config.HISTORY_SUBDIR]:
                    shutil.move(str(f), str(history_dir / f.name))
            self.logger.info(f"Moved previous reports to {history_dir}")
        else:
            # Clean but preserve archives/history
            for f in self.report_folder.glob('*'):
                if f.is_file():
                    f.unlink()
        self.report_folder.mkdir(parents=True, exist_ok=True)
        (self.report_folder / Config.ARCHIVES_SUBDIR).mkdir(exist_ok=True)

        start_time = datetime.now()
        start_seconds = time.time()

        # Cache
        cache_path = self.project_path / Config.CACHE_FILE if not self.dry_run else None
        cache = FileCache(cache_path, Config.VERSION, self.logger) if cache_path else None

        # Phase 1: Scan
        scanner = ProjectScanner(self.project_path, self.logger, self.scope,
                                 cache=cache)
        self.files = scanner.scan(use_parallel=self.parallel)

        # Phase 2: Dependency graph
        dep_builder = DependencyGraphBuilder(self.project_path, self.files, self.logger)
        graph = dep_builder.build()

        # Phase 3: Duplicate detection
        dup_detector = DuplicateDetector(self.files, self.logger)
        duplicates = dup_detector.detect(use_parallel=self.parallel)

        # Phase 4: Usage analysis
        usage = UsageAnalyzer(self.files, self.logger)
        unused, unwired = usage.analyze()

        # Phase 5: Wiring suggestions
        wiring_engine = WiringEngine(self.files, unwired)
        wiring_engine.generate_suggestions()

        # Phase 6: Stability & risk
        stability = StabilityCalculator(self.files, self.logger)
        stability.calculate()

        # Phase 7: Recommendations
        rec_engine = RecommendationEngine(self.files, duplicates, unused, unwired, self.logger)
        rec_engine.generate_recommendations()

        # Phase 8: Archive decisions
        archive_engine = ArchiveDecisionEngine(self.files, self.logger)
        archive_candidates = []
        for path, meta in self.files.items():
            decision = archive_engine.evaluate_archive_candidate(meta)
            if decision.allowed and decision.decision == Recommendation.ARCHIVE:
                archive_candidates.append(path)

        # Build recommendation list for report
        recommendations_list = []
        for path, meta in self.files.items():
            if meta.recommendation != Recommendation.KEEP or meta.risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}:
                recommendations_list.append({
                    'file': meta.relative_path,
                    'title': f"{meta.recommendation.value} - {meta.name}",
                    'action': meta.recommendation.value,
                    'reasoning': meta.detailed_reasoning,
                    'confidence': meta.recommendation_confidence,
                    'priority': meta.risk_level.value,
                    'effort': 'High' if meta.complexity_estimate > 50 else 'Medium' if meta.complexity_estimate > 20 else 'Low',
                    'impact': 'High' if meta.dependents_count > 5 else 'Medium' if meta.dependents_count > 0 else 'Low',
                    'category': meta.category.value
                })

        # Quality metrics
        total_files = len(self.files)
        avg_stability = sum(f.stability_score for f in self.files.values()) / total_files if total_files else 0
        total_any = sum(f.any_count for f in self.files.values())
        total_lines = sum(f.lines for f in self.files.values())
        type_safety = max(0, 100 - (total_any / total_lines * 1000)) if total_lines else 100
        avg_complexity = sum(f.complexity_estimate for f in self.files.values()) / total_files if total_files else 0
        test_files = sum(1 for f in self.files.values() if f.is_test_file)
        non_test = total_files - test_files
        test_coverage = (test_files / non_test * 100) if non_test else 0
        ts_percentage = sum(1 for f in self.files.values() if f.has_typescript) / total_files * 100 if total_files else 0

        quality_metrics = {
            'avg_stability': avg_stability,
            'type_safety_score': type_safety,
            'avg_complexity': avg_complexity,
            'test_coverage_estimate': min(test_coverage, 100),
            'total_files': total_files,
            'total_lines': total_lines,
            'typescript_percentage': ts_percentage
        }

        end_time = datetime.now()
        duration = time.time() - start_seconds

        # Build final report
        report = AnalysisReport(
            metadata={
                'tool_version': Config.VERSION,
                'scan_root': str(self.project_path),
                'start_time': start_time.isoformat(),
                'end_time': end_time.isoformat(),
                'report_folder': str(self.report_folder),
                'warnings': [],  # would be collected from logger if needed
                'errors': []
            },
            files={
                p: {
                    'path': f.path,
                    'relative_path': f.relative_path,
                    'size': f.size,
                    'lines': f.lines,
                    'category': f.category.value,
                    'content_hash': f.content_hash,
                    'structural_hash': f.structural_hash,
                    'exported_symbols': f.exported_symbols,
                    'dependents_count': f.dependents_count,
                    'dependencies': list(f.dependencies),
                    'dependents': list(f.dependents),
                    'stability_score': f.stability_score,
                    'risk_level': f.risk_level.value,
                    'risk_score': f.risk_score,
                    'recommendation': f.recommendation.value,
                    'short_reason': f.short_reason,
                    'days_since_modified': f.days_since_modified,
                    'complexity_estimate': f.complexity_estimate,
                    'any_count': f.any_count,
                    'is_dynamic_imported': f.is_dynamic_imported,
                    'is_test_file': f.is_test_file,
                    'is_barrel_file': f.is_barrel_file,
                    'is_barrel_exported': f.is_barrel_exported,
                    'duplicate_cluster_id': f.duplicate_cluster_id,
                    'duplicate_of': f.duplicate_of,
                    'has_jsx': f.has_jsx,
                    'has_typescript': f.has_typescript,
                    'interface_count': f.interface_count,
                    'type_count': f.type_count,
                    'function_count': f.function_count,
                    'class_count': f.class_count,
                    'unwired_type': f.unwired_type.value if f.unwired_type else None,
                    'wiring_suggestions': [asdict(s) for s in f.wiring_suggestions]
                }
                for p, f in self.files.items()
            },
            duplicate_clusters=[asdict(c) for c in duplicates],
            same_name_conflicts=[],
            unused_candidates=unused,
            unwired_candidates=unwired,
            merge_suggestions=[],
            archive_candidates=archive_candidates,
            category_distribution=dict(Counter(f.category.value for f in self.files.values())),
            risk_distribution=dict(Counter(f.risk_level.value for f in self.files.values())),
            issues=[],  # Could be populated from meta.issues
            recommendations=recommendations_list,
            optimization_opportunities=[],
            quality_metrics=quality_metrics,
            dependency_graph=graph,
            cache_hit_rate=cache.hit_rate() if cache else 0.0,
            analysis_duration_seconds=duration
        )

        self.report = report

        if not self.dry_run:
            report_gen = ReportGenerator(report, self.report_folder, self.logger)
            report_gen.generate_all()
            if cache:
                cache.save()
        else:
            self.logger.info("DRY RUN: reports not written, cache not updated.")

        return report


# =============================================================================
# INTERACTIVE CLI
# =============================================================================
class InteractiveCLI:
    """Interactive command line interface for the platform."""

    def __init__(self, platform: CodeIntelligencePlatform):
        self.platform = platform
        self.report: Optional[AnalysisReport] = None

    def run(self):
        self._print_banner()
        while True:
            self._print_menu()
            choice = input("\033[96mSelect option: \033[0m").strip()
            if choice == '1':
                self._full_analysis()
            elif choice == '2':
                self._show_high_risk()
            elif choice == '3':
                self._show_unused_unwired()
            elif choice == '4':
                self._show_duplicates()
            elif choice == '5':
                self._show_archive_candidates()
            elif choice == '6':
                self._create_archive()
            elif choice == '7':
                self._open_dashboard()
            elif choice == '8':
                self._show_recommendations()
            elif choice == '9':
                self._show_unwired_detailed()
            elif choice == '0':
                print("\033[92mExiting. No files were modified.\033[0m")
                break
            else:
                print("\033[91mInvalid option.\033[0m")
            input("\n\033[93mPress Enter to continue...\033[0m")

    def _print_banner(self):
        print("\033[95m" + "="*70 + "\033[0m")
        print("\033[1mENTERPRISE CODE INTELLIGENCE PLATFORM v6.0\033[0m")
        print("\033[95m" + "="*70 + "\033[0m")
        print("\033[92m✓ Read‑only analysis – no source changes\033[0m")
        print("\033[92m✓ Git‑free – all analysis based on file system\033[0m")
        print("\033[92m✓ AST‑accurate parsing, dependency graph, wiring suggestions\033[0m")
        print()

    def _print_menu(self):
        print("\n\033[1mMAIN MENU:\033[0m")
        print("  \033[96m1.\033[0m Full Analysis")
        print("  \033[96m2.\033[0m Show High Risk Files")
        print("  \033[96m3.\033[0m Show Unused & Unwired (summary)")
        print("  \033[96m4.\033[0m Show Duplicate Clusters")
        print("  \033[96m5.\033[0m Show Archive Candidates")
        print("  \033[96m6.\033[0m Create Safe Archive")
        print("  \033[96m7.\033[0m Open HTML Dashboard")
        print("  \033[96m8.\033[0m Show Recommendations")
        print("  \033[96m9.\033[0m Show Unwired Components (detailed)")
        print("  \033[91m0.\033[0m Exit")

    def _full_analysis(self):
        print("\n\033[1m=== FULL ANALYSIS ===\033[0m")
        self.report = self.platform.analyze()
        print("\033[92m✓ Analysis complete.\033[0m")
        print(f"  Reports: {self.platform.report_folder}")

    def _ensure_report(self):
        if not self.report:
            print("\033[93mPlease run Full Analysis first.\033[0m")
            return False
        return True

    def _show_high_risk(self):
        if not self._ensure_report():
            return
        high = [d for p,d in self.report.files.items() if d['risk_level'] in ['HIGH','CRITICAL']]
        print(f"\n\033[1m=== HIGH RISK FILES ({len(high)}) ===\033[0m")
        for d in high[:20]:
            print(f"  {d['relative_path']} [{d['risk_level']}]")

    def _show_unused_unwired(self):
        if not self._ensure_report():
            return
        print(f"\n\033[1mUnused: {len(self.report.unused_candidates)}\033[0m")
        for p in self.report.unused_candidates[:10]:
            print(f"  {p}")
        print(f"\n\033[1mUnwired: {len(self.report.unwired_candidates)}\033[0m")
        for p in self.report.unwired_candidates[:10]:
            print(f"  {p}")

    def _show_duplicates(self):
        if not self._ensure_report():
            return
        print(f"\n\033[1mDuplicate Clusters: {len(self.report.duplicate_clusters)}\033[0m")
        for c in self.report.duplicate_clusters[:5]:
            print(f"  Cluster {c['cluster_id']} ({c['similarity_score']:.0%} similar)")
            for f in c['files'][:3]:
                print(f"    - {Path(f).name}")

    def _show_archive_candidates(self):
        if not self._ensure_report():
            return
        print(f"\n\033[1mArchive Candidates: {len(self.report.archive_candidates)}\033[0m")
        for p in self.report.archive_candidates[:15]:
            print(f"  {p}")

    def _create_archive(self):
        if not self._ensure_report():
            return
        if not self.report.archive_candidates:
            print("\033[93mNo candidates to archive.\033[0m")
            return
        print("\n\033[1m=== CREATE SAFE ARCHIVE ===\033[0m")
        print(f"Candidates: {len(self.report.archive_candidates)}")
        confirm = input("\033[96mProceed? (y/N): \033[0m").strip().lower()
        if confirm == 'y':
            builder = ArchiveBuilder(
                self.platform.project_path,
                self.platform.report_folder,
                self.platform.files,
                self.platform.logger
            )
            archive_path = builder.create_safe_archive(self.report.archive_candidates, dry_run=self.platform.dry_run)
            if archive_path:
                print(f"\033[92m✓ Archive created: {archive_path}\033[0m")
            else:
                print("\033[91m✗ Archive failed.\033[0m")

    def _open_dashboard(self):
        if not self._ensure_report():
            return
        dash = self.platform.report_folder / 'optimization_dashboard.html'
        if dash.exists():
            import webbrowser
            webbrowser.open(f"file://{dash.resolve()}")
            print("\033[92mDashboard opened in browser.\033[0m")
        else:
            print("\033[91mDashboard not found.\033[0m")

    def _show_recommendations(self):
        if not self._ensure_report():
            return
        print(f"\n\033[1m=== RECOMMENDATIONS ({len(self.report.recommendations)}) ===\033[0m")
        for rec in self.report.recommendations[:10]:
            print(f"  {rec['title']} [{rec['priority']}]")
            for reason in rec['reasoning'][:2]:
                print(f"    - {reason}")

    def _show_unwired_detailed(self):
        if not self._ensure_report():
            return
        print(f"\n\033[1m=== DETAILED UNWIRED COMPONENTS ({len(self.report.unwired_candidates)}) ===\033[0m")
        for path in self.report.unwired_candidates[:20]:
            data = self.report.files.get(path, {})
            print(f"  {data.get('relative_path', path)}")
            print(f"    Category: {data.get('category', '')}, Lines: {data.get('lines', 0)}, Exports: {len(data.get('exported_symbols', []))}")
            print(f"    Type: {data.get('unwired_type', 'unknown')}, Last modified: {data.get('days_since_modified', 0)}d")
            print(f"    Risk: {data.get('risk_level', '')}, Stability: {data.get('stability_score', 0):.1f}")
            print()


# =============================================================================
# MAIN ENTRY POINT
# =============================================================================
def main():
    parser = argparse.ArgumentParser(
        description="Enterprise Code Intelligence Platform v6.0 – Unified Edition (no Git)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Full analysis with HTML report
  %(prog)s /path/to/project

  # Limit scope to a subfolder
  %(prog)s /path/to/project --scope src

  # Non‑interactive (CI) mode
  %(prog)s /path/to/project --non-interactive

  # Dry run (no reports written)
  %(prog)s /path/to/project --dry-run

  # Keep previous reports (move to history/)
  %(prog)s /path/to/project --keep-history
"""
    )
    parser.add_argument('project_path', nargs='?', default=os.getcwd(),
                        help='Project root path (default: current directory)')
    parser.add_argument('--scope', '-s', help='Limit analysis to this subpath')
    parser.add_argument('--report-folder', '-r', default='./reports',
                        help='Output folder for reports (default: ./reports)')
    parser.add_argument('--non-interactive', '-n', action='store_true',
                        help='Run analysis and exit')
    parser.add_argument('--json-output', '-j', action='store_true',
                        help='Print JSON summary to stdout and exit')
    parser.add_argument('--dry-run', '-d', action='store_true',
                        help='Simulate without writing reports/archives')
    parser.add_argument('--keep-history', action='store_true',
                        help='Move previous reports to history/ before overwriting')
    parser.add_argument('--parallel', '-p', action='store_true', default=True,
                        help='Enable parallel processing (default: True)')
    parser.add_argument('--no-parallel', action='store_false', dest='parallel',
                        help='Disable parallel processing')
    parser.add_argument('--exclude', action='append', default=[],
                        help='Additional ignore patterns')
    parser.add_argument('--verbose', '-v', action='store_true',
                        help='Verbose logging')

    args = parser.parse_args()

    project = Path(args.project_path).resolve()
    if not project.exists():
        print(f"Error: path does not exist: {project}")
        sys.exit(1)

    scope = Path(args.scope).resolve() if args.scope else None
    report_folder = Path(args.report_folder).resolve()

    platform = CodeIntelligencePlatform(
        project_path=project,
        scope=scope,
        report_folder=report_folder,
        keep_history=args.keep_history,
        parallel=args.parallel,
        dry_run=args.dry_run,
        verbose=args.verbose
    )

    if args.non_interactive or args.json_output:
        report = platform.analyze()
        if args.json_output:
            summary = {
                'total_files': len(report.files),
                'unused': len(report.unused_candidates),
                'unwired': len(report.unwired_candidates),
                'duplicate_clusters': len(report.duplicate_clusters),
                'archive_candidates': len(report.archive_candidates),
                'report_folder': str(platform.report_folder),
                'duration_seconds': report.analysis_duration_seconds
            }
            print(json.dumps(summary, indent=2))
        else:
            print(f"Analysis complete. Reports: {platform.report_folder}")
    else:
        cli = InteractiveCLI(platform)
        try:
            cli.run()
        except KeyboardInterrupt:
            print("\n\033[93mInterrupted by user.\033[0m")
            sys.exit(0)


if __name__ == '__main__':
    main()

# =============================================================================
# UNIT TESTS (commented – for reference)
# =============================================================================
"""
import unittest
from pathlib import Path
from code_intelligence_v6 import (
    Config, FileInfo, FileCategory, UnwiredType, UsageAnalyzer, WiringEngine,
    DuplicateDetector, ProjectScanner, setup_logging
)

class TestUnwiredClassification(unittest.TestCase):
    def test_classify_by_recency(self):
        logger = setup_logging(False)
        files = {}
        analyzer = UsageAnalyzer(files, logger)
        meta = FileInfo(
            path='dummy.ts',
            relative_path='dummy.ts',
            name='dummy.ts',
            extension='.ts',
            size=1000,
            lines=100,
            content_hash='abc',
            structural_hash='def',
            modified=0,
            days_since_modified=10,
            category=FileCategory.UTILITY,
            exports=['foo']
        )
        self.assertEqual(analyzer._classify_unwired(meta), UnwiredType.NEW_FEATURE)
        meta.days_since_modified = 200
        self.assertEqual(analyzer._classify_unwired(meta), UnwiredType.DEAD_CODE)
        meta.days_since_modified = 90
        meta.lines = 200
        meta.exports = ['foo', 'bar', 'baz']
        self.assertEqual(analyzer._classify_unwired(meta), UnwiredType.ORPHANED_USEFUL)

class TestWiringSimilarity(unittest.TestCase):
    def test_similarity_score(self):
        a = FileInfo(path='a.ts', relative_path='a.ts', name='a.ts', extension='.ts',
                     size=100, lines=50, content_hash='', structural_hash='',
                     modified=0, days_since_modified=10, category=FileCategory.UTILITY,
                     exports=['foo', 'bar'], imports=['react'])
        b = FileInfo(path='b.ts', relative_path='b.ts', name='b.ts', extension='.ts',
                     size=100, lines=50, content_hash='', structural_hash='',
                     modified=0, days_since_modified=20, category=FileCategory.UTILITY,
                     exports=['foo', 'baz'], imports=['react', 'lodash'])
        engine = WiringEngine({}, [])
        score = engine._calculate_similarity(a, b)
        self.assertGreater(score, 0.5)

if __name__ == '__main__':
    unittest.main()
"""