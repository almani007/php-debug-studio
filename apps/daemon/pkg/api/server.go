package api

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"zoventra/php-debug-studio/daemon/pkg/ai"
	"zoventra/php-debug-studio/daemon/pkg/auth"
	"zoventra/php-debug-studio/daemon/pkg/dbgp"
	"zoventra/php-debug-studio/daemon/pkg/diagnostics"
	"zoventra/php-debug-studio/daemon/pkg/executor"
	"zoventra/php-debug-studio/daemon/pkg/laravel"
	"zoventra/php-debug-studio/daemon/pkg/mock"
	"zoventra/php-debug-studio/daemon/pkg/runtimes"
	"zoventra/php-debug-studio/daemon/pkg/store"
	"zoventra/php-debug-studio/daemon/pkg/webhook"
	"zoventra/php-debug-studio/daemon/pkg/ws"
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
	aiClient    *ai.Client
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
		aiClient:    ai.NewClient(""),
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
	s.mux.HandleFunc("/v1/debug/sessions/", s.handleDebugSessionAction)
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

	// Breakpoint Management (Module 10)
	s.mux.HandleFunc("/v1/debug/breakpoints", s.handleBreakpoints)
	s.mux.HandleFunc("/v1/debug/breakpoints/", s.handleBreakpointDetail)

	// SQL Analytics & Slow Query Ranking (Module 13)
	s.mux.HandleFunc("/v1/sql/analytics", s.handleSQLAnalytics)

	// Test Studio (Module 17)
	s.mux.HandleFunc("/v1/tests/runs", s.handleTestRuns)

	// Safe Artisan Runner (Module 18)
	s.mux.HandleFunc("/v1/artisan/run", s.handleArtisanRun)

	// Cookie Jar & Session State (Module 02)
	s.mux.HandleFunc("/v1/cookies", s.handleCookies)
	s.mux.HandleFunc("/v1/cookies/", s.handleCookieDetail)

	// Queue Diagnostics & Replayer (Module 20)
	s.mux.HandleFunc("/v1/queue/jobs", s.handleQueueJobs)
	s.mux.HandleFunc("/v1/queue/jobs/", s.handleQueueJobDetail)

	// Local-First AI Diagnostics with Ollama (Module 26)
	s.mux.HandleFunc("/v1/ai/diagnose", s.handleAIDiagnose)

	// Security Diagnostics Scanner (Module 19)
	s.mux.HandleFunc("/v1/security/audit", s.handleSecurityAudit)

	// Laravel Route Introspector (Module 12)
	s.mux.HandleFunc("/v1/laravel/routes", s.handleLaravelRoutes)
}

func (s *Server) handleTestRuns(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req executor.TestRunRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}

	res := executor.RunPHPTests(req)
	s.jsonResponse(w, http.StatusOK, res, nil)
}

func (s *Server) handleArtisanRun(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req executor.ArtisanRunRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}

	res := executor.RunArtisan(req)
	s.jsonResponse(w, http.StatusOK, res, nil)
}

func (s *Server) handleSQLAnalytics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	q := r.URL.Query()
	projectID := q.Get("project_id")
	slowThreshold := 50
	if th := q.Get("slow_threshold_ms"); th != "" {
		if val, err := strconv.Atoi(th); err == nil {
			slowThreshold = val
		}
	}

	analytics, err := s.store.GetSQLAnalytics(projectID, slowThreshold)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
		return
	}

	s.jsonResponse(w, http.StatusOK, analytics, nil)
}

