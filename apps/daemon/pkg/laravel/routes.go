package laravel

import (
	"encoding/json"
	"fmt"
	"strings"

	"zoventra/php-debug-studio/daemon/pkg/executor"
)

type RouteInfo struct {
	Domain     *string  `json:"domain"`
	Method     string   `json:"method"`
	URI        string   `json:"uri"`
	Name       *string  `json:"name"`
	Action     string   `json:"action"`
	Middleware []string `json:"middleware"`
}

func GetRoutes(projectPath, phpBinaryPath string) ([]RouteInfo, error) {
	res := executor.RunArtisan(executor.ArtisanRunRequest{
		ProjectPath:   projectPath,
		PhpBinaryPath: phpBinaryPath,
		Command:       "route:list",
		Args:          []string{"--json"},
	})

	if res.ExitCode != 0 {
		return nil, fmt.Errorf("artisan route:list failed: %s", res.Stderr)
	}

	stdout := strings.TrimSpace(res.Stdout)
	startIdx := strings.Index(stdout, "[")
	if startIdx == -1 {
		return []RouteInfo{}, nil
	}
	stdout = stdout[startIdx:]

	var routes []RouteInfo
	if err := json.Unmarshal([]byte(stdout), &routes); err != nil {
		return nil, err
	}
	return routes, nil
}
