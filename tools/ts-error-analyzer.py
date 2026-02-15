#!/usr/bin/env python3
"""
G-Studio TypeScript Error Intelligence Analyzer
================================================

Comprehensive error analysis tool for large-scale TypeScript projects.

Features:
- Parse tsc output and categorize errors
- Rank files by error count, size, and architectural importance
- Detect error patterns and clusters
- Identify duplicate/similar file names
- Generate actionable reports
- Track fan-in/fan-out dependencies

Usage:
    python ts-error-analyzer.py [--verbose] [--json] [--html]
"""

import subprocess
import re
import json
import os
from pathlib import Path
from collections import defaultdict, Counter
from dataclasses import dataclass, asdict
from typing import Dict, List, Tuple, Set, Optional
from datetime import datetime
import argparse

# ============================================================================
# CONFIGURATION
# ============================================================================

PROJECT_ROOT = Path(__file__).parent.parent
SRC_DIR = PROJECT_ROOT / "src"
EXCLUDE_PATTERNS = [
    "__tests__", "__mocks__", "node_modules", ".git", "dist", "build",
    "*.test.ts", "*.test.tsx", "*.spec.ts", "*.spec.tsx",
    "*- Copy.*", "*.txt", "*.md"
]

# Architectural importance weights
ARCH_WEIGHTS = {
    # Entry points
    "index.tsx": 1000,
    "main.tsx": 900,
    "App.tsx": 1000,
    
    # Core infrastructure
    "appStore.ts": 800,
    "conversationStore.ts": 700,
    "projectStore.ts": 700,
    "settingsStore.ts": 600,
    
    # Context providers
    "AppStateContext.tsx": 800,
    "DatabaseContext.tsx": 750,
    "ModalContext.tsx": 650,
    
    # Core services
    "mcpService.ts": 900,
    "geminiService.ts": 850,
    "agentOrchestrator.ts": 800,
    
    # Type definitions
    "types.ts": 750,
    "common.ts": 700,
    "ai.ts": 700,
}

# ============================================================================
# DATA STRUCTURES
# ============================================================================

@dataclass
class TSError:
    file: str
    line: int
    column: int
    code: str
    message: str
    full_line: str
    
@dataclass
class FileAnalysis:
    path: str
    relative_path: str
    error_count: int
    line_count: int
    size_bytes: int
    errors: List[TSError]
    error_codes: List[str]
    arch_score: int
    fan_in: int  # How many files import this
    fan_out: int  # How many files this imports
    
@dataclass
class ErrorPattern:
    code: str
    count: int
    message_pattern: str
    affected_files: List[str]
    example: str
    
@dataclass
class AnalysisReport:
    timestamp: str
    total_errors: int
    total_files: int
    files_with_errors: int
    top_error_codes: List[Tuple[str, int]]
    error_patterns: List[ErrorPattern]
    top_files_by_errors: List[FileAnalysis]
    top_files_by_arch: List[FileAnalysis]
    duplicate_names: Dict[str, List[str]]
    recommendations: List[str]

# ============================================================================
# ERROR PARSING
# ============================================================================

def run_tsc_check() -> str:
    """Run TypeScript compiler and capture output."""
    print("Running TypeScript compiler...")
    try:
        result = subprocess.run(
            ["npm", "run", "type-check"],
            cwd=PROJECT_ROOT,
            capture_output=True,
            text=True,
            timeout=120
        )
        return result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        print("⚠️  TypeScript compilation timed out")
        return ""
    except Exception as e:
        print(f"❌ Error running tsc: {e}")
        return ""

def parse_tsc_output(output: str) -> List[TSError]:
    """Parse TypeScript compiler output into structured errors."""
    errors = []
    
    # Pattern: src/path/file.tsx(line,col): error TScode: message
    pattern = r'^(.+?)\((\d+),(\d+)\):\s+error\s+(TS\d+):\s+(.+)$'
    
    for line in output.split('\n'):
        match = re.match(pattern, line)
        if match:
            file_path, line_num, col_num, error_code, message = match.groups()
            errors.append(TSError(
                file=file_path,
                line=int(line_num),
                column=int(col_num),
                code=error_code,
                message=message.strip(),
                full_line=line
            ))
    
    return errors

# ============================================================================
# FILE ANALYSIS
# ============================================================================

def get_file_line_count(file_path: Path) -> int:
    """Count lines in a file."""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            return sum(1 for _ in f)
    except:
        return 0

def get_file_size(file_path: Path) -> int:
    """Get file size in bytes."""
    try:
        return file_path.stat().st_size
    except:
        return 0

