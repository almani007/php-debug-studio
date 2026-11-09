// Package xdebug automatically discovers the PHP runtime that serves a
// project and enables Xdebug for this debug studio. It understands both
// host PHP installations (CLI/FPM/Apache) and Docker containers.
package xdebug

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

const iniFileName = "99-php-debug-studio.ini"

var configureMutex sync.Mutex

// Step is one observable action performed during auto-configuration.
type Step struct {
	Name       string `json:"name"`
	OK         bool   `json:"ok"`
	Output     string `json:"output,omitempty"`
	DurationMS int64  `json:"duration_ms"`
}

// Runtime describes one PHP runtime that can execute the project.
type Runtime struct {
	Kind             string `json:"kind"` // "docker" | "host"
	Container        string `json:"container,omitempty"`
	Image            string `json:"image,omitempty"`
	PHPVersion       string `json:"php_version,omitempty"`
	XdebugInstalled  bool   `json:"xdebug_installed"`
	XdebugVersion    string `json:"xdebug_version,omitempty"`
	Mode             string `json:"mode,omitempty"`
	ClientHost       string `json:"client_host,omitempty"`
	ClientPort       string `json:"client_port,omitempty"`
	IdeKey           string `json:"idekey,omitempty"`
	StartWithRequest string `json:"start_with_request,omitempty"`
	IniFile          string `json:"ini_file,omitempty"`
	Reachable        bool   `json:"reachable"`
	Configured       bool   `json:"configured"`
}

// Report is returned by Detect and Configure.
type Report struct {
	Success     bool      `json:"success"`
	ProjectRoot string    `json:"project_root"`
	Resolved    bool      `json:"root_resolved"`
	Listener    string    `json:"listener"`
	Runtimes    []Runtime `json:"runtimes"`
	Steps       []Step    `json:"steps,omitempty"`
	Message     string    `json:"message,omitempty"`
}

type options struct {
	Port   string
	IdeKey string
}

func normalizeOptions(port, ideKey string) options {
	if port == "" {
		port = os.Getenv("DEBUG_STUDIO_DBGP_PORT")
	}
	if port == "" {
		port = "9003"
	}
	if ideKey == "" {
		ideKey = "PHP_DEBUG_STUDIO"
	}
	return options{Port: port, IdeKey: ideKey}
}

func normalizeName(s string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(s) {
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		}
	}
	return b.String()
}

func containerMatches(container, workdir, projectRoot, projectName string) bool {
	if projectRoot != "" && workdir != "" {
		a, _ := filepath.Abs(filepath.Clean(projectRoot))
		b, _ := filepath.Abs(filepath.Clean(workdir))
		if a == b {
			return true
		}
	}
	cn := normalizeName(container)
	if pn := normalizeName(filepath.Base(projectRoot)); pn != "" && strings.Contains(cn, pn) {
		return true
	}
	if pn := normalizeName(projectName); pn != "" && strings.Contains(cn, pn) {
		return true
	}
	return false
}

// ResolveProjectRoot repairs a stale or misspelled project path by looking
// for a directory with a matching normalised name in common source folders.
func ResolveProjectRoot(projectName, root string) (string, bool) {
	root = strings.TrimSpace(root)
	if root != "" {
		if st, err := os.Stat(root); err == nil && st.IsDir() {
			return root, true
		}
	}
	target := normalizeName(filepath.Base(strings.TrimSpace(root)))
	if target == "" {
		target = normalizeName(projectName)
	}
	if target == "" {
		return root, false
	}

	home, _ := os.UserHomeDir()
	candidates := []string{
		filepath.Join(home, "Documents", "sites"),
		filepath.Join(home, "Documents", "Sites"),
		filepath.Join(home, "Sites"),
		filepath.Join(home, "Projects"),
		filepath.Join(home, "Code"),
		filepath.Join(home, "Developer"),
		filepath.Join(home, "www"),
	}
	// Keep containers working when the daemon runs from a workspace.
	if wd, err := os.Getwd(); err == nil {
		candidates = append(candidates, filepath.Dir(wd), wd)
	}

	seen := map[string]bool{}
	for _, base := range candidates {
		if seen[base] {
			continue
		}
		seen[base] = true
		entries, err := os.ReadDir(base)
		if err != nil {
			continue
		}
		for _, e := range entries {
			if !e.IsDir() || strings.HasPrefix(e.Name(), ".") {
				continue
			}
			if normalizeName(e.Name()) == target {
				return filepath.Join(base, e.Name()), true
			}
		}
	}
	return root, false
}

