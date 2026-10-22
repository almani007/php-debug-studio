package executor

import (
	"bytes"
	"crypto/tls"
	"io"
	"net/http"
	"net/http/httptrace"
	"strings"
	"time"

	"github.com/google/uuid"
)

type ExecutionRequest struct {
	ProjectID string            `json:"project_id"`
	Method    string            `json:"method"`
	URL       string            `json:"url"`
	Headers   map[string]string `json:"headers"`
	Body      string            `json:"body"`
	TimeoutMs int               `json:"timeout_ms"`
}

type Timings struct {
	DNSLookupMs    int64 `json:"dns_lookup_ms"`
	TCPConnectionMs int64 `json:"tcp_connection_ms"`
	TLSHandshakeMs  int64 `json:"tls_handshake_ms"`
	TTFBMs          int64 `json:"ttfb_ms"`
	TotalDurationMs int64 `json:"total_duration_ms"`
}

type ExecutionResponse struct {
	RunID           string            `json:"run_id"`
	StatusCode      int               `json:"status_code"`
	Headers         map[string]string `json:"headers"`
	Body            string            `json:"body"`
	DurationMs      int64             `json:"duration_ms"`
	TraceID         string            `json:"trace_id"`
	Timings         Timings           `json:"timings"`
	ContentLength   int64             `json:"content_length"`
	SetCookies      []string          `json:"set_cookies,omitempty"`
	Error           string            `json:"error,omitempty"`
}

type Engine struct {
	client *http.Client
}

func NewEngine() *Engine {
	transport := &http.Transport{
		TLSClientConfig: &tls.Config{
			InsecureSkipVerify: false,
		},
		DisableKeepAlives: false,
		MaxIdleConns:      100,
	}

	return &Engine{
		client: &http.Client{
			Transport: transport,
			Timeout:   30 * time.Second,
		},
	}
}

func (e *Engine) Execute(req ExecutionRequest) *ExecutionResponse {
	runID := uuid.New().String()
	traceID := strings.ReplaceAll(uuid.New().String(), "-", "")

	timeout := 30 * time.Second
	if req.TimeoutMs > 0 {
		timeout = time.Duration(req.TimeoutMs) * time.Millisecond
	}

	var bodyReader io.Reader
	if req.Body != "" {
		bodyReader = bytes.NewBufferString(req.Body)
	}

	httpReq, err := http.NewRequest(strings.ToUpper(req.Method), req.URL, bodyReader)
	if err != nil {
		return &ExecutionResponse{
			RunID:      runID,
			StatusCode: 0,
			Error:      err.Error(),
		}
	}

	for k, v := range req.Headers {
		httpReq.Header.Set(k, v)
	}

	// Propagate W3C traceparent (format: 00-{trace_id}-{span_id}-01)
	spanID := strings.ReplaceAll(uuid.New().String(), "-", "")[:16]
	traceParent := "00-" + traceID + "-" + spanID + "-01"
	httpReq.Header.Set("traceparent", traceParent)
	httpReq.Header.Set("User-Agent", "PHP-Debug-Studio/1.0")

	var dnsStart, connStart, tlsStart, ttfbStart time.Time
	var timings Timings

	trace := &httptrace.ClientTrace{
		DNSStart: func(_ httptrace.DNSStartInfo) { dnsStart = time.Now() },
		DNSDone: func(_ httptrace.DNSDoneInfo) {
			if !dnsStart.IsZero() {
				timings.DNSLookupMs = time.Since(dnsStart).Milliseconds()
			}
		},
		ConnectStart: func(_, _ string) { connStart = time.Now() },
		ConnectDone: func(_, _ string, _ error) {
			if !connStart.IsZero() {
				timings.TCPConnectionMs = time.Since(connStart).Milliseconds()
			}
		},
		TLSHandshakeStart: func() { tlsStart = time.Now() },
		TLSHandshakeDone: func(_ tls.ConnectionState, _ error) {
			if !tlsStart.IsZero() {
				timings.TLSHandshakeMs = time.Since(tlsStart).Milliseconds()
			}
		},
		GotFirstResponseByte: func() {
			if !ttfbStart.IsZero() {
				timings.TTFBMs = time.Since(ttfbStart).Milliseconds()
			}
		},
	}

	httpReq = httpReq.WithContext(httptrace.WithClientTrace(httpReq.Context(), trace))

	client := *e.client
	client.Timeout = timeout

	start := time.Now()
	ttfbStart = start

	resp, err := client.Do(httpReq)
	duration := time.Since(start).Milliseconds()
	timings.TotalDurationMs = duration

	if err != nil {
		return &ExecutionResponse{
			RunID:      runID,
			StatusCode: 0,
			DurationMs: duration,
			TraceID:    traceID,
			Timings:    timings,
			Error:      err.Error(),
		}
	}
	defer resp.Body.Close()

	// Bound response body read (max 5MB preview in memory)
	bodyBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 5*1024*1024))

	respHeaders := make(map[string]string)
	for k, v := range resp.Header {
		respHeaders[k] = strings.Join(v, ", ")
	}

	var setCookies []string
	if sc, ok := resp.Header["Set-Cookie"]; ok {
		setCookies = sc
	}

	return &ExecutionResponse{
		RunID:         runID,
		StatusCode:    resp.StatusCode,
		Headers:       respHeaders,
		SetCookies:    setCookies,
		Body:          string(bodyBytes),
		DurationMs:    duration,
		TraceID:       traceID,
		Timings:       timings,
		ContentLength: resp.ContentLength,
	}
}
