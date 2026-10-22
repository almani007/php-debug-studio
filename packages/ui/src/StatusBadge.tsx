import React from 'react';

export interface StatusBadgeProps {
  status: 'healthy' | 'warning' | 'error' | 'offline';
  label?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const colors: Record<string, { bg: string; text: string; dot: string }> = {
    healthy: { bg: 'rgba(63, 185, 80, 0.15)', text: '#3fb950', dot: '#3fb950' },
    warning: { bg: 'rgba(210, 153, 34, 0.15)', text: '#d29922', dot: '#d29922' },
    error: { bg: 'rgba(248, 81, 73, 0.15)', text: '#f85149', dot: '#f85149' },
    offline: { bg: 'rgba(139, 148, 158, 0.15)', text: '#8b949e', dot: '#8b949e' },
  };

  const current = colors[status] || colors.offline;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 8px',
        borderRadius: '12px',
        backgroundColor: current.bg,
        color: current.text,
        fontSize: '12px',
        fontWeight: 500,
      }}
    >
      <span
        style={{
          width: '7px',
          height: '7px',
          borderRadius: '50%',
          backgroundColor: current.dot,
        }}
      />
      {label || status.toUpperCase()}
    </div>
  );
};
