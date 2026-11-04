package monitor

import (
	"crypto/tls"
	"fmt"
	"io"
	"net/http"
	"net/http/httptrace"
	"net/url"
	"regexp"
	"strings"
	"time"
)

type SSLInfo struct {
	Issuer         string    `json:"issuer"`
	Subject        string    `json:"subject"`
	ValidFrom      time.Time `json:"valid_from"`
	ValidUntil     time.Time `json:"valid_until"`
	DaysRemaining  int       `json:"days_remaining"`
	IsExpired      bool      `json:"is_expired"`
	ExpiresSoon    bool      `json:"expires_soon"` // < 14 days
}

type SecurityHeadersAnalysis struct {
	HSTS               bool   `json:"hsts"`
	XContentTypeOptions bool  `json:"x_content_type_options"`
	XFrameOptions      bool   `json:"x_frame_options"`
	CSP                bool   `json:"csp"`
	ReferrerPolicy     bool   `json:"referrer_policy"`
	ScoreGrade         string `json:"score_grade"` // A+, A, B, C, D, F
	MissingHeaders     []string `json:"missing_headers"`
}

type LiveProbeResult struct {
	URL              string                  `json:"url"`
	Host             string                  `json:"host"`
	StatusCode       int                     `json:"status_code"`
	StatusText       string                  `json:"status_text"`
	IsHealthy        bool                    `json:"is_healthy"`
	TotalDurationMs  int64                   `json:"total_duration_ms"`
	DNSLookupMs      int64                   `json:"dns_lookup_ms"`
	TCPConnectionMs  int64                   `json:"tcp_connection_ms"`
	TLSHandshakeMs   int64                   `json:"tls_handshake_ms"`
	TTFBMs           int64                   `json:"ttfb_ms"`
	SSL              *SSLInfo                `json:"ssl,omitempty"`
	SecurityHeaders  SecurityHeadersAnalysis `json:"security_headers"`
	RedactedHeaders  map[string]string       `json:"headers"`
	BodySampleRedacted string                `json:"body_sample"`
	ProbedAt         time.Time               `json:"probed_at"`
}

var sensitiveHeaderKeys = map[string]bool{
	"authorization":       true,
	"cookie":              true,
	"set-cookie":          true,
	"x-xsrf-token":        true,
	"x-csrf-token":        true,
	"x-api-key":           true,
	"proxy-authorization": true,
	"cf-ray":              true,
}

var tokenRegex = regexp.MustCompile(`(?i)(bearer\s+[a-zA-Z0-9_\-\.]{8,}|(sk|pk)_[live|test]_[a-zA-Z0-9]{12,}|password["']?\s*[:=]\s*["'][^"']+["'])`)

