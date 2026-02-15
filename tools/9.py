#!/usr/bin/env python3
"""
G-Studio Ultimate TypeScript Error Fixer v18.1.0
================================================
یک ابزار پیشرفته برای تحلیل و رفع خطاهای TypeScript در پروژه‌های G-Studio
با قابلیت شناسایی و رفع خودکار خطاهای رایج TypeScript
"""

import os
import re
import json
import shutil
import argparse
import sys
import hashlib
import time
import subprocess
import traceback
import fnmatch
import difflib
import textwrap
from pathlib import Path
from typing import Dict, List, Tuple, Set, Optional, Any, Union, Callable
from dataclasses import dataclass, field, asdict
from datetime import datetime
from collections import defaultdict, Counter
from threading import Lock
import concurrent.futures

# ==============================================================================
# پیکربندی بهبودیافته
# ==============================================================================

VERSION = "18.1.0"
PROJECT_NAME = "G-Studio TypeScript Fixer"

# پیکربندی متمرکز بر خطاهای گزارش‌شده
CONFIG = {
    "project": {
        "name": "G-Studio TypeScript Fixer",
        "version": VERSION,
        "extensions": [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".d.ts"],
        "exclude_patterns": [
            "node_modules", ".git", "dist", "build", "coverage", ".next", ".vite",
            "__pycache__", ".cache", "public", ".codefixer_backups", "__archive__",
            "*.backup.*", ".turbo", ".parcel-cache", "backups"
        ],
        "backup_dir": ".ts_fixer_backups",
        "log_file": "ts_fixer.log"
    },
    "errors": {
        # خطاهای گزارش‌شده با اولویت
        "priority_codes": {
            "TS2322": "Type assignment mismatch - نیاز به تطبیق نوع",
            "TS2339": "Property does not exist - ویژگی وجود ندارد",
            "TS7006": "Parameter implicitly has 'any' type - پارامتر نوع any دارد",
            "TS2345": "Argument type mismatch - عدم تطبیق نوع آرگومان",
            "TS2353": "Object literal unknown properties - ویژگی‌های ناشناخته شیء",
            "TS2304": "Cannot find name - نام پیدا نمی‌شود",
            "TS18048": "Possibly undefined - ممکن است undefined باشد",
            "TS2367": "Unintentional comparison - مقایسه ناخواسته",
            "TS2551": "Property typo - اشتباه تایپی در ویژگی",
            "TS2739": "Missing required properties - ویژگی‌های الزامی کم است"
        },
        "fix_strategies": {
            "TS2322": ["type_assertion", "type_adjustment", "interface_fix"],
            "TS2339": ["optional_chaining", "type_extension", "property_add"],
            "TS7006": ["add_type_annotation", "infer_type", "any_type"],
            "TS2345": ["type_cast", "argument_fix", "function_overload"],
            "TS2353": ["exact_type", "index_signature", "type_ignore"],
            "TS2304": ["add_import", "declare_variable", "fix_typo"],
            "TS18048": ["optional_chaining", "null_check", "default_value"],
            "TS2367": ["type_guard", "strict_check", "comment"],
            "TS2551": ["fix_typo", "suggest_correction"],
            "TS2739": ["add_properties", "partial_type", "type_assertion"]
        }
    },
    "analysis": {
        "max_workers": min(8, os.cpu_count() or 4),
        "timeout_seconds": 300,
        "batch_size": 50,
        "checkpoint_interval": 100
    },
    "fixes": {
        "enable_safe_fixes": True,
        "enable_risky_fixes": False,
        "backup_before_fix": True,
        "max_fixes_per_file": 100,
        "test_after_fix": True,
        "dry_run_first": False
    }
}

# متغیرهای سراسری
EXCLUDE_DIRS = set(CONFIG["project"]["exclude_patterns"])
VALID_EXTENSIONS = set(CONFIG["project"]["extensions"])
PRIORITY_CODES = CONFIG["errors"]["priority_codes"]
FIX_STRATEGIES = CONFIG["errors"]["fix_strategies"]

