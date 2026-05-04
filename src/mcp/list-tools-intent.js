const mcpToolActionCall = require('./action');

const normalizeRequirement = (requirement = '') => String(requirement).toLowerCase().replace(/[\s_\-./]+/g, ' ').trim();

const isListMcpToolsRequirement = (requirement = '') => {
  const normalized = normalizeRequirement(requirement);
  if (!normalized.includes('mcp') || !/\btools?\b/.test(normalized)) {
    return false;
  }

  return /\b(list|show|display|include|available|what|which|enumerate)\b/.test(normalized);
}

const safeJsonParse = (value) => {
  if (typeof value !== 'string') {
    return value || {};
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return { tools: [], errors: [{ message: `Unable to parse MCP tool list response: ${error.message}` }] };
  }
}

const formatToolName = (tool = {}) => {
  const name = tool.id || tool.toolId || tool.name || 'unknown_tool';
  const serverName = tool.serverName;
  if (!serverName) {
    return name;
  }

  if (String(name).startsWith(`${serverName}__`)) {
    return name;
  }

  return `${name} (${serverName})`;
}

const formatAvailableMcpTools = (payload = {}) => {
  const tools = Array.isArray(payload.tools) ? payload.tools : [];
  const errors = Array.isArray(payload.errors) ? payload.errors : [];
  const lines = [];

  if (tools.length > 0) {
    lines.push('Available MCP tools:');
    tools.forEach((tool) => {
      const description = tool.description || 'No description provided';
      lines.push(`- ${formatToolName(tool)}: ${description}`);
    });
  } else {
    lines.push(payload.message || 'No active/default MCP servers or MCP tools were found.');
  }

  if (errors.length > 0) {
    if (lines.length > 0) {
      lines.push('');
    }
    lines.push('Some MCP servers could not be queried:');
    errors.forEach((error) => {
      const serverName = error.serverName || error.serverId || 'unknown server';
      const message = error.message || String(error);
      lines.push(`- ${serverName}: ${message}`);
    });
  }

  return lines.join('\n');
}

const resolveListMcpToolsRequirement = async (requirement = '', context = {}) => {
  if (!isListMcpToolsRequirement(requirement)) {
    return null;
  }

  const result = await mcpToolActionCall({ name: 'tools/list', arguments: {} }, context);
  return formatAvailableMcpTools(safeJsonParse(result));
}

module.exports = {
  isListMcpToolsRequirement,
  formatAvailableMcpTools,
  resolveListMcpToolsRequirement
};
