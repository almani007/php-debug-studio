/* ==========================================================================
   PHP Debug Studio - Alert Component
   ========================================================================== */
import React from 'react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'success' | 'danger' | 'warning' | 'info';
  title?: string;
  closable?: boolean;
  onClose?: () => void;
}

export function Alert({ variant = 'info', title, closable = false, onClose, className = '', children, ...props }: AlertProps) {
  const variants: Record<string, string> = {
    success: 'bg-success-bg border border-success/20 text-success',
    danger: 'bg-danger-bg border border-danger/20 text-danger',
    warning: 'bg-warning-bg border border-warning/20 text-warning',
    info: 'bg-info-bg border border-info/20 text-info',
  };

  return (
    <div
      className={`rounded-lg border p-4 flex items-start gap-3 ${variants[variant]} ${className || ''}`}
      {...props}
    >
      <div className="flex-shrink-0 mt-0.5">
        {variant === 'success' ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.293 8.707a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
        ) : variant === 'danger' ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
        ) : variant === 'warning' ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.581 9.66a1.25 1.25 0 01-1.064 1.529l-6.579 2.778a1.25 1.25 0 01-1.62-1.21l-2.778-6.578a1.25 1.25 0 011.62-1.529zM6.75 9.117a1.25 1.25 0 012.17-.962l1.904 2.954c.085.132.098.302.05.453a1.25 1.25 0 01-.527.91l-3.08 1.322a1.25 1.25 0 01-1.621-1.21l-1.513-3.652a1.25 1.25 0 01.978-1.125zM11.25 6a.75.75 0 010 1.5H5a.75.75 0 010-1.5z" clipRule="evenodd" /></svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
        )}
      </div>
      <div className="flex-1">
        {title && <div className="text-xs font-semibold">{title}</div>}
        <div className="text-sm">{children}</div>
      </div>
      {closable && (
        <button
          onClick={onClose}
          className="ml-auto flex-shrink-0 w-6 h-6 rounded flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-bg-panel transition-colors"
          aria-label="Close"
        >
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.856a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
        </button>
      )}
    </div>
  );
}