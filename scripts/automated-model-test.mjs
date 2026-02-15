/**
 * Automated test script to interact with the local model
 * This script will open the browser and interact with the model
 */

import { readFile } from 'fs/promises';
import { writeFile } from 'fs/promises';

console.log('🚀 Starting Automated Model Interaction Test...\n');

// Create a test HTML file that will automatically interact with the model
const testHTML = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Automated Model Test</title>
    <style>
        body { font-family: monospace; padding: 20px; background: #1e1e2e; color: #e2e8f0; }
        .log { background: #000; padding: 10px; margin: 10px 0; border-radius: 5px; max-height: 400px; overflow-y: auto; }
        .success { color: #10b981; }
        .error { color: #ef4444; }
        .info { color: #60a5fa; }
    </style>
</head>
<body>
    <h1>🤖 Automated Model Interaction Test</h1>
    <div id="log" class="log"></div>
    <script type="module">
        const log = (msg, type = 'info') => {
            const logEl = document.getElementById('log');
            const entry = document.createElement('div');
            entry.className = type;
            entry.textContent = \`[\${new Date().toLocaleTimeString()}] \${msg}\`;
            logEl.appendChild(entry);
            logEl.scrollTop = logEl.scrollHeight;
            console.log(msg);
        };

        (async () => {
            try {
                log('📦 Importing LocalAIModelService...', 'info');
                const { LocalAIModelService } = await import('/services/localAIModelService.js');
                window.LocalAIModelService = LocalAIModelService;
                
                log('🔧 Initializing...', 'info');
                await LocalAIModelService.initialize();
                log(\`✅ Initialized. Status: \${LocalAIModelService.getStatus()}\`, 'success');
                
                if (LocalAIModelService.getStatus() === 'UNLOADED') {
                    log('📥 Loading model...', 'info');
                    await LocalAIModelService.loadModel();
                    log('✅ Model loaded!', 'success');
                }
                
                const testPrompts = [
                    'Write a hello world function in Python',
                    'Explain what a closure is in JavaScript',
                    'Write a function to calculate factorial in Python'
                ];
                
                for (let i = 0; i < testPrompts.length; i++) {
                    const prompt = testPrompts[i];
                    log(\`\\n💬 Test \${i + 1}: "\${prompt}"\`, 'info');
                    
                    const startTime = Date.now();
                    const result = await LocalAIModelService.infer(prompt, {
                        maxTokens: 256,
                        temperature: 0.7,
                        timeout: 30000
                    });
                    const latency = Date.now() - startTime;
                    
                    log(\`✅ Response received in \${latency}ms\`, 'success');
                    log(\`📝 Response: \${result.text.substring(0, 200)}...\`, 'info');
                    log('─'.repeat(60), 'info');
                }
                
                log('\\n🎉 All tests completed successfully!', 'success');
                
            } catch (error) {
                log(\`❌ Error: \${error.message}\`, 'error');
                console.error(error);
            }
        })();
    </script>
</body>
</html>`;

try {
    await writeFile('public/automated-test.html', testHTML);
    console.log('✅ Test page created: public/automated-test.html');
    console.log('\n📋 To run the test:');
    console.log('1. Open http://localhost:3000/automated-test.html in your browser');
    console.log('2. The test will run automatically');
    console.log('\n💡 Or use the interactive test page:');
    console.log('   http://localhost:3000/test-local-model-standalone.html\n');
} catch (error) {
    console.error('❌ Error creating test page:', error.message);
    process.exit(1);
}
