package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

type Client struct {
	endpoint string
	client   *http.Client
}

func NewClient(endpoint string) *Client {
	if endpoint == "" {
		endpoint = "http://127.0.0.1:11434"
	}
	return &Client{
		endpoint: endpoint,
		client: &http.Client{
			Timeout: 45 * time.Second,
		},
	}
}

type GenerateRequest struct {
	Model  string `json:"model"`
	Prompt string `json:"prompt"`
	Stream bool   `json:"stream"`
}

type GenerateResponse struct {
	Model    string `json:"model"`
	Response string `json:"response"`
	Done     bool   `json:"done"`
}

func (c *Client) IsAvailable() bool {
	resp, err := c.client.Get(fmt.Sprintf("%s/api/tags", c.endpoint))
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

func (c *Client) Generate(model, prompt string) (string, error) {
	if model == "" {
		model = "llama3.2:3b"
	}

	reqBody := GenerateRequest{
		Model:  model,
		Prompt: prompt,
		Stream: false,
	}

	payload, err := json.Marshal(reqBody)
	if err != nil {
		return "", err
	}

	resp, err := c.client.Post(fmt.Sprintf("%s/api/generate", c.endpoint), "application/json", bytes.NewBuffer(payload))
	if err != nil {
		return "", fmt.Errorf("local Ollama service offline or unreachable on %s: %w", c.endpoint, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("ollama error HTTP %d", resp.StatusCode)
	}

	var genResp GenerateResponse
	if err := json.NewDecoder(resp.Body).Decode(&genResp); err != nil {
		return "", err
	}

	return genResp.Response, nil
}

func (c *Client) Diagnose(contextType, queryOrError string) (string, error) {
	prompt := fmt.Sprintf(`You are an expert PHP and Laravel database performance engineer.
Context Type: %s
Content:
%s

Provide a concise diagnosis, explain the root cause, and give the exact PHP / Eloquent code or SQL index recommendation to optimize it.
Keep your answer clear and actionable.`, contextType, queryOrError)

	return c.Generate("", prompt)
}
