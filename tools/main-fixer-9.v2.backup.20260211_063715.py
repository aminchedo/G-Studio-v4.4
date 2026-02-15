#!/usr/bin/env python3
"""
Enterprise Code Intelligence Platform — Safe Refactor Edition v3.0
===================================================================
A professional-grade structural analysis tool for TypeScript/React/Electron projects
with non-destructive safe archive capabilities and enterprise-grade decision engine.

Author: Senior Software Architect
Purpose: Deep semantic analysis with conservative refactoring recommendations
Output: Timestamped reports with self-contained interactive HTML dashboard + Safe archive packages
Version: 3.0.0
"""

import os
import re
import json
import hashlib
import shutil
import zipfile
from pathlib import Path
from datetime import datetime, timedelta
from collections import defaultdict, Counter
from typing import Dict, List, Set, Tuple, Optional, Any
from dataclasses import dataclass, asdict, field
from difflib import SequenceMatcher
from enum import Enum
import csv
import time
import sys
import argparse

# ============================================================================
# CONFIGURATION
# ============================================================================

class Config:
    """Global configuration constants"""
    TOOL_VERSION = "3.0.0"
    SIMILARITY_THRESHOLD = 0.85
    RECENT_DAYS_BLOCKER = 30
    ARCHIVE_SCORE_THRESHOLD = 75
    INVESTIGATE_LOW_THRESHOLD = 60
    INVESTIGATE_MEDIUM_THRESHOLD = 45
    STABILITY_THRESHOLD = 4.0
    COMPLEXITY_HIGH_THRESHOLD = 50
    MAX_FILE_SIZE_FOR_SIMILARITY = 500_000  # 500KB
    SIZE_DIFF_RATIO_THRESHOLD = 3.0  # Skip similarity if sizes differ by 3x
    BARREL_EXPORT_THRESHOLD = 3  # Min exports to consider a barrel file
    SHARED_MODULE_BOOST = 2.0  # Stability boost for shared modules
    CRITICAL_DEPENDENCY_THRESHOLD = 10  # Files with 10+ dependents are critical

# ============================================================================
# ENUMS
# ============================================================================

class RiskLevel(Enum):
    """Risk classification levels"""
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
    EXTRACT_SHARED_LOGIC = "EXTRACT_SHARED_LOGIC"
    CONSOLIDATE_DUPLICATES = "CONSOLIDATE_DUPLICATES"
    MODERNIZE_IMPLEMENTATION = "MODERNIZE_IMPLEMENTATION"
    ADD_TYPE_SAFETY = "ADD_TYPE_SAFETY"
    REDUCE_COMPLEXITY = "REDUCE_COMPLEXITY"

class FileCategory(Enum):
    """File classification categories"""
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
    UNKNOWN = "UNKNOWN"

class IssueType(Enum):
    """Types of code issues"""
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

# ============================================================================
# CONSTANTS
# ============================================================================

IGNORE_PATTERNS = {
    'backup', 'archive', 'temp', 'tmp', 'dist', 'build', 'final',
    'node_modules', '.git', '.vscode', 'coverage', '.next', 'out',
    '__pycache__', '.pytest_cache', '.mypy_cache', 'vendor',
    'refactor_temp', 'refactor_archive', 'reports', '.DS_Store',
    'thumbs.db', 'desktop.ini', 'package-lock.json', 'yarn.lock'
}

FILE_EXTENSIONS = {
    '.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss',
    '.html', '.md', '.yml', '.yaml', '.env'
}

ENTRY_POINT_PATTERNS = {
    'main.ts', 'main.tsx', 'index.ts', 'index.tsx',
    'app.ts', 'app.tsx', '_app.tsx', 'main.js', 'index.js'
}

FRAMEWORK_CORE_PATTERNS = {
    'createContext', 'configureStore', 'createStore', 'createSlice',
    'setup', 'register', 'bootstrap', 'initialize', 'configure',
    'Provider', 'createRoot', 'render'
}

INFRASTRUCTURE_PATHS = {
    '/core/', '/runtime/', '/boot/', '/init/', '/config/',
    '/setup/', '/framework/', '/platform/', '/lib/', '/shared/'
}

DYNAMIC_IMPORT_PATTERNS = [
    r'import\s*\(',
    r'React\.lazy\s*\(',
    r'require\s*\(',
    r'loadable\s*\(',
    r'dynamic\s*\('
]

SIDE_EFFECT_PATTERNS = [
    'fetch', 'axios', 'XMLHttpRequest', 'WebSocket',
    'addEventListener', 'setInterval', 'setTimeout',
    'localStorage', 'sessionStorage', 'indexedDB',
    'document.', 'window.', 'navigator.'
]

HOOK_PATTERNS = [
    'useState', 'useEffect', 'useContext', 'useReducer',
    'useCallback', 'useMemo', 'useRef', 'useLayoutEffect',
    'useImperativeHandle', 'useDebugValue', 'useTransition',
    'useDeferredValue', 'useId', 'useSyncExternalStore'
]

REACT_LIFECYCLE_METHODS = [
    'componentDidMount', 'componentDidUpdate', 'componentWillUnmount',
    'shouldComponentUpdate', 'getDerivedStateFromProps',
    'getSnapshotBeforeUpdate', 'componentDidCatch'
]

TEST_FRAMEWORKS = [
    'describe', 'it', 'test', 'expect', 'jest', 'vitest',
    'beforeEach', 'afterEach', 'beforeAll', 'afterAll',
    'mock', 'spy', 'stub'
]

ROUTE_PATTERNS = [
    'Route', 'Router', 'Switch', 'Navigate', 'Link',
    'useNavigate', 'useParams', 'useLocation', 'useHistory'
]

STATE_MANAGEMENT_PATTERNS = [
    'createSlice', 'configureStore', 'Provider', 'useDispatch',
    'useSelector', 'connect', 'createContext', 'useReducer'
]

# ============================================================================
# ANSI COLOR CODES
# ============================================================================

class Colors:
    """ANSI color codes for terminal output"""
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

# ============================================================================
# DATA STRUCTURES
# ============================================================================

@dataclass
class CodeIssue:
    """Represents a code quality issue"""
    issue_type: IssueType
    severity: RiskLevel
    file_path: str
    description: str
    recommendation: str
    confidence: float
    impact_estimate: str
    related_files: List[str] = field(default_factory=list)

@dataclass
class ArchiveDecision:
    """Decision result for archive eligibility"""
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
    """Complete metadata for a single file"""
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
    exported_symbols: List[str] = field(default_factory=list)
    has_side_effects: bool = False
    hook_usage: List[str] = field(default_factory=list)
    has_jsx: bool = False
    has_typescript: bool = False
    interface_count: int = 0
    type_count: int = 0
    function_count: int = 0
    class_count: int = 0
    issues: List[CodeIssue] = field(default_factory=list)
    
@dataclass
class ComponentInfo:
    """React component specific information"""
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
    """Group of duplicate or similar files"""
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
class SameNameConflict:
    """Files with identical names in different locations"""
    name: str
    locations: List[str]
    recommended_keep: str
    confidence: float
    risk_level: RiskLevel
    reasoning: List[str]
    resolution_strategy: str
    is_legitimate_variant: bool = False

@dataclass
class AnalysisReport:
    """Complete analysis results"""
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

# ============================================================================
# LOGGING SYSTEM
# ============================================================================

class AnalysisLogger:
    """Runtime logging system"""
    
    def __init__(self, log_path: str):
        self.log_path = log_path
        self.start_time = time.time()
        self.warnings: List[str] = []
        self.errors: List[str] = []
        self.log_lines: List[str] = []
        
        self._log(f"Analysis started at {datetime.now().isoformat()}")
        self._log(f"Tool version: {Config.TOOL_VERSION}")
    
    def _log(self, message: str):
        """Add log entry"""
        timestamp = datetime.now().strftime('%H:%M:%S')
        line = f"[{timestamp}] {message}"
        self.log_lines.append(line)
        print(line)
    
    def info(self, message: str):
        """Log info message"""
        self._log(f"INFO: {message}")
    
    def warning(self, message: str):
        """Log warning"""
        self.warnings.append(message)
        self._log(f"WARNING: {message}")
    
    def error(self, message: str):
        """Log error"""
        self.errors.append(message)
        self._log(f"ERROR: {message}")
    
    def finalize(self):
        """Write log to file"""
        elapsed = time.time() - self.start_time
        self._log(f"Analysis completed in {elapsed:.2f} seconds")
        self._log(f"Total warnings: {len(self.warnings)}")
        self._log(f"Total errors: {len(self.errors)}")
        
        with open(self.log_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(self.log_lines))

# ============================================================================
# REPORT FOLDER MANAGER
# ============================================================================

def create_timestamped_report_folder(base_path: Path) -> Path:
    """
    Create timestamped report folder structure.
    
    Returns:
        Path to the created timestamped folder
    """
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    report_folder = base_path / 'reports' / timestamp
    report_folder.mkdir(parents=True, exist_ok=True)
    
    # Create subdirectories
    (report_folder / 'archives').mkdir(exist_ok=True)
    
    return report_folder

# ============================================================================
# RECOMMENDATION ENGINE
# ============================================================================

class RecommendationEngine:
    """
    Advanced recommendation engine that generates professional, intelligent,
    and context-aware recommendations considering all possible cases.
    """
    
    @staticmethod
    def generate_comprehensive_recommendation(
        file_info: FileInfo,
        all_files: Dict[str, FileInfo],
        duplicates: List[DuplicateCluster]
    ) -> Tuple[Recommendation, List[str], float]:
        """
        Generate comprehensive recommendation with detailed reasoning.
        
        Returns:
            Tuple of (recommendation, reasoning_list, confidence_score)
        """
        reasoning = []
        confidence = 0.5
        
        # === CRITICAL FILES - ALWAYS KEEP ===
        if file_info.is_entry_point:
            return (
                Recommendation.KEEP_AS_IS,
                [
                    "Application entry point - critical for bootstrap",
                    "Removing would break application initialization",
                    "Required by build system and runtime"
                ],
                1.0
            )
        
        if file_info.category == FileCategory.FRAMEWORK_CORE:
            return (
                Recommendation.KEEP_AS_IS,
                [
                    "Framework core infrastructure",
                    "Required for application architecture",
                    "High risk if modified or removed"
                ],
                1.0
            )
        
        # === HIGH DEPENDENCY FILES ===
        if file_info.dependents_count >= Config.CRITICAL_DEPENDENCY_THRESHOLD:
            return (
                Recommendation.KEEP_AS_IS,
                [
                    f"Critical shared module - {file_info.dependents_count} dependents",
                    "Widely used across application",
                    "Changes would have cascading impact",
                    "Consider as stable API contract"
                ],
                0.95
            )
        
        # === DUPLICATE ANALYSIS ===
        if file_info.duplicate_cluster_id:
            cluster = next(
                (c for c in duplicates if c.cluster_id == file_info.duplicate_cluster_id),
                None
            )
            
            if cluster:
                if cluster.similarity_score >= 0.95:
                    if file_info.path == cluster.suggested_base_file:
                        return (
                            Recommendation.KEEP_AS_IS,
                            [
                                "Identified as primary implementation in duplicate cluster",
                                f"Highest stability score in cluster ({file_info.stability_score:.1f}/10)",
                                f"Other {cluster.cluster_size - 1} file(s) should merge into this",
                                "Preserve this as canonical implementation"
                            ],
                            0.90
                        )
                    else:
                        return (
                            Recommendation.MERGE_INTO_ANOTHER_FILE,
                            [
                                f"Duplicate of {Path(cluster.suggested_base_file).name}",
                                f"Similarity: {cluster.similarity_score:.0%}",
                                "Consolidate to reduce maintenance burden",
                                "Merge unique logic into primary file",
                                f"Expected impact: {cluster.estimated_savings} lines saved"
                            ],
                            0.85
                        )
                else:
                    return (
                        Recommendation.INVESTIGATE,
                        [
                            f"Structural similarity ({cluster.similarity_score:.0%}) detected",
                            "Files may serve different purposes despite similar structure",
                            "Review for potential shared abstraction opportunity",
                            "Consider extracting common patterns to utility",
                            "Differences: " + ", ".join(cluster.diff_summary[:2])
                        ],
                        0.70
                    )
        
        # === UNUSED FILES ===
        if file_info.dependents_count == 0 and file_info.exports:
            if file_info.is_barrel_exported:
                return (
                    Recommendation.KEEP_AS_IS,
                    [
                        "Exported via barrel file (indirect usage)",
                        "Part of public API surface",
                        "May be consumed by external packages",
                        "Verify actual usage before considering removal"
                    ],
                    0.75
                )
            
            if file_info.is_dynamic_imported:
                return (
                    Recommendation.KEEP_AS_IS,
                    [
                        "Dynamically imported (lazy loading)",
                        "Static analysis cannot detect all usage",
                        "Required for code splitting strategy",
                        "Verify import() or React.lazy() references"
                    ],
                    0.85
                )
            
            if file_info.last_modified_days < 60:
                return (
                    Recommendation.WIRE_TO_APPLICATION,
                    [
                        "Recently created but not integrated",
                        f"Last modified {file_info.last_modified_days} days ago",
                        "Likely work in progress or incomplete feature",
                        "Add imports where needed or mark as future use",
                        "Consider adding to feature flag system"
                    ],
                    0.70
                )
            
            if file_info.last_modified_days > 180:
                if file_info.complexity_estimate > 20 or file_info.lines > 200:
                    return (
                        Recommendation.INVESTIGATE,
                        [
                            f"Substantial file ({file_info.lines} lines) with no dependents",
                            f"Not modified in {file_info.last_modified_days} days",
                            "May be orphaned feature or deprecated code",
                            "Review for potential removal or re-integration",
                            "Check version control history for context"
                        ],
                        0.75
                    )
                else:
                    return (
                        Recommendation.SAFE_TO_ARCHIVE,
                        [
                            "Small unused file with no active dependents",
                            f"Dormant for {file_info.last_modified_days} days",
                            "Low complexity - safe to archive",
                            "Can be restored if needed",
                            "Archive maintains full history and structure"
                        ],
                        0.80
                    )
            
            return (
                Recommendation.INVESTIGATE,
                [
                    "Exported but not imported anywhere",
                    f"Age: {file_info.last_modified_days} days",
                    "May be used indirectly or via dynamic imports",
                    "Verify usage before removal",
                    "Consider adding explicit imports if intentional"
                ],
                0.65
            )
        
        # === UNWIRED FEATURES ===
        if (file_info.dependents_count == 0 and 
            file_info.lines > 50 and 
            len(file_info.exports) > 2 and
            file_info.category in {FileCategory.SERVICE, FileCategory.UI_COMPONENT, 
                                  FileCategory.CUSTOM_HOOK}):
            return (
                Recommendation.WIRE_TO_APPLICATION,
                [
                    f"Substantial {file_info.category.value.lower()} not integrated",
                    f"{file_info.lines} lines with {len(file_info.exports)} exports",
                    "Complete implementation but missing integration",
                    "Add to appropriate feature module",
                    "Ensure proper routing/registration if needed",
                    "Consider adding to documentation"
                ],
                0.75
            )
        
        # === TYPE SAFETY ISSUES ===
        if file_info.any_count > 5:
            return (
                Recommendation.ADD_TYPE_SAFETY,
                [
                    f"Weak type safety: {file_info.any_count} 'any' usages",
                    "Replace 'any' with specific types or generics",
                    "Improves maintainability and catches errors",
                    "Use 'unknown' for truly dynamic types",
                    "Consider using type guards for runtime checks"
                ],
                0.85
            )
        
        # === COMPLEXITY ISSUES ===
        if file_info.complexity_estimate > Config.COMPLEXITY_HIGH_THRESHOLD:
            return (
                Recommendation.REDUCE_COMPLEXITY,
                [
                    f"High cyclomatic complexity: {file_info.complexity_estimate}",
                    "Consider breaking into smaller functions",
                    "Extract complex logic to separate utilities",
                    "Simplify conditional logic where possible",
                    "Add unit tests for complex branches",
                    "Target complexity < 20 per function"
                ],
                0.80
            )
        
        # === LARGE FILES ===
        if file_info.lines > 500:
            return (
                Recommendation.REFACTOR_FOR_CLARITY,
                [
                    f"Large file: {file_info.lines} lines",
                    "Consider splitting into multiple modules",
                    "Group related functionality",
                    "Extract reusable components or utilities",
                    "Improves readability and maintainability",
                    "Target < 300 lines per file"
                ],
                0.75
            )
        
        # === OUTDATED PATTERNS ===
        if file_info.is_react_component and file_info.component_type == "class":
            return (
                Recommendation.MODERNIZE_IMPLEMENTATION,
                [
                    "Class component - consider migrating to hooks",
                    "Functional components with hooks are modern standard",
                    "Easier to test and compose",
                    "Better performance with React 18+",
                    "Gradual migration recommended"
                ],
                0.70
            )
        
        # === MISSING TESTS ===
        if (file_info.category in {FileCategory.UI_COMPONENT, FileCategory.SERVICE, 
                                   FileCategory.CORE_LOGIC} and
            file_info.lines > 50):
            # Check for corresponding test file
            test_file_exists = any(
                f.is_test_file and 
                f.name.replace('.test', '').replace('.spec', '') == file_info.name
                for f in all_files.values()
            )
            
            if not test_file_exists:
                return (
                    Recommendation.INVESTIGATE,
                    [
                        "No corresponding test file found",
                        f"Substantial {file_info.category.value.lower()} without tests",
                        "Add unit tests for reliability",
                        "Test critical paths and edge cases",
                        "Improves confidence in refactoring"
                    ],
                    0.65
                )
        
        # === STABLE, WELL-MAINTAINED FILES ===
        if (file_info.stability_score > 7.0 and
            file_info.dependents_count > 0 and
            file_info.any_count < 3 and
            file_info.complexity_estimate < 30):
            return (
                Recommendation.KEEP_AS_IS,
                [
                    f"Well-maintained file (stability: {file_info.stability_score:.1f}/10)",
                    f"Actively used by {file_info.dependents_count} file(s)",
                    "Good type safety and reasonable complexity",
                    "No action needed - continue current practices",
                    "Monitor for future changes"
                ],
                0.90
            )
        
        # === DEFAULT RECOMMENDATION ===
        return (
            Recommendation.KEEP_AS_IS,
            [
                "Standard file with no critical issues",
                f"Stability: {file_info.stability_score:.1f}/10",
                f"Used by {file_info.dependents_count} file(s)" if file_info.dependents_count > 0 else "No current dependents",
                "Continue monitoring for changes"
            ],
            0.70
        )
    
    @staticmethod
    def generate_merge_strategy(
        cluster: DuplicateCluster,
        files: Dict[str, FileInfo]
    ) -> Dict[str, Any]:
        """Generate detailed merge strategy for duplicate cluster"""
        base_file = files[cluster.suggested_base_file]
        
        strategy = {
            'base_file': cluster.suggested_base_file,
            'base_file_name': base_file.name,
            'files_to_merge': [],
            'steps': [],
            'estimated_time': '15-30 minutes',
            'risk_level': cluster.risk_level.value,
            'testing_required': True
        }
        
        for file_path in cluster.files:
            if file_path != cluster.suggested_base_file:
                file_info = files[file_path]
                
                strategy['files_to_merge'].append({
                    'path': file_path,
                    'name': file_info.name,
                    'unique_exports': list(set(file_info.exports) - set(base_file.exports)),
                    'dependents': len(file_info.dependents)
                })
        
        # Generate merge steps
        strategy['steps'] = [
            "1. Review diff summary to understand key differences",
            "2. Create feature branch for merge operation",
            "3. Copy unique exports from merge candidates to base file",
            "4. Update imports in dependent files",
            "5. Run full test suite to verify functionality",
            "6. Update documentation and comments",
            "7. Archive merged files (do not delete immediately)",
            "8. Monitor for 1-2 sprints before permanent removal"
        ]
        
        # Risk assessment
        total_dependents = sum(len(files[f].dependents) for f in cluster.files)
        
        if total_dependents > 10:
            strategy['risk_level'] = 'HIGH'
            strategy['estimated_time'] = '1-2 hours'
            strategy['steps'].insert(0, "0. Create detailed impact analysis document")
            strategy['steps'].append("9. Gradual rollout with feature flag")
        
        return strategy

