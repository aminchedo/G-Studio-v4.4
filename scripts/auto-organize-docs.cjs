/**
 * Automatic Documentation Organizer
 * 
 * This script automatically:
 * 1. Finds all .md files in project root (except README.md)
 * 2. Moves them to appropriate docs/ subdirectories
 * 3. Updates README.md with latest documentation structure
 * 
 * Usage: node scripts/auto-organize-docs.cjs
 * Or: npm run organize-docs
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const DOCS_DIR = path.join(PROJECT_ROOT, 'docs');
const README_PATH = path.join(PROJECT_ROOT, 'README.md');

// Special documents that go to special-documents/
const SPECIAL_DOCS = [
  'STRUCTURE',
  'QUICK_REFERENCE',
  'DOCUMENTATION_GUIDE',
  'USER_GUIDE',
  'DEVELOPER_GUIDE',
  'ARCHITECTURE',
  'INSTALLATION',
  'CHANGELOG',
  'IMPROVEMENTS'
];

// Category mapping based on filename patterns
const CATEGORY_MAP = {
  'getting-started': ['INSTALLATION', 'QUICK_START', 'SETUP', 'GETTING_STARTED'],
  'architecture': ['ARCHITECTURE', 'STRUCTURE', 'DESIGN'],
  'features': ['FEATURE', 'GUIDE', 'HOW_TO', 'USAGE'],
  'integration': ['INTEGRATION', 'API', 'CONNECTION'],
  'development': ['CHANGELOG', 'IMPROVEMENTS', 'DEVELOPMENT', 'TESTING'],
  'audit-reports': ['AUDIT', 'REPORT', 'REVIEW', 'ANALYSIS'],
  'special-documents': SPECIAL_DOCS
};

function getCategoryForFile(filename) {
  const upperName = filename.toUpperCase().replace('.MD', '');
  
  // Check if it's a special document
  if (SPECIAL_DOCS.some(doc => upperName.includes(doc))) {
    return 'special-documents';
  }
  
  // Check category mappings
  for (const [category, patterns] of Object.entries(CATEGORY_MAP)) {
    if (patterns.some(pattern => upperName.includes(pattern))) {
      return category;
    }
  }
  
  // Default to archive
  return 'archive';
}

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function findMarkdownFiles(rootDir, exclude = []) {
  const files = [];
  const items = fs.readdirSync(rootDir, { withFileTypes: true });
  
  for (const item of items) {
    // Skip node_modules, .git, dist, etc.
    if (item.name.startsWith('.') || 
        item.name === 'node_modules' || 
        item.name === 'dist' ||
        item.name === 'docs' ||
        item.name === 'scripts') {
      continue;
    }
    
    const fullPath = path.join(rootDir, item.name);
    
    if (item.isFile() && item.name.endsWith('.md')) {
      if (!exclude.includes(item.name)) {
        files.push(fullPath);
      }
    } else if (item.isDirectory() && item.name !== 'Documents') {
      // Recursively search subdirectories (but skip docs and Documents)
      files.push(...findMarkdownFiles(fullPath, exclude));
    }
  }
  
  return files;
}

function organizeDocumentation() {
  console.log('📚 Starting automatic documentation organization...\n');
  
  // Ensure docs directories exist
  const categories = [
    '01-getting-started',
    '02-architecture',
    '03-features',
    '04-integration',
    '05-development',
    '06-audit-reports',
    '07-archive',
    'special-documents'
  ];
  
  categories.forEach(cat => {
    ensureDirectory(path.join(DOCS_DIR, cat));
  });
  
  // Find all .md files in project root (excluding README.md and docs/)
  const rootFiles = findMarkdownFiles(PROJECT_ROOT, ['README.md']);
  
  if (rootFiles.length === 0) {
    console.log('✅ No markdown files found in project root to organize.\n');
    return;
  }
  
  console.log(`📄 Found ${rootFiles.length} markdown file(s) to organize:\n`);
  
  const movedFiles = [];
  
  for (const filePath of rootFiles) {
    const fileName = path.basename(filePath);
    const category = getCategoryForFile(fileName);
    const targetDir = path.join(DOCS_DIR, category);
    const targetPath = path.join(targetDir, fileName);
    
    // Skip if already in docs
    if (filePath.includes('docs')) {
      continue;
    }
    
    try {
      // Ensure target directory exists
      ensureDirectory(targetDir);
      
      // Move file
      fs.renameSync(filePath, targetPath);
      movedFiles.push({ file: fileName, category });
      console.log(`  ✅ Moved: ${fileName} → docs/${category}/`);
    } catch (error) {
      console.error(`  ❌ Error moving ${fileName}:`, error.message);
    }
  }
  
  if (movedFiles.length > 0) {
    console.log(`\n✅ Successfully organized ${movedFiles.length} file(s).\n`);
    
    // Update README.md and INDEX.md
    updateREADME();
    updateINDEX();
    
    // Track changes in special-documents
    try {
      const { trackChanges } = require('./track-special-docs-changes.cjs');
      trackChanges();
    } catch (error) {
      console.log('⚠️  Could not track special-documents changes:', error.message);
    }
  } else {
    console.log('\n✅ All files already organized.\n');
    // Still update INDEX.md to ensure it's current
    updateINDEX();
    
    // Track changes in special-documents
    try {
      const { trackChanges } = require('./track-special-docs-changes.cjs');
      trackChanges();
    } catch (error) {
      // Silent fail if tracking not available
    }
  }
}

function updateINDEX() {
  console.log('📝 Updating docs/INDEX.md...\n');
  
  try {
    const INDEX_PATH = path.join(DOCS_DIR, 'INDEX.md');
    
    // Get all documentation files
    const docFiles = getAllDocumentationFiles();
    const categories = categorizeFiles(docFiles);
    
    // Generate INDEX content
    const indexContent = generateINDEXContent(categories);
    
    // Write updated INDEX
    fs.writeFileSync(INDEX_PATH, indexContent, 'utf8');
    
    console.log('✅ docs/INDEX.md updated successfully!\n');
  } catch (error) {
    console.error('❌ Error updating INDEX:', error.message);
  }
}

function generateINDEXContent(categories) {
  let content = `# 📚 G Studio - Documentation Index\n\n`;
  content += `**Version:** 2.0.0  \n`;
  content += `**Last Updated:** ${new Date().toISOString().split('T')[0]} (Auto-updated)  \n`;
  content += `**Status:** Complete Documentation Library\n\n`;
  content += `---\n\n`;
  content += `## 📋 Table of Contents\n\n`;
  content += `This index provides a complete categorized list of all G Studio documentation.\n\n`;
  content += `**👉 For quick start:**\n`;
  content += `- **[Main README](../README.md)** - Main project guide\n`;
  
  // Add special documents links if they exist
  if (categories['special-documents'].length > 0) {
    const quickRef = categories['special-documents'].find(f => f.name.toUpperCase().includes('QUICK_REFERENCE'));
    const structure = categories['special-documents'].find(f => f.name.toUpperCase().includes('STRUCTURE'));
    
    if (quickRef) {
      content += `- **[Quick Reference](./special-documents/${quickRef.name})** - Quick access guide\n`;
    }
    if (structure) {
      content += `- **[Project Structure](./special-documents/${structure.name})** - Complete file structure\n`;
    }
  }
  
  content += `\n---\n\n`;
  
  // 01. Getting Started
  if (categories['getting-started'].length > 0) {
    content += `## 🚀 01. Getting Started\n\n`;
    content += `Documentation for quick start and installation:\n\n`;
    categories['getting-started'].forEach(file => {
      const displayName = file.name.replace('.md', '').replace(/_/g, ' ');
      content += `- **[${displayName}](./01-getting-started/${file.name})** 📦\n`;
    });
    content += `\n---\n\n`;
  }
  
  // 02. Architecture
  if (categories['architecture'].length > 0 || categories['special-documents'].some(f => 
    f.name.toUpperCase().includes('ARCHITECTURE') || f.name.toUpperCase().includes('STRUCTURE')
  )) {
    content += `## 🏗️ 02. Architecture\n\n`;
    content += `System architecture and structure documentation:\n\n`;
    
    // Architecture files
    categories['architecture'].forEach(file => {
      const displayName = file.name.replace('.md', '').replace(/_/g, ' ');
      content += `- **[${displayName}](./02-architecture/${file.name})** 🏛️\n`;
    });
    
    // Special documents with architecture/structure
    const structFiles = categories['special-documents'].filter(f => 
      f.name.toUpperCase().includes('ARCHITECTURE') || f.name.toUpperCase().includes('STRUCTURE')
    );
    structFiles.forEach(file => {
      const displayName = file.name.replace('.md', '').replace(/_/g, ' ');
      content += `- **[${displayName}](./special-documents/${file.name})** 🏗️\n`;
    });
    
    content += `\n---\n\n`;
  }
  
  // 03. Features
  if (categories['features'].length > 0) {
    content += `## ✨ 03. Features\n\n`;
    content += `Feature documentation and guides:\n\n`;
    categories['features'].forEach(file => {
      const displayName = file.name.replace('.md', '').replace(/_/g, ' ');
      content += `- **[${displayName}](./03-features/${file.name})** ✨\n`;
    });
    content += `\n---\n\n`;
  }
  
  // 04. Integration
  if (categories['integration'].length > 0) {
    content += `## 🔗 04. Integration\n\n`;
    content += `Integration and API documentation:\n\n`;
    categories['integration'].forEach(file => {
      const displayName = file.name.replace('.md', '').replace(/_/g, ' ');
      content += `- **[${displayName}](./04-integration/${file.name})** 🔗\n`;
    });
    content += `\n---\n\n`;
  }
  
  // 05. Development
  if (categories['development'].length > 0) {
    content += `## 💻 05. Development\n\n`;
    content += `Development documentation:\n\n`;
    categories['development'].forEach(file => {
      const displayName = file.name.replace('.md', '').replace(/_/g, ' ');
      content += `- **[${displayName}](./05-development/${file.name})** 💻\n`;
    });
    content += `\n---\n\n`;
  }
  
  // 06. Audit Reports
  if (categories['audit-reports'].length > 0) {
    content += `## 📊 06. Audit Reports\n\n`;
    content += `Audit and review reports:\n\n`;
    // Remove duplicates
    const uniqueFiles = [];
    const seen = new Set();
    categories['audit-reports'].forEach(file => {
      if (!seen.has(file.name)) {
        seen.add(file.name);
        uniqueFiles.push(file);
      }
    });
    uniqueFiles.forEach(file => {
      const displayName = file.name.replace('.md', '').replace(/_/g, ' ');
      content += `- **[${displayName}](./06-audit-reports/${file.name})** 📊\n`;
    });
    content += `\n---\n\n`;
  }
  
  // Special Documents
  if (categories['special-documents'].length > 0) {
    content += `## 📄 Special Documents\n\n`;
    content += `Special documentation files:\n\n`;
    categories['special-documents'].forEach(file => {
      const displayName = file.name.replace('.md', '').replace(/_/g, ' ');
      content += `- **[${displayName}](./special-documents/${file.name})** 📄\n`;
    });
    content += `\n---\n\n`;
  }
  
  // 07. Archive
  if (categories['archive'].length > 0) {
    content += `## 📦 07. Archive\n\n`;
    content += `Archived and legacy documentation:\n\n`;
    content += `*${categories['archive'].length} archived file(s)*\n\n`;
    content += `---\n\n`;
  }
  
  // Documentation Structure
  content += `## 📁 Documentation Structure\n\n`;
  content += `\`\`\`\n`;
  content += `docs/\n`;
  content += `├── INDEX.md                    # This file (main index)\n`;
  content += `├── README.md                   # Documentation guide\n`;
  if (categories['getting-started'].length > 0) {
    content += `├── 01-getting-started/         # Getting started guides (${categories['getting-started'].length} file(s))\n`;
  }
  if (categories['architecture'].length > 0) {
    content += `├── 02-architecture/            # Architecture docs (${categories['architecture'].length} file(s))\n`;
  }
  if (categories['features'].length > 0) {
    content += `├── 03-features/                # Feature guides (${categories['features'].length} file(s))\n`;
  }
  if (categories['integration'].length > 0) {
    content += `├── 04-integration/             # Integration docs (${categories['integration'].length} file(s))\n`;
  }
  if (categories['development'].length > 0) {
    content += `├── 05-development/             # Development docs (${categories['development'].length} file(s))\n`;
  }
  if (categories['audit-reports'].length > 0) {
    content += `├── 06-audit-reports/           # Audit reports (${categories['audit-reports'].length} file(s))\n`;
  }
  if (categories['archive'].length > 0) {
    content += `├── 07-archive/                 # Archived docs (${categories['archive'].length} file(s))\n`;
  }
  if (categories['special-documents'].length > 0) {
    content += `└── special-documents/          # Special documents (${categories['special-documents'].length} file(s))\n`;
  }
  content += `\`\`\`\n\n`;
  
  // Auto-update info
  content += `## 🔄 Auto-Indexing\n\n`;
  content += `This index is automatically updated when documentation files are organized.\n\n`;
  content += `**How it works:**\n`;
  content += `1. Run \`npm run organize-docs\` to organize existing files\n`;
  content += `2. Or run \`npm run watch-docs\` to watch for new files\n`;
  content += `3. INDEX.md is automatically updated with the latest structure\n\n`;
  
  content += `---\n\n`;
  content += `**Last Updated:** ${new Date().toISOString().split('T')[0]} (Auto-updated)  \n`;
  content += `**Maintainer:** Automatic Documentation System  \n`;
  content += `**Status:** ✅ Auto-maintained\n\n`;
  content += `**👉 [Back to Main README](../README.md)**\n`;
  
  return content;
}

function updateREADME() {
  console.log('📝 Updating README.md...\n');
  
  try {
    // Get all documentation files
    const docFiles = getAllDocumentationFiles();
    const categories = categorizeFiles(docFiles);
    
    // Generate documentation section
    const docsSection = generateDocumentationSection(categories);
    
    // Read current README
    let readmeContent = fs.readFileSync(README_PATH, 'utf8');
    
    // Find and replace documentation section
    const docsSectionRegex = /## 📚 Documentation[\s\S]*?(?=## |$)/;
    
    if (docsSectionRegex.test(readmeContent)) {
      readmeContent = readmeContent.replace(docsSectionRegex, docsSection);
    } else {
      // Add before "## 🎯 Production Readiness"
      const productionRegex = /## 🎯 Production Readiness/;
      if (productionRegex.test(readmeContent)) {
        readmeContent = readmeContent.replace(productionRegex, docsSection + '\n---\n\n## 🎯 Production Readiness');
      } else {
        readmeContent += '\n\n' + docsSection;
      }
    }
    
    // Update timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    readmeContent = readmeContent.replace(
      /(\*\*Last Updated:\*\*.*?)/,
      `**Last Updated:** ${timestamp} (Auto-updated)`
    );
    
    // Write updated README
    fs.writeFileSync(README_PATH, readmeContent, 'utf8');
    
    console.log('✅ README.md updated successfully!\n');
  } catch (error) {
    console.error('❌ Error updating README:', error.message);
  }
}

function getAllDocumentationFiles() {
  const files = [];
  
  if (!fs.existsSync(DOCS_DIR)) return files;
  
  function scanDir(dir, relativePath = '') {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      const relative = path.join(relativePath, item.name).replace(/\\/g, '/');
      
      if (item.isDirectory()) {
        scanDir(fullPath, relative);
      } else if (item.isFile() && item.name.endsWith('.md')) {
        files.push({
          name: item.name,
          path: `docs/${relative}`,
          dir: relativePath,
          category: relativePath.split('/')[0] || 'root'
        });
      }
    }
  }
  
  scanDir(DOCS_DIR);
  return files;
}

function categorizeFiles(files) {
  const categories = {
    'getting-started': [],
    'architecture': [],
    'features': [],
    'integration': [],
    'development': [],
    'audit-reports': [],
    'special-documents': [],
    'archive': []
  };
  
  for (const file of files) {
    const category = file.category.replace(/^\d+-/, '') || 'archive';
    if (categories[category]) {
      categories[category].push(file);
    } else {
      categories['archive'].push(file);
    }
  }
  
  return categories;
}

function generateDocumentationSection(categories) {
  let section = `## 📚 Documentation\n\n`;
  section += `**📖 [Complete Documentation Index](./docs/INDEX.md)**\n\n`;
  section += `### Quick Access:\n\n`;
  
  // Getting Started
  if (categories['getting-started'].length > 0) {
    const installFile = categories['getting-started'].find(f => 
      f.name.toUpperCase().includes('INSTALLATION')
    );
    if (installFile) {
      section += `- **[📦 Installation Guide](./${installFile.path})** - Setup and installation\n`;
    }
  }
  
  // Architecture
  if (categories['architecture'].length > 0 || categories['special-documents'].some(f => 
    f.name.toUpperCase().includes('ARCHITECTURE')
  )) {
    section += `- **[🏗️ Architecture](./docs/02-architecture/)** - System architecture\n`;
  }
  
  // Features
  if (categories['features'].length > 0) {
    section += `- **[✨ Features](./docs/03-features/)** - Feature documentation\n`;
  }
  
  // Development
  if (categories['development'].length > 0) {
    const changelogFile = categories['development'].find(f => 
      f.name.toUpperCase().includes('CHANGELOG')
    );
    if (changelogFile) {
      section += `- **[📝 Changelog](./${changelogFile.path})** - Version history\n`;
    }
  }
  
  // Special Documents
  if (categories['special-documents'].length > 0) {
    section += `\n### Special Documents:\n`;
    categories['special-documents'].forEach(file => {
      const displayName = file.name.replace('.md', '').replace(/_/g, ' ');
      section += `- **[${displayName}](./${file.path})**\n`;
    });
  }
  
  section += `\n### Documentation Structure:\n`;
  section += `\`\`\`\n`;
  section += `docs/\n`;
  section += `├── INDEX.md                    # Main index\n`;
  section += `├── 01-getting-started/         # Getting started guides\n`;
  section += `├── 02-architecture/            # Architecture docs\n`;
  section += `├── 03-features/                # Feature guides\n`;
  section += `├── 04-integration/             # Integration docs\n`;
  section += `├── 05-development/             # Development docs\n`;
  section += `├── 06-audit-reports/           # Audit reports\n`;
  section += `├── 07-archive/                 # Archived docs\n`;
  section += `└── special-documents/          # Special documents\n`;
  section += `\`\`\`\n\n`;
  section += `**👉 [View Complete Index](./docs/INDEX.md)**\n`;
  section += `\n**🔄 Auto-Organization:** The documentation system automatically organizes \`.md\` files from the project root into appropriate \`docs/\` subdirectories. Run \`npm run organize-docs\` to organize existing files, or \`npm run watch-docs\` to watch for new files.\n`;
  
  return section;
}

// Run if called directly
if (require.main === module) {
  organizeDocumentation();
}

module.exports = { organizeDocumentation, updateREADME, updateINDEX };
