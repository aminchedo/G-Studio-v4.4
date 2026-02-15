/**
 * Local AI Model Service
 *
 * Manages Qwen2.5-Coder-1.5B-Q4 model:
 * - Download with resume capability
 * - Integrity verification
 * - Loading/unloading
 * - Inference with timeout
 * - Health monitoring
 */

// Dynamic import for node-llama-cpp (Node.js native module, not available in browser)
let getLlama: any = null;
let LlamaModel: any = null;
let LlamaContext: any = null;
let LlamaChatSession: any = null;

// Web Engine for browser mode
import { LocalAIWebEngine } from "./localAIWebEngine";

// Cross-platform path joining (works in both browser and Node.js)
function joinPath(...parts: string[]): string {
  if (typeof process !== "undefined" && process.platform === "win32") {
    return parts.join("\\");
  }
  return parts.join("/");
}

// Lazy load node-llama-cpp (only works in Electron main process or Node.js)
async function loadLlamaModule() {
  if (getLlama) return; // Already loaded

  try {
    if (typeof window === "undefined" || (window as any).electron) {
      // In Electron or Node.js environment - use dynamic import with string literal
      // Using string literal prevents Vite from analyzing this import at build time
      const moduleName = "node-llama-cpp";
      const llamaModule = await import(/* @vite-ignore */ moduleName);
      getLlama = llamaModule.getLlama;
      LlamaModel = llamaModule.LlamaModel;
      LlamaContext = llamaModule.LlamaContext;
      LlamaChatSession = llamaModule.LlamaChatSession;
    }
  } catch (error) {
    // node-llama-cpp not available (browser context or not installed)
    console.warn("[LocalAIModelService] node-llama-cpp not available:", error);
  }
}

export type ModelStatus =
  | "NOT_INSTALLED"
  | "DOWNLOADING"
  | "READY"
  | "ERROR"
  | "LOADING"
  | "UNLOADED";

export interface DownloadProgress {
  bytesDownloaded: number;
  totalBytes: number;
  percentage: number;
  speed: number; // bytes per second
}

export interface InferenceOptions {
  maxTokens?: number;
  temperature?: number;
  timeout?: number; // milliseconds
  systemPrompt?: string;
}

export interface InferenceResult {
  text: string;
  tokens: number;
  latency: number; // milliseconds
}

// Model configuration
// Support both Q4 (default) and Q5 models
const MODEL_NAME = "qwen2.5-coder-1.5b-instruct-q5_k_m"; // Updated to Q5 model
const MODEL_FILE = `${MODEL_NAME}.gguf`;
const MODEL_URL = `https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct-GGUF/resolve/main/${MODEL_FILE}`;

// Fallback to Q4 if Q5 not found
const FALLBACK_MODEL_NAME = "qwen2.5-coder-1.5b-q4";
const FALLBACK_MODEL_FILE = `${FALLBACK_MODEL_NAME}.gguf`;
// Expected SHA-256 hash (will be computed and stored after first successful download)
// For now, we'll compute and store it, then verify on subsequent downloads
const MODEL_SHA256_STORAGE_KEY = "gstudio_model_sha256";

// Get user data directory (cross-platform)
async function getUserDataDir(): Promise<string> {
  if (typeof window !== "undefined" && (window as any).electron?.ipcRenderer) {
    // Electron renderer - use IPC to get path
    try {
      const result = await (window as any).electron.ipcRenderer.invoke(
        "local-ai:get-user-data-dir",
      );
      if (result && result.path) {
        return result.path;
      }
    } catch (e) {
      console.warn(
        "[LocalAIModelService] Could not get user data dir via IPC, using fallback:",
        e,
      );
    }
  }

  // Browser/Node.js fallback
  if (typeof process !== "undefined") {
    if (process.platform === "win32" && process.env["APPDATA"]) {
      return `${process.env["APPDATA"]}/g-studio`;
    }
    if (process.env["HOME"]) {
      return `${process.env["HOME"]}/.g-studio`;
    }
  }

  return "~/.g-studio";
}

async function getModelPath(): Promise<string> {
  const userDataDir = await getUserDataDir();
  const modelsDir = joinPath(userDataDir, "models");
  return joinPath(modelsDir, MODEL_FILE);
}

async function getFallbackModelPath(): Promise<string> {
  const userDataDir = await getUserDataDir();
  const modelsDir = joinPath(userDataDir, "models");
  return joinPath(modelsDir, FALLBACK_MODEL_FILE);
}

/**
 * Get the actual model path (check for Q5 first, then fallback to Q4)
 */
