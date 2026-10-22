# Contributing to PHP Debug Studio

Thank you for your interest in contributing to **PHP Debug Studio** by **zoventra**! We are committed to building an open, local-first developer environment for the PHP and Laravel communities.

---

## Code of Conduct

All contributors and maintainers are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Development Workflow

1. **Fork & Branch**:
   - Create feature or bugfix branches from `main`.
   - Name branches descriptively (e.g., `feat/dbgp-path-mapping` or `fix/sql-binding-mask`).

2. **Local Environment**:
   - Go 1.22+
   - Node.js 20+ & pnpm
   - Rust & Tauri CLI
   - PHP 8.2+ & Composer

3. **Code Style & Formatting**:
   - **Go**: Follow standard `gofmt` and `golangci-lint` guidelines.
   - **TypeScript/React**: Follow ESLint and Prettier configurations in `packages/ui` and `apps/web`.
   - **PHP**: Adhere to PSR-12 and run `php-cs-fixer`.

4. **Testing**:
   - Ensure all unit and integration tests pass before submitting a pull request.
   - Add new test fixtures in `tests/e2e/` or `tests/compatibility/` for any new modules or protocols.

5. **Submitting Pull Requests**:
   - Provide a clear explanation of changes and cite relevant acceptance criteria from the [SRS Specification](docs/srs/SRS.md).
   - Ensure no sensitive credentials or temporary debug logs are included.

---

## Reporting Issues

- For bug reports or feature suggestions, please open a GitHub Issue with reproducible steps and environment details (PHP version, OS, framework).
- For security vulnerabilities, please refer to our [Security Policy](SECURITY.md).
