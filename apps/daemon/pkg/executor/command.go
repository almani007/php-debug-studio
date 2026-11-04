package executor

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// ResolveCommand determines whether to run a command via Docker or via host PHP
func ResolveCommand(projectPath, phpBin, connectionMode, containerName string, subCmd string, args []string) (*exec.Cmd, error) {
	targetContainer := containerName
	if targetContainer == "" && connectionMode == "docker" {
		targetContainer = detectDockerContainer(projectPath)
	}

	// Auto-detect container by folder name if container not explicitly specified
	if targetContainer == "" {
		targetContainer = detectDockerContainer(projectPath)
	}

	if targetContainer != "" {
		// Running inside Docker container
		var dockerArgs []string
		if subCmd == "artisan" {
			dockerArgs = append([]string{"exec", "-i", targetContainer, "php", "artisan"}, args...)
		} else if subCmd == "test" {
			runner := "phpunit"
			testArgs := args
			if len(args) > 0 && (args[0] == "pest" || args[0] == "phpunit") {
				runner = args[0]
				testArgs = args[1:]
			}
			execPath := "./vendor/bin/" + runner
			dockerArgs = append([]string{"exec", "-i", targetContainer, "php", execPath}, testArgs...)
		} else {
			dockerArgs = append([]string{"exec", "-i", targetContainer}, args...)
		}
		cmd := exec.Command("docker", dockerArgs...)
		return cmd, nil
	}

	// Host execution
	resolvedBin := phpBin
	if resolvedBin == "" || resolvedBin == "php" {
		if path, err := exec.LookPath("php"); err == nil {
			resolvedBin = path
		} else {
			for _, p := range []string{"/usr/bin/php", "/usr/local/bin/php", "/bin/php"} {
				if fi, err := os.Stat(p); err == nil && !fi.IsDir() {
					resolvedBin = p
					break
				}
			}
		}
	}

	if resolvedBin == "" || resolvedBin == "php" {
		return nil, fmt.Errorf("PHP executable not found in PATH or standard locations (/usr/bin/php), and no matching Docker container found for '%s'. Please specify php_binary_path or container_name in project settings.", projectPath)
	}

	var hostArgs []string
	if subCmd == "artisan" {
		artisanFile := filepath.Join(projectPath, "artisan")
		hostArgs = append([]string{artisanFile}, args...)
	} else if subCmd == "test" {
		runner := "phpunit"
		testArgs := args
		if len(args) > 0 && (args[0] == "pest" || args[0] == "phpunit") {
			runner = args[0]
			testArgs = args[1:]
		}
		execPath := filepath.Join(projectPath, "vendor", "bin", runner)
		hostArgs = append([]string{execPath}, testArgs...)
	} else {
		hostArgs = args
	}

	cmd := exec.Command(resolvedBin, hostArgs...)
	cmd.Dir = projectPath
	return cmd, nil
}

func detectDockerContainer(projectPath string) string {
	baseName := filepath.Base(projectPath)
	if baseName == "" || baseName == "." || baseName == "/" {
		return ""
	}
	candidates := []string{
		baseName + "_app",
		baseName + "-app",
		baseName,
		"brixel_" + baseName + "_app",
		baseName + "_php",
	}
	for _, c := range candidates {
		checkCmd := exec.Command("docker", "inspect", "--format={{.State.Running}}", c)
		out, err := checkCmd.Output()
		if err == nil && strings.TrimSpace(string(out)) == "true" {
			return c
		}
	}
	return ""
}
