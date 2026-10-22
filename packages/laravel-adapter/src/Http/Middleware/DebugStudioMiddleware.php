<?php

declare(strict_types=1);

namespace Zoventra\DebugStudio\Laravel\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Zoventra\DebugStudio\DebugStudio;

class DebugStudioMiddleware
{
    public function handle(Request $request, Closure $next): Response
    {
        if (!config('debug-studio.enabled', true)) {
            return $next($request);
        }

        $tracer = DebugStudio::getTracer();
        $span = $tracer->startSpan('http_request', 'server', [
            'method' => $request->method(),
            'url' => $request->fullUrl(),
            'ip' => $request->ip(),
        ]);

        /** @var Response $response */
        $response = $next($request);

        $span->setAttribute('status_code', $response->getStatusCode());
        $span->end();

        // Inject traceparent in outgoing response so frontend can correlate
        $response->headers->set('traceparent', $tracer->getTraceparentHeader());
        $response->headers->set('X-Debug-Studio-Trace', $tracer->getTraceId());

        return $response;
    }

    public function terminate(Request $request, Response $response): void
    {
        if (config('debug-studio.enabled', true)) {
            DebugStudio::flush();
        }
    }
}