def calculate_arch_score(relative_path: str) -> int:
    """Calculate architectural importance score."""
    filename = Path(relative_path).name
    
    # Check exact matches
    if filename in ARCH_WEIGHTS:
        return ARCH_WEIGHTS[filename]
    
    # Check directory-based importance
    path_parts = relative_path.split('/')
    
    score = 0
    
    # Root level files
    if len(path_parts) == 1:
        score += 500
    
    # Core directories
    if 'stores' in path_parts:
        score += 400
    elif 'contexts' in path_parts:
        score += 400
    elif 'services' in path_parts:
        score += 300
    elif 'hooks' in path_parts:
        score += 250
    elif 'types' in path_parts:
        score += 350
    elif 'components/app' in '/'.join(path_parts):
        score += 450
    
    # Size-based importance (larger files often more critical)
    # Will be added based on LOC later
    
    return score

def analyze_imports(file_path: Path) -> Tuple[int, int]:
    """Analyze import statements to calculate fan-in/fan-out."""
    try:
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Count imports (fan-out: how many files this imports)
        import_pattern = r'^\s*import\s+.+?\s+from\s+["\'](.+?)["\']'
        imports = re.findall(import_pattern, content, re.MULTILINE)
        fan_out = len(imports)
        
        # Fan-in would require scanning all files (expensive)
        # For now, return 0 - can be calculated in full dependency pass
        fan_in = 0
        
        return fan_in, fan_out
    except:
        return 0, 0

def should_exclude_file(file_path: Path) -> bool:
    """Check if file should be excluded from analysis."""
    path_str = str(file_path)
    
    for pattern in EXCLUDE_PATTERNS:
        if pattern.startswith('*'):
            # Wildcard pattern
            if path_str.endswith(pattern[1:]):
                return True
        elif pattern in path_str:
            return True
    
    return False

def analyze_files(errors: List[TSError]) -> List[FileAnalysis]:
    """Group errors by file and analyze each file."""
    errors_by_file = defaultdict(list)
    
    for error in errors:
        errors_by_file[error.file].append(error)
    
    file_analyses = []
    
    for file_path_str, file_errors in errors_by_file.items():
        file_path = PROJECT_ROOT / file_path_str
        
        if should_exclude_file(file_path):
            continue
        
        relative_path = file_path_str.replace('src/', '', 1)
        
        error_codes = [e.code for e in file_errors]
        line_count = get_file_line_count(file_path)
        size_bytes = get_file_size(file_path)
        arch_score = calculate_arch_score(relative_path)
        
        # Add size-based importance
        if line_count > 1000:
            arch_score += 200
        elif line_count > 500:
            arch_score += 100
        elif line_count > 200:
            arch_score += 50
        
        fan_in, fan_out = analyze_imports(file_path)
        
        file_analyses.append(FileAnalysis(
            path=str(file_path),
            relative_path=relative_path,
            error_count=len(file_errors),
            line_count=line_count,
            size_bytes=size_bytes,
            errors=file_errors,
            error_codes=error_codes,
            arch_score=arch_score,
            fan_in=fan_in,
            fan_out=fan_out
        ))
    
    return file_analyses

# ============================================================================
# PATTERN DETECTION
# ============================================================================

def detect_error_patterns(errors: List[TSError]) -> List[ErrorPattern]:
    """Detect common error patterns."""
    patterns = defaultdict(lambda: {
        'count': 0,
        'files': set(),
        'messages': Counter(),
        'example': None
    })
    
    for error in errors:
        code = error.code
        patterns[code]['count'] += 1
        patterns[code]['files'].add(error.file)
        
        # Extract message pattern (remove specific names/values)
        msg_pattern = re.sub(r"'[^']*'", "'...'", error.message)
        msg_pattern = re.sub(r'"[^"]*"', '"..."', msg_pattern)
        patterns[code]['messages'][msg_pattern] += 1
        
        if patterns[code]['example'] is None:
            patterns[code]['example'] = error.full_line
    
    result = []
    for code, data in patterns.items():
        most_common_msg = data['messages'].most_common(1)[0][0]
        result.append(ErrorPattern(
            code=code,
            count=data['count'],
            message_pattern=most_common_msg,
            affected_files=sorted(list(data['files']))[:10],  # Limit to 10
            example=data['example']
        ))
    
    return sorted(result, key=lambda p: p.count, reverse=True)

# ============================================================================
# DUPLICATE DETECTION
# ============================================================================

