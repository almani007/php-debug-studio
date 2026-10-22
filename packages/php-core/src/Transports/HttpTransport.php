<?php

declare(strict_types=1);

namespace Zoventra\DebugStudio\Transports;

use Zoventra\DebugStudio\Contracts\TransportInterface;

class HttpTransport implements TransportInterface
{
    protected string $endpoint;
    protected ?string $token;
    protected float $timeoutSeconds;
    /** @var array<int, array<string, mixed>> */
    protected array $buffer = [];
    protected int $maxBufferSize;

    public function __construct(string $endpoint = 'http://127.0.0.1:8765', ?string $token = null, float $timeoutSeconds = 1.0, int $maxBufferSize = 500)
    {
        $this->endpoint = rtrim($endpoint, '/');
        $this->token = $token;
        $this->timeoutSeconds = $timeoutSeconds;
        $this->maxBufferSize = $maxBufferSize;
    }

    public function queue(array $event): void
    {
        if (count($this->buffer) < $this->maxBufferSize) {
            $this->buffer[] = $event;
        }
    }

    public function send(array $payload): bool
    {
        $url = $this->endpoint . '/v1/events/ingest';
        $jsonData = json_encode($payload, JSON_UNESCAPED_SLASHES);

        if ($jsonData === false) {
            return false;
        }

        $headers = [
            'Content-Type: application/json',
            'User-Agent: PHP-Debug-Studio-SDK/1.0',
        ];
        if ($this->token) {
            $headers[] = 'Authorization: Bearer ' . $this->token;
        }

        $ctx = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => implode("\r\n", $headers),
                'content' => $jsonData,
                'timeout' => $this->timeoutSeconds,
                'ignore_errors' => true,
            ],
        ]);

        // Fail-open: suppress errors if daemon is offline
        $result = @file_get_contents($url, false, $ctx);
        return $result !== false;
    }

    public function flush(): void
    {
        if (empty($this->buffer)) {
            return;
        }

        $events = $this->buffer;
        $this->buffer = [];

        foreach ($events as $event) {
            $this->send($event);
        }
    }
}