// ProbeLiveTarget performs safe, non-invasive synthetic probing with zero security leakage
func ProbeLiveTarget(rawURL string) (*LiveProbeResult, error) {
	if !strings.HasPrefix(rawURL, "http://") && !strings.HasPrefix(rawURL, "https://") {
		rawURL = "https://" + rawURL
	}

	parsedURL, err := url.Parse(rawURL)
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %v", err)
	}

	var dnsStart, dnsDone, connStart, connDone, tlsStart, tlsDone, firstByte time.Time

	trace := &httptrace.ClientTrace{
		DNSStart: func(_ httptrace.DNSStartInfo) { dnsStart = time.Now() },
		DNSDone:  func(_ httptrace.DNSDoneInfo) { dnsDone = time.Now() },
		ConnectStart: func(_, _ string) { connStart = time.Now() },
		ConnectDone: func(_, _ string, _ error) { connDone = time.Now() },
		TLSHandshakeStart: func() { tlsStart = time.Now() },
		TLSHandshakeDone: func(_ tls.ConnectionState, _ error) { tlsDone = time.Now() },
		GotFirstResponseByte: func() { firstByte = time.Now() },
	}

	transport := &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: false},
	}

	client := &http.Client{
		Transport: transport,
		Timeout:   6 * time.Second,
	}

	req, err := http.NewRequest("GET", rawURL, nil)
	if err != nil {
		return nil, err
	}
	req = req.WithContext(httptrace.WithClientTrace(req.Context(), trace))
	req.Header.Set("User-Agent", "Brixel-Live-Monitor/1.0 (+https://brixel.dev)")

	overallStart := time.Now()
	resp, err := client.Do(req)
	totalDuration := time.Since(overallStart).Milliseconds()

	if err != nil {
		return &LiveProbeResult{
			URL:             rawURL,
			Host:            parsedURL.Host,
			StatusCode:      0,
			StatusText:      "Connection Failed: " + err.Error(),
			IsHealthy:       false,
			TotalDurationMs: totalDuration,
			ProbedAt:        time.Now().UTC(),
		}, nil
	}
	defer resp.Body.Close()

	// Calculate timings
	dnsMs := int64(0)
	if !dnsStart.IsZero() && !dnsDone.IsZero() {
		dnsMs = dnsDone.Sub(dnsStart).Milliseconds()
	}
	tcpMs := int64(0)
	if !connStart.IsZero() && !connDone.IsZero() {
		tcpMs = connDone.Sub(connStart).Milliseconds()
	}
	tlsMs := int64(0)
	if !tlsStart.IsZero() && !tlsDone.IsZero() {
		tlsMs = tlsDone.Sub(tlsStart).Milliseconds()
	}
	ttfbMs := int64(0)
	if !firstByte.IsZero() {
		ttfbMs = firstByte.Sub(overallStart).Milliseconds()
	}

	// SSL Inspection
	var sslInfo *SSLInfo
	if resp.TLS != nil && len(resp.TLS.PeerCertificates) > 0 {
		cert := resp.TLS.PeerCertificates[0]
		now := time.Now()
		daysRemaining := int(cert.NotAfter.Sub(now).Hours() / 24)
		sslInfo = &SSLInfo{
			Issuer:        cert.Issuer.CommonName,
			Subject:       cert.Subject.CommonName,
			ValidFrom:     cert.NotBefore,
			ValidUntil:    cert.NotAfter,
			DaysRemaining: daysRemaining,
			IsExpired:     daysRemaining <= 0,
			ExpiresSoon:   daysRemaining <= 14,
		}
	}

	// Security Headers Analysis
	headers := resp.Header
	sec := SecurityHeadersAnalysis{
		HSTS:                headers.Get("Strict-Transport-Security") != "",
		XContentTypeOptions: strings.ToLower(headers.Get("X-Content-Type-Options")) == "nosniff",
		XFrameOptions:       headers.Get("X-Frame-Options") != "",
		CSP:                 headers.Get("Content-Security-Policy") != "",
		ReferrerPolicy:      headers.Get("Referrer-Policy") != "",
		MissingHeaders:      make([]string, 0),
	}

	score := 100
	if !sec.HSTS {
		sec.MissingHeaders = append(sec.MissingHeaders, "Strict-Transport-Security")
		score -= 25
	}
	if !sec.XContentTypeOptions {
		sec.MissingHeaders = append(sec.MissingHeaders, "X-Content-Type-Options")
		score -= 20
	}
	if !sec.XFrameOptions {
		sec.MissingHeaders = append(sec.MissingHeaders, "X-Frame-Options")
		score -= 20
	}
	if !sec.CSP {
		sec.MissingHeaders = append(sec.MissingHeaders, "Content-Security-Policy")
		score -= 25
	}
	if !sec.ReferrerPolicy {
		sec.MissingHeaders = append(sec.MissingHeaders, "Referrer-Policy")
		score -= 10
	}

	switch {
	case score >= 90:
		sec.ScoreGrade = "A+"
	case score >= 75:
		sec.ScoreGrade = "A"
	case score >= 60:
		sec.ScoreGrade = "B"
	case score >= 40:
		sec.ScoreGrade = "C"
	default:
		sec.ScoreGrade = "F"
	}

	// Strict Redaction of headers
	redactedHeaders := make(map[string]string)
	for k, v := range headers {
		lowerK := strings.ToLower(k)
		if sensitiveHeaderKeys[lowerK] {
			redactedHeaders[k] = "•••••••• [REDACTED_SECURITY_POLICY]"
		} else {
			redactedHeaders[k] = strings.Join(v, ", ")
		}
	}

	// Read small snippet of body and redact any sensitive credentials
	bodyBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
	sanitizedBody := string(bodyBytes)
	sanitizedBody = tokenRegex.ReplaceAllString(sanitizedBody, "•••••••• [REDACTED]")

	return &LiveProbeResult{
		URL:                rawURL,
		Host:               parsedURL.Host,
		StatusCode:         resp.StatusCode,
		StatusText:         resp.Status,
		IsHealthy:          resp.StatusCode < 400,
		TotalDurationMs:    totalDuration,
		DNSLookupMs:        dnsMs,
		TCPConnectionMs:    tcpMs,
		TLSHandshakeMs:     tlsMs,
		TTFBMs:             ttfbMs,
		SSL:                sslInfo,
		SecurityHeaders:    sec,
		RedactedHeaders:    redactedHeaders,
		BodySampleRedacted: sanitizedBody,
		ProbedAt:           time.Now().UTC(),
	}, nil
}
