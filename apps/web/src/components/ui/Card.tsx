/* ==========================================================================
   PHP Debug Studio - Card Component
   ========================================================================== */
import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  padded?: boolean;
}

export function Card({ children, hover = false, padded = true, className = '', ...props }: CardProps) {
  return (
    <div
      className={`
        relative rounded-xl border border-border-color bg-card shadow-sm
        transition-all duration-150
        ${hover ? 'hover:border-border-hover hover:shadow-md' : ''}
        ${padded ? 'p-5' : ''}
        ${className || ''}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function CardHeader({ title, subtitle, actions, className = '', ...props }: CardHeaderProps) {
  return (
    <div className={`flex flex-col gap-1 mb-5 ${className}`} {...props}>
      {title && <h4 className="text-sm font-semibold text-text-primary">{title}</h4>}
      {subtitle && <p className="text-xs text-text-secondary">{subtitle}</p>}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardBody({ children, className = '', ...props }: CardBodyProps) {
  return <div className={className} {...props}>{children}</div>;
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

export function CardFooter({ children, className = '', ...props }: CardFooterProps) {
  return (
    <div className={`flex items-center justify-end gap-2 mt-5 pt-5 border-t border-border-color ${className}`} {...props}>
      {children}
    </div>
  );
}