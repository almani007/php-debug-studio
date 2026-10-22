# Local Daemon API Specifications (v1)

The PHP Debug Studio local daemon runs on `127.0.0.1` by default and provides unified endpoints for desktop (Tauri) and browser clients.

## Base URL
```
http://127.0.0.1:8765/v1
```

## Response Envelopes

### Success Envelope
```json
{
  "data": {},
  "meta": {
    "requestId": "uuid",
    "timestamp": "2026-10-22T12:00:00Z"
  },
  "error": null
}
```

### Failure Envelope
```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Detailed description of error",
    "details": []
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

## Core Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/v1/health` | Daemon health check and version metadata |
| `GET` | `/v1/projects` | List projects (with search, pagination) |
| `POST` | `/v1/projects` | Register a new project |
| `GET` | `/v1/projects/{id}` | Get project details and status |
| `PATCH` | `/v1/projects/{id}` | Update project configuration |
| `DELETE` | `/v1/projects/{id}` | Delete project and enforce retention cascades |
| `GET` | `/v1/projects/{id}/health` | Probe SDK connectivity and runtime status |
| `POST` | `/v1/projects/{id}/environments` | Create isolated environment |
| `POST` | `/v1/requests/execute` | Execute API request via local engine |
| `GET` | `/v1/api/history` | Paginated API request history |
| `POST` | `/v1/collections/{id}/runs` | Start automated collection run |
| `GET` | `/v1/runs/{id}` | Get test run results and assertion status |
| `GET` | `/v1/traces` | Filter traces by project, duration, and status |
| `GET` | `/v1/traces/{id}` | Trace detail with correlated spans, SQL, logs |
| `POST` | `/v1/events/ingest` | Batch SDK telemetry ingestion |
| `GET` | `/v1/issues` | Grouped error issues and fingerprints |
| `GET` | `/v1/sql/queries` | SQL queries and N+1 performance filters |
| `POST` | `/v1/sql/explain` | Safe read-only EXPLAIN analysis |
| `GET` | `/v1/debug/sessions` | Active DBGp debugging sessions |
| `POST` | `/v1/debug/sessions/{id}/commands` | Step / continue / inspect DBGp debugger |
| `GET` | `/v1/projects/{id}/webhooks/receivers` | List webhook receivers |
| `POST` | `/v1/projects/{id}/webhooks/receivers` | Create local webhook receiver endpoint |
| `GET` | `/v1/webhooks/events/{id}` | Inspect sanitized webhook event |
| `POST` | `/v1/webhooks/events/{id}/replay` | Replay webhook to destination |
| `POST` | `/v1/js/sessions` | Create browser CDP / Node V8 debugging session |
| `GET` | `/v1/db/connections` | Manage registered database connections |
| `WS` | `/v1/events/stream` | Real-time WebSocket event stream |
| `GET` | `/v1/settings` | Get local daemon settings |
| `PATCH` | `/v1/settings` | Update settings (retention, secret storage, AI) |