def find_duplicate_names(file_analyses: List[FileAnalysis]) -> Dict[str, List[str]]:
    """Find files with identical names in different directories."""
    names = defaultdict(list)
    
    for analysis in file_analyses:
        filename = Path(analysis.relative_path).name
        names[filename].append(analysis.relative_path)
    
    # Return only actual duplicates
    return {name: paths for name, paths in names.items() if len(paths) > 1}

# ============================================================================
# RECOMMENDATIONS
# ============================================================================

def generate_recommendations(
    file_analyses: List[FileAnalysis],
    error_patterns: List[ErrorPattern],
    duplicates: Dict[str, List[str]]
) -> List[str]:
    """Generate actionable recommendations."""
    recommendations = []
    
    # High-impact files
    high_impact = [f for f in file_analyses if f.arch_score > 700 and f.error_count > 5]
    if high_impact:
        recommendations.append(
            f"🎯 PRIORITY: Fix {len(high_impact)} high-impact architectural files first "
            f"({', '.join([f.relative_path.split('/')[-1] for f in high_impact[:3]])}...)"
        )
    
    # Pattern-based fixes
    top_patterns = error_patterns[:3]
    for pattern in top_patterns:
        if pattern.count > 20:
            recommendations.append(
                f"🔧 PATTERN FIX: Error {pattern.code} appears {pattern.count} times - "
                f"fix root cause instead of individual instances"
            )
    
    # Duplicate files
    critical_duplicates = {
        name: paths for name, paths in duplicates.items()
        if any('Service' in name or 'Store' in name or 'Context' in name for _ in [name])
    }
    if critical_duplicates:
        recommendations.append(
            f"⚠️  DUPLICATES: {len(critical_duplicates)} critical duplicate files detected - "
            f"investigate {', '.join(list(critical_duplicates.keys())[:3])}"
        )
    
    # Large error-prone files
    large_files = [f for f in file_analyses if f.line_count > 1000 and f.error_count > 20]
    if large_files:
        recommendations.append(
            f"📦 LARGE FILES: {len(large_files)} massive files with many errors - "
            f"these may need interface fixes rather than line-by-line changes"
        )
    
    return recommendations

# ============================================================================
# REPORTING
# ============================================================================

def generate_report(
    errors: List[TSError],
    file_analyses: List[FileAnalysis],
    error_patterns: List[ErrorPattern],
    duplicates: Dict[str, List[str]]
) -> AnalysisReport:
    """Generate comprehensive analysis report."""
    
    error_code_counts = Counter(e.code for e in errors)
    top_error_codes = error_code_counts.most_common(10)
    
    top_by_errors = sorted(file_analyses, key=lambda f: f.error_count, reverse=True)[:20]
    top_by_arch = sorted(file_analyses, key=lambda f: f.arch_score, reverse=True)[:20]
    
    recommendations = generate_recommendations(file_analyses, error_patterns, duplicates)
    
    return AnalysisReport(
        timestamp=datetime.now().isoformat(),
        total_errors=len(errors),
        total_files=len(file_analyses),
        files_with_errors=len([f for f in file_analyses if f.error_count > 0]),
        top_error_codes=top_error_codes,
        error_patterns=error_patterns[:10],
        top_files_by_errors=top_by_errors,
        top_files_by_arch=top_by_arch,
        duplicate_names=duplicates,
        recommendations=recommendations
    )

