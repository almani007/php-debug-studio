/* ==========================================================================
   PHP Debug Studio - Empty State Component
   ========================================================================== */
import React from 'react';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, subtitle, action, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-20 text-text-secondary ${className}`}>
      {icon && <div className="w-16 h-16 rounded-lg bg-bg-panel border border-border-color flex items-center justify-center mb-6">{icon}</div>}
      <h3 className="text-sm font-semibold text-text-primary mb-2">{title}</h3>
      {subtitle && <p className="text-xs text-text-muted mb-6">{subtitle}</p>}
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}