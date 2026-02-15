/**
 * Voice Store
 * Manages voice interaction state
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { SpeechRecognitionService } from '../services/speechRecognitionService';
import { voskRendererService } from '../services/VoskRendererService';

// Create service instances
const speechRecognitionService = new SpeechRecognitionService();

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'thinking';

export interface VoiceSettings {
  language: string;
  voice: string;
  speechRate: number;
  pitch: number;
  volume: number;
  autoListen: boolean;
  continuousMode: boolean;
}

interface VoiceStore {
  // Current state
  currentState: VoiceState;
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  
  // Audio data
  audioLevel: number;
  waveformData: number[];
  
  // Transcript
  currentTranscript: string;
  interimTranscript: string;
  confidence: number;
  
  // Settings
  settings: VoiceSettings;
  
  // Actions
  setState: (state: VoiceState) => void;
  startListening: () => void;
  stopListening: () => void;
  startSpeaking: (text: string) => Promise<void>;
  stopSpeaking: () => void;
  updateTranscript: (transcript: string, interim: boolean) => void;
  updateAudioLevel: (level: number) => void;
  updateSettings: (settings: Partial<VoiceSettings>) => void;
  reset: () => void;
}

const defaultSettings: VoiceSettings = {
  language: 'en-US',
  voice: 'Google US English Female',
  speechRate: 1.0,
  pitch: 1.0,
  volume: 1.0,
  autoListen: true,
  continuousMode: true,
};

export const useVoiceStore = create<VoiceStore>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        currentState: 'idle',
        isListening: false,
        isSpeaking: false,
        isProcessing: false,
        audioLevel: 0,
        waveformData: new Array(32).fill(0),
        currentTranscript: '',
        interimTranscript: '',
        confidence: 0,
        settings: defaultSettings,

        // Actions
        setState: (state) => set({ currentState: state }),

        startListening: async () => {
          const { settings, updateTranscript, stopListening } = get();
          
          set({
            currentState: 'listening',
            isListening: true,
            currentTranscript: '',
            interimTranscript: '',
          });

          // Check if Vosk is available for fallback
          const voskAvailable = await voskRendererService.isAvailable();
          const language = (settings.language as 'fa-IR' | 'en-US') || 'en-US';

          // Try Web Speech API first via SpeechRecognitionService
          const success = speechRecognitionService.start(
            {
              lang: settings.language,
              continuous: settings.continuousMode,
              interimResults: true,
            },
            {
              onResult: (transcript, isFinal) => {
                updateTranscript(transcript, !isFinal);
              },
              onError: async (error) => {
                console.error('[VoiceStore] Speech recognition error:', error);
                
                // Fallback to Vosk if Web Speech API fails (e.g. network error)
                if (voskAvailable) {
                  console.log('[VoiceStore] Falling back to Vosk (offline)...');
                  const voskSuccess = await voskRendererService.start(language, {
                    onResult: (text) => {
                      updateTranscript(text, false);
                    },
                    onError: (voskError) => {
                      console.error('[VoiceStore] Vosk error:', voskError);
                      stopListening();
                    }
                  });

                  if (!voskSuccess) {
                    stopListening();
                  }
                } else {
                  stopListening();
                }
              },
              onEnd: () => {
                // Only set idle if not currently listening via Vosk
                if (!voskRendererService.getIsListening()) {
                  // If continuous mode is off, we stop
                  if (!settings.continuousMode) {
                    set({ currentState: 'idle', isListening: false });
                  }
                }
              }
            }
          );

          if (!success && voskAvailable) {
            // Immediately try Vosk if Web Speech API failed to start
            await voskRendererService.start(language, {
              onResult: (text) => {
                updateTranscript(text, false);
              },
              onError: (voskError) => {
                console.error('[VoiceStore] Vosk error:', voskError);
                stopListening();
              }
            });
          } else if (!success) {
            stopListening();
          }
        },

        stopListening: async () => {
          set({
            currentState: 'idle',
            isListening: false,
            interimTranscript: '',
          });

          // Stop both services
          speechRecognitionService.stop();
          await voskRendererService.stop();
        },

        startSpeaking: async (text: string) => {
          set({ currentState: 'speaking', isSpeaking: true });

          // Use Web Speech API for TTS
          if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(text);
            const settings = get().settings;

            utterance.lang = settings.language;
            utterance.rate = settings.speechRate;
            utterance.pitch = settings.pitch;
            utterance.volume = settings.volume;

            // Find matching voice
            const voices = window.speechSynthesis.getVoices();
            const voice = voices.find(v => v.name === settings.voice) || voices[0];
            if (voice) utterance.voice = voice;

            utterance.onend = () => {
              get().stopSpeaking();
              
              // Auto-resume listening if enabled
              if (get().settings.autoListen) {
                setTimeout(() => get().startListening(), 500);
              }
            };

            utterance.onerror = () => {
              get().stopSpeaking();
            };

            window.speechSynthesis.speak(utterance);
          }
        },

        stopSpeaking: () => {
          set({ currentState: 'idle', isSpeaking: false });
          
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
        },

        updateTranscript: (transcript: string, interim: boolean) => {
          if (interim) {
            set({ interimTranscript: transcript });
          } else {
            set({
              currentTranscript: transcript,
              interimTranscript: '',
              currentState: 'processing',
            });
          }
        },

        updateAudioLevel: (level: number) => {
          const { waveformData } = get();
          const newWaveform = [...waveformData.slice(1), level];
          set({ audioLevel: level, waveformData: newWaveform });
        },

        updateSettings: (newSettings) => {
          set((state) => ({
            settings: { ...state.settings, ...newSettings },
          }));
        },

        reset: () => {
          get().stopListening();
          get().stopSpeaking();
          set({
            currentState: 'idle',
            isListening: false,
            isSpeaking: false,
            isProcessing: false,
            currentTranscript: '',
            interimTranscript: '',
            confidence: 0,
          });
        },
      }),
      {
        name: 'voice-store',
        partialize: (state) => ({
          settings: state.settings,
        }),
      }
    ),
    { name: 'VoiceStore' }
  )
);

// Load voices when available
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    const voices = window.speechSynthesis.getVoices();
    console.log('Available voices:', voices.map(v => v.name));
  };
}
