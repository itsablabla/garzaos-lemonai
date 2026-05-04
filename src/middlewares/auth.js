
/**
 * Token 校验中间件
 * 除了指定的不需要校验的接口外，其他接口均需校验 Token
 * @param {Array} excludePaths - 不需要校验 Token 的接口路径数组
 */

const excludePatterns = [
  '/api/agent_store/last/',
  '/api/version'
];

const isExcludedPath = (path) => excludePatterns.some((pattern) => path.startsWith(pattern));

const getBearerToken = (authorization = '') => {
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : '';
};

module.exports = () => {
  return async (ctx, next) => {
    const authToken = process.env.LEMON_AUTH_TOKEN;

    if (!authToken || isExcludedPath(ctx.path) || ctx.method === 'OPTIONS') {
      ctx.state.user = { id: 1 };
      await next();
      return;
    }

    const bearerToken = getBearerToken(ctx.get('authorization'));
    if (bearerToken !== authToken) {
      ctx.status = 401;
      ctx.body = {
        data: {},
        code: 1,
        msg: 'Unauthorized'
      };
      return;
    }

    ctx.state.user = { id: 1 };
    await next();
  };
};
