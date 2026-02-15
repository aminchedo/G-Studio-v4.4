#!/usr/bin/env python3
"""
Enterprise Code Intelligence Platform v4 - Single File Edition

A comprehensive static analysis tool for TypeScript/JavaScript projects that provides:
- AST-based parsing using tree-sitter
- Accurate dependency graph construction
- Multi-layer duplicate detection
- Usage analysis and risk assessment
- Intelligent recommendation engine
- Safe archive creation workflow
- Interactive and CI-ready CLI
- Self-contained HTML dashboard

Author: Code Intelligence Team
License: MIT
Python: 3.9+
"""

# ==== IMPORTS ====
import os
import sys
import json
import hashlib
import shutil
import zipfile
import argparse
import logging
import re
import time
import subprocess
from pathlib import Path
from dataclasses import dataclass, field, asdict
from enum import Enum, auto
from typing import (
    Dict, List, Set, Tuple, Optional, Any, Callable,
    Generator, Union, NamedTuple
)
from collections import defaultdict, Counter
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed
from difflib import SequenceMatcher
import mimetypes
import platform
import base64
import html

# Tree-sitter imports
try:
    from tree_sitter import Language, Parser, Node
    from tree_sitter_typescript import language_typescript, language_tsx
    TREE_SITTER_AVAILABLE = True
except ImportError:
    TREE_SITTER_AVAILABLE = False
    print("WARNING: tree-sitter not available. Install with: pip install tree-sitter tree-sitter-typescript")