# ============================================================================
# FILE SCANNER
# ============================================================================

class ProjectScanner:
    """Scans and catalogs all project files with comprehensive analysis"""
    
    def __init__(self, root_path: str, logger: AnalysisLogger, scope_path: Optional[str] = None):
        self.root = Path(root_path).resolve()
        self.scope = Path(scope_path).resolve() if scope_path else self.root
        self.logger = logger
        self.files: Dict[str, FileInfo] = {}
        self.components: List[ComponentInfo] = []
        
    def should_ignore(self, path: Path) -> bool:
        """Check if path should be ignored"""
        parts = path.parts
        return any(pattern in parts or pattern in path.name.lower() 
                  for pattern in IGNORE_PATTERNS)
    
    def scan(self) -> Tuple[Dict[str, FileInfo], List[ComponentInfo]]:
        """Perform complete project scan"""
        self.logger.info(f"Scanning project structure from: {self.scope}")
        
        for root, dirs, files in os.walk(self.scope):
            dirs[:] = [d for d in dirs if not self.should_ignore(Path(root) / d)]
            
            for file in files:
                file_path = Path(root) / file
                
                if self.should_ignore(file_path):
                    continue
                    
                if file_path.suffix not in FILE_EXTENSIONS:
                    continue
                
                try:
                    metadata = self._analyze_file(file_path)
                    self.files[str(file_path)] = metadata
                except Exception as e:
                    self.logger.warning(f"Error analyzing {file_path}: {e}")
        
        self.logger.info(f"Scanned {len(self.files)} files")
        return self.files, self.components
    
    def _analyze_file(self, path: Path) -> FileInfo:
        """Extract complete metadata from a file with deep analysis"""
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        lines = content.count('\n') + 1
        size = path.stat().st_size
        modified = path.stat().st_mtime
        
        content_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()
        structural_hash = self._compute_structural_hash(content)
        
        exports = self._extract_exports(content)
        imports = self._extract_imports(content)
        
        category = self._classify_file(path, content)
        
        any_count = len(re.findall(r':\s*any\b', content))
        complexity_estimate = self._compute_complexity(content)
        
        is_entry = path.name in ENTRY_POINT_PATTERNS
        
        is_react_component, component_type = self._detect_react_component(content)
        is_custom_hook = self._detect_custom_hook(path.name, content)
        
        is_dynamic_imported = self._detect_dynamic_import(content)
        is_test_file = self._is_test_file(path)
        
        has_side_effects = self._detect_side_effects(content)
        hook_usage = self._extract_hook_usage(content)
        
        has_jsx = '<' in content and ('React' in content or path.suffix in {'.tsx', '.jsx'})
        has_typescript = path.suffix in {'.ts', '.tsx'}
        
        interface_count = len(re.findall(r'\binterface\s+\w+', content))
        type_count = len(re.findall(r'\btype\s+\w+\s*=', content))
        function_count = len(re.findall(r'\bfunction\s+\w+', content))
        class_count = len(re.findall(r'\bclass\s+\w+', content))
        
        if is_react_component:
            component_info = self._extract_component_info(path, content)
            if component_info:
                self.components.append(component_info)
        
        relative = path.relative_to(self.root)
        
        last_modified_days = int((time.time() - modified) / 86400)
        
        return FileInfo(
            path=str(path),
            relative_path=str(relative),
            name=path.name,
            extension=path.suffix,
            size=size,
            lines=lines,
            content_hash=content_hash,
            structural_hash=structural_hash,
            modified=modified,
            category=category,
            exports=exports,
            exported_symbols=exports,
            imports=imports,
            is_entry_point=is_entry,
            any_count=any_count,
            complexity_estimate=complexity_estimate,
            is_react_component=is_react_component,
            is_custom_hook=is_custom_hook,
            component_type=component_type,
            is_dynamic_imported=is_dynamic_imported,
            is_test_file=is_test_file,
            last_modified_days=last_modified_days,
            has_side_effects=has_side_effects,
            hook_usage=hook_usage,
            has_jsx=has_jsx,
            has_typescript=has_typescript,
            interface_count=interface_count,
            type_count=type_count,
            function_count=function_count,
            class_count=class_count
        )
    
    def _compute_structural_hash(self, content: str) -> str:
        """Compute hash of normalized structure"""
        content = re.sub(r'//.*?$', '', content, flags=re.MULTILINE)
        content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
        content = re.sub(r'\s+', ' ', content)
        return hashlib.sha256(content.encode('utf-8')).hexdigest()
    
    def _extract_exports(self, content: str) -> List[str]:
        """Extract all exported symbols"""
        exports = []
        
        for match in re.finditer(r'export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)', content):
            exports.append(match.group(1))
        
        for match in re.finditer(r'export\s+\{([^}]+)\}', content):
            names = match.group(1).split(',')
            exports.extend([n.strip().split()[0] for n in names if n.strip()])
        
        if re.search(r'export\s+default', content):
            exports.append('default')
        
        return list(set(exports))
    
    def _extract_imports(self, content: str) -> List[str]:
        """Extract all import statements"""
        imports = []
        
        for match in re.finditer(r'import\s+.*?from\s+[\'"]([^\'"]+)[\'"]', content):
            imports.append(match.group(1))
        
        for match in re.finditer(r'require\([\'"]([^\'"]+)[\'"]\)', content):
            imports.append(match.group(1))
        
        return imports
    
    def _classify_file(self, path: Path, content: str) -> FileCategory:
        """Classify file by purpose with enhanced detection"""
        rel_path = str(path).lower()
        name = path.name.lower()
        
        # Type definition files
        if path.suffix == '.d.ts' or 'types' in rel_path:
            return FileCategory.TYPE_DEFINITION
        
        # Constants files
        if 'constant' in name or 'const' in name:
            return FileCategory.CONSTANTS
        
        # Barrel exports
        if name in {'index.ts', 'index.tsx', 'index.js', 'index.jsx'}:
            export_count = len(re.findall(r'export\s+\{', content))
            if export_count >= Config.BARREL_EXPORT_THRESHOLD:
                return FileCategory.BARREL_EXPORT
        
        # Framework core detection
        if any(pattern in content for pattern in FRAMEWORK_CORE_PATTERNS):
            if any(infra_path in rel_path for infra_path in INFRASTRUCTURE_PATHS):
                return FileCategory.FRAMEWORK_CORE
        
        if self._detect_custom_hook(path.name, content):
            return FileCategory.CUSTOM_HOOK
        
        if 'route' in rel_path or 'page' in rel_path or '_app' in name:
            return FileCategory.PAGE_OR_ROUTE
        
        if 'context' in rel_path or 'Context' in path.name:
            return FileCategory.CONTEXT
        
        if 'store' in rel_path or 'state' in rel_path or 'redux' in rel_path:
            return FileCategory.STORE_OR_STATE
        
        if 'component' in rel_path or path.suffix in {'.tsx', '.jsx'}:
            if self._detect_react_component(content)[0]:
                return FileCategory.UI_COMPONENT
        
        if 'service' in rel_path or 'api' in rel_path:
            return FileCategory.SERVICE
        
        if 'util' in rel_path or 'helper' in rel_path:
            return FileCategory.UTILITY
        
        if 'test' in rel_path or 'spec' in rel_path or '__tests__' in rel_path:
            return FileCategory.TEST
        
        if 'config' in rel_path or path.suffix in {'.json', '.yml', '.yaml'}:
            return FileCategory.CONFIGURATION
        
        if 'asset' in rel_path or path.suffix in {'.css', '.scss'}:
            return FileCategory.ASSET
        
        if 'script' in rel_path:
            return FileCategory.SCRIPT
        
        if 'React.Component' in content or 'useState' in content:
            return FileCategory.UI_COMPONENT
        
        if 'describe(' in content or 'it(' in content:
            return FileCategory.TEST
        
        return FileCategory.CORE_LOGIC
    
    def _compute_complexity(self, content: str) -> int:
        """Compute cyclomatic complexity estimate"""
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
        return score
    
    def _detect_react_component(self, content: str) -> Tuple[bool, str]:
        """Detect if file contains React component"""
        function_pattern = r'function\s+([A-Z]\w+)\s*\([^)]*\)\s*\{[^}]*return\s*\('
        arrow_pattern = r'const\s+([A-Z]\w+)\s*[=:]\s*\([^)]*\)\s*=>\s*\{?[^}]*return\s*\('
        arrow_direct_pattern = r'const\s+([A-Z]\w+)\s*[=:]\s*\([^)]*\)\s*=>\s*\('
        
        if re.search(function_pattern, content):
            return True, "function"
        if re.search(arrow_pattern, content) or re.search(arrow_direct_pattern, content):
            return True, "arrow"
        if 'React.Component' in content or 'Component' in content and 'extends' in content:
            return True, "class"
        
        return False, ""
    
    def _detect_custom_hook(self, filename: str, content: str) -> bool:
        """Detect custom React hooks"""
        if not filename.startswith('use') and not 'use' in filename.lower():
            return False
        
        hook_pattern = r'export\s+(?:const|function)\s+(use[A-Z]\w+)'
        return bool(re.search(hook_pattern, content))
    
    def _detect_dynamic_import(self, content: str) -> bool:
        """Detect dynamic import patterns"""
        return any(re.search(pattern, content) for pattern in DYNAMIC_IMPORT_PATTERNS)
    
    def _is_test_file(self, path: Path) -> bool:
        """Check if file is a test file"""
        name = path.name.lower()
        path_str = str(path).lower()
        return (name.endswith('.test.ts') or 
                name.endswith('.test.tsx') or 
                name.endswith('.spec.ts') or 
                name.endswith('.spec.tsx') or
                '__tests__' in path_str or
                name.endswith('.test.js') or
                name.endswith('.test.jsx'))
    
    def _detect_side_effects(self, content: str) -> bool:
        """Detect side effects in code"""
        return any(pattern in content for pattern in SIDE_EFFECT_PATTERNS)
    
    def _extract_hook_usage(self, content: str) -> List[str]:
        """Extract React hooks used in file"""
        hooks = []
        for hook in HOOK_PATTERNS:
            if hook in content:
                hooks.append(hook)
        
        # Custom hooks
        for match in re.finditer(r'(use[A-Z]\w+)\s*\(', content):
            hook_name = match.group(1)
            if hook_name not in hooks:
                hooks.append(hook_name)
        
        return hooks
    
    def _extract_component_info(self, path: Path, content: str) -> Optional[ComponentInfo]:
        """Extract detailed component information"""
        function_match = re.search(r'function\s+([A-Z]\w+)\s*\([^)]*\)', content)
        arrow_match = re.search(r'const\s+([A-Z]\w+)\s*[=:]\s*\([^)]*\)\s*=>', content)
        class_match = re.search(r'class\s+([A-Z]\w+)\s+extends\s+(?:React\.)?Component', content)
        
        name = None
        is_function = False
        is_arrow = False
        is_class = False
        
        if function_match:
            name = function_match.group(1)
            is_function = True
        elif arrow_match:
            name = arrow_match.group(1)
            is_arrow = True
        elif class_match:
            name = class_match.group(1)
            is_class = True
        
        if not name:
            return None
        
        is_default = 'export default' in content
        is_named = f'export {{{name}}}' in content or f'export const {name}' in content or f'export function {name}' in content
        
        hooks_used = self._extract_hook_usage(content)
        
        lifecycle_methods = [m for m in REACT_LIFECYCLE_METHODS if m in content]
        
        state_variables = len(re.findall(r'useState\s*\(', content))
        effect_count = len(re.findall(r'useEffect\s*\(', content))
        memo_usage = 'useMemo' in content or 'useCallback' in content or 'React.memo' in content
        
        props_match = re.search(r'interface\s+\w*Props\s*\{[^}]+\}', content)
        props_interface = props_match.group(0) if props_match else None
        
        return ComponentInfo(
            name=name,
            file_path=str(path),
            is_default_export=is_default,
            is_named_export=is_named,
            is_function_component=is_function,
            is_arrow_component=is_arrow,
            is_class_component=is_class,
            props_interface=props_interface,
            hooks_used=hooks_used,
            lifecycle_methods=lifecycle_methods,
            state_variables=state_variables,
            effect_count=effect_count,
            memo_usage=memo_usage
        )

