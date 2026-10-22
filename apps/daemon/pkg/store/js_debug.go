package store

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
)

type JSSession struct {
	ID              string     `json:"id"`
	ProjectID       string     `json:"project_id"`
	Runtime         string     `json:"runtime"`
	BrowserName     string     `json:"browser_name"`
	Version         string     `json:"version"`
	ConnectionState string     `json:"connection_state"`
	StartedAt       time.Time  `json:"started_at"`
	EndedAt         *time.Time `json:"ended_at,omitempty"`
	SettingsJSON    string     `json:"settings_json"`
}

type JSConsoleEvent struct {
	ID              string    `json:"id"`
	SessionID       string    `json:"session_id"`
	TraceID         string    `json:"trace_id,omitempty"`
	Severity        string    `json:"severity"` // log, info, warn, error, debug
	MessageRedacted string    `json:"message_redacted"`
	SourceURL       string    `json:"source_url,omitempty"`
	Line            int       `json:"line,omitempty"`
	Column          int       `json:"column,omitempty"`
	StackJSON       string    `json:"stack_json,omitempty"`
	OccurredAt      time.Time `json:"occurred_at"`
}

func (s *Store) CreateJSSession(sess JSSession) (string, error) {
	if sess.ID == "" {
		sess.ID = uuid.New().String()
	}
	if sess.StartedAt.IsZero() {
		sess.StartedAt = time.Now().UTC()
	}
	if sess.ConnectionState == "" {
		sess.ConnectionState = "connected"
	}
	if sess.SettingsJSON == "" {
		sess.SettingsJSON = "{}"
	}

	query := `INSERT INTO js_debug_sessions (id, project_id, runtime, browser_name, version, connection_state, started_at, settings_json)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := s.db.Exec(query, sess.ID, sess.ProjectID, sess.Runtime, sess.BrowserName, sess.Version, sess.ConnectionState, sess.StartedAt.Format(time.RFC3339), sess.SettingsJSON)
	return sess.ID, err
}

func (s *Store) ListJSSessions(projectID string) ([]JSSession, error) {
	query := `SELECT id, project_id, runtime, COALESCE(browser_name, ''), COALESCE(version, ''), connection_state, started_at, ended_at, COALESCE(settings_json, '{}')
		FROM js_debug_sessions`
	var args []interface{}
	if projectID != "" {
		query += ` WHERE project_id = ?`
		args = append(args, projectID)
	}
	query += ` ORDER BY started_at DESC LIMIT 50`

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sessions []JSSession
	for rows.Next() {
		var sess JSSession
		var startedStr string
		var endedStr sql.NullString
		if err := rows.Scan(&sess.ID, &sess.ProjectID, &sess.Runtime, &sess.BrowserName, &sess.Version, &sess.ConnectionState, &startedStr, &endedStr, &sess.SettingsJSON); err != nil {
			return nil, err
		}
		sess.StartedAt, _ = time.Parse(time.RFC3339, startedStr)
		if endedStr.Valid && endedStr.String != "" {
			t, _ := time.Parse(time.RFC3339, endedStr.String)
			sess.EndedAt = &t
		}
		sessions = append(sessions, sess)
	}
	return sessions, nil
}

func (s *Store) CloseJSSession(id string) error {
	now := time.Now().UTC().Format(time.RFC3339)
	query := `UPDATE js_debug_sessions SET connection_state = 'disconnected', ended_at = ? WHERE id = ?`
	_, err := s.db.Exec(query, now, id)
	return err
}

func (s *Store) InsertJSConsoleEvent(e JSConsoleEvent) (string, error) {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	if e.OccurredAt.IsZero() {
		e.OccurredAt = time.Now().UTC()
	}
	if e.Severity == "" {
		e.Severity = "info"
	}

	query := `INSERT INTO js_console_events (id, session_id, trace_id, severity, message_redacted, source_url, line, column, stack_json, occurred_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := s.db.Exec(query, e.ID, e.SessionID, e.TraceID, e.Severity, e.MessageRedacted, e.SourceURL, e.Line, e.Column, e.StackJSON, e.OccurredAt.Format(time.RFC3339))
	return e.ID, err
}

func (s *Store) ListJSConsoleEvents(sessionID string, traceID string, limit int) ([]JSConsoleEvent, error) {
	if limit <= 0 || limit > 200 {
		limit = 100
	}
	query := `SELECT id, session_id, COALESCE(trace_id, ''), severity, message_redacted, COALESCE(source_url, ''), line, column, COALESCE(stack_json, '[]'), occurred_at
		FROM js_console_events WHERE 1=1`
	var args []interface{}
	if sessionID != "" {
		query += ` AND session_id = ?`
		args = append(args, sessionID)
	}
	if traceID != "" {
		query += ` AND trace_id = ?`
		args = append(args, traceID)
	}
	query += ` ORDER BY occurred_at DESC LIMIT ?`
	args = append(args, limit)

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []JSConsoleEvent
	for rows.Next() {
		var e JSConsoleEvent
		var occStr string
		var line, col sql.NullInt64
		if err := rows.Scan(&e.ID, &e.SessionID, &e.TraceID, &e.Severity, &e.MessageRedacted, &e.SourceURL, &line, &col, &e.StackJSON, &occStr); err != nil {
			return nil, err
		}
		if line.Valid {
			e.Line = int(line.Int64)
		}
		if col.Valid {
			e.Column = int(col.Int64)
		}
		e.OccurredAt, _ = time.Parse(time.RFC3339, occStr)
		events = append(events, e)
	}
	return events, nil
}
