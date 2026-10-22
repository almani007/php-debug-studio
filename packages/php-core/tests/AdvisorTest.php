<?php

declare(strict_types=1);

namespace Zoventra\DebugStudio\Tests;

use PHPUnit\Framework\TestCase;
use Zoventra\DebugStudio\Advisor\NPlusOneDetector;
use Zoventra\DebugStudio\Advisor\QueryFingerprint;

class AdvisorTest extends TestCase
{
    public function testQueryFingerprintNormalizesParameters(): void
    {
        $sql1 = "SELECT * FROM users WHERE id = 42 AND status = 'active'";
        $sql2 = "SELECT * FROM users WHERE id = 999 AND status = 'pending'";

        $fp1 = QueryFingerprint::create($sql1);
        $fp2 = QueryFingerprint::create($sql2);

        $this->assertEquals($fp1, $fp2);
        $this->assertEquals("SELECT * FROM USERS WHERE ID = ? AND STATUS = ?", $fp1);
    }

    public function testNPlusOneDetectionFlagsRepeatedQueries(): void
    {
        $detector = new NPlusOneDetector(3);

        $detector->record(['sql_template' => 'SELECT * FROM comments WHERE post_id = 1', 'duration_us' => 100]);
        $detector->record(['sql_template' => 'SELECT * FROM comments WHERE post_id = 2', 'duration_us' => 120]);
        $this->assertCount(0, $detector->detect());

        $detector->record(['sql_template' => 'SELECT * FROM comments WHERE post_id = 3', 'duration_us' => 110]);
        $findings = $detector->detect();

        $this->assertCount(1, $findings);
        $this->assertEquals('n_plus_one_query', $findings[0]['type']);
        $this->assertEquals(3, $findings[0]['count']);
        $this->assertEquals(330, $findings[0]['total_duration_us']);
    }
}
