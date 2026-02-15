#!/usr/bin/env python3
"""
PROJECT_STRUCTURAL_ANALYSIS_DASHBOARD.py

Enterprise-grade code intelligence platform for TypeScript/React/Electron projects.
Performs deep structural and semantic analysis with conservative, actionable recommendations.
Outputs a self-contained, interactive HTML dashboard.

Senior Principal Engineer Perspective:
- Conservative recommendations over aggressive cleanup
- Structural understanding over simple pattern matching
- Enterprise-grade risk assessment
- Minimal impact strategy
"""

import os
import sys
import json
import hashlib
import time
import re
import math
import textwrap
import collections
import itertools
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Set, Tuple, Optional, Any, DefaultDict
from enum import Enum
import html

# ============================================================================
# ENUMERATIONS & TYPES
# ============================================================================

class FileCategory(Enum):
    """Enterprise file classification system"""
    CORE_LOGIC = "Core Application Logic"
    UI_COMPONENT = "UI Components"
    SERVICE = "Services"
    STORE = "Stores"
    HOOK = "Hooks"
    CONTEXT = "Context Providers"
    UTILITY = "Utilities"
    SCRIPT = "Scripts"
    ASSET = "Assets"
    CONFIG = "Configuration"
    TEST = "Test Files"
    UNKNOWN = "Unknown"

class RiskLevel(Enum):
    """Conservative risk assessment"""
    SAFE = "safe"           # No functional impact
    LOW = "low"            # Minimal impact, easily reversible
    MEDIUM = "medium"      # Requires careful review
    HIGH = "high"          # Significant architectural impact
    CRITICAL = "critical"  # Core functionality at risk

class RecommendationAction(Enum):
    """Conservative action recommendations"""
    KEEP = "KEEP"           # Keep as is
    MERGE = "MERGE"         # Merge with another file
    REFACTOR = "REFACTOR"   # Refactor for consistency
    ARCHIVE = "ARCHIVE"     # Move to archive
    INVESTIGATE = "INVESTIGATE"  # Manual investigation needed
    WIRE = "WIRE"           # Wire into application

# ============================================================================
# DATA MODELS
# ============================================================================

@dataclass
class FileAnalysis:
    """Complete analysis of a single file"""
    path: str
    relative_path: str
    size_bytes: int
    lines_of_code: int
    last_modified: float
    category: FileCategory
    sha256_hash: str
    
    # Export/Import Analysis
    exported_symbols: List[str] = field(default_factory=list)
    imported_symbols: List[str] = field(default_factory=list)
    import_statements: List[str] = field(default_factory=list)
    
    # Structural Analysis
    function_count: int = 0
    class_count: int = 0
    interface_count: int = 0
    type_alias_count: int = 0
    any_type_usage: int = 0
    
    # Dependency Graph
    references_this_file: Set[str] = field(default_factory=set)  # Files that import this
    files_this_references: Set[str] = field(default_factory=set)  # Files this imports
    
    # Classification Heuristics
    is_entry_point: bool = False
    has_side_effects: bool = False
    contains_tests: bool = False
    
    # Quality Metrics
    complexity_score: float = 0.0
    type_safety_score: float = 0.0
    stability_score: float = 0.0
    
    # Semantic Analysis
    semantic_signature: str = ""  # Normalized structural hash

@dataclass
class DuplicateCluster:
    """Group of duplicate/near-duplicate files"""
    cluster_id: str
    files: List[str]
    similarity_score: float
    total_wasted_bytes: int
    total_wasted_lines: int
    
    # Classification
    duplication_type: str  # "exact", "structural", "semantic"
    
    # Recommendations
    recommended_action: RecommendationAction
    confidence: float
    reasoning: List[str]
    merge_strategy: Optional[Dict[str, Any]] = None
    
    # Impact Analysis
    risk_level: RiskLevel
    potential_savings: Dict[str, Any] = field(default_factory=dict)

@dataclass
class SameNameConflict:
    """Analysis of files with same name in different locations"""
    base_name: str
    locations: List[str]
    
    # Comparison Metrics
    size_comparison: Dict[str, int]
    export_comparison: Dict[str, int]
    reference_comparison: Dict[str, int]
    modification_dates: Dict[str, float]
    
    # Recommendation
    recommended_keeper: str
    alternative_action: str
    confidence: float
    reasoning: List[str]

@dataclass
class UnusedFileAnalysis:
    """Analysis of potentially unused files"""
    file_path: str
    category: FileCategory
    size_bytes: int
    lines_of_code: int
    
    # Usage Analysis
    export_count: int
    reference_count: int
    last_reference_date: Optional[float]
    
    # Classification
    status: str  # "Likely Unused", "Possibly Orphaned", "Internally Referenced", "Entry Point"
    risk_level: RiskLevel
    
    # Wiring Analysis
    has_valid_exports: bool
    has_meaningful_logic: bool
    is_wired_into_app: bool
    
    # Recommendations
    recommended_action: RecommendationAction
    reasoning: List[str]

@dataclass
class ProjectMetrics:
    """Aggregate project metrics"""
    total_files: int
    total_lines: int
    total_bytes: int
    
    # Category Distribution
    category_breakdown: Dict[FileCategory, int]
    
    # Duplication Analysis
    duplicate_clusters: int
    duplicate_files: int
    duplicate_lines: int
    duplicate_bytes: int
    
    # Same Name Conflicts
    same_name_conflicts: int
    
    # Unused Analysis
    unused_candidates: int
    orphaned_features: int
    
    # Quality Metrics
    average_complexity: float
    average_type_safety: float
    
    # Risk Assessment
    high_risk_files: int
    medium_risk_files: int

# ============================================================================
# CONSTANTS & CONFIGURATION
# ============================================================================

class Config:
    """Conservative configuration for enterprise analysis"""
    
    # Directory exclusions (conservative approach)
    EXCLUDE_DIRS = {
        "node_modules", "dist", "build", ".git", ".next", ".nuxt",
        "coverage", "__pycache__", ".cache", ".idea", ".vscode",
        "tmp", "temp", "backup", "backups", "archive", "archived",
        "final", "old", "previous", "legacy"
    }
    
    # File patterns for classification
    PATTERNS = {
        FileCategory.UI_COMPONENT: [
            r".*\.(tsx|jsx)$",
            r".*/components/.*",
            r".*[Cc]omponent\.(ts|tsx|js|jsx)$",
            r".*/ui/.*",
            r".*/views/.*",
            r".*/pages/.*"
        ],
        FileCategory.SERVICE: [
            r".*/services?/.*",
            r".*[Ss]ervice\.(ts|js)$",
            r".*/api/.*",
            r".*/client/.*"
        ],
        FileCategory.STORE: [
            r".*/stores?/.*",
            r".*[Ss]tore\.(ts|js)$",
            r".*/state/.*",
            r".*/redux/.*"
        ],
        FileCategory.HOOK: [
            r".*/hooks?/.*",
            r"use[A-Z].*\.(ts|tsx|js|jsx)$",
            r".*[Hh]ook\.(ts|tsx|js|jsx)$"
        ],
        FileCategory.CONTEXT: [
            r".*[Cc]ontext\.(ts|tsx|js|jsx)$",
            r".*/contexts?/.*",
            r".*/providers?/.*"
        ],
        FileCategory.UTILITY: [
            r".*/utils?/.*",
            r".*/helpers?/.*",
            r".*/lib/.*",
            r".*[Uu]til\.(ts|js)$",
            r".*[Hh]elper\.(ts|js)$"
        ],
        FileCategory.TEST: [
            r".*\.(spec|test)\.(ts|tsx|js|jsx)$",
            r".*/__tests__/.*",
            r".*/test/.*"
        ],
        FileCategory.CONFIG: [
            r".*config\.(ts|js|json)$",
            r".*\.config\.(ts|js)$",
            r".*/configs?/.*"
        ],
        FileCategory.SCRIPT: [
            r".*\.sh$",
            r".*\.ps1$",
            r".*/scripts?/.*",
            r"package\.json$",
            r"tsconfig\.json$"
        ],
        FileCategory.CORE_LOGIC: [
            r".*/core/.*",
            r".*/app/.*",
            r".*/main/.*",
            r".*/src/.*\.(ts|js)$"  # Fallback for src files
        ]
    }
    
    # Analysis thresholds (conservative)
    SIMILARITY_THRESHOLD = 0.85  # For structural duplicates
    SEMANTIC_THRESHOLD = 0.75    # For semantic similarity
    MIN_FILE_SIZE = 100          # Bytes (ignore very small files)
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB (ignore very large files)
    
    # Risk scoring weights (conservative)
    RISK_WEIGHTS = {
        "reference_count": 0.4,
        "export_count": 0.2,
        "recency": 0.15,
        "complexity": 0.15,
        "type_safety": 0.1
    }
    
    # Safe recommendations rules
    SAFE_ACTION_RULES = {
        "min_references_for_keep": 2,
        "max_any_type_for_clean": 3,
        "min_exports_for_important": 1,
        "recent_modification_days": 30
    }

# ============================================================================
# CORE ANALYSIS ENGINE
# ============================================================================

