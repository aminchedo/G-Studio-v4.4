#!/usr/bin/env python3
"""
Enterprise Static Code Intelligence Platform
============================================
A professional-grade structural analysis tool for TypeScript/React/Electron projects.

Author: Senior Software Architect
Purpose: Deep semantic analysis with conservative refactoring recommendations
Output: Self-contained interactive HTML dashboard
"""

import os
import re
import json
import hashlib
import mimetypes
from pathlib import Path
from datetime import datetime
from collections import defaultdict, Counter
from typing import Dict, List, Set, Tuple, Optional, Any
from dataclasses import dataclass, asdict, field
from difflib import SequenceMatcher

# ============================================================================
# CONFIGURATION & CONSTANTS
# ============================================================================

IGNORE_PATTERNS = {
    'backup', 'archive', 'temp', 'tmp', 'dist', 'build', 'final',
    'node_modules', '.git', '.vscode', 'coverage', '.next', 'out',
    '__pycache__', '.pytest_cache', '.mypy_cache', 'vendor'
}

FILE_EXTENSIONS = {
    '.ts', '.tsx', '.js', '.jsx', '.json', '.css', '.scss',
    '.html', '.md', '.yml', '.yaml', '.env'
}

ENTRY_POINT_PATTERNS = {
    'main.ts', 'main.tsx', 'index.ts', 'index.tsx',
    'app.ts', 'app.tsx', '_app.tsx', 'main.js'
}

# ============================================================================
# DATA STRUCTURES
# ============================================================================

@dataclass
class FileMetadata:
    """Complete metadata for a single file"""
    path: str
    relative_path: str
    name: str
    extension: str
    size: int
    lines: int
    hash: str
    structural_hash: str
    modified: float
    category: str
    exports: List[str] = field(default_factory=list)
    imports: List[str] = field(default_factory=list)
    dependencies: Set[str] = field(default_factory=set)
    references: int = 0
    is_entry_point: bool = False
    risk_score: float = 0.0
    stability_score: float = 0.0
    any_count: int = 0
    
@dataclass
class DuplicateCluster:
    """Group of duplicate or similar files"""
    cluster_id: int
    similarity: float
    files: List[str]
    type: str  # exact, structural, semantic
    recommended_action: str
    confidence: float
    reasoning: List[str]
    merge_strategy: Optional[Dict[str, Any]] = None
    
@dataclass
class SameNameConflict:
    """Files with identical names in different locations"""
    name: str
    locations: List[str]
    recommended_keep: str
    confidence: float
    risk_level: str
    reasoning: List[str]

@dataclass
class AnalysisReport:
    """Complete analysis results"""
    timestamp: str
    project_path: str
    total_files: int
    total_lines: int
    total_size: int
    files: Dict[str, FileMetadata]
    duplicates: List[DuplicateCluster]
    same_name_conflicts: List[SameNameConflict]
    unused_files: List[str]
    unwired_features: List[str]
    category_distribution: Dict[str, int]
    risk_distribution: Dict[str, int]

# ============================================================================
# FILE SCANNER
# ============================================================================

