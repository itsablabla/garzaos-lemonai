const path = require("path");
const fs = require("fs");

const filepath = path.resolve(__dirname, "../../mcp-local.json");
const exists = fs.existsSync(filepath);

const McpServer = require("@src/models/McpServer");
const { Op } = require("sequelize");
const normalizeMcpServerIds = (mcp_server_ids = []) => {
  const ids = Array.isArray(mcp_server_ids) ? mcp_server_ids : [mcp_server_ids];
  return ids
    .map((id) => {
      if (typeof id === 'string') {
        const trimmed = id.trim();
        if (!trimmed) return undefined;
        const numericId = Number(trimmed);
        return Number.isFinite(numericId) ? numericId : trimmed;
      }
      return id;
    })
    .filter((id) => id !== undefined && id !== null && id !== '');
};

const resolveMcpServers = async (mcp_server_ids = []) => {
  const normalizedIds = normalizeMcpServerIds(mcp_server_ids);
  console.log("mcp_server_ids", normalizedIds);
  const servers = await McpServer.findAll({
    where: {
      id: { [Op.in]: normalizedIds },
      activate: true,
    },
  });
  return servers;
};

const resolveLocalServers = () => {
  if (!exists) return [];
  const list = require(filepath);
  // 返回开启使用的 mcp servers
  return list.filter((item) => item.activate);
};

const resolveDefaultMcpServers = async (context = {}) => {
  const where = {
    activate: true,
    is_default: true,
  };
  if (context.user_id !== undefined && context.user_id !== null) {
    where.user_id = context.user_id;
  }

  try {
    const servers = await McpServer.findAll({ where });
    return servers;
  } catch (error) {
    console.warn('Failed to resolve default MCP servers from DB:', error.message);
    return [];
  }
};

const resolveServers = async (context = {}) => {
  const mcp_server_ids = normalizeMcpServerIds(context.mcp_server_ids || []);
  console.log("resolveServers mcp_server_ids", mcp_server_ids);
  if (mcp_server_ids.length > 0) {
    return resolveMcpServers(mcp_server_ids);
  }

  const defaultServers = await resolveDefaultMcpServers(context);
  if (defaultServers.length > 0) {
    return defaultServers;
  }

  return resolveLocalServers();
};

module.exports = exports = resolveServers;
