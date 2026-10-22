<?php

declare(strict_types=1);

namespace Zoventra\DebugStudio\Contracts;

interface CollectorInterface
{
    /**
     * Start the collector and attach necessary handlers or event listeners.
     */
    public function register(): void;

    /**
     * Unregister the collector.
     */
    public function unregister(): void;

    /**
     * Return a unique identifier for this collector.
     */
    public function getName(): string;
}
