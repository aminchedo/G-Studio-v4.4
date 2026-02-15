# Source Directory Analysis Script

## Overview

The `src-directory-analyzer.ts` script performs comprehensive analysis of all files in the `src/` directory. It helps you understand:

1. **Equivalent Files** - Which src files have corresponding files in the root directory
2. **File Usage** - Which src files are actually being used in the project
3. **File Usability** - Which src files are functional and can be integrated
4. **Optimization Opportunities** - Recommendations for consolidating or removing redundant files

## Features

### 1. Check for Equivalent Files in Root Directory

For each file in `src/`, the script:
- Searches the root directory for files with the same name
- Compares file content to determine similarity
- Calculates similarity scores (identical, similar, different)
- Identifies differences in size, lines, and modification dates

### 2. Check If Files Are Used in the Project

The script:
- Scans all project files for import references
- Tracks which files import each src file
- Identifies unused files that aren't referenced anywhere
- Provides reference counts and import paths

### 3. Check If Files Can Be Used

For each src file, the script analyzes:
- **Syntax Validity** - Basic syntax checks (optional, with `--check-syntax`)
- **Exports** - Whether the file exports anything
- **Imports** - Whether the file imports dependencies
- **Purpose** - Determines if file is a component, service, utility, hook, store, type, or config
- **Issues** - Identifies TODO/FIXME markers, TypeScript ignore directives, etc.
- **Suggestions** - Provides actionable suggestions for improvement

### 4. Generate Comprehensive Report

The report includes:
- Executive summary with key metrics
- High/Medium/Low priority recommendations
- Detailed file-by-file analysis
- Lists of files to remove, integrate, or consolidate
- Action items with specific recommendations

## Usage

### Basic Usage

```bash
# Run analysis and generate report
npm run analyze:src

# Run with verbose output
npm run analyze:src:verbose

# Run with syntax checking (requires tsc)
npm run analyze:src:syntax

# Or directly with tsx
tsx scripts/src-directory-analyzer.ts
```

### Options

- `--verbose`: Show detailed analysis information during execution
- `--check-syntax`: Check TypeScript/JavaScript syntax (requires tsc to be available)
- `--report=path`: Specify custom report output path (default: `src-directory-analysis-report.md`)

### Examples

```bash
# Generate report with default name
tsx scripts/src-directory-analyzer.ts

# Generate report with custom name
tsx scripts/src-directory-analyzer.ts --report=my-src-analysis.md

# Verbose mode for debugging
tsx scripts/src-directory-analyzer.ts --verbose

# With syntax checking
tsx scripts/src-directory-analyzer.ts --check-syntax --verbose
```

## Report Structure

### Executive Summary
- Total number of src files
- Files with equivalents in root
- Unused files count
- Unusable files count
- Files to integrate/remove/consolidate

### High Priority Recommendations
Files that should be addressed immediately:
- Files to remove (unused and problematic)
- Files with critical issues
- Files that need urgent attention

### Medium Priority Recommendations
Files that should be addressed soon:
- Files to integrate (functional but unused)
- Files to consolidate (have equivalents)
- Files with minor issues

### Files with Equivalents
Detailed comparison of src files that have corresponding files in root:
- Similarity scores
- Size and line differences
- Date differences
- Content differences

### Unused Files
Complete list of src files that aren't referenced anywhere in the project.

### Files That Can Be Integrated
Functional files that aren't currently used but could be integrated:
- Purpose identification
- Export/import status
- Suggestions for integration

### Detailed Analysis
Complete file-by-file analysis with:
- Usage status
- Usability assessment
- Purpose identification
- Issues and suggestions
- Recommendations

## File Purpose Detection

The script automatically determines file purpose based on:
- **Directory structure** (components/, services/, hooks/, etc.)
- **File naming** (use*.tsx for hooks, *Component.tsx for components)
- **Content analysis** (React imports, hooks usage, exports)

Detected purposes:
- `component` - React components
- `service` - Service classes/functions
- `utility` - Utility functions
- `hook` - React hooks
- `store` - State management (Zustand, Redux, etc.)
- `type` - Type definitions
- `config` - Configuration files
- `unknown` - Could not determine

## Recommendations

The script provides recommendations with the following actions:

- **keep** - File is used and functional (no action needed)
- **remove** - File should be removed (unused or problematic)
- **consolidate** - File has equivalent in root (should be merged)
- **integrate** - File is functional but unused (should be integrated)
- **review** - File needs manual review

Each recommendation includes:
- Priority level (high, medium, low)
- Detailed reason
- Specific action items

## Example Output

```
🚀 Source Directory Analysis Script
============================================================

📁 Scanning project files...
✓ Found 1234 files (456 in src, 778 in root)
🔍 Tracking file references...
✓ Tracked 3456 file references
🔄 Finding equivalent files in root directory...
✓ Found 23 files with equivalents in root directory
📊 Checking file usage...
✓ 389 of 456 src files are used
🔧 Checking file usability...
✓ 445 of 456 src files are usable
💡 Generating recommendations...
✓ Generated recommendations for 456 files

============================================================

📊 Analysis Complete!

Summary:
  - Total src files: 456
  - Files with equivalents: 23
  - Unused files: 67
  - Unusable files: 11
  - Files to integrate: 12
  - Files to remove: 8
  - Files to consolidate: 15

📄 Full report saved to: src-directory-analysis-report.md
```

## Use Cases

### 1. Project Cleanup
Identify and remove unused or redundant files to reduce project size and complexity.

### 2. Code Integration
Find functional files that aren't being used and integrate them into the project.

### 3. Consolidation
Identify duplicate files between src and root directories and consolidate them.

### 4. Quality Assurance
Check for files with issues (syntax errors, missing exports, etc.) that need attention.

### 5. Documentation
Understand what files exist in src, their purpose, and their usage status.

## Best Practices

1. **Review High Priority First** - Address high-priority recommendations immediately
2. **Test After Changes** - Run your test suite after removing or modifying files
3. **Use Version Control** - Commit changes incrementally and review diffs
4. **Manual Review** - Some recommendations require manual review before acting
5. **Regular Analysis** - Run the script periodically to keep the project clean

## Integration with Other Tools

This script complements other analysis tools:

- **project-file-comparison.ts** - Compares files between src and root
- **file-optimizer.ts** - General file optimization
- **src-directory-analyzer.ts** - Focused on src directory analysis

Use all three together for comprehensive project optimization.

## Troubleshooting

### Script is slow
- The script scans all files and tracks references
- Large projects may take a few minutes
- Use `--verbose` to see progress

### Syntax checking fails
- Ensure `tsc` is available in your PATH
- Syntax checking is optional (use `--check-syntax` flag)
- Some files may have dependencies that cause false positives

### Missing files in report
- Check if files are in ignored directories
- Verify file extensions are supported
- Some binary files may not be analyzed

### Incorrect purpose detection
- Purpose is determined heuristically
- May need manual review for edge cases
- File location and naming help improve accuracy

## Contributing

If you find issues or have suggestions:

1. Check existing issues
2. Create detailed bug reports or feature requests
3. Include sample files if possible
4. Test with different project structures

## License

This script is part of the G Studio project and follows the same license.
