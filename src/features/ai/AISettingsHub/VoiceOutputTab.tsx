/**
 * Voice Output Tab - Text-to-Speech Configuration
 *
 * Features:
 * - Enable/disable TTS
 * - Voice selection from browser voices
 * - Rate, pitch, and volume controls
 * - Test voice button
 */

import React, { useState, useEffect, useCallback } from "react";
import { AIConfig } from "@/types";

// SVG Icons
const Volume2Icon = () => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  </svg>
);

const PlayIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

const StopIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="14" height="14" x="5" y="5" rx="2" />
  </svg>
);

const UserIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const GaugeIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m12 14 4-4" />
    <path d="M3.34 19a10 10 0 1 1 17.32 0" />
  </svg>
);

const MusicIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </svg>
);

const VolumeIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
  </svg>
);

interface VoiceOutputTabProps {
  config: AIConfig;
  updateConfig: <K extends keyof AIConfig>(key: K, value: AIConfig[K]) => void;
}

interface VoiceOption {
  name: string;
  lang: string;
  voiceURI: string;
}

export const VoiceOutputTab: React.FC<VoiceOutputTabProps> = ({
  config,
  updateConfig,
}) => {
  const [voices, setVoices] = useState<VoiceOption[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(true);

  // Load available voices
  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      setTtsSupported(false);
      return;
    }

    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      const voiceOptions = availableVoices.map((v) => ({
        name: v.name,
        lang: v.lang,
        voiceURI: v.voiceURI,
      }));
      setVoices(voiceOptions);

      // Set default voice if not set
      if (!config.ttsVoice && voiceOptions.length > 0) {
        const defaultVoice =
          voiceOptions.find((v) => v.lang.startsWith("en")) || voiceOptions[0];
        updateConfig("ttsVoice", defaultVoice.name);
      }
    };

    loadVoices();
    speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      speechSynthesis.onvoiceschanged = null;
    };
  }, [config.ttsVoice, updateConfig]);

  // Test TTS
  const testVoice = useCallback(() => {
    if (!ttsSupported) return;

    if (isSpeaking) {
      speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(
      "Hello! This is a test of the text to speech system. I hope you can hear me clearly.",
    );

    const selectedVoice = speechSynthesis
      .getVoices()
      .find((v) => v.name === config.ttsVoice);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.rate = config.ttsRate ?? 1.0;
    utterance.pitch = config.ttsPitch ?? 1.0;
    utterance.volume = config.ttsVolume ?? 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    speechSynthesis.speak(utterance);
  }, [
    ttsSupported,
    isSpeaking,
    config.ttsVoice,
    config.ttsRate ?? 1.0,
    config.ttsPitch ?? 1.0,
    config.ttsVolume ?? 1.0,
  ]);

  return (
    <div className="space-y-2">
      <section className="bg-slate-800/40 rounded-lg border border-slate-700/60 overflow-hidden">
        <div className="px-2.5 py-1.5 border-b border-slate-700/60 flex items-center justify-between">
          <h3 className="text-[10px] font-semibold text-white">
            Voice output (TTS)
          </h3>
          <button
            onClick={() => updateConfig("ttsEnabled", !config.ttsEnabled)}
            className={`relative w-7 h-3.5 rounded-full transition-all ${config.ttsEnabled ? "bg-indigo-500" : "bg-slate-600"}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 bg-white rounded-full transition-transform ${config.ttsEnabled ? "translate-x-3.5" : "translate-x-0"}`}
            />
          </button>
        </div>
        {!ttsSupported && (
          <p className="px-2.5 py-1 text-[10px] text-amber-400">
            TTS not supported in this browser.
          </p>
        )}
        {config.ttsEnabled && (
          <div className="p-2 space-y-1.5">
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-slate-400 w-12 shrink-0">
                Voice
              </label>
              <select
                value={config.ttsVoice}
                onChange={(e) => updateConfig("ttsVoice", e.target.value)}
                className="flex-1 min-w-0 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-[10px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                {voices.length === 0 ? (
                  <option value="">Loading…</option>
                ) : (
                  voices.map((v) => (
                    <option key={v.voiceURI} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))
                )}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-slate-400 w-12 shrink-0">
                Speed
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={config.ttsRate ?? 1.0}
                onChange={(e) =>
                  updateConfig("ttsRate", parseFloat(e.target.value))
                }
                className="flex-1 h-1 rounded accent-indigo-500 bg-slate-700"
              />
              <span className="text-[9px] text-slate-400 w-6">
                {(config.ttsRate ?? 1).toFixed(1)}x
              </span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-slate-400 w-12 shrink-0">
                Pitch
              </label>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={config.ttsPitch ?? 1.0}
                onChange={(e) =>
                  updateConfig("ttsPitch", parseFloat(e.target.value))
                }
                className="flex-1 h-1 rounded accent-indigo-500 bg-slate-700"
              />
              <span className="text-[9px] text-slate-400 w-5">
                {(config.ttsPitch ?? 1).toFixed(1)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-slate-400 w-12 shrink-0">
                Volume
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.ttsVolume ?? 1.0}
                onChange={(e) =>
                  updateConfig("ttsVolume", parseFloat(e.target.value))
                }
                className="flex-1 h-1 rounded accent-indigo-500 bg-slate-700"
              />
              <span className="text-[9px] text-slate-400 w-6">
                {Math.round((config.ttsVolume ?? 1) * 100)}%
              </span>
            </div>
            <div className="flex items-center justify-between pt-0.5 border-t border-slate-700/50">
              <span className="text-[10px] text-slate-400">Auto speak</span>
              <button
                onClick={() => updateConfig("autoSpeak", !config.autoSpeak)}
                className={`relative w-7 h-3.5 rounded-full transition-all ${config.autoSpeak ? "bg-indigo-500" : "bg-slate-600"}`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 bg-white rounded-full transition-transform ${config.autoSpeak ? "translate-x-3.5" : "translate-x-0"}`}
                />
              </button>
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <span className="text-[10px] text-slate-500">
                {isSpeaking ? "Speaking…" : "Test voice"}
              </span>
              <button
                onClick={testVoice}
                disabled={!ttsSupported}
                className={`px-2 py-1 rounded text-[9px] font-medium ${isSpeaking ? "bg-red-500/30 text-red-300" : "bg-slate-700 text-slate-300 hover:bg-slate-600"} disabled:opacity-50`}
              >
                {isSpeaking ? <StopIcon /> : <PlayIcon />}{" "}
                {isSpeaking ? "Stop" : "Play"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
