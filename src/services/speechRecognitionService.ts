/**
 * Speech Recognition Service
 * 
 * RENDERER ROLE:
 * This service handles client-side speech recognition inside an Electron application.
 * 
 * Technical Specifications:
 * - STRICT: Uses ONLY Chromium's built-in Web Speech API (window.SpeechRecognition || window.webkitSpeechRecognition)
 * - NO external APIs, cloud services, Gemini, Whisper, or third-party services
 * - Works entirely in Electron Renderer process (not Main process)
 * - Operates offline when possible (English works offline, Persian requires internet)
 * - Transcripts are for internal processing only - NOT displayed in UI
 * - Maintains security through contextIsolation and preload bridge
 * 
 * Language Support:
 * - Primary: Persian (fa-IR) - requires internet connection
 * - Fallback: English (en-US) - works offline
 * - Automatic fallback on network errors
 * 
 * Security:
 * - No direct Node.js API access
 * - Uses Electron preload API for availability checks
 * - Context isolation compliant
 * 
 * This service acts as a pure voice input interface that converts speech to text
 * for internal AI processing, without exposing transcripts to the UI or external services.
 */

export interface SpeechRecognitionConfig {
  lang?: string | string[]; // Single language or array for multi-language support
  continuous?: boolean;
  interimResults?: boolean;
  maxAlternatives?: number;
  autoDetectLanguage?: boolean; // Attempt to auto-detect language (uses multiple languages if supported)
}

export interface SpeechRecognitionCallbacks {
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
  onStart?: () => void;
  onEnd?: () => void;
  onNoMatch?: () => void;
}

export class SpeechRecognitionService {
  private recognition: any = null;
  private isSupported: boolean = false;
  private isListening: boolean = false;
  private lastProcessedIndex: number = -1; // Track last processed result index to prevent duplicates

  constructor() {
    this.checkSupport();
  }

  /**
   * Check if Web Speech Recognition is supported
   * Uses Chromium's built-in Web Speech API (works in Electron on Windows)
   * Enhanced with Electron preload API check
   */
  private checkSupport(): void {
    if (typeof window === 'undefined') {
      this.isSupported = false;
      console.error('[Speech Recognition] Window is undefined');
      return;
    }

    // STRICT: Use ONLY Chromium's built-in Web Speech API
    // Works in Electron Renderer process (Chromium-based)
    // DO NOT use cloud services, Whisper, external SDKs, or any external APIs
    
    // Check if Electron indicates support (from preload)
    const electronSupported = (window as any).speechAPI?.electronSupported === true;
    
    // Direct check for Speech Recognition constructors
    const SpeechRecognition = (window as any).SpeechRecognition || 
                             (window as any).webkitSpeechRecognition;
    
    this.isSupported = !!SpeechRecognition || electronSupported;
    
    // Enhanced debug logging
    console.log('[Speech Recognition] Support check:', {
      electronPreloadFlag: electronSupported,
      SpeechRecognition: !!(window as any).SpeechRecognition,
      webkitSpeechRecognition: !!(window as any).webkitSpeechRecognition,
      hasConstructor: !!SpeechRecognition,
      finalSupported: this.isSupported,
      userAgent: navigator.userAgent
    });
    
    if (!this.isSupported) {
      console.warn('[Speech Recognition] Not supported. This should not happen in Electron/Chromium.');
      console.warn('[Speech Recognition] Available window properties:', Object.keys(window).filter(k => k.toLowerCase().includes('speech')));
    } else {
      const via = (window as any).SpeechRecognition ? 'SpeechRecognition' : 
                  (window as any).webkitSpeechRecognition ? 'webkitSpeechRecognition' :
                  electronSupported ? 'Electron preload flag' : 'unknown';
      console.log(`[Speech Recognition] ✓ Supported via: ${via}`);
    }
  }

  /**
   * Get Speech Recognition instance
   * Uses Chromium's internal speech engine (no external APIs)
   */
  private getRecognition(): any {
    if (typeof window === 'undefined') return null;
    
    // Use Chromium's built-in Web Speech API
    // This works in Electron (Chromium-based) on Windows
    // No Node.js APIs, no cloud services, no external SDKs
    const SpeechRecognition = (window as any).SpeechRecognition || 
                             (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) return null;
    
    return new SpeechRecognition();
  }

