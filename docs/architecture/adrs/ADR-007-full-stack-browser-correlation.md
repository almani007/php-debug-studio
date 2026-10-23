# ADR-007: Full-Stack JavaScript Browser & Backend Trace Correlation

## Status
Accepted

## Context
Diagnosing full-stack web application issues often requires correlating frontend user interactions (button clicks, form submits, client-side fetch calls) with backend PHP execution (controllers, SQL queries, cache accesses, background queue jobs). Without correlation, frontend errors and backend traces remain isolated in separate silos.

## Decision
Implement JavaScript Debug Studio and Browser SDK correlation (Module 23):
1. Distribute a lightweight browser tracing package (`@zoventra/php-debug-studio-browser`) that intercepts `window.fetch` and `XMLHttpRequest`.
2. Automatically attach W3C standard `traceparent` headers (`00-{trace_id}-{span_id}-01`) to all outbound HTTP requests.
3. The PHP Core SDK and Laravel adapter parse the incoming `traceparent` header to parent all server spans, Eloquent queries, and logs to the client-originated trace ID.
4. Capture browser console logs, DOM errors, and call stacks via Chrome DevTools Protocol (CDP) / Node.js V8 inspector sessions.

## Consequences
- **Positive**: Complete end-to-end visibility from user UI action to database query, simplifies root-cause analysis for full-stack developers.
- **Negative**: Adds negligible overhead to client-side fetch requests when the browser SDK is included in development mode.
