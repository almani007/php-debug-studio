// Package dbwatch captures live SQL executed against a project's MySQL
// database without requiring any change to the application itself.
//
// It finds the MySQL container that belongs to the project, enables the
// server's general query log in table mode, and tails mysql.general_log.
// Every captured statement is broadcast over the daemon WebSocket as a
// "sql_query" event so the studio can display application queries in
// real time.
package dbwatch

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"os/exec"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	_ "github.com/go-sql-driver/mysql"

	"brixel/php-debug-studio/daemon/pkg/xdebug"
)

// Query is a single captured statement.
type Query struct {
	ID             string `json:"id"`
	ProjectID      string `json:"project_id"`
	ConnectionName string `json:"connection_name"`
	SQLTemplate    string `json:"sql_template"`
	SQL            string `json:"sql"`
	Command        string `json:"command"`
	ThreadID       int64  `json:"thread_id"`
	Database       string `json:"database,omitempty"`
	DurationUs     int64  `json:"duration_us"`
	RowsAffected   int64  `json:"rows_affected"`
	Timestamp      string `json:"timestamp"`
	Source         string `json:"source"`
}

// Status describes the current state of the live SQL capture.
type Status struct {
	Running      bool   `json:"running"`
	Container    string `json:"container,omitempty"`
	Image        string `json:"image,omitempty"`
	Host         string `json:"host,omitempty"`
	Port         string `json:"port,omitempty"`
	Database     string `json:"database,omitempty"`
	User         string `json:"user,omitempty"`
	Captured     int64  `json:"captured"`
	Buffered     int    `json:"buffered"`
	Since        string `json:"since,omitempty"`
	LastEvent    string `json:"last_event,omitempty"`
	LastError    string `json:"last_error,omitempty"`
	GeneralLog   bool   `json:"general_log"`
	PollInterval string `json:"poll_interval,omitempty"`
	Message      string `json:"message,omitempty"`
}

// Options configures a Watcher.
type Options struct {
	ProjectID   string
	ProjectName string
	ProjectRoot string
	// PollInterval defaults to 400ms.
	PollInterval time.Duration
	// BufferSize defaults to 500.
	BufferSize int
	OnQuery    func(Query)
	OnLog      func(format string, args ...interface{})
}

// Watcher tails the MySQL general log for one project.
type Watcher struct {
	mu     sync.Mutex
	opts   Options
	status Status
	recent []Query

	running bool
	stopCh  chan struct{}
	db      *sql.DB
	cursor  time.Time
	seen    map[string]time.Time
	connID  int64
	prevLog struct {
		GeneralLog string
		LogOutput  string
	}
}

// New creates a watcher. Start must be called to begin capture.
func New(opts Options) *Watcher {
	if opts.PollInterval <= 0 {
		opts.PollInterval = 400 * time.Millisecond
	}
	if opts.BufferSize <= 0 {
		opts.BufferSize = 500
	}
	if opts.OnLog == nil {
		opts.OnLog = log.Printf
	}
	return &Watcher{
		opts:   opts,
		status: Status{Message: "Live SQL capture has not started yet."},
		seen:   make(map[string]time.Time),
	}
}

// Recent returns the most recent captured statements, newest first.
func (w *Watcher) Recent(limit int) []Query {
	w.mu.Lock()
	defer w.mu.Unlock()
	if limit <= 0 || limit > len(w.recent) {
		limit = len(w.recent)
	}
	out := make([]Query, 0, limit)
	for i := len(w.recent) - 1; i >= 0 && len(out) < limit; i-- {
		out = append(out, w.recent[i])
	}
	return out
}

// Status returns a snapshot of the watcher state.
func (w *Watcher) Status() Status {
	w.mu.Lock()
	defer w.mu.Unlock()
	s := w.status
	s.Running = w.running
	s.Buffered = len(w.recent)
	return s
}

// SetProject points the watcher at a different project. It stops any running
// capture so the next Start uses the new project.
func (w *Watcher) SetProject(projectID, projectName, projectRoot string) {
	w.mu.Lock()
	changed := w.opts.ProjectID != projectID || w.opts.ProjectRoot != projectRoot
	w.opts.ProjectID = projectID
	w.opts.ProjectName = projectName
	w.opts.ProjectRoot = projectRoot
	w.mu.Unlock()
	if changed {
		_ = w.Stop()
	}
}

