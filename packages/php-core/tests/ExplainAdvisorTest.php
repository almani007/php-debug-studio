<?php

declare(strict_types=1);

namespace Zoventra\DebugStudio\Tests;

use PHPUnit\Framework\TestCase;
use Zoventra\DebugStudio\Advisor\ExplainAdvisor;

class ExplainAdvisorTest extends TestCase
{
    public function testDetectsFullTableScan(): void
    {
        $advisor = new ExplainAdvisor();
        $row = [
            'id' => 1,
            'select_type' => 'SIMPLE',
            'table' => 'orders',
            'type' => 'ALL',
            'rows' => 12500,
            'Extra' => 'Using where',
        ];

        $findings = $advisor->analyzeRow($row);

        $this->assertCount(1, $findings);
        $this->assertEquals('full_table_scan', $findings[0]['type']);
        $this->assertEquals('critical', $findings[0]['severity']);
        $this->assertStringContainsString('orders', $findings[0]['message']);
    }

    public function testDetectsFilesortAndTemporaryTable(): void
    {
        $advisor = new ExplainAdvisor();
        $row = [
            'id' => 1,
            'table' => 'products',
            'type' => 'ref',
            'rows' => 45,
            'Extra' => 'Using temporary; Using filesort',
        ];

        $findings = $advisor->analyzeRow($row);

        $this->assertCount(2, $findings);
        $types = array_column($findings, 'type');
        $this->assertContains('using_filesort', $types);
        $this->assertContains('using_temporary', $types);
    }
}
