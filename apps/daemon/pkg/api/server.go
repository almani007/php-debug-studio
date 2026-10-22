package api

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/zoventra/php-debug-studio/daemon/pkg/auth"
	"github.com/zoventra/php-debug-studio/daemon/pkg/dbgp"
	"github.com/zoventra/php-debug-studio/daemon/pkg/executor"
	"github.com/zoventra/php-debug-studio/daemon/pkg/mock"
	"github.com/zoventra/php-debug-studio/daemon/pkg/runtimes"
	"github.com/zoventra/php-debug-studio/daemon/pkg/store"
	"github.com/zoventra/php-debug-studio/daemon/pkg/webhook"
	"github.com/zoventra/php-debug-studio/daemon/pkg/ws"
)

type Server struct {
	store       *store.Store
	hub         *ws.Hub
	engine      *executor.Engine
	graphQL     *executor.GraphQLEngine
	grpcEngine  *executor.GRPCEngine
	listener    *dbgp.Listener
	mockServer  *mock.MockServer
	phpDetector *runtimes.PhpDetector
	mux         *http.ServeMux
}

type ResponseEnvelope struct {
	Data  interface{} `json:"data"`
	Meta  MetaInfo    `json:"meta"`
	Error *ErrorInfo  `json:"error"`
}

type MetaInfo struct {
	RequestID string `json:"requestId"`
	Timestamp string `json:"timestamp"`
}

type ErrorInfo struct {
	Code    string      `json:"code"`
	Message string      `json:"message"`
	Details interface{} `json:"details,omitempty"`
}

func NewServer(s *store.Store, h *ws.Hub, e *executor.Engine, l *dbgp.Listener, m *mock.MockServer) *Server {
	if m == nil {
		m = mock.NewMockServer()
	}
	srv := &Server{
		store:       s,
		hub:         h,
		engine:      e,
		graphQL:     executor.NewGraphQLEngine(),
		grpcEngine:  executor.NewGRPCEngine(),
		listener:    l,
		mockServer:  m,
		phpDetector: runtimes.NewPhpDetector(),
		mux:         http.NewServeMux(),
	}
	srv.registerRoutes()
	return srv
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// CORS headers for local developer access
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	s.mux.ServeHTTP(w, r)
}

func (s *Server) jsonResponse(w http.ResponseWriter, status int, data interface{}, errInfo *ErrorInfo) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)

	envelope := ResponseEnvelope{
		Data: data,
		Meta: MetaInfo{
			RequestID: uuid.New().String(),
			Timestamp: time.Now().UTC().Format(time.RFC3339),
		},
		Error: errInfo,
	}
	_ = json.NewEncoder(w).Encode(envelope)
}

func (s *Server) registerRoutes() {
	s.mux.HandleFunc("/v1/health", s.handleHealth)
	s.mux.HandleFunc("/v1/projects", s.handleProjects)
	s.mux.HandleFunc("/v1/projects/", s.handleProjectDetail)
	s.mux.HandleFunc("/v1/requests/execute", s.handleExecuteRequest)
	s.mux.HandleFunc("/v1/events/ingest", s.handleIngestEvents)
	s.mux.HandleFunc("/v1/traces", s.handleTraces)
	s.mux.HandleFunc("/v1/traces/", s.handleTraceDetail)
	s.mux.HandleFunc("/v1/debug/sessions", s.handleDebugSessions)
	s.mux.HandleFunc("/v1/events/stream", s.hub.HandleWebSocket)

	// Webhook endpoint
	s.mux.HandleFunc("/wh/", s.handleIncomingWebhook)

	// Local Mock Server (Module 09)
	s.mux.HandleFunc("/v1/mocks", s.handleMocks)
	s.mux.Handle("/mock/", http.StripPrefix("/mock", s.mockServer))

	// PHP Runtimes (Module 25 & User Selectable Versions)
	s.mux.HandleFunc("/v1/runtimes/php", s.handlePhpRuntimes)

	// Settings & Data Retention Purge (Module 21 & NFR-06)
	s.mux.HandleFunc("/v1/settings/purge", s.handlePurge)

	// GraphQL Engine (Module 05)
	s.mux.HandleFunc("/v1/graphql/execute", s.handleGraphQLExecute)

	// Webhook Simulator (Module 22 & WH-007)
	s.mux.HandleFunc("/v1/webhooks/simulate", s.handleWebhookSimulate)

	// OAuth2 PKCE (Module 04)
	s.mux.HandleFunc("/v1/auth/pkce", s.handleAuthPKCE)

	// Audit Logging (Module 25 & SEC-10)
	s.mux.HandleFunc("/v1/audit", s.handleAuditEvents)

	// gRPC Engine (Module 07)
	s.mux.HandleFunc("/v1/grpc/execute", s.handleGRPCExecute)

	// Log Explorer & Search (Module 16)
	s.mux.HandleFunc("/v1/logs", s.handleLogSearch)

	// Webhook Deliveries (Module 22)
	s.mux.HandleFunc("/v1/webhooks/deliveries", s.handleWebhookDeliveries)
}

