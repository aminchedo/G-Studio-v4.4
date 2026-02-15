#!/usr/bin/env node

/**
 * Replace console.log with logger utility
 * Automatically updates all source files
 */

const fs = require('fs');
const path = require('path');

const DIRS_TO_PROCESS = ['components', 'services', 'hooks'];
const EXTENSIONS = ['.ts', '.tsx'];

function shouldProcessFile(filePath) {
  return EXTENSIONS.some(ext => filePath.endsWith(ext));
}

function addLoggerImport(content) {
  if (content.includes('import logger') || content.includes('import { logger }')) {
    return content;
  }

  const importMatch = content.match(/^import.*from.*;$/m);
  if (importMatch) {
    const insertPos = content.indexOf(importMatch[0]) + importMatch[0].length;
    return content.slice(0, insertPos) + "\nimport logger from '@/utils/logger';" + content.slice(insertPos);
  }

  return "import logger from '@/utils/logger';\n\n" + content;
}

function replaceConsoleLogs(content) {
  let modified = content;

  modified = modified.replace(
    /console\.log\(([^)]+)\);/g,
    (match, args) => `logger.debug(${args}, undefined, '${getCurrentComponent()}');`
  );

  modified = modified.replace(
    /console\.info\(([^)]+)\);/g,
    (match, args) => `logger.info(${args}, undefined, '${getCurrentComponent()}');`
  );

  modified = modified.replace(
    /console\.warn\(([^)]+)\);/g,
    (match, args) => `logger.warn(${args}, undefined, '${getCurrentComponent()}');`
  );

  modified = modified.replace(
    /console\.error\(([^)]+)\);/g,
    (match, args) => `logger.error(${args}, undefined, '${getCurrentComponent()}');`
  );

  return modified;
}

function getCurrentComponent() {
  return 'Component';
}

function processFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8');
  
  if (!content.includes('console.')) {
    return false;
  }

  let modified = replaceConsoleLogs(content);
  modified = addLoggerImport(modified);

  fs.writeFileSync(filePath, modified, 'utf-8');
  return true;
}

function processDirectory(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  let filesModified = 0;

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      filesModified += processDirectory(fullPath);
    } else if (entry.isFile() && shouldProcessFile(entry.name)) {
      if (processFile(fullPath)) {
        filesModified++;
        console.log(`Modified: ${fullPath}`);
      }
    }
  }

  return filesModified;
}

let totalModified = 0;

for (const dir of DIRS_TO_PROCESS) {
  const dirPath = path.join(process.cwd(), dir);
  if (fs.existsSync(dirPath)) {
    console.log(`\nProcessing ${dir}/...`);
    const count = processDirectory(dirPath);
    totalModified += count;
    console.log(`Modified ${count} files in ${dir}/`);
  }
}

console.log(`\nTotal files modified: ${totalModified}`);
