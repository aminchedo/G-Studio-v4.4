#!/usr/bin/env node

/**
 * Dependency Update Script
 * 
 * Helps identify and update deprecated dependencies
 * Run with: node scripts/update-dependencies.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking for deprecated dependencies...\n');

// Read package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

// Known deprecated packages to check for
const deprecatedPackages = [
  'are-we-there-yet',
  'boolean',
  'gauge',
  'glob',
  'inflight',
  'node-domexception',
  'npmlog',
  'rimraf',
  'tar'
];

// Check dependencies
console.log('📦 Checking dependencies...');
const deps = packageJson.dependencies || {};
const devDeps = packageJson.devDependencies || {};
const allDeps = { ...deps, ...devDeps };

let foundDeprecated = false;

for (const pkg of deprecatedPackages) {
  if (allDeps[pkg]) {
    console.log(`⚠️  Found deprecated package: ${pkg}@${allDeps[pkg]}`);
    foundDeprecated = true;
  }
}

if (!foundDeprecated) {
  console.log('✅ No known deprecated packages found in package.json');
}

console.log('\n📊 Running npm audit...');
try {
  execSync('npm audit --production', { stdio: 'inherit' });
} catch (error) {
  console.log('⚠️  Some vulnerabilities found (see above)');
}

console.log('\n📋 Checking for outdated packages...');
try {
  execSync('npm outdated', { stdio: 'inherit' });
} catch (error) {
  // npm outdated exits with code 1 if there are outdated packages
  console.log('\n💡 Some packages can be updated (see above)');
}

console.log('\n🔧 Recommendations:');
console.log('1. Review the outdated packages above');
console.log('2. Update packages with: pnpm update');
console.log('3. For major updates, use: npx npm-check-updates -u');
console.log('4. Test thoroughly after updates');
console.log('5. Run: pnpm audit fix (for security fixes)');

console.log('\n✨ Done!');
