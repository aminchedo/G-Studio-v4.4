#!/usr/bin/env python3
"""
TypeScript Architectural Fixer for G-Studio Projects - Windows Compatible
"""

import os
import re
import sys
import json
import uuid
import shutil
import hashlib
import argparse
import subprocess
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple, Any, Union
from dataclasses import dataclass, field
from datetime import datetime
from collections import defaultdict
from enum import Enum
import traceback
import platform

# ============================================================================
# DATA MODELS
# ============================================================================

class Scope(Enum):
    NO_ANY = "NO_ANY"
    LIMITED_ANY = "LIMITED_ANY"
    OTHER = "OTHER"


class FixPermission(Enum):
    ALWAYS = "ALWAYS"
    LIMITED = "LIMITED"
    NEVER = "NEVER"


class FixCategory(Enum):
    SYNTAX = "SYNTAX"
    IMPORT = "IMPORT"
    TYPE_IDENTITY = "TYPE_IDENTITY"
    ANY_CAST = "ANY_CAST"
    G_STUDIO_CORE = "G_STUDIO_CORE"


@dataclass
class TypeScriptError:
    file: str
    line: int
    column: int
    code: str
    message: str
    full_text: str
    category: Optional[FixCategory] = None
    permission: Optional[FixPermission] = None
    
    def __post_init__(self):
        CATEGORY_MAP = {
            'TS1308': FixCategory.SYNTAX,
            'TS2305': FixCategory.IMPORT,
            'TS2551': FixCategory.IMPORT,
            'TS18048': FixCategory.TYPE_IDENTITY,
            'TS7053': FixCategory.TYPE_IDENTITY,
            'TS2578': FixCategory.TYPE_IDENTITY,
            'TS2564': FixCategory.TYPE_IDENTITY,
            'TS2339': FixCategory.ANY_CAST,
            'TS2322': FixCategory.ANY_CAST,
            'TS2345': FixCategory.ANY_CAST,
        }
        self.category = CATEGORY_MAP.get(self.code, FixCategory.G_STUDIO_CORE)
        
        PERMISSION_MAP = {
            'TS2551': FixPermission.ALWAYS,
            'TS18048': FixPermission.ALWAYS,
            'TS7053': FixPermission.ALWAYS,
            'TS2578': FixPermission.ALWAYS,
            'TS1308': FixPermission.ALWAYS,
            'TS2564': FixPermission.ALWAYS,
            'TS2305': FixPermission.ALWAYS,
            'TS2339': FixPermission.LIMITED,
            'TS2322': FixPermission.LIMITED,
            'TS2345': FixPermission.LIMITED,
            'TS2769': FixPermission.NEVER,
            'TS2693': FixPermission.NEVER,
            'TS1362': FixPermission.NEVER,
        }
        self.permission = PERMISSION_MAP.get(self.code, FixPermission.LIMITED)


@dataclass
class FixResult:
    success: bool
    file_path: str
    line: int
    code: str
    action: str
    category: FixCategory
    permission: FixPermission
    scope: Scope
    original_line: Optional[str] = None
    fixed_line: Optional[str] = None
    error_message: str = ""
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class FixStats:
    total_errors: int = 0
    fixed: int = 0
    skipped_scope: int = 0
    skipped_permission: int = 0
    skipped_other: int = 0
    by_category: Dict[FixCategory, int] = field(default_factory=lambda: defaultdict(int))
    by_scope: Dict[Scope, int] = field(default_factory=lambda: defaultdict(int))
    by_permission: Dict[FixPermission, int] = field(default_factory=lambda: defaultdict(int))
    files_modified: Set[str] = field(default_factory=set)


# ============================================================================
# UTILITIES
# ============================================================================