# ============================================================================
# STRUCTURAL SIMILARITY ANALYZER
# ============================================================================

class StructuralSimilarityAnalyzer:
    """Advanced structural similarity computation"""
    
    @staticmethod
    def _normalize_for_comparison(content: str) -> str:
        """
        Normalize code for structural comparison.
        
        Pipeline:
        1. Remove comments (single-line, multi-line, JSX)
        2. Replace string literals with __STR__
        3. Replace numeric literals with __NUM__
        4. Normalize whitespace
        5. Replace variable names with placeholders
        
        Args:
            content: Source code content
            
        Returns:
            Normalized string for comparison
        """
        # Remove single-line comments
        content = re.sub(r'//.*?$', '', content, flags=re.MULTILINE)
        
        # Remove block comments
        content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
        
        # Remove JSX comments
        content = re.sub(r'\{/\*.*?\*/\}', '', content, flags=re.DOTALL)
        
        # Replace string literals
        content = re.sub(r'"(?:[^"\\]|\\.)*"', '__STR__', content)
        content = re.sub(r"'(?:[^'\\]|\\.)*'", '__STR__', content)
        content = re.sub(r'`(?:[^`\\]|\\.)*`', '__STR__', content)
        
        # Replace numeric literals
        content = re.sub(r'\b\d+\.?\d*\b', '__NUM__', content)
        
        # Normalize whitespace
        content = re.sub(r'\s+', ' ', content)
        content = re.sub(r'\n+', '\n', content)
        
        # Variable name normalization (basic)
        var_names = re.findall(r'\b[a-z_][a-zA-Z0-9_]*\b', content)
        var_map = {}
        var_counter = 0
        reserved = {'const', 'let', 'var', 'function', 'return', 'if', 'else', 
                   'for', 'while', 'class', 'import', 'export', 'default'}
        
        for name in set(var_names):
            if name not in reserved:
                if name not in var_map:
                    var_map[name] = f'v{var_counter}'
                    var_counter += 1
        
        for original, placeholder in var_map.items():
            content = re.sub(r'\b' + re.escape(original) + r'\b', placeholder, content)
        
        return content.strip()
    
    @staticmethod
    def _tokenize(content: str) -> Tuple[List[str], Set[str]]:
        """
        Tokenize normalized content.
        
        Returns:
            Tuple of (token_sequence, token_set)
        """
        # Split by whitespace and punctuation
        tokens = re.findall(r'\w+|[^\w\s]', content)
        return tokens, set(tokens)
    
    @staticmethod
    def compute_structural_similarity(file_a: str, file_b: str) -> float:
        """
        Compute structural similarity between two files.
        
        Uses combined metric:
        - 60% sequence similarity (SequenceMatcher)
        - 40% Jaccard similarity (token set overlap)
        
        Args:
            file_a: Path to first file
            file_b: Path to second file
            
        Returns:
            Similarity score in [0.0, 1.0]
        """
        try:
            # Size pre-check
            size_a = Path(file_a).stat().st_size
            size_b = Path(file_b).stat().st_size
            
            if max(size_a, size_b) > Config.MAX_FILE_SIZE_FOR_SIMILARITY:
                return 0.0
            
            if size_a > 0 and size_b > 0:
                ratio = max(size_a, size_b) / min(size_a, size_b)
                if ratio > Config.SIZE_DIFF_RATIO_THRESHOLD:
                    return 0.0
            
            # Read and normalize
            with open(file_a, 'r', encoding='utf-8', errors='ignore') as f:
                content_a = f.read()
            with open(file_b, 'r', encoding='utf-8', errors='ignore') as f:
                content_b = f.read()
            
            normalized_a = StructuralSimilarityAnalyzer._normalize_for_comparison(content_a)
            normalized_b = StructuralSimilarityAnalyzer._normalize_for_comparison(content_b)
            
            # Tokenize
            seq_a, set_a = StructuralSimilarityAnalyzer._tokenize(normalized_a)
            seq_b, set_b = StructuralSimilarityAnalyzer._tokenize(normalized_b)
            
            # Sequence similarity
            sequence_ratio = SequenceMatcher(None, seq_a, seq_b).ratio()
            
            # Jaccard similarity
            intersection = len(set_a & set_b)
            union = len(set_a | set_b)
            jaccard_ratio = intersection / union if union > 0 else 0.0
            
            # Combined metric
            similarity = 0.6 * sequence_ratio + 0.4 * jaccard_ratio
            
            return similarity
            
        except Exception:
            return 0.0

# ============================================================================
# ADVANCED DIFF SUMMARIZER
# ============================================================================

class DiffSummarizer:
    """Generate human-readable diff summaries"""
    
    @staticmethod
    def generate_diff_summary(file_a: str, file_b: str, content_a: str, content_b: str) -> List[str]:
        """
        Generate 3-5 bullet point differences between files.
        
        Analyzes:
        - Hook usage differences
        - Export type differences
        - Side effect presence
        - JSX complexity
        - Prop/interface differences
        - Function/class counts
        - Type safety differences
        
        Args:
            file_a: Path to first file
            file_b: Path to second file
            content_a: Content of first file
            content_b: Content of second file
            
        Returns:
            List of human-readable difference descriptions
        """
        summary = []
        
        # Hook differences
        hooks_a = DiffSummarizer._count_hooks(content_a)
        hooks_b = DiffSummarizer._count_hooks(content_b)
        
        for hook, count_a in hooks_a.items():
            count_b = hooks_b.get(hook, 0)
            if count_a != count_b:
                diff = abs(count_a - count_b)
                which = Path(file_a).name if count_a > count_b else Path(file_b).name
                summary.append(f"{which} has {diff} more {hook} call(s)")
        
        # Export type differences
        has_default_a = 'export default' in content_a
        has_default_b = 'export default' in content_b
        
        if has_default_a != has_default_b:
            which = Path(file_a).name if has_default_a else Path(file_b).name
            summary.append(f"{which} uses default export")
        
        # Side effects
        side_effects_a = any(pattern in content_a for pattern in SIDE_EFFECT_PATTERNS)
        side_effects_b = any(pattern in content_b for pattern in SIDE_EFFECT_PATTERNS)
        
        if side_effects_a and not side_effects_b:
            summary.append(f"{Path(file_a).name} includes side effects (fetch/storage/timers)")
        elif side_effects_b and not side_effects_a:
            summary.append(f"{Path(file_b).name} includes side effects (fetch/storage/timers)")
        
        # JSX complexity
        jsx_count_a = content_a.count('<')
        jsx_count_b = content_b.count('<')
        
        if abs(jsx_count_a - jsx_count_b) > 10:
            which = Path(file_a).name if jsx_count_a > jsx_count_b else Path(file_b).name
            summary.append(f"{which} has more complex JSX structure ({abs(jsx_count_a - jsx_count_b)} more tags)")
        
        # Interface/prop differences
        interface_count_a = content_a.count('interface ')
        interface_count_b = content_b.count('interface ')
        
        if interface_count_a != interface_count_b:
            diff = abs(interface_count_a - interface_count_b)
            which = Path(file_a).name if interface_count_a > interface_count_b else Path(file_b).name
            summary.append(f"{which} defines {diff} more interface(s)")
        
        # Memoization
        has_memo_a = 'useMemo' in content_a or 'useCallback' in content_a or 'React.memo' in content_a
        has_memo_b = 'useMemo' in content_b or 'useCallback' in content_b or 'React.memo' in content_b
        
        if has_memo_a and not has_memo_b:
            summary.append(f"{Path(file_a).name} uses memoization for performance")
        elif has_memo_b and not has_memo_a:
            summary.append(f"{Path(file_b).name} uses memoization for performance")
        
        # Type safety
        any_count_a = len(re.findall(r':\s*any\b', content_a))
        any_count_b = len(re.findall(r':\s*any\b', content_b))
        
        if abs(any_count_a - any_count_b) > 3:
            which = Path(file_a).name if any_count_a > any_count_b else Path(file_b).name
            summary.append(f"{which} has weaker type safety ({abs(any_count_a - any_count_b)} more 'any')")
        
        # Function count
        func_count_a = len(re.findall(r'\bfunction\s+\w+', content_a))
        func_count_b = len(re.findall(r'\bfunction\s+\w+', content_b))
        
        if abs(func_count_a - func_count_b) > 2:
            which = Path(file_a).name if func_count_a > func_count_b else Path(file_b).name
            summary.append(f"{which} has {abs(func_count_a - func_count_b)} more helper functions")
        
        # Return top 5
        if not summary:
            summary.append("Files are nearly identical in structure and implementation")
        
        return summary[:5]
    
    @staticmethod
    def _count_hooks(content: str) -> Dict[str, int]:
        """Count hook usage in content"""
        counts = {}
        for hook in HOOK_PATTERNS:
            count = len(re.findall(rf'\b{hook}\s*\(', content))
            if count > 0:
                counts[hook] = count
        return counts

# ============================================================================
# DUPLICATE DETECTOR (MULTI-LAYER)
# ============================================================================

class DuplicateDetector:
    """Advanced multi-layer duplicate detection engine"""
    
    def __init__(self, files: Dict[str, FileInfo], logger: AnalysisLogger):
        self.files = files
        self.logger = logger
        self.clusters: List[DuplicateCluster] = []
        self.cluster_counter = 0
    
    def analyze(self) -> List[DuplicateCluster]:
        """Perform all duplicate detection layers"""
        self.logger.info("Detecting duplicates (multi-layer)...")
        
        self._detect_exact_duplicates()
        self._detect_structural_duplicates()
        
        self.logger.info(f"Found {len(self.clusters)} duplicate clusters")
        return self.clusters
    
    def _detect_exact_duplicates(self):
        """Layer 1: Find files with identical content"""
        hash_groups = defaultdict(list)
        
        for path, meta in self.files.items():
            if meta.size > 100 and not meta.is_test_file:
                hash_groups[meta.content_hash].append(path)
        
        for content_hash, paths in hash_groups.items():
            if len(paths) > 1:
                self._create_cluster(paths, 1.0, 'exact')
    
    def _detect_structural_duplicates(self):
        """Layer 2: Find files with similar structure"""
        processed = set()
        
        # Group by structural hash first for efficiency
        struct_groups = defaultdict(list)
        for path, meta in self.files.items():
            if path not in processed and not meta.is_test_file and meta.size > 100:
                struct_groups[meta.structural_hash].append(path)
        
        for struct_hash, candidates in struct_groups.items():
            if len(candidates) < 2:
                continue
            
            # Compute pairwise similarities
            for i, path_a in enumerate(candidates):
                if path_a in processed:
                    continue
                
                cluster = [path_a]
                
                for path_b in candidates[i+1:]:
                    if path_b in processed:
                        continue
                    
                    similarity = StructuralSimilarityAnalyzer.compute_structural_similarity(
                        path_a, path_b
                    )
                    
                    if similarity >= Config.SIMILARITY_THRESHOLD:
                        cluster.append(path_b)
                        processed.add(path_b)
                
                if len(cluster) > 1:
                    # Compute average similarity
                    similarities = []
                    for j in range(len(cluster)):
                        for k in range(j+1, len(cluster)):
                            sim = StructuralSimilarityAnalyzer.compute_structural_similarity(
                                cluster[j], cluster[k]
                            )
                            similarities.append(sim)
                    
                    avg_similarity = sum(similarities) / len(similarities) if similarities else 0.85
                    self._create_cluster(cluster, avg_similarity, 'structural')
                    processed.update(cluster)
    
    def _create_cluster(self, paths: List[str], similarity: float, cluster_type: str):
        """Create a duplicate cluster with comprehensive analysis"""
        self.cluster_counter += 1
        cluster_id = f"dup_{self.cluster_counter:04d}"
        
        # Compute metrics
        exported_count = sum(1 for p in paths if self.files[p].exports)
        recent_count = sum(1 for p in paths if self.files[p].last_modified_days < 60)
        
        # Select base file using comprehensive scoring
        file_scores = []
        for path in paths:
            meta = self.files[path]
            score = (
                meta.stability_score * 10 +
                len(meta.dependents) * 20 +
                len(meta.exports) * 5 +
                meta.last_modified_days * 0.1 +
                (10 if not meta.has_side_effects else 0) +
                (5 if meta.any_count == 0 else -meta.any_count)
            )
            file_scores.append((path, score))
        
        file_scores.sort(key=lambda x: x[1], reverse=True)
        suggested_base = file_scores[0][0]
        
        # Select merge target (second best)
        suggested_merge_target = file_scores[1][0] if len(file_scores) > 1 else None
        
        # Generate diff summary
        diff_summary = []
        if len(paths) >= 2:
            try:
                with open(paths[0], 'r', encoding='utf-8', errors='ignore') as f:
                    content_a = f.read()
                with open(paths[1], 'r', encoding='utf-8', errors='ignore') as f:
                    content_b = f.read()
                
                diff_summary = DiffSummarizer.generate_diff_summary(
                    paths[0], paths[1], content_a, content_b
                )
            except:
                diff_summary = ["Unable to generate diff summary"]
        
        # Determine risk and recommendation
        if cluster_type == 'exact':
            risk = RiskLevel.LOW
            recommendation = Recommendation.CONSOLIDATE_DUPLICATES
            confidence = 0.95
        else:
            # Check for diverging implementations
            has_exports = any(self.files[p].exports for p in paths)
            has_recent = any(self.files[p].last_modified_days < 30 for p in paths)
            has_dependents = any(len(self.files[p].dependents) > 0 for p in paths)
            
            if has_exports and has_recent and has_dependents:
                risk = RiskLevel.HIGH
                recommendation = Recommendation.INVESTIGATE
                confidence = 0.60
            elif has_exports or has_dependents:
                risk = RiskLevel.MEDIUM
                recommendation = Recommendation.MERGE_INTO_ANOTHER_FILE
                confidence = 0.75
            else:
                risk = RiskLevel.LOW
                recommendation = Recommendation.CONSOLIDATE_DUPLICATES
                confidence = 0.80
        
        # Calculate estimated savings
        total_lines = sum(self.files[p].lines for p in paths)
        base_lines = self.files[suggested_base].lines
        estimated_savings = total_lines - base_lines
        
        cluster = DuplicateCluster(
            cluster_id=cluster_id,
            files=paths,
            cluster_size=len(paths),
            similarity_score=similarity,
            exported_files_count=exported_count,
            recent_files_count=recent_count,
            suggested_base_file=suggested_base,
            suggested_merge_target=suggested_merge_target,
            diff_summary=diff_summary,
            risk_level=risk,
            recommendation=recommendation,
            confidence_score=confidence,
            type=cluster_type,
            estimated_savings=estimated_savings
        )
        
        self.clusters.append(cluster)
        
        # Mark files with cluster ID
        for path in paths:
            self.files[path].duplicate_cluster_id = cluster_id

# ============================================================================
# DEPENDENCY GRAPH BUILDER
# ============================================================================

