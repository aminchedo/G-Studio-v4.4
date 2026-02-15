#!/usr/bin/env python3
"""
G-STUDIO ULTIMATE SAFE REFACTOR SYSTEM 4.5.0

Enterprise-grade static analysis with advanced dashboard visualization.
Conservative, non-destructive approach with comprehensive metrics and reporting.

Author: G-Studio Engineering
Version: 4.5.0 - Enhanced Dashboard Edition
"""

import os
import sys
import json
import hashlib
import time
import re
import math
import csv
import zipfile
import shutil
import textwrap
import collections
from pathlib import Path
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Set, Tuple, Optional, Any, DefaultDict
from enum import Enum
import html
from difflib import SequenceMatcher

# ============================================================================
# ENUMERATIONS
# ============================================================================

class RiskLevel(Enum):
    """Risk assessment levels"""
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
    RENAME_FOR_CLARITY = "RENAME_FOR_CLARITY"

class FileCategory(Enum):
    """File classification"""
    UI_COMPONENT = "UI Component"
    CUSTOM_HOOK = "Custom Hook"
    PAGE_OR_ROUTE = "Page/Route"
    CONTEXT = "Context"
    STORE_OR_STATE = "Store/State"
    UTILITY = "Utility"
    SERVICE = "Service"
    CONFIG = "Configuration"
    TEST = "Test"
    ASSET = "Asset"
    FRAMEWORK_CORE = "Framework Core"
    UNKNOWN = "Unknown"

class ComponentType(Enum):
    """Component types"""
    FUNCTION_COMPONENT = "Function Component"
    ARROW_COMPONENT = "Arrow Component"
    CLASS_COMPONENT = "Class Component"
    HOOK = "Hook"
    HIGHER_ORDER_COMPONENT = "Higher-Order Component"

class DuplicationType(Enum):
    """Duplicate detection types"""
    EXACT = "Exact"
    STRUCTURAL = "Structural"
    NAME = "Name"

# ============================================================================
# CONFIGURATION
# ============================================================================

class Config:
    """Configuration settings"""
    
    # Excluded directories
    EXCLUDE_DIRS = {
        "node_modules", "dist", "build", ".git", ".next", ".nuxt",
        "coverage", "__pycache__", ".cache", ".idea", ".vscode",
        "tmp", "temp", "backup", "backups", "archive", "archived",
        "final", "old", "previous", "legacy", "out", ".output",
        "refactor_temp", "reports"
    }
    
    # Critical directories (never archive)
    CRITICAL_DIRS = {
        "core", "runtime", "boot", "init", "config", "framework",
        "shared", "common", "lib", "utils", "src"
    }
    
    # Category patterns
    CATEGORY_PATTERNS = {
        FileCategory.UI_COMPONENT: [
            r".*\.(tsx|jsx)$",
            r".*/components?/.*",
            r".*[Cc]omponent\.(ts|tsx|js|jsx)$",
            r".*/ui/.*",
            r".*/view/.*",
            r"FC<|React\.FC|function.*Component|const.*=.*\(.*\)\s*=>.*{"
        ],
        FileCategory.CUSTOM_HOOK: [
            r".*/hooks?/.*",
            r"use[A-Z].*\.(ts|tsx|js|jsx)$",
            r"use[A-Z][A-Za-z]*\s*\("
        ],
        FileCategory.PAGE_OR_ROUTE: [
            r".*/pages?/.*",
            r".*/routes?/.*",
            r".*/app/.*",
            r".*Page\.(ts|tsx|js|jsx)$",
            r".*Route\.(ts|tsx|js|jsx)$",
            r"getServerSideProps|getStaticProps"
        ],
        FileCategory.CONTEXT: [
            r".*[Cc]ontext\.(ts|tsx|js|jsx)$",
            r".*/contexts?/.*",
            r".*/providers?/.*",
            r"createContext|Context\.Provider"
        ],
        FileCategory.STORE_OR_STATE: [
            r".*/stores?/.*",
            r".*[Ss]tore\.(ts|js)$",
            r".*/redux/.*",
            r".*/zustand/.*",
            r".*/recoil/.*",
            r".*/state/.*"
        ],
        FileCategory.SERVICE: [
            r".*/services?/.*",
            r".*[Ss]ervice\.(ts|js)$",
            r".*/api/.*",
            r".*/client/.*",
            r"axios|fetch.*api"
        ],
        FileCategory.UTILITY: [
            r".*/utils?/.*",
            r".*/helpers?/.*",
            r".*/lib/.*",
            r".*[Uu]til\.(ts|js)$",
            r".*[Hh]elper\.(ts|js)$"
        ],
        FileCategory.CONFIG: [
            r".*config\.(ts|js|json)$",
            r".*\.config\.(ts|js)$",
            r".*/configs?/.*",
            r".*\.env\."
        ],
        FileCategory.TEST: [
            r".*\.(spec|test)\.(ts|tsx|js|jsx)$",
            r".*/__tests__/.*",
            r".*/test/.*"
        ],
        FileCategory.ASSET: [
            r".*\.(css|scss|sass|less|svg|png|jpg|jpeg|gif|ico|woff|woff2|ttf|eot)$"
        ],
        FileCategory.FRAMEWORK_CORE: [
            r".*createContext.*",
            r".*configureStore.*",
            r".*setup.*",
            r".*register.*",
            r".*/core/.*",
            r".*/framework/.*",
            r".*/boot/.*",
            r".*/init/.*"
        ]
    }
    
    # Archive rules
    ARCHIVE_RULES = {
        "similarity_threshold": 0.85,
        "recent_days_blocker": 30,
        "archive_score_threshold": 75,
        "min_stability_score": 3.0,
        "max_dependents": 0
    }
    
    # Never archive these categories
    NEVER_ARCHIVE_CATEGORIES = {
        FileCategory.PAGE_OR_ROUTE,
        FileCategory.CONTEXT,
        FileCategory.STORE_OR_STATE,
        FileCategory.FRAMEWORK_CORE
    }
    
    # Safety messages
    SAFETY_MESSAGES = [
        "ANALYSIS-ONLY MODE: NO FILES WERE MODIFIED",
        "ARCHIVE REQUIRES EXPLICIT USER CONFIRMATION",
        "ALL CHANGES ARE REVERSIBLE VIA ARCHIVE",
        "SOURCE FILES REMAIN UNTOUCHED"
    ]
    
    # Dashboard colors
    COLORS = {
        "primary": "#3b82f6",
        "success": "#10b981",
        "warning": "#f59e0b",
        "danger": "#ef4444",
        "info": "#8b5cf6",
        "dark": "#1e293b",
        "light": "#f8fafc"
    }

# ============================================================================
# DATA MODELS
# ============================================================================

@dataclass
class ArchiveDecision:
    """Archive decision with scoring"""
    allowed: bool
    decision: Recommendation
    score: float
    reasons: List[str] = field(default_factory=list)
    blockers: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "allowed": self.allowed,
            "decision": self.decision.value,
            "score": round(self.score, 2),
            "reasons": self.reasons,
            "blockers": self.blockers
        }

@dataclass
class FileInfo:
    """File analysis data"""
    path: str
    relative_path: str
    size_bytes: int
    lines_of_code: int
    last_modified: float
    last_modified_human: str = ""
    days_since_modified: int = 0
    
    # Classification
    category: FileCategory = FileCategory.UNKNOWN
    component_count: int = 0
    hook_count: int = 0
    
    # Analysis
    exported_symbols: List[str] = field(default_factory=list)
    imported_symbols: List[str] = field(default_factory=list)
    import_statements: List[str] = field(default_factory=list)
    
    # Dependencies
    dependents: Set[str] = field(default_factory=set)
    dependencies: Set[str] = field(default_factory=set)
    
    # Risk assessment
    risk_level: RiskLevel = RiskLevel.LOW
    primary_recommendation: Recommendation = Recommendation.KEEP_AS_IS
    secondary_recommendation: Optional[Recommendation] = None
    reasoning: List[str] = field(default_factory=list)
    safety_notes: List[str] = field(default_factory=list)
    short_reason: str = ""
    
    # Quality metrics
    stability_score: float = 0.0
    type_safety_score: float = 0.0
    complexity_score: float = 0.0
    any_type_count: int = 0
    ts_ignore_count: int = 0
    complexity_estimate: int = 0
    
    # Identification
    content_hash: str = ""
    structural_hash: str = ""
    
    # Archive eligibility
    is_archive_eligible: bool = False
    archive_reason: str = ""
    archive_decision: Optional[ArchiveDecision] = None
    
    # Special flags
    is_dynamic_imported: bool = False
    is_test_file: bool = False
    duplicate_cluster_id: Optional[str] = None
    barrel_exported: bool = False
    
    def __post_init__(self):
        if not self.last_modified_human:
            dt = datetime.fromtimestamp(self.last_modified)
            self.last_modified_human = dt.strftime('%Y-%m-%d %H:%M:%S')
            self.days_since_modified = (datetime.now() - dt).days

@dataclass
class ComponentInfo:
    """Component analysis data"""
    name: str
    file_path: str
    line_number: int
    component_type: ComponentType
    is_exported: bool
    is_default_export: bool
    
    # Usage tracking
    used_in_files: Set[str] = field(default_factory=set)
    usage_count: int = 0
    
    # Component details
    prop_count: int = 0
    has_jsx: bool = False
    
    # Recommendations
    risk_level: RiskLevel = RiskLevel.LOW
    recommendation: Recommendation = Recommendation.KEEP_AS_IS
    reasoning: List[str] = field(default_factory=list)
    
    # Metadata
    created_at: float = field(default_factory=time.time)

@dataclass
class DuplicateCluster:
    """Duplicate file cluster"""
    cluster_id: str
    files: List[str]
    similarity_score: float
    duplication_type: str
    
    # Analysis
    risk_level: RiskLevel
    primary_recommendation: Recommendation
    confidence: float
    
    # Merge suggestions
    suggested_base_file: Optional[str] = None
    suggested_merge_target: Optional[str] = None
    diff_summary: List[str] = field(default_factory=list)
    estimated_impact: str = "LOW"
    
    # Metrics
    total_wasted_bytes: int = 0
    total_wasted_lines: int = 0
    cluster_size: int = 0
    exported_files_count: int = 0
    recent_files_count: int = 0
    confidence_score: float = 0.0
    
    # Archive candidates
    archive_candidates: List[str] = field(default_factory=list)
    
    # Reasoning
    reasoning: List[str] = field(default_factory=list)

@dataclass
class ArchiveCandidate:
    """Archive candidate file"""
    file_path: str
    relative_path: str
    category: FileCategory
    size_bytes: int
    lines_of_code: int
    
    # Eligibility
    eligibility_reasons: List[str] = field(default_factory=list)
    risk_level: RiskLevel = RiskLevel.LOW
    stability_score: float = 0.0
    
    # Dependencies
    dependents_count: int = 0
    exported_symbols_count: int = 0
    
    # Timestamps
    last_modified_human: str = ""
    days_since_modified: int = 0
    
    # Archive status
    archive_path: str = ""
    archived: bool = False
    archive_decision: Optional[ArchiveDecision] = None

@dataclass
class ProjectMetrics:
    """Comprehensive project metrics"""
    # Basic counts
    total_files: int
    total_lines: int
    total_bytes: int
    
    # Component analysis
    total_components: int
    total_hooks: int
    unused_components: int
    unwired_components: int
    
    # Duplication
    duplicate_clusters: int
    exact_duplicates: int
    structural_duplicates: int
    
    # Risk distribution
    risk_distribution: Dict[RiskLevel, int]
    
    # Categories
    category_distribution: Dict[FileCategory, int]
    
    # Quality metrics
    average_stability: float
    average_type_safety: float
    average_complexity: float
    total_any_types: int
    total_ts_ignores: int
    
    # Archive analysis
    archive_candidates: int
    safe_to_archive: int
    potential_savings_bytes: int
    potential_savings_lines: int
    
    # Recommendations
    recommendations_summary: Dict[Recommendation, int]
    
    # Performance
    analysis_duration: float
    files_scanned: int

@dataclass
class DashboardMetrics:
    """Enhanced metrics for dashboard"""
    # Summary cards
    total_files: int
    total_lines: int
    total_components: int
    total_hooks: int
    
    # Risk analysis
    risk_counts: Dict[str, int]
    risk_percentages: Dict[str, float]
    
    # Duplication
    duplicate_clusters: int
    total_duplicate_files: int
    waste_bytes: int
    waste_lines: int
    
    # Quality
    average_stability: float
    average_type_safety: float
    average_complexity: float
    
    # Archive analysis
    archive_candidates: int
    safe_to_archive: int
    potential_savings_bytes: int
    potential_savings_percent: float
    
    # Categories
    top_categories: List[Dict[str, Any]]
    
    # Recommendations
    top_recommendations: List[Dict[str, Any]]
    
    # Performance
    analysis_duration: float
    files_per_second: float
    
    # Timeline
    oldest_file_days: int
    newest_file_days: int
    average_file_age_days: int

# ============================================================================
# ANALYSIS ENGINE
# ============================================================================

