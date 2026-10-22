package store

type ColumnMetadata struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Nullable bool   `json:"nullable"`
}

type TableSchema struct {
	TableName string           `json:"table_name"`
	Columns   []ColumnMetadata `json:"columns"`
}

type SchemaDifference struct {
	TableName     string   `json:"table_name"`
	AddedColumns   []string `json:"added_columns"`
	DroppedColumns []string `json:"dropped_columns"`
	AlteredColumns []string `json:"altered_columns"`
}

// CompareTableSchemas identifies drift between a recorded baseline and observed schema
func CompareTableSchemas(baseline, current TableSchema) *SchemaDifference {
	diff := &SchemaDifference{
		TableName:      baseline.TableName,
		AddedColumns:   make([]string, 0),
		DroppedColumns: make([]string, 0),
		AlteredColumns: make([]string, 0),
	}

	baselineCols := make(map[string]ColumnMetadata)
	for _, c := range baseline.Columns {
		baselineCols[c.Name] = c
	}

	currentCols := make(map[string]ColumnMetadata)
	for _, c := range current.Columns {
		currentCols[c.Name] = c
	}

	// Check for added or altered columns
	for name, curCol := range currentCols {
		if baseCol, exists := baselineCols[name]; !exists {
			diff.AddedColumns = append(diff.AddedColumns, name)
		} else if baseCol.Type != curCol.Type || baseCol.Nullable != curCol.Nullable {
			diff.AlteredColumns = append(diff.AlteredColumns, name)
		}
	}

	// Check for dropped columns
	for name := range baselineCols {
		if _, exists := currentCols[name]; !exists {
			diff.DroppedColumns = append(diff.DroppedColumns, name)
		}
	}

	return diff
}
