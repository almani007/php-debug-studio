/* ==========================================================================
   PHP Debug Studio - Stat Card Component
   ========================================================================== */
import React from 'react';

export interface StatCardProps {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: 'cyan' | 'green' | 'amber' | 'red' | 'purple';
  trend?: { label: string; value: number; up: boolean };
}

export function StatCard({ title, value, icon, color = 'cyan', trend }: StatCardProps) {
  const colorMap: Record<string, string> = {
    cyan: 'text-cyan-400 border-cyan-400/20 bg-cyan-400/5',
    green: 'text-emerald-400 border-emerald-400/20 bg-emerald-400/5',
    amber: 'text-amber-400 border-amber-400/20 bg-amber-400/5',
    red: 'text-rose-400 border-rose-400/20 bg-rose-400/5',
    purple: 'text-fuchsia-400 border-fuchsia-400/20 bg-fuchsia-400/5',
  };

  return (
    <div className="rounded-lg border border-border-color bg-card p-5 shadow-sm hover:border-border-hover transition-all duration-150">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-8 h-8 rounded-sm flex items-center justify-center ${colorMap[color]}`}>
          {icon}
        </div>
        <span className="text-xs text-text-muted font-medium">{trend?.up ? '▲' : '▼'} {trend?.value}%</span>
      </div>
      <div className="text-[2rem] font-bold text-text-primary">{value}</div>
      <div className="mt-1 text-[11px] font-medium text-text-secondary uppercase tracking-tighter">{title}</div>
      {trend && (
        <div className="mt-2 flex items-center gap-1 text-[10px]">
          <span className={`${trend.up ? 'text-success' : 'text-danger'} font-semibold`}>
            {trend.up ? '▲' : '▼'}{trend.value}%
          </span>
          <span className="text-text-muted">from last period</span>
        </div>
      )}
    </div>
  );
}