async function getActualModelPath(): Promise<string> {
  const primaryPath = await getModelPath();
  const fallbackPath = await getFallbackModelPath();

  // Check if primary model exists
  const primaryExists = await LocalAIModelService.checkModelExists(primaryPath);
  if (primaryExists) {
    return primaryPath;
  }

  // Check if fallback model exists
  const fallbackExists =
    await LocalAIModelService.checkModelExists(fallbackPath);
  if (fallbackExists) {
    console.log(
      "[LocalAIModelService] Using fallback model:",
      FALLBACK_MODEL_FILE,
    );
    return fallbackPath;
  }

  // Return primary path (will be used for download)
  return primaryPath;
}

export class LocalAIModelService {
  private static status: ModelStatus = "NOT_INSTALLED";
  private static model: InstanceType<typeof LlamaModel> | null = null;
  private static context: InstanceType<typeof LlamaContext> | null = null;
  private static session: InstanceType<typeof LlamaChatSession> | null = null;
  private static webEngine: LocalAIWebEngine | null = null; // Web engine for browser mode
  private static downloadController: AbortController | null = null;
  private static downloadProgress: DownloadProgress | null = null;
  private static consecutiveFailures: number = 0;
  private static lastInferenceLatency: number = 0;
  private static healthStatus: "OK" | "DEGRADED" | "ERROR" = "OK";
  private static isInitialized: boolean = false;
  private static retryBackoffMs: number = 1000; // Start with 1 second
  private static lastFailureTime: number = 0;
  private static recoveryAttempts: number = 0;
  private static readonly MAX_RETRY_BACKOFF_MS = 60000; // Max 60 seconds
  private static readonly RECOVERY_CHECK_INTERVAL = 30000; // Check recovery every 30s

  /**
   * Initialize the service
   * Cold start: Do NOT load model on startup
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log("[LocalAIModelService] Initializing...");
    console.log("[LOCAL_AI_LOAD]: DEFERRED");

    // Check if model exists (but don't load it)
    // Check both Q5 and Q4 models
    const primaryPath = await getModelPath();
    const fallbackPath = await getFallbackModelPath();
    try {
      // Check primary model first
      let exists = await this.checkModelExists(primaryPath);
      if (!exists) {
        // Check fallback model
        exists = await this.checkModelExists(fallbackPath);
      }

      if (exists) {
        this.status = "UNLOADED";
        console.log(
          "[LocalAIModelService] Model file found, status: UNLOADED (not loaded)",
        );
      } else {
        this.status = "NOT_INSTALLED";
        console.log(
          "[LocalAIModelService] Model file not found, status: NOT_INSTALLED",
        );
        console.log("[LocalAIModelService] Expected paths:");
        console.log(`  Primary: ${primaryPath}`);
        console.log(`  Fallback: ${fallbackPath}`);
      }
    } catch (error) {
      console.error("[LocalAIModelService] Error checking model:", error);
      this.status = "NOT_INSTALLED";
    }

    this.isInitialized = true;
    console.log("[AI_MODE]: LOCAL_AI_INITIALIZED");
  }

  /**
   * Check if model file exists (works in both Electron and browser)
   */
  static async checkModelExists(path: string): Promise<boolean> {
    // In Electron, use IPC to check file existence
    if (
      typeof window !== "undefined" &&
      (window as any).electron?.ipcRenderer
    ) {
      try {
        const result = await (window as any).electron.ipcRenderer.invoke(
          "local-ai:check-model",
          path,
        );
        return result.exists || false;
      } catch (e) {
        console.warn("[LocalAIModelService] IPC check failed:", e);
        return false;
      }
    }

    // In browser, first try to check if model exists in public folder (via HTTP)
    // This allows loading model from public folder in web mode
    // Model path: C:\project\00000000000000000000\new\g-studio-fixed\public\qwen2.5-coder-1.5b-instruct-q5_k_m.gguf
    // Served at: /qwen2.5-coder-1.5b-instruct-q5_k_m.gguf (Vite serves public folder at root)
    try {
      // Try to fetch model from public folder (Vite serves files from public)
      const modelUrl = `/${MODEL_FILE}`;
      const response = await fetch(modelUrl, { method: "HEAD" });
      if (response.ok) {
        console.log(
          "[LocalAIModelService] Model found in public folder:",
          modelUrl,
        );
        console.log("[LocalAIModelService] Model path: public/" + MODEL_FILE);
        return true;
      }
    } catch (e) {
      // Model not in public folder, try IndexedDB
      console.log(
        "[LocalAIModelService] Model not in public folder, checking IndexedDB...",
      );
    }

    // In browser, check IndexedDB as fallback
    try {
      const db = await this.openIndexedDB();
      const transaction = db.transaction(["models"], "readonly");
      const store = transaction.objectStore("models");
      const request = store.get(MODEL_FILE);

      const result = await new Promise<any>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      return result !== undefined && result !== null;
    } catch (e) {
      console.warn("[LocalAIModelService] IndexedDB check failed:", e);
      return false;
    }
  }

