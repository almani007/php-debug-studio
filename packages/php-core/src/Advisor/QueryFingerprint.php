<?php

declare(strict_types=1);

namespace Zoventra\DebugStudio\Advisor;

class QueryFingerprint
{
    /**
     * Normalize a SQL query by stripping literal numbers, strings, and parameter placeholders
     * to produce a stable query fingerprint for N+1 detection.
     */
    public static function create(string $sql): string
    {
        // 1. Strip string literals: '...'
        $normalized = preg_replace("/'([^'\\\\]|\\\\.)*'/", '?', $sql) ?? $sql;

        // 2. Strip numeric literals
        $normalized = preg_replace('/\b\d+\b/', '?', $normalized) ?? $normalized;

        // 3. Normalize IN (...) clauses with multiple values to IN (?)
        $normalized = preg_replace('/in\s*\(\s*\?(?:\s*,\s*\?)*\s*\)/i', 'IN (?)', $normalized) ?? $normalized;

        // 4. Normalize whitespace
        $normalized = preg_replace('/\s+/', ' ', trim($normalized)) ?? $normalized;

        return strtoupper($normalized);
    }
}
