-- PHP Debug Studio - SQLite Baseline Schema
-- PRAGMA foreign_keys = ON;
-- PRAGMA journal_mode = WAL;

-- Projects & Multi-Project Workspaces
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    framework TEXT,
    php_version TEXT,
    root_path TEXT NOT NULL,
    app_url TEXT,
    connection_mode TEXT DEFAULT 'local',
    workspace_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS project_environments (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    kind TEXT DEFAULT 'local',
    collector_url TEXT,
    is_production INTEGER DEFAULT 0,
    capture_policy_json TEXT,
    sampling_rate REAL DEFAULT 1.0,
    retention_days INTEGER DEFAULT 7,
    created_at TEXT NOT NULL,
    UNIQUE(project_id, name)
);

CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS workspace_projects (
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    PRIMARY KEY (workspace_id, project_id)
);

-- Secrets & Authentication
CREATE TABLE IF NOT EXISTS secrets (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    ciphertext BLOB NOT NULL,
    nonce BLOB NOT NULL,
    key_version INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS auth_profiles (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    public_config_json TEXT,
    secret_ref_id TEXT REFERENCES secrets(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL
);

-- API Studio & Collections
CREATE TABLE IF NOT EXISTS collections (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    parent_id TEXT REFERENCES collections(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    order_index INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS api_requests (
    id TEXT PRIMARY KEY,
    collection_id TEXT REFERENCES collections(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    method TEXT NOT NULL,
    url_template TEXT NOT NULL,
    headers_json TEXT,
    params_json TEXT,
    body_json TEXT,
    auth_profile_id TEXT REFERENCES auth_profiles(id) ON DELETE SET NULL,
    scripts_json TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS api_runs (
    id TEXT PRIMARY KEY,
    request_id TEXT REFERENCES api_requests(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    environment_id TEXT REFERENCES project_environments(id) ON DELETE SET NULL,
    status INTEGER,
    started_at TEXT NOT NULL,
    finished_at TEXT,
    duration_ms REAL,
    trace_id TEXT,
    error_code TEXT
);

-- Traces & Observability
CREATE TABLE IF NOT EXISTS traces (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    environment_id TEXT REFERENCES project_environments(id) ON DELETE CASCADE,
    trace_id TEXT UNIQUE NOT NULL,
    root_span_id TEXT,
    service_name TEXT,
    route TEXT,
    status INTEGER,
    started_at TEXT NOT NULL,
    duration_us INTEGER,
    sampled INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS spans (
    id TEXT PRIMARY KEY,
    trace_id TEXT NOT NULL REFERENCES traces(id) ON DELETE CASCADE,
    span_id TEXT NOT NULL,
    parent_span_id TEXT,
    kind TEXT,
    name TEXT NOT NULL,
    started_at TEXT NOT NULL,
    duration_us INTEGER,
    attributes_json TEXT,
    status TEXT
);

CREATE TABLE IF NOT EXISTS error_issues (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    fingerprint TEXT UNIQUE NOT NULL,
    class TEXT NOT NULL,
    message_masked TEXT,
    severity TEXT,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL,
    count INTEGER DEFAULT 1,
    state TEXT DEFAULT 'unresolved'
);

CREATE TABLE IF NOT EXISTS error_occurrences (
    id TEXT PRIMARY KEY,
    issue_id TEXT NOT NULL REFERENCES error_issues(id) ON DELETE CASCADE,
    trace_id TEXT REFERENCES traces(id) ON DELETE CASCADE,
    span_id TEXT,
    stack_json TEXT,
    context_json TEXT,
    happened_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sql_queries (
    id TEXT PRIMARY KEY,
    trace_id TEXT REFERENCES traces(id) ON DELETE CASCADE,
    span_id TEXT,
    connection_name TEXT,
    sql_template TEXT NOT NULL,
    bindings_masked_json TEXT,
    duration_us INTEGER,
    rows_affected INTEGER,
    explain_json TEXT
);

CREATE TABLE IF NOT EXISTS logs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    trace_id TEXT REFERENCES traces(id) ON DELETE SET NULL,
    span_id TEXT,
    level TEXT NOT NULL,
    channel TEXT,
    message_masked TEXT NOT NULL,
    context_json TEXT,
    timestamp TEXT NOT NULL
);

-- Webhook Studio (Module 22)
CREATE TABLE IF NOT EXISTS webhook_receivers (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    path TEXT NOT NULL,
    methods_json TEXT NOT NULL,
    response_mode TEXT DEFAULT 'standard',
    enabled INTEGER DEFAULT 1,
    max_body_bytes INTEGER DEFAULT 1048576,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    receiver_id TEXT NOT NULL REFERENCES webhook_receivers(id) ON DELETE CASCADE,
    provider TEXT,
    event_type TEXT,
    provider_event_id TEXT,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    headers_redacted_json TEXT,
    body_redacted BLOB,
    body_sha256 TEXT,
    received_at TEXT NOT NULL,
    signature_status TEXT,
    trace_id TEXT
);

-- JavaScript Debug Studio (Module 23)
CREATE TABLE IF NOT EXISTS js_debug_sessions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    runtime TEXT NOT NULL,
    browser_name TEXT,
    version TEXT,
    connection_state TEXT,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    settings_json TEXT
);

CREATE TABLE IF NOT EXISTS js_console_events (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES js_debug_sessions(id) ON DELETE CASCADE,
    trace_id TEXT,
    severity TEXT NOT NULL,
    message_redacted TEXT NOT NULL,
    source_url TEXT,
    line INTEGER,
    column INTEGER,
    stack_json TEXT,
    occurred_at TEXT NOT NULL
);

-- Database Studio & Solution Advisor (Module 24)
CREATE TABLE IF NOT EXISTS db_connections (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    driver TEXT NOT NULL,
    config_json TEXT,
    secret_ref TEXT,
    readonly INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS db_findings (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    connection_id TEXT REFERENCES db_connections(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    confidence REAL,
    evidence_json TEXT,
    status TEXT DEFAULT 'open',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS db_recommendations (
    id TEXT PRIMARY KEY,
    finding_id TEXT NOT NULL REFERENCES db_findings(id) ON DELETE CASCADE,
    engine TEXT,
    proposed_sql TEXT,
    proposed_code TEXT,
    rationale TEXT,
    risks_json TEXT,
    verification_json TEXT,
    approval_status TEXT DEFAULT 'pending'
);

-- Cookie Jar & Session State (Module 02)
CREATE TABLE IF NOT EXISTS cookies (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    path TEXT NOT NULL DEFAULT '/',
    name TEXT NOT NULL,
    value TEXT NOT NULL,
    expires_at TEXT,
    secure INTEGER DEFAULT 0,
    http_only INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE(project_id, domain, path, name)
);

-- Queue Diagnostics & Replayer (Module 20)
CREATE TABLE IF NOT EXISTS queue_jobs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    queue_name TEXT NOT NULL,
    connection TEXT NOT NULL DEFAULT 'default',
    job_class TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    status TEXT NOT NULL,
    exception_message TEXT,
    exception_trace TEXT,
    failed_at TEXT,
    created_at TEXT NOT NULL
);

-- Indexes for high-performance querying
CREATE INDEX IF NOT EXISTS idx_traces_project_started ON traces(project_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_spans_trace_parent ON spans(trace_id, parent_span_id);
CREATE INDEX IF NOT EXISTS idx_sql_trace_duration ON sql_queries(trace_id, duration_us DESC);
CREATE INDEX IF NOT EXISTS idx_logs_project_timestamp ON logs(project_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_error_issues_fp ON error_issues(project_id, fingerprint);
CREATE INDEX IF NOT EXISTS idx_webhook_events_recv_time ON webhook_events(receiver_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_js_console_session_time ON js_console_events(session_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_cookies_proj_domain ON cookies(project_id, domain);
CREATE INDEX IF NOT EXISTS idx_queue_jobs_proj_status ON queue_jobs(project_id, status);
