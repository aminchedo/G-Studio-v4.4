/**
 * Voice Store
 * Manages voice interaction state (STT + TTS).
 * MIGRATION NOTE: Integrated from master-update. Uses existing SpeechRecognitionService
 * and VoskRendererService. TTS does not crash if speechSynthesis unavailable.
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { SpeechRecognitionService } from "../services/speechRecognitionService";
import { voskRendererService } from "../services/VoskRendererService";

const speechRecognitionService = new SpeechRecognitionService();

export type VoiceState =
  | "idle"
  | "listening"
  | "processing"
  | "speaking"
  | "thinking";

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
  currentState: VoiceState;
  isListening: boolean;
  isSpeaking: boolean;
  isProcessing: boolean;
  audioLevel: number;
  waveformData: number[];
  currentTranscript: string;
  interimTranscript: string;
  confidence: number;
  settings: VoiceSettings;
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
  language: "en-US",
  voice: "Google US English Female",
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
        currentState: "idle",
        isListening: false,
        isSpeaking: false,
        isProcessing: false,
        audioLevel: 0,
        waveformData: new Array(32).fill(0),
        currentTranscript: "",
        interimTranscript: "",
        confidence: 0,
        settings: defaultSettings,

        setState: (state) => set({ currentState: state }),

        startListening: async () => {
          const { settings, updateTranscript, stopListening } = get();
          set({
            currentState: "listening",
            isListening: true,
            currentTranscript: "",
            interimTranscript: "",
          });

          const voskAvailable = await voskRendererService.isAvailable();
          const language = (settings.language as "fa-IR" | "en-US") || "en-US";

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
                console.error("[VoiceStore] Speech recognition error:", error);
                if (voskAvailable) {
                  console.log("[VoiceStore] Falling back to Vosk (offline)...");
                  const voskSuccess = await voskRendererService.start(
                    language,
                    {
                      onResult: (text) => {
                        updateTranscript(text, false);
                      },
                      onError: (voskError) => {
                        console.error("[VoiceStore] Vosk error:", voskError);
                        stopListening();
                      },
                    },
                  );
                  if (!voskSuccess) {
                    stopListening();
                  }
                } else {
                  stopListening();
                }
              },
              onEnd: () => {
                if (!voskRendererService.getIsListening()) {
                  if (!settings.continuousMode) {
                    set({ currentState: "idle", isListening: false });
                  }
                }
              },
            },
          );

          if (!success && voskAvailable) {
            await voskRendererService.start(language, {
              onResult: (text) => {
                updateTranscript(text, false);
              },
              onError: (voskError) => {
                console.error("[VoiceStore] Vosk error:", voskError);
                stopListening();
              },
            });
          } else if (!success) {
            stopListening();
          }
        },

        stopListening: async () => {
          set({
            currentState: "idle",
            isListening: false,
            interimTranscript: "",
          });
          speechRecognitionService.stop();
          await voskRendererService.stop();
        },

        startSpeaking: async (text: string) => {
          set({ currentState: "speaking", isSpeaking: true });

          if (typeof window === "undefined" || !("speechSynthesis" in window)) {
            set({ currentState: "idle", isSpeaking: false });
            return;
          }

          try {
            const utterance = new SpeechSynthesisUtterance(text);
            const settings = get().settings;

            utterance.lang = settings.language;
            utterance.rate = settings.speechRate;
            utterance.pitch = settings.pitch;
            utterance.volume = settings.volume;

            const voices = window.speechSynthesis.getVoices();
            const voice =
              voices.find((v) => v.name === settings.voice) || voices[0];
            if (voice) utterance.voice = voice;

            utterance.onend = () => {
              get().stopSpeaking();
              if (get().settings.autoListen) {
                setTimeout(() => get().startListening(), 500);
              }
            };

            utterance.onerror = () => {
              get().stopSpeaking();
            };

            window.speechSynthesis.speak(utterance);
          } catch {
            set({ currentState: "idle", isSpeaking: false });
          }
        },

        stopSpeaking: () => {
          set({ currentState: "idle", isSpeaking: false });
          if (typeof window !== "undefined" && "speechSynthesis" in window) {
            window.speechSynthesis.cancel();
          }
        },

        updateTranscript: (transcript: string, interim: boolean) => {
          if (interim) {
            set({ interimTranscript: transcript });
          } else {
            set({
              currentTranscript: transcript,
              interimTranscript: "",
              currentState: "processing",
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
            currentState: "idle",
            isListening: false,
            isSpeaking: false,
            isProcessing: false,
            currentTranscript: "",
            interimTranscript: "",
            confidence: 0,
          });
        },
      }),
      {
        name: "voice-store",
        partialize: (state) => ({
          settings: state.settings,
        }),
      },
    ),
    { name: "VoiceStore" },
  ),
);

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length)
      console.log(
        "Available voices:",
        voices.map((v) => v.name),
      );
  };
}
