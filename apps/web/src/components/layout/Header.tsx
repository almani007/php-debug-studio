/* ==========================================================================
   PHP Debug Studio - Professional Header Component
   ========================================================================== */
import React from 'react';

interface HeaderProps {
  health: any;
  wsConnected: boolean;
  theme: string;
  onThemeChange: (theme: string) => void;
}

export function Header({ health, wsConnected, theme, onThemeChange }: HeaderProps) {
  const statusColor = health?.status === 'healthy' ? 'text-success' : 'text-danger';
  const statusText = health?.status === 'healthy' ? 'System Online' : 'System Offline';

  return (
    <header className="h-16 flex items-center justify-between border-b border-border-color bg-bg-panel px-6 z-20">
      {/* Left: Brand + Health */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-accent-glass flex items-center justify-center text-accent font-bold text-sm">
            PD
          </div>
          <span className="font-bold text-lg tracking-tight text-text-primary">Debug Studio</span>
        </div>

        <div className="h-4 w-px bg-border-color"></div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-success' : 'var(--danger)'}`}></span>
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-tighter">Daemon</span>
            <span className={`text-xs font-medium ${statusColor}`}>{statusText}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">PHP</span>
            <span className="text-xs font-semibold text-text-primary">8.3</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted">Sessions</span>
            <span className="text-xs font-semibold text-text-primary">0</span>
          </div>
        </div>
      </div>

      {/* Right: Theme + User */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary">Theme</span>
          <select
            value={theme}
            onChange={(e) => onThemeChange(e.target.value as any)}
            className="text-xs bg-bg-card border border-border-color rounded px-2 py-1 text-text-primary focus:border-accent focus:outline-none transition-colors"
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
            <option value="high-contrast">High Contrast</option>
          </select>
        </div>
        <div className="flex items-center gap-2 pl-4 border-l border-border-color">
          <div className="w-8 h-8 rounded-full bg-accent-glass flex items-center justify-center text-accent font-bold text-xs">U</div>
          <span className="text-xs font-medium text-text-primary hidden sm:block">Admin</span>
        </div>
      </div>
    </header>
  );
}