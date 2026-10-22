package store

import (
	"time"

	"github.com/google/uuid"
)

type WebhookDelivery struct {
	ID         string    `json:"id"`
	EventID    string    `json:"event_id"`
	RuleID     string    `json:"rule_id"`
	Attempt    int       `json:"attempt"`
	SentAt     time.Time `json:"sent_at"`
	StatusCode int       `json:"status_code"`
	LatencyMs  int64     `json:"latency_ms"`
	ErrorCode  string    `json:"error_code,omitempty"`
	TraceID    *string   `json:"trace_id,omitempty"`
}

func (s *Store) RecordWebhookDelivery(d WebhookDelivery) error {
	if d.ID == "" {
		d.ID = uuid.New().String()
	}
	if d.SentAt.IsZero() {
		d.SentAt = time.Now().UTC()
	}

	query := `INSERT INTO webhook_deliveries (id, event_id, rule_id, attempt, sent_at, status_code, latency_ms, error_code, trace_id)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := s.db.Exec(query, d.ID, d.EventID, d.RuleID, d.Attempt, d.SentAt.Format(time.RFC3339),
		d.StatusCode, d.LatencyMs, d.ErrorCode, d.TraceID)
	return err
}

func (s *Store) ListWebhookDeliveries(eventID string, limit int) ([]WebhookDelivery, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	query := `SELECT id, event_id, COALESCE(rule_id, ''), attempt, sent_at, status_code, latency_ms, COALESCE(error_code, ''), trace_id
		FROM webhook_deliveries WHERE event_id = ? ORDER BY attempt ASC LIMIT ?`
	rows, err := s.db.Query(query, eventID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var deliveries []WebhookDelivery
	for rows.Next() {
		var d WebhookDelivery
		var sent string
		if err := rows.Scan(&d.ID, &d.EventID, &d.RuleID, &d.Attempt, &sent, &d.StatusCode, &d.LatencyMs, &d.ErrorCode, &d.TraceID); err == nil {
			d.SentAt, _ = time.Parse(time.RFC3339, sent)
			deliveries = append(deliveries, d)
		}
	}
	return deliveries, nil
}
