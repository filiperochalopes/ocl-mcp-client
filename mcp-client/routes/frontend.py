import os
import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Request, Body
from fastapi.responses import RedirectResponse, JSONResponse
from langchain_anthropic import ChatAnthropic
from langchain_openai import ChatOpenAI
from langchain_core.tools import tool, StructuredTool
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage, ToolMessage

from mcp import types as mcp_types
from web_config import templates
from ocl_mcp.server import OCLMCPServer
from ocl_mcp.tools import (
    search_owners,
    search_repositories,
    get_repository_versions,
    search_concepts,
    search_mappings,
    match_concepts,
    add_or_update_concept_translations,
    list_expansions,
    get_expansion,
    create_mapping,
    cascade,
    suggest_mappings,
    validate_mapping,
    bulk_map_terms,
    save_repository,
    list_servers,
)

router = APIRouter(tags=["frontend"])

# Global server instance cache
_ocl_server_instance: Optional[OCLMCPServer] = None
_tool_guide_cache: Optional[str] = None

def get_ocl_server() -> OCLMCPServer:
    global _ocl_server_instance
    if _ocl_server_instance is None:
        _ocl_server_instance = OCLMCPServer()
    return _ocl_server_instance

def _normalize_owner_type(owner_type: Optional[str]) -> Optional[str]:
    if not owner_type:
        return owner_type
    value = owner_type.strip().lower()
    if value in {"org", "orgs", "organization", "organisation", "organizations", "organisations"}:
        return "orgs"
    if value in {"user", "users"}:
        return "users"
    if value in {"all", "any"}:
        return "all"
    return owner_type

async def _get_tool_guide() -> str:
    global _tool_guide_cache
    if _tool_guide_cache is not None:
        return _tool_guide_cache
    server = get_ocl_server().server
    handler = server.request_handlers.get(mcp_types.ListToolsRequest)
    if not handler:
        _tool_guide_cache = ""
        return _tool_guide_cache
    result = await handler(None)
    root = getattr(result, "root", result)
    tools = getattr(root, "tools", None) or []
    lines: List[str] = [
        "Tool schemas and examples (use exact enums/values from schema):"
    ]
    for tool_def in tools:
        lines.append(f"\nTool: {tool_def.name}")
        if tool_def.description:
            lines.append(f"Description: {tool_def.description}")
        schema = getattr(tool_def, "inputSchema", None) or {}
        if schema:
            lines.append("Schema:")
            lines.append(json.dumps(schema, ensure_ascii=False))
    _tool_guide_cache = "\n".join(lines).strip()
    return _tool_guide_cache

def get_ocl_tools() -> List[StructuredTool]:
    """Create LangChain tools wrapping OCL MCP functions."""
    server = get_ocl_server()
    # For now, default to the default client. 
    # In a more advanced setup, we could dynamically pick the client based on tool args.
    client = server.api_client 

    # Wrapper functions to inject 'client'
    async def _search_owners(query: Optional[str] = None, owner_type: str = "all", limit: int = 20, page: int = 1) -> str:
        """Search for OCL users and organizations."""
        return await search_owners(client, query, _normalize_owner_type(owner_type), limit, page)

    async def _search_repositories(query: Optional[str] = None, owner: Optional[str] = None, owner_type: str = "all", repo_type: str = "all", limit: int = 20, page: int = 1) -> str:
        """Search for OCL repositories (sources and collections)."""
        return await search_repositories(client, query, owner, _normalize_owner_type(owner_type), repo_type, limit, page)

    async def _get_repository_versions(owner_type: str, owner: str, repo_type: str, repo: str, limit: int = 20, page: int = 1) -> str:
        """Get available versions for a specific repository."""
        return await get_repository_versions(client, _normalize_owner_type(owner_type), owner, repo_type, repo, limit, page)

    async def _search_concepts(query: Optional[str] = None, owner_type: Optional[str] = None, owner: Optional[str] = None, repo_type: Optional[str] = None, repo: Optional[str] = None, version: Optional[str] = None, concept_class: Optional[str] = None, datatype: Optional[str] = None, retired: Optional[bool] = None, updated_since: Optional[str] = None, limit: int = 20, page: int = 1, locale_missing: Optional[str] = None) -> str:
        """Search for medical concepts across OCL repositories."""
        return await search_concepts(client, query, _normalize_owner_type(owner_type), owner, repo_type, repo, version, concept_class, datatype, retired, updated_since, limit, page, locale_missing)

    async def _search_mappings(query: Optional[str] = None, owner_type: Optional[str] = None, owner: Optional[str] = None, repo_type: Optional[str] = None, repo: Optional[str] = None, version: Optional[str] = None, map_type: Optional[str] = None, from_source: Optional[str] = None, from_concept: Optional[str] = None, to_source: Optional[str] = None, to_concept: Optional[str] = None, updated_since: Optional[str] = None, limit: int = 20, page: int = 1) -> str:
        """Search for mappings between concepts."""
        return await search_mappings(client, query, _normalize_owner_type(owner_type), owner, repo_type, repo, version, map_type, from_source, from_concept, to_source, to_concept, updated_since, limit, page)

    async def _match_concepts(terms: List[str], target_source: str, limit: int = 5) -> str:
        """Find best matching concepts for given terms."""
        return await match_concepts(client, terms, target_source, limit)

    async def _add_or_update_concept_translations(owner_type: str, owner: str, repo_type: str, repo: str, concept_id: str, translations: List[Dict[str, Any]]) -> str:
        """Add or update translations for a concept."""
        return await add_or_update_concept_translations(client, _normalize_owner_type(owner_type), owner, repo_type, repo, concept_id, translations)

    async def _cascade(owner_type: str, owner: str, repo_type: str, repo: str, concept_id: str, version: Optional[str] = None, map_types: Optional[List[str]] = None, exclude_map_types: Optional[List[str]] = None, return_map_types: Optional[List[str]] = None, method: str = "sourcetoconcepts", cascade_hierarchy: bool = True, cascade_mappings: bool = True, cascade_levels: str = "*", reverse: bool = False, view: str = "flat", omit_if_exists_in: Optional[str] = None, equivalency_map_type: Optional[str] = None) -> str:
        """Execute cascade operation to explore concept relationships."""
        return await cascade(client, _normalize_owner_type(owner_type), owner, repo_type, repo, concept_id, version, map_types, exclude_map_types, return_map_types, method, cascade_hierarchy, cascade_mappings, cascade_levels, reverse, view, omit_if_exists_in, equivalency_map_type)

    async def _list_expansions(owner_type: str, owner: str, collection: str, collection_version: str) -> str:
        """List all expansions for a collection version."""
        return await list_expansions(client, owner_type, owner, collection, collection_version)

    async def _get_expansion(owner_type: str, owner: str, collection: str, collection_version: Optional[str] = None, expansion_id: Optional[str] = None) -> str:
        """Get a specific expansion or the default expansion."""
        return await get_expansion(client, owner_type, owner, collection, collection_version, expansion_id)

    async def _create_mapping(owner_type: str, owner: str, source: str, map_type: str, from_concept_url: Optional[str] = None, from_source_url: Optional[str] = None, from_concept_code: Optional[str] = None, from_concept_name: Optional[str] = None, to_concept_url: Optional[str] = None, to_source_url: Optional[str] = None, to_concept_code: Optional[str] = None, to_concept_name: Optional[str] = None, external_id: Optional[str] = None, retired: bool = False, extras: Optional[Dict] = None) -> str:
        """Create a new mapping between concepts."""
        return await create_mapping(client, _normalize_owner_type(owner_type), owner, source, map_type, from_concept_url, from_source_url, from_concept_code, from_concept_name, to_concept_url, to_source_url, to_concept_code, to_concept_name, external_id, retired, extras)

    async def _suggest_mappings(input_data: str, target_source: str = "CIEL", target_owner: str = "CIEL", max_suggestions: int = 5, confidence_threshold: float = 0.7) -> str:
        """Get AI-powered mapping suggestions."""
        return await suggest_mappings(client, input_data, target_source, target_owner, max_suggestions, confidence_threshold)

    async def _validate_mapping(source_term: str, target_code: str, target_source: str = "CIEL", target_owner: str = "CIEL", return_alternatives: bool = True) -> str:
        """Validate a proposed mapping using semantic similarity."""
        return await validate_mapping(client, source_term, target_code, target_source, target_owner, return_alternatives)

    async def _bulk_map_terms(terms_data: str, target_source: str = "CIEL", target_owner: str = "CIEL", format_type: str = "json", include_confidence: bool = True) -> str:
        """Process multiple terms for mapping in bulk."""
        return await bulk_map_terms(client, terms_data, target_source, target_owner, format_type, include_confidence)

    async def _save_repository(owner_type: str, owner: str, repo_type: str, repo_id: str, name: str, short_code: Optional[str] = None, supported_locales: Optional[List[str]] = None, external_id: Optional[str] = None, full_name: Optional[str] = None, public_access: Optional[str] = None, default_locale: Optional[str] = None, website: Optional[str] = None, description: Optional[str] = None, extras: Optional[Dict[str, Any]] = None, source_type: Optional[str] = None, custom_validation_schema: Optional[str] = None, collection_type: Optional[str] = None, preferred_source: Optional[str] = None) -> str:
        """Create or update a repository."""
        return await save_repository(client, _normalize_owner_type(owner_type), owner, repo_type, repo_id, name, short_code, supported_locales, external_id, full_name, public_access, default_locale, website, description, extras, source_type, custom_validation_schema, collection_type, preferred_source)

    async def _list_servers() -> str:
        """List all available OCL servers."""
        return await list_servers(server.registry)

    # Convert to LangChain StructuredTools
    return [
        tool("search_owners")(_search_owners),
        tool("search_repositories")(_search_repositories),
        tool("get_repository_versions")(_get_repository_versions),
        tool("search_concepts")(_search_concepts),
        tool("search_mappings")(_search_mappings),
        tool("match_concepts")(_match_concepts),
        tool("add_or_update_concept_translations")(_add_or_update_concept_translations),
        tool("cascade")(_cascade),
        tool("list_expansions")(_list_expansions),
        tool("get_expansion")(_get_expansion),
        tool("create_mapping")(_create_mapping),
        tool("suggest_mappings")(_suggest_mappings),
        tool("validate_mapping")(_validate_mapping),
        tool("bulk_map_terms")(_bulk_map_terms),
        tool("save_repository")(_save_repository),
        tool("list_servers")(_list_servers),
    ]

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
    response = templates.TemplateResponse(
        "chat.html",
        {
            "request": request,
            "session_defaults": session_defaults,
        },
    )
    return response

@router.post("/chat/message")
async def chat_message(request: Request, payload: dict = Body(...)):
    user_message = payload.get("message", "")
    history_payload = payload.get("history", []) or []

    tool_guide = await _get_tool_guide()
    system_content = (
        "You are a helpful medical terminology assistant. You have access to OCL (Open Concept Lab) tools "
        "to search for concepts, mappings, and repositories. Use them when the user asks about medical terms."
    )
    if tool_guide:
        system_content = f"{system_content}\n\n{tool_guide}"

    messages = [SystemMessage(content=system_content)]
    for entry in history_payload:
        if not isinstance(entry, dict):
            continue
        role = entry.get("role")
        content = entry.get("content")
        if not isinstance(content, str) or not content.strip():
            continue
        if role == "user":
            messages.append(HumanMessage(content=content))
        elif role == "assistant":
            messages.append(AIMessage(content=content))

    messages.append(HumanMessage(content=user_message))

    # Initialize LLM
    provider = os.getenv("LM_PROVIDER", "anthropic")
    model_name = os.getenv("LM_MODEL")
    api_key = os.getenv("LM_TOKEN")

    if provider == "openai":
        llm = ChatOpenAI(model=model_name or "gpt-4o", api_key=api_key)
    else:
        llm = ChatAnthropic(model=model_name or "claude-3-5-sonnet-20241022", api_key=api_key)

    # Bind tools
    tools = get_ocl_tools()
    llm_with_tools = llm.bind_tools(tools)

    def _normalize_content(content: Any) -> str:
        if isinstance(content, str):
            return content
        if isinstance(content, dict):
            if content.get("type") == "text":
                return str(content.get("text", ""))
            if "text" in content:
                return str(content.get("text", ""))
            return ""
        if isinstance(content, list):
            parts: List[str] = []
            for block in content:
                if isinstance(block, str):
                    parts.append(block)
                elif isinstance(block, dict) and block.get("type") == "text":
                    parts.append(str(block.get("text", "")))
                elif isinstance(block, dict) and "text" in block:
                    parts.append(str(block.get("text", "")))
            return "\n".join([p for p in parts if p])
        return ""

    tool_calls_payload: List[Dict[str, Any]] = []
    events: List[Dict[str, Any]] = []

    def _push_assistant_event(message: Any) -> str:
        content = _normalize_content(getattr(message, "content", message))
        if content:
            events.append({"type": "assistant", "content": content})
        return content

    ai_msg = await llm_with_tools.ainvoke(messages)
    messages.append(ai_msg)
    last_assistant = _push_assistant_event(ai_msg)

    max_tool_loops = 4
    loops = 0
    while ai_msg.tool_calls and loops < max_tool_loops:
        for tool_call in ai_msg.tool_calls:
            tool_name = tool_call["name"]
            tool_args = tool_call["args"]
            events.append({"type": "tool_call", "name": tool_name, "args": tool_args})

            selected_tool = next((t for t in tools if t.name == tool_name), None)
            if selected_tool:
                try:
                    tool_output = await selected_tool.ainvoke(tool_args)
                except Exception as e:
                    tool_output = f"Error executing {tool_name}: {str(e)}"
                tool_output_text = _normalize_content(tool_output)
                tool_calls_payload.append({
                    "name": tool_name,
                    "args": tool_args,
                    "result": tool_output_text,
                })
                events.append({"type": "tool_result", "name": tool_name, "result": tool_output_text})
                messages.append(ToolMessage(content=tool_output_text, tool_call_id=tool_call["id"]))

        ai_msg = await llm_with_tools.ainvoke(messages)
        messages.append(ai_msg)
        content = _push_assistant_event(ai_msg)
        if content:
            last_assistant = content
        loops += 1

    if not last_assistant:
        fallback = "Concluí as chamadas de ferramentas, mas não obtive uma resposta final. Quer que eu continue?"
        events.append({"type": "assistant", "content": fallback})
        last_assistant = fallback

    response = JSONResponse({
        "role": "assistant",
        "content": last_assistant,
        "events": events,
        "tool_calls": tool_calls_payload,
    })
    return response

@router.get("/help")
async def help_page(request: Request):
    return templates.TemplateResponse("help.html", {"request": request})

@router.get("/config")
async def config_page(request: Request):
    return templates.TemplateResponse("config.html", {"request": request})
