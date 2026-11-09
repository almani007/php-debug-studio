/* ==========================================================================
   PHP Debug Studio - Professional Sidebar Navigation
   ========================================================================== */
import React, { useState } from 'react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: string;
}

interface SidebarProps {
  activeTab: string;
  onTabChange: (id: string) => void;
  projectCount: number;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'inspector', label: 'Inspector', icon: <span className="flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v1m-6 0a2 2 0 002-2h2a2 2 0 012 2v1m0 0a2 2 0 012 2v3a2 2 0 01-2 2H9a2 2 0 01-2-2zm9-3h2.586a1 1 0 00.707-1.707z"/></svg></span> },
  { id: 'api', label: 'API Studio', icon: <span className="flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 3.055A9.001 9.001 0 1120.945 9h11.011v4a1 1 0 01-1 1h-11a1 1 0 01-1-1v-4c4.771-.552 8.434-4.601 8.927-9h-11c.356.008.684.103 1.015.255M11 13a9 9 0 01-9 9h11a9 9 0 00-9-9z" /></svg></span> },
  { id: 'traces', label: 'Traces', icon: <span className="flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v1m0 0a2 2 0 012 2v3a2 2 0 01-2 2H9a2 2 0 01-2-2zm9-3h2.586a1 1 0 00.707-1.707z"/></svg></span> },
  { id: 'sql', label: 'SQL Studio', icon: <span className="flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v1m0 0a2 2 0 012 2v3a2 2 0 01-2 2H9a2 2 0 01-2-2zm9-3h2.586a1 1 0 00.707-1.707z"/></svg></span> },
  { id: 'debug', label: 'Debugger', icon: <span className="flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></span> },
  { id: 'database', label: 'Database', icon: <span className="flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5c-1.1 0-2-.9-2-2V5c0-1.1.9-2 2-2h14c1.1 0 2 .9 2 2v4c0 1.1-.9 2-2 2zM5 19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-4c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v4c0 1.1.9 2 2 2z" /></svg></span> },
  { id: 'monitor', label: 'Performance', icon: <span className="flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v1m0 0a2 2 0 012 2v3a2 2 0 01-2 2H9a2 2 0 01-2-2zm9-3h2.586a1 1 0 00.707-1.707z"/></svg></span> },
  { id: 'qa', label: 'QA Studio', icon: <span className="flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></span> },
  { id: 'ai-qa', label: 'AI Advisor', icon: <span className="flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.663 17h4.673c1.206 0 2.212-.835 2.46-2.033l.429-2.146c.03-.151.045-.309.045-.462 0-.607-.39-1.106-.903-1.26l-.542-.174a1 1 0 00-1.181.522l-.142.542c-.153.585-.766 1.058-1.407 1.058a2.07 2.07 0 01-1.476-.606l-.157-.226a1 1 0 00-1.474 0l-.156.226a2.07 2.07 0 01-1.476.606l-.19-.087a1 1 0 00-1.474 0l-.156.226a1 1 0 00-.526 1.056c0 .378.037.744.142 1.095l.278 1.11c.089.358.286.679.586.874a2 2 0 001.476.606zM11.25 3a2.25 2.25 0 114.5 0 2.25 2.25 0 01-4.5 0z" /></svg></span> },
];

export function Sidebar({ activeTab, onTabChange, projectCount }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`flex flex-col h-full border-r border-border-color bg-bg-panel transition-all duration-300 ${collapsed ? 'w-[72px]' : 'w-72'}`}>
      {/* Logo */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-border-color">
        <div className="w-8 h-8 rounded-lg bg-accent-glass flex items-center justify-center text-accent font-bold text-sm">
          PD
        </div>
        {(!collapsed && (
          <span className="font-bold text-lg tracking-tight text-text-primary">Debug Studio</span>
        ))}
      </div>

      {/* Projects Count Badge */}
      <div className="px-4 py-2 border-b border-border-color">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs text-text-muted">Active Projects</span>
          <span className="text-xs font-bold text-text-primary">{projectCount}</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-4 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${isActive ? 'bg-accent/10 border border-accent/50 text-accent' : 'text-text-secondary hover:bg-bg-card-hover hover:text-text-primary'}`}
            >
              <span className="w-5 flex items-center justify-center">{item.icon}</span>
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className="p-4 border-t border-border-color">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-bg-card-hover transition-all duration-150">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011.707.293l5.464 4.464a1 1 0 01.293 1.414l-.374.373a1 1 0 01-1.414 0l-1.262-1.262a1 1 0 00-1.414-1.414L6.586 7.343a1 1 0 01-.293-1.414l2.465-2.464a1 1 0 011.414 0l3.536 3.535a1 1 0 011.414-1.414L20.5 7.343a1 1 0 00-1.414-1.414L19 6.343a1 1 0 00-1.414 0L17.057 7.757a1 1 0 01-1.414 0L15.5 9.343a1 1 0 00-1.414 0L13.914 10.93a1 1 0 01-1.414 0L12.5 12a1 1 0 01-1.414-1.414L10.97 9.544a1 1 0 01-1.414 0L9.293 8.475a1 1 0 00-1.414 0L7.757 9a1 1 0 00-1.414 0L6.214 10.54a1 1 0 010 1.414z" /></svg>
          <span className="text-sm font-medium">Settings</span>
        </button>
      </div>
    </aside>
  );
}