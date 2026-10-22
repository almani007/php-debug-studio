#!/usr/bin/env bash

set -euo pipefail

echo "Running PHP Debug Studio Plain PHP Sample..."
php -f "$(dirname "$0")/index.php"
