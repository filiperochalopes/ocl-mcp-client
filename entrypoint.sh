#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
export PYTHONPATH="$ROOT/mcp-server/src:$ROOT/mcp-client"

UI_PORT="${UI_PORT:-8002}"
UI_HOST="${UI_HOST:-0.0.0.0}"
MCP_CMD="${MCP_CMD:-python -m ocl_mcp}"
RUN_MCP_SERVER="${RUN_MCP_SERVER:-false}"

MCP_PID=""

if [[ "$RUN_MCP_SERVER" == "true" ]]; then
  echo "==> Starting OCL MCP server (stdio mode) ..."
  cd "$ROOT"
  $MCP_CMD &
  MCP_PID=$!
else
  echo "==> MCP server disabled (RUN_MCP_SERVER=$RUN_MCP_SERVER)."
fi

echo "==> Starting UI at http://${UI_HOST}:${UI_PORT}"
uvicorn main:app --host "$UI_HOST" --port "$UI_PORT" --app-dir "$ROOT/mcp-client" &
UI_PID=$!

cleanup() {
  echo "Shutting down..."
  if [[ -n "$MCP_PID" ]]; then
    kill "$MCP_PID" >/dev/null 2>&1 || true
  fi
  kill "$UI_PID" >/dev/null 2>&1 || true
}

trap cleanup INT TERM

wait_for_any() {
  while true; do
    for pid in "$@"; do
      if [[ -n "$pid" ]] && ! kill -0 "$pid" >/dev/null 2>&1; then
        wait "$pid"
        return $?
      fi
    done
    sleep 1
  done
}

EXIT_CODE=0
if [[ -n "$MCP_PID" ]]; then
  wait_for_any "$MCP_PID" "$UI_PID" || EXIT_CODE=$?
else
  wait "$UI_PID" || EXIT_CODE=$?
fi

cleanup
exit "$EXIT_CODE"
