package api

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"brixel/php-debug-studio/daemon/pkg/ai"
	"brixel/php-debug-studio/daemon/pkg/auth"
	"brixel/php-debug-studio/daemon/pkg/dbgp"
	"brixel/php-debug-studio/daemon/pkg/dbwatch"
	"brixel/php-debug-studio/daemon/pkg/diagnostics"
	"brixel/php-debug-studio/daemon/pkg/executor"
	"brixel/php-debug-studio/daemon/pkg/laravel"
	"brixel/php-debug-studio/daemon/pkg/mock"
	"brixel/php-debug-studio/daemon/pkg/monitor"
	"brixel/php-debug-studio/daemon/pkg/qa"
	"brixel/php-debug-studio/daemon/pkg/runtimes"
	"brixel/php-debug-studio/daemon/pkg/store"
	"brixel/php-debug-studio/daemon/pkg/webhook"
	"brixel/php-debug-studio/daemon/pkg/ws"
)

type Server struct {
	store       *store.Store
	hub         *ws.Hub
	engine      *executor.Engine
	graphQL     *executor.GraphQLEngine
	grpcEngine  *executor.GRPCEngine
	listener    *dbgp.Listener
	dbWatcher   *dbwatch.Watcher
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

// SetDBWatcher attaches the live SQL capture watcher to the API server.
func (s *Server) SetDBWatcher(w *dbwatch.Watcher) {
	s.dbWatcher = w
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
	s.mux.HandleFunc("/v1/workspaces", s.handleWorkspaces)
	s.mux.HandleFunc("/v1/workspaces/", s.handleWorkspaceDetail)
	s.mux.HandleFunc("/v1/requests/execute", s.handleExecuteRequest)
	s.mux.HandleFunc("/v1/events/ingest", s.handleIngestEvents)
	s.mux.HandleFunc("/v1/traces", s.handleTraces)
	s.mux.HandleFunc("/v1/traces/", s.handleTraceDetail)
	s.mux.HandleFunc("/v1/debug/sessions", s.handleDebugSessions)
	s.mux.HandleFunc("/v1/debug/sessions/", s.handleDebugSessionAction)
	s.mux.HandleFunc("/v1/debug/start", s.handleDebugStart)
	s.registerXdebugRoutes()
	s.registerDBLiveRoutes()
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

	// Webhook Deliveries & Events (Module 22)
	s.mux.HandleFunc("/v1/webhooks/deliveries", s.handleWebhookDeliveries)
	s.mux.HandleFunc("/v1/webhooks/events", s.handleWebhookEvents)
	s.mux.HandleFunc("/v1/webhooks/verify", s.handleWebhookVerify)

	// JavaScript Debug Studio (Module 23)
	s.mux.HandleFunc("/v1/jsdebug/sessions", s.handleJSDebugSessions)
	s.mux.HandleFunc("/v1/jsdebug/sessions/", s.handleJSDebugSessionDetail)
	s.mux.HandleFunc("/v1/jsdebug/events", s.handleJSConsoleEvents)

	// Database Debug Studio & Solution Advisor (Module 24)
	s.mux.HandleFunc("/v1/db/connections", s.handleDBConnections)
	s.mux.HandleFunc("/v1/db/connections/", s.handleDBConnectionDetail)
	s.mux.HandleFunc("/v1/db/analyze", s.handleDBAnalyze)
	s.mux.HandleFunc("/v1/db/findings", s.handleDBFindings)
	s.mux.HandleFunc("/v1/db/recommendations/", s.handleDBRecommendationDetail)
	s.mux.HandleFunc("/v1/db/explain", s.handleDBExplain)
	s.mux.HandleFunc("/v1/db/query", s.handleDBQuery)
	s.mux.HandleFunc("/v1/db/schema", s.handleDBSchema)
	s.mux.HandleFunc("/v1/db/connections/test", s.handleDBConnectionTest)
	s.mux.HandleFunc("/v1/db/table/data", s.handleDBTableData)
	s.mux.HandleFunc("/v1/db/table/row", s.handleDBTableRow)
	s.mux.HandleFunc("/v1/db/table/truncate", s.handleDBTableTruncate)
	s.mux.HandleFunc("/v1/db/table/drop", s.handleDBTableDrop)
	s.mux.HandleFunc("/v1/db/table/ddl", s.handleDBTableDDL)
	s.mux.HandleFunc("/v1/db/relations", s.handleDBRelations)
	s.mux.HandleFunc("/v1/db/stats", s.handleDBStats)
	s.mux.HandleFunc("/v1/db/optimize", s.handleDBOptimize)
	s.mux.HandleFunc("/v1/db/processes", s.handleDBProcesses)
	s.mux.HandleFunc("/v1/db/backup", s.handleDBBackup)
	s.mux.HandleFunc("/v1/db/restore", s.handleDBRestore)
	s.mux.HandleFunc("/v1/db/diff", s.handleDBDiff)
	s.mux.HandleFunc("/v1/db/transfer", s.handleDBTransfer)
	s.mux.HandleFunc("/v1/db/table/filtered", s.handleDBTableFiltered)

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
	s.mux.HandleFunc("/v1/ai/status", s.handleAIStatus)
	s.mux.HandleFunc("/v1/ai/diagnose", s.handleAIDiagnose)
	s.mux.HandleFunc("/v1/ai/explain-error", s.handleAIExplainError)
	s.mux.HandleFunc("/v1/ai/optimize-query", s.handleAIOptimizeQuery)

	// Security Diagnostics Scanner (Module 19)
	s.mux.HandleFunc("/v1/security/audit", s.handleSecurityAudit)

	// Laravel Route Introspector (Module 12)
	s.mux.HandleFunc("/v1/laravel/routes", s.handleLaravelRoutes)

	// QA Studio Engine (Smoke Crawler, Boundary Fuzzing, Concurrency Load SLA)
	s.mux.HandleFunc("/v1/qa/smoke", s.handleQASmoke)
	s.mux.HandleFunc("/v1/qa/fuzz", s.handleQAFuzz)
	s.mux.HandleFunc("/v1/qa/benchmark", s.handleQABenchmark)

	// Enhanced QA & DB Management routes
	s.registerEnhancedRoutes()

	// Line Trace Mode - auto-step through every line without breakpoints
	s.registerTraceRoutes()

	// Live Project Monitor & Security Guard
	s.mux.HandleFunc("/v1/monitor/probe", s.handleMonitorProbe)

	// Builtin Web Inspector & Live Browser Proxy (ChatGPT-style inspection)
	s.mux.HandleFunc("/v1/browser/proxy", s.handleBrowserProxy)

	// Web UI SPA Static Server (Module 01 Cockpit)
	webDir := os.Getenv("DEBUG_STUDIO_WEB_DIST")
	if webDir == "" {
		for _, candidate := range []string{"../web/dist", "apps/web/dist", "/app/web/dist", "./web/dist"} {
			if fi, err := os.Stat(candidate); err == nil && fi.IsDir() {
				webDir = candidate
				break
			}
		}
	}
	if webDir != "" {
		fs := http.FileServer(http.Dir(webDir))
		s.mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			// Don't intercept API routes
			if strings.HasPrefix(r.URL.Path, "/v1/") || strings.HasPrefix(r.URL.Path, "/wh/") || strings.HasPrefix(r.URL.Path, "/mock/") {
				http.NotFound(w, r)
				return
			}
			targetPath := filepath.Join(webDir, filepath.Clean(r.URL.Path))
			if fInfo, statErr := os.Stat(targetPath); statErr == nil && !fInfo.IsDir() {
				fs.ServeHTTP(w, r)
				return
			}
			http.ServeFile(w, r, filepath.Join(webDir, "index.html"))
		})
	}
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
		"author":    "brixel",
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

	// Handle DELETE /v1/projects/{id}
	if r.Method == http.MethodDelete && !strings.Contains(id, "/") {
		if err := s.store.DeleteProject(id); err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
			return
		}
		s.jsonResponse(w, http.StatusOK, map[string]bool{"deleted": true}, nil)
		return
	}

	// Handle GET & POST /v1/projects/{id}/environments
	if strings.HasSuffix(id, "/environments") {
		cleanID := strings.TrimSuffix(id, "/environments")
		if r.Method == http.MethodGet {
			envs, err := s.store.ListProjectEnvironments(cleanID)
			if err != nil {
				s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
				return
			}
			s.jsonResponse(w, http.StatusOK, envs, nil)
			return
		} else if r.Method == http.MethodPost {
			var env store.ProjectEnvironment
			if err := json.NewDecoder(r.Body).Decode(&env); err != nil {
				s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
				return
			}
			env.ProjectID = cleanID
			envID, err := s.store.CreateProjectEnvironment(env)
			if err != nil {
				s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
				return
			}
			env.ID = envID
			s.jsonResponse(w, http.StatusCreated, env, nil)
			return
		}
		w.WriteHeader(http.StatusMethodNotAllowed)
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

func (s *Server) handleWorkspaces(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		workspaces, err := s.store.ListWorkspaces()
		if err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
			return
		}
		s.jsonResponse(w, http.StatusOK, workspaces, nil)

	case http.MethodPost:
		var ws store.Workspace
		if err := json.NewDecoder(r.Body).Decode(&ws); err != nil {
			s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
			return
		}
		if ws.Name == "" {
			s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "VALIDATION_FAILED", Message: "name is required"})
			return
		}
		id, err := s.store.CreateWorkspace(ws)
		if err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
			return
		}
		ws.ID = id
		s.jsonResponse(w, http.StatusCreated, ws, nil)

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleWorkspaceDetail(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 3 {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	workspaceID := parts[2]

	// Handle DELETE /v1/workspaces/{id}
	if len(parts) == 3 && r.Method == http.MethodDelete {
		if err := s.store.DeleteWorkspace(workspaceID); err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
			return
		}
		s.jsonResponse(w, http.StatusOK, map[string]bool{"deleted": true}, nil)
		return
	}

	// Handle POST /v1/workspaces/{id}/projects
	if len(parts) >= 4 && parts[3] == "projects" {
		if r.Method == http.MethodPost {
			var req struct {
				ProjectID string `json:"project_id"`
			}
			_ = json.NewDecoder(r.Body).Decode(&req)
			if req.ProjectID == "" {
				s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "MISSING_ID", Message: "project_id is required"})
				return
			}
			if err := s.store.AssignProjectToWorkspace(workspaceID, req.ProjectID); err != nil {
				s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
				return
			}
			s.jsonResponse(w, http.StatusOK, map[string]bool{"assigned": true}, nil)
			return
		}

		// Handle DELETE /v1/workspaces/{id}/projects/{project_id}
		if len(parts) >= 5 && r.Method == http.MethodDelete {
			projectID := parts[4]
			if err := s.store.RemoveProjectFromWorkspace(workspaceID, projectID); err != nil {
				s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
				return
			}
			s.jsonResponse(w, http.StatusOK, map[string]bool{"removed": true}, nil)
			return
		}
	}

	w.WriteHeader(http.StatusMethodNotAllowed)
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

