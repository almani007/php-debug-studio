package webhook

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"time"
)

type SimulatedEvent struct {
	Provider        string            `json:"provider"`
	EventType       string            `json:"event_type"`
	Headers         map[string]string `json:"headers"`
	RawPayload      string            `json:"raw_payload"`
	ComputedSignHex string            `json:"computed_signature"`
}

// GenerateSimulatedWebhook creates sample signed webhooks for local receiver testing
func GenerateSimulatedWebhook(provider, secret string) *SimulatedEvent {
	timestamp := fmt.Sprintf("%d", time.Now().Unix())
	var eventType, payload string
	headers := make(map[string]string)

	switch provider {
	case "stripe":
		eventType = "payment_intent.succeeded"
		payload = fmt.Sprintf(`{
			"id": "evt_%s",
			"object": "event",
			"type": "payment_intent.succeeded",
			"created": %s,
			"data": {
				"object": {
					"id": "pi_sample_123",
					"amount": 4900,
					"currency": "usd",
					"status": "succeeded"
				}
			}
		}`, timestamp, timestamp)

		// Stripe v1 signature format: t=timestamp,v1=signature
		mac := hmac.New(sha256.New, []byte(secret))
		mac.Write([]byte(fmt.Sprintf("%s.%s", timestamp, payload)))
		sig := hex.EncodeToString(mac.Sum(nil))

		headers["Stripe-Signature"] = fmt.Sprintf("t=%s,v1=%s", timestamp, sig)
		headers["Content-Type"] = "application/json"

		return &SimulatedEvent{
			Provider:        "stripe",
			EventType:       eventType,
			Headers:         headers,
			RawPayload:      payload,
			ComputedSignHex: sig,
		}

	case "github":
		fallthrough
	default:
		eventType = "push"
		payload = `{
			"ref": "refs/heads/main",
			"repository": {
				"name": "php-debug-studio",
				"full_name": "zoventra/php-debug-studio"
			},
			"pusher": {
				"name": "developer"
			}
		}`

		mac := hmac.New(sha256.New, []byte(secret))
		mac.Write([]byte(payload))
		sig := hex.EncodeToString(mac.Sum(nil))

		headers["X-GitHub-Event"] = "push"
		headers["X-Hub-Signature-256"] = "sha256=" + sig
		headers["Content-Type"] = "application/json"

		return &SimulatedEvent{
			Provider:        "github",
			EventType:       eventType,
			Headers:         headers,
			RawPayload:      payload,
			ComputedSignHex: sig,
		}
	}
}
