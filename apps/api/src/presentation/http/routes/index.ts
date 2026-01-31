import type { FastifyInstance } from 'fastify';
import { customerRoutes } from './customers';
import { healthRoutes } from './health';
import { merchantRoutes } from './merchants';
import { purchaseRoutes } from './purchases';

export async function registerRoutes(server: FastifyInstance): Promise<void> {
  // Health check (no prefix)
  await server.register(healthRoutes);

  // API v1 routes
  await server.register(
    async (app) => {
      await app.register(purchaseRoutes, { prefix: '/purchases' });
      await app.register(customerRoutes, { prefix: '/customers' });
      await app.register(merchantRoutes, { prefix: '/merchants' });
    },
    { prefix: '/v1' },
  );
}