class ProjectScanner:
    """Scans and catalogs all project files"""
    
    def __init__(self, root_path: str):
        self.root = Path(root_path).resolve()
        self.files: Dict[str, FileMetadata] = {}
        
    def should_ignore(self, path: Path) -> bool:
        """Check if path should be ignored"""
        parts = path.parts
        return any(pattern in parts or pattern in path.name.lower() 
                  for pattern in IGNORE_PATTERNS)
    
    def scan(self) -> Dict[str, FileMetadata]:
        """Perform complete project scan"""
        print("🔍 Scanning project structure...")
        
        for root, dirs, files in os.walk(self.root):
            # Filter ignored directories
            dirs[:] = [d for d in dirs if not self.should_ignore(Path(root) / d)]
            
            for file in files:
                file_path = Path(root) / file
                
                if self.should_ignore(file_path):
                    continue
                    
                if file_path.suffix not in FILE_EXTENSIONS:
                    continue
                
                try:
                    metadata = self._analyze_file(file_path)
                    self.files[str(file_path)] = metadata
                except Exception as e:
                    print(f"⚠️  Error analyzing {file_path}: {e}")
        
        print(f"✓ Scanned {len(self.files)} files")
        return self.files
    
    def _analyze_file(self, path: Path) -> FileMetadata:
        """Extract complete metadata from a file"""
        with open(path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        lines = content.count('\n') + 1
        size = path.stat().st_size
        modified = path.stat().st_mtime
        
        # Hash calculations
        file_hash = hashlib.sha256(content.encode('utf-8')).hexdigest()
        structural_hash = self._compute_structural_hash(content)
        
        # Extract exports and imports
        exports = self._extract_exports(content)
        imports = self._extract_imports(content)
        
        # Category classification
        category = self._classify_file(path, content)
        
        # Count 'any' usage (type safety metric)
        any_count = len(re.findall(r':\s*any\b', content))
        
        # Check if entry point
        is_entry = path.name in ENTRY_POINT_PATTERNS
        
        relative = path.relative_to(self.root)
        
        return FileMetadata(
            path=str(path),
            relative_path=str(relative),
            name=path.name,
            extension=path.suffix,
            size=size,
            lines=lines,
            hash=file_hash,
            structural_hash=structural_hash,
            modified=modified,
            category=category,
            exports=exports,
            imports=imports,
            is_entry_point=is_entry,
            any_count=any_count
        )
    
    def _compute_structural_hash(self, content: str) -> str:
        """Compute hash of normalized structure (comments/whitespace removed)"""
        # Remove comments
        content = re.sub(r'//.*?$', '', content, flags=re.MULTILINE)
        content = re.sub(r'/\*.*?\*/', '', content, flags=re.DOTALL)
        
        # Normalize whitespace
        content = re.sub(r'\s+', ' ', content)
        
        return hashlib.sha256(content.encode('utf-8')).hexdigest()
    
    def _extract_exports(self, content: str) -> List[str]:
        """Extract all exported symbols"""
        exports = []
        
        # Named exports
        for match in re.finditer(r'export\s+(?:const|let|var|function|class|interface|type|enum)\s+(\w+)', content):
            exports.append(match.group(1))
        
        # Export statements
        for match in re.finditer(r'export\s+\{([^}]+)\}', content):
            names = match.group(1).split(',')
            exports.extend([n.strip().split()[0] for n in names if n.strip()])
        
        # Default export
        if re.search(r'export\s+default', content):
            exports.append('default')
        
        return list(set(exports))
    
    def _extract_imports(self, content: str) -> List[str]:
        """Extract all import statements"""
        imports = []
        
        # ES6 imports
        for match in re.finditer(r'import\s+.*?from\s+[\'"]([^\'"]+)[\'"]', content):
            imports.append(match.group(1))
        
        # Require statements
        for match in re.finditer(r'require\([\'"]([^\'"]+)[\'"]\)', content):
            imports.append(match.group(1))
        
        return imports
    
    def _classify_file(self, path: Path, content: str) -> str:
        """Classify file by purpose"""
        rel_path = str(path).lower()
        name = path.name.lower()
        
        # Path-based classification
        if 'component' in rel_path or path.suffix in {'.tsx', '.jsx'}:
            return 'UI Component'
        if 'service' in rel_path or 'api' in rel_path:
            return 'Service'
        if 'store' in rel_path or 'state' in rel_path:
            return 'State Management'
        if 'hook' in rel_path:
            return 'React Hook'
        if 'context' in rel_path:
            return 'Context Provider'
        if 'util' in rel_path or 'helper' in rel_path:
            return 'Utility'
        if 'test' in rel_path or 'spec' in rel_path:
            return 'Test'
        if 'config' in rel_path or path.suffix in {'.json', '.yml', '.yaml'}:
            return 'Configuration'
        if 'asset' in rel_path or path.suffix in {'.css', '.scss'}:
            return 'Asset'
        if 'script' in rel_path:
            return 'Script'
        
        # Content-based heuristics
        if 'React.Component' in content or 'useState' in content:
            return 'UI Component'
        if 'describe(' in content or 'it(' in content:
            return 'Test'
        
        return 'Core Logic'

# ============================================================================
# DUPLICATE DETECTOR
# ============================================================================

class DuplicateDetector:
    """Advanced duplicate detection engine"""
    
    def __init__(self, files: Dict[str, FileMetadata]):
        self.files = files
        self.clusters: List[DuplicateCluster] = []
        self.cluster_id = 0
    
    def analyze(self) -> List[DuplicateCluster]:
        """Perform all duplicate detection layers"""
        print("🔍 Detecting duplicates...")
        
        # Layer 1: Exact duplicates
        self._detect_exact_duplicates()
        
        # Layer 2: Structural duplicates
        self._detect_structural_duplicates()
        
        # Layer 3: Semantic duplicates
        self._detect_semantic_duplicates()
        
        print(f"✓ Found {len(self.clusters)} duplicate clusters")
        return self.clusters
    
    def _detect_exact_duplicates(self):
        """Find files with identical content"""
        hash_groups = defaultdict(list)
        
        for path, meta in self.files.items():
            if meta.size > 100:  # Skip tiny files
                hash_groups[meta.hash].append(path)
        
        for file_hash, paths in hash_groups.items():
            if len(paths) > 1:
                self._create_cluster(paths, 1.0, 'exact', 'MERGE')
    
    def _detect_structural_duplicates(self):
        """Find files with similar structure (≥85% similarity)"""
        hash_groups = defaultdict(list)
        
        for path, meta in self.files.items():
            hash_groups[meta.structural_hash].append(path)
        
        for struct_hash, paths in hash_groups.items():
            if len(paths) > 1:
                # Already handled by exact duplicates
                if all(self.files[p].hash == self.files[paths[0]].hash for p in paths):
                    continue
                
                # Verify similarity
                similarities = []
                for i in range(len(paths)):
                    for j in range(i + 1, len(paths)):
                        sim = self._compute_similarity(paths[i], paths[j])
                        if sim >= 0.85:
                            similarities.append(sim)
                
                if similarities:
                    avg_sim = sum(similarities) / len(similarities)
                    self._create_cluster(paths, avg_sim, 'structural', 'MERGE')
    
    def _detect_semantic_duplicates(self):
        """Find files with similar API surface"""
        export_groups = defaultdict(list)
        
        for path, meta in self.files.items():
            if meta.exports:
                # Create signature from exports
                signature = tuple(sorted(meta.exports))
                if len(signature) >= 2:  # Meaningful exports
                    export_groups[signature].append(path)
        
        for signature, paths in export_groups.items():
            if len(paths) > 1:
                # Check if already clustered
                if any(set(paths).issubset(set(c.files)) for c in self.clusters):
                    continue
                
                self._create_cluster(paths, 0.75, 'semantic', 'REVIEW')
    
    def _compute_similarity(self, path1: str, path2: str) -> float:
        """Compute structural similarity between two files"""
        try:
            with open(path1, 'r', encoding='utf-8', errors='ignore') as f1:
                content1 = f1.read()
            with open(path2, 'r', encoding='utf-8', errors='ignore') as f2:
                content2 = f2.read()
            
            return SequenceMatcher(None, content1, content2).ratio()
        except:
            return 0.0
    
    def _create_cluster(self, paths: List[str], similarity: float, 
                       cluster_type: str, action: str):
        """Create a duplicate cluster with recommendations"""
        self.cluster_id += 1
        
        # Analyze files for recommendation
        file_scores = []
        for path in paths:
            meta = self.files[path]
            score = (
                meta.references * 10 +
                len(meta.exports) * 5 +
                meta.lines * 0.1 -
                meta.any_count * 2
            )
            file_scores.append((path, score))
        
        file_scores.sort(key=lambda x: x[1], reverse=True)
        base_file = file_scores[0][0]
        
        # Generate reasoning
        reasoning = self._generate_reasoning(paths, base_file)
        
        # Compute confidence
        confidence = self._compute_confidence(paths, similarity)
        
        # Create merge strategy
        merge_strategy = self._create_merge_strategy(paths, base_file)
        
        cluster = DuplicateCluster(
            cluster_id=self.cluster_id,
            similarity=similarity,
            files=paths,
            type=cluster_type,
            recommended_action=action,
            confidence=confidence,
            reasoning=reasoning,
            merge_strategy=merge_strategy
        )
        
        self.clusters.append(cluster)
    
    def _generate_reasoning(self, paths: List[str], base: str) -> List[str]:
        """Generate human-readable reasoning"""
        reasoning = []
        
        base_meta = self.files[base]
        reasoning.append(f"Recommended base: {Path(base).name}")
        reasoning.append(f"Base has {base_meta.references} references")
        reasoning.append(f"Base exports {len(base_meta.exports)} symbols")
        
        for path in paths:
            if path != base:
                meta = self.files[path]
                if meta.references == 0:
                    reasoning.append(f"{Path(path).name} has no references")
                if meta.any_count > base_meta.any_count:
                    reasoning.append(f"{Path(path).name} has weaker typing")
        
        return reasoning
    
    def _compute_confidence(self, paths: List[str], similarity: float) -> float:
        """Compute confidence score for recommendation"""
        confidence = similarity * 0.6
        
        # Boost if clear reference winner
        refs = [self.files[p].references for p in paths]
        if max(refs) > sum(refs) * 0.7:
            confidence += 0.2
        
        # Boost if size difference is small
        sizes = [self.files[p].size for p in paths]
        if max(sizes) / (min(sizes) + 1) < 1.5:
            confidence += 0.1
        
        return min(confidence, 0.99)
    
    def _create_merge_strategy(self, paths: List[str], base: str) -> Dict[str, Any]:
        """Create detailed merge strategy"""
        base_meta = self.files[base]
        
        preserve = []
        remove = []
        
        for path in paths:
            if path != base:
                meta = self.files[path]
                
                # Check for unique exports
                unique_exports = set(meta.exports) - set(base_meta.exports)
                if unique_exports:
                    preserve.append(f"Unique exports from {Path(path).name}: {', '.join(unique_exports)}")
                
                # Check for better error handling
                try:
                    with open(path, 'r', encoding='utf-8', errors='ignore') as f:
                        content = f.read()
                    if 'try' in content and 'catch' in content:
                        if 'try' not in open(base, 'r', encoding='utf-8', errors='ignore').read():
                            preserve.append(f"Error handling from {Path(path).name}")
                except:
                    pass
                
                remove.append(Path(path).name)
        
        # Estimate impact
        total_refs = sum(self.files[p].references for p in paths)
        impact = "Low" if total_refs < 5 else "Medium" if total_refs < 15 else "High"
        
        return {
            'base_file': str(Path(base).relative_to(Path(base).parents[len(Path(base).parents) - 1])),
            'preserve': preserve if preserve else ["All logic from base file"],
            'remove': remove,
            'impact_estimate': f"{impact} UI risk"
        }

# ============================================================================
# SAME-NAME CONFLICT ANALYZER
# ============================================================================

class SameNameAnalyzer:
    """Detect and analyze same-name file conflicts"""
    
    def __init__(self, files: Dict[str, FileMetadata]):
        self.files = files
        self.conflicts: List[SameNameConflict] = []
    
    def analyze(self) -> List[SameNameConflict]:
        """Find and analyze same-name conflicts"""
        print("🔍 Analyzing same-name conflicts...")
        
        name_groups = defaultdict(list)
        
        for path, meta in self.files.items():
            name_groups[meta.name].append(path)
        
        for name, paths in name_groups.items():
            if len(paths) > 1:
                conflict = self._analyze_conflict(name, paths)
                self.conflicts.append(conflict)
        
        print(f"✓ Found {len(self.conflicts)} naming conflicts")
        return self.conflicts
    
    def _analyze_conflict(self, name: str, paths: List[str]) -> SameNameConflict:
        """Analyze a specific naming conflict"""
        # Score each file
        scores = []
        for path in paths:
            meta = self.files[path]
            score = (
                meta.references * 20 +
                len(meta.exports) * 10 +
                meta.lines * 0.5 +
                (100 if meta.is_entry_point else 0) -
                meta.any_count * 5
            )
            scores.append((path, score))
        
        scores.sort(key=lambda x: x[1], reverse=True)
        recommended = scores[0][0]
        
        # Compute confidence
        if len(scores) > 1:
            score_diff = scores[0][1] - scores[1][1]
            confidence = min(0.5 + (score_diff / 100), 0.95)
        else:
            confidence = 0.9
        
        # Determine risk
        max_refs = max(self.files[p].references for p in paths)
        risk = "HIGH" if max_refs > 10 else "MEDIUM" if max_refs > 3 else "LOW"
        
        # Generate reasoning
        reasoning = self._generate_conflict_reasoning(paths, recommended)
        
        return SameNameConflict(
            name=name,
            locations=paths,
            recommended_keep=recommended,
            confidence=confidence,
            risk_level=risk,
            reasoning=reasoning
        )
    
    def _generate_conflict_reasoning(self, paths: List[str], recommended: str) -> List[str]:
        """Generate reasoning for conflict resolution"""
        reasoning = []
        
        rec_meta = self.files[recommended]
        reasoning.append(f"Recommended: {Path(recommended).relative_to(Path(recommended).parents[2])}")
        reasoning.append(f"Has {rec_meta.references} references across codebase")
        reasoning.append(f"Exports {len(rec_meta.exports)} symbols")
        
        for path in paths:
            if path != recommended:
                meta = self.files[path]
                rel_path = Path(path).relative_to(Path(path).parents[2])
                
                if meta.references == 0:
                    reasoning.append(f"{rel_path}: No references found")
                if meta.size < rec_meta.size * 0.5:
                    reasoning.append(f"{rel_path}: Significantly smaller")
                if not meta.exports:
                    reasoning.append(f"{rel_path}: No exports")
        
        return reasoning

# ============================================================================
# USAGE ANALYZER
# ============================================================================

class UsageAnalyzer:
    """Analyze file usage and detect unused/unwired features"""
    
    def __init__(self, files: Dict[str, FileMetadata]):
        self.files = files
        self.unused: List[str] = []
        self.unwired: List[str] = []
        
    def analyze(self):
        """Perform usage analysis"""
        print("🔍 Analyzing file usage patterns...")
        
        # Build reference map
        self._build_reference_map()
        
        # Detect unused files
        self._detect_unused()
        
        # Detect unwired features
        self._detect_unwired()
        
        print(f"✓ Found {len(self.unused)} unused files")
        print(f"✓ Found {len(self.unwired)} unwired features")
    
    def _build_reference_map(self):
        """Build cross-reference map"""
        for path, meta in self.files.items():
            for imp in meta.imports:
                # Resolve import to actual file
                resolved = self._resolve_import(path, imp)
                if resolved and resolved in self.files:
                    self.files[resolved].references += 1
    
    def _resolve_import(self, from_path: str, import_path: str) -> Optional[str]:
        """Resolve import statement to actual file path"""
        if import_path.startswith('.'):
            # Relative import
            base_dir = Path(from_path).parent
            target = (base_dir / import_path).resolve()
            
            # Try with extensions
            for ext in ['.ts', '.tsx', '.js', '.jsx', '']:
                candidate = str(target) + ext
                if candidate in self.files:
                    return candidate
                
                # Try index file
                index_candidate = str(target / 'index') + ext
                if index_candidate in self.files:
                    return index_candidate
        
        return None
    
    def _detect_unused(self):
        """Detect likely unused files"""
        for path, meta in self.files.items():
            # Skip entry points
            if meta.is_entry_point:
                continue
            
            # Skip config files
            if meta.category in {'Configuration', 'Asset'}:
                continue
            
            # Check usage
            if meta.references == 0 and meta.exports:
                # Has exports but no references
                self.unused.append(path)
    
    def _detect_unwired(self):
        """Detect features not integrated into app"""
        for path, meta in self.files.items():
            # Skip if already marked unused
            if path in self.unused:
                continue
            
            # Look for substantial files with no references
            if (meta.references == 0 and 
                meta.lines > 50 and 
                len(meta.exports) > 2 and
                meta.category in {'Service', 'UI Component', 'React Hook', 'Core Logic'}):
                self.unwired.append(path)

# ============================================================================
# STABILITY CALCULATOR
# ============================================================================

class StabilityCalculator:
    """Calculate stability and risk scores"""
    
    def __init__(self, files: Dict[str, FileMetadata]):
        self.files = files
    
    def calculate(self):
        """Calculate all scores"""
        print("🔍 Computing stability metrics...")
        
        for path, meta in self.files.items():
            meta.stability_score = self._compute_stability(meta)
            meta.risk_score = self._compute_risk(meta)
        
        print("✓ Stability metrics computed")
    
    def _compute_stability(self, meta: FileMetadata) -> float:
        """Compute stability score (0-100)"""
        score = 0.0
        
        # Reference count (max 40 points)
        score += min(meta.references * 4, 40)
        
        # Export count (max 20 points)
        score += min(len(meta.exports) * 2, 20)
        
        # Size (max 20 points)
        score += min(meta.lines * 0.1, 20)
        
        # Recency (max 20 points)
        age_days = (datetime.now().timestamp() - meta.modified) / 86400
        score += max(20 - (age_days * 0.1), 0)
        
        return min(score, 100)
    
    def _compute_risk(self, meta: FileMetadata) -> float:
        """Compute refactoring risk score (0-100)"""
        risk = 0.0
        
        # High reference count = high risk
        risk += min(meta.references * 5, 50)
        
        # Entry points are high risk
        if meta.is_entry_point:
            risk += 30
        
        # Many 'any' types = medium risk
        risk += min(meta.any_count * 2, 20)
        
        return min(risk, 100)

# ============================================================================
# REPORT GENERATOR
# ============================================================================

class ReportGenerator:
    """Generate interactive HTML dashboard"""
    
    def __init__(self, report: AnalysisReport):
        self.report = report
    
    def generate(self, output_path: str):
        """Generate complete HTML report"""
        print("📊 Generating dashboard...")
        
        html = self._build_html()
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(html)
        
        print(f"✓ Dashboard saved to: {output_path}")
    
    def _build_html(self) -> str:
        """Build complete HTML document"""
        return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Intelligence Dashboard — {datetime.now().strftime('%Y-%m-%d %H:%M')}</title>
    <style>{self._get_styles()}</style>
</head>
<body>
    <div class="dashboard">
        {self._build_header()}
        {self._build_summary()}
        {self._build_charts()}
        {self._build_search()}
        {self._build_duplicates()}
        {self._build_conflicts()}
        {self._build_unused()}
        {self._build_unwired()}
    </div>
    <script>{self._get_scripts()}</script>
</body>
</html>"""
    
    def _get_styles(self) -> str:
        """Generate CSS styles"""
        return """
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

:root {
    --bg-primary: #0a0e27;
    --bg-secondary: #141b3a;
    --bg-card: rgba(20, 27, 58, 0.6);
    --border: rgba(99, 102, 241, 0.2);
    --text-primary: #e2e8f0;
    --text-secondary: #94a3b8;
    --accent: #6366f1;
    --success: #10b981;
    --warning: #f59e0b;
    --danger: #ef4444;
    --glass: rgba(255, 255, 255, 0.05);
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: linear-gradient(135deg, var(--bg-primary) 0%, #1a1f3a 100%);
    color: var(--text-primary);
    min-height: 100vh;
    line-height: 1.6;
}

.dashboard {
    max-width: 1600px;
    margin: 0 auto;
    padding: 20px;
}

.header {
    background: var(--bg-card);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 30px;
    margin-bottom: 30px;
    position: sticky;
    top: 20px;
    z-index: 100;
}

.header h1 {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 8px;
    background: linear-gradient(135deg, var(--accent), #8b5cf6);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
}

.header .meta {
    color: var(--text-secondary);
    font-size: 14px;
}

.summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.stat-card {
    background: var(--bg-card);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    transition: all 0.3s ease;
}

.stat-card:hover {
    transform: translateY(-4px);
    border-color: var(--accent);
    box-shadow: 0 8px 32px rgba(99, 102, 241, 0.2);
}

.stat-card .label {
    color: var(--text-secondary);
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
}

.stat-card .value {
    font-size: 32px;
    font-weight: 700;
    color: var(--text-primary);
}

.stat-card .subtext {
    color: var(--text-secondary);
    font-size: 12px;
    margin-top: 8px;
}

.section {
    background: var(--bg-card);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 30px;
    margin-bottom: 30px;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
    padding-bottom: 16px;
    border-bottom: 1px solid var(--border);
}

.section-title {
    font-size: 20px;
    font-weight: 600;
}

.badge {
    display: inline-block;
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
}

.badge.success { background: rgba(16, 185, 129, 0.2); color: var(--success); }
.badge.warning { background: rgba(245, 158, 11, 0.2); color: var(--warning); }
.badge.danger { background: rgba(239, 68, 68, 0.2); color: var(--danger); }
.badge.info { background: rgba(99, 102, 241, 0.2); color: var(--accent); }

.search-box {
    width: 100%;
    padding: 14px 20px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 12px;
    color: var(--text-primary);
    font-size: 15px;
    margin-bottom: 20px;
    transition: all 0.3s ease;
}

.search-box:focus {
    outline: none;
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.filter-group {
    display: flex;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
}

.filter-btn {
    padding: 8px 16px;
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 8px;
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 14px;
}

.filter-btn:hover,
.filter-btn.active {
    background: var(--accent);
    color: white;
    border-color: var(--accent);
}

.cluster {
    background: var(--bg-secondary);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px;
    margin-bottom: 16px;
    transition: all 0.3s ease;
}

.cluster:hover {
    border-color: var(--accent);
}

.cluster-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    cursor: pointer;
}

.cluster-title {
    font-size: 16px;
    font-weight: 600;
}

.cluster-content {
    display: none;
    padding-top: 16px;
    border-top: 1px solid var(--border);
}

.cluster.expanded .cluster-content {
    display: block;
}

.file-list {
    list-style: none;
    margin: 12px 0;
}

.file-item {
    padding: 12px;
    background: var(--glass);
    border-radius: 8px;
    margin-bottom: 8px;
    font-family: 'Courier New', monospace;
    font-size: 13px;
}

.recommendation {
    background: rgba(16, 185, 129, 0.1);
    border-left: 3px solid var(--success);
    padding: 16px;
    border-radius: 8px;
    margin-top: 16px;
}

.recommendation-title {
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--success);
}

.reasoning-list {
    list-style: none;
    margin-top: 12px;
}

.reasoning-list li {
    padding: 6px 0;
    padding-left: 20px;
    position: relative;
}

.reasoning-list li:before {
    content: "→";
    position: absolute;
    left: 0;
    color: var(--accent);
}

.chart-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
}

.chart {
    background: var(--bg-card);
    backdrop-filter: blur(10px);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px;
    min-height: 300px;
}

.chart-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
}

