import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';
import type { StudentProfile, ProfessorProfile } from '../types/database';
import {
  ChevronDown, ChevronUp, Loader2, CheckCircle2,
  XCircle, AlertCircle, Clock, PenLine, Trash2, Send,
} from 'lucide-react';


interface EligibleGrade {
  grade_id: string;
  module_code: string;
  grade_letter: string;
  grade_points: number;
  academic_year: string;
  semester: number;
  attempt_type: string;
  credits: number;
  professor_assignment_id: string;
}

interface ForgivenessRequest {
  request_id: string;
  student_id: string;
  grade_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  student_signature: string | null;
  professor_comment: string | null;
  request_date: string;
  reviewed_at: string | null;
  module_code?: string;
  grade_letter?: string;
  academic_year?: string;
}

interface ProfessorRequest {
  request_id: string;
  student_id: string;
  grade_id: string;
  status: string;
  student_signature: string | null;
  professor_comment: string | null;
  request_date: string;
  reviewed_at: string | null;
  module_code?: string;
  grade_letter?: string;
  academic_year?: string;
  student_first_name?: string;
  student_last_name?: string;
}


const STATUS_CONFIG = {
  pending:          { label: 'Pending Review',  color: '#eab308', bg: 'rgba(234,179,8,0.1)',   icon: Clock },
  approved:         { label: 'Approved',         color: '#10b981', bg: 'rgba(16,185,129,0.1)', icon: CheckCircle2 },
  rejected:         { label: 'Rejected',         color: '#ef4444', bg: 'rgba(239,68,68,0.1)',  icon: XCircle },
  needs_revision:   { label: 'Needs Revision',   color: '#f97316', bg: 'rgba(249,115,22,0.1)', icon: AlertCircle },
};


