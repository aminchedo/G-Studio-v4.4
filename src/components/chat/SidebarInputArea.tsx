import React, { useState, useRef, useEffect } from "react";

interface SidebarInputAreaProps {
  onSend: (message: string, files?: File[]) => void;
  disabled?: boolean;
  isProcessing?: boolean;
  onVoiceToggle?: () => void;
  isListening?: boolean;
  agentConnected?: boolean;
  currentAIMode?: string;
}

export const SidebarInputArea: React.FC<SidebarInputAreaProps> = ({
  onSend,
  disabled = false,
  isProcessing = false,
  onVoiceToggle,
  isListening = false,
  agentConnected = true,
  currentAIMode = "online",
}) => {
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const newHeight = Math.min(textareaRef.current.scrollHeight, 150);
      textareaRef.current.style.height = newHeight + "px";
    }
  }, [message]);

  const handleSend = () => {
    if ((!message.trim() && files.length === 0) || disabled) return;
    onSend(message, files);
    setMessage("");
    setFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  };

  return (
    <div className="bg-slate-900/50 border-t border-slate-800/60">
      <div className="px-4 py-2 border-b border-slate-800/30 bg-slate-950/30">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <div className="relative">{agentConnected ? (<><svg className="w-3 h-3 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg><div className="absolute inset-0 w-3 h-3 rounded-full bg-emerald-400 animate-ping opacity-40"/></>) : (<svg className="w-3 h-3 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6M9 9l6 6"/></svg>)}</div>
              <span className="text-[10px] font-medium text-slate-400">{agentConnected ? "Agent Online" : "Agent Offline"}</span>
            </div>
            {currentAIMode && (<div className="flex items-center gap-1.5">{currentAIMode === "online" ? (<svg className="w-3 h-3 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12.55a11 11 0 0 1 14.08 0"/><path d="M1.42 9a16 16 0 0 1 21.16 0"/><path d="M8.53 16.11a6 6 0 0 1 6.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>) : (<svg className="w-3 h-3 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>)}<span className="text-[10px] font-medium text-slate-400">{currentAIMode === "online" ? "Cloud AI" : "Local AI"}</span></div>)}
          </div>
          {isProcessing && (<div className="flex items-center gap-1.5"><div className="flex gap-0.5"><div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}/><div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}/><div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}/></div><span className="text-[10px] font-medium text-blue-400">Processing...</span></div>)}
        </div>
      </div>
      {files.length > 0 && (<div className="px-4 py-2 border-b border-slate-800/30 bg-slate-950/20"><div className="flex flex-wrap gap-2">{files.map((file, idx) => (<div key={idx} className="group flex items-center gap-2 px-2.5 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-xs hover:bg-slate-800/70 transition-colors"><svg className="w-3 h-3 text-blue-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg><span className="text-slate-300 truncate max-w-[120px]">{file.name}</span><button onClick={() => setFiles(files.filter((_, i) => i !== idx))} className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-400 transition-all"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>))}</div></div>)}
      <div className="p-4"><div className="flex gap-2 items-end"><div className="flex-1 relative"><textarea ref={textareaRef} value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder="پیام خود را بنویسید یا از ورودی صوتی استفاده کنید..." disabled={disabled} rows={1} dir="auto" className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 text-white placeholder-slate-500 resize-none focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30 rounded-lg text-sm transition-all" style={{maxHeight: "150px", minHeight: "42px"}}/></div><div className="flex items-center gap-1.5">{onVoiceToggle && (<button onClick={onVoiceToggle} disabled={disabled} className={`p-2.5 rounded-lg transition-all shadow-lg ${isListening ? "bg-gradient-to-br from-red-600 to-red-700 text-white shadow-red-500/40 animate-pulse" : "bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-purple-400 hover:border-purple-500/50 hover:shadow-purple-500/20"}`} title={isListening ? "توقف شنیدن" : "ورودی صوتی فارسی"}><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg></button>)}<button onClick={() => fileInputRef.current?.click()} disabled={disabled} className="p-2.5 bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/50 hover:shadow-cyan-500/20 rounded-lg transition-all shadow-lg" title="پیوست فایل"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button><input ref={fileInputRef} type="file" multiple onChange={handleFileSelect} className="hidden"/><button onClick={handleSend} disabled={disabled || (!message.trim() && files.length === 0)} className="p-2.5 bg-gradient-to-br from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 disabled:shadow-none" title="ارسال پیام">{isProcessing ? (<svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>) : (<svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>)}</button></div></div><div className="mt-2 flex items-center justify-between text-[10px] text-slate-500"><div className="flex items-center gap-3"><span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-800/50 border border-slate-700/50 rounded text-slate-400 font-mono text-[9px]">Enter</kbd><span>ارسال</span></span><span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-slate-800/50 border border-slate-700/50 rounded text-slate-400 font-mono text-[9px]">Shift+↵</kbd><span>خط جدید</span></span></div><span className="text-slate-600 tabular-nums">{message.length} کاراکتر</span></div></div>
    </div>
  );
};
