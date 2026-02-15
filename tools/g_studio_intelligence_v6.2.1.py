#!/usr/bin/env python3
"""
G-Studio Intelligent Code Analyzer v6.2.0-beta
===============================================
Main Purpose:
    Intelligent analysis of G-Studio project codebase - a React/TypeScript 
    development environment focused on AI, MCP, Voice, multi-agent systems
    and specific layered architecture.

Key Features:
    - Smart detection of unused but valuable components (0-100 score)
    - Wiring issue detection with better alternatives
    - Dependency graph construction
    - Architectural health analysis
    - Beautiful HTML reports
    - File-based caching for speed
    - Tree-sitter parsing with regex fallback
    - **Accurate dependency resolution & dependents tracking**
    - **Enhanced valuable component scoring (weighted, reason-rich)**
    - **5+ actionable wiring issue detection rules**
    - **Rich HTML tables & visual feedback**
    - **Thread‑pool for faster analysis**
    - **Optional git metadata for unused components**
    - **Dry‑run mode**

What's new in v6.2.0-beta:
    ✓ **Robust tree‑sitter error handling** – each query is wrapped in try-except,
      never crashes the whole analysis. Falls back to regex with a warning.
    ✓ **Enriched import/export details** – `import_details` now includes
      `is_type_import`, `is_alias`, `original_name`; `export_details` includes
      `is_reexport`, `source_if_reexport`. Used to improve wiring rules.
    ✓ **New CLI flag `--min-score N`** – filters valuable unused components
      to show only those with score ≥ N (default 0, always keeps >30 base threshold).
    ✓ **Small‑cycle detection** – detects circular dependencies of length 2–5,
      creates an ArchitecturalInsight and applies a health penalty.
    ✓ **False positive reduction** – whitelist `ALLOW_RAW_CONTEXTS` in Config
      allows certain context names to skip the raw `useContext` rule.
    ✓ **HTML dashboard polish** – added average health score to statistics grid,
      refined severity badge colours for better contrast.
    ✓ **Tree‑sitter API compatibility** – works with both pre‑0.20 (`.language` attribute)
      and post‑0.20 (`.set_language()`) versions.
    ✓ Full backwards compatibility – all v6.1.0 features remain intact.

Author: G-Studio Team
Version: 6.2.0-beta
"""

import os
import sys
import json
import hashlib
import argparse
import time
import re
import subprocess
import csv
from pathlib import Path
from datetime import datetime
from collections import defaultdict
from typing import Dict, List, Set, Tuple, Optional, Any
from dataclasses import dataclass, field, asdict
from enum import Enum
from concurrent.futures import ThreadPoolExecutor, as_completed

# Optional: tqdm for progress bar
try:
    from tqdm import tqdm
    TQDM_AVAILABLE = True
except ImportError:
    TQDM_AVAILABLE = False
    def tqdm(iterable, desc=None, total=None):
        if desc:
            print(f"{desc}...")
        return iterable

# Optional: tree-sitter for accurate parsing
try:
    from tree_sitter import Language, Parser, Node
    import tree_sitter_typescript
    TREE_SITTER_AVAILABLE = True
except ImportError:
    TREE_SITTER_AVAILABLE = False

# Optional: colorama for Windows color support
try:
    import colorama
    colorama.init()
    COLORS_AVAILABLE = True
except ImportError:
    COLORS_AVAILABLE = False

