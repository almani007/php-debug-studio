<?php

declare(strict_types=1);

namespace Zoventra\DebugStudio\Contracts;

interface TransportInterface
{
    /**
     * Send a batch of captured events to the local daemon.
     *
     * @param array<string, mixed> $payload
     * @return bool
     */
    public function send(array $payload): bool;

    /**
     * Flush all queued events.
     */
    public function flush(): void;
}
