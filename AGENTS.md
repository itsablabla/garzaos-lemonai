# GARZA OS MCP Agent Instructions

Agents in this repo should use MetaMCP as the primary MCP entrypoint and keep secrets out of committed files. See @docs/GARZA_OS_MCP_AGENT_INSTRUCTIONS.md for endpoint inventory, auth, routing, and tool-selection policy.

Required runtime secret: set `METAMCP_API_KEY` locally and send it to public MetaMCP endpoints as `X-API-Key: ${METAMCP_API_KEY}`. Never hard-code or commit the raw key.
