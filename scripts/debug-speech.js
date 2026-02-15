#!/usr/bin/env node

/**
 * Speech Recognition Debugging Script
 * 
 * This script checks all prerequisites for speech recognition in Electron
 * Run this before starting the app to diagnose any issues
 */

const fs = require('fs');
const path = require('path');

console.log('\n=== Speech Recognition Debug Report ===\n');

// Check if we're in the right directory
const requiredFiles = [
  'package.json',
  'electron/main.cjs',
  'electron/preload.cjs',
  'services/speechRecognitionService.ts'
];

console.log('1. Checking required files...');
let allFilesExist = true;
for (const file of requiredFiles) {
  const exists = fs.existsSync(path.join(__dirname, file));
  console.log(`   ${exists ? '✓' : '✗'} ${file}`);
  if (!exists) allFilesExist = false;
}

if (!allFilesExist) {
  console.log('\n❌ Missing required files! Make sure you\'re in the project root.\n');
  process.exit(1);
}

// Check package.json
console.log('\n2. Checking package.json...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log(`   ✓ Project name: ${packageJson.name}`);
console.log(`   ✓ Electron version: ${packageJson.devDependencies?.electron || 'Not found'}`);

// Check main.cjs for required switches
console.log('\n3. Checking electron/main.cjs for speech recognition switches...');
const mainContent = fs.readFileSync('electron/main.cjs', 'utf8');

const requiredSwitches = [
  'enable-speech-dispatcher',
  'enable-speech-api',
  'enable-media-stream'
];

for (const sw of requiredSwitches) {
  const found = mainContent.includes(sw);
  console.log(`   ${found ? '✓' : '✗'} ${sw}`);
}

// Check for permission handlers
console.log('\n4. Checking for permission handlers...');
const hasPermissionRequest = mainContent.includes('setPermissionRequestHandler');
const hasPermissionCheck = mainContent.includes('setPermissionCheckHandler');
console.log(`   ${hasPermissionRequest ? '✓' : '✗'} setPermissionRequestHandler`);
console.log(`   ${hasPermissionCheck ? '✓' : '✗'} setPermissionCheckHandler`);

// Check preload.cjs
console.log('\n5. Checking electron/preload.cjs...');
const preloadContent = fs.readFileSync('electron/preload.cjs', 'utf8');
const hasSpeechAPI = preloadContent.includes('speechAPI');
const hasElectronSupported = preloadContent.includes('electronSupported');
console.log(`   ${hasSpeechAPI ? '✓' : '✗'} speechAPI exposed to renderer`);
console.log(`   ${hasElectronSupported ? '✓' : '✗'} electronSupported flag`);

// Check speechRecognitionService.ts
console.log('\n6. Checking services/speechRecognitionService.ts...');
const serviceContent = fs.readFileSync('services/speechRecognitionService.ts', 'utf8');
const hasCheckSupport = serviceContent.includes('checkSupport');
const hasWebkitCheck = serviceContent.includes('webkitSpeechRecognition');
console.log(`   ${hasCheckSupport ? '✓' : '✗'} checkSupport method exists`);
console.log(`   ${hasWebkitCheck ? '✓' : '✗'} checks for webkitSpeechRecognition`);

// Check node_modules
console.log('\n7. Checking node_modules...');
const nodeModulesExists = fs.existsSync('node_modules');
console.log(`   ${nodeModulesExists ? '✓' : '✗'} node_modules folder exists`);
if (!nodeModulesExists) {
  console.log('   ⚠ Run "npm install" to install dependencies');
}

// Summary
console.log('\n=== Summary ===\n');

const allChecks = allFilesExist && 
                 hasPermissionRequest && 
                 hasPermissionCheck && 
                 hasSpeechAPI && 
                 hasElectronSupported &&
                 nodeModulesExists;

if (allChecks) {
  console.log('✅ All checks passed! Your app should support speech recognition.');
  console.log('\nNext steps:');
  console.log('  1. Run: npm run electron:dev');
  console.log('  2. Click the microphone button');
  console.log('  3. Grant microphone permission');
  console.log('  4. Speak and see the transcript\n');
} else {
  console.log('❌ Some checks failed. Please review the errors above.');
  console.log('\nCommon fixes:');
  console.log('  - Run: npm install');
  console.log('  - Make sure you\'re using the updated main.cjs and preload.cjs files');
  console.log('  - Check that all required files exist\n');
}

console.log('='.repeat(40) + '\n');
