import type { FastifyInstance } from 'fastify';
import { verifyMerchantToken } from '../plugins/cognitoAuth';
import { verifyCustomerToken } from '../plugins/cognitoCustomerAuth';
import { campaignRoutes } from './campaigns';
import { customerPublicRoutes } from './customerPublic';
import { customerSelfRoutes } from './customerSelf';
import { customerRoutes } from './customers';
import { healthRoutes } from './health';
import { merchantPublicRoutes } from './merchantPublic';
import { merchantRoutes } from './merchants';
import { purchaseRoutes } from './purchases';
import { pushCustomerRoutes, pushMerchantRoutes, pushPublicRoutes } from './push';
import { walletPassRoutes } from './wallet-pass';
import { webhookRoutes } from './webhooks';

export async function registerRoutes(server: FastifyInstance): Promise<void> {
  // Health check (no prefix, public)
  await server.register(healthRoutes);

  // API v1 routes
  await server.register(
    async (app) => {
      // Public routes (no auth required)
      await app.register(customerPublicRoutes, { prefix: '/customers' });
      await app.register(merchantPublicRoutes, { prefix: '/merchants' });
      await app.register(pushPublicRoutes, { prefix: '/push' });

      // Customer-authenticated routes
      await app.register(async (customerApp) => {
        customerApp.addHook('preHandler', verifyCustomerToken);
        await customerApp.register(customerSelfRoutes, { prefix: '/me' });
        await customerApp.register(pushCustomerRoutes, { prefix: '/me/push-subscriptions' });
        await customerApp.register(walletPassRoutes, { prefix: '/me/wallet' });
      });

      // Merchant-authenticated routes
      await app.register(async (protectedApp) => {
        protectedApp.addHook('preHandler', verifyMerchantToken);

        await protectedApp.register(purchaseRoutes, { prefix: '/purchases' });
        await protectedApp.register(customerRoutes, { prefix: '/customers' });
        await protectedApp.register(merchantRoutes, { prefix: '/merchants' });
        await protectedApp.register(campaignRoutes, { prefix: '/merchants' });
        await protectedApp.register(webhookRoutes, { prefix: '/merchants' });
        await protectedApp.register(pushMerchantRoutes, { prefix: '/merchants' });
      });
    },
    { prefix: '/v1' },
  );
}
