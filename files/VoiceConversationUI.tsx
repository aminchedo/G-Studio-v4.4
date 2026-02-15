import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Loader2, Settings, Play, Square } from 'lucide-react';

interface VoiceConversationProps {
  onTranscript?: (text: string) => void;
  onSpeechEnd?: () => void;
  enabled?: boolean;
}

export const VoiceConversationUI: React.FC<VoiceConversationProps> = ({
  onTranscript,
  onSpeechEnd,
  enabled = true
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [volume, setVolume] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [showSettings, setShowSettings] = useState(false);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize speech recognition
  useEffect(() => {
    if (!enabled) return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let interimText = '';
      let finalText = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalText += transcriptPart + ' ';
        } else {
          interimText += transcriptPart;
        }
      }

      if (finalText) {
        setTranscript(prev => prev + finalText);
        if (onTranscript) {
          onTranscript(finalText.trim());
        }
      }
      setInterimTranscript(interimText);
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setError(`Recognition error: ${event.error}`);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (onSpeechEnd) {
        onSpeechEnd();
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [enabled, onTranscript, onSpeechEnd]);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setAvailableVoices(voices);
      
      // Select default English voice
      const defaultVoice = voices.find(v => v.lang.startsWith('en') && v.default) || voices[0];
      setSelectedVoice(defaultVoice);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  // Setup audio visualization
  const setupAudioVisualization = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      visualizeAudio();
    } catch (err) {
      console.error('Error setting up audio:', err);
    }
  };

  const visualizeAudio = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateVolume = () => {
      if (!analyserRef.current || !isListening) return;

      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setVolume(average / 255);

      animationFrameRef.current = requestAnimationFrame(updateVolume);
    };

    updateVolume();
  };

  const startListening = async () => {
    if (!recognitionRef.current || !voiceEnabled) return;

    try {
      await setupAudioVisualization();
      recognitionRef.current.start();
      setTranscript('');
      setInterimTranscript('');
    } catch (err) {
      console.error('Error starting recognition:', err);
      setError('Failed to start listening');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    setVolume(0);
  };

  const speak = (text: string) => {
    if (!ttsEnabled || !text) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = (e) => {
      console.error('Speech synthesis error:', e);
      setIsSpeaking(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const clearTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
  };

  // Expose speak function for external use
  useEffect(() => {
    (window as any).__voiceConversation = {
      speak,
      stopSpeaking,
      isListening,
      isSpeaking
    };
  }, [isListening, isSpeaking]);

  return (
    <div className="voice-conversation-ui bg-gray-900 border border-gray-700 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Volume2 className="w-5 h-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-white">Voice Conversation</h3>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Settings className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-4 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-300">Voice Input</label>
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`px-3 py-1 rounded text-xs ${
                  voiceEnabled ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'
                }`}
              >
                {voiceEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-gray-300">Voice Output</label>
              <button
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={`px-3 py-1 rounded text-xs ${
                  ttsEnabled ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400'
                }`}
              >
                {ttsEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            <div>
              <label className="text-sm text-gray-300 mb-2 block">Voice</label>
              <select
                value={selectedVoice?.name || ''}
                onChange={(e) => {
                  const voice = availableVoices.find(v => v.name === e.target.value);
                  setSelectedVoice(voice || null);
                }}
                className="w-full bg-gray-700 text-white text-sm px-3 py-2 rounded border border-gray-600 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {availableVoices.map(voice => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-900/20 border border-red-700 rounded-lg">
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Voice Controls */}
      <div className="flex items-center gap-4 mb-4">
        <button
          onClick={toggleListening}
          disabled={!voiceEnabled}
          className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-lg font-medium transition-all ${
            isListening
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-purple-600 hover:bg-purple-700 text-white disabled:bg-gray-700 disabled:text-gray-500'
          }`}
        >
          {isListening ? (
            <>
              <MicOff className="w-5 h-5" />
              <span>Stop Listening</span>
            </>
          ) : (
            <>
              <Mic className="w-5 h-5" />
              <span>Start Listening</span>
            </>
          )}
        </button>

        {isSpeaking && (
          <button
            onClick={stopSpeaking}
            className="px-6 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Square className="w-5 h-5" />
            <span>Stop Speaking</span>
          </button>
        )}
      </div>

      {/* Volume Visualization */}
      {isListening && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Volume2 className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">Audio Level</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-purple-600 transition-all duration-100"
              style={{ width: `${volume * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Transcript Display */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-400">Transcript</span>
          {transcript && (
            <button
              onClick={clearTranscript}
              className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>

        <div className="min-h-[100px] max-h-[200px] overflow-y-auto text-white">
          {transcript || interimTranscript ? (
            <div>
              <p className="text-gray-100">{transcript}</p>
              {interimTranscript && (
                <p className="text-gray-400 italic">{interimTranscript}</p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              {isListening ? 'Listening... speak now' : 'Click "Start Listening" to begin'}
            </p>
          )}
        </div>
      </div>

      {/* Status Indicators */}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            {voiceEnabled ? (
              <Mic className="w-3 h-3 text-green-400" />
            ) : (
              <MicOff className="w-3 h-3 text-gray-600" />
            )}
            <span>Input: {voiceEnabled ? 'On' : 'Off'}</span>
          </div>
          
          <div className="flex items-center gap-1">
            {ttsEnabled ? (
              <Volume2 className="w-3 h-3 text-green-400" />
            ) : (
              <VolumeX className="w-3 h-3 text-gray-600" />
            )}
            <span>Output: {ttsEnabled ? 'On' : 'Off'}</span>
          </div>
        </div>

        {isListening && (
          <div className="flex items-center gap-1 text-purple-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Listening...</span>
          </div>
        )}

        {isSpeaking && (
          <div className="flex items-center gap-1 text-orange-400">
            <Volume2 className="w-3 h-3 animate-pulse" />
            <span>Speaking...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default VoiceConversationUI;
