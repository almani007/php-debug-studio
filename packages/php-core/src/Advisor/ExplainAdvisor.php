<?php

declare(strict_types=1);

namespace Zoventra\DebugStudio\Advisor;

class ExplainAdvisor
{
    /**
     * Analyze a MySQL/MariaDB or PostgreSQL EXPLAIN plan row.
     *
     * @param array<string, mixed> $explainRow
     * @return array<int, array<string, string>>
     */
    public function analyzeRow(array $explainRow): array
    {
        $findings = [];
        $table = (string) ($explainRow['table'] ?? 'unknown_table');
        $type = strtoupper((string) ($explainRow['type'] ?? ''));
        $extra = (string) ($explainRow['Extra'] ?? $explainRow['extra'] ?? '');
        $rows = (int) ($explainRow['rows'] ?? 0);

        // 1. Full Table Scan Detection (ALL)
        if ($type === 'ALL') {
            $findings[] = [
                'type' => 'full_table_scan',
                'severity' => $rows > 500 ? 'critical' : 'warning',
                'table' => $table,
                'message' => sprintf('Full table scan (type: ALL) detected on table "%s" examining ~%d rows.', $table, $rows),
                'recommendation' => sprintf('Add an index covering columns in WHERE clause for table "%s".', $table),
            ];
        }

        // 2. Using filesort
        if (stripos($extra, 'Using filesort') !== false) {
            $findings[] = [
                'type' => 'using_filesort',
                'severity' => 'warning',
                'table' => $table,
                'message' => sprintf('Query requires a filesort pass for table "%s".', $table),
                'recommendation' => 'Consider creating a composite index that covers both filtering and ORDER BY columns in matching order.',
            ];
        }

        // 3. Using temporary table
        if (stripos($extra, 'Using temporary') !== false) {
            $findings[] = [
                'type' => 'using_temporary',
                'severity' => 'warning',
                'table' => $table,
                'message' => sprintf('Query creates an in-memory or on-disk temporary table for table "%s".', $table),
                'recommendation' => 'Simplify GROUP BY or DISTINCT clauses, or align indexes to avoid temporary table creation.',
            ];
        }

        return $findings;
    }
}
