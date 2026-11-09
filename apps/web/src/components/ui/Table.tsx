/* ==========================================================================
   PHP Debug Studio - Data Table Component
   ========================================================================== */
import React from 'react';

export interface TableColumn<T = any> {
  key: string;
  header: string;
  sortable?: boolean;
  width?: string;
  render?: (value: any, row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
}

export interface TableProps<T = any> {
  columns: TableColumn<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  selectedRow?: string | number;
  rowKey?: string;
  className?: string;
}

export function Table<T = any>({
  columns,
  data,
  loading,
  emptyMessage = 'No data available',
  onRowClick,
  selectedRow,
  rowKey = 'id',
  className = '',
}: TableProps<T>) {
  if (loading) {
    return (
      <div className="rounded-lg border border-border-color bg-card p-8 flex items-center justify-center">
        <div className="flex items-center gap-3 text-text-secondary">
          <div className="w-3 h-3 border-2 border-current border-t-transparent animate-spin rounded-full"></div>
          <span className="ml-2 text-sm">Loading...</span>
        </div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-border-color bg-card p-8">
        <div className="flex flex-col items-center justify-center py-12">
          <svg className="w-8 h-8 text-text-muted mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 17v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v1m0 0a2 2 0 012 2v3a2 2 0 01-2 2H9a2 2 0 01-2-2zm9-3h2.586a1 1 0 00.707-1.707z"/></svg>
          <p className="text-xs text-text-muted">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border-color bg-card shadow-sm overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border-color bg-bg-panel ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''}`}
              >
                {col.header}
              </th>
            ))}
            {onRowClick && <th className="px-4 py-3 text-left text-xs font-semibold text-text-muted uppercase tracking-wider border-b border-border-color bg-bg-panel" />}
          </tr>
        </thead>
        <tbody>
          {data.map((row, index) => {
            const rowKeyValue = rowKey ? (row as any)[rowKey] : index;
            const isSelected = rowKey ? (row as any)[rowKey] === selectedRow : false;
            return (
              <tr
                key={rowKeyValue}
                onClick={() => onRowClick && onRowClick(row)}
                className={`transition-colors duration-150 ${isSelected ? 'bg-accent/5 border-l-4 border-accent' : 'hover:bg-bg-card-hover'}`}
              >
                {columns.map((col) => {
                  const value = (row as any)[col.key];
                  return (
                    <td key={col.key} className={`px-4 py-3 text-xs border-b border-border-color/50 ${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : 'text-left'}`}>
                      {col.render ? col.render(value, row) : (
                        <span className={col.align === 'right' ? 'text-right' : ''}>{value}</span>
                      )}
                    </td>
                  );
                })}
                {onRowClick && (
                  <td className="px-4 py-3 text-center border-b border-border-color/50">
                    <button className="w-6 h-6 rounded flex items-center justify-center text-text-secondary hover:text-accent hover:bg-bg-panel hover:bg-opacity-50 transition-colors" title="Select">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M5 13l4 4L19 7"/></svg>
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}