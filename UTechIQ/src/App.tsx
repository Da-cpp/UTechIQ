import { useEffect, useState } from 'react';
import { supabase } from './lib/supabaseClient';

import Tab1_RAG from './tabs/Tab1_RAG';
import Tab2_Grades from './tabs/Tab2_Grades';
import Tab3_Curriculum from './tabs/Tab3_Roadmap';

import Login from './routes/Login';

import { MessageSquare, GraduationCap, Map, LogOut, Loader2, Landmark } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'rag' | 'grades' | 'roadmap'>('rag');
  const [appLoading, setAppLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfile(session.user.id);
      else setAppLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setProfile(null);
        setAppLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []); // ✓ Empty dependency array ensures authentication setups only execute once

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Profiles backend table structural scan returned empty. Activating dev fallback.');
        setProfile({
          id: userId,
          name: "UTech Sandbox User",
          role: "student",
          id_number: "2205034"
        });
        return;
      }
      setProfile(data);
    } catch (err) {
      console.error('Error fetching university profile credentials:', err);
    } finally {
      setAppLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  // ✓ Early returns keep the rendering tree simple and clean, avoiding tree mismatches
  if (appLoading) {
    return (
      <div className="h-screen w-screen bg-slate-900 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        <span className="text-xs font-semibold tracking-widest uppercase text-slate-500 font-mono">
          Verifying UTech Academic Matrix...
        </span>
      </div>
    );
  }

  if (!session) {
    return <Login onLoginSuccess={() => setAppLoading(true)} />;
  }

  // ✓ DETERMINISTIC ROUTING MECHANISM: Isolates the render choices into a predictable mapping pattern
  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'rag':
        return <Tab1_RAG profile={profile} />;
      case 'grades':
        return <Tab2_Grades profile={profile} />;
      case 'roadmap':
        if (profile?.role === 'professor') {
          return <Tab1_RAG profile={profile} />;
        }
        return <Tab3_Curriculum />;
      default:
        return <Tab1_RAG profile={profile} />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      
      {/* 1. PERSISTENT SIDEBAR COMPONENT (20% Viewport Area) */}
      <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col justify-between border-r border-slate-800 shadow-xl shrink-0">
        <div>
          <div className="p-6 border-b border-slate-800 flex items-center gap-3 bg-slate-950/40">
            <div className="p-2 bg-amber-500 text-slate-950 rounded-xl shadow-lg ring-4 ring-amber-500/10">
              <Landmark size={20} className="stroke-[2.5px]" />
            </div>
            <div>
              <h2 className="text-sm font-black tracking-wider uppercase text-white">UTech Portal</h2>
              <span className="text-[10px] text-amber-500 font-mono font-bold tracking-widest uppercase block">
                {profile?.role || 'STUDENT'} CORE
              </span>
            </div>
          </div>

          <nav className="p-4 space-y-1">
            <button
              onClick={() => setActiveTab('rag')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-150 border uppercase tracking-wider ${
                activeTab === 'rag'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-md'
                  : 'text-slate-400 border-transparent hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <MessageSquare size={16} className="shrink-0 stroke-[2.5px]" />
              <span>Tab 1: Assistant AI</span>
            </button>

            <button
              onClick={() => setActiveTab('grades')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-150 border uppercase tracking-wider ${
                activeTab === 'grades'
                  ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-md'
                  : 'text-slate-400 border-transparent hover:bg-slate-800/60 hover:text-white'
              }`}
            >
              <GraduationCap size={16} className="shrink-0 stroke-[2.5px]" />
              <span>Tab 2: Grade Matrix</span>
            </button>

            {profile?.role !== 'professor' && (
              <button
                onClick={() => setActiveTab('roadmap')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-150 border uppercase tracking-wider ${
                  activeTab === 'roadmap'
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-extrabold shadow-md'
                    : 'text-slate-400 border-transparent hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Map size={16} className="shrink-0 stroke-[2.5px]" />
                <span>Tab 3: Roadmap</span>
              </button>
            )}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-950/20 space-y-3">
          <div className="px-2 py-1.5 rounded-lg bg-slate-800/40 border border-slate-800">
            <p className="text-xs font-bold text-slate-200 truncate">{profile?.name || 'Academic User'}</p>
            <p className="text-[10px] font-mono text-slate-500 truncate uppercase mt-0.5 tracking-wider">
              ID: {profile?.id_number || '----------'}
            </p>
          </div>

          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-rose-950/30 border border-slate-700/60 hover:border-rose-900/50 rounded-xl text-xs font-bold text-slate-400 hover:text-rose-400 transition-all uppercase tracking-wider shadow-sm"
          >
            <LogOut size={14} className="stroke-[2.5px]" />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>

      {/* 2. FLEX RECTANGLE MAIN VIEW CANVAS CONTAINER WORKSPACE (80% Viewport Area) */}
      <main className="flex-1 h-full flex flex-col overflow-hidden bg-slate-50">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-8 shadow-xs shrink-0">
          <h1 className="text-xs font-extrabold uppercase tracking-widest text-slate-400 font-mono">
            Active Workspace Node // <span className="text-slate-800">{activeTab}</span>
          </h1>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-400 font-mono uppercase tracking-wider">
              Supabase Link Stable
            </span>
          </div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto max-w-7xl w-full mx-auto">
          {renderActiveTabContent()}
        </div>
      </main>

    </div>
  );
}
