import React, { useState, useEffect } from 'react';
import { api } from './api/client';

export function App() {
  const [activeTab, setActiveTab] = useState<'api' | 'traces' | 'sql' | 'xdebug' | 'webhooks' | 'projects'>('api');
  const [health, setHealth] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [phpRuntimes, setPhpRuntimes] = useState<Array<{ version: string; binary_path: string; is_default: boolean }>>([]);

  // API Studio state
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [url, setUrl] = useState<string>('http://127.0.0.1:8000/api/users');
  const [reqBody, setReqBody] = useState<string>('{\n  "name": "Jane Doe"\n}');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Traces state
  const [traces, setTraces] = useState<any[]>([]);

  // Project form state
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newProjectPath, setNewProjectPath] = useState<string>('');
  const [newProjectFramework, setNewProjectFramework] = useState<string>('Laravel');
  const [newProjectPhp, setNewProjectPhp] = useState<string>('8.3');

  // Load health, projects, and PHP runtimes on start
  useEffect(() => {
    api.getHealth()
      .then(setHealth)
      .catch(() => setHealth({ status: 'offline' }));

    loadProjects();

    api.getPhpRuntimes()
      .then((data) => {
        setPhpRuntimes(data);
        const defaultVer = data.find((r) => r.is_default)?.version || '8.3';
        setNewProjectPhp(defaultVer);
      })
      .catch(() => {
        setPhpRuntimes([
          { version: '8.4', binary_path: 'php8.4', is_default: false },
          { version: '8.3', binary_path: 'php8.3', is_default: true },
          { version: '8.2', binary_path: 'php8.2', is_default: false },
          { version: '8.1', binary_path: 'php8.1', is_default: false },
          { version: '8.0', binary_path: 'php8.0', is_default: false },
          { version: '7.4', binary_path: 'php7.4', is_default: false },
        ]);
      });
  }, []);

  const loadProjects = () => {
    api.getProjects()
      .then((data) => {
        setProjects(data);
        if (data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data[0].id);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (activeTab === 'traces' || activeTab === 'sql') {
      api.getTraces(selectedProjectId)
        .then(setTraces)
        .catch(() => {});
    }
  }, [activeTab, selectedProjectId]);

  const activeProject = projects.find((p) => p.id === selectedProjectId);

  const handleUpdateProjectPhp = async (projectId: string, version: string) => {
    try {
      await api.updateProjectPhp(projectId, version);
      loadProjects();
    } catch (err: any) {
      alert(`Error updating PHP version: ${err.message}`);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName || !newProjectPath) return;

    try {
      const created = await api.createProject({
        name: newProjectName,
        root_path: newProjectPath,
        framework: newProjectFramework,
        php_version: newProjectPhp,
        connection_mode: 'local',
      });
      setNewProjectName('');
      setNewProjectPath('');
      loadProjects();
      setSelectedProjectId(created.id);
    } catch (err: any) {
      alert(`Failed to create project: ${err.message}`);
    }
  };

  const handleSendRequest = async () => {
    setLoading(true);
    setResponse(null);
    try {
      const res = await api.executeRequest({
        project_id: selectedProjectId || 'default',
        method,
        url,
        headers: { 'Content-Type': 'application/json' },
        body: method !== 'GET' ? reqBody : '',
        timeout_ms: 30000,
      });
      setResponse(res);
    } catch (err: any) {
      setResponse({ error: err.message, status_code: 0 });
    } finally {
      setLoading(false);
    }
  };

  const standardPhpOptions = ['8.4', '8.3', '8.2', '8.1', '8.0', '7.4'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Top Header */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 20px',
        backgroundColor: 'var(--bg-panel)',
        borderBottom: '1px solid var(--border-color)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            fontWeight: 'bold',
            fontSize: '16px',
            color: 'var(--accent)',
            letterSpacing: '0.5px'
          }}>
            ⚡ PHP DEBUG STUDIO
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>by zoventra</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Project Selector */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              fontSize: '13px'
            }}
          >
            <option value="">(All Projects)</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.framework || 'PHP'})</option>
            ))}
          </select>

          {/* User Selectable PHP Version Dropdown for Active Project */}
          {activeProject && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>PHP:</span>
              <select
                value={activeProject.php_version || '8.3'}
                onChange={(e) => handleUpdateProjectPhp(activeProject.id, e.target.value)}
                style={{
                  padding: '4px 8px',
                  backgroundColor: 'rgba(88, 166, 255, 0.15)',
                  color: 'var(--accent)',
                  border: '1px solid var(--accent)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {standardPhpOptions.map((ver) => (
                  <option key={ver} value={ver} style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)' }}>
                    PHP {ver} {ver === '7.4' || ver === '8.0' ? '(Legacy)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Status Badge */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '12px',
            padding: '4px 10px',
            borderRadius: '12px',
            backgroundColor: health?.status === 'healthy' ? 'rgba(63, 185, 80, 0.15)' : 'rgba(248, 81, 73, 0.15)',
            color: health?.status === 'healthy' ? 'var(--success)' : 'var(--danger)',
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: health?.status === 'healthy' ? 'var(--success)' : 'var(--danger)'
            }} />
            {health?.status === 'healthy' ? `Daemon v${health.version}` : 'Daemon Offline'}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Navigation Sidebar */}
        <aside style={{
          width: '220px',
          backgroundColor: 'var(--bg-panel)',
          borderRight: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          padding: '12px 8px',
          gap: '4px'
        }}>
          {[
            { id: 'api', label: '⚡ API Studio' },
            { id: 'traces', label: '🌊 Traces & Waterfall' },
            { id: 'sql', label: '🗄️ SQL Studio' },
            { id: 'xdebug', label: '🐞 PHP Debugger' },
            { id: 'webhooks', label: '🪝 Webhook Studio' },
            { id: 'projects', label: '📁 Projects & PHP Runtimes' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 14px',
                borderRadius: '6px',
                border: 'none',
                background: activeTab === tab.id ? 'var(--bg-card)' : 'transparent',
                color: activeTab === tab.id ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '13px',
                fontWeight: activeTab === tab.id ? 600 : 400,
              }}
            >
              {tab.label}
            </button>
          ))}
        </aside>

        {/* Content Area */}
        <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '16px' }}>
          {activeTab === 'api' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
              {/* Request Bar */}
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={method}
                  onChange={(e) => setMethod(e.target.value as any)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontWeight: 'bold'
                  }}
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                  <option value="PUT">PUT</option>
                  <option value="DELETE">DELETE</option>
                </select>

                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://localhost:8000/api/endpoint"
                  style={{
                    flex: 1,
                    padding: '8px 12px',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '13px'
                  }}
                />

                <button
                  onClick={handleSendRequest}
                  disabled={loading}
                  style={{
                    padding: '8px 24px',
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {loading ? 'Sending...' : 'Send'}
                </button>
              </div>

              {/* Request / Response Split */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, gap: '16px', overflow: 'hidden' }}>
                {/* Request Editor */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden'
                }}>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    REQUEST BODY (JSON)
                  </div>
                  <textarea
                    value={reqBody}
                    onChange={(e) => setReqBody(e.target.value)}
                    style={{
                      flex: 1,
                      backgroundColor: 'transparent',
                      color: 'var(--text-primary)',
                      border: 'none',
                      padding: '12px',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      resize: 'none',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Response Inspector */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--border-color)',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: 'var(--text-secondary)'
                  }}>
                    <span>RESPONSE</span>
                    {response && (
                      <span style={{ color: response.status_code >= 200 && response.status_code < 300 ? 'var(--success)' : 'var(--danger)' }}>
                        Status: {response.status_code} ({response.duration_ms} ms)
                      </span>
                    )}
                  </div>
                  <pre style={{
                    flex: 1,
                    padding: '12px',
                    overflow: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '12px',
                    color: response?.error ? 'var(--danger)' : 'var(--text-primary)'
                  }}>
                    {response ? (response.body || response.error || 'No body returned') : '// Hit Send to execute request'}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'traces' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Application Traces & Observability</h2>
              <div style={{
                flex: 1,
                backgroundColor: 'var(--bg-card)',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                overflow: 'auto'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                      <th style={{ padding: '8px 12px' }}>Trace ID</th>
                      <th style={{ padding: '8px 12px' }}>Route / Endpoint</th>
                      <th style={{ padding: '8px 12px' }}>Service</th>
                      <th style={{ padding: '8px 12px' }}>Status</th>
                      <th style={{ padding: '8px 12px' }}>Duration</th>
                      <th style={{ padding: '8px 12px' }}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {traces.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          No traces recorded yet. Send an API request or invoke your instrumented Laravel application.
                        </td>
                      </tr>
                    ) : (
                      traces.map((t) => (
                        <tr key={t.id} style={{ borderBottom: '1px solid var(--border-color)', cursor: 'pointer' }}>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--accent)' }}>{t.trace_id.substring(0, 8)}...</td>
                          <td style={{ padding: '8px 12px' }}>{t.route || '/'}</td>
                          <td style={{ padding: '8px 12px' }}>{t.service_name}</td>
                          <td style={{ padding: '8px 12px', color: t.status >= 400 ? 'var(--danger)' : 'var(--success)' }}>{t.status}</td>
                          <td style={{ padding: '8px 12px' }}>{Math.round(t.duration_us / 1000)} ms</td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{new Date(t.started_at).toLocaleTimeString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'sql' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600 }}>SQL Studio & N+1 Query Diagnostics</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Monitors SQL executions in real-time, redacting bindings and identifying potential N+1 loops and missing indexes.
              </p>
              <div style={{
                flex: 1,
                backgroundColor: 'var(--bg-card)',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                padding: '24px',
                textAlign: 'center',
                color: 'var(--text-secondary)'
              }}>
                Awaiting SQL executions from active Laravel DB::listen stream...
              </div>
            </div>
          )}

          {activeTab === 'xdebug' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600 }}>PHP DBGp Breakpoint Debugger</h2>
              <div style={{
                padding: '12px 16px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                fontSize: '13px'
              }}>
                <div><strong>DBGp Bridge:</strong> Listening on <code>127.0.0.1:9003</code></div>
                <div style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Configure your <code>php.ini</code> with <code>xdebug.mode=debug</code> and <code>xdebug.client_port=9003</code>.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'webhooks' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Webhook Studio (Module 22)</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Local loopback receiver for inspecting, verifying signatures (HMAC SHA-256), and replaying webhooks.
              </p>
              <div style={{
                padding: '12px 16px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                fontSize: '13px'
              }}>
                <div><strong>Incoming Endpoint:</strong> <code>http://127.0.0.1:8765/wh/test-receiver</code></div>
              </div>
            </div>
          )}

          {activeTab === 'projects' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Multi-Project Workspaces & PHP Versions</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Each project can run on its own independently selected PHP version (7.4 through 8.4).
                  </p>
                </div>
              </div>

              {/* Add Project Card */}
              <form onSubmit={handleCreateProject} style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                padding: '16px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 120px 140px 100px',
                gap: '12px',
                alignItems: 'end'
              }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    PROJECT NAME
                  </label>
                  <input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. Care Vision"
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: 'var(--bg-panel)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    ROOT PATH
                  </label>
                  <input
                    type="text"
                    value={newProjectPath}
                    onChange={(e) => setNewProjectPath(e.target.value)}
                    placeholder="/Users/pl/Documents/sites/app"
                    required
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: 'var(--bg-panel)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    FRAMEWORK
                  </label>
                  <select
                    value={newProjectFramework}
                    onChange={(e) => setNewProjectFramework(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: 'var(--bg-panel)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '13px'
                    }}
                  >
                    <option value="Laravel">Laravel</option>
                    <option value="Symfony">Symfony</option>
                    <option value="Plain PHP">Plain PHP</option>
                    <option value="WordPress">WordPress</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    PHP VERSION
                  </label>
                  <select
                    value={newProjectPhp}
                    onChange={(e) => setNewProjectPhp(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      backgroundColor: 'var(--bg-panel)',
                      color: 'var(--accent)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600
                    }}
                  >
                    {standardPhpOptions.map((ver) => (
                      <option key={ver} value={ver}>PHP {ver}</option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    height: '35px'
                  }}
                >
                  + Add
                </button>
              </form>

              {/* Projects List with PHP Version Selectors */}
              <div style={{
                backgroundColor: 'var(--bg-card)',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                overflow: 'hidden'
              }}>
                {projects.length === 0 ? (
                  <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No projects registered yet. Use the form above to add your first project.
                  </div>
                ) : (
                  projects.map((p) => (
                    <div key={p.id} style={{
                      padding: '14px 16px',
                      borderBottom: '1px solid var(--border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{p.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>{p.root_path}</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{p.framework || 'PHP'}</span>

                        {/* Interactive PHP Version Selector for each project */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>PHP Version:</span>
                          <select
                            value={p.php_version || '8.3'}
                            onChange={(e) => handleUpdateProjectPhp(p.id, e.target.value)}
                            style={{
                              padding: '4px 8px',
                              backgroundColor: 'var(--bg-panel)',
                              color: 'var(--accent)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            {standardPhpOptions.map((ver) => (
                              <option key={ver} value={ver}>PHP {ver}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