func (s *Server) handleGRPCExecute(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req executor.GRPCRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}

	res := s.grpcEngine.ExecuteUnary(req)
	s.jsonResponse(w, http.StatusOK, res, nil)
}

func (s *Server) handleLogSearch(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	q := r.URL.Query()
	limit := 100
	if l := q.Get("limit"); l != "" {
		if val, err := strconv.Atoi(l); err == nil {
			limit = val
		}
	}

	filter := store.LogFilter{
		ProjectID: q.Get("project_id"),
		TraceID:   q.Get("trace_id"),
		Level:     q.Get("level"),
		Channel:   q.Get("channel"),
		Search:    q.Get("search"),
		Limit:     limit,
	}

	logs, err := s.store.SearchLogs(filter)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
		return
	}

	s.jsonResponse(w, http.StatusOK, logs, nil)
}

func (s *Server) handleWebhookDeliveries(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	eventID := r.URL.Query().Get("event_id")
	deliveries, err := s.store.ListWebhookDeliveries(eventID, 50)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
		return
	}

	s.jsonResponse(w, http.StatusOK, deliveries, nil)
}

func (s *Server) handleAuthPKCE(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	challenge, err := auth.GeneratePKCE()
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "PKCE_ERROR", Message: err.Error()})
		return
	}
	s.jsonResponse(w, http.StatusOK, challenge, nil)
}

func (s *Server) handleAuditEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	events, err := s.store.ListAuditEvents(50)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
		return
	}
	s.jsonResponse(w, http.StatusOK, events, nil)
}

func (s *Server) handleGraphQLExecute(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req executor.GraphQLRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}

	res, err := s.graphQL.Execute(req)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "GRAPHQL_ERROR", Message: err.Error()})
		return
	}

	s.jsonResponse(w, http.StatusOK, res, nil)
}

func (s *Server) handleWebhookSimulate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Provider string `json:"provider"`
		Secret   string `json:"secret"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	if req.Secret == "" {
		req.Secret = "whsec_sample_secret_key"
	}

	simulated := webhook.GenerateSimulatedWebhook(req.Provider, req.Secret)
	s.jsonResponse(w, http.StatusOK, simulated, nil)
}

func (s *Server) handlePurge(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		RetentionDays int `json:"retention_days"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	days := req.RetentionDays
	if days <= 0 {
		days = 7
	}

	summary, err := s.store.PurgeOldTelemetry(days)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "PURGE_ERROR", Message: err.Error()})
		return
	}

	s.jsonResponse(w, http.StatusOK, summary, nil)
}

func (s *Server) handlePhpRuntimes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	runtimesList := s.phpDetector.DetectAvailableRuntimes()
	s.jsonResponse(w, http.StatusOK, runtimesList, nil)
}

