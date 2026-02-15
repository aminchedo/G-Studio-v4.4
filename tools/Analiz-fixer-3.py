#!/usr/bin/env python3
"""
G-Studio TypeScript Smart Autofixer v2.0.0
==========================================
Production-ready TypeScript error fixing tool with scope-aware safety controls.
Merges architectural completeness of fix_all2.py with safety discipline of 1.py.

Author: Claude 4.6 Opus
Date: 2026-02-11
"""

import os
import re
import sys
import json
import subprocess
import shutil
import hashlib
import time
from pathlib import Path
from dataclasses import dataclass, field, asdict
from typing import Dict, List, Optional, Set, Tuple, Any
from collections import defaultdict, Counter
from datetime import datetime
from enum import Enum

# ==============================================================================
# VERSION & METADATA
# ==============================================================================

VERSION = "2.0.0"
PROJECT_NAME = "G-Studio v4.0.0"

# ==============================================================================
# ENUMS & SCOPE DEFINITIONS
# ==============================================================================

class Scope(Enum):
    """File scope categories with different permission levels."""
    NO_ANY = 1      # components/, core/, store/ — NO `any` casts allowed
    LIMITED_ANY = 2 # services/, api/, adapters/, integrations/ — LIMITED `any`
    OTHER = 3       # everything else — normal rules

class FixPermission(Enum):
    """Permission levels for automatic fixes."""
    ALWAYS = 1      # Always auto-fix
    LIMITED = 2     # Auto-fix only in LIMITED_ANY scope
    NEVER = 3       # Never auto-fix, report only

class FixCategory(Enum):
    """Fix categories for execution order."""
    SYNTAX = 1          # TS1308
    IMPORT = 2          # TS2305, TS2554
    TYPE_IDENTITY = 3   # TS2551, TS18048, TS7053, TS2578, TS2564
    ANY_CAST = 4        # TS2339, TS2322, TS2345
    G_STUDIO_CORE = 5   # Architectural fixes

# ==============================================================================
# DATA MODELS
# ==============================================================================

@dataclass
class TSError:
    """TypeScript error from tsc output."""
    file_path: str
    line: int
    column: int
    code: str
    message: str
    full_text: str
    
    def get_scope(self, project_root: Path) -> Scope:
        """Determine file scope based on path."""
        full_path = project_root / self.file_path
        str_path = str(full_path).replace('\\', '/')
        
        # NO_ANY scopes
        if any(x in str_path for x in ['/src/components/', '/src/core/', '/src/store/', '/src/stores/']):
            return Scope.NO_ANY
        
        # LIMITED_ANY scopes
        if any(x in str_path for x in ['/src/services/', '/src/api/', '/src/adapters/', '/src/integrations/']):
            return Scope.LIMITED_ANY
        
        return Scope.OTHER

@dataclass
class FixResult:
    """Result of a fix operation."""
    success: bool
    file_path: str
    line: int
    code: str
    action: str
    original_line: Optional[str] = None
    fixed_line: Optional[str] = None
    reason: str = ""
    category: str = ""
    scope: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())

@dataclass
class FileInfo:
    """File metadata and analysis data."""
    path: str
    absolute_path: str
    size: int = 0
    loc: int = 0
    hash: str = ""
    errors: List[TSError] = field(default_factory=list)
    is_core: bool = False
    backup_path: Optional[str] = None

@dataclass
class FixStats:
    """Statistics about fixes applied."""
    total_errors: int = 0
    fixed: int = 0
    skipped: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    by_category: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    by_scope: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    by_code: Dict[str, int] = field(default_factory=lambda: defaultdict(int))
    
    def add_fix(self, result: FixResult):
        """Record a fix result."""
        if result.success:
            self.fixed += 1
        else:
            self.skipped[result.reason] += 1
        
        self.by_category[result.category] += 1
        self.by_scope[result.scope] += 1
        self.by_code[result.code] += 1

# ==============================================================================
# CONFIGURATION
# ==============================================================================

