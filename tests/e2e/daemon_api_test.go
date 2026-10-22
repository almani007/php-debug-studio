package e2e_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"zoventra/php-debug-studio/daemon/pkg/api"
	"zoventra/php-debug-studio/daemon/pkg/executor"
	"zoventra/php-debug-studio/daemon/pkg/store"
	"zoventra/php-debug-studio/daemon/pkg/ws"
)

func TestDaemonHealthEndpoint(t *testing.T) {
	st, err := store.NewStore(":memory:")
	if err != nil {
		t.Fatalf("failed to init in-memory sqlite: %v", err)
	}
	defer st.Close()

	hub := ws.NewHub()
	engine := executor.NewEngine()
	server := api.NewServer(st, hub, engine, nil, nil)

	req, _ := http.NewRequest(http.MethodGet, "/v1/health", nil)
	rr := httptest.NewRecorder()
	server.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
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
