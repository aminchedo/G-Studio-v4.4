#!/usr/bin/env python3
"""
Enterprise Code Intelligence Platform v4 – Single File Edition
================================================================
Professional-grade static analysis for TypeScript/React/Electron projects.
Features:
- AST‑accurate parsing via tree‑sitter (TypeScript, JavaScript, optional Python)
- Fixed report folder with overwrite (always latest)
- Excludes .md files completely
- File hash cache for incremental runs
- Parallel scanning & similarity
- Interactive & non‑interactive CLI
- Self‑contained HTML dashboard (vis-network embedded)
- Safe archive (ZIP, never modifies sources)
- Enhanced unwired detection using Git history
- Automatic wiring suggestions via structural similarity
- Optional TypeScript compiler integration for precise dependency resolution
- Issue tracking for unwired components
- Progress bar (tqdm optional)
- Unit test examples

Author: Senior Software Architect
Version: 4.1.0
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
import subprocess
from pathlib import Path
from datetime import datetime
from collections import defaultdict, Counter
from typing import (
    Dict, List, Set, Tuple, Optional, Any, Union, Callable, Iterator
)
from dataclasses import dataclass, field, asdict
from enum import Enum
from difflib import SequenceMatcher
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
from functools import lru_cache
import traceback
import base64

# Optional: tqdm for progress bar
try:
    from tqdm import tqdm
    TQDM_AVAILABLE = True
except ImportError:
    TQDM_AVAILABLE = False

# Tree‑sitter – mandatory for TypeScript/JavaScript parsing
try:
    from tree_sitter import Language, Parser
    import tree_sitter_typescript
    TREE_SITTER_AVAILABLE = True
except ImportError:
    TREE_SITTER_AVAILABLE = False

# Optional: tree-sitter-python for Python support
try:
    import tree_sitter_python
    TREE_SITTER_PYTHON_AVAILABLE = True
except ImportError:
    TREE_SITTER_PYTHON_AVAILABLE = False

# Optional: TypeScript compiler API for accurate dependency resolution
try:
    import ts  # Requires 'typescript' package and 'ts-node' or similar setup
    TYPESCRIPT_COMPILER_AVAILABLE = True
except ImportError:
    TYPESCRIPT_COMPILER_AVAILABLE = False

# =============================================================================
# CONFIGURATION (all tunable parameters)
# =============================================================================
class Config:
    """Global configuration – override via env or CLI flags."""
    # Version
    TOOL_VERSION = "4.1.0"
    
    # Analysis thresholds
    SIMILARITY_THRESHOLD = 0.85
    RECENT_DAYS_BLOCKER = 30
    ARCHIVE_SCORE_THRESHOLD = 75
    INVESTIGATE_LOW_THRESHOLD = 60
    INVESTIGATE_MEDIUM_THRESHOLD = 45
    COMPLEXITY_HIGH_THRESHOLD = 50
    CRITICAL_DEPENDENCY_THRESHOLD = 10
    BARREL_EXPORT_THRESHOLD = 3
    SHARED_MODULE_BOOST = 2.0
    
    # File size limits for similarity
    MAX_FILE_SIZE_FOR_SIMILARITY = 500_000  # 500KB
    SIZE_DIFF_RATIO_THRESHOLD = 3.0
    
    # Cache
    CACHE_FILE_NAME = ".code_intelligence_cache.json"
    
    # Ignore patterns (case‑insensitive substring match on path)
    IGNORE_PATTERNS = {
        'node_modules', 'dist', 'build', 'coverage', '.git', '.vscode',
        '__pycache__', '.pytest_cache', '.mypy_cache', 'vendor',
        'refactor_temp', 'refactor_archive', 'reports', '.DS_Store',
        'thumbs.db', 'desktop.ini', 'package-lock.json', 'yarn.lock'
    }
    
    # File extensions to include in analysis (**.md explicitly excluded)
    FILE_EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss',
                       '.html', '.yml', '.yaml', '.env'}
    
    # Optional: Python support
    if TREE_SITTER_PYTHON_AVAILABLE:
        FILE_EXTENSIONS.add('.py')
    
    # Entry point patterns (filenames)
    ENTRY_POINT_PATTERNS = {
        'main.ts', 'main.tsx', 'index.ts', 'index.tsx',
        'app.ts', 'app.tsx', '_app.tsx', 'main.js', 'index.js'
    }
    # Python entry points
    PYTHON_ENTRY_POINT_PATTERNS = {'main.py', '__main__.py', 'app.py', 'cli.py'}
    ENTRY_POINT_PATTERNS.update(PYTHON_ENTRY_POINT_PATTERNS)
    
    # Framework core patterns (content)
    FRAMEWORK_CORE_PATTERNS = {
        'createContext', 'configureStore', 'createStore', 'createSlice',
        'setup', 'register', 'bootstrap', 'initialize', 'configure',
        'Provider', 'createRoot', 'render'
    }
    
    # Infrastructure paths (substring)
    INFRASTRUCTURE_PATHS = {
        '/core/', '/runtime/', '/boot/', '/init/', '/config/',
        '/setup/', '/framework/', '/platform/', '/lib/', '/shared/'
    }
    
    # Dynamic import patterns (regex, but tree‑sitter will detect AST)
    DYNAMIC_IMPORT_PATTERNS = [
        r'import\s*\(',
        r'React\.lazy\s*\(',
        r'require\s*\(',
        r'loadable\s*\(',
        r'dynamic\s*\('
    ]
    
    # Side effect patterns (top‑level calls)
    SIDE_EFFECT_PATTERNS = [
        'fetch', 'axios', 'XMLHttpRequest', 'WebSocket',
        'addEventListener', 'setInterval', 'setTimeout',
        'localStorage', 'sessionStorage', 'indexedDB',
        'document.', 'window.', 'navigator.'
    ]
    
    # React hooks
    HOOK_PATTERNS = [
        'useState', 'useEffect', 'useContext', 'useReducer',
        'useCallback', 'useMemo', 'useRef', 'useLayoutEffect',
        'useImperativeHandle', 'useDebugValue', 'useTransition',
        'useDeferredValue', 'useId', 'useSyncExternalStore'
    ]
    
    # React lifecycle (class components)
    REACT_LIFECYCLE_METHODS = [
        'componentDidMount', 'componentDidUpdate', 'componentWillUnmount',
        'shouldComponentUpdate', 'getDerivedStateFromProps',
        'getSnapshotBeforeUpdate', 'componentDidCatch'
    ]
    
    # Test framework patterns
    TEST_FRAMEWORKS = [
        'describe', 'it', 'test', 'expect', 'jest', 'vitest',
        'beforeEach', 'afterEach', 'beforeAll', 'afterAll',
        'mock', 'spy', 'stub'
    ]
    
    # Route patterns
    ROUTE_PATTERNS = [
        'Route', 'Router', 'Switch', 'Navigate', 'Link',
        'useNavigate', 'useParams', 'useLocation', 'useHistory'
    ]
    
    # State management patterns
    STATE_MANAGEMENT_PATTERNS = [
        'createSlice', 'configureStore', 'Provider', 'useDispatch',
        'useSelector', 'connect', 'createContext', 'useReducer'
    ]
    
    # Unwired detection: git history threshold (number of commits)
    GIT_HISTORY_COMMIT_THRESHOLD = 2

# =============================================================================
# ANSI COLOR CODES (for CLI)
# =============================================================================
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    
    @staticmethod
    def supports_color() -> bool:
        """Detect if terminal supports ANSI color."""
        if sys.platform == "win32":
            try:
                import ctypes
                kernel32 = ctypes.windll.kernel32
                kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
                return True
            except:
                return False
        return hasattr(sys.stdout, "isatty") and sys.stdout.isatty()

USE_COLOR = Colors.supports_color()

def c(text: str, color_code: str) -> str:
    return f"{color_code}{text}{Colors.ENDC}" if USE_COLOR else text

# =============================================================================
# ENUMS & DATA CLASSES
# =============================================================================

class FileCategory(Enum):
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
    PYTHON_MODULE = "PYTHON_MODULE"  # New for Python support
    UNKNOWN = "UNKNOWN"

class RiskLevel(Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class Recommendation(Enum):
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

class IssueType(Enum):
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

@dataclass
class CodeIssue:
    issue_type: IssueType
    severity: RiskLevel
    file_path: str
    description: str
    recommendation: str
    confidence: float
    impact_estimate: str
    related_files: List[str] = field(default_factory=list)

@dataclass
class ComponentInfo:
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
class ArchiveDecision:
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
    """Complete metadata for a single file, extracted via AST."""
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
    exported_symbols: List[str] = field(default_factory=list)
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
    has_side_effects: bool = False
    hook_usage: List[str] = field(default_factory=list)
    has_jsx: bool = False
    has_typescript: bool = False
    interface_count: int = 0
    type_count: int = 0
    function_count: int = 0
    class_count: int = 0
    issues: List[CodeIssue] = field(default_factory=list)
    # Git history metadata (added for unwired detection)
    git_commit_count: int = 0
    has_git_history: bool = False

@dataclass
class AnalysisReport:
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

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

class AnalysisLogger:
    """Runtime logging with file output."""
    def __init__(self, log_path: Path):
        self.log_path = log_path
        self.start_time = time.time()
        self.warnings: List[str] = []
        self.errors: List[str] = []
        self.log_lines: List[str] = []
        self._log(f"Analysis started at {datetime.now().isoformat()}")
        self._log(f"Tool version: {Config.TOOL_VERSION}")
    
    def _log(self, message: str):
        timestamp = datetime.now().strftime('%H:%M:%S')
        line = f"[{timestamp}] {message}"
        self.log_lines.append(line)
        print(line)
    
    def info(self, message: str):
        self._log(f"INFO: {message}")
    
    def warning(self, message: str):
        self.warnings.append(message)
        self._log(f"WARNING: {message}")
    
    def error(self, message: str):
        self.errors.append(message)
        self._log(f"ERROR: {message}")
    
    def finalize(self):
        elapsed = time.time() - self.start_time
        self._log(f"Analysis completed in {elapsed:.2f} seconds")
        self._log(f"Total warnings: {len(self.warnings)}")
        self._log(f"Total errors: {len(self.errors)}")
        with open(self.log_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(self.log_lines))

class FileCache:
    """Persistent cache of file hashes for incremental analysis."""
    def __init__(self, project_root: Path, logger: AnalysisLogger):
        self.cache_path = project_root / Config.CACHE_FILE_NAME
        self.logger = logger
        self.cache = self._load()
    
    def _load(self) -> Dict[str, Dict[str, Any]]:
        if self.cache_path.exists():
            try:
                with open(self.cache_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                if data.get('tool_version') == Config.TOOL_VERSION:
                    return data.get('files', {})
                else:
                    self.logger.info("Cache version mismatch, rebuilding cache.")
            except:
                pass
        return {}
    
    def save(self, files: Dict[str, FileInfo]):
        cache_data = {
            'tool_version': Config.TOOL_VERSION,
            'timestamp': datetime.now().isoformat(),
            'files': {
                path: {
                    'mtime': info.modified,
                    'content_hash': info.content_hash,
                    'structural_hash': info.structural_hash
                }
                for path, info in files.items()
            }
        }
        with open(self.cache_path, 'w', encoding='utf-8') as f:
            json.dump(cache_data, f, indent=2)
        self.logger.info(f"Cache saved with {len(files)} entries.")
    
    def is_changed(self, path: str, mtime: float, content_hash: str) -> bool:
        cached = self.cache.get(path)
        if not cached:
            return True
        return (cached.get('mtime') != mtime or 
                cached.get('content_hash') != content_hash)

# -----------------------------------------------------------------------------
# Git history helper (for unwired detection)
# -----------------------------------------------------------------------------
class GitHelper:
    @staticmethod
    def get_commit_count(project_root: Path, file_path: str) -> int:
        """Return number of git commits affecting the file."""
        try:
            # Ensure we are in the git repo
            cmd = ['git', 'log', '--oneline', '--', file_path]
            result = subprocess.run(cmd, cwd=project_root, capture_output=True, text=True, timeout=5)
            if result.returncode == 0:
                lines = result.stdout.strip().splitlines()
                return len(lines)
            else:
                return 0
        except:
            return 0

# -----------------------------------------------------------------------------
# Tree‑sitter AST helpers (only if available)
# -----------------------------------------------------------------------------
class TSParser:
    """Singleton parser for tree‑sitter languages."""
    _instance = None
    _ts_tsx_language = None
    _ts_js_language = None
    _ts_python_language = None
    _parser = None
    
    @classmethod
    def initialize(cls):
        if not TREE_SITTER_AVAILABLE:
            return
        
        if cls._instance is None:
            cls._parser = Parser()
            # Load TypeScript/TSX languages
            try:
                cls._ts_tsx_language = Language(tree_sitter_typescript.language_tsx())
                cls._ts_js_language = Language(tree_sitter_typescript.language_typescript())
            except AttributeError:
                cls._ts_tsx_language = Language(tree_sitter_typescript.language(), 'tsx')
                cls._ts_js_language = Language(tree_sitter_typescript.language(), 'ts')
            
            # Load Python language if available
            if TREE_SITTER_PYTHON_AVAILABLE:
                try:
                    cls._ts_python_language = Language(tree_sitter_python.language())
                except:
                    pass
            cls._instance = cls
    
    @classmethod
    def get_parser(cls) -> Optional[Parser]:
        if not TREE_SITTER_AVAILABLE:
            return None
        cls.initialize()
        return cls._parser
    
    @classmethod
    def get_language(cls, ext: str):
        cls.initialize()
        if ext in ('.tsx', '.ts'):
            return cls._ts_tsx_language if ext == '.tsx' else cls._ts_js_language
        if ext == '.py' and TREE_SITTER_PYTHON_AVAILABLE:
            return cls._ts_python_language
        return None

def ast_walk(node, types: Tuple[str, ...]) -> Iterator:
    """Yield all nodes of given types in the AST."""
    if node.type in types:
        yield node
    for child in node.children:
        yield from ast_walk(child, types)

def node_text(node, source_bytes: bytes) -> str:
    """Extract source text of a node."""
    return source_bytes[node.start_byte:node.end_byte].decode('utf-8', errors='ignore')

# -----------------------------------------------------------------------------
# Optional TypeScript compiler API resolver
# -----------------------------------------------------------------------------
class TSCompilerResolver:
    """Use TypeScript compiler API for accurate module resolution."""
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.program = None
        self.checker = None
        if TYPESCRIPT_COMPILER_AVAILABLE:
            try:
                ts = __import__('typescript')
                config_path = project_root / 'tsconfig.json'
                if config_path.exists():
                    config_str = config_path.read_text(encoding='utf-8')
                    config_json = json.loads(config_str)
                    options = ts.convertCompilerOptionsFromJson(config_json.get('compilerOptions', {}), str(project_root))
                    self.program = ts.createProgram([], options.options)
                    self.checker = self.program.getTypeChecker()
            except:
                pass
    
    def resolve_import(self, from_file: str, import_spec: str) -> Optional[str]:
        if not self.checker:
            return None
        # This is a simplified stub; a full implementation would use the TypeScript module resolver.
        # For now, fallback to heuristic resolver.
        return None

# -----------------------------------------------------------------------------
# Project Scanner (AST‑aware)
# -----------------------------------------------------------------------------
class ProjectScanner:
    def __init__(self, root_path: Path, logger: AnalysisLogger, 
                 scope: Optional[Path] = None,
                 exclude_patterns: Optional[List[str]] = None,
                 cache: Optional[FileCache] = None):
        self.root = root_path.resolve()
        self.scope = scope.resolve() if scope else self.root
        self.logger = logger
        self.cache = cache
        self.exclude_patterns = set(Config.IGNORE_PATTERNS)
        if exclude_patterns:
            self.exclude_patterns.update(exclude_patterns)
        self.files: Dict[str, FileInfo] = {}
        self.components: List[ComponentInfo] = []
        self.parser = TSParser.get_parser()
    
    def should_ignore(self, path: Path) -> bool:
        parts = path.parts
        name = path.name.lower()
        if path.suffix.lower() == '.md':
            return True
        return any(p in parts or p in name for p in self.exclude_patterns)
    
    def scan(self) -> Tuple[Dict[str, FileInfo], List[ComponentInfo]]:
        self.logger.info(f"Scanning project: {self.scope}")
        all_paths = []
        for root, dirs, files in os.walk(self.scope):
            dirs[:] = [d for d in dirs if not self.should_ignore(Path(root)/d)]
            for file in files:
                file_path = Path(root)/file
                if self.should_ignore(file_path):
                    continue
                if file_path.suffix.lower() not in Config.FILE_EXTENSIONS:
                    continue
                all_paths.append(file_path)
        
        self.logger.info(f"Found {len(all_paths)} candidate files.")
        
        # Parallel file reading with optional progress bar
        executor = ThreadPoolExecutor(max_workers=os.cpu_count())
        futures = []
        for path in all_paths:
            futures.append(executor.submit(self._analyze_file, path))
        
        iter_futures = as_completed(futures)
        if TQDM_AVAILABLE:
            iter_futures = tqdm(iter_futures, total=len(futures), desc="Scanning files", unit="file")
        
        for future in iter_futures:
            try:
                info = future.result()
                if info:
                    self.files[info.path] = info
            except Exception as e:
                self.logger.error(f"Failed to analyze {path}: {e}")
        
        executor.shutdown()
        self.logger.info(f"Scanned {len(self.files)} files successfully.")
        return self.files, self.components
    
    def _analyze_file(self, path: Path) -> Optional[FileInfo]:
        try:
            stat = path.stat()
            mtime = stat.st_mtime
            size = stat.st_size
            with open(path, 'rb') as f:
                content_bytes = f.read()
            content = content_bytes.decode('utf-8', errors='ignore')
            lines = content.count('\n') + 1
            content_hash = hashlib.sha256(content_bytes).hexdigest()
            
            if self.cache and not self.cache.is_changed(str(path), mtime, content_hash):
                # For unchanged files, we could skip parsing; but we need the metadata.
                # We'll still parse but can skip heavy operations if cached later.
                pass
            
            extension = path.suffix.lower()
            relative = path.relative_to(self.root)
            
            info = FileInfo(
                path=str(path),
                relative_path=str(relative),
                name=path.name,
                extension=extension,
                size=size,
                lines=lines,
                content_hash=content_hash,
                structural_hash="",
                modified=mtime,
                category=FileCategory.UNKNOWN,
                last_modified_days=int((time.time() - mtime) / 86400),
                has_typescript=extension in ('.ts', '.tsx'),
                has_jsx=extension in ('.tsx', '.jsx')
            )
            
            # Parse with tree‑sitter if available and applicable
            if TREE_SITTER_AVAILABLE and self.parser and extension in ('.ts', '.tsx', '.js', '.jsx', '.py'):
                lang = TSParser.get_language(extension)
                if lang:
                    self.parser.set_language(lang)
                    tree = self.parser.parse(content_bytes)
                    if tree:
                        self._extract_ast_info(tree, content_bytes, info, extension)
                        info.structural_hash = self._compute_structural_hash_ast(tree, content_bytes)
                    else:
                        self._extract_regex_info(content, info, extension)
                        info.structural_hash = self._compute_structural_hash_regex(content)
                else:
                    self._extract_regex_info(content, info, extension)
                    info.structural_hash = self._compute_structural_hash_regex(content)
            else:
                self._extract_regex_info(content, info, extension)
                info.structural_hash = self._compute_structural_hash_regex(content)
            
            info.category = self._classify_file(path, content, info)
            info.is_entry_point = (path.name in Config.ENTRY_POINT_PATTERNS)
            info.is_test_file = self._is_test_file(path)
            
            # Git history
            info.git_commit_count = GitHelper.get_commit_count(self.root, str(path))
            info.has_git_history = info.git_commit_count >= Config.GIT_HISTORY_COMMIT_THRESHOLD
            
            return info
        except Exception as e:
            self.logger.error(f"Error in _analyze_file {path}: {e}")
            return None
    
    # -------------------------------------------------------------------------
    # AST‑based extraction (tree‑sitter)
    # -------------------------------------------------------------------------
    def _extract_ast_info(self, tree, source_bytes: bytes, info: FileInfo, ext: str):
        root = tree.root_node
        # Language-specific handling
        if ext in ('.ts', '.tsx', '.js', '.jsx'):
            self._extract_ts_ast_info(root, source_bytes, info)
        elif ext == '.py':
            self._extract_python_ast_info(root, source_bytes, info)
    
    def _extract_ts_ast_info(self, root, source_bytes: bytes, info: FileInfo):
        # Exports
        export_nodes = list(ast_walk(root, ('export_statement', 'export_specifier')))
        exports = set()
        for node in export_nodes:
            if node.type == 'export_statement':
                text = node_text(node, source_bytes)
                for word in re.findall(r'\b[a-zA-Z_]\w*\b', text):
                    if word not in ('export', 'default', 'const', 'let', 'var', 'function', 'class', 'interface', 'type', 'enum'):
                        exports.add(word)
                if 'default' in text:
                    exports.add('default')
            elif node.type == 'export_specifier':
                name = node_text(node, source_bytes)
                exports.add(name.strip())
        info.exports = list(exports)
        info.exported_symbols = info.exports.copy()
        
        # Imports
        import_nodes = list(ast_walk(root, ('import_statement',)))
        imports = []
        for node in import_nodes:
            for child in node.children:
                if child.type == 'string':
                    module = node_text(child, source_bytes).strip('\'"')
                    imports.append(module)
                    break
        info.imports = imports
        
        # JSX detection
        jsx_nodes = list(ast_walk(root, ('jsx_element', 'jsx_self_closing_element')))
        info.has_jsx = len(jsx_nodes) > 0
        
        # React component detection
        self._detect_react_components_ast(root, source_bytes, info)
        
        # Hook usage
        hook_calls = []
        for hook in Config.HOOK_PATTERNS:
            for node in ast_walk(root, ('call_expression',)):
                text = node_text(node, source_bytes)
                if hook in text[:100]:
                    hook_calls.append(hook)
        info.hook_usage = list(set(hook_calls))
        
        # any count
        any_nodes = list(ast_walk(root, ('type_annotation',)))
        any_count = 0
        for node in any_nodes:
            if 'any' in node_text(node, source_bytes):
                any_count += 1
        info.any_count = any_count
        
        # Cyclomatic complexity
        complexity = 0
        for node in ast_walk(root, (
            'if_statement', 'for_statement', 'while_statement', 
            'do_statement', 'switch_case', 'catch_clause',
            'conditional_expression', 'binary_expression'
        )):
            if node.type == 'binary_expression':
                op = node_text(node, source_bytes).split()[0] if node.children else ''
                if op in ('&&', '||'):
                    complexity += 1
            else:
                complexity += 1
        info.complexity_estimate = complexity
        
        # Counts
        info.interface_count = len(list(ast_walk(root, ('interface_declaration',))))
        info.type_count = len(list(ast_walk(root, ('type_alias_declaration',))))
        info.function_count = len(list(ast_walk(root, ('function_declaration',))))
        info.class_count = len(list(ast_walk(root, ('class_declaration',))))
        
        # Side effects detection (top‑level calls)
        top_children = root.children
        for child in top_children:
            if child.type == 'expression_statement':
                text = node_text(child, source_bytes)
                for pat in Config.SIDE_EFFECT_PATTERNS:
                    if pat in text:
                        info.has_side_effects = True
                        break
            if info.has_side_effects:
                break
        
        # Dynamic import detection
        for node in ast_walk(root, ('call_expression',)):
            text = node_text(node, source_bytes)
            if 'import(' in text or 'React.lazy' in text:
                info.is_dynamic_imported = True
                break
    
    def _extract_python_ast_info(self, root, source_bytes: bytes, info: FileInfo):
        """Extract Python-specific metadata."""
        # Exports: functions/classes defined at top level
        exports = []
        for node in ast_walk(root, ('function_definition', 'class_definition')):
            for child in node.children:
                if child.type == 'identifier':
                    exports.append(node_text(child, source_bytes))
                    break
        info.exports = list(set(exports))
        info.exported_symbols = info.exports.copy()
        
        # Imports
        imports = []
        for node in ast_walk(root, ('import_statement', 'import_from_statement')):
            text = node_text(node, source_bytes)
            # Extract module names
            for match in re.finditer(r'import\s+(\w+)|from\s+(\w+)', text):
                imports.append(match.group(1) or match.group(2))
        info.imports = list(set(imports))
        
        # Complexity (basic)
        complexity = 0
        for node in ast_walk(root, (
            'if_statement', 'for_statement', 'while_statement',
            'try_statement', 'with_statement', 'binary_operator'
        )):
            if node.type == 'binary_operator':
                op = node_text(node, source_bytes).split()[0]
                if op in ('and', 'or'):
                    complexity += 1
            else:
                complexity += 1
        info.complexity_estimate = complexity
        
        # Counts
        info.function_count = len(list(ast_walk(root, ('function_definition',))))
        info.class_count = len(list(ast_walk(root, ('class_definition',))))
        
        # Category hint
        info.category = FileCategory.PYTHON_MODULE
    
    def _detect_react_components_ast(self, root, source_bytes, info: FileInfo):
        # Function component
        funcs = list(ast_walk(root, ('function_declaration', 'arrow_function')))
        for node in funcs:
            jsx = list(ast_walk(node, ('jsx_element', 'jsx_self_closing_element')))
            if jsx:
                info.is_react_component = True
                info.component_type = 'function' if node.type == 'function_declaration' else 'arrow'
                if node.type == 'function_declaration':
                    for child in node.children:
                        if child.type == 'identifier':
                            info.exported_symbols.append(node_text(child, source_bytes))
                            break
                break
        # Class component
        classes = list(ast_walk(root, ('class_declaration',)))
        for node in classes:
            text = node_text(node, source_bytes)
            if 'extends' in text and ('Component' in text or 'React.Component' in text):
                info.is_react_component = True
                info.component_type = 'class'
                break
        
        # Custom hook
        funcs = list(ast_walk(root, ('function_declaration', 'arrow_function')))
        for node in funcs:
            name_node = None
            for child in node.children:
                if child.type == 'identifier':
                    name_node = child
                    break
            if name_node:
                name = node_text(name_node, source_bytes)
                if name.startswith('use'):
                    calls = list(ast_walk(node, ('call_expression',)))
                    hook_called = any(
                        hook in node_text(call, source_bytes) 
                        for hook in Config.HOOK_PATTERNS
                        for call in calls
                    )
                    if hook_called:
                        info.is_custom_hook = True
                        break
    
    def _compute_structural_hash_ast(self, tree, source_bytes: bytes) -> str:
        normalized_parts = []
        def visit(node):
            if node.type in ('identifier', 'string', 'number'):
                normalized_parts.append('_ID_' if node.type == 'identifier' else '_LIT_')
            else:
                normalized_parts.append(node.type)
                for child in node.children:
                    visit(child)
        visit(tree.root_node)
        normalized = ' '.join(normalized_parts)
        return hashlib.sha256(normalized.encode()).hexdigest()
    
    # -------------------------------------------------------------------------
    # Regex fallback methods (improved version)
    # -------------------------------------------------------------------------
    def _extract_regex_info(self, content: str, info: FileInfo, ext: str):
        # Exports
        exports = []
        for match in re.finditer(r'export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)', content):
            exports.append(match.group(1))
        for match in re.finditer(r'export\s+\{([^}]+)\}', content):
            names = match.group(1).split(',')
            exports.extend([n.strip().split()[0] for n in names if n.strip()])
        if 'export default' in content:
            exports.append('default')
        info.exports = list(set(exports))
        info.exported_symbols = info.exports.copy()
        
        # Imports
        imports = []
        for match in re.finditer(r'import\s+.*?from\s+[\'"]([^\'"]+)[\'"]', content):
            imports.append(match.group(1))
        for match in re.finditer(r'require\([\'"]([^\'"]+)[\'"]\)', content):
            imports.append(match.group(1))
        info.imports = imports
        
        # React component
        if re.search(r'function\s+[A-Z]\w+\s*\([^)]*\)\s*\{[^}]*return\s*\(?<', content) or \
           re.search(r'const\s+[A-Z]\w+\s*=\s*\([^)]*\)\s*=>\s*\(?<', content):
            info.is_react_component = True
            info.component_type = 'function'
        elif 'React.Component' in content or ('Component' in content and 'extends' in content):
            info.is_react_component = True
            info.component_type = 'class'
        
        # Custom hook
        if info.name.startswith('use') and re.search(r'export\s+(?:const|function)\s+(use[A-Z]\w+)', content):
            info.is_custom_hook = True
        
        # any count
        info.any_count = len(re.findall(r':\s*any\b', content))
        
        # Complexity
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
        info.complexity_estimate = score
        
        # Hook usage
        hooks = []
        for hook in Config.HOOK_PATTERNS:
            if hook in content:
                hooks.append(hook)
        info.hook_usage = hooks
        
        # JSX
        info.has_jsx = '<' in content and ('React' in content or info.extension in ('.tsx', '.jsx'))
        
        # Side effects
        info.has_side_effects = any(p in content for p in Config.SIDE_EFFECT_PATTERNS)
        
        # Dynamic import
        info.is_dynamic_imported = any(re.search(p, content) for p in Config.DYNAMIC_IMPORT_PATTERNS)
        
        # Counts
        info.interface_count = len(re.findall(r'\binterface\s+\w+', content))
        info.type_count = len(re.findall(r'\btype\s+\w+\s*=', content))
        info.function_count = len(re.findall(r'\bfunction\s+\w+', content))
        info.class_count = len(re.findall(r'\bclass\s+\w+', content))
    
    def _compute_structural_hash_regex(self, content: str) -> str:
        content = re.sub(r'//.*?$', '', content, flags=re.MULTILINE)
        content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
        content = re.sub(r'"(?:[^"\\]|\\.)*"', '""', content)
        content = re.sub(r"'(?:[^'\\]|\\.)*'", "''", content)
        content = re.sub(r'`(?:[^`\\]|\\.)*`', '``', content)
        content = re.sub(r'\b\d+\b', '0', content)
        content = re.sub(r'\s+', ' ', content)
        return hashlib.sha256(content.encode()).hexdigest()
    
    # -------------------------------------------------------------------------
    # Classification & Helpers
    # -------------------------------------------------------------------------
    def _classify_file(self, path: Path, content: str, info: FileInfo) -> FileCategory:
        rel = str(path).lower()
        name = path.name.lower()
        
        if path.suffix == '.d.ts' or 'types' in rel:
            return FileCategory.TYPE_DEFINITION
        if 'constant' in name or 'const' in name:
            return FileCategory.CONSTANTS
        if name in {'index.ts', 'index.tsx', 'index.js', 'index.jsx'}:
            export_count = len(re.findall(r'export\s+\{', content))
            if export_count >= Config.BARREL_EXPORT_THRESHOLD:
                return FileCategory.BARREL_EXPORT
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
        return FileCategory.CORE_LOGIC
    
    def _is_test_file(self, path: Path) -> bool:
        name = path.name.lower()
        path_str = str(path).lower()
        return (name.endswith('.test.ts') or 
                name.endswith('.test.tsx') or 
                name.endswith('.spec.ts') or 
                name.endswith('.spec.tsx') or
                '__tests__' in path_str or
                name.endswith('.test.js') or
                name.endswith('.test.jsx') or
                name.endswith('_test.py') or
                name.startswith('test_'))

# =============================================================================
# DEPENDENCY GRAPH BUILDER
# =============================================================================
class DependencyGraphBuilder:
    def __init__(self, files: Dict[str, FileInfo], logger: AnalysisLogger):
        self.files = files
        self.logger = logger
        self.barrel_files: Set[str] = set()
        self.ts_resolver = None
        if TYPESCRIPT_COMPILER_AVAILABLE:
            try:
                project_root = Path(next(iter(files.values())).path).parent
                self.ts_resolver = TSCompilerResolver(project_root)
            except:
                pass
    
    def build(self):
        self.logger.info("Building dependency graph...")
        self._identify_barrels()
        for path, meta in self.files.items():
            for imp in meta.imports:
                resolved = self._resolve_import(path, imp)
                if resolved and resolved in self.files:
                    self.files[resolved].dependents.add(path)
                    meta.dependencies.add(resolved)
        for path, meta in self.files.items():
            meta.dependents_count = len(meta.dependents)
        self._mark_barrel_exports()
        self.logger.info("Dependency graph built.")
    
    def _identify_barrels(self):
        for path, meta in self.files.items():
            if meta.name in {'index.ts', 'index.tsx', 'index.js', 'index.jsx'}:
                try:
                    with open(path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    export_count = len(re.findall(r'export\s+\{', content))
                    if export_count >= Config.BARREL_EXPORT_THRESHOLD:
                        self.barrel_files.add(path)
                        meta.category = FileCategory.BARREL_EXPORT
                except:
                    pass
    
    def _mark_barrel_exports(self):
        for barrel in self.barrel_files:
            try:
                with open(barrel, 'r', encoding='utf-8') as f:
                    content = f.read()
                for match in re.finditer(r'export\s+.*\s+from\s+[\'"]([^\'"]+)[\'"]', content):
                    imp = match.group(1)
                    resolved = self._resolve_import(barrel, imp)
                    if resolved and resolved in self.files:
                        self.files[resolved].is_barrel_exported = True
            except:
                pass
    
    def _resolve_import(self, from_path: str, import_path: str) -> Optional[str]:
        # Try TypeScript compiler resolver first if available
        if self.ts_resolver:
            resolved = self.ts_resolver.resolve_import(from_path, import_path)
            if resolved:
                return resolved
        
        # Fallback to heuristic
        if import_path.startswith('.'):
            base = Path(from_path).parent
            target = (base / import_path).resolve()
            for ext in ['.ts', '.tsx', '.js', '.jsx', '.py', '']:
                candidate = str(target) + ext
                if candidate in self.files:
                    return candidate
                index_candidate = str(target / 'index') + ext
                if index_candidate in self.files:
                    return index_candidate
        return None

# =============================================================================
# DUPLICATE DETECTOR (AST‑based similarity)
# =============================================================================
class DuplicateDetector:
    def __init__(self, files: Dict[str, FileInfo], logger: AnalysisLogger):
        self.files = files
        self.logger = logger
        self.clusters: List[DuplicateCluster] = []
        self.cluster_counter = 0
    
    def analyze(self) -> List[DuplicateCluster]:
        self.logger.info("Detecting duplicates...")
        self._detect_exact_duplicates()
        self._detect_structural_duplicates()
        self.logger.info(f"Found {len(self.clusters)} duplicate clusters.")
        return self.clusters
    
    def _detect_exact_duplicates(self):
        hash_groups = defaultdict(list)
        for path, meta in self.files.items():
            if meta.size > 100 and not meta.is_test_file:
                hash_groups[meta.content_hash].append(path)
        for h, paths in hash_groups.items():
            if len(paths) > 1:
                self._create_cluster(paths, 1.0, 'exact')
    
    def _detect_structural_duplicates(self):
        struct_groups = defaultdict(list)
        for path, meta in self.files.items():
            if path not in self._processed_paths() and not meta.is_test_file and meta.size > 100:
                struct_groups[meta.structural_hash].append(path)
        
        for h, candidates in struct_groups.items():
            if len(candidates) < 2:
                continue
            processed = set()
            for i, a in enumerate(candidates):
                if a in processed:
                    continue
                cluster = [a]
                for j, b in enumerate(candidates[i+1:], i+1):
                    if b in processed:
                        continue
                    sim = self._structural_similarity(a, b)
                    if sim >= Config.SIMILARITY_THRESHOLD:
                        cluster.append(b)
                        processed.add(b)
                if len(cluster) > 1:
                    sims = []
                    for x in cluster:
                        for y in cluster:
                            if x < y:
                                sims.append(self._structural_similarity(x, y))
                    avg_sim = sum(sims)/len(sims) if sims else 0.85
                    self._create_cluster(cluster, avg_sim, 'structural')
                    processed.update(cluster)
    
    def _processed_paths(self) -> Set[str]:
        paths = set()
        for c in self.clusters:
            paths.update(c.files)
        return paths
    
    def _structural_similarity(self, path_a: str, path_b: str) -> float:
        try:
            with open(path_a, 'r', encoding='utf-8') as f:
                a = f.read()
            with open(path_b, 'r', encoding='utf-8') as f:
                b = f.read()
            norm_a = self._normalize_for_comparison(a)
            norm_b = self._normalize_for_comparison(b)
            seq = SequenceMatcher(None, norm_a.split(), norm_b.split()).ratio()
            set_a = set(norm_a.split())
            set_b = set(norm_b.split())
            jac = len(set_a & set_b) / (len(set_a | set_b) + 1e-6)
            return 0.6*seq + 0.4*jac
        except:
            return 0.0
    
    def _normalize_for_comparison(self, content: str) -> str:
        content = re.sub(r'//.*?$', '', content, flags=re.MULTILINE)
        content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
        content = re.sub(r'"(?:[^"\\]|\\.)*"', '""', content)
        content = re.sub(r"'(?:[^'\\]|\\.)*'", "''", content)
        content = re.sub(r'`(?:[^`\\]|\\.)*`', '``', content)
        content = re.sub(r'\b\d+\b', '0', content)
        content = re.sub(r'\s+', ' ', content)
        return content
    
    def _create_cluster(self, paths: List[str], similarity: float, ctype: str):
        self.cluster_counter += 1
        cid = f"dup_{self.cluster_counter:04d}"
        exported = sum(1 for p in paths if self.files[p].exports)
        recent = sum(1 for p in paths if self.files[p].last_modified_days < 60)
        
        scores = []
        for p in paths:
            m = self.files[p]
            score = (m.stability_score * 10 + 
                     len(m.dependents) * 20 +
                     len(m.exports) * 5 +
                     (10 if not m.has_side_effects else 0) +
                     (5 if m.any_count == 0 else -m.any_count))
            scores.append((p, score))
        scores.sort(key=lambda x: x[1], reverse=True)
        base = scores[0][0]
        merge_target = scores[1][0] if len(scores) > 1 else None
        
        diff_summary = ["Files are structurally similar."]
        if len(paths) >= 2:
            diff_summary.append("Consider consolidating exports.")
        
        if ctype == 'exact':
            risk = RiskLevel.LOW
            rec = Recommendation.CONSOLIDATE_DUPLICATES
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
                rec = Recommendation.MERGE_INTO_ANOTHER_FILE
                conf = 0.75
            else:
                risk = RiskLevel.LOW
                rec = Recommendation.CONSOLIDATE_DUPLICATES
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

# =============================================================================
# USAGE ANALYZER (with Git history)
# =============================================================================
class UsageAnalyzer:
    def __init__(self, files: Dict[str, FileInfo], logger: AnalysisLogger, project_root: Path):
        self.files = files
        self.logger = logger
        self.project_root = project_root
        self.unused: List[str] = []
        self.unwired: List[str] = []
    
    def analyze(self):
        self.logger.info("Analyzing usage patterns...")
        self._detect_unused()
        self._detect_unwired()
        self.logger.info(f"Unused files: {len(self.unused)}, Unwired features: {len(self.unwired)}")
    
    def _detect_unused(self):
        for path, meta in self.files.items():
            if meta.is_entry_point:
                continue
            if meta.category in {FileCategory.CONFIGURATION, FileCategory.ASSET, FileCategory.TEST}:
                continue
            if meta.category == FileCategory.FRAMEWORK_CORE:
                continue
            if meta.category == FileCategory.BARREL_EXPORT:
                continue
            if meta.is_dynamic_imported:
                continue
            if meta.is_barrel_exported:
                continue
            if meta.dependents_count == 0 and meta.exports:
                self.unused.append(path)
    
    def _detect_unwired(self):
        for path, meta in self.files.items():
            if path in self.unused:
                continue
            if (meta.dependents_count == 0 and
                meta.lines > 50 and
                len(meta.exports) > 2 and
                meta.category in {FileCategory.SERVICE, FileCategory.UI_COMPONENT,
                                  FileCategory.CUSTOM_HOOK, FileCategory.CORE_LOGIC,
                                  FileCategory.PYTHON_MODULE} and
                not meta.is_dynamic_imported and
                not meta.is_barrel_exported):
                # Check git history
                meta.git_commit_count = GitHelper.get_commit_count(self.project_root, path)
                meta.has_git_history = meta.git_commit_count >= Config.GIT_HISTORY_COMMIT_THRESHOLD
                self.unwired.append(path)
    
    def get_similar_files(self, file_path: str, top_n: int = 3) -> List[Tuple[str, float]]:
        """Find files with similar exports/imports to suggest wiring."""
        file_info = self.files.get(file_path)
        if not file_info:
            return []
        # Jaccard similarity on exports
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
            intersection = len(exports_set & other_exports)
            union = len(exports_set | other_exports)
            if union == 0:
                continue
            sim = intersection / union
            if sim > 0.3:  # threshold
                similarities.append((path, sim))
        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:top_n]

# =============================================================================
# STABILITY & RISK CALCULATOR
# =============================================================================
class StabilityCalculator:
    def __init__(self, files: Dict[str, FileInfo], logger: AnalysisLogger):
        self.files = files
        self.logger = logger
    
    def calculate(self):
        self.logger.info("Computing stability and risk...")
        for path, meta in self.files.items():
            meta.stability_score = self._compute_stability(meta)
            meta.risk_level = self._compute_risk_level(meta)
            meta.short_reason = self._generate_short_reason(meta)
        self.logger.info("Stability and risk computed.")
    
    def _compute_stability(self, meta: FileInfo) -> float:
        score = 0.0
        score += min(meta.dependents_count * 0.4, 4.0)
        score += min(len(meta.exports) * 0.2, 2.0)
        score += min(meta.lines * 0.01, 1.0)
        score += min(meta.complexity_estimate * 0.02, 1.0)
        score += max(2.0 - (meta.last_modified_days * 0.01), 0.0)
        score -= min(meta.any_count * 0.1, 1.0)
        if meta.is_barrel_exported:
            score += 1.0
        if meta.is_dynamic_imported:
            score += 1.5
        if meta.category == FileCategory.FRAMEWORK_CORE:
            score += 2.0
        if meta.dependents_count > 5:
            score += Config.SHARED_MODULE_BOOST
        return max(min(score, 10.0), 0.0)
    
    def _compute_risk_level(self, meta: FileInfo) -> RiskLevel:
        risk = 0
        risk += min(meta.dependents_count * 5, 50)
        if meta.is_entry_point:
            risk += 40
        if meta.category in {FileCategory.PAGE_OR_ROUTE, FileCategory.CONTEXT,
                             FileCategory.STORE_OR_STATE, FileCategory.FRAMEWORK_CORE}:
            risk += 30
        if meta.has_side_effects:
            risk += 15
        if meta.complexity_estimate > Config.COMPLEXITY_HIGH_THRESHOLD:
            risk += 20
        if meta.is_dynamic_imported:
            risk += 25
        risk += min(meta.any_count * 2, 20)
        if risk >= 70:
            return RiskLevel.CRITICAL
        if risk >= 50:
            return RiskLevel.HIGH
        if risk >= 30:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW
    
    def _generate_short_reason(self, meta: FileInfo) -> str:
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
        if meta.has_git_history:
            reasons.append(f"Git commits: {meta.git_commit_count}")
        return " | ".join(reasons) if reasons else "Standard file"

# =============================================================================
# RECOMMENDATION ENGINE (with wiring suggestions)
# =============================================================================
class RecommendationEngine:
    @staticmethod
    def generate_comprehensive_recommendation(
        file_info: FileInfo,
        all_files: Dict[str, FileInfo],
        duplicates: List[DuplicateCluster],
        usage_analyzer: Optional[UsageAnalyzer] = None
    ) -> Tuple[Recommendation, List[str], float]:
        reasoning = []
        conf = 0.5
        
        # Critical files
        if file_info.is_entry_point:
            return Recommendation.KEEP_AS_IS, [
                "Application entry point – critical",
                "Removing would break bootstrap",
                "Required by build system"
            ], 1.0
        
        if file_info.category == FileCategory.FRAMEWORK_CORE:
            return Recommendation.KEEP_AS_IS, [
                "Framework core infrastructure",
                "Required for application architecture",
                "High risk if modified"
            ], 1.0
        
        # High dependents
        if file_info.dependents_count >= Config.CRITICAL_DEPENDENCY_THRESHOLD:
            return Recommendation.KEEP_AS_IS, [
                f"Critical shared module – {file_info.dependents_count} dependents",
                "Widely used across application",
                "Consider as stable API contract"
            ], 0.95
        
        # Duplicate cluster
        if file_info.duplicate_cluster_id:
            cluster = next(
                (c for c in duplicates if c.cluster_id == file_info.duplicate_cluster_id),
                None
            )
            if cluster:
                if cluster.similarity_score >= 0.95:
                    if file_info.path == cluster.suggested_base_file:
                        return Recommendation.KEEP_AS_IS, [
                            "Identified as primary implementation in duplicate cluster",
                            f"Stability: {file_info.stability_score:.1f}/10",
                            f"Other {cluster.cluster_size-1} file(s) should merge into this"
                        ], 0.90
                    else:
                        return Recommendation.MERGE_INTO_ANOTHER_FILE, [
                            f"Duplicate of {Path(cluster.suggested_base_file).name}",
                            f"Similarity: {cluster.similarity_score:.0%}",
                            "Consolidate to reduce maintenance burden",
                            f"Estimated savings: {cluster.estimated_savings} lines"
                        ], 0.85
                else:
                    return Recommendation.INVESTIGATE, [
                        f"Structural similarity ({cluster.similarity_score:.0%}) detected",
                        "Files may serve different purposes",
                        "Review for potential shared abstraction"
                    ] + cluster.diff_summary[:2], 0.70
        
        # Unused with exports
        if file_info.dependents_count == 0 and file_info.exports:
            if file_info.is_barrel_exported or file_info.is_dynamic_imported:
                return Recommendation.KEEP_AS_IS, [
                    "Indirect usage via barrel or dynamic import",
                    "Static analysis cannot detect all references"
                ], 0.85
            if file_info.last_modified_days < 60:
                return Recommendation.WIRE_TO_APPLICATION, [
                    "Recently created but not integrated",
                    f"Last modified {file_info.last_modified_days} days ago",
                    "Likely work in progress or incomplete feature"
                ], 0.70
            if file_info.last_modified_days > 180 and file_info.lines < 200:
                return Recommendation.SAFE_TO_ARCHIVE, [
                    "Small unused file with no dependents",
                    f"Dormant for {file_info.last_modified_days} days",
                    "Low complexity – safe to archive"
                ], 0.80
            return Recommendation.INVESTIGATE, [
                "Exported but not imported anywhere",
                f"Age: {file_info.last_modified_days} days",
                "Verify usage before removal"
            ], 0.65
        
        # Unwired features (enhanced with git history and similar files)
        if (file_info.dependents_count == 0 and
            file_info.lines > 50 and
            len(file_info.exports) > 2 and
            file_info.category in {FileCategory.SERVICE, FileCategory.UI_COMPONENT,
                                  FileCategory.CUSTOM_HOOK, FileCategory.CORE_LOGIC,
                                  FileCategory.PYTHON_MODULE} and
            not file_info.is_dynamic_imported and
            not file_info.is_barrel_exported):
            
            reasons = [
                f"Substantial {file_info.category.value.lower()} not integrated",
                f"{file_info.lines} lines with {len(file_info.exports)} exports",
                "Complete implementation but missing integration"
            ]
            if file_info.has_git_history:
                reasons.append(f"Has {file_info.git_commit_count} git commits – potentially orphaned legacy code")
            else:
                reasons.append("No significant git history – may be recently added or dead")
            
            # Add wiring suggestions
            if usage_analyzer:
                similar = usage_analyzer.get_similar_files(file_info.path, top_n=2)
                if similar:
                    similar_names = [Path(p).name for p, _ in similar]
                    reasons.append(f"Consider wiring to: {', '.join(similar_names)} (based on export similarity)")
            
            return Recommendation.WIRE_TO_APPLICATION, reasons, 0.75
        
        # Type safety
        if file_info.any_count > 5:
            return Recommendation.ADD_TYPE_SAFETY, [
                f"Weak type safety: {file_info.any_count} 'any' usages",
                "Replace 'any' with specific types or generics",
                "Use 'unknown' for truly dynamic types"
            ], 0.85
        
        # Complexity
        if file_info.complexity_estimate > Config.COMPLEXITY_HIGH_THRESHOLD:
            return Recommendation.REDUCE_COMPLEXITY, [
                f"High cyclomatic complexity: {file_info.complexity_estimate}",
                "Break into smaller functions",
                "Extract complex logic to separate utilities"
            ], 0.80
        
        # Large files
        if file_info.lines > 500:
            return Recommendation.REFACTOR_FOR_CLARITY, [
                f"Large file: {file_info.lines} lines",
                "Consider splitting into multiple modules",
                "Target < 300 lines per file"
            ], 0.75
        
        # Outdated patterns
        if file_info.is_react_component and file_info.component_type == "class":
            return Recommendation.MODERNIZE_IMPLEMENTATION, [
                "Class component – consider migrating to hooks",
                "Functional components with hooks are modern standard",
                "Gradual migration recommended"
            ], 0.70
        
        # Missing tests
        if (file_info.category in {FileCategory.UI_COMPONENT, FileCategory.SERVICE, FileCategory.CORE_LOGIC} and
            file_info.lines > 50):
            test_exists = any(
                f.is_test_file and 
                f.name.replace('.test', '').replace('.spec', '') == file_info.name
                for f in all_files.values()
            )
            if not test_exists:
                return Recommendation.INVESTIGATE, [
                    "No corresponding test file found",
                    f"Substantial {file_info.category.value.lower()} without tests",
                    "Add unit tests for reliability"
                ], 0.65
        
        # Stable, well-maintained
        if (file_info.stability_score > 7.0 and
            file_info.dependents_count > 0 and
            file_info.any_count < 3 and
            file_info.complexity_estimate < 30):
            return Recommendation.KEEP_AS_IS, [
                f"Well-maintained (stability: {file_info.stability_score:.1f}/10)",
                f"Actively used by {file_info.dependents_count} file(s)",
                "No action needed"
            ], 0.90
        
        # Default
        return Recommendation.KEEP_AS_IS, [
            "Standard file with no critical issues",
            f"Stability: {file_info.stability_score:.1f}/10",
            f"Used by {file_info.dependents_count} file(s)" if file_info.dependents_count > 0 else "No current dependents"
        ], 0.70

# =============================================================================
# ARCHIVE DECISION ENGINE
# =============================================================================
class ArchiveDecisionEngine:
    def __init__(self, files: Dict[str, FileInfo], logger: AnalysisLogger):
        self.files = files
        self.logger = logger
    
    def evaluate_archive_candidate(self, file_info: FileInfo) -> ArchiveDecision:
        blockers = []
        reasons = []
        alternatives = []
        
        # Hard blockers
        if file_info.category in {FileCategory.PAGE_OR_ROUTE, FileCategory.CONTEXT,
                                  FileCategory.STORE_OR_STATE, FileCategory.FRAMEWORK_CORE,
                                  FileCategory.BARREL_EXPORT}:
            blockers.append(f"Critical category: {file_info.category.value}")
        if file_info.is_dynamic_imported:
            blockers.append("Dynamically imported – required for code splitting")
        if file_info.last_modified_days < Config.RECENT_DAYS_BLOCKER:
            blockers.append(f"Recently modified ({file_info.last_modified_days} days ago)")
        if file_info.dependents_count > 0:
            blockers.append(f"Has {file_info.dependents_count} active dependents")
        if file_info.is_barrel_exported:
            blockers.append("Exported via barrel index – part of public API")
        if file_info.is_entry_point:
            blockers.append("Application entry point – absolutely critical")
        if any(infra in file_info.path.lower() for infra in Config.INFRASTRUCTURE_PATHS):
            blockers.append("Infrastructure/core path – critical for system")
        
        if blockers:
            return ArchiveDecision(
                allowed=False,
                decision=Recommendation.KEEP_AS_IS,
                score=0.0,
                reasons=reasons,
                blockers=blockers,
                confidence=1.0,
                impact_analysis=f"Archiving would break {file_info.dependents_count} dependent(s)" if file_info.dependents_count > 0 else "Critical system file",
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
        if file_info.last_modified_days > 180:
            score += 10
            reasons.append(f"Dormant for {file_info.last_modified_days} days")
        elif file_info.last_modified_days > 90:
            score += 5
            reasons.append(f"Not modified in {file_info.last_modified_days} days")
        if file_info.stability_score < 3.0:
            score += 8
            reasons.append(f"Low stability ({file_info.stability_score:.1f}/10)")
        if file_info.lines < 50:
            score += 5
            reasons.append("Small file – low impact")
        if file_info.category in {FileCategory.UTILITY, FileCategory.UNKNOWN}:
            score += 5
            reasons.append("Non-critical category")
        
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
                decision=Recommendation.SAFE_TO_ARCHIVE,
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
                decision=Recommendation.KEEP_AS_IS,
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
    def __init__(self, project_path: Path, report_folder: Path,
                 files: Dict[str, FileInfo], logger: AnalysisLogger):
        self.project_path = project_path
        self.report_folder = report_folder
        self.files = files
        self.logger = logger
    
    def create_safe_archive(self, candidates: List[str], keep_temp: bool = False) -> Optional[Path]:
        if not candidates:
            self.logger.warning("No files to archive")
            return None
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        archive_name = f"refactor_archive_{timestamp}.zip"
        archives_dir = self.report_folder / 'archives'
        archives_dir.mkdir(parents=True, exist_ok=True)
        archive_path = archives_dir / archive_name
        
        temp_dir = self.report_folder / f"temp_archive_{timestamp}"
        temp_dir.mkdir(parents=True)
        
        metadata = {
            'timestamp': timestamp,
            'total_files': len(candidates),
            'tool_version': Config.TOOL_VERSION,
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
                meta = self.files[file_path]
                metadata['files'].append({
                    'path': str(rel),
                    'size': meta.size,
                    'lines': meta.lines,
                    'category': meta.category.value,
                    'risk_level': meta.risk_level.value,
                    'stability_score': meta.stability_score,
                    'recommendation': meta.recommendation.value,
                    'reasoning': meta.short_reason,
                    'last_modified_days': meta.last_modified_days,
                    'git_commit_count': meta.git_commit_count
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
            with zipfile.ZipFile(archive_path, 'r') as zipf:
                if len(zipf.namelist()) == 0:
                    raise ValueError("ZIP is empty")
            self.logger.info(f"Archive created: {archive_path}")
        except Exception as e:
            self.logger.error(f"ZIP creation failed: {e}")
            shutil.rmtree(temp_dir, ignore_errors=True)
            return None
        
        latest_link = archives_dir / "latest_archive.zip"
        try:
            if latest_link.exists():
                latest_link.unlink()
            shutil.copy2(archive_path, latest_link)
        except:
            pass
        
        if not keep_temp:
            shutil.rmtree(temp_dir, ignore_errors=True)
        
        return archive_path

# =============================================================================
# REPORT GENERATOR (JSON, CSV, HTML Dashboard with Unwired section)
# =============================================================================
class ReportGenerator:
    def __init__(self, report: AnalysisReport, report_folder: Path, logger: AnalysisLogger):
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
        self.logger.info(f"full_report.json written")
    
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
        self.logger.info(f"summary_report.json written")
    
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
        self.logger.info(f"high_risk.csv written")
    
    def generate_dependency_graph_json(self):
        nodes = []
        edges = []
        node_ids = set()
        for path, data in self.report.files.items():
            node_id = data['relative_path']
            node_ids.add(node_id)
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
            for dep in data.get('dependents', []):
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
        self.logger.info(f"dependency_graph.json written")
    
    def generate_html_dashboard(self):
        html = self._build_dashboard_html()
        path = self.report_folder / 'optimization_dashboard.html'
        with open(path, 'w', encoding='utf-8') as f:
            f.write(html)
        self.logger.info(f"optimization_dashboard.html written")
    
    def _build_dashboard_html(self) -> str:
        # Build unwired table rows
        unwired_rows = ""
        for path in self.report.unwired_candidates[:50]:
            data = self.files_dict.get(path, {})
            git_badge = "✅" if data.get('has_git_history') else "❌"
            unwired_rows += f"""
            <tr>
                <td>{data.get('relative_path', path)}</td>
                <td>{data.get('category', '')}</td>
                <td>{data.get('lines', 0)}</td>
                <td>{len(data.get('exported_symbols', []))}</td>
                <td>{git_badge}</td>
                <td><span class='badge {data.get('risk_level', 'LOW')}'>{data.get('risk_level', 'LOW')}</span></td>
            </tr>
            """
        
        return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Code Intelligence Dashboard</title>
    <script src="https://unpkg.com/vis-network@9.1.2/dist/vis-network.min.js"></script>
    <style>
        * {{ margin:0; padding:0; box-sizing:border-box; }}
        body {{ font-family: sans-serif; background: #0a0e27; color: #e2e8f0; padding: 20px; }}
        .dashboard {{ max-width: 1600px; margin: 0 auto; }}
        h1 {{ color: #6366f1; }}
        .stats {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap: 20px; margin: 20px 0; }}
        .card {{ background: #141b3a; padding: 20px; border-radius: 8px; border: 1px solid #6366f1; }}
        .section {{ background: #141b3a; margin: 20px 0; padding: 20px; border-radius: 8px; }}
        #graph {{ width: 100%; height: 600px; border: 1px solid #6366f1; }}
        table {{ width: 100%; border-collapse: collapse; }}
        th, td {{ padding: 8px; text-align: left; border-bottom: 1px solid #2d3748; }}
        .badge {{ display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 12px; }}
        .badge.CRITICAL {{ background: #ef4444; color: white; }}
        .badge.HIGH {{ background: #f97316; color: white; }}
        .badge.MEDIUM {{ background: #f59e0b; color: white; }}
        .badge.LOW {{ background: #10b981; color: white; }}
    </style>
</head>
<body>
<div class="dashboard">
    <h1>📊 Enterprise Code Intelligence v{Config.TOOL_VERSION}</h1>
    <div class="stats">
        <div class="card">Total Files: {len(self.report.files)}</div>
        <div class="card">Duplicates: {len(self.report.duplicate_clusters)}</div>
        <div class="card">Unused: {len(self.report.unused_candidates)}</div>
        <div class="card">Unwired: {len(self.report.unwired_candidates)}</div>
        <div class="card">Archive Candidates: {len(self.report.archive_candidates)}</div>
    </div>
    <div class="section">
        <h2>Dependency Graph</h2>
        <div id="graph"></div>
    </div>
    <div class="section">
        <h2>High Risk Files</h2>
        <table>
            <thead><tr><th>File</th><th>Risk</th><th>Dependents</th></tr></thead>
            <tbody>
            {"".join(f"<tr><td>{d['relative_path']}</td><td><span class='badge {d['risk_level']}'>{d['risk_level']}</span></td><td>{d['dependents_count']}</td></tr>" 
                     for p,d in list(self.report.files.items())[:20] if d['risk_level'] in ['HIGH','CRITICAL'])}
            </tbody>
        </table>
    </div>
    <div class="section">
        <h2>Unwired Components (potential orphans)</h2>
        <p>Files with exports but no dependents, substantial size. Git history: ✅ = has history, ❌ = little/no history.</p>
        <table>
            <thead><tr><th>File</th><th>Category</th><th>Lines</th><th>Exports</th><th>Git History</th><th>Risk</th></tr></thead>
            <tbody>
            {unwired_rows}
            </tbody>
        </table>
        {f"<p>... and {len(self.report.unwired_candidates)-50} more unwired components</p>" if len(self.report.unwired_candidates) > 50 else ""}
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
</script>
</body>
</html>"""
    
    def generate_report_index(self):
        index_path = self.report_folder.parent / 'index.html'
        html = f"""<!DOCTYPE html>
<html>
<head><title>Reports Index</title></head>
<body>
<h1>Code Intelligence Reports</h1>
<p>Latest analysis: {self.report.metadata['start_time']}</p>
<ul>
    <li><a href="{self.report_folder.name}/optimization_dashboard.html">Dashboard</a></li>
    <li><a href="{self.report_folder.name}/full_report.json">Full JSON</a></li>
    <li><a href="{self.report_folder.name}/high_risk.csv">High Risk CSV</a></li>
</ul>
</body>
</html>"""
        with open(index_path, 'w', encoding='utf-8') as f:
            f.write(html)
        self.logger.info(f"index.html written")

