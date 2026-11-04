"use strict";
/**
 * Database Tools & Solution Advisor CLI client
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.scanDatabaseCli = scanDatabaseCli;
exports.executeDatabaseQueryCli = executeDatabaseQueryCli;
exports.introspectSchemaCli = introspectSchemaCli;
exports.testConnectionCli = testConnectionCli;
exports.explainQueryCli = explainQueryCli;
async function scanDatabaseCli(projectId, daemonUrl = 'http://127.0.0.1:8765') {
    const url = `${daemonUrl}/v1/db/findings?project_id=${encodeURIComponent(projectId)}`;
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`Failed to fetch database findings: HTTP ${res.status}`);
    }
    return await res.json();
}
async function executeDatabaseQueryCli(sql, connectionId = 'default', limit = 50, daemonUrl = 'http://127.0.0.1:8765') {
    const url = `${daemonUrl}/v1/db/query`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            connection_id: connectionId,
            sql,
            limit,
        }),
    });
    const data = (await res.json());
    if (!res.ok) {
        throw new Error(data.error?.message || `Failed to execute query: HTTP ${res.status}`);
    }
    return (data.data || data);
}
async function introspectSchemaCli(connectionId = 'default', daemonUrl = 'http://127.0.0.1:8765') {
    const url = `${daemonUrl}/v1/db/schema?connection_id=${encodeURIComponent(connectionId)}`;
    const res = await fetch(url);
    const data = (await res.json());
    if (!res.ok) {
        throw new Error(data.error?.message || `Failed to introspect schema: HTTP ${res.status}`);
    }
    return (data.data || data);
}
async function testConnectionCli(connectionId = 'default', daemonUrl = 'http://127.0.0.1:8765') {
    const url = `${daemonUrl}/v1/db/connections/${encodeURIComponent(connectionId)}/test`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
    });
    const data = (await res.json());
    if (!res.ok) {
        throw new Error(data.error?.message || `Failed to test connection: HTTP ${res.status}`);
    }
    return (data.data || data);
}
async function explainQueryCli(sql, driver = 'mysql', daemonUrl = 'http://127.0.0.1:8765') {
    const url = `${daemonUrl}/v1/db/explain`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql, driver }),
    });
    const data = (await res.json());
    if (!res.ok) {
        throw new Error(data.error?.message || `Failed to explain query: HTTP ${res.status}`);
    }
    return (data.data || data);
}
//# sourceMappingURL=database.js.map