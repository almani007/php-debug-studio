package api

import (
	"encoding/json"
	"net/http"
	"strconv"
)

// registerDBLiveRoutes wires the live application SQL capture endpoints.
func (s *Server) registerDBLiveRoutes() {
	s.mux.HandleFunc("/v1/db/live/status", s.handleDBLiveStatus)
	s.mux.HandleFunc("/v1/db/live/start", s.handleDBLiveStart)
	s.mux.HandleFunc("/v1/db/live/stop", s.handleDBLiveStop)
	s.mux.HandleFunc("/v1/db/live/queries", s.handleDBLiveQueries)
}

// GET /v1/db/live/status?project_id=...
func (s *Server) handleDBLiveStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	if s.dbWatcher == nil {
		s.jsonResponse(w, http.StatusOK, map[string]interface{}{
			"status":  map[string]interface{}{"running": false, "message": "Live SQL capture is not initialised."},
			"queries": []interface{}{},
		}, nil)
		return
	}
	s.jsonResponse(w, http.StatusOK, map[string]interface{}{
		"status":  s.dbWatcher.Status(),
		"queries": s.dbWatcher.Recent(200),
	}, nil)
}

// POST /v1/db/live/start {"project_id":"..."}
func (s *Server) handleDBLiveStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	if s.dbWatcher == nil {
		s.jsonResponse(w, http.StatusServiceUnavailable, nil, &ErrorInfo{Code: "CAPTURE_UNAVAILABLE", Message: "Live SQL capture is not initialised"})
		return
	}
	var req struct {
		ProjectID string `json:"project_id"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)
	if req.ProjectID == "" {
		req.ProjectID = r.URL.Query().Get("project_id")
	}
	project, err := s.xdebugProject(req.ProjectID)
	if err != nil {
		s.jsonResponse(w, http.StatusNotFound, nil, &ErrorInfo{Code: "PROJECT_NOT_FOUND", Message: err.Error()})
		return
	}
	if project == nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "NO_PROJECT", Message: "Register a project before starting live SQL capture"})
		return
	}

	s.dbWatcher.SetProject(project.ID, project.Name, project.RootPath)
	startErr := s.dbWatcher.Start()
	payload := map[string]interface{}{
		"started": startErr == nil,
		"status":  s.dbWatcher.Status(),
	}
	if startErr != nil {
		payload["error"] = startErr.Error()
	}
	if startErr == nil {
		s.hub.Broadcast("sql_capture_started", project.ID, s.dbWatcher.Status())
	}
	s.jsonResponse(w, http.StatusOK, payload, nil)
}

// POST /v1/db/live/stop
func (s *Server) handleDBLiveStop(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	if s.dbWatcher == nil {
		s.jsonResponse(w, http.StatusOK, map[string]interface{}{"running": false}, nil)
		return
	}
	_ = s.dbWatcher.Stop()
	s.jsonResponse(w, http.StatusOK, map[string]interface{}{
		"running": false,
		"status":  s.dbWatcher.Status(),
	}, nil)
}

// GET /v1/db/live/queries?limit=200
func (s *Server) handleDBLiveQueries(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	if s.dbWatcher == nil {
		s.jsonResponse(w, http.StatusOK, []interface{}{}, nil)
		return
	}
	limit := 200
	if raw := r.URL.Query().Get("limit"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			limit = parsed
		}
	}
	s.jsonResponse(w, http.StatusOK, s.dbWatcher.Recent(limit), nil)
}
