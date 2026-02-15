# Project File Comparison and Optimization Script

## Overview

The `project-file-comparison.ts` script performs comprehensive analysis of files in your project, specifically comparing files in the `src/` directory with their counterparts in the root directory. It helps identify:

1. **Duplicate files** - Files that exist in both `src/` and root directories
2. **More complete versions** - Determines which version of a file is more complete/up-to-date
3. **Redundant files** - Files that are outdated or not used
4. **Unused files** - Files that are not referenced anywhere in the codebase
5. **Consolidation opportunities** - Suggests how to optimize your project structure

## Features

### 1. File Comparison
- Compares files with the same name in `src/` and root directories
- Analyzes content completeness using multiple metrics:
  - File size and line count
  - Number of exports and imports
  - Documentation/comments presence
  - Modification dates
  - TODO/FIXME markers (indicates incomplete work)

### 2. Usage Tracking
- Tracks file references through imports
- Identifies which files are actually used in the codebase
- Helps determine if a file can be safely removed

### 3. Intelligent Recommendations
- **High Priority**: Files that should be replaced or removed immediately
- **Medium Priority**: Files that should be moved or consolidated
- **Low Priority**: Files that need manual review

### 4. Comprehensive Reporting
- Generates a detailed markdown report with:
  - Executive summary
  - Directory-by-directory comparisons
  - File-by-file analysis
  - Actionable steps with priorities
  - Suggested git commands

## Usage

### Basic Usage

```bash
# Run analysis and generate report
npm run compare:files

# Run with verbose output
npm run compare:files:verbose

# Or directly with tsx
tsx scripts/project-file-comparison.ts
```

### Options

- `--verbose`: Show detailed comparison information during execution
- `--report=path`: Specify custom report output path (default: `project-file-comparison-report.md`)

### Examples

```bash
# Generate report with default name
tsx scripts/project-file-comparison.ts

# Generate report with custom name
tsx scripts/project-file-comparison.ts --report=my-comparison-report.md

# Verbose mode for debugging
tsx scripts/project-file-comparison.ts --verbose
```

## Report Structure

The generated report includes:

1. **Executive Summary**
   - Total files scanned
   - Number of duplicates found
   - Redundant and unused files count

2. **Actionable Steps**
   - High priority actions (replace/remove)
   - Medium priority actions (move/consolidate)
   - Low priority actions (manual review)

3. **Directory Comparisons**
   - For each directory that exists in both `src/` and root:
     - File-by-file comparison
     - Completeness scores
     - Usage status
     - Recommendations

4. **Redundant Files**
   - List of files that can be removed or replaced

5. **Unused Files**
   - Files not referenced anywhere in the codebase

6. **Suggested Git Commands**
   - Ready-to-use git commands for applying changes

## Completeness Score Calculation

The script calculates a completeness score (0-1) for each file based on:

- **File Size** (20%): Larger files might be more complete
- **Non-empty Lines** (30%): More content = more complete
- **Exports** (20%): Indicates functionality
- **Imports** (10%): Indicates integration
- **Documentation** (10%): Comments and docs
- **TODO/FIXME** (-10%): Penalty for incomplete work
- **Recency** (+10%): Bonus for recently modified files

## Recommendations

The script provides recommendations with the following actions:

- **replace**: Replace one file with a better version
- **remove**: Remove a redundant file
- **move-to-src**: Move a file from root to src directory
- **move-to-root**: Move a file from src to root directory
- **keep-both**: Both files are needed (manual review)
- **merge**: Files should be merged (manual review)
- **no-action**: No action needed

## Example Output

```
🚀 Project File Comparison and Optimization Script
============================================================

📁 Scanning project files...
✓ Found 1234 files (456 in src, 778 in root)
🔍 Tracking file references...
✓ Tracked 3456 file references
📂 Comparing src and root directories...
✓ Compared 8 directory pairs
🔎 Identifying unused files...
✓ Found 23 potentially unused files

============================================================

📊 Analysis Complete!

Summary:
  - Total files scanned: 1234
  - Duplicate pairs found: 45
  - Redundant files: 12
  - Unused files: 23
  - High priority actions: 3
  - Medium priority actions: 8

📄 Full report saved to: project-file-comparison-report.md
```

## Integration with Existing Tools

This script complements the existing `file-optimizer.ts` script:

- **file-optimizer.ts**: General file optimization and cleanup
- **project-file-comparison.ts**: Focused on comparing `src/` vs root directories

You can use both scripts together for comprehensive project optimization.

## Best Practices

1. **Review the report first**: Always review the generated report before making changes
2. **Start with high priority**: Focus on high-priority recommendations first
3. **Test after changes**: Run your test suite after applying changes
4. **Use version control**: Commit changes incrementally
5. **Backup important files**: The script doesn't modify files automatically, but always have backups

## Troubleshooting

### Script is slow
- The script scans all files in your project
- Large projects may take a few minutes
- Use `--verbose` to see progress

### Missing files in report
- Check if files are in ignored directories (node_modules, dist, etc.)
- Verify file extensions are supported

### Incorrect recommendations
- Review the completeness scores and reasons
- Check file usage manually if needed
- Some recommendations require manual review

## Contributing

If you find issues or have suggestions for improvement, please:

1. Check the existing issues
2. Create a detailed bug report or feature request
3. Include sample files if possible

## License

This script is part of the G Studio project and follows the same license.
