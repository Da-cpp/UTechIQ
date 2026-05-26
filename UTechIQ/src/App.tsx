import { useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { supabase } from './lib/supabaseClient'; 

import Tab1_RAG from './tabs/Tab1_RAG';
import Tab2_Grades from './tabs/Tab2_Grades';
import Tab3_Curriculum from './tabs/Tab3_Roadmap';

import Login from './routes/Login';

import { MessageSquare, GraduationCap, Map, LogOut, Loader2, Landmark, Radio } from 'lucide-react';
import { useState } from 'react';

export default function App() {
  const { user, profile, role, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<'rag' | 'grades' | 'roadmap'>('rag');

  useEffect(() => {
    if (role === 'professor' && activeTab === 'roadmap') {
      setActiveTab('rag');
    }
  }, [role, activeTab]);

  if (loading) {
    return (
      <div style={{ height: '100vh', width: '100vw', backgroundColor: '#020617', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <Loader2 size={32} className="animate-spin" style={{ color: '#eab308' }} />
        <span style={{ fontSize: '11px', fontFamily: 'monospace', fontWeight: 'bold', color: '#64748b', textTransform: 'uppercase', letterSpacing: '1.5px' }}>
          Verifying UTech Academic Matrix...
        </span>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={() => {}} />;
  }

  const displayName = profile
    ? `${(profile as any).first_name} ${(profile as any).last_name}`
    : 'Loading...';

  const displayId = profile
    ? ((profile as any).student_id ?? (profile as any).professor_id ?? '-------')
    : '-------';

  const handleForceSignOut = async () => {
    try {
      await supabase.auth.signOut();
      window.location.reload(); 
    } catch (err) {
      console.error('Session clearance exception:', err);
    }
  };

  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'rag':
        return <Tab1_RAG profile={profile} />;
      case 'grades':
        return <Tab2_Grades profile={profile} role={role ?? 'student'} />;
      case 'roadmap':
        if (role === 'professor') return <Tab1_RAG profile={profile} />;
        return <Tab3_Curriculum />;
      default:
        return <Tab1_RAG profile={profile} />;
    }
  };

  return (
    <div style={appStyles.appWrapper}>

      <aside style={appStyles.sidebar}>
        <div>
          <div style={appStyles.brandHeader}>
            <div style={appStyles.brandIconBox}>
              <Landmark size={18} style={{ color: '#0f172a' }} />
            </div>
            <div>
              <h2 style={appStyles.brandTitle}>UTech Portal</h2>
              <span style={appStyles.brandSubtitle}>
                {(role || 'STUDENT').toUpperCase()} CORE
              </span>
            </div>
          </div>

          <nav style={appStyles.navContainer}>
            <button
              type="button"
              onClick={() => setActiveTab('rag')}
              style={{
                ...appStyles.navButton,
                backgroundColor: activeTab === 'rag' ? '#eab308' : 'transparent',
                color: activeTab === 'rag' ? '#0f172a' : '#94a3b8',
                borderColor: activeTab === 'rag' ? '#facc15' : 'transparent',
              }}
            >
              <MessageSquare size={14} style={{ flexShrink: 0 }} />
              <span>Workspace AI</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('grades')}
              style={{
                ...appStyles.navButton,
                backgroundColor: activeTab === 'grades' ? '#eab308' : 'transparent',
                color: activeTab === 'grades' ? '#0f172a' : '#94a3b8',
                borderColor: activeTab === 'grades' ? '#facc15' : 'transparent',
              }}
            >
              <GraduationCap size={14} style={{ flexShrink: 0 }} />
              <span>Grade Matrix</span>
            </button>

            {role !== 'professor' && (
              <button
                type="button"
                onClick={() => setActiveTab('roadmap')}
                style={{
                  ...appStyles.navButton,
                  backgroundColor: activeTab === 'roadmap' ? '#eab308' : 'transparent',
                  color: activeTab === 'roadmap' ? '#0f172a' : '#94a3b8',
                  borderColor: activeTab === 'roadmap' ? '#facc15' : 'transparent',
                }}
              >
                <Map size={14} style={{ flexShrink: 0 }} />
                <span>Curriculum Roadmap</span>
              </button>
            )}
          </nav>
        </div>

        <div style={appStyles.sidebarFooter}>
          <div style={{ marginBottom: '10px', padding: '10px 12px', backgroundColor: '#0f172a', borderRadius: '8px', border: '1px solid #1e293b' }}>
            {profile ? (
              <>
                <p style={{ fontSize: '11px', fontWeight: '700', color: '#ffffff', margin: 0, marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName}
                </p>
                <p style={{ fontSize: '9px', fontFamily: 'monospace', color: '#94a3b8', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  ID: {displayId} • {role}
                </p>
              </>
            ) : (
              <div>
                <p style={{ fontSize: '10px', color: '#fca5a5', margin: '0 0 4px 0', fontFamily: 'monospace' }}>⚠️ SESSION DESYNCED</p>
                <button 
                  type="button"
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  style={{ background: '#f43f5e', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  FORCE CLEAR STORAGE
                </button>
              </div>
            )}
          </div>

          <button type="button" onClick={handleForceSignOut} style={appStyles.signOutButton}>
            <LogOut size={13} />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>

      <main style={appStyles.mainCanvas}>
        <header style={appStyles.canvasHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Radio size={14} style={{ color: '#eab308' }} className="animate-pulse" />
            <h1 style={appStyles.nodeTitle}>
              Screen // <span style={{ color: '#ffffff' }}>{activeTab}</span>
            </h1>
          </div>
          <div style={appStyles.linkStatusBadge}>
            <span style={appStyles.statusDot} />
            <span style={appStyles.statusText}>Supabase Online</span>
          </div>
        </header>

        <div style={appStyles.contentWrapper}>
          {renderActiveTabContent()}
        </div>
      </main>

    </div>
  );
}

const appStyles: Record<string, React.CSSProperties> = {
  appWrapper: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    backgroundColor: '#020617',
    color: '#f1f5f9',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    boxSizing: 'border-box',
    position: 'relative',
    left: '-30px', 
    margin: 0,
    padding: 0,
  },
  sidebar: {
    width: '240px',
    backgroundColor: '#020617',
    borderRight: '1px solid #1e293b',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    flexShrink: 0,
    boxSizing: 'border-box',
  },
  brandHeader: {
    padding: '20px',
    borderBottom: '1px solid #1e293b',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  brandIconBox: {
    padding: '8px',
    backgroundColor: '#eab308',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandTitle: {
    fontSize: '13px',
    fontWeight: '900',
    letterSpacing: '0.5px',
    textTransform: 'uppercase',
    color: '#ffffff',
    margin: 0,
  },
  brandSubtitle: {
    fontSize: '9px',
    fontFamily: 'monospace',
    color: '#eab308',
    fontWeight: 'bold',
    letterSpacing: '1px',
    display: 'block',
    marginTop: '2px',
  },
  navContainer: {
    padding: '16px 12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  navButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: '700',
    border: '1px solid transparent',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'all 0.15s ease',
  },
  sidebarFooter: {
    padding: '16px',
    borderTop: '1px solid #1e293b',
  },
  signOutButton: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '10px',
    backgroundColor: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: '8px',
    fontSize: '11px',
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  mainCanvas: {
    flex: 1,
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: '#0f172a',
  },
  canvasHeader: {
    height: '56px',
    borderBottom: '1px solid #1e293b',
    backgroundColor: '#020617',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 24px',
    flexShrink: 0,
  },
  nodeTitle: {
    fontSize: '10px',
    fontFamily: 'monospace',
    fontWeight: '900',
    letterSpacing: '1px',
    color: '#64748b',
    textTransform: 'uppercase',
    margin: 0,
  },
  linkStatusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#0f172a',
    padding: '6px 12px',
    borderRadius: '20px',
    border: '1px solid #1e293b',
  },
  statusDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    backgroundColor: '#10b981',
  },
  statusText: {
    fontSize: '9px',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  contentWrapper: {
    flex: 1,
    padding: '24px',
    overflow: 'hidden',
    boxSizing: 'border-box',
  },
};