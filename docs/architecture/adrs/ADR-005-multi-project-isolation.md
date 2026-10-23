# ADR-005: Multi-Project Workspace & Environment Isolation

## Status
Accepted

## Context
Developers frequently maintain multiple PHP and Laravel microservices, legacy monoliths, and API gateways simultaneously on a single workstation. Mixing telemetry, logs, environment variables, or PHP runtime versions across projects causes cross-contamination and developer confusion.

## Decision
Implement a multi-project workspace architecture (Module 25):
1. Projects are partitioned into logical Workspaces (`workspaces` table) with independent environment profiles (`local`, `staging`, `production`).
2. Each project maintains its own isolated database connections, cookie jars, traces, and breakpoint lists.
3. PHP runtimes are independently selectable per project (supporting PHP 7.4 through PHP 8.4) with automatic daemon binary detection.
4. Retention policies and SQLite storage purging can be configured globally or scoped per project environment.

## Consequences
- **Positive**: Strict data separation, eliminates accidental credential leakage across environments, allows debugging mixed legacy (PHP 7.4) and modern (PHP 8.4) projects concurrently.
- **Negative**: Requires explicit project context selection when executing Artisan commands or inspecting database findings.