func runCmd(timeout time.Duration, name string, args ...string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	cmd := exec.CommandContext(ctx, name, args...)
	var buf bytes.Buffer
	cmd.Stdout = &buf
	cmd.Stderr = &buf
	err := cmd.Run()
	return buf.String(), err
}

func runInContainer(container, script string, timeout time.Duration) (string, error) {
	return runCmd(timeout, "docker", "exec", container, "sh", "-lc", script)
}

func tail(s string, n int) string {
	s = strings.TrimSpace(s)
	if len(s) <= n {
		return s
	}
	return "…" + s[len(s)-n:]
}

func phpAvailable(container string) (version string, ok bool) {
	out, err := runInContainer(container, `command -v php >/dev/null 2>&1 && php -d xdebug.start_with_request=no -r 'echo PHP_VERSION;'`, 20*time.Second)
	if err != nil {
		return "", false
	}
	version = strings.TrimSpace(out)
	return version, version != ""
}

func containerInspect(name, format string) string {
	out, err := runCmd(15*time.Second, "docker", "inspect", name, "--format", format)
	if err != nil {
		return ""
	}
	return strings.TrimSpace(out)
}

func listDockerCandidates(projectRoot, projectName string) []string {
	out, err := runCmd(15*time.Second, "docker", "ps", "--format", "{{.Names}}")
	if err != nil {
		return nil
	}
	type candidate struct {
		name      string
		preferred bool
	}
	var candidates []candidate
	for _, name := range strings.Split(strings.TrimSpace(out), "\n") {
		name = strings.TrimSpace(name)
		if name == "" {
			continue
		}
		workdir := containerInspect(name, `{{index .Config.Labels "com.docker.compose.project.working_dir"}}`)
		if !containerMatches(name, workdir, projectRoot, projectName) {
			continue
		}
		service := strings.ToLower(containerInspect(name, `{{index .Config.Labels "com.docker.compose.service"}}`))
		switch service {
		case "phpmyadmin", "adminer", "mysql", "mariadb", "postgres", "redis", "mongo", "mongodb", "nginx", "scheduler", "queue", "worker":
			// Helper services, never the application runtime.
			continue
		}
		preferred := service == "app" || service == "php" || service == "php-fpm" || service == "fpm" ||
			service == "web" || service == "laravel" ||
			strings.Contains(strings.ToLower(name), "_app") || strings.HasSuffix(strings.ToLower(name), "_php")
		candidates = append(candidates, candidate{name: name, preferred: preferred})
	}

	var matches []string
	for _, c := range candidates {
		if c.preferred {
			matches = append(matches, c.name)
		}
	}
	if len(matches) == 0 {
		for _, c := range candidates {
			matches = append(matches, c.name)
		}
	}
	return matches
}

func containerImage(name string) string {
	return containerInspect(name, "{{.Config.Image}}")
}

func phpInfoScript() string {
	return `php -d xdebug.start_with_request=no -r 'echo json_encode([
		"version" => PHP_VERSION,
		"xdebug_loaded" => extension_loaded("xdebug"),
		"xdebug_version" => extension_loaded("xdebug") ? phpversion("xdebug") : "",
		"mode" => (string) ini_get("xdebug.mode"),
		"client_host" => (string) ini_get("xdebug.client_host"),
		"client_port" => (string) ini_get("xdebug.client_port"),
		"idekey" => (string) ini_get("xdebug.idekey"),
		"start_with_request" => (string) ini_get("xdebug.start_with_request")
	]);'`
}

func parsePHPInfo(raw string) map[string]interface{} {
	start := strings.Index(raw, "{")
	end := strings.LastIndex(raw, "}")
	if start < 0 || end <= start {
		return nil
	}
	raw = raw[start : end+1]
	var out map[string]interface{}
	if err := json.Unmarshal([]byte(raw), &out); err != nil {
		return nil
	}
	return out
}

