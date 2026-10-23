/**
 * CLI Local AI Solution Advisor interface
 * Connects to offline local Ollama through PHP Debug Studio daemon
 */
export async function explainErrorCli(errorText: string, daemonUrl: string = 'http://127.0.0.1:8765'): Promise<string> {
  try {
    const res = await fetch(`${daemonUrl}/v1/ai/explain-error`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: errorText }),
    });
    if (!res.ok) {
      return `Daemon returned HTTP ${res.status}: ${await res.text()}`;
    }
    const data = await res.json() as { explanation: string; model: string };
    return `[Model: ${data.model}]\n${data.explanation}`;
  } catch (err: any) {
    return `Failed to connect to local daemon at ${daemonUrl}: ${err.message}`;
  }
}

export async function optimizeQueryCli(sqlQuery: string, daemonUrl: string = 'http://127.0.0.1:8765'): Promise<string> {
  try {
    const res = await fetch(`${daemonUrl}/v1/ai/optimize-query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql: sqlQuery }),
    });
    if (!res.ok) {
      return `Daemon returned HTTP ${res.status}: ${await res.text()}`;
    }
    const data = await res.json() as { recommendations: string; model: string };
    return `[Model: ${data.model}]\n${data.recommendations}`;
  } catch (err: any) {
    return `Failed to connect to local daemon at ${daemonUrl}: ${err.message}`;
  }
}
