/**
 * Documentation Watcher
 * 
 * Watches for new .md files in project root and automatically organizes them
 * 
 * Usage: node scripts/watch-docs.cjs
 * Or: npm run watch-docs
 */

const chokidar = require('chokidar');
const { organizeDocumentation } = require('./auto-organize-docs.cjs');

const PROJECT_ROOT = require('path').join(__dirname, '..');

console.log('👀 Watching for documentation changes...\n');
console.log('Press Ctrl+C to stop.\n');

// Watch for .md files in project root (excluding README.md and docs/)
const watcher = chokidar.watch('**/*.md', {
  cwd: PROJECT_ROOT,
  ignored: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.git/**',
    '**/docs/**',
    'README.md'
  ],
  ignoreInitial: true,
  persistent: true
});

watcher
  .on('add', (path) => {
    console.log(`📄 New file detected: ${path}`);
    console.log('🔄 Organizing documentation...\n');
    organizeDocumentation();
  })
  .on('change', (path) => {
    if (path === 'README.md') {
      console.log(`📝 README.md changed - skipping auto-organization\n`);
    }
  })
  .on('error', (error) => {
    console.error('❌ Watcher error:', error);
  });

// Initial organization
organizeDocumentation();

console.log('✅ Watcher started. Waiting for changes...\n');
