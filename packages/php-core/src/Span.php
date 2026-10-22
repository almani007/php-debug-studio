<?php

declare(strict_types=1);

namespace Zoventra\DebugStudio;

use Zoventra\DebugStudio\Contracts\SpanInterface;

class Span implements SpanInterface
{
    protected string $id;
    protected string $traceId;
    protected ?string $parentSpanId;
    protected string $name;
    protected string $kind;
    protected float $startTime;
    protected ?float $endTime = null;
    /** @var array<string, mixed> */
    protected array $attributes = [];
    protected string $status = 'unset';

    public function __construct(
        string $traceId,
        string $name,
        ?string $parentSpanId = null,
        string $kind = 'internal',
        array $attributes = []
    ) {
        $this->id = bin2hex(random_bytes(8));
        $this->traceId = $traceId;
        $this->parentSpanId = $parentSpanId;
        $this->name = $name;
        $this->kind = $kind;
        $this->attributes = $attributes;
        $this->startTime = microtime(true);
    }

    public function getTraceId(): string
    {
        return $this->traceId;
    }

    public function getSpanId(): string
    {
        return $this->id;
    }

    public function getParentSpanId(): ?string
    {
        return $this->parentSpanId;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setAttribute(string $key, mixed $value): self
    {
        $this->attributes[$key] = $value;
        return $this;
    }

    public function setStatus(string $status): self
    {
        $this->status = $status;
        return $this;
    }

    public function end(): void
    {
        if ($this->endTime === null) {
            $this->endTime = microtime(true);
        }
    }

    public function getDurationUs(): int
    {
        $end = $this->endTime ?? microtime(true);
        return (int) round(($end - $this->startTime) * 1_000_000);
    }

    public function toArray(): array
    {
        return [
            'span_id' => $this->id,
            'trace_id' => $this->traceId,
            'parent_span_id' => $this->parentSpanId,
            'name' => $this->name,
            'kind' => $this->kind,
            'duration_us' => $this->getDurationUs(),
            'attributes_json' => json_encode($this->attributes, JSON_UNESCAPED_SLASHES),
            'status' => $this->status,
        ];
    }
}
