/**
 * Vosk Speech Recognition Service
 * Offline speech recognition using Vosk (Node.js/Electron Main Process)
 * Used as fallback when Web Speech API is unavailable
 * 
 * NOTE: This service requires:
 * - npm install vosk
 * - npm install mic
 * - Vosk model files downloaded to models/ directory
 */

export interface VoskCallbacks {
  onResult: (text: string) => void;
  onError: (error: string) => void;
  onEnd?: () => void;
}

export class VoskSpeechService {
  private isListening: boolean = false;
  private recognitionProcess: any = null;
  private audioStream: any = null;
  private voskModel: any = null;

  constructor() {}

  /**
   * Start Vosk speech recognition
   * Returns Promise that resolves when recognition ends or rejects on error
   */
  public async start(
    lang: 'fa-IR' | 'en-US',
    callbacks: VoskCallbacks
  ): Promise<void> {
    if (this.isListening) {
      throw new Error('Vosk recognition is already running');
    }

    try {
      const vosk = require('vosk');
      const mic = require('mic');
      const fs = require('fs');
      const path = require('path');

      // استفاده از مدل کوچک فارسی
      let modelPath;
      if (lang === 'fa-IR') {
        const smallModelPath042 = path.join(__dirname, '../models/vosk-model-small-fa-0.42');
        const smallModelPath022 = path.join(__dirname, '../models/vosk-model-small-fa-0.22');
        modelPath = fs.existsSync(smallModelPath042) ? smallModelPath042 : smallModelPath022;
      } else {
        modelPath = path.join(__dirname, '../models/vosk-model-en-us-0.22');
      }

      if (!fs.existsSync(modelPath)) {
        throw new Error(`Vosk model not found at ${modelPath}. Please download the model first.`);
      }

      vosk.setLogLevel(0);
      this.voskModel = new vosk.Model(modelPath);
      const rec = new vosk.Recognizer({ model: this.voskModel, sampleRate: 16000 });

      this.isListening = true;

      const micInstance = mic({
        rate: '16000',
        channels: '1',
        debug: false,
        exitOnSilence: 6
      });

      this.audioStream = micInstance.getAudioStream();

      this.audioStream.on('data', (data: Buffer) => {
        if (rec.acceptWaveform(data)) {
          const result = JSON.parse(rec.result());
          if (result.text && result.text.trim()) {
            callbacks.onResult(result.text.trim());
          }
        }
      });

      this.audioStream.on('error', (err: Error) => {
        this.isListening = false;
        callbacks.onError(`Vosk audio stream error: ${err.message}`);
      });

      this.audioStream.on('silence', () => {
        const finalResult = JSON.parse(rec.finalResult());
        if (finalResult.text && finalResult.text.trim()) {
          callbacks.onResult(finalResult.text.trim());
        }
      });

      micInstance.start();

      this.recognitionProcess = { mic: micInstance, recognizer: rec };

    } catch (error: any) {
      this.isListening = false;
      const errorMsg = error.message || 'Failed to start Vosk recognition';
      callbacks.onError(`Vosk error: ${errorMsg}`);
      throw new Error(errorMsg);
    }
  }

  /**
   * Stop Vosk recognition
   */
  public stop(): void {
    if (!this.isListening) return;

    try {
      if (this.recognitionProcess?.mic) {
        this.recognitionProcess.mic.stop();
      }
      if (this.recognitionProcess?.recognizer) {
        this.recognitionProcess.recognizer.free();
      }
      if (this.voskModel) {
        this.voskModel.free();
      }
    } catch (error) {
    }

    this.isListening = false;
    this.recognitionProcess = null;
    this.audioStream = null;
    this.voskModel = null;
  }

  /**
   * Check if Vosk is available
   */
  public static isAvailable(): boolean {
    try {
      require.resolve('vosk');
      return true;
    } catch {
      // Vosk module not installed - expected in some environments
      console.debug('Vosk module not available, speech recognition will use online fallback');
      return false;
    }
  }

  /**
   * Get listening state
   */
  public getIsListening(): boolean {
    return this.isListening;
  }
}
