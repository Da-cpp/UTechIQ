import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Award, BookOpen, Layers, Calendar, CheckCircle, TrendingUp, Users, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';
import type { StudentProfile, ProfessorProfile } from '../types/database';

interface StudentGradeRow {
  grade_id: string;
  module_code: string;
  module_name: string;
  academic_year: string;
  semester: number;
  attempt_type: 'first_attempt' | 'repeat';
  grade_letter: string;
  grade_points: number;
  credits: number;
  included_in_gpa: boolean;
  forgiven: boolean;
}

interface ProfessorModuleRow {
  assignment_id: string;
  module_code: string;
  module_name: string;
  academic_year: string;
  semester: number;
  student_grades: {
    student_id: string;
    grade_letter: string;
    grade_points: number;
    attempt_type: string;
    included_in_gpa: boolean;
    forgiven: boolean;
  }[];
}

interface Tab2_GradesProps {
  profile: StudentProfile | ProfessorProfile | null;
  role: string;
}


function gradeColor(grade: string): string {
  if (grade.startsWith('A'))  return '#10b981'; // green
  if (grade.startsWith('B'))  return '#38bdf8'; // blue
  if (grade === 'C+' || grade === 'C') return '#eab308'; // amber
  if (grade === 'D')          return '#f97316'; // orange
  return '#ef4444';                             // red — F
}

function standingLabel(gpa: number): string {
  if (gpa >= 3.7) return "Dean's List";
  if (gpa >= 3.0) return 'Honours Standing';
  if (gpa >= 2.0) return 'Good Standing';
  if (gpa >= 1.0) return 'Academic Warning';
  return 'Academic Probation';
}

function standingColor(gpa: number): string {
  if (gpa >= 3.0) return '#10b981';
  if (gpa >= 2.0) return '#eab308';
  return '#ef4444';
}

function avgGpa(grades: ProfessorModuleRow['student_grades']): string {
  const valid = grades.filter(g => g.included_in_gpa && !g.forgiven);
  if (!valid.length) return 'N/A';
  const avg = valid.reduce((sum, g) => sum + g.grade_points, 0) / valid.length;
  return avg.toFixed(2);
}

function passRate(grades: ProfessorModuleRow['student_grades']): string {
  if (!grades.length) return 'N/A';
  const passed = grades.filter(g => g.grade_letter !== 'F' && g.grade_letter !== 'D').length;
  return `${Math.round((passed / grades.length) * 100)}%`;
}


