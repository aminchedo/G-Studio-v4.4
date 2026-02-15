/**
 * Complete UI Test Script
 * Run this in browser console: await runCompleteTest()
 * 
 * This script will:
 * 1. Send calculator request to online model via UI
 * 2. Monitor for background errors
 * 3. Open settings and switch to local model
 * 4. Send message to local model via UI
 * 5. Save all debug logs
 */

window.runCompleteTest = async function() {
  console.log('🚀 Starting Complete UI Test...');
  
  const results = {
    timestamp: new Date().toISOString(),
    steps: [],
    errors: [],
    consoleLogs: []
  };

  function logStep(step, status, message, data = null) {
    const entry = { step, status, message, data, timestamp: Date.now() };
    results.steps.push(entry);
    console.log(`[${step}] [${status}] ${message}`, data || '');
  }

  // Capture console logs
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = function(...args) {
    results.consoleLogs.push({ level: 'log', message: args.join(' '), timestamp: Date.now() });
    originalLog.apply(console, args);
  };

  console.error = function(...args) {
    results.errors.push({ type: 'console-error', message: args.join(' '), timestamp: Date.now() });
    results.consoleLogs.push({ level: 'error', message: args.join(' '), timestamp: Date.now() });
    originalError.apply(console, args);
  };

  console.warn = function(...args) {
    results.consoleLogs.push({ level: 'warn', message: args.join(' '), timestamp: Date.now() });
    originalWarn.apply(console, args);
  };

  // Monitor window errors
  window.addEventListener('error', (e) => {
    results.errors.push({
      type: 'window-error',
      message: e.message,
      stack: e.stack,
      filename: e.filename,
      lineno: e.lineno,
      timestamp: Date.now()
    });
    logStep('ERROR_MONITOR', 'ERROR', `Window error: ${e.message}`);
  });

  window.addEventListener('unhandledrejection', (e) => {
    results.errors.push({
      type: 'unhandled-rejection',
      message: e.reason?.message || String(e.reason),
      stack: e.reason?.stack,
      timestamp: Date.now()
    });
    logStep('ERROR_MONITOR', 'ERROR', `Unhandled rejection: ${e.reason?.message || String(e.reason)}`);
  });

  try {
    // Wait for app to load
    logStep('INIT', 'INFO', 'Waiting for app to load...');
    await new Promise(r => setTimeout(r, 3000));

    // STEP 1: Find chat input and send calculator request
    logStep('STEP_1', 'INFO', 'Finding chat input area...');
    
    const textarea = document.querySelector('textarea[placeholder*="Ask Gemini" i]') ||
                     Array.from(document.querySelectorAll('textarea')).find(t => 
                       t.offsetParent !== null && 
                       (t.placeholder?.includes('Ask') || t.placeholder?.includes('Gemini'))
                     );

    if (!textarea) {
      throw new Error('Chat input not found');
    }

    logStep('STEP_1', 'SUCCESS', 'Chat input found');

    // Enter calculator prompt
    const calculatorPrompt = 'Create a simple calculator in JavaScript with add, subtract, multiply, and divide functions. Include error handling.';
    
    logStep('STEP_1', 'INFO', `Entering prompt: "${calculatorPrompt.substring(0, 50)}..."`);
    
    // Set value properly for React
    textarea.focus();
    textarea.value = calculatorPrompt;
    
    // Trigger React events
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    if (nativeInputValueSetter) {
      nativeInputValueSetter.call(textarea, calculatorPrompt);
    }
    
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));
    
    // Find send button
    const sendButton = textarea.closest('form')?.querySelector('button[type="submit"]') ||
                      Array.from(textarea.parentElement?.querySelectorAll('button') || []).find(btn => {
                        const svg = btn.querySelector('svg');
                        return svg && btn.offsetParent !== null;
                      });

    if (sendButton) {
      logStep('STEP_1', 'INFO', 'Clicking send button...');
      sendButton.click();
      logStep('STEP_1', 'SUCCESS', 'Message sent to online model');
      
      // Wait for response
      logStep('STEP_1', 'INFO', 'Waiting for response (20 seconds)...');
      await new Promise(r => setTimeout(r, 20000));
      logStep('STEP_1', 'INFO', 'Response wait completed');
    } else {
      // Try Enter key
      logStep('STEP_1', 'INFO', 'Send button not found, trying Enter key...');
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      });
      textarea.dispatchEvent(enterEvent);
      await new Promise(r => setTimeout(r, 20000));
    }

    // Check for errors so far
    if (results.errors.length > 0) {
      logStep('STEP_1', 'WARNING', `Found ${results.errors.length} error(s)`, results.errors);
    }

    // STEP 2: Open Settings
    logStep('STEP_2', 'INFO', 'Opening settings...');
    
    // Find Settings tab in Ribbon
    const settingsTab = Array.from(document.querySelectorAll('button, [role="tab"]')).find(el => {
      const text = (el.textContent || '').trim().toLowerCase();
      return text === 'settings' && el.offsetParent !== null;
    });

    if (settingsTab) {
      settingsTab.click();
      logStep('STEP_2', 'SUCCESS', 'Settings tab opened');
      await new Promise(r => setTimeout(r, 2000));
    } else {
      logStep('STEP_2', 'WARNING', 'Settings tab not found');
    }

    // STEP 3: Find and click "Load Model" button for local AI
    logStep('STEP_3', 'INFO', 'Looking for Local AI settings...');
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Look for "Load Model" or "Initialize" button
    const loadModelButton = Array.from(document.querySelectorAll('button')).find(btn => {
      const text = (btn.textContent || '').toLowerCase();
      return (text.includes('load model') || 
              text.includes('initialize') || 
              text.includes('local ai')) &&
             btn.offsetParent !== null;
    });

    if (loadModelButton) {
      logStep('STEP_3', 'INFO', 'Found Load Model button, clicking...');
      loadModelButton.click();
      await new Promise(r => setTimeout(r, 5000)); // Wait for model to load
      logStep('STEP_3', 'SUCCESS', 'Local model loading initiated');
    } else {
      logStep('STEP_3', 'WARNING', 'Load Model button not found - model may already be loaded');
    }

    // STEP 4: Switch AI Mode to Local (if there's a mode selector)
    logStep('STEP_4', 'INFO', 'Looking for AI Mode selector...');
    
    const aiModeSelect = document.querySelector('select[name*="mode" i]') ||
                        document.querySelector('select[name*="ai" i]') ||
                        Array.from(document.querySelectorAll('select')).find(sel => {
                          const options = Array.from(sel.options).map(o => o.text.toLowerCase());
                          return options.some(o => o.includes('local'));
                        });

    if (aiModeSelect) {
      const localOption = Array.from(aiModeSelect.options).find(opt => 
        opt.text.toLowerCase().includes('local')
      );
      if (localOption) {
        aiModeSelect.value = localOption.value;
        aiModeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        logStep('STEP_4', 'SUCCESS', 'Switched AI Mode to Local');
        await new Promise(r => setTimeout(r, 1000));
      }
    } else {
      logStep('STEP_4', 'INFO', 'AI Mode selector not found - may use default mode');
    }

    // STEP 5: Send message to local model
    logStep('STEP_5', 'INFO', 'Sending message to local model...');
    
    // Find textarea again
    const textarea2 = document.querySelector('textarea[placeholder*="Ask Gemini" i]') ||
                     Array.from(document.querySelectorAll('textarea')).find(t => t.offsetParent !== null);

    if (textarea2) {
      const localPrompt = 'Hello! Can you help me with a simple coding question?';
      
      textarea2.focus();
      textarea2.value = localPrompt;
      
      if (nativeInputValueSetter) {
        nativeInputValueSetter.call(textarea2, localPrompt);
      }
      
      textarea2.dispatchEvent(new Event('input', { bubbles: true }));
      textarea2.dispatchEvent(new Event('change', { bubbles: true }));

      const sendButton2 = textarea2.closest('form')?.querySelector('button[type="submit"]') ||
                         Array.from(textarea2.parentElement?.querySelectorAll('button') || []).find(btn => 
                           btn.offsetParent !== null && btn.querySelector('svg')
                         );

      if (sendButton2) {
        sendButton2.click();
        logStep('STEP_5', 'SUCCESS', 'Message sent to local model');
        await new Promise(r => setTimeout(r, 15000)); // Wait for local model response
        logStep('STEP_5', 'INFO', 'Local model response wait completed');
      }
    }

    // Final summary
    logStep('SUMMARY', 'INFO', '='.repeat(60));
    logStep('SUMMARY', 'INFO', `Total steps: ${results.steps.length}`);
    logStep('SUMMARY', 'INFO', `Total errors: ${results.errors.length}`);
    logStep('SUMMARY', 'INFO', `Console logs: ${results.consoleLogs.length}`);
    logStep('SUMMARY', 'SUCCESS', 'Test completed!');

    // Save results
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ui-test-complete-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('✅ Test results saved!');
    
    // Restore console
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;

    return results;

  } catch (error) {
    logStep('FATAL', 'ERROR', `Test failed: ${error.message}`, { stack: error.stack });
    results.errors.push({
      type: 'fatal-error',
      message: error.message,
      stack: error.stack,
      timestamp: Date.now()
    });

    // Restore console
    console.log = originalLog;
    console.error = originalError;
    console.warn = originalWarn;

    throw error;
  }
};

console.log('✅ UI Test Script Loaded!');
console.log('Run: await runCompleteTest()');
