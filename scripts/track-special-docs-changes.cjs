/**
 * Special Documents Change Tracker
 * 
 * Tracks changes in special-documents and maintains history
 * 
 * Usage: node scripts/track-special-docs-changes.cjs
 */

const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..');
const SPECIAL_DOCS_DIR = path.join(PROJECT_ROOT, 'docs', 'special-documents');
const HISTORY_DIR = path.join(SPECIAL_DOCS_DIR, '.history');

// Files that should track changes
const TRACKED_FILES = [
  'STRUCTURE.md',
  'QUICK_REFERENCE.md',
  'DOCUMENTATION_GUIDE.md',
  'IMPROVEMENTS_IMPLEMENTED.md',
  'IMPROVEMENTS_PENDING.md'
];

function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function getFileHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf8');
  // Simple hash based on content length and first/last lines
  return Buffer.from(content).toString('base64').substring(0, 50);
}

function getHistoryFilePath(originalFile) {
  const baseName = path.basename(originalFile, '.md');
  return path.join(HISTORY_DIR, `${baseName}_history.md`);
}

function appendChangeHistory(filePath, changeType, description) {
  const historyFile = getHistoryFilePath(filePath);
  const timestamp = new Date().toISOString();
  const date = timestamp.split('T')[0];
  const time = timestamp.split('T')[1].split('.')[0];
  
  let historyContent = '';
  if (fs.existsSync(historyFile)) {
    historyContent = fs.readFileSync(historyFile, 'utf8');
  } else {
    historyContent = `# Change History - ${path.basename(filePath)}\n\n`;
    historyContent += `This file tracks all changes made to ${path.basename(filePath)}.\n\n`;
    historyContent += `---\n\n`;
  }
  
  let changeEntry = `## ${date} ${time}\n\n`;
  changeEntry += `**Change Type:** ${changeType}\n`;
  changeEntry += `**Description:** ${description}\n`;
  changeEntry += `**Timestamp:** ${timestamp}\n\n`;
  changeEntry += `---\n\n`;
  
  // Prepend new change (most recent first)
  historyContent = changeEntry + historyContent;
  
  fs.writeFileSync(historyFile, historyContent, 'utf8');
}

function trackChanges() {
  console.log('📝 Tracking changes in special-documents...\n');
  
  ensureDirectory(HISTORY_DIR);
  
  // Store previous hashes
  const hashFile = path.join(HISTORY_DIR, '.hashes.json');
  let previousHashes = {};
  
  if (fs.existsSync(hashFile)) {
    try {
      previousHashes = JSON.parse(fs.readFileSync(hashFile, 'utf8'));
    } catch (e) {
      previousHashes = {};
    }
  }
  
  const currentHashes = {};
  let changesDetected = false;
  
  for (const fileName of TRACKED_FILES) {
    const filePath = path.join(SPECIAL_DOCS_DIR, fileName);
    
    if (!fs.existsSync(filePath)) {
      continue;
    }
    
    const currentHash = getFileHash(filePath);
    currentHashes[fileName] = currentHash;
    
    const previousHash = previousHashes[fileName];
    
    if (previousHash && previousHash !== currentHash) {
      console.log(`  🔄 Change detected in: ${fileName}`);
      
      // Determine change type
      const currentSize = fs.statSync(filePath).size;
      const previousSize = previousHashes[`${fileName}_size`] || 0;
      
      let changeType = 'Modified';
      let description = 'File content was modified';
      
      if (currentSize > previousSize * 1.5) {
        changeType = 'Major Update';
        description = 'Significant content added';
      } else if (currentSize < previousSize * 0.5) {
        changeType = 'Content Removed';
        description = 'Significant content removed';
      } else if (!previousHash) {
        changeType = 'Created';
        description = 'File was created';
      }
      
      appendChangeHistory(filePath, changeType, description);
      changesDetected = true;
    } else if (!previousHash) {
      // New file
      console.log(`  ✨ New file detected: ${fileName}`);
      appendChangeHistory(filePath, 'Created', 'File was created');
      changesDetected = true;
    }
    
    currentHashes[`${fileName}_size`] = fs.statSync(filePath).size;
  }
  
  // Save current hashes
  fs.writeFileSync(hashFile, JSON.stringify(currentHashes, null, 2), 'utf8');
  
  if (changesDetected) {
    console.log('\n✅ Changes tracked and history updated.\n');
  } else {
    console.log('\n✅ No changes detected.\n');
  }
}

// Run if called directly
if (require.main === module) {
  trackChanges();
}

module.exports = { trackChanges };
