/**
 * Direct UI Interaction Script
 * Interacts with the actual React components in the app
 * Run this in browser console: await interactWithUI()
 */

async function interactWithUI() {
  console.log('🚀 Starting UI Interaction Test...');
  
  const log = [];
  const errors = [];
  
  function addLog(level, msg, data) {
    const entry = { timestamp: Date.now(), level, msg, data };
    log.push(entry);
    console.log(`[${level}] ${msg}`, data || '');
  }

  // Monitor errors
  const originalError = console.error;
  console.error = function(...args) {
    errors.push({ type: 'console-error', message: args.join(' '), timestamp: Date.now() });
    originalError.apply(console, args);
  };

  window.addEventListener('error', (e) => {
    errors.push({ type: 'window-error', message: e.message, stack: e.stack, timestamp: Date.now() });
  });

  window.addEventListener('unhandledrejection', (e) => {
    errors.push({ type: 'rejection', message: e.reason?.message || String(e.reason), timestamp: Date.now() });
  });

  // Step 1: Find and interact with chat input
  addLog('INFO', 'Step 1: Finding chat input...');
  
  await new Promise(r => setTimeout(r, 2000)); // Wait for app to load
  
  // Find textarea - InputArea component uses a textarea with specific placeholder
  const textarea = document.querySelector('textarea[placeholder*="Ask Gemini" i]') ||
                   document.querySelector('textarea[placeholder*="analyze code" i]') ||
                   document.querySelector('textarea[placeholder*="message" i]') ||
                   Array.from(document.querySelectorAll('textarea')).find(t => {
                     if (t.offsetParent === null) return false;
                     const placeholder = t.placeholder?.toLowerCase() || '';
                     return placeholder.includes('ask') || 
                            placeholder.includes('gemini') || 
                            placeholder.includes('message') ||
                            placeholder.includes('analyze');
                   });

  if (!textarea) {
    addLog('ERROR', 'Chat input not found!');
    return { success: false, error: 'Input not found' };
  }

  addLog('SUCCESS', 'Found chat input');

  // Step 2: Send message to online model (calculator request)
  addLog('INFO', 'Step 2: Sending calculator request to online model...');
  
  const calculatorPrompt = 'Create a simple calculator in JavaScript with add, subtract, multiply, and divide functions. Include error handling.';
  
  // Set value and trigger React events
  textarea.value = calculatorPrompt;
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  textarea.dispatchEvent(new Event('change', { bubbles: true }));
  
  // Trigger React's onChange
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(textarea, calculatorPrompt);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }

  addLog('INFO', 'Message entered in input field');

  // Find and click send button - InputArea has a Send button with icon
  const sendButton = textarea.closest('form')?.querySelector('button[type="submit"]') ||
                    textarea.parentElement?.parentElement?.querySelector('button') ||
                    Array.from(document.querySelectorAll('button')).find(btn => {
                      if (btn.offsetParent === null) return false;
                      const svg = btn.querySelector('svg');
                      const text = btn.textContent?.toLowerCase() || '';
                      const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
                      // Look for Send icon (usually a paper plane or arrow)
                      return svg && (
                        text.includes('send') || 
                        ariaLabel.includes('send') ||
                        svg.querySelector('path[d*="M12"]') || // Common send icon path
                        btn.closest('div')?.querySelector('textarea') === textarea
                      );
                    });

  if (sendButton) {
    addLog('INFO', 'Clicking send button...');
    sendButton.click();
    addLog('SUCCESS', 'Message sent to online model');
    
    // Wait for response
    addLog('INFO', 'Waiting for response (15 seconds)...');
    await new Promise(r => setTimeout(r, 15000));
    addLog('INFO', 'Response wait completed');
  } else {
    // Try Enter key
    addLog('INFO', 'Send button not found, trying Enter key...');
    const enterEvent = new KeyboardEvent('keydown', {
      key: 'Enter',
      code: 'Enter',
      keyCode: 13,
      which: 13,
      bubbles: true,
      cancelable: true
    });
    textarea.dispatchEvent(enterEvent);
    await new Promise(r => setTimeout(r, 15000));
  }

  // Check for errors
  if (errors.length > 0) {
    addLog('WARNING', `Found ${errors.length} error(s)`, errors);
  }

  // Step 3: Open Settings
  addLog('INFO', 'Step 3: Opening settings to switch to local model...');
  
  // Find Settings tab in Ribbon - look for button with text "Settings"
  const settingsButton = Array.from(document.querySelectorAll('button')).find(btn => {
    const text = (btn.textContent || '').trim().toLowerCase();
    return text === 'settings' && btn.offsetParent !== null;
  }) ||
  // Or find by role="tab" with Settings
  Array.from(document.querySelectorAll('[role="tab"], button')).find(el => {
    const text = (el.textContent || '').trim().toLowerCase();
    return text === 'settings' && el.offsetParent !== null;
  });

  if (settingsButton) {
    settingsButton.click();
    addLog('SUCCESS', 'Settings opened');
    await new Promise(r => setTimeout(r, 2000));
  } else {
    addLog('WARNING', 'Settings button not found, trying to find via navigation...');
    // Try finding via Ribbon or navigation
    const ribbonButtons = Array.from(document.querySelectorAll('[class*="ribbon"], [class*="Ribbon"] button'));
    const settingsBtn = ribbonButtons.find(btn => 
      btn.textContent.includes('Settings') || 
      btn.querySelector('svg')
    );
    if (settingsBtn) {
      settingsBtn.click();
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Step 4: Switch to Local Model
  addLog('INFO', 'Step 4: Switching to local model...');
  
  // Look for Local AI settings - check AgentModal or LocalAISettings component
  // The settings might open a modal, so look for that
  await new Promise(r => setTimeout(r, 2000)); // Wait for settings modal/tab to render
  
  // Look for "Advanced" section or "Local AI" section in settings
  const advancedSection = Array.from(document.querySelectorAll('button, [role="button"]')).find(el => {
    const text = (el.textContent || '').toLowerCase();
    return text.includes('advanced') && el.offsetParent !== null;
  });
  
  if (advancedSection) {
    advancedSection.click();
    await new Promise(r => setTimeout(r, 1000));
  }
  
  // Now look for Local AI options
  const localOption = 
    // Look for "Load Model" or "Local AI" button
    Array.from(document.querySelectorAll('button')).find(btn => {
      const text = (btn.textContent || '').toLowerCase();
      return (text.includes('load model') || text.includes('local ai') || text.includes('local model')) &&
             btn.offsetParent !== null;
    }) ||
    // Or look for LocalAISettings component
    document.querySelector('[class*="LocalAI"], [class*="local-ai"]') ||
    // Or check for input/select for AI Mode
    document.querySelector('select[name*="mode" i], select[name*="ai" i]') ||
    document.querySelector('input[value*="LOCAL" i]');

  if (localOption) {
    if (localOption.tagName === 'INPUT') {
      localOption.click();
      localOption.checked = true;
      localOption.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      localOption.click();
    }
    addLog('SUCCESS', 'Switched to local model');
    await new Promise(r => setTimeout(r, 1000));
  } else {
    addLog('WARNING', 'Local model option not found in settings');
  }

  // Close settings if modal
  const closeButton = document.querySelector('button[aria-label*="close" i]') ||
                     document.querySelector('button:has(svg)')?.closest('[role="dialog"]')?.querySelector('button');
  if (closeButton) {
    closeButton.click();
    await new Promise(r => setTimeout(r, 1000));
  }

  // Step 5: Send message to local model
  addLog('INFO', 'Step 5: Sending message to local model...');
  
  const localPrompt = 'Hello! Can you help me with a simple coding question?';
  
  // Find textarea again (might have changed)
  const textarea2 = document.querySelector('textarea[placeholder*="Ask Gemini" i]') ||
                    document.querySelector('textarea[placeholder*="message" i]') ||
                    Array.from(document.querySelectorAll('textarea')).find(t => t.offsetParent !== null);

  if (textarea2) {
    textarea2.value = localPrompt;
    textarea2.dispatchEvent(new Event('input', { bubbles: true }));
    textarea2.dispatchEvent(new Event('change', { bubbles: true }));
    
    const sendButton2 = textarea2.closest('form')?.querySelector('button[type="submit"]') ||
                       textarea2.parentElement?.querySelector('button') ||
                       Array.from(document.querySelectorAll('button')).find(btn => 
                         btn.offsetParent !== null && btn.querySelector('svg')
                       );

    if (sendButton2) {
      sendButton2.click();
      addLog('SUCCESS', 'Message sent to local model');
      await new Promise(r => setTimeout(r, 10000));
    }
  }

  // Summary
  addLog('INFO', '='.repeat(60));
  addLog('INFO', 'TEST COMPLETE');
  addLog('INFO', `Total errors: ${errors.length}`);
  addLog('INFO', '='.repeat(60));

  // Save results
  const results = {
    timestamp: new Date().toISOString(),
    log,
    errors,
    summary: {
      totalErrors: errors.length,
      errorTypes: errors.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
      }, {})
    }
  };

  const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ui-interaction-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  addLog('SUCCESS', 'Results saved!');
  
  return results;
}

// Export
window.interactWithUI = interactWithUI;

console.log('✅ UI Interaction script loaded!');
console.log('Run: await interactWithUI()');
