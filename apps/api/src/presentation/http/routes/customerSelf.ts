import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
} from '@aws-sdk/client-cognito-identity-provider';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { Customer, PhoneNumber } from '../../../domain';
import { TIER_ORDER } from '../../../domain/config/TierConfig.js';
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

const giftPointsSchema = z.object({
  recipientPhone: z.string().min(1),
  points: z.number().int().positive(),
  idempotencyKey: z.string().min(1),
  message: z.string().max(200).optional(),
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

      // Exclude POINTLY_NETWORK audit trail entries — customers see merchant transactions only
      // (global points info is shown in the transaction breakdown)
      const withoutNetwork = result.items.filter((t) => t.getMerchantId() !== 'POINTLY_NETWORK');
      const filtered = query.type
        ? withoutNetwork.filter((t) => t.getType() === query.type)
        : withoutNetwork;

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

    const container = getContainer();
    const customer = await container.customerRepository.findById(customerId);
    if (!customer) {
      return reply.status(404).send({ success: false, error: 'Customer not found' });
    }

    const customerTierLevel = customer.getCurrentTier().getLevel();
    const customerTierRank = TIER_ORDER.indexOf(customerTierLevel);
    const customerJSON = customer.toJSON();
    // biome-ignore lint/suspicious/noExplicitAny: toJSON returns untyped enrollment objects
    const enrolledMerchantIds = customerJSON.enrollments.map((e: any) => e.merchantId as string);

    const perks = await container.getCustomerPerksUseCase.execute({
      customerId,
      customerTierLevel,
      customerTierRank,
      enrolledMerchantIds,
      customerJSON: {
        ...(customerJSON.dateOfBirth && { dateOfBirth: customerJSON.dateOfBirth }),
        enrollments: customerJSON.enrollments.map(
          // biome-ignore lint/suspicious/noExplicitAny: toJSON returns untyped enrollment objects
          (e: any) => {
            const entry: { merchantId: string; enrolledAt: string; lastTransactionAt?: string } = {
              merchantId: e.merchantId as string,
              enrolledAt: e.enrolledAt as string,
            };
            if (e.lastTransactionAt) entry.lastTransactionAt = e.lastTransactionAt as string;
            return entry;
          },
        ),
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
        const merchantJSON = merchant?.toJSON();
        return {
          merchantId: e.merchantId as string,
          businessName: merchantJSON?.businessName ?? e.merchantId,
          merchantPointsBalance: e.merchantPointsBalance as number,
          merchantLifetimePoints: e.merchantLifetimePoints as number,
          enrolledAt: e.enrolledAt as string,
          transactionCount: e.transactionCount as number,
          lastTransactionAt: e.lastTransactionAt as string | undefined,
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

  // POST /v1/me/gift — Gift global points to another customer (peer-to-peer)
  server.post('/gift', async (request: FastifyRequest, reply: FastifyReply) => {
    const { customerId } = request;
    if (!customerId) {
      return reply.status(400).send({ success: false, error: 'Customer ID not found in token' });
    }

    const parsed = giftPointsSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ success: false, error: parsed.error.issues[0]?.message });
    }

    const container = getContainer();
    const result = await container.giftPointsUseCase.execute({
      senderId: customerId,
      recipientPhone: parsed.data.recipientPhone,
      points: parsed.data.points,
      idempotencyKey: parsed.data.idempotencyKey,
      message: parsed.data.message,
    });

    return reply.send({ success: true, data: result });
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
