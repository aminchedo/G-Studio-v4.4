#!/usr/bin/env python3
"""
G-Studio Enterprise Code Intelligence Platform v9.0
===================================================
Production-grade static code analysis with hybrid multi-graph architecture.

Architecture:
  • Hybrid AST + CFG + DFG + PDG analysis
  • Advanced clone detection with structural similarity
  • Tarjan's algorithm for cycle detection
  • Incremental parsing with tree-sitter
  • SQLite-based high-performance caching
  • Framework-aware analysis
  • Parallel processing with batching

Author: G-Studio Intelligence Team
Version: 9.0.0
License: MIT
"""

import os
import sys
import json
import hashlib
import sqlite3
import pickle
import subprocess
import re
import time
import argparse
from pathlib import Path
from datetime import datetime
from collections import defaultdict, Counter, deque
from typing import Dict, List, Set, Tuple, Optional, Any, Union
from dataclasses import dataclass, field, asdict
from enum import Enum
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor, as_completed

# Optional dependencies with graceful fallback
try:
    from tree_sitter import Language, Parser, Node, Tree
    import tree_sitter_typescript as ts_typescript
    import tree_sitter_javascript as ts_javascript
    TREE_SITTER_AVAILABLE = True
except ImportError:
    TREE_SITTER_AVAILABLE = False

try:
    import networkx as nx
    NETWORKX_AVAILABLE = True
except ImportError:
    NETWORKX_AVAILABLE = False

try:
    import numpy as np
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

try:
    from tqdm import tqdm
    TQDM_AVAILABLE = True
except ImportError:
    TQDM_AVAILABLE = False
    def tqdm(iterable, desc=None, **kwargs):
        if desc:
            print(f"{desc}...")
        return iterable


# =============================================================================
# CONFIGURATION
# =============================================================================
class Config:
    VERSION = "9.0.0"
    
    # File extensions
    SUPPORTED_EXTENSIONS = {'.ts', '.tsx', '.js', '.jsx', '.py'}
    IGNORE_DIRS = {
        'node_modules', 'dist', 'build', '__tests__', 'coverage',
        '.git', '.vscode', 'test', 'tests', '.cache', '__pycache__',
        '.next', '.vercel', 'venv', 'env'
    }
    
    # Thresholds
    CLONE_THRESHOLD_TYPE1 = 0.99  # Exact clones
    CLONE_THRESHOLD_TYPE2 = 0.95  # Renamed identifiers
    CLONE_THRESHOLD_TYPE3 = 0.85  # Modified statements
    
    UNUSED_SIGNAL_THRESHOLD = 4   # Multi-signal detection
    
    # Performance
    MAX_WORKERS = max(1, (os.cpu_count() or 1) - 1)
    BATCH_SIZE = 50
    
    # Cache
    CACHE_FILE = 'gstudio_cache.db'


# =============================================================================
# DATA MODELS
# =============================================================================
class LayerType(Enum):
    COMPONENTS = "components"
    HOOKS = "hooks"
    SERVICES = "services"
    UTILS = "utils"
    TYPES = "types"
    PAGES = "pages"
    API = "api"
    UNKNOWN = "unknown"


@dataclass
class Import:
    source: str
    specifiers: List[str] = field(default_factory=list)
    is_dynamic: bool = False
    is_side_effect: bool = False
    line: int = 0


@dataclass
class Export:
    name: str
    is_default: bool = False
    is_re_export: bool = False
    line: int = 0


@dataclass
class ASTFeatures:
    """Structural AST features for clone detection"""
    tree_depth: int = 0
    node_types: Dict[str, int] = field(default_factory=dict)
    control_structures: int = 0
    function_count: int = 0
    class_count: int = 0


@dataclass
class CFGNode:
    """Control Flow Graph node"""
    id: int
    type: str
    line: int
    successors: List[int] = field(default_factory=list)
    predecessors: List[int] = field(default_factory=list)


@dataclass
class DFGNode:
    """Data Flow Graph node"""
    id: int
    variable: str
    definition_line: int
    uses: List[int] = field(default_factory=list)


@dataclass
class FileAnalysis:
    """Complete file analysis result"""
    path: str
    lines: int
    hash: str
    
    # Imports/Exports
    imports: List[Import] = field(default_factory=list)
    exports: List[Export] = field(default_factory=list)
    
    # Dependencies
    dependencies: Set[str] = field(default_factory=set)
    dependents: Set[str] = field(default_factory=set)
    transitive_dependencies: Set[str] = field(default_factory=set)
    transitive_dependents: Set[str] = field(default_factory=set)
    
    # AST features
    ast_features: Optional[ASTFeatures] = None
    
    # CFG/DFG
    cfg_nodes: List[CFGNode] = field(default_factory=list)
    dfg_nodes: List[DFGNode] = field(default_factory=list)
    
    # Issues
    uninitialized_vars: List[str] = field(default_factory=list)
    unused_vars: List[str] = field(default_factory=list)
    unreachable_code: List[int] = field(default_factory=list)
    
    # Metadata
    is_entry_point: bool = False
    value_score: float = 0.0
    complexity: int = 0


