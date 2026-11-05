const BASE_URL = 'http://127.0.0.1:8765/v1';

export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.error?.message || `HTTP ${res.status}: ${res.statusText}`);
  }

  const json = await res.json();
  return json.data as T;
}

export const api = {
  getHealth: () => request<{ status: string; version: string; dbgp_port: number }>('/health'),
  getProjects: () => request<any[]>('/projects'),
  createProject: (data: any) => request<any>('/projects', { method: 'POST', body: JSON.stringify(data) }),
  executeRequest: (data: any) => request<any>('/requests/execute', { method: 'POST', body: JSON.stringify(data) }),
  getTraces: (projectId?: string) => request<any[]>(`/traces${projectId ? `?project_id=${projectId}` : ''}`),
  getTraceDetail: (traceId: string) => request<any>(`/traces/${traceId}`),
  getDebugSessions: () => request<any[]>('/debug/sessions'),
  getPhpRuntimes: () => request<Array<{ version: string; binary_path: string; is_default: boolean }>>('/runtimes/php'),
  updateProjectPhp: (projectId: string, phpVersion: string, phpBinaryPath?: string) =>
    request<any>(`/projects/${projectId}/php`, {
      method: 'PATCH',
      body: JSON.stringify({ php_version: phpVersion, php_binary_path: phpBinaryPath || '' }),
    }),
  getSQLAnalytics: (projectId?: string) =>
    request<any[]>(`/sql/analytics${projectId ? `?project_id=${projectId}` : ''}`),
  getLogs: (projectId?: string) =>
    request<any[]>(`/logs${projectId ? `?project_id=${projectId}` : ''}`),
  runTests: (data: { project_path: string; php_binary_path?: string; runner?: string; filter?: string }) =>
    request<any>('/tests/runs', { method: 'POST', body: JSON.stringify(data) }),
  runArtisan: (data: { project_path: string; command: string; args?: string[]; force_destructive?: boolean; php_binary_path?: string }) =>
    request<any>('/artisan/run', { method: 'POST', body: JSON.stringify(data) }),
  getBreakpoints: (projectId?: string) =>
    request<any[]>(`/debug/breakpoints${projectId ? `?project_id=${projectId}` : ''}`),
  createBreakpoint: (data: { project_id: string; file_uri: string; line_number: number; type?: string; condition?: string; enabled?: boolean }) =>
    request<any>('/debug/breakpoints', { method: 'POST', body: JSON.stringify(data) }),
  deleteBreakpoint: (id: string) =>
    request<any>(`/debug/breakpoints/${id}`, { method: 'DELETE' }),
  stepInto: (sessionId: string) =>
    request<any>(`/debug/sessions/${sessionId}/step_into`, { method: 'POST' }),
  stepOver: (sessionId: string) =>
    request<any>(`/debug/sessions/${sessionId}/step_over`, { method: 'POST' }),
  stepOut: (sessionId: string) =>
    request<any>(`/debug/sessions/${sessionId}/step_out`, { method: 'POST' }),
  continueDebug: (sessionId: string) =>
    request<any>(`/debug/sessions/${sessionId}/continue`, { method: 'POST' }),
  stopDebug: (sessionId: string) =>
    request<any>(`/debug/sessions/${sessionId}/stop`, { method: 'POST' }),
  evalDebug: (sessionId: string, expression: string) =>
    request<any>(`/debug/sessions/${sessionId}/eval`, { method: 'POST', body: JSON.stringify({ expression }) }),
  executeGraphQL: (data: { endpoint: string; query: string; variables?: Record<string, any>; headers?: Record<string, string> }) =>
    request<any>('/graphql/execute', { method: 'POST', body: JSON.stringify(data) }),
  getCookies: (projectId?: string, domain?: string) =>
    request<any[]>(`/cookies?project_id=${projectId || ''}${domain ? `&domain=${domain}` : ''}`),
  saveCookie: (cookie: any) =>
    request<any>('/cookies', { method: 'POST', body: JSON.stringify(cookie) }),
  deleteCookie: (id: string) =>
    request<any>(`/cookies/${id}`, { method: 'DELETE' }),
  clearCookies: (projectId: string) =>
    request<any>(`/cookies?project_id=${projectId}`, { method: 'DELETE' }),
  getQueueJobs: (projectId?: string, status?: string) =>
    request<any[]>(`/queue/jobs?project_id=${projectId || ''}${status ? `&status=${status}` : ''}`),
  saveQueueJob: (job: any) =>
    request<any>('/queue/jobs', { method: 'POST', body: JSON.stringify(job) }),
  replayQueueJob: (id: string) =>
    request<any>(`/queue/jobs/${id}/replay`, { method: 'POST' }),
  diagnoseAI: (data: { context_type?: string; content: string; model?: string }) =>
    request<{ response: string; model: string; offline: boolean }>('/ai/diagnose', { method: 'POST', body: JSON.stringify(data) }),
  runSecurityAudit: (projectPath: string) =>
    request<any>('/security/audit', { method: 'POST', body: JSON.stringify({ project_path: projectPath }) }),
  getLaravelRoutes: (projectPath: string, phpBinaryPath?: string) =>
    request<any[]>(`/laravel/routes?project_path=${encodeURIComponent(projectPath)}${phpBinaryPath ? `&php_binary_path=${encodeURIComponent(phpBinaryPath)}` : ''}`),
  purgeData: (retentionDays: number) =>
    request<any>('/settings/purge', { method: 'POST', body: JSON.stringify({ retention_days: retentionDays }) }),
  getWebhookEvents: (receiverId?: string) =>
    request<any[]>(`/webhooks/events${receiverId ? `?receiver_id=${encodeURIComponent(receiverId)}` : ''}`),
  simulateWebhook: (data: { provider: string; secret?: string }) =>
    request<any>('/webhooks/simulate', { method: 'POST', body: JSON.stringify(data) }),
  verifyWebhookSignature: (data: { secret: string; payload: string; signature: string }) =>
    request<{ valid: boolean }>('/webhooks/verify', { method: 'POST', body: JSON.stringify(data) }),
  getJSSessions: (projectId?: string) =>
    request<any[]>(`/jsdebug/sessions${projectId ? `?project_id=${projectId}` : ''}`),
  createJSSession: (data: { project_id: string; runtime?: string; browser_name?: string; version?: string; settings_json?: string }) =>
    request<any>('/jsdebug/sessions', { method: 'POST', body: JSON.stringify(data) }),
  closeJSSession: (sessionId: string) =>
    request<any>(`/jsdebug/sessions/${sessionId}/close`, { method: 'POST' }),
  getJSConsoleEvents: (sessionId?: string, traceId?: string) =>
    request<any[]>(`/jsdebug/events?session_id=${sessionId || ''}&trace_id=${traceId || ''}`),
  emitJSConsoleEvent: (data: { session_id: string; trace_id?: string; severity: string; message_redacted: string; source_url?: string; line?: number; column?: number; stack_json?: string }) =>
    request<any>('/jsdebug/events', { method: 'POST', body: JSON.stringify(data) }),
  getDBConnections: (projectId?: string) =>
    request<any[]>(`/db/connections${projectId ? `?project_id=${projectId}` : ''}`),
  createDBConnection: (data: { project_id: string; name: string; driver: string; config_json?: string; readonly?: boolean }) =>
    request<any>('/db/connections', { method: 'POST', body: JSON.stringify(data) }),
  deleteDBConnection: (id: string) =>
    request<any>(`/db/connections/${id}`, { method: 'DELETE' }),
  analyzeDB: (projectId: string) =>
    request<any[]>('/db/analyze', { method: 'POST', body: JSON.stringify({ project_id: projectId }) }),
  getDBFindings: (projectId: string) =>
    request<any[]>(`/db/findings?project_id=${encodeURIComponent(projectId)}`),
  updateRecommendationStatus: (recId: string, status: 'approved' | 'dismissed') =>
    request<any>(`/db/recommendations/${recId}/status`, { method: 'POST', body: JSON.stringify({ status }) }),
  explainSQL: (sql: string, driver?: string) =>
    request<any>('/db/explain', { method: 'POST', body: JSON.stringify({ sql, driver: driver || 'mysql' }) }),
  executeDBQuery: (connectionId: string, sql: string, limit?: number, allowMutation?: boolean) =>
    request<any>('/db/query', { method: 'POST', body: JSON.stringify({ connection_id: connectionId, sql, limit: limit || 100, allow_mutation: !!allowMutation }) }),
  getTableData: (connectionId: string, table: string, page = 1, pageSize = 50, sortCol = '', sortDir = '', filter = '') =>
    request<any>(`/db/table/data?connection_id=${encodeURIComponent(connectionId)}&table=${encodeURIComponent(table)}&page=${page}&page_size=${pageSize}&sort_col=${encodeURIComponent(sortCol)}&sort_dir=${encodeURIComponent(sortDir)}&filter=${encodeURIComponent(filter)}`),
  insertTableRow: (connectionId: string, table: string, data: any) =>
    request<any>('/db/table/row', { method: 'POST', body: JSON.stringify({ connection_id: connectionId, table, data }) }),
  updateTableRow: (connectionId: string, table: string, pkCol: string, pkVal: any, updates: any) =>
    request<any>('/db/table/row', { method: 'PATCH', body: JSON.stringify({ connection_id: connectionId, table, pk_col: pkCol, pk_val: pkVal, updates }) }),
  deleteTableRow: (connectionId: string, table: string, pkCol: string, pkVal: any) =>
    request<any>('/db/table/row', { method: 'DELETE', body: JSON.stringify({ connection_id: connectionId, table, pk_col: pkCol, pk_val: pkVal }) }),
  truncateTable: (connectionId: string, table: string) =>
    request<any>('/db/table/truncate', { method: 'POST', body: JSON.stringify({ connection_id: connectionId, table }) }),
  dropTable: (connectionId: string, table: string) =>
    request<any>('/db/table/drop', { method: 'POST', body: JSON.stringify({ connection_id: connectionId, table }) }),
  getTableDDL: (connectionId: string, table: string) =>
    request<{ table: string; ddl: string }>(`/db/table/ddl?connection_id=${encodeURIComponent(connectionId)}&table=${encodeURIComponent(table)}`),
  getDatabaseRelations: (connectionId: string) =>
    request<{ nodes: any[]; edges: any[] }>(`/db/relations?connection_id=${encodeURIComponent(connectionId)}`),
  getDatabaseStats: (connectionId: string) =>
    request<any>(`/db/stats?connection_id=${encodeURIComponent(connectionId)}`),
  optimizeDatabase: (connectionId: string, table?: string) =>
    request<{ message: string }>('/db/optimize', { method: 'POST', body: JSON.stringify({ connection_id: connectionId, table: table || '' }) }),
  getActiveProcesses: (connectionId: string) =>
    request<any[]>(`/db/processes?connection_id=${encodeURIComponent(connectionId)}`),
  getDBSchema: (connectionId?: string) =>
    request<any>(`/db/schema${connectionId ? `?connection_id=${encodeURIComponent(connectionId)}` : ''}`),
  testDBConnection: (connectionId: string) =>
    request<any>(`/db/connections/${encodeURIComponent(connectionId)}/test`, { method: 'POST', body: JSON.stringify({}) }),
  testRawDBConnection: (data: any) =>
    request<any>('/db/connections/test', { method: 'POST', body: JSON.stringify(data) }),
  deleteProject: (id: string) =>
    request<any>(`/projects/${id}`, { method: 'DELETE' }),
  getWorkspaces: () =>
    request<any[]>('/workspaces'),
  createWorkspace: (data: { name: string; description?: string }) =>
    request<any>('/workspaces', { method: 'POST', body: JSON.stringify(data) }),
  deleteWorkspace: (id: string) =>
    request<any>(`/workspaces/${id}`, { method: 'DELETE' }),
  assignProjectWorkspace: (workspaceId: string, projectId: string) =>
    request<any>(`/workspaces/${workspaceId}/projects`, { method: 'POST', body: JSON.stringify({ project_id: projectId }) }),
  removeProjectWorkspace: (workspaceId: string, projectId: string) =>
    request<any>(`/workspaces/${workspaceId}/projects/${projectId}`, { method: 'DELETE' }),
  getProjectEnvironments: (projectId: string) =>
    request<any[]>(`/projects/${projectId}/environments`),
  createProjectEnvironment: (projectId: string, data: { name: string; kind?: string; is_production?: boolean; sampling_rate?: number; retention_days?: number }) =>
    request<any>(`/projects/${projectId}/environments`, { method: 'POST', body: JSON.stringify(data) }),
  getAIStatus: () =>
    request<{ available: boolean; endpoint: string; models: string[] }>('/ai/status'),
  explainErrorAI: (data: { exception_message: string; stack_trace: string; model?: string }) =>
    request<{ explanation: string; model: string; offline: boolean }>('/ai/explain-error', { method: 'POST', body: JSON.stringify(data) }),
  optimizeQueryAI: (data: { sql_query: string; explain_plan?: string; model?: string }) =>
    request<{ recommendation: string; model: string; offline: boolean }>('/ai/optimize-query', { method: 'POST', body: JSON.stringify(data) }),
  runQASmoke: (data: { base_url: string; project_path?: string; endpoints?: string[] }) =>
    request<any>('/qa/smoke', { method: 'POST', body: JSON.stringify(data) }),
  runQAFuzz: (data: { target_url: string; method?: string; parameter?: string }) =>
    request<any>('/qa/fuzz', { method: 'POST', body: JSON.stringify(data) }),
  runQABenchmark: (data: { target_url: string; method?: string; concurrency?: number; total_requests?: number }) =>
    request<any>('/qa/benchmark', { method: 'POST', body: JSON.stringify(data) }),
  probeLiveMonitor: (data: { url: string }) =>
    request<any>('/monitor/probe', { method: 'POST', body: JSON.stringify(data) }),

  // === NEW: Database Management Endpoints ===
  exportTableData: (connectionId: string, table: string, format: string, where?: string, limit?: number) =>
    request<any>('/db/export', { method: 'POST', body: JSON.stringify({ connection_id: connectionId, table, format, where: where || '', limit: limit || 1000 }) }),
  importTableData: (connectionId: string, table: string, format: string, data: string) =>
    request<any>('/db/import', { method: 'POST', body: JSON.stringify({ connection_id: connectionId, table, format, data }) }),
  generateMigration: (sourceConnId: string, targetConnId: string) =>
    request<any>('/db/migration/generate', { method: 'POST', body: JSON.stringify({ source_connection_id: sourceConnId, target_connection_id: targetConnId }) }),
  getSavedQueries: (connectionId?: string) =>
    request<any[]>(`/db/query/saved${connectionId ? `?connection_id=${encodeURIComponent(connectionId)}` : ''}`),
  saveQuery: (data: { name: string; sql: string; connection_id?: string }) =>
    request<any>('/db/query/saved', { method: 'POST', body: JSON.stringify(data) }),
  deleteSavedQuery: (id: string) =>
    request<any>(`/db/query/saved/${id}`, { method: 'DELETE' }),
  compareSchemas: (leftConnId: string, rightConnId: string) =>
    request<any>('/db/compare', { method: 'POST', body: JSON.stringify({ left_connection_id: leftConnId, right_connection_id: rightConnId }) }),
  getRealtimeMetrics: (connectionId: string) =>
    request<any>(`/db/monitor/realtime?connection_id=${encodeURIComponent(connectionId)}`),

  // === NEW: Enhanced QA Endpoints ===
  runQAContractTest: (data: { base_url: string; spec_url?: string; spec_format?: string; spec_content?: string }) =>
    request<any>('/qa/contract', { method: 'POST', body: JSON.stringify(data) }),
  runQARegression: (data: { base_url: string; suite_name: string; snapshots?: any[] }) =>
    request<any>('/qa/regression', { method: 'POST', body: JSON.stringify(data) }),
  runQASnapshot: (data: { url: string; name: string }) =>
    request<any>('/qa/snapshot', { method: 'POST', body: JSON.stringify(data) }),
  compareQASnapshots: (data: { baseline_id: string; current_id: string }) =>
    request<any>('/qa/snapshot/compare', { method: 'POST', body: JSON.stringify(data) }),
  getQAHistory: (suiteType?: string) =>
    request<any[]>(`/qa/history${suiteType ? `?suite_type=${suiteType}` : ''}`),
  getQAAuditDossier: (data: { base_url: string; project_path?: string }) =>
    request<any>('/qa/dossier', { method: 'POST', body: JSON.stringify(data) }),
  runQAEnvironmentMatrix: (data: { base_url: string; environments: Array<{ name: string; base_url: string }> }) =>
    request<any>('/qa/environment-matrix', { method: 'POST', body: JSON.stringify(data) }),

  // === NEW: AI QA Studio Endpoints ===
  runVisualQA: (data: { url: string; checks?: string[] }) =>
    request<any>('/qa/visual', { method: 'POST', body: JSON.stringify(data) }),
  applyQAFix: (data: { file_path: string; original_code: string; fixed_code: string; preview_only?: boolean }) =>
    request<any>('/qa/fix/apply', { method: 'POST', body: JSON.stringify(data) }),
  getQAChecklist: () =>
    request<any>('/qa/checklist'),
  saveQAChecklist: (data: { items: any[] }) =>
    request<any>('/qa/checklist', { method: 'POST', body: JSON.stringify(data) }),
};
