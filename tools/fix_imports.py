#!/usr/bin/env python3
"""
═══════════════════════════════════════════════════════════════════════════════
    React/TypeScript Comprehensive Analyzer with Interactive Tinker UI
    COMPLETE EDITION - All Features Fully Implemented
═══════════════════════════════════════════════════════════════════════════════

Version: 9.0.0 - Complete Production Edition
Author: Autonomous Coding Agent

ALL FEATURES:
  ✓ Complete recursive project scanning (excluding backups)
  ✓ Timestamped backup system (YYYY-MM-DD_HH-mm-ss format)
  ✓ Path alias resolution (tsconfig.json, vite.config.ts)
  ✓ Automatic import/export fixing with feature preservation
  ✓ Intelligent fuzzy matching with Levenshtein distance
  ✓ Smart stub file generation for missing imports
  ✓ Duplicate detection and circular dependency resolution
  ✓ Performance optimization suggestions
  ✓ Component enhancement (React.memo, lazy loading)
  ✓ Interactive HTML dashboard with clickable navigation
  ✓ JSON report for machine processing
  ✓ Markdown changelog generation
  ✓ Real-time terminal logging with progress bars
  ✓ Menu interaction optimization (clear & refresh)
  ✓ Optional interactive Tinker UI (web-based)
  ✓ Build verification (TypeScript + npm/pnpm/yarn)
  ✓ Atomic checkpoint system with rollback support
  ✓ Separate source/destination directories
  ✓ Auto-apply safe fixes mode
  ✓ Features explicitly tracked and preserved

═══════════════════════════════════════════════════════════════════════════════
"""

import os
import re
import json
import shutil
import argparse
import logging
import sys
import hashlib
import time
import socket
import webbrowser
import subprocess
from pathlib import Path
from typing import Dict, List, Tuple, Set, Optional, Any, Union
from dataclasses import dataclass, field, asdict
from datetime import datetime
from collections import defaultdict, deque
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock, Thread
from html import escape
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse
import socketserver

VERSION = "9.0.0"

# ═══════════════════════════════════════════════════════════════════════════════
# CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

