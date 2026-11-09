package store

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"strings"
	"time"
)

// ─── Export ───

type ExportRequest struct {
	ConnectionID string `json:"connection_id"`
	Table        string `json:"table"`
	Format       string `json:"format"` // "csv", "json", "sql"
	WhereClause  string `json:"where_clause,omitempty"`
	Limit        int    `json:"limit,omitempty"`
}

type ExportResult struct {
	Format     string `json:"format"`
	Table      string `json:"table"`
	RowCount   int    `json:"row_count"`
	Data       string `json:"data"`
	ExportedAt time.Time `json:"exported_at"`
}

func (s *Store) ExportTableData(req ExportRequest) (*ExportResult, error) {
	if req.ConnectionID == "" || req.Table == "" {
		return nil, fmt.Errorf("connection_id and table are required")
	}
	if req.Limit <= 0 { req.Limit = 1000 }
	if req.Format == "" { req.Format = "csv" }

	query := fmt.Sprintf("SELECT * FROM %s", req.Table)
	if req.WhereClause != "" {
		query += " WHERE " + req.WhereClause
	}
	query += fmt.Sprintf(" LIMIT %d", req.Limit)

	queryResult, err := s.ExecuteReadOnlyQuery(req.ConnectionID, query)
	if err != nil {
		return nil, fmt.Errorf("export query failed: %w", err)
	}

	result := &ExportResult{
		Format:     req.Format,
		Table:      req.Table,
		RowCount:   len(queryResult.Rows),
		ExportedAt: time.Now(),
	}

	switch req.Format {
	case "csv":
		var buf strings.Builder
		w := csv.NewWriter(&buf)
		_ = w.Write(queryResult.Columns)
		for _, row := range queryResult.Rows {
			record := make([]string, len(queryResult.Columns))
			for i, col := range queryResult.Columns {
				if v, ok := row[col]; ok {
					record[i] = fmt.Sprintf("%v", v)
				}
			}
			_ = w.Write(record)
		}
		w.Flush()
		result.Data = buf.String()

	case "json":
		b, _ := json.MarshalIndent(queryResult.Rows, "", "  ")
		result.Data = string(b)

	case "sql":
		var buf strings.Builder
		for _, row := range queryResult.Rows {
			cols := make([]string, 0, len(queryResult.Columns))
			vals := make([]string, 0, len(queryResult.Columns))
			for _, col := range queryResult.Columns {
				cols = append(cols, col)
				if v, ok := row[col]; ok {
					switch tv := v.(type) {
					case string:
						vals = append(vals, fmt.Sprintf("'%s'", strings.ReplaceAll(tv, "'", "''")))
					case nil:
						vals = append(vals, "NULL")
					default:
						vals = append(vals, fmt.Sprintf("%v", tv))
					}
				} else {
					vals = append(vals, "NULL")
				}
			}
			buf.WriteString(fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s);\n",
				req.Table, strings.Join(cols, ", "), strings.Join(vals, ", ")))
		}
		result.Data = buf.String()

	default:
		return nil, fmt.Errorf("unsupported format: %s", req.Format)
	}

	return result, nil
}

// ─── Import ───

type ImportRequest struct {
	ConnectionID string `json:"connection_id"`
	Table        string `json:"table"`
	Format       string `json:"format"` // "csv", "json"
	Data         string `json:"data"`
}

type ImportResult struct {
	RowsImported int       `json:"rows_imported"`
	RowsFailed   int       `json:"rows_failed"`
	Errors       []string  `json:"errors,omitempty"`
	ImportedAt   time.Time `json:"imported_at"`
}

