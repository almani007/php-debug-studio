# ADR-002: SQLite Storage with Write-Ahead Logging (WAL)

## Status
Accepted

## Context
PHP applications generate high-frequency telemetry (SQL spans, route lifecycle, logs, errors). The event store must be embedded, cross-platform, zero-maintenance, and capable of concurrent writes from SDK batch ingest and reads from the desktop UI.

## Decision
Adopt **SQLite 3** in **WAL (Write-Ahead Logging)** mode with foreign key constraints enabled:
1. Primary keys are UUIDs (`TEXT`).
2. Heavy binary response bodies and trace dumps are stored as content-addressed files, with metadata tracked in SQLite.
3. Indexes are strictly maintained for `(project_id, started_at DESC)`, `(trace_id)`, and `(receiver_id, received_at DESC)`.
4. Retention cleanup runs as a deterministic background routine based on configured TTL (default 7 days).

## Consequences
- **Positive**: Single-file portability, zero daemon dependencies, fast concurrent reads during writes.
- **Negative**: Unbounded blob storage directly in SQLite must be avoided by offloading large payloads.
