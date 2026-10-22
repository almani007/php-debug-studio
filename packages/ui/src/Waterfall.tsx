import React from 'react';

export interface WaterfallSpan {
  id: string;
  name: string;
  kind: string;
  startOffsetMs: number;
  durationMs: number;
}

export interface WaterfallProps {
  totalDurationMs: number;
  spans: WaterfallSpan[];
}

export const Waterfall: React.FC<WaterfallProps> = ({ totalDurationMs, spans }) => {
  const safeTotal = totalDurationMs > 0 ? totalDurationMs : 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
      {spans.map((span) => {
        const leftPercent = Math.min(100, Math.max(0, (span.startOffsetMs / safeTotal) * 100));
        const widthPercent = Math.min(100 - leftPercent, Math.max(2, (span.durationMs / safeTotal) * 100));

        return (
          <div
            key={span.id}
            style={{
              display: 'grid',
              gridTemplateColumns: '200px 1fr 60px',
              alignItems: 'center',
              fontSize: '12px',
              gap: '8px',
            }}
          >
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#c9d1d9' }}>
              {span.name}
            </div>

            <div style={{ position: 'relative', height: '14px', backgroundColor: '#21262d', borderRadius: '3px' }}>
              <div
                style={{
                  position: 'absolute',
                  left: `${leftPercent}%`,
                  width: `${widthPercent}%`,
                  height: '100%',
                  backgroundColor: span.kind === 'db' ? '#3fb950' : '#58a6ff',
                  borderRadius: '3px',
                }}
              />
            </div>

            <div style={{ textAlign: 'right', color: '#8b949e', fontFamily: 'monospace' }}>
              {span.durationMs}ms
            </div>
          </div>
        );
      })}
    </div>
  );
};
