package dbgp

import (
	"bufio"
	"bytes"
	"encoding/base64"
	"fmt"
	"io"
	"net"
	"regexp"
	"strconv"
	"sync"
	"time"

	"github.com/google/uuid"
)

type SessionState string

const (
	StateStarting SessionState = "starting"
	StateBreak    SessionState = "break"
	StateRunning  SessionState = "running"
	StateStopping SessionState = "stopping"
	StateStopped  SessionState = "stopped"
)

type StackFrame struct {
	Level    int    `json:"level"`
	Type     string `json:"type"`
	Filename string `json:"filename"`
	Lineno   int    `json:"lineno"`
	Where    string `json:"where"`
}

type DebugSession struct {
	ID           string       `json:"id"`
	ProjectID    string       `json:"project_id"`
	State        SessionState `json:"state"`
	FileURI      string       `json:"file_uri"`
	Line         int          `json:"line"`
	StartedAt    time.Time    `json:"started_at"`
	Frames       []StackFrame `json:"frames,omitempty"`
	LastEval     string       `json:"last_eval,omitempty"`
	TraceActive  bool         `json:"trace_active"`
	TraceID      string       `json:"trace_id,omitempty"`
	LastVars     map[string]interface{} `json:"last_vars,omitempty"`
	conn         net.Conn
	txID         int
	mutex        sync.Mutex
}

// BreakpointInfo describes a breakpoint to inject into Xdebug.
type BreakpointInfo struct {
	ID         string `json:"id"`
	FileURI    string `json:"file_uri"`
	LineNumber int    `json:"line_number"`
	Type       string `json:"type"`
	Condition  string `json:"condition,omitempty"`
}

// BreakpointResolver returns breakpoints that match a given file URI.
type BreakpointResolver func(fileURI string) []BreakpointInfo

type Listener struct {
	address         string
	listener        net.Listener
	sessions        map[string]*DebugSession
	mutex           sync.RWMutex
	onEvent         func(session *DebugSession, event string)
	traceManager    *TraceManager
	autoRun         bool
	autoRunMutex    sync.RWMutex
	breakpointResolver BreakpointResolver
	breakpointMutex   sync.RWMutex
}

func NewListener(address string, onEvent func(session *DebugSession, event string)) *Listener {
	if address == "" {
		address = "127.0.0.1:9003"
	}
	l := &Listener{
		address:  address,
		sessions: make(map[string]*DebugSession),
		onEvent:  onEvent,
		// By default a freshly connected Xdebug session is resumed
		// immediately. This makes Xdebug usable without any breakpoints
		// and prevents web requests from hanging at the first line.
		autoRun: true,
	}
	// TraceManager is set externally via SetTraceManager
	return l
}

// SetAutoRun controls whether new DBGp sessions are resumed automatically.
func (l *Listener) SetAutoRun(enabled bool) {
	l.autoRunMutex.Lock()
	l.autoRun = enabled
	l.autoRunMutex.Unlock()
}

// AutoRun reports whether new DBGp sessions are resumed automatically.
func (l *Listener) AutoRun() bool {
	l.autoRunMutex.RLock()
	defer l.autoRunMutex.RUnlock()
	return l.autoRun
}

// SetBreakpointResolver sets a callback that provides breakpoints to inject
// into Xdebug when a session connects. The resolver receives the session's
// file URI and returns matching breakpoints.
func (l *Listener) SetBreakpointResolver(resolver BreakpointResolver) {
	l.breakpointMutex.Lock()
	l.breakpointResolver = resolver
	l.breakpointMutex.Unlock()
}

// resolveBreakpoints returns breakpoints matching the given file URI.
func (l *Listener) resolveBreakpoints(fileURI string) []BreakpointInfo {
	l.breakpointMutex.RLock()
	defer l.breakpointMutex.RUnlock()
	if l.breakpointResolver == nil {
		return nil
	}
	return l.breakpointResolver(fileURI)
}

func (l *Listener) SetTraceManager(tm *TraceManager) {
	l.traceManager = tm
}

func (l *Listener) GetTraceManager() *TraceManager {
	return l.traceManager
}

func (l *Listener) Start() error {
	ln, err := net.Listen("tcp", l.address)
	if err != nil {
		return fmt.Errorf("failed to bind DBGp listener on %s: %w", l.address, err)
	}
	l.listener = ln

	go l.acceptLoop()
	return nil
}

