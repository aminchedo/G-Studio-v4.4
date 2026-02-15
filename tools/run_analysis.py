#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
اسکریپت اجرای سریع تحلیل پروژه
"""

import sys
import os
from pathlib import Path

def main():
    """تابع اصلی اجرا"""
    print("🔍 تحلیلگر سریع پروژه")
    print("-" * 40)
    
    # دریافت مسیر پروژه
    if len(sys.argv) > 1:
        project_path = sys.argv[1]
        if not os.path.exists(project_path):
            print(f"❌ مسیر وجود ندارد: {project_path}")
            return
    else:
        project_path = input("📁 مسیر پروژه (Enter برای دایرکتوری جاری): ").strip()
        if not project_path:
            project_path = "."
    
    print(f"📂 تحلیل پروژه: {project_path}")
    
    # بررسی وجود فایل تحلیلگر
    analyzer_path = Path(__file__).parent / "project_architect.py"
    if not analyzer_path.exists():
        print("❌ فایل تحلیلگر پیدا نشد!")
        print("لطفاً فایل project_architect.py را در همان دایرکتوری قرار دهید.")
        return
    
    # اجرای تحلیلگر
    try:
        # اضافه کردن دایرکتوری به مسیر
        sys.path.insert(0, str(Path(__file__).parent))
        
        # import و اجرای تحلیلگر
        from project_architect import Architect
        
        architect = Architect(project_path)
        report = architect.run()
        
        # نمایش خلاصه
        print("\n" + "="*50)
        print("📋 خلاصه نتایج:")
        print("="*50)
        
        if report['unused_files']:
            print(f"\n🗑️  {len(report['unused_files'])} فایل استفاده نشده:")
            for file in report['unused_files'][:5]:
                print(f"   • {file['path']} ({file['lines']} خط)")
            if len(report['unused_files']) > 5:
                print(f"   • ... و {len(report['unused_files']) - 5} فایل دیگر")
        
        if report['duplicate_files']:
            print(f"\n📝 {len(report['duplicate_files'])} گروه تکراری:")
            for group in report['duplicate_files'][:3]:
                count = len(group['files'])
                print(f"   • {count} فایل یکسان (صرفه‌جویی: {group['can_save']:,} بایت)")
        
        if report['architecture_issues']['duplicate_components']:
            print(f"\n⚛️  {len(report['architecture_issues']['duplicate_components'])} کامپوننت تکراری")
            for comp in report['architecture_issues']['duplicate_components'][:3]:
                print(f"   • {comp['name']} ({comp['count']} پیاده‌سازی)")
        
        print("\n" + "="*50)
        print("🚀 اقدامات سریع:")
        print("="*50)
        print("1. فایل‌های استفاده نشده را حذف کنید")
        print("2. فایل‌های تکراری را ادغام کنید")
        print("3. کامپوننت‌های تکراری را یکسان‌سازی کنید")
        print("\n📊 برای گزارش کامل، فایل‌های زیر را بررسی کنید:")
        print(f"   • {Path(project_path)/'analysis_report.json'}")
        print(f"   • {Path(project_path)/'optimization_dashboard.html'}")
        
    except ImportError as e:
        print(f"❌ خطای import: {e}")
        print("مطمئن شوید فایل project_architect.py در دایرکتوری وجود دارد.")
    except Exception as e:
        print(f"❌ خطا در تحلیل: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()