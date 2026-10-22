package executor

import (
	"bytes"
	"os/exec"
	"path/filepath"
	"time"
)

type TestRunRequest struct {
	ProjectPath   string `json:"project_path"`
	PhpBinaryPath string `json:"php_binary_path,omitempty"`
	Runner        string `json:"runner,omitempty"` // "phpunit" or "pest"
	Filter        string `json:"filter,omitempty"`
}

type TestRunResponse struct {
	Runner     string `json:"runner"`
	ExitCode   int    `json:"exit_code"`
	Output     string `json:"output"`
	Passed     bool   `json:"passed"`
	DurationMs int64  `json:"duration_ms"`
}

func RunPHPTests(req TestRunRequest) *TestRunResponse {
	start := time.Now()

	phpBin := req.PhpBinaryPath
	if phpBin == "" {
		phpBin = "php"
	}

	runner := req.Runner
	if runner == "" {
		runner = "phpunit"
	}

	executable := filepath.Join(req.ProjectPath, "vendor", "bin", runner)
	args := []string{executable, "--testdox"}
	if req.Filter != "" {
		args = append(args, "--filter", req.Filter)
	}

	cmd := exec.Command(phpBin, args...)
	cmd.Dir = req.ProjectPath

	var combined bytes.Buffer
	cmd.Stdout = &combined
	cmd.Stderr = &combined

	err := cmd.Run()
	duration := time.Since(start).Milliseconds()

	exitCode := 0
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			exitCode = exitErr.ExitCode()
		} else {
			exitCode = 1
			combined.WriteString("\nExecution failed: " + err.Error())
		}
	}

	return &TestRunResponse{
		Runner:     runner,
		ExitCode:   exitCode,
		Output:     combined.String(),
		Passed:     exitCode == 0,
		DurationMs: duration,
	}
}
