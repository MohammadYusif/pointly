import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { TIER_CONFIG, TIER_ORDER } from '../../../domain/config/TierConfig.js';
import { ValidationError } from '../../../domain/errors/DomainError';
import { getContainer } from '../container';

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  smsMarketingOptIn: z.boolean().optional(),
});

const transactionsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  nextToken: z.string().optional(),
  sortOrder: z.enum(['ASC', 'DESC']).optional().default('DESC'),
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
  smsMarketingOptIn: z.boolean().optional(),
});

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
    async (
      request: FastifyRequest<{ Body: { name?: string; smsMarketingOptIn?: boolean } }>,
      reply: FastifyReply,
    ) => {
      const { customerId } = request;
      if (!customerId) {
        throw new ValidationError('Customer ID not found in token');
      }

      const body = updateProfileSchema.parse(request.body);
      const { updateCustomerProfileUseCase } = getContainer();
      const customer = await updateCustomerProfileUseCase.execute({
        customerId,
        name: body.name,
        smsMarketingOptIn: body.smsMarketingOptIn,
      });

      return reply.send({ success: true, data: customer });
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

      return reply.send({
        success: true,
        data: {
          transactions: result.items.map((t) => t.toJSON()),
          count: result.count,
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

    const container = getContainer();
    const customer = await container.customerRepository.findById(customerId);
    if (!customer) {
      return reply.status(404).send({ success: false, error: 'Customer not found' });
    }

    const customerTierLevel = customer.getCurrentTier().getLevel();
    const customerTierRank = TIER_ORDER.indexOf(customerTierLevel);
    const customerJSON = customer.toJSON();
    const enrolledMerchantIds = customerJSON.enrollments.map((e) => e.merchantId);

    const perks = await container.getCustomerPerksUseCase.execute({
      customerId,
      customerTierLevel,
      customerTierRank,
      enrolledMerchantIds,
      customerJSON: {
        ...(customerJSON.dateOfBirth && { dateOfBirth: customerJSON.dateOfBirth }),
        enrollments: customerJSON.enrollments.map((e) => {
          const entry: { merchantId: string; enrolledAt: string; lastTransactionAt?: string } = {
            merchantId: e.merchantId,
            enrolledAt: e.enrolledAt,
          };
          if (e.lastTransactionAt) entry.lastTransactionAt = e.lastTransactionAt;
          return entry;
        }),
      },
    });

    return reply.send({ success: true, data: perks });
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
      const { setupCustomerAccountUseCase } = getContainer();
      const result = await setupCustomerAccountUseCase.execute({
        cognitoSub,
        cognitoPhone,
        name: body.name,
        dateOfBirth: body.dateOfBirth,
        smsMarketingOptIn: body.smsMarketingOptIn,
      });

      return reply
        .status(result.created ? 201 : 200)
        .send({ success: true, data: result.customer });
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
      enrollments.map(async (e) => {
        const merchant = await container.merchantRepository.findById(e.merchantId);
        const merchantJSON = merchant?.toJSON();
        return {
          merchantId: e.merchantId,
          businessName: merchantJSON?.businessName ?? e.merchantId,
          merchantPointsBalance: e.merchantPointsBalance,
          merchantLifetimePoints: e.merchantLifetimePoints,
          redemptionRate: merchantJSON?.loyaltyConfig.redemptionRate ?? 0.1,
          enrolledAt: e.enrolledAt,
          transactionCount: e.transactionCount,
          lastTransactionAt: e.lastTransactionAt,
          ...(merchantJSON?.walletConfig && { walletConfig: merchantJSON.walletConfig }),
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

  // GET /v1/me/tier-benefits — Returns the benefit list for the customer's current global tier.
  // Config-driven, no database read required.
  server.get('/tier-benefits', async (request: FastifyRequest, reply: FastifyReply) => {
    const { customerId } = request;
    if (!customerId) {
      return reply.status(400).send({ success: false, error: 'Customer ID not found in token' });
    }

    const container = getContainer();
    const customer = await container.customerRepository.findById(customerId);
    if (!customer) {
      return reply.status(404).send({ success: false, error: 'Customer not found' });
    }

    const tierLevel = customer.getCurrentTier().getLevel();
    const config = TIER_CONFIG[tierLevel as keyof typeof TIER_CONFIG];

    return reply.send({
      success: true,
      data: {
        tier: tierLevel,
        displayName: config.displayName,
        color: config.color,
        earningMultiplier: config.earningMultiplier,
        decayImmune: !config.decays,
        benefits: config.benefits,
      },
    });
  });

  // POST /v1/me/challenges/check-in — Record an app visit for the weekly streak challenge.
  // Decoupled from purchases so low-activity customers can still progress their streak.
  server.post('/challenges/check-in', async (request: FastifyRequest, reply: FastifyReply) => {
    const { customerId } = request;
    if (!customerId) {
      return reply.status(400).send({ success: false, error: 'Customer ID not found in token' });
    }

    const container = getContainer();
    const result = await container.checkChallengeEligibilityUseCase.execute({
      customerId,
      merchantId: 'POINTLY_NETWORK',
    });

    return reply.send({ success: true, data: result });
  });

  // DELETE /v1/me — Permanently delete account (DynamoDB + Cognito)
  server.delete('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const { customerId, cognitoPhone } = request;
    if (!customerId) {
      return reply.status(400).send({ success: false, error: 'Customer ID not found in token' });
    }

    const { deleteCustomerAccountUseCase } = getContainer();
    await deleteCustomerAccountUseCase.execute({ customerId, cognitoPhone });
    request.log.info({ customerId }, 'Account permanently deleted');
    return reply.send({ success: true });
  });
}
