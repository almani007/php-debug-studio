<?php

declare(strict_types=1);

namespace Zoventra\DebugStudio\Laravel\Collectors;

use Illuminate\Cache\Events\CacheHit;
use Illuminate\Cache\Events\CacheMissed;
use Illuminate\Cache\Events\KeyForgotten;
use Illuminate\Cache\Events\KeyWritten;
use Illuminate\Contracts\Events\Dispatcher;
use Zoventra\DebugStudio\DebugStudio;

class CacheEventCollector
{
    public function register(Dispatcher $events): void
    {
        $events->listen(CacheHit::class, function (CacheHit $event) {
            DebugStudio::recordLog('debug', sprintf('Cache hit for key: %s', $event->key), [
                'type' => 'cache_hit',
                'key' => $event->key,
                'tags' => $event->tags ?? [],
            ]);
        });

        $events->listen(CacheMissed::class, function (CacheMissed $event) {
            DebugStudio::recordLog('debug', sprintf('Cache miss for key: %s', $event->key), [
                'type' => 'cache_miss',
                'key' => $event->key,
                'tags' => $event->tags ?? [],
            ]);
        });

        $events->listen(KeyWritten::class, function (KeyWritten $event) {
            DebugStudio::recordLog('debug', sprintf('Cache key written: %s (TTL: %s)', $event->key, $event->seconds ?? 'forever'), [
                'type' => 'cache_write',
                'key' => $event->key,
                'seconds' => $event->seconds,
            ]);
        });

        $events->listen(KeyForgotten::class, function (KeyForgotten $event) {
            DebugStudio::recordLog('debug', sprintf('Cache key forgotten: %s', $event->key), [
                'type' => 'cache_forget',
                'key' => $event->key,
            ]);
        });
    }
}
