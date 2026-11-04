"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.importOpenApi = importOpenApi;
exports.importPostman = importPostman;
function importOpenApi(openApiDoc) {
    const collectionName = openApiDoc.info?.title || 'OpenAPI Collection';
    const requests = [];
    const paths = openApiDoc.paths || {};
    for (const [pathKey, pathItem] of Object.entries(paths)) {
        const methods = ['get', 'post', 'put', 'delete', 'patch'];
        for (const method of methods) {
            if (pathItem[method]) {
                const op = pathItem[method];
                const reqName = op.summary || `${method.toUpperCase()} ${pathKey}`;
                requests.push({
                    name: reqName,
                    method: method.toUpperCase(),
                    url: `{{baseUrl}}${pathKey}`,
                    headers: {
                        Accept: 'application/json',
                    },
                    assertions: {
                        statusCode: 200,
                    },
                });
            }
        }
    }
    return {
        name: collectionName,
        requests,
    };
}
function importPostman(postmanDoc) {
    const collectionName = postmanDoc.info?.name || 'Postman Collection';
    const requests = [];
    function parseItems(items) {
        for (const item of items) {
            if (item.item && Array.isArray(item.item)) {
                parseItems(item.item);
            }
            else if (item.request) {
                const req = item.request;
                const method = (req.method || 'GET').toUpperCase();
                let rawUrl = '';
                if (typeof req.url === 'string') {
                    rawUrl = req.url;
                }
                else if (req.url?.raw) {
                    rawUrl = req.url.raw;
                }
                const headers = {};
                if (Array.isArray(req.header)) {
                    for (const h of req.header) {
                        if (h.key && h.value && !h.disabled) {
                            headers[h.key] = h.value;
                        }
                    }
                }
                requests.push({
                    name: item.name || `${method} ${rawUrl}`,
                    method,
                    url: rawUrl,
                    headers,
                    body: req.body?.raw || undefined,
                    assertions: {
                        statusCode: 200,
                    },
                });
            }
        }
    }
    if (Array.isArray(postmanDoc.item)) {
        parseItems(postmanDoc.item);
    }
    return {
        name: collectionName,
        requests,
    };
}
//# sourceMappingURL=openapi.js.map