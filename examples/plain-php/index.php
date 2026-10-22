<?php

declare(strict_types=1);

require_once __DIR__ . '/../../packages/php-core/vendor/autoload.php';

use Zoventra\DebugStudio\DebugStudio;

// 1. Initialize PHP Debug Studio
DebugStudio::init([
    'project_id' => 'sample-plain-php',
    'environment_id' => 'local',
    'endpoint' => 'http://127.0.0.1:8765',
    'collectors' => [
        'errors' => true,
        'requests' => true,
        'sql' => true,
    ],
]);

// 2. Start manual span
$tracer = DebugStudio::getTracer();
$span = $tracer->startSpan('process_order', 'internal', [
    'customer_id' => 1042,
    'order_total' => 99.50,
]);

// 3. Record query
DebugStudio::recordQuery([
    'connection_name' => 'mysql_main',
    'sql_template' => 'SELECT * FROM users WHERE email = ? LIMIT 1',
    'bindings' => ['jane@example.com'],
    'duration_us' => 1250,
]);

// 4. Record application log
DebugStudio::recordLog('info', 'Customer verified successfully', ['customer_id' => 1042]);

// 5. End span
$span->end();

// 6. Flush events to daemon
DebugStudio::flush();

echo "PHP Debug Studio plain PHP trace recorded successfully.\n";