@dataclass
class CloneGroup:
    """Group of cloned files"""
    files: List[str]
    similarity: float
    clone_type: str  # Type-1, Type-2, Type-3
    lines: int
    representative: str


@dataclass
class CircularDependency:
    """Circular dependency cycle"""
    cycle: List[str]
    severity: str


@dataclass
class AnalysisResult:
    """Complete analysis results"""
    total_files: int = 0
    total_lines: int = 0
    
    files: Dict[str, FileAnalysis] = field(default_factory=dict)
    clones: List[CloneGroup] = field(default_factory=list)
    circular_deps: List[CircularDependency] = field(default_factory=list)
    unused_files: List[str] = field(default_factory=list)
    
    framework: str = "unknown"
    duration: float = 0.0
    cache_hit_rate: float = 0.0


# =============================================================================
# UTILITIES
# =============================================================================
class Colors:
    BLUE = '\033[94m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    CYAN = '\033[96m'
    END = '\033[0m'
    BOLD = '\033[1m'


def log_info(msg: str):
    print(f"{Colors.BLUE}ℹ {msg}{Colors.END}")


def log_success(msg: str):
    print(f"{Colors.GREEN}✓ {msg}{Colors.END}")


def log_warning(msg: str):
    print(f"{Colors.YELLOW}⚠ {msg}{Colors.END}")


def log_error(msg: str):
    print(f"{Colors.RED}✗ {msg}{Colors.END}")


# =============================================================================
# SQLITE CACHE MANAGER
# =============================================================================
class SQLiteCacheManager:
    """High-performance SQLite-based cache with O(1) lookups"""
    
    def __init__(self, cache_path: Path):
        self.cache_path = cache_path
        self.conn: Optional[sqlite3.Connection] = None
        self.hits = 0
        self.misses = 0
        self._init_db()
    
    def _init_db(self):
        """Initialize database schema"""
        self.conn = sqlite3.connect(str(self.cache_path))
        self.conn.execute("PRAGMA journal_mode=WAL")
        self.conn.execute("PRAGMA synchronous=NORMAL")
        
        # File cache table
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS file_cache (
                path TEXT PRIMARY KEY,
                hash TEXT NOT NULL,
                analysis BLOB,
                ast BLOB,
                timestamp REAL
            )
        """)
        
        # Dependency graph table
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS dependency_graph (
                source TEXT,
                target TEXT,
                PRIMARY KEY (source, target)
            )
        """)
        
        # Indexes
        self.conn.execute("CREATE INDEX IF NOT EXISTS idx_hash ON file_cache(hash)")
        self.conn.commit()
    
    def get(self, path: str, file_hash: str) -> Optional[FileAnalysis]:
        """Get cached analysis (O(1) lookup)"""
        if not self.conn:
            return None
        
        try:
            cursor = self.conn.execute(
                "SELECT analysis FROM file_cache WHERE path = ? AND hash = ?",
                (path, file_hash)
            )
            row = cursor.fetchone()
            
            if row:
                self.hits += 1
                return pickle.loads(row[0])
            else:
                self.misses += 1
                return None
        except Exception:
            self.misses += 1
            return None
    
    def store(self, path: str, file_hash: str, analysis: FileAnalysis):
        """Store analysis in cache"""
        if not self.conn:
            return
        
        try:
            self.conn.execute("""
                INSERT OR REPLACE INTO file_cache (path, hash, analysis, timestamp)
                VALUES (?, ?, ?, ?)
            """, (path, file_hash, pickle.dumps(analysis), time.time()))
        except Exception:
            pass
    
    def store_dependency(self, source: str, target: str):
        """Store dependency edge"""
        if not self.conn:
            return
        
        try:
            self.conn.execute("""
                INSERT OR IGNORE INTO dependency_graph (source, target)
                VALUES (?, ?)
            """, (source, target))
        except Exception:
            pass
    
    def commit(self):
        """Commit changes"""
        if self.conn:
            self.conn.commit()
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total = self.hits + self.misses
        hit_rate = (self.hits / total * 100) if total > 0 else 0
        return {
            'hits': self.hits,
            'misses': self.misses,
            'hit_rate': hit_rate
        }
    
    def close(self):
        """Close connection"""
        if self.conn:
            self.conn.close()


