/**
 * Database performance and heuristic scan CLI client
 */
export async function scanDatabaseCli(
  projectId: string,
  daemonUrl: string = 'http://127.0.0.1:8765'
): Promise<any> {
  const url = `${daemonUrl}/v1/db/findings?project_id=${encodeURIComponent(projectId)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Failed to fetch database findings: HTTP ${res.status}`);
  }
  return await res.json();
}
