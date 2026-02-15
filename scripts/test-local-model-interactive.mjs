/**
 * Interactive test script for Local AI Model
 * This script demonstrates how to interact with the model programmatically
 */

import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🚀 Starting Local AI Model Interactive Test...\n');

// Simulate browser environment for testing
const testInBrowser = async () => {
    console.log('📝 Instructions for Browser Testing:\n');
    console.log('1. Open http://localhost:3000 in your browser');
    console.log('2. Open Developer Console (F12)');
    console.log('3. Copy and paste the following code:\n');
    console.log('─'.repeat(60));
    
    const testCode = `
(async function() {
    console.log('🚀 Starting Local AI Model Test...\\n');
    
    // Import service
    const { LocalAIModelService } = await import('./services/localAIModelService.js');
    console.log('✅ Service imported\\n');
    
    // Initialize
    console.log('🔧 Initializing...');
    await LocalAIModelService.initialize();
    console.log('Status:', LocalAIModelService.getStatus());
    console.log('✅ Initialized\\n');
    
    // Load model
    if (LocalAIModelService.getStatus() === 'UNLOADED') {
        console.log('📥 Loading model...');
        await LocalAIModelService.loadModel();
        console.log('✅ Model loaded!\\n');
    }
    
    // Test 1: Simple prompt
    console.log('💬 Test 1: Simple Python function');
    const result1 = await LocalAIModelService.infer('Write a hello world function in Python', {
        maxTokens: 256,
        temperature: 0.7
    });
    console.log('Response:', result1.text);
    console.log('Latency:', result1.latency, 'ms\\n');
    
    // Test 2: Code explanation
    console.log('💬 Test 2: Code explanation');
    const result2 = await LocalAIModelService.infer('Explain what a closure is in JavaScript', {
        maxTokens: 256,
        temperature: 0.7
    });
    console.log('Response:', result2.text);
    console.log('Latency:', result2.latency, 'ms\\n');
    
    console.log('🎉 Tests completed!');
})();
`.trim();
    
    console.log(testCode);
    console.log('─'.repeat(60));
    console.log('\n💡 Or use the test page: http://localhost:3000/test-local-model-standalone.html\n');
};

// Main execution
(async () => {
    try {
        await testInBrowser();
        
        console.log('\n📋 Alternative: Use the Settings Modal in the app:');
        console.log('1. Click ⚙️ Settings in the Ribbon');
        console.log('2. Go to "Test Local Model" section');
        console.log('3. Initialize and load the model');
        console.log('4. Send messages and get responses\n');
        
        console.log('✅ Setup complete! The model is ready for interaction.\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
})();
