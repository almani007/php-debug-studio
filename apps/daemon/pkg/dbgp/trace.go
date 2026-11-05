package dbgp

import (
	"encoding/base64"
	"fmt"
	"regexp"
	"strconv"
	"sync"
	"time"
)

// ── Trace Mode: auto-step line-by-line without manual breakpoints ──

type TraceStep struct {
	Index     int                    `json:"index"`
	File      string                 `json:"file"`
	Line      int                    `json:"line"`
	Function  string                 `json:"function,omitempty"`
	Frames    []StackFrame           `json:"frames,omitempty"`
	Variables map[string]interface{} `json:"variables,omitempty"`
	Timestamp int64                  `json:"timestamp"`
	DeltaMs   int64                  `json:"delta_ms"`
}

type TraceRecording struct {
	ID        string      `json:"id"`
	SessionID string      `json:"session_id"`
	ProjectID string      `json:"project_id"`
	URL       string      `json:"url,omitempty"`
	Method    string      `json:"method,omitempty"`
	Steps     []TraceStep `json:"steps"`
	StartedAt time.Time   `json:"started_at"`
	EndedAt   *time.Time  `json:"ended_at,omitempty"`
	Status    string      `json:"status"` // "recording", "completed", "stopped"
	TotalMs   int64       `json:"total_ms"`
	FileMap   map[string]bool `json:"file_map"` // unique files touched
}

type TraceConfig struct {
	MaxSteps      int      `json:"max_steps"`       // Safety limit (default 10000)
	CaptureVars   bool     `json:"capture_vars"`    // Capture local variables at each step
	FilterFiles   []string `json:"filter_files"`    // Only trace these file patterns (empty = all)
	ExcludeVendor bool     `json:"exclude_vendor"`  // Skip vendor/ directory
	StepMode      string   `json:"step_mode"`       // "into" (default) or "over"
}

// TraceManager handles auto-stepping trace sessions
type TraceManager struct {
	recordings map[string]*TraceRecording
	configs    map[string]*TraceConfig // keyed by session ID
	mutex      sync.RWMutex
	onStep     func(recording *TraceRecording, step *TraceStep)
}

func NewTraceManager(onStep func(recording *TraceRecording, step *TraceStep)) *TraceManager {
	return &TraceManager{
		recordings: make(map[string]*TraceRecording),
		configs:    make(map[string]*TraceConfig),
		onStep:     onStep,
	}
}

func (tm *TraceManager) StartTrace(session *DebugSession, config *TraceConfig, traceID string, url string, method string) *TraceRecording {
	if config == nil {
		config = &TraceConfig{
			MaxSteps:      10000,
			CaptureVars:   true,
			ExcludeVendor: true,
			StepMode:      "into",
		}
	}
	if config.MaxSteps == 0 {
		config.MaxSteps = 10000
	}
	if config.StepMode == "" {
		config.StepMode = "into"
	}

	recording := &TraceRecording{
		ID:        traceID,
		SessionID: session.ID,
		ProjectID: session.ProjectID,
		URL:       url,
		Method:    method,
		Steps:     make([]TraceStep, 0, 256),
		StartedAt: time.Now(),
		Status:    "recording",
		FileMap:   make(map[string]bool),
	}

	tm.mutex.Lock()
	tm.recordings[traceID] = recording
	tm.configs[session.ID] = config
	session.TraceActive = true
	session.TraceID = traceID
	tm.mutex.Unlock()

	return recording
}

func (tm *TraceManager) StopTrace(traceID string) *TraceRecording {
	tm.mutex.Lock()
	defer tm.mutex.Unlock()

	rec, ok := tm.recordings[traceID]
	if !ok {
		return nil
	}

	now := time.Now()
	rec.EndedAt = &now
	rec.Status = "completed"
	rec.TotalMs = now.Sub(rec.StartedAt).Milliseconds()

	// Clean up config
	delete(tm.configs, rec.SessionID)

	return rec
}

func (tm *TraceManager) GetConfig(sessionID string) *TraceConfig {
	tm.mutex.RLock()
	defer tm.mutex.RUnlock()
	return tm.configs[sessionID]
}

func (tm *TraceManager) GetRecording(traceID string) *TraceRecording {
	tm.mutex.RLock()
	defer tm.mutex.RUnlock()
	return tm.recordings[traceID]
}

func (tm *TraceManager) GetRecordings() []*TraceRecording {
	tm.mutex.RLock()
	defer tm.mutex.RUnlock()

	list := make([]*TraceRecording, 0, len(tm.recordings))
	for _, r := range tm.recordings {
		list = append(list, r)
	}
	return list
}