function StudentGrades({ profile }: { profile: StudentProfile }) {
  const [grades, setGrades]   = useState<StudentGradeRow[]>([]);
  const [gpa, setGpa]         = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);

      const [gradesResult, gpaResult] = await Promise.all([
        supabase
          .from('student_grades')
          .select(`
            grade_id,
            module_code,
            academic_year,
            semester,
            attempt_type,
            grade_letter,
            grade_points,
            credits,
            included_in_gpa,
            forgiven,
            modules (module_name)
          `)
          .eq('student_id', profile.student_id)
          .order('academic_year', { ascending: false })
          .order('semester',      { ascending: false }),

        supabase
          .from('student_gpa_view')
          .select('gpa')
          .eq('student_id', profile.student_id)
          .maybeSingle(),
      ]);

      if (gradesResult.error) { setError(gradesResult.error.message); setLoading(false); return; }

      const rows: StudentGradeRow[] = (gradesResult.data ?? []).map((r: any) => ({
        grade_id:        r.grade_id,
        module_code:     r.module_code,
        module_name:     r.modules?.module_name ?? r.module_code,
        academic_year:   r.academic_year,
        semester:        r.semester,
        attempt_type:    r.attempt_type,
        grade_letter:    r.grade_letter,
        grade_points:    r.grade_points,
        credits:         r.credits,
        included_in_gpa: r.included_in_gpa,
        forgiven:        r.forgiven,
      }));

      setGrades(rows);
      setGpa(parseFloat(gpaResult.data?.gpa ?? profile.cumulative_gpa ?? 0));
      setLoading(false);
    };

    fetchAll();
  }, [profile.student_id]);

  const passed        = grades.filter(g => g.included_in_gpa && !g.forgiven && g.grade_letter !== 'F');
  const creditsEarned  = passed.reduce((sum, g) => sum + g.credits, 0);
  const modulesPassed  = new Set(passed.map(g => g.module_code)).size;

  if (loading) return <LoadingState />;
  if (error)   return <ErrorState message={error} />;

  return (
    <div style={styles.viewViewport}>
      <header style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={styles.cardHeader}>
            <span style={styles.cardLabel}>Cumulative GPA</span>
            <Award size={13} style={{ color: '#eab308' }} />
          </div>
          <h3 style={styles.cardValue}>{gpa.toFixed(2)}</h3>
          <span style={{ ...styles.cardTrend, color: standingColor(gpa) }}>
            <TrendingUp size={9} style={{ marginRight: '3px' }} />
            {standingLabel(gpa)}
          </span>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.cardHeader}>
            <span style={styles.cardLabel}>Modules Passed</span>
            <BookOpen size={13} style={{ color: '#38bdf8' }} />
          </div>
          <h3 style={styles.cardValue}>{modulesPassed}</h3>
          <span style={styles.cardSubtext}>{creditsEarned} Credits Earned</span>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.cardHeader}>
            <span style={styles.cardLabel}>Academic Standing</span>
            <CheckCircle size={13} style={{ color: standingColor(gpa) }} />
          </div>
          <h3 style={{ ...styles.cardValue, fontSize: '15px', paddingTop: '4px', paddingBottom: '2px' }}>
            {standingLabel(gpa)}
          </h3>
          <span style={styles.cardSubtext}>
            Year {profile.current_year} · Sem {profile.current_semester}
          </span>
        </div>
      </header>

      <section style={styles.tableSection}>
        <div style={styles.tableHeaderBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={12} style={{ color: '#eab308' }} />
            <h4 style={styles.sectionTitle}>Official Module Transcript Logs</h4>
          </div>
          <span style={styles.auditBadge}>Verified Ledger</span>
        </div>

        <div style={styles.scrollContainer}>
          <table style={styles.tableElement}>
            <thead>
              <tr style={styles.tableThRow}>
                <th style={{ ...styles.th, textAlign: 'left' }}>Module</th>
                <th style={styles.th}>Period</th>
                <th style={styles.th}>Attempt</th>
                <th style={styles.th}>Credits</th>
                <th style={styles.th}>Grade</th>
                <th style={styles.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {grades.map((row) => (
                <tr key={row.grade_id} style={styles.tableBodyRow}>
                  <td style={{ ...styles.td, textAlign: 'left' }}>
                    <div style={{ fontWeight: 'bold', color: '#ffffff', fontSize: '11px' }}>
                      {row.module_code}
                    </div>
                    <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px' }}>
                      {row.module_name}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#94a3b8', fontSize: '10px' }}>
                      <Calendar size={10} style={{ color: '#475569' }} />
                      {row.academic_year} · S{row.semester}
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: row.attempt_type === 'repeat' ? '#451a03' : '#0f172a',
                      color:           row.attempt_type === 'repeat' ? '#f97316' : '#475569',
                      border:          row.attempt_type === 'repeat' ? '1px solid #7c2d12' : '1px solid #1e293b',
                    }}>
                      {row.attempt_type === 'repeat' ? 'Resit' : '1st'}
                    </span>
                  </td>
                  <td style={{ ...styles.td, fontWeight: 'bold', color: '#cbd5e1', fontSize: '11px' }}>
                    {row.credits}
                  </td>
                  <td style={styles.td}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', lineHeight: '1.1' }}>
                      <span style={{ ...styles.gradeIndicator, color: gradeColor(row.grade_letter) }}>
                        {row.grade_letter}
                      </span>
                      <span style={{ fontSize: '8px', fontFamily: 'monospace', color: '#475569' }}>
                        {row.grade_points} pts
                      </span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    {row.forgiven ? (
                      <span style={{ ...styles.badge, backgroundColor: '#1e1b4b', color: '#818cf8', border: '1px solid #3730a3' }}>Forgiven</span>
                    ) : !row.included_in_gpa ? (
                      <span style={{ ...styles.badge, backgroundColor: '#1c1917', color: '#78716c', border: '1px solid #292524' }}>Excluded</span>
                    ) : row.grade_letter === 'F' ? (
                      <span style={{ ...styles.badge, backgroundColor: '#450a0a', color: '#ef4444', border: '1px solid #7f1d1d' }}>Failing</span>
                    ) : (
                      <span style={{ ...styles.badge, backgroundColor: '#052e16', color: '#10b981', border: '1px solid #14532d' }}>Counted</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}


function ProfessorGrades({ profile }: { profile: ProfessorProfile }) {
  const [modules, setModules]         = useState<ProfessorModuleRow[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [expandedModule, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const fetchModules = async () => {
      setLoading(true);

      const { data: assignments, error: aErr } = await supabase
        .from('professor_module_assignments')
        .select(`
          assignment_id,
          module_code,
          academic_year,
          semester,
          modules (module_name)
        `)
        .eq('professor_id', profile.professor_id)
        .order('academic_year', { ascending: false })
        .order('semester',      { ascending: false });

      if (aErr) { setError(aErr.message); setLoading(false); return; }

      const moduleRows: ProfessorModuleRow[] = await Promise.all(
        (assignments ?? []).map(async (a: any) => {
          const { data: gradeData } = await supabase
            .from('student_grades')
            .select('student_id, grade_letter, grade_points, attempt_type, included_in_gpa, forgiven')
            .eq('professor_assignment_id', a.assignment_id);

          return {
            assignment_id: a.assignment_id,
            module_code:   a.module_code,
            module_name:   a.modules?.module_name ?? a.module_code,
            academic_year: a.academic_year,
            semester:      a.semester,
            student_grades: gradeData ?? [],
          };
        })
      );

      setModules(moduleRows);
      setLoading(false);
    };

    fetchModules();
  }, [profile.professor_id]);

  const totalStudents   = new Set(modules.flatMap(m => m.student_grades.map(g => g.student_id))).size;
  const totalModules    = modules.length;
  const overallAvgGpa   = (() => {
    const allGrades = modules.flatMap(m => m.student_grades.filter(g => g.included_in_gpa && !g.forgiven));
    if (!allGrades.length) return 'N/A';
    return (allGrades.reduce((s, g) => s + g.grade_points, 0) / allGrades.length).toFixed(2);
  })();

  if (loading) return <LoadingState />;
  if (error)   return <ErrorState message={error} />;

  return (
    <div style={styles.viewViewport}>
      <header style={styles.metricsGrid}>
        <div style={styles.metricCard}>
          <div style={styles.cardHeader}>
            <span style={styles.cardLabel}>Modules Teaching</span>
            <Layers size={13} style={{ color: '#eab308' }} />
          </div>
          <h3 style={styles.cardValue}>{totalModules}</h3>
          <span style={styles.cardSubtext}>{profile.department.split('School of')[1]?.trim() ?? profile.department}</span>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.cardHeader}>
            <span style={styles.cardLabel}>Total Students</span>
            <Users size={13} style={{ color: '#38bdf8' }} />
          </div>
          <h3 style={styles.cardValue}>{totalStudents}</h3>
          <span style={styles.cardSubtext}>Across all modules</span>
        </div>

        <div style={styles.metricCard}>
          <div style={styles.cardHeader}>
            <span style={styles.cardLabel}>Avg Class GPA</span>
            <Award size={13} style={{ color: '#10b981' }} />
          </div>
          <h3 style={styles.cardValue}>{overallAvgGpa}</h3>
          <span style={styles.cardSubtext}>Included grades only</span>
        </div>
      </header>

      <section style={styles.tableSection}>
        <div style={styles.tableHeaderBar}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={12} style={{ color: '#eab308' }} />
            <h4 style={styles.sectionTitle}>Module Performance Overview</h4>
          </div>
          <span style={styles.auditBadge}>Live Data</span>
        </div>

        <div style={styles.scrollContainer}>
          {modules.map((mod) => {
            const isOpen   = expandedModule === mod.assignment_id;
            const avg      = avgGpa(mod.student_grades);
            const pass     = passRate(mod.student_grades);
            const avgNum   = parseFloat(avg);

            return (
              <div key={mod.assignment_id} style={{ borderBottom: '1px solid #0f172a' }}>
                <div
                  onClick={() => setExpanded(isOpen ? null : mod.assignment_id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    backgroundColor: isOpen ? '#0f172a' : 'transparent',
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div>
                      <div style={{ fontWeight: 'bold', color: '#ffffff', fontSize: '11px' }}>
                        {mod.module_code}
                      </div>
                      <div style={{ fontSize: '10px', color: '#64748b', marginTop: '1px' }}>
                        {mod.module_name}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '9px', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {mod.academic_year} · S{mod.semester}
                      </div>
                      <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>
                        {mod.student_grades.length} students
                      </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', fontFamily: 'monospace', color: isNaN(avgNum) ? '#475569' : standingColor(avgNum) }}>
                        {avg}
                      </div>
                      <div style={{ fontSize: '8px', color: '#475569' }}>avg gpa</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', fontFamily: 'monospace', color: '#38bdf8' }}>
                        {pass}
                      </div>
                      <div style={{ fontSize: '8px', color: '#475569' }}>pass rate</div>
                    </div>
                    {isOpen
                      ? <ChevronUp size={14} style={{ color: '#475569', flexShrink: 0 }} />
                      : <ChevronDown size={14} style={{ color: '#475569', flexShrink: 0 }} />
                    }
                  </div>
                </div>

                {isOpen && (
                  <div style={{ backgroundColor: '#020617', padding: '0 0 8px 0' }}>
                    {mod.student_grades.length === 0 ? (
                      <p style={{ fontSize: '10px', color: '#475569', padding: '12px 14px', margin: 0 }}>
                        No grade records for this module.
                      </p>
                    ) : (
                      <table style={{ ...styles.tableElement, marginTop: '4px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#020617' }}>
                            <th style={{ ...styles.th, textAlign: 'left' }}>Student ID</th>
                            <th style={styles.th}>Attempt</th>
                            <th style={styles.th}>Grade</th>
                            <th style={styles.th}>GPA Pts</th>
                            <th style={styles.th}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {mod.student_grades.map((sg, idx) => (
                            <tr key={idx} style={{ ...styles.tableBodyRow, backgroundColor: '#020617' }}>
                              <td style={{ ...styles.td, textAlign: 'left', fontFamily: 'monospace', fontSize: '11px', color: '#94a3b8' }}>
                                {sg.student_id}
                              </td>
                              <td style={styles.td}>
                                <span style={{
                                  ...styles.badge,
                                  backgroundColor: sg.attempt_type === 'repeat' ? '#451a03' : '#0f172a',
                                  color:           sg.attempt_type === 'repeat' ? '#f97316' : '#475569',
                                  border:          sg.attempt_type === 'repeat' ? '1px solid #7c2d12' : '1px solid #1e293b',
                                }}>
                                  {sg.attempt_type === 'repeat' ? 'Resit' : '1st'}
                                </span>
                              </td>
                              <td style={styles.td}>
                                <span style={{ ...styles.gradeIndicator, color: gradeColor(sg.grade_letter) }}>
                                  {sg.grade_letter}
                                </span>
                              </td>
                              <td style={{ ...styles.td, fontFamily: 'monospace', fontSize: '11px', color: '#cbd5e1' }}>
                                {sg.grade_points}
                              </td>
                              <td style={styles.td}>
                                {sg.forgiven ? (
                                  <span style={{ ...styles.badge, backgroundColor: '#1e1b4b', color: '#818cf8', border: '1px solid #3730a3' }}>Forgiven</span>
                                ) : !sg.included_in_gpa ? (
                                  <span style={{ ...styles.badge, backgroundColor: '#1c1917', color: '#78716c', border: '1px solid #292524' }}>Excluded</span>
                                ) : sg.grade_letter === 'F' ? (
                                  <span style={{ ...styles.badge, backgroundColor: '#450a0a', color: '#ef4444', border: '1px solid #7f1d1d' }}>Failing</span>
                                ) : (
                                  <span style={{ ...styles.badge, backgroundColor: '#052e16', color: '#10b981', border: '1px solid #14532d' }}>Passed</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}


function LoadingState() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569', fontSize: '11px', fontFamily: 'monospace', gap: '8px' }}>
      <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#eab308' }} />
      Fetching records...
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: '8px', color: '#ef4444', fontSize: '11px', fontFamily: 'monospace' }}>
      <AlertTriangle size={14} />
      {message}
    </div>
  );
}


export default function Tab2_Grades({ profile, role }: Tab2_GradesProps) {
  if (!profile) return <LoadingState />;
  if (role === 'professor') return <ProfessorGrades profile={profile as ProfessorProfile} />;
  return <StudentGrades profile={profile as StudentProfile} />;
}


const styles: Record<string, React.CSSProperties> = {
  viewViewport: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    width: '100%',
    gap: '12px',
    boxSizing: 'border-box',
  },
  metricsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: '10px',
    flexShrink: 0,
  },
  metricCard: {
    backgroundColor: '#020617',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    padding: '10px 14px',
    display: 'flex',
    flexDirection: 'column',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '4px',
  },
  cardLabel: {
    fontSize: '9px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#64748b',
  },
  cardValue: {
    fontSize: '20px',
    fontWeight: '800',
    color: '#ffffff',
    margin: '0 0 2px 0',
  },
  cardTrend: {
    display: 'flex',
    alignItems: 'center',
    fontSize: '9px',
    fontWeight: 'bold',
    color: '#10b981',
  },
  cardSubtext: {
    fontSize: '9px',
    color: '#475569',
    fontFamily: 'monospace',
  },
  tableSection: {
    flex: 1,
    backgroundColor: '#020617',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  tableHeaderBar: {
    padding: '10px 14px',
    borderBottom: '1px solid #1e293b',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#070a13',
    flexShrink: 0,
  },
  sectionTitle: {
    margin: 0,
    fontSize: '10px',
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    color: '#94a3b8',
  },
  auditBadge: {
    fontSize: '8px',
    fontFamily: 'monospace',
    color: '#eab308',
    backgroundColor: '#422006',
    padding: '1px 6px',
    borderRadius: '3px',
    border: '1px solid #713f12',
    fontWeight: 'bold',
  },
  scrollContainer: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  tableElement: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '11px',
  },
  tableThRow: {
    backgroundColor: '#020617',
    position: 'sticky',
    top: 0,
    zIndex: 10,
    boxShadow: '0 1px 0px #1e293b',
  },
  th: {
    padding: '10px 14px',
    color: '#64748b',
    fontSize: '9px',
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    textAlign: 'center',
    backgroundColor: '#020617',
  },
  tableBodyRow: {
    borderBottom: '1px solid #0f172a',
    transition: 'background-color 0.15s ease',
  },
  td: {
    padding: '8px 14px',
    textAlign: 'center',
    verticalAlign: 'middle',
    color: '#cbd5e1',
  },
  badge: {
    fontSize: '9px',
    padding: '1px 5px',
    borderRadius: '3px',
    textTransform: 'uppercase',
    letterSpacing: '0.2px',
    fontWeight: 'bold',
    display: 'inline-block',
  },
  gradeIndicator: {
    fontSize: '12px',
    fontWeight: '800',
    fontFamily: 'monospace',
  },
};
