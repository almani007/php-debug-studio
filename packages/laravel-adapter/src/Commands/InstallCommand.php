<?php

declare(strict_types=1);

namespace Zoventra\DebugStudio\Laravel\Commands;

use Illuminate\Console\Command;

class InstallCommand extends Command
{
    protected $signature = 'debug-studio:install';
    protected $description = 'Install and publish configuration for PHP Debug Studio';

    public function handle(): int
    {
        $this->info('Installing PHP Debug Studio Laravel integration (by zoventra)...');

        $this->call('vendor:publish', [
            '--provider' => 'Zoventra\DebugStudio\Laravel\DebugStudioServiceProvider',
            '--tag' => 'config',
        ]);

        $this->newLine();
        $this->line(' <fg=green>✔</> Configuration published to <fg=yellow>config/debug-studio.php</>');
        $this->line(' Next step: run <fg=cyan>php artisan debug-studio:doctor</> to test connectivity.');
        $this->newLine();

        return Command::SUCCESS;
    }
}
