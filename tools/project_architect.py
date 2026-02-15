#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
تحلیلگر هوشمند معماری پروژه - نسخه فارسی
Project Architect: Smart Codebase Analysis & Refactoring Tool
"""

import os
import json
import hashlib
import re
import ast
from pathlib import Path
from typing import Dict, List, Set, Tuple, Any, Optional
from dataclasses import dataclass, field
from collections import defaultdict
import statistics


@dataclass
class FileInfo:
    """اطلاعات کامل یک فایل"""
    path: str
    full_path: Path
    type: str
    size: int
    lines: int
    imports: List[str]
    exports: List[str]
    functions: List[str]
    classes: List[str]
    components: List[str]
    hooks: List[str]
    complexity: int
    hash: str
    dependencies: Set[str] = field(default_factory=set)
    dependents: Set[str] = field(default_factory=set)
    last_modified: float = 0


class Architect:
    """تحلیلگر اصلی معماری پروژه"""
    
    def __init__(self, project_root: str):
        self.root = Path(project_root).resolve()
        self.files: Dict[str, FileInfo] = {}
        self.imports: Dict[str, Set[str]] = defaultdict(set)
        self.reverse_imports: Dict[str, Set[str]] = defaultdict(set)
        self.component_map: Dict[str, List[str]] = defaultdict(list)
        self.hook_map: Dict[str, List[str]] = defaultdict(list)
        
    def run(self):
        """اجرای کامل تحلیل"""
        print("🔄 در حال تحلیل پروژه...")
        
        # اسکن پروژه
        files = self._scan()
        print(f"✅ {len(files)} فایل پیدا شد")
        
        # ساخت گراف وابستگی
        self._build_graph(files)
        
        # تحلیل
        results = {
            'unused': self._find_unused(),
            'duplicates': self._find_duplicates(),
            'similar': self._find_similar(),
            'architecture': self._analyze_architecture(),
            'stats': self._get_stats()
        }
        
        # تولید گزارش
        report = self._generate_report(results)
        
        # ذخیره گزارش
        self._save_report(report)
        
        # تولید داشبورد
        self._generate_dashboard(report)
        
        return report
    
    def _scan(self) -> List[FileInfo]:
        """اسکن کامل پروژه"""
        all_files = []
        
        for root, dirs, files in os.walk(self.root):
            # نادیده گرفتن دایرکتوری‌های سیستم
            dirs[:] = [d for d in dirs if not d.startswith('.') and d not in {
                'node_modules', '__pycache__', '.git', 'dist', 'build'
            }]
            
            for file in files:
                if file.startswith('.') or file.endswith(('.pyc', '.map')):
                    continue
                    
                path = Path(root) / file
                rel_path = str(path.relative_to(self.root))
                
                try:
                    info = self._analyze_file(path, rel_path)
                    all_files.append(info)
                    self.files[rel_path] = info
                except Exception as e:
                    print(f"⚠️ خطا در تحلیل {rel_path}: {e}")
        
        return all_files
    
    def _analyze_file(self, path: Path, rel_path: str) -> FileInfo:
        """تحلیل یک فایل"""
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # تشخیص نوع فایل
        file_type = self._detect_type(path)
        
        # استخراج اطلاعات
        imports = self._extract_imports(content, file_type)
        exports = self._extract_exports(content, file_type)
        functions, classes = self._extract_definitions(content, file_type)
        components, hooks = self._extract_react(content, file_type)
        
        # محاسبه پیچیدگی
        complexity = self._calculate_complexity(content)
        
        # هش محتوا
        file_hash = hashlib.md5(content.encode()).hexdigest()
        
        return FileInfo(
            path=rel_path,
            full_path=path,
            type=file_type,
            size=len(content),
            lines=content.count('\n') + 1,
            imports=imports,
            exports=exports,
            functions=functions,
            classes=classes,
            components=components,
            hooks=hooks,
            complexity=complexity,
            hash=file_hash,
            last_modified=path.stat().st_mtime
        )
    
    def _detect_type(self, path: Path) -> str:
        """تشخیص نوع فایل"""
        ext = path.suffix.lower()
        types = {
            '.js': 'javascript',
            '.jsx': 'react',
            '.ts': 'typescript',
            '.tsx': 'react-ts',
            '.py': 'python',
            '.vue': 'vue',
            '.css': 'css',
            '.scss': 'scss',
            '.html': 'html',
            '.json': 'json'
        }
        return types.get(ext, 'other')
    
    def _extract_imports(self, content: str, file_type: str) -> List[str]:
        """استخراج importها"""
        imports = []
        
        if file_type in ['javascript', 'react', 'typescript', 'react-ts']:
            # importهای ES6
            patterns = [
                r'from\s+[\'"]([^"\']+)[\'"]',
                r'require\([\'"]([^"\']+)[\'"]\)',
                r'import\s+.*from\s+[\'"]([^"\']+)[\'"]'
            ]
            for pattern in patterns:
                imports.extend(re.findall(pattern, content))
        
        elif file_type == 'python':
            try:
                tree = ast.parse(content)
                for node in ast.walk(tree):
                    if isinstance(node, ast.Import):
                        for alias in node.names:
                            imports.append(alias.name)
                    elif isinstance(node, ast.ImportFrom):
                        if node.module:
                            imports.append(node.module)
            except:
                pass
        
        return list(set(imports))
    
    def _extract_exports(self, content: str, file_type: str) -> List[str]:
        """استخراج exportها"""
        exports = []
        
        if file_type in ['javascript', 'react', 'typescript', 'react-ts']:
            patterns = [
                r'export\s+(?:const|let|var|function|class|default)?\s*([A-Za-z_$][\w$]*)',
                r'export\s*\{([^}]+)\}'
            ]
            for pattern in patterns:
                matches = re.findall(pattern, content)
                for match in matches:
                    if isinstance(match, str):
                        if ',' in match:
                            exports.extend([e.strip() for e in match.split(',')])
                        else:
                            exports.append(match)
        
        return list(set(exports))
    
    def _extract_definitions(self, content: str, file_type: str) -> Tuple[List[str], List[str]]:
        """استخراج توابع و کلاس‌ها"""
        functions, classes = [], []
        
        if file_type in ['javascript', 'react', 'typescript', 'react-ts']:
            functions = re.findall(r'function\s+([A-Za-z_$][\w$]*)|const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\([^)]*\)|[^=]*)\s*=>', content)
            functions = [f[0] or f[1] for f in functions if any(f)]
            classes = re.findall(r'class\s+([A-Za-z_$][\w$]*)', content)
        
        elif file_type == 'python':
            functions = re.findall(r'def\s+([A-Za-z_][\w]*)', content)
            classes = re.findall(r'class\s+([A-Za-z_][\w]*)', content)
        
        return list(set(functions)), list(set(classes))
    
    def _extract_react(self, content: str, file_type: str) -> Tuple[List[str], List[str]]:
        """استخراج کامپوننت‌ها و هوک‌های ری‌اکت"""
        components, hooks = [], []
        
        if file_type in ['react', 'react-ts', 'javascript', 'typescript']:
            # کامپوننت‌ها (با حرف بزرگ شروع می‌شوند)
            components = re.findall(r'const\s+([A-Z][A-Za-z]*)\s*=|function\s+([A-Z][A-Za-z]*)\s*\(', content)
            components = [c[0] or c[1] for c in components if any(c)]
            
            # هوک‌ها (با use شروع می‌شوند)
            hooks = re.findall(r'const\s+([uU]se[A-Z][A-Za-z]*)\s*=', content)
        
        return list(set(components)), list(set(hooks))
    
    def _calculate_complexity(self, content: str) -> int:
        """محاسبه پیچیدگی کد"""
        lines = content.split('\n')
        score = 0
        
        for line in lines:
            line = line.strip()
            if not line or line.startswith(('//', '#', '/*')):
                continue
            
            # شمارش ساختارهای کنترلی
            keywords = ['if', 'else', 'for', 'while', 'switch', 'case', 'catch', '&&', '||', '?']
            score += sum(1 for kw in keywords if kw in line)
            
            # شمارش توابع و کلاس‌ها
            if any(x in line for x in ['function', 'def ', 'class ', '=>']):
                score += 2
        
        return score
    
    def _build_graph(self, files: List[FileInfo]):
        """ساخت گراف وابستگی"""
        # نگاشت نام فایل به مسیر کامل
        name_to_path = {}
        for info in files:
            name = Path(info.path).name
            stem = Path(info.path).stem
            name_to_path[name] = info.path
            name_to_path[stem] = info.path
        
        # ساخت گراف
        for info in files:
            source = info.path
            for imp in info.imports:
                target = self._resolve_import(imp, source, name_to_path)
                if target:
                    self.imports[source].add(target)
                    self.reverse_imports[target].add(source)
                    info.dependencies.add(target)
                    if target in self.files:
                        self.files[target].dependents.add(source)
        
        # ثبت کامپوننت‌ها و هوک‌ها
        for path, info in self.files.items():
            for comp in info.components:
                self.component_map[comp].append(path)
            for hook in info.hooks:
                self.hook_map[hook].append(path)
    
    def _resolve_import(self, imp: str, source: str, name_map: Dict) -> Optional[str]:
        """تبدیل import به مسیر فایل"""
        # جستجوی مستقیم
        if imp in self.files:
            return imp
        
        # جستجوی با نام فایل
        if imp in name_map:
            return name_map[imp]
        
        # جستجوی نسبی
        if imp.startswith('.'):
            base = Path(source).parent
            target = (self.root / base / imp).resolve()
            try:
                rel = str(target.relative_to(self.root))
                if rel in self.files:
                    return rel
            except:
                pass
        
        return None
    
    def _find_unused(self) -> List[Dict]:
        """پیدا کردن فایل‌های استفاده نشده"""
        unused = []
        entry_points = self._get_entry_points()
        
        for path, info in self.files.items():
            # فایل‌های ورودی را نادیده بگیر
            if path in entry_points:
                continue
            
            # اگر کسی از این فایل استفاده نمی‌کند
            if not info.dependents:
                unused.append({
                    'path': path,
                    'type': info.type,
                    'size': info.size,
                    'lines': info.lines,
                    'reason': 'هیچ importی پیدا نشد',
                    'has_exports': len(info.exports) > 0,
                    'has_components': len(info.components) > 0
                })
        
        return unused
    
    def _get_entry_points(self) -> Set[str]:
        """شناسایی فایل‌های ورودی پروژه"""
        entry_points = set()
        patterns = [
            'index.', 'main.', 'app.', 'App.', 'package.json',
            'webpack.config', 'next.config', 'vue.config'
        ]
        
        for path in self.files:
            name = Path(path).name
            if any(p in name for p in patterns):
                entry_points.add(path)
        
        return entry_points
    
    def _find_duplicates(self) -> List[Dict]:
        """پیدا کردن فایل‌های تکراری"""
        hash_map = defaultdict(list)
        
        for info in self.files.values():
            hash_map[info.hash].append(info)
        
        duplicates = []
        for file_hash, files in hash_map.items():
            if len(files) > 1:
                duplicates.append({
                    'hash': file_hash,
                    'files': [
                        {
                            'path': f.path,
                            'size': f.size,
                            'dependents': len(f.dependents)
                        }
                        for f in files
                    ],
                    'total_size': sum(f.size for f in files),
                    'can_save': (len(files) - 1) * files[0].size
                })
        
        return duplicates
    
    def _find_similar(self) -> List[Dict]:
        """پیدا کردن فایل‌های با نام مشابه"""
        name_map = defaultdict(list)
        
        for info in self.files.values():
            stem = Path(info.path).stem
            name_map[stem].append(info)
        
        similar = []
        for name, files in name_map.items():
            if len(files) > 1:
                # بررسی اینکه در دایرکتوری‌های مختلف هستند
                dirs = set(Path(f.path).parent for f in files)
                if len(dirs) > 1:
                    similar.append({
                        'name': name,
                        'files': [
                            {
                                'path': f.path,
                                'directory': str(Path(f.path).parent),
                                'lines': f.lines,
                                'complexity': f.complexity
                            }
                            for f in files
                        ]
                    })
        
        return similar
    
    def _analyze_architecture(self) -> Dict:
        """تحلیل معماری پروژه"""
        issues = {
            'duplicate_components': [],
            'duplicate_hooks': [],
            'unwired_services': [],
            'dead_utilities': []
        }
        
        # کامپوننت‌های تکراری
        for comp, paths in self.component_map.items():
            if len(paths) > 1:
                issues['duplicate_components'].append({
                    'name': comp,
                    'files': paths,
                    'count': len(paths)
                })
        
        # هوک‌های تکراری
        for hook, paths in self.hook_map.items():
            if len(paths) > 1:
                issues['duplicate_hooks'].append({
                    'name': hook,
                    'files': paths,
                    'count': len(paths)
                })
        
        # سرویس‌های بدون استفاده
        for path, info in self.files.items():
            if ('service' in path.lower() or 'api' in path.lower()) and not info.dependents:
                issues['unwired_services'].append({
                    'file': path,
                    'exports': info.exports,
                    'functions': info.functions
                })
        
        # utilityهای مرده
        for path, info in self.files.items():
            if ('util' in path.lower() or 'helper' in path.lower()) and not info.dependents:
                issues['dead_utilities'].append({
                    'file': path,
                    'functions': info.functions,
                    'size': info.size
                })
        
        return issues
    
    def _get_stats(self) -> Dict:
        """آمار کلی پروژه"""
        complexities = [f.complexity for f in self.files.values()]
        lines = [f.lines for f in self.files.values()]
        
        return {
            'total_files': len(self.files),
            'total_lines': sum(lines),
            'avg_complexity': statistics.mean(complexities) if complexities else 0,
            'max_complexity': max(complexities) if complexities else 0,
            'file_types': self._count_file_types(),
            'dependency_stats': self._get_dependency_stats()
        }
    
    def _count_file_types(self) -> Dict[str, int]:
        """شمارش انواع فایل"""
        types = defaultdict(int)
        for info in self.files.values():
            types[info.type] += 1
        return dict(types)
    
    def _get_dependency_stats(self) -> Dict:
        """آمار وابستگی‌ها"""
        dep_counts = [len(f.dependencies) for f in self.files.values()]
        dep_by_counts = [len(f.dependents) for f in self.files.values()]
        
        return {
            'max_deps': max(dep_counts) if dep_counts else 0,
            'avg_deps': statistics.mean(dep_counts) if dep_counts else 0,
            'orphans': sum(1 for c in dep_by_counts if c == 0),
            'popular': sum(1 for c in dep_by_counts if c > 10)
        }
    
    def _generate_report(self, results: Dict) -> Dict:
        """تولید گزارش نهایی"""
        # تولید توصیه‌های ادغام
        merge_recs = []
        for similar in results['similar']:
            files = similar['files']
            if len(files) > 1:
                # پیدا کردن بهترین نسخه
                best = max(files, key=lambda x: x['lines'] / (x['complexity'] + 1))
                
                merge_recs.append({
                    'name': similar['name'],
                    'files': [f['path'] for f in files],
                    'best_version': best['path'],
                    'recommendation': f'نگه‌دارید {best["path"]} و بقیه را حذف کنید'
                })
        
        # طرح بازسازی
        refactor_plan = [
            {
                'phase': 1,
                'name': 'پیروزی‌های سریع',
                'tasks': [
                    f'حذف {len(results["unused"])} فایل استفاده نشده',
                    'اضافه کردن کامنت TODO برای فایل‌های مشکوک',
                    'بروزرسانی مستندات'
                ],
                'risk': 'کم',
                'time': '۱-۲ روز'
            },
            {
                'phase': 2,
                'name': 'ادغام موارد مشابه',
                'tasks': [
                    f'ادغام {len(results["similar"])} گروه فایل مشابه',
                    f'یکسان‌سازی {len(results["architecture"]["duplicate_components"])} کامپوننت تکراری'
                ],
                'risk': 'متوسط',
                'time': '۳-۵ روز'
            },
            {
                'phase': 3,
                'name': 'بهبود ساختار',
                'tasks': [
                    'بازسازی کامپوننت‌های پیچیده',
                    'ایجاد لایه API یکپارچه',
                    'بهبود مدیریت state'
                ],
                'risk': 'بالا',
                'time': '۱-۲ هفته'
            }
        ]
        
        # ارزیابی ریسک
        unused_count = len(results['unused'])
        dup_groups = len(results['duplicates'])
        similar_groups = len(results['similar'])
        
        risk_score = unused_count * 0.1 + dup_groups * 0.3 + similar_groups * 0.2
        
        if risk_score > 2:
            risk_level = 'بالا'
        elif risk_score > 1:
            risk_level = 'متوسط'
        else:
            risk_level = 'کم'
        
        report = {
            'project': str(self.root),
            'summary': results['stats'],
            'unused_files': results['unused'],
            'duplicate_files': results['duplicates'],
            'similar_files': results['similar'],
            'architecture_issues': results['architecture'],
            'merge_recommendations': merge_recs,
            'replace_recommendations': [],
            'refactor_plan': refactor_plan,
            'risk_assessment': {
                'level': risk_level,
                'score': round(risk_score, 2),
                'factors': {
                    'unused_files': unused_count,
                    'duplicate_groups': dup_groups,
                    'similar_groups': similar_groups
                }
            }
        }
        
        return report
    
    def _save_report(self, report: Dict):
        """ذخیره گزارش JSON"""
        output = self.root / 'analysis_report.json'
        with open(output, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        
        print(f"✅ گزارش ذخیره شد: {output}")
    
    def _generate_dashboard(self, report: Dict):
        """تولید داشبورد HTML"""
        html = self._create_dashboard_html(report)
        output = self.root / 'optimization_dashboard.html'
        
        with open(output, 'w', encoding='utf-8') as f:
            f.write(html)
        
        print(f"✅ داشبورد ساخته شد: {output}")
        print(f"🌐 باز کردن: file://{output}")
    
    def _create_dashboard_html(self, report: Dict) -> str:
        """ایجاد کد HTML داشبورد"""
        return f"""<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>داشبورد بهینه‌سازی پروژه</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #f1f5f9;
            line-height: 1.6;
            padding: 20px;
        }}
        
        .container {{
            max-width: 1400px;
            margin: 0 auto;
        }}
        
        header {{
            background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
            padding: 30px;
            border-radius: 15px;
            margin-bottom: 30px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
        }}
        
        h1 {{
            font-size: 32px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            gap: 15px;
        }}
        
        .subtitle {{
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
        }}
        
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }}
        
        .stat-card {{
            background: #1e293b;
            border-radius: 10px;
            padding: 20px;
            border: 1px solid #334155;
            transition: transform 0.3s;
        }}
        
        .stat-card:hover {{
            transform: translateY(-5px);
            border-color: #6366f1;
        }}
        
        .stat-value {{
            font-size: 36px;
            font-weight: bold;
            color: #60a5fa;
            margin-bottom: 5px;
        }}
        
        .stat-label {{
            color: #94a3b8;
            font-size: 14px;
        }}
        
        .section {{
            background: #1e293b;
            border-radius: 10px;
            padding: 25px;
            margin-bottom: 25px;
            border: 1px solid #334155;
        }}
        
        .section-title {{
            font-size: 20px;
            margin-bottom: 20px;
            color: #f1f5f9;
            display: flex;
            align-items: center;
            gap: 10px;
            padding-bottom: 10px;
            border-bottom: 2px solid #6366f1;
        }}
        
        .file-list {{
            list-style: none;
        }}
        
        .file-item {{
            padding: 12px 15px;
            border-bottom: 1px solid #334155;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: background 0.2s;
        }}
        
        .file-item:hover {{
            background: #2d3748;
        }}
        
        .file-path {{
            font-family: 'Courier New', monospace;
            font-size: 14px;
            color: #e2e8f0;
        }}
        
        .file-meta {{
            color: #94a3b8;
            font-size: 12px;
            display: flex;
            gap: 15px;
        }}
        
        .badge {{
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: bold;
        }}
        
        .badge-danger {{
            background: #ef4444;
            color: white;
        }}
        
        .badge-warning {{
            background: #f59e0b;
            color: black;
        }}
        
        .badge-success {{
            background: #10b981;
            color: white;
        }}
        
        .badge-info {{
            background: #3b82f6;
            color: white;
        }}
        
        .phase-timeline {{
            display: flex;
            flex-direction: column;
            gap: 15px;
        }}
        
        .phase {{
            background: #2d3748;
            border-radius: 8px;
            padding: 20px;
            border-right: 4px solid #6366f1;
        }}
        
        .phase-number {{
            background: #6366f1;
            color: white;
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            margin-bottom: 10px;
        }}
        
        .phase-title {{
            font-size: 18px;
            margin-bottom: 10px;
            color: #f1f5f9;
        }}
        
        .phase-meta {{
            color: #94a3b8;
            font-size: 14px;
            margin-bottom: 10px;
        }}
        
        .phase-tasks {{
            padding-right: 15px;
        }}
        
        .phase-tasks li {{
            margin-bottom: 8px;
            color: #cbd5e1;
        }}
        
        .risk-indicator {{
            display: inline-block;
            width: 10px;
            height: 10px;
            border-radius: 50%;
            margin-left: 8px;
        }}
        
        .risk-high {{
            background: #ef4444;
            box-shadow: 0 0 10px #ef4444;
        }}
        
        .risk-medium {{
            background: #f59e0b;
            box-shadow: 0 0 10px #f59e0b;
        }}
        
        .risk-low {{
            background: #10b981;
            box-shadow: 0 0 10px #10b981;
        }}
        
        .chart-container {{
            width: 100%;
            height: 300px;
            margin: 20px 0;
        }}
        
        footer {{
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #334155;
            color: #94a3b8;
            font-size: 14px;
        }}
        
        @media (max-width: 768px) {{
            .stats-grid {{
                grid-template-columns: 1fr;
            }}
            
            h1 {{
                font-size: 24px;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>🚀 داشبورد بهینه‌سازی پروژه</h1>
            <div class="subtitle">
                <div>مسیر پروژه: {report['project']}</div>
                <div>سطح ریسک: 
                    <span class="badge badge-{report['risk_assessment']['level']}">
                        {report['risk_assessment']['level']}
                        <span class="risk-indicator risk-{report['risk_assessment']['level']}"></span>
                    </span>
                </div>
            </div>
        </header>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-value">{report['summary']['total_files']}</div>
                <div class="stat-label">تعداد کل فایل‌ها</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{len(report['unused_files'])}</div>
                <div class="stat-label">فایل‌های استفاده نشده</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{len(report['duplicate_files'])}</div>
                <div class="stat-label">گروه‌های تکراری</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">{len(report['similar_files'])}</div>
                <div class="stat-label">فایل‌های مشابه</div>
            </div>
        </div>
        
        <div class="section">
            <h2 class="section-title">📊 آمار پروژه</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px;">
                <div>
                    <div style="font-size: 24px; color: #60a5fa;">{report['summary']['total_lines']}</div>
                    <div style="color: #94a3b8;">تعداد خطوط کد</div>
                </div>
                <div>
                    <div style="font-size: 24px; color: #60a5fa;">{round(report['summary']['avg_complexity'], 1)}</div>
                    <div style="color: #94a3b8;">میانگین پیچیدگی</div>
                </div>
                <div>
                    <div style="font-size: 24px; color: #60a5fa;">{report['summary']['dependency_stats']['orphans']}</div>
                    <div style="color: #94a3b8;">فایل‌های بدون وابسته</div>
                </div>
                <div>
                    <div style="font-size: 24px; color: #60a5fa;">{report['summary']['dependency_stats']['popular']}</div>
                    <div style="color: #94a3b8;">فایل‌های پراستفاده</div>
                </div>
            </div>
        </div>
        
        <div class="section">
            <h2 class="section-title">🗑️ فایل‌های استفاده نشده</h2>
            <ul class="file-list">
                {"".join([f'''
                <li class="file-item">
                    <div class="file-path">{file['path']}</div>
                    <div class="file-meta">
                        <span>{file['lines']} خط</span>
                        <span>{file['size']} بایت</span>
                        <span class="badge badge-danger">حذف ایمن</span>
                    </div>
                </li>
                ''' for file in report['unused_files'][:10]])}
                
                {f'<li style="text-align: center; padding: 20px; color: #94a3b8;">... و {len(report["unused_files"]) - 10} فایل دیگر</li>' if len(report['unused_files']) > 10 else ''}
            </ul>
        </div>
        
        <div class="section">
            <h2 class="section-title">📝 فایل‌های تکراری</h2>
            <ul class="file-list">
                {"".join([f'''
                <li class="file-item">
                    <div>
                        <div class="file-path">{len(group['files'])} فایل یکسان</div>
                        <div style="color: #94a3b8; font-size: 12px; margin-top: 5px;">
                            صرفه‌جویی احتمالی: {group['can_save']} بایت
                        </div>
                    </div>
                    <div class="file-meta">
                        <span class="badge badge-warning">ادغام پیشنهادی</span>
                    </div>
                </li>
                ''' for group in report['duplicate_files'][:5]])}
            </ul>
        </div>
        
        <div class="section">
            <h2 class="section-title">🔧 طرح بازسازی (Refactoring)</h2>
            <div class="phase-timeline">
                {"".join([f'''
                <div class="phase">
                    <div class="phase-number">{phase['phase']}</div>
                    <div class="phase-title">{phase['name']}</div>
                    <div class="phase-meta">
                        زمان: {phase['time']} • ریسک: {phase['risk']}
                        <span class="risk-indicator risk-{phase['risk']}"></span>
                    </div>
                    <ul class="phase-tasks">
                        {"".join([f'<li>{task}</li>' for task in phase['tasks']])}
                    </ul>
                </div>
                ''' for phase in report['refactor_plan']])}
            </div>
        </div>
        
        <div class="section">
            <h2 class="section-title">⚠️ مشکلات معماری</h2>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                <div>
                    <h3 style="margin-bottom: 10px; color: #f59e0b;">کامپوننت‌های تکراری</h3>
                    <ul style="list-style: none;">
                        {"".join([f'''
                        <li style="padding: 8px 0; border-bottom: 1px solid #334155;">
                            <div style="font-weight: bold;">{comp['name']}</div>
                            <div style="color: #94a3b8; font-size: 12px;">
                                {comp['count']} پیاده‌سازی
                            </div>
                        </li>
                        ''' for comp in report['architecture_issues']['duplicate_components'][:5]])}
                    </ul>
                </div>
                
                <div>
                    <h3 style="margin-bottom: 10px; color: #ef4444;">هوک‌های تکراری</h3>
                    <ul style="list-style: none;">
                        {"".join([f'''
                        <li style="padding: 8px 0; border-bottom: 1px solid #334155;">
                            <div style="font-weight: bold;">{hook['name']}</div>
                            <div style="color: #94a3b8; font-size: 12px;">
                                {hook['count']} پیاده‌سازی
                            </div>
                        </li>
                        ''' for hook in report['architecture_issues']['duplicate_hooks'][:5]])}
                    </ul>
                </div>
            </div>
        </div>
        
        <footer>
            <p>📅 گزارش تولید شده در {report.get('timestamp', '')}</p>
            <p style="margin-top: 10px; font-size: 12px; color: #64748b;">
                این گزارش تنها تحلیل است. قبل از حذف هر فایل، از کد خود backup بگیرید.
            </p>
        </footer>
    </div>
    
    <script>
        // اضافه کردن timestamp
        document.addEventListener('DOMContentLoaded', function() {{
            const now = new Date().toLocaleString('fa-IR');
            const timestamp = document.querySelector('footer p');
            if (timestamp) {{
                timestamp.textContent = `📅 گزارش تولید شده در ${{now}}`;
            }}
            
            // اضافه کردن قابلیت کلیک بر روی فایل‌ها
            document.querySelectorAll('.file-item').forEach(item => {{
                item.style.cursor = 'pointer';
                item.addEventListener('click', function() {{
                    const path = this.querySelector('.file-path').textContent;
                    alert('مسیر فایل: ' + path);
                }});
            }});
            
            // ایجاد چارت ساده
            const chartData = {{
                unused: {len(report['unused_files'])},
                duplicates: {len(report['duplicate_files'])},
                similar: {len(report['similar_files'])}
            }};
            
            // نمایش ریسک
            const riskElement = document.querySelector('.risk-indicator');
            if (riskElement) {{
                riskElement.title = `امتیاز ریسک: {report['risk_assessment']['score']}`;
            }}
        }});
    </script>
</body>
</html>"""


# اجرای اسکریپت
if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        project_path = sys.argv[1]
    else:
        project_path = "."
    
    print("🏗️  تحلیلگر معماری پروژه")
    print("=" * 50)
    
    try:
        architect = Architect(project_path)
        report = architect.run()
        
        print("\n🎉 تحلیل کامل شد!")
        print("=" * 50)
        print(f"📊 آمار کلی:")
        print(f"  • فایل‌ها: {report['summary']['total_files']}")
        print(f"  • خطوط کد: {report['summary']['total_lines']}")
        print(f"  • فایل‌های استفاده نشده: {len(report['unused_files'])}")
        print(f"  • فایل‌های تکراری: {len(report['duplicate_files'])}")
        print(f"  • سطح ریسک: {report['risk_assessment']['level']}")
        print("=" * 50)
        print("📁 گزارش‌ها:")
        print(f"  • analysis_report.json → گزارش کامل JSON")
        print(f"  • optimization_dashboard.html → داشبورد تعاملی")
        
    except Exception as e:
        print(f"❌ خطا: {e}")
        import traceback
        traceback.print_exc()