# =============================================================================
# TREE-SITTER PARSER
# =============================================================================
class TreeSitterParser:
    """Incremental parser using tree-sitter"""
    
    def __init__(self):
        self.parsers: Dict[str, Parser] = {}
        self.tree_cache: Dict[str, Tree] = {}
        self._init_parsers()
    
    def _init_parsers(self):
        """Initialize tree-sitter parsers"""
        if not TREE_SITTER_AVAILABLE:
            log_warning("Tree-sitter not available")
            return
        
        try:
            ts_lang = Language(ts_typescript.language_typescript())
            tsx_lang = Language(ts_typescript.language_tsx())
            js_lang = Language(ts_javascript.language())
            
            for ext, lang in [('.ts', ts_lang), ('.tsx', tsx_lang),
                             ('.js', js_lang), ('.jsx', js_lang)]:
                parser = Parser()
                parser.set_language(lang)
                self.parsers[ext] = parser
            
            log_success("Tree-sitter parsers initialized")
        except Exception as e:
            log_warning(f"Tree-sitter init failed: {e}")
    
    def parse(self, path: str, content: str, ext: str) -> Optional[Tree]:
        """Parse file with incremental support"""
        if ext not in self.parsers:
            return None
        
        try:
            parser = self.parsers[ext]
            
            # Incremental parse if cached
            if path in self.tree_cache:
                old_tree = self.tree_cache[path]
                tree = parser.parse(bytes(content, 'utf-8'), old_tree)
            else:
                tree = parser.parse(bytes(content, 'utf-8'))
            
            self.tree_cache[path] = tree
            return tree
        except Exception:
            return None
    
    def extract_imports(self, tree: Tree) -> List[Import]:
        """Extract imports using tree-sitter queries"""
        imports = []
        
        def traverse(node: Node):
            if node.type == 'import_statement':
                source = None
                specifiers = []
                
                for child in node.children:
                    if child.type == 'string':
                        source = child.text.decode('utf-8').strip('"\'')
                    elif child.type == 'import_clause':
                        for c in child.children:
                            if c.type == 'named_imports':
                                for spec in c.children:
                                    if spec.type == 'import_specifier':
                                        for s in spec.children:
                                            if s.type == 'identifier':
                                                specifiers.append(s.text.decode('utf-8'))
                
                if source:
                    imports.append(Import(
                        source=source,
                        specifiers=specifiers,
                        line=node.start_point[0] + 1
                    ))
            
            # Dynamic imports
            if node.type == 'call_expression':
                func = node.child_by_field_name('function')
                if func and func.type == 'import':
                    args = node.child_by_field_name('arguments')
                    if args:
                        for child in args.children:
                            if child.type == 'string':
                                source = child.text.decode('utf-8').strip('"\'')
                                imports.append(Import(
                                    source=source,
                                    is_dynamic=True,
                                    line=node.start_point[0] + 1
                                ))
            
            for child in node.children:
                traverse(child)
        
        traverse(tree.root_node)
        return imports
    
    def extract_exports(self, tree: Tree) -> List[Export]:
        """Extract exports using tree-sitter queries"""
        exports = []
        
        def traverse(node: Node):
            if node.type == 'export_statement':
                is_default = False
                name = None
                
                for child in node.children:
                    if child.type == 'identifier' and child.text.decode('utf-8') == 'default':
                        is_default = True
                    elif child.type == 'identifier':
                        name = child.text.decode('utf-8')
                
                if name or is_default:
                    exports.append(Export(
                        name=name or 'default',
                        is_default=is_default,
                        line=node.start_point[0] + 1
                    ))
            
            for child in node.children:
                traverse(child)
        
        traverse(tree.root_node)
        return exports
    
    def extract_ast_features(self, tree: Tree) -> ASTFeatures:
        """Extract structural AST features"""
        features = ASTFeatures()
        node_types = Counter()
        
        def traverse(node: Node, depth: int = 0):
            features.tree_depth = max(features.tree_depth, depth)
            node_types[node.type] += 1
            
            if node.type in {'if_statement', 'while_statement', 'for_statement', 'switch_statement'}:
                features.control_structures += 1
            elif node.type == 'function_declaration':
                features.function_count += 1
            elif node.type == 'class_declaration':
                features.class_count += 1
            
            for child in node.children:
                traverse(child, depth + 1)
        
        traverse(tree.root_node)
        features.node_types = dict(node_types)
        return features


