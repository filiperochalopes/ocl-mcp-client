import os
from fastapi import APIRouter, Request
from fastapi.responses import RedirectResponse
from web_config import templates

router = APIRouter(tags=["frontend"])

@router.get("/")
async def root():
    return RedirectResponse("/chat", status_code=303)

@router.get("/chat")
async def chat_page(request: Request):
    ocl_env = (os.getenv("OCL_URL", "") or "").strip()
    ocl_map = {
        "production": "http://api.openconceptlab.org/",
        "staging": "https://api.staging.openconceptlab.org/",
        "local": "http://api.ocl.localhost",
    }
    if ocl_env in ocl_map:
        ocl_url = ocl_map[ocl_env]
    else:
        ocl_url = ocl_env or ocl_map["production"]

    session_defaults = {
        "provider": os.getenv("LM_PROVIDER", "") or "anthropic",
        "model": os.getenv("LM_MODEL", ""),
        "api_key": os.getenv("LM_TOKEN", ""),
        "ocl_token": os.getenv("OCL_TOKEN", ""),
        "ocl_url": ocl_url,
    }
    return templates.TemplateResponse(
        "chat.html",
        {
            "request": request,
            "session_defaults": session_defaults,
        },
    )

@router.get("/help")
async def help_page(request: Request):
    return templates.TemplateResponse("help.html", {"request": request})

@router.get("/config")
async def config_page(request: Request):
    return templates.TemplateResponse("config.html", {"request": request})
