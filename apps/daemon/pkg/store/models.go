package store

import (
	"time"
)

type Project struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	Slug           string    `json:"slug"`
	Framework      string    `json:"framework"`
	PhpVersion     string    `json:"php_version"`
	PhpBinaryPath  string    `json:"php_binary_path,omitempty"`
	RootPath       string    `json:"root_path"`
	AppUrl         string    `json:"app_url"`
	ConnectionMode string    `json:"connection_mode"`
	ContainerName  string    `json:"container_name,omitempty"`
	WorkspaceID    *string   `json:"workspace_id,omitempty"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type Trace struct {
	ID            string    `json:"id"`
	ProjectID     string    `json:"project_id"`
	EnvironmentID string    `json:"environment_id"`
	TraceID       string    `json:"trace_id"`
	RootSpanID    string    `json:"root_span_id"`
	ServiceName   string    `json:"service_name"`
	Route         string    `json:"route"`
	Status        int       `json:"status"`
	StartedAt     time.Time `json:"started_at"`
	DurationUs    int64     `json:"duration_us"`
	Sampled       bool      `json:"sampled"`
}

type Span struct {
	ID             string    `json:"id"`
	TraceID        string    `json:"trace_id"`
	SpanID         string    `json:"span_id"`
	ParentSpanID   *string   `json:"parent_span_id,omitempty"`
	Kind           string    `json:"kind"`
	Name           string    `json:"name"`
	StartedAt      time.Time `json:"started_at"`
	DurationUs     int64     `json:"duration_us"`
	AttributesJSON string    `json:"attributes_json"`
	Status         string    `json:"status"`
}

type SQLQuery struct {
	ID                 string  `json:"id"`
	TraceID            string  `json:"trace_id"`
	SpanID             *string `json:"span_id,omitempty"`
	ConnectionName     string  `json:"connection_name"`
	SQLTemplate        string  `json:"sql_template"`
	BindingsMaskedJSON string  `json:"bindings_masked_json"`
	DurationUs         int64   `json:"duration_us"`
	RowsAffected       int     `json:"rows_affected"`
	ExplainJSON        *string `json:"explain_json,omitempty"`
}

type LogEntry struct {
	ID            string    `json:"id"`
	ProjectID     string    `json:"project_id"`
	TraceID       *string   `json:"trace_id,omitempty"`
	SpanID        *string   `json:"span_id,omitempty"`
	Level         string    `json:"level"`
	Channel       string    `json:"channel"`
	MessageMasked string    `json:"message_masked"`
	ContextJSON   string    `json:"context_json"`
	Timestamp     time.Time `json:"timestamp"`
}

type ErrorIssue struct {
	ID            string    `json:"id"`
	ProjectID     string    `json:"project_id"`
	Fingerprint   string    `json:"fingerprint"`
	Class         string    `json:"class"`
	MessageMasked string    `json:"message_masked"`
	Severity      string    `json:"severity"`
	FirstSeen     time.Time `json:"first_seen"`
	LastSeen      time.Time `json:"last_seen"`
	Count         int       `json:"count"`
	State         string    `json:"state"`
}

type WebhookReceiver struct {
	ID           string    `json:"id"`
	ProjectID    string    `json:"project_id"`
	Name         string    `json:"name"`
	Path         string    `json:"path"`
	MethodsJSON  string    `json:"methods_json"`
	ResponseMode string    `json:"response_mode"`
	Enabled      bool      `json:"enabled"`
	MaxBodyBytes int       `json:"max_body_bytes"`
	CreatedAt    time.Time `json:"created_at"`
}
