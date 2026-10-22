package store

type SQLQueryAnalytics struct {
	SQLTemplate      string  `json:"sql_template"`
	ExecutionCount   int     `json:"execution_count"`
	TotalDurationUs  int64   `json:"total_duration_us"`
	AvgDurationUs    int64   `json:"avg_duration_us"`
	MaxDurationUs    int64   `json:"max_duration_us"`
	IsSlow           bool    `json:"is_slow"`
}

// GetSQLAnalytics groups and ranks SQL queries by execution frequency and latency
func (s *Store) GetSQLAnalytics(projectID string, slowThresholdMs int) ([]SQLQueryAnalytics, error) {
	if slowThresholdMs <= 0 {
		slowThresholdMs = 50 // 50ms default threshold
	}
	slowThresholdUs := int64(slowThresholdMs * 1000)

	query := `SELECT sql_template,
		COUNT(*) as count,
		SUM(duration_us) as total_dur,
		AVG(duration_us) as avg_dur,
		MAX(duration_us) as max_dur
		FROM sql_queries
		WHERE trace_id IN (SELECT id FROM traces WHERE project_id = ?)
		GROUP BY sql_template
		ORDER BY total_dur DESC LIMIT 100`

	rows, err := s.db.Query(query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []SQLQueryAnalytics
	for rows.Next() {
		var a SQLQueryAnalytics
		var avgFloat float64
		if err := rows.Scan(&a.SQLTemplate, &a.ExecutionCount, &a.TotalDurationUs, &avgFloat, &a.MaxDurationUs); err == nil {
			a.AvgDurationUs = int64(avgFloat)
			a.IsSlow = a.MaxDurationUs >= slowThresholdUs
			results = append(results, a)
		}
	}

	return results, nil
}