table {
    width: 100%;
    border-collapse: collapse;
}

th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid var(--border);
}

th {
    color: var(--text-secondary);
    font-weight: 600;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

tr:hover {
    background: var(--glass);
}

.progress-bar {
    width: 100%;
    height: 8px;
    background: var(--bg-secondary);
    border-radius: 4px;
    overflow: hidden;
    margin: 8px 0;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--accent), #8b5cf6);
    border-radius: 4px;
    transition: width 0.6s ease;
}

@keyframes fadeIn {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
}

.section {
    animation: fadeIn 0.6s ease;
}

.confidence-high { color: var(--success); }
.confidence-medium { color: var(--warning); }
.confidence-low { color: var(--danger); }
"""
    
    def _build_header(self) -> str:
        """Build header section"""
        return f"""
<div class="header">
    <h1>🔬 Code Intelligence Dashboard</h1>
    <div class="meta">
        <strong>Project:</strong> {self.report.project_path} | 
        <strong>Generated:</strong> {self.report.timestamp} |
        <strong>Analysis Engine:</strong> Enterprise Static Analyzer v2.0
    </div>
</div>
"""
    
    def _build_summary(self) -> str:
        """Build executive summary"""
        potential_savings = sum(
            self.report.files[f].size 
            for cluster in self.report.duplicates 
            for f in cluster.files[1:]
        )
        
        return f"""
