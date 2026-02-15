/**
 * Automated Screenshot Script
 * 
 * This script can be run from the renderer process to automate screenshot taking
 * Usage: Call these functions from browser console or via IPC
 */

// This script is meant to be executed in the renderer process
// You can copy-paste these functions into the browser console

const screenshotAutomation = {
  /**
   * Take a screenshot via IPC
   */
  async takeScreenshot(name, description) {
    if (window.electron && window.electron.ipcRenderer) {
      const result = await window.electron.ipcRenderer.invoke('screenshot:take', name, description);
      console.log('Screenshot result:', result);
      return result;
    } else {
      console.error('Electron IPC not available');
      return { success: false, error: 'IPC not available' };
    }
  },

  /**
   * Open settings modal
   */
  async openSettings() {
    if (window.electron && window.electron.ipcRenderer) {
      return await window.electron.ipcRenderer.invoke('screenshot:open-settings');
    } else {
      // Fallback: try to click settings button
      const btn = document.querySelector('button[title*="Settings"], button[aria-label*="Settings"]');
      if (btn) btn.click();
    }
  },

  /**
   * Start model download
   */
  async startDownload() {
    if (window.electron && window.electron.ipcRenderer) {
      return await window.electron.ipcRenderer.invoke('screenshot:start-download');
    }
  },

  /**
   * Simulate offline mode
   */
  async simulateOffline() {
    if (window.electron && window.electron.ipcRenderer) {
      return await window.electron.ipcRenderer.invoke('screenshot:simulate-offline');
    } else {
      Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
      window.dispatchEvent(new Event('offline'));
    }
  },

  /**
   * Execute /diagnose command
   */
  async executeDiagnose() {
    if (window.electron && window.electron.ipcRenderer) {
      return await window.electron.ipcRenderer.invoke('screenshot:execute-diagnose');
    }
  },

  /**
   * Load model
   */
  async loadModel() {
    if (window.electron && window.electron.ipcRenderer) {
      return await window.electron.ipcRenderer.invoke('screenshot:load-model');
    }
  },

  /**
   * Send a test message
   */
  async sendMessage(message) {
    if (window.electron && window.electron.ipcRenderer) {
      return await window.electron.ipcRenderer.invoke('screenshot:send-message', message);
    }
  },

  /**
   * Run full screenshot sequence
   */
  async runFullSequence() {
    console.log('📸 Starting automated screenshot sequence...\n');
    
    // 1. Advanced Settings
    console.log('1. Opening Advanced Settings...');
    await this.openSettings();
    await new Promise(r => setTimeout(r, 2000));
    await this.takeScreenshot('01-advanced-settings', 'Advanced Settings Panel');
    
    // 2. Model Download
    console.log('2. Starting model download...');
    await this.startDownload();
    await new Promise(r => setTimeout(r, 5000));
    await this.takeScreenshot('02-model-download-progress', 'Model Download Progress');
    
    // 3. Offline Badge
    console.log('3. Simulating offline mode...');
    await this.simulateOffline();
    await new Promise(r => setTimeout(r, 2000));
    await this.takeScreenshot('03-offline-badge', 'Offline Badge Display');
    
    // 4. Diagnose
    console.log('4. Executing /diagnose...');
    await this.executeDiagnose();
    await new Promise(r => setTimeout(r, 5000));
    await this.takeScreenshot('04-diagnose-output', '/diagnose Command Output');
    
    // 5. Model Inference
    console.log('5. Testing model inference...');
    await this.loadModel();
    await new Promise(r => setTimeout(r, 5000));
    await this.sendMessage('Hello, generate exactly 5 tokens');
    await new Promise(r => setTimeout(r, 10000));
    await this.takeScreenshot('05-model-inference-test', 'Real Model Inference');
    
    // 6. Before Restart
    console.log('6. Preparing for restart...');
    await this.sendMessage('Test message for context restoration');
    await new Promise(r => setTimeout(r, 3000));
    await this.takeScreenshot('06-before-restart', 'Before Cold Restart');
    
    console.log('\n✅ Screenshot sequence complete!');
    console.log('📁 Screenshots saved to: screenshots/');
    console.log('\n⚠️  Manual step required: Close and reopen Electron app, then take final screenshot of restored context.');
  }
};

// Export for use in browser console
if (typeof window !== 'undefined') {
  window.screenshotAutomation = screenshotAutomation;
  console.log('✅ Screenshot automation loaded! Use window.screenshotAutomation.runFullSequence() to start.');
}

// For Node.js/Electron main process
if (typeof module !== 'undefined' && module.exports) {
  module.exports = screenshotAutomation;
}
