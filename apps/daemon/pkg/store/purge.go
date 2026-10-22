package store

import (
	"fmt"
	"time"
)

type PurgeSummary struct {
	DeletedTraces      int64 `json:"deleted_traces"`
	DeletedSpans       int64 `json:"deleted_spans"`
	DeletedSQLQueries  int64 `json:"deleted_sql_queries"`
	DeletedLogs        int64 `json:"deleted_logs"`
	DeletedErrors      int64 `json:"deleted_errors"`
	CutoffTimestamp    string `json:"cutoff_timestamp"`
}

// PurgeOldTelemetry deletes telemetry events older than the given retention period in days
func (s *Store) PurgeOldTelemetry(retentionDays int) (*PurgeSummary, error) {
	if retentionDays <= 0 {
		retentionDays = 7
	}

	cutoff := time.Now().UTC().AddDate(0, 0, -retentionDays)
	cutoffStr := cutoff.Format(time.RFC3339)

	summary := &PurgeSummary{
		CutoffTimestamp: cutoffStr,
	}

	// 1. Purge old traces (cascade deletes child spans/queries where FK on delete cascade is enabled)
	traceRes, err := s.db.Exec(`DELETE FROM traces WHERE started_at < ?`, cutoffStr)
	if err == nil {
		summary.DeletedTraces, _ = traceRes.RowsAffected()
	}

	// 2. Purge old logs
	logRes, err := s.db.Exec(`DELETE FROM logs WHERE timestamp < ?`, cutoffStr)
	if err == nil {
		summary.DeletedLogs, _ = logRes.RowsAffected()
	}

	// 3. Purge orphaned or old queries if any remain
	sqlRes, err := s.db.Exec(`DELETE FROM sql_queries WHERE trace_id NOT IN (SELECT id FROM traces) AND trace_id NOT IN (SELECT trace_id FROM traces)`)
	if err == nil {
		summary.DeletedSQLQueries, _ = sqlRes.RowsAffected()
	}

	// 4. Clean WAL checkpoints
	_, _ = s.db.Exec(`PRAGMA wal_checkpoint(TRUNCATE)`)

	return summary, nil
}
