# ADR-006: Local-Only AI Solution Advisor & Privacy Redaction Shield

## Status
Accepted

## Context
Developers seek intelligent assistance for diagnosing obscure PHP exceptions, analyzing SQL execution plans, and generating Eloquent eager-loading refactors. However, sending proprietary source code, database schemas, stack traces, and queries to external cloud LLM endpoints violates enterprise security compliance and privacy standards.

## Decision
Implement a 100% offline Local AI Solution Advisor (Module 26):
1. The daemon interfaces strictly with local Ollama instances over loopback (`http://127.0.0.1:11434`).
2. Mandatory privacy redaction (SEC-04 / SEC-06) scrubs sensitive authorization tokens, passwords, API keys, and connection strings (`[REDACTED]`) prior to sending prompts to the local model.
3. Support local models such as `llama3.2`, `codellama`, `mistral`, and `qwen2.5-coder`.
4. If Ollama is not running, the daemon fails gracefully and informs the developer without blocking any core debugging functionality.

## Consequences
- **Positive**: Zero data leakage, zero subscription costs, completely offline functionality, compliant with enterprise code privacy policies.
- **Negative**: Model quality and inference speed depend on host hardware (CPU/GPU and available RAM).