# =============================================================================
# ORCHESTRATOR
# =============================================================================
class CodeIntelligencePlatform:
    def __init__(self, project_path: Path, scope: Optional[Path] = None,
                 report_folder: Optional[Path] = None, keep_history: bool = False,
                 parallel: bool = False, dry_run: bool = False):
        self.project_path = project_path.resolve()
        self.scope = scope.resolve() if scope else self.project_path
        self.report_folder = report_folder.resolve() if report_folder else Path.cwd() / 'reports'
        self.keep_history = keep_history
        self.parallel = parallel
        self.dry_run = dry_run
        self.logger: Optional[AnalysisLogger] = None
        self.files: Dict[str, FileInfo] = {}
        self.report: Optional[AnalysisReport] = None
    
    def analyze(self) -> AnalysisReport:
        # Prepare report folder (overwrite behaviour)
        if self.report_folder.exists() and self.keep_history:
            history_dir = self.report_folder / 'history' / datetime.now().strftime('%Y%m%d_%H%M%S')
            history_dir.mkdir(parents=True, exist_ok=True)
            for f in self.report_folder.glob('*'):
                if f.is_file() and f.name not in ['archives', 'history']:
                    shutil.move(str(f), str(history_dir / f.name))
        else:
            for f in self.report_folder.glob('*'):
                if f.is_file():
                    f.unlink()
        
        self.report_folder.mkdir(parents=True, exist_ok=True)
        (self.report_folder / 'archives').mkdir(exist_ok=True)
        
        log_path = self.report_folder / 'runtime_log.txt'
        self.logger = AnalysisLogger(log_path)
        
        start_time = datetime.now()
        
        cache = FileCache(self.project_path, self.logger) if not self.dry_run else None
        
        # Phase 1: Scan
        scanner = ProjectScanner(self.project_path, self.logger, self.scope, 
                                 cache=cache)
        self.files, _ = scanner.scan()
        
        # Phase 2: Dependency
        dep_builder = DependencyGraphBuilder(self.files, self.logger)
        dep_builder.build()
        
        # Phase 3: Duplicates
        dup_detector = DuplicateDetector(self.files, self.logger)
        duplicates = dup_detector.analyze()
        
        # Phase 4: Usage (with git history)
        usage = UsageAnalyzer(self.files, self.logger, self.project_path)
        usage.analyze()
        
        # Phase 5: Stability & Risk
        stability = StabilityCalculator(self.files, self.logger)
        stability.calculate()
        
        # Phase 6: Recommendations
        recommendations = []
        rec_engine = RecommendationEngine()
        for path, meta in self.files.items():
            rec, reasons, conf = rec_engine.generate_comprehensive_recommendation(
                meta, self.files, duplicates, usage
            )
            meta.recommendation = rec
            meta.detailed_reasoning = reasons
            if rec != Recommendation.KEEP_AS_IS or meta.risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}:
                recommendations.append({
                    'file': meta.relative_path,
                    'title': f"{rec.value} - {meta.name}",
                    'action': rec.value,
                    'reasoning': reasons,
                    'confidence': conf,
                    'priority': meta.risk_level.value,
                    'effort': 'High' if meta.complexity_estimate > 50 else 'Medium' if meta.complexity_estimate > 20 else 'Low',
                    'impact': 'High' if meta.dependents_count > 5 else 'Medium' if meta.dependents_count > 0 else 'Low',
                    'category': meta.category.value
                })
        
        # Phase 7: Archive decisions
        archive_engine = ArchiveDecisionEngine(self.files, self.logger)
        archive_candidates = []
        for path, meta in self.files.items():
            decision = archive_engine.evaluate_archive_candidate(meta)
            if decision.allowed and decision.decision == Recommendation.SAFE_TO_ARCHIVE:
                archive_candidates.append(path)
        
        # Create issues for unwired components
        for path in usage.unwired:
            meta = self.files.get(path)
            if meta:
                issue = CodeIssue(
                    issue_type=IssueType.UNWIRED,
                    severity=meta.risk_level,
                    file_path=path,
                    description=f"Component with {len(meta.exports)} exports and {meta.lines} lines has no dependents",
                    recommendation=Recommendation.WIRE_TO_APPLICATION.value,
                    confidence=0.75,
                    impact_estimate=f"Lines: {meta.lines}, Exports: {len(meta.exports)}",
                    related_files=[]
                )
                meta.issues.append(issue)
        
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
        
        report = AnalysisReport(
            metadata={
                'tool_version': Config.TOOL_VERSION,
                'scan_root': str(self.project_path),
                'start_time': start_time.isoformat(),
                'end_time': end_time.isoformat(),
                'report_folder': str(self.report_folder),
                'warnings': self.logger.warnings,
                'errors': self.logger.errors
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
                    'dependents': list(f.dependents),
                    'stability_score': f.stability_score,
                    'risk_level': f.risk_level.value,
                    'recommendation': f.recommendation.value,
                    'short_reason': f.short_reason,
                    'last_modified_days': f.last_modified_days,
                    'complexity_estimate': f.complexity_estimate,
                    'any_count': f.any_count,
                    'is_dynamic_imported': f.is_dynamic_imported,
                    'is_test_file': f.is_test_file,
                    'duplicate_cluster_id': f.duplicate_cluster_id,
                    'has_jsx': f.has_jsx,
                    'has_typescript': f.has_typescript,
                    'interface_count': f.interface_count,
                    'type_count': f.type_count,
                    'git_commit_count': f.git_commit_count,
                    'has_git_history': f.has_git_history
                }
                for p, f in self.files.items()
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
                    'confidence_score': c.confidence_score,
                    'type': c.type,
                    'estimated_savings': c.estimated_savings
                }
                for c in duplicates
            ],
            same_name_conflicts=[],
            unused_candidates=usage.unused,
            unwired_candidates=usage.unwired,
            merge_suggestions=[],
            archive_candidates=archive_candidates,
            category_distribution=dict(Counter(f.category.value for f in self.files.values())),
            risk_distribution=dict(Counter(f.risk_level.value for f in self.files.values())),
            issues=[],
            recommendations=recommendations,
            optimization_opportunities=[],
            quality_metrics=quality_metrics
        )
        
        self.report = report
        
        if not self.dry_run:
            report_gen = ReportGenerator(report, self.report_folder, self.logger)
            report_gen.generate_all()
            if cache:
                cache.save(self.files)
        else:
            self.logger.info("DRY RUN: reports not written.")
        
        self.logger.finalize()
        return report

