#!/usr/bin/env python3
"""
TypeScript Architectural Fixer for G-Studio Projects
A production-ready tool for fixing TypeScript errors with scope-aware safety.
Combines architectural fixes from fix_all2.py with safety layer from 1.py.
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

# ============================================================================
# DATA MODELS
# ============================================================================

class Scope(Enum):
    """File scope categories with different permission levels."""
    NO_ANY = "NO_ANY"          # components/, core/, store/
    LIMITED_ANY = "LIMITED_ANY" # services/, api/, adapters/, integrations/
    OTHER = "OTHER"            # everything else


class FixPermission(Enum):
    """Permission levels for different error types."""
    ALWAYS = "ALWAYS"      # Always auto-fix
    LIMITED = "LIMITED"    # Auto-fix only in LIMITED_ANY scope
    NEVER = "NEVER"        # Never auto-fix, report only


class FixCategory(Enum):
    """Categories for fix application order."""
    SYNTAX = "SYNTAX"
    IMPORT = "IMPORT"
    TYPE_IDENTITY = "TYPE_IDENTITY"
    ANY_CAST = "ANY_CAST"
    G_STUDIO_CORE = "G_STUDIO_CORE"


@dataclass
class FileInfo:
    """Information about a file in the project."""
    path: Path
    relative_path: str
    content: str
    lines: List[str]
    scope: Scope
    hash: str = ""
    backup_path: Optional[Path] = None
    
    def __post_init__(self):
        if not self.hash:
            self.hash = hashlib.md5(self.content.encode()).hexdigest()


@dataclass
class TypeScriptError:
    """A TypeScript error from tsc output."""
    file: str
    line: int
    column: int
    code: str
    message: str
    full_text: str
    category: Optional[FixCategory] = None
    permission: Optional[FixPermission] = None
    
    def __post_init__(self):
        # Determine category
        CATEGORY_MAP = {
            'TS1308': FixCategory.SYNTAX,
            'TS2305': FixCategory.IMPORT,
            'TS2554': FixCategory.IMPORT,
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
        
        # Determine permission
        PERMISSION_MAP = {
            'TS2551': FixPermission.ALWAYS,
            'TS18048': FixPermission.ALWAYS,
            'TS7053': FixPermission.ALWAYS,
            'TS2578': FixPermission.ALWAYS,
            'TS1308': FixPermission.ALWAYS,
            'TS2564': FixPermission.ALWAYS,
            'TS2339': FixPermission.LIMITED,
            'TS2322': FixPermission.LIMITED,
            'TS2345': FixPermission.LIMITED,
            'TS2305': FixPermission.ALWAYS,
            'TS2769': FixPermission.NEVER,
            'TS2693': FixPermission.NEVER,
            'TS1362': FixPermission.NEVER,
            'TS2362': FixPermission.NEVER,
            'TS2363': FixPermission.NEVER,
            'TS2367': FixPermission.NEVER,
            'TS2353': FixPermission.NEVER,
            'TS4104': FixPermission.NEVER,
            'TS2440': FixPermission.NEVER,
            'TS2561': FixPermission.NEVER,
            'TS2783': FixPermission.NEVER,
            'TS2740': FixPermission.NEVER,
            'TS2741': FixPermission.NEVER,
            'TS2722': FixPermission.NEVER,
        }
        self.permission = PERMISSION_MAP.get(self.code, FixPermission.LIMITED)


@dataclass
class FixResult:
    """Result of a fix attempt."""
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
    fix_id: str = field(default_factory=lambda: str(uuid.uuid4())[:8])


@dataclass
class Checkpoint:
    """Checkpoint for rollback capability."""
    id: str
    timestamp: datetime
    description: str
    file_states: Dict[str, str]  # path -> content hash
    error_count: int
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class FixStats:
    """Statistics about fixes applied."""
    total_errors: int = 0
    fixed: int = 0
    skipped_scope: int = 0
    skipped_permission: int = 0
    skipped_other: int = 0
    by_category: Dict[FixCategory, int] = field(default_factory=lambda: defaultdict(int))
    by_scope: Dict[Scope, int] = field(default_factory=lambda: defaultdict(int))
    by_permission: Dict[FixPermission, int] = field(default_factory=lambda: defaultdict(int))
    files_modified: Set[str] = field(default_factory=set)
    iterations: int = 0


# ============================================================================
# UTILITIES
# ============================================================================

class ColoredLogger:
    """Colorful console output."""
    
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    WHITE = '\033[97m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'
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
    def debug(cls, message: str):
        print(f"{cls.CYAN}[DEBUG]{cls.END} {message}")
    
    @classmethod
    def header(cls, message: str):
        print(f"\n{cls.BOLD}{cls.MAGENTA}{'='*60}{cls.END}")
        print(f"{cls.BOLD}{cls.MAGENTA}{message.center(60)}{cls.END}")
        print(f"{cls.BOLD}{cls.MAGENTA}{'='*60}{cls.END}")


class FileSystem:
    """File system utilities with backup support."""
    
    def __init__(self, project_root: Path, backup_dir: Path):
        self.project_root = project_root
        self.backup_dir = backup_dir
        self.backup_dir.mkdir(exist_ok=True)
    
    def read_file(self, path: Path) -> Optional[FileInfo]:
        """Read a file with proper encoding handling."""
        try:
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            relative_path = str(path.relative_to(self.project_root))
            scope = self._determine_scope(path)
            
            return FileInfo(
                path=path,
                relative_path=relative_path,
                content=content,
                lines=content.splitlines(keepends=True),
                scope=scope
            )
        except Exception as e:
            ColoredLogger.error(f"Failed to read {path}: {e}")
            return None
    
    def write_file(self, file_info: FileInfo, create_backup: bool = True) -> bool:
        """Write file content with optional backup."""
        try:
            if create_backup:
                backup_path = self.create_backup(file_info.path)
                file_info.backup_path = backup_path
            
            with open(file_info.path, 'w', encoding='utf-8') as f:
                f.write(file_info.content)
            
            # Update hash
            file_info.hash = hashlib.md5(file_info.content.encode()).hexdigest()
            return True
        except Exception as e:
            ColoredLogger.error(f"Failed to write {file_info.path}: {e}")
            return False
    
    def create_backup(self, file_path: Path) -> Path:
        """Create a timestamped backup of a file."""
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_%f')[:-3]
        backup_name = f"{file_path.name}.{timestamp}.bak"
        backup_path = self.backup_dir / backup_name
        shutil.copy2(file_path, backup_path)
        return backup_path
    
    def restore_backup(self, backup_path: Path, target_path: Path) -> bool:
        """Restore a file from backup."""
        try:
            shutil.copy2(backup_path, target_path)
            return True
        except Exception as e:
            ColoredLogger.error(f"Failed to restore {backup_path}: {e}")
            return False
    
    def _determine_scope(self, path: Path) -> Scope:
        """Determine the scope of a file based on its path."""
        str_path = str(path)
        
        # Check for NO_ANY scopes first
        no_any_patterns = [
            r'/src/components/',
            r'/src/Components/',
            r'/src/core/',
            r'/src/Core/',
            r'/src/store/',
            r'/src/stores/',
        ]
        
        for pattern in no_any_patterns:
            if re.search(pattern, str_path, re.IGNORECASE):
                return Scope.NO_ANY
        
        # Check for LIMITED_ANY scopes
        limited_patterns = [
            r'/src/services/',
            r'/src/service/',
            r'/src/api/',
            r'/src/apis/',
            r'/src/adapters/',
            r'/src/adapter/',
            r'/src/integrations/',
            r'/src/integration/',
        ]
        
        for pattern in limited_patterns:
            if re.search(pattern, str_path, re.IGNORECASE):
                return Scope.LIMITED_ANY
        
        return Scope.OTHER
    
    def find_gstudio_core_files(self) -> List[Path]:
        """Find G-Studio core files that need special handling."""
        core_files = []
        patterns = [
            '**/projectStore.ts',
            '**/geminiService.ts',
            '**/additional.ts',
            '**/types.ts',
            '**/ai.ts',
            '**/AISettingsHub.tsx',
            '**/App.tsx',
            '**/EditorLayout.tsx',
            '**/MainLayout.tsx',
            '**/VirtualizedMessageList.tsx',
            '**/ModalManager.tsx',
            '**/ToolUsageAnalyticsModal.tsx',
            '**/streamProcessor.ts',
        ]
        
        for pattern in patterns:
            for path in self.project_root.glob(pattern):
                if path.is_file():
                    core_files.append(path)
        
        return core_files


class ImportExportParser:
    """Parser for import and export statements."""
    
    @staticmethod
    def parse_imports(content: str) -> List[Dict[str, Any]]:
        """Extract all import statements."""
        imports = []
        patterns = [
            r"import\s+(?:{[^}]+}|\* as \w+|\w+)\s+from\s+['\"]([^'\"]+)['\"]",
            r"import\s+['\"]([^'\"]+)['\"]",
        ]
        
        for pattern in patterns:
            for match in re.finditer(pattern, content):
                imports.append({
                    'full_match': match.group(0),
                    'module_path': match.group(1) if match.groups() else '',
                    'start': match.start(),
                    'end': match.end()
                })
        
        return imports
    
    @staticmethod
    def parse_exports(content: str) -> List[Dict[str, Any]]:
        """Extract all export statements."""
        exports = []
        patterns = [
            r'export\s+default\s+(\w+)',
            r'export\s+(?:const|let|var|function|class|interface|type)\s+(\w+)',
            r'export\s+{[^}]+}',
        ]
        
        for pattern in patterns:
            for match in re.finditer(pattern, content):
                exports.append({
                    'full_match': match.group(0),
                    'start': match.start(),
                    'end': match.end()
                })
        
        return exports
    
    @staticmethod
    def replace_import(content: str, old_path: str, new_path: str) -> str:
        """Replace import paths."""
        pattern = r"import\s+(?:{[^}]+}|\* as \w+|\w+)\s+from\s+['\"]" + re.escape(old_path) + r"['\"]"
        replacement = f"from '{new_path}'"
        return re.sub(pattern, replacement, content)


class TypeScriptCompiler:
    """Interface to TypeScript compiler."""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.tsc_cmd = ['npx', 'tsc', '--noEmit', '--pretty', 'false', '--skipLibCheck']
    
    def run(self) -> Tuple[List[TypeScriptError], str]:
        """Run tsc and parse errors."""
        try:
            result = subprocess.run(
                self.tsc_cmd,
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=120
            )
            
            output = result.stdout + result.stderr
            errors = self._parse_errors(output)
            
            return errors, output
            
        except subprocess.TimeoutExpired:
            ColoredLogger.error("tsc command timed out after 120 seconds")
            return [], ""
        except Exception as e:
            ColoredLogger.error(f"Error running tsc: {e}")
            return [], ""
    
    def _parse_errors(self, output: str) -> List[TypeScriptError]:
        """Parse tsc output into structured errors."""
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
    
    def count_errors(self) -> int:
        """Quick error count without full parsing."""
        errors, _ = self.run()
        return len(errors)


# ============================================================================
# FIX FUNCTIONS - G-STUDIO CORE
# ============================================================================

class GStudioCoreFixer:
    """Architectural fixes for G-Studio specific issues."""
    
    def __init__(self, fs: FileSystem):
        self.fs = fs
    
    def fix_duplicate_filedata_import(self, file_info: FileInfo) -> List[FixResult]:
        """Fix dual FileData types in App.tsx and EditorLayout.tsx."""
        if 'App.tsx' not in file_info.relative_path and 'EditorLayout.tsx' not in file_info.relative_path:
            return []
        
        results = []
        content = file_info.content
        
        # Replace imported FileData type with unified type
        pattern = r"import\([^)]+\)\.FileData"
        if re.search(pattern, content):
            new_content = re.sub(pattern, "FileData", content)
            
            if new_content != content:
                file_info.content = new_content
                results.append(FixResult(
                    success=True,
                    file_path=file_info.relative_path,
                    line=0,
                    code="TS2322",
                    action="Unified FileData type imports",
                    category=FixCategory.G_STUDIO_CORE,
                    permission=FixPermission.ALWAYS,
                    scope=file_info.scope,
                    original_line="Multiple FileData imports",
                    fixed_line="Unified FileData import"
                ))
        
        return results
    
    def fix_duplicate_aiconfig_import(self, file_info: FileInfo) -> List[FixResult]:
        """Fix dual AIConfig types in AISettingsHub.tsx."""
        if 'AISettingsHub' not in file_info.relative_path:
            return []
        
        results = []
        content = file_info.content
        
        # Replace AIConfig import paths with unified path
        patterns = [
            (r"import\([^)]+/src/types/ai\)\.AIConfig", "AIConfig"),
            (r"import\([^)]+/AISettingsHub/types\)\.AIConfig", "AIConfig"),
        ]
        
        for pattern, replacement in patterns:
            if re.search(pattern, content):
                new_content = re.sub(pattern, replacement, content)
                
                if new_content != content:
                    file_info.content = new_content
                    results.append(FixResult(
                        success=True,
                        file_path=file_info.relative_path,
                        line=0,
                        code="TS2322",
                        action="Unified AIConfig type imports",
                        category=FixCategory.G_STUDIO_CORE,
                        permission=FixPermission.ALWAYS,
                        scope=file_info.scope,
                        original_line=f"Found: {pattern}",
                        fixed_line=f"Replaced with: {replacement}"
                    ))
                    content = new_content
        
        return results
    
    def fix_duplicate_limittype(self, file_info: FileInfo) -> List[FixResult]:
        """Fix duplicate limitType identifier in additional.ts."""
        if 'additional.ts' not in file_info.relative_path:
            return []
        
        results = []
        lines = file_info.lines
        
        # Find duplicate limitType declarations
        limittype_lines = []
        for i, line in enumerate(lines):
            if 'limitType:' in line or 'limitType;' in line:
                limittype_lines.append(i)
        
        # Remove duplicates (keep first)
        if len(limittype_lines) > 1:
            for line_num in reversed(limittype_lines[1:]):
                lines[line_num] = ""
            
            file_info.content = ''.join(lines)
            results.append(FixResult(
                success=True,
                file_path=file_info.relative_path,
                line=limittype_lines[1] + 1,
                code="TS2300",
                action="Removed duplicate limitType declaration",
                category=FixCategory.G_STUDIO_CORE,
                permission=FixPermission.ALWAYS,
                scope=file_info.scope
            ))
        
        return results
    
    def fix_projectstore_files_type(self, file_info: FileInfo) -> List[FixResult]:
        """Fix files Array vs Map mismatch in projectStore.ts."""
        if 'projectStore' not in file_info.relative_path.lower():
            return []
        
        results = []
        content = file_info.content
        
        # Fix type declaration
        if 'files: ProjectFile[]' in content:
            new_content = content.replace('files: ProjectFile[]', 'files: Map<string, FileData>')
            
            if new_content != content:
                file_info.content = new_content
                results.append(FixResult(
                    success=True,
                    file_path=file_info.relative_path,
                    line=0,
                    code="TS2322",
                    action="Fixed files type from ProjectFile[] to Map<string, FileData>",
                    category=FixCategory.G_STUDIO_CORE,
                    permission=FixPermission.ALWAYS,
                    scope=file_info.scope
                ))
                content = new_content
        
        # Fix initialization
        if 'files: [] as any' in content:
            new_content = content.replace('files: [] as any', 'files: new Map<string, FileData>()')
            
            if new_content != content:
                file_info.content = new_content
                results.append(FixResult(
                    success=True,
                    file_path=file_info.relative_path,
                    line=0,
                    code="TS2322",
                    action="Fixed files initialization",
                    category=FixCategory.G_STUDIO_CORE,
                    permission=FixPermission.ALWAYS,
                    scope=file_info.scope
                ))
        
        return results
    
    def fix_gemini_api_cast(self, file_info: FileInfo) -> List[FixResult]:
        """Fix Gemini API type mismatches in geminiService.ts."""
        if 'geminiService' not in file_info.relative_path.lower():
            return []
        
        results = []
        content = file_info.content
        
        # Fix GenerateContentResult casts
        if 'as GenerateContentResult' in content:
            new_content = content.replace('as GenerateContentResult', 'as any')
            
            if new_content != content:
                file_info.content = new_content
                results.append(FixResult(
                    success=True,
                    file_path=file_info.relative_path,
                    line=0,
                    code="TS2339",
                    action="Fixed Gemini API type casts",
                    category=FixCategory.G_STUDIO_CORE,
                    permission=FixPermission.LIMITED,
                    scope=file_info.scope
                ))
                content = new_content
        
        # Add optional chaining for property access
        patterns = [r'\.candidates', r'\.functionCalls', r'\.text\(\)', r'\.usageMetadata']
        for pattern in patterns:
            if re.search(pattern, content) and '?.' not in pattern:
                # Simple replacement - in practice would need more context
                pass
        
        return results
    
    def fix_toolcall_args_to_arguments(self, file_info: FileInfo) -> List[FixResult]:
        """Fix args -> arguments in ToolCall interface."""
        if 'geminiService' not in file_info.relative_path.lower():
            return []
        
        results = []
        lines = file_info.lines
        
        for i, line in enumerate(lines):
            if 'args:' in line and ('ToolCall' in line or 'toolCall' in line):
                new_line = line.replace('args:', 'arguments:')
                if new_line != line:
                    lines[i] = new_line
                    results.append(FixResult(
                        success=True,
                        file_path=file_info.relative_path,
                        line=i + 1,
                        code="TS2322",
                        action="Fixed ToolCall args -> arguments",
                        category=FixCategory.G_STUDIO_CORE,
                        permission=FixPermission.ALWAYS,
                        scope=file_info.scope,
                        original_line=line.rstrip('\n'),
                        fixed_line=new_line.rstrip('\n')
                    ))
        
        if results:
            file_info.content = ''.join(lines)
        
        return results
    
    def fix_broken_jsx_comments(self, file_info: FileInfo) -> List[FixResult]:
        """Fix broken JSX comments in MainLayout.tsx."""
        if 'MainLayout' not in file_info.relative_path:
            return []
        
        results = []
        lines = file_info.lines
        
        for i, line in enumerate(lines):
            # Fix // @ts-expect-error inside JSX
            if '// @ts-expect-error' in line and ('<' in line or '>' in line):
                # Check if we're inside JSX
                new_line = line.replace('// @ts-expect-error', '{/* @ts-expect-error */}')
                if new_line != line:
                    lines[i] = new_line
                    results.append(FixResult(
                        success=True,
                        file_path=file_info.relative_path,
                        line=i + 1,
                        code="TS1005",
                        action="Fixed JSX comment syntax",
                        category=FixCategory.G_STUDIO_CORE,
                        permission=FixPermission.ALWAYS,
                        scope=file_info.scope,
                        original_line=line.rstrip('\n'),
                        fixed_line=new_line.rstrip('\n')
                    ))
        
        if results:
            file_info.content = ''.join(lines)
        
        return results
    
    def fix_autosizer_props(self, file_info: FileInfo) -> List[FixResult]:
        """Fix AutoSizer props mismatch."""
        if 'VirtualizedMessageList' not in file_info.relative_path:
            return []
        
        results = []
        content = file_info.content
        
        # Look for AutoSizer component
        if 'AutoSizer' in content and file_info.scope != Scope.NO_ANY:
            # Add type cast for AutoSizer props
            pattern = r'<AutoSizer([^>]*)>'
            replacement = r'<AutoSizer\1 {...({} as any)}>'
            new_content = re.sub(pattern, replacement, content)
            
            if new_content != content:
                file_info.content = new_content
                results.append(FixResult(
                    success=True,
                    file_path=file_info.relative_path,
                    line=0,
                    code="TS2322",
                    action="Added type cast to AutoSizer props",
                    category=FixCategory.G_STUDIO_CORE,
                    permission=FixPermission.LIMITED,
                    scope=file_info.scope
                ))
        
        return results
    
    def fix_modal_manager_props(self, file_info: FileInfo) -> List[FixResult]:
        """Fix missing props in ModalManager.tsx."""
        if 'ModalManager' not in file_info.relative_path:
            return []
        
        results = []
        lines = file_info.lines
        
        for i, line in enumerate(lines):
            if '<AgentCollaboration' in line and ('isOpen' not in line or 'onClose' not in line):
                # Add missing props
                if '/>' in line:
                    new_line = line.replace('/>', ' isOpen={isOpen} onClose={onClose} />')
                elif '>' in line:
                    new_line = line.replace('>', ' isOpen={isOpen} onClose={onClose}>')
                else:
                    continue
                
                if new_line != line:
                    lines[i] = new_line
                    results.append(FixResult(
                        success=True,
                        file_path=file_info.relative_path,
                        line=i + 1,
                        code="TS2739",
                        action="Added missing props to AgentCollaboration",
                        category=FixCategory.G_STUDIO_CORE,
                        permission=FixPermission.ALWAYS,
                        scope=file_info.scope,
                        original_line=line.rstrip('\n'),
                        fixed_line=new_line.rstrip('\n')
                    ))
        
        if results:
            file_info.content = ''.join(lines)
        
        return results
    
    def fix_object_keys_undefined(self, file_info: FileInfo) -> List[FixResult]:
        """Fix Object.keys/entries on possibly undefined in ToolUsageAnalyticsModal.tsx."""
        if 'ToolUsageAnalyticsModal' not in file_info.relative_path:
            return []
        
        results = []
        lines = file_info.lines
        
        for i, line in enumerate(lines):
            if 'Object.keys(' in line or 'Object.entries(' in line:
                # Add nullish coalescing
                new_line = re.sub(r'Object\.(keys|entries)\((\w+)\)', r'Object.\1(\2 ?? {})', line)
                if new_line != line:
                    lines[i] = new_line
                    results.append(FixResult(
                        success=True,
                        file_path=file_info.relative_path,
                        line=i + 1,
                        code="TS2769",
                        action="Added nullish coalescing to Object.keys/entries",
                        category=FixCategory.G_STUDIO_CORE,
                        permission=FixPermission.ALWAYS,
                        scope=file_info.scope,
                        original_line=line.rstrip('\n'),
                        fixed_line=new_line.rstrip('\n')
                    ))
        
        if results:
            file_info.content = ''.join(lines)
        
        return results
    
    def fix_duplicate_object_properties(self, file_info: FileInfo) -> List[FixResult]:
        """Fix duplicate properties in object literals."""
        results = []
        lines = file_info.lines
        
        for i, line in enumerate(lines):
            # Simple detection of duplicate properties in same line
            # This is simplified - real implementation would need AST
            if ': ' in line and line.count(': ') > 1:
                # Count property names
                parts = line.split(':')
                if len(parts) > 2:
                    # Check for duplicates (simple check)
                    props = []
                    for j in range(len(parts) - 1):
                        prop = parts[j].strip().split()[-1]
                        if prop:
                            props.append(prop)
                    
                    if len(props) != len(set(props)):
                        # Has duplicates - mark for manual fix
                        results.append(FixResult(
                            success=False,
                            file_path=file_info.relative_path,
                            line=i + 1,
                            code="TS1117",
                            action="Found duplicate properties (needs manual fix)",
                            category=FixCategory.G_STUDIO_CORE,
                            permission=FixPermission.NEVER,
                            scope=file_info.scope,
                            original_line=line.rstrip('\n'),
                            error_message="Duplicate properties in object literal"
                        ))
        
        return results
    
    def unify_filedata_imports(self, file_info: FileInfo) -> List[FixResult]:
        """Unify all FileData imports to use '@/types/types'."""
        if file_info.relative_path.endswith('.ts') or file_info.relative_path.endswith('.tsx'):
            results = []
            content = file_info.content
            
            # Replace various FileData import patterns
            patterns = [
                r"import\s+.*from\s+['\"].*FileData['\"]",
                r"import\s+type\s*{.*FileData.*}",
            ]
            
            for pattern in patterns:
                if re.search(pattern, content):
                    # Standardize to: import type { FileData } from '@/types/types'
                    new_content = re.sub(
                        pattern,
                        "import type { FileData } from '@/types/types'",
                        content
                    )
                    
                    if new_content != content:
                        file_info.content = new_content
                        results.append(FixResult(
                            success=True,
                            file_path=file_info.relative_path,
                            line=0,
                            code="TS2322",
                            action="Unified FileData import",
                            category=FixCategory.G_STUDIO_CORE,
                            permission=FixPermission.ALWAYS,
                            scope=file_info.scope
                        ))
                        content = new_content
            
            return results
        return []
    
    def consolidate_aiconfig(self, file_info: FileInfo) -> List[FixResult]:
        """Consolidate AIConfig imports to use '@/types/ai'."""
        if file_info.relative_path.endswith('.ts') or file_info.relative_path.endswith('.tsx'):
            results = []
            content = file_info.content
            
            # Replace AIConfig imports
            old_paths = [
                './types',
                '../types/ai',
                '@/features/ai/AISettingsHub/types',
                'src/features/ai/AISettingsHub/types',
            ]
            
            for old_path in old_paths:
                pattern = rf"import\s+.*from\s+['\"]{re.escape(old_path)}['\"]"
                if re.search(pattern, content):
                    new_content = re.sub(
                        pattern,
                        "from '@/types/ai'",
                        content
                    )
                    
                    if new_content != content:
                        file_info.content = new_content
                        results.append(FixResult(
                            success=True,
                            file_path=file_info.relative_path,
                            line=0,
                            code="TS2322",
                            action=f"Consolidated AIConfig import from {old_path}",
                            category=FixCategory.G_STUDIO_CORE,
                            permission=FixPermission.ALWAYS,
                            scope=file_info.scope
                        ))
                        content = new_content
            
            return results
        return []


# ============================================================================
# FIX FUNCTIONS - GENERAL (WITH SCOPE CHECKS)
# ============================================================================

class GeneralFixer:
    """General TypeScript fixes with scope-aware safety."""
    
    def __init__(self, fs: FileSystem):
        self.fs = fs
    
    def fix_ts2551_typo_suggestion(self, error: TypeScriptError, file_info: FileInfo) -> Optional[FixResult]:
        """Fix TS2551 - Property typo suggestion."""
        if error.permission != FixPermission.ALWAYS:
            return None
        
        match = re.match(r"Property '(\w+)' does not exist on type '.+?'\. Did you mean '(\w+)'\?", error.message)
        if not match:
            return None
        
        wrong = match.group(1)
        right = match.group(2)
        line_num = error.line - 1
        
        if line_num >= len(file_info.lines):
            return None
        
        line = file_info.lines[line_num]
        new_line = line
        
        # Try different replacement patterns
        patterns = [
            (rf'\.{re.escape(wrong)}\b', f'.{right}'),
            (rf'\?\.{re.escape(wrong)}\b', f'?.{right}'),
            (rf'!\.{re.escape(wrong)}\b', f'!.{right}'),
        ]
        
        for pattern, replacement in patterns:
            new_line = re.sub(pattern, replacement, line, count=1)
            if new_line != line:
                break
        
        if new_line != line:
            file_info.lines[line_num] = new_line
            file_info.content = ''.join(file_info.lines)
            
            return FixResult(
                success=True,
                file_path=file_info.relative_path,
                line=error.line,
                code=error.code,
                action=f"Fixed typo: {wrong} → {right}",
                category=error.category,
                permission=error.permission,
                scope=file_info.scope,
                original_line=line.rstrip('\n'),
                fixed_line=new_line.rstrip('\n')
            )
        
        return None
    
    def fix_ts18048_possibly_undefined(self, error: TypeScriptError, file_info: FileInfo) -> Optional[FixResult]:
        """Fix TS18048 - Possibly undefined by adding non-null assertion."""
        if error.permission != FixPermission.ALWAYS:
            return None
        
        match = re.match(r"'(.+?)' is possibly 'undefined'", error.message)
        if not match:
            return None
        
        varname = match.group(1)
        line_num = error.line - 1
        col = error.column - 1
        
        if line_num >= len(file_info.lines):
            return None
        
        line = file_info.lines[line_num]
        
        if col < len(line):
            # Add ! after variable
            rest = line[col:]
            
            # Pattern for variable followed by . or ( or [
            pattern = re.compile(rf'(\b{re.escape(varname)}\b)(\s*[\.\(\[\]])')
            match_obj = pattern.search(rest)
            
            if match_obj:
                new_rest = pattern.sub(rf'\1!\2', rest, 1)
                new_line = line[:col] + new_rest
                
                file_info.lines[line_num] = new_line
                file_info.content = ''.join(file_info.lines)
                
                return FixResult(
                    success=True,
                    file_path=file_info.relative_path,
                    line=error.line,
                    code=error.code,
                    action=f"Added non-null assertion to {varname}",
                    category=error.category,
                    permission=error.permission,
                    scope=file_info.scope,
                    original_line=line.rstrip('\n'),
                    fixed_line=new_line.rstrip('\n')
                )
        
        return None
    
    def fix_ts7053_element_access(self, error: TypeScriptError, file_info: FileInfo) -> Optional[FixResult]:
        """Fix TS7053 - Element implicitly has any type."""
        if error.permission != FixPermission.ALWAYS:
            return None
        
        # Check scope restrictions
        if file_info.scope == Scope.NO_ANY:
            return FixResult(
                success=False,
                file_path=file_info.relative_path,
                line=error.line,
                code=error.code,
                action="Skipped - NO_ANY scope",
                category=error.category,
                permission=error.permission,
                scope=file_info.scope,
                error_message="Cannot add 'any' cast in NO_ANY scope"
            )
        
        line_num = error.line - 1
        col = error.column - 1
        
        if line_num >= len(file_info.lines):
            return None
        
        line = file_info.lines[line_num]
        
        if col < len(line):
            rest = line[col:]
            match = re.match(r'(\w+)\[', rest)
            
            if match:
                objname = match.group(1)
                new_rest = re.sub(rf'^{re.escape(objname)}\[', f'({objname} as any)[', rest, 1)
                new_line = line[:col] + new_rest
                
                file_info.lines[line_num] = new_line
                file_info.content = ''.join(file_info.lines)
                
                return FixResult(
                    success=True,
                    file_path=file_info.relative_path,
                    line=error.line,
                    code=error.code,
                    action=f"Added (obj as any)[key] cast",
                    category=error.category,
                    permission=error.permission,
                    scope=file_info.scope,
                    original_line=line.rstrip('\n'),
                    fixed_line=new_line.rstrip('\n')
                )
        
        return None
    
    def fix_ts2578_unused_variable(self, error: TypeScriptError, file_info: FileInfo) -> Optional[FixResult]:
        """Fix TS2578 - Unused variable by prefixing with _."""
        if error.permission != FixPermission.ALWAYS:
            return None
        
        match = re.match(r"'(\w+)' is declared but its value is never read", error.message)
        if not match:
            return None
        
        varname = match.group(1)
        
        # Skip if already starts with _
        if varname.startswith('_'):
            return None
        
        line_num = error.line - 1
        
        if line_num >= len(file_info.lines):
            return None
        
        line = file_info.lines[line_num]
        new_line = re.sub(rf'\b{re.escape(varname)}\b', f'_{varname}', line, count=1)
        
        if new_line != line:
            file_info.lines[line_num] = new_line
            file_info.content = ''.join(file_info.lines)
            
            return FixResult(
                success=True,
                file_path=file_info.relative_path,
                line=error.line,
                code=error.code,
                action=f"Renamed unused variable to _{varname}",
                category=error.category,
                permission=error.permission,
                scope=file_info.scope,
                original_line=line.rstrip('\n'),
                fixed_line=new_line.rstrip('\n')
            )
        
        return None
    
    def fix_ts1308_await_non_async(self, error: TypeScriptError, file_info: FileInfo) -> Optional[FixResult]:
        """Fix TS1308 - Await in non-async function."""
        if error.permission != FixPermission.ALWAYS:
            return None
        
        line_num = error.line - 1
        
        # Search backward for function declaration
        for i in range(line_num, max(-1, line_num - 30), -1):
            if i >= len(file_info.lines):
                continue
            
            line = file_info.lines[i]
            
            # Function declaration
            if 'function ' in line and 'async' not in line:
                new_line = line.replace('function ', 'async function ', 1)
                file_info.lines[i] = new_line
                file_info.content = ''.join(file_info.lines)
                
                return FixResult(
                    success=True,
                    file_path=file_info.relative_path,
                    line=i + 1,
                    code=error.code,
                    action="Added async to function declaration",
                    category=error.category,
                    permission=error.permission,
                    scope=file_info.scope,
                    original_line=line.rstrip('\n'),
                    fixed_line=new_line.rstrip('\n')
                )
            
            # Arrow function
            elif '=>' in line and 'async' not in line:
                match = re.search(r'(const|let|var)\s+(\w+)\s*=\s*\(', line)
                if match:
                    new_line = line.replace(
                        f'{match.group(1)} {match.group(2)} = (',
                        f'{match.group(1)} {match.group(2)} = async (',
                        1
                    )
                    file_info.lines[i] = new_line
                    file_info.content = ''.join(file_info.lines)
                    
                    return FixResult(
                        success=True,
                        file_path=file_info.relative_path,
                        line=i + 1,
                        code=error.code,
                        action="Added async to arrow function",
                        category=error.category,
                        permission=error.permission,
                        scope=file_info.scope,
                        original_line=line.rstrip('\n'),
                        fixed_line=new_line.rstrip('\n')
                    )
        
        return None
    
    def fix_ts2339_property_not_exist(self, error: TypeScriptError, file_info: FileInfo) -> Optional[FixResult]:
        """Fix TS2339 - Property does not exist on type."""
        if error.permission != FixPermission.LIMITED:
            return None
        
        # Check scope restrictions
        if file_info.scope == Scope.NO_ANY:
            return FixResult(
                success=False,
                file_path=file_info.relative_path,
                line=error.line,
                code=error.code,
                action="Skipped - NO_ANY scope",
                category=error.category,
                permission=error.permission,
                scope=file_info.scope,
                error_message="Property fix not allowed in NO_ANY scope"
            )
        
        match = re.match(r"Property '(\w+)' does not exist on type '(.+)'", error.message)
        if not match:
            return None
        
        prop = match.group(1)
        line_num = error.line - 1
        
        if line_num >= len(file_info.lines):
            return None
        
        line = file_info.lines[line_num]
        
        # Add (obj as any).prop cast
        patterns = [
            (rf'(\b\w+)\.\b{re.escape(prop)}\b', rf'(\1 as any).{prop}'),
            (rf'(\b\w+)\?\.\b{re.escape(prop)}\b', rf'(\1 as any)?.{prop}'),
        ]
        
        for pattern, replacement in patterns:
            new_line = re.sub(pattern, replacement, line, count=1)
            if new_line != line:
                file_info.lines[line_num] = new_line
                file_info.content = ''.join(file_info.lines)
                
                return FixResult(
                    success=True,
                    file_path=file_info.relative_path,
                    line=error.line,
                    code=error.code,
                    action=f"Added (obj as any).{prop} cast",
                    category=error.category,
                    permission=error.permission,
                    scope=file_info.scope,
                    original_line=line.rstrip('\n'),
                    fixed_line=new_line.rstrip('\n')
                )
        
        return None
    
    def fix_ts2322_type_mismatch(self, error: TypeScriptError, file_info: FileInfo) -> Optional[FixResult]:
        """Fix TS2322 - Type mismatch."""
        if error.permission != FixPermission.LIMITED:
            return None
        
        # Check scope restrictions
        if file_info.scope == Scope.NO_ANY:
            return FixResult(
                success=False,
                file_path=file_info.relative_path,
                line=error.line,
                code=error.code,
                action="Skipped - NO_ANY scope",
                category=error.category,
                permission=error.permission,
                scope=file_info.scope,
                error_message="Type mismatch fix not allowed in NO_ANY scope"
            )
        
        line_num = error.line - 1
        
        if line_num >= len(file_info.lines):
            return None
        
        line = file_info.lines[line_num]
        
        # Simple fix: add as any to assignments
        if '=' in line and 'as any' not in line:
            parts = line.split('=')
            if len(parts) >= 2:
                before = parts[0]
                after = '='.join(parts[1:])
                
                # Add as any before semicolon or end of line
                if after.strip() and not after.strip().endswith('as any'):
                    # Remove trailing whitespace and punctuation
                    stripped = after.rstrip()
                    if stripped.endswith(';'):
                        new_after = stripped[:-1] + ' as any;' + after[len(stripped):]
                    elif stripped.endswith(','):
                        new_after = stripped[:-1] + ' as any,' + after[len(stripped):]
                    else:
                        new_after = stripped + ' as any' + after[len(stripped):]
                    
                    new_line = before + '=' + new_after
                    file_info.lines[line_num] = new_line
                    file_info.content = ''.join(file_info.lines)
                    
                    return FixResult(
                        success=True,
                        file_path=file_info.relative_path,
                        line=error.line,
                        code=error.code,
                        action="Added 'as any' cast to assignment",
                        category=error.category,
                        permission=error.permission,
                        scope=file_info.scope,
                        original_line=line.rstrip('\n'),
                        fixed_line=new_line.rstrip('\n')
                    )
        
        return None
    
    def fix_ts2345_argument_mismatch(self, error: TypeScriptError, file_info: FileInfo) -> Optional[FixResult]:
        """Fix TS2345 - Argument type mismatch."""
        if error.permission != FixPermission.LIMITED:
            return None
        
        # Check scope restrictions
        if file_info.scope == Scope.NO_ANY:
            return FixResult(
                success=False,
                file_path=file_info.relative_path,
                line=error.line,
                code=error.code,
                action="Skipped - NO_ANY scope",
                category=error.category,
                permission=error.permission,
                scope=file_info.scope,
                error_message="Argument fix not allowed in NO_ANY scope"
            )
        
        line_num = error.line - 1
        col = error.column - 1
        
        if line_num >= len(file_info.lines):
            return None
        
        line = file_info.lines[line_num]
        
        if col < len(line):
            rest = line[col:]
            
            # Find argument boundaries
            depth = 0
            end_pos = -1
            for i, ch in enumerate(rest):
                if ch in '([{':
                    depth += 1
                elif ch in ')]}':
                    if depth == 0:
                        end_pos = i
                        break
                    depth -= 1
                elif ch == ',' and depth == 0:
                    end_pos = i
                    break
                elif ch == ';' and depth == 0:
                    end_pos = i
                    break
            
            if end_pos > 0:
                arg = rest[:end_pos].strip()
                if arg and 'as any' not in arg:
                    new_rest = arg + ' as any' + rest[end_pos:]
                    new_line = line[:col] + new_rest
                    
                    file_info.lines[line_num] = new_line
                    file_info.content = ''.join(file_info.lines)
                    
                    return FixResult(
                        success=True,
                        file_path=file_info.relative_path,
                        line=error.line,
                        code=error.code,
                        action="Added 'as any' cast to argument",
                        category=error.category,
                        permission=error.permission,
                        scope=file_info.scope,
                        original_line=line.rstrip('\n'),
                        fixed_line=new_line.rstrip('\n')
                    )
        
        return None
    
    def fix_ts2305_no_exported_member(self, error: TypeScriptError, file_info: FileInfo) -> Optional[FixResult]:
        """Fix TS2305 - Module has no exported member."""
        if error.permission != FixPermission.ALWAYS:
            return None
        
        match = re.match(r"Module '.*' has no exported member '(\w+)'", error.message)
        if not match:
            return None
        
        member = match.group(1)
        line_num = error.line - 1
        
        if line_num >= len(file_info.lines):
            return None
        
        line = file_info.lines[line_num]
        new_line = line
        
        # Try to remove the specific import
        # Pattern: import { A, B, C } from '...'
        if f'{{' in line and f'}}' in line:
            # Remove member from import list
            import_match = re.search(r'import\s+{([^}]+)}', line)
            if import_match:
                members = [m.strip() for m in import_match.group(1).split(',')]
                if member in members:
                    members.remove(member)
                    if members:
                        new_import = f"import {{{', '.join(members)}}}"
                        new_line = re.sub(r'import\s+{[^}]+}', new_import, line)
                    else:
                        # Comment out entire import if no members left
                        new_line = f'// {line}'
        
        if new_line != line:
            file_info.lines[line_num] = new_line
            file_info.content = ''.join(file_info.lines)
            
            return FixResult(
                success=True,
                file_path=file_info.relative_path,
                line=error.line,
                code=error.code,
                action=f"Removed non-existent import: {member}",
                category=error.category,
                permission=error.permission,
                scope=file_info.scope,
                original_line=line.rstrip('\n'),
                fixed_line=new_line.rstrip('\n')
            )
        
        return None
    
    def fix_ts2564_not_initialized(self, error: TypeScriptError, file_info: FileInfo) -> Optional[FixResult]:
        """Fix TS2564 - Property has no initializer."""
        if error.permission != FixPermission.ALWAYS:
            return None
        
        match = re.match(r"Property '(\w+)' has no initializer", error.message)
        if not match:
            return None
        
        prop = match.group(1)
        line_num = error.line - 1
        
        if line_num >= len(file_info.lines):
            return None
        
        line = file_info.lines[line_num]
        
        # Add definite assignment assertion
        new_line = re.sub(rf'(\b{re.escape(prop)})(\s*:)', rf'\1!\2', line, count=1)
        
        if new_line != line:
            file_info.lines[line_num] = new_line
            file_info.content = ''.join(file_info.lines)
            
            return FixResult(
                success=True,
                file_path=file_info.relative_path,
                line=error.line,
                code=error.code,
                action=f"Added definite assignment assertion to {prop}",
                category=error.category,
                permission=error.permission,
                scope=file_info.scope,
                original_line=line.rstrip('\n'),
                fixed_line=new_line.rstrip('\n')
            )
        
        return None


# ============================================================================
# MAIN FIXER CLASS
# ============================================================================

class TypeScriptArchitecturalFixer:
    """Main orchestrator for TypeScript fixes."""
    
    def __init__(self, project_root: Path, dry_run: bool = False):
        self.project_root = project_root
        self.dry_run = dry_run
        
        # Initialize subsystems
        self.backup_dir = project_root / '.ts_fixer_backups'
        self.checkpoints_dir = project_root / '.ts_fixer_checkpoints'
        
        self.fs = FileSystem(project_root, self.backup_dir)
        self.tsc = TypeScriptCompiler(project_root)
        self.gstudio_fixer = GStudioCoreFixer(self.fs)
        self.general_fixer = GeneralFixer(self.fs)
        
        # State
        self.stats = FixStats()
        self.results: List[FixResult] = []
        self.checkpoints: List[Checkpoint] = []
        self.current_checkpoint: Optional[Checkpoint] = None
        
        # Track files being processed
        self.files_cache: Dict[str, FileInfo] = {}
        
        ColoredLogger.header(f"TypeScript Architectural Fixer")
        ColoredLogger.info(f"Project: {project_root}")
        ColoredLogger.info(f"Dry run: {dry_run}")
    
    def run(self) -> bool:
        """Main execution loop."""
        # Safety check
        if not self._check_git_branch():
            response = input("⚠️  Not on a git branch. Continue anyway? (y/N): ")
            if response.lower() != 'y':
                return False
        
        # Create initial checkpoint
        self._create_checkpoint("Initial state")
        
        # Main fixing loop
        max_iterations = 5
        prev_error_count = float('inf')
        
        for iteration in range(1, max_iterations + 1):
            ColoredLogger.header(f"Iteration {iteration}")
            
            # Get current errors
            errors, _ = self.tsc.run()
            error_count = len(errors)
            self.stats.total_errors = error_count
            self.stats.iterations = iteration
            
            ColoredLogger.info(f"Found {error_count} TypeScript errors")
            
            if error_count == 0:
                ColoredLogger.success("No errors remaining!")
                break
            
            if error_count >= prev_error_count:
                ColoredLogger.warning(f"No progress (was {prev_error_count}, now {error_count})")
                if iteration > 1:
                    ColoredLogger.info("Rolling back to previous checkpoint...")
                    self._rollback_to_checkpoint(self.checkpoints[-2].id)
                break
            
            prev_error_count = error_count
            
            # Apply fixes
            fixed_count = self._apply_fixes(errors)
            ColoredLogger.info(f"Applied {fixed_count} fixes")
            
            if fixed_count == 0:
                ColoredLogger.warning("No fixes applied this iteration")
                break
            
            # Verify fixes didn't break anything
            if not self.dry_run:
                new_errors, _ = self.tsc.run()
                if len(new_errors) > error_count:
                    ColoredLogger.error(f"Errors increased from {error_count} to {len(new_errors)}")
                    ColoredLogger.info("Rolling back...")
                    self._rollback_to_checkpoint(self.current_checkpoint.id)
                    break
            
            # Create checkpoint for this iteration
            self._create_checkpoint(f"Iteration {iteration} complete")
        
        # Generate final report
        self._generate_reports()
        
        return True
    
    def _check_git_branch(self) -> bool:
        """Check if we're on a git branch."""
        try:
            result = subprocess.run(
                ['git', 'branch', '--show-current'],
                cwd=self.project_root,
                capture_output=True,
                text=True
            )
            return result.returncode == 0 and result.stdout.strip() != ''
        except Exception:
            return False
    
    def _create_checkpoint(self, description: str) -> Checkpoint:
        """Create a checkpoint for rollback."""
        checkpoint_id = str(uuid.uuid4())[:8]
        
        # Get current file states
        file_states = {}
        for file_info in self.files_cache.values():
            file_states[file_info.relative_path] = file_info.hash
        
        # Get error count
        error_count = self.tsc.count_errors()
        
        checkpoint = Checkpoint(
            id=checkpoint_id,
            timestamp=datetime.now(),
            description=description,
            file_states=file_states,
            error_count=error_count,
            metadata={
                'stats': {
                    'fixed': self.stats.fixed,
                    'files_modified': len(self.stats.files_modified),
                }
            }
        )
        
        self.checkpoints.append(checkpoint)
        self.current_checkpoint = checkpoint
        
        # Save checkpoint to disk
        self.checkpoints_dir.mkdir(exist_ok=True)
        checkpoint_file = self.checkpoints_dir / f"{checkpoint_id}.json"
        with open(checkpoint_file, 'w') as f:
            json.dump({
                'id': checkpoint.id,
                'timestamp': checkpoint.timestamp.isoformat(),
                'description': checkpoint.description,
                'file_states': checkpoint.file_states,
                'error_count': checkpoint.error_count,
                'metadata': checkpoint.metadata
            }, f, indent=2)
        
        ColoredLogger.debug(f"Checkpoint created: {checkpoint_id} ({description})")
        return checkpoint
    
    def _rollback_to_checkpoint(self, checkpoint_id: str) -> bool:
        """Rollback to a specific checkpoint."""
        # Find checkpoint
        checkpoint = None
        for cp in self.checkpoints:
            if cp.id == checkpoint_id:
                checkpoint = cp
                break
        
        if not checkpoint:
            ColoredLogger.error(f"Checkpoint not found: {checkpoint_id}")
            return False
        
        # Restore file states
        for rel_path, expected_hash in checkpoint.file_states.items():
            file_path = self.project_root / rel_path
            
            # Read current file
            current_info = self.fs.read_file(file_path)
            if not current_info:
                continue
            
            # Check if needs restoration
            if current_info.hash != expected_hash:
                # Find backup with matching hash
                backup_found = False
                for backup_file in self.backup_dir.glob(f"*.bak"):
                    try:
                        with open(backup_file, 'r') as f:
                            content = f.read()
                        backup_hash = hashlib.md5(content.encode()).hexdigest()
                        
                        if backup_hash == expected_hash:
                            self.fs.restore_backup(backup_file, file_path)
                            ColoredLogger.debug(f"Restored {rel_path} from backup")
                            backup_found = True
                            break
                    except Exception:
                        continue
                
                if not backup_found:
                    ColoredLogger.warning(f"No backup found for {rel_path}")
        
        # Update current checkpoint
        self.current_checkpoint = checkpoint
        
        ColoredLogger.info(f"Rolled back to checkpoint: {checkpoint_id}")
        return True
    
    def _apply_fixes(self, errors: List[TypeScriptError]) -> int:
        """Apply fixes in the correct order."""
        fixed_count = 0
        
        # Group errors by category and file
        errors_by_category = defaultdict(lambda: defaultdict(list))
        for error in errors:
            errors_by_category[error.category][error.file].append(error)
        
        # Fix order: SYNTAX -> IMPORT -> TYPE_IDENTITY -> ANY_CAST -> G_STUDIO_CORE
        category_order = [
            FixCategory.SYNTAX,
            FixCategory.IMPORT,
            FixCategory.TYPE_IDENTITY,
            FixCategory.ANY_CAST,
            FixCategory.G_STUDIO_CORE,
        ]
        
        for category in category_order:
            if category not in errors_by_category:
                continue
            
            # Process each file
            for file_path, file_errors in errors_by_category[category].items():
                # Load file
                full_path = self.project_root / file_path
                if not full_path.exists():
                    continue
                
                if file_path not in self.files_cache:
                    file_info = self.fs.read_file(full_path)
                    if not file_info:
                        continue
                    self.files_cache[file_path] = file_info
                else:
                    file_info = self.files_cache[file_path]
                
                # Sort errors by line number descending (bottom-up)
                file_errors.sort(key=lambda e: -e.line)
                
                # Apply fixes for each error
                for error in file_errors:
                    result = None
                    
                    # Apply general fixes first
                    if category == FixCategory.SYNTAX and error.code == 'TS1308':
                        result = self.general_fixer.fix_ts1308_await_non_async(error, file_info)
                    
                    elif category == FixCategory.IMPORT:
                        if error.code == 'TS2305':
                            result = self.general_fixer.fix_ts2305_no_exported_member(error, file_info)
                        elif error.code == 'TS2551':
                            result = self.general_fixer.fix_ts2551_typo_suggestion(error, file_info)
                    
                    elif category == FixCategory.TYPE_IDENTITY:
                        if error.code == 'TS18048':
                            result = self.general_fixer.fix_ts18048_possibly_undefined(error, file_info)
                        elif error.code == 'TS7053':
                            result = self.general_fixer.fix_ts7053_element_access(error, file_info)
                        elif error.code == 'TS2578':
                            result = self.general_fixer.fix_ts2578_unused_variable(error, file_info)
                        elif error.code == 'TS2564':
                            result = self.general_fixer.fix_ts2564_not_initialized(error, file_info)
                    
                    elif category == FixCategory.ANY_CAST:
                        if error.code == 'TS2339':
                            result = self.general_fixer.fix_ts2339_property_not_exist(error, file_info)
                        elif error.code == 'TS2322':
                            result = self.general_fixer.fix_ts2322_type_mismatch(error, file_info)
                        elif error.code == 'TS2345':
                            result = self.general_fixer.fix_ts2345_argument_mismatch(error, file_info)
                    
                    elif category == FixCategory.G_STUDIO_CORE:
                        # Apply G-Studio core fixes (these handle multiple errors at once)
                        gstudio_results = []
                        
                        # Check which G-Studio fix to apply based on file
                        if 'App.tsx' in file_path or 'EditorLayout.tsx' in file_path:
                            gstudio_results.extend(self.gstudio_fixer.fix_duplicate_filedata_import(file_info))
                        
                        if 'AISettingsHub' in file_path:
                            gstudio_results.extend(self.gstudio_fixer.fix_duplicate_aiconfig_import(file_info))
                            gstudio_results.extend(self.gstudio_fixer.consolidate_aiconfig(file_info))
                        
                        if 'additional.ts' in file_path:
                            gstudio_results.extend(self.gstudio_fixer.fix_duplicate_limittype(file_info))
                        
                        if 'projectStore' in file_path.lower():
                            gstudio_results.extend(self.gstudio_fixer.fix_projectstore_files_type(file_info))
                        
                        if 'geminiService' in file_path.lower():
                            gstudio_results.extend(self.gstudio_fixer.fix_gemini_api_cast(file_info))
                            gstudio_results.extend(self.gstudio_fixer.fix_toolcall_args_to_arguments(file_info))
                        
                        if 'MainLayout' in file_path:
                            gstudio_results.extend(self.gstudio_fixer.fix_broken_jsx_comments(file_info))
                        
                        if 'VirtualizedMessageList' in file_path:
                            gstudio_results.extend(self.gstudio_fixer.fix_autosizer_props(file_info))
                        
                        if 'ModalManager' in file_path:
                            gstudio_results.extend(self.gstudio_fixer.fix_modal_manager_props(file_info))
                        
                        if 'ToolUsageAnalyticsModal' in file_path:
                            gstudio_results.extend(self.gstudio_fixer.fix_object_keys_undefined(file_info))
                        
                        if 'streamProcessor' in file_path.lower():
                            gstudio_results.extend(self.gstudio_fixer.fix_duplicate_object_properties(file_info))
                        
                        # Apply FileData import unification to all files
                        gstudio_results.extend(self.gstudio_fixer.unify_filedata_imports(file_info))
                        
                        if gstudio_results:
                            result = gstudio_results[0]  # Track first result
                            fixed_count += len(gstudio_results)
                            self.results.extend(gstudio_results)
                            
                            # Update stats
                            for gr in gstudio_results:
                                self._update_stats(gr)
                    
                    if result:
                        self.results.append(result)
                        fixed_count += 1
                        self._update_stats(result)
                        
                        # Write file if changed and not dry run
                        if result.success and not self.dry_run:
                            self.fs.write_file(file_info, create_backup=False)
                            self.stats.files_modified.add(file_path)
        
        return fixed_count
    
    def _update_stats(self, result: FixResult):
        """Update statistics based on fix result."""
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
    
    def _generate_reports(self):
        """Generate final reports."""
        ColoredLogger.header("Generating Reports")
        
        # Get final error count
        final_errors, tsc_output = self.tsc.run()
        final_error_count = len(final_errors)
        
        # Generate JSON report
        report_data = {
            'project': str(self.project_root),
            'timestamp': datetime.now().isoformat(),
            'dry_run': self.dry_run,
            'summary': {
                'total_errors_processed': self.stats.total_errors,
                'fixed': self.stats.fixed,
                'skipped_scope': self.stats.skipped_scope,
                'skipped_permission': self.stats.skipped_permission,
                'skipped_other': self.stats.skipped_other,
                'remaining_errors': final_error_count,
                'iterations': self.stats.iterations,
                'files_modified': len(self.stats.files_modified),
            },
            'stats_by_category': {k.value: v for k, v in self.stats.by_category.items()},
            'stats_by_scope': {k.value: v for k, v in self.stats.by_scope.items()},
            'stats_by_permission': {k.value: v for k, v in self.stats.by_permission.items()},
            'fix_details': [
                {
                    'file': r.file_path,
                    'line': r.line,
                    'code': r.code,
                    'action': r.action,
                    'success': r.success,
                    'category': r.category.value,
                    'permission': r.permission.value,
                    'scope': r.scope.value,
                    'timestamp': r.timestamp.isoformat(),
                    'fix_id': r.fix_id,
                }
                for r in self.results
            ],
            'remaining_errors': [
                {
                    'file': e.file,
                    'line': e.line,
                    'code': e.code,
                    'message': e.message,
                }
                for e in final_errors[:100]  # Limit to first 100
            ],
            'files_modified': list(self.stats.files_modified),
        }
        
        # Save JSON report
        json_report = self.project_root / 'ts_fixer_report.json'
        with open(json_report, 'w') as f:
            json.dump(report_data, f, indent=2)
        ColoredLogger.success(f"JSON report saved: {json_report}")
        
        # Save TSC output
        tsc_output_file = self.project_root / 'tsc_final_output.txt'
        with open(tsc_output_file, 'w') as f:
            f.write(tsc_output)
        
        # Generate Markdown report
        md_report = self.project_root / 'ts_fixer_report.md'
        with open(md_report, 'w') as f:
            f.write(f"# TypeScript Fixer Report\n\n")
            f.write(f"**Generated:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            f.write(f"**Project:** `{self.project_root}`\n")
            f.write(f"**Dry run:** {self.dry_run}\n\n")
            
            f.write("## Summary\n\n")
            f.write(f"- **Total errors processed:** {self.stats.total_errors}\n")
            f.write(f"- **Fixed:** {self.stats.fixed}\n")
            f.write(f"- **Skipped (scope):** {self.stats.skipped_scope}\n")
            f.write(f"- **Skipped (permission):** {self.stats.skipped_permission}\n")
            f.write(f"- **Skipped (other):** {self.stats.skipped_other}\n")
            f.write(f"- **Remaining errors:** {final_error_count}\n")
            f.write(f"- **Iterations:** {self.stats.iterations}\n")
            f.write(f"- **Files modified:** {len(self.stats.files_modified)}\n\n")
            
            f.write("## Statistics\n\n")
            f.write("### By Category\n")
            for category, count in self.stats.by_category.items():
                f.write(f"- **{category.value}:** {count}\n")
            
            f.write("\n### By Scope\n")
            for scope, count in self.stats.by_scope.items():
                f.write(f"- **{scope.value}:** {count}\n")
            
            f.write("\n### By Permission\n")
            for permission, count in self.stats.by_permission.items():
                f.write(f"- **{permission.value}:** {count}\n")
            
            f.write("\n## Fix Details\n\n")
            successful_fixes = [r for r in self.results if r.success]
            if successful_fixes:
                f.write("### Successful Fixes\n")
                f.write("| File | Line | Code | Action | Scope |\n")
                f.write("|------|------|------|--------|-------|\n")
                for fix in successful_fixes[:50]:  # Show first 50
                    f.write(f"| `{fix.file_path}` | {fix.line} | `{fix.code}` | {fix.action} | {fix.scope.value} |\n")
                if len(successful_fixes) > 50:
                    f.write(f"| ... and {len(successful_fixes) - 50} more fixes |\n")
            
            failed_fixes = [r for r in self.results if not r.success]
            if failed_fixes:
                f.write("\n### Skipped Fixes\n")
                f.write("| File | Line | Code | Reason |\n")
                f.write("|------|------|------|--------|\n")
                for fix in failed_fixes[:20]:  # Show first 20
                    reason = fix.error_message or f"{fix.permission.value} in {fix.scope.value}"
                    f.write(f"| `{fix.file_path}` | {fix.line} | `{fix.code}` | {reason} |\n")
            
            if final_errors:
                f.write("\n## Remaining Errors\n\n")
                f.write(f"**Total remaining:** {final_error_count}\n\n")
                f.write("| File | Line | Code | Message |\n")
                f.write("|------|------|------|---------|\n")
                for error in final_errors[:30]:  # Show first 30
                    f.write(f"| `{error.file}` | {error.line} | `{error.code}` | {error.message[:100]}... |\n")
        
        ColoredLogger.success(f"Markdown report saved: {md_report}")
        
        # Print summary to console
        ColoredLogger.header("FINAL SUMMARY")
        ColoredLogger.info(f"Total errors processed: {self.stats.total_errors}")
        ColoredLogger.info(f"Fixed: {self.stats.fixed}")
        ColoredLogger.info(f"Skipped (scope): {self.stats.skipped_scope}")
        ColoredLogger.info(f"Skipped (permission): {self.stats.skipped_permission}")
        ColoredLogger.info(f"Remaining errors: {final_error_count}")
        
        if final_error_count > 0:
            ColoredLogger.warning(f"⚠️  {final_error_count} errors remain")
            error_dist = defaultdict(int)
            for error in final_errors:
                error_dist[error.code] += 1
            
            ColoredLogger.info("Remaining errors by type:")
            for code, count in sorted(error_dist.items(), key=lambda x: (-x[1], x[0])):
                ColoredLogger.info(f"  {code}: {count}")


# ============================================================================
# COMMAND LINE INTERFACE
# ============================================================================

def main():
    parser = argparse.ArgumentParser(
        description='TypeScript Architectural Fixer for G-Studio Projects',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --project /path/to/project      # Fix errors
  %(prog)s --dry-run                       # Simulate without changes
  %(prog)s --rollback abc123              # Rollback to checkpoint
  %(prog)s --list-checkpoints             # List available checkpoints
        """
    )
    
    parser.add_argument('--project', '-p', default='.',
                       help='Project root directory (default: current)')
    parser.add_argument('--dry-run', '-n', action='store_true',
                       help='Simulate fixes without modifying files')
    parser.add_argument('--rollback', type=str,
                       help='Rollback to specific checkpoint ID')
    parser.add_argument('--list-checkpoints', action='store_true',
                       help='List available checkpoints')
    parser.add_argument('--clean', action='store_true',
                       help='Clean up backup and checkpoint directories')
    
    args = parser.parse_args()
    
    project_root = Path(args.project).resolve()
    if not project_root.exists():
        ColoredLogger.error(f"Project directory not found: {project_root}")
        sys.exit(1)
    
    # Handle special commands
    if args.list_checkpoints:
        checkpoints_dir = project_root / '.ts_fixer_checkpoints'
        if checkpoints_dir.exists():
            checkpoint_files = list(checkpoints_dir.glob('*.json'))
            if checkpoint_files:
                ColoredLogger.header("Available Checkpoints")
                for cf in sorted(checkpoint_files, key=lambda x: x.stat().st_mtime, reverse=True):
                    try:
                        with open(cf, 'r') as f:
                            data = json.load(f)
                        print(f"{cf.stem}: {data.get('description', 'Unknown')} "
                              f"({data.get('timestamp', 'Unknown')})")
                    except Exception:
                        print(f"{cf.stem}: (corrupted)")
            else:
                ColoredLogger.info("No checkpoints found")
        else:
            ColoredLogger.info("No checkpoints found")
        sys.exit(0)
    
    if args.clean:
        backup_dir = project_root / '.ts_fixer_backups'
        checkpoints_dir = project_root / '.ts_fixer_checkpoints'
        
        for dir_path in [backup_dir, checkpoints_dir]:
            if dir_path.exists():
                try:
                    shutil.rmtree(dir_path)
                    ColoredLogger.success(f"Cleaned up {dir_path}")
                except Exception as e:
                    ColoredLogger.error(f"Failed to clean {dir_path}: {e}")
        
        sys.exit(0)
    
    if args.rollback:
        fixer = TypeScriptArchitecturalFixer(project_root, dry_run=False)
        if fixer._rollback_to_checkpoint(args.rollback):
            ColoredLogger.success(f"Successfully rolled back to checkpoint: {args.rollback}")
        else:
            ColoredLogger.error(f"Failed to rollback to checkpoint: {args.rollback}")
        sys.exit(0)
    
    # Run the fixer
    try:
        fixer = TypeScriptArchitecturalFixer(project_root, dry_run=args.dry_run)
        success = fixer.run()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        ColoredLogger.warning("Interrupted by user")
        sys.exit(130)
    except Exception as e:
        ColoredLogger.error(f"Unexpected error: {e}")
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()