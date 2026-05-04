require('module-alias/register');
const { expect } = require('chai');
const sinon = require('sinon');

const McpServer = require('@src/models/McpServer');
const mcpClient = require('@src/mcp/client');
const Message = require('@src/utils/message');

const codeActPath = require.resolve('@src/agent/code-act/code-act');
const thinkingPath = require.resolve('@src/agent/code-act/thinking');

describe('completeCodeAct MCP list-tools interception', () => {
  afterEach(() => {
    delete require.cache[codeActPath];
    delete require.cache[thinkingPath];
    sinon.restore();
  });

  it('bypasses LLM thinking and returns a finished MCP tools response for list-MCP-tools wording', async () => {
    const thinkingStub = sinon.stub().rejects(new Error('thinking should not be called'));
    delete require.cache[codeActPath];
    require.cache[thinkingPath] = {
      id: thinkingPath,
      filename: thinkingPath,
      loaded: true,
      exports: thinkingStub
    };

    const server = { id: 7, name: 'demo-server', activate: true };
    sinon.stub(McpServer, 'findAll').resolves([server]);
    sinon.stub(mcpClient, 'listTools').resolves([
      { name: 'search', description: 'Search records' },
      { name: 'lookup', description: 'Lookup records' }
    ]);
    sinon.stub(Message, 'saveToDB').resolves();
    const onTokenStream = sinon.spy();

    const completeCodeAct = require('@src/agent/code-act/code-act');
    const result = await completeCodeAct(
      {
        id: 99,
        requirement: 'Please list all of your available MCP tools. Include each tool name and a brief description of what it does.'
      },
      {
        conversation_id: 'mcp-list-tools-test',
        mcp_server_ids: [7],
        onTokenStream,
        runtime: {
          execute_action: sinon.stub().rejects(new Error('runtime should not be called'))
        }
      }
    );

    expect(thinkingStub.called).to.equal(false);
    expect(result.status).to.equal('success');
    expect(result.meta.action_type).to.equal('finish');
    expect(result.content).to.equal([
      'Available MCP tools:',
      '- demo-server__search: Search records',
      '- demo-server__lookup: Lookup records'
    ].join('\n'));
    expect(onTokenStream.calledOnce).to.equal(true);
    expect(onTokenStream.firstCall.args[0].content).to.equal(result.content);
  });
});
