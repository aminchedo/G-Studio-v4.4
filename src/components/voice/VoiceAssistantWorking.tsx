import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

interface VoiceAssistantProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  isEnabled?: boolean;
  /** Speech recognition language (e.g. "fa-IR" for Persian). */
  lang?: string;
}

export const VoiceAssistant: React.FC<VoiceAssistantProps> = ({
  onTranscript,
  onError,
  isEnabled = true,
  lang = "fa-IR",
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check browser support
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      setError("Speech recognition not supported in this browser");
      return;
    }

    // Initialize speech recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang;

    recognition.onstart = () => {
      console.log("🎤 Voice recognition started");
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let interim = "";
      let final = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + " ";
        } else {
          interim += transcript;
        }
      }

      if (final) {
        console.log("✅ Final transcript:", final);
        setTranscript((prev) => prev + final);
        onTranscript(final.trim());
      }

      setInterimTranscript(interim);
    };

    recognition.onerror = (event: any) => {
      console.error("❌ Speech recognition error:", event.error);
      let errorMsg = "Voice recognition error";

      switch (event.error) {
        case "not-allowed":
          errorMsg =
            "Microphone access denied. Please allow microphone access.";
          break;
        case "no-speech":
          errorMsg = "No speech detected. Please try again.";
          break;
        case "network":
          errorMsg = "Network error. Check your connection.";
          break;
        default:
          errorMsg = `Error: ${event.error}`;
      }

      setError(errorMsg);
      onError?.(errorMsg);
      setIsListening(false);
    };

    recognition.onend = () => {
      console.log("🎤 Voice recognition ended");
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscript, onError, lang]);

  // Sync with parent mic button: start when isEnabled turns true, stop when false
  useEffect(() => {
    if (!recognitionRef.current) return;
    if (isEnabled) {
      setTranscript("");
      setInterimTranscript("");
      setError(null);
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn("Voice start error:", e);
      }
    } else {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
  }, [isEnabled]);

  const startListening = () => {
    if (!isSupported || !recognitionRef.current) {
      setError("Speech recognition not available");
      return;
    }

    try {
      setTranscript("");
      setInterimTranscript("");
      setError(null);
      recognitionRef.current.start();
    } catch (err) {
      console.error("Failed to start recognition:", err);
      setError("Failed to start voice recognition");
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const handleToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
        <AlertCircle className="w-4 h-4 text-red-400" />
        <span className="text-xs text-red-400">Voice not supported</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Voice Button */}
      <button
        onClick={handleToggle}
        disabled={!isEnabled}
        className={`relative p-4 rounded-xl transition-all ${
          isListening
            ? "bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/50"
            : "bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-500/20"
        } disabled:opacity-50 disabled:cursor-not-allowed`}
        title={isListening ? "Stop listening" : "Start voice input"}
      >
        {isListening ? (
          <>
            <MicOff className="w-6 h-6 text-white" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </>
        ) : (
          <Mic className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Status Indicator */}
      {isListening && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <div className="flex gap-1">
            <div
              className="w-1 h-4 bg-red-400 rounded-full animate-pulse"
              style={{ animationDelay: "0ms" }}
            />
            <div
              className="w-1 h-4 bg-red-400 rounded-full animate-pulse"
              style={{ animationDelay: "150ms" }}
            />
            <div
              className="w-1 h-4 bg-red-400 rounded-full animate-pulse"
              style={{ animationDelay: "300ms" }}
            />
          </div>
          <span className="text-xs text-red-400 font-medium">Listening...</span>
        </div>
      )}

      {/* Transcript Display */}
      {(transcript || interimTranscript) && (
        <div className="px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg">
          <div className="text-sm text-white">
            {transcript}
            <span className="text-slate-400 italic">{interimTranscript}</span>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-xs text-red-400">{error}</span>
        </div>
      )}
    </div>
  );
};

// Text-to-Speech Component
export const TextToSpeech: React.FC<{ text: string; autoPlay?: boolean }> = ({
  text,
  autoPlay = false,
}) => {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    if (!("speechSynthesis" in window)) {
      setIsSupported(false);
    }
  }, []);

  useEffect(() => {
    if (autoPlay && text && isSupported) {
      speak();
    }
  }, [text, autoPlay]);

  const speak = () => {
    if (!isSupported || !text) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const stop = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  if (!isSupported) return null;

  return (
    <button
      onClick={isSpeaking ? stop : speak}
      className="p-2 hover:bg-white/10 rounded-lg transition-colors"
      title={isSpeaking ? "Stop speaking" : "Read aloud"}
    >
      {isSpeaking ? (
        <VolumeX className="w-4 h-4 text-purple-400" />
      ) : (
        <Volume2 className="w-4 h-4 text-slate-400" />
      )}
    </button>
  );
};
