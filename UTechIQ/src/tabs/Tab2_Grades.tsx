import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Search, ShieldAlert } from 'lucide-react';
import type { Enrollment } from '../types/database';
interface Tab2Props {
  profile: any;
}

export default function Tab2_Grades({ profile }: Tab2Props) {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [searchToken, setSearchToken] = useState('');
  const [probationAlert, setProbationAlert] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAcademicMetricsData();
  }, [profile]);

  const fetchAcademicMetricsData = async () => {
    if (!profile) return;
    try {
      let queryBase = supabase.from('enrollments').select('*');
      
      if (profile.role === 'student') {
        queryBase = queryBase.eq('student_id', profile.id);
      } else {
        queryBase = queryBase.eq('professor_id', profile.id);
      }

      const { data, error } = await queryBase;
      if (error) throw error;
      setEnrollments(data || []);

      if (profile.role === 'student' && data && data.length > 0) {
        const structuralGpa = data[0].cumulative_gpa_snapshot || 4.0;
        
        const response = await fetch('http://localhost:8000/api/v1/ml/predict-probation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gpa: structuralGpa, grade_history: data.map(e => e.numeric_grade || 0) })
        });
        const mlResult = await response.json();
        setProbationAlert(mlResult.probation_risk_flag || structuralGpa < 2.0);
      }
    } catch (err) {
      console.error('Failed reading academic data metrics matrix:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-xs uppercase font-mono tracking-widest text-slate-400 p-8 animate-pulse">Assembling grading records ledger matrix...</div>;
  }

  return (
    <div className="space-y-6">
      
      {probationAlert && (
        <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-4 shadow-sm group relative">
          <div className="p-2 bg-amber-500 text-slate-950 rounded-xl shrink-0"><ShieldAlert size={18} className="stroke-[2.5px]" /></div>
          <div>
            <span className="text-xs font-black uppercase text-amber-500 tracking-wider">Academic Probation Warning Badge Triggered</span>
            <p className="text-xs text-slate-600 mt-1">Mathematical projections detect performance trajectory metrics descending near boundary thresholds under UTech Rule 3.</p>
          </div>
          
          <div className="absolute hidden group-hover:block bottom-full left-4 bg-slate-950 text-slate-200 border border-slate-800 p-4 rounded-xl shadow-2xl max-w-sm z-50 mb-2 font-sans">
            <p className="text-[11px] leading-relaxed">
              "Academic Probation is triggered under UTech Regulation 3 when a student's Cumulative GPA falls below 2.0. While on probation, credit limits are tightly restricted to assist with academic recovery."
            </p>
          </div>
        </div>
      )}

      {profile.role === 'student' ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
          <div className="border-b border-slate-100 pb-4 mb-4"><h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Personal Academic Statement</h3></div>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                <th className="pb-3">Module Code</th>
                <th className="pb-3">Status Label</th>
                <th className="pb-3">Numeric Grade</th>
                <th className="pb-3 text-right">Letter Designation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {enrollments.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3.5 font-bold text-slate-900">{record.module_code}</td>
                  <td className="py-3.5 uppercase font-mono text-[10px]">
                    <span className={`px-2 py-0.5 rounded-full font-bold ${record.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                      {record.status}
                    </span>
                  </td>
                  <td className="py-3.5 font-mono">{record.numeric_grade ?? '—'}</td>
                  <td className="py-3.5 font-mono font-bold text-right text-slate-900">{record.letter_grade ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-4 border-b border-slate-100 pb-4">
            <h3 className="text-xs font-black uppercase text-slate-800 tracking-wider">Course Enrollment Ledger Framework</h3>
            <div className="relative w-72">
              <input
                type="text"
                placeholder="Search matrix by Student ID..."
                value={searchToken}
                onChange={(e) => setSearchToken(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 pl-9 text-xs focus:outline-none focus:border-amber-500"
              />
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
            </div>
          </div>

          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-mono text-[10px] uppercase tracking-wider">
                <th className="pb-3">Student UUID Node</th>
                <th className="pb-3">Target Module</th>
                <th className="pb-3">Assigned Grade</th>
                <th className="pb-3 text-right">Class GPA Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {enrollments
                .filter(e => e.student_id.toLowerCase().includes(searchToken.toLowerCase()))
                .map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 font-mono text-slate-900">{record.student_id}</td>
                    <td className="py-3.5 font-bold text-slate-600">{record.module_code}</td>
                    <td className="py-3.5 font-mono font-bold">{record.letter_grade ?? 'Pending'} ({record.numeric_grade ?? '—'})</td>
                    <td className="py-3.5 font-mono font-black text-right text-amber-600">{record.cumulative_gpa_snapshot.toFixed(2)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}