<div class="summary-grid">
    <div class="stat-card">
        <div class="label">Total Files</div>
        <div class="value">{self.report.total_files:,}</div>
        <div class="subtext">Across all categories</div>
    </div>
    <div class="stat-card">
        <div class="label">Total Lines</div>
        <div class="value">{self.report.total_lines:,}</div>
        <div class="subtext">{self.report.total_size / 1024 / 1024:.1f} MB</div>
    </div>
    <div class="stat-card">
        <div class="label">Duplicate Clusters</div>
        <div class="value">{len(self.report.duplicates)}</div>
        <div class="subtext">{potential_savings / 1024:.0f} KB potential savings</div>
    </div>
    <div class="stat-card">
        <div class="label">Naming Conflicts</div>
        <div class="value">{len(self.report.same_name_conflicts)}</div>
        <div class="subtext">Same name, different paths</div>
    </div>
    <div class="stat-card">
        <div class="label">Unused Files</div>
        <div class="value">{len(self.report.unused_files)}</div>
        <div class="subtext">No references found</div>
    </div>
    <div class="stat-card">
        <div class="label">Unwired Features</div>
        <div class="value">{len(self.report.unwired_features)}</div>
        <div class="subtext">Not integrated into app</div>
    </div>
</div>
"""
    
    def _build_charts(self) -> str:
        """Build charts section"""
        # Prepare data
        categories = json.dumps(list(self.report.category_distribution.keys()))
        category_counts = json.dumps(list(self.report.category_distribution.values()))
        
        return f"""
