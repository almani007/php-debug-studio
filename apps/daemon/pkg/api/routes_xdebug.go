package api

import (
	"encoding/json"
	"net/http"
	"os"
	"strings"

	"brixel/php-debug-studio/daemon/pkg/store"
	"brixel/php-debug-studio/daemon/pkg/xdebug"
)

// registerXdebugRoutes wires the automatic Xdebug configuration endpoints.
func (s *Server) registerXdebugRoutes() {
	s.mux.HandleFunc("/v1/debug/xdebug/status", s.handleXdebugStatus)
	s.mux.HandleFunc("/v1/debug/xdebug/configure", s.handleXdebugConfigure)
	s.mux.HandleFunc("/v1/debug/autorun", s.handleAutoRun)
	s.mux.HandleFunc("/v1/debug/breakpoints/auto-detect", s.handleBreakpointsAutoDetect)
}

func (s *Server) xdebugProject(projectID string) (*store.Project, error) {
	if strings.TrimSpace(projectID) != "" {
		return s.store.GetProject(projectID)
	}
	projects, err := s.store.ListProjects()
	if err != nil {
		return nil, err
	}
	if len(projects) == 0 {
		return nil, nil
	}
	return &projects[0], nil
}

func (s *Server) xdebugPort() string {
	port := os.Getenv("DEBUG_STUDIO_DBGP_PORT")
	if port == "" {
		port = "9003"
	}
	return port
}

// GET /v1/debug/xdebug/status?project_id=...
func (s *Server) handleXdebugStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	project, err := s.xdebugProject(r.URL.Query().Get("project_id"))
	if err != nil {
		s.jsonResponse(w, http.StatusNotFound, nil, &ErrorInfo{Code: "PROJECT_NOT_FOUND", Message: err.Error()})
		return
	}
	report := xdebug.Report{
		Listener: "0.0.0.0:" + s.xdebugPort(),
		Message:  "No project registered yet.",
		Steps:    []xdebug.Step{},
	}
	if project != nil {
		report = xdebug.Detect(project.Name, project.RootPath, s.xdebugPort(), "")
		report.Listener = "0.0.0.0:" + s.xdebugPort()
	}
	payload := map[string]interface{}{
		"project":  project,
		"report":   report,
		"auto_run": s.listener.AutoRun(),
		"dbgp": map[string]interface{}{
			"host": "127.0.0.1",
			"port": s.xdebugPort(),
		},
	}
	s.jsonResponse(w, http.StatusOK, payload, nil)
}

// POST /v1/debug/xdebug/configure {"project_id":"..."}
func (s *Server) handleXdebugConfigure(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
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
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "NO_PROJECT", Message: "Register a project before configuring Xdebug"})
		return
	}

	report := xdebug.Configure(project.Name, project.RootPath, s.xdebugPort(), "")
	s.hub.Broadcast("xdebug_configured", project.ID, map[string]interface{}{
		"success":      report.Success,
		"project_root": report.ProjectRoot,
		"runtimes":     report.Runtimes,
	})

	payload := map[string]interface{}{
		"project":  project,
		"report":   report,
		"auto_run": s.listener.AutoRun(),
	}
	s.jsonResponse(w, http.StatusOK, payload, nil)
}

// GET|POST /v1/debug/autorun {"enabled": true}
func (s *Server) handleAutoRun(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		s.jsonResponse(w, http.StatusOK, map[string]bool{"enabled": s.listener.AutoRun()}, nil)
	case http.MethodPost:
		var req struct {
			Enabled *bool `json:"enabled"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
			return
		}
		enabled := true
		if req.Enabled != nil {
			enabled = *req.Enabled
		}
		s.listener.SetAutoRun(enabled)
		s.jsonResponse(w, http.StatusOK, map[string]bool{"enabled": enabled}, nil)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

// POST /v1/debug/breakpoints/auto-detect {"project_id":"..."}
// Detects likely breakpoint locations (Laravel entry point, routes) and saves
// them as breakpoints so the debugger stops on the first request automatically.
func (s *Server) handleBreakpointsAutoDetect(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
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
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "NO_PROJECT", Message: "Register a project before auto-detecting breakpoints"})
		return
	}

	root, resolved := xdebug.ResolveProjectRoot(project.Name, project.RootPath)
	if !resolved {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "PROJECT_ROOT_NOT_FOUND", Message: "Could not resolve project root path"})
		return
	}

	prefixes := xdebug.ContainerPrefixes(root, project.Name)
	suggestions, err := xdebug.DetectBreakpoints(root, prefixes)
	if err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "DETECT_FAILED", Message: err.Error()})
		return
	}

	var saved []store.Breakpoint
	for _, sug := range suggestions {
		bp := store.Breakpoint{
			ProjectID:  project.ID,
			FileURI:    sug.FileURI,
			LineNumber: sug.LineNumber,
			Type:       sug.Type,
			Enabled:    true,
		}
		id, err := s.store.SaveBreakpoint(bp)
		if err != nil {
			continue
		}
		bp.ID = id
		saved = append(saved, bp)
	}

	s.hub.Broadcast("breakpoints_auto_detected", project.ID, map[string]interface{}{
		"project_id": project.ID,
		"breakpoints": saved,
	})

	s.jsonResponse(w, http.StatusOK, map[string]interface{}{
		"project":     project,
		"root":        root,
		"root_resolved": resolved,
		"prefixes":    prefixes,
		"detected":    suggestions,
		"saved":       saved,
	}, nil)
}
