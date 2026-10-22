package executor

import (
	"bytes"
	"fmt"
	"os/exec"
	"path/filepath"
	"time"
)

var DestructiveArtisanCommands = map[string]bool{
	"migrate:fresh": true,
	"migrate:reset": true,
	"db:wipe":       true,
	"db:seed":       true,
}

type ArtisanRunRequest struct {
	ProjectPath      string   `json:"project_path"`
	PhpBinaryPath    string   `json:"php_binary_path,omitempty"`
	Command          string   `json:"command"`
	Args             []string `json:"args,omitempty"`
	ForceDestructive bool     `json:"force_destructive,omitempty"`
}

type ArtisanRunResponse struct {
	Command    string `json:"command"`
	ExitCode   int    `json:"exit_code"`
	Stdout     string `json:"stdout"`
	Stderr     string `json:"stderr"`
	DurationMs int64  `json:"duration_ms"`
	Blocked    bool   `json:"blocked,omitempty"`
}

func RunArtisan(req ArtisanRunRequest) *ArtisanRunResponse {
	start := time.Now()

	// Guard against unconfirmed destructive commands
	if DestructiveArtisanCommands[req.Command] && !req.ForceDestructive {
		return &ArtisanRunResponse{
			Command:    req.Command,
			ExitCode:   1,
			Stderr:     fmt.Sprintf("Blocked: Command '%s' is destructive. Confirmation required.", req.Command),
			DurationMs: 0,
			Blocked:    true,
		}
	}

	phpBin := req.PhpBinaryPath
	if phpBin == "" {
		phpBin = "php"
	}

	artisanFile := filepath.Join(req.ProjectPath, "artisan")
	fullArgs := append([]string{artisanFile, req.Command}, req.Args...)

	cmd := exec.Command(phpBin, fullArgs...)
	cmd.Dir = req.ProjectPath

	var stdout, stderr bytes.Buffer
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr

	err := cmd.Run()
	duration := time.Since(start).Milliseconds()

	exitCode := 0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		} else {
			exitCode = 1
			stderr.WriteString(err.Error())
		}
	}

	return &ArtisanRunResponse{
		Command:    req.Command,
		ExitCode:   exitCode,
		Stdout:     stdout.String(),
		Stderr:     stderr.String(),
		DurationMs: duration,
	}
}