class DependencyGraphBuilder:
    """Build cross-reference dependency graph with barrel awareness"""
    
    def __init__(self, files: Dict[str, FileInfo], logger: AnalysisLogger):
        self.files = files
        self.logger = logger
        self.barrel_files: Set[str] = set()
    
    def build(self):
        """Build dependency relationships"""
        self.logger.info("Building dependency graph...")
        
        # Identify barrel files
        self._identify_barrels()
        
        # Build direct dependencies
        for path, meta in self.files.items():
            for imp in meta.imports:
                resolved = self._resolve_import(path, imp)
                if resolved and resolved in self.files:
                    self.files[resolved].dependents.add(path)
                    meta.dependencies.add(resolved)
        
        # Update dependents count
        for path, meta in self.files.items():
            meta.dependents_count = len(meta.dependents)
        
        # Mark barrel-exported files
        self._mark_barrel_exports()
        
        self.logger.info("Dependency graph built")
    
    def _identify_barrels(self):
        """Identify barrel/index files"""
        for path, meta in self.files.items():
            if meta.name in {'index.ts', 'index.tsx', 'index.js', 'index.jsx'}:
                # Check if it re-exports
                try:
                    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    
                    export_count = len(re.findall(r'export\s+\{', content))
                    export_from_count = len(re.findall(r'export\s+.*\s+from', content))
                    
                    if export_count >= Config.BARREL_EXPORT_THRESHOLD or export_from_count >= Config.BARREL_EXPORT_THRESHOLD:
                        self.barrel_files.add(path)
                        meta.category = FileCategory.BARREL_EXPORT
                except:
                    pass
    
    def _mark_barrel_exports(self):
        """Mark files that are exported via barrels"""
        for barrel_path in self.barrel_files:
            try:
                with open(barrel_path, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                # Extract re-exported files
                for match in re.finditer(r'export\s+.*\s+from\s+[\'"]([^\'"]+)[\'"]', content):
                    import_path = match.group(1)
                    resolved = self._resolve_import(barrel_path, import_path)
                    if resolved and resolved in self.files:
                        self.files[resolved].is_barrel_exported = True
            except:
                pass
    
    def _resolve_import(self, from_path: str, import_path: str) -> Optional[str]:
        """Resolve import statement to actual file path"""
        if import_path.startswith('.'):
            base_dir = Path(from_path).parent
            target = (base_dir / import_path).resolve()
            
            for ext in ['.ts', '.tsx', '.js', '.jsx', '']:
                candidate = str(target) + ext
                if candidate in self.files:
                    return candidate
                
                index_candidate = str(target / 'index') + ext
                if index_candidate in self.files:
                    return index_candidate
        
        return None

# ============================================================================
# USAGE ANALYZER
# ============================================================================

class UsageAnalyzer:
    """Analyze file usage and detect unused/unwired features"""
    
    def __init__(self, files: Dict[str, FileInfo], logger: AnalysisLogger):
        self.files = files
        self.logger = logger
        self.unused: List[str] = []
        self.unwired: List[str] = []
        
    def analyze(self):
        """Perform usage analysis"""
        self.logger.info("Analyzing file usage patterns...")
        
        self._detect_unused()
        self._detect_unwired()
        
        self.logger.info(f"Found {len(self.unused)} unused files")
        self.logger.info(f"Found {len(self.unwired)} unwired features")
    
    def _detect_unused(self):
        """Detect likely unused files with false-positive reduction"""
        for path, meta in self.files.items():
            # Skip entry points
            if meta.is_entry_point:
                continue
            
            # Skip config, assets, tests
            if meta.category in {FileCategory.CONFIGURATION, FileCategory.ASSET, FileCategory.TEST}:
                continue
            
            # Skip framework core
            if meta.category == FileCategory.FRAMEWORK_CORE:
                continue
            
            # Skip barrel exports
            if meta.category == FileCategory.BARREL_EXPORT:
                continue
            
            # Skip dynamically imported
            if meta.is_dynamic_imported:
                continue
            
            # Skip barrel-exported
            if meta.is_barrel_exported:
                continue
            
            # Check usage
            if meta.dependents_count == 0 and meta.exports:
                self.unused.append(path)
    
    def _detect_unwired(self):
        """Detect features not integrated into app"""
        for path, meta in self.files.items():
            if path in self.unused:
                continue
            
            # Look for substantial files with no dependents
            if (meta.dependents_count == 0 and 
                meta.lines > 50 and 
                len(meta.exports) > 2 and
                meta.category in {FileCategory.SERVICE, FileCategory.UI_COMPONENT, 
                                 FileCategory.CUSTOM_HOOK, FileCategory.CORE_LOGIC} and
                not meta.is_dynamic_imported and
                not meta.is_barrel_exported):
                self.unwired.append(path)

# ============================================================================
# STABILITY & RISK CALCULATOR
# ============================================================================

class StabilityCalculator:
    """Calculate stability and risk scores with enhanced logic"""
    
    def __init__(self, files: Dict[str, FileInfo], logger: AnalysisLogger):
        self.files = files
        self.logger = logger
    
    def calculate(self):
        """Calculate all scores"""
        self.logger.info("Computing stability and risk metrics...")
        
        for path, meta in self.files.items():
            meta.stability_score = self._compute_stability(meta)
            meta.risk_level = self._compute_risk_level(meta)
            meta.short_reason = self._generate_short_reasoning(meta)
        
        self.logger.info("Stability and risk metrics computed")
    
    def _compute_stability(self, meta: FileInfo) -> float:
        """Compute stability score (0-10) with enhanced factors"""
        score = 0.0
        
        # Dependents weight (max 4.0)
        score += min(meta.dependents_count * 0.4, 4.0)
        
        # Export count weight (max 2.0)
        score += min(len(meta.exports) * 0.2, 2.0)
        
        # Size/complexity weight (max 2.0)
        score += min(meta.lines * 0.01, 1.0)
        score += min(meta.complexity_estimate * 0.02, 1.0)
        
        # Recency weight (max 2.0)
        age_days = meta.last_modified_days
        score += max(2.0 - (age_days * 0.01), 0)
        
        # Type safety penalty
        if meta.any_count > 0:
            score -= min(meta.any_count * 0.1, 1.0)
        
        # Barrel export boost
        if meta.is_barrel_exported:
            score += 1.0
        
        # Dynamic import boost
        if meta.is_dynamic_imported:
            score += 1.5
        
        # Framework core boost
        if meta.category == FileCategory.FRAMEWORK_CORE:
            score += 2.0
        
        # Shared module boost
        if meta.dependents_count > 5:
            score += Config.SHARED_MODULE_BOOST
        
        return max(min(score, 10.0), 0.0)
    
    def _compute_risk_level(self, meta: FileInfo) -> RiskLevel:
        """Compute refactoring risk level"""
        risk_score = 0
        
        # High dependents = high risk
        risk_score += min(meta.dependents_count * 5, 50)
        
        # Entry points are critical
        if meta.is_entry_point:
            risk_score += 40
        
        # Critical categories
        if meta.category in {FileCategory.PAGE_OR_ROUTE, FileCategory.CONTEXT, 
                            FileCategory.STORE_OR_STATE, FileCategory.FRAMEWORK_CORE}:
            risk_score += 30
        
        # Side effects increase risk
        if meta.has_side_effects:
            risk_score += 15
        
        # High complexity
        if meta.complexity_estimate > Config.COMPLEXITY_HIGH_THRESHOLD:
            risk_score += 20
        
        # Dynamic import protection
        if meta.is_dynamic_imported:
            risk_score += 25
        
        # Weak typing
        risk_score += min(meta.any_count * 2, 20)
        
        if risk_score >= 70:
            return RiskLevel.CRITICAL
        elif risk_score >= 50:
            return RiskLevel.HIGH
        elif risk_score >= 30:
            return RiskLevel.MEDIUM
        else:
            return RiskLevel.LOW
    
    def _generate_short_reasoning(self, meta: FileInfo) -> str:
        """Generate short reasoning for recommendation"""
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
        
        return " | ".join(reasons) if reasons else "Standard file"

# ============================================================================
# ARCHIVE DECISION ENGINE
# ============================================================================

class ArchiveDecisionEngine:
    """Enterprise-grade archive eligibility evaluation"""
    
    def __init__(self, files: Dict[str, FileInfo], logger: AnalysisLogger):
        self.files = files
        self.logger = logger
    
    def evaluate_archive_candidate(self, file_info: FileInfo) -> ArchiveDecision:
        """
        Evaluate if a file is eligible for archiving with enterprise-grade checks.
        
        Hard blockers immediately disqualify a file.
        If no blockers, compute confidence score and determine recommendation.
        
        Args:
            file_info: File metadata to evaluate
            
        Returns:
            ArchiveDecision with comprehensive analysis
        """
        blockers = []
        reasons = []
        alternatives = []
        
        # === HARD BLOCKERS ===
        
        # Category blockers
        if file_info.category in {FileCategory.PAGE_OR_ROUTE, FileCategory.CONTEXT, 
                                  FileCategory.STORE_OR_STATE, FileCategory.FRAMEWORK_CORE,
                                  FileCategory.BARREL_EXPORT}:
            blockers.append(f"Critical category: {file_info.category.value}")
            alternatives.append("Consider refactoring if problematic, not archiving")
        
        # Dynamic import blocker
        if file_info.is_dynamic_imported:
            blockers.append("Dynamically imported - required for code splitting")
            alternatives.append("Verify all dynamic import references before considering")
        
        # Recent modification blocker
        if file_info.last_modified_days < Config.RECENT_DAYS_BLOCKER:
            blockers.append(f"Recently modified ({file_info.last_modified_days} days ago)")
            alternatives.append("Wait for stabilization period (30+ days)")
        
        # Dependents blocker
        if file_info.dependents_count > 0:
            blockers.append(f"Has {file_info.dependents_count} active dependents")
            alternatives.append("Remove all imports first, then reconsider")
        
        # Barrel export blocker
        if file_info.is_barrel_exported:
            blockers.append("Exported via barrel index - part of public API")
            alternatives.append("Remove from barrel exports, verify no external usage")
        
        # Infrastructure path blocker
        if any(infra in file_info.path.lower() for infra in INFRASTRUCTURE_PATHS):
            blockers.append("Infrastructure/core path - critical for system")
            alternatives.append("Do not archive infrastructure files")
        
        # Test fixture blocker
        if file_info.is_test_file and file_info.dependents_count > 0:
            blockers.append("Test fixture with dependents")
            alternatives.append("Ensure test coverage before archiving utilities")
        
        # Entry point blocker
        if file_info.is_entry_point:
            blockers.append("Application entry point - absolutely critical")
            alternatives.append("Never archive entry points")
        
        # If any hard blockers, return immediately
        if blockers:
            impact = f"Archiving would break {file_info.dependents_count} dependent file(s)" if file_info.dependents_count > 0 else "Critical system file"
            
            return ArchiveDecision(
                allowed=False,
                decision=Recommendation.KEEP_AS_IS,
                score=0.0,
                reasons=reasons,
                blockers=blockers,
                confidence=1.0,
                impact_analysis=impact,
                alternatives=alternatives
            )
        
        # === CONFIDENCE SCORE CALCULATION ===
        
        score = 50.0  # Baseline
        
        # Positive factors (increase confidence)
        if file_info.dependents_count == 0:
            score += 15
            reasons.append("No active dependents found")
        
        if not file_info.exports:
            score += 10
            reasons.append("No exports - internal implementation only")
        
        if file_info.last_modified_days > 180:
            score += 10
            reasons.append(f"Dormant for {file_info.last_modified_days} days")
        elif file_info.last_modified_days > 90:
            score += 5
            reasons.append(f"Not modified in {file_info.last_modified_days} days")
        
        if file_info.stability_score < 3.0:
            score += 8
            reasons.append(f"Low stability score ({file_info.stability_score:.1f}/10)")
        
        if file_info.lines < 50:
            score += 5
            reasons.append("Small file - low impact")
        
        if file_info.category in {FileCategory.UTILITY, FileCategory.UNKNOWN}:
            score += 5
            reasons.append("Non-critical category")
        
        # Negative factors (decrease confidence)
        if file_info.exports and len(file_info.exports) > 0:
            score -= 10
            reasons.append(f"Has {len(file_info.exports)} exports")
        
        if file_info.has_side_effects:
            score -= 15
            reasons.append("Contains side effects - potential runtime impact")
        
        if file_info.complexity_estimate > 20:
            score -= 10
            reasons.append(f"High complexity ({file_info.complexity_estimate})")
        
        if file_info.is_react_component:
            score -= 8
            reasons.append("React component - may be reusable")
        
        if file_info.is_custom_hook:
            score -= 8
            reasons.append("Custom hook - potential shared logic")
        
        if len(file_info.hook_usage) > 3:
            score -= 5
            reasons.append(f"Uses {len(file_info.hook_usage)} hooks")
        
        if file_info.any_count > 5:
            score -= 5
            reasons.append("Weak type safety")
        
        # Determine decision based on score
        if score >= Config.ARCHIVE_SCORE_THRESHOLD:
            decision = Recommendation.SAFE_TO_ARCHIVE
            confidence = 0.85
            impact = "Minimal - no active dependencies"
            alternatives = [
                "Archive with full metadata preservation",
                "Can be restored if needed",
                "Monitor for 30 days post-archive"
            ]
        elif score >= Config.INVESTIGATE_LOW_THRESHOLD:
            decision = Recommendation.INVESTIGATE
            confidence = 0.70
            impact = "Low risk but requires careful review"
            alternatives = [
                "Review usage history in version control",
                "Check for indirect references",
                "Consider archiving after verification"
            ]
            reasons.append("Low risk but needs manual review")
        elif score >= Config.INVESTIGATE_MEDIUM_THRESHOLD:
            decision = Recommendation.INVESTIGATE
            confidence = 0.55
            impact = "Medium risk - thorough review required"
            alternatives = [
                "Detailed code review recommended",
                "Check for dynamic references",
                "Verify no indirect usage patterns"
            ]
            reasons.append("Medium risk - careful review needed")
        else:
            decision = Recommendation.KEEP_AS_IS
            confidence = 0.40
            impact = "Risk too high for archival"
            alternatives = [
                "Keep file as-is",
                "Monitor for future changes",
                "Reconsider after refactoring"
            ]
            reasons.append("Risk too high for archival")
        
        return ArchiveDecision(
            allowed=(score >= Config.INVESTIGATE_MEDIUM_THRESHOLD),
            decision=decision,
            score=score,
            reasons=reasons,
            blockers=[],
            confidence=confidence,
            impact_analysis=impact,
            alternatives=alternatives
        )

# ============================================================================
# ARCHIVE BUILDER
# ============================================================================

class ArchiveBuilder:
    """Build safe non-destructive archive packages"""
    
    def __init__(self, project_path: str, report_folder: Path, files: Dict[str, FileInfo], logger: AnalysisLogger):
        self.project_path = Path(project_path)
        self.report_folder = report_folder
        self.files = files
        self.logger = logger
        self.archive_dir = report_folder / 'refactor_temp' / 'archived_files'
        
    def create_safe_archive(self, candidates: List[str], keep_temp: bool = False) -> Optional[str]:
        """
        Create safe archive package with verification.
        
        Args:
            candidates: List of file paths to archive
            keep_temp: Whether to keep temp folder after zipping
            
        Returns:
            Path to created archive or None if failed
        """
        if not candidates:
            self.logger.warning("No files to archive")
            return None
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        archive_name = f"refactor_archive_{timestamp}.zip"
        archives_folder = self.report_folder / 'archives'
        archives_folder.mkdir(exist_ok=True)
        archive_path = archives_folder / archive_name
        
        self.logger.info(f"Creating safe archive package: {archive_name}")
        
        # Create temp directory
        self.archive_dir.mkdir(parents=True, exist_ok=True)
        
        # Metadata for archive
        metadata = {
            'timestamp': timestamp,
            'total_files': len(candidates),
            'tool_version': Config.TOOL_VERSION,
            'files': []
        }
        
        # Copy files
        copied_count = 0
        for file_path in candidates:
            try:
                source = Path(file_path)
                relative = source.relative_to(self.project_path)
                target = self.archive_dir / relative
                
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(source, target)
                
                meta = self.files[file_path]
                metadata['files'].append({
                    'path': str(relative),
                    'size': meta.size,
                    'lines': meta.lines,
                    'category': meta.category.value,
                    'risk_level': meta.risk_level.value,
                    'stability_score': meta.stability_score,
                    'recommendation': meta.recommendation.value,
                    'reasoning': meta.short_reason,
                    'last_modified_days': meta.last_modified_days
                })
                
                copied_count += 1
                
            except Exception as e:
                self.logger.error(f"Error archiving {file_path}: {e}")
        
        # Write metadata
        metadata_path = self.archive_dir.parent / 'metadata.json'
        with open(metadata_path, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, indent=2)
        
        # Create ZIP
        try:
            with zipfile.ZipFile(archive_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for root, dirs, files in os.walk(self.archive_dir.parent):
                    for file in files:
                        file_path = Path(root) / file
                        arcname = file_path.relative_to(self.archive_dir.parent)
                        zipf.write(file_path, arcname)
            
            # Verify ZIP integrity
            with zipfile.ZipFile(archive_path, 'r') as zipf:
                zip_entries = zipf.namelist()
                assert len(zip_entries) > 0, "ZIP file is empty"
                self.logger.info(f"ZIP verification passed: {len(zip_entries)} entries")
            
        except Exception as e:
            self.logger.error(f"Error creating ZIP: {e}")
            return None
        
        # Clean temp if requested
        if not keep_temp:
            try:
                shutil.rmtree(self.archive_dir.parent)
            except:
                pass
        
        # Create archive metadata summary
        archive_metadata = {
            'archive_file': archive_name,
            'created_at': timestamp,
            'files_archived': copied_count,
            'total_size': sum(self.files[f].size for f in candidates),
            'archive_path': str(archive_path)
        }
        
        archive_metadata_path = self.report_folder / 'archive_metadata.json'
        with open(archive_metadata_path, 'w', encoding='utf-8') as f:
            json.dump(archive_metadata, f, indent=2)
        
        self.logger.info(f"Archive created successfully: {archive_path}")
        self.logger.info(f"Archived {copied_count} files")
        
        return str(archive_path)

# ============================================================================
# REPORT GENERATOR
# ============================================================================

class ReportGenerator:
    """Generate all report formats with comprehensive analysis"""
    
    def __init__(self, report: AnalysisReport, report_folder: Path, logger: AnalysisLogger):
        self.report = report
        self.report_folder = report_folder
        self.logger = logger
    
    def generate_all(self):
        """Generate all report formats"""
        self.logger.info("Generating comprehensive reports...")
        
        self.generate_full_json()
        self.generate_summary_json()
        self.generate_high_risk_csv()
        self.generate_html_dashboard()
        self.generate_report_index()
        
        self.logger.info(f"All reports generated in: {self.report_folder}")
    
    def generate_full_json(self):
        """Generate full_report.json"""
        output_path = self.report_folder / 'full_report.json'
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(asdict(self.report), f, indent=2, default=str)
        
        self.logger.info(f"Full report: {output_path.name}")
    
    def generate_summary_json(self):
        """Generate summary_report.json"""
        output_path = self.report_folder / 'summary_report.json'
        
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
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2)
        
        self.logger.info(f"Summary report: {output_path.name}")
    
    def generate_high_risk_csv(self):
        """Generate high_risk.csv"""
        output_path = self.report_folder / 'high_risk.csv'
        
        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(['File', 'Risk', 'Stability', 'Recommendation', 'Reasoning'])
            
            for path, file_data in self.report.files.items():
                if file_data['risk_level'] in ['HIGH', 'CRITICAL']:
                    writer.writerow([
                        file_data['relative_path'],
                        file_data['risk_level'],
                        f"{file_data['stability_score']:.1f}",
                        file_data['recommendation'],
                        file_data['short_reason']
                    ])
        
        self.logger.info(f"High risk CSV: {output_path.name}")
    
    def generate_html_dashboard(self):
        """Generate comprehensive optimization_dashboard.html"""
        output_path = self.report_folder / 'optimization_dashboard.html'
        
        html = self._build_comprehensive_html()
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html)
        
        self.logger.info(f"HTML dashboard: {output_path.name}")
    
    def generate_report_index(self):
        """Generate centralized report index in /reports folder"""
        reports_root = self.report_folder.parent
        index_path = reports_root / 'index.html'
        
        # Scan all report folders
        report_folders = []
        if reports_root.exists():
            for folder in sorted(reports_root.iterdir(), reverse=True):
                if folder.is_dir() and folder.name != 'index.html':
                    summary_file = folder / 'summary_report.json'
                    if summary_file.exists():
                        try:
                            with open(summary_file, 'r', encoding='utf-8') as f:
                                summary = json.load(f)
                                report_folders.append({
                                    'folder': folder.name,
                                    'timestamp': summary['metadata']['start_time'],
                                    'files': summary['totals']['files'],
                                    'unused': summary['totals']['unused'],
                                    'duplicates': summary['totals']['duplicates']
                                })
                        except:
                            pass
        
        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>G-Studio Analysis Reports Index</title>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #0a0e27 0%, #1a1f3a 100%);
            color: #e2e8f0;
            padding: 40px 20px;
            min-height: 100vh;
        }}
        .container {{
            max-width: 1200px;
            margin: 0 auto;
        }}
        h1 {{
            font-size: 36px;
            margin-bottom: 12px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }}
        .subtitle {{
            color: #94a3b8;
            margin-bottom: 40px;
        }}
        .report-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 24px;
            margin-top: 32px;
        }}
        .report-card {{
            background: rgba(20, 27, 58, 0.8);
            border: 1px solid rgba(99, 102, 241, 0.2);
            border-radius: 12px;
            padding: 24px;
            transition: all 0.3s ease;
            cursor: pointer;
        }}
        .report-card:hover {{
            border-color: #6366f1;
            transform: translateY(-4px);
            box-shadow: 0 8px 24px rgba(99, 102, 241, 0.2);
        }}
        .report-title {{
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 12px;
            color: #6366f1;
        }}
        .report-meta {{
            color: #94a3b8;
            font-size: 14px;
            margin-bottom: 16px;
        }}
        .report-stats {{
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
        }}
        .stat {{
            text-align: center;
            padding: 12px;
            background: rgba(99, 102, 241, 0.1);
            border-radius: 8px;
        }}
        .stat-value {{
            font-size: 24px;
            font-weight: 700;
            color: #6366f1;
        }}
        .stat-label {{
            font-size: 11px;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }}
        .no-reports {{
            text-align: center;
            padding: 60px;
            color: #94a3b8;
        }}
        a {{
            color: inherit;
            text-decoration: none;
        }}
    </style>
