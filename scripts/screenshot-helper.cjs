/**
 * Screenshot Helper Script
 * 
 * Provides IPC handlers for automated screenshot taking
 * Run this alongside the main Electron app
 */

const { ipcMain, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const screenshotsDir = path.join(__dirname, '../screenshots');

// Create screenshots directory
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

let screenshotCounter = 0;

/**
 * Register IPC handlers for screenshot automation
 */
function registerScreenshotHandlers(mainWindow) {
  if (!mainWindow) return;

  // Handler: Take screenshot with name
  ipcMain.handle('screenshot:take', async (event, name, description) => {
    try {
      screenshotCounter++;
      const filename = `${screenshotCounter.toString().padStart(2, '0')}-${name}.png`;
      const filepath = path.join(screenshotsDir, filename);
      
      const image = await mainWindow.webContents.capturePage();
      fs.writeFileSync(filepath, image.toPNG());
      
      console.log(`✅ Screenshot saved: ${filename} - ${description}`);
      return { success: true, filepath, filename };
    } catch (error) {
      console.error(`❌ Failed to take screenshot ${name}:`, error);
      return { success: false, error: error.message };
    }
  });

  // Handler: Open settings modal
  ipcMain.handle('screenshot:open-settings', async () => {
    try {
      await mainWindow.webContents.executeJavaScript(`
        (() => {
          // Dispatch custom event to open settings
          window.dispatchEvent(new CustomEvent('open-settings'));
          // Or try to find and click settings button
          const settingsBtn = document.querySelector('button[title*="Settings"], button[aria-label*="Settings"]');
          if (settingsBtn) {
            settingsBtn.click();
            return 'Settings opened via button click';
          }
          return 'Settings event dispatched';
        })();
      `);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Handler: Start model download
  ipcMain.handle('screenshot:start-download', async () => {
    try {
      await mainWindow.webContents.executeJavaScript(`
        (() => {
          const downloadBtn = Array.from(document.querySelectorAll('button')).find(
            btn => btn.textContent.includes('Download Model') || btn.textContent.includes('Download')
          );
          if (downloadBtn && !downloadBtn.disabled) {
            downloadBtn.click();
            return 'Download started';
          }
          return 'Download button not found or disabled';
        })();
      `);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Handler: Simulate offline mode
  ipcMain.handle('screenshot:simulate-offline', async () => {
    try {
      await mainWindow.webContents.executeJavaScript(`
        (() => {
          Object.defineProperty(navigator, 'onLine', { value: false, writable: true });
          window.dispatchEvent(new Event('offline'));
          return 'Offline mode simulated';
        })();
      `);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Handler: Execute /diagnose command
  ipcMain.handle('screenshot:execute-diagnose', async () => {
    try {
      await mainWindow.webContents.executeJavaScript(`
        (async () => {
          // Find input area
          const inputs = document.querySelectorAll('textarea, input[type="text"]');
          for (const input of inputs) {
            if (input.offsetParent !== null) { // Visible
              input.value = '/diagnose';
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              
              // Simulate Enter key
              const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
              });
              input.dispatchEvent(enterEvent);
              
              return 'Diagnose command sent';
            }
          }
          return 'Input not found';
        })();
      `);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Handler: Load model
  ipcMain.handle('screenshot:load-model', async () => {
    try {
      await mainWindow.webContents.executeJavaScript(`
        (() => {
          const loadBtn = Array.from(document.querySelectorAll('button')).find(
            btn => btn.textContent.includes('Load Model') || btn.textContent.includes('Load')
          );
          if (loadBtn && !loadBtn.disabled) {
            loadBtn.click();
            return 'Load model clicked';
          }
          return 'Load button not found or disabled';
        })();
      `);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  // Handler: Send test message
  ipcMain.handle('screenshot:send-message', async (message) => {
    try {
      await mainWindow.webContents.executeJavaScript(`
        ((msg) => {
          const inputs = document.querySelectorAll('textarea, input[type="text"]');
          for (const input of inputs) {
            if (input.offsetParent !== null) { // Visible
              input.value = msg;
              input.dispatchEvent(new Event('input', { bubbles: true }));
              input.dispatchEvent(new Event('change', { bubbles: true }));
              
              // Simulate Enter key
              const enterEvent = new KeyboardEvent('keydown', {
                key: 'Enter',
                code: 'Enter',
                keyCode: 13,
                which: 13,
                bubbles: true,
                cancelable: true
              });
              input.dispatchEvent(enterEvent);
              
              return 'Message sent';
            }
          }
          return 'Input not found';
        })('${message}');
      `);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  console.log('✅ Screenshot handlers registered');
}

module.exports = { registerScreenshotHandlers };
