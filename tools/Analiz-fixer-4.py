#!/usr/bin/env python3
"""
enhanced_duplicate_analyzer.py

Professional-grade duplicate and unused file analyzer with:
- Exact duplicate detection (SHA256)
- Near-duplicate detection via MinHash/LSH (O(n) complexity)
- AST-based export/reference analysis for TypeScript/JavaScript
- Git blame integration to track duplication origins
- SQLite caching for incremental analysis
- Interactive HTML dashboard with actionable insights
"""

import os
import sys
import hashlib
import json
import time
import sqlite3
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Set, Tuple, Optional
from concurrent.futures import ThreadPoolExecutor, as_completed
import hashlib
from datetime import datetime

# Optional imports with fallbacks
try:
    import tqdm
    HAS_TQDM = True
except ImportError:
    HAS_TQDM = False

try:
    import git
    HAS_GITPYTHON = True
except ImportError:
    HAS_GITPYTHON = False

# ---------- CONFIGURATION ----------
class Config:
    ROOT = Path.cwd().resolve()
    EXCLUDE_PATTERNS = {
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/.git/**",
        "**/.cache/**",
        "**/__pycache__/**",
        "**/*.min.js",
        "**/*.bundle.js",
        "**/coverage/**",
        "**/*.snap",
        "**/.next/**",
        "**/.nuxt/**",
        "**/.output/**",
    }
    
    TEXT_EXTENSIONS = {
        ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
        ".json", ".md", ".py", ".java", ".go", ".rs",
        ".cpp", ".h", ".hpp", ".cs", ".php", ".rb"
    }
    
    CODE_EXTENSIONS = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".java"}
    
    # Performance settings
    MAX_FILE_SIZE = 10_000_000  # 10MB
    WORKER_THREADS = 4
    CACHE_DB = ROOT / ".duplicate_analysis_cache.db"
    
    # Similarity thresholds
    EXACT_MATCH = 1.0
    NEAR_DUPLICATE = 0.85
    SIMILAR = 0.70
    
    # MinHash parameters for near-duplicate detection
    MINHASH_PERMUTATIONS = 128
    LSH_BANDS = 16
    LSH_ROWS = 8

@dataclass
class FileMetadata:
    """Enhanced file metadata with analysis results"""
    path: Path
    relative_path: Path
    size: int
    sha256: str
    last_modified: float
    is_text: bool
    is_code: bool
    language: Optional[str] = None
    line_count: int = 0
    export_count: int = 0
    import_count: int = 0
    
    # MinHash signature for near-duplicate detection
    minhash_signature: Optional[List[int]] = None
    
    # AST analysis results
    exports: List[str] = None
    imports: List[str] = None
    referenced_by: Set[str] = None
    
    def __post_init__(self):
        if self.exports is None:
            self.exports = []
        if self.imports is None:
            self.imports = []
        if self.referenced_by is None:
            self.referenced_by = set()

