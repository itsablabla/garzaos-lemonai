require('module-alias/register');
const { expect } = require('chai');
const sinon = require('sinon');

const Conversation = require('@src/models/Conversation');

const agentPath = require.resolve('@src/agent/AgenticAgent');
const listToolsIntentPath = require.resolve('@src/mcp/list-tools-intent');

describe('AgenticAgent MCP list-tools bypass handling', () => {
  const originalRuntimeType = process.env.RUNTIME_TYPE;
  const originalLogging = global.logging;

  afterEach(() => {
    process.env.RUNTIME_TYPE = originalRuntimeType;
    global.logging = originalLogging;
    delete require.cache[agentPath];
    delete require.cache[listToolsIntentPath];
    sinon.restore();
  });

  it('marks the conversation failed and rethrows when the direct MCP bypass throws', async () => {
    process.env.RUNTIME_TYPE = 'local';
    const expectedError = new Error('tools/list failed');
    const resolveListMcpToolsRequirement = sinon.stub().rejects(expectedError);
    require.cache[listToolsIntentPath] = {
      id: listToolsIntentPath,
      filename: listToolsIntentPath,
      loaded: true,
      exports: { resolveListMcpToolsRequirement }
    };

    const AgenticAgent = require('@src/agent/AgenticAgent');
    sinon.stub(AgenticAgent.prototype, '_initialSetupAndAutoReply').resolves();
    const updateStub = sinon.stub(Conversation, 'update').resolves([1]);
    global.logging = sinon.stub();

    const agent = new AgenticAgent({
      conversation_id: 'agent-mcp-failure-test',
      user_id: 1,
      onTokenStream: sinon.spy()
    });

    let thrownError;
    try {
      await agent.run('Please list all of your available MCP tools. Include each tool name and a brief description of what it does.');
    } catch (error) {
      thrownError = error;
    }

    expect(thrownError).to.equal(expectedError);
    expect(resolveListMcpToolsRequirement.calledOnce).to.equal(true);
    expect(updateStub.calledWith(
      { status: 'failed' },
      { where: { conversation_id: 'agent-mcp-failure-test' } }
    )).to.equal(true);
    expect(global.logging.calledWith(
      sinon.match.object,
      'AgenticAgent.run',
      'error',
      expectedError
    )).to.equal(true);
  });
});
