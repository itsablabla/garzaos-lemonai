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

const listToolsForServer = async (server) => {
  const tools = typeof mcp_client.listTools === 'function'
    ? await mcp_client.listTools(server)
    : await mcp_client.listToolsImpl(server);
  return (tools || []).map((tool) => normalizeTool(server, tool));
}

const listSelectedTools = async (context = {}) => {
  const servers = await resolveServers(context);
  if (!Array.isArray(servers) || servers.length === 0) {
    return JSON.stringify({ tools: [], message: 'No MCP servers selected or active' });
  }

  const results = await Promise.allSettled(servers.map((server) => listToolsForServer(server)));
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
// run();
