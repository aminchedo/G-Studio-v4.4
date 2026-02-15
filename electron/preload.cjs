const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal API to the renderer process
contextBridge.exposeInMainWorld('speechAPI', {
  electronSupported: true
});

// Expose Vosk API for offline speech recognition
// Vosk runs in Main Process and communicates via IPC
contextBridge.exposeInMainWorld('voskAPI', {
  // Check if Vosk is available
  checkAvailability: async () => {
    try {
      const result = await ipcRenderer.invoke('vosk:check-availability');
      return result;
    } catch (error) {
      console.error('[Preload] Vosk availability check error:', error);
      return { available: false };
    }
  },
  
  // Check if model exists
  checkModel: async (lang) => {
    try {
      const result = await ipcRenderer.invoke('vosk:check-model', lang);
      return result;
    } catch (error) {
      console.error('[Preload] Vosk model check error:', error);
      return { exists: false };
    }
  },
  
  // Start recognition
  start: async (lang) => {
    try {
      const result = await ipcRenderer.invoke('vosk:start', lang);
      return result;
    } catch (error) {
      console.error('[Preload] Vosk start error:', error);
      return { success: false, error: error.message };
    }
  },
  
  // Stop recognition
  stop: async () => {
    try {
      await ipcRenderer.invoke('vosk:stop');
    } catch (error) {
      console.error('[Preload] Vosk stop error:', error);
    }
  },
  
  // Event listeners
  onResult: (callback) => {
    ipcRenderer.on('vosk:result', (event, text) => callback(text));
  },
  
  onError: (callback) => {
    ipcRenderer.on('vosk:error', (event, error) => callback(error));
  },
  
  onStarted: (callback) => {
    ipcRenderer.on('vosk:started', () => callback());
  },
  
  onStopped: (callback) => {
    ipcRenderer.on('vosk:stopped', () => callback());
  },
  
  // Remove all listeners
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});

// Expose Electron APIs for Local AI, Context Database, and window controls
contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
    on: (channel, callback) => ipcRenderer.on(channel, callback),
    removeAllListeners: (channel) => ipcRenderer.removeAllListeners(channel),
  },
  minimize: () => ipcRenderer.send('minimize-window'),
  maximize: () => ipcRenderer.send('maximize-window'),
  close: () => ipcRenderer.send('close-window'),
  safeStorage: {
    encryptString: (text) => {
      // This would use Electron's safeStorage API if available
      // For now, return as-is (will be handled in main process if needed)
      return text;
    },
    decryptString: (encrypted) => {
      return encrypted;
    },
  },
});

console.log('[Preload] Speech API, Vosk API, and Electron bridge initialized');
