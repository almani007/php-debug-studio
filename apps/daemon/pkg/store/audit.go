package store

import (
	"time"

	"github.com/google/uuid"
)

type AuditEvent struct {
	ID               string    `json:"id"`
	Actor            string    `json:"actor"`
	Action           string    `json:"action"`
	TargetType       string    `json:"target_type"`
	TargetID         string    `json:"target_id"`
	DetailMaskedJSON string    `json:"detail_masked_json"`
	CreatedAt        time.Time `json:"created_at"`
}

func (s *Store) RecordAuditEvent(actor, action, targetType, targetID, detailJSON string) error {
	id := uuid.New().String()
	now := time.Now().UTC()

	query := `INSERT INTO audit_events (id, actor, action, target_type, target_id, detail_masked_json, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)`
	_, err := s.db.Exec(query, id, actor, action, targetType, targetID, detailJSON, now.Format(time.RFC3339))
	return err
}

func (s *Store) ListAuditEvents(limit int) ([]AuditEvent, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	query := `SELECT id, actor, action, target_type, target_id, detail_masked_json, created_at
		FROM audit_events ORDER BY created_at DESC LIMIT ?`
	rows, err := s.db.Query(query, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []AuditEvent
	for rows.Next() {
		var e AuditEvent
		var created string
		if err := rows.Scan(&e.ID, &e.Actor, &e.Action, &e.TargetType, &e.TargetID, &e.DetailMaskedJSON, &created); err == nil {
			e.CreatedAt, _ = time.Parse(time.RFC3339, created)
			events = append(events, e)
		}
	}
	return events, nil
}
