#!/usr/bin/env bash
# Start the render service (`pnpm serve`) in the background on 127.0.0.1:${PORT:-8787}.
#
#   scripts/start.sh            then scripts/stop.sh
#
# The bearer token is generated once into .env.local (git-ignored) and printed, so it can be
# pasted into a client's credential. Log and pid: out/serve.log, out/serve.pid.
set -euo pipefail
set -m # own process group, so stop.sh can kill the whole tree

cd "$(dirname "$0")/.."
PORT=${PORT:-8787}
mkdir -p out

if lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "Port $PORT is already in use — not starting." >&2
  exit 1
fi

if ! grep -q '^STICKSTAGE_API_TOKEN=' .env.local 2>/dev/null; then
  echo "STICKSTAGE_API_TOKEN=$(openssl rand -hex 24)" >>.env.local
  echo "Generated a token in .env.local"
fi
token=$(grep '^STICKSTAGE_API_TOKEN=' .env.local | tail -1 | cut -d= -f2-)

STICKSTAGE_API_TOKEN=$token PORT=$PORT nohup pnpm serve >out/serve.log 2>&1 &
echo $! >out/serve.pid

for _ in $(seq 90); do
  if curl -fsS -o /dev/null "http://127.0.0.1:$PORT/healthz" 2>/dev/null; then
    echo "StickStage on http://127.0.0.1:$PORT  (log: out/serve.log)"
    echo "Token: $token"
    exit 0
  fi
  sleep 1
done
echo "No answer on :$PORT after 90s — see out/serve.log" >&2
exit 1