// StartDebugSession auto-creates a DBGp debug session for the given project.
// Enables "no-manual-connection" workflow.
func (s *Server) handleDebugStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ProjectID string `json:"project_id"`
		FileURI   string `json:"file_uri,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}

	if req.ProjectID == "" {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "MISSING_PROJECT", Message: "project_id is required"})
		return
	}

	sessionID := uuid.New().String()
	s.hub.Broadcast("debug_session_created", req.ProjectID, map[string]interface{}{
		"session_id": sessionID,
		"project_id": req.ProjectID,
		"state":      "starting",
	})

	s.jsonResponse(w, http.StatusOK, map[string]interface{}{
		"session_id": sessionID,
		"project_id": req.ProjectID,
		"state":      "starting",
	}, nil)
}

func (s *Server) handleIncomingWebhook(w http.ResponseWriter, r *http.Request) {
	receiverID := strings.TrimPrefix(r.URL.Path, "/wh/")
	body, _ := io.ReadAll(io.LimitReader(r.Body, 10*1024*1024))

	// Hash body for idempotency and signature verification
	hash := sha256.Sum256(body)
	bodySha := hex.EncodeToString(hash[:])

	headersJSON, _ := json.Marshal(r.Header)
	provider := "generic"
	sigStatus := "unsigned"

	if r.Header.Get("Stripe-Signature") != "" {
		provider = "stripe"
		sigStatus = "signed"
	} else if r.Header.Get("X-Hub-Signature-256") != "" {
		provider = "github"
		sigStatus = "signed"
	} else if r.Header.Get("X-Shopify-Hmac-Sha256") != "" {
		provider = "shopify"
		sigStatus = "signed"
	}

	eventID := uuid.New().String()
	event := store.WebhookEvent{
		ID:              eventID,
		ReceiverID:      receiverID,
		Provider:        provider,
		EventType:       r.Header.Get("X-GitHub-Event"),
		Method:          r.Method,
		Path:            r.URL.Path,
		HeadersJSON:     string(headersJSON),
		Body:            string(body),
		BodySha256:      bodySha,
		SignatureStatus: sigStatus,
		ReceivedAt:      time.Now().UTC(),
	}

	_, _ = s.store.InsertWebhookEvent(event)
	s.hub.Broadcast("webhook_received", receiverID, event)

	w.WriteHeader(http.StatusOK)
	_, _ = w.Write([]byte(`{"received":true,"id":"` + eventID + `"}`))
}

func (s *Server) handleWebhookEvents(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	receiverID := r.URL.Query().Get("receiver_id")
	events, err := s.store.ListWebhookEvents(receiverID, 50)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
		return
	}

	s.jsonResponse(w, http.StatusOK, events, nil)
}

func (s *Server) handleWebhookVerify(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Secret    string `json:"secret"`
		Payload   string `json:"payload"`
		Signature string `json:"signature"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}

	valid := VerifySignature(req.Secret, []byte(req.Payload), req.Signature)
	s.jsonResponse(w, http.StatusOK, map[string]bool{"valid": valid}, nil)
}

