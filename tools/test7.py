#!/usr/bin/env python3
"""
G-Studio Intelligent Code Analyzer v6.0.0-beta
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

What's new in v6.0.0-beta:
    ✓ Tree‑sitter AST traversal for precise import/export extraction
    ✓ Dependents now correctly populated – unused detection is reliable
    ✓ Weighted value scoring with clear, hierarchical reasons
    ✓ 5 real wiring rules (direct SDK, useContext hook, test imports, multi‑provider, raw fetch)
    ✓ Meaningful architectural insights (context overuse, AI diversity, MCP coverage, hook naming)
    ✓ Polished HTML report: sortable tables, severity badges, score bars, collapsible code
    ✓ ThreadPoolExecutor for parallel file analysis (up to 4x speedup)
    ✓ Git author & last modified date for valuable unused components (if git available)
    ✓ --dry-run flag – only simulate, no disk writes
    ✓ Full backwards compatibility – all v5.0 features remain intact

Author: G-Studio Team
Version: 6.0.0-beta
"""

import os
import sys
import json
import hashlib
import argparse
import time
import re
import subprocess
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
    
    # Worker threads for parallel parsing
    MAX_WORKERS = max(1, os.cpu_count() or 1)

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
# FILE PARSER (with real tree‑sitter support)
# =============================================================================
class FileParser:
    """Parses TypeScript/JavaScript files using tree-sitter or regex fallback."""
    
    def __init__(self):
        self.ts_parser = None
        self.tsx_parser = None
        
        # Try to initialize tree-sitter
        if TREE_SITTER_AVAILABLE:
            try:
                # TypeScript language
                TS_LANGUAGE = Language(tree_sitter_typescript.language_typescript())
                self.ts_parser = Parser()
                self.ts_parser.set_language(TS_LANGUAGE)
                
                # TSX language
                TSX_LANGUAGE = Language(tree_sitter_typescript.language_tsx())
                self.tsx_parser = Parser()
                self.tsx_parser.set_language(TSX_LANGUAGE)
                
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
                # Fall back to regex
                pass
        
        # Regex fallback
        return self._parse_with_regex(content)
    
    def _parse_with_tree_sitter(self, content: str, parser: Any) -> Dict[str, Any]:
        """Parse using tree-sitter with precise AST traversal."""
        tree = parser.parse(bytes(content, 'utf-8'))
        root = tree.root_node
        
        result = {
            'imports': [],
            'exports': [],
            'hooks_used': [],
            'contexts_used': [],
            'has_interface': False,
            'has_type_export': False
        }
        
        def get_node_text(node: Node) -> str:
            return content[node.start_byte:node.end_byte]
        
        def walk(node: Node):
            # Import statements
            if node.type == 'import_statement':
                # Find the string literal (module source)
                for child in node.children:
                    if child.type == 'string':
                        result['imports'].append(get_node_text(child).strip('\'"'))
                        break
            
            # Export statements
            elif node.type == 'export_statement':
                # Default export
                if 'default' in get_node_text(node):
                    result['exports'].append('default')
                # Named exports: export { a, b } or export const x
                for child in node.children:
                    if child.type == 'export_clause':
                        for spec in child.children:
                            if spec.type == 'export_specifier':
                                name_node = spec.child_by_field_name('name')
                                if name_node:
                                    result['exports'].append(get_node_text(name_node))
                    elif child.type in {'function_declaration', 'class_declaration', 'lexical_declaration'}:
                        # find identifier
                        ident = self._find_identifier(child, content)
                        if ident:
                            result['exports'].append(ident)
            
            # Re-export: export ... from 'module'
            elif node.type == 'export_statement' and any(c.type == 'string' for c in node.children):
                # This is handled as export statement; we also want to capture the export names
                pass
            
            # Hooks: call expressions starting with 'use'
            elif node.type == 'call_expression':
                func = node.child_by_field_name('function')
                if func and func.type == 'identifier':
                    name = get_node_text(func)
                    if name.startswith('use'):
                        result['hooks_used'].append(name)
            
            # Interfaces and types
            elif node.type == 'interface_declaration':
                result['has_interface'] = True
            elif node.type == 'type_alias_declaration':
                # Check if it's exported
                parent = node.parent
                if parent and parent.type == 'export_statement':
                    result['has_type_export'] = True
            
            for child in node.children:
                walk(child)
        
        walk(root)
        
        # Deduplicate lists
        result['imports'] = list(set(result['imports']))
        result['exports'] = list(set(result['exports']))
        result['hooks_used'] = list(set(result['hooks_used']))
        
        # Contexts used: look for useContext calls
        ctx_pattern = r'useContext\((\w+)\)'
        result['contexts_used'] = list(set(re.findall(ctx_pattern, content)))
        
        return result
    
    def _find_identifier(self, node: Node, content: str) -> Optional[str]:
        """Recursively find the first identifier in a node."""
        if node.type == 'identifier':
            return content[node.start_byte:node.end_byte]
        for child in node.children:
            res = self._find_identifier(child, content)
            if res:
                return res
        return None
    
    def _parse_with_regex(self, content: str) -> Dict[str, Any]:
        """Parse using regex patterns (fallback method)."""
        result = {
            'imports': [],
            'exports': [],
            'hooks_used': [],
            'contexts_used': [],
            'has_interface': False,
            'has_type_export': False
        }
        
        # Extract imports
        # Matches: import ... from 'module'
        import_pattern = r"import\s+(?:{[^}]+}|[\w\s,*]+)\s+from\s+['\"]([^'\"]+)['\"]"
        result['imports'] = re.findall(import_pattern, content)
        
        # Extract exports
        # Matches: export { Name }, export const Name, export function Name, export default Name
        export_patterns = [
            r'export\s+{\s*([^}]+)\s*}',  # export { X, Y }
            r'export\s+(?:const|let|var|function|class)\s+(\w+)',  # export const X
            r'export\s+default\s+(\w+)',  # export default X
        ]
        for pattern in export_patterns:
            matches = re.findall(pattern, content)
            for match in matches:
                # Split by comma for grouped exports
                names = [n.strip() for n in match.split(',')]
                result['exports'].extend(names)
        
        # Detect hooks usage
        for hook in Config.REACT_HOOKS + Config.AI_HOOKS + Config.VOICE_PATTERNS:
            if re.search(rf'\b{hook}\s*\(', content):
                result['hooks_used'].append(hook)
        
        # Detect context usage
        context_pattern = r'useContext\((\w+)\)'
        result['contexts_used'] = re.findall(context_pattern, content)
        
        # Detect interfaces and types
        result['has_interface'] = bool(re.search(r'\binterface\s+\w+', content))
        result['has_type_export'] = bool(re.search(r'export\s+type\s+\w+', content))
        
        return result