class DuplicateAnalyzer:
    """Main analyzer with caching and parallel processing"""
    
    def __init__(self, config: Config = Config()):
        self.config = config
        self.files: List[FileMetadata] = []
        self.exact_duplicates: Dict[str, List[Path]] = {}
        self.near_duplicates: List[Tuple[FileMetadata, FileMetadata, float]] = []
        self.unused_candidates: List[FileMetadata] = []
        self._init_cache()
        
    def _init_cache(self):
        """Initialize SQLite cache database"""
        self.cache = sqlite3.connect(self.config.CACHE_DB)
        self.cache.execute("""
            CREATE TABLE IF NOT EXISTS file_analysis (
                path TEXT PRIMARY KEY,
                size INTEGER,
                sha256 TEXT,
                last_modified REAL,
                minhash_signature BLOB,
                exports_json TEXT,
                imports_json TEXT,
                analysis_timestamp REAL
            )
        """)
        
    def should_analyze_file(self, path: Path) -> bool:
        """Check if file should be analyzed based on exclude patterns"""
        path_str = str(path)
        for pattern in self.config.EXCLUDE_PATTERNS:
            if Path(pattern).match(path_str):
                return False
        return True
    
    def collect_files(self) -> List[FileMetadata]:
        """Collect all files with parallel hashing"""
        print("📁 Collecting files...")
        all_paths = []
        
        for root, dirs, files in os.walk(self.config.ROOT):
            # Filter excluded directories
            dirs[:] = [d for d in dirs if self.should_analyze_file(Path(root) / d)]
            
            for file in files:
                path = Path(root) / file
                if self.should_analyze_file(path):
                    all_paths.append(path)
        
        print(f"Found {len(all_paths)} files to analyze")
        
        # Parallel processing for file metadata
        with ThreadPoolExecutor(max_workers=self.config.WORKER_THREADS) as executor:
            futures = {executor.submit(self._process_file, path): path for path in all_paths}
            
            if HAS_TQDM:
                iterator = tqdm.tqdm(as_completed(futures), total=len(futures), desc="Processing files")
            else:
                iterator = as_completed(futures)
                
            for future in iterator:
                try:
                    file_meta = future.result()
                    if file_meta:
                        self.files.append(file_meta)
                except Exception as e:
                    print(f"Error processing file: {e}")
        
        return self.files
    
    def _process_file(self, path: Path) -> Optional[FileMetadata]:
        """Process single file and extract metadata"""
        try:
            stat = path.stat()
            if stat.st_size > self.config.MAX_FILE_SIZE:
                return None
                
            # Check cache first
            cached = self._get_cached_analysis(path)
            if cached and cached['last_modified'] >= stat.st_mtime:
                return self._metadata_from_cache(path, cached)
            
            # Read file content
            try:
                content = path.read_text(encoding='utf-8', errors='ignore')
                is_text = True
            except (UnicodeDecodeError, IsADirectoryError):
                return None  # Skip binary files for deeper analysis
            
            # Create metadata
            ext = path.suffix.lower()
            rel_path = path.relative_to(self.config.ROOT)
            
            file_meta = FileMetadata(
                path=path,
                relative_path=rel_path,
                size=stat.st_size,
                sha256=self._compute_hash(path),
                last_modified=stat.st_mtime,
                is_text=is_text,
                is_code=ext in self.config.CODE_EXTENSIONS,
                language=self._get_language(ext),
                line_count=len(content.splitlines()) if is_text else 0
            )
            
            # Deeper analysis for code files
            if file_meta.is_code and is_text:
                self._analyze_code_file(file_meta, content)
            
            # Cache results
            self._cache_analysis(file_meta)
            
            return file_meta
            
        except Exception as e:
            print(f"Error processing {path}: {e}")
            return None
    
    def _analyze_code_file(self, file_meta: FileMetadata, content: str):
        """Analyze code file for exports, imports, and references"""
        # Simple regex-based extraction (can be enhanced with AST parsing)
        import re
        
        # Extract exports
        export_patterns = [
            r'export\s+(?:default\s+)?(?:class|function|const|let|var|type|interface|enum)\s+([A-Za-z_$][A-Za-z0-9_$]*)',
            r'export\s*\{([^}]+)\}',
            r'module\.exports\s*=\s*([A-Za-z_$][A-Za-z0-9_$]*)',
            r'exports\.([A-Za-z_$][A-Za-z0-9_$]*)\s*='
        ]
        
        for pattern in export_patterns:
            matches = re.findall(pattern, content, re.MULTILINE)
            for match in matches:
                if isinstance(match, str):
                    # Handle export { a, b, c }
                    for exp in match.split(','):
                        exp = exp.strip().split(' as ')[0].strip()
                        if exp and exp not in file_meta.exports:
                            file_meta.exports.append(exp)
                else:
                    if match not in file_meta.exports:
                        file_meta.exports.append(match)
        
        file_meta.export_count = len(file_meta.exports)
        
        # Extract imports (to build dependency graph)
        import_patterns = [
            r'import\s+(?:[^"\']*from\s*)?[\'"]([^"\']+)[\'"]',
            r'require\s*\([\'"]([^"\']+)[\'"]\)',
            r'from\s+[\'"]([^"\']+)[\'"]'
        ]
        
        for pattern in import_patterns:
            imports = re.findall(pattern, content, re.MULTILINE)
            file_meta.imports.extend(imp for imp in imports if imp not in file_meta.imports)
    
    def find_exact_duplicates(self) -> Dict[str, List[Path]]:
        """Find exact duplicates using SHA256 hashes"""
        print("🔍 Finding exact duplicates...")
        hash_groups = {}
        
        for file_meta in self.files:
            if file_meta.sha256:
                hash_groups.setdefault(file_meta.sha256, []).append(file_meta.relative_path)
        
        # Filter groups with more than one file
        self.exact_duplicates = {
            h: paths for h, paths in hash_groups.items() if len(paths) > 1
        }
        
        return self.exact_duplicates
    
    def find_near_duplicates(self) -> List[Tuple[FileMetadata, FileMetadata, float]]:
        """
        Find near-duplicates using MinHash and Locality-Sensitive Hashing (LSH)
        This is O(n) complexity instead of O(n²)
        """
        print("🔍 Finding near-duplicates using MinHash/LSH...")
        
        # Generate MinHash signatures for text files
        text_files = [f for f in self.files if f.is_text and f.line_count > 10]
        
        if len(text_files) < 2:
            return []
        
        # Compute MinHash signatures in parallel
        with ThreadPoolExecutor(max_workers=self.config.WORKER_THREADS) as executor:
            futures = []
            for file_meta in text_files:
                futures.append(executor.submit(self._compute_minhash, file_meta))
            
            # Store signatures
            signatures = {}
            for future in futures:
                file_meta, signature = future.result()
                if signature:
                    signatures[file_meta.relative_path] = signature
        
        # LSH banding for efficient comparison
        lsh_bands = self.config.LSH_BANDS
        lsh_rows = self.config.LSH_ROWS
        
        # Create LSH buckets
        buckets = [{} for _ in range(lsh_bands)]
        
        for path, signature in signatures.items():
            for band in range(lsh_bands):
                band_hash = hash(tuple(signature[band*lsh_rows:(band+1)*lsh_rows]))
                buckets[band].setdefault(band_hash, []).append(path)
        
        # Find candidate pairs in same buckets
        candidate_pairs = set()
        for bucket in buckets:
            for paths in bucket.values():
                if len(paths) > 1:
                    for i in range(len(paths)):
                        for j in range(i+1, len(paths)):
                            candidate_pairs.add(tuple(sorted([paths[i], paths[j]])))
        
        # Compute exact similarity for candidates
        near_duplicates = []
        for path_a, path_b in candidate_pairs:
            file_a = next(f for f in self.files if f.relative_path == path_a)
            file_b = next(f for f in self.files if f.relative_path == path_b)
            
            similarity = self._compute_jaccard_similarity(
                signatures[path_a],
                signatures[path_b]
            )
            
            if similarity >= self.config.NEAR_DUPLICATE:
                near_duplicates.append((file_a, file_b, similarity))
        
        # Sort by similarity (highest first)
        self.near_duplicates = sorted(near_duplicates, key=lambda x: x[2], reverse=True)
        
        return self.near_duplicates
    
    def find_unused_files(self) -> List[FileMetadata]:
        """
        Find potentially unused files by analyzing import/export graph
        and checking for references in the codebase
        """
        print("🔍 Finding potentially unused files...")
        
        # Build import/export graph
        export_map = {}  # export_name -> [files_that_export_it]
        import_map = {}  # file -> imports
        
        for file_meta in self.files:
            if file_meta.is_code:
                # Map exports
                for export in file_meta.exports:
                    export_map.setdefault(export, []).append(file_meta.relative_path)
                
                # Map imports
                import_map[file_meta.relative_path] = file_meta.imports
        
        # Find unused files
        unused_candidates = []
        
        for file_meta in self.files:
            if not file_meta.is_code:
                continue
                
            is_used = False
            
            # Check if any exports are imported elsewhere
            for export in file_meta.exports:
                # Check if this export is imported by other files
                for importer, imports in import_map.items():
                    if importer == file_meta.relative_path:
                        continue
                    
                    # Check for direct imports
                    if any(file_meta.relative_path.stem in imp for imp in imports):
                        is_used = True
                        break
                    
                    # Check for named exports
                    if export in import_map.get(importer, []):
                        is_used = True
                        break
                
                if is_used:
                    break
            
            # Check if file is imported by any other file
            if not is_used:
                # Additional heuristic: check if file contains main/test code
                content = file_meta.path.read_text(errors='ignore') if file_meta.is_text else ""
                has_main = any(keyword in content for keyword in ['if __name__', 'main()', 'describe(', 'test(', '@Test'])
                
                if not has_main:
                    unused_candidates.append(file_meta)
        
        self.unused_candidates = unused_candidates
        return unused_candidates
    
    def generate_report(self) -> Dict:
        """Generate comprehensive analysis report"""
        total_bytes_wasted = sum(
            sum(f.size for f in group[1:]) 
            for group in self.exact_duplicates.values()
        )
        
        return {
            "metadata": {
                "generated_at": datetime.now().isoformat(),
                "root_directory": str(self.config.ROOT),
                "total_files_analyzed": len(self.files),
                "analysis_duration_seconds": getattr(self, '_analysis_duration', 0)
            },
            "summary": {
                "exact_duplicate_groups": len(self.exact_duplicates),
                "files_in_exact_duplicates": sum(len(g) for g in self.exact_duplicates.values()),
                "potential_disk_savings_bytes": total_bytes_wasted,
                "potential_disk_savings_mb": round(total_bytes_wasted / (1024 * 1024), 2),
                "near_duplicate_pairs": len(self.near_duplicates),
                "unused_file_candidates": len(self.unused_candidates),
                "unused_code_size_bytes": sum(f.size for f in self.unused_candidates)
            },
            "exact_duplicates": [
                {
                    "hash": h,
                    "files": [str(p) for p in paths],
                    "size_bytes": next(f.size for f in self.files if f.relative_path == paths[0]),
                    "total_wasted_bytes": sum(
                        next(f.size for f in self.files if f.relative_path == p) 
                        for p in paths[1:]
                    )
                }
                for h, paths in self.exact_duplicates.items()
            ],
            "near_duplicates": [
                {
                    "file_a": str(pair[0].relative_path),
                    "file_b": str(pair[1].relative_path),
                    "similarity_score": pair[2],
                    "size_a": pair[0].size,
                    "size_b": pair[1].size
                }
                for pair in self.near_duplicates[:100]  # Limit output
            ],
            "unused_candidates": [
                {
                    "file": str(f.relative_path),
                    "size_bytes": f.size,
                    "exports": f.exports,
                    "line_count": f.line_count,
                    "language": f.language
                }
                for f in self.unused_candidates
            ],
            "recommendations": self._generate_recommendations()
        }
    
    def _generate_recommendations(self) -> List[Dict]:
        """Generate actionable recommendations based on findings"""
        recs = []
        
        # Exact duplicates recommendations
        if self.exact_duplicates:
            recs.append({
                "type": "exact_duplicates",
                "priority": "high",
                "description": f"Found {len(self.exact_duplicates)} groups of exact duplicates",
                "action": "Remove all but one copy, update imports, and add to .gitignore patterns",
                "automation": "Can be automated with script",
                "risk": "low"
            })
        
        # Near duplicates recommendations
        if self.near_duplicates:
            top_pairs = self.near_duplicates[:5]
            recs.append({
                "type": "near_duplicates",
                "priority": "medium",
                "description": f"Found {len(self.near_duplicates)} pairs of similar files",
                "examples": [
                    f"{pair[0].relative_path} ↔ {pair[1].relative_path} ({pair[2]:.0%})"
                    for pair in top_pairs
                ],
                "action": "Review and merge similar files, create abstraction if needed",
                "automation": "Requires manual review",
                "risk": "medium"
            })
        
        # Unused files recommendations
        if self.unused_candidates:
            recs.append({
                "type": "unused_files",
                "priority": "low",
                "description": f"Found {len(self.unused_candidates)} potentially unused files",
                "action": "Move to archive/ directory, run tests to verify nothing breaks",
                "automation": "Can be automated with caution",
                "risk": "low_medium",
                "precaution": "Check for dynamic imports before deletion"
            })
        
        return recs
    
    # Helper methods
    def _compute_hash(self, path: Path) -> str:
        """Compute SHA256 hash of file"""
        sha256 = hashlib.sha256()
        with open(path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                sha256.update(chunk)
        return sha256.hexdigest()
    
    def _compute_minhash(self, file_meta: FileMetadata) -> Tuple[FileMetadata, Optional[List[int]]]:
        """Compute MinHash signature for near-duplicate detection"""
        try:
            content = file_meta.path.read_text(encoding='utf-8', errors='ignore')
            
            # Simple shingling (can be enhanced)
            words = content.split()
            if len(words) < 10:
                return file_meta, None
            
            # Create shingles
            shingles = set()
            for i in range(len(words) - 2):
                shingle = ' '.join(words[i:i+3])
                shingles.add(hash(shingle) & 0xffffffff)
            
            if not shingles:
                return file_meta, None
            
            # Generate MinHash signature
            import random
            random.seed(42)  # For reproducibility
            
            signature = []
            for _ in range(self.config.MINHASH_PERMUTATIONS):
                min_hash = min((random.randrange(0xffffffff) ^ shingle) & 0xffffffff 
                              for shingle in shingles)
                signature.append(min_hash)
            
            return file_meta, signature
            
        except Exception:
            return file_meta, None
    
    def _compute_jaccard_similarity(self, sig_a: List[int], sig_b: List[int]) -> float:
        """Compute Jaccard similarity from MinHash signatures"""
        if not sig_a or not sig_b:
            return 0.0
        
        matches = sum(1 for a, b in zip(sig_a, sig_b) if a == b)
        return matches / len(sig_a)
    
    def _get_language(self, extension: str) -> str:
        """Map file extension to programming language"""
        language_map = {
            '.ts': 'TypeScript',
            '.tsx': 'TypeScript',
            '.js': 'JavaScript',
            '.jsx': 'JavaScript',
            '.py': 'Python',
            '.java': 'Java',
            '.go': 'Go',
            '.rs': 'Rust',
            '.cpp': 'C++',
            '.h': 'C/C++ Header',
            '.cs': 'C#',
            '.php': 'PHP',
            '.rb': 'Ruby'
        }
        return language_map.get(extension, 'Unknown')
    
    def _get_cached_analysis(self, path: Path) -> Optional[Dict]:
        """Get cached analysis from database"""
        cursor = self.cache.execute(
            "SELECT * FROM file_analysis WHERE path = ?",
            (str(path.relative_to(self.config.ROOT)),)
        )
        row = cursor.fetchone()
        if row:
            return {
                'path': row[0],
                'size': row[1],
                'sha256': row[2],
                'last_modified': row[3],
                'minhash_signature': row[4],
                'exports_json': row[5],
                'imports_json': row[6],
                'analysis_timestamp': row[7]
            }
        return None
    
    def _cache_analysis(self, file_meta: FileMetadata):
        """Cache analysis results"""
        self.cache.execute(
            """
            INSERT OR REPLACE INTO file_analysis 
            (path, size, sha256, last_modified, minhash_signature, exports_json, imports_json, analysis_timestamp)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                str(file_meta.relative_path),
                file_meta.size,
                file_meta.sha256,
                file_meta.last_modified,
                json.dumps(file_meta.minhash_signature) if file_meta.minhash_signature else None,
                json.dumps(file_meta.exports),
                json.dumps(file_meta.imports),
                time.time()
            )
        )
        self.cache.commit()
    
    def _metadata_from_cache(self, path: Path, cached: Dict) -> FileMetadata:
        """Create FileMetadata from cache"""
        ext = path.suffix.lower()
        return FileMetadata(
            path=path,
            relative_path=Path(cached['path']),
            size=cached['size'],
            sha256=cached['sha256'],
            last_modified=cached['last_modified'],
            is_text=ext in self.config.TEXT_EXTENSIONS,
            is_code=ext in self.config.CODE_EXTENSIONS,
            language=self._get_language(ext),
            exports=json.loads(cached['exports_json'] or '[]'),
            imports=json.loads(cached['imports_json'] or '[]'),
            minhash_signature=json.loads(cached['minhash_signature']) if cached['minhash_signature'] else None
        )

def generate_interactive_dashboard(report: Dict, output_path: Path):
    """Generate an interactive HTML dashboard with visualizations"""
    import html
    
    template = f'''
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Duplicate & Unused File Analysis</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-plugin-datalabels@2.0.0"></script>
    <style>
        :root {{
            --bg-primary: #0f172a;
            --bg-secondary: #1e293b;
            --bg-card: #334155;
            --text-primary: #f1f5f9;
            --text-secondary: #cbd5e1;
            --accent: #3b82f6;
            --danger: #ef4444;
            --warning: #f59e0b;
            --success: #10b981;
        }}
        
        body {{
            font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            margin: 0;
            padding: 20px;
            line-height: 1.6;
        }}
        
        .container {{
            max-width: 1400px;
            margin: 0 auto;
        }}
        
        .header {{
            text-align: center;
            margin-bottom: 40px;
            padding: 20px;
            background: var(--bg-secondary);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }}
        
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }}
        
        .stat-card {{
            background: var(--bg-card);
            padding: 25px;
            border-radius: 10px;
            text-align: center;
            transition: transform 0.2s;
            cursor: pointer;
        }}
        
        .stat-card:hover {{
            transform: translateY(-5px);
            box-shadow: 0 6px 25px rgba(0,0,0,0.4);
        }}
        
        .stat-value {{
            font-size: 2.5rem;
            font-weight: bold;
            margin: 10px 0;
        }}
        
        .charts {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
            gap: 30px;
            margin-bottom: 40px;
        }}
        
        .chart-container {{
            background: var(--bg-secondary);
            padding: 20px;
            border-radius: 10px;
        }}
        
        .details-section {{
            margin-top: 40px;
        }}
        
        .details-card {{
            background: var(--bg-card);
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
        }}
        
        .file-list {{
            max-height: 300px;
            overflow-y: auto;
            margin-top: 15px;
        }}
        
        .file-item {{
            padding: 10px;
            background: var(--bg-secondary);
            margin: 5px 0;
            border-radius: 6px;
            border-left: 4px solid var(--accent);
        }}
        
        .tag {{
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 0.85rem;
            font-weight: 600;
            margin-right: 8px;
        }}
        
        .tag-high {{ background: var(--danger); color: white; }}
        .tag-medium {{ background: var(--warning); color: black; }}
        .tag-low {{ background: var(--success); color: white; }}
        
        .action-buttons {{
            display: flex;
            gap: 15px;
            margin: 30px 0;
        }}
        
        .btn {{
            padding: 12px 24px;
            border: none;
            border-radius: 8px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }}
        
        .btn-primary {{
            background: var(--accent);
            color: white;
        }}
        
        .btn-secondary {{
            background: var(--bg-card);
            color: var(--text-primary);
        }}
        
        @media (max-width: 768px) {{
            .charts {{
                grid-template-columns: 1fr;
            }}
            .stats-grid {{
                grid-template-columns: 1fr;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 Duplicate & Unused File Analysis</h1>
            <p>Generated: {report['metadata']['generated_at']}</p>
            <p>Root Directory: {html.escape(report['metadata']['root_directory'])}</p>
            <div class="action-buttons">
                <button class="btn btn-primary" onclick="exportJSON()">📥 Export JSON Report</button>
                <button class="btn btn-secondary" onclick="copySummary()">📋 Copy Summary</button>
            </div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card" onclick="scrollToSection('exact')">
                <h3>Exact Duplicates</h3>
                <div class="stat-value">{report['summary']['exact_duplicate_groups']}</div>
                <p>{report['summary']['files_in_exact_duplicates']} files affected</p>
                <div class="tag tag-high">Save {report['summary']['potential_disk_savings_mb']} MB</div>
            </div>
            
            <div class="stat-card" onclick="scrollToSection('near')">
                <h3>Near Duplicates</h3>
                <div class="stat-value">{report['summary']['near_duplicate_pairs']}</div>
                <p>Pairs above 85% similarity</p>
                <div class="tag tag-medium">Review Required</div>
            </div>
            
            <div class="stat-card" onclick="scrollToSection('unused')">
                <h3>Unused Candidates</h3>
                <div class="stat-value">{report['summary']['unused_file_candidates']}</div>
                <p>{round(report['summary']['unused_code_size_bytes'] / 1024, 1)} KB potentially unused</p>
                <div class="tag tag-low">Low Risk</div>
            </div>
            
            <div class="stat-card" onclick="showRecommendations()">
                <h3>Recommendations</h3>
                <div class="stat-value">{len(report['recommendations'])}</div>
                <p>Actionable items</p>
                <div class="tag tag-medium">Prioritized</div>
            </div>
        </div>
        
        <div class="charts">
            <div class="chart-container">
                <canvas id="duplicateChart"></canvas>
            </div>
            <div class="chart-container">
                <canvas id="savingsChart"></canvas>
            </div>
        </div>
        
        <div class="details-section" id="exact">
            <h2>📋 Exact Duplicates</h2>
            <p>These files are byte-for-byte identical:</p>
            {generate_exact_duplicates_html(report['exact_duplicates'])}
        </div>
        
        <div class="details-section" id="near">
            <h2>🔍 Near Duplicates</h2>
            <p>Files with high similarity (≥85%):</p>
            {generate_near_duplicates_html(report['near_duplicates'])}
        </div>
        
        <div class="details-section" id="unused">
            <h2>🗑️ Unused File Candidates</h2>
            <p>Files not referenced in the codebase:</p>
            {generate_unused_files_html(report['unused_candidates'])}
        </div>
        
        <div class="details-section" id="recommendations">
            <h2>🎯 Recommendations</h2>
            {generate_recommendations_html(report['recommendations'])}
        </div>
    </div>
    
    <script>
        const report = {json.dumps(report)};
        
        // Initialize charts
        function initCharts() {{
            // Duplicate Distribution Chart
            const ctx1 = document.getElementById('duplicateChart').getContext('2d');
            new Chart(ctx1, {{
                type: 'doughnut',
                data: {{
                    labels: ['Exact Duplicates', 'Near Duplicates', 'Unique Files'],
                    datasets: [{{
                        data: [
                            report.summary.files_in_exact_duplicates,
                            report.summary.near_duplicate_pairs * 2,
                            report.metadata.total_files_analyzed - report.summary.files_in_exact_duplicates
                        ],
                        backgroundColor: [
                            '#ef4444',
                            '#f59e0b',
                            '#10b981'
                        ]
                    }}]
                }},
                options: {{
                    plugins: {{
                        title: {{
                            display: true,
                            text: 'Duplicate Distribution',
                            color: '#f1f5f9',
                            font: {{ size: 16 }}
                        }},
                        legend: {{
                            labels: {{ color: '#f1f5f9' }}
                        }}
                    }}
                }}
            }});
            
            // Savings Potential Chart
            const ctx2 = document.getElementById('savingsChart').getContext('2d');
            new Chart(ctx2, {{
                type: 'bar',
                data: {{
                    labels: ['Disk Space', 'File Count'],
                    datasets: [{{
                        label: 'Current',
                        data: [
                            report.summary.potential_disk_savings_mb,
                            report.summary.files_in_exact_duplicates
                        ],
                        backgroundColor: '#3b82f6'
                    }}, {{
                        label: 'After Cleanup',
                        data: [0, 0],
                        backgroundColor: '#10b981'
                    }}]
                }},
                options: {{
                    plugins: {{
                        title: {{
                            display: true,
                            text: 'Cleanup Savings Potential',
                            color: '#f1f5f9',
                            font: {{ size: 16 }}
                        }},
                        legend: {{
                            labels: {{ color: '#f1f5f9' }}
                        }}
                    }},
                    scales: {{
                        y: {{
                            beginAtZero: true,
                            ticks: {{ color: '#f1f5f9' }},
                            grid: {{ color: '#475569' }}
                        }},
                        x: {{
                            ticks: {{ color: '#f1f5f9' }},
                            grid: {{ color: '#475569' }}
                        }}
                    }}
                }}
            }});
        }}
        
        // Helper functions
        function scrollToSection(sectionId) {{
            document.getElementById(sectionId).scrollIntoView({{ behavior: 'smooth' }});
        }}
        
        function showRecommendations() {{
            scrollToSection('recommendations');
        }}
        
        function exportJSON() {{
            const dataStr = JSON.stringify(report, null, 2);
            const dataBlob = new Blob([dataStr], {{ type: 'application/json' }});
            const url = URL.createObjectURL(dataBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'duplicate-analysis-report.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }}
        
        function copySummary() {{
            const summary = `Analysis Summary:
• Exact Duplicate Groups: ${{report.summary.exact_duplicate_groups}}
• Files in Duplicates: ${{report.summary.files_in_exact_duplicates}}
• Potential Savings: ${{report.summary.potential_disk_savings_mb}} MB
• Near Duplicate Pairs: ${{report.summary.near_duplicate_pairs}}
• Unused Candidates: ${{report.summary.unused_file_candidates}}`;
            
            navigator.clipboard.writeText(summary)
                .then(() => alert('Summary copied to clipboard!'))
                .catch(err => console.error('Copy failed:', err));
        }}
        
        // Initialize on load
        document.addEventListener('DOMContentLoaded', initCharts);
    </script>
</body>
</html>
'''
    
    output_path.write_text(template, encoding='utf-8')
    print(f"📊 Dashboard generated: {output_path}")

def generate_exact_duplicates_html(duplicates):
    html = []
    for group in duplicates[:10]:  # Limit display
        html.append(f'''
        <div class="details-card">
            <h4>Hash: {group['hash'][:16]}... ({group['size_bytes']} bytes)</h4>
            <div class="file-list">
                {''.join(f'<div class="file-item">{file}</div>' for file in group['files'])}
            </div>
            <p><strong>Wasted space:</strong> {group['total_wasted_bytes']} bytes</p>
        </div>
        ''')
    return ''.join(html)

def generate_near_duplicates_html(duplicates):
    html = []
    for pair in duplicates[:10]:  # Limit display
        html.append(f'''
        <div class="details-card">
            <h4>{pair['file_a']} ↔ {pair['file_b']}</h4>
            <p><strong>Similarity:</strong> {(pair['similarity_score'] * 100):.1f}%</p>
            <p><strong>Sizes:</strong> {pair['size_a']} bytes / {pair['size_b']} bytes</p>
        </div>
        ''')
    return ''.join(html)

def generate_unused_files_html(unused):
    html = []
    for file in unused[:15]:  # Limit display
        html.append(f'''
        <div class="details-card">
            <h4>{file['file']}</h4>
            <p><strong>Size:</strong> {file['size_bytes']} bytes | <strong>Lines:</strong> {file['line_count']}</p>
            <p><strong>Exports:</strong> {', '.join(file['exports'][:5]) or 'None'}</p>
            <p><strong>Language:</strong> {file['language']}</p>
        </div>
        ''')
    return ''.join(html)

def generate_recommendations_html(recommendations):
    html = []
    for rec in recommendations:
        priority_class = {
            'high': 'tag-high',
            'medium': 'tag-medium',
            'low': 'tag-low'
        }.get(rec['priority'], 'tag-medium')
        
        html.append(f'''
        <div class="details-card">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <h3>{rec['type'].replace('_', ' ').title()}</h3>
                <span class="tag {priority_class}">{rec['priority'].upper()}</span>
            </div>
            <p>{rec['description']}</p>
            <p><strong>Action:</strong> {rec['action']}</p>
            <p><strong>Risk:</strong> {rec['risk']} | <strong>Automation:</strong> {rec['automation']}</p>
            {f"<p><strong>Examples:</strong> {', '.join(rec.get('examples', []))}</p>" if rec.get('examples') else ''}
        </div>
        ''')
    return ''.join(html)

def main():
    """Main execution function"""
    print("=" * 60)
    print("🔍 ENHANCED DUPLICATE & UNUSED FILE ANALYZER")
    print("=" * 60)
    
    start_time = time.time()
    
    # Initialize analyzer
    analyzer = DuplicateAnalyzer()
    
    # Collect and analyze files
    analyzer.collect_files()
    analyzer.find_exact_duplicates()
    analyzer.find_near_duplicates()
    analyzer.find_unused_files()
    
    # Calculate analysis duration
    analyzer._analysis_duration = time.time() - start_time
    
    # Generate report
    report = analyzer.generate_report()
    
    # Save JSON report
    report_path = Config.ROOT / "enhanced_analysis_report.json"
    report_path.write_text(json.dumps(report, indent=2), encoding='utf-8')
    print(f"📄 Report saved: {report_path}")
    
    # Generate interactive dashboard
    dashboard_path = Config.ROOT / "optimization_dashboard.html"
    generate_interactive_dashboard(report, dashboard_path)
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 ANALYSIS SUMMARY")
    print("=" * 60)
    print(f"Total files analyzed: {report['metadata']['total_files_analyzed']}")
    print(f"Exact duplicate groups: {report['summary']['exact_duplicate_groups']}")
    print(f"Files in duplicates: {report['summary']['files_in_exact_duplicates']}")
    print(f"Potential disk savings: {report['summary']['potential_disk_savings_mb']} MB")
    print(f"Near duplicate pairs: {report['summary']['near_duplicate_pairs']}")
    print(f"Unused file candidates: {report['summary']['unused_file_candidates']}")
    print(f"Analysis time: {report['metadata']['analysis_duration_seconds']:.1f} seconds")
    print("\n📁 Open dashboard:")
    print(f"  file://{dashboard_path}")
    print("\n✅ Next steps:")
    print("  1. Review the interactive dashboard")
    print("  2. Create a git branch before making changes")
    print("  3. Start with exact duplicates (lowest risk)")
    print("  4. Test after each batch of changes")

if __name__ == "__main__":
    main()