# PHP DEBUG STUDIO
## Complete Software Requirements Specification & Technical Architecture
**Free • Open Source • MIT License • Desktop + Browser + Composer SDK**  
**Version 1.0 — Architecture baseline | 22 October 2026**  
*Status: Proposed design baseline; implementation and compatibility require validation.*  
*Maintained by: zoventra*

---

## 1. Executive Summary

**PHP Debug Studio** is a local-first developer workstation and browser application that unifies PHP/Laravel debugging, API authoring/testing, SQL analysis, profiling, automated testing, and observability. The core runs offline, without account registration or vendor-hosted infrastructure. All core modules are MIT-licensed and available without feature gates.

**Primary Personas**:
- PHP Developer
- Laravel Developer
- API Engineer
- QA Automation Engineer
- Team Maintainer
- Security Reviewer
- Open-Source Contributor

---

## 2. Scope, Goals and Boundaries

- **G1**: Single workspace for API requests, PHP step debugging, application traces, SQL, queues, logs, profiling, and test results.
- **G2**: Desktop (Tauri) and browser clients share a versioned local daemon API; same projects and data model.
- **G3**: PHP Composer SDK runs in supported applications with explicit capture controls; standalone API client works without SDK.
- **G4**: Core workflows work offline; AI, update checks, and remote integrations are optional.
- **G5**: Portable collections, environments, test definitions, and trace exports in documented formats.

**Non-goals for v1**: Universal debugging of arbitrary non-PHP runtimes, production breakpoints by default, cloud SaaS dependency, fully automatic remediation.

---

## 3. Product Modules and Screen Inventory

### Workspace & Projects
- **Screens**: Project list, create/edit project, recent activity, settings.
- **Fields / Entities**: name, root path, runtime, framework/version, base URL, SDK token, tags, environment, enabled collectors.
- **Workflow**: Open project; validate SDK; test connectivity; choose debug profile.

### API Studio
- **Screens**: Collections tree, request editor, response inspector, history, runner, environments.
- **Fields / Entities**: method, URL, params, headers, cookies, body mode, auth, timeout, proxy, TLS, scripts, assertions.
- **Workflow**: Create request; resolve variables; send; inspect response; save; rerun or export.

### REST/HTTP Engine
- **Screens**: Request editor, redirects, cookie jar, TLS, proxy, multipart upload.
- **Fields / Entities**: HTTP version, redirects, DNS/TLS timing, body encoding, certificate profile, compression.
- **Workflow**: Resolve environment; execute request; stream response; enforce limits; redact logs.

### Authentication
- **Screens**: Auth editor, OAuth callback, token vault.
- **Fields / Entities**: none, basic, bearer, API key, OAuth2 authorization code + PKCE/client credentials, mTLS.
- **Workflow**: Acquire/store token; attach auth; refresh on expiry; redact all secrets.

### GraphQL
- **Screens**: Query editor, schema explorer, variables, headers.
- **Fields / Entities**: endpoint, operation, variables JSON, introspection, fragments, response.
- **Workflow**: Import schema; compose operation; execute; validate errors and data.

### WebSocket & SSE
- **Screens**: Connection console, frames timeline, event stream.
- **Fields / Entities**: URL, protocols, headers, reconnect, ping/pong, frames, event IDs.
- **Workflow**: Connect; send messages; capture frames; filter; export sanitized session.

### gRPC
- **Screens**: Service browser, protobuf import, metadata editor, streaming console.
- **Fields / Entities**: proto paths, service, method, metadata, deadlines, TLS, request payload.
- **Workflow**: Load descriptors; call unary/streaming method; inspect status and messages.

### Collections & Runner
- **Screens**: Collection editor, data-driven runner, reports.
- **Fields / Entities**: folder, variables, iteration data, pre/post scripts, assertions, delay, concurrency.
- **Workflow**: Run sequential collection; chain outputs; generate JUnit/JSON report; CI exit status.

### Mocks & API Contracts
- **Screens**: Mock routes, response rules, OpenAPI explorer.
- **Fields / Entities**: path, method, matching, status, headers, schema, latency, examples.
- **Workflow**: Import OpenAPI; generate examples; serve local mock; validate request/response.

### PHP Debugger
- **Screens**: Sessions, breakpoints, source viewer, variables, watches, stack.
- **Fields / Entities**: file URI, line, condition, hit count, expression, stack depth, threads/sessions.
- **Workflow**: Attach DBGp; set breakpoints; step; inspect variables; detach safely.