def print_report(report: AnalysisReport, verbose: bool = False):
    """Print formatted report to console."""
    
    print("\n" + "=" * 80)
    print("G-STUDIO TYPESCRIPT ERROR INTELLIGENCE REPORT")
    print("=" * 80)
    print(f"Timestamp: {report.timestamp}")
    print(f"Total Errors: {report.total_errors}")
    print(f"Files with Errors: {report.files_with_errors} / {report.total_files}")
    
    print("\n" + "-" * 80)
    print("TOP ERROR CODES")
    print("-" * 80)
    for code, count in report.top_error_codes:
        pct = (count / report.total_errors * 100) if report.total_errors > 0 else 0
        print(f"  {code:8s} | {count:4d} errors ({pct:5.1f}%)")
    
    print("\n" + "-" * 80)
    print("ERROR PATTERNS (Top 5)")
    print("-" * 80)
    for i, pattern in enumerate(report.error_patterns[:5], 1):
        print(f"\n{i}. {pattern.code} - {pattern.count} occurrences")
        print(f"   Pattern: {pattern.message_pattern[:100]}")
        print(f"   Affects {len(pattern.affected_files)} files")
        if verbose:
            print(f"   Example: {pattern.example[:120]}")
    
    print("\n" + "-" * 80)
    print("TOP FILES BY ERROR COUNT")
    print("-" * 80)
    print(f"{'Rank':<5} {'Errors':<7} {'LOC':<7} {'Arch':<6} {'File':<50}")
    print("-" * 80)
    for i, file in enumerate(report.top_files_by_errors[:15], 1):
        filename = file.relative_path
        if len(filename) > 47:
            filename = "..." + filename[-44:]
        print(f"{i:<5} {file.error_count:<7} {file.line_count:<7} {file.arch_score:<6} {filename:<50}")
    
    print("\n" + "-" * 80)
    print("TOP FILES BY ARCHITECTURAL IMPORTANCE")
    print("-" * 80)
    print(f"{'Rank':<5} {'Score':<7} {'Errors':<7} {'LOC':<7} {'File':<50}")
    print("-" * 80)
    for i, file in enumerate(report.top_files_by_arch[:15], 1):
        filename = file.relative_path
        if len(filename) > 47:
            filename = "..." + filename[-44:]
        print(f"{i:<5} {file.arch_score:<7} {file.error_count:<7} {file.line_count:<7} {filename:<50}")
    
    if report.duplicate_names:
        print("\n" + "-" * 80)
        print("DUPLICATE FILE NAMES")
        print("-" * 80)
        for name, paths in sorted(report.duplicate_names.items())[:10]:
            print(f"\n  {name}:")
            for path in paths:
                print(f"    - {path}")
    
    print("\n" + "-" * 80)
    print("RECOMMENDATIONS")
    print("-" * 80)
    for rec in report.recommendations:
        print(f"  {rec}")
    
    print("\n" + "=" * 80)
    print()

def save_json_report(report: AnalysisReport, output_file: Path):
    """Save report as JSON."""
    # Convert dataclasses to dicts
    data = {
        'timestamp': report.timestamp,
        'total_errors': report.total_errors,
        'total_files': report.total_files,
        'files_with_errors': report.files_with_errors,
        'top_error_codes': report.top_error_codes,
        'error_patterns': [
            {
                'code': p.code,
                'count': p.count,
                'message_pattern': p.message_pattern,
                'affected_files': p.affected_files,
                'example': p.example
            }
            for p in report.error_patterns
        ],
        'top_files_by_errors': [
            {
                'relative_path': f.relative_path,
                'error_count': f.error_count,
                'line_count': f.line_count,
                'arch_score': f.arch_score,
                'error_codes': f.error_codes
            }
            for f in report.top_files_by_errors
        ],
        'top_files_by_arch': [
            {
                'relative_path': f.relative_path,
                'error_count': f.error_count,
                'line_count': f.line_count,
                'arch_score': f.arch_score
            }
            for f in report.top_files_by_arch
        ],
        'duplicate_names': report.duplicate_names,
        'recommendations': report.recommendations
    }
    
    with open(output_file, 'w') as f:
        json.dump(data, f, indent=2)
    
    print(f"✅ JSON report saved to: {output_file}")

# ============================================================================
# MAIN
# ============================================================================

def main():
    parser = argparse.ArgumentParser(description='Analyze TypeScript errors in G-Studio')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    parser.add_argument('--json', '-j', type=str, help='Save JSON report to file')
    parser.add_argument('--skip-tsc', '-s', action='store_true', help='Skip running tsc (use cached output)')
    
    args = parser.parse_args()
    
    print("🔍 G-Studio TypeScript Error Intelligence Analyzer")
    print("=" * 80)
    
    # Run TypeScript compiler
    if not args.skip_tsc:
        tsc_output = run_tsc_check()
    else:
        print("⚠️  Skipping tsc run (using cached data)")
        tsc_output = ""
    
    # Parse errors
    print("📊 Parsing error output...")
    errors = parse_tsc_output(tsc_output)
    print(f"   Found {len(errors)} errors")
    
    # Analyze files
    print("📁 Analyzing files...")
    file_analyses = analyze_files(errors)
    print(f"   Analyzed {len(file_analyses)} files")
    
    # Detect patterns
    print("🔍 Detecting error patterns...")
    error_patterns = detect_error_patterns(errors)
    print(f"   Identified {len(error_patterns)} error patterns")
    
    # Find duplicates
    print("🔎 Finding duplicate file names...")
    duplicates = find_duplicate_names(file_analyses)
    print(f"   Found {len(duplicates)} sets of duplicate names")
    
    # Generate report
    print("📋 Generating report...")
    report = generate_report(errors, file_analyses, error_patterns, duplicates)
    
    # Display report
    print_report(report, verbose=args.verbose)
    
    # Save JSON if requested
    if args.json:
        save_json_report(report, Path(args.json))
    
    print("✅ Analysis complete!")
    return 0

if __name__ == "__main__":
    exit(main())
