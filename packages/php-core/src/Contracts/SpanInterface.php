<?php

declare(strict_types=1);

namespace Zoventra\DebugStudio\Contracts;

interface SpanInterface
{
    public function getTraceId(): string;
    public function getSpanId(): string;
    public function getParentSpanId(): ?string;
    public function getName(): string;
    public function getDurationUs(): int;
    public function end(): void;

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array;
}
