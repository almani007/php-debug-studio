package store

import (
	"time"

	"github.com/google/uuid"
)

type WebhookEvent struct {
	ID              string    `json:"id"`
	ReceiverID      string    `json:"receiver_id"`
	Provider        string    `json:"provider"`
	EventType       string    `json:"event_type"`
	Method          string    `json:"method"`
	Path            string    `json:"path"`
	HeadersJSON     string    `json:"headers_json"`
	Body            string    `json:"body"`
	BodySha256      string    `json:"body_sha256"`
	SignatureStatus string    `json:"signature_status"`
	ReceivedAt      time.Time `json:"received_at"`
}

func (s *Store) InsertWebhookEvent(e WebhookEvent) (string, error) {
	if e.ID == "" {
		e.ID = uuid.New().String()
	}
	if e.ReceivedAt.IsZero() {
		e.ReceivedAt = time.Now().UTC()
	}

	query := `INSERT INTO webhook_events (id, receiver_id, provider, event_type, method, path, headers_redacted_json, body_redacted, body_sha256, signature_status, received_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

	_, err := s.db.Exec(query, e.ID, e.ReceiverID, e.Provider, e.EventType, e.Method, e.Path,
		e.HeadersJSON, e.Body, e.BodySha256, e.SignatureStatus, e.ReceivedAt.Format(time.RFC3339))
	return e.ID, err
}

func (s *Store) ListWebhookEvents(receiverID string, limit int) ([]WebhookEvent, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	query := `SELECT id, receiver_id, COALESCE(provider, ''), COALESCE(event_type, ''), method, path,
		COALESCE(headers_redacted_json, '{}'), COALESCE(body_redacted, ''), COALESCE(body_sha256, ''),
		COALESCE(signature_status, 'unsigned'), received_at
		FROM webhook_events`
	var args []interface{}
	if receiverID != "" {
		query += ` WHERE receiver_id = ?`
		args = append(args, receiverID)
	}
	query += ` ORDER BY received_at DESC LIMIT ?`
	args = append(args, limit)

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []WebhookEvent
	for rows.Next() {
		var e WebhookEvent
		var recvStr string
		if err := rows.Scan(&e.ID, &e.ReceiverID, &e.Provider, &e.EventType, &e.Method, &e.Path,
			&e.HeadersJSON, &e.Body, &e.BodySha256, &e.SignatureStatus, &recvStr); err != nil {
			return nil, err
		}
		e.ReceivedAt, _ = time.Parse(time.RFC3339, recvStr)
		events = append(events, e)
	}
	return events, nil
}
