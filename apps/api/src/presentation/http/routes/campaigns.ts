import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
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

const updateCampaignSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  multiplier: z.number().min(1.0).max(5.0).optional(),
  message: z.string().max(500).optional(),
  targetTiers: z.array(z.enum(['BRONZE', 'GOLD', 'PLATINUM', 'DIAMOND'])).optional(),
  maxUsesPerCustomer: z.number().int().min(0).max(1000).optional(),
  minPurchaseAmount: z.number().min(0).max(100000).optional(),
  maxPointsPerTransaction: z.number().int().min(0).max(100000).optional(),
  winBackDays: z.number().int().min(1).max(365).optional(),
  welcomeDays: z.number().int().min(1).max(365).optional(),
  lastVisitDays: z.number().int().min(1).max(365).optional(),
});

const createCampaignSchema = z.object({
  type: campaignTypeEnum,
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  multiplier: z.number().min(1.0).max(5.0).optional(),
  message: z.string().max(500).optional(),
  targetTiers: z.array(z.enum(['BRONZE', 'GOLD', 'PLATINUM', 'DIAMOND'])).optional(),
  maxUsesPerCustomer: z.number().int().min(0).max(1000).optional(),
  minPurchaseAmount: z.number().min(0).max(100000).optional(),
  maxPointsPerTransaction: z.number().int().min(0).max(100000).optional(),
  winBackDays: z.number().int().min(1).max(365).optional(),
  welcomeDays: z.number().int().min(1).max(365).optional(),
  lastVisitDays: z.number().int().min(1).max(365).optional(),
});

export async function campaignRoutes(server: FastifyInstance): Promise<void> {
  server.post(
    '/:id/campaigns',
    async (
      request: FastifyRequest<{
        Params: { id: string };
        Body: z.infer<typeof createCampaignSchema>;
      }>,
      reply: FastifyReply,
    ) => {
      enforceMerchantAccess(request);
      const { id: merchantId } = request.params;
      const body = createCampaignSchema.parse(request.body);

      const { createCampaignUseCase } = getContainer();
      const campaign = await createCampaignUseCase.execute({ merchantId, ...body });
      return reply.status(201).send({ success: true, data: campaign.toJSON() });
    },
  );

  server.get(
    '/:id/campaigns',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      enforceMerchantAccess(request);
      const { id: merchantId } = request.params;

      const { listCampaignsUseCase } = getContainer();
      const result = await listCampaignsUseCase.execute(merchantId);
      return reply.send({ success: true, data: result.items.map((c) => c.toJSON()) });
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

      const { deactivateCampaignUseCase } = getContainer();
      await deactivateCampaignUseCase.execute({ merchantId, campaignId });
      return reply.send({ success: true });
    },
  );

  server.patch(
    '/:id/campaigns/:campaignId',
    async (
      request: FastifyRequest<{
        Params: { id: string; campaignId: string };
        Body: z.infer<typeof updateCampaignSchema>;
      }>,
      reply: FastifyReply,
    ) => {
      enforceMerchantAccess(request);
      const { id: merchantId, campaignId } = request.params;
      const body = updateCampaignSchema.parse(request.body);

      const { updateCampaignUseCase } = getContainer();
      const campaign = await updateCampaignUseCase.execute({ merchantId, campaignId, ...body });
      return reply.send({ success: true, data: campaign.toJSON() });
    },
  );
}
