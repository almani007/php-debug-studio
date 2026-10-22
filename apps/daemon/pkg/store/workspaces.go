package store

import (
	"time"

	"github.com/google/uuid"
)

type Workspace struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	ProjectIDs  []string  `json:"project_ids,omitempty"`
}

type ProjectEnvironment struct {
	ID                string    `json:"id"`
	ProjectID         string    `json:"project_id"`
	Name              string    `json:"name"`
	Kind              string    `json:"kind"` // local, staging, production
	CollectorURL      string    `json:"collector_url,omitempty"`
	IsProduction      bool      `json:"is_production"`
	CapturePolicyJSON string    `json:"capture_policy_json"`
	SamplingRate      float64   `json:"sampling_rate"`
	RetentionDays     int       `json:"retention_days"`
	CreatedAt         time.Time `json:"created_at"`
}

func (s *Store) CreateWorkspace(w Workspace) (string, error) {
	if w.ID == "" {
		w.ID = uuid.New().String()
	}
	if w.CreatedAt.IsZero() {
		w.CreatedAt = time.Now().UTC()
	}

	query := `INSERT INTO workspaces (id, name, description, created_at) VALUES (?, ?, ?, ?)`
	_, err := s.db.Exec(query, w.ID, w.Name, w.Description, w.CreatedAt.Format(time.RFC3339))
	return w.ID, err
}

func (s *Store) ListWorkspaces() ([]Workspace, error) {
	query := `SELECT id, name, COALESCE(description, ''), created_at FROM workspaces ORDER BY name ASC`
	rows, err := s.db.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var workspaces []Workspace
	for rows.Next() {
		var w Workspace
		var createdStr string
		if err := rows.Scan(&w.ID, &w.Name, &w.Description, &createdStr); err != nil {
			return nil, err
		}
		w.CreatedAt, _ = time.Parse(time.RFC3339, createdStr)

		// Fetch attached project IDs
		pRows, err := s.db.Query(`SELECT project_id FROM workspace_projects WHERE workspace_id = ?`, w.ID)
		if err == nil {
			for pRows.Next() {
				var pID string
				if err := pRows.Scan(&pID); err == nil {
					w.ProjectIDs = append(w.ProjectIDs, pID)
				}
			}
			pRows.Close()
		}

		workspaces = append(workspaces, w)
	}
	return workspaces, nil
}

func (s *Store) DeleteWorkspace(id string) error {
	_, err := s.db.Exec(`DELETE FROM workspaces WHERE id = ?`, id)
	return err
}

func (s *Store) AssignProjectToWorkspace(workspaceID, projectID string) error {
	_, _ = s.db.Exec(`UPDATE projects SET workspace_id = ? WHERE id = ?`, workspaceID, projectID)
	_, err := s.db.Exec(`INSERT OR REPLACE INTO workspace_projects (workspace_id, project_id) VALUES (?, ?)`, workspaceID, projectID)
	return err
}

func (s *Store) RemoveProjectFromWorkspace(workspaceID, projectID string) error {
	_, _ = s.db.Exec(`UPDATE projects SET workspace_id = NULL WHERE id = ? AND workspace_id = ?`, projectID, workspaceID)
	_, err := s.db.Exec(`DELETE FROM workspace_projects WHERE workspace_id = ? AND project_id = ?`, workspaceID, projectID)
	return err
}

func (s *Store) CreateProjectEnvironment(env ProjectEnvironment) (string, error) {
	if env.ID == "" {
		env.ID = uuid.New().String()
	}
	if env.CreatedAt.IsZero() {
		env.CreatedAt = time.Now().UTC()
	}
	if env.Kind == "" {
		env.Kind = "local"
	}
	if env.SamplingRate <= 0 || env.SamplingRate > 1.0 {
		env.SamplingRate = 1.0
	}
	if env.RetentionDays <= 0 {
		env.RetentionDays = 7
	}
	if env.CapturePolicyJSON == "" {
		env.CapturePolicyJSON = "{}"
	}

	prodInt := 0
	if env.IsProduction {
		prodInt = 1
	}

	query := `INSERT INTO project_environments (id, project_id, name, kind, collector_url, is_production, capture_policy_json, sampling_rate, retention_days, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
	_, err := s.db.Exec(query, env.ID, env.ProjectID, env.Name, env.Kind, env.CollectorURL, prodInt, env.CapturePolicyJSON, env.SamplingRate, env.RetentionDays, env.CreatedAt.Format(time.RFC3339))
	return env.ID, err
}

func (s *Store) ListProjectEnvironments(projectID string) ([]ProjectEnvironment, error) {
	query := `SELECT id, project_id, name, kind, COALESCE(collector_url, ''), is_production, COALESCE(capture_policy_json, '{}'), sampling_rate, retention_days, created_at
		FROM project_environments WHERE project_id = ? ORDER BY name ASC`
	rows, err := s.db.Query(query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var envs []ProjectEnvironment
	for rows.Next() {
		var e ProjectEnvironment
		var isProdInt int
		var createdStr string
		if err := rows.Scan(&e.ID, &e.ProjectID, &e.Name, &e.Kind, &e.CollectorURL, &isProdInt, &e.CapturePolicyJSON, &e.SamplingRate, &e.RetentionDays, &createdStr); err != nil {
			return nil, err
		}
		e.IsProduction = isProdInt == 1
		e.CreatedAt, _ = time.Parse(time.RFC3339, createdStr)
		envs = append(envs, e)
	}
	return envs, nil
}

func (s *Store) DeleteProject(id string) error {
	_, err := s.db.Exec(`DELETE FROM projects WHERE id = ?`, id)
	return err
}
