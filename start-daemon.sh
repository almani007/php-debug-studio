#!/usr/bin/env bash
set -e

PORT="${DEBUG_STUDIO_PORT:-8765}"
WEB_DIST="${DEBUG_STUDIO_WEB_DIST:-/var/www/php-debug-studio/apps/web/dist}"
DB_PATH="${DEBUG_STUDIO_DB_PATH:-/var/www/php-debug-studio/debug_studio.sqlite}"
LOG_FILE="/var/www/php-debug-studio/daemon.log"
BINARY="/var/www/php-debug-studio/apps/daemon/debug-studio-daemon"

# Check if already running
if pgrep -f "$BINARY" > /dev/null; then
    echo "Brixel Debug Studio is already running (PID: $(pgrep -f "$BINARY"))."
    exit 0
fi

echo "Starting Brixel Debug Studio on http://0.0.0.0:$PORT..."
setsid env DEBUG_STUDIO_PORT="$PORT" \
       DEBUG_STUDIO_WEB_DIST="$WEB_DIST" \
       DEBUG_STUDIO_DB_PATH="$DB_PATH" \
       "$BINARY" > "$LOG_FILE" 2>&1 &

sleep 1
if pgrep -f "$BINARY" > /dev/null; then
    echo "✓ Brixel Debug Studio running successfully (PID: $(pgrep -f "$BINARY"))."
    echo "✓ Web UI: http://localhost:$PORT"
    echo "✓ Logs: $LOG_FILE"
else
    echo "✗ Failed to start Brixel Debug Studio. Check $LOG_FILE"
    exit 1
fi