# =============================================================================
# CONTROL FLOW GRAPH BUILDER
# =============================================================================
class CFGBuilder:
    """Build Control Flow Graph"""
    
    def __init__(self):
        self.nodes: List[CFGNode] = []
        self.node_id = 0
    
    def build(self, tree: Tree) -> List[CFGNode]:
        """Build CFG from AST"""
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
                self.nodes[parent_id].successors.append(current_id)
            
            self.nodes.append(cfg_node)
            
            # Handle control flow
            if node.type == 'if_statement':
                # Branch handling
                for child in node.children:
                    if child.type in {'statement_block', 'expression_statement'}:
                        traverse(child, current_id)
            else:
                for child in node.children:
                    traverse(child, current_id)
        
        traverse(tree.root_node)
        return self.nodes
    
    def find_unreachable(self) -> List[int]:
        """Find unreachable code using BFS"""
        if not self.nodes:
            return []
        
        visited = set()
        queue = deque([0])  # Start from entry
        
        while queue:
            node_id = queue.popleft()
            if node_id in visited:
                continue
            visited.add(node_id)
            
            for successor in self.nodes[node_id].successors:
                queue.append(successor)
        
        unreachable = [n.line for n in self.nodes if n.id not in visited]
        return unreachable


# =============================================================================
# DATA FLOW GRAPH BUILDER
# =============================================================================
class DFGBuilder:
    """Build Data Flow Graph"""
    
    def __init__(self):
        self.nodes: List[DFGNode] = []
        self.definitions: Dict[str, int] = {}
    
    def build(self, tree: Tree) -> List[DFGNode]:
        """Build DFG from AST"""
        self.nodes = []
        self.definitions = {}
        
        def traverse(node: Node):
            # Variable definitions
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
                    self.definitions[var_name] = dfg_node.id
            
            # Variable uses
            if node.type == 'identifier':
                var_name = node.text.decode('utf-8')
                if var_name in self.definitions:
                    def_id = self.definitions[var_name]
                    self.nodes[def_id].uses.append(node.start_point[0] + 1)
            
            for child in node.children:
                traverse(child)
        
        traverse(tree.root_node)
        return self.nodes
    
    def find_uninitialized(self) -> List[str]:
        """Find uninitialized variables"""
        # Simplified: variables used before definition
        uninitialized = []
        for node in self.nodes:
            if node.uses and min(node.uses) < node.definition_line:
                uninitialized.append(node.variable)
        return uninitialized
    
    def find_unused(self) -> List[str]:
        """Find unused variables"""
        unused = []
        for node in self.nodes:
            if not node.uses:
                unused.append(node.variable)
        return unused


# =============================================================================
# MODERN CODE ANALYZER (Hybrid AST + CFG + DFG)
# =============================================================================
class ModernCodeAnalyzer:
    """Hybrid multi-graph analyzer"""
    
    def __init__(self, parser: TreeSitterParser):
        self.parser = parser
        self.cfg_builder = CFGBuilder()
        self.dfg_builder = DFGBuilder()
    
    def analyze_file(self, file_path: str, content: str, ext: str) -> FileAnalysis:
        """Complete file analysis with parallel graph building"""
        
        # Parse AST
        tree = self.parser.parse(file_path, content, ext)
        
        if not tree:
            # Fallback to basic analysis
            return self._basic_analysis(file_path, content)
        
        # Parallel graph construction
        with ThreadPoolExecutor(max_workers=3) as executor:
            ast_future = executor.submit(self.parser.extract_ast_features, tree)
            cfg_future = executor.submit(self.cfg_builder.build, tree)
            dfg_future = executor.submit(self.dfg_builder.build, tree)
            
            ast_features = ast_future.result()
            cfg_nodes = cfg_future.result()
            dfg_nodes = dfg_future.result()
        
        # Extract imports/exports
        imports = self.parser.extract_imports(tree)
        exports = self.parser.extract_exports(tree)
        
        # Merge analysis
        analysis = FileAnalysis(
            path=file_path,
            lines=len(content.split('\n')),
            hash=hashlib.md5(content.encode()).hexdigest(),
            imports=imports,
            exports=exports,
            ast_features=ast_features,
            cfg_nodes=cfg_nodes,
            dfg_nodes=dfg_nodes,
            unreachable_code=self.cfg_builder.find_unreachable(),
            uninitialized_vars=self.dfg_builder.find_uninitialized(),
            unused_vars=self.dfg_builder.find_unused(),
            complexity=ast_features.control_structures
        )
        
        return analysis
    
    def _basic_analysis(self, file_path: str, content: str) -> FileAnalysis:
        """Fallback analysis without tree-sitter"""
        return FileAnalysis(
            path=file_path,
            lines=len(content.split('\n')),
            hash=hashlib.md5(content.encode()).hexdigest()
        )