func scanDirFor(container string) string {
	if container != "" {
		out, err := runInContainer(container, "php --ini", 20*time.Second)
		if err == nil {
			for _, line := range strings.Split(out, "\n") {
				if idx := strings.Index(line, "Scan for additional .ini files in:"); idx >= 0 {
					return strings.TrimSpace(line[idx+len("Scan for additional .ini files in:"):])
				}
			}
		}
		return "/usr/local/etc/php/conf.d"
	}
	out, err := runCmd(20*time.Second, "php", "--ini")
	if err == nil {
		for _, line := range strings.Split(out, "\n") {
			if idx := strings.Index(line, "Scan for additional .ini files in:"); idx >= 0 {
				return strings.TrimSpace(line[idx+len("Scan for additional .ini files in:"):])
			}
		}
	}
	return ""
}

func resolvesHost(container, host string) bool {
	script := fmt.Sprintf(`(getent hosts %s 2>/dev/null || grep -q %s /etc/hosts) && echo ok`, host, host)
	out, err := runInContainer(container, script, 10*time.Second)
	return err == nil && strings.Contains(out, "ok")
}

func containerGateway(container string) string {
	out, err := runInContainer(container, "cat /proc/net/route", 10*time.Second)
	if err != nil {
		return ""
	}
	for _, line := range strings.Split(out, "\n")[1:] {
		fields := strings.Fields(line)
		if len(fields) < 3 || fields[1] != "00000000" {
			continue
		}
		v, err := strconv.ParseUint(fields[2], 16, 32)
		if err != nil {
			continue
		}
		return fmt.Sprintf("%d.%d.%d.%d", byte(v), byte(v>>8), byte(v>>16), byte(v>>24))
	}
	return ""
}

func clientHostFor(container string) (host string, reachable bool) {
	if container == "" {
		return "127.0.0.1", true
	}
	if resolvesHost(container, "host.docker.internal") {
		return "host.docker.internal", true
	}
	if gw := containerGateway(container); gw != "" {
		return gw, true
	}
	return "host.docker.internal", false
}

func readContainerRuntime(container, image string) Runtime {
	rt := Runtime{Kind: "docker", Container: container, Image: image}
	out, err := runInContainer(container, phpInfoScript(), 25*time.Second)
	if err != nil {
		return rt
	}
	info := parsePHPInfo(out)
	if info == nil {
		return rt
	}
	rt.PHPVersion = stringField(info, "version")
	rt.XdebugInstalled = boolField(info, "xdebug_loaded")
	rt.XdebugVersion = stringField(info, "xdebug_version")
	rt.Mode = stringField(info, "mode")
	rt.ClientHost = stringField(info, "client_host")
	rt.ClientPort = stringField(info, "client_port")
	rt.IdeKey = stringField(info, "idekey")
	rt.StartWithRequest = stringField(info, "start_with_request")
	rt.IniFile = scanDirFor(container) + "/" + iniFileName
	rt.Configured = rt.XdebugInstalled && strings.Contains(strings.ToLower(rt.Mode), "debug")
	if rt.ClientHost != "" {
		rt.Reachable = resolvesHost(container, rt.ClientHost)
	}
	return rt
}

func readHostRuntime() (Runtime, bool) {
	if _, err := exec.LookPath("php"); err != nil {
		return Runtime{}, false
	}
	out, err := runCmd(25*time.Second, "php", "-d", "xdebug.start_with_request=no", "-r", `echo json_encode([
		"version" => PHP_VERSION,
		"xdebug_loaded" => extension_loaded("xdebug"),
		"xdebug_version" => extension_loaded("xdebug") ? phpversion("xdebug") : "",
		"mode" => (string) ini_get("xdebug.mode"),
		"client_host" => (string) ini_get("xdebug.client_host"),
		"client_port" => (string) ini_get("xdebug.client_port"),
		"idekey" => (string) ini_get("xdebug.idekey"),
		"start_with_request" => (string) ini_get("xdebug.start_with_request")
	]);`)
	if err != nil {
		return Runtime{}, false
	}
	info := parsePHPInfo(out)
	if info == nil {
		return Runtime{}, false
	}
	rt := Runtime{
		Kind:             "host",
		PHPVersion:       stringField(info, "version"),
		XdebugInstalled:  boolField(info, "xdebug_loaded"),
		XdebugVersion:    stringField(info, "xdebug_version"),
		Mode:             stringField(info, "mode"),
		ClientHost:       stringField(info, "client_host"),
		ClientPort:       stringField(info, "client_port"),
		IdeKey:           stringField(info, "idekey"),
		StartWithRequest: stringField(info, "start_with_request"),
		IniFile:          filepath.Join(scanDirFor(""), iniFileName),
		Reachable:        true,
	}
	rt.Configured = rt.XdebugInstalled && strings.Contains(strings.ToLower(rt.Mode), "debug")
	return rt, true
}

