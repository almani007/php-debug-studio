<?php

declare(strict_types=1);

namespace Zoventra\DebugStudio\Advisor;

class NPlusOneDetector
{
    /** @var array<string, array<int, array<string, mixed>>> */
    protected array $fingerprintGroups = [];
    protected int $threshold;

    public function __construct(int $threshold = 3)
    {
        $this->threshold = $threshold;
    }

    /**
     * Record a query execution and detect if it forms an N+1 pattern.
     *
     * @param array<string, mixed> $query
     */
    public function record(array $query): void
    {
        $sql = (string) ($query['sql_template'] ?? '');
        $fingerprint = QueryFingerprint::create($sql);

        if (!isset($this->fingerprintGroups[$fingerprint])) {
            $this->fingerprintGroups[$fingerprint] = [];
        }

        $this->fingerprintGroups[$fingerprint][] = $query;
    }

    /**
     * Return all detected N+1 query patterns exceeding the threshold.
     *
     * @return array<int, array<string, mixed>>
     */
    public function detect(): array
    {
        $findings = [];

        foreach ($this->fingerprintGroups as $fingerprint => $occurrences) {
            $count = count($occurrences);
            if ($count >= $this->threshold) {
                $totalDurationUs = array_sum(array_column($occurrences, 'duration_us'));

                $findings[] = [
                    'type' => 'n_plus_one_query',
                    'severity' => 'warning',
                    'fingerprint' => $fingerprint,
                    'count' => $count,
                    'total_duration_us' => $totalDurationUs,
                    'sample_sql' => $occurrences[0]['sql_template'] ?? '',
                    'recommendation' => 'Repeated query detected. Consider eager loading using with() or load() if querying Eloquent relationships.',
                ];
            }
        }

        return $findings;
    }
}