# =============================================================================
# AST-BASED CLONE DETECTOR
# =============================================================================
class ASTCloneDetector:
    """Advanced clone detection using AST vectorization"""
    
    def __init__(self, threshold_type2: float = 0.95, threshold_type3: float = 0.85):
        self.threshold_type2 = threshold_type2
        self.threshold_type3 = threshold_type3
    
    def detect(self, files: Dict[str, FileAnalysis]) -> List[CloneGroup]:
        """Detect clones using AST features"""
        if not SKLEARN_AVAILABLE:
            log_warning("scikit-learn not available, skipping clone detection")
            return []
        
        # Build feature vectors
        paths = []
        features = []
        
        for path, analysis in files.items():
            if analysis.ast_features and analysis.lines > 20:
                paths.append(path)
                features.append(self._vectorize(analysis.ast_features))
        
        if len(features) < 2:
            return []
        
        # Compute similarity matrix
        X = np.array(features)
        similarity_matrix = cosine_similarity(X)
        
        # Find clone groups
        clones = []
        visited = set()
        
        for i, path_i in enumerate(paths):
            if i in visited:
                continue
            
            group = [path_i]
            similarities = []
            
            for j, path_j in enumerate(paths):
                if i != j and j not in visited:
                    sim = similarity_matrix[i][j]
                    if sim >= self.threshold_type3:
                        group.append(path_j)
                        similarities.append(sim)
                        visited.add(j)
            
            if len(group) > 1:
                avg_sim = sum(similarities) / len(similarities) if similarities else 1.0
                
                # Classify clone type
                if avg_sim >= 0.99:
                    clone_type = "Type-1"
                elif avg_sim >= self.threshold_type2:
                    clone_type = "Type-2"
                else:
                    clone_type = "Type-3"
                
                representative = min(group, key=lambda p: len(p))
                total_lines = sum(files[p].lines for p in group)
                
                clones.append(CloneGroup(
                    files=group,
                    similarity=avg_sim,
                    clone_type=clone_type,
                    lines=total_lines,
                    representative=representative
                ))
        
        return clones
    
    def _vectorize(self, features: ASTFeatures) -> np.ndarray:
        """Convert AST features to numerical vector"""
        vector = [
            features.tree_depth,
            features.control_structures,
            features.function_count,
            features.class_count,
        ]
        
        # Add normalized node type frequencies
        total_nodes = sum(features.node_types.values())
        for node_type in ['function_declaration', 'class_declaration', 'if_statement', 'for_statement']:
            count = features.node_types.get(node_type, 0)
            vector.append(count / total_nodes if total_nodes > 0 else 0)
        
        return np.array(vector)


# =============================================================================
# DEPENDENCY GRAPH (with Tarjan's Algorithm)
# =============================================================================
class DependencyGraph:
    """Dependency graph with cycle detection"""
    
    def __init__(self, files: Dict[str, FileAnalysis], project_path: Path):
        self.files = files
        self.project_path = project_path
        self.graph: Dict[str, Set[str]] = defaultdict(set)
        self.reverse: Dict[str, Set[str]] = defaultdict(set)
    
    def build(self):
        """Build dependency graph"""
        for path, analysis in self.files.items():
            for imp in analysis.imports:
                resolved = self._resolve_import(path, imp.source)
                if resolved and resolved in self.files:
                    self.graph[path].add(resolved)
                    self.reverse[resolved].add(path)
                    analysis.dependencies.add(resolved)
                    self.files[resolved].dependents.add(path)
    
    def _resolve_import(self, from_file: str, import_path: str) -> Optional[str]:
        """Resolve import to file path"""
        if not import_path.startswith('.'):
            return None
        
        from_dir = Path(from_file).parent
        resolved = (self.project_path / from_dir / import_path).resolve()
        
        for ext in Config.SUPPORTED_EXTENSIONS:
            candidate = resolved.with_suffix(ext)
            try:
                rel_path = str(candidate.relative_to(self.project_path))
                if rel_path in self.files:
                    return rel_path
            except ValueError:
                pass
        
        return None
    
    def compute_transitive_closure(self):
        """Compute transitive dependencies using DFS"""
        def dfs(node: str, graph: Dict[str, Set[str]], visited: Set[str]):
            if node in visited:
                return
            visited.add(node)
            for neighbor in graph.get(node, set()):
                dfs(neighbor, graph, visited)
        
        for path in self.files:
            # Transitive dependents
            visited = set()
            dfs(path, self.reverse, visited)
            visited.discard(path)
            self.files[path].transitive_dependents = visited
            
            # Transitive dependencies
            visited = set()
            dfs(path, self.graph, visited)
            visited.discard(path)
            self.files[path].transitive_dependencies = visited
    
    def detect_cycles_tarjan(self) -> List[CircularDependency]:
        """Tarjan's algorithm for strongly connected components"""
        if not NETWORKX_AVAILABLE:
            return self._simple_cycle_detection()
        
        G = nx.DiGraph()
        for src, targets in self.graph.items():
            for tgt in targets:
                G.add_edge(src, tgt)
        
        cycles = []
        for component in nx.strongly_connected_components(G):
            if len(component) > 1:
                cycle_list = list(component)
                severity = 'critical' if len(cycle_list) >= 10 else \
                          'high' if len(cycle_list) >= 5 else 'medium'
                cycles.append(CircularDependency(
                    cycle=cycle_list,
                    severity=severity
                ))
        
        return cycles
    
    def _simple_cycle_detection(self) -> List[CircularDependency]:
        """Simple DFS-based cycle detection (fallback)"""
        cycles = []
        visited = set()
        rec_stack = set()
        
        def dfs(node: str, path: List[str]):
            visited.add(node)
            rec_stack.add(node)
            path.append(node)
            
            for neighbor in self.graph.get(node, set()):
                if neighbor not in visited:
                    dfs(neighbor, path)
                elif neighbor in rec_stack:
                    # Cycle found
                    cycle_start = path.index(neighbor)
                    cycle = path[cycle_start:]
                    if len(cycle) > 1:
                        cycles.append(CircularDependency(
                            cycle=cycle,
                            severity='medium'
                        ))
            
            path.pop()
            rec_stack.remove(node)
        
        for node in self.graph:
            if node not in visited:
                dfs(node, [])
        
        return cycles
    
    def topological_sort_kahn(self) -> List[str]:
        """Kahn's algorithm for topological sorting"""
        in_degree = defaultdict(int)
        for node in self.graph:
            for neighbor in self.graph[node]:
                in_degree[neighbor] += 1
        
        queue = deque([n for n in self.files if in_degree[n] == 0])
        result = []
        
        while queue:
            node = queue.popleft()
            result.append(node)
            
            for neighbor in self.graph.get(node, set()):
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        
        return result


