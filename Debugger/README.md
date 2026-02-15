# G-Studio Advanced Code Intelligence Platform v8.0

🚀 Production-ready static code analysis tool for TypeScript, JavaScript, and Python projects.

## ✨ Features

- **Multi-Language Support**: TypeScript, JavaScript, Python with AST parsing
- **Advanced Clone Detection**: Find duplicate and similar code using structural analysis
- **Dead Code Detection**: Identify unused components and files
- **Circular Dependency Detection**: Find and visualize dependency cycles
- **Value Scoring**: Intelligent scoring system for code importance
- **Framework-Aware**: Detects Next.js, Remix, Vite, Gatsby, and more
- **Git Integration**: Historical metrics for better analysis
- **Incremental Analysis**: SQLite-based caching for 100x faster re-runs
- **Beautiful Reports**: HTML and JSON output with actionable insights

## 📦 Installation

### Basic Installation (Minimal Dependencies)

```bash
# Clone or download gstudio_analyzer.py
# Run directly - works with just Python 3.7+
python gstudio_analyzer.py /path/to/your/project
```

### Full Installation (All Features)

```bash
# Install all optional dependencies
pip install networkx numpy scikit-learn tree-sitter tree-sitter-typescript tree-sitter-javascript tree-sitter-python tqdm

# Or use the requirements file
pip install -r requirements.txt
```

### Docker Installation

```bash
# Build image
docker build -t gstudio .

# Run analysis
docker run -v /path/to/project:/project gstudio /project
```

## 🎯 Quick Start

### Basic Usage

```bash
# Analyze a project
python gstudio_analyzer.py /path/to/project

# Custom output directory
python gstudio_analyzer.py /path/to/project --output ./my-reports

# Verbose mode
python gstudio_analyzer.py /path/to/project --verbose
```

### Advanced Usage

```bash
# Only high-value unused components (score >= 70)
python gstudio_analyzer.py /path/to/project --min-score 70

# Disable caching (fresh analysis)
python gstudio_analyzer.py /path/to/project --no-cache

# Skip git analysis (faster, but less accurate)
python gstudio_analyzer.py /path/to/project --no-git

# Generate only HTML report
python gstudio_analyzer.py /path/to/project --format html

# Generate only JSON report
python gstudio_analyzer.py /path/to/project --format json
```

## 📊 What Gets Analyzed

### File Classification

- **Components**: React/Vue components
- **Hooks**: Custom React hooks
- **Contexts**: Context providers
- **Services**: Business logic services
- **Utils**: Utility functions
- **Types**: TypeScript type definitions
- **Pages**: Route pages
- **API**: API endpoints

### Issue Detection

1. **Valuable Unused Components**: High-quality code that's not imported anywhere
2. **Dead Code**: Old, unused files that can be safely removed
3. **Code Clones**: Duplicate or highly similar code
4. **Circular Dependencies**: Dependency cycles that should be broken
5. **Unwired Contexts**: Context providers not added to the app tree

### Metrics

- **Value Score**: 0-100 rating based on:
  - AI/ML features (30 points)
  - MCP integration (25 points)
  - Code complexity (15 points)
  - Graph centrality (15 points)
  - TypeScript usage (10 points)
  - Git activity (10 points)

## 📈 Understanding Reports

### HTML Report

Open `gstudio_output/analysis_report.html` in your browser for:

- **Dashboard**: Overview statistics
- **Valuable Unused**: Components worth integrating
- **Dead Code**: Files to remove
- **Clones**: Duplicate code to consolidate
- **Circular Dependencies**: Cycles to break
- **Layer Distribution**: Architecture overview

### JSON Report

Use `gstudio_output/analysis_report.json` for:

- **CI/CD Integration**: Automated checks
- **Custom Processing**: Build your own tooling
- **Historical Tracking**: Compare over time

## 🔧 Configuration

### Customizing Ignore Patterns

Edit the `Config` class in `gstudio_analyzer.py`:

```python
class Config:
    IGNORE_DIRS = {
        'node_modules', 'dist', 'build',
        # Add your custom directories
        'my_custom_dir', 'temp'
    }
    
    IGNORE_FILES = {
        '.test.', '.spec.',
        # Add your custom patterns
        '.generated.'
    }
```

### Customizing Score Weights

