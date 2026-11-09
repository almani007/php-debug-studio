/* ==========================================================================
   PHP Debug Studio - Professional Button Component
   ========================================================================== */
import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  loading?: boolean;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading,
  fullWidth,
  children,
  className = '',
  disabled,
  onClick,
  ...props
}: ButtonProps) {
  const variants: Record<string, string> = {
    primary: 'bg-gradient-to-tr from-cyan-400 to-indigo-500 text-white',
    secondary: 'bg-panel border border-border-color text-text-primary',
    danger: 'bg-danger-bg border border-danger/20 text-danger',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-panel',
    success: 'bg-success-bg border border-success/20 text-success',
  };

  const sizes: Record<string, string> = {
    sm: 'px-3 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={`
        inline-flex items-center justify-center gap-2 rounded-sm font-semibold
        transition-all duration-150
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className || ''}
      `}
      onClick={onClick}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <span className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" />}
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </button>
  );
}