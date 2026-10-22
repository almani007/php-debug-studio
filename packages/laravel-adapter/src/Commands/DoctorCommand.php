<?php

declare(strict_types=1);

namespace Zoventra\DebugStudio\Laravel\Commands;

use Illuminate\Console\Command;

class DoctorCommand extends Command
{
    protected $signature = 'debug-studio:doctor';
    protected $description = 'Verify PHP Debug Studio daemon connectivity and Xdebug status';

    public function handle(): int
    {
        $this->info('PHP Debug Studio Doctor Diagnostic');
        $this->line('-----------------------------------');

        // 1. PHP Version
        $phpVersion = PHP_VERSION;
        $this->line(sprintf(' PHP Version: <fg=green>%s</>', $phpVersion));

        // 2. Xdebug Status
        $xdebugInstalled = extension_loaded('xdebug');
        if ($xdebugInstalled) {
            $mode = ini_get('xdebug.mode');
            $this->line(sprintf(' Xdebug 3.x: <fg=green>Installed</> (mode: <fg=yellow>%s</>)', $mode ?: 'default'));
        } else {
            $this->line(' Xdebug: <fg=yellow>Not loaded</> (Step debugging will be inactive)');
        }

        // 3. Local Daemon Connectivity
        $endpoint = config('debug-studio.endpoint', 'http://127.0.0.1:8765');
        $this->line(sprintf(' Checking daemon endpoint: <fg=cyan>%s/v1/health</>...', $endpoint));

        $ctx = stream_context_create([
            'http' => ['timeout' => 2.0, 'ignore_errors' => true],
        ]);
        $response = @file_get_contents($endpoint . '/v1/health', false, $ctx);

        if ($response !== false) {
            $data = json_decode($response, true);
            $this->line(' Local Daemon: <fg=green>Connected & Active</>');
            if (isset($data['data']['version'])) {
                $this->line(sprintf(' Daemon Version: <fg=green>%s</>', $data['data']['version']));
            }
        } else {
            $this->line(' Local Daemon: <fg=red>Offline or Unreachable</>');
            $this->line(' Tip: Start the daemon with <fg=yellow>debug-studio daemon</> or launch the desktop application.');
        }

        $this->newLine();
        return Command::SUCCESS;
    }
}
