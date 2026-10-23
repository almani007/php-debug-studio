# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

The PHP Debug Studio team takes the security of local developer tools seriously. Because this workstation handles sensitive API keys, SQL connection strings, and application execution data, local isolation and redaction are core architectural priorities.

If you discover a potential vulnerability:
1. **Do not** report security vulnerabilities through public GitHub issues.
2. Please send detailed disclosures to `security@zoventra.com` (or create a private GitHub Security Advisory).
3. Include detailed steps to reproduce, the platform/architecture, and evidence of the finding.
4. We aim to acknowledge receipt of reports within 48 hours and coordinate release of fixes in accordance with responsible disclosure practices.

---

## 🔒 Security Architecture & Guarantees (SEC-01 through SEC-06)

PHP Debug Studio implements strict defense-in-depth security controls conforming to the Software Requirements Specification:

### SEC-01: Loopback Interface Isolation
- The Go local daemon binds exclusively to `127.0.0.1:8765`.
- Public interface listening (`0.0.0.0`) is strictly blocked in default production builds to prevent unauthorized LAN or WAN access.

### SEC-02: Zero Cloud Telemetry & Tracking
- Operates 100% offline with zero cloud accounts, external telemetry beacons, or third-party phone-home calls.
- All stored telemetry (traces, queries, logs, webhooks) remains in local SQLite databases on developer workstations.

### SEC-03: Local Secret Vault & Key Storage
- Authentication credentials, OAuth2 tokens, and database passwords are encrypted at rest using OS Keychain bindings or local AES-256-GCM encrypted vaults.
- Plaintext secrets are never logged or committed to version control.

### SEC-04: Automated Inbound Ingestion Redaction
- Inbound collectors automatically scrub sensitive headers prior to SQLite persistence:
  - `Authorization: Bearer [REDACTED]`
  - `Cookie: [REDACTED]`
  - `Set-Cookie: [REDACTED]`
  - `X-XSRF-TOKEN: [REDACTED]`
- Sensitive JSON body keys (`password`, `secret`, `api_key`, `token`, `private_key`) are masked with `***REDACTED***`.

### SEC-05: Read-Only Database Safeguards & Guardrails
- Database connections default to **read-only** execution mode to prevent accidental data modification.
- Destructive Artisan commands (`migrate:fresh`, `db:wipe`) require explicit interactive `--force` confirmation and developer override.

### SEC-06: Local-Only AI Privacy Shield
- The Local AI Solution Advisor connects exclusively to local Ollama models on `127.0.0.1:11434`.
- Stack traces, file paths, and queries are scrubbed by the privacy redaction filter prior to inference. No proprietary source code or data leaves the local machine.
