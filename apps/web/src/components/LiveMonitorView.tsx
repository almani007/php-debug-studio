import React, { useState, useEffect } from 'react';
import { api } from '../api/client';

interface LiveMonitorViewProps {
  activeProject: any;
}

export const LiveMonitorView: React.FC<LiveMonitorViewProps> = ({ activeProject }) => {
  const [targetUrl, setTargetUrl] = useState<string>(
    activeProject?.app_url ? activeProject.app_url : 'http://localhost:8084/api/v1/health'
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [probeResult, setProbeResult] = useState<any>(null);
  const [autoProbeInterval, setAutoProbeInterval] = useState<number>(0); // 0 = off, 10, 30, 60

  const executeProbe = async () => {
    setLoading(true);
    try {
      const res = await api.probeLiveMonitor({ url: targetUrl });
      setProbeResult(res);
    } catch (err: any) {
      alert(`Live Probe Failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (autoProbeInterval <= 0) return;
    const timer = setInterval(() => {
      executeProbe();
    }, autoProbeInterval * 1000);
    return () => clearInterval(timer);
  }, [autoProbeInterval, targetUrl]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '14px', overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600 }}>🌍 Live Project Monitor & Security Guard</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Real-time synthetic probing, SSL certificate guard, and zero-leak credential redaction shield.
          </p>
        </div>

        {/* Security Shield Active Badge */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '4px 12px',
          backgroundColor: 'rgba(63, 185, 80, 0.15)',
          border: '1px solid var(--success)',
          borderRadius: '16px',
          color: 'var(--success)',
          fontSize: '12px',
          fontWeight: 600
        }}>
          <span>🛡️ ZERO-LEAK SECURITY SHIELD ACTIVE</span>
        </div>
      </div>

      {/* Target & Controls Bar */}
      <div style={{
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        backgroundColor: 'var(--bg-card)',
        padding: '10px 14px',
        borderRadius: '6px',
        border: '1px solid var(--border-color)',
        flexWrap: 'wrap'
      }}>
        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>LIVE TARGET URL:</span>
        <input
          type="text"
          value={targetUrl}
          onChange={(e) => setTargetUrl(e.target.value)}
          placeholder="https://example.com or http://localhost:8084"
          style={{
            flex: 1,
            minWidth: '240px',
            padding: '6px 10px',
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            color: 'var(--text-primary)',
            fontSize: '13px',
          }}
        />

        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>HEARTBEAT:</span>
        <select
          value={autoProbeInterval}
          onChange={(e) => setAutoProbeInterval(parseInt(e.target.value))}
          style={{
            padding: '6px 10px',
            backgroundColor: 'var(--bg-panel)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            color: 'var(--text-primary)',
            fontSize: '12px',
          }}
        >
          <option value={0}>Manual Only</option>
          <option value={10}>Every 10s</option>
          <option value={30}>Every 30s</option>
          <option value={60}>Every 60s</option>
        </select>

        <button
          onClick={executeProbe}
          disabled={loading}
          style={{
            padding: '6px 16px',
            backgroundColor: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '12px',
          }}
        >
          {loading ? 'Probing Target...' : '▶ Safe Synthetic Probe'}
        </button>
      </div>

      {probeResult && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Key Metrics Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {/* Status */}
            <div style={{ padding: '14px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>STATUS CODE</div>
              <div style={{
                fontSize: '22px',
                fontWeight: 700,
                marginTop: '4px',
                color: probeResult.is_healthy ? 'var(--success)' : 'var(--danger)'
              }}>
                {probeResult.status_code ? `${probeResult.status_code} ${probeResult.status_text}` : 'UNREACHABLE'}
              </div>
            </div>

            {/* Total Latency */}
            <div style={{ padding: '14px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>ROUNDTRIP LATENCY</div>
              <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '4px', color: 'var(--accent)' }}>
                {probeResult.total_duration_ms} ms
              </div>
            </div>

            {/* Security Grade */}
            <div style={{ padding: '14px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>SECURITY HEADERS GRADE</div>
              <div style={{
                fontSize: '22px',
                fontWeight: 700,
                marginTop: '4px',
                color: probeResult.security_headers?.score_grade.startsWith('A') ? 'var(--success)' : 'var(--warning)'
              }}>
                Grade {probeResult.security_headers?.score_grade || 'C'}
              </div>
            </div>

            {/* SSL Days Remaining */}
            <div style={{ padding: '14px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>SSL CERTIFICATE STATUS</div>
              <div style={{
                fontSize: '20px',
                fontWeight: 700,
                marginTop: '4px',
                color: probeResult.ssl?.expires_soon ? 'var(--danger)' : 'var(--success)'
              }}>
                {probeResult.ssl ? `${probeResult.ssl.days_remaining} Days Remaining` : 'Plain HTTP / Internal'}
              </div>
            </div>
          </div>

          {/* Network Timing Breakdown */}
          <div style={{ backgroundColor: 'var(--bg-card)', padding: '14px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>Network Roundtrip Phase Breakdown</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px', textAlign: 'center' }}>
              <div style={{ backgroundColor: 'var(--bg-panel)', padding: '8px', borderRadius: '4px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>DNS LOOKUP</div>
                <div style={{ fontWeight: 600 }}>{probeResult.dns_lookup_ms} ms</div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-panel)', padding: '8px', borderRadius: '4px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>TCP CONNECT</div>
                <div style={{ fontWeight: 600 }}>{probeResult.tcp_connection_ms} ms</div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-panel)', padding: '8px', borderRadius: '4px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>TLS HANDSHAKE</div>
                <div style={{ fontWeight: 600 }}>{probeResult.tls_handshake_ms} ms</div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-panel)', padding: '8px', borderRadius: '4px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>SERVER TTFB</div>
                <div style={{ fontWeight: 600, color: 'var(--accent)' }}>{probeResult.ttfb_ms} ms</div>
              </div>
              <div style={{ backgroundColor: 'var(--bg-panel)', padding: '8px', borderRadius: '4px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>TOTAL ELAPSED</div>
                <div style={{ fontWeight: 600 }}>{probeResult.total_duration_ms} ms</div>
              </div>
            </div>
          </div>

          {/* Security Headers & Redaction Panel */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Left: Security Headers Checklist */}
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '14px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Security Headers Analysis</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                {[
                  { label: 'Strict-Transport-Security (HSTS)', passed: probeResult.security_headers?.hsts },
                  { label: 'X-Content-Type-Options: nosniff', passed: probeResult.security_headers?.x_content_type_options },
                  { label: 'X-Frame-Options (Clickjacking guard)', passed: probeResult.security_headers?.x_frame_options },
                  { label: 'Content-Security-Policy (CSP)', passed: probeResult.security_headers?.csp },
                  { label: 'Referrer-Policy', passed: probeResult.security_headers?.referrer_policy },
                ].map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', backgroundColor: 'var(--bg-panel)', borderRadius: '4px' }}>
                    <span>{item.label}</span>
                    <span style={{ fontWeight: 600, color: item.passed ? 'var(--success)' : 'var(--danger)' }}>
                      {item.passed ? '✓ PRESENT' : '✗ MISSING'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: Zero-Leak Redacted Headers */}
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '14px', borderRadius: '6px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
              <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                Redacted Response Headers (Zero Sensitive Leaks)
              </h3>
              <div style={{ maxHeight: '180px', overflowY: 'auto', backgroundColor: 'var(--bg-panel)', padding: '10px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {Object.entries(probeResult.headers || {}).map(([k, v]: any) => (
                  <div key={k}>
                    <span style={{ color: 'var(--accent)' }}>{k}:</span>{' '}
                    <span style={{ color: typeof v === 'string' && v.includes('[REDACTED') ? 'var(--danger)' : 'var(--text-secondary)' }}>
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {!probeResult && (
        <div style={{ padding: '60px', textAlign: 'center', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
          Enter a target live or staging URL and click "Safe Synthetic Probe" to monitor latency, inspect SSL expiry, and verify zero-leak security.
        </div>
      )}
    </div>
  );
};
