import { useState, useCallback, useRef, useEffect } from 'react';

// Web Speech API type declarations
interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
};

declare var webkitSpeechRecognition: {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
};

interface UseSpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

interface SpeechRecognitionError extends Error {
  error?: string;
}

/**
 * Browser-native Web Speech API hook for speech recognition
 * Supports Persian (fa-IR) and other languages with zero external API dependencies
 * 
 * Browser Compatibility:
 * - Chrome/Edge: Full support
 * - Firefox: Not supported (requires speech recognition extension)
 * - Safari: Partial support
 */
export const useSpeechRecognition = (options: UseSpeechRecognitionOptions = {}) => {
  const {
    lang = 'fa-IR',
    continuous = false,
    interimResults = false,
    onResult,
    onError
  } = options;

  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isInitializedRef = useRef(false);

  /**
   * Initialize SpeechRecognition instance
   */
  const initializeRecognition = useCallback(() => {
    // Check for browser support
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognitionAPI) {
      const errorMsg = 'Browser does not support the Web Speech API. Please use Chrome or Edge.';
      setError(errorMsg);
      onError?.(errorMsg);
      return null;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = lang;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.onerror = (event: SpeechRecognitionError) => {
        setIsListening(false);
        
        const errorMessages: { [key: string]: string } = {
          'no-speech': 'No speech was detected. Please try again.',
          'audio-capture': 'No microphone was found or access was denied.',
          'not-allowed': 'Microphone permission was denied. Please enable it in your browser settings.',
          'aborted': 'Speech recognition was aborted.',
          'network': 'Network error occurred during speech recognition.',
          'service-not-allowed': 'Speech recognition service is not allowed.',
          'bad-grammar': 'Bad grammar error.',
          'language-not-supported': `Language '${lang}' is not supported.`
        };
        
        const errorMsg = errorMessages[event.error || ''] || `Speech recognition error: ${event.error || 'unknown'}`;
        setError(errorMsg);
        onError?.(errorMsg);
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setTranscript(prev => prev + (prev && !prev.endsWith(' ') ? ' ' : '') + finalTranscript);
          onResult?.(finalTranscript, true);
        }

        if (interimTranscript && interimResults) {
          onResult?.(interimTranscript, false);
        }
      };

      return recognition;
    } catch (err) {
      const errorMsg = `Failed to initialize speech recognition: ${err instanceof Error ? err.message : String(err)}`;
      setError(errorMsg);
      onError?.(errorMsg);
      return null;
    }
  }, [lang, continuous, interimResults, onResult, onError]);

  /**
   * Start listening for speech input
   * Requests microphone permission if needed
   */
  const startListening = useCallback(async () => {
    // Reset error and transcript
    setError(null);
    setTranscript('');

    // Request microphone permission first
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop the stream immediately - we only needed permission
      stream.getTracks().forEach(track => track.stop());
    } catch (permissionError: any) {
      const errorMsg = permissionError?.message || 'Microphone permission was denied';
      setError(errorMsg);
      onError?.(errorMsg);
      return;
    }

    // Initialize recognition if not already done
    if (!recognitionRef.current || !isInitializedRef.current) {
      recognitionRef.current = initializeRecognition();
      isInitializedRef.current = true;
    }

    if (!recognitionRef.current) {
      return;
    }

    try {
      recognitionRef.current.start();
    } catch (err: any) {
      // Handle "already started" errors gracefully
      if (err.name === 'InvalidStateError' || err.message?.includes('started')) {
        // Try to stop and restart
        try {
          recognitionRef.current.stop();
          setTimeout(() => {
            recognitionRef.current?.start();
          }, 100);
        } catch (restartErr) {
          const errorMsg = 'Failed to start speech recognition. Please try again.';
          setError(errorMsg);
          onError?.(errorMsg);
        }
      } else {
        const errorMsg = `Failed to start speech recognition: ${err?.message || String(err)}`;
        setError(errorMsg);
        onError?.(errorMsg);
      }
    }
  }, [initializeRecognition, onError]);

  /**
   * Stop listening for speech input
   */
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // Ignore errors when stopping
        console.warn('Error stopping speech recognition:', err);
      }
    }
    setIsListening(false);
  }, []);

  /**
   * Reset transcript and error state
   */
  const reset = useCallback(() => {
    setTranscript('');
    setError(null);
    setIsListening(false);
  }, []);

  /**
   * Check if browser supports Web Speech API
   */
  const isSupported = typeof window !== 'undefined' && 
    (!!(window as any).SpeechRecognition || !!(window as any).webkitSpeechRecognition);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore cleanup errors
        }
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    reset,
    isSupported
  };
};

