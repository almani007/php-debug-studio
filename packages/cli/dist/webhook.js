"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.simulateWebhookCli = simulateWebhookCli;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Webhook testing and dispatch simulator for CLI
 */
async function simulateWebhookCli(receiverId, event, payload, secret = '', daemonUrl = 'http://127.0.0.1:8765') {
    const url = `${daemonUrl}/wh/${receiverId}`;
    const rawBody = JSON.stringify(payload);
    const headers = {
        'Content-Type': 'application/json',
        'X-Event-Type': event,
        'User-Agent': 'PHP-Debug-Studio-CLI/1.0',
    };
    if (secret) {
        const hmac = crypto_1.default.createHmac('sha256', secret);
        hmac.update(rawBody);
        headers['X-Signature-SHA256'] = hmac.digest('hex');
    }
    const res = await fetch(url, {
        method: 'POST',
        headers,
        body: rawBody,
    });
    const body = await res.text();
    return { status: res.status, body };
}
//# sourceMappingURL=webhook.js.map