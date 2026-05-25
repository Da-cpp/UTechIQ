import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Send, UploadCloud, FileText, Loader2, Bot, User, Sparkles, ShieldAlert } from 'lucide-react';
import type { ChatMessage } from '../types/database';

interface Tab1Props {
  profile: any;
}

export default function Tab1_RAG({ profile }: Tab1Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      id: 'init-1', 
      sender: 'assistant', 
      text: `Welcome to your UTech Copilot workspace, ${profile?.name || 'Scholar'}. Ask me anything regarding institutional regulations, modules, or session-specific documentation.`, 
      timestamp: new Date() 
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [sessionFiles, setSessionFiles] = useState<string[]>([]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const targetFile = e.target.files?.[0];
    if (!targetFile) return;

    setUploading(true);
    try {
      const storageFilePath = `${profile.id}/${Date.now()}_${targetFile.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('session-buckets')
        .upload(storageFilePath, targetFile);

      if (uploadError) throw uploadError;

      setSessionFiles((prev) => [...prev, targetFile.name]);

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
    <div style={ragStyles.panelContainer}>
      
      <div style={ragStyles.identityBanner}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={ragStyles.avatarBox}>
            <User size={16} style={{ color: '#eab308' }} />
          </div>
          <div>
            <h3 style={ragStyles.profileName}>{profile?.name || 'Academic Core Account'}</h3>
            <p style={ragStyles.profileMeta}>Verified Academic User Node</p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={ragStyles.idLabel}>Institutional ID Number</span>
          <span style={ragStyles.idValue}>{profile?.id_number || '2205034'}</span>
        </div>
      </div>

      <div style={ragStyles.splitGrid}>
        
        <div style={ragStyles.chatFrame}>
          <div style={ragStyles.chatHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              <span style={ragStyles.headerText}>Interactive Messaging Workspace</span>
            </div>
          </div>

          <div style={ragStyles.messagesConsole}>
            {messages.map((msg) => (
              <div key={msg.id} style={{
                ...ragStyles.messageRow,
                flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row',
                alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start'
              }}>
                <div style={{
                  ...ragStyles.msgAvatar,
                  backgroundColor: msg.sender === 'user' ? '#1e293b' : '#eab308',
                  color: msg.sender === 'user' ? '#f1f5f9' : '#020617',
                  border: msg.sender === 'user' ? '1px solid #334155' : 'none'
                }}>
                  {msg.sender === 'user' ? <User size={12} /> : <Bot size={12} />}
                </div>
                <div style={{
                  ...ragStyles.msgBubble,
                  backgroundColor: msg.sender === 'user' ? '#1e293b' : '#020617',
                  color: msg.sender === 'user' ? '#f8fafc' : '#cbd5e1',
                  border: '1px solid #1e293b',
                  borderTopRightRadius: msg.sender === 'user' ? '0px' : '12px',
                  borderTopLeftRadius: msg.sender === 'user' ? '12px' : '0px',
                }}>
                  {msg.text}
                </div>
              </div>
            ))}
            
            {chatLoading && (
              <div style={ragStyles.messageRow}>
                <div style={{ ...ragStyles.msgAvatar, backgroundColor: 'rgba(234,179,8,0.1)', color: '#eab308', border: '1px solid rgba(234,179,8,0.2)' }}>
                  <Bot size={12} />
                </div>
                <div style={{ ...ragStyles.msgBubble, backgroundColor: '#020617', color: '#64748b', border: '1px solid #1e293b', borderTopLeftRadius: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Loader2 size={12} className="animate-spin" style={{ color: '#eab308' }} />
                  <span style={{ fontFamily: 'monospace', fontSize: '10px' }}>Computing vector weights context...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={executeChatMessage} style={ragStyles.inputForm}>
            <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
              <Sparkles size={14} style={{ position: 'absolute', left: '14px', color: '#475569' }} />
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Interrogate structural handbooks, regulations, or outlines..."
                style={ragStyles.inputField}
              />
            </div>
            <button type="submit" disabled={chatLoading} style={ragStyles.sendButton}>
              <Send size={13} style={{ strokeWidth: '2.5px' }} />
            </button>
          </form>
        </div>

        <div style={ragStyles.sidebarFrame}>
          <div>
            <h3 style={ragStyles.sidebarTitle}>Session Bucket</h3>
            <p style={ragStyles.sidebarSub}>Drag & drop supplementary reference PDFs to expand active memory.</p>
          </div>

          <label style={ragStyles.dropZone}>
            <input type="file" accept=".pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
            {uploading ? (
              <Loader2 size={18} className="animate-spin" style={{ color: '#eab308' }} />
            ) : (
              <UploadCloud size={18} style={{ color: '#475569' }} />
            )}
            <span style={ragStyles.uploadText}>Upload Reference PDF</span>
          </label>

          <div style={ragStyles.filesListContainer}>
            <span style={ragStyles.filesListHeader}>Context Files Loaded</span>
            
            {sessionFiles.length === 0 ? (
              <div style={ragStyles.emptyStateBox}>
                <ShieldAlert size={14} style={{ color: '#334155', marginBottom: '4px' }} />
                <p style={ragStyles.emptyFilesText}>No custom files attached to session.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {sessionFiles.map((name, i) => (
                  <div key={i} style={ragStyles.fileRow}>
                    <FileText size={12} style={{ color: '#eab308', flexShrink: 0 }} />
                    <span style={ragStyles.fileName}>{name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

const ragStyles: Record<string, React.CSSProperties> = {
  panelContainer: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    gap: '16px',
    boxSizing: 'border-box',
  },
  identityBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#020617',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    padding: '14px 20px',
  },
  avatarBox: {
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
    border: '1px solid rgba(234, 179, 8, 0.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileName: {
    fontSize: '14px',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0,
  },
  profileMeta: {
    fontSize: '10px',
    color: '#64748b',
    margin: '2px 0 0 0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  idLabel: {
    fontFamily: 'monospace',
    fontSize: '9px',
    fontWeight: 'bold',
    color: '#475569',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'block',
  },
  idValue: {
    fontFamily: 'monospace',
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#eab308',
    marginTop: '2px',
    display: 'block',
  },
  splitGrid: {
    display: 'grid',
    gridTemplateColumns: '3fr 1fr', 
    gap: '16px',
    flex: 1,
    minHeight: 0,
    width: '100%',
  },
  chatFrame: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#020617',
    border: '1px solid #1e293b',
    borderRadius: '12px',
    overflow: 'hidden',
    height: '100%',
  },
  chatHeader: {
    padding: '12px 16px',
    borderBottom: '1px solid #1e293b',
    backgroundColor: '#020617',
  },
  headerText: {
    fontSize: '10px',
    fontWeight: 'bold',
    fontFamily: 'monospace',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  messagesConsole: {
    flex: 1,
    padding: '20px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    backgroundColor: 'rgba(2,6,23,0.4)',
  },
  messageRow: {
    display: 'flex',
    gap: '12px',
    maxWidth: '80%',
    alignItems: 'flex-start',
  },
  msgAvatar: {
    height: '28px',
    width: '28px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  msgBubble: {
    padding: '10px 14px',
    borderRadius: '12px',
    fontSize: '12px',
    lineHeight: '150%',
  },
  inputForm: {
    padding: '12px',
    borderTop: '1px solid #1e293b',
    backgroundColor: '#020617',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
  inputField: {
    width: '100%',
    padding: '10px 14px 10px 38px',
    fontSize: '12px',
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    color: '#ffffff',
    outline: 'none',
    boxSizing: 'border-box',
  },
  sendButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '36px',
    width: '36px',
    backgroundColor: '#eab308',
    color: '#020617',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  sidebarFrame: {
    backgroundColor: '#020617',
    padding: '16px',
    borderRadius: '12px',
    border: '1px solid #1e293b',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    height: '100%',
    boxSizing: 'border-box',
  },
  sidebarTitle: {
    fontSize: '11px',
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#ffffff',
    margin: 0,
  },
  sidebarSub: {
    fontSize: '10px',
    color: '#64748b',
    marginTop: '4px',
    lineHeight: '140%',
    margin: '4px 0 0 0',
  },
  dropZone: {
    border: '1px dashed #334155',
    borderRadius: '8px',
    padding: '18px 12px',
    textAlign: 'center',
    cursor: 'pointer',
    backgroundColor: '#0f172a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  uploadText: {
    fontSize: '9px',
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  filesListContainer: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    minHeight: 0,
  },
  filesListHeader: {
    fontFamily: 'monospace',
    fontSize: '9px',
    letterSpacing: '0.5px',
    color: '#475569',
    textTransform: 'uppercase',
    display: 'block',
    borderBottom: '1px solid #1e293b',
    paddingBottom: '6px',
    marginBottom: '8px',
    fontWeight: '700',
  },
  emptyStateBox: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px 10px',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    backgroundColor: 'rgba(15,23,42,0.2)',
  },
  emptyFilesText: {
    fontSize: '10px',
    fontStyle: 'italic',
    color: '#334155',
    margin: 0,
    textAlign: 'center',
  },
  fileRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 10px',
    borderRadius: '6px',
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
  },
  fileName: {
    fontFamily: 'monospace',
    fontSize: '10px',
    color: '#cbd5e1',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
  },
};