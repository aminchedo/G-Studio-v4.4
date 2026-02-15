#!/usr/bin/env python3
"""
G-STUDIO ULTIMATE SAFE REFACTOR SYSTEM

Enterprise-grade static analysis and safe refactoring tool for React/TypeScript.
Conservative, non-destructive approach with safe archiving and detailed reporting.

Author: G-Studio Engineering
Version: 4.0.0 - Enterprise Safe Archive Mode
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
# ENUMERATIONS (UPDATED)
# ============================================================================

class RiskLevel(Enum):
    """Conservative risk assessment"""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class Recommendation(Enum):
    """Conservative action recommendations"""
    KEEP_AS_IS = "KEEP_AS_IS"
    INVESTIGATE = "INVESTIGATE"
    SAFE_TO_ARCHIVE = "SAFE_TO_ARCHIVE"
    SAFE_TO_REMOVE = "SAFE_TO_REMOVE"
    MERGE_INTO_ANOTHER_FILE = "MERGE_INTO_ANOTHER_FILE"
    REFACTOR_FOR_CLARITY = "REFACTOR_FOR_CLARITY"
    WIRE_TO_APPLICATION = "WIRE_TO_APPLICATION"
    RENAME_FOR_CLARITY = "RENAME_FOR_CLARITY"

class FileCategory(Enum):
    """Intelligent file classification"""
    UI_COMPONENT = "UI_COMPONENT"
    CUSTOM_HOOK = "CUSTOM_HOOK"
    PAGE_OR_ROUTE = "PAGE_OR_ROUTE"
    CONTEXT = "CONTEXT"
    STORE_OR_STATE = "STORE_OR_STATE"
    UTILITY = "UTILITY"
    SERVICE = "SERVICE"
    CONFIG = "CONFIGURATION"
    TEST = "TEST"
    ASSET = "ASSET"
    UNKNOWN = "UNKNOWN"
    FRAMEWORK_CORE = "FRAMEWORK_CORE"  # New category

class ComponentType(Enum):
    """Component classification"""
    FUNCTION_COMPONENT = "Function Component"
    ARROW_COMPONENT = "Arrow Component"
    CLASS_COMPONENT = "Class Component"
    HOOK = "Hook"
    HIGHER_ORDER_COMPONENT = "Higher-Order Component"

# ============================================================================
# CONFIGURATION (UPDATED)
# ============================================================================

class Config:
    """Safe configuration for enterprise analysis"""
    
    # Directory exclusions (safety first)
    EXCLUDE_DIRS = {
        "node_modules", "dist", "build", ".git", ".next", ".nuxt",
        "coverage", "__pycache__", ".cache", ".idea", ".vscode",
        "tmp", "temp", "backup", "backups", "archive", "archived",
        "final", "old", "previous", "legacy", "out", ".output",
        "refactor_temp", "reports"  # Our own temp directory
    }
    
    # Hard-blocker directories
    CRITICAL_DIRS = {
        "core", "runtime", "boot", "init", "config", "framework",
        "shared", "common", "lib", "utils"
    }
    
    # File patterns for classification (updated)
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
            r".*\.(css|scss|sass|less|svg|png|jpg|jpeg|gif|ico)$"
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
    
    # Archive eligibility rules (conservative)
    ARCHIVE_RULES = {
        "max_risk_level": RiskLevel.MEDIUM,
        "min_stability_score": 3.0,
        "max_dependents": 0,
        "min_days_since_modification": 30,
        "allow_exported": False,
        "allow_critical": False,
        "similarity_threshold": 0.85,  # New
        "recent_days_blocker": 30,      # New
        "archive_score_threshold": 75    # New
    }
    
    # Never archive these categories
    NEVER_ARCHIVE_CATEGORIES = {
        FileCategory.PAGE_OR_ROUTE,
        FileCategory.CONTEXT,
        FileCategory.STORE_OR_STATE,
        FileCategory.FRAMEWORK_CORE
    }
    
    # Duplicate detection thresholds
    EXACT_DUPLICATE_THRESHOLD = 1.0
    STRUCTURAL_SIMILARITY_THRESHOLD = 0.85
    
    # Stability score weights
    STABILITY_WEIGHTS = {
        "dependents": 0.40,
        "exported_symbols": 0.25,
        "age_factor": 0.15,
        "complexity": 0.10,
        "type_safety": 0.10
    }
    
    # Safety messages (updated)
    SAFETY_MESSAGES = [
        "ANALYSIS-ONLY MODE: NO FILES WERE MODIFIED IN YOUR SOURCE CODE",
        "NO FILES WERE DELETED FROM YOUR PROJECT",
        "SAFE ARCHIVE STRATEGY ENABLED",
        "ALL CHANGES ARE REVERSIBLE VIA ARCHIVE",
        "ARCHIVE ACTIONS REQUIRE EXPLICIT USER CONFIRMATION"
    ]

# ============================================================================
# DATA MODELS (UPDATED)
# ============================================================================

@dataclass
class ArchiveDecision:
    """Structured archive decision with scoring and reasoning"""
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
    """Complete analysis of a single file (updated)"""
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
    
    # Export/Import Analysis
    exported_symbols: List[str] = field(default_factory=list)
    imported_symbols: List[str] = field(default_factory=list)
    import_statements: List[str] = field(default_factory=list)
    
    # Component Detection
    components: List['ComponentInfo'] = field(default_factory=list)
    hooks: List['ComponentInfo'] = field(default_factory=list)
    
    # Dependency Graph
    dependents: Set[str] = field(default_factory=set)
    dependencies: Set[str] = field(default_factory=set)
    
    # Risk & Recommendations
    risk_level: RiskLevel = RiskLevel.LOW
    primary_recommendation: Recommendation = Recommendation.KEEP_AS_IS
    secondary_recommendation: Optional[Recommendation] = None
    reasoning: List[str] = field(default_factory=list)
    safety_notes: List[str] = field(default_factory=list)
    short_reason: str = ""  # New
    
    # Quality Metrics
    stability_score: float = 0.0
    type_safety_score: float = 0.0
    complexity_score: float = 0.0
    any_type_count: int = 0
    ts_ignore_count: int = 0
    complexity_estimate: int = 0  # New
    
    # Hash for duplicate detection
    content_hash: str = ""
    structural_hash: str = ""
    
    # Archive eligibility
    is_archive_eligible: bool = False
    archive_reason: str = ""
    archive_decision: Optional[ArchiveDecision] = None  # New
    
    # Usage Analysis
    is_dynamic_imported: bool = False  # New
    is_test_file: bool = False  # New
    duplicate_cluster_id: Optional[str] = None  # New
    barrel_exported: bool = False  # New
    
    def __post_init__(self):
        if not self.last_modified_human:
            dt = datetime.fromtimestamp(self.last_modified)
            self.last_modified_human = dt.strftime('%Y-%m-%d %H:%M:%S')
            self.days_since_modified = (datetime.now() - dt).days

@dataclass
class ComponentInfo:
    """Analysis of a React component or custom hook"""
    name: str
    file_path: str
    line_number: int
    component_type: ComponentType
    is_exported: bool
    is_default_export: bool
    
    # Usage Analysis
    used_in_files: Set[str] = field(default_factory=set)
    usage_count: int = 0
    
    # Props/Parameters
    prop_count: int = 0
    has_jsx: bool = False
    
    # Risk & Recommendations
    risk_level: RiskLevel = RiskLevel.LOW
    recommendation: Recommendation = Recommendation.KEEP_AS_IS
    reasoning: List[str] = field(default_factory=list)
    
    # Metadata
    created_at: float = field(default_factory=time.time)

@dataclass
class DuplicateCluster:
    """Cluster of duplicate/near-duplicate files (updated)"""
    cluster_id: str
    files: List[str]
    similarity_score: float
    duplication_type: str  # "exact", "structural", "name"
    
    # Analysis
    risk_level: RiskLevel
    primary_recommendation: Recommendation
    confidence: float
    
    # Merge Proposal
    suggested_base_file: Optional[str] = None
    suggested_merge_target: Optional[str] = None
    diff_summary: List[str] = field(default_factory=list)
    estimated_impact: str = "LOW"
    
    # Metrics (updated)
    total_wasted_bytes: int = 0
    total_wasted_lines: int = 0
    cluster_size: int = 0  # New
    exported_files_count: int = 0  # New
    recent_files_count: int = 0  # New
    confidence_score: float = 0.0  # New
    
    # Archive candidates
    archive_candidates: List[str] = field(default_factory=list)
    
    # Reasoning
    reasoning: List[str] = field(default_factory=list)

@dataclass
class ArchiveCandidate:
    """File candidate for safe archiving"""
    file_path: str
    relative_path: str
    category: FileCategory
    size_bytes: int
    lines_of_code: int
    
    # Eligibility reasons
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
    archive_decision: Optional[ArchiveDecision] = None  # New

@dataclass
class ProjectMetrics:
    """Aggregate project metrics"""
    total_files: int
    total_lines: int
    total_bytes: int
    
    # Component Analysis
    total_components: int
    total_hooks: int
    unused_components: int
    unwired_components: int
    
    # Duplication
    duplicate_clusters: int
    exact_duplicates: int
    structural_duplicates: int
    
    # Risk Distribution
    risk_distribution: Dict[RiskLevel, int]
    
    # File Categories
    category_distribution: Dict[FileCategory, int]
    
    # Quality Metrics
    average_stability: float
    average_type_safety: float
    
    # Archive candidates
    archive_candidates: int
    safe_to_archive: int
    
    # Recommendations Summary
    recommendations_summary: Dict[Recommendation, int]

@dataclass
class AnalysisReport:
    """Complete analysis report container"""
    metadata: Dict[str, Any]
    files: Dict[str, Dict[str, Any]]
    duplicate_clusters: List[Dict[str, Any]]
    unused_candidates: List[Dict[str, Any]]
    unwired_candidates: List[Dict[str, Any]]
    merge_suggestions: List[Dict[str, Any]]
    archive_candidates: List[Dict[str, Any]] = field(default_factory=list)

# ============================================================================
# REPORTING HELPER
# ============================================================================

def create_timestamped_report_folder(root_path: Path) -> Path:
    """
    Create timestamped report folder for centralized outputs.
    
    Returns:
        Path to the created reports folder: reports/YYYYMMDD_HHMMSS/
    """
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    reports_root = root_path / "reports"
    reports_root.mkdir(exist_ok=True)
    
    report_folder = reports_root / timestamp
    report_folder.mkdir(exist_ok=True)
    
    # Create archives subdirectory
    archives_folder = report_folder / "archives"
    archives_folder.mkdir(exist_ok=True)
    
    print(f"📁 Report folder created: {report_folder}")
    return report_folder

# ============================================================================
# CORE ANALYSIS ENGINE (UPDATED)
# ============================================================================

class SafeRefactorAnalyzer:
    """
    Main analysis engine - conservative, safe static analysis
    with non-destructive archiving for React/TypeScript applications.
    """
    
    def __init__(self, root_path: str, scoped_path: Optional[str] = None):
        self.root = Path(root_path).resolve()
        self.scoped_path = Path(scoped_path) if scoped_path else None
        self.files: Dict[str, FileInfo] = {}
        self.components: Dict[str, ComponentInfo] = {}
        self.hooks: Dict[str, ComponentInfo] = {}
        self.duplicate_clusters: List[DuplicateCluster] = []
        self.archive_candidates: List[ArchiveCandidate] = []
        self.project_metrics: Optional[ProjectMetrics] = None
        self.report_folder: Optional[Path] = None
        
        # Indexes for fast lookup
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
        
        # Analysis log
        self.analysis_log: List[str] = []
        self._log("INFO", f"Initializing analyzer for: {self.root}")
        if scoped_path:
            self._log("INFO", f"Scoped analysis for: {scoped_path}")
    
    def _log(self, level: str, message: str):
        """Log analysis events"""
        timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        log_entry = f"[{timestamp}] [{level}] {message}"
        self.analysis_log.append(log_entry)
        if level in ["WARNING", "ERROR"]:
            print(f"  ⚠️  {message}")
    
    def _write_runtime_log(self):
        """Write runtime log to report folder"""
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
            
            f.write("STATISTICS:\n")
            f.write("-" * 70 + "\n")
            for key, value in self.stats.items():
                if key not in ["start_time", "end_time"]:
                    f.write(f"{key}: {value}\n")
            
            f.write("\nANALYSIS LOG:\n")
            f.write("-" * 70 + "\n")
            for entry in self.analysis_log:
                f.write(entry + "\n")
    
    def run_full_analysis(self) -> Dict[str, Any]:
        """
        Execute complete analysis pipeline (analysis-only).
        Returns comprehensive report.
        """
        self.stats["start_time"] = time.time()
        
        print("\n" + "="*70)
        print("G-STUDIO ULTIMATE SAFE REFACTOR SYSTEM")
        print("="*70)
        print(f"📁 Analyzing: {self.root}")
        if self.scoped_path:
            print(f"📂 Scope: {self.scoped_path}")
        print(f"🔒 Safe Archive Mode: Non-destructive, reversible changes")
        print("-"*70)
        
        # Display safety messages
        for msg in Config.SAFETY_MESSAGES:
            print(f"🛡️  {msg}")
        
        # Create timestamped report folder
        self.report_folder = create_timestamped_report_folder(self.root)
        self._log("INFO", f"Report folder: {self.report_folder}")
        
        # Phase 1: File discovery and classification
        print("\n🔍 Phase 1: Scanning and classifying files...")
        self._scan_and_classify_files()
        
        # Phase 2: Component and hook detection
        print("🔍 Phase 2: Detecting React components and hooks...")
        self._detect_components_and_hooks()
        
        # Phase 3: Dependency graph construction
        print("🔍 Phase 3: Building dependency graph...")
        self._build_dependency_graph()
        
        # Phase 4: Multi-layer duplicate detection
        print("🔍 Phase 4: Multi-layer duplicate detection...")
        self._detect_duplicates_multi_layer()
        
        # Phase 5: Risk assessment and recommendations
        print("🔍 Phase 5: Conservative risk assessment...")
        self._assess_risks_and_recommendations()
        
        # Phase 6: Stability scoring
        print("🔍 Phase 6: Computing stability scores...")
        self._compute_stability_scores()
        
        # Phase 7: Archive eligibility analysis
        print("🔍 Phase 7: Analyzing archive eligibility...")
        self._analyze_archive_eligibility()
        
        # Phase 8: Generate metrics and reports
        print("🔍 Phase 8: Generating comprehensive report...")
        self._generate_project_metrics()
        
        self.stats["end_time"] = time.time()
        self.stats["analysis_time"] = self.stats["end_time"] - self.stats["start_time"]
        
        # Write reports
        self._write_all_reports()
        
        print("\n" + "="*70)
        print("✅ ANALYSIS COMPLETE - SAFE MODE ACTIVE")
        print("="*70)
        self._print_summary()
        
        return self._generate_complete_report()
    
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
            if size < 100 or size > 10 * 1024 * 1024:  # 100 bytes to 10MB
                return True
        except:
            return True
        
        return False
    
    def _scan_and_classify_files(self):
        """Scan files and classify by category with enhanced detection"""
        scan_root = self.scoped_path if self.scoped_path else self.root
        
        for file_path in scan_root.rglob("*"):
            if not file_path.is_file():
                continue
            
            if self._should_exclude(file_path):
                continue
            
            try:
                # Read file content
                content = file_path.read_text(encoding='utf-8', errors='ignore')
                stat = file_path.stat()
                
                # Classify file with enhanced detection
                category = self._classify_file(file_path, content)
                
                # Check for dynamic imports
                is_dynamic_imported = bool(re.search(r'import\(|React\.lazy\(|require\(', content))
                
                # Check for barrel exports
                barrel_exported = self._check_barrel_export(file_path, content)
                
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
                    is_dynamic_imported=is_dynamic_imported,
                    barrel_exported=barrel_exported,
                    is_test_file=bool(re.search(r'\.(spec|test)\.', file_path.name))
                )
                
                # Extract exports and imports
                file_info.exported_symbols = self._extract_exports(content)
                file_info.imported_symbols, file_info.import_statements = self._extract_imports(content)
                
                # Count type safety issues
                file_info.any_type_count = len(re.findall(r'\bany\b', content))
                file_info.ts_ignore_count = len(re.findall(r'@ts-ignore|// @ts-ignore', content))
                file_info.type_safety_score = self._calculate_type_safety(content)
                
                # Compute complexity estimate
                file_info.complexity_estimate = self._estimate_complexity(content)
                
                # Store file
                self.files[file_info.relative_path] = file_info
                self._hash_index[file_info.content_hash].append(file_info.relative_path)
                self._structural_index[file_info.structural_hash].append(file_info.relative_path)
                
                # Index by name
                self._name_index[file_path.name].append(file_info.relative_path)
                
                # Index exports
                for export in file_info.exported_symbols:
                    self._export_index[export].append(file_info.relative_path)
                
                self.stats["files_scanned"] += 1
                
            except Exception as e:
                self._log("WARNING", f"Could not process {file_path}: {e}")
        
        self._log("INFO", f"Scanned {self.stats['files_scanned']} files")
    
    def _check_barrel_export(self, file_path: Path, content: str) -> bool:
        """Check if file is exported via barrel index"""
        # Look for index.ts/tsx/js/jsx files in parent directories
        parent = file_path.parent
        for index_name in ["index.ts", "index.tsx", "index.js", "index.jsx"]:
            index_path = parent / index_name
            if index_path.exists():
                try:
                    index_content = index_path.read_text(encoding='utf-8')
                    file_name = file_path.name
                    # Check if this file is re-exported
                    if file_name in index_content:
                        return True
                except:
                    continue
        return False
    
    def _estimate_complexity(self, content: str) -> int:
        """Estimate cyclomatic complexity"""
        # Count control flow statements
        patterns = [
            r'\bif\s*\(', r'\belse\b', r'\bfor\s*\(', r'\bwhile\s*\(',
            r'\bswitch\s*\(', r'\bcase\s+', r'\btry\s*{', r'\bcatch\s*\(',
            r'&&|\|\|', r'\?.*:', r'await\s+'
        ]
        
        complexity = 0
        for pattern in patterns:
            complexity += len(re.findall(pattern, content))
        
        # Count functions and components
        func_count = len(re.findall(r'function\s+\w+|const\s+\w+\s*=\s*\([^)]*\)\s*=>', content))
        complexity += func_count * 2
        
        return complexity
    
    def _classify_file(self, path: Path, content: str) -> FileCategory:
        """Enhanced file classification with framework core detection"""
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
        elif re.search(r'createStore|useStore|useSelector|useRecoil', content):
            return FileCategory.STORE_OR_STATE
        elif re.search(r'axios|fetch.*api|\.post\(|\.get\(', content):
            return FileCategory.SERVICE
        
        # Framework core detection
        if any(core_dir in rel_path for core_dir in Config.CRITICAL_DIRS):
            return FileCategory.FRAMEWORK_CORE
        
        # Default based on extension
        if path.suffix in ['.ts', '.tsx', '.js', '.jsx']:
            return FileCategory.UTILITY
        
        return FileCategory.UNKNOWN
    
    def _detect_components_and_hooks(self):
        """Detect React components and custom hooks"""
        for rel_path, file_info in self.files.items():
            if file_info.category not in [FileCategory.UI_COMPONENT, FileCategory.CUSTOM_HOOK]:
                continue
            
            try:
                content = (self.root / rel_path).read_text(encoding='utf-8', errors='ignore')
                
                # Detect function components
                func_patterns = [
                    (r'function\s+([A-Z][A-Za-z0-9_]*)\s*\([^)]*\)\s*{', ComponentType.FUNCTION_COMPONENT),
                    (r'const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*\([^)]*\)\s*=>\s*{', ComponentType.ARROW_COMPONENT),
                    (r'const\s+([A-Z][A-Za-z0-9_]*)\s*:\s*.*[Ff]unction[Cc]omponent.*=', ComponentType.ARROW_COMPONENT),
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
                        
                        # Check if exported
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
                self._log("WARNING", f"Could not analyze components in {rel_path}: {e}")
    
    def _build_dependency_graph(self):
        """Build comprehensive dependency graph"""
        # First pass: collect all imports
        for rel_path, file_info in self.files.items():
            for import_stmt in file_info.import_statements:
                resolved = self._resolve_import(rel_path, import_stmt)
                if resolved:
                    file_info.dependencies.add(resolved)
        
        # Second pass: build reverse dependencies
        for rel_path, file_info in self.files.items():
            for dependency in file_info.dependencies:
                if dependency in self.files:
                    self.files[dependency].dependents.add(rel_path)
        
        # Third pass: track component usage
        for component_key, component in self.components.items():
            for rel_path, file_info in self.files.items():
                if component.file_path == rel_path:
                    continue
                
                # Search for component usage in file
                try:
                    content = (self.root / rel_path).read_text(encoding='utf-8', errors='ignore')
                    if component.name in content:
                        component.used_in_files.add(rel_path)
                        component.usage_count += content.count(component.name)
                except:
                    pass
    
    def _resolve_import(self, importer: str, import_path: str) -> Optional[str]:
        """Enhanced import resolution with barrel index awareness"""
        if import_path.startswith('.'):
            # Relative import
            importer_dir = Path(importer).parent
            resolved = (importer_dir / import_path).resolve()
            
            # Try to find relative to root
            try:
                return str(resolved.relative_to(self.root))
            except ValueError:
                # Try with extensions
                for ext in ['.ts', '.tsx', '.js', '.jsx', '.json', '']:
                    test_path = str(resolved) + ext
                    for file_path in self.files:
                        if file_path in test_path:
                            return file_path
        
        # Check for barrel exports
        if import_path in self._export_index:
            return self._export_index[import_path][0] if self._export_index[import_path] else None
        
        return None
    
    def _compute_structural_similarity(self, file_a: str, file_b: str) -> float:
        """
        Compute structural similarity between two files (0.0-1.0)
        Advanced multi-layer similarity detection with normalization pipeline.
        
        Args:
            file_a: Relative path to first file
            file_b: Relative path to second file
            
        Returns:
            Similarity score between 0.0 (completely different) and 1.0 (identical structure)
        """
        try:
            # Read file contents
            content_a = (self.root / file_a).read_text(encoding='utf-8', errors='ignore')
            content_b = (self.root / file_b).read_text(encoding='utf-8', errors='ignore')
            
            # Normalization pipeline
            norm_a = self._normalize_content_for_similarity(content_a)
            norm_b = self._normalize_content_for_similarity(content_b)
            
            # Early return for very different sizes
            size_ratio = min(len(norm_a), len(norm_b)) / max(len(norm_a), len(norm_b), 1)
            if size_ratio < 0.3:
                return 0.0
            
            # Layer 1: Sequence similarity
            sequence_ratio = SequenceMatcher(None, norm_a, norm_b).ratio()
            
            # Layer 2: Token Jaccard similarity
            tokens_a = self._extract_structural_tokens(content_a)
            tokens_b = self._extract_structural_tokens(content_b)
            
            if tokens_a and tokens_b:
                set_a = set(tokens_a)
                set_b = set(tokens_b)
                
                if set_a and set_b:
                    jaccard_ratio = len(set_a.intersection(set_b)) / len(set_a.union(set_b))
                else:
                    jaccard_ratio = 0.0
            else:
                jaccard_ratio = 0.0
            
            # Weighted combination
            similarity = (0.6 * sequence_ratio) + (0.4 * jaccard_ratio)
            
            return min(similarity, 1.0)
            
        except Exception as e:
            self._log("WARNING", f"Could not compute similarity for {file_a} vs {file_b}: {e}")
            return 0.0
    
    def _normalize_content_for_similarity(self, content: str) -> str:
        """
        Normalize content for structural comparison.
        Implements the normalization pipeline:
        1. Remove comments
        2. Normalize string literals
        3. Normalize numeric literals
        4. Normalize identifier names
        5. Collapse whitespace
        """
        # Remove all types of comments
        normalized = content
        
        # Remove single-line comments
        normalized = re.sub(r'//.*$', '', normalized, flags=re.MULTILINE)
        
        # Remove multi-line comments
        normalized = re.sub(r'/\*.*?\*/', '', normalized, flags=re.DOTALL)
        
        # Remove JSX comments
        normalized = re.sub(r'\{/\*.*?\*/\}', '', normalized, flags=re.DOTALL)
        
        # Normalize string literals (single, double, template)
        normalized = re.sub(r'[\'"`].*?[\'"`]', '__STR__', normalized)
        
        # Normalize numeric literals
        normalized = re.sub(r'\b\d+\.?\d*\b', '__NUM__', normalized)
        
        # Normalize local variable names (preserve structure)
        # This is a simplified approach - in production would need more sophisticated parsing
        normalized = re.sub(r'\b(const|let|var)\s+\w+', r'\1 __VAR__', normalized)
        normalized = re.sub(r'function\s+\w+', 'function __FUNC__', normalized)
        normalized = re.sub(r'\((\s*\w+\s*,?\s*)+\)', '(__PARAMS__)', normalized)
        
        # Preserve JSX tag names but normalize attributes
        normalized = re.sub(r'<(\w+)', r'<__TAG__', normalized)
        
        # Collapse multiple whitespace and remove blank lines
        normalized = re.sub(r'\s+', ' ', normalized)
        normalized = re.sub(r'\n\s*\n', '\n', normalized)
        
        return normalized.strip()
    
    def _extract_structural_tokens(self, content: str) -> List[str]:
        """Extract structural tokens from content"""
        tokens = []
        
        # Extract function/class declarations
        func_matches = re.findall(r'(?:function|const|let|var)\s+(\w+)\s*[=(]', content)
        tokens.extend(func_matches)
        
        # Extract class declarations
        class_matches = re.findall(r'class\s+(\w+)', content)
        tokens.extend(class_matches)
        
        # Extract method calls
        method_matches = re.findall(r'\.(\w+)\s*\(', content)
        tokens.extend(method_matches[:10])
        
        # Extract import/export statements
        import_matches = re.findall(r'import\s+.*from\s+[\'"]([^\'"]+)[\'"]', content)
        tokens.extend([f"import:{imp}" for imp in import_matches])
        
        export_matches = re.findall(r'export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)', content)
        tokens.extend([f"export:{exp}" for exp in export_matches])
        
        # Extract hook usage
        hook_matches = re.findall(r'\b(use[A-Z][A-Za-z]*)\b', content)
        tokens.extend([f"hook:{hook}" for hook in hook_matches])
        
        # Extract JSX tags
        jsx_matches = re.findall(r'<(\w+)[\s>]', content)
        tokens.extend([f"jsx:{tag}" for tag in jsx_matches[:5]])
        
        return tokens
    
    def _detect_duplicates_multi_layer(self):
        """Multi-layer duplicate detection with structural similarity"""
        self._log("INFO", "Layer 1: Exact duplicates (hash-based)...")
        exact_clusters = self._detect_exact_duplicates()
        
        self._log("INFO", "Layer 2: Structural duplicates...")
        structural_clusters = self._detect_structural_duplicates()
        
        # Combine clusters
        all_clusters = exact_clusters + structural_clusters
        self.duplicate_clusters = self._analyze_and_cluster_duplicates(all_clusters)
        self.stats["duplicates_found"] = len(self.duplicate_clusters)
        
        # Generate diff summaries for all clusters
        for cluster in self.duplicate_clusters:
            self._generate_advanced_diff_summary(cluster)
    
    def _detect_structural_duplicates(self) -> List[DuplicateCluster]:
        """Enhanced structural duplicate detection with clustering"""
        clusters = []
        processed = set()
        
        # Get all text files
        text_files = [f for f in self.files.values() if f.category not in [FileCategory.ASSET, FileCategory.UNKNOWN]]
        file_paths = [f.relative_path for f in text_files]
        
        # Single-linkage clustering
        for i in range(len(file_paths)):
            file_a = file_paths[i]
            if file_a in processed:
                continue
            
            # Find similar files
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
                
                if similarity >= Config.STRUCTURAL_SIMILARITY_THRESHOLD:
                    similar_files.append(file_b)
                    processed.add(file_b)
            
            if len(similar_files) > 1:
                # Create cluster
                cluster_id = f"structural_{hashlib.sha256(str(similar_files).encode()).hexdigest()[:8]}"
                processed.add(file_a)
                
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
                    cluster_id=cluster_id,
                    files=similar_files,
                    similarity_score=avg_similarity,
                    duplication_type="structural",
                    risk_level=RiskLevel.MEDIUM,
                    primary_recommendation=Recommendation.INVESTIGATE,
                    confidence=avg_similarity,
                    cluster_size=len(similar_files),
                    exported_files_count=exported_count,
                    recent_files_count=recent_count,
                    confidence_score=avg_similarity
                )
                
                # Set suggested base and merge target
                self._set_cluster_suggestions(cluster)
                clusters.append(cluster)
        
        return clusters
    
    def _set_cluster_suggestions(self, cluster: DuplicateCluster):
        """Set suggested base file and merge target for cluster"""
        if len(cluster.files) < 2:
            return
        
        # Score each file for base selection
        scores = []
        for file_path in cluster.files:
            file_info = self.files[file_path]
            score = 0
            
            # Higher stability is better
            score += file_info.stability_score * 10
            
            # More dependents is better
            score += len(file_info.dependents) * 5
            
            # Older is better (more stable)
            score += file_info.days_since_modified * 0.1
            
            # Fewer blockers is better
            if not file_info.is_dynamic_imported:
                score += 20
            if not file_info.barrel_exported:
                score += 10
            
            scores.append((score, file_path))
        
        # Sort by score descending
        scores.sort(reverse=True)
        
        # Set suggested base (highest score)
        cluster.suggested_base_file = scores[0][1]
        
        # Set suggested merge target (second highest, if significantly different)
        if len(scores) > 1 and scores[1][0] > scores[0][0] * 0.7:
            cluster.suggested_merge_target = scores[1][1]
        else:
            cluster.suggested_merge_target = None
    
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
            
            # 1. Hook differences
            hook_types = ['useState', 'useEffect', 'useMemo', 'useCallback', 'useContext', 'useRef']
            hook_counts_a = {hook: content_a.count(hook) for hook in hook_types}
            hook_counts_b = {hook: content_b.count(hook) for hook in hook_types}
            
            for hook in hook_types:
                diff = hook_counts_a.get(hook, 0) - hook_counts_b.get(hook, 0)
                if diff > 0:
                    diff_summary.append(f"{base_file} has {abs(diff)} more {hook} hooks")
                elif diff < 0:
                    diff_summary.append(f"{compare_file} has {abs(diff)} more {hook} hooks")
            
            # 2. Export type differences
            exports_a = len(re.findall(r'export default', content_a))
            exports_b = len(re.findall(r'export default', content_b))
            named_exports_a = len(re.findall(r'export (?!default)', content_a))
            named_exports_b = len(re.findall(r'export (?!default)', content_b))
            
            if exports_a != exports_b:
                diff_summary.append(f"Different default export count: {exports_a} vs {exports_b}")
            if named_exports_a != named_exports_b:
                diff_summary.append(f"Different named export count: {named_exports_a} vs {named_exports_b}")
            
            # 3. Side effect detection
            side_effects = ['fetch', 'axios', 'socket', 'addEventListener', 'setInterval', 'setTimeout']
            side_effects_a = sum(1 for effect in side_effects if effect in content_a)
            side_effects_b = sum(1 for effect in side_effects if effect in content_b)
            
            if side_effects_a != side_effects_b:
                diff_summary.append(f"Different side effect patterns: {side_effects_a} vs {side_effects_b}")
            
            # 4. JSX complexity estimation
            jsx_tags_a = len(re.findall(r'<[A-Z][A-Za-z0-9]*', content_a))
            jsx_tags_b = len(re.findall(r'<[A-Z][A-Za-z0-9]*', content_b))
            
            if abs(jsx_tags_a - jsx_tags_b) > 5:
                diff_summary.append(f"JSX complexity difference: {jsx_tags_a} vs {jsx_tags_b} tags")
            
            # 5. Prop/interface differences
            interfaces_a = re.findall(r'interface\s+(\w+)', content_a)
            interfaces_b = re.findall(r'interface\s+(\w+)', content_b)
            types_a = re.findall(r'type\s+(\w+)', content_a)
            types_b = re.findall(r'type\s+(\w+)', content_b)
            
            unique_a = set(interfaces_a + types_a) - set(interfaces_b + types_b)
            unique_b = set(interfaces_b + types_b) - set(interfaces_a + types_a)
            
            if unique_a:
                diff_summary.append(f"{base_file} has unique types: {', '.join(list(unique_a)[:3])}")
            if unique_b:
                diff_summary.append(f"{compare_file} has unique types: {', '.join(list(unique_b)[:3])}")
            
            # Limit to 5 most important differences
            cluster.diff_summary = diff_summary[:5]
            
        except Exception as e:
            self._log("WARNING", f"Could not generate diff summary for cluster {cluster.cluster_id}: {e}")
            cluster.diff_summary = ["Could not generate detailed diff analysis"]
    
    def _are_files_in_same_exact_cluster(self, file_a: str, file_b: str) -> bool:
        """Check if files are already in the same exact duplicate cluster"""
        for cluster in self.duplicate_clusters:
            if cluster.duplication_type == "exact" and file_a in cluster.files and file_b in cluster.files:
                return True
        return False
    
    def _analyze_and_cluster_duplicates(self, clusters: List[DuplicateCluster]) -> List[DuplicateCluster]:
        """Analyze duplicates and create conservative recommendations"""
        analyzed_clusters = []
        
        for cluster in clusters:
            # Enhance with additional analysis
            self._enhance_cluster_analysis(cluster)
            analyzed_clusters.append(cluster)
        
        return analyzed_clusters
    
    def _enhance_cluster_analysis(self, cluster: DuplicateCluster):
        """Enhance cluster with detailed analysis"""
        # Calculate wasted resources
        total_bytes = sum(self.files[f].size_bytes for f in cluster.files)
        total_lines = sum(self.files[f].lines_of_code for f in cluster.files)
        cluster.total_wasted_bytes = total_bytes - self.files[cluster.files[0]].size_bytes
        cluster.total_wasted_lines = total_lines - self.files[cluster.files[0]].lines_of_code
        cluster.cluster_size = len(cluster.files)
        
        # Calculate exported and recent counts
        cluster.exported_files_count = sum(1 for f in cluster.files if self.files[f].exported_symbols)
        cluster.recent_files_count = sum(1 for f in cluster.files if self.files[f].days_since_modified < 60)
        
        # Determine risk and recommendation
        if cluster.duplication_type == "exact":
            cluster.risk_level = RiskLevel.LOW
            cluster.primary_recommendation = Recommendation.MERGE_INTO_ANOTHER_FILE
            cluster.confidence_score = 0.95
        else:
            # Structural duplicates
            if cluster.exported_files_count > 1 or cluster.recent_files_count > 0:
                cluster.risk_level = RiskLevel.HIGH
                cluster.primary_recommendation = Recommendation.INVESTIGATE
            else:
                cluster.risk_level = RiskLevel.MEDIUM
                cluster.primary_recommendation = Recommendation.REFACTOR_FOR_CLARITY
            
            cluster.confidence_score = cluster.similarity_score
        
        # Set merge suggestions
        if len(cluster.files) > 1:
            cluster.suggested_base_file = self._select_base_file_for_merge(cluster.files)
            if len(cluster.files) > 2:
                # For clusters > 2, suggest merging all into base
                cluster.archive_candidates = [f for f in cluster.files if f != cluster.suggested_base_file]
            else:
                cluster.suggested_merge_target = cluster.files[1] if len(cluster.files) > 1 else None
            
            # Determine impact
            max_dependents = max(len(self.files[f].dependents) for f in cluster.files)
            if max_dependents > 5:
                cluster.estimated_impact = "HIGH"
            elif max_dependents > 1:
                cluster.estimated_impact = "MEDIUM"
            else:
                cluster.estimated_impact = "LOW"
        
        # Update reasoning
        cluster.reasoning.extend([
            f"Similarity: {cluster.similarity_score:.1%}",
            f"Files affected: {len(cluster.files)}",
            f"Exported files: {cluster.exported_files_count}",
            f"Recent files (<60 days): {cluster.recent_files_count}",
            f"Potential savings: {cluster.total_wasted_bytes} bytes, {cluster.total_wasted_lines} lines"
        ])
    
    def _select_base_file_for_merge(self, files: List[str]) -> str:
        """Select the best base file for merging"""
        if not files:
            return ""
        
        scores = []
        for file in files:
            analysis = self.files[file]
            score = 0
            
            # Prefer files with more dependents
            score += len(analysis.dependents) * 10
            
            # Prefer files with more exports
            score += len(analysis.exported_symbols) * 5
            
            # Prefer better type safety
            score += analysis.type_safety_score * 3
            
            # Prefer higher stability
            score += analysis.stability_score * 2
            
            # Prefer files in src/ directory
            if 'src/' in file:
                score += 20
            
            # Prefer older files (more stable)
            score += min(analysis.days_since_modified, 365) * 0.1
            
            # Prefer files not dynamically imported
            if not analysis.is_dynamic_imported:
                score += 15
            
            scores.append((score, file))
        
        return max(scores)[1]
    
    def _assess_risks_and_recommendations(self):
        """Conservative risk assessment and recommendation generation with false-positive reduction"""
        for rel_path, file_info in self.files.items():
            # Reset recommendations
            file_info.primary_recommendation = Recommendation.KEEP_AS_IS
            file_info.secondary_recommendation = None
            file_info.reasoning = []
            file_info.safety_notes = []
            
            # Apply false-positive reduction heuristics
            self._apply_false_positive_reduction(file_info)
            
            # Assess risk based on various factors
            risk_factors = []
            
            # Factor 1: Export usage with barrel awareness
            if file_info.exported_symbols and not file_info.dependents and not file_info.barrel_exported:
                risk_factors.append(("Exported but never imported", RiskLevel.HIGH))
                file_info.primary_recommendation = Recommendation.INVESTIGATE
                file_info.reasoning.append("File exports symbols but nothing imports them directly")
                file_info.short_reason = "Exported but not imported directly"
            elif file_info.barrel_exported:
                file_info.safety_notes.append("Exported via barrel index - may be used indirectly")
            
            # Factor 2: Unused components with shared hook protection
            unused_comps = [c for c in file_info.components if c.usage_count == 0]
            if unused_comps:
                # Check if any hook is used in multiple features
                shared_hooks = self._check_shared_hooks(file_info)
                if shared_hooks and file_info.dependents:
                    risk_factors.append(("Contains unused components but has shared hooks", RiskLevel.MEDIUM))
                    file_info.secondary_recommendation = Recommendation.REFACTOR_FOR_CLARITY
                elif unused_comps and not shared_hooks:
                    risk_factors.append(("Contains unused components", RiskLevel.HIGH))
                    file_info.primary_recommendation = Recommendation.INVESTIGATE
            
            # Factor 3: Recent modifications bias
            if file_info.days_since_modified < 45:
                risk_factors.append(("Recently modified (< 45 days)", RiskLevel.MEDIUM))
                file_info.safety_notes.append("Recently modified - handle with care")
                # Recent files default to KEEP/INVESTIGATE
                if file_info.primary_recommendation in [Recommendation.SAFE_TO_REMOVE, Recommendation.SAFE_TO_ARCHIVE]:
                    file_info.primary_recommendation = Recommendation.INVESTIGATE
            
            # Factor 4: Type safety
            if file_info.any_type_count > 5 or file_info.ts_ignore_count > 2:
                risk_factors.append(("Poor type safety", RiskLevel.MEDIUM))
                file_info.secondary_recommendation = Recommendation.REFACTOR_FOR_CLARITY
            
            # Factor 5: High complexity protection
            if file_info.complexity_estimate > 50:
                risk_factors.append(("High complexity", RiskLevel.MEDIUM))
                file_info.safety_notes.append("High complexity - avoid automatic changes")
            
            # Factor 6: Async side-effect protection
            if self._has_async_side_effects(rel_path):
                risk_factors.append(("Contains async side effects", RiskLevel.MEDIUM))
                file_info.safety_notes.append("Contains async operations - requires careful review")
            
            # Determine overall risk level
            if risk_factors:
                # Take the highest risk factor
                risk_levels = [factor[1] for factor in risk_factors]
                file_info.risk_level = max(risk_levels, key=lambda r: r.value)
            else:
                file_info.risk_level = RiskLevel.LOW
            
            # Apply safety rules
            self._apply_safety_rules(file_info)
    
    def _apply_false_positive_reduction(self, file_info: FileInfo):
        """Apply false-positive reduction heuristics"""
        # Barrel export safety
        if file_info.barrel_exported:
            file_info.risk_level = RiskLevel.LOW
            file_info.primary_recommendation = Recommendation.KEEP_AS_IS
            file_info.reasoning.append("Exported via barrel index - likely used indirectly")
        
        # Naming collision detection
        file_name = Path(file_info.relative_path).name
        same_name_files = self._name_index.get(file_name, [])
        if len(same_name_files) > 1:
            # Check if these are legitimate variants (e.g., Mobile/Desktop)
            folder_names = [Path(f).parent.name for f in same_name_files]
            if any(variant in folder_names for variant in ['mobile', 'desktop', 'web', 'native', 'advanced']):
                file_info.safety_notes.append("Legitimate variant - different platform implementation")
                file_info.risk_level = RiskLevel.LOW
        
        # Infrastructure detection
        if file_info.category == FileCategory.FRAMEWORK_CORE:
            file_info.risk_level = RiskLevel.LOW
            file_info.primary_recommendation = Recommendation.KEEP_AS_IS
            file_info.reasoning.append("Framework core file - essential for application")
    
    def _check_shared_hooks(self, file_info: FileInfo) -> bool:
        """Check if hooks in this file are used in multiple features"""
        if not file_info.hooks:
            return False
        
        for hook in file_info.hooks:
            if hook.usage_count > 1:
                return True
        
        return False
    
    def _has_async_side_effects(self, rel_path: str) -> bool:
        """Check if file contains async side effects"""
        try:
            content = (self.root / rel_path).read_text(encoding='utf-8', errors='ignore')
            
            # Check for async operations
            async_patterns = [
                r'fetch\s*\(', r'axios\.', r'\.get\s*\(', r'\.post\s*\(',
                r'WebSocket', r'socket\.', r'addEventListener',
                r'setInterval', r'setTimeout', r'Promise\.'
            ]
            
            for pattern in async_patterns:
                if re.search(pattern, content):
                    return True
            
            return False
        except:
            return False
    
    def _apply_safety_rules(self, file_info: FileInfo):
        """Apply conservative safety rules"""
        # Never recommend deletion for recently modified files
        if file_info.days_since_modified < 90:
            if file_info.primary_recommendation in [Recommendation.SAFE_TO_REMOVE, Recommendation.SAFE_TO_ARCHIVE]:
                file_info.primary_recommendation = Recommendation.INVESTIGATE
                file_info.safety_notes.append("Recently modified - not safe to archive")
        
        # Never recommend deletion for files with dependents
        if file_info.dependents:
            if file_info.primary_recommendation in [Recommendation.SAFE_TO_REMOVE, Recommendation.SAFE_TO_ARCHIVE]:
                file_info.primary_recommendation = Recommendation.KEEP_AS_IS
                file_info.safety_notes.append(f"Has {len(file_info.dependents)} dependents")
        
        # Never archive critical files
        if file_info.category in Config.NEVER_ARCHIVE_CATEGORIES:
            if file_info.primary_recommendation == Recommendation.SAFE_TO_ARCHIVE:
                file_info.primary_recommendation = Recommendation.KEEP_AS_IS
                file_info.safety_notes.append(f"Critical category: {file_info.category.value}")
        
        # Never archive dynamically imported files
        if file_info.is_dynamic_imported:
            if file_info.primary_recommendation == Recommendation.SAFE_TO_ARCHIVE:
                file_info.primary_recommendation = Recommendation.KEEP_AS_IS
                file_info.safety_notes.append("Dynamically imported - required for code splitting")
    
    def _compute_stability_scores(self):
        """Compute stability score for each file (0-10)"""
        for file_info in self.files.values():
            # Calculate components
            dependents_factor = math.log(1 + len(file_info.dependents))
            exported_symbols_factor = len(file_info.exported_symbols)
            
            # Age factor (older is more stable)
            age_factor = min(file_info.days_since_modified / 365, 1.0) * 10  # 0-10 scale
            
            # Complexity factor (simpler is more stable)
            complexity = file_info.complexity_score if hasattr(file_info, 'complexity_score') else 5.0
            complexity_factor = max(0, 10 - complexity)
            
            # Type safety factor
            type_safety = file_info.type_safety_score
            
            # Shared module boost (if used across multiple packages)
            shared_boost = 0
            if len(file_info.dependents) > 5:
                shared_boost = 2.0
            
            # Weighted sum
            weights = Config.STABILITY_WEIGHTS
            stability = (
                weights["dependents"] * dependents_factor +
                weights["exported_symbols"] * exported_symbols_factor +
                weights["age_factor"] * age_factor +
                weights["complexity"] * complexity_factor +
                weights["type_safety"] * type_safety +
                shared_boost
            )
            
            # Normalize to 0-10
            file_info.stability_score = min(stability, 10.0)
    
    def _calculate_type_safety(self, content: str) -> float:
        """Calculate type safety score (0-10)"""
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
        
        # Penalize any and ts-ignore
        any_count = len(re.findall(r'\bany\b', content))
        ts_ignore_count = len(re.findall(r'@ts-ignore|// @ts-ignore', content))
        
        # Calculate score
        base_score = (type_count / len(lines)) * 20  # Scale up
        penalty = (any_count * 2) + (ts_ignore_count * 3)
        score = max(0, base_score - penalty)
        
        return min(score, 10.0)
    
    def _analyze_archive_eligibility(self):
        """Analyze files for safe archiving eligibility using enterprise algorithm"""
        for rel_path, file_info in self.files.items():
            # Evaluate archive candidate using enterprise algorithm
            decision = self.evaluate_archive_candidate(file_info)
            file_info.archive_decision = decision
            
            # Update file info
            file_info.is_archive_eligible = decision.allowed
            file_info.archive_reason = "; ".join(decision.reasons) if not decision.allowed else "Eligible for safe archiving"
            
            # Create archive candidate if eligible
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
    
    def evaluate_archive_candidate(self, file_info: FileInfo) -> ArchiveDecision:
        """
        Enterprise-grade archive decision algorithm.
        
        Returns structured decision with scoring and reasoning.
        """
        blockers = []
        reasons = []
        score = 50.0  # Baseline score
        
        # Hard blockers (immediate disqualifiers)
        # 1. Critical categories
        if file_info.category in Config.NEVER_ARCHIVE_CATEGORIES:
            blockers.append(f"Critical category: {file_info.category.value}")
            score -= 100
        
        # 2. Dynamically imported
        if file_info.is_dynamic_imported:
            blockers.append("Dynamically imported (import()/React.lazy)")
            score -= 100
        
        # 3. Recently modified
        if file_info.days_since_modified < Config.ARCHIVE_RULES["recent_days_blocker"]:
            blockers.append(f"Recently modified: {file_info.days_since_modified} days ago")
            score -= 100
        
        # 4. Has dependents
        if len(file_info.dependents) > Config.ARCHIVE_RULES["max_dependents"]:
            blockers.append(f"Has {len(file_info.dependents)} dependents")
            score -= 100
        
        # 5. Barrel exported
        if file_info.barrel_exported:
            blockers.append("Exported via barrel index")
            score -= 100
        
        # 6. Critical directories
        for critical_dir in Config.CRITICAL_DIRS:
            if critical_dir in file_info.relative_path:
                blockers.append(f"In critical directory: {critical_dir}")
                score -= 100
                break
        
        # 7. Test files
        if file_info.is_test_file:
            blockers.append("Test file or fixture")
            score -= 100
        
        # If any hard blockers, return immediately
        if blockers:
            return ArchiveDecision(
                allowed=False,
                decision=Recommendation.KEEP_AS_IS,
                score=0,
                reasons=["File has hard blockers for archiving"],
                blockers=blockers
            )
        
        # Score adjustments (positive factors increase score, negative decrease)
        
        # Positive factors
        # 1. Age (older is better)
        if file_info.days_since_modified > 365:
            score += 20
            reasons.append("Very stable (over 1 year since modification)")
        elif file_info.days_since_modified > 180:
            score += 10
            reasons.append("Stable (over 6 months since modification)")
        
        # 2. Low complexity
        if file_info.complexity_estimate < 10:
            score += 15
            reasons.append("Low complexity")
        elif file_info.complexity_estimate < 25:
            score += 5
            reasons.append("Moderate complexity")
        
        # 3. Good type safety
        if file_info.type_safety_score > 8:
            score += 10
            reasons.append("Excellent type safety")
        elif file_info.type_safety_score > 6:
            score += 5
            reasons.append("Good type safety")
        
        # 4. No exports
        if not file_info.exported_symbols:
            score += 15
            reasons.append("No exports")
        
        # Negative factors
        # 1. High risk level
        if file_info.risk_level == RiskLevel.HIGH:
            score -= 25
            reasons.append("High risk level")
        elif file_info.risk_level == RiskLevel.MEDIUM:
            score -= 10
            reasons.append("Medium risk level")
        
        # 2. Low stability
        if file_info.stability_score < 3:
            score -= 20
            reasons.append("Low stability score")
        elif file_info.stability_score < 5:
            score -= 10
            reasons.append("Moderate stability score")
        
        # 3. Any type usage
        if file_info.any_type_count > 0:
            score -= file_info.any_type_count * 2
            reasons.append(f"Uses 'any' type ({file_info.any_type_count} times)")
        
        # 4. Async side effects
        if self._has_async_side_effects(file_info.relative_path):
            score -= 15
            reasons.append("Contains async side effects")
        
        # 5. ts-ignore usage
        if file_info.ts_ignore_count > 0:
            score -= file_info.ts_ignore_count * 5
            reasons.append(f"Uses @ts-ignore ({file_info.ts_ignore_count} times)")
        
        # Determine decision based on score
        if score >= Config.ARCHIVE_RULES["archive_score_threshold"]:
            decision = Recommendation.SAFE_TO_ARCHIVE
            allowed = True
            reasons.append(f"High confidence score: {score:.1f}/100")
        elif score >= 60:
            decision = Recommendation.INVESTIGATE
            allowed = False
            reasons.append(f"Moderate confidence score: {score:.1f}/100 - investigate further")
        elif score >= 45:
            decision = Recommendation.INVESTIGATE
            allowed = False
            reasons.append(f"Low confidence score: {score:.1f}/100 - high risk")
        else:
            decision = Recommendation.KEEP_AS_IS
            allowed = False
            reasons.append(f"Very low confidence score: {score:.1f}/100")
        
        # Ensure score is bounded
        score = max(0, min(100, score))
        
        return ArchiveDecision(
            allowed=allowed,
            decision=decision,
            score=score,
            reasons=reasons,
            blockers=blockers
        )
    
    def create_safe_archive(self, report_folder: Optional[Path] = None, confirm: bool = True) -> Optional[str]:
        """
        Create a safe archive of eligible files with enterprise-grade safety checks.
        
        Args:
            report_folder: The timestamped report folder to use
            confirm: Whether to ask for user confirmation
            
        Returns:
            Path to zip file if created, None otherwise.
        """
        if not self.archive_candidates:
            print("⚠️  No eligible files for archiving")
            return None
        
        # Use provided report folder or current one
        if report_folder is None:
            if self.report_folder is None:
                print("❌ No analysis report available. Run analysis first.")
                return None
            report_folder = self.report_folder
        
        print(f"\n📦 Found {len(self.archive_candidates)} files eligible for safe archiving")
        print("-"*70)
        
        # Display safety warning
        print("\n" + "="*70)
        print("⚠️  SAFETY WARNING")
        print("="*70)
        print("This tool will NOT modify or delete your source files.")
        print("Archive will create COPIES only.")
        print(f"The archive will be stored in: {report_folder}/archives/")
        print("Proceed only if you have reviewed the analysis.")
        print("="*70)
        
        # Display candidates summary
        total_size = sum(c.size_bytes for c in self.archive_candidates)
        print(f"\n📊 Archive Summary:")
        print(f"   Files: {len(self.archive_candidates)}")
        print(f"   Total size: {total_size:,} bytes")
        print(f"   Average stability: {sum(c.stability_score for c in self.archive_candidates) / len(self.archive_candidates):.1f}/10")
        
        # Show top 5 candidates
        print("\n📝 Top candidates:")
        for i, candidate in enumerate(self.archive_candidates[:5], 1):
            print(f"{i:2}. {candidate.relative_path}")
            print(f"    Size: {candidate.size_bytes:,} bytes | Stability: {candidate.stability_score:.1f}/10")
        
        if len(self.archive_candidates) > 5:
            print(f"    ... and {len(self.archive_candidates) - 5} more files")
        
        print("\n" + "="*70)
        print("🛡️  SAFE ARCHIVE MODE - NO SOURCE FILES WILL BE MODIFIED")
        print("="*70)
        
        for msg in Config.SAFETY_MESSAGES:
            print(f"✅ {msg}")
        
        if confirm:
            response = input("\n❓ Proceed with safe archive creation? (y/N): ").strip().lower()
            if response not in ['y', 'yes']:
                print("Archive creation cancelled")
                return None
        
        # Run safety verification pass
        print("\n🔍 Running safety verification pass...")
        verified_candidates = self._verify_archive_safety()
        
        if not verified_candidates:
            print("❌ Safety verification failed - no files to archive")
            return None
        
        # Create archive directory structure
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        temp_dir = report_folder / "refactor_temp"
        archive_dir = temp_dir / "archived_files"
        
        # Clean up previous temp directory if exists
        if temp_dir.exists():
            shutil.rmtree(temp_dir)
        
        archive_dir.mkdir(parents=True, exist_ok=True)
        
        print(f"\n📁 Creating archive in: {archive_dir}")
        
        # Copy files to archive directory with safety verification
        archived_count = 0
        failed_files = []
        
        for candidate in verified_candidates:
            try:
                # Create destination path preserving structure
                dest_path = archive_dir / candidate.relative_path
                dest_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Copy file with metadata preservation
                shutil.copy2(candidate.file_path, dest_path)
                candidate.archive_path = str(dest_path)
                candidate.archived = True
                archived_count += 1
                
                # Verify copy was successful
                if dest_path.exists() and dest_path.stat().st_size == candidate.size_bytes:
                    print(f"  ✓ Archived: {candidate.relative_path}")
                else:
                    raise Exception("Copy verification failed")
                
            except Exception as e:
                failed_files.append((candidate.relative_path, str(e)))
                print(f"  ✗ Failed: {candidate.relative_path} - {e}")
        
        # Create metadata file
        metadata = {
            "created_at": datetime.now().isoformat(),
            "tool": "G-Studio Safe Refactor System",
            "version": "4.0.0",
            "original_project": str(self.root),
            "report_folder": str(report_folder.relative_to(self.root)),
            "archive_rules": {k: str(v) for k, v in Config.ARCHIVE_RULES.items()},
            "safety_verification": {
                "passed": len(verified_candidates),
                "failed": len(failed_files),
                "failed_files": failed_files
            },
            "files_archived": archived_count,
            "files": [
                {
                    "relative_path": c.relative_path,
                    "category": c.category.value,
                    "size_bytes": c.size_bytes,
                    "stability_score": c.stability_score,
                    "risk_level": c.risk_level.value,
                    "archive_decision": c.archive_decision.to_dict() if c.archive_decision else None,
                    "archive_reason": "Safe archiving after enterprise-grade verification"
                }
                for c in verified_candidates if c.archived
            ]
        }
        
        metadata_path = temp_dir / "metadata.json"
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)
        
        # Create zip archive
        archives_dir = report_folder / "archives"
        archives_dir.mkdir(exist_ok=True)
        zip_path = archives_dir / f"refactor_archive_{timestamp}.zip"
        
        print(f"\n📦 Creating zip archive: {zip_path}")
        
        with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for file_path in temp_dir.rglob("*"):
                if file_path.is_file():
                    arcname = file_path.relative_to(temp_dir)
                    zipf.write(file_path, arcname)
        
        # Verify zip integrity
        print("🔍 Verifying archive integrity...")
        try:
            with zipfile.ZipFile(zip_path, 'r') as zipf:
                zip_files = zipf.namelist()
                if len(zip_files) >= archived_count + 1:  # Files + metadata
                    print(f"  ✓ Archive verified: {len(zip_files)} files")
                else:
                    print(f"  ⚠️  Archive verification warning: expected {archived_count + 1} files, got {len(zip_files)}")
        except Exception as e:
            print(f"  ⚠️  Archive verification failed: {e}")
        
        # Create archive metadata
        archive_metadata = {
            "archive_created": datetime.now().isoformat(),
            "archive_path": str(zip_path.relative_to(report_folder)),
            "files_archived": archived_count,
            "total_size": zip_path.stat().st_size,
            "verification_status": "completed" if not failed_files else "partial",
            "original_analysis": self.report_folder.name if self.report_folder else None
        }
        
        archive_metadata_path = report_folder / "archive_metadata.json"
        with open(archive_metadata_path, 'w', encoding='utf-8') as f:
            json.dump(archive_metadata, f, indent=2)
        
        # Clean up temporary directory (configurable)
        keep_temp = False  # Could be made configurable
        if not keep_temp:
            shutil.rmtree(temp_dir)
            print("  🗑️  Temporary files cleaned up")
        else:
            print(f"  📁 Temporary files kept at: {temp_dir}")
        
        print(f"\n✅ Archive created successfully!")
        print(f"   Files archived: {archived_count}")
        print(f"   Zip file: {zip_path}")
        print(f"   Total size: {zip_path.stat().st_size:,} bytes")
        print(f"   Archive metadata: {archive_metadata_path}")
        print("\n💡 The original project remains untouched.")
        print("💡 To restore files, extract the zip archive.")
        print("💡 Review archive_metadata.json for details.")
        
        return str(zip_path)
    
    def _verify_archive_safety(self) -> List[ArchiveCandidate]:
        """
        Run safety verification pass on archive candidates.
        Re-checks dependencies and ensures no orphan creation.
        """
        verified_candidates = []
        
        for candidate in self.archive_candidates:
            # Re-check file info
            if candidate.relative_path not in self.files:
                print(f"  ⚠️  Skipping {candidate.relative_path}: not found in current analysis")
                continue
            
            file_info = self.files[candidate.relative_path]
            
            # Re-run archive evaluation
            decision = self.evaluate_archive_candidate(file_info)
            
            if decision.allowed and decision.decision == Recommendation.SAFE_TO_ARCHIVE:
                # Simulate removal and check for orphan creation
                if self._check_orphan_creation(file_info):
                    print(f"  ⚠️  Skipping {candidate.relative_path}: would create orphans")
                    continue
                
                verified_candidates.append(candidate)
            else:
                print(f"  ⚠️  Skipping {candidate.relative_path}: failed safety check - {decision.reasons[0] if decision.reasons else 'Unknown'}")
        
        return verified_candidates
    
    def _check_orphan_creation(self, file_info: FileInfo) -> bool:
        """
        Check if archiving this file would create orphaned modules.
        Returns True if orphans would be created.
        """
        # Simple check: if this file imports other files that have no other dependents
        for dependency in file_info.dependencies:
            if dependency in self.files:
                dep_info = self.files[dependency]
                # If the dependency only has this file as a dependent
                if len(dep_info.dependents) == 1 and file_info.relative_path in dep_info.dependents:
                    return True
        
        return False
    
    def _write_all_reports(self):
        """Write all analysis reports to the report folder"""
        if not self.report_folder:
            return
        
        # Write runtime log
        self._write_runtime_log()
        
        # Generate and write reports
        full_report = self._generate_complete_report()
        summary_report = self._generate_summary_report()
        
        # Write full report
        full_report_path = self.report_folder / "full_report.json"
        with open(full_report_path, 'w', encoding='utf-8') as f:
            json.dump(full_report, f, indent=2, default=str)
        print(f"  📄 Full report: {full_report_path}")
        
        # Write summary report
        summary_report_path = self.report_folder / "summary_report.json"
        with open(summary_report_path, 'w', encoding='utf-8') as f:
            json.dump(summary_report, f, indent=2, default=str)
        print(f"  📄 Summary report: {summary_report_path}")
        
        # Write high-risk CSV
        csv_path = self.report_folder / "high_risk.csv"
        self._write_high_risk_csv(csv_path)
        print(f"  📄 High-risk CSV: {csv_path}")
        
        # Generate and write dashboard
        dashboard_path = self.report_folder / "optimization_dashboard.html"
        dashboard = DashboardGenerator(full_report, self.root).generate()
        with open(dashboard_path, 'w', encoding='utf-8') as f:
            f.write(dashboard)
        print(f"  📄 HTML Dashboard: {dashboard_path}")
        
        print(f"\n📁 All reports saved to: {self.report_folder}")
    
    def _generate_summary_report(self) -> Dict[str, Any]:
        """Generate compact summary report"""
        metrics = self.project_metrics
        if not metrics:
            return {}
        
        return {
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "tool": "G-Studio Ultimate Safe Refactor System",
                "version": "4.0.0",
                "root_path": str(self.root),
                "report_folder": str(self.report_folder.relative_to(self.root)) if self.report_folder else None,
                "analysis_duration": self.stats["analysis_time"]
            },
            "summary": {
                "total_files": metrics.total_files,
                "total_lines": metrics.total_lines,
                "total_components": metrics.total_components,
                "total_hooks": metrics.total_hooks,
                "high_risk_files": metrics.risk_distribution.get(RiskLevel.HIGH, 0) + metrics.risk_distribution.get(RiskLevel.CRITICAL, 0),
                "unused_components": metrics.unused_components,
                "duplicate_clusters": metrics.duplicate_clusters,
                "archive_candidates": metrics.archive_candidates,
                "average_stability": round(metrics.average_stability, 2),
                "average_type_safety": round(metrics.average_type_safety, 2)
            },
            "recommendations": {
                rec.value: count for rec, count in metrics.recommendations_summary.items() if count > 0
            }
        }
    
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
                    "top_reasoning": info.short_reason or (info.reasoning[0] if info.reasoning else "Unknown"),
                    "dependents_count": len(info.dependents),
                    "days_since_modified": info.days_since_modified,
                    "category": info.category.value
                })
        
        if not high_risk:
            # Create empty CSV with headers
            with open(csv_path, 'w', newline='', encoding='utf-8') as f:
                writer = csv.writer(f)
                writer.writerow(['file_path', 'risk_level', 'stability_score', 'recommendation', 'top_reasoning', 'dependents_count', 'days_since_modified', 'category'])
            return
        
        # Write CSV with data
        with open(csv_path, 'w', newline='', encoding='utf-8') as f:
            fieldnames = ['file_path', 'risk_level', 'stability_score', 'recommendation', 'top_reasoning', 'dependents_count', 'days_since_modified', 'category']
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            
            for info in sorted(high_risk, key=lambda x: x["risk_level"], reverse=True):
                writer.writerow(info)
    
    def _generate_project_metrics(self):
        """Generate comprehensive project metrics"""
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
        
        # Archive candidates
        archive_candidates = len(self.archive_candidates)
        safe_to_archive = len([c for c in self.archive_candidates if c.archive_decision and c.archive_decision.allowed])
        
        # Recommendations summary
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
            archive_candidates=archive_candidates,
            safe_to_archive=safe_to_archive,
            recommendations_summary=dict(rec_summary)
        )
    
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
        
        # Collect merge suggestions from duplicate clusters
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
                "tool": "G-Studio Ultimate Safe Refactor System",
                "version": "4.0.0",
                "scan_root": str(self.root),
                "ignored_folders": list(Config.EXCLUDE_DIRS),
                "start_time": datetime.fromtimestamp(self.stats["start_time"]).isoformat(),
                "end_time": datetime.fromtimestamp(self.stats["end_time"]).isoformat(),
                "report_folder": str(self.report_folder.relative_to(self.root)) if self.report_folder else None,
                "safe_mode": True,
                "safety_messages": Config.SAFETY_MESSAGES,
                "warnings": [log for log in self.analysis_log if "WARNING" in log or "ERROR" in log]
            },
            "project_metrics": asdict(self.project_metrics) if self.project_metrics else {},
            "files": {
                path: {
                    "path": info.relative_path,
                    "size": info.size_bytes,
                    "category": info.category.value,
                    "content_hash": info.content_hash,
                    "structural_hash": info.structural_hash,
                    "exported_symbols": info.exported_symbols,
                    "dependents_count": len(info.dependents),
                    "dependents": list(info.dependents),
                    "stability_score": round(info.stability_score, 2),
                    "risk_level": info.risk_level.value,
                    "recommendation": info.primary_recommendation.value,
                    "short_reason": info.short_reason,
                    "last_modified_days": info.days_since_modified,
                    "complexity_estimate": info.complexity_estimate,
                    "any_count": info.any_type_count,
                    "is_dynamic_imported": info.is_dynamic_imported,
                    "is_test_file": info.is_test_file,
                    "duplicate_cluster_id": info.duplicate_cluster_id
                }
                for path, info in self.files.items()
            },
            "duplicate_clusters": [
                {
                    "cluster_id": c.cluster_id,
                    "files": c.files,
                    "cluster_size": c.cluster_size,
                    "similarity_score": c.similarity_score,
                    "exported_files_count": c.exported_files_count,
                    "recent_files_count": c.recent_files_count,
                    "suggested_base_file": c.suggested_base_file,
                    "suggested_merge_target": c.suggested_merge_target,
                    "diff_summary": c.diff_summary,
                    "risk_level": c.risk_level.value,
                    "recommendation": c.primary_recommendation.value,
                    "confidence_score": c.confidence_score
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
                    "archive_decision": c.archive_decision.to_dict() if c.archive_decision else None,
                    "days_since_modified": c.days_since_modified
                }
                for c in self.archive_candidates
            ],
            "statistics": self.stats,
            "risk_analysis": {
                "high_risk_files": sum(1 for f in self.files.values() if f.risk_level == RiskLevel.HIGH),
                "critical_risk_files": sum(1 for f in self.files.values() if f.risk_level == RiskLevel.CRITICAL),
                "safe_files": sum(1 for f in self.files.values() if f.risk_level == RiskLevel.LOW)
            }
        }
    
    def _print_summary(self):
        """Print analysis summary to console"""
        metrics = self.project_metrics
        if not metrics:
            return
        
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
        
        print(f"\n📊 QUALITY METRICS")
        print(f"   Avg stability: {metrics.average_stability:.2f}/10")
        print(f"   Avg type safety: {metrics.average_type_safety:.2f}/10")
        
        print(f"\n🎯 RECOMMENDATIONS")
        for rec, count in metrics.recommendations_summary.items():
            if count > 0 and rec != Recommendation.KEEP_AS_IS:
                print(f"   {rec.value}: {count:,}")
        
        print(f"\n⏱️  PERFORMANCE")
        print(f"   Analysis time: {self.stats['analysis_time']:.2f} seconds")
        print(f"   Files per second: {self.stats['files_scanned'] / self.stats['analysis_time']:.1f}")
        
        print(f"\n📁 REPORT OUTPUT")
        if self.report_folder:
            print(f"   Reports saved to: {self.report_folder}")
            print(f"   Full report: {self.report_folder}/full_report.json")
            print(f"   HTML dashboard: {self.report_folder}/optimization_dashboard.html")
        
        print(f"\n🛡️  SAFETY STATUS")
        for msg in Config.SAFETY_MESSAGES:
            print(f"   ✓ {msg}")
        
        print(f"\n💡 NEXT STEPS")
        print("   1. Review high-risk findings first")
        print("   2. Create safe archive for eligible files (Menu option 8)")
        print("   3. Test archive before any source modifications")
        print("   4. Never delete files without archiving first")
        print("   5. All changes are reversible via archive")

# ============================================================================
# INTERACTIVE CLI SYSTEM (UPDATED)
# ============================================================================

class InteractiveCLI:
    """Interactive terminal CLI system with updated menu"""
    
    def __init__(self, analyzer: SafeRefactorAnalyzer):
        self.analyzer = analyzer
        self.report = None
        self.report_folder = None
    
    def run(self):
        """Run interactive CLI"""
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
                print(f"\n❌ Error: {e}")
                import traceback
                traceback.print_exc()
                input("\nPress Enter to continue...")
    
    def _print_header(self):
        """Print CLI header"""
        print("\n" + "="*70)
        print("G-STUDIO ULTIMATE SAFE REFACTOR SYSTEM")
        print("="*70)
        print("🔒 Conservative Engineering | 🛡️ Safe Archive Mode | 📊 Enterprise Analysis")
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
        """Run complete analysis (analysis-only)"""
        print("\n🔄 Running full analysis...")
        self.report = self.analyzer.run_full_analysis()
        self.report_folder = self.analyzer.report_folder
        print("\n✅ Analysis complete!")
        if self.report_folder:
            print(f"📁 Reports saved to: {self.report_folder}")
    
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
            print(f"   Top reason: {info.get('short_reason', 'Unknown')}")
            print(f"   Dependents: {info['dependents_count']}")
            print(f"   Stability: {info['stability_score']}/10")
            print(f"   Days since modified: {info['last_modified_days']}")
    
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
            print(f"   Type: {comp['type']}")
            print(f"   Risk: {comp['risk_level']}")
            print(f"   Recommendation: {comp['recommendation']}")
        
        print(f"\n🔌 UNWIRED COMPONENTS ({len(unwired)} found)")
        print("-"*70)
        print("⚠️  These are exported but never imported - potential unwired features")
        print("-"*70)
        for comp in unwired[:10]:
            print(f"⚛️  {comp['name']} (line {comp['line']})")
            print(f"   File: {comp['file']}")
            print(f"   Type: {comp['type']}")
            print(f"   Risk: {comp['risk_level']}")
            print(f"   Recommendation: {comp['recommendation']}")
    
    def _show_duplicate_clusters(self):
        """Show duplicate clusters with merge suggestions"""
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
            print(f"   Type: {'Exact' if cluster['similarity_score'] == 1.0 else 'Structural'}")
            print(f"   Similarity: {cluster['similarity_score']:.1%}")
            print(f"   Files: {cluster['cluster_size']}")
            print(f"   Risk: {cluster['risk_level']}")
            print(f"   Recommendation: {cluster['recommendation']}")
            print(f"   Estimated Impact: {cluster.get('estimated_impact', 'LOW')}")
            
            if cluster['suggested_base_file']:
                print(f"   Suggested base: {cluster['suggested_base_file']}")
            
            if cluster['suggested_merge_target']:
                print(f"   Suggested merge target: {cluster['suggested_merge_target']}")
            
            if cluster.get('diff_summary'):
                print(f"   Diff summary:")
                for diff in cluster['diff_summary'][:3]:
                    print(f"     • {diff}")
    
    def _show_categories(self):
        """Show file category distribution"""
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
            print(f"{category:20} {count:5} files {percentage:5.1f}% {bar}")
    
    def _export_reports(self):
        """Export JSON and CSV reports to most recent report folder"""
        if not self.report_folder:
            print("\n⚠️  Please run analysis first (option 1)")
            return
        
        # Check if reports already exist
        if not self.report_folder.exists():
            print(f"❌ Report folder not found: {self.report_folder}")
            response = input("Run analysis to create reports? (y/N): ").strip().lower()
            if response in ['y', 'yes']:
                self._run_full_analysis()
            return
        
        print(f"\n📁 Using report folder: {self.report_folder}")
        print("✅ Reports already generated during analysis.")
        print(f"   Full report: {self.report_folder}/full_report.json")
        print(f"   Summary report: {self.report_folder}/summary_report.json")
        print(f"   High-risk CSV: {self.report_folder}/high_risk.csv")
        print(f"   Dashboard: {self.report_folder}/optimization_dashboard.html")
    
    def _show_file_details(self):
        """Show detailed file information"""
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
            print(f"   Lines: {info.get('lines', 'N/A')}")
            print(f"   Stability: {info['stability_score']}/10")
            print(f"   Risk: {info['risk_level']}")
            print(f"   Recommendation: {info['recommendation']}")
            print(f"   Top reason: {info.get('short_reason', 'Unknown')}")
            print(f"   Dependents: {info['dependents_count']}")
            print(f"   Modified: {info['last_modified_days']} days ago")
            print(f"   Complexity: {info.get('complexity_estimate', 'N/A')}")
            print(f"   Any types: {info.get('any_count', 0)}")
            print(f"   Dynamic import: {info.get('is_dynamic_imported', False)}")
            print(f"   Test file: {info.get('is_test_file', False)}")
            
            if info.get('duplicate_cluster_id'):
                print(f"   Duplicate cluster: {info['duplicate_cluster_id']}")
    
    def _create_safe_archive(self):
        """Create safe refactor archive with explicit confirmation"""
        if not self.report:
            print("\n⚠️  Please run analysis first (option 1)")
            response = input("Run analysis now? (y/N): ").strip().lower()
            if response in ['y', 'yes']:
                self._run_full_analysis()
            return
        
        # Check if we have archive candidates
        candidates = self.report.get('archive_candidates', [])
        if not candidates:
            print("\n⚠️  No eligible files for archiving found in current analysis")
            return
        
        # Create archive using the current report folder
        archive_path = self.analyzer.create_safe_archive(self.report_folder, confirm=True)
        if archive_path:
            print(f"\n✅ Archive created: {archive_path}")
    
    def _generate_dashboard(self):
        """Generate HTML dashboard"""
        if not self.report_folder:
            print("\n⚠️  Please run analysis first (option 1)")
            return
        
        dashboard_path = self.report_folder / "optimization_dashboard.html"
        if dashboard_path.exists():
            print(f"\n✅ Dashboard already exists: {dashboard_path}")
            print(f"📊 Open in browser to view interactive report")
        else:
            print("\n🔄 Generating interactive dashboard...")
            dashboard = DashboardGenerator(self.report, self.analyzer.root).generate()
            
            with open(dashboard_path, 'w', encoding='utf-8') as f:
                f.write(dashboard)
            
            print(f"✅ Dashboard saved: {dashboard_path}")
            print(f"📊 Open in browser to view interactive report")
    
    def _show_help(self):
        """Show help information"""
        print("\n" + "="*70)
        print("HELP & ABOUT")
        print("="*70)
        print("\nG-Studio Ultimate Safe Refactor System")
        print("Version 4.0.0 - Enterprise Safe Archive Mode")
        
        print("\n🔒 SAFETY PRINCIPLES:")
        print("• ANALYSIS-ONLY by default — no source changes.")
        print("• NO files are modified in your source code")
        print("• NO files are deleted from your project")
        print("• Archive creates COPIES only; you must review before apply.")
        print("• ALL changes are reversible via archive")
        print("• Conservative eligibility rules")
        print("• Manual confirmation required")
        print("• No Git integration is used.")
        
        print("\n📊 KEY FEATURES:")
        print("• Enterprise-grade archive decision algorithm")
        print("• Multi-layer duplicate detection (exact + structural)")
        print("• Advanced structural similarity analysis")
        print("• Stability scoring (0-10 scale)")
        print("• Safe archiving with metadata")
        print("• Interactive HTML dashboard")
        print("• Export to JSON and CSV")
        print("• Centralized timestamped reports")
        print("• False-positive reduction heuristics")
        print("• Monorepo and barrel export awareness")
        
        print("\n🎯 RECOMMENDATION HIERARCHY:")
        print("1. Keep as is (default, when in doubt)")
        print("2. Investigate (requires manual review)")
        print("3. Refactor for clarity")
        print("4. Merge into another file")
        print("5. Safe to archive (never delete)")
        print("6. Safe to remove (only after explicit user action)")
        
        print("\n🛡️  ARCHIVE ELIGIBILITY RULES:")
        print("• Risk level: LOW or MEDIUM only")
        print("• Stability score: evaluated via enterprise algorithm")
        print("• Dependents: 0 (no other files import this)")
        print("• Age: Not modified in last 30 days (hard blocker)")
        print("• Category: Not a critical file type")
        print("• Not dynamically imported")
        print("• Not exported via barrel index")
        print("• Not in critical directories (core/, runtime/, etc.)")
        
        print("\n📈 SCORING THRESHOLDS:")
        print(f"• SIMILARITY_THRESHOLD = {Config.ARCHIVE_RULES['similarity_threshold']}")
        print(f"• RECENT_DAYS_BLOCKER = {Config.ARCHIVE_RULES['recent_days_blocker']}")
        print(f"• ARCHIVE_SCORE_THRESHOLD = {Config.ARCHIVE_RULES['archive_score_threshold']}")
        
        print("\n⚠️  NEVER ARCHIVED:")
        print("• Pages/Routes")
        print("• Context providers")
        print("• Store/State files")
        print("• Framework core files")
        print("• Recently modified files")
        print("• Files with dependents")
        print("• Dynamically imported files")
        print("• Files exported via barrel index")
    
    def _exit(self):
        """Exit the application"""
        print("\n" + "="*70)
        print("👋 Thank you for using G-Studio Safe Refactor System")
        print("🔒 Remember: All changes are reversible via archive")
        print("📁 Check reports/ folder for analysis outputs")
        print("="*70)

# ============================================================================
# HTML DASHBOARD GENERATOR (UPDATED)
# ============================================================================

class DashboardGenerator:
    """Generate professional interactive HTML dashboard"""
    
    def __init__(self, report: Dict[str, Any], root_path: Path):
        self.report = report
        self.root = root_path
    
    def generate(self) -> str:
        """Generate complete HTML dashboard with safety banner"""
        return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>G-Studio Safe Refactor Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        :root {{
            --bg-primary: #0f172a;
            --bg-secondary: #1e293b;
            --bg-card: #334155;
            --text-primary: #f1f5f9;
            --text-secondary: #cbd5e1;
            --accent: #3b82f6;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --border: #475569;
        }}
        
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
            padding: 20px;
        }}
        
        .container {{
            max-width: 1400px;
            margin: 0 auto;
        }}
        
        .safety-banner {{
            background: linear-gradient(135deg, #dc2626, #b91c1c);
            color: white;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 30px;
            text-align: center;
            font-weight: bold;
            border: 2px solid rgba(255, 255, 255, 0.2);
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
        }}
        
        .safety-banner h2 {{
            font-size: 1.5rem;
            margin-bottom: 10px;
        }}
        
        .safety-banner p {{
            font-size: 1rem;
            opacity: 0.9;
            margin-bottom: 5px;
        }}
        
        .header {{
            text-align: center;
            margin-bottom: 30px;
            padding: 20px;
            background: linear-gradient(135deg, #1e293b, #0f172a);
            border-radius: 12px;
            border: 1px solid var(--border);
        }}
        
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        
        .stat-card {{
            background: var(--bg-card);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
            border: 1px solid var(--border);
            transition: transform 0.2s;
        }}
        
        .stat-card:hover {{
            transform: translateY(-2px);
            border-color: var(--accent);
        }}
        
        .stat-value {{
            font-size: 2.5rem;
            font-weight: bold;
            margin: 10px 0;
        }}
        
        .charts {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        
        .chart-container {{
            background: var(--bg-card);
            padding: 20px;
            border-radius: 10px;
            border: 1px solid var(--border);
            height: 300px;
            position: relative;
        }}
        
        .search-section {{
            background: var(--bg-secondary);
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 30px;
        }}
        
        .search-box {{
            width: 100%;
            padding: 12px;
            background: var(--bg-primary);
            border: 1px solid var(--border);
            border-radius: 6px;
            color: var(--text-primary);
            font-size: 16px;
            margin-bottom: 20px;
        }}
        
        .filter-buttons {{
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
            margin-bottom: 20px;
        }}
        
        .filter-btn {{
            padding: 8px 16px;
            background: var(--bg-primary);
            border: 1px solid var(--border);
            border-radius: 20px;
            color: var(--text-secondary);
            cursor: pointer;
            transition: all 0.2s;
        }}
        
        .filter-btn:hover, .filter-btn.active {{
            background: var(--accent);
            color: white;
            border-color: var(--accent);
        }}
        
        details {{
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            margin-bottom: 15px;
            overflow: hidden;
        }}
        
        summary {{
            padding: 15px 20px;
            cursor: pointer;
            font-weight: 600;
            background: var(--bg-secondary);
            list-style: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        
        summary::-webkit-details-marker {{
            display: none;
        }}
        
        .details-content {{
            padding: 20px;
        }}
        
        .file-list {{
            max-height: 400px;
            overflow-y: auto;
        }}
        
        .file-item {{
            padding: 12px;
            border-bottom: 1px solid var(--border);
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
            gap: 10px;
            align-items: center;
        }}
        
        .file-item:hover {{
            background: var(--bg-secondary);
        }}
        
        .risk-badge {{
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }}
        
        .risk-low {{ background: rgba(16, 185, 129, 0.2); color: var(--success); }}
        .risk-medium {{ background: rgba(245, 158, 11, 0.2); color: var(--warning); }}
        .risk-high {{ background: rgba(239, 68, 68, 0.2); color: var(--danger); }}
        
        .archive-badge {{
            padding: 4px 8px;
            background: rgba(59, 130, 246, 0.2);
            border-radius: 6px;
            font-size: 12px;
            color: var(--accent);
        }}
        
        @media (max-width: 768px) {{
            .charts {{
                grid-template-columns: 1fr;
            }}
            
            .file-item {{
                grid-template-columns: 1fr;
                gap: 5px;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="safety-banner">
            <h2>🚨 ANALYSIS OUTPUT — NO FILES WERE MODIFIED</h2>
            <p>ARCHIVE ACTIONS REQUIRE EXPLICIT USER CONFIRMATION</p>
            <p>All changes are reversible via archive. Source files remain untouched.</p>
        </div>
        
        {self._generate_header()}
        {self._generate_stats_grid()}
        {self._generate_charts()}
        {self._generate_search_section()}
        {self._generate_details_sections()}
    </div>
    
    <script>
        // Store report data
        const report = {json.dumps(self.report, default=str)};
        
        // Initialize charts
        function initCharts() {{
            // Risk distribution chart
            const riskCtx = document.getElementById('riskChart').getContext('2d');
            const riskData = {self._get_risk_data()};
            
            new Chart(riskCtx, {{
                type: 'doughnut',
                data: {{
                    labels: riskData.labels,
                    datasets: [{{
                        data: riskData.values,
                        backgroundColor: [
                            'rgba(16, 185, 129, 0.8)',
                            'rgba(245, 158, 11, 0.8)',
                            'rgba(239, 68, 68, 0.8)',
                            'rgba(139, 92, 246, 0.8)'
                        ]
                    }}]
                }},
                options: {{
                    responsive: true,
                    plugins: {{
                        legend: {{
                            position: 'bottom',
                            labels: {{ color: '#cbd5e1' }}
                        }},
                        title: {{
                            display: true,
                            text: 'Risk Distribution',
                            color: '#f1f5f9',
                            font: {{ size: 16 }}
                        }}
                    }}
                }}
            }});
            
            // Category distribution chart
            const categoryCtx = document.getElementById('categoryChart').getContext('2d');
            const categoryData = {self._get_category_data()};
            
            new Chart(categoryCtx, {{
                type: 'bar',
                data: {{
                    labels: categoryData.labels,
                    datasets: [{{
                        label: 'Files',
                        data: categoryData.values,
                        backgroundColor: 'rgba(59, 130, 246, 0.8)'
                    }}]
                }},
                options: {{
                    responsive: true,
                    plugins: {{
                        legend: {{ display: false }},
                        title: {{
                            display: true,
                            text: 'File Categories',
                            color: '#f1f5f9',
                            font: {{ size: 16 }}
                        }}
                    }},
                    scales: {{
                        y: {{
                            beginAtZero: true,
                            ticks: {{ color: '#cbd5e1' }},
                            grid: {{ color: '#475569' }}
                        }},
                        x: {{
                            ticks: {{ 
                                color: '#cbd5e1',
                                maxRotation: 45
                            }},
                            grid: {{ color: '#475569' }}
                        }}
                    }}
                }}
            }});
        }}
        
        // Search and filter functionality
        function initSearch() {{
            const searchInput = document.querySelector('.search-box');
            const filterButtons = document.querySelectorAll('.filter-btn');
            
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
        }}
        
        function filterFiles(searchTerm = '', filter = 'all') {{
            const items = document.querySelectorAll('.file-item');
            searchTerm = searchTerm.toLowerCase();
            
            items.forEach(item => {{
                const text = item.textContent.toLowerCase();
                const risk = item.querySelector('.risk-badge')?.className || '';
                
                let matchesSearch = text.includes(searchTerm);
                let matchesFilter = filter === 'all' || 
                                   (filter === 'high' && risk.includes('high')) ||
                                   (filter === 'medium' && risk.includes('medium')) ||
                                   (filter === 'low' && risk.includes('low')) ||
                                   (filter === 'archive' && item.querySelector('.archive-badge'));
                
                item.style.display = (matchesSearch && matchesFilter) ? 'grid' : 'none';
            }});
        }}
        
        // Initialize on load
        document.addEventListener('DOMContentLoaded', function() {{
            initCharts();
            initSearch();
        }});
    </script>
</body>
</html>
        """
    
    def _generate_header(self) -> str:
        """Generate dashboard header"""
        metrics = self.report.get('project_metrics', {})
        meta = self.report.get('metadata', {})
        
        return f"""
        <div class="header">
            <h1>🏗️ G-Studio Safe Refactor Dashboard</h1>
            <p>Enterprise-grade stability analysis with safe archiving for React/TypeScript</p>
            <div style="margin-top: 10px; color: var(--text-secondary);">
                <div>Project: {html.escape(str(self.root))}</div>
                <div>Generated: {meta.get('generated_at', 'Unknown')}</div>
                <div>Files: {metrics.get('total_files', 0)} | Components: {metrics.get('total_components', 0)}</div>
                <div>Analysis duration: {meta.get('analysis_duration', 0):.2f}s</div>
            </div>
        </div>
        """
    
    def _generate_stats_grid(self) -> str:
        """Generate statistics grid"""
        metrics = self.report.get('project_metrics', {})
        
        return f"""
        <div class="stats-grid">
            <div class="stat-card">
                <div style="font-size: 14px; color: var(--text-secondary);">Total Files</div>
                <div class="stat-value">{metrics.get('total_files', 0)}</div>
                <div style="font-size: 14px; color: var(--text-secondary);">{metrics.get('total_lines', 0):,} lines</div>
            </div>
            
            <div class="stat-card">
                <div style="font-size: 14px; color: var(--text-secondary);">Components & Hooks</div>
                <div class="stat-value">{metrics.get('total_components', 0) + metrics.get('total_hooks', 0)}</div>
                <div style="font-size: 14px; color: var(--text-secondary);">
                    {metrics.get('total_components', 0)} components, {metrics.get('total_hooks', 0)} hooks
                </div>
            </div>
            
            <div class="stat-card">
                <div style="font-size: 14px; color: var(--text-secondary);">Unused Components</div>
                <div class="stat-value" style="color: var(--warning);">{metrics.get('unused_components', 0)}</div>
                <div style="font-size: 14px; color: var(--text-secondary);">
                    {metrics.get('unwired_components', 0)} unwired
                </div>
            </div>
            
            <div class="stat-card">
                <div style="font-size: 14px; color: var(--text-secondary);">Duplicate Clusters</div>
                <div class="stat-value" style="color: var(--danger);">{metrics.get('duplicate_clusters', 0)}</div>
                <div style="font-size: 14px; color: var(--text-secondary);">
                    {metrics.get('exact_duplicates', 0)} exact, {metrics.get('structural_duplicates', 0)} structural
                </div>
            </div>
            
            <div class="stat-card">
                <div style="font-size: 14px; color: var(--text-secondary);">Archive Candidates</div>
                <div class="stat-value" style="color: var(--accent);">{metrics.get('archive_candidates', 0)}</div>
                <div style="font-size: 14px; color: var(--text-secondary);">
                    {metrics.get('safe_to_archive', 0)} safe to archive
                </div>
            </div>
            
            <div class="stat-card">
                <div style="font-size: 14px; color: var(--text-secondary);">Stability Score</div>
                <div class="stat-value" style="color: var(--success);">{metrics.get('average_stability', 0):.1f}</div>
                <div style="font-size: 14px; color: var(--text-secondary);">
                    /10 average
                </div>
            </div>
        </div>
        """
    
    def _generate_charts(self) -> str:
        """Generate charts section"""
        return """
        <div class="charts">
            <div class="chart-container">
                <canvas id="riskChart" height="300"></canvas>
            </div>
            <div class="chart-container">
                <canvas id="categoryChart" height="300"></canvas>
            </div>
        </div>
        """
    
    def _generate_search_section(self) -> str:
        """Generate search and filter section"""
        return """
        <div class="search-section">
            <h3 style="margin-bottom: 15px;">🔍 Live Search & Filter</h3>
            <input type="text" class="search-box" placeholder="Search files, components, or recommendations...">
            
            <div class="filter-buttons">
                <button class="filter-btn active" data-filter="all">All Files</button>
                <button class="filter-btn" data-filter="high">High Risk</button>
                <button class="filter-btn" data-filter="medium">Medium Risk</button>
                <button class="filter-btn" data-filter="low">Low Risk</button>
                <button class="filter-btn" data-filter="archive">Archive Candidates</button>
                <button class="filter-btn" data-filter="duplicate">Duplicates</button>
            </div>
            
            <div style="color: var(--text-secondary); font-size: 14px;">
                <span class="risk-badge risk-low" style="margin-right: 5px;">Low</span>
                <span class="risk-badge risk-medium" style="margin: 0 15px 0 5px;">Medium</span>
                <span class="risk-badge risk-high" style="margin-left: 5px;">High</span>
                <span class="archive-badge" style="margin-left: 15px;">Archive Candidate</span>
            </div>
        </div>
        """
    
    def _generate_details_sections(self) -> str:
        """Generate collapsible details sections"""
        metrics = self.report.get('project_metrics', {})
        files = self.report.get('files', {})
        clusters = self.report.get('duplicate_clusters', [])
        candidates = self.report.get('archive_candidates', [])
        merge_suggestions = self.report.get('merge_suggestions', [])
        
        # High risk files section
        high_risk_files = []
        for path, info in files.items():
            if info['risk_level'] in ['HIGH', 'CRITICAL']:
                high_risk_files.append((path, info))
        
        high_risk_html = ""
        for path, info in sorted(high_risk_files, key=lambda x: x[1]['stability_score'])[:50]:
            risk_class = f"risk-{info['risk_level'].lower()}"
            high_risk_html += f"""
            <div class="file-item">
                <div>{html.escape(path)}</div>
                <div><span class="risk-badge {risk_class}">{info['risk_level']}</span></div>
                <div>{info['category']}</div>
                <div>{info['recommendation']}</div>
                <div>{info['stability_score']}/10</div>
            </div>
            """
        
        # Archive candidates section
        archive_html = ""
        for candidate in candidates[:50]:
            risk_class = f"risk-{candidate['risk_level'].lower()}"
            archive_badge = '<span class="archive-badge">✓ Eligible</span>'
            archive_html += f"""
            <div class="file-item">
                <div>{html.escape(candidate['relative_path'])}</div>
                <div><span class="risk-badge {risk_class}">{candidate['risk_level']}</span></div>
                <div>{candidate['category']}</div>
                <div>{candidate['size_bytes']:,} bytes</div>
                <div>{candidate['stability_score']:.1f}/10 {archive_badge}</div>
            </div>
            """
        
        # Duplicate clusters section
        duplicate_html = ""
        for cluster in clusters[:10]:
            risk_class = f"risk-{cluster['risk_level'].lower()}"
            duplicate_html += f"""
            <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-secondary); border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <div>
                        <strong>Cluster {cluster['cluster_id']}</strong>
                        <span class="risk-badge {risk_class}" style="margin-left: 10px;">{cluster['risk_level']}</span>
                    </div>
                    <div>Similarity: {(cluster['similarity_score'] * 100):.1f}%</div>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <strong>Files ({cluster['cluster_size']}):</strong>
                    <div style="font-family: monospace; font-size: 12px; margin-top: 5px;">
                        {', '.join(html.escape(f) for f in cluster['files'][:3])}
                        {f'... and {cluster['cluster_size'] - 3} more' if cluster['cluster_size'] > 3 else ''}
                    </div>
                </div>
                
                {f'<div style="margin-bottom: 10px;"><strong>Suggested base:</strong> {html.escape(cluster['suggested_base_file'])}</div>' if cluster['suggested_base_file'] else ''}
                {f'<div style="margin-bottom: 10px;"><strong>Suggested merge:</strong> {html.escape(cluster['suggested_merge_target'])}</div>' if cluster['suggested_merge_target'] else ''}
                
                {f'<div style="margin-bottom: 10px;"><strong>Diff Summary:</strong><ul style="margin-top: 5px; padding-left: 20px;">{"".join(f"<li>{html.escape(diff)}</li>" for diff in cluster['diff_summary'][:3])}</ul></div>' if cluster.get('diff_summary') else ''}
                
                <div style="display: flex; justify-content: space-between; font-size: 14px;">
                    <div>Recommendation: {cluster['recommendation']}</div>
                    <div>Impact: {cluster.get('estimated_impact', 'LOW')}</div>
                    <div>Confidence: {(cluster.get('confidence_score', 0) * 100):.1f}%</div>
                </div>
            </div>
            """
        
        # Merge suggestions section
        merge_html = ""
        for suggestion in merge_suggestions[:5]:
            merge_html += f"""
            <div style="margin-bottom: 15px; padding: 12px; background: var(--bg-secondary); border-radius: 6px; border-left: 4px solid var(--accent);">
                <div><strong>Merge {suggestion['base_file']} ← {suggestion['merge_target']}</strong></div>
                <div style="font-size: 12px; color: var(--text-secondary); margin-top: 5px;">
                    Similarity: {(suggestion['similarity'] * 100):.1f}% | Risk: {suggestion['risk_level']} | Impact: {suggestion['estimated_impact']}
                </div>
                {f'<div style="font-size: 12px; margin-top: 5px;">{" • ".join(html.escape(diff) for diff in suggestion['diff_summary'][:2])}</div>' if suggestion.get('diff_summary') else ''}
            </div>
            """
        
        return f"""
        <details open>
            <summary>
                ⚠️ High Risk Files ({len(high_risk_files)})
                <span style="font-size: 14px; color: var(--text-secondary);">Requires immediate attention</span>
            </summary>
            <div class="details-content">
                <div class="file-list">
                    <div class="file-item" style="font-weight: bold; background: var(--bg-secondary);">
                        <div>File Path</div>
                        <div>Risk Level</div>
                        <div>Category</div>
                        <div>Recommendation</div>
                        <div>Stability</div>
                    </div>
                    {high_risk_html if high_risk_html else '<div style="text-align: center; padding: 20px; color: var(--text-secondary);">No high risk files found</div>'}
                </div>
            </div>
        </details>
        
        <details>
            <summary>
                📦 Archive Candidates ({len(candidates)})
                <span style="font-size: 14px; color: var(--text-secondary);">Safe to archive based on enterprise algorithm</span>
            </summary>
            <div class="details-content">
                <div class="file-list">
                    <div class="file-item" style="font-weight: bold; background: var(--bg-secondary);">
                        <div>File Path</div>
                        <div>Risk Level</div>
                        <div>Category</div>
                        <div>Size</div>
                        <div>Stability</div>
                    </div>
                    {archive_html if archive_html else '<div style="text-align: center; padding: 20px; color: var(--text-secondary);">No archive candidates found</div>'}
                </div>
            </div>
        </details>
        
        <details>
            <summary>
                🔄 Duplicate Clusters ({len(clusters)})
                <span style="font-size: 14px; color: var(--text-secondary);">Potential for consolidation</span>
            </summary>
            <div class="details-content">
                {duplicate_html if duplicate_html else '<div style="text-align: center; padding: 20px; color: var(--text-secondary);">No duplicate clusters found</div>'}
            </div>
        </details>
        
        <details>
            <summary>
                🔗 Merge Suggestions ({len(merge_suggestions)})
                <span style="font-size: 14px; color: var(--text-secondary);">Recommended file merges</span>
            </summary>
            <div class="details-content">
                {merge_html if merge_html else '<div style="text-align: center; padding: 20px; color: var(--text-secondary);">No merge suggestions found</div>'}
            </div>
        </details>
        
        <details>
            <summary>
                📊 File Categories
                <span style="font-size: 14px; color: var(--text-secondary);">Project structure overview</span>
            </summary>
            <div class="details-content">
                {self._generate_categories_section()}
            </div>
        </details>
        """
    
    def _generate_categories_section(self) -> str:
        """Generate categories section"""
        metrics = self.report.get('project_metrics', {})
        category_dist = metrics.get('category_distribution', {})
        
        if not category_dist:
            return '<div>No category data available</div>'
        
        html = '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">'
        total = sum(category_dist.values())
        
        for category, count in sorted(category_dist.items(), key=lambda x: x[1], reverse=True):
            percentage = (count / total) * 100
            html += f"""
            <div style="padding: 15px; background: var(--bg-secondary); border-radius: 8px;">
                <div style="font-weight: bold; margin-bottom: 5px;">{category}</div>
                <div style="font-size: 24px; font-weight: bold; color: var(--accent);">{count}</div>
                <div style="font-size: 14px; color: var(--text-secondary);">
                    {percentage:.1f}% of files
                </div>
            </div>
            """
        
        html += '</div>'
        return html
    
    def _get_risk_data(self) -> Dict[str, Any]:
        """Get risk data for chart"""
        metrics = self.report.get('project_metrics', {})
        risk_dist = metrics.get('risk_distribution', {})
        
        # Map enum strings to values
        risk_mapping = {
            "LOW": risk_dist.get(RiskLevel.LOW, 0),
            "MEDIUM": risk_dist.get(RiskLevel.MEDIUM, 0),
            "HIGH": risk_dist.get(RiskLevel.HIGH, 0),
            "CRITICAL": risk_dist.get(RiskLevel.CRITICAL, 0)
        }
        
        labels = []
        values = []
        
        for risk, value in risk_mapping.items():
            if value > 0:
                labels.append(risk)
                values.append(value)
        
        return {"labels": labels, "values": values}
    
    def _get_category_data(self) -> Dict[str, Any]:
        """Get category data for chart"""
        metrics = self.report.get('project_metrics', {})
        category_dist = metrics.get('category_distribution', {})
        
        if not category_dist:
            return {"labels": [], "values": []}
        
        # Sort by count
        sorted_categories = sorted(category_dist.items(), key=lambda x: x[1], reverse=True)
        
        # Take top 8
        top_categories = sorted_categories[:8]
        
        labels = [cat[0] for cat in top_categories]
        values = [cat[1] for cat in top_categories]
        
        return {"labels": labels, "values": values}

# ============================================================================
# MAIN ENTRY POINT (UPDATED)
# ============================================================================

def main():
    """Main entry point"""
    print("\n" + "="*70)
    print("G-STUDIO ULTIMATE SAFE REFACTOR SYSTEM")
    print("="*70)
    print("\n🔒 Conservative Engineering | 🛡️ Safe Archive Mode | 📊 Enterprise Analysis")
    print("-"*70)
    
    # Get project root and optional scope
    if len(sys.argv) > 1:
        root_path = sys.argv[1]
        scoped_path = sys.argv[2] if len(sys.argv) > 2 else None
    else:
        root_path = input("Enter project root path (press Enter for current directory): ").strip()
        if not root_path:
            root_path = "."
        
        scoped_input = input("Enter scoped path (optional, press Enter for full project): ").strip()
        scoped_path = scoped_input if scoped_input else None
    
    try:
        # Initialize analyzer
        analyzer = SafeRefactorAnalyzer(root_path, scoped_path)
        
        # Start interactive CLI
        cli = InteractiveCLI(analyzer)
        cli.run()
        
    except KeyboardInterrupt:
        print("\n\n👋 Operation cancelled by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()