func (s *Server) handleBreakpoints(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		projectID := r.URL.Query().Get("project_id")
		list, err := s.store.ListBreakpoints(projectID)
		if err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
			return
		}
		s.jsonResponse(w, http.StatusOK, list, nil)

	case http.MethodPost:
		var bp store.Breakpoint
		if err := json.NewDecoder(r.Body).Decode(&bp); err != nil {
			s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
			return
		}
		bpID, err := s.store.SaveBreakpoint(bp)
		if err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
			return
		}
		bp.ID = bpID
		s.jsonResponse(w, http.StatusCreated, bp, nil)

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleBreakpointDetail(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/v1/debug/breakpoints/")
	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if r.Method == http.MethodDelete {
		if err := s.store.DeleteBreakpoint(id); err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
			return
		}
		s.jsonResponse(w, http.StatusOK, map[string]string{"status": "deleted"}, nil)
		return
	}

	w.WriteHeader(http.StatusMethodNotAllowed)
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

	// Handle GET /v1/projects/{id}/export
	if strings.HasSuffix(id, "/export") {
		cleanID := strings.TrimSuffix(id, "/export")
		bundle, err := s.store.ExportSanitizedBundle(cleanID)
		if err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "EXPORT_ERROR", Message: err.Error()})
			return
		}
		s.jsonResponse(w, http.StatusOK, bundle, nil)
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

	// Automated Cookie Jar Injection (Module 02)
	parsedURL, _ := url.Parse(req.URL)
	var host string
	if parsedURL != nil {
		host = parsedURL.Hostname()
	}

	if req.ProjectID != "" && host != "" {
		if req.Headers == nil {
			req.Headers = make(map[string]string)
		}
		if _, hasCookie := req.Headers["Cookie"]; !hasCookie {
			cookies, _ := s.store.ListCookies(req.ProjectID, host)
			if len(cookies) > 0 {
				var cookiePairs []string
				for _, c := range cookies {
					if c.ExpiresAt == nil || c.ExpiresAt.After(time.Now()) {
						cookiePairs = append(cookiePairs, c.Name+"="+c.Value)
					}
				}
				if len(cookiePairs) > 0 {
					req.Headers["Cookie"] = strings.Join(cookiePairs, "; ")
				}
			}
		}
	}

	resp := s.engine.Execute(req)

	// Automated Cookie Jar Capture from Set-Cookie
	if req.ProjectID != "" && host != "" && len(resp.SetCookies) > 0 {
		dummyResp := &http.Response{Header: http.Header{"Set-Cookie": resp.SetCookies}}
		for _, parsedCookie := range dummyResp.Cookies() {
			cookieDomain := parsedCookie.Domain
			if cookieDomain == "" {
				cookieDomain = host
			}
			cookieDomain = strings.TrimPrefix(cookieDomain, ".")

			c := store.Cookie{
				ProjectID: req.ProjectID,
				Domain:    cookieDomain,
				Path:      parsedCookie.Path,
				Name:      parsedCookie.Name,
				Value:     parsedCookie.Value,
				Secure:    parsedCookie.Secure,
				HttpOnly:  parsedCookie.HttpOnly,
			}
			if !parsedCookie.Expires.IsZero() {
				c.ExpiresAt = &parsedCookie.Expires
			}
			_, _ = s.store.SaveCookie(c)
		}
		s.hub.Broadcast("cookies_updated", req.ProjectID, map[string]string{"domain": host})
	}

	s.jsonResponse(w, http.StatusOK, resp, nil)
}

func (s *Server) handleCookies(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		projectID := r.URL.Query().Get("project_id")
		domain := r.URL.Query().Get("domain")
		list, err := s.store.ListCookies(projectID, domain)
		if err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
			return
		}
		s.jsonResponse(w, http.StatusOK, list, nil)

	case http.MethodPost:
		var c store.Cookie
		if err := json.NewDecoder(r.Body).Decode(&c); err != nil {
			s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
			return
		}
		id, err := s.store.SaveCookie(c)
		if err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
			return
		}
		c.ID = id
		s.hub.Broadcast("cookies_updated", c.ProjectID, c)
		s.jsonResponse(w, http.StatusCreated, c, nil)

	case http.MethodDelete:
		projectID := r.URL.Query().Get("project_id")
		if err := s.store.ClearCookies(projectID); err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
			return
		}
		s.hub.Broadcast("cookies_cleared", projectID, map[string]string{"project_id": projectID})
		s.jsonResponse(w, http.StatusOK, map[string]string{"status": "cleared"}, nil)

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleCookieDetail(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/v1/cookies/")
	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if r.Method == http.MethodDelete {
		if err := s.store.DeleteCookie(id); err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
			return
		}
		s.jsonResponse(w, http.StatusOK, map[string]string{"status": "deleted"}, nil)
		return
	}

	w.WriteHeader(http.StatusMethodNotAllowed)
}

func (s *Server) handleQueueJobs(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		projectID := r.URL.Query().Get("project_id")
		status := r.URL.Query().Get("status")
		jobs, err := s.store.ListQueueJobs(projectID, status)
		if err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
			return
		}
		s.jsonResponse(w, http.StatusOK, jobs, nil)

	case http.MethodPost:
		var job store.QueueJob
		if err := json.NewDecoder(r.Body).Decode(&job); err != nil {
			s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
			return
		}
		id, err := s.store.SaveQueueJob(job)
		if err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
			return
		}
		job.ID = id
		s.hub.Broadcast("queue_job_logged", job.ProjectID, job)
		s.jsonResponse(w, http.StatusCreated, job, nil)

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleQueueJobDetail(w http.ResponseWriter, r *http.Request) {
	// Pattern: /v1/queue/jobs/{id}/replay
	path := strings.TrimPrefix(r.URL.Path, "/v1/queue/jobs/")
	parts := strings.Split(path, "/")
	id := parts[0]
	if id == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	if len(parts) >= 2 && parts[1] == "replay" && r.Method == http.MethodPost {
		if err := s.store.ReplayQueueJob(id); err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
			return
		}
		s.hub.Broadcast("queue_job_replayed", "", map[string]string{"id": id})
		s.jsonResponse(w, http.StatusOK, map[string]string{"status": "replayed", "id": id}, nil)
		return
	}

	w.WriteHeader(http.StatusNotFound)
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

