/**
 * Vosk Speech Recognition Service (Renderer Process)
 * 
 * This is a wrapper service that communicates with the Main Process
 * via IPC to use Vosk for offline speech recognition.
 * 
 * Vosk runs in the Main Process (Node.js) and communicates results
 * back to the Renderer Process via IPC.
 */

export interface VoskRendererCallbacks {
  onResult: (text: string) => void;
  onError: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
}

export class VoskRendererService {
  private isListening: boolean = false;
  private voskAPI: any = null;
  private callbacks: VoskRendererCallbacks | null = null;

  constructor() {
    // Get Vosk API from preload
    if (typeof window !== 'undefined') {
      this.voskAPI = (window as any).voskAPI;
    }
  }

  /**
   * Check if Vosk is available
   */
  public async isAvailable(): Promise<boolean> {
    if (!this.voskAPI) {
      return false;
    }

    try {
      const result = await this.voskAPI.checkAvailability();
      return result?.available === true;
    } catch (error) {
      console.error('[VoskRenderer] Availability check error:', error);
      return false;
    }
  }

  /**
   * Check if model exists for a language
   */
  public async checkModel(lang: 'fa-IR' | 'en-US'): Promise<boolean> {
    if (!this.voskAPI) {
      return false;
    }

    try {
      const result = await this.voskAPI.checkModel(lang);
      return result?.exists === true;
    } catch (error) {
      console.error('[VoskRenderer] Model check error:', error);
      return false;
    }
  }

  /**
   * Start Vosk speech recognition
   */
  public async start(
    lang: 'fa-IR' | 'en-US',
    callbacks: VoskRendererCallbacks
  ): Promise<boolean> {
    if (this.isListening) {
      console.warn('[VoskRenderer] Already listening, stopping first...');
      await this.stop();
    }

    if (!this.voskAPI) {
      callbacks.onError('Vosk API is not available. Make sure you are running in Electron.');
      return false;
    }

    // Check availability
    const available = await this.isAvailable();
    if (!available) {
      callbacks.onError('Vosk is not available. Please install vosk and mic packages.');
      return false;
    }

    // Check model
    const modelExists = await this.checkModel(lang);
    if (!modelExists) {
      callbacks.onError(`Vosk model for ${lang} not found. Please download the model first.`);
      return false;
    }

    try {
      this.callbacks = callbacks;

      // Setup event listeners
      this.voskAPI.onResult((text: string) => {
        if (this.callbacks) {
          this.callbacks.onResult(text);
        }
      });

      this.voskAPI.onError((error: string) => {
        this.isListening = false;
        if (this.callbacks) {
          this.callbacks.onError(error);
        }
      });

      this.voskAPI.onStarted(() => {
        this.isListening = true;
        console.log(`[VoskRenderer] Started recognition with language: ${lang}`);
        if (this.callbacks?.onStart) {
          this.callbacks.onStart();
        }
      });

      this.voskAPI.onStopped(() => {
        this.isListening = false;
        console.log('[VoskRenderer] Stopped recognition');
        if (this.callbacks?.onEnd) {
          this.callbacks.onEnd();
        }
      });

      // Start recognition in Main Process
      const result = await this.voskAPI.start(lang);
      
      if (result?.success) {
        console.log('[VoskRenderer] Recognition start requested successfully');
        // isListening will be set to true when 'vosk:started' event is received
        return true;
      } else {
        this.isListening = false;
        const errorMsg = result?.error || 'Failed to start Vosk recognition';
        callbacks.onError(errorMsg);
        return false;
      }
    } catch (error: any) {
      this.isListening = false;
      const errorMsg = error?.message || 'Failed to start Vosk recognition';
      console.error('[VoskRenderer] Start error:', error);
      callbacks.onError(errorMsg);
      return false;
    }
  }

  /**
   * Stop Vosk speech recognition
   */
  public async stop(): Promise<void> {
    if (!this.isListening || !this.voskAPI) {
      return;
    }

    try {
      await this.voskAPI.stop();
      // Remove event listeners
      this.voskAPI.removeAllListeners('vosk:result');
      this.voskAPI.removeAllListeners('vosk:error');
      this.voskAPI.removeAllListeners('vosk:started');
      this.voskAPI.removeAllListeners('vosk:stopped');
      this.isListening = false;
      this.callbacks = null;
    } catch (error) {
      console.error('[VoskRenderer] Stop error:', error);
    }
  }

  /**
   * Check if currently listening
   */
  public getIsListening(): boolean {
    return this.isListening;
  }
}

// Export singleton instance
export const voskRendererService = new VoskRendererService();
