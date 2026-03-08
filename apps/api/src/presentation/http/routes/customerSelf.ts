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
});

const enrollSchema = z.object({
  merchantId: z.string().min(1),
});

const consentSchema = z.object({
  merchantId: z.string().min(1),
  action: z.enum(['grant', 'revoke']),
});

const setupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .optional(),
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
        Querystring: { limit?: string; nextToken?: string };
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

    const tierOrder: Record<string, number> = { BRONZE: 0, GOLD: 1, PLATINUM: 2, DIAMOND: 3 };

    const container = getContainer();
    const customer = await container.customerRepository.findById(customerId);
    if (!customer) {
      return reply.status(404).send({ success: false, error: 'Customer not found' });
    }

    const customerTierLevel = customer.getCurrentTier().getLevel();
    const customerTierRank = tierOrder[customerTierLevel] ?? 0;

    // Collect all enrolled merchants with granted consent
    const enrolledMerchantIds = customer
      .toJSON()
      // biome-ignore lint/suspicious/noExplicitAny: toJSON returns untyped enrollment objects
      .enrollments.filter((e: any) => e.consentStatus === 'GRANTED')
      // biome-ignore lint/suspicious/noExplicitAny: toJSON returns untyped enrollment objects
      .map((e: any) => e.merchantId as string);

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
    }> = [];

    for (const merchantId of enrolledMerchantIds) {
      const merchant = await container.merchantRepository.findById(merchantId);
      if (!merchant) continue;

      const activePerks = merchant.getPerks().filter((p) => p.isActive);
      for (const perk of activePerks) {
        const requiredRank = tierOrder[perk.requiredTier] ?? 0;
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
          consentStatus: e.consentStatus as string,
          enrolledAt: e.enrolledAt as string,
          transactionCount: e.transactionCount as number,
          lastTransactionAt: e.lastTransactionAt as string | undefined,
        };
      }),
    );

    return reply.send({ success: true, data: results });
  });

  // POST /v1/me/consent — Grant/revoke consent
  server.post(
    '/consent',
    async (
      request: FastifyRequest<{ Body: { merchantId: string; action: string } }>,
      reply: FastifyReply,
    ) => {
      const { customerId } = request;
      if (!customerId) {
        throw new ValidationError('Customer ID not found in token');
      }

      const body = consentSchema.parse(request.body);

      const container = getContainer();
      const { customerRepository, transactionalWriter } = container;

      const customer = await customerRepository.findById(customerId);
      if (!customer) {
        return reply.status(404).send({ success: false, error: 'Customer not found' });
      }

      if (body.action === 'grant') {
        customer.grantConsent(body.merchantId);
        // Atomic write: profile + GSI2 merchant index (so merchant queries see the change)
        await transactionalWriter.writeAll(
          customerRepository.toEnrollmentItems(customer, body.merchantId),
        );
      } else {
        customer.revokeConsent(body.merchantId);
        // Profile-only write: revoked consent removes customer from merchant queries
        await transactionalWriter.writeAll(customerRepository.toPersistenceItem(customer));
      }

      return reply.send({
        success: true,
        data: {
          customerId,
          merchantId: body.merchantId,
          consentStatus: customer.getEnrollment(body.merchantId)?.consentStatus,
        },
      });
    },
  );

  // DELETE /v1/me — Permanently delete account (DynamoDB + Cognito)
  server.delete('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const { customerId, cognitoPhone } = request;
    if (!customerId) {
      throw new ValidationError('Customer ID not found in token');
    }

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
  });
}
