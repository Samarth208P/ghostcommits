import { handleApi } from '../../server/handler.mjs';
import { withStorageContext } from '../../server/store.mjs';

export default (request, context) =>
  withStorageContext(context, () => handleApi(request, context.ip));
export const config = {
  path: '/api/*',
  rateLimit: {
    action: 'rate_limit',
    aggregateBy: ['ip', 'domain'],
    windowSize: 60,
    windowLimit: 120,
  },
};