# =============================================================================
# TERMINAL COLORS & LOGGING
# =============================================================================
class Colors:
    """Terminal color codes."""
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
# ENUMS
# =============================================================================
class LayerType(Enum):
    """Architectural layer types in G-Studio."""
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
    """Issue severity levels."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class PatternType(Enum):
    """Detected pattern types in G-Studio."""
    AI_PROVIDER = "ai_provider"
    MCP_INTEGRATION = "mcp_integration"
    VOICE_COMMAND = "voice_command"
    MULTI_AGENT = "multi_agent"
    CONTEXT_PATTERN = "context_pattern"
    HOOK_PATTERN = "hook_pattern"
    # NEW in v6.2.0
    CIRCULAR_DEPENDENCY = "circular_dependency"

# =============================================================================
# CONFIGURATION
# =============================================================================
class Config:
    """Configuration for G-Studio analysis."""
    
    # File extensions to analyze
    VALID_EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx'}
    
    # Directories to ignore
    IGNORE_DIRS = {
        'node_modules', 'dist', 'build', '__tests__', 
        '__test__', 'coverage', '.git', '.vscode', 
        'test', 'tests', '.cache'
    }
    
    # File patterns to ignore
    IGNORE_FILES = {
        '.test.', '.spec.', '.d.ts', '.min.js', '.min.ts'
    }
    
    # Cache file name
    CACHE_FILE = '.gstudio_cache.json'
    
    # AI-related patterns
    AI_HOOKS = [
        'useGemini', 'useLMStudio', 'useLocalAI', 'useMultiAgent',
        'useAIProvider', 'useOpenAI', 'useAnthropic'
    ]
    AI_SDK_IMPORTS = [
        '@google/generative-ai', '@google/genai', 'openai', '@anthropic-ai/sdk'
    ]
    
    # MCP patterns
    MCP_PATTERNS = [
        'useMcp', 'mcpService', 'mcpConnectionManager', 
        'mcpAgentIntegration', 'MCPServer', 'MCPTool'
    ]
    
    # Voice patterns
    VOICE_PATTERNS = [
        'useSpeechRecognition', 'useVoiceCommands', 
        'speechRecognitionService', 'VoiceChatModal'
    ]
    
    # High-value component name indicators
    HIGH_VALUE_NAMES = [
        'Modal', 'Provider', 'Manager', 'Orchestrator', 
        'Intelligence', 'Dashboard', 'Panel', 'Hub',
        'Engine', 'System', 'Advanced', 'Enhanced'
    ]
    
    # React hooks to detect
    REACT_HOOKS = [
        'useState', 'useEffect', 'useContext', 'useReducer',
        'useCallback', 'useMemo', 'useRef', 'useLayoutEffect'
    ]
    
    # Scoring weights (max total 100)
    SCORE_WEIGHTS = {
        'ai_hook': 30,
        'mcp': 25,
        'voice': 20,
        'complexity': 15,
        'types': 10,
        'name_quality': 10,
        'size_bonus': 5,
    }
    
    # Severity to numeric score mapping
    SEVERITY_SCORES = {
        Severity.CRITICAL: (85, 100),
        Severity.HIGH:     (60, 84),
        Severity.MEDIUM:   (30, 59),
        Severity.LOW:      (0, 29)
    }
    
    # Worker threads for parallel parsing
    MAX_WORKERS = max(1, os.cpu_count() or 1)
    
    # NEW in v6.2.0: Context names allowed to be directly used with useContext
    ALLOW_RAW_CONTEXTS = ['LegacyAppContext']  # Add more as needed

# =============================================================================
# DATA MODELS
# =============================================================================
@dataclass
class FileInfo:
    """Information about a source file."""
    path: str
    relative_path: str
    layer: LayerType
    size: int
    lines: int
    hash: str
    mtime: float
    
    # Parsed content
    imports: List[str] = field(default_factory=list)
    exports: List[str] = field(default_factory=list)
    hooks_used: List[str] = field(default_factory=list)
    contexts_used: List[str] = field(default_factory=list)
    
    # NEW in v6.1.0: rich import/export details
    import_details: List[Dict] = field(default_factory=list)   # list of {'source': str, 'imported': list of {'name': str, 'alias': str, 'type_only': bool, 'original_name': str, 'is_alias': bool}}
    export_details: List[Dict] = field(default_factory=list)   # list of {'kind': str, 'source': str (if re-export), 'names': list of {'name': str, 'alias': str}, 'is_reexport': bool, 'source_if_reexport': str}
    
    # NEW in v6.1.0: React component signals
    is_functional_component: bool = False
    is_custom_hook: bool = False
    is_context_provider: bool = False
    has_create_context: bool = False
    
    # Patterns detected
    has_ai_hook: bool = False
    has_mcp: bool = False
    has_voice: bool = False
    has_interface: bool = False
    has_type_export: bool = False
    
    # Complexity indicators
    hook_count: int = 0
    context_count: int = 0
    complexity_score: int = 0
    
    # Dependency tracking
    depends_on: List[str] = field(default_factory=list)  # Files this imports from
    dependents: List[str] = field(default_factory=list)  # Files that import this
    is_entry_point: bool = False
    
    # Git metadata (optional)
    git_last_author: str = ""
    git_last_modified: str = ""

@dataclass
class ValuableComponent:
    """An unused but valuable component."""
    name: str
    path: str
    layer: LayerType
    value_score: float  # 0-100
    
    # Why it's valuable
    reasons: List[str] = field(default_factory=list)
    
    # Integration suggestions
    suggested_location: str = ""
    integration_effort: str = "medium"  # low, medium, high
    integration_code: str = ""
    
    # Component details
    exports: List[str] = field(default_factory=list)
    hooks: List[str] = field(default_factory=list)
    patterns: List[str] = field(default_factory=list)
    
    # Git info (if available)
    last_author: str = ""
    last_modified_date: str = ""

@dataclass
class WiringIssue:
    """A detected wiring/import issue."""
    file_path: str
    line_number: int
    severity: Severity
    issue_type: str
    
    # What's wrong
    current_import: str
    better_alternative: str
    reasoning: List[str] = field(default_factory=list)
    
    # How to fix
    refactor_sample: str = ""
    auto_fixable: bool = False
    
    # NEW in v6.1.0: numeric impact score (0-100)
    severity_score: int = 0

@dataclass
class ArchitecturalInsight:
    """Insights about architectural patterns."""
    pattern: PatternType
    health_score: float  # 0-100
    files_involved: int
    
    # Analysis
    strengths: List[str] = field(default_factory=list)
    weaknesses: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    # NEW in v6.2.0: for circular dependencies, list of affected files
    affected_files: List[str] = field(default_factory=list)

@dataclass
class AnalysisResult:
    """Complete analysis results."""
    total_files: int
    tsx_percentage: float
    total_lines: int
    
    valuable_unused: List[ValuableComponent] = field(default_factory=list)
    wiring_issues: List[WiringIssue] = field(default_factory=list)
    insights: List[ArchitecturalInsight] = field(default_factory=list)
    
    # Dependency graph
    dependency_graph: Dict[str, List[str]] = field(default_factory=dict)
    
    # Layer statistics
    layer_stats: Dict[str, int] = field(default_factory=dict)

# =============================================================================
# CACHE MANAGER
# =============================================================================
class CacheManager:
    """Manages file-based caching for performance."""
    
    def __init__(self, cache_path: Path, use_cache: bool = True):
        self.cache_path = cache_path
        self.use_cache = use_cache
        self.cache: Dict[str, Any] = {}
        
        if use_cache and cache_path.exists():
            try:
                with open(cache_path, 'r') as f:
                    self.cache = json.load(f)
                log_info(f"Loaded cache with {len(self.cache)} entries")
            except Exception as e:
                log_warning(f"Could not load cache: {e}")
                self.cache = {}
    
    def get(self, file_path: str, mtime: float, content_hash: str) -> Optional[Dict]:
        """Get cached file info if valid."""
        if not self.use_cache:
            return None
        
        key = str(file_path)
        if key in self.cache:
            cached = self.cache[key]
            # Check if cache is still valid (mtime and hash match)
            if (cached.get('mtime') == mtime and 
                cached.get('hash') == content_hash):
                return cached
        
        return None
    
    def set(self, file_path: str, data: Dict):
        """Cache file info."""
        if self.use_cache:
            self.cache[str(file_path)] = data
    
    def save(self):
        """Save cache to disk."""
        if not self.use_cache:
            return
        
        try:
            with open(self.cache_path, 'w') as f:
                json.dump(self.cache, f, indent=2)
            log_success(f"Saved cache to {self.cache_path}")
        except Exception as e:
            log_warning(f"Could not save cache: {e}")

# =============================================================================
# FILE PARSER (with real tree‑sitter support – enhanced v6.2.0, fixed indentation)
# =============================================================================
class FileParser:
    """Parses TypeScript/JavaScript files using tree-sitter or regex fallback."""
    
    def __init__(self, verbose: bool = False):
        self.ts_parser = None
        self.tsx_parser = None
        self.verbose = verbose

        if TREE_SITTER_AVAILABLE:
            try:
                # Load languages
                TS_LANGUAGE = Language(tree_sitter_typescript.language_typescript())
                TSX_LANGUAGE = Language(tree_sitter_typescript.language_tsx())

                # Check tree‑sitter API version
                test_parser = Parser()
                if hasattr(test_parser, 'set_language'):
                    # New API (0.20+)
                    self.ts_parser = Parser()
                    self.ts_parser.set_language(TS_LANGUAGE)
                    self.tsx_parser = Parser()
                    self.tsx_parser.set_language(TSX_LANGUAGE)
                else:
                    # Old API (pre‑0.20)
                    self.ts_parser = Parser()
                    self.ts_parser.language = TS_LANGUAGE
                    self.tsx_parser = Parser()
                    self.tsx_parser.language = TSX_LANGUAGE

                log_info("Tree-sitter initialized successfully")
            except Exception as e:
                log_warning(f"Tree-sitter initialization failed: {e}")
                self.ts_parser = None
                self.tsx_parser = None

    def parse_file(self, file_path: Path, content: str) -> Dict[str, Any]:
        """Parse a TypeScript/JavaScript file."""
        # Try tree-sitter first
        if self.ts_parser and self.tsx_parser:
            try:
                parser = self.tsx_parser if file_path.suffix in ['.tsx', '.jsx'] else self.ts_parser
                return self._parse_with_tree_sitter(content, parser)
            except Exception as e:
                if self.verbose:
                    log_warning(f"Tree-sitter parse failed for {file_path}, falling back to regex: {e}")
                # Fall back to regex
                pass
        
        # Regex fallback
        return self._parse_with_regex(content)

    def _parse_with_tree_sitter(self, content: str, parser: Any) -> Dict[str, Any]:
        """Parse using tree-sitter with precise AST traversal."""
        try:
            tree = parser.parse(bytes(content, 'utf-8'))
            root = tree.root_node

            result = {
                'imports': [],
                'exports': [],
                'hooks_used': [],
                'contexts_used': [],
                'has_interface': False,
                'has_type_export': False,
                'import_details': [],
                'export_details': [],
                'is_functional_component': False,
                'is_custom_hook': False,
                'is_context_provider': False,
                'has_create_context': False
            }

            def get_node_text(node: Node) -> str:
                return content[node.start_byte:node.end_byte]

            def walk(node: Node):
                # ----- IMPORT statements -----
                if node.type == 'import_statement':
                    source_node = None
                    import_clause = None
                    for child in node.children:
                        if child.type == 'string':
                            source_node = child
                        elif child.type == 'import_clause':
                            import_clause = child
                    if source_node:
                        source = get_node_text(source_node).strip('\'"')
                        result['imports'].append(source)

                        imported_names = []
                        if import_clause:
                            for spec in import_clause.children:
                                if spec.type == 'identifier':
                                    imported_names.append({
                                        'name': get_node_text(spec),
                                        'alias': None,
                                        'type_only': False,
                                        'original_name': get_node_text(spec),
                                        'is_alias': False
                                    })
                                elif spec.type == 'namespace_import':
                                    for ns in spec.children:
                                        if ns.type == 'identifier':
                                            imported_names.append({
                                                'name': '*',
                                                'alias': get_node_text(ns),
                                                'type_only': False,
                                                'original_name': '*',
                                                'is_alias': True
                                            })
                                elif spec.type == 'named_imports':
                                    for n in spec.children:
                                        if n.type == 'import_specifier':
                                            name_node = n.child_by_field_name('name')
                                            alias_node = n.child_by_field_name('alias')
                                            name = get_node_text(name_node) if name_node else None
                                            alias = get_node_text(alias_node) if alias_node else None
                                            # Rough detection of type import
                                            node_text = get_node_text(n)
                                            is_type = 'type' in node_text and name_node and 'type' in content[name_node.start_byte-6:name_node.start_byte]
                                            imported_names.append({
                                                'name': name,
                                                'alias': alias,
                                                'type_only': is_type,
                                                'original_name': name,
                                                'is_alias': alias is not None
                                            })
                        result['import_details'].append({
                            'source': source,
                            'imported': imported_names
                        })

                # ----- EXPORT statements -----
                elif node.type == 'export_statement':
                    # Default export
                    if 'default' in get_node_text(node):
                        result['exports'].append('default')
                        result['export_details'].append({
                            'kind': 'default',
                            'source': None,
                            'names': [{'name': 'default', 'alias': None}],
                            'is_reexport': False,
                            'source_if_reexport': None
                        })
                    # Re‑export
                    is_reexport = any(c.type == 'string' for c in node.children)
                    source_node = None
                    export_clause = None
                    for child in node.children:
                        if child.type == 'string':
                            source_node = child
                        elif child.type == 'export_clause':
                            export_clause = child
                    if is_reexport and source_node:
                        source = get_node_text(source_node).strip('\'"')
                        result['imports'].append(source)  # treat as import for dep graph
                        names = []
                        if export_clause:
                            for spec in export_clause.children:
                                if spec.type == 'export_specifier':
                                    name_node = spec.child_by_field_name('name')
                                    alias_node = spec.child_by_field_name('alias')
                                    name = get_node_text(name_node) if name_node else None
                                    alias = get_node_text(alias_node) if alias_node else None
                                    names.append({'name': name, 'alias': alias})
                        result['export_details'].append({
                            'kind': 're-export',
                            'source': source,
                            'names': names,
                            'is_reexport': True,
                            'source_if_reexport': source
                        })
                        for n in names:
                            result['exports'].append(n['alias'] or n['name'])
                    else:
                        # local export
                        names = []
                        for child in node.children:
                            if child.type == 'export_clause':
                                for spec in child.children:
                                    if spec.type == 'export_specifier':
                                        name_node = spec.child_by_field_name('name')
                                        alias_node = spec.child_by_field_name('alias')
                                        name = get_node_text(name_node) if name_node else None
                                        alias = get_node_text(alias_node) if alias_node else None
                                        names.append({'name': name, 'alias': alias})
                                        result['exports'].append(alias or name)
                            elif child.type in {'function_declaration', 'class_declaration', 'lexical_declaration'}:
                                ident = self._find_identifier(child, content)
                                if ident:
                                    names.append({'name': ident, 'alias': None})
                                    result['exports'].append(ident)
                        if names:
                            result['export_details'].append({
                                'kind': 'named',
                                'source': None,
                                'names': names,
                                'is_reexport': False,
                                'source_if_reexport': None
                            })

                # ----- React component detection -----
                if node.type in {'function_declaration', 'arrow_function'}:
                    def has_jsx(n):
                        if n.type in {'jsx_element', 'jsx_self_closing_element', 'jsx_fragment'}:
                            return True
                        return any(has_jsx(c) for c in n.children)
                    if has_jsx(node):
                        result['is_functional_component'] = True
                        name_node = self._find_identifier_node(node)
                        if name_node:
                            name = get_node_text(name_node)
                            if name.startswith('use'):
                                result['is_custom_hook'] = True

                # ----- createContext detection -----
                if node.type == 'call_expression':
                    func = node.child_by_field_name('function')
                    if func and func.type == 'identifier':
                        name = get_node_text(func)
                        if name == 'createContext':
                            result['has_create_context'] = True

                # ----- Custom hook definition -----
                if node.type == 'function_declaration':
                    name_node = self._find_identifier_node(node)
                    if name_node:
                        name = get_node_text(name_node)
                        if name.startswith('use'):
                            result['is_custom_hook'] = True

                # ----- Hooks usage -----
                if node.type == 'call_expression':
                    func = node.child_by_field_name('function')
                    if func and func.type == 'identifier':
                        name = get_node_text(func)
                        if name.startswith('use'):
                            result['hooks_used'].append(name)

                # ----- Interfaces and types -----
                elif node.type == 'interface_declaration':
                    result['has_interface'] = True
                elif node.type == 'type_alias_declaration':
                    parent = node.parent
                    if parent and parent.type == 'export_statement':
                        result['has_type_export'] = True

                for child in node.children:
                    walk(child)

            walk(root)

            # Deduplicate
            result['imports'] = list(set(result['imports']))
            result['exports'] = list(set(result['exports']))
            result['hooks_used'] = list(set(result['hooks_used']))

            # Contexts used
            ctx_pattern = r'useContext\((\w+)\)'
            result['contexts_used'] = list(set(re.findall(ctx_pattern, content)))

            # Context provider detection
            if result['has_create_context'] and '.Provider' in content:
                result['is_context_provider'] = True

            return result

        except Exception as e:
            if self.verbose:
                log_warning(f"Tree-sitter AST traversal failed, falling back to regex: {e}")
            return self._parse_with_regex(content)

    def _find_identifier_node(self, node: Node) -> Optional[Node]:
        """Recursively find the first identifier node."""
        if node.type == 'identifier':
            return node
        for child in node.children:
            res = self._find_identifier_node(child)
            if res:
                return res
        return None

    def _find_identifier(self, node: Node, content: str) -> Optional[str]:
        """Recursively find the first identifier text."""
        n = self._find_identifier_node(node)
        if n:
            return content[n.start_byte:n.end_byte]
        return None

    def _parse_with_regex(self, content: str) -> Dict[str, Any]:
        """Parse using regex patterns (fallback method)."""
        result = {
            'imports': [],
            'exports': [],
            'hooks_used': [],
            'contexts_used': [],
            'has_interface': False,
            'has_type_export': False,
            'import_details': [],
            'export_details': [],
            'is_functional_component': False,
            'is_custom_hook': False,
            'is_context_provider': False,
            'has_create_context': False
        }

        import_pattern = r"import\s+(?:{[^}]+}|[\w\s,*]+)\s+from\s+['\"]([^'\"]+)['\"]"
        result['imports'] = re.findall(import_pattern, content)

        export_patterns = [
            r'export\s+{\s*([^}]+)\s*}',
            r'export\s+(?:const|let|var|function|class)\s+(\w+)',
            r'export\s+default\s+(\w+)',
        ]
        for pattern in export_patterns:
            matches = re.findall(pattern, content)
            for match in matches:
                names = [n.strip() for n in match.split(',')]
                result['exports'].extend(names)

        for hook in Config.REACT_HOOKS + Config.AI_HOOKS + Config.VOICE_PATTERNS:
            if re.search(rf'\b{hook}\s*\(', content):
                result['hooks_used'].append(hook)

        context_pattern = r'useContext\((\w+)\)'
        result['contexts_used'] = re.findall(context_pattern, content)

        result['has_interface'] = bool(re.search(r'\binterface\s+\w+', content))
        result['has_type_export'] = bool(re.search(r'export\s+type\s+\w+', content))

        if re.search(r'function\s+[A-Z]\w+\s*\([^)]*\)\s*\{[^}]*return\s*\(?<', content) or \
           re.search(r'const\s+[A-Z]\w+\s*=\s*\([^)]*\)\s*=>\s*\(?<', content):
            result['is_functional_component'] = True
        if re.search(r'export\s+(?:const|function)\s+(use[A-Z]\w+)', content):
            result['is_custom_hook'] = True
        if 'createContext' in content:
            result['has_create_context'] = True
            if '.Provider' in content:
                result['is_context_provider'] = True

        return result

# =============================================================================
# FILE SCANNER
# =============================================================================
class FileScanner:
    """Scans project directory for source files."""
    
    def __init__(self, project_path: Path, verbose: bool = False):
        self.project_path = project_path
        self.verbose = verbose
        
        self.src_path = project_path / 'src'
        if not self.src_path.exists():
            self.src_path = project_path
            log_info(f"No 'src' directory found, using project root: {project_path}")
    
    def scan(self) -> List[Path]:
        """Scan for all valid source files."""
        files = []
        
        for root, dirs, filenames in os.walk(self.src_path):
            dirs[:] = [d for d in dirs if d not in Config.IGNORE_DIRS]
            
            for filename in filenames:
                if not any(filename.endswith(ext) for ext in Config.VALID_EXTENSIONS):
                    continue
                if any(pattern in filename for pattern in Config.IGNORE_FILES):
                    continue
                file_path = Path(root) / filename
                files.append(file_path)
        
        if self.verbose:
            log_info(f"Found {len(files)} source files")
        
        return files

# =============================================================================
# DEPENDENCY ANALYZER
# =============================================================================
class DependencyAnalyzer:
    """Builds and analyzes dependency graph."""
    
    def __init__(self, project_path: Path, src_path: Path, files: Dict[str, FileInfo]):
        self.project_path = project_path
        self.src_path = src_path
        self.files = files
    
    def build_graph(self) -> Dict[str, List[str]]:
        """Build dependency graph and populate depends_on & dependents."""
        graph = defaultdict(list)
        
        for file_path, file_info in self.files.items():
            for imp in file_info.imports:
                resolved = self._resolve_import(file_path, imp)
                if resolved and resolved in self.files:
                    file_info.depends_on.append(resolved)
                    self.files[resolved].dependents.append(file_path)
                    graph[file_path].append(resolved)
        
        return dict(graph)
    
    def _resolve_import(self, from_file: str, import_path: str) -> Optional[str]:
        """Resolve import path to actual file path (relative to project)."""
        try:
            if not import_path.startswith('.') and not import_path.startswith('@/'):
                return None
            
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
            
            if base_path.is_dir():
                for ext in Config.VALID_EXTENSIONS:
                    test_path = base_path / f'index{ext}'
                    rel_path = str(test_path.relative_to(self.project_path))
                    if rel_path in self.files:
                        return rel_path
            
            return None
        except Exception:
            return None
    
    def find_unused(self) -> List[str]:
        """Find files that are not imported by any other file."""
        unused = []
        entry_patterns = ['main.', 'index.', 'app.', 'App.']
        
        for file_path, file_info in self.files.items():
            is_entry = any(pattern in Path(file_path).name for pattern in entry_patterns)
            if is_entry:
                file_info.is_entry_point = True
                continue
            if not file_info.dependents and file_info.exports:
                unused.append(file_path)
        
        return unused

# =============================================================================
# VALUE SCORER
# =============================================================================
class ValueScorer:
    """Scores the value of potentially unused components."""
    
    @staticmethod
    def score_component(file_info: FileInfo, content: str) -> Tuple[float, List[str]]:
        score = 0.0
        reasons = []
        weights = Config.SCORE_WEIGHTS
        
        ai_hooks = [h for h in file_info.hooks_used if h in Config.AI_HOOKS]
        if ai_hooks:
            score += weights['ai_hook']
            reasons.append(f"+{weights['ai_hook']} AI hooks: {', '.join(ai_hooks)}")
        
        if file_info.has_mcp or any(p in content for p in Config.MCP_PATTERNS):
            score += weights['mcp']
            reasons.append(f"+{weights['mcp']} MCP protocol integration")
        
        if file_info.has_voice or any(p in content for p in Config.VOICE_PATTERNS):
            score += weights['voice']
            reasons.append(f"+{weights['voice']} Voice command capabilities")
        
        complexity_score = min(weights['complexity'], 
                              (file_info.hook_count * 3) + (file_info.context_count * 2))
        if complexity_score >= 5:
            score += complexity_score
            reasons.append(f"+{complexity_score} Complexity (hooks: {file_info.hook_count}, contexts: {file_info.context_count})")
        
        if file_info.has_interface or file_info.has_type_export:
            score += weights['types']
            reasons.append(f"+{weights['types']} Well‑typed (interfaces/types exported)")
        
        name = Path(file_info.path).stem
        name_bonus = 0
        for indicator in Config.HIGH_VALUE_NAMES:
            if indicator in name:
                name_bonus += 5
        name_bonus = min(name_bonus, weights['name_quality'])
        if name_bonus:
            score += name_bonus
            reasons.append(f"+{name_bonus} High-value name pattern: {name}")
        
        if file_info.lines > 200:
            score += weights['size_bonus']
            reasons.append(f"+{weights['size_bonus']} Substantial implementation ({file_info.lines} lines)")
        
        if len(file_info.hooks_used) > 3:
            extra = min(5, len(file_info.hooks_used) * 2)
            score += extra
            reasons.append(f"+{extra} Rich hook usage ({len(file_info.hooks_used)} hooks)")
        
        final_score = min(score, 100.0)
        return final_score, reasons

# =============================================================================
# WIRING ISSUE DETECTOR
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
        low, high = Config.SEVERITY_SCORES[severity]
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
# ARCHITECTURAL ANALYZER (with cycle detection)
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

    # (other analyze_* methods unchanged – omitted for brevity, keep them identical)
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
# GIT HELPER
# =============================================================================
class GitHelper:
    """Retrieves git metadata for files if available."""
    
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
# HTML REPORT GENERATOR (v6.2.0)
# =============================================================================
class HTMLReportGenerator:
    """Generates beautiful HTML reports."""
    
    @staticmethod
    def generate(result: AnalysisResult, output_path: Path, with_git: bool = False):
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
    <title>G-Studio Code Analysis Report v6.2</title>
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
            <h1>🎯 G-Studio Code Analysis v6.2</h1>
            <div class="subtitle">Intelligent Analysis of React/TypeScript Codebase</div>
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
        </div>
        
        <div class="footer">
            Generated by G-Studio Code Intelligence v6.2.0-beta<br>
            {result.total_files} files · {result.total_lines} lines · {len(result.wiring_issues)} issues
        </div>
    </div>
</body>
</html>"""
        output_path.write_text(html, encoding='utf-8')
        log_success(f"HTML report generated: {output_path}")

