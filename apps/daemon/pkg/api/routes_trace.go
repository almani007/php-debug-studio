package api

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"brixel/php-debug-studio/daemon/pkg/dbgp"
)

func (s *Server) registerTraceRoutes() {
	// Line Trace Mode - auto-step through every line without breakpoints
	s.mux.HandleFunc("/v1/debug/trace", s.handleTrace)
	s.mux.HandleFunc("/v1/debug/trace/", s.handleTraceDetail_Trace)
}

// POST /v1/debug/trace - Start a trace on an active debug session
// GET  /v1/debug/trace - List all trace recordings
func (s *Server) handleTrace(w http.ResponseWriter, r *http.Request) {
	tm := s.listener.GetTraceManager()
	if tm == nil {
		s.jsonResponse(w, http.StatusServiceUnavailable, nil, &ErrorInfo{
			Code: "TRACE_UNAVAILABLE", Message: "Trace manager not initialized",
		})
		return
	}

	switch r.Method {
	case http.MethodGet:
		// List all trace recordings
		recordings := tm.GetRecordings()
		s.jsonResponse(w, http.StatusOK, recordings, nil)

	case http.MethodPost:
		// Start a new trace on a debug session
		var req struct {
			SessionID     string   `json:"session_id"`
			URL           string   `json:"url,omitempty"`
			Method        string   `json:"method,omitempty"`
			MaxSteps      int      `json:"max_steps,omitempty"`
			CaptureVars   *bool    `json:"capture_vars,omitempty"`
			ExcludeVendor *bool    `json:"exclude_vendor,omitempty"`
			StepMode      string   `json:"step_mode,omitempty"`
			FilterFiles   []string `json:"filter_files,omitempty"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
			return
		}

		if req.SessionID == "" {
			// If no session specified, find the first active one
			sessions := s.listener.GetSessions()
			for _, sess := range sessions {
				if sess.State == dbgp.StateBreak {
					req.SessionID = sess.ID
					break
				}
			}
			if req.SessionID == "" {
				s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{
					Code:    "NO_SESSION",
					Message: "No active debug session found. Hit a URL with Xdebug enabled first.",
				})
				return
			}
		}

		session := s.listener.GetSession(req.SessionID)
		if session == nil {
			s.jsonResponse(w, http.StatusNotFound, nil, &ErrorInfo{
				Code: "SESSION_NOT_FOUND", Message: "Debug session not found",
			})
			return
		}

		if session.TraceActive {
			s.jsonResponse(w, http.StatusConflict, nil, &ErrorInfo{
				Code: "TRACE_ACTIVE", Message: "A trace is already active on this session",
			})
			return
		}

		// Build config
		config := &dbgp.TraceConfig{
			MaxSteps:      10000,
			CaptureVars:   true,
			ExcludeVendor: true,
			StepMode:      "into",
		}
		if req.MaxSteps > 0 {
			config.MaxSteps = req.MaxSteps
		}
		if req.CaptureVars != nil {
			config.CaptureVars = *req.CaptureVars
		}
		if req.ExcludeVendor != nil {
			config.ExcludeVendor = *req.ExcludeVendor
		}
		if req.StepMode != "" {
			config.StepMode = req.StepMode
		}
		if len(req.FilterFiles) > 0 {
			config.FilterFiles = req.FilterFiles
		}

		traceID := uuid.New().String()
		recording := tm.StartTrace(session, config, traceID, req.URL, req.Method)

		// If the session is already at a breakpoint, kick off the first step
		if session.State == dbgp.StateBreak {
			go tm.RecordStep(session)
		}

		s.jsonResponse(w, http.StatusCreated, recording, nil)

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

// GET    /v1/debug/trace/{id}       - Get a trace recording
// DELETE /v1/debug/trace/{id}       - Stop a trace recording
// GET    /v1/debug/trace/{id}/steps - Get trace steps (paginated)
func (s *Server) handleTraceDetail_Trace(w http.ResponseWriter, r *http.Request) {
	tm := s.listener.GetTraceManager()
	if tm == nil {
		s.jsonResponse(w, http.StatusServiceUnavailable, nil, &ErrorInfo{
			Code: "TRACE_UNAVAILABLE", Message: "Trace manager not initialized",
		})
		return
	}

	path := strings.TrimPrefix(r.URL.Path, "/v1/debug/trace/")
	parts := strings.Split(path, "/")
	traceID := parts[0]

	if traceID == "" {
		w.WriteHeader(http.StatusBadRequest)
		return
	}

	recording := tm.GetRecording(traceID)
	if recording == nil {
		s.jsonResponse(w, http.StatusNotFound, nil, &ErrorInfo{
			Code: "NOT_FOUND", Message: "Trace recording not found",
		})
		return
	}

	// Sub-route: /steps
	if len(parts) > 1 && parts[1] == "steps" {
		if r.Method != http.MethodGet {
			w.WriteHeader(http.StatusMethodNotAllowed)
			return
		}
		// Paginated step retrieval
		q := r.URL.Query()
		offset := 0
		limit := 100
		if v := q.Get("offset"); v != "" {
			if n, err := parseIntSafe(v); err == nil {
				offset = n
			}
		}
		if v := q.Get("limit"); v != "" {
			if n, err := parseIntSafe(v); err == nil && n > 0 && n <= 1000 {
				limit = n
			}
		}

		steps := recording.Steps
		total := len(steps)
		if offset >= total {
			s.jsonResponse(w, http.StatusOK, map[string]interface{}{
				"steps": []dbgp.TraceStep{},
				"total": total,
				"offset": offset,
				"limit": limit,
			}, nil)
			return
		}
		end := offset + limit
		if end > total {
			end = total
		}
		s.jsonResponse(w, http.StatusOK, map[string]interface{}{
			"steps": steps[offset:end],
			"total": total,
			"offset": offset,
			"limit": limit,
		}, nil)
		return
	}

	switch r.Method {
	case http.MethodGet:
		// Return recording summary (without all steps for large traces)
		summary := map[string]interface{}{
			"id":         recording.ID,
			"session_id": recording.SessionID,
			"project_id": recording.ProjectID,
			"url":        recording.URL,
			"method":     recording.Method,
			"status":     recording.Status,
			"started_at": recording.StartedAt,
			"ended_at":   recording.EndedAt,
			"total_ms":   recording.TotalMs,
			"step_count": len(recording.Steps),
			"file_map":   recording.FileMap,
		}
		s.jsonResponse(w, http.StatusOK, summary, nil)

	case http.MethodDelete:
		// Stop the trace
		tm.StopTrace(traceID)
		// Also stop auto-stepping on the session
		session := s.listener.GetSession(recording.SessionID)
		if session != nil {
			session.TraceActive = false
			session.TraceID = ""
		}
		s.jsonResponse(w, http.StatusOK, map[string]string{
			"status": "stopped",
			"id":     traceID,
		}, nil)

	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func parseIntSafe(s string) (int, error) {
	n := 0
	for _, c := range s {
		if c < '0' || c > '9' {
			return 0, nil
		}
		n = n*10 + int(c-'0')
	}
	return n, nil
}