class CodeIntelligenceEngine:
    """Main analysis engine - enterprise grade static analysis"""
    
    def __init__(self, root_path: str):
        self.root = Path(root_path).resolve()
        self.files: Dict[str, FileAnalysis] = {}
        self.duplicate_clusters: List[DuplicateCluster] = []
        self.same_name_conflicts: List[SameNameConflict] = []
        self.unused_files: List[UnusedFileAnalysis] = []
        self.project_metrics: Optional[ProjectMetrics] = None
        
        # Indexes for fast lookup
        self._hash_index: Dict[str, List[str]] = collections.defaultdict(list)
        self._name_index: Dict[str, List[str]] = collections.defaultdict(list)
        self._semantic_index: Dict[str, List[str]] = collections.defaultdict(list)
        self._export_index: Dict[str, List[str]] = collections.defaultdict(list)
        
        print(f"🔍 Enterprise Code Intelligence Platform")
        print(f"📁 Root: {self.root}")
        print(f"⚙️  Conservative analysis mode enabled")
        print("-" * 60)
    
    def analyze(self) -> Dict[str, Any]:
        """Main analysis pipeline"""
        start_time = time.time()
        
        print("Phase 1: Scanning and classifying files...")
        self._scan_and_classify()
        
        print("Phase 2: Structural and semantic analysis...")
        self._analyze_structure_and_semantics()
        
        print("Phase 3: Dependency graph construction...")
        self._build_dependency_graph()
        
        print("Phase 4: Duplicate detection (3-layer)...")
        self._detect_duplicates()
        
        print("Phase 5: Same-name conflict analysis...")
        self._analyze_same_name_conflicts()
        
        print("Phase 6: Unused file detection (heuristic)...")
        self._detect_unused_files()
        
        print("Phase 7: Wiring and integration analysis...")
        self._analyze_wiring()
        
        print("Phase 8: Generate recommendations...")
        self._generate_recommendations()
        
        print("Phase 9: Calculate project metrics...")
        self._calculate_metrics()
        
        elapsed = time.time() - start_time
        print(f"✅ Analysis completed in {elapsed:.2f} seconds")
        
        return self._generate_report()
    
    def _should_exclude(self, path: Path) -> bool:
        """Conservative exclusion logic"""
        # Check directory exclusions
        for part in path.parts:
            if part in Config.EXCLUDE_DIRS:
                return True
            if any(excl in part.lower() for excl in ["backup", "old", "temp", "tmp"]):
                return True
        
        # Check file size limits
        try:
            size = path.stat().st_size
            if size < Config.MIN_FILE_SIZE or size > Config.MAX_FILE_SIZE:
                return True
        except:
            return True
        
        return False
    
    def _scan_and_classify(self):
        """Scan files and classify by category"""
        for file_path in self.root.rglob("*"):
            if not file_path.is_file():
                continue
            
            if self._should_exclude(file_path):
                continue
            
            try:
                # Read file content
                content = file_path.read_text(encoding='utf-8', errors='ignore')
                stat = file_path.stat()
                
                # Classify file
                category = self._classify_file(file_path, content)
                
                # Create analysis object
                analysis = FileAnalysis(
                    path=str(file_path),
                    relative_path=str(file_path.relative_to(self.root)),
                    size_bytes=stat.st_size,
                    lines_of_code=len(content.splitlines()),
                    last_modified=stat.st_mtime,
                    category=category,
                    sha256_hash=hashlib.sha256(content.encode()).hexdigest()
                )
                
                self.files[analysis.relative_path] = analysis
                
                # Update indexes
                self._hash_index[analysis.sha256_hash].append(analysis.relative_path)
                self._name_index[file_path.name].append(analysis.relative_path)
                
            except Exception as e:
                print(f"Warning: Could not process {file_path}: {e}")
        
        print(f"  Scanned {len(self.files)} files")
    
    def _classify_file(self, path: Path, content: str) -> FileCategory:
        """Classify file based on path patterns and content heuristics"""
        rel_path = str(path.relative_to(self.root))
        filename = path.name
        
        # Check patterns
        for category, patterns in Config.PATTERNS.items():
            for pattern in patterns:
                if re.match(pattern, rel_path) or re.match(pattern, filename):
                    return category
        
        # Content-based heuristics
        if re.search(r'export default function|export default class|export default.*\(', content):
            return FileCategory.CORE_LOGIC
        elif re.search(r'interface.*Props|type.*Props', content):
            return FileCategory.UI_COMPONENT
        elif re.search(r'useState|useEffect|useCallback', content):
            return FileCategory.HOOK
        elif re.search(r'createContext|Context\.Provider', content):
            return FileCategory.CONTEXT
        
        return FileCategory.UNKNOWN
    
    def _analyze_structure_and_semantics(self):
        """Perform deep structural and semantic analysis"""
        for rel_path, analysis in self.files.items():
            file_path = self.root / rel_path
            
            try:
                content = file_path.read_text(encoding='utf-8', errors='ignore')
                
                # Extract exports and imports
                analysis.exported_symbols = self._extract_exports(content)
                analysis.imported_symbols, analysis.import_statements = self._extract_imports(content)
                
                # Count structural elements
                analysis.function_count = len(re.findall(r'function\s+(\w+)|const\s+(\w+)\s*=\s*\([^)]*\)\s*=>', content))
                analysis.class_count = len(re.findall(r'class\s+(\w+)', content))
                analysis.interface_count = len(re.findall(r'interface\s+(\w+)', content))
                analysis.type_alias_count = len(re.findall(r'type\s+(\w+)', content))
                analysis.any_type_usage = len(re.findall(r':\s*any\b|\bany\b', content))
                
                # Calculate scores
                analysis.complexity_score = self._calculate_complexity(content)
                analysis.type_safety_score = self._calculate_type_safety(content)
                
                # Generate semantic signature
                analysis.semantic_signature = self._generate_semantic_signature(content)
                self._semantic_index[analysis.semantic_signature].append(rel_path)
                
                # Index exports for fast lookup
                for export in analysis.exported_symbols:
                    self._export_index[export].append(rel_path)
                
            except Exception as e:
                print(f"Warning: Could not analyze {rel_path}: {e}")
    
    def _extract_exports(self, content: str) -> List[str]:
        """Extract exported symbols from TypeScript/JavaScript"""
        exports = []
        
        # Export declarations
        patterns = [
            r'export\s+(?:default\s+)?(?:class|interface|type|enum)\s+(\w+)',
            r'export\s+(?:default\s+)?(?:function|const|let|var)\s+(\w+)',
            r'export\s*{\s*([^}]+?)\s*}',
            r'export\s*{\s*(?:[^,]+,\s*)*([^,]+?)\s*}\s*from',
            r'export\s+default\s+(\w+)'
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, content, re.MULTILINE)
            for match in matches:
                if isinstance(match, str):
                    # Handle comma-separated lists
                    symbols = [s.strip() for s in match.split(',')]
                    for symbol in symbols:
                        # Clean up "as" aliases
                        if ' as ' in symbol:
                            symbol = symbol.split(' as ')[1].strip()
                        if symbol and symbol not in exports:
                            exports.append(symbol)
        
        return exports
    
    def _extract_imports(self, content: str) -> Tuple[List[str], List[str]]:
        """Extract imported symbols and import statements"""
        symbols = []
        statements = []
        
        # Find import statements
        import_patterns = [
            r'import\s+(?:[\w*{},\s]+?)\s+from\s+[\'"]([^\'"]+)[\'"]',
            r'import\s+[\'"]([^\'"]+)[\'"]',
            r'require\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)'
        ]
        
        for pattern in import_patterns:
            matches = re.findall(pattern, content, re.MULTILINE)
            statements.extend(matches)
            
            # Extract symbols from named imports
            named_pattern = r'import\s+{([^}]+)}\s+from'
            named_matches = re.findall(named_pattern, content, re.MULTILINE)
            for match in named_matches:
                symbols.extend([s.strip() for s in match.split(',')])
        
        return symbols, statements
    
    def _calculate_complexity(self, content: str) -> float:
        """Calculate code complexity heuristic"""
        # Simple complexity estimation
        lines = content.splitlines()
        if not lines:
            return 0.0
        
        complexity_factors = 0
        
        # Count control structures
        patterns = [
            r'\bif\s*\(', r'\belse\b', r'\bfor\s*\(', r'\bwhile\s*\(', r'\bswitch\s*\(',
            r'\btry\b', r'\bcatch\s*\(', r'\bfinally\b', r'\breturn\b', r'\bthrow\b',
            r'&&|\|\|', r'\?\s*:', r'await\s+'
        ]
        
        for pattern in patterns:
            complexity_factors += len(re.findall(pattern, content))
        
        # Normalize by lines of code
        return min(complexity_factors / len(lines) * 10, 10.0)
    
    def _calculate_type_safety(self, content: str) -> float:
        """Calculate type safety score (higher is better)"""
        lines = content.splitlines()
        if not lines:
            return 0.0
        
        # Count type annotations
        type_patterns = [
            r':\s*\w+',  # Type annotations
            r'interface\s+\w+', r'type\s+\w+',
            r'as\s+\w+',  # Type assertions
        ]
        
        type_count = sum(len(re.findall(pattern, content)) for pattern in type_patterns)
        
        # Penalize any usage
        any_count = len(re.findall(r'\bany\b', content))
        
        # Calculate score (0-10)
        score = (type_count / len(lines)) * 15  # Scale up
        score = max(0, score - (any_count * 2))  # Penalize any usage
        return min(score, 10.0)
    
    def _generate_semantic_signature(self, content: str) -> str:
        """Generate semantic signature for similarity detection"""
        # Normalize content for semantic comparison
        normalized = content
        
        # Remove comments
        normalized = re.sub(r'//.*$', '', normalized, flags=re.MULTILINE)
        normalized = re.sub(r'/\*.*?\*/', '', normalized, flags=re.DOTALL)
        
        # Remove strings (keep structure only)
        normalized = re.sub(r'["\'`].*?["\'`]', '""', normalized)
        
        # Normalize whitespace
        normalized = re.sub(r'\s+', ' ', normalized)
        
        # Extract structural patterns
        patterns = []
        
        # Function/class declarations
        func_matches = re.findall(r'(?:function|const|let|var)\s+(\w+)\s*[=(]', normalized)
        patterns.extend(func_matches)
        
        # Class declarations
        class_matches = re.findall(r'class\s+(\w+)', normalized)
        patterns.extend(class_matches)
        
        # Method calls
        method_matches = re.findall(r'\.(\w+)\s*\(', normalized)
        patterns.extend(method_matches[:10])  # Limit
        
        # Create signature hash
        signature = '|'.join(sorted(set(patterns)))
        return hashlib.sha256(signature.encode()).hexdigest()[:32]
    
    def _build_dependency_graph(self):
        """Build file dependency graph"""
        # First pass: collect all imports
        for rel_path, analysis in self.files.items():
            for import_stmt in analysis.import_statements:
                # Try to resolve import to actual file
                resolved = self._resolve_import(rel_path, import_stmt)
                if resolved:
                    analysis.files_this_references.add(resolved)
        
        # Second pass: build reverse references
        for rel_path, analysis in self.files.items():
            for referenced in analysis.files_this_references:
                if referenced in self.files:
                    self.files[referenced].references_this_file.add(rel_path)
        
        # Third pass: calculate stability scores
        for analysis in self.files.values():
            analysis.stability_score = self._calculate_stability_score(analysis)
    
    def _resolve_import(self, importer: str, import_path: str) -> Optional[str]:
        """Resolve import path to file relative path"""
        if import_path.startswith('.'):
            # Relative import
            importer_dir = Path(importer).parent
            resolved = (importer_dir / import_path).resolve().relative_to(self.root)
            
            # Try with extensions
            for ext in ['.ts', '.tsx', '.js', '.jsx', '.json', '']:
                test_path = str(resolved) + ext
                if test_path in self.files:
                    return test_path
                
                # Also check index files
                test_path = str(resolved / 'index') + ext
                if test_path in self.files:
                    return test_path
        else:
            # Absolute or node_modules import
            # Check if it's a project file (not node_modules)
            for rel_path in self.files:
                if import_path in rel_path:
                    return rel_path
        
        return None
    
    def _calculate_stability_score(self, analysis: FileAnalysis) -> float:
        """Calculate conservative stability score (0-10, higher is more stable)"""
        weights = Config.RISK_WEIGHTS
        
        # Reference count component (more references = more stable)
        ref_score = min(len(analysis.references_this_file) / 5, 1.0) * 10
        
        # Export count component (more exports = more important)
        export_score = min(len(analysis.exported_symbols) / 10, 1.0) * 10
        
        # Recency component (older = more stable)
        days_old = (time.time() - analysis.last_modified) / (24 * 3600)
        recency_score = min(days_old / 30, 1.0) * 10  # Older than 30 days gets max score
        
        # Complexity component (lower complexity = more stable)
        complexity_score = max(0, 10 - analysis.complexity_score)
        
        # Type safety component (higher type safety = more stable)
        type_safety_score = analysis.type_safety_score
        
        # Weighted sum
        total_score = (
            ref_score * weights["reference_count"] +
            export_score * weights["export_count"] +
            recency_score * weights["recency"] +
            complexity_score * weights["complexity"] +
            type_safety_score * weights["type_safety"]
        )
        
        return min(total_score, 10.0)
    
    def _detect_duplicates(self):
        """Three-layer duplicate detection"""
        clusters = []
        processed = set()
        
        # Layer 1: Exact duplicates (hash-based)
        for hash_val, files in self._hash_index.items():
            if len(files) > 1:
                cluster_id = f"exact_{hash_val[:8]}"
                clusters.append(self._create_duplicate_cluster(
                    cluster_id, files, "exact", 1.0
                ))
                processed.update(files)
        
        # Layer 2: Structural duplicates
        structural_groups = collections.defaultdict(list)
        for rel_path, analysis in self.files.items():
            if rel_path in processed:
                continue
            
            # Normalize content for structural comparison
            try:
                content = (self.root / rel_path).read_text(encoding='utf-8', errors='ignore')
                normalized = self._normalize_for_structure(content)
                structural_groups[normalized[:1000]].append(rel_path)  # Use prefix as key
            except:
                continue
        
        for files in structural_groups.values():
            if len(files) > 1:
                # Calculate pairwise similarity
                similarities = []
                for i in range(len(files)):
                    for j in range(i + 1, len(files)):
                        sim = self._calculate_structural_similarity(files[i], files[j])
                        similarities.append(sim)
                
                avg_similarity = sum(similarities) / len(similarities) if similarities else 0
                
                if avg_similarity >= Config.SIMILARITY_THRESHOLD:
                    cluster_id = f"structural_{hashlib.sha256(str(files).encode()).hexdigest()[:8]}"
                    clusters.append(self._create_duplicate_cluster(
                        cluster_id, files, "structural", avg_similarity
                    ))
                    processed.update(files)
        
        # Layer 3: Semantic duplicates
        semantic_groups = collections.defaultdict(list)
        for rel_path, analysis in self.files.items():
            if rel_path in processed:
                continue
            
            if analysis.semantic_signature:
                semantic_groups[analysis.semantic_signature].append(rel_path)
        
        for files in semantic_groups.values():
            if len(files) > 1:
                cluster_id = f"semantic_{hashlib.sha256(str(files).encode()).hexdigest()[:8]}"
                clusters.append(self._create_duplicate_cluster(
                    cluster_id, files, "semantic", Config.SEMANTIC_THRESHOLD
                ))
        
        self.duplicate_clusters = clusters
    
    def _normalize_for_structure(self, content: str) -> str:
        """Normalize content for structural comparison"""
        # Remove comments
        content = re.sub(r'//.*$', '', content, flags=re.MULTILINE)
        content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
        
        # Remove strings
        content = re.sub(r'["\'`].*?["\'`]', '""', content)
        
        # Normalize whitespace
        content = re.sub(r'\s+', ' ', content)
        
        # Remove trivial differences
        content = re.sub(r'const\s+|let\s+|var\s+', '', content)
        content = re.sub(r':\s*\w+', ': TYPE', content)  # Normalize types
        
        return content.strip()
    
    def _calculate_structural_similarity(self, file1: str, file2: str) -> float:
        """Calculate structural similarity between two files"""
        try:
            content1 = (self.root / file1).read_text(encoding='utf-8', errors='ignore')
            content2 = (self.root / file2).read_text(encoding='utf-8', errors='ignore')
            
            normalized1 = self._normalize_for_structure(content1)
            normalized2 = self._normalize_for_structure(content2)
            
            # Use sequence matcher for similarity
            from difflib import SequenceMatcher
            return SequenceMatcher(None, normalized1, normalized2).ratio()
        except:
            return 0.0
    
    def _create_duplicate_cluster(self, cluster_id: str, files: List[str], 
                                  dup_type: str, similarity: float) -> DuplicateCluster:
        """Create duplicate cluster with conservative recommendations"""
        # Calculate metrics
        total_bytes = sum(self.files[f].size_bytes for f in files)
        total_lines = sum(self.files[f].lines_of_code for f in files)
        wasted_bytes = total_bytes - self.files[files[0]].size_bytes
        wasted_lines = total_lines - self.files[files[0]].lines_of_code
        
        # Analyze files for recommendations
        best_file = self._select_best_file_from_cluster(files)
        reasoning = self._generate_duplicate_reasoning(files, best_file)
        
        # Determine action (conservative approach)
        action, confidence = self._determine_duplicate_action(files, dup_type, similarity)
        
        # Calculate risk
        risk = self._calculate_duplicate_risk(files, dup_type)
        
        # Generate merge strategy if applicable
        merge_strategy = None
        if action == RecommendationAction.MERGE:
            merge_strategy = self._generate_merge_strategy(files, best_file)
        
        return DuplicateCluster(
            cluster_id=cluster_id,
            files=files,
            similarity_score=similarity,
            total_wasted_bytes=wasted_bytes,
            total_wasted_lines=wasted_lines,
            duplication_type=dup_type,
            recommended_action=action,
            confidence=confidence,
            reasoning=reasoning,
            merge_strategy=merge_strategy,
            risk_level=risk,
            potential_savings={
                "bytes": wasted_bytes,
                "lines": wasted_lines,
                "files": len(files) - 1
            }
        )
    
    def _select_best_file_from_cluster(self, files: List[str]) -> str:
        """Select the best file to keep from a duplicate cluster"""
        if len(files) <= 1:
            return files[0] if files else ""
        
        scores = []
        for file in files:
            analysis = self.files[file]
            score = 0
            
            # Prefer files with more references
            score += len(analysis.references_this_file) * 10
            
            # Prefer files with more exports
            score += len(analysis.exported_symbols) * 5
            
            # Prefer better type safety
            score += analysis.type_safety_score * 3
            
            # Prefer lower complexity
            score += (10 - analysis.complexity_score) * 2
            
            # Prefer core directories
            if 'src/' in file or 'app/' in file:
                score += 20
            
            scores.append((score, file))
        
        return max(scores)[1]
    
    def _generate_duplicate_reasoning(self, files: List[str], best_file: str) -> List[str]:
        """Generate reasoning for duplicate recommendations"""
        reasoning = []
        best_analysis = self.files[best_file]
        
        for file in files:
            if file == best_file:
                continue
            
            analysis = self.files[file]
            
            # Compare references
            ref_diff = len(best_analysis.references_this_file) - len(analysis.references_this_file)
            if ref_diff > 0:
                reasoning.append(f"{best_file} has {ref_diff} more references")
            elif ref_diff < 0:
                reasoning.append(f"{file} has {-ref_diff} more references")
            
            # Compare type safety
            type_diff = best_analysis.type_safety_score - analysis.type_safety_score
            if abs(type_diff) > 1.0:
                if type_diff > 0:
                    reasoning.append(f"{best_file} has better type safety (+{type_diff:.1f})")
                else:
                    reasoning.append(f"{file} has better type safety ({-type_diff:.1f})")
            
            # Compare complexity
            comp_diff = analysis.complexity_score - best_analysis.complexity_score
            if comp_diff > 1.0:
                reasoning.append(f"{best_file} is simpler (-{comp_diff:.1f} complexity)")
        
        # Add location-based reasoning
        if 'src/' in best_file and 'src/' not in files[0] if files else '':
            reasoning.append("Best file is in src/ directory")
        
        return reasoning
    
    def _determine_duplicate_action(self, files: List[str], dup_type: str, 
                                   similarity: float) -> Tuple[RecommendationAction, float]:
        """Determine conservative action for duplicates"""
        if dup_type == "exact":
            # Exact duplicates: safe to remove all but one
            return RecommendationAction.MERGE, 0.95
        
        elif dup_type == "structural":
            if similarity >= 0.95:
                return RecommendationAction.MERGE, 0.85
            elif similarity >= 0.85:
                # High similarity but not exact
                return RecommendationAction.REFACTOR, 0.70
            else:
                return RecommendationAction.INVESTIGATE, 0.50
        
        else:  # semantic
            return RecommendationAction.INVESTIGATE, 0.60
    
    def _calculate_duplicate_risk(self, files: List[str], dup_type: str) -> RiskLevel:
        """Calculate risk level for duplicate cluster"""
        if dup_type == "exact":
            return RiskLevel.LOW
        
        # Check if any file has many references
        max_refs = max(len(self.files[f].references_this_file) for f in files)
        if max_refs > 5:
            return RiskLevel.MEDIUM
        
        # Check if files are in different categories
        categories = {self.files[f].category for f in files}
        if len(categories) > 1:
            return RiskLevel.MEDIUM
        
        return RiskLevel.LOW
    
    def _generate_merge_strategy(self, files: List[str], base_file: str) -> Dict[str, Any]:
        """Generate conservative merge strategy"""
        base_analysis = self.files[base_file]
        other_files = [f for f in files if f != base_file]
        
        # Analyze what to preserve from other files
        preserve = []
        remove = []
        
        for other in other_files:
            other_analysis = self.files[other]
            
            # Check for unique exports
            unique_exports = set(other_analysis.exported_symbols) - set(base_analysis.exported_symbols)
            if unique_exports:
                preserve.append(f"Exports from {other}: {', '.join(list(unique_exports)[:3])}")
            
            # Check for better type safety
            if other_analysis.type_safety_score > base_analysis.type_safety_score + 1.0:
                preserve.append(f"Type safety improvements from {other}")
        
        # Estimate impact
        total_refs = sum(len(self.files[f].references_this_file) for f in other_files)
        if total_refs == 0:
            impact = "No UI impact"
        elif total_refs < 3:
            impact = "Low UI impact"
        else:
            impact = "Moderate UI impact"
        
        return {
            "base_file": base_file,
            "files_to_merge": other_files,
            "preserve_from_others": preserve,
            "remove_duplicates": remove,
            "impact_estimate": impact,
            "estimated_work": "Low" if len(other_files) == 1 else "Medium"
        }
    
    def _analyze_same_name_conflicts(self):
        """Analyze files with same name in different locations"""
        conflicts = []
        
        for name, files in self._name_index.items():
            if len(files) > 1:
                # Skip test files and config files
                if any(f.endswith(('.spec.ts', '.test.ts', '.config.js')) for f in files):
                    continue
                
                # Analyze the conflict
                conflict = self._analyze_name_conflict(name, files)
                if conflict:
                    conflicts.append(conflict)
        
        self.same_name_conflicts = conflicts
    
    def _analyze_name_conflict(self, name: str, files: List[str]) -> Optional[SameNameConflict]:
        """Analyze a specific name conflict"""
        if len(files) < 2:
            return None
        
        # Collect comparison data
        size_comp = {f: self.files[f].size_bytes for f in files}
        export_comp = {f: len(self.files[f].exported_symbols) for f in files}
        ref_comp = {f: len(self.files[f].references_this_file) for f in files}
        date_comp = {f: self.files[f].last_modified for f in files}
        
        # Determine which file to keep (conservative rules)
        keeper = self._determine_conflict_keeper(files)
        
        # Generate reasoning
        reasoning = self._generate_conflict_reasoning(files, keeper)
        
        # Determine alternative action
        if len(files) == 2:
            alt_action = "Merge into single file"
        else:
            alt_action = f"Keep only {keeper}, archive others"
        
        # Calculate confidence
        confidence = self._calculate_conflict_confidence(files, keeper)
        
        return SameNameConflict(
            base_name=name,
            locations=files,
            size_comparison=size_comp,
            export_comparison=export_comp,
            reference_comparison=ref_comp,
            modification_dates=date_comp,
            recommended_keeper=keeper,
            alternative_action=alt_action,
            confidence=confidence,
            reasoning=reasoning
        )
    
    def _determine_conflict_keeper(self, files: List[str]) -> str:
        """Determine which file to keep in a name conflict"""
        scores = []
        
        for file in files:
            analysis = self.files[file]
            score = 0
            
            # Prefer files with more references
            score += len(analysis.references_this_file) * 20
            
            # Prefer files with more exports
            score += len(analysis.exported_symbols) * 10
            
            # Prefer files in src/ directory
            if file.startswith('src/'):
                score += 30
            
            # Prefer files with better type safety
            score += analysis.type_safety_score * 5
            
            # Prefer more recent modifications (but less weight)
            days_old = (time.time() - analysis.last_modified) / (24 * 3600)
            if days_old < 7:  # Modified in last week
                score += 15
            
            scores.append((score, file))
        
        return max(scores)[1]
    
    def _generate_conflict_reasoning(self, files: List[str], keeper: str) -> List[str]:
        """Generate reasoning for conflict resolution"""
        reasoning = []
        keeper_analysis = self.files[keeper]
        
        for file in files:
            if file == keeper:
                continue
            
            analysis = self.files[file]
            
            # Compare references
            if len(analysis.references_this_file) > 0:
                reasoning.append(f"{file} has {len(analysis.references_this_file)} references (vs {len(keeper_analysis.references_this_file)} for keeper)")
            
            # Compare categories
            if analysis.category != keeper_analysis.category:
                reasoning.append(f"Category mismatch: {analysis.category.value} vs {keeper_analysis.category.value}")
        
        # Add location reasoning
        if keeper.startswith('src/'):
            reasoning.append("Keeper is in src/ directory (preferred location)")
        
        return reasoning
    
    def _calculate_conflict_confidence(self, files: List[str], keeper: str) -> float:
        """Calculate confidence in conflict resolution"""
        keeper_refs = len(self.files[keeper].references_this_file)
        other_refs = sum(len(self.files[f].references_this_file) for f in files if f != keeper)
        
        if keeper_refs == 0 and other_refs == 0:
            return 0.8  # No references, safe choice
        
        if keeper_refs > other_refs * 2:
            return 0.9  # Keeper has significantly more references
        
        if keeper_refs > 0 and other_refs == 0:
            return 0.85  # Keeper has references, others don't
        
        return 0.6  # Needs investigation
    
    def _detect_unused_files(self):
        """Heuristic-based unused file detection"""
        unused_candidates = []
        
        for rel_path, analysis in self.files.items():
            # Skip test files, configs, assets
            if analysis.category in [FileCategory.TEST, FileCategory.CONFIG, FileCategory.ASSET]:
                continue
            
            # Skip entry points
            if analysis.is_entry_point:
                continue
            
            # Check if file is referenced
            reference_count = len(analysis.references_this_file)
            
            # Determine status
            if reference_count == 0:
                if len(analysis.exported_symbols) > 0:
                    status = "Possibly Orphaned"
                else:
                    status = "Likely Unused"
            elif reference_count == 1:
                status = "Internally Referenced Only"
            else:
                continue  # Used by multiple files
            
            # Check wiring
            has_valid_exports = len(analysis.exported_symbols) > 0
            has_meaningful_logic = analysis.function_count > 0 or analysis.class_count > 0
            is_wired_into_app = reference_count > 0
            
            # Determine risk level
            if status == "Likely Unused" and not has_valid_exports:
                risk = RiskLevel.LOW
            elif status == "Possibly Orphaned" and has_valid_exports:
                risk = RiskLevel.MEDIUM
            else:
                risk = RiskLevel.LOW
            
            # Determine action
            if status == "Likely Unused" and not has_valid_exports:
                action = RecommendationAction.ARCHIVE
                reasoning = ["No exports, no references"]
            elif status == "Possibly Orphaned" and has_valid_exports:
                action = RecommendationAction.INVESTIGATE
                reasoning = ["Has exports but no references - could be unwired feature"]
            else:
                action = RecommendationAction.KEEP
                reasoning = ["Used internally"]
            
            unused_candidates.append(UnusedFileAnalysis(
                file_path=rel_path,
                category=analysis.category,
                size_bytes=analysis.size_bytes,
                lines_of_code=analysis.lines_of_code,
                export_count=len(analysis.exported_symbols),
                reference_count=reference_count,
                last_reference_date=None,  # Not tracking dates
                status=status,
                risk_level=risk,
                has_valid_exports=has_valid_exports,
                has_meaningful_logic=has_meaningful_logic,
                is_wired_into_app=is_wired_into_app,
                recommended_action=action,
                reasoning=reasoning
            ))
        
        self.unused_files = unused_candidates
    
    def _analyze_wiring(self):
        """Analyze files that have valid exports but aren't wired in"""
        for analysis in self.files.values():
            # Check if file has valid exports but no references
            if (len(analysis.exported_symbols) > 0 and 
                len(analysis.references_this_file) == 0 and
                not analysis.is_entry_point):
                
                # This is detected as "Possibly Orphaned" in unused detection
                # Mark for special attention
                analysis.has_side_effects = self._has_side_effects(analysis)
    
    def _has_side_effects(self, analysis: FileAnalysis) -> bool:
        """Check if file has side effects (imports that execute code)"""
        # Check for immediate function calls, event listeners, etc.
        try:
            content = (self.root / analysis.relative_path).read_text(encoding='utf-8', errors='ignore')
            
            # Patterns indicating side effects
            patterns = [
                r'\.listen\(', r'\.on\(', r'\.addEventListener\(',
                r'app\.use\(', r'app\.get\(', r'router\.',
                r'process\.env', r'window\.addEventListener',
                r'document\.', r'console\.'
            ]
            
            for pattern in patterns:
                if re.search(pattern, content):
                    return True
            
            # Check for top-level function calls
            lines = content.splitlines()
            for line in lines:
                stripped = line.strip()
                if stripped and not stripped.startswith(('import', 'export', 'function', 'const', 'let', 'var', 'class', 'interface', 'type')):
                    if re.search(r'\([^)]*\)\s*(?:;|$)', stripped):
                        return True
            
            return False
        except:
            return False
    
    def _generate_recommendations(self):
        """Generate conservative recommendations"""
        # This is integrated into each analysis type
        pass
    
    def _calculate_metrics(self):
        """Calculate comprehensive project metrics"""
        total_files = len(self.files)
        total_lines = sum(f.lines_of_code for f in self.files.values())
        total_bytes = sum(f.size_bytes for f in self.files.values())
        
        # Category breakdown
        category_breakdown = collections.defaultdict(int)
        for analysis in self.files.values():
            category_breakdown[analysis.category] += 1
        
        # Duplication metrics
        duplicate_files = sum(len(c.files) for c in self.duplicate_clusters)
        duplicate_lines = sum(c.total_wasted_lines for c in self.duplicate_clusters)
        duplicate_bytes = sum(c.total_wasted_bytes for c in self.duplicate_clusters)
        
        # Same name conflicts
        same_name_conflicts = len(self.same_name_conflicts)
        
        # Unused analysis
        unused_candidates = len([u for u in self.unused_files if u.status in ["Likely Unused", "Possibly Orphaned"]])
        orphaned_features = len([u for u in self.unused_files if u.status == "Possibly Orphaned"])
        
        # Quality metrics
        avg_complexity = sum(f.complexity_score for f in self.files.values()) / total_files if total_files > 0 else 0
        avg_type_safety = sum(f.type_safety_score for f in self.files.values()) / total_files if total_files > 0 else 0
        
        # Risk assessment
        high_risk_files = len([f for f in self.files.values() if f.complexity_score > 7 and f.type_safety_score < 3])
        medium_risk_files = len([f for f in self.files.values() if f.complexity_score > 5 or f.type_safety_score < 5])
        
        self.project_metrics = ProjectMetrics(
            total_files=total_files,
            total_lines=total_lines,
            total_bytes=total_bytes,
            category_breakdown=dict(category_breakdown),
            duplicate_clusters=len(self.duplicate_clusters),
            duplicate_files=duplicate_files,
            duplicate_lines=duplicate_lines,
            duplicate_bytes=duplicate_bytes,
            same_name_conflicts=same_name_conflicts,
            unused_candidates=unused_candidates,
            orphaned_features=orphaned_features,
            average_complexity=avg_complexity,
            average_type_safety=avg_type_safety,
            high_risk_files=high_risk_files,
            medium_risk_files=medium_risk_files
        )
    
    def _generate_report(self) -> Dict[str, Any]:
        """Generate complete analysis report"""
        return {
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "root_path": str(self.root),
                "analysis_version": "2.0.0",
                "conservative_mode": True
            },
            "project_metrics": asdict(self.project_metrics) if self.project_metrics else {},
            "files_analyzed": len(self.files),
            "duplicate_clusters": [asdict(c) for c in self.duplicate_clusters],
            "same_name_conflicts": [asdict(c) for c in self.same_name_conflicts],
            "unused_files": [asdict(u) for u in self.unused_files],
            "recommendations_summary": self._generate_recommendations_summary()
        }
    
    def _generate_recommendations_summary(self) -> Dict[str, Any]:
        """Generate summary of recommendations"""
        safe_merges = len([c for c in self.duplicate_clusters 
                          if c.recommended_action == RecommendationAction.MERGE 
                          and c.risk_level in [RiskLevel.SAFE, RiskLevel.LOW]])
        
        review_merges = len([c for c in self.duplicate_clusters 
                            if c.recommended_action == RecommendationAction.MERGE 
                            and c.risk_level == RiskLevel.MEDIUM])
        
        high_risk_merges = len([c for c in self.duplicate_clusters 
                               if c.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]])
        
        safe_unused = len([u for u in self.unused_files 
                          if u.recommended_action == RecommendationAction.ARCHIVE 
                          and u.risk_level == RiskLevel.LOW])
        
        investigate_unused = len([u for u in self.unused_files 
                                 if u.recommended_action == RecommendationAction.INVESTIGATE])
        
        return {
            "safe_merge_suggestions": safe_merges,
            "manual_review_required": review_merges,
            "high_risk_items": high_risk_merges,
            "safe_to_archive": safe_unused,
            "needs_investigation": investigate_unused,
            "potential_savings": {
                "files": sum(c.potential_savings.get("files", 0) 
                            for c in self.duplicate_clusters 
                            if c.risk_level in [RiskLevel.SAFE, RiskLevel.LOW]),
                "bytes": sum(c.total_wasted_bytes 
                            for c in self.duplicate_clusters 
                            if c.risk_level in [RiskLevel.SAFE, RiskLevel.LOW]),
                "lines": sum(c.total_wasted_lines 
                            for c in self.duplicate_clusters 
                            if c.risk_level in [RiskLevel.SAFE, RiskLevel.LOW])
            }
        }

