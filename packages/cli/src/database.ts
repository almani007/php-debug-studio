/**
 * Database Tools & Solution Advisor CLI client
 */

export interface QueryResultCli {
  columns: string[];
  column_types: string[];
  rows: Record<string, any>[];
  row_count: number;
  duration_ms: number;
  readonly: boolean;
  connection_id: string;
  sql: string;
}

export interface TableInfoCli {
  name: string;
  estimated_rows: number;
  column_count: number;
  columns: {
    name: string;
    type: string;
    nullable: boolean;
    default_value: string;
    is_primary_key: boolean;
  }[];
  indexes: {
    name: string;
    unique: boolean;
    columns: string[];
    type: string;
  }[];
  foreign_keys: {
    column: string;
    referenced_table: string;
    referenced_column: string;
  }[];
  warnings?: string[];
}

export interface SchemaInfoCli {
  connection_id: string;
  driver: string;
  database_name: string;
  tables: TableInfoCli[];
  total_tables: number;
}

export interface ConnectionTestResultCli {
  success: boolean;
  latency_ms: number;
  driver: string;
  version: string;
  tables_count: number;
  database_size_bytes: number;
  readonly: boolean;
  message: string;
}

export interface ExplainPlanAnalysisCli {
  sql: string;
  driver: string;
  plan_type: string;
  rows_examined: number;
  key_used: string;
  cost: number;
  warnings: string[];
  antipatterns: {
    code: string;
    severity: string;
    title: string;
    description: string;
    recommendation: string;
  }[];
  summary: string;
  proposed_index_sql?: string;
  proposed_migration_php?: string;
  proposed_code_refactor?: string;
}

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

export async function executeDatabaseQueryCli(
  sql: string,
  connectionId: string = 'default',
  limit: number = 50,
  daemonUrl: string = 'http://127.0.0.1:8765'
): Promise<QueryResultCli> {
  const url = `${daemonUrl}/v1/db/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      connection_id: connectionId,
      sql,
      limit,
    }),
  });

  const data = (await res.json()) as any;
  if (!res.ok) {
    throw new Error(data.error?.message || `Failed to execute query: HTTP ${res.status}`);
  }
  return (data.data || data) as QueryResultCli;
}

export async function introspectSchemaCli(
  connectionId: string = 'default',
  daemonUrl: string = 'http://127.0.0.1:8765'
): Promise<SchemaInfoCli> {
  const url = `${daemonUrl}/v1/db/schema?connection_id=${encodeURIComponent(connectionId)}`;
  const res = await fetch(url);
  const data = (await res.json()) as any;
  if (!res.ok) {
    throw new Error(data.error?.message || `Failed to introspect schema: HTTP ${res.status}`);
  }
  return (data.data || data) as SchemaInfoCli;
}

export async function testConnectionCli(
  connectionId: string = 'default',
  daemonUrl: string = 'http://127.0.0.1:8765'
): Promise<ConnectionTestResultCli> {
  const url = `${daemonUrl}/v1/db/connections/${encodeURIComponent(connectionId)}/test`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });

  const data = (await res.json()) as any;
  if (!res.ok) {
    throw new Error(data.error?.message || `Failed to test connection: HTTP ${res.status}`);
  }
  return (data.data || data) as ConnectionTestResultCli;
}

export async function explainQueryCli(
  sql: string,
  driver: string = 'mysql',
  daemonUrl: string = 'http://127.0.0.1:8765'
): Promise<ExplainPlanAnalysisCli> {
  const url = `${daemonUrl}/v1/db/explain`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, driver }),
  });

  const data = (await res.json()) as any;
  if (!res.ok) {
    throw new Error(data.error?.message || `Failed to explain query: HTTP ${res.status}`);
  }
  return (data.data || data) as ExplainPlanAnalysisCli;
}