func stringField(m map[string]interface{}, key string) string {
	if v, ok := m[key].(string); ok {
		return v
	}
	return ""
}

func boolField(m map[string]interface{}, key string) bool {
	if v, ok := m[key].(bool); ok {
		return v
	}
	return false
}

// Detect inspects the PHP runtimes that can serve the project without
// changing anything.
func Detect(projectName, projectRoot, port, ideKey string) Report {
	opts := normalizeOptions(port, ideKey)
	root, resolved := ResolveProjectRoot(projectName, projectRoot)
	rep := Report{
		ProjectRoot: root,
		Resolved:    resolved,
		Listener:    "0.0.0.0:" + opts.Port,
	}

	for _, container := range listDockerCandidates(root, projectName) {
		if _, ok := phpAvailable(container); !ok {
			continue
		}
		rep.Runtimes = append(rep.Runtimes, readContainerRuntime(container, containerImage(container)))
	}
	if rt, ok := readHostRuntime(); ok {
		rep.Runtimes = append(rep.Runtimes, rt)
	}

	for _, rt := range rep.Runtimes {
		if rt.Configured {
			rep.Success = true
			break
		}
	}
	if len(rep.Runtimes) == 0 {
		rep.Message = "No PHP runtime found. Start the project (or its Docker container) and try again."
	} else if !rep.Success {
		rep.Message = "PHP was found but Xdebug is not enabled yet."
	} else {
		rep.Message = "Xdebug is enabled and ready to accept DBGp connections."
	}
	return rep
}

// Configure installs and enables Xdebug in every detected PHP runtime and
// reloads the web server so the new configuration takes effect.
func Configure(projectName, projectRoot, port, ideKey string) Report {
	configureMutex.Lock()
	defer configureMutex.Unlock()

	opts := normalizeOptions(port, ideKey)
	root, resolved := ResolveProjectRoot(projectName, projectRoot)
	rep := Report{
		ProjectRoot: root,
		Resolved:    resolved,
		Listener:    "0.0.0.0:" + opts.Port,
	}

	containers := listDockerCandidates(root, projectName)
	if len(containers) == 0 {
		rep.Steps = append(rep.Steps, Step{Name: "Find project PHP container", OK: false, Output: "No matching running container found"})
	} else {
		rep.Steps = append(rep.Steps, Step{Name: "Find project PHP container", OK: true, Output: strings.Join(containers, ", ")})
	}

	for _, container := range containers {
		version, ok := phpAvailable(container)
		if !ok {
			continue
		}
		image := containerImage(container)
		rt := Runtime{Kind: "docker", Container: container, Image: image, PHPVersion: version}

		rep.Steps = append(rep.Steps, Step{Name: "Detect PHP in " + container, OK: true, Output: "PHP " + version + " · " + image})

		// 1. Ensure the extension is installed.
		installed := containerHasXdebug(container)
		if !installed {
			start := time.Now()
			out, err := runInContainer(container, `yes '' | pecl install xdebug 2>&1`, 8*time.Minute)
			step := Step{Name: "Install Xdebug in " + container, OK: err == nil, Output: tail(out, 1200), DurationMS: time.Since(start).Milliseconds()}
			rep.Steps = append(rep.Steps, step)
			installed = containerHasXdebug(container)
		} else {
			rep.Steps = append(rep.Steps, Step{Name: "Install Xdebug in " + container, OK: true, Output: "Already installed"})
		}

		if !installed {
			rep.Runtimes = append(rep.Runtimes, rt)
			continue
		}

		// 2. Pick a host address the container can reach the daemon on.
		clientHost, reachable := clientHostFor(container)
		hostStep := Step{Name: "Resolve debugger host for " + container, OK: reachable, Output: clientHost}
		rep.Steps = append(rep.Steps, hostStep)

		// 3. Write the drop-in ini file.
		iniPath := filepath.Join(scanDirFor(container), iniFileName)
		content := buildINI(clientHost, opts)
		start := time.Now()
		out, err := writeFileInContainer(container, iniPath, content)
		rep.Steps = append(rep.Steps, Step{
			Name:       "Write " + iniPath,
			OK:         err == nil,
			Output:     tail(out, 500),
			DurationMS: time.Since(start).Milliseconds(),
		})

		// 4. Reload the web server.
		start = time.Now()
		out, err = reloadPHP(container)
		rep.Steps = append(rep.Steps, Step{
			Name:       "Reload PHP/Apache in " + container,
			OK:         err == nil,
			Output:     tail(out, 500),
			DurationMS: time.Since(start).Milliseconds(),
		})

		// 5. Verify from a fresh PHP process.
		rt = readContainerRuntime(container, image)
		if !rt.Reachable {
			rt.Reachable = reachable
		}
		rep.Steps = append(rep.Steps, Step{
			Name:   "Verify Xdebug in " + container,
			OK:     rt.Configured,
			Output: fmt.Sprintf("mode=%s client_host=%s client_port=%s idekey=%s", rt.Mode, rt.ClientHost, rt.ClientPort, rt.IdeKey),
		})
		rep.Runtimes = append(rep.Runtimes, rt)
	}

	// Host PHP (when present) is configured too.
	if rt, ok := readHostRuntime(); ok {
		if !rt.XdebugInstalled {
			rep.Steps = append(rep.Steps, Step{
				Name:   "Install Xdebug (host)",
				OK:     false,
				Output: "Host PHP has no Xdebug; install it with your package manager (e.g. brew install php-xdebug).",
			})
		} else if rt.IniFile != "" {
			content := buildINI("127.0.0.1", opts)
			err := os.WriteFile(rt.IniFile, []byte(content), 0o644)
			rep.Steps = append(rep.Steps, Step{Name: "Write " + rt.IniFile, OK: err == nil, Output: errText(err)})
			rt = refreshHostRuntime()
		}
		rep.Runtimes = append(rep.Runtimes, rt)
	}

	for _, rt := range rep.Runtimes {
		if rt.Configured {
			rep.Success = true
			break
		}
	}
	if rep.Success {
		rep.Message = "Xdebug is configured. Trigger any request to the project and the session will appear here."
	} else {
		rep.Message = "Automatic configuration could not enable Xdebug. Review the steps above."
	}
	return rep
}