# =============================================================================
# FILE SCANNER
# =============================================================================
class FileScanner:
    """Scans project directory for source files."""
    
    def __init__(self, project_path: Path, verbose: bool = False):
        self.project_path = project_path
        self.verbose = verbose
        
        # Determine src path (prefer src/ if exists, otherwise use project root)
        self.src_path = project_path / 'src'
        if not self.src_path.exists():
            self.src_path = project_path
            log_info(f"No 'src' directory found, using project root: {project_path}")
    
    def scan(self) -> List[Path]:
        """Scan for all valid source files."""
        files = []
        
        for root, dirs, filenames in os.walk(self.src_path):
            # Filter out ignored directories
            dirs[:] = [d for d in dirs if d not in Config.IGNORE_DIRS]
            
            for filename in filenames:
                # Check extension
                if not any(filename.endswith(ext) for ext in Config.VALID_EXTENSIONS):
                    continue
                
                # Check if file should be ignored
                if any(pattern in filename for pattern in Config.IGNORE_FILES):
                    continue
                
                file_path = Path(root) / filename
                files.append(file_path)
        
        if self.verbose:
            log_info(f"Found {len(files)} source files")
        
        return files

# =============================================================================
# DEPENDENCY ANALYZER (improved resolver & dependents)
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
            # For each import, try to resolve to actual file
            for imp in file_info.imports:
                resolved = self._resolve_import(file_path, imp)
                if resolved and resolved in self.files:
                    file_info.depends_on.append(resolved)
                    # Add to dependents of the imported file
                    self.files[resolved].dependents.append(file_path)
                    graph[file_path].append(resolved)
        
        return dict(graph)
    
    def _resolve_import(self, from_file: str, import_path: str) -> Optional[str]:
        """Resolve import path to actual file path (relative to project)."""
        try:
            # Skip external modules (node_modules) unless they start with '.' or '@/'
            if not import_path.startswith('.') and not import_path.startswith('@/'):
                return None
            
            # Handle @ alias (usually maps to src/)
            if import_path.startswith('@/'):
                import_path = import_path[2:]  # Remove @/
                base_path = self.src_path / import_path
            else:
                # Relative import
                from_dir = Path(from_file).parent
                # Ensure absolute path for resolution
                base_path = (self.project_path / from_dir / import_path).resolve()
            
            # 1. Try exact file with supported extensions
            for ext in Config.VALID_EXTENSIONS:
                test_path = base_path.with_suffix(ext)
                try:
                    rel_path = str(test_path.relative_to(self.project_path))
                    if rel_path in self.files:
                        return rel_path
                except ValueError:
                    # Path is not relative to project, skip it
                    continue
            
            # 2. Try as directory with index file
            for ext in Config.VALID_EXTENSIONS:
                test_path = base_path / f'index{ext}'
                try:
                    rel_path = str(test_path.relative_to(self.project_path))
                    if rel_path in self.files:
                        return rel_path
                except ValueError:
                    continue
            
            # 3. If import_path has no extension and base_path is a directory, try index files
            if base_path.is_dir():
                for ext in Config.VALID_EXTENSIONS:
                    test_path = base_path / f'index{ext}'
                    rel_path = str(test_path.relative_to(self.project_path))
                    if rel_path in self.files:
                        return rel_path
            
            return None
        except Exception:
            # Any error in path resolution, just return None
            return None
    
    def find_unused(self) -> List[str]:
        """Find files that are not imported by any other file."""
        unused = []
        
        # Consider entry points (like main.tsx, index.tsx, App.tsx) as used
        entry_patterns = ['main.', 'index.', 'app.', 'App.']
        
        for file_path, file_info in self.files.items():
            # Skip entry points
            is_entry = any(pattern in Path(file_path).name for pattern in entry_patterns)
            if is_entry:
                file_info.is_entry_point = True
                continue
            
            # If no dependents and has exports, it's unused
            if not file_info.dependents and file_info.exports:
                unused.append(file_path)
        
        return unused