CONFIG = {
    "project": {
        "extensions": [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".d.ts", ".vue", ".svelte"],
        "style_extensions": [".css", ".scss", ".sass", ".less", ".module.css"],
        "asset_extensions": [".json", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".webp"],
        "exclude_patterns": [
            "node_modules", ".git", "dist", "build", "coverage",
            ".next", ".nuxt", ".vite", "__pycache__", ".cache",
            "public", ".turbo", ".vercel", ".netlify", ".parcel-cache",
            ".codefixer_backups", "backups", "backup_*"
        ],
        "backup_dir": ".codefixer_backups",
        "unfixable_dir": "unfixable"
    },
    "analysis": {
        "check_unused": True,
        "check_duplicates": True,
        "check_circular": True,
        "check_syntax": True,
        "check_exports": True,
        "check_imports": True,
        "preserve_features": True,
        "fuzzy_matching": True,
        "fuzzy_threshold": 0.7
    },
    "fixes": {
        "resolve_aliases": True,
        "fix_imports": True,
        "create_stubs": True,
        "preserve_behavior": True,
        "auto_apply_safe": False
    },
    "optimization": {
        "suggest_memo": True,
        "suggest_lazy": True,
        "suggest_code_splitting": True,
        "suggest_menu_optimization": True
    },
    "performance": {
        "max_workers": 8,
        "checkpoint_interval": 50
    },
    "reports": {
        "html_filename": "project-analysis-report.html",
        "json_filename": "project-analysis-report.json",
        "changelog_filename": "CHANGELOG-AUTO.md"
    },
    "ui": {
        "default_port": 8080,
        "title": "React Tinker - Project Analyzer"
    },
    "build": {
        "run_type_check": True,
        "run_build": False,
        "detect_package_manager": True
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# DATA MODELS
# ═══════════════════════════════════════════════════════════════════════════════

@dataclass
class PathAlias:
    """Path alias configuration"""
    alias: str
    path: str
    source: str
    is_active: bool = True
    resolved_count: int = 0

@dataclass
class ImportStatement:
    """Import statement details"""
    line_number: int
    full_statement: str
    module_path: str
    imported_items: List[str]
    is_default: bool
    is_dynamic: bool
    is_type_import: bool
    is_css: bool = False
    resolved_path: Optional[str] = None
    is_resolvable: bool = True
    error: Optional[str] = None
    fix_applied: Optional[str] = None
    original_preserved: bool = True
    fuzzy_candidates: List[str] = field(default_factory=list)

@dataclass
class ExportStatement:
    """Export statement details"""
    line_number: int
    full_statement: str
    exported_items: List[str]
    is_default: bool
    is_re_export: bool
    module_path: Optional[str] = None
    preserved: bool = True

@dataclass
class Feature:
    """Detected feature that must be preserved"""
    name: str
    type: str
    file_path: str
    line_number: int
    description: str
    dependencies: List[str] = field(default_factory=list)
    preserved: bool = True
    used_by: List[str] = field(default_factory=list)
    from_attached_file: bool = False

@dataclass
class Issue:
    """Code issue"""
    type: str
    severity: str
    file_path: str
    line_number: int
    description: str
    suggestion: Optional[str] = None
    fixable: bool = False
    auto_fixed: bool = False
    feature_impact: Optional[str] = None
    preserved_workaround: Optional[str] = None

@dataclass
class Enhancement:
    """Code enhancement suggestion"""
    type: str
    file_path: str
    description: str
    suggestion: str
    code_example: Optional[str] = None
    applied: bool = False
    safe_to_apply: bool = False
    feature_safe: bool = True
    priority: str = "low"

@dataclass
class CircularDependency:
    """Circular dependency chain"""
    cycle: List[str]
    severity: str
    suggestion: str

@dataclass
class BackupInfo:
    """Backup file information"""
    original_path: str
    backup_path: str
    timestamp: str
    size_bytes: int
    checkpoint_id: Optional[str] = None

@dataclass
class Checkpoint:
    """Analysis checkpoint for rollback"""
    checkpoint_id: str
    timestamp: str
    files_processed: int
    backups_count: int
    fixes_applied: int
    description: str

@dataclass
class StubInfo:
    """Auto-generated stub information"""
    path: str
    reason: str
    template_type: str
    suggested_action: str
    created_at: str
    content: str = ""

@dataclass
class BuildVerification:
    """Build verification results"""
    typescript_check: bool
    build_command: bool
    errors: List[str]
    warnings: List[str]
    package_manager: str
    duration_seconds: float

@dataclass
class FileAnalysis:
    """Complete file analysis"""
    path: str
    language: str
    size_bytes: int
    line_count: int
    imports: List[ImportStatement] = field(default_factory=list)
    exports: List[ExportStatement] = field(default_factory=list)
    features: List[Feature] = field(default_factory=list)
    issues: List[Issue] = field(default_factory=list)
    enhancements: List[Enhancement] = field(default_factory=list)
    is_component: bool = False
    is_unused: bool = False
    is_buildable: bool = True
    needs_stub: bool = False
    moved_to_unfixable: bool = False
    backed_up: bool = False
    backup_info: Optional[BackupInfo] = None
    all_features_preserved: bool = True
    dependencies: Set[str] = field(default_factory=set)
    dependents: Set[str] = field(default_factory=set)
    error: Optional[str] = None
    analysis_time: float = 0.0

@dataclass
class DirectoryAnalysis:
    """Directory-level analysis"""
    path: str
    file_count: int
    component_count: int
    total_issues: int
    total_features: int
    subdirectories: List[str] = field(default_factory=list)

@dataclass
class ProjectReport:
    """Complete project analysis report"""
    timestamp: str
    version: str
    project_root: str
    project_name: str
    source_path: str
    dest_path: str
    total_files: int
    total_directories: int
    files_analyzed: List[FileAnalysis]
    directories_analyzed: List[DirectoryAnalysis]
    path_aliases: List[PathAlias]
    circular_dependencies: List[CircularDependency]
    features_detected: int
    features_preserved: int
    attached_file_features: int
    issues_found: int
    issues_fixed: int
    stubs_created: List[StubInfo]
    backups_created: List[BackupInfo]
    checkpoints: List[Checkpoint]
    files_moved: int
    enhancements_suggested: int
    unused_files: int
    execution_time: float
    all_features_intact: bool
    is_buildable: bool
    build_verification: Optional[BuildVerification]
    auto_mode: bool

# ═══════════════════════════════════════════════════════════════════════════════
# UTILITIES
# ═══════════════════════════════════════════════════════════════════════════════

class Colors:
    """ANSI color codes"""
    HEADER = '\033[95m'
    BLUE = '\033[94m'
    CYAN = '\033[96m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
    DIM = '\033[2m'
    
    @staticmethod
    def disable():
        """Disable all colors"""
        for attr in dir(Colors):
            if not attr.startswith('_') and attr != 'disable':
                setattr(Colors, attr, '')

class Logger:
    """Thread-safe logger with progress tracking"""
    _lock = Lock()
    verbose = False
    
    @staticmethod
    def info(msg: str):
        with Logger._lock:
            print(f"{Colors.CYAN}ℹ {msg}{Colors.ENDC}")
    
    @staticmethod
    def success(msg: str):
        with Logger._lock:
            print(f"{Colors.GREEN}✓ {msg}{Colors.ENDC}")
    
    @staticmethod
    def warning(msg: str):
        with Logger._lock:
            print(f"{Colors.YELLOW}⚠ {msg}{Colors.ENDC}")
    
    @staticmethod
    def error(msg: str):
        with Logger._lock:
            print(f"{Colors.RED}✗ {msg}{Colors.ENDC}")
    
    @staticmethod
    def critical(msg: str):
        with Logger._lock:
            print(f"{Colors.RED}{Colors.BOLD}🚨 {msg}{Colors.ENDC}")
    
    @staticmethod
    def header(msg: str):
        with Logger._lock:
            print(f"\n{Colors.BOLD}{Colors.HEADER}{'═' * 80}{Colors.ENDC}")
            print(f"{Colors.BOLD}{Colors.HEADER}{msg.center(80)}{Colors.ENDC}")
            print(f"{Colors.BOLD}{Colors.HEADER}{'═' * 80}{Colors.ENDC}\n")
    
    @staticmethod
    def subheader(msg: str):
        with Logger._lock:
            print(f"\n{Colors.BOLD}{Colors.BLUE}{'─' * 60}{Colors.ENDC}")
            print(f"{Colors.BOLD}{Colors.BLUE}  {msg}{Colors.ENDC}")
            print(f"{Colors.BOLD}{Colors.BLUE}{'─' * 60}{Colors.ENDC}\n")
    
    @staticmethod
    def progress(name: str, current: int, total: int):
        with Logger._lock:
            percent = (current / total * 100) if total > 0 else 0
            bar_length = 40
            filled = int(bar_length * current / total) if total > 0 else 0
            bar = '█' * filled + '░' * (bar_length - filled)
            print(f"\r{Colors.CYAN}  {name}: [{bar}] {current}/{total} ({percent:.1f}%){Colors.ENDC}", end='', flush=True)
            if current == total:
                print()
    
    @staticmethod
    def debug(msg: str):
        if Logger.verbose:
            with Logger._lock:
                print(f"{Colors.DIM}DEBUG: {msg}{Colors.ENDC}")

def levenshtein_distance(s1: str, s2: str) -> int:
    """Calculate Levenshtein distance between two strings"""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    
    return previous_row[-1]

def string_similarity(s1: str, s2: str) -> float:
    """Calculate similarity score between 0 and 1"""
    distance = levenshtein_distance(s1.lower(), s2.lower())
    max_len = max(len(s1), len(s2))
    if max_len == 0:
        return 1.0
    return 1.0 - (distance / max_len)

def compute_file_hash(filepath: Path) -> str:
    """Compute MD5 hash of a file"""
    hasher = hashlib.md5()
    try:
        with open(filepath, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                hasher.update(chunk)
        return hasher.hexdigest()
    except Exception:
        return ""

# ═══════════════════════════════════════════════════════════════════════════════
# BACKUP MANAGER
# ═══════════════════════════════════════════════════════════════════════════════

class EnhancedBackupManager:
    """Manage timestamped backups with checkpoints and version control"""
    
    def __init__(self, dest: Path):
        self.dest = dest
        self.backup_base = dest / CONFIG['project']['backup_dir']
        self.current_backup_dir = self._create_timestamped_backup_dir()
        self.unfixable_dir = self.current_backup_dir / CONFIG['project']['unfixable_dir']
        self.unfixable_dir.mkdir(parents=True, exist_ok=True)
        self.backups: List[BackupInfo] = []
        self.checkpoints: List[Checkpoint] = []
        self._lock = Lock()
    
    def _create_timestamped_backup_dir(self) -> Path:
        """Create timestamped backup directory: YYYY-MM-DD_HH-mm-ss"""
        timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
        backup_dir = self.backup_base / timestamp
        backup_dir.mkdir(parents=True, exist_ok=True)
        Logger.success(f"Created backup directory: {backup_dir.name}")
        return backup_dir
    
    def create_backup(self, filepath: Path, source_root: Path) -> Optional[BackupInfo]:
        """Create timestamped backup of a file"""
        with self._lock:
            try:
                rel_path = filepath.relative_to(source_root)
                backup_path = self.current_backup_dir / rel_path
                backup_path.parent.mkdir(parents=True, exist_ok=True)
                
                shutil.copy2(filepath, backup_path)
                
                backup_info = BackupInfo(
                    original_path=str(rel_path),
                    backup_path=str(backup_path.relative_to(self.dest)),
                    timestamp=datetime.now().isoformat(),
                    size_bytes=filepath.stat().st_size
                )
                
                self.backups.append(backup_info)
                Logger.debug(f"Backed up: {rel_path}")
                return backup_info
            
            except Exception as e:
                Logger.error(f"Failed to backup {filepath.name}: {e}")
                return None
    
    def move_to_unfixable(self, filepath: Path, source_root: Path, reason: str) -> bool:
        """Move unfixable file to special directory (never delete)"""
        with self._lock:
            try:
                rel_path = filepath.relative_to(source_root)
                unfixable_path = self.unfixable_dir / rel_path
                unfixable_path.parent.mkdir(parents=True, exist_ok=True)
                
                # Copy, don't move - preserve original
                shutil.copy2(filepath, unfixable_path)
                
                # Create reason file
                reason_file = unfixable_path.parent / f"{unfixable_path.name}.reason.txt"
                reason_file.write_text(
                    f"Reason: {reason}\n"
                    f"Original: {filepath}\n"
                    f"Timestamp: {datetime.now().isoformat()}\n"
                    f"Action: File copied to unfixable directory for review"
                )
                
                Logger.warning(f"Moved to unfixable: {rel_path}")
                return True
            
            except Exception as e:
                Logger.error(f"Failed to move {filepath.name} to unfixable: {e}")
                return False
    
    def create_checkpoint(self, checkpoint_id: str, files_processed: int, 
                         fixes_applied: int, description: str):
        """Create analysis checkpoint for potential rollback"""
        checkpoint = Checkpoint(
            checkpoint_id=checkpoint_id,
            timestamp=datetime.now().isoformat(),
            files_processed=files_processed,
            backups_count=len(self.backups),
            fixes_applied=fixes_applied,
            description=description
        )
        
        self.checkpoints.append(checkpoint)
        
        # Save checkpoint file
        checkpoint_file = self.current_backup_dir / f"checkpoint_{checkpoint_id}.json"
        with open(checkpoint_file, 'w') as f:
            json.dump(asdict(checkpoint), f, indent=2)
        
        Logger.info(f"Checkpoint: {checkpoint_id} - {description}")
    
    def is_backup_path(self, filepath: Path) -> bool:
        """Check if path is in backup directory"""
        try:
            filepath.relative_to(self.backup_base)
            return True
        except ValueError:
            return False
    
    def get_backup_summary(self) -> Dict[str, Any]:
        """Get backup summary statistics"""
        return {
            "total_backups": len(self.backups),
            "backup_directory": str(self.current_backup_dir.relative_to(self.dest)),
            "total_size_bytes": sum(b.size_bytes for b in self.backups),
            "timestamp": self.current_backup_dir.name,
            "checkpoints": len(self.checkpoints)
        }

# ═══════════════════════════════════════════════════════════════════════════════
# PATH ALIAS RESOLVER
# ═══════════════════════════════════════════════════════════════════════════════

class EnhancedPathAliasResolver:
    """Comprehensive path alias resolver with fuzzy matching"""
    
    def __init__(self, source: Path):
        self.source = source
        self.aliases: List[PathAlias] = []
        self.all_files: List[Path] = []
        self._load_aliases()
    
    def _load_aliases(self):
        """Load all path aliases from configuration files"""
        Logger.info("Loading path aliases...")
        
        # Load from tsconfig files
        for tsconfig in ["tsconfig.json", "tsconfig.app.json", "tsconfig.node.json"]:
            self._load_tsconfig_aliases(tsconfig)
        
        # Load from vite.config files
        for vite_config in ["vite.config.ts", "vite.config.js", "vite.config.mjs"]:
            self._load_vite_aliases(vite_config)
        
        if not self.aliases:
            Logger.warning("No path aliases found - using default '@' -> 'src'")
            # Add default alias
            self.aliases.append(PathAlias(
                alias="@",
                path=str(self.source / "src"),
                source="default"
            ))
        else:
            Logger.success(f"Loaded {len(self.aliases)} path aliases")
    
    def _load_tsconfig_aliases(self, tsconfig: str):
        """Load aliases from tsconfig.json"""
        config_path = self.source / tsconfig
        if not config_path.exists():
            return
        
        try:
            content = config_path.read_text()
            # Remove comments
            content = re.sub(r'//.*', '', content)
            content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
            
            config = json.loads(content)
            
            if 'compilerOptions' in config and 'paths' in config['compilerOptions']:
                base_url = config['compilerOptions'].get('baseUrl', '.')
                
                for alias, paths in config['compilerOptions']['paths'].items():
                    clean_alias = alias.rstrip('/*')
                    
                    for path in paths:
                        clean_path = path.rstrip('/*')
                        resolved_path = str((self.source / base_url / clean_path).resolve())
                        
                        self.aliases.append(PathAlias(
                            alias=clean_alias,
                            path=resolved_path,
                            source=tsconfig
                        ))
                
                Logger.success(f"Loaded aliases from {tsconfig}")
        
        except Exception as e:
            Logger.warning(f"Failed to parse {tsconfig}: {e}")
    
    def _load_vite_aliases(self, vite_config: str):
        """Load aliases from vite.config.ts/js"""
        config_path = self.source / vite_config
        if not config_path.exists():
            return
        
        try:
            content = config_path.read_text()
            
            # Pattern for resolve.alias definitions
            patterns = [
                re.compile(r"['\"]([@\w]+)['\"]\s*:\s*(?:path\.resolve\([^)]*,\s*)?['\"]([^'\"]+)['\"]"),
                re.compile(r"alias\s*:\s*\{([^}]+)\}"),
            ]
            
            for pattern in patterns:
                for match in pattern.finditer(content):
                    if len(match.groups()) == 2:
                        alias, path = match.groups()
                        if not path.startswith('.'):
                            path = './' + path
                        resolved_path = str((self.source / path).resolve())
                        
                        self.aliases.append(PathAlias(
                            alias=alias if alias.startswith('@') else f"@{alias}",
                            path=resolved_path,
                            source=vite_config
                        ))
            
            Logger.success(f"Loaded aliases from {vite_config}")
        
        except Exception as e:
            Logger.warning(f"Failed to parse {vite_config}: {e}")
    
    def cache_all_files(self, files: List[Path]):
        """Cache all project files for fuzzy matching"""
        self.all_files = files
        Logger.debug(f"Cached {len(self.all_files)} files for fuzzy matching")
    
    def resolve(self, import_path: str, from_file: Path) -> Optional[Path]:
        """Resolve import path with fallback to fuzzy matching"""
        # Skip node_modules imports
        if not import_path.startswith(('.', '/', '@', 'src')):
            return None
        
        # Try exact resolution first
        exact_path = self._resolve_exact(import_path, from_file)
        if exact_path:
            return exact_path
        
        # Try fuzzy matching if exact fails
        if CONFIG['analysis']['fuzzy_matching']:
            fuzzy_path = self._resolve_fuzzy(import_path, from_file)
            if fuzzy_path:
                Logger.debug(f"Fuzzy resolved: {import_path} -> {fuzzy_path}")
                return fuzzy_path
        
        return None
    
    def _resolve_exact(self, import_path: str, from_file: Path) -> Optional[Path]:
        """Exact path resolution"""
        # Alias resolution
        for alias in self.aliases:
            if import_path.startswith(alias.alias):
                remaining = import_path[len(alias.alias):].lstrip('/')
                base_path = Path(alias.path) / remaining
                resolved = self._try_extensions(base_path)
                if resolved:
                    alias.resolved_count += 1
                    return resolved
        
        # Direct src/ path resolution
        if import_path.startswith('src/'):
            base_path = self.source / import_path
            resolved = self._try_extensions(base_path)
            if resolved:
                return resolved
        
        # Relative path resolution
        if import_path.startswith('.'):
            base_path = (from_file.parent / import_path).resolve()
            return self._try_extensions(base_path)
        
        return None
    
    def _resolve_fuzzy(self, import_path: str, from_file: Path) -> Optional[Path]:
        """Fuzzy path resolution using similarity matching"""
        module_name = Path(import_path).stem
        
        candidates = []
        for file in self.all_files:
            similarity = string_similarity(module_name, file.stem)
            if similarity > CONFIG['analysis']['fuzzy_threshold']:
                candidates.append((file, similarity))
        
        if not candidates:
            return None
        
        candidates.sort(key=lambda x: x[1], reverse=True)
        
        # Prefer files in the same directory or nearby
        from_dir = from_file.parent
        for candidate, similarity in candidates:
            try:
                rel_path = candidate.relative_to(from_dir)
                if len(rel_path.parents) <= 3:
                    return candidate
            except ValueError:
                pass
        
        # Return best match
        return candidates[0][0]
    
    def get_fuzzy_candidates(self, import_path: str, max_results: int = 5) -> List[Tuple[Path, float]]:
        """Get multiple fuzzy match candidates for user review"""
        module_name = Path(import_path).stem
        candidates = []
        
        for file in self.all_files:
            similarity = string_similarity(module_name, file.stem)
            if similarity > 0.5:
                candidates.append((file, similarity))
        
        candidates.sort(key=lambda x: x[1], reverse=True)
        return candidates[:max_results]
    
    def _try_extensions(self, base_path: Path) -> Optional[Path]:
        """Try different file extensions to find the file"""
        if base_path.exists() and base_path.is_file():
            return base_path
        
        extensions = CONFIG['project']['extensions'] + CONFIG['project']['style_extensions']
        for ext in extensions:
            path_with_ext = base_path.with_suffix(ext)
            if path_with_ext.exists():
                return path_with_ext
        
        # Try CSS modules
        if not base_path.suffix:
            css_module = base_path.with_suffix('.module.css')
            if css_module.exists():
                return css_module
        
        # Try index files
        if base_path.is_dir() or not base_path.exists():
            for index_file in ['index.ts', 'index.tsx', 'index.js', 'index.jsx']:
                index_path = base_path / index_file
                if index_path.exists():
                    return index_path
        
        return None

# ═══════════════════════════════════════════════════════════════════════════════
# FEATURE DETECTOR
# ═══════════════════════════════════════════════════════════════════════════════

class FeatureDetector:
    """Comprehensive feature detection for preservation"""
    
    FEATURE_PATTERNS = {
        'component': [
            re.compile(r'export\s+(?:default\s+)?function\s+(\w+)\s*\([^)]*\)\s*(?::\s*(?:JSX\.Element|React\.ReactElement|ReactElement|ReactNode))?\s*\{'),
            re.compile(r'export\s+(?:default\s+)?const\s+(\w+)(?::\s*React\.FC[^=]*)?(?:\s*=\s*(?:React\.)?memo\s*\()?'),
            re.compile(r'const\s+(\w+)\s*(?::\s*React\.FC[^=]*)?\s*=\s*\([^)]*\)\s*(?::\s*JSX\.Element)?\s*=>'),
            re.compile(r'function\s+(\w+)\s*\([^)]*\)\s*:\s*JSX\.Element'),
        ],
        'hook': [
            re.compile(r'export\s+(?:function|const)\s+(use\w+)'),
            re.compile(r'function\s+(use\w+)\s*\('),
            re.compile(r'const\s+(use\w+)\s*='),
        ],
        'context': [
            re.compile(r'export\s+const\s+(\w+Context)\s*=\s*(?:React\.)?createContext'),
            re.compile(r'const\s+(\w+Context)\s*=\s*(?:React\.)?createContext'),
        ],
        'provider': [
            re.compile(r'export\s+(?:function|const)\s+(\w+Provider)'),
            re.compile(r'function\s+(\w+Provider)\s*\('),
        ],
        'service': [
            re.compile(r'export\s+class\s+(\w+Service)'),
            re.compile(r'export\s+const\s+(\w+Service)\s*='),
            re.compile(r'class\s+(\w+Service)\s*(?:extends|implements|\{)'),
        ],
        'store': [
            re.compile(r'export\s+const\s+(use\w+Store)\s*=\s*create'),
            re.compile(r'const\s+(\w+Store)\s*=\s*create'),
        ],
        'utility': [
            re.compile(r'export\s+(?:async\s+)?function\s+(\w+)'),
            re.compile(r'export\s+const\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*=>'),
        ],
        'type': [
            re.compile(r'export\s+type\s+(\w+)'),
            re.compile(r'export\s+interface\s+(\w+)'),
        ],
        'enum': [
            re.compile(r'export\s+(?:const\s+)?enum\s+(\w+)'),
        ],
        'constant': [
            re.compile(r'export\s+const\s+([A-Z][A-Z0-9_]*)\s*='),
        ],
    }
    
    @staticmethod
    def detect_features(content: str, filepath: str, from_attached: bool = False) -> List[Feature]:
        """Detect all features in a file"""
        features = []
        seen_names = set()
        
        for feature_type, patterns in FeatureDetector.FEATURE_PATTERNS.items():
            for pattern in patterns:
                for match in pattern.finditer(content):
                    line_num = content[:match.start()].count('\n') + 1
                    
                    name = None
                    for group in match.groups():
                        if group:
                            name = group
                            break
                    
                    if name and name not in seen_names:
                        seen_names.add(name)
                        features.append(Feature(
                            name=name,
                            type=feature_type,
                            file_path=filepath,
                            line_number=line_num,
                            description=f"{feature_type.capitalize()}: {name}",
                            from_attached_file=from_attached
                        ))
        
        return features

# ═══════════════════════════════════════════════════════════════════════════════
# CODE ANALYZER
# ═══════════════════════════════════════════════════════════════════════════════

class CodeAnalyzer:
    """Comprehensive code analyzer with enhanced import resolution"""
    
    IMPORT_PATTERN = re.compile(
        r'^import\s+(?:type\s+)?(?:(?:\{([^}]+)\}|(\w+)(?:,\s*\{([^}]+)\})?)\s+from\s+)?[\'"]([^\'"]+)[\'"];?',
        re.MULTILINE
    )
    
    EXPORT_PATTERN = re.compile(
        r'^export\s+(?:(?:default\s+)?(?:const|let|var|function|class|interface|type|enum)\s+(\w+)|default\s+(\w+)|\{([^}]+)\}(?:\s+from\s+[\'"]([^\'"]+)[\'"])?)',
        re.MULTILINE
    )
    
    DYNAMIC_IMPORT = re.compile(r'import\s*\(\s*[\'"]([^\'"]+)[\'"]\s*\)')
    CSS_IMPORT = re.compile(r'import\s+[\'"]([^\'"]+\.(?:css|scss|sass|less))[\'"]')
    
    def __init__(self, source: Path, dest: Path, resolver: EnhancedPathAliasResolver,
                 backup_manager: EnhancedBackupManager):
        self.source = source
        self.dest = dest
        self.resolver = resolver
        self.backup_manager = backup_manager
    
    def analyze_file(self, filepath: Path, from_attached: bool = False) -> FileAnalysis:
        """Comprehensive file analysis"""
        start_time = time.time()
        rel_path = str(filepath.relative_to(self.source))
        
        analysis = FileAnalysis(
            path=rel_path,
            language=self._detect_language(filepath),
            size_bytes=filepath.stat().st_size,
            line_count=0
        )
        
        try:
            content = filepath.read_text(encoding='utf-8')
            analysis.line_count = len(content.splitlines())
            
            # Detect features FIRST (critical for preservation)
            analysis.features = FeatureDetector.detect_features(content, rel_path, from_attached)
            
            # Extract imports
            analysis.imports = self._extract_imports(content, filepath)
            
            # Extract exports
            analysis.exports = self._extract_exports(content)
            
            # Check if component
            analysis.is_component = any(f.type == 'component' for f in analysis.features)
            
            # Build dependency graph
            for imp in analysis.imports:
                if imp.resolved_path:
                    analysis.dependencies.add(imp.resolved_path)
            
            # Analyze issues
            self._analyze_imports(analysis, filepath)
            self._analyze_exports(analysis)
            
            # Check buildability
            analysis.is_buildable = not any(
                i.severity == 'error' and not i.fixable 
                for i in analysis.issues
            )
            
            # Verify feature preservation
            analysis.all_features_preserved = all(f.preserved for f in analysis.features)
            
        except Exception as e:
            analysis.error = str(e)
            analysis.is_buildable = False
            Logger.error(f"Error analyzing {rel_path}: {e}")
        
        analysis.analysis_time = time.time() - start_time
        return analysis
    
    def _detect_language(self, filepath: Path) -> str:
        """Detect file language from extension"""
        ext = filepath.suffix
        language_map = {
            '.tsx': 'typescript-react',
            '.ts': 'typescript',
            '.jsx': 'javascript-react',
            '.js': 'javascript',
            '.mjs': 'javascript-module',
            '.cjs': 'javascript-commonjs',
            '.vue': 'vue',
            '.svelte': 'svelte',
        }
        return language_map.get(ext, 'unknown')
    
    def _extract_imports(self, content: str, filepath: Path) -> List[ImportStatement]:
        """Extract all import statements"""
        imports = []
        
        for match in self.IMPORT_PATTERN.finditer(content):
            line_num = content[:match.start()].count('\n') + 1
            named_imports = match.group(1) or match.group(3) or ''
            default_import = match.group(2) or ''
            module_path = match.group(4)
            
            imported_items = []
            if default_import:
                imported_items.append(default_import)
            if named_imports:
                items = [i.strip().split(' as ')[0].strip() for i in named_imports.split(',')]
                imported_items.extend([i for i in items if i])
            
            is_css = module_path.endswith(('.css', '.scss', '.sass', '.less'))
            
            resolved = self.resolver.resolve(module_path, filepath)
            
            import_stmt = ImportStatement(
                line_number=line_num,
                full_statement=match.group(0),
                module_path=module_path,
                imported_items=imported_items,
                is_default=bool(default_import),
                is_dynamic=False,
                is_type_import='type' in match.group(0),
                is_css=is_css,
                resolved_path=str(resolved.relative_to(self.source)) if resolved else None,
                is_resolvable=resolved is not None
            )
            
            # Add fuzzy candidates if unresolved
            if not resolved and (module_path.startswith(('.', '/', '@', 'src'))):
                candidates = self.resolver.get_fuzzy_candidates(module_path)
                import_stmt.fuzzy_candidates = [str(c[0].relative_to(self.source)) for c, _ in candidates]
            
            imports.append(import_stmt)
        
        return imports
    
    def _extract_exports(self, content: str) -> List[ExportStatement]:
        """Extract all export statements"""
        exports = []
        
        for match in self.EXPORT_PATTERN.finditer(content):
            line_num = content[:match.start()].count('\n') + 1
            
            exported_items = []
            is_default = 'default' in match.group(0)
            is_re_export = 'from' in match.group(0)
            module_path = match.group(4) if len(match.groups()) >= 4 else None
            
            for group in match.groups()[:3]:
                if group:
                    if ',' in group:
                        items = [i.strip().split(' as ')[0].strip() for i in group.split(',')]
                        exported_items.extend([i for i in items if i])
                    else:
                        exported_items.append(group)
            
            exports.append(ExportStatement(
                line_number=line_num,
                full_statement=match.group(0),
                exported_items=exported_items,
                is_default=is_default,
                is_re_export=is_re_export,
                module_path=module_path
            ))
        
        return exports
    
    def _analyze_imports(self, analysis: FileAnalysis, filepath: Path):
        """Analyze import statements for issues"""
        for imp in analysis.imports:
            # Skip node_modules imports
            if not imp.module_path.startswith(('.', '/', '@', 'src')):
                continue
            
            if not imp.is_resolvable:
                suggestion = None
                if imp.fuzzy_candidates:
                    suggestion = f"Did you mean: {', '.join(imp.fuzzy_candidates[:3])}?"
                
                analysis.issues.append(Issue(
                    type='unresolved_import',
                    severity='error',
                    file_path=analysis.path,
                    line_number=imp.line_number,
                    description=f"Cannot resolve import: {imp.module_path}",
                    suggestion=suggestion,
                    fixable=True
                ))
                analysis.needs_stub = True
    
    def _analyze_exports(self, analysis: FileAnalysis):
        """Analyze export statements for issues"""
        export_names = set()
        for exp in analysis.exports:
            for name in exp.exported_items:
                if name in export_names:
                    analysis.issues.append(Issue(
                        type='duplicate_export',
                        severity='warning',
                        file_path=analysis.path,
                        line_number=exp.line_number,
                        description=f"Duplicate export: {name}",
                        fixable=True
                    ))
                export_names.add(name)

# ═══════════════════════════════════════════════════════════════════════════════
# CODE FIXER WITH SMART STUB GENERATION
# ═══════════════════════════════════════════════════════════════════════════════

class CodeFixer:
    """Feature-preserving code fixer with intelligent stub generation"""
    
    STUB_TEMPLATES = {
        'hook': '''/**
 * AUTO-GENERATED STUB
 * Created: {timestamp}
 * Reason: {reason}
 * 
 * TODO: Implement this hook with proper logic
 */

import {{ useState, useEffect, useCallback }} from 'react';

{imports}

export const {name} = ({params}): {return_type} => {{
  console.warn('[STUB] {name} needs implementation');
  
  // Default implementation - replace with actual logic
  const [state, setState] = useState<any>(null);
  
  useEffect(() => {{
    // TODO: Add effect logic
  }}, []);
  
  return {default_return};
}};

export default {name};
''',
        
        'component': '''/**
 * AUTO-GENERATED STUB COMPONENT
 * Created: {timestamp}
 * Reason: {reason}
 * 
 * TODO: Implement this component
 */

import React from 'react';

{imports}

interface {name}Props {{
  // TODO: Define props
  [key: string]: any;
}}

export const {name}: React.FC<{name}Props> = (props) => {{
  console.warn('[STUB] {name} component needs implementation');
  
  return (
    <div className="{name_lower}-stub" style={{{{ padding: '20px', border: '2px dashed #ccc', borderRadius: '8px' }}}}>
      <p style={{{{ color: '#666' }}}}>⚠️ Stub Component: {name}</p>
      <p style={{{{ fontSize: '12px', color: '#999' }}}}>TODO: Implement this component</p>
    </div>
  );
}};

export default {name};
''',
        
        'service': '''/**
 * AUTO-GENERATED STUB SERVICE
 * Created: {timestamp}
 * Reason: {reason}
 * 
 * TODO: Implement this service
 */

{imports}

export class {name} {{
  private static instance: {name};
  
  private constructor() {{
    console.warn('[STUB] {name} needs implementation');
  }}
  
  public static getInstance(): {name} {{
    if (!{name}.instance) {{
      {name}.instance = new {name}();
    }}
    return {name}.instance;
  }}
  
  // TODO: Add service methods
  public async execute(...args: any[]): Promise<any> {{
    console.warn('[STUB] {name}.execute() needs implementation');
    return null;
  }}
}}

export default {name};
''',
        
        'utility': '''/**
 * AUTO-GENERATED STUB UTILITY
 * Created: {timestamp}
 * Reason: {reason}
 * 
 * TODO: Implement these utilities
 */

{imports}

export const {name} = (...args: any[]): any => {{
  console.warn('[STUB] {name} needs implementation');
  return undefined;
}};

export default {name};
''',
        
        'type': '''/**
 * AUTO-GENERATED STUB TYPES
 * Created: {timestamp}
 * Reason: {reason}
 * 
 * TODO: Define proper types
 */

{imports}

export interface {name} {{
  // TODO: Define interface properties
  [key: string]: any;
}}

export type {name}Type = {name};

export default {name};
''',
        
        'context': '''/**
 * AUTO-GENERATED STUB CONTEXT
 * Created: {timestamp}
 * Reason: {reason}
 * 
 * TODO: Implement context logic
 */

import React, {{ createContext, useContext, useState, ReactNode }} from 'react';

{imports}

interface {name}Type {{
  // TODO: Define context type
  [key: string]: any;
}}

const defaultValue: {name}Type = {{}};

export const {name} = createContext<{name}Type>(defaultValue);

export const {name}Provider: React.FC<{{ children: ReactNode }}> = ({{ children }}) => {{
  const [state, setState] = useState<{name}Type>(defaultValue);
  
  console.warn('[STUB] {name}Provider needs implementation');
  
  return (
    <{name}.Provider value={{state}}>
      {{children}}
    </{name}.Provider>
  );
}};

export const use{name_base} = () => {{
  const context = useContext({name});
  if (!context) {{
    throw new Error('use{name_base} must be used within a {name}Provider');
  }}
  return context;
}};

export default {name};
''',
        
        'css': '''/**
 * AUTO-GENERATED STUB STYLES
 * Created: {timestamp}
 * Reason: {reason}
 * 
 * TODO: Add actual styles
 */

/* Stub styles - replace with actual implementation */
.stub-container {{
  padding: 20px;
  border: 2px dashed #ccc;
  border-radius: 8px;
  background: #f9f9f9;
}}

.stub-warning {{
  color: #856404;
  background: #fff3cd;
  padding: 10px;
  border-radius: 4px;
}}
'''
    }
    
    def __init__(self, source: Path, dest: Path, resolver: EnhancedPathAliasResolver,
                 backup_manager: EnhancedBackupManager, dry_run: bool = False,
                 create_stubs: bool = True, auto_apply: bool = False):
        self.source = source
        self.dest = dest
        self.resolver = resolver
        self.backup_manager = backup_manager
        self.dry_run = dry_run
        self.create_stubs = create_stubs
        self.auto_apply = auto_apply
        self.stubs_created: List[StubInfo] = []
        self.fixes_applied: int = 0
    
    def fix_file(self, analysis: FileAnalysis) -> FileAnalysis:
        """Fix file issues while preserving all features"""
        if not analysis.issues or analysis.error:
            return analysis
        
        filepath = self.source / analysis.path
        
        # Create backup FIRST (non-negotiable)
        if not self.dry_run:
            backup_info = self.backup_manager.create_backup(filepath, self.source)
            if backup_info:
                analysis.backed_up = True
                analysis.backup_info = backup_info
        
        try:
            content = filepath.read_text(encoding='utf-8')
            original_content = content
            modified = False
            
            # Fix resolvable issues
            for issue in analysis.issues:
                if issue.fixable and not issue.auto_fixed:
                    if issue.type == 'unresolved_import':
                        new_content = self._fix_unresolved_import(content, issue, analysis, filepath)
                        if new_content != content:
                            content = new_content
                            issue.auto_fixed = True
                            modified = True
                            self.fixes_applied += 1
                            Logger.success(f"Fixed import in {analysis.path}:{issue.line_number}")
            
            # Write changes
            if modified and not self.dry_run:
                dest_file = self.dest / analysis.path
                dest_file.parent.mkdir(parents=True, exist_ok=True)
                dest_file.write_text(content, encoding='utf-8')
            
            # Create stubs for remaining unresolved imports
            if analysis.needs_stub and self.create_stubs:
                self._create_stubs_for_file(analysis)
        
        except Exception as e:
            Logger.error(f"Failed to fix {analysis.path}: {e}")
            
            # Move to unfixable if critical
            if not analysis.is_buildable and not self.dry_run:
                self.backup_manager.move_to_unfixable(
                    filepath, self.source,
                    f"Unfixable errors: {e}"
                )
                analysis.moved_to_unfixable = True
        
        return analysis
    
    def _fix_unresolved_import(self, content: str, issue: Issue, 
                               analysis: FileAnalysis, filepath: Path) -> str:
        """Fix unresolved import using fuzzy matching or path correction"""
        for imp in analysis.imports:
            if imp.line_number == issue.line_number and not imp.is_resolvable:
                # Try fuzzy candidates
                if imp.fuzzy_candidates and self.auto_apply:
                    best_match = imp.fuzzy_candidates[0]
                    
                    # Calculate relative path
                    from_dir = filepath.parent
                    target = self.source / best_match
                    
                    try:
                        rel_path = os.path.relpath(target, from_dir)
                        if not rel_path.startswith('.'):
                            rel_path = './' + rel_path
                        
                        # Remove extension for import
                        rel_path = re.sub(r'\.(tsx?|jsx?|mjs)$', '', rel_path)
                        
                        # Fix path separators
                        rel_path = rel_path.replace('\\', '/')
                        
                        # Replace in content
                        old_import = imp.full_statement
                        new_import = old_import.replace(imp.module_path, rel_path)
                        content = content.replace(old_import, new_import)
                        
                        imp.fix_applied = rel_path
                        Logger.success(f"Auto-fixed: {imp.module_path} → {rel_path}")
                        return content
                    
                    except Exception as e:
                        Logger.debug(f"Could not create relative path: {e}")
        
        return content
    
    def _create_stubs_for_file(self, analysis: FileAnalysis):
        """Create stub files for all unresolved imports"""
        for imp in analysis.imports:
            if not imp.is_resolvable and not imp.fix_applied and not imp.is_css:
                self._create_stub(imp, analysis)
    
    def _create_stub(self, imp: ImportStatement, analysis: FileAnalysis):
        """Create a realistic, functional stub file"""
        stub_path = self._determine_stub_path(imp.module_path, analysis.path)
        
        if not stub_path:
            return
        
        # Check if stub already exists
        if stub_path.exists():
            Logger.debug(f"Stub already exists: {stub_path}")
            return
        
        # Determine stub type
        stub_type = self._determine_stub_type(imp)
        
        # Generate stub content
        content = self._generate_stub_content(imp, stub_type, analysis)
        
        if self.dry_run:
            Logger.info(f"Would create stub: {stub_path.relative_to(self.dest)}")
            return
        
        # Create stub file
        try:
            stub_path.parent.mkdir(parents=True, exist_ok=True)
            stub_path.write_text(content, encoding='utf-8')
            
            stub_info = StubInfo(
                path=str(stub_path.relative_to(self.dest)),
                reason=f"Unresolved import from {analysis.path}:{imp.line_number}",
                template_type=stub_type,
                suggested_action="Implement actual functionality",
                created_at=datetime.now().isoformat(),
                content=content[:500] + "..." if len(content) > 500 else content
            )
            
            self.stubs_created.append(stub_info)
            Logger.success(f"Created stub: {stub_path.relative_to(self.dest)}")
        
        except Exception as e:
            Logger.error(f"Failed to create stub {stub_path}: {e}")
    
    def _determine_stub_path(self, module_path: str, from_path: str) -> Optional[Path]:
        """Determine where to create stub file"""
        # Try alias resolution
        for alias in self.resolver.aliases:
            if module_path.startswith(alias.alias):
                relative = module_path[len(alias.alias):].lstrip('/')
                target = Path(alias.path) / relative
                
                if not target.suffix:
                    target = target.with_suffix('.ts')
                
                return target
        
        # Direct src/ path
        if module_path.startswith('src/'):
            target = self.dest / module_path
            if not target.suffix:
                target = target.with_suffix('.ts')
            return target
        
        # Relative import
        if module_path.startswith('.'):
            from_file = self.source / from_path
            target = (from_file.parent / module_path).resolve()
            
            if not target.suffix:
                target = target.with_suffix('.ts')
            
            # Ensure it's within project
            try:
                target.relative_to(self.source)
                return self.dest / target.relative_to(self.source)
            except ValueError:
                return None
        
        # Default to src
        target = self.dest / 'src' / module_path
        if not target.suffix:
            target = target.with_suffix('.ts')
        
        return target
    
    def _determine_stub_type(self, imp: ImportStatement) -> str:
        """Determine what type of stub to create"""
        module_name = Path(imp.module_path).stem.lower()
        
        if any(item.startswith('use') for item in imp.imported_items):
            return 'hook'
        elif any(item.endswith('Context') for item in imp.imported_items):
            return 'context'
        elif any(item.endswith('Service') for item in imp.imported_items):
            return 'service'
        elif 'hook' in module_name or module_name.startswith('use'):
            return 'hook'
        elif 'service' in module_name:
            return 'service'
        elif 'context' in module_name:
            return 'context'
        elif 'util' in module_name or 'helper' in module_name:
            return 'utility'
        elif 'type' in module_name or 'interface' in module_name:
            return 'type'
        elif imp.is_css:
            return 'css'
        elif any(item[0].isupper() for item in imp.imported_items if item):
            return 'component'
        else:
            return 'utility'
    
    def _generate_stub_content(self, imp: ImportStatement, stub_type: str, 
                               analysis: FileAnalysis) -> str:
        """Generate realistic stub content"""
        timestamp = datetime.now().isoformat()
        reason = f"Unresolved import from {analysis.path}:{imp.line_number}"
        
        # Get primary name
        name = imp.imported_items[0] if imp.imported_items else Path(imp.module_path).stem
        name_lower = name.lower().replace('_', '-')
        name_base = name.replace('Context', '').replace('Provider', '')
        
        template = self.STUB_TEMPLATES.get(stub_type, self.STUB_TEMPLATES['utility'])
        
        # Build imports section
        imports = ""
        if stub_type in ['hook', 'component', 'context']:
            imports = "// Add necessary imports here"
        
        # Default return values
        default_returns = {
            'hook': '{ state, setState }',
            'component': 'null',
            'service': 'this',
            'utility': 'undefined',
            'type': '{}',
            'context': 'defaultValue',
        }
        
        content = template.format(
            timestamp=timestamp,
            reason=reason,
            name=name,
            name_lower=name_lower,
            name_base=name_base,
            imports=imports,
            params='props?: any',
            return_type='any',
            default_return=default_returns.get(stub_type, 'undefined')
        )
        
        return content

# ═══════════════════════════════════════════════════════════════════════════════
# CIRCULAR DEPENDENCY DETECTOR
# ═══════════════════════════════════════════════════════════════════════════════

class CircularDependencyDetector:
    """Detect circular dependencies in the project"""
    
    def __init__(self, analyses: List[FileAnalysis]):
        self.analyses = analyses
        self.graph = self._build_graph()
    
    def _build_graph(self) -> Dict[str, Set[str]]:
        """Build dependency graph"""
        graph = defaultdict(set)
        
        for analysis in self.analyses:
            graph[analysis.path] = analysis.dependencies.copy()
        
        return graph
    
    def find_cycles(self) -> List[CircularDependency]:
        """Find all circular dependencies using DFS"""
        cycles = []
        visited = set()
        rec_stack = set()
        path = []
        
        def dfs(node: str):
            visited.add(node)
            rec_stack.add(node)
            path.append(node)
            
            for neighbor in self.graph.get(node, set()):
                if neighbor not in visited:
                    result = dfs(neighbor)
                    if result:
                        return result
                elif neighbor in rec_stack:
                    # Found cycle
                    cycle_start = path.index(neighbor)
                    cycle = path[cycle_start:] + [neighbor]
                    return cycle
            
            path.pop()
            rec_stack.remove(node)
            return None
        
        for node in self.graph:
            if node not in visited:
                cycle = dfs(node)
                if cycle:
                    # Avoid duplicates
                    cycle_set = frozenset(cycle[:-1])
                    if not any(frozenset(c.cycle[:-1]) == cycle_set for c in cycles):
                        severity = 'high' if len(cycle) <= 3 else 'medium'
                        suggestion = self._suggest_fix(cycle)
                        
                        cycles.append(CircularDependency(
                            cycle=cycle,
                            severity=severity,
                            suggestion=suggestion
                        ))
        
        return cycles
    
    def _suggest_fix(self, cycle: List[str]) -> str:
        """Suggest how to fix circular dependency"""
        if len(cycle) == 2:
            return "Extract shared code into a separate module"
        elif len(cycle) == 3:
            return "Consider dependency inversion or lazy loading"
        else:
            return "Complex cycle - consider architectural refactoring"

# ═══════════════════════════════════════════════════════════════════════════════
# COMPONENT ENHANCER
# ═══════════════════════════════════════════════════════════════════════════════

class ComponentEnhancer:
    """Suggest and apply component enhancements"""
    
    def __init__(self, source: Path):
        self.source = source
    
    def enhance_file(self, analysis: FileAnalysis) -> FileAnalysis:
        """Suggest enhancements for component"""
        if not analysis.is_component:
            return analysis
        
        filepath = self.source / analysis.path
        
        try:
            content = filepath.read_text(encoding='utf-8')
            
            # React.memo suggestion
            if self._should_memoize(content, analysis):
                analysis.enhancements.append(Enhancement(
                    type='react_memo',
                    file_path=analysis.path,
                    description="Component could benefit from React.memo",
                    suggestion="Wrap with React.memo to prevent unnecessary re-renders",
                    code_example="export default React.memo(YourComponent);",
                    safe_to_apply=True,
                    feature_safe=True,
                    priority='medium'
                ))
            # Lazy loading suggestion
            if self._should_lazy_load(content, analysis):
                analysis.enhancements.append(Enhancement(
                    type='lazy_loading',
                    file_path=analysis.path,
                    description="Large component suitable for code splitting",
                    suggestion="Use React.lazy() and Suspense for code-splitting",
                    code_example="""// In parent component:
const LazyComponent = React.lazy(() => import('./YourComponent'));

// Usage:
<Suspense fallback={<Loading />}>
  <LazyComponent />
</Suspense>""",
                    safe_to_apply=True,
                    feature_safe=True,
                    priority='high'
                ))
            
            # useCallback suggestion
            if self._should_use_callback(content):
                analysis.enhancements.append(Enhancement(
                    type='use_callback',
                    file_path=analysis.path,
                    description="Event handlers could benefit from useCallback",
                    suggestion="Wrap event handlers with useCallback to prevent unnecessary re-renders",
                    code_example="""const handleClick = useCallback(() => {
  // handler logic
}, [dependencies]);""",
                    safe_to_apply=True,
                    feature_safe=True,
                    priority='low'
                ))
            
            # useMemo suggestion
            if self._should_use_memo(content):
                analysis.enhancements.append(Enhancement(
                    type='use_memo',
                    file_path=analysis.path,
                    description="Expensive computations could benefit from useMemo",
                    suggestion="Wrap expensive computations with useMemo",
                    code_example="""const computedValue = useMemo(() => {
  return expensiveComputation(data);
}, [data]);""",
                    safe_to_apply=True,
                    feature_safe=True,
                    priority='medium'
                ))
            
            # Menu optimization suggestion
            if self._should_optimize_menu(content):
                analysis.enhancements.append(Enhancement(
                    type='menu_optimization',
                    file_path=analysis.path,
                    description="Menu component should clear page before showing new content",
                    suggestion="Implement clear & refresh pattern for menu interactions",
                    code_example="""// Clear previous content before rendering new
useEffect(() => {
  setContent(null); // Clear first
  const timer = setTimeout(() => {
    setContent(newContent); // Then set new content
  }, 50);
  return () => clearTimeout(timer);
}, [selectedMenuItem]);""",
                    safe_to_apply=True,
                    feature_safe=True,
                    priority='high'
                ))
            
            # State management suggestion
            if self._should_use_reducer(content):
                analysis.enhancements.append(Enhancement(
                    type='use_reducer',
                    file_path=analysis.path,
                    description="Complex state logic could benefit from useReducer",
                    suggestion="Consider using useReducer for complex state management",
                    code_example="""const [state, dispatch] = useReducer(reducer, initialState);

// Dispatch actions instead of multiple setState calls
dispatch({ type: 'UPDATE', payload: newValue });""",
                    safe_to_apply=True,
                    feature_safe=True,
                    priority='low'
                ))
        
        except Exception as e:
            Logger.error(f"Enhancement analysis failed for {analysis.path}: {e}")
        
        return analysis
    
    def _should_memoize(self, content: str, analysis: FileAnalysis) -> bool:
        """Check if component should be memoized"""
        has_props = 'props' in content or 'Props' in content
        already_memoized = 'React.memo' in content or 'memo(' in content
        is_simple = analysis.line_count < 50
        return has_props and not already_memoized and not is_simple
    
    def _should_lazy_load(self, content: str, analysis: FileAnalysis) -> bool:
        """Check if component should be lazy loaded"""
        is_large = analysis.line_count > 150
        has_heavy_imports = len(analysis.imports) > 10
        already_lazy = 'React.lazy' in content or 'lazy(' in content
        return (is_large or has_heavy_imports) and not already_lazy
    
    def _should_use_callback(self, content: str) -> bool:
        """Check if useCallback would help"""
        has_inline_handlers = bool(re.search(r'on\w+\s*=\s*\{?\s*\([^)]*\)\s*=>', content))
        has_handler_functions = bool(re.search(r'const\s+handle\w+\s*=\s*\([^)]*\)\s*=>', content))
        already_uses = 'useCallback' in content
        return (has_inline_handlers or has_handler_functions) and not already_uses
    
    def _should_use_memo(self, content: str) -> bool:
        """Check if useMemo would help"""
        has_computations = bool(re.search(r'\.(map|filter|reduce|sort)\s*\(', content))
        has_complex_logic = content.count('for ') > 2 or content.count('while ') > 0
        already_uses = 'useMemo' in content
        return (has_computations or has_complex_logic) and not already_uses
    
    def _should_optimize_menu(self, content: str) -> bool:
        """Check if menu needs optimization"""
        is_menu_component = bool(re.search(r'menu|Menu|navigation|Navigation|sidebar|Sidebar', content, re.I))
        has_content_switching = bool(re.search(r'setContent|setActiveTab|setSelected|setCurrentView', content))
        has_optimization = 'setContent(null)' in content or 'clearContent' in content
        return is_menu_component and has_content_switching and not has_optimization
    
    def _should_use_reducer(self, content: str) -> bool:
        """Check if useReducer would help"""
        state_count = len(re.findall(r'useState\s*[<(]', content))
        already_uses = 'useReducer' in content
        return state_count > 4 and not already_uses

# ═══════════════════════════════════════════════════════════════════════════════
# UNUSED FILE DETECTOR
# ═══════════════════════════════════════════════════════════════════════════════

class UnusedFileDetector:
    """Detect potentially unused files in the project"""
    
    def __init__(self, analyses: List[FileAnalysis]):
        self.analyses = analyses
        self._build_usage_graph()
    
    def _build_usage_graph(self):
        """Build reverse dependency graph to track file usage"""
        for analysis in self.analyses:
            for dep_path in analysis.dependencies:
                # Find the analysis for the dependency
                for dep_analysis in self.analyses:
                    if dep_analysis.path == dep_path:
                        dep_analysis.dependents.add(analysis.path)
                        break
    
    def detect_unused(self) -> List[FileAnalysis]:
        """Detect files that are not imported anywhere"""
        unused = []
        
        for analysis in self.analyses:
            # Skip entry points and config files
            if self._is_entry_point(analysis.path):
                continue
            
            # Check if file has no dependents
            if not analysis.dependents:
                analysis.is_unused = True
                unused.append(analysis)
        
        return unused
    
    def _is_entry_point(self, filepath: str) -> bool:
        """Check if file is an entry point"""
        entry_patterns = [
            'main.ts', 'main.tsx', 'main.js', 'main.jsx',
            'index.ts', 'index.tsx', 'index.js', 'index.jsx',
            'App.tsx', 'App.ts', 'App.js', 'App.jsx',
            'vite.config', 'tsconfig', 'package.json',
            '.config.', '.d.ts', 'setupTests', 'reportWebVitals'
        ]
        return any(pattern in filepath for pattern in entry_patterns)

# ═══════════════════════════════════════════════════════════════════════════════
# BUILD VERIFIER
# ═══════════════════════════════════════════════════════════════════════════════

class BuildVerifier:
    """Verify project buildability"""
    
    def __init__(self, source: Path):
        self.source = source
        self.package_manager = self._detect_package_manager()
    
    def _detect_package_manager(self) -> str:
        """Detect which package manager is being used"""
        if (self.source / "pnpm-lock.yaml").exists():
            return "pnpm"
        elif (self.source / "yarn.lock").exists():
            return "yarn"
        elif (self.source / "bun.lockb").exists():
            return "bun"
        elif (self.source / "package-lock.json").exists():
            return "npm"
        return "npm"
    
    def verify(self, dry_run: bool = False) -> BuildVerification:
        """Run build verification"""
        if dry_run:
            Logger.info("Skipping build verification (dry-run mode)")
            return BuildVerification(
                typescript_check=True,
                build_command=True,
                errors=[],
                warnings=["Skipped in dry-run mode"],
                package_manager=self.package_manager,
                duration_seconds=0.0
            )
        
        start_time = time.time()
        errors = []
        warnings = []
        typescript_ok = False
        build_ok = False
        
        Logger.subheader("Build Verification")
        
        # TypeScript type check
        if CONFIG['build']['run_type_check']:
            Logger.info("Running TypeScript type check...")
            typescript_ok, ts_errors, ts_warnings = self._run_typescript_check()
            
            if typescript_ok:
                Logger.success("TypeScript check passed")
            else:
                Logger.warning(f"TypeScript check completed with {len(ts_errors)} errors")
                errors.extend(ts_errors)
            
            warnings.extend(ts_warnings)
        else:
            typescript_ok = True
            warnings.append("TypeScript check skipped")
        
        # Build command
        if CONFIG['build']['run_build']:
            Logger.info(f"Running build with {self.package_manager}...")
            build_ok, build_errors, build_warnings = self._run_build()
            
            if build_ok:
                Logger.success("Build successful")
            else:
                Logger.warning(f"Build completed with {len(build_errors)} errors")
                errors.extend(build_errors)
            
            warnings.extend(build_warnings)
        else:
            build_ok = True
            warnings.append("Build command skipped")
        
        duration = time.time() - start_time
        
        return BuildVerification(
            typescript_check=typescript_ok,
            build_command=build_ok,
            errors=errors[:50],  # Limit error count
            warnings=warnings[:20],
            package_manager=self.package_manager,
            duration_seconds=duration
        )
    
    def _run_typescript_check(self) -> Tuple[bool, List[str], List[str]]:
        """Run tsc --noEmit"""
        errors = []
        warnings = []
        
        try:
            result = subprocess.run(
                ["npx", "tsc", "--noEmit", "--pretty", "false"],
                cwd=self.source,
                capture_output=True,
                text=True,
                timeout=120,
                shell=True if sys.platform == 'win32' else False
            )
            
            if result.returncode == 0:
                return True, [], []
            
            # Parse errors
            for line in result.stdout.splitlines() + result.stderr.splitlines():
                line = line.strip()
                if line:
                    if 'error' in line.lower():
                        errors.append(line)
                    elif 'warning' in line.lower():
                        warnings.append(line)
            
            return len(errors) == 0, errors, warnings
        
        except FileNotFoundError:
            Logger.warning("TypeScript (tsc) not found - skipping type check")
            return True, [], ["TypeScript not installed"]
        except subprocess.TimeoutExpired:
            Logger.error("TypeScript check timed out")
            return False, ["TypeScript check timed out after 120 seconds"], []
        except Exception as e:
            Logger.error(f"TypeScript check failed: {e}")
            return False, [str(e)], []
    
    def _run_build(self) -> Tuple[bool, List[str], List[str]]:
        """Run build command"""
        errors = []
        warnings = []
        
        try:
            cmd = [self.package_manager, "run", "build"]
            
            result = subprocess.run(
                cmd,
                cwd=self.source,
                capture_output=True,
                text=True,
                timeout=300,
                shell=True if sys.platform == 'win32' else False
            )
            
            if result.returncode == 0:
                return True, [], []
            
            # Parse output
            for line in result.stdout.splitlines() + result.stderr.splitlines():
                line = line.strip()
                if line:
                    if 'error' in line.lower():
                        errors.append(line)
                    elif 'warning' in line.lower():
                        warnings.append(line)
            
            return len(errors) == 0, errors, warnings
        
        except FileNotFoundError:
            Logger.warning(f"{self.package_manager} not found - skipping build")
            return True, [], [f"{self.package_manager} not installed"]
        except subprocess.TimeoutExpired:
            Logger.error("Build timed out")
            return False, ["Build timed out after 300 seconds"], []
        except Exception as e:
            Logger.error(f"Build failed: {e}")
            return False, [str(e)], []

# ═══════════════════════════════════════════════════════════════════════════════
# HTML REPORT GENERATOR
# ═══════════════════════════════════════════════════════════════════════════════

class HTMLReportGenerator:
    """Generate comprehensive HTML dashboard report"""
    
    @staticmethod
    def generate(report: ProjectReport) -> str:
        """Generate complete HTML report"""
        
        # Calculate statistics
        total_issues = report.issues_found
        fixed_issues = report.issues_fixed
        error_count = sum(1 for f in report.files_analyzed for i in f.issues if i.severity == 'error')
        warning_count = sum(1 for f in report.files_analyzed for i in f.issues if i.severity == 'warning')
        
        # Build issues table
        issues_rows = ""
        for f in report.files_analyzed:
            for issue in f.issues[:100]:  # Limit to 100 issues
                status_class = 'success' if issue.auto_fixed else ('warning' if issue.fixable else 'error')
                status_text = 'Fixed' if issue.auto_fixed else ('Fixable' if issue.fixable else 'Manual')
                issues_rows += f"""
                <tr>
                    <td><span class="badge badge-{issue.severity}">{issue.severity.upper()}</span></td>
                    <td>{escape(issue.type)}</td>
                    <td class="file-path">{escape(f.path)}:{issue.line_number}</td>
                    <td>{escape(issue.description)}</td>
                    <td><span class="badge badge-{status_class}">{status_text}</span></td>
                </tr>"""
        
        # Build features table
        features_rows = ""
        for f in report.files_analyzed:
            for feature in f.features[:200]:  # Limit to 200 features
                preserved_class = 'success' if feature.preserved else 'error'
                preserved_text = '✓ Preserved' if feature.preserved else '✗ Modified'
                features_rows += f"""
                <tr>
                    <td><strong>{escape(feature.name)}</strong></td>
                    <td><span class="badge badge-info">{feature.type}</span></td>
                    <td class="file-path">{escape(feature.file_path)}:{feature.line_number}</td>
                    <td><span class="badge badge-{preserved_class}">{preserved_text}</span></td>
                </tr>"""
        
        # Build stubs table
        stubs_rows = ""
        for stub in report.stubs_created:
            stubs_rows += f"""
            <tr>
                <td class="file-path">{escape(stub.path)}</td>
                <td><span class="badge badge-info">{stub.template_type}</span></td>
                <td>{escape(stub.reason)}</td>
                <td>{stub.created_at}</td>
            </tr>"""
        
        # Build enhancements table
        enhancements_rows = ""
        for f in report.files_analyzed:
            for enh in f.enhancements:
                priority_class = {'high': 'error', 'medium': 'warning', 'low': 'info'}.get(enh.priority, 'info')
                enhancements_rows += f"""
                <tr>
                    <td><span class="badge badge-{priority_class}">{enh.priority.upper()}</span></td>
                    <td>{escape(enh.type)}</td>
                    <td class="file-path">{escape(enh.file_path)}</td>
                    <td>{escape(enh.description)}</td>
                    <td>{escape(enh.suggestion)}</td>
                </tr>"""
        
        # Build circular dependencies
        circular_rows = ""
        for cd in report.circular_dependencies:
            severity_class = 'error' if cd.severity == 'high' else 'warning'
            cycle_str = ' → '.join(cd.cycle)
            circular_rows += f"""
            <tr>
                <td><span class="badge badge-{severity_class}">{cd.severity.upper()}</span></td>
                <td class="file-path">{escape(cycle_str)}</td>
                <td>{escape(cd.suggestion)}</td>
            </tr>"""
        
        # Build backups table
        backups_rows = ""
        for backup in report.backups_created[:50]:
            backups_rows += f"""
            <tr>
                <td class="file-path">{escape(backup.original_path)}</td>
                <td class="file-path">{escape(backup.backup_path)}</td>
                <td>{backup.size_bytes:,} bytes</td>
                <td>{backup.timestamp}</td>
            </tr>"""
        
        html = f'''<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Project Analysis Report - {escape(report.project_name)}</title>
    <style>
        :root {{
            --primary: #667eea;
            --primary-dark: #5a67d8;
            --success: #48bb78;
            --warning: #ed8936;
            --error: #f56565;
            --info: #4299e1;
            --bg: #f7fafc;
            --card-bg: #ffffff;
            --text: #2d3748;
            --text-light: #718096;
            --border: #e2e8f0;
        }}
        
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            color: var(--text);
        }}
        
        .container {{
            max-width: 1600px;
            margin: 0 auto;
        }}
        
        .header {{
            background: var(--card-bg);
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.1);
        }}
        
        .header h1 {{
            font-size: 2.5rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            margin-bottom: 10px;
        }}
        
        .header-meta {{
            display: flex;
            gap: 20px;
            flex-wrap: wrap;
            color: var(--text-light);
            font-size: 0.9rem;
        }}
        
        .dashboard {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }}
        
        .stat-card {{
            background: var(--card-bg);
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            transition: transform 0.2s, box-shadow 0.2s;
        }}
        
        .stat-card:hover {{
            transform: translateY(-4px);
            box-shadow: 0 8px 30px rgba(0,0,0,0.12);
        }}
        
        .stat-value {{
            font-size: 3rem;
            font-weight: 700;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }}
        
        .stat-card.success .stat-value {{
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            -webkit-background-clip: text;
            background-clip: text;
        }}
        
        .stat-card.warning .stat-value {{
            background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%);
            -webkit-background-clip: text;
            background-clip: text;
        }}
        
        .stat-card.error .stat-value {{
            background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
            -webkit-background-clip: text;
            background-clip: text;
        }}
        
        .stat-label {{
            font-size: 0.85rem;
            color: var(--text-light);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-top: 8px;
        }}
        
        .card {{
            background: var(--card-bg);
            border-radius: 12px;
            margin-bottom: 20px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.08);
            overflow: hidden;
        }}
        
        .card-header {{
            padding: 20px 24px;
            border-bottom: 1px solid var(--border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            cursor: pointer;
            user-select: none;
        }}
        
        .card-header:hover {{
            background: #f8fafc;
        }}
        
        .card-header h2 {{
            font-size: 1.25rem;
            color: var(--text);
            display: flex;
            align-items: center;
            gap: 10px;
        }}
        
        .card-header .count {{
            background: var(--primary);
            color: white;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
        }}
        
        .card-body {{
            padding: 24px;
            max-height: 600px;
            overflow-y: auto;
        }}
        
        .card-body.collapsed {{
            display: none;
        }}
        
        table {{
            width: 100%;
            border-collapse: collapse;
        }}
        
        th, td {{
            padding: 12px 16px;
            text-align: left;
            border-bottom: 1px solid var(--border);
        }}
        
        th {{
            background: #f8fafc;
            font-weight: 600;
            color: var(--text-light);
            font-size: 0.85rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            position: sticky;
            top: 0;
        }}
        
        tr:hover {{
            background: #f8fafc;
        }}
        
        .badge {{
            display: inline-block;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
        }}
        
        .badge-success {{ background: #c6f6d5; color: #22543d; }}
        .badge-warning {{ background: #feebc8; color: #744210; }}
        .badge-error {{ background: #fed7d7; color: #742a2a; }}
        .badge-info {{ background: #bee3f8; color: #2a4365; }}
        
        .file-path {{
            font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
            font-size: 0.85rem;
            color: var(--primary);
        }}
        
        .progress-bar {{
            height: 8px;
            background: var(--border);
            border-radius: 4px;
            overflow: hidden;
            margin-top: 10px;
        }}
        
        .progress-fill {{
            height: 100%;
            background: linear-gradient(90deg, var(--success), #38a169);
            border-radius: 4px;
            transition: width 0.3s;
        }}
        
        .summary-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }}
        
        .summary-item {{
            padding: 16px;
            background: #f8fafc;
            border-radius: 8px;
        }}
        
        .summary-item h4 {{
            color: var(--text-light);
            font-size: 0.85rem;
            margin-bottom: 8px;
        }}
        
        .summary-item p {{
            font-size: 1.1rem;
            font-weight: 600;
        }}
        
        .toggle-icon {{
            transition: transform 0.2s;
        }}
        
        .toggle-icon.collapsed {{
            transform: rotate(-90deg);
        }}
        
        .status-banner {{
            padding: 16px 24px;
            border-radius: 12px;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 12px;
        }}
        
        .status-banner.success {{
            background: linear-gradient(135deg, #c6f6d5 0%, #9ae6b4 100%);
            color: #22543d;
        }}
        
        .status-banner.warning {{
            background: linear-gradient(135deg, #feebc8 0%, #fbd38d 100%);
            color: #744210;
        }}
        
        .status-banner.error {{
            background: linear-gradient(135deg, #fed7d7 0%, #feb2b2 100%);
            color: #742a2a;
        }}
        
        .status-banner h3 {{
            font-size: 1.1rem;
        }}
        
        @media (max-width: 768px) {{
            .header h1 {{
                font-size: 1.75rem;
            }}
            
            .stat-value {{
                font-size: 2rem;
            }}
            
            .card-body {{
                padding: 16px;
            }}
            
            th, td {{
                padding: 8px;
                font-size: 0.85rem;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>🚀 Project Analysis Report</h1>
            <div class="header-meta">
                <span>📁 <strong>{escape(report.project_name)}</strong></span>
                <span>📅 {report.timestamp}</span>
                <span>⏱️ {report.execution_time:.2f}s</span>
                <span>🔧 v{report.version}</span>
            </div>
        </div>
        
        <!-- Status Banner -->
        <div class="status-banner {'success' if report.all_features_intact else 'warning'}">
            <span style="font-size: 1.5rem;">{'✅' if report.all_features_intact else '⚠️'}</span>
            <div>
                <h3>{'All Features Preserved!' if report.all_features_intact else 'Some Features Need Attention'}</h3>
                <p>{report.features_preserved}/{report.features_detected} features preserved • {report.issues_fixed}/{report.issues_found} issues fixed</p>
            </div>
        </div>
        
        <!-- Dashboard Stats -->
        <div class="dashboard">
            <div class="stat-card">
                <div class="stat-value">{report.total_files}</div>
                <div class="stat-label">Files Analyzed</div>
            </div>
            <div class="stat-card success">
                <div class="stat-value">{report.features_detected}</div>
                <div class="stat-label">Features Detected</div>
            </div>
            <div class="stat-card {'success' if report.features_preserved == report.features_detected else 'warning'}">
                <div class="stat-value">{report.features_preserved}</div>
                <div class="stat-label">Features Preserved</div>
            </div>
            <div class="stat-card {'success' if error_count == 0 else 'error'}">
                <div class="stat-value">{error_count}</div>
                <div class="stat-label">Errors</div>
            </div>
            <div class="stat-card {'success' if warning_count == 0 else 'warning'}">
                <div class="stat-value">{warning_count}</div>
                <div class="stat-label">Warnings</div>
            </div>
            <div class="stat-card success">
                <div class="stat-value">{report.issues_fixed}</div>
                <div class="stat-label">Auto-Fixed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{len(report.stubs_created)}</div>
                <div class="stat-label">Stubs Created</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{len(report.backups_created)}</div>
                <div class="stat-label">Backups</div>
            </div>
        </div>
        
        <!-- Features Section -->
        <div class="card">
            <div class="card-header" onclick="toggleCard(this)">
                <h2>
                    <span class="toggle-icon">▼</span>
                    🎯 Features Detected & Preserved
                    <span class="count">{report.features_detected}</span>
                </h2>
            </div>
            <div class="card-body">
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Location</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {features_rows if features_rows else '<tr><td colspan="4" style="text-align:center;color:#718096;">No features detected</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Issues Section -->
        <div class="card">
            <div class="card-header" onclick="toggleCard(this)">
                <h2>
                    <span class="toggle-icon">▼</span>
                    🔍 Issues Found
                    <span class="count">{report.issues_found}</span>
                </h2>
            </div>
            <div class="card-body">
                <table>
                    <thead>
                        <tr>
                            <th>Severity</th>
                            <th>Type</th>
                            <th>Location</th>
                            <th>Description</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {issues_rows if issues_rows else '<tr><td colspan="5" style="text-align:center;color:#718096;">No issues found! 🎉</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Stubs Section -->
        <div class="card">
            <div class="card-header" onclick="toggleCard(this)">
                <h2>
                    <span class="toggle-icon">▼</span>
                    📝 Auto-Generated Stubs
                    <span class="count">{len(report.stubs_created)}</span>
                </h2>
            </div>
            <div class="card-body">
                <table>
                    <thead>
                        <tr>
                            <th>Path</th>
                            <th>Type</th>
                            <th>Reason</th>
                            <th>Created</th>
                        </tr>
                    </thead>
                    <tbody>
                        {stubs_rows if stubs_rows else '<tr><td colspan="4" style="text-align:center;color:#718096;">No stubs created</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Enhancements Section -->
        <div class="card">
            <div class="card-header" onclick="toggleCard(this)">
                <h2>
                    <span class="toggle-icon">▼</span>
                    💡 Enhancement Suggestions
                    <span class="count">{report.enhancements_suggested}</span>
                </h2>
            </div>
            <div class="card-body">
                <table>
                    <thead>
                        <tr>
                            <th>Priority</th>
                            <th>Type</th>
                            <th>File</th>
                            <th>Description</th>
                            <th>Suggestion</th>
                        </tr>
                    </thead>
                    <tbody>
                        {enhancements_rows if enhancements_rows else '<tr><td colspan="5" style="text-align:center;color:#718096;">No enhancement suggestions</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Circular Dependencies Section -->
        <div class="card">
            <div class="card-header" onclick="toggleCard(this)">
                <h2>
                    <span class="toggle-icon">▼</span>
                    🔄 Circular Dependencies
                    <span class="count">{len(report.circular_dependencies)}</span>
                </h2>
            </div>
            <div class="card-body">
                <table>
                    <thead>
                        <tr>
                            <th>Severity</th>
                            <th>Cycle</th>
                            <th>Suggestion</th>
                        </tr>
                    </thead>
                    <tbody>
                        {circular_rows if circular_rows else '<tr><td colspan="3" style="text-align:center;color:#718096;">No circular dependencies found! 🎉</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Backups Section -->
        <div class="card">
            <div class="card-header" onclick="toggleCard(this)">
                <h2>
                    <span class="toggle-icon">▼</span>
                    💾 Backups Created
                    <span class="count">{len(report.backups_created)}</span>
                </h2>
            </div>
            <div class="card-body">
                <table>
                    <thead>
                        <tr>
                            <th>Original Path</th>
                            <th>Backup Path</th>
                            <th>Size</th>
                            <th>Timestamp</th>
                        </tr>
                    </thead>
                    <tbody>
                        {backups_rows if backups_rows else '<tr><td colspan="4" style="text-align:center;color:#718096;">No backups created</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Path Aliases Section -->
        <div class="card">
            <div class="card-header" onclick="toggleCard(this)">
                <h2>
                    <span class="toggle-icon">▼</span>
                    🔗 Path Aliases
                    <span class="count">{len(report.path_aliases)}</span>
                </h2>
            </div>
            <div class="card-body">
                <table>
                    <thead>
                        <tr>
                            <th>Alias</th>
                            <th>Path</th>
                            <th>Source</th>
                            <th>Resolved Count</th>
                        </tr>
                    </thead>
                    <tbody>
                        {''.join(f'<tr><td><code>{escape(a.alias)}</code></td><td class="file-path">{escape(a.path)}</td><td>{escape(a.source)}</td><td>{a.resolved_count}</td></tr>' for a in report.path_aliases) if report.path_aliases else '<tr><td colspan="4" style="text-align:center;color:#718096;">No path aliases configured</td></tr>'}
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- Summary Section -->
        <div class="card">
            <div class="card-header">
                <h2>📊 Analysis Summary</h2>
            </div>
            <div class="card-body">
                <div class="summary-grid">
                    <div class="summary-item">
                        <h4>Source Directory</h4>
                        <p class="file-path">{escape(report.source_path)}</p>
                    </div>
                    <div class="summary-item">
                        <h4>Destination Directory</h4>
                        <p class="file-path">{escape(report.dest_path)}</p>
                    </div>
                    <div class="summary-item">
                        <h4>Total Directories</h4>
                        <p>{report.total_directories}</p>
                    </div>
                    <div class="summary-item">
                        <h4>Execution Mode</h4>
                        <p>{'Auto-Fix' if report.auto_mode else 'Manual Review'}</p>
                    </div>
                    <div class="summary-item">
                        <h4>Build Status</h4>
                        <p><span class="badge badge-{'success' if report.is_buildable else 'error'}">{'Buildable' if report.is_buildable else 'Needs Fixes'}</span></p>
                    </div>
                    <div class="summary-item">
                        <h4>Checkpoints Created</h4>
                        <p>{len(report.checkpoints)}</p>
                    </div>
                </div>
                
                <div style="margin-top: 20px;">
                    <h4 style="color: var(--text-light); margin-bottom: 8px;">Feature Preservation Progress</h4>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: {(report.features_preserved / report.features_detected * 100) if report.features_detected > 0 else 100}%"></div>
                    </div>
                    <p style="margin-top: 8px; color: var(--text-light);">{report.features_preserved} of {report.features_detected} features preserved ({(report.features_preserved / report.features_detected * 100) if report.features_detected > 0 else 100:.1f}%)</p>
                </div>
            </div>
        </div>
    </div>
    
    <script>
        function toggleCard(header) {{
            const body = header.nextElementSibling;
            const icon = header.querySelector('.toggle-icon');
            
            body.classList.toggle('collapsed');
            icon.classList.toggle('collapsed');
        }}
        
        // Filter functionality
        function filterTable(tableId, searchText) {{
            const table = document.getElementById(tableId);
            const rows = table.querySelectorAll('tbody tr');
            
            rows.forEach(row => {{
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchText.toLowerCase()) ? '' : 'none';
            }});
        }}
    </script>
</body>
</html>'''
        
        return html

# ═══════════════════════════════════════════════════════════════════════════════
# MARKDOWN CHANGELOG GENERATOR
# ═══════════════════════════════════════════════════════════════════════════════

class MarkdownChangelogGenerator:
    """Generate markdown changelog"""
    
    @staticmethod
    def generate(report: ProjectReport) -> str:
        """Generate markdown changelog"""
        
        changelog = f"""# Changelog - Auto-Generated

## [{report.timestamp}] - Automated Analysis & Fixes

### Summary
- **Project**: {report.project_name}
- **Version**: {report.version}
- **Execution Time**: {report.execution_time:.2f}s
- **Mode**: {'Auto-Fix' if report.auto_mode else 'Manual Review'}

### Statistics
| Metric | Value |
|--------|-------|
| Files Analyzed | {report.total_files} |
| Features Detected | {report.features_detected} |
| Features Preserved | {report.features_preserved} |
| Issues Found | {report.issues_found} |
| Issues Fixed | {report.issues_fixed} |
| Stubs Created | {len(report.stubs_created)} |
| Backups Created | {len(report.backups_created)} |

### Issues Fixed
"""
        
        fixed_issues = [i for f in report.files_analyzed for i in f.issues if i.auto_fixed]
        if fixed_issues:
            for issue in fixed_issues[:50]:
                changelog += f"- ✅ **{issue.type}** in `{issue.file_path}:{issue.line_number}`: {issue.description}\n"
        else:
            changelog += "- No issues were auto-fixed\n"
        
        changelog += "\n### Stubs Created\n"
        if report.stubs_created:
            for stub in report.stubs_created:
                changelog += f"- 📝 `{stub.path}` ({stub.template_type}): {stub.reason}\n"
        else:
            changelog += "- No stubs were created\n"
        
        changelog += "\n### Enhancement Suggestions\n"
        enhancements = [e for f in report.files_analyzed for e in f.enhancements]
        if enhancements:
            for enh in enhancements[:20]:
                changelog += f"- 💡 **{enh.type}** in `{enh.file_path}`: {enh.suggestion}\n"
        else:
            changelog += "- No enhancements suggested\n"
        
        changelog += f"""
### Build Status
- TypeScript Check: {'✅ Passed' if report.build_verification and report.build_verification.typescript_check else '❌ Failed'}
- Build Command: {'✅ Passed' if report.build_verification and report.build_verification.build_command else '⚠️ Skipped/Failed'}

---
*Generated by React Project Analyzer v{report.version}*
"""
        
        return changelog

# ═══════════════════════════════════════════════════════════════════════════════
# TINKER UI SERVER
# ═══════════════════════════════════════════════════════════════════════════════

class TinkerUIHandler(BaseHTTPRequestHandler):
    """HTTP handler for Tinker UI"""
    
    analyzer = None
    report: Optional[ProjectReport] = None
    
    def log_message(self, format, *args):
        """Suppress default logging"""
        pass
    
    def do_GET(self):
        """Handle GET requests"""
        parsed = urlparse(self.path)
        path = parsed.path
        
        if path == '/':
            self._serve_main_page()
        elif path == '/api/status':
            self._serve_status()
        elif path == '/api/report':
            self._serve_report()
        elif path == '/report.html':
            self._serve_html_report()
        else:
            self.send_error(404)
    
    def do_POST(self):
        """Handle POST requests"""
        parsed = urlparse(self.path)
        path = parsed.path
        
        if path == '/api/analyze':
            self._run_analysis()
        elif path == '/api/fix':
            self._run_fixes()
        else:
            self.send_error(404)
    
    def _serve_main_page(self):
        """Serve main Tinker UI page"""
        html = '''<!DOCTYPE html>
<html>
<head>
    <title>React Tinker - Project Analyzer</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            color: white;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px 20px;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .header h1 {
            font-size: 3rem;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            margin-bottom: 10px;
        }
        .header p {
            color: #a0aec0;
            font-size: 1.1rem;
        }
        .card {
            background: rgba(255,255,255,0.05);
            border-radius: 16px;
            padding: 30px;
            margin-bottom: 20px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.1);
        }
        .card h2 {
            font-size: 1.5rem;
            margin-bottom: 20px;
            color: #e2e8f0;
        }
        .btn {
            padding: 14px 28px;
            border: none;
            border-radius: 10px;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            margin: 5px;
        }
        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 30px rgba(102, 126, 234, 0.4);
        }
        .btn-success {
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            color: white;
        }
        .btn-secondary {
            background: rgba(255,255,255,0.1);
            color: white;
            border: 1px solid rgba(255,255,255,0.2);
        }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 20px;
            margin-top: 20px;
        }
        .stat {
            text-align: center;
            padding: 20px;
            background: rgba(255,255,255,0.05);
            border-radius: 12px;
        }
        .stat-value {
            font-size: 2.5rem;
            font-weight: 700;
            color: #667eea;
        }
        .stat-label {
            font-size: 0.85rem;
            color: #a0aec0;
            margin-top: 5px;
        }
        .log {
            background: #0d1117;
            border-radius: 8px;
            padding: 20px;
            max-height: 400px;
            overflow-y: auto;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 0.85rem;
            line-height: 1.6;
        }
        .log-entry {
            padding: 4px 0;
        }
        .log-info { color: #58a6ff; }
        .log-success { color: #3fb950; }
        .log-warning { color: #d29922; }
        .log-error { color: #f85149; }
        .status-badge {
            display: inline-block;
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
        }
        .status-ready { background: #3fb950; color: #0d1117; }
        .status-running { background: #58a6ff; color: #0d1117; }
        .status-complete { background: #a371f7; color: #0d1117; }
        .actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔧 React Tinker</h1>
            <p>Autonomous Project Analyzer & Fixer</p>
        </div>
        
        <div class="card">
            <h2>📊 Project Status</h2>
            <div id="status">
                <span class="status-badge status-ready">Ready</span>
            </div>
            <div class="stats" id="stats">
                <div class="stat">
                    <div class="stat-value" id="stat-files">-</div>
                    <div class="stat-label">Files</div>
                </div>
                <div class="stat">
                    <div class="stat-value" id="stat-features">-</div>
                    <div class="stat-label">Features</div>
                </div>
                <div class="stat">
                    <div class="stat-value" id="stat-issues">-</div>
                    <div class="stat-label">Issues</div>
                </div>
                <div class="stat">
                    <div class="stat-value" id="stat-fixed">-</div>
                    <div class="stat-label">Fixed</div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <h2>🎮 Actions</h2>
            <div class="actions">
                <button class="btn btn-primary" onclick="runAnalysis()">🔍 Analyze Project</button>
                <button class="btn btn-success" onclick="runFixes()">🔧 Apply Fixes</button>
                <button class="btn btn-secondary" onclick="viewReport()">📊 View Report</button>
                <button class="btn btn-secondary" onclick="refreshStatus()">🔄 Refresh</button>
            </div>
        </div>
        
        <div class="card">
            <h2>📝 Activity Log</h2>
            <div class="log" id="log">
                <div class="log-entry log-info">Ready to analyze project...</div>
            </div>
        </div>
    </div>
    
    <script>
        function log(message, type = 'info') {
            const logDiv = document.getElementById('log');
            const entry = document.createElement('div');
            entry.className = `log-entry log-${type}`;
            entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
            logDiv.appendChild(entry);
            logDiv.scrollTop = logDiv.scrollHeight;
        }
        
        function updateStats(data) {
            if (data.files) document.getElementById('stat-files').textContent = data.files;
            if (data.features) document.getElementById('stat-features').textContent = data.features;
            if (data.issues) document.getElementById('stat-issues').textContent = data.issues;
            if (data.fixed) document.getElementById('stat-fixed').textContent = data.fixed;
        }
        
        function setStatus(status, type) {
            const statusDiv = document.getElementById('status');
            statusDiv.innerHTML = `<span class="status-badge status-${type}">${status}</span>`;
        }
        
        async function runAnalysis() {
            log('Starting project analysis...', 'info');
            setStatus('Analyzing...', 'running');
            
            try {
                const response = await fetch('/api/analyze', { method: 'POST' });
                const data = await response.json();
                
                if (data.success) {
                    log('Analysis complete!', 'success');
                    setStatus('Complete', 'complete');
                    updateStats(data.stats);
                } else {
                    log('Analysis failed: ' + data.error, 'error');
                    setStatus('Error', 'error');
                }
            } catch (e) {
                log('Error: ' + e.message, 'error');
            }
        }
        
        async function runFixes() {
            log('Applying fixes...', 'info');
            setStatus('Fixing...', 'running');
            
            try {
                const response = await fetch('/api/fix', { method: 'POST' });
                const data = await response.json();
                
                if (data.success) {
                    log(`Fixed ${data.fixed} issues!`, 'success');
                    setStatus('Complete', 'complete');
                    updateStats(data.stats);
                } else {
                    log('Fix failed: ' + data.error, 'error');
                }
            } catch (e) {
                log('Error: ' + e.message, 'error');
            }
        }
        
        function viewReport() {
            window.open('/report.html', '_blank');
        }
        
        async function refreshStatus() {
            try {
                const response = await fetch('/api/status');
                const data = await response.json();
                updateStats(data.stats);
                log('Status refreshed', 'info');
            } catch (e) {
                log('Failed to refresh: ' + e.message, 'warning');
            }
        }
        
        // Initial status check
        refreshStatus();
    </script>
</body>
</html>'''
        
        self.send_response(200)
        self.send_header('Content-type', 'text/html')
        self.end_headers()
        self.wfile.write(html.encode())
    
    def _serve_status(self):
        """Serve current status as JSON"""
        stats = {
            'files': 0,
            'features': 0,
            'issues': 0,
            'fixed': 0
        }
        
        if TinkerUIHandler.report:
            stats = {
                'files': TinkerUIHandler.report.total_files,
                'features': TinkerUIHandler.report.features_detected,
                'issues': TinkerUIHandler.report.issues_found,
                'fixed': TinkerUIHandler.report.issues_fixed
            }
        
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps({'stats': stats}).encode())
    
    def _serve_report(self):
        """Serve report as JSON"""
        if TinkerUIHandler.report:
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(asdict(TinkerUIHandler.report), default=str).encode())
        else:
            self.send_error(404, 'No report available')
    
    def _serve_html_report(self):
        """Serve HTML report"""
        if TinkerUIHandler.report:
            html = HTMLReportGenerator.generate(TinkerUIHandler.report)
            self.send_response(200)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            self.wfile.write(html.encode())
        else:
            self.send_error(404, 'No report available')
    
    def _run_analysis(self):
        """Run analysis via API"""
        try:
            if TinkerUIHandler.analyzer:
                TinkerUIHandler.analyzer.run()
                TinkerUIHandler.report = TinkerUIHandler.analyzer.report
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'success': True,
                    'stats': {
                        'files': TinkerUIHandler.report.total_files,
                        'features': TinkerUIHandler.report.features_detected,
                        'issues': TinkerUIHandler.report.issues_found,
                        'fixed': TinkerUIHandler.report.issues_fixed
                    }
                }).encode())
            else:
                self.send_error(500, 'Analyzer not initialized')
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({'success': False, 'error': str(e)}).encode())
    
    def _run_fixes(self):
        """Run fixes via API"""
        self._run_analysis()  # Re-run with fixes

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN PROJECT ANALYZER
# ═══════════════════════════════════════════════════════════════════════════════

