import { SpeechRecognitionService } from './SpeechRecognitionService';

const speech = new SpeechRecognitionService();

function startSpeech() {
  // انتخاب زبان: اگر آنلاین بود فارسی، اگر آفلاین انگلیسی
  const lang = navigator.onLine ? 'fa-IR' : 'en-US';

  // قبل از شروع، بررسی کنیم که SpeechRecognition موجود است
  if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
    console.error('SpeechRecognition API is not available in this environment.');
    return;
  }

  speech.start(lang, {
    onStart() {
      console.log('[Speech] Started');
    },
    onResult(text, final) {
      if (final) {
        console.log('[Speech] Final result:', text);
      } else {
        console.log('[Speech] Interim result:', text);
      }
    },
    onError(err) {
      console.error('[Speech] Error:', err);

      // اگر خطای network بود، هشدار بده
      if (err.includes('network') || err.includes('Network')) {
        console.warn('[Speech] Network error detected. Persian (fa-IR) requires internet connection.');
      }
    },
    onEnd() {
      console.log('[Speech] Ended');

      // اگر هنوز آنلاین هستیم، می‌توانیم خودکار دوباره شروع کنیم
      if (navigator.onLine) {
        console.log('[Speech] Restarting...');
        setTimeout(() => startSpeech(), 500); // تاخیر کوتاه قبل از restart
      }
    }
  });
}

// expose to window for debugging / renderer calls
(window as any).startSpeech = startSpeech;
