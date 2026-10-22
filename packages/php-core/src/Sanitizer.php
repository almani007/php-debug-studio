<?php

declare(strict_types=1);

namespace Zoventra\DebugStudio;

use Zoventra\DebugStudio\Contracts\SanitizerInterface;

class Sanitizer implements SanitizerInterface
{
    /**
     * @var array<string>
     */
    protected array $maskedKeys = [
        'password',
        'passwd',
        'secret',
        'token',
        'api_key',
        'apikey',
        'access_token',
        'refresh_token',
        'authorization',
        'cookie',
        'set-cookie',
        'xsrf-token',
        'x-csrf-token',
        'private_key',
        'credit_card',
        'cvv',
        'ssn',
    ];

    public function __construct(array $customMaskedKeys = [])
    {
        $this->maskedKeys = array_unique(array_merge($this->maskedKeys, $customMaskedKeys));
    }

    public function sanitize(mixed $data): mixed
    {
        if (is_array($data)) {
            $cleaned = [];
            foreach ($data as $key => $val) {
                if (is_string($key) && $this->shouldMaskKey($key)) {
                    $cleaned[$key] = '***REDACTED***';
                } else {
                    $cleaned[$key] = $this->sanitize($val);
                }
            }
            return $cleaned;
        }

        if (is_string($data)) {
            return $this->maskStringPatterns($data);
        }

        return $data;
    }

    public function sanitizeHeaders(array $headers): array
    {
        $sanitized = [];
        foreach ($headers as $key => $value) {
            $normalizedKey = strtolower((string) $key);
            $strVal = is_array($value) ? implode(', ', $value) : (string) $value;

            if ($this->shouldMaskKey($normalizedKey)) {
                $sanitized[$key] = '***REDACTED***';
            } else {
                $sanitized[$key] = $this->maskStringPatterns($strVal);
            }
        }
        return $sanitized;
    }

    protected function shouldMaskKey(string $key): bool
    {
        $lower = strtolower($key);
        foreach ($this->maskedKeys as $masked) {
            if (str_contains($lower, $masked)) {
                return true;
            }
        }
        return false;
    }

    protected function maskStringPatterns(string $value): string
    {
        // Redact Bearer tokens
        $value = preg_replace('/Bearer\s+[a-zA-Z0-9_\-\.]+/i', 'Bearer ***REDACTED***', $value);
        return $value ?? '';
    }
}
