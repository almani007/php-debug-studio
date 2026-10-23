import crypto from 'crypto';

/**
 * Webhook testing and dispatch simulator for CLI
 */
export async function simulateWebhookCli(
  receiverId: string,
  event: string,
  payload: Record<string, any>,
  secret: string = '',
  daemonUrl: string = 'http://127.0.0.1:8765'
): Promise<{ status: number; body: string }> {
  const url = `${daemonUrl}/wh/${receiverId}`;
  const rawBody = JSON.stringify(payload);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Event-Type': event,
    'User-Agent': 'PHP-Debug-Studio-CLI/1.0',
  };

  if (secret) {
    const hmac = crypto.createHmac('sha256', secret);
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