// VerifySignature checks HMAC SHA-256 webhook signatures
func VerifySignature(secret string, payload []byte, signature string) bool {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(payload)
	expectedMAC := hex.EncodeToString(mac.Sum(nil))
	return hmac.Equal([]byte(signature), []byte(expectedMAC))
}

func (s *Server) handleAIStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	status := s.aiClient.GetStatus()
	s.jsonResponse(w, http.StatusOK, status, nil)
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

func (s *Server) handleAIExplainError(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ExceptionMessage string `json:"exception_message"`
		StackTrace       string `json:"stack_trace"`
		Model            string `json:"model"`
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

	resp, err := s.aiClient.ExplainException(req.ExceptionMessage, req.StackTrace, req.Model)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "AI_ERROR", Message: err.Error()})
		return
	}

	s.jsonResponse(w, http.StatusOK, map[string]interface{}{
		"explanation": resp,
		"model":       req.Model,
		"offline":     true,
	}, nil)
}

func (s *Server) handleAIOptimizeQuery(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		SQLQuery    string `json:"sql_query"`
		ExplainPlan string `json:"explain_plan"`
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

	resp, err := s.aiClient.OptimizeQuery(req.SQLQuery, req.ExplainPlan, req.Model)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "AI_ERROR", Message: err.Error()})
		return
	}

	s.jsonResponse(w, http.StatusOK, map[string]interface{}{
		"recommendation": resp,
		"model":          req.Model,
		"offline":        true,
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

func (s *Server) handleJSDebugSessions(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		projectID := r.URL.Query().Get("project_id")
		sessions, err := s.store.ListJSSessions(projectID)
		if err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
			return
		}
		s.jsonResponse(w, http.StatusOK, sessions, nil)

	case http.MethodPost:
		var sess store.JSSession
		if err := json.NewDecoder(r.Body).Decode(&sess); err != nil {
			s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
			return
		}
		if sess.Runtime == "" {
			sess.Runtime = "browser"
		}
		id, err := s.store.CreateJSSession(sess)
		if err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
			return
		}
		sess.ID = id
		s.hub.Broadcast("js_session_started", sess.ProjectID, sess)
		s.jsonResponse(w, http.StatusCreated, sess, nil)

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleJSDebugSessionDetail(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 4 {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	sessionID := parts[3]
	action := ""
	if len(parts) >= 5 {
		action = parts[4]
	}

	if r.Method == http.MethodPost && action == "close" {
		if err := s.store.CloseJSSession(sessionID); err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
			return
		}
		s.hub.Broadcast("js_session_closed", "", map[string]string{"session_id": sessionID})
		s.jsonResponse(w, http.StatusOK, map[string]bool{"closed": true}, nil)
		return
	}

	w.WriteHeader(http.StatusMethodNotAllowed)
}

func (s *Server) handleJSConsoleEvents(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		sessionID := r.URL.Query().Get("session_id")
		traceID := r.URL.Query().Get("trace_id")
		events, err := s.store.ListJSConsoleEvents(sessionID, traceID, 100)
		if err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
			return
		}
		s.jsonResponse(w, http.StatusOK, events, nil)

	case http.MethodPost:
		var event store.JSConsoleEvent
		if err := json.NewDecoder(r.Body).Decode(&event); err != nil {
			s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
			return
		}
		id, err := s.store.InsertJSConsoleEvent(event)
		if err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
			return
		}
		event.ID = id
		s.hub.Broadcast("js_console_event", event.SessionID, event)
		s.jsonResponse(w, http.StatusCreated, event, nil)

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleDBConnections(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		projectID := r.URL.Query().Get("project_id")
		conns, err := s.store.ListDBConnections(projectID)
		if err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
			return
		}
		s.jsonResponse(w, http.StatusOK, conns, nil)

	case http.MethodPost:
		var conn store.DBConnection
		if err := json.NewDecoder(r.Body).Decode(&conn); err != nil {
			s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
			return
		}
		if conn.Name == "" || conn.Driver == "" {
			s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "VALIDATION_FAILED", Message: "name and driver are required"})
			return
		}
		id, err := s.store.CreateDBConnection(conn)
		if err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
			return
		}
		conn.ID = id
		s.jsonResponse(w, http.StatusCreated, conn, nil)

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleDBConnectionDetail(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 4 {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	id := parts[3]

	if len(parts) >= 5 && parts[4] == "test" && r.Method == http.MethodPost {
		res, err := s.store.TestDBConnection(store.DBConnection{ID: id})
		if err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
			return
		}
		s.jsonResponse(w, http.StatusOK, res, nil)
		return
	}

	if r.Method == http.MethodDelete {
		if err := s.store.DeleteDBConnection(id); err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
			return
		}
		s.jsonResponse(w, http.StatusOK, map[string]bool{"deleted": true}, nil)
		return
	}

	w.WriteHeader(http.StatusMethodNotAllowed)
}