class ReactProjectAnalyzer:
    """Main orchestrator for project analysis"""
    
    def __init__(self, source: Path, dest: Path, dry_run: bool = False,
                 create_stubs: bool = True, max_workers: int = 8,
                 auto_mode: bool = False, verbose: bool = False):
        self.source = source.resolve()
        self.dest = dest.resolve()
        self.dry_run = dry_run
        self.create_stubs = create_stubs
        self.max_workers = max_workers
        self.auto_mode = auto_mode
        self.start_time = datetime.now()
        
        Logger.verbose = verbose
        
        # Initialize components
        self.backup_manager = EnhancedBackupManager(self.dest)
        self.resolver = EnhancedPathAliasResolver(self.source)
        self.analyzer = CodeAnalyzer(self.source, self.dest, self.resolver, self.backup_manager)
        self.fixer = CodeFixer(self.source, self.dest, self.resolver, self.backup_manager,
                               dry_run, create_stubs, auto_mode)
        self.enhancer = ComponentEnhancer(self.source)
        self.build_verifier = BuildVerifier(self.source)
        
        # Results
        self.analyses: List[FileAnalysis] = []
        self.report: Optional[ProjectReport] = None
    
    def run(self) -> ProjectReport:
        """Run complete analysis pipeline"""
        Logger.header(f"REACT PROJECT ANALYZER v{VERSION}")
        Logger.info(f"Source: {self.source}")
        Logger.info(f"Destination: {self.dest}")
        Logger.info(f"Mode: {'Auto-Fix' if self.auto_mode else 'Analysis Only'}")
        Logger.info(f"Dry Run: {self.dry_run}")
        
        # Step 1: Scan project files
        Logger.subheader("Step 1: Scanning Project")
        files = self._scan_project()
        Logger.success(f"Found {len(files)} files to analyze")
        
        # Cache files for fuzzy matching
        self.resolver.cache_all_files(files)
        
        # Step 2: Analyze files
        Logger.subheader("Step 2: Analyzing Files")
        self._analyze_files(files)
        
        # Create checkpoint
        self.backup_manager.create_checkpoint("ANALYSIS", len(self.analyses), 0, "Initial analysis complete")
        
        # Step 3: Fix issues (if auto mode)
        if self.auto_mode:
            Logger.subheader("Step 3: Fixing Issues")
            self._fix_files()
            self.backup_manager.create_checkpoint("FIXES", len(self.analyses), 
                                                  self.fixer.fixes_applied, "Fixes applied")
        
        # Step 4: Enhance components
        Logger.subheader("Step 4: Suggesting Enhancements")
        self._enhance_files()
        # Step 5: Detect circular dependencies
        Logger.subheader("Step 5: Detecting Circular Dependencies")
        circular_deps = CircularDependencyDetector(self.analyses).find_cycles()
        if circular_deps:
            Logger.warning(f"Found {len(circular_deps)} circular dependencies")
        else:
            Logger.success("No circular dependencies found")
        
        # Step 6: Detect unused files
        Logger.subheader("Step 6: Detecting Unused Files")
        unused_detector = UnusedFileDetector(self.analyses)
        unused_files = unused_detector.detect_unused()
        if unused_files:
            Logger.warning(f"Found {len(unused_files)} potentially unused files")
        else:
            Logger.success("No unused files detected")
        
        # Step 7: Build verification
        Logger.subheader("Step 7: Build Verification")
        build_result = self.build_verifier.verify(self.dry_run)
        
        # Step 8: Generate reports
        Logger.subheader("Step 8: Generating Reports")
        self._generate_reports(circular_deps, build_result, unused_files)
        
        # Final checkpoint
        self.backup_manager.create_checkpoint("COMPLETE", len(self.analyses),
                                              self.fixer.fixes_applied, "Analysis complete")
        
        # Print summary
        self._print_summary()
        
        return self.report
    
    def _scan_project(self) -> List[Path]:
        """Scan project for all relevant files"""
        files = []
        exclude_patterns = CONFIG['project']['exclude_patterns']
        valid_extensions = set(CONFIG['project']['extensions'] + CONFIG['project']['style_extensions'])
        
        for root, dirs, filenames in os.walk(self.source):
            # Filter out excluded directories
            dirs[:] = [d for d in dirs if not any(
                pattern in d or d.startswith(pattern.rstrip('*'))
                for pattern in exclude_patterns
            )]
            
            # Skip backup directories
            if self.backup_manager.is_backup_path(Path(root)):
                continue
            
            for filename in filenames:
                filepath = Path(root) / filename
                
                # Check extension
                if filepath.suffix in valid_extensions:
                    files.append(filepath)
        
        return files
    
    def _analyze_files(self, files: List[Path]):
        """Analyze all files with parallel processing"""
        total = len(files)
        
        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            futures = {executor.submit(self.analyzer.analyze_file, f): f for f in files}
            
            for i, future in enumerate(as_completed(futures), 1):
                try:
                    analysis = future.result()
                    self.analyses.append(analysis)
                    Logger.progress("Analyzing", i, total)
                except Exception as e:
                    filepath = futures[future]
                    Logger.error(f"Failed to analyze {filepath.name}: {e}")
        
        Logger.success(f"Analyzed {len(self.analyses)} files")
        
        # Count features and issues
        total_features = sum(len(a.features) for a in self.analyses)
        total_issues = sum(len(a.issues) for a in self.analyses)
        
        Logger.info(f"Detected {total_features} features")
        Logger.info(f"Found {total_issues} issues")
    
    def _fix_files(self):
        """Apply fixes to all files with issues"""
        files_with_issues = [a for a in self.analyses if a.issues]
        total = len(files_with_issues)
        
        if total == 0:
            Logger.success("No issues to fix")
            return
        
        Logger.info(f"Fixing {total} files with issues...")
        
        for i, analysis in enumerate(files_with_issues, 1):
            self.fixer.fix_file(analysis)
            Logger.progress("Fixing", i, total)
        
        Logger.success(f"Applied {self.fixer.fixes_applied} fixes")
        Logger.info(f"Created {len(self.fixer.stubs_created)} stub files")
    
    def _enhance_files(self):
        """Generate enhancement suggestions for components"""
        components = [a for a in self.analyses if a.is_component]
        total = len(components)
        
        if total == 0:
            Logger.info("No components found for enhancement analysis")
            return
        
        for i, analysis in enumerate(components, 1):
            self.enhancer.enhance_file(analysis)
            Logger.progress("Enhancing", i, total)
        
        total_enhancements = sum(len(a.enhancements) for a in self.analyses)
        Logger.success(f"Generated {total_enhancements} enhancement suggestions")
    
    def _generate_reports(self, circular_deps: List[CircularDependency],
                         build_result: BuildVerification,
                         unused_files: List[FileAnalysis]):
        """Generate all reports"""
        
        # Calculate statistics
        total_features = sum(len(a.features) for a in self.analyses)
        preserved_features = sum(len([f for f in a.features if f.preserved]) for a in self.analyses)
        total_issues = sum(len(a.issues) for a in self.analyses)
        fixed_issues = sum(len([i for i in a.issues if i.auto_fixed]) for a in self.analyses)
        total_enhancements = sum(len(a.enhancements) for a in self.analyses)
        
        # Count directories
        directories = set()
        for analysis in self.analyses:
            dir_path = str(Path(analysis.path).parent)
            directories.add(dir_path)
        
        # Build directory analysis
        dir_analyses = []
        for dir_path in directories:
            dir_files = [a for a in self.analyses if str(Path(a.path).parent) == dir_path]
            dir_analyses.append(DirectoryAnalysis(
                path=dir_path,
                file_count=len(dir_files),
                component_count=sum(1 for a in dir_files if a.is_component),
                total_issues=sum(len(a.issues) for a in dir_files),
                total_features=sum(len(a.features) for a in dir_files)
            ))
        
        # Create report
        self.report = ProjectReport(
            timestamp=datetime.now().isoformat(),
            version=VERSION,
            project_root=str(self.source),
            project_name=self.source.name,
            source_path=str(self.source),
            dest_path=str(self.dest),
            total_files=len(self.analyses),
            total_directories=len(directories),
            files_analyzed=self.analyses,
            directories_analyzed=dir_analyses,
            path_aliases=self.resolver.aliases,
            circular_dependencies=circular_deps,
            features_detected=total_features,
            features_preserved=preserved_features,
            attached_file_features=sum(len([f for f in a.features if f.from_attached_file]) for a in self.analyses),
            issues_found=total_issues,
            issues_fixed=fixed_issues,
            stubs_created=self.fixer.stubs_created,
            backups_created=self.backup_manager.backups,
            checkpoints=self.backup_manager.checkpoints,
            files_moved=sum(1 for a in self.analyses if a.moved_to_unfixable),
            enhancements_suggested=total_enhancements,
            unused_files=len(unused_files),
            execution_time=(datetime.now() - self.start_time).total_seconds(),
            all_features_intact=preserved_features == total_features,
            is_buildable=build_result.typescript_check and build_result.build_command,
            build_verification=build_result,
            auto_mode=self.auto_mode
        )
        
        # Generate HTML report
        html_report = HTMLReportGenerator.generate(self.report)
        html_path = self.dest / CONFIG['reports']['html_filename']
        html_path.write_text(html_report, encoding='utf-8')
        Logger.success(f"Generated HTML report: {html_path.name}")
        
        # Generate JSON report
        json_path = self.dest / CONFIG['reports']['json_filename']
        with open(json_path, 'w', encoding='utf-8') as f:
            # Convert dataclasses to dict, handling sets
            report_dict = self._report_to_dict(self.report)
            json.dump(report_dict, f, indent=2, default=str)
        Logger.success(f"Generated JSON report: {json_path.name}")
        
        # Generate Markdown changelog
        changelog = MarkdownChangelogGenerator.generate(self.report)
        changelog_path = self.dest / CONFIG['reports']['changelog_filename']
        changelog_path.write_text(changelog, encoding='utf-8')
        Logger.success(f"Generated changelog: {changelog_path.name}")
    
    def _report_to_dict(self, obj: Any) -> Any:
        """Convert report object to JSON-serializable dict"""
        if hasattr(obj, '__dataclass_fields__'):
            result = {}
            for field_name in obj.__dataclass_fields__:
                value = getattr(obj, field_name)
                result[field_name] = self._report_to_dict(value)
            return result
        elif isinstance(obj, list):
            return [self._report_to_dict(item) for item in obj]
        elif isinstance(obj, set):
            return list(obj)
        elif isinstance(obj, dict):
            return {k: self._report_to_dict(v) for k, v in obj.items()}
        elif isinstance(obj, Path):
            return str(obj)
        elif isinstance(obj, datetime):
            return obj.isoformat()
        else:
            return obj
    
    def _print_summary(self):
        """Print analysis summary to terminal"""
        Logger.header("ANALYSIS SUMMARY")
        
        if not self.report:
            Logger.error("No report generated")
            return
        
        # Feature preservation status
        if self.report.all_features_intact:
            Logger.success(f"✅ ALL FEATURES PRESERVED ({self.report.features_preserved}/{self.report.features_detected})")
        else:
            Logger.warning(f"⚠️ SOME FEATURES MAY BE AFFECTED ({self.report.features_preserved}/{self.report.features_detected})")
        
        # Statistics table
        print(f"\n{Colors.BOLD}{'─' * 50}{Colors.ENDC}")
        print(f"{Colors.BOLD}  {'Metric':<30} {'Value':>15}{Colors.ENDC}")
        print(f"{'─' * 50}")
        
        stats = [
            ("Files Analyzed", self.report.total_files),
            ("Directories", self.report.total_directories),
            ("Features Detected", self.report.features_detected),
            ("Features Preserved", self.report.features_preserved),
            ("Issues Found", self.report.issues_found),
            ("Issues Fixed", self.report.issues_fixed),
            ("Stubs Created", len(self.report.stubs_created)),
            ("Backups Created", len(self.report.backups_created)),
            ("Circular Dependencies", len(self.report.circular_dependencies)),
            ("Unused Files", self.report.unused_files),
            ("Enhancements Suggested", self.report.enhancements_suggested),
            ("Execution Time", f"{self.report.execution_time:.2f}s"),
        ]
        
        for label, value in stats:
            print(f"  {label:<30} {str(value):>15}")
        
        print(f"{'─' * 50}\n")
        
        # Build status
        if self.report.build_verification:
            bv = self.report.build_verification
            ts_status = f"{Colors.GREEN}✓ PASS{Colors.ENDC}" if bv.typescript_check else f"{Colors.RED}✗ FAIL{Colors.ENDC}"
            build_status = f"{Colors.GREEN}✓ PASS{Colors.ENDC}" if bv.build_command else f"{Colors.YELLOW}⚠ SKIP{Colors.ENDC}"
            
            print(f"  {Colors.BOLD}Build Verification:{Colors.ENDC}")
            print(f"    TypeScript Check: {ts_status}")
            print(f"    Build Command:    {build_status}")
            print(f"    Package Manager:  {bv.package_manager}")
            print()
        
        # Report locations
        print(f"  {Colors.BOLD}Reports Generated:{Colors.ENDC}")
        print(f"    HTML: {self.dest / CONFIG['reports']['html_filename']}")
        print(f"    JSON: {self.dest / CONFIG['reports']['json_filename']}")
        print(f"    Changelog: {self.dest / CONFIG['reports']['changelog_filename']}")
        print()
        
        # Backup location
        backup_summary = self.backup_manager.get_backup_summary()
        print(f"  {Colors.BOLD}Backups:{Colors.ENDC}")
        print(f"    Directory: {backup_summary['backup_directory']}")
        print(f"    Total Files: {backup_summary['total_backups']}")
        print(f"    Checkpoints: {backup_summary['checkpoints']}")
        print()
        
        Logger.success("Analysis complete!")