func errText(err error) string {
	if err == nil {
		return ""
	}
	return err.Error()
}

func containerHasXdebug(container string) bool {
	out, err := runInContainer(container, `php -d xdebug.start_with_request=no -r 'echo extension_loaded("xdebug") ? "yes" : "no";'`, 20*time.Second)
	return err == nil && strings.Contains(out, "yes")
}

func buildINI(clientHost string, opts options) string {
	var b strings.Builder
	b.WriteString("; Managed automatically by PHP Debug Studio\n")
	b.WriteString("zend_extension=xdebug.so\n")
	b.WriteString("xdebug.mode=debug\n")
	b.WriteString("xdebug.start_with_request=yes\n")
	b.WriteString("xdebug.client_host=" + clientHost + "\n")
	b.WriteString("xdebug.client_port=" + opts.Port + "\n")
	b.WriteString("xdebug.idekey=" + opts.IdeKey + "\n")
	b.WriteString("xdebug.discover_client_host=0\n")
	b.WriteString("xdebug.log_level=0\n")
	b.WriteString("xdebug.max_nesting_level=512\n")
	return b.String()
}

func writeFileInContainer(container, path, content string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	cmd := exec.CommandContext(ctx, "docker", "exec", "-i", container, "sh", "-c", "cat > "+shellQuote(path))
	cmd.Stdin = strings.NewReader(content)
	var buf bytes.Buffer
	cmd.Stdout = &buf
	cmd.Stderr = &buf
	err := cmd.Run()
	return buf.String(), err
}

func shellQuote(s string) string {
	return "'" + strings.ReplaceAll(s, "'", `'\''`) + "'"
}

func reloadPHP(container string) (string, error) {
	script := `if command -v apache2ctl >/dev/null 2>&1; then apache2ctl -k graceful; ` +
		`elif command -v apachectl >/dev/null 2>&1; then apachectl -k graceful; ` +
		`elif command -v php-fpm >/dev/null 2>&1 || command -v php-fpm8.3 >/dev/null 2>&1; then kill -USR2 1; ` +
		`else echo "no supported web server found"; exit 1; fi`
	return runInContainer(container, script, 45*time.Second)
}

func refreshHostRuntime() Runtime {
	if rt, ok := readHostRuntime(); ok {
		return rt
	}
	return Runtime{Kind: "host"}
}
