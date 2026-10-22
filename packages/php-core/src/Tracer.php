<?php

declare(strict_types=1);

namespace Zoventra\DebugStudio;

class Tracer
{
    protected string $traceId;
    /** @var Span[] */
    protected array $spans = [];
    /** @var Span[] */
    protected array $activeStack = [];

    public function __construct(?string $traceparent = null)
    {
        $this->traceId = $this->extractOrGenerateTraceId($traceparent);
    }

    public function getTraceId(): string
    {
        return $this->traceId;
    }

    public function startSpan(string $name, string $kind = 'internal', array $attributes = []): Span
    {
        $parentSpan = !empty($this->activeStack) ? end($this->activeStack) : null;
        $parentSpanId = $parentSpan ? $parentSpan->getSpanId() : null;

        $span = new Span($this->traceId, $name, $parentSpanId, $kind, $attributes);
        $this->activeStack[] = $span;
        $this->spans[] = $span;

        return $span;
    }

    public function endCurrentSpan(): ?Span
    {
        if (empty($this->activeStack)) {
            return null;
        }

        $span = array_pop($this->activeStack);
        $span->end();
        return $span;
    }

    /**
     * @return Span[]
     */
    public function getSpans(): array
    {
        return $this->spans;
    }

    public function getTraceparentHeader(): string
    {
        $currentSpan = !empty($this->activeStack) ? end($this->activeStack) : null;
        $spanId = $currentSpan ? $currentSpan->getSpanId() : bin2hex(random_bytes(8));
        return sprintf('00-%s-%s-01', $this->traceId, $spanId);
    }

    protected function extractOrGenerateTraceId(?string $traceparent): string
    {
        if ($traceparent && preg_match('/^00-([a-f0-9]{32})-([a-f0-9]{16})-([a-f0-9]{2})$/i', trim($traceparent), $matches)) {
            return strtolower($matches[1]);
        }
        return bin2hex(random_bytes(16));
    }
}
