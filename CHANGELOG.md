# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-23

### Added
- **Local AI Solution Advisor (Module 26)**:
  - 100% offline inference engine connecting to local Ollama on loopback (`http://127.0.0.1:11434`).
  - Automated SEC-04 token, password, and PII redaction shield (`[REDACTED]`).
  - Interactive workspace tabs for Exception Explanation, SQL/Eloquent Query Optimization, and Architecture Chat.
- **Webhook Studio (Module 22)**:
  - Inbound loopback receiver `/wh/{receiver_id}` with constant-time HMAC SHA-256 signature verification (`hash_equals`).
  - Provider auto-detection for Stripe, GitHub, Shopify, and custom webhooks.
  - Interactive Webhook Inbox, payload replayer, and simulation dispatcher (`/v1/webhooks/simulate`).
- **JavaScript Debug Studio (Module 23)**:
  - Browser CDP and Node.js V8 inspector session tracking with WebSocket event streaming.
  - End-to-end W3C `traceparent` correlation linking frontend browser clicks to Laravel backend execution spans.
  - Call stack frame inspector, console error emitter, and DOM inspection aids.
- **Database Debug Studio & Solution Advisor (Module 24)**:
  - Evidence-backed database performance diagnostics detecting N+1 query loops and full table scans.
  - Safe, read-only multi-engine `EXPLAIN` visualizer for MySQL, PostgreSQL, and SQLite.
  - Candidate index recommendations (`CREATE INDEX` and Laravel migration snippets) with Eloquent eager-loading refactors (`with()`).
- **Multi-Project Workspaces (Module 25)**:
  - Project isolation environments (`local`, `staging`, `production`) and workspace grouping.
  - Selectable PHP runtimes per project supporting PHP 7.4 through PHP 8.4 independently.
  - Data retention policies and SQLite storage purge controls (`/v1/settings/purge`).
- **Global Command Palette (Cmd+K / Ctrl+K)**:
  - Fuzzy-search quick switcher covering all 15+ studio workspaces and debug consoles.
  - Keyboard-driven actions for security audits, AI queries, route refreshing, and webhook simulation.
  - Full WCAG 2.1 AA keyboard navigation (`↑`, `↓`, `Enter`, `Esc`, `Cmd+1..9`, `Cmd+Enter`).
- **Headless CLI Runner (`@zoventra/php-debug-studio-cli`)**:
  - Headless API collection runner with variable interpolation and JUnit XML reporting for CI/CD.
  - Dedicated subcommands: `artisan`, `test`, `scan`, `queue`, `ai`, `webhook`, `db`.
- **Tauri Desktop Shell & Distribution Packaging**:
  - Standalone desktop application configuration (`apps/desktop`).
  - Multi-resolution application bundle icons (`icon.png`, `128x128.png`, `32x32.png`).
  - Cross-platform release matrix workflow in `.github/workflows/release.yml` building for macOS (arm64/x64), Linux (amd64/arm64), and Windows (amd64) with SHA256 checksums.
- **E2E Integration & Verification Suites**:
  - Daemon API end-to-end integration tests (`tests/e2e/daemon_api_test.go`).
  - Automated 4-gate verification smoke test suite (`tests/e2e/smoke_test.sh`).
  - Runnable integration examples for Laravel, plain PHP, browser SDK, and webhook receivers (`examples/`).

---

## [1.0.0-baseline] - 2026-10-22

### Added
- Complete Software Requirements Specification (SRS) baseline documentation (`docs/srs/SRS.md`).
- Multi-project workspace architecture and isolation specifications (Module 25).
- Webhook Studio (Module 22), JavaScript Debug Studio (Module 23), and Database Debug Studio & Solution Advisor (Module 24).
- Local daemon v1 API contracts and SQLite WAL storage schema (`docs/architecture/SCHEMA.sql`).
- Monorepo package scaffolding for Go daemon, Tauri desktop shell, React UI, and Composer SDKs.
- Project licensing under the MIT License by zoventra.
