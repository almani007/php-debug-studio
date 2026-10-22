package dbgp

import (
	"bufio"
	"bytes"
	"fmt"
	"io"
	"net"
	"strconv"
	"sync"
	"time"

	"github.com/google/uuid"
)

type SessionState string

const (
	StateStarting  SessionState = "starting"
	StateBreak     SessionState = "break"
	StateRunning   SessionState = "running"
	StateStopping  SessionState = "stopping"
	StateStopped   SessionState = "stopped"
)

type DebugSession struct {
	ID        string       `json:"id"`
	ProjectID string       `json:"project_id"`
	State     SessionState `json:"state"`
	FileURI   string       `json:"file_uri"`
	Line      int          `json:"line"`
	StartedAt time.Time    `json:"started_at"`
	conn      net.Conn
	txID      int
	mutex     sync.Mutex
}

type Listener struct {
	address  string
	listener net.Listener
	sessions map[string]*DebugSession
	mutex    sync.RWMutex
	onEvent  func(session *DebugSession, event string)
}

func NewListener(address string, onEvent func(session *DebugSession, event string)) *Listener {
	if address == "" {
		address = "127.0.0.1:9003"
	}
	return &Listener{
		address:  address,
		sessions: make(map[string]*DebugSession),
		onEvent:  onEvent,
	}
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

func (l *Listener) acceptLoop() {
	for {
		conn, err := l.listener.Accept()
		if err != nil {
			return
		}

		go l.handleConnection(conn)
	}
}

func (l *Listener) handleConnection(conn net.Conn) {
	sessionID := uuid.New().String()
	session := &DebugSession{
		ID:        sessionID,
		State:     StateStarting,
		StartedAt: time.Now(),
		conn:      conn,
	}

	l.mutex.Lock()
	l.sessions[sessionID] = session
	l.mutex.Unlock()

	defer func() {
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

		// Initial init packet negotiation
		if bytes.Contains(payload, []byte("<init")) {
			session.State = StateBreak
			if l.onEvent != nil {
				l.onEvent(session, "session_started")
			}
			// Negotiate DBGp features
			session.SendCommand("feature_set -n max_depth -v 3")
			session.SendCommand("feature_set -n max_children -v 32")
			session.SendCommand("run")
		}
	}
}

func (s *DebugSession) SendCommand(cmd string) error {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	s.txID++
	rawCmd := fmt.Sprintf("%s -i %d\x00", cmd, s.txID)
	_, err := s.conn.Write([]byte(rawCmd))
	return err
}