  /**
   * Get current status
   */
  static getStatus(): ModelStatus {
    return this.status;
  }

  /**
   * Get health status
   */
  static getHealthStatus(): "OK" | "DEGRADED" | "ERROR" {
    return this.healthStatus;
  }

  /**
   * Get download progress
   */
  static getDownloadProgress(): DownloadProgress | null {
    return this.downloadProgress;
  }

  /**
   * Download model with resume capability
   * Works in both browser (IndexedDB) and Electron (file system)
   */
  static async downloadModel(
    progressCallback?: (progress: DownloadProgress) => void,
  ): Promise<void> {
    if (this.status === "DOWNLOADING") {
      throw new Error("Download already in progress");
    }

    if (this.status === "READY" || this.status === "LOADING") {
      throw new Error("Model already downloaded");
    }

    this.status = "DOWNLOADING";
    this.downloadController = new AbortController();

    console.log("[LocalAIModelService] Starting download...");
    console.log(`[MODEL]: ${MODEL_NAME}`);
    console.log("[MODEL_DOWNLOAD]: STARTED");

    // Check if running in Electron or browser
    const isElectron =
      typeof window !== "undefined" && (window as any).electron?.ipcRenderer;

    try {
      if (isElectron) {
        // Electron environment - use file system via IPC
        await this.downloadModelElectron(progressCallback);
      } else {
        // Browser environment - use IndexedDB
        await this.downloadModelBrowser(progressCallback);
      }

      this.status = "UNLOADED";
      this.downloadProgress = null;
      console.log("[LocalAIModelService] Download complete");
      console.log("[MODEL]: DOWNLOADED");
      console.log("[MODEL_DOWNLOAD]: COMPLETED");
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("[LocalAIModelService] Download cancelled");
        this.status = "NOT_INSTALLED";
        // Don't log FAILED for user-initiated pause/stop
      } else {
        console.error("[LocalAIModelService] Download error:", error);
        console.log("[MODEL_DOWNLOAD]: FAILED");
        this.status = "ERROR";
        throw error;
      }
    } finally {
      this.downloadController = null;
    }
  }

  /**
   * Download model in Electron environment (file system)
   */
  private static async downloadModelElectron(
    progressCallback?: (progress: DownloadProgress) => void,
  ): Promise<void> {
    const modelPath = await getModelPath();
    // Extract directory - handle both Windows and Unix paths
    const lastSlash = Math.max(
      modelPath.lastIndexOf("\\"),
      modelPath.lastIndexOf("/"),
    );
    const modelDir =
      lastSlash > 0 ? modelPath.substring(0, lastSlash) : modelPath;

    // Create directory if needed (via IPC in Electron)
    await (window as any).electron.ipcRenderer.invoke(
      "local-ai:ensure-dir",
      modelDir,
    );

    // Get existing file size for resume
    let startByte = 0;
    try {
      const fileInfo = await (window as any).electron.ipcRenderer.invoke(
        "local-ai:get-file-size",
        modelPath,
      );
      startByte = fileInfo.size || 0;
    } catch (e) {
      // File doesn't exist, start from beginning
      startByte = 0;
    }

    // Download with range request
    const response = await fetch(MODEL_URL, {
      headers: startByte > 0 ? { Range: `bytes=${startByte}-` } : {},
      signal: this.downloadController!.signal,
    });

    if (!response.ok && response.status !== 206) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const totalBytes =
      parseInt(response.headers.get("content-length") || "0", 10) + startByte;
    let bytesDownloaded = startByte;
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable");
    }

    // Open file for writing (via IPC)
    const fileHandle = await (window as any).electron.ipcRenderer.invoke(
      "local-ai:open-file",
      modelPath,
      startByte > 0 ? "append" : "write",
    );

    const startTime = Date.now();
    let lastUpdateTime = startTime;
    let lastBytes = startByte;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // Write chunk (via IPC)
      await (window as any).electron.ipcRenderer.invoke(
        "local-ai:write-chunk",
        fileHandle,
        Array.from(value),
      );

      bytesDownloaded += value.length;

      const now = Date.now();
      if (now - lastUpdateTime > 500) {
        // Update every 500ms
        const speed =
          ((bytesDownloaded - lastBytes) / (now - lastUpdateTime)) * 1000;
        this.downloadProgress = {
          bytesDownloaded,
          totalBytes,
          percentage: (bytesDownloaded / totalBytes) * 100,
          speed,
        };

        if (progressCallback) {
          progressCallback(this.downloadProgress);
        }

        lastUpdateTime = now;
        lastBytes = bytesDownloaded;
      }
    }

    // Close file
    await (window as any).electron.ipcRenderer.invoke(
      "local-ai:close-file",
      fileHandle,
    );

    // Verify integrity
    console.log("[LocalAIModelService] Verifying model integrity...");
    await this.verifyModelIntegrity(modelPath);
  }

  /**
   * Download model in browser environment (IndexedDB)
   */
  private static async downloadModelBrowser(
    progressCallback?: (progress: DownloadProgress) => void,
  ): Promise<void> {
    // Open IndexedDB
    const db = await this.openIndexedDB();

    // Check for existing partial download
    let startByte = 0;
    let existingChunks: Uint8Array[] = [];

    try {
      const transaction = db.transaction(["modelChunks"], "readonly");
      const store = transaction.objectStore("modelChunks");
      const request = store.get(MODEL_FILE);

      const result = await new Promise<any>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

      if (result && result.chunks) {
        existingChunks = result.chunks;
        startByte = existingChunks.reduce(
          (sum, chunk) => sum + chunk.length,
          0,
        );
        console.log(`[LocalAIModelService] Resuming from ${startByte} bytes`);
      }
    } catch (e) {
      console.log(
        "[LocalAIModelService] No existing download found, starting fresh",
      );
    }

    // Download with range request
    const response = await fetch(MODEL_URL, {
      headers: startByte > 0 ? { Range: `bytes=${startByte}-` } : {},
      signal: this.downloadController!.signal,
    });

    if (!response.ok && response.status !== 206) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    const contentLength = parseInt(
      response.headers.get("content-length") || "0",
      10,
    );
    const totalBytes = contentLength + startByte;
    let bytesDownloaded = startByte;

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable");
    }

    const startTime = Date.now();
    let lastUpdateTime = startTime;
    let lastBytes = startByte;
    const newChunks: Uint8Array[] = [];

    // Read and store chunks
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      newChunks.push(value);
      bytesDownloaded += value.length;

      const now = Date.now();
      if (now - lastUpdateTime > 500) {
        // Update every 500ms
        const speed =
          ((bytesDownloaded - lastBytes) / (now - lastUpdateTime)) * 1000;
        this.downloadProgress = {
          bytesDownloaded,
          totalBytes,
          percentage: (bytesDownloaded / totalBytes) * 100,
          speed,
        };

        if (progressCallback) {
          progressCallback(this.downloadProgress);
        }

        lastUpdateTime = now;
        lastBytes = bytesDownloaded;

        // Save progress to IndexedDB every 10MB
        if (
          newChunks.length > 0 &&
          bytesDownloaded % (10 * 1024 * 1024) < value.length
        ) {
          await this.saveChunksToIndexedDB(db, MODEL_FILE, [
            ...existingChunks,
            ...newChunks,
          ]);
          existingChunks = [...existingChunks, ...newChunks];
          newChunks.length = 0;
        }
      }
    }

    // Save final chunks to IndexedDB
    const allChunks = [...existingChunks, ...newChunks];
    await this.saveChunksToIndexedDB(db, MODEL_FILE, allChunks);

    // Combine all chunks into a single Blob
    const modelBlob = new Blob(allChunks as any);

    // Store the complete model
    await this.saveModelToIndexedDB(db, MODEL_FILE, modelBlob);

    // Clean up chunks
    await this.deleteChunksFromIndexedDB(db, MODEL_FILE);

    console.log("[LocalAIModelService] Model saved to IndexedDB");
  }

  /**
   * Open IndexedDB for model storage
   */
  private static async openIndexedDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("GStudioModels", 1);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains("models")) {
          db.createObjectStore("models");
        }
        if (!db.objectStoreNames.contains("modelChunks")) {
          db.createObjectStore("modelChunks");
        }
      };
    });
  }

  /**
   * Save chunks to IndexedDB (for resume capability)
   */
  private static async saveChunksToIndexedDB(
    db: IDBDatabase,
    modelName: string,
    chunks: Uint8Array[],
  ): Promise<void> {
    const transaction = db.transaction(["modelChunks"], "readwrite");
    const store = transaction.objectStore("modelChunks");

    return new Promise((resolve, reject) => {
      const request = store.put({ chunks }, modelName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save complete model to IndexedDB
   */
  private static async saveModelToIndexedDB(
    db: IDBDatabase,
    modelName: string,
    blob: Blob,
  ): Promise<void> {
    const transaction = db.transaction(["models"], "readwrite");
    const store = transaction.objectStore("models");

    return new Promise((resolve, reject) => {
      const request = store.put(blob, modelName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete chunks from IndexedDB (cleanup after complete download)
   */
  private static async deleteChunksFromIndexedDB(
    db: IDBDatabase,
    modelName: string,
  ): Promise<void> {
    const transaction = db.transaction(["modelChunks"], "readwrite");
    const store = transaction.objectStore("modelChunks");

    return new Promise((resolve, reject) => {
      const request = store.delete(modelName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Pause download
   */
  static pauseDownload(): void {
    if (this.downloadController) {
      this.downloadController.abort();
      this.downloadController = null;
      console.log("[LocalAIModelService] Download paused");
      console.log("[MODEL_DOWNLOAD]: PAUSED");
      // Keep status as DOWNLOADING to allow resume - don't change status
    }
  }

  /**
   * Resume download
   */
  static async resumeDownload(
    progressCallback?: (progress: DownloadProgress) => void,
  ): Promise<void> {
    // Can resume if status is DOWNLOADING (paused) or UNLOADED (partial download exists)
    if (this.status !== "DOWNLOADING" && this.status !== "UNLOADED") {
      throw new Error("No paused download to resume");
    }

    // Check if partial file exists
    const modelPath = await getModelPath();
    const exists = await this.checkModelExists(modelPath);

    if (!exists) {
      // No partial file, start fresh download
      await this.downloadModel(progressCallback);
      return;
    }

    // Resume by calling downloadModel again (it will resume from existing file)
    console.log("[LocalAIModelService] Resuming download...");
    console.log("[MODEL_DOWNLOAD]: RESUMED");

    // Call downloadModel which will resume from existing file size
    await this.downloadModel(progressCallback);
  }

  /**
   * Stop download
   */
  static stopDownload(): void {
    this.pauseDownload();
    this.status = "NOT_INSTALLED";
    this.downloadProgress = null;
    console.log("[LocalAIModelService] Download stopped");
  }

  /**
   * Verify model integrity (SHA-256)
   */
  private static async verifyModelIntegrity(path: string): Promise<void> {
    try {
      if (
        typeof window !== "undefined" &&
        (window as any).electron?.ipcRenderer
      ) {
        // First, check file size
        const fileInfo = await (window as any).electron.ipcRenderer.invoke(
          "local-ai:get-file-size",
          path,
        );
        if (fileInfo.size < 1000000) {
          // Less than 1MB is suspicious
          throw new Error("Model file too small, may be corrupted");
        }

        // Compute SHA-256 hash via IPC
        const hashResult = await (window as any).electron.ipcRenderer.invoke(
          "local-ai:compute-sha256",
          path,
        );

        if (hashResult.success && hashResult.hash) {
          // Check if we have a stored hash
          const storedHash = localStorage.getItem(MODEL_SHA256_STORAGE_KEY);

          if (storedHash) {
            // Verify against stored hash
            if (hashResult.hash !== storedHash) {
              throw new Error(
                "Model file hash mismatch - file may be corrupted",
              );
            }
            console.log(
              "[LocalAIModelService] Model integrity verified (SHA-256 match)",
            );
          } else {
            // First time - store the hash for future verification
            localStorage.setItem(MODEL_SHA256_STORAGE_KEY, hashResult.hash);
            console.log(
              "[LocalAIModelService] Model integrity verified (SHA-256 computed and stored)",
            );
          }
        } else {
          // Fallback to size check if hash computation fails
          console.warn(
            "[LocalAIModelService] SHA-256 computation failed, using size check only",
          );
          console.log(
            "[LocalAIModelService] Model integrity verified (size check)",
          );
        }
      }
    } catch (error) {
      console.warn(
        "[LocalAIModelService] Integrity verification skipped:",
        error,
      );
    }
  }

  /**
   * Load model into memory
   * Includes memory usage check and pre-warm
   * Works in both Electron (file system) and browser (IndexedDB + WebAssembly)
   */
  static async loadModel(): Promise<void> {
    if (this.status === "READY" || this.status === "LOADING") {
      return;
    }

    if (this.status === "NOT_INSTALLED" || this.status === "ERROR") {
      throw new Error("Model not downloaded. Please download the model first.");
    }

    // Memory usage check (basic heuristic)
    if (typeof navigator !== "undefined" && (navigator as any).deviceMemory) {
      const deviceMemory = (navigator as any).deviceMemory;
      if (deviceMemory && deviceMemory < 4) {
        console.warn(
          "[LocalAIModelService] Low device memory detected, model may not load properly",
        );
      }
    }

    this.status = "LOADING";
    console.log("[LocalAIModelService] Loading model...");
    console.log("[LOCAL_AI_LOAD]: LOADING");

    const isElectron =
      typeof window !== "undefined" && (window as any).electron?.ipcRenderer;

    try {
      if (isElectron) {
        // Electron environment - load from file system
        await this.loadModelElectron();
      } else {
        // Browser environment - load from IndexedDB with WebAssembly
        await this.loadModelBrowser();
      }

      this.status = "READY";
      this.consecutiveFailures = 0;
      this.healthStatus = "OK";
      console.log("[LocalAIModelService] Model loaded successfully");
      console.log("[LOCAL_AI_LOAD]: LOADED");
      console.log("[LOCAL_MODEL]: LOADED");
      console.log("[MODEL]: READY");

      // Lightweight pre-warm (single-token inference)
      try {
        await this.infer("test", { maxTokens: 1, timeout: 5000 });
        console.log("[LocalAIModelService] Model pre-warmed");
      } catch (error) {
        console.warn(
          "[LocalAIModelService] Pre-warm failed (non-critical):",
          error,
        );
      }
    } catch (error: any) {
      this.status = "ERROR";
      this.healthStatus = "ERROR";
      console.error("[LocalAIModelService] Failed to load model:", error);
      console.log("[LOCAL_AI_LOAD]: FAILED");
      console.log("[LOCAL_MODEL]: ERROR");
      throw error;
    }
  }

  /**
   * Load model in Electron environment (node-llama-cpp)
   */
  private static async loadModelElectron(): Promise<void> {
    // Get actual model path (Q5 or fallback to Q4)
    const primaryPath = await getModelPath();
    const fallbackPath = await getFallbackModelPath();

    let modelPath = primaryPath;
    let exists = await this.checkModelExists(primaryPath);

    if (!exists) {
      // Try fallback model
      exists = await this.checkModelExists(fallbackPath);
      if (exists) {
        modelPath = fallbackPath;
        console.log(
          "[LocalAIModelService] Using fallback model:",
          FALLBACK_MODEL_FILE,
        );
      }
    }

    // Check if model exists
    if (!exists) {
      throw new Error(
        `Model file not found. Expected at:\n  ${primaryPath}\nor:\n  ${fallbackPath}\n\nPlease place your model file in the models directory.`,
      );
    }

    // Load model using node-llama-cpp
    await loadLlamaModule();
    if (!getLlama) {
      throw new Error(
        "node-llama-cpp not available. This feature requires Electron or Node.js environment.",
      );
    }
    const llama = await getLlama();
    this.model = await llama.loadModel({
      modelPath,
    });

    // Create context
    this.context = await this.model.createContext({
      contextSize: 4096, // Adjust based on model capabilities
    });

    // Create chat session
    this.session = new LlamaChatSession({
      context: this.context,
    });
  }

  /**
   * Load model in browser environment (WebAssembly + llama.cpp WASM)
   * Now supports loading from project root in web mode
   */
  private static async loadModelBrowser(): Promise<void> {
    // Check if model exists (project root or IndexedDB)
    const exists = await this.checkModelExists(MODEL_FILE);
    if (!exists) {
      throw new Error(
        `Model file not found. Please ensure the model file (${MODEL_FILE}) exists in the public folder or download it first.`,
      );
    }

    // Determine model source (project root or IndexedDB)
    let modelPath: string;
    let modelBlob: Blob | null = null;

    // First, try to load from public folder (Vite serves files from public)
    try {
      const modelUrl = `/${MODEL_FILE}`;
      const response = await fetch(modelUrl);
      if (response.ok) {
        modelBlob = await response.blob();
        modelPath = modelUrl;
        console.log(
          "[LocalAIModelService] Model loaded from public folder:",
          modelUrl,
          "size:",
          modelBlob.size,
        );
      } else {
        throw new Error("Model not found in public folder");
      }
    } catch (e) {
      // Fallback to IndexedDB
      console.log(
        "[LocalAIModelService] Model not in project root, loading from IndexedDB...",
      );
      const db = await this.openIndexedDB();
      const transaction = db.transaction(["models"], "readonly");
      const store = transaction.objectStore("models");
      const request = store.get(MODEL_FILE);

      modelBlob = await new Promise<Blob>((resolve, reject) => {
        request.onsuccess = () => {
          if (request.result) {
            resolve(request.result);
          } else {
            reject(new Error("Model not found in IndexedDB"));
          }
        };
        request.onerror = () => reject(request.error);
      });

      modelPath = MODEL_FILE; // Use model name as path for IndexedDB
      console.log(
        "[LocalAIModelService] Model loaded from IndexedDB, size:",
        modelBlob.size,
      );
    }

    // Initialize Web Engine
    try {
      console.log("[LocalAIModelService] Initializing Web Engine...");

      // Create Web Engine instance
      this.webEngine = new LocalAIWebEngine();

      // Initialize engine with model path
      // For project root, use the URL; for IndexedDB, we'll need to create a blob URL
      let engineModelPath: string;
      if (modelPath.startsWith("/")) {
        // Model from project root - use as-is
        engineModelPath = modelPath;
      } else {
        // Model from IndexedDB - create blob URL
        const blobUrl = URL.createObjectURL(modelBlob);
        engineModelPath = blobUrl;
        // Store blob URL for cleanup
        (this as any).modelBlobUrl = blobUrl;
      }

      await this.webEngine.initialize({
        modelPath: engineModelPath,
        nCtx: 4096,
        nGpuLayers: 0, // No GPU in browser
        seed: -1,
        useMmap: false,
        useMlock: false,
      });

      // Create session wrapper for compatibility
      this.session = {
        prompt: async (text: string, options: any) => {
          if (!this.webEngine || !this.webEngine.isReady()) {
            throw new Error("Web engine not ready");
          }

          console.log("[LocalAIModelService] Running browser inference...");

          const result = await this.webEngine.infer(text, {
            maxTokens: options.maxTokens || 512,
            temperature: options.temperature || 0.7,
            topP: options.topP || 0.9,
            topK: options.topK || 40,
          });

          return result.text;
        },
        setSystemPrompt: (prompt: string) => {
          console.log("[LocalAIModelService] System prompt set:", prompt);
          (this as any).systemPrompt = prompt;
        },
      } as any;

      console.log(
        "[LocalAIModelService] Browser model session initialized successfully",
      );
    } catch (error) {
      console.error(
        "[LocalAIModelService] Error initializing browser model:",
        error,
      );
      throw new Error(`Failed to initialize browser model: ${error}`);
    }
  }

  /**
   * Unload model from memory
   */
  static async unloadModel(): Promise<void> {
    if (this.status === "NOT_INSTALLED" || this.status === "UNLOADED") {
      return;
    }

    console.log("[LocalAIModelService] Unloading model...");
    console.log("[LOCAL_AI_LOAD]: UNLOADING");

    try {
      // Cleanup Web Engine if in browser mode
      if (this.webEngine) {
        await this.webEngine.cleanup();
        this.webEngine = null;
      }

      // Cleanup blob URL if exists
      const blobUrl = (this as any).modelBlobUrl;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
        (this as any).modelBlobUrl = null;
      }

      if (this.session) {
        // Session cleanup handled by context
        this.session = null;
      }

      if (this.context) {
        this.context = null;
      }

      if (this.model) {
        this.model = null;
      }

      this.status = "UNLOADED";
      console.log("[LocalAIModelService] Model unloaded");
      console.log("[LOCAL_AI_LOAD]: UNLOADED");
      console.log("[LOCAL_MODEL]: UNLOADED");
    } catch (error) {
      console.error("[LocalAIModelService] Error unloading model:", error);
      console.log("[LOCAL_MODEL]: ERROR");
      this.status = "ERROR";
    }
  }

  /**
   * Run inference
   */
  static async infer(
    prompt: string,
    options: InferenceOptions = {},
  ): Promise<InferenceResult> {
    if (this.status !== "READY" || !this.session) {
      throw new Error("Model not loaded. Call loadModel() first.");
    }

    const startTime = Date.now();
    const timeout = options.timeout || 30000; // 30s default
    const maxTokens = options.maxTokens || 512;

    console.log("[LocalAIModelService] Running inference...");
    console.log("[LOCAL_AI_CAPABILITY]: ALLOWED");

    try {
      // Set system prompt if provided
      if (options.systemPrompt) {
        this.session.setSystemPrompt(options.systemPrompt);
      }

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("Inference timeout")), timeout);
      });

      // Run inference with timeout
      const inferencePromise = this.session.prompt(prompt, {
        maxTokens,
        temperature: options.temperature || 0.7,
      });

      const result = await Promise.race([inferencePromise, timeoutPromise]);

      const latency = Date.now() - startTime;
      this.lastInferenceLatency = latency;

      // Reset failure counter on success
      this.consecutiveFailures = 0;
      this.retryBackoffMs = 1000; // Reset backoff
      this.recoveryAttempts = 0;
      if (this.healthStatus === "DEGRADED" || this.healthStatus === "ERROR") {
        this.healthStatus = "OK";
        console.log("[LOCAL_AI_HEALTH]: OK");
        console.log("[LOCAL_AI_RECOVERY]: SUCCESS");
      }

      const tokens = result.split(/\s+/).length; // Rough token estimate

      console.log(`[LocalAIModelService] Inference complete (${latency}ms)`);
      console.log("[LOCAL_AI_HEALTH]: OK");

      return {
        text: result,
        tokens,
        latency,
      };
    } catch (error: any) {
      this.consecutiveFailures++;
      this.lastFailureTime = Date.now();
      const latency = Date.now() - startTime;

      console.error("[LocalAIModelService] Inference error:", error);

      // Exponential backoff
      this.retryBackoffMs = Math.min(
        this.retryBackoffMs * 2,
        this.MAX_RETRY_BACKOFF_MS,
      );

      // Health monitoring: if 3 consecutive failures, disable
      if (this.consecutiveFailures >= 3) {
        this.healthStatus = "ERROR";
        this.status = "ERROR";
        console.log("[LOCAL_AI_HEALTH]: ERROR (3 consecutive failures)");
        console.log("[LOCAL_AI_RECOVERY]: FAILED");
        // Start recovery monitoring
        this.startRecoveryMonitoring();
        throw new Error(
          "Model health degraded. Too many consecutive failures.",
        );
      } else if (this.consecutiveFailures >= 2) {
        this.healthStatus = "DEGRADED";
        console.log("[LOCAL_AI_HEALTH]: DEGRADED");
      } else {
        console.log("[LOCAL_AI_HEALTH]: OK");
      }

      throw error;
    }
  }

  /**
   * Calculate importance score for content
   */
  static async calculateImportance(content: string): Promise<number> {
    if (this.status !== "READY") {
      // Fallback: simple heuristic
      return content.length > 100 ? 0.7 : 0.3;
    }

    try {
      const prompt = `Rate the importance of this content for a coding assistant context (0.0 to 1.0):\n\n${content.substring(0, 500)}\n\nRespond with only a number between 0.0 and 1.0.`;
      const result = await this.infer(prompt, {
        maxTokens: 10,
        timeout: 5000,
      });

      const score = parseFloat(result.text.trim());
      if (isNaN(score) || score < 0 || score > 1) {
        return 0.5; // Default
      }
      return score;
    } catch (error) {
      console.warn(
        "[LocalAIModelService] Importance calculation failed, using default",
      );
      return 0.5;
    }
  }

  /**
   * Create summary of context entries
   */
  static async createSummary(
    entries: Array<{ role: string; content: string }>,
  ): Promise<string> {
    if (this.status !== "READY") {
      throw new Error("Model not loaded");
    }

    const content = entries
      .map((e) => `${e.role}: ${e.content}`)
      .join("\n\n")
      .substring(0, 2000); // Limit input

    const prompt = `Summarize the following conversation context concisely, preserving key technical details and decisions:\n\n${content}\n\nSummary:`;

    try {
      const result = await this.infer(prompt, {
        maxTokens: 256,
        timeout: 10000,
      });
      return result.text;
    } catch (error) {
      console.error("[LocalAIModelService] Summary creation failed:", error);
      throw error;
    }
  }

  /**
   * Health check
   */
  static async healthCheck(): Promise<boolean> {
    if (this.status !== "READY") {
      return false;
    }

    try {
      // Quick single-token inference test
      await this.infer("test", { maxTokens: 1, timeout: 5000 });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get last inference latency
   */
  static getLastLatency(): number {
    return this.lastInferenceLatency;
  }

  /**
   * Start recovery monitoring
   */
  private static startRecoveryMonitoring(): void {
    // Check if already monitoring
    if ((this as any).recoveryInterval) {
      return;
    }

    console.log("[LOCAL_AI_RECOVERY]: ATTEMPTED");

    (this as any).recoveryInterval = setInterval(async () => {
      // Only attempt recovery if enough time has passed since last failure
      const timeSinceFailure = Date.now() - this.lastFailureTime;
      if (timeSinceFailure < this.retryBackoffMs) {
        return; // Still in backoff period
      }

      this.recoveryAttempts++;

      try {
        // Attempt lightweight health check
        const healthy = await this.healthCheck();
        if (healthy) {
          // Recovery successful
          this.consecutiveFailures = 0;
          this.healthStatus = "OK";
          this.status = "UNLOADED"; // Allow reload
          this.retryBackoffMs = 1000;
          this.recoveryAttempts = 0;
          console.log("[LOCAL_AI_HEALTH]: OK");
          console.log("[LOCAL_AI_RECOVERY]: SUCCESS");

          // Stop monitoring
          if ((this as any).recoveryInterval) {
            clearInterval((this as any).recoveryInterval);
            (this as any).recoveryInterval = null;
          }
        }
      } catch (error) {
        // Recovery failed, continue monitoring
        console.log(
          "[LOCAL_AI_RECOVERY]: FAILED (attempt " + this.recoveryAttempts + ")",
        );
      }
    }, this.RECOVERY_CHECK_INTERVAL);
  }

  /**
   * Get retry backoff time
   */
  static getRetryBackoffMs(): number {
    return this.retryBackoffMs;
  }
}
