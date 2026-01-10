# OCL MCP Client Bundle

This repository bundles the OCL Model Context Protocol (MCP) server together with a lightweight FastAPI-based client UI. The `entrypoint.sh` script, Dockerfile, and docker-compose configuration make it easy to launch the server, web UI, and any configured LLM provider in one process or inside a container.

## Repository layout

- `mcp-server/` – The installable `ocl_mcp` Python package that implements the MCP server, includes API tooling, and has its own documentation and tests.
- `mcp-client/` – A FastAPI app that mounts static assets, renders the chat/help/config templates, and exposes `/chat`, `/help`, and `/config` while forwarding environment defaults to the UI.
- `requirements.txt` – Install-time dependency list that pulls in the server package plus FastAPI, Jinja2, and `uvicorn`.
- `Dockerfile` – Multi-stage image that builds the dependencies, installs them into `/usr/local`, and runs `entrypoint.sh`.
- `docker-compose.yml` – Convenience service that builds the single image, wires ports, and healthchecks the UI endpoint.
- `entrypoint.sh` – Starts the MCP server (unless disabled) and the UI (via Uvicorn), streams logs to `mcp_server.log`, and traps signals to shut both down cleanly.

## Prerequisites

- Python 3.10+ (3.12 is used inside the Docker image) with access to the filesystem where the repo lives.
- An optional OCL API token when you need access to private or organization-owned repositories.
- Optional LLM provider credentials (for example, Anthropic) if you plan to use the UI’s chat experience.

## Configuration

Create a `.env` file next to `entrypoint.sh` or export the variables directly. The entrypoint exports everything it finds in `.env`, so you can store secrets there.

Important variables:

| Variable | Notes |
|---|---|
| `OCL_TOKEN` | OCL API token (40 characters) for authenticated concept/mapping requests. |
| `OCL_URL` | Override for the OCL base URL; `chat` defaults to production but allows `staging`, `local`, or any custom URL. |
| `LM_PROVIDER` | Sets a default provider in the UI (defaults to `anthropic`). |
| `LM_MODEL` | Preferred model name for the chat session. |
| `LM_TOKEN` | API key for the chosen LLM provider (passed straight to the UI). |
| `UI_HOST` / `UI_PORT` | Host and port for the FastAPI app (default `0.0.0.0:8002`). |
| `RUN_MCP_SERVER` | When `false`, the entrypoint skips starting `python -m ocl_mcp`. Useful during local-only UI development. |
| `MCP_CMD` | Custom command to launch the server (default `python -m ocl_mcp`). |

The client UI also reads `session_defaults` in `routes/frontend.py`, so you can prefill the chat forms with these environment values.

## Local development

1. `python -m venv .venv && source .venv/bin/activate`
2. `pip install -r requirements.txt`
3. Configure `.env` with any tokens, host URLs, or provider defaults you need.
4. Start the MCP server independently to see its logs directly: `python -m ocl_mcp > mcp_server.log 2>&1 &`.
5. In another shell, start the UI: `uvicorn main:app --host 0.0.0.0 --port 8002 --app-dir mcp-client`.
6. Visit `http://localhost:8002/chat`, `http://localhost:8002/help`, or `http://localhost:8002/config` to interact with the UI.

If you prefer a single command that orchestrates both processes, run `./entrypoint.sh` after installing the requirements; it launches the server and UI, tails logs, and gracefully handles shutdown.

## Docker

Build the image with:

```bash
docker build -t ocl-mcp-client .
```

Then launch with:

```bash
docker run --rm -p 8002:8002 \
  -v $(pwd)/.env:/app/.env:ro \
  -e RUN_MCP_SERVER=true \
  ocl-mcp-client
```

For compose:

```bash
docker compose up --build
```

Compose loads `.env`, exposes port `8002`, and uses the healthcheck in `docker-compose.yml` to verify `/help`.

## Logging & troubleshooting

- The server writes to `mcp_server.log` (referenced by `entrypoint.sh`) so you can see OCL API calls and errors.
- Use `UI_HOST`/`UI_PORT` to avoid conflicts with other services.
- Inspect `mcp-client/static/js/app.js` and `templates/` to adjust the UI, or the FastAPI routes in `mcp-client/routes/frontend.py` for behavior changes.

## References

- See `mcp-server/README.md` for detailed MCP server usage, tooling, and available MCP endpoints.
- `mcp-server/docs/` contains auxiliary guides (Claude configuration, examples, etc.).
*** End Patch