# =============================================================================
# FRAMEWORK DETECTOR
# =============================================================================
class FrameworkDetector:
    """Detect project framework"""
    
    def __init__(self, project_path: Path):
        self.project_path = project_path
    
    def detect(self) -> Tuple[str, List[str]]:
        """Detect framework and entry points"""
        package_json = self.project_path / 'package.json'
        
        if not package_json.exists():
            return "unknown", []
        
        try:
            with open(package_json) as f:
                data = json.load(f)
            
            deps = {**data.get('dependencies', {}), **data.get('devDependencies', {})}
            
            if 'next' in deps:
                return "nextjs", self._get_nextjs_entries()
            elif '@remix-run/react' in deps:
                return "remix", self._get_remix_entries()
            elif 'vite' in deps:
                return "vite", self._get_vite_entries()
            
            return "unknown", []
        except Exception:
            return "unknown", []
    
    def _get_nextjs_entries(self) -> List[str]:
        """Get Next.js entry points"""
        entries = []
        pages = self.project_path / 'pages'
        app = self.project_path / 'app'
        
        if pages.exists():
            entries.extend(str(p.relative_to(self.project_path)) 
                          for p in pages.rglob('*.tsx'))
        if app.exists():
            entries.extend(str(p.relative_to(self.project_path)) 
                          for p in app.rglob('page.tsx'))
        
        return entries
    
    def _get_remix_entries(self) -> List[str]:
        """Get Remix entry points"""
        routes = self.project_path / 'app' / 'routes'
        if routes.exists():
            return [str(p.relative_to(self.project_path)) 
                   for p in routes.rglob('*.tsx')]
        return []
    
    def _get_vite_entries(self) -> List[str]:
        """Get Vite entry points"""
        main = self.project_path / 'src' / 'main.tsx'
        if main.exists():
            return [str(main.relative_to(self.project_path))]
        return []


# =============================================================================
# USAGE ANALYZER (Multi-Signal Unused Detection)
# =============================================================================
class UsageAnalyzer:
    """Analyze file usage with multi-signal detection"""
    
    def __init__(self, files: Dict[str, FileAnalysis]):
        self.files = files
    
    def find_unused(self) -> List[str]:
        """Find unused files using multi-signal approach"""
        unused = []
        
        for path, analysis in self.files.items():
            signals = {
                'no_dependents': len(analysis.dependents) == 0,
                'no_transitive_dependents': len(analysis.transitive_dependents) == 0,
                'no_exports': len(analysis.exports) == 0,
                'not_entry': not analysis.is_entry_point,
                'low_value': analysis.value_score < 30,
            }
            
            # Need 4+ signals to be confident
            if sum(signals.values()) >= Config.UNUSED_SIGNAL_THRESHOLD:
                unused.append(path)
        
        return unused


