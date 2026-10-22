<?php

return [
    /*
    |--------------------------------------------------------------------------
    | PHP Debug Studio Master Toggle
    |--------------------------------------------------------------------------
    | Enable or disable all telemetry capture. Defaults to true in local/testing.
    */
    'enabled' => env('DEBUG_STUDIO_ENABLED', true),

    /*
    |--------------------------------------------------------------------------
    | Project & Environment Identification
    |--------------------------------------------------------------------------
    | Matches the project and environment IDs configured in the Local Daemon.
    */
    'project_id' => env('DEBUG_STUDIO_PROJECT_ID', 'default'),
    'environment_id' => env('DEBUG_STUDIO_ENVIRONMENT_ID', 'local'),

    /*
    |--------------------------------------------------------------------------
    | Local Daemon Ingest Endpoint & Scoped Token
    |--------------------------------------------------------------------------
    */
    'endpoint' => env('DEBUG_STUDIO_ENDPOINT', 'http://127.0.0.1:8765'),
    'token' => env('DEBUG_STUDIO_TOKEN', null),

    /*
    |--------------------------------------------------------------------------
    | Collectors Configuration
    |--------------------------------------------------------------------------
    */
    'collectors' => [
        'queries'    => env('DEBUG_STUDIO_CAPTURE_SQL', true),
        'requests'   => env('DEBUG_STUDIO_CAPTURE_REQUESTS', true),
        'exceptions' => env('DEBUG_STUDIO_CAPTURE_EXCEPTIONS', true),
        'jobs'       => env('DEBUG_STUDIO_CAPTURE_JOBS', true),
    ],

    /*
    |--------------------------------------------------------------------------
    | Sensitive Keys & Parameter Redaction
    |--------------------------------------------------------------------------
    */
    'redaction' => [
        'masked_keys' => [
            'password',
            'secret',
            'token',
            'authorization',
            'api_key',
            'cookie',
        ],
    ],
];
