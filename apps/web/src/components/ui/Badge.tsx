/* ==========================================================================
   PHP Debug Studio - Badge Component
   ========================================================================== */
import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'success' | 'danger' | 'warning' | 'info' | 'primary' | 'neutral';
  size?: 'sm' | 'md';
}

export function Badge({ variant = 'neutral', size = 'sm', children, className = '', ...props }: BadgeProps) {
  const variants: Record<string, string> = {
    success: 'bg-success-bg border border-success/20 text-success',
    danger: 'bg-danger-bg border border-danger/20 text-danger',
    warning: 'bg-warning-bg border border-warning/20 text-warning',
    info: 'bg-info-bg border border-info/20 text-info',
    primary: 'bg-accent-glass border border-accent/20 text-accent',
    neutral: 'bg-bg-panel border border-border-color text-text-secondary',
  };

  const sizes: Record<string, string> = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-semibold tracking-tighter
        ${variants[variant]}
        ${sizes[size]}
        ${className || ''}`}
      {...props}
    >
      {children}
    </span>
  );
}