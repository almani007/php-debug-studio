<?php

declare(strict_types=1);

namespace Zoventra\DebugStudio\Loggers;

use Psr\Log\AbstractLogger;
use Psr\Log\LogLevel;
use Stringable;
use Zoventra\DebugStudio\DebugStudio;

class DebugStudioLogger extends AbstractLogger
{
    protected string $channel;

    public function __construct(string $channel = 'app')
    {
        $this->channel = $channel;
    }

    /**
     * Logs with an arbitrary level.
     *
     * @param mixed $level
     * @param string|Stringable $message
     * @param array<string, mixed> $context
     */
    public function log($level, string|Stringable $message, array $context = []): void
    {
        $levelStr = (string) $level;
        $messageStr = (string) $message;

        DebugStudio::recordLog($levelStr, $messageStr, array_merge($context, [
            'logger_channel' => $this->channel,
        ]));
    }
}
