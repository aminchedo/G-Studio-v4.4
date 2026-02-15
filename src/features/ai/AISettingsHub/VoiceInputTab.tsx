/**
 * Voice Input Tab - Minimal speech recognition settings (English, dark theme)
 */

import React, { useState, useEffect, useCallback } from "react";
import { AIConfig } from "./types";

const LANGUAGES = [
  { id: "en-US", name: "English" },
  { id: "fa-IR", name: "Persian" },
];

const ENGINES = [
  { id: "webspeech", name: "WebSpeech" },
  { id: "vosk", name: "Vosk" },
] as const;

interface VoiceInputTabProps {
  config: AIConfig;
  updateConfig: <K extends keyof AIConfig>(key: K, value: AIConfig[K]) => void;
}

export const VoiceInputTab: React.FC<VoiceInputTabProps> = ({
  config,
  updateConfig,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);

  useEffect(() => {
    const supported =
      "webkitSpeechRecognition" in window || "SpeechRecognition" in window;
    setSpeechSupported(supported);
  }, []);

  const testVoiceInput = useCallback(() => {
    if (!speechSupported || isListening) {
      if (isListening) setIsListening(false);
      return;
    }
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = config.language;
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      setTranscript(result[0].transcript);
    };
    recognition.start();
  }, [speechSupported, isListening, config.language]);

  return (
    <div className="space-y-2">
      <section className="bg-slate-800/40 rounded-lg border border-slate-700/60 overflow-hidden">
        <div className="px-2.5 py-1.5 border-b border-slate-700/60 flex items-center justify-between">
          <h3 className="text-[10px] font-semibold text-white">Voice input</h3>
          <button
            onClick={() => updateConfig("voiceEnabled", !config.voiceEnabled)}
            className={`relative w-7 h-3.5 rounded-full transition-all ${config.voiceEnabled ? "bg-rose-500" : "bg-slate-600"}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-2.5 h-2.5 bg-white rounded-full transition-transform ${config.voiceEnabled ? "translate-x-3.5" : "translate-x-0"}`}
            />
          </button>
        </div>
        {!speechSupported && (
          <p className="px-2.5 py-1 text-[10px] text-amber-400">
            Use Chrome or Edge.
          </p>
        )}
        {config.voiceEnabled && (
          <div className="p-2 space-y-1.5">
            <div className="flex items-center gap-2">
              <label className="text-[10px] text-slate-400 w-14 shrink-0">
                Language
              </label>
              <select
                value={config.language}
                onChange={(e) => updateConfig("language", e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-[10px] text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.id} value={lang.id}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 w-14 shrink-0">
                Engine
              </span>
              <div className="flex gap-1">
                {ENGINES.map((engine) => (
                  <button
                    key={engine.id}
                    onClick={() =>
                      updateConfig(
                        "voiceEngine",
                        engine.id as "webspeech" | "vosk",
                      )
                    }
                    className={`px-2 py-1 rounded text-[9px] font-medium ${config.voiceEngine === engine.id ? "bg-rose-500/30 text-rose-300 border border-rose-500/50" : "bg-slate-700/50 text-slate-400 border border-transparent"}`}
                  >
                    {engine.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.autoSend}
                  onChange={(e) => updateConfig("autoSend", e.target.checked)}
                  className="rounded border-slate-500 bg-slate-700 text-rose-500 w-3 h-3"
                />
                <span className="text-[10px] text-slate-400">Auto send</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.continuousListening}
                  onChange={(e) =>
                    updateConfig("continuousListening", e.target.checked)
                  }
                  className="rounded border-slate-500 bg-slate-700 text-rose-500 w-3 h-3"
                />
                <span className="text-[10px] text-slate-400">Continuous</span>
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-400">Confidence</span>
                <input
                  type="range"
                  min="0.5"
                  max="0.99"
                  step="0.01"
                  value={config.confidenceThreshold}
                  onChange={(e) =>
                    updateConfig(
                      "confidenceThreshold",
                      parseFloat(e.target.value),
                    )
                  }
                  className="w-16 h-1 rounded accent-rose-500 bg-slate-700"
                />
                <span className="text-[9px] text-slate-500 w-5">
                  {Math.round(config.confidenceThreshold * 100)}%
                </span>
              </div>
            </div>
            <div className="flex items-center justify-between pt-0.5 border-t border-slate-700/50">
              <span className="text-[10px] text-slate-500">
                {isListening
                  ? "Listening…"
                  : transcript || "Click Test and speak."}
              </span>
              <button
                onClick={testVoiceInput}
                disabled={!speechSupported}
                className={`px-2 py-1 rounded text-[9px] font-medium ${isListening ? "bg-rose-500/30 text-rose-300" : "bg-slate-700 text-slate-300 hover:bg-slate-600"} disabled:opacity-50`}
              >
                {isListening ? "Stop" : "Test"}
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
