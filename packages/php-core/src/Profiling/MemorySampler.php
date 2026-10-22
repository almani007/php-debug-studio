<?php

declare(strict_types=1);

namespace Zoventra\DebugStudio\Profiling;

class MemorySampler
{
    protected int $baselineBytes;
    protected int $baselinePeakBytes;
    protected float $startTime;

    public function __construct()
    {
        $this->baselineBytes = memory_get_usage(true);
        $this->baselinePeakBytes = memory_get_peak_usage(true);
        $this->startTime = microtime(true);
    }

    /**
     * Get a snapshot of current memory allocations and delta from baseline.
     *
     * @return array<string, int|float>
     */
    public function sample(): array
    {
        $current = memory_get_usage(true);
        $peak = memory_get_peak_usage(true);
        $elapsedMs = (microtime(true) - $this->startTime) * 1000;

        return [
            'current_bytes' => $current,
            'peak_bytes' => $peak,
            'delta_bytes' => $current - $this->baselineBytes,
            'elapsed_ms' => round($elapsedMs, 2),
        ];
    }

    /**
     * Format byte values to human-readable string (e.g., "14.2 MB").
     */
    public static function formatBytes(int $bytes): string
    {
        $units = ['B', 'KB', 'MB', 'GB'];
        $power = $bytes > 0 ? (int) floor(log($bytes, 1024)) : 0;
        $power = min($power, count($units) - 1);
        $value = $bytes / pow(1024, $power);

        return sprintf('%.2f %s', $value, $units[$power]);
    }
}
