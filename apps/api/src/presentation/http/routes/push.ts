import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getContainer } from '../container';

const subscribeBodySchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  platform: z.enum(['ios', 'android', 'web']),
});

const unsubscribeBodySchema = z.object({
  endpoint: z.string().url(),
});

const merchantIdParamsSchema = z.object({
  id: z.string().min(1),
});

export async function pushPublicRoutes(server: FastifyInstance): Promise<void> {
  server.get('/vapid-key', async (_request: FastifyRequest, reply: FastifyReply) => {
    const { managePushSubscriptionUseCase } = getContainer();
    const result = await managePushSubscriptionUseCase.execute({ action: 'getVapidKey' });
    return reply.send({ success: true, data: result });
  });
}

export async function pushCustomerRoutes(server: FastifyInstance): Promise<void> {
  server.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = subscribeBodySchema.parse(request.body);
    const customerId = request.customerId;

    const { managePushSubscriptionUseCase } = getContainer();
    const sub = await managePushSubscriptionUseCase.execute({
      action: 'subscribe',
      customerId,
      endpoint: body.endpoint,
      p256dh: body.p256dh,
      auth: body.auth,
      platform: body.platform,
    });

    return reply.status(201).send({ success: true, data: sub });
  });

  server.delete('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = unsubscribeBodySchema.parse(request.body);
    const customerId = request.customerId;

    const { managePushSubscriptionUseCase } = getContainer();
    await managePushSubscriptionUseCase.execute({
      action: 'unsubscribe',
      customerId,
      endpoint: body.endpoint,
    });

    return reply.status(204).send();
  });
}

export async function pushMerchantRoutes(server: FastifyInstance): Promise<void> {
  server.get(
    '/:id/push-stats',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = merchantIdParamsSchema.parse(request.params);

      const { managePushSubscriptionUseCase } = getContainer();
      const stats = await managePushSubscriptionUseCase.execute({
        action: 'getPlatformStats',
        merchantId: id,
      });

      return reply.send({ success: true, data: stats });
    },
  );
}
