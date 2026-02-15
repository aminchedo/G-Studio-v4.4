/**
 * Script to automatically update README.md with documentation links
 * 
 * This script scans the docs/ directory and updates README.md
 * with current documentation structure.
 * 
 * Usage: node scripts/update-readme-docs.js
 */

const fs = require('fs');
const path = require('path');

const DOCS_DIR = path.join(__dirname, '..', 'docs');
const README_PATH = path.join(__dirname, '..', 'README.md');

function getMarkdownFiles(dir) {
  const files = [];
  if (!fs.existsSync(dir)) return files;
  
  const items = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      files.push(...getMarkdownFiles(fullPath));
    } else if (item.isFile() && item.name.endsWith('.md')) {
      const relativePath = path.relative(path.join(__dirname, '..'), fullPath);
      files.push({
        name: item.name,
        path: relativePath.replace(/\\/g, '/'),
        dir: path.relative(DOCS_DIR, path.dirname(fullPath))
      });
    }
  }
  
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
    'archive': [],
    'other': []
  };
  
  for (const file of files) {
    if (file.dir.includes('01-getting-started')) {
      categories['getting-started'].push(file);
    } else if (file.dir.includes('02-architecture')) {
      categories['architecture'].push(file);
    } else if (file.dir.includes('03-features')) {
      categories['features'].push(file);
    } else if (file.dir.includes('04-integration')) {
      categories['integration'].push(file);
    } else if (file.dir.includes('05-development')) {
      categories['development'].push(file);
    } else if (file.dir.includes('06-audit-reports')) {
      categories['audit-reports'].push(file);
    } else if (file.dir.includes('07-archive')) {
      categories['archive'].push(file);
    } else {
      categories['other'].push(file);
    }
  }
  
  return categories;
}

function generateDocsSection(categories) {
  let section = `## 📚 Documentation\n\n`;
  section += `**📖 [مستندات کامل در پوشه \`docs/\`](./docs/INDEX.md)**\n\n`;
  section += `### دسترسی سریع:\n\n`;
  section += `#### برای کاربران:\n`;
  section += `- **[📚 فهرست مستندات](./docs/INDEX.md)** - فهرست کامل و دسته‌بندی شده\n`;
  
  if (categories['getting-started'].length > 0) {
    const installFile = categories['getting-started'].find(f => f.name.includes('INSTALLATION'));
    if (installFile) {
      section += `- **[📦 راهنمای نصب](./${installFile.path})** - نصب و راه‌اندازی\n`;
    }
  }
  
  if (categories['features'].length > 0) {
    section += `- **[✨ راهنمای ویژگی‌ها](./docs/03-features/)** - مستندات تمام ویژگی‌ها\n`;
  }
  
  section += `\n#### برای توسعه‌دهندگان:\n`;
  
  if (categories['architecture'].length > 0) {
    const archFile = categories['architecture'].find(f => f.name.includes('ARCHITECTURE'));
    if (archFile) {
      section += `- **[🏗️ معماری سیستم](./${archFile.path})** - معماری کامل\n`;
    }
  }
  
  if (categories['development'].length > 0) {
    const changelogFile = categories['development'].find(f => f.name.includes('CHANGELOG'));
    if (changelogFile) {
      section += `- **[📝 تاریخچه تغییرات](./${changelogFile.path})** - Changelog\n`;
    }
    
    const improvementsFile = categories['development'].find(f => f.name.includes('IMPROVEMENTS_IMPLEMENTED'));
    if (improvementsFile) {
      section += `- **[✅ بهبودهای پیاده‌سازی شده](./${improvementsFile.path})** - لیست بهبودها\n`;
    }
  }
  
  if (categories['audit-reports'].length > 0) {
    const auditFile = categories['audit-reports'].find(f => f.name.includes('PROFESSIONAL_AUDIT'));
    if (auditFile) {
      section += `- **[🔍 گزارش حسابرسی](./${auditFile.path})** - Audit Report\n`;
    }
  }
  
  section += `\n### ساختار مستندات:\n`;
  section += `\`\`\`\n`;
  section += `docs/\n`;
  section += `├── INDEX.md                    # فهرست اصلی\n`;
  section += `├── 01-getting-started/         # راهنمای شروع\n`;
  section += `├── 02-architecture/            # معماری\n`;
  section += `├── 03-features/                # ویژگی‌ها\n`;
  section += `├── 04-integration/             # یکپارچه‌سازی\n`;
  section += `├── 05-development/             # توسعه\n`;
  section += `├── 06-audit-reports/           # گزارش‌های حسابرسی\n`;
  section += `└── 07-archive/                 # آرشیو\n`;
  section += `\`\`\`\n\n`;
  section += `**👉 [شروع از INDEX.md](./docs/INDEX.md)**\n`;
  
  return section;
}

function updateREADME() {
  try {
    // Read current README
    let readmeContent = fs.readFileSync(README_PATH, 'utf8');
    
    // Get all markdown files
    const files = getMarkdownFiles(DOCS_DIR);
    const categories = categorizeFiles(files);
    
    // Generate new docs section
    const newDocsSection = generateDocsSection(categories);
    
    // Find and replace documentation section
    const docsSectionRegex = /## 📚 Documentation[\s\S]*?(?=## |$)/;
    
    if (docsSectionRegex.test(readmeContent)) {
      readmeContent = readmeContent.replace(docsSectionRegex, newDocsSection);
    } else {
      // If section doesn't exist, add it before "## 🎯 Production Readiness"
      const productionRegex = /## 🎯 Production Readiness/;
      if (productionRegex.test(readmeContent)) {
        readmeContent = readmeContent.replace(productionRegex, newDocsSection + '\n---\n\n## 🎯 Production Readiness');
      } else {
        // Add at the end
        readmeContent += '\n\n' + newDocsSection;
      }
    }
    
    // Add update timestamp
    const timestamp = new Date().toISOString().split('T')[0];
    readmeContent = readmeContent.replace(
      /(\*\*Last Updated:\*\*.*?)/,
      `**Last Updated:** ${timestamp} (Auto-updated)`
    );
    
    // Write updated README
    fs.writeFileSync(README_PATH, readmeContent, 'utf8');
    
    console.log('✅ README.md updated successfully!');
    console.log(`📊 Found ${files.length} documentation files`);
    console.log(`📁 Categories: ${Object.keys(categories).filter(k => categories[k].length > 0).join(', ')}`);
  } catch (error) {
    console.error('❌ Error updating README:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  updateREADME();
}

module.exports = { updateREADME, getMarkdownFiles, categorizeFiles };
