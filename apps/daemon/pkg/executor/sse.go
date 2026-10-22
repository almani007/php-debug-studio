package executor

import (
	"bufio"
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type SSEEvent struct {
	ID        string    `json:"id,omitempty"`
	Event     string    `json:"event,omitempty"`
	Data      string    `json:"data"`
	Timestamp time.Time `json:"timestamp"`
}

type SSEStreamer struct {
	client *http.Client
}

func NewSSEStreamer() *SSEStreamer {
	return &SSEStreamer{
		client: &http.Client{
			Timeout: 0, // Streaming connection
		},
	}
}

// ConnectSSE opens an HTTP connection with Accept: text/event-stream and streams incoming SSE messages
func (s *SSEStreamer) ConnectSSE(ctx context.Context, url string, headers map[string]string, onEvent func(event SSEEvent)) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return err
	}

	req.Header.Set("Accept", "text/event-stream")
	req.Header.Set("Cache-Control", "no-cache")
	for k, v := range headers {
		req.Header.Set(k, v)
	}

	resp, err := s.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected SSE response status: %d", resp.StatusCode)
	}

	reader := bufio.NewReader(resp.Body)
	var currentEvent SSEEvent

	for {
		select {
		case <-ctx.Done():
			return nil
		default:
			line, err := reader.ReadString('\n')
			if err != nil {
				return err
			}
			line = strings.TrimRight(line, "\r\n")

			if line == "" {
				// Empty line signals dispatch of current event
				if currentEvent.Data != "" {
					currentEvent.Timestamp = time.Now().UTC()
					onEvent(currentEvent)
					currentEvent = SSEEvent{}
				}
				continue
			}

			if strings.HasPrefix(line, "data:") {
				dataVal := strings.TrimSpace(strings.TrimPrefix(line, "data:"))
				if currentEvent.Data != "" {
					currentEvent.Data += "\n" + dataVal
				} else {
					currentEvent.Data = dataVal
				}
			} else if strings.HasPrefix(line, "event:") {
				currentEvent.Event = strings.TrimSpace(strings.TrimPrefix(line, "event:"))
			} else if strings.HasPrefix(line, "id:") {
				currentEvent.ID = strings.TrimSpace(strings.TrimPrefix(line, "id:"))
			}
		}
	}
}
