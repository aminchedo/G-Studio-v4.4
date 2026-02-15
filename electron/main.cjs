const { app, BrowserWindow, session, ipcMain } = require('electron');
const path = require('path');
const { fileURLToPath } = require('url');
const fs = require('fs');

// Global error handlers - MUST be first to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('[FATAL] Uncaught Exception:', error);
  // Log but don't crash - allow app to continue
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
  // Log but don't crash - allow app to continue
});

const isDev = process.env.NODE_ENV === 'development';

// Vosk service (optional - only if installed)
let voskService = null;
let voskAvailable = false;

// Try to check if Vosk is available (optional dependency)
// Vosk requires: npm install vosk mic
try {
  require.resolve('vosk');
  require.resolve('mic');
  // Vosk packages are installed, but we'll load the service lazily when needed
  voskAvailable = true;
  console.log('[Main] ✅ Vosk packages detected (will load service when needed)');
} catch (error) {
  console.log('[Main] ⚠️ Vosk not installed (optional): Install with: npm install vosk mic');
  voskAvailable = false;
}

// Lazy load Vosk service
function getVoskService() {
  if (!voskAvailable) {
    return null;
  }
  
  if (!voskService) {
    try {
      const vosk = require('vosk');
      const mic = require('mic');
      const fs = require('fs');
      
      let recognitionProcess = null;
      let audioStream = null;
      let voskModel = null;
      
      voskService = {
        start: async (lang, callbacks) => {
          try {
            const modelsDir = path.join(__dirname, '../models');
            let modelPath;
            
            if (lang === 'fa-IR') {
              const smallModelPath042 = path.join(modelsDir, 'vosk-model-small-fa-0.42');
              const smallModelPath022 = path.join(modelsDir, 'vosk-model-small-fa-0.22');
              modelPath = fs.existsSync(smallModelPath042) ? smallModelPath042 : smallModelPath022;
            } else {
              modelPath = path.join(modelsDir, 'vosk-model-en-us-0.22');
            }
            
            if (!fs.existsSync(modelPath)) {
              throw new Error(`Vosk model not found at ${modelPath}. Please download the model first.`);
            }
            
            vosk.setLogLevel(0);
            voskModel = new vosk.Model(modelPath);
            const rec = new vosk.Recognizer({ model: voskModel, sampleRate: 16000 });
            
            const micInstance = mic({
              rate: '16000',
              channels: '1',
              debug: false,
              exitOnSilence: 6
            });
            
            audioStream = micInstance.getAudioStream();
            
            audioStream.on('data', (data) => {
              if (rec.acceptWaveform(data)) {
                const result = JSON.parse(rec.result());
                if (result.text && result.text.trim()) {
                  callbacks.onResult(result.text.trim());
                }
              }
            });
            
            audioStream.on('error', (err) => {
              callbacks.onError(`Vosk audio stream error: ${err.message}`);
            });
            
            audioStream.on('silence', () => {
              const finalResult = JSON.parse(rec.finalResult());
              if (finalResult.text && finalResult.text.trim()) {
                callbacks.onResult(finalResult.text.trim());
              }
            });
            
            micInstance.start();
            recognitionProcess = { mic: micInstance, recognizer: rec };
            
          } catch (error) {
            callbacks.onError(`Vosk error: ${error.message}`);
            throw error;
          }
        },
        stop: () => {
          try {
            if (recognitionProcess?.mic) {
              recognitionProcess.mic.stop();
            }
            if (recognitionProcess?.recognizer) {
              recognitionProcess.recognizer.free();
            }
            if (voskModel) {
              voskModel.free();
            }
          } catch (error) {
            console.error('[Main] Vosk stop error:', error);
          }
          recognitionProcess = null;
          audioStream = null;
          voskModel = null;
        },
        constructor: {
          isAvailable: () => voskAvailable
        }
      };
    } catch (error) {
      console.error('[Main] Error loading Vosk service:', error);
      voskAvailable = false;
      return null;
    }
  }
  
  return voskService;
}

