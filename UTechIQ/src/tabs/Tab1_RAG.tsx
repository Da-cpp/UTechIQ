import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { StudentProfile, ProfessorProfile } from '../types/database';
import {
  Send, UploadCloud, FileText, Loader2, Bot,
  User, Sparkles, ShieldAlert, Trash2, BookOpen,
} from 'lucide-react';


interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface UploadedFile {
  name: string;
  path: string;
  size: number;
  uploaded_at: string;
}

interface Tab1Props {
  profile: any;
}


function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function extractTextFromFile(
  bucket: string,
  path: string
): Promise<string> {
  try {
    const { data, error } = await supabase.storage.from(bucket).download(path);
    if (error || !data) return '';
    const mime = data.type;
    if (mime.startsWith('text/') || mime === 'application/json') {
      return await data.text();
    }
    if (mime === 'application/pdf') {
      return `[PDF document: ${path.split('/').pop()} — content available for reference]`;
    }
    return '';
  } catch {
    return '';
  }
}


export default function Tab1_RAG({ profile }: Tab1Props) {
  const { role } = useAuth();

  const isProfessor = role === 'professor';
  const typedProfile = profile as StudentProfile & ProfessorProfile;

  const displayName = profile
    ? `${typedProfile.first_name} ${typedProfile.last_name}`
    : 'Scholar';

  const displayId = isProfessor
    ? typedProfile.professor_id
    : typedProfile.student_id;

  const [messages, setMessages] = useState<Message[]>([{
    id: 'init',
    role: 'assistant',
    content: `Welcome, ${typedProfile?.first_name || 'Scholar'}. I'm your UTech Copilot — your academic advisor. Ask me anything about your grades, university policies, course materials, or academic standing.`,
    timestamp: new Date(),
  }]);
  const [input, setInput]           = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef               = useRef<HTMLDivElement>(null);

  const [files, setFiles]       = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [filesLoading, setFilesLoading] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chatLoading]);

  useEffect(() => {
    if (!profile) return;
    const loadHistory = async () => {
      const studentId = isProfessor ? null : typedProfile.student_id;
      if (!studentId) return;
      const { data } = await supabase
        .from('chat_messages')
        .select('message_id, sender, message, created_at')
        .eq('student_id', studentId)
        .order('created_at', { ascending: true })
        .limit(40);

      if (data && data.length > 0) {
        const history: Message[] = data.map((r: any) => ({
          id:        r.message_id,
          role:      r.sender === 'ai' ? 'assistant' : 'user',
          content:   r.message,
          timestamp: new Date(r.created_at),
        }));
        setMessages(prev => [prev[0], ...history]);
      }
    };
    loadHistory();
  }, [profile]);

  const loadFiles = useCallback(async () => {
    if (!isProfessor || !profile) return;
    setFilesLoading(true);
    const { data, error } = await supabase.storage
      .from('academic-documents')
      .list(typedProfile.user_id, { sortBy: { column: 'created_at', order: 'desc' } });

    if (!error && data) {
      setFiles(data.map((f: any) => ({
        name:        f.name,
        path:        `${typedProfile.user_id}/${f.name}`,
        size:        f.metadata?.size ?? 0,
        uploaded_at: f.created_at ?? '',
      })));
    }
    setFilesLoading(false);
  }, [isProfessor, profile]);

  useEffect(() => { loadFiles(); }, [loadFiles]);

  const buildStudentContext = async (): Promise<string> => {
    if (isProfessor) return '';
    try {
      const [gradesRes, gpaRes] = await Promise.all([
        supabase
          .from('student_grades')
          .select('module_code, academic_year, semester, grade_letter, grade_points, credits, included_in_gpa, forgiven, attempt_type')
          .eq('student_id', typedProfile.student_id)
          .order('academic_year', { ascending: false }),
        supabase
          .from('student_gpa_view')
          .select('gpa')
          .eq('student_id', typedProfile.student_id)
          .maybeSingle(),
      ]);

      const grades = gradesRes.data ?? [];
      const gpa    = gpaRes.data?.gpa ?? typedProfile.cumulative_gpa ?? 'N/A';

      const gradeLines = grades.map((g: any) =>
        `  - ${g.module_code}: ${g.grade_letter} (${g.grade_points} pts, ${g.credits} credits) | ${g.academic_year} Sem ${g.semester} | ${g.attempt_type}${g.forgiven ? ' [FORGIVEN]' : ''}${!g.included_in_gpa ? ' [EXCLUDED FROM GPA]' : ''}`
      ).join('\n');

      return [
        `Student: ${typedProfile.first_name} ${typedProfile.last_name}`,
        `Student ID: ${typedProfile.student_id}`,
        `Campus: ${typedProfile.campus}`,
        `Programme: ${typedProfile.course_of_study}`,
        `Major: ${typedProfile.major}${typedProfile.minor ? ` | Minor: ${typedProfile.minor}` : ''}`,
        `Current Year: ${typedProfile.current_year} | Current Semester: ${typedProfile.current_semester}`,
        `Entry Year: ${typedProfile.entry_year}`,
        `Cumulative GPA: ${gpa}`,
        `\nGrade History:\n${gradeLines || '  No grades on record.'}`,
      ].join('\n');
    } catch {
      return '';
    }
  };

  const buildDocumentContext = async (): Promise<string> => {
    try {
      const { data: folders } = await supabase.storage
        .from('academic-documents')
        .list('', { limit: 50 });

      if (!folders?.length) return '';

      const textParts: string[] = [];

      for (const folder of folders) {
        const { data: folderFiles } = await supabase.storage
          .from('academic-documents')
          .list(folder.name, { limit: 20 });

        for (const file of (folderFiles ?? [])) {
          const path = `${folder.name}/${file.name}`;
          const text = await extractTextFromFile('academic-documents', path);
          if (text) textParts.push(`File: ${file.name}\n${text}`);
        }
      }

      return textParts.join('\n\n---\n\n');
    } catch {
      return '';
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || chatLoading) return;

    setInput('');

    const userMsg: Message = {
      id:        Math.random().toString(36),
      role:      'user',
      content:   text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const [studentContext, documentContext] = await Promise.all([
        buildStudentContext(),
        buildDocumentContext(),
      ]);

      const history = messages
        .filter(m => m.id !== 'init')
        .map(m => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke('chat', {
        body: {
          message:             text,
          conversationHistory: history,
          studentContext:      studentContext || undefined,
          documentContext:     documentContext || undefined,
          userRole:            role ?? 'student',
          userName:            displayName,
        },
      });

      if (error) throw error;

      const assistantMsg: Message = {
        id:        Math.random().toString(36),
        role:      'assistant',
        content:   data.reply ?? 'No response received.',
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMsg]);

      if (!isProfessor && typedProfile.student_id) {
        await supabase.from('chat_messages').insert([
          { student_id: typedProfile.student_id, sender: 'student', message: text },
          { student_id: typedProfile.student_id, sender: 'ai',      message: data.reply },
        ]);
      }

    } catch (err: any) {
      setMessages(prev => [...prev, {
        id:        Math.random().toString(36),
        role:      'assistant',
        content:   `Error: ${err.message ?? 'Could not reach AI service. Please try again.'}`,
        timestamp: new Date(),
      }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isProfessor) return;
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';
    setUploading(true);

    try {
      const path = `${typedProfile.user_id}/${Date.now()}_${file.name}`;
      const { error } = await supabase.storage
        .from('academic-documents')
        .upload(path, file);
      if (error) throw error;
      await loadFiles();
    } catch (err: any) {
      console.error('Upload failed:', err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (path: string) => {
    setDeleting(path);
    try {
      const { error } = await supabase.storage
        .from('academic-documents')
        .remove([path]);
      if (error) throw error;
      await loadFiles();
    } catch (err: any) {
      console.error('Delete failed:', err.message);
    } finally {
      setDeleting(null);
    }
  };


  return (
    <div style={S.panelContainer}>

      <div style={S.identityBanner}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={S.avatarBox}>
            <User size={16} style={{ color: '#eab308' }} />
          </div>
          <div>
            <h3 style={S.profileName}>{displayName}</h3>
            <p style={S.profileMeta}>
              {isProfessor ? `Professor · ${typedProfile.department ?? ''}` : `${typedProfile.course_of_study ?? 'Student'} · Year ${typedProfile.current_year ?? '—'}`}
            </p>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={S.idLabel}>{isProfessor ? 'Staff ID' : 'Student ID'}</span>
          <span style={S.idValue}>{displayId ?? '—'}</span>
        </div>
      </div>

      <div style={{ ...S.splitGrid, gridTemplateColumns: isProfessor ? '3fr 1fr' : '1fr' }}>

        <div style={S.chatFrame}>
          <div style={S.chatHeader}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
              <span style={S.headerText}>UTech Copilot · Academic Advisor</span>
            </div>
            <Sparkles size={13} style={{ color: '#eab308' }} />
          </div>

          <div style={S.messagesConsole}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  ...S.messageRow,
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  alignSelf:     msg.role === 'user' ? 'flex-end'    : 'flex-start',
                }}
              >
                <div style={{
                  ...S.msgAvatar,
                  backgroundColor: msg.role === 'user' ? '#1e293b' : '#eab308',
                  color:           msg.role === 'user' ? '#f1f5f9'  : '#020617',
                  border:          msg.role === 'user' ? '1px solid #334155' : 'none',
                }}>
                  {msg.role === 'user' ? <User size={12} /> : <Bot size={12} />}
                </div>

                <div style={{
                  ...S.msgBubble,
                  backgroundColor:    msg.role === 'user' ? '#1e293b' : '#020617',
                  color:              msg.role === 'user' ? '#f8fafc'  : '#cbd5e1',
                  border:             '1px solid #1e293b',
                  borderTopRightRadius: msg.role === 'user' ? '0px' : '12px',
                  borderTopLeftRadius:  msg.role === 'user' ? '12px' : '0px',
                }}>
                  {msg.content.split('\n').map((line, i) => (
                    <React.Fragment key={i}>
                      {line}
                      {i < msg.content.split('\n').length - 1 && <br />}
                    </React.Fragment>
                  ))}
                  <div style={{ fontSize: '9px', color: '#475569', marginTop: '6px', fontFamily: 'monospace' }}>
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}

            {chatLoading && (
              <div style={{ ...S.messageRow, flexDirection: 'row', alignSelf: 'flex-start' }}>
                <div style={{ ...S.msgAvatar, backgroundColor: '#eab308', color: '#020617' }}>
                  <Bot size={12} />
                </div>
                <div style={{ ...S.msgBubble, backgroundColor: '#020617', border: '1px solid #1e293b' }}>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <Loader2 size={12} className="animate-spin" style={{ color: '#eab308' }} />
                    <span style={{ fontSize: '11px', color: '#475569', fontFamily: 'monospace' }}>
                      Thinking...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSend} style={S.inputForm}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Sparkles size={13} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#475569', pointerEvents: 'none' }} />
              <input
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Ask about grades, policies, documents..."
                disabled={chatLoading}
                style={{ ...S.inputField, opacity: chatLoading ? 0.6 : 1 }}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || chatLoading}
              style={{
                ...S.sendButton,
                opacity: (!input.trim() || chatLoading) ? 0.5 : 1,
                cursor:  (!input.trim() || chatLoading) ? 'not-allowed' : 'pointer',
              }}
            >
              <Send size={14} />
            </button>
          </form>
        </div>

        {isProfessor && (
          <div style={S.sidebarFrame}>
            <div>
              <h4 style={S.sidebarTitle}>
                <BookOpen size={12} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
                Reference Documents
              </h4>
              <p style={S.sidebarSub}>
                Upload PDFs or text files. Students can ask the chatbot questions based on these materials.
              </p>
            </div>

            <label style={S.dropZone}>
              <input
                type="file"
                accept=".pdf,.txt,.md,.docx"
                onChange={handleUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
              {uploading
                ? <Loader2 size={18} className="animate-spin" style={{ color: '#eab308' }} />
                : <UploadCloud size={18} style={{ color: '#475569' }} />
              }
              <span style={S.uploadText}>
                {uploading ? 'Uploading...' : 'Click to upload'}
              </span>
              <span style={{ fontSize: '9px', color: '#334155', fontFamily: 'monospace' }}>
                PDF, TXT, MD, DOCX
              </span>
            </label>

            <div style={S.filesListContainer}>
              <span style={S.filesListHeader}>Uploaded Files</span>

              {filesLoading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 0' }}>
                  <Loader2 size={12} className="animate-spin" style={{ color: '#475569' }} />
                  <span style={{ fontSize: '10px', color: '#475569', fontFamily: 'monospace' }}>Loading...</span>
                </div>
              ) : files.length === 0 ? (
                <div style={S.emptyStateBox}>
                  <ShieldAlert size={14} style={{ color: '#334155', marginBottom: '4px' }} />
                  <p style={S.emptyFilesText}>No documents uploaded yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {files.map((f) => (
                    <div key={f.path} style={S.fileRow}>
                      <FileText size={12} style={{ color: '#eab308', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={S.fileName}>{f.name.replace(/^\d+_/, '')}</span>
                        <span style={{ display: 'block', fontSize: '9px', color: '#334155', fontFamily: 'monospace' }}>
                          {formatBytes(f.size)}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDelete(f.path)}
                        disabled={deleting === f.path}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#334155', padding: '2px', flexShrink: 0,
                          opacity: deleting === f.path ? 0.5 : 1,
                        }}
                        title="Delete file"
                      >
                        {deleting === f.path
                          ? <Loader2 size={11} className="animate-spin" />
                          : <Trash2 size={11} />
                        }
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


const S: Record<string, React.CSSProperties> = {
  panelContainer: {
    display: 'flex', flexDirection: 'column',
    height: '100%', width: '100%',
    gap: '16px', boxSizing: 'border-box',
  },
  identityBanner: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#020617', border: '1px solid #1e293b',
    borderRadius: '12px', padding: '14px 20px', flexShrink: 0,
  },
  avatarBox: {
    width: '36px', height: '36px', borderRadius: '8px',
    backgroundColor: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.15)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  profileName: { fontSize: '14px', fontWeight: '700', color: '#ffffff', margin: 0 },
  profileMeta: {
    fontSize: '10px', color: '#64748b', margin: '2px 0 0 0',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  idLabel: {
    fontFamily: 'monospace', fontSize: '9px', fontWeight: 'bold',
    color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block',
  },
  idValue: {
    fontFamily: 'monospace', fontSize: '13px', fontWeight: 'bold',
    color: '#eab308', marginTop: '2px', display: 'block',
  },
  splitGrid: {
    display: 'grid', gap: '16px',
    flex: 1, minHeight: 0, width: '100%',
  },
  chatFrame: {
    display: 'flex', flexDirection: 'column',
    backgroundColor: '#020617', border: '1px solid #1e293b',
    borderRadius: '12px', overflow: 'hidden', height: '100%',
  },
  chatHeader: {
    padding: '12px 16px', borderBottom: '1px solid #1e293b',
    backgroundColor: '#020617', display: 'flex',
    alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
  },
  headerText: {
    fontSize: '10px', fontWeight: 'bold', fontFamily: 'monospace',
    color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  messagesConsole: {
    flex: 1, padding: '20px', overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: '14px',
    backgroundColor: 'rgba(2,6,23,0.4)',
  },
  messageRow: {
    display: 'flex', gap: '12px', maxWidth: '80%', alignItems: 'flex-start',
  },
  msgAvatar: {
    height: '28px', width: '28px', borderRadius: '6px', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  msgBubble: {
    padding: '10px 14px', borderRadius: '12px',
    fontSize: '12px', lineHeight: '150%',
  },
  inputForm: {
    padding: '12px', borderTop: '1px solid #1e293b',
    backgroundColor: '#020617', display: 'flex', gap: '8px', alignItems: 'center',
    flexShrink: 0,
  },
  inputField: {
    width: '100%', padding: '10px 14px 10px 38px', fontSize: '12px',
    backgroundColor: '#0f172a', border: '1px solid #1e293b',
    borderRadius: '8px', color: '#ffffff', outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit',
  },
  sendButton: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    height: '36px', width: '36px', backgroundColor: '#eab308',
    color: '#020617', border: 'none', borderRadius: '8px', flexShrink: 0,
  },
  sidebarFrame: {
    backgroundColor: '#020617', padding: '16px', borderRadius: '12px',
    border: '1px solid #1e293b', display: 'flex',
    flexDirection: 'column', gap: '16px', height: '100%', boxSizing: 'border-box',
  },
  sidebarTitle: {
    fontSize: '11px', fontWeight: '900', textTransform: 'uppercase',
    letterSpacing: '0.5px', color: '#ffffff', margin: 0,
  },
  sidebarSub: {
    fontSize: '10px', color: '#64748b', lineHeight: '140%', margin: '6px 0 0 0',
  },
  dropZone: {
    border: '1px dashed #334155', borderRadius: '8px', padding: '18px 12px',
    textAlign: 'center', cursor: 'pointer', backgroundColor: '#0f172a',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '6px',
  },
  uploadText: {
    fontSize: '9px', fontWeight: '700', color: '#94a3b8',
    textTransform: 'uppercase', letterSpacing: '0.5px',
  },
  filesListContainer: {
    flex: 1, overflowY: 'auto', display: 'flex',
    flexDirection: 'column', minHeight: 0,
  },
  filesListHeader: {
    fontFamily: 'monospace', fontSize: '9px', letterSpacing: '0.5px',
    color: '#475569', textTransform: 'uppercase', display: 'block',
    borderBottom: '1px solid #1e293b', paddingBottom: '6px',
    marginBottom: '8px', fontWeight: '700',
  },
  emptyStateBox: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', padding: '20px 10px',
    border: '1px solid #1e293b', borderRadius: '8px',
    backgroundColor: 'rgba(15,23,42,0.2)',
  },
  emptyFilesText: {
    fontSize: '10px', fontStyle: 'italic', color: '#334155', margin: 0, textAlign: 'center',
  },
  fileRow: {
    display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px',
    borderRadius: '6px', backgroundColor: '#0f172a', border: '1px solid #1e293b',
  },
  fileName: {
    fontFamily: 'monospace', fontSize: '10px', color: '#cbd5e1',
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, display: 'block',
  },
};