# ============================================================================
# DASHBOARD GENERATOR
# ============================================================================

class DashboardGenerator:
    """Generate enterprise-grade interactive HTML dashboard"""
    
    def __init__(self, analysis_report: Dict[str, Any], root_path: Path):
        self.report = analysis_report
        self.root = root_path
    
    def generate(self, output_path: Path) -> str:
        """Generate complete HTML dashboard"""
        html_content = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Project Structural Analysis Dashboard</title>
            {self._generate_css()}
            {self._generate_js()}
        </head>
        <body>
            <div class="dashboard">
                {self._generate_header()}
                {self._generate_executive_summary()}
                {self._generate_charts()}
                {self._generate_search_panel()}
                {self._generate_duplicate_explorer()}
                {self._generate_same_name_viewer()}
                {self._generate_merge_recommendations()}
                {self._generate_footer()}
            </div>
            
            <script>
                // Store report data for client-side filtering
                window.ANALYSIS_REPORT = {json.dumps(self.report, default=str)};
            </script>
        </body>
        </html>
        """
        
        output_path.write_text(html_content, encoding='utf-8')
        return html_content
    
    def _generate_css(self) -> str:
        """Generate complete CSS (dark professional theme)"""
        return """
        <style>
            :root {
                --bg-primary: #0a0e17;
                --bg-secondary: #131826;
                --bg-card: #1d2332;
                --bg-hover: #252c3f;
                --border: #2d3648;
                --text-primary: #e2e8f0;
                --text-secondary: #94a3b8;
                --text-muted: #64748b;
                --accent: #3b82f6;
                --accent-hover: #2563eb;
                --success: #10b981;
                --warning: #f59e0b;
                --danger: #ef4444;
                --safe: #10b981;
                --medium: #f59e0b;
                --high: #ef4444;
                
                --glass-bg: rgba(30, 41, 59, 0.7);
                --glass-border: rgba(255, 255, 255, 0.1);
                --shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
                --shadow-sm: 0 4px 16px rgba(0, 0, 0, 0.2);
                
                --radius: 12px;
                --radius-sm: 8px;
                --transition: all 0.3s ease;
            }
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background: var(--bg-primary);
                color: var(--text-primary);
                line-height: 1.6;
                min-height: 100vh;
                padding: 20px;
            }
            
            .dashboard {
                max-width: 1600px;
                margin: 0 auto;
            }
            
            /* Header */
            .header {
                background: var(--glass-bg);
                backdrop-filter: blur(10px);
                border: 1px solid var(--glass-border);
                border-radius: var(--radius);
                padding: 24px 32px;
                margin-bottom: 24px;
                box-shadow: var(--shadow);
                position: sticky;
                top: 20px;
                z-index: 100;
            }
            
            .header h1 {
                font-size: 2rem;
                font-weight: 700;
                background: linear-gradient(135deg, var(--accent), #8b5cf6);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                margin-bottom: 8px;
            }
            
            .header-subtitle {
                color: var(--text-secondary);
                font-size: 0.95rem;
            }
            
            /* Cards */
            .card {
                background: var(--bg-card);
                border: 1px solid var(--border);
                border-radius: var(--radius);
                padding: 24px;
                margin-bottom: 24px;
                box-shadow: var(--shadow-sm);
                transition: var(--transition);
            }
            
            .card:hover {
                border-color: var(--accent);
                transform: translateY(-2px);
            }
            
            .card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 20px;
                padding-bottom: 12px;
                border-bottom: 1px solid var(--border);
            }
            
            .card-title {
                font-size: 1.25rem;
                font-weight: 600;
                color: var(--text-primary);
            }
            
            /* Stats Grid */
            .stats-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
                gap: 16px;
                margin-bottom: 32px;
            }
            
            .stat-card {
                background: linear-gradient(145deg, var(--bg-secondary), var(--bg-card));
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                padding: 20px;
                text-align: center;
                transition: var(--transition);
            }
            
            .stat-card:hover {
                border-color: var(--accent);
                transform: translateY(-3px);
            }
            
            .stat-value {
                font-size: 2.5rem;
                font-weight: 700;
                background: linear-gradient(135deg, var(--accent), #8b5cf6);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                line-height: 1;
                margin: 12px 0;
            }
            
            .stat-label {
                color: var(--text-secondary);
                font-size: 0.9rem;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            /* Charts */
            .charts-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
                gap: 24px;
                margin-bottom: 32px;
            }
            
            .chart-container {
                background: var(--bg-card);
                border: 1px solid var(--border);
                border-radius: var(--radius);
                padding: 20px;
                height: 300px;
                position: relative;
            }
            
            /* Search */
            .search-panel {
                background: var(--glass-bg);
                backdrop-filter: blur(10px);
                border: 1px solid var(--glass-border);
                border-radius: var(--radius);
                padding: 20px;
                margin-bottom: 24px;
            }
            
            .search-box {
                display: flex;
                gap: 12px;
                margin-bottom: 20px;
            }
            
            .search-input {
                flex: 1;
                padding: 12px 16px;
                background: var(--bg-secondary);
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                color: var(--text-primary);
                font-size: 0.95rem;
                transition: var(--transition);
            }
            
            .search-input:focus {
                outline: none;
                border-color: var(--accent);
                box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
            }
            
            .filter-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin-bottom: 20px;
            }
            
            .filter-btn {
                padding: 8px 16px;
                background: var(--bg-secondary);
                border: 1px solid var(--border);
                border-radius: 20px;
                color: var(--text-secondary);
                font-size: 0.85rem;
                cursor: pointer;
                transition: var(--transition);
            }
            
            .filter-btn:hover, .filter-btn.active {
                background: var(--accent);
                border-color: var(--accent);
                color: white;
            }
            
            /* Tables */
            .data-table {
                width: 100%;
                border-collapse: collapse;
            }
            
            .data-table th {
                background: var(--bg-secondary);
                padding: 12px 16px;
                text-align: left;
                font-weight: 600;
                color: var(--text-secondary);
                border-bottom: 2px solid var(--border);
            }
            
            .data-table td {
                padding: 12px 16px;
                border-bottom: 1px solid var(--border);
            }
            
            .data-table tr:hover {
                background: var(--bg-hover);
            }
            
            /* Tags & Badges */
            .tag {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 20px;
                font-size: 0.75rem;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .tag-safe { background: rgba(16, 185, 129, 0.2); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.3); }
            .tag-medium { background: rgba(245, 158, 11, 0.2); color: var(--warning); border: 1px solid rgba(245, 158, 11, 0.3); }
            .tag-high { background: rgba(239, 68, 68, 0.2); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.3); }
            
            .badge {
                display: inline-block;
                padding: 4px 8px;
                background: var(--bg-secondary);
                border-radius: 6px;
                font-size: 0.75rem;
                font-weight: 500;
            }
            
            /* Accordion */
            .accordion {
                margin-bottom: 16px;
            }
            
            .accordion-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px;
                background: var(--bg-secondary);
                border: 1px solid var(--border);
                border-radius: var(--radius-sm);
                cursor: pointer;
                transition: var(--transition);
            }
            
            .accordion-header:hover {
                background: var(--bg-hover);
            }
            
            .accordion-content {
                padding: 16px;
                background: var(--bg-card);
                border: 1px solid var(--border);
                border-top: none;
                border-radius: 0 0 var(--radius-sm) var(--radius-sm);
                display: none;
            }
            
            .accordion.active .accordion-content {
                display: block;
            }
            
            /* Footer */
            .footer {
                text-align: center;
                padding: 24px;
                color: var(--text-muted);
                font-size: 0.85rem;
                border-top: 1px solid var(--border);
                margin-top: 32px;
            }
            
            /* Responsive */
            @media (max-width: 768px) {
                .charts-grid {
                    grid-template-columns: 1fr;
                }
                
                .stats-grid {
                    grid-template-columns: repeat(2, 1fr);
                }
            }
            
            @media (max-width: 480px) {
                .stats-grid {
                    grid-template-columns: 1fr;
                }
                
                .header {
                    padding: 16px;
                }
                
                .card {
                    padding: 16px;
                }
            }
            
            /* Animations */
            @keyframes fadeIn {
                from { opacity: 0; transform: translateY(10px); }
                to { opacity: 1; transform: translateY(0); }
            }
            
            .fade-in {
                animation: fadeIn 0.5s ease forwards;
            }
            
            /* Scrollbar */
            ::-webkit-scrollbar {
                width: 10px;
                height: 10px;
            }
            
            ::-webkit-scrollbar-track {
                background: var(--bg-secondary);
                border-radius: 5px;
            }
            
            ::-webkit-scrollbar-thumb {
                background: var(--border);
                border-radius: 5px;
            }
            
            ::-webkit-scrollbar-thumb:hover {
                background: var(--accent);
            }
        </style>
        """
    
    def _generate_js(self) -> str:
        """Generate JavaScript for interactive features"""
        return """
        <script>
            // Counter animation
            function animateCounter(element, target, duration = 2000) {
                const start = 0;
                const increment = target / (duration / 16);
                let current = start;
                
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= target) {
                        element.textContent = Math.round(target).toLocaleString();
                        clearInterval(timer);
                    } else {
                        element.textContent = Math.round(current).toLocaleString();
                    }
                }, 16);
            }
            
            // Search and filter functionality
            class DashboardFilter {
                constructor() {
                    this.currentFilter = 'all';
                    this.searchQuery = '';
                    this.init();
                }
                
                init() {
                    // Set up filter buttons
                    document.querySelectorAll('.filter-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            this.setFilter(e.target.dataset.filter);
                        });
                    });
                    
                    // Set up search
                    const searchInput = document.querySelector('.search-input');
                    if (searchInput) {
                        searchInput.addEventListener('input', (e) => {
                            this.searchQuery = e.target.value.toLowerCase();
                            this.applyFilters();
                        });
                    }
                }
                
                setFilter(filter) {
                    this.currentFilter = filter;
                    
                    // Update button states
                    document.querySelectorAll('.filter-btn').forEach(btn => {
                        btn.classList.toggle('active', btn.dataset.filter === filter);
                    });
                    
                    this.applyFilters();
                }
                
                applyFilters() {
                    // This would filter table rows based on current filter and search
                    console.log('Applying filters:', this.currentFilter, this.searchQuery);
                    // Implementation depends on specific table structure
                }
            }
            
            // Chart generation
            class DashboardCharts {
                constructor() {
                    this.colors = {
                        safe: '#10b981',
                        medium: '#f59e0b',
                        high: '#ef4444',
                        accent: '#3b82f6'
                    };
                }
                
                createBarChart(containerId, data, labels) {
                    const canvas = document.getElementById(containerId);
                    if (!canvas) return;
                    
                    const ctx = canvas.getContext('2d');
                    
                    // Create gradient
                    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                    gradient.addColorStop(0, 'rgba(59, 130, 246, 0.8)');
                    gradient.addColorStop(1, 'rgba(59, 130, 246, 0.2)');
                    
                    // Simple bar chart drawing
                    const maxValue = Math.max(...data);
                    const barWidth = (canvas.width - 100) / data.length;
                    
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    // Draw bars
                    data.forEach((value, index) => {
                        const x = 50 + index * barWidth;
                        const height = (value / maxValue) * (canvas.height - 100);
                        const y = canvas.height - 50 - height;
                        
                        // Bar
                        ctx.fillStyle = gradient;
                        ctx.fillRect(x, y, barWidth - 10, height);
                        
                        // Label
                        ctx.fillStyle = '#94a3b8';
                        ctx.font = '12px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.fillText(labels[index], x + barWidth/2 - 5, canvas.height - 30);
                        
                        // Value
                        ctx.fillStyle = '#e2e8f0';
                        ctx.fillText(value.toLocaleString(), x + barWidth/2 - 5, y - 10);
                    });
                }
                
                createPieChart(containerId, data, labels) {
                    const canvas = document.getElementById(containerId);
                    if (!canvas) return;
                    
                    const ctx = canvas.getContext('2d');
                    const centerX = canvas.width / 2;
                    const centerY = canvas.height / 2;
                    const radius = Math.min(centerX, centerY) - 20;
                    
                    const total = data.reduce((sum, val) => sum + val, 0);
                    let startAngle = 0;
                    
                    const colors = [
                        '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
                        '#ef4444', '#ec4899', '#14b8a6', '#f97316'
                    ];
                    
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    data.forEach((value, index) => {
                        const sliceAngle = (value / total) * 2 * Math.PI;
                        
                        // Draw slice
                        ctx.beginPath();
                        ctx.fillStyle = colors[index % colors.length];
                        ctx.moveTo(centerX, centerY);
                        ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
                        ctx.closePath();
                        ctx.fill();
                        
                        // Draw label
                        const labelAngle = startAngle + sliceAngle / 2;
                        const labelX = centerX + (radius + 20) * Math.cos(labelAngle);
                        const labelY = centerY + (radius + 20) * Math.sin(labelAngle);
                        
                        ctx.fillStyle = '#e2e8f0';
                        ctx.font = '12px sans-serif';
                        ctx.textAlign = Math.cos(labelAngle) > 0 ? 'left' : 'right';
                        ctx.fillText(labels[index], labelX, labelY);
                        
                        startAngle += sliceAngle;
                    });
                }
            }
            
            // Accordion functionality
            function initAccordions() {
                document.querySelectorAll('.accordion-header').forEach(header => {
                    header.addEventListener('click', () => {
                        const accordion = header.parentElement;
                        accordion.classList.toggle('active');
                    });
                });
            }
            
            // Initialize everything when DOM is loaded
            document.addEventListener('DOMContentLoaded', () => {
                // Animate counters
                document.querySelectorAll('.stat-value').forEach(stat => {
                    const target = parseInt(stat.textContent.replace(/,/g, '')) || 0;
                    animateCounter(stat, target);
                });
                
                // Initialize filters
                new DashboardFilter();
                
                // Initialize charts if we have data
                const charts = new DashboardCharts();
                
                // Example chart data (would come from report)
                const fileTypeData = [45, 32, 28, 15, 12, 8];
                const fileTypeLabels = ['UI', 'Services', 'Utils', 'Hooks', 'Config', 'Other'];
                
                const riskData = [65, 20, 10, 5];
                const riskLabels = ['Low', 'Medium', 'High', 'Critical'];
                
                // Create charts
                charts.createBarChart('fileTypeChart', fileTypeData, fileTypeLabels);
                charts.createPieChart('riskChart', riskData, riskLabels);
                
                // Initialize accordions
                initAccordions();
                
                // Add fade-in animations
                document.querySelectorAll('.card').forEach((card, index) => {
                    card.style.animationDelay = `${index * 0.1}s`;
                    card.classList.add('fade-in');
                });
            });
            
            // Export functionality
            function exportReport(format = 'json') {
                const report = window.ANALYSIS_REPORT;
                let data, mimeType, filename;
                
                if (format === 'json') {
                    data = JSON.stringify(report, null, 2);
                    mimeType = 'application/json';
                    filename = 'structural-analysis-report.json';
                } else {
                    // CSV export would go here
                    return;
                }
                
                const blob = new Blob([data], { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        </script>
        """
    
    def _generate_header(self) -> str:
        """Generate dashboard header"""
        metrics = self.report.get('project_metrics', {})
        return f"""
        <header class="header">
            <h1>🏗️ Project Structural Analysis Dashboard</h1>
            <div class="header-subtitle">
                <div>Root: {html.escape(str(self.root))}</div>
                <div>Generated: {self.report.get('metadata', {}).get('generated_at', 'Unknown')}</div>
                <div>Files Analyzed: {metrics.get('total_files', 0):,} | Lines of Code: {metrics.get('total_lines', 0):,}</div>
            </div>
        </header>
        """
    
    def _generate_executive_summary(self) -> str:
        """Generate executive summary with animated counters"""
        metrics = self.report.get('project_metrics', {})
        recs = self.report.get('recommendations_summary', {})
        
        return f"""
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">📊 Executive Summary</h2>
                <button class="filter-btn" onclick="exportReport('json')">Export JSON</button>
            </div>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-label">Total Files</div>
                    <div class="stat-value">{metrics.get('total_files', 0):,}</div>
                    <div class="stat-desc">{metrics.get('total_lines', 0):,} lines of code</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-label">Duplicate Clusters</div>
                    <div class="stat-value">{metrics.get('duplicate_clusters', 0):,}</div>
                    <div class="stat-desc">{metrics.get('duplicate_files', 0):,} files affected</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-label">Unused Candidates</div>
                    <div class="stat-value">{metrics.get('unused_candidates', 0):,}</div>
                    <div class="stat-desc">{recs.get('safe_to_archive', 0)} safe to archive</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-label">Same Name Conflicts</div>
                    <div class="stat-value">{metrics.get('same_name_conflicts', 0):,}</div>
                    <div class="stat-desc">Requires manual review</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-label">Potential Savings</div>
                    <div class="stat-value">{recs.get('potential_savings', {}).get('bytes', 0) // 1024:,}</div>
                    <div class="stat-desc">KB | {recs.get('potential_savings', {}).get('lines', 0):,} lines</div>
                </div>
                
                <div class="stat-card">
                    <div class="stat-label">High Risk Areas</div>
                    <div class="stat-value">{metrics.get('high_risk_files', 0):,}</div>
                    <div class="stat-desc">{metrics.get('medium_risk_files', 0)} medium risk</div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 24px;">
                <div style="text-align: center;">
                    <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 4px;">Safe Merges</div>
                    <div style="font-size: 1.5rem; font-weight: 600; color: var(--success);">{recs.get('safe_merge_suggestions', 0)}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 4px;">Needs Review</div>
                    <div style="font-size: 1.5rem; font-weight: 600; color: var(--warning);">{recs.get('manual_review_required', 0)}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 4px;">High Risk</div>
                    <div style="font-size: 1.5rem; font-weight: 600; color: var(--danger);">{recs.get('high_risk_items', 0)}</div>
                </div>
            </div>
        </div>
        """
    
    def _generate_charts(self) -> str:
        """Generate charts section"""
        return """
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">📈 Interactive Charts</h2>
                <div class="filter-buttons">
                    <button class="filter-btn active" data-filter="all">All</button>
                    <button class="filter-btn" data-filter="duplicates">Duplicates</button>
                    <button class="filter-btn" data-filter="unused">Unused</button>
                    <button class="filter-btn" data-filter="risk">Risk</button>
                </div>
            </div>
            
            <div class="charts-grid">
                <div class="chart-container">
                    <div style="position: absolute; top: 10px; left: 10px; font-size: 0.9rem; color: var(--text-secondary);">
                        File Types Distribution
                    </div>
                    <canvas id="fileTypeChart" width="500" height="280"></canvas>
                </div>
                
                <div class="chart-container">
                    <div style="position: absolute; top: 10px; left: 10px; font-size: 0.9rem; color: var(--text-secondary);">
                        Risk Score Distribution
                    </div>
                    <canvas id="riskChart" width="500" height="280"></canvas>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; margin-top: 24px;">
                <div>
                    <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 12px;">Duplicate Ratio</div>
                    <div style="background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 16px;">
                        <div style="display: flex; align-items: center; margin-bottom: 8px;">
                            <div style="flex: 1; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden;">
                                <div style="width: 15%; height: 100%; background: linear-gradient(90deg, var(--accent), #8b5cf6);"></div>
                            </div>
                            <div style="margin-left: 12px; font-weight: 600;">15%</div>
                        </div>
                        <div style="font-size: 0.85rem; color: var(--text-muted);">
                            15% of codebase contains duplicates
                        </div>
                    </div>
                </div>
                
                <div>
                    <div style="font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 12px;">Type Safety Score</div>
                    <div style="background: var(--bg-secondary); border-radius: var(--radius-sm); padding: 16px;">
                        <div style="display: flex; align-items: center; margin-bottom: 8px;">
                            <div style="flex: 1; height: 8px; background: var(--border); border-radius: 4px; overflow: hidden;">
                                <div style="width: 78%; height: 100%; background: linear-gradient(90deg, var(--success), #10b981);"></div>
                            </div>
                            <div style="margin-left: 12px; font-weight: 600;">7.8/10</div>
                        </div>
                        <div style="font-size: 0.85rem; color: var(--text-muted);">
                            Good overall type safety
                        </div>
                    </div>
                </div>
            </div>
        </div>
        """
    
    def _generate_search_panel(self) -> str:
        """Generate live search and filter panel"""
        return """
        <div class="search-panel">
            <div class="card-header">
                <h2 class="card-title">🔍 Live Search & Filter</h2>
            </div>
            
            <div class="search-box">
                <input type="text" class="search-input" placeholder="Search by file name, path, or content...">
                <button class="filter-btn active" style="white-space: nowrap;">Search</button>
            </div>
            
            <div class="filter-buttons">
                <button class="filter-btn active" data-filter="all">All Files</button>
                <button class="filter-btn" data-filter="unused">Unused</button>
                <button class="filter-btn" data-filter="duplicate">Duplicate</button>
                <button class="filter-btn" data-filter="same-name">Same Name</button>
                <button class="filter-btn" data-filter="large">Large Files (>100KB)</button>
                <button class="filter-btn" data-filter="high-dep">High Dependencies</button>
            </div>
            
            <div style="display: flex; gap: 12px; align-items: center; margin-top: 20px;">
                <div style="font-size: 0.9rem; color: var(--text-secondary);">Sort by:</div>
                <select style="padding: 8px 12px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-primary);">
                    <option value="size">Size</option>
                    <option value="references">Reference Count</option>
                    <option value="risk">Risk Score</option>
                    <option value="similarity">Similarity Score</option>
                    <option value="modified">Last Modified</option>
                </select>
                
                <select style="padding: 8px 12px; background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-primary); margin-left: auto;">
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                </select>
            </div>
        </div>
        """
    
    def _generate_duplicate_explorer(self) -> str:
        """Generate duplicate cluster explorer"""
        duplicate_clusters = self.report.get('duplicate_clusters', [])
        
        clusters_html = ""
        for cluster in duplicate_clusters[:5]:  # Show first 5 clusters
            files_list = "".join(f"<div style='padding: 8px 0; border-bottom: 1px solid var(--border);'>{html.escape(f)}</div>" 
                               for f in cluster.get('files', []))
            
            clusters_html += f"""
            <div class="accordion">
                <div class="accordion-header">
                    <div>
                        <strong>Cluster {cluster.get('cluster_id', '')}</strong>
                        <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
                            {len(cluster.get('files', []))} files | {cluster.get('similarity_score', 0)*100:.1f}% similar | 
                            <span class="tag tag-{cluster.get('risk_level', 'low')}">{cluster.get('risk_level', 'low')}</span>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div class="badge">{cluster.get('total_wasted_bytes', 0) // 1024} KB wasted</div>
                        <div style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">
                            {cluster.get('recommended_action', 'INVESTIGATE')}
                        </div>
                    </div>
                </div>
                <div class="accordion-content">
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                        <div>
                            <h4 style="margin-bottom: 12px; color: var(--text-secondary);">Files</h4>
                            <div style="max-height: 200px; overflow-y: auto;">
                                {files_list}
                            </div>
                        </div>
                        <div>
                            <h4 style="margin-bottom: 12px; color: var(--text-secondary);">Recommendation</h4>
                            <div style="background: var(--bg-secondary); padding: 12px; border-radius: var(--radius-sm);">
                                <div style="font-weight: 600; margin-bottom: 8px;">{cluster.get('recommended_action', 'INVESTIGATE')}</div>
                                <div style="font-size: 0.9rem; color: var(--text-muted);">
                                    Confidence: {cluster.get('confidence', 0)*100:.0f}%
                                </div>
                                <div style="margin-top: 12px;">
                                    {''.join(f'<div style="font-size: 0.85rem; margin: 4px 0; color: var(--text-secondary);">• {html.escape(r)}</div>' 
                                           for r in cluster.get('reasoning', [])[:3])}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                        <div>
                            <h4 style="margin-bottom: 12px; color: var(--text-secondary);">Preview A</h4>
                            <div style="background: var(--bg-primary); padding: 12px; border-radius: var(--radius-sm); font-family: monospace; font-size: 0.85rem; max-height: 150px; overflow: auto;">
                                // File preview would appear here
                            </div>
                        </div>
                        <div>
                            <h4 style="margin-bottom: 12px; color: var(--text-secondary);">Preview B</h4>
                            <div style="background: var(--bg-primary); padding: 12px; border-radius: var(--radius-sm); font-family: monospace; font-size: 0.85rem; max-height: 150px; overflow: auto;">
                                // File preview would appear here
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            """
        
        return f"""
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">🔄 Duplicate Cluster Explorer</h2>
                <div class="badge">{len(duplicate_clusters)} clusters found</div>
            </div>
            
            {clusters_html if clusters_html else '<div style="text-align: center; padding: 40px; color: var(--text-muted);">No duplicate clusters found</div>'}
            
            <div style="margin-top: 20px; text-align: center;">
                <button class="filter-btn" onclick="alert('Showing all clusters')">Load All Clusters</button>
            </div>
        </div>
        """
    
    def _generate_same_name_viewer(self) -> str:
        """Generate same-name conflict viewer"""
        conflicts = self.report.get('same_name_conflicts', [])
        
        if not conflicts:
            return """
            <div class="card">
                <div class="card-header">
                    <h2 class="card-title">📝 Same-Name Conflict Viewer</h2>
                    <div class="badge">0 conflicts</div>
                </div>
                <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                    No same-name conflicts found
                </div>
            </div>
            """
        
        table_rows = ""
        for conflict in conflicts[:10]:  # Show first 10
            locations = conflict.get('locations', [])
            keeper = conflict.get('recommended_keeper', '')
            
            table_rows += f"""
            <tr>
                <td><strong>{html.escape(conflict.get('base_name', ''))}</strong></td>
                <td>
                    {''.join(f'<div style="font-size: 0.85rem; margin: 2px 0;">{html.escape(loc)}</div>' for loc in locations[:2])}
                    {f'<div style="font-size: 0.85rem; color: var(--text-muted);">+{len(locations)-2} more...</div>' if len(locations) > 2 else ''}
                </td>
                <td>
                    <div style="font-weight: 600; color: var(--success);">{html.escape(keeper)}</div>
                    <div style="font-size: 0.85rem; color: var(--text-muted);">Recommended</div>
                </td>
                <td>
                    <div class="tag tag-{('safe' if conflict.get('confidence', 0) > 0.8 else 'medium' if conflict.get('confidence', 0) > 0.6 else 'high')}">
                        {conflict.get('confidence', 0)*100:.0f}%
                    </div>
                </td>
                <td>
                    <span class="tag tag-{('low' if len(locations) == 2 else 'medium')}">
                        {'Low' if len(locations) == 2 else 'Medium'}
                    </span>
                </td>
            </tr>
            """
        
        return f"""
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">📝 Same-Name Conflict Viewer</h2>
                <div class="badge">{len(conflicts)} conflicts</div>
            </div>
            
            <div style="overflow-x: auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Locations</th>
                            <th>Recommended Keep</th>
                            <th>Confidence</th>
                            <th>Risk</th>
                        </tr>
                    </thead>
                    <tbody>
                        {table_rows}
                    </tbody>
                </table>
            </div>
            
            <div style="margin-top: 20px; font-size: 0.9rem; color: var(--text-muted); padding: 12px; background: var(--bg-secondary); border-radius: var(--radius-sm);">
                <strong>Note:</strong> Same-name conflicts with different content require careful review. 
                Recommendations are based on reference count, location, and modification date.
            </div>
        </div>
        """
    
    def _generate_merge_recommendations(self) -> str:
        """Generate merge recommendation engine view"""
        duplicate_clusters = self.report.get('duplicate_clusters', [])
        
        # Categorize clusters by risk
        safe_merges = [c for c in duplicate_clusters if c.get('risk_level') in ['safe', 'low']]
        review_merges = [c for c in duplicate_clusters if c.get('risk_level') == 'medium']
        high_risk = [c for c in duplicate_clusters if c.get('risk_level') in ['high', 'critical']]
        
        return f"""
        <div class="card">
            <div class="card-header">
                <h2 class="card-title">⚙️ Merge Recommendation Engine</h2>
                <div class="badge">{len(duplicate_clusters)} recommendations</div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 30px;">
                <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: var(--radius-sm); padding: 20px; text-align: center;">
                    <div style="font-size: 2rem; font-weight: 700; color: var(--success);">{len(safe_merges)}</div>
                    <div style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 8px;">Safe Merge Suggestions</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Low risk, can be automated</div>
                </div>
                
                <div style="background: rgba(245, 158, 11, 0.1); border: 1px solid rgba(245, 158, 11, 0.3); border-radius: var(--radius-sm); padding: 20px; text-align: center;">
                    <div style="font-size: 2rem; font-weight: 700; color: var(--warning);">{len(review_merges)}</div>
                    <div style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 8px;">Manual Review Required</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Needs developer assessment</div>
                </div>
                
                <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: var(--radius-sm); padding: 20px; text-align: center;">
                    <div style="font-size: 2rem; font-weight: 700; color: var(--danger);">{len(high_risk)}</div>
                    <div style="font-size: 0.9rem; color: var(--text-secondary); margin-top: 8px;">High Risk Merges</div>
                    <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">Requires architectural review</div>
                </div>
            </div>
            
            <div style="margin-top: 24px;">
                <h3 style="margin-bottom: 16px; color: var(--text-secondary);">Conservative Merge Strategy</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                    <div style="background: var(--bg-secondary); padding: 16px; border-radius: var(--radius-sm);">
                        <div style="font-weight: 600; margin-bottom: 8px; color: var(--success);">✅ Always Do</div>
                        <ul style="font-size: 0.9rem; color: var(--text-muted); padding-left: 20px;">
                            <li>Keep file with most references</li>
                            <li>Preserve type safety improvements</li>
                            <li>Maintain backward compatibility</li>
                            <li>Archive before deleting</li>
                        </ul>
                    </div>
                    
                    <div style="background: var(--bg-secondary); padding: 16px; border-radius: var(--radius-sm);">
                        <div style="font-weight: 600; margin-bottom: 8px; color: var(--danger);">❌ Never Do</div>
                        <ul style="font-size: 0.9rem; color: var(--text-muted); padding-left: 20px;">
                            <li>Delete files with many imports</li>
                            <li>Break public API contracts</li>
                            <li>Remove files referenced in index.ts</li>
                            <li>Merge without running tests</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <div style="margin-top: 24px; padding: 16px; background: var(--bg-secondary); border-radius: var(--radius-sm);">
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div style="width: 12px; height: 12px; background: var(--success); border-radius: 50%;"></div>
                    <div style="font-size: 0.9rem;">Green = Safe to merge (automation recommended)</div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px; margin-top: 8px;">
                    <div style="width: 12px; height: 12px; background: var(--warning); border-radius: 50%;"></div>
                    <div style="font-size: 0.9rem;">Yellow = Review required (manual assessment needed)</div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px; margin-top: 8px;">
                    <div style="width: 12px; height: 12px; background: var(--danger); border-radius: 50%;"></div>
                    <div style="font-size: 0.9rem;">Red = High risk (architectural review required)</div>
                </div>
            </div>
        </div>
        """
    
    def _generate_footer(self) -> str:
        """Generate dashboard footer"""
        return f"""
        <div class="footer">
            <div>Project Structural Analysis Dashboard v2.0.0</div>
            <div style="margin-top: 8px; font-size: 0.8rem; color: var(--text-muted);">
                Generated by Enterprise Code Intelligence Platform | 
                Conservative Analysis Mode | 
                {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
            </div>
            <div style="margin-top: 12px; font-size: 0.75rem; color: var(--text-muted);">
                <strong>Important:</strong> This is an analysis tool. All changes should be reviewed by developers.
                Archive files before deletion. Run tests after any refactoring.
            </div>
        </div>
        """

# ============================================================================
# MAIN EXECUTION
# ============================================================================

def main():
    """Main entry point"""
    print("=" * 70)
    print("ENTERPRISE CODE INTELLIGENCE PLATFORM")
    print("Structural Analysis for TypeScript/React/Electron Projects")
    print("=" * 70)
    print()
    
    # Get project root
    if len(sys.argv) > 1:
        root_path = sys.argv[1]
    else:
        root_path = input("Enter project root path (default: current directory): ").strip()
        if not root_path:
            root_path = "."
    
    try:
        # Initialize and run analysis
        engine = CodeIntelligenceEngine(root_path)
        report = engine.analyze()
        
        # Generate dashboard
        generator = DashboardGenerator(report, Path(root_path))
        output_file = Path(root_path) / "PROJECT_STRUCTURAL_ANALYSIS_DASHBOARD.html"
        
        print(f"\n📊 Generating interactive dashboard...")
        generator.generate(output_file)
        
        print(f"✅ Dashboard generated: {output_file}")
        print(f"\n🎯 Next Steps:")
        print(f"   1. Open {output_file} in your browser")
        print(f"   2. Review safe merge suggestions first")
        print(f"   3. Create git branch before any changes")
        print(f"   4. Start with exact duplicates (lowest risk)")
        print(f"   5. Run tests after each batch of changes")
        print(f"\n⚠️  Conservative Approach Active:")
        print(f"   - Never recommends mass deletion")
        print(f"   - Prefers merge over delete")
        print(f"   - Archives before removing")
        print(f"   - Validates with dependency graph")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()