// Enable Speech Recognition and Media features - CRITICAL FOR SPEECH RECOGNITION
// These flags MUST be set BEFORE app.whenReady()
app.commandLine.appendSwitch('enable-speech-dispatcher');
app.commandLine.appendSwitch('enable-speech-api');
app.commandLine.appendSwitch('enable-media-stream');
app.commandLine.appendSwitch('enable-features', 'AudioServiceOutOfProcess,SpeechRecognition');
app.commandLine.appendSwitch('enable-experimental-web-platform-features');
// Allow insecure content for localhost (needed for dev server)
if (isDev) {
  app.commandLine.appendSwitch('allow-running-insecure-content');
}

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    icon: path.join(__dirname, '../assets/icon.ico'),
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#2C2F33',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false,
      webSecurity: true,
      enableWebSQL: false,
      spellcheck: false,
    },
    show: false,
  });

  ipcMain.on('minimize-window', () => mainWindow && mainWindow.minimize());
  ipcMain.on('maximize-window', () => {
    if (mainWindow) {
      mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
    }
  });
  ipcMain.on('close-window', () => mainWindow && mainWindow.close());

  // Log network requests for debugging Web Speech API
  if (isDev) {
    session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
      if (details.url.includes('google') || details.url.includes('speech')) {
        console.log('[Main] 🌐 Network request:', details.method, details.url);
      }
      callback({});
    });
    
    session.defaultSession.webRequest.onCompleted((details) => {
      if (details.url.includes('google') || details.url.includes('speech')) {
        console.log('[Main] ✅ Request completed:', details.statusCode, details.url);
      }
    });
    
    session.defaultSession.webRequest.onErrorOccurred((details) => {
      if (details.url.includes('google') || details.url.includes('speech')) {
        console.error('[Main] ❌ Request error:', details.error, details.url);
      }
    });
  }

  // Set Content Security Policy
  // NOTE: Web Speech API requires 'unsafe-inline' and 'unsafe-eval' in dev mode for HMR
  // The API itself doesn't need these, but Vite's HMR does
  // CRITICAL: Web Speech API connects to Google servers, so we need to allow all Google domains
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const csp = isDev
      ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* ws://localhost:* data: blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: http://localhost:*; connect-src 'self' http://localhost:* ws://localhost:* https://*.google.com https://*.googleapis.com https://*.gstatic.com https://www.google.com https://speech.googleapis.com https://www.googleapis.com; media-src 'self' blob:;"
      : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob:; connect-src 'self' https://*.google.com https://*.googleapis.com https://*.gstatic.com https://www.google.com https://speech.googleapis.com https://www.googleapis.com; media-src 'self' blob:;";
    
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp]
      }
    });
  });

  // Suppress CSP warning and DevTools errors in development
  if (isDev) {
    mainWindow.webContents.on('console-message', (event) => {
      // New API: event is an object with message, level, source, etc.
      const message = event.message || '';
      const source = event.source || '';
      
      // Suppress CSP warning (expected in dev mode with unsafe-eval for HMR)
      if (message.includes('Content-Security-Policy') && message.includes('unsafe-eval')) {
        return;
      }
      
      // Suppress harmless DevTools protocol errors
      if (message.includes('Autofill.enable') || message.includes('Autofill.setAddresses')) {
        return;
      }
    });
  }

  // Load the app
  if (isDev) {
    // Development: Load from Vite dev server
    mainWindow.loadURL('http://localhost:3000');
    // Open DevTools in development
    mainWindow.webContents.openDevTools();
  } else {
    // Production: Load from built files
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Show window when ready to prevent visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    
    // Register screenshot handlers after window is ready
    try {
      const { registerScreenshotHandlers } = require('../scripts/screenshot-helper.cjs');
      registerScreenshotHandlers(mainWindow);
    } catch (error) {
      // Screenshot helper not critical, continue without it
    }
  });

  // Handle permission requests - CRITICAL for microphone access
  // This MUST be set BEFORE loading the URL
  mainWindow.webContents.session.setPermissionRequestHandler(
    (webContents, permission, callback, details) => {
      const allowedPermissions = [
        'media',
        'mediaKeySystem',
        'microphone',
        'audio-capture',
        'notifications',
      ];
      if (allowedPermissions.includes(permission)) {
        console.log(`[Main] ✅ Granting permission: ${permission}`, details);
        callback(true);
      } else {
        console.log(`[Main] ❌ Denying permission: ${permission}`);
        callback(false);
      }
    }
  );

  // Handle permission checks - CRITICAL for microphone access
  // This MUST be set BEFORE loading the URL
  mainWindow.webContents.session.setPermissionCheckHandler(
    (webContents, permission, requestingOrigin, details) => {
      const allowedPermissions = ['media', 'microphone', 'audio-capture'];
      if (allowedPermissions.includes(permission)) {
        console.log(`[Main] ✅ Permission check passed: ${permission} for ${requestingOrigin}`);
        return true;
      }
      console.log(`[Main] ❌ Permission check failed: ${permission}`);
      return false;
    }
  );
  
  // Request microphone permission proactively when window loads
  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Main] ✅ Window loaded, requesting microphone permission...');
    // Request permission by accessing getUserMedia
    mainWindow.webContents.executeJavaScript(`
      (async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          console.log('[Renderer] ✅ Microphone permission granted');
          stream.getTracks().forEach(track => track.stop());
        } catch (err) {
          console.error('[Renderer] ❌ Microphone permission error:', err.message);
        }
      })();
    `).catch(err => {
      console.error('[Main] Error requesting microphone permission:', err);
    });
  });
  

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App event handlers
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
  });
});

