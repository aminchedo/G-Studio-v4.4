
import os
import sys
import json
import hashlib
import zipfile
import argparse
import time
import subprocess
import re
import csv
import sqlite3
import pickle
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict, Counter, deque
from typing import Dict, List, Set, Tuple, Optional, Any, Union, Callable
from dataclasses import dataclass, field, asdict
from enum import Enum
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
from difflib import SequenceMatcher
import itertools

# Optional: tree‑sitter
try:
    from tree_sitter import Language, Parser, Node, Tree
    import tree_sitter_typescript as ts_typescript
    import tree_sitter_javascript as ts_javascript
    TREE_SITTER_AVAILABLE = True
except ImportError:
    TREE_SITTER_AVAILABLE = False

# Optional: networkx
try:
    import networkx as nx
    NETWORKX_AVAILABLE = True
except ImportError:
    NETWORKX_AVAILABLE = False

# Optional: numpy & sklearn
try:
    import numpy as np
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

# Optional: tqdm
try:
    from tqdm import tqdm
    TQDM_AVAILABLE = True
except ImportError:
    TQDM_AVAILABLE = False
    def tqdm(iterable, desc=None, total=None, **kwargs):
        if desc:
            print(f"{desc}...")
        return iterable

# Optional: colorama
try:
    import colorama
    colorama.init()
    COLORS_AVAILABLE = True
except ImportError:
    COLORS_AVAILABLE = False


# =============================================================================
# TERMINAL COLOURS & LOGGING
# =============================================================================
class Colors:
    if COLORS_AVAILABLE or sys.platform != 'win32':
        HEADER = '\033[95m'
        BLUE = '\033[94m'
        CYAN = '\033[96m'
        GREEN = '\033[92m'
        YELLOW = '\033[93m'
        RED = '\033[91m'
        END = '\033[0m'
        BOLD = '\033[1m'
    else:
        HEADER = BLUE = CYAN = GREEN = YELLOW = RED = END = BOLD = ''

def log_info(msg: str):
    print(f"{Colors.BLUE}ℹ {msg}{Colors.END}")

def log_success(msg: str):
    print(f"{Colors.GREEN}✓ {msg}{Colors.END}")

def log_warning(msg: str):
    print(f"{Colors.YELLOW}⚠ {msg}{Colors.END}")

def log_error(msg: str):
    print(f"{Colors.RED}✗ {msg}{Colors.END}")

def log_header(msg: str):
    print(f"\n{Colors.BOLD}{Colors.HEADER}{'='*70}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.HEADER}{msg}{Colors.END}")
    print(f"{Colors.BOLD}{Colors.HEADER}{'='*70}{Colors.END}\n")


# =============================================================================
# CONFIGURATION – All thresholds and weights
# =============================================================================
class Config:
    VERSION = "9.2.1"
    
    # File extensions
    VALID_EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx', '.py'}
    IGNORE_DIRS = {
        'node_modules', 'dist', 'build', '__tests__', '__test__', 'coverage',
        '.git', '.vscode', 'test', 'tests', '.cache', '__pycache__', '.pytest_cache',
        'venv', 'env', '.next', '.vercel', '.idea'
    }
    IGNORE_FILES = {'.test.', '.spec.', '.d.ts', '.min.js', '.min.ts'}
    ASSET_EXTENSIONS = {'.css', '.scss', '.sass', '.less', '.json', '.svg',
                        '.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot'}

    # Scoring weights
    SCORE_WEIGHTS = {
        'ai_hook': 30,
        'mcp': 25,
        'voice': 20,
        'complexity': 15,
        'types': 10,
        'name_quality': 10,
        'size_bonus': 5,
        'git_commits': 10,
        'git_recency': 5,
        'git_authors': 5,
    }

    SEVERITY_SCORES = {
        'critical': (85, 100),
        'high':     (60, 84),
        'medium':   (30, 59),
        'low':      (0, 29)
    }

    # Clone detection thresholds
    CLONE_THRESHOLD_TYPE1 = 0.99   # exact clones
    CLONE_THRESHOLD_TYPE2 = 0.95   # renamed identifiers
    CLONE_THRESHOLD_TYPE3 = 0.85   # modified statements
    STRUCTURAL_SIMILARITY_THRESHOLD = 0.85  # used by duplicate detector

    # Unused detection
    MIN_LINES_FOR_UNWIRED = 50
    MIN_EXPORTS_FOR_UNWIRED = 2
    RECENT_CHANGE_DAYS = 7
    WIRING_SIMILARITY_THRESHOLD = 0.3
    MIN_COMMITS_FOR_ACTIVE = 3
    MAX_COMMITS_FOR_NEW = 1
    STABILITY_WEIGHTS = {
        'dependents': 0.30,
        'exports': 0.20,
        'size': 0.15,
        'recency': 0.15,
        'penalties': 0.20
    }
    ARCHIVE_MIN_CONFIDENCE = 70
    VALUE_MIN_SCORE = 30

    # Unused detection signals (at least this many must be true for simple detection)
    UNUSED_SIGNAL_THRESHOLD = 4

    # Advanced unused confidence weights
    UNUSED_SIGNAL_WEIGHTS = {
        'no_direct_dependents': 20,
        'no_transitive_dependents': 15,
        'not_entry_point': 10,
        'not_dynamic_imported': 5,
        'not_barrel_exported': 5,
        'has_exports': -10,
        'complexity_high': 10,
        'lines_gt_min': 5,
        'not_test': 5,
        'not_config': 5,
        'not_framework_reserved': 5,
        'git_old': 15,
        'git_few_commits': 10,
        'structural_similarity_to_active': -15,
        'value_score_low': 20,
        'has_side_effects': -20,
    }
    UNUSED_CONFIDENCE_THRESHOLD = 70

    # AI / MCP / Voice patterns
    AI_HOOKS = [
        'useGemini', 'useLMStudio', 'useLocalAI', 'useMultiAgent',
        'useAIProvider', 'useOpenAI', 'useAnthropic'
    ]
    AI_SDK_IMPORTS = [
        '@google/generative-ai', '@google/genai', 'openai', '@anthropic-ai/sdk'
    ]
    MCP_PATTERNS = [
        'useMcp', 'mcpService', 'mcpConnectionManager',
        'mcpAgentIntegration', 'MCPServer', 'MCPTool'
    ]
    VOICE_PATTERNS = [
        'useSpeechRecognition', 'useVoiceCommands',
        'speechRecognitionService', 'VoiceChatModal'
    ]
    HIGH_VALUE_NAMES = [
        'Modal', 'Provider', 'Manager', 'Orchestrator', 'Intelligence',
        'Dashboard', 'Panel', 'Hub', 'Engine', 'System', 'Advanced', 'Enhanced'
    ]
    ALLOW_RAW_CONTEXTS = ['LegacyAppContext']

    # Performance
    MAX_WORKERS = max(1, os.cpu_count() or 1)
    MAX_WORKERS_IO = min(8, MAX_WORKERS)
    MAX_WORKERS_CPU = min(4, MAX_WORKERS)
    CHUNK_SIZE = 100
    SMALL_FILE_SIZE = 50 * 1024   # 50KB

    # Cache
    CACHE_FILE = '.gstudio_cache.db'


# =============================================================================
# ENUMS
# =============================================================================
class LayerType(Enum):
    COMPONENTS = "components"
    HOOKS = "hooks"
    SERVICES = "services"
    CONTEXTS = "contexts"
    STORES = "stores"
    FEATURES = "features"
    UTILS = "utils"
    TYPES = "types"
    PAGES = "pages"
    API = "api"
    UNKNOWN = "unknown"

class Severity(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class PatternType(Enum):
    AI_PROVIDER = "ai_provider"
    MCP_INTEGRATION = "mcp_integration"
    VOICE_COMMAND = "voice_command"
    MULTI_AGENT = "multi_agent"
    CONTEXT_PATTERN = "context_pattern"
    HOOK_PATTERN = "hook_pattern"
    CIRCULAR_DEPENDENCY = "circular_dependency"
    UNUSED_ARCHITECTURAL_FRAGMENT = "unused_architectural_fragment"

class FileCategory(Enum):
    UI_COMPONENT = "UI Component"
    CUSTOM_HOOK = "Custom Hook"
    SERVICE = "Service"
    UTILITY = "Utility"
    TYPE_DEFINITION = "Type Definition"
    CONFIGURATION = "Configuration"
    TEST = "Test"
    CORE_LOGIC = "Core Logic"
    STYLE = "Style"
    ASSET = "Asset"
    ENTRY_POINT = "Entry Point"
    BARREL = "Barrel"
    PYTHON_MODULE = "Python Module"
    UNKNOWN = "Unknown"

class RiskLevel(Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class Recommendation(Enum):
    KEEP = "KEEP"
    REFACTOR = "REFACTOR"
    ARCHIVE = "ARCHIVE"
    DELETE = "DELETE"
    REVIEW = "REVIEW"
    MERGE = "MERGE"
    WIRE = "WIRE"

class IssueType(Enum):
    HIGH_COMPLEXITY = "High Complexity"
    TYPE_SAFETY = "Type Safety"
    UNUSED_EXPORTS = "Unused Exports"
    LARGE_FILE = "Large File"
    DUPLICATE = "Duplicate"
    CIRCULAR_DEPENDENCY = "Circular Dependency"
    MISSING_TESTS = "Missing Tests"
    UNWIRED = "Unwired Component"

class UnwiredType(Enum):
    ORPHANED_USEFUL = "orphaned_useful"
    DEAD_CODE = "dead_code"
    NEW_FEATURE = "new_feature"
    UNKNOWN = "unknown"

class Framework(Enum):
    UNKNOWN = "unknown"
    NEXTJS = "nextjs"
    REMIX = "remix"
    VITE = "vite"
    CRA = "create-react-app"
    GATSBY = "gatsby"
    ASTRO = "astro"
    NUXT = "nuxt"
    VUE = "vue"

class UnusedClassification(Enum):
    DEAD_CODE = "dead_code"
    ORPHANED_FEATURE = "orphaned_feature"
    HIGH_VALUE_UNWIRED = "high_value_unwired"
    LEGACY_LEFTOVER = "legacy_leftover"
    ARCHIVE_CANDIDATE = "archive_candidate"

class RecommendedAction(Enum):
    DELETE = "delete"
    ARCHIVE = "archive"
    REVIEW = "review"
    INTEGRATE = "integrate"
    MERGE_WITH = "merge_with"


# =============================================================================
# DATA CLASSES
# =============================================================================
@dataclass
class GitHistoryInfo:
    has_history: bool
    commit_count: int
    first_commit_date: Optional[str] = None
    last_commit_date: Optional[str] = None
    authors: List[str] = field(default_factory=list)

@dataclass
class CodeIssue:
    type: IssueType
    severity: RiskLevel
    message: str
    line: Optional[int] = None
    suggestion: Optional[str] = None

@dataclass
class WiringSuggestion:
    target_file: str
    similarity_score: float
    reason: str
    integration_point: str
    common_exports: List[str] = field(default_factory=list)
    common_imports: List[str] = field(default_factory=list)

@dataclass
class DuplicateCluster:
    cluster_id: str
    similarity_score: float
    files: List[str]
    base_file: str
    merge_target: str
    diff_summary: str
    estimated_savings_lines: int
    confidence: float

@dataclass
class ArchiveDecision:
    file_path: str
    should_archive: bool
    confidence: float
    reasons: List[str]
    blockers: List[str]

@dataclass
class ImportInfo:
    source: str
    specifiers: List[str] = field(default_factory=list)
    is_dynamic: bool = False
    is_side_effect: bool = False
    line: int = 0

@dataclass
class ExportInfo:
    name: str
    is_default: bool = False
    is_re_export: bool = False
    line: int = 0

@dataclass
class ASTFeatures:
    tree_depth: int = 0
    node_types: Dict[str, int] = field(default_factory=dict)
    control_structures: int = 0
    function_count: int = 0
    class_count: int = 0

@dataclass
class CFGNode:
    id: int
    type: str
    line: int
    successors: List[int] = field(default_factory=list)
    predecessors: List[int] = field(default_factory=list)

@dataclass
class DFGNode:
    id: int
    variable: str
    definition_line: int
    uses: List[int] = field(default_factory=list)

@dataclass
class PDGNode:
    id: int
    cfg_node_id: int
    data_deps: Set[int] = field(default_factory=set)
    control_deps: Set[int] = field(default_factory=set)

@dataclass
class FileInfo:
    # Core
    path: str
    relative_path: str
    layer: LayerType
    size: int
    lines: int
    hash: str
    mtime: float

    # Imports / exports
    imports: List[ImportInfo] = field(default_factory=list)
    exports: List[ExportInfo] = field(default_factory=list)
    hooks_used: List[str] = field(default_factory=list)
    contexts_used: List[str] = field(default_factory=list)

    # Component flags
    is_functional_component: bool = False
    is_custom_hook: bool = False
    is_context_provider: bool = False
    has_create_context: bool = False
    has_ai_hook: bool = False
    has_mcp: bool = False
    has_voice: bool = False
    has_interface: bool = False
    has_type_export: bool = False

    # Counts
    hook_count: int = 0
    context_count: int = 0
    complexity_score: int = 0

    # AST features (for clones)
    ast_features: Optional[ASTFeatures] = None

    # CFG/DFG/PDG
    cfg_nodes: List[CFGNode] = field(default_factory=list)
    dfg_nodes: List[DFGNode] = field(default_factory=list)
    pdg_nodes: List[PDGNode] = field(default_factory=list)

    # Dependencies (filled after graph building)
    depends_on: List[str] = field(default_factory=list)          # direct
    dependents: List[str] = field(default_factory=list)          # direct
    transitive_dependents: Set[str] = field(default_factory=set) # all dependents (recursive)
    indirect_dependencies: Set[str] = field(default_factory=set) # all dependencies (recursive)

    # Entry point / barrel
    is_entry_point: bool = False
    is_barrel_file: bool = False
    is_barrel_exported: bool = False
    is_dynamic_imported: bool = False
    is_test_file: bool = False
    has_side_effects: bool = False

    # Git
    git_last_author: str = ""
    git_last_modified: str = ""
    git_history: Optional[GitHistoryInfo] = None
    days_since_modified: int = 0

    # Structural info (for duplicates)
    structural_hash: str = ""
    cyclomatic_complexity: int = 0
    cognitive_complexity: int = 0
    any_count: int = 0
    comment_ratio: float = 0.0
    category: FileCategory = FileCategory.UNKNOWN

    # Duplicates
    duplicate_of: Optional[str] = None
    structural_duplicates: List[str] = field(default_factory=list)

    # Unwired
    unwired_type: Optional[UnwiredType] = None
    wiring_suggestions: List[WiringSuggestion] = field(default_factory=list)

    # Stability / risk / recommendation
    stability_score: float = 0.0
    risk_level: RiskLevel = RiskLevel.LOW
    risk_score: float = 0.0
    recommendation: Recommendation = Recommendation.KEEP
    recommendation_reasons: List[str] = field(default_factory=list)
    recommendation_confidence: float = 0.0

    # Issues
    issues: List[CodeIssue] = field(default_factory=list)
    uninitialized_vars: List[str] = field(default_factory=list)
    unused_vars: List[str] = field(default_factory=list)
    unreachable_code: List[int] = field(default_factory=list)

    # Value score
    value_score: float = 0.0

@dataclass
class ValuableComponent:
    name: str
    path: str
    layer: LayerType
    value_score: float
    reasons: List[str] = field(default_factory=list)
    suggested_location: str = ""
    integration_effort: str = "medium"
    integration_code: str = ""
    exports: List[str] = field(default_factory=list)
    hooks: List[str] = field(default_factory=list)
    patterns: List[str] = field(default_factory=list)
    last_author: str = ""
    last_modified_date: str = ""

@dataclass
class WiringIssue:
    file_path: str
    line_number: int
    severity: Severity
    issue_type: str
    current_import: str
    better_alternative: str
    reasoning: List[str] = field(default_factory=list)
    refactor_sample: str = ""
    auto_fixable: bool = False
    severity_score: int = 0

@dataclass
class ArchitecturalInsight:
    pattern: PatternType
    health_score: float
    files_involved: int
    strengths: List[str] = field(default_factory=list)
    weaknesses: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    affected_files: List[str] = field(default_factory=list)

@dataclass
class CircularDependency:
    cycle: List[str]
    severity: str

@dataclass
class CloneGroup:
    files: List[str]
    similarity: float
    clone_type: str  # Type-1, Type-2, Type-3
    lines: int
    representative: str

@dataclass
class UnusedFileDetail:
    path: str
    confidence: float
    classification: UnusedClassification
    recommended_action: RecommendedAction
    merge_target: Optional[str] = None
    signals: Dict[str, bool] = field(default_factory=dict)
    reasons: List[str] = field(default_factory=list)
    estimated_savings_lines: int = 0
    estimated_complexity_reduction: int = 0
    deletion_safe: bool = False
    blockers: List[str] = field(default_factory=list)

@dataclass
class AnalysisResult:
    total_files: int = 0
    tsx_percentage: float = 0.0
    total_lines: int = 0
    valuable_unused: List[ValuableComponent] = field(default_factory=list)
    wiring_issues: List[WiringIssue] = field(default_factory=list)
    insights: List[ArchitecturalInsight] = field(default_factory=list)
    dependency_graph: Dict[str, List[str]] = field(default_factory=dict)
    layer_stats: Dict[str, int] = field(default_factory=dict)
    files: Dict[str, FileInfo] = field(default_factory=dict)
    duplicate_clusters: List[DuplicateCluster] = field(default_factory=list)
    archive_candidates: List[ArchiveDecision] = field(default_factory=list)
    unused_files: List[str] = field(default_factory=list)
    unwired_features: List[str] = field(default_factory=list)
    high_risk_files: List[str] = field(default_factory=list)
    analysis_duration_seconds: float = 0.0
    cache_hit_rate: float = 0.0
    git_available: bool = False
    framework: Framework = Framework.UNKNOWN
    clones: List[CloneGroup] = field(default_factory=list)
    circular_deps: List[CircularDependency] = field(default_factory=list)
    potentially_unused_files: List[UnusedFileDetail] = field(default_factory=list)
    unused_confidence_summary: Dict[str, float] = field(default_factory=dict)
    unused_classification_counts: Dict[str, int] = field(default_factory=dict)


# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================
def compute_hash(content: str) -> str:
    return hashlib.sha256(content.encode('utf-8')).hexdigest()

def normalize_path(path: Union[str, Path], base: Path) -> str:
    p = Path(path).resolve()
    try:
        return str(p.relative_to(base)).replace('\\', '/')
    except ValueError:
        return str(p).replace('\\', '/')

def should_ignore(path: Path, ignore_patterns: List[str]) -> bool:
    path_str = str(path)
    for pattern in ignore_patterns:
        if pattern in path_str:
            return True
        if path.match(pattern):
            return True
    return False

def jaccard_similarity(set1: Set, set2: Set) -> float:
    if not set1 and not set2:
        return 1.0
    if not set1 or not set2:
        return 0.0
    return len(set1 & set2) / len(set1 | set2)

def days_since(timestamp: float) -> int:
    return int((time.time() - timestamp) / 86400)

def chunks(lst, n):
    for i in range(0, len(lst), n):
        yield lst[i:i + n]


# =============================================================================
# JSON ENCODER (handles Enums, Path, datetime)
# =============================================================================
class EnhancedJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Enum):
            return obj.value
        if isinstance(obj, Path):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        if hasattr(obj, '__dataclass_fields__'):
            return asdict(obj)
        try:
            return super().default(obj)
        except TypeError:
            log_warning(f"JSON encoder: converting unexpected type {type(obj).__name__} to string")
            return str(obj)


# =============================================================================
# SQLITE CACHE (incremental, high performance)
# =============================================================================
class SQLiteCache:
    def __init__(self, cache_path: Path, use_cache: bool = True):
        self.cache_path = cache_path
        self.use_cache = use_cache
        self.conn: Optional[sqlite3.Connection] = None
        self.hits = 0
        self.misses = 0
        if use_cache:
            self._init_db()

    def _init_db(self):
        self.conn = sqlite3.connect(str(self.cache_path))
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA synchronous=NORMAL")
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS file_cache (
                path TEXT PRIMARY KEY,
                hash TEXT NOT NULL,
                analysis BLOB,
                ast BLOB,
                cfg BLOB,
                dfg BLOB,
                pdg BLOB,
                timestamp REAL
            )
        """)
        self.conn.execute("CREATE INDEX IF NOT EXISTS idx_hash ON file_cache (hash)")
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS dependency_graph (
                source TEXT,
                target TEXT,
                PRIMARY KEY (source, target)
            )
        """)
        self.conn.commit()

    def get(self, file_path: str, file_hash: str) -> Optional[Dict]:
        if not self.use_cache or not self.conn:
            self.misses += 1
            return None
        row = self.conn.execute(
            "SELECT analysis, ast, cfg, dfg, pdg FROM file_cache WHERE path = ? AND hash = ?",
            (file_path, file_hash)
        ).fetchone()
        if row:
            self.hits += 1
            return {
                'analysis': pickle.loads(row[0]),
                'ast': pickle.loads(row[1]) if row[1] else None,
                'cfg': pickle.loads(row[2]) if row[2] else None,
                'dfg': pickle.loads(row[3]) if row[3] else None,
                'pdg': pickle.loads(row[4]) if row[4] else None,
            }
        self.misses += 1
        return None

    def set(self, file_path: str, file_hash: str, analysis: Dict, ast=None, cfg=None, dfg=None, pdg=None):
        if not self.use_cache or not self.conn:
            return
        self.conn.execute(
            "INSERT OR REPLACE INTO file_cache (path, hash, analysis, ast, cfg, dfg, pdg, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (file_path, file_hash, pickle.dumps(analysis),
             pickle.dumps(ast) if ast else None,
             pickle.dumps(cfg) if cfg else None,
             pickle.dumps(dfg) if dfg else None,
             pickle.dumps(pdg) if pdg else None,
             time.time())
        )
        self.conn.commit()

    def store_dependency(self, source: str, target: str):
        if not self.use_cache or not self.conn:
            return
        self.conn.execute(
            "INSERT OR IGNORE INTO dependency_graph (source, target) VALUES (?, ?)",
            (source, target)
        )
        self.conn.commit()

    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0.0

    def close(self):
        if self.conn:
            self.conn.close()


