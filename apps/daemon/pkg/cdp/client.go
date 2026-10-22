package cdp

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"sync/atomic"

	"github.com/gorilla/websocket"
)

type CDPMessage struct {
	ID     int64           `json:"id,omitempty"`
	Method string          `json:"method,omitempty"`
	Params json.RawMessage `json:"params,omitempty"`
	Result json.RawMessage `json:"result,omitempty"`
}

type CDPClient struct {
	wsURL   string
	conn    *websocket.Conn
	seq     int64
	mutex   sync.Mutex
	onEvent func(method string, params json.RawMessage)
}

func NewCDPClient(wsURL string, onEvent func(method string, params json.RawMessage)) *CDPClient {
	return &CDPClient{
		wsURL:   wsURL,
		onEvent: onEvent,
	}
}

// Connect dials the Chromium CDP WebSocket endpoint and starts listening for events
func (c *CDPClient) Connect() error {
	dialer := websocket.Dialer{}
	header := http.Header{}
	conn, _, err := dialer.Dial(c.wsURL, header)
	if err != nil {
		return fmt.Errorf("failed to connect to CDP endpoint: %w", err)
	}
	c.conn = conn

	// Enable standard debugging domains
	go c.listenLoop()
	_ = c.SendCommand("Runtime.enable", nil)
	_ = c.SendCommand("Network.enable", nil)
	_ = c.SendCommand("Log.enable", nil)

	return nil
}

func (c *CDPClient) Close() error {
	if c.conn != nil {
		return c.conn.Close()
	}
	return nil
}

func (c *CDPClient) SendCommand(method string, params interface{}) error {
	c.mutex.Lock()
	defer c.mutex.Unlock()

	id := atomic.AddInt64(&c.seq, 1)
	var rawParams json.RawMessage
	if params != nil {
		rawParams, _ = json.Marshal(params)
	}

	msg := CDPMessage{
		ID:     id,
		Method: method,
		Params: rawParams,
	}

	return c.conn.WriteJSON(msg)
}

func (c *CDPClient) listenLoop() {
	defer c.Close()
	for {
		var msg CDPMessage
		if err := c.conn.ReadJSON(&msg); err != nil {
			break
		}

		if msg.Method != "" && c.onEvent != nil {
			c.onEvent(msg.Method, msg.Params)
		}
	}
}
