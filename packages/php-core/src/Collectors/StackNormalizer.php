<?php

declare(strict_types=1);

namespace Zoventra\DebugStudio\Collectors;

use Throwable;

class StackNormalizer
{
    /**
     * Normalize exception stack frames for consistent fingerprinting and scrubbed export.
     *
     * @param Throwable $throwable
     * @return array{fingerprint: string, frames: array<int, array<string, mixed>>}
     */
    public static function normalize(Throwable $throwable): array
    {
        $frames = [];
        $fingerprintParts = [
            get_class($throwable),
            self::normalizePath($throwable->getFile()),
            (string) $throwable->getLine(),
        ];

        foreach ($throwable->getTrace() as $trace) {
            $file = isset($trace['file']) ? self::normalizePath((string) $trace['file']) : '[internal]';
            $line = isset($trace['line']) ? (int) $trace['line'] : 0;
            $class = isset($trace['class']) ? (string) $trace['class'] : '';
            $function = isset($trace['function']) ? (string) $trace['function'] : '';

            $frames[] = [
                'file' => $file,
                'line' => $line,
                'class' => $class,
                'function' => $function,
            ];

            // Include top 3 non-vendor frames in fingerprint
            if (count($fingerprintParts) < 6 && !str_contains($file, 'vendor/')) {
                $fingerprintParts[] = sprintf('%s%s%s:%d', $class, $trace['type'] ?? '::', $function, $line);
            }
        }

        $fingerprint = hash('sha256', implode('|', $fingerprintParts));

        return [
            'fingerprint' => $fingerprint,
            'frames' => $frames,
        ];
    }

    /**
     * Strips variable container or host directory prefixes.
     */
    public static function normalizePath(string $filePath): string
    {
        $filePath = str_replace('\\', '/', $filePath);
        $prefixes = [
            '/var/www/html/',
            '/app/',
            '/var/www/',
        ];

        foreach ($prefixes as $p) {
            if (str_starts_with($filePath, $p)) {
                return substr($filePath, strlen($p));
            }
        }

        return $filePath;
    }
}
