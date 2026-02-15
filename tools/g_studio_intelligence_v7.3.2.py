#!/usr/bin/env python3
"""
G-Studio Enterprise Code Intelligence Platform v7.3.2
======================================================
Unified merger of G-Studio Intelligent Code Analyzer v6.2.1-beta and
Enterprise Code Intelligence Platform v5.0.

Preserves 100% of v7 behaviour when no enterprise flags are given.
Adds optional production‑ready features:
  • Python language support (tree‑sitter or regex fallback)
  • Structural duplicate detection (exact & near‑duplicate, Jaccard)
  • Safe archive system (zip + metadata, dry‑run)
  • Enhanced Git intelligence (commit count, authors, recency)
  • Unwired component classification (orphaned, dead, new)
  • Wiring suggestions via export/import similarity
  • Recommendation engine (merge/archive/wire/refactor)
  • Extended HTML dashboard + CSV/JSON exports

All new features are disabled by default – activate with dedicated flags.

CHANGES IN v7.3.2:
-------------------
• Enhanced JSON encoder now catches ANY non‑serializable object and converts it
  to a string (with a warning). This permanently fixes the "LayerType not JSON
  serializable" cache error and similar issues.
• All json.dump calls now use the unified safe encoder.
• Version string updated.

Author: G-Studio Team / Code Intelligence Team
Version: 7.3.2
"""

# =============================================================================
# IMPORTS – Standard library + optional dependencies with graceful fallback
# =============================================================================
import os
import sys
import json
import hashlib
import shutil
import zipfile
import argparse
import time
import subprocess
import re
import csv
import mimetypes
import platform
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict, Counter
from typing import Dict, List, Set, Tuple, Optional, Any, Union, Callable
from dataclasses import dataclass, field, asdict
from enum import Enum
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
from difflib import SequenceMatcher

# Optional: tqdm for progress bars
try:
    from tqdm import tqdm
    TQDM_AVAILABLE = True
except ImportError:
    TQDM_AVAILABLE = False
    def tqdm(iterable, desc=None, total=None):
        if desc:
            print(f"{desc}...")
        return iterable

# Optional: tree-sitter for TypeScript/JavaScript/TSX
try:
    from tree_sitter import Language, Parser, Node
    import tree_sitter_typescript
    TREE_SITTER_AVAILABLE = True
except ImportError:
    TREE_SITTER_AVAILABLE = False

# Optional: tree-sitter-python for Python support
try:
    import tree_sitter_python
    PYTHON_TREE_SITTER_AVAILABLE = True
except ImportError:
    PYTHON_TREE_SITTER_AVAILABLE = False

# Optional: colorama for Windows colour support
try:
    import colorama
    colorama.init()
    COLORS_AVAILABLE = True
except ImportError:
    COLORS_AVAILABLE = False


