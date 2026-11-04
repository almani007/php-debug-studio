package qa

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"
)

type SmokeTestResult struct {
	URI        string `json:"uri"`
	Method     string `json:"method"`
	StatusCode int    `json:"status_code"`
	Passed     bool   `json:"passed"`
	DurationMs int64  `json:"duration_ms"`
	Notes      string `json:"notes"`
}

type SmokeSummary struct {
	TotalRoutes int               `json:"total_routes"`
	Passed      int               `json:"passed"`
	Failed      int               `json:"failed"`
	AvgDuration int64             `json:"avg_duration_ms"`
	Results     []SmokeTestResult `json:"results"`
}

// RunSmokeCrawler executes non-destructive GET checks across discovered endpoints
func RunSmokeCrawler(baseURL string, endpoints []string) *SmokeSummary {
	if !strings.HasPrefix(baseURL, "http://") && !strings.HasPrefix(baseURL, "https://") {
		baseURL = "http://" + baseURL
	}
	baseURL = strings.TrimRight(baseURL, "/")

	summary := &SmokeSummary{
		TotalRoutes: len(endpoints),
		Results:     make([]SmokeTestResult, 0),
	}

	client := &http.Client{
		Timeout: 4 * time.Second,
		CheckRedirect: func(req *http.Request, via []*http.Request) error {
			if len(via) >= 3 {
				return http.ErrUseLastResponse
			}
			return nil
		},
	}

	var totalDuration int64

	for _, ep := range endpoints {
		path := "/" + strings.TrimLeft(ep, "/")
		target := baseURL + path

		start := time.Now()
		resp, err := client.Get(target)
		dur := time.Since(start).Milliseconds()
		totalDuration += dur

		res := SmokeTestResult{
			URI:        path,
			Method:     "GET",
			DurationMs: dur,
		}

		if err != nil {
			res.StatusCode = 0
			res.Passed = false
			res.Notes = "Connection error: " + err.Error()
			summary.Failed++
		} else {
			res.StatusCode = resp.StatusCode
			_ = resp.Body.Close()
			// QA Rule: 2xx, 3xx, and 401/403/422 (protected route) are acceptable; 5xx is a failure
			if resp.StatusCode >= 500 {
				res.Passed = false
				res.Notes = fmt.Sprintf("HTTP 500 Server Error: Internal failure at %s", path)
				summary.Failed++
			} else {
				res.Passed = true
				if resp.StatusCode >= 400 {
					res.Notes = fmt.Sprintf("HTTP %d (Handled Client Response)", resp.StatusCode)
				} else {
					res.Notes = "HTTP OK"
				}
				summary.Passed++
			}
		}

		summary.Results = append(summary.Results, res)
	}

	if len(endpoints) > 0 {
		summary.AvgDuration = totalDuration / int64(len(endpoints))
	}

	return summary
}

type FuzzTestCase struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Payload     string `json:"payload"`
	StatusCode  int    `json:"status_code"`
	Passed      bool   `json:"passed"`
	Verdict     string `json:"verdict"`
	DurationMs  int64  `json:"duration_ms"`
}

type FuzzReport struct {
	TargetURL  string         `json:"target_url"`
	Method     string         `json:"method"`
	Parameter  string         `json:"parameter"`
	TotalCases int            `json:"total_cases"`
	Passed     int            `json:"passed"`
	Failed     int            `json:"failed"`
	Cases      []FuzzTestCase `json:"cases"`
}

// RunFuzzTesting sends canonical QA boundary vectors to verify input handling and error resiliency
func RunFuzzTesting(targetURL, method, param string) *FuzzReport {
	if method == "" {
		method = "POST"
	}

	vectors := []struct {
		Name string
		Desc string
		Val  interface{}
	}{
		{"Null Value", "Passes null literal to check for NullPointerException / PHP Fatal", nil},
		{"Empty String", "Passes empty string to verify required validation", ""},
		{"Type Mismatch Array", "Passes array where scalar is expected", []string{"unexpected", "nested"}},
		{"Max Int Overflow", "Passes 64-bit integer boundary value", 9223372036854775807},
		{"Negative Int", "Passes negative boundary value", -999999},
		{"Unicode & Special Chars", "Passes multibyte RTL, Emoji and escape characters", "🔥 '\" \x00 <script>alert(1)</script> 测试"},
		{"Large Buffer (10KB)", "Passes 10,000 characters to check buffer / size limits", strings.Repeat("A", 10000)},
		{"SQL Injection Probe", "Passes standard SQLi boundary pattern", "' OR '1'='1' -- "},
	}

	report := &FuzzReport{
		TargetURL:  targetURL,
		Method:     method,
		Parameter:  param,
		TotalCases: len(vectors),
		Cases:      make([]FuzzTestCase, 0),
	}

	client := &http.Client{Timeout: 4 * time.Second}

	for _, v := range vectors {
		bodyMap := map[string]interface{}{
			param: v.Val,
		}
		jsonBytes, _ := json.Marshal(bodyMap)

		start := time.Now()
		req, _ := http.NewRequest(method, targetURL, bytes.NewBuffer(jsonBytes))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("User-Agent", "Brixel-QA-Fuzzer/1.0")

		tc := FuzzTestCase{
			Name:        v.Name,
			Description: v.Desc,
			Payload:     string(jsonBytes),
		}

		resp, err := client.Do(req)
		dur := time.Since(start).Milliseconds()
		tc.DurationMs = dur

		if err != nil {
			tc.StatusCode = 0
			tc.Passed = false
			tc.Verdict = "FAILED: Connection aborted or timeout"
			report.Failed++
		} else {
			tc.StatusCode = resp.StatusCode
			_ = resp.Body.Close()

			// QA Expectation: Server must NEVER return 500 when receiving invalid inputs
			if resp.StatusCode >= 500 {
				tc.Passed = false
				tc.Verdict = fmt.Sprintf("FAILED (CRITICAL): HTTP %d Server Crash / Uncaught Exception", resp.StatusCode)
				report.Failed++
			} else {
				tc.Passed = true
				tc.Verdict = fmt.Sprintf("PASSED: Gracefully handled with HTTP %d", resp.StatusCode)
				report.Passed++
			}
		}

		report.Cases = append(report.Cases, tc)
	}

	return report
}

