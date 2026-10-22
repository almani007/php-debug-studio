# ADR-004: W3C Trace Context Propagation

## Status
Accepted

## Context
Diagnosing full-stack performance bottlenecks and errors requires correlating user actions from the browser/API client through Laravel controllers, Eloquent SQL queries, queue jobs, and outbound webhooks under a single trace ID.

## Decision
Adopt the **W3C Trace Context** standard:
1. Format: `00-{trace_id}-{span_id}-{trace_flags}` (e.g. `00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01`).
2. Transmitted via HTTP headers: `traceparent` and optional `tracestate`.
3. Injected by API Studio and the frontend JavaScript SDK on outgoing fetch requests.
4. Extracted by Laravel middleware to initialize the root trace span, which is then propagated to queued jobs and database queries.

## Consequences
- **Positive**: Interoperable with standard distributed tracing tools (OpenTelemetry, Jaeger) and transparent cross-boundary correlation.
- **Negative**: Applications must sanitize or avoid putting private baggage in trace headers.
