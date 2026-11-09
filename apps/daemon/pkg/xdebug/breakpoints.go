// Package breakpoints provides automatic breakpoint detection for PHP
// projects. It inspects the project structure (e.g. Laravel's public/index.php
// and routes/web.php) and suggests where to place breakpoints so the debugger
// stops on the first request without any manual configuration.
package xdebug

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"
)

// Suggestion is a single breakpoint location.
type Suggestion struct {
	FileURI    string `json:"file_uri"`
	LineNumber int    `json:"line_number"`
	Type       string `json:"type"` // always "line"
	Reason     string `json:"reason"`
}

// DetectBreakpoints examines the project root and returns suggested breakpoint
// locations. containerPrefix maps a host absolute path prefix to its container
// equivalent (e.g. "/Users/pl/Documents/sites/care_vision" -> "/var/www/html").
func DetectBreakpoints(projectRoot string, containerPrefix map[string]string) ([]Suggestion, error) {
	var suggestions []Suggestion

	// Detect project type.
	isLaravel := false
	if _, err := os.Stat(filepath.Join(projectRoot, "artisan")); err == nil {
		isLaravel = true
	}

	hostToContainer := func(hostPath string) string {
		hostPath = strings.TrimSpace(hostPath)
		// Sort prefixes by length descending so the most specific match wins.
		keys := make([]string, 0, len(containerPrefix))
		for k := range containerPrefix {
			keys = append(keys, k)
		}
		// Simple longest-prefix match.
		var bestHost, bestContainer string
		bestLen := -1
		for hostPrefix, containerPrefix := range containerPrefix {
			if strings.HasPrefix(hostPath, hostPrefix) && len(hostPrefix) > bestLen {
				bestHost = hostPrefix
				bestContainer = containerPrefix
				bestLen = len(hostPrefix)
			}
		}
		if bestLen >= 0 {
			return bestContainer + strings.TrimPrefix(hostPath, bestHost)
		}
		return hostPath
	}

	fileURISuggestion := func(hostAbsPath string, line int, reason string) {
		containerPath := hostToContainer(hostAbsPath)
		suggestions = append(suggestions, Suggestion{
			FileURI:    "file://" + containerPath,
			LineNumber: line,
			Type:       "line",
			Reason:     reason,
		})
	}

	// firstExecutableLine reads a PHP file and returns the line number of the
	// first executable statement (skipping the opening tag, blank lines, and
	// comments). Falls back to 1 if none is found.
	firstExecutableLine := func(path string) int {
		data, err := os.ReadFile(path)
		if err != nil {
			return 1
		}
		inBlockComment := false
		for i, line := range strings.Split(string(data), "\n") {
			lineNum := i + 1
			trimmed := strings.TrimSpace(line)
			if trimmed == "" {
				continue
			}
			if lineNum == 1 && strings.HasPrefix(trimmed, "<?php") {
				rest := strings.TrimSpace(trimmed[len("<?php"):])
				if rest == "" || strings.HasPrefix(rest, "//") || strings.HasPrefix(rest, "#") {
					continue
				}
			}
			if inBlockComment {
				if strings.Contains(trimmed, "*/") {
					inBlockComment = false
				}
				continue
			}
			if strings.HasPrefix(trimmed, "/*") {
				if !strings.Contains(trimmed, "*/") {
					inBlockComment = true
				}
				continue
			}
			if strings.HasPrefix(trimmed, "//") || strings.HasPrefix(trimmed, "#") {
				continue
			}
			if strings.HasPrefix(trimmed, "use ") {
				continue
			}
			return lineNum
		}
		return 1
	}

	if isLaravel {
		// Entry point: public/index.php (standard Laravel front controller)
		indexPHP := filepath.Join(projectRoot, "public", "index.php")
		if _, err := os.Stat(indexPHP); err == nil {
			fileURISuggestion(indexPHP, firstExecutableLine(indexPHP), "Laravel entry point (public/index.php)")
		}

		// Entry point: index.php at project root (some setups serve from here)
		rootIndexPHP := filepath.Join(projectRoot, "index.php")
		if _, err := os.Stat(rootIndexPHP); err == nil {
			fileURISuggestion(rootIndexPHP, firstExecutableLine(rootIndexPHP), "Laravel entry point (index.php)")
		}

		// Routes file: routes/web.php
		webPHP := filepath.Join(projectRoot, "routes", "web.php")
		if _, err := os.Stat(webPHP); err == nil {
			fileURISuggestion(webPHP, firstExecutableLine(webPHP), "Laravel web routes (routes/web.php)")
		}

		// API routes: routes/api.php
		apiPHP := filepath.Join(projectRoot, "routes", "api.php")
		if _, err := os.Stat(apiPHP); err == nil {
			fileURISuggestion(apiPHP, firstExecutableLine(apiPHP), "Laravel API routes (routes/api.php)")
		}
	}

	if len(suggestions) == 0 {
		return nil, fmt.Errorf("no detectable entry points in project root %s", projectRoot)
	}

	return suggestions, nil
}

// ContainerPrefixes inspects Docker containers and returns a mapping from host
// path prefixes to container path prefixes for the given project.
func ContainerPrefixes(projectRoot, projectName string) map[string]string {
	prefixes := make(map[string]string)

	out, err := runCmd(15*time.Second, "docker", "ps", "--format", "{{.Names}}")
	if err != nil {
		return prefixes
	}
	target, _ := filepath.Abs(filepath.Clean(projectRoot))
	targetBase := normalizeName(filepath.Base(target))
	projBase := normalizeName(projectName)

	for _, name := range strings.Split(strings.TrimSpace(out), "\n") {
		name = strings.TrimSpace(name)
		if name == "" {
			continue
		}
		workdir := containerInspect(name, `{{index .Config.Labels "com.docker.compose.project.working_dir"}}`)
		if workdir == "" {
			continue
		}
		w, _ := filepath.Abs(filepath.Clean(workdir))
		matched := w == target
		if !matched {
			// Fall back to matching by container name (e.g. care_vision_app).
			cn := normalizeName(name)
			if targetBase != "" && strings.Contains(cn, targetBase) {
				matched = true
			}
			if projBase != "" && strings.Contains(cn, projBase) {
				matched = true
			}
		}
		if !matched {
			continue
		}
		cwd := containerInspect(name, `{{.Config.WorkingDir}}`)
		if cwd == "" {
			cwd = "/var/www/html"
		}
		prefixes[target] = cwd
		prefixes[filepath.Clean(target)] = cwd
		return prefixes
	}
	return prefixes
}
