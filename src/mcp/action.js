require('module-alias/register');
require('dotenv').config();

const resolveServers = require("@src/mcp/server");

const resolveServer = async (name, context = {}) => {
  const servers = await resolveServers(context);
  const server = servers.find(server => server.name === name);
  return server;
}

const mcp_client = require('@src/mcp/client');

const LIST_TOOLS_NAMES = new Set([
  'list_tools',
  'listtools',
  'tools/list',
  'tools.list',
  'list-tools'
]);

const isListToolsRequest = (name = '') => {
  return LIST_TOOLS_NAMES.has(String(name).toLowerCase());
}

const normalizeTool = (server, tool = {}) => {
  const serverName = server.name;
  const toolName = tool.name;
  const toolId = tool.id ?? `${serverName}__${toolName}`;
  return {
    serverId: tool.serverId ?? server.id,
    serverName: tool.serverName ?? serverName,
    name: toolName,
    id: toolId,
    toolId,
    description: tool.description ?? '',
    inputSchema: tool.inputSchema ?? {}
  };
}

const prepareMetaMcpHeaders = (server = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(server.headers || {})
  };
  const hasApiKeyHeader = Object.keys(headers).some((key) => key.toLowerCase() === 'x-api-key');
  if (server.api_key && !hasApiKeyHeader) {
    headers['X-API-Key'] = server.api_key;
  }
  return headers;
}

const parseMetaMcpContent = (payload = {}) => {
  const text = payload?.content?.find?.((item) => item?.type === 'text')?.text;
  if (!text) {
    return payload;
  }

  try {
    return JSON.parse(text);
  } catch (error) {
    return payload;
  }
}

const listMetaMcpRouterTools = async (server = {}) => {
  const match = String(server.url || '').match(/\/metamcp\/([^/]+)\/router\/mcp\/?$/);
  if (!match) {
    return null;
  }

  const brand = match[1];
  const apiUrl = String(server.url).replace(/\/router\/mcp\/?$/, '/router/api/get_brand_tools');
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: prepareMetaMcpHeaders(server),
    body: JSON.stringify({ brand })
  });

  if (!response.ok) {
    throw new Error(`MetaMCP router API returned ${response.status}`);
  }

  const payload = parseMetaMcpContent(await response.json());
  return (payload.tools || []).map((tool) => normalizeTool(server, {
    ...tool,
    name: tool.shortName || tool.name,
    id: `${server.name}__${tool.shortName || tool.name}`,
    serverId: server.id,
    serverName: server.name
  }));
}

const listToolsForServer = async (server) => {
  const routerTools = await listMetaMcpRouterTools(server);
  if (routerTools) {
    return routerTools;
  }

  const tools = typeof mcp_client.listTools === 'function'
    ? await mcp_client.listTools(server)
    : await mcp_client.listToolsImpl(server);
  return (tools || []).map((tool) => normalizeTool(server, tool));
}

const withTimeout = (promise, ms, message) => {
  let timeoutId;
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId));
}

const listToolsForServerWithTimeout = async (server) => {
  const timeoutMs = Math.max(1000, Number(server?.timeout || 10) * 1000);
  return withTimeout(
    listToolsForServer(server),
    timeoutMs,
    `Timed out after ${timeoutMs / 1000}s while listing MCP tools`
  );
}

const listSelectedTools = async (context = {}) => {
  const servers = await resolveServers(context);
  if (!Array.isArray(servers) || servers.length === 0) {
    return JSON.stringify({ tools: [], message: 'No MCP servers selected or active' });
  }

  const results = await Promise.allSettled(servers.map((server) => listToolsForServerWithTimeout(server)));
  const tools = [];
  const errors = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      tools.push(...result.value);
      return;
    }

    const server = servers[index];
    errors.push({
      serverId: server?.id,
      serverName: server?.name,
      message: result.reason?.message || String(result.reason)
    });
  });

  const payload = { tools };
  if (errors.length > 0) {
    payload.errors = errors;
  }

  return JSON.stringify(payload);
}

const parseServerScopedToolName = (name = '') => {
  const index = name.indexOf('__');
  if (index === -1) {
    return { serverName: name, toolName: undefined };
  }
  return {
    serverName: name.slice(0, index),
    toolName: name.slice(index + 2)
  };
}

const mcpToolActionCall = async (params = {}, context = {}) => {
  console.log(JSON.stringify(params, null, 2))
  const { name, arguments } = params;
  const args = typeof arguments === 'string' ? JSON.parse(arguments) : arguments;

  if (isListToolsRequest(name)) {
    return listSelectedTools(context);
  }

  const { serverName, toolName } = parseServerScopedToolName(name);
  if (!serverName || !toolName) {
    throw new Error(`Invalid MCP tool name "${name}". Expected "server__tool" or a list-tools request.`);
  }

  const server = await resolveServer(serverName, context);
  if (!server) {
    throw new Error(`MCP server "${serverName}" could not be resolved for tool "${toolName}".`);
  }

  const options = {
    server: server,
    name: toolName,
    args
  }
  const result = await mcp_client.callTool(options);
  if (typeof result === 'object') {
    return JSON.stringify(result);
  }
  return result;
}

module.exports = mcpToolActionCall
module.exports.isListToolsRequest = isListToolsRequest
module.exports.listSelectedTools = listSelectedTools
module.exports.listMetaMcpRouterTools = listMetaMcpRouterTools
module.exports.prepareMetaMcpHeaders = prepareMetaMcpHeaders
// run();
