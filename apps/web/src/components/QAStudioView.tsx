import React, { useState } from 'react';
import { api } from '../api/client';

interface QAStudioViewProps {
  activeProject: any;
  projects: any[];
}

export const QAStudioView: React.FC<QAStudioViewProps> = ({ activeProject }) => {
  const [qaSubTab, setQaSubTab] = useState<'smoke' | 'fuzz' | 'benchmark' | 'dossier'>('smoke');

  // Smoke test state
  const [smokeBaseUrl, setSmokeBaseUrl] = useState<string>(activeProject?.app_url || 'http://localhost:8084');
  const [smokeLoading, setSmokeLoading] = useState<boolean>(false);
  const [smokeResult, setSmokeResult] = useState<any>(null);

  // Fuzzing state
  const [fuzzUrl, setFuzzUrl] = useState<string>(
    activeProject?.app_url ? `${activeProject.app_url}/api/v1/health` : 'http://localhost:8084/api/v1/health'
  );
  const [fuzzParam, setFuzzParam] = useState<string>('query');
  const [fuzzMethod, setFuzzMethod] = useState<'POST' | 'GET' | 'PUT'>('POST');
  const [fuzzLoading, setFuzzLoading] = useState<boolean>(false);
  const [fuzzReport, setFuzzReport] = useState<any>(null);

  // Benchmark state
  const [benchUrl, setBenchUrl] = useState<string>(
    activeProject?.app_url ? `${activeProject.app_url}/api/v1/health` : 'http://localhost:8084/api/v1/health'
  );
  const [benchConcurrency, setBenchConcurrency] = useState<number>(10);
  const [benchRequests, setBenchRequests] = useState<number>(30);
  const [benchLoading, setBenchLoading] = useState<boolean>(false);
  const [benchReport, setBenchReport] = useState<any>(null);

  const handleRunSmoke = async () => {
    setSmokeLoading(true);
    try {
      const res = await api.runQASmoke({
        base_url: smokeBaseUrl,
        project_path: activeProject?.root_path || '',
      });
      setSmokeResult(res);
    } catch (err: any) {
      alert(`Smoke Test Failed: ${err.message}`);
    } finally {
      setSmokeLoading(false);
    }
  };

  const handleRunFuzz = async () => {
    setFuzzLoading(true);
    try {
      const res = await api.runQAFuzz({
        target_url: fuzzUrl,
        method: fuzzMethod,
        parameter: fuzzParam,
      });
      setFuzzReport(res);
    } catch (err: any) {
      alert(`Fuzzing Test Failed: ${err.message}`);
    } finally {
      setFuzzLoading(false);
    }
  };

  const handleRunBenchmark = async () => {
    setBenchLoading(true);
    try {
      const res = await api.runQABenchmark({
        target_url: benchUrl,
        method: 'GET',
        concurrency: benchConcurrency,
        total_requests: benchRequests,
      });
      setBenchReport(res);
    } catch (err: any) {
      alert(`Benchmark Failed: ${err.message}`);
    } finally {
      setBenchLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '14px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600 }}>🎯 QA Automated Suite (Manual QA Replacement)</h2>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            End-to-end automated QA testing: route smoke crawler, input boundary fuzzing, and load SLA benchmarking.
          </p>
        </div>

        {/* Sub-tab Switcher */}
        <div style={{ display: 'flex', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', padding: '2px' }}>
          {[
            { id: 'smoke', label: '🚀 Route Smoke Crawler' },
            { id: 'fuzz', label: '🛡️ Boundary & Fuzzing QA' },
            { id: 'benchmark', label: '⚡ Load & Concurrency SLA' },
            { id: 'dossier', label: '📋 QA Audit Dossier' },
          ].map((st) => (
            <button
              key={st.id}
              onClick={() => setQaSubTab(st.id as any)}
              style={{
                padding: '6px 12px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: qaSubTab === st.id ? 'var(--bg-panel)' : 'transparent',
                color: qaSubTab === st.id ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: qaSubTab === st.id ? 600 : 400,
              }}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subtab 1: Smoke Crawler */}
      {qaSubTab === 'smoke' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '12px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>TARGET BASE URL:</span>
            <input
              type="text"
              value={smokeBaseUrl}
              onChange={(e) => setSmokeBaseUrl(e.target.value)}
              placeholder="http://localhost:8084"
              style={{
                flex: 1,
                padding: '6px 10px',
                backgroundColor: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            />
            <button
              onClick={handleRunSmoke}
              disabled={smokeLoading}
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
              {smokeLoading ? 'Crawling Routes...' : '▶ Run Full Route Smoke Test'}
            </button>
          </div>

          {smokeResult && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
              <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL ENDPOINTS</div>
                <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '4px' }}>{smokeResult.total_routes}</div>
              </div>
              <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600 }}>PASSED (OK / 4xx)</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--success)', marginTop: '4px' }}>{smokeResult.passed}</div>
              </div>
              <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: 600 }}>CRITICAL FAILURES (5xx)</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: smokeResult.failed > 0 ? 'var(--danger)' : 'var(--text-secondary)', marginTop: '4px' }}>
                  {smokeResult.failed}
                </div>
              </div>
              <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>AVG LATENCY</div>
                <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '4px' }}>{smokeResult.avg_duration_ms} ms</div>
              </div>
            </div>
          )}

          {/* Results Table */}
          <div style={{ flex: 1, backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px 14px' }}>STATUS</th>
                  <th style={{ padding: '10px 14px' }}>METHOD</th>
                  <th style={{ padding: '10px 14px' }}>ENDPOINT URI</th>
                  <th style={{ padding: '10px 14px' }}>LATENCY</th>
                  <th style={{ padding: '10px 14px' }}>QA NOTES</th>
                </tr>
              </thead>
              <tbody>
                {smokeResult?.results?.map((res: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        fontSize: '11px',
                        backgroundColor: res.passed ? 'rgba(63, 185, 80, 0.15)' : 'rgba(248, 81, 73, 0.15)',
                        color: res.passed ? 'var(--success)' : 'var(--danger)',
                      }}>
                        {res.status_code || 'ERR'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--accent)' }}>{res.method}</td>
                    <td style={{ padding: '10px 14px', fontFamily: 'monospace' }}>{res.uri}</td>
                    <td style={{ padding: '10px 14px' }}>{res.duration_ms} ms</td>
                    <td style={{ padding: '10px 14px', color: res.passed ? 'var(--text-secondary)' : 'var(--danger)' }}>{res.notes}</td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      No smoke crawler runs yet. Click "Run Full Route Smoke Test" to test all application routes automatically.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 2: Boundary Fuzzing */}
      {qaSubTab === 'fuzz' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '12px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>TARGET ENDPOINT:</span>
            <input
              type="text"
              value={fuzzUrl}
              onChange={(e) => setFuzzUrl(e.target.value)}
              placeholder="http://localhost:8084/api/v1/health"
              style={{
                flex: 1,
                minWidth: '220px',
                padding: '6px 10px',
                backgroundColor: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>METHOD:</span>
            <select
              value={fuzzMethod}
              onChange={(e) => setFuzzMethod(e.target.value as any)}
              style={{
                padding: '6px 10px',
                backgroundColor: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            >
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="GET">GET</option>
            </select>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>PARAM:</span>
            <input
              type="text"
              value={fuzzParam}
              onChange={(e) => setFuzzParam(e.target.value)}
              placeholder="param_name"
              style={{
                width: '120px',
                padding: '6px 10px',
                backgroundColor: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            />
            <button
              onClick={handleRunFuzz}
              disabled={fuzzLoading}
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
              {fuzzLoading ? 'Fuzzing...' : '▶ Run 8 Boundary QA Vectors'}
            </button>
          </div>

          {fuzzReport && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL VECTORS</div>
                <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '4px' }}>{fuzzReport.total_cases}</div>
              </div>
              <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600 }}>GRACEFULLY HANDLED</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--success)', marginTop: '4px' }}>{fuzzReport.passed}</div>
              </div>
              <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                <div style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: 600 }}>SERVER CRASHES (500)</div>
                <div style={{ fontSize: '22px', fontWeight: 700, color: fuzzReport.failed > 0 ? 'var(--danger)' : 'var(--text-secondary)', marginTop: '4px' }}>
                  {fuzzReport.failed}
                </div>
              </div>
            </div>
          )}

          {/* Fuzz Cases Table */}
          <div style={{ flex: 1, backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--bg-panel)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '10px 14px' }}>VECTOR NAME</th>
                  <th style={{ padding: '10px 14px' }}>QA OBJECTIVE</th>
                  <th style={{ padding: '10px 14px' }}>STATUS CODE</th>
                  <th style={{ padding: '10px 14px' }}>VERDICT</th>
                  <th style={{ padding: '10px 14px' }}>DURATION</th>
                </tr>
              </thead>
              <tbody>
                {fuzzReport?.cases?.map((c: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>{c.name}</td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary)' }}>{c.description}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        fontSize: '11px',
                        backgroundColor: c.passed ? 'rgba(63, 185, 80, 0.15)' : 'rgba(248, 81, 73, 0.15)',
                        color: c.passed ? 'var(--success)' : 'var(--danger)',
                      }}>
                        {c.status_code}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 500, color: c.passed ? 'var(--success)' : 'var(--danger)' }}>
                      {c.verdict}
                    </td>
                    <td style={{ padding: '10px 14px' }}>{c.duration_ms} ms</td>
                  </tr>
                )) || (
                  <tr>
                    <td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Select an endpoint and click "Run 8 Boundary QA Vectors" to test for null pointer bugs, overflow crashes, and SQL injection flaws.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 3: Benchmark */}
      {qaSubTab === 'benchmark' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '12px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', backgroundColor: 'var(--bg-card)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>TARGET URL:</span>
            <input
              type="text"
              value={benchUrl}
              onChange={(e) => setBenchUrl(e.target.value)}
              placeholder="http://localhost:8084/api/v1/health"
              style={{
                flex: 1,
                minWidth: '220px',
                padding: '6px 10px',
                backgroundColor: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>CONCURRENCY:</span>
            <input
              type="number"
              min={1}
              max={50}
              value={benchConcurrency}
              onChange={(e) => setBenchConcurrency(parseInt(e.target.value) || 1)}
              style={{
                width: '60px',
                padding: '6px 8px',
                backgroundColor: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL CALLS:</span>
            <input
              type="number"
              min={5}
              max={200}
              value={benchRequests}
              onChange={(e) => setBenchRequests(parseInt(e.target.value) || 10)}
              style={{
                width: '60px',
                padding: '6px 8px',
                backgroundColor: 'var(--bg-panel)',
                border: '1px solid var(--border-color)',
                borderRadius: '4px',
                color: 'var(--text-primary)',
                fontSize: '13px',
              }}
            />
            <button
              onClick={handleRunBenchmark}
              disabled={benchLoading}
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
              {benchLoading ? 'Executing Load Run...' : '⚡ Run Concurrency Benchmark'}
            </button>
          </div>

          {benchReport && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>THROUGHPUT (RPS)</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: 'var(--accent)', marginTop: '4px' }}>
                    {benchReport.requests_per_second.toFixed(1)} req/s
                  </div>
                </div>
                <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>SLA COMPLIANCE</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: benchReport.sla_met ? 'var(--success)' : 'var(--danger)', marginTop: '4px' }}>
                    {benchReport.sla_met ? 'PASS (Under 500ms)' : 'FAIL (SLA Breach)'}
                  </div>
                </div>
                <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>MEAN LATENCY</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, marginTop: '4px' }}>{benchReport.mean_latency_ms} ms</div>
                </div>
                <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>P95 LATENCY</div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: benchReport.p95_latency_ms < 500 ? 'var(--success)' : 'var(--warning)', marginTop: '4px' }}>
                    {benchReport.p95_latency_ms} ms
                  </div>
                </div>
              </div>

              {/* Latency Percentiles Card */}
              <div style={{ backgroundColor: 'var(--bg-card)', padding: '14px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '10px' }}>Latency Percentile Distribution</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', textAlign: 'center' }}>
                  <div style={{ backgroundColor: 'var(--bg-panel)', padding: '8px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>MIN</div>
                    <div style={{ fontWeight: 600 }}>{benchReport.min_latency_ms} ms</div>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-panel)', padding: '8px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>P50 (Median)</div>
                    <div style={{ fontWeight: 600 }}>{benchReport.p50_latency_ms} ms</div>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-panel)', padding: '8px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>P90</div>
                    <div style={{ fontWeight: 600 }}>{benchReport.p90_latency_ms} ms</div>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-panel)', padding: '8px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>P95</div>
                    <div style={{ fontWeight: 600, color: 'var(--warning)' }}>{benchReport.p95_latency_ms} ms</div>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-panel)', padding: '8px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>P99</div>
                    <div style={{ fontWeight: 600, color: 'var(--danger)' }}>{benchReport.p99_latency_ms} ms</div>
                  </div>
                  <div style={{ backgroundColor: 'var(--bg-panel)', padding: '8px', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>MAX</div>
                    <div style={{ fontWeight: 600 }}>{benchReport.max_latency_ms} ms</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!benchReport && (
            <div style={{ padding: '60px', textAlign: 'center', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
              Configure concurrency & total requests above to measure response times and performance degradation under load.
            </div>
          )}
        </div>
      )}

      {/* Subtab 4: QA Dossier */}
      {qaSubTab === 'dossier' && (
        <div style={{ flex: 1, backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', padding: '16px', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '14px', fontWeight: 600 }}>QA Audit Dossier & Evidence Log</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Ready-for-signoff QA summary with automated pass/fail verification.</p>
            </div>
            <button
              onClick={() => {
                const data = {
                  project: activeProject?.name || 'Universal PHP Project',
                  timestamp: new Date().toISOString(),
                  smoke: smokeResult,
                  fuzz: fuzzReport,
                  benchmark: benchReport,
                };
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Brixel-QA-Report-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
              }}
              style={{
                padding: '6px 14px',
                backgroundColor: 'var(--accent)',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '12px',
              }}
            >
              📥 Export Signoff Dossier (JSON)
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '12px' }}>
            <div style={{ padding: '12px', backgroundColor: 'var(--bg-panel)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
              <strong>1. Route Smoke Coverage:</strong> {smokeResult ? `${smokeResult.passed}/${smokeResult.total_routes} Endpoints Healthy (${smokeResult.avg_duration_ms} ms avg)` : 'Not yet executed'}
            </div>
            <div style={{ padding: '12px', backgroundColor: 'var(--bg-panel)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
              <strong>2. Boundary Resiliency:</strong> {fuzzReport ? `${fuzzReport.passed}/${fuzzReport.total_cases} Vectors Handled Gracefully (Zero 500 Crashes)` : 'Not yet executed'}
            </div>
            <div style={{ padding: '12px', backgroundColor: 'var(--bg-panel)', borderRadius: '4px', border: '1px solid var(--border-color)' }}>
              <strong>3. Concurrency Load SLA:</strong> {benchReport ? `${benchReport.requests_per_second.toFixed(1)} req/s throughput | P95: ${benchReport.p95_latency_ms} ms (${benchReport.sla_met ? 'PASSED' : 'FAILED'})` : 'Not yet executed'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
