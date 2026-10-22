<?php

declare(strict_types=1);

namespace Zoventra\DebugStudio\Collectors;

use Throwable;
use Zoventra\DebugStudio\Contracts\CollectorInterface;
use Zoventra\DebugStudio\DebugStudio;

class ErrorCollector implements CollectorInterface
{
    /** @var callable|null */
    protected $previousErrorHandler = null;
    /** @var callable|null */
    protected $previousExceptionHandler = null;
    protected bool $registered = false;

    public function register(): void
    {
        if ($this->registered) {
            return;
        }

        $this->previousErrorHandler = set_error_handler([$this, 'handleError']);
        $this->previousExceptionHandler = set_exception_handler([$this, 'handleException']);

        register_shutdown_function([$this, 'handleShutdown']);
        $this->registered = true;
    }

    public function unregister(): void
    {
        if (!$this->registered) {
            return;
        }

        restore_error_handler();
        restore_exception_handler();
        $this->registered = false;
    }

    public function getName(): string
    {
        return 'error_collector';
    }

    public function handleError(int $level, string $message, string $file, int $line): bool
    {
        $fingerprint = md5(sprintf('%s:%s:%d', $level, $file, $line));
        $issue = [
            'fingerprint' => $fingerprint,
            'class' => 'PHP Error (' . $level . ')',
            'message_masked' => DebugStudio::getSanitizer()->sanitize($message),
            'severity' => $this->severityToString($level),
            'first_seen' => date('c'),
            'last_seen' => date('c'),
            'count' => 1,
            'state' => 'unresolved',
        ];

        DebugStudio::recordError($issue);

        // Never swallow error: invoke previous handler if present
        if (is_callable($this->previousErrorHandler)) {
            return (bool) call_user_func($this->previousErrorHandler, $level, $message, $file, $line);
        }

        return false;
    }

    public function handleException(Throwable $exception): void
    {
        $fingerprint = md5(sprintf('%s:%s:%d', get_class($exception), $exception->getFile(), $exception->getLine()));
        $issue = [
            'fingerprint' => $fingerprint,
            'class' => get_class($exception),
            'message_masked' => DebugStudio::getSanitizer()->sanitize($exception->getMessage()),
            'severity' => 'critical',
            'first_seen' => date('c'),
            'last_seen' => date('c'),
            'count' => 1,
            'state' => 'unresolved',
        ];

        DebugStudio::recordError($issue);

        // Invoke previous handler if present
        if (is_callable($this->previousExceptionHandler)) {
            call_user_func($this->previousExceptionHandler, $exception);
        }
    }

    public function handleShutdown(): void
    {
        $error = error_get_last();
        if ($error !== null && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
            $this->handleError($error['type'], $error['message'], $error['file'], $error['line']);
        }

        DebugStudio::flush();
    }

    protected function severityToString(int $level): string
    {
        return match ($level) {
            E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR => 'critical',
            E_WARNING, E_USER_WARNING => 'warning',
            E_NOTICE, E_USER_NOTICE => 'notice',
            default => 'info',
        };
    }
}