# ==============================================================================
# مدل‌های داده
# ==============================================================================

@dataclass
class TypeScriptError:
    """نمایش خطای TypeScript"""
    file_path: str
    line_number: int
    column: int
    error_code: str
    message: str
    severity: str = "error"
    context: Optional[str] = None
    suggested_fix: Optional[str] = None
    fix_confidence: float = 0.0
    is_fixable: bool = False
    fixed: bool = False
    category: str = "type"
    
    def __post_init__(self):
        # تعیین قابلیت رفع خودکار
        self.is_fixable = self.error_code in FIX_STRATEGIES
        # تعیین اطمینان بر اساس نوع خطا
        if self.error_code in ["TS7006", "TS2304", "TS2551"]:
            self.fix_confidence = 0.9
        elif self.error_code in ["TS2322", "TS2339", "TS2345"]:
            self.fix_confidence = 0.7
        elif self.error_code in ["TS2353", "TS2739", "TS18048"]:
            self.fix_confidence = 0.5
        else:
            self.fix_confidence = 0.3

@dataclass
class FixResult:
    """نتایج رفع خطا"""
    file_path: str
    error_code: str
    original_line: str
    fixed_line: str
    success: bool
    error_message: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self):
        return asdict(self)

@dataclass 
class FileAnalysis:
    """تحلیل یک فایل"""
    path: str
    total_errors: int = 0
    errors_by_code: Dict[str, int] = field(default_factory=dict)
    error_details: List[TypeScriptError] = field(default_factory=list)
    fixes_applied: List[FixResult] = field(default_factory=list)
    backup_path: Optional[str] = None
    
    def add_error(self, error: TypeScriptError):
        self.error_details.append(error)
        self.total_errors += 1
        self.errors_by_code[error.error_code] = self.errors_by_code.get(error.error_code, 0) + 1

@dataclass
class ProjectReport:
    """گزارش کامل پروژه"""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    total_files: int = 0
    total_errors: int = 0
    files_with_errors: int = 0
    errors_by_code: Dict[str, int] = field(default_factory=dict)
    top_files_by_errors: List[Dict[str, Any]] = field(default_factory=list)
    file_analyses: Dict[str, FileAnalysis] = field(default_factory=dict)
    fixes_applied: int = 0
    fixes_failed: int = 0
    
    def generate_summary(self) -> str:
        """ایجاد خلاصه گزارش"""
        lines = [
            "=" * 70,
            f"گزارش تحلیل خطاهای TypeScript",
            f"تاریخ تولید: {self.timestamp}",
            "=" * 70,
            f"تعداد فایل‌ها: {self.total_files}",
            f"فایل‌های دارای خطا: {self.files_with_errors}",
            f"کل خطاها: {self.total_errors}",
            f"رفع‌شده: {self.fixes_applied}",
            f"ناموفق: {self.fixes_failed}",
            "",
            "توزیع خطاها بر اساس کد:"
        ]
        
        for code, count in sorted(self.errors_by_code.items(), key=lambda x: x[1], reverse=True):
            desc = PRIORITY_CODES.get(code, "خطای ناشناخته")
            lines.append(f"  {code}: {count} ({desc})")
        
        lines.extend([
            "",
            "10 فایل با بیشترین خطا:"
        ])
        
        for i, file_info in enumerate(self.top_files_by_errors[:10], 1):
            lines.append(f"  {i}. {file_info['path']}: {file_info['error_count']} خطا")
        
        lines.append("=" * 70)
        return "\n".join(lines)

# ==============================================================================
# سیستم لاگینگ
# ==============================================================================