<div class="chart-container">
    <div class="chart">
        <div class="chart-title">File Type Distribution</div>
        <canvas id="categoryChart"></canvas>
    </div>
    <div class="chart">
        <div class="chart-title">Risk Distribution</div>
        <canvas id="riskChart"></canvas>
    </div>
</div>
<script>
window.chartData = {{
    categories: {categories},
    categoryCounts: {category_counts}
}};
</script>
"""
    
    def _build_search(self) -> str:
        """Build search and filter section"""
        return """
<div class="section">
    <div class="section-header">
        <h2 class="section-title">🔍 File Explorer</h2>
    </div>
    <input type="text" id="searchBox" class="search-box" placeholder="Search files by name or path...">
    <div class="filter-group">
        <button class="filter-btn active" data-filter="all">All Files</button>
        <button class="filter-btn" data-filter="unused">Unused</button>
        <button class="filter-btn" data-filter="duplicate">Duplicates</button>
        <button class="filter-btn" data-filter="high-risk">High Risk</button>
        <button class="filter-btn" data-filter="large">Large Files</button>
    </div>
    <div id="fileList"></div>
</div>
"""
    
    def _build_duplicates(self) -> str:
        """Build duplicates section"""
        html = """
<div class="section">
    <div class="section-header">
        <h2 class="section-title">📋 Duplicate Clusters</h2>
        <span class="badge info">""" + str(len(self.report.duplicates)) + """ clusters</span>
    </div>
