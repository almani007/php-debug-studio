# Local Daemon API Specifications (v1)

The **PHP Debug Studio** local daemon binds strictly to loopback (`127.0.0.1:8765`) and acts as the central control plane, event ingestion hub, and execution engine for desktop (Tauri), browser clients, and CLI runners.

## Base URL
```text
http://127.0.0.1:8765/v1
```

---

## Standard Response Envelopes

Every API endpoint returns a standardized response envelope conforming to SRS System Contracts (Module 26).

### Success Envelope (`200 OK`, `201 Created`)
```json
{
  "data": { ... },
  "meta": {
    "requestId": "4fa85f64-5717-4562-b3fc-2c963f66afa6",
    "timestamp": "2026-10-23T11:50:00Z"
  },
  "error": null
}
```

### Failure Envelope (`4xx Client Error`, `5xx Server Error`)
```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Detailed description of validation failure",
    "details": []
  },
  "meta": {
    "requestId": "4fa85f64-5717-4562-b3fc-2c963f66afa6",
    "timestamp": "2026-10-23T11:50:00Z"
  }
}
```

---

## 🧭 Endpoint Catalog by Product Module

### 1. System & Health (Modules 01, 26)
- `GET /v1/health`
  - Returns daemon status, version, uptime, and database path.
  - Sample response: `{"status": "ok", "version": "1.0.0", "db": "debug_studio.sqlite"}`
- `GET /v1/settings` & `PATCH /v1/settings`
  - Retrieve and update global daemon configuration (retention TTL, AI endpoint, telemetry scrub rules).
- `POST /v1/settings/purge`
  - Enforce data retention policy and prune records older than configured TTL (default 7 days).

### 2. Multi-Project Workspaces (Module 25)
- `GET /v1/projects`
  - List registered projects with workspace associations and environment counts.
- `POST /v1/projects`
  - Register a new project. Accepts `name`, `path`, `php_version`, `workspace_id`.
- `GET /v1/projects/{id}`
  - Retrieve project detail, active environments, and path mappings.
- `PATCH /v1/projects/{id}`
  - Update project configuration, active PHP runtime binary, or Xdebug path mappings.
- `DELETE /v1/projects/{id}`
  - Cascade delete project metadata, spans, SQL logs, and debug sessions.
- `GET /v1/workspaces` & `POST /v1/workspaces`
  - List or create multi-project workspace groups.
- `GET /v1/workspaces/{id}` & `DELETE /v1/workspaces/{id}`
  - Inspect workspace member projects or delete workspace grouping.

### 3. API Execution & History (Modules 02, 03, 04, 05, 07)
- `POST /v1/requests/execute`
  - Execute HTTP/REST request via loopback engine with DNS, TCP, TLS, and TTFB timing capture.
- `POST /v1/graphql/execute`
  - Execute GraphQL query against target endpoint with schema introspection and variable mapping.
- `POST /v1/grpc/execute`
  - Execute gRPC unary or streaming call using protobuf reflection.
- `POST /v1/auth/pkce`
  - Generate OAuth2 PKCE `code_verifier` and SHA-256 `code_challenge`.
- `GET /v1/cookies` & `POST /v1/cookies`
  - Manage per-project cookie jar storage with automated `Set-Cookie` persistence.

### 4. Telemetry Ingestion & Distributed Tracing (Modules 01, 11, 12, 16)
- `POST /v1/events/ingest`
  - Batch ingestion endpoint for PHP Core SDK and Laravel Service Provider.
  - Ingests traces, spans, SQL statements, exceptions, logs, and queue events.
  - Sensitive headers and credentials automatically redacted via SEC-04 sanitizer before storage.
- `GET /v1/traces`
  - Filter traces by `project_id`, `status_code`, minimum `duration_ms`, or search text.
- `GET /v1/traces/{id}`
  - Detailed trace graph with timeline, correlated child spans, database queries, and logs.
- `GET /v1/logs`
  - Full-text search across application logs linked to W3C `traceparent` contexts.

### 5. DBGp Xdebug Step Debugger (Module 10)
- `GET /v1/debug/sessions`
  - List active Xdebug DBGp TCP connections on `127.0.0.1:9003`.
- `POST /v1/debug/sessions/{id}/commands`
  - Send step commands (`step_into`, `step_over`, `step_out`, `run`, `stop`, `eval`).
- `GET /v1/debug/breakpoints` & `POST /v1/debug/breakpoints`
  - Set, toggle, or list line and conditional breakpoints with container path mapping.

### 6. Database Debug Studio & Solution Advisor (Modules 13, 24)
- `GET /v1/db/connections` & `POST /v1/db/connections`
  - Register and test read-only database connections (MySQL, PostgreSQL, SQLite).
- `POST /v1/db/analyze`
  - Trigger heuristic analysis across ingested queries to identify N+1 loops and missing indexes.
- `GET /v1/db/findings`
  - Retrieve active performance findings, severity rating, and candidate index advice.
- `POST /v1/db/explain`
  - Safe, read-only `EXPLAIN` execution visualizer with cost estimates and table scan flags.

### 7. Webhook Studio (Module 22)
- `POST /wh/{receiver_id}`
  - Inbound loopback webhook receiver endpoint. Supports Stripe, GitHub, Shopify, and custom providers.
  - Enforces HMAC SHA-256 constant-time verification.
- `GET /v1/webhooks/events`
  - List received webhook payloads with provider detection, signature validity, and latency.
- `POST /v1/webhooks/simulate`
  - Dispatch simulated webhook events to local application endpoints for fault injection testing.

### 8. JavaScript Debug Studio (Module 23)
- `GET /v1/jsdebug/sessions` & `POST /v1/jsdebug/sessions`
  - Manage Chrome DevTools Protocol (CDP) or Node V8 inspector sessions.
- `GET /v1/jsdebug/events` & `POST /v1/jsdebug/events`
  - Stream browser console events, DOM exceptions, and W3C `traceparent` correlation headers.

### 9. Queue Studio & Safe Artisan Runner (Modules 18, 20)
- `GET /v1/queue/jobs`
  - Retrieve background queue jobs, payload previews, and exception details.
- `POST /v1/queue/jobs/{id}/retry`
  - Safely trigger isolated retry for a failed background queue worker job.
- `POST /v1/artisan/run`
  - Execute allowed Artisan commands (`migrate:status`, `route:list`, `cache:clear`) with guardrails.

### 10. Local AI Solution Advisor (Module 26)
- `GET /v1/ai/status`
  - Check local Ollama health on `http://127.0.0.1:11434` and list available offline models.
- `POST /v1/ai/explain-error`
  - Analyze redacted PHP stack traces and generate actionable remediation suggestions.
- `POST /v1/ai/optimize-query`
  - Analyze SQL queries and Eloquent relationships to provide eager-loading and indexing tips.

### 11. Real-Time WebSocket Event Stream (Module 01)
- `WS /v1/events/stream`
  - Live WebSocket stream for real-time trace updates, Xdebug break states, and webhook arrivals.

---

## 🔒 Security Model (SEC-01 through SEC-06)
- **Loopback Enforcement**: The daemon binds exclusively to `127.0.0.1`.
- **Zero Cloud Accounts**: Operates 100% offline with zero cloud telemetry or external network calls.
- **Header Sanitization**: Authorization, Cookie, and sensitive tokens are redacted (`[REDACTED]`) before database persistence.
- **Read-Only Database Safeguards**: Database connections default to read-only transactions to prevent inadvertent data modification.
