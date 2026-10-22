# ADR-001: Local-First Loopback Architecture

## Status
Accepted

## Context
Developers require an integrated tool for debugging PHP/Laravel applications, inspecting SQL queries, and executing API tests without transmitting sensitive production/staging credentials, session tokens, or source code to third-party hosted cloud services.

## Decision
PHP Debug Studio is designed strictly as a **local-first** application:
1. All privileged daemon endpoints bind to the loopback interface (`127.0.0.1`) by default.
2. The Go daemon acts as a shared local backend for both desktop (Tauri) and local browser clients.
3. No mandatory accounts, telemetry reporting, or internet connection are required for core workflows.

## Consequences
- **Positive**: Complete privacy, zero vendor lock-in, low latency IPC, operates offline.
- **Negative**: Remote container/staging access requires explicit user-configured SSH tunnels or TLS proxies.
