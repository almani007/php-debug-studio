<?php

declare(strict_types=1);

namespace Brixel\DebugStudio\Contracts;

interface FrameworkAdapterInterface
{
    /**
     * Bootstrap framework-specific hooks (routes, SQL, views, jobs).
     */
    public function bootstrap(): void;

    /**
     * Get framework name and detected version.
     */
    public function getFrameworkVersion(): string;
}
