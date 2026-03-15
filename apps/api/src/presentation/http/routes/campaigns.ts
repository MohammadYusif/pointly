import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Campaign } from '../../../domain/entities/Campaign';
import { ForbiddenError } from '../../../domain/errors/DomainError';
import { getContainer } from '../container';

function enforceMerchantAccess(request: FastifyRequest<{ Params: { id: string } }>): void {
  if (request.merchantId && request.params.id !== request.merchantId) {
    throw new ForbiddenError("Cannot access another merchant's data");
  }
}

const createCampaignSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().default(''),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  multiplier: z.number().min(1.0).max(5.0),
});

export async function campaignRoutes(server: FastifyInstance): Promise<void> {
  server.post(
    '/:id/campaigns',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          name: string;
          description?: string;
          startDate: string;
          endDate: string;
          multiplier: number;
        };
      }>,
      reply: FastifyReply,
    ) => {
      enforceMerchantAccess(request);
      const { id: merchantId } = request.params;
      const body = createCampaignSchema.parse(request.body);

      const container = getContainer();
      const result = await container.manageCampaignUseCase.execute({
        action: 'create',
        merchantId,
        name: body.name,
        description: body.description,
        startDate: body.startDate,
        endDate: body.endDate,
        multiplier: body.multiplier,
      });

      const campaign = result as Campaign | undefined;
      return reply.status(201).send({ success: true, data: campaign?.toJSON() });
    },
  );

  server.get(
    '/:id/campaigns',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      enforceMerchantAccess(request);
      const { id: merchantId } = request.params;

      const container = getContainer();
      const result = await container.manageCampaignUseCase.execute({
        action: 'list',
        merchantId,
      });

      const campaigns = result && 'items' in result ? result.items.map((c) => c.toJSON()) : [];
      return reply.send({ success: true, data: campaigns });
    },
  );

  server.delete(
    '/:id/campaigns/:campaignId',
    async (
      request: FastifyRequest<{ Params: { id: string; campaignId: string } }>,
      reply: FastifyReply,
    ) => {
      enforceMerchantAccess(request);
      const { id: merchantId, campaignId } = request.params;

      const container = getContainer();
      await container.manageCampaignUseCase.execute({
        action: 'deactivate',
        merchantId,
        campaignId,
      });

      return reply.send({ success: true });
    },
  );
}