// Start discovers the project's MySQL container and begins tailing queries.
func (w *Watcher) Start() error {
	w.mu.Lock()
	if w.running {
		w.mu.Unlock()
		return nil
	}
	opts := w.opts
	w.status.Message = "Discovering the project's MySQL runtime…"
	w.mu.Unlock()

	root, _ := xdebug.ResolveProjectRoot(opts.ProjectName, opts.ProjectRoot)
	disc, err := discoverMySQL(root, opts.ProjectName)
	if err != nil {
		w.fail(err)
		return err
	}

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/mysql?charset=utf8mb4&parseTime=true&loc=Local&timeout=5s&allowNativePasswords=true",
		"root", disc.RootPassword, disc.Host, disc.Port)
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		w.fail(err)
		return err
	}
	db.SetMaxOpenConns(2)
	db.SetMaxIdleConns(1)

	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		_ = db.Close()
		err = fmt.Errorf("could not connect to MySQL at %s:%s: %w", disc.Host, disc.Port, err)
		w.fail(err)
		return err
	}

	// Remember the current server settings so they can be restored.
	var generalLog, logOutput string
	_ = db.QueryRowContext(ctx, `SELECT @@GLOBAL.general_log, @@GLOBAL.log_output`).Scan(&generalLog, &logOutput)

	// Read the polling connection's own thread id so its statements can be
	// excluded from the capture.
	var connID int64
	_ = db.QueryRowContext(ctx, `SELECT CONNECTION_ID()`).Scan(&connID)

	if _, err := db.ExecContext(ctx, `SET GLOBAL log_output = 'TABLE'`); err != nil {
		_ = db.Close()
		err = fmt.Errorf("MySQL rejected log_output=TABLE (root privileges required): %w", err)
		w.fail(err)
		return err
	}
	if _, err := db.ExecContext(ctx, `SET GLOBAL general_log = 'ON'`); err != nil {
		_ = db.Close()
		err = fmt.Errorf("could not enable the MySQL general log: %w", err)
		w.fail(err)
		return err
	}

	var now time.Time
	if err := db.QueryRowContext(ctx, `SELECT NOW(6)`).Scan(&now); err != nil {
		now = time.Now()
	}

	w.mu.Lock()
	w.db = db
	w.connID = connID
	w.cursor = now
	w.seen = make(map[string]time.Time)
	w.running = true
	w.stopCh = make(chan struct{})
	w.status = Status{
		Running:      true,
		Container:    disc.Container,
		Image:        disc.Image,
		Host:         disc.Host,
		Port:         disc.Port,
		Database:     disc.Database,
		User:         "root",
		Since:        time.Now().Format(time.RFC3339),
		GeneralLog:   true,
		PollInterval: w.opts.PollInterval.String(),
		Message:      "Capturing live SQL from the application.",
	}
	w.prevLog.GeneralLog = generalLog
	w.prevLog.LogOutput = logOutput
	w.mu.Unlock()

	w.opts.OnLog("Live SQL capture started for %s (container %s, %s:%s)", opts.ProjectName, disc.Container, disc.Host, disc.Port)
	go w.loop()
	return nil
}

// Stop disables capture and restores the previous MySQL log settings when
// the watcher was the component that enabled the general log.
func (w *Watcher) Stop() error {
	w.mu.Lock()
	if !w.running {
		w.mu.Unlock()
		return nil
	}
	close(w.stopCh)
	db := w.db
	prev := w.prevLog
	w.running = false
	w.db = nil
	w.status.Running = false
	w.status.GeneralLog = false
	w.status.Message = "Live SQL capture stopped."
	w.mu.Unlock()

	ctx, cancel := context.WithTimeout(context.Background(), 8*time.Second)
	defer cancel()
	if prev.GeneralLog == "OFF" || prev.GeneralLog == "0" {
		_, _ = db.ExecContext(ctx, `SET GLOBAL general_log = 'OFF'`)
	}
	if prev.LogOutput != "" && !strings.EqualFold(prev.LogOutput, "TABLE") {
		_, _ = db.ExecContext(ctx, fmt.Sprintf("SET GLOBAL log_output = '%s'", strings.ReplaceAll(prev.LogOutput, "'", "")))
	}
	_ = db.Close()
	w.opts.OnLog("Live SQL capture stopped")
	return nil
}

func (w *Watcher) fail(err error) {
	w.mu.Lock()
	w.status.Running = false
	w.status.LastError = err.Error()
	w.status.Message = "Live SQL capture could not start."
	w.mu.Unlock()
	w.opts.OnLog("Live SQL capture error: %v", err)
}