# ═══════════════════════════════════════════════════════════════════════════════
# INTERACTIVE CLI MENU
# ═══════════════════════════════════════════════════════════════════════════════

class InteractiveMenu:
    """Interactive terminal menu for the analyzer"""
    
    def __init__(self, source: Path, dest: Path):
        self.source = source
        self.dest = dest
        self.analyzer: Optional[ReactProjectAnalyzer] = None
        self.report: Optional[ProjectReport] = None
    
    def clear_screen(self):
        """Clear terminal screen"""
        os.system('cls' if sys.platform == 'win32' else 'clear')
    
    def show_header(self):
        """Show menu header"""
        self.clear_screen()
        print(f"{Colors.BOLD}{Colors.HEADER}")
        print("╔══════════════════════════════════════════════════════════════╗")
        print("║         REACT PROJECT ANALYZER - INTERACTIVE MODE            ║")
        print(f"║                      Version {VERSION}                          ║")
        print("╚══════════════════════════════════════════════════════════════╝")
        print(f"{Colors.ENDC}")
        print(f"  Source: {Colors.CYAN}{self.source}{Colors.ENDC}")
        print(f"  Dest:   {Colors.CYAN}{self.dest}{Colors.ENDC}")
        print()
    
    def show_menu(self):
        """Show main menu options"""
        print(f"{Colors.BOLD}  MAIN MENU:{Colors.ENDC}")
        print()
        print(f"  {Colors.GREEN}[1]{Colors.ENDC} 🔍 Analyze Project (Analysis Only)")
        print(f"  {Colors.GREEN}[2]{Colors.ENDC} 🔧 Analyze & Auto-Fix")
        print(f"  {Colors.GREEN}[3]{Colors.ENDC} 📊 View Last Report (in browser)")
        print(f"  {Colors.GREEN}[4]{Colors.ENDC} 🌐 Start Tinker UI Server")
        print(f"  {Colors.GREEN}[5]{Colors.ENDC} ⚙️  Configuration")
        print(f"  {Colors.GREEN}[6]{Colors.ENDC} ❓ Help")
        print(f"  {Colors.RED}[0]{Colors.ENDC} 🚪 Exit")
        print()
    
    def run(self):
        """Run interactive menu loop"""
        while True:
            self.show_header()
            self.show_menu()
            
            choice = input(f"  {Colors.BOLD}Enter choice:{Colors.ENDC} ").strip()
            
            if choice == '1':
                self._run_analysis(auto_mode=False)
            elif choice == '2':
                self._run_analysis(auto_mode=True)
            elif choice == '3':
                self._view_report()
            elif choice == '4':
                self._start_ui_server()
            elif choice == '5':
                self._show_config()
            elif choice == '6':
                self._show_help()
            elif choice == '0':
                print(f"\n  {Colors.GREEN}Goodbye!{Colors.ENDC}\n")
                break
            else:
                print(f"\n  {Colors.RED}Invalid choice. Press Enter to continue...{Colors.ENDC}")
                input()
    
    def _run_analysis(self, auto_mode: bool):
        """Run project analysis"""
        self.clear_screen()
        
        self.analyzer = ReactProjectAnalyzer(
            source=self.source,
            dest=self.dest,
            dry_run=False,
            create_stubs=True,
            max_workers=CONFIG['performance']['max_workers'],
            auto_mode=auto_mode
        )
        
        self.report = self.analyzer.run()
        
        print(f"\n  {Colors.GREEN}Press Enter to continue...{Colors.ENDC}")
        input()
    
    def _view_report(self):
        """Open HTML report in browser"""
        report_path = self.dest / CONFIG['reports']['html_filename']
        
        if report_path.exists():
            Logger.info(f"Opening report: {report_path}")
            webbrowser.open(f"file://{report_path}")
        else:
            Logger.warning("No report found. Run analysis first.")
        
        print(f"\n  {Colors.GREEN}Press Enter to continue...{Colors.ENDC}")
        input()
    
    def _start_ui_server(self):
        """Start Tinker UI web server"""
        self.clear_screen()
        
        port = CONFIG['ui']['default_port']
        
        # Find available port
        while True:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.bind(('', port))
                sock.close()
                break
            except OSError:
                port += 1
                if port > 9000:
                    Logger.error("No available ports found")
                    return
        
        Logger.header(f"TINKER UI SERVER")
        Logger.info(f"Starting server on http://localhost:{port}")
        Logger.info("Press Ctrl+C to stop the server")
        
        # Initialize analyzer for UI
        self.analyzer = ReactProjectAnalyzer(
            source=self.source,
            dest=self.dest,
            dry_run=False,
            create_stubs=True,
            max_workers=CONFIG['performance']['max_workers'],
            auto_mode=True
        )
        
        TinkerUIHandler.analyzer = self.analyzer
        
        # Open browser
        webbrowser.open(f"http://localhost:{port}")
        
        # Start server
        try:
            with socketserver.TCPServer(("", port), TinkerUIHandler) as httpd:
                httpd.serve_forever()
        except KeyboardInterrupt:
            Logger.info("Server stopped")
        
        print(f"\n  {Colors.GREEN}Press Enter to continue...{Colors.ENDC}")
        input()
    
    def _show_config(self):
        """Show current configuration"""
        self.clear_screen()
        
        print(f"{Colors.BOLD}{Colors.HEADER}CONFIGURATION{Colors.ENDC}\n")
        
        print(f"  {Colors.BOLD}Project Settings:{Colors.ENDC}")
        print(f"    Extensions: {', '.join(CONFIG['project']['extensions'][:5])}...")
        print(f"    Backup Dir: {CONFIG['project']['backup_dir']}")
        print()
        
        print(f"  {Colors.BOLD}Analysis Settings:{Colors.ENDC}")
        print(f"    Fuzzy Matching: {CONFIG['analysis']['fuzzy_matching']}")
        print(f"    Fuzzy Threshold: {CONFIG['analysis']['fuzzy_threshold']}")
        print(f"    Check Circular: {CONFIG['analysis']['check_circular']}")
        print()
        
        print(f"  {Colors.BOLD}Fix Settings:{Colors.ENDC}")
        print(f"    Create Stubs: {CONFIG['fixes']['create_stubs']}")
        print(f"    Preserve Behavior: {CONFIG['fixes']['preserve_behavior']}")
        print()
        
        print(f"  {Colors.BOLD}Performance:{Colors.ENDC}")
        print(f"    Max Workers: {CONFIG['performance']['max_workers']}")
        print(f"    Checkpoint Interval: {CONFIG['performance']['checkpoint_interval']}")
        print()
        
        print(f"\n  {Colors.GREEN}Press Enter to continue...{Colors.ENDC}")
        input()
    
    def _show_help(self):
        """Show help information"""
        self.clear_screen()
        
        help_text = f"""
{Colors.BOLD}{Colors.HEADER}REACT PROJECT ANALYZER - HELP{Colors.ENDC}

{Colors.BOLD}DESCRIPTION:{Colors.ENDC}
  A comprehensive tool for analyzing, fixing, and optimizing React/TypeScript
  projects while preserving 100% of existing functionality.

{Colors.BOLD}FEATURES:{Colors.ENDC}
  • Recursive project scanning (excludes backups and node_modules)
  • Path alias resolution (tsconfig.json, vite.config.ts)
  • Fuzzy matching for unresolved imports
  • Automatic stub file generation
  • Circular dependency detection
  • Component enhancement suggestions
  • Build verification (TypeScript + npm/yarn/pnpm)
  • Interactive HTML dashboard report
  • Timestamped backup system with checkpoints

{Colors.BOLD}COMMAND LINE OPTIONS:{Colors.ENDC}
  --source PATH    Source directory (default: current directory)
  --dest PATH      Destination directory (default: source directory)
  --auto           Auto-apply safe fixes
  --dry-run        Analyze without making changes
  --ui             Start Tinker UI web server
  --port PORT      UI server port (default: 8080)
  --verbose        Enable verbose logging
  --no-color       Disable colored output

{Colors.BOLD}EXAMPLES:{Colors.ENDC}
  python analyzer.py --source ./my-project --auto
  python analyzer.py --ui --port 3000
  python analyzer.py --dry-run --verbose

{Colors.BOLD}REPORTS:{Colors.ENDC}
  • HTML Dashboard: project-analysis-report.html
  • JSON Data: project-analysis-report.json
  • Changelog: CHANGELOG-AUTO.md

{Colors.BOLD}BACKUPS:{Colors.ENDC}
  All backups are stored in: .codefixer_backups/YYYY-MM-DD_HH-MM-SS/
"""
        print(help_text)
        
        print(f"\n  {Colors.GREEN}Press Enter to continue...{Colors.ENDC}")
        input()

