# File Optimizer Script

A comprehensive script for analyzing and optimizing project file structure by identifying unused files, duplicates, and outdated versions.

## Features

- 🔍 **Unused File Detection**: Identifies files that are not referenced anywhere in the codebase
- 🔄 **Duplicate Detection**: Finds files that exist in both root and `src` directories
- ⏰ **Outdated File Detection**: Compares file versions and identifies which ones are newer/more complete
- 📂 **Directory Comparison**: Compares files in `src` subdirectories with their root equivalents
- 📊 **Completeness Analysis**: Calculates completeness scores for files based on content, size, exports, imports, and documentation
- 🔄 **Replacement Suggestions**: Identifies files that should be replaced with more complete versions (prioritized: high/medium/low)
- 💡 **Consolidation Suggestions**: Provides actionable recommendations for file organization
- 📊 **Comprehensive Reports**: Generates detailed markdown reports with all findings
- 🧹 **Automated Cleanup**: Optionally removes/moves/replaces files based on analysis
- 🔧 **Git Integration**: Automatically stages and commits changes (optional)

## Usage

### Basic Analysis (Dry Run)

```bash
npm run optimize:files
```

This runs the analysis in dry-run mode (default), showing what would be changed without actually modifying files.

### Generate Report Only

```bash
npm run optimize:files:report
```

Generates a detailed markdown report without suggesting cleanup actions.

### Execute Changes

```bash
npm run optimize:files:execute
```

Actually performs file operations (removes unused files, moves duplicates, etc.). **Use with caution!**

### Execute with Git Integration

```bash
npm run optimize:files:execute:git
```

Executes changes and automatically stages/commits them to git.

### Custom Report Path

```bash
tsx scripts/file-optimizer.ts --report=my-report.md
```

## Command Line Options

- `--dry-run` - Run analysis without making changes (default)
- `--execute` - Actually perform file operations
- `--report-only` - Only generate report, don't suggest cleanup
- `--git` - Automatically stage and commit changes (requires `--execute`)
- `--report=path` - Specify custom report output path

## What It Analyzes

### 1. Unused Files

Scans all source files (`.ts`, `.tsx`, `.js`, `.jsx`, `.html`, `.css`, etc.) for import statements and references to identify files that are never imported or used.

**Note**: Some files are always considered "used" (e.g., `package.json`, `tsconfig.json`, `index.html`, etc.)

### 2. Duplicate Files

Compares files in the root directory with files in the `src` directory:
- **Identical**: Files with exactly the same content
- **Similar**: Files with >80% line similarity
- **Different**: Files with significant differences

### 2.5. Directory Comparisons (src vs root)

For each directory in `src` (e.g., `src/components`, `src/services`), compares with equivalent directories in root:
- Finds files with the same name in both locations
- Calculates completeness scores for each version
- Determines which version is more complete based on:
  - File size
  - Number of non-empty lines
  - Export/import counts
  - Documentation/comments
  - Modification date
  - TODO/FIXME markers (penalty)
- Provides recommendations: replace, remove, move, merge, or keep-both

### 3. Outdated Files

For duplicate files, determines which version is newer based on:
- Last modification date
- File size (larger files may be more complete)
- Content completeness

### 3.5. Replacement Suggestions

Based on directory comparisons, generates prioritized suggestions:
- **High Priority**: Large completeness difference or root file is unused
- **Medium Priority**: Moderate completeness difference
- **Low Priority**: Small differences, both files may be needed

### 4. Consolidation Suggestions

Provides recommendations for:
- **Remove**: Files that are unused or have better versions elsewhere
- **Move**: Files that should be relocated for better organization
- **Merge**: Files that could be combined (future feature)

## Report Format

The generated report includes:

1. **Summary**: Overview of findings
2. **Unused Files**: List of files not referenced in codebase
3. **Duplicate Files**: Comparison of root vs src files
4. **Outdated Files**: Files with newer versions available
5. **Consolidation Suggestions**: Actionable recommendations
6. **Git Commands**: Ready-to-use git commands for staging changes

## Safety Features

- **Dry Run by Default**: Never modifies files unless explicitly requested
- **Backup Creation**: Creates backups in `.file-optimizer-backup/` before any changes
- **Git Integration**: Can automatically track changes in version control
- **Config File Protection**: Important config files are never flagged as unused

## Ignored Directories

The script automatically ignores:
- `node_modules`
- `dist`, `build`, `release`
- `.git`
- `__tests__`, `coverage`
- `.project-intel`
- Other build/cache directories

## Example Output

```
🚀 File Analysis and Optimization Script
==================================================

📁 Scanning project files...
✓ Found 1234 files
🔍 Tracking file references...
✓ Tracked 5678 file references
🔎 Identifying unused files...
✓ Found 12 potentially unused files
🔄 Finding duplicate files...
✓ Found 5 duplicate file pairs
⏰ Identifying outdated files...
✓ Found 3 outdated files
💡 Generating consolidation suggestions...
✓ Generated 20 consolidation suggestions

==================================================

📊 Analysis Complete!

# File Analysis and Optimization Report
...
```

## Best Practices

1. **Always run in dry-run mode first** to review what will be changed
2. **Review the generated report** before executing changes
3. **Commit or stash your current changes** before running with `--execute`
4. **Use `--git` flag** to automatically track changes in version control
5. **Check the backup directory** (`.file-optimizer-backup/`) if you need to restore files

## Troubleshooting

### Script fails to find files

- Ensure you're running from the project root directory
- Check that file paths don't contain special characters
- Verify file permissions

### Import resolution issues

- The script uses heuristics to resolve imports
- Some dynamic imports may not be detected
- Check the report for false positives

### Git integration not working

- Ensure you're in a git repository
- Check that git is installed and in PATH
- Verify working directory is clean (or use `--execute` without `--git`)

## Integration with CI/CD

You can integrate this script into your CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Analyze project structure
  run: npm run optimize:files:report
  continue-on-error: true

- name: Upload report
  uses: actions/upload-artifact@v3
  with:
    name: file-optimization-report
    path: file-optimization-report.md
```

## Future Enhancements

- [ ] Merge file functionality
- [ ] Configurable ignore patterns
- [ ] Support for more file types
- [ ] Integration with ESLint/Prettier
- [ ] Web UI for reviewing changes
- [ ] Export to JSON/CSV formats

## License

Part of the G Studio project.