func (s *Server) handleMocks(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		projectID := r.URL.Query().Get("project_id")
		rules := s.mockServer.GetRules(projectID)
		s.jsonResponse(w, http.StatusOK, rules, nil)

	case http.MethodPost:
		var rule mock.MockRule
		if err := json.NewDecoder(r.Body).Decode(&rule); err != nil {
			s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
			return
		}
		if rule.ID == "" {
			rule.ID = uuid.New().String()
		}
		rule.Enabled = true
		s.mockServer.AddRule(&rule)
		s.jsonResponse(w, http.StatusCreated, rule, nil)

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	health := map[string]interface{}{
		"status":    "healthy",
		"version":   "1.0.0-baseline",
		"engine":    "PHP Debug Studio Daemon",
		"author":    "zoventra",
		"dbgp_port": 9003,
	}
	s.jsonResponse(w, http.StatusOK, health, nil)
}

func (s *Server) handleProjects(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		projects, err := s.store.ListProjects()
		if err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{
				Code:    "DB_ERROR",
				Message: err.Error(),
			})
			return
		}
		s.jsonResponse(w, http.StatusOK, projects, nil)

	case http.MethodPost:
		var req struct {
			Name           string `json:"name"`
			Slug           string `json:"slug"`
			Framework      string `json:"framework"`
			PhpVersion     string `json:"php_version"`
			PhpBinaryPath  string `json:"php_binary_path"`
			RootPath       string `json:"root_path"`
			AppUrl         string `json:"app_url"`
			ConnectionMode string `json:"connection_mode"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{
				Code:    "INVALID_JSON",
				Message: err.Error(),
			})
			return
		}

		if req.Name == "" || req.RootPath == "" {
			s.jsonResponse(w, http.StatusUnprocessableEntity, nil, &ErrorInfo{
				Code:    "VALIDATION_ERROR",
				Message: "name and root_path are required",
			})
			return
		}

		slug := req.Slug
		if slug == "" {
			slug = strings.ToLower(strings.ReplaceAll(req.Name, " ", "-"))
		}

		now := time.Now().UTC()
		p := store.Project{
			ID:             uuid.New().String(),
			Name:           req.Name,
			Slug:           slug,
			Framework:      req.Framework,
			PhpVersion:     req.PhpVersion,
			PhpBinaryPath:  req.PhpBinaryPath,
			RootPath:       req.RootPath,
			AppUrl:         req.AppUrl,
			ConnectionMode: req.ConnectionMode,
			CreatedAt:      now,
			UpdatedAt:      now,
		}

		if err := s.store.CreateProject(p); err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{
				Code:    "DB_ERROR",
				Message: err.Error(),
			})
			return
		}

		s.jsonResponse(w, http.StatusCreated, p, nil)

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleProjectDetail(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/v1/projects/")
	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	// Handle PATCH /v1/projects/{id}/php or /v1/projects/{id}
	if r.Method == http.MethodPatch {
		var req struct {
			PhpVersion    string `json:"php_version"`
			PhpBinaryPath string `json:"php_binary_path"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
			return
		}
		cleanID := strings.TrimSuffix(id, "/php")
		if err := s.store.UpdateProjectPhpVersion(cleanID, req.PhpVersion, req.PhpBinaryPath); err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
			return
		}
		s.jsonResponse(w, http.StatusOK, map[string]interface{}{"status": "updated", "php_version": req.PhpVersion, "php_binary_path": req.PhpBinaryPath}, nil)
		return
	}

	p, err := s.store.GetProject(id)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
		return
	}
	if p == nil {
		s.jsonResponse(w, http.StatusNotFound, nil, &ErrorInfo{Code: "NOT_FOUND", Message: "Project not found"})
		return
	}

	s.jsonResponse(w, http.StatusOK, p, nil)
}