### Laravel Inspector
- **Screens**: Routes, middleware, Eloquent, events, cache, auth, views, jobs.
- **Fields / Entities**: route name, controller, middleware list, model, query count, cache hit, event name.
- **Workflow**: Select request trace; drill into Laravel lifecycle and correlated events.

### Exceptions & Errors
- **Screens**: Issues, occurrence detail, stack, breadcrumbs.
- **Fields / Entities**: class, message, severity, source file/line, fingerprint, request ID, release.
- **Workflow**: Capture; normalize; group; scrub; inspect; acknowledge; export.

### SQL Studio
- **Screens**: Query timeline, query editor, explain plan, transactions.
- **Fields / Entities**: driver, connection alias, SQL template, bindings masked, duration, rows, plan.
- **Workflow**: Find slow/N+1 queries; run read-only EXPLAIN; recommend indexes with caveats.

### Performance
- **Screens**: Trace waterfall, flamegraph, memory graph, comparison.
- **Fields / Entities**: span, parent span, start/end, CPU samples, wall time, peak memory.
- **Workflow**: Capture sampled profile; attribute hotspots; compare two captures.

### Queues & Scheduler
- **Screens**: Queue dashboard, failed jobs, scheduled command history.
- **Fields / Entities**: job ID, queue, attempts, status, exception, duration, scheduled command.
- **Workflow**: Inspect failures; correlate trace; retry only with explicit authorization.

### Logs & Correlation
- **Screens**: Log explorer, filters, trace-linked entries.
- **Fields / Entities**: timestamp, level, channel, message, context scrubbed, trace ID.
- **Workflow**: Ingest structured logs; filter; pivot to request, query, exception.

### Test Studio
- **Screens**: PHPUnit/Pest runner, coverage, assertion results.
- **Fields / Entities**: suite, test case, environment, duration, status, output, coverage.
- **Workflow**: Run tests in isolated process; capture reports; jump to source.

### CLI & Artisan
- **Screens**: Command runner, output inspector.
- **Fields / Entities**: command allowlist, arguments, cwd, environment, exit code.
- **Workflow**: Launch permitted command; stream output; terminate; retain audit record.

### Security Diagnostics
- **Screens**: Configuration checks, secret leak findings, dependency scan.
- **Fields / Entities**: rule, severity, file, evidence masked, remediation, suppression.
- **Workflow**: Run non-destructive checks; flag risky debug flags/headers; export findings.

### AI Assistant (Optional)
- **Screens**: Chat, diagnosis, suggested patches, prompt preview.
- **Fields / Entities**: local model (Ollama), redaction preview, evidence references, suggestion confidence.
- **Workflow**: Select sanitized evidence; run local inference; review patch; never auto-apply.

### Settings & Extensions
- **Screens**: Plugins, collectors, retention, themes, export.
- **Fields / Entities**: sampling, capture policy, data TTL, secret rules, plugin grants.
- **Workflow**: Enable plugin; grant capabilities; change retention; purge stored data.

### Webhook Studio (Module 22)
- **Screens**: Overview, receivers, event inbox, event detail, replay builder, forwarding rules, signature profiles, simulator, delivery history.
- **Fields / Entities**: receiver ID, event ID, provider, method, path, headers redacted, body redacted, signature status, trace ID.
- **Workflow**: Ingest webhook → verify signature → store sanitized event → optionally forward → correlate trace → replay.

### JavaScript Debug Studio (Module 23)
- **Screens**: Browser sessions, console, sources & breakpoints, network waterfall, DOM & events, performance & memory, full-stack timeline, Node inspector, framework inspector.
- **Fields / Entities**: session ID, trace ID, console events, breakpoints, network events, DOM mutations, source maps, framework hooks.
- **Workflow**: Connect authorized browser (CDP) / Node.js (V8) → inspect frontend events → link via W3C traceparent to Laravel backend.

### Database Debug Studio & Solution Advisor (Module 24)
- **Screens**: Connection manager, query explorer, query plan viewer, index advisor, locks & transactions, schema & migration inspector, solution center.
- **Fields / Entities**: connection ID, query fingerprint, duration, row count, execution plan, candidate index, lock waiter/blocker graph.
- **Workflow**: Analyze query activity → detect N+1/slow queries → generate evidence-backed index/code suggestions → verify without auto-applying mutations.

