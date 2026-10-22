<?php

declare(strict_types=1);

namespace Zoventra\DebugStudio\Contracts;

interface SanitizerInterface
{
    /**
     * Clean and redact sensitive keys, tokens, cookies, and database parameters.
     *
     * @param mixed $data
     * @return mixed
     */
    public function sanitize(mixed $data): mixed;

    /**
     * Specifically mask headers like Authorization, Cookie, and Set-Cookie.
     *
     * @param array<string, string|array<string>> $headers
     * @return array<string, string>
     */
    public function sanitizeHeaders(array $headers): array;
}