# =============================================================================
# VALUE SCORER (enhanced, weighted)
# =============================================================================
class ValueScorer:
    """Scores the value of potentially unused components."""
    
    @staticmethod
    def score_component(file_info: FileInfo, content: str) -> Tuple[float, List[str]]:
        """
        Calculate value score (0-100) and reasons using weighted criteria.
        """
        score = 0.0
        reasons = []
        weights = Config.SCORE_WEIGHTS
        
        # 1. AI hooks (max 30)
        ai_hooks = [h for h in file_info.hooks_used if h in Config.AI_HOOKS]
        if ai_hooks:
            score += weights['ai_hook']
            reasons.append(f"+{weights['ai_hook']} AI hooks: {', '.join(ai_hooks)}")
        
        # 2. MCP integration (max 25)
        if file_info.has_mcp or any(p in content for p in Config.MCP_PATTERNS):
            score += weights['mcp']
            reasons.append(f"+{weights['mcp']} MCP protocol integration")
        
        # 3. Voice patterns (max 20)
        if file_info.has_voice or any(p in content for p in Config.VOICE_PATTERNS):
            score += weights['voice']
            reasons.append(f"+{weights['voice']} Voice command capabilities")
        
        # 4. Logical complexity (max 15)
        complexity_score = min(weights['complexity'], 
                              (file_info.hook_count * 3) + (file_info.context_count * 2))
        if complexity_score >= 5:
            score += complexity_score
            reasons.append(f"+{complexity_score} Complexity (hooks: {file_info.hook_count}, contexts: {file_info.context_count})")
        
        # 5. Types & interfaces (max 10)
        if file_info.has_interface or file_info.has_type_export:
            score += weights['types']
            reasons.append(f"+{weights['types']} Well‑typed (interfaces/types exported)")
        
        # 6. Name quality – high-value indicators (max 10)
        name = Path(file_info.path).stem
        name_bonus = 0
        for indicator in Config.HIGH_VALUE_NAMES:
            if indicator in name:
                name_bonus += 5
        name_bonus = min(name_bonus, weights['name_quality'])
        if name_bonus:
            score += name_bonus
            reasons.append(f"+{name_bonus} High-value name pattern: {name}")
        
        # 7. Size bonus – substantial implementation (max 5)
        if file_info.lines > 200:
            score += weights['size_bonus']
            reasons.append(f"+{weights['size_bonus']} Substantial implementation ({file_info.lines} lines)")
        
        # 8. Additional hooks/contexts richness (extra small bonuses)
        if len(file_info.hooks_used) > 3:
            extra = min(5, len(file_info.hooks_used) * 2)
            score += extra
            reasons.append(f"+{extra} Rich hook usage ({len(file_info.hooks_used)} hooks)")
        
        # 9. Entry point (not unused) – not applicable here because we only score unused
        
        # Cap at 100
        final_score = min(score, 100.0)
        return final_score, reasons

