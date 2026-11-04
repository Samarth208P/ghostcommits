import { handleApi } from '../../server/handler.mjs';

export default (request, context) => handleApi(request, context.ip);
export const config = {
  path: '/api/*',
  rateLimit: {
    action: 'rate_limit',
    aggregateBy: ['ip', 'domain'],
    windowSize: 60,
    windowLimit: 120,
  },
};
