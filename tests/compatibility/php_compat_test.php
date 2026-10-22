<?php

declare(strict_types=1);

namespace Zoventra\DebugStudio\Tests;

use PHPUnit\Framework\TestCase;
use Zoventra\DebugStudio\Sanitizer;
use Zoventra\DebugStudio\Tracer;

class PhpCompatTest extends TestCase
{
    public function testSanitizerRedactsSensitiveHeaders(): void
    {
        $sanitizer = new Sanitizer();
        $headers = [
            'Authorization' => 'Bearer secret-jwt-token-12345',
            'Content-Type' => 'application/json',
            'Cookie' => 'laravel_session=abcdef123456',
        ];

        $sanitized = $sanitizer->sanitizeHeaders($headers);

        $this->assertEquals('***REDACTED***', $sanitized['Authorization']);
        $this->assertEquals('***REDACTED***', $sanitized['Cookie']);
        $this->assertEquals('application/json', $sanitized['Content-Type']);
    }

    public function testTracerGeneratesW3cTraceparent(): void
    {
        $tracer = new Tracer();
        $header = $tracer->getTraceparentHeader();

        $this->assertMatchesRegularExpression('/^00-[a-f0-9]{32}-[a-f0-9]{16}-01$/', $header);
    }
}
