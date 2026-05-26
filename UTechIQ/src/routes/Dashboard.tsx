import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, GraduationCap, Map, LogOut, Landmark, Radio } from 'lucide-react';
import type { UserRole } from '../types/database';
import type { StudentProfile, ProfessorProfile } from '../types/database';

import Tab1_RAG from '../tabs/Tab1_RAG';
import Tab2_Grades from '../tabs/Tab2_Grades';
import Tab3_Curriculum from '../tabs/Tab3_Roadmap';

type TabID = 'rag' | 'grades' | 'roadmap';

interface SidebarNavItem {
  id: TabID;
  label: string;
  icon: React.ComponentType<{ size: number; style?: React.CSSProperties }>;
  allowedRoles: UserRole[];
}

export default function Dashboard() {
  const { profile, role, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabID>('rag');

  const navItems: SidebarNavItem[] = [
    { id: 'rag',     label: 'Workspace AI',      icon: MessageSquare,  allowedRoles: ['student', 'professor'] },
    { id: 'grades',  label: 'Grade Matrix',       icon: GraduationCap,  allowedRoles: ['student', 'professor'] },
    { id: 'roadmap', label: 'Curriculum Roadmap', icon: Map,            allowedRoles: ['student'] },
  ];

  const userRole: UserRole = role ?? 'student';
  const visibleNavItems = navItems.filter(item => item.allowedRoles.includes(userRole));

  React.useEffect(() => {
    if (userRole === 'professor' && activeTab === 'roadmap') {
      setActiveTab('rag');
    }
  }, [userRole, activeTab]);

  const displayName = profile
    ? `${(profile as StudentProfile | ProfessorProfile).first_name} ${(profile as StudentProfile | ProfessorProfile).last_name}`
    : 'Loading...';

  const displayId = profile
    ? ((profile as StudentProfile).student_id ?? (profile as ProfessorProfile).professor_id ?? '-------')
    : '-------';

  const renderTab = () => {
    switch (activeTab) {
      case 'rag':     return <Tab1_RAG profile={profile} />;
      case 'grades':  return <Tab2_Grades profile={profile} role={userRole} />;
      case 'roadmap': return userRole === 'student' ? <Tab3_Curriculum /> : <Tab1_RAG profile={profile} />;
      default:        return <Tab1_RAG profile={profile} />;
    }
  };

  return (
    <div style={styles.appWrapper}>

      <aside style={styles.sidebar}>
        <div>
          <div style={styles.brandHeader}>
            <div style={styles.brandIconBox}>
              <Landmark size={18} style={{ color: '#0f172a' }} />
            </div>
            <div>
              <h2 style={styles.brandTitle}>UTech Portal</h2>
              <span style={styles.brandSubtitle}>{userRole.toUpperCase()} CORE</span>
            </div>
          </div>

          <nav style={styles.navContainer}>
            {visibleNavItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  style={{
                    ...styles.navButton,
                    backgroundColor: isActive ? '#eab308' : 'transparent',
                    color:           isActive ? '#0f172a' : '#94a3b8',
                    borderColor:     isActive ? '#facc15' : 'transparent',
                  }}
                >
                  <IconComponent size={14} style={{ flexShrink: 0 } as React.CSSProperties} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        <div style={styles.sidebarFooter}>
          <div style={styles.userInfoBlock}>
            <p style={styles.userInfoName}>{displayName}</p>
            <p style={styles.userInfoMeta}>ID: {displayId} • {userRole}</p>
          </div>
          <button onClick={signOut} style={styles.signOutButton}>
            <LogOut size={13} />
            <span>Sign Out Session</span>
          </button>
        </div>
      </aside>

      <main style={styles.mainCanvas}>
        <header style={styles.canvasHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Radio size={14} style={{ color: '#eab308' }} className="animate-pulse" />
            <h1 style={styles.nodeTitle}>
              Screen // <span style={{ color: '#ffffff' }}>{activeTab}</span>
            </h1>
          </div>
          <div style={styles.linkStatusBadge}>
            <span style={styles.statusDot} />
            <span style={styles.statusText}>Supabase Online</span>
          </div>
        </header>

        <div style={styles.contentWrapper}>
          {renderTab()}
        </div>
      </main>

    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  appWrapper: {
    display: 'flex',
    height: '100vh',
    width: '100vw',
    overflow: 'hidden',
    backgroundColor: '#020617',
    color: '#f1f5f9',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    boxSizing: 'border-box',
    margin: '0 0 0 -30px',
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
  userInfoBlock: {
    marginBottom: '10px',
    padding: '10px 12px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    border: '1px solid #1e293b',
  },
  userInfoName: {
    fontSize: '11px',
    fontWeight: '700',
    color: '#ffffff',
    margin: 0,
    marginBottom: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  userInfoMeta: {
    fontSize: '9px',
    fontFamily: 'monospace',
    color: '#94a3b8',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
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
