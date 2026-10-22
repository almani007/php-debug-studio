package store

import (
	"database/sql"
	"fmt"
	"time"

	_ "github.com/mattn/go-sqlite3"
)

type Store struct {
	db *sql.DB
}

func NewStore(dbPath string) (*Store, error) {
	dsn := fmt.Sprintf("%s?_journal_mode=WAL&_foreign_keys=on&_busy_timeout=5000", dbPath)
	db, err := sql.Open("sqlite3", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open sqlite db: %w", err)
	}

	s := &Store{db: db}
	if err := s.migrate(); err != nil {
		_ = db.Close()
		return nil, fmt.Errorf("migration failed: %w", err)
	}

	return s, nil
}

func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) migrate() error {
	schema := `
	CREATE TABLE IF NOT EXISTS projects (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		slug TEXT UNIQUE NOT NULL,
		framework TEXT,
		php_version TEXT,
		php_binary_path TEXT,
		root_path TEXT NOT NULL,
		app_url TEXT,
		connection_mode TEXT DEFAULT 'local',
		workspace_id TEXT,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS project_environments (
		id TEXT PRIMARY KEY,
		project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
		name TEXT NOT NULL,
		kind TEXT DEFAULT 'local',
		collector_url TEXT,
		is_production INTEGER DEFAULT 0,
		capture_policy_json TEXT,
		sampling_rate REAL DEFAULT 1.0,
		retention_days INTEGER DEFAULT 7,
		created_at TEXT NOT NULL,
		UNIQUE(project_id, name)
	);

	CREATE TABLE IF NOT EXISTS traces (
		id TEXT PRIMARY KEY,
		project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
		environment_id TEXT,
		trace_id TEXT UNIQUE NOT NULL,
		root_span_id TEXT,
		service_name TEXT,
		route TEXT,
		status INTEGER,
		started_at TEXT NOT NULL,
		duration_us INTEGER,
		sampled INTEGER DEFAULT 1
	);

	CREATE TABLE IF NOT EXISTS spans (
		id TEXT PRIMARY KEY,
		trace_id TEXT NOT NULL REFERENCES traces(id) ON DELETE CASCADE,
		span_id TEXT NOT NULL,
		parent_span_id TEXT,
		kind TEXT,
		name TEXT NOT NULL,
		started_at TEXT NOT NULL,
		duration_us INTEGER,
		attributes_json TEXT,
		status TEXT
	);

	CREATE TABLE IF NOT EXISTS sql_queries (
		id TEXT PRIMARY KEY,
		trace_id TEXT REFERENCES traces(id) ON DELETE CASCADE,
		span_id TEXT,
		connection_name TEXT,
		sql_template TEXT NOT NULL,
		bindings_masked_json TEXT,
		duration_us INTEGER,
		rows_affected INTEGER,
		explain_json TEXT
	);

	CREATE TABLE IF NOT EXISTS logs (
		id TEXT PRIMARY KEY,
		project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
		trace_id TEXT REFERENCES traces(id) ON DELETE SET NULL,
		span_id TEXT,
		level TEXT NOT NULL,
		channel TEXT,
		message_masked TEXT NOT NULL,
		context_json TEXT,
		timestamp TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS error_issues (
		id TEXT PRIMARY KEY,
		project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
		fingerprint TEXT UNIQUE NOT NULL,
		class TEXT NOT NULL,
		message_masked TEXT,
		severity TEXT,
		first_seen TEXT NOT NULL,
		last_seen TEXT NOT NULL,
		count INTEGER DEFAULT 1,
		state TEXT DEFAULT 'unresolved'
	);

	CREATE TABLE IF NOT EXISTS webhook_receivers (
		id TEXT PRIMARY KEY,
		project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
		name TEXT NOT NULL,
		path TEXT NOT NULL,
		methods_json TEXT NOT NULL,
		response_mode TEXT DEFAULT 'standard',
		enabled INTEGER DEFAULT 1,
		max_body_bytes INTEGER DEFAULT 1048576,
		created_at TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS webhook_events (
		id TEXT PRIMARY KEY,
		receiver_id TEXT NOT NULL REFERENCES webhook_receivers(id) ON DELETE CASCADE,
		provider TEXT,
		event_type TEXT,
		provider_event_id TEXT,
		method TEXT NOT NULL,
		path TEXT NOT NULL,
		headers_redacted_json TEXT,
		body_redacted BLOB,
		body_sha256 TEXT,
		received_at TEXT NOT NULL,
		signature_status TEXT,
		trace_id TEXT
	);

	CREATE TABLE IF NOT EXISTS db_lock_events (
		id TEXT PRIMARY KEY,
		connection_id TEXT NOT NULL,
		trace_id TEXT,
		blocker_json TEXT,
		waiter_json TEXT,
		lock_resource TEXT,
		duration_ms INTEGER,
		occurred_at TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS audit_events (
		id TEXT PRIMARY KEY,
		actor TEXT NOT NULL,
		action TEXT NOT NULL,
		target_type TEXT NOT NULL,
		target_id TEXT NOT NULL,
		detail_masked_json TEXT,
		created_at TEXT NOT NULL
	);

	CREATE TABLE IF NOT EXISTS webhook_deliveries (
		id TEXT PRIMARY KEY,
		event_id TEXT NOT NULL REFERENCES webhook_events(id) ON DELETE CASCADE,
		rule_id TEXT,
		attempt INTEGER DEFAULT 1,
		sent_at TEXT NOT NULL,
		status_code INTEGER,
		latency_ms INTEGER,
		error_code TEXT,
		trace_id TEXT
	);

	CREATE TABLE IF NOT EXISTS breakpoints (
		id TEXT PRIMARY KEY,
		project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
		file_uri TEXT NOT NULL,
		line_number INTEGER NOT NULL,
		type TEXT DEFAULT 'line',
		condition TEXT,
		hit_condition TEXT,
		enabled INTEGER DEFAULT 1
	);

	CREATE TABLE IF NOT EXISTS cookies (
		id TEXT PRIMARY KEY,
		project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
		domain TEXT NOT NULL,
		path TEXT NOT NULL DEFAULT '/',
		name TEXT NOT NULL,
		value TEXT NOT NULL,
		expires_at TEXT,
		secure INTEGER DEFAULT 0,
		http_only INTEGER DEFAULT 0,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL,
		UNIQUE(project_id, domain, path, name)
	);

	CREATE TABLE IF NOT EXISTS queue_jobs (
		id TEXT PRIMARY KEY,
		project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
		queue_name TEXT NOT NULL,
		connection TEXT NOT NULL DEFAULT 'default',
		job_class TEXT NOT NULL,
		payload_json TEXT NOT NULL,
		attempts INTEGER DEFAULT 0,
		status TEXT NOT NULL,
		exception_message TEXT,
		exception_trace TEXT,
		failed_at TEXT,
		created_at TEXT NOT NULL
	);

	CREATE INDEX IF NOT EXISTS idx_traces_proj ON traces(project_id, started_at DESC);
	CREATE INDEX IF NOT EXISTS idx_spans_trace ON spans(trace_id);
	CREATE INDEX IF NOT EXISTS idx_sql_trace ON sql_queries(trace_id);
	CREATE INDEX IF NOT EXISTS idx_logs_proj ON logs(project_id, timestamp DESC);
	CREATE INDEX IF NOT EXISTS idx_cookies_proj_domain ON cookies(project_id, domain);
	CREATE INDEX IF NOT EXISTS idx_queue_jobs_proj_status ON queue_jobs(project_id, status);
	`
	_, err := s.db.Exec(schema)
	return err
}

