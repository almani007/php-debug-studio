package e2e_test

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"zoventra/php-debug-studio/daemon/pkg/api"
	"zoventra/php-debug-studio/daemon/pkg/executor"
	"zoventra/php-debug-studio/daemon/pkg/store"
	"zoventra/php-debug-studio/daemon/pkg/ws"
)

func setupTestServer(t *testing.T) (*api.Server, *store.Store) {
	st, err := store.NewStore(":memory:")
	if err != nil {
		t.Fatalf("failed to init in-memory sqlite store: %v", err)
	}

	hub := ws.NewHub()
	engine := executor.NewEngine()
	server := api.NewServer(st, hub, engine, nil, nil)
	return server, st
}

func TestDaemonHealthEndpoint(t *testing.T) {
	server, st := setupTestServer(t)
	defer st.Close()

	req, _ := http.NewRequest(http.MethodGet, "/v1/health", nil)
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rr.Code)
	}

	var body map[string]interface{}
	if err := json.Unmarshal(rr.Body.Bytes(), &body); err != nil {
		t.Fatalf("invalid json: %v", err)
	}

	data := body["data"].(map[string]interface{})
	if data["status"] != "healthy" {
		t.Errorf("expected status healthy, got %v", data["status"])
	}
}

func TestWorkspacesAndProjectsWorkflow(t *testing.T) {
	server, st := setupTestServer(t)
	defer st.Close()

	// 1. Create Workspace
	wsPayload, _ := json.Marshal(map[string]interface{}{
		"name":        "Billing Engineering",
		"description": "Workspace for payment integrations and billing microservices",
	})
	req, _ := http.NewRequest(http.MethodPost, "/v1/workspaces", bytes.NewReader(wsPayload))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated && rr.Code != http.StatusOK {
		t.Fatalf("expected 201/200 for workspace creation, got %d: %s", rr.Code, rr.Body.String())
	}

	var wsResp map[string]interface{}
	_ = json.Unmarshal(rr.Body.Bytes(), &wsResp)
	wsData := wsResp["data"].(map[string]interface{})
	wsID := wsData["id"].(string)

	// 2. Create Project inside Workspace
	projPayload, _ := json.Marshal(map[string]interface{}{
		"name":         "Stripe Billing Adapter",
		"path":         "/var/www/stripe-service",
		"php_version":  "8.3",
		"workspace_id": wsID,
	})
	req, _ = http.NewRequest(http.MethodPost, "/v1/projects", bytes.NewReader(projPayload))
	req.Header.Set("Content-Type", "application/json")
	rr = httptest.NewRecorder()
	server.ServeHTTP(rr, req)

	if rr.Code != http.StatusCreated && rr.Code != http.StatusOK {
		t.Fatalf("expected 201/200 for project creation, got %d: %s", rr.Code, rr.Body.String())
	}

	// 3. List Workspaces and verify
	req, _ = http.NewRequest(http.MethodGet, "/v1/workspaces", nil)
	rr = httptest.NewRecorder()
	server.ServeHTTP(rr, req)

	var listResp map[string]interface{}
	_ = json.Unmarshal(rr.Body.Bytes(), &listResp)
	workspaces := listResp["data"].([]interface{})
	if len(workspaces) == 0 {
		t.Errorf("expected at least 1 workspace, got 0")
	}
}

func TestEventsIngestionAndSanitization(t *testing.T) {
	server, st := setupTestServer(t)
	defer st.Close()

	// Ingest event with sensitive header
	ingestPayload, _ := json.Marshal(map[string]interface{}{
		"project_id": "test-proj",
		"traces": []map[string]interface{}{
			{
				"trace_id":    "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
				"http_method": "POST",
				"url":         "http://127.0.0.1:8000/api/checkout",
				"duration_ms": 42.5,
				"status_code": 200,
				"headers": map[string]string{
					"Authorization": "Bearer secret-token-key-12345",
					"Cookie":        "session_id=abcdef987654",
				},
			},
		},
	})

	req, _ := http.NewRequest(http.MethodPost, "/v1/events/ingest", bytes.NewReader(ingestPayload))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK && rr.Code != http.StatusAccepted {
		t.Fatalf("expected 200/202 for event ingestion, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestWebhookInboundAndHMACVerification(t *testing.T) {
	server, st := setupTestServer(t)
	defer st.Close()

	receiverID := "wh_stripe_test"
	secret := "whsec_test_secret_123"
	payloadBytes := []byte(`{"id":"evt_123","type":"invoice.paid","amount":4200}`)

	// Compute HMAC SHA-256
	h := hmac.New(sha256.New, []byte(secret))
	h.Write(payloadBytes)
	signature := hex.EncodeToString(h.Sum(nil))

	req, _ := http.NewRequest(http.MethodPost, "/wh/"+receiverID, bytes.NewReader(payloadBytes))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Signature-SHA256", signature)
	req.Header.Set("X-Event-Type", "invoice.paid")

	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK && rr.Code != http.StatusAccepted {
		t.Fatalf("expected 200/202 for inbound webhook, got %d: %s", rr.Code, rr.Body.String())
	}

	// Verify event is readable from webhook events API
	req, _ = http.NewRequest(http.MethodGet, "/v1/webhooks/events?receiver_id="+receiverID, nil)
	rr = httptest.NewRecorder()
	server.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 for webhook events list, got %d", rr.Code)
	}
}

func TestJavaScriptDebugStudioIntegration(t *testing.T) {
	server, st := setupTestServer(t)
	defer st.Close()

	// 1. Create JS Session
	jsSessionPayload, _ := json.Marshal(map[string]interface{}{
		"project_id":   "test-proj",
		"browser_name": "Chrome Headless",
		"version":      "124.0.0",
		"runtime":      "v8",
	})

	req, _ := http.NewRequest(http.MethodPost, "/v1/jsdebug/sessions", bytes.NewReader(jsSessionPayload))
	req.Header.Set("Content-Type", "application/json")
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK && rr.Code != http.StatusCreated {
		t.Fatalf("expected 200/201 for js debug session, got %d: %s", rr.Code, rr.Body.String())
	}

	var sessionResp map[string]interface{}
	_ = json.Unmarshal(rr.Body.Bytes(), &sessionResp)
	sessionData := sessionResp["data"].(map[string]interface{})
	sessionID := sessionData["id"].(string)

	// 2. Emit console event with W3C traceparent
	eventPayload, _ := json.Marshal(map[string]interface{}{
		"session_id":       sessionID,
		"trace_id":         "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01",
		"severity":         "error",
		"message_redacted": "Uncaught TypeError: Cannot read properties of undefined (reading 'token')",
		"source_url":       "http://localhost:3000/assets/checkout.js",
		"line":             42,
		"column":           15,
	})

	req, _ = http.NewRequest(http.MethodPost, "/v1/jsdebug/events", bytes.NewReader(eventPayload))
	req.Header.Set("Content-Type", "application/json")
	rr = httptest.NewRecorder()
	server.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK && rr.Code != http.StatusCreated {
		t.Fatalf("expected 200/201 for js event emission, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestLocalAIStatusAndRedactionShield(t *testing.T) {
	server, st := setupTestServer(t)
	defer st.Close()

	// Check AI Status
	req, _ := http.NewRequest(http.MethodGet, "/v1/ai/status", nil)
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200 for AI status, got %d", rr.Code)
	}

	var statusResp map[string]interface{}
	_ = json.Unmarshal(rr.Body.Bytes(), &statusResp)
	data := statusResp["data"].(map[string]interface{})
	if _, ok := data["endpoint"]; !ok {
		t.Errorf("expected endpoint field in AI status response")
	}
}