# =============================================================================
# TERMINAL COLORS & LOGGING (v7 style, extended)
# =============================================================================
class Colors:
    """Terminal colour codes – preserved from v7."""
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
# CONFIGURATION – Merged from v7 and v6
# =============================================================================
class Config:
    """Global configuration constants – unified."""
    # ---------- v7 original ----------
    VALID_EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx'}
    IGNORE_DIRS = {
        'node_modules', 'dist', 'build', '__tests__', '__test__',
        'coverage', '.git', '.vscode', 'test', 'tests', '.cache'
    }
    IGNORE_FILES = {'.test.', '.spec.', '.d.ts', '.min.js', '.min.ts'}
    CACHE_FILE = '.gstudio_cache.json'
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
    REACT_HOOKS = [
        'useState', 'useEffect', 'useContext', 'useReducer',
        'useCallback', 'useMemo', 'useRef', 'useLayoutEffect'
    ]
    SCORE_WEIGHTS = {
        'ai_hook': 30,
        'mcp': 25,
        'voice': 20,
        'complexity': 15,
        'types': 10,
        'name_quality': 10,
        'size_bonus': 5,
        # New optional git weights – only used when --use-git-in-scoring
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
    MAX_WORKERS = max(1, os.cpu_count() or 1)
    ALLOW_RAW_CONTEXTS = ['LegacyAppContext']

    # ---------- v6 enterprise additions ----------
    # File categories & supported extensions
    PY_EXTENSIONS = {'.py'}
    SUPPORTED_EXTENSIONS = VALID_EXTENSIONS | PY_EXTENSIONS
    EXCLUDED_EXTENSIONS = {'.md', '.markdown'}
    ASSET_EXTENSIONS = {
        '.css', '.scss', '.sass', '.less', '.json', '.svg',
        '.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff',
        '.woff2', '.ttf', '.eot'
    }

    # Default ignore patterns (merged with IGNORE_DIRS)
    DEFAULT_IGNORE_PATTERNS = [
        'node_modules', 'dist', 'build', '.git', '.next', 'coverage',
        '__pycache__', '.pytest_cache', '.vscode', '.idea',
        '*.min.js', '*.bundle.js', '*.chunk.js', 'venv', 'env'
    ]

    # Analysis thresholds
    STRUCTURAL_SIMILARITY_THRESHOLD = 0.85
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

    # Performance
    MAX_WORKERS_IO = min(8, (os.cpu_count() or 1))
    MAX_WORKERS_CPU = min(4, (os.cpu_count() or 1))
    CHUNK_SIZE = 100

    # Archive subdirectories
    ARCHIVES_SUBDIR = 'archives'
    HISTORY_SUBDIR = 'history'

# Merge ignore sets
Config.IGNORE_DIRS.update(Config.DEFAULT_IGNORE_PATTERNS)


# =============================================================================
# ENUMS – Unified from both versions
# =============================================================================
class LayerType(Enum):
    """Architectural layer types – v7."""
    COMPONENTS = "components"
    HOOKS = "hooks"
    SERVICES = "services"
    CONTEXTS = "contexts"
    STORES = "stores"
    FEATURES = "features"
    UTILS = "utils"
    TYPES = "types"
    UNKNOWN = "unknown"

class Severity(Enum):
    """Issue severity levels – v7."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class PatternType(Enum):
    """Detected pattern types – v7."""
    AI_PROVIDER = "ai_provider"
    MCP_INTEGRATION = "mcp_integration"
    VOICE_COMMAND = "voice_command"
    MULTI_AGENT = "multi_agent"
    CONTEXT_PATTERN = "context_pattern"
    HOOK_PATTERN = "hook_pattern"
    CIRCULAR_DEPENDENCY = "circular_dependency"

# ---------- v6 Enums ----------
class FileCategory(Enum):
    """File category classification – v6."""
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
    """Risk level classification – v6."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class Recommendation(Enum):
    """Action recommendations – v6."""
    KEEP = "KEEP"
    REFACTOR = "REFACTOR"
    ARCHIVE = "ARCHIVE"
    DELETE = "DELETE"
    REVIEW = "REVIEW"
    MERGE = "MERGE"
    WIRE = "WIRE"

class IssueType(Enum):
    """Code issue types – v6."""
    HIGH_COMPLEXITY = "High Complexity"
    TYPE_SAFETY = "Type Safety"
    UNUSED_EXPORTS = "Unused Exports"
    LARGE_FILE = "Large File"
    DUPLICATE = "Duplicate"
    CIRCULAR_DEPENDENCY = "Circular Dependency"
    MISSING_TESTS = "Missing Tests"
    UNWIRED = "Unwired Component"

class UnwiredType(Enum):
    """Unwired component classification – v6."""
    ORPHANED_USEFUL = "orphaned_useful"
    DEAD_CODE = "dead_code"
    NEW_FEATURE = "new_feature"
    UNKNOWN = "unknown"


# =============================================================================
# DATA CLASSES – Merged from v7 and v6
# =============================================================================
@dataclass
class GitHistoryInfo:
    """Git history information for a file – v6."""
    has_history: bool
    commit_count: int
    first_commit_date: Optional[str] = None
    last_commit_date: Optional[str] = None
    authors: List[str] = field(default_factory=list)

@dataclass
class CodeIssue:
    """Code quality issue – v6."""
    type: IssueType
    severity: RiskLevel
    message: str
    line: Optional[int] = None
    suggestion: Optional[str] = None

@dataclass
class WiringSuggestion:
    """Wiring suggestion for unwired component – v6."""
    target_file: str
    similarity_score: float
    reason: str
    integration_point: str
    common_exports: List[str] = field(default_factory=list)
    common_imports: List[str] = field(default_factory=list)

@dataclass
class DuplicateCluster:
    """Group of duplicate/similar files – v6."""
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
    """Archive recommendation – v6."""
    file_path: str
    should_archive: bool
    confidence: float
    reasons: List[str]
    blockers: List[str]

@dataclass
class FileInfo:
    """Complete file analysis metadata – extended from v7 with v6 fields."""
    # ---------- v7 core ----------
    path: str
    relative_path: str
    layer: LayerType
    size: int
    lines: int
    hash: str
    mtime: float
    imports: List[str] = field(default_factory=list)
    exports: List[str] = field(default_factory=list)
    hooks_used: List[str] = field(default_factory=list)
    contexts_used: List[str] = field(default_factory=list)
    import_details: List[Dict] = field(default_factory=list)
    export_details: List[Dict] = field(default_factory=list)
    is_functional_component: bool = False
    is_custom_hook: bool = False
    is_context_provider: bool = False
    has_create_context: bool = False
    has_ai_hook: bool = False
    has_mcp: bool = False
    has_voice: bool = False
    has_interface: bool = False
    has_type_export: bool = False
    hook_count: int = 0
    context_count: int = 0
    complexity_score: int = 0
    depends_on: List[str] = field(default_factory=list)
    dependents: List[str] = field(default_factory=list)
    is_entry_point: bool = False
    git_last_author: str = ""
    git_last_modified: str = ""

    # ---------- v6 enterprise extensions (all with defaults) ----------
    # Content & structural
    structural_hash: str = ""
    cyclomatic_complexity: int = 0
    cognitive_complexity: int = 0
    any_count: int = 0
    comment_ratio: float = 0.0

    # Categorization
    category: FileCategory = FileCategory.UNKNOWN
    is_barrel_file: bool = False
    is_barrel_exported: bool = False
    is_dynamic_imported: bool = False
    is_test_file: bool = False
    has_side_effects: bool = False

    # Git (enhanced)
    git_history: Optional[GitHistoryInfo] = None
    days_since_modified: int = 0

    # Duplicates
    duplicate_of: Optional[str] = None
    structural_duplicates: List[str] = field(default_factory=list)

    # Unwired & wiring
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

    # ---------- v7.2.2 addition ----------
    value_score: float = 0.0  # Value score for unused components

@dataclass
class ValuableComponent:
    """Unused but valuable component – v7."""
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
    """Wiring/import issue – v7."""
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
    """Architectural pattern insight – v7."""
    pattern: PatternType
    health_score: float
    files_involved: int
    strengths: List[str] = field(default_factory=list)
    weaknesses: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    affected_files: List[str] = field(default_factory=list)

@dataclass
class AnalysisResult:
    """Complete analysis results – extended from v7."""
    # ---------- v7 core ----------
    total_files: int
    tsx_percentage: float
    total_lines: int
    valuable_unused: List[ValuableComponent] = field(default_factory=list)
    wiring_issues: List[WiringIssue] = field(default_factory=list)
    insights: List[ArchitecturalInsight] = field(default_factory=list)
    dependency_graph: Dict[str, List[str]] = field(default_factory=dict)
    layer_stats: Dict[str, int] = field(default_factory=dict)

    # ---------- v6 enterprise extensions ----------
    files: Dict[str, FileInfo] = field(default_factory=dict)
    duplicate_clusters: List[DuplicateCluster] = field(default_factory=list)
    archive_candidates: List[ArchiveDecision] = field(default_factory=list)
    unused_files: List[str] = field(default_factory=list)
    unwired_features: List[str] = field(default_factory=list)
    high_risk_files: List[str] = field(default_factory=list)
    analysis_duration_seconds: float = 0.0
    cache_hit_rate: float = 0.0
    git_available: bool = False


# =============================================================================
# UTILITY FUNCTIONS (from v6)
# =============================================================================
def compute_hash(content: str) -> str:
    """SHA256 hash of content."""
    return hashlib.sha256(content.encode('utf-8')).hexdigest()

def normalize_path(path: Union[str, Path], base: Path) -> str:
    """Return path relative to base, as string with forward slashes."""
    p = Path(path).resolve()
    try:
        return str(p.relative_to(base)).replace('\\', '/')
    except ValueError:
        return str(p).replace('\\', '/')

def should_ignore(path: Path, ignore_patterns: List[str]) -> bool:
    """Check if path matches any ignore pattern."""
    path_str = str(path)
    for pattern in ignore_patterns:
        if pattern in path_str:
            return True
        if path.match(pattern):
            return True
    return False

def jaccard_similarity(set1: Set, set2: Set) -> float:
    """Jaccard similarity between two sets."""
    if not set1 and not set2:
        return 1.0
    if not set1 or not set2:
        return 0.0
    intersection = len(set1 & set2)
    union = len(set1 | set2)
    return intersection / union if union > 0 else 0.0

def sequence_similarity(seq1: List, seq2: List) -> float:
    """Sequence similarity using difflib."""
    return SequenceMatcher(None, seq1, seq2).ratio()

def days_since(timestamp: float) -> int:
    """Days since given timestamp."""
    return int((time.time() - timestamp) / 86400)


# =============================================================================
# CACHE MANAGER (v7 enhanced + robust JSON encoder for any type)
# =============================================================================
class CacheManager:
    """File-based cache with version awareness and robust serialisation."""

    class _JSONEncoder(json.JSONEncoder):
        """Handles Enums, Path, datetime, and any other non‑serializable object by converting to string."""
        def default(self, obj):
            if isinstance(obj, Enum):
                return obj.value
            if isinstance(obj, Path):
                return str(obj)
            if isinstance(obj, datetime):
                return obj.isoformat()
            # For any other unexpected type, convert to string and warn
            try:
                # Try to see if it's a dataclass with asdict
                if hasattr(obj, '__dataclass_fields__'):
                    return asdict(obj)
            except Exception:
                pass
            log_warning(f"JSON encoder: converting unexpected type {type(obj).__name__} to string")
            return str(obj)

    def __init__(self, cache_path: Path, use_cache: bool = True, version: str = "7.3.2"):
        self.cache_path = cache_path
        self.use_cache = use_cache
        self.version = version
        self.cache: Dict[str, Any] = {}
        self.hits = 0
        self.misses = 0
        self._load()

    def _load(self):
        if self.use_cache and self.cache_path.exists():
            try:
                with open(self.cache_path, 'r') as f:
                    data = json.load(f)
                    if data.get('version') == self.version:
                        self.cache = data.get('files', {})
                        log_info(f"Loaded cache with {len(self.cache)} entries")
            except Exception as e:
                log_warning(f"Could not load cache: {e}")

    def get(self, file_path: str, mtime: float, content_hash: str) -> Optional[Dict]:
        if not self.use_cache:
            return None
        key = str(file_path)
        if key in self.cache:
            cached = self.cache[key]
            if cached.get('mtime') == mtime and cached.get('hash') == content_hash:
                self.hits += 1
                return cached
        self.misses += 1
        return None

    def set(self, file_path: str, data: Dict):
        if self.use_cache:
            self.cache[str(file_path)] = data

    def save(self):
        if not self.use_cache:
            return
        try:
            with open(self.cache_path, 'w', encoding='utf-8') as f:
                json.dump({
                    'version': self.version,
                    'files': self.cache
                }, f, indent=2, cls=self._JSONEncoder)
            log_success(f"Saved cache to {self.cache_path}")
        except Exception as e:
            log_warning(f"Could not save cache: {e}")

    def hit_rate(self) -> float:
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0.0


# =============================================================================
# GIT ANALYZER (enhanced from v6)
# =============================================================================
class GitAnalyzer:
    """Advanced Git history analysis."""

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
        """Fetch full commit history for a file."""
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
        except Exception as e:
            return GitHistoryInfo(has_history=False, commit_count=0)

    def get_recent_changes(self, days: int = 7) -> Set[str]:
        """Files changed in last N days."""
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

# Simple GitHelper for backward compatibility (v7 --since-last-commit)
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
# PARSERS – Unified Tree‑Sitter + Regex, with Python support
# =============================================================================
class ParsedData:
    """Container for parsed file information."""
    def __init__(self):
        self.imports: List[str] = []
        self.exports: List[str] = []
        self.hooks_used: List[str] = []
        self.contexts_used: List[str] = []
        self.import_details: List[Dict] = []
        self.export_details: List[Dict] = []
        self.is_functional_component: bool = False
        self.is_custom_hook: bool = False
        self.is_context_provider: bool = False
        self.has_create_context: bool = False
        self.has_interface: bool = False
        self.has_type_export: bool = False
        # v6 extensions
        self.structural_hash: str = ""
        self.cyclomatic_complexity: int = 0
        self.any_count: int = 0
        self.has_jsx: bool = False
        self.functions: List[str] = []
        self.classes: List[str] = []
        self.comment_ratio: float = 0.0

class UnifiedParser:
    """Unified parser using tree‑sitter with graceful fallback to regex."""

    def __init__(self, enable_python: bool = False, compute_structural_hash: bool = False, verbose: bool = False):
        self.enable_python = enable_python
        self.compute_structural_hash = compute_structural_hash
        self.verbose = verbose
        self.ts_parser = None
        self.tsx_parser = None
        self.py_parser = None
        self.regex_parser = RegexParser()  # always available
        self._init_tree_sitter()

    def _init_tree_sitter(self):
        if not TREE_SITTER_AVAILABLE:
            return
        try:
            # TypeScript / TSX
            self.ts_lang = Language(tree_sitter_typescript.language_typescript())
            self.tsx_lang = Language(tree_sitter_typescript.language_tsx())
            # New API (0.20+)
            try:
                self.ts_parser = Parser()
                self.ts_parser.set_language(self.ts_lang)
                self.tsx_parser = Parser()
                self.tsx_parser.set_language(self.tsx_lang)
            except AttributeError:
                # Old API (<0.20)
                self.ts_parser = Parser()
                self.ts_parser.language = self.ts_lang
                self.tsx_parser = Parser()
                self.tsx_parser.language = self.tsx_lang
            # Python (optional)
            if self.enable_python and PYTHON_TREE_SITTER_AVAILABLE:
                try:
                    self.py_lang = Language(tree_sitter_python.language_python())
                    self.py_parser = Parser()
                    try:
                        self.py_parser.set_language(self.py_lang)
                    except AttributeError:
                        self.py_parser.language = self.py_lang
                except Exception as e:
                    if self.verbose:
                        log_warning(f"Python tree‑sitter init failed: {e}")
            log_info("Tree-sitter initialized successfully")
        except Exception as e:
            if self.verbose:
                log_warning(f"Tree-sitter init failed: {e}")

    def parse(self, file_path: Path, content: str) -> ParsedData:
        ext = file_path.suffix
        result = ParsedData()

        # Try tree‑sitter first
        if ext in {'.tsx', '.jsx'} and self.tsx_parser:
            ast = self._parse_with_parser(content, self.tsx_parser)
            if ast:
                self._extract_ts_info(ast, content, result, is_tsx=True)
                return result
        elif ext in {'.ts', '.js'} and self.ts_parser:
            ast = self._parse_with_parser(content, self.ts_parser)
            if ast:
                self._extract_ts_info(ast, content, result, is_tsx=False)
                return result
        elif ext == '.py' and self.enable_python:
            if self.py_parser:
                ast = self._parse_with_parser(content, self.py_parser)
                if ast:
                    self._extract_python_info(ast, content, result)
                    return result
            else:
                # Fallback to Python regex parser
                self.regex_parser.parse_python(content, result)
                return result

        # Fallback to universal regex
        self.regex_parser.parse(content, ext, result)
        return result

    def _parse_with_parser(self, content: str, parser: Any):
        try:
            tree = parser.parse(bytes(content, 'utf-8'))
            return tree.root_node
        except Exception as e:
            if self.verbose:
                log_warning(f"Tree-sitter parse failed: {e}")
            return None

    # ---------- TypeScript / TSX extraction ----------
    def _extract_ts_info(self, node: Node, content: str, result: ParsedData, is_tsx: bool):
        # Full AST traversal (v7 logic)
        def walk(n: Node):
            # ----- IMPORT statements -----
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
                    result.imports.append(source)

                    imported_names = []
                    if import_clause:
                        for spec in import_clause.children:
                            if spec.type == 'identifier':
                                imported_names.append({
                                    'name': content[spec.start_byte:spec.end_byte],
                                    'alias': None,
                                    'type_only': False,
                                    'original_name': content[spec.start_byte:spec.end_byte],
                                    'is_alias': False
                                })
                            elif spec.type == 'namespace_import':
                                for ns in spec.children:
                                    if ns.type == 'identifier':
                                        imported_names.append({
                                            'name': '*',
                                            'alias': content[ns.start_byte:ns.end_byte],
                                            'type_only': False,
                                            'original_name': '*',
                                            'is_alias': True
                                        })
                            elif spec.type == 'named_imports':
                                for n2 in spec.children:
                                    if n2.type == 'import_specifier':
                                        name_node = n2.child_by_field_name('name')
                                        alias_node = n2.child_by_field_name('alias')
                                        name = content[name_node.start_byte:name_node.end_byte] if name_node else None
                                        alias = content[alias_node.start_byte:alias_node.end_byte] if alias_node else None
                                        # Rough type detection
                                        node_text = content[n2.start_byte:n2.end_byte]
                                        is_type = 'type' in node_text and name_node and 'type' in content[name_node.start_byte-6:name_node.start_byte]
                                        imported_names.append({
                                            'name': name,
                                            'alias': alias,
                                            'type_only': is_type,
                                            'original_name': name,
                                            'is_alias': alias is not None
                                        })
                    result.import_details.append({
                        'source': source,
                        'imported': imported_names
                    })

            # ----- EXPORT statements -----
            elif n.type == 'export_statement':
                node_text = content[n.start_byte:n.end_byte]
                # Default export
                if 'default' in node_text:
                    result.exports.append('default')
                    result.export_details.append({
                        'kind': 'default',
                        'source': None,
                        'names': [{'name': 'default', 'alias': None}],
                        'is_reexport': False,
                        'source_if_reexport': None
                    })
                # Re‑export
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
                    result.imports.append(source)
                    names = []
                    if export_clause:
                        for spec in export_clause.children:
                            if spec.type == 'export_specifier':
                                name_node = spec.child_by_field_name('name')
                                alias_node = spec.child_by_field_name('alias')
                                name = content[name_node.start_byte:name_node.end_byte] if name_node else None
                                alias = content[alias_node.start_byte:alias_node.end_byte] if alias_node else None
                                names.append({'name': name, 'alias': alias})
                    result.export_details.append({
                        'kind': 're-export',
                        'source': source,
                        'names': names,
                        'is_reexport': True,
                        'source_if_reexport': source
                    })
                    for n2 in names:
                        result.exports.append(n2['alias'] or n2['name'])
                else:
                    # local export
                    names = []
                    for child in n.children:
                        if child.type == 'export_clause':
                            for spec in child.children:
                                if spec.type == 'export_specifier':
                                    name_node = spec.child_by_field_name('name')
                                    alias_node = spec.child_by_field_name('alias')
                                    name = content[name_node.start_byte:name_node.end_byte] if name_node else None
                                    alias = content[alias_node.start_byte:alias_node.end_byte] if alias_node else None
                                    names.append({'name': name, 'alias': alias})
                                    result.exports.append(alias or name)
                        elif child.type in {'function_declaration', 'class_declaration', 'lexical_declaration'}:
                            ident = self._find_identifier_text(child, content)
                            if ident:
                                names.append({'name': ident, 'alias': None})
                                result.exports.append(ident)
                    if names:
                        result.export_details.append({
                            'kind': 'named',
                            'source': None,
                            'names': names,
                            'is_reexport': False,
                            'source_if_reexport': None
                        })

            # ----- React component detection -----
            if n.type in {'function_declaration', 'arrow_function'}:
                if self._has_jsx(n):
                    result.is_functional_component = True
                    name = self._find_identifier_text(n, content)
                    if name and name.startswith('use'):
                        result.is_custom_hook = True

            # ----- createContext detection -----
            if n.type == 'call_expression':
                func = n.child_by_field_name('function')
                if func and func.type == 'identifier':
                    name = content[func.start_byte:func.end_byte]
                    if name == 'createContext':
                        result.has_create_context = True

            # ----- Custom hook definition -----
            if n.type == 'function_declaration':
                name_node = self._find_identifier_node(n)
                if name_node:
                    name = content[name_node.start_byte:name_node.end_byte]
                    if name.startswith('use'):
                        result.is_custom_hook = True

            # ----- Hooks usage -----
            if n.type == 'call_expression':
                func = n.child_by_field_name('function')
                if func and func.type == 'identifier':
                    name = content[func.start_byte:func.end_byte]
                    if name.startswith('use'):
                        result.hooks_used.append(name)

            # ----- Interfaces and types -----
            elif n.type == 'interface_declaration':
                result.has_interface = True
            elif n.type == 'type_alias_declaration':
                parent = n.parent
                if parent and parent.type == 'export_statement':
                    result.has_type_export = True

            for child in n.children:
                walk(child)

        walk(node)

        # Deduplicate
        result.imports = list(set(result.imports))
        result.exports = list(set(result.exports))
        result.hooks_used = list(set(result.hooks_used))

        # Contexts used (regex quick)
        ctx_pattern = r'useContext\((\w+)\)'
        result.contexts_used = list(set(re.findall(ctx_pattern, content)))

        # Context provider detection
        if result.has_create_context and '.Provider' in content:
            result.is_context_provider = True

        # JSX flag
        result.has_jsx = self._has_jsx(node)

        # Complexity & structural hash (if requested)
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

    # ---------- Python extraction ----------
    def _extract_python_info(self, node: Node, content: str, result: ParsedData):
        def walk(n: Node):
            if n.type in {'import_statement', 'import_from_statement'}:
                module_node = n.child_by_field_name('module')
                if module_node:
                    result.imports.append(content[module_node.start_byte:module_node.end_byte])
            elif n.type == 'function_definition':
                name_node = n.child_by_field_name('name')
                if name_node:
                    name = content[name_node.start_byte:name_node.end_byte]
                    result.functions.append(name)
                    result.exports.append(name)
            elif n.type == 'class_definition':
                name_node = n.child_by_field_name('name')
                if name_node:
                    name = content[name_node.start_byte:name_node.end_byte]
                    result.classes.append(name)
                    result.exports.append(name)
            for child in n.children:
                walk(child)
        walk(node)
        # Structural hash (if requested)
        if self.compute_structural_hash:
            # For Python, simple content hash as fallback
            result.structural_hash = compute_hash(content)

class RegexParser:
    """Universal regex fallback parser."""

    # TypeScript/JavaScript patterns
    IMPORT_PATTERN = re.compile(r'import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?["\']([^"\']+)["\']', re.M)
    EXPORT_PATTERN = re.compile(r'export\s+(?:default\s+)?(?:const|let|var|function|class|interface|type|enum)\s+(\w+)', re.M)
    HOOK_PATTERN = re.compile(r'\b(use[A-Z]\w*)\s*\(', re.M)
    JSX_PATTERN = re.compile(r'<[A-Z]\w*(?:\s+[^>]*)?>|<>[^<]*<\/>', re.M)
    ANY_PATTERN = re.compile(r':\s*any\b', re.M)

    # Python patterns
    PY_IMPORT_PATTERN = re.compile(r'(?:from\s+(\S+)\s+import|import\s+(\S+))', re.M)
    PY_DEF_PATTERN = re.compile(r'(?:def|class)\s+(\w+)', re.M)

    def parse(self, content: str, ext: str, result: ParsedData):
        if ext == '.py':
            self.parse_python(content, result)
        else:
            self.parse_ts_js(content, result)

    def parse_ts_js(self, content: str, result: ParsedData):
        result.imports = self.IMPORT_PATTERN.findall(content)
        exports = self.EXPORT_PATTERN.findall(content)
        if 'export default' in content:
            exports.append('default')
        result.exports = list(set(exports))
        result.hooks_used = list(set(self.HOOK_PATTERN.findall(content)))
        result.contexts_used = list(set(re.findall(r'useContext\((\w+)\)', content)))
        result.has_interface = bool(re.search(r'\binterface\s+\w+', content))
        result.has_type_export = bool(re.search(r'export\s+type\s+\w+', content))
        result.has_jsx = bool(self.JSX_PATTERN.search(content))
        result.is_functional_component = result.has_jsx
        result.is_custom_hook = any(h.startswith('use') for h in result.hooks_used)
        result.has_create_context = 'createContext' in content
        result.is_context_provider = result.has_create_context and '.Provider' in content

    def parse_python(self, content: str, result: ParsedData):
        matches = self.PY_IMPORT_PATTERN.findall(content)
        result.imports = [m[0] or m[1] for m in matches]
        result.exports = self.PY_DEF_PATTERN.findall(content)
        result.has_interface = False
        result.has_type_export = False

    def estimate_complexity(self, content: str) -> int:
        keywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch', '&&', '||', '?']
        complexity = 1
        for kw in keywords:
            complexity += content.count(kw)
        return complexity


# =============================================================================
# FILE SCANNER (v7 extended with Python support)
# =============================================================================
class FileScanner:
    """Scans project directory for source files."""

    def __init__(self, project_path: Path, enable_python: bool = False, verbose: bool = False):
        self.project_path = project_path
        self.enable_python = enable_python
        self.verbose = verbose
        self.src_path = project_path / 'src'
        if not self.src_path.exists():
            self.src_path = project_path

        # Valid extensions based on flags
        self.valid_extensions = set(Config.VALID_EXTENSIONS)
        if enable_python:
            self.valid_extensions.update(Config.PY_EXTENSIONS)

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
        if self.verbose:
            log_info(f"Found {len(files)} source files")
        return files


# =============================================================================
# DEPENDENCY ANALYZER (v7 + v6 enhancements)
# =============================================================================
class DependencyAnalyzer:
    """Builds and analyzes dependency graph."""

    def __init__(self, project_path: Path, src_path: Path, files: Dict[str, FileInfo],
                 detect_barrels: bool = False, detect_dynamic: bool = False):
        self.project_path = project_path
        self.src_path = src_path
        self.files = files
        self.detect_barrels = detect_barrels
        self.detect_dynamic = detect_dynamic

    def build_graph(self) -> Dict[str, List[str]]:
        graph = defaultdict(list)
        for file_path, file_info in self.files.items():
            for imp in file_info.imports:
                resolved = self._resolve_import(file_path, imp)
                if resolved and resolved in self.files:
                    file_info.depends_on.append(resolved)
                    self.files[resolved].dependents.append(file_path)
                    graph[file_path].append(resolved)
        # Optional enhancements
        if self.detect_barrels:
            self._mark_barrel_files()
        if self.detect_dynamic:
            self._detect_dynamic_imports()
        return dict(graph)

    def _resolve_import(self, from_file: str, import_path: str) -> Optional[str]:
        """Resolve relative import to absolute path (v7 logic)."""
        if not import_path.startswith('.') and not import_path.startswith('@/'):
            return None
        try:
            if import_path.startswith('@/'):
                import_path = import_path[2:]
                base_path = self.src_path / import_path
            else:
                from_dir = Path(from_file).parent
                base_path = (self.project_path / from_dir / import_path).resolve()
            # Try direct file
            for ext in Config.SUPPORTED_EXTENSIONS:
                test_path = base_path.with_suffix(ext)
                try:
                    rel_path = str(test_path.relative_to(self.project_path))
                    if rel_path in self.files:
                        return rel_path
                except ValueError:
                    continue
            # Try index file
            for ext in Config.SUPPORTED_EXTENSIONS:
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

    def _mark_barrel_files(self):
        """Mark files that re‑export others (index.ts with exports)."""
        for file_path, file_info in self.files.items():
            if file_info.is_barrel_file:
                for dep in file_info.depends_on:
                    if dep in self.files:
                        self.files[dep].is_barrel_exported = True

    def _detect_dynamic_imports(self):
        """Find dynamic import() statements."""
        dyn_pattern = re.compile(r'import\s*\(["\']([^"\']+)["\']\)')
        for file_path, file_info in self.files.items():
            try:
                full_path = self.project_path / file_info.path
                content = full_path.read_text(encoding='utf-8', errors='ignore')
                for match in dyn_pattern.findall(content):
                    resolved = self._resolve_import(file_path, match)
                    if resolved and resolved in self.files:
                        self.files[resolved].is_dynamic_imported = True
            except:
                pass

    def find_unused(self) -> List[str]:
        """Files without dependents and not entry points (v7)."""
        unused = []
        entry_patterns = ['main.', 'index.', 'app.', 'App.']
        for file_path, file_info in self.files.items():
            is_entry = any(p in Path(file_path).name for p in entry_patterns)
            if is_entry:
                file_info.is_entry_point = True
                continue
            if not file_info.dependents and file_info.exports:
                unused.append(file_path)
        return unused


# =============================================================================
# VALUE SCORER (v7, with optional git enhancement)
# =============================================================================
class ValueScorer:
    @staticmethod
    def score_component(file_info: FileInfo, content: str,
                        use_git: bool = False) -> Tuple[float, List[str]]:
        score = 0.0
        reasons = []
        weights = Config.SCORE_WEIGHTS

        # AI hooks
        ai_hooks = [h for h in file_info.hooks_used if h in Config.AI_HOOKS]
        if ai_hooks:
            score += weights['ai_hook']
            reasons.append(f"+{weights['ai_hook']} AI hooks: {', '.join(ai_hooks)}")

        # MCP
        if file_info.has_mcp or any(p in content for p in Config.MCP_PATTERNS):
            score += weights['mcp']
            reasons.append(f"+{weights['mcp']} MCP integration")

        # Voice
        if file_info.has_voice or any(p in content for p in Config.VOICE_PATTERNS):
            score += weights['voice']
            reasons.append(f"+{weights['voice']} Voice capabilities")

        # Complexity
        complexity_score = min(weights['complexity'],
                               (file_info.hook_count * 3) + (file_info.context_count * 2))
        if complexity_score >= 5:
            score += complexity_score
            reasons.append(f"+{complexity_score} Complexity")

        # Types
        if file_info.has_interface or file_info.has_type_export:
            score += weights['types']
            reasons.append(f"+{weights['types']} Well-typed")

        # Name quality
        name = Path(file_info.path).stem
        name_bonus = 0
        for ind in Config.HIGH_VALUE_NAMES:
            if ind in name:
                name_bonus += 5
        name_bonus = min(name_bonus, weights['name_quality'])
        if name_bonus:
            score += name_bonus
            reasons.append(f"+{name_bonus} Name: {name}")

        # Size
        if file_info.lines > 200:
            score += weights['size_bonus']
            reasons.append(f"+{weights['size_bonus']} {file_info.lines} lines")

        # Hook count
        if len(file_info.hooks_used) > 3:
            extra = min(5, len(file_info.hooks_used) * 2)
            score += extra
            reasons.append(f"+{extra} {len(file_info.hooks_used)} hooks")

        # ---- Optional git signals ----
        if use_git and file_info.git_history and file_info.git_history.has_history:
            # Commit count
            commit_score = min(weights.get('git_commits', 10),
                               file_info.git_history.commit_count * 2)
            if commit_score:
                score += commit_score
                reasons.append(f"+{commit_score} {file_info.git_history.commit_count} commits")
            # Recency
            if file_info.days_since_modified <= Config.RECENT_CHANGE_DAYS:
                score += weights.get('git_recency', 5)
                reasons.append(f"+{weights.get('git_recency',5)} Recent change")
            # Authors
            author_count = len(file_info.git_history.authors)
            if author_count > 1:
                author_bonus = min(weights.get('git_authors', 5), author_count * 2)
                score += author_bonus
                reasons.append(f"+{author_bonus} {author_count} authors")

        return min(score, 100.0), reasons


# =============================================================================
# WIRING ISSUE DETECTOR (v7 – full implementation)
# =============================================================================
class WiringIssueDetector:
    """Detects incorrect import patterns and suggests better alternatives."""

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
# ARCHITECTURAL ANALYZER (v7 – full implementation)
# =============================================================================
class ArchitecturalAnalyzer:
    """Analyzes architectural patterns and health."""

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
        """Detect cycles of length 2–5 in the dependency graph."""
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
# DUPLICATE DETECTOR (v6)
# =============================================================================
class DuplicateDetector:
    """Detects exact and structural duplicates using Jaccard similarity."""

    def __init__(self, files: Dict[str, FileInfo], threshold: float = 0.85):
        self.files = files
        self.threshold = threshold

    def detect(self, parallel: bool = True) -> List[DuplicateCluster]:
        exact = self._find_exact_duplicates()
        structural = self._find_structural_duplicates(parallel)
        return exact + structural

    def _find_exact_duplicates(self) -> List[DuplicateCluster]:
        groups = defaultdict(list)
        for path, fi in self.files.items():
            if fi.category not in {FileCategory.ASSET, FileCategory.CONFIGURATION}:
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

    def _find_structural_duplicates(self, parallel: bool) -> List[DuplicateCluster]:
        groups = defaultdict(list)
        for path, fi in self.files.items():
            if (fi.category not in {FileCategory.ASSET, FileCategory.CONFIGURATION} and
                fi.structural_hash and not fi.duplicate_of):
                groups[fi.structural_hash].append(path)
        candidate_groups = [g for g in groups.values() if len(g) > 1]
        if not candidate_groups:
            return []
        if parallel:
            return self._process_parallel(candidate_groups)
        else:
            return self._process_sequential(candidate_groups)

    def _process_sequential(self, groups: List[List[str]]) -> List[DuplicateCluster]:
        clusters = []
        for group in groups:
            cluster = self._analyze_structural_group(group)
            if cluster:
                clusters.append(cluster)
        return clusters

    def _process_parallel(self, groups: List[List[str]]) -> List[DuplicateCluster]:
        clusters = []
        with ProcessPoolExecutor(max_workers=Config.MAX_WORKERS_CPU) as ex:
            futures = [ex.submit(self._analyze_structural_group, g) for g in groups]
            for f in as_completed(futures):
                try:
                    cluster = f.result()
                    if cluster:
                        clusters.append(cluster)
                except Exception as e:
                    log_error(f"Parallel duplicate detection error: {e}")
        return clusters

    def _analyze_structural_group(self, files: List[str]) -> Optional[DuplicateCluster]:
        if len(files) < 2:
            return None
        base = min(files, key=lambda p: (len(p), p))
        similar = []
        for f in files:
            if f == base:
                continue
            sim = jaccard_similarity(
                set(self.files[base].exports + self.files[base].imports),
                set(self.files[f].exports + self.files[f].imports)
            )
            if sim >= self.threshold:
                similar.append((f, sim))
                self.files[f].structural_duplicates.append(base)
        if not similar:
            return None
        avg_score = sum(s for _, s in similar) / len(similar)
        cluster_files = [base] + [f for f, _ in similar]
        return DuplicateCluster(
            cluster_id=f"struct_{self.files[base].structural_hash[:8]}",
            similarity_score=avg_score,
            files=cluster_files,
            base_file=base,
            merge_target=base,
            diff_summary=f"Structural similarity: {avg_score:.0%}",
            estimated_savings_lines=sum(self.files[f].lines for f in cluster_files[1:]),
            confidence=avg_score * 100
        )


# =============================================================================
# USAGE ANALYZER (v6 – unwired classification)
# =============================================================================
class UsageAnalyzer:
    """Identifies unwired components and classifies them using git history."""

    def __init__(self, files: Dict[str, FileInfo], graph: Dict[str, List[str]],
                 git_analyzer: Optional[GitAnalyzer] = None):
        self.files = files
        self.graph = graph
        self.git_analyzer = git_analyzer

    def analyze(self) -> Tuple[List[str], List[str]]:
        unused = self._find_unused_files()
        unwired = self._find_unwired_features()
        return unused, unwired

    def _find_unused_files(self) -> List[str]:
        """Files with no dependents and not entry points."""
        unused = []
        for path, fi in self.files.items():
            if (len(fi.dependents) == 0 and not fi.is_entry_point and
                not fi.is_barrel_exported and not fi.is_test_file and
                fi.category not in {FileCategory.CONFIGURATION, FileCategory.ASSET}):
                unused.append(path)
        return unused

    def _find_unwired_features(self) -> List[str]:
        """Components with exports but no imports (potentially useful)."""
        unwired = []
        for path, fi in self.files.items():
            if (len(fi.dependents) == 0 and not fi.is_barrel_exported and
                not fi.is_entry_point and len(fi.exports) >= Config.MIN_EXPORTS_FOR_UNWIRED and
                fi.lines >= Config.MIN_LINES_FOR_UNWIRED and
                fi.category not in {FileCategory.TEST, FileCategory.CONFIGURATION,
                                    FileCategory.ASSET, FileCategory.STYLE}):
                # Classify unwired type
                fi.unwired_type = self._classify_unwired(fi)
                unwired.append(path)
        return unwired

    def _classify_unwired(self, fi: FileInfo) -> UnwiredType:
        if not fi.git_history or not fi.git_history.has_history:
            # No git info – use recency
            return UnwiredType.NEW_FEATURE if fi.days_since_modified <= Config.RECENT_CHANGE_DAYS else UnwiredType.DEAD_CODE
        commits = fi.git_history.commit_count
        if fi.days_since_modified <= Config.RECENT_CHANGE_DAYS and commits <= Config.MAX_COMMITS_FOR_NEW:
            return UnwiredType.NEW_FEATURE
        if commits > Config.MIN_COMMITS_FOR_ACTIVE:
            return UnwiredType.ORPHANED_USEFUL
        return UnwiredType.DEAD_CODE


# =============================================================================
# RECOMMENDATION ENGINE (v6)
# =============================================================================
class RecommendationEngine:
    """Generates recommendations (keep/archive/merge/wire) based on multiple signals."""

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
        # Dependents
        if fi.dependents:
            score += w['dependents'] * min(len(fi.dependents)/10, 1.0) * 100
        # Exports
        if fi.exports:
            score += w['exports'] * min(len(fi.exports)/5, 1.0) * 100
        # Size (200 lines ideal)
        size_score = 1.0 - abs(fi.lines - 200) / 500
        size_score = max(0, min(1, size_score))
        score += w['size'] * size_score * 100
        # Recency
        recency = 1.0 / (1 + fi.days_since_modified / 30)
        score += w['recency'] * recency * 100
        # Penalties
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
        # Duplicates
        if fi.duplicate_of:
            return Recommendation.MERGE, [f"Exact duplicate of {fi.duplicate_of}"], 95.0
        if fi.structural_duplicates:
            return Recommendation.MERGE, ["Structural duplicate candidate"], 85.0
        # Unwired
        if fi.unwired_type:
            if fi.unwired_type == UnwiredType.DEAD_CODE:
                return Recommendation.ARCHIVE, ["Dead code, no dependents"], 80.0
            if fi.unwired_type == UnwiredType.ORPHANED_USEFUL:
                return Recommendation.WIRE, ["Potentially useful but orphaned"], 70.0
            if fi.unwired_type == UnwiredType.NEW_FEATURE:
                return Recommendation.REVIEW, ["New feature not yet wired"], 60.0
        # Critical risk
        if fi.risk_level == RiskLevel.CRITICAL:
            return Recommendation.REFACTOR, ["Critical risk – immediate refactor"], 90.0
        # Unused
        if len(fi.dependents) == 0 and not fi.is_entry_point:
            return Recommendation.ARCHIVE, ["No dependents"], 75.0
        # Stable
        if fi.stability_score > 70:
            return Recommendation.KEEP, ["High stability"], fi.stability_score
        # High risk
        if fi.risk_level == RiskLevel.HIGH:
            return Recommendation.REFACTOR, ["High risk"], 70.0
        # Default
        return Recommendation.REVIEW, ["Manual review required"], 50.0

    def _generate_wiring_suggestions(self):
        """For each unwired file, find similar wired files as integration targets."""
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
                common_exports = list(set(uw.exports) & set(fi.exports))
                common_imports = list(set(uw.imports) & set(fi.imports))
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
        exp_sim = jaccard_similarity(set(a.exports), set(b.exports))
        imp_sim = jaccard_similarity(set(a.imports), set(b.imports))
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
        common_exports = set(a.exports) & set(b.exports)
        if common_exports:
            reasons.append(f"Common exports: {', '.join(list(common_exports)[:3])}")
        common_imports = set(a.imports) & set(b.imports)
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
# ARCHIVE MANAGER (v6)
# =============================================================================
class ArchiveManager:
    """Creates timestamped ZIP archives with metadata."""

    def __init__(self, project_path: Path, report_dir: Path, dry_run: bool = False):
        self.project_path = project_path
        self.report_dir = report_dir
        self.dry_run = dry_run
        self.archives_dir = report_dir / Config.ARCHIVES_SUBDIR
        self.history_dir = report_dir / Config.HISTORY_SUBDIR

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
            # Metadata
            metadata = {
                'timestamp': timestamp,
                'reason': reason,
                'files': files,
                'count': len(files)
            }
            meta_path = self.history_dir / f"archive_{timestamp}.json"
            with open(meta_path, 'w') as f:
                json.dump(metadata, f, indent=2, cls=CacheManager._JSONEncoder)
            log_success(f"Created archive: {archive_path} ({len(files)} files)")
            return archive_path
        except Exception as e:
            log_error(f"Archive failed: {e}")
            return None


# =============================================================================
# HTML REPORT GENERATOR (v7 extended with new sections)
# =============================================================================
class HTMLReportGenerator:
    """Generates beautiful HTML reports – v7 core + enterprise extensions."""

    @staticmethod
    def generate(result: AnalysisResult, output_path: Path, with_git: bool = False):
        # Generate v7 core report
        v7_html = HTMLReportGenerator._generate_v7_core(result, with_git)
        # Build extra sections
        extra_sections = ""
        if result.duplicate_clusters:
            extra_sections += HTMLReportGenerator._build_duplicate_section(result.duplicate_clusters)
        if result.archive_candidates:
            extra_sections += HTMLReportGenerator._build_archive_section(result.archive_candidates)
        if any(f.recommendation != Recommendation.KEEP for f in result.files.values()):
            extra_sections += HTMLReportGenerator._build_recommendation_section(result.files)
        # Insert before footer
        final_html = v7_html.replace('</div>\n        \n        <div class="footer">',
                                     f'{extra_sections}</div>\n        \n        <div class="footer">')
        output_path.write_text(final_html, encoding='utf-8')
        log_success(f"HTML report generated: {output_path}")

    @staticmethod
    def _generate_v7_core(result: AnalysisResult, with_git: bool) -> str:
        """Exact v7 HTML generation – preserved."""
        high_value = [c for c in result.valuable_unused if c.value_score >= 60]
        critical_issues = [i for i in result.wiring_issues if i.severity == Severity.CRITICAL]
        avg_health = 0.0
        if result.insights:
            avg_health = sum(i.health_score for i in result.insights) / len(result.insights)

        valuable_rows = ""
        for comp in sorted(result.valuable_unused, key=lambda x: x.value_score, reverse=True)[:20]:
            score_class = 'high' if comp.value_score >= 60 else 'medium' if comp.value_score >= 40 else 'low'
            reasons_short = "<br>".join(comp.reasons[:2]) + ("<br>..." if len(comp.reasons) > 2 else "")
            git_info = f"<small>{comp.last_author} · {comp.last_modified_date}</small>" if with_git and comp.last_author else ""
            valuable_rows += f"""
            <tr>
                <td><strong>{comp.name}</strong><br><span style="color: #6b7280; font-size: 0.85em;">{comp.path}</span></td>
                <td><span class="badge badge-{score_class}">{comp.value_score:.0f}</span>
                    <div class="score-bar"><div class="score-fill" style="width: {comp.value_score}%;"></div></div>
                </td>
                <td>{comp.layer.value}</td>
                <td>{reasons_short}</td>
                <td><code style="font-size: 0.85em;">{comp.suggested_location}</code><br>{git_info}</td>
            </tr>"""

        wiring_rows = ""
        for issue in sorted(result.wiring_issues, key=lambda x: x.severity_score, reverse=True)[:50]:
            severity_badge = f'<span class="badge badge-{issue.severity.value}">{issue.severity.value.upper()}</span>'
            details_html = ""
            if issue.reasoning or issue.refactor_sample:
                details = []
                if issue.reasoning:
                    details.append("<ul>" + "".join(f"<li>{r}</li>" for r in issue.reasoning) + "</ul>")
                if issue.refactor_sample:
                    details.append(f"<pre><code>{issue.refactor_sample}</code></pre>")
                details_html = f"<details><summary>How to fix</summary>{''.join(details)}</details>"
            wiring_rows += f"""
            <tr>
                <td><strong>{Path(issue.file_path).name}</strong><br><span style="color: #6b7280; font-size: 0.85em;">Line {issue.line_number}</span></td>
                <td>{severity_badge}<br><span style="font-size:0.8em;">score: {issue.severity_score}</span></td>
                <td>{issue.issue_type}</td>
                <td><code style="font-size: 0.85em;">{issue.current_import}</code></td>
                <td><code style="font-size: 0.85em;">{issue.better_alternative}</code></td>
                <td>{details_html}</td>
            </tr>"""

        insight_cards = ""
        for insight in result.insights:
            health_color = '#10b981' if insight.health_score >= 80 else '#f59e0b' if insight.health_score >= 60 else '#dc2626'
            strengths_html = "".join(f'<li class="strength">{s}</li>' for s in insight.strengths[:2])
            weaknesses_html = "".join(f'<li class="weakness">{w}</li>' for w in insight.weaknesses[:2])
            recs_html = "".join(f'<li class="recommendation">{r}</li>' for r in insight.recommendations[:2])
            insight_cards += f"""
            <div class="health-card">
                <h3>{insight.pattern.value.replace('_', ' ').title()}</h3>
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 15px;">
                    <div style="font-size: 2em; font-weight: bold; color: {health_color};">{insight.health_score:.0f}%</div>
                    <div style="flex: 1;">
                        <div class="score-bar"><div class="score-fill" style="width: {insight.health_score}%; background: {health_color};"></div></div>
                        <small style="color: #6b7280;">{insight.files_involved} files involved</small>
                    </div>
                </div>
                <ul>{strengths_html}{weaknesses_html}{recs_html}</ul>
            </div>"""

        css_severity = """
        .badge-critical { background: #dc2626; color: white; }
        .badge-high { background: #f97316; color: white; }
        .badge-medium { background: #eab308; color: black; }
        .badge-low { background: #6b7280; color: white; }
        """

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>G-Studio Code Analysis Report v7.3</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            color: #333;
        }}
        .container {{
            max-width: 1400px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            overflow: hidden;
        }}
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
        }}
        .header h1 {{ font-size: 2.5em; margin-bottom: 10px; }}
        .header .subtitle {{ font-size: 1.2em; opacity: 0.9; }}
        .content {{ padding: 40px; }}
        
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }}
        .stat-card {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 25px;
            border-radius: 12px;
            text-align: center;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        }}
        .stat-card .number {{ font-size: 2.5em; font-weight: bold; margin-bottom: 5px; }}
        .stat-card .label {{ font-size: 0.9em; opacity: 0.9; }}
        
        .section {{ margin-bottom: 50px; }}
        .section-title {{
            font-size: 2em;
            color: #667eea;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #667eea;
        }}
        
        table {{
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            background: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
        }}
        thead {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }}
        th {{ padding: 15px; text-align: left; font-weight: 600; }}
        td {{ padding: 15px; border-bottom: 1px solid #e5e7eb; }}
        tr:hover {{ background: #f9fafb; }}
        
        .badge {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.85em;
            font-weight: 600;
        }}
        {css_severity}
        
        .score-bar {{
            height: 20px;
            background: #e5e7eb;
            border-radius: 10px;
            overflow: hidden;
            margin: 5px 0;
        }}
        .score-fill {{
            height: 100%;
            background: linear-gradient(90deg, #10b981, #3b82f6);
            transition: width 0.3s;
        }}
        
        .health-card {{
            background: #f9fafb;
            border-radius: 12px;
            padding: 25px;
            margin-bottom: 20px;
            border-left: 4px solid #667eea;
        }}
        .health-card h3 {{ color: #667eea; margin-bottom: 15px; }}
        .health-card ul {{ list-style: none; padding: 0; }}
        .health-card li {{ padding: 8px 0; padding-left: 25px; position: relative; }}
        .health-card li.strength::before {{ content: "✓"; position: absolute; left: 0; color: #10b981; font-weight: bold; }}
        .health-card li.weakness::before {{ content: "⚠"; position: absolute; left: 0; color: #f59e0b; }}
        .health-card li.recommendation::before {{ content: "→"; position: absolute; left: 0; color: #3b82f6; }}
        
        .footer {{
            text-align: center;
            padding: 30px;
            color: #6b7280;
            border-top: 1px solid #e5e7eb;
        }}
        details {{
            background: #f3f4f6;
            padding: 10px;
            border-radius: 6px;
            margin: 5px 0;
        }}
        details pre {{
            background: #1f2937;
            color: #e5e7eb;
            padding: 10px;
            border-radius: 4px;
            overflow-x: auto;
        }}
    </style>
    <script>
        function sortTable(table, col, isNumeric = false) {{
            const tbody = table.querySelector('tbody');
            const rows = Array.from(tbody.querySelectorAll('tr'));
            const ascending = table.dataset.sortDir !== 'asc';
            rows.sort((a, b) => {{
                const aVal = a.children[col].innerText.trim();
                const bVal = b.children[col].innerText.trim();
                if (isNumeric) {{
                    const aNum = parseFloat(aVal) || 0;
                    const bNum = parseFloat(bVal) || 0;
                    return ascending ? aNum - bNum : bNum - aNum;
                }}
                return ascending ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            }});
            rows.forEach(row => tbody.appendChild(row));
            table.dataset.sortDir = ascending ? 'asc' : 'desc';
        }}
    </script>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 G-Studio Enterprise Code Analysis v7.3</h1>
            <div class="subtitle">Intelligent Analysis of React/TypeScript + Python Codebases</div>
            <div class="subtitle" style="margin-top: 10px; font-size: 0.9em;">
                Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            </div>
        </div>
        
        <div class="content">
            <div class="section">
                <h2 class="section-title">📊 Overall Statistics</h2>
                <div class="stats-grid">
                    <div class="stat-card"><div class="number">{result.total_files}</div><div class="label">Total Files</div></div>
                    <div class="stat-card"><div class="number">{result.tsx_percentage:.1f}%</div><div class="label">TSX Files</div></div>
                    <div class="stat-card"><div class="number">{len(result.valuable_unused)}</div><div class="label">Valuable Unused</div></div>
                    <div class="stat-card"><div class="number">{len(result.wiring_issues)}</div><div class="label">Wiring Issues</div></div>
                    <div class="stat-card"><div class="number">{avg_health:.0f}%</div><div class="label">Avg Health</div></div>
                </div>
            </div>
            
            <div class="section">
                <h2 class="section-title">💎 Valuable Unused Components ({len(result.valuable_unused)})</h2>
                <p style="margin-bottom: 20px; color: #6b7280;">
                    These components have high value but are not currently wired into the application.
                </p>
                <table class="sortable" data-sort-dir="">
                    <thead onclick="sortTable(this.closest('table'), 1, true)"><tr><th>Component</th><th>Score</th><th>Layer</th><th>Why Valuable</th><th>Suggested Location</th></tr></thead>
                    <tbody>{valuable_rows}</tbody>
                </table>
                {f"<p><em>... and {len(result.valuable_unused)-20} more components</em></p>" if len(result.valuable_unused) > 20 else ""}
            </div>
            
            <div class="section">
                <h2 class="section-title">🔧 Wiring Issues ({len(result.wiring_issues)})</h2>
                <p style="margin-bottom: 20px; color: #6b7280;">
                    Detected import problems and architectural anti-patterns. Sorted by impact score.
                </p>
                <table class="sortable" data-sort-dir="">
                    <thead onclick="sortTable(this.closest('table'), 1, true)"><tr><th>File</th><th>Severity</th><th>Issue Type</th><th>Current Import</th><th>Better Alternative</th><th>How to Fix</th></tr></thead>
                    <tbody>{wiring_rows}</tbody>
                </table>
            </div>
            
            <div class="section">
                <h2 class="section-title">🏗️ Architectural Health</h2>
                {insight_cards}
            </div>
"""
        # This closing div and footer will be replaced when appending extra sections
        html += """
        </div>
        
        <div class="footer">
            Generated by G-Studio Enterprise Code Intelligence v7.3<br>
            {total_files} files · {total_lines} lines · {wiring_issues} issues
        </div>
    </div>
</body>
</html>""".format(
            total_files=result.total_files,
            total_lines=result.total_lines,
            wiring_issues=len(result.wiring_issues)
        )
        return html

    @staticmethod
    def _build_duplicate_section(clusters: List[DuplicateCluster]) -> str:
        rows = []
        for c in sorted(clusters, key=lambda x: x.estimated_savings_lines, reverse=True):
            rows.append(f"""
<tr>
    <td><code>{c.cluster_id}</code></td>
    <td>{c.similarity_score:.0%}</td>
    <td>{len(c.files)}</td>
    <td><code>{c.base_file}</code></td>
    <td>{c.estimated_savings_lines:,}</td>
    <td>{c.diff_summary}</td>
</tr>""")
        return f"""
<div class="section">
    <h2 class="section-title">📦 Duplicate Clusters</h2>
    <table class="data-table sortable">
        <thead><tr><th>Cluster</th><th>Similarity</th><th>Files</th><th>Base</th><th>Savings (lines)</th><th>Summary</th></tr></thead>
        <tbody>{''.join(rows)}</tbody>
    </table>
</div>"""

    @staticmethod
    def _build_archive_section(candidates: List[ArchiveDecision]) -> str:
        rows = []
        for d in sorted(candidates, key=lambda x: x.confidence, reverse=True)[:20]:
            rows.append(f"""
<tr>
    <td><code>{d.file_path}</code></td>
    <td>{d.confidence:.0f}%</td>
    <td>{'; '.join(d.reasons[:2])}</td>
    <td>{'; '.join(d.blockers[:2]) if d.blockers else 'None'}</td>
</tr>""")
        return f"""
<div class="section">
    <h2 class="section-title">📦 Archive Candidates</h2>
    <table class="data-table sortable">
        <thead><tr><th>File</th><th>Confidence</th><th>Reasons</th><th>Blockers</th></tr></thead>
        <tbody>{''.join(rows)}</tbody>
    </table>
</div>"""

    @staticmethod
    def _build_recommendation_section(files: Dict[str, FileInfo]) -> str:
        groups = defaultdict(list)
        for p, fi in files.items():
            groups[fi.recommendation].append((p, fi))
        sections = []
        for rec in [Recommendation.ARCHIVE, Recommendation.MERGE, Recommendation.WIRE, Recommendation.REFACTOR]:
            if rec not in groups:
                continue
            rows = []
            for p, fi in sorted(groups[rec], key=lambda x: x[1].recommendation_confidence, reverse=True)[:15]:
                reasons = ', '.join(fi.recommendation_reasons)
                rows.append(f"""
<tr>
    <td><code>{fi.relative_path}</code></td>
    <td>{fi.recommendation_confidence:.0f}%</td>
    <td>{reasons}</td>
</tr>""")
            sections.append(f"""
<div class="recommendation-group">
    <h3>{rec.value} ({len(groups[rec])} files)</h3>
    <table class="data-table">
        <thead><tr><th>File</th><th>Confidence</th><th>Reasons</th></tr></thead>
        <tbody>{''.join(rows)}</tbody>
    </table>
</div>""")
        return f"""
<div class="section">
    <h2 class="section-title">💡 Recommendations</h2>
    {''.join(sections)}
</div>"""


# =============================================================================
# JSON & CSV EXPORTERS (v7 extended)
# =============================================================================
def export_json_report(result: AnalysisResult, output_path: Path):
    """Save full analysis as JSON (v7 extended)."""
    data = {
        'version': '7.3.2',
        'timestamp': datetime.now().isoformat(),
        'total_files': result.total_files,
        'tsx_percentage': result.tsx_percentage,
        'total_lines': result.total_lines,
        'valuable_unused': [asdict(c) for c in result.valuable_unused],
        'wiring_issues': [asdict(i) for i in result.wiring_issues],
        'insights': [asdict(i) for i in result.insights],
        'layer_stats': result.layer_stats,
        'duplicate_clusters': [asdict(c) for c in result.duplicate_clusters],
        'archive_candidates': [asdict(c) for c in result.archive_candidates],
        'unused_files': result.unused_files,
        'unwired_features': result.unwired_features,
        'high_risk_files': result.high_risk_files,
        'analysis_duration_seconds': result.analysis_duration_seconds,
        'cache_hit_rate': result.cache_hit_rate,
        'git_available': result.git_available,
    }
    with open(output_path, 'w') as f:
        json.dump(data, f, indent=2, default=lambda o: o.value if isinstance(o, Enum) else str(o))
    log_success(f"JSON report saved to {output_path}")

def export_csv_reports(result: AnalysisResult, output_dir: Path):
    """Export valuable_unused, wiring_issues, duplicate_clusters, archive_candidates."""
    # Valuable unused (v7)
    if result.valuable_unused:
        csv_path = output_dir / 'valuable_unused.csv'
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f)
            w.writerow(['Name','Path','Layer','Score','Reasons','Suggested Location','Last Author','Last Modified'])
            for c in sorted(result.valuable_unused, key=lambda x: x.value_score, reverse=True):
                w.writerow([c.name, c.path, c.layer.value, f"{c.value_score:.0f}",
                           "; ".join(c.reasons), c.suggested_location, c.last_author, c.last_modified_date])
        log_success(f"CSV export: {csv_path}")

    # Wiring issues (v7)
    if result.wiring_issues:
        csv_path = output_dir / 'wiring_issues.csv'
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f)
            w.writerow(['File','Line','Severity','Score','Type','Current Import','Better Alternative','Reasoning'])
            for i in sorted(result.wiring_issues, key=lambda x: x.severity_score, reverse=True):
                w.writerow([i.file_path, i.line_number, i.severity.value, i.severity_score,
                           i.issue_type, i.current_import, i.better_alternative, "; ".join(i.reasoning)])
        log_success(f"CSV export: {csv_path}")

    # Duplicate clusters
    if result.duplicate_clusters:
        csv_path = output_dir / 'duplicate_clusters.csv'
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f)
            w.writerow(['Cluster ID','Similarity','Files','Base File','Savings Lines','Summary'])
            for c in sorted(result.duplicate_clusters, key=lambda x: x.estimated_savings_lines, reverse=True):
                w.writerow([c.cluster_id, f"{c.similarity_score:.0%}", len(c.files),
                           c.base_file, c.estimated_savings_lines, c.diff_summary])
        log_success(f"CSV export: {csv_path}")

    # Archive candidates
    if result.archive_candidates:
        csv_path = output_dir / 'archive_candidates.csv'
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            w = csv.writer(f)
            w.writerow(['File','Confidence','Reasons','Blockers'])
            for d in sorted(result.archive_candidates, key=lambda x: x.confidence, reverse=True):
                w.writerow([d.file_path, f"{d.confidence:.0f}%", "; ".join(d.reasons), "; ".join(d.blockers)])
        log_success(f"CSV export: {csv_path}")


# =============================================================================
# MAIN ANALYZER – GStudioAnalyzer (v7 extended)
# =============================================================================
class GStudioAnalyzer:
    """Main orchestrator – extended with enterprise features."""

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
                 # New enterprise flags
                 enable_python: bool = False,
                 enable_duplicates: bool = False,
                 enable_recommendations: bool = False,
                 archive: bool = False,
                 archive_reason: str = "",
                 git_history: bool = False,
                 use_git_in_scoring: bool = False,
                 detect_barrels: bool = False,
                 detect_dynamic: bool = False,
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

        # Enterprise flags
        self.enable_python = enable_python
        self.enable_duplicates = enable_duplicates
        self.enable_recommendations = enable_recommendations
        self.archive = archive
        self.archive_reason = archive_reason
        self.git_history = git_history
        self.use_git_in_scoring = use_git_in_scoring
        self.detect_barrels = detect_barrels
        self.detect_dynamic = detect_dynamic

        if not dry_run:
            self.output_dir.mkdir(parents=True, exist_ok=True)

        # Cache
        self.cache = CacheManager(project_path / Config.CACHE_FILE, use_cache and not dry_run, version="7.3.2")

        # Parser (unified)
        compute_structural = self.enable_duplicates  # only compute if needed
        self.parser = UnifiedParser(
            enable_python=self.enable_python,
            compute_structural_hash=compute_structural,
            verbose=verbose
        )

        # Scanner
        self.scanner = FileScanner(project_path, enable_python=self.enable_python, verbose=verbose)

        # Git
        self.git_analyzer = GitAnalyzer(project_path) if self.git_history else None
        self.git_helper = GitHelper()  # for --since-last-commit

        # Data containers
        self.files: Dict[str, FileInfo] = {}
        self.result = AnalysisResult(total_files=0, tsx_percentage=0, total_lines=0)
        self.skipped_files = 0
        self._start_time = 0

    def analyze(self) -> AnalysisResult:
        log_header("G-STUDIO ENTERPRISE CODE INTELLIGENCE v7.3.2")
        self._start_time = time.time()

        # ---------- Scan ----------
        log_info("Scanning project files...")
        file_paths = self.scanner.scan()
        total_candidates = len(file_paths)
        log_success(f"Found {total_candidates} source files")

        # ---------- Changed only (v7) ----------
        if self.changed_only:
            log_info("Filtering to files changed since last commit...")
            changed_set = self.git_helper.get_changed_files_since_last_commit(self.project_path)
            if changed_set is not None:
                changed_rel = {str(Path(p).as_posix()) for p in changed_set}
                original_count = len(file_paths)
                file_paths = [p for p in file_paths
                             if str(p.relative_to(self.project_path).as_posix()) in changed_rel]
                self.skipped_files = original_count - len(file_paths)
                log_success(f"Keeping {len(file_paths)} changed files, skipped {self.skipped_files} unchanged files")
            else:
                log_warning("Could not get changed files from git, proceeding with full scan")

        # ---------- Parse files ----------
        log_info("Parsing and analyzing files...")
        self._analyze_files(file_paths)
        log_success(f"Analyzed {len(self.files)} files")

        # ---------- Dependency graph ----------
        log_info("Building dependency graph...")
        dep_analyzer = DependencyAnalyzer(
            self.project_path, self.scanner.src_path, self.files,
            detect_barrels=self.detect_barrels,
            detect_dynamic=self.detect_dynamic
        )
        self.result.dependency_graph = dep_analyzer.build_graph()
        unused = dep_analyzer.find_unused()
        self.result.unused_files = unused
        log_success(f"Found {len(unused)} potentially unused files")

        # ---------- Valuable unused scoring (v7) ----------
        log_info("Scoring valuable unused components...")
        self._find_valuable_unused(unused)
        log_success(f"Found {len(self.result.valuable_unused)} valuable unused components (min score: {self.min_score})")

        # ---------- Wiring issues (v7) ----------
        log_info("Detecting wiring issues...")
        self._detect_wiring_issues()
        log_success(f"Found {len(self.result.wiring_issues)} wiring issues")

        # ---------- Architectural insights (v7) ----------
        log_info("Analyzing architecture...")
        arch_analyzer = ArchitecturalAnalyzer(self.files, self.project_path)
        self.result.insights = arch_analyzer.analyze()
        log_success(f"Generated {len(self.result.insights)} architectural insights")

        # ---------- Duplicate detection (enterprise) ----------
        if self.enable_duplicates:
            log_info("Detecting duplicates...")
            dup_detector = DuplicateDetector(self.files, Config.STRUCTURAL_SIMILARITY_THRESHOLD)
            self.result.duplicate_clusters = dup_detector.detect(parallel=self.parallel)
            log_success(f"Found {len(self.result.duplicate_clusters)} duplicate clusters")

        # ---------- Usage analysis (unwired) ----------
        if self.enable_recommendations or self.archive:
            log_info("Analyzing usage and unwired components...")
            usage_analyzer = UsageAnalyzer(self.files, self.result.dependency_graph, self.git_analyzer)
            unused, unwired = usage_analyzer.analyze()
            self.result.unused_files = unused
            self.result.unwired_features = unwired
            log_success(f"Found {len(unwired)} unwired features")

        # ---------- Recommendations ----------
        if self.enable_recommendations:
            log_info("Generating recommendations...")
            rec_engine = RecommendationEngine(
                self.files, self.result.dependency_graph,
                self.result.duplicate_clusters, self.result.unwired_features
            )
            rec_engine.generate_recommendations()
            log_success("Recommendations generated")

        # ---------- Archive candidates ----------
        if self.archive:
            log_info("Selecting archive candidates...")
            candidates = self._select_archive_candidates()
            self.result.archive_candidates = candidates
            log_success(f"Selected {len(candidates)} archive candidates")
            archive_mgr = ArchiveManager(self.project_path, self.output_dir, self.dry_run)
            archive_mgr.archive_files([c.file_path for c in candidates], self.archive_reason)

        # ---------- Statistics ----------
        self._calculate_stats()
        self.result.files = self.files
        self.result.cache_hit_rate = self.cache.hit_rate()
        self.result.git_available = self.git_analyzer.is_git_repo if self.git_analyzer else False
        self.result.analysis_duration_seconds = time.time() - self._start_time

        # Save cache
        if not self.dry_run:
            self.cache.save()

        return self.result

    def _analyze_files(self, file_paths: List[Path]):
        """Parallel or sequential file analysis."""
        if self.parallel:
            with ThreadPoolExecutor(max_workers=Config.MAX_WORKERS) as ex:
                futures = {ex.submit(self._analyze_single_file, p): p for p in file_paths}
                for f in tqdm(as_completed(futures), total=len(file_paths), desc="Analyzing files"):
                    try:
                        f.result()
                    except Exception as e:
                        if self.verbose:
                            log_warning(f"Worker error: {e}")
        else:
            for p in tqdm(file_paths, desc="Analyzing files"):
                self._analyze_single_file(p)

    def _analyze_single_file(self, file_path: Path):
        """Parse a single file, use cache, build FileInfo."""
        try:
            content = file_path.read_text(encoding='utf-8', errors='ignore')
            content_hash = compute_hash(content)
            mtime = file_path.stat().st_mtime
            rel_path = str(file_path.relative_to(self.project_path))

            cached = self.cache.get(rel_path, mtime, content_hash)
            if cached:
                # Reconstruct FileInfo from cache
                data = cached['file_info']
                # Ensure all new fields exist (backward compat)
                for field in ['structural_hash', 'cyclomatic_complexity', 'any_count',
                              'category', 'is_barrel_file', 'is_test_file', 'git_history',
                              'days_since_modified', 'cognitive_complexity', 'comment_ratio',
                              'is_dynamic_imported', 'has_side_effects', 'is_barrel_exported',
                              'duplicate_of', 'structural_duplicates', 'unwired_type',
                              'wiring_suggestions', 'stability_score', 'risk_level',
                              'risk_score', 'recommendation', 'recommendation_reasons',
                              'recommendation_confidence', 'issues', 'value_score']:
                    if field not in data:
                        if field == 'category':
                            data[field] = FileCategory.UNKNOWN.value
                        elif field in ['days_since_modified', 'cognitive_complexity']:
                            data[field] = 0
                        elif field == 'comment_ratio':
                            data[field] = 0.0
                        elif field == 'risk_level':
                            data[field] = RiskLevel.LOW.value
                        elif field == 'recommendation':
                            data[field] = Recommendation.KEEP.value
                        elif field in ['structural_duplicates', 'wiring_suggestions', 'issues']:
                            data[field] = []
                        elif field in ['unwired_type', 'duplicate_of', 'git_history']:
                            data[field] = None
                        elif field in ['is_barrel_exported', 'is_dynamic_imported', 'has_side_effects']:
                            data[field] = False
                        elif field == 'value_score':
                            data[field] = 0.0
                        else:
                            data[field] = "" if field == 'structural_hash' else 0
                # Convert enum fields
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
                if 'git_history' in data and data['git_history']:
                    data['git_history'] = GitHistoryInfo(**data['git_history'])
                file_info = FileInfo(**data)
            else:
                # Parse
                parsed = self.parser.parse(file_path, content)

                # Determine layer (v7)
                layer = self._classify_layer_with_signals(file_path, content, parsed)

                # Days since modified
                days_since_modified_val = days_since(mtime)

                # Basic FileInfo
                file_info = FileInfo(
                    path=rel_path,
                    relative_path=rel_path,
                    layer=layer,
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
                    import_details=parsed.import_details,
                    export_details=parsed.export_details,
                    is_functional_component=parsed.is_functional_component,
                    is_custom_hook=parsed.is_custom_hook,
                    is_context_provider=parsed.is_context_provider,
                    has_create_context=parsed.has_create_context,
                    # v6 fields
                    structural_hash=parsed.structural_hash,
                    cyclomatic_complexity=parsed.cyclomatic_complexity,
                    any_count=parsed.any_count,
                    days_since_modified=days_since_modified_val,
                    category=self._categorize_file(file_path, parsed),
                    is_barrel_file=self._is_barrel_file(file_path, parsed),
                    is_test_file=self._is_test_file(file_path),
                    is_entry_point=self._is_entry_point(file_path),
                    has_side_effects=self._has_side_effects(content),
                    value_score=0.0,  # default
                )
                # AI / MCP / Voice signals
                file_info.has_ai_hook = any(h in Config.AI_HOOKS for h in file_info.hooks_used)
                file_info.has_mcp = any(p in content for p in Config.MCP_PATTERNS)
                file_info.has_voice = any(p in content for p in Config.VOICE_PATTERNS)

                # Git history (enhanced)
                if self.git_analyzer:
                    file_info.git_history = self.git_analyzer.get_file_history(rel_path)
                else:
                    # Fallback to simple last commit info (v7 style)
                    try:
                        author, date = GitHelper.get_last_commit_info(file_path, self.project_path)
                        file_info.git_last_author = author
                        file_info.git_last_modified = date
                    except:
                        pass

                # Cache
                cache_data = asdict(file_info)
                # Convert enums to strings for JSON serialization
                cache_data['layer'] = cache_data['layer'].value
                cache_data['category'] = cache_data['category'].value
                cache_data['risk_level'] = cache_data['risk_level'].value
                cache_data['recommendation'] = cache_data['recommendation'].value
                if cache_data['unwired_type']:
                    cache_data['unwired_type'] = cache_data['unwired_type'].value
                if cache_data['git_history']:
                    cache_data['git_history'] = asdict(cache_data['git_history'])
                self.cache.set(rel_path, {
                    'mtime': mtime,
                    'hash': content_hash,
                    'file_info': cache_data
                })

            self.files[rel_path] = file_info

        except Exception as e:
            if self.verbose:
                log_warning(f"Error analyzing {file_path}: {e}")

    # ---------- Helper methods from v7 (with minor adjustments) ----------
    def _classify_layer_with_signals(self, file_path: Path, content: str, parsed: ParsedData) -> LayerType:
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
        return self._determine_layer(file_path)

    def _determine_layer(self, file_path: Path) -> LayerType:
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
        if file_path.suffix in {'.css','.scss','.sass','.less'}:
            return FileCategory.STYLE
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
                full = self.project_path / path
                content = full.read_text(encoding='utf-8')
            except:
                continue
            score, reasons = ValueScorer.score_component(fi, content, use_git=self.use_git_in_scoring)
            # Store score back to FileInfo for later use (e.g., archive selection)
            fi.value_score = score
            if score > 30 and score >= self.min_score:
                comp = ValuableComponent(
                    name=Path(path).stem,
                    path=path,
                    layer=fi.layer,
                    value_score=score,
                    reasons=reasons,
                    suggested_location=self._suggest_integration_location(fi),
                    integration_effort='low' if fi.layer == LayerType.HOOKS else 'medium',
                    integration_code=self._generate_integration_code(fi),
                    exports=fi.exports,
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
                full = self.project_path / path
                content = full.read_text(encoding='utf-8')
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
                # Duplicate (non‑base) -> archive
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
                  fi.value_score < 40 and fi.lines < 200):
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
        # HTML
        html_path = self.output_dir / 'analysis_report.html'
        HTMLReportGenerator.generate(self.result, html_path, with_git=True)
        # JSON
        json_path = self.output_dir / 'analysis_report.json'
        export_json_report(self.result, json_path)
        # CSV
        if self.csv_export:
            export_csv_reports(self.result, self.output_dir)
        if not html_only:
            self._print_summary()

    def _print_summary(self):
        log_header("ANALYSIS SUMMARY")
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
        print(f"\n{Colors.BOLD}{Colors.CYAN}📊 HTML report:{Colors.END} {self.output_dir / 'analysis_report.html'}")


# =============================================================================
# CLI – ENTRY POINT (v7 extended)
# =============================================================================
def parse_args():
    parser = argparse.ArgumentParser(
        description="G-Studio Enterprise Code Intelligence v7.3.2",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Original v7 behaviour (identical)
  %(prog)s .

  # Full enterprise analysis
  %(prog)s . --enable-python --enable-duplicates --enable-recommendations --git-history --archive --csv

  # Dry run archive
  %(prog)s . --archive --dry-run
"""
    )
    # ---------- v7 arguments (preserved) ----------
    parser.add_argument('project_path', nargs='?', default='.', help='Project directory')
    parser.add_argument('--output-dir', default='./gstudio-reports', help='Output directory')
    parser.add_argument('--no-cache', action='store_true', help='Disable cache')
    parser.add_argument('--verbose', action='store_true', help='Verbose logging')
    parser.add_argument('--html-only', action='store_true', help='Only generate HTML')
    parser.add_argument('--dry-run', action='store_true', help='Simulate only')
    parser.add_argument('--no-parallel', action='store_true', help='Disable parallel parsing')
    parser.add_argument('--since-last-commit', '-c', action='store_true', help='Only changed files')
    parser.add_argument('--csv', action='store_true', help='Export CSV files')
    parser.add_argument('--min-score', type=int, default=0, help='Minimum value score')

    # ---------- Enterprise extensions ----------
    parser.add_argument('--enable-python', action='store_true', help='Include Python files')
    parser.add_argument('--enable-duplicates', action='store_true', help='Detect duplicate clusters')
    parser.add_argument('--enable-recommendations', action='store_true', help='Generate recommendations')
    parser.add_argument('--archive', action='store_true', help='Archive candidates')
    parser.add_argument('--archive-reason', default='', help='Reason for archive')
    parser.add_argument('--git-history', action='store_true', help='Fetch full git history')
    parser.add_argument('--use-git-in-scoring', action='store_true', help='Use git signals in value scoring')
    parser.add_argument('--detect-barrels', action='store_true', help='Mark barrel exports')
    parser.add_argument('--detect-dynamic', action='store_true', help='Detect dynamic imports')

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
        # Enterprise flags
        enable_python=args.enable_python,
        enable_duplicates=args.enable_duplicates,
        enable_recommendations=args.enable_recommendations,
        archive=args.archive,
        archive_reason=args.archive_reason,
        git_history=args.git_history,
        use_git_in_scoring=args.use_git_in_scoring,
        detect_barrels=args.detect_barrels,
        detect_dynamic=args.detect_dynamic,
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