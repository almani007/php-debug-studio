package mock

import (
	"encoding/json"
	"net/http"
	"strings"
	"sync"
	"time"
)

type MockRule struct {
	ID             string            `json:"id"`
	ProjectID      string            `json:"project_id"`
	Method         string            `json:"method"`
	PathPattern    string            `json:"path_pattern"`
	MatchHeaders   map[string]string `json:"match_headers,omitempty"`
	ResponseStatus int               `json:"response_status"`
	ResponseHeaders map[string]string `json:"response_headers,omitempty"`
	ResponseBody   string            `json:"response_body"`
	DelayMs        int               `json:"delay_ms"`
	Enabled        bool              `json:"enabled"`
}

type MockServer struct {
	rules []*MockRule
	mutex sync.RWMutex
}

func NewMockServer() *MockServer {
	return &MockServer{
		rules: make([]*MockRule, 0),
	}
}

func (m *MockServer) AddRule(rule *MockRule) {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	m.rules = append(m.rules, rule)
}

func (m *MockServer) GetRules(projectID string) []*MockRule {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	var matched []*MockRule
	for _, r := range m.rules {
		if projectID == "" || r.ProjectID == projectID {
			matched = append(matched, r)
		}
	}
	return matched
}

func (m *MockServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	m.mutex.RLock()
	defer m.mutex.RUnlock()

	reqPath := r.URL.Path
	reqMethod := strings.ToUpper(r.Method)

	for _, rule := range m.rules {
		if !rule.Enabled {
			continue
		}

		if rule.Method != "" && strings.ToUpper(rule.Method) != reqMethod {
			continue
		}

		if rule.PathPattern != "" && !matchPath(rule.PathPattern, reqPath) {
			continue
		}

		// Apply simulated delay if configured
		if rule.DelayMs > 0 {
			time.Sleep(time.Duration(rule.DelayMs) * time.Millisecond)
		}

		// Set response headers
		w.Header().Set("Content-Type", "application/json")
		w.Header().Set("X-Debug-Studio-Mock", "true")
		for k, v := range rule.ResponseHeaders {
			w.Header().Set(k, v)
		}

		status := rule.ResponseStatus
		if status == 0 {
			status = http.StatusOK
		}
		w.WriteHeader(status)
		_, _ = w.Write([]byte(rule.ResponseBody))
		return
	}

	// Default fallback if no mock matches
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusNotFound)
	_ = json.NewEncoder(w).Encode(map[string]interface{}{
		"error":   "NO_MOCK_MATCH",
		"message": "No mock rule matched the request path and method",
		"path":    reqPath,
		"method":  reqMethod,
	})
}

func matchPath(pattern, path string) bool {
	if pattern == path || pattern == "*" {
		return true
	}
	if strings.HasSuffix(pattern, "/*") {
		prefix := strings.TrimSuffix(pattern, "/*")
		return strings.HasPrefix(path, prefix)
	}
	return false
}
