package store

import (
	"bytes"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// BackupRequest represents a request to backup database tables
type BackupRequest struct {
	ConnectionID string   `json:"connection_id"`
	Tables       []string `json:"tables,omitempty"`
	Format       string   `json:"format"`
	WhereClause  string   `json:"where_clause,omitempty"`
	Limit        int      `json:"limit"`
}

// BackupResult represents the backup data
type BackupResult struct {
	Format       string    `json:"format"`
	GeneratedAt  time.Time `json:"generated_at"`
	Data         string    `json:"data"`
}

// BackupTableData creates a backup of specified tables
func (s *Store) BackupTableData(req BackupRequest) (*BackupResult, error) {
	if req.ConnectionID == "" {
		return nil, fmt.Errorf("connection_id is required")
	}
	if req.Format == "" {
		req.Format = "sql"
	}
	if req.Limit <= 0 || req.Limit > 10000 {
		req.Limit = 1000
	}

	schema, err := s.GetDatabaseSchema(req.ConnectionID)
	if err != nil {
		return nil, fmt.Errorf("failed to introspect schema: %w", err)
	}

	tables := req.Tables
	if len(tables) == 0 {
		for _, t := range schema.Tables {
			if t.Type == "table" {
				tables = append(tables, t.Name)
			}
		}
	}

	if len(tables) == 0 {
		return nil, fmt.Errorf("no tables found to backup")
	}

	var buf bytes.Buffer
	buf.WriteString(fmt.Sprintf("-- Backup generated: %s\n-- Tables: %v\n-- Generated at: %s\n\n",
		time.Now().Format(time.RFC3339), tables, time.Now()))

	for _, table := range tables {
		buf.WriteString(fmt.Sprintf("--\n-- Table structure for `%s`\n--\n", table))

		createSQL, err := s.GetTableDDL(req.ConnectionID, table)
		if err != nil {
			continue
		}
		buf.WriteString(createSQL + ";\n\n")

		exportReq := ExportRequest{
			ConnectionID: req.ConnectionID,
			Table:        table,
			Format:       req.Format,
			WhereClause:  req.WhereClause,
			Limit:        req.Limit,
		}
		exportResult, err := s.ExportTableData(exportReq)
		if err != nil {
			continue
		}
		buf.WriteString(exportResult.Data + ";\n\n")
	}

	return &BackupResult{
		Format:       req.Format,
		GeneratedAt:  time.Now(),
		Data:         buf.String(),
	}, nil
}

// SchemaDiffResult represents the difference between two schemas
type SchemaDiffResult struct {
	ComparedAt     time.Time `json:"compared_at"`
	LeftConn       string    `json:"left_connection_id"`
	RightConn      string    `json:"right_connection_id"`
	TablesOnlyLeft []string   `json:"tables_only_left"`
	TablesOnlyRight []string  `json:"tables_only_right"`
	TablesInBoth   []string   `json:"tables_in_both"`
	Identical      bool      `json:"identical"`
	TableDiffs     []TableDiff `json:"table_diffs"`
}

// TableDiff represents differences in a single table
type TableDiff struct {
	TableName   string        `json:"table_name"`
	ColumnDiffs []ColumnDiff `json:"column_diffs"`
}

// ColumnDiff represents a column difference
type ColumnDiff struct {
	ColumnName string `json:"column_name"`
	LeftType   string `json:"left_type,omitempty"`
	RightType  string `json:"right_type,omitempty"`
	DiffType   string `json:"diff_type"`
}

// DiffSchemas compares two database schemas and returns the differences
func (s *Store) DiffSchemas(leftConnID, rightConnID string) (*SchemaDiffResult, error) {
	compareResult, err := s.CompareSchemas(SchemaCompareRequest{
		LeftConnectionID:  leftConnID,
		RightConnectionID: rightConnID,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to compare schemas: %w", err)
	}

	result := &SchemaDiffResult{
		ComparedAt:    time.Now(),
		LeftConn:      leftConnID,
		RightConn:     rightConnID,
		Identical:     compareResult.Identical,
		TablesOnlyLeft: compareResult.OnlyInLeft,
		TablesOnlyRight: compareResult.OnlyInRight,
		TablesInBoth:   compareResult.InBoth,
		TableDiffs:     []TableDiff{},
	}

	// Build column-level diffs for tables in both
	leftSchema, err := s.GetDatabaseSchema(leftConnID)
	if err != nil {
		return nil, fmt.Errorf("failed to introspect left schema: %w", err)
	}
	rightSchema, err := s.GetDatabaseSchema(rightConnID)
	if err != nil {
		return nil, fmt.Errorf("failed to introspect right schema: %w", err)
	}

	leftTableMap := make(map[string]*TableInfo)
	for i := range leftSchema.Tables {
		leftTableMap[leftSchema.Tables[i].Name] = &leftSchema.Tables[i]
	}
	rightTableMap := make(map[string]*TableInfo)
	for i := range rightSchema.Tables {
		rightTableMap[rightSchema.Tables[i].Name] = &rightSchema.Tables[i]
	}

	for _, tableName := range result.TablesInBoth {
		lt := leftTableMap[tableName]
		rt := rightTableMap[tableName]

		leftCols := make(map[string]ColumnInfo)
		for _, c := range lt.Columns {
			leftCols[c.Name] = c
		}
		rightCols := make(map[string]ColumnInfo)
		for _, c := range rt.Columns {
			rightCols[c.Name] = c
		}

		var columnDiffs []ColumnDiff
		for name, lc := range leftCols {
			if _, ok := rightCols[name]; !ok {
				columnDiffs = append(columnDiffs, ColumnDiff{
					ColumnName: name,
					LeftType:   lc.Type,
					DiffType:   "only_left",
				})
				result.Identical = false
			} else if lc.Type != rightCols[name].Type {
				columnDiffs = append(columnDiffs, ColumnDiff{
					ColumnName: name,
					LeftType:   lc.Type,
					RightType:  rightCols[name].Type,
					DiffType:   "type_mismatch",
				})
				result.Identical = false
			}
		}
		for name, rc := range rightCols {
			if _, ok := leftCols[name]; !ok {
				columnDiffs = append(columnDiffs, ColumnDiff{
					ColumnName: name,
					RightType:  rc.Type,
					DiffType:   "only_right",
				})
				result.Identical = false
			}
		}

		if len(columnDiffs) > 0 {
			result.TableDiffs = append(result.TableDiffs, TableDiff{
				TableName:   tableName,
				ColumnDiffs: columnDiffs,
			})
		}
	}

	return result, nil
}

// DataTransferRequest represents a request to transfer data between databases
type DataTransferRequest struct {
	SourceConnectionID string `json:"source_connection_id"`
	TargetConnectionID string `json:"target_connection_id"`
	SourceTable        string `json:"source_table"`
	TargetTable        string `json:"target_table,omitempty"`
	WhereClause        string `json:"where_clause,omitempty"`
	Limit              int    `json:"limit"`
}

// TransferData transfers data from source table to target table
func (s *Store) TransferData(req DataTransferRequest) (int64, error) {
	if req.SourceConnectionID == "" || req.TargetConnectionID == "" {
		return 0, fmt.Errorf("both source and target connection IDs are required")
	}
	if req.SourceTable == "" {
		return 0, fmt.Errorf("source table is required")
	}
	if req.Limit <= 0 || req.Limit > 10000 {
		req.Limit = 1000
	}

	exportReq := ExportRequest{
		ConnectionID: req.SourceConnectionID,
		Table:        req.SourceTable,
		Format:       "json",
		WhereClause:  req.WhereClause,
		Limit:        req.Limit,
	}
	exportResult, err := s.ExportTableData(exportReq)
	if err != nil {
		return 0, fmt.Errorf("failed to read source data: %w", err)
	}

	targetTable := req.TargetTable
	if targetTable == "" {
		targetTable = req.SourceTable
	}

	importReq := ImportRequest{
		ConnectionID: req.TargetConnectionID,
		Table:        targetTable,
		Format:       "json",
		Data:         exportResult.Data,
	}
	importResult, err := s.ImportTableData(importReq)
	if err != nil {
		return 0, fmt.Errorf("failed to import data to target: %w", err)
	}

	return int64(importResult.RowsImported), nil
}

// TableFilter represents a filter condition for table data
type TableFilter struct {
	ColumnName  string `json:"column_name"`
	Operator    string `json:"operator"`
	Value       string `json:"value"`
	Logic       string `json:"logic"`
}

// TableDataFilterRequest represents a request for filtered table data
type TableDataFilterRequest struct {
	ConnectionID string       `json:"connection_id"`
	TableName    string       `json:"table_name"`
	Page         int          `json:"page"`
	PageSize     int          `json:"page_size"`
	SortCol      string       `json:"sort_col"`
	SortDir      string       `json:"sort_dir"`
	Filters      []TableFilter `json:"filters"`
}

// GetTableDataWithFilters returns table data with Navicat-style filters
func (s *Store) GetTableDataWithFilters(req TableDataFilterRequest) (*TableDataResult, error) {
	baseResult, err := s.GetTableData(req.ConnectionID, req.TableName, req.Page, req.PageSize, req.SortCol, req.SortDir, "")
	if err != nil {
		return nil, err
	}

	if len(req.Filters) == 0 {
		return baseResult, nil
	}

	filteredRows := make([]map[string]interface{}, 0)
	for _, row := range baseResult.Rows {
		if s.rowMatchesFilters(row, req.Filters) {
			filteredRows = append(filteredRows, row)
		}
	}

	baseResult.Rows = filteredRows
	baseResult.TotalRows = int64(len(filteredRows))
	return baseResult, nil
}

func (s *Store) rowMatchesFilters(row map[string]interface{}, filters []TableFilter) bool {
	for _, f := range filters {
		val, exists := row[f.ColumnName]
		if !exists {
			return false
		}

		switch strings.ToUpper(f.Operator) {
		case "=":
			if fmt.Sprintf("%v", val) != f.Value {
				return false
			}
		case "!=":
			if fmt.Sprintf("%v", val) == f.Value {
				return false
			}
		case ">":
			if numVal, ok := val.(float64); ok {
				threshold, err := strconv.ParseFloat(f.Value, 64)
				if err != nil || numVal <= threshold {
					return false
				}
			} else {
				return false
			}
		case "<":
			if numVal, ok := val.(float64); ok {
				threshold, err := strconv.ParseFloat(f.Value, 64)
				if err != nil || numVal >= threshold {
					return false
				}
			} else {
				return false
			}
		case "LIKE":
			if !strings.Contains(fmt.Sprintf("%v", val), f.Value) {
				return false
			}
		}
	}
	return true
}
