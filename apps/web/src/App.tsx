import React, { useState, useEffect } from 'react';
import { api } from './api/client';

export function App() {
  const [activeTab, setActiveTab] = useState<'api' | 'traces' | 'sql' | 'logs' | 'tests' | 'artisan' | 'queues' | 'security' | 'xdebug' | 'webhooks' | 'streams' | 'projects'>('api');
  const [health, setHealth] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [phpRuntimes, setPhpRuntimes] = useState<Array<{ version: string; binary_path: string; is_default: boolean }>>([]);

  // API Studio state
  const [apiMode, setApiMode] = useState<'rest' | 'graphql'>('rest');
  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [url, setUrl] = useState<string>('http://127.0.0.1:8000/api/users');
  const [reqBody, setReqBody] = useState<string>('{\n  "name": "Jane Doe"\n}');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);

  // Security Diagnostics state (Module 19)
  const [securityReport, setSecurityReport] = useState<any>(null);
  const [securityLoading, setSecurityLoading] = useState<boolean>(false);

  // Cookie Jar state
  const [cookies, setCookies] = useState<any[]>([]);
  const [showCookieJar, setShowCookieJar] = useState<boolean>(false);
  const [newCookieDomain, setNewCookieDomain] = useState<string>('127.0.0.1');
  const [newCookieName, setNewCookieName] = useState<string>('');
  const [newCookieValue, setNewCookieValue] = useState<string>('');

  // Importer modal state
  const [showImportModal, setShowImportModal] = useState<boolean>(false);
  const [importInput, setImportInput] = useState<string>('');

  // GraphQL state
  const [gqlEndpoint, setGqlEndpoint] = useState<string>('http://127.0.0.1:8000/graphql');
  const [gqlQuery, setGqlQuery] = useState<string>('query GetUsers {\n  users {\n    id\n    name\n    email\n  }\n}');
  const [gqlVariables, setGqlVariables] = useState<string>('{}');
  const [gqlResponse, setGqlResponse] = useState<any>(null);
  const [gqlLoading, setGqlLoading] = useState<boolean>(false);

  // Traces, SQL & Logs state
  const [traces, setTraces] = useState<any[]>([]);
  const [sqlAnalytics, setSqlAnalytics] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);

  // Test Studio & Artisan state
  const [testOutput, setTestOutput] = useState<any>(null);
  const [testLoading, setTestLoading] = useState<boolean>(false);
  const [artisanCmd, setArtisanCmd] = useState<string>('about');
  const [artisanOutput, setArtisanOutput] = useState<any>(null);
  const [artisanLoading, setArtisanLoading] = useState<boolean>(false);

  // Queue Studio state
  const [queueJobs, setQueueJobs] = useState<any[]>([]);
  const [queueStatusFilter, setQueueStatusFilter] = useState<string>('all');
  const [queueLoading, setQueueLoading] = useState<boolean>(false);

  // Theme & Accessibility (WCAG 2.1 AA)
  const [theme, setTheme] = useState<'dark' | 'light' | 'high-contrast'>('dark');

  // Local AI Advisor state (Module 26)
  const [showAIAdvisor, setShowAIAdvisor] = useState<boolean>(false);
  const [aiPrompt, setAiPrompt] = useState<string>('How do I optimize an Eloquent query that triggers N+1 problems?');
  const [aiResponse, setAiResponse] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);

  // DBGp Debugger state
  const [debugSessions, setDebugSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [breakpoints, setBreakpoints] = useState<any[]>([]);
  const [newBpFile, setNewBpFile] = useState<string>('/var/www/html/app/Http/Controllers/UserController.php');
  const [newBpLine, setNewBpLine] = useState<number>(25);
  const [debugEvalExpr, setDebugEvalExpr] = useState<string>('$_SERVER');
  const [evalResult, setEvalResult] = useState<string>('');
  const [debugActionLoading, setDebugActionLoading] = useState<boolean>(false);

  // Live Streams state
  const [streamEvents, setStreamEvents] = useState<any[]>([]);
  const [streamConnected, setStreamConnected] = useState<boolean>(false);
  const [streamFilter, setStreamFilter] = useState<string>('all');

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
    if (activeTab === 'traces') {
      api.getTraces(selectedProjectId)
        .then(setTraces)
        .catch(() => {});
    } else if (activeTab === 'sql') {
      api.getSQLAnalytics(selectedProjectId)
        .then((data) => setSqlAnalytics(data || []))
        .catch(() => setSqlAnalytics([]));
    } else if (activeTab === 'logs') {
      api.getLogs(selectedProjectId)
        .then((data) => setLogs(data || []))
        .catch(() => setLogs([]));
    } else if (activeTab === 'queues') {
      loadQueueJobs();
    } else if (activeTab === 'security') {
      if (activeProject && !securityReport) {
        handleRunSecurityAudit();
      }
    } else if (activeTab === 'api') {
      loadCookies();
    } else if (activeTab === 'xdebug') {
      loadDebugSessions();
      loadBreakpoints();
    } else if (activeTab === 'streams') {
      const ws = new WebSocket('ws://127.0.0.1:8765/v1/events/stream');
      ws.onopen = () => setStreamConnected(true);
      ws.onclose = () => setStreamConnected(false);
      ws.onerror = () => setStreamConnected(false);
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);
          setStreamEvents((prev) => [data, ...prev].slice(0, 200));
        } catch {
          setStreamEvents((prev) => [{ topic: 'raw', payload: e.data, timestamp: new Date().toISOString() }, ...prev].slice(0, 200));
        }
      };
      return () => {
        ws.close();
      };
    }
  }, [activeTab, selectedProjectId]);

  const loadDebugSessions = () => {
    api.getDebugSessions()
      .then((data) => {
        setDebugSessions(data || []);
        if (data && data.length > 0 && !selectedSessionId) {
          setSelectedSessionId(data[0].id);
        }
      })
      .catch(() => setDebugSessions([]));
  };

  const loadBreakpoints = () => {
    api.getBreakpoints(selectedProjectId)
      .then((data) => setBreakpoints(data || []))
      .catch(() => setBreakpoints([]));
  };

  const handleAddBreakpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBpFile || !newBpLine) return;
    try {
      await api.createBreakpoint({
        project_id: selectedProjectId || 'default',
        file_uri: newBpFile,
        line_number: Number(newBpLine),
        type: 'line',
        enabled: true,
      });
      loadBreakpoints();
    } catch (err: any) {
      alert(`Failed to add breakpoint: ${err.message}`);
    }
  };

  const handleDeleteBreakpoint = async (id: string) => {
    try {
      await api.deleteBreakpoint(id);
      loadBreakpoints();
    } catch (err: any) {
      alert(`Failed to delete breakpoint: ${err.message}`);
    }
  };

  const handleDebugAction = async (action: 'step_into' | 'step_over' | 'step_out' | 'continue' | 'stop') => {
    if (!selectedSessionId) return;
    setDebugActionLoading(true);
    try {
      if (action === 'step_into') await api.stepInto(selectedSessionId);
      else if (action === 'step_over') await api.stepOver(selectedSessionId);
      else if (action === 'step_out') await api.stepOut(selectedSessionId);
      else if (action === 'continue') await api.continueDebug(selectedSessionId);
      else if (action === 'stop') await api.stopDebug(selectedSessionId);
      setTimeout(loadDebugSessions, 300);
    } catch (err: any) {
      alert(`Debug action error: ${err.message}`);
    } finally {
      setDebugActionLoading(false);
    }
  };

  const handleDebugEval = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSessionId || !debugEvalExpr) return;
    setDebugActionLoading(true);
    try {
      const res = await api.evalDebug(selectedSessionId, debugEvalExpr);
      setEvalResult(res.result || '(executed)');
    } catch (err: any) {
      setEvalResult(`Error: ${err.message}`);
    } finally {
      setDebugActionLoading(false);
    }
  };

  const handleExecuteGraphQL = async () => {
    setGqlLoading(true);
    setGqlResponse(null);
    try {
      let vars = {};
      try {
        vars = JSON.parse(gqlVariables || '{}');
      } catch (err: any) {
        alert('Variables must be valid JSON: ' + err.message);
        setGqlLoading(false);
        return;
      }

      const res = await api.executeGraphQL({
        endpoint: gqlEndpoint,
        query: gqlQuery,
        variables: vars,
      });
      setGqlResponse(res);
    } catch (err: any) {
      setGqlResponse({ error: err.message });
    } finally {
      setGqlLoading(false);
    }
  };

  const loadCookies = () => {
    api.getCookies(selectedProjectId)
      .then((data) => setCookies(data || []))
      .catch(() => setCookies([]));
  };

  const handleSaveCookie = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCookieName) return;
    try {
      await api.saveCookie({
        project_id: selectedProjectId || 'default',
        domain: newCookieDomain || '127.0.0.1',
        name: newCookieName,
        value: newCookieValue,
        path: '/',
      });
      setNewCookieName('');
      setNewCookieValue('');
      loadCookies();
    } catch (err: any) {
      alert(`Failed to save cookie: ${err.message}`);
    }
  };

  const handleDeleteCookie = async (id: string) => {
    try {
      await api.deleteCookie(id);
      loadCookies();
    } catch (err: any) {
      alert(`Failed to delete cookie: ${err.message}`);
    }
  };

  const handleClearCookies = async () => {
    if (!confirm('Clear all cookies for this project?')) return;
    try {
      await api.clearCookies(selectedProjectId || 'default');
      loadCookies();
    } catch (err: any) {
      alert(`Failed to clear cookies: ${err.message}`);
    }
  };

  const handleImportRequest = () => {
    if (!importInput.trim()) return;
    const trimmed = importInput.trim();

    // Check if JSON (Postman or OpenAPI)
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.item && Array.isArray(parsed.item)) {
          // Postman v2.1
          const firstReq = parsed.item[0]?.request;
          if (firstReq) {
            setMethod(firstReq.method || 'GET');
            setUrl(typeof firstReq.url === 'string' ? firstReq.url : (firstReq.url?.raw || url));
            if (firstReq.body?.raw) setReqBody(firstReq.body.raw);
          }
        } else if (parsed.paths) {
          // OpenAPI 3.x
          const firstPath = Object.keys(parsed.paths)[0];
          if (firstPath) {
            const pathItem = parsed.paths[firstPath];
            const firstMethod = Object.keys(pathItem)[0]?.toUpperCase() || 'GET';
            setMethod(firstMethod as any);
            setUrl(`http://127.0.0.1:8000${firstPath}`);
          }
        }
        setShowImportModal(false);
        setImportInput('');
        return;
      } catch {}
    }

    // Check if cURL command
    if (trimmed.toLowerCase().startsWith('curl')) {
      let m = 'GET';
      let targetUrl = '';
      let data = '';

      const methodMatch = trimmed.match(/-X\s+([A-Z]+)/i);
      if (methodMatch) m = methodMatch[1].toUpperCase();

      const urlMatch = trimmed.match(/(?:curl\s+)?['"]?(https?:\/\/[^\s'"]+)/i);
      if (urlMatch) targetUrl = urlMatch[1];

      const dataMatch = trimmed.match(/(?:-d|--data|--data-raw)\s+['"]([^'"]+)['"]/);
      if (dataMatch) {
        data = dataMatch[1];
        if (!methodMatch) m = 'POST';
      }

      if (targetUrl) setUrl(targetUrl);
      setMethod(m as any);
      if (data) setReqBody(data);

      setShowImportModal(false);
      setImportInput('');
    }
  };

  const handleCopyAsCurl = () => {
    let cmd = `curl -X ${method} "${url}" -H "Content-Type: application/json"`;
    if (method !== 'GET' && reqBody) {
      cmd += ` -d '${reqBody.replace(/'/g, "'\\''")}'`;
    }
    navigator.clipboard.writeText(cmd);
    alert('Copied cURL command to clipboard!');
  };

  const loadQueueJobs = () => {
    setQueueLoading(true);
    api.getQueueJobs(selectedProjectId, queueStatusFilter)
      .then((data) => setQueueJobs(data || []))
      .catch(() => setQueueJobs([]))
      .finally(() => setQueueLoading(false));
  };

  const handleReplayJob = async (id: string) => {
    try {
      await api.replayQueueJob(id);
      loadQueueJobs();
    } catch (err: any) {
      alert(`Failed to replay queue job: ${err.message}`);
    }
  };

  const handleRunAIAdvisor = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiResponse('');
    try {
      const res = await api.diagnoseAI({
        content: aiPrompt,
        model: 'llama3.2:3b',
      });
      setAiResponse(res.response || '(No response generated)');
    } catch (err: any) {
      setAiResponse(`Error: ${err.message}`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleRunSecurityAudit = async () => {
    if (!activeProject) {
      alert('Please select or create a project first.');
      return;
    }
    setSecurityLoading(true);
    try {
      const res = await api.runSecurityAudit(activeProject.root_path);
      setSecurityReport(res);
    } catch (err: any) {
      alert(`Security audit error: ${err.message}`);
    } finally {
      setSecurityLoading(false);
    }
  };

  // Keyboard Shortcuts & WCAG 2.1 AA Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape closes modals
      if (e.key === 'Escape') {
        setShowImportModal(false);
        setShowCookieJar(false);
        setShowAIAdvisor(false);
      }

      // Cmd+Enter or Ctrl+Enter executes primary action
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        if (activeTab === 'api') {
          if (apiMode === 'rest') handleSendRequest();
          else handleExecuteGraphQL();
        } else if (activeTab === 'tests') {
          handleRunTests();
        } else if (activeTab === 'artisan') {
          handleRunArtisan();
        }
      }

      // Cmd+1..9 or Ctrl+1..9 switches tabs
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '9') {
        const tabs: Array<typeof activeTab> = ['api', 'traces', 'sql', 'logs', 'tests', 'artisan', 'queues', 'xdebug', 'webhooks'];
        const idx = parseInt(e.key, 10) - 1;
        if (tabs[idx]) {
          e.preventDefault();
          setActiveTab(tabs[idx]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeTab, apiMode, url, method, reqBody, gqlQuery, gqlVariables, selectedProjectId]);

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

  const handleRunTests = async () => {
    if (!activeProject) {
      alert('Please select or create a project first.');
      return;
    }
    setTestLoading(true);
    setTestOutput(null);
    try {
      const res = await api.runTests({
        project_path: activeProject.root_path,
        php_binary_path: activeProject.php_binary_path || undefined,
        runner: 'phpunit',
      });
      setTestOutput(res);
    } catch (err: any) {
      setTestOutput({ output: err.message, passed: false, exit_code: 1 });
    } finally {
      setTestLoading(false);
    }
  };

  const handleRunArtisan = async () => {
    if (!activeProject) {
      alert('Please select or create a project first.');
      return;
    }
    setArtisanLoading(true);
    setArtisanOutput(null);
    try {
      const res = await api.runArtisan({
        project_path: activeProject.root_path,
        command: artisanCmd,
        php_binary_path: activeProject.php_binary_path || undefined,
      });
      setArtisanOutput(res);
    } catch (err: any) {
      setArtisanOutput({ stderr: err.message, exit_code: 1 });
    } finally {
      setArtisanLoading(false);
    }
  };

  const standardPhpOptions = ['8.4', '8.3', '8.2', '8.1', '8.0', '7.4'];
  const safeArtisanList = ['about', 'route:list', 'config:show', 'optimize:clear', 'cache:clear', 'queue:failed', 'debug-studio:doctor'];

  const themeStyles: Record<string, React.CSSProperties> = {
    dark: {
      '--bg-page': '#0d1117',
      '--bg-panel': '#161b22',
      '--bg-card': '#21262d',
      '--border-color': '#30363d',
      '--text-primary': '#c9d1d9',
      '--text-secondary': '#8b949e',
      '--accent': '#58a6ff',
      '--danger': '#f85149',
      '--success': '#3fb950',
      '--warning': '#d29922',
    } as any,
    light: {
      '--bg-page': '#f6f8fa',
      '--bg-panel': '#ffffff',
      '--bg-card': '#ffffff',
      '--border-color': '#d0d7de',
      '--text-primary': '#24292f',
      '--text-secondary': '#57606a',
      '--accent': '#0969da',
      '--danger': '#cf222e',
      '--success': '#1a7f37',
      '--warning': '#9a6700',
    } as any,
    'high-contrast': {
      '--bg-page': '#000000',
      '--bg-panel': '#050505',
      '--bg-card': '#111111',
      '--border-color': '#ffffff',
      '--text-primary': '#ffffff',
      '--text-secondary': '#e6e6e6',
      '--accent': '#79c0ff',
      '--danger': '#ff7b72',
      '--success': '#56d364',
      '--warning': '#f3e151',
    } as any,
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      backgroundColor: 'var(--bg-page)',
      color: 'var(--text-primary)',
      ...(themeStyles[theme] || themeStyles.dark)
    }}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Local AI Advisor Trigger */}
          <button
            onClick={() => setShowAIAdvisor(true)}
            title="Open Local-First AI Performance Advisor (Ollama loopback)"
            style={{
              padding: '6px 12px',
              backgroundColor: 'rgba(88, 166, 255, 0.15)',
              color: 'var(--accent)',
              border: '1px solid var(--accent)',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>🤖</span>
            <span>Local AI</span>
          </button>

          {/* Theme Selector (WCAG 2.1 AA) */}
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as any)}
            title="Color theme mode"
            style={{
              padding: '6px 10px',
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            <option value="dark">🌙 Dark</option>
            <option value="light">☀️ Light</option>
            <option value="high-contrast">👁️ High Contrast</option>
          </select>
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
            { id: 'logs', label: '📜 Logs & Correlation' },
            { id: 'tests', label: '🧪 Test Studio' },
            { id: 'artisan', label: '⚡ Artisan Console' },
            { id: 'queues', label: '📬 Queue Studio' },
            { id: 'security', label: '🛡️ Security Audit' },
            { id: 'xdebug', label: '🐞 PHP Debugger' },
            { id: 'webhooks', label: '🪝 Webhook Studio' },
            { id: 'streams', label: '📡 Live Streams' },
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
              {/* REST / GraphQL Switcher */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <div style={{
                  display: 'flex',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  padding: '2px',
                }}>
                  <button
                    onClick={() => setApiMode('rest')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: apiMode === 'rest' ? 'var(--accent)' : 'transparent',
                      color: apiMode === 'rest' ? '#fff' : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    REST HTTP
                  </button>
                  <button
                    onClick={() => setApiMode('graphql')}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: apiMode === 'graphql' ? 'var(--accent)' : 'transparent',
                      color: apiMode === 'graphql' ? '#fff' : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    GraphQL
                  </button>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {apiMode === 'rest' ? 'Standard REST endpoint testing with W3C traceparent injection' : 'GraphQL query & mutation composer with variable bindings'}
                </span>
              </div>

              {apiMode === 'rest' ? (
                <>
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

                    <button
                      onClick={handleCopyAsCurl}
                      title="Copy request as executable cURL command"
                      style={{
                        padding: '8px 14px',
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      📋 cURL
                    </button>

                    <button
                      onClick={() => setShowImportModal(true)}
                      title="Import cURL command, Postman collection, or OpenAPI spec"
                      style={{
                        padding: '8px 14px',
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--accent)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      + Import
                    </button>

                    <button
                      onClick={() => setShowCookieJar(!showCookieJar)}
                      title="Inspect and manage local Cookie Jar"
                      style={{
                        padding: '8px 14px',
                        backgroundColor: showCookieJar ? 'rgba(88, 166, 255, 0.2)' : 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      🍪 Cookies ({cookies.length})
                    </button>
                  </div>

                  {/* Cookie Jar Slide-Down Drawer */}
                  {showCookieJar && (
                    <div style={{
                      backgroundColor: 'var(--bg-card)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontWeight: 600, fontSize: '13px' }}>🍪 Local Cookie Jar (Module 02)</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
                            Automatically captures Set-Cookie headers and injects matching cookies into outbound requests.
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={handleClearCookies}
                            disabled={cookies.length === 0}
                            style={{
                              padding: '4px 10px',
                              backgroundColor: 'transparent',
                              color: 'var(--danger)',
                              border: '1px solid rgba(248, 81, 73, 0.3)',
                              borderRadius: '4px',
                              fontSize: '11px',
                              cursor: 'pointer'
                            }}
                          >
                            Clear Jar
                          </button>
                        </div>
                      </div>

                      {/* Add Cookie Form */}
                      <form onSubmit={handleSaveCookie} style={{ display: 'grid', gridTemplateColumns: '140px 140px 1fr 90px', gap: '8px' }}>
                        <input
                          type="text"
                          value={newCookieDomain}
                          onChange={(e) => setNewCookieDomain(e.target.value)}
                          placeholder="Domain (127.0.0.1)"
                          required
                          style={{
                            padding: '6px 8px',
                            backgroundColor: 'var(--bg-panel)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        />
                        <input
                          type="text"
                          value={newCookieName}
                          onChange={(e) => setNewCookieName(e.target.value)}
                          placeholder="Name (e.g. XSRF-TOKEN)"
                          required
                          style={{
                            padding: '6px 8px',
                            backgroundColor: 'var(--bg-panel)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        />
                        <input
                          type="text"
                          value={newCookieValue}
                          onChange={(e) => setNewCookieValue(e.target.value)}
                          placeholder="Value"
                          required
                          style={{
                            padding: '6px 8px',
                            backgroundColor: 'var(--bg-panel)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '4px',
                            fontSize: '12px'
                          }}
                        />
                        <button
                          type="submit"
                          style={{
                            padding: '6px 12px',
                            backgroundColor: 'var(--accent)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          + Set
                        </button>
                      </form>

                      {/* Cookies Table */}
                      <div style={{ maxHeight: '150px', overflow: 'auto', border: '1px solid var(--border-color)', borderRadius: '4px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', textAlign: 'left' }}>
                          <thead style={{ backgroundColor: 'var(--bg-panel)', color: 'var(--text-secondary)' }}>
                            <tr>
                              <th style={{ padding: '6px 10px' }}>Domain</th>
                              <th style={{ padding: '6px 10px' }}>Name</th>
                              <th style={{ padding: '6px 10px' }}>Value</th>
                              <th style={{ padding: '6px 10px' }}>Path</th>
                              <th style={{ padding: '6px 10px' }}>Expires</th>
                              <th style={{ padding: '6px 10px' }}>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cookies.length === 0 ? (
                              <tr>
                                <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                  Cookie jar is empty. Send requests that return Set-Cookie headers or add cookies manually.
                                </td>
                              </tr>
                            ) : (
                              cookies.map((c) => (
                                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                  <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>{c.domain}</td>
                                  <td style={{ padding: '6px 10px', fontWeight: 600, color: 'var(--accent)' }}>{c.name}</td>
                                  <td style={{ padding: '6px 10px', fontFamily: 'monospace', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {c.value}
                                  </td>
                                  <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>{c.path}</td>
                                  <td style={{ padding: '6px 10px', color: 'var(--text-secondary)' }}>
                                    {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Session'}
                                  </td>
                                  <td style={{ padding: '6px 10px' }}>
                                    <button
                                      onClick={() => handleDeleteCookie(c.id)}
                                      style={{
                                        backgroundColor: 'transparent',
                                        color: 'var(--danger)',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '11px'
                                      }}
                                    >
                                      ✕
                                    </button>
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Import Modal */}
                  {showImportModal && (
                    <div style={{
                      position: 'fixed',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: 'rgba(0, 0, 0, 0.6)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      zIndex: 1000
                    }}>
                      <div style={{
                        width: '550px',
                        backgroundColor: 'var(--bg-panel)',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '14px',
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Import Request or Collection</h3>
                          <button
                            onClick={() => setShowImportModal(false)}
                            style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '16px' }}
                          >
                            ✕
                          </button>
                        </div>

                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          Paste a standard cURL command, Postman 2.1 Collection JSON, or OpenAPI 3.x spec to populate API Studio.
                        </p>

                        <textarea
                          rows={8}
                          value={importInput}
                          onChange={(e) => setImportInput(e.target.value)}
                          placeholder={'curl -X POST https://api.example.com/v1/users \\\n  -H "Authorization: Bearer token" \\\n  -d \'{"name": "Alice"}\''}
                          style={{
                            width: '100%',
                            padding: '10px',
                            backgroundColor: 'var(--bg-card)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)',
                            borderRadius: '6px',
                            fontFamily: 'monospace',
                            fontSize: '12px',
                            resize: 'none',
                            outline: 'none'
                          }}
                        />

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                          <button
                            onClick={() => setShowImportModal(false)}
                            style={{
                              padding: '8px 16px',
                              backgroundColor: 'transparent',
                              color: 'var(--text-secondary)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '6px',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleImportRequest}
                            style={{
                              padding: '8px 20px',
                              backgroundColor: 'var(--accent)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            Parse & Load
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

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
                </>
              ) : (
                <>
                  {/* GraphQL Bar */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '0 12px',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--accent)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                    }}>
                      POST (GQL)
                    </div>

                    <input
                      type="text"
                      value={gqlEndpoint}
                      onChange={(e) => setGqlEndpoint(e.target.value)}
                      placeholder="http://127.0.0.1:8000/graphql"
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
                      onClick={handleExecuteGraphQL}
                      disabled={gqlLoading}
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
                      {gqlLoading ? 'Executing...' : 'Run Query'}
                    </button>
                  </div>

                  {/* GraphQL Split */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, gap: '16px', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
                      {/* Query Editor */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 2,
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        overflow: 'hidden'
                      }}>
                        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          GRAPHQL QUERY / MUTATION
                        </div>
                        <textarea
                          value={gqlQuery}
                          onChange={(e) => setGqlQuery(e.target.value)}
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

                      {/* Variables Editor */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-color)',
                        overflow: 'hidden'
                      }}>
                        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          QUERY VARIABLES (JSON)
                        </div>
                        <textarea
                          value={gqlVariables}
                          onChange={(e) => setGqlVariables(e.target.value)}
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
                    </div>

                    {/* GraphQL Response */}
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
                        <span>GRAPHQL RESULT</span>
                        {gqlResponse && (
                          <span style={{ color: gqlResponse.errors ? 'var(--danger)' : 'var(--success)' }}>
                            {gqlResponse.errors ? 'Errors' : 'Success'} {gqlResponse.duration_ms ? `(${gqlResponse.duration_ms} ms)` : ''}
                          </span>
                        )}
                      </div>
                      <pre style={{
                        flex: 1,
                        padding: '12px',
                        overflow: 'auto',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        color: gqlResponse?.errors ? 'var(--danger)' : 'var(--text-primary)'
                      }}>
                        {gqlResponse ? JSON.stringify(gqlResponse, null, 2) : '// Run query to see GraphQL JSON response'}
                      </pre>
                    </div>
                  </div>
                </>
              )}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600 }}>SQL Studio & Slow Query Analytics</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Aggregates query fingerprints, tracking latency percentiles and highlighting queries exceeding 50ms.
                  </p>
                </div>
              </div>
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
                      <th style={{ padding: '8px 12px' }}>SQL Template</th>
                      <th style={{ padding: '8px 12px' }}>Count</th>
                      <th style={{ padding: '8px 12px' }}>Total Time</th>
                      <th style={{ padding: '8px 12px' }}>Avg Time</th>
                      <th style={{ padding: '8px 12px' }}>Max Time</th>
                      <th style={{ padding: '8px 12px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sqlAnalytics.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          No SQL executions recorded yet. Invoke an endpoint that queries your database.
                        </td>
                      </tr>
                    ) : (
                      sqlAnalytics.map((q, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', maxWidth: '400px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {q.sql_template}
                          </td>
                          <td style={{ padding: '8px 12px' }}>{q.execution_count}x</td>
                          <td style={{ padding: '8px 12px' }}>{Math.round(q.total_duration_us / 1000)} ms</td>
                          <td style={{ padding: '8px 12px' }}>{Math.round(q.avg_duration_us / 1000)} ms</td>
                          <td style={{ padding: '8px 12px' }}>{Math.round(q.max_duration_us / 1000)} ms</td>
                          <td style={{ padding: '8px 12px' }}>
                            {q.is_slow ? (
                              <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(248, 81, 73, 0.15)', color: 'var(--danger)', fontSize: '11px', fontWeight: 600 }}>
                                SLOW
                              </span>
                            ) : (
                              <span style={{ padding: '2px 6px', borderRadius: '4px', backgroundColor: 'rgba(63, 185, 80, 0.15)', color: 'var(--success)', fontSize: '11px', fontWeight: 600 }}>
                                FAST
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'logs' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px' }}>
              <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Application Logs & Correlation (Module 16)</h2>
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
                      <th style={{ padding: '8px 12px' }}>Level</th>
                      <th style={{ padding: '8px 12px' }}>Channel</th>
                      <th style={{ padding: '8px 12px' }}>Message</th>
                      <th style={{ padding: '8px 12px' }}>Trace ID</th>
                      <th style={{ padding: '8px 12px' }}>Timestamp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          No application logs recorded. Logs written via PSR-3 logger or Laravel Log facade will stream here.
                        </td>
                      </tr>
                    ) : (
                      logs.map((l) => (
                        <tr key={l.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: l.level === 'error' || l.level === 'critical' ? 'rgba(248, 81, 73, 0.15)' : 'rgba(88, 166, 255, 0.15)',
                              color: l.level === 'error' || l.level === 'critical' ? 'var(--danger)' : 'var(--accent)',
                            }}>
                              {l.level.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{l.channel}</td>
                          <td style={{ padding: '8px 12px' }}>{l.message_masked}</td>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--accent)' }}>
                            {l.trace_id ? l.trace_id.substring(0, 8) + '...' : '-'}
                          </td>
                          <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{new Date(l.timestamp).toLocaleTimeString()}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'tests' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Test Studio (Module 17)</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Runs PHPUnit / Pest tests in an isolated child process using the project's configured PHP binary.
                  </p>
                </div>
                <button
                  onClick={handleRunTests}
                  disabled={testLoading}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {testLoading ? 'Running Tests...' : '▶ Run PHPUnit Suite'}
                </button>
              </div>

              <div style={{
                flex: 1,
                backgroundColor: 'var(--bg-card)',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                padding: '16px',
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: '13px'
              }}>
                {testOutput ? (
                  <div>
                    <div style={{ marginBottom: '12px', display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        backgroundColor: testOutput.passed ? 'rgba(63, 185, 80, 0.15)' : 'rgba(248, 81, 73, 0.15)',
                        color: testOutput.passed ? 'var(--success)' : 'var(--danger)'
                      }}>
                        {testOutput.passed ? 'PASSED' : 'FAILED'} (Exit code: {testOutput.exit_code})
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>Duration: {testOutput.duration_ms} ms</span>
                    </div>
                    <pre style={{ whiteSpace: 'pre-wrap' }}>{testOutput.output}</pre>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                    Click "Run PHPUnit Suite" to execute test cases.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'artisan' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px' }}>
              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Artisan Console (Module 18)</h2>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  Safe execution of permitted artisan commands with destructive command protection.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={artisanCmd}
                  onChange={(e) => setArtisanCmd(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                >
                  {safeArtisanList.map((cmd) => (
                    <option key={cmd} value={cmd}>php artisan {cmd}</option>
                  ))}
                </select>

                <button
                  onClick={handleRunArtisan}
                  disabled={artisanLoading}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {artisanLoading ? 'Running...' : 'Execute'}
                </button>
              </div>

              <div style={{
                flex: 1,
                backgroundColor: 'var(--bg-card)',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                padding: '16px',
                overflow: 'auto',
                fontFamily: 'monospace',
                fontSize: '13px'
              }}>
                {artisanOutput ? (
                  <div>
                    {artisanOutput.stdout && <pre style={{ whiteSpace: 'pre-wrap' }}>{artisanOutput.stdout}</pre>}
                    {artisanOutput.stderr && <pre style={{ whiteSpace: 'pre-wrap', color: 'var(--danger)' }}>{artisanOutput.stderr}</pre>}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '24px' }}>
                    Select an artisan command and click Execute.
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'queues' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Queue Studio & Job Diagnostics (Module 20)</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Live inspection of background queue jobs, failed payloads, exception stack traces, and safe replay execution.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={loadQueueJobs}
                    disabled={queueLoading}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {queueLoading ? 'Loading...' : '🔄 Refresh'}
                  </button>
                </div>
              </div>

              {/* Status Filters Bar */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>STATUS FILTER:</span>
                {['all', 'failed', 'processing', 'completed', 'replayed'].map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setQueueStatusFilter(st);
                      setTimeout(loadQueueJobs, 10);
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: queueStatusFilter === st ? 'var(--accent)' : 'var(--bg-card)',
                      color: queueStatusFilter === st ? '#fff' : 'var(--text-secondary)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      textTransform: 'capitalize'
                    }}
                  >
                    {st}
                  </button>
                ))}
              </div>

              {/* Queue Jobs List */}
              <div style={{
                flex: 1,
                backgroundColor: 'var(--bg-card)',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                overflow: 'auto',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                {queueJobs.length === 0 ? (
                  <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    No queue jobs found matching the filter. Background jobs processed by Laravel or Symfony queues will appear here.
                  </div>
                ) : (
                  queueJobs.map((job) => (
                    <div key={job.id} style={{
                      padding: '12px 14px',
                      backgroundColor: 'var(--bg-panel)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            fontSize: '11px',
                            backgroundColor:
                              job.status === 'failed' ? 'rgba(248, 81, 73, 0.2)' :
                              job.status === 'completed' ? 'rgba(63, 185, 80, 0.2)' :
                              job.status === 'replayed' ? 'rgba(163, 113, 247, 0.2)' : 'rgba(227, 179, 65, 0.2)',
                            color:
                              job.status === 'failed' ? 'var(--danger)' :
                              job.status === 'completed' ? 'var(--success)' :
                              job.status === 'replayed' ? '#a371f7' : 'var(--warning)',
                            textTransform: 'uppercase'
                          }}>
                            {job.status}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: '13px' }}>{job.job_class}</span>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                            ({job.connection}:{job.queue_name})
                          </span>
                          {job.attempts > 0 && (
                            <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '3px', backgroundColor: 'var(--bg-card)' }}>
                              Attempts: {job.attempts}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                            {job.failed_at ? `Failed: ${new Date(job.failed_at).toLocaleTimeString()}` : new Date(job.created_at).toLocaleTimeString()}
                          </span>
                          <button
                            onClick={() => handleReplayJob(job.id)}
                            style={{
                              padding: '4px 10px',
                              backgroundColor: 'var(--accent)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            🔄 Replay
                          </button>
                        </div>
                      </div>

                      {job.exception_message && (
                        <div style={{
                          margin: '6px 0',
                          padding: '8px 10px',
                          borderRadius: '4px',
                          backgroundColor: 'rgba(248, 81, 73, 0.1)',
                          color: 'var(--danger)',
                          fontSize: '11px',
                          fontFamily: 'monospace'
                        }}>
                          <strong>Exception:</strong> {job.exception_message}
                        </div>
                      )}

                      {job.exception_trace && (
                        <details style={{ marginTop: '6px' }}>
                          <summary style={{ cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '11px' }}>
                            View Stack Trace
                          </summary>
                          <pre style={{
                            margin: '6px 0 0 0',
                            padding: '8px',
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            overflow: 'auto',
                            maxHeight: '160px'
                          }}>
                            {job.exception_trace}
                          </pre>
                        </details>
                      )}

                      {job.payload_json && (
                        <details style={{ marginTop: '4px' }}>
                          <summary style={{ cursor: 'pointer', color: 'var(--text-secondary)', fontSize: '11px' }}>
                            View Job Payload
                          </summary>
                          <pre style={{
                            margin: '6px 0 0 0',
                            padding: '8px',
                            backgroundColor: 'var(--bg-card)',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            whiteSpace: 'pre-wrap',
                            overflow: 'auto',
                            maxHeight: '120px'
                          }}>
                            {job.payload_json}
                          </pre>
                        </details>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Security Diagnostics & Configuration Audit (Module 19)</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Non-destructive checks for secret leaks, risky debug modes, world-readable permissions, and weak keys.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  {securityReport && (
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: 'rgba(248, 81, 73, 0.2)',
                        color: 'var(--danger)'
                      }}>
                        Critical: {securityReport.summary?.CRITICAL || 0}
                      </span>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: 'rgba(227, 179, 65, 0.2)',
                        color: 'var(--warning)'
                      }}>
                        Warning: {securityReport.summary?.WARNING || 0}
                      </span>
                      <span style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: 'rgba(88, 166, 255, 0.2)',
                        color: 'var(--accent)'
                      }}>
                        Info: {securityReport.summary?.INFO || 0}
                      </span>
                    </div>
                  )}

                  <button
                    onClick={handleRunSecurityAudit}
                    disabled={securityLoading}
                    style={{
                      padding: '8px 18px',
                      backgroundColor: 'var(--accent)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {securityLoading ? 'Scanning...' : '🛡️ Run Security Audit'}
                  </button>
                </div>
              </div>

              {/* Security Findings List */}
              <div style={{
                flex: 1,
                backgroundColor: 'var(--bg-card)',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                overflow: 'auto',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
              }}>
                {!securityReport ? (
                  <div style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                    Click "Run Security Audit" above to run non-destructive security checks against your active project.
                  </div>
                ) : securityReport.findings.length === 0 ? (
                  <div style={{ padding: '36px', textAlign: 'center', color: 'var(--success)', fontSize: '13px' }}>
                    ✔ No security risks or configuration vulnerabilities detected!
                  </div>
                ) : (
                  securityReport.findings.map((f: any) => (
                    <div key={f.id} style={{
                      padding: '12px 14px',
                      backgroundColor: 'var(--bg-panel)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontWeight: 600,
                            fontSize: '11px',
                            backgroundColor:
                              f.severity === 'CRITICAL' ? 'rgba(248, 81, 73, 0.2)' :
                              f.severity === 'WARNING' ? 'rgba(227, 179, 65, 0.2)' : 'rgba(88, 166, 255, 0.2)',
                            color:
                              f.severity === 'CRITICAL' ? 'var(--danger)' :
                              f.severity === 'WARNING' ? 'var(--warning)' : 'var(--accent)'
                          }}>
                            {f.severity}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: '13px' }}>{f.check}</span>
                        </div>
                      </div>

                      <div style={{ color: 'var(--text-primary)', marginTop: '4px', marginBottom: '8px' }}>
                        {f.description}
                      </div>

                      <div style={{
                        padding: '8px 10px',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)',
                        fontSize: '11px'
                      }}>
                        <strong style={{ color: 'var(--accent)' }}>Remediation:</strong> {f.remediation}
                      </div>

                      {f.evidence && (
                        <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                          Evidence: {f.evidence}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'xdebug' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600 }}>PHP DBGp Breakpoint Debugger (Module 10)</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Step-by-step interactive Xdebug 3 debugger with call-stack inspection, expression evaluation, and breakpoint management.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <div style={{
                    fontSize: '11px',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(88, 166, 255, 0.15)',
                    color: 'var(--accent)',
                    border: '1px solid rgba(88, 166, 255, 0.3)'
                  }}>
                    DBGp: 127.0.0.1:9003
                  </div>
                  <button
                    onClick={loadDebugSessions}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    🔄 Refresh
                  </button>
                </div>
              </div>

              {/* Session Selector & Stepping Toolbar */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                backgroundColor: 'var(--bg-card)',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    ACTIVE SESSION:
                  </label>
                  <select
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(e.target.value)}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: 'var(--bg-panel)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      flex: 1,
                      maxWidth: '380px'
                    }}
                  >
                    {debugSessions.length === 0 ? (
                      <option value="">No active Xdebug connection (trigger an HTTP request)</option>
                    ) : (
                      debugSessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          Session {s.id.substring(0, 8)}... - State: [{s.state}] {s.file_uri ? `at ${s.file_uri}:${s.line}` : ''}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Stepping controls */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handleDebugAction('continue')}
                    disabled={!selectedSessionId || debugActionLoading}
                    title="Continue execution until next breakpoint"
                    style={{
                      padding: '6px 12px',
                      backgroundColor: 'rgba(63, 185, 80, 0.2)',
                      color: 'var(--success)',
                      border: '1px solid var(--success)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    ▶ Continue
                  </button>
                  <button
                    onClick={() => handleDebugAction('step_over')}
                    disabled={!selectedSessionId || debugActionLoading}
                    title="Step Over to next line in same function"
                    style={{
                      padding: '6px 12px',
                      backgroundColor: 'var(--bg-panel)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    ↷ Step Over
                  </button>
                  <button
                    onClick={() => handleDebugAction('step_into')}
                    disabled={!selectedSessionId || debugActionLoading}
                    title="Step Into function call"
                    style={{
                      padding: '6px 12px',
                      backgroundColor: 'var(--bg-panel)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    ↓ Step Into
                  </button>
                  <button
                    onClick={() => handleDebugAction('step_out')}
                    disabled={!selectedSessionId || debugActionLoading}
                    title="Step Out of current function"
                    style={{
                      padding: '6px 12px',
                      backgroundColor: 'var(--bg-panel)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    ↑ Step Out
                  </button>
                  <button
                    onClick={() => handleDebugAction('stop')}
                    disabled={!selectedSessionId || debugActionLoading}
                    title="Terminate debugging session"
                    style={{
                      padding: '6px 12px',
                      backgroundColor: 'rgba(248, 81, 73, 0.15)',
                      color: 'var(--danger)',
                      border: '1px solid var(--danger)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    ⏹ Stop
                  </button>
                </div>
              </div>

              {/* Debugger Main Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', flex: 1, gap: '16px', overflow: 'hidden' }}>
                {/* Left Column: Stack Frames & Execution Pointer */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
                  {/* Current Position Card */}
                  <div style={{
                    padding: '12px 14px',
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                  }}>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                      EXECUTION POINTER
                    </div>
                    {debugSessions.find((s) => s.id === selectedSessionId) ? (
                      (() => {
                        const cur = debugSessions.find((s) => s.id === selectedSessionId);
                        return (
                          <div style={{ fontSize: '13px' }}>
                            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                              {cur.file_uri || '(Starting...)'}
                            </span>
                            {cur.line > 0 && <span style={{ color: 'var(--warning)', fontWeight: 'bold' }}> :{cur.line}</span>}
                            <span style={{ marginLeft: '10px', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-panel)' }}>
                              State: {cur.state}
                            </span>
                          </div>
                        );
                      })()
                    ) : (
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        Waiting for DBGp session connection on port 9003...
                      </div>
                    )}
                  </div>

                  {/* Call Stack Table */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden'
                  }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      CALL STACK
                    </div>
                    <div style={{ flex: 1, overflow: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                        <thead style={{ backgroundColor: 'var(--bg-panel)', color: 'var(--text-secondary)' }}>
                          <tr>
                            <th style={{ padding: '8px 12px' }}>#</th>
                            <th style={{ padding: '8px 12px' }}>Function / Method</th>
                            <th style={{ padding: '8px 12px' }}>File</th>
                            <th style={{ padding: '8px 12px' }}>Line</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            const cur = debugSessions.find((s) => s.id === selectedSessionId);
                            const frames = cur?.frames || [];
                            if (frames.length === 0) {
                              return (
                                <tr>
                                  <td colSpan={4} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                                    No stack frames active.
                                  </td>
                                </tr>
                              );
                            }
                            return frames.map((f: any, idx: number) => (
                              <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{f.level}</td>
                                <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--accent)' }}>{f.where || '{main}'}</td>
                                <td style={{ padding: '8px 12px', color: 'var(--text-primary)' }}>{f.filename}</td>
                                <td style={{ padding: '8px 12px', fontWeight: 600 }}>{f.lineno}</td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Right Column: Expression Watch & Breakpoints */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflow: 'hidden' }}>
                  {/* Expression Watch / Eval Console */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden'
                  }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      EXPRESSION WATCH & EVAL CONSOLE
                    </div>

                    <form onSubmit={handleDebugEval} style={{ display: 'flex', padding: '10px', gap: '8px', borderBottom: '1px solid var(--border-color)' }}>
                      <input
                        type="text"
                        value={debugEvalExpr}
                        onChange={(e) => setDebugEvalExpr(e.target.value)}
                        placeholder="e.g. $user->email or $_SERVER['REQUEST_METHOD']"
                        style={{
                          flex: 1,
                          padding: '6px 10px',
                          backgroundColor: 'var(--bg-panel)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          fontFamily: 'monospace',
                          fontSize: '12px'
                        }}
                      />
                      <button
                        type="submit"
                        disabled={!selectedSessionId || debugActionLoading}
                        style={{
                          padding: '6px 14px',
                          backgroundColor: 'var(--accent)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Eval
                      </button>
                    </form>

                    <pre style={{
                      flex: 1,
                      padding: '12px',
                      overflow: 'auto',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      color: 'var(--text-primary)',
                      backgroundColor: 'transparent'
                    }}>
                      {evalResult || '// Result of evaluated expression will display here'}
                    </pre>
                  </div>

                  {/* Breakpoints Manager Card */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden'
                  }}>
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      BREAKPOINTS MANAGER
                    </div>

                    {/* Add Breakpoint Form */}
                    <form onSubmit={handleAddBreakpoint} style={{ display: 'flex', gap: '8px', padding: '8px 10px', borderBottom: '1px solid var(--border-color)' }}>
                      <input
                        type="text"
                        value={newBpFile}
                        onChange={(e) => setNewBpFile(e.target.value)}
                        placeholder="/app/routes/api.php"
                        required
                        style={{
                          flex: 2,
                          padding: '6px 10px',
                          backgroundColor: 'var(--bg-panel)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                      <input
                        type="number"
                        value={newBpLine}
                        onChange={(e) => setNewBpLine(Number(e.target.value))}
                        placeholder="Line"
                        required
                        style={{
                          width: '70px',
                          padding: '6px 10px',
                          backgroundColor: 'var(--bg-panel)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          fontSize: '12px'
                        }}
                      />
                      <button
                        type="submit"
                        style={{
                          padding: '6px 14px',
                          backgroundColor: 'var(--bg-panel)',
                          color: 'var(--accent)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        + Add
                      </button>
                    </form>

                    {/* Breakpoints List */}
                    <div style={{ flex: 1, overflow: 'auto' }}>
                      {breakpoints.length === 0 ? (
                        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                          No breakpoints set. Add a breakpoint above to pause execution during DBGp debugging.
                        </div>
                      ) : (
                        breakpoints.map((bp) => (
                          <div key={bp.id} style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '8px 12px',
                            borderBottom: '1px solid var(--border-color)',
                            fontSize: '12px'
                          }}>
                            <div>
                              <span style={{ color: 'var(--danger)', marginRight: '6px' }}>●</span>
                              <span style={{ fontFamily: 'monospace' }}>{bp.file_uri}</span>
                              <span style={{ fontWeight: 600, color: 'var(--warning)', marginLeft: '6px' }}>:{bp.line_number}</span>
                            </div>
                            <button
                              onClick={() => handleDeleteBreakpoint(bp.id)}
                              style={{
                                padding: '2px 8px',
                                backgroundColor: 'transparent',
                                color: 'var(--text-secondary)',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
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

          {activeTab === 'streams' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Live WebSocket & SSE Event Streams (Module 06 & 21)</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Real-time event subscriber streaming traces, database queries, logs, and webhook triggers.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    padding: '4px 10px',
                    borderRadius: '12px',
                    backgroundColor: streamConnected ? 'rgba(63, 185, 80, 0.15)' : 'rgba(248, 81, 73, 0.15)',
                    color: streamConnected ? 'var(--success)' : 'var(--danger)',
                  }}>
                    <span style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: streamConnected ? 'var(--success)' : 'var(--danger)'
                    }} />
                    {streamConnected ? 'Connected (ws://127.0.0.1:8765/v1/events/stream)' : 'Connecting...'}
                  </div>

                  <button
                    onClick={() => setStreamEvents([])}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: 'var(--bg-card)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '6px',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Clear Log
                  </button>
                </div>
              </div>

              {/* Filter bar */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: 600 }}>FILTER EVENT:</span>
                {['all', 'trace_span', 'query_executed', 'log_emitted', 'session_started', 'webhook_received'].map((f) => (
                  <button
                    key={f}
                    onClick={() => setStreamFilter(f)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: streamFilter === f ? 'var(--accent)' : 'var(--bg-card)',
                      color: streamFilter === f ? '#fff' : 'var(--text-secondary)',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>

              {/* Event Streams Log */}
              <div style={{
                flex: 1,
                backgroundColor: 'var(--bg-card)',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                overflow: 'auto',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {(() => {
                  const filtered = streamEvents.filter((ev) => streamFilter === 'all' || ev.event === streamFilter || ev.topic === streamFilter);
                  if (filtered.length === 0) {
                    return (
                      <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        No matching stream frames received yet. Run API requests or Artisan commands to observe live broadcast events.
                      </div>
                    );
                  }
                  return filtered.map((ev, idx) => (
                    <div key={idx} style={{
                      padding: '10px 12px',
                      backgroundColor: 'var(--bg-panel)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      fontSize: '12px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontWeight: 600,
                          fontSize: '11px',
                          backgroundColor: 'rgba(88, 166, 255, 0.15)',
                          color: 'var(--accent)'
                        }}>
                          {ev.event || ev.topic || 'frame'}
                        </span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                          {ev.timestamp ? new Date(ev.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}
                        </span>
                      </div>
                      <pre style={{
                        margin: 0,
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all'
                      }}>
                        {JSON.stringify(ev.data || ev.payload || ev, null, 2)}
                      </pre>
                    </div>
                  ));
                })()}
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

      {/* Local-First AI Advisor Modal (Module 26) */}
      {showAIAdvisor && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            width: '680px',
            maxHeight: '85vh',
            backgroundColor: 'var(--bg-panel)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>🤖</span>
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Local AI Diagnostic Advisor</h3>
                <span style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(63, 185, 80, 0.15)',
                  color: 'var(--success)'
                }}>
                  Zero Cloud Tracking • 127.0.0.1:11434
                </span>
              </div>
              <button
                onClick={() => setShowAIAdvisor(false)}
                style={{ backgroundColor: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '16px' }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
              Queries your local Ollama LLM (<code style={{ color: 'var(--accent)' }}>llama3.2:3b</code>) to explain slow queries, diagnose N+1 problems, or propose Eloquent optimizations safely on your machine.
            </p>

            <form onSubmit={handleRunAIAdvisor} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <textarea
                rows={4}
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="Paste an EXPLAIN query plan, SQL query, or error message to diagnose..."
                style={{
                  width: '100%',
                  padding: '10px',
                  backgroundColor: 'var(--bg-card)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  resize: 'none',
                  outline: 'none'
                }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Tip: Press <kbd style={{ padding: '2px 4px', backgroundColor: 'var(--bg-card)', borderRadius: '3px' }}>Esc</kbd> to close anytime.
                </span>

                <button
                  type="submit"
                  disabled={aiLoading}
                  style={{
                    padding: '8px 20px',
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {aiLoading ? 'Thinking Locally...' : '⚡ Generate Diagnosis'}
                </button>
              </div>
            </form>

            <div style={{
              flex: 1,
              backgroundColor: 'var(--bg-card)',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              padding: '12px',
              overflow: 'auto',
              minHeight: '140px',
              maxHeight: '260px'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                DIAGNOSIS & RECOMMENDATION
              </div>
              <pre style={{
                margin: 0,
                fontFamily: 'monospace',
                fontSize: '12px',
                color: 'var(--text-primary)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {aiResponse || '// Run diagnosis above to see local AI performance analysis'}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