### Multi-Project Management & Workspace Architecture (Module 25)
- **Screens**: Projects list, add/edit project wizard, project overview, environments, agent & SDK connections, path mapping, workspace builder, project settings.
- **Fields / Entities**: project ID, slug, runtime, framework, root path, environment ID, agent credentials, workspace ID.
- **Workflow**: Centralize multi-project registration; isolate telemetry, traces, and secrets; correlate cross-project workflows.

---

## 4. End-to-End User Journeys

- **J1 API-to-PHP Trace**: Select environment → send POST → capture trace ID → open waterfall → controller → SQL → exception → source line → optional Xdebug session → rerun assertion.
- **J2 API Collection**: Import OpenAPI or cURL → define environment → add OAuth2 → add tests → run data set → export JUnit for CI.
- **J3 Laravel N+1**: Open slow endpoint → identify repeated query signatures → inspect Eloquent caller → show candidate eager loading → compare before/after traces.
- **J4 Worker Failure**: SDK captures queue job → failure grouping → stack + logs + database activity → inspect payload redacted → authorized retry.
- **J5 Plain PHP**: `composer require` → bootstrap SDK → enable collectors → local daemon receives spans → inspect request and attach Xdebug.
- **J6 Offline Usage**: Start daemon → open desktop or localhost browser UI → import collection → send localhost API calls → run local tests; no account or internet required.

---

## 5. Architecture and Process Boundaries

1. **PHP Core SDK & Laravel Adapter**: Instruments application runtime, batches sanitized events over local HTTP/Unix socket.
2. **Go Local Daemon**: High-performance HTTP/JSON + WebSocket event server, execution engine, DBGp listener, and SQLite storage manager.
3. **Desktop (Tauri) & Web (React) Frontend**: Shared TypeScript/React application running either inside the lightweight Tauri desktop shell or served directly to a local browser.
4. **SQLite Event Store**: Local WAL-mode database with strict schemas, indexes, and content-addressed payload storage.
5. **DBGp Bridge**: TCP listener accepting outbound Xdebug connections and mediating step debugging.
6. **Isolated Script & Test Runners**: Bounded runtimes for pre/post-request scripts, collections, and PHPUnit/Pest.
7. **Optional Ollama Adapter**: Fully offline local LLM integration for error analysis and suggested patches.

---

## 6. PHP SDK and Laravel Integration

### Interfaces
- `CollectorInterface`
- `TransportInterface`
- `SanitizerInterface`
- `SpanInterface`
- `StoragePolicyInterface`
- `FrameworkAdapterInterface`

### Installation Target
```bash
composer require --dev zoventra/php-debug-studio-laravel
php artisan debug-studio:install
php artisan debug-studio:doctor
```

---

## 7. Storage Schema (SQLite Baseline)

Key tables with TEXT UUID primary keys, ISO-8601 timestamps, JSON schemas, WAL mode, foreign keys, and indexes:
- `projects`, `project_environments`, `workspaces`, `workspace_projects`
- `collections`, `api_requests`, `api_request_headers`, `environments`, `environment_variables`, `secrets`
- `api_executions`, `api_assertions`, `collection_runs`, `collection_run_items`, `api_mocks`, `contracts`
- `debug_sessions`, `breakpoints`, `debug_events`
- `traces`, `spans`, `error_issues`, `error_occurrences`, `sql_queries`, `logs`, `queue_jobs`, `scheduled_runs`
- `webhook_receivers`, `webhook_events`, `webhook_forwarding_rules`, `webhook_deliveries`, `webhook_signature_profiles`, `webhook_replays`
- `js_debug_sessions`, `js_console_events`, `js_breakpoints`, `js_network_events`, `js_profiles`, `js_dom_events`, `js_source_maps`
- `db_connections`, `db_query_events`, `db_query_plans`, `db_findings`, `db_recommendations`, `db_lock_events`
- `settings`, `audit_events`

---

## 8. Security & Privacy Baseline

- **SEC-01**: Loopback binding (127.0.0.1) by default; authenticated local IPC.
- **SEC-02**: Restrictive CORS, CSP, CSRF tokens, and WebSocket origin checks for browser UI.
- **SEC-03**: OS keychain or authenticated encrypted vault for secrets at rest.
- **SEC-04**: Redact Authorization, Cookie, tokens, passwords, and sensitive keys automatically.
- **SEC-05**: Safe defaults: no raw body capture in production, read-only SQL mode, no interactive breakpoints on production.
- **SEC-06**: AI assistance disabled by default; strictly local (Ollama) with prompt preview and explicit approval.