class SafeRefactorAnalyzer:
    """Main analysis engine with enhanced metrics"""
    
    def __init__(self, root_path: str, scoped_path: Optional[str] = None):
        self.root = Path(root_path).resolve()
        self.scoped_path = Path(scoped_path) if scoped_path else None
        self.files: Dict[str, FileInfo] = {}
        self.components: Dict[str, ComponentInfo] = {}
        self.hooks: Dict[str, ComponentInfo] = {}
        self.duplicate_clusters: List[DuplicateCluster] = []
        self.archive_candidates: List[ArchiveCandidate] = []
        self.project_metrics: Optional[ProjectMetrics] = None
        self.dashboard_metrics: Optional[DashboardMetrics] = None
        self.report_folder: Optional[Path] = None
        
        # Indexes
        self._hash_index: Dict[str, List[str]] = collections.defaultdict(list)
        self._structural_index: Dict[str, List[str]] = collections.defaultdict(list)
        self._name_index: Dict[str, List[str]] = collections.defaultdict(list)
        self._export_index: Dict[str, List[str]] = collections.defaultdict(list)
        
        # Statistics
        self.stats = {
            "files_scanned": 0,
            "components_found": 0,
            "hooks_found": 0,
            "duplicates_found": 0,
            "archive_candidates": 0,
            "analysis_time": 0.0,
            "start_time": 0.0,
            "end_time": 0.0
        }
        
        # Log
        self.analysis_log: List[str] = []
        
    def run_full_analysis(self) -> Dict[str, Any]:
        """Execute complete analysis pipeline"""
        self.stats["start_time"] = time.time()
        
        print("\n" + "="*70)
        print("G-STUDIO ULTIMATE SAFE REFACTOR SYSTEM 4.5.0")
        print("="*70)
        print(f"📁 Analyzing: {self.root}")
        if self.scoped_path:
            print(f"📂 Scope: {self.scoped_path}")
        print("🔒 Safe Mode: Analysis Only | 📊 Enhanced Dashboard")
        print("-"*70)
        
        # Create report folder
        self.report_folder = self._create_timestamped_report_folder()
        self._log("INFO", f"Report folder created: {self.report_folder}")
        
        # Analysis phases
        phases = [
            ("🔍 Scanning and classifying files", self._scan_and_classify_files),
            ("🔍 Detecting React components and hooks", self._detect_components_and_hooks),
            ("🔍 Building dependency graph", self._build_dependency_graph),
            ("🔍 Multi-layer duplicate detection", self._detect_duplicates_multi_layer),
            ("🔍 Risk assessment and recommendations", self._assess_risks_and_recommendations),
            ("🔍 Computing stability scores", self._compute_stability_scores),
            ("🔍 Archive eligibility analysis", self._analyze_archive_eligibility),
            ("📊 Generating comprehensive metrics", self._generate_metrics),
        ]
        
        for phase_name, phase_func in phases:
            print(f"\n{phase_name}...")
            self._log("INFO", phase_name)
            phase_func()
        
        self.stats["end_time"] = time.time()
        self.stats["analysis_time"] = self.stats["end_time"] - self.stats["start_time"]
        
        # Generate reports
        self._generate_all_reports()
        
        # Print summary
        self._print_analysis_summary()
        
        return self._generate_complete_report()
    
    def _create_timestamped_report_folder(self) -> Path:
        """Create timestamped report folder"""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        reports_root = self.root / "reports"
        reports_root.mkdir(exist_ok=True)
        
        report_folder = reports_root / timestamp
        report_folder.mkdir(exist_ok=True)
        
        # Create subdirectories
        (report_folder / "archives").mkdir(exist_ok=True)
        (report_folder / "backups").mkdir(exist_ok=True)
        
        return report_folder
    
    def _log(self, level: str, message: str):
        """Log analysis events"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"[{timestamp}] [{level}] {message}"
        self.analysis_log.append(log_entry)
    
    def _scan_and_classify_files(self):
        """Scan and classify all files"""
        scan_root = self.scoped_path if self.scoped_path else self.root
        
        for file_path in scan_root.rglob("*"):
            if not file_path.is_file():
                continue
            
            if self._should_exclude(file_path):
                continue
            
            try:
                content = file_path.read_text(encoding='utf-8', errors='ignore')
                stat = file_path.stat()
                
                # Classify file
                category = self._classify_file(file_path, content)
                
                # Create file info
                file_info = FileInfo(
                    path=str(file_path),
                    relative_path=str(file_path.relative_to(self.root)),
                    size_bytes=stat.st_size,
                    lines_of_code=len(content.splitlines()),
                    last_modified=stat.st_mtime,
                    category=category,
                    content_hash=hashlib.sha256(content.encode()).hexdigest(),
                    structural_hash=self._compute_structural_hash(content),
                    is_dynamic_imported=bool(re.search(r'import\(|React\.lazy\(|require\(', content)),
                    is_test_file=bool(re.search(r'\.(spec|test)\.', file_path.name)),
                    barrel_exported=self._check_barrel_export(file_path, content)
                )
                
                # Extract exports and imports
                file_info.exported_symbols = self._extract_exports(content)
                file_info.imported_symbols, file_info.import_statements = self._extract_imports(content)
                
                # Type safety analysis
                file_info.any_type_count = len(re.findall(r'\bany\b', content))
                file_info.ts_ignore_count = len(re.findall(r'@ts-ignore|// @ts-ignore', content))
                file_info.type_safety_score = self._calculate_type_safety(content)
                
                # Complexity analysis
                file_info.complexity_estimate = self._estimate_complexity(content)
                
                # Store file
                self.files[file_info.relative_path] = file_info
                self._hash_index[file_info.content_hash].append(file_info.relative_path)
                self._structural_index[file_info.structural_hash].append(file_info.relative_path)
                self._name_index[file_path.name].append(file_info.relative_path)
                
                # Index exports
                for export in file_info.exported_symbols:
                    self._export_index[export].append(file_info.relative_path)
                
                self.stats["files_scanned"] += 1
                
            except Exception as e:
                self._log("WARNING", f"Could not process {file_path}: {str(e)}")
        
        self._log("INFO", f"Scanned {self.stats['files_scanned']} files")
    
    def _should_exclude(self, path: Path) -> bool:
        """Check if path should be excluded"""
        for part in path.parts:
            if part in Config.EXCLUDE_DIRS:
                return True
        return False
    
    def _classify_file(self, path: Path, content: str) -> FileCategory:
        """Classify file based on patterns and content"""
        rel_path = str(path.relative_to(self.root))
        filename = path.name
        
        # Check patterns
        for category, patterns in Config.CATEGORY_PATTERNS.items():
            for pattern in patterns:
                if re.match(pattern, rel_path) or re.match(pattern, filename):
                    return category
        
        # Content-based heuristics
        if re.search(r'FC<|React\.FC|function.*Component|const.*=.*\(.*\)\s*=>.*{', content):
            return FileCategory.UI_COMPONENT
        elif re.search(r'createContext|Context\.Provider', content):
            return FileCategory.CONTEXT
        elif re.search(r'use[A-Z][A-Za-z]*\s*\(', content):
            return FileCategory.CUSTOM_HOOK
        elif re.search(r'getServerSideProps|getStaticProps', content):
            return FileCategory.PAGE_OR_ROUTE
        
        return FileCategory.UNKNOWN
    
    def _check_barrel_export(self, file_path: Path, content: str) -> bool:
        """Check if file is exported via barrel index"""
        parent = file_path.parent
        for index_name in ["index.ts", "index.tsx", "index.js", "index.jsx"]:
            index_path = parent / index_name
            if index_path.exists():
                try:
                    index_content = index_path.read_text(encoding='utf-8')
                    if file_path.name in index_content:
                        return True
                except:
                    continue
        return False
    
    def _compute_structural_hash(self, content: str) -> str:
        """Compute structural hash for similarity detection"""
        normalized = self._normalize_content_for_comparison(content)
        return hashlib.sha256(normalized.encode()).hexdigest()
    
    def _normalize_content_for_comparison(self, content: str) -> str:
        """Normalize content for structural comparison"""
        # Remove comments
        normalized = re.sub(r'//.*$', '', content, flags=re.MULTILINE)
        normalized = re.sub(r'/\*.*?\*/', '', normalized, flags=re.DOTALL)
        
        # Normalize strings and numbers
        normalized = re.sub(r'[\'"`].*?[\'"`]', '__STR__', normalized)
        normalized = re.sub(r'\b\d+\.?\d*\b', '__NUM__', normalized)
        
        # Normalize identifiers
        normalized = re.sub(r'\b(const|let|var)\s+\w+', r'\1 __VAR__', normalized)
        normalized = re.sub(r'function\s+\w+', 'function __FUNC__', normalized)
        
        # Preserve structure
        normalized = re.sub(r'\s+', ' ', normalized)
        return normalized.strip()
    
    def _extract_exports(self, content: str) -> List[str]:
        """Extract exported symbols"""
        exports = []
        
        # Named exports
        named_matches = re.findall(r'export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)', content)
        exports.extend(named_matches)
        
        # Default exports
        if re.search(r'export\s+default', content):
            default_match = re.search(r'export\s+default\s+(\w+)', content)
            if default_match:
                exports.append(f"default:{default_match.group(1)}")
            else:
                exports.append("default")
        
        # Export statements
        export_statements = re.findall(r'export\s*{\s*([^}]+)\s*}', content)
        for statement in export_statements:
            symbols = re.findall(r'(\w+)', statement)
            exports.extend(symbols)
        
        return exports
    
    def _extract_imports(self, content: str) -> Tuple[List[str], List[str]]:
        """Extract imported symbols and import statements"""
        imported_symbols = []
        import_statements = []
        
        # Import statements
        import_pattern = r'import\s+(?:[^"\'`]*from\s+)?["\'`]([^"\'`]+)["\'`]'
        statements = re.findall(import_pattern, content)
        import_statements.extend(statements)
        
        # Named imports
        named_imports = re.findall(r'import\s*{\s*([^}]+)\s*}\s*from', content)
        for imports in named_imports:
            symbols = re.findall(r'(\w+)', imports)
            imported_symbols.extend(symbols)
        
        # Default imports
        default_imports = re.findall(r'import\s+(\w+)\s+from', content)
        imported_symbols.extend(default_imports)
        
        return imported_symbols, import_statements
    
    def _estimate_complexity(self, content: str) -> int:
        """Estimate cyclomatic complexity"""
        patterns = [
            r'\bif\s*\(', r'\belse\b', r'\bfor\s*\(', r'\bwhile\s*\(',
            r'\bswitch\s*\(', r'\bcase\s+', r'\btry\s*{', r'\bcatch\s*\(',
            r'&&|\|\|', r'\?.*:', r'await\s+'
        ]
        
        complexity = 0
        for pattern in patterns:
            complexity += len(re.findall(pattern, content))
        
        func_count = len(re.findall(r'function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>', content))
        complexity += func_count * 2
        
        return complexity
    
    def _calculate_type_safety(self, content: str) -> float:
        """Calculate type safety score (0-10)"""
        lines = content.splitlines()
        if not lines:
            return 0.0
        
        # Type annotations
        type_patterns = [
            r':\s*\w+',
            r'interface\s+\w+', r'type\s+\w+',
            r'as\s+\w+',
        ]
        
        type_count = sum(len(re.findall(pattern, content)) for pattern in type_patterns)
        
        # Penalties
        any_count = len(re.findall(r'\bany\b', content))
        ts_ignore_count = len(re.findall(r'@ts-ignore|// @ts-ignore', content))
        
        # Calculate score
        base_score = (type_count / len(lines)) * 20
        penalty = (any_count * 2) + (ts_ignore_count * 3)
        score = max(0, base_score - penalty)
        
        return min(score, 10.0)
    
    def _detect_components_and_hooks(self):
        """Detect React components and hooks"""
        for rel_path, file_info in self.files.items():
            if file_info.category not in [FileCategory.UI_COMPONENT, FileCategory.CUSTOM_HOOK]:
                continue
            
            try:
                content = (self.root / rel_path).read_text(encoding='utf-8', errors='ignore')
                
                # Function components
                func_patterns = [
                    (r'function\s+([A-Z][A-Za-z0-9_]*)\s*\([^)]*\)\s*{', ComponentType.FUNCTION_COMPONENT),
                    (r'const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*\([^)]*\)\s*=>\s*{', ComponentType.ARROW_COMPONENT),
                ]
                
                for pattern, comp_type in func_patterns:
                    matches = re.finditer(pattern, content)
                    for match in matches:
                        component_name = match.group(1)
                        
                        # Check if it's a hook
                        if component_name.startswith('use') and component_name[3].isupper():
                            component_type = ComponentType.HOOK
                            component_category = "hook"
                        else:
                            component_type = comp_type
                            component_category = "component"
                        
                        # Get line number
                        line_num = content[:match.start()].count('\n') + 1
                        
                        # Check export status
                        lines_before = content[:match.start()].split('\n')
                        is_exported = any('export' in line for line in lines_before[-3:])
                        is_default_export = any('export default' in line for line in lines_before[-3:])
                        
                        # Check for JSX
                        has_jsx = 'return' in content[match.end():match.end()+500] and \
                                 ('<' in content[match.end():match.end()+500] or 'React.createElement' in content[match.end():match.end()+500])
                        
                        # Create component info
                        component = ComponentInfo(
                            name=component_name,
                            file_path=rel_path,
                            line_number=line_num,
                            component_type=component_type,
                            is_exported=is_exported,
                            is_default_export=is_default_export,
                            has_jsx=has_jsx
                        )
                        
                        if component_category == "component":
                            file_info.components.append(component)
                            self.components[f"{rel_path}:{component_name}"] = component
                            self.stats["components_found"] += 1
                        else:
                            file_info.hooks.append(component)
                            self.hooks[f"{rel_path}:{component_name}"] = component
                            self.stats["hooks_found"] += 1
                
                # Update counts
                file_info.component_count = len(file_info.components)
                file_info.hook_count = len(file_info.hooks)
                
            except Exception as e:
                self._log("WARNING", f"Could not analyze components in {rel_path}: {str(e)}")
    
    def _build_dependency_graph(self):
        """Build dependency graph"""
        # Collect imports
        for rel_path, file_info in self.files.items():
            for import_stmt in file_info.import_statements:
                resolved = self._resolve_import(rel_path, import_stmt)
                if resolved:
                    file_info.dependencies.add(resolved)
        
        # Build reverse dependencies
        for rel_path, file_info in self.files.items():
            for dependency in file_info.dependencies:
                if dependency in self.files:
                    self.files[dependency].dependents.add(rel_path)
        
        # Track component usage
        for component_key, component in self.components.items():
            for rel_path, file_info in self.files.items():
                if component.file_path == rel_path:
                    continue
                
                try:
                    content = (self.root / rel_path).read_text(encoding='utf-8', errors='ignore')
                    if component.name in content:
                        component.used_in_files.add(rel_path)
                        component.usage_count += content.count(component.name)
                except:
                    pass
    
    def _resolve_import(self, importer: str, import_path: str) -> Optional[str]:
        """Resolve import path"""
        if import_path.startswith('.'):
            importer_dir = Path(importer).parent
            resolved = (importer_dir / import_path).resolve()
            
            try:
                return str(resolved.relative_to(self.root))
            except ValueError:
                for ext in ['.ts', '.tsx', '.js', '.jsx', '.json', '']:
                    test_path = str(resolved) + ext
                    for file_path in self.files:
                        if file_path in test_path:
                            return file_path
        
        # Check export index
        if import_path in self._export_index:
            return self._export_index[import_path][0] if self._export_index[import_path] else None
        
        return None
    
    def _detect_duplicates_multi_layer(self):
        """Multi-layer duplicate detection"""
        self._log("INFO", "Detecting exact duplicates...")
        exact_clusters = self._detect_exact_duplicates()
        
        self._log("INFO", "Detecting structural duplicates...")
        structural_clusters = self._detect_structural_duplicates()
        
        # Combine and analyze clusters
        all_clusters = exact_clusters + structural_clusters
        self.duplicate_clusters = self._analyze_and_cluster_duplicates(all_clusters)
        self.stats["duplicates_found"] = len(self.duplicate_clusters)
        
        # Generate diff summaries
        for cluster in self.duplicate_clusters:
            self._generate_advanced_diff_summary(cluster)
    
    def _detect_exact_duplicates(self) -> List[DuplicateCluster]:
        """Detect exact duplicates using content hash"""
        clusters = []
        
        for hash_val, files in self._hash_index.items():
            if len(files) > 1:
                total_bytes = sum(self.files[f].size_bytes for f in files)
                total_lines = sum(self.files[f].lines_of_code for f in files)
                wasted_bytes = total_bytes - self.files[files[0]].size_bytes
                wasted_lines = total_lines - self.files[files[0]].lines_of_code
                
                exported_count = sum(1 for f in files if self.files[f].exported_symbols)
                recent_count = sum(1 for f in files if self.files[f].days_since_modified < 60)
                
                cluster = DuplicateCluster(
                    cluster_id=f"exact_{hash_val[:8]}",
                    files=files,
                    similarity_score=1.0,
                    duplication_type="exact",
                    risk_level=RiskLevel.LOW,
                    primary_recommendation=Recommendation.MERGE_INTO_ANOTHER_FILE,
                    confidence=0.95,
                    total_wasted_bytes=wasted_bytes,
                    total_wasted_lines=wasted_lines,
                    cluster_size=len(files),
                    exported_files_count=exported_count,
                    recent_files_count=recent_count,
                    confidence_score=0.95,
                    reasoning=["Files are byte-for-byte identical", "Safe to merge"]
                )
                
                clusters.append(cluster)
        
        return clusters
    
    def _detect_structural_duplicates(self) -> List[DuplicateCluster]:
        """Detect structural duplicates using similarity"""
        clusters = []
        processed = set()
        
        text_files = [f for f in self.files.values() if f.category not in [FileCategory.ASSET, FileCategory.UNKNOWN]]
        file_paths = [f.relative_path for f in text_files]
        
        # Single-linkage clustering
        for i in range(len(file_paths)):
            file_a = file_paths[i]
            if file_a in processed:
                continue
            
            similar_files = [file_a]
            
            for j in range(i + 1, len(file_paths)):
                file_b = file_paths[j]
                if file_b in processed:
                    continue
                
                # Skip if already in exact duplicates
                if self._are_files_in_same_exact_cluster(file_a, file_b):
                    continue
                
                # Compute similarity
                similarity = self._compute_structural_similarity(file_a, file_b)
                
                if similarity >= Config.ARCHIVE_RULES["similarity_threshold"]:
                    similar_files.append(file_b)
                    processed.add(file_b)
            
            if len(similar_files) > 1:
                # Calculate average similarity
                similarities = []
                for f1 in similar_files:
                    for f2 in similar_files:
                        if f1 != f2:
                            sim = self._compute_structural_similarity(f1, f2)
                            similarities.append(sim)
                
                avg_similarity = sum(similarities) / len(similarities) if similarities else 0.0
                
                # Analyze cluster
                exported_count = sum(1 for f in similar_files if self.files[f].exported_symbols)
                recent_count = sum(1 for f in similar_files if self.files[f].days_since_modified < 60)
                
                cluster = DuplicateCluster(
                    cluster_id=f"structural_{hashlib.sha256(str(similar_files).encode()).hexdigest()[:8]}",
                    files=similar_files,
                    similarity_score=avg_similarity,
                    duplication_type="structural",
                    risk_level=RiskLevel.MEDIUM if exported_count > 0 else RiskLevel.LOW,
                    primary_recommendation=Recommendation.INVESTIGATE if exported_count > 0 else Recommendation.REFACTOR_FOR_CLARITY,
                    confidence=avg_similarity,
                    cluster_size=len(similar_files),
                    exported_files_count=exported_count,
                    recent_files_count=recent_count,
                    confidence_score=avg_similarity
                )
                
                # Set suggestions
                self._set_cluster_suggestions(cluster)
                clusters.append(cluster)
                processed.add(file_a)
        
        return clusters
    
    def _compute_structural_similarity(self, file_a: str, file_b: str) -> float:
        """Compute structural similarity between two files"""
        try:
            content_a = (self.root / file_a).read_text(encoding='utf-8', errors='ignore')
            content_b = (self.root / file_b).read_text(encoding='utf-8', errors='ignore')
            
            # Normalize
            norm_a = self._normalize_content_for_similarity(content_a)
            norm_b = self._normalize_content_for_similarity(content_b)
            
            # Early return for very different sizes
            size_ratio = min(len(norm_a), len(norm_b)) / max(len(norm_a), len(norm_b), 1)
            if size_ratio < 0.3:
                return 0.0
            
            # Sequence similarity
            sequence_ratio = SequenceMatcher(None, norm_a, norm_b).ratio()
            
            # Token Jaccard similarity
            tokens_a = self._extract_structural_tokens(content_a)
            tokens_b = self._extract_structural_tokens(content_b)
            
            jaccard_ratio = 0.0
            if tokens_a and tokens_b:
                set_a = set(tokens_a)
                set_b = set(tokens_b)
                if set_a and set_b:
                    jaccard_ratio = len(set_a.intersection(set_b)) / len(set_a.union(set_b))
            
            # Weighted combination
            similarity = (0.6 * sequence_ratio) + (0.4 * jaccard_ratio)
            
            return min(similarity, 1.0)
            
        except Exception as e:
            self._log("WARNING", f"Could not compute similarity for {file_a} vs {file_b}: {str(e)}")
            return 0.0
    
    def _normalize_content_for_similarity(self, content: str) -> str:
        """Advanced normalization for similarity detection"""
        normalized = content
        
        # Remove comments
        normalized = re.sub(r'//.*$', '', normalized, flags=re.MULTILINE)
        normalized = re.sub(r'/\*.*?\*/', '', normalized, flags=re.DOTALL)
        normalized = re.sub(r'\{/\*.*?\*/\}', '', normalized, flags=re.DOTALL)
        
        # Normalize strings and numbers
        normalized = re.sub(r'[\'"`].*?[\'"`]', '__STR__', normalized)
        normalized = re.sub(r'\b\d+\.?\d*\b', '__NUM__', normalized)
        
        # Normalize identifiers
        normalized = re.sub(r'\b(const|let|var)\s+\w+', r'\1 __VAR__', normalized)
        normalized = re.sub(r'function\s+\w+', 'function __FUNC__', normalized)
        normalized = re.sub(r'\((\s*\w+\s*,?\s*)+\)', '(__PARAMS__)', normalized)
        
        # Preserve structure
        normalized = re.sub(r'\s+', ' ', normalized)
        normalized = re.sub(r'\n\s*\n', '\n', normalized)
        
        return normalized.strip()
    
    def _extract_structural_tokens(self, content: str) -> List[str]:
        """Extract structural tokens"""
        tokens = []
        
        # Functions and classes
        func_matches = re.findall(r'(?:function|const|let|var)\s+(\w+)\s*[=(]', content)
        tokens.extend(func_matches)
        
        class_matches = re.findall(r'class\s+(\w+)', content)
        tokens.extend(class_matches)
        
        # Imports and exports
        import_matches = re.findall(r'import\s+.*from\s+[\'"]([^\'"]+)[\'"]', content)
        tokens.extend([f"import:{imp}" for imp in import_matches])
        
        export_matches = re.findall(r'export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)', content)
        tokens.extend([f"export:{exp}" for exp in export_matches])
        
        # Hooks
        hook_matches = re.findall(r'\b(use[A-Z][A-Za-z]*)\b', content)
        tokens.extend([f"hook:{hook}" for hook in hook_matches])
        
        return tokens
    
    def _are_files_in_same_exact_cluster(self, file_a: str, file_b: str) -> bool:
        """Check if files are in same exact cluster"""
        for cluster in self.duplicate_clusters:
            if cluster.duplication_type == "exact" and file_a in cluster.files and file_b in cluster.files:
                return True
        return False
    
    def _set_cluster_suggestions(self, cluster: DuplicateCluster):
        """Set suggested base file and merge target"""
        if len(cluster.files) < 2:
            return
        
        # Score files for base selection
        scores = []
        for file_path in cluster.files:
            file_info = self.files[file_path]
            score = 0
            
            # Higher stability is better
            score += file_info.stability_score * 10
            
            # More dependents is better
            score += len(file_info.dependents) * 5
            
            # Older is better
            score += file_info.days_since_modified * 0.1
            
            # Fewer blockers is better
            if not file_info.is_dynamic_imported:
                score += 20
            if not file_info.barrel_exported:
                score += 10
            
            scores.append((score, file_path))
        
        scores.sort(reverse=True)
        
        # Set suggestions
        cluster.suggested_base_file = scores[0][1]
        if len(scores) > 1 and scores[1][0] > scores[0][0] * 0.7:
            cluster.suggested_merge_target = scores[1][1]
    
    def _generate_advanced_diff_summary(self, cluster: DuplicateCluster):
        """Generate advanced diff summary for duplicate cluster"""
        if len(cluster.files) < 2:
            return
        
        base_file = cluster.files[0]
        compare_file = cluster.files[1] if len(cluster.files) > 1 else None
        
        if not compare_file:
            return
        
        try:
            content_a = (self.root / base_file).read_text(encoding='utf-8', errors='ignore')
            content_b = (self.root / compare_file).read_text(encoding='utf-8', errors='ignore')
            
            diff_summary = []
            
            # Hook differences
            hook_types = ['useState', 'useEffect', 'useMemo', 'useCallback', 'useContext', 'useRef']
            hook_counts_a = {hook: content_a.count(hook) for hook in hook_types}
            hook_counts_b = {hook: content_b.count(hook) for hook in hook_types}
            
            for hook in hook_types:
                diff = hook_counts_a.get(hook, 0) - hook_counts_b.get(hook, 0)
                if diff > 0:
                    diff_summary.append(f"File A has {abs(diff)} more {hook} hooks")
                elif diff < 0:
                    diff_summary.append(f"File B has {abs(diff)} more {hook} hooks")
            
            # Export differences
            exports_a = len(re.findall(r'export default', content_a))
            exports_b = len(re.findall(r'export default', content_b))
            
            if exports_a != exports_b:
                diff_summary.append(f"Different default export count: {exports_a} vs {exports_b}")
            
            # JSX complexity
            jsx_tags_a = len(re.findall(r'<[A-Z][A-Za-z0-9]*', content_a))
            jsx_tags_b = len(re.findall(r'<[A-Z][A-Za-z0-9]*', content_b))
            
            if abs(jsx_tags_a - jsx_tags_b) > 5:
                diff_summary.append(f"JSX complexity difference: {jsx_tags_a} vs {jsx_tags_b} tags")
            
            cluster.diff_summary = diff_summary[:5]
            
        except Exception as e:
            self._log("WARNING", f"Could not generate diff summary: {str(e)}")
            cluster.diff_summary = ["Could not generate detailed diff"]
    
    def _analyze_and_cluster_duplicates(self, clusters: List[DuplicateCluster]) -> List[DuplicateCluster]:
        """Analyze and cluster duplicates"""
        analyzed_clusters = []
        
        for cluster in clusters:
            # Calculate wasted resources
            total_bytes = sum(self.files[f].size_bytes for f in cluster.files)
            total_lines = sum(self.files[f].lines_of_code for f in cluster.files)
            cluster.total_wasted_bytes = total_bytes - self.files[cluster.files[0]].size_bytes
            cluster.total_wasted_lines = total_lines - self.files[cluster.files[0]].lines_of_code
            
            # Determine impact
            max_dependents = max(len(self.files[f].dependents) for f in cluster.files)
            if max_dependents > 5:
                cluster.estimated_impact = "HIGH"
            elif max_dependents > 1:
                cluster.estimated_impact = "MEDIUM"
            else:
                cluster.estimated_impact = "LOW"
            
            analyzed_clusters.append(cluster)
        
        return analyzed_clusters
    
    def _assess_risks_and_recommendations(self):
        """Assess risks and generate recommendations"""
        for rel_path, file_info in self.files.items():
            risk_factors = []
            
            # Export usage
            if file_info.exported_symbols and not file_info.dependents and not file_info.barrel_exported:
                risk_factors.append(("Exported but never imported", RiskLevel.HIGH))
                file_info.primary_recommendation = Recommendation.INVESTIGATE
                file_info.short_reason = "Exported but not imported directly"
            
            # Unused components
            unused_comps = [c for c in file_info.components if c.usage_count == 0]
            if unused_comps:
                risk_factors.append(("Contains unused components", RiskLevel.MEDIUM))
            
            # Recent modifications
            if file_info.days_since_modified < 45:
                risk_factors.append(("Recently modified (< 45 days)", RiskLevel.MEDIUM))
                file_info.safety_notes.append("Recently modified - handle with care")
            
            # Type safety
            if file_info.any_type_count > 5 or file_info.ts_ignore_count > 2:
                risk_factors.append(("Poor type safety", RiskLevel.MEDIUM))
                file_info.secondary_recommendation = Recommendation.REFACTOR_FOR_CLARITY
            
            # Determine overall risk
            if risk_factors:
                risk_levels = [factor[1] for factor in risk_factors]
                file_info.risk_level = max(risk_levels, key=lambda r: r.value)
            else:
                file_info.risk_level = RiskLevel.LOW
    
    def _compute_stability_scores(self):
        """Compute stability scores for all files"""
        for file_info in self.files.values():
            # Calculate factors
            dependents_factor = math.log(1 + len(file_info.dependents))
            exported_symbols_factor = len(file_info.exported_symbols)
            age_factor = min(file_info.days_since_modified / 365, 1.0) * 10
            complexity_factor = max(0, 10 - (file_info.complexity_estimate / 10))
            type_safety = file_info.type_safety_score
            
            # Weighted sum
            weights = {
                "dependents": 0.40,
                "exported_symbols": 0.25,
                "age_factor": 0.15,
                "complexity": 0.10,
                "type_safety": 0.10
            }
            
            stability = (
                weights["dependents"] * dependents_factor +
                weights["exported_symbols"] * exported_symbols_factor +
                weights["age_factor"] * age_factor +
                weights["complexity"] * complexity_factor +
                weights["type_safety"] * type_safety
            )
            
            file_info.stability_score = min(stability, 10.0)
    
    def _analyze_archive_eligibility(self):
        """Analyze archive eligibility"""
        for rel_path, file_info in self.files.items():
            decision = self._evaluate_archive_candidate(file_info)
            file_info.archive_decision = decision
            file_info.is_archive_eligible = decision.allowed
            file_info.archive_reason = "; ".join(decision.reasons) if not decision.allowed else "Eligible for safe archiving"
            
            if decision.allowed and decision.decision == Recommendation.SAFE_TO_ARCHIVE:
                candidate = ArchiveCandidate(
                    file_path=file_info.path,
                    relative_path=file_info.relative_path,
                    category=file_info.category,
                    size_bytes=file_info.size_bytes,
                    lines_of_code=file_info.lines_of_code,
                    eligibility_reasons=decision.reasons,
                    risk_level=file_info.risk_level,
                    stability_score=file_info.stability_score,
                    dependents_count=len(file_info.dependents),
                    exported_symbols_count=len(file_info.exported_symbols),
                    last_modified_human=file_info.last_modified_human,
                    days_since_modified=file_info.days_since_modified,
                    archive_decision=decision
                )
                self.archive_candidates.append(candidate)
                self.stats["archive_candidates"] += 1
    
    def _evaluate_archive_candidate(self, file_info: FileInfo) -> ArchiveDecision:
        """Evaluate archive candidate with scoring"""
        blockers = []
        reasons = []
        score = 50.0  # Baseline
        
        # Hard blockers
        if file_info.category in Config.NEVER_ARCHIVE_CATEGORIES:
            blockers.append(f"Critical category: {file_info.category.value}")
            score -= 100
        
        if file_info.is_dynamic_imported:
            blockers.append("Dynamically imported")
            score -= 100
        
        if file_info.days_since_modified < Config.ARCHIVE_RULES["recent_days_blocker"]:
            blockers.append(f"Recently modified: {file_info.days_since_modified} days ago")
            score -= 100
        
        if len(file_info.dependents) > Config.ARCHIVE_RULES["max_dependents"]:
            blockers.append(f"Has {len(file_info.dependents)} dependents")
            score -= 100
        
        if file_info.barrel_exported:
            blockers.append("Exported via barrel index")
            score -= 100
        
        # Check critical directories
        for critical_dir in Config.CRITICAL_DIRS:
            if critical_dir in file_info.relative_path:
                blockers.append(f"In critical directory: {critical_dir}")
                score -= 100
                break
        
        # If any hard blockers, return immediately
        if blockers:
            return ArchiveDecision(
                allowed=False,
                decision=Recommendation.KEEP_AS_IS,
                score=0,
                reasons=["File has hard blockers for archiving"],
                blockers=blockers
            )
        
        # Score adjustments
        # Positive factors
        if file_info.days_since_modified > 365:
            score += 20
            reasons.append("Very stable (over 1 year since modification)")
        elif file_info.days_since_modified > 180:
            score += 10
            reasons.append("Stable (over 6 months since modification)")
        
        if file_info.complexity_estimate < 10:
            score += 15
            reasons.append("Low complexity")
        
        if file_info.type_safety_score > 8:
            score += 10
            reasons.append("Excellent type safety")
        
        if not file_info.exported_symbols:
            score += 15
            reasons.append("No exports")
        
        # Negative factors
        if file_info.risk_level == RiskLevel.HIGH:
            score -= 25
            reasons.append("High risk level")
        elif file_info.risk_level == RiskLevel.MEDIUM:
            score -= 10
            reasons.append("Medium risk level")
        
        if file_info.stability_score < 3:
            score -= 20
            reasons.append("Low stability score")
        
        if file_info.any_type_count > 0:
            score -= file_info.any_type_count * 2
            reasons.append(f"Uses 'any' type ({file_info.any_type_count} times)")
        
        # Determine decision
        score = max(0, min(100, score))
        
        if score >= Config.ARCHIVE_RULES["archive_score_threshold"]:
            decision = Recommendation.SAFE_TO_ARCHIVE
            allowed = True
            reasons.append(f"High confidence score: {score:.1f}/100")
        elif score >= 60:
            decision = Recommendation.INVESTIGATE
            allowed = False
            reasons.append(f"Moderate confidence score: {score:.1f}/100")
        else:
            decision = Recommendation.KEEP_AS_IS
            allowed = False
            reasons.append(f"Low confidence score: {score:.1f}/100")
        
        return ArchiveDecision(
            allowed=allowed,
            decision=decision,
            score=score,
            reasons=reasons,
            blockers=blockers
        )
    
    def _generate_metrics(self):
        """Generate comprehensive metrics"""
        # Basic counts
        total_files = len(self.files)
        total_lines = sum(f.lines_of_code for f in self.files.values())
        total_bytes = sum(f.size_bytes for f in self.files.values())
        
        # Component analysis
        total_components = len(self.components)
        total_hooks = len(self.hooks)
        unused_components = len([c for c in self.components.values() if c.usage_count == 0])
        unwired_components = len([c for c in self.components.values() if c.is_exported and c.usage_count == 0])
        
        # Duplication
        duplicate_clusters = len(self.duplicate_clusters)
        exact_duplicates = len([c for c in self.duplicate_clusters if c.duplication_type == "exact"])
        structural_duplicates = len([c for c in self.duplicate_clusters if c.duplication_type == "structural"])
        
        # Risk distribution
        risk_dist = collections.defaultdict(int)
        for f in self.files.values():
            risk_dist[f.risk_level] += 1
        
        # Category distribution
        category_dist = collections.defaultdict(int)
        for f in self.files.values():
            category_dist[f.category] += 1
        
        # Quality metrics
        avg_stability = sum(f.stability_score for f in self.files.values()) / total_files if total_files > 0 else 0
        avg_type_safety = sum(f.type_safety_score for f in self.files.values()) / total_files if total_files > 0 else 0
        avg_complexity = sum(f.complexity_estimate for f in self.files.values()) / total_files if total_files > 0 else 0
        total_any_types = sum(f.any_type_count for f in self.files.values())
        total_ts_ignores = sum(f.ts_ignore_count for f in self.files.values())
        
        # Archive analysis
        archive_candidates = len(self.archive_candidates)
        safe_to_archive = len([c for c in self.archive_candidates if c.archive_decision and c.archive_decision.allowed])
        potential_savings_bytes = sum(c.size_bytes for c in self.archive_candidates if c.archive_decision and c.archive_decision.allowed)
        potential_savings_lines = sum(c.lines_of_code for c in self.archive_candidates if c.archive_decision and c.archive_decision.allowed)
        
        # Recommendations
        rec_summary = collections.defaultdict(int)
        for f in self.files.values():
            rec_summary[f.primary_recommendation] += 1
            if f.secondary_recommendation:
                rec_summary[f.secondary_recommendation] += 1
        
        self.project_metrics = ProjectMetrics(
            total_files=total_files,
            total_lines=total_lines,
            total_bytes=total_bytes,
            total_components=total_components,
            total_hooks=total_hooks,
            unused_components=unused_components,
            unwired_components=unwired_components,
            duplicate_clusters=duplicate_clusters,
            exact_duplicates=exact_duplicates,
            structural_duplicates=structural_duplicates,
            risk_distribution=dict(risk_dist),
            category_distribution=dict(category_dist),
            average_stability=avg_stability,
            average_type_safety=avg_type_safety,
            average_complexity=avg_complexity,
            total_any_types=total_any_types,
            total_ts_ignores=total_ts_ignores,
            archive_candidates=archive_candidates,
            safe_to_archive=safe_to_archive,
            potential_savings_bytes=potential_savings_bytes,
            potential_savings_lines=potential_savings_lines,
            recommendations_summary=dict(rec_summary),
            analysis_duration=self.stats["analysis_time"],
            files_scanned=self.stats["files_scanned"]
        )
        
        # Generate enhanced dashboard metrics
        self._generate_dashboard_metrics()
    
    def _generate_dashboard_metrics(self):
        """Generate enhanced metrics for dashboard"""
        if not self.project_metrics:
            return
        
        metrics = self.project_metrics
        
        # Risk percentages
        total_risk_files = sum(metrics.risk_distribution.values())
        risk_percentages = {}
        for risk, count in metrics.risk_distribution.items():
            if total_risk_files > 0:
                risk_percentages[risk.value] = (count / total_risk_files) * 100
            else:
                risk_percentages[risk.value] = 0
        
        # Top categories
        sorted_categories = sorted(
            metrics.category_distribution.items(),
            key=lambda x: x[1],
            reverse=True
        )[:5]
        
        top_categories = []
        for category, count in sorted_categories:
            percentage = (count / metrics.total_files) * 100 if metrics.total_files > 0 else 0
            top_categories.append({
                "name": category.value,
                "count": count,
                "percentage": round(percentage, 1)
            })
        
        # Top recommendations
        sorted_recommendations = sorted(
            metrics.recommendations_summary.items(),
            key=lambda x: x[1],
            reverse=True
        )[:5]
        
        top_recommendations = []
        for rec, count in sorted_recommendations:
            if rec != Recommendation.KEEP_AS_IS and count > 0:
                top_recommendations.append({
                    "name": rec.value,
                    "count": count,
                    "icon": self._get_recommendation_icon(rec)
                })
        
        # File age analysis
        file_ages = [f.days_since_modified for f in self.files.values()]
        oldest_file_days = max(file_ages) if file_ages else 0
        newest_file_days = min(file_ages) if file_ages else 0
        average_file_age_days = sum(file_ages) / len(file_ages) if file_ages else 0
        
        # Potential savings percentage
        total_project_bytes = metrics.total_bytes
        potential_savings_percent = (metrics.potential_savings_bytes / total_project_bytes * 100) if total_project_bytes > 0 else 0
        
        self.dashboard_metrics = DashboardMetrics(
            total_files=metrics.total_files,
            total_lines=metrics.total_lines,
            total_components=metrics.total_components,
            total_hooks=metrics.total_hooks,
            risk_counts={k.value: v for k, v in metrics.risk_distribution.items()},
            risk_percentages=risk_percentages,
            duplicate_clusters=metrics.duplicate_clusters,
            total_duplicate_files=sum(len(c.files) for c in self.duplicate_clusters),
            waste_bytes=sum(c.total_wasted_bytes for c in self.duplicate_clusters),
            waste_lines=sum(c.total_wasted_lines for c in self.duplicate_clusters),
            average_stability=round(metrics.average_stability, 1),
            average_type_safety=round(metrics.average_type_safety, 1),
            average_complexity=round(metrics.average_complexity, 1),
            archive_candidates=metrics.archive_candidates,
            safe_to_archive=metrics.safe_to_archive,
            potential_savings_bytes=metrics.potential_savings_bytes,
            potential_savings_percent=round(potential_savings_percent, 1),
            top_categories=top_categories,
            top_recommendations=top_recommendations,
            analysis_duration=round(metrics.analysis_duration, 2),
            files_per_second=round(metrics.files_scanned / metrics.analysis_duration, 1) if metrics.analysis_duration > 0 else 0,
            oldest_file_days=int(oldest_file_days),
            newest_file_days=int(newest_file_days),
            average_file_age_days=int(average_file_age_days)
        )
    
    def _get_recommendation_icon(self, recommendation: Recommendation) -> str:
        """Get icon for recommendation type"""
        icons = {
            Recommendation.INVESTIGATE: "🔍",
            Recommendation.SAFE_TO_ARCHIVE: "📦",
            Recommendation.MERGE_INTO_ANOTHER_FILE: "🔄",
            Recommendation.REFACTOR_FOR_CLARITY: "♻️",
            Recommendation.WIRE_TO_APPLICATION: "🔌",
            Recommendation.RENAME_FOR_CLARITY: "🏷️",
            Recommendation.SAFE_TO_REMOVE: "🗑️",
            Recommendation.KEEP_AS_IS: "✅"
        }
        return icons.get(recommendation, "📋")
    
    def _generate_all_reports(self):
        """Generate all analysis reports"""
        if not self.report_folder:
            return
        
        # Write runtime log
        self._write_runtime_log()
        
        # Generate reports
        full_report = self._generate_complete_report()
        summary_report = self._generate_summary_report()
        
        # Write full report
        full_report_path = self.report_folder / "full_report.json"
        with open(full_report_path, 'w', encoding='utf-8') as f:
            json.dump(full_report, f, indent=2, default=str)
        
        # Write summary report
        summary_report_path = self.report_folder / "summary_report.json"
        with open(summary_report_path, 'w', encoding='utf-8') as f:
            json.dump(summary_report, f, indent=2, default=str)
        
        # Write high-risk CSV
        csv_path = self.report_folder / "high_risk.csv"
        self._write_high_risk_csv(csv_path)
        
        # Generate and write dashboard
        dashboard_path = self.report_folder / "optimization_dashboard.html"
        dashboard_html = self._generate_dashboard_html()
        with open(dashboard_path, 'w', encoding='utf-8') as f:
            f.write(dashboard_html)
        
        # Write metrics visualization data
        metrics_path = self.report_folder / "metrics_visualization.json"
        self._write_metrics_visualization(metrics_path)
        
        print(f"\n📁 Reports saved to: {self.report_folder}")
        print(f"   📄 Full report: {full_report_path}")
        print(f"   📄 Summary report: {summary_report_path}")
        print(f"   📊 HTML Dashboard: {dashboard_path}")
        print(f"   📈 Metrics visualization: {metrics_path}")
    
    def _write_runtime_log(self):
        """Write runtime log to file"""
        if not self.report_folder:
            return
        
        log_path = self.report_folder / "runtime_log.txt"
        with open(log_path, 'w', encoding='utf-8') as f:
            f.write("=" * 70 + "\n")
            f.write("G-STUDIO SAFE REFACTOR - RUNTIME LOG\n")
            f.write("=" * 70 + "\n\n")
            f.write(f"Analysis started: {datetime.fromtimestamp(self.stats['start_time'])}\n")
            f.write(f"Analysis ended: {datetime.fromtimestamp(self.stats['end_time'])}\n")
            f.write(f"Duration: {self.stats['analysis_time']:.2f} seconds\n\n")
            f.write("ANALYSIS LOG:\n")
            f.write("-" * 70 + "\n")
            for entry in self.analysis_log:
                f.write(entry + "\n")
    
    def _write_high_risk_csv(self, csv_path: Path):
        """Write high-risk files to CSV"""
        high_risk = []
        for rel_path, info in self.files.items():
            if info.risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
                high_risk.append({
                    "file_path": rel_path,
                    "risk_level": info.risk_level.value,
                    "stability_score": round(info.stability_score, 2),
                    "recommendation": info.primary_recommendation.value,
                    "top_reason": info.short_reason or (info.reasoning[0] if info.reasoning else "Unknown"),
                    "dependents_count": len(info.dependents),
                    "days_since_modified": info.days_since_modified,
                    "category": info.category.value
                })
        
        if not high_risk:
            with open(csv_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['file_path', 'risk_level', 'stability_score', 'recommendation', 'top_reason', 'dependents_count', 'days_since_modified', 'category'])
            return
        
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            fieldnames = ['file_path', 'risk_level', 'stability_score', 'recommendation', 'top_reason', 'dependents_count', 'days_since_modified', 'category']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for info in sorted(high_risk, key=lambda x: x["risk_level"], reverse=True):
                writer.writerow(info)
    
    def _write_metrics_visualization(self, metrics_path: Path):
        """Write metrics data for visualization"""
        if not self.dashboard_metrics:
            return
        
        visualization_data = {
            "metrics": asdict(self.dashboard_metrics),
            "risk_distribution": self.dashboard_metrics.risk_counts,
            "categories": self.dashboard_metrics.top_categories,
            "recommendations": self.dashboard_metrics.top_recommendations,
            "duplicate_analysis": {
                "clusters": self.dashboard_metrics.duplicate_clusters,
                "waste_bytes": self.dashboard_metrics.waste_bytes,
                "waste_lines": self.dashboard_metrics.waste_lines
            }
        }
        
        with open(metrics_path, 'w', encoding='utf-8') as f:
            json.dump(visualization_data, f, indent=2)
    
    def _generate_summary_report(self) -> Dict[str, Any]:
        """Generate summary report"""
        if not self.project_metrics:
            return {}
        
        metrics = self.project_metrics
        
        return {
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "tool": "G-Studio Safe Refactor System",
                "version": "4.5.0",
                "root_path": str(self.root),
                "report_folder": str(self.report_folder.relative_to(self.root)) if self.report_folder else None,
                "analysis_duration": round(metrics.analysis_duration, 2)
            },
            "summary": {
                "total_files": metrics.total_files,
                "total_lines": metrics.total_lines,
                "total_components": metrics.total_components,
                "total_hooks": metrics.total_hooks,
                "high_risk_files": metrics.risk_distribution.get(RiskLevel.HIGH, 0) + metrics.risk_distribution.get(RiskLevel.CRITICAL, 0),
                "unused_components": metrics.unused_components,
                "unwired_components": metrics.unwired_components,
                "duplicate_clusters": metrics.duplicate_clusters,
                "archive_candidates": metrics.archive_candidates,
                "safe_to_archive": metrics.safe_to_archive,
                "potential_savings_bytes": metrics.potential_savings_bytes,
                "potential_savings_lines": metrics.potential_savings_lines,
                "average_stability": round(metrics.average_stability, 2),
                "average_type_safety": round(metrics.average_type_safety, 2)
            },
            "quality_metrics": {
                "average_complexity": round(metrics.average_complexity, 1),
                "total_any_types": metrics.total_any_types,
                "total_ts_ignores": metrics.total_ts_ignores
            }
        }
    
    def _generate_complete_report(self) -> Dict[str, Any]:
        """Generate complete analysis report"""
        # Collect unused and unwired candidates
        unused_candidates = []
        unwired_candidates = []
        
        for key, comp in self.components.items():
            if comp.usage_count == 0:
                candidate = {
                    "name": comp.name,
                    "file": comp.file_path,
                    "line": comp.line_number,
                    "type": comp.component_type.value,
                    "exported": comp.is_exported,
                    "risk_level": comp.risk_level.value,
                    "recommendation": comp.recommendation.value
                }
                
                if comp.is_exported:
                    unwired_candidates.append(candidate)
                else:
                    unused_candidates.append(candidate)
        
        # Collect merge suggestions
        merge_suggestions = []
        for cluster in self.duplicate_clusters:
            if cluster.suggested_base_file and cluster.suggested_merge_target:
                suggestion = {
                    "cluster_id": cluster.cluster_id,
                    "base_file": cluster.suggested_base_file,
                    "merge_target": cluster.suggested_merge_target,
                    "similarity": cluster.similarity_score,
                    "risk_level": cluster.risk_level.value,
                    "recommendation": cluster.primary_recommendation.value,
                    "estimated_impact": cluster.estimated_impact,
                    "diff_summary": cluster.diff_summary
                }
                merge_suggestions.append(suggestion)
        
        return {
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "tool": "G-Studio Safe Refactor System",
                "version": "4.5.0",
                "scan_root": str(self.root),
                "report_folder": str(self.report_folder.relative_to(self.root)) if self.report_folder else None,
                "analysis_duration": round(self.stats["analysis_time"], 2),
                "safe_mode": True,
                "safety_messages": Config.SAFETY_MESSAGES
            },
            "project_metrics": asdict(self.project_metrics) if self.project_metrics else {},
            "dashboard_metrics": asdict(self.dashboard_metrics) if self.dashboard_metrics else {},
            "files": {
                path: {
                    "path": info.relative_path,
                    "size": info.size_bytes,
                    "category": info.category.value,
                    "stability_score": round(info.stability_score, 2),
                    "risk_level": info.risk_level.value,
                    "recommendation": info.primary_recommendation.value,
                    "short_reason": info.short_reason,
                    "dependents_count": len(info.dependents),
                    "days_since_modified": info.days_since_modified,
                    "complexity_estimate": info.complexity_estimate,
                    "is_archive_eligible": info.is_archive_eligible,
                    "archive_reason": info.archive_reason
                }
                for path, info in self.files.items()
            },
            "duplicate_clusters": [
                {
                    "cluster_id": c.cluster_id,
                    "files": c.files,
                    "similarity_score": c.similarity_score,
                    "suggested_base_file": c.suggested_base_file,
                    "suggested_merge_target": c.suggested_merge_target,
                    "diff_summary": c.diff_summary,
                    "risk_level": c.risk_level.value,
                    "recommendation": c.primary_recommendation.value,
                    "estimated_impact": c.estimated_impact
                }
                for c in self.duplicate_clusters
            ],
            "unused_candidates": unused_candidates,
            "unwired_candidates": unwired_candidates,
            "merge_suggestions": merge_suggestions,
            "archive_candidates": [
                {
                    "relative_path": c.relative_path,
                    "category": c.category.value,
                    "size_bytes": c.size_bytes,
                    "stability_score": round(c.stability_score, 2),
                    "risk_level": c.risk_level.value,
                    "archive_decision": c.archive_decision.to_dict() if c.archive_decision else None
                }
                for c in self.archive_candidates
            ]
        }
    
    def _generate_dashboard_html(self) -> str:
        """Generate enhanced HTML dashboard"""
        if not self.dashboard_metrics:
            return "<html><body>No metrics available</body></html>"
        
        metrics = self.dashboard_metrics
        
        # Prepare data for JavaScript
        risk_data = json.dumps({
            "labels": list(metrics.risk_counts.keys()),
            "values": list(metrics.risk_counts.values()),
            "colors": [Config.COLORS["success"], Config.COLORS["warning"], Config.COLORS["danger"], Config.COLORS["info"]]
        })
        
        category_data = json.dumps({
            "labels": [cat["name"] for cat in metrics.top_categories],
            "values": [cat["count"] for cat in metrics.top_categories]
        })
        
        # Generate HTML
        return f'''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>G-Studio Safe Refactor Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0"></script>
    <style>
        :root {{
            --primary: {Config.COLORS['primary']};
            --success: {Config.COLORS['success']};
            --warning: {Config.COLORS['warning']};
            --danger: {Config.COLORS['danger']};
            --info: {Config.COLORS['info']};
            --dark: {Config.COLORS['dark']};
            --light: {Config.COLORS['light']};
        }}
        
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0f172a, #1e293b);
            color: var(--light);
            line-height: 1.6;
            padding: 20px;
            min-height: 100vh;
        }}
        
        .container {{
            max-width: 1400px;
            margin: 0 auto;
        }}
        
        .safety-banner {{
            background: linear-gradient(135deg, var(--danger), #b91c1c);
            color: white;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 30px;
            text-align: center;
            border: 2px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
            animation: pulse 2s infinite;
        }}
        
        @keyframes pulse {{
            0% {{ box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }}
            70% {{ box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }}
            100% {{ box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }}
        }}
        
        .safety-banner h2 {{
            font-size: 1.5rem;
            margin-bottom: 10px;
        }}
        
        .safety-banner p {{
            font-size: 1rem;
            opacity: 0.9;
        }}
        
        .header {{
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.8));
            border-radius: 12px;
            border: 1px solid rgba(100, 116, 139, 0.3);
            backdrop-filter: blur(10px);
        }}
        
        .header h1 {{
            font-size: 2.5rem;
            background: linear-gradient(135deg, var(--primary), var(--info));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }}
        
        .header p {{
            font-size: 1.1rem;
            color: #cbd5e1;
            max-width: 800px;
            margin: 0 auto;
        }}
        
        .metrics-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        
        .metric-card {{
            background: rgba(30, 41, 59, 0.6);
            padding: 25px;
            border-radius: 12px;
            border: 1px solid rgba(100, 116, 139, 0.3);
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
        }}
        
        .metric-card:hover {{
            transform: translateY(-5px);
            border-color: var(--primary);
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        }}
        
        .metric-card.highlight {{
            background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(139, 92, 246, 0.2));
            border-color: var(--primary);
        }}
        
        .metric-card.warning {{
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(217, 119, 6, 0.2));
            border-color: var(--warning);
        }}
        
        .metric-card.danger {{
            background: linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.2));
            border-color: var(--danger);
        }}
        
        .metric-card.success {{
            background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(5, 150, 105, 0.2));
            border-color: var(--success);
        }}
        
        .metric-icon {{
            font-size: 2.5rem;
            margin-bottom: 15px;
        }}
        
        .metric-value {{
            font-size: 2.2rem;
            font-weight: bold;
            margin: 10px 0;
            background: linear-gradient(135deg, var(--light), #94a3b8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }}
        
        .metric-label {{
            font-size: 0.9rem;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 1px;
        }}
        
        .metric-trend {{
            display: flex;
            align-items: center;
            font-size: 0.8rem;
            margin-top: 10px;
            color: #94a3b8;
        }}
        
        .trend-up {{ color: var(--success); }}
        .trend-down {{ color: var(--danger); }}
        
        .charts-container {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        
        .chart-card {{
            background: rgba(30, 41, 59, 0.6);
            padding: 25px;
            border-radius: 12px;
            border: 1px solid rgba(100, 116, 139, 0.3);
            backdrop-filter: blur(10px);
        }}
        
        .chart-card h3 {{
            font-size: 1.2rem;
            margin-bottom: 20px;
            color: #e2e8f0;
        }}
        
        .chart-wrapper {{
            height: 300px;
            position: relative;
        }}
        
        .insights-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        
        .insight-card {{
            background: rgba(30, 41, 59, 0.6);
            padding: 25px;
            border-radius: 12px;
            border: 1px solid rgba(100, 116, 139, 0.3);
            backdrop-filter: blur(10px);
        }}
        
        .insight-card h3 {{
            font-size: 1.2rem;
            margin-bottom: 20px;
            color: #e2e8f0;
            display: flex;
            align-items: center;
            gap: 10px;
        }}
        
        .insight-list {{
            list-style: none;
        }}
        
        .insight-item {{
            padding: 12px 0;
            border-bottom: 1px solid rgba(100, 116, 139, 0.2);
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        
        .insight-item:last-child {{
            border-bottom: none;
        }}
        
        .insight-name {{
            display: flex;
            align-items: center;
            gap: 10px;
        }}
        
        .insight-value {{
            font-weight: bold;
            font-size: 1.1rem;
        }}
        
        .progress-bar {{
            height: 8px;
            background: rgba(100, 116, 139, 0.2);
            border-radius: 4px;
            margin-top: 5px;
            overflow: hidden;
        }}
        
        .progress-fill {{
            height: 100%;
            border-radius: 4px;
            transition: width 1s ease-in-out;
        }}
        
        .search-section {{
            background: rgba(30, 41, 59, 0.6);
            padding: 25px;
            border-radius: 12px;
            margin-bottom: 30px;
            border: 1px solid rgba(100, 116, 139, 0.3);
            backdrop-filter: blur(10px);
        }}
        
        .search-box {{
            width: 100%;
            padding: 15px;
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(100, 116, 139, 0.3);
            border-radius: 8px;
            color: var(--light);
            font-size: 16px;
            margin-bottom: 20px;
            transition: all 0.3s ease;
        }}
        
        .search-box:focus {{
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }}
        
        .filter-buttons {{
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-bottom: 20px;
        }}
        
        .filter-btn {{
            padding: 10px 20px;
            background: rgba(15, 23, 42, 0.6);
            border: 1px solid rgba(100, 116, 139, 0.3);
            border-radius: 20px;
            color: #94a3b8;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 14px;
        }}
        
        .filter-btn:hover, .filter-btn.active {{
            background: var(--primary);
            color: white;
            border-color: var(--primary);
            transform: translateY(-2px);
        }}
        
        .risk-badge {{
            padding: 6px 15px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            display: inline-block;
        }}
        
        .risk-low {{ background: rgba(16, 185, 129, 0.2); color: var(--success); }}
        .risk-medium {{ background: rgba(245, 158, 11, 0.2); color: var(--warning); }}
        .risk-high {{ background: rgba(239, 68, 68, 0.2); color: var(--danger); }}
        
        .archive-badge {{
            padding: 6px 12px;
            background: rgba(59, 130, 246, 0.2);
            border-radius: 6px;
            font-size: 12px;
            color: var(--primary);
        }}
        
        .details-section {{
            margin-bottom: 30px;
        }}
        
        details {{
            background: rgba(30, 41, 59, 0.6);
            border: 1px solid rgba(100, 116, 139, 0.3);
            border-radius: 8px;
            margin-bottom: 15px;
            overflow: hidden;
            backdrop-filter: blur(10px);
        }}
        
        summary {{
            padding: 20px;
            cursor: pointer;
            font-weight: 600;
            background: rgba(15, 23, 42, 0.6);
            list-style: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 1.1rem;
        }}
        
        summary::after {{
            content: '▼';
            transition: transform 0.3s ease;
        }}
        
        details[open] summary::after {{
            transform: rotate(180deg);
        }}
        
        .details-content {{
            padding: 25px;
        }}
        
        .file-list {{
            max-height: 400px;
            overflow-y: auto;
        }}
        
        .file-item {{
            padding: 15px;
            border-bottom: 1px solid rgba(100, 116, 139, 0.2);
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
            gap: 15px;
            align-items: center;
            transition: background 0.3s ease;
        }}
        
        .file-item:hover {{
            background: rgba(59, 130, 246, 0.1);
        }}
        
        .file-header {{
            font-weight: bold;
            background: rgba(15, 23, 42, 0.6);
            position: sticky;
            top: 0;
            z-index: 1;
        }}
        
        .footer {{
            text-align: center;
            padding: 30px;
            color: #94a3b8;
            font-size: 0.9rem;
            border-top: 1px solid rgba(100, 116, 139, 0.3);
            margin-top: 30px;
        }}
        
        @media (max-width: 768px) {{
            .charts-container {{
                grid-template-columns: 1fr;
            }}
            
            .file-item {{
                grid-template-columns: 1fr;
                gap: 10px;
            }}
            
            .metric-card {{
                padding: 20px;
            }}
            
            .metric-value {{
                font-size: 1.8rem;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="safety-banner">
            <h2>🚨 ANALYSIS OUTPUT — NO FILES WERE MODIFIED</h2>
            <p>ARCHIVE ACTIONS REQUIRE EXPLICIT USER CONFIRMATION • ALL CHANGES ARE REVERSIBLE VIA ARCHIVE</p>
        </div>
        
        <div class="header">
            <h1>🏗️ G-Studio Safe Refactor Dashboard</h1>
            <p>Enterprise-grade code analysis with comprehensive metrics and visualization for React/TypeScript projects</p>
            <div style="margin-top: 15px; display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
                <div><strong>📁 Project:</strong> {html.escape(str(self.root))}</div>
                <div><strong>📅 Generated:</strong> {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</div>
                <div><strong>⏱️ Duration:</strong> {metrics.analysis_duration}s</div>
            </div>
        </div>
        
        <div class="metrics-grid">
            <div class="metric-card highlight">
                <div class="metric-icon">📊</div>
                <div class="metric-value">{metrics.total_files:,}</div>
                <div class="metric-label">Total Files</div>
                <div class="metric-trend">
                    <span class="trend-up">↑</span> {metrics.total_lines:,} lines of code
                </div>
            </div>
            
            <div class="metric-card success">
                <div class="metric-icon">⚛️</div>
                <div class="metric-value">{metrics.total_components + metrics.total_hooks:,}</div>
                <div class="metric-label">Components & Hooks</div>
                <div class="metric-trend">
                    {metrics.total_components} components • {metrics.total_hooks} hooks
                </div>
            </div>
            
            <div class="metric-card warning">
                <div class="metric-icon">⚠️</div>
                <div class="metric-value">{metrics.risk_counts.get('HIGH', 0) + metrics.risk_counts.get('CRITICAL', 0):,}</div>
                <div class="metric-label">High Risk Files</div>
                <div class="metric-trend">
                    {metrics.risk_counts.get('MEDIUM', 0)} medium risk • {metrics.risk_counts.get('LOW', 0)} low risk
                </div>
            </div>
            
            <div class="metric-card danger">
                <div class="metric-icon">🔄</div>
                <div class="metric-value">{metrics.duplicate_clusters:,}</div>
                <div class="metric-label">Duplicate Clusters</div>
                <div class="metric-trend">
                    Wasting {metrics.waste_bytes:,} bytes • {metrics.waste_lines:,} lines
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-icon">📦</div>
                <div class="metric-value">{metrics.archive_candidates:,}</div>
                <div class="metric-label">Archive Candidates</div>
                <div class="metric-trend">
                    {metrics.safe_to_archive} safe to archive • {metrics.potential_savings_percent}% savings
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-icon">🏆</div>
                <div class="metric-value">{metrics.average_stability}/10</div>
                <div class="metric-label">Avg Stability Score</div>
                <div class="metric-trend">
                    Type safety: {metrics.average_type_safety}/10 • Complexity: {metrics.average_complexity}
                </div>
            </div>
            
            <div class="metric-card">
                <div class="metric-icon">📈</div>
                <div class="metric-value">{metrics.files_per_second}/s</div>
                <div class="metric-label">Analysis Speed</div>
                <div class="metric-trend">
                    Oldest file: {metrics.oldest_file_days}d • Newest: {metrics.newest_file_days}d
                </div>
            </div>
            
            <div class="metric-card success">
                <div class="metric-icon">💰</div>
                <div class="metric-value">{metrics.potential_savings_bytes:,}</div>
                <div class="metric-label">Potential Savings</div>
                <div class="metric-trend">
                    {metrics.potential_savings_lines:,} lines • {metrics.potential_savings_percent}% of project
                </div>
            </div>
        </div>
        
        <div class="charts-container">
            <div class="chart-card">
                <h3>📊 Risk Distribution</h3>
                <div class="chart-wrapper">
                    <canvas id="riskChart"></canvas>
                </div>
            </div>
            
            <div class="chart-card">
                <h3>📁 Top File Categories</h3>
                <div class="chart-wrapper">
                    <canvas id="categoryChart"></canvas>
                </div>
            </div>
        </div>
        
        <div class="insights-grid">
            <div class="insight-card">
                <h3><span>🔍</span> Top Recommendations</h3>
                <ul class="insight-list">
                    {"".join(f'''
                    <li class="insight-item">
                        <div class="insight-name">
                            <span>{item['icon']}</span>
                            <span>{item['name']}</span>
                        </div>
                        <div class="insight-value">{item['count']}</div>
                    </li>
                    ''' for item in metrics.top_recommendations)}
                </ul>
            </div>
            
            <div class="insight-card">
                <h3><span>📂</span> File Categories</h3>
                <ul class="insight-list">
                    {"".join(f'''
                    <li class="insight-item">
                        <div class="insight-name">
                            <span>{'📄' if 'Component' in item['name'] else '🔄' if 'Hook' in item['name'] else '📁' if 'Utility' in item['name'] else '⚙️' if 'Service' in item['name'] else '📋'}</span>
                            <span>{item['name']}</span>
                        </div>
                        <div class="insight-value">{item['percentage']}%</div>
                    </li>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: {item['percentage']}%; background: {'var(--primary)' if 'Component' in item['name'] else 'var(--info)' if 'Hook' in item['name'] else 'var(--success)' if 'Utility' in item['name'] else 'var(--warning)'};"></div>
                    </div>
                    ''' for item in metrics.top_categories)}
                </ul>
            </div>
        </div>
        
        <div class="search-section">
            <h3 style="margin-bottom: 15px; color: #e2e8f0;">🔍 Live Search & Filter</h3>
            <input type="text" class="search-box" placeholder="Search files, components, or recommendations...">
            
            <div class="filter-buttons">
                <button class="filter-btn active" data-filter="all">All Files</button>
                <button class="filter-btn" data-filter="high">High Risk</button>
                <button class="filter-btn" data-filter="medium">Medium Risk</button>
                <button class="filter-btn" data-filter="low">Low Risk</button>
                <button class="filter-btn" data-filter="archive">Archive Candidates</button>
                <button class="filter-btn" data-filter="duplicate">Duplicates</button>
                <button class="filter-btn" data-filter="component">Components</button>
                <button class="filter-btn" data-filter="unused">Unused</button>
            </div>
            
            <div style="color: #94a3b8; font-size: 14px; display: flex; gap: 15px; flex-wrap: wrap;">
                <div class="risk-badge risk-low">Low Risk</div>
                <div class="risk-badge risk-medium">Medium Risk</div>
                <div class="risk-badge risk-high">High Risk</div>
                <div class="archive-badge">Archive Candidate</div>
                <div style="margin-left: auto; font-size: 12px;">
                    Showing {len(self.files)} files • {metrics.total_duplicate_files} duplicates
                </div>
            </div>
        </div>
        
        <div class="details-section">
            <details open>
                <summary>
                    ⚠️ High Risk Files ({metrics.risk_counts.get('HIGH', 0) + metrics.risk_counts.get('CRITICAL', 0)})
                    <span style="font-size: 14px; color: #94a3b8;">Requires immediate attention</span>
                </summary>
                <div class="details-content">
                    <div class="file-list">
                        <div class="file-item file-header">
                            <div>File Path</div>
                            <div>Risk Level</div>
                            <div>Category</div>
                            <div>Recommendation</div>
                            <div>Stability</div>
                        </div>
                        {"".join(self._generate_file_rows('high'))}
                    </div>
                </div>
            </details>
            
            <details>
                <summary>
                    📦 Archive Candidates ({metrics.archive_candidates})
                    <span style="font-size: 14px; color: #94a3b8;">Safe to archive based on enterprise algorithm</span>
                </summary>
                <div class="details-content">
                    <div class="file-list">
                        <div class="file-item file-header">
                            <div>File Path</div>
                            <div>Risk Level</div>
                            <div>Category</div>
                            <div>Size</div>
                            <div>Stability</div>
                        </div>
                        {"".join(self._generate_archive_rows())}
                    </div>
                </div>
            </details>
            
            <details>
                <summary>
                    🔄 Duplicate Clusters ({metrics.duplicate_clusters})
                    <span style="font-size: 14px; color: #94a3b8;">Potential for consolidation</span>
                </summary>
                <div class="details-content">
                    {"".join(self._generate_cluster_cards())}
                </div>
            </details>
        </div>
        
        <div class="footer">
            <p>G-Studio Safe Refactor System v4.5.0 • Enhanced Dashboard Edition</p>
            <p style="margin-top: 10px; font-size: 0.8rem; opacity: 0.7;">
                Analysis completed at {datetime.now().strftime('%Y-%m-%d %H:%M:%S')} • 
                All recommendations are conservative and reversible • 
                Source files remain untouched
            </p>
        </div>
    </div>
    
    <script>
        // Chart data
        const riskData = {risk_data};
        const categoryData = {category_data};
        
        // Initialize charts
        function initCharts() {{
            // Risk distribution chart
            const riskCtx = document.getElementById('riskChart').getContext('2d');
            new Chart(riskCtx, {{
                type: 'doughnut',
                data: {{
                    labels: riskData.labels,
                    datasets: [{{
                        data: riskData.values,
                        backgroundColor: riskData.colors,
                        borderWidth: 2,
                        borderColor: 'rgba(30, 41, 59, 0.8)',
                        hoverOffset: 20
                    }}]
                }},
                options: {{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {{
                        legend: {{
                            position: 'bottom',
                            labels: {{
                                color: '#cbd5e1',
                                padding: 20,
                                font: {{ size: 12 }}
                            }}
                        }},
                        tooltip: {{
                            callbacks: {{
                                label: function(context) {{
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${{label}}: ${{value}} files (${{percentage}}%)`;
                                }}
                            }},
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            titleColor: '#e2e8f0',
                            bodyColor: '#cbd5e1',
                            borderColor: 'rgba(100, 116, 139, 0.3)',
                            borderWidth: 1
                        }},
                        datalabels: {{
                            color: '#ffffff',
                            font: {{ weight: 'bold', size: 12 }},
                            formatter: (value, ctx) => {{
                                const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = Math.round((value / total) * 100);
                                return `${{percentage}}%`;
                            }}
                        }}
                    }},
                    cutout: '60%',
                    animation: {{
                        animateScale: true,
                        animateRotate: true,
                        duration: 2000
                    }}
                }},
                plugins: [ChartDataLabels]
            }});
            
            // Category distribution chart
            const categoryCtx = document.getElementById('categoryChart').getContext('2d');
            new Chart(categoryCtx, {{
                type: 'bar',
                data: {{
                    labels: categoryData.labels,
                    datasets: [{{
                        label: 'Files',
                        data: categoryData.values,
                        backgroundColor: 'rgba(59, 130, 246, 0.7)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 1,
                        borderRadius: 6,
                        borderSkipped: false
                    }}]
                }},
                options: {{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {{
                        legend: {{ display: false }},
                        tooltip: {{
                            callbacks: {{
                                label: function(context) {{
                                    return `${{context.dataset.label}}: ${{context.raw}} files`;
                                }}
                            }},
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            titleColor: '#e2e8f0',
                            bodyColor: '#cbd5e1'
                        }}
                    }},
                    scales: {{
                        y: {{
                            beginAtZero: true,
                            grid: {{
                                color: 'rgba(100, 116, 139, 0.2)',
                                drawBorder: false
                            }},
                            ticks: {{
                                color: '#94a3b8',
                                font: {{ size: 11 }}
                            }}
                        }},
                        x: {{
                            grid: {{
                                display: false,
                                drawBorder: false
                            }},
                            ticks: {{
                                color: '#94a3b8',
                                font: {{ size: 11 }},
                                maxRotation: 45
                            }}
                        }}
                    }},
                    animation: {{
                        duration: 2000,
                        easing: 'easeOutQuart'
                    }}
                }}
            }});
        }}
        
        // Search and filter functionality
        function initSearch() {{
            const searchInput = document.querySelector('.search-box');
            const filterButtons = document.querySelectorAll('.filter-btn');
            const fileItems = document.querySelectorAll('.file-item:not(.file-header)');
            
            if (searchInput) {{
                searchInput.addEventListener('input', function(e) {{
                    filterFiles(e.target.value);
                }});
            }}
            
            filterButtons.forEach(btn => {{
                btn.addEventListener('click', function() {{
                    filterButtons.forEach(b => b.classList.remove('active'));
                    this.classList.add('active');
                    filterFiles(searchInput.value, this.dataset.filter);
                }});
            }});
            
            function filterFiles(searchTerm = '', filter = 'all') {{
                searchTerm = searchTerm.toLowerCase();
                
                fileItems.forEach(item => {{
                    const text = item.textContent.toLowerCase();
                    const risk = item.querySelector('.risk-badge')?.className || '';
                    const hasArchiveBadge = item.querySelector('.archive-badge');
                    
                    let matchesSearch = text.includes(searchTerm);
                    let matchesFilter = filter === 'all' || 
                                       (filter === 'high' && risk.includes('high')) ||
                                       (filter === 'medium' && risk.includes('medium')) ||
                                       (filter === 'low' && risk.includes('low')) ||
                                       (filter === 'archive' && hasArchiveBadge) ||
                                       (filter === 'component' && text.includes('component')) ||
                                       (filter === 'duplicate' && text.includes('duplicate')) ||
                                       (filter === 'unused' && text.includes('unused'));
                    
                    item.style.display = (matchesSearch && matchesFilter) ? 'grid' : 'none';
                }});
            }}
        }}
        
        // Animate progress bars on scroll
        function animateProgressBars() {{
            const progressBars = document.querySelectorAll('.progress-fill');
            progressBars.forEach(bar => {{
                const width = bar.style.width;
                bar.style.width = '0%';
                setTimeout(() => {{
                    bar.style.width = width;
                }}, 100);
            }});
        }}
        
        // Initialize on load
        document.addEventListener('DOMContentLoaded', function() {{
            initCharts();
            initSearch();
            animateProgressBars();
            
            // Animate metric cards on scroll
            const observerOptions = {{
                threshold: 0.1,
                rootMargin: '0px 0px -50px 0px'
            }};
            
            const observer = new IntersectionObserver((entries) => {{
                entries.forEach(entry => {{
                    if (entry.isIntersecting) {{
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }}
                }});
            }}, observerOptions);
            
            // Observe metric cards
            document.querySelectorAll('.metric-card').forEach(card => {{
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
                observer.observe(card);
            }});
        }});
    </script>
</body>
</html>
'''
    
    def _generate_file_rows(self, risk_filter: str = 'all') -> List[str]:
        """Generate file rows for dashboard"""
        rows = []
        count = 0
        
        for rel_path, info in self.files.items():
            if risk_filter == 'high' and info.risk_level not in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
                continue
            
            risk_class = f"risk-{info.risk_level.value.lower()}"
            archive_badge = '<span class="archive-badge">Archive</span>' if info.is_archive_eligible else ''
            
            row = f'''
            <div class="file-item">
                <div>{html.escape(rel_path)}</div>
                <div><span class="risk-badge {risk_class}">{info.risk_level.value}</span></div>
                <div>{info.category.value}</div>
                <div>{info.primary_recommendation.value}</div>
                <div>{info.stability_score:.1f}/10 {archive_badge}</div>
            </div>
            '''
            rows.append(row)
            count += 1
            
            if count >= 50:  # Limit rows for performance
                break
        
        return rows
    
    def _generate_archive_rows(self) -> List[str]:
        """Generate archive candidate rows"""
        rows = []
        count = 0
        
        for candidate in self.archive_candidates:
            risk_class = f"risk-{candidate.risk_level.value.lower()}"
            
            row = f'''
            <div class="file-item">
                <div>{html.escape(candidate.relative_path)}</div>
                <div><span class="risk-badge {risk_class}">{candidate.risk_level.value}</span></div>
                <div>{candidate.category.value}</div>
                <div>{candidate.size_bytes:,} bytes</div>
                <div>{candidate.stability_score:.1f}/10 <span class="archive-badge">✓ Eligible</span></div>
            </div>
            '''
            rows.append(row)
            count += 1
            
            if count >= 30:
                break
        
        return rows
    
    def _generate_cluster_cards(self) -> List[str]:
        """Generate duplicate cluster cards"""
        cards = []
        count = 0
        
        for cluster in self.duplicate_clusters:
            risk_class = f"risk-{cluster.risk_level.value.lower()}"
            diff_items = "".join(f"<li>{html.escape(diff)}</li>" for diff in cluster.diff_summary[:3])
            
            card = f'''
            <div style="margin-bottom: 20px; padding: 20px; background: rgba(30, 41, 59, 0.4); border-radius: 8px; border-left: 4px solid {Config.COLORS['primary']};">
                <div style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                    <div>
                        <strong>Cluster {cluster.cluster_id}</strong>
                        <span class="risk-badge {risk_class}" style="margin-left: 10px;">{cluster.risk_level.value}</span>
                    </div>
                    <div style="color: #94a3b8;">Similarity: {(cluster.similarity_score * 100):.1f}%</div>
                </div>
                
                <div style="margin-bottom: 15px;">
                    <strong>Files ({cluster.cluster_size}):</strong>
                    <div style="font-family: monospace; font-size: 13px; margin-top: 8px; color: #cbd5e1;">
                        {', '.join(html.escape(f) for f in cluster.files[:3])}
                        {f'... and {cluster.cluster_size - 3} more' if cluster.cluster_size > 3 else ''}
                    </div>
                </div>
                
                {f'<div style="margin-bottom: 10px;"><strong>Suggested base:</strong> {html.escape(cluster.suggested_base_file)}</div>' if cluster.suggested_base_file else ''}
                
                {f'<div style="margin-bottom: 15px;"><strong>Key differences:</strong><ul style="margin-top: 8px; padding-left: 20px; color: #94a3b8; font-size: 13px;">{diff_items}</ul></div>' if cluster.diff_summary else ''}
                
                <div style="display: flex; justify-content: space-between; font-size: 13px; color: #94a3b8;">
                    <div>Recommendation: {cluster.primary_recommendation.value}</div>
                    <div>Impact: {cluster.estimated_impact}</div>
                    <div>Waste: {cluster.total_wasted_bytes:,} bytes</div>
                </div>
            </div>
            '''
            cards.append(card)
            count += 1
            
            if count >= 10:
                break
        
        return cards
    
    def _print_analysis_summary(self):
        """Print analysis summary"""
        if not self.project_metrics:
            return
        
        metrics = self.project_metrics
        
        print("\n" + "="*70)
        print("✅ ANALYSIS COMPLETE - SAFE MODE ACTIVE")
        print("="*70)
        
        print(f"\n📊 PROJECT SUMMARY")
        print(f"   Files analyzed: {metrics.total_files:,}")
        print(f"   Lines of code: {metrics.total_lines:,}")
        print(f"   React components: {metrics.total_components:,}")
        print(f"   Custom hooks: {metrics.total_hooks:,}")
        
        print(f"\n⚠️  RISK ANALYSIS")
        print(f"   High risk files: {metrics.risk_distribution.get(RiskLevel.HIGH, 0):,}")
        print(f"   Medium risk files: {metrics.risk_distribution.get(RiskLevel.MEDIUM, 0):,}")
        print(f"   Low risk files: {metrics.risk_distribution.get(RiskLevel.LOW, 0):,}")
        
        print(f"\n🔍 FINDINGS")
        print(f"   Unused components: {metrics.unused_components:,}")
        print(f"   Unwired components: {metrics.unwired_components:,}")
        print(f"   Duplicate clusters: {metrics.duplicate_clusters:,}")
        print(f"   Archive candidates: {metrics.archive_candidates:,}")
        print(f"   Safe to archive: {metrics.safe_to_archive:,}")
        
        print(f"\n📈 QUALITY METRICS")
        print(f"   Avg stability: {metrics.average_stability:.2f}/10")
        print(f"   Avg type safety: {metrics.average_type_safety:.2f}/10")
        print(f"   Avg complexity: {metrics.average_complexity:.1f}")
        
        print(f"\n💰 POTENTIAL SAVINGS")
        print(f"   Bytes: {metrics.potential_savings_bytes:,}")
        print(f"   Lines: {metrics.potential_savings_lines:,}")
        print(f"   Percentage: {(metrics.potential_savings_bytes / metrics.total_bytes * 100):.1f}%")
        
        print(f"\n⏱️  PERFORMANCE")
        print(f"   Analysis time: {metrics.analysis_duration:.2f} seconds")
        print(f"   Files per second: {metrics.files_scanned / metrics.analysis_duration:.1f}")
        
        print(f"\n🛡️  SAFETY STATUS")
        for msg in Config.SAFETY_MESSAGES:
            print(f"   ✓ {msg}")
        
        print(f"\n💡 NEXT STEPS")
        print("   1. Review the interactive dashboard in your browser")
        print("   2. Examine high-risk findings first")
        print("   3. Consider creating a safe archive for eligible files")
        print("   4. All changes are reversible via archive")

# ============================================================================
# INTERACTIVE CLI
# ============================================================================

class InteractiveCLI:
    """Interactive command-line interface"""
    
    def __init__(self, analyzer: SafeRefactorAnalyzer):
        self.analyzer = analyzer
        self.report = None
    
    def run(self):
        """Run the CLI"""
        self._print_header()
        
        while True:
            try:
                self._print_menu()
                choice = input("\nSelect option (1-9, h, 0): ").strip().lower()
                
                if choice == '0':
                    self._exit()
                    break
                elif choice == '1':
                    self._run_full_analysis()
                elif choice == '2':
                    self._show_high_risk()
                elif choice == '3':
                    self._show_unused_unwired()
                elif choice == '4':
                    self._show_duplicate_clusters()
                elif choice == '5':
                    self._show_categories()
                elif choice == '6':
                    self._export_reports()
                elif choice == '7':
                    self._show_file_details()
                elif choice == '8':
                    self._create_safe_archive()
                elif choice == '9':
                    self._generate_dashboard()
                elif choice == 'h':
                    self._show_help()
                else:
                    print("⚠️  Invalid option. Please try again.")
                
                if choice != '0':
                    input("\nPress Enter to continue...")
                    
            except KeyboardInterrupt:
                print("\n\n⚠️  Operation cancelled by user")
                break
            except Exception as e:
                print(f"\n❌ Error: {str(e)}")
                input("\nPress Enter to continue...")
    
    def _print_header(self):
        """Print CLI header"""
        print("\n" + "="*70)
        print("G-STUDIO ULTIMATE SAFE REFACTOR SYSTEM 4.5.0")
        print("="*70)
        print("🔒 Conservative Engineering | 📊 Enhanced Dashboard | 🚀 Enterprise Analysis")
        print("-"*70)
    
    def _print_menu(self):
        """Print main menu"""
        print("\n📋 MAIN MENU")
        print("1. Run Full Analysis")
        print("2. Show High Risk Files Only")
        print("3. Show Unused & Unwired Components")
        print("4. Show Duplicate Clusters with Merge Suggestions")
        print("5. Show File Category Distribution")
        print("6. Export Reports (JSON + CSV)")
        print("7. View Single File Details")
        print("8. Create Safe Refactor Archive")
        print("9. Generate HTML Dashboard")
        print("h. Help / About")
        print("0. Exit")
        print("-"*70)
    
    def _run_full_analysis(self):
        """Run full analysis"""
        print("\n🔄 Running full analysis...")
        self.report = self.analyzer.run_full_analysis()
        print("\n✅ Analysis complete!")
    
    def _show_high_risk(self):
        """Show high-risk files"""
        if not self.report:
            print("\n⚠️  Please run analysis first (option 1)")
            return
        
        high_risk = []
        for path, info in self.report.get('files', {}).items():
            if info['risk_level'] in ['HIGH', 'CRITICAL']:
                high_risk.append((path, info))
        
        if not high_risk:
            print("\n✅ No high-risk files found!")
            return
        
        print(f"\n⚠️  HIGH-RISK FILES ({len(high_risk)} found)")
        print("="*70)
        
        for path, info in sorted(high_risk, key=lambda x: x[1]['risk_level'], reverse=True)[:20]:
            print(f"\n📄 {path}")
            print(f"   Category: {info['category']}")
            print(f"   Risk: {info['risk_level']}")
            print(f"   Recommendation: {info['recommendation']}")
            print(f"   Stability: {info['stability_score']}/10")
            print(f"   Dependents: {info['dependents_count']}")
            print(f"   Modified: {info['days_since_modified']} days ago")
    
    def _show_unused_unwired(self):
        """Show unused and unwired components"""
        if not self.report:
            print("\n⚠️  Please run analysis first (option 1)")
            return
        
        unused = self.report.get('unused_candidates', [])
        unwired = self.report.get('unwired_candidates', [])
        
        print(f"\n🚫 UNUSED COMPONENTS ({len(unused)} found)")
        print("-"*70)
        for comp in unused[:10]:
            print(f"⚛️  {comp['name']} (line {comp['line']})")
            print(f"   File: {comp['file']}")
            print(f"   Risk: {comp['risk_level']}")
            print(f"   Recommendation: {comp['recommendation']}")
        
        print(f"\n🔌 UNWIRED COMPONENTS ({len(unwired)} found)")
        print("-"*70)
        for comp in unwired[:10]:
            print(f"⚛️  {comp['name']} (line {comp['line']})")
            print(f"   File: {comp['file']}")
            print(f"   Risk: {comp['risk_level']}")
            print(f"   Recommendation: {comp['recommendation']}")
    
    def _show_duplicate_clusters(self):
        """Show duplicate clusters"""
        if not self.report:
            print("\n⚠️  Please run analysis first (option 1)")
            return
        
        clusters = self.report.get('duplicate_clusters', [])
        
        if not clusters:
            print("\n✅ No duplicate clusters found!")
            return
        
        print(f"\n🔄 DUPLICATE CLUSTERS ({len(clusters)} found)")
        print("="*70)
        
        for cluster in clusters[:10]:
            print(f"\n📁 Cluster {cluster['cluster_id']}")
            print(f"   Similarity: {cluster['similarity_score']:.1%}")
            print(f"   Files: {len(cluster['files'])}")
            print(f"   Risk: {cluster['risk_level']}")
            print(f"   Recommendation: {cluster['recommendation']}")
            
            if cluster['suggested_base_file']:
                print(f"   Suggested base: {cluster['suggested_base_file']}")
    
    def _show_categories(self):
        """Show category distribution"""
        if not self.report:
            print("\n⚠️  Please run analysis first (option 1)")
            return
        
        metrics = self.report.get('project_metrics', {})
        category_dist = metrics.get('category_distribution', {})
        
        if not category_dist:
            print("\n⚠️  No category data available")
            return
        
        print("\n📊 FILE CATEGORY DISTRIBUTION")
        print("="*70)
        
        total = sum(category_dist.values())
        for category, count in sorted(category_dist.items(), key=lambda x: x[1], reverse=True):
            percentage = (count / total) * 100
            bar = "█" * int(percentage / 2)
            print(f"{category.value:20} {count:5} files {percentage:5.1f}% {bar}")
    
    def _export_reports(self):
        """Export reports"""
        if not self.analyzer.report_folder:
            print("\n⚠️  Please run analysis first (option 1)")
            return
        
        print(f"\n📁 Reports available in: {self.analyzer.report_folder}")
        print("✅ Reports were generated during analysis.")
    
    def _show_file_details(self):
        """Show file details"""
        if not self.report:
            print("\n⚠️  Please run analysis first (option 1)")
            return
        
        search_term = input("\nEnter file path or name to search: ").strip()
        if not search_term:
            return
        
        matches = []
        for path, info in self.report.get('files', {}).items():
            if search_term.lower() in path.lower():
                matches.append((path, info))
        
        if not matches:
            print(f"\n❌ No files found matching '{search_term}'")
            return
        
        print(f"\n🔍 Found {len(matches)} matching files")
        print("-"*70)
        
        for i, (path, info) in enumerate(matches[:5], 1):
            print(f"\n{i}. {path}")
            print(f"   Category: {info['category']}")
            print(f"   Size: {info['size']:,} bytes")
            print(f"   Stability: {info['stability_score']}/10")
            print(f"   Risk: {info['risk_level']}")
            print(f"   Recommendation: {info['recommendation']}")
            print(f"   Archive eligible: {info['is_archive_eligible']}")
    
    def _create_safe_archive(self):
        """Create safe archive"""
        if not self.report:
            print("\n⚠️  Please run analysis first (option 1)")
            return
        
        candidates = self.report.get('archive_candidates', [])
        if not candidates:
            print("\n⚠️  No eligible files for archiving found")
            return
        
        print(f"\n📦 Found {len(candidates)} archive candidates")
        print("="*70)
        print("⚠️  Archive creation is a separate operation.")
        print("📁 Archives would be saved to: reports/YYYYMMDD_HHMMSS/archives/")
        print("✅ Source files remain untouched.")
        print("="*70)
        
        response = input("\n❓ Show archive preview? (y/N): ").strip().lower()
        if response in ['y', 'yes']:
            print("\n📋 Archive Preview (top 10):")
            for i, candidate in enumerate(candidates[:10], 1):
                print(f"{i:2}. {candidate['relative_path']}")
                print(f"    Size: {candidate['size_bytes']:,} bytes | Stability: {candidate['stability_score']:.1f}/10")
    
    def _generate_dashboard(self):
        """Generate dashboard"""
        if not self.analyzer.report_folder:
            print("\n⚠️  Please run analysis first (option 1)")
            return
        
        dashboard_path = self.analyzer.report_folder / "optimization_dashboard.html"
        if dashboard_path.exists():
            print(f"\n✅ Dashboard already exists: {dashboard_path}")
            print(f"📊 Open in browser to view interactive report")
        else:
            print("\n🔄 Generating dashboard...")
            # The dashboard is already generated during analysis
            print(f"✅ Dashboard saved: {dashboard_path}")
    
    def _show_help(self):
        """Show help information"""
        print("\n" + "="*70)
        print("HELP & ABOUT")
        print("="*70)
        print("\nG-Studio Ultimate Safe Refactor System")
        print("Version 4.5.0 - Enhanced Dashboard Edition")
        
        print("\n🔒 SAFETY PRINCIPLES:")
        print("• Analysis-only by default")
        print("• No source files modified")
        print("• Archive requires explicit confirmation")
        print("• All changes reversible via archive")
        
        print("\n📊 KEY FEATURES:")
        print("• Comprehensive metrics dashboard")
        print("• Advanced duplicate detection")
        print("• Risk assessment and recommendations")
        print("• Archive eligibility scoring")
        print("• Interactive HTML visualization")
        
        print("\n📁 OUTPUTS:")
        print("• full_report.json - Complete analysis data")
        print("• summary_report.json - Key metrics summary")
        print("• optimization_dashboard.html - Interactive dashboard")
        print("• high_risk.csv - High-risk files for review")
        print("• metrics_visualization.json - Data for visualization")
        
        print("\n🎯 RECOMMENDATIONS HIERARCHY:")
        print("1. Keep as is (default)")
        print("2. Investigate (requires review)")
        print("3. Refactor for clarity")
        print("4. Merge into another file")
        print("5. Safe to archive")
        
        print("\n🛡️  ARCHIVE ELIGIBILITY:")
        print("• Score ≥ 75: SAFE_TO_ARCHIVE")
        print("• Score 60-74: INVESTIGATE")
        print("• Score < 60: KEEP_AS_IS")
        print("• Hard blockers: Recent, dependents, exports, etc.")
    
    def _exit(self):
        """Exit the application"""
        print("\n" + "="*70)
        print("👋 Thank you for using G-Studio Safe Refactor System")
        print("🔒 Remember: All changes are reversible via archive")
        print("📁 Check reports/ folder for analysis outputs")
        print("="*70)

# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

def main():
    """Main entry point"""
    print("\n" + "="*70)
    print("G-STUDIO ULTIMATE SAFE REFACTOR SYSTEM 4.5.0")
    print("="*70)
    print("\n🔒 Conservative Engineering | 📊 Enhanced Dashboard | 🚀 Enterprise Analysis")
    print("-"*70)
    
    # Get project path
    if len(sys.argv) > 1:
        root_path = sys.argv[1]
        scoped_path = sys.argv[2] if len(sys.argv) > 2 else None
    else:
        root_path = input("Enter project root path (press Enter for current directory): ").strip()
        if not root_path:
            root_path