import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, BarChart3, Compass, LogOut, ShieldAlert, UserCheck } from 'lucide-react';

// Using strict type-only imports to satisfy verbatimModuleSyntax
import type { UserRole } from '../types/database';

type TabID = 'rag' | 'grades' | 'roadmap';

interface SidebarNavItem {
  id: TabID;
  label: string;
  icon: React.ComponentType<{ size: number; className?: string }>;
  allowedRoles: UserRole[];
}

export default function Dashboard() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<TabID>('rag');

  // Unified Tab Configuration Array
  const navItems: SidebarNavItem[] = [
    { 
      id: 'rag', 
      label: 'AI Knowledge RAG', 
      icon: MessageSquare, 
      allowedRoles: ['student', 'professor'] 
    },
    { 
      id: 'grades', 
      label: 'Academic Standings', 
      icon: BarChart3, 
      allowedRoles: ['student', 'professor'] 
    },
    { 
      id: 'roadmap', 
      label: 'Curriculum Roadmap', 
      icon: Compass, 
      allowedRoles: ['student'] // Strict Role Restriction Enforcement
    },
  ];

  // Filter navigation items dynamically based on user profile role
  const userRole: UserRole = profile?.role ?? 'student';
  const visibleNavItems = navItems.filter(item => item.allowedRoles.includes(userRole));

  // Safety Fallback Guard: If a professor manually tries to sit on a restricted tab, force them off
  React.useEffect(() => {
    if (userRole === 'professor' && activeTab === 'roadmap') {
      setActiveTab('rag');
    }
  }, [userRole, activeTab]);

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800 antialiased">
      
      {/* 1. PERSISTENT SIDEBAR NAVIGATION (20% Viewport Width) */}
      <aside className="w-1/5 min-w-[240px] bg-slate-900 text-slate-200 flex flex-col border-r border-slate-800">
        
        {/* Branding Identity Block */}
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-slate-950 font-bold">
            U
          </div>
          <div>
            <h2 className="font-bold tracking-tight text-white text-base">UTech Portal</h2>
            <span className="text-xs text-slate-400 block uppercase font-semibold tracking-wider">Workspace Shell</span>
          </div>
        </div>

        {/* Dynamic Nav Item List */}
        <nav className="flex-1 p-4 space-y-1">
          {visibleNavItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/10'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`}
              >
                <IconComponent size={18} className={isActive ? 'text-slate-950' : 'text-slate-400'} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Active User Footer Status Badge */}
        <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-950/40">
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 bg-slate-800 rounded-md text-slate-400 mt-0.5">
              {userRole === 'professor' ? <ShieldAlert size={16} className="text-amber-400" /> : <UserCheck size={16} />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{profile?.name ?? 'Loading profile...'}</p>
              <p className="text-[10px] text-slate-400 truncate tracking-wide uppercase font-mono mt-0.5">
                ID: {profile?.id_number ?? '-------'} • {userRole}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-slate-800 rounded-lg text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all"
          >
            <LogOut size={14} />
            <span>Terminate Session</span>
          </button>
        </div>
      </aside>

      {/* 2. DYNAMIC WORKSPACE COMPONENT PANEL (80% Viewport Width) */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Global Dashboard Navigation Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="font-medium text-slate-400 uppercase tracking-wider text-xs">Active Segment</span>
            <span className="text-slate-300">/</span>
            <span className="capitalize text-slate-800 font-semibold text-sm">
              {navItems.find(n => n.id === activeTab)?.label}
            </span>
          </div>
          <div className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold font-mono uppercase tracking-wider">
            UTech-v1.0.0
          </div>
        </header>

        {/* Main Interface Tab Rendering Body */}
        <div className="flex-1 p-8">
          {activeTab === 'rag' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Tab 1: AI Knowledge RAG</h3>
              <p className="text-sm text-slate-500">Document indexer vector and institutional RAG stream workspace context template.</p>
            </div>
          )}

          {activeTab === 'grades' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Tab 2: Academic Standings Matrix</h3>
              <p className="text-sm text-slate-500">Relational module performance reporting grid and warning indicators framework.</p>
            </div>
          )}

          {activeTab === 'roadmap' && userRole === 'student' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Tab 3: Curriculum Roadmap</h3>
              <p className="text-sm text-slate-500">Degree configuration checklist tracking completed vs upcoming program tracks.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}