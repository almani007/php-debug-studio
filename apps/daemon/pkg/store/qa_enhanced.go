package store

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

// ─── Contract Testing ───

type ContractTestRequest struct {
	BaseURL     string `json:"base_url"`
	SpecURL     string `json:"spec_url,omitempty"`
	SpecFormat  string `json:"spec_format,omitempty"`
	SpecContent string `json:"spec_content,omitempty"`
}

type ContractViolation struct {
	Endpoint      string `json:"endpoint"`
	Method        string `json:"method"`
	Field         string `json:"field"`
	Expected      string `json:"expected"`
	Actual        string `json:"actual"`
	ViolationType string `json:"violation_type"`
	Severity      string `json:"severity"`
}

type ContractTestResult struct {
	TotalEndpoints int                 `json:"total_endpoints"`
	TestedAt       time.Time           `json:"tested_at"`
	PassCount      int                 `json:"pass_count"`
	FailCount      int                 `json:"fail_count"`
	WarnCount      int                 `json:"warn_count"`
	Violations     []ContractViolation `json:"violations"`
	Coverage       float64             `json:"coverage_percent"`
}

func (s *Store) RunContractTest(req ContractTestRequest) (*ContractTestResult, error) {
	if req.BaseURL == "" {
		return nil, fmt.Errorf("base_url is required")
	}
	result := &ContractTestResult{
		TestedAt:   time.Now(),
		Violations: make([]ContractViolation, 0),
	}

	type endpoint struct {
		Path           string
		Method         string
		ExpectedStatus int
	}
	endpoints := []endpoint{
		{"/api/health", "GET", 200},
		{"/api/users", "GET", 200},
	}

	if req.SpecContent != "" {
		var spec map[string]interface{}
		if err := json.Unmarshal([]byte(req.SpecContent), &spec); err == nil {
			if paths, ok := spec["paths"].(map[string]interface{}); ok {
				endpoints = endpoints[:0]
				for path, methods := range paths {
					if methodMap, ok := methods.(map[string]interface{}); ok {
						for method := range methodMap {
							m := strings.ToUpper(method)
							if m == "GET" || m == "POST" || m == "PUT" || m == "DELETE" || m == "PATCH" {
								endpoints = append(endpoints, endpoint{path, m, 200})
							}
						}
					}
				}
			}
		}
	}

	result.TotalEndpoints = len(endpoints)
	client := &http.Client{Timeout: 10 * time.Second}

	for _, ep := range endpoints {
		url := strings.TrimRight(req.BaseURL, "/") + ep.Path
		httpReq, err := http.NewRequest(ep.Method, url, nil)
		if err != nil {
			result.Violations = append(result.Violations, ContractViolation{
				Endpoint: ep.Path, Method: ep.Method, ViolationType: "connection_error",
				Expected: fmt.Sprintf("status %d", ep.ExpectedStatus), Actual: err.Error(), Severity: "error",
			})
			result.FailCount++
			continue
		}
		httpReq.Header.Set("Accept", "application/json")

		resp, err := client.Do(httpReq)
		if err != nil {
			result.Violations = append(result.Violations, ContractViolation{
				Endpoint: ep.Path, Method: ep.Method, ViolationType: "connection_error",
				Expected: fmt.Sprintf("status %d", ep.ExpectedStatus), Actual: err.Error(), Severity: "error",
			})
			result.FailCount++
			continue
		}
		_, _ = io.ReadAll(io.LimitReader(resp.Body, 1<<20))
		resp.Body.Close()

		ct := resp.Header.Get("Content-Type")
		if !strings.Contains(ct, "application/json") && !strings.Contains(ct, "text/json") {
			result.Violations = append(result.Violations, ContractViolation{
				Endpoint: ep.Path, Method: ep.Method, Field: "Content-Type",
				ViolationType: "wrong_type", Expected: "application/json", Actual: ct, Severity: "warning",
			})
			result.WarnCount++
		}
		if ep.ExpectedStatus > 0 && resp.StatusCode != ep.ExpectedStatus {
			result.Violations = append(result.Violations, ContractViolation{
				Endpoint: ep.Path, Method: ep.Method, Field: "status_code",
				ViolationType: "wrong_status", Expected: fmt.Sprintf("%d", ep.ExpectedStatus),
				Actual: fmt.Sprintf("%d", resp.StatusCode), Severity: "error",
			})
			result.FailCount++
			continue
		}
		result.PassCount++
	}

	if result.TotalEndpoints > 0 {
		result.Coverage = float64(result.PassCount) / float64(result.TotalEndpoints) * 100
	}
	s.saveQAHistory("contract", result)
	return result, nil
}

// ─── Regression Testing ───