func (s *Store) CreateProject(p Project) error {
	query := `INSERT INTO projects (id, name, slug, framework, php_version, php_binary_path, root_path, app_url, connection_mode, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := s.db.Exec(query, p.ID, p.Name, p.Slug, p.Framework, p.PhpVersion, p.PhpBinaryPath, p.RootPath, p.AppUrl, p.ConnectionMode,
		p.CreatedAt.Format(time.RFC3339), p.UpdatedAt.Format(time.RFC3339))
	return err
}

func (s *Store) ListProjects() ([]Project, error) {
	query := `SELECT id, name, slug, framework, COALESCE(php_version, ''), COALESCE(php_binary_path, ''), root_path, COALESCE(app_url, ''), connection_mode, created_at, updated_at FROM projects ORDER BY updated_at DESC`
	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []Project
	for rows.Next() {
		var p Project
		var createdAt, updatedAt string
		if err := rows.Scan(&p.ID, &p.Name, &p.Slug, &p.Framework, &p.PhpVersion, &p.PhpBinaryPath, &p.RootPath, &p.AppUrl, &p.ConnectionMode, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		p.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
		p.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
		projects = append(projects, p)
	}
	return projects, nil
}

func (s *Store) GetProject(id string) (*Project, error) {
	query := `SELECT id, name, slug, framework, COALESCE(php_version, ''), COALESCE(php_binary_path, ''), root_path, COALESCE(app_url, ''), connection_mode, created_at, updated_at FROM projects WHERE id = ? OR slug = ?`
	row := s.db.QueryRow(query, id, id)

	var p Project
	var createdAt, updatedAt string
	if err := row.Scan(&p.ID, &p.Name, &p.Slug, &p.Framework, &p.PhpVersion, &p.PhpBinaryPath, &p.RootPath, &p.AppUrl, &p.ConnectionMode, &createdAt, &updatedAt); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil
		}
		return nil, err
	}
	p.CreatedAt, _ = time.Parse(time.RFC3339, createdAt)
	p.UpdatedAt, _ = time.Parse(time.RFC3339, updatedAt)
	return &p, nil
}

func (s *Store) UpdateProjectPhpVersion(id, version, binaryPath string) error {
	query := `UPDATE projects SET php_version = ?, php_binary_path = ?, updated_at = ? WHERE id = ? OR slug = ?`
	_, err := s.db.Exec(query, version, binaryPath, time.Now().UTC().Format(time.RFC3339), id, id)
	return err
}

func (s *Store) InsertTrace(t Trace) error {
	query := `INSERT INTO traces (id, project_id, environment_id, trace_id, root_span_id, service_name, route, status, started_at, duration_us, sampled)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := s.db.Exec(query, t.ID, t.ProjectID, t.EnvironmentID, t.TraceID, t.RootSpanID, t.ServiceName, t.Route, t.Status,
		t.StartedAt.Format(time.RFC3339), t.DurationUs, 1)
	return err
}