# ==== CONFIGURATION ====
class Config:
    """Global configuration constants"""
    VERSION = "4.0.0"
    CACHE_FILE = ".code_intelligence_cache.json"
    DEFAULT_REPORT_DIR = "reports"
    ARCHIVES_SUBDIR = "archives"
    HISTORY_SUBDIR = "history"
    
    # File extensions
    TS_EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx'}
    EXCLUDED_EXTENSIONS = {'.md', '.markdown'}
    ASSET_EXTENSIONS = {'.css', '.scss', '.sass', '.less', '.json', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.eot'}
    
    # Ignore patterns
    DEFAULT_IGNORE_PATTERNS = [
        'node_modules', 'dist', 'build', '.git', '.next', 'coverage',
        '__pycache__', '.pytest_cache', '.vscode', '.idea',
        '*.min.js', '*.bundle.js', '*.chunk.js'
    ]
    
    # Analysis thresholds
    STRUCTURAL_SIMILARITY_THRESHOLD = 0.85
    MIN_LINES_FOR_UNWIRED = 50
    MIN_EXPORTS_FOR_UNWIRED = 2
    RECENT_CHANGE_DAYS = 7
    
    # Stability weights
    STABILITY_WEIGHTS = {
        'dependents': 0.30,
        'exports': 0.20,
        'size': 0.15,
        'recency': 0.15,
        'penalties': 0.20
    }
    
    # Archive confidence thresholds
    ARCHIVE_MIN_CONFIDENCE = 70
    
    # Performance
    MAX_WORKERS_IO = 8
    MAX_WORKERS_CPU = 4
    CHUNK_SIZE = 100

# ==== ENUMS ====
class FileCategory(Enum):
    """File category classification"""
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
    UNKNOWN = "Unknown"

class RiskLevel(Enum):
    """Risk level classification"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class Recommendation(Enum):
    """Action recommendations"""
    KEEP = "KEEP"
    REFACTOR = "REFACTOR"
    ARCHIVE = "ARCHIVE"
    DELETE = "DELETE"
    REVIEW = "REVIEW"
    MERGE = "MERGE"

class IssueType(Enum):
    """Code issue types"""
    HIGH_COMPLEXITY = "High Complexity"
    TYPE_SAFETY = "Type Safety"
    UNUSED_EXPORTS = "Unused Exports"
    LARGE_FILE = "Large File"
    DUPLICATE = "Duplicate"
    CIRCULAR_DEPENDENCY = "Circular Dependency"
    MISSING_TESTS = "Missing Tests"

# ==== DATA CLASSES ====
@dataclass
class CodeIssue:
    """Represents a code quality issue"""
    type: IssueType
    severity: RiskLevel
    message: str
    line: Optional[int] = None
    suggestion: Optional[str] = None

@dataclass
class ComponentInfo:
    """React component metadata"""
    name: str
    is_functional: bool
    has_jsx: bool
    hooks_used: List[str] = field(default_factory=list)
    props_count: int = 0
    state_count: int = 0

@dataclass
class DuplicateCluster:
    """Group of duplicate/similar files"""
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
    """Archive recommendation for a file"""
    file_path: str
    should_archive: bool
    confidence: float
    reasons: List[str]
    blockers: List[str]

@dataclass
class FileInfo:
    """Complete file analysis metadata"""
    # Basic info
    path: str
    relative_path: str
    size_bytes: int
    lines: int
    category: FileCategory
    
    # Content hashes
    content_hash: str
    structural_hash: str
    
    # Timestamps
    last_modified: float
    days_since_modified: int
    
    # Code structure
    imports: List[str] = field(default_factory=list)
    exports: List[str] = field(default_factory=list)
    dependencies: List[str] = field(default_factory=list)
    dependents: List[str] = field(default_factory=list)
    
    # Metrics
    cyclomatic_complexity: int = 0
    cognitive_complexity: int = 0
    any_count: int = 0
    comment_ratio: float = 0.0
    
    # Component info
    component: Optional[ComponentInfo] = None
    
    # Flags
    is_entry_point: bool = False
    is_barrel_file: bool = False
    is_barrel_exported: bool = False
    is_dynamic_imported: bool = False
    is_test_file: bool = False
    has_side_effects: bool = False
    
    # Analysis results
    stability_score: float = 0.0
    risk_level: RiskLevel = RiskLevel.LOW
    risk_score: float = 0.0
    recommendation: Recommendation = Recommendation.KEEP
    recommendation_reasons: List[str] = field(default_factory=list)
    recommendation_confidence: float = 0.0
    
    # Issues
    issues: List[CodeIssue] = field(default_factory=list)
    
    # Duplicates
    duplicate_of: Optional[str] = None
    structural_duplicates: List[str] = field(default_factory=list)

@dataclass
class AnalysisReport:
    """Complete analysis report"""
    version: str
    timestamp: str
    project_path: str
    
    # Summary stats
    total_files: int
    total_lines: int
    total_size_bytes: int
    
    # Files by category
    files_by_category: Dict[str, int]
    files_by_risk: Dict[str, int]
    files_by_recommendation: Dict[str, int]
    
    # Detailed results
    files: Dict[str, FileInfo]
    dependency_graph: Dict[str, List[str]]
    duplicate_clusters: List[DuplicateCluster]
    
    # Actionable insights
    unused_files: List[str]
    unwired_features: List[str]
    high_risk_files: List[str]
    archive_candidates: List[ArchiveDecision]
    
    # Performance metrics
    analysis_duration_seconds: float
    cache_hit_rate: float

# ==== UTILITY FUNCTIONS ====
class ColoredFormatter(logging.Formatter):
    """Custom formatter with color support"""
    
    # ANSI color codes
    COLORS = {
        'DEBUG': '\033[36m',    # Cyan
        'INFO': '\033[32m',     # Green
        'WARNING': '\033[33m',  # Yellow
        'ERROR': '\033[31m',    # Red
        'CRITICAL': '\033[35m', # Magenta
        'RESET': '\033[0m'
    }
    
    def __init__(self, fmt=None, datefmt=None, use_color=True):
        super().__init__(fmt, datefmt)
        self.use_color = use_color and sys.stdout.isatty()
    
    def format(self, record):
        if self.use_color:
            levelname = record.levelname
            if levelname in self.COLORS:
                record.levelname = f"{self.COLORS[levelname]}{levelname}{self.COLORS['RESET']}"
        return super().format(record)

def setup_logging(verbose: bool = False) -> logging.Logger:
    """Configure logging with color support"""
    level = logging.DEBUG if verbose else logging.INFO
    
    # Enable ANSI on Windows
    if platform.system() == 'Windows':
        try:
            import ctypes
            kernel32 = ctypes.windll.kernel32
            kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
        except:
            pass
    
    logger = logging.getLogger('CodeIntelligence')
    logger.setLevel(level)
    
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setLevel(level)
        formatter = ColoredFormatter(
            '%(asctime)s - %(levelname)s - %(message)s',
            datefmt='%H:%M:%S'
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    
    return logger

def compute_hash(content: str) -> str:
    """Compute SHA256 hash of content"""
    return hashlib.sha256(content.encode('utf-8')).hexdigest()

def normalize_path(path: Union[str, Path], base: Path) -> str:
    """Normalize path relative to base"""
    p = Path(path).resolve()
    try:
        return str(p.relative_to(base))
    except ValueError:
        return str(p)

def should_ignore(path: Path, ignore_patterns: List[str]) -> bool:
    """Check if path matches ignore patterns"""
    path_str = str(path)
    for pattern in ignore_patterns:
        if pattern in path_str:
            return True
        if path.match(pattern):
            return True
    return False

def jaccard_similarity(set1: Set, set2: Set) -> float:
    """Compute Jaccard similarity between two sets"""
    if not set1 and not set2:
        return 1.0
    if not set1 or not set2:
        return 0.0
    intersection = len(set1 & set2)
    union = len(set1 | set2)
    return intersection / union if union > 0 else 0.0

def sequence_similarity(seq1: List, seq2: List) -> float:
    """Compute sequence similarity using SequenceMatcher"""
    return SequenceMatcher(None, seq1, seq2).ratio()

class FileCache:
    """File metadata cache for performance"""
    
    def __init__(self, cache_path: Path, version: str):
        self.cache_path = cache_path
        self.version = version
        self.data: Dict[str, Dict] = {}
        self.hits = 0
        self.misses = 0
        self.load()
    
    def load(self):
        """Load cache from disk"""
        if self.cache_path.exists():
            try:
                with open(self.cache_path, 'r', encoding='utf-8') as f:
                    cached = json.load(f)
                    if cached.get('version') == self.version:
                        self.data = cached.get('files', {})
            except Exception as e:
                logging.warning(f"Failed to load cache: {e}")
    
    def save(self):
        """Save cache to disk"""
        try:
            with open(self.cache_path, 'w', encoding='utf-8') as f:
                json.dump({
                    'version': self.version,
                    'timestamp': datetime.now().isoformat(),
                    'files': self.data
                }, f, indent=2)
        except Exception as e:
            logging.warning(f"Failed to save cache: {e}")
    
    def get(self, file_path: str, mtime: float) -> Optional[Dict]:
        """Get cached data if valid"""
        if file_path in self.data:
            cached = self.data[file_path]
            if cached.get('mtime') == mtime:
                self.hits += 1
                return cached
        self.misses += 1
        return None
    
    def set(self, file_path: str, mtime: float, data: Dict):
        """Store data in cache"""
        self.data[file_path] = {
            'mtime': mtime,
            **data
        }
    
    def hit_rate(self) -> float:
        """Calculate cache hit rate"""
        total = self.hits + self.misses
        return self.hits / total if total > 0 else 0.0

# ==== TREE-SITTER PARSER ====
class TreeSitterParser:
    """AST parser using tree-sitter"""
    
    def __init__(self):
        self.logger = logging.getLogger('CodeIntelligence')
        self.parser = None
        self.ts_language = None
        self.tsx_language = None
        
        if TREE_SITTER_AVAILABLE:
            try:
                self.ts_language = Language(language_typescript())
                self.tsx_language = Language(language_tsx())
                self.parser = Parser()
                self.logger.info("Tree-sitter initialized successfully")
            except Exception as e:
                self.logger.error(f"Failed to initialize tree-sitter: {e}")
                self.parser = None
    
    def parse(self, content: str, file_path: str) -> Optional[Node]:
        """Parse file content to AST"""
        if not self.parser:
            return None
        
        try:
            # Choose language based on extension
            ext = Path(file_path).suffix
            if ext in {'.tsx', '.jsx'}:
                self.parser.set_language(self.tsx_language)
            else:
                self.parser.set_language(self.ts_language)
            
            tree = self.parser.parse(bytes(content, 'utf-8'))
            return tree.root_node
        except Exception as e:
            self.logger.debug(f"Parse error for {file_path}: {e}")
            return None
    
    def extract_imports(self, node: Node, content: str) -> List[str]:
        """Extract import statements"""
        imports = []
        
        def visit(n: Node):
            if n.type == 'import_statement':
                # Get the source
                source_node = None
                for child in n.children:
                    if child.type == 'string':
                        source_node = child
                        break
                
                if source_node:
                    source = content[source_node.start_byte:source_node.end_byte]
                    # Remove quotes
                    source = source.strip('"\'')
                    imports.append(source)
            
            for child in n.children:
                visit(child)
        
        visit(node)
        return imports
    
    def extract_exports(self, node: Node, content: str) -> List[str]:
        """Extract export names"""
        exports = []
        
        def visit(n: Node):
            # Named exports
            if n.type == 'export_statement':
                for child in n.children:
                    if child.type == 'export_clause':
                        for spec in child.children:
                            if spec.type == 'export_specifier':
                                name_node = spec.child_by_field_name('name')
                                if name_node:
                                    exports.append(content[name_node.start_byte:name_node.end_byte])
                    elif child.type in {'function_declaration', 'class_declaration', 'lexical_declaration'}:
                        # export function foo() or export const foo
                        name_node = self._find_identifier(child, content)
                        if name_node:
                            exports.append(name_node)
            
            # Default export
            elif n.type == 'export_statement' and 'default' in content[n.start_byte:n.end_byte]:
                exports.append('default')
            
            for child in n.children:
                visit(child)
        
        visit(node)
        return list(set(exports))
    
    def _find_identifier(self, node: Node, content: str) -> Optional[str]:
        """Find identifier in node"""
        if node.type == 'identifier':
            return content[node.start_byte:node.end_byte]
        for child in node.children:
            result = self._find_identifier(child, content)
            if result:
                return result
        return None
    
    def extract_hooks(self, node: Node, content: str) -> List[str]:
        """Extract React hook calls"""
        hooks = []
        
        def visit(n: Node):
            if n.type == 'call_expression':
                func = n.child_by_field_name('function')
                if func and func.type == 'identifier':
                    name = content[func.start_byte:func.end_byte]
                    if name.startswith('use'):
                        hooks.append(name)
            
            for child in n.children:
                visit(child)
        
        visit(node)
        return list(set(hooks))
    
    def has_jsx(self, node: Node) -> bool:
        """Check if file contains JSX"""
        def visit(n: Node) -> bool:
            if n.type in {'jsx_element', 'jsx_self_closing_element', 'jsx_fragment'}:
                return True
            return any(visit(child) for child in n.children)
        
        return visit(node)
    
    def count_any(self, node: Node, content: str) -> int:
        """Count 'any' type annotations"""
        count = 0
        
        def visit(n: Node):
            nonlocal count
            if n.type == 'predefined_type':
                text = content[n.start_byte:n.end_byte]
                if text == 'any':
                    count += 1
            for child in n.children:
                visit(child)
        
        visit(node)
        return count
    
    def calculate_complexity(self, node: Node) -> int:
        """Calculate cyclomatic complexity"""
        complexity = 1  # Base complexity
        
        # Decision points that increase complexity
        decision_nodes = {
            'if_statement', 'while_statement', 'for_statement',
            'for_in_statement', 'do_statement', 'switch_case',
            'catch_clause', 'ternary_expression', 'binary_expression'
        }
        
        def visit(n: Node):
            nonlocal complexity
            if n.type in decision_nodes:
                # Binary expressions only count if they're logical operators
                if n.type == 'binary_expression':
                    # Check if it's && or ||
                    for child in n.children:
                        if child.type == '&&' or child.type == '||':
                            complexity += 1
                            break
                else:
                    complexity += 1
            
            for child in n.children:
                visit(child)
        
        visit(node)
        return complexity
    
    def normalize_ast(self, node: Node, content: str) -> str:
        """Normalize AST for structural comparison"""
        tokens = []
        
        def visit(n: Node):
            # Keep structure but remove identifiers and literals
            if n.type in {'identifier', 'string', 'number', 'template_string'}:
                tokens.append(n.type)
            elif n.type in {'comment', 'whitespace'}:
                pass  # Skip
            else:
                tokens.append(n.type)
                for child in n.children:
                    visit(child)
        
        visit(node)
        return '|'.join(sorted(tokens))

# ==== REGEX-BASED FALLBACK PARSER ====
class RegexParser:
    """Fallback parser using improved regex patterns"""
    
    # Improved patterns
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
    
    def extract_imports(self, content: str) -> List[str]:
        """Extract imports using regex"""
        return self.IMPORT_PATTERN.findall(content)
    
    def extract_exports(self, content: str) -> List[str]:
        """Extract exports using regex"""
        exports = self.EXPORT_PATTERN.findall(content)
        if 'export default' in content:
            exports.append('default')
        return list(set(exports))
    
    def extract_hooks(self, content: str) -> List[str]:
        """Extract hook calls using regex"""
        return list(set(self.HOOK_PATTERN.findall(content)))
    
    def has_jsx(self, content: str) -> bool:
        """Check for JSX using regex"""
        return bool(self.JSX_PATTERN.search(content))
    
    def count_any(self, content: str) -> int:
        """Count 'any' annotations"""
        return len(self.ANY_PATTERN.findall(content))
    
    def calculate_complexity(self, content: str) -> int:
        """Estimate complexity by counting keywords"""
        keywords = ['if', 'else', 'while', 'for', 'switch', 'case', 'catch', '&&', '||', '?']
        complexity = 1
        for keyword in keywords:
            complexity += content.count(keyword)
        return complexity

# ==== CORE ANALYZERS ====
class ProjectScanner:
    """Scans project and extracts file metadata"""
    
    def __init__(self, project_path: Path, ignore_patterns: List[str], cache: FileCache):
        self.project_path = project_path
        self.ignore_patterns = ignore_patterns + Config.DEFAULT_IGNORE_PATTERNS
        self.cache = cache
        self.logger = logging.getLogger('CodeIntelligence')
        self.ts_parser = TreeSitterParser()
        self.regex_parser = RegexParser()
    
    def scan(self, use_parallel: bool = True) -> Dict[str, FileInfo]:
        """Scan all files in project"""
        self.logger.info(f"Scanning project: {self.project_path}")
        
        # Find all relevant files
        files_to_scan = self._find_files()
        self.logger.info(f"Found {len(files_to_scan)} files to analyze")
        
        # Process files
        if use_parallel:
            files = self._scan_parallel(files_to_scan)
        else:
            files = self._scan_sequential(files_to_scan)
        
        self.logger.info(f"Successfully analyzed {len(files)} files")
        return files
    
    def _find_files(self) -> List[Path]:
        """Find all files to analyze"""
        files = []
        for root, dirs, filenames in os.walk(self.project_path):
            root_path = Path(root)
            
            # Filter directories
            dirs[:] = [d for d in dirs if not should_ignore(root_path / d, self.ignore_patterns)]
            
            for filename in filenames:
                file_path = root_path / filename
                
                # Skip if ignored
                if should_ignore(file_path, self.ignore_patterns):
                    continue
                
                # Skip markdown files
                if file_path.suffix in Config.EXCLUDED_EXTENSIONS:
                    continue
                
                # Only process relevant files
                if file_path.suffix in Config.TS_EXTENSIONS or file_path.suffix in Config.ASSET_EXTENSIONS:
                    files.append(file_path)
        
        return files
    
    def _scan_sequential(self, files: List[Path]) -> Dict[str, FileInfo]:
        """Scan files sequentially"""
        result = {}
        for file_path in files:
            try:
                file_info = self._analyze_file(file_path)
                if file_info:
                    result[file_info.relative_path] = file_info
            except Exception as e:
                self.logger.error(f"Error analyzing {file_path}: {e}")
        return result
    
    def _scan_parallel(self, files: List[Path]) -> Dict[str, FileInfo]:
        """Scan files in parallel"""
        result = {}
        with ThreadPoolExecutor(max_workers=Config.MAX_WORKERS_IO) as executor:
            future_to_file = {executor.submit(self._analyze_file, f): f for f in files}
            
            for future in as_completed(future_to_file):
                try:
                    file_info = future.result()
                    if file_info:
                        result[file_info.relative_path] = file_info
                except Exception as e:
                    file_path = future_to_file[future]
                    self.logger.error(f"Error analyzing {file_path}: {e}")
        
        return result
    
    def _analyze_file(self, file_path: Path) -> Optional[FileInfo]:
        """Analyze a single file"""
        try:
            # Get file stats
            stat = file_path.stat()
            mtime = stat.st_mtime
            
            # Check cache
            relative_path = normalize_path(file_path, self.project_path)
            cached = self.cache.get(relative_path, mtime)
            
            if cached:
                # Reconstruct FileInfo from cache
                return self._file_info_from_cache(file_path, cached)
            
            # Read content
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            # Analyze
            file_info = self._analyze_content(file_path, content, stat)
            
            # Cache results
            self.cache.set(relative_path, mtime, {
                'content_hash': file_info.content_hash,
                'structural_hash': file_info.structural_hash,
                'lines': file_info.lines,
                'category': file_info.category.value,
                'imports': file_info.imports,
                'exports': file_info.exports,
                'cyclomatic_complexity': file_info.cyclomatic_complexity,
                'any_count': file_info.any_count,
                'is_barrel_file': file_info.is_barrel_file,
                'is_test_file': file_info.is_test_file,
            })
            
            return file_info
            
        except Exception as e:
            self.logger.debug(f"Failed to analyze {file_path}: {e}")
            return None
    
    def _analyze_content(self, file_path: Path, content: str, stat: os.stat_result) -> FileInfo:
        """Analyze file content"""
        # Basic info
        relative_path = normalize_path(file_path, self.project_path)
        lines = content.count('\n') + 1
        content_hash = compute_hash(content)
        
        # Time info
        mtime = stat.st_mtime
        days_since_modified = (time.time() - mtime) / 86400
        
        # Initialize with defaults
        imports = []
        exports = []
        hooks = []
        has_jsx = False
        any_count = 0
        complexity = 0
        structural_hash = ""
        
        # Try tree-sitter first
        if file_path.suffix in Config.TS_EXTENSIONS:
            ast = self.ts_parser.parse(content, str(file_path))
            
            if ast:
                # AST-based extraction
                imports = self.ts_parser.extract_imports(ast, content)
                exports = self.ts_parser.extract_exports(ast, content)
                hooks = self.ts_parser.extract_hooks(ast, content)
                has_jsx = self.ts_parser.has_jsx(ast)
                any_count = self.ts_parser.count_any(ast, content)
                complexity = self.ts_parser.calculate_complexity(ast)
                structural_hash = compute_hash(self.ts_parser.normalize_ast(ast, content))
            else:
                # Fallback to regex
                imports = self.regex_parser.extract_imports(content)
                exports = self.regex_parser.extract_exports(content)
                hooks = self.regex_parser.extract_hooks(content)
                has_jsx = self.regex_parser.has_jsx(content)
                any_count = self.regex_parser.count_any(content)
                complexity = self.regex_parser.calculate_complexity(content)
                structural_hash = compute_hash(content)
        
        # Categorize file
        category = self._categorize_file(file_path, exports, hooks, has_jsx, content)
        
        # Component info
        component = None
        if category == FileCategory.UI_COMPONENT:
            component = ComponentInfo(
                name=file_path.stem,
                is_functional=True,  # Assume functional
                has_jsx=has_jsx,
                hooks_used=hooks,
                props_count=content.count('props.'),
                state_count=len([h for h in hooks if h == 'useState'])
            )
        
        # Flags
        is_barrel = self._is_barrel_file(file_path, exports, imports)
        is_test = self._is_test_file(file_path)
        is_entry = self._is_entry_point(file_path)
        has_side_effects = self._has_side_effects(content)
        
        return FileInfo(
            path=str(file_path),
            relative_path=relative_path,
            size_bytes=stat.st_size,
            lines=lines,
            category=category,
            content_hash=content_hash,
            structural_hash=structural_hash,
            last_modified=mtime,
            days_since_modified=int(days_since_modified),
            imports=imports,
            exports=exports,
            cyclomatic_complexity=complexity,
            any_count=any_count,
            component=component,
            is_barrel_file=is_barrel,
            is_test_file=is_test,
            is_entry_point=is_entry,
            has_side_effects=has_side_effects
        )
    
    def _categorize_file(self, file_path: Path, exports: List[str], hooks: List[str], 
                        has_jsx: bool, content: str) -> FileCategory:
        """Categorize file based on content"""
        name = file_path.name.lower()
        
        # Test files
        if any(x in name for x in ['test', 'spec', '__tests__']):
            return FileCategory.TEST
        
        # Config files
        if any(x in name for x in ['config', 'setup', '.config.']):
            return FileCategory.CONFIGURATION
        
        # Entry points
        if name in ['index.ts', 'index.tsx', 'main.ts', 'app.ts', 'app.tsx']:
            return FileCategory.ENTRY_POINT
        
        # Barrel files
        if name == 'index.ts' and len(exports) > 0:
            return FileCategory.BARREL
        
        # Type definitions
        if file_path.suffix == '.d.ts' or 'types' in name:
            return FileCategory.TYPE_DEFINITION
        
        # Styles
        if file_path.suffix in {'.css', '.scss', '.sass', '.less'}:
            return FileCategory.STYLE
        
        # Assets
        if file_path.suffix in Config.ASSET_EXTENSIONS:
            return FileCategory.ASSET
        
        # Custom hooks
        if any(h.startswith('use') for h in hooks) and len(hooks) > 0:
            return FileCategory.CUSTOM_HOOK
        
        # UI Components
        if has_jsx or 'component' in name.lower():
            return FileCategory.UI_COMPONENT
        
        # Services
        if 'service' in name or 'api' in name:
            return FileCategory.SERVICE
        
        # Utilities
        if 'util' in name or 'helper' in name:
            return FileCategory.UTILITY
        
        # Core logic
        if len(exports) > 0 and not has_jsx:
            return FileCategory.CORE_LOGIC
        
        return FileCategory.UNKNOWN
    
    def _is_barrel_file(self, file_path: Path, exports: List[str], imports: List[str]) -> bool:
        """Check if file is a barrel (re-exports)"""
        if file_path.name != 'index.ts' and file_path.name != 'index.tsx':
            return False
        return len(exports) > 0 and len(imports) > 0
    
    def _is_test_file(self, file_path: Path) -> bool:
        """Check if file is a test"""
        name = file_path.name.lower()
        return any(x in name for x in ['test', 'spec', '__tests__'])
    
    def _is_entry_point(self, file_path: Path) -> bool:
        """Check if file is an entry point"""
        name = file_path.name.lower()
        return name in ['index.ts', 'index.tsx', 'main.ts', 'main.tsx', 'app.ts', 'app.tsx']
    
    def _has_side_effects(self, content: str) -> bool:
        """Detect side effects in code"""
        side_effect_patterns = [
            r'console\.',
            r'window\.',
            r'document\.',
            r'localStorage\.',
            r'sessionStorage\.',
            r'fetch\(',
            r'XMLHttpRequest',
        ]
        return any(re.search(pattern, content) for pattern in side_effect_patterns)
    
    def _file_info_from_cache(self, file_path: Path, cached: Dict) -> FileInfo:
        """Reconstruct FileInfo from cache"""
        stat = file_path.stat()
        relative_path = normalize_path(file_path, self.project_path)
        
        return FileInfo(
            path=str(file_path),
            relative_path=relative_path,
            size_bytes=stat.st_size,
            lines=cached['lines'],
            category=FileCategory(cached['category']),
            content_hash=cached['content_hash'],
            structural_hash=cached['structural_hash'],
            last_modified=stat.st_mtime,
            days_since_modified=int((time.time() - stat.st_mtime) / 86400),
            imports=cached['imports'],
            exports=cached['exports'],
            cyclomatic_complexity=cached['cyclomatic_complexity'],
            any_count=cached['any_count'],
            is_barrel_file=cached['is_barrel_file'],
            is_test_file=cached['is_test_file']
        )


class DependencyGraphBuilder:
    """Builds dependency graph and resolves imports"""
    
    def __init__(self, project_path: Path, files: Dict[str, FileInfo]):
        self.project_path = project_path
        self.files = files
        self.logger = logging.getLogger('CodeIntelligence')
        self.graph: Dict[str, List[str]] = defaultdict(list)
    
    def build(self) -> Dict[str, List[str]]:
        """Build complete dependency graph"""
        self.logger.info("Building dependency graph...")
        
        # First pass: resolve all imports
        for file_path, file_info in self.files.items():
            for import_path in file_info.imports:
                resolved = self._resolve_import(file_path, import_path)
                if resolved:
                    file_info.dependencies.append(resolved)
                    self.graph[file_path].append(resolved)
        
        # Second pass: build reverse dependencies
        for file_path, dependencies in self.graph.items():
            for dep in dependencies:
                if dep in self.files:
                    self.files[dep].dependents.append(file_path)
        
        # Third pass: mark barrel-exported files
        self._mark_barrel_exports()
        
        # Fourth pass: detect dynamic imports
        self._detect_dynamic_imports()
        
        self.logger.info(f"Dependency graph built: {len(self.graph)} nodes")
        return dict(self.graph)
    
    def _resolve_import(self, from_file: str, import_path: str) -> Optional[str]:
        """Resolve import to actual file path"""
        # Skip external modules
        if not import_path.startswith('.'):
            return None
        
        from_path = Path(self.project_path) / from_file
        from_dir = from_path.parent
        
        # Resolve relative path
        target = (from_dir / import_path).resolve()
        
        # Try different extensions
        for ext in Config.TS_EXTENSIONS:
            candidate = target.with_suffix(ext)
            rel_path = normalize_path(candidate, self.project_path)
            if rel_path in self.files:
                return rel_path
        
        # Try as directory with index
        for ext in ['.ts', '.tsx']:
            candidate = target / f'index{ext}'
            rel_path = normalize_path(candidate, self.project_path)
            if rel_path in self.files:
                return rel_path
        
        return None
    
    def _mark_barrel_exports(self):
        """Mark files that are re-exported through barrels"""
        for file_path, file_info in self.files.items():
            if file_info.is_barrel_file:
                # Mark all dependencies as barrel-exported
                for dep in file_info.dependencies:
                    if dep in self.files:
                        self.files[dep].is_barrel_exported = True
    
    def _detect_dynamic_imports(self):
        """Detect dynamic imports"""
        dynamic_pattern = re.compile(r'import\s*\(["\']([^"\']+)["\']\)')
        
        for file_path, file_info in self.files.items():
            try:
                with open(file_info.path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    matches = dynamic_pattern.findall(content)
                    if matches:
                        for match in matches:
                            resolved = self._resolve_import(file_path, match)
                            if resolved and resolved in self.files:
                                self.files[resolved].is_dynamic_imported = True
            except:
                pass


class DuplicateDetector:
    """Detects exact and structural duplicates"""
    
    def __init__(self, files: Dict[str, FileInfo], threshold: float = 0.85):
        self.files = files
        self.threshold = threshold
        self.logger = logging.getLogger('CodeIntelligence')
    
    def detect(self, use_parallel: bool = True) -> List[DuplicateCluster]:
        """Detect all duplicates"""
        self.logger.info("Detecting duplicates...")
        
        # Exact duplicates
        exact = self._find_exact_duplicates()
        
        # Structural duplicates
        structural = self._find_structural_duplicates(use_parallel)
        
        clusters = exact + structural
        self.logger.info(f"Found {len(clusters)} duplicate clusters")
        return clusters
    
    def _find_exact_duplicates(self) -> List[DuplicateCluster]:
        """Find exact content duplicates"""
        hash_groups = defaultdict(list)
        
        for file_path, file_info in self.files.items():
            if file_info.category not in {FileCategory.ASSET, FileCategory.CONFIGURATION}:
                hash_groups[file_info.content_hash].append(file_path)
        
        clusters = []
        for content_hash, files in hash_groups.items():
            if len(files) > 1:
                # Pick base file (shortest path or first alphabetically)
                base = min(files, key=lambda f: (len(f), f))
                
                cluster = DuplicateCluster(
                    cluster_id=f"exact_{content_hash[:8]}",
                    similarity_score=1.0,
                    files=files,
                    base_file=base,
                    merge_target=base,
                    diff_summary="Exact duplicates - no differences",
                    estimated_savings_lines=sum(self.files[f].lines for f in files[1:]),
                    confidence=100.0
                )
                clusters.append(cluster)
                
                # Mark duplicates
                for f in files:
                    if f != base:
                        self.files[f].duplicate_of = base
        
        return clusters
    
    def _find_structural_duplicates(self, use_parallel: bool) -> List[DuplicateCluster]:
        """Find structural duplicates using AST similarity"""
        # Group by structural hash (pre-filter)
        hash_groups = defaultdict(list)
        
        for file_path, file_info in self.files.items():
            if (file_info.category not in {FileCategory.ASSET, FileCategory.CONFIGURATION} and
                not file_info.duplicate_of):  # Skip already marked as exact duplicate
                hash_groups[file_info.structural_hash].append(file_path)
        
        # Only check groups with multiple files
        candidate_groups = [files for files in hash_groups.values() if len(files) > 1]
        
        if not candidate_groups:
            return []
        
        # Compute pairwise similarities
        if use_parallel:
            clusters = self._compute_similarities_parallel(candidate_groups)
        else:
            clusters = self._compute_similarities_sequential(candidate_groups)
        
        return clusters
    
    def _compute_similarities_sequential(self, groups: List[List[str]]) -> List[DuplicateCluster]:
        """Compute similarities sequentially"""
        clusters = []
        
        for group in groups:
            cluster = self._analyze_group(group)
            if cluster:
                clusters.append(cluster)
        
        return clusters
    
    def _compute_similarities_parallel(self, groups: List[List[str]]) -> List[DuplicateCluster]:
        """Compute similarities in parallel"""
        clusters = []
        
        with ProcessPoolExecutor(max_workers=Config.MAX_WORKERS_CPU) as executor:
            futures = [executor.submit(self._analyze_group, group) for group in groups]
            
            for future in as_completed(futures):
                try:
                    cluster = future.result()
                    if cluster:
                        clusters.append(cluster)
                except Exception as e:
                    self.logger.error(f"Error in similarity computation: {e}")
        
        return clusters
    
    def _analyze_group(self, files: List[str]) -> Optional[DuplicateCluster]:
        """Analyze a group of structurally similar files"""
        # Read all file contents
        contents = {}
        for f in files:
            try:
                with open(self.files[f].path, 'r', encoding='utf-8', errors='ignore') as file:
                    contents[f] = file.read()
            except:
                continue
        
        if len(contents) < 2:
            return None
        
        # Greedy clustering to avoid O(n²)
        visited = set()
        best_cluster = None
        best_score = 0
        
        for file1 in contents:
            if file1 in visited:
                continue
            
            cluster_files = [file1]
            visited.add(file1)
            
            for file2 in contents:
                if file2 in visited:
                    continue
                
                similarity = self._compute_similarity(contents[file1], contents[file2])
                
                if similarity >= self.threshold:
                    cluster_files.append(file2)
                    visited.add(file2)
            
            if len(cluster_files) > 1:
                avg_similarity = sum(
                    self._compute_similarity(contents[f1], contents[f2])
                    for i, f1 in enumerate(cluster_files)
                    for f2 in cluster_files[i+1:]
                ) / (len(cluster_files) * (len(cluster_files) - 1) / 2)
                
                if avg_similarity > best_score:
                    best_score = avg_similarity
                    best_cluster = cluster_files
        
        if not best_cluster or len(best_cluster) < 2:
            return None
        
        # Create cluster
        base_file = self._select_base_file(best_cluster)
        merge_target = base_file
        
        # Generate diff summary
        diff_summary = self._generate_diff_summary(
            contents[base_file],
            contents[best_cluster[1]] if len(best_cluster) > 1 else contents[base_file]
        )
        
        # Calculate savings
        savings = sum(self.files[f].lines for f in best_cluster[1:])
        
        # Mark as structural duplicates
        for f in best_cluster:
            if f != base_file:
                self.files[f].structural_duplicates.append(base_file)
        
        return DuplicateCluster(
            cluster_id=f"structural_{compute_hash(''.join(best_cluster))[:8]}",
            similarity_score=best_score,
            files=best_cluster,
            base_file=base_file,
            merge_target=merge_target,
            diff_summary=diff_summary,
            estimated_savings_lines=savings,
            confidence=best_score * 100
        )
    
    def _compute_similarity(self, content1: str, content2: str) -> float:
        """Compute similarity between two file contents"""
        # Tokenize
        tokens1 = set(re.findall(r'\b\w+\b', content1))
        tokens2 = set(re.findall(r'\b\w+\b', content2))
        
        # Jaccard similarity
        jaccard = jaccard_similarity(tokens1, tokens2)
        
        # Sequence similarity
        lines1 = content1.split('\n')
        lines2 = content2.split('\n')
        sequence = sequence_similarity(lines1, lines2)
        
        # Combined score
        return (jaccard * 0.4 + sequence * 0.6)
    
    def _select_base_file(self, files: List[str]) -> str:
        """Select the best file to keep as base"""
        scores = {}
        
        for f in files:
            info = self.files[f]
            score = 0
            
            # Prefer files with more dependents
            score += len(info.dependents) * 10
            
            # Prefer files that are barrel-exported
            if info.is_barrel_exported:
                score += 20
            
            # Prefer files with better names
            if 'index' in f.lower():
                score += 5
            
            # Prefer shorter paths
            score -= len(f.split('/'))
            
            scores[f] = score
        
        return max(scores, key=scores.get)
    
    def _generate_diff_summary(self, content1: str, content2: str) -> str:
        """Generate human-readable diff summary"""
        lines1 = content1.split('\n')
        lines2 = content2.split('\n')
        
        # Find differences
        matcher = SequenceMatcher(None, lines1, lines2)
        diffs = []
        
        for tag, i1, i2, j1, j2 in matcher.get_opcodes():
            if tag == 'replace':
                diffs.append(f"• Lines {i1+1}-{i2} differ")
            elif tag == 'delete':
                diffs.append(f"• File 1 has {i2-i1} extra lines at {i1+1}")
            elif tag == 'insert':
                diffs.append(f"• File 2 has {j2-j1} extra lines at {j1+1}")
        
        if not diffs:
            return "No significant differences"
        
        return '\n'.join(diffs[:5])  # Limit to top 5


class UsageAnalyzer:
    """Analyzes file usage patterns"""
    
    def __init__(self, files: Dict[str, FileInfo]):
        self.files = files
        self.logger = logging.getLogger('CodeIntelligence')
    
    def analyze(self) -> Tuple[List[str], List[str]]:
        """Find unused files and unwired features"""
        self.logger.info("Analyzing usage patterns...")
        
        unused = self._find_unused_files()
        unwired = self._find_unwired_features()
        
        self.logger.info(f"Found {len(unused)} unused files, {len(unwired)} unwired features")
        return unused, unwired
    
    def _find_unused_files(self) -> List[str]:
        """Find files with exports but no dependents"""
        unused = []
        
        for file_path, file_info in self.files.items():
            # Has exports but no dependents
            if len(file_info.exports) > 0 and len(file_info.dependents) == 0:
                # Exclude certain categories
                if file_info.category in {FileCategory.ENTRY_POINT, FileCategory.CONFIGURATION,
                                         FileCategory.TEST, FileCategory.ASSET}:
                    continue
                
                # Exclude barrel-exported and dynamic imports
                if file_info.is_barrel_exported or file_info.is_dynamic_imported:
                    continue
                
                unused.append(file_path)
        
        return unused
    
    def _find_unwired_features(self) -> List[str]:
        """Find substantial features with no usage"""
        unwired = []
        
        for file_path, file_info in self.files.items():
            # Substantial file
            if file_info.lines < Config.MIN_LINES_FOR_UNWIRED:
                continue
            
            # Multiple exports
            if len(file_info.exports) < Config.MIN_EXPORTS_FOR_UNWIRED:
                continue
            
            # No dependents
            if len(file_info.dependents) > 0:
                continue
            
            # Relevant category
            if file_info.category not in {FileCategory.UI_COMPONENT, FileCategory.SERVICE,
                                         FileCategory.CUSTOM_HOOK, FileCategory.CORE_LOGIC}:
                continue
            
            # Not dynamically imported or barrel-exported
            if file_info.is_dynamic_imported or file_info.is_barrel_exported:
                continue
            
            unwired.append(file_path)
        
        return unwired


class StabilityCalculator:
    """Calculates stability scores for files"""
    
    def __init__(self, files: Dict[str, FileInfo]):
        self.files = files
        self.logger = logging.getLogger('CodeIntelligence')
    
    def calculate(self):
        """Calculate stability scores for all files"""
        self.logger.info("Calculating stability scores...")
        
        for file_path, file_info in self.files.items():
            score = self._calculate_score(file_info)
            file_info.stability_score = score
    
    def _calculate_score(self, file_info: FileInfo) -> float:
        """Calculate stability score (0-10)"""
        weights = Config.STABILITY_WEIGHTS
        
        # Dependents factor (more dependents = more stable)
        dep_score = min(len(file_info.dependents) / 10, 1.0) * 10
        
        # Exports factor (more exports = potentially less stable)
        exp_score = max(10 - len(file_info.exports), 0)
        
        # Size factor (larger = more complex = less stable)
        size_score = max(10 - (file_info.lines / 100), 0)
        
        # Recency factor (recently modified = less stable)
        if file_info.days_since_modified < Config.RECENT_CHANGE_DAYS:
            recency_score = 5
        else:
            recency_score = 10
        
        # Penalties
        penalty_score = 10
        if file_info.cyclomatic_complexity > 20:
            penalty_score -= 2
        if file_info.any_count > 5:
            penalty_score -= 2
        if len(file_info.issues) > 0:
            penalty_score -= 1
        
        # Boosts
        if file_info.is_barrel_exported:
            penalty_score += 1
        if file_info.category == FileCategory.CORE_LOGIC:
            penalty_score += 1
        
        # Weighted sum
        score = (
            dep_score * weights['dependents'] +
            exp_score * weights['exports'] +
            size_score * weights['size'] +
            recency_score * weights['recency'] +
            penalty_score * weights['penalties']
        )
        
        return round(max(0, min(10, score)), 2)


class RiskCalculator:
    """Calculates risk levels for files"""
    
    def __init__(self, files: Dict[str, FileInfo]):
        self.files = files
        self.logger = logging.getLogger('CodeIntelligence')
    
    def calculate(self):
        """Calculate risk levels for all files"""
        self.logger.info("Calculating risk levels...")
        
        for file_path, file_info in self.files.items():
            risk_score, risk_level = self._calculate_risk(file_info)
            file_info.risk_score = risk_score
            file_info.risk_level = risk_level
    
    def _calculate_risk(self, file_info: FileInfo) -> Tuple[float, RiskLevel]:
        """Calculate risk score and level"""
        score = 0
        
        # High dependents = high risk if changed
        if len(file_info.dependents) > 10:
            score += 30
        elif len(file_info.dependents) > 5:
            score += 20
        elif len(file_info.dependents) > 0:
            score += 10
        
        # Critical categories
        if file_info.category in {FileCategory.CORE_LOGIC, FileCategory.SERVICE}:
            score += 20
        
        # Side effects
        if file_info.has_side_effects:
            score += 15
        
        # Complexity
        if file_info.cyclomatic_complexity > 20:
            score += 15
        elif file_info.cyclomatic_complexity > 10:
            score += 10
        
        # Dynamic imports (harder to trace)
        if file_info.is_dynamic_imported:
            score += 10
        
        # Type safety
        if file_info.any_count > 10:
            score += 15
        elif file_info.any_count > 5:
            score += 10
        
        # Recent changes
        if file_info.days_since_modified < 7:
            score += 10
        
        # Determine level
        if score >= 70:
            level = RiskLevel.CRITICAL
        elif score >= 50:
            level = RiskLevel.HIGH
        elif score >= 30:
            level = RiskLevel.MEDIUM
        else:
            level = RiskLevel.LOW
        
        return score, level


class RecommendationEngine:
    """Generates actionable recommendations"""
    
    def __init__(self, files: Dict[str, FileInfo], duplicates: List[DuplicateCluster],
                 unused: List[str], unwired: List[str]):
        self.files = files
        self.duplicates = duplicates
        self.unused = unused
        self.unwired = unwired
        self.logger = logging.getLogger('CodeIntelligence')
    
    def generate(self):
        """Generate recommendations for all files"""
        self.logger.info("Generating recommendations...")
        
        for file_path, file_info in self.files.items():
            rec, reasons, confidence = self._generate_recommendation(file_path, file_info)
            file_info.recommendation = rec
            file_info.recommendation_reasons = reasons
            file_info.recommendation_confidence = confidence
    
    def _generate_recommendation(self, file_path: str, file_info: FileInfo) -> Tuple[Recommendation, List[str], float]:
        """Generate recommendation for a single file"""
        reasons = []
        confidence = 50.0
        
        # Decision tree
        
        # 1. Exact duplicate
        if file_info.duplicate_of:
            return (Recommendation.DELETE, 
                   [f"Exact duplicate of {file_info.duplicate_of}"],
                   95.0)
        
        # 2. Structural duplicate
        if file_info.structural_duplicates:
            return (Recommendation.MERGE,
                   [f"Structurally similar to {len(file_info.structural_duplicates)} files"],
                   85.0)
        
        # 3. Unused file
        if file_path in self.unused:
            if file_info.days_since_modified > 90:
                return (Recommendation.ARCHIVE,
                       ["No dependents", "Not modified in 90+ days"],
                       90.0)
            else:
                return (Recommendation.REVIEW,
                       ["No dependents", "Recently modified"],
                       70.0)
        
        # 4. Unwired feature
        if file_path in self.unwired:
            return (Recommendation.REVIEW,
                   ["Substantial feature with no usage"],
                   80.0)
        
        # 5. High complexity
        if file_info.cyclomatic_complexity > 20:
            reasons.append("High cyclomatic complexity")
            confidence += 10
            
            if file_info.lines > 300:
                return (Recommendation.REFACTOR,
                       reasons + ["Large file size"],
                       85.0)
        
        # 6. Type safety issues
        if file_info.any_count > 10:
            reasons.append(f"{file_info.any_count} 'any' type annotations")
            confidence += 10
            
            if file_info.risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}:
                return (Recommendation.REFACTOR,
                       reasons + ["High risk level"],
                       80.0)
        
        # 7. High risk but stable
        if file_info.risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}:
            if file_info.stability_score > 7:
                return (Recommendation.KEEP,
                       ["High risk but high stability", "Many dependents"],
                       90.0)
            else:
                return (Recommendation.REVIEW,
                       ["High risk", "Low stability"],
                       75.0)
        
        # 8. Default: keep
        return (Recommendation.KEEP,
               ["No significant issues"],
               confidence)


class ArchiveDecisionEngine:
    """Decides which files can be safely archived"""
    
    def __init__(self, files: Dict[str, FileInfo]):
        self.files = files
        self.logger = logging.getLogger('CodeIntelligence')
    
    def analyze(self) -> List[ArchiveDecision]:
        """Analyze all files for archive candidacy"""
        self.logger.info("Analyzing archive candidates...")
        
        decisions = []
        for file_path, file_info in self.files.items():
            decision = self._analyze_file(file_path, file_info)
            decisions.append(decision)
        
        # Sort by confidence
        decisions.sort(key=lambda d: d.confidence, reverse=True)
        
        return decisions
    
    def _analyze_file(self, file_path: str, file_info: FileInfo) -> ArchiveDecision:
        """Analyze single file for archiving"""
        blockers = []
        reasons = []
        confidence = 50.0
        
        # Hard blockers
        
        # 1. Has dependents
        if len(file_info.dependents) > 0:
            blockers.append(f"Has {len(file_info.dependents)} dependents")
            return ArchiveDecision(file_path, False, 0, reasons, blockers)
        
        # 2. Entry point
        if file_info.is_entry_point:
            blockers.append("Entry point file")
            return ArchiveDecision(file_path, False, 0, reasons, blockers)
        
        # 3. Barrel file
        if file_info.is_barrel_file:
            blockers.append("Barrel file")
            return ArchiveDecision(file_path, False, 0, reasons, blockers)
        
        # 4. Configuration
        if file_info.category == FileCategory.CONFIGURATION:
            blockers.append("Configuration file")
            return ArchiveDecision(file_path, False, 0, reasons, blockers)
        
        # 5. Recently modified
        if file_info.days_since_modified < Config.RECENT_CHANGE_DAYS:
            blockers.append(f"Modified {file_info.days_since_modified} days ago")
            return ArchiveDecision(file_path, False, 0, reasons, blockers)
        
        # 6. Dynamic import
        if file_info.is_dynamic_imported:
            blockers.append("Dynamically imported")
            return ArchiveDecision(file_path, False, 0, reasons, blockers)
        
        # Positive factors
        
        # No exports
        if len(file_info.exports) == 0:
            reasons.append("No exports")
            confidence += 20
        
        # Old file
        if file_info.days_since_modified > 180:
            reasons.append(f"Not modified in {file_info.days_since_modified} days")
            confidence += 15
        elif file_info.days_since_modified > 90:
            reasons.append(f"Not modified in {file_info.days_since_modified} days")
            confidence += 10
        
        # Test file
        if file_info.is_test_file:
            reasons.append("Test file")
            confidence += 10
        
        # Small file
        if file_info.lines < 50:
            reasons.append("Small file")
            confidence += 5
        
        # Unused
        if file_info.recommendation == Recommendation.ARCHIVE:
            reasons.append("Recommended for archiving")
            confidence += 20
        
        # Negative factors
        
        # Barrel exported
        if file_info.is_barrel_exported:
            reasons.append("Barrel exported (use caution)")
            confidence -= 10
        
        # Core logic
        if file_info.category == FileCategory.CORE_LOGIC:
            reasons.append("Core logic (review carefully)")
            confidence -= 15
        
        should_archive = confidence >= Config.ARCHIVE_MIN_CONFIDENCE
        
        return ArchiveDecision(
            file_path=file_path,
            should_archive=should_archive,
            confidence=round(confidence, 2),
            reasons=reasons,
            blockers=blockers
        )


class ArchiveBuilder:
    """Creates safe archives of files"""
    
    def __init__(self, project_path: Path, report_dir: Path):
        self.project_path = project_path
        self.report_dir = report_dir
        self.archive_dir = report_dir / Config.ARCHIVES_SUBDIR
        self.logger = logging.getLogger('CodeIntelligence')
    
    def create_archive(self, files: List[str], decisions: Dict[str, ArchiveDecision]) -> Optional[Path]:
        """Create ZIP archive of files"""
        if not files:
            self.logger.warning("No files to archive")
            return None
        
        self.logger.info(f"Creating archive of {len(files)} files...")
        
        # Create archive directory
        self.archive_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate archive name
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        archive_name = f"archive_{timestamp}.zip"
        archive_path = self.archive_dir / archive_name
        
        # Create temporary directory
        import tempfile
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            
            # Copy files
            copied = 0
            for file_rel_path in files:
                src = self.project_path / file_rel_path
                dst = temp_path / file_rel_path
                
                try:
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(src, dst)
                    copied += 1
                except Exception as e:
                    self.logger.error(f"Failed to copy {file_rel_path}: {e}")
            
            if copied == 0:
                self.logger.error("No files copied successfully")
                return None
            
            # Create manifest
            manifest = {
                'timestamp': timestamp,
                'total_files': len(files),
                'copied_files': copied,
                'files': [
                    {
                        'path': f,
                        'confidence': decisions[f].confidence,
                        'reasons': decisions[f].reasons
                    }
                    for f in files if f in decisions
                ]
            }
            
            manifest_path = temp_path / 'ARCHIVE_MANIFEST.json'
            with open(manifest_path, 'w', encoding='utf-8') as f:
                json.dump(manifest, f, indent=2)
            
            # Create ZIP
            with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for root, dirs, filenames in os.walk(temp_path):
                    for filename in filenames:
                        file_path = Path(root) / filename
                        arcname = file_path.relative_to(temp_path)
                        zipf.write(file_path, arcname)
        
        self.logger.info(f"Archive created: {archive_path}")
        
        # Update latest symlink/copy
        latest_path = self.archive_dir / 'latest_archive.zip'
        if latest_path.exists():
            latest_path.unlink()
        
        try:
            # Try symlink first (Unix)
            latest_path.symlink_to(archive_path.name)
        except:
            # Fall back to copy (Windows)
            shutil.copy2(archive_path, latest_path)
        
        return archive_path


# ==== REPORTING ====
class ReportGenerator:
    """Generates all report formats"""
    
    def __init__(self, report: AnalysisReport, report_dir: Path):
        self.report = report
        self.report_dir = report_dir
        self.logger = logging.getLogger('CodeIntelligence')
    
    def generate_all(self, keep_history: bool = False):
        """Generate all reports"""
        self.logger.info(f"Generating reports in {self.report_dir}...")
        
        # Create report directory
        self.report_dir.mkdir(parents=True, exist_ok=True)
        
        # Backup previous reports if requested
        if keep_history:
            self._backup_previous_reports()
        
        # Generate reports
        self._generate_full_json()
        self._generate_summary_json()
        self._generate_high_risk_csv()
        self._generate_html_dashboard()
        self._generate_dependency_graph_json()
        
        self.logger.info("All reports generated successfully")
    
    def _backup_previous_reports(self):
        """Backup previous reports to history folder"""
        history_dir = self.report_dir / Config.HISTORY_SUBDIR
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = history_dir / timestamp
        
        # Check if any reports exist
        report_files = [
            'full_report.json',
            'summary_report.json',
            'high_risk.csv',
            'optimization_dashboard.html',
            'dependency_graph.json'
        ]
        
        existing = [f for f in report_files if (self.report_dir / f).exists()]
        
        if existing:
            backup_dir.mkdir(parents=True, exist_ok=True)
            for filename in existing:
                src = self.report_dir / filename
                dst = backup_dir / filename
                shutil.copy2(src, dst)
            
            self.logger.info(f"Previous reports backed up to {backup_dir}")
    
    def _generate_full_json(self):
        """Generate complete JSON report"""
        output_path = self.report_dir / 'full_report.json'
        
        # Convert to dict
        report_dict = {
            'version': self.report.version,
            'timestamp': self.report.timestamp,
            'project_path': self.report.project_path,
            'summary': {
                'total_files': self.report.total_files,
                'total_lines': self.report.total_lines,
                'total_size_bytes': self.report.total_size_bytes,
                'files_by_category': self.report.files_by_category,
                'files_by_risk': self.report.files_by_risk,
                'files_by_recommendation': self.report.files_by_recommendation,
            },
            'files': {
                path: self._file_info_to_dict(info)
                for path, info in self.report.files.items()
            },
            'dependency_graph': self.report.dependency_graph,
            'duplicate_clusters': [
                self._cluster_to_dict(c) for c in self.report.duplicate_clusters
            ],
            'unused_files': self.report.unused_files,
            'unwired_features': self.report.unwired_features,
            'high_risk_files': self.report.high_risk_files,
            'archive_candidates': [
                self._decision_to_dict(d) for d in self.report.archive_candidates
            ],
            'performance': {
                'analysis_duration_seconds': self.report.analysis_duration_seconds,
                'cache_hit_rate': self.report.cache_hit_rate
            }
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report_dict, f, indent=2)
    
    def _generate_summary_json(self):
        """Generate summary JSON report"""
        output_path = self.report_dir / 'summary_report.json'
        
        summary = {
            'version': self.report.version,
            'timestamp': self.report.timestamp,
            'project_path': self.report.project_path,
            'statistics': {
                'total_files': self.report.total_files,
                'total_lines': self.report.total_lines,
                'total_size_mb': round(self.report.total_size_bytes / 1024 / 1024, 2),
                'files_by_category': self.report.files_by_category,
                'files_by_risk': self.report.files_by_risk,
                'files_by_recommendation': self.report.files_by_recommendation,
            },
            'insights': {
                'duplicate_clusters': len(self.report.duplicate_clusters),
                'unused_files': len(self.report.unused_files),
                'unwired_features': len(self.report.unwired_features),
                'high_risk_files': len(self.report.high_risk_files),
                'archive_candidates': len([d for d in self.report.archive_candidates if d.should_archive]),
            },
            'performance': {
                'analysis_duration_seconds': round(self.report.analysis_duration_seconds, 2),
                'cache_hit_rate': round(self.report.cache_hit_rate * 100, 2)
            }
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2)
    
    def _generate_high_risk_csv(self):
        """Generate CSV of high-risk files"""
        output_path = self.report_dir / 'high_risk.csv'
        
        high_risk = [
            (path, info) for path, info in self.report.files.items()
            if info.risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}
        ]
        
        # Sort by risk score
        high_risk.sort(key=lambda x: x[1].risk_score, reverse=True)
        
        with open(output_path, 'w', encoding='utf-8', newline='') as f:
            import csv
            writer = csv.writer(f)
            
            # Header
            writer.writerow([
                'File Path', 'Risk Level', 'Risk Score', 'Category',
                'Dependents', 'Complexity', 'Any Count', 'Recommendation'
            ])
            
            # Rows
            for path, info in high_risk:
                writer.writerow([
                    path,
                    info.risk_level.value,
                    info.risk_score,
                    info.category.value,
                    len(info.dependents),
                    info.cyclomatic_complexity,
                    info.any_count,
                    info.recommendation.value
                ])
    
    def _generate_dependency_graph_json(self):
        """Generate dependency graph in JSON format"""
        output_path = self.report_dir / 'dependency_graph.json'
        
        # Convert to vis-network format
        nodes = []
        edges = []
        
        for path, info in self.report.files.items():
            # Node
            nodes.append({
                'id': path,
                'label': Path(path).name,
                'title': f"{path}\n{info.category.value}\nRisk: {info.risk_level.value}",
                'group': info.category.value,
                'value': len(info.dependents) + 1,
                'color': self._get_risk_color(info.risk_level)
            })
            
            # Edges
            for dep in info.dependencies:
                if dep in self.report.files:
                    edges.append({
                        'from': path,
                        'to': dep,
                        'arrows': 'to'
                    })
        
        graph_data = {
            'nodes': nodes,
            'edges': edges
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(graph_data, f, indent=2)
    
    def _generate_html_dashboard(self):
        """Generate interactive HTML dashboard"""
        output_path = self.report_dir / 'optimization_dashboard.html'
        
        html_content = self._build_html_dashboard()
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html_content)
    
    def _build_html_dashboard(self) -> str:
        """Build HTML dashboard content"""
        # Load dependency graph
        graph_path = self.report_dir / 'dependency_graph.json'
        with open(graph_path, 'r', encoding='utf-8') as f:
            graph_data = json.load(f)
        
        # Build HTML
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Intelligence Dashboard</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: #0f0f23;
            color: #e0e0e0;
            line-height: 1.6;
        }}
        
        .header {{
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 2rem;
            box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        }}
        
        .header h1 {{
            font-size: 2rem;
            margin-bottom: 0.5rem;
        }}
        
        .header .meta {{
            opacity: 0.9;
            font-size: 0.9rem;
        }}
        
        .container {{
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }}
        
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }}
        
        .stat-card {{
            background: #1a1a2e;
            padding: 1.5rem;
            border-radius: 12px;
            border: 1px solid #2a2a3e;
            transition: transform 0.2s, box-shadow 0.2s;
        }}
        
        .stat-card:hover {{
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(0,0,0,0.3);
        }}
        
        .stat-card h3 {{
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: #888;
            margin-bottom: 0.5rem;
        }}
        
        .stat-card .value {{
            font-size: 2rem;
            font-weight: bold;
            color: #667eea;
        }}
        
        .section {{
            background: #1a1a2e;
            padding: 2rem;
            border-radius: 12px;
            border: 1px solid #2a2a3e;
            margin-bottom: 2rem;
        }}
        
        .section h2 {{
            margin-bottom: 1rem;
            color: #667eea;
            font-size: 1.5rem;
        }}
        
        #graph {{
            width: 100%;
            height: 600px;
            border: 1px solid #2a2a3e;
            border-radius: 8px;
            background: #0f0f23;
        }}
        
        table {{
            width: 100%;
            border-collapse: collapse;
        }}
        
        th, td {{
            padding: 0.75rem;
            text-align: left;
            border-bottom: 1px solid #2a2a3e;
        }}
        
        th {{
            background: #16213e;
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.75rem;
            letter-spacing: 1px;
            color: #888;
        }}
        
        tr:hover {{
            background: #16213e;
        }}
        
        .badge {{
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
        }}
        
        .badge-critical {{ background: #e63946; color: white; }}
        .badge-high {{ background: #f77f00; color: white; }}
        .badge-medium {{ background: #fcbf49; color: #000; }}
        .badge-low {{ background: #06d6a0; color: white; }}
        
        .search-box {{
            width: 100%;
            padding: 0.75rem;
            background: #0f0f23;
            border: 1px solid #2a2a3e;
            border-radius: 8px;
            color: #e0e0e0;
            font-size: 1rem;
            margin-bottom: 1rem;
        }}
        
        .search-box:focus {{
            outline: none;
            border-color: #667eea;
        }}
        
        .collapsible {{
            cursor: pointer;
            user-select: none;
        }}
        
        .collapsible:hover {{
            color: #667eea;
        }}
        
        .collapsible::before {{
            content: '▼ ';
            display: inline-block;
            transition: transform 0.2s;
        }}
        
        .collapsible.collapsed::before {{
            transform: rotate(-90deg);
        }}
        
        .collapsible-content {{
            max-height: 1000px;
            overflow: hidden;
            transition: max-height 0.3s ease-out;
        }}
        
        .collapsible-content.collapsed {{
            max-height: 0;
        }}
    </style>
    <script src="https://unpkg.com/vis-network@9.1.2/standalone/umd/vis-network.min.js"></script>
</head>
<body>
    <div class="header">
        <h1>🔍 Code Intelligence Dashboard</h1>
        <div class="meta">
            Version {self.report.version} | 
            Generated: {self.report.timestamp} | 
            Project: {html.escape(self.report.project_path)}
        </div>
    </div>
    
    <div class="container">
        <div class="stats-grid">
            <div class="stat-card">
                <h3>Total Files</h3>
                <div class="value">{self.report.total_files:,}</div>
            </div>
            <div class="stat-card">
                <h3>Total Lines</h3>
                <div class="value">{self.report.total_lines:,}</div>
            </div>
            <div class="stat-card">
                <h3>Total Size</h3>
                <div class="value">{self.report.total_size_bytes / 1024 / 1024:.1f} MB</div>
            </div>
            <div class="stat-card">
                <h3>High Risk Files</h3>
                <div class="value">{len(self.report.high_risk_files)}</div>
            </div>
            <div class="stat-card">
                <h3>Duplicate Clusters</h3>
                <div class="value">{len(self.report.duplicate_clusters)}</div>
            </div>
            <div class="stat-card">
                <h3>Unused Files</h3>
                <div class="value">{len(self.report.unused_files)}</div>
            </div>
        </div>
        
        <div class="section">
            <h2 class="collapsible">Dependency Graph</h2>
            <div class="collapsible-content">
                <input type="text" id="searchGraph" class="search-box" placeholder="Search nodes...">
                <div id="graph"></div>
            </div>
        </div>
        
        <div class="section">
            <h2 class="collapsible">High Risk Files</h2>
            <div class="collapsible-content">
                <input type="text" id="searchHighRisk" class="search-box" placeholder="Search files...">
                <table id="highRiskTable">
                    <thead>
                        <tr>
                            <th>File</th>
                            <th>Risk Level</th>
                            <th>Category</th>
                            <th>Dependents</th>
                            <th>Complexity</th>
                            <th>Recommendation</th>
                        </tr>
                    </thead>
                    <tbody>
                        {self._build_high_risk_table_rows()}
                    </tbody>
                </table>
            </div>
        </div>
        
        <div class="section">
            <h2 class="collapsible">Duplicate Clusters</h2>
            <div class="collapsible-content">
                {self._build_duplicates_section()}
            </div>
        </div>
        
        <div class="section">
            <h2 class="collapsible">Unused Files</h2>
            <div class="collapsible-content">
                <ul>
                    {self._build_unused_list()}
                </ul>
            </div>
        </div>
    </div>
    
    <script>
        // Graph initialization
        const graphData = {json.dumps(graph_data)};
        
        const container = document.getElementById('graph');
        const options = {{
            nodes: {{
                shape: 'dot',
                size: 16,
                font: {{
                    size: 12,
                    color: '#e0e0e0'
                }},
                borderWidth: 2,
                borderWidthSelected: 4
            }},
            edges: {{
                width: 1,
                color: {{ color: '#444', highlight: '#667eea' }},
                smooth: {{
                    type: 'continuous'
                }}
            }},
            physics: {{
                stabilization: false,
                barnesHut: {{
                    gravitationalConstant: -8000,
                    springConstant: 0.001,
                    springLength: 200
                }}
            }},
            interaction: {{
                hover: true,
                tooltipDelay: 100
            }}
        }};
        
        const network = new vis.Network(container, graphData, options);
        
        // Search functionality
        document.getElementById('searchGraph').addEventListener('input', function(e) {{
            const searchTerm = e.target.value.toLowerCase();
            const matchingNodes = graphData.nodes
                .filter(node => node.label.toLowerCase().includes(searchTerm))
                .map(node => node.id);
            
            if (matchingNodes.length > 0) {{
                network.selectNodes(matchingNodes);
                network.fit({{ nodes: matchingNodes, animation: true }});
            }} else {{
                network.unselectAll();
            }}
        }});
        
        // Table search
        document.getElementById('searchHighRisk').addEventListener('input', function(e) {{
            const searchTerm = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#highRiskTable tbody tr');
            
            rows.forEach(row => {{
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            }});
        }});
        
        // Collapsible sections
        document.querySelectorAll('.collapsible').forEach(header => {{
            header.addEventListener('click', function() {{
                this.classList.toggle('collapsed');
                this.nextElementSibling.classList.toggle('collapsed');
            }});
        }});
        
        // Keyboard shortcuts
        document.addEventListener('keydown', function(e) {{
            if (e.ctrlKey && e.key === 'f') {{
                e.preventDefault();
                document.getElementById('searchGraph').focus();
            }}
        }});
    </script>
</body>
</html>"""
        
        return html
    
    def _build_high_risk_table_rows(self) -> str:
        """Build HTML table rows for high-risk files"""
        rows = []
        
        high_risk = [
            (path, self.report.files[path])
            for path in self.report.high_risk_files
        ]
        
        # Sort by risk score
        high_risk.sort(key=lambda x: x[1].risk_score, reverse=True)
        
        for path, info in high_risk[:50]:  # Limit to top 50
            risk_class = info.risk_level.value.lower()
            rows.append(f"""
                <tr>
                    <td><code>{html.escape(path)}</code></td>
                    <td><span class="badge badge-{risk_class}">{info.risk_level.value}</span></td>
                    <td>{html.escape(info.category.value)}</td>
                    <td>{len(info.dependents)}</td>
                    <td>{info.cyclomatic_complexity}</td>
                    <td>{html.escape(info.recommendation.value)}</td>
                </tr>
            """)
        
        return '\n'.join(rows)
    
    def _build_duplicates_section(self) -> str:
        """Build HTML for duplicates section"""
        if not self.report.duplicate_clusters:
            return "<p>No duplicate clusters found.</p>"
        
        items = []
        for cluster in self.report.duplicate_clusters[:20]:  # Limit to top 20
            files_list = '<br>'.join(f"• <code>{html.escape(f)}</code>" for f in cluster.files)
            items.append(f"""
                <div style="margin-bottom: 1.5rem; padding: 1rem; background: #16213e; border-radius: 8px;">
                    <h3 style="margin-bottom: 0.5rem;">Cluster {html.escape(cluster.cluster_id)}</h3>
                    <p><strong>Similarity:</strong> {cluster.similarity_score:.1%}</p>
                    <p><strong>Files:</strong><br>{files_list}</p>
                    <p><strong>Base file:</strong> <code>{html.escape(cluster.base_file)}</code></p>
                    <p><strong>Estimated savings:</strong> {cluster.estimated_savings_lines} lines</p>
                    <details>
                        <summary style="cursor: pointer; color: #667eea;">View diff summary</summary>
                        <pre style="margin-top: 0.5rem; padding: 0.5rem; background: #0f0f23; border-radius: 4px; overflow-x: auto;">{html.escape(cluster.diff_summary)}</pre>
                    </details>
                </div>
            """)
        
        return '\n'.join(items)
    
    def _build_unused_list(self) -> str:
        """Build HTML list of unused files"""
        if not self.report.unused_files:
            return "<li>No unused files found.</li>"
        
        items = [f"<li><code>{html.escape(f)}</code></li>" for f in self.report.unused_files[:50]]
        return '\n'.join(items)
    
    def _get_risk_color(self, risk_level: RiskLevel) -> str:
        """Get color for risk level"""
        colors = {
            RiskLevel.LOW: '#06d6a0',
            RiskLevel.MEDIUM: '#fcbf49',
            RiskLevel.HIGH: '#f77f00',
            RiskLevel.CRITICAL: '#e63946'
        }
        return colors.get(risk_level, '#888')
    
    def _file_info_to_dict(self, info: FileInfo) -> Dict:
        """Convert FileInfo to dict"""
        return {
            'path': info.path,
            'relative_path': info.relative_path,
            'size_bytes': info.size_bytes,
            'lines': info.lines,
            'category': info.category.value,
            'content_hash': info.content_hash,
            'structural_hash': info.structural_hash,
            'last_modified': info.last_modified,
            'days_since_modified': info.days_since_modified,
            'imports': info.imports,
            'exports': info.exports,
            'dependencies': info.dependencies,
            'dependents': info.dependents,
            'cyclomatic_complexity': info.cyclomatic_complexity,
            'any_count': info.any_count,
            'is_barrel_file': info.is_barrel_file,
            'is_test_file': info.is_test_file,
            'is_entry_point': info.is_entry_point,
            'has_side_effects': info.has_side_effects,
            'stability_score': info.stability_score,
            'risk_level': info.risk_level.value,
            'risk_score': info.risk_score,
            'recommendation': info.recommendation.value,
            'recommendation_reasons': info.recommendation_reasons,
            'recommendation_confidence': info.recommendation_confidence,
            'duplicate_of': info.duplicate_of,
            'structural_duplicates': info.structural_duplicates
        }
    
    def _cluster_to_dict(self, cluster: DuplicateCluster) -> Dict:
        """Convert DuplicateCluster to dict"""
        return {
            'cluster_id': cluster.cluster_id,
            'similarity_score': cluster.similarity_score,
            'files': cluster.files,
            'base_file': cluster.base_file,
            'merge_target': cluster.merge_target,
            'diff_summary': cluster.diff_summary,
            'estimated_savings_lines': cluster.estimated_savings_lines,
            'confidence': cluster.confidence
        }
    
    def _decision_to_dict(self, decision: ArchiveDecision) -> Dict:
        """Convert ArchiveDecision to dict"""
        return {
            'file_path': decision.file_path,
            'should_archive': decision.should_archive,
            'confidence': decision.confidence,
            'reasons': decision.reasons,
            'blockers': decision.blockers
        }


# ==== CLI & ORCHESTRATOR ====
class CodeIntelligencePlatform:
    """Main orchestrator for the analysis"""
    
    def __init__(self, project_path: Path, exclude_patterns: List[str],
                 report_dir: Path, use_cache: bool = True, use_parallel: bool = True,
                 keep_history: bool = False):
        self.project_path = project_path.resolve()
        self.exclude_patterns = exclude_patterns
        self.report_dir = report_dir.resolve()
        self.use_cache = use_cache
        self.use_parallel = use_parallel
        self.keep_history = keep_history
        self.logger = logging.getLogger('CodeIntelligence')
        
        # Initialize cache
        cache_path = self.project_path / Config.CACHE_FILE
        self.cache = FileCache(cache_path, Config.VERSION) if use_cache else None
    
    def run_full_analysis(self) -> AnalysisReport:
        """Run complete analysis"""
        self.logger.info("=" * 60)
        self.logger.info("Starting Code Intelligence Analysis")
        self.logger.info("=" * 60)
        
        start_time = time.time()
        
        # Step 1: Scan project
        scanner = ProjectScanner(self.project_path, self.exclude_patterns, self.cache)
        files = scanner.scan(use_parallel=self.use_parallel)
        
        # Step 2: Build dependency graph
        graph_builder = DependencyGraphBuilder(self.project_path, files)
        dependency_graph = graph_builder.build()
        
        # Step 3: Detect duplicates
        duplicate_detector = DuplicateDetector(files)
        duplicates = duplicate_detector.detect(use_parallel=self.use_parallel)
        
        # Step 4: Usage analysis
        usage_analyzer = UsageAnalyzer(files)
        unused, unwired = usage_analyzer.analyze()
        
        # Step 5: Calculate stability
        stability_calc = StabilityCalculator(files)
        stability_calc.calculate()
        
        # Step 6: Calculate risk
        risk_calc = RiskCalculator(files)
        risk_calc.calculate()
        
        # Step 7: Generate recommendations
        rec_engine = RecommendationEngine(files, duplicates, unused, unwired)
        rec_engine.generate()
        
        # Step 8: Archive decisions
        archive_engine = ArchiveDecisionEngine(files)
        archive_decisions = archive_engine.analyze()
        
        # Collect high-risk files
        high_risk = [
            path for path, info in files.items()
            if info.risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}
        ]
        
        # Build report
        duration = time.time() - start_time
        
        report = AnalysisReport(
            version=Config.VERSION,
            timestamp=datetime.now().isoformat(),
            project_path=str(self.project_path),
            total_files=len(files),
            total_lines=sum(f.lines for f in files.values()),
            total_size_bytes=sum(f.size_bytes for f in files.values()),
            files_by_category={
                cat.value: sum(1 for f in files.values() if f.category == cat)
                for cat in FileCategory
            },
            files_by_risk={
                risk.value: sum(1 for f in files.values() if f.risk_level == risk)
                for risk in RiskLevel
            },
            files_by_recommendation={
                rec.value: sum(1 for f in files.values() if f.recommendation == rec)
                for rec in Recommendation
            },
            files=files,
            dependency_graph=dependency_graph,
            duplicate_clusters=duplicates,
            unused_files=unused,
            unwired_features=unwired,
            high_risk_files=high_risk,
            archive_candidates=archive_decisions,
            analysis_duration_seconds=duration,
            cache_hit_rate=self.cache.hit_rate() if self.cache else 0.0
        )
        
        # Save cache
        if self.cache:
            self.cache.save()
        
        self.logger.info("=" * 60)
        self.logger.info(f"Analysis completed in {duration:.2f} seconds")
        self.logger.info("=" * 60)
        
        return report
    
    def generate_reports(self, report: AnalysisReport):
        """Generate all reports"""
        generator = ReportGenerator(report, self.report_dir)
        generator.generate_all(keep_history=self.keep_history)
    
    def create_archive(self, files: List[str], decisions: Dict[str, ArchiveDecision]) -> Optional[Path]:
        """Create archive of files"""
        builder = ArchiveBuilder(self.project_path, self.report_dir)
        return builder.create_archive(files, decisions)


