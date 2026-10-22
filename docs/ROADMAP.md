# PHP Debug Studio — Product Roadmap & Milestones

**Maintained by zoventra**  
*Architecture Baseline: Version 1.0 | 22 October 2026*

---

## 🗺️ Milestone Tracking

```mermaid
flowchart LR
    M0["M0: Foundation"] --> M1["M1: API Core"]
    M1 --> M2["M2: SDK & Laravel"]
    M2 --> M3["M3: Xdebug Bridge"]
    M3 --> M4["M4: Advanced API"]
    M4 --> M5["M5: Diagnostics"]
    M5 --> M6["M6: Full-Stack & Webhooks"]
    M6 --> M7["M7: v1.0 Stable Release"]
```

---

### ✅ Milestone 0: Architecture & Foundation (Completed)
- [x] Comprehensive Software Requirements Specification (SRS) for 26 product modules.
- [x] System architecture, loopback security model, and threat boundaries.
- [x] SQLite schema design with WAL mode, UUID keys, and foreign keys.
- [x] Monorepo structure setup: Go daemon, TypeScript types, PHP Core SDK, Laravel adapter, React Web UI, and Tauri desktop shell.
- [x] MIT licensing and open-source governance documents (`CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`).

---

### ✅ Milestone 1: API Core & Execution Engine (Completed)
- [x] HTTP request execution engine with DNS/TCP/TLS/TTFB timing capture.
- [x] Collection runner CLI (`packages/cli`) with variable interpolation.
- [x] JUnit XML and JSON report generation for CI/CD pipelines.
- [x] Postman Collection v2.1 & OpenAPI 3.x import/export parser.
- [x] Cookie jar management with automated Set-Cookie capture and injection.

---

### ✅ Milestone 2: Modern PHP SDK & Laravel Integration (Completed)
- [x] Core PHP interfaces (`CollectorInterface`, `TransportInterface`, `SanitizerInterface`).
- [x] Automatic error, exception, and shutdown fatal-error hooks.
- [x] W3C `traceparent` propagation and active span tracking.
- [x] Laravel service provider with `DB::listen` query tracing and queue failure listeners.
- [x] Artisan commands: `php artisan debug-studio:install` and `php artisan debug-studio:doctor`.
- [x] PSR-3 Logger bridge and PSR-15 middleware adapter for standalone PHP frameworks (Symfony, Slim).

---

### ✅ Milestone 3: DBGp Xdebug Bridge (Completed)
- [x] TCP listener on `127.0.0.1:9003` with length-prefixed DBGp wire framing.
- [x] Docker/remote container to host workspace path mapping engine (`pathmap.go`).
- [x] Feature negotiation for `max_depth` and `max_children`.
- [x] Interactive UI breakpoint management, stepping controls, watch expressions, and call stack tree.

---

### ✅ Milestone 4: Advanced Protocols & Mocks (Completed)
- [x] OAuth2 PKCE and Client Credentials authorization flow with encrypted local token vault.
- [x] WebSocket frame timeline and SSE event stream viewer.
- [x] GraphQL query composer with schema introspection and variable editor.
- [x] Local mock server matching routes, query params, and schemas from OpenAPI.

---

### ✅ Milestone 5: Diagnostics & Solution Advisor (Completed)
- [x] N+1 query heuristic detection and query fingerprinting.
- [x] Safe `EXPLAIN` query visualizer for MySQL, PostgreSQL, and SQLite.
- [x] Performance memory profiler and database deadlock analyzer.
- [x] Queue job history with replay safeguards (Queue Studio).

---

### ✅ Milestone 6: Webhooks & Full-Stack Browser Debugging (Completed)
- [x] Webhook Studio: Local receiver endpoints (`/wh/{id}`) and HMAC SHA-256 signature verification.
- [x] Browser CDP / Node.js V8 inspector session tracking.
- [x] Full-stack trace linking correlating frontend clicks to Laravel backend spans.
- [x] Offline local AI assistant plugin using Ollama (`plugins/ollama` and `/v1/ai/diagnose`).

---

### ✅ Milestone 7: v1.0 Stable Distribution & Certified Packaging (Completed)
- [x] Cross-platform build matrix for macOS (arm64/amd64), Linux (amd64/arm64), and Windows (amd64).
- [x] Automated compatibility test matrix verifying PHP 8.2, 8.3, 8.4 in GitHub Actions CI.
- [x] WCAG 2.1 AA accessibility audit: high-contrast theme engine and global keyboard navigation shortcuts (`Cmd+Enter`, `Cmd+1..9`, `Esc`).