  /**
   * Check if Speech Recognition is supported
   */
  public isAvailable(): boolean {
    return this.isSupported;
  }

  /**
   * Get available languages (common languages)
   */
  public getAvailableLanguages(): Array<{ code: string; name: string }> {
    return [
      { code: 'en-US', name: 'English (US)' },
      { code: 'en-GB', name: 'English (UK)' },
      { code: 'fa-IR', name: 'Persian (Farsi)' },
      { code: 'ar-SA', name: 'Arabic' },
      { code: 'es-ES', name: 'Spanish' },
      { code: 'fr-FR', name: 'French' },
      { code: 'de-DE', name: 'German' },
      { code: 'it-IT', name: 'Italian' },
      { code: 'pt-BR', name: 'Portuguese (Brazil)' },
      { code: 'ru-RU', name: 'Russian' },
      { code: 'zh-CN', name: 'Chinese (Simplified)' },
      { code: 'ja-JP', name: 'Japanese' },
      { code: 'ko-KR', name: 'Korean' },
      { code: 'tr-TR', name: 'Turkish' },
      { code: 'hi-IN', name: 'Hindi' }
    ];
  }

  /**
   * Start listening for speech input
   * Uses ONLY Chromium's Web Speech API - no external fallbacks
   */
  public start(
    config: SpeechRecognitionConfig = {},
    callbacks: SpeechRecognitionCallbacks
  ): boolean {
    if (this.isListening) {
      this.stop();
    }

    // Use Web Speech API only
    if (this.isSupported) {
      return this.startWebSpeech(config, callbacks);
    }

    // Web Speech API not available
    callbacks.onError('Speech Recognition is not supported. Please use Chrome or Electron (Chromium-based browser).');
    return false;
  }

  /**
   * Start Web Speech API recognition
   */
  private startWebSpeech(
    config: SpeechRecognitionConfig = {},
    callbacks: SpeechRecognitionCallbacks
  ): boolean {
    try {
      console.log('[SpeechRecognitionService] Starting Web Speech API...');
      this.recognition = this.getRecognition();
      if (!this.recognition) {
        console.error('[SpeechRecognitionService] Failed to get Speech Recognition instance');
        callbacks.onError('Failed to initialize Speech Recognition.');
        return false;
      }
      console.log('[SpeechRecognitionService] Speech Recognition instance created');

      // Configure recognition
      // Support both single language and multi-language arrays
      if (Array.isArray(config.lang)) {
        // Multi-language support (Chromium may use first language as primary)
        this.recognition.lang = config.lang[0] || 'en-US';
        // Note: Chromium Web Speech API doesn't natively support language arrays,
        // but we can switch languages dynamically if needed
      } else if (config.autoDetectLanguage) {
        // Auto-detect: Use both Persian and English for better recognition
        // Chromium will use the first language, but may handle mixed content
        this.recognition.lang = 'fa-IR,en-US'; // Some browsers support comma-separated
      } else {
        this.recognition.lang = config.lang || 'en-US';
      }
      
      // Enable continuous recognition for long conversations
      this.recognition.continuous = config.continuous ?? true;
      
      // Enable interim results for live transcription
      this.recognition.interimResults = config.interimResults ?? true;
      
      // Use maxAlternatives=1 to get single best result (reduces duplicates)
      this.recognition.maxAlternatives = config.maxAlternatives ?? 1;
      
      // Note: grammars property requires SpeechGrammarList object, not null
      // Setting it to null causes errors, so we don't modify it
      // The default grammar will be used automatically

      // Set up event handlers
      this.recognition.onstart = () => {
        this.isListening = true;
        // Reset last processed index when recognition starts
        this.lastProcessedIndex = -1;
        callbacks.onStart?.();
      };

      // Reset last processed index when starting new recognition
      this.lastProcessedIndex = -1;
      
      this.recognition.onresult = (event: any) => {
        // Accumulate ALL results from the start (not just new ones)
        // This ensures we get the complete transcript, not just the latest chunk
        let allFinalTranscript = '';
        let allInterimTranscript = '';
        let newFinalTranscript = '';
        let newInterimTranscript = '';

        // Process ALL results from the beginning to get complete transcript
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            allFinalTranscript += transcript + ' ';
            // Track only NEW final results (from lastProcessedIndex)
            if (i > this.lastProcessedIndex) {
              newFinalTranscript += transcript + ' ';
            }
          } else {
            allInterimTranscript += transcript + ' ';
            // Track only NEW interim results
            if (i > this.lastProcessedIndex) {
              newInterimTranscript += transcript + ' ';
            }
          }
        }
        
        // Update last processed index
        this.lastProcessedIndex = event.results.length - 1;

        // Send NEW final results (if any) - these are complete phrases
        if (newFinalTranscript.trim()) {
          // Final result: complete and ready to send
          callbacks.onResult(newFinalTranscript.trim(), true);
        }
        
        // Send COMPLETE interim transcript (all interim results so far)
        // This shows the full live transcription, not just the latest chunk
        if (allInterimTranscript.trim() && config.interimResults) {
          // Interim result: live transcription, still being processed
          // Send the complete accumulated interim text for better UX
          callbacks.onResult(allInterimTranscript.trim(), false);
        }
      };