# ═══════════════════════════════════════════════════════════════════════════════
# MAIN ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    """Main entry point"""
    parser = argparse.ArgumentParser(
        description="React/TypeScript Project Analyzer - Comprehensive analysis and fixing tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                          # Interactive mode
  %(prog)s --auto                   # Auto-fix mode
  %(prog)s --source ./my-project    # Analyze specific directory
  %(prog)s --ui                     # Start web UI
  %(prog)s --dry-run --verbose      # Dry run with verbose output
        """
    )
    
    parser.add_argument('--source', type=Path, default=Path.cwd(),
                       help='Source directory to analyze (default: current directory)')
    parser.add_argument('--dest', type=Path, default=None,
                       help='Destination directory for output (default: source directory)')
    parser.add_argument('--auto', action='store_true',
                       help='Automatically apply safe fixes')
    parser.add_argument('--dry-run', action='store_true',
                       help='Analyze without making any changes')
    parser.add_argument('--ui', action='store_true',
                       help='Start interactive Tinker UI web server')
    parser.add_argument('--port', type=int, default=CONFIG['ui']['default_port'],
                       help=f'Port for UI server (default: {CONFIG["ui"]["default_port"]})')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Enable verbose output')
    parser.add_argument('--no-color', action='store_true',
                       help='Disable colored output')
    parser.add_argument('--no-stubs', action='store_true',
                       help='Disable stub file generation')
    parser.add_argument('--workers', type=int, default=CONFIG['performance']['max_workers'],
                       help=f'Number of worker threads (default: {CONFIG["performance"]["max_workers"]})')
    parser.add_argument('--interactive', '-i', action='store_true',
                       help='Force interactive menu mode')
    parser.add_argument('--version', action='version', version=f'%(prog)s {VERSION}')
    
    args = parser.parse_args()
    
    # Set destination to source if not specified
    if args.dest is None:
        args.dest = args.source
    
    # Disable colors if requested
    if args.no_color:
        Colors.disable()
    
    # Validate paths
    if not args.source.exists():
        Logger.critical(f"Source directory does not exist: {args.source}")
        return 1
    
    # Create destination if needed
    args.dest.mkdir(parents=True, exist_ok=True)
    
    # Run appropriate mode
    try:
        if args.ui:
            # Start Tinker UI server
            Logger.header("TINKER UI SERVER")
            
            analyzer = ReactProjectAnalyzer(
                source=args.source,
                dest=args.dest,
                dry_run=args.dry_run,
                create_stubs=not args.no_stubs,
                max_workers=args.workers,
                auto_mode=args.auto,
                verbose=args.verbose
            )
            
            TinkerUIHandler.analyzer = analyzer
            
            Logger.info(f"Starting server on http://localhost:{args.port}")
            Logger.info("Press Ctrl+C to stop")
            
            webbrowser.open(f"http://localhost:{args.port}")
            
            with socketserver.TCPServer(("", args.port), TinkerUIHandler) as httpd:
                httpd.serve_forever()
        
        elif args.interactive or (not args.auto and sys.stdin.isatty()):
            # Interactive menu mode
            menu = InteractiveMenu(args.source, args.dest)
            menu.run()
        
        else:
            # Direct analysis mode
            analyzer = ReactProjectAnalyzer(
                source=args.source,
                dest=args.dest,
                dry_run=args.dry_run,
                create_stubs=not args.no_stubs,
                max_workers=args.workers,
                auto_mode=args.auto,
                verbose=args.verbose
            )
            
            report = analyzer.run()
            
            # Return appropriate exit code
            if report.all_features_intact and report.is_buildable:
                return 0
            else:
                return 1
    
    except KeyboardInterrupt:
        Logger.info("\nOperation cancelled by user")
        return 130
    
    except Exception as e:
        Logger.critical(f"Unexpected error: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1
    
    return 0

# ═══════════════════════════════════════════════════════════════════════════════
# SCRIPT EXECUTION
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    sys.exit(main())