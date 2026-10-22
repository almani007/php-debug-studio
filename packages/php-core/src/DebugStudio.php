<?php

declare(strict_types=1);

namespace Zoventra\DebugStudio;

use Zoventra\DebugStudio\Contracts\CollectorInterface;
use Zoventra\DebugStudio\Contracts\SanitizerInterface;
use Zoventra\DebugStudio\Contracts\TransportInterface;
use Zoventra\DebugStudio\Collectors\ErrorCollector;
use Zoventra\DebugStudio\Transports\HttpTransport;

class DebugStudio
{
    protected static ?self $instance = null;
    protected string $projectId;
    protected string $environmentId;
    protected bool $enabled = true;
    protected Tracer $tracer;
    protected SanitizerInterface $sanitizer;
    protected TransportInterface $transport;
    /** @var array<string, CollectorInterface> */
    protected array $collectors = [];
    /** @var array<int, array<string, mixed>> */
    protected array $pendingQueries = [];
    /** @var array<int, array<string, mixed>> */
    protected array $pendingLogs = [];
    /** @var array<int, array<string, mixed>> */
    protected array $pendingErrors = [];

    public function __construct(array $config = [])
    {
        $this->projectId = (string) ($config['project_id'] ?? 'default');
        $this->environmentId = (string) ($config['environment_id'] ?? 'local');
        $this->enabled = (bool) ($config['enabled'] ?? true);

        $endpoint = (string) ($config['endpoint'] ?? 'http://127.0.0.1:8765');
        $token = isset($config['token']) ? (string) $config['token'] : null;

        $this->sanitizer = $config['sanitizer'] ?? new Sanitizer();
        $this->transport = $config['transport'] ?? new HttpTransport($endpoint, $token);

        $traceparent = $_SERVER['HTTP_TRACEPARENT'] ?? null;
        $this->tracer = new Tracer($traceparent);

        if (!empty($config['collectors']['errors'] ?? true)) {
            $this->registerCollector(new ErrorCollector());
        }
    }

    public static function init(array $config = []): self
    {
        if (self::$instance === null) {
            self::$instance = new self($config);
        }
        return self::$instance;
    }

    public static function getInstance(): ?self
    {
        return self::$instance;
    }

    public static function getSanitizer(): SanitizerInterface
    {
        return self::$instance ? self::$instance->sanitizer : new Sanitizer();
    }

    public static function getTracer(): Tracer
    {
        if (self::$instance === null) {
            self::init();
        }
        return self::$instance->tracer;
    }

    public function registerCollector(CollectorInterface $collector): void
    {
        $this->collectors[$collector->getName()] = $collector;
        $collector->register();
    }

    public static function recordQuery(array $query): void
    {
        if (self::$instance && self::$instance->enabled) {
            $query['trace_id'] = self::$instance->tracer->getTraceId();
            $query['sql_template'] = self::$instance->sanitizer->sanitize($query['sql_template'] ?? '');
            $query['bindings_masked_json'] = json_encode(self::$instance->sanitizer->sanitize($query['bindings'] ?? []));
            self::$instance->pendingQueries[] = $query;
        }
    }

    public static function recordLog(string $level, string $message, array $context = []): void
    {
        if (self::$instance && self::$instance->enabled) {
            self::$instance->pendingLogs[] = [
                'project_id' => self::$instance->projectId,
                'trace_id' => self::$instance->tracer->getTraceId(),
                'level' => $level,
                'channel' => 'application',
                'message_masked' => self::$instance->sanitizer->sanitize($message),
                'context_json' => json_encode(self::$instance->sanitizer->sanitize($context)),
                'timestamp' => date('c'),
            ];
        }
    }

    public static function recordError(array $error): void
    {
        if (self::$instance && self::$instance->enabled) {
            $error['project_id'] = self::$instance->projectId;
            self::$instance->pendingErrors[] = $error;
        }
    }

    public static function flush(): void
    {
        if (self::$instance === null || !self::$instance->enabled) {
            return;
        }

        $spansData = [];
        foreach (self::$instance->tracer->getSpans() as $span) {
            $spansData[] = $span->toArray();
        }

        $payload = [
            'project_id' => self::$instance->projectId,
            'trace' => [
                'project_id' => self::$instance->projectId,
                'environment_id' => self::$instance->environmentId,
                'trace_id' => self::$instance->tracer->getTraceId(),
                'route' => $_SERVER['REQUEST_URI'] ?? 'cli',
                'service_name' => 'php-app',
                'status' => http_response_code() ?: 200,
                'started_at' => date('c'),
                'duration_us' => 0,
            ],
            'spans' => $spansData,
            'queries' => self::$instance->pendingQueries,
            'logs' => self::$instance->pendingLogs,
            'errors' => self::$instance->pendingErrors,
        ];

        self::$instance->transport->send($payload);
    }
}