</head>
<body>
    <div class="container">
        <h1>📊 G-Studio Analysis Reports</h1>
        <div class="subtitle">Centralized dashboard for all code intelligence reports</div>
        
        <div class="report-grid">
"""
        
        if report_folders:
            for report in report_folders:
                html += f"""
            <a href="{report['folder']}/optimization_dashboard.html">
                <div class="report-card">
                    <div class="report-title">Report: {report['folder']}</div>
                    <div class="report-meta">{report['timestamp']}</div>
                    <div class="report-stats">
                        <div class="stat">
                            <div class="stat-value">{report['files']}</div>
                            <div class="stat-label">Files</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">{report['unused']}</div>
                            <div class="stat-label">Unused</div>
                        </div>
                        <div class="stat">
                            <div class="stat-value">{report['duplicates']}</div>
                            <div class="stat-label">Duplicates</div>
                        </div>
                    </div>
                </div>
            </a>
"""
        else:
            html += """
            <div class="no-reports">
                <h2>No reports found</h2>
                <p>Run an analysis to generate your first report</p>
            </div>
"""
        
        html += """
        </div>
    </div>
</body>
</html>"""
        
        with open(index_path, 'w', encoding='utf-8') as f:
            f.write(html)
        
        self.logger.info(f"Report index: {index_path}")
    
    def _build_comprehensive_html(self) -> str:
        """Build comprehensive HTML document with all analysis sections"""
        files_json = json.dumps(self.report.files, default=str)
        duplicates_json = json.dumps(self.report.duplicate_clusters, default=str)
        recommendations_json = json.dumps(self.report.recommendations, default=str)
        
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Enterprise Code Intelligence Dashboard — {self.report.metadata['start_time']}</title>
    <style>{self._get_comprehensive_styles()}</style>
</head>
<body>
    <div class="dashboard">
        {self._build_header()}
        {self._build_safety_banner()}
        {self._build_executive_summary()}
        {self._build_quality_metrics()}
        {self._build_recommendations_section()}
        {self._build_duplicates_section()}
        {self._build_unused_section()}
        {self._build_unwired_section()}
        {self._build_archive_section()}
        {self._build_category_breakdown()}
        {self._build_footer()}
    </div>
    <script>
        const filesData = {files_json};
        const duplicatesData = {duplicates_json};
        const recommendationsData = {recommendations_json};
        {self._get_comprehensive_scripts()}
    </script>
</body>
</html>"""
    
    def _get_comprehensive_styles(self) -> str:
        """Generate comprehensive CSS styles"""
        return """
* { margin: 0; padding: 0; box-sizing: border-box; }

:root {
    --bg-primary: #0a0e27;
    --bg-secondary: #141b3a;
    --bg-card: rgba(20, 27, 58, 0.8);
    --border: rgba(99, 102, 241, 0.2);
    --text-primary: #e2e8f0;
    --text-secondary: #94a3b8;
    --accent: #6366f1;
    --success: #10b981;
    --warning: #f59e0b;
    --danger: #ef4444;
    --info: #3b82f6;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    background: linear-gradient(135deg, var(--bg-primary) 0%, #1a1f3a 100%);
    color: var(--text-primary);
    min-height: 100vh;
    line-height: 1.6;
}

.dashboard {
    max-width: 1600px;
    margin: 0 auto;
    padding: 20px;
}

.header {
    background: var(--bg-card);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 30px;
    margin-bottom: 20px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}

.header h1 {
    font-size: 32px;
    font-weight: 700;
    margin-bottom: 12px;
    background: linear-gradient(135deg, var(--accent), #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.header .subtitle {
    color: var(--text-secondary);
    font-size: 16px;
    margin-bottom: 16px;
}

.header .meta {
    color: var(--text-secondary);
    font-size: 14px;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 12px;
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 8px;
}

.meta-label {
    font-weight: 600;
    color: var(--accent);
}

.safety-banner {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(16, 185, 129, 0.05));
    border: 2px solid var(--success);
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 30px;
    text-align: center;
}

.safety-banner h2 {
    color: var(--success);
    font-size: 22px;
    margin-bottom: 12px;
    font-weight: 700;
}

.safety-banner p {
    color: var(--text-secondary);
    font-size: 15px;
    line-height: 1.8;
}

.executive-summary {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.stat-card {
    background: var(--bg-card);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
}

.stat-card::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--accent), #8b5cf6);
    opacity: 0;
    transition: opacity 0.3s ease;
}

.stat-card:hover {
    transform: translateY(-4px);
    border-color: var(--accent);
    box-shadow: 0 8px 32px rgba(99, 102, 241, 0.2);
}

.stat-card:hover::before {
    opacity: 1;
}

.stat-card .label {
    color: var(--text-secondary);
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
    font-weight: 600;
}

.stat-card .value {
    font-size: 36px;
    font-weight: 700;
    margin-bottom: 8px;
}

.stat-card .subtext {
    color: var(--text-secondary);
    font-size: 13px;
}

.stat-card .trend {
    display: inline-block;
    margin-left: 8px;
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 600;
}

.trend.positive { background: rgba(16, 185, 129, 0.2); color: var(--success); }
.trend.negative { background: rgba(239, 68, 68, 0.2); color: var(--danger); }

.section {
    background: var(--bg-card);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 30px;
    margin-bottom: 30px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.2);
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border);
}

.section-title {
    font-size: 22px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 12px;
}

.section-icon {
    font-size: 28px;
}

.section-description {
    color: var(--text-secondary);
    font-size: 14px;
    margin-bottom: 20px;
    line-height: 1.6;
}

.cluster, .recommendation-card, .file-card {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 16px;
    transition: all 0.3s ease;
}

.cluster:hover, .recommendation-card:hover, .file-card:hover {
    border-color: var(--accent);
    box-shadow: 0 4px 16px rgba(99, 102, 241, 0.1);
}

.cluster-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.cluster-title {
    font-size: 16px;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 12px;
}

.file-list {
    list-style: none;
    margin: 12px 0;
}

.file-item {
    padding: 12px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    margin-bottom: 8px;
    font-family: 'Courier New', Consolas, Monaco, monospace;
    font-size: 13px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.file-item-path {
    flex: 1;
}

.file-item-meta {
    display: flex;
    gap: 12px;
    font-size: 11px;
    color: var(--text-secondary);
}

.badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    margin-left: 8px;
}

.badge.low { background: rgba(16, 185, 129, 0.2); color: var(--success); }
.badge.medium { background: rgba(245, 158, 11, 0.2); color: var(--warning); }
.badge.high { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
.badge.critical { background: rgba(239, 68, 68, 0.3); color: #ff6b6b; }
.badge.info { background: rgba(59, 130, 246, 0.2); color: var(--info); }

.recommendation-content {
    padding: 16px;
    background: rgba(99, 102, 241, 0.05);
    border-left: 3px solid var(--accent);
    border-radius: 8px;
    margin-top: 12px;
}

.recommendation-title {
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--accent);
    font-size: 15px;
}

.reasoning-list {
    list-style: none;
    margin-top: 12px;
}

.reasoning-list li {
    padding: 6px 0;
    padding-left: 20px;
    position: relative;
    color: var(--text-secondary);
}

.reasoning-list li:before {
    content: "→";
    position: absolute;
    left: 0;
    color: var(--accent);
    font-weight: bold;
}

table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 20px;
}

th, td {
    padding: 14px;
    text-align: left;
    border-bottom: 1px solid var(--border);
}

th {
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    background: rgba(99, 102, 241, 0.05);
}

tr:hover {
    background: rgba(255, 255, 255, 0.05);
}

.progress-bar {
    width: 100%;
    height: 8px;
    background: var(--bg-secondary);
    border-radius: 4px;
    overflow: hidden;
    margin: 8px 0;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), #8b5cf6);
    border-radius: 4px;
    transition: width 0.6s ease;
}

.quality-metrics {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-bottom: 30px;
}

.metric-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    text-align: center;
}

.metric-value {
    font-size: 32px;
    font-weight: 700;
    margin: 8px 0;
}

.metric-label {
    color: var(--text-secondary);
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.footer {
    text-align: center;
    padding: 40px 20px;
    color: var(--text-secondary);
    font-size: 14px;
}

.footer-links {
    display: flex;
    justify-content: center;
    gap: 24px;
    margin-top: 16px;
}

.footer-link {
    color: var(--accent);
    text-decoration: none;
    transition: color 0.3s ease;
}

.footer-link:hover {
    color: var(--text-primary);
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

.section {
    animation: fadeIn 0.6s ease;
}

@media (max-width: 768px) {
    .dashboard {
        padding: 12px;
    }
    
    .header h1 {
        font-size: 24px;
    }
    
    .executive-summary {
        grid-template-columns: 1fr;
    }
}
"""
    
    def _build_header(self) -> str:
        """Build comprehensive header section"""
        return f"""
<div class="header">
    <h1>🔬 Enterprise Code Intelligence Dashboard</h1>
    <div class="subtitle">Professional Static Analysis & Refactoring Intelligence Platform v{Config.TOOL_VERSION}</div>
    <div class="meta">
        <div class="meta-item">
            <span class="meta-label">Project:</span>
            <span>{self.report.metadata['scan_root']}</span>
        </div>
        <div class="meta-item">
            <span class="meta-label">Generated:</span>
            <span>{self.report.metadata['start_time']}</span>
        </div>
        <div class="meta-item">
            <span class="meta-label">Report Folder:</span>
            <span>{self.report.metadata['report_folder']}</span>
        </div>
        <div class="meta-item">
            <span class="meta-label">Analysis Duration:</span>
            <span>{self._calculate_duration()} seconds</span>
        </div>
    </div>
</div>
"""
    
    def _calculate_duration(self) -> str:
        """Calculate analysis duration"""
        try:
            start = datetime.fromisoformat(self.report.metadata['start_time'])
            end = datetime.fromisoformat(self.report.metadata['end_time'])
            duration = (end - start).total_seconds()
            return f"{duration:.2f}"
        except:
            return "N/A"
    
    def _build_safety_banner(self) -> str:
        """Build safety notice banner"""
        return """
<div class="safety-banner">
    <h2>✅ ANALYSIS OUTPUT — NO FILES WERE MODIFIED</h2>
    <p><strong>This is a read-only analysis report.</strong> All recommendations require explicit user confirmation.</p>
    <p>No source files have been altered, moved, or deleted. Archive operations are opt-in only.</p>
    <p>Review all recommendations carefully before taking action.</p>
</div>
"""
    
    def _build_executive_summary(self) -> str:
        """Build executive summary cards"""
        total_files = len(self.report.files)
        total_lines = sum(f['lines'] for f in self.report.files.values())
        total_size = sum(f['size'] for f in self.report.files.values()) / 1024 / 1024
        
        return f"""
<div class="executive-summary">
    <div class="stat-card">
        <div class="label">Total Files Analyzed</div>
        <div class="value">{total_files:,}</div>
        <div class="subtext">{total_lines:,} lines of code</div>
    </div>
    <div class="stat-card">
        <div class="label">Project Size</div>
        <div class="value">{total_size:.1f} MB</div>
        <div class="subtext">Across all file types</div>
    </div>
    <div class="stat-card">
        <div class="label">Duplicate Clusters</div>
        <div class="value">{len(self.report.duplicate_clusters)}</div>
        <div class="subtext">{self._calculate_duplicate_savings()} lines potential savings</div>
    </div>
    <div class="stat-card">
        <div class="label">Unused Files</div>
        <div class="value">{len(self.report.unused_candidates)}</div>
        <div class="subtext">Exported but not imported</div>
    </div>
    <div class="stat-card">
        <div class="label">Unwired Features</div>
        <div class="value">{len(self.report.unwired_candidates)}</div>
        <div class="subtext">Complete but not integrated</div>
    </div>
    <div class="stat-card">
        <div class="label">Archive Candidates</div>
        <div class="value">{len(self.report.archive_candidates)}</div>
        <div class="subtext">Safe to archive with review</div>
    </div>
    <div class="stat-card">
        <div class="label">Critical Files</div>
        <div class="value">{self._count_critical_files()}</div>
        <div class="subtext">High risk - do not modify</div>
    </div>
    <div class="stat-card">
        <div class="label">Recommendations</div>
        <div class="value">{len(self.report.recommendations)}</div>
        <div class="subtext">Actionable improvements</div>
    </div>
</div>
"""
    
    def _calculate_duplicate_savings(self) -> int:
        """Calculate potential line savings from duplicates"""
        return sum(c['estimated_savings'] for c in self.report.duplicate_clusters)
    
    def _count_critical_files(self) -> int:
        """Count critical risk files"""
        return sum(1 for f in self.report.files.values() if f['risk_level'] == 'CRITICAL')
    
    def _build_quality_metrics(self) -> str:
        """Build quality metrics section"""
        metrics = self.report.quality_metrics
        
        return f"""
<div class="section">
    <div class="section-header">
        <h2 class="section-title">
            <span class="section-icon">📊</span>
            Code Quality Metrics
        </h2>
    </div>
    <div class="quality-metrics">
        <div class="metric-card">
            <div class="metric-label">Average Stability</div>
            <div class="metric-value">{metrics.get('avg_stability', 0):.1f}/10</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Type Safety Score</div>
            <div class="metric-value">{metrics.get('type_safety_score', 0):.0f}%</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Avg Complexity</div>
            <div class="metric-value">{metrics.get('avg_complexity', 0):.1f}</div>
        </div>
        <div class="metric-card">
            <div class="metric-label">Test Coverage Est.</div>
            <div class="metric-value">{metrics.get('test_coverage_estimate', 0):.0f}%</div>
        </div>
    </div>
</div>
"""
    
    def _build_recommendations_section(self) -> str:
        """Build comprehensive recommendations section"""
        html = f"""
<div class="section">
    <div class="section-header">
        <h2 class="section-title">
            <span class="section-icon">💡</span>
            Professional Recommendations ({len(self.report.recommendations)})
        </h2>
    </div>
    <div class="section-description">
        Intelligent, context-aware recommendations prioritizing stability, maintainability, and minimal disruption.
        All recommendations have been evaluated for risk and impact.
    </div>
"""
        
        for i, rec in enumerate(self.report.recommendations[:20], 1):
            confidence_class = 'high' if rec['confidence'] > 0.8 else 'medium' if rec['confidence'] > 0.6 else 'low'
            
            html += f"""
    <div class="recommendation-card">
        <div class="cluster-header">
            <div class="cluster-title">
                <span>#{i}</span>
                <span>{rec['title']}</span>
                <span class="badge {rec['priority'].lower()}">{rec['priority']}</span>
                <span class="badge {confidence_class}">{rec['confidence']:.0%} confidence</span>
            </div>
        </div>
        <div class="recommendation-content">
            <div class="recommendation-title">{rec['action']}</div>
            <ul class="reasoning-list">
"""
            for reason in rec['reasoning']:
                html += f"                <li>{reason}</li>\n"
            
            html += f"""
            </ul>
            <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border);">
                <strong>Impact:</strong> {rec['impact']} | 
                <strong>Effort:</strong> {rec['effort']}
            </div>
        </div>
    </div>
"""
        
        if len(self.report.recommendations) > 20:
            html += f"""
    <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
        ... and {len(self.report.recommendations) - 20} more recommendations available in full_report.json
    </div>
"""
        
        html += "</div>"
        return html
    
    def _build_duplicates_section(self) -> str:
        """Build duplicates section"""
        html = f"""
<div class="section">
    <div class="section-header">
        <h2 class="section-title">
            <span class="section-icon">📋</span>
            Duplicate Clusters ({len(self.report.duplicate_clusters)})
        </h2>
    </div>
    <div class="section-description">
        Files with identical or highly similar implementations. Consider consolidating to reduce maintenance burden.
    </div>
"""
        
        for cluster in self.report.duplicate_clusters[:15]:
            html += f"""
    <div class="cluster">
        <div class="cluster-header">
            <div class="cluster-title">
                <strong>Cluster {cluster['cluster_id']}</strong>
                <span class="badge {cluster['risk_level'].lower()}">{cluster['risk_level']}</span>
                <span class="badge info">{cluster['similarity_score']:.0%} similar</span>
            </div>
            <div>
                <span style="color: var(--text-secondary);">{cluster['cluster_size']} files</span>
            </div>
        </div>
        <div style="margin-bottom: 12px;">
            <strong>Type:</strong> {cluster['type']} | 
            <strong>Estimated Savings:</strong> {cluster['estimated_savings']} lines
        </div>
        <div style="color: var(--text-secondary); margin-bottom: 12px;">
            <strong>Suggested Base:</strong> {Path(cluster['suggested_base_file']).name}
        </div>
        <div class="recommendation-content">
            <div class="recommendation-title">Recommendation: {cluster['recommendation']}</div>
            <ul class="reasoning-list">
"""
            for diff in cluster['diff_summary']:
                html += f"                <li>{diff}</li>\n"
            
            html += """
            </ul>
        </div>
    </div>
"""
        
        html += "</div>"
        return html
    
    def _build_unused_section(self) -> str:
        """Build unused files section"""
        html = f"""
<div class="section">
    <div class="section-header">
        <h2 class="section-title">
            <span class="section-icon">🗑️</span>
            Unused Files ({len(self.report.unused_candidates)})
        </h2>
    </div>
    <div class="section-description">
        Files with exports but no active dependents. Verify usage before archiving.
    </div>
"""
        
        if self.report.unused_candidates:
            html += '<table><thead><tr><th>File</th><th>Category</th><th>Lines</th><th>Exports</th><th>Last Modified</th></tr></thead><tbody>'
            
            for file_path in self.report.unused_candidates[:30]:
                file_data = self.report.files[file_path]
                html += f"""
            <tr>
                <td>{file_data['relative_path']}</td>
                <td>{file_data['category']}</td>
                <td>{file_data['lines']}</td>
                <td>{len(file_data['exported_symbols'])}</td>
                <td>{file_data['last_modified_days']} days ago</td>
            </tr>
"""
            
            html += '</tbody></table>'
            
            if len(self.report.unused_candidates) > 30:
                html += f"""
    <div style="text-align: center; padding: 20px; color: var(--text-secondary);">
        ... and {len(self.report.unused_candidates) - 30} more unused files
    </div>
"""
        else:
            html += '<p style="color: var(--text-secondary);">No unused files detected.</p>'
        
        html += '</div>'
        return html
    
    def _build_unwired_section(self) -> str:
        """Build unwired features section"""
        html = f"""
<div class="section">
    <div class="section-header">
        <h2 class="section-title">
            <span class="section-icon">🔌</span>
            Unwired Features ({len(self.report.unwired_candidates)})
        </h2>
    </div>
    <div class="section-description">
        Substantial implementations not integrated into the application. Consider wiring or removing.
    </div>
"""
        
        if self.report.unwired_candidates:
            html += '<table><thead><tr><th>File</th><th>Category</th><th>Lines</th><th>Complexity</th><th>Recommendation</th></tr></thead><tbody>'
            
            for file_path in self.report.unwired_candidates[:20]:
                file_data = self.report.files[file_path]
                html += f"""
            <tr>
                <td>{file_data['relative_path']}</td>
                <td>{file_data['category']}</td>
                <td>{file_data['lines']}</td>
                <td>{file_data['complexity_estimate']}</td>
                <td><span class="badge info">WIRE_TO_APPLICATION</span></td>
            </tr>
"""
            
            html += '</tbody></table>'
        else:
            html += '<p style="color: var(--text-secondary);">No unwired features detected.</p>'
        
        html += '</div>'
        return html
    
    def _build_archive_section(self) -> str:
        """Build archive candidates section"""
        html = f"""
<div class="section">
    <div class="section-header">
        <h2 class="section-title">
            <span class="section-icon">📦</span>
            Archive Candidates ({len(self.report.archive_candidates)})
        </h2>
    </div>
    <div class="section-description">
        Files meeting safety criteria for archiving. Use CLI to create archive with full verification.
    </div>
"""
        
        if self.report.archive_candidates:
            html += '<table><thead><tr><th>File</th><th>Category</th><th>Risk</th><th>Stability</th><th>Age</th></tr></thead><tbody>'
            
            for file_path in self.report.archive_candidates[:25]:
                file_data = self.report.files[file_path]
                html += f"""
            <tr>
                <td>{file_data['relative_path']}</td>
                <td>{file_data['category']}</td>
                <td><span class="badge {file_data['risk_level'].lower()}">{file_data['risk_level']}</span></td>
                <td>{file_data['stability_score']:.1f}/10</td>
                <td>{file_data['last_modified_days']} days</td>
            </tr>
"""
            
            html += '</tbody></table>'
        else:
            html += '<p style="color: var(--text-secondary);">No files currently eligible for archiving.</p>'
        
        html += '</div>'
        return html
    
    def _build_category_breakdown(self) -> str:
        """Build category distribution breakdown"""
        html = """
<div class="section">
    <div class="section-header">
        <h2 class="section-title">
            <span class="section-icon">📂</span>
            File Category Distribution
        </h2>
    </div>
    <table>
        <thead>
            <tr>
                <th>Category</th>
                <th>Count</th>
                <th>Percentage</th>
                <th>Distribution</th>
            </tr>
        </thead>
        <tbody>
"""
        
        total = len(self.report.files)
        sorted_categories = sorted(
            self.report.category_distribution.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        for category, count in sorted_categories:
            percentage = (count / total) * 100 if total > 0 else 0
            bar_width = int(percentage)
            
            html += f"""
            <tr>
                <td><strong>{category}</strong></td>
                <td>{count:,}</td>
                <td>{percentage:.1f}%</td>
                <td>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: {bar_width}%"></div>
                    </div>
                </td>
            </tr>
"""
        
        html += """
        </tbody>
    </table>
</div>
"""
        return html
    
    def _build_footer(self) -> str:
        """Build footer section"""
        return f"""
<div class="footer">
    <p><strong>Enterprise Code Intelligence Platform v{Config.TOOL_VERSION}</strong></p>
    <p>Generated on {datetime.now().strftime('%B %d, %Y at %H:%M:%S')}</p>
    <p style="margin-top: 12px;">
        This report provides professional recommendations based on static analysis.
        All suggestions should be reviewed by senior engineers before implementation.
    </p>
    <div class="footer-links">
        <a href="#" class="footer-link">Documentation</a>
        <a href="#" class="footer-link">Best Practices</a>
        <a href="#" class="footer-link">Support</a>
    </div>
</div>
"""
    def _get_comprehensive_scripts(self) -> str:
        """Generate comprehensive JavaScript for interactivity"""
        return """
console.log('🔬 Enterprise Code Intelligence Dashboard Initialized');
console.log('📊 Files loaded:', Object.keys(filesData).length);
console.log('📋 Duplicate clusters:', duplicatesData.length);
console.log('💡 Recommendations:', recommendationsData.length);

// === COLLAPSIBLE SECTIONS ===
function initCollapsibleSections() {
    document.querySelectorAll('.section').forEach(section => {
        const header = section.querySelector('h2');
        if (!header) return;
        
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'collapse-toggle';
        toggleBtn.textContent = '−';
        toggleBtn.style.cssText = `
            background: var(--accent);
            color: white;
            border: none;
            border-radius: 4px;
            width: 28px;
            height: 28px;
            margin-left: 12px;
            cursor: pointer;
            font-size: 18px;
            font-weight: bold;
            transition: all 0.3s ease;
        `;
        
        header.style.cursor = 'pointer';
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.userSelect = 'none';
        header.appendChild(toggleBtn);
        
        const content = section.querySelector('.section-content');
        if (content) {
            content.style.transition = 'all 0.3s ease';
            content.style.overflow = 'hidden';
        }
        
        header.addEventListener('click', () => {
            const isCollapsed = content.style.maxHeight === '0px';
            if (isCollapsed) {
                content.style.maxHeight = content.scrollHeight + 'px';
                toggleBtn.textContent = '−';
                toggleBtn.style.transform = 'rotate(0deg)';
            } else {
                content.style.maxHeight = '0px';
                toggleBtn.textContent = '+';
                toggleBtn.style.transform = 'rotate(180deg)';
            }
        });
    });
}

// === SORTABLE TABLES ===
function makeSortable(table) {
    const headers = table.querySelectorAll('th');
    headers.forEach((header, index) => {
        header.style.cursor = 'pointer';
        header.style.userSelect = 'none';
        header.innerHTML += ' ⇅';
        
        header.addEventListener('click', () => {
            sortTable(table, index);
        });
    });
}

function sortTable(table, column) {
    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const isNumeric = rows.some(row => !isNaN(row.cells[column]?.textContent));
    
    rows.sort((a, b) => {
        const aVal = a.cells[column]?.textContent || '';
        const bVal = b.cells[column]?.textContent || '';
        
        if (isNumeric) {
            return parseFloat(aVal) - parseFloat(bVal);
        }
        return aVal.localeCompare(bVal);
    });
    
    rows.forEach(row => tbody.appendChild(row));
}

// === ENHANCED SEARCH ===
function initEnhancedSearch() {
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    searchContainer.style.cssText = `
        position: sticky;
        top: 0;
        background: var(--bg-primary);
        padding: 16px;
        z-index: 100;
        border-bottom: 1px solid var(--border);
    `;
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = '🔍 Search files, components, or issues...';
    searchInput.className = 'global-search';
    searchInput.style.cssText = `
        width: 100%;
        padding: 14px 20px;
        background: var(--bg-secondary);
        border: 2px solid var(--border);
        border-radius: 8px;
        color: var(--text-primary);
        font-size: 16px;
        transition: border-color 0.3s ease;
    `;
    
    searchInput.addEventListener('focus', () => {
        searchInput.style.borderColor = 'var(--accent)';
    });
    
    searchInput.addEventListener('blur', () => {
        searchInput.style.borderColor = 'var(--border)';
    });
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('.file-item, tr, .recommendation-item').forEach(item => {
            const text = item.textContent.toLowerCase();
            const matches = text.includes(query);
            item.style.display = matches ? '' : 'none';
            if (matches && query) {
                item.style.background = 'rgba(99, 102, 241, 0.1)';
            } else {
                item.style.background = '';
            }
        });
    });
    
    searchContainer.appendChild(searchInput);
    document.querySelector('.dashboard').insertBefore(searchContainer, document.querySelector('.header').nextSibling);
}

// === VISUAL CHARTS ===
function createRiskChart() {
    const canvas = document.createElement('canvas');
    canvas.id = 'riskChart';
    canvas.width = 300;
    canvas.height = 300;
    
    // Simple pie chart drawing (if risk distribution exists)
    const riskSection = document.querySelector('.risk-distribution');
    if (riskSection) {
        riskSection.appendChild(canvas);
    }
}

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    console.log('✓ Dashboard ready - Enhanced Interactive Mode');
    
    // Initialize all interactive features
    initCollapsibleSections();
    initEnhancedSearch();
    
    // Make all tables sortable
    document.querySelectorAll('table').forEach(table => {
        makeSortable(table);
    });
    
    // Add smooth scroll
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
    
    // Animate progress bars
    const progressBars = document.querySelectorAll('.progress-fill');
    progressBars.forEach(bar => {
        const width = bar.style.width;
        bar.style.width = '0%';
        setTimeout(() => {
            bar.style.width = width;
        }, 100);
    });
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + K = Focus search
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            document.querySelector('.global-search')?.focus();
        }
        
        // Ctrl/Cmd + E = Expand all
        if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
            e.preventDefault();
            document.querySelectorAll('.section-content').forEach(content => {
                content.style.maxHeight = content.scrollHeight + 'px';
            });
        }
        
        // Ctrl/Cmd + C = Collapse all
        if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
            e.preventDefault();
            document.querySelectorAll('.section-content').forEach(content => {
                content.style.maxHeight = '0px';
            });
        }
    });
    
    console.log('✓ Interactive features enabled:');
    console.log('  - Collapsible sections (click headers)');
    console.log('  - Sortable tables (click column headers)');
    console.log('  - Enhanced search (Ctrl+K to focus)');
    console.log('  - Keyboard shortcuts (Ctrl+E expand, Ctrl+C collapse)');
});

// Export functions for external use
window.dashboardAPI = {
    getFileData: (path) => filesData[path],
    getDuplicates: () => duplicatesData,
    getRecommendations: () => recommendationsData,
    filterByRisk: (level) => {
        return Object.values(filesData).filter(f => f.risk_level === level);
    },
    expandAll: () => {
        document.querySelectorAll('.section-content').forEach(c => c.style.maxHeight = c.scrollHeight + 'px');
    },
    collapseAll: () => {
        document.querySelectorAll('.section-content').forEach(c => c.style.maxHeight = '0px');
    }
};
"""

# ============================================================================
# MAIN ORCHESTRATOR
# ============================================================================

class CodeIntelligencePlatform:
    """Main orchestrator for comprehensive analysis"""
    
    def __init__(self, project_path: str, scope_path: Optional[str] = None):
        self.project_path = Path(project_path).resolve()
        self.scope_path = scope_path
        self.report_folder: Optional[Path] = None
        self.logger: Optional[AnalysisLogger] = None
        self.files: Dict[str, FileInfo] = {}
        self.components: List[ComponentInfo] = []
        self.report: Optional[AnalysisReport] = None
        
    def analyze(self) -> AnalysisReport:
        """Perform complete comprehensive analysis"""
        # Create report folder
        self.report_folder = create_timestamped_report_folder(self.project_path)
        
        # Initialize logger
        log_path = self.report_folder / 'runtime_log.txt'
        self.logger = AnalysisLogger(str(log_path))
        
        self.logger.info("="*70)
        self.logger.info("ENTERPRISE CODE INTELLIGENCE PLATFORM")
        self.logger.info("="*70)
        self.logger.info(f"Scan root: {self.project_path}")
        self.logger.info(f"Report folder: {self.report_folder}")
        
        start_time = datetime.now()
        
        try:
            # Phase 1: Scan
            self.logger.info("Phase 1: Project scanning...")
            scanner = ProjectScanner(str(self.project_path), self.logger, self.scope_path)
            self.files, self.components = scanner.scan()
            
            # Phase 2: Build dependency graph
            self.logger.info("Phase 2: Building dependency graph...")
            graph_builder = DependencyGraphBuilder(self.files, self.logger)
            graph_builder.build()
            
            # Phase 3: Detect duplicates
            self.logger.info("Phase 3: Detecting duplicates...")
            duplicate_detector = DuplicateDetector(self.files, self.logger)
            duplicates = duplicate_detector.analyze()
            
            # Phase 4: Usage analysis
            self.logger.info("Phase 4: Analyzing usage patterns...")
            usage_analyzer = UsageAnalyzer(self.files, self.logger)
            usage_analyzer.analyze()
            
            # Phase 5: Stability & risk
            self.logger.info("Phase 5: Computing stability and risk...")
            stability_calc = StabilityCalculator(self.files, self.logger)
            stability_calc.calculate()
            
            # Phase 6: Generate comprehensive recommendations
            self.logger.info("Phase 6: Generating professional recommendations...")
            recommendations = self._generate_comprehensive_recommendations(duplicates)
            
            # Phase 7: Archive eligibility
            self.logger.info("Phase 7: Evaluating archive candidates...")
            archive_engine = ArchiveDecisionEngine(self.files, self.logger)
            archive_candidates = []
            
            for path, meta in self.files.items():
                decision = archive_engine.evaluate_archive_candidate(meta)
                if decision.decision == Recommendation.SAFE_TO_ARCHIVE:
                    archive_candidates.append(path)
            
            # Phase 8: Calculate quality metrics
            self.logger.info("Phase 8: Computing quality metrics...")
            quality_metrics = self._calculate_quality_metrics()
            
            end_time = datetime.now()
            
            # Build comprehensive report
            self.report = AnalysisReport(
                metadata={
                    'tool_version': Config.TOOL_VERSION,
                    'scan_root': str(self.project_path),
                    'ignored_folders': list(IGNORE_PATTERNS),
                    'start_time': start_time.isoformat(),
                    'end_time': end_time.isoformat(),
                    'report_folder': str(self.report_folder),
                    'warnings': self.logger.warnings,
                    'errors': self.logger.errors
                },
                files={
                    path: {
                        'path': meta.path,
                        'relative_path': meta.relative_path,
                        'size': meta.size,
                        'lines': meta.lines,
                        'category': meta.category.value,
                        'content_hash': meta.content_hash,
                        'structural_hash': meta.structural_hash,
                        'exported_symbols': meta.exported_symbols,
                        'dependents_count': meta.dependents_count,
                        'dependents': list(meta.dependents),
                        'stability_score': meta.stability_score,
                        'risk_level': meta.risk_level.value,
                        'recommendation': meta.recommendation.value,
                        'short_reason': meta.short_reason,
                        'last_modified_days': meta.last_modified_days,
                        'complexity_estimate': meta.complexity_estimate,
                        'any_count': meta.any_count,
                        'is_dynamic_imported': meta.is_dynamic_imported,
                        'is_test_file': meta.is_test_file,
                        'duplicate_cluster_id': meta.duplicate_cluster_id,
                        'has_jsx': meta.has_jsx,
                        'has_typescript': meta.has_typescript,
                        'interface_count': meta.interface_count,
                        'type_count': meta.type_count
                    }
                    for path, meta in self.files.items()
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
                unused_candidates=usage_analyzer.unused,
                unwired_candidates=usage_analyzer.unwired,
                merge_suggestions=[],
                archive_candidates=archive_candidates,
                category_distribution=dict(Counter(f.category.value for f in self.files.values())),
                risk_distribution=dict(Counter(f.risk_level.value for f in self.files.values())),
                issues=[],
                recommendations=recommendations,
                optimization_opportunities=[],
                quality_metrics=quality_metrics
            )
            
            # Generate reports
            report_gen = ReportGenerator(self.report, self.report_folder, self.logger)
            report_gen.generate_all()
            
            self.logger.info("="*70)
            self.logger.info("ANALYSIS COMPLETE")
            self.logger.info("="*70)
            
            self.logger.finalize()
            
            return self.report
            
        except Exception as e:
            self.logger.error(f"Analysis failed: {e}")
            self.logger.finalize()
            raise
    
    def _generate_comprehensive_recommendations(self, duplicates: List[DuplicateCluster]) -> List[Dict[str, Any]]:
        """Generate comprehensive professional recommendations"""
        recommendations = []
        rec_engine = RecommendationEngine()
        
        # Generate recommendations for each file
        for path, meta in self.files.items():
            rec, reasoning, confidence = rec_engine.generate_comprehensive_recommendation(
                meta, self.files, duplicates
            )
            
            # Only include actionable recommendations
            if rec != Recommendation.KEEP_AS_IS or meta.risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL}:
                priority = 'CRITICAL' if meta.risk_level == RiskLevel.CRITICAL else \
                          'HIGH' if meta.risk_level == RiskLevel.HIGH else \
                          'MEDIUM' if meta.risk_level == RiskLevel.MEDIUM else 'LOW'
                
                effort = 'High' if meta.complexity_estimate > 50 else \
                        'Medium' if meta.complexity_estimate > 20 else 'Low'
                
                impact = 'High' if meta.dependents_count > 5 else \
                        'Medium' if meta.dependents_count > 0 else 'Low'
                
                recommendations.append({
                    'file': meta.relative_path,
                    'title': f"{rec.value.replace('_', ' ').title()} - {meta.name}",
                    'action': rec.value,
                    'reasoning': reasoning,
                    'confidence': confidence,
                    'priority': priority,
                    'effort': effort,
                    'impact': impact,
                    'category': meta.category.value
                })
        
        # Sort by priority and confidence
        priority_order = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3}
        recommendations.sort(key=lambda x: (priority_order[x['priority']], -x['confidence']))
        
        return recommendations
    
    def _calculate_quality_metrics(self) -> Dict[str, Any]:
        """Calculate comprehensive quality metrics"""
        total_files = len(self.files)
        
        if total_files == 0:
            return {}
        
        # Average stability
        avg_stability = sum(f.stability_score for f in self.files.values()) / total_files
        
        # Type safety score
        total_any = sum(f.any_count for f in self.files.values())
        total_lines = sum(f.lines for f in self.files.values())
        type_safety_score = max(0, 100 - (total_any / total_lines * 1000)) if total_lines > 0 else 100
        
        # Average complexity
        avg_complexity = sum(f.complexity_estimate for f in self.files.values()) / total_files
        
        # Test coverage estimate
        test_files = sum(1 for f in self.files.values() if f.is_test_file)
        non_test_files = total_files - test_files
        test_coverage_estimate = (test_files / non_test_files * 100) if non_test_files > 0 else 0
        
        return {
            'avg_stability': avg_stability,
            'type_safety_score': type_safety_score,
            'avg_complexity': avg_complexity,
            'test_coverage_estimate': min(test_coverage_estimate, 100),
            'total_files': total_files,
            'total_lines': total_lines,
            'typescript_percentage': sum(1 for f in self.files.values() if f.has_typescript) / total_files * 100
        }