      this.recognition.onerror = (event: any) => {
        const silentErrors = ['no-speech', 'aborted'];
        
        if (silentErrors.includes(event.error)) {
          console.log(`[Speech Recognition] ${event.error} - this is normal, not an error`);
          return;
        }

        console.error('[Speech Recognition] Web Speech API error:', event.error, {
          error: event.error,
          message: event.message || '',
          type: event.type || '',
          online: navigator.onLine,
          currentLang: this.recognition?.lang || config.lang,
          timestamp: new Date().toISOString()
        });
        this.isListening = false;
        
        let errorMessage = 'Speech recognition error occurred.';

        switch (event.error) {
          case 'audio-capture':
            errorMessage = 'Microphone not found or access denied. Please check your microphone settings.';
            break;
          case 'not-allowed':
            errorMessage = 'Microphone permission denied. Please allow microphone access in Windows settings and restart the app.';
            break;
          case 'network':
            const currentLang = this.recognition?.lang || config.lang || 'fa-IR';
            const isPersian = currentLang === 'fa-IR' || (typeof currentLang === 'string' && currentLang.startsWith('fa'));
            const isOnline = navigator.onLine;
            
            console.error('[Speech Recognition] Network error details:', {
              currentLang,
              isPersian,
              isOnline,
              userAgent: navigator.userAgent,
              note: 'Web Speech API cannot connect to Google servers. This may be due to CSP, firewall, or Electron limitations. Vosk fallback should be triggered automatically.'
            });
            
            // Always trigger fallback for network errors - Vosk will handle it
            if (!isOnline) {
              errorMessage = 'No internet connection. Web Speech API requires internet. Falling back to Vosk (offline) if available.';
            } else if (isPersian) {
              errorMessage = 'Network error: Cannot connect to Google Speech API for Persian. This is common in Electron. Falling back to Vosk (offline) if available.';
            } else {
              errorMessage = 'Network error: Cannot connect to Google Speech API. This is common in Electron. Falling back to Vosk (offline) if available.';
            }
            break;
          case 'service-not-allowed':
            errorMessage = 'Speech recognition service is not allowed. Please check your browser/Electron settings. Falling back to Vosk if available.';
            break;
          case 'bad-grammar':
            errorMessage = 'Grammar error in speech recognition.';
            break;
          case 'language-not-supported':
            errorMessage = `Language "${config.lang}" is not supported. Falling back to Vosk if available.`;
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}. Falling back to Vosk if available.`;
        }

        // Always trigger callback so fallback can be attempted
        callbacks.onError(errorMessage);
      };

      this.recognition.onend = () => {
        this.isListening = false;
        // In continuous mode, onend may fire between phrases
        // The InputArea component manages the listening state
        // We just notify that recognition ended
        callbacks.onEnd?.();
      };

      this.recognition.onnomatch = () => {
        callbacks.onNoMatch?.();
      };

      // Start recognition
      try {
        console.log('[Speech Recognition] Attempting to start recognition...', {
          lang: this.recognition.lang,
          continuous: this.recognition.continuous,
          interimResults: this.recognition.interimResults,
          hasRecognition: !!this.recognition,
          userAgent: navigator.userAgent,
          mediaDevices: !!navigator.mediaDevices,
          getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)
        });
        
        // Check if getUserMedia is available (required for microphone access)
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          console.error('[Speech Recognition] ❌ getUserMedia not available - microphone access blocked');
          callbacks.onError('Microphone access is not available. Please check your browser permissions and Electron configuration.');
          return false;
        }
        
        this.recognition.start();
        console.log('[Speech Recognition] ✅ Web Speech API started successfully with language:', this.recognition.lang);
        return true;
      } catch (startError: any) {
        if (startError.message && startError.message.includes('already started')) {
          console.log('[Speech Recognition] Already started, continuing...');
          return true;
        }
        console.error('[Speech Recognition] ❌ Failed to start Web Speech API:', {
          error: startError,
          message: startError.message,
          stack: startError.stack,
          recognition: !!this.recognition,
          errorName: startError.name,
          errorCode: (startError as any).code
        });
        this.recognition = null;
        
        // Provide more specific error messages
        let errorMsg = startError.message || 'Unknown error';
        if (errorMsg.includes('not-allowed') || errorMsg.includes('permission')) {
          errorMsg = 'Microphone permission denied. Please allow microphone access in Windows settings and restart the app.';
        } else if (errorMsg.includes('not-found') || errorMsg.includes('device')) {
          errorMsg = 'No microphone found. Please connect a microphone and try again.';
        }
        
        callbacks.onError(`Failed to start Speech Recognition: ${errorMsg}`);
        return false;
      }
    } catch (error: any) {
      this.isListening = false;
      console.error('[Speech Recognition] Web Speech API error:', error);
      callbacks.onError('Speech Recognition error occurred.');
      return false;
    }
  }

  /**
   * Stop listening for speech input
   */
  public stop(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore errors when stopping
      }
    }
    this.isListening = false;
  }

  /**
   * Abort current recognition session
   */
  public abort(): void {
    if (this.recognition) {
      try {
        this.recognition.abort();
      } catch (e) {
        // Ignore errors when aborting
      }
      this.isListening = false;
    }
  }

  /**
   * Check if currently listening
   */
  public getIsListening(): boolean {
    return this.isListening;
  }

  /**
   * Get current language
   */
  public getCurrentLanguage(): string {
    return this.recognition?.lang || 'en-US';
  }

  /**
   * Set language for recognition
   */
  public setLanguage(lang: string | string[]): void {
    if (this.recognition) {
      if (Array.isArray(lang)) {
        this.recognition.lang = lang[0] || 'en-US';
      } else {
        this.recognition.lang = lang;
      }
    }
  }

  /**
   * Switch between languages dynamically (for auto-detection)
   * Useful when user switches between Persian and English
   */
  public switchLanguage(lang: string): void {
    if (this.recognition && this.isListening) {
      // Stop current recognition
      this.stop();
      // Language will be set on next start
      this.recognition.lang = lang;
      // Restart if was listening
      try {
        this.recognition.start();
      } catch (e) {
        // Ignore if already started or other errors
      }
    } else {
      this.setLanguage(lang);
    }
  }

  /**
   * Get supported languages from Chromium
   * Note: Chromium Web Speech API doesn't expose this directly,
   * but we return common supported languages
   */
  public getChromiumSupportedLanguages(): string[] {
    return [
      'en-US', 'en-GB', 'fa-IR', 'ar-SA', 'es-ES', 'fr-FR', 
      'de-DE', 'it-IT', 'pt-BR', 'ru-RU', 'zh-CN', 'ja-JP', 
      'ko-KR', 'tr-TR', 'hi-IN'
    ];
  }
}

// Export singleton instance
export const speechRecognitionService = new SpeechRecognitionService();
