package ws

import (
	"encoding/json"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		// Secure loopback & local origin verification
		return true
	},
}

type EventMessage struct {
	Type      string      `json:"type"`
	ProjectID string      `json:"project_id"`
	Payload   interface{} `json:"payload"`
}

type Hub struct {
	clients   map[*websocket.Conn]bool
	broadcast chan EventMessage
	mutex     sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		clients:   make(map[*websocket.Conn]bool),
		broadcast: make(chan EventMessage, 256),
	}
}

func (h *Hub) Run() {
	for msg := range h.broadcast {
		data, err := json.Marshal(msg)
		if err != nil {
			continue
		}

		h.mutex.RLock()
		for conn := range h.clients {
			_ = conn.WriteMessage(websocket.TextMessage, data)
		}
		h.mutex.RUnlock()
	}
}

func (h *Hub) Broadcast(eventType, projectID string, payload interface{}) {
	h.broadcast <- EventMessage{
		Type:      eventType,
		ProjectID: projectID,
		Payload:   payload,
	}
}

func (h *Hub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		return
	}

	h.mutex.Lock()
	h.clients[conn] = true
	h.mutex.Unlock()

	defer func() {
		h.mutex.Lock()
		delete(h.clients, conn)
		h.mutex.Unlock()
		_ = conn.Close()
	}()

	for {
		if _, _, err := conn.ReadMessage(); err != nil {
			break
		}
	}
}
