const mcpToolCall = require('./action');

const mcp_tool = {
  name: "mcp_tool",
  description: "mcp_tool: calls MCP server tools. Use name \"tools/list\" with empty arguments to list all available MCP tools, or use \"serverName__toolName\" to call a specific MCP tool.",
  params: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "MCP tool name. Use \"tools/list\" to list available tools, or \"serverName__toolName\" for a server-scoped tool."
      },
      arguments: {
        type: "object",
        description: "MCP tool arguments. Use an empty object for \"tools/list\"."
      }
    }
  },
  memorized: true,
  getActionDescription({ name, arguments }) {
    return `${name} ${JSON.stringify(arguments)}`;
  },
  async execute(action, uuid, context = {}) {
    const result = await mcpToolCall(action, context);
    // return result;
    return {
      uuid,
      status: 'success',
      content: result,
      meta: {
        action_type: action.type,
      }
    };
  }
}

module.exports = mcp_tool;