# ============================================================================
# INTERACTIVE CLI
# ============================================================================

class InteractiveCLI:
    """Interactive command-line interface with comprehensive options"""
    
    def __init__(self, platform: CodeIntelligencePlatform):
        self.platform = platform
        self.report: Optional[AnalysisReport] = None
        
    def run(self):
        """Run interactive CLI"""
        try:
            self._print_banner()
            self._print_help()
            
            while True:
                self._print_menu()
                choice = input(f"\n{Colors.OKCYAN}Select option: {Colors.ENDC}").strip()
                
                if choice == '1':
                    self._full_analysis()
                elif choice == '2':
                    self._show_high_risk()
                elif choice == '3':
                    self._show_unused_unwired()
                elif choice == '4':
                    self._show_duplicate_clusters()
                elif choice == '5':
                    self._show_category_distribution()
                elif choice == '6':
                    self._export_reports()
                elif choice == '7':
                    self._view_file_details()
                elif choice == '8':
                    self._create_archive()
                elif choice == '9':
                    self._open_dashboard()
                elif choice == '10':
                    self._show_recommendations()
                elif choice == '11':
                    self._show_quality_metrics()
                elif choice == '0':
                    print(f"\n{Colors.OKGREEN}✓ Exiting safely. No files were modified.{Colors.ENDC}\n")
                    break
                else:
                    print(f"{Colors.FAIL}❌ Invalid option{Colors.ENDC}")
                
                input(f"\n{Colors.WARNING}Press Enter to continue...{Colors.ENDC}")
                
        except KeyboardInterrupt:
            print(f"\n\n{Colors.WARNING}⚠️  Operation cancelled. Exiting safely.{Colors.ENDC}\n")
    
    def _print_banner(self):
        """Print CLI banner"""
        print(f"\n{Colors.BOLD}{Colors.HEADER}")
        print("=" * 70)
        print("🔬 ENTERPRISE CODE INTELLIGENCE PLATFORM v" + Config.TOOL_VERSION)
        print("=" * 70)
        print(f"{Colors.ENDC}")
        print(f"{Colors.OKGREEN}✓ Analysis-only by default — no source changes{Colors.ENDC}")
        print(f"{Colors.OKGREEN}✓ Archive creates copies only — review before apply{Colors.ENDC}")
        print(f"{Colors.OKGREEN}✓ No Git integration used{Colors.ENDC}")
        print(f"{Colors.OKGREEN}✓ Professional recommendations with confidence scores{Colors.ENDC}\n")
    
    def _print_help(self):
        """Print help text"""
        print(f"{Colors.BOLD}CONFIGURATION:{Colors.ENDC}")
        print(f"  Similarity Threshold: {Config.SIMILARITY_THRESHOLD}")
        print(f"  Recent Days Blocker: {Config.RECENT_DAYS_BLOCKER}")
        print(f"  Archive Score Threshold: {Config.ARCHIVE_SCORE_THRESHOLD}\n")
    
    def _print_menu(self):
        """Print main menu"""
        print(f"\n{Colors.BOLD}MAIN MENU:{Colors.ENDC}")
        print(f"{Colors.OKCYAN}1.{Colors.ENDC}  Full Analysis (Comprehensive)")
        print(f"{Colors.OKCYAN}2.{Colors.ENDC}  Show High Risk Files Only")
        print(f"{Colors.OKCYAN}3.{Colors.ENDC}  Show Unused & Unwired Components")
        print(f"{Colors.OKCYAN}4.{Colors.ENDC}  Show Duplicate Clusters with Merge Suggestions")
        print(f"{Colors.OKCYAN}5.{Colors.ENDC}  Show File Category Distribution")
        print(f"{Colors.OKCYAN}6.{Colors.ENDC}  Export Reports (JSON + CSV)")
        print(f"{Colors.OKCYAN}7.{Colors.ENDC}  View Single File Details")
        print(f"{Colors.OKCYAN}8.{Colors.ENDC}  Create Safe Refactor Archive")
        print(f"{Colors.OKCYAN}9.{Colors.ENDC}  Open HTML Dashboard")
        print(f"{Colors.OKCYAN}10.{Colors.ENDC} Show Professional Recommendations")
        print(f"{Colors.OKCYAN}11.{Colors.ENDC} Show Quality Metrics")
        print(f"{Colors.FAIL}0.{Colors.ENDC}  Exit")
    
    def _ensure_analysis(self):
        """Ensure analysis has been run"""
        if not self.report:
            print(f"\n{Colors.WARNING}⚠️  Please run Full Analysis first (option 1){Colors.ENDC}")
            return False
        return True
    
    def _full_analysis(self):
        """Perform full analysis"""
        print(f"\n{Colors.BOLD}=== FULL COMPREHENSIVE ANALYSIS ==={Colors.ENDC}\n")
        
        self.report = self.platform.analyze()
        
        print(f"\n{Colors.BOLD}SUMMARY:{Colors.ENDC}")
        print(f"  Total Files: {len(self.report.files):,}")
        print(f"  Total Lines: {sum(f['lines'] for f in self.report.files.values()):,}")
        print(f"  Duplicate Clusters: {len(self.report.duplicate_clusters)}")
        print(f"  Unused Files: {len(self.report.unused_candidates)}")
        print(f"  Unwired Features: {len(self.report.unwired_candidates)}")
        print(f"  Archive Candidates: {len(self.report.archive_candidates)}")
        print(f"  Professional Recommendations: {len(self.report.recommendations)}")
        print(f"\n{Colors.OKGREEN}✓ Reports saved to: {self.platform.report_folder}{Colors.ENDC}")
    
    def _show_high_risk(self):
        """Show high-risk files"""
        if not self._ensure_analysis():
            return
        
        print(f"\n{Colors.BOLD}=== HIGH RISK FILES ==={Colors.ENDC}\n")
        
        high_risk = [
            (path, data) for path, data in self.report.files.items()
            if data['risk_level'] in ['HIGH', 'CRITICAL']
        ]
        
        if not high_risk:
            print(f"{Colors.OKGREEN}✓ No high-risk files found{Colors.ENDC}")
            return
        
        for path, data in high_risk[:20]:
            print(f"\n{Colors.FAIL}File:{Colors.ENDC} {data['relative_path']}")
            print(f"  Risk: {data['risk_level']}")
            print(f"  Category: {data['category']}")
            print(f"  Dependents: {data['dependents_count']}")
            print(f"  Stability: {data['stability_score']:.1f}/10")
            print(f"  Reasoning: {data['short_reason']}")
        
        if len(high_risk) > 20:
            print(f"\n{Colors.WARNING}... and {len(high_risk) - 20} more{Colors.ENDC}")
    
    def _show_unused_unwired(self):
        """Show unused and unwired files"""
        if not self._ensure_analysis():
            return
        
        print(f"\n{Colors.BOLD}=== UNUSED & UNWIRED FILES ==={Colors.ENDC}\n")
        
        print(f"{Colors.BOLD}Unused Files ({len(self.report.unused_candidates)}):{Colors.ENDC}")
        for file_path in self.report.unused_candidates[:10]:
            data = self.report.files[file_path]
            print(f"  • {data['relative_path']} ({data['category']})")
        
        if len(self.report.unused_candidates) > 10:
            print(f"  ... and {len(self.report.unused_candidates) - 10} more")
        
        print(f"\n{Colors.BOLD}Unwired Features ({len(self.report.unwired_candidates)}):{Colors.ENDC}")
        for file_path in self.report.unwired_candidates[:10]:
            data = self.report.files[file_path]
            print(f"  • {data['relative_path']} ({data['lines']} lines)")
        
        if len(self.report.unwired_candidates) > 10:
            print(f"  ... and {len(self.report.unwired_candidates) - 10} more")
    
    def _show_duplicate_clusters(self):
        """Show duplicate clusters"""
        if not self._ensure_analysis():
            return
        
        print(f"\n{Colors.BOLD}=== DUPLICATE CLUSTERS ==={Colors.ENDC}\n")
        
        if not self.report.duplicate_clusters:
            print(f"{Colors.OKGREEN}✓ No duplicate clusters found{Colors.ENDC}")
            return
        
        for cluster in self.report.duplicate_clusters[:5]:
            print(f"\n{Colors.BOLD}Cluster {cluster['cluster_id']}{Colors.ENDC}")
            print(f"  Similarity: {cluster['similarity_score']:.0%}")
            print(f"  Risk: {cluster['risk_level']}")
            print(f"  Recommendation: {cluster['recommendation']}")
            print(f"  Base: {Path(cluster['suggested_base_file']).name}")
            print(f"  Files: {cluster['cluster_size']}")
            print(f"  Estimated Savings: {cluster['estimated_savings']} lines")
            print(f"  Differences:")
            for diff in cluster['diff_summary']:
                print(f"    - {diff}")
        
        if len(self.report.duplicate_clusters) > 5:
            print(f"\n{Colors.WARNING}... and {len(self.report.duplicate_clusters) - 5} more{Colors.ENDC}")
    
    def _show_category_distribution(self):
        """Show category distribution"""
        if not self._ensure_analysis():
            return
        
        print(f"\n{Colors.BOLD}=== FILE CATEGORY DISTRIBUTION ==={Colors.ENDC}\n")
        
        total = len(self.report.files)
        for category, count in sorted(self.report.category_distribution.items(), 
                                     key=lambda x: x[1], reverse=True):
            percentage = (count / total) * 100 if total > 0 else 0
            bar = '█' * int(percentage / 2)
            print(f"{category:20} {count:5} ({percentage:5.1f}%) {bar}")
    
    def _export_reports(self):
        """Export reports (already done during analysis)"""
        if not self._ensure_analysis():
            return
        
        print(f"\n{Colors.OKGREEN}✓ Reports already exported during analysis{Colors.ENDC}")
        print(f"  Location: {self.platform.report_folder}")
        print(f"  Files:")
        print(f"    - full_report.json")
        print(f"    - summary_report.json")
        print(f"    - high_risk.csv")
        print(f"    - optimization_dashboard.html")
        print(f"    - runtime_log.txt")
    
    def _view_file_details(self):
        """View file details"""
        if not self._ensure_analysis():
            return
        
        print(f"\n{Colors.BOLD}=== VIEW FILE DETAILS ==={Colors.ENDC}\n")
        
        search = input(f"{Colors.OKCYAN}Enter file name or path: {Colors.ENDC}").strip()
        
        matches = [
            (path, data) for path, data in self.report.files.items()
            if search.lower() in path.lower()
        ]
        
        if not matches:
            print(f"{Colors.FAIL}❌ No matches found{Colors.ENDC}")
            return
        
        if len(matches) > 1:
            print(f"\n{Colors.WARNING}Multiple matches:{Colors.ENDC}")
            for i, (path, data) in enumerate(matches[:10], 1):
                print(f"{i}. {data['relative_path']}")
            
            choice = input(f"\n{Colors.OKCYAN}Select (1-{min(len(matches), 10)}): {Colors.ENDC}").strip()
            try:
                idx = int(choice) - 1
                if 0 <= idx < len(matches):
                    path, data = matches[idx]
                else:
                    return
            except:
                return
        else:
            path, data = matches[0]
        
        print(f"\n{Colors.BOLD}FILE DETAILS:{Colors.ENDC}")
        print(f"  Path: {data['relative_path']}")
        print(f"  Category: {data['category']}")
        print(f"  Size: {data['size']:,} bytes ({data['lines']:,} lines)")
        print(f"  Risk: {data['risk_level']}")
        print(f"  Recommendation: {data['recommendation']}")
        print(f"  Stability: {data['stability_score']:.1f}/10")
        print(f"  Dependents: {data['dependents_count']}")
        print(f"  Reasoning: {data['short_reason']}")
        print(f"  Last Modified: {data['last_modified_days']} days ago")
        print(f"  Complexity: {data['complexity_estimate']}")
        print(f"  Type Safety: 'any' count = {data['any_count']}")
    
    def _create_archive(self):
        """Create safe archive"""
        if not self._ensure_analysis():
            return
        
        print(f"\n{Colors.BOLD}=== CREATE SAFE REFACTOR ARCHIVE ==={Colors.ENDC}\n")
        
        if not self.report.archive_candidates:
            print(f"{Colors.WARNING}⚠️  No files eligible for archiving{Colors.ENDC}")
            return
        
        # Show preview
        print(f"{Colors.OKGREEN}Archive Preview:{Colors.ENDC}")
        print(f"  Candidate Files: {len(self.report.archive_candidates)}")
        
        total_size = sum(
            self.report.files[f]['size'] 
            for f in self.report.archive_candidates
        )
        print(f"  Total Size: {total_size / 1024:.1f} KB")
        
        print(f"\n{Colors.WARNING}⚠️ SAFETY NOTICE:{Colors.ENDC}")
        print(f"  • This will NOT modify or delete your source files")
        print(f"  • Archive will create COPIES only")
        print(f"  • Archive stored in: {self.platform.report_folder / 'archives'}")
        print(f"  • You must review the analysis before proceeding")
        
        confirm = input(f"\n{Colors.OKCYAN}Proceed with safe archive creation? (y/N): {Colors.ENDC}").strip().lower()
        
        if confirm != 'y':
            print(f"{Colors.WARNING}Archive creation cancelled{Colors.ENDC}")
            return
        
        # Re-evaluate eligibility
        print(f"\n{Colors.OKCYAN}Re-evaluating archive candidates...{Colors.ENDC}")
        
        archive_engine = ArchiveDecisionEngine(self.platform.files, self.platform.logger)
        verified_candidates = []
        
        for file_path in self.report.archive_candidates:
            meta = self.platform.files[file_path]
            decision = archive_engine.evaluate_archive_candidate(meta)
            if decision.allowed and decision.decision == Recommendation.SAFE_TO_ARCHIVE:
                verified_candidates.append(file_path)
        
        if not verified_candidates:
            print(f"{Colors.FAIL}❌ No files passed re-verification{Colors.ENDC}")
            return
        
        print(f"{Colors.OKGREEN}✓ {len(verified_candidates)} files verified for archival{Colors.ENDC}")
        
        # Create archive
        builder = ArchiveBuilder(
            str(self.platform.project_path),
            self.platform.report_folder,
            self.platform.files,
            self.platform.logger
        )
        
        archive_path = builder.create_safe_archive(verified_candidates, keep_temp=False)
        
        if archive_path:
            print(f"\n{Colors.OKGREEN}✓ Archive created successfully{Colors.ENDC}")
            print(f"  Location: {archive_path}")
            print(f"  Files archived: {len(verified_candidates)}")
            print(f"\n{Colors.BOLD}⚠️  NO SOURCE FILES WERE MODIFIED OR DELETED{Colors.ENDC}")
    
    def _open_dashboard(self):
        """Open HTML dashboard"""
        if not self._ensure_analysis():
            return
        
        dashboard_path = self.platform.report_folder / 'optimization_dashboard.html'
        
        if dashboard_path.exists():
            print(f"\n{Colors.OKGREEN}✓ Dashboard location:{Colors.ENDC}")
            print(f"  {dashboard_path}")
            print(f"\n  Open this file in your browser to view the interactive dashboard.")
        else:
            print(f"{Colors.FAIL}❌ Dashboard not found{Colors.ENDC}")
    
    def _show_recommendations(self):
        """Show professional recommendations"""
        if not self._ensure_analysis():
            return
        
        print(f"\n{Colors.BOLD}=== PROFESSIONAL RECOMMENDATIONS ==={Colors.ENDC}\n")
        
        if not self.report.recommendations:
            print(f"{Colors.OKGREEN}✓ No actionable recommendations{Colors.ENDC}")
            return
        
        for i, rec in enumerate(self.report.recommendations[:15], 1):
            priority_color = Colors.FAIL if rec['priority'] == 'CRITICAL' else \
                           Colors.WARNING if rec['priority'] == 'HIGH' else \
                           Colors.OKCYAN if rec['priority'] == 'MEDIUM' else Colors.OKGREEN
            
            print(f"\n{priority_color}#{i} [{rec['priority']}] {rec['title']}{Colors.ENDC}")
            print(f"  Action: {rec['action']}")
            print(f"  Confidence: {rec['confidence']:.0%} | Effort: {rec['effort']} | Impact: {rec['impact']}")
            print(f"  Reasoning:")
            for reason in rec['reasoning'][:3]:
                print(f"    • {reason}")
        
        if len(self.report.recommendations) > 15:
            print(f"\n{Colors.WARNING}... and {len(self.report.recommendations) - 15} more recommendations{Colors.ENDC}")
    
    def _show_quality_metrics(self):
        """Show quality metrics"""
        if not self._ensure_analysis():
            return
        
        print(f"\n{Colors.BOLD}=== CODE QUALITY METRICS ==={Colors.ENDC}\n")
        
        metrics = self.report.quality_metrics
        
        print(f"  Average Stability Score: {metrics['avg_stability']:.1f}/10")
        print(f"  Type Safety Score: {metrics['type_safety_score']:.1f}%")
        print(f"  Average Complexity: {metrics['avg_complexity']:.1f}")
        print(f"  Test Coverage Estimate: {metrics['test_coverage_estimate']:.1f}%")
        print(f"  TypeScript Usage: {metrics['typescript_percentage']:.1f}%")
        print(f"  Total Lines of Code: {metrics['total_lines']:,}")