class Logger:
    """سیستم لاگینگ با رنگ"""
    
    class Color:
        RED = '\033[91m'
        GREEN = '\033[92m'
        YELLOW = '\033[93m'
        BLUE = '\033[94m'
        MAGENTA = '\033[95m'
        CYAN = '\033[96m'
        WHITE = '\033[97m'
        BOLD = '\033[1m'
        RESET = '\033[0m'
    
    @staticmethod
    def info(msg: str):
        print(f"{Logger.Color.CYAN}[ℹ] {msg}{Logger.Color.RESET}")
    
    @staticmethod
    def success(msg: str):
        print(f"{Logger.Color.GREEN}{Logger.Color.BOLD}[✓] {msg}{Logger.Color.RESET}")
    
    @staticmethod
    def warning(msg: str):
        print(f"{Logger.Color.YELLOW}[⚠] {msg}{Logger.Color.RESET}")
    
    @staticmethod
    def error(msg: str):
        print(f"{Logger.Color.RED}{Logger.Color.BOLD}[✗] {msg}{Logger.Color.RESET}")
    
    @staticmethod
    def debug(msg: str):
        print(f"{Logger.Color.MAGENTA}[•] {msg}{Logger.Color.RESET}")
    
    @staticmethod
    def header(msg: str):
        print(f"\n{Logger.Color.BLUE}{Logger.Color.BOLD}{'='*60}")
        print(f"{msg}")
        print(f"{'='*60}{Logger.Color.RESET}\n")

# ==============================================================================
# ابزارهای کمکی
# ==============================================================================

class FileUtils:
    """ابزارهای کار با فایل"""
    
    @staticmethod
    def safe_read(file_path: Path) -> str:
        """خواندن ایمن فایل"""
        try:
            return file_path.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            # تلاش با encoding‌های دیگر
            for enc in ['utf-8-sig', 'latin-1', 'cp1252']:
                try:
                    return file_path.read_text(encoding=enc)
                except:
                    continue
            return ""
        except Exception:
            return ""
    
    @staticmethod
    def safe_write(file_path: Path, content: str) -> bool:
        """نوشتن ایمن فایل با پشتیبان‌گیری"""
        try:
            # ایجاد پشتیبان
            if file_path.exists():
                backup_path = file_path.with_suffix(f"{file_path.suffix}.backup")
                shutil.copy2(file_path, backup_path)
            
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(content, encoding='utf-8')
            return True
        except Exception as e:
            Logger.error(f"خطا در نوشتن فایل {file_path}: {e}")
            return False
    
    @staticmethod
    def find_typescript_files(root: Path) -> List[Path]:
        """یافتن فایل‌های TypeScript"""
        files = []
        for dirpath, dirnames, filenames in os.walk(root):
            # حذف دایرکتوری‌های غیرضروری
            dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIRS]
            
            for filename in filenames:
                if any(filename.endswith(ext) for ext in VALID_EXTENSIONS):
                    file_path = Path(dirpath) / filename
                    files.append(file_path)
        return files
    
    @staticmethod
    def create_backup(file_path: Path, backup_dir: Path) -> Optional[Path]:
        """ایجاد پشتیبان از فایل"""
        try:
            backup_dir.mkdir(parents=True, exist_ok=True)
            rel_path = file_path.relative_to(file_path.parents[-len(backup_dir.parts)])
            backup_path = backup_dir / rel_path
            backup_path.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(file_path, backup_path)
            return backup_path
        except Exception:
            return None

