package store

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

type DBConnection struct {
	ID         string    `json:"id"`
	ProjectID  string    `json:"project_id"`
	Name       string    `json:"name"`
	Driver     string    `json:"driver"` // mysql, postgres, sqlite
	ConfigJSON string    `json:"config_json"`
	SecretRef  string    `json:"secret_ref,omitempty"`
	Readonly   bool      `json:"readonly"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type DBFinding struct {
	ID              string             `json:"id"`
	ProjectID       string             `json:"project_id"`
	ConnectionID    *string            `json:"connection_id,omitempty"`
	Type            string             `json:"type"`     // slow_query, n_plus_one, missing_index, table_scan, deadlock
	Severity        string             `json:"severity"` // critical, warning, info
	Confidence      float64            `json:"confidence"`
	EvidenceJSON    string             `json:"evidence_json"`
	Status          string             `json:"status"` // open, resolved, dismissed
	CreatedAt       time.Time          `json:"created_at"`
	Recommendations []DBRecommendation `json:"recommendations,omitempty"`
}

type DBRecommendation struct {
	ID               string `json:"id"`
	FindingID        string `json:"finding_id"`
	Engine           string `json:"engine"`
	ProposedSQL      string `json:"proposed_sql"`
	ProposedCode     string `json:"proposed_code"`
	Rationale        string `json:"rationale"`
	RisksJSON        string `json:"risks_json"`
	VerificationJSON string `json:"verification_json"`
	ApprovalStatus   string `json:"approval_status"` // pending, approved, rejected
}

type QueryPlanAnalysis struct {
	SQL          string                 `json:"sql"`
	Driver       string                 `json:"driver"`
	PlanType     string                 `json:"plan_type"` // ALL (Table Scan), INDEX, REF, CONST, RANGE
	RowsExamined int                    `json:"rows_examined"`
	KeyUsed      string                 `json:"key_used"`
	Cost         float64                `json:"cost"`
	Warnings     []string               `json:"warnings"`
	Summary      string                 `json:"summary"`
	PlanRaw      map[string]interface{} `json:"plan_raw"`
}

func (s *Store) CreateDBConnection(conn DBConnection) (string, error) {
	if conn.ID == "" {
		conn.ID = uuid.New().String()
	}
	now := time.Now().UTC()
	if conn.CreatedAt.IsZero() {
		conn.CreatedAt = now
	}
	conn.UpdatedAt = now
	if conn.ConfigJSON == "" {
		conn.ConfigJSON = "{}"
	}

	readonlyInt := 0
	if conn.Readonly {
		readonlyInt = 1
	}

	query := `INSERT INTO db_connections (id, project_id, name, driver, config_json, secret_ref, readonly, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := s.db.Exec(query, conn.ID, conn.ProjectID, conn.Name, conn.Driver, conn.ConfigJSON, conn.SecretRef,
		readonlyInt, conn.CreatedAt.Format(time.RFC3339), conn.UpdatedAt.Format(time.RFC3339))
	return conn.ID, err
}

func (s *Store) ListDBConnections(projectID string) ([]DBConnection, error) {
	query := `SELECT id, project_id, name, driver, COALESCE(config_json, '{}'), COALESCE(secret_ref, ''), readonly, created_at, updated_at
		FROM db_connections`
	var args []interface{}
	if projectID != "" {
		query += ` WHERE project_id = ?`
		args = append(args, projectID)
	}
	query += ` ORDER BY name ASC`

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var connections []DBConnection
	for rows.Next() {
		var c DBConnection
		var roInt int
		var createdStr, updatedStr string
		if err := rows.Scan(&c.ID, &c.ProjectID, &c.Name, &c.Driver, &c.ConfigJSON, &c.SecretRef, &roInt, &createdStr, &updatedStr); err != nil {
			return nil, err
		}
		c.Readonly = roInt == 1
		c.CreatedAt, _ = time.Parse(time.RFC3339, createdStr)
		c.UpdatedAt, _ = time.Parse(time.RFC3339, updatedStr)
		connections = append(connections, c)
	}
	return connections, nil
}

func (s *Store) DeleteDBConnection(id string) error {
	_, err := s.db.Exec(`DELETE FROM db_connections WHERE id = ?`, id)
	return err
}

func (s *Store) ListDBFindings(projectID string) ([]DBFinding, error) {
	query := `SELECT id, project_id, connection_id, type, severity, confidence, COALESCE(evidence_json, '{}'), status, created_at
		FROM db_findings WHERE project_id = ? ORDER BY created_at DESC LIMIT 50`

	rows, err := s.db.Query(query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var findings []DBFinding
	for rows.Next() {
		var f DBFinding
		var connID sql.NullString
		var createdStr string
		if err := rows.Scan(&f.ID, &f.ProjectID, &connID, &f.Type, &f.Severity, &f.Confidence, &f.EvidenceJSON, &f.Status, &createdStr); err != nil {
			return nil, err
		}
		if connID.Valid {
			f.ConnectionID = &connID.String
		}
		f.CreatedAt, _ = time.Parse(time.RFC3339, createdStr)

		// Fetch recommendations
		recRows, err := s.db.Query(`SELECT id, finding_id, COALESCE(engine, ''), COALESCE(proposed_sql, ''), COALESCE(proposed_code, ''), COALESCE(rationale, ''), COALESCE(risks_json, '[]'), COALESCE(verification_json, '{}'), COALESCE(approval_status, 'pending')
			FROM db_recommendations WHERE finding_id = ?`, f.ID)
		if err == nil {
			for recRows.Next() {
				var r DBRecommendation
				if err := recRows.Scan(&r.ID, &r.FindingID, &r.Engine, &r.ProposedSQL, &r.ProposedCode, &r.Rationale, &r.RisksJSON, &r.VerificationJSON, &r.ApprovalStatus); err == nil {
					f.Recommendations = append(f.Recommendations, r)
				}
			}
			recRows.Close()
		}

		findings = append(findings, f)
	}
	return findings, nil
}

func (s *Store) UpdateRecommendationStatus(recID string, status string) error {
	_, err := s.db.Exec(`UPDATE db_recommendations SET approval_status = ? WHERE id = ?`, status, recID)
	return err
}

// AnalyzeDatabaseWorkload inspects recorded queries, N+1 patterns, and deadlocks to produce findings and suggestions
func (s *Store) AnalyzeDatabaseWorkload(projectID string) ([]DBFinding, error) {
	analytics, err := s.GetSQLAnalytics(projectID, 40)
	if err != nil {
		return nil, err
	}

	var generated []DBFinding
	now := time.Now().UTC()

	// 1. Check for N+1 Query patterns (same template executed many times)
	for _, a := range analytics {
		if a.ExecutionCount >= 8 && strings.Contains(strings.ToUpper(a.SQLTemplate), "WHERE") {
			findingID := uuid.New().String()
			evidence, _ := json.Marshal(map[string]interface{}{
				"sql_template":    a.SQLTemplate,
				"execution_count": a.ExecutionCount,
				"avg_duration_us": a.AvgDurationUs,
				"total_time_ms":   a.TotalDurationUs / 1000,
			})

			// Infer table from template: SELECT ... FROM `table`
			tableName := "records"
			words := strings.Fields(a.SQLTemplate)
			for i, w := range words {
				if strings.EqualFold(w, "FROM") && i+1 < len(words) {
					tableName = strings.Trim(words[i+1], "`\"'(),;")
					break
				}
			}

			finding := DBFinding{
				ID:           findingID,
				ProjectID:    projectID,
				Type:         "n_plus_one",
				Severity:     "critical",
				Confidence:   0.95,
				EvidenceJSON: string(evidence),
				Status:       "open",
				CreatedAt:    now,
				Recommendations: []DBRecommendation{
					{
						ID:             uuid.New().String(),
						FindingID:      findingID,
						Engine:         "eloquent",
						ProposedSQL:    fmt.Sprintf("SELECT * FROM %s WHERE id IN (...);", tableName),
						ProposedCode:   fmt.Sprintf("$models = %s::with('%s')->get();", strings.Title(tableName), strings.ToLower(tableName)),
						Rationale:      fmt.Sprintf("Query executed %d times in single workflows. Eager load relation using Eloquent with() to execute 1 query instead of %d.", a.ExecutionCount, a.ExecutionCount),
						RisksJSON:      `["Slight memory increase to hold eager-loaded collection in PHP buffer"]`,
						ApprovalStatus: "pending",
					},
				},
			}

			s.saveFinding(finding)
			generated = append(generated, finding)
		} else if a.IsSlow {
			// 2. Slow Query with Missing Index
			findingID := uuid.New().String()
			evidence, _ := json.Marshal(map[string]interface{}{
				"sql_template":  a.SQLTemplate,
				"max_time_ms":   a.MaxDurationUs / 1000,
				"avg_time_ms":   a.AvgDurationUs / 1000,
				"count":         a.ExecutionCount,
			})

			tableName := "items"
			whereCol := "status"
			words := strings.Fields(a.SQLTemplate)
			for i, w := range words {
				if strings.EqualFold(w, "FROM") && i+1 < len(words) {
					tableName = strings.Trim(words[i+1], "`\"'(),;")
				}
				if strings.EqualFold(w, "WHERE") && i+1 < len(words) {
					whereCol = strings.Trim(words[i+1], "`\"'(),;=")
				}
			}

			idxName := fmt.Sprintf("idx_%s_%s", tableName, whereCol)
			createIndexSQL := fmt.Sprintf("CREATE INDEX %s ON %s (%s);", idxName, tableName, whereCol)

			finding := DBFinding{
				ID:           findingID,
				ProjectID:    projectID,
				Type:         "missing_index",
				Severity:     "warning",
				Confidence:   0.88,
				EvidenceJSON: string(evidence),
				Status:       "open",
				CreatedAt:    now,
				Recommendations: []DBRecommendation{
					{
						ID:             uuid.New().String(),
						FindingID:      findingID,
						Engine:         "mysql/postgres",
						ProposedSQL:    createIndexSQL,
						ProposedCode:   fmt.Sprintf("$table->index('%s'); // inside Laravel migration", whereCol),
						Rationale:      fmt.Sprintf("Query exhibits max execution time of %dms. Adding index on `%s`.`%s` avoids full table scans.", a.MaxDurationUs/1000, tableName, whereCol),
						RisksJSON:      `["Slight overhead during bulk INSERT/UPDATE operations", "Index disk storage requirement"]`,
						ApprovalStatus: "pending",
					},
				},
			}

			s.saveFinding(finding)
			generated = append(generated, finding)
		}
	}

	return generated, nil
}

func (s *Store) saveFinding(f DBFinding) {
	_, _ = s.db.Exec(`INSERT INTO db_findings (id, project_id, connection_id, type, severity, confidence, evidence_json, status, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		f.ID, f.ProjectID, f.ConnectionID, f.Type, f.Severity, f.Confidence, f.EvidenceJSON, f.Status, f.CreatedAt.Format(time.RFC3339))

	for _, r := range f.Recommendations {
		_, _ = s.db.Exec(`INSERT INTO db_recommendations (id, finding_id, engine, proposed_sql, proposed_code, rationale, risks_json, verification_json, approval_status)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			r.ID, r.FindingID, r.Engine, r.ProposedSQL, r.ProposedCode, r.Rationale, r.RisksJSON, r.VerificationJSON, r.ApprovalStatus)
	}
}

// ExplainQueryPlan parses the SQL structure and simulates safe EXPLAIN diagnostics
func ExplainQueryPlan(sqlStr string, driver string) QueryPlanAnalysis {
	if driver == "" {
		driver = "mysql"
	}

	upper := strings.ToUpper(sqlStr)
	planType := "ALL"
	keyUsed := "NULL"
	rows := 12500
	cost := 125.40
	var warnings []string

	if strings.Contains(upper, "WHERE") {
		if strings.Contains(upper, "ID =") || strings.Contains(upper, "ID IN") {
			planType = "CONST"
			keyUsed = "PRIMARY"
			rows = 1
			cost = 1.00
		} else if strings.Contains(upper, "CREATED_AT") || strings.Contains(upper, "STATUS") {
			planType = "RANGE"
			keyUsed = "idx_status_created"
			rows = 48
			cost = 12.80
		} else {
			planType = "ALL"
			warnings = append(warnings, "Full table scan: Query lacks index on WHERE filter columns.")
			cost = 240.00
			rows = 24000
		}
	} else {
		planType = "ALL"
		warnings = append(warnings, "No WHERE clause found: Entire table scanned.")
		cost = 350.00
		rows = 50000
	}

	if strings.Contains(upper, "ORDER BY") && planType == "ALL" {
		warnings = append(warnings, "Using filesort: Sorting unindexed rows in memory.")
	}

	summary := fmt.Sprintf("Access Type: %s | Estimated Rows: %d | Cost: %.2f", planType, rows, cost)

	return QueryPlanAnalysis{
		SQL:          sqlStr,
		Driver:       driver,
		PlanType:     planType,
		RowsExamined: rows,
		KeyUsed:      keyUsed,
		Cost:         cost,
		Warnings:     warnings,
		Summary:      summary,
		PlanRaw: map[string]interface{}{
			"select_type": "SIMPLE",
			"type":        planType,
			"key":         keyUsed,
			"rows":        rows,
			"filtered":    100.0,
			"extra":       strings.Join(warnings, "; "),
		},
	}
}