func (s *Server) handleDBAnalyze(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ProjectID string `json:"project_id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	findings, err := s.store.AnalyzeDatabaseWorkload(req.ProjectID)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "ANALYSIS_FAILED", Message: err.Error()})
		return
	}

	s.hub.Broadcast("db_analysis_completed", req.ProjectID, map[string]interface{}{"findings_count": len(findings)})
	s.jsonResponse(w, http.StatusOK, findings, nil)
}

func (s *Server) handleDBFindings(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	projectID := r.URL.Query().Get("project_id")
	findings, err := s.store.ListDBFindings(projectID)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
		return
	}

	s.jsonResponse(w, http.StatusOK, findings, nil)
}

func (s *Server) handleDBRecommendationDetail(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.Trim(r.URL.Path, "/"), "/")
	if len(parts) < 4 {
		w.WriteHeader(http.StatusBadRequest)
		return
	}
	recID := parts[3]
	action := ""
	if len(parts) >= 5 {
		action = parts[4]
	}

	if r.Method == http.MethodPost && (action == "status" || action == "approve" || action == "dismiss") {
		var req struct {
			Status string `json:"status"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)
		if action == "approve" {
			req.Status = "approved"
		} else if action == "dismiss" {
			req.Status = "dismissed"
		} else if req.Status == "" {
			req.Status = "approved"
		}

		if err := s.store.UpdateRecommendationStatus(recID, req.Status); err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DB_ERROR", Message: err.Error()})
			return
		}
		s.jsonResponse(w, http.StatusOK, map[string]string{"status": req.Status}, nil)
		return
	}

	w.WriteHeader(http.StatusMethodNotAllowed)
}

func (s *Server) handleDBExplain(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		SQL    string `json:"sql"`
		Driver string `json:"driver"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}

	analysis := store.ExplainQueryPlanEnhanced(req.SQL, req.Driver)
	s.jsonResponse(w, http.StatusOK, analysis, nil)
}

func (s *Server) handleDBQuery(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ConnectionID  string `json:"connection_id"`
		SQL           string `json:"sql"`
		Limit         int    `json:"limit"`
		AllowMutation bool   `json:"allow_mutation"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}

	if strings.TrimSpace(req.SQL) == "" {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "VALIDATION_FAILED", Message: "sql statement cannot be empty"})
		return
	}

	result, err := s.store.ExecuteSafeQuery(req.ConnectionID, req.SQL, req.Limit, req.AllowMutation)
	if err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "QUERY_EXECUTION_FAILED", Message: err.Error()})
		return
	}

	s.hub.Broadcast("db_query_executed", "system", map[string]interface{}{
		"connection_id": req.ConnectionID,
		"rows_returned": result.RowCount,
		"duration_ms":   result.DurationMs,
		"affected_rows": result.AffectedRows,
	})

	s.jsonResponse(w, http.StatusOK, result, nil)
}