"""
        
        for cluster in self.report.duplicates:
            confidence_class = (
                'confidence-high' if cluster.confidence > 0.8 
                else 'confidence-medium' if cluster.confidence > 0.6 
                else 'confidence-low'
            )
            
            html += f"""
    <div class="cluster" data-cluster-id="{cluster.cluster_id}">
        <div class="cluster-header" onclick="toggleCluster({cluster.cluster_id})">
            <div>
                <span class="cluster-title">Cluster #{cluster.cluster_id}</span>
                <span class="badge {cluster.type}">{cluster.type}</span>
                <span class="badge {confidence_class}">{cluster.similarity:.0%} similar</span>
            </div>
            <span>▼</span>
        </div>
        <div class="cluster-content">
            <ul class="file-list">
"""
            for file in cluster.files:
                rel_path = Path(file).relative_to(Path(self.report.project_path))
                html += f'                <li class="file-item">{rel_path}</li>\n'
            
            html += """            </ul>
            <div class="recommendation">
                <div class="recommendation-title">💡 Recommended Action: """ + cluster.recommended_action + f""" (Confidence: {cluster.confidence:.0%})</div>
                <ul class="reasoning-list">
"""
            for reason in cluster.reasoning:
                html += f'                    <li>{reason}</li>\n'
            
            if cluster.merge_strategy:
                html += f"""
                </ul>
                <div style="margin-top: 16px;">
                    <strong>Merge Strategy:</strong>
                    <ul class="reasoning-list">
                        <li>Base: {cluster.merge_strategy['base_file']}</li>
                        <li>Impact: {cluster.merge_strategy['impact_estimate']}</li>