class Config:
    """Configuration for the autofixer."""
    
    # Error code permissions
    ERROR_PERMISSIONS = {
        # ALWAYS AUTO-FIX
        'TS2551': FixPermission.ALWAYS,    # typo / "Did you mean"
        'TS18048': FixPermission.ALWAYS,   # possibly undefined → !
        'TS7053': FixPermission.ALWAYS,    # index signature → (obj as any)[key]
        'TS2578': FixPermission.ALWAYS,    # unused variable → _prefix
        'TS1308': FixPermission.ALWAYS,    # await in non-async → async
        'TS2564': FixPermission.ALWAYS,    # not initialized → !
        
        # LIMITED AUTO-FIX (only in LIMITED_ANY scope)
        'TS2339': FixPermission.LIMITED,   # property does not exist
        'TS2322': FixPermission.LIMITED,   # type mismatch
        'TS2345': FixPermission.LIMITED,   # argument type mismatch
        'TS2305': FixPermission.LIMITED,   # no exported member
        
        # NEVER AUTO-FIX
        'TS2769': FixPermission.NEVER,     # no overload matches
        'TS2693': FixPermission.NEVER,     # type used as value
        'TS1362': FixPermission.NEVER,     # type used as value
        'TS2300': FixPermission.NEVER,     # duplicate identifier (manual)
        'TS1117': FixPermission.NEVER,     # duplicate object property (manual)
    }
    
    # Category mapping
    ERROR_CATEGORIES = {
        'TS1308': FixCategory.SYNTAX,
        'TS2305': FixCategory.IMPORT,
        'TS2551': FixCategory.TYPE_IDENTITY,
        'TS18048': FixCategory.TYPE_IDENTITY,
        'TS7053': FixCategory.TYPE_IDENTITY,
        'TS2578': FixCategory.TYPE_IDENTITY,
        'TS2564': FixCategory.TYPE_IDENTITY,
        'TS2339': FixCategory.ANY_CAST,
        'TS2322': FixCategory.ANY_CAST,
        'TS2345': FixCategory.ANY_CAST,
    }
    
    # G-Studio core files
    CORE_FILES = [
        "App.tsx", "main.tsx", "index.tsx", 
        "mcpService.ts", "geminiService.ts",
        "projectStore.ts", "AISettingsHub.tsx",
        "EditorLayout.tsx", "MainLayout.tsx"
    ]
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.tsc_cmd = ['npx', 'tsc', '--noEmit', '--pretty', 'false', '--skipLibCheck']
        self.max_iterations = 5
        self.dry_run = False
        self.create_backups = True
        self.backup_dir = project_root / '.ts_autofixer_backups'
        self.report_dir = project_root / 'reports'
        self.checkpoint_file = project_root / '.autofixer_checkpoint.json'

# ==============================================================================
# LOGGING SYSTEM
# ==============================================================================

class Color:
    """ANSI color codes."""
    RESET = '\033[0m'
    BOLD = '\033[1m'
    DIM = '\033[2m'
    
    RED = '\033[31m'
    GREEN = '\033[32m'
    YELLOW = '\033[33m'
    BLUE = '\033[34m'
    MAGENTA = '\033[35m'
    CYAN = '\033[36m'
    
    SUCCESS = GREEN + BOLD
    WARNING = YELLOW + BOLD
    ERROR = RED + BOLD
    INFO = CYAN
    
    @classmethod
    def disable(cls):
        """Disable colors for non-TTY."""
        for attr in dir(cls):
            if not attr.startswith('_') and attr.isupper():
                setattr(cls, attr, '')

class Logger:
    """Simple logging system."""
    
    verbose = False
    quiet = False
    colors = True
    
    @classmethod
    def setup(cls, verbose=False, quiet=False, colors=True):
        cls.verbose = verbose
        cls.quiet = quiet
        cls.colors = colors and sys.stdout.isatty()
        if not cls.colors:
            Color.disable()
    
    @classmethod
    def info(cls, msg: str):
        if not cls.quiet:
            print(f"{Color.INFO}ℹ{Color.RESET} {msg}")
    
    @classmethod
    def success(cls, msg: str):
        if not cls.quiet:
            print(f"{Color.SUCCESS}✓{Color.RESET} {msg}")
    
    @classmethod
    def warning(cls, msg: str):
        print(f"{Color.WARNING}⚠{Color.RESET} {msg}")
    
    @classmethod
    def error(cls, msg: str):
        print(f"{Color.ERROR}✗{Color.RESET} {msg}")
    
    @classmethod
    def debug(cls, msg: str):
        if cls.verbose:
            print(f"{Color.DIM}•{Color.RESET} {msg}")
    
    @classmethod
    def header(cls, msg: str):
        if not cls.quiet:
            print(f"\n{Color.BOLD}{Color.MAGENTA}{'═' * 60}{Color.RESET}")
            print(f"{Color.BOLD}{Color.MAGENTA}  {msg}{Color.RESET}")
            print(f"{Color.BOLD}{Color.MAGENTA}{'═' * 60}{Color.RESET}\n")

# ==============================================================================
# FILE SYSTEM UTILITIES
# ==============================================================================

