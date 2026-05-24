import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { CheckCircle2, RefreshCw, HelpCircle, Map } from 'lucide-react';
import type { Enrollment } from '../types/database';
export default function Tab3_Curriculum() {
  const [records, setRecords] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCurriculumDataMatrix();
  }, []);

  const fetchCurriculumDataMatrix = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const { data, error } = await supabase
        .from('enrollments')
        .select('*')
        .eq('student_id', sessionData.session.user.id);

      if (error) throw error;
      setRecords(data || []);
    } catch (err) {
      console.error('Error reading structural curriculum array maps:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-xs uppercase font-mono tracking-widest text-slate-400 p-8 animate-pulse">Evaluating milestone prerequisites tracks...</div>;
  }

  // Segment structural modules tracking arrays based on categorical status records fields
  const completed = records.filter(r => r.status === 'completed');
  const active = records.filter(r => r.status === 'current');
  const remaining = records.filter(r => r.status === 'remaining');

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-sm font-black uppercase text-slate-900 tracking-wider flex items-center gap-2">
          <Map size={16} className="text-amber-500 stroke-[2.5px]" />
          <span>Curriculum Checksheet Matrix Roadmap</span>
        </h2>
        <p className="text-xs text-slate-500 font-mono mt-0.5">Automated sequence ledger based on current enrollments relational architecture blocks.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* State Node 1: Completed Blocks */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[11px] font-black uppercase text-emerald-600 tracking-widest font-mono">1. Completed Units</span>
            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[10px] font-mono font-bold">{completed.length} Modules</span>
          </div>
          <div className="space-y-2">
            {completed.map(mod => (
              <div key={mod.id} className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50/40 border border-emerald-100">
                <CheckCircle2 size={14} className="text-emerald-600 mt-0.5 shrink-0 stroke-[2.5px]" />
                <div className="text-xs">
                  <p className="font-black text-slate-900 font-mono">{mod.module_code}</p>
                  <p className="text-[11px] text-slate-500 font-bold uppercase mt-0.5">Passed Matrix Ledger</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* State Node 2: In-Progress Units */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[11px] font-black uppercase text-amber-500 tracking-widest font-mono">2. Active Term</span>
            <span className="px-2 py-0.5 bg-amber-50 text-amber-50 rounded text-[10px] font-mono font-bold">{active.length} Active</span>
          </div>
          <div className="space-y-2">
            {active.map(mod => (
              <div key={mod.id} className="flex items-start gap-3 p-3 rounded-xl bg-amber-50/20 border border-amber-100 relative overflow-hidden">
                <RefreshCw size={14} className="text-amber-500 mt-0.5 shrink-0 animate-spin" style={{ animationDuration: '6s' }} />
                <div className="text-xs z-10">
                  <p className="font-black text-slate-900 font-mono">{mod.module_code}</p>
                  <p className="text-[11px] text-amber-600 font-bold uppercase mt-0.5 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    Currently Doing
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* State Node 3: Remaining Requirement Units */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[11px] font-black uppercase text-slate-400 tracking-widest font-mono">3. Outstanding track</span>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-mono font-bold">Pending Blocks</span>
          </div>
          <div className="space-y-2">
            {remaining.map(mod => (
              <div key={mod.id} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/80 border border-slate-200/60">
                <HelpCircle size={14} className="text-slate-400 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <p className="font-black text-slate-700 font-mono">{mod.module_code}</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">Prerequisite Path Open</p>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}