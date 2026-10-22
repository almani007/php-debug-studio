package diagnostics

import (
	"bufio"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/google/uuid"
)

type SecurityFinding struct {
	ID          string `json:"id"`
	Check       string `json:"check"`
	Severity    string `json:"severity"` // "CRITICAL", "WARNING", "INFO"
	Description string `json:"description"`
	Remediation string `json:"remediation"`
	Evidence    string `json:"evidence,omitempty"`
}

type SecurityReport struct {
	ProjectPath string            `json:"project_path"`
	ScannedAt   time.Time         `json:"scanned_at"`
	Summary     map[string]int    `json:"summary"` // count per severity
	Findings    []SecurityFinding `json:"findings"`
}

func RunSecurityAudit(projectPath string) SecurityReport {
	report := SecurityReport{
		ProjectPath: projectPath,
		ScannedAt:   time.Now().UTC(),
		Summary:     map[string]int{"CRITICAL": 0, "WARNING": 0, "INFO": 0},
		Findings:    make([]SecurityFinding, 0),
	}

	addFinding := func(check, severity, desc, remediation, evidence string) {
		f := SecurityFinding{
			ID:          uuid.New().String(),
			Check:       check,
			Severity:    severity,
			Description: desc,
			Remediation: remediation,
			Evidence:    evidence,
		}
		report.Findings = append(report.Findings, f)
		report.Summary[severity]++
	}

	// 1. Check .env file
	envPath := filepath.Join(projectPath, ".env")
	envInfo, err := os.Stat(envPath)
	if err != nil {
		addFinding("ENV_FILE_MISSING", "INFO", "No .env file found at root", "Ensure .env is configured from .env.example", "")
	} else {
		// Check file permissions
		mode := envInfo.Mode().Perm()
		if mode&0044 != 0 {
			addFinding(
				"ENV_FILE_PERMISSIONS",
				"WARNING",
				fmt.Sprintf(".env file is readable by group/others (permissions: %04o)", mode),
				"Restrict .env file permissions to owner only: chmod 600 .env",
				fmt.Sprintf("Current permissions: %04o", mode),
			)
		}

		// Parse .env lines
		envFile, err := os.Open(envPath)
		if err == nil {
			scanner := bufio.NewScanner(envFile)
			envVars := make(map[string]string)
			for scanner.Scan() {
				line := strings.TrimSpace(scanner.Text())
				if line == "" || strings.HasPrefix(line, "#") {
					continue
				}
				parts := strings.SplitN(line, "=", 2)
				if len(parts) == 2 {
					key := strings.TrimSpace(parts[0])
					val := strings.Trim(strings.TrimSpace(parts[1]), `"'`)
					envVars[key] = val
				}
			}
			_ = envFile.Close()

			// Check APP_DEBUG
			if strings.EqualFold(envVars["APP_DEBUG"], "true") {
				envName := envVars["APP_ENV"]
				if envName != "local" && envName != "testing" {
					addFinding(
						"APP_DEBUG_ENABLED",
						"CRITICAL",
						"APP_DEBUG is enabled in a non-local environment ("+envName+")",
						"Set APP_DEBUG=false in production to prevent stack trace leaks",
						"APP_DEBUG=true",
					)
				} else {
					addFinding(
						"APP_DEBUG_LOCAL",
						"INFO",
						"APP_DEBUG is enabled for local development",
						"Remember to disable in production environments",
						"APP_DEBUG=true",
					)
				}
			}

			// Check APP_KEY
			appKey := envVars["APP_KEY"]
			if appKey == "" {
				addFinding(
					"APP_KEY_EMPTY",
					"CRITICAL",
					"APP_KEY encryption key is not set",
					"Generate a secure application key: php artisan key:generate",
					"",
				)
			} else if len(appKey) < 32 {
				addFinding(
					"APP_KEY_WEAK",
					"CRITICAL",
					"APP_KEY is shorter than 32 characters, risking AES cipher vulnerabilities",
					"Regenerate a strong 256-bit key: php artisan key:generate",
					"Key length: "+fmt.Sprint(len(appKey)),
				)
			}

			// Check SESSION_SECURE_COOKIE
			if strings.EqualFold(envVars["SESSION_SECURE_COOKIE"], "false") {
				addFinding(
					"SESSION_COOKIE_INSECURE",
					"WARNING",
					"SESSION_SECURE_COOKIE is false, allowing session hijacking over plain HTTP",
					"Set SESSION_SECURE_COOKIE=true in .env",
					"SESSION_SECURE_COOKIE=false",
				)
			}
		}
	}

	// 2. Check public directory for leaked files
	publicDir := filepath.Join(projectPath, "public")
	riskyFiles := []string{".env", ".git", "dump.sql", "database.sqlite", ".env.backup"}
	for _, rf := range riskyFiles {
		p := filepath.Join(publicDir, rf)
		if _, err := os.Stat(p); err == nil {
			addFinding(
				"PUBLIC_SENSITIVE_FILE",
				"CRITICAL",
				"Sensitive file found in web server document root: public/"+rf,
				"Immediately remove "+rf+" from the public webroot",
				"public/"+rf+" exists",
			)
		}
	}

	// 3. Check composer.json for debug packages in prod require
	composerPath := filepath.Join(projectPath, "composer.json")
	if data, err := os.ReadFile(composerPath); err == nil {
		str := string(data)
		debugPackages := []string{"barryvdh/laravel-debugbar", "facade/ignition", "spatie/laravel-ray"}
		for _, pkg := range debugPackages {
			if strings.Contains(str, `"`+pkg+`"`) {
				// Check if in "require" block vs "require-dev"
				reqIdx := strings.Index(str, `"require":`)
				reqDevIdx := strings.Index(str, `"require-dev":`)
				pkgIdx := strings.Index(str, `"`+pkg+`"`)

				if reqIdx != -1 && (reqDevIdx == -1 || pkgIdx < reqDevIdx) {
					addFinding(
						"DEBUG_PACKAGE_IN_PROD",
						"WARNING",
						"Development debugging package '"+pkg+"' is declared in 'require' instead of 'require-dev'",
						"Move '"+pkg+"' to 'require-dev' in composer.json: composer require --dev "+pkg,
						pkg,
					)
				}
			}
		}
	}

	return report
}
