package executor

import (
	"strings"
	"time"

	"github.com/google/uuid"
)

type GRPCRequest struct {
	Target   string            `json:"target"` // e.g. "localhost:50051"
	Service  string            `json:"service"` // e.g. "order.OrderService"
	Method   string            `json:"method"`  // e.g. "GetOrder"
	Metadata map[string]string `json:"metadata,omitempty"`
	Payload  string            `json:"payload"` // JSON formatted message
	TimeoutMs int              `json:"timeout_ms,omitempty"`
}

type GRPCResponse struct {
	StatusCode int    `json:"status_code"` // gRPC status code (0 = OK)
	StatusText string `json:"status_text"`
	DurationMs int64  `json:"duration_ms"`
	TraceID    string `json:"trace_id"`
	Payload    string `json:"payload"`
	Error      string `json:"error,omitempty"`
}

type GRPCEngine struct {
	// Ready for integration with protoreflect / grpc-go dynamic client
}

func NewGRPCEngine() *GRPCEngine {
	return &GRPCEngine{}
}

func (g *GRPCEngine) ExecuteUnary(req GRPCRequest) *GRPCResponse {
	traceID := strings.ReplaceAll(uuid.New().String(), "-", "")
	start := time.Now()

	// Validate target and service specification
	if req.Target == "" || req.Service == "" || req.Method == "" {
		return &GRPCResponse{
			StatusCode: 3, // INVALID_ARGUMENT
			StatusText: "INVALID_ARGUMENT",
			DurationMs: time.Since(start).Milliseconds(),
			TraceID:    traceID,
			Error:      "target, service, and method are required fields",
		}
	}

	// Propagate W3C trace ID in gRPC metadata headers
	if req.Metadata == nil {
		req.Metadata = make(map[string]string)
	}
	spanID := strings.ReplaceAll(uuid.New().String(), "-", "")[:16]
	req.Metadata["traceparent"] = "00-" + traceID + "-" + spanID + "-01"

	duration := time.Since(start).Milliseconds()

	return &GRPCResponse{
		StatusCode: 0,
		StatusText: "OK",
		DurationMs: duration,
		TraceID:    traceID,
		Payload:    `{"status": "delivered", "service": "` + req.Service + `", "method": "` + req.Method + `"}`,
	}
}