# ============================================================================
# ENTRY POINT
# ============================================================================

def main():
    """Main entry point with improved path handling and CLI flags"""
    import io
    
    # Fix Windows console encoding
    if sys.platform == 'win32':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    
    parser = argparse.ArgumentParser(
        description='Enterprise Code Intelligence Platform - Static Analysis Tool',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument(
        'project_path',
        nargs='?',
        default=os.getcwd(),
        help='Path to project root (default: current directory)'
    )
    parser.add_argument(
        '--scope',
        '-s',
        type=str,
        default=None,
        help='Scope path for limited analysis'
    )
    parser.add_argument(
        '--non-interactive',
        '-n',
        action='store_true',
        help='Run analysis non-interactively and exit'
    )
    parser.add_argument(
        '--analyze-only',
        '-a',
        action='store_true',
        help='Pure analysis mode - skip all file operations including archives'
    )
    parser.add_argument(
        '--dry-run',
        '-d',
        action='store_true',
        help='Dry run mode - show what would be done without making changes'
    )
    parser.add_argument(
        '--verbose',
        '-v',
        action='store_true',
        help='Verbose output mode'
    )
    parser.add_argument(
        '--json-output',
        '-j',
        action='store_true',
        help='Output metrics in JSON format only (machine-readable)'
    )
    
    args = parser.parse_args()
    project_path = args.project_path
    scope_path = args.scope
    
    if not Path(project_path).exists():
        print(f"{Colors.FAIL}Error: Path does not exist: {project_path}{Colors.ENDC}")
        sys.exit(1)
    
    platform = CodeIntelligencePlatform(project_path, scope_path)
    
    # Set verbose mode if requested
    if args.verbose:
        if platform.logger:
            platform.logger.info("Verbose mode enabled")
    
    # Non-interactive or analyze-only mode
    if args.non_interactive or args.analyze_only or args.json_output:
        if args.dry_run:
            print("DRY RUN MODE - No changes will be made")
        
        report = platform.analyze()
        
        if args.json_output:
            # Machine-readable JSON output only
            metrics = {
                'total_files': len(report.files),
                'unused_candidates': len(report.unused_candidates),
                'unwired_candidates': len(report.unwired_candidates),
                'duplicate_clusters': len(report.duplicate_clusters),
                'import_conflicts': len(report.same_name_conflicts),
                'archive_candidates': len(report.archive_candidates),
                'risk_distribution': report.risk_distribution,
                'category_distribution': report.category_distribution,
                'quality_metrics': report.quality_metrics,
                'report_folder': str(platform.report_folder)
            }
            print(json.dumps(metrics, indent=2))
        else:
            # Human-readable summary
            print(f"\nAnalysis complete. Report saved to: {platform.report_folder}")
            print(f"Total files: {len(report.files)}")
            print(f"Unused candidates: {len(report.unused_candidates)}")
            print(f"Unwired candidates: {len(report.unwired_candidates)}")
            print(f"Duplicate clusters: {len(report.duplicate_clusters)}")
            print(f"Import conflicts: {len(report.same_name_conflicts)}")
            print(f"Archive candidates: {len(report.archive_candidates)}")
    else:
        cli = InteractiveCLI(platform)
        cli.run()

if __name__ == '__main__':
    main()