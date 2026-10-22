<?php

declare(strict_types=1);

namespace Zoventra\DebugStudio\Laravel;

use Illuminate\Contracts\Http\Kernel;
use Illuminate\Database\Events\QueryExecuted;
use Illuminate\Queue\Events\JobFailed;
use Illuminate\Queue\Events\JobProcessing;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\ServiceProvider;
use Zoventra\DebugStudio\DebugStudio;
use Zoventra\DebugStudio\Laravel\Commands\DoctorCommand;
use Zoventra\DebugStudio\Laravel\Commands\InstallCommand;
use Zoventra\DebugStudio\Laravel\Http\Middleware\DebugStudioMiddleware;

class DebugStudioServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__ . '/../config/debug-studio.php', 'debug-studio');

        $this->app->singleton(DebugStudio::class, function ($app) {
            $config = $app['config']->get('debug-studio', []);
            return DebugStudio::init([
                'project_id' => $config['project_id'] ?? 'default',
                'environment_id' => $config['environment_id'] ?? 'local',
                'enabled' => $config['enabled'] ?? true,
                'endpoint' => $config['endpoint'] ?? 'http://127.0.0.1:8765',
                'token' => $config['token'] ?? null,
                'collectors' => $config['collectors'] ?? [],
            ]);
        });
    }

    public function boot(): void
    {
        if ($this->app->runningInConsole()) {
            $this->publishes([
                __DIR__ . '/../config/debug-studio.php' => config_path('debug-studio.php'),
            ], 'config');

            $this->commands([
                InstallCommand::class,
                DoctorCommand::class,
            ]);
        }

        if (!config('debug-studio.enabled', true)) {
            return;
        }

        // Initialize core singleton
        $this->app->make(DebugStudio::class);

        // Register HTTP Middleware
        $kernel = $this->app->make(Kernel::class);
        $kernel->prependMiddleware(DebugStudioMiddleware::class);

        // Register Database query listener
        $this->registerDatabaseListener();

        // Register Queue listeners
        $this->registerQueueListeners();
    }

    protected function registerDatabaseListener(): void
    {
        if (!config('debug-studio.collectors.queries', true)) {
            return;
        }

        DB::listen(function (QueryExecuted $query) {
            DebugStudio::recordQuery([
                'connection_name' => $query->connectionName,
                'sql_template' => $query->sql,
                'bindings' => $query->bindings,
                'duration_us' => (int) round($query->time * 1000), // ms to us
                'rows_affected' => 0,
            ]);
        });
    }

    protected function registerQueueListeners(): void
    {
        if (!config('debug-studio.collectors.jobs', true)) {
            return;
        }

        Queue::before(function (JobProcessing $event) {
            DebugStudio::recordLog('info', sprintf('Job [%s] processing on queue [%s]', $event->job->resolveName(), $event->job->getQueue()), [
                'job_id' => $event->job->getJobId(),
                'attempts' => $event->job->attempts(),
            ]);
        });

        Queue::failing(function (JobFailed $event) {
            DebugStudio::recordError([
                'fingerprint' => md5(sprintf('job:%s:%s', $event->job->resolveName(), $event->exception->getMessage())),
                'class' => get_class($event->exception),
                'message_masked' => $event->exception->getMessage(),
                'severity' => 'critical',
                'first_seen' => date('c'),
                'last_seen' => date('c'),
                'count' => 1,
                'state' => 'unresolved',
            ]);
        });
    }
}
