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

function buildUpdateRequest(
  merchantId: string,
  campaignId: string,
  body: z.infer<typeof updateCampaignSchema>,
): ManageCampaignRequest {
  const req: ManageCampaignRequest = { action: 'update', merchantId, campaignId };
  if (body.name) req.name = body.name;
  if (body.description !== undefined) req.description = body.description;
  if (body.startDate) req.startDate = body.startDate;
  if (body.endDate) req.endDate = body.endDate;
  if (body.multiplier !== undefined) req.multiplier = body.multiplier;
  if (body.message !== undefined) req.message = body.message;
  if (body.targetTiers) req.targetTiers = body.targetTiers;
  if (body.maxUsesPerCustomer !== undefined) req.maxUsesPerCustomer = body.maxUsesPerCustomer;
  if (body.minPurchaseAmount !== undefined) req.minPurchaseAmount = body.minPurchaseAmount;
  if (body.maxPointsPerTransaction !== undefined)
    req.maxPointsPerTransaction = body.maxPointsPerTransaction;
  if (body.winBackDays !== undefined) req.winBackDays = body.winBackDays;
  if (body.welcomeDays !== undefined) req.welcomeDays = body.welcomeDays;
  return req;
}

function buildCampaignRequest(
  merchantId: string,
  body: z.infer<typeof createCampaignSchema>,
): ManageCampaignRequest {
  const req: ManageCampaignRequest = { action: 'create', merchantId, type: body.type };
  if (body.name) req.name = body.name;
  if (body.description) req.description = body.description;
  if (body.startDate) req.startDate = body.startDate;
  if (body.endDate) req.endDate = body.endDate;
  if (body.multiplier !== undefined) req.multiplier = body.multiplier;
  if (body.message) req.message = body.message;
  if (body.targetTiers && body.targetTiers.length > 0) req.targetTiers = body.targetTiers;
  if (body.maxUsesPerCustomer !== undefined) req.maxUsesPerCustomer = body.maxUsesPerCustomer;
  if (body.minPurchaseAmount !== undefined) req.minPurchaseAmount = body.minPurchaseAmount;
  if (body.maxPointsPerTransaction !== undefined)
    req.maxPointsPerTransaction = body.maxPointsPerTransaction;
  if (body.winBackDays !== undefined) req.winBackDays = body.winBackDays;
  if (body.welcomeDays !== undefined) req.welcomeDays = body.welcomeDays;
  return req;
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
          targetTiers?: string[];
          maxUsesPerCustomer?: number;
          minPurchaseAmount?: number;
          maxPointsPerTransaction?: number;
        };
      }>,
      reply: FastifyReply,
    ) => {
      enforceMerchantAccess(request);
      const { id: merchantId } = request.params;
      const body = createCampaignSchema.parse(request.body);

      const container = getContainer();
      const req = buildCampaignRequest(merchantId, body);
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
      const req = buildUpdateRequest(merchantId, campaignId, body);

      const container = getContainer();
      const result = await container.manageCampaignUseCase.execute(req);
      const campaign = result as import('../../../domain/entities/Campaign').Campaign | undefined;
      return reply.send({ success: true, data: campaign?.toJSON() });
    },
  );
}