class TypeScriptParser:
    """پارسر خطاهای TypeScript"""
    
    ERROR_PATTERN = re.compile(
        r'^(.+?)\((\d+),(\d+)\):\s+(error|warning)\s+(TS\d+):\s+(.+)$',
        re.MULTILINE
    )
    
    @classmethod
    def parse_tsc_output(cls, output: str) -> Dict[str, List[TypeScriptError]]:
        """پارس خروجی tsc"""
        errors_by_file = defaultdict(list)
        
        for match in cls.ERROR_PATTERN.finditer(output):
            file_path, line, col, severity, code, message = match.groups()
            
            # نرمال‌سازی مسیر فایل
            file_path = file_path.replace('\\', '/')
            
            error = TypeScriptError(
                file_path=file_path,
                line_number=int(line),
                column=int(col),
                error_code=code,
                message=message.strip(),
                severity=severity
            )
            
            errors_by_file[file_path].append(error)
        
        return dict(errors_by_file)
    
    @classmethod
    def run_tsc_check(cls, project_root: Path) -> Dict[str, List[TypeScriptError]]:
        """اجرای بررسی TypeScript"""
        try:
            cmd = ["npx", "tsc", "--noEmit", "--pretty", "false"]
            result = subprocess.run(
                cmd,
                cwd=str(project_root),
                capture_output=True,
                text=True,
                timeout=300
            )
            
            output = result.stdout + result.stderr
            return cls.parse_tsc_output(output)
            
        except subprocess.TimeoutExpired:
            Logger.error("زمان بررسی TypeScript به پایان رسید")
            return {}
        except Exception as e:
            Logger.error(f"خطا در اجرای tsc: {e}")
            return {}

# ==============================================================================
# سیستم رفع خطا
# ==============================================================================

