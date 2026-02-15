#!/usr/bin/env python3
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from project_optimizer import ProjectOptimizer, main

if __name__ == "__main__":
    print("🚀 Project Optimizer")
    print("=" * 60)
    
    project_path = input("Enter project path (or press Enter for current directory): ").strip()
    if not project_path:
        project_path = "."
    
    reports_dir = input("Enter reports directory (or press Enter for 'reports'): ").strip()
    if not reports_dir:
        reports_dir = "reports"
    
    print("\n🔍 Starting analysis...\n")
    
    try:
        optimizer = ProjectOptimizer(project_path, reports_dir)
        report = optimizer.run()
        
        print("\n" + "="*60)
        print("✅ ANALYSIS COMPLETE!")
        print("="*60)
        print(f"\n📊 Summary:")
        print(f"  • Total files scanned: {report['summary']['total_files']}")
        print(f"  • Total lines of code: {report['summary']['total_lines']:,}")
        print(f"  • Average complexity: {report['summary']['avg_complexity']}")
        print(f"\n🗑️ Issues Found:")
        print(f"  • Unused files: {len(report['unused_files'])}")
        print(f"  • Duplicate file groups: {len(report['duplicate_files'])}")
        print(f"  • Duplicate components: {len(report['duplicate_components'])}")
        print(f"  • Duplicate hooks: {len(report['duplicate_hooks'])}")
        print(f"  • Similar named files: {len(report['similar_files'])}")
        
        if report['recommendations']:
            print(f"\n💡 Top Recommendations:")
            for i, rec in enumerate(report['recommendations'][:5], 1):
                print(f"  {i}. {rec}")
        
        print(f"\n📂 Reports Location:")
        print(f"  {optimizer.report_dir}")
        print(f"\n📄 Files created:")
        print(f"  • analysis_report.json - Full analysis data")
        print(f"  • dashboard.html - Interactive visual dashboard")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    
    print("\n" + "="*60)
    input("\nPress Enter to exit...")