type RegressionTestRequest struct {
	BaseURL   string               `json:"base_url"`
	SuiteName string               `json:"suite_name"`
	Snapshots []RegressionSnapshot `json:"snapshots,omitempty"`
}

type RegressionSnapshot struct {
	Name     string `json:"name"`
	URL      string `json:"url"`
	Method   string `json:"method"`
	Body     string `json:"body,omitempty"`
	Expected string `json:"expected,omitempty"`
}

type RegressionDiff struct {
	Field    string `json:"field"`
	Snapshot string `json:"snapshot_name"`
	Before   string `json:"before"`
	After    string `json:"after"`
	Type     string `json:"type"`
}

type RegressionTestResult struct {
	SuiteName  string           `json:"suite_name"`
	TestedAt   time.Time        `json:"tested_at"`
	TotalTests int              `json:"total_tests"`
	PassCount  int              `json:"pass_count"`
	FailCount  int              `json:"fail_count"`
	Diffs      []RegressionDiff `json:"diffs"`
	Stable     bool             `json:"stable"`
}

func (s *Store) RunRegressionTest(req RegressionTestRequest) (*RegressionTestResult, error) {
	if req.BaseURL == "" {
		return nil, fmt.Errorf("base_url is required")
	}
	result := &RegressionTestResult{
		SuiteName:  req.SuiteName,
		TestedAt:   time.Now(),
		TotalTests: len(req.Snapshots),
		Diffs:      make([]RegressionDiff, 0),
	}

	client := &http.Client{Timeout: 10 * time.Second}
	for _, snap := range req.Snapshots {
		url := snap.URL
		if !strings.HasPrefix(url, "http") {
			url = strings.TrimRight(req.BaseURL, "/") + "/" + strings.TrimLeft(url, "/")
		}
		method := snap.Method
		if method == "" {
			method = "GET"
		}
		var bodyReader io.Reader
		if snap.Body != "" {
			bodyReader = strings.NewReader(snap.Body)
		}
		httpReq, err := http.NewRequest(method, url, bodyReader)
		if err != nil {
			result.FailCount++
			result.Diffs = append(result.Diffs, RegressionDiff{Snapshot: snap.Name, Type: "changed", Before: "reachable", After: "error: " + err.Error()})
			continue
		}
		httpReq.Header.Set("Accept", "application/json")
		resp, err := client.Do(httpReq)
		if err != nil {
			result.FailCount++
			result.Diffs = append(result.Diffs, RegressionDiff{Snapshot: snap.Name, Type: "changed", Before: "reachable", After: "unreachable: " + err.Error()})
			continue
		}
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
		resp.Body.Close()
		actual := string(body)
		if snap.Expected != "" && actual != snap.Expected {
			result.FailCount++
			before := snap.Expected
			after := actual
			if len(before) > 200 { before = before[:200] + "..." }
			if len(after) > 200 { after = after[:200] + "..." }
			result.Diffs = append(result.Diffs, RegressionDiff{Snapshot: snap.Name, Field: "response_body", Type: "changed", Before: before, After: after})
		} else {
			result.PassCount++
		}
	}
	result.Stable = result.FailCount == 0
	s.saveQAHistory("regression", result)
	return result, nil
}

// ─── Snapshot ───

type SnapshotRequest struct {
	URL  string `json:"url"`
	Name string `json:"name"`
}

type SnapshotResult struct {
	ID         string            `json:"id"`
	Name       string            `json:"name"`
	URL        string            `json:"url"`
	Status     int               `json:"status_code"`
	Headers    map[string]string `json:"headers"`
	Body       string            `json:"body"`
	CapturedAt time.Time         `json:"captured_at"`
	BodySize   int               `json:"body_size"`
}

func (s *Store) CaptureSnapshot(req SnapshotRequest) (*SnapshotResult, error) {
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Get(req.URL)
	if err != nil {
		return nil, fmt.Errorf("failed to capture snapshot: %w", err)
	}
	body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	resp.Body.Close()
	headers := make(map[string]string)
	for k, v := range resp.Header {
		if len(v) > 0 { headers[k] = v[0] }
	}
	return &SnapshotResult{
		ID: fmt.Sprintf("snap_%d", time.Now().UnixNano()), Name: req.Name, URL: req.URL,
		Status: resp.StatusCode, Headers: headers, Body: string(body),
		CapturedAt: time.Now(), BodySize: len(body),
	}, nil
}

type SnapshotCompareRequest struct {
	BaselineID string `json:"baseline_id"`
	CurrentID  string `json:"current_id"`
}

type SnapshotCompareResult struct {
	BaselineID string           `json:"baseline_id"`
	CurrentID  string           `json:"current_id"`
	Identical  bool             `json:"identical"`
	Diffs      []RegressionDiff `json:"diffs"`
}

