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
| tavily | `https://metamcp.garza.online/metamcp/tavily/router/mcp` |
| firecrawl | `https://metamcp.garza.online/metamcp/firecrawl/router/mcp` |
| context7 | `https://metamcp.garza.online/metamcp/context7/router/mcp` |
| onepass | `https://metamcp.garza.online/metamcp/onepass/router/mcp` |
| e2b | `https://metamcp.garza.online/metamcp/e2b/router/mcp` |
| mem0 | `https://metamcp.garza.online/metamcp/mem0/router/mcp` |
| tailscale | `https://metamcp.garza.online/metamcp/tailscale/router/mcp` |
| composio | `https://metamcp.garza.online/metamcp/composio/router/mcp` |
| hyperbrowser | `https://metamcp.garza.online/metamcp/hyperbrowser/router/mcp` |
| prompts-chat | `https://metamcp.garza.online/metamcp/prompts-chat/router/mcp` |

OpenAPI equivalents follow the same namespace pattern:

- OpenAPI schema: `https://metamcp.garza.online/metamcp/<brand>/router/api/openapi.json`

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
- Do not route browser automation through MetaMCP `hyperbrowser` right now: catalog discovery may work, but execution can return `Unknown tool` for `hyperbrowser__*`. Use `firecrawl`/`tavily` when sufficient, or connect to Hyperbrowser MCP directly outside MetaMCP until router config is fixed.
- Treat aggregate `Default` and broad routers as fallback only when brand-specific routing cannot satisfy the request.

Known unreliable or environment-bound tools:

- Aggregate `Default` can include slow/offline upstreams and may return retryable discovery timeouts.
- `beeper-local` and `beeper-oakhost` currently expose zero/unknown tools or depend on local network tunnels.
- `hyperbrowser` through MetaMCP is currently unreliable for execution despite catalog discovery.
- `prompts-chat` may time out from the MetaMCP VM; try it first for substantial work, but do not let it block urgent tasks.
- Endpoints that reference oakhost, `100.121.182.67`, local Beeper, or Proton Bridge services may fail from cloud-hosted agents unless the relevant Tailscale tunnel is reachable.
- Direct downstream prefixed tool calls through a router, unauthenticated public endpoints, query-string API keys, and Streamable HTTP probes via plain `GET` are easy to misuse.

## Streamable HTTP notes

- Streamable HTTP MCP uses POST and server-sent event style streaming. A plain browser/curl `GET` to `/mcp` may return `404`; that is expected and does not prove the endpoint is down.
- Send `X-API-Key: ${METAMCP_API_KEY}` on every public MetaMCP request unless a local/private endpoint explicitly says otherwise.
- Use dedicated brand endpoints for normal work; avoid the aggregate `Default` endpoint unless routing requires it.