func (w *Watcher) loop() {
	ticker := time.NewTicker(w.opts.PollInterval)
	defer ticker.Stop()
	maintenance := time.NewTicker(2 * time.Minute)
	defer maintenance.Stop()

	for {
		select {
		case <-w.stopCh:
			return
		case <-ticker.C:
			w.poll()
		case <-maintenance.C:
			w.maintain()
		}
	}
}

var sqlStart = regexp.MustCompile(`(?i)^\s*\(*\s*(SELECT|INSERT|UPDATE|DELETE|REPLACE|WITH|CALL)\b`)

func (w *Watcher) poll() {
	w.mu.Lock()
	db := w.db
	cursor := w.cursor
	connID := w.connID
	w.mu.Unlock()
	if db == nil {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	rows, err := db.QueryContext(ctx, `SELECT event_time, thread_id, command_type, argument
		FROM mysql.general_log
		WHERE event_time >= ?
		ORDER BY event_time ASC
		LIMIT 500`, cursor)
	if err != nil {
		w.mu.Lock()
		w.status.LastError = err.Error()
		w.mu.Unlock()
		return
	}
	defer rows.Close()

	var batch []Query
	var latest time.Time
	for rows.Next() {
		var eventTime time.Time
		var threadID int64
		var command, argument string
		if err := rows.Scan(&eventTime, &threadID, &command, &argument); err != nil {
			continue
		}
		if eventTime.After(latest) {
			latest = eventTime
		}
		if threadID == connID {
			continue
		}
		if !isCapturable(command, argument) {
			continue
		}
		key := eventTime.Format("2006-01-02 15:04:05.000000") + "|" + strconv.FormatInt(threadID, 10) + "|" + argument
		w.mu.Lock()
		_, duplicate := w.seen[key]
		if !duplicate {
			w.seen[key] = eventTime
		}
		w.mu.Unlock()
		if duplicate {
			continue
		}
		batch = append(batch, Query{
			ID:             uuid.New().String(),
			ProjectID:      w.opts.ProjectID,
			ConnectionName: "application",
			SQLTemplate:    argument,
			SQL:            argument,
			Command:        command,
			ThreadID:       threadID,
			Timestamp:      eventTime.Format(time.RFC3339Nano),
			Source:         "application",
		})
	}
	_ = rows.Err()

	if len(batch) > 0 {
		w.mu.Lock()
		w.recent = append(w.recent, batch...)
		if overflow := len(w.recent) - w.opts.BufferSize; overflow > 0 {
			w.recent = append([]Query(nil), w.recent[overflow:]...)
		}
		w.status.Captured += int64(len(batch))
		w.status.LastEvent = batch[len(batch)-1].Timestamp
		w.status.LastError = ""
		w.mu.Unlock()

		for _, q := range batch {
			if w.opts.OnQuery != nil {
				w.opts.OnQuery(q)
			}
		}
	}

	if latest.After(cursor) {
		w.mu.Lock()
		if latest.After(w.cursor) {
			w.cursor = latest
		}
		// Keep the dedupe map small.
		cutoff := latest.Add(-5 * time.Minute)
		for k, ts := range w.seen {
			if ts.Before(cutoff) {
				delete(w.seen, k)
			}
		}
		w.mu.Unlock()
	}
}

func isCapturable(command, argument string) bool {
	switch command {
	case "Query", "Execute":
	default:
		return false
	}
	trimmed := strings.TrimSpace(argument)
	if trimmed == "" {
		return false
	}
	lower := strings.ToLower(trimmed)
	if strings.Contains(lower, "mysql.general_log") ||
		strings.Contains(lower, "performance_schema") ||
		strings.Contains(lower, "information_schema.innodb") {
		return false
	}
	return sqlStart.MatchString(trimmed)
}

// maintain keeps mysql.general_log from growing without bound. MySQL refuses
// DELETE/TRUNCATE while the log table is active, so the log is briefly
// disabled for truncation and then resumed.
func (w *Watcher) maintain() {
	w.mu.Lock()
	db := w.db
	w.mu.Unlock()
	if db == nil {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()

	var count int64
	if err := db.QueryRowContext(ctx, `SELECT COUNT(*) FROM mysql.general_log`).Scan(&count); err != nil {
		return
	}
	if count < 50000 {
		return
	}
	if _, err := db.ExecContext(ctx, `SET GLOBAL general_log = 'OFF'`); err != nil {
		return
	}
	_, _ = db.ExecContext(ctx, `TRUNCATE TABLE mysql.general_log`)
	_, _ = db.ExecContext(ctx, `SET GLOBAL general_log = 'ON'`)
	var now time.Time
	if err := db.QueryRowContext(ctx, `SELECT NOW(6)`).Scan(&now); err == nil {
		w.mu.Lock()
		w.cursor = now
		w.seen = make(map[string]time.Time)
		w.mu.Unlock()
	}
	w.opts.OnLog("Trimmed MySQL general log (%d rows)", count)
}

// ── Discovery ──

// Discovered describes a MySQL container that can be used for capture.
type Discovered struct {
	Container    string
	Image        string
	Host         string
	Port         string
	Database     string
	RootPassword string
}

func run(name string, args ...string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	out, err := exec.CommandContext(ctx, name, args...).Output()
	return strings.TrimSpace(string(out)), err
}

func inspect(container, format string) string {
	out, err := run("docker", "inspect", container, "--format", format)
	if err != nil {
		return ""
	}
	return out
}

func normalize(s string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(s) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		}
	}
	return b.String()
}

