<?php

namespace Zoventra\DebugStudio\Legacy;

class LegacyDebugStudio
{
    protected static $instance = null;
    protected string $projectId;
    protected string $endpoint;
    protected LegacyTracer $tracer;
    protected LegacySanitizer $sanitizer;
    protected array $queries = [];

    public function __construct(array $config = [])
    {
        $this->projectId = isset($config['project_id']) ? (string) $config['project_id'] : 'default';
        $this->endpoint = isset($config['endpoint']) ? rtrim((string) $config['endpoint'], '/') : 'http://127.0.0.1:8765';
        $this->sanitizer = new LegacySanitizer();

        $traceparent = isset($_SERVER['HTTP_TRACEPARENT']) ? $_SERVER['HTTP_TRACEPARENT'] : null;
        $this->tracer = new LegacyTracer($traceparent);

        // Security / EOL warning log as required by SRS Section 12
        error_log('[PHP Debug Studio] Notice: Running on legacy PHP version (' . PHP_VERSION . '). We recommend upgrading to PHP 8.2+ for deep tracing.');
    }

    public static function init(array $config = []): self
    {
        if (self::$instance === null) {
            self::$instance = new self($config);
        }
        return self::$instance;
    }

    public static function recordQuery(string $sql, array $bindings = [], int $durationUs = 0): void
    {
        if (self::$instance !== null) {
            self::$instance->queries[] = [
                'trace_id' => self::$instance->tracer->getTraceId(),
                'sql_template' => self::$instance->sanitizer->sanitize($sql),
                'bindings_masked_json' => json_encode(self::$instance->sanitizer->sanitize($bindings)),
                'duration_us' => $durationUs,
                'connection_name' => 'default',
            ];
        }
    }

    public static function flush(): void
    {
        if (self::$instance === null) {
            return;
        }

        $payload = [
            'project_id' => self::$instance->projectId,
            'trace' => [
                'project_id' => self::$instance->projectId,
                'trace_id' => self::$instance->tracer->getTraceId(),
                'route' => isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : 'cli',
                'service_name' => 'legacy-php-app',
                'status' => http_response_code() ? http_response_code() : 200,
                'started_at' => date('c'),
                'duration_us' => 0,
            ],
            'queries' => self::$instance->queries,
        ];

        $ctx = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\nUser-Agent: PHP-Debug-Studio-Legacy/1.0\r\n",
                'content' => json_encode($payload),
                'timeout' => 1.0,
                'ignore_errors' => true,
            ],
        ]);

        @file_get_contents(self::$instance->endpoint . '/v1/events/ingest', false, $ctx);
    }
}
