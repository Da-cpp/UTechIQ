import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Send, UploadCloud, FileText, Loader2, Bot, User } from 'lucide-react';
import type { ChatMessage } from '../types/database';
interface Tab1Props {
  profile: any;
}

export default function Tab1_RAG({ profile }: Tab1Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 'init-1', sender: 'assistant', text: `Welcome to your UTech Copilot workspace, ${profile?.name || 'Scholar'}. Ask me anything regarding institutional regulations, modules, or session-specific documentation.`, timestamp: new Date() }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionFiles, setSessionFiles] = useState<string[]>([]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetFile = e.target.files?.[0];
    if (!targetFile) return;

    setUploading(true);
    try {
      const storageFilePath = `${profile.id}/${Date.now()}_${targetFile.name}`;
      
      // Upload directly into the protected Row-Level Security Storage structural system
      const { error: uploadError } = await supabase.storage
        .from('session-buckets')
        .upload(storageFilePath, targetFile);

      if (uploadError) throw uploadError;

      setSessionFiles((prev) => [...prev, targetFile.name]);

      // Notify FastAPI microservices layer to compute embeddings
      await fetch('http://localhost:8000/api/v1/embeddings/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file_path: storageFilePath, user_id: profile.id })
      });

    } catch (err: any) {
      console.error('File registration aborted:', err.message);
    } finally {
      setUploading(false);
    }
  };

  const executeChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || chatLoading) return;

    const userPayload = inputMessage.trim();
    setInputMessage('');
    
    const newUserMsg: ChatMessage = { id: Math.random().toString(), sender: 'user', text: userPayload, timestamp: new Date() };
    setMessages((prev) => [...prev, newUserMsg]);
    setChatLoading(true);

    try {
      const response = await fetch('http://localhost:8000/api/v1/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: userPayload, user_id: profile.id })
      });
      const responseData = await response.json();

      const assistantMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: 'assistant',
        text: responseData.answer || 'RAG backend matrix returned no contextual tokens.',
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => [...prev, { id: Math.random().toString(), sender: 'assistant', text: 'Error interacting with core FastAPI RAG Engine.', timestamp: new Date() }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[calc(100vh-12rem)]">
      
      {/* Left Chat Frame interface */}
      <div className="lg:col-span-3 bg-white border border-slate-200 rounded-2xl flex flex-col justify-between overflow-hidden shadow-sm">
        
        {/* Scrollable messages console container */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 max-w-3xl ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}>
              <div className={`p-2 h-8 w-8 rounded-lg shrink-0 flex items-center justify-center ${msg.sender === 'user' ? 'bg-slate-900 text-white' : 'bg-amber-500 text-slate-950'}`}>
                {msg.sender === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div className={`p-4 rounded-2xl text-xs leading-relaxed ${msg.sender === 'user' ? 'bg-slate-900 text-slate-100 rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>
                {msg.text}
              </div>
            </div>
          ))}
          {chatLoading && (
            <div className="flex gap-3 max-w-3xl animate-pulse">
              <div className="p-2 h-8 w-8 rounded-lg bg-amber-500/40 text-slate-950 flex items-center justify-center"><Bot size={14} /></div>
              <div className="p-4 rounded-2xl text-xs bg-slate-100 text-slate-400 rounded-tl-none">Vector graph computing contextual metrics...</div>
            </div>
          )}
        </div>

        {/* Input Interactive Bar */}
        <form onSubmit={executeChatMessage} className="p-4 border-t border-slate-200 bg-slate-50/50 flex gap-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Interrogate structural handbooks, course outlines, or custom contexts..."
            className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-amber-500"
          />
          <button type="submit" className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-4 rounded-xl transition-all"><Send size={14} /></button>
        </form>
      </div>

      {/* Right Drag-and-drop secure Session Bucket container */}
      <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl border border-slate-800 flex flex-col gap-6 shadow-xl">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-white">Session Drop-Zone</h3>
          <p className="text-[10px] text-slate-400 font-mono mt-1">Upload supplementary tracking reference files (Syllabi, Rubrics, Handouts)</p>
        </div>

        <label className="border-2 border-dashed border-slate-800 hover:border-amber-500/40 rounded-xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2 group bg-slate-950/40">
          <input type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
          {uploading ? (
            <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
          ) : (
            <UploadCloud className="w-6 h-6 text-slate-500 group-hover:text-amber-500 transition-colors" />
          )}
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Select Reference PDF</span>
        </label>

        <div className="flex-1 overflow-y-auto space-y-2">
          <span className="text-[9px] font-mono tracking-widest text-slate-500 uppercase block border-b border-slate-800 pb-1">Context Files Loaded</span>
          {sessionFiles.length === 0 ? (
            <p className="text-[10px] italic text-slate-600 pt-2">No custom files attached to active matrix instance.</p>
          ) : (
            sessionFiles.map((name, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-950/40 border border-slate-800 text-[11px] font-mono text-slate-300">
                <FileText size={12} className="text-amber-500 shrink-0" />
                <span className="truncate flex-1">{name}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}