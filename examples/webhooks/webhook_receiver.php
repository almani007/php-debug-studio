<?php

declare(strict_types=1);

/**
 * Webhook Receiver Sample for PHP Debug Studio
 * Demonstrates constant-time HMAC SHA-256 signature verification and trace correlation.
 */

$secret = getenv('WEBHOOK_SECRET') ?: 'whsec_sample_secret_key_123';
$payload = file_get_contents('php://input');
$signatureHeader = $_SERVER['HTTP_X_SIGNATURE_SHA256'] ?? $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';

// Constant-time signature verification
$expectedSignature = hash_hmac('sha256', $payload, $secret);
$calculatedSig = str_starts_with($signatureHeader, 'sha256=')
    ? substr($signatureHeader, 7)
    : $signatureHeader;

if (!hash_equals($expectedSignature, $calculatedSig)) {
    http_response_code(401);
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid webhook signature.'
    ]);
    exit;
}

$eventData = json_decode($payload, true);
$eventType = $_SERVER['HTTP_X_EVENT_TYPE'] ?? 'unknown.event';

// Process webhook event
http_response_code(200);
header('Content-Type: application/json');
echo json_encode([
    'status' => 'acknowledged',
    'event' => $eventType,
    'received_at' => date('c'),
]);
