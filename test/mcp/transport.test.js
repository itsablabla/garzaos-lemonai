require('module-alias/register');
const { expect } = require('chai');

const { prepareTransportHeaders } = require('@src/mcp/transport');

describe('MCP transport headers', () => {
  it('preserves existing headers and adds X-API-Key from api_key', () => {
    const headers = prepareTransportHeaders({
      api_key: 'secret-key',
      headers: {
        Authorization: 'Bearer token',
        'X-Custom': 'value'
      }
    });

    expect(headers).to.deep.equal({
      Authorization: 'Bearer token',
      'X-Custom': 'value',
      'X-API-Key': 'secret-key'
    });
  });

  it('does not overwrite an existing X-API-Key header', () => {
    const headers = prepareTransportHeaders({
      api_key: 'server-api-key',
      headers: {
        'x-api-key': 'header-api-key'
      }
    });

    expect(headers).to.deep.equal({
      'x-api-key': 'header-api-key'
    });
  });

  it('returns provided headers unchanged when api_key is missing', () => {
    const headers = prepareTransportHeaders({
      headers: {
        Authorization: 'Bearer token'
      }
    });

    expect(headers).to.deep.equal({
      Authorization: 'Bearer token'
    });
  });
});