// RecordStep is called when a debug session hits a break during trace mode
func (tm *TraceManager) RecordStep(session *DebugSession) {
	tm.mutex.Lock()
	rec, ok := tm.recordings[session.TraceID]
	config := tm.configs[session.ID]
	tm.mutex.Unlock()

	if !ok || rec == nil || config == nil || rec.Status != "recording" {
		return
	}

	// Safety limit
	if len(rec.Steps) >= config.MaxSteps {
		tm.StopTrace(session.TraceID)
		return
	}

	file := session.FileURI
	line := session.Line
	function := ""
	if len(session.Frames) > 0 {
		function = session.Frames[0].Where
	}

	// Filter: exclude vendor if configured
	if config.ExcludeVendor && isVendorFile(file) {
		// Skip this step but keep stepping
		tm.autoStep(session, config)
		return
	}

	// Filter: only trace specific files if configured
	if len(config.FilterFiles) > 0 && !matchesFilter(file, config.FilterFiles) {
		tm.autoStep(session, config)
		return
	}

	var deltaMs int64
	if len(rec.Steps) > 0 {
		last := rec.Steps[len(rec.Steps)-1]
		deltaMs = time.Now().UnixMilli() - last.Timestamp
	}

	step := TraceStep{
		Index:     len(rec.Steps),
		File:      file,
		Line:      line,
		Function:  function,
		Frames:    copyFrames(session.Frames),
		Timestamp: time.Now().UnixMilli(),
		DeltaMs:   deltaMs,
	}

	// Capture variables if enabled
	if config.CaptureVars {
		step.Variables = tm.captureVariables(session)
	}

	tm.mutex.Lock()
	rec.Steps = append(rec.Steps, step)
	rec.FileMap[file] = true
	tm.mutex.Unlock()

	// Emit real-time event
	if tm.onStep != nil {
		tm.onStep(rec, &step)
	}

	// Continue auto-stepping
	tm.autoStep(session, config)
}

func (tm *TraceManager) autoStep(session *DebugSession, config *TraceConfig) {
	if config.StepMode == "over" {
		_ = session.StepOver()
	} else {
		_ = session.StepInto()
	}
}

func (tm *TraceManager) captureVariables(session *DebugSession) map[string]interface{} {
	// Send context_get for local scope (context 0)
	err := session.SendCommand("context_get -c 0")
	if err != nil {
		return nil
	}
	// Variables will be parsed from the response in the listener's read loop
	// For now return what we have from the last eval
	// The actual parsing happens asynchronously via the DBGp response
	return nil
}

// ── Helpers ──

var reVendor = regexp.MustCompile(`/vendor/`)

func isVendorFile(fileURI string) bool {
	return reVendor.MatchString(fileURI)
}

func matchesFilter(fileURI string, filters []string) bool {
	for _, f := range filters {
		if containsPattern(fileURI, f) {
			return true
		}
	}
	return false
}

func containsPattern(s, pattern string) bool {
	// Simple substring match - could be upgraded to glob
	return len(pattern) > 0 && len(s) > 0 && regexp.MustCompile(regexp.QuoteMeta(pattern)).MatchString(s)
}

func copyFrames(frames []StackFrame) []StackFrame {
	if frames == nil {
		return nil
	}
	c := make([]StackFrame, len(frames))
	copy(c, frames)
	return c
}

// ── Extended DebugSession fields for trace mode ──
// These need to be added to DebugSession:
//   TraceActive bool   `json:"trace_active"`
//   TraceID     string `json:"trace_id,omitempty"`

// ── Variable parsing from context_get response ──

var (
	rePropertyFull = regexp.MustCompile(`<property\s+([^>]*)(?:>(.*?)</property>|/>)`)
	rePropName     = regexp.MustCompile(`name="([^"]*)"`)
	rePropType     = regexp.MustCompile(`type="([^"]*)"`)
	rePropEncoding = regexp.MustCompile(`encoding="([^"]*)"`)
)

func ParseVariables(xmlStr string) map[string]interface{} {
	vars := make(map[string]interface{})
	matches := rePropertyFull.FindAllStringSubmatch(xmlStr, -1)
	for _, m := range matches {
		attrs := m[1]
		value := m[2]

		var name, varType string
		if nm := rePropName.FindStringSubmatch(attrs); len(nm) > 1 {
			name = nm[1]
		}
		if tm := rePropType.FindStringSubmatch(attrs); len(tm) > 1 {
			varType = tm[1]
		}
		if name == "" {
			continue
		}

		// Decode base64 value if encoded
		if em := rePropEncoding.FindStringSubmatch(attrs); len(em) > 1 && em[1] == "base64" {
			if decoded, err := base64.StdEncoding.DecodeString(value); err == nil {
				value = string(decoded)
			}
		}

		switch varType {
		case "int":
			if v, err := strconv.Atoi(value); err == nil {
				vars[name] = v
			} else {
				vars[name] = value
			}
		case "float":
			if v, err := strconv.ParseFloat(value, 64); err == nil {
				vars[name] = v
			} else {
				vars[name] = value
			}
		case "bool":
			vars[name] = value == "1" || value == "true"
		case "null":
			vars[name] = nil
		case "string":
			vars[name] = value
		case "array", "object":
			vars[name] = fmt.Sprintf("(%s)", varType)
		default:
			vars[name] = value
		}
	}
	return vars
}