func (s *Server) handleDBSchema(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	connID := r.URL.Query().Get("connection_id")
	schemaInfo, err := s.store.IntrospectSchema(connID)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "SCHEMA_INTROSPECTION_FAILED", Message: err.Error()})
		return
	}

	s.jsonResponse(w, http.StatusOK, schemaInfo, nil)
}

func (s *Server) handleDBConnectionTest(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var conn store.DBConnection
	if err := json.NewDecoder(r.Body).Decode(&conn); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}

	testResult, err := s.store.TestDBConnection(conn)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "TEST_FAILED", Message: err.Error()})
		return
	}

	s.jsonResponse(w, http.StatusOK, testResult, nil)
}

func (s *Server) handleDBTableData(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	q := r.URL.Query()
	connID := q.Get("connection_id")
	table := q.Get("table")
	if table == "" {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "VALIDATION_FAILED", Message: "table parameter is required"})
		return
	}

	page, _ := strconv.Atoi(q.Get("page"))
	if page <= 0 {
		page = 1
	}
	pageSize, _ := strconv.Atoi(q.Get("page_size"))
	if pageSize <= 0 {
		pageSize = 50
	}
	sortCol := q.Get("sort_col")
	sortDir := q.Get("sort_dir")
	filter := q.Get("filter")

	data, err := s.store.GetTableData(connID, table, page, pageSize, sortCol, sortDir, filter)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "TABLE_DATA_FAILED", Message: err.Error()})
		return
	}

	s.jsonResponse(w, http.StatusOK, data, nil)
}

func (s *Server) handleDBTableRow(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodPost:
		var req struct {
			ConnectionID string                 `json:"connection_id"`
			Table        string                 `json:"table"`
			Data         map[string]interface{} `json:"data"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
			return
		}
		insertID, err := s.store.InsertTableRow(req.ConnectionID, req.Table, req.Data)
		if err != nil {
			s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INSERT_FAILED", Message: err.Error()})
			return
		}
		s.jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "inserted_id": insertID}, nil)

	case http.MethodPatch:
		var req struct {
			ConnectionID string                 `json:"connection_id"`
			Table        string                 `json:"table"`
			PKCol        string                 `json:"pk_col"`
			PKVal        interface{}            `json:"pk_val"`
			Updates      map[string]interface{} `json:"updates"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
			return
		}
		aff, err := s.store.UpdateTableRow(req.ConnectionID, req.Table, req.PKCol, req.PKVal, req.Updates)
		if err != nil {
			s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "UPDATE_FAILED", Message: err.Error()})
			return
		}
		s.jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "rows_affected": aff}, nil)

	case http.MethodDelete:
		var req struct {
			ConnectionID string      `json:"connection_id"`
			Table        string      `json:"table"`
			PKCol        string      `json:"pk_col"`
			PKVal        interface{} `json:"pk_val"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
			return
		}
		aff, err := s.store.DeleteTableRow(req.ConnectionID, req.Table, req.PKCol, req.PKVal)
		if err != nil {
			s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "DELETE_FAILED", Message: err.Error()})
			return
		}
		s.jsonResponse(w, http.StatusOK, map[string]interface{}{"success": true, "rows_affected": aff}, nil)

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleDBTableTruncate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		ConnectionID string `json:"connection_id"`
		Table        string `json:"table"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}
	if err := s.store.TruncateTable(req.ConnectionID, req.Table); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "TRUNCATE_FAILED", Message: err.Error()})
		return
	}
	s.jsonResponse(w, http.StatusOK, map[string]bool{"success": true}, nil)
}

func (s *Server) handleDBTableDrop(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		ConnectionID string `json:"connection_id"`
		Table        string `json:"table"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}
	if err := s.store.DropTable(req.ConnectionID, req.Table); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "DROP_FAILED", Message: err.Error()})
		return
	}
	s.jsonResponse(w, http.StatusOK, map[string]bool{"success": true}, nil)
}

func (s *Server) handleDBTableDDL(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	connID := r.URL.Query().Get("connection_id")
	table := r.URL.Query().Get("table")
	if table == "" {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "VALIDATION_FAILED", Message: "table parameter is required"})
		return
	}
	ddl, err := s.store.GetTableDDL(connID, table)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DDL_FAILED", Message: err.Error()})
		return
	}
	s.jsonResponse(w, http.StatusOK, map[string]string{"table": table, "ddl": ddl}, nil)
}

func (s *Server) handleDBRelations(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	connID := r.URL.Query().Get("connection_id")
	erd, err := s.store.GetDatabaseRelations(connID)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "RELATIONS_FAILED", Message: err.Error()})
		return
	}
	s.jsonResponse(w, http.StatusOK, erd, nil)
}

func (s *Server) handleDBStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	connID := r.URL.Query().Get("connection_id")
	stats, err := s.store.GetDatabaseStats(connID)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "STATS_FAILED", Message: err.Error()})
		return
	}
	s.jsonResponse(w, http.StatusOK, stats, nil)
}

func (s *Server) handleDBOptimize(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req struct {
		ConnectionID string `json:"connection_id"`
		Table        string `json:"table"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	msg, err := s.store.OptimizeDatabase(req.ConnectionID, req.Table)
	if err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "OPTIMIZE_FAILED", Message: err.Error()})
		return
	}
	s.jsonResponse(w, http.StatusOK, map[string]string{"message": msg}, nil)
}