class FileSystem:
    """File system utilities."""
    
    @staticmethod
    def safe_read(file_path: Path, encoding: str = "utf-8") -> str:
        """Safely read file content."""
        try:
            return file_path.read_text(encoding=encoding)
        except UnicodeDecodeError:
            for enc in ["utf-8-sig", "latin-1", "cp1252"]:
                try:
                    return file_path.read_text(encoding=enc)
                except:
                    continue
            return ""
        except Exception as e:
            Logger.debug(f"Failed to read {file_path}: {e}")
            return ""
    
    @staticmethod
    def safe_write(file_path: Path, content: str, encoding: str = "utf-8") -> bool:
        """Safely write content to file."""
        try:
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(content, encoding=encoding)
            return True
        except Exception as e:
            Logger.error(f"Failed to write {file_path}: {e}")
            return False
    
    @staticmethod
    def get_file_hash(file_path: Path) -> str:
        """Get MD5 hash of file."""
        try:
            with open(file_path, 'rb') as f:
                return hashlib.md5(f.read()).hexdigest()
        except:
            return ""
    
    @staticmethod
    def count_lines(file_path: Path) -> int:
        """Count total lines in file."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return sum(1 for _ in f)
        except:
            return 0

# ==============================================================================
# MAIN AUTOFIXER CLASS
# ==============================================================================

class TypeScriptSmartAutofixer:
    """Main autofixer with scope-aware fixing."""
    
    def __init__(self, config: Config):
        self.config = config
        self.stats = FixStats()
        self.fix_results: List[FixResult] = []
        self.files: Dict[str, FileInfo] = {}
        self.iteration = 0
        
    # ==========================================================================
    # CORE WORKFLOW
    # ==========================================================================
    
    def run(self) -> bool:
        """Main execution loop."""
        Logger.header("G-Studio TypeScript Smart Autofixer v2.0.0")
        
        # Safety checks
        if not self._check_git_branch():
            response = input("⚠️  Continue without git branch? (y/N): ")
            if response.lower() != 'y':
                Logger.error("Aborted by user.")
                return False
        
        if self.config.dry_run:
            Logger.warning("DRY RUN MODE - No changes will be made")
        
        Logger.info(f"Project: {self.config.project_root}")
        
        # Main fixing loop
        prev_error_count = float('inf')
        
        for iteration in range(1, self.config.max_iterations + 1):
            self.iteration = iteration
            Logger.info(f"Iteration {iteration}/{self.config.max_iterations}")
            
            # Run tsc
            errors = self._run_tsc()
            error_count = len(errors)
            self.stats.total_errors = error_count
            
            Logger.info(f"Found {error_count} TypeScript errors")
            
            if error_count == 0:
                Logger.success("No errors remaining!")
                break
            
            if error_count >= prev_error_count:
                Logger.warning("No progress made, stopping")
                break
            
            prev_error_count = error_count
            
            # Apply fixes
            fixed = self._apply_fixes(errors)
            
            Logger.success(f"Fixed {fixed} errors this iteration")
            
            if fixed == 0:
                Logger.warning("No fixes applied, stopping")
                break
            
            # Save checkpoint
            self._save_checkpoint()
        
        # Generate report
        self._generate_report()
        
        return True
    
    def _run_tsc(self) -> List[TSError]:
        """Run TypeScript compiler and parse errors."""
        try:
            result = subprocess.run(
                self.config.tsc_cmd,
                cwd=self.config.project_root,
                capture_output=True,
                text=True,
                timeout=60
            )
            
            errors = []
            # Pattern: file.ts(line,col): error TScode: message
            pattern = r'([^(]+)\((\d+),(\d+)\):\s+error\s+([^:]+):\s+(.+)'
            
            output = result.stdout + result.stderr
            for line in output.split('\n'):
                if 'error TS' in line:
                    match = re.match(pattern, line.strip())
                    if match:
                        errors.append(TSError(
                            file_path=match.group(1).strip(),
                            line=int(match.group(2)),
                            column=int(match.group(3)),
                            code=match.group(4).strip(),
                            message=match.group(5).strip(),
                            full_text=line.strip()
                        ))
            
            return errors
            
        except subprocess.TimeoutExpired:
            Logger.error("tsc command timed out")
            return []
        except Exception as e:
            Logger.error(f"Error running tsc: {e}")
            return []
    
    def _apply_fixes(self, errors: List[TSError]) -> int:
        """Apply fixes to errors."""
        # Group by category
        errors_by_category = defaultdict(list)
        for error in errors:
            category = self.config.ERROR_CATEGORIES.get(error.code, FixCategory.ANY_CAST)
            errors_by_category[category].append(error)
        
        # Apply G-Studio core fixes first
        core_fixed = self._apply_g_studio_core_fixes()
        
        # Apply category fixes in order
        category_order = [
            FixCategory.SYNTAX,
            FixCategory.IMPORT,
            FixCategory.TYPE_IDENTITY,
            FixCategory.ANY_CAST
        ]
        
        total_fixed = core_fixed
        
        for category in category_order:
            if category in errors_by_category:
                fixed = self._apply_category_fixes(category, errors_by_category[category])
                total_fixed += fixed
        
        return total_fixed
    
    def _apply_category_fixes(self, category: FixCategory, errors: List[TSError]) -> int:
        """Apply fixes for a specific category."""
        # Group by file
        errors_by_file = defaultdict(list)
        for error in errors:
            errors_by_file[error.file_path].append(error)
        
        fixed_count = 0
        
        for file_path_str, file_errors in errors_by_file.items():
            file_path = self.config.project_root / file_path_str
            
            if not file_path.exists():
                continue
            
            # Sort by line DESC (bottom-up)
            file_errors.sort(key=lambda e: -e.line)
            
            # Read file
            lines = self._read_file_lines(file_path)
            if not lines:
                continue
            
            # Create backup
            if not self.config.dry_run and self.config.create_backups:
                self._create_backup(file_path)
            
            # Apply fixes
            file_changed = False
            for error in file_errors:
                result = self._fix_error(error, lines)
                
                if result:
                    result.category = category.name
                    result.scope = error.get_scope(self.config.project_root).name
                    self.fix_results.append(result)
                    self.stats.add_fix(result)
                    
                    if result.success:
                        file_changed = True
                        fixed_count += 1
            
            # Write file
            if file_changed and not self.config.dry_run:
                self._write_file_lines(file_path, lines)
        
        return fixed_count
    
    def _fix_error(self, error: TSError, lines: List[str]) -> Optional[FixResult]:
        """Fix a single error."""
        # Check permission
        permission = self.config.ERROR_PERMISSIONS.get(error.code)
        if not permission:
            return FixResult(
                success=False,
                file_path=error.file_path,
                line=error.line,
                code=error.code,
                action="Skipped - no handler",
                reason=f"No handler for {error.code}"
            )
        
        if permission == FixPermission.NEVER:
            return FixResult(
                success=False,
                file_path=error.file_path,
                line=error.line,
                code=error.code,
                action="Skipped - NEVER permission",
                reason=f"{error.code} marked as NEVER auto-fix"
            )
        
        # Check scope
        scope = error.get_scope(self.config.project_root)
        
        if permission == FixPermission.LIMITED and scope == Scope.NO_ANY:
            return FixResult(
                success=False,
                file_path=error.file_path,
                line=error.line,
                code=error.code,
                action="Skipped - NO_ANY scope",
                reason=f"{error.code} not allowed in NO_ANY scope"
            )
        
        # Call appropriate fix function
        fix_functions = {
            'TS2551': self._fix_ts2551_typo,
            'TS18048': self._fix_ts18048_undefined,
            'TS7053': self._fix_ts7053_index,
            'TS2578': self._fix_ts2578_unused,
            'TS1308': self._fix_ts1308_async,
            'TS2564': self._fix_ts2564_init,
            'TS2339': self._fix_ts2339_property,
            'TS2322': self._fix_ts2322_type,
            'TS2345': self._fix_ts2345_argument,
            'TS2305': self._fix_ts2305_export,
        }
        
        fix_fn = fix_functions.get(error.code)
        if fix_fn:
            return fix_fn(error, lines, scope)
        
        return None
    
    # ==========================================================================
    # FIX FUNCTIONS
    # ==========================================================================
    
    def _fix_ts2551_typo(self, error: TSError, lines: List[str], scope: Scope) -> Optional[FixResult]:
        """Fix TS2551 - Property typo."""
        idx = error.line - 1
        if idx >= len(lines):
            return None
        
        line = lines[idx]
        
        # Extract: Property 'wrong' ... Did you mean 'right'?
        match = re.match(r"Property '(\w+)'.+Did you mean '(\w+)'\?", error.message)
        if not match:
            return None
        
        wrong, right = match.groups()
        
        # Replace
        new_line = line
        for pattern in [f'.{wrong}', f'?.{wrong}', f'!.{wrong}']:
            replacement = pattern.replace(wrong, right)
            if pattern in new_line:
                new_line = new_line.replace(pattern, replacement, 1)
                break
        
        if new_line != line:
            lines[idx] = new_line
            return FixResult(
                success=True,
                file_path=error.file_path,
                line=error.line,
                code=error.code,
                action=f"Fixed typo: {wrong} → {right}",
                original_line=line.rstrip('\n'),
                fixed_line=new_line.rstrip('\n')
            )
        
        return None
    
    def _fix_ts18048_undefined(self, error: TSError, lines: List[str], scope: Scope) -> Optional[FixResult]:
        """Fix TS18048 - Possibly undefined."""
        idx = error.line - 1
        if idx >= len(lines):
            return None
        
        line = lines[idx]
        
        # Extract variable
        match = re.match(r"'(.+?)' is possibly 'undefined'", error.message)
        if not match:
            return None
        
        varname = match.group(1)
        
        # Add ! after variable
        patterns = [
            (rf'(\b{re.escape(varname)}\b)(\s*[\.\[])', rf'\1!\2'),
            (rf'(\b{re.escape(varname)}\b)(?!\s*[!\.\[])', rf'\1!')
        ]
        
        new_line = line
        for pattern, repl in patterns:
            new_line = re.sub(pattern, repl, new_line, count=1)
            if new_line != line:
                break
        
        if new_line != line:
            lines[idx] = new_line
            return FixResult(
                success=True,
                file_path=error.file_path,
                line=error.line,
                code=error.code,
                action=f"Added ! to {varname}",
                original_line=line.rstrip('\n'),
                fixed_line=new_line.rstrip('\n')
            )
        
        return None
    
    def _fix_ts7053_index(self, error: TSError, lines: List[str], scope: Scope) -> Optional[FixResult]:
        """Fix TS7053 - Element implicitly has any type."""
        if scope == Scope.NO_ANY:
            return FixResult(
                success=False,
                file_path=error.file_path,
                line=error.line,
                code=error.code,
                action="Skipped - NO_ANY scope",
                reason="Cannot add 'as any' in NO_ANY scope"
            )
        
        idx = error.line - 1
        if idx >= len(lines):
            return None
        
        line = lines[idx]
        
        # Find obj[key] pattern
        match = re.search(r'(\w+)\[', line)
        if match:
            objname = match.group(1)
            new_line = re.sub(rf'\b{re.escape(objname)}\[', f'({objname} as any)[', line, count=1)
            
            if new_line != line:
                lines[idx] = new_line
                return FixResult(
                    success=True,
                    file_path=error.file_path,
                    line=error.line,
                    code=error.code,
                    action=f"Added (obj as any)[key] for {objname}",
                    original_line=line.rstrip('\n'),
                    fixed_line=new_line.rstrip('\n')
                )
        
        return None
    
    def _fix_ts2578_unused(self, error: TSError, lines: List[str], scope: Scope) -> Optional[FixResult]:
        """Fix TS2578 - Unused variable."""
        idx = error.line - 1
        if idx >= len(lines):
            return None
        
        line = lines[idx]
        
        # Extract variable
        match = re.match(r"'(\w+)' is declared but", error.message)
        if not match:
            return None
        
        varname = match.group(1)
        
        if varname.startswith('_'):
            return None
        
        new_line = line.replace(varname, f'_{varname}', 1)
        
        if new_line != line:
            lines[idx] = new_line
            return FixResult(
                success=True,
                file_path=error.file_path,
                line=error.line,
                code=error.code,
                action=f"Renamed {varname} to _{varname}",
                original_line=line.rstrip('\n'),
                fixed_line=new_line.rstrip('\n')
            )
        
        return None
    
    def _fix_ts1308_async(self, error: TSError, lines: List[str], scope: Scope) -> Optional[FixResult]:
        """Fix TS1308 - Await in non-async function."""
        idx = error.line - 1
        
        # Find containing function
        for i in range(idx, max(-1, idx - 30), -1):
            if i < 0 or i >= len(lines):
                continue
            
            line = lines[i]
            
            # Function declaration
            if 'function ' in line and 'async' not in line:
                new_line = line.replace('function ', 'async function ', 1)
                lines[i] = new_line
                return FixResult(
                    success=True,
                    file_path=error.file_path,
                    line=i + 1,
                    code=error.code,
                    action="Added async to function",
                    original_line=line.rstrip('\n'),
                    fixed_line=new_line.rstrip('\n')
                )
            
            # Arrow function
            elif '=>' in line and 'async' not in line:
                match = re.search(r'(const|let|var)\s+(\w+)\s*=\s*\(', line)
                if match:
                    new_line = line.replace(f'{match.group(1)} {match.group(2)} = (',
                                          f'{match.group(1)} {match.group(2)} = async (', 1)
                    lines[i] = new_line
                    return FixResult(
                        success=True,
                        file_path=error.file_path,
                        line=i + 1,
                        code=error.code,
                        action="Added async to arrow function",
                        original_line=line.rstrip('\n'),
                        fixed_line=new_line.rstrip('\n')
                    )
        
        return None
    
    def _fix_ts2564_init(self, error: TSError, lines: List[str], scope: Scope) -> Optional[FixResult]:
        """Fix TS2564 - Property not initialized."""
        idx = error.line - 1
        if idx >= len(lines):
            return None
        
        line = lines[idx]
        
        # Extract property
        match = re.match(r"Property '(\w+)' has no initializer", error.message)
        if not match:
            return None
        
        prop = match.group(1)
        
        # Add !
        new_line = re.sub(rf'(\b{re.escape(prop)})(\s*:)', rf'\1!\2', line, count=1)
        
        if new_line != line:
            lines[idx] = new_line
            return FixResult(
                success=True,
                file_path=error.file_path,
                line=error.line,
                code=error.code,
                action=f"Added ! to {prop}",
                original_line=line.rstrip('\n'),
                fixed_line=new_line.rstrip('\n')
            )
        
        return None
    
    def _fix_ts2339_property(self, error: TSError, lines: List[str], scope: Scope) -> Optional[FixResult]:
        """Fix TS2339 - Property does not exist."""
        if scope == Scope.NO_ANY:
            return FixResult(
                success=False,
                file_path=error.file_path,
                line=error.line,
                code=error.code,
                action="Skipped - NO_ANY scope",
                reason="Cannot add 'as any' in NO_ANY scope"
            )
        
        idx = error.line - 1
        if idx >= len(lines):
            return None
        
        line = lines[idx]
        
        # Extract property
        match = re.match(r"Property '(\w+)' does not exist", error.message)
        if not match:
            return None
        
        prop = match.group(1)
        
        # Add (obj as any).prop
        patterns = [
            (rf'(\w+)\.{re.escape(prop)}', rf'(\1 as any).{prop}'),
            (rf'(\w+)\?\.{re.escape(prop)}', rf'(\1 as any)?.{prop}'),
        ]
        
        new_line = line
        for pattern, repl in patterns:
            new_line = re.sub(pattern, repl, new_line, count=1)
            if new_line != line:
                break
        
        if new_line != line:
            lines[idx] = new_line
            return FixResult(
                success=True,
                file_path=error.file_path,
                line=error.line,
                code=error.code,
                action=f"Added (obj as any).{prop}",
                original_line=line.rstrip('\n'),
                fixed_line=new_line.rstrip('\n')
            )
        
        return None
    
    def _fix_ts2322_type(self, error: TSError, lines: List[str], scope: Scope) -> Optional[FixResult]:
        """Fix TS2322 - Type mismatch."""
        if scope == Scope.NO_ANY:
            return FixResult(
                success=False,
                file_path=error.file_path,
                line=error.line,
                code=error.code,
                action="Skipped - NO_ANY scope",
                reason="Cannot add 'as any' in NO_ANY scope"
            )
        
        idx = error.line - 1
        if idx >= len(lines):
            return None
        
        line = lines[idx]
        
        # Add as any to assignment
        if '=' in line and 'as any' not in line:
            parts = line.split('=', 1)
            if len(parts) == 2:
                value = parts[1].rstrip().rstrip(';').rstrip(',')
                if value.strip():
                    new_line = parts[0] + '= ' + value + ' as any;'
                    lines[idx] = new_line
                    return FixResult(
                        success=True,
                        file_path=error.file_path,
                        line=error.line,
                        code=error.code,
                        action="Added 'as any' to assignment",
                        original_line=line.rstrip('\n'),
                        fixed_line=new_line.rstrip('\n')
                    )
        
        return None
    
    def _fix_ts2345_argument(self, error: TSError, lines: List[str], scope: Scope) -> Optional[FixResult]:
        """Fix TS2345 - Argument type mismatch."""
        if scope == Scope.NO_ANY:
            return FixResult(
                success=False,
                file_path=error.file_path,
                line=error.line,
                code=error.code,
                action="Skipped - NO_ANY scope",
                reason="Cannot add 'as any' in NO_ANY scope"
            )
        
        idx = error.line - 1
        if idx >= len(lines):
            return None
        
        line = lines[idx]
        
        # Simple heuristic: add as any to first argument
        if 'as any' not in line and '(' in line:
            new_line = re.sub(r'\((\w+)', r'(\1 as any', line, count=1)
            
            if new_line != line:
                lines[idx] = new_line
                return FixResult(
                    success=True,
                    file_path=error.file_path,
                    line=error.line,
                    code=error.code,
                    action="Added 'as any' to argument",
                    original_line=line.rstrip('\n'),
                    fixed_line=new_line.rstrip('\n')
                )
        
        return None
    
    def _fix_ts2305_export(self, error: TSError, lines: List[str], scope: Scope) -> Optional[FixResult]:
        """Fix TS2305 - No exported member."""
        idx = error.line - 1
        if idx >= len(lines):
            return None
        
        line = lines[idx]
        
        # Extract member
        match = re.match(r"Module '.+' has no exported member '(\w+)'", error.message)
        if not match:
            return None
        
        member = match.group(1)
        
        # Remove from import
        new_line = re.sub(rf',\s*{re.escape(member)}', '', line)
        if new_line == line:
            new_line = re.sub(rf'{re.escape(member)}\s*,\s*', '', line)
        if new_line == line:
            new_line = f'// {line}'
        
        if new_line != line:
            lines[idx] = new_line
            return FixResult(
                success=True,
                file_path=error.file_path,
                line=error.line,
                code=error.code,
                action=f"Removed non-existent import: {member}",
                original_line=line.rstrip('\n'),
                fixed_line=new_line.rstrip('\n')
            )
        
        return None
    
    # ==========================================================================
    # G-STUDIO CORE FIXES
    # ==========================================================================
    
    def _apply_g_studio_core_fixes(self) -> int:
        """Apply G-Studio architectural fixes."""
        fixed = 0
        
        # 1. FileData import unification
        if self._fix_filedata_imports():
            fixed += 1
        
        # 2. AIConfig consolidation
        if self._fix_aiconfig_conflicts():
            fixed += 1
        
        # 3. ProjectStore files type
        if self._fix_projectstore_files():
            fixed += 1
        
        # 4. Gemini API casting
        if self._fix_gemini_api():
            fixed += 1
        
        # 5. ToolCall args → arguments
        if self._fix_toolcall_args():
            fixed += 1
        
        # 6. JSX @ts-expect-error
        if self._fix_jsx_comments():
            fixed += 1
        
        return fixed
    
    def _fix_filedata_imports(self) -> bool:
        """Unify FileData imports to single source."""
        target_import = "import type { FileData } from '@/types/types';"
        files_to_fix = ['App.tsx', 'EditorLayout.tsx']
        
        fixed = False
        for filename in files_to_fix:
            file_path = self._find_file(filename)
            if not file_path:
                continue
            
            content = FileSystem.safe_read(file_path)
            if not content:
                continue
            
            # Replace all FileData imports
            new_content = re.sub(
                r'import\s+(?:type\s+)?\{\s*FileData\s*\}\s+from\s+[\'"][^\'"]+[\'"];?',
                target_import,
                content
            )
            
            if new_content != content:
                if not self.config.dry_run:
                    FileSystem.safe_write(file_path, new_content)
                Logger.success(f"Unified FileData import in {filename}")
                fixed = True
        
        return fixed
    
    def _fix_aiconfig_conflicts(self) -> bool:
        """Consolidate AIConfig to single source."""
        # Remove local AIConfig definition
        local_types = self._find_file('AISettingsHub/types.ts')
        if local_types and local_types.exists():
            content = FileSystem.safe_read(local_types)
            if 'interface AIConfig' in content or 'type AIConfig' in content:
                # Comment out local definition
                new_content = re.sub(
                    r'(export\s+(?:interface|type)\s+AIConfig[^}]*\})',
                    r'// \1',
                    content,
                    flags=re.DOTALL
                )
                
                if new_content != content and not self.config.dry_run:
                    FileSystem.safe_write(local_types, new_content)
                    Logger.success("Commented out duplicate AIConfig")
                    return True
        
        return False
    
    def _fix_projectstore_files(self) -> bool:
        """Fix ProjectStore files type from Array to Map."""
        file_path = self._find_file('projectStore.ts')
        if not file_path:
            return False
        
        content = FileSystem.safe_read(file_path)
        if not content:
            return False
        
        # Fix interface
        new_content = re.sub(
            r'files:\s*ProjectFile\[\]',
            'files: Map<string, FileData>',
            content
        )
        
        # Fix initializer
        new_content = re.sub(
            r'files:\s*\[\]\s*as\s*any',
            'files: new Map<string, FileData>()',
            new_content
        )
        
        if new_content != content:
            if not self.config.dry_run:
                FileSystem.safe_write(file_path, new_content)
            Logger.success("Fixed ProjectStore files type")
            return True
        
        return False
    
    def _fix_gemini_api(self) -> bool:
        """Fix Gemini API type casting."""
        file_path = self._find_file('geminiService.ts')
        if not file_path:
            return False
        
        content = FileSystem.safe_read(file_path)
        if not content:
            return False
        
        # Change GenerateContentResult to any
        new_content = re.sub(
            r'as\s+GenerateContentResult',
            'as any',
            content
        )
        
        if new_content != content:
            if not self.config.dry_run:
                FileSystem.safe_write(file_path, new_content)
            Logger.success("Fixed Gemini API casting")
            return True
        
        return False
    
    def _fix_toolcall_args(self) -> bool:
        """Fix ToolCall args → arguments."""
        file_path = self._find_file('geminiService.ts')
        if not file_path:
            return False
        
        content = FileSystem.safe_read(file_path)
        if not content:
            return False
        
        # Fix: { id, name, args } → { id, name, arguments: args }
        new_content = re.sub(
            r'\{\s*id,\s*name,\s*args\s*\}',
            '{ id, name, arguments: args }',
            content
        )
        
        if new_content != content:
            if not self.config.dry_run:
                FileSystem.safe_write(file_path, new_content)
            Logger.success("Fixed ToolCall args → arguments")
            return True
        
        return False
    
    def _fix_jsx_comments(self) -> bool:
        """Fix JSX @ts-expect-error comments."""
        file_path = self._find_file('MainLayout.tsx')
        if not file_path:
            return False
        
        content = FileSystem.safe_read(file_path)
        if not content:
            return False
        
        # Remove malformed // @ts-expect-error from JSX
        lines = content.split('\n')
        new_lines = []
        
        for line in lines:
            # If line contains JSX and // @ts-expect-error
            if '<' in line and '>' in line and '// @ts-expect-error' in line:
                # Remove the comment
                line = line.replace('// @ts-expect-error', '')
            new_lines.append(line)
        
        new_content = '\n'.join(new_lines)
        
        if new_content != content:
            if not self.config.dry_run:
                FileSystem.safe_write(file_path, new_content)
            Logger.success("Fixed JSX @ts-expect-error comments")
            return True
        
        return False
    
    # ==========================================================================
    # HELPER METHODS
    # ==========================================================================
    
    def _find_file(self, filename: str) -> Optional[Path]:
        """Find a file in the project."""
        for root, dirs, files in os.walk(self.config.project_root):
            # Skip excluded dirs
            dirs[:] = [d for d in dirs if d not in ['node_modules', '.git', 'dist', 'build']]
            
            if filename in files:
                return Path(root) / filename
            
            # Also check if filename is a relative path
            if '/' in filename:
                full_path = self.config.project_root / filename
                if full_path.exists():
                    return full_path
        
        return None
    
    def _check_git_branch(self) -> bool:
        """Check if on a git branch."""
        try:
            result = subprocess.run(
                ['git', 'branch', '--show-current'],
                cwd=self.config.project_root,
                capture_output=True,
                text=True
            )
            return result.returncode == 0 and result.stdout.strip()
        except:
            return False
    
    def _create_backup(self, file_path: Path):
        """Create timestamped backup."""
        self.config.backup_dir.mkdir(exist_ok=True)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f"{file_path.name}.backup_{timestamp}"
        backup_path = self.config.backup_dir / backup_name
        
        try:
            shutil.copy2(file_path, backup_path)
            Logger.debug(f"Backup created: {backup_path}")
        except Exception as e:
            Logger.warning(f"Could not create backup: {e}")
    
    def _read_file_lines(self, file_path: Path) -> List[str]:
        """Read file as lines."""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.readlines()
        except UnicodeDecodeError:
            with open(file_path, 'r', encoding='latin-1') as f:
                return f.readlines()
        except:
            return []
    
    def _write_file_lines(self, file_path: Path, lines: List[str]):
        """Write lines to file."""
        try:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.writelines(lines)
        except Exception as e:
            Logger.error(f"Error writing {file_path}: {e}")
    
    def _save_checkpoint(self):
        """Save progress checkpoint."""
        checkpoint = {
            'iteration': self.iteration,
            'stats': {
                'total_errors': self.stats.total_errors,
                'fixed': self.stats.fixed,
            },
            'timestamp': datetime.now().isoformat()
        }
        
        try:
            with open(self.config.checkpoint_file, 'w') as f:
                json.dump(checkpoint, f, indent=2)
        except:
            pass
    
    def _generate_report(self):
        """Generate final report."""
        Logger.header("FINAL REPORT")
        
        # Run tsc one more time
        final_errors = self._run_tsc()
        
        # Console summary
        Logger.info(f"Total errors processed: {self.stats.total_errors}")
        Logger.info(f"Fixed: {self.stats.fixed}")
        Logger.info(f"Remaining: {len(final_errors)}")
        
        if len(final_errors) > 0:
            Logger.info("\nRemaining errors by type:")
            error_dist = Counter(e.code for e in final_errors)
            for code, count in error_dist.most_common():
                permission = self.config.ERROR_PERMISSIONS.get(code, "unknown")
                Logger.info(f"  {code}: {count} ({permission.name if hasattr(permission, 'name') else permission})")
        
        Logger.info("\nFixes by category:")
        for cat, count in self.stats.by_category.items():
            Logger.info(f"  {cat}: {count}")
        
        Logger.info("\nFixes by scope:")
        for scope, count in self.stats.by_scope.items():
            Logger.info(f"  {scope}: {count}")
        
        if self.stats.skipped:
            Logger.info("\nSkipped fixes:")
            for reason, count in self.stats.skipped.items():
                Logger.info(f"  {reason}: {count}")
        
        # JSON report
        self.config.report_dir.mkdir(exist_ok=True)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        json_file = self.config.report_dir / f'autofixer_report_{timestamp}.json'
        
        report_data = {
            'timestamp': datetime.now().isoformat(),
            'project': str(self.config.project_root),
            'summary': {
                'total_errors': self.stats.total_errors,
                'fixed': self.stats.fixed,
                'remaining': len(final_errors),
            },
            'fixes_by_category': self.stats.by_category,
            'fixes_by_scope': self.stats.by_scope,
            'fixes_by_code': self.stats.by_code,
            'skipped': dict(self.stats.skipped),
            'fix_details': [asdict(r) for r in self.fix_results],
            'remaining_errors': [asdict(e) for e in final_errors]
        }
        
        with open(json_file, 'w') as f:
            json.dump(report_data, f, indent=2)
        
        Logger.success(f"JSON report: {json_file}")
        
        # Markdown report
        md_file = self.config.report_dir / f'autofixer_report_{timestamp}.md'
        with open(md_file, 'w') as f:
            f.write(f"# TypeScript Autofixer Report\n\n")
            f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write(f"## Summary\n\n")
            f.write(f"- Total errors: {self.stats.total_errors}\n")
            f.write(f"- Fixed: {self.stats.fixed}\n")
            f.write(f"- Remaining: {len(final_errors)}\n\n")
            
            if final_errors:
                f.write(f"## Remaining Errors ({len(final_errors)})\n\n")
                f.write("| File | Line | Code | Message |\n")
                f.write("|------|------|------|---------|\n")
                for err in final_errors[:50]:
                    f.write(f"| `{err.file_path}` | {err.line} | `{err.code}` | {err.message[:80]}... |\n")
        
        Logger.success(f"Markdown report: {md_file}")

# ==============================================================================
# CLI
# ==============================================================================

def main():
    import argparse
    
    parser = argparse.ArgumentParser(
        description='G-Studio TypeScript Smart Autofixer v2.0.0',
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument('--project', '-p', default='.',
                       help='Project root (default: current directory)')
    parser.add_argument('--dry-run', '-n', action='store_true',
                       help='Simulate without modifying files')
    parser.add_argument('--no-backup', action='store_true',
                       help='Skip creating backups')
    parser.add_argument('--max-iterations', '-m', type=int, default=5,
                       help='Max fixing iterations (default: 5)')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Verbose output')
    parser.add_argument('--quiet', '-q', action='store_true',
                       help='Minimal output')
    
    args = parser.parse_args()
    
    # Setup
    project_root = Path(args.project).resolve()
    if not project_root.exists():
        print(f"❌ Project not found: {project_root}")
        sys.exit(1)
    
    Logger.setup(verbose=args.verbose, quiet=args.quiet)
    
    config = Config(project_root)
    config.dry_run = args.dry_run
    config.create_backups = not args.no_backup
    config.max_iterations = args.max_iterations
    
    # Run
    fixer = TypeScriptSmartAutofixer(config)
    success = fixer.run()
    
    sys.exit(0 if success else 1)

if __name__ == '__main__':
    main()