func (s *Store) InsertSpan(sp Span) error {
	query := `INSERT INTO spans (id, trace_id, span_id, parent_span_id, kind, name, started_at, duration_us, attributes_json, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := s.db.Exec(query, sp.ID, sp.TraceID, sp.SpanID, sp.ParentSpanID, sp.Kind, sp.Name,
		sp.StartedAt.Format(time.RFC3339), sp.DurationUs, sp.AttributesJSON, sp.Status)
	return err
}

func (s *Store) InsertSQLQuery(q SQLQuery) error {
	query := `INSERT INTO sql_queries (id, trace_id, span_id, connection_name, sql_template, bindings_masked_json, duration_us, rows_affected, explain_json)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := s.db.Exec(query, q.ID, q.TraceID, q.SpanID, q.ConnectionName, q.SQLTemplate, q.BindingsMaskedJSON,
		q.DurationUs, q.RowsAffected, q.ExplainJSON)
	return err
}

func (s *Store) InsertLog(l LogEntry) error {
	query := `INSERT INTO logs (id, project_id, trace_id, span_id, level, channel, message_masked, context_json, timestamp)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := s.db.Exec(query, l.ID, l.ProjectID, l.TraceID, l.SpanID, l.Level, l.Channel, l.MessageMasked, l.ContextJSON,
		l.Timestamp.Format(time.RFC3339))
	return err
}

func (s *Store) ListTraces(projectID string, limit int) ([]Trace, error) {
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	query := `SELECT id, project_id, COALESCE(environment_id, ''), trace_id, COALESCE(root_span_id, ''),
		COALESCE(service_name, ''), COALESCE(route, ''), status, started_at, duration_us, sampled
		FROM traces WHERE project_id = ? ORDER BY started_at DESC LIMIT ?`
	rows, err := s.db.Query(query, projectID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var traces []Trace
	for rows.Next() {
		var t Trace
		var startedAt string
		var sampledInt int
		if err := rows.Scan(&t.ID, &t.ProjectID, &t.EnvironmentID, &t.TraceID, &t.RootSpanID, &t.ServiceName, &t.Route, &t.Status, &startedAt, &t.DurationUs, &sampledInt); err != nil {
			return nil, err
		}
		t.StartedAt, _ = time.Parse(time.RFC3339, startedAt)
		t.Sampled = sampledInt == 1
		traces = append(traces, t)
	}
	return traces, nil
}

func (s *Store) GetTraceWithDetails(traceID string) (*Trace, []Span, []SQLQuery, []LogEntry, error) {
	traceQuery := `SELECT id, project_id, COALESCE(environment_id, ''), trace_id, COALESCE(root_span_id, ''),
		COALESCE(service_name, ''), COALESCE(route, ''), status, started_at, duration_us, sampled
		FROM traces WHERE trace_id = ? OR id = ?`
	row := s.db.QueryRow(traceQuery, traceID, traceID)

	var t Trace
	var startedAt string
	var sampledInt int
	if err := row.Scan(&t.ID, &t.ProjectID, &t.EnvironmentID, &t.TraceID, &t.RootSpanID, &t.ServiceName, &t.Route, &t.Status, &startedAt, &t.DurationUs, &sampledInt); err != nil {
		if err == sql.ErrNoRows {
			return nil, nil, nil, nil, nil
		}
		return nil, nil, nil, nil, err
	}
	t.StartedAt, _ = time.Parse(time.RFC3339, startedAt)
	t.Sampled = sampledInt == 1

	// Spans
	spanQuery := `SELECT id, trace_id, span_id, parent_span_id, kind, name, started_at, duration_us, attributes_json, status FROM spans WHERE trace_id = ? ORDER BY started_at ASC`
	spanRows, err := s.db.Query(spanQuery, t.ID)
	var spans []Span
	if err == nil {
		defer spanRows.Close()
		for spanRows.Next() {
			var sp Span
			var spStarted string
			if err := spanRows.Scan(&sp.ID, &sp.TraceID, &sp.SpanID, &sp.ParentSpanID, &sp.Kind, &sp.Name, &spStarted, &sp.DurationUs, &sp.AttributesJSON, &sp.Status); err == nil {
				sp.StartedAt, _ = time.Parse(time.RFC3339, spStarted)
				spans = append(spans, sp)
			}
		}
	}

	// SQL
	sqlQuery := `SELECT id, trace_id, span_id, connection_name, sql_template, bindings_masked_json, duration_us, rows_affected, explain_json FROM sql_queries WHERE trace_id = ? ORDER BY duration_us DESC`
	sqlRows, err := s.db.Query(sqlQuery, t.ID)
	var queries []SQLQuery
	if err == nil {
		defer sqlRows.Close()
		for sqlRows.Next() {
			var q SQLQuery
			if err := sqlRows.Scan(&q.ID, &q.TraceID, &q.SpanID, &q.ConnectionName, &q.SQLTemplate, &q.BindingsMaskedJSON, &q.DurationUs, &q.RowsAffected, &q.ExplainJSON); err == nil {
				queries = append(queries, q)
			}
		}
	}

	// Logs
	logQuery := `SELECT id, project_id, trace_id, span_id, level, channel, message_masked, context_json, timestamp FROM logs WHERE trace_id = ? ORDER BY timestamp ASC`
	logRows, err := s.db.Query(logQuery, t.ID)
	var logs []LogEntry
	if err == nil {
		defer logRows.Close()
		for logRows.Next() {
			var l LogEntry
			var lTime string
			if err := logRows.Scan(&l.ID, &l.ProjectID, &l.TraceID, &l.SpanID, &l.Level, &l.Channel, &l.MessageMasked, &l.ContextJSON, &lTime); err == nil {
				l.Timestamp, _ = time.Parse(time.RFC3339, lTime)
				logs = append(logs, l)
			}
		}
	}

	return &t, spans, queries, logs, nil
}