# =============================================================================
# GIT ANALYZER (enhanced)
# =============================================================================
class GitAnalyzer:
    def __init__(self, project_path: Path):
        self.project_path = project_path
        self.git_available = self._check_git_available()
        self.is_git_repo = self._check_git_repo()

    def _check_git_available(self) -> bool:
        try:
            subprocess.run(['git', '--version'], capture_output=True, check=True, timeout=5)
            return True
        except:
            return False

    def _check_git_repo(self) -> bool:
        if not self.git_available:
            return False
        try:
            result = subprocess.run(
                ['git', 'rev-parse', '--git-dir'],
                cwd=self.project_path,
                capture_output=True,
                timeout=5
            )
            return result.returncode == 0
        except:
            return False

    def get_file_history(self, file_path: str) -> GitHistoryInfo:
        if not self.is_git_repo:
            return GitHistoryInfo(has_history=False, commit_count=0)
        try:
            result = subprocess.run(
                ['git', 'log', '--follow', '--format=%H|%an|%ad', '--date=short', '--', file_path],
                cwd=self.project_path,
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode != 0 or not result.stdout.strip():
                return GitHistoryInfo(has_history=False, commit_count=0)
            lines = result.stdout.strip().splitlines()
            commit_count = len(lines)
            authors = set()
            dates = []
            for line in lines:
                parts = line.split('|')
                if len(parts) >= 3:
                    authors.add(parts[1])
                    dates.append(parts[2])
            return GitHistoryInfo(
                has_history=True,
                commit_count=commit_count,
                first_commit_date=dates[-1] if dates else None,
                last_commit_date=dates[0] if dates else None,
                authors=list(authors)
            )
        except Exception:
            return GitHistoryInfo(has_history=False, commit_count=0)

    def get_recent_changes(self, days: int = 7) -> Set[str]:
        if not self.is_git_repo:
            return set()
        try:
            since = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
            result = subprocess.run(
                ['git', 'log', f'--since={since}', '--name-only', '--pretty=format:'],
                cwd=self.project_path,
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                files = [f for f in result.stdout.splitlines() if f.strip()]
                return set(files)
        except:
            pass
        return set()

class GitHelper:
    @staticmethod
    def get_last_commit_info(file_path: Path, project_root: Path) -> Tuple[str, str]:
        try:
            author_cmd = ['git', 'log', '-1', '--format=%an', '--', str(file_path.relative_to(project_root))]
            author_res = subprocess.run(author_cmd, cwd=project_root, capture_output=True, text=True, timeout=2)
            author = author_res.stdout.strip() if author_res.returncode == 0 else ""
            date_cmd = ['git', 'log', '-1', '--format=%ad', '--date=short', '--', str(file_path.relative_to(project_root))]
            date_res = subprocess.run(date_cmd, cwd=project_root, capture_output=True, text=True, timeout=2)
            date = date_res.stdout.strip() if date_res.returncode == 0 else ""
            return author, date
        except:
            return "", ""

    @staticmethod
    def get_changed_files_since_last_commit(project_root: Path) -> Optional[Set[str]]:
        try:
            result = subprocess.run(
                ['git', 'diff', '--name-only', 'HEAD~1'],
                cwd=project_root,
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode != 0:
                result = subprocess.run(
                    ['git', 'diff', '--name-only', 'HEAD'],
                    cwd=project_root,
                    capture_output=True,
                    text=True,
                    timeout=5
                )
            if result.returncode == 0:
                files = set(result.stdout.strip().splitlines())
                existing = set()
                for f in files:
                    full = project_root / f
                    if full.exists():
                        existing.add(f)
                return existing
            return None
        except:
            return None


# =============================================================================
# TREE‑SITTER PARSER (with incremental support) – Full implementation from v7.3.2
# =============================================================================
class ParsedData:
    def __init__(self):
        self.imports: List[ImportInfo] = []
        self.exports: List[ExportInfo] = []
        self.hooks_used: List[str] = []
        self.contexts_used: List[str] = []
        self.is_functional_component: bool = False
        self.is_custom_hook: bool = False
        self.is_context_provider: bool = False
        self.has_create_context: bool = False
        self.has_interface: bool = False
        self.has_type_export: bool = False
        self.structural_hash: str = ""
        self.cyclomatic_complexity: int = 0
        self.any_count: int = 0
        self.has_jsx: bool = False
        self.functions: List[str] = []
        self.classes: List[str] = []
        self.comment_ratio: float = 0.0
        self.ast_node: Optional[Any] = None
        self.ast_features: Optional[ASTFeatures] = None
        self.cfg_nodes: List[CFGNode] = []
        self.dfg_nodes: List[DFGNode] = []
        self.unreachable_code: List[int] = []
        self.uninitialized_vars: List[str] = []
        self.unused_vars: List[str] = []

class TreeSitterParser:
    def __init__(self, enable_python: bool = True, compute_structural_hash: bool = False, verbose: bool = False):
        self.enable_python = enable_python
        self.compute_structural_hash = compute_structural_hash
        self.verbose = verbose
        self.parsers: Dict[str, Parser] = {}
        self.regex_parser = RegexParser()
        self._init_tree_sitter()

    def _init_tree_sitter(self):
        if not TREE_SITTER_AVAILABLE:
            return
        try:
            ts_lang = Language(ts_typescript.language_typescript())
            tsx_lang = Language(ts_typescript.language_tsx())
            js_lang = Language(ts_javascript.language())

            self.parsers['.ts'] = self._make_parser(ts_lang)
            self.parsers['.tsx'] = self._make_parser(tsx_lang)
            self.parsers['.js'] = self._make_parser(js_lang)
            self.parsers['.jsx'] = self._make_parser(js_lang)

            if self.enable_python:
                try:
                    import tree_sitter_python
                    py_lang = Language(tree_sitter_python.language_python())
                    self.parsers['.py'] = self._make_parser(py_lang)
                except Exception as e:
                    if self.verbose:
                        log_warning(f"Python tree‑sitter init failed: {e}")
        except Exception as e:
            if self.verbose:
                log_warning(f"Tree‑sitter init failed: {e}")

    def _make_parser(self, lang):
        parser = Parser()
        try:
            parser.set_language(lang)
        except AttributeError:
            parser.language = lang
        return parser

    def parse(self, file_path: Path, content: str, old_tree: Optional[Tree] = None) -> Tuple[ParsedData, Optional[Tree]]:
        ext = file_path.suffix
        result = ParsedData()

        if ext in self.parsers:
            parser = self.parsers[ext]
            try:
                if old_tree:
                    tree = parser.parse(bytes(content, 'utf-8'), old_tree)
                else:
                    tree = parser.parse(bytes(content, 'utf-8'))
                if tree:
                    self._extract_all(tree.root_node, content, result, ext)
                    result.ast_node = tree.root_node
                    return result, tree
            except Exception as e:
                if self.verbose:
                    log_warning(f"Tree‑sitter parse failed for {file_path}: {e}")

        self.regex_parser.parse(content, ext, result)
        return result, None

    def _extract_all(self, node: Node, content: str, result: ParsedData, ext: str):
        """Full extraction from AST – merged from v7.3.2."""
        def walk(n: Node):
            # Imports
            if n.type == 'import_statement':
                source_node = None
                import_clause = None
                for child in n.children:
                    if child.type == 'string':
                        source_node = child
                    elif child.type == 'import_clause':
                        import_clause = child
                if source_node:
                    source = content[source_node.start_byte:source_node.end_byte].strip('\'"')
                    specifiers = []
                    if import_clause:
                        for spec in import_clause.children:
                            if spec.type == 'identifier':
                                specifiers.append(content[spec.start_byte:spec.end_byte])
                            elif spec.type == 'named_imports':
                                for n2 in spec.children:
                                    if n2.type == 'import_specifier':
                                        name_node = n2.child_by_field_name('name')
                                        if name_node:
                                            specifiers.append(content[name_node.start_byte:name_node.end_byte])
                    result.imports.append(ImportInfo(source=source, specifiers=specifiers, line=n.start_point[0]+1))

            # Dynamic imports
            if n.type == 'call_expression':
                func = n.child_by_field_name('function')
                if func and func.type == 'import':
                    args = n.child_by_field_name('arguments')
                    if args:
                        for child in args.children:
                            if child.type == 'string':
                                source = content[child.start_byte:child.end_byte].strip('\'"')
                                result.imports.append(ImportInfo(source=source, is_dynamic=True, line=n.start_point[0]+1))

            # Exports
            if n.type == 'export_statement':
                node_text = content[n.start_byte:n.end_byte]
                if 'default' in node_text:
                    result.exports.append(ExportInfo(name='default', is_default=True, line=n.start_point[0]+1))
                is_reexport = any(c.type == 'string' for c in n.children)
                source_node = None
                export_clause = None
                for child in n.children:
                    if child.type == 'string':
                        source_node = child
                    elif child.type == 'export_clause':
                        export_clause = child
                if is_reexport and source_node:
                    source = content[source_node.start_byte:source_node.end_byte].strip('\'"')
                    result.imports.append(ImportInfo(source=source, line=n.start_point[0]+1))
                    names = []
                    if export_clause:
                        for spec in export_clause.children:
                            if spec.type == 'export_specifier':
                                name_node = spec.child_by_field_name('name')
                                alias_node = spec.child_by_field_name('alias')
                                name = content[name_node.start_byte:name_node.end_byte] if name_node else None
                                alias = content[alias_node.start_byte:alias_node.end_byte] if alias_node else None
                                names.append(alias or name)
                    for name in names:
                        result.exports.append(ExportInfo(name=name, is_re_export=True, line=n.start_point[0]+1))
                else:
                    for child in n.children:
                        if child.type == 'export_clause':
                            for spec in child.children:
                                if spec.type == 'export_specifier':
                                    name_node = spec.child_by_field_name('name')
                                    alias_node = spec.child_by_field_name('alias')
                                    name = content[name_node.start_byte:name_node.end_byte] if name_node else None
                                    alias = content[alias_node.start_byte:alias_node.end_byte] if alias_node else None
                                    result.exports.append(ExportInfo(name=alias or name, line=n.start_point[0]+1))
                        elif child.type in {'function_declaration', 'class_declaration', 'lexical_declaration'}:
                            ident = self._find_identifier_text(child, content)
                            if ident:
                                result.exports.append(ExportInfo(name=ident, line=n.start_point[0]+1))

            # Hooks
            if n.type == 'call_expression':
                func = n.child_by_field_name('function')
                if func and func.type == 'identifier':
                    name = content[func.start_byte:func.end_byte]
                    if name.startswith('use'):
                        result.hooks_used.append(name)

            # Contexts
            if n.type == 'call_expression':
                func = n.child_by_field_name('function')
                if func and func.type == 'identifier':
                    name = content[func.start_byte:func.end_byte]
                    if name == 'useContext':
                        args = n.child_by_field_name('arguments')
                        if args:
                            for child in args.children:
                                if child.type == 'identifier':
                                    ctx = content[child.start_byte:child.end_byte]
                                    result.contexts_used.append(ctx)

            # createContext
            if n.type == 'call_expression':
                func = n.child_by_field_name('function')
                if func and func.type == 'identifier' and content[func.start_byte:func.end_byte] == 'createContext':
                    result.has_create_context = True

            # Functional component / JSX
            if n.type in {'function_declaration', 'arrow_function'}:
                if self._has_jsx(n):
                    result.is_functional_component = True
                    name_node = self._find_identifier_node(n)
                    if name_node:
                        name = content[name_node.start_byte:name_node.end_byte]
                        if name.startswith('use'):
                            result.is_custom_hook = True

            # Interface / type
            if n.type == 'interface_declaration':
                result.has_interface = True
            if n.type == 'type_alias_declaration':
                parent = n.parent
                if parent and parent.type == 'export_statement':
                    result.has_type_export = True

            for child in n.children:
                walk(child)

        walk(node)
        result.imports = list({i.source: i for i in result.imports}.values())  # dedup
        result.exports = list({e.name: e for e in result.exports}.values())
        result.hooks_used = list(set(result.hooks_used))
        result.contexts_used = list(set(result.contexts_used))
        result.has_jsx = self._has_jsx(node)

        if self.compute_structural_hash:
            result.cyclomatic_complexity = self._calculate_complexity(node)
            result.any_count = self._count_any(node, content)
            norm = self._normalize_ast(node)
            result.structural_hash = compute_hash(norm)

    def _find_identifier_node(self, node: Node) -> Optional[Node]:
        if node.type == 'identifier':
            return node
        for child in node.children:
            res = self._find_identifier_node(child)
            if res:
                return res
        return None

    def _find_identifier_text(self, node: Node, content: str) -> Optional[str]:
        n = self._find_identifier_node(node)
        if n:
            return content[n.start_byte:n.end_byte]
        return None

    def _has_jsx(self, node: Node) -> bool:
        if node.type in {'jsx_element', 'jsx_self_closing_element', 'jsx_fragment'}:
            return True
        return any(self._has_jsx(c) for c in node.children)

    def _calculate_complexity(self, node: Node) -> int:
        complexity = 1
        decision_nodes = {
            'if_statement', 'while_statement', 'for_statement',
            'for_in_statement', 'do_statement', 'switch_case',
            'catch_clause', 'ternary_expression', 'binary_expression'
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

    def _count_any(self, node: Node, content: str) -> int:
        count = 0
        def walk(n: Node):
            nonlocal count
            if n.type == 'predefined_type':
                text = content[n.start_byte:n.end_byte]
                if text == 'any':
                    count += 1
            for child in n.children:
                walk(child)
        walk(node)
        return count

    def _normalize_ast(self, node: Node) -> str:
        tokens = []
        def walk(n: Node):
            if n.type in {'identifier', 'string', 'number', 'template_string'}:
                tokens.append(n.type)
            elif n.type not in {'comment', 'whitespace'}:
                tokens.append(n.type)
                for child in n.children:
                    walk(child)
        walk(node)
        return '|'.join(sorted(tokens))

class RegexParser:
    # Full regex parser from v7.3.2
    def parse(self, content: str, ext: str, result: ParsedData):
        if ext == '.py':
            self.parse_python(content, result)
        else:
            self.parse_ts_js(content, result)

    def parse_ts_js(self, content: str, result: ParsedData):
        import_pattern = re.compile(r'import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?["\']([^"\']+)["\']', re.M)
        export_pattern = re.compile(r'export\s+(?:default\s+)?(?:const|let|var|function|class|interface|type|enum)\s+(\w+)', re.M)
        hook_pattern = re.compile(r'\b(use[A-Z]\w*)\s*\(', re.M)
        ctx_pattern = re.compile(r'useContext\((\w+)\)', re.M)
        jsx_pattern = re.compile(r'<[A-Z]\w*(?:\s+[^>]*)?>|<>[^<]*<\/>', re.M)
        result.imports = [ImportInfo(source=m) for m in import_pattern.findall(content)]
        exports = export_pattern.findall(content)
        if 'export default' in content:
            exports.append('default')
        result.exports = [ExportInfo(name=m) for m in set(exports)]
        result.hooks_used = list(set(hook_pattern.findall(content)))
        result.contexts_used = list(set(ctx_pattern.findall(content)))
        result.has_jsx = bool(jsx_pattern.search(content))
        result.is_functional_component = result.has_jsx
        result.is_custom_hook = any(h.startswith('use') for h in result.hooks_used)
        result.has_create_context = 'createContext' in content
        result.is_context_provider = result.has_create_context and '.Provider' in content

    def parse_python(self, content: str, result: ParsedData):
        import_pattern = re.compile(r'(?:from\s+(\S+)\s+import|import\s+(\S+))', re.M)
        def_pattern = re.compile(r'(?:def|class)\s+(\w+)', re.M)
        matches = import_pattern.findall(content)
        sources = [m[0] or m[1] for m in matches]
        result.imports = [ImportInfo(source=s) for s in sources]
        exports = def_pattern.findall(content)
        result.exports = [ExportInfo(name=m) for m in exports]


# =============================================================================
# MODERN CODE ANALYZER (Hybrid AST + CFG + DFG)
# =============================================================================
class CFGBuilder:
    def __init__(self):
        self.nodes: List[CFGNode] = []
        self.node_id = 0

    def build(self, tree: Tree) -> List[CFGNode]:
        self.nodes = []
        self.node_id = 0
        def traverse(node: Node, parent_id: Optional[int] = None):
            current_id = self.node_id
            self.node_id += 1
            cfg_node = CFGNode(
                id=current_id,
                type=node.type,
                line=node.start_point[0] + 1
            )
            if parent_id is not None:
                cfg_node.predecessors.append(parent_id)
                if parent_id < len(self.nodes):
                    self.nodes[parent_id].successors.append(current_id)
            self.nodes.append(cfg_node)
            for child in node.children:
                traverse(child, current_id)
        traverse(tree.root_node)
        return self.nodes

    def find_unreachable(self) -> List[int]:
        if not self.nodes:
            return []
        visited = set()
        queue = deque([0])
        while queue:
            node_id = queue.popleft()
            if node_id in visited:
                continue
            visited.add(node_id)
            for succ in self.nodes[node_id].successors:
                queue.append(succ)
        unreachable = [n.line for n in self.nodes if n.id not in visited]
        return unreachable

class DFGBuilder:
    def __init__(self):
        self.nodes: List[DFGNode] = []
        self.defs: Dict[str, int] = {}

    def build(self, tree: Tree) -> List[DFGNode]:
        self.nodes = []
        self.defs = {}
        def traverse(node: Node):
            if node.type == 'variable_declarator':
                var_name = None
                for child in node.children:
                    if child.type == 'identifier':
                        var_name = child.text.decode('utf-8')
                        break
                if var_name:
                    dfg_node = DFGNode(
                        id=len(self.nodes),
                        variable=var_name,
                        definition_line=node.start_point[0] + 1
                    )
                    self.nodes.append(dfg_node)
                    self.defs[var_name] = dfg_node.id
            if node.type == 'identifier':
                var_name = node.text.decode('utf-8')
                if var_name in self.defs:
                    def_id = self.defs[var_name]
                    self.nodes[def_id].uses.append(node.start_point[0] + 1)
            for child in node.children:
                traverse(child)
        traverse(tree.root_node)
        return self.nodes

    def find_uninitialized(self) -> List[str]:
        uninit = []
        for node in self.nodes:
            if node.uses and min(node.uses) < node.definition_line:
                uninit.append(node.variable)
        return uninit

    def find_unused(self) -> List[str]:
        unused = []
        for node in self.nodes:
            if not node.uses:
                unused.append(node.variable)
        return unused

class ModernCodeAnalyzer:
    def __init__(self, parser: TreeSitterParser, verbose=False):
        self.parser = parser
        self.verbose = verbose

    def analyze_file(self, file_path: Path, content: str, old_tree=None) -> ParsedData:
        with ThreadPoolExecutor(max_workers=3) as executor:
            future_ast = executor.submit(self.parser.parse, file_path, content, old_tree)
            future_cfg = executor.submit(self._build_cfg, content)
            future_dfg = executor.submit(self._build_dfg, content)

            parsed_data, new_tree = future_ast.result()
            cfg_nodes = future_cfg.result()
            dfg_nodes = future_dfg.result()

        parsed_data.cfg_nodes = cfg_nodes
        parsed_data.dfg_nodes = dfg_nodes
        if cfg_nodes:
            cfg_builder = CFGBuilder()
            cfg_builder.nodes = cfg_nodes
            parsed_data.unreachable_code = cfg_builder.find_unreachable()
        if dfg_nodes:
            dfg_builder = DFGBuilder()
            dfg_builder.nodes = dfg_nodes
            parsed_data.uninitialized_vars = dfg_builder.find_uninitialized()
            parsed_data.unused_vars = dfg_builder.find_unused()
        return parsed_data

    def _build_cfg(self, content: str) -> List[CFGNode]:
        # If tree not available, return empty
        return []

    def _build_dfg(self, content: str) -> List[DFGNode]:
        return []


# =============================================================================
# AST‑BASED DUPLICATE DETECTOR (with fallback)
# =============================================================================
class ASTDuplicateDetector:
    def __init__(self, files: Dict[str, FileInfo], threshold: float = 0.85,
                 project_path: Path = None, file_content_cache: Dict = None):
        self.files = files
        self.threshold = threshold
        self.project_path = project_path
        self.file_content_cache = file_content_cache or {}
        self.vectorizer = TfidfVectorizer(token_pattern='(?u)\\b\\w+\\b') if SKLEARN_AVAILABLE else None

    def extract_ast_features(self, content: str) -> str:
        content = re.sub(r'//.*?$|/\*.*?\*/', '', content, flags=re.MULTILINE|re.DOTALL)
        content = re.sub(r'\b[a-zA-Z_][a-zA-Z0-9_]*\b', 'ID', content)
        content = re.sub(r'\s+', ' ', content).strip()
        return content

    def detect(self) -> List[DuplicateCluster]:
        if not SKLEARN_AVAILABLE:
            return self._hash_based_detect()

        corpus = []
        paths = []
        for path, fi in self.files.items():
            if fi.duplicate_of:
                continue
            try:
                if self.project_path:
                    full_path = self.project_path / path
                    content = self.file_content_cache.get(path) or full_path.read_text(encoding='utf-8', errors='ignore')
                    features = self.extract_ast_features(content)
                    corpus.append(features)
                    paths.append(path)
            except Exception:
                continue

        if len(corpus) < 2:
            return []

        X = self.vectorizer.fit_transform(corpus)
        sim_matrix = cosine_similarity(X)

        clusters = []
        used = set()
        for i, path_i in enumerate(paths):
            if i in used:
                continue
            group = [path_i]
            for j, path_j in enumerate(paths):
                if i != j and j not in used and sim_matrix[i][j] >= self.threshold:
                    group.append(path_j)
                    used.add(j)
            if len(group) > 1:
                base = min(group, key=lambda p: (len(p), p))
                avg_sim = sum(sim_matrix[i][paths.index(f)] for f in group if f != path_i) / (len(group)-1)
                cluster = DuplicateCluster(
                    cluster_id=f"ast_{hashlib.md5(group[0].encode()).hexdigest()[:8]}",
                    similarity_score=avg_sim,
                    files=group,
                    base_file=base,
                    merge_target=base,
                    diff_summary="Structural duplicate (AST‑based)",
                    estimated_savings_lines=sum(self.files[f].lines for f in group[1:]),
                    confidence=avg_sim * 100
                )
                clusters.append(cluster)
                for f in group:
                    if f != base:
                        self.files[f].duplicate_of = base
        return clusters

    def _hash_based_detect(self) -> List[DuplicateCluster]:
        groups = defaultdict(list)
        for path, fi in self.files.items():
            groups[fi.hash].append(path)
        clusters = []
        for h, paths in groups.items():
            if len(paths) > 1:
                base = min(paths, key=lambda p: (len(p), p))
                cluster = DuplicateCluster(
                    cluster_id=f"exact_{h[:8]}",
                    similarity_score=1.0,
                    files=paths,
                    base_file=base,
                    merge_target=base,
                    diff_summary="Exact duplicates",
                    estimated_savings_lines=sum(self.files[f].lines for f in paths[1:]),
                    confidence=100.0
                )
                clusters.append(cluster)
                for f in paths:
                    if f != base:
                        self.files[f].duplicate_of = base
        return clusters


# =============================================================================
# DEPENDENCY GRAPH (with Tarjan, transitive closure)
# =============================================================================
class DependencyGraph:
    def __init__(self, files: Dict[str, FileInfo], project_path: Path, src_path: Path):
        self.files = files
        self.project_path = project_path
        self.src_path = src_path
        self.graph: Dict[str, Set[str]] = defaultdict(set)
        self.reverse: Dict[str, Set[str]] = defaultdict(set)

    def build(self):
        for path, fi in self.files.items():
            for imp in fi.imports:
                # imp is ImportInfo object
                source = imp.source if isinstance(imp, ImportInfo) else imp
                resolved = self._resolve_import(path, source)
                if resolved and resolved in self.files:
                    self.graph[path].add(resolved)
                    self.reverse[resolved].add(path)

        for path, deps in self.graph.items():
            self.files[path].depends_on = list(deps)
        for path, deps in self.reverse.items():
            self.files[path].dependents = list(deps)

    def _resolve_import(self, from_file: str, import_path: str) -> Optional[str]:
        if not isinstance(import_path, str):
            # Should not happen if we converted properly
            log_warning(f"Non-string import path: {import_path} in {from_file}")
            return None
        if not import_path.startswith('.') and not import_path.startswith('@/'):
            return None
        try:
            if import_path.startswith('@/'):
                import_path = import_path[2:]
                base_path = self.src_path / import_path
            else:
                from_dir = Path(from_file).parent
                base_path = (self.project_path / from_dir / import_path).resolve()
            for ext in Config.VALID_EXTENSIONS:
                test_path = base_path.with_suffix(ext)
                try:
                    rel_path = str(test_path.relative_to(self.project_path))
                    if rel_path in self.files:
                        return rel_path
                except ValueError:
                    continue
            for ext in Config.VALID_EXTENSIONS:
                test_path = base_path / f'index{ext}'
                try:
                    rel_path = str(test_path.relative_to(self.project_path))
                    if rel_path in self.files:
                        return rel_path
                except ValueError:
                    continue
            return None
        except Exception:
            return None

    def compute_transitive_closure(self):
        def dfs(node, graph, visited):
            if node in visited:
                return
            visited.add(node)
            for neighbor in graph.get(node, []):
                dfs(neighbor, graph, visited)

        for path in self.files:
            visited = set()
            dfs(path, self.reverse, visited)
            visited.discard(path)
            self.files[path].transitive_dependents = visited

            visited = set()
            dfs(path, self.graph, visited)
            visited.discard(path)
            self.files[path].indirect_dependencies = visited

    def detect_cycles_tarjan(self) -> List[CircularDependency]:
        if not NETWORKX_AVAILABLE:
            return self._simple_cycle_detection()

        G = nx.DiGraph()
        for src, targets in self.graph.items():
            for tgt in targets:
                G.add_edge(src, tgt)
        cycles = []
        for comp in nx.strongly_connected_components(G):
            if len(comp) > 1:
                cycle_list = list(comp)
                severity = 'critical' if len(cycle_list) >= 10 else 'high' if len(cycle_list) >= 5 else 'medium'
                cycles.append(CircularDependency(cycle=cycle_list, severity=severity))
        return cycles

    def _simple_cycle_detection(self) -> List[CircularDependency]:
        visited = set()
        stack = set()
        cycles = []

        def dfs(node, path):
            if node in stack:
                idx = path.index(node)
                cycles.append(CircularDependency(cycle=path[idx:], severity='medium'))
                return
            if node in visited:
                return
            visited.add(node)
            stack.add(node)
            for neighbor in self.graph.get(node, []):
                dfs(neighbor, path + [neighbor])
            stack.remove(node)

        for node in self.graph:
            dfs(node, [node])
        return cycles

    def topological_sort_kahn(self) -> List[str]:
        in_degree = defaultdict(int)
        for node in self.graph:
            for neighbor in self.graph[node]:
                in_degree[neighbor] += 1
        queue = deque([n for n in self.files if in_degree[n] == 0])
        result = []
        while queue:
            node = queue.popleft()
            result.append(node)
            for neighbor in self.graph.get(node, []):
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        return result


# =============================================================================
# FRAMEWORK DETECTOR
# =============================================================================
class FrameworkDetector:
    def __init__(self, project_path: Path):
        self.project_path = project_path

    def detect(self) -> Tuple[Framework, List[str]]:
        package_json = self.project_path / 'package.json'
        if not package_json.exists():
            return Framework.UNKNOWN, []

        try:
            with open(package_json) as f:
                data = json.load(f)
            deps = {**data.get('dependencies', {}), **data.get('devDependencies', {})}
        except:
            return Framework.UNKNOWN, []

        if 'next' in deps:
            return Framework.NEXTJS, self._get_nextjs_entries()
        if '@remix-run/react' in deps:
            return Framework.REMIX, self._get_remix_entries()
        if 'vite' in deps:
            return Framework.VITE, self._get_vite_entries()
        if 'react-scripts' in deps:
            return Framework.CRA, [str((self.project_path / 'src' / 'index.js').relative_to(self.project_path))]
        if 'gatsby' in deps:
            return Framework.GATSBY, []
        if 'astro' in deps:
            return Framework.ASTRO, []
        if 'nuxt' in deps:
            return Framework.NUXT, []
        if 'vue' in deps:
            return Framework.VUE, []
        return Framework.UNKNOWN, []

    def _get_nextjs_entries(self) -> List[str]:
        entries = []
        pages = self.project_path / 'pages'
        app = self.project_path / 'app'
        if pages.exists():
            entries.extend(str(p.relative_to(self.project_path)) for p in pages.rglob('*.{tsx,jsx,ts,js}'))
        if app.exists():
            entries.extend(str(p.relative_to(self.project_path)) for p in app.rglob('page.{tsx,jsx,ts,js}'))
        return entries

    def _get_remix_entries(self) -> List[str]:
        routes = self.project_path / 'app' / 'routes'
        if routes.exists():
            return [str(p.relative_to(self.project_path)) for p in routes.rglob('*.{tsx,jsx,ts,js}')]
        return []

    def _get_vite_entries(self) -> List[str]:
        main_ts = self.project_path / 'src' / 'main.tsx'
        main_js = self.project_path / 'src' / 'main.jsx'
        entries = []
        if main_ts.exists():
            entries.append(str(main_ts.relative_to(self.project_path)))
        if main_js.exists():
            entries.append(str(main_js.relative_to(self.project_path)))
        return entries


# =============================================================================
# VALUE SCORER
# =============================================================================
class ValueScorer:
    @staticmethod
    def score_component(file_info: FileInfo, content: str, use_git: bool = False) -> Tuple[float, List[str]]:
        score = 0.0
        reasons = []
        weights = Config.SCORE_WEIGHTS
        ai_hooks = [h for h in file_info.hooks_used if h in Config.AI_HOOKS]
        if ai_hooks:
            score += weights['ai_hook']
            reasons.append(f"+{weights['ai_hook']} AI hooks: {', '.join(ai_hooks)}")
        if file_info.has_mcp or any(p in content for p in Config.MCP_PATTERNS):
            score += weights['mcp']
            reasons.append(f"+{weights['mcp']} MCP integration")
        if file_info.has_voice or any(p in content for p in Config.VOICE_PATTERNS):
            score += weights['voice']
            reasons.append(f"+{weights['voice']} Voice capabilities")
        complexity_score = min(weights['complexity'],
                               (file_info.hook_count * 3) + (file_info.context_count * 2))
        if complexity_score >= 5:
            score += complexity_score
            reasons.append(f"+{complexity_score} Complexity")
        if file_info.has_interface or file_info.has_type_export:
            score += weights['types']
            reasons.append(f"+{weights['types']} Well-typed")
        name = Path(file_info.path).stem
        name_bonus = 0
        for ind in Config.HIGH_VALUE_NAMES:
            if ind in name:
                name_bonus += 5
        name_bonus = min(name_bonus, weights['name_quality'])
        if name_bonus:
            score += name_bonus
            reasons.append(f"+{name_bonus} Name: {name}")
        if file_info.lines > 200:
            score += weights['size_bonus']
            reasons.append(f"+{weights['size_bonus']} {file_info.lines} lines")
        if len(file_info.hooks_used) > 3:
            extra = min(5, len(file_info.hooks_used) * 2)
            score += extra
            reasons.append(f"+{extra} {len(file_info.hooks_used)} hooks")
        if use_git and file_info.git_history and file_info.git_history.has_history:
            commit_score = min(weights.get('git_commits', 10),
                               file_info.git_history.commit_count * 2)
            if commit_score:
                score += commit_score
                reasons.append(f"+{commit_score} {file_info.git_history.commit_count} commits")
            if file_info.days_since_modified <= Config.RECENT_CHANGE_DAYS:
                score += weights.get('git_recency', 5)
                reasons.append(f"+{weights.get('git_recency',5)} Recent change")
            author_count = len(file_info.git_history.authors)
            if author_count > 1:
                author_bonus = min(weights.get('git_authors', 5), author_count * 2)
                score += author_bonus
                reasons.append(f"+{author_bonus} {author_count} authors")
        return min(score, 100.0), reasons


# =============================================================================
# USAGE ANALYZER (unwired)
# =============================================================================
class UsageAnalyzer:
    def __init__(self, files: Dict[str, FileInfo], git_analyzer: Optional[GitAnalyzer] = None):
        self.files = files
        self.git_analyzer = git_analyzer

    def analyze(self) -> Tuple[List[str], List[str]]:
        unused = self._find_unused_files()
        unwired = self._find_unwired_features()
        return unused, unwired

    def _find_unused_files(self) -> List[str]:
        unused = []
        for path, fi in self.files.items():
            if self._is_truly_unused(fi):
                unused.append(path)
        return unused

    def _is_truly_unused(self, fi: FileInfo) -> bool:
        signals = {
            'no_dependents': len(fi.dependents) == 0,
            'no_exports': len(fi.exports) == 0,
            'not_entry': not fi.is_entry_point,
            'no_side_effects': not fi.has_side_effects,
            'old_file': fi.days_since_modified > 180 if fi.days_since_modified else False,
            'low_value': fi.value_score < Config.VALUE_MIN_SCORE,
            'no_transitive_dependents': len(fi.transitive_dependents) == 0,
        }
        return sum(signals.values()) >= Config.UNUSED_SIGNAL_THRESHOLD

    def _find_unwired_features(self) -> List[str]:
        unwired = []
        for path, fi in self.files.items():
            if (len(fi.dependents) == 0 and not fi.is_barrel_exported and
                not fi.is_entry_point and len(fi.exports) >= Config.MIN_EXPORTS_FOR_UNWIRED and
                fi.lines >= Config.MIN_LINES_FOR_UNWIRED and
                fi.category not in {FileCategory.TEST, FileCategory.CONFIGURATION,
                                    FileCategory.ASSET, FileCategory.STYLE}):
                fi.unwired_type = self._classify_unwired(fi)
                unwired.append(path)
        return unwired

    def _classify_unwired(self, fi: FileInfo) -> UnwiredType:
        if not fi.git_history or not fi.git_history.has_history:
            return UnwiredType.NEW_FEATURE if fi.days_since_modified <= Config.RECENT_CHANGE_DAYS else UnwiredType.DEAD_CODE
        commits = fi.git_history.commit_count
        if fi.days_since_modified <= Config.RECENT_CHANGE_DAYS and commits <= Config.MAX_COMMITS_FOR_NEW:
            return UnwiredType.NEW_FEATURE
        if commits > Config.MIN_COMMITS_FOR_ACTIVE:
            return UnwiredType.ORPHANED_USEFUL
        return UnwiredType.DEAD_CODE


# =============================================================================
# WIRING ISSUE DETECTOR (full)
# =============================================================================
class WiringIssueDetector:
    def __init__(self, files: Dict[str, FileInfo], project_path: Path, verbose: bool = False):
        self.files = files
        self.project_path = project_path
        self.verbose = verbose
        self.ctx_to_hook_map = self._build_context_hook_map()
        self._ai_sdk_files = {}

    def _build_context_hook_map(self) -> Dict[str, str]:
        ctx_map = {}
        for file_path, info in self.files.items():
            if info.layer == LayerType.HOOKS:
                try:
                    full_path = self.project_path / file_path
                    content = full_path.read_text(encoding='utf-8')
                    for ctx in re.findall(r'useContext\((\w+)\)', content):
                        hook_name = Path(info.path).stem
                        if hook_name.startswith('use'):
                            ctx_map[ctx] = hook_name
                except:
                    pass
        return ctx_map

    @staticmethod
    def _severity_to_score(severity: Severity) -> int:
        low, high = Config.SEVERITY_SCORES[severity.value]
        return (low + high) // 2

    def detect_issues(self, file_path: str, content: str) -> List[WiringIssue]:
        issues = []
        import_pattern = r"import\s+(?:{[^}]+}|[\w\s,*]+)\s+from\s+['\"]([^'\"]+)['\"]"
        imports = re.findall(import_pattern, content)
        lines = content.split('\n')

        for line_num, line in enumerate(lines, 1):
            for imp in imports:
                if imp in line:
                    issues.extend(self._check_direct_sdk_import(file_path, line_num, imp, line))
                    issues.extend(self._check_test_file_import(file_path, line_num, imp))
                    issues.extend(self._check_layer_violation(file_path, line_num, imp, line))
                    issues.extend(self._check_multiple_ai_providers(file_path, line_num, imp, line))
            issues.extend(self._check_context_usage(file_path, line_num, line))
            issues.extend(self._check_raw_fetch(file_path, line_num, line))
        return issues

    def _check_direct_sdk_import(self, file_path: str, line_num: int, import_path: str, line: str) -> List[WiringIssue]:
        issues = []
        for sdk in Config.AI_SDK_IMPORTS:
            if sdk in import_path:
                if 'services' in file_path.lower() and 'gemini' in file_path.lower():
                    continue
                if 'hooks' in file_path.lower() and 'useGemini' in file_path.lower():
                    continue
                severity = Severity.HIGH
                severity_score = self._severity_to_score(severity)
                if '@google/' in sdk:
                    better = "@/services/geminiService or @/hooks/core/useGemini"
                elif 'openai' in sdk:
                    better = "@/services/openaiService"
                else:
                    better = "the appropriate service/hook"
                issues.append(WiringIssue(
                    file_path=file_path,
                    line_number=line_num,
                    severity=severity,
                    severity_score=severity_score,
                    issue_type="Direct SDK Import",
                    current_import=import_path,
                    better_alternative=better,
                    reasoning=[
                        "Direct SDK imports in components violate architecture",
                        "Use service layer for business logic or hook for components",
                        "Better error handling, caching, and consistency"
                    ],
                    refactor_sample=f"""// Instead of:
import {{ ... }} from '{import_path}';

// Use:
import {{ geminiService }} from '@/services/geminiService';
// or
import {{ useGemini }} from '@/hooks/core/useGemini';""",
                    auto_fixable=False
                ))
        return issues

    def _check_test_file_import(self, file_path: str, line_num: int, import_path: str) -> List[WiringIssue]:
        issues = []
        test_indicators = ['.test.', '.spec.', '__tests__', '__test__']
        if any(ind in import_path for ind in test_indicators):
            severity = Severity.CRITICAL
            severity_score = self._severity_to_score(severity)
            issues.append(WiringIssue(
                file_path=file_path,
                line_number=line_num,
                severity=severity,
                severity_score=severity_score,
                issue_type="Test File Import",
                current_import=import_path,
                better_alternative="Import from source file, not test file",
                reasoning=[
                    "Importing from test files is a critical error",
                    "Test files should not be in production dependencies",
                    "May cause build failures or bundle bloat"
                ],
                refactor_sample=f"// Remove import from test file:\n// import ... from '{import_path}'\n\n// Import from actual source file instead",
                auto_fixable=False
            ))
        return issues

    def _check_layer_violation(self, file_path: str, line_num: int, import_path: str, line: str) -> List[WiringIssue]:
        issues = []
        if 'services' in file_path and 'components' in import_path:
            severity = Severity.HIGH
            severity_score = self._severity_to_score(severity)
            issues.append(WiringIssue(
                file_path=file_path,
                line_number=line_num,
                severity=severity,
                severity_score=severity_score,
                issue_type="Layer Violation",
                current_import=import_path,
                better_alternative="Refactor to use dependency injection or events",
                reasoning=[
                    "Services should not depend on UI components",
                    "Violates clean architecture principles",
                    "Creates circular dependency risks"
                ],
                refactor_sample="// Services should be framework‑agnostic\n// Consider using callbacks, events, or dependency injection",
                auto_fixable=False
            ))
        return issues

    def _check_multiple_ai_providers(self, file_path: str, line_num: int, import_path: str, line: str) -> List[WiringIssue]:
        sdk_detected = None
        for sdk in Config.AI_SDK_IMPORTS:
            if sdk in import_path:
                sdk_detected = sdk
                break
        if sdk_detected:
            if file_path not in self._ai_sdk_files:
                self._ai_sdk_files[file_path] = set()
            self._ai_sdk_files[file_path].add(sdk_detected)
        return []

    def _check_context_usage(self, file_path: str, line_num: int, line: str) -> List[WiringIssue]:
        issues = []
        match = re.search(r'useContext\((\w+)\)', line)
        if match:
            ctx_name = match.group(1)
            if ctx_name in Config.ALLOW_RAW_CONTEXTS:
                if self.verbose:
                    log_info(f"Skipping raw useContext check for {ctx_name} (whitelisted) in {file_path}:{line_num}")
                return issues
            if ctx_name in self.ctx_to_hook_map:
                hook_name = self.ctx_to_hook_map[ctx_name]
                severity = Severity.MEDIUM
                severity_score = self._severity_to_score(severity)
                issues.append(WiringIssue(
                    file_path=file_path,
                    line_number=line_num,
                    severity=severity,
                    severity_score=severity_score,
                    issue_type="Direct useContext Usage",
                    current_import=f"useContext({ctx_name})",
                    better_alternative=f"{hook_name}() custom hook",
                    reasoning=[
                        f"Custom hook {hook_name} already encapsulates this context",
                        "Easier to use, test, and maintain",
                        "Centralizes context logic"
                    ],
                    refactor_sample=f"""// Instead of:
const value = useContext({ctx_name});

// Use:
const value = {hook_name}();""",
                    auto_fixable=False
                ))
            else:
                severity = Severity.LOW
                severity_score = self._severity_to_score(severity)
                issues.append(WiringIssue(
                    file_path=file_path,
                    line_number=line_num,
                    severity=severity,
                    severity_score=severity_score,
                    issue_type="Direct useContext Usage",
                    current_import=f"useContext({ctx_name})",
                    better_alternative=f"Create custom hook use{ctx_name}()",
                    reasoning=[
                        "Encapsulate context logic in a custom hook",
                        "Improves reusability and testability"
                    ],
                    refactor_sample=f"""// Create a custom hook:
export const use{ctx_name} = () => {{
  const context = useContext({ctx_name});
  if (!context) throw new Error('...');
  return context;
}};""",
                    auto_fixable=False
                ))
        return issues

    def _check_raw_fetch(self, file_path: str, line_num: int, line: str) -> List[WiringIssue]:
        issues = []
        if ('fetch(' in line or 'axios.' in line) and 'services' not in file_path and 'hooks' not in file_path:
            severity = Severity.MEDIUM
            severity_score = self._severity_to_score(severity)
            issues.append(WiringIssue(
                file_path=file_path,
                line_number=line_num,
                severity=severity,
                severity_score=severity_score,
                issue_type="Raw HTTP Call",
                current_import="fetch() / axios",
                better_alternative="mcpService or network service layer",
                reasoning=[
                    "Direct HTTP calls bypass service layer",
                    "MCP integration provides consistency, caching, error handling",
                    "Easier to mock and test"
                ],
                refactor_sample="""// Instead of:
fetch('/api/data');

// Use:
import { mcpService } from '@/services/mcpService';
const data = await mcpService.request('/api/data');""",
                auto_fixable=False
            ))
        return issues

    def post_process_ai_providers(self) -> List[WiringIssue]:
        issues = []
        for file_path, sdks in self._ai_sdk_files.items():
            if len(sdks) > 1:
                severity = Severity.MEDIUM
                severity_score = self._severity_to_score(severity)
                issues.append(WiringIssue(
                    file_path=file_path,
                    line_number=1,
                    severity=severity,
                    severity_score=severity_score,
                    issue_type="Multiple AI Providers",
                    current_import=", ".join(sdks),
                    better_alternative="Standardize on one AI provider",
                    reasoning=[
                        f"File imports multiple AI SDKs: {', '.join(sdks)}",
                        "Can lead to inconsistent behavior and larger bundle",
                        "Consider using an abstraction layer"
                    ],
                    refactor_sample="// Create a unified AI service that can switch providers",
                    auto_fixable=False
                ))
        return issues


# =============================================================================
# ARCHITECTURAL ANALYZER (full)
# =============================================================================
class ArchitecturalAnalyzer:
    def __init__(self, files: Dict[str, FileInfo], project_path: Path):
        self.files = files
        self.project_path = project_path

    def analyze(self) -> List[ArchitecturalInsight]:
        insights = []
        insights.append(self._analyze_ai_providers())
        insights.append(self._analyze_mcp_integration())
        insights.append(self._analyze_voice_integration())
        insights.append(self._analyze_context_usage())
        insights.append(self._analyze_hook_patterns())
        insights.append(self._analyze_context_overuse())
        insights.append(self._analyze_ai_provider_diversity())
        insights.append(self._analyze_mcp_coverage())
        insights.append(self._analyze_hook_naming())
        cycle_insight = self._detect_cycles()
        if cycle_insight:
            insights.append(cycle_insight)
        return insights

    def _detect_cycles(self) -> Optional[ArchitecturalInsight]:
        def dfs(start: str, current: str, depth: int, path: List[str], visited: Set[str]) -> List[List[str]]:
            cycles = []
            if depth > 5:
                return cycles
            if current in path:
                cycle_start = path.index(current)
                cycle = path[cycle_start:]
                if 2 <= len(cycle) <= 5:
                    min_idx = min(range(len(cycle)), key=lambda i: cycle[i])
                    cycle = cycle[min_idx:] + cycle[:min_idx]
                    cycles.append(cycle)
                return cycles
            visited.add(current)
            path.append(current)
            file_info = self.files.get(current)
            if file_info:
                for dep in file_info.depends_on:
                    if dep in self.files:
                        cycles.extend(dfs(start, dep, depth + 1, path[:], visited))
            return cycles

        all_cycles = []
        processed = set()
        for file_path in self.files:
            if file_path not in processed:
                cycles = dfs(file_path, file_path, 0, [], set())
                for cycle in cycles:
                    cycle_tuple = tuple(cycle)
                    if cycle_tuple not in processed:
                        all_cycles.append(cycle)
                        processed.add(cycle_tuple)
                        for node in cycle:
                            processed.add(node)

        if not all_cycles:
            return None

        affected_files = set()
        for cycle in all_cycles:
            affected_files.update(cycle)

        penalty = min(50, len(all_cycles) * 10)
        health = max(0, 100 - penalty)

        return ArchitecturalInsight(
            pattern=PatternType.CIRCULAR_DEPENDENCY,
            health_score=health,
            files_involved=len(affected_files),
            strengths=[],
            weaknesses=[f"Found {len(all_cycles)} circular dependencies affecting {len(affected_files)} files"],
            recommendations=["Break circular dependencies by extracting shared code or using dependency injection"],
            affected_files=list(affected_files)
        )

    def _analyze_ai_providers(self) -> ArchitecturalInsight:
        ai_files = [f for f in self.files.values() if f.has_ai_hook]
        health = 0
        strengths = []
        weaknesses = []
        recommendations = []
        if ai_files:
            health += 40
            strengths.append(f"✓ {len(ai_files)} files with AI integration")
            ai_hooks = [f for f in ai_files if f.layer == LayerType.HOOKS]
            ai_services = [f for f in ai_files if f.layer == LayerType.SERVICES]
            if ai_hooks and ai_services:
                health += 30
                strengths.append("✓ Proper separation: hooks for UI, services for logic")
            elif not ai_hooks:
                weaknesses.append("Missing custom hooks for AI providers")
                recommendations.append("Create useAI hooks for better component integration")
            elif not ai_services:
                weaknesses.append("Missing service layer for AI")
                recommendations.append("Extract AI logic into service layer")
            ai_with_error = sum(1 for f in ai_files if 'error' in ' '.join(f.hooks_used).lower())
            if ai_with_error > 0:
                health += 30
                strengths.append("✓ Error handling implemented")
            else:
                weaknesses.append("Limited error handling in AI layer")
                recommendations.append("Add comprehensive error handling for AI operations")
        else:
            health = 50
            weaknesses.append("No AI provider integration detected")
            recommendations.append("Consider adding AI provider abstraction layer")
        return ArchitecturalInsight(
            pattern=PatternType.AI_PROVIDER,
            health_score=min(health, 100),
            files_involved=len(ai_files),
            strengths=strengths,
            weaknesses=weaknesses,
            recommendations=recommendations
        )

    def _analyze_mcp_integration(self) -> ArchitecturalInsight:
        mcp_files = [f for f in self.files.values() if f.has_mcp]
        health = 0
        strengths = []
        weaknesses = []
        recommendations = []
        if mcp_files:
            health += 50
            strengths.append(f"✓ MCP integration found in {len(mcp_files)} files")
            has_service = any('service' in f.path.lower() for f in mcp_files)
            has_hook = any(f.layer == LayerType.HOOKS for f in mcp_files)
            if has_service:
                health += 25
                strengths.append("✓ MCP service layer implemented")
            if has_hook:
                health += 25
                strengths.append("✓ MCP hooks for React integration")
            if not has_service:
                recommendations.append("Create MCP service layer for business logic")
            if not has_hook:
                recommendations.append("Create useMcp hook for easier component usage")
        else:
            health = 40
            weaknesses.append("No MCP integration detected")
            recommendations.append("Consider implementing Model Context Protocol for enhanced capabilities")
        return ArchitecturalInsight(
            pattern=PatternType.MCP_INTEGRATION,
            health_score=min(health, 100),
            files_involved=len(mcp_files),
            strengths=strengths,
            weaknesses=weaknesses,
            recommendations=recommendations
        )

    def _analyze_voice_integration(self) -> ArchitecturalInsight:
        voice_files = [f for f in self.files.values() if f.has_voice]
        health = 0
        strengths = []
        weaknesses = []
        recommendations = []
        if voice_files:
            health += 60
            strengths.append(f"✓ Voice integration in {len(voice_files)} files")
            voice_hooks = [f for f in voice_files if f.layer == LayerType.HOOKS]
            if voice_hooks:
                health += 40
                strengths.append("✓ Voice hooks properly implemented")
            else:
                recommendations.append("Create voice command hooks for better reusability")
        else:
            health = 30
            weaknesses.append("No voice integration detected")
            recommendations.append("Consider adding voice command support for accessibility")
        return ArchitecturalInsight(
            pattern=PatternType.VOICE_COMMAND,
            health_score=min(health, 100),
            files_involved=len(voice_files),
            strengths=strengths,
            weaknesses=weaknesses,
            recommendations=recommendations
        )

    def _analyze_context_usage(self) -> ArchitecturalInsight:
        context_files = [f for f in self.files.values() if f.layer == LayerType.CONTEXTS]
        files_using_context = [f for f in self.files.values() if f.context_count > 0]
        health = 0
        strengths = []
        weaknesses = []
        recommendations = []
        if context_files:
            health += 30
            strengths.append(f"✓ {len(context_files)} context providers defined")
            typed_contexts = sum(1 for f in context_files if f.has_interface or f.has_type_export)
            if typed_contexts == len(context_files):
                health += 35
                strengths.append("✓ All contexts properly typed")
            elif typed_contexts > 0:
                health += 20
                weaknesses.append(f"{len(context_files) - typed_contexts} contexts missing types")
                recommendations.append("Add TypeScript types to all contexts")
            avg_contexts_per_component = (
                sum(f.context_count for f in files_using_context) / len(files_using_context)
                if files_using_context else 0
            )
            if avg_contexts_per_component > 3:
                health -= 10
                weaknesses.append(f"High context usage (avg {avg_contexts_per_component:.1f} per file)")
                recommendations.append("Consider using state management (Zustand) for complex state")
            else:
                health += 35
                strengths.append("✓ Balanced context usage")
        else:
            health = 50
            weaknesses.append("No React contexts found")
            recommendations.append("Consider using Context API for global state")
        return ArchitecturalInsight(
            pattern=PatternType.CONTEXT_PATTERN,
            health_score=min(max(health, 0), 100),
            files_involved=len(context_files),
            strengths=strengths,
            weaknesses=weaknesses,
            recommendations=recommendations
        )

    def _analyze_hook_patterns(self) -> ArchitecturalInsight:
        hook_files = [f for f in self.files.values()
                     if f.layer == LayerType.HOOKS and Path(f.path).stem.startswith('use')]
        health = 0
        strengths = []
        weaknesses = []
        recommendations = []
        if len(hook_files) > 10:
            health += 40
            strengths.append(f"✓ Rich custom hooks library ({len(hook_files)} hooks)")
        elif len(hook_files) > 5:
            health += 25
            strengths.append(f"✓ {len(hook_files)} custom hooks")
        properly_named = sum(1 for f in hook_files if Path(f.path).stem.startswith('use'))
        if properly_named == len(hook_files):
            health += 30
            strengths.append("✓ All hooks follow naming convention")
        ts_hooks = sum(1 for f in hook_files if f.path.endswith('.ts') or f.path.endswith('.tsx'))
        if ts_hooks == len(hook_files):
            health += 30
            strengths.append("✓ All hooks in TypeScript")
        if health < 50:
            recommendations.append("Create more reusable custom hooks")
            recommendations.append("Ensure all hooks follow 'use' prefix convention")
        return ArchitecturalInsight(
            pattern=PatternType.HOOK_PATTERN,
            health_score=min(health, 100),
            files_involved=len(hook_files),
            strengths=strengths,
            weaknesses=weaknesses,
            recommendations=recommendations
        )

    def _analyze_context_overuse(self) -> ArchitecturalInsight:
        files_with_direct_context = []
        for f in self.files.values():
            try:
                full_path = self.project_path / f.path
                content = full_path.read_text(encoding='utf-8')
                if 'useContext(' in content and f.layer != LayerType.HOOKS:
                    files_with_direct_context.append(f)
            except:
                pass
        health = 100
        weaknesses = []
        recommendations = []
        if files_with_direct_context:
            health = max(0, 100 - len(files_with_direct_context) * 5)
            weaknesses.append(f"{len(files_with_direct_context)} files use raw useContext in components")
            recommendations.append("Encapsulate context access in custom hooks")
        return ArchitecturalInsight(
            pattern=PatternType.CONTEXT_PATTERN,
            health_score=health,
            files_involved=len(files_with_direct_context),
            strengths=["No direct useContext in components"] if not files_with_direct_context else [],
            weaknesses=weaknesses,
            recommendations=recommendations
        )

    def _analyze_ai_provider_diversity(self) -> ArchitecturalInsight:
        provider_count = defaultdict(int)
        for f in self.files.values():
            for hook in f.hooks_used:
                if hook in Config.AI_HOOKS:
                    if 'Gemini' in hook:
                        provider_count['Gemini'] += 1
                    elif 'OpenAI' in hook:
                        provider_count['OpenAI'] += 1
                    elif 'Anthropic' in hook:
                        provider_count['Anthropic'] += 1
                    elif 'LMStudio' in hook:
                        provider_count['LMStudio'] += 1
                    elif 'LocalAI' in hook:
                        provider_count['LocalAI'] += 1
                    else:
                        provider_count['Other'] += 1
        total = sum(provider_count.values())
        health = 100
        strengths = []
        weaknesses = []
        recommendations = []
        if total == 0:
            health = 50
            weaknesses.append("No AI provider usage detected")
        elif len(provider_count) == 1:
            health = 70
            strengths.append(f"Focused on one provider: {list(provider_count.keys())[0]}")
            recommendations.append("Consider adding fallback/secondary provider for resilience")
        elif len(provider_count) >= 3:
            health = 85
            strengths.append(f"Good provider diversity ({len(provider_count)} providers)")
        else:
            health = 80
            strengths.append(f"{len(provider_count)} AI providers in use")
        return ArchitecturalInsight(
            pattern=PatternType.AI_PROVIDER,
            health_score=health,
            files_involved=total,
            strengths=strengths,
            weaknesses=weaknesses,
            recommendations=recommendations
        )

    def _analyze_mcp_coverage(self) -> ArchitecturalInsight:
        entry_files = [f for f in self.files.values() if f.is_entry_point]
        mcp_in_entry = [f for f in entry_files if f.has_mcp]
        health = 0
        strengths = []
        weaknesses = []
        recommendations = []
        if entry_files:
            coverage = len(mcp_in_entry) / len(entry_files)
            health = coverage * 100
            if coverage > 0.5:
                strengths = [f"MCP integrated in {len(mcp_in_entry)}/{len(entry_files)} entry points"]
            else:
                weaknesses = [f"Only {len(mcp_in_entry)}/{len(entry_files)} entry points have MCP"]
                recommendations = ["Initialize MCP in main application root"]
        else:
            health = 0
            weaknesses = ["No entry points detected"]
        return ArchitecturalInsight(
            pattern=PatternType.MCP_INTEGRATION,
            health_score=health,
            files_involved=len(mcp_in_entry),
            strengths=strengths if 'strengths' in locals() else [],
            weaknesses=weaknesses if 'weaknesses' in locals() else [],
            recommendations=recommendations if 'recommendations' in locals() else []
        )

    def _analyze_hook_naming(self) -> ArchitecturalInsight:
        hook_files = [f for f in self.files.values() if f.layer == LayerType.HOOKS]
        bad_names = [f for f in hook_files if not Path(f.path).stem.startswith('use')]
        health = 100 - len(bad_names) * 10
        health = max(health, 0)
        weaknesses = []
        recommendations = []
        if bad_names:
            weaknesses.append(f"{len(bad_names)} custom hooks violate naming convention")
            recommendations.append("Rename hooks to start with 'use' (e.g., useMyHook)")
        return ArchitecturalInsight(
            pattern=PatternType.HOOK_PATTERN,
            health_score=health,
            files_involved=len(bad_names),
            strengths=["All hooks follow convention"] if not bad_names else [],
            weaknesses=weaknesses,
            recommendations=recommendations
        )


# =============================================================================
# RECOMMENDATION ENGINE
# =============================================================================
class RecommendationEngine:
    def __init__(self, files: Dict[str, FileInfo], graph: Dict[str, List[str]],
                 duplicates: List[DuplicateCluster], unwired: List[str]):
        self.files = files
        self.graph = graph
        self.duplicates = duplicates
        self.unwired = unwired

    def generate_recommendations(self):
        for path, fi in self.files.items():
            self._analyze_file(fi)
        self._generate_wiring_suggestions()

    def _analyze_file(self, fi: FileInfo):
        fi.stability_score = self._calculate_stability(fi)
        fi.risk_score = self._calculate_risk(fi)
        fi.risk_level = self._classify_risk(fi.risk_score)
        rec, reasons, conf = self._recommend(fi)
        fi.recommendation = rec
        fi.recommendation_reasons = reasons
        fi.recommendation_confidence = conf

    def _calculate_stability(self, fi: FileInfo) -> float:
        w = Config.STABILITY_WEIGHTS
        score = 0.0
        if fi.dependents:
            score += w['dependents'] * min(len(fi.dependents)/10, 1.0) * 100
        if fi.exports:
            score += w['exports'] * min(len(fi.exports)/5, 1.0) * 100
        size_score = 1.0 - abs(fi.lines - 200) / 500
        size_score = max(0, min(1, size_score))
        score += w['size'] * size_score * 100
        recency = 1.0 / (1 + fi.days_since_modified / 30)
        score += w['recency'] * recency * 100
        penalty = 0
        if fi.is_test_file:
            penalty += 0.2
        if fi.duplicate_of:
            penalty += 0.5
        if len(fi.issues) > 3:
            penalty += 0.3
        score -= w['penalties'] * penalty * 100
        return max(0, min(100, score))

    def _calculate_risk(self, fi: FileInfo) -> float:
        risk = 0.0
        if fi.cyclomatic_complexity > 20:
            risk += 20
        elif fi.cyclomatic_complexity > 10:
            risk += 10
        if fi.any_count > 5:
            risk += 15
        elif fi.any_count > 0:
            risk += 5
        if fi.lines > 500:
            risk += 15
        elif fi.lines > 300:
            risk += 10
        risk += len(fi.issues) * 5
        if len(fi.dependents) == 0 and not fi.is_entry_point:
            risk += 20
        if fi.duplicate_of:
            risk += 25
        return min(100, risk)

    def _classify_risk(self, risk: float) -> RiskLevel:
        if risk >= 75:
            return RiskLevel.CRITICAL
        if risk >= 50:
            return RiskLevel.HIGH
        if risk >= 25:
            return RiskLevel.MEDIUM
        return RiskLevel.LOW

    def _recommend(self, fi: FileInfo) -> Tuple[Recommendation, List[str], float]:
        if fi.duplicate_of:
            return Recommendation.MERGE, [f"Exact duplicate of {fi.duplicate_of}"], 95.0
        if fi.structural_duplicates:
            return Recommendation.MERGE, ["Structural duplicate candidate"], 85.0
        if fi.unwired_type:
            if fi.unwired_type == UnwiredType.DEAD_CODE:
                return Recommendation.ARCHIVE, ["Dead code, no dependents"], 80.0
            if fi.unwired_type == UnwiredType.ORPHANED_USEFUL:
                return Recommendation.WIRE, ["Potentially useful but orphaned"], 70.0
            if fi.unwired_type == UnwiredType.NEW_FEATURE:
                return Recommendation.REVIEW, ["New feature not yet wired"], 60.0
        if fi.risk_level == RiskLevel.CRITICAL:
            return Recommendation.REFACTOR, ["Critical risk – immediate refactor"], 90.0
        if len(fi.dependents) == 0 and not fi.is_entry_point:
            return Recommendation.ARCHIVE, ["No dependents"], 75.0
        if fi.stability_score > 70:
            return Recommendation.KEEP, ["High stability"], fi.stability_score
        if fi.risk_level == RiskLevel.HIGH:
            return Recommendation.REFACTOR, ["High risk"], 70.0
        return Recommendation.REVIEW, ["Manual review required"], 50.0

    def _generate_wiring_suggestions(self):
        for uw in self.unwired:
            if uw not in self.files:
                continue
            fi = self.files[uw]
            suggestions = self._suggest_wiring_targets(uw)
            fi.wiring_suggestions = suggestions

    def _suggest_wiring_targets(self, unwired_path: str) -> List[WiringSuggestion]:
        uw = self.files[unwired_path]
        suggestions = []
        for path, fi in self.files.items():
            if path == unwired_path or path in self.unwired:
                continue
            if len(fi.dependents) == 0:
                continue
            score = self._wiring_similarity(uw, fi)
            if score > Config.WIRING_SIMILARITY_THRESHOLD:
                common_exports = list({e.name for e in uw.exports} & {e.name for e in fi.exports})
                common_imports = list({i.source for i in uw.imports} & {i.source for i in fi.imports})
                suggestions.append(WiringSuggestion(
                    target_file=path,
                    similarity_score=score,
                    reason=self._explain_similarity(uw, fi),
                    integration_point=self._suggest_integration(fi),
                    common_exports=common_exports[:5],
                    common_imports=common_imports[:5]
                ))
        suggestions.sort(key=lambda x: x.similarity_score, reverse=True)
        return suggestions[:5]

    def _wiring_similarity(self, a: FileInfo, b: FileInfo) -> float:
        score = 0.0
        if a.category == b.category:
            score += 0.4
        a_exports = {e.name for e in a.exports}
        b_exports = {e.name for e in b.exports}
        a_imports = {i.source for i in a.imports}
        b_imports = {i.source for i in b.imports}
        exp_sim = jaccard_similarity(a_exports, b_exports)
        imp_sim = jaccard_similarity(a_imports, b_imports)
        score += 0.3 * (exp_sim + imp_sim) / 2
        if a.structural_hash and a.structural_hash == b.structural_hash:
            score += 0.2
        if a.git_history and b.git_history:
            author_sim = jaccard_similarity(set(a.git_history.authors), set(b.git_history.authors))
            score += 0.1 * author_sim
        return min(score, 1.0)

    def _explain_similarity(self, a: FileInfo, b: FileInfo) -> str:
        reasons = []
        if a.category == b.category:
            reasons.append(f"Same category ({a.category.value})")
        a_exports = {e.name for e in a.exports}
        b_exports = {e.name for e in b.exports}
        common_exports = a_exports & b_exports
        if common_exports:
            reasons.append(f"Common exports: {', '.join(list(common_exports)[:3])}")
        a_imports = {i.source for i in a.imports}
        b_imports = {i.source for i in b.imports}
        common_imports = a_imports & b_imports
        if len(common_imports) > 2:
            reasons.append(f"{len(common_imports)} common dependencies")
        if a.git_history and b.git_history:
            common_authors = set(a.git_history.authors) & set(b.git_history.authors)
            if common_authors:
                reasons.append(f"Common authors: {len(common_authors)}")
        return " | ".join(reasons) if reasons else f"Similarity: {self._wiring_similarity(a,b):.0%}"

    def _suggest_integration(self, target: FileInfo) -> str:
        if target.is_barrel_file:
            return f"Add to barrel exports in {target.relative_path}"
        elif target.dependents:
            return f"Used by {len(target.dependents)} files – integrate similarly"
        else:
            return "Direct import recommended"


# =============================================================================
# ARCHIVE MANAGER
# =============================================================================
class ArchiveManager:
    def __init__(self, project_path: Path, report_dir: Path, dry_run: bool = False):
        self.project_path = project_path
        self.report_dir = report_dir
        self.dry_run = dry_run
        self.archives_dir = report_dir / 'archives'
        self.history_dir = report_dir / 'history'

    def archive_files(self, files: List[str], reason: str = "") -> Optional[Path]:
        if not files:
            log_warning("No files to archive")
            return None
        if self.dry_run:
            log_info(f"[DRY RUN] Would archive {len(files)} files")
            for f in files[:10]:
                log_info(f"  • {f}")
            if len(files) > 10:
                log_info(f"  ... and {len(files)-10} more")
            return None

        self.archives_dir.mkdir(parents=True, exist_ok=True)
        self.history_dir.mkdir(parents=True, exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        archive_name = f"archive_{timestamp}.zip"
        archive_path = self.archives_dir / archive_name

        try:
            with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as zf:
                for file_path in files:
                    full = self.project_path / file_path
                    if full.exists():
                        zf.write(full, file_path)
            metadata = {
                'timestamp': timestamp,
                'reason': reason,
                'files': files,
                'count': len(files)
            }
            meta_path = self.history_dir / f"archive_{timestamp}.json"
            with open(meta_path, 'w') as f:
                json.dump(metadata, f, indent=2, cls=EnhancedJSONEncoder)
            log_success(f"Created archive: {archive_path} ({len(files)} files)")
            return archive_path
        except Exception as e:
            log_error(f"Archive failed: {e}")
            return None


# =============================================================================
# UNUSED DETECTION ENGINE (advanced)
# =============================================================================
class UnusedSignalCollector:
    def __init__(self, files: Dict[str, FileInfo], graph: Dict[str, List[str]],
                 git_analyzer: Optional[GitAnalyzer] = None,
                 fast_mode: bool = False):
        self.files = files
        self.graph = graph
        self.git_analyzer = git_analyzer
        self.fast_mode = fast_mode
        self.active_files = set()
        for path, fi in files.items():
            if fi.dependents or fi.is_entry_point or fi.is_barrel_exported:
                self.active_files.add(path)

    def collect(self, path: str) -> Dict[str, bool]:
        fi = self.files[path]
        signals = {}

        signals['no_direct_dependents'] = len(fi.dependents) == 0
        signals['no_transitive_dependents'] = len(fi.transitive_dependents) == 0
        signals['not_entry_point'] = not fi.is_entry_point
        signals['not_dynamic_imported'] = not fi.is_dynamic_imported
        signals['not_barrel_exported'] = not fi.is_barrel_exported
        signals['has_exports'] = len(fi.exports) > 0
        signals['complexity_high'] = fi.cyclomatic_complexity > 10
        signals['lines_gt_min'] = fi.lines > Config.MIN_LINES_FOR_UNWIRED
        signals['not_test'] = not fi.is_test_file
        signals['not_config'] = fi.category != FileCategory.CONFIGURATION
        signals['not_framework_reserved'] = not (fi.path.startswith('pages/') or
                                                 fi.path.startswith('app/') or
                                                 'main.' in fi.path or 'index.' in fi.path)

        if not self.fast_mode and self.git_analyzer and fi.git_history and fi.git_history.has_history:
            signals['git_old'] = fi.days_since_modified > 180
            signals['git_few_commits'] = fi.git_history.commit_count <= 2
        else:
            signals['git_old'] = False
            signals['git_few_commits'] = False

        if not self.fast_mode and self.active_files:
            max_sim = 0.0
            sample_active = list(self.active_files)[:100]
            for active in sample_active:
                if active == path:
                    continue
                fi_active = self.files[active]
                a_exports = {e.name for e in fi.exports}
                a_imports = {i.source for i in fi.imports}
                b_exports = {e.name for e in fi_active.exports}
                b_imports = {i.source for i in fi_active.imports}
                sim = jaccard_similarity(a_exports | a_imports, b_exports | b_imports)
                if sim > max_sim:
                    max_sim = sim
            signals['structural_similarity_to_active'] = max_sim > Config.STRUCTURAL_SIMILARITY_THRESHOLD
        else:
            signals['structural_similarity_to_active'] = False

        signals['value_score_low'] = fi.value_score < Config.VALUE_MIN_SCORE
        signals['has_side_effects'] = fi.has_side_effects

        return signals

class UnusedConfidenceModel:
    def __init__(self, weights: Dict[str, int] = None):
        self.weights = weights or Config.UNUSED_SIGNAL_WEIGHTS

    def compute(self, signals: Dict[str, bool]) -> float:
        score = 0.0
        for signal, value in signals.items():
            if value:
                score += self.weights.get(signal, 0)
        return max(0, min(100, score))

class UnusedClassifier:
    @staticmethod
    def classify(path: str, fi: FileInfo, signals: Dict[str, bool], confidence: float) -> Tuple[UnusedClassification, RecommendedAction, Optional[str]]:
        classification = UnusedClassification.DEAD_CODE
        action = RecommendedAction.ARCHIVE
        merge_target = None

        if signals.get('has_exports', False) and fi.lines > 100 and fi.value_score >= 50:
            classification = UnusedClassification.HIGH_VALUE_UNWIRED
            action = RecommendedAction.INTEGRATE
        elif not signals.get('has_exports', False) and signals.get('git_old', False) and signals.get('git_few_commits', False):
            classification = UnusedClassification.DEAD_CODE
            action = RecommendedAction.DELETE
        elif signals.get('structural_similarity_to_active', False):
            classification = UnusedClassification.LEGACY_LEFTOVER
            action = RecommendedAction.MERGE_WITH
        elif signals.get('has_exports', False) and not signals.get('git_old', False):
            classification = UnusedClassification.ORPHANED_FEATURE
            action = RecommendedAction.REVIEW
        else:
            classification = UnusedClassification.ARCHIVE_CANDIDATE
            action = RecommendedAction.ARCHIVE

        return classification, action, merge_target

class UnusedDeletionSimulator:
    def __init__(self, files: Dict[str, FileInfo], graph: Dict[str, List[str]]):
        self.files = files
        self.graph = graph

    def is_safe_to_delete(self, path: str) -> Tuple[bool, List[str]]:
        blockers = []
        fi = self.files[path]

        if fi.is_dynamic_imported:
            blockers.append("File is dynamically imported")
        if fi.is_barrel_exported:
            blockers.append("File is re-exported from a barrel")
        for dep in fi.dependents:
            dep_fi = self.files.get(dep)
            if dep_fi and dep_fi.is_test_file:
                blockers.append(f"Referenced by test: {dep}")
        if fi.dependents:
            blockers.append(f"Has {len(fi.dependents)} direct dependents")

        safe = len(blockers) == 0
        return safe, blockers


# =============================================================================
# HTML REPORT GENERATOR (enhanced with all sections and guidance)
# =============================================================================
class HTMLReportGenerator:
    @staticmethod
    def generate(result: AnalysisResult, output_path: Path, with_git: bool = False):
        html = HTMLReportGenerator._generate_full_html(result, with_git)
        output_path.write_text(html, encoding='utf-8')
        log_success(f"HTML report generated: {output_path}")

    @staticmethod
    def _generate_full_html(result: AnalysisResult, with_git: bool) -> str:
        # Helper to build table rows
        def valuable_rows():
            rows = ""
            for comp in sorted(result.valuable_unused, key=lambda x: x.value_score, reverse=True)[:50]:
                score_class = 'high' if comp.value_score >= 60 else 'medium' if comp.value_score >= 40 else 'low'
                reasons_short = "<br>".join(comp.reasons[:3])
                rows += f"""
                <tr>
                    <td><strong>{comp.name}</strong><br><span class="file-path">{comp.path}</span></td>
                    <td><span class="badge badge-{score_class}">{comp.value_score:.0f}</span></td>
                    <td>{comp.layer.value}</td>
                    <td>{reasons_short}</td>
                    <td><code>{comp.suggested_location}</code></td>
                </tr>"""
            return rows

        def wiring_rows():
            rows = ""
            for issue in sorted(result.wiring_issues, key=lambda x: x.severity_score, reverse=True)[:50]:
                severity_badge = f'<span class="badge badge-{issue.severity.value}">{issue.severity.value.upper()}</span>'
                rows += f"""
                <tr>
                    <td><strong>{Path(issue.file_path).name}</strong><br><span class="file-path">Line {issue.line_number}</span></td>
                    <td>{severity_badge}</td>
                    <td>{issue.issue_type}</td>
                    <td><code>{issue.current_import}</code></td>
                    <td><code>{issue.better_alternative}</code></td>
                    <td><details><summary>Fix</summary><pre>{issue.refactor_sample}</pre></details></td>
                </tr>"""
            return rows

        def insight_cards():
            cards = ""
            for insight in result.insights:
                health_color = '#10b981' if insight.health_score >= 80 else '#f59e0b' if insight.health_score >= 60 else '#dc2626'
                strengths = "".join(f'<li class="strength">{s}</li>' for s in insight.strengths[:3])
                weaknesses = "".join(f'<li class="weakness">{w}</li>' for w in insight.weaknesses[:3])
                recs = "".join(f'<li class="recommendation">{r}</li>' for r in insight.recommendations[:3])
                cards += f"""
                <div class="health-card">
                    <h3>{insight.pattern.value.replace('_', ' ').title()}</h3>
                    <div class="health-score" style="color:{health_color};">{insight.health_score:.0f}%</div>
                    <ul>{strengths}{weaknesses}{recs}</ul>
                </div>"""
            return cards

        def duplicate_rows():
            rows = ""
            for c in sorted(result.duplicate_clusters, key=lambda x: x.estimated_savings_lines, reverse=True)[:30]:
                rows += f"""
                <tr>
                    <td><code>{c.cluster_id}</code></td>
                    <td>{c.similarity_score:.0%}</td>
                    <td>{len(c.files)}</td>
                    <td><code>{c.base_file}</code></td>
                    <td>{c.estimated_savings_lines}</td>
                </tr>"""
            return rows

        def archive_rows():
            rows = ""
            for d in sorted(result.archive_candidates, key=lambda x: x.confidence, reverse=True)[:30]:
                rows += f"""
                <tr>
                    <td><code>{d.file_path}</code></td>
                    <td>{d.confidence:.0f}%</td>
                    <td>{'; '.join(d.reasons[:2])}</td>
                    <td>{'; '.join(d.blockers[:2]) if d.blockers else 'None'}</td>
                </tr>"""
            return rows

        def unused_rows():
            rows = ""
            for u in sorted(result.potentially_unused_files, key=lambda x: x.confidence, reverse=True)[:50]:
                action_display = u.recommended_action.value
                if u.recommended_action == RecommendedAction.MERGE_WITH and u.merge_target:
                    action_display += f" → {u.merge_target}"
                rows += f"""
                <tr>
                    <td><code>{u.path}</code></td>
                    <td>{u.confidence:.1f}%</td>
                    <td>{u.classification.value}</td>
                    <td>{action_display}</td>
                    <td>{'✅' if u.deletion_safe else '❌'}</td>
                    <td>{'; '.join(u.reasons[:2])}</td>
                </tr>"""
            return rows

        def clone_rows():
            rows = ""
            for c in result.clones[:30]:
                rows += f"""
                <tr>
                    <td>{c.clone_type}</td>
                    <td>{len(c.files)}</td>
                    <td>{c.similarity:.0%}</td>
                    <td>{c.lines}</td>
                    <td><code>{c.representative}</code></td>
                </tr>"""
            return rows

        def cycle_rows():
            rows = ""
            for c in result.circular_deps[:30]:
                cycle_str = " → ".join(c.cycle[:3]) + (" …" if len(c.cycle) > 3 else "")
                rows += f"""
                <tr>
                    <td>{c.severity}</td>
                    <td>{len(c.cycle)}</td>
                    <td><code>{cycle_str}</code></td>
                </tr>"""
            return rows

        html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>G-Studio Code Analysis Report v{Config.VERSION}</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
        }}
        .container {{ max-width: 1400px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; }}
        .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; }}
        .header h1 {{ font-size: 2.5em; }}
        .content {{ padding: 40px; }}
        .stats-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(200px,1fr)); gap: 20px; margin-bottom: 40px; }}
        .stat-card {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 25px; border-radius: 12px; text-align: center; }}
        .stat-card .number {{ font-size: 2.5em; font-weight: bold; }}
        .section {{ margin-bottom: 50px; }}
        .section-title {{ font-size: 2em; color: #667eea; border-bottom: 3px solid #667eea; padding-bottom: 10px; margin-bottom: 20px; }}
        table {{ width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; }}
        thead {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }}
        th, td {{ padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }}
        tr:hover {{ background: #f9fafb; }}
        .badge {{ display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 0.85em; font-weight: 600; }}
        .badge-critical {{ background: #dc2626; color: white; }}
        .badge-high {{ background: #f97316; color: white; }}
        .badge-medium {{ background: #eab308; color: black; }}
        .badge-low {{ background: #6b7280; color: white; }}
        .badge-high-value {{ background: #10b981; color: white; }}
        .score-bar {{ height: 20px; background: #e5e7eb; border-radius: 10px; overflow: hidden; margin: 5px 0; }}
        .score-fill {{ height: 100%; background: linear-gradient(90deg, #10b981, #3b82f6); }}
        .health-card {{ background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 20px; border-left: 4px solid #667eea; }}
        .health-card h3 {{ color: #667eea; }}
        .health-card ul {{ list-style: none; padding: 0; }}
        .health-card li {{ padding: 5px 0 5px 25px; position: relative; }}
        .health-card li.strength::before {{ content: "✓"; position: absolute; left: 0; color: #10b981; }}
        .health-card li.weakness::before {{ content: "⚠"; position: absolute; left: 0; color: #f59e0b; }}
        .health-card li.recommendation::before {{ content: "→"; position: absolute; left: 0; color: #3b82f6; }}
        .footer {{ text-align: center; padding: 30px; color: #6b7280; border-top: 1px solid #e5e7eb; }}
        details summary {{ cursor: pointer; color: #667eea; }}
        pre {{ background: #1f2937; color: #e5e7eb; padding: 10px; border-radius: 4px; overflow-x: auto; }}
        .file-path {{ color: #6b7280; font-size: 0.85em; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 G-Studio Enterprise Code Analysis v{Config.VERSION}</h1>
            <div class="subtitle">Framework: {result.framework.value} | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</div>
        </div>
        <div class="content">
            <!-- Stats -->
            <div class="stats-grid">
                <div class="stat-card"><div class="number">{result.total_files}</div><div class="label">Files</div></div>
                <div class="stat-card"><div class="number">{result.tsx_percentage:.1f}%</div><div class="label">TSX</div></div>
                <div class="stat-card"><div class="number">{len(result.valuable_unused)}</div><div class="label">Valuable Unused</div></div>
                <div class="stat-card"><div class="number">{len(result.wiring_issues)}</div><div class="label">Wiring Issues</div></div>
                <div class="stat-card"><div class="number">{len(result.clones)}</div><div class="label">Clone Groups</div></div>
                <div class="stat-card"><div class="number">{len(result.circular_deps)}</div><div class="label">Cycles</div></div>
            </div>

            <!-- Valuable Unused -->
            <div class="section">
                <h2 class="section-title">💎 Valuable Unused Components ({len(result.valuable_unused)})</h2>
                <table>
                    <thead><tr><th>Component</th><th>Score</th><th>Layer</th><th>Why</th><th>Suggested Location</th></tr></thead>
                    <tbody>{valuable_rows()}</tbody>
                </table>
            </div>

            <!-- Wiring Issues -->
            <div class="section">
                <h2 class="section-title">🔧 Wiring Issues ({len(result.wiring_issues)})</h2>
                <table>
                    <thead><tr><th>File</th><th>Severity</th><th>Type</th><th>Current Import</th><th>Better Alternative</th><th>Fix</th></tr></thead>
                    <tbody>{wiring_rows()}</tbody>
                </table>
            </div>

            <!-- Architectural Insights -->
            <div class="section">
                <h2 class="section-title">🏗️ Architectural Insights</h2>
                {insight_cards()}
            </div>

            <!-- Duplicate Clusters -->
            {f'''
            <div class="section">
                <h2 class="section-title">📦 Duplicate Clusters ({len(result.duplicate_clusters)})</h2>
                <table>
                    <thead><tr><th>Cluster</th><th>Similarity</th><th>Files</th><th>Base</th><th>Savings</th></tr></thead>
                    <tbody>{duplicate_rows()}</tbody>
                </table>
            </div>
            ''' if result.duplicate_clusters else ''}

            <!-- Archive Candidates -->
            {f'''
            <div class="section">
                <h2 class="section-title">📦 Archive Candidates ({len(result.archive_candidates)})</h2>
                <table>
                    <thead><tr><th>File</th><th>Confidence</th><th>Reasons</th><th>Blockers</th></tr></thead>
                    <tbody>{archive_rows()}</tbody>
                </table>
            </div>
            ''' if result.archive_candidates else ''}

            <!-- Potentially Unused Files (advanced) -->
            {f'''
            <div class="section">
                <h2 class="section-title">🧹 Potentially Unused Files ({len(result.potentially_unused_files)})</h2>
                <p>Confidence threshold: {Config.UNUSED_CONFIDENCE_THRESHOLD}%</p>
                <table>
                    <thead><tr><th>File</th><th>Confidence</th><th>Classification</th><th>Action</th><th>Safe to Delete?</th><th>Key Reasons</th></tr></thead>
                    <tbody>{unused_rows()}</tbody>
                </table>
            </div>
            ''' if result.potentially_unused_files else ''}

            <!-- Clone Groups -->
            {f'''
            <div class="section">
                <h2 class="section-title">🔍 Clone Groups ({len(result.clones)})</h2>
                <table>
                    <thead><tr><th>Type</th><th>Files</th><th>Similarity</th><th>Lines</th><th>Representative</th></tr></thead>
                    <tbody>{clone_rows()}</tbody>
                </table>
            </div>
            ''' if result.clones else ''}

            <!-- Circular Dependencies -->
            {f'''
            <div class="section">
                <h2 class="section-title">🔄 Circular Dependencies ({len(result.circular_deps)})</h2>
                <table>
                    <thead><tr><th>Severity</th><th>Length</th><th>Cycle</th></tr></thead>
                    <tbody>{cycle_rows()}</tbody>
                </table>
            </div>
            ''' if result.circular_deps else ''}

            <!-- Recommendations Summary -->
            <div class="section">
                <h2 class="section-title">💡 Recommendations Summary</h2>
                <ul>
                    <li><strong>Keep:</strong> {sum(1 for f in result.files.values() if f.recommendation == Recommendation.KEEP)} files</li>
                    <li><strong>Refactor:</strong> {sum(1 for f in result.files.values() if f.recommendation == Recommendation.REFACTOR)} files</li>
                    <li><strong>Archive:</strong> {sum(1 for f in result.files.values() if f.recommendation == Recommendation.ARCHIVE)} files</li>
                    <li><strong>Delete:</strong> {sum(1 for f in result.files.values() if f.recommendation == Recommendation.DELETE)} files</li>
                    <li><strong>Review:</strong> {sum(1 for f in result.files.values() if f.recommendation == Recommendation.REVIEW)} files</li>
                    <li><strong>Merge:</strong> {sum(1 for f in result.files.values() if f.recommendation == Recommendation.MERGE)} files</li>
                    <li><strong>Wire:</strong> {sum(1 for f in result.files.values() if f.recommendation == Recommendation.WIRE)} files</li>
                </ul>
            </div>
        </div>
        <div class="footer">
            Generated by G-Studio Enterprise Code Intelligence v{Config.VERSION}<br>
            Analysis took {result.analysis_duration_seconds:.2f}s · Cache hit rate {result.cache_hit_rate:.1f}%
        </div>
    </div>
</body>
</html>"""
        return html_template


# =============================================================================
# JSON & CSV EXPORTERS
# =============================================================================
def export_json_report(result: AnalysisResult, output_path: Path):
    data = {
        'version': Config.VERSION,
        'timestamp': datetime.now().isoformat(),
        'summary': {
            'total_files': result.total_files,
            'total_lines': result.total_lines,
            'tsx_percentage': result.tsx_percentage,
            'framework': result.framework.value,
            'duration': result.analysis_duration_seconds,
            'cache_hit_rate': result.cache_hit_rate,
        },
        'valuable_unused': [asdict(c) for c in result.valuable_unused],
        'wiring_issues': [asdict(i) for i in result.wiring_issues],
        'insights': [asdict(i) for i in result.insights],
        'layer_stats': result.layer_stats,
        'duplicate_clusters': [asdict(c) for c in result.duplicate_clusters],
        'archive_candidates': [asdict(c) for c in result.archive_candidates],
        'unused_files': result.unused_files,
        'unwired_features': result.unwired_features,
        'high_risk_files': result.high_risk_files,
        'clones': [asdict(c) for c in result.clones],
        'circular_deps': [asdict(cd) for cd in result.circular_deps],
        'potentially_unused_files': [asdict(u) for u in result.potentially_unused_files],
        'unused_confidence_summary': result.unused_confidence_summary,
        'unused_classification_counts': result.unused_classification_counts,
    }
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2, cls=EnhancedJSONEncoder)
    log_success(f"JSON report saved to {output_path}")

def export_csv_reports(result: AnalysisResult, output_dir: Path):
    if result.valuable_unused:
        csv_path = output_dir / 'valuable_unused.csv'
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f)
            w.writerow(['Name','Path','Layer','Score','Reasons','Suggested Location'])
            for c in sorted(result.valuable_unused, key=lambda x: x.value_score, reverse=True):
                w.writerow([c.name, c.path, c.layer.value, f"{c.value_score:.0f}",
                           "; ".join(c.reasons), c.suggested_location])
        log_success(f"CSV export: {csv_path}")

    if result.wiring_issues:
        csv_path = output_dir / 'wiring_issues.csv'
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f)
            w.writerow(['File','Line','Severity','Score','Type','Current Import','Better Alternative','Reasoning'])
            for i in sorted(result.wiring_issues, key=lambda x: x.severity_score, reverse=True):
                w.writerow([i.file_path, i.line_number, i.severity.value, i.severity_score,
                           i.issue_type, i.current_import, i.better_alternative, "; ".join(i.reasoning)])
        log_success(f"CSV export: {csv_path}")

    if result.duplicate_clusters:
        csv_path = output_dir / 'duplicate_clusters.csv'
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f)
            w.writerow(['Cluster ID','Similarity','Files','Base File','Savings Lines','Summary'])
            for c in sorted(result.duplicate_clusters, key=lambda x: x.estimated_savings_lines, reverse=True):
                w.writerow([c.cluster_id, f"{c.similarity_score:.0%}", len(c.files),
                           c.base_file, c.estimated_savings_lines, c.diff_summary])
        log_success(f"CSV export: {csv_path}")

    if result.archive_candidates:
        csv_path = output_dir / 'archive_candidates.csv'
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f)
            w.writerow(['File','Confidence','Reasons','Blockers'])
            for d in sorted(result.archive_candidates, key=lambda x: x.confidence, reverse=True):
                w.writerow([d.file_path, f"{d.confidence:.0f}%", "; ".join(d.reasons), "; ".join(d.blockers)])
        log_success(f"CSV export: {csv_path}")

    if result.potentially_unused_files:
        csv_path = output_dir / 'potentially_unused.csv'
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f)
            w.writerow(['Path','Confidence','Classification','Recommended Action','Merge Target','Deletion Safe','Reasons'])
            for u in result.potentially_unused_files:
                w.writerow([u.path, f"{u.confidence:.1f}%", u.classification.value,
                           u.recommended_action.value, u.merge_target or '',
                           'Yes' if u.deletion_safe else 'No', '; '.join(u.reasons[:3])])
        log_success(f"CSV export: {csv_path}")


# =============================================================================
# FILE SCANNER
# =============================================================================
class FileScanner:
    def __init__(self, project_path: Path, enable_python: bool = False, verbose: bool = False):
        self.project_path = project_path
        self.enable_python = enable_python
        self.verbose = verbose
        self.src_path = project_path / 'src'
        if not self.src_path.exists():
            self.src_path = project_path
        self.valid_extensions = Config.VALID_EXTENSIONS

    def scan(self) -> List[Path]:
        files = []
        for root, dirs, filenames in os.walk(self.src_path):
            dirs[:] = [d for d in dirs if d not in Config.IGNORE_DIRS]
            for filename in filenames:
                file_path = Path(root) / filename
                if file_path.suffix not in self.valid_extensions:
                    continue
                if any(pattern in filename for pattern in Config.IGNORE_FILES):
                    continue
                files.append(file_path)
        return files


# =============================================================================
# MAIN ANALYZER
# =============================================================================
class GStudioAnalyzer:
    def __init__(self,
                 project_path: Path,
                 output_dir: Path,
                 use_cache: bool = True,
                 verbose: bool = False,
                 dry_run: bool = False,
                 parallel: bool = True,
                 changed_only: bool = False,
                 csv_export: bool = False,
                 min_score: int = 0,
                 enable_python: bool = False,
                 enable_duplicates: bool = False,
                 enable_recommendations: bool = False,
                 archive: bool = False,
                 archive_reason: str = "",
                 git_history: bool = False,
                 use_git_in_scoring: bool = False,
                 detect_barrels: bool = False,
                 detect_dynamic: bool = False,
                 unused_scan: bool = False,
                 fast_unused_scan: bool = False,
                 dry_run_unused: bool = False,
                 unused_threshold: int = Config.UNUSED_CONFIDENCE_THRESHOLD,
                 ):

        self.project_path = project_path
        self.output_dir = output_dir
        self.use_cache = use_cache
        self.verbose = verbose
        self.dry_run = dry_run
        self.parallel = parallel
        self.changed_only = changed_only
        self.csv_export = csv_export
        self.min_score = min_score
        self.enable_python = enable_python
        self.enable_duplicates = enable_duplicates
        self.enable_recommendations = enable_recommendations
        self.archive = archive
        self.archive_reason = archive_reason
        self.git_history = git_history
        self.use_git_in_scoring = use_git_in_scoring
        self.detect_barrels = detect_barrels
        self.detect_dynamic = detect_dynamic
        self.unused_scan = unused_scan
        self.fast_unused_scan = fast_unused_scan
        self.dry_run_unused = dry_run_unused
        self.unused_threshold = unused_threshold

        if not dry_run:
            self.output_dir.mkdir(parents=True, exist_ok=True)

        self.cache = SQLiteCache(project_path / Config.CACHE_FILE, use_cache and not dry_run)
        self.parser = TreeSitterParser(enable_python=enable_python, compute_structural_hash=enable_duplicates, verbose=verbose)
        self.modern_analyzer = ModernCodeAnalyzer(self.parser, verbose=verbose)
        self.scanner = FileScanner(project_path, enable_python=enable_python, verbose=verbose)
        self.git_analyzer = GitAnalyzer(project_path) if git_history else None
        self.git_helper = GitHelper()
        self.framework_detector = FrameworkDetector(project_path)

        self.files: Dict[str, FileInfo] = {}
        self.ast_trees: Dict[str, Tree] = {}
        self.result = AnalysisResult()
        self.skipped_files = 0
        self._start_time = 0
        self._file_content_cache: Dict[str, str] = {}

    def analyze(self) -> AnalysisResult:
        log_header(f"G-STUDIO ENTERPRISE CODE INTELLIGENCE v{Config.VERSION}")
        self._start_time = time.time()

        framework, entry_points = self.framework_detector.detect()
        self.result.framework = framework
        log_info(f"Detected framework: {framework.value}")

        log_info("Scanning project files...")
        file_paths = self.scanner.scan()
        log_success(f"Found {len(file_paths)} source files")

        if self.changed_only:
            log_info("Filtering to files changed since last commit...")
            changed_set = self._get_changed_files()
            if changed_set is not None:
                original_count = len(file_paths)
                file_paths = [p for p in file_paths if str(p.relative_to(self.project_path)) in changed_set]
                self.skipped_files = original_count - len(file_paths)
                log_success(f"Keeping {len(file_paths)} changed files, skipped {self.skipped_files}")

        log_info("Parsing and analyzing files (AST/CFG/DFG)...")
        self._analyze_files(file_paths, entry_points)
        log_success(f"Analyzed {len(self.files)} files")

        log_info("Building dependency graph...")
        dep_graph = DependencyGraph(self.files, self.project_path, self.scanner.src_path)
        dep_graph.build()
        dep_graph.compute_transitive_closure()
        self.result.dependency_graph = dep_graph.graph

        cycles = dep_graph.detect_cycles_tarjan()
        self.result.circular_deps = cycles
        if cycles:
            log_warning(f"Found {len(cycles)} circular dependencies")

        usage_analyzer = UsageAnalyzer(self.files, self.git_analyzer)
        unused, unwired = usage_analyzer.analyze()
        self.result.unused_files = unused
        self.result.unwired_features = unwired
        log_success(f"Found {len(unused)} truly unused files, {len(unwired)} unwired features")

        log_info("Scoring valuable unused components...")
        self._find_valuable_unused(unused)
        log_success(f"Found {len(self.result.valuable_unused)} valuable unused components")

        log_info("Detecting wiring issues...")
        self._detect_wiring_issues()
        log_success(f"Found {len(self.result.wiring_issues)} wiring issues")

        log_info("Analyzing architecture...")
        arch_analyzer = ArchitecturalAnalyzer(self.files, self.project_path)
        self.result.insights = arch_analyzer.analyze()
        log_success(f"Generated {len(self.result.insights)} architectural insights")

        if self.enable_duplicates:
            log_info("Detecting structural duplicates (AST‑based)...")
            dup_detector = ASTDuplicateDetector(
                self.files,
                Config.STRUCTURAL_SIMILARITY_THRESHOLD,
                project_path=self.project_path,
                file_content_cache=self._file_content_cache
            )
            self.result.duplicate_clusters = dup_detector.detect()
            log_success(f"Found {len(self.result.duplicate_clusters)} duplicate clusters")

        if self.enable_recommendations:
            log_info("Generating recommendations...")
            rec_engine = RecommendationEngine(
                self.files, self.result.dependency_graph,
                self.result.duplicate_clusters, self.result.unwired_features
            )
            rec_engine.generate_recommendations()
            log_success("Recommendations generated")

        if self.archive:
            log_info("Selecting archive candidates...")
            candidates = self._select_archive_candidates()
            self.result.archive_candidates = candidates
            log_success(f"Selected {len(candidates)} archive candidates")
            archive_mgr = ArchiveManager(self.project_path, self.output_dir, self.dry_run)
            archive_mgr.archive_files([c.file_path for c in candidates], self.archive_reason)

        if self.unused_scan:
            log_info("Running advanced unused file intelligence...")
            self._analyze_potentially_unused()
            log_success(f"Identified {len(self.result.potentially_unused_files)} potentially unused files (confidence ≥ {self.unused_threshold}%)")

        self._calculate_stats()
        self.result.files = self.files
        self.result.cache_hit_rate = self.cache.hit_rate()
        self.result.git_available = self.git_analyzer.is_git_repo if self.git_analyzer else False
        self.result.analysis_duration_seconds = time.time() - self._start_time

        self.cache.close()
        return self.result

    def _get_changed_files(self) -> Optional[Set[str]]:
        return GitHelper.get_changed_files_since_last_commit(self.project_path)

    def _analyze_files(self, file_paths: List[Path], entry_points: List[str]):
        large = [p for p in file_paths if p.stat().st_size > Config.SMALL_FILE_SIZE]
        small = [p for p in file_paths if p.stat().st_size <= Config.SMALL_FILE_SIZE]

        if large and self.parallel:
            with ProcessPoolExecutor(max_workers=Config.MAX_WORKERS_CPU) as ex:
                futures = [ex.submit(self._parse_file, p, entry_points) for p in large]
                for f in tqdm(as_completed(futures), total=len(large), desc="Parsing large files"):
                    try:
                        f.result()
                    except Exception as e:
                        if self.verbose:
                            log_warning(f"Worker error: {e}")

        for batch in tqdm(list(chunks(small, Config.CHUNK_SIZE)), desc="Parsing small files"):
            for p in batch:
                self._parse_file(p, entry_points)

    def _parse_file(self, file_path: Path, entry_points: List[str]):
        try:
            rel_path = str(file_path.relative_to(self.project_path))
            content = self._read_file(file_path)
            content_hash = compute_hash(content)
            mtime = file_path.stat().st_mtime

            cached = self.cache.get(rel_path, content_hash)
            if cached:
                data = cached['analysis']
                # Convert nested dataclasses back from dicts
                if 'imports' in data:
                    data['imports'] = [ImportInfo(**imp) if isinstance(imp, dict) else imp for imp in data['imports']]
                if 'exports' in data:
                    data['exports'] = [ExportInfo(**exp) if isinstance(exp, dict) else exp for exp in data['exports']]
                if 'git_history' in data and isinstance(data['git_history'], dict):
                    data['git_history'] = GitHistoryInfo(**data['git_history'])
                
                # Convert enum fields from strings back to enums
                if 'layer' in data and isinstance(data['layer'], str):
                    data['layer'] = LayerType(data['layer'])
                if 'category' in data and isinstance(data['category'], str):
                    data['category'] = FileCategory(data['category'])
                if 'risk_level' in data and isinstance(data['risk_level'], str):
                    data['risk_level'] = RiskLevel(data['risk_level'])
                if 'recommendation' in data and isinstance(data['recommendation'], str):
                    data['recommendation'] = Recommendation(data['recommendation'])
                if 'unwired_type' in data and data['unwired_type'] and isinstance(data['unwired_type'], str):
                    data['unwired_type'] = UnwiredType(data['unwired_type'])
                
                file_info = FileInfo(**data)
                if cached['ast']:
                    self.ast_trees[rel_path] = cached['ast']
            else:
                old_tree = self.ast_trees.get(rel_path)
                parsed_data = self.modern_analyzer.analyze_file(file_path, content, old_tree)

                layer = self._classify_layer(file_path, content, parsed_data)
                file_info = self._create_file_info(rel_path, file_path, content, parsed_data, mtime, content_hash)
                file_info.layer = layer

                if rel_path in entry_points:
                    file_info.is_entry_point = True

                cache_data = asdict(file_info)
                cache_data['layer'] = cache_data['layer'].value
                cache_data['category'] = cache_data['category'].value
                cache_data['risk_level'] = cache_data['risk_level'].value
                cache_data['recommendation'] = cache_data['recommendation'].value
                if cache_data['unwired_type']:
                    cache_data['unwired_type'] = cache_data['unwired_type'].value
                if cache_data['git_history']:
                    cache_data['git_history'] = asdict(cache_data['git_history'])
                # Convert lists of dataclasses to dicts for pickle
                cache_data['imports'] = [asdict(i) for i in cache_data['imports']]
                cache_data['exports'] = [asdict(e) for e in cache_data['exports']]
                self.cache.set(rel_path, content_hash, cache_data)

            self.files[rel_path] = file_info
        except Exception as e:
            if self.verbose:
                log_warning(f"Error parsing {file_path}: {e}")

    def _read_file(self, path: Path) -> str:
        key = str(path)
        if key not in self._file_content_cache:
            self._file_content_cache[key] = path.read_text(encoding='utf-8', errors='ignore')
        return self._file_content_cache[key]

    def _create_file_info(self, rel_path: str, file_path: Path, content: str,
                          parsed: ParsedData, mtime: float, content_hash: str) -> FileInfo:
        # Simplified – would populate all fields from parsed data
        fi = FileInfo(
            path=rel_path,
            relative_path=rel_path,
            layer=LayerType.UNKNOWN,
            size=len(content),
            lines=len(content.split('\n')),
            hash=content_hash,
            mtime=mtime,
            imports=parsed.imports,
            exports=parsed.exports,
            hooks_used=parsed.hooks_used,
            contexts_used=parsed.contexts_used,
            has_interface=parsed.has_interface,
            has_type_export=parsed.has_type_export,
            hook_count=len(parsed.hooks_used),
            context_count=len(parsed.contexts_used),
            complexity_score=len(parsed.hooks_used)*2 + len(parsed.contexts_used)*3,
            is_functional_component=parsed.is_functional_component,
            is_custom_hook=parsed.is_custom_hook,
            is_context_provider=parsed.is_context_provider,
            has_create_context=parsed.has_create_context,
            structural_hash=parsed.structural_hash,
            cyclomatic_complexity=parsed.cyclomatic_complexity,
            any_count=parsed.any_count,
            days_since_modified=days_since(mtime),
            category=self._categorize_file(file_path, parsed),
            is_barrel_file=self._is_barrel_file(file_path, parsed),
            is_test_file=self._is_test_file(file_path),
            is_entry_point=self._is_entry_point(file_path),
            has_side_effects=self._has_side_effects(content),
            ast_features=parsed.ast_features,
            cfg_nodes=parsed.cfg_nodes,
            dfg_nodes=parsed.dfg_nodes,
            unreachable_code=parsed.unreachable_code if hasattr(parsed, 'unreachable_code') else [],
            uninitialized_vars=parsed.uninitialized_vars if hasattr(parsed, 'uninitialized_vars') else [],
            unused_vars=parsed.unused_vars if hasattr(parsed, 'unused_vars') else [],
        )
        fi.has_ai_hook = any(h in Config.AI_HOOKS for h in fi.hooks_used)
        fi.has_mcp = any(p in content for p in Config.MCP_PATTERNS)
        fi.has_voice = any(p in content for p in Config.VOICE_PATTERNS)
        if self.git_analyzer:
            fi.git_history = self.git_analyzer.get_file_history(rel_path)
        return fi

    def _classify_layer(self, file_path: Path, content: str, parsed: ParsedData) -> LayerType:
        if parsed.has_create_context:
            return LayerType.CONTEXTS
        if parsed.is_custom_hook:
            return LayerType.HOOKS
        if parsed.is_functional_component:
            if parsed.is_context_provider:
                return LayerType.CONTEXTS
            return LayerType.COMPONENTS
        name = file_path.stem
        if 'Service' in name or 'Manager' in name or 'Engine' in name:
            return LayerType.SERVICES
        if parsed.has_interface or parsed.has_type_export:
            return LayerType.TYPES
        return self._determine_layer_by_path(file_path)

    def _determine_layer_by_path(self, file_path: Path) -> LayerType:
        path = str(file_path).lower()
        if '/components/' in path or '\\components\\' in path:
            return LayerType.COMPONENTS
        elif '/hooks/' in path or '\\hooks\\' in path:
            return LayerType.HOOKS
        elif '/services/' in path or '\\services\\' in path:
            return LayerType.SERVICES
        elif '/contexts/' in path or '\\contexts\\' in path:
            return LayerType.CONTEXTS
        elif '/stores/' in path or '\\stores\\' in path:
            return LayerType.STORES
        elif '/features/' in path or '\\features\\' in path:
            return LayerType.FEATURES
        elif '/utils/' in path or '\\utils\\' in path:
            return LayerType.UTILS
        elif '/types/' in path or '\\types\\' in path:
            return LayerType.TYPES
        elif '/pages/' in path:
            return LayerType.PAGES
        elif '/api/' in path:
            return LayerType.API
        else:
            return LayerType.UNKNOWN

    def _categorize_file(self, file_path: Path, parsed: ParsedData) -> FileCategory:
        name = file_path.name.lower()
        if self._is_test_file(file_path):
            return FileCategory.TEST
        if any(x in name for x in ['config', 'setup', '.config.']):
            return FileCategory.CONFIGURATION
        if name in ['index.ts', 'index.tsx', 'main.ts', 'app.ts', 'app.tsx']:
            return FileCategory.ENTRY_POINT
        if name == 'index.ts' and len(parsed.exports) > 0:
            return FileCategory.BARREL
        if file_path.suffix == '.d.ts' or 'types' in name:
            return FileCategory.TYPE_DEFINITION
        if file_path.suffix in Config.ASSET_EXTENSIONS:
            return FileCategory.ASSET
        if file_path.suffix == '.py':
            return FileCategory.PYTHON_MODULE
        if any(h.startswith('use') for h in parsed.hooks_used):
            return FileCategory.CUSTOM_HOOK
        if parsed.has_jsx or parsed.is_functional_component or 'component' in name:
            return FileCategory.UI_COMPONENT
        if 'service' in name or 'api' in name:
            return FileCategory.SERVICE
        if 'util' in name or 'helper' in name:
            return FileCategory.UTILITY
        if len(parsed.exports) > 0 and not parsed.has_jsx:
            return FileCategory.CORE_LOGIC
        return FileCategory.UNKNOWN

    def _is_barrel_file(self, file_path: Path, parsed: ParsedData) -> bool:
        return file_path.name in ['index.ts', 'index.tsx'] and len(parsed.exports) > 0 and len(parsed.imports) > 0

    def _is_test_file(self, file_path: Path) -> bool:
        name = file_path.name.lower()
        return any(x in name for x in ['test', 'spec', '__tests__'])

    def _is_entry_point(self, file_path: Path) -> bool:
        name = file_path.name.lower()
        return name in ['index.ts', 'index.tsx', 'main.ts', 'main.tsx', 'app.ts', 'app.tsx']

    def _has_side_effects(self, content: str) -> bool:
        patterns = [r'console\.', r'window\.', r'document\.', r'localStorage\.', r'sessionStorage\.', r'fetch\(', r'XMLHttpRequest']
        return any(re.search(p, content) for p in patterns)

    def _find_valuable_unused(self, unused_paths: List[str]):
        for path in unused_paths:
            if path not in self.files:
                continue
            fi = self.files[path]
            try:
                content = self._read_file(self.project_path / path)
            except:
                continue
            score, reasons = ValueScorer.score_component(fi, content, use_git=self.use_git_in_scoring)
            fi.value_score = score
            if score > Config.VALUE_MIN_SCORE and score >= self.min_score:
                comp = ValuableComponent(
                    name=Path(path).stem,
                    path=path,
                    layer=fi.layer,
                    value_score=score,
                    reasons=reasons,
                    suggested_location=self._suggest_integration_location(fi),
                    integration_effort='low' if fi.layer == LayerType.HOOKS else 'medium',
                    integration_code=self._generate_integration_code(fi),
                    exports=[e.name for e in fi.exports],
                    hooks=fi.hooks_used,
                    patterns=[],
                    last_author=fi.git_last_author,
                    last_modified_date=fi.git_last_modified
                )
                if fi.has_ai_hook:
                    comp.patterns.append('AI Integration')
                if fi.has_mcp:
                    comp.patterns.append('MCP Protocol')
                if fi.has_voice:
                    comp.patterns.append('Voice Commands')
                self.result.valuable_unused.append(comp)

    def _suggest_integration_location(self, fi: FileInfo) -> str:
        if fi.layer == LayerType.HOOKS:
            return "Import in component that needs this functionality"
        elif fi.layer == LayerType.SERVICES:
            return "src/services/index.ts (add to barrel export)"
        elif fi.layer == LayerType.CONTEXTS:
            return "src/App.tsx or AppProvider (wrap in provider)"
        elif 'Modal' in fi.path:
            return "ModalManager or App.tsx"
        elif 'Panel' in fi.path:
            return "MainLayout or relevant feature"
        else:
            return "App.tsx or appropriate parent component"

    def _generate_integration_code(self, fi: FileInfo) -> str:
        name = Path(fi.path).stem
        imp_path = fi.path.replace('\\', '/').replace('.tsx', '').replace('.ts', '')
        if fi.layer == LayerType.HOOKS:
            return f"""// In your component:
import {{ {name} }} from '@/{imp_path}';
const {{ data, loading, error }} = {name}();"""
        elif fi.layer == LayerType.CONTEXTS:
            return f"""// In App.tsx:
import {{ {name}Provider }} from '@/{imp_path}';
<{name}Provider>
  {{children}}
</{name}Provider>"""
        elif fi.layer == LayerType.SERVICES:
            return f"""// In src/services/index.ts:
export {{ {name} }} from './{Path(fi.path).name}';
// Usage:
import {{ {name} }} from '@/services';
const result = await {name}.method();"""
        else:
            return f"""// Import and use:
import {{ {name} }} from '@/{imp_path}';
<{name} />"""

    def _detect_wiring_issues(self):
        detector = WiringIssueDetector(self.files, self.project_path, verbose=self.verbose)
        for path, fi in tqdm(self.files.items(), desc="Checking wiring"):
            try:
                content = self._read_file(self.project_path / path)
                issues = detector.detect_issues(path, content)
                self.result.wiring_issues.extend(issues)
            except Exception as e:
                if self.verbose:
                    log_warning(f"Error checking wiring for {path}: {e}")
        self.result.wiring_issues.extend(detector.post_process_ai_providers())

    def _select_archive_candidates(self) -> List[ArchiveDecision]:
        candidates = []
        for path, fi in self.files.items():
            if fi.duplicate_of:
                candidates.append(ArchiveDecision(
                    file_path=path,
                    should_archive=True,
                    confidence=95.0,
                    reasons=[f"Duplicate of {fi.duplicate_of}"],
                    blockers=[]
                ))
            elif fi.unwired_type == UnwiredType.DEAD_CODE:
                candidates.append(ArchiveDecision(
                    file_path=path,
                    should_archive=True,
                    confidence=80.0,
                    reasons=["Dead code, no dependents, no recent activity"],
                    blockers=[]
                ))
            elif (len(fi.dependents) == 0 and not fi.is_entry_point and
                  fi.value_score < Config.VALUE_MIN_SCORE and fi.lines < 200):
                candidates.append(ArchiveDecision(
                    file_path=path,
                    should_archive=True,
                    confidence=70.0,
                    reasons=["Unused, low value, small size"],
                    blockers=[]
                ))
        return candidates

    def _calculate_stats(self):
        self.result.total_files = len(self.files)
        tsx = sum(1 for f in self.files.values() if f.path.endswith(('.tsx','.jsx')))
        self.result.tsx_percentage = (tsx / self.result.total_files * 100) if self.result.total_files else 0
        self.result.total_lines = sum(f.lines for f in self.files.values())
        for fi in self.files.values():
            self.result.layer_stats[fi.layer.value] = self.result.layer_stats.get(fi.layer.value, 0) + 1

    def generate_report(self, html_only: bool = False):
        if self.dry_run:
            log_info("DRY RUN: skipping report generation")
            return
        log_info("Generating reports...")
        html_path = self.output_dir / 'analysis_report.html'
        HTMLReportGenerator.generate(self.result, html_path, with_git=True)
        json_path = self.output_dir / 'analysis_report.json'
        export_json_report(self.result, json_path)
        if self.csv_export:
            export_csv_reports(self.result, self.output_dir)
        if not html_only:
            self._print_summary()

    def _print_summary(self):
        log_header("ANALYSIS SUMMARY")
        print(f"{Colors.BOLD}Framework:{Colors.END} {self.result.framework.value}")
        print(f"{Colors.BOLD}Files:{Colors.END} {self.result.total_files}")
        if self.changed_only and self.skipped_files > 0:
            print(f"{Colors.BOLD}  (unchanged skipped:{Colors.END} {self.skipped_files})")
        print(f"{Colors.BOLD}TSX Percentage:{Colors.END} {self.result.tsx_percentage:.1f}%")
        print(f"{Colors.BOLD}Total Lines:{Colors.END} {self.result.total_lines:,}")
        print(f"{Colors.BOLD}Valuable Unused:{Colors.END} {len(self.result.valuable_unused)}")
        print(f"{Colors.BOLD}Wiring Issues:{Colors.END} {len(self.result.wiring_issues)}")
        if self.enable_duplicates:
            print(f"{Colors.BOLD}Duplicate Clusters:{Colors.END} {len(self.result.duplicate_clusters)}")
        if self.result.unwired_features:
            print(f"{Colors.BOLD}Unwired Features:{Colors.END} {len(self.result.unwired_features)}")
        if self.unused_scan:
            print(f"{Colors.BOLD}Potentially Unused Files (confidence ≥ {self.unused_threshold}%):{Colors.END} {len(self.result.potentially_unused_files)}")
        print(f"\n{Colors.BOLD}{Colors.CYAN}📊 HTML report:{Colors.END} {self.output_dir / 'analysis_report.html'}")

    def _analyze_potentially_unused(self):
        collector = UnusedSignalCollector(self.files, self.result.dependency_graph, self.git_analyzer, self.fast_unused_scan)
        model = UnusedConfidenceModel()
        simulator = UnusedDeletionSimulator(self.files, self.result.dependency_graph)
        unused_details = []
        classification_counts = defaultdict(int)
        total_confidence = 0.0

        paths = list(self.files.keys())
        if self.parallel:
            with ThreadPoolExecutor(max_workers=Config.MAX_WORKERS_IO) as ex:
                futures = {ex.submit(self._evaluate_unused, path, collector, model, simulator): path for path in paths}
                for f in tqdm(as_completed(futures), total=len(paths), desc="Evaluating unused"):
                    try:
                        detail = f.result()
                        if detail and detail.confidence >= self.unused_threshold:
                            unused_details.append(detail)
                            classification_counts[detail.classification.value] += 1
                            total_confidence += detail.confidence
                    except Exception as e:
                        if self.verbose:
                            log_warning(f"Unused evaluation error: {e}")
        else:
            for path in tqdm(paths, desc="Evaluating unused"):
                detail = self._evaluate_unused(path, collector, model, simulator)
                if detail and detail.confidence >= self.unused_threshold:
                    unused_details.append(detail)
                    classification_counts[detail.classification.value] += 1
                    total_confidence += detail.confidence

        self.result.potentially_unused_files = unused_details
        self.result.unused_classification_counts = dict(classification_counts)
        if unused_details:
            self.result.unused_confidence_summary = {
                'average': total_confidence / len(unused_details),
                'min': min(d.confidence for d in unused_details),
                'max': max(d.confidence for d in unused_details)
            }
        else:
            self.result.unused_confidence_summary = {'average': 0, 'min': 0, 'max': 0}

    def _evaluate_unused(self, path: str, collector: UnusedSignalCollector,
                         model: UnusedConfidenceModel,
                         simulator: UnusedDeletionSimulator) -> Optional[UnusedFileDetail]:
        fi = self.files.get(path)
        if not fi:
            return None
        signals = collector.collect(path)
        confidence = model.compute(signals)
        if confidence < self.unused_threshold:
            return None

        classification, action, merge_target = UnusedClassifier.classify(path, fi, signals, confidence)

        if action == RecommendedAction.MERGE_WITH:
            best_sim = 0.0
            best_target = None
            active_files = collector.active_files
            for active in list(active_files)[:100]:
                if active == path:
                    continue
                fi_active = self.files.get(active)
                if not fi_active:
                    continue
                a_exports = {e.name for e in fi.exports}
                a_imports = {i.source for i in fi.imports}
                b_exports = {e.name for e in fi_active.exports}
                b_imports = {i.source for i in fi_active.imports}
                sim = jaccard_similarity(a_exports | a_imports, b_exports | b_imports)
                if sim > best_sim and sim > Config.STRUCTURAL_SIMILARITY_THRESHOLD:
                    best_sim = sim
                    best_target = active
            if best_target:
                merge_target = best_target
            else:
                action = RecommendedAction.REVIEW

        safe, blockers = simulator.is_safe_to_delete(path) if not self.dry_run_unused else (False, ["dry run"])

        reasons = []
        weights = Config.UNUSED_SIGNAL_WEIGHTS
        for sig, val in signals.items():
            if val and weights.get(sig, 0) > 0:
                reasons.append(sig.replace('_', ' ').title())

        detail = UnusedFileDetail(
            path=path,
            confidence=confidence,
            classification=classification,
            recommended_action=action,
            merge_target=merge_target,
            signals=signals,
            reasons=reasons[:5],
            estimated_savings_lines=fi.lines,
            estimated_complexity_reduction=fi.cyclomatic_complexity,
            deletion_safe=safe,
            blockers=blockers
        )
        return detail


# =============================================================================
# CLI
# =============================================================================
def parse_args():
    parser = argparse.ArgumentParser(
        description=f"G-Studio Enterprise Code Intelligence v{Config.VERSION}",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic analysis (current directory)
  %(prog)s .

  # Full analysis with unused detection
  %(prog)s . --enable-python --enable-duplicates --enable-recommendations --git-history --archive --csv --unused-scan

  # Dry run archive
  %(prog)s . --archive --dry-run

  # Advanced unused scan with custom threshold
  %(prog)s . --unused-scan --unused-threshold 80 --fast-unused-scan
"""
    )
    parser.add_argument('project_path', nargs='?', default='.', help='Project directory (default: current)')
    parser.add_argument('--output-dir', default='./gstudio-reports', help='Output directory')
    parser.add_argument('--no-cache', action='store_true', help='Disable SQLite cache')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose logging')
    parser.add_argument('--html-only', action='store_true', help='Only generate HTML')
    parser.add_argument('--dry-run', action='store_true', help='Simulate only (no file writes)')
    parser.add_argument('--no-parallel', action='store_true', help='Disable parallel parsing')
    parser.add_argument('--since-last-commit', '-c', action='store_true', help='Only changed files since last commit')
    parser.add_argument('--csv', action='store_true', help='Export CSV files')
    parser.add_argument('--min-score', type=int, default=0, help='Minimum value score for valuable components')
    parser.add_argument('--enable-python', action='store_true', default=False, help='Include Python files')
    parser.add_argument('--enable-duplicates', action='store_true', default=False, help='Detect duplicate clusters')
    parser.add_argument('--enable-recommendations', action='store_true', default=False, help='Generate recommendations')
    parser.add_argument('--archive', action='store_true', default=False, help='Archive candidates')
    parser.add_argument('--archive-reason', default='', help='Reason for archive')
    parser.add_argument('--git-history', action='store_true', default=False, help='Fetch full git history')
    parser.add_argument('--use-git-in-scoring', action='store_true', default=False, help='Use git signals in value scoring')
    parser.add_argument('--detect-barrels', action='store_true', default=False, help='Mark barrel exports')
    parser.add_argument('--detect-dynamic', action='store_true', default=False, help='Detect dynamic imports')
    parser.add_argument('--unused-scan', action='store_true', default=False, help='Run advanced unused file intelligence')
    parser.add_argument('--fast-unused-scan', action='store_true', default=False, help='Skip expensive signals (git, structural)')
    parser.add_argument('--dry-run-unused', action='store_true', default=False, help='Do not simulate deletion, just report')
    parser.add_argument('--unused-threshold', type=int, default=Config.UNUSED_CONFIDENCE_THRESHOLD,
                        help=f'Confidence threshold for unused flagging (default: {Config.UNUSED_CONFIDENCE_THRESHOLD})')
    return parser.parse_args()

def main():
    args = parse_args()
    project_path = Path(args.project_path).resolve()
    if not project_path.exists():
        log_error(f"Project path does not exist: {project_path}")
        sys.exit(1)

    output_dir = Path(args.output_dir).resolve()

    analyzer = GStudioAnalyzer(
        project_path=project_path,
        output_dir=output_dir,
        use_cache=not args.no_cache,
        verbose=args.verbose,
        dry_run=args.dry_run,
        parallel=not args.no_parallel,
        changed_only=args.since_last_commit,
        csv_export=args.csv,
        min_score=args.min_score,
        enable_python=args.enable_python,
        enable_duplicates=args.enable_duplicates,
        enable_recommendations=args.enable_recommendations,
        archive=args.archive,
        archive_reason=args.archive_reason,
        git_history=args.git_history,
        use_git_in_scoring=args.use_git_in_scoring,
        detect_barrels=args.detect_barrels,
        detect_dynamic=args.detect_dynamic,
        unused_scan=args.unused_scan,
        fast_unused_scan=args.fast_unused_scan,
        dry_run_unused=args.dry_run_unused,
        unused_threshold=args.unused_threshold,
    )

    try:
        result = analyzer.analyze()
        analyzer.generate_report(html_only=args.html_only)
        log_success("Analysis complete!")
    except KeyboardInterrupt:
        log_warning("\nInterrupted by user")
        sys.exit(1)
    except Exception as e:
        log_error(f"Analysis failed: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()
