package runtimes

import (
	"bytes"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
)

type PhpRuntimeInfo struct {
	Version    string `json:"version"`
	BinaryPath string `json:"binary_path"`
	IsDefault  bool   `json:"is_default"`
}

type PhpDetector struct {
	CommonPaths []string
}

func NewPhpDetector() *PhpDetector {
	return &PhpDetector{
		CommonPaths: []string{
			"/opt/homebrew/bin",
			"/usr/local/bin",
			"/usr/bin",
			"/opt/homebrew/opt",
			os.ExpandEnv("$HOME/Library/Application Support/Herd/bin"),
		},
	}
}

// DetectAvailableRuntimes searches the host machine for installed PHP versions
func (d *PhpDetector) DetectAvailableRuntimes() []PhpRuntimeInfo {
	runtimes := make([]PhpRuntimeInfo, 0)
	seenPaths := make(map[string]bool)

	// 1. Check default 'php' on system PATH
	if defaultPath, err := exec.LookPath("php"); err == nil {
		if ver, ok := probePhpVersion(defaultPath); ok {
			runtimes = append(runtimes, PhpRuntimeInfo{
				Version:    ver,
				BinaryPath: defaultPath,
				IsDefault:  true,
			})
			seenPaths[defaultPath] = true
		}
	}

	// 2. Probe well-known versioned Homebrew / system paths
	candidates := []string{
		"/opt/homebrew/bin/php",
		"/opt/homebrew/opt/php@8.4/bin/php",
		"/opt/homebrew/opt/php@8.3/bin/php",
		"/opt/homebrew/opt/php@8.2/bin/php",
		"/opt/homebrew/opt/php@8.1/bin/php",
		"/opt/homebrew/opt/php@8.0/bin/php",
		"/opt/homebrew/opt/php@7.4/bin/php",
		"/usr/local/bin/php",
		"/usr/bin/php",
	}

	// Also glob /opt/homebrew/bin/php*
	if matches, err := filepath.Glob("/opt/homebrew/bin/php*"); err == nil {
		candidates = append(candidates, matches...)
	}

	for _, path := range candidates {
		if seenPaths[path] {
			continue
		}
		if fi, err := os.Stat(path); err == nil && !fi.IsDir() {
			if ver, ok := probePhpVersion(path); ok {
				runtimes = append(runtimes, PhpRuntimeInfo{
					Version:    ver,
					BinaryPath: path,
					IsDefault:  false,
				})
				seenPaths[path] = true
			}
		}
	}

	// If no host PHP binaries detected (e.g. inside sandbox or Docker-only),
	// return standard supported selection options
	if len(runtimes) == 0 {
		standardVersions := []string{"8.4", "8.3", "8.2", "8.1", "8.0", "7.4"}
		for i, ver := range standardVersions {
			runtimes = append(runtimes, PhpRuntimeInfo{
				Version:    ver,
				BinaryPath: "docker / custom",
				IsDefault:  i == 1, // 8.3 default
			})
		}
	}

	return runtimes
}

func probePhpVersion(binaryPath string) (string, bool) {
	cmd := exec.Command(binaryPath, "-v")
	var out bytes.Buffer
	cmd.Stdout = &out
	if err := cmd.Run(); err != nil {
		return "", false
	}

	// Format: "PHP 8.3.12 (cli) ..."
	re := regexp.MustCompile(`PHP\s+([0-9]+\.[0-9]+(?:\.[0-9]+)?)`)
	matches := re.FindStringSubmatch(out.String())
	if len(matches) > 1 {
		return strings.TrimSpace(matches[1]), true
	}
	return "", false
}
