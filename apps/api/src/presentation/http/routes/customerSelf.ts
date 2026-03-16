import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { Customer, PhoneNumber } from '../../../domain';
import { ValidationError } from '../../../domain/errors/DomainError';
import EnvironmentConfig from '../../../infrastructure/config/Environment';
import { getContainer } from '../container';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

const transactionsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  nextToken: z.string().optional(),
  sortOrder: z.enum(['ASC', 'DESC']).optional().default('DESC'),
  type: z.enum(['EARN', 'REDEEM', 'ADJUSTMENT', 'EXPIRATION', 'REVERSAL']).optional(),
});

const enrollSchema = z.object({
  merchantId: z.string().min(1),
});

const setupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
});

/** Check if a perk type is eligible for a specific customer based on campaign-style rules */
function isPerkEligibleForCustomer(
  perkType: string,
  // biome-ignore lint/suspicious/noExplicitAny: toJSON returns untyped enrollment objects
  customerJSON: any,
  merchantId: string,
): boolean {
  const now = new Date();

  if (perkType === 'BIRTHDAY_REWARD') {
    const dob = customerJSON.dateOfBirth;
    if (!dob) return false;
    return new Date(dob).getMonth() === now.getMonth();
  }

  if (perkType === 'WIN_BACK') {
    // biome-ignore lint/suspicious/noExplicitAny: enrollment objects are untyped
    const enrollment = customerJSON.enrollments.find((e: any) => e.merchantId === merchantId);
    const lastTx = enrollment?.lastTransactionAt;
    if (!lastTx) return true; // never transacted → eligible for win-back
    const daysSince = (now.getTime() - new Date(lastTx).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince >= 60;
  }

  if (perkType === 'WELCOME_OFFER') {
    // biome-ignore lint/suspicious/noExplicitAny: enrollment objects are untyped
    const enrollment = customerJSON.enrollments.find((e: any) => e.merchantId === merchantId);
    const enrolledAt = enrollment?.enrolledAt;
    if (!enrolledAt) return false;
    const daysSince = (now.getTime() - new Date(enrolledAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 30;
  }

  // All other perk types (EARLY_ACCESS, EXCLUSIVE_PRODUCT, EVENT, HAPPY_HOUR, SPEND_BONUS, etc.)
  return true;
}

export async function customerSelfRoutes(server: FastifyInstance): Promise<void> {
  // GET /v1/me — Get own customer profile
  server.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const { customerId } = request;
    if (!customerId) {
      throw new ValidationError('Customer ID not found in token');
    }

    const container = getContainer();
    const customer = await container.customerRepository.findById(customerId);

    if (!customer) {
      return reply.status(404).send({ success: false, error: 'Customer not found' });
    }

    return reply.send({ success: true, data: customer.toJSON() });
  });

  // PATCH /v1/me — Update own profile (name)
  server.patch(
    '/',
    async (request: FastifyRequest<{ Body: { name?: string } }>, reply: FastifyReply) => {
      const { customerId } = request;
      if (!customerId) {
        throw new ValidationError('Customer ID not found in token');
      }

      const body = updateProfileSchema.parse(request.body);

      const container = getContainer();
      const customer = await container.customerRepository.findById(customerId);

      if (!customer) {
        return reply.status(404).send({ success: false, error: 'Customer not found' });
      }

      if (body.name) {
        customer.updateName(body.name);
      }

      await container.customerRepository.save(customer);

      return reply.send({ success: true, data: customer.toJSON() });
    },
  );

  // GET /v1/me/transactions — Own transaction history
  server.get(
    '/transactions',
    async (
      request: FastifyRequest<{
        Querystring: { limit?: string; nextToken?: string; sortOrder?: string; type?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { customerId } = request;
      if (!customerId) {
        throw new ValidationError('Customer ID not found in token');
      }

      const query = transactionsQuerySchema.parse(request.query);

      const container = getContainer();
      const result = await container.transactionRepository.findByCustomer(customerId, {
        limit: query.limit,
        sortOrder: query.sortOrder,
        ...(query.nextToken && { nextToken: query.nextToken }),
      });

      const filtered = query.type
        ? result.items.filter((t) => t.getType() === query.type)
        : result.items;

      return reply.send({
        success: true,
        data: {
          transactions: filtered.map((t) => t.toJSON()),
          count: filtered.length,
          nextToken: result.nextToken,
        },
      });
    },
  );

  // POST /v1/me/enroll — Enroll at a merchant
  server.post(
    '/enroll',
    async (request: FastifyRequest<{ Body: { merchantId: string } }>, reply: FastifyReply) => {
      const { customerId } = request;
      if (!customerId) {
        throw new ValidationError('Customer ID not found in token');
      }

      const body = enrollSchema.parse(request.body);

      const container = getContainer();
      const result = await container.enrollCustomerUseCase.execute({
        customerId,
        merchantId: body.merchantId,
      });

      return reply.status(201).send({
        success: true,
        data: {
          customerId: result.customerId,
          merchantId: result.merchantId,
          enrollment: result.enrollment,
        },
      });
    },
  );

  // POST /v1/me/qr-code — Generate QR code for identification
  server.post('/qr-code', async (request: FastifyRequest, reply: FastifyReply) => {
    const { customerId } = request;
    if (!customerId) {
      throw new ValidationError('Customer ID not found in token');
    }

    const container = getContainer();
    const result = await container.generateQRCodeUseCase.generate({ customerId });

    return reply.send({ success: true, data: result });
  });

  // GET /v1/me/perks — View all perks from enrolled merchants, annotated with tier unlock status
  server.get('/perks', async (request: FastifyRequest, reply: FastifyReply) => {
    const { customerId } = request;
    if (!customerId) {
      throw new ValidationError('Customer ID not found in token');
    }

    const tierOrder: Record<string, number> = { BRONZE: 0, GOLD: 1, PLATINUM: 2, DIAMOND: 3 };

    const container = getContainer();
    const customer = await container.customerRepository.findById(customerId);
    if (!customer) {
      return reply.status(404).send({ success: false, error: 'Customer not found' });
    }

    const customerTierLevel = customer.getCurrentTier().getLevel();
    const customerTierRank = tierOrder[customerTierLevel] ?? 0;

    // Collect all enrolled merchants
    const enrolledMerchantIds = customer
      .toJSON()
      // biome-ignore lint/suspicious/noExplicitAny: toJSON returns untyped enrollment objects
      .enrollments.map((e: any) => e.merchantId as string);

    const perksView: Array<{
      perkId: string;
      type: string;
      title: string;
      description: string;
      requiredTier: string;
      capacityLimit?: number;
      isUnlocked: boolean;
      merchantId: string;
      merchantName: string;
      campaignId?: string;
      campaignMultiplier?: number;
      campaignEndDate?: string;
      campaignMinPurchaseAmount?: number;
      campaignMaxUsesPerCustomer?: number;
      campaignUsesRemaining?: number;
      campaignTerms?: string;
      isExhausted?: boolean;
    }> = [];

    for (const merchantId of enrolledMerchantIds) {
      const merchant = await container.merchantRepository.findById(merchantId);
      if (!merchant) continue;

      // Fetch campaigns for this merchant to enrich linked perks and filter expired ones
      const campaignsResult = await container.campaignRepository.findByMerchant(merchantId);
      const campaignByPerkId = new Map<string, (typeof campaignsResult.items)[number]>();
      for (const c of campaignsResult.items) {
        const perkId = c.getLinkedPerkId();
        if (perkId) campaignByPerkId.set(perkId, c);
      }

      // Get campaign usage counts for this customer at this merchant
      const useCounts = new Map<string, number>();
      if (campaignByPerkId.size > 0) {
        const txResult = await container.transactionRepository.findByCustomerAndMerchant(
          customerId,
          merchantId,
          { limit: 200 },
        );
        for (const tx of txResult.items) {
          const meta = tx.getMetadata();
          // biome-ignore lint/complexity/useLiteralKeys: TS noPropertyAccessFromIndexSignature requires bracket notation
          const cId = meta['campaignId'];
          if (typeof cId === 'string') {
            useCounts.set(cId, (useCounts.get(cId) ?? 0) + 1);
          }
        }
      }

      const customerJSON = customer.toJSON();
      const activePerks = merchant.getPerks().filter((p) => p.isActive);
      for (const perk of activePerks) {
        // Check if this perk is linked to a campaign
        const linkedCampaign = campaignByPerkId.get(perk.id);

        // Skip perks whose linked campaign has expired or is deactivated
        if (linkedCampaign && (linkedCampaign.isExpired() || !linkedCampaign.getIsActive())) {
          continue;
        }

        // Skip perks the customer isn't eligible for based on campaign-style rules
        if (!isPerkEligibleForCustomer(perk.type, customerJSON, merchantId)) continue;

        const requiredRank = tierOrder[perk.requiredTier] ?? 0;

        // Build campaign enrichment fields
        let campaignFields = {};
        if (linkedCampaign) {
          const campaignId = linkedCampaign.getCampaignId();
          const maxUses = linkedCampaign.getMaxUsesPerCustomer();
          const used = useCounts.get(campaignId) ?? 0;
          const isExhausted = maxUses != null && maxUses > 0 && used >= maxUses;

          campaignFields = {
            campaignId,
            campaignMultiplier: linkedCampaign.getMultiplier(),
            campaignEndDate: linkedCampaign.getEndDate().toISOString(),
            ...(linkedCampaign.getMinPurchaseAmount() != null && {
              campaignMinPurchaseAmount: linkedCampaign.getMinPurchaseAmount(),
            }),
            ...(maxUses != null &&
              maxUses > 0 && {
                campaignMaxUsesPerCustomer: maxUses,
                campaignUsesRemaining: Math.max(0, maxUses - used),
              }),
            ...(linkedCampaign.getTermsMessage() && {
              campaignTerms: linkedCampaign.getTermsMessage(),
            }),
            isExhausted,
          };
        }

        perksView.push({
          perkId: perk.id,
          type: perk.type,
          title: perk.title,
          description: perk.description,
          requiredTier: perk.requiredTier,
          ...(perk.capacityLimit !== undefined && { capacityLimit: perk.capacityLimit }),
          isUnlocked: customerTierRank >= requiredRank,
          merchantId,
          merchantName: merchant.toJSON().businessName,
          ...campaignFields,
        });
      }
    }

    return reply.send({ success: true, data: perksView });
  });

  // POST /v1/me/setup — Complete profile after first OTP login (creates DynamoDB record)
  server.post(
    '/setup',
    async (
      request: FastifyRequest<{ Body: { name?: string; dateOfBirth?: string } }>,
      reply: FastifyReply,
    ) => {
      const { cognitoSub, cognitoPhone } = request;
      if (!cognitoSub) {
        throw new ValidationError('Not authenticated');
      }
      if (!cognitoPhone) {
        throw new ValidationError('Phone number not found in token');
      }

      const body = setupSchema.parse(request.body);
      const container = getContainer();

      // Return existing profile if already set up (idempotent)
      const existing = await container.customerRepository.findById(cognitoSub);
      if (existing) {
        return reply.send({ success: true, data: existing.toJSON() });
      }

      const phone = new PhoneNumber(cognitoPhone);
      const customer = Customer.createWithId(cognitoSub, phone, body.name, body.dateOfBirth);
      await container.customerRepository.save(customer);

      return reply.status(201).send({ success: true, data: customer.toJSON() });
    },
  );

  // GET /v1/me/merchants — Enrolled merchant details with names
  server.get('/merchants', async (request: FastifyRequest, reply: FastifyReply) => {
    const { customerId } = request;
    if (!customerId) {
      throw new ValidationError('Customer ID not found in token');
    }

    const container = getContainer();
    const customer = await container.customerRepository.findById(customerId);
    if (!customer) {
      return reply.status(404).send({ success: false, error: 'Customer not found' });
    }

    const enrollments = customer.toJSON().enrollments;
    const results = await Promise.all(
      // biome-ignore lint/suspicious/noExplicitAny: toJSON returns untyped enrollments
      enrollments.map(async (e: any) => {
        const merchant = await container.merchantRepository.findById(e.merchantId as string);
        return {
          merchantId: e.merchantId as string,
          businessName: merchant?.toJSON().businessName ?? e.merchantId,
          merchantPointsBalance: e.merchantPointsBalance as number,
          merchantLifetimePoints: e.merchantLifetimePoints as number,
          enrolledAt: e.enrolledAt as string,
          transactionCount: e.transactionCount as number,
          lastTransactionAt: e.lastTransactionAt as string | undefined,
        };
      }),
    );

    return reply.send({ success: true, data: results });
  });

  // GET /v1/me/challenges — Weekly streak progress
  server.get('/challenges', async (request: FastifyRequest, reply: FastifyReply) => {
    const { customerId } = request;
    if (!customerId) {
      throw new ValidationError('Customer ID not found in token');
    }

    const container = getContainer();
    const customer = await container.customerRepository.findById(customerId);
    if (!customer) {
      return reply.status(404).send({ success: false, error: 'Customer not found' });
    }

    return reply.send({
      success: true,
      data: {
        weeklyStreakChallenge: {
          target: 3,
          current: customer.getWeeklyVisitCount(),
          lastResetAt: customer.getLastStreakResetAt().toISOString(),
          visitDates: customer.getWeeklyVisitDates(),
        },
      },
    });
  });

  // DELETE /v1/me — Permanently delete account (DynamoDB + Cognito)
  server.delete('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const { customerId, cognitoPhone } = request;
    if (!customerId) {
      return reply.status(400).send({ success: false, error: 'Customer ID not found in token' });
    }

    try {
      const container = getContainer();

      // 1. Delete customer from DynamoDB (profile + merchant index items)
      await container.customerRepository.delete(customerId);

      // 2. Delete user from Cognito (if pool is configured)
      const env = EnvironmentConfig.get();
      const userPoolId = env.CUSTOMER_USER_POOL_ID;
      if (userPoolId && cognitoPhone) {
        try {
          const cognitoClient = new CognitoIdentityProviderClient({
            region: env.AWS_REGION || 'me-south-1',
          });
          await cognitoClient.send(
            new AdminDeleteUserCommand({
              UserPoolId: userPoolId,
              Username: cognitoPhone,
            }),
          );
        } catch (err) {
          // Log but don't fail — DynamoDB record is already deleted
          request.log.error({ err, customerId }, 'Failed to delete Cognito user');
        }
      }

      request.log.info({ customerId }, 'Account permanently deleted');
      return reply.send({ success: true });
    } catch (err) {
      request.log.error({ err, customerId }, 'DELETE /v1/me failed');
      const message = err instanceof Error ? err.message : 'Failed to delete account';
      return reply.status(500).send({ success: false, error: message });
    }
  });
}
