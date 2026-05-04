require('module-alias/register');
const { expect } = require('chai');
const sinon = require('sinon');

const McpServer = require('@src/models/McpServer');
const mcpClient = require('@src/mcp/client');
const {
  isListMcpToolsRequirement,
  formatAvailableMcpTools,
  resolveListMcpToolsRequirement
} = require('@src/mcp/list-tools-intent');

describe('MCP list-tools intent', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('detects list-MCP-tools wording without matching unrelated MCP prompts', () => {
    expect(isListMcpToolsRequirement('Please list all of your available MCP tools. Include each tool name and a brief description of what it does.')).to.equal(true);
    expect(isListMcpToolsRequirement('Show MCP tools')).to.equal(true);
    expect(isListMcpToolsRequirement('Display the MCP tool catalog')).to.equal(true);
    expect(isListMcpToolsRequirement('Which available MCP tools can you access?')).to.equal(true);
    expect(isListMcpToolsRequirement('Use the MCP tools to search the web')).to.equal(false);
    expect(isListMcpToolsRequirement('Configure the available MCP tool for Slack')).to.equal(false);
    expect(isListMcpToolsRequirement('Include MCP tools in the workflow')).to.equal(false);
    expect(isListMcpToolsRequirement('Call the MCP tool named foo')).to.equal(false);
    expect(isListMcpToolsRequirement('Use MCP to search the web')).to.equal(false);
    expect(isListMcpToolsRequirement('List available browser tools')).to.equal(false);
  });

  it('formats tools, server names, descriptions, and partial server errors for users', () => {
    const result = formatAvailableMcpTools({
      tools: [
        { id: 'alpha__search', name: 'search', serverName: 'alpha', description: 'Search records' },
        { name: 'lookup', serverName: 'beta', description: 'Lookup records' },
        { name: 'summarize' }
      ],
      errors: [
        { serverName: 'broken', message: 'connection refused' }
      ]
    });

    expect(result).to.equal([
      'Available MCP tools:',
      '- alpha__search: Search records',
      '- lookup (beta): Lookup records',
      '- summarize: No description provided',
      '',
      'Some MCP servers could not be queried:',
      '- broken: connection refused'
    ].join('\n'));
  });

  it('returns a clear no-tools response when no servers are active', () => {
    const result = formatAvailableMcpTools({ tools: [], message: 'No MCP servers selected or active' });

    expect(result).to.equal('No MCP servers selected or active');
  });

  it('calls tools/list directly for list-MCP-tools requirements', async () => {
    const server = { id: 7, name: 'demo-server', activate: true };
    sinon.stub(McpServer, 'findAll').resolves([server]);
    sinon.stub(mcpClient, 'listTools').resolves([
      { name: 'search', description: 'Search records' }
    ]);

    const result = await resolveListMcpToolsRequirement(
      'Please list all of your available MCP tools. Include each tool name and a brief description of what it does.',
      { mcp_server_ids: [7] }
    );

    expect(result).to.equal([
      'Available MCP tools:',
      '- demo-server__search: Search records'
    ].join('\n'));
  });
});
