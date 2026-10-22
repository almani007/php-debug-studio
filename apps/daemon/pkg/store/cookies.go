package store

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
)

type Cookie struct {
	ID        string     `json:"id"`
	ProjectID string     `json:"project_id"`
	Domain    string     `json:"domain"`
	Path      string     `json:"path"`
	Name      string     `json:"name"`
	Value     string     `json:"value"`
	ExpiresAt *time.Time `json:"expires_at,omitempty"`
	Secure    bool       `json:"secure"`
	HttpOnly  bool       `json:"http_only"`
	CreatedAt time.Time  `json:"created_at"`
	UpdatedAt time.Time  `json:"updated_at"`
}

func (s *Store) SaveCookie(c Cookie) (string, error) {
	if c.ID == "" {
		c.ID = uuid.New().String()
	}
	if c.Path == "" {
		c.Path = "/"
	}
	now := time.Now().UTC()
	c.UpdatedAt = now
	if c.CreatedAt.IsZero() {
		c.CreatedAt = now
	}

	var expiresStr *string
	if c.ExpiresAt != nil {
		str := c.ExpiresAt.Format(time.RFC3339)
		expiresStr = &str
	}

	secureInt := 0
	if c.Secure {
		secureInt = 1
	}
	httpOnlyInt := 0
	if c.HttpOnly {
		httpOnlyInt = 1
	}

	query := `INSERT INTO cookies (id, project_id, domain, path, name, value, expires_at, secure, http_only, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(project_id, domain, path, name) DO UPDATE SET
			value = excluded.value,
			expires_at = excluded.expires_at,
			secure = excluded.secure,
			http_only = excluded.http_only,
			updated_at = excluded.updated_at`

	_, err := s.db.Exec(query, c.ID, c.ProjectID, c.Domain, c.Path, c.Name, c.Value, expiresStr, secureInt, httpOnlyInt,
		c.CreatedAt.Format(time.RFC3339), c.UpdatedAt.Format(time.RFC3339))
	return c.ID, err
}

func (s *Store) ListCookies(projectID, domain string) ([]Cookie, error) {
	query := `SELECT id, project_id, domain, path, name, value, expires_at, secure, http_only, created_at, updated_at
		FROM cookies WHERE project_id = ?`
	args := []interface{}{projectID}

	if domain != "" {
		query += ` AND domain = ?`
		args = append(args, domain)
	}
	query += ` ORDER BY domain ASC, name ASC`

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var cookies []Cookie
	for rows.Next() {
		var c Cookie
		var expiresStr sql.NullString
		var secInt, httpInt int
		var createdStr, updatedStr string

		if err := rows.Scan(&c.ID, &c.ProjectID, &c.Domain, &c.Path, &c.Name, &c.Value, &expiresStr, &secInt, &httpInt, &createdStr, &updatedStr); err != nil {
			return nil, err
		}

		c.Secure = secInt == 1
		c.HttpOnly = httpInt == 1
		if expiresStr.Valid {
			if t, err := time.Parse(time.RFC3339, expiresStr.String); err == nil {
				c.ExpiresAt = &t
			}
		}
		c.CreatedAt, _ = time.Parse(time.RFC3339, createdStr)
		c.UpdatedAt, _ = time.Parse(time.RFC3339, updatedStr)
		cookies = append(cookies, c)
	}

	return cookies, nil
}

func (s *Store) DeleteCookie(id string) error {
	_, err := s.db.Exec(`DELETE FROM cookies WHERE id = ?`, id)
	return err
}

func (s *Store) ClearCookies(projectID string) error {
	_, err := s.db.Exec(`DELETE FROM cookies WHERE project_id = ?`, projectID)
	return err
}