"""
                for item in cluster.merge_strategy['preserve']:
                    html += f'                        <li>Preserve: {item}</li>\n'
                
                html += """                    </ul>
                </div>
"""
            
            html += """            </div>
        </div>
    </div>
"""
        
        html += "</div>"
        return html
    
    def _build_conflicts(self) -> str:
        """Build same-name conflicts section"""
        html = """
<div class="section">
    <div class="section-header">
        <h2 class="section-title">⚠️ Same-Name Conflicts</h2>
        <span class="badge warning">""" + str(len(self.report.same_name_conflicts)) + """ conflicts</span>
    </div>
    <table>
        <thead>
            <tr>
                <th>File Name</th>
                <th>Locations</th>
                <th>Recommended</th>
                <th>Risk</th>
                <th>Confidence</th>
            </tr>
        </thead>
        <tbody>
"""
        
        for conflict in self.report.same_name_conflicts:
            risk_badge = f'badge {conflict.risk_level.lower()}'
            confidence_class = (
                'confidence-high' if conflict.confidence > 0.8 
                else 'confidence-medium' if conflict.confidence > 0.6 
                else 'confidence-low'
            )
            
            html += f"""
            <tr>
                <td><strong>{conflict.name}</strong></td>
                <td>{len(conflict.locations)} locations</td>
                <td style="font-family: monospace; font-size: 12px;">
                    {Path(conflict.recommended_keep).relative_to(Path(self.report.project_path))}
                </td>
                <td><span class="{risk_badge}">{conflict.risk_level}</span></td>
                <td class="{confidence_class}">{conflict.confidence:.0%}</td>
            </tr>
"""
        
        html += """
        </tbody>
    </table>
</div>
"""
        return html
    
    def _build_unused(self) -> str:
        """Build unused files section"""
        html = """
<div class="section">
    <div class="section-header">
        <h2 class="section-title">🗑️ Unused Files</h2>
        <span class="badge danger">""" + str(len(self.report.unused_files)) + """ files</span>
    </div>
    <p style="color: var(--text-secondary); margin-bottom: 20px;">
        Files with exports but no references. Review carefully before removal.
    </p>
    <ul class="file-list">
"""
        
        for file in self.report.unused_files[:50]:  # Limit display
            rel_path = Path(file).relative_to(Path(self.report.project_path))
            meta = self.report.files[file]
            html += f"""
        <li class="file-item">
            {rel_path}
            <span style="color: var(--text-secondary); margin-left: 12px;">
                {meta.lines} lines | {len(meta.exports)} exports
            </span>
        </li>
"""
        
        if len(self.report.unused_files) > 50:
            html += f"""
        <li class="file-item" style="text-align: center; color: var(--text-secondary);">
            ... and {len(self.report.unused_files) - 50} more
        </li>
"""
        
        html += """
    </ul>
</div>
"""
        return html
    
    def _build_unwired(self) -> str:
        """Build unwired features section"""
        html = """
<div class="section">
    <div class="section-header">
        <h2 class="section-title">🔌 Unwired Features</h2>
        <span class="badge warning">""" + str(len(self.report.unwired_features)) + """ features</span>
    </div>
    <p style="color: var(--text-secondary); margin-bottom: 20px;">
        Substantial features with meaningful logic that are not integrated into the application.
    </p>
    <ul class="file-list">
"""
        
        for file in self.report.unwired_features:
            rel_path = Path(file).relative_to(Path(self.report.project_path))
            meta = self.report.files[file]
            html += f"""
        <li class="file-item">
            {rel_path}
            <span style="color: var(--text-secondary); margin-left: 12px;">
                {meta.lines} lines | {len(meta.exports)} exports | {meta.category}
            </span>
        </li>
"""
        
        html += """
    </ul>