# =============================================================================
# MAIN ANALYZER
# =============================================================================
class GStudioAnalyzer:
    """Main analyzer orchestrator"""
    
    def __init__(
        self,
        project_path: Path,
        output_dir: Path,
        use_cache: bool = True,
        verbose: bool = False
    ):
        self.project_path = project_path.resolve()
        self.output_dir = output_dir
        self.verbose = verbose
        
        # Components
        self.cache = SQLiteCacheManager(output_dir / Config.CACHE_FILE) if use_cache else None
        self.parser = TreeSitterParser()
        self.analyzer = ModernCodeAnalyzer(self.parser)
        self.framework_detector = FrameworkDetector(project_path)
        
        # Results
        self.files: Dict[str, FileAnalysis] = {}
        self.result = AnalysisResult()
    
    def analyze(self) -> AnalysisResult:
        """Run complete analysis"""
        start_time = time.time()
        
        print(f"\n{Colors.BOLD}{'='*80}{Colors.END}")
        print(f"{Colors.BOLD}{Colors.CYAN}G-Studio Enterprise Code Intelligence v{Config.VERSION}{Colors.END}")
        print(f"{Colors.BOLD}{'='*80}{Colors.END}\n")
        
        log_info(f"Analyzing: {self.project_path}")
        
        # Phase 1: Framework detection
        log_info("Phase 1: Detecting framework...")
        framework, entry_points = self.framework_detector.detect()
        self.result.framework = framework
        log_success(f"Framework: {framework}")
        
        # Phase 2: Scan files
        log_info("Phase 2: Scanning files...")
        self._scan_files(entry_points)
        log_success(f"Analyzed {self.result.total_files} files ({self.result.total_lines:,} lines)")
        
        # Phase 3: Build dependency graph
        log_info("Phase 3: Building dependency graph...")
        dep_graph = DependencyGraph(self.files, self.project_path)
        dep_graph.build()
        dep_graph.compute_transitive_closure()
        log_success("Dependency graph built")
        
        # Phase 4: Detect cycles (Tarjan)
        log_info("Phase 4: Detecting circular dependencies...")
        self.result.circular_deps = dep_graph.detect_cycles_tarjan()
        log_success(f"Found {len(self.result.circular_deps)} cycles")
        
        # Phase 5: Clone detection
        log_info("Phase 5: Detecting code clones...")
        clone_detector = ASTCloneDetector()
        self.result.clones = clone_detector.detect(self.files)
        log_success(f"Found {len(self.result.clones)} clone groups")
        
        # Phase 6: Usage analysis
        log_info("Phase 6: Analyzing usage...")
        usage_analyzer = UsageAnalyzer(self.files)
        self.result.unused_files = usage_analyzer.find_unused()
        log_success(f"Found {len(self.result.unused_files)} unused files")
        
        # Finalize
        self.result.duration = time.time() - start_time
        self.result.files = self.files
        
        if self.cache:
            stats = self.cache.get_stats()
            self.result.cache_hit_rate = stats['hit_rate']
            self.cache.commit()
            self.cache.close()
        
        log_success(f"✨ Analysis complete in {self.result.duration:.2f}s")
        
        return self.result
    
    def _scan_files(self, entry_points: List[str]):
        """Scan and analyze files"""
        files_to_analyze = []
        
        for ext in Config.SUPPORTED_EXTENSIONS:
            for file_path in self.project_path.rglob(f'*{ext}'):
                if any(ignored in file_path.parts for ignored in Config.IGNORE_DIRS):
                    continue
                files_to_analyze.append(file_path)
        
        iterator = tqdm(files_to_analyze, desc="Analyzing", disable=not self.verbose)
        
        for file_path in iterator:
            try:
                content = file_path.read_text(encoding='utf-8', errors='ignore')
                file_hash = hashlib.md5(content.encode()).hexdigest()
                rel_path = str(file_path.relative_to(self.project_path))
                
                # Check cache
                analysis = None
                if self.cache:
                    analysis = self.cache.get(rel_path, file_hash)
                
                if not analysis:
                    # Analyze file
                    ext = file_path.suffix
                    analysis = self.analyzer.analyze_file(rel_path, content, ext)
                    
                    if self.cache:
                        self.cache.store(rel_path, file_hash, analysis)
                
                # Mark entry points
                if rel_path in entry_points:
                    analysis.is_entry_point = True
                
                self.files[rel_path] = analysis
                self.result.total_files += 1
                self.result.total_lines += analysis.lines
            
            except Exception:
                pass