func (l *Listener) Close() error {
	if l.listener != nil {
		return l.listener.Close()
	}
	return nil
}

func (l *Listener) GetSessions() []*DebugSession {
	l.mutex.RLock()
	defer l.mutex.RUnlock()

	var list []*DebugSession
	for _, s := range l.sessions {
		list = append(list, s)
	}
	return list
}

func (l *Listener) GetSession(id string) *DebugSession {
	l.mutex.RLock()
	defer l.mutex.RUnlock()
	return l.sessions[id]
}

func (l *Listener) acceptLoop() {
	for {
		conn, err := l.listener.Accept()
		if err != nil {
			return
		}

		go l.handleConnection(conn)
	}
}

var (
	reStatus   = regexp.MustCompile(`status="([^"]+)"`)
	reFile     = regexp.MustCompile(`(?:filename|fileuri)="([^"]+)"`)
	reLine     = regexp.MustCompile(`lineno="([0-9]+)"`)
	reWhere    = regexp.MustCompile(`where="([^"]+)"`)
	reLevel    = regexp.MustCompile(`level="([0-9]+)"`)
	reProperty = regexp.MustCompile(`(?s)<property[^>]*>(.*?)</property>`)
	reContext  = regexp.MustCompile(`(?s)<response[^>]*command="context_get"[^>]*>(.*)</response>`)
)

func (l *Listener) handleConnection(conn net.Conn) {
	sessionID := uuid.New().String()
	session := &DebugSession{
		ID:        sessionID,
		State:     StateStarting,
		StartedAt: time.Now(),
		conn:      conn,
		Frames:    make([]StackFrame, 0),
	}

	l.mutex.Lock()
	l.sessions[sessionID] = session
	l.mutex.Unlock()

	defer func() {
		// If trace was active, stop it
		if session.TraceActive && l.traceManager != nil {
			l.traceManager.StopTrace(session.TraceID)
			session.TraceActive = false
		}

		l.mutex.Lock()
		delete(l.sessions, sessionID)
		l.mutex.Unlock()
		session.State = StateStopped
		_ = conn.Close()
		if l.onEvent != nil {
			l.onEvent(session, "session_ended")
		}
	}()

	reader := bufio.NewReader(conn)
	for {
		// DBGp framing: {length}\0{xml_payload}\0
		lengthStr, err := reader.ReadString(0)
		if err != nil {
			break
		}
		lengthStr = lengthStr[:len(lengthStr)-1] // strip NUL
		payloadLen, err := strconv.Atoi(lengthStr)
		if err != nil {
			break
		}

		payload := make([]byte, payloadLen)
		if _, err := io.ReadFull(reader, payload); err != nil {
			break
		}
		// Read trailing NUL
		_, _ = reader.ReadByte()

		str := string(payload)

		// Initial init packet negotiation
		if bytes.Contains(payload, []byte("<init")) {
			session.State = StateStarting
			if m := reFile.FindStringSubmatch(str); len(m) > 1 {
				session.FileURI = m[1]
			}
			if l.onEvent != nil {
				l.onEvent(session, "session_started")
			}
			// Negotiate DBGp features
			_ = session.SendCommand("feature_set -n max_depth -v 3")
			_ = session.SendCommand("feature_set -n max_children -v 32")

			// Inject any automatic breakpoints that match this file before
			// resuming, so the first request breaks at the right place.
			if l.breakpointResolver != nil {
				for _, bp := range l.resolveBreakpoints(session.FileURI) {
					_ = session.SendCommand(fmt.Sprintf(
						"breakpoint_set -t %s -f %s -n %d",
						bp.Type, bp.FileURI, bp.LineNumber,
					))
				}
			}

			if l.AutoRun() {
				// Resume immediately: no breakpoints are required for the
				// application to keep working while the session is observed.
				session.State = StateRunning
				_ = session.SendCommand("run")
			} else {
				_ = session.SendCommand("step_into")
			}
			continue
		}

		// Parse context_get response (for variable capture in trace mode)
		if bytes.Contains(payload, []byte(`command="context_get"`)) {
			vars := ParseVariables(str)
			if len(vars) > 0 {
				session.LastVars = vars
				// If tracing, update the last step with variables
				if session.TraceActive && l.traceManager != nil {
					rec := l.traceManager.GetRecording(session.TraceID)
					if rec != nil && len(rec.Steps) > 0 {
						l.traceManager.mutex.Lock()
						rec.Steps[len(rec.Steps)-1].Variables = vars
						l.traceManager.mutex.Unlock()
					}
				}
			}
		}

		// Parse DBGp status changes
		if sm := reStatus.FindStringSubmatch(str); len(sm) > 1 {
			switch sm[1] {
			case "break":
				session.State = StateBreak
				if fm := reFile.FindStringSubmatch(str); len(fm) > 1 {
					session.FileURI = fm[1]
				}
				if lm := reLine.FindStringSubmatch(str); len(lm) > 1 {
					if n, err := strconv.Atoi(lm[1]); err == nil {
						session.Line = n
					}
				}
				// Auto-fetch stack trace
				_ = session.SendCommand("stack_get")
			case "running":
				session.State = StateRunning
			case "stopping":
				session.State = StateStopping
				// If trace was active, complete it
				if session.TraceActive && l.traceManager != nil {
					l.traceManager.StopTrace(session.TraceID)
					session.TraceActive = false
					if l.onEvent != nil {
						l.onEvent(session, "trace_completed")
					}
				}
				// DBGp requires the debugger to acknowledge a "stopping"
				// status with a stop command. Without this the PHP process
				// blocks until the connection times out (or forever).
				_ = session.SendCommand("stop")
			case "stopped":
				session.State = StateStopped
			}
		}

		// Parse stack frames if response to stack_get
		if bytes.Contains(payload, []byte("<stack")) {
			session.parseStackFrames(str)

			// ── TRACE MODE: auto-step after stack is parsed ──
			if session.TraceActive && session.State == StateBreak && l.traceManager != nil {
				l.traceManager.RecordStep(session)
				// RecordStep will auto-send step_into/step_over
				continue // Don't emit normal session_updated during trace
			}
		}

		// Parse property evaluation if response to eval
		if pm := reProperty.FindStringSubmatch(str); len(pm) > 1 {
			session.LastEval = pm[1]
		}

		if l.onEvent != nil {
			l.onEvent(session, "session_updated")
		}
	}
}