type containerEnv map[string]string

func parseEnv(raw string) containerEnv {
	env := containerEnv{}
	for _, line := range strings.Split(raw, "\n") {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}
		if idx := strings.Index(line, "="); idx > 0 {
			env[line[:idx]] = line[idx+1:]
		}
	}
	return env
}

func publishedPort(raw string) string {
	if raw == "" || raw == "null" {
		return ""
	}
	var ports map[string][]struct {
		HostIP   string `json:"HostIp"`
		HostPort string `json:"HostPort"`
	}
	if err := json.Unmarshal([]byte(raw), &ports); err != nil {
		return ""
	}
	keys := make([]string, 0, len(ports))
	for k := range ports {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, k := range keys {
		if !strings.HasPrefix(k, "3306/") && !strings.HasPrefix(k, "3307/") {
			continue
		}
		for _, binding := range ports[k] {
			if binding.HostPort != "" {
				return binding.HostPort
			}
		}
	}
	// Fall back to any published port when the container uses a custom one.
	for _, k := range keys {
		for _, binding := range ports[k] {
			if binding.HostPort != "" {
				return binding.HostPort
			}
		}
	}
	return ""
}

func discoverMySQL(projectRoot, projectName string) (*Discovered, error) {
	names, err := run("docker", "ps", "--format", "{{.Names}}")
	if err != nil {
		return nil, fmt.Errorf("Docker is not available: %w", err)
	}
	rootNorm := normalize(projectRoot)
	baseNorm := normalize(projectName)
	if baseNorm == "" && rootNorm != "" {
		baseNorm = rootNorm
	}

	for _, name := range strings.Split(names, "\n") {
		name = strings.TrimSpace(name)
		if name == "" {
			continue
		}
		image := strings.ToLower(inspect(name, "{{.Config.Image}}"))
		if !strings.Contains(image, "mysql") && !strings.Contains(image, "mariadb") {
			continue
		}
		service := strings.ToLower(inspect(name, `{{index .Config.Labels "com.docker.compose.service"}}`))
		if service == "phpmyadmin" || strings.Contains(strings.ToLower(name), "phpmyadmin") {
			continue
		}
		workdir := inspect(name, `{{index .Config.Labels "com.docker.compose.project.working_dir"}}`)
		matched := false
		if rootNorm != "" && normalize(workdir) == rootNorm {
			matched = true
		}
		containerNorm := normalize(name)
		if baseNorm != "" && strings.Contains(containerNorm, baseNorm) {
			matched = true
		}
		if !matched {
			continue
		}
		port := publishedPort(inspect(name, "{{json .NetworkSettings.Ports}}"))
		if port == "" {
			continue
		}
		env := parseEnv(inspect(name, "{{range .Config.Env}}{{println .}}{{end}}"))
		rootPass := env["MYSQL_ROOT_PASSWORD"]
		if rootPass == "" {
			rootPass = env["MARIADB_ROOT_PASSWORD"]
		}
		if rootPass == "" {
			continue
		}
		return &Discovered{
			Container:    name,
			Image:        inspect(name, "{{.Config.Image}}"),
			Host:         "127.0.0.1",
			Port:         port,
			Database:     env["MYSQL_DATABASE"],
			RootPassword: rootPass,
		}, nil
	}
	return nil, fmt.Errorf("no running MySQL container found for project %q", projectName)
}