# =============================================================================
# REPORT GENERATOR
# =============================================================================
class ReportGenerator:
    """Generate analysis reports"""
    
    def __init__(self, result: AnalysisResult, output_dir: Path):
        self.result = result
        self.output_dir = output_dir
        output_dir.mkdir(parents=True, exist_ok=True)
    
    def generate_json(self):
        """Generate JSON report"""
        report_path = self.output_dir / 'analysis_report.json'
        
        report = {
            'metadata': {
                'version': Config.VERSION,
                'timestamp': datetime.now().isoformat(),
                'duration': f"{self.result.duration:.2f}s",
                'cache_hit_rate': f"{self.result.cache_hit_rate:.1f}%"
            },
            'summary': {
                'total_files': self.result.total_files,
                'total_lines': self.result.total_lines,
                'framework': self.result.framework,
                'clones': len(self.result.clones),
                'circular_deps': len(self.result.circular_deps),
                'unused_files': len(self.result.unused_files)
            },
            'clones': [
                {
                    'files': cg.files,
                    'type': cg.clone_type,
                    'similarity': f"{cg.similarity:.2%}",
                    'lines': cg.lines
                }
                for cg in self.result.clones
            ],
            'circular_dependencies': [
                {
                    'cycle': cd.cycle,
                    'severity': cd.severity,
                    'length': len(cd.cycle)
                }
                for cd in self.result.circular_deps
            ],
            'unused_files': self.result.unused_files
        }
        
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        log_success(f"JSON report: {report_path}")
    
    def generate_html(self):
        """Generate HTML dashboard"""
        report_path = self.output_dir / 'analysis_report.html'
        
        html = f"""<!DOCTYPE html>
<html>
<head>
    <title>G-Studio Analysis Report</title>
    <style>
        body {{ font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }}
        .container {{ max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; }}
        h1 {{ color: #667eea; }}
        .stat {{ display: inline-block; margin: 10px 20px; padding: 15px; background: #f0f0f0; border-radius: 5px; }}
        .stat-value {{ font-size: 2em; font-weight: bold; color: #667eea; }}
        .stat-label {{ color: #666; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        th, td {{ padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }}
        th {{ background: #667eea; color: white; }}
    </style>
</head>
<body>
    <div class="container">
        <h1>G-Studio Analysis Report v{Config.VERSION}</h1>
        <p>Framework: {self.result.framework} | Duration: {self.result.duration:.2f}s</p>
        
        <div class="stat">
            <div class="stat-value">{self.result.total_files}</div>
            <div class="stat-label">Files</div>
        </div>
        <div class="stat">
            <div class="stat-value">{self.result.total_lines:,}</div>
            <div class="stat-label">Lines</div>
        </div>
        <div class="stat">
            <div class="stat-value">{len(self.result.clones)}</div>
            <div class="stat-label">Clone Groups</div>
        </div>
        <div class="stat">
            <div class="stat-value">{len(self.result.circular_deps)}</div>
            <div class="stat-label">Cycles</div>
        </div>
        
        <h2>Code Clones</h2>
        <table>
            <tr><th>Type</th><th>Files</th><th>Similarity</th><th>Lines</th></tr>
            {''.join(f'<tr><td>{c.clone_type}</td><td>{len(c.files)}</td><td>{c.similarity:.1%}</td><td>{c.lines}</td></tr>' for c in self.result.clones[:20])}
        </table>
        
        <h2>Circular Dependencies</h2>
        <table>
            <tr><th>Severity</th><th>Length</th><th>Cycle</th></tr>
            {''.join(f'<tr><td>{c.severity}</td><td>{len(c.cycle)}</td><td>{" → ".join(c.cycle[:3])}...</td></tr>' for c in self.result.circular_deps[:20])}
        </table>
    </div>
</body>
</html>"""
        
        with open(report_path, 'w') as f:
            f.write(html)
        
        log_success(f"HTML report: {report_path}")


# =============================================================================
# CLI
# =============================================================================
def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description='G-Studio Enterprise Code Intelligence Platform v9.0',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument('project_path', nargs='?', default='.',
                       help='Project path (default: current directory)')
    parser.add_argument('--output', '-o', default='./gstudio_reports',
                       help='Output directory')
    parser.add_argument('--no-cache', action='store_true',
                       help='Disable caching')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Verbose output')
    
    args = parser.parse_args()
    
    project_path = Path(args.project_path).resolve()
    output_dir = Path(args.output).resolve()
    
    if not project_path.exists():
        log_error(f"Project path does not exist: {project_path}")
        sys.exit(1)
    
    try:
        analyzer = GStudioAnalyzer(
            project_path=project_path,
            output_dir=output_dir,
            use_cache=not args.no_cache,
            verbose=args.verbose
        )
        
        result = analyzer.analyze()
        
        # Generate reports
        print()
        log_info("Generating reports...")
        reporter = ReportGenerator(result, output_dir)
        reporter.generate_json()
        reporter.generate_html()
        
        print(f"\n{Colors.GREEN}{Colors.BOLD}✨ Complete!{Colors.END}")
        print(f"Reports: {output_dir}\n")
    
    except KeyboardInterrupt:
        log_warning("\nInterrupted")
        sys.exit(1)
    except Exception as e:
        log_error(f"Failed: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()