# ADR-008: Loopback Webhook Receiver & Verification Studio

## Status
Accepted

## Context
Developing and testing webhook handlers (Stripe payments, GitHub actions, Shopify orders) typically requires running third-party tunneling software (e.g. ngrok) or exposing local ports to the public internet. Furthermore, validating HMAC signatures and replaying failed payloads locally is tedious without dedicated tooling.

## Decision
Implement Webhook Studio within the local Go daemon (Module 22):
1. Expose dedicated loopback endpoints at `/wh/{receiver_id}` to accept inbound payloads directly.
2. Provide constant-time HMAC SHA-256 signature verification (`hash_equals`) and automatic provider format detection (Stripe `Stripe-Signature`, GitHub `X-Hub-Signature-256`, Shopify `X-Shopify-Hmac-SHA256`).
3. Store payloads in SQLite with sanitized headers and body previews.
4. Provide local replay capabilities to re-send captured webhooks to application endpoints with simulated latency or network failure injection.

## Consequences
- **Positive**: Eliminates external tunneling dependencies for simulated testing, provides local payload history and signature debugging, zero risk of third-party proxy eavesdropping.
- **Negative**: Receiving live external webhooks from cloud providers still requires local port forwarding or tunneling if invoked directly from the cloud.
