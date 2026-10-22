# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

The PHP Debug Studio team takes the security of local developer tools seriously. Because this tool handles sensitive API keys, SQL connection strings, and application execution data, local isolation and redaction are core priorities.

If you discover a potential vulnerability:
1. **Do not** report security vulnerabilities through public GitHub issues.
2. Please send detailed disclosures to `security@zoventra.com` (or create a private GitHub Security Advisory).
3. Include detailed steps to reproduce, the platform/architecture, and evidence of the finding.
4. We aim to acknowledge receipt of reports within 48 hours and coordinate release of fixes in accordance with responsible disclosure practices.

### Security Guarantees
- Local daemon binds to `127.0.0.1` by default.
- PII and authorization secrets are masked before storage.
- Sandboxed execution for JavaScript scripts in API collections.
