"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.explainErrorCli = explainErrorCli;
exports.optimizeQueryCli = optimizeQueryCli;
/**
 * CLI Local AI Solution Advisor interface
 * Connects to offline local Ollama through PHP Debug Studio daemon
 */
async function explainErrorCli(errorText, daemonUrl = 'http://127.0.0.1:8765') {
    try {
        const res = await fetch(`${daemonUrl}/v1/ai/explain-error`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: errorText }),
        });
        if (!res.ok) {
            return `Daemon returned HTTP ${res.status}: ${await res.text()}`;
        }
        const data = await res.json();
        return `[Model: ${data.model}]\n${data.explanation}`;
    }
    catch (err) {
        return `Failed to connect to local daemon at ${daemonUrl}: ${err.message}`;
    }
}
async function optimizeQueryCli(sqlQuery, daemonUrl = 'http://127.0.0.1:8765') {
    try {
        const res = await fetch(`${daemonUrl}/v1/ai/optimize-query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sql: sqlQuery }),
        });
        if (!res.ok) {
            return `Daemon returned HTTP ${res.status}: ${await res.text()}`;
        }
        const data = await res.json();
        return `[Model: ${data.model}]\n${data.recommendations}`;
    }
    catch (err) {
        return `Failed to connect to local daemon at ${daemonUrl}: ${err.message}`;
    }
}
//# sourceMappingURL=advisor.js.map