func (s *Store) ImportTableData(req ImportRequest) (*ImportResult, error) {
	if req.ConnectionID == "" || req.Table == "" || req.Data == "" {
		return nil, fmt.Errorf("connection_id, table, and data are required")
	}

	result := &ImportResult{
		ImportedAt: time.Now(),
		Errors:     make([]string, 0),
	}

	switch req.Format {
	case "csv":
		r := csv.NewReader(strings.NewReader(req.Data))
		records, err := r.ReadAll()
		if err != nil {
			return nil, fmt.Errorf("failed to parse CSV: %w", err)
		}
		if len(records) < 2 {
			return result, nil
		}
		headers := records[0]
		for i, row := range records[1:] {
			vals := make([]string, len(headers))
			for j := range headers {
				if j < len(row) {
					vals[j] = fmt.Sprintf("'%s'", strings.ReplaceAll(row[j], "'", "''"))
				} else {
					vals[j] = "NULL"
				}
			}
			query := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)",
				req.Table, strings.Join(headers, ", "), strings.Join(vals, ", "))
			if _, err := s.ExecuteReadOnlyQuery(req.ConnectionID, query); err != nil {
				result.RowsFailed++
				result.Errors = append(result.Errors, fmt.Sprintf("row %d: %s", i+1, err.Error()))
			} else {
				result.RowsImported++
			}
		}

	case "json":
		var rows []map[string]interface{}
		if err := json.Unmarshal([]byte(req.Data), &rows); err != nil {
			return nil, fmt.Errorf("failed to parse JSON: %w", err)
		}
		for i, row := range rows {
			cols := make([]string, 0)
			vals := make([]string, 0)
			for k, v := range row {
				cols = append(cols, k)
				switch tv := v.(type) {
				case string:
					vals = append(vals, fmt.Sprintf("'%s'", strings.ReplaceAll(tv, "'", "''")))
				case nil:
					vals = append(vals, "NULL")
				default:
					vals = append(vals, fmt.Sprintf("%v", tv))
				}
			}
			query := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)",
				req.Table, strings.Join(cols, ", "), strings.Join(vals, ", "))
			if _, err := s.ExecuteReadOnlyQuery(req.ConnectionID, query); err != nil {
				result.RowsFailed++
				result.Errors = append(result.Errors, fmt.Sprintf("row %d: %s", i+1, err.Error()))
			} else {
				result.RowsImported++
			}
		}

	default:
		return nil, fmt.Errorf("unsupported import format: %s", req.Format)
	}

	return result, nil
}

// ─── Saved Queries ───

