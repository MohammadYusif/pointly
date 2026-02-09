import type { FastifyInstance } from 'fastify';
import { verifyMerchantToken } from '../plugins/cognitoAuth';
import { customerRoutes } from './customers';
import { healthRoutes } from './health';
import { merchantRoutes } from './merchants';
import { purchaseRoutes } from './purchases';

export async function registerRoutes(server: FastifyInstance): Promise<void> {
  // Health check (no prefix, public)
  await server.register(healthRoutes);

  // API v1 routes (protected)
  await server.register(
    async (app) => {
      app.addHook('preHandler', verifyMerchantToken);

      await app.register(purchaseRoutes, { prefix: '/purchases' });
      await app.register(customerRoutes, { prefix: '/customers' });
      await app.register(merchantRoutes, { prefix: '/merchants' });
    },
    { prefix: '/v1' },
  );
}
