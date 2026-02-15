export type SpeechCallbacks = {
  onStart?: () => void;
  onResult: (text: string, isFinal: boolean) => void;
  onError: (message: string) => void;
  onEnd?: () => void;
};

export class SpeechRecognitionService {
  private recognition: any = null;
  private listening = false;

  constructor() {}

  private getRecognizer() {
    const w: any = window;
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
  }

  public isListening() {
    return this.listening;
  }

  public start(lang: 'fa-IR' | 'en-US', cb: SpeechCallbacks): boolean {
    const API = this.getRecognizer();

    if (!API) {
      cb.onError('SpeechRecognition not supported. Please use Chrome or Electron (Chromium-based browser).');
      return false;
    }

    const rec = new API();
    this.recognition = rec;

    rec.lang = lang;
    rec.continuous = true;
    rec.interimResults = true;

    rec.onstart = () => {
      this.listening = true;
      cb.onStart?.();
    };

    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const text = e.results[i][0].transcript.trim();
        cb.onResult(text, e.results[i].isFinal);
      }
    };

    rec.onerror = (e: any) => {
      if (e.error === 'no-speech') {
        return;
      }

      if (e.error === 'network') {
        if (lang === 'fa-IR') {
          cb.onError('Network error: Persian (fa-IR) requires internet connection. Chromium uses cloud-based recognition for Persian.');
        } else {
          cb.onError('Network error: Please check your internet connection.');
        }
        this.listening = false;
        return;
      }

      if (e.error === 'not-allowed') {
        cb.onError('Microphone permission denied');
        this.listening = false;
        return;
      }

      if (e.error === 'service-not-allowed') {
        cb.onError('Speech recognition service is not allowed.');
        this.listening = false;
        return;
      }

      if (e.error === 'audio-capture') {
        cb.onError('Microphone not found or access denied.');
        this.listening = false;
        return;
      }

      if (e.error === 'aborted') {
        return;
      }

      this.listening = false;
      cb.onError(e.error || 'Speech recognition error');
    };

    rec.onend = () => {
      this.listening = false;
      cb.onEnd?.();
    };

    try {
      rec.start();
      return true;
    } catch (err: any) {
      this.listening = false;
      if (err.message && err.message.includes('already started')) {
        return true;
      }
      cb.onError('Failed to start recognition.');
      return false;
    }
  }

  public stop() {
    try {
      if (this.recognition && this.listening) {
        this.recognition.stop();
      }
    } catch {}
    this.listening = false;
  }
}