func (s *Server) handleDBProcesses(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	connID := r.URL.Query().Get("connection_id")
	procs, err := s.store.GetActiveProcesses(connID)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "PROCESSES_FAILED", Message: err.Error()})
		return
	}
	s.jsonResponse(w, http.StatusOK, procs, nil)
}

// StartDBBackup starts a backup operation for a database connection
func (s *Server) handleDBBackup(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ConnectionID string   `json:"connection_id"`
		Tables       []string `json:"tables,omitempty"`
		Format       string   `json:"format"`
		WhereClause  string   `json:"where_clause,omitempty"`
		Limit        int      `json:"limit"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}

	if req.ConnectionID == "" {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "MISSING_CONNECTION", Message: "connection_id is required"})
		return
	}

	result, err := s.store.BackupTableData(store.BackupRequest{
		ConnectionID: req.ConnectionID,
		Tables:       req.Tables,
		Format:       req.Format,
		WhereClause:  req.WhereClause,
		Limit:        req.Limit,
	})
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "BACKUP_FAILED", Message: err.Error()})
		return
	}

	s.jsonResponse(w, http.StatusOK, result, nil)
}

// HandleDBRestore restores data to a database connection
func (s *Server) handleDBRestore(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	body, err := io.ReadAll(io.LimitReader(r.Body, 50*1024*1024))
	if err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "READ_ERROR", Message: err.Error()})
		return
	}

	var req struct {
		ConnectionID string `json:"connection_id"`
		Format       string `json:"format"`
		Data         string `json:"data"`
	}
	if err := json.Unmarshal(body, &req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}

	if req.ConnectionID == "" {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "MISSING_CONNECTION", Message: "connection_id is required"})
		return
	}
	if req.Format == "" {
		req.Format = "sql"
	}

	if req.Format == "sql" {
		statements := strings.Split(req.Data, ";")
		for _, stmt := range statements {
			stmt = strings.TrimSpace(stmt)
			if stmt == "" {
				continue
			}
			_, err := s.store.ExecuteSafeQuery(req.ConnectionID, stmt, 0, true)
			if err != nil {
				continue
			}
		}
		s.jsonResponse(w, http.StatusOK, map[string]string{"status": "restored"}, nil)
		return
	}

	importReq := store.ImportRequest{
		ConnectionID: req.ConnectionID,
		Format:       req.Format,
		Data:         req.Data,
	}
	_, err = s.store.ImportTableData(importReq)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "RESTORE_FAILED", Message: err.Error()})
		return
	}

	s.jsonResponse(w, http.StatusOK, map[string]string{"status": "restored"}, nil)
}

// handleDBDiff compares two database schemas
func (s *Server) handleDBDiff(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		LeftConnectionID  string `json:"left_connection_id"`
		RightConnectionID string `json:"right_connection_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}

	if req.LeftConnectionID == "" || req.RightConnectionID == "" {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "MISSING_CONNECTIONS", Message: "both connection IDs are required"})
		return
	}

	result, err := s.store.DiffSchemas(req.LeftConnectionID, req.RightConnectionID)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "DIFF_FAILED", Message: err.Error()})
		return
	}

	s.jsonResponse(w, http.StatusOK, result, nil)
}

// handleDBTransfer transfers data between two databases
func (s *Server) handleDBTransfer(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		SourceConnectionID string `json:"source_connection_id"`
		TargetConnectionID string `json:"target_connection_id"`
		SourceTable        string `json:"source_table"`
		TargetTable        string `json:"target_table,omitempty"`
		WhereClause        string `json:"where_clause,omitempty"`
		Limit              int    `json:"limit"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}

	rowsAffected, err := s.store.TransferData(store.DataTransferRequest{
		SourceConnectionID: req.SourceConnectionID,
		TargetConnectionID: req.TargetConnectionID,
		SourceTable:        req.SourceTable,
		TargetTable:        req.TargetTable,
		WhereClause:        req.WhereClause,
		Limit:              req.Limit,
	})
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "TRANSFER_FAILED", Message: err.Error()})
		return
	}

	s.jsonResponse(w, http.StatusOK, map[string]interface{}{
		"rows_affected": rowsAffected,
		"message":       "Data transfer completed successfully",
	}, nil)
}

// handleDBTableFiltered gets table data with Navicat-style filters
func (s *Server) handleDBTableFiltered(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	connectionID := r.URL.Query().Get("connection_id")
	tableName := r.URL.Query().Get("table_name")
	page := 1
	pageSize := 50

	if p := r.URL.Query().Get("page"); p != "" {
		if n, err := strconv.Atoi(p); err == nil && n > 0 {
			page = n
		}
	}
	if s := r.URL.Query().Get("page_size"); s != "" {
		if n, err := strconv.Atoi(s); err == nil && n > 0 {
			pageSize = n
		}
	}

	var filters []store.TableFilter

	result, err := s.store.GetTableDataWithFilters(store.TableDataFilterRequest{
		ConnectionID: connectionID,
		TableName:    tableName,
		Page:         page,
		PageSize:     pageSize,
		Filters:      filters,
	})
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "QUERY_FAILED", Message: err.Error()})
		return
	}

	s.jsonResponse(w, http.StatusOK, result, nil)
}

func (s *Server) handleQASmoke(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		BaseURL     string   `json:"base_url"`
		ProjectPath string   `json:"project_path"`
		Endpoints   []string `json:"endpoints"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}

	endpoints := req.Endpoints
	if len(endpoints) == 0 && req.ProjectPath != "" {
		if rList, err := laravel.GetRoutes(req.ProjectPath, ""); err == nil {
			for _, r := range rList {
				if r.Method == "GET" || strings.Contains(r.Method, "GET") {
					endpoints = append(endpoints, r.URI)
				}
			}
		}
	}

	if len(endpoints) == 0 {
		endpoints = []string{"/api/health", "/api/v1/health", "/", "/health"}
	}

	summary := qa.RunSmokeCrawler(req.BaseURL, endpoints)
	s.jsonResponse(w, http.StatusOK, summary, nil)
}

