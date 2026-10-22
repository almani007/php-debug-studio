<?php

namespace Zoventra\DebugStudio\Legacy;

class LegacySanitizer
{
    /** @var array<string> */
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
    ];

    public function sanitize($data)
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
            return preg_replace('/Bearer\s+[a-zA-Z0-9_\-\.]+/i', 'Bearer ***REDACTED***', $data);
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
                $sanitized[$key] = $strVal;
            }
        }
        return $sanitized;
    }

    protected function shouldMaskKey(string $key): bool
    {
        $lower = strtolower($key);
        foreach ($this->maskedKeys as $masked) {
            if (strpos($lower, $masked) !== false) {
                return true;
            }
        }
        return false;
    }
}
