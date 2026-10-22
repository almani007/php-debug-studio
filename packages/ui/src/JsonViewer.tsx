import React from 'react';

export interface JsonViewerProps {
  data: unknown;
}

export const JsonViewer: React.FC<JsonViewerProps> = ({ data }) => {
  const formatted = typeof data === 'string' ? data : JSON.stringify(data, null, 2);

  return (
    <pre
      style={{
        backgroundColor: '#0d1117',
        color: '#c9d1d9',
        padding: '12px',
        borderRadius: '6px',
        border: '1px solid #30363d',
        fontFamily: 'monospace',
        fontSize: '12px',
        overflowX: 'auto',
      }}
    >
      {formatted}
    </pre>
  );
};
