package executor

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"
)

type GraphQLRequest struct {
	URL           string                 `json:"url"`
	Query         string                 `json:"query"`
	Variables     map[string]interface{} `json:"variables,omitempty"`
	OperationName string                 `json:"operation_name,omitempty"`
	Headers       map[string]string      `json:"headers,omitempty"`
}

type GraphQLResponse struct {
	Data       interface{} `json:"data"`
	Errors     interface{} `json:"errors,omitempty"`
	StatusCode int         `json:"status_code"`
	DurationMs int64       `json:"duration_ms"`
	TraceID    string      `json:"trace_id"`
}

type GraphQLEngine struct {
	client *http.Client
}

func NewGraphQLEngine() *GraphQLEngine {
	return &GraphQLEngine{
		client: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

func (g *GraphQLEngine) Execute(req GraphQLRequest) (*GraphQLResponse, error) {
	traceID := strings.ReplaceAll(uuid.New().String(), "-", "")
	payload := map[string]interface{}{
		"query": req.Query,
	}
	if len(req.Variables) > 0 {
		payload["variables"] = req.Variables
	}
	if req.OperationName != "" {
		payload["operationName"] = req.OperationName
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	httpReq, err := http.NewRequest(http.MethodPost, req.URL, bytes.NewBuffer(bodyBytes))
	if err != nil {
		return nil, err
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Accept", "application/json")
	spanID := strings.ReplaceAll(uuid.New().String(), "-", "")[:16]
	httpReq.Header.Set("traceparent", "00-"+traceID+"-"+spanID+"-01")

	for k, v := range req.Headers {
		httpReq.Header.Set(k, v)
	}

	start := time.Now()
	resp, err := g.client.Do(httpReq)
	duration := time.Since(start).Milliseconds()

	if err != nil {
		return &GraphQLResponse{
			StatusCode: 0,
			DurationMs: duration,
			TraceID:    traceID,
			Errors:     err.Error(),
		}, nil
	}
	defer resp.Body.Close()

	respBytes, _ := io.ReadAll(io.LimitReader(resp.Body, 5*1024*1024))
	var result map[string]interface{}
	_ = json.Unmarshal(respBytes, &result)

	return &GraphQLResponse{
		Data:       result["data"],
		Errors:     result["errors"],
		StatusCode: resp.StatusCode,
		DurationMs: duration,
		TraceID:    traceID,
	}, nil
}