# =============================================================================
# MAIN ANALYZER
# =============================================================================
class GStudioAnalyzer:
    """Main analyzer orchestrator."""
    
    def __init__(self, project_path: Path, output_dir: Path, 
                 use_cache: bool = True, verbose: bool = False,
                 dry_run: bool = False, parallel: bool = True,
                 changed_only: bool = False, csv_export: bool = False,
                 min_score: int = 0):
        self.project_path = project_path
        self.output_dir = output_dir
        self.use_cache = use_cache
        self.verbose = verbose
        self.dry_run = dry_run
        self.parallel = parallel
        self.changed_only = changed_only
        self.csv_export = csv_export
        self.min_score = min_score
        
        if not dry_run:
            self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.cache = CacheManager(project_path / Config.CACHE_FILE, use_cache and not dry_run)
        self.parser = FileParser(verbose=verbose)
        self.scanner = FileScanner(project_path, verbose)
        self.git_helper = GitHelper()
        
        self.files: Dict[str, FileInfo] = {}
        self.result = AnalysisResult(total_files=0, tsx_percentage=0, total_lines=0)
        self.skipped_files = 0
    
    def analyze(self) -> AnalysisResult:
        log_header("G-STUDIO INTELLIGENT CODE ANALYZER v6.2.0-beta")
        
        log_info("Scanning project files...")
        file_paths = self.scanner.scan()
        total_candidates = len(file_paths)
        log_success(f"Found {total_candidates} source files")
        
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
        
        log_info("Parsing and analyzing files...")
        self._analyze_files(file_paths)
        log_success(f"Analyzed {len(self.files)} files")
        
        log_info("Building dependency graph...")
        dep_analyzer = DependencyAnalyzer(self.project_path, self.scanner.src_path, self.files)
        self.result.dependency_graph = dep_analyzer.build_graph()
        unused = dep_analyzer.find_unused()
        log_success(f"Found {len(unused)} potentially unused files")
        
        log_info("Scoring valuable unused components...")
        self._find_valuable_unused(unused)
        log_success(f"Found {len(self.result.valuable_unused)} valuable unused components (min score: {self.min_score})")
        
        log_info("Detecting wiring issues...")
        self._detect_wiring_issues()
        log_success(f"Found {len(self.result.wiring_issues)} wiring issues")
        
        log_info("Analyzing architecture...")
        arch_analyzer = ArchitecturalAnalyzer(self.files, self.project_path)
        self.result.insights = arch_analyzer.analyze()
        log_success(f"Generated {len(self.result.insights)} architectural insights")
        
        self._calculate_stats()
        
        if not self.dry_run:
            self.cache.save()
        
        return self.result
    
    def _analyze_files(self, file_paths: List[Path]):
        if self.parallel:
            with ThreadPoolExecutor(max_workers=Config.MAX_WORKERS) as executor:
                future_to_path = {executor.submit(self._analyze_single_file, p): p for p in file_paths}
                for future in tqdm(as_completed(future_to_path), total=len(file_paths), desc="Analyzing files"):
                    try:
                        future.result()
                    except Exception as e:
                        if self.verbose:
                            log_warning(f"Error in worker: {e}")
        else:
            for file_path in tqdm(file_paths, desc="Analyzing files"):
                self._analyze_single_file(file_path)
    
    def _analyze_single_file(self, file_path: Path):
        try:
            content = file_path.read_text(encoding='utf-8')
            content_hash = hashlib.md5(content.encode()).hexdigest()
            mtime = file_path.stat().st_mtime
            rel_path = str(file_path.relative_to(self.project_path))
            cached = self.cache.get(rel_path, mtime, content_hash)
            
            if cached:
                cached_info = cached['file_info']
                default_info = asdict(FileInfo(path="", relative_path="", layer=LayerType.UNKNOWN, size=0, lines=0, hash="", mtime=0))
                default_info.update(cached_info)
                for field_name in ['import_details', 'export_details', 'is_functional_component',
                                   'is_custom_hook', 'is_context_provider', 'has_create_context']:
                    if field_name not in default_info:
                        default_info[field_name] = [] if field_name.endswith('details') else False
                file_info = FileInfo(**default_info)
            else:
                parsed = self.parser.parse_file(file_path, content)
                layer = self._classify_layer_with_signals(file_path, content, parsed)
                file_info = FileInfo(
                    path=rel_path,
                    relative_path=rel_path,
                    layer=layer,
                    size=len(content),
                    lines=len(content.split('\n')),
                    hash=content_hash,
                    mtime=mtime,
                    imports=parsed['imports'],
                    exports=parsed['exports'],
                    hooks_used=parsed['hooks_used'],
                    contexts_used=parsed['contexts_used'],
                    has_interface=parsed['has_interface'],
                    has_type_export=parsed['has_type_export'],
                    hook_count=len(parsed['hooks_used']),
                    context_count=len(parsed['contexts_used']),
                    complexity_score=len(parsed['hooks_used']) * 2 + len(parsed['contexts_used']) * 3,
                    import_details=parsed.get('import_details', []),
                    export_details=parsed.get('export_details', []),
                    is_functional_component=parsed.get('is_functional_component', False),
                    is_custom_hook=parsed.get('is_custom_hook', False),
                    is_context_provider=parsed.get('is_context_provider', False),
                    has_create_context=parsed.get('has_create_context', False)
                )
                file_info.has_ai_hook = any(h in Config.AI_HOOKS for h in file_info.hooks_used)
                file_info.has_mcp = any(p in content for p in Config.MCP_PATTERNS)
                file_info.has_voice = any(p in content for p in Config.VOICE_PATTERNS)
                try:
                    author, date = self.git_helper.get_last_commit_info(file_path, self.project_path)
                    file_info.git_last_author = author
                    file_info.git_last_modified = date
                except:
                    pass
                self.cache.set(rel_path, {
                    'mtime': mtime,
                    'hash': content_hash,
                    'file_info': asdict(file_info)
                })
            
            self.files[rel_path] = file_info
        
        except Exception as e:
            if self.verbose:
                log_warning(f"Error analyzing {file_path}: {e}")
    
    def _classify_layer_with_signals(self, file_path: Path, content: str, parsed: Dict) -> LayerType:
        if parsed.get('has_create_context', False) or 'createContext' in content:
            return LayerType.CONTEXTS
        if parsed.get('is_custom_hook', False):
            return LayerType.HOOKS
        if parsed.get('is_functional_component', False):
            if parsed.get('is_context_provider', False):
                return LayerType.CONTEXTS
            return LayerType.COMPONENTS
        name = file_path.stem
        if 'Service' in name or 'Manager' in name or 'Engine' in name:
            return LayerType.SERVICES
        if 'export const' in content and '(' not in content and '{' in content:
            return LayerType.SERVICES
        if parsed.get('has_interface', False) or parsed.get('has_type_export', False):
            return LayerType.TYPES
        return self._determine_layer(file_path)
    
    def _determine_layer(self, file_path: Path) -> LayerType:
        path_str = str(file_path).lower()
        if '/components/' in path_str or '\\components\\' in path_str:
            return LayerType.COMPONENTS
        elif '/hooks/' in path_str or '\\hooks\\' in path_str:
            return LayerType.HOOKS
        elif '/services/' in path_str or '\\services\\' in path_str:
            return LayerType.SERVICES
        elif '/contexts/' in path_str or '\\contexts\\' in path_str:
            return LayerType.CONTEXTS
        elif '/stores/' in path_str or '\\stores\\' in path_str:
            return LayerType.STORES
        elif '/features/' in path_str or '\\features\\' in path_str:
            return LayerType.FEATURES
        elif '/utils/' in path_str or '\\utils\\' in path_str:
            return LayerType.UTILS
        elif '/types/' in path_str or '\\types\\' in path_str:
            return LayerType.TYPES
        else:
            return LayerType.UNKNOWN
    
    def _find_valuable_unused(self, unused_paths: List[str]):
        for path in unused_paths:
            if path not in self.files:
                continue
            file_info = self.files[path]
            try:
                full_path = self.project_path / path
                content = full_path.read_text(encoding='utf-8')
            except:
                continue
            value_score, reasons = ValueScorer.score_component(file_info, content)
            if value_score > 30 and value_score >= self.min_score:
                suggested_location = self._suggest_integration_location(file_info)
                integration_code = self._generate_integration_code(file_info)
                effort = 'low' if file_info.layer == LayerType.HOOKS else 'medium'
                comp = ValuableComponent(
                    name=Path(path).stem,
                    path=path,
                    layer=file_info.layer,
                    value_score=value_score,
                    reasons=reasons,
                    suggested_location=suggested_location,
                    integration_effort=effort,
                    integration_code=integration_code,
                    exports=file_info.exports,
                    hooks=file_info.hooks_used,
                    patterns=[],
                    last_author=file_info.git_last_author,
                    last_modified_date=file_info.git_last_modified
                )
                if file_info.has_ai_hook:
                    comp.patterns.append('AI Integration')
                if file_info.has_mcp:
                    comp.patterns.append('MCP Protocol')
                if file_info.has_voice:
                    comp.patterns.append('Voice Commands')
                self.result.valuable_unused.append(comp)
    
    def _suggest_integration_location(self, file_info: FileInfo) -> str:
        if file_info.layer == LayerType.HOOKS:
            return "Import in component that needs this functionality"
        elif file_info.layer == LayerType.SERVICES:
            return "src/services/index.ts (add to barrel export)"
        elif file_info.layer == LayerType.CONTEXTS:
            return "src/App.tsx or AppProvider (wrap in provider)"
        elif 'Modal' in file_info.path:
            return "ModalManager or App.tsx"
        elif 'Panel' in file_info.path:
            return "MainLayout or relevant feature"
        else:
            return "App.tsx or appropriate parent component"
    
    def _generate_integration_code(self, file_info: FileInfo) -> str:
        name = Path(file_info.path).stem
        import_path = file_info.path.replace('\\', '/').replace('.tsx', '').replace('.ts', '')
        if file_info.layer == LayerType.HOOKS:
            return f"""// In your component:
import {{ {name} }} from '@/{import_path}';

const {{ data, loading, error }} = {name}();"""
        elif file_info.layer == LayerType.CONTEXTS:
            return f"""// In App.tsx:
import {{ {name}Provider }} from '@/{import_path}';

<{name}Provider>
  {{children}}
</{name}Provider>"""
        elif file_info.layer == LayerType.SERVICES:
            return f"""// In src/services/index.ts:
export {{ {name} }} from './{Path(file_info.path).name}';

// Usage:
import {{ {name} }} from '@/services';
const result = await {name}.method();"""
        else:
            return f"""// Import and use:
import {{ {name} }} from '@/{import_path}';

<{name} />"""
    
    def _detect_wiring_issues(self):
        detector = WiringIssueDetector(self.files, self.project_path, verbose=self.verbose)
        for file_path, file_info in tqdm(self.files.items(), desc="Checking wiring"):
            try:
                full_path = self.project_path / file_path
                content = full_path.read_text(encoding='utf-8')
                issues = detector.detect_issues(file_path, content)
                self.result.wiring_issues.extend(issues)
            except Exception as e:
                if self.verbose:
                    log_warning(f"Error checking wiring for {file_path}: {e}")
        self.result.wiring_issues.extend(detector.post_process_ai_providers())
    
    def _calculate_stats(self):
        self.result.total_files = len(self.files)
        tsx_files = sum(1 for f in self.files.values() 
                       if f.path.endswith('.tsx') or f.path.endswith('.jsx'))
        self.result.tsx_percentage = (tsx_files / self.result.total_files * 100) if self.result.total_files > 0 else 0
        self.result.total_lines = sum(f.lines for f in self.files.values())
        for file_info in self.files.values():
            layer_name = file_info.layer.value
            self.result.layer_stats[layer_name] = self.result.layer_stats.get(layer_name, 0) + 1
    
    def _export_csv(self):
        if self.result.valuable_unused:
            csv_path = self.output_dir / 'valuable_unused.csv'
            with open(csv_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['Name', 'Path', 'Layer', 'Score', 'Reasons', 'Suggested Location', 'Last Author', 'Last Modified'])
                for comp in sorted(self.result.valuable_unused, key=lambda x: x.value_score, reverse=True):
                    writer.writerow([
                        comp.name,
                        comp.path,
                        comp.layer.value,
                        f"{comp.value_score:.0f}",
                        "; ".join(comp.reasons),
                        comp.suggested_location,
                        comp.last_author,
                        comp.last_modified_date
                    ])
            log_success(f"CSV export: {csv_path}")
        if self.result.wiring_issues:
            csv_path = self.output_dir / 'wiring_issues.csv'
            with open(csv_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['File', 'Line', 'Severity', 'Score', 'Type', 'Current Import', 'Better Alternative', 'Reasoning'])
                for issue in sorted(self.result.wiring_issues, key=lambda x: x.severity_score, reverse=True):
                    writer.writerow([
                        issue.file_path,
                        issue.line_number,
                        issue.severity.value,
                        issue.severity_score,
                        issue.issue_type,
                        issue.current_import,
                        issue.better_alternative,
                        "; ".join(issue.reasoning)
                    ])
            log_success(f"CSV export: {csv_path}")
    
    def generate_report(self, html_only: bool = False):
        if self.dry_run:
            log_info("DRY RUN: skipping report generation")
            return
        
        log_info("Generating reports...")
        html_path = self.output_dir / 'analysis_report.html'
        HTMLReportGenerator.generate(self.result, html_path, with_git=True)
        json_path = self.output_dir / 'analysis_report.json'
        with open(json_path, 'w') as f:
            json.dump({
                'total_files': self.result.total_files,
                'tsx_percentage': self.result.tsx_percentage,
                'total_lines': self.result.total_lines,
                'valuable_unused': [asdict(c) for c in self.result.valuable_unused],
                'wiring_issues': [asdict(i) for i in self.result.wiring_issues],
                'insights': [asdict(i) for i in self.result.insights],
                'layer_stats': self.result.layer_stats,
            }, f, indent=2, default=str)
        log_success(f"JSON report saved to {json_path}")
        if self.csv_export:
            self._export_csv()
        if not html_only:
            self._print_summary()
    
    def _print_summary(self):
        log_header("ANALYSIS SUMMARY")
        print(f"{Colors.BOLD}Files:{Colors.END} {self.result.total_files}")
        if self.changed_only and self.skipped_files > 0:
            print(f"{Colors.BOLD}  (unchanged skipped:{Colors.END} {self.skipped_files})")
        print(f"{Colors.BOLD}TSX Percentage:{Colors.END} {self.result.tsx_percentage:.1f}%")
        print(f"{Colors.BOLD}Total Lines:{Colors.END} {self.result.total_lines:,}")
        print(f"{Colors.BOLD}Valuable Unused:{Colors.END} {len(self.result.valuable_unused)} (min score: {self.min_score})")
        print(f"{Colors.BOLD}Wiring Issues:{Colors.END} {len(self.result.wiring_issues)}")
        if self.result.valuable_unused:
            print(f"\n{Colors.BOLD}{Colors.GREEN}Top Valuable Unused:{Colors.END}")
            for comp in sorted(self.result.valuable_unused, key=lambda x: x.value_score, reverse=True)[:5]:
                print(f"  • {comp.name} ({comp.value_score:.0f} points) - {comp.layer.value}")
        if self.result.wiring_issues:
            print(f"\n{Colors.BOLD}{Colors.YELLOW}Top Wiring Issues:{Colors.END}")
            critical = [i for i in self.result.wiring_issues if i.severity == Severity.CRITICAL]
            high = [i for i in self.result.wiring_issues if i.severity == Severity.HIGH]
            print(f"  • Critical: {len(critical)}")
            print(f"  • High: {len(high)}")
        print(f"\n{Colors.BOLD}{Colors.CYAN}📊 Open the HTML report for detailed analysis:{Colors.END}")
        print(f"  {self.output_dir / 'analysis_report.html'}")

