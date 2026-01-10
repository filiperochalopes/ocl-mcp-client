"""FastAPI app for the OCL MCP client UI."""

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from routes import frontend
from web_config import STATIC_DIR

app = FastAPI(title="OCL MCP Client", version="0.1.0")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

app.include_router(frontend)
