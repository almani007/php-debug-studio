package store

import (
	"github.com/google/uuid"
)

type Breakpoint struct {
	ID           string  `json:"id"`
	ProjectID    string  `json:"project_id"`
	FileURI      string  `json:"file_uri"`
	LineNumber   int     `json:"line_number"`
	Type         string  `json:"type"` // "line", "conditional", "call", "return", "exception"
	Condition    *string `json:"condition,omitempty"`
	HitCondition *string `json:"hit_condition,omitempty"`
	Enabled      bool    `json:"enabled"`
}

func (s *Store) SaveBreakpoint(b Breakpoint) (string, error) {
	if b.ID == "" {
		b.ID = uuid.New().String()
	}
	if b.Type == "" {
		b.Type = "line"
	}

	query := `INSERT INTO breakpoints (id, project_id, file_uri, line_number, type, condition, hit_condition, enabled)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			file_uri = excluded.file_uri,
			line_number = excluded.line_number,
			type = excluded.type,
			condition = excluded.condition,
			hit_condition = excluded.hit_condition,
			enabled = excluded.enabled`

	enabledInt := 0
	if b.Enabled {
		enabledInt = 1
	}

	_, err := s.db.Exec(query, b.ID, b.ProjectID, b.FileURI, b.LineNumber, b.Type, b.Condition, b.HitCondition, enabledInt)
	return b.ID, err
}

func (s *Store) ListBreakpoints(projectID string) ([]Breakpoint, error) {
	query := `SELECT id, project_id, file_uri, line_number, type, condition, hit_condition, enabled
		FROM breakpoints WHERE project_id = ? ORDER BY file_uri ASC, line_number ASC`
	rows, err := s.db.Query(query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []Breakpoint
	for rows.Next() {
		var b Breakpoint
		var enabledInt int
		if err := rows.Scan(&b.ID, &b.ProjectID, &b.FileURI, &b.LineNumber, &b.Type, &b.Condition, &b.HitCondition, &enabledInt); err == nil {
			b.Enabled = enabledInt == 1
			list = append(list, b)
		}
	}
	return list, nil
}

func (s *Store) DeleteBreakpoint(id string) error {
	query := `DELETE FROM breakpoints WHERE id = ?`
	_, err := s.db.Exec(query, id)
	return err
}
