# G-Studio Quick Start Guide

## 🚀 Get Started in 30 Seconds

### Option 1: Minimal Setup (No Dependencies)

```bash
# Just download and run - works immediately!
python gstudio_analyzer.py /path/to/your/project
```

The tool works out of the box with zero dependencies. It will use regex-based parsing and basic analysis.

### Option 2: Full Featured (Recommended)

```bash
# Install dependencies
pip install networkx numpy scikit-learn tree-sitter tqdm

# Install tree-sitter language bindings
pip install tree-sitter-typescript tree-sitter-javascript tree-sitter-python

# Run analysis
python gstudio_analyzer.py /path/to/your/project
```

## 📁 What You'll Get

After running, check the `gstudio_output/` folder:

1. **analysis_report.html** - Beautiful visual report (open in browser)
2. **analysis_report.json** - Machine-readable data
3. **gstudio_cache.db** - Cache file (makes re-runs 100x faster)

## 🎯 Common Use Cases

### Find Components to Integrate

```bash
python gstudio_analyzer.py /path/to/project --min-score 70
```

Check "Valuable Unused" section - these are high-quality components not yet imported.

### Clean Up Dead Code

```bash
python gstudio_analyzer.py /path/to/project
```

Check "Dead Code" section - these files can be safely deleted.

### Find Duplicate Code

```bash
python gstudio_analyzer.py /path/to/project
```

Check "Code Clones" section - consolidate similar files.

### Check Architecture Health

```bash
python gstudio_analyzer.py /path/to/project --verbose
```

Check "Circular Dependencies" - fix dependency cycles.

## 📊 Understanding the Scores

**Value Score (0-100):**
- 80-100: Must-have component, integrate immediately
- 60-79: Valuable, worth reviewing
- 40-59: Moderate value
- 0-39: Low priority

**Score Components:**
- AI Features: +30 points
- MCP Integration: +25 points
- Complexity: Up to +15 points
- Centrality: Up to +15 points
- TypeScript: +10 points
- Git Activity: Up to +10 points

## 🔧 Pro Tips

1. **Use cache** - Second run is instant!
2. **Start verbose** - See what's happening: `--verbose`
3. **Filter results** - Use `--min-score` to focus on high-value
4. **Regular runs** - Weekly analysis catches issues early
5. **Track changes** - Compare JSON reports over time

## ⚡ Speed It Up

```bash
# Skip git analysis (faster, less accurate)
python gstudio_analyzer.py /path/to/project --no-git

# Use cache (automatic on second run)
python gstudio_analyzer.py /path/to/project  # First run
python gstudio_analyzer.py /path/to/project  # 100x faster!

# Disable cache for fresh analysis
python gstudio_analyzer.py /path/to/project --no-cache
```

## 🐛 Troubleshooting

**"tree-sitter not available"**
- It's optional! Tool still works with regex parsing
- For best accuracy: `pip install tree-sitter tree-sitter-typescript tree-sitter-javascript tree-sitter-python`

**"networkx not available"**
- Dependency graph features disabled
- Install: `pip install networkx`

**"No files found"**
- Check you're pointing to the right directory
- Check your project has .ts, .tsx, .js, .jsx, or .py files

## 📖 Next Steps

1. Run analysis on your project
2. Open `gstudio_output/analysis_report.html` in browser
3. Review "Valuable Unused" components
4. Integrate or remove based on findings
5. Run again weekly to track progress

## 💡 Example Workflow

```bash
# 1. Initial analysis
python gstudio_analyzer.py ~/my-awesome-app

# 2. Open report
open gstudio_output/analysis_report.html  # Mac
# or
start gstudio_output/analysis_report.html  # Windows
# or
xdg-open gstudio_output/analysis_report.html  # Linux

# 3. Fix issues (remove dead code, integrate valuable components)

# 4. Re-analyze (instant with cache!)
python gstudio_analyzer.py ~/my-awesome-app

# 5. Repeat weekly
```

## 🎉 That's It!

You're ready to analyze code like a pro. Check README.md for advanced features.

Happy analyzing! 🚀
