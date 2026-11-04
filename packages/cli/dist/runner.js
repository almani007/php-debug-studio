"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.interpolate = interpolate;
exports.runCollection = runCollection;
function interpolate(template, env) {
    return template.replace(/\{\{([a-zA-Z0-9_-]+)\}\}/g, (match, key) => {
        return env[key] !== undefined ? env[key] : match;
    });
}
async function runCollection(collection, env) {
    const results = [];
    for (const item of collection.requests) {
        const interpolatedUrl = interpolate(item.url, env);
        const interpolatedBody = item.body ? interpolate(item.body, env) : undefined;
        const interpolatedHeaders = {
            'Content-Type': 'application/json',
            'User-Agent': 'PHP-Debug-Studio-CLI/1.0',
        };
        if (item.headers) {
            for (const [k, v] of Object.entries(item.headers)) {
                interpolatedHeaders[k] = interpolate(v, env);
            }
        }
        const start = Date.now();
        let passed = true;
        let failureMessage = '';
        try {
            const response = await fetch(interpolatedUrl, {
                method: item.method.toUpperCase(),
                headers: interpolatedHeaders,
                body: item.method.toUpperCase() !== 'GET' ? interpolatedBody : undefined,
            });
            const durationMs = Date.now() - start;
            const expectedStatus = item.assertions?.statusCode ?? 200;
            if (response.status !== expectedStatus) {
                passed = false;
                failureMessage = `Expected status ${expectedStatus}, received ${response.status}`;
            }
            else if (item.assertions?.maxDurationMs && durationMs > item.assertions.maxDurationMs) {
                passed = false;
                failureMessage = `Request took ${durationMs}ms, exceeded threshold of ${item.assertions.maxDurationMs}ms`;
            }
            results.push({
                name: `${item.name} [${item.method} ${interpolatedUrl}]`,
                passed,
                durationMs,
                failureMessage: failureMessage || undefined,
            });
        }
        catch (err) {
            const durationMs = Date.now() - start;
            results.push({
                name: `${item.name} [${item.method} ${interpolatedUrl}]`,
                passed: false,
                durationMs,
                failureMessage: `Network error: ${err.message}`,
            });
        }
    }
    return results;
}
//# sourceMappingURL=runner.js.map