class InteractiveCLI:
    """Interactive command-line interface"""
    
    def __init__(self, platform: CodeIntelligencePlatform):
        self.platform = platform
        self.report: Optional[AnalysisReport] = None
        self.logger = logging.getLogger('CodeIntelligence')
    
    def run(self):
        """Run interactive menu"""
        self._print_banner()
        
        while True:
            self._print_menu()
            choice = input("\nSelect option: ").strip()
            
            if choice == '1':
                self._run_analysis()
            elif choice == '2':
                self._view_summary()
            elif choice == '3':
                self._view_duplicates()
            elif choice == '4':
                self._view_unused()
            elif choice == '5':
                self._view_high_risk()
            elif choice == '6':
                self._create_archive()
            elif choice == '7':
                self._open_dashboard()
            elif choice == '8':
                self._export_json()
            elif choice == '0':
                self.logger.info("Goodbye!")
                break
            else:
                print("Invalid option. Please try again.")
    
    def _print_banner(self):
        """Print welcome banner"""
        print("\n" + "=" * 60)
        print(" " * 10 + "🔍 Code Intelligence Platform v4")
        print("=" * 60 + "\n")
    
    def _print_menu(self):
        """Print main menu"""
        print("\n" + "-" * 60)
        print("MAIN MENU")
        print("-" * 60)
        print("1. Run Full Analysis")
        print("2. View Summary")
        print("3. View Duplicate Clusters")
        print("4. View Unused Files")
        print("5. View High-Risk Files")
        print("6. Create Archive")
        print("7. Open HTML Dashboard")
        print("8. Export JSON Report")
        print("0. Exit")
        print("-" * 60)
    
    def _run_analysis(self):
        """Run full analysis"""
        print("\n🔄 Running analysis...")
        self.report = self.platform.run_full_analysis()
        self.platform.generate_reports(self.report)
        print(f"\n✅ Analysis complete! Reports saved to: {self.platform.report_dir}")
    
    def _view_summary(self):
        """View summary statistics"""
        if not self.report:
            print("\n⚠️  Please run analysis first (option 1)")
            return
        
        print("\n" + "=" * 60)
        print("ANALYSIS SUMMARY")
        print("=" * 60)
        print(f"Total Files:        {self.report.total_files:,}")
        print(f"Total Lines:        {self.report.total_lines:,}")
        print(f"Total Size:         {self.report.total_size_bytes / 1024 / 1024:.2f} MB")
        print(f"\nDuplicate Clusters: {len(self.report.duplicate_clusters)}")
        print(f"Unused Files:       {len(self.report.unused_files)}")
        print(f"Unwired Features:   {len(self.report.unwired_features)}")
        print(f"High-Risk Files:    {len(self.report.high_risk_files)}")
        print(f"\nAnalysis Duration:  {self.report.analysis_duration_seconds:.2f}s")
        print(f"Cache Hit Rate:     {self.report.cache_hit_rate * 100:.1f}%")
        print("=" * 60)
    
    def _view_duplicates(self):
        """View duplicate clusters"""
        if not self.report:
            print("\n⚠️  Please run analysis first (option 1)")
            return
        
        if not self.report.duplicate_clusters:
            print("\n✅ No duplicate clusters found!")
            return
        
        print("\n" + "=" * 60)
        print(f"DUPLICATE CLUSTERS ({len(self.report.duplicate_clusters)})")
        print("=" * 60)
        
        for i, cluster in enumerate(self.report.duplicate_clusters[:10], 1):
            print(f"\n{i}. Cluster {cluster.cluster_id}")
            print(f"   Similarity: {cluster.similarity_score:.1%}")
            print(f"   Files: {len(cluster.files)}")
            print(f"   Base: {cluster.base_file}")
            print(f"   Savings: {cluster.estimated_savings_lines} lines")
        
        if len(self.report.duplicate_clusters) > 10:
            print(f"\n... and {len(self.report.duplicate_clusters) - 10} more")
    
    def _view_unused(self):
        """View unused files"""
        if not self.report:
            print("\n⚠️  Please run analysis first (option 1)")
            return
        
        if not self.report.unused_files:
            print("\n✅ No unused files found!")
            return
        
        print("\n" + "=" * 60)
        print(f"UNUSED FILES ({len(self.report.unused_files)})")
        print("=" * 60)
        
        for i, file_path in enumerate(self.report.unused_files[:20], 1):
            info = self.report.files[file_path]
            print(f"{i:2}. {file_path}")
            print(f"    Category: {info.category.value} | Lines: {info.lines}")
        
        if len(self.report.unused_files) > 20:
            print(f"\n... and {len(self.report.unused_files) - 20} more")
    
    def _view_high_risk(self):
        """View high-risk files"""
        if not self.report:
            print("\n⚠️  Please run analysis first (option 1)")
            return
        
        if not self.report.high_risk_files:
            print("\n✅ No high-risk files found!")
            return
        
        print("\n" + "=" * 60)
        print(f"HIGH-RISK FILES ({len(self.report.high_risk_files)})")
        print("=" * 60)
        
        high_risk = sorted(
            [(path, self.report.files[path]) for path in self.report.high_risk_files],
            key=lambda x: x[1].risk_score,
            reverse=True
        )
        
        for i, (path, info) in enumerate(high_risk[:20], 1):
            print(f"\n{i:2}. {path}")
            print(f"    Risk: {info.risk_level.value} ({info.risk_score:.0f})")
            print(f"    Category: {info.category.value}")
            print(f"    Dependents: {len(info.dependents)} | Complexity: {info.cyclomatic_complexity}")
            print(f"    Recommendation: {info.recommendation.value}")
        
        if len(high_risk) > 20:
            print(f"\n... and {len(high_risk) - 20} more")
    
    def _create_archive(self):
        """Create archive of files"""
        if not self.report:
            print("\n⚠️  Please run analysis first (option 1)")
            return
        
        # Get high-confidence archive candidates
        candidates = [
            d for d in self.report.archive_candidates
            if d.should_archive and d.confidence >= Config.ARCHIVE_MIN_CONFIDENCE
        ]
        
        if not candidates:
            print("\n✅ No files recommended for archiving")
            return
        
        print("\n" + "=" * 60)
        print(f"ARCHIVE CANDIDATES ({len(candidates)})")
        print("=" * 60)
        
        for i, decision in enumerate(candidates[:10], 1):
            print(f"{i:2}. {decision.file_path}")
            print(f"    Confidence: {decision.confidence:.0f}%")
            print(f"    Reasons: {', '.join(decision.reasons[:2])}")
        
        if len(candidates) > 10:
            print(f"\n... and {len(candidates) - 10} more")
        
        print("\n⚠️  WARNING: This will create an archive but NOT delete source files")
        confirm = input("\nProceed with archive creation? (yes/no): ").strip().lower()
        
        if confirm == 'yes':
            files_to_archive = [d.file_path for d in candidates]
            decisions_dict = {d.file_path: d for d in candidates}
            
            archive_path = self.platform.create_archive(files_to_archive, decisions_dict)
            
            if archive_path:
                print(f"\n✅ Archive created: {archive_path}")
            else:
                print("\n❌ Archive creation failed")
        else:
            print("\n❌ Archive creation cancelled")
    
    def _open_dashboard(self):
        """Open HTML dashboard in browser"""
        if not self.report:
            print("\n⚠️  Please run analysis first (option 1)")
            return
        
        dashboard_path = self.platform.report_dir / 'optimization_dashboard.html'
        
        if not dashboard_path.exists():
            print("\n❌ Dashboard not found. Please run analysis first.")
            return
        
        print(f"\n🌐 Opening dashboard: {dashboard_path}")
        
        import webbrowser
        webbrowser.open(dashboard_path.as_uri())
    
    def _export_json(self):
        """Export JSON report"""
        if not self.report:
            print("\n⚠️  Please run analysis first (option 1)")
            return
        
        json_path = self.platform.report_dir / 'full_report.json'
        print(f"\n✅ JSON report available at: {json_path}")