</div>
"""
        return html
    
    def _get_scripts(self) -> str:
        """Generate JavaScript for interactivity"""
        files_json = json.dumps([
            {
                'path': meta.relative_path,
                'name': meta.name,
                'category': meta.category,
                'size': meta.size,
                'lines': meta.lines,
                'references': meta.references,
                'risk': meta.risk_score,
                'stability': meta.stability_score
            }
            for meta in self.report.files.values()
        ])
        
        return f"""
// File data
const files = {files_json};

// Toggle cluster expansion
function toggleCluster(id) {{
    const cluster = document.querySelector(`[data-cluster-id="${{id}}"]`);
    cluster.classList.toggle('expanded');
}}

// Search functionality
const searchBox = document.getElementById('searchBox');
if (searchBox) {{
    searchBox.addEventListener('input', (e) => {{
        const term = e.target.value.toLowerCase();
        // Simple search implementation
        console.log('Searching for:', term);
    }});
}}

// Filter buttons
document.querySelectorAll('.filter-btn').forEach(btn => {{
    btn.addEventListener('click', (e) => {{
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        const filter = e.target.dataset.filter;
        console.log('Filter:', filter);
    }});
}});

// Simple chart rendering (using canvas)
function renderCategoryChart() {{
    const canvas = document.getElementById('categoryChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const data = window.chartData;
    
    // Simple bar chart
    const maxValue = Math.max(...data.categoryCounts);
    const barWidth = canvas.width / data.categories.length;
    const barSpacing = 10;
    
    data.categories.forEach((cat, i) => {{
        const barHeight = (data.categoryCounts[i] / maxValue) * (canvas.height - 40);
        const x = i * barWidth + barSpacing;
        const y = canvas.height - barHeight - 20;
        
        ctx.fillStyle = '#6366f1';
        ctx.fillRect(x, y, barWidth - barSpacing * 2, barHeight);
        
        ctx.fillStyle = '#e2e8f0';
        ctx.font = '10px sans-serif';
        ctx.fillText(data.categoryCounts[i], x + 5, y - 5);
    }});
}}

// Initialize charts
setTimeout(() => {{
    renderCategoryChart();
}}, 100);

console.log('✓ Dashboard initialized');
console.log(`📊 Loaded ${{files.length}} files`);
"""

# ============================================================================
# MAIN ORCHESTRATOR
# ============================================================================

class CodeIntelligencePlatform:
    """Main orchestrator for analysis"""
    
    def __init__(self, project_path: str):
        self.project_path = Path(project_path).resolve()
        self.scanner = ProjectScanner(str(self.project_path))
        self.files: Dict[str, FileMetadata] = {}
        
    def analyze(self) -> AnalysisReport:
        """Perform complete analysis"""
        print("\n" + "="*70)
        print("🚀 ENTERPRISE CODE INTELLIGENCE PLATFORM")
        print("="*70 + "\n")
        
        # Phase 1: Scan
        self.files = self.scanner.scan()
        
        # Phase 2: Duplicates
        duplicate_detector = DuplicateDetector(self.files)
        duplicates = duplicate_detector.analyze()
        
        # Phase 3: Conflicts
        conflict_analyzer = SameNameAnalyzer(self.files)
        conflicts = conflict_analyzer.analyze()
        
        # Phase 4: Usage
        usage_analyzer = UsageAnalyzer(self.files)
        usage_analyzer.analyze()
        
        # Phase 5: Stability
        stability_calc = StabilityCalculator(self.files)
        stability_calc.calculate()
        
        # Build report
        report = AnalysisReport(
            timestamp=datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            project_path=str(self.project_path),
            total_files=len(self.files),
            total_lines=sum(f.lines for f in self.files.values()),
            total_size=sum(f.size for f in self.files.values()),
            files=self.files,
            duplicates=duplicates,
            same_name_conflicts=conflicts,
            unused_files=usage_analyzer.unused,
            unwired_features=usage_analyzer.unwired,
            category_distribution=Counter(f.category for f in self.files.values()),
            risk_distribution=Counter(
                'High' if f.risk_score > 70 else 'Medium' if f.risk_score > 40 else 'Low'
                for f in self.files.values()
            )
        )
        
        print("\n" + "="*70)
        print("✓ ANALYSIS COMPLETE")
        print("="*70 + "\n")
        
        return report
    
    def generate_report(self, report: AnalysisReport, output_path: str):
        """Generate HTML dashboard"""
        generator = ReportGenerator(report)
        generator.generate(output_path)

# ============================================================================
# ENTRY POINT
# ============================================================================

def main():
    """Main entry point"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python analyzer.py <project_path>")
        sys.exit(1)
    
    project_path = sys.argv[1]
    
    if not Path(project_path).exists():
        print(f"❌ Error: Path does not exist: {project_path}")
        sys.exit(1)
    
    # Run analysis
    platform = CodeIntelligencePlatform(project_path)
    report = platform.analyze()
    
    # Generate dashboard
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    output_path = f"PROJECT_STRUCTURAL_ANALYSIS_DASHBOARD_{timestamp}.html"
    platform.generate_report(report, output_path)
    
    print(f"\n🎉 Success! Dashboard generated: {output_path}")
    print(f"📊 Open in browser to explore analysis results\n")

if __name__ == '__main__':
    main()