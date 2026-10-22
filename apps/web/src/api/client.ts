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
};
