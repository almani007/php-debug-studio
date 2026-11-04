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
export declare function scanDatabaseCli(projectId: string, daemonUrl?: string): Promise<any>;
export declare function executeDatabaseQueryCli(sql: string, connectionId?: string, limit?: number, daemonUrl?: string): Promise<QueryResultCli>;
export declare function introspectSchemaCli(connectionId?: string, daemonUrl?: string): Promise<SchemaInfoCli>;
export declare function testConnectionCli(connectionId?: string, daemonUrl?: string): Promise<ConnectionTestResultCli>;
export declare function explainQueryCli(sql: string, driver?: string, daemonUrl?: string): Promise<ExplainPlanAnalysisCli>;
//# sourceMappingURL=database.d.ts.map