/**
 * Voice Chat Modal with AI Avatar - Persian & English Voice Chat with Gemini
 *
 * Features:
 * - Persian (fa-IR) and English speech recognition
 * - Text-to-speech in both languages
 * - Real-time transcription
 * - Animated AI Avatar with emotional states
 * - Markdown message rendering
 * - Synchronized with G-Studio theme
 *
 * MIGRATION NOTE: TTS guarded for missing speechSynthesis (no crash when API unavailable).
 */

import React, { useState, useEffect, useRef } from "react";
import { X, Mic, MicOff, Sparkles, Loader2, Globe } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import AIAvatar, { Emotion } from "@/components/voice/AIAvatar";

interface VoiceChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey?: string;
}

interface Message {
  role: "user" | "model";
  text: string;
  timestamp: number;
}

export const VoiceChatModal: React.FC<VoiceChatModalProps> = ({
  isOpen,
  onClose,
  apiKey: propApiKey,
}) => {
  const [apiKey, setApiKey] = useState(
    () => propApiKey || localStorage.getItem("gemini_api_key") || "",
  );
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [language, setLanguage] = useState<"fa-IR" | "en-US">("fa-IR");
  const [emotion, setEmotion] = useState<Emotion>("idle");

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<SpeechSynthesis>(window.speechSynthesis);

  // Use our custom speech recognition hook
  const {
    isListening,
    transcript,
    error: speechError,
    startListening,
    stopListening,
    reset: resetSpeech,
    isSupported,
  } = useSpeechRecognition({
    lang: language,
    continuous: true,
    interimResults: true,
    onResult: (text, isFinal) => {
      if (isFinal) {
        handleSend(text);
      }
    },
    onError: (error) => {
      console.error("[VoiceChat] Speech recognition error:", error);
      setEmotion("confused");
    },
  });

  // Update emotion based on state
  useEffect(() => {
    if (isListening) {
      setEmotion("listening");
    } else if (isLoading) {
      setEmotion("thinking");
    } else if (isSpeaking) {
      setEmotion("happy");
    } else {
      setEmotion("idle");
    }
  }, [isListening, isLoading, isSpeaking]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages, transcript]);

  // Cleanup on close
  useEffect(() => {
    if (!isOpen) {
      stopListening();
      synthRef.current.cancel();
      setIsSpeaking(false);
      setEmotion("idle");
    }
  }, [isOpen, stopListening]);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem("gemini_api_key", key);
  };

  const toggleLanguage = () => {
    const newLang = language === "fa-IR" ? "en-US" : "fa-IR";
    setLanguage(newLang);
    if (isListening) {
      stopListening();
    }
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || !apiKey) return;

    stopListening();
    resetSpeech();

    const userMessage: Message = {
      role: "user",
      text: text.trim(),
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setEmotion("thinking");

    try {
      const languageInstruction =
        language === "fa-IR"
          ? " (لطفاً به فارسی پاسخ دهید)"
          : " (Please answer in English)";

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: text + languageInstruction }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 1024,
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();
      const reply =
        data.candidates?.[0]?.content?.parts?.[0]?.text || "خطا در دریافت پاسخ";

      const modelMessage: Message = {
        role: "model",
        text: reply,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, modelMessage]);
      setEmotion("happy");
      speak(reply);
    } catch (error: any) {
      const errorMessage: Message = {
        role: "model",
        text: `خطا: ${error.message || "اتصال به Gemini برقرار نشد"}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      setEmotion("confused");
    } finally {
      setIsLoading(false);
    }
  };

  const speak = (text: string) => {
    if (
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      !synthRef.current
    )
      return;
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    utterance.onstart = () => {
      setIsSpeaking(true);
      setEmotion("happy");
    };
    utterance.onend = () => {
      setIsSpeaking(false);
      setEmotion("idle");
    };
    utterance.onerror = () => {
      setIsSpeaking(false);
      setEmotion("confused");
    };

    synthRef.current.speak(utterance);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center animate-in fade-in duration-200">
      <div className="bg-white w-[500px] h-[700px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="h-16 border-b border-slate-200 flex items-center justify-between px-6 bg-gradient-to-r from-indigo-50 to-purple-50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-lg">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="font-bold text-slate-800 text-base">
                گفتگوی صوتی
              </h2>
              <p className="text-[10px] text-slate-500 font-medium">
                Voice Chat with Gemini
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg transition-colors flex items-center gap-1.5"
              title={
                language === "fa-IR" ? "Switch to English" : "تغییر به فارسی"
              }
            >
              <Globe size={16} />
              <span className="text-xs font-semibold">
                {language === "fa-IR" ? "FA" : "EN"}
              </span>
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* API Key Setup */}
        {!apiKey && (
          <div className="p-6 flex flex-col flex-1 items-center justify-center text-center">
            <div className="mb-6">
              <AIAvatar
                isListening={false}
                isSpeaking={false}
                emotion="confused"
                size="medium"
              />
            </div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">
              تنظیم کلید API
            </h3>
            <p className="text-sm text-slate-600 mb-6 max-w-xs">
              لطفاً کلید API گوگل جمینی خود را وارد کنید
            </p>
            <input
              type="password"
              placeholder="کلید API را اینجا وارد کنید..."
              className="w-full max-w-sm px-4 py-3 rounded-xl border border-slate-200 mb-4 focus:ring-2 focus:ring-indigo-500 outline-none"
              onChange={(e) => saveApiKey(e.target.value)}
            />
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-indigo-500 hover:underline"
            >
              دریافت کلید API از Google AI Studio
            </a>
          </div>
        )}

        {/* Chat Area */}
        {apiKey && (
          <>
            {/* AI Avatar at Top */}
            <div className="py-4 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100">
              <AIAvatar
                isListening={isListening}
                isSpeaking={isSpeaking}
                emotion={emotion}
                size="medium"
              />
            </div>

            <div
              className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50"
              ref={chatContainerRef}
            >
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Sparkles size={48} className="mb-4 text-indigo-300" />
                  <p className="text-center text-sm">
                    {language === "fa-IR"
                      ? "برای شروع گفتگو، دکمه میکروفون را فشار دهید"
                      : "Press the microphone button to start chatting"}
                  </p>
                  {!isSupported && (
                    <p className="text-xs text-red-500 mt-2">
                      Speech recognition not supported in this browser
                    </p>
                  )}
                </div>
              )}

              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-indigo-600 text-white rounded-br-sm shadow-md"
                        : "bg-white border border-slate-200 text-slate-700 rounded-bl-sm shadow-sm"
                    }`}
                    dir="auto"
                  >
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                </div>
              ))}

              {(isListening || isLoading) && (
                <div className="flex justify-end">
                  <div className="bg-slate-200 text-slate-600 px-4 py-2 rounded-2xl rounded-br-sm text-xs flex items-center gap-2">
                    {isLoading ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    )}
                    {transcript ||
                      (isLoading ? "در حال فکر کردن..." : "در حال گوش دادن...")}
                  </div>
                </div>
              )}

              {speechError && (
                <div className="flex justify-center">
                  <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-xs">
                    {speechError}
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="p-6 bg-white border-t border-slate-200 flex flex-col items-center relative">
              {/* Visualizer Background */}
              {(isListening || isSpeaking) && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10 overflow-hidden">
                  <div
                    className={`w-96 h-96 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full blur-3xl transition-all duration-500 ${
                      isListening ? "scale-110 animate-pulse" : "scale-100"
                    }`}
                  />
                </div>
              )}

              <div className="flex items-center gap-6 relative z-10">
                <button
                  onClick={toggleListening}
                  disabled={!isSupported}
                  className={`
                    w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-all duration-300
                    ${
                      isListening
                        ? "bg-red-500 text-white shadow-red-200 scale-110 ring-4 ring-red-100"
                        : "bg-white text-slate-700 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 hover:shadow-indigo-100"
                    }
                    ${!isSupported ? "opacity-50 cursor-not-allowed" : ""}
                  `}
                >
                  {isListening ? <MicOff size={32} /> : <Mic size={32} />}
                </button>
              </div>

              <p className="mt-4 text-xs font-medium text-slate-500">
                {isListening
                  ? language === "fa-IR"
                    ? "برای توقف ضبط کلیک کنید"
                    : "Tap to stop recording"
                  : language === "fa-IR"
                    ? "برای شروع ضبط کلیک کنید"
                    : "Tap microphone to speak"}
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VoiceChatModal;
