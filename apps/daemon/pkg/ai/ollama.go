package ai

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
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

type TagsResponse struct {
	Models []struct {
		Name       string `json:"name"`
		ModifiedAt string `json:"modified_at"`
		Size       int64  `json:"size"`
	} `json:"models"`
}

type AIStatus struct {
	Available bool     `json:"available"`
	Endpoint  string   `json:"endpoint"`
	Models    []string `json:"models"`
}

func (c *Client) IsAvailable() bool {
	resp, err := c.client.Get(fmt.Sprintf("%s/api/tags", c.endpoint))
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == http.StatusOK
}

func (c *Client) GetStatus() AIStatus {
	status := AIStatus{
		Available: false,
		Endpoint:  c.endpoint,
		Models:    []string{},
	}

	resp, err := c.client.Get(fmt.Sprintf("%s/api/tags", c.endpoint))
	if err != nil {
		status.Models = []string{"llama3.2:3b", "qwen2.5-coder:7b", "codellama", "mistral"}
		return status
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		status.Available = true
		var tags TagsResponse
		if err := json.NewDecoder(resp.Body).Decode(&tags); err == nil {
			for _, m := range tags.Models {
				status.Models = append(status.Models, m.Name)
			}
		}
	}
	if len(status.Models) == 0 {
		status.Models = []string{"llama3.2:3b", "qwen2.5-coder:7b", "codellama", "mistral"}
	}
	return status
}

func (c *Client) Generate(model, prompt string) (string, error) {
	if model == "" {
		model = "llama3.2:3b"
	}

	sanitizedPrompt := SanitizeAIInput(prompt)

	reqBody := GenerateRequest{
		Model:  model,
		Prompt: sanitizedPrompt,
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
Keep your answer clear, evidence-based, and actionable.`, contextType, queryOrError)

	return c.Generate("", prompt)
}

func (c *Client) ExplainException(exceptionMessage, stackTrace, model string) (string, error) {
	prompt := fmt.Sprintf(`You are an expert PHP and Laravel debugging engineer.
Analyze the following PHP exception and stack trace:

Exception Message:
%s

Stack Trace:
%s

Task:
1. Explain the root cause of this error in 1-2 sentences.
2. Identify the exact file and line causing the failure.
3. Provide the exact PHP code fix / patch.`, exceptionMessage, stackTrace)

	return c.Generate(model, prompt)
}

func (c *Client) OptimizeQuery(sqlQuery, explainPlan, model string) (string, error) {
	prompt := fmt.Sprintf(`You are a MySQL / PostgreSQL and Laravel Eloquent database optimization expert.
Analyze the following query and its execution plan:

SQL Query:
%s

Execution Plan / Observations:
%s

Task:
1. Identify any table scans, missing indexes, or N+1 query patterns.
2. Provide the exact CREATE INDEX SQL statement (with column order rationale).
3. If applicable, provide the Laravel Eloquent refactor (e.g. using with() for eager loading).`, sqlQuery, explainPlan)

	return c.Generate(model, prompt)
}

var (
	bearerRegex = regexp.MustCompile(`(?i)(bearer\s+)[a-zA-Z0-9_\-\.]+`)
	secretRegex = regexp.MustCompile(`(?i)(api[_-]?key|secret|password|token|auth)\s*[:=]\s*['"]?[^'"\s]{4,}['"]?`)
)

func SanitizeAIInput(input string) string {
	res := bearerRegex.ReplaceAllString(input, "${1}[REDACTED]")
	res = secretRegex.ReplaceAllString(res, "${1}=[REDACTED]")
	return res
}