// Vosk IPC Handlers (only if Vosk is available)
if (voskAvailable) {
  // Check Vosk availability
  ipcMain.handle('vosk:check-availability', async () => {
    try {
      return { available: voskAvailable };
    } catch (error) {
      console.error('[Main] Vosk availability check error:', error);
      return { available: false };
    }
  });

  // Check if model exists
  ipcMain.handle('vosk:check-model', async (event, lang) => {
    try {
      const modelsDir = path.join(__dirname, '../models');
      let modelPath;
      
      if (lang === 'fa-IR') {
        const smallModelPath042 = path.join(modelsDir, 'vosk-model-small-fa-0.42');
        const smallModelPath022 = path.join(modelsDir, 'vosk-model-small-fa-0.22');
        modelPath = fs.existsSync(smallModelPath042) ? smallModelPath042 : smallModelPath022;
      } else {
        modelPath = path.join(modelsDir, 'vosk-model-en-us-0.22');
      }
      
      const exists = fs.existsSync(modelPath);
      return { exists };
    } catch (error) {
      console.error('[Main] Vosk model check error:', error);
      return { exists: false };
    }
  });

  // Start Vosk recognition
  ipcMain.handle('vosk:start', async (event, lang) => {
    try {
      if (!mainWindow) {
        return { success: false, error: 'Main window not available' };
      }

      const service = getVoskService();
      if (!service) {
        return { success: false, error: 'Vosk service not available. Please install: npm install vosk mic' };
      }

      // Start recognition and send results via IPC
      await service.start(lang, {
        onResult: (text) => {
          mainWindow.webContents.send('vosk:result', text);
        },
        onError: (error) => {
          mainWindow.webContents.send('vosk:error', error);
        },
        onEnd: () => {
          mainWindow.webContents.send('vosk:stopped');
        }
      });

      mainWindow.webContents.send('vosk:started');
      return { success: true };
    } catch (error) {
      console.error('[Main] Vosk start error:', error);
      return { success: false, error: error.message };
    }
  });

  // Stop Vosk recognition
  ipcMain.handle('vosk:stop', async () => {
    try {
      const service = getVoskService();
      if (service) {
        service.stop();
      }
    } catch (error) {
      console.error('[Main] Vosk stop error:', error);
    }
  });
} else {
  // Vosk not available - return false for all handlers
  ipcMain.handle('vosk:check-availability', async () => {
    return { available: false };
  });

  ipcMain.handle('vosk:check-model', async () => {
    return { exists: false };
  });

  ipcMain.handle('vosk:start', async () => {
    return { success: false, error: 'Vosk is not installed. Please install vosk and mic packages: npm install vosk mic' };
  });

  ipcMain.handle('vosk:stop', async () => {
    // No-op
  });
}

// ==================== SCREENSHOT HELPERS ====================

// Register screenshot handlers if helper is available
try {
  const { registerScreenshotHandlers } = require('../scripts/screenshot-helper.cjs');
  // Will be registered after window is created
  console.log('[Main] ✅ Screenshot helper available');
} catch (error) {
  console.log('[Main] ⚠️ Screenshot helper not available:', error.message);
}

// ==================== CONTEXT DATABASE IPC HANDLERS ====================

// Initialize context database service
let contextDbService = null;

try {
  const { getInstance } = require('./services/contextDatabaseService.cjs');
  contextDbService = getInstance();
  console.log('[Main] ✅ Context Database Service available');
} catch (error) {
  console.log('[Main] ⚠️ Context Database Service not available:', error.message);
}