type SavedQuery struct {
	ID           string    `json:"id"`
	ConnectionID string    `json:"connection_id"`
	Name         string    `json:"name"`
	Query        string    `json:"query"`
	Description  string    `json:"description,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

var savedQueryStore []SavedQuery

func (s *Store) GetSavedQueries(connectionID string) []SavedQuery {
	if savedQueryStore == nil { return []SavedQuery{} }
	if connectionID == "" { return savedQueryStore }
	var filtered []SavedQuery
	for _, q := range savedQueryStore {
		if q.ConnectionID == connectionID { filtered = append(filtered, q) }
	}
	if filtered == nil { return []SavedQuery{} }
	return filtered
}

func (s *Store) SaveQuery(sq SavedQuery) (*SavedQuery, error) {
	if sq.Name == "" || sq.Query == "" {
		return nil, fmt.Errorf("name and query are required")
	}
	sq.ID = fmt.Sprintf("sq_%d", time.Now().UnixNano())
	sq.CreatedAt = time.Now()
	sq.UpdatedAt = time.Now()
	savedQueryStore = append(savedQueryStore, sq)
	return &sq, nil
}

func (s *Store) DeleteSavedQuery(id string) error {
	for i, q := range savedQueryStore {
		if q.ID == id {
			savedQueryStore = append(savedQueryStore[:i], savedQueryStore[i+1:]...)
			return nil
		}
	}
	return fmt.Errorf("saved query not found: %s", id)
}

// ─── Migration Generator ───

type MigrationRequest struct {
	SourceConnectionID string `json:"source_connection_id"`
	TargetConnectionID string `json:"target_connection_id"`
}

type MigrationResult struct {
	GeneratedAt time.Time          `json:"generated_at"`
	SourceConn  string             `json:"source_connection_id"`
	TargetConn  string             `json:"target_connection_id"`
	Statements  []MigrationStmt    `json:"statements"`
	Summary     MigrationSummary   `json:"summary"`
}

type MigrationStmt struct {
	Type      string `json:"type"` // "create_table", "alter_table", "add_column", "drop_column", "add_index"
	Table     string `json:"table"`
	SQL       string `json:"sql"`
	Reversible bool  `json:"reversible"`
	ReverseSQL string `json:"reverse_sql,omitempty"`
}

type MigrationSummary struct {
	TablesToCreate int `json:"tables_to_create"`
	TablesToAlter  int `json:"tables_to_alter"`
	ColumnsToAdd   int `json:"columns_to_add"`
	ColumnsToDrop  int `json:"columns_to_drop"`
	IndexesToAdd   int `json:"indexes_to_add"`
}

func (s *Store) GenerateMigration(req MigrationRequest) (*MigrationResult, error) {
	if req.SourceConnectionID == "" || req.TargetConnectionID == "" {
		return nil, fmt.Errorf("source and target connection IDs are required")
	}

	// Get schemas for both connections
	sourceSchema, err := s.GetDatabaseSchema(req.SourceConnectionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get source schema: %w", err)
	}
	targetSchema, err := s.GetDatabaseSchema(req.TargetConnectionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get target schema: %w", err)
	}

	result := &MigrationResult{
		GeneratedAt: time.Now(),
		SourceConn:  req.SourceConnectionID,
		TargetConn:  req.TargetConnectionID,
		Statements:  make([]MigrationStmt, 0),
	}

	targetTableMap := make(map[string]*TableInfo)
	for i := range targetSchema.Tables {
		targetTableMap[targetSchema.Tables[i].Name] = &targetSchema.Tables[i]
	}

	for _, srcTable := range sourceSchema.Tables {
		tgtTable, exists := targetTableMap[srcTable.Name]
		if !exists {
			// Table doesn't exist in target — generate CREATE TABLE
			var colDefs []string
			for _, col := range srcTable.Columns {
				def := fmt.Sprintf("  %s %s", col.Name, col.Type)
				if !col.Nullable { def += " NOT NULL" }
				if col.DefaultValue != "" && col.DefaultValue != "NULL" { def += " DEFAULT " + col.DefaultValue }
				colDefs = append(colDefs, def)
			}
			createSQL := fmt.Sprintf("CREATE TABLE %s (\n%s\n);", srcTable.Name, strings.Join(colDefs, ",\n"))
			result.Statements = append(result.Statements, MigrationStmt{
				Type: "create_table", Table: srcTable.Name, SQL: createSQL,
				Reversible: true, ReverseSQL: fmt.Sprintf("DROP TABLE IF EXISTS %s;", srcTable.Name),
			})
			result.Summary.TablesToCreate++
			continue
		}

		// Table exists — compare columns
		tgtColMap := make(map[string]ColumnInfo)
		for _, col := range tgtTable.Columns {
			tgtColMap[col.Name] = col
		}

		altered := false
		for _, srcCol := range srcTable.Columns {
			if _, exists := tgtColMap[srcCol.Name]; !exists {
				def := fmt.Sprintf("ALTER TABLE %s ADD COLUMN %s %s", srcTable.Name, srcCol.Name, srcCol.Type)
				if !srcCol.Nullable { def += " NOT NULL" }
				if srcCol.DefaultValue != "" && srcCol.DefaultValue != "NULL" { def += " DEFAULT " + srcCol.DefaultValue }
				def += ";"
				result.Statements = append(result.Statements, MigrationStmt{
					Type: "add_column", Table: srcTable.Name, SQL: def,
					Reversible: true, ReverseSQL: fmt.Sprintf("ALTER TABLE %s DROP COLUMN %s;", srcTable.Name, srcCol.Name),
				})
				result.Summary.ColumnsToAdd++
				altered = true
			}
		}
		if altered { result.Summary.TablesToAlter++ }
	}

	return result, nil
}

// ─── Schema Compare ───

type SchemaCompareRequest struct {
	LeftConnectionID  string `json:"left_connection_id"`
	RightConnectionID string `json:"right_connection_id"`
}

type SchemaCompareResult struct {
	ComparedAt    time.Time            `json:"compared_at"`
	LeftConn      string               `json:"left_connection_id"`
	RightConn     string               `json:"right_connection_id"`
	OnlyInLeft    []string             `json:"only_in_left"`
	OnlyInRight   []string             `json:"only_in_right"`
	InBoth        []string             `json:"in_both"`
	Differences   []SchemaTableDiff    `json:"differences"`
	Identical     bool                 `json:"identical"`
}

type SchemaTableDiff struct {
	Table       string            `json:"table"`
	ColumnDiffs []SchemaColumnDiff `json:"column_diffs"`
}

type SchemaColumnDiff struct {
	Column   string `json:"column"`
	LeftType  string `json:"left_type,omitempty"`
	RightType string `json:"right_type,omitempty"`
	DiffType  string `json:"diff_type"` // "only_left", "only_right", "type_mismatch"
}

func (s *Store) CompareSchemas(req SchemaCompareRequest) (*SchemaCompareResult, error) {
	if req.LeftConnectionID == "" || req.RightConnectionID == "" {
		return nil, fmt.Errorf("both connection IDs are required")
	}

	leftSchema, err := s.GetDatabaseSchema(req.LeftConnectionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get left schema: %w", err)
	}
	rightSchema, err := s.GetDatabaseSchema(req.RightConnectionID)
	if err != nil {
		return nil, fmt.Errorf("failed to get right schema: %w", err)
	}

	result := &SchemaCompareResult{
		ComparedAt:  time.Now(),
		LeftConn:    req.LeftConnectionID,
		RightConn:   req.RightConnectionID,
		OnlyInLeft:  make([]string, 0),
		OnlyInRight: make([]string, 0),
		InBoth:      make([]string, 0),
		Differences: make([]SchemaTableDiff, 0),
		Identical:   true,
	}

	leftMap := make(map[string]*TableInfo)
	for i := range leftSchema.Tables {
		leftMap[leftSchema.Tables[i].Name] = &leftSchema.Tables[i]
	}
	rightMap := make(map[string]*TableInfo)
	for i := range rightSchema.Tables {
		rightMap[rightSchema.Tables[i].Name] = &rightSchema.Tables[i]
	}

	for name := range leftMap {
		if _, ok := rightMap[name]; !ok {
			result.OnlyInLeft = append(result.OnlyInLeft, name)
			result.Identical = false
		} else {
			result.InBoth = append(result.InBoth, name)
		}
	}
	for name := range rightMap {
		if _, ok := leftMap[name]; !ok {
			result.OnlyInRight = append(result.OnlyInRight, name)
			result.Identical = false
		}
	}

	// Compare columns for tables in both
	for _, tableName := range result.InBoth {
		lt := leftMap[tableName]
		rt := rightMap[tableName]
		leftCols := make(map[string]ColumnInfo)
		for _, c := range lt.Columns { leftCols[c.Name] = c }
		rightCols := make(map[string]ColumnInfo)
		for _, c := range rt.Columns { rightCols[c.Name] = c }

		var diffs []SchemaColumnDiff
		for name, lc := range leftCols {
			if rc, ok := rightCols[name]; !ok {
				diffs = append(diffs, SchemaColumnDiff{Column: name, LeftType: lc.Type, DiffType: "only_left"})
			} else if lc.Type != rc.Type {
				diffs = append(diffs, SchemaColumnDiff{Column: name, LeftType: lc.Type, RightType: rc.Type, DiffType: "type_mismatch"})
			}
		}
		for name, rc := range rightCols {
			if _, ok := leftCols[name]; !ok {
				diffs = append(diffs, SchemaColumnDiff{Column: name, RightType: rc.Type, DiffType: "only_right"})
			}
		}
		if len(diffs) > 0 {
			result.Differences = append(result.Differences, SchemaTableDiff{Table: tableName, ColumnDiffs: diffs})
			result.Identical = false
		}
	}

	return result, nil
}

// ─── Realtime Metrics ───

type RealtimeMetricsResult struct {
	ConnectionID string            `json:"connection_id"`
	CollectedAt  time.Time         `json:"collected_at"`
	Uptime       int64             `json:"uptime_seconds"`
	QPS          float64           `json:"queries_per_second"`
	ActiveConns  int               `json:"active_connections"`
	SlowQueries  int               `json:"slow_queries"`
	CacheHitRate float64           `json:"cache_hit_rate"`
	TableSizes   []TableSizeInfo   `json:"table_sizes"`
}

type TableSizeInfo struct {
	Name     string `json:"name"`
	RowCount int64  `json:"row_count"`
	DataSize int64  `json:"data_size_bytes"`
}

func (s *Store) GetRealtimeMetrics(connectionID string) (*RealtimeMetricsResult, error) {
	if connectionID == "" {
		return nil, fmt.Errorf("connection_id is required")
	}

	result := &RealtimeMetricsResult{
		ConnectionID: connectionID,
		CollectedAt:  time.Now(),
		TableSizes:   make([]TableSizeInfo, 0),
	}

	// Try to get stats from the database
	stats, err := s.GetDatabaseStats(connectionID)
	if err == nil {
		var uptime int64
		_, _ = fmt.Sscanf(stats.Uptime, "%d", &uptime)
		result.Uptime = uptime
		result.ActiveConns = stats.OpenConns
	}

	// Get table sizes
	schema, err := s.GetDatabaseSchema(connectionID)
	if err == nil {
		for _, t := range schema.Tables {
			result.TableSizes = append(result.TableSizes, TableSizeInfo{
				Name:     t.Name,
				RowCount: t.EstimatedRows,
			})
		}
	}

	return result, nil
}

// ExecuteReadOnlyQuery runs a read-only query with a row cap.
func (s *Store) ExecuteReadOnlyQuery(connID, query string) (*QueryResult, error) {
	return s.ExecuteSafeQuery(connID, query, 1000, false)
}

// GetDatabaseSchema returns the introspected schema for a connection.
func (s *Store) GetDatabaseSchema(connID string) (*DatabaseSchemaInfo, error) {
	return s.IntrospectSchema(connID)
}

// ImportTableData override to use ExecuteSafeQuery
func (s *Store) ImportTableDataOverride(req ImportRequest) (*ImportResult, error) {
	if req.ConnectionID == "" || req.Table == "" || req.Data == "" {
		return nil, fmt.Errorf("connection_id, table, and data are required")
	}

	result := &ImportResult{
		RowsImported: 0,
		RowsFailed:   0,
		Errors:       make([]string, 0),
		ImportedAt:   time.Now(),
	}

	switch req.Format {
	case "csv":
		r := csv.NewReader(strings.NewReader(req.Data))
		records, err := r.ReadAll()
		if err != nil {
			return nil, fmt.Errorf("failed to parse CSV: %w", err)
		}
		if len(records) < 2 {
			return result, nil
		}
		headers := records[0]
		for i, row := range records[1:] {
			vals := make([]string, len(headers))
			for j := range headers {
				if j < len(row) {
					vals[j] = fmt.Sprintf("'%s'", strings.ReplaceAll(row[j], "'", "''"))
				} else {
					vals[j] = "NULL"
				}
			}
			query := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)",
				req.Table, strings.Join(headers, ", "), strings.Join(vals, ", "))
			if _, err := s.ExecuteSafeQuery(req.ConnectionID, query, 1, true); err != nil {
				result.RowsFailed++
				result.Errors = append(result.Errors, fmt.Sprintf("row %d: %s", i+1, err.Error()))
			} else {
				result.RowsImported++
			}
		}

	case "json":
		var rows []map[string]interface{}
		if err := json.Unmarshal([]byte(req.Data), &rows); err != nil {
			return nil, fmt.Errorf("failed to parse JSON: %w", err)
		}
		for i, row := range rows {
			cols := make([]string, 0)
			vals := make([]string, 0)
			for k, v := range row {
				cols = append(cols, k)
				switch tv := v.(type) {
				case string:
					vals = append(vals, fmt.Sprintf("'%s'", strings.ReplaceAll(tv, "'", "''")))
				case nil:
					vals = append(vals, "NULL")
				default:
					vals = append(vals, fmt.Sprintf("%v", tv))
				}
			}
			query := fmt.Sprintf("INSERT INTO %s (%s) VALUES (%s)",
				req.Table, strings.Join(cols, ", "), strings.Join(vals, ", "))
			if _, err := s.ExecuteSafeQuery(req.ConnectionID, query, 1, true); err != nil {
				result.RowsFailed++
				result.Errors = append(result.Errors, fmt.Sprintf("row %d: %s", i+1, err.Error()))
			} else {
				result.RowsImported++
			}
		}

	default:
		return nil, fmt.Errorf("unsupported import format: %s", req.Format)
	}

	return result, nil
}
