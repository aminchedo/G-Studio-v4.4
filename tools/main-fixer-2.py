#!/usr/bin/env python3
"""
G-Studio Ultimate Intelligent Refactor & Stability Analyzer

Enterprise-grade static analysis tool for large React/TypeScript applications.
Conservative, engineering-first approach focused on stability and minimal risk.

Author: G-Studio Architecture Team
Version: 2.0.0
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
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Set, Tuple, Optional, Any, DefaultDict
from enum import Enum
import html

# ============================================================================
# ENUMERATIONS
# ============================================================================

class RiskLevel(Enum):
    """Conservative risk assessment for architectural decisions"""
    LOW = "low"            # Minimal impact, easily reversible
    MEDIUM = "medium"      # Requires careful review
    HIGH = "high"          # Significant architectural impact
    CRITICAL = "critical"  # Core functionality at risk - manual review required

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
    UI_COMPONENT = "UI Component"
    CUSTOM_HOOK = "Custom Hook"
    PAGE_ROUTE = "Page/Route"
    UTILITY = "Utility"
    CONTEXT = "Context"
    STORE = "Store"
    SERVICE = "Service"
    CONFIG = "Configuration"
    TEST = "Test"
    ASSET = "Asset"
    UNKNOWN = "Unknown"

class ComponentType(Enum):
    """Component classification"""
    FUNCTION_COMPONENT = "Function Component"
    ARROW_COMPONENT = "Arrow Component"
    CLASS_COMPONENT = "Class Component"
    HOOK = "Hook"
    HIGHER_ORDER_COMPONENT = "Higher-Order Component"

# ============================================================================
# DATA MODELS
# ============================================================================

@dataclass
class FileInfo:
    """Complete analysis of a single file"""
    path: str
    relative_path: str
    size_bytes: int
    lines_of_code: int
    last_modified: float
    last_modified_human: str = ""
    
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
    dependents: Set[str] = field(default_factory=set)        # Files that import this
    dependencies: Set[str] = field(default_factory=set)      # Files this imports
    
    # Risk & Recommendations
    risk_level: RiskLevel = RiskLevel.LOW
    primary_recommendation: Recommendation = Recommendation.KEEP_AS_IS
    secondary_recommendation: Optional[Recommendation] = None
    reasoning: List[str] = field(default_factory=list)
    safety_notes: List[str] = field(default_factory=list)
    
    # Quality Metrics
    stability_score: float = 0.0
    type_safety_score: float = 0.0
    complexity_score: float = 0.0
    any_type_count: int = 0
    ts_ignore_count: int = 0
    
    # Hash for duplicate detection
    content_hash: str = ""
    structural_hash: str = ""
    
    def __post_init__(self):
        if not self.last_modified_human:
            self.last_modified_human = datetime.fromtimestamp(
                self.last_modified
            ).strftime('%Y-%m-%d %H:%M:%S')

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
    """Cluster of duplicate/near-duplicate files"""
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
    
    # Metrics
    total_wasted_bytes: int = 0
    total_wasted_lines: int = 0
    
    # Reasoning
    reasoning: List[str] = field(default_factory=list)

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
    
    # Recommendations Summary
    recommendations_summary: Dict[Recommendation, int]

# ============================================================================
# CONSTANTS & CONFIGURATION
# ============================================================================

class Config:
    """Conservative configuration for enterprise analysis"""
    
    # Directory exclusions (safety first)
    EXCLUDE_DIRS = {
        "node_modules", "dist", "build", ".git", ".next", ".nuxt",
        "coverage", "__pycache__", ".cache", ".idea", ".vscode",
        "tmp", "temp", "backup", "backups", "archive", "archived",
        "final", "old", "previous", "legacy", "out", ".output"
    }
    
    # File patterns for classification
    CATEGORY_PATTERNS = {
        FileCategory.UI_COMPONENT: [
            r".*\.(tsx|jsx)$",
            r".*/components?/.*",
            r".*[Cc]omponent\.(ts|tsx|js|jsx)$",
            r".*/ui/.*",
            r".*/view/.*"
        ],
        FileCategory.CUSTOM_HOOK: [
            r".*/hooks?/.*",
            r"use[A-Z].*\.(ts|tsx|js|jsx)$"
        ],
        FileCategory.PAGE_ROUTE: [
            r".*/pages?/.*",
            r".*/routes?/.*",
            r".*/app/.*",
            r".*Page\.(ts|tsx|js|jsx)$",
            r".*Route\.(ts|tsx|js|jsx)$"
        ],
        FileCategory.UTILITY: [
            r".*/utils?/.*",
            r".*/helpers?/.*",
            r".*/lib/.*",
            r".*[Uu]til\.(ts|js)$"
        ],
        FileCategory.CONTEXT: [
            r".*[Cc]ontext\.(ts|tsx|js|jsx)$",
            r".*/contexts?/.*",
            r".*/providers?/.*"
        ],
        FileCategory.STORE: [
            r".*/stores?/.*",
            r".*[Ss]tore\.(ts|js)$",
            r".*/redux/.*",
            r".*/zustand/.*",
            r".*/recoil/.*"
        ],
        FileCategory.SERVICE: [
            r".*/services?/.*",
            r".*[Ss]ervice\.(ts|js)$",
            r".*/api/.*",
            r".*/client/.*"
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
        ]
    }
    
    # Risk assessment rules (conservative)
    RISK_RULES = {
        "exported_but_unused": RiskLevel.HIGH,
        "unexported_unused": RiskLevel.MEDIUM,
        "duplicate_name_different": RiskLevel.HIGH,
        "exact_duplicate": RiskLevel.LOW,
        "orphan_in_active_folder": RiskLevel.MEDIUM,
        "unused_hook": RiskLevel.HIGH,
        "recent_modification_days": 60,  # +1 risk level
        "very_recent_modification_days": 30  # +2 risk levels
    }
    
    # Safety rules (never violate)
    SAFETY_RULES = {
        "never_delete_exported": True,
        "never_delete_recent_days": 90,
        "never_delete_with_dependents": True,
        "prefer_archive_over_delete": True,
        "prefer_investigate_over_remove": True
    }
    
    # Duplicate detection thresholds
    SIMILARITY_THRESHOLD = 0.85
    MIN_FILE_SIZE = 100  # bytes
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    
    # Stability score weights
    STABILITY_WEIGHTS = {
        "dependents": 0.40,
        "exported_symbols": 0.25,
        "age_factor": 0.15,
        "complexity": 0.10,
        "type_safety": 0.10
    }

# ============================================================================
# CORE ANALYSIS ENGINE
# ============================================================================

class UltimateRefactorAnalyzer:
    """
    Main analysis engine - conservative, engineering-grade static analysis
    for React/TypeScript applications.
    """
    
    def __init__(self, root_path: str):
        self.root = Path(root_path).resolve()
        self.files: Dict[str, FileInfo] = {}
        self.components: Dict[str, ComponentInfo] = {}
        self.hooks: Dict[str, ComponentInfo] = {}
        self.duplicate_clusters: List[DuplicateCluster] = []
        self.project_metrics: Optional[ProjectMetrics] = None
        
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
            "analysis_time": 0.0
        }
    
    def run_full_analysis(self) -> Dict[str, Any]:
        """
        Execute complete analysis pipeline.
        Returns comprehensive report.
        """
        start_time = time.time()
        
        print("\n" + "="*70)
        print("G-Studio Ultimate Intelligent Refactor & Stability Analyzer")
        print("="*70)
        print(f"📁 Analyzing: {self.root}")
        print(f"🔒 Conservative mode: Safety first, minimal risk")
        print("-"*70)
        
        # Phase 1: File discovery and classification
        print("\n🔍 Phase 1: Scanning and classifying files...")
        self._scan_and_classify_files()
        
        # Phase 2: Component and hook detection
        print("🔍 Phase 2: Detecting React components and hooks...")
        self._detect_components_and_hooks()
        
        # Phase 3: Dependency graph construction
        print("🔍 Phase 3: Building dependency graph...")
        self._build_dependency_graph()
        
        # Phase 4: Duplicate detection (multi-layer)
        print("🔍 Phase 4: Multi-layer duplicate detection...")
        self._detect_duplicates_multi_layer()
        
        # Phase 5: Risk assessment and recommendations
        print("🔍 Phase 5: Conservative risk assessment...")
        self._assess_risks_and_recommendations()
        
        # Phase 6: Stability scoring
        print("🔍 Phase 6: Computing stability scores...")
        self._compute_stability_scores()
        
        # Phase 7: Generate metrics and reports
        print("🔍 Phase 7: Generating comprehensive report...")
        self._generate_project_metrics()
        
        self.stats["analysis_time"] = time.time() - start_time
        
        print("\n" + "="*70)
        print("✅ ANALYSIS COMPLETE")
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
            if size < Config.MIN_FILE_SIZE or size > Config.MAX_FILE_SIZE:
                return True
        except:
            return True
        
        return False
    
    def _scan_and_classify_files(self):
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
                
                # Create file info
                file_info = FileInfo(
                    path=str(file_path),
                    relative_path=str(file_path.relative_to(self.root)),
                    size_bytes=stat.st_size,
                    lines_of_code=len(content.splitlines()),
                    last_modified=stat.st_mtime,
                    category=category,
                    content_hash=hashlib.sha256(content.encode()).hexdigest(),
                    structural_hash=self._compute_structural_hash(content)
                )
                
                # Extract exports and imports
                file_info.exported_symbols = self._extract_exports(content)
                file_info.imported_symbols, file_info.import_statements = self._extract_imports(content)
                
                # Count type safety issues
                file_info.any_type_count = len(re.findall(r'\bany\b', content))
                file_info.ts_ignore_count = len(re.findall(r'@ts-ignore|// @ts-ignore', content))
                file_info.type_safety_score = self._calculate_type_safety(content)
                
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
                print(f"  ⚠️  Warning: Could not process {file_path}: {e}")
        
        print(f"  ✅ Scanned {self.stats['files_scanned']} files")
    
    def _classify_file(self, path: Path, content: str) -> FileCategory:
        """Classify file based on path patterns and content heuristics"""
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
                    # function ComponentName(props) {
                    (r'function\s+([A-Z][A-Za-z0-9_]*)\s*\([^)]*\)\s*{', ComponentType.FUNCTION_COMPONENT),
                    # const ComponentName = (props) => {
                    (r'const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*\([^)]*\)\s*=>\s*{', ComponentType.ARROW_COMPONENT),
                    # const ComponentName: FC<Props> = (props) => {
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
                print(f"  ⚠️  Warning: Could not analyze components in {rel_path}: {e}")
    
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
        """Resolve import path to file relative path"""
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
        return None
    
    def _detect_duplicates_multi_layer(self):
        """Multi-layer duplicate detection"""
        print("  📊 Layer 1: Exact duplicates (hash-based)...")
        exact_clusters = self._detect_exact_duplicates()
        
        print("  📊 Layer 2: Structural duplicates...")
        structural_clusters = self._detect_structural_duplicates()
        
        # Combine clusters
        all_clusters = exact_clusters + structural_clusters
        self.duplicate_clusters = self._analyze_and_cluster_duplicates(all_clusters)
        self.stats["duplicates_found"] = len(self.duplicate_clusters)
    
    def _detect_exact_duplicates(self) -> List[DuplicateCluster]:
        """Detect exact duplicates using content hash"""
        clusters = []
        
        for hash_val, files in self._hash_index.items():
            if len(files) > 1:
                # Calculate metrics
                total_bytes = sum(self.files[f].size_bytes for f in files)
                total_lines = sum(self.files[f].lines_of_code for f in files)
                wasted_bytes = total_bytes - self.files[files[0]].size_bytes
                wasted_lines = total_lines - self.files[files[0]].lines_of_code
                
                # Determine risk and recommendation
                risk = RiskLevel.LOW
                recommendation = Recommendation.MERGE_INTO_ANOTHER_FILE
                base_file = self._select_base_file_for_merge(files)
                
                cluster = DuplicateCluster(
                    cluster_id=f"exact_{hash_val[:8]}",
                    files=files,
                    similarity_score=1.0,
                    duplication_type="exact",
                    risk_level=risk,
                    primary_recommendation=recommendation,
                    confidence=0.95,
                    suggested_base_file=base_file,
                    total_wasted_bytes=wasted_bytes,
                    total_wasted_lines=wasted_lines,
                    reasoning=["Files are byte-for-byte identical", "Safe to merge"]
                )
                clusters.append(cluster)
        
        return clusters
    
    def _detect_structural_duplicates(self) -> List[DuplicateCluster]:
        """Detect structural duplicates (normalized content)"""
        clusters = []
        
        # Group by structural hash
        for struct_hash, files in self._structural_index.items():
            if len(files) > 1:
                # Calculate similarity for each pair
                similarities = []
                for i in range(len(files)):
                    for j in range(i + 1, len(files)):
                        sim = self._calculate_structural_similarity(files[i], files[j])
                        if sim >= Config.SIMILARITY_THRESHOLD:
                            similarities.append((files[i], files[j], sim))
                
                if similarities:
                    # Create cluster from similar files
                    all_files = set()
                    for f1, f2, _ in similarities:
                        all_files.add(f1)
                        all_files.add(f2)
                    
                    avg_similarity = sum(sim for _, _, sim in similarities) / len(similarities)
                    
                    # Determine risk and recommendation
                    risk = RiskLevel.MEDIUM if avg_similarity > 0.9 else RiskLevel.HIGH
                    recommendation = Recommendation.REFACTOR_FOR_CLARITY
                    base_file = self._select_base_file_for_merge(list(all_files))
                    
                    # Generate diff summary
                    diff_summary = self._generate_structural_diff_summary(list(all_files))
                    
                    cluster = DuplicateCluster(
                        cluster_id=f"structural_{struct_hash[:8]}",
                        files=list(all_files),
                        similarity_score=avg_similarity,
                        duplication_type="structural",
                        risk_level=risk,
                        primary_recommendation=recommendation,
                        confidence=0.7,
                        suggested_base_file=base_file,
                        diff_summary=diff_summary,
                        estimated_impact="MEDIUM",
                        reasoning=["Files have similar structure but may have differences", "Requires manual review"]
                    )
                    clusters.append(cluster)
        
        return clusters
    
    def _compute_structural_hash(self, content: str) -> str:
        """Compute structural hash (normalized content)"""
        # Remove comments
        normalized = re.sub(r'//.*$', '', content, flags=re.MULTILINE)
        normalized = re.sub(r'/\*.*?\*/', '', normalized, flags=re.DOTALL)
        
        # Remove strings
        normalized = re.sub(r'["\'`].*?["\'`]', '""', normalized)
        
        # Normalize whitespace
        normalized = re.sub(r'\s+', ' ', normalized)
        
        # Replace variable names with placeholders
        normalized = re.sub(r'\b(const|let|var)\s+(\w+)\s*=', r'\1 VAR =', normalized)
        normalized = re.sub(r'function\s+(\w+)', 'function FUNC', normalized)
        
        return hashlib.sha256(normalized.encode()).hexdigest()
    
    def _calculate_structural_similarity(self, file1: str, file2: str) -> float:
        """Calculate structural similarity between two files"""
        try:
            content1 = (self.root / file1).read_text(encoding='utf-8', errors='ignore')
            content2 = (self.root / file2).read_text(encoding='utf-8', errors='ignore')
            
            # Normalize both
            norm1 = self._normalize_for_comparison(content1)
            norm2 = self._normalize_for_comparison(content2)
            
            # Use sequence matcher
            from difflib import SequenceMatcher
            return SequenceMatcher(None, norm1, norm2).ratio()
        except:
            return 0.0
    
    def _normalize_for_comparison(self, content: str) -> str:
        """Normalize content for comparison"""
        # Same as structural hash but keep as string
        normalized = re.sub(r'//.*$', '', content, flags=re.MULTILINE)
        normalized = re.sub(r'/\*.*?\*/', '', normalized, flags=re.DOTALL)
        normalized = re.sub(r'["\'`].*?["\'`]', '""', normalized)
        normalized = re.sub(r'\s+', ' ', normalized)
        return normalized.strip()
    
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
            
            # Prefer files in src/ directory
            if 'src/' in file:
                score += 20
            
            # Prefer shorter paths (closer to root)
            score += max(0, 50 - len(file.split('/')))
            
            scores.append((score, file))
        
        return max(scores)[1]
    
    def _generate_structural_diff_summary(self, files: List[str]) -> List[str]:
        """Generate high-level diff summary"""
        if len(files) < 2:
            return ["Only one file in cluster"]
        
        summaries = []
        
        # Compare first two files
        try:
            content1 = (self.root / files[0]).read_text(encoding='utf-8', errors='ignore')
            content2 = (self.root / files[1]).read_text(encoding='utf-8', errors='ignore')
            
            lines1 = content1.splitlines()
            lines2 = content2.splitlines()
            
            # Count differences
            func_count1 = len(re.findall(r'function\s+\w+', content1))
            func_count2 = len(re.findall(r'function\s+\w+', content2))
            
            if func_count1 != func_count2:
                summaries.append(f"Different function counts: {func_count1} vs {func_count2}")
            
            # Check for different imports
            imports1 = set(re.findall(r'from\s+[\'"]([^\'"]+)[\'"]', content1))
            imports2 = set(re.findall(r'from\s+[\'"]([^\'"]+)[\'"]', content2))
            
            if imports1 != imports2:
                diff = len(imports1.symmetric_difference(imports2))
                summaries.append(f"Different imports: {diff} unique imports")
            
        except:
            summaries.append("Could not generate detailed diff")
        
        return summaries
    
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
        
        # Set merge suggestions
        if cluster.similarity_score > 0.9 and len(cluster.files) > 1:
            cluster.suggested_base_file = self._select_base_file_for_merge(cluster.files)
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
            f"Potential savings: {cluster.total_wasted_bytes} bytes, {cluster.total_wasted_lines} lines"
        ])
    
    def _assess_risks_and_recommendations(self):
        """Conservative risk assessment and recommendation generation"""
        for rel_path, file_info in self.files.items():
            # Reset recommendations
            file_info.primary_recommendation = Recommendation.KEEP_AS_IS
            file_info.secondary_recommendation = None
            file_info.reasoning = []
            file_info.safety_notes = []
            
            # Assess risk based on various factors
            risk_factors = []
            
            # Factor 1: Export usage
            if file_info.exported_symbols and not file_info.dependents:
                risk_factors.append(("Exported but never imported", RiskLevel.HIGH))
                file_info.primary_recommendation = Recommendation.INVESTIGATE
                file_info.reasoning.append("File exports symbols but nothing imports them")
            
            # Factor 2: Unused components
            unused_comps = [c for c in file_info.components if c.usage_count == 0]
            if unused_comps and file_info.dependents:
                risk_factors.append(("Contains unused components", RiskLevel.MEDIUM))
                file_info.secondary_recommendation = Recommendation.REFACTOR_FOR_CLARITY
            
            # Factor 3: Unused hooks
            unused_hooks = [h for h in file_info.hooks if h.usage_count == 0]
            if unused_hooks:
                risk_factors.append(("Contains unused hooks", RiskLevel.HIGH))
                file_info.primary_recommendation = Recommendation.INVESTIGATE
            
            # Factor 4: Recent modifications
            days_since_mod = (time.time() - file_info.last_modified) / (24 * 3600)
            if days_since_mod < Config.RISK_RULES["very_recent_modification_days"]:
                risk_factors.append(("Recently modified (< 30 days)", RiskLevel.MEDIUM))
                file_info.safety_notes.append("Recently modified - handle with care")
            elif days_since_mod < Config.RISK_RULES["recent_modification_days"]:
                risk_factors.append(("Modified in last 60 days", RiskLevel.LOW))
            
            # Factor 5: Type safety
            if file_info.any_type_count > 5 or file_info.ts_ignore_count > 2:
                risk_factors.append(("Poor type safety", RiskLevel.MEDIUM))
                file_info.secondary_recommendation = Recommendation.REFACTOR_FOR_CLARITY
            
            # Determine overall risk level
            if risk_factors:
                # Take the highest risk factor
                risk_levels = [factor[1] for factor in risk_factors]
                file_info.risk_level = max(risk_levels, key=lambda r: r.value)
            else:
                file_info.risk_level = RiskLevel.LOW
            
            # Apply safety rules
            self._apply_safety_rules(file_info)
    
    def _apply_safety_rules(self, file_info: FileInfo):
        """Apply conservative safety rules"""
        # Never recommend deletion for recently modified files
        days_since_mod = (time.time() - file_info.last_modified) / (24 * 3600)
        if days_since_mod < Config.SAFETY_RULES["never_delete_recent_days"]:
            if file_info.primary_recommendation in [Recommendation.SAFE_TO_REMOVE, Recommendation.SAFE_TO_ARCHIVE]:
                file_info.primary_recommendation = Recommendation.INVESTIGATE
                file_info.safety_notes.append("Recently modified - not safe to delete")
        
        # Never recommend deletion for files with dependents
        if file_info.dependents and Config.SAFETY_RULES["never_delete_with_dependents"]:
            if file_info.primary_recommendation in [Recommendation.SAFE_TO_REMOVE, Recommendation.SAFE_TO_ARCHIVE]:
                file_info.primary_recommendation = Recommendation.KEEP_AS_IS
                file_info.safety_notes.append(f"Has {len(file_info.dependents)} dependents")
        
        # Prefer archive over delete
        if file_info.primary_recommendation == Recommendation.SAFE_TO_REMOVE and \
           Config.SAFETY_RULES["prefer_archive_over_delete"]:
            file_info.primary_recommendation = Recommendation.SAFE_TO_ARCHIVE
            file_info.reasoning.append("Archive recommended over deletion")
    
    def _compute_stability_scores(self):
        """Compute stability score for each file (0-10)"""
        for file_info in self.files.values():
            # Calculate components
            dependents_factor = math.log(1 + len(file_info.dependents))
            exported_symbols_factor = len(file_info.exported_symbols)
            
            # Age factor (older is more stable)
            days_since_mod = (time.time() - file_info.last_modified) / (24 * 3600)
            age_factor = min(days_since_mod / 365, 1.0) * 10  # 0-10 scale
            
            # Complexity factor (simpler is more stable)
            complexity = file_info.complexity_score if hasattr(file_info, 'complexity_score') else 5.0
            complexity_factor = max(0, 10 - complexity)
            
            # Type safety factor
            type_safety = file_info.type_safety_score
            
            # Weighted sum
            weights = Config.STABILITY_WEIGHTS
            stability = (
                weights["dependents"] * dependents_factor +
                weights["exported_symbols"] * exported_symbols_factor +
                weights["age_factor"] * age_factor +
                weights["complexity"] * complexity_factor +
                weights["type_safety"] * type_safety
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
    
    def _extract_exports(self, content: str) -> List[str]:
        """Extract exported symbols"""
        exports = []
        patterns = [
            r'export\s+(?:default\s+)?(?:class|interface|type|enum)\s+(\w+)',
            r'export\s+(?:default\s+)?(?:function|const|let|var)\s+(\w+)',
            r'export\s*{\s*([^}]+?)\s*}',
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, content, re.MULTILINE)
            for match in matches:
                if isinstance(match, str):
                    symbols = [s.strip().split(' as ')[0].strip() for s in match.split(',')]
                    exports.extend(s for s in symbols if s and s not in exports)
        
        return exports
    
    def _extract_imports(self, content: str) -> Tuple[List[str], List[str]]:
        """Extract imported symbols and import statements"""
        symbols = []
        statements = []
        
        import_patterns = [
            r'import\s+(?:[\w*{},\s]+?)\s+from\s+[\'"]([^\'"]+)[\'"]',
            r'import\s+[\'"]([^\'"]+)[\'"]',
        ]
        
        for pattern in import_patterns:
            matches = re.findall(pattern, content, re.MULTILINE)
            statements.extend(matches)
            
            # Extract symbols from named imports
            named_pattern = r'import\s+{([^}]+)}\s+from'
            named_matches = re.findall(named_pattern, content, re.MULTILINE)
            for match in named_matches:
                symbols.extend([s.strip().split(' as ')[0].strip() for s in match.split(',')])
        
        return symbols, statements
    
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
            recommendations_summary=dict(rec_summary)
        )
    
    def _generate_complete_report(self) -> Dict[str, Any]:
        """Generate complete analysis report"""
        return {
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "tool": "G-Studio Ultimate Intelligent Refactor & Stability Analyzer",
                "version": "2.0.0",
                "root_path": str(self.root),
                "analysis_duration": self.stats["analysis_time"]
            },
            "project_metrics": asdict(self.project_metrics) if self.project_metrics else {},
            "files": {
                path: {
                    "relative_path": info.relative_path,
                    "category": info.category.value,
                    "size_bytes": info.size_bytes,
                    "lines": info.lines_of_code,
                    "last_modified": info.last_modified_human,
                    "stability_score": round(info.stability_score, 2),
                    "risk_level": info.risk_level.value,
                    "primary_recommendation": info.primary_recommendation.value,
                    "dependents_count": len(info.dependents),
                    "components": len(info.components),
                    "hooks": len(info.hooks)
                }
                for path, info in self.files.items()
            },
            "components": {
                key: {
                    "name": comp.name,
                    "file": comp.file_path,
                    "line": comp.line_number,
                    "type": comp.component_type.value,
                    "exported": comp.is_exported,
                    "usage_count": comp.usage_count,
                    "risk_level": comp.risk_level.value,
                    "recommendation": comp.recommendation.value
                }
                for key, comp in self.components.items()
            },
            "duplicate_clusters": [asdict(c) for c in self.duplicate_clusters],
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
        
        print(f"\n🎯 RECOMMENDATIONS")
        for rec, count in metrics.recommendations_summary.items():
            if count > 0:
                print(f"   {rec.value}: {count:,}")
        
        print(f"\n⏱️  PERFORMANCE")
        print(f"   Analysis time: {self.stats['analysis_time']:.2f} seconds")
        print(f"   Files per second: {self.stats['files_scanned'] / self.stats['analysis_time']:.1f}")
        
        print(f"\n💡 NEXT STEPS")
        print("   1. Review high-risk findings first")
        print("   2. Create git branch before any changes")
        print("   3. Start with exact duplicates (lowest risk)")
        print("   4. Archive, don't delete, when unsure")
        print("   5. Run tests after each batch of changes")

# ============================================================================
# INTERACTIVE TERMINAL MENU
# ============================================================================

class InteractiveMenu:
    """Interactive terminal menu system"""
    
    def __init__(self, analyzer: UltimateRefactorAnalyzer):
        self.analyzer = analyzer
        self.report = None
        self.dashboard_html = None
        
    def display_menu(self):
        """Display main menu"""
        while True:
            print("\n" + "="*70)
            print("G-STUDIO ULTIMATE COMPONENT ANALYZER")
            print("="*70)
            print("\nMAIN MENU")
            print("1. Run full analysis")
            print("2. View summary")
            print("3. Show high-risk files")
            print("4. Show duplicate clusters")
            print("5. Show unused components")
            print("6. Show unwired components")
            print("7. Generate HTML dashboard")
            print("8. Export JSON report")
            print("9. View file categories")
            print("r. Refresh analysis")
            print("h. Help / About")
            print("0. Exit")
            print("-"*70)
            
            choice = input("\nSelect option (1-9, r, h, 0): ").strip().lower()
            
            if choice == '0':
                print("\n👋 Exiting. Safe refactoring!")
                break
            elif choice == '1':
                self._run_full_analysis()
            elif choice == '2':
                self._view_summary()
            elif choice == '3':
                self._show_high_risk()
            elif choice == '4':
                self._show_duplicates()
            elif choice == '5':
                self._show_unused_components()
            elif choice == '6':
                self._show_unwired_components()
            elif choice == '7':
                self._generate_dashboard()
            elif choice == '8':
                self._export_json()
            elif choice == '9':
                self._show_categories()
            elif choice == 'r':
                self._refresh_analysis()
            elif choice == 'h':
                self._show_help()
            else:
                print("⚠️  Invalid option. Please try again.")
    
    def _run_full_analysis(self):
        """Run complete analysis"""
        print("\n🔄 Running full analysis...")
        self.report = self.analyzer.run_full_analysis()
        print("\n✅ Analysis complete!")
    
    def _view_summary(self):
        """View analysis summary"""
        if not self.report:
            print("\n⚠️  Please run analysis first (option 1)")
            return
        
        metrics = self.report.get('project_metrics', {})
        
        print("\n" + "="*70)
        print("ANALYSIS SUMMARY")
        print("="*70)
        
        print(f"\n📁 Project Size:")
        print(f"   Files: {metrics.get('total_files', 0):,}")
        print(f"   Lines of code: {metrics.get('total_lines', 0):,}")
        print(f"   Components: {metrics.get('total_components', 0):,}")
        print(f"   Hooks: {metrics.get('total_hooks', 0):,}")
        
        print(f"\n⚠️  Risk Distribution:")
        risk_dist = metrics.get('risk_distribution', {})
        for risk, count in risk_dist.items():
            print(f"   {risk}: {count:,}")
        
        print(f"\n🔍 Findings:")
        print(f"   Unused components: {metrics.get('unused_components', 0):,}")
        print(f"   Unwired components: {metrics.get('unwired_components', 0):,}")
        print(f"   Duplicate clusters: {metrics.get('duplicate_clusters', 0):,}")
        
        print(f"\n📊 Quality Metrics:")
        print(f"   Avg stability: {metrics.get('average_stability', 0):.2f}/10")
        print(f"   Avg type safety: {metrics.get('average_type_safety', 0):.2f}/10")
    
    def _show_high_risk(self):
        """Show high-risk files"""
        if not self.report:
            print("\n⚠️  Please run analysis first (option 1)")
            return
        
        high_risk = []
        for path, info in self.report.get('files', {}).items():
            if info['risk_level'] in ['high', 'critical']:
                high_risk.append((path, info))
        
        if not high_risk:
            print("\n✅ No high-risk files found!")
            return
        
        print(f"\n⚠️  HIGH-RISK FILES ({len(high_risk)} found)")
        print("-"*70)
        
        for path, info in sorted(high_risk, key=lambda x: x[1]['risk_level'], reverse=True)[:20]:
            print(f"\n📄 {path}")
            print(f"   Category: {info['category']}")
            print(f"   Risk: {info['risk_level'].upper()}")
            print(f"   Recommendation: {info['primary_recommendation']}")
            print(f"   Dependents: {info['dependents_count']}")
            print(f"   Stability: {info['stability_score']}/10")
    
    def _show_duplicates(self):
        """Show duplicate clusters"""
        if not self.report:
            print("\n⚠️  Please run analysis first (option 1)")
            return
        
        clusters = self.report.get('duplicate_clusters', [])
        
        if not clusters:
            print("\n✅ No duplicate clusters found!")
            return
        
        print(f"\n🔄 DUPLICATE CLUSTERS ({len(clusters)} found)")
        print("-"*70)
        
        for cluster in clusters[:10]:  # Show first 10
            print(f"\n📁 Cluster {cluster['cluster_id']}")
            print(f"   Type: {cluster['duplication_type']}")
            print(f"   Similarity: {cluster['similarity_score']:.1%}")
            print(f"   Files: {len(cluster['files'])}")
            print(f"   Risk: {cluster['risk_level']}")
            print(f"   Recommendation: {cluster['primary_recommendation']}")
            print(f"   Wasted: {cluster['total_wasted_bytes']:,} bytes")
            
            if cluster['suggested_base_file']:
                print(f"   Suggested base: {cluster['suggested_base_file']}")
    
    def _show_unused_components(self):
        """Show unused components"""
        if not self.report:
            print("\n⚠️  Please run analysis first (option 1)")
            return
        
        unused = []
        for key, comp in self.report.get('components', {}).items():
            if comp['usage_count'] == 0:
                unused.append((key, comp))
        
        if not unused:
            print("\n✅ All components are being used!")
            return
        
        print(f"\n🚫 UNUSED COMPONENTS ({len(unused)} found)")
        print("-"*70)
        
        for key, comp in sorted(unused, key=lambda x: x[1]['risk_level'], reverse=True)[:20]:
            print(f"\n⚛️  {comp['name']}")
            print(f"   File: {comp['file']}:{comp['line']}")
            print(f"   Type: {comp['type']}")
            print(f"   Exported: {comp['exported']}")
            print(f"   Risk: {comp['risk_level']}")
            print(f"   Recommendation: {comp['recommendation']}")
    
    def _show_unwired_components(self):
        """Show unwired (exported but unused) components"""
        if not self.report:
            print("\n⚠️  Please run analysis first (option 1)")
            return
        
        unwired = []
        for key, comp in self.report.get('components', {}).items():
            if comp['exported'] and comp['usage_count'] == 0:
                unwired.append((key, comp))
        
        if not unwired:
            print("\n✅ All exported components are wired into the application!")
            return
        
        print(f"\n🔌 UNWIRED COMPONENTS ({len(unwired)} found)")
        print("-"*70)
        print("These components are exported but never imported elsewhere.")
        print("They may represent unwired features or dead code.")
        print("-"*70)
        
        for key, comp in sorted(unwired, key=lambda x: x[1]['risk_level'], reverse=True)[:15]:
            print(f"\n⚛️  {comp['name']}")
            print(f"   File: {comp['file']}")
            print(f"   Risk: {comp['risk_level']}")
            print(f"   Recommendation: {comp['recommendation']}")
    
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
        print("-"*70)
        
        total = sum(category_dist.values())
        for category, count in sorted(category_dist.items(), key=lambda x: x[1], reverse=True):
            percentage = (count / total) * 100
            print(f"{category:20} {count:5} files ({percentage:.1f}%)")
    
    def _generate_dashboard(self):
        """Generate HTML dashboard"""
        if not self.report:
            print("\n⚠️  Please run analysis first (option 1)")
            return
        
        print("\n🔄 Generating interactive dashboard...")
        self.dashboard_html = DashboardGenerator(self.report, self.analyzer.root).generate()
        
        # Save to file
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"reports/refactor_dashboard_{timestamp}.html"
        
        os.makedirs("reports", exist_ok=True)
        
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(self.dashboard_html)
        
        print(f"✅ Dashboard saved: {filename}")
        print(f"📊 Open in browser to view interactive report")
    
    def _export_json(self):
        """Export JSON report"""
        if not self.report:
            print("\n⚠️  Please run analysis first (option 1)")
            return
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"reports/analysis_report_{timestamp}.json"
        
        os.makedirs("reports", exist_ok=True)
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(self.report, f, indent=2, default=str)
        
        print(f"✅ JSON report saved: {filename}")
    
    def _refresh_analysis(self):
        """Refresh analysis"""
        print("\n🔄 Refreshing analysis...")
        self.report = self.analyzer.run_full_analysis()
        print("✅ Analysis refreshed!")
    
    def _show_help(self):
        """Show help information"""
        print("\n" + "="*70)
        print("HELP & ABOUT")
        print("="*70)
        print("\nG-Studio Ultimate Intelligent Refactor & Stability Analyzer")
        print("Version 2.0.0")
        print("\n🔒 CONSERVATIVE APPROACH:")
        print("• Safety first - never recommends aggressive deletion")
        print("• Prefers investigation over removal")
        print("• Archives before deleting")
        print("• Respects dependency graphs")
        print("\n📊 KEY FEATURES:")
        print("• Multi-layer duplicate detection")
        print("• Risk assessment with confidence scoring")
        print("• Stability scoring (0-10)")
        print("• Automated merge proposals")
        print("• Interactive HTML dashboard")
        print("\n🎯 RECOMMENDATION HIERARCHY:")
        print("1. Keep as is (when in doubt)")
        print("2. Investigate (requires manual review)")
        print("3. Refactor for clarity")
        print("4. Merge into another file")
        print("5. Archive (never delete without archiving)")
        print("\n⚠️  SAFETY RULES:")
        print("• Never delete exported components")
        print("• Never delete files modified in last 90 days")
        print("• Never delete files with dependents")
        print("• Always run tests after changes")

# ============================================================================
# DASHBOARD GENERATOR
# ============================================================================

class DashboardGenerator:
    """Generate professional interactive HTML dashboard"""
    
    def __init__(self, report: Dict[str, Any], root_path: Path):
        self.report = report
        self.root = root_path
    
    def generate(self) -> str:
        """Generate complete HTML dashboard"""
        return f"""
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>G-Studio Refactor Dashboard</title>
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
        
        .recommendation {{
            padding: 4px 8px;
            background: rgba(59, 130, 246, 0.2);
            border-radius: 6px;
            font-size: 12px;
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
                const risk = item.querySelector('.risk-badge').className;
                
                let matchesSearch = text.includes(searchTerm);
                let matchesFilter = filter === 'all' || 
                                   (filter === 'high' && risk.includes('high')) ||
                                   (filter === 'medium' && risk.includes('medium')) ||
                                   (filter === 'low' && risk.includes('low'));
                
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
            <h1>🏗️ G-Studio Refactor Dashboard</h1>
            <p>Conservative stability analysis for React/TypeScript applications</p>
            <div style="margin-top: 10px; color: var(--text-secondary);">
                <div>Project: {html.escape(str(self.root))}</div>
                <div>Generated: {meta.get('generated_at', 'Unknown')}</div>
                <div>Files: {metrics.get('total_files', 0)} | Components: {metrics.get('total_components', 0)}</div>
            </div>
        </div>
        """
    
    def _generate_stats_grid(self) -> str:
        """Generate statistics grid"""
        metrics = self.report.get('project_metrics', {})
        risk_stats = self.report.get('risk_analysis', {})
        
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
                <div style="font-size: 14px; color: var(--text-secondary);">High Risk Files</div>
                <div class="stat-value" style="color: var(--danger);">{risk_stats.get('high_risk_files', 0)}</div>
                <div style="font-size: 14px; color: var(--text-secondary);">
                    {risk_stats.get('critical_risk_files', 0)} critical
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
                <button class="filter-btn" data-filter="unused">Unused Components</button>
                <button class="filter-btn" data-filter="duplicate">Duplicates</button>
            </div>
            
            <div style="color: var(--text-secondary); font-size: 14px;">
                <span style="display: inline-block; width: 12px; height: 12px; background: var(--success); border-radius: 50%; margin-right: 5px;"></span>
                Low Risk
                <span style="display: inline-block; width: 12px; height: 12px; background: var(--warning); border-radius: 50%; margin-left: 15px; margin-right: 5px;"></span>
                Medium Risk
                <span style="display: inline-block; width: 12px; height: 12px; background: var(--danger); border-radius: 50%; margin-left: 15px; margin-right: 5px;"></span>
                High Risk
            </div>
        </div>
        """
    
    def _generate_details_sections(self) -> str:
        """Generate collapsible details sections"""
        metrics = self.report.get('project_metrics', {})
        files = self.report.get('files', {})
        
        # High risk files section
        high_risk_files = []
        for path, info in files.items():
            if info['risk_level'] in ['high', 'critical']:
                high_risk_files.append((path, info))
        
        high_risk_html = ""
        for path, info in sorted(high_risk_files, key=lambda x: x[1]['stability_score'])[:50]:
            risk_class = f"risk-{info['risk_level']}"
            high_risk_html += f"""
            <div class="file-item">
                <div>{html.escape(path)}</div>
                <div><span class="risk-badge {risk_class}">{info['risk_level'].upper()}</span></div>
                <div>{info['category']}</div>
                <div><span class="recommendation">{info['primary_recommendation']}</span></div>
                <div>{info['stability_score']}/10</div>
            </div>
            """
        
        # Unused components section
        components = self.report.get('components', {})
        unused_components = []
        for key, comp in components.items():
            if comp['usage_count'] == 0:
                unused_components.append((key, comp))
        
        unused_html = ""
        for key, comp in sorted(unused_components, key=lambda x: x[1]['risk_level'], reverse=True)[:50]:
            risk_class = f"risk-{comp['risk_level']}"
            unused_html += f"""
            <div class="file-item">
                <div>{html.escape(comp['name'])}</div>
                <div>{html.escape(comp['file'])}:{comp['line']}</div>
                <div><span class="risk-badge {risk_class}">{comp['risk_level'].upper()}</span></div>
                <div>{comp['type']}</div>
                <div><span class="recommendation">{comp['recommendation']}</span></div>
            </div>
            """
        
        return f"""
        <details open>
            <summary>⚠️ High Risk Files ({len(high_risk_files)})</summary>
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
            <summary>🚫 Unused Components ({len(unused_components)})</summary>
            <div class="details-content">
                <div class="file-list">
                    <div class="file-item" style="font-weight: bold; background: var(--bg-secondary);">
                        <div>Component Name</div>
                        <div>Location</div>
                        <div>Risk Level</div>
                        <div>Type</div>
                        <div>Recommendation</div>
                    </div>
                    {unused_html if unused_html else '<div style="text-align: center; padding: 20px; color: var(--text-secondary);">All components are being used</div>'}
                </div>
            </div>
        </details>
        
        <details>
            <summary>🔄 Duplicate Clusters ({metrics.get('duplicate_clusters', 0)})</summary>
            <div class="details-content">
                {self._generate_duplicates_section()}
            </div>
        </details>
        
        <details>
            <summary>📊 File Categories</summary>
            <div class="details-content">
                {self._generate_categories_section()}
            </div>
        </details>
        """
    
    def _generate_duplicates_section(self) -> str:
        """Generate duplicates section"""
        clusters = self.report.get('duplicate_clusters', [])
        
        if not clusters:
            return '<div style="text-align: center; padding: 20px; color: var(--text-secondary);">No duplicate clusters found</div>'
        
        html = ""
        for cluster in clusters[:10]:  # Show first 10
            risk_class = f"risk-{cluster['risk_level']}"
            html += f"""
            <div style="margin-bottom: 20px; padding: 15px; background: var(--bg-secondary); border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <div>
                        <strong>Cluster {cluster['cluster_id']}</strong>
                        <span class="risk-badge {risk_class}" style="margin-left: 10px;">{cluster['risk_level'].upper()}</span>
                    </div>
                    <div>Similarity: {(cluster['similarity_score'] * 100):.1f}%</div>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <strong>Files ({len(cluster['files'])}):</strong>
                    <div style="font-family: monospace; font-size: 12px; margin-top: 5px;">
                        {', '.join(cluster['files'][:3])}
                        {f'... and {len(cluster['files']) - 3} more' if len(cluster['files']) > 3 else ''}
                    </div>
                </div>
                
                <div style="display: flex; justify-content: space-between; font-size: 14px;">
                    <div>Recommendation: <span class="recommendation">{cluster['primary_recommendation']}</span></div>
                    <div>Impact: {cluster['estimated_impact']}</div>
                    <div>Wasted: {cluster['total_wasted_bytes']:,} bytes</div>
                </div>
            </div>
            """
        
        return html
    
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
        
        # Convert enum keys to strings
        labels = []
        values = []
        
        for risk in [RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH, RiskLevel.CRITICAL]:
            label = risk.value.capitalize()
            value = risk_dist.get(risk, 0)
            
            if value > 0:
                labels.append(label)
                values.append(value)
        
        return {"labels": labels, "values": values}
    
    def _get_category_data(self) -> Dict[str, Any]:
        """Get category data for chart"""
        metrics = self.report.get('project_metrics', {})
        category_dist = metrics.get('category_distribution', {})
        
        # Sort by count
        sorted_categories = sorted(category_dist.items(), key=lambda x: x[1], reverse=True)
        
        # Take top 8
        top_categories = sorted_categories[:8]
        
        labels = [cat[0] for cat in top_categories]
        values = [cat[1] for cat in top_categories]
        
        return {"labels": labels, "values": values}

# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

def main():
    """Main entry point"""
    print("\n" + "="*70)
    print("G-STUDIO ULTIMATE INTELLIGENT REFACTOR & STABILITY ANALYZER")
    print("="*70)
    print("\n🔒 Conservative engineering-grade analysis")
    print("🎯 Safety first, minimal risk approach")
    print("📊 Professional reporting with actionable insights")
    print("-"*70)
    
    # Get project root
    if len(sys.argv) > 1:
        root_path = sys.argv[1]
    else:
        root_path = input("Enter project root path (press Enter for current directory): ").strip()
        if not root_path:
            root_path = "."
    
    try:
        # Initialize analyzer
        analyzer = UltimateRefactorAnalyzer(root_path)
        
        # Run initial analysis
        print("\n🔄 Running initial analysis...")
        report = analyzer.run_full_analysis()
        
        # Start interactive menu
        menu = InteractiveMenu(analyzer)
        menu.report = report
        menu.display_menu()
        
    except KeyboardInterrupt:
        print("\n\n👋 Operation cancelled by user")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()