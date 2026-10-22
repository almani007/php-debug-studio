package store

import (
	"strings"
	"time"
)

type LogFilter struct {
	ProjectID string `json:"project_id"`
	TraceID   string `json:"trace_id,omitempty"`
	Level     string `json:"level,omitempty"`
	Channel   string `json:"channel,omitempty"`
	Search    string `json:"search,omitempty"`
	Limit     int    `json:"limit,omitempty"`
}

func (s *Store) SearchLogs(filter LogFilter) ([]LogEntry, error) {
	limit := filter.Limit
	if limit <= 0 || limit > 500 {
		limit = 100
	}

	query := `SELECT id, project_id, COALESCE(trace_id, ''), COALESCE(span_id, ''), level, channel, message_masked, context_json, timestamp
		FROM logs WHERE 1=1`
	args := make([]interface{}, 0)

	if filter.ProjectID != "" {
		query += ` AND project_id = ?`
		args = append(args, filter.ProjectID)
	}

	if filter.TraceID != "" {
		query += ` AND trace_id = ?`
		args = append(args, filter.TraceID)
	}

	if filter.Level != "" {
		query += ` AND level = ?`
		args = append(args, strings.ToLower(filter.Level))
	}

	if filter.Channel != "" {
		query += ` AND channel = ?`
		args = append(args, filter.Channel)
	}

	if filter.Search != "" {
		query += ` AND message_masked LIKE ?`
		args = append(args, "%"+filter.Search+"%")
	}

	query += ` ORDER BY timestamp DESC LIMIT ?`
	args = append(args, limit)

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []LogEntry
	for rows.Next() {
		var l LogEntry
		var traceID, spanID, ts string
		if err := rows.Scan(&l.ID, &l.ProjectID, &traceID, &spanID, &l.Level, &l.Channel, &l.MessageMasked, &l.ContextJSON, &ts); err == nil {
			if traceID != "" {
				l.TraceID = &traceID
			}
			if spanID != "" {
				l.SpanID = &spanID
			}
			l.Timestamp, _ = time.Parse(time.RFC3339, ts)
			logs = append(logs, l)
		}
	}

	return logs, nil
}