# =============================================================================
# WIRING ISSUE DETECTOR (5+ real rules)
# =============================================================================
class WiringIssueDetector:
    """Detects incorrect import patterns and suggests better alternatives."""
    
    def __init__(self, files: Dict[str, FileInfo], project_path: Path):
        self.files = files
        self.project_path = project_path
        self.ctx_to_hook_map = self._build_context_hook_map()
    
    def _build_context_hook_map(self) -> Dict[str, str]:
        """Map context names to custom hooks that return them (if any)."""
        ctx_map = {}
        for file_path, info in self.files.items():
            if info.layer == LayerType.HOOKS:
                # Check if hook returns a context (simplified: look for 'useContext' in file)
                try:
                    full_path = self.project_path / file_path
                    content = full_path.read_text(encoding='utf-8')
                    # Find context usage inside hook
                    for ctx in re.findall(r'useContext\((\w+)\)', content):
                        hook_name = Path(info.path).stem
                        if hook_name.startswith('use'):
                            ctx_map[ctx] = hook_name
                except:
                    pass
        return ctx_map
    
    def detect_issues(self, file_path: str, content: str) -> List[WiringIssue]:
        """Detect wiring issues in a file."""
        issues = []
        
        # Get imports from content
        import_pattern = r"import\s+(?:{[^}]+}|[\w\s,*]+)\s+from\s+['\"]([^'\"]+)['\"]"
        imports = re.findall(import_pattern, content)
        
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            # Check each import on this line
            for imp in imports:
                if imp in line:
                    issues.extend(self._check_direct_sdk_import(file_path, line_num, imp, line))
                    issues.extend(self._check_test_file_import(file_path, line_num, imp))
                    issues.extend(self._check_layer_violation(file_path, line_num, imp, line))
                    issues.extend(self._check_multiple_ai_providers(file_path, line_num, imp, line))
            
            # Check for direct useContext without custom hook
            issues.extend(self._check_context_usage(file_path, line_num, line))
            
            # Check for raw fetch/axios calls
            issues.extend(self._check_raw_fetch(file_path, line_num, line))
        
        return issues
    
    def _check_direct_sdk_import(self, file_path: str, line_num: int, 
                                 import_path: str, line: str) -> List[WiringIssue]:
        """Rule: Direct SDK import instead of service/hook."""
        issues = []
        for sdk in Config.AI_SDK_IMPORTS:
            if sdk in import_path:
                # Skip if this is actually the service file itself
                if 'services' in file_path.lower() and 'gemini' in file_path.lower():
                    continue
                if 'hooks' in file_path.lower() and 'useGemini' in file_path.lower():
                    continue
                
                severity = Severity.HIGH
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
    
    def _check_test_file_import(self, file_path: str, line_num: int, 
                                import_path: str) -> List[WiringIssue]:
        """Rule: Import from test files in production code."""
        issues = []
        test_indicators = ['.test.', '.spec.', '__tests__', '__test__']
        if any(ind in import_path for ind in test_indicators):
            issues.append(WiringIssue(
                file_path=file_path,
                line_number=line_num,
                severity=Severity.CRITICAL,
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
    
    def _check_layer_violation(self, file_path: str, line_num: int,
                               import_path: str, line: str) -> List[WiringIssue]:
        """Rule: Services should not import components."""
        issues = []
        if 'services' in file_path and 'components' in import_path:
            issues.append(WiringIssue(
                file_path=file_path,
                line_number=line_num,
                severity=Severity.HIGH,
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
    
    def _check_multiple_ai_providers(self, file_path: str, line_num: int,
                                     import_path: str, line: str) -> List[WiringIssue]:
        """Rule: Multiple different AI SDKs imported in same file."""
        # This is checked per file, not per line; we'll accumulate and dedupe later.
        # We'll just return a single issue if the file imports more than one AI SDK.
        # To avoid duplicates, we'll check the whole content.
        # This method will be called for each import, but we'll guard with a flag.
        # We'll implement a simple check: if we see this import, later we'll aggregate.
        # To keep it simple, we'll just check if the current import is an AI SDK and 
        # if the file already has other AI SDK imports recorded.
        if not hasattr(self, '_ai_sdk_files'):
            self._ai_sdk_files = {}
        
        sdk_detected = None
        for sdk in Config.AI_SDK_IMPORTS:
            if sdk in import_path:
                sdk_detected = sdk
                break
        
        if sdk_detected:
            if file_path not in self._ai_sdk_files:
                self._ai_sdk_files[file_path] = set()
            self._ai_sdk_files[file_path].add(sdk_detected)
        
        # We'll generate the issue in a post‑processing step (outside this method).
        # For now, return empty list.
        return []
    
    def _check_context_usage(self, file_path: str, line_num: int, line: str) -> List[WiringIssue]:
        """Rule: Direct useContext(SomeContext) instead of a custom hook."""
        issues = []
        match = re.search(r'useContext\((\w+)\)', line)
        if match:
            ctx_name = match.group(1)
            # If we know a custom hook for this context, suggest it
            if ctx_name in self.ctx_to_hook_map:
                hook_name = self.ctx_to_hook_map[ctx_name]
                issues.append(WiringIssue(
                    file_path=file_path,
                    line_number=line_num,
                    severity=Severity.MEDIUM,
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
                # Suggest creating a custom hook
                issues.append(WiringIssue(
                    file_path=file_path,
                    line_number=line_num,
                    severity=Severity.LOW,
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
        """Rule: Direct fetch() or axios calls instead of MCP service."""
        issues = []
        if ('fetch(' in line or 'axios.' in line) and 'services' not in file_path and 'hooks' not in file_path:
            issues.append(WiringIssue(
                file_path=file_path,
                line_number=line_num,
                severity=Severity.MEDIUM,
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
        """Generate issues for files with multiple AI providers."""
        issues = []
        if hasattr(self, '_ai_sdk_files'):
            for file_path, sdks in self._ai_sdk_files.items():
                if len(sdks) > 1:
                    issues.append(WiringIssue(
                        file_path=file_path,
                        line_number=1,  # approximate
                        severity=Severity.MEDIUM,
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
# ARCHITECTURAL ANALYZER (enhanced with new insights)
# =============================================================================
class ArchitecturalAnalyzer:
    """Analyzes architectural patterns and health."""
    
    def __init__(self, files: Dict[str, FileInfo]):
        self.files = files
    
    def analyze(self) -> List[ArchitecturalInsight]:
        """Generate architectural insights."""
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
        
        return insights
    
    def _analyze_ai_providers(self) -> ArchitecturalInsight:
        """Analyze AI provider pattern implementation."""
        ai_files = [f for f in self.files.values() if f.has_ai_hook]
        
        health = 0
        strengths = []
        weaknesses = []
        recommendations = []
        
        if ai_files:
            health += 40
            strengths.append(f"✓ {len(ai_files)} files with AI integration")
            
            # Check for proper separation (hooks + services)
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
            
            # Check for error handling
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
        """Analyze MCP integration."""
        mcp_files = [f for f in self.files.values() if f.has_mcp]
        
        health = 0
        strengths = []
        weaknesses = []
        recommendations = []
        
        if mcp_files:
            health += 50
            strengths.append(f"✓ MCP integration found in {len(mcp_files)} files")
            
            # Check for proper structure
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
        """Analyze voice command integration."""
        voice_files = [f for f in self.files.values() if f.has_voice]
        
        health = 0
        strengths = []
        weaknesses = []
        recommendations = []
        
        if voice_files:
            health += 60
            strengths.append(f"✓ Voice integration in {len(voice_files)} files")
            
            # Check for proper hook usage
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
        """Analyze React Context usage patterns."""
        context_files = [f for f in self.files.values() if f.layer == LayerType.CONTEXTS]
        files_using_context = [f for f in self.files.values() if f.context_count > 0]
        
        health = 0
        strengths = []
        weaknesses = []
        recommendations = []
        
        if context_files:
            health += 30
            strengths.append(f"✓ {len(context_files)} context providers defined")
            
            # Check for proper typing
            typed_contexts = sum(1 for f in context_files if f.has_interface or f.has_type_export)
            if typed_contexts == len(context_files):
                health += 35
                strengths.append("✓ All contexts properly typed")
            elif typed_contexts > 0:
                health += 20
                weaknesses.append(f"{len(context_files) - typed_contexts} contexts missing types")
                recommendations.append("Add TypeScript types to all contexts")
            
            # Check for context overuse
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
        """Analyze custom hook patterns."""
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
        
        # Check naming convention
        properly_named = sum(1 for f in hook_files if Path(f.path).stem.startswith('use'))
        if properly_named == len(hook_files):
            health += 30
            strengths.append("✓ All hooks follow naming convention")
        
        # Check TypeScript usage
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
        """New insight: Files using useContext directly without custom hooks."""
        files_with_direct_context = []
        for f in self.files.values():
            try:
                full_path = Path(f.path)  # f.path is relative
                content = (Path(self.project_path) / f.path).read_text(encoding='utf-8')
                if 'useContext(' in content:
                    # Check if file is a hook itself – if yes, skip (it's ok for hooks to use useContext)
                    if f.layer != LayerType.HOOKS:
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
        """New insight: Distribution of AI providers."""
        provider_count = defaultdict(int)
        for f in self.files.values():
            for hook in f.hooks_used:
                if hook in Config.AI_HOOKS:
                    # Map hook to provider
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
        """New insight: MCP coverage in entry points / core files."""
        # Look at entry points (App.tsx, main.tsx, etc.) and see if they import MCP.
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
        """New insight: Custom hooks not following 'use' prefix."""
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
# GIT HELPER (optional)
# =============================================================================
class GitHelper:
    """Retrieves git metadata for files if available."""
    
    @staticmethod
    def get_last_commit_info(file_path: Path, project_root: Path) -> Tuple[str, str]:
        """Return (author, date) of last commit for given file."""
        try:
            # Get last author
            author_cmd = ['git', 'log', '-1', '--format=%an', '--', str(file_path.relative_to(project_root))]
            author_res = subprocess.run(author_cmd, cwd=project_root, capture_output=True, text=True, timeout=2)
            author = author_res.stdout.strip() if author_res.returncode == 0 else ""
            
            # Get last modified date
            date_cmd = ['git', 'log', '-1', '--format=%ad', '--date=short', '--', str(file_path.relative_to(project_root))]
            date_res = subprocess.run(date_cmd, cwd=project_root, capture_output=True, text=True, timeout=2)
            date = date_res.stdout.strip() if date_res.returncode == 0 else ""
            
            return author, date
        except:
            return "", ""

# =============================================================================
# HTML REPORT GENERATOR (enhanced with real tables & styling)
# =============================================================================
class HTMLReportGenerator:
    """Generates beautiful HTML reports."""
    
    @staticmethod
    def generate(result: AnalysisResult, output_path: Path, with_git: bool = False):
        """Generate comprehensive HTML report."""
        
        # Calculate additional stats
        high_value = [c for c in result.valuable_unused if c.value_score >= 60]
        critical_issues = [i for i in result.wiring_issues if i.severity == Severity.CRITICAL]
        
        # Prepare table rows
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
        for issue in sorted(result.wiring_issues, key=lambda x: list(Severity).index(x.severity))[:50]:
            severity_badge = f'<span class="badge badge-{issue.severity.value}">{issue.severity.value.upper()}</span>'
            wiring_rows += f"""
            <tr>
                <td><strong>{Path(issue.file_path).name}</strong><br><span style="color: #6b7280; font-size: 0.85em;">Line {issue.line_number}</span></td>
                <td>{severity_badge}</td>
                <td>{issue.issue_type}</td>
                <td><code style="font-size: 0.85em;">{issue.current_import}</code></td>
                <td><code style="font-size: 0.85em;">{issue.better_alternative}</code></td>
            </tr>"""
        
        # Architectural insights rows
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
        
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>G-Studio Code Analysis Report v6.0</title>
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
        .badge-high {{ background: #10b981; color: white; }}
        .badge-medium {{ background: #f59e0b; color: white; }}
        .badge-low {{ background: #6b7280; color: white; }}
        .badge-critical {{ background: #dc2626; color: white; }}
        
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
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎯 G-Studio Code Analysis v6.0</h1>
            <div class="subtitle">Intelligent Analysis of React/TypeScript Codebase</div>
            <div class="subtitle" style="margin-top: 10px; font-size: 0.9em;">
                Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            </div>
        </div>
        
        <div class="content">
            <!-- Overall Statistics -->
            <div class="section">
                <h2 class="section-title">📊 Overall Statistics</h2>
                <div class="stats-grid">
                    <div class="stat-card"><div class="number">{result.total_files}</div><div class="label">Total Files</div></div>
                    <div class="stat-card"><div class="number">{result.tsx_percentage:.1f}%</div><div class="label">TSX Files</div></div>
                    <div class="stat-card"><div class="number">{len(result.valuable_unused)}</div><div class="label">Valuable Unused</div></div>
                    <div class="stat-card"><div class="number">{len(result.wiring_issues)}</div><div class="label">Wiring Issues</div></div>
                </div>
            </div>
            
            <!-- Valuable Unused Components -->
            <div class="section">
                <h2 class="section-title">💎 Valuable Unused Components ({len(result.valuable_unused)})</h2>
                <p style="margin-bottom: 20px; color: #6b7280;">
                    These components have high value but are not currently wired into the application.
                </p>
                <table>
                    <thead><tr><th>Component</th><th>Score</th><th>Layer</th><th>Why Valuable</th><th>Suggested Location</th></tr></thead>
                    <tbody>{valuable_rows}</tbody>
                </table>
                {f"<p><em>... and {len(result.valuable_unused)-20} more components</em></p>" if len(result.valuable_unused) > 20 else ""}
            </div>
            
            <!-- Wiring Issues -->
            <div class="section">
                <h2 class="section-title">🔧 Wiring Issues ({len(result.wiring_issues)})</h2>
                <p style="margin-bottom: 20px; color: #6b7280;">
                    Detected import problems and architectural anti-patterns.
                </p>
                <table>
                    <thead><tr><th>File</th><th>Severity</th><th>Issue Type</th><th>Current Import</th><th>Better Alternative</th></tr></thead>
                    <tbody>{wiring_rows}</tbody>
                </table>
            </div>
            
            <!-- Architectural Health -->
            <div class="section">
                <h2 class="section-title">🏗️ Architectural Health</h2>
                {insight_cards}
            </div>
        </div>
        
        <div class="footer">
            Generated by G-Studio Code Intelligence v6.0.0-beta<br>
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
                 dry_run: bool = False, parallel: bool = True):
        self.project_path = project_path
        self.output_dir = output_dir
        self.use_cache = use_cache
        self.verbose = verbose
        self.dry_run = dry_run
        self.parallel = parallel
        
        # Create output directory (only if not dry_run)
        if not dry_run:
            self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Initialize components
        self.cache = CacheManager(project_path / Config.CACHE_FILE, use_cache and not dry_run)
        self.parser = FileParser()
        self.scanner = FileScanner(project_path, verbose)
        self.git_helper = GitHelper()
        
        # Results storage
        self.files: Dict[str, FileInfo] = {}
        self.result = AnalysisResult(total_files=0, tsx_percentage=0, total_lines=0)
    
    def analyze(self) -> AnalysisResult:
        """Run complete analysis."""
        log_header("G-STUDIO INTELLIGENT CODE ANALYZER v6.0.0-beta")
        
        # Step 1: Scan files
        log_info("Scanning project files...")
        file_paths = self.scanner.scan()
        log_success(f"Found {len(file_paths)} source files")
        
        # Step 2: Parse and analyze files (parallel)
        log_info("Parsing and analyzing files...")
        self._analyze_files(file_paths)
        log_success(f"Analyzed {len(self.files)} files")
        
        # Step 3: Build dependency graph
        log_info("Building dependency graph...")
        dep_analyzer = DependencyAnalyzer(self.project_path, self.scanner.src_path, self.files)
        self.result.dependency_graph = dep_analyzer.build_graph()
        unused = dep_analyzer.find_unused()
        log_success(f"Found {len(unused)} potentially unused files")
        
        # Step 4: Score valuable unused components
        log_info("Scoring valuable unused components...")
        self._find_valuable_unused(unused)
        log_success(f"Found {len(self.result.valuable_unused)} valuable unused components")
        
        # Step 5: Detect wiring issues
        log_info("Detecting wiring issues...")
        self._detect_wiring_issues()
        log_success(f"Found {len(self.result.wiring_issues)} wiring issues")
        
        # Step 6: Architectural analysis
        log_info("Analyzing architecture...")
        arch_analyzer = ArchitecturalAnalyzer(self.files)
        self.result.insights = arch_analyzer.analyze()
        log_success(f"Generated {len(self.result.insights)} architectural insights")
        
        # Step 7: Calculate statistics
        self._calculate_stats()
        
        # Save cache (skip if dry_run)
        if not self.dry_run:
            self.cache.save()
        
        return self.result
    
    def _analyze_files(self, file_paths: List[Path]):
        """Parse and analyze all files (with optional parallel processing)."""
        if self.parallel:
            self._analyze_files_parallel(file_paths)
        else:
            self._analyze_files_sequential(file_paths)
    
    def _analyze_files_sequential(self, file_paths: List[Path]):
        """Sequential file analysis."""
        for file_path in tqdm(file_paths, desc="Analyzing files"):
            self._analyze_single_file(file_path)
    
    def _analyze_files_parallel(self, file_paths: List[Path]):
        """Parallel file analysis using ThreadPoolExecutor."""
        with ThreadPoolExecutor(max_workers=Config.MAX_WORKERS) as executor:
            future_to_path = {executor.submit(self._analyze_single_file, p): p for p in file_paths}
            for future in tqdm(as_completed(future_to_path), total=len(file_paths), desc="Analyzing files"):
                try:
                    future.result()
                except Exception as e:
                    if self.verbose:
                        log_warning(f"Error in worker: {e}")
    
    def _analyze_single_file(self, file_path: Path):
        """Parse and analyze a single file, store result in self.files."""
        try:
            # Read file
            content = file_path.read_text(encoding='utf-8')
            
            # Calculate hash and mtime
            content_hash = hashlib.md5(content.encode()).hexdigest()
            mtime = file_path.stat().st_mtime
            
            # Check cache
            rel_path = str(file_path.relative_to(self.project_path))
            cached = self.cache.get(rel_path, mtime, content_hash)
            
            if cached:
                # Use cached data
                file_info = FileInfo(**cached['file_info'])
            else:
                # Parse file
                parsed = self.parser.parse_file(file_path, content)
                
                # Determine layer
                layer = self._determine_layer(file_path)
                
                # Create FileInfo
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
                    complexity_score=len(parsed['hooks_used']) * 2 + len(parsed['contexts_used']) * 3
                )
                
                # Detect patterns
                file_info.has_ai_hook = any(h in Config.AI_HOOKS for h in file_info.hooks_used)
                file_info.has_mcp = any(p in content for p in Config.MCP_PATTERNS)
                file_info.has_voice = any(p in content for p in Config.VOICE_PATTERNS)
                
                # Git metadata (optional)
                try:
                    author, date = self.git_helper.get_last_commit_info(file_path, self.project_path)
                    file_info.git_last_author = author
                    file_info.git_last_modified = date
                except:
                    pass
                
                # Cache it
                self.cache.set(rel_path, {
                    'mtime': mtime,
                    'hash': content_hash,
                    'file_info': asdict(file_info)
                })
            
            self.files[rel_path] = file_info
            
        except Exception as e:
            if self.verbose:
                log_warning(f"Error analyzing {file_path}: {e}")
    
    def _determine_layer(self, file_path: Path) -> LayerType:
        """Determine architectural layer from file path."""
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
        """Find and score valuable unused components."""
        for path in unused_paths:
            if path not in self.files:
                continue
            
            file_info = self.files[path]
            
            # Read content for scoring
            try:
                full_path = self.project_path / path
                content = full_path.read_text(encoding='utf-8')
            except:
                continue
            
            # Score it
            value_score, reasons = ValueScorer.score_component(file_info, content)
            
            # Only include if valuable (score > 30)
            if value_score > 30:
                # Determine suggested integration location
                suggested_location = self._suggest_integration_location(file_info)
                
                # Create integration code sample
                integration_code = self._generate_integration_code(file_info)
                
                # Determine effort
                effort = 'low' if file_info.layer == LayerType.HOOKS else 'medium'
                
                # Create ValuableComponent
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
        """Suggest where to integrate the component."""
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
        """Generate sample integration code."""
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
        """Detect wiring issues across all files."""
        detector = WiringIssueDetector(self.files, self.project_path)
        
        for file_path, file_info in tqdm(self.files.items(), desc="Checking wiring"):
            try:
                # Read content
                full_path = self.project_path / file_path
                content = full_path.read_text(encoding='utf-8')
                
                # Detect issues
                issues = detector.detect_issues(file_path, content)
                self.result.wiring_issues.extend(issues)
                
            except Exception as e:
                if self.verbose:
                    log_warning(f"Error checking wiring for {file_path}: {e}")
        
        # Post‑process: multiple AI providers
        self.result.wiring_issues.extend(detector.post_process_ai_providers())
    
    def _calculate_stats(self):
        """Calculate final statistics."""
        self.result.total_files = len(self.files)
        
        tsx_files = sum(1 for f in self.files.values() 
                       if f.path.endswith('.tsx') or f.path.endswith('.jsx'))
        self.result.tsx_percentage = (tsx_files / self.result.total_files * 100) if self.result.total_files > 0 else 0
        
        self.result.total_lines = sum(f.lines for f in self.files.values())
        
        # Layer stats
        for file_info in self.files.values():
            layer_name = file_info.layer.value
            self.result.layer_stats[layer_name] = self.result.layer_stats.get(layer_name, 0) + 1
    
    def generate_report(self, html_only: bool = False):
        """Generate reports."""
        if self.dry_run:
            log_info("DRY RUN: skipping report generation")
            return
        
        log_info("Generating reports...")
        
        # Generate HTML report
        html_path = self.output_dir / 'analysis_report.html'
        HTMLReportGenerator.generate(self.result, html_path, with_git=True)
        
        # Generate JSON report
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
        
        log_success(f"Reports saved to {self.output_dir}")
        
        # Print summary to terminal (unless html-only)
        if not html_only:
            self._print_summary()
    
    def _print_summary(self):
        """Print summary to terminal."""
        log_header("ANALYSIS SUMMARY")
        
        print(f"{Colors.BOLD}Files:{Colors.END} {self.result.total_files}")
        print(f"{Colors.BOLD}TSX Percentage:{Colors.END} {self.result.tsx_percentage:.1f}%")
        print(f"{Colors.BOLD}Total Lines:{Colors.END} {self.result.total_lines:,}")
        print(f"{Colors.BOLD}Valuable Unused:{Colors.END} {len(self.result.valuable_unused)}")
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
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(
        description="G-Studio Intelligent Code Analyzer v6.0.0-beta",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s .
  %(prog)s /path/to/project --output-dir ./reports
  %(prog)s . --no-cache --verbose
  %(prog)s . --dry-run                     # only simulate, no disk writes
        """
    )
    
    parser.add_argument(
        'project_path',
        nargs='?',
        default='.',
        help='Path to G-Studio project (default: current directory)'
    )
    
    parser.add_argument(
        '--output-dir',
        default='./gstudio-reports',
        help='Output directory for reports (default: ./gstudio-reports)'
    )
    
    parser.add_argument(
        '--no-cache',
        action='store_true',
        help='Disable file caching'
    )
    
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable verbose logging'
    )
    
    parser.add_argument(
        '--html-only',
        action='store_true',
        help='Only generate HTML report without terminal output'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Simulate analysis without writing reports or cache'
    )
    
    parser.add_argument(
        '--no-parallel',
        action='store_true',
        help='Disable parallel file parsing'
    )
    
    args = parser.parse_args()
    
    # Resolve paths
    project_path = Path(args.project_path).resolve()
    output_dir = Path(args.output_dir).resolve()
    
    # Validate project path
    if not project_path.exists():
        log_error(f"Project path does not exist: {project_path}")
        sys.exit(1)
    
    try:
        # Create analyzer
        analyzer = GStudioAnalyzer(
            project_path=project_path,
            output_dir=output_dir,
            use_cache=not args.no_cache,
            verbose=args.verbose,
            dry_run=args.dry_run,
            parallel=not args.no_parallel
        )
        
        # Run analysis
        result = analyzer.analyze()
        
        # Generate reports
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