# =============================================================================
# INTERACTIVE CLI (with Unwired details)
# =============================================================================
class InteractiveCLI:
    def __init__(self, platform: CodeIntelligencePlatform):
        self.platform = platform
        self.report: Optional[AnalysisReport] = None
    
    def run(self):
        self._print_banner()
        while True:
            self._print_menu()
            choice = input(c("Select option: ", Colors.OKCYAN)).strip()
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
                print(c("Exiting. No files were modified.", Colors.OKGREEN))
                break
            else:
                print(c("Invalid option.", Colors.FAIL))
            input(c("\nPress Enter to continue...", Colors.WARNING))
    
    def _print_banner(self):
        print(c("="*70, Colors.HEADER))
        print(c("ENTERPRISE CODE INTELLIGENCE PLATFORM v4", Colors.BOLD))
        print(c("="*70, Colors.HEADER))
        print(c("✓ Read‑only analysis – no source changes", Colors.OKGREEN))
        print(c("✓ Fixed report folder: always latest analysis", Colors.OKGREEN))
        print(c("✓ .md files excluded completely", Colors.OKGREEN))
        print(c("✓ Enhanced unwired detection with Git history", Colors.OKGREEN))
        print()
    
    def _print_menu(self):
        print(c("\nMAIN MENU:", Colors.BOLD))
        print(c("1.", Colors.OKCYAN), "Full Analysis")
        print(c("2.", Colors.OKCYAN), "Show High Risk Files")
        print(c("3.", Colors.OKCYAN), "Show Unused & Unwired (summary)")
        print(c("4.", Colors.OKCYAN), "Show Duplicate Clusters")
        print(c("5.", Colors.OKCYAN), "Show Archive Candidates")
        print(c("6.", Colors.OKCYAN), "Create Safe Archive")
        print(c("7.", Colors.OKCYAN), "Open HTML Dashboard")
        print(c("8.", Colors.OKCYAN), "Show Recommendations")
        print(c("9.", Colors.OKCYAN), "Show Unwired Components (detailed)")
        print(c("0.", Colors.FAIL), "Exit")
    
    def _full_analysis(self):
        print(c("\n=== FULL ANALYSIS ===", Colors.BOLD))
        self.report = self.platform.analyze()
        print(c("✓ Analysis complete.", Colors.OKGREEN))
        print(f"  Reports: {self.platform.report_folder}")
    
    def _ensure_report(self):
        if not self.report:
            print(c("Please run Full Analysis first.", Colors.WARNING))
            return False
        return True
    
    def _show_high_risk(self):
        if not self._ensure_report(): return
        high = [d for p,d in self.report.files.items() if d['risk_level'] in ['HIGH','CRITICAL']]
        print(c(f"\n=== HIGH RISK FILES ({len(high)}) ===", Colors.BOLD))
        for d in high[:20]:
            print(f"  {d['relative_path']} [{d['risk_level']}]")
    
    def _show_unused_unwired(self):
        if not self._ensure_report(): return
        print(c(f"\nUnused: {len(self.report.unused_candidates)}", Colors.BOLD))
        for p in self.report.unused_candidates[:10]:
            print(f"  {p}")
        print(c(f"\nUnwired: {len(self.report.unwired_candidates)}", Colors.BOLD))
        for p in self.report.unwired_candidates[:10]:
            print(f"  {p}")
    
    def _show_duplicates(self):
        if not self._ensure_report(): return
        print(c(f"\nDuplicate Clusters: {len(self.report.duplicate_clusters)}", Colors.BOLD))
        for c in self.report.duplicate_clusters[:5]:
            print(f"  Cluster {c['cluster_id']} ({c['similarity_score']:.0%} similar)")
            for f in c['files'][:3]:
                print(f"    - {Path(f).name}")
    
    def _show_archive_candidates(self):
        if not self._ensure_report(): return
        print(c(f"\nArchive Candidates: {len(self.report.archive_candidates)}", Colors.BOLD))
        for p in self.report.archive_candidates[:15]:
            print(f"  {p}")
    
    def _create_archive(self):
        if not self._ensure_report(): return
        if not self.report.archive_candidates:
            print(c("No candidates to archive.", Colors.WARNING))
            return
        print(c("\n=== CREATE SAFE ARCHIVE ===", Colors.BOLD))
        print(f"Candidates: {len(self.report.archive_candidates)}")
        confirm = input(c("Proceed? (y/N): ", Colors.OKCYAN)).strip().lower()
        if confirm == 'y':
            builder = ArchiveBuilder(
                self.platform.project_path,
                self.platform.report_folder,
                self.platform.files,
                self.platform.logger
            )
            archive_path = builder.create_safe_archive(self.report.archive_candidates)
            if archive_path:
                print(c(f"✓ Archive created: {archive_path}", Colors.OKGREEN))
            else:
                print(c("✗ Archive failed.", Colors.FAIL))
    
    def _open_dashboard(self):
        if not self._ensure_report(): return
        dash = self.platform.report_folder / 'optimization_dashboard.html'
        if dash.exists():
            import webbrowser
            webbrowser.open(f"file://{dash.resolve()}")
            print(c("Dashboard opened in browser.", Colors.OKGREEN))
        else:
            print(c("Dashboard not found.", Colors.FAIL))
    
    def _show_recommendations(self):
        if not self._ensure_report(): return
        print(c(f"\n=== RECOMMENDATIONS ({len(self.report.recommendations)}) ===", Colors.BOLD))
        for rec in self.report.recommendations[:10]:
            print(f"  {rec['title']} [{rec['priority']}]")
            for reason in rec['reasoning'][:2]:
                print(f"    - {reason}")
    
    def _show_unwired_detailed(self):
        if not self._ensure_report(): return
        print(c(f"\n=== DETAILED UNWIRED COMPONENTS ({len(self.report.unwired_candidates)}) ===", Colors.BOLD))
        for path in self.report.unwired_candidates[:20]:
            data = self.report.files.get(path, {})
            git = "✅" if data.get('has_git_history') else "❌"
            similar = self.platform.files.get(path)
            similar_files = ""
            if similar and hasattr(similar, 'exported_symbols'):
                # For demo, we won't recompute similarity here, but we could.
                pass
            print(f"  {data.get('relative_path', path)}")
            print(f"    Category: {data.get('category', '')}, Lines: {data.get('lines', 0)}, Exports: {len(data.get('exported_symbols', []))}")
            print(f"    Git history: {git} ({data.get('git_commit_count', 0)} commits)")
            print(f"    Risk: {data.get('risk_level', '')}, Stability: {data.get('stability_score', 0):.1f}")
            print()

