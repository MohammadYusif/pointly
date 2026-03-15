import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { ManageCampaignRequest } from '../../../application/use-cases/ManageCampaignUseCase';
import type { Campaign } from '../../../domain/entities/Campaign';
import { ForbiddenError } from '../../../domain/errors/DomainError';
import { getContainer } from '../container';

function enforceMerchantAccess(request: FastifyRequest<{ Params: { id: string } }>): void {
  if (request.merchantId && request.params.id !== request.merchantId) {
    throw new ForbiddenError("Cannot access another merchant's data");
  }
}

const campaignTypeEnum = z.enum([
  'DOUBLE_POINTS',
  'TRIPLE_POINTS',
  'BIRTHDAY_REWARD',
  'WIN_BACK',
  'WELCOME',
  'HAPPY_HOUR',
  'CUSTOM',
]);

const createCampaignSchema = z.object({
  type: campaignTypeEnum,
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  multiplier: z.number().min(1.0).max(5.0).optional(),
  message: z.string().max(500).optional(),
});

export async function campaignRoutes(server: FastifyInstance): Promise<void> {
  server.post(
    '/:id/campaigns',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: {
          type: string;
          name?: string;
          description?: string;
          startDate?: string;
          endDate?: string;
          multiplier?: number;
          message?: string;
        };
      }>,
      reply: FastifyReply,
    ) => {
      enforceMerchantAccess(request);
      const { id: merchantId } = request.params;
      const body = createCampaignSchema.parse(request.body);

      const container = getContainer();
      const req: ManageCampaignRequest = {
        action: 'create',
        merchantId,
        type: body.type,
      };
      if (body.name) req.name = body.name;
      if (body.description) req.description = body.description;
      if (body.startDate) req.startDate = body.startDate;
      if (body.endDate) req.endDate = body.endDate;
      if (body.multiplier !== undefined) req.multiplier = body.multiplier;
      if (body.message) req.message = body.message;

      const result = await container.manageCampaignUseCase.execute(req);

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
