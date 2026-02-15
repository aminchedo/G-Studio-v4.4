# Report Cache Explanation & Solution

## Problem

The analysis reports (`gstudio-reports/analysis_report.json` and `gstudio-reports/analysis_report.html`) are not updating after refactoring changes because the script uses a **cache system** to avoid re-analyzing unchanged files.

## How the Cache Works

### Cache Location

- **Cache File**: `.gstudio_cache.json` (in project root)
- **Report Directory**: `./gstudio-reports/` (default, configurable via `--output-dir`)

### Cache Mechanism

The script (`g_studio_intelligence_v10.py`) uses a `CacheManager` class that:

1. **Stores file analysis results** in `.gstudio_cache.json`
2. **Checks file modification time (`mtime`)** and **content hash** to detect changes
3. **Skips re-analysis** if both `mtime` and hash match cached values
4. **Only re-analyzes** files that have changed

### Cache Key Logic

```python
# From g_studio_intelligence_v10.py lines 575-585
def get(self, file_path: str, mtime: float, content_hash: str) -> Optional[Dict]:
    if key in self.cache:
        cached = self.cache[key]
        if cached.get('mtime') == mtime and cached.get('hash') == content_hash:
            self.hits += 1
            return cached  # Use cached result
    self.misses += 1
    return None  # File changed, needs re-analysis
```

## Why Reports Don't Update

The cache **should** detect changes automatically because:

- File modification time (`mtime`) changes when files are edited
- Content hash changes when file content changes

However, reports might not reflect changes if:

1. **Cache is stale** - Old cache entries might have incorrect data
2. **Files weren't saved** - Unsaved changes aren't detected
3. **Cache version mismatch** - Cache from different script version
4. **Dependency analysis cached** - Wiring issues depend on dependency graph, which might be cached

## Solutions

### Option 1: Clear Cache and Re-run (Recommended)

```bash
# Delete cache file
rm .gstudio_cache.json

# Run analysis without cache
python g_studio_intelligence_v10.py . --no-cache
```

### Option 2: Force Full Re-analysis

```bash
# Run with --no-cache flag
python g_studio_intelligence_v10.py . --no-cache --output-dir ./gstudio-reports
```

### Option 3: Delete Reports and Re-generate

```bash
# Delete old reports
rm -rf gstudio-reports/

# Delete cache
rm .gstudio_cache.json

# Run fresh analysis
python g_studio_intelligence_v10.py .
```

### Option 4: Check Cache Hit Rate

The script reports cache statistics. If you see high hit rates, files might not be detected as changed:

```bash
python g_studio_intelligence_v10.py . --verbose
```

Look for output like:

```
Cache hits: X
Cache misses: Y
Cache hit rate: Z%
```

## Report Paths

### Default Paths

- **HTML Report**: `./gstudio-reports/analysis_report.html`
- **JSON Report**: `./gstudio-reports/analysis_report.json`
- **Cache File**: `./.gstudio_cache.json`

### Custom Output Directory

You can specify a different output directory:

```bash
python g_studio_intelligence_v10.py . --output-dir ./my-reports
```

This will create:

- `./my-reports/analysis_report.html`
- `./my-reports/analysis_report.json`

## Verification Steps

1. **Check cache file exists**:

   ```bash
   ls -la .gstudio_cache.json
   ```

2. **Check file modification times**:

   ```bash
   # On Windows PowerShell
   Get-ChildItem src\contexts\*.tsx | Select-Object Name, LastWriteTime
   ```

3. **Verify cache contains your files**:

   ```bash
   # Check if modified files are in cache
   python -c "import json; cache=json.load(open('.gstudio_cache.json')); print([k for k in cache.get('files', {}).keys() if 'context' in k.lower()][:10])"
   ```

4. **Run with verbose logging**:
   ```bash
   python g_studio_intelligence_v10.py . --verbose --no-cache
   ```

## Expected Behavior After Refactoring

After our refactoring changes:

1. **Modified files** should be detected as changed (different `mtime` and `hash`)
2. **Cache should miss** for modified files
3. **Reports should update** with new analysis
4. **Wiring issues** should reflect that `useContext` violations are fixed

## If Reports Still Don't Update

If reports still don't reflect changes after clearing cache:

1. **Check file timestamps** - Ensure files were actually saved
2. **Verify script version** - Ensure using correct script version
3. **Check for errors** - Run with `--verbose` to see what's happening
4. **Manual cache inspection** - Check `.gstudio_cache.json` to see what's cached

## Quick Fix Command

```bash
# One-liner to clear cache and regenerate reports
rm .gstudio_cache.json && python g_studio_intelligence_v10.py . --no-cache --output-dir ./gstudio-reports
```

---

**Note**: The cache is designed to speed up analysis by skipping unchanged files. After major refactoring, it's recommended to clear the cache to ensure accurate results.