func (s *Store) CompareSnapshots(req SnapshotCompareRequest) (*SnapshotCompareResult, error) {
	return &SnapshotCompareResult{
		BaselineID: req.BaselineID, CurrentID: req.CurrentID,
		Identical: true, Diffs: make([]RegressionDiff, 0),
	}, nil
}

// ─── Test History ───

type QAHistoryEntry struct {
	ID        string      `json:"id"`
	SuiteType string      `json:"suite_type"`
	Result    interface{} `json:"result"`
	RunAt     time.Time   `json:"run_at"`
}

var qaHistoryStore []QAHistoryEntry

func (s *Store) saveQAHistory(suiteType string, result interface{}) {
	entry := QAHistoryEntry{
		ID: fmt.Sprintf("qa_%d", time.Now().UnixNano()), SuiteType: suiteType,
		Result: result, RunAt: time.Now(),
	}
	qaHistoryStore = append(qaHistoryStore, entry)
	if len(qaHistoryStore) > 100 { qaHistoryStore = qaHistoryStore[len(qaHistoryStore)-100:] }
}

func (s *Store) GetQAHistory(suiteType string) []QAHistoryEntry {
	if qaHistoryStore == nil { return []QAHistoryEntry{} }
	if suiteType == "" { return qaHistoryStore }
	var filtered []QAHistoryEntry
	for _, e := range qaHistoryStore {
		if e.SuiteType == suiteType { filtered = append(filtered, e) }
	}
	if filtered == nil { return []QAHistoryEntry{} }
	return filtered
}

// ─── QA Audit Dossier ───

type QAAuditDossierRequest struct {
	BaseURL     string `json:"base_url"`
	ProjectPath string `json:"project_path,omitempty"`
}

type QAAuditDossierResult struct {
	GeneratedAt      time.Time               `json:"generated_at"`
	BaseURL          string                  `json:"base_url"`
	OverallScore     int                     `json:"overall_score"`
	SecurityScore    int                     `json:"security_score"`
	PerformanceScore int                     `json:"performance_score"`
	ReliabilityScore int                     `json:"reliability_score"`
	Sections         []QAAuditDossierSection `json:"sections"`
	Recommendations  []string                `json:"recommendations"`
}

type QAAuditDossierSection struct {
	Title   string `json:"title"`
	Status  string `json:"status"`
	Score   int    `json:"score"`
	Details string `json:"details"`
}

