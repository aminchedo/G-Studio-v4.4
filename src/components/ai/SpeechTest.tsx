import React, { useState, useRef } from 'react';
import { Mic, Square, Trash2, Activity, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

/**
 * Speech Recognition Test Component
 * Professional UI matching the application design system
 * Direct Chromium Web Speech API implementation for testing
 */
export const SpeechTest: React.FC = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [log, setLog] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'listening' | 'error'>('idle');
  const recognitionRef = useRef<any>(null);

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const icon = type === 'success' ? '✓' : type === 'error' ? '✗' : '•';
    setLog(prev => [...prev, `[${timestamp}] ${icon} ${msg}`]);
    console.log(msg);
  };

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      addLog('SpeechRecognition API not available in this environment', 'error');
      setStatus('error');
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.lang = 'fa-IR';
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = false;

    recognitionRef.current.onstart = () => {
      addLog('Speech recognition started', 'success');
      setIsListening(true);
      setStatus('listening');
    };

    recognitionRef.current.onresult = (event: any) => {
      let newTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          newTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (newTranscript.trim()) {
        setTranscript(prev => prev + newTranscript);
        addLog(`Recognized: "${newTranscript.trim()}"`, 'success');
      }
    };

    recognitionRef.current.onerror = (e: any) => {
      if (e.error !== 'no-speech' && e.error !== 'aborted') {
        addLog(`Error: ${e.error}`, 'error');
        setStatus('error');
      }
      setIsListening(false);
    };

    recognitionRef.current.onend = () => {
      addLog('Speech recognition stopped', 'info');
      setIsListening(false);
      setStatus('idle');
    };

    try {
      recognitionRef.current.start();
    } catch (error: any) {
      addLog(`Failed to start: ${error.message}`, 'error');
      setIsListening(false);
      setStatus('error');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Recognition may already be stopped - this is acceptable
        console.warn('Speech recognition stop failed (may already be stopped):', e);
      }
      recognitionRef.current = null;
    }
    setIsListening(false);
    setStatus('idle');
  };

  const clearLog = () => {
    setLog([]);
    setTranscript('');
    setStatus('idle');
  };

  return (
    <div className="bg-white border border-slate-100 rounded-[2rem] w-full max-w-3xl shadow-2xl flex flex-col overflow-hidden ring-1 ring-black/5">
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-slate-50 bg-white">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-all ${
            status === 'listening' 
              ? 'bg-gradient-to-br from-emerald-600 to-emerald-500 shadow-emerald-500/20 animate-pulse' 
              : status === 'error'
              ? 'bg-gradient-to-br from-burgundy-600 to-burgundy-500 shadow-burgundy-500/20'
              : 'bg-gradient-to-br from-ocean-600 to-ocean-500 shadow-ocean-500/20'
          }`}>
            {status === 'listening' ? (
              <Activity strokeWidth={1.5} className="w-6 h-6 text-white" />
            ) : status === 'error' ? (
              <XCircle strokeWidth={1.5} className="w-6 h-6 text-white" />
            ) : (
              <Mic strokeWidth={1.5} className="w-6 h-6 text-white" />
            )}
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Speech Recognition Test</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-1.5 h-1.5 rounded-full ${
                status === 'listening' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
              }`}></span>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {status === 'listening' ? 'Active Listening' : status === 'error' ? 'Error State' : 'Ready'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-8 bg-slate-50/50 space-y-6">
        {/* Control Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={startListening}
            disabled={isListening}
            className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-lg active:scale-95 ${
              isListening
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-br from-ocean-600 to-ocean-500 text-white hover:from-ocean-700 hover:to-ocean-600 shadow-ocean-500/30'
            }`}
          >
            <Mic strokeWidth={2} className="w-4 h-4" />
            {isListening ? 'Listening...' : 'Start Listening'}
          </button>
          
          <button
            onClick={stopListening}
            disabled={!isListening}
            className={`flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all shadow-lg active:scale-95 ${
              !isListening
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                : 'bg-gradient-to-br from-burgundy-600 to-burgundy-500 text-white hover:from-burgundy-700 hover:to-burgundy-600 shadow-burgundy-500/30'
            }`}
          >
            <Square strokeWidth={2} className="w-4 h-4" />
            Stop
          </button>
          
          <button
            onClick={clearLog}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-sm bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95"
          >
            <Trash2 strokeWidth={2} className="w-4 h-4" />
            Clear
          </button>
        </div>

        {/* Status Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Recognition Status</h3>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold ${
              status === 'listening' 
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                : status === 'error'
                ? 'bg-burgundy-50 text-burgundy-600 border border-burgundy-100'
                : 'bg-slate-50 text-slate-600 border border-slate-100'
            }`}>
              {status === 'listening' && <CheckCircle2 className="w-3 h-3" />}
              {status === 'error' && <XCircle className="w-3 h-3" />}
              {status === 'idle' && <AlertCircle className="w-3 h-3" />}
              {status === 'listening' ? 'Active' : status === 'error' ? 'Error' : 'Idle'}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Language</p>
              <p className="text-sm font-bold text-slate-900">fa-IR (Persian)</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mode</p>
              <p className="text-sm font-bold text-slate-900">Continuous</p>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Interim</p>
              <p className="text-sm font-bold text-slate-900">Disabled</p>
            </div>
          </div>
        </div>

        {/* Transcript Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest mb-4">Transcript</h3>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 min-h-[120px] max-h-[200px] overflow-y-auto">
            {transcript ? (
              <p className="text-sm text-slate-900 leading-relaxed font-medium">{transcript}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">No transcript yet. Start listening to capture speech...</p>
            )}
          </div>
        </div>

        {/* Log Card */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Activity Log</h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-full border border-slate-100">
              {log.length} entries
            </span>
          </div>
          <div className="p-4 bg-slate-900 rounded-xl border border-slate-800 max-h-[300px] overflow-y-auto">
            <pre className="text-xs font-mono text-slate-100 leading-relaxed">
              {log.length > 0 ? log.join('\n') : (
                <span className="text-slate-500 italic">No activity logged yet...</span>
              )}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