func (s *DebugSession) parseStackFrames(xmlStr string) {
	reStackTag := regexp.MustCompile(`<stack\s+([^>]+)/>|<stack\s+([^>]+)>(.*?)</stack>`)
	matches := reStackTag.FindAllStringSubmatch(xmlStr, -1)
	frames := make([]StackFrame, 0, len(matches))

	for _, m := range matches {
		attrs := m[1]
		if attrs == "" {
			attrs = m[2]
		}
		var f StackFrame
		if lev := reLevel.FindStringSubmatch(attrs); len(lev) > 1 {
			f.Level, _ = strconv.Atoi(lev[1])
		}
		if fn := reFile.FindStringSubmatch(attrs); len(fn) > 1 {
			f.Filename = fn[1]
		}
		if ln := reLine.FindStringSubmatch(attrs); len(ln) > 1 {
			f.Lineno, _ = strconv.Atoi(ln[1])
		}
		if wh := reWhere.FindStringSubmatch(attrs); len(wh) > 1 {
			f.Where = wh[1]
		}
		frames = append(frames, f)
	}

	if len(frames) > 0 {
		s.Frames = frames
		s.FileURI = frames[0].Filename
		s.Line = frames[0].Lineno
	}
}

func (s *DebugSession) SendCommand(cmd string) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	if s.conn == nil {
		return fmt.Errorf("session connection closed")
	}

	s.txID++
	rawCmd := fmt.Sprintf("%s -i %d\x00", cmd, s.txID)
	_, err := s.conn.Write([]byte(rawCmd))
	return err
}

func (s *DebugSession) StepInto() error {
	return s.SendCommand("step_into")
}

func (s *DebugSession) StepOver() error {
	return s.SendCommand("step_over")
}

func (s *DebugSession) StepOut() error {
	return s.SendCommand("step_out")
}

func (s *DebugSession) Continue() error {
	return s.SendCommand("run")
}

func (s *DebugSession) Stop() error {
	return s.SendCommand("stop")
}

func (s *DebugSession) Eval(expression string) error {
	encoded := base64.StdEncoding.EncodeToString([]byte(expression))
	return s.SendCommand(fmt.Sprintf("eval -- %s", encoded))
}

func (s *DebugSession) StackGet() error {
	return s.SendCommand("stack_get")
}