function SignatureCanvas({ onSave }: { onSave: (dataUrl: string) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing   = useRef(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  const getPos = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const pos = getPos(e, canvas);
    drawing.current = true;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const pos = getPos(e, canvas);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = '#f1f5f9';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    setHasStrokes(true);
  };

  const endDraw = () => {
    drawing.current = false;
    const canvas = canvasRef.current; if (!canvas) return;
    if (hasStrokes) onSave(canvas.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasStrokes(false);
    onSave('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={labelStyle}>Digital Signature</span>
        <button type="button" onClick={clear} style={clearBtnStyle}>
          <Trash2 size={11} /> Clear
        </button>
      </div>
      <canvas
        ref={canvasRef}
        width={560}
        height={100}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={endDraw}
        style={{
          width: '100%',
          height: '100px',
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          cursor: 'crosshair',
          touchAction: 'none',
        }}
      />
      <span style={{ fontSize: '10px', color: '#475569', fontFamily: 'monospace' }}>
        Draw your signature above using your mouse or finger
      </span>
    </div>
  );
}


function StudentView({ profile }: { profile: StudentProfile }) {
  const { user } = useAuth();
  const [eligible, setEligible]       = useState<EligibleGrade[]>([]);
  const [requests, setRequests]       = useState<ForgivenessRequest[]>([]);
  const [loading, setLoading]         = useState(true);
  const [expandedId, setExpandedId]   = useState<string | null>(null);
  const [signature, setSignature]     = useState('');
  const [submitting, setSubmitting]   = useState<string | null>(null);
  const [successId, setSuccessId]     = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: grades, error: gradesErr } = await supabase
        .from('student_grades')
        .select('*')
        .eq('student_id', profile.student_id)
        .eq('forgiven', false)
        .in('grade_letter', ['F', 'D']);
      if (gradesErr) throw gradesErr;

      const { data: reqs, error: reqsErr } = await supabase
        .from('grade_forgiveness_requests')
        .select('*, student_grades(module_code, grade_letter, academic_year)')
        .eq('student_id', profile.student_id)
        .order('request_date', { ascending: false });
      if (reqsErr) throw reqsErr;

      const existingGradeIds = new Set(
        (reqs || [])
          .filter(r => r.status === 'pending' || r.status === 'approved')
          .map(r => r.grade_id)
      );

      const moduleMap = new Map<string, EligibleGrade>();
      for (const g of (grades || [])) {
        const existing = moduleMap.get(g.module_code);
        if (!existing || g.created_at > existing.created_at) {
          moduleMap.set(g.module_code, g);
        }
      }
      const eligibleGrades = Array.from(moduleMap.values())
        .filter(g => !existingGradeIds.has(g.grade_id));

      setEligible(eligibleGrades);
      setRequests((reqs || []).map(r => ({
        ...r,
        module_code:   r.student_grades?.module_code,
        grade_letter:  r.student_grades?.grade_letter,
        academic_year: r.student_grades?.academic_year,
      })));
    } catch (err) {
      console.error('Error fetching forgiveness data:', err);
    } finally {
      setLoading(false);
    }
  }, [profile.student_id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSubmit = async (grade: EligibleGrade) => {
    if (!signature) { setError('Please provide your signature before submitting.'); return; }
    setError(null);
    setSubmitting(grade.grade_id);
    try {
      const { error: insertErr } = await supabase
        .from('grade_forgiveness_requests')
        .insert({
          student_id:        profile.student_id,
          grade_id:          grade.grade_id,
          status:            'pending',
          student_signature: signature,
        });
      if (insertErr) throw insertErr;

      const { data: assignment } = await supabase
        .from('professor_module_assignments')
        .select('professor_id')
        .eq('assignment_id', grade.professor_assignment_id)
        .single();

      if (assignment) {
        const { data: prof } = await supabase
          .from('professors')
          .select('user_id')
          .eq('professor_id', assignment.professor_id)
          .single();

        if (prof?.user_id) {
          await supabase.from('notifications').insert({
            user_id: prof.user_id,
            title:   'Grade Forgiveness Request',
            message: `${profile.first_name} ${profile.last_name} has submitted a grade forgiveness request for ${grade.module_code} (${grade.grade_letter}).`,
          });
        }
      }

      setSuccessId(grade.grade_id);
      setExpandedId(null);
      setSignature('');
      setTimeout(() => { setSuccessId(null); fetchData(); }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit request.');
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) return <LoadingState label="Loading forgiveness records..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      <section>
        <SectionHeader title="Eligible for Forgiveness" subtitle="Most recent F or D grades with no active request" />

        {eligible.length === 0 ? (
          <EmptyState message="No eligible grades found. Either all qualifying grades have active requests, or none exist." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {eligible.map(grade => {
              const isOpen    = expandedId === grade.grade_id;
              const isSuccess = successId === grade.grade_id;
              const isBusy    = submitting === grade.grade_id;

              return (
                <div key={grade.grade_id} style={cardStyle}>
                  {/* Row */}
                  <button
                    type="button"
                    onClick={() => { setExpandedId(isOpen ? null : grade.grade_id); setError(null); }}
                    style={rowBtnStyle}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={gradeLetterBadge(grade.grade_letter)}>{grade.grade_letter}</span>
                      <div>
                        <span style={moduleCodeStyle}>{grade.module_code}</span>
                        <span style={metaStyle}>{grade.academic_year} · Semester {grade.semester} · {grade.credits} credits</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isSuccess && <span style={{ fontSize: '11px', color: '#10b981', fontFamily: 'monospace' }}>✓ Submitted</span>}
                      <span style={applyBtnStyle}>{isOpen ? 'Cancel' : 'Apply'}</span>
                      {isOpen ? <ChevronUp size={14} style={{ color: '#64748b' }} /> : <ChevronDown size={14} style={{ color: '#64748b' }} />}
                    </div>
                  </button>

                  {isOpen && (
                    <div style={formStyle}>
                      <div style={dividerStyle} />

                      {/* Pre-filled info */}
                      <div style={prefillGridStyle}>
                        <PrefillField label="Student Name"    value={`${profile.first_name} ${profile.last_name}`} />
                        <PrefillField label="Student ID"      value={profile.student_id} />
                        <PrefillField label="Module Code"     value={grade.module_code} />
                        <PrefillField label="Grade"           value={grade.grade_letter} />
                        <PrefillField label="Academic Year"   value={grade.academic_year} />
                        <PrefillField label="Semester"        value={String(grade.semester)} />
                        <PrefillField label="Attempt Type"    value={grade.attempt_type} />
                        <PrefillField label="Credits"         value={String(grade.credits)} />
                      </div>

                      <SignatureCanvas onSave={setSignature} />

                      {error && (
                        <div style={errorBannerStyle}>{error}</div>
                      )}

                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => handleSubmit(grade)}
                        style={{ ...submitBtnStyle, opacity: isBusy ? 0.6 : 1 }}
                      >
                        {isBusy
                          ? <><Loader2 size={14} className="animate-spin" /> Submitting...</>
                          : <><Send size={14} /> Submit Request</>
                        }
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {requests.length > 0 && (
        <section>
          <SectionHeader title="Previous Requests" subtitle="History of all submitted forgiveness requests" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {requests.map(req => {
              const cfg = STATUS_CONFIG[req.status] ?? STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              return (
                <div key={req.request_id} style={{ ...cardStyle, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={gradeLetterBadge(req.grade_letter ?? '?')}>{req.grade_letter ?? '?'}</span>
                      <div>
                        <span style={moduleCodeStyle}>{req.module_code ?? '—'}</span>
                        <span style={metaStyle}>{req.academic_year} · Submitted {new Date(req.request_date).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', backgroundColor: cfg.bg, border: `1px solid ${cfg.color}33` }}>
                      <Icon size={12} style={{ color: cfg.color }} />
                      <span style={{ fontSize: '10px', fontWeight: '700', color: cfg.color, fontFamily: 'monospace', textTransform: 'uppercase' }}>{cfg.label}</span>
                    </div>
                  </div>
                  {req.professor_comment && (
                    <div style={{ marginTop: '10px', padding: '10px 12px', backgroundColor: '#0f172a', borderRadius: '6px', border: '1px solid #1e293b' }}>
                      <span style={{ fontSize: '10px', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Professor Comment</span>
                      <p style={{ fontSize: '12px', color: '#94a3b8', margin: '4px 0 0', lineHeight: '1.5' }}>{req.professor_comment}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}


function ProfessorView({ profile }: { profile: ProfessorProfile }) {
  const { user } = useAuth();
  const [requests, setRequests]     = useState<ProfessorRequest[]>([]);
  const [loading, setLoading]       = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comment, setComment]       = useState<Record<string, string>>({});
  const [acting, setActing]         = useState<string | null>(null);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('grade_forgiveness_requests')
        .select(`
          *,
          student_grades (
            module_code,
            grade_letter,
            academic_year,
            professor_assignment_id
          )
        `)
        .order('request_date', { ascending: false });
      if (error) throw error;

      const { data: assignments } = await supabase
        .from('professor_module_assignments')
        .select('assignment_id')
        .eq('professor_id', profile.professor_id);

      const assignmentIds = new Set((assignments || []).map(a => a.assignment_id));

      const filtered = (data || []).filter(r =>
        assignmentIds.has(r.student_grades?.professor_assignment_id)
      );

      const studentIds = [...new Set(filtered.map(r => r.student_id))];
      const { data: students } = await supabase
        .from('students')
        .select('student_id, first_name, last_name')
        .in('student_id', studentIds);

      const studentMap = new Map((students || []).map(s => [s.student_id, s]));

      setRequests(filtered.map(r => ({
        ...r,
        module_code:        r.student_grades?.module_code,
        grade_letter:       r.student_grades?.grade_letter,
        academic_year:      r.student_grades?.academic_year,
        student_first_name: studentMap.get(r.student_id)?.first_name,
        student_last_name:  studentMap.get(r.student_id)?.last_name,
      })));
    } catch (err) {
      console.error('Error fetching professor requests:', err);
    } finally {
      setLoading(false);
    }
  }, [profile.professor_id]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const handleAction = async (
    req: ProfessorRequest,
    action: 'approved' | 'rejected' | 'needs_revision'
  ) => {
    setActing(req.request_id);
    try {
      const { error: updateErr } = await supabase
        .from('grade_forgiveness_requests')
        .update({
          status:                    action,
          professor_comment:         comment[req.request_id] || null,
          professor_approval:        action === 'approved',
          reviewed_by_professor_id:  profile.professor_id,
          reviewed_at:               new Date().toISOString(),
        })
        .eq('request_id', req.request_id);
      if (updateErr) throw updateErr;

      if (action === 'approved') {
        await supabase
          .from('student_grades')
          .update({ forgiven: true, included_in_gpa: false })
          .eq('grade_id', req.grade_id);
      }

      const { data: studentRow } = await supabase
        .from('students')
        .select('user_id')
        .eq('student_id', req.student_id)
        .single();

      if (studentRow?.user_id) {
        const actionLabel = { approved: 'approved', rejected: 'rejected', needs_revision: 'returned for revision' }[action];
        await supabase.from('notifications').insert({
          user_id: studentRow.user_id,
          title:   'Grade Forgiveness Update',
          message: `Your forgiveness request for ${req.module_code} has been ${actionLabel} by your professor.${comment[req.request_id] ? ` Comment: "${comment[req.request_id]}"` : ''}`,
        });
      }

      setExpandedId(null);
      fetchRequests();
    } catch (err) {
      console.error('Error updating request:', err);
    } finally {
      setActing(null);
    }
  };

  if (loading) return <LoadingState label="Loading student requests..." />;

  const pending  = requests.filter(r => r.status === 'pending');
  const resolved = requests.filter(r => r.status !== 'pending');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

      <section>
        <SectionHeader
          title="Pending Requests"
          subtitle="Grade forgiveness requests awaiting your review"
          count={pending.length}
        />
        {pending.length === 0 ? (
          <EmptyState message="No pending requests. All caught up." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pending.map(req => {
              const isOpen = expandedId === req.request_id;
              const isBusy = acting === req.request_id;
              return (
                <div key={req.request_id} style={cardStyle}>
                  <button type="button" onClick={() => setExpandedId(isOpen ? null : req.request_id)} style={rowBtnStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={gradeLetterBadge(req.grade_letter ?? '?')}>{req.grade_letter ?? '?'}</span>
                      <div>
                        <span style={moduleCodeStyle}>{req.module_code}</span>
                        <span style={metaStyle}>
                          {req.student_first_name} {req.student_last_name} · {req.student_id} · {req.academic_year}
                        </span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '10px', color: '#64748b', fontFamily: 'monospace' }}>
                        {new Date(req.request_date).toLocaleDateString()}
                      </span>
                      {isOpen ? <ChevronUp size={14} style={{ color: '#64748b' }} /> : <ChevronDown size={14} style={{ color: '#64748b' }} />}
                    </div>
                  </button>

                  {isOpen && (
                    <div style={formStyle}>
                      <div style={dividerStyle} />

                      <div style={prefillGridStyle}>
                        <PrefillField label="Student"      value={`${req.student_first_name} ${req.student_last_name}`} />
                        <PrefillField label="Student ID"   value={req.student_id} />
                        <PrefillField label="Module"       value={req.module_code ?? '—'} />
                        <PrefillField label="Grade"        value={req.grade_letter ?? '—'} />
                        <PrefillField label="Academic Year" value={req.academic_year ?? '—'} />
                        <PrefillField label="Submitted"    value={new Date(req.request_date).toLocaleString()} />
                      </div>

                      {req.student_signature && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <span style={labelStyle}>Student Signature</span>
                          <img
                            src={req.student_signature}
                            alt="Student signature"
                            style={{ width: '100%', height: '100px', objectFit: 'contain', backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                          />
                        </div>
                      )}

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <label style={labelStyle}>Comment (optional)</label>
                        <textarea
                          rows={3}
                          placeholder="Add a comment for the student..."
                          value={comment[req.request_id] ?? ''}
                          onChange={e => setComment(prev => ({ ...prev, [req.request_id]: e.target.value }))}
                          style={textareaStyle}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleAction(req, 'approved')}
                          style={{ ...actionBtnStyle, backgroundColor: 'rgba(16,185,129,0.15)', color: '#10b981', borderColor: 'rgba(16,185,129,0.3)' }}
                        >
                          {isBusy ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleAction(req, 'needs_revision')}
                          style={{ ...actionBtnStyle, backgroundColor: 'rgba(249,115,22,0.15)', color: '#f97316', borderColor: 'rgba(249,115,22,0.3)' }}
                        >
                          <AlertCircle size={13} />
                          Needs Revision
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleAction(req, 'rejected')}
                          style={{ ...actionBtnStyle, backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                        >
                          <XCircle size={13} />
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {resolved.length > 0 && (
        <section>
          <SectionHeader title="Resolved Requests" subtitle="Previously reviewed forgiveness requests" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {resolved.map(req => {
              const cfg  = STATUS_CONFIG[req.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
              const Icon = cfg.icon;
              return (
                <div key={req.request_id} style={{ ...cardStyle, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={gradeLetterBadge(req.grade_letter ?? '?')}>{req.grade_letter ?? '?'}</span>
                      <div>
                        <span style={moduleCodeStyle}>{req.module_code}</span>
                        <span style={metaStyle}>{req.student_first_name} {req.student_last_name} · {req.academic_year}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '4px 10px', borderRadius: '20px', backgroundColor: cfg.bg, border: `1px solid ${cfg.color}33` }}>
                      <Icon size={12} style={{ color: cfg.color }} />
                      <span style={{ fontSize: '10px', fontWeight: '700', color: cfg.color, fontFamily: 'monospace', textTransform: 'uppercase' }}>{cfg.label}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}


function SectionHeader({ title, subtitle, count }: { title: string; subtitle: string; count?: number }) {
  return (
    <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'baseline', gap: '10px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h3 style={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#f1f5f9', margin: 0 }}>{title}</h3>
          {count !== undefined && count > 0 && (
            <span style={{ fontSize: '9px', fontWeight: '800', backgroundColor: '#ef4444', color: '#fff', borderRadius: '10px', padding: '1px 6px', fontFamily: 'monospace' }}>
              {count}
            </span>
          )}
        </div>
        <p style={{ fontSize: '10px', color: '#475569', margin: '2px 0 0', fontFamily: 'monospace' }}>{subtitle}</p>
      </div>
    </div>
  );
}

function PrefillField({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span style={labelStyle}>{label}</span>
      <span style={{ fontSize: '12px', color: '#f1f5f9', fontFamily: 'monospace', padding: '8px 12px', backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '6px' }}>
        {value}
      </span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{ padding: '32px', textAlign: 'center', border: '1px dashed #1e293b', borderRadius: '10px' }}>
      <p style={{ fontSize: '11px', color: '#475569', fontFamily: 'monospace', margin: 0 }}>{message}</p>
    </div>
  );
}

function LoadingState({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '32px' }}>
      <Loader2 size={16} className="animate-spin" style={{ color: '#eab308' }} />
      <span style={{ fontSize: '11px', fontFamily: 'monospace', color: '#475569', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</span>
    </div>
  );
}


interface Tab3Props { profile: any; }

export default function Tab3_GradeForgivenessRequests({ profile }: Tab3Props) {
  const { role } = useAuth();

  return (
    <div style={{ height: '100%', overflowY: 'auto', paddingRight: '4px' }}>
      <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <PenLine size={16} style={{ color: '#eab308' }} />
        <div>
          <h2 style={{ fontSize: '13px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.8px', color: '#ffffff', margin: 0 }}>
            Grade Forgiveness
          </h2>
          <p style={{ fontSize: '10px', color: '#475569', margin: '2px 0 0', fontFamily: 'monospace' }}>
            {role === 'professor' ? 'Review and action student forgiveness requests' : 'Apply for grade forgiveness on eligible modules'}
          </p>
        </div>
      </div>

      {role === 'student'
        ? <StudentView profile={profile as StudentProfile} />
        : <ProfessorView profile={profile as ProfessorProfile} />
      }
    </div>
  );
}


const cardStyle: React.CSSProperties = {
  backgroundColor: '#020617',
  border: '1px solid #1e293b',
  borderRadius: '10px',
  overflow: 'hidden',
};

const rowBtnStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 18px',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
};

const formStyle: React.CSSProperties = {
  padding: '0 18px 18px',
  display: 'flex',
  flexDirection: 'column',
  gap: '14px',
};

const dividerStyle: React.CSSProperties = {
  height: '1px',
  backgroundColor: '#1e293b',
  marginBottom: '4px',
};

const prefillGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '10px',
};

const labelStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  color: '#475569',
  fontFamily: 'monospace',
};

const moduleCodeStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: '800',
  color: '#f1f5f9',
  fontFamily: 'monospace',
  letterSpacing: '0.5px',
};

const metaStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '10px',
  color: '#475569',
  fontFamily: 'monospace',
  marginTop: '2px',
};

const applyBtnStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: '700',
  color: '#eab308',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontFamily: 'monospace',
};

const submitBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  padding: '12px',
  backgroundColor: '#eab308',
  color: '#0f172a',
  border: 'none',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: '800',
  cursor: 'pointer',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontFamily: 'monospace',
};

const actionBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '9px 16px',
  border: '1px solid',
  borderRadius: '8px',
  fontSize: '11px',
  fontWeight: '700',
  cursor: 'pointer',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  fontFamily: 'monospace',
};

const textareaStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  backgroundColor: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: '8px',
  color: '#f1f5f9',
  fontSize: '12px',
  fontFamily: 'monospace',
  resize: 'vertical',
  outline: 'none',
  boxSizing: 'border-box',
};

const clearBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '10px',
  color: '#475569',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'monospace',
  textTransform: 'uppercase',
};

const errorBannerStyle: React.CSSProperties = {
  padding: '10px 14px',
  backgroundColor: 'rgba(239,68,68,0.1)',
  border: '1px solid rgba(239,68,68,0.3)',
  borderRadius: '6px',
  fontSize: '12px',
  color: '#ef4444',
  fontFamily: 'monospace',
};

const gradeLetterBadge = (letter: string): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: '900',
  fontFamily: 'monospace',
  flexShrink: 0,
  backgroundColor: letter === 'F' ? 'rgba(239,68,68,0.15)' : 'rgba(234,179,8,0.15)',
  color:           letter === 'F' ? '#ef4444'               : '#eab308',
  border:          `1px solid ${letter === 'F' ? 'rgba(239,68,68,0.3)' : 'rgba(234,179,8,0.3)'}`,
});