```python
SCORE_WEIGHTS = {
    'ai_features': 30,      # AI/ML code weight
    'mcp': 25,             # MCP integration weight
    'complexity': 15,      # Code complexity weight
    'centrality': 15,      # Graph importance weight
    'types': 10,          # TypeScript weight
    'git_activity': 10,   # Git activity weight
}
```

## 🎨 Example Workflows

### Finding Valuable Components to Integrate

```bash
# Find high-value unused components
python gstudio_analyzer.py /path/to/project --min-score 80

# Review the "Valuable Unused" section in the HTML report
# These are components worth integrating into your app
```

### Cleaning Up a Large Codebase

```bash
# Full analysis with verbose output
python gstudio_analyzer.py /path/to/project --verbose

# 1. Review "Dead Code" section - safe to delete
# 2. Review "Clones" - consolidate duplicates
# 3. Review "Circular Dependencies" - refactor cycles
```

### CI/CD Integration

```bash
# Generate JSON report for automation
python gstudio_analyzer.py /path/to/project --format json --no-cache

# Parse JSON in your CI script
python -c "
import json
with open('gstudio_output/analysis_report.json') as f:
    report = json.load(f)
    
# Fail if too many circular dependencies
if len(report['circular_dependencies']) > 5:
    exit(1)
    
# Warn if too much dead code
if len(report['dead_code']) > 20:
    print('Warning: High dead code count')
"
```

## 🚀 Performance Tips

1. **Use Caching**: Re-runs are 100x faster with cache enabled
2. **Incremental Analysis**: Cache is smart about file changes
3. **Skip Git**: Use `--no-git` for faster analysis if you don't need git metrics
4. **Parallel Processing**: Automatically uses all CPU cores

## 🐛 Troubleshooting

### "tree-sitter not available"

This is optional - the tool falls back to regex parsing automatically.
For better accuracy, install tree-sitter:

```bash
pip install tree-sitter tree-sitter-typescript tree-sitter-javascript tree-sitter-python
```

### "networkx not available"

Install for dependency graph analysis:

```bash
pip install networkx
```

### "scikit-learn not available"

Install for clone detection:

```bash
pip install scikit-learn numpy
```

### Analysis is slow

```bash
# Skip git analysis
python gstudio_analyzer.py /path/to/project --no-git

# Use cache on subsequent runs (automatic by default)
```

## 📝 Output Files

```
gstudio_output/
├── analysis_report.html    # Beautiful HTML report
├── analysis_report.json    # Machine-readable JSON
└── gstudio_cache.db        # SQLite cache (for speed)
```

## 🤝 Best Practices

1. **Run Regularly**: Weekly analysis catches issues early
2. **Track Over Time**: Compare JSON reports to see progress
3. **Act on Findings**: Don't just analyze - refactor!
4. **Integrate CI**: Prevent circular dependencies in PRs
5. **Review Valuable Unused**: These are often hidden gems

## 📖 Advanced Topics

### Detecting Custom Patterns

Add patterns to detect in `Config`:

```python
AI_PATTERNS = [
    'useGemini', 'useOpenAI',
    # Add your patterns
    'useMyCustomAI'
]
```

### Custom Layers

Add to `LayerType` enum and `_classify_layer` method:

```python
class LayerType(Enum):
    # ... existing layers ...
    CUSTOM_LAYER = "custom_layer"
```

### Extending Analysis

Subclass `GStudioAnalyzer` and override methods:

```python
class MyAnalyzer(GStudioAnalyzer):
    def _calculate_scores(self):
        super()._calculate_scores()
        # Add custom scoring logic
```

## 🎯 Use Cases

- **Code Review**: Find problematic patterns before merge
- **Refactoring**: Identify duplicate code and circular deps
- **Onboarding**: Understand codebase architecture
- **Tech Debt**: Track and reduce dead code
- **Migration**: Find unused legacy code
- **Architecture**: Visualize layer distribution

## 📜 License

MIT License - Use freely in any project!

## 🙏 Credits

Built with:
- tree-sitter for accurate parsing
- NetworkX for graph analysis
- scikit-learn for clone detection
- SQLite for fast caching

## 📞 Support

- Issues: Create an issue on GitHub
- Questions: Check existing issues first
- Contributions: PRs welcome!

---

**Happy Analyzing! 🚀**