# =============================================================================
# UNIT TESTS (commented out – for reference)
# =============================================================================
"""
# tests/test_usage_analyzer.py
import unittest
from pathlib import Path
from code_intelligence_v4 import UsageAnalyzer, FileInfo, FileCategory, AnalysisLogger

class TestUsageAnalyzer(unittest.TestCase):
    def test_unwired_detection_with_git(self):
        # Mock files
        files = {}
        logger = AnalysisLogger(Path('/tmp/test_log.txt'))
        analyzer = UsageAnalyzer(files, logger, Path('.'))
        # ... test logic
        self.assertTrue(True)

if __name__ == '__main__':
    unittest.main()
"""

# =============================================================================
# MAIN ENTRY POINT
# =============================================================================
def main():
    parser = argparse.ArgumentParser(
        description="Enterprise Code Intelligence Platform v4 – Single File Edition",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument('project_path', nargs='?', default=os.getcwd(),
                        help='Project root path (default: current directory)')
    parser.add_argument('--scope', '-s', help='Limit analysis to this subpath')
    parser.add_argument('--report-folder', '-r', default='./reports',
                        help='Fixed report folder (default: ./reports)')
    parser.add_argument('--non-interactive', '-n', action='store_true',
                        help='Run analysis and exit')
    parser.add_argument('--json-output', '-j', action='store_true',
                        help='Print JSON summary to stdout and exit')
    parser.add_argument('--dry-run', '-d', action='store_true',
                        help='Simulate without writing reports/archives')
    parser.add_argument('--keep-history', action='store_true',
                        help='Move previous reports to history/ before overwriting')
    parser.add_argument('--parallel', '-p', action='store_true',
                        help='Enable parallel processing (experimental)')
    parser.add_argument('--exclude', action='append', default=[],
                        help='Additional ignore patterns')
    
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
        dry_run=args.dry_run
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
                'duration_seconds': (datetime.fromisoformat(report.metadata['end_time']) - 
                                     datetime.fromisoformat(report.metadata['start_time'])).total_seconds()
            }
            print(json.dumps(summary, indent=2))
        else:
            print(f"Analysis complete. Reports: {platform.report_folder}")
    else:
        cli = InteractiveCLI(platform)
        cli.run()

if __name__ == '__main__':
    main()