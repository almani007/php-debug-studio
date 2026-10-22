import React, { useState, useEffect } from 'react';
import { api } from './api/client';

export function App() {
  const [activeTab, setActiveTab] = useState<'api' | 'traces' | 'sql' | 'logs' | 'tests' | 'artisan' | 'queues' | 'security' | 'routes' | 'xdebug' | 'webhooks' | 'jsdebug' | 'streams' | 'projects'>('api');
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

  // Laravel Routes state (Module 12)
  const [laravelRoutes, setLaravelRoutes] = useState<any[]>([]);
  const [routesLoading, setRoutesLoading] = useState<boolean>(false);
  const [routeSearch, setRouteSearch] = useState<string>('');
  const [routeMethodFilter, setRouteMethodFilter] = useState<string>('ALL');

  // Data Retention Purge state (Module 21)
  const [purgeDays, setPurgeDays] = useState<number>(7);
  const [purgeResult, setPurgeResult] = useState<any>(null);
  const [purgeLoading, setPurgeLoading] = useState<boolean>(false);

  // Webhook Studio state (Module 22)
  const [webhookEvents, setWebhookEvents] = useState<any[]>([]);
  const [webhookReceiverId, setWebhookReceiverId] = useState<string>('test-receiver');
  const [webhookLoading, setWebhookLoading] = useState<boolean>(false);
  const [selectedWebhook, setSelectedWebhook] = useState<any | null>(null);
  const [simProvider, setSimProvider] = useState<'stripe' | 'github' | 'shopify'>('stripe');
  const [simSecret, setSimSecret] = useState<string>('whsec_sample_secret_key');
  const [simulating, setSimulating] = useState<boolean>(false);
  const [verifySecret, setVerifySecret] = useState<string>('whsec_sample_secret_key');
  const [verifyPayload, setVerifyPayload] = useState<string>('{"event":"test"}');
  const [verifySignature, setVerifySignature] = useState<string>('');
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean } | null>(null);
  const [verifying, setVerifying] = useState<boolean>(false);
  const [replayTargetUrl, setReplayTargetUrl] = useState<string>('http://127.0.0.1:8000/api/webhooks');
  const [replayStatus, setReplayStatus] = useState<string | null>(null);
  const [replaying, setReplaying] = useState<boolean>(false);

  // JavaScript Debug Studio state (Module 23)
  const [jsSessions, setJsSessions] = useState<any[]>([]);
  const [selectedJsSessionId, setSelectedJsSessionId] = useState<string>('');
  const [jsConsoleEvents, setJsConsoleEvents] = useState<any[]>([]);
  const [selectedJsEvent, setSelectedJsEvent] = useState<any | null>(null);
  const [jsSeverityFilter, setJsSeverityFilter] = useState<string>('ALL');
  const [jsTraceIdFilter, setJsTraceIdFilter] = useState<string>('');
  const [jsSearchText, setJsSearchText] = useState<string>('');
  const [jsLoading, setJsLoading] = useState<boolean>(false);
  const [showSnippetModal, setShowSnippetModal] = useState<boolean>(false);
  const [testEventMessage, setTestEventMessage] = useState<string>('Uncaught TypeError: Cannot read properties of undefined (reading "user")');
  const [testEventSeverity, setTestEventSeverity] = useState<string>('error');
  const [testEventTraceId, setTestEventTraceId] = useState<string>('');
  const [testEventLoading, setTestEventLoading] = useState<boolean>(false);

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

  // Database Debug Studio & Solution Advisor state (Module 24)
  const [dbSubTab, setDbSubTab] = useState<'queries' | 'advisor' | 'explain' | 'connections'>('queries');
  const [dbConnections, setDbConnections] = useState<any[]>([]);
  const [newDbConnName, setNewDbConnName] = useState<string>('primary');
  const [newDbConnDriver, setNewDbConnDriver] = useState<string>('mysql');
  const [dbFindings, setDbFindings] = useState<any[]>([]);
  const [dbAdvisorLoading, setDbAdvisorLoading] = useState<boolean>(false);
  const [explainSqlInput, setExplainSqlInput] = useState<string>('SELECT * FROM users WHERE status = "active" ORDER BY created_at DESC;');
  const [explainDriver, setExplainDriver] = useState<string>('mysql');
  const [explainResult, setExplainResult] = useState<any | null>(null);
  const [explainLoading, setExplainLoading] = useState<boolean>(false);

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

  // Workspace & Multi-Project state (Module 25)
  const [projectSubTab, setProjectSubTab] = useState<'projects' | 'workspaces' | 'environments' | 'retention'>('projects');
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [selectedWorkspaceFilter, setSelectedWorkspaceFilter] = useState<string>('all');
  const [newWorkspaceName, setNewWorkspaceName] = useState<string>('');
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState<string>('');
  const [projectEnvironments, setProjectEnvironments] = useState<any[]>([]);
  const [newEnvName, setNewEnvName] = useState<string>('local');
  const [newEnvKind, setNewEnvKind] = useState<'local' | 'staging' | 'production'>('local');
  const [newEnvIsProd, setNewEnvIsProd] = useState<boolean>(false);

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
    loadWorkspaces();
  };

  const loadWorkspaces = () => {
    api.getWorkspaces()
      .then((data) => setWorkspaces(data || []))
      .catch(() => setWorkspaces([]));
  };

  const loadProjectEnvironments = (projId?: string) => {
    const id = projId || selectedProjectId;
    if (!id) return;
    api.getProjectEnvironments(id)
      .then((data) => setProjectEnvironments(data || []))
      .catch(() => setProjectEnvironments([]));
  };

  const handleCreateWorkspace = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    try {
      await api.createWorkspace({ name: newWorkspaceName, description: newWorkspaceDesc });
      setNewWorkspaceName('');
      setNewWorkspaceDesc('');
      loadWorkspaces();
    } catch (err: any) {
      alert(`Failed to create workspace: ${err.message}`);
    }
  };

  const handleDeleteWorkspace = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workspace?')) return;
    try {
      await api.deleteWorkspace(id);
      loadWorkspaces();
    } catch (err: any) {
      alert(`Failed to delete workspace: ${err.message}`);
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Delete this project and its local configuration? (Source files will not be touched).')) return;
    try {
      await api.deleteProject(id);
      loadProjects();
    } catch (err: any) {
      alert(`Failed to delete project: ${err.message}`);
    }
  };

  const handleAssignWorkspace = async (workspaceId: string, projectId: string) => {
    try {
      if (!workspaceId) return;
      await api.assignProjectWorkspace(workspaceId, projectId);
      loadProjects();
      loadWorkspaces();
    } catch (err: any) {
      alert(`Failed to assign workspace: ${err.message}`);
    }
  };

  const handleCreateEnvironment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedProjectId) {
      alert('Please select a project first.');
      return;
    }
    try {
      await api.createProjectEnvironment(selectedProjectId, {
        name: newEnvName,
        kind: newEnvKind,
        is_production: newEnvIsProd,
        sampling_rate: 1.0,
        retention_days: 7,
      });
      setNewEnvName('');
      loadProjectEnvironments(selectedProjectId);
    } catch (err: any) {
      alert(`Failed to create environment: ${err.message}`);
    }
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
      loadDBConnections();
      loadDBFindings();
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
    } else if (activeTab === 'routes') {
      if (activeProject && laravelRoutes.length === 0) {
        handleLoadLaravelRoutes();
      }
    } else if (activeTab === 'api') {
      loadCookies();
    } else if (activeTab === 'xdebug') {
      loadDebugSessions();
      loadBreakpoints();
    } else if (activeTab === 'webhooks') {
      loadWebhookEvents();
    } else if (activeTab === 'jsdebug') {
      loadJsSessions();
      loadJsEvents();
    } else if (activeTab === 'projects') {
      loadWorkspaces();
      loadProjectEnvironments();
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

  const handleLoadLaravelRoutes = async () => {
    if (!activeProject) {
      alert('Please select or create a project first.');
      return;
    }
    setRoutesLoading(true);
    try {
      const res = await api.getLaravelRoutes(activeProject.root_path, activeProject.php_binary_path);
      setLaravelRoutes(res || []);
    } catch (err: any) {
      alert(`Failed to load Laravel routes: ${err.message}`);
    } finally {
      setRoutesLoading(false);
    }
  };

  const handleTestRouteInApiStudio = (routeMethod: string, uri: string) => {
    const primaryMethod = (routeMethod.split('|')[0] || 'GET').toUpperCase() as any;
    const cleanUri = uri.replace(/^\//, '');
    const fullUrl = `http://127.0.0.1:8000/${cleanUri}`;

    setMethod(primaryMethod);
    setUrl(fullUrl);
    setApiMode('rest');
    setActiveTab('api');
  };

  const handlePurgeTelemetry = async () => {
    if (!confirm(`Purge stored traces, queries, and logs older than ${purgeDays} days?`)) return;
    setPurgeLoading(true);
    try {
      const res = await api.purgeData(purgeDays);
      setPurgeResult(res);
      alert(`Purge complete! Deleted ${res?.deleted_traces || 0} traces, ${res?.deleted_queries || 0} queries, ${res?.deleted_logs || 0} logs.`);
    } catch (err: any) {
      alert(`Purge error: ${err.message}`);
    } finally {
      setPurgeLoading(false);
    }
  };

  const loadWebhookEvents = () => {
    setWebhookLoading(true);
    api.getWebhookEvents(webhookReceiverId)
      .then((data) => {
        setWebhookEvents(data || []);
        if (data && data.length > 0 && !selectedWebhook) {
          setSelectedWebhook(data[0]);
        }
      })
      .catch(() => setWebhookEvents([]))
      .finally(() => setWebhookLoading(false));
  };

  const handleSimulateWebhook = async () => {
    setSimulating(true);
    try {
      const sim = await api.simulateWebhook({ provider: simProvider, secret: simSecret });
      if (!sim) throw new Error('Failed to generate simulation payload');

      const endpoint = `http://127.0.0.1:8765/wh/${webhookReceiverId}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: sim.headers || { 'Content-Type': 'application/json' },
        body: sim.raw_payload,
      });

      if (!res.ok) {
        throw new Error(`Receiver responded with HTTP ${res.status}`);
      }

      loadWebhookEvents();
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  const handleVerifySignature = async () => {
    if (!verifySecret || !verifyPayload || !verifySignature) {
      alert('Please provide secret, payload, and signature.');
      return;
    }
    setVerifying(true);
    try {
      const res = await api.verifyWebhookSignature({
        secret: verifySecret,
        payload: verifyPayload,
        signature: verifySignature,
      });
      setVerifyResult(res);
    } catch (err: any) {
      alert(`Verification error: ${err.message}`);
    } finally {
      setVerifying(false);
    }
  };

  const handleReplayWebhook = async (event: any) => {
    if (!replayTargetUrl) {
      alert('Please enter a target URL for replay.');
      return;
    }
    setReplaying(true);
    setReplayStatus(null);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      try {
        const parsed = JSON.parse(event.headers_json);
        for (const [k, v] of Object.entries(parsed)) {
          if (Array.isArray(v) && v.length > 0) {
            headers[k] = v[0] as string;
          } else if (typeof v === 'string') {
            headers[k] = v;
          }
        }
      } catch {
        // ignore header parsing error
      }

      const startTime = performance.now();
      const res = await api.executeRequest({
        method: event.method || 'POST',
        url: replayTargetUrl,
        headers,
        body: event.body,
      });
      const duration = Math.round(performance.now() - startTime);
      setReplayStatus(`Replay dispatched! HTTP ${res.status_code || 200} (${duration}ms)`);
    } catch (err: any) {
      setReplayStatus(`Replay failed: ${err.message}`);
    } finally {
      setReplaying(false);
    }
  };

  const handleLoadIntoVerifier = (event: any) => {
    setVerifyPayload(event.body || '');
    let sig = '';
    try {
      const headers = JSON.parse(event.headers_json || '{}');
      sig = headers['Stripe-Signature']?.[0] || headers['X-Hub-Signature-256']?.[0] || headers['X-Shopify-Hmac-Sha256']?.[0] || '';
    } catch {
      sig = '';
    }
    setVerifySignature(sig);
    setVerifyResult(null);
  };

  const loadJsSessions = () => {
    api.getJSSessions(selectedProjectId)
      .then((data) => {
        setJsSessions(data || []);
        if (data && data.length > 0 && !selectedJsSessionId) {
          setSelectedJsSessionId(data[0].id);
        }
      })
      .catch(() => setJsSessions([]));
  };

  const loadJsEvents = (sessionId?: string, traceId?: string) => {
    setJsLoading(true);
    api.getJSConsoleEvents(sessionId || selectedJsSessionId, traceId || jsTraceIdFilter)
      .then((data) => {
        setJsConsoleEvents(data || []);
        if (data && data.length > 0 && !selectedJsEvent) {
          setSelectedJsEvent(data[0]);
        }
      })
      .catch(() => setJsConsoleEvents([]))
      .finally(() => setJsLoading(false));
  };

  const handleCreateJsSession = async () => {
    try {
      const sess = await api.createJSSession({
        project_id: selectedProjectId || (projects[0]?.id || 'default'),
        runtime: 'browser',
        browser_name: 'Chrome / CDP',
        version: '124.0.0',
        settings_json: JSON.stringify({ user_agent: navigator.userAgent, viewport: `${window.innerWidth}x${window.innerHeight}` })
      });
      loadJsSessions();
      if (sess?.id) {
        setSelectedJsSessionId(sess.id);
      }
    } catch (err: any) {
      alert(`Failed to create JS session: ${err.message}`);
    }
  };

  const handleCloseJsSession = async (sessionId: string) => {
    try {
      await api.closeJSSession(sessionId);
      loadJsSessions();
    } catch (err: any) {
      alert(`Failed to close session: ${err.message}`);
    }
  };

  const handleEmitTestJsEvent = async () => {
    let targetSessionId = selectedJsSessionId;
    if (!targetSessionId) {
      if (jsSessions.length > 0) {
        targetSessionId = jsSessions[0].id;
      } else {
        alert('Please create or select an active JS session first.');
        return;
      }
    }

    setTestEventLoading(true);
    try {
      await api.emitJSConsoleEvent({
        session_id: targetSessionId,
        trace_id: testEventTraceId || undefined,
        severity: testEventSeverity,
        message_redacted: testEventMessage,
        source_url: 'http://127.0.0.1:8000/resources/js/app.js',
        line: 42,
        column: 15,
        stack_json: JSON.stringify([
          { function: 'renderUserCard', file: 'http://127.0.0.1:8000/resources/js/components/UserCard.vue', line: 18, col: 5 },
          { function: 'fetchUserData', file: 'http://127.0.0.1:8000/resources/js/app.js', line: 42, col: 15 },
          { function: 'onClick', file: 'http://127.0.0.1:8000/resources/js/app.js', line: 75, col: 9 }
        ])
      });
      loadJsEvents(targetSessionId);
    } catch (err: any) {
      alert(`Failed to emit test event: ${err.message}`);
    } finally {
      setTestEventLoading(false);
    }
  };

  const loadDBConnections = () => {
    api.getDBConnections(selectedProjectId)
      .then((data) => setDbConnections(data || []))
      .catch(() => setDbConnections([]));
  };

  const handleCreateDBConnection = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newDbConnName.trim()) return;
    try {
      await api.createDBConnection({
        project_id: selectedProjectId || (projects[0]?.id || 'default'),
        name: newDbConnName,
        driver: newDbConnDriver,
        readonly: true,
      });
      setNewDbConnName('');
      loadDBConnections();
    } catch (err: any) {
      alert(`Failed to add connection: ${err.message}`);
    }
  };

  const handleDeleteDBConnection = async (id: string) => {
    try {
      await api.deleteDBConnection(id);
      loadDBConnections();
    } catch (err: any) {
      alert(`Failed to delete connection: ${err.message}`);
    }
  };

  const loadDBFindings = () => {
    const projId = selectedProjectId || (projects[0]?.id || 'default');
    api.getDBFindings(projId)
      .then((data) => setDbFindings(data || []))
      .catch(() => setDbFindings([]));
  };

  const handleRunDBAdvisor = async () => {
    const projId = selectedProjectId || (projects[0]?.id || 'default');
    setDbAdvisorLoading(true);
    try {
      const findings = await api.analyzeDB(projId);
      setDbFindings(findings || []);
      alert(`Workload analysis complete! Found ${findings?.length || 0} optimization opportunities.`);
    } catch (err: any) {
      alert(`Analysis failed: ${err.message}`);
    } finally {
      setDbAdvisorLoading(false);
    }
  };

  const handleUpdateRecStatus = async (recId: string, status: 'approved' | 'dismissed') => {
    try {
      await api.updateRecommendationStatus(recId, status);
      loadDBFindings();
    } catch (err: any) {
      alert(`Failed to update recommendation: ${err.message}`);
    }
  };

  const handleRunExplain = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!explainSqlInput.trim()) return;
    setExplainLoading(true);
    setExplainResult(null);
    try {
      const res = await api.explainSQL(explainSqlInput, explainDriver);
      setExplainResult(res);
    } catch (err: any) {
      alert(`Explain failed: ${err.message}`);
    } finally {
      setExplainLoading(false);
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
            { id: 'sql', label: '🗄️ Database & Solution Advisor' },
            { id: 'logs', label: '📜 Logs & Correlation' },
            { id: 'tests', label: '🧪 Test Studio' },
            { id: 'artisan', label: '⚡ Artisan Console' },
            { id: 'routes', label: '🛣️ Laravel Routes' },
            { id: 'queues', label: '📬 Queue Studio' },
            { id: 'security', label: '🛡️ Security Audit' },
            { id: 'xdebug', label: '🐞 PHP Debugger' },
            { id: 'webhooks', label: '🪝 Webhook Studio' },
            { id: 'jsdebug', label: '🌐 JS & Frontend Studio' },
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
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '14px', overflow: 'hidden' }}>
              {/* Header and Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Database Debug Studio & Solution Advisor (Module 24)</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Workload telemetry, slow queries, N+1 pattern detection, safe EXPLAIN plan visualizer, and candidate index/code recommendations.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={handleRunDBAdvisor}
                    disabled={dbAdvisorLoading}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: 'var(--accent)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {dbAdvisorLoading ? 'Analyzing...' : '🚀 Run Workload Advisor'}
                  </button>
                  <button
                    onClick={() => {
                      if (selectedProjectId) {
                        api.getSQLAnalytics(selectedProjectId).then((data) => setSqlAnalytics(data || []));
                        loadDBFindings();
                        loadDBConnections();
                      }
                    }}
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

              {/* Sub-Navigation Tabs */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                {[
                  { id: 'queries', label: `📊 Query Explorer & Analytics (${sqlAnalytics.length})` },
                  { id: 'advisor', label: `💡 Solution Advisor (${dbFindings.length})` },
                  { id: 'explain', label: '🔍 Safe EXPLAIN Visualizer' },
                  { id: 'connections', label: `🔌 Connections (${dbConnections.length})` },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setDbSubTab(t.id as any)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: dbSubTab === t.id ? 'var(--accent)' : 'var(--bg-card)',
                      color: dbSubTab === t.id ? '#fff' : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Sub-Tab 1: Query Explorer & Analytics */}
              {dbSubTab === 'queries' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px', overflow: 'hidden' }}>
                  {/* Summary Metric Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                    <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>RECORDED TEMPLATES</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>{sqlAnalytics.length}</div>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--danger)', fontWeight: 600 }}>SLOW QUERIES (>50ms)</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--danger)', marginTop: '4px' }}>
                        {sqlAnalytics.filter((q) => q.is_slow).length}
                      </div>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>MAX LATENCY</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>
                        {sqlAnalytics.length > 0 ? `${Math.round(Math.max(...sqlAnalytics.map((q) => q.max_duration_us)) / 1000)} ms` : '0 ms'}
                      </div>
                    </div>
                    <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>TOTAL EXECUTIONS</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, marginTop: '4px' }}>
                        {sqlAnalytics.reduce((acc, q) => acc + (q.execution_count || 0), 0)}x
                      </div>
                    </div>
                  </div>

                  {/* SQL Queries Table */}
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
                          <th style={{ padding: '8px 12px' }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sqlAnalytics.length === 0 ? (
                          <tr>
                            <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                              No SQL executions recorded yet. Invoke an endpoint that queries your database.
                            </td>
                          </tr>
                        ) : (
                          sqlAnalytics.map((q, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '8px 12px', fontFamily: 'monospace', maxWidth: '420px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                              <td style={{ padding: '8px 12px' }}>
                                <button
                                  onClick={() => {
                                    setExplainSqlInput(q.sql_template);
                                    setDbSubTab('explain');
                                    setTimeout(() => handleRunExplain(), 50);
                                  }}
                                  style={{
                                    padding: '3px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--accent)',
                                    backgroundColor: 'transparent',
                                    color: 'var(--accent)',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  🔍 EXPLAIN
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

              {/* Sub-Tab 2: Solution Advisor & Recommendations */}
              {dbSubTab === 'advisor' && (
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {dbFindings.length === 0 ? (
                    <div style={{
                      padding: '48px 16px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{ fontSize: '32px' }}>💡</div>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>No Active Database Issues Detected</div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', maxWidth: '420px', margin: 0 }}>
                        Click "Run Workload Advisor" above to scan recorded database queries for N+1 loops, slow table scans, and deadlocks.
                      </p>
                      <button
                        onClick={handleRunDBAdvisor}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: 'var(--accent)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        🚀 Run Workload Advisor Now
                      </button>
                    </div>
                  ) : (
                    dbFindings.map((f) => (
                      <div
                        key={f.id}
                        style={{
                          padding: '16px',
                          borderRadius: '6px',
                          backgroundColor: 'var(--bg-card)',
                          border: `1px solid ${f.severity === 'critical' ? 'rgba(248, 81, 73, 0.4)' : 'var(--border-color)'}`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              fontSize: '10px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              backgroundColor: f.severity === 'critical' ? 'var(--danger)' : 'var(--warning, #d29922)',
                              color: '#fff',
                              textTransform: 'uppercase'
                            }}>
                              {f.severity}
                            </span>
                            <span style={{ fontSize: '14px', fontWeight: 600 }}>
                              {f.type === 'n_plus_one' ? 'N+1 Query Heuristic Detected' : f.type === 'missing_index' ? 'Missing Index / Table Scan Candidate' : f.type}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              ({Math.round((f.confidence || 0.9) * 100)}% Confidence)
                            </span>
                          </div>

                          <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            Status: <strong style={{ textTransform: 'uppercase', color: f.status === 'open' ? 'var(--accent)' : 'var(--text-secondary)' }}>{f.status}</strong>
                          </span>
                        </div>

                        {/* Evidence Pre Block */}
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>EVIDENCE</div>
                          <pre style={{
                            padding: '8px 12px',
                            backgroundColor: 'var(--bg-main)',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            margin: 0,
                            overflow: 'auto'
                          }}>
                            {(() => {
                              try {
                                return JSON.stringify(JSON.parse(f.evidence_json), null, 2);
                              } catch {
                                return f.evidence_json || '{}';
                              }
                            })()}
                          </pre>
                        </div>

                        {/* Candidate Recommendations */}
                        {f.recommendations && f.recommendations.map((rec: any) => (
                          <div
                            key={rec.id}
                            style={{
                              padding: '12px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(88, 166, 255, 0.05)',
                              border: '1px solid rgba(88, 166, 255, 0.2)',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '10px'
                            }}
                          >
                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--accent)' }}>
                              PROPOSED SOLUTION ({rec.engine?.toUpperCase()})
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                              {rec.rationale}
                            </div>

                            {rec.proposed_sql && (
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>SUGGESTED SQL:</span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(rec.proposed_sql);
                                      alert('Copied SQL to clipboard!');
                                    }}
                                    style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '11px', cursor: 'pointer' }}
                                  >
                                    📋 Copy SQL
                                  </button>
                                </div>
                                <pre style={{
                                  padding: '8px',
                                  backgroundColor: 'var(--bg-main)',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-color)',
                                  fontSize: '11px',
                                  fontFamily: 'monospace',
                                  margin: 0
                                }}>
                                  {rec.proposed_sql}
                                </pre>
                              </div>
                            )}

                            {rec.proposed_code && (
                              <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>PHP / ELOQUENT REFACTOR:</span>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(rec.proposed_code);
                                      alert('Copied PHP refactor code to clipboard!');
                                    }}
                                    style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: '11px', cursor: 'pointer' }}
                                  >
                                    📋 Copy Code
                                  </button>
                                </div>
                                <pre style={{
                                  padding: '8px',
                                  backgroundColor: 'var(--bg-main)',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-color)',
                                  fontSize: '11px',
                                  fontFamily: 'monospace',
                                  margin: 0
                                }}>
                                  {rec.proposed_code}
                                </pre>
                              </div>
                            )}

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                Approval Status: <strong style={{ textTransform: 'uppercase' }}>{rec.approval_status}</strong>
                              </span>

                              <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                  onClick={() => handleUpdateRecStatus(rec.id, 'dismissed')}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '4px',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'transparent',
                                    color: 'var(--text-secondary)',
                                    fontSize: '11px',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Dismiss
                                </button>
                                <button
                                  onClick={() => handleUpdateRecStatus(rec.id, 'approved')}
                                  style={{
                                    padding: '4px 10px',
                                    borderRadius: '4px',
                                    backgroundColor: 'var(--success)',
                                    color: '#fff',
                                    border: 'none',
                                    fontSize: '11px',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                  }}
                                >
                                  ✔ Approve Recommendation
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Sub-Tab 3: Safe EXPLAIN Visualizer */}
              {dbSubTab === 'explain' && (
                <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '12px', overflow: 'hidden' }}>
                  {/* Query Input Card */}
                  <div style={{
                    padding: '14px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600 }}>SQL Execution Plan Inspector</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>DIALECT:</span>
                        <select
                          value={explainDriver}
                          onChange={(e) => setExplainDriver(e.target.value)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--bg-main)',
                            color: 'var(--text-primary)',
                            fontSize: '11px'
                          }}
                        >
                          <option value="mysql">MySQL</option>
                          <option value="postgres">PostgreSQL</option>
                          <option value="sqlite">SQLite</option>
                        </select>
                      </div>
                    </div>

                    <textarea
                      value={explainSqlInput}
                      onChange={(e) => setExplainSqlInput(e.target.value)}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-main)',
                        color: 'var(--text-primary)',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        resize: 'vertical'
                      }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        onClick={handleRunExplain}
                        disabled={explainLoading}
                        style={{
                          padding: '6px 14px',
                          backgroundColor: 'var(--accent)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {explainLoading ? 'Analyzing Plan...' : '🔍 Generate Safe EXPLAIN'}
                      </button>
                    </div>
                  </div>

                  {/* Explain Results Viewer */}
                  {explainResult && (
                    <div style={{
                      flex: 1,
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      {/* Metric Banner Cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                        <div style={{
                          padding: '12px',
                          borderRadius: '6px',
                          backgroundColor: explainResult.plan_type === 'ALL' ? 'rgba(248, 81, 73, 0.15)' : 'rgba(63, 185, 80, 0.15)',
                          border: `1px solid ${explainResult.plan_type === 'ALL' ? 'var(--danger)' : 'var(--success)'}`
                        }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>ACCESS TYPE</div>
                          <div style={{
                            fontSize: '18px',
                            fontWeight: 700,
                            color: explainResult.plan_type === 'ALL' ? 'var(--danger)' : 'var(--success)',
                            marginTop: '4px'
                          }}>
                            {explainResult.plan_type}
                          </div>
                        </div>

                        <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>ESTIMATED ROWS</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>
                            {explainResult.rows_examined?.toLocaleString()}
                          </div>
                        </div>

                        <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>KEY / INDEX USED</div>
                          <div style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 700, marginTop: '6px' }}>
                            {explainResult.key_used || 'NONE'}
                          </div>
                        </div>

                        <div style={{ padding: '12px', borderRadius: '6px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 600 }}>COST SCORE</div>
                          <div style={{ fontSize: '18px', fontWeight: 700, marginTop: '4px' }}>
                            {explainResult.cost?.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Warnings / Optimizations */}
                      {explainResult.warnings && explainResult.warnings.length > 0 && (
                        <div style={{
                          padding: '12px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(210, 153, 34, 0.1)',
                          border: '1px solid rgba(210, 153, 34, 0.3)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--warning, #d29922)' }}>
                            ⚠️ PERFORMANCE WARNINGS DETECTED
                          </div>
                          {explainResult.warnings.map((w: string, i: number) => (
                            <div key={i} style={{ fontSize: '12px', color: 'var(--text-primary)' }}>
                              • {w}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Raw Plan JSON */}
                      <div style={{
                        padding: '12px',
                        borderRadius: '6px',
                        backgroundColor: 'var(--bg-card)',
                        border: '1px solid var(--border-color)'
                      }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                          RAW EXPLAIN PLAN JSON
                        </div>
                        <pre style={{
                          padding: '10px',
                          backgroundColor: 'var(--bg-main)',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          margin: 0,
                          overflow: 'auto',
                          maxHeight: '160px'
                        }}>
                          {JSON.stringify(explainResult.plan_raw || {}, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Sub-Tab 4: Connection Manager */}
              {dbSubTab === 'connections' && (
                <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '12px', flex: 1, minHeight: 0 }}>
                  {/* Add Connection Form */}
                  <form
                    onSubmit={handleCreateDBConnection}
                    style={{
                      padding: '14px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Register Connection</div>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                      Read-only database connections for safe query plan introspection and schema audits.
                    </p>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        CONNECTION ALIAS
                      </label>
                      <input
                        type="text"
                        value={newDbConnName}
                        onChange={(e) => setNewDbConnName(e.target.value)}
                        placeholder="e.g. mysql_master"
                        style={{
                          width: '100%',
                          padding: '6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-main)',
                          color: 'var(--text-primary)',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        DRIVER
                      </label>
                      <select
                        value={newDbConnDriver}
                        onChange={(e) => setNewDbConnDriver(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-main)',
                          color: 'var(--text-primary)',
                          fontSize: '12px'
                        }}
                      >
                        <option value="mysql">MySQL</option>
                        <option value="postgres">PostgreSQL</option>
                        <option value="sqlite">SQLite</option>
                      </select>
                    </div>

                    <div style={{
                      padding: '6px 10px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(63, 185, 80, 0.1)',
                      border: '1px solid rgba(63, 185, 80, 0.2)',
                      fontSize: '11px',
                      color: 'var(--success)'
                    }}>
                      🔒 Enforced Read-Only Mode (Mutations Blocked)
                    </div>

                    <button
                      type="submit"
                      style={{
                        padding: '8px',
                        backgroundColor: 'var(--accent)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      ➕ Save Connection
                    </button>
                  </form>

                  {/* Connections List */}
                  <div style={{
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <div style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid var(--border-color)',
                      fontSize: '12px',
                      fontWeight: 600
                    }}>
                      CONFIGURED CONNECTIONS ({dbConnections.length})
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {dbConnections.length === 0 ? (
                        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                          No database connections configured yet.
                        </div>
                      ) : (
                        dbConnections.map((conn) => (
                          <div
                            key={conn.id}
                            style={{
                              padding: '10px 14px',
                              borderRadius: '6px',
                              backgroundColor: 'var(--bg-main)',
                              border: '1px solid var(--border-color)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '3px',
                                backgroundColor: 'var(--accent)',
                                color: '#fff',
                                textTransform: 'uppercase'
                              }}>
                                {conn.driver}
                              </span>
                              <span style={{ fontSize: '13px', fontWeight: 600 }}>{conn.name}</span>
                              <span style={{ fontSize: '11px', color: 'var(--success)' }}>✔ Read-Only</span>
                            </div>

                            <button
                              onClick={() => handleDeleteDBConnection(conn.id)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'var(--danger)',
                                fontSize: '12px',
                                cursor: 'pointer'
                              }}
                            >
                              Delete
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
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

          {activeTab === 'routes' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '16px', overflow: 'hidden' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Laravel Route Introspector (Module 12)</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Live catalog of all registered routes, middleware pipelines, and controller actions with one-click API Studio testing.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {laravelRoutes.length} route{laravelRoutes.length === 1 ? '' : 's'} registered
                  </span>
                  <button
                    onClick={handleLoadLaravelRoutes}
                    disabled={routesLoading}
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
                    {routesLoading ? 'Scanning...' : '🔄 Reload Routes'}
                  </button>
                </div>
              </div>

              {/* Search & Method Filter Bar */}
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={routeSearch}
                  onChange={(e) => setRouteSearch(e.target.value)}
                  placeholder="Filter routes by URI, controller name, or action (e.g. users, store, api)..."
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

                <div style={{ display: 'flex', gap: '4px' }}>
                  {['ALL', 'GET', 'POST', 'PUT', 'DELETE'].map((m) => (
                    <button
                      key={m}
                      onClick={() => setRouteMethodFilter(m)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: routeMethodFilter === m ? 'var(--accent)' : 'var(--bg-card)',
                        color: routeMethodFilter === m ? '#fff' : 'var(--text-secondary)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Routes Table */}
              <div style={{
                flex: 1,
                backgroundColor: 'var(--bg-card)',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                overflow: 'auto'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead style={{ backgroundColor: 'var(--bg-panel)', color: 'var(--text-secondary)', position: 'sticky', top: 0 }}>
                    <tr>
                      <th style={{ padding: '8px 12px' }}>Method</th>
                      <th style={{ padding: '8px 12px' }}>URI</th>
                      <th style={{ padding: '8px 12px' }}>Name</th>
                      <th style={{ padding: '8px 12px' }}>Action / Controller</th>
                      <th style={{ padding: '8px 12px' }}>Middleware</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const filtered = laravelRoutes.filter((r) => {
                        const matchesMethod = routeMethodFilter === 'ALL' || r.method.toUpperCase().includes(routeMethodFilter);
                        const q = routeSearch.toLowerCase();
                        const matchesQuery = !q ||
                          r.uri.toLowerCase().includes(q) ||
                          (r.name && r.name.toLowerCase().includes(q)) ||
                          r.action.toLowerCase().includes(q);
                        return matchesMethod && matchesQuery;
                      });

                      if (filtered.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                              {laravelRoutes.length === 0 ? 'No routes loaded. Click "Reload Routes" to introspect your Laravel application routes.' : 'No routes matching filter criteria.'}
                            </td>
                          </tr>
                        );
                      }

                      return filtered.map((r, idx) => {
                        const isGet = r.method.includes('GET');
                        const isPost = r.method.includes('POST');
                        const isPut = r.method.includes('PUT') || r.method.includes('PATCH');
                        const isDelete = r.method.includes('DELETE');

                        const methodBg = isGet ? 'rgba(63, 185, 80, 0.15)' :
                          isPost ? 'rgba(88, 166, 255, 0.15)' :
                          isPut ? 'rgba(227, 179, 65, 0.15)' :
                          isDelete ? 'rgba(248, 81, 73, 0.15)' : 'var(--bg-panel)';

                        const methodColor = isGet ? 'var(--success)' :
                          isPost ? 'var(--accent)' :
                          isPut ? 'var(--warning)' :
                          isDelete ? 'var(--danger)' : 'var(--text-primary)';

                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: 700,
                                backgroundColor: methodBg,
                                color: methodColor,
                              }}>
                                {r.method}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: 600 }}>
                              {r.uri}
                            </td>
                            <td style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '11px' }}>
                              {r.name || '—'}
                            </td>
                            <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: 'var(--text-primary)', fontSize: '11px' }}>
                              {r.action}
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                {(r.middleware || []).map((mw: string, i: number) => (
                                  <span key={i} style={{
                                    fontSize: '10px',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    backgroundColor: 'var(--bg-panel)',
                                    color: 'var(--text-secondary)'
                                  }}>
                                    {mw}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                              <button
                                onClick={() => handleTestRouteInApiStudio(r.method, r.uri)}
                                title="Open this endpoint in API Studio to test requests"
                                style={{
                                  padding: '4px 8px',
                                  backgroundColor: 'rgba(88, 166, 255, 0.15)',
                                  color: 'var(--accent)',
                                  border: '1px solid var(--accent)',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                ⚡ Test in API Studio
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
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
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '14px', overflow: 'hidden' }}>
              {/* Header and Receiver URL Bar */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Webhook Studio & Inbound Dispatcher (Module 22)</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Local loopback receiver, real-time payload inspector, HMAC SHA-256 signature verifier, and local replay executor.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={loadWebhookEvents}
                    disabled={webhookLoading}
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
                    {webhookLoading ? 'Refreshing...' : '🔄 Refresh Inbox'}
                  </button>
                </div>
              </div>

              {/* Endpoint Banner */}
              <div style={{
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', flex: 1 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '12px' }}>RECEIVER ENDPOINT:</span>
                  <code style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(0,0,0,0.2)',
                    color: 'var(--accent)',
                    fontFamily: 'monospace'
                  }}>
                    http://127.0.0.1:8765/wh/{webhookReceiverId}
                  </code>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    value={webhookReceiverId}
                    onChange={(e) => setWebhookReceiverId(e.target.value)}
                    placeholder="receiver-id"
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'var(--bg-main)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      width: '130px'
                    }}
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`http://127.0.0.1:8765/wh/${webhookReceiverId}`);
                      alert('Copied receiver URL to clipboard!');
                    }}
                    style={{
                      padding: '5px 10px',
                      backgroundColor: 'var(--accent)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    📋 Copy URL
                  </button>
                </div>
              </div>

              {/* 3-Column Studio Workspace */}
              <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 340px', gap: '12px', flex: 1, minHeight: 0 }}>
                {/* Panel 1: Inbound Webhook Inbox */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    padding: '10px 12px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px',
                    fontWeight: 600
                  }}>
                    <span>INBOUND INBOX ({webhookEvents.length})</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Loopback Log</span>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {webhookEvents.length === 0 ? (
                      <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                        No webhooks received yet.<br />
                        Send an event or use the Simulator to test inbound handling.
                      </div>
                    ) : (
                      webhookEvents.map((evt) => {
                        const isSelected = selectedWebhook?.id === evt.id;
                        const providerBadgeColor =
                          evt.provider === 'stripe' ? '#635BFF' :
                          evt.provider === 'github' ? '#2DA44E' :
                          evt.provider === 'shopify' ? '#96BF48' : 'var(--text-secondary)';

                        return (
                          <div
                            key={evt.id}
                            onClick={() => setSelectedWebhook(evt)}
                            style={{
                              padding: '10px',
                              borderRadius: '6px',
                              border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border-color)'}`,
                              backgroundColor: isSelected ? 'rgba(88, 166, 255, 0.08)' : 'var(--bg-main)',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  backgroundColor: providerBadgeColor,
                                  color: '#fff',
                                  textTransform: 'uppercase'
                                }}>
                                  {evt.provider || 'GENERIC'}
                                </span>
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: 600,
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  backgroundColor: evt.signature_status === 'signed' ? 'rgba(63, 185, 80, 0.2)' : 'rgba(210, 153, 34, 0.2)',
                                  color: evt.signature_status === 'signed' ? 'var(--success)' : 'var(--warning, #d29922)'
                                }}>
                                  {evt.signature_status === 'signed' ? 'SIGNED' : 'UNSIGNED'}
                                </span>
                              </div>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {new Date(evt.received_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </div>

                            <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', wordBreak: 'break-all' }}>
                              {evt.event_type || evt.path}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)' }}>
                              <span>{evt.method} /wh/{evt.receiver_id}</span>
                              <span title={`SHA-256: ${evt.body_sha256}`}>
                                {evt.body ? `${evt.body.length} bytes` : '0 bytes'}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Panel 2: Selected Webhook Detail & Replay */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden'
                }}>
                  {selectedWebhook ? (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
                      {/* Event Detail Header */}
                      <div style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid var(--border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600 }}>
                              {selectedWebhook.event_type ? `${selectedWebhook.provider}: ${selectedWebhook.event_type}` : selectedWebhook.path}
                            </span>
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(255,255,255,0.06)',
                              color: 'var(--text-secondary)'
                            }}>
                              ID: {selectedWebhook.id?.substring(0, 8)}...
                            </span>
                          </div>

                          <button
                            onClick={() => handleLoadIntoVerifier(selectedWebhook)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              border: '1px solid var(--accent)',
                              backgroundColor: 'transparent',
                              color: 'var(--accent)',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            🔍 Load into Verifier
                          </button>
                        </div>

                        {/* Replay Controller Bar */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          paddingTop: '6px',
                          borderTop: '1px solid rgba(255,255,255,0.05)'
                        }}>
                          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>REPLAY TARGET:</span>
                          <input
                            type="text"
                            value={replayTargetUrl}
                            onChange={(e) => setReplayTargetUrl(e.target.value)}
                            placeholder="http://127.0.0.1:8000/api/webhooks"
                            style={{
                              flex: 1,
                              padding: '4px 8px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: 'var(--bg-main)',
                              color: 'var(--text-primary)',
                              fontSize: '12px'
                            }}
                          />
                          <button
                            onClick={() => handleReplayWebhook(selectedWebhook)}
                            disabled={replaying}
                            style={{
                              padding: '5px 12px',
                              backgroundColor: 'var(--accent)',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            {replaying ? 'Replaying...' : '▶ Replay Webhook'}
                          </button>
                        </div>

                        {replayStatus && (
                          <div style={{
                            fontSize: '11px',
                            color: replayStatus.includes('failed') ? 'var(--danger)' : 'var(--success)',
                            fontWeight: 600,
                            padding: '4px 8px',
                            backgroundColor: 'rgba(0,0,0,0.2)',
                            borderRadius: '4px'
                          }}>
                            {replayStatus}
                          </div>
                        )}
                      </div>

                      {/* Inspectors (Headers & Body) */}
                      <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {/* Headers Inspector */}
                        <div>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                            HTTP HEADERS
                          </div>
                          <pre style={{
                            padding: '10px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg-main)',
                            border: '1px solid var(--border-color)',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            margin: 0,
                            overflow: 'auto',
                            maxHeight: '140px'
                          }}>
                            {(() => {
                              try {
                                return JSON.stringify(JSON.parse(selectedWebhook.headers_json), null, 2);
                              } catch {
                                return selectedWebhook.headers_json || '{}';
                              }
                            })()}
                          </pre>
                        </div>

                        {/* Body Payload Inspector */}
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              PAYLOAD BODY
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                              SHA-256: {selectedWebhook.body_sha256?.substring(0, 16)}...
                            </span>
                          </div>
                          <pre style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg-main)',
                            border: '1px solid var(--border-color)',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            margin: 0,
                            overflow: 'auto',
                            minHeight: '180px'
                          }}>
                            {(() => {
                              try {
                                return JSON.stringify(JSON.parse(selectedWebhook.body), null, 2);
                              } catch {
                                return selectedWebhook.body || '(Empty Body)';
                              }
                            })()}
                          </pre>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '100%',
                      color: 'var(--text-secondary)',
                      fontSize: '13px'
                    }}>
                      Select an incoming webhook from the inbox to inspect its headers and payload.
                    </div>
                  )}
                </div>

                {/* Panel 3: Simulator & HMAC Signature Diagnostics */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
                  {/* Simulator Box */}
                  <div style={{
                    padding: '12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Webhook Simulator (WH-007)</div>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                      Generate valid HMAC-signed webhook payloads and dispatch to loopback receiver.
                    </p>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        PROVIDER PRESET
                      </label>
                      <select
                        value={simProvider}
                        onChange={(e) => setSimProvider(e.target.value as any)}
                        style={{
                          width: '100%',
                          padding: '6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-main)',
                          color: 'var(--text-primary)',
                          fontSize: '12px'
                        }}
                      >
                        <option value="stripe">Stripe (payment_intent.succeeded)</option>
                        <option value="github">GitHub (push event)</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        SIGNING SECRET KEY
                      </label>
                      <input
                        type="text"
                        value={simSecret}
                        onChange={(e) => setSimSecret(e.target.value)}
                        placeholder="whsec_..."
                        style={{
                          width: '100%',
                          padding: '6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-main)',
                          color: 'var(--text-primary)',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <button
                      onClick={handleSimulateWebhook}
                      disabled={simulating}
                      style={{
                        padding: '8px',
                        backgroundColor: 'var(--accent)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {simulating ? 'Dispatching...' : '🚀 Dispatch to Receiver'}
                    </button>
                  </div>

                  {/* HMAC Signature Verifier Box */}
                  <div style={{
                    padding: '12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>HMAC SHA-256 Verifier</div>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                      Verify incoming signature integrity against shared secrets with constant-time comparison.
                    </p>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        SHARED SECRET
                      </label>
                      <input
                        type="text"
                        value={verifySecret}
                        onChange={(e) => setVerifySecret(e.target.value)}
                        placeholder="whsec_..."
                        style={{
                          width: '100%',
                          padding: '6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-main)',
                          color: 'var(--text-primary)',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        SIGNATURE HEADER / HASH
                      </label>
                      <input
                        type="text"
                        value={verifySignature}
                        onChange={(e) => setVerifySignature(e.target.value)}
                        placeholder="t=...,v1=... or sha256=..."
                        style={{
                          width: '100%',
                          padding: '6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-main)',
                          color: 'var(--text-primary)',
                          fontSize: '11px',
                          fontFamily: 'monospace'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        RAW PAYLOAD
                      </label>
                      <textarea
                        value={verifyPayload}
                        onChange={(e) => setVerifyPayload(e.target.value)}
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-main)',
                          color: 'var(--text-primary)',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          resize: 'vertical'
                        }}
                      />
                    </div>

                    <button
                      onClick={handleVerifySignature}
                      disabled={verifying}
                      style={{
                        padding: '8px',
                        backgroundColor: 'var(--bg-card)',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {verifying ? 'Verifying...' : '🔐 Check Signature'}
                    </button>

                    {verifyResult !== null && (
                      <div style={{
                        padding: '8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 700,
                        textAlign: 'center',
                        backgroundColor: verifyResult.valid ? 'rgba(63, 185, 80, 0.15)' : 'rgba(248, 81, 73, 0.15)',
                        color: verifyResult.valid ? 'var(--success)' : 'var(--danger)',
                        border: `1px solid ${verifyResult.valid ? 'var(--success)' : 'var(--danger)'}`
                      }}>
                        {verifyResult.valid ? '✔ VALID SIGNATURE (MATCH)' : '✖ INVALID SIGNATURE (MISMATCH)'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'jsdebug' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '14px', overflow: 'hidden' }}>
              {/* Header and Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600 }}>JavaScript & Frontend Debug Studio (Module 23)</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Browser CDP & Node.js session tracking, console telemetry, frontend exceptions, and W3C trace correlation to backend PHP spans.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => setShowSnippetModal(!showSnippetModal)}
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
                    📋 Browser SDK Snippet
                  </button>
                  <button
                    onClick={() => {
                      loadJsSessions();
                      loadJsEvents();
                    }}
                    disabled={jsLoading}
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
                    {jsLoading ? 'Refreshing...' : '🔄 Refresh'}
                  </button>
                  <button
                    onClick={handleCreateJsSession}
                    style={{
                      padding: '6px 12px',
                      backgroundColor: 'var(--accent)',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    ➕ Connect Browser Session
                  </button>
                </div>
              </div>

              {/* Snippet Banner (Expandable) */}
              {showSnippetModal && (
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600 }}>
                      ⚡ Client Telemetry Bridge (Auto-instrument fetch & window.onerror to correlate with Laravel)
                    </span>
                    <button
                      onClick={() => setShowSnippetModal(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px' }}
                    >
                      ✕
                    </button>
                  </div>
                  <pre style={{
                    padding: '10px',
                    backgroundColor: 'var(--bg-main)',
                    borderRadius: '4px',
                    border: '1px solid var(--border-color)',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                    margin: 0,
                    overflow: 'auto',
                    maxHeight: '120px'
                  }}>
{`// Add to index.html or frontend entrypoint:
window.__DS_SESSION = '${selectedJsSessionId || 'default-session'}';
window.addEventListener('error', (e) => {
  fetch('http://127.0.0.1:8765/v1/jsdebug/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: window.__DS_SESSION, severity: 'error', message_redacted: e.message, source_url: e.filename, line: e.lineno, column: e.colno })
  });
});`}
                  </pre>
                </div>
              )}

              {/* Sessions Bar */}
              <div style={{
                padding: '10px 14px',
                borderRadius: '6px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '10px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)', fontSize: '12px' }}>ACTIVE SESSION:</span>
                  {jsSessions.length === 0 ? (
                    <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>No active sessions. Click "Connect Browser Session" to attach.</span>
                  ) : (
                    <select
                      value={selectedJsSessionId}
                      onChange={(e) => {
                        setSelectedJsSessionId(e.target.value);
                        loadJsEvents(e.target.value);
                      }}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'var(--bg-main)',
                        color: 'var(--text-primary)',
                        fontSize: '12px'
                      }}
                    >
                      {jsSessions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.browser_name || s.runtime} ({s.connection_state}) — ID: {s.id.substring(0, 8)}...
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {selectedJsSessionId && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: 700,
                      backgroundColor: 'rgba(63, 185, 80, 0.15)',
                      color: 'var(--success)'
                    }}>
                      CONNECTED
                    </span>
                    <button
                      onClick={() => handleCloseJsSession(selectedJsSessionId)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        border: '1px solid var(--border-color)',
                        backgroundColor: 'transparent',
                        color: 'var(--danger)',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                    >
                      Disconnect
                    </button>
                  </div>
                )}
              </div>

              {/* Main 2-Column Split Workspace */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px', flex: 1, minHeight: 0 }}>
                {/* Left Panel: Console Event Stream */}
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  overflow: 'hidden'
                }}>
                  {/* Filter Toolbar */}
                  <div style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '8px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {['ALL', 'ERROR', 'WARN', 'INFO', 'LOG'].map((lvl) => (
                        <button
                          key={lvl}
                          onClick={() => setJsSeverityFilter(lvl)}
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: jsSeverityFilter === lvl ? 'var(--accent)' : 'var(--bg-main)',
                            color: jsSeverityFilter === lvl ? '#fff' : 'var(--text-secondary)',
                            fontSize: '11px',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          {lvl}
                        </button>
                      ))}
                    </div>

                    <div style={{ display: 'flex', gap: '6px', flex: 1, justifyContent: 'flex-end' }}>
                      <input
                        type="text"
                        value={jsSearchText}
                        onChange={(e) => setJsSearchText(e.target.value)}
                        placeholder="Search message..."
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-main)',
                          color: 'var(--text-primary)',
                          fontSize: '11px',
                          width: '130px'
                        }}
                      />
                      <input
                        type="text"
                        value={jsTraceIdFilter}
                        onChange={(e) => {
                          setJsTraceIdFilter(e.target.value);
                          loadJsEvents(selectedJsSessionId, e.target.value);
                        }}
                        placeholder="Filter by Trace ID..."
                        style={{
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-main)',
                          color: 'var(--text-primary)',
                          fontSize: '11px',
                          width: '130px'
                        }}
                      />
                    </div>
                  </div>

                  {/* Events Stream List */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(() => {
                      const filtered = jsConsoleEvents.filter((evt) => {
                        if (jsSeverityFilter !== 'ALL' && evt.severity.toUpperCase() !== jsSeverityFilter) {
                          return false;
                        }
                        if (jsSearchText && !evt.message_redacted.toLowerCase().includes(jsSearchText.toLowerCase())) {
                          return false;
                        }
                        return true;
                      });

                      if (filtered.length === 0) {
                        return (
                          <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                            No console events matching filter.<br />
                            Use the Test Emitter on the right or run frontend actions to stream logs.
                          </div>
                        );
                      }

                      return filtered.map((evt) => {
                        const isSelected = selectedJsEvent?.id === evt.id;
                        const sev = (evt.severity || 'info').toLowerCase();
                        const badgeColor =
                          sev === 'error' ? 'var(--danger)' :
                          sev === 'warn' ? 'var(--warning, #d29922)' :
                          sev === 'info' ? 'var(--accent)' : 'var(--text-secondary)';

                        return (
                          <div
                            key={evt.id}
                            onClick={() => setSelectedJsEvent(evt)}
                            style={{
                              padding: '10px 12px',
                              borderRadius: '6px',
                              border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border-color)'}`,
                              backgroundColor: isSelected ? 'rgba(88, 166, 255, 0.08)' : 'var(--bg-main)',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '6px'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  backgroundColor: badgeColor,
                                  color: '#fff',
                                  textTransform: 'uppercase'
                                }}>
                                  {evt.severity}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                                  {evt.source_url ? `${evt.source_url.split('/').pop()}:${evt.line || 0}` : 'console'}
                                </span>
                              </div>

                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                {new Date(evt.occurred_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                            </div>

                            <div style={{
                              fontSize: '12px',
                              fontFamily: 'monospace',
                              color: 'var(--text-primary)',
                              wordBreak: 'break-word',
                              whiteSpace: 'pre-wrap'
                            }}>
                              {evt.message_redacted}
                            </div>

                            {evt.trace_id && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                                <span style={{
                                  fontSize: '10px',
                                  padding: '2px 6px',
                                  borderRadius: '4px',
                                  backgroundColor: 'rgba(88, 166, 255, 0.15)',
                                  color: 'var(--accent)',
                                  fontWeight: 600
                                }}>
                                  🔗 Trace: {evt.trace_id.substring(0, 12)}...
                                </span>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTab('traces');
                                  }}
                                  style={{
                                    background: 'none',
                                    border: 'none',
                                    color: 'var(--accent)',
                                    fontSize: '10px',
                                    textDecoration: 'underline',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Open in Waterfall →
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                {/* Right Panel: Event Inspector & Simulator */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
                  {/* Selected Event Detail */}
                  <div style={{
                    padding: '12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Event Inspector</div>

                    {selectedJsEvent ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Severity:</span>
                          <span style={{ fontWeight: 600, textTransform: 'uppercase' }}>{selectedJsEvent.severity}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Occurred:</span>
                          <span>{new Date(selectedJsEvent.occurred_at).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Source Location:</span>
                          <span style={{ fontFamily: 'monospace', fontSize: '11px' }}>
                            {selectedJsEvent.source_url || 'inline'}:{selectedJsEvent.line}:{selectedJsEvent.column}
                          </span>
                        </div>

                        {/* Full-Stack Trace Correlation Card */}
                        <div style={{
                          padding: '8px 10px',
                          borderRadius: '4px',
                          backgroundColor: selectedJsEvent.trace_id ? 'rgba(88, 166, 255, 0.1)' : 'rgba(255,255,255,0.03)',
                          border: `1px solid ${selectedJsEvent.trace_id ? 'rgba(88, 166, 255, 0.3)' : 'var(--border-color)'}`,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: selectedJsEvent.trace_id ? 'var(--accent)' : 'var(--text-secondary)' }}>
                            {selectedJsEvent.trace_id ? '⚡ FULL-STACK CORRELATION (W3C TRACEPARENT)' : 'NO BACKEND TRACE LINKED'}
                          </div>
                          {selectedJsEvent.trace_id ? (
                            <>
                              <div style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                                {selectedJsEvent.trace_id}
                              </div>
                              <button
                                onClick={() => setActiveTab('traces')}
                                style={{
                                  padding: '5px 8px',
                                  backgroundColor: 'var(--accent)',
                                  color: '#fff',
                                  border: 'none',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                🌊 Open Correlated PHP Backend Trace
                              </button>
                            </>
                          ) : (
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              Attach <code>traceparent</code> header to frontend fetch calls to automatically view backend SQL and spans.
                            </span>
                          )}
                        </div>

                        {/* Stack Trace */}
                        <div>
                          <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            CALL STACK
                          </div>
                          <pre style={{
                            padding: '8px',
                            backgroundColor: 'var(--bg-main)',
                            borderRadius: '4px',
                            border: '1px solid var(--border-color)',
                            fontSize: '11px',
                            fontFamily: 'monospace',
                            margin: 0,
                            overflow: 'auto',
                            maxHeight: '140px'
                          }}>
                            {(() => {
                              try {
                                const parsed = JSON.parse(selectedJsEvent.stack_json);
                                if (Array.isArray(parsed) && parsed.length > 0) {
                                  return parsed.map((f: any, i: number) => ` #${i} ${f.function || 'anonymous'} (${f.file || 'app.js'}:${f.line}:${f.col})`).join('\n');
                                }
                              } catch {
                                // ignore
                              }
                              return selectedJsEvent.stack_json || '(No call stack recorded)';
                            })()}
                          </pre>
                        </div>
                      </div>
                    ) : (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px', textAlign: 'center', padding: '16px' }}>
                        Select a console event from the stream to inspect details and stack trace.
                      </div>
                    )}
                  </div>

                  {/* Test Event Simulator Box */}
                  <div style={{
                    padding: '12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Emit Test Frontend Event</div>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                      Simulate client-side errors and test end-to-end trace correlation with backend traces.
                    </p>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        SEVERITY
                      </label>
                      <select
                        value={testEventSeverity}
                        onChange={(e) => setTestEventSeverity(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-main)',
                          color: 'var(--text-primary)',
                          fontSize: '12px'
                        }}
                      >
                        <option value="error">error</option>
                        <option value="warn">warn</option>
                        <option value="info">info</option>
                        <option value="log">log</option>
                      </select>
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        OPTIONAL CORRELATED TRACE ID
                      </label>
                      <input
                        type="text"
                        value={testEventTraceId}
                        onChange={(e) => setTestEventTraceId(e.target.value)}
                        placeholder="e.g. 4bf92f3577b34da6a3ce929d0e0e4736"
                        style={{
                          width: '100%',
                          padding: '6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-main)',
                          color: 'var(--text-primary)',
                          fontSize: '11px',
                          fontFamily: 'monospace'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        MESSAGE
                      </label>
                      <textarea
                        value={testEventMessage}
                        onChange={(e) => setTestEventMessage(e.target.value)}
                        rows={2}
                        style={{
                          width: '100%',
                          padding: '6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-main)',
                          color: 'var(--text-primary)',
                          fontSize: '11px',
                          fontFamily: 'monospace',
                          resize: 'vertical'
                        }}
                      />
                    </div>

                    <button
                      onClick={handleEmitTestJsEvent}
                      disabled={testEventLoading}
                      style={{
                        padding: '8px',
                        backgroundColor: 'var(--accent)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {testEventLoading ? 'Emitting...' : '🚀 Emit to JS Stream'}
                    </button>
                  </div>
                </div>
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
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: '14px', overflow: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600 }}>Multi-Project Workspaces & Architecture (Module 25)</h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    Register projects, organize multi-repo workspaces, manage runtime environments, and configure independent PHP versions (7.4 through 8.4).
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => {
                      loadProjects();
                      loadWorkspaces();
                      loadProjectEnvironments();
                    }}
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
                    🔄 Refresh Workspaces
                  </button>
                </div>
              </div>

              {/* Sub-Navigation Tabs */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>
                {[
                  { id: 'projects', label: `📁 Projects (${projects.length})` },
                  { id: 'workspaces', label: `🗂️ Workspaces (${workspaces.length})` },
                  { id: 'environments', label: `🌐 Environments (${projectEnvironments.length})` },
                  { id: 'retention', label: '🗑️ Data Retention & Purge' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setProjectSubTab(t.id as any)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: '6px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: projectSubTab === t.id ? 'var(--accent)' : 'var(--bg-card)',
                      color: projectSubTab === t.id ? '#fff' : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Sub-Tab 1: Projects Management */}
              {projectSubTab === 'projects' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Workspace Filter Bar */}
                  {workspaces.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>WORKSPACE FILTER:</span>
                      <button
                        onClick={() => setSelectedWorkspaceFilter('all')}
                        style={{
                          padding: '4px 10px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: selectedWorkspaceFilter === 'all' ? 'var(--accent)' : 'var(--bg-card)',
                          color: selectedWorkspaceFilter === 'all' ? '#fff' : 'var(--text-secondary)',
                          fontSize: '11px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        All ({projects.length})
                      </button>
                      {workspaces.map((ws) => {
                        const count = projects.filter((p) => p.workspace_id === ws.id).length;
                        return (
                          <button
                            key={ws.id}
                            onClick={() => setSelectedWorkspaceFilter(ws.id)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-color)',
                              backgroundColor: selectedWorkspaceFilter === ws.id ? 'var(--accent)' : 'var(--bg-card)',
                              color: selectedWorkspaceFilter === ws.id ? '#fff' : 'var(--text-secondary)',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer'
                            }}
                          >
                            {ws.name} ({count})
                          </button>
                        );
                      })}
                    </div>
                  )}

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

                  {/* Projects List */}
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
                      projects
                        .filter((p) => selectedWorkspaceFilter === 'all' || p.workspace_id === selectedWorkspaceFilter)
                        .map((p) => (
                          <div key={p.id} style={{
                            padding: '14px 16px',
                            borderBottom: '1px solid var(--border-color)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: '12px'
                          }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{ fontWeight: 600, fontSize: '14px' }}>{p.name}</span>
                                <span style={{
                                  fontSize: '10px',
                                  fontWeight: 700,
                                  padding: '2px 6px',
                                  borderRadius: '3px',
                                  backgroundColor: 'rgba(88, 166, 255, 0.15)',
                                  color: 'var(--accent)',
                                  textTransform: 'uppercase'
                                }}>
                                  {p.framework || 'PHP'}
                                </span>
                              </div>
                              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px', fontFamily: 'monospace' }}>
                                {p.root_path}
                              </div>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                              {/* Workspace assignment */}
                              {workspaces.length > 0 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Workspace:</span>
                                  <select
                                    value={p.workspace_id || ''}
                                    onChange={(e) => handleAssignWorkspace(e.target.value, p.id)}
                                    style={{
                                      padding: '4px 8px',
                                      backgroundColor: 'var(--bg-panel)',
                                      color: 'var(--text-primary)',
                                      border: '1px solid var(--border-color)',
                                      borderRadius: '4px',
                                      fontSize: '11px'
                                    }}
                                  >
                                    <option value="">(None / Default)</option>
                                    {workspaces.map((ws) => (
                                      <option key={ws.id} value={ws.id}>{ws.name}</option>
                                    ))}
                                  </select>
                                </div>
                              )}

                              {/* Interactive PHP Version Selector */}
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

                              <button
                                onClick={() => {
                                  setSelectedProjectId(p.id);
                                  setProjectSubTab('environments');
                                  loadProjectEnvironments(p.id);
                                }}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-color)',
                                  backgroundColor: 'transparent',
                                  color: 'var(--text-primary)',
                                  fontSize: '11px',
                                  cursor: 'pointer'
                                }}
                              >
                                🌐 Envs
                              </button>

                              <button
                                onClick={() => handleDeleteProject(p.id)}
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '4px',
                                  border: '1px solid var(--border-color)',
                                  backgroundColor: 'transparent',
                                  color: 'var(--danger)',
                                  fontSize: '11px',
                                  cursor: 'pointer'
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              )}

              {/* Sub-Tab 2: Workspaces Management */}
              {projectSubTab === 'workspaces' && (
                <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '12px' }}>
                  {/* Create Workspace Form */}
                  <form
                    onSubmit={handleCreateWorkspace}
                    style={{
                      padding: '14px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Create Workspace</div>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                      Group microservices, frontend repos, and backend APIs into unified debug workspaces.
                    </p>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        WORKSPACE NAME
                      </label>
                      <input
                        type="text"
                        value={newWorkspaceName}
                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                        placeholder="e.g. Care Vision Suite"
                        required
                        style={{
                          width: '100%',
                          padding: '6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-main)',
                          color: 'var(--text-primary)',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        DESCRIPTION
                      </label>
                      <input
                        type="text"
                        value={newWorkspaceDesc}
                        onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                        placeholder="e.g. Monorepo backend & services"
                        style={{
                          width: '100%',
                          padding: '6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-main)',
                          color: 'var(--text-primary)',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <button
                      type="submit"
                      style={{
                        padding: '8px',
                        backgroundColor: 'var(--accent)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      ➕ Create Workspace
                    </button>
                  </form>

                  {/* Workspaces List */}
                  <div style={{
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <div style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid var(--border-color)',
                      fontSize: '12px',
                      fontWeight: 600
                    }}>
                      REGISTERED WORKSPACES ({workspaces.length})
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {workspaces.length === 0 ? (
                        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '12px' }}>
                          No workspaces created yet. Use the form to group your projects.
                        </div>
                      ) : (
                        workspaces.map((ws) => {
                          const assignedProjects = projects.filter((p) => p.workspace_id === ws.id);
                          return (
                            <div
                              key={ws.id}
                              style={{
                                padding: '12px 14px',
                                borderRadius: '6px',
                                backgroundColor: 'var(--bg-main)',
                                border: '1px solid var(--border-color)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '13px', fontWeight: 600 }}>{ws.name}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                                  {ws.description || 'No description'} • {assignedProjects.length} project(s) assigned
                                </div>
                              </div>

                              <button
                                onClick={() => handleDeleteWorkspace(ws.id)}
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--danger)',
                                  fontSize: '12px',
                                  cursor: 'pointer'
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-Tab 3: Environments Management */}
              {projectSubTab === 'environments' && (
                <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '12px' }}>
                  {/* Create Environment Form */}
                  <form
                    onSubmit={handleCreateEnvironment}
                    style={{
                      padding: '14px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--bg-card)',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Add Environment</div>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', margin: 0 }}>
                      Configure isolation environments (local, staging, testing) and sampling rates for <strong>{activeProject?.name || 'Selected Project'}</strong>.
                    </p>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        ENVIRONMENT NAME
                      </label>
                      <input
                        type="text"
                        value={newEnvName}
                        onChange={(e) => setNewEnvName(e.target.value)}
                        placeholder="e.g. local, docker-dev, staging"
                        required
                        style={{
                          width: '100%',
                          padding: '6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-main)',
                          color: 'var(--text-primary)',
                          fontSize: '12px'
                        }}
                      />
                    </div>

                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        KIND
                      </label>
                      <select
                        value={newEnvKind}
                        onChange={(e) => setNewEnvKind(e.target.value as any)}
                        style={{
                          width: '100%',
                          padding: '6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-main)',
                          color: 'var(--text-primary)',
                          fontSize: '12px'
                        }}
                      >
                        <option value="local">Local</option>
                        <option value="staging">Staging</option>
                        <option value="production">Production (Sanitized)</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="checkbox"
                        id="isProdToggle"
                        checked={newEnvIsProd}
                        onChange={(e) => setNewEnvIsProd(e.target.checked)}
                      />
                      <label htmlFor="isProdToggle" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        Mark as Production (Enforces strict data redaction)
                      </label>
                    </div>

                    <button
                      type="submit"
                      style={{
                        padding: '8px',
                        backgroundColor: 'var(--accent)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      ➕ Add Environment
                    </button>
                  </form>

                  {/* Environments List */}
                  <div style={{
                    backgroundColor: 'var(--bg-card)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column'
                  }}>
                    <div style={{
                      padding: '10px 14px',
                      borderBottom: '1px solid var(--border-color)',
                      fontSize: '12px',
                      fontWeight: 600
                    }}>
                      ENVIRONMENTS FOR {activeProject?.name?.toUpperCase() || 'PROJECT'} ({projectEnvironments.length})
                    </div>

                    <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {projectEnvironments.length === 0 ? (
                        <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                          No specific environments configured yet. Default local environment is active.
                        </div>
                      ) : (
                        projectEnvironments.map((env) => (
                          <div
                            key={env.id}
                            style={{
                              padding: '12px 14px',
                              borderRadius: '6px',
                              backgroundColor: 'var(--bg-main)',
                              border: '1px solid var(--border-color)',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{
                                fontSize: '10px',
                                fontWeight: 700,
                                padding: '2px 6px',
                                borderRadius: '3px',
                                backgroundColor: env.is_production ? 'var(--danger)' : 'var(--accent)',
                                color: '#fff',
                                textTransform: 'uppercase'
                              }}>
                                {env.kind}
                              </span>
                              <span style={{ fontSize: '13px', fontWeight: 600 }}>{env.name}</span>
                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                                Sampling: {Math.round((env.sampling_rate || 1.0) * 100)}% • TTL: {env.retention_days || 7}d
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-Tab 4: Data Retention & Local Storage Purge (Module 21 & NFR-06) */}
              {projectSubTab === 'retention' && (
                <div style={{
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '16px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: 600 }}>🗑️ Data Retention & Storage Purge (NFR-06)</h3>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Clean up local SQLite database storage by safely purging historical traces, queries, and log records.
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <select
                        value={purgeDays}
                        onChange={(e) => setPurgeDays(Number(e.target.value))}
                        style={{
                          padding: '6px 10px',
                          backgroundColor: 'var(--bg-panel)',
                          color: 'var(--text-primary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
                      >
                        <option value={1}>Older than 1 day</option>
                        <option value={7}>Older than 7 days</option>
                        <option value={14}>Older than 14 days</option>
                        <option value={30}>Older than 30 days</option>
                      </select>

                      <button
                        onClick={handlePurgeTelemetry}
                        disabled={purgeLoading}
                        style={{
                          padding: '6px 14px',
                          backgroundColor: 'rgba(248, 81, 73, 0.15)',
                          color: 'var(--danger)',
                          border: '1px solid var(--danger)',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {purgeLoading ? 'Purging...' : 'Purge Old Telemetry'}
                      </button>
                    </div>
                  </div>

                  {purgeResult && (
                    <div style={{
                      fontSize: '12px',
                      padding: '8px 12px',
                      backgroundColor: 'var(--bg-panel)',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      display: 'flex',
                      gap: '16px',
                      color: 'var(--success)'
                    }}>
                      <span>✔ Deleted Traces: {purgeResult.deleted_traces || 0}</span>
                      <span>✔ Deleted Queries: {purgeResult.deleted_queries || 0}</span>
                      <span>✔ Deleted Logs: {purgeResult.deleted_logs || 0}</span>
                    </div>
                  )}
                </div>
              )}
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