func (s *Server) handleExecuteRequest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req executor.ExecutionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}

	resp := s.engine.Execute(req)
	s.jsonResponse(w, http.StatusOK, resp, nil)
}

type IngestPayload struct {
	ProjectID string            `json:"project_id"`
	Trace     *store.Trace      `json:"trace,omitempty"`
	Spans     []store.Span      `json:"spans,omitempty"`
	Queries   []store.SQLQuery  `json:"queries,omitempty"`
	Logs      []store.LogEntry  `json:"logs,omitempty"`
	Errors    []store.ErrorIssue `json:"errors,omitempty"`
}

func (s *Server) handleIngestEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var payload IngestPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}

	if payload.Trace != nil {
		if payload.Trace.ID == "" {
			payload.Trace.ID = uuid.New().String()
		}
		_ = s.store.InsertTrace(*payload.Trace)
		s.hub.Broadcast("trace_created", payload.ProjectID, payload.Trace)
	}

	for _, span := range payload.Spans {
		if span.ID == "" {
			span.ID = uuid.New().String()
		}
		_ = s.store.InsertSpan(span)
	}

	for _, query := range payload.Queries {
		if query.ID == "" {
			query.ID = uuid.New().String()
		}
		_ = s.store.InsertSQLQuery(query)
		s.hub.Broadcast("sql_query", payload.ProjectID, query)
	}

	for _, log := range payload.Logs {
		if log.ID == "" {
			log.ID = uuid.New().String()
		}
		_ = s.store.InsertLog(log)
		s.hub.Broadcast("log_entry", payload.ProjectID, log)
	}

	s.jsonResponse(w, http.StatusOK, map[string]string{"status": "ingested"}, nil)
}

func (s *Server) handleTraces(w http.ResponseWriter, r *http.Request) {
	projectID := r.URL.Query().Get("project_id")
	limitStr := r.URL.Query().Get("limit")
	limit := 50
	if limitStr != "" {
		if val, err := strconv.Atoi(limitStr); err == nil {
			limit = val
		}
	}

	traces, err := s.store.ListTraces(projectID, limit)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
		return
	}

	s.jsonResponse(w, http.StatusOK, traces, nil)
}

func (s *Server) handleTraceDetail(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/v1/traces/")
	trace, spans, queries, logs, err := s.store.GetTraceWithDetails(id)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
		return
	}
	if trace == nil {
		s.jsonResponse(w, http.StatusNotFound, nil, &ErrorInfo{Code: "NOT_FOUND", Message: "Trace not found"})
		return
	}

	result := map[string]interface{}{
		"trace":   trace,
		"spans":   spans,
		"queries": queries,
		"logs":    logs,
	}
	s.jsonResponse(w, http.StatusOK, result, nil)
}

func (s *Server) handleDebugSessions(w http.ResponseWriter, r *http.Request) {
	sessions := s.listener.GetSessions()
	s.jsonResponse(w, http.StatusOK, sessions, nil)
}

func (s *Server) handleIncomingWebhook(w http.ResponseWriter, r *http.Request) {
	receiverID := strings.TrimPrefix(r.URL.Path, "/wh/")
	body, _ := io.ReadAll(io.LimitReader(r.Body, 10*1024*1024))

	// Hash body for idempotency and signature verification
	hash := sha256.Sum256(body)
	bodySha := hex.EncodeToString(hash[:])

	event := map[string]interface{}{
		"id":          uuid.New().String(),
		"receiver_id": receiverID,
		"method":      r.Method,
		"headers":     r.Header,
		"body_sha256": bodySha,
		"received_at": time.Now().UTC().Format(time.RFC3339),
	}

	s.hub.Broadcast("webhook_received", receiverID, event)
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"received":true}`))
}

// VerifySignature checks HMAC SHA-256 webhook signatures
func VerifySignature(secret string, payload []byte, signature string) bool {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expectedMAC := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(signature), []byte(expectedMAC))
}