type BenchmarkReport struct {
	TargetURL       string  `json:"target_url"`
	Concurrency     int     `json:"concurrency"`
	TotalRequests   int     `json:"total_requests"`
	Successful      int     `json:"successful"`
	Failed          int     `json:"failed"`
	TotalDurationMs int64   `json:"total_duration_ms"`
	RPS             float64 `json:"requests_per_second"`
	MinLatencyMs    int64   `json:"min_latency_ms"`
	MaxLatencyMs    int64   `json:"max_latency_ms"`
	MeanLatencyMs   int64   `json:"mean_latency_ms"`
	P50LatencyMs    int64   `json:"p50_latency_ms"`
	P90LatencyMs    int64   `json:"p90_latency_ms"`
	P95LatencyMs    int64   `json:"p95_latency_ms"`
	P99LatencyMs    int64   `json:"p99_latency_ms"`
	SLAMet          bool    `json:"sla_met"`
}

// RunBenchmark performs concurrency load SLA testing with latency percentiles
func RunBenchmark(targetURL, method string, concurrency, totalRequests int) *BenchmarkReport {
	if concurrency <= 0 {
		concurrency = 5
	}
	if concurrency > 50 {
		concurrency = 50
	}
	if totalRequests <= 0 {
		totalRequests = 20
	}
	if totalRequests > 200 {
		totalRequests = 200
	}
	if method == "" {
		method = "GET"
	}

	start := time.Now()
	var wg sync.WaitGroup
	reqChan := make(chan struct{}, totalRequests)
	for i := 0; i < totalRequests; i++ {
		reqChan <- struct{}{}
	}
	close(reqChan)

	var mu sync.Mutex
	latencies := make([]int64, 0, totalRequests)
	successful := 0
	failed := 0

	client := &http.Client{Timeout: 5 * time.Second}

	for worker := 0; worker < concurrency; worker++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for range reqChan {
				reqStart := time.Now()
				req, err := http.NewRequest(method, targetURL, nil)
				if err == nil {
					req.Header.Set("User-Agent", "Brixel-Benchmark-QA/1.0")
					resp, doErr := client.Do(req)
					lat := time.Since(reqStart).Milliseconds()
					mu.Lock()
					latencies = append(latencies, lat)
					if doErr == nil && resp.StatusCode < 500 {
						successful++
						_ = resp.Body.Close()
					} else {
						failed++
					}
					mu.Unlock()
				} else {
					mu.Lock()
					failed++
					mu.Unlock()
				}
			}
		}()
	}

	wg.Wait()
	totalDuration := time.Since(start).Milliseconds()

	var minLat, maxLat, sumLat int64
	if len(latencies) > 0 {
		sort.Slice(latencies, func(i, j int) bool { return latencies[i] < latencies[j] })
		minLat = latencies[0]
		maxLat = latencies[len(latencies)-1]
		for _, l := range latencies {
			sumLat += l
		}
	}

	calcPercentile := func(p float64) int64 {
		if len(latencies) == 0 {
			return 0
		}
		idx := int(float64(len(latencies)-1) * p)
		return latencies[idx]
	}

	rps := float64(0)
	if totalDuration > 0 {
		rps = float64(totalRequests) / (float64(totalDuration) / 1000.0)
	}

	meanLat := int64(0)
	if len(latencies) > 0 {
		meanLat = sumLat / int64(len(latencies))
	}

	p95 := calcPercentile(0.95)
	slaMet := p95 < 500 && failed == 0

	return &BenchmarkReport{
		TargetURL:       targetURL,
		Concurrency:     concurrency,
		TotalRequests:   totalRequests,
		Successful:      successful,
		Failed:          failed,
		TotalDurationMs: totalDuration,
		RPS:             rps,
		MinLatencyMs:    minLat,
		MaxLatencyMs:    maxLat,
		MeanLatencyMs:   meanLat,
		P50LatencyMs:    calcPercentile(0.50),
		P90LatencyMs:    calcPercentile(0.90),
		P95LatencyMs:    p95,
		P99LatencyMs:    calcPercentile(0.99),
		SLAMet:          slaMet,
	}
}