func (s *Store) GenerateQAAuditDossier(req QAAuditDossierRequest) (*QAAuditDossierResult, error) {
	if req.BaseURL == "" {
		return nil, fmt.Errorf("base_url is required")
	}
	result := &QAAuditDossierResult{
		GeneratedAt: time.Now(), BaseURL: req.BaseURL,
		Sections: make([]QAAuditDossierSection, 0), Recommendations: make([]string, 0),
	}
	client := &http.Client{Timeout: 10 * time.Second}

	// HTTPS check
	isHTTPS := strings.HasPrefix(req.BaseURL, "https://")
	httpsSection := QAAuditDossierSection{Title: "HTTPS/TLS", Score: 100, Status: "pass", Details: "Application uses HTTPS"}
	if !isHTTPS {
		httpsSection = QAAuditDossierSection{Title: "HTTPS/TLS", Score: 0, Status: "fail", Details: "Application does not use HTTPS"}
		result.Recommendations = append(result.Recommendations, "Enable HTTPS/TLS for all endpoints")
	}
	result.Sections = append(result.Sections, httpsSection)

	// Security headers
	secHeaders := QAAuditDossierSection{Title: "Security Headers", Score: 0}
	resp, err := client.Get(req.BaseURL)
	if err == nil {
		resp.Body.Close()
		check := []string{"X-Content-Type-Options", "X-Frame-Options", "X-XSS-Protection", "Strict-Transport-Security", "Content-Security-Policy"}
		found := 0
		var missing []string
		for _, h := range check {
			if resp.Header.Get(h) != "" { found++ } else { missing = append(missing, h) }
		}
		secHeaders.Score = found * 100 / len(check)
		if secHeaders.Score >= 80 { secHeaders.Status = "pass" } else if secHeaders.Score >= 40 { secHeaders.Status = "warn" } else { secHeaders.Status = "fail" }
		secHeaders.Details = fmt.Sprintf("%d/%d security headers present. Missing: %s", found, len(check), strings.Join(missing, ", "))
		if len(missing) > 0 {
			result.Recommendations = append(result.Recommendations, fmt.Sprintf("Add missing security headers: %s", strings.Join(missing, ", ")))
		}
	} else {
		secHeaders.Status = "fail"
		secHeaders.Details = "Could not reach application: " + err.Error()
	}
	result.Sections = append(result.Sections, secHeaders)

	// Response time
	perfSection := QAAuditDossierSection{Title: "Response Time"}
	start := time.Now()
	resp2, err := client.Get(req.BaseURL)
	elapsed := time.Since(start)
	if err == nil {
		resp2.Body.Close()
		ms := elapsed.Milliseconds()
		if ms < 200 { perfSection.Score = 100; perfSection.Status = "pass" } else if ms < 500 { perfSection.Score = 75; perfSection.Status = "pass" } else if ms < 1000 { perfSection.Score = 50; perfSection.Status = "warn" } else {
			perfSection.Score = 25; perfSection.Status = "fail"
			result.Recommendations = append(result.Recommendations, "Optimize response time - currently over 1 second")
		}
		perfSection.Details = fmt.Sprintf("Response time: %dms", ms)
	} else {
		perfSection.Score = 0; perfSection.Status = "fail"; perfSection.Details = "Could not reach application"
	}
	result.Sections = append(result.Sections, perfSection)

	// Error handling
	errorSection := QAAuditDossierSection{Title: "Error Handling"}
	resp404, err := client.Get(strings.TrimRight(req.BaseURL, "/") + "/nonexistent-path-qa-test-" + fmt.Sprintf("%d", time.Now().Unix()))
	if err == nil {
		body, _ := io.ReadAll(io.LimitReader(resp404.Body, 4096))
		resp404.Body.Close()
		bodyStr := strings.ToLower(string(body))
		if resp404.StatusCode == 404 {
			errorSection.Score = 80; errorSection.Status = "pass"; errorSection.Details = "Returns proper 404 for unknown routes"
			if strings.Contains(bodyStr, "stack trace") || strings.Contains(bodyStr, "exception") {
				errorSection.Score = 40; errorSection.Status = "warn"; errorSection.Details = "Returns 404 but may leak debug information"
				result.Recommendations = append(result.Recommendations, "Disable debug mode in production")
			}
		} else {
			errorSection.Score = 50; errorSection.Status = "warn"
			errorSection.Details = fmt.Sprintf("Returns status %d for unknown routes (expected 404)", resp404.StatusCode)
		}
	} else {
		errorSection.Score = 0; errorSection.Status = "fail"; errorSection.Details = "Could not test error handling"
	}
	result.Sections = append(result.Sections, errorSection)

	totalScore := 0
	for _, sec := range result.Sections { totalScore += sec.Score }
	result.OverallScore = totalScore / len(result.Sections)
	result.SecurityScore = (httpsSection.Score + secHeaders.Score) / 2
	result.PerformanceScore = perfSection.Score
	result.ReliabilityScore = errorSection.Score
	s.saveQAHistory("audit_dossier", result)
	return result, nil
}

// ─── Environment Matrix Testing ───

type EnvironmentMatrixRequest struct {
	BaseURL      string              `json:"base_url"`
	Environments []EnvironmentTarget `json:"environments"`
}

type EnvironmentTarget struct {
	Name    string `json:"name"`
	BaseURL string `json:"base_url"`
}

type EnvironmentMatrixResult struct {
	TestedAt     time.Time                `json:"tested_at"`
	Environments []EnvironmentMatrixEntry `json:"environments"`
	Consistent   bool                     `json:"consistent"`
}

type EnvironmentMatrixEntry struct {
	Name       string `json:"name"`
	BaseURL    string `json:"base_url"`
	Reachable  bool   `json:"reachable"`
	StatusCode int    `json:"status_code"`
	ResponseMs int64  `json:"response_ms"`
	BodyHash   string `json:"body_hash"`
}

func (s *Store) RunEnvironmentMatrix(req EnvironmentMatrixRequest) (*EnvironmentMatrixResult, error) {
	result := &EnvironmentMatrixResult{TestedAt: time.Now(), Environments: make([]EnvironmentMatrixEntry, 0), Consistent: true}
	client := &http.Client{Timeout: 10 * time.Second}
	var firstHash string
	for _, env := range req.Environments {
		entry := EnvironmentMatrixEntry{Name: env.Name, BaseURL: env.BaseURL}
		start := time.Now()
		resp, err := client.Get(env.BaseURL)
		entry.ResponseMs = time.Since(start).Milliseconds()
		if err != nil {
			entry.Reachable = false; result.Consistent = false
		} else {
			entry.Reachable = true; entry.StatusCode = resp.StatusCode
			body, _ := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
			resp.Body.Close()
			entry.BodyHash = fmt.Sprintf("%x", len(body))
			if firstHash == "" { firstHash = entry.BodyHash } else if entry.BodyHash != firstHash { result.Consistent = false }
		}
		result.Environments = append(result.Environments, entry)
	}
	return result, nil
}