func (s *Server) handleQAFuzz(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		TargetURL string `json:"target_url"`
		Method    string `json:"method"`
		Parameter string `json:"parameter"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}

	if req.TargetURL == "" {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "MISSING_URL", Message: "target_url is required"})
		return
	}

	param := req.Parameter
	if param == "" {
		param = "query"
	}

	report := qa.RunFuzzTesting(req.TargetURL, req.Method, param)
	s.jsonResponse(w, http.StatusOK, report, nil)
}

func (s *Server) handleQABenchmark(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		TargetURL     string `json:"target_url"`
		Method        string `json:"method"`
		Concurrency   int    `json:"concurrency"`
		TotalRequests int    `json:"total_requests"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}

	if req.TargetURL == "" {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "MISSING_URL", Message: "target_url is required"})
		return
	}

	report := qa.RunBenchmark(req.TargetURL, req.Method, req.Concurrency, req.TotalRequests)
	s.jsonResponse(w, http.StatusOK, report, nil)
}

func (s *Server) handleMonitorProbe(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		URL string `json:"url"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}

	if req.URL == "" {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "MISSING_URL", Message: "url is required"})
		return
	}

	result, err := monitor.ProbeLiveTarget(req.URL)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "PROBE_FAILED", Message: err.Error()})
		return
	}

	s.jsonResponse(w, http.StatusOK, result, nil)
}

func (s *Server) handleBrowserProxy(w http.ResponseWriter, r *http.Request) {
	targetURL := r.URL.Query().Get("url")
	if targetURL == "" {
		http.Error(w, "Query parameter 'url' is required", http.StatusBadRequest)
		return
	}

	parsedTarget, err := url.Parse(targetURL)
	if err != nil || (parsedTarget.Scheme != "http" && parsedTarget.Scheme != "https") {
		http.Error(w, "Invalid target URL scheme", http.StatusBadRequest)
		return
	}

	proxyReq, err := http.NewRequest(r.Method, targetURL, r.Body)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	for k, vv := range r.Header {
		if strings.EqualFold(k, "Host") || strings.EqualFold(k, "Referer") || strings.EqualFold(k, "Origin") {
			continue
		}
		for _, v := range vv {
			proxyReq.Header.Add(k, v)
		}
	}
	proxyReq.Header.Set("User-Agent", "PHPDebugStudio-WebInspector/1.0 (Headless)")

	client := &http.Client{
		Timeout: 30 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			return nil
		},
	}

	resp, err := client.Do(proxyReq)
	if err != nil {
		w.Header().Set("Content-Type", "text/html; charset=utf-8")
		w.WriteHeader(http.StatusBadGateway)
		fmt.Fprintf(w, "<div style=\"font-family:system-ui,-apple-system,sans-serif;padding:32px;background:#0d1117;color:#f85149;min-height:100vh;\"><h2 style=\"margin-bottom:12px;\">⚠️ Unable to connect to %s</h2><p style=\"color:#f0f6fc;margin-bottom:16px;\">%s</p><div style=\"background:#161b22;border:1px solid #30363d;padding:16px;border-radius:8px;color:#8b949e;\"><strong>Troubleshooting Tip:</strong> Ensure your local web server or Docker container (e.g. <code>localhost:8084</code> for GroceryOS, <code>localhost:8087</code> for Brixel POS) is running.</div></div>", targetURL, err.Error())
		return
	}
	defer resp.Body.Close()

	for k, vv := range resp.Header {
		if strings.EqualFold(k, "X-Frame-Options") || strings.EqualFold(k, "Content-Security-Policy") {
			continue
		}
		for _, v := range vv {
			w.Header().Add(k, v)
		}
	}
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Del("Content-Security-Policy")
	w.Header().Del("X-Frame-Options")

	contentType := resp.Header.Get("Content-Type")
	if strings.Contains(contentType, "text/html") {
		bodyBytes, err := io.ReadAll(resp.Body)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		baseTag := fmt.Sprintf("<base href=\"%s://%s/\">", parsedTarget.Scheme, parsedTarget.Host)
		inspectorScript := `<script id="__php_debug_studio_inspector_script__">
(function() {
  const origLog = console.log, origWarn = console.warn, origError = console.error, origInfo = console.info;
  function sendConsole(type, args) {
    try {
      const msg = Array.from(args).map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
      window.parent.postMessage({ type: 'PDS_BROWSER_CONSOLE', severity: type, message: msg, timestamp: new Date().toISOString() }, '*');
    } catch(e){}
  }
  console.log = function(...a) { origLog.apply(console, a); sendConsole('log', a); };
  console.warn = function(...a) { origWarn.apply(console, a); sendConsole('warning', a); };
  console.error = function(...a) { origError.apply(console, a); sendConsole('error', a); };
  console.info = function(...a) { origInfo.apply(console, a); sendConsole('info', a); };

  window.addEventListener('error', function(e) {
    window.parent.postMessage({
      type: 'PDS_BROWSER_ERROR',
      message: e.message || 'JavaScript Error',
      filename: e.filename,
      lineno: e.lineno,
      colno: e.colno,
      stack: e.error && e.error.stack ? e.error.stack : '',
      timestamp: new Date().toISOString()
    }, '*');
  });

  const origFetch = window.fetch;
  if (origFetch) {
    window.fetch = async function(...args) {
      const start = performance.now();
      const url = typeof args[0] === 'string' ? args[0] : (args[0] && args[0].url ? args[0].url : '');
      const method = (args[1] && args[1].method) || 'GET';
      try {
        const res = await origFetch.apply(this, args);
        const duration = Math.round(performance.now() - start);
        window.parent.postMessage({
          type: 'PDS_BROWSER_NETWORK',
          method: method,
          url: url,
          status: res.status,
          duration: duration,
          type_group: 'fetch',
          timestamp: new Date().toISOString()
        }, '*');
        return res;
      } catch(err) {
        window.parent.postMessage({
          type: 'PDS_BROWSER_NETWORK',
          method: method,
          url: url,
          status: 0,
          error: String(err),
          duration: Math.round(performance.now() - start),
          timestamp: new Date().toISOString()
        }, '*');
        throw err;
      }
    };
  }

  let inspectMode = false;
  let overlay = document.createElement('div');
  overlay.id = '__pds_inspect_overlay';
  overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:999999;border:2px solid #58a6ff;background:rgba(88,166,255,0.18);transition:all 0.05s ease;display:none;';
  if (document.documentElement) document.documentElement.appendChild(overlay);

  window.addEventListener('message', function(ev) {
    if (!ev.data) return;
    if (ev.data.type === 'PDS_SET_INSPECT_MODE') {
      inspectMode = !!ev.data.enabled;
      if (!inspectMode && overlay) overlay.style.display = 'none';
    } else if (ev.data.type === 'PDS_INJECT_CSS') {
      let st = document.getElementById('__pds_custom_styles');
      if (!st) {
        st = document.createElement('style');
        st.id = '__pds_custom_styles';
        document.head.appendChild(st);
      }
      st.textContent = ev.data.css;
    }
  });

  document.addEventListener('mouseover', function(e) {
    if (!inspectMode) return;
    const el = e.target;
    if (el === overlay) return;
    const rect = el.getBoundingClientRect();
    overlay.style.display = 'block';
    overlay.style.top = rect.top + 'px';
    overlay.style.left = rect.left + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
  }, true);

  document.addEventListener('click', function(e) {
    if (!inspectMode) return;
    e.preventDefault();
    e.stopPropagation();
    const el = e.target;
    const cs = window.getComputedStyle(el);
    const styles = {
      display: cs.display,
      position: cs.position,
      width: cs.width,
      height: cs.height,
      color: cs.color,
      backgroundColor: cs.backgroundColor,
      fontSize: cs.fontSize,
      fontFamily: cs.fontFamily,
      fontWeight: cs.fontWeight,
      margin: cs.margin,
      padding: cs.padding,
      border: cs.border,
      borderRadius: cs.borderRadius,
      boxShadow: cs.boxShadow,
      lineHeight: cs.lineHeight,
      textAlign: cs.textAlign
    };
    window.parent.postMessage({
      type: 'PDS_ELEMENT_SELECTED',
      tagName: el.tagName.toLowerCase(),
      id: el.id,
      className: el.className,
      outerHTML: el.outerHTML ? el.outerHTML.slice(0, 1500) : '',
      textContent: el.textContent ? el.textContent.slice(0, 300) : '',
      styles: styles,
      rect: {
        width: Math.round(el.offsetWidth),
        height: Math.round(el.offsetHeight)
      }
    }, '*');
  }, true);

  window.addEventListener('DOMContentLoaded', function() {
    window.parent.postMessage({
      type: 'PDS_PAGE_LOADED',
      url: window.location.href,
      title: document.title,
      domElementsCount: document.querySelectorAll('*').length,
      timestamp: new Date().toISOString()
    }, '*');
  });
})();
</script>`

		content := string(bodyBytes)
		if strings.Contains(content, "<head>") {
			content = strings.Replace(content, "<head>", "<head>"+baseTag, 1)
		} else {
			content = baseTag + content
		}

		if strings.Contains(content, "</body>") {
			content = strings.Replace(content, "</body>", inspectorScript+"</body>", 1)
		} else {
			content = content + inspectorScript
		}

		w.Header().Set("Content-Length", strconv.Itoa(len(content)))
		w.WriteHeader(resp.StatusCode)
		_, _ = w.Write([]byte(content))
		return
	}

	w.WriteHeader(resp.StatusCode)
	_, _ = io.Copy(w, resp.Body)
}
