<?php

declare(strict_types=1);

namespace Zoventra\DebugStudio\Tests;

use Exception;
use PHPUnit\Framework\TestCase;
use Zoventra\DebugStudio\Collectors\StackNormalizer;
use Zoventra\DebugStudio\Profiling\MemorySampler;

class ProfilingAndStackTest extends TestCase
{
    public function testMemorySamplerCapturesMetrics(): void
    {
        $sampler = new MemorySampler();
        $sample = $sampler->sample();

        $this->assertArrayHasKey('current_bytes', $sample);
        $this->assertArrayHasKey('peak_bytes', $sample);
        $this->assertArrayHasKey('delta_bytes', $sample);
        $this->assertGreaterThan(0, $sample['peak_bytes']);

        $formatted = MemorySampler::formatBytes(1048576);
        $this->assertEquals('1.00 MB', $formatted);
    }

    public function testStackNormalizerFingerprintsExceptions(): void
    {
        $ex1 = new Exception('Test error 1');
        $res1 = StackNormalizer::normalize($ex1);

        $this->assertNotEmpty($res1['fingerprint']);
        $this->assertIsArray($res1['frames']);
        $this->assertEquals(64, strlen($res1['fingerprint'])); // SHA-256
    }
}