class ColoredLogger:
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    RED = '\033[91m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    END = '\033[0m'
    
    @classmethod
    def info(cls, message: str):
        print(f"{cls.BLUE}[INFO]{cls.END} {message}")
    
    @classmethod
    def success(cls, message: str):
        print(f"{cls.GREEN}[SUCCESS]{cls.END} {message}")
    
    @classmethod
    def warning(cls, message: str):
        print(f"{cls.YELLOW}[WARNING]{cls.END} {message}")
    
    @classmethod
    def error(cls, message: str):
        print(f"{cls.RED}[ERROR]{cls.END} {message}")
    
    @classmethod
    def header(cls, message: str):
        print(f"\n{cls.BOLD}{cls.MAGENTA}{'='*60}{cls.END}")
        print(f"{cls.BOLD}{cls.MAGENTA}{message.center(60)}{cls.END}")
        print(f"{cls.BOLD}{cls.MAGENTA}{'='*60}{cls.END}")


class TypeScriptCompiler:
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.is_windows = platform.system() == "Windows"
        
    def run(self) -> Tuple[List[TypeScriptError], str]:
        """Run tsc and parse errors with Windows compatibility."""
        try:
            # First try to find tsc in node_modules/.bin
            tsc_paths = [
                self.project_root / "node_modules" / ".bin" / "tsc",
                self.project_root / "node_modules" / ".bin" / "tsc.cmd",
                self.project_root / "node_modules" / ".bin" / "tsc.ps1",
            ]
            
            tsc_cmd = None
            for path in tsc_paths:
                if path.exists():
                    tsc_cmd = [str(path)]
                    break
            
            # If not found, try npx
            if not tsc_cmd:
                if self.is_windows:
                    tsc_cmd = ["npx.cmd", "tsc"]
                else:
                    tsc_cmd = ["npx", "tsc"]
            
            # Add arguments
            tsc_cmd.extend(["--noEmit", "--pretty", "false", "--skipLibCheck"])
            
            ColoredLogger.info(f"Running: {' '.join(tsc_cmd)}")
            
            result = subprocess.run(
                tsc_cmd,
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=60,
                shell=self.is_windows
            )
            
            output = result.stdout + result.stderr
            errors = self._parse_errors(output)
            
            return errors, output
            
        except subprocess.TimeoutExpired:
            ColoredLogger.error("tsc command timed out")
            return [], ""
        except FileNotFoundError:
            ColoredLogger.error("tsc or npx not found. Make sure TypeScript is installed.")
            ColoredLogger.info("Try: npm install -g typescript")
            return [], ""
        except Exception as e:
            ColoredLogger.error(f"Error running tsc: {e}")
            return [], ""
    
    def _parse_errors(self, output: str) -> List[TypeScriptError]:
        errors = []
        error_pattern = r'([^(]+)\((\d+),(\d+)\):\s+error\s+([^:]+):\s+(.+)'
        
        for line in output.split('\n'):
            if 'error TS' in line:
                match = re.match(error_pattern, line.strip())
                if match:
                    errors.append(TypeScriptError(
                        file=match.group(1).strip(),
                        line=int(match.group(2)),
                        column=int(match.group(3)),
                        code=match.group(4).strip(),
                        message=match.group(5).strip(),
                        full_text=line.strip()
                    ))
        
        return errors


class FileManager:
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.backup_dir = project_root / ".ts_fixer_backups"
        self.backup_dir.mkdir(exist_ok=True)
    
    def read_file(self, file_path: str) -> Tuple[Optional[List[str]], Optional[str]]:
        """Read a file and return (lines, original_content)."""
        full_path = self.project_root / file_path
        try:
            with open(full_path, 'r', encoding='utf-8') as f:
                content = f.read()
            return content.splitlines(keepends=True), content
        except Exception as e:
            ColoredLogger.error(f"Failed to read {file_path}: {e}")
            return None, None
    
    def write_file(self, file_path: str, lines: List[str], create_backup: bool = True) -> bool:
        """Write lines to a file with optional backup."""
        full_path = self.project_root / file_path
        try:
            if create_backup:
                self._create_backup(full_path)
            
            with open(full_path, 'w', encoding='utf-8') as f:
                f.writelines(lines)
            return True
        except Exception as e:
            ColoredLogger.error(f"Failed to write {file_path}: {e}")
            return False
    
    def _create_backup(self, file_path: Path):
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        backup_name = f"{file_path.name}.{timestamp}.bak"
        backup_path = self.backup_dir / backup_name
        shutil.copy2(file_path, backup_path)
    
    def get_scope(self, file_path: str) -> Scope:
        """Determine scope based on file path."""
        path_lower = file_path.lower()
        
        if any(x in path_lower for x in ['/src/components/', '/components/']):
            return Scope.NO_ANY
        if any(x in path_lower for x in ['/src/core/', '/core/']):
            return Scope.NO_ANY
        if any(x in path_lower for x in ['/src/store/', '/store/', '/src/stores/', '/stores/']):
            return Scope.NO_ANY
        
        if any(x in path_lower for x in ['/src/services/', '/services/']):
            return Scope.LIMITED_ANY
        if any(x in path_lower for x in ['/src/api/', '/api/']):
            return Scope.LIMITED_ANY
        if any(x in path_lower for x in ['/src/adapters/', '/adapters/']):
            return Scope.LIMITED_ANY
        if any(x in path_lower for x in ['/src/integrations/', '/integrations/']):
            return Scope.LIMITED_ANY
        
        return Scope.OTHER


# ============================================================================
# FIX FUNCTIONS
# ============================================================================

class Fixer:
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.file_manager = FileManager(project_root)
    
    def apply_fix(self, error: TypeScriptError) -> Optional[FixResult]:
        """Apply appropriate fix based on error type and scope."""
        scope = self.file_manager.get_scope(error.file)
        
        # Check permission vs scope
        if error.permission == FixPermission.NEVER:
            return FixResult(
                success=False,
                file_path=error.file,
                line=error.line,
                code=error.code,
                action="Skipped - NEVER auto-fix",
                category=error.category,
                permission=error.permission,
                scope=scope,
                error_message=f"{error.code} is marked as NEVER auto-fix"
            )
        
        if error.permission == FixPermission.LIMITED and scope == Scope.NO_ANY:
            return FixResult(
                success=False,
                file_path=error.file,
                line=error.line,
                code=error.code,
                action="Skipped - not in LIMITED_ANY scope",
                category=error.category,
                permission=error.permission,
                scope=scope,
                error_message=f"{error.code} only allowed in LIMITED_ANY scope"
            )
        
        # Read file
        lines, original_content = self.file_manager.read_file(error.file)
        if not lines:
            return None
        
        # Apply fix based on error code
        fix_function = getattr(self, f"_fix_{error.code.lower()}", None)
        if not fix_function:
            return None
        
        result = fix_function(error, lines, scope, original_content)
        if result and result.success:
            # Write file
            self.file_manager.write_file(error.file, lines)
        
        return result
    
    def _fix_ts2551(self, error: TypeScriptError, lines: List[str], scope: Scope, original_content: str) -> Optional[FixResult]:
        """Fix typo suggestions."""
        match = re.match(r"Property '(\w+)' does not exist on type '.+?'\. Did you mean '(\w+)'\?", error.message)
        if not match:
            return None
        
        wrong = match.group(1)
        right = match.group(2)
        line_num = error.line - 1
        
        if line_num >= len(lines):
            return None
        
        line = lines[line_num]
        new_line = line
        
        # Try different patterns
        patterns = [
            (rf'\.{re.escape(wrong)}\b', f'.{right}'),
            (rf'\?\.{re.escape(wrong)}\b', f'?.{right}'),
            (rf'!\.{re.escape(wrong)}\b', f'!.{right}'),
        ]
        
        for pattern, replacement in patterns:
            new_line = re.sub(pattern, replacement, line)
            if new_line != line:
                break
        
        if new_line != line:
            lines[line_num] = new_line
            return FixResult(
                success=True,
                file_path=error.file,
                line=error.line,
                code=error.code,
                action=f"Fixed typo: {wrong} → {right}",
                category=error.category,
                permission=error.permission,
                scope=scope,
                original_line=line.rstrip('\n'),
                fixed_line=new_line.rstrip('\n')
            )
        
        return None
    
    def _fix_ts18048(self, error: TypeScriptError, lines: List[str], scope: Scope, original_content: str) -> Optional[FixResult]:
        """Fix possibly undefined with non-null assertion."""
        match = re.match(r"'(.+?)' is possibly 'undefined'", error.message)
        if not match:
            return None
        
        varname = match.group(1)
        line_num = error.line - 1
        
        if line_num >= len(lines):
            return None
        
        line = lines[line_num]
        
        # Add ! after variable
        new_line = re.sub(rf'(\b{re.escape(varname)}\b)([^\w])', r'\1!\2', line)
        
        if new_line != line:
            lines[line_num] = new_line
            return FixResult(
                success=True,
                file_path=error.file,
                line=error.line,
                code=error.code,
                action=f"Added non-null assertion to {varname}",
                category=error.category,
                permission=error.permission,
                scope=scope,
                original_line=line.rstrip('\n'),
                fixed_line=new_line.rstrip('\n')
            )
        
        return None
    
    def _fix_ts7053(self, error: TypeScriptError, lines: List[str], scope: Scope, original_content: str) -> Optional[FixResult]:
        """Fix element implicitly has any type."""
        if scope == Scope.NO_ANY:
            return FixResult(
                success=False,
                file_path=error.file,
                line=error.line,
                code=error.code,
                action="Skipped - NO_ANY scope",
                category=error.category,
                permission=error.permission,
                scope=scope,
                error_message="Cannot add 'any' cast in NO_ANY scope"
            )
        
        line_num = error.line - 1
        if line_num >= len(lines):
            return None
        
        line = lines[line_num]
        
        # Add (obj as any)[key] pattern
        new_line = re.sub(r'(\w+)\[([^\]]+)\]', r'(\1 as any)[\2]', line)
        
        if new_line != line:
            lines[line_num] = new_line
            return FixResult(
                success=True,
                file_path=error.file,
                line=error.line,
                code=error.code,
                action="Added (obj as any)[key] cast",
                category=error.category,
                permission=error.permission,
                scope=scope,
                original_line=line.rstrip('\n'),
                fixed_line=new_line.rstrip('\n')
            )
        
        return None
    
    def _fix_ts2578(self, error: TypeScriptError, lines: List[str], scope: Scope, original_content: str) -> Optional[FixResult]:
        """Fix unused variable by prefixing with _."""
        match = re.match(r"'(\w+)' is declared but its value is never read", error.message)
        if not match:
            return None
        
        varname = match.group(1)
        line_num = error.line - 1
        
        if line_num >= len(lines):
            return None
        
        line = lines[line_num]
        
        # Skip if already starts with _
        if varname.startswith('_'):
            return None
        
        new_line = re.sub(rf'\b{re.escape(varname)}\b', f'_{varname}', line)
        
        if new_line != line:
            lines[line_num] = new_line
            return FixResult(
                success=True,
                file_path=error.file,
                line=error.line,
                code=error.code,
                action=f"Renamed unused variable to _{varname}",
                category=error.category,
                permission=error.permission,
                scope=scope,
                original_line=line.rstrip('\n'),
                fixed_line=new_line.rstrip('\n')
            )
        
        return None
    
    def _fix_ts1308(self, error: TypeScriptError, lines: List[str], scope: Scope, original_content: str) -> Optional[FixResult]:
        """Fix await in non-async function."""
        line_num = error.line - 1
        
        # Search backward for function declaration
        for i in range(line_num, max(-1, line_num - 10), -1):
            if i < 0 or i >= len(lines):
                continue
            
            line = lines[i]
            
            # Function declaration
            if 'function ' in line and 'async' not in line:
                new_line = line.replace('function ', 'async function ', 1)
                lines[i] = new_line
                return FixResult(
                    success=True,
                    file_path=error.file,
                    line=i + 1,
                    code=error.code,
                    action="Added async to function",
                    category=error.category,
                    permission=error.permission,
                    scope=scope,
                    original_line=line.rstrip('\n'),
                    fixed_line=new_line.rstrip('\n')
                )
        
        return None
    
    def _fix_ts2339(self, error: TypeScriptError, lines: List[str], scope: Scope, original_content: str) -> Optional[FixResult]:
        """Fix property does not exist on type."""
        if scope == Scope.NO_ANY:
            return FixResult(
                success=False,
                file_path=error.file,
                line=error.line,
                code=error.code,
                action="Skipped - NO_ANY scope",
                category=error.category,
                permission=error.permission,
                scope=scope,
                error_message="Cannot add 'any' cast in NO_ANY scope"
            )
        
        match = re.match(r"Property '(\w+)' does not exist on type '(.+)'", error.message)
        if not match:
            return None
        
        prop = match.group(1)
        line_num = error.line - 1
        
        if line_num >= len(lines):
            return None
        
        line = lines[line_num]
        
        # Add (obj as any).prop
        new_line = re.sub(rf'(\b\w+)\.{re.escape(prop)}\b', r'(\1 as any).\2', line)
        
        if new_line != line:
            lines[line_num] = new_line
            return FixResult(
                success=True,
                file_path=error.file,
                line=error.line,
                code=error.code,
                action=f"Added (obj as any).{prop} cast",
                category=error.category,
                permission=error.permission,
                scope=scope,
                original_line=line.rstrip('\n'),
                fixed_line=new_line.rstrip('\n')
            )
        
        return None
    
    def _fix_ts2322(self, error: TypeScriptError, lines: List[str], scope: Scope, original_content: str) -> Optional[FixResult]:
        """Fix type mismatch."""
        if scope == Scope.NO_ANY:
            return FixResult(
                success=False,
                file_path=error.file,
                line=error.line,
                code=error.code,
                action="Skipped - NO_ANY scope",
                category=error.category,
                permission=error.permission,
                scope=scope,
                error_message="Cannot add 'any' cast in NO_ANY scope"
            )
        
        line_num = error.line - 1
        if line_num >= len(lines):
            return None
        
        line = lines[line_num]
        
        # Simple fix: add as any
        if '=' in line and 'as any' not in line:
            new_line = line.rstrip()
            if new_line.endswith(';'):
                new_line = new_line[:-1] + ' as any;'
            elif new_line.endswith(','):
                new_line = new_line[:-1] + ' as any,'
            else:
                new_line = new_line + ' as any'
            
            lines[line_num] = new_line + '\n'
            return FixResult(
                success=True,
                file_path=error.file,
                line=error.line,
                code=error.code,
                action="Added 'as any' cast",
                category=error.category,
                permission=error.permission,
                scope=scope,
                original_line=line.rstrip('\n'),
                fixed_line=new_line
            )
        
        return None
    
    def _fix_ts2345(self, error: TypeScriptError, lines: List[str], scope: Scope, original_content: str) -> Optional[FixResult]:
        """Fix argument type mismatch."""
        if scope == Scope.NO_ANY:
            return FixResult(
                success=False,
                file_path=error.file,
                line=error.line,
                code=error.code,
                action="Skipped - NO_ANY scope",
                category=error.category,
                permission=error.permission,
                scope=scope,
                error_message="Cannot add 'any' cast in NO_ANY scope"
            )
        
        line_num = error.line - 1
        if line_num >= len(lines):
            return None
        
        line = lines[line_num]
        
        # Find function call and add as any to last argument
        if '(' in line and ')' in line:
            parts = line.split('(')
            if len(parts) >= 2:
                before_paren = parts[0]
                after_paren = '('.join(parts[1:])
                
                if ',' in after_paren:
                    # Multiple arguments
                    args = after_paren.split(',')
                    last_arg = args[-1]
                    if ')' in last_arg:
                        last_arg = last_arg.replace(')', ' as any)')
                        args[-1] = last_arg
                        new_after = ','.join(args)
                        new_line = before_paren + '(' + new_after
                        
                        lines[line_num] = new_line
                        return FixResult(
                            success=True,
                            file_path=error.file,
                            line=error.line,
                            code=error.code,
                            action="Added 'as any' to argument",
                            category=error.category,
                            permission=error.permission,
                            scope=scope,
                            original_line=line.rstrip('\n'),
                            fixed_line=new_line.rstrip('\n')
                        )
        
        return None
    
    def _fix_ts2305(self, error: TypeScriptError, lines: List[str], scope: Scope, original_content: str) -> Optional[FixResult]:
        """Fix module has no exported member."""
        match = re.match(r"Module '.*' has no exported member '(\w+)'", error.message)
        if not match:
            return None
        
        member = match.group(1)
        line_num = error.line - 1
        
        if line_num >= len(lines):
            return None
        
        line = lines[line_num]
        
        # Try to remove the import
        if f'{{ {member} }}' in line:
            new_line = line.replace(f'{{ {member} }}', '{}')
        elif f'{member},' in line:
            new_line = line.replace(f'{member},', '')
        elif f', {member}' in line:
            new_line = line.replace(f', {member}', '')
        else:
            return None
        
        if new_line != line:
            lines[line_num] = new_line
            return FixResult(
                success=True,
                file_path=error.file,
                line=error.line,
                code=error.code,
                action=f"Removed non-existent import: {member}",
                category=error.category,
                permission=error.permission,
                scope=scope,
                original_line=line.rstrip('\n'),
                fixed_line=new_line.rstrip('\n')
            )
        
        return None
    
    def _fix_ts2564(self, error: TypeScriptError, lines: List[str], scope: Scope, original_content: str) -> Optional[FixResult]:
        """Fix property not definitely assigned."""
        match = re.match(r"Property '(\w+)' has no initializer", error.message)
        if not match:
            return None
        
        prop = match.group(1)
        line_num = error.line - 1
        
        if line_num >= len(lines):
            return None
        
        line = lines[line_num]
        
        # Add definite assignment assertion
        new_line = re.sub(rf'(\b{re.escape(prop)})(\s*:)', r'\1!\2', line)
        
        if new_line != line:
            lines[line_num] = new_line
            return FixResult(
                success=True,
                file_path=error.file,
                line=error.line,
                code=error.code,
                action=f"Added definite assignment assertion to {prop}",
                category=error.category,
                permission=error.permission,
                scope=scope,
                original_line=line.rstrip('\n'),
                fixed_line=new_line.rstrip('\n')
            )
        
        return None
    
    # G-Studio specific fixes
    def _fix_gstudio_filedata(self, file_path: str) -> List[FixResult]:
        """Fix FileData type imports."""
        lines, content = self.file_manager.read_file(file_path)
        if not lines:
            return []
        
        results = []
        for i, line in enumerate(lines):
            if 'import("/' in line and 'FileData' in line:
                new_line = re.sub(r'import\([^)]+\)\.FileData', 'FileData', line)
                if new_line != line:
                    lines[i] = new_line
                    results.append(FixResult(
                        success=True,
                        file_path=file_path,
                        line=i + 1,
                        code="TS2322",
                        action="Unified FileData type import",
                        category=FixCategory.G_STUDIO_CORE,
                        permission=FixPermission.ALWAYS,
                        scope=self.file_manager.get_scope(file_path),
                        original_line=line.rstrip('\n'),
                        fixed_line=new_line.rstrip('\n')
                    ))
        
        if results:
            self.file_manager.write_file(file_path, lines)
        
        return results
    
    def _fix_gstudio_aiconfig(self, file_path: str) -> List[FixResult]:
        """Fix AIConfig type imports."""
        lines, content = self.file_manager.read_file(file_path)
        if not lines:
            return []
        
        results = []
        for i, line in enumerate(lines):
            if 'AIConfig[' in line and 'import(' in line:
                new_line = re.sub(r'import\([^)]+\)\.AIConfig\[', 'AIConfig[', line)
                if new_line != line:
                    lines[i] = new_line
                    results.append(FixResult(
                        success=True,
                        file_path=file_path,
                        line=i + 1,
                        code="TS2322",
                        action="Unified AIConfig type import",
                        category=FixCategory.G_STUDIO_CORE,
                        permission=FixPermission.ALWAYS,
                        scope=self.file_manager.get_scope(file_path),
                        original_line=line.rstrip('\n'),
                        fixed_line=new_line.rstrip('\n')
                    ))
        
        if results:
            self.file_manager.write_file(file_path, lines)
        
        return results
    
    def _fix_gstudio_jsx_comments(self, file_path: str) -> List[FixResult]:
        """Fix JSX comment syntax."""
        lines, content = self.file_manager.read_file(file_path)
        if not lines:
            return []
        
        results = []
        for i, line in enumerate(lines):
            if '// @ts-expect-error' in line and ('<' in line or '>' in line):
                new_line = line.replace('// @ts-expect-error', '{/* @ts-expect-error */}')
                if new_line != line:
                    lines[i] = new_line
                    results.append(FixResult(
                        success=True,
                        file_path=file_path,
                        line=i + 1,
                        code="TS1005",
                        action="Fixed JSX comment syntax",
                        category=FixCategory.G_STUDIO_CORE,
                        permission=FixPermission.ALWAYS,
                        scope=self.file_manager.get_scope(file_path),
                        original_line=line.rstrip('\n'),
                        fixed_line=new_line.rstrip('\n')
                    ))
        
        if results:
            self.file_manager.write_file(file_path, lines)
        
        return results


# ============================================================================
# MAIN CLASS
# ============================================================================

class TypeScriptFixer:
    def __init__(self, project_root: Path, dry_run: bool = False):
        self.project_root = project_root
        self.dry_run = dry_run
        self.tsc = TypeScriptCompiler(project_root)
        self.fixer = Fixer(project_root)
        self.stats = FixStats()
        self.results: List[FixResult] = []
        
        ColoredLogger.header("TypeScript Fixer for G-Studio")
        ColoredLogger.info(f"Project: {project_root}")
        ColoredLogger.info(f"Platform: {platform.system()}")
        if dry_run:
            ColoredLogger.warning("DRY RUN MODE - No changes will be made")
    
    def run(self) -> bool:
        """Main execution loop."""
        # First apply G-Studio specific fixes
        self._apply_gstudio_fixes()
        
        # Then fix TypeScript errors
        max_iterations = 3
        prev_error_count = float('inf')
        
        for iteration in range(max_iterations):
            ColoredLogger.header(f"Iteration {iteration + 1}")
            
            errors, output = self.tsc.run()
            error_count = len(errors)
            self.stats.total_errors = error_count
            
            ColoredLogger.info(f"Found {error_count} TypeScript errors")
            
            if error_count == 0:
                ColoredLogger.success("No errors remaining!")
                break
            
            if error_count >= prev_error_count:
                ColoredLogger.warning(f"No progress (was {prev_error_count}, now {error_count})")
                break
            
            prev_error_count = error_count
            
            # Group errors by file and sort by line (bottom-up)
            errors_by_file = defaultdict(list)
            for error in errors:
                errors_by_file[error.file].append(error)
            
            # Sort each file's errors by line descending
            for file_errors in errors_by_file.values():
                file_errors.sort(key=lambda e: -e.line)
            
            # Apply fixes
            fixed_this_iteration = 0
            for file_path, file_errors in errors_by_file.items():
                for error in file_errors:
                    if self.dry_run:
                        # Simulate fix
                        scope = self.fixer.file_manager.get_scope(error.file)
                        result = FixResult(
                            success=True,
                            file_path=error.file,
                            line=error.line,
                            code=error.code,
                            action=f"Would fix {error.code}",
                            category=error.category,
                            permission=error.permission,
                            scope=scope
                        )
                        self.results.append(result)
                        fixed_this_iteration += 1
                    else:
                        result = self.fixer.apply_fix(error)
                        if result:
                            self.results.append(result)
                            if result.success:
                                fixed_this_iteration += 1
                                self._update_stats(result)
            
            ColoredLogger.info(f"Fixed {fixed_this_iteration} errors this iteration")
            
            if fixed_this_iteration == 0:
                ColoredLogger.warning("No fixes applied this iteration")
                break
        
        self._generate_report()
        return True
    
    def _apply_gstudio_fixes(self):
        """Apply G-Studio specific architectural fixes."""
        ColoredLogger.info("Applying G-Studio architectural fixes...")
        
        # Find G-Studio core files
        gstudio_files = []
        for root, dirs, files in os.walk(self.project_root):
            for file in files:
                if file in ['App.tsx', 'EditorLayout.tsx', 'AISettingsHub.tsx', 
                           'MainLayout.tsx', 'additional.ts', 'projectStore.ts',
                           'geminiService.ts']:
                    gstudio_files.append(os.path.join(root, file))
        
        for file_path in gstudio_files:
            rel_path = os.path.relpath(file_path, self.project_root)
            
            # Apply appropriate fixes based on file
            if 'App.tsx' in file_path or 'EditorLayout.tsx' in file_path:
                results = self.fixer._fix_gstudio_filedata(rel_path)
                self.results.extend(results)
            
            if 'AISettingsHub' in file_path:
                results = self.fixer._fix_gstudio_aiconfig(rel_path)
                self.results.extend(results)
            
            if 'MainLayout' in file_path:
                results = self.fixer._fix_gstudio_jsx_comments(rel_path)
                self.results.extend(results)
        
        ColoredLogger.info(f"Applied {len([r for r in self.results if r.success])} G-Studio fixes")
    
    def _update_stats(self, result: FixResult):
        """Update statistics."""
        if result.success:
            self.stats.fixed += 1
        else:
            if result.scope == Scope.NO_ANY and result.permission == FixPermission.LIMITED:
                self.stats.skipped_scope += 1
            elif result.permission == FixPermission.NEVER:
                self.stats.skipped_permission += 1
            else:
                self.stats.skipped_other += 1
        
        self.stats.by_category[result.category] += 1
        self.stats.by_scope[result.scope] += 1
        self.stats.by_permission[result.permission] += 1
        self.stats.files_modified.add(result.file_path)
    
    def _generate_report(self):
        """Generate final report."""
        ColoredLogger.header("Final Report")
        
        # Get final error count
        final_errors, _ = self.tsc.run()
        
        # JSON report
        report_data = {
            'timestamp': datetime.now().isoformat(),
            'project': str(self.project_root),
            'summary': {
                'total_errors_processed': self.stats.total_errors,
                'fixed': self.stats.fixed,
                'skipped_scope': self.stats.skipped_scope,
                'skipped_permission': self.stats.skipped_permission,
                'skipped_other': self.stats.skipped_other,
                'remaining_errors': len(final_errors),
                'files_modified': len(self.stats.files_modified),
            },
            'by_category': {k.value: v for k, v in self.stats.by_category.items()},
            'by_scope': {k.value: v for k, v in self.stats.by_scope.items()},
            'by_permission': {k.value: v for k, v in self.stats.by_permission.items()},
            'fixes': [
                {
                    'file': r.file_path,
                    'line': r.line,
                    'code': r.code,
                    'action': r.action,
                    'success': r.success,
                    'scope': r.scope.value,
                }
                for r in self.results[:100]  # Limit to 100
            ],
            'remaining_errors': [
                {
                    'file': e.file,
                    'line': e.line,
                    'code': e.code,
                    'message': e.message,
                }
                for e in final_errors[:50]  # Limit to 50
            ]
        }
        
        report_file = self.project_root / 'ts_fixer_report.json'
        with open(report_file, 'w') as f:
            json.dump(report_data, f, indent=2)
        
        ColoredLogger.success(f"Report saved: {report_file}")
        
        # Console summary
        print("\n" + "="*60)
        print("SUMMARY".center(60))
        print("="*60)
        print(f"Total errors processed: {self.stats.total_errors}")
        print(f"Fixed: {self.stats.fixed}")
        print(f"Skipped (scope): {self.stats.skipped_scope}")
        print(f"Skipped (permission): {self.stats.skipped_permission}")
        print(f"Remaining errors: {len(final_errors)}")
        
        if final_errors:
            print("\nTop remaining errors:")
            error_counts = defaultdict(int)
            for error in final_errors:
                error_counts[error.code] += 1
            
            for code, count in sorted(error_counts.items(), key=lambda x: -x[1])[:10]:
                print(f"  {code}: {count}")
        
        # Show some successful fixes
        successful = [r for r in self.results if r.success][:10]
        if successful:
            print(f"\nSample fixes applied ({len([r for r in self.results if r.success])} total):")
            for fix in successful:
                print(f"  ✓ {fix.file_path}:{fix.line} - {fix.action}")


# ============================================================================
# COMMAND LINE INTERFACE
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description='Fix TypeScript errors in G-Studio projects',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python ts_fixer.py                     # Fix errors in current directory
  python ts_fixer.py --dry-run           # Simulate without changes
  python ts_fixer.py --project ./src     # Specify project directory
  
Scope Rules:
  NO `any` in: components/, core/, store/
  LIMITED `any` in: services/, api/, adapters/, integrations/
  
Always fix: TS2551, TS18048, TS7053, TS2578, TS1308, TS2564
Limited fix: TS2339, TS2322, TS2345 (only in services/, api/, etc.)
Never fix: TS2769, TS2693, TS1362
        """
    )
    
    parser.add_argument('--project', '-p', default='.',
                       help='Project root directory (default: current)')
    parser.add_argument('--dry-run', '-n', action='store_true',
                       help='Simulate fixes without modifying files')
    
    args = parser.parse_args()
    
    project_root = Path(args.project).resolve()
    if not project_root.exists():
        ColoredLogger.error(f"Project directory not found: {project_root}")
        sys.exit(1)
    
    try:
        fixer = TypeScriptFixer(project_root, dry_run=args.dry_run)
        success = fixer.run()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        ColoredLogger.warning("\nInterrupted by user")
        sys.exit(130)
    except Exception as e:
        ColoredLogger.error(f"Unexpected error: {e}")
        if args.dry_run:
            ColoredLogger.info("This might be due to Python environment issues.")
            ColoredLogger.info("Try: python -m pip install --upgrade pip")
        sys.exit(1)


if __name__ == '__main__':
    main()