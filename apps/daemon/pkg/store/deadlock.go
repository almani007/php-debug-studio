package store

import (
	"encoding/json"
	"time"
)

type LockEvent struct {
	ID           string    `json:"id"`
	ConnectionID string    `json:"connection_id"`
	TraceID      *string   `json:"trace_id,omitempty"`
	BlockerJSON  string    `json:"blocker_json"`
	WaiterJSON   string    `json:"waiter_json"`
	LockResource string    `json:"lock_resource"`
	DurationMs   int64     `json:"duration_ms"`
	OccurredAt   time.Time `json:"occurred_at"`
}

type DeadlockDiagnosis struct {
	Resource      string   `json:"resource"`
	BlockedSQL    string   `json:"blocked_sql"`
	BlockingSQL   string   `json:"blocking_sql"`
	Recommendation string  `json:"recommendation"`
}

func (s *Store) RecordLockEvent(event LockEvent) error {
	query := `INSERT INTO db_lock_events (id, connection_id, trace_id, blocker_json, waiter_json, lock_resource, duration_ms, occurred_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := s.db.Exec(query, event.ID, event.ConnectionID, event.TraceID, event.BlockerJSON, event.WaiterJSON,
		event.LockResource, event.DurationMs, event.OccurredAt.Format(time.RFC3339))
	return err
}

func (s *Store) GetLockEvents(connectionID string, limit int) ([]LockEvent, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}
	query := `SELECT id, connection_id, trace_id, blocker_json, waiter_json, lock_resource, duration_ms, occurred_at
		FROM db_lock_events WHERE connection_id = ? ORDER BY occurred_at DESC LIMIT ?`
	rows, err := s.db.Query(query, connectionID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var events []LockEvent
	for rows.Next() {
		var e LockEvent
		var occ string
		if err := rows.Scan(&e.ID, &e.ConnectionID, &e.TraceID, &e.BlockerJSON, &e.WaiterJSON, &e.LockResource, &e.DurationMs, &occ); err == nil {
			e.OccurredAt, _ = time.Parse(time.RFC3339, occ)
			events = append(events, e)
		}
	}
	return events, nil
}

// DiagnoseDeadlock analyzes lock events to provide concrete locking recommendations
func DiagnoseDeadlock(event LockEvent) DeadlockDiagnosis {
	var blocker map[string]interface{}
	var waiter map[string]interface{}
	_ = json.Unmarshal([]byte(event.BlockerJSON), &blocker)
	_ = json.Unmarshal([]byte(event.WaiterJSON), &waiter)

	return DeadlockDiagnosis{
		Resource:       event.LockResource,
		BlockedSQL:     fmtOrEmpty(waiter["sql"]),
		BlockingSQL:    fmtOrEmpty(blocker["sql"]),
		Recommendation: "Deadlock detected. Ensure transactions update tables in identical sequence and keep transaction durations minimal.",
	}
}

func fmtOrEmpty(val interface{}) string {
	if val == nil {
		return ""
	}
	if s, ok := val.(string); ok {
		return s
	}
	return ""
}
