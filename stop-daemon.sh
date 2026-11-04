#!/usr/bin/env bash

BINARY="/var/www/php-debug-studio/apps/daemon/debug-studio-daemon"
OLD_BINARY="/var/www/php-debug-studio/apps/daemon/bin/debug-studio-daemon"
PIDS=$(pgrep -f "debug-studio-daemon" || true)

if [ -z "$PIDS" ]; then
    echo "Brixel Debug Studio is not running."
    exit 0
fi

echo "Stopping Brixel Debug Studio (PIDs: $PIDS)..."
kill $PIDS
sleep 1
if pgrep -f "$BINARY" > /dev/null; then
    kill -9 $PIDS 2>/dev/null || true
fi
echo "✓ Brixel Debug Studio stopped."
