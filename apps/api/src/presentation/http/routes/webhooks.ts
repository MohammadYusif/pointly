import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { WebhookConfig, type WebhookEventType } from '../../../domain';
import { ForbiddenError } from '../../../domain/errors/DomainError';
import { getContainer } from '../container';

function enforceMerchantAccess(request: FastifyRequest<{ Params: { id: string } }>): void {
  if (request.merchantId && request.params.id !== request.merchantId) {
    throw new ForbiddenError("Cannot access another merchant's data");
  }
}

const BLOCKED_HOSTNAME_PATTERNS = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
  /^\[::1\]$/,
];

const registerWebhookSchema = z.object({
  url: z
    .string()
    .url()
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          if (parsed.protocol !== 'https:') return false;
          return !BLOCKED_HOSTNAME_PATTERNS.some((p) => p.test(parsed.hostname));
        } catch {
          return false;
        }
      },
      { message: 'Webhook URL must use HTTPS and point to a public address' },
    ),
  secretKey: z.string().min(16),
  events: z.array(z.enum(['REDEMPTION'])).min(1),
});

export async function webhookRoutes(server: FastifyInstance): Promise<void> {
  server.post(
    '/:id/webhooks',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: { url: string; secretKey: string; events: string[] };
      }>,
      reply: FastifyReply,
    ) => {
      enforceMerchantAccess(request);
      const { id: merchantId } = request.params;
      const body = registerWebhookSchema.parse(request.body);

      const webhookConfig = WebhookConfig.create(
        merchantId,
        body.url,
        body.secretKey,
        body.events as WebhookEventType[],
      );

      const container = getContainer();
      await container.webhookConfigRepository.save(webhookConfig);

      return reply.status(201).send({ success: true, data: webhookConfig.toJSON() });
    },
  );

  server.get(
    '/:id/webhooks',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      enforceMerchantAccess(request);
      const { id: merchantId } = request.params;

      const container = getContainer();
      const configs = await container.webhookConfigRepository.findByMerchant(merchantId);

      return reply.send({ success: true, data: configs.map((c) => c.toJSON()) });
    },
  );

  server.delete(
    '/:id/webhooks/:webhookId',
    async (
      request: FastifyRequest<{ Params: { id: string; webhookId: string } }>,
      reply: FastifyReply,
    ) => {
      enforceMerchantAccess(request);
      const { id: merchantId, webhookId } = request.params;

      const container = getContainer();
      await container.webhookConfigRepository.delete(merchantId, webhookId);

      return reply.send({ success: true });
    },
  );
}
