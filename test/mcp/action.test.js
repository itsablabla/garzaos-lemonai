require('module-alias/register');
const { expect } = require('chai');
const sinon = require('sinon');

const McpServer = require('@src/models/McpServer');
const mcpClient = require('@src/mcp/client');
const mcpToolActionCall = require('@src/mcp/action');

describe('MCP tool action', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('lists selected MCP tools for generic list-tools requests', async () => {
    const server = { id: 7, name: 'demo-server', activate: true };
    sinon.stub(McpServer, 'findAll').resolves([server]);
    sinon.stub(mcpClient, 'listTools').resolves([
      {
        name: 'search',
        id: 'demo-server__search',
        description: 'Search records',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' }
          }
        },
        serverId: 7,
        serverName: 'demo-server'
      }
    ]);

    const result = await mcpToolActionCall({ name: 'tools/list', arguments: {} }, { mcp_server_ids: [7] });
    const payload = JSON.parse(result);

    expect(payload.tools).to.deep.equal([
      {
        serverId: 7,
        serverName: 'demo-server',
        name: 'search',
        id: 'demo-server__search',
        toolId: 'demo-server__search',
        description: 'Search records',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string' }
          }
        }
      }
    ]);
  });

  it('returns a clear empty tools message when no MCP servers are active', async () => {
    const result = await mcpToolActionCall({ name: 'listTools', arguments: {} }, { mcp_server_ids: [] });
    const payload = JSON.parse(result);

    expect(payload).to.deep.equal({
      tools: [],
      message: 'No MCP servers selected or active'
    });
  });

  it('throws a clear error when a server-scoped tool cannot resolve its server', async () => {
    sinon.stub(McpServer, 'findAll').resolves([]);

    try {
      await mcpToolActionCall({ name: 'missing-server__search', arguments: {} }, { mcp_server_ids: [9] });
      throw new Error('Expected mcpToolActionCall to throw');
    } catch (error) {
      expect(error.message).to.equal('MCP server "missing-server" could not be resolved for tool "search".');
    }
  });
});
