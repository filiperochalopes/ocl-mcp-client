#!/bin/bash
set -eo pipefail

# Enable verbose logging if DEBUG or LOG_LEVEL is set
if [[ "${LOG_LEVEL:-INFO}" == "DEBUG" ]]; then
    set -x
fi

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log "Starting OCL MCP Container Entrypoint..."
log "Current User: $(whoami)"
log "Workdir: $(pwd)"

# Define paths
ROOT="/app"
export PYTHONPATH="$ROOT/mcp-server/src:$ROOT/mcp-client"

# Validate paths
if [ ! -d "$ROOT/mcp-client" ]; then
    log "ERROR: mcp-client directory not found at $ROOT/mcp-client"
    exit 1
fi

if [ ! -d "$ROOT/mcp-server/src" ]; then
    log "ERROR: mcp-server/src directory not found at $ROOT/mcp-server/src"
    exit 1
fi

# Environment variables for Uvicorn
UI_HOST="${UI_HOST:-0.0.0.0}"
UI_PORT="${UI_PORT:-8002}"

log "Configuration:"
log "  PYTHONPATH: $PYTHONPATH"
log "  UI_HOST: $UI_HOST"
log "  UI_PORT: $UI_PORT"

# Start Uvicorn
log "Starting Uvicorn server..."
exec python -m uvicorn main:app --host "$UI_HOST" --port "$UI_PORT" --app-dir "$ROOT/mcp-client"
