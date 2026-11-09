package api

import (
	"encoding/json"
	"net/http"

	"brixel/php-debug-studio/daemon/pkg/store"
)

func (s *Server) registerEnhancedRoutes() {
	// QA enhanced routes
	s.mux.HandleFunc("/v1/qa/contract", s.handleQAContract)
	s.mux.HandleFunc("/v1/qa/regression", s.handleQARegression)
	s.mux.HandleFunc("/v1/qa/snapshot", s.handleQASnapshot)
	s.mux.HandleFunc("/v1/qa/snapshot/compare", s.handleQASnapshotCompare)
	s.mux.HandleFunc("/v1/qa/history", s.handleQAHistory)
	s.mux.HandleFunc("/v1/qa/audit/dossier", s.handleQAAuditDossier)
	s.mux.HandleFunc("/v1/qa/environment-matrix", s.handleQAEnvironmentMatrix)

	// DB management routes
	s.mux.HandleFunc("/v1/db/export", s.handleDBExport)
	s.mux.HandleFunc("/v1/db/import", s.handleDBImport)
	s.mux.HandleFunc("/v1/db/queries/saved", s.handleDBSavedQueries)
	s.mux.HandleFunc("/v1/db/queries/saved/", s.handleDBSavedQueryDelete)
	s.mux.HandleFunc("/v1/db/migration/generate", s.handleDBMigrationGenerate)
	s.mux.HandleFunc("/v1/db/schema/compare", s.handleDBSchemaCompare)
	s.mux.HandleFunc("/v1/db/metrics/realtime", s.handleDBRealtimeMetrics)
}

// ─── QA Enhanced Handlers ───

func (s *Server) handleQAContract(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req store.ContractTestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}
	result, err := s.store.RunContractTest(req)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "CONTRACT_TEST_FAILED", Message: err.Error()})
		return
	}
	s.jsonResponse(w, http.StatusOK, result, nil)
}

func (s *Server) handleQARegression(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req store.RegressionTestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}
	result, err := s.store.RunRegressionTest(req)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "REGRESSION_TEST_FAILED", Message: err.Error()})
		return
	}
	s.jsonResponse(w, http.StatusOK, result, nil)
}

func (s *Server) handleQASnapshot(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req store.SnapshotRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}
	result, err := s.store.CaptureSnapshot(req)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "SNAPSHOT_FAILED", Message: err.Error()})
		return
	}
	s.jsonResponse(w, http.StatusOK, result, nil)
}

func (s *Server) handleQASnapshotCompare(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req store.SnapshotCompareRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}
	result, err := s.store.CompareSnapshots(req)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "SNAPSHOT_COMPARE_FAILED", Message: err.Error()})
		return
	}
	s.jsonResponse(w, http.StatusOK, result, nil)
}

func (s *Server) handleQAHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	suiteType := r.URL.Query().Get("suite_type")
	history := s.store.GetQAHistory(suiteType)
	s.jsonResponse(w, http.StatusOK, history, nil)
}

func (s *Server) handleQAAuditDossier(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req store.QAAuditDossierRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}
	result, err := s.store.GenerateQAAuditDossier(req)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "AUDIT_DOSSIER_FAILED", Message: err.Error()})
		return
	}
	s.jsonResponse(w, http.StatusOK, result, nil)
}

func (s *Server) handleQAEnvironmentMatrix(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req store.EnvironmentMatrixRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}
	result, err := s.store.RunEnvironmentMatrix(req)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "ENVIRONMENT_MATRIX_FAILED", Message: err.Error()})
		return
	}
	s.jsonResponse(w, http.StatusOK, result, nil)
}

// ─── DB Management Handlers ───

func (s *Server) handleDBExport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req store.ExportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}
	result, err := s.store.ExportTableData(req)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "EXPORT_FAILED", Message: err.Error()})
		return
	}
	s.jsonResponse(w, http.StatusOK, result, nil)
}

func (s *Server) handleDBImport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req store.ImportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}
	result, err := s.store.ImportTableData(req)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "IMPORT_FAILED", Message: err.Error()})
		return
	}
	s.jsonResponse(w, http.StatusOK, result, nil)
}

func (s *Server) handleDBSavedQueries(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		connID := r.URL.Query().Get("connection_id")
		queries := s.store.GetSavedQueries(connID)
		s.jsonResponse(w, http.StatusOK, queries, nil)
	case http.MethodPost:
		var sq store.SavedQuery
		if err := json.NewDecoder(r.Body).Decode(&sq); err != nil {
			s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
			return
		}
		result, err := s.store.SaveQuery(sq)
		if err != nil {
			s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "SAVE_QUERY_FAILED", Message: err.Error()})
			return
		}
		s.jsonResponse(w, http.StatusOK, result, nil)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleDBSavedQueryDelete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	// Extract ID from path: /v1/db/queries/saved/{id}
	parts := splitPath(r.URL.Path)
	if len(parts) < 5 {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "MISSING_ID", Message: "query ID is required"})
		return
	}
	id := parts[len(parts)-1]
	if err := s.store.DeleteSavedQuery(id); err != nil {
		s.jsonResponse(w, http.StatusNotFound, nil, &ErrorInfo{Code: "NOT_FOUND", Message: err.Error()})
		return
	}
	s.jsonResponse(w, http.StatusOK, map[string]bool{"deleted": true}, nil)
}

func (s *Server) handleDBMigrationGenerate(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req store.MigrationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}
	result, err := s.store.GenerateMigration(req)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "MIGRATION_FAILED", Message: err.Error()})
		return
	}
	s.jsonResponse(w, http.StatusOK, result, nil)
}

func (s *Server) handleDBSchemaCompare(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	var req store.SchemaCompareRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "INVALID_JSON", Message: err.Error()})
		return
	}
	result, err := s.store.CompareSchemas(req)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "SCHEMA_COMPARE_FAILED", Message: err.Error()})
		return
	}
	s.jsonResponse(w, http.StatusOK, result, nil)
}

func (s *Server) handleDBRealtimeMetrics(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}
	connID := r.URL.Query().Get("connection_id")
	if connID == "" {
		s.jsonResponse(w, http.StatusBadRequest, nil, &ErrorInfo{Code: "MISSING_PARAM", Message: "connection_id is required"})
		return
	}
	result, err := s.store.GetRealtimeMetrics(connID)
	if err != nil {
		s.jsonResponse(w, http.StatusInternalServerError, nil, &ErrorInfo{Code: "METRICS_FAILED", Message: err.Error()})
		return
	}
	s.jsonResponse(w, http.StatusOK, result, nil)
}

func splitPath(path string) []string {
	var parts []string
	for _, p := range splitTrimEmpty(path, '/') {
		parts = append(parts, p)
	}
	return parts
}

func splitTrimEmpty(s string, sep byte) []string {
	var result []string
	current := ""
	for i := 0; i < len(s); i++ {
		if s[i] == sep {
			if current != "" {
				result = append(result, current)
				current = ""
			}
		} else {
			current += string(s[i])
		}
	}
	if current != "" {
		result = append(result, current)
	}
	return result
}