func (s *Server) handleDebugSessionAction(w http.ResponseWriter, r *http.Request) {
	// Pattern: /v1/debug/sessions/{id}/{action} or /v1/debug/sessions/{id}
	path := strings.TrimPrefix(r.URL.Path, "/v1/debug/sessions/")
	parts := strings.Split(path, "/")
	sessionID := parts[0]
	if sessionID == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	session := s.listener.GetSession(sessionID)
	if session == nil {
		s.jsonResponse(w, http.StatusNotFound, nil, &ErrorInfo{Code: "NOT_FOUND", Message: "Debug session not found or already terminated"})
		return
	}

	if len(parts) == 1 && r.Method == http.MethodGet {
		s.jsonResponse(w, http.StatusOK, session, nil)
		return
	}

	if len(parts) < 2 {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	action := parts[1]
	switch action {
	case "step_into":
		if err := session.StepInto(); err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "STEP_ERROR", Message: err.Error()})
			return
		}
		s.jsonResponse(w, http.StatusOK, map[string]string{"status": "ok", "action": "step_into"}, nil)

	case "step_over":
		if err := session.StepOver(); err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "STEP_ERROR", Message: err.Error()})
			return
		}
		s.jsonResponse(w, http.StatusOK, map[string]string{"status": "ok", "action": "step_over"}, nil)

	case "step_out":
		if err := session.StepOut(); err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "STEP_ERROR", Message: err.Error()})
			return
		}
		s.jsonResponse(w, http.StatusOK, map[string]string{"status": "ok", "action": "step_out"}, nil)

	case "continue":
		if err := session.Continue(); err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "RUN_ERROR", Message: err.Error()})
			return
		}
		s.jsonResponse(w, http.StatusOK, map[string]string{"status": "ok", "action": "continue"}, nil)

	case "stop":
		if err := session.Stop(); err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "STOP_ERROR", Message: err.Error()})
			return
		}
		s.jsonResponse(w, http.StatusOK, map[string]string{"status": "ok", "action": "stop"}, nil)

	case "eval":
		if r.Method != http.MethodPost {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		var req struct {
			Expression string `json:"expression"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
			return
		}
		if err := session.Eval(req.Expression); err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "EVAL_ERROR", Message: err.Error()})
			return
		}
		s.jsonResponse(w, http.StatusOK, map[string]interface{}{"status": "ok", "expression": req.Expression, "result": session.LastEval}, nil)

	case "stack":
		if err := session.StackGet(); err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "STACK_ERROR", Message: err.Error()})
			return
		}
		s.jsonResponse(w, http.StatusOK, session.Frames, nil)

	default:
		w.WriteHeader(http.StatusNotFound)
	}
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

func (s *Server) handleAIDiagnose(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ContextType string `json:"context_type"`
		Content     string `json:"content"`
		Model       string `json:"model"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}

	if !s.aiClient.IsAvailable() {
		s.jsonResponse(w, http.StatusServiceUnavailable, nil, &ErrorInfo{
			Code:    "OLLAMA_OFFLINE",
			Message: "Local Ollama service is not running on 127.0.0.1:11434. Start Ollama locally with `ollama run llama3.2:3b` to enable local-first AI diagnostics without cloud tracking.",
		})
		return
	}

	var resp string
	var err error
	if req.ContextType != "" {
		resp, err = s.aiClient.Diagnose(req.ContextType, req.Content)
	} else {
		resp, err = s.aiClient.Generate(req.Model, req.Content)
	}

	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "AI_ERROR", Message: err.Error()})
		return
	}

	s.jsonResponse(w, http.StatusOK, map[string]interface{}{
		"response": resp,
		"model":    req.Model,
		"offline":  true,
	}, nil)
}

func (s *Server) handleSecurityAudit(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ProjectPath string `json:"project_path"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}

	if req.ProjectPath == "" {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "MISSING_PATH", Message: "project_path is required"})
		return
	}

	report := diagnostics.RunSecurityAudit(req.ProjectPath)
	s.hub.Broadcast("security_audit_completed", "", map[string]interface{}{"findings_count": len(report.Findings)})
	s.jsonResponse(w, http.StatusOK, report, nil)
}

func (s *Server) handleLaravelRoutes(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	projectPath := r.URL.Query().Get("project_path")
	phpBinaryPath := r.URL.Query().Get("php_binary_path")

	if projectPath == "" {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "MISSING_PATH", Message: "project_path is required"})
		return
	}

	routes, err := laravel.GetRoutes(projectPath, phpBinaryPath)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "ROUTE_INSPECTION_FAILED", Message: err.Error()})
		return
	}

	s.jsonResponse(w, http.StatusOK, routes, nil)
}
