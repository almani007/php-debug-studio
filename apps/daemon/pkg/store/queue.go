package store

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
)

type QueueJob struct {
	ID               string    `json:"id"`
	ProjectID        string    `json:"project_id"`
	QueueName        string    `json:"queue_name"`
	Connection       string    `json:"connection"`
	JobClass         string    `json:"job_class"`
	PayloadJSON      string    `json:"payload_json"`
	Attempts         int       `json:"attempts"`
	Status           string    `json:"status"` // "failed", "processing", "completed", "replayed"
	ExceptionMessage *string   `json:"exception_message,omitempty"`
	ExceptionTrace   *string   `json:"exception_trace,omitempty"`
	FailedAt         *string   `json:"failed_at,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
}

func (s *Store) SaveQueueJob(j QueueJob) (string, error) {
	if j.ID == "" {
		j.ID = uuid.New().String()
	}
	if j.Connection == "" {
		j.Connection = "default"
	}
	if j.Status == "" {
		j.Status = "failed"
	}
	if j.CreatedAt.IsZero() {
		j.CreatedAt = time.Now().UTC()
	}

	query := `INSERT INTO queue_jobs (id, project_id, queue_name, connection, job_class, payload_json, attempts, status, exception_message, exception_trace, failed_at, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			status = excluded.status,
			attempts = excluded.attempts,
			exception_message = excluded.exception_message,
			exception_trace = excluded.exception_trace,
			failed_at = excluded.failed_at`

	_, err := s.db.Exec(query, j.ID, j.ProjectID, j.QueueName, j.Connection, j.JobClass, j.PayloadJSON, j.Attempts, j.Status,
		j.ExceptionMessage, j.ExceptionTrace, j.FailedAt, j.CreatedAt.Format(time.RFC3339))
	return j.ID, err
}

func (s *Store) ListQueueJobs(projectID, status string) ([]QueueJob, error) {
	query := `SELECT id, project_id, queue_name, connection, job_class, payload_json, attempts, status, exception_message, exception_trace, failed_at, created_at
		FROM queue_jobs WHERE 1=1`
	var args []interface{}

	if projectID != "" {
		query += ` AND project_id = ?`
		args = append(args, projectID)
	}
	if status != "" && status != "all" {
		query += ` AND status = ?`
		args = append(args, status)
	}
	query += ` ORDER BY created_at DESC LIMIT 100`

	rows, err := s.db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var jobs []QueueJob
	for rows.Next() {
		var j QueueJob
		var exMsg, exTrace, failAt sql.NullString
		var createdStr string

		if err := rows.Scan(&j.ID, &j.ProjectID, &j.QueueName, &j.Connection, &j.JobClass, &j.PayloadJSON, &j.Attempts, &j.Status,
			&exMsg, &exTrace, &failAt, &createdStr); err != nil {
			return nil, err
		}

		if exMsg.Valid {
			j.ExceptionMessage = &exMsg.String
		}
		if exTrace.Valid {
			j.ExceptionTrace = &exTrace.String
		}
		if failAt.Valid {
			j.FailedAt = &failAt.String
		}
		j.CreatedAt, _ = time.Parse(time.RFC3339, createdStr)
		jobs = append(jobs, j)
	}

	return jobs, nil
}

func (s *Store) ReplayQueueJob(id string) error {
	_, err := s.db.Exec(`UPDATE queue_jobs SET status = 'replayed', attempts = attempts + 1 WHERE id = ?`, id)
	return err
}
