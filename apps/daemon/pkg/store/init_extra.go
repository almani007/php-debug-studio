package store

// InitQATables creates the tables used by the enhanced QA module.
func (s *Store) InitQATables() error {
	_, err := s.db.Exec(`
	CREATE TABLE IF NOT EXISTS qa_snapshots (
		id TEXT PRIMARY KEY,
		project_id TEXT,
		name TEXT NOT NULL,
		payload_json TEXT,
		created_at TEXT NOT NULL
	);
	CREATE TABLE IF NOT EXISTS qa_regressions (
		id TEXT PRIMARY KEY,
		project_id TEXT,
		snapshot_id TEXT,
		status TEXT,
		details_json TEXT,
		created_at TEXT NOT NULL
	);
	`)
	return err
}

// InitManagementTables creates the tables used by the DB management module.
func (s *Store) InitManagementTables() error {
	_, err := s.db.Exec(`
	CREATE TABLE IF NOT EXISTS db_saved_queries (
		id TEXT PRIMARY KEY,
		connection_id TEXT,
		name TEXT NOT NULL,
		query TEXT NOT NULL,
		description TEXT,
		created_at TEXT NOT NULL,
		updated_at TEXT NOT NULL
	);
	`)
	return err
}