class TypeScriptErrorFixer:
    """سیستم رفع خطاهای TypeScript"""
    
    def __init__(self, project_root: Path, dry_run: bool = False):
        self.project_root = project_root
        self.dry_run = dry_run
        self.backup_dir = project_root / CONFIG["project"]["backup_dir"]
        
    def fix_ts2322(self, content: str, error: TypeScriptError) -> Tuple[str, bool]:
        """رفع خطای TS2322: عدم تطبیق نوع"""
        lines = content.split('\n')
        if error.line_number > len(lines):
            return content, False
        
        target_line = lines[error.line_number - 1]
        
        # شناسایی الگوهای رایج
        patterns = [
            (r"Type '([^']+)' is not assignable to type '([^']+)'", "type_mismatch"),
            (r"Type '([^']+)' is not assignable to type 'IntrinsicAttributes", "react_props")
        ]
        
        for pattern, fix_type in patterns:
            match = re.search(pattern, error.message)
            if match:
                if fix_type == "react_props":
                    # برای خطاهای React props
                    return self._fix_react_props(lines, error.line_number - 1, target_line), True
        
        # راه‌حل عمومی: اضافه کردن type assertion
        if ':' in target_line and '=' in target_line:
            # پیدا کردن متغیر
            var_match = re.search(r'(\w+)\s*:\s*\w+\s*=', target_line)
            if var_match:
                var_name = var_match.group(1)
                # اضافه کردن as any به انتهای خط
                fixed_line = target_line.rstrip()
                if not fixed_line.endswith(';'):
                    fixed_line += ';'
                fixed_line = fixed_line.replace(';', ' as any;')
                lines[error.line_number - 1] = fixed_line
                return '\n'.join(lines), True
        
        return content, False
    
    def fix_ts2339(self, content: str, error: TypeScriptError) -> Tuple[str, bool]:
        """رفع خطای TS2339: ویژگی وجود ندارد"""
        lines = content.split('\n')
        if error.line_number > len(lines):
            return content, False
        
        target_line = lines[error.line_number - 1]
        
        # استخراج نام ویژگی
        match = re.search(r"Property '(\w+)' does not exist on type", error.message)
        if not match:
            return content, False
        
        prop_name = match.group(1)
        
        # اضافه کردن optional chaining
        if f'.{prop_name}' in target_line:
            fixed_line = target_line.replace(f'.{prop_name}', f'?.{prop_name}')
            lines[error.line_number - 1] = fixed_line
            return '\n'.join(lines), True
        
        return content, False
    
    def fix_ts7006(self, content: str, error: TypeScriptError) -> Tuple[str, bool]:
        """رفع خطای TS7006: پارامتر any به صورت ضمنی"""
        lines = content.split('\n')
        if error.line_number > len(lines):
            return content, False
        
        target_line = lines[error.line_number - 1]
        
        # پیدا کردن نام پارامتر
        match = re.search(r"Parameter '(\w+)' implicitly has an 'any' type", error.message)
        if not match:
            return content, False
        
        param_name = match.group(1)
        
        # اضافه کردن نوع any به پارامتر
        if f'({param_name})' in target_line or f' {param_name} ' in target_line:
            # جایگزینی در function declaration
            patterns = [
                (rf'function\s+\w+\s*\(\s*{param_name}\s*\)', f'function {{0}}({param_name}: any)'),
                (rf'\(\s*{param_name}\s*\)\s*=>', f'({param_name}: any) =>'),
                (rf'\b{param_name}\b(?=\s*,|\s*\)|\s*:\s*[^{{])', f'{param_name}: any')
            ]
            
            for pattern, replacement in patterns:
                if re.search(pattern, target_line):
                    fixed_line = re.sub(pattern, replacement, target_line)
                    lines[error.line_number - 1] = fixed_line
                    return '\n'.join(lines), True
        
        return content, False
    
    def fix_ts2304(self, content: str, error: TypeScriptError) -> Tuple[str, bool]:
        """رفع خطای TS2304: نام پیدا نمی‌شود"""
        lines = content.split('\n')
        if error.line_number > len(lines):
            return content, False
        
        target_line = lines[error.line_number - 1]
        
        # استخراج نام گمشده
        match = re.search(r"Cannot find name '(\w+)'", error.message)
        if not match:
            return content, False
        
        missing_name = match.group(1)
        
        # بررسی اگر نام با on شروع شود (احتمالاً تابع event handler است)
        if missing_name.startswith('on') and missing_name[2:3].isupper():
            # اضافه کردن تعریف تابع
            func_def = f"\nconst {missing_name} = () => {{}};\n"
            # پیدا کردن مناسب‌ترین مکان برای درج
            lines.insert(error.line_number - 1, func_def)
            return '\n'.join(lines), True
        
        # اضافه کردن declare در بالای فایل
        if self.dry_run:
            return content, True  # فقط برای نمایش
        
        return content, False
    
    def fix_ts2353(self, content: str, error: TypeScriptError) -> Tuple[str, bool]:
        """رفع خطای TS2353: ویژگی‌های ناشناخته شیء"""
        lines = content.split('\n')
        if error.line_number > len(lines):
            return content, False
        
        target_line = lines[error.line_number - 1]
        
        # اضافه کردن type assertion
        if ':' in target_line and '}' in target_line:
            # پیدا کردن موقعیت }
            brace_pos = target_line.find('}')
            if brace_pos > 0:
                fixed_line = target_line[:brace_pos] + '} as any' + target_line[brace_pos+1:]
                lines[error.line_number - 1] = fixed_line
                return '\n'.join(lines), True
        
        return content, False
    
    def fix_ts18048(self, content: str, error: TypeScriptError) -> Tuple[str, bool]:
        """رفع خطای TS18048: ممکن است undefined باشد"""
        lines = content.split('\n')
        if error.line_number > len(lines):
            return content, False
        
        target_line = lines[error.line_number - 1]
        
        # استخراج نام متغیر
        match = re.search(r"'(\w+(?:\.\w+)*)' is possibly 'undefined'", error.message)
        if not match:
            return content, False
        
        var_path = match.group(1)
        parts = var_path.split('.')
        
        # اضافه کردن optional chaining یا null check
        for i in range(1, len(parts) + 1):
            test_var = '.'.join(parts[:i])
            if test_var in target_line:
                # جایگزینی با optional chaining
                if f'{test_var}.' in target_line:
                    fixed_line = target_line.replace(f'{test_var}.', f'{test_var}?.')
                    lines[error.line_number - 1] = fixed_line
                    return '\n'.join(lines), True
        
        return content, False
    
    def _fix_react_props(self, lines: List[str], line_idx: int, target_line: str) -> str:
        """رفع خطاهای React props"""
        # اضافه کردن spread operator برای props اضافی
        if 'IntrinsicAttributes' in target_line and '{' in target_line and '}' in target_line:
            # پیدا کردن موقعیت }
            brace_pos = target_line.find('}')
            if brace_pos > 0:
                # اضافه کردن ...rest
                fixed_line = target_line[:brace_pos] + ', ...props' + target_line[brace_pos:]
                lines[line_idx] = fixed_line
                
                # اضافه کردن destructuring در تابع
                for i in range(line_idx + 1, min(line_idx + 10, len(lines))):
                    if 'function' in lines[i] or 'const' in lines[i]:
                        if '(' in lines[i] and ')' in lines[i]:
                            # اضافه کردن props به پارامترها
                            lines[i] = lines[i].replace(')', ', props)')
                            break
        
        return '\n'.join(lines)
    
    def apply_fix(self, file_path: Path, error: TypeScriptError) -> FixResult:
        """اعمال رفع خطا برای یک خطای خاص"""
        try:
            content = FileUtils.safe_read(file_path)
            if not content:
                return FixResult(
                    file_path=str(file_path),
                    error_code=error.error_code,
                    original_line="",
                    fixed_line="",
                    success=False,
                    error_message="فایل خالی یا غیرقابل خواندن"
                )
            
            original_content = content
            success = False
            
            # انتخاب تابع رفع مناسب بر اساس کد خطا
            fix_functions = {
                "TS2322": self.fix_ts2322,
                "TS2339": self.fix_ts2339,
                "TS7006": self.fix_ts7006,
                "TS2304": self.fix_ts2304,
                "TS2353": self.fix_ts2353,
                "TS18048": self.fix_ts18048,
                "TS2345": self.fix_ts2322,  # استفاده از همان تابع TS2322
                "TS2367": self.fix_ts2353,  # استفاده از همان تابع TS2353
                "TS2551": self.fix_ts2339,  # استفاده از همان تابع TS2339
                "TS2739": self.fix_ts2322   # استفاده از همان تابع TS2322
            }
            
            fix_func = fix_functions.get(error.error_code)
            if fix_func:
                content, success = fix_func(content, error)
            
            if success and content != original_content:
                # ایجاد پشتیبان
                if not self.dry_run:
                    FileUtils.create_backup(file_path, self.backup_dir)
                    if FileUtils.safe_write(file_path, content):
                        error.fixed = True
                
                # پیدا کردن خط تغییر یافته
                original_lines = original_content.split('\n')
                new_lines = content.split('\n')
                original_line = original_lines[error.line_number - 1] if error.line_number <= len(original_lines) else ""
                fixed_line = new_lines[error.line_number - 1] if error.line_number <= len(new_lines) else ""
                
                return FixResult(
                    file_path=str(file_path),
                    error_code=error.error_code,
                    original_line=original_line,
                    fixed_line=fixed_line,
                    success=True
                )
            
            return FixResult(
                file_path=str(file_path),
                error_code=error.error_code,
                original_line="",
                fixed_line="",
                success=False,
                error_message="نتوانست خطا را رفع کند"
            )
            
        except Exception as e:
            return FixResult(
                file_path=str(file_path),
                error_code=error.error_code,
                original_line="",
                fixed_line="",
                success=False,
                error_message=str(e)
            )

