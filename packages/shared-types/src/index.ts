/**
 * PHP Debug Studio - Shared TypeScript Definitions
 * Maintained by zoventra
 */

export interface MetaInfo {
  requestId: string;
  timestamp: string;
}

export interface ErrorInfo {
  code: string;
  message: string;
  details?: unknown;
}

export interface DaemonResponse<T> {
  data: T | null;
  meta: MetaInfo;
  error: ErrorInfo | null;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  framework?: string;
  php_version?: string;
  php_binary_path?: string;
  root_path: string;
  app_url?: string;
  connection_mode: 'local' | 'docker' | 'ssh';
  workspace_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PhpRuntimeInfo {
  version: string;
  binary_path: string;
  is_default: boolean;
}

export interface ProjectEnvironment {
  id: string;
  project_id: string;
  name: string;
  kind: 'local' | 'staging' | 'production';
  collector_url?: string;
  is_production: boolean;
  sampling_rate: number;
  retention_days: number;
  created_at: string;
}

export interface Trace {
  id: string;
  project_id: string;
  environment_id: string;
  trace_id: string;
  root_span_id?: string;
  service_name: string;
  route: string;
  status: number;
  started_at: string;
  duration_us: number;
  sampled: boolean;
}

export interface Span {
  id: string;
  trace_id: string;
  span_id: string;
  parent_span_id?: string;
  kind: string;
  name: string;
  started_at: string;
  duration_us: number;
  attributes_json: string;
  status: string;
}

export interface SQLQuery {
  id: string;
  trace_id: string;
  span_id?: string;
  connection_name: string;
  sql_template: string;
  bindings_masked_json: string;
  duration_us: number;
  rows_affected: number;
  explain_json?: string;
}

export interface LogEntry {
  id: string;
  project_id: string;
  trace_id?: string;
  span_id?: string;
  level: 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency';
  channel: string;
  message_masked: string;
  context_json: string;
  timestamp: string;
}

export interface ErrorIssue {
  id: string;
  project_id: string;
  fingerprint: string;
  class: string;
  message_masked: string;
  severity: 'critical' | 'warning' | 'notice' | 'info';
  first_seen: string;
  last_seen: string;
  count: number;
  state: 'unresolved' | 'resolved' | 'ignored';
}

export interface DebugSession {
  id: string;
  project_id: string;
  state: 'starting' | 'break' | 'running' | 'stopping' | 'stopped';
  file_uri?: string;
  line?: number;
  started_at: string;
}

export interface WebhookReceiver {
  id: string;
  project_id: string;
  name: string;
  path: string;
  methods_json: string;
  response_mode: string;
  enabled: boolean;
  max_body_bytes: number;
  created_at: string;
}

export interface ExecutionRequest {
  project_id: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  url: string;
  headers: Record<string, string>;
  body?: string;
  timeout_ms?: number;
}

export interface ExecutionResponse {
  run_id: string;
  status_code: number;
  headers: Record<string, string>;
  body: string;
  duration_ms: number;
  trace_id: string;
  timings: {
    dns_lookup_ms: number;
    tcp_connection_ms: number;
    tls_handshake_ms: number;
    ttfb_ms: number;
    total_duration_ms: number;
  };
  content_length: number;
  error?: string;
}
