#!/usr/bin/env python3
"""
Example: Using G-Studio Analyzer Programmatically
==================================================

This example shows how to use the analyzer as a library in your own Python scripts.
"""

from pathlib import Path
from gstudio_analyzer import GStudioAnalyzer, ReportGenerator

def example_basic_analysis():
    """Basic analysis example"""
    print("Example 1: Basic Analysis")
    print("-" * 50)
    
    # Set paths
    project_path = Path("./my-project")  # Change to your project
    output_dir = Path("./analysis-results")
    
    # Create analyzer
    analyzer = GStudioAnalyzer(
        project_path=project_path,
        output_dir=output_dir,
        use_cache=True,
        verbose=True
    )
    
    # Run analysis
    result = analyzer.analyze()
    
    # Generate reports
    reporter = ReportGenerator(result, output_dir)
    reporter.generate_html()
    reporter.generate_json()
    reporter.generate_summary()
    
    print(f"\nAnalysis complete! Check {output_dir} for reports.")


def example_find_valuable_unused():
    """Example: Find valuable unused components"""
    print("\nExample 2: Find Valuable Unused Components")
    print("-" * 50)
    
    project_path = Path("./my-project")
    output_dir = Path("./valuable-unused-report")
    
    # Analyzer with minimum score filter
    analyzer = GStudioAnalyzer(
        project_path=project_path,
        output_dir=output_dir,
        min_score=70,  # Only components with score >= 70
        use_cache=True
    )
    
    result = analyzer.analyze()
    
    # Print top valuable unused components
    print(f"\nFound {len(result.valuable_unused)} valuable unused components:")
    for fi in sorted(result.valuable_unused, key=lambda x: x.value_score, reverse=True)[:10]:
        print(f"  • {fi.path}")
        print(f"    Score: {fi.value_score:.0f} | Layer: {fi.layer.value} | Lines: {fi.lines}")
        if fi.has_ai:
            print(f"    ⭐ Has AI features")
        if fi.has_mcp:
            print(f"    ⭐ Has MCP integration")


def example_detect_dead_code():
    """Example: Find dead code to remove"""
    print("\nExample 3: Detect Dead Code")
    print("-" * 50)
    
    project_path = Path("./my-project")
    output_dir = Path("./dead-code-report")
    
    analyzer = GStudioAnalyzer(
        project_path=project_path,
        output_dir=output_dir
    )
    
    result = analyzer.analyze()
    
    # Print dead code files
    print(f"\nFound {len(result.dead_code)} dead code files:")
    for fi in result.dead_code[:20]:
        print(f"  • {fi.path} (not modified for {fi.last_modified_days} days)")


def example_detect_clones():
    """Example: Find code clones"""
    print("\nExample 4: Detect Code Clones")
    print("-" * 50)
    
    project_path = Path("./my-project")
    output_dir = Path("./clone-report")
    
    analyzer = GStudioAnalyzer(
        project_path=project_path,
        output_dir=output_dir
    )
    
    result = analyzer.analyze()
    
    # Print clone groups
    print(f"\nFound {len(result.clones)} clone groups:")
    for i, clone_group in enumerate(result.clones, 1):
        print(f"\n  Clone Group {i} ({clone_group.similarity:.0%} similar, {clone_group.lines} lines):")
        for file in clone_group.files:
            action = "KEEP ✓" if file == clone_group.representative else "Consider removing"
            print(f"    • {file} - {action}")


def example_custom_processing():
    """Example: Custom processing of results"""
    print("\nExample 5: Custom Processing")
    print("-" * 50)
    
    project_path = Path("./my-project")
    output_dir = Path("./custom-report")
    
    analyzer = GStudioAnalyzer(
        project_path=project_path,
        output_dir=output_dir
    )
    
    result = analyzer.analyze()
    
    # Custom analysis
    print("\n📊 Custom Statistics:")
    
    # Find most complex files
    complex_files = sorted(
        analyzer.files.values(),
        key=lambda x: x.complexity,
        reverse=True
    )[:5]
    
    print("\nMost Complex Files:")
    for fi in complex_files:
        print(f"  • {fi.path} (complexity: {fi.complexity})")
    
    # Find most central files (important in dependency graph)
    central_files = sorted(
        analyzer.files.values(),
        key=lambda x: x.centrality,
        reverse=True
    )[:5]
    
    print("\nMost Central Files (most connected):")
    for fi in central_files:
        print(f"  • {fi.path} (centrality: {fi.centrality:.2f})")
    
    # Find files with most dependencies
    high_coupling = sorted(
        analyzer.files.values(),
        key=lambda x: len(x.dependencies),
        reverse=True
    )[:5]
    
    print("\nMost Coupled Files:")
    for fi in high_coupling:
        print(f"  • {fi.path} ({len(fi.dependencies)} dependencies)")


def example_ci_integration():
    """Example: CI/CD integration"""
    print("\nExample 6: CI/CD Integration")
    print("-" * 50)
    
    project_path = Path("./my-project")
    output_dir = Path("./ci-report")
    
    analyzer = GStudioAnalyzer(
        project_path=project_path,
        output_dir=output_dir,
        use_cache=False,  # Always fresh in CI
        enable_git=True
    )
    
    result = analyzer.analyze()
    
    # CI checks
    failed = False
    
    # Check 1: Too many circular dependencies
    if len(result.circular_deps) > 5:
        print("❌ FAIL: Too many circular dependencies")
        failed = True
    else:
        print("✅ PASS: Circular dependencies under control")
    
    # Check 2: Too much dead code
    if len(result.dead_code) > 50:
        print("⚠️  WARN: High dead code count")
    else:
        print("✅ PASS: Dead code count acceptable")
    
    # Check 3: Code duplication
    if len(result.clones) > 10:
        print("⚠️  WARN: High code duplication")
    else:
        print("✅ PASS: Code duplication acceptable")
    
    # Generate JSON for further processing
    reporter = ReportGenerator(result, output_dir)
    reporter.generate_json()
    
    if failed:
        print("\n❌ CI checks failed!")
        exit(1)
    else:
        print("\n✅ All CI checks passed!")


def main():
    """Run all examples"""
    print("=" * 50)
    print("G-Studio Analyzer - Usage Examples")
    print("=" * 50)
    
    # Uncomment the examples you want to run
    
    # example_basic_analysis()
    # example_find_valuable_unused()
    # example_detect_dead_code()
    # example_detect_clones()
    # example_custom_processing()
    # example_ci_integration()
    
    print("\nNote: Uncomment examples in main() to run them")
    print("Make sure to set the correct project_path for your project")


if __name__ == '__main__':
    main()