# ==============================================================================
# تحلیل‌گر پروژه
# ==============================================================================

class ProjectAnalyzer:
    """تحلیل‌گر پروژه TypeScript"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.report = ProjectReport()
        self.fixer = TypeScriptErrorFixer(project_root, dry_run=True)
        
    def analyze_from_json(self, json_path: Path) -> ProjectReport:
        """تحلیل از فایل JSON گزارش"""
        Logger.header("در حال تحلیل گزارش JSON")
        
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            # پردازش داده‌های گزارش
            self.report.total_errors = data.get("total_errors", 0)
            self.report.total_files = data.get("total_files", 0)
            self.report.files_with_errors = data.get("files_with_errors", 0)
            
            # پردازش خطاها بر اساس کد
            for code_info in data.get("top_error_codes", []):
                if isinstance(code_info, list) and len(code_info) == 2:
                    code, count = code_info
                    self.report.errors_by_code[code] = count
            
            # پردازش فایل‌های دارای خطا
            for file_info in data.get("top_files_by_errors", []):
                path = file_info.get("relative_path", "")
                error_count = file_info.get("error_count", 0)
                
                self.report.top_files_by_errors.append({
                    "path": path,
                    "error_count": error_count
                })
                
                # تحلیل فایل
                file_path = self.project_root / path
                if file_path.exists():
                    analysis = FileAnalysis(path=path)
                    
                    # پردازش الگوهای خطا
                    for error_pattern in data.get("error_patterns", []):
                        if path in error_pattern.get("affected_files", []):
                            error = TypeScriptError(
                                file_path=path,
                                line_number=0,
                                column=0,
                                error_code=error_pattern["code"],
                                message=error_pattern["message_pattern"]
                            )
                            analysis.add_error(error)
                    
                    self.report.file_analyses[path] = analysis
            
            Logger.success(f"تجزیه و تحلیل گزارش کامل شد: {self.report.total_errors} خطا در {self.report.files_with_errors} فایل")
            return self.report
            
        except Exception as e:
            Logger.error(f"خطا در تحلیل JSON: {e}")
            return self.report
    
    def analyze_with_tsc(self) -> ProjectReport:
        """تحلیل با اجرای tsc"""
        Logger.header("در حال اجرای TypeScript Compiler")
        
        errors_by_file = TypeScriptParser.run_tsc_check(self.project_root)
        
        # شمارش فایل‌های TypeScript
        ts_files = FileUtils.find_typescript_files(self.project_root)
        self.report.total_files = len(ts_files)
        
        # پردازش خطاها
        for file_path_str, errors in errors_by_file.items():
            # تبدیل به مسیر نسبی
            try:
                abs_path = Path(file_path_str)
                if abs_path.is_absolute():
                    rel_path = str(abs_path.relative_to(self.project_root))
                else:
                    rel_path = file_path_str
                
                analysis = FileAnalysis(path=rel_path)
                
                for error in errors:
                    analysis.add_error(error)
                    self.report.total_errors += 1
                
                self.report.file_analyses[rel_path] = analysis
                
            except Exception:
                continue
        
        self.report.files_with_errors = len(errors_by_file)
        
        # شمارش خطاها بر اساس کد
        for analysis in self.report.file_analyses.values():
            for code, count in analysis.errors_by_code.items():
                self.report.errors_by_code[code] = self.report.errors_by_code.get(code, 0) + count
        
        # مرتب‌سازی فایل‌ها بر اساس تعداد خطا
        self.report.top_files_by_errors = [
            {
                "path": path,
                "error_count": analysis.total_errors
            }
            for path, analysis in self.report.file_analyses.items()
        ]
        self.report.top_files_by_errors.sort(key=lambda x: x["error_count"], reverse=True)
        
        return self.report
    
    def fix_priority_errors(self, dry_run: bool = True) -> Dict[str, Any]:
        """رفع خطاهای با اولویت"""
        Logger.header("رفع خطاهای با اولویت" + (" (حالت آزمایشی)" if dry_run else ""))
        
        self.fixer.dry_run = dry_run
        results = {
            "total_fixed": 0,
            "total_failed": 0,
            "by_file": {},
            "by_code": defaultdict(int)
        }
        
        # اولویت‌بندی خطاها
        priority_order = ["TS7006", "TS2304", "TS2339", "TS2322", "TS2353", "TS2345", "TS18048"]
        
        for code in priority_order:
            if code not in self.report.errors_by_code:
                continue
            
            Logger.info(f"در حال رفع خطاهای {code}...")
            
            for path, analysis in self.report.file_analyses.items():
                file_errors = [e for e in analysis.error_details if e.error_code == code and not e.fixed]
                
                if not file_errors:
                    continue
                
                file_path = self.project_root / path
                if not file_path.exists():
                    continue
                
                file_results = []
                for error in file_errors[:10]:  # حداکثر 10 خطا در هر فایل
                    result = self.fixer.apply_fix(file_path, error)
                    
                    if result.success:
                        results["total_fixed"] += 1
                        results["by_code"][code] += 1
                        error.fixed = True
                        analysis.fixes_applied.append(result)
                    else:
                        results["total_failed"] += 1
                    
                    file_results.append(result)
                
                if file_results:
                    results["by_file"][path] = file_results
        
        return results

# ==============================================================================
# رابط خط فرمان
# ==============================================================================

def main():
    """تابع اصلی"""
    parser = argparse.ArgumentParser(
        description="رفع‌کننده خطاهای TypeScript برای G-Studio",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    
    parser.add_argument(
        "--project",
        "-p",
        type=Path,
        default=Path.cwd(),
        help="مسیر پروژه"
    )
    
    parser.add_argument(
        "--report",
        "-r",
        type=Path,
        help="مسیر فایل گزارش JSON"
    )
    
    parser.add_argument(
        "--fix",
        "-f",
        action="store_true",
        help="اعمال رفع خطاها"
    )
    
    parser.add_argument(
        "--dry-run",
        "-d",
        action="store_true",
        help="اجرای آزمایشی بدون اعمال تغییرات"
    )
    
    parser.add_argument(
        "--analyze",
        "-a",
        action="store_true",
        help="تحلیل پروژه با tsc"
    )
    
    parser.add_argument(
        "--verbose",
        "-v",
        action="store_true",
        help="نمایش جزئیات بیشتر"
    )
    
    args = parser.parse_args()
    
    # نمایش عنوان
    Logger.header(f"G-Studio TypeScript Fixer v{VERSION}")
    
    # بررسی پروژه
    if not args.project.exists():
        Logger.error(f"پروژه یافت نشد: {args.project}")
        return 1
    
    Logger.info(f"پروژه: {args.project.absolute()}")
    
    # ایجاد تحلیل‌گر
    analyzer = ProjectAnalyzer(args.project)
    
    if args.report and args.report.exists():
        # تحلیل از گزارش JSON
        report = analyzer.analyze_from_json(args.report)
    elif args.analyze:
        # تحلیل با tsc
        report = analyzer.analyze_with_tsc()
    else:
        parser.print_help()
        return 0
    
    # نمایش خلاصه
    print(analyzer.report.generate_summary())
    
    # رفع خطاها
    if args.fix or args.dry_run:
        results = analyzer.fix_priority_errors(dry_run=args.dry_run or not args.fix)
        
        Logger.header("نتایج رفع خطا")
        Logger.info(f"خطاهای رفع‌شده: {results['total_fixed']}")
        Logger.info(f"خطاهای ناموفق: {results['total_failed']}")
        
        if args.verbose and results['by_code']:
            Logger.info("توزیع رفع خطاها:")
            for code, count in results['by_code'].items():
                desc = PRIORITY_CODES.get(code, "خطای ناشناخته")
                Logger.info(f"  {code}: {count} ({desc})")
        
        if args.dry_run:
            Logger.warning("این یک اجرای آزمایشی بود. تغییرات اعمال نشد.")
        else:
            Logger.success("رفع خطاها با موفقیت انجام شد.")
            
            # ذخیره گزارش
            report_path = args.project / "fix_report.json"
            with open(report_path, 'w', encoding='utf-8') as f:
                json.dump(asdict(analyzer.report), f, indent=2, ensure_ascii=False)
            
            Logger.info(f"گزارش ذخیره شد: {report_path}")
    
    return 0

# ==============================================================================
# اجرای برنامه
# ==============================================================================

if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        Logger.warning("\nعملیات توسط کاربر متوقف شد.")
        sys.exit(130)
    except Exception as e:
        Logger.error(f"خطای غیرمنتظره: {e}")
        if "--verbose" in sys.argv:
            traceback.print_exc()
        sys.exit(1)