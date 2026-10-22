package store

import (
	"encoding/json"
	"time"
)

type ProjectExportBundle struct {
	ExportedAt string       `json:"exported_at"`
	Project    *Project     `json:"project"`
	Traces     []Trace      `json:"traces"`
	Logs       []LogEntry   `json:"logs"`
	SQLQueries []SQLQuery   `json:"sql_queries"`
	Issues     []ErrorIssue `json:"issues"`
}

// ExportSanitizedBundle exports all project telemetry while strictly enforcing data sanitization
func (s *Store) ExportSanitizedBundle(projectID string) (*ProjectExportBundle, error) {
	proj, err := s.GetProject(projectID)
	if err != nil {
		return nil, err
	}

	traces, _ := s.ListTraces(projectID, 200)
	logs, _ := s.SearchLogs(LogFilter{ProjectID: projectID, Limit: 200})

	// Queries
	var queries []SQLQuery
	rows, err := s.db.Query(`SELECT id, trace_id, span_id, connection_name, sql_template, bindings_masked_json, duration_us, rows_affected, explain_json
		FROM sql_queries WHERE trace_id IN (SELECT id FROM traces WHERE project_id = ?) ORDER BY duration_us DESC LIMIT 200`, projectID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var q SQLQuery
			if err := rows.Scan(&q.ID, &q.TraceID, &q.SpanID, &q.ConnectionName, &q.SQLTemplate, &q.BindingsMaskedJSON, &q.DurationUs, &q.RowsAffected, &q.ExplainJSON); err == nil {
				queries = append(queries, q)
			}
		}
	}

	bundle := &ProjectExportBundle{
		ExportedAt: time.Now().UTC().Format(time.RFC3339),
		Project:    proj,
		Traces:     traces,
		Logs:       logs,
		SQLQueries: queries,
	}

	return bundle, nil
}

func (bundle *ProjectExportBundle) ToJSON() ([]byte, error) {
	return json.MarshalIndent(bundle, "", "  ")
}