// Context database handlers
if (contextDbService) {
  ipcMain.handle('context-db:init', async () => {
    try {
      return contextDbService.init();
    } catch (error) {
      console.error('[Main] Context DB init error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('context-db:create-session', async (event, mode, activeModel) => {
    try {
      return contextDbService.createSession(mode, activeModel);
    } catch (error) {
      console.error('[Main] Context DB create session error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('context-db:get-current-session', async () => {
    try {
      return { success: true, sessionId: contextDbService.getCurrentSession() };
    } catch (error) {
      console.error('[Main] Context DB get current session error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('context-db:add-entry', async (event, sessionId, entry) => {
    try {
      return contextDbService.addEntry(sessionId, entry);
    } catch (error) {
      console.error('[Main] Context DB add entry error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('context-db:get-context', async (event, sessionId, query, limit) => {
    try {
      return contextDbService.getRelevantContext(sessionId, query, limit);
    } catch (error) {
      console.error('[Main] Context DB get context error:', error);
      return { success: false, error: error.message, entries: [] };
    }
  });

  ipcMain.handle('context-db:create-summary', async (event, sessionId, summary) => {
    try {
      return contextDbService.createSummary(sessionId, summary);
    } catch (error) {
      console.error('[Main] Context DB create summary error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('context-db:get-summaries', async (event, sessionId) => {
    try {
      return contextDbService.getSummaries(sessionId);
    } catch (error) {
      console.error('[Main] Context DB get summaries error:', error);
      return { success: false, error: error.message, summaries: [] };
    }
  });

  ipcMain.handle('context-db:get-context-size', async (event, sessionId) => {
    try {
      return contextDbService.getContextSize(sessionId);
    } catch (error) {
      console.error('[Main] Context DB get context size error:', error);
      return { success: false, totalTokens: 0, entryCount: 0 };
    }
  });

  ipcMain.handle('context-db:trim-context', async (event, sessionId, targetTokens) => {
    try {
      return contextDbService.trimContext(sessionId, targetTokens);
    } catch (error) {
      console.error('[Main] Context DB trim context error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('context-db:record-lineage', async (event, sessionId, lineage) => {
    try {
      return contextDbService.recordLineage(sessionId, lineage);
    } catch (error) {
      console.error('[Main] Context DB record lineage error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('context-db:get-lineage', async (event, responseId) => {
    try {
      return contextDbService.getLineage(responseId);
    } catch (error) {
      console.error('[Main] Context DB get lineage error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('context-db:record-productivity-metric', async (event, metric) => {
    try {
      return contextDbService.recordProductivityMetric(metric);
    } catch (error) {
      console.error('[Main] Context DB record productivity metric error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('context-db:get-productivity-metrics', async (event, metricType, taskType, limit, taskId) => {
    try {
      return contextDbService.getProductivityMetrics(metricType, taskType, limit, taskId);
    } catch (error) {
      console.error('[Main] Context DB get productivity metrics error:', error);
      return { success: false, error: error.message, metrics: [] };
    }
  });

  ipcMain.handle('context-db:record-decomposition-plan', async (event, plan) => {
    try {
      return contextDbService.recordDecompositionPlan(plan);
    } catch (error) {
      console.error('[Main] Context DB record decomposition plan error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('context-db:get-decomposition-plan', async (event, taskId) => {
    try {
      return contextDbService.getDecompositionPlan(taskId);
    } catch (error) {
      console.error('[Main] Context DB get decomposition plan error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('context-db:record-planning-feedback', async (event, feedback) => {
    try {
      return contextDbService.recordPlanningFeedback(feedback);
    } catch (error) {
      console.error('[Main] Context DB record planning feedback error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('context-db:get-planning-feedback', async (event, taskType, limit) => {
    try {
      return contextDbService.getPlanningFeedback(taskType, limit);
    } catch (error) {
      console.error('[Main] Context DB get planning feedback error:', error);
      return { success: false, error: error.message, feedbacks: [] };
    }
  });
} else {
  // Fallback handlers when context DB is not available
  ipcMain.handle('context-db:init', async () => {
    return { success: false, error: 'Context database service not available' };
  });
  ipcMain.handle('context-db:create-session', async () => {
    return { success: false, error: 'Context database service not available' };
  });
  ipcMain.handle('context-db:get-current-session', async () => {
    return { success: false, error: 'Context database service not available' };
  });
  ipcMain.handle('context-db:add-entry', async () => {
    return { success: false, error: 'Context database service not available' };
  });
  ipcMain.handle('context-db:get-context', async () => {
    return { success: false, error: 'Context database service not available', entries: [] };
  });
  ipcMain.handle('context-db:create-summary', async () => {
    return { success: false, error: 'Context database service not available' };
  });
  ipcMain.handle('context-db:get-summaries', async () => {
    return { success: false, error: 'Context database service not available', summaries: [] };
  });
  ipcMain.handle('context-db:get-context-size', async () => {
    return { success: false, totalTokens: 0, entryCount: 0 };
  });
  ipcMain.handle('context-db:trim-context', async () => {
    return { success: false, error: 'Context database service not available' };
  });
  ipcMain.handle('context-db:record-lineage', async () => {
    return { success: false, error: 'Context database service not available' };
  });
  ipcMain.handle('context-db:get-lineage', async () => {
    return { success: false, error: 'Context database service not available' };
  });
  ipcMain.handle('context-db:record-productivity-metric', async () => {
    return { success: false, error: 'Context database service not available' };
  });
  ipcMain.handle('context-db:get-productivity-metrics', async () => {
    return { success: false, error: 'Context database service not available', metrics: [] };
  });
  ipcMain.handle('context-db:record-decomposition-plan', async () => {
    return { success: false, error: 'Context database service not available' };
  });
  ipcMain.handle('context-db:get-decomposition-plan', async () => {
    return { success: false, error: 'Context database service not available' };
  });
  ipcMain.handle('context-db:record-planning-feedback', async () => {
    return { success: false, error: 'Context database service not available' };
  });
  ipcMain.handle('context-db:get-planning-feedback', async () => {
    return { success: false, error: 'Context database service not available', feedbacks: [] };
  });
}

// ==================== LOCAL AI FILE OPERATIONS IPC HANDLERS ====================

// File handles for download operations
const fileHandles = new Map();

// Get user data directory
ipcMain.handle('local-ai:get-user-data-dir', async () => {
  try {
    const userDataPath = app.getPath('userData');
    // Return the parent directory (g-studio) instead of the full app userData path
    const gStudioPath = path.join(userDataPath, '..', 'g-studio');
    return { path: gStudioPath };
  } catch (error) {
    console.error('[Main] Get user data dir error:', error);
    // Fallback to APPDATA on Windows
    const fallbackPath = process.platform === 'win32' 
      ? path.join(process.env.APPDATA || '', 'g-studio')
      : path.join(process.env.HOME || '', '.g-studio');
    return { path: fallbackPath };
  }
});

ipcMain.handle('local-ai:check-model', async (event, modelPath) => {
  try {
    const exists = fs.existsSync(modelPath);
    return { exists };
  } catch (error) {
    console.error('[Main] Check model error:', error);
    return { exists: false };
  }
});

ipcMain.handle('local-ai:ensure-dir', async (event, dirPath) => {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
    return { success: true };
  } catch (error) {
    console.error('[Main] Ensure dir error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('local-ai:get-file-size', async (event, filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      return { size: stats.size };
    }
    return { size: 0 };
  } catch (error) {
    console.error('[Main] Get file size error:', error);
    return { size: 0 };
  }
});

ipcMain.handle('local-ai:open-file', async (event, filePath, mode) => {
  try {
    const handleId = `handle_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const flags = mode === 'append' ? 'a' : 'w';
    const fd = fs.openSync(filePath, flags);
    fileHandles.set(handleId, fd);
    return { success: true, handleId };
  } catch (error) {
    console.error('[Main] Open file error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('local-ai:write-chunk', async (event, handleId, chunk) => {
  try {
    const fd = fileHandles.get(handleId);
    if (!fd) {
      return { success: false, error: 'Invalid file handle' };
    }
    const buffer = Buffer.from(chunk);
    fs.writeSync(fd, buffer);
    return { success: true };
  } catch (error) {
    console.error('[Main] Write chunk error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('local-ai:close-file', async (event, handleId) => {
  try {
    const fd = fileHandles.get(handleId);
    if (fd) {
      fs.closeSync(fd);
      fileHandles.delete(handleId);
    }
    return { success: true };
  } catch (error) {
    console.error('[Main] Close file error:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('local-ai:compute-sha256', async (event, filePath) => {
  try {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    const fileStream = fs.createReadStream(filePath);
    
    return new Promise((resolve, reject) => {
      fileStream.on('data', (chunk) => hash.update(chunk));
      fileStream.on('end', () => {
        const sha256 = hash.digest('hex');
        resolve({ success: true, hash: sha256 });
      });
      fileStream.on('error', (error) => {
        reject({ success: false, error: error.message });
      });
    });
  } catch (error) {
    console.error('[Main] Compute SHA-256 error:', error);
    return { success: false, error: error.message };
  }
});

// Cleanup file handles on app quit
app.on('before-quit', () => {
  for (const [handleId, fd] of fileHandles.entries()) {
    try {
      fs.closeSync(fd);
    } catch (error) {
      console.error('[Main] Error closing file handle:', error);
    }
  }
  fileHandles.clear();
  
  // Close context database
  if (contextDbService) {
    contextDbService.close();
  }
});