# ==== MAIN ENTRY POINT ====
def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='Enterprise Code Intelligence Platform v4',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Interactive mode
  python code_intelligence_v4.py /path/to/project
  
  # Non-interactive mode
  python code_intelligence_v4.py /path/to/project --non-interactive
  
  # With custom report directory
  python code_intelligence_v4.py /path/to/project --report-dir ./my-reports
  
  # JSON output for CI
  python code_intelligence_v4.py /path/to/project --non-interactive --json-output
  
  # Dry run (no file writes)
  python code_intelligence_v4.py /path/to/project --dry-run
        """
    )
    
    parser.add_argument(
        'project_path',
        type=Path,
        help='Path to project root directory'
    )
    
    parser.add_argument(
        '--report-dir',
        type=Path,
        default=Path.cwd() / Config.DEFAULT_REPORT_DIR,
        help=f'Report output directory (default: {Config.DEFAULT_REPORT_DIR})'
    )
    
    parser.add_argument(
        '--exclude',
        nargs='+',
        default=[],
        help='Additional patterns to exclude'
    )
    
    parser.add_argument(
        '--no-cache',
        action='store_true',
        help='Disable file cache'
    )
    
    parser.add_argument(
        '--no-parallel',
        action='store_true',
        help='Disable parallel processing'
    )
    
    parser.add_argument(
        '--keep-history',
        action='store_true',
        help='Keep previous reports in history folder'
    )
    
    parser.add_argument(
        '--non-interactive',
        action='store_true',
        help='Run analysis and exit (no interactive menu)'
    )
    
    parser.add_argument(
        '--json-output',
        action='store_true',
        help='Output summary as JSON to stdout (implies --non-interactive)'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Run analysis without writing any files'
    )
    
    parser.add_argument(
        '--verbose',
        '-v',
        action='store_true',
        help='Enable verbose logging'
    )
    
    args = parser.parse_args()
    
    # Setup logging
    logger = setup_logging(args.verbose)
    
    # Validate project path
    if not args.project_path.exists():
        logger.error(f"Project path does not exist: {args.project_path}")
        sys.exit(1)
    
    if not args.project_path.is_dir():
        logger.error(f"Project path is not a directory: {args.project_path}")
        sys.exit(1)
    
    # Check tree-sitter
    if not TREE_SITTER_AVAILABLE:
        logger.warning("tree-sitter not available. Install with: pip install tree-sitter tree-sitter-typescript")
        logger.warning("Falling back to regex-based parsing (less accurate)")
    
    # Create platform
    platform = CodeIntelligencePlatform(
        project_path=args.project_path,
        exclude_patterns=args.exclude,
        report_dir=args.report_dir,
        use_cache=not args.no_cache,
        use_parallel=not args.no_parallel,
        keep_history=args.keep_history
    )
    
    # Run analysis
    try:
        if args.json_output or args.non_interactive:
            # Non-interactive mode
            report = platform.run_full_analysis()
            
            if not args.dry_run:
                platform.generate_reports(report)
            
            if args.json_output:
                # Output summary as JSON
                summary = {
                    'version': report.version,
                    'timestamp': report.timestamp,
                    'project_path': report.project_path,
                    'total_files': report.total_files,
                    'total_lines': report.total_lines,
                    'total_size_bytes': report.total_size_bytes,
                    'duplicate_clusters': len(report.duplicate_clusters),
                    'unused_files': len(report.unused_files),
                    'high_risk_files': len(report.high_risk_files),
                    'analysis_duration_seconds': report.analysis_duration_seconds,
                    'cache_hit_rate': report.cache_hit_rate
                }
                print(json.dumps(summary, indent=2))
            else:
                logger.info(f"Reports generated in: {args.report_dir}")
        else:
            # Interactive mode
            cli = InteractiveCLI(platform)
            cli.run()
    
    except KeyboardInterrupt:
        logger.info("\n\nInterrupted by user")
        sys.exit(0)
    except Exception as e:
        logger.error(f"Fatal error: {e}", exc_info=True)
        sys.exit(1)


if __name__ == '__main__':
    main()