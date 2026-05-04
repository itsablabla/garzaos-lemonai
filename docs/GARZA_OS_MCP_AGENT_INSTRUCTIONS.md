# GARZA OS MCP Agent Instructions

Use MetaMCP as the primary MCP entrypoint for GARZA OS work. Prefer dedicated brand router endpoints over the aggregate `Default` endpoint so schemas stay small and failures are isolated.

## Auth

Public MetaMCP endpoints require API-key auth:

```http
X-API-Key: ${METAMCP_API_KEY}
```

Load `METAMCP_API_KEY` from the local runtime environment or secret manager. Never hard-code or commit the raw API key. In checked-in examples use `${METAMCP_API_KEY}` or `<METAMCP_API_KEY>` only.

## Dedicated Streamable HTTP endpoints

Use these dedicated brand endpoints before falling back to aggregate `Default`:

| Brand | Streamable HTTP URL |
| --- | --- |
| tavily | `https://metamcp.garzahive.com/metamcp/tavily/mcp` |
| firecrawl | `https://metamcp.garzahive.com/metamcp/firecrawl/mcp` |
| context7 | `https://metamcp.garzahive.com/metamcp/context7/mcp` |
| onepass | `https://metamcp.garzahive.com/metamcp/onepass/mcp` |
| e2b | `https://metamcp.garzahive.com/metamcp/e2b/mcp` |
| mem0 | `https://metamcp.garzahive.com/metamcp/mem0/mcp` |
| tailscale | `https://metamcp.garzahive.com/metamcp/tailscale/mcp` |
| composio | `https://metamcp.garzahive.com/metamcp/composio/mcp` |
| hyperbrowser | `https://metamcp.garzahive.com/metamcp/hyperbrowser/mcp` |
| prompts-chat | `https://metamcp.garzahive.com/metamcp/prompts-chat/mcp` |

OpenAPI equivalents follow the same namespace pattern:

- OpenAPI base: `https://metamcp.garzahive.com/metamcp/<brand>/api`
- OpenAPI schema: `https://metamcp.garzahive.com/metamcp/<brand>/api/openapi.json`

## Request preparation workflow

1. Query `prompts-chat` first for reusable prompts, skills, or known workflows relevant to the task.
2. If `prompts-chat` is unavailable or the task is urgent, proceed without blocking and use the best matching dedicated brand endpoint.
3. Use `context7` for library/API documentation before relying on stale package knowledge.
4. Use web/search brands (`tavily`, `firecrawl`) for current information and page extraction.

## Router invocation pattern

Each dedicated brand router exposes convenience tools such as:

- `router`
- `search_brands`
- `get_brand_tools`
- `get_tool_schema`
- `execute_tool`

Do actual downstream work through `execute_tool` with this shape:

```json
{
  "brand": "tavily",
  "tool": "tavily_search",
  "arguments": {
    "query": "example"
  }
}
```

Do not call downstream prefixed tools directly as router tool names. Discover with `search_brands`, inspect with `get_brand_tools`/`get_tool_schema`, then invoke with `execute_tool`.

## Tool selection policy

- Prefer the narrowest dedicated brand endpoint that can complete the task.
- Prefer read-only/search tools before write/action tools.
- Prefer `tavily` for fresh search and concise source discovery.
- Prefer `firecrawl` for scraping, crawling, mapping, and structured extraction from known URLs.
- Prefer `context7` for package docs and implementation examples.
- Prefer `onepass` only for secret lookup workflows; never echo secret values into commits or logs.
- Prefer `e2b` for sandboxed code execution when local repo execution is unsafe or insufficient.
- Prefer `mem0` for durable memory retrieval/storage when task context should persist.
- Prefer `tailscale` for network/device lookup and tailnet operations.
- Prefer `composio` for SaaS integrations.
- Prefer `hyperbrowser` for browser automation and rendered-page extraction.
- Treat aggregate `Default` and broad routers as fallback only when brand-specific routing cannot satisfy the request.

Known unreliable or easy-to-misuse tools: aggregate `Default`, direct downstream prefixed tool calls through a router, unauthenticated public endpoints, query-string API keys, and Streamable HTTP probes via plain `GET`.

## Streamable HTTP notes

- Streamable HTTP MCP uses POST and server-sent event style streaming. A plain browser/curl `GET` to `/mcp` may return `404`; that is expected and does not prove the endpoint is down.
- Send `X-API-Key: ${METAMCP_API_KEY}` on every public MetaMCP request unless a local/private endpoint explicitly says otherwise.
- Use dedicated brand endpoints for normal work; avoid the aggregate `Default` endpoint unless routing requires it.