# =============================================================================
# CLI ENTRY POINT
# =============================================================================
def main():
    parser = argparse.ArgumentParser(
        description="G-Studio Intelligent Code Analyzer v6.2.0-beta",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s .
  %(prog)s /path/to/project --output-dir ./reports
  %(prog)s . --no-cache --verbose
  %(prog)s . --dry-run                     # only simulate, no disk writes
  %(prog)s . --since-last-commit          # only files changed since last commit
  %(prog)s . --csv                       # export CSV files alongside JSON/HTML
  %(prog)s . --min-score 50              # only show unused components with score >= 50
        """
    )
    
    parser.add_argument('project_path', nargs='?', default='.', help='Path to G-Studio project (default: current directory)')
    parser.add_argument('--output-dir', default='./gstudio-reports', help='Output directory for reports (default: ./gstudio-reports)')
    parser.add_argument('--no-cache', action='store_true', help='Disable file caching')
    parser.add_argument('--verbose', action='store_true', help='Enable verbose logging')
    parser.add_argument('--html-only', action='store_true', help='Only generate HTML report without terminal output')
    parser.add_argument('--dry-run', action='store_true', help='Simulate analysis without writing reports or cache')
    parser.add_argument('--no-parallel', action='store_true', help='Disable parallel file parsing')
    parser.add_argument('--since-last-commit', '-c', action='store_true', help='Only analyze files changed since the last Git commit')
    parser.add_argument('--csv', action='store_true', help='Export valuable_unused and wiring_issues as CSV files')
    parser.add_argument('--min-score', type=int, default=0, help='Minimum value score for valuable unused components (default: 0, always keeps >30)')
    
    args = parser.parse_args()
    
    project_path = Path(args.project_path).resolve()
    output_dir = Path(args.output_dir).resolve()
    
    if not project_path.exists():
        log_error(f"Project path does not exist: {project_path}")
        sys.exit(1)
    
    try:
        analyzer = GStudioAnalyzer(
            project_path=project_path,
            output_dir=output_dir,
            use_cache=not args.no_cache,
            verbose=args.verbose,
            dry_run=args.dry_run,
            parallel=not args.no_parallel,
            changed_only=args.since_last_commit,
            csv_export=args.csv,
            min_score=args.min_score
        )
        result = analyzer.analyze()
        analyzer.generate_report(html_only=args.html_only)
        log_success("Analysis complete!")
    except KeyboardInterrupt:
        log_warning("\nAnalysis interrupted by user")
        sys.exit(1)
    except Exception as e:
        log_error(f"Analysis failed: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)

if __name__ == '__main__':
    main()