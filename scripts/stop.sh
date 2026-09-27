#!/usr/bin/env bash
# Stop the render service started by scripts/start.sh. An interrupted job is re-queued on the
# next start.
set -uo pipefail

cd "$(dirname "$0")/.."
if [ ! -f out/serve.pid ]; then
  echo "Not running (no out/serve.pid)."
  exit 0
fi
pgid=$(cat out/serve.pid)
if kill -0 "$pgid" 2>/dev/null; then
  kill -TERM -- "-$pgid" 2>/dev/null
  for _ in $(seq 10); do kill -0 "$pgid" 2>/dev/null || break; sleep 1; done
  kill -KILL -- "-$pgid" 2>/dev/null
  echo "Stopped StickStage."
else
  echo "Not running (stale pid)."
fi
rm -f out/serve.pid
