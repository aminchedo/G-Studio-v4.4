/**
 * UI Test Automation Script
 * Interacts with the actual application UI
 * Run this in browser console after app loads
 */

(async function() {
  console.log('🚀 Starting UI Test Automation...');
  
  const testLog = [];
  const errors = [];
  
  function log(level, message, data = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data
    };
    testLog.push(entry);
    console.log(`[${entry.timestamp}] [${level}] ${message}`, data || '');
  }

  // Wait for app to be ready
  async function waitForElement(selector, timeout = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
      const el = document.querySelector(selector);
      if (el) return el;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Element not found: ${selector}`);
  }

  // Find and interact with input area
  async function findInputArea() {
    log('INFO', 'Looking for input area...');
    
    // Try multiple selectors
    const selectors = [
      'textarea[placeholder*="message" i]',
      'textarea[placeholder*="پیام" i]',
      'textarea[placeholder*="type" i]',
      'textarea',
      '[contenteditable="true"]'
    ];

    for (const selector of selectors) {
      const el = document.querySelector(selector);
      if (el && el.offsetParent !== null) {
        log('SUCCESS', `Found input area: ${selector}`);
        return el;
      }
    }
    
    throw new Error('Input area not found');
  }

  // Send message through UI
  async function sendMessageThroughUI(message) {
    try {
      log('INFO', `Sending message: "${message}"`);
      
      // Find input
      const input = await findInputArea();
      
      // Clear and set value
      input.value = message;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      
      // Find send button
      const sendButton = document.querySelector('button[type="submit"]') ||
                        document.querySelector('button:has(svg)') ||
                        Array.from(document.querySelectorAll('button')).find(btn => 
                          btn.textContent.includes('Send') || 
                          btn.textContent.includes('ارسال') ||
                          btn.querySelector('svg')
                        );
      
      if (sendButton) {
        log('INFO', 'Clicking send button...');
        sendButton.click();
        
        // Wait for response
        await new Promise(resolve => setTimeout(resolve, 3000));
        log('SUCCESS', 'Message sent through UI');
        return true;
      } else {
        // Try Enter key
        log('INFO', 'Send button not found, trying Enter key...');
        const enterEvent = new KeyboardEvent('keydown', {
          key: 'Enter',
          code: 'Enter',
          keyCode: 13,
          which: 13,
          bubbles: true
        });
        input.dispatchEvent(enterEvent);
        await new Promise(resolve => setTimeout(resolve, 3000));
        log('SUCCESS', 'Message sent via Enter key');
        return true;
      }
    } catch (error) {
      log('ERROR', `Failed to send message: ${error.message}`);
      errors.push(error);
      return false;
    }
  }

  // Open settings
  async function openSettings() {
    try {
      log('INFO', 'Opening settings...');
      
      // Find settings button (gear icon)
      const settingsButton = document.querySelector('button[aria-label*="settings" i]') ||
                            document.querySelector('button[aria-label*="تنظیمات" i]') ||
                            Array.from(document.querySelectorAll('button')).find(btn => 
                              btn.querySelector('svg') && 
                              (btn.textContent.includes('Settings') || btn.textContent.includes('⚙️'))
                            );
      
      if (settingsButton) {
        settingsButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        log('SUCCESS', 'Settings opened');
        return true;
      }
      
      throw new Error('Settings button not found');
    } catch (error) {
      log('ERROR', `Failed to open settings: ${error.message}`);
      errors.push(error);
      return false;
    }
  }

  // Switch to local model in settings
  async function switchToLocalModel() {
    try {
      log('INFO', 'Switching to local model...');
      
      // Look for AI Mode or Local Model settings
      const localOption = document.querySelector('input[value*="local" i]') ||
                         document.querySelector('button:contains("Local")') ||
                         Array.from(document.querySelectorAll('*')).find(el => 
                           el.textContent.includes('Local') && 
                           (el.tagName === 'BUTTON' || el.tagName === 'INPUT')
                         );
      
      if (localOption) {
        if (localOption.tagName === 'INPUT') {
          localOption.click();
        } else {
          localOption.click();
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        log('SUCCESS', 'Switched to local model');
        return true;
      }
      
      throw new Error('Local model option not found');
    } catch (error) {
      log('ERROR', `Failed to switch to local model: ${error.message}`);
      errors.push(error);
      return false;
    }
  }

  // Monitor for errors
  function setupErrorMonitoring() {
    window.addEventListener('error', (event) => {
      errors.push({
        type: 'error',
        message: event.error?.message || event.message,
        stack: event.error?.stack,
        timestamp: new Date().toISOString()
      });
      log('ERROR', 'Background error detected', {
        message: event.error?.message || event.message
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      errors.push({
        type: 'rejection',
        message: event.reason?.message || String(event.reason),
        stack: event.reason?.stack,
        timestamp: new Date().toISOString()
      });
      log('ERROR', 'Unhandled promise rejection', {
        message: event.reason?.message || String(event.reason)
      });
    });
  }

  // Main test function
  async function runUITest() {
    log('INFO', '='.repeat(80));
    log('INFO', 'UI TEST AUTOMATION STARTED');
    log('INFO', '='.repeat(80));

    setupErrorMonitoring();

    // Step 1: Test Online Model
    log('INFO', 'STEP 1: Testing Online Model (Gemini)');
    log('INFO', 'Sending calculator request to online model...');
    
    const calculatorPrompt = 'Create a simple calculator in JavaScript with add, subtract, multiply, and divide functions. Include error handling.';
    
    const onlineSuccess = await sendMessageThroughUI(calculatorPrompt);
    
    if (onlineSuccess) {
      log('SUCCESS', 'Online model test initiated');
      // Wait for response
      await new Promise(resolve => setTimeout(resolve, 15000));
      log('INFO', 'Waiting for online model response...');
    }

    // Check for errors
    if (errors.length > 0) {
      log('WARNING', `Found ${errors.length} error(s) during online test`);
      errors.forEach(err => log('ERROR', err.message, err));
    }

    // Step 2: Switch to Local Model
    log('INFO', '');
    log('INFO', 'STEP 2: Switching to Local Model');
    
    await openSettings();
    await switchToLocalModel();
    
    // Step 3: Test Local Model
    log('INFO', 'STEP 3: Testing Local Model');
    log('INFO', 'Sending message to local model...');
    
    const localPrompt = 'Hello! Can you help me with a simple coding question?';
    const localSuccess = await sendMessageThroughUI(localPrompt);
    
    if (localSuccess) {
      log('SUCCESS', 'Local model test initiated');
      await new Promise(resolve => setTimeout(resolve, 10000));
      log('INFO', 'Waiting for local model response...');
    }

    // Final summary
    log('INFO', '');
    log('INFO', '='.repeat(80));
    log('INFO', 'TEST SUMMARY');
    log('INFO', '='.repeat(80));
    log('INFO', `Total errors: ${errors.length}`);
    log('INFO', `Test log entries: ${testLog.length}`);

    // Save results
    const results = {
      timestamp: new Date().toISOString(),
      testLog,
      errors,
      summary: {
        onlineTest: onlineSuccess,
        localTest: localSuccess,
        totalErrors: errors.length
      }
    };

    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ui-test-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    log('SUCCESS', 'Test results saved!');
    
    return results;
  }

  // Export to window
  window.runUITest = runUITest;
  window.sendMessageThroughUI = sendMessageThroughUI;
  window.openSettings = openSettings;
  window.switchToLocalModel = switchToLocalModel;

  console.log('✅ UI Test Automation loaded!');
  console.log('Run: await runUITest()');
  
  // Auto-run after page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        console.log('🚀 Auto-starting UI test in 3 seconds...');
        setTimeout(() => runUITest(), 3000);
      }, 2000);
    });
  } else {
    setTimeout(() => {
      console.log('🚀 Auto-starting UI test in 3 seconds...');
      setTimeout(() => runUITest(), 3000);
    }, 2000);
  }
})();
