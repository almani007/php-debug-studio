<?php

namespace Zoventra\DebugStudio\Legacy;

class LegacyTracer
{
    protected string $traceId;

    public function __construct(?string $traceparent = null)
    {
        $this->traceId = $this->extractOrGenerateTraceId($traceparent);
    }

    public function getTraceId(): string
    {
        return $this->traceId;
    }

    public function getTraceparentHeader(): string
    {
        $spanId = bin2hex(random_bytes(8));
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
