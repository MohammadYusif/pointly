import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ForbiddenError } from '../../../domain/errors/DomainError';
import EnvironmentConfig from '../../../infrastructure/config/Environment';
import { getContainer } from '../container';

interface CustomerEnrollmentJSON {
  merchantId: string;
  enrolledAt: string;
  merchantPointsBalance: number;
  merchantLifetimePoints: number;
  transactionCount: number;
  lastTransactionAt?: string | undefined;
  welcomeBonusApplied?: boolean;
  consentStatus?: string;
  consentGrantedAt?: string | undefined;
}

interface CustomerJSON {
  customerId: string;
  phone: string;
  name: string | undefined;
  status: string;
  enrollments: CustomerEnrollmentJSON[];
}

/** Return only merchant-scoped customer data — strips global points, tiers, and decay info */
function toMerchantCustomerView(customer: CustomerJSON, merchantId: string) {
  const enrollment = customer.enrollments?.find((e) => e.merchantId === merchantId);
  return {
    customerId: customer.customerId,
    phone: customer.phone,
    name: customer.name,
    status: customer.status,
    merchantPointsBalance: enrollment?.merchantPointsBalance ?? 0,
    merchantLifetimePoints: enrollment?.merchantLifetimePoints ?? 0,
    transactionCount: enrollment?.transactionCount ?? 0,
    enrolledAt: enrollment?.enrolledAt,
    lastTransactionAt: enrollment?.lastTransactionAt,
  };
}

function enforceMerchantAccess(request: FastifyRequest<{ Params: { merchantId: string } }>): void {
  if (request.merchantId && request.params.merchantId !== request.merchantId) {
    throw new ForbiddenError("Cannot access another merchant's data");
  }
}

const getMerchantParamsSchema = z.object({
  merchantId: z.string().min(1),
});

const getMerchantCustomersQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  nextToken: z.string().optional(),
});

const getMerchantTransactionsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  nextToken: z.string().optional(),
  locationId: z.string().optional(),
  sortOrder: z.enum(['ASC', 'DESC']).optional().default('DESC'),
});

const analyticsQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  groupBy: z.enum(['day', 'week', 'month']).optional(),
});

/** Shared handler for customer insights (used by both /perk-insights and /customer-insights) */
async function handleCustomerInsights(
  request: FastifyRequest<{ Params: { merchantId: string } }>,
  reply: FastifyReply,
) {
  enforceMerchantAccess(request);
  const { merchantId } = request.params;

  const container = getContainer();
  const insights = await container.getCustomerInsightsUseCase.execute(merchantId);
  return reply.send({ success: true, data: insights });
}

export async function merchantRoutes(server: FastifyInstance): Promise<void> {
  // Get merchant by ID
  server.get(
    '/:merchantId',
    async (request: FastifyRequest<{ Params: { merchantId: string } }>, reply: FastifyReply) => {
      enforceMerchantAccess(request);
      const { merchantId } = getMerchantParamsSchema.parse(request.params);

      const container = getContainer();
      const merchantRepository = container.merchantRepository;

      const merchant = await merchantRepository.findById(merchantId);

      if (!merchant) {
        return reply.status(404).send({
          success: false,
          error: 'Merchant not found',
        });
      }

      return reply.send({
        success: true,
        data: merchant.toJSON(),
      });
    },
  );

  // Get merchant customers
  server.get(
    '/:merchantId/customers',
    { config: { rateLimit: { max: 200, timeWindow: '1 minute' } } },
    async (
      request: FastifyRequest<{
        Params: { merchantId: string };
        Querystring: { limit?: string; nextToken?: string };
      }>,
      reply: FastifyReply,
    ) => {
      enforceMerchantAccess(request);
      const { merchantId } = request.params;
      const query = getMerchantCustomersQuerySchema.parse(request.query);

      const container = getContainer();
      const customerRepository = container.customerRepository;

      const result = await customerRepository.findByMerchant(merchantId, {
        limit: query.limit,
        ...(query.nextToken && { nextToken: query.nextToken }),
      });

      return reply.send({
        success: true,
        data: {
          customers: result.items.map((c) => toMerchantCustomerView(c.toJSON(), merchantId)),
          count: result.count,
          nextToken: result.nextToken,
        },
      });
    },
  );

  // Get merchant transactions
  server.get(
    '/:merchantId/transactions',
    async (
      request: FastifyRequest<{
        Params: { merchantId: string };
        Querystring: { limit?: string; nextToken?: string; locationId?: string };
      }>,
      reply: FastifyReply,
    ) => {
      enforceMerchantAccess(request);
      const { merchantId } = request.params;
      const query = getMerchantTransactionsQuerySchema.parse(request.query);

      const container = getContainer();
      const transactionRepository = container.transactionRepository;

      const queryOptions = {
        limit: query.limit,
        sortOrder: query.sortOrder as 'ASC' | 'DESC',
        ...(query.nextToken && { nextToken: query.nextToken }),
      };

      const result = query.locationId
        ? await transactionRepository.findByMerchantAndLocation(
            merchantId,
            query.locationId,
            queryOptions,
          )
        : await transactionRepository.findByMerchant(merchantId, queryOptions);

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

  // Get merchant stats
  server.get(
    '/:merchantId/stats',
    async (request: FastifyRequest<{ Params: { merchantId: string } }>, reply: FastifyReply) => {
      enforceMerchantAccess(request);
      const { merchantId } = request.params;

      const container = getContainer();
      const transactionRepository = container.transactionRepository;

      const stats = await transactionRepository.getMerchantStats(merchantId);

      return reply.send({
        success: true,
        data: stats,
      });
    },
  );

  // Get merchant analytics
  server.get(
    '/:merchantId/analytics',
    { config: { rateLimit: { max: 200, timeWindow: '1 minute' } } },
    async (
      request: FastifyRequest<{
        Params: { merchantId: string };
        Querystring: { startDate?: string; endDate?: string; groupBy?: string };
      }>,
      reply: FastifyReply,
    ) => {
      enforceMerchantAccess(request);
      const { merchantId } = request.params;
      const query = analyticsQuerySchema.parse(request.query);

      const container = getContainer();
      const result = await container.getAnalyticsUseCase.execute({
        merchantId,
        ...(query.startDate ? { startDate: query.startDate } : {}),
        ...(query.endDate ? { endDate: query.endDate } : {}),
        ...(query.groupBy ? { groupBy: query.groupBy } : {}),
      });

      return reply.send({ success: true, data: result });
    },
  );

  // Get location-specific analytics
  server.get(
    '/:merchantId/analytics/locations/:locationId',
    { config: { rateLimit: { max: 200, timeWindow: '1 minute' } } },
    async (
      request: FastifyRequest<{
        Params: { merchantId: string; locationId: string };
        Querystring: { startDate?: string; endDate?: string; groupBy?: string };
      }>,
      reply: FastifyReply,
    ) => {
      enforceMerchantAccess(request);
      const { merchantId, locationId } = request.params;
      const query = analyticsQuerySchema.parse(request.query);

      const container = getContainer();
      const result = await container.getAnalyticsUseCase.execute({
        merchantId,
        locationId,
        ...(query.startDate ? { startDate: query.startDate } : {}),
        ...(query.endDate ? { endDate: query.endDate } : {}),
        ...(query.groupBy ? { groupBy: query.groupBy } : {}),
      });

      return reply.send({ success: true, data: result });
    },
  );

  // PATCH /:merchantId — Update merchant profile
  server.patch(
    '/:merchantId',
    async (
      request: FastifyRequest<{
        Params: { merchantId: string };
        Body: {
          businessName?: string;
          contactName?: string;
          phone?: string;
          walletConfig?: { primaryColor: string; backgroundColor: string; logoUrl?: string };
        };
      }>,
      reply: FastifyReply,
    ) => {
      enforceMerchantAccess(request);
      const { merchantId } = request.params;

      const updateSchema = z.object({
        businessName: z.string().min(2).max(100).optional(),
        contactName: z.string().min(1).optional(),
        phone: z.string().optional(),
        walletConfig: z
          .object({
            primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
            backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
            logoUrl: z.string().url().optional(),
          })
          .optional(),
      });
      const body = updateSchema.parse(request.body);

      const { updateMerchantProfileUseCase } = getContainer();
      const merchant = await updateMerchantProfileUseCase.execute({
        merchantId,
        businessName: body.businessName,
        contactName: body.contactName,
        phone: body.phone,
        walletConfig: body.walletConfig,
      });

      return reply.send({ success: true, data: merchant });
    },
  );

  // POST /:merchantId/logo-upload — Get presigned S3 PUT URL for logo upload
  server.post(
    '/:merchantId/logo-upload',
    async (
      request: FastifyRequest<{
        Params: { merchantId: string };
        Body: { filename: string; contentType: string };
      }>,
      reply: FastifyReply,
    ) => {
      if (request.merchantId && request.params.merchantId !== request.merchantId) {
        throw new ForbiddenError("Cannot access another merchant's data");
      }
      const { merchantId } = request.params;

      const env = EnvironmentConfig.get();
      if (!env.MERCHANT_ASSETS_BUCKET || !env.MERCHANT_ASSETS_URL) {
        return reply.status(501).send({ error: 'Logo upload not configured' });
      }

      const logoUploadSchema = z.object({
        filename: z.string().min(1),
        contentType: z.enum(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']),
      });
      const body = logoUploadSchema.parse(request.body);

      const ext = body.filename.split('.').pop() ?? 'bin';
      const key = `merchants/${merchantId}/logo-${Date.now()}.${ext}`;

      const s3 = new S3Client({ region: env.AWS_REGION });
      const command = new PutObjectCommand({
        Bucket: env.MERCHANT_ASSETS_BUCKET,
        Key: key,
        ContentType: body.contentType,
      });
      const url = await getSignedUrl(s3, command, { expiresIn: 300 });
      const publicUrl = `${env.MERCHANT_ASSETS_URL}/${key}`;

      return reply.send({ url, publicUrl });
    },
  );

  // POST /:merchantId/locations — Add location (PROFESSIONAL/ENTERPRISE only)
  server.post(
    '/:merchantId/locations',
    async (
      request: FastifyRequest<{
        Params: { merchantId: string };
        Body: { name: string; address: string; city: string };
      }>,
      reply: FastifyReply,
    ) => {
      enforceMerchantAccess(request);
      const { merchantId } = request.params;

      const locationSchema = z.object({
        name: z.string().min(1),
        address: z.string().min(1),
        city: z.string().min(1),
      });
      const body = locationSchema.parse(request.body);

      const { addMerchantLocationUseCase } = getContainer();
      const location = await addMerchantLocationUseCase.execute({
        merchantId,
        name: body.name,
        address: body.address,
        city: body.city,
      });

      return reply.status(201).send({ success: true, data: location });
    },
  );

  // GET /:merchantId/perks — List active perks (kept for customer portal)
  server.get(
    '/:merchantId/perks',
    async (request: FastifyRequest<{ Params: { merchantId: string } }>, reply: FastifyReply) => {
      enforceMerchantAccess(request);
      const { merchantId } = request.params;

      const { merchantRepository } = getContainer();
      const merchant = await merchantRepository.findById(merchantId);
      if (!merchant) {
        return reply.status(404).send({ success: false, error: 'Merchant not found' });
      }

      return reply.send({ success: true, data: merchant.getPerks().filter((p) => p.isActive) });
    },
  );

  // GET /:merchantId/customer-insights — Customer targeting insights
  server.get('/:merchantId/customer-insights', handleCustomerInsights);

  // GET /:merchantId/perk-insights — Backward compat alias for customer-insights
  server.get('/:merchantId/perk-insights', handleCustomerInsights);

  // GET /:merchantId/customers/tier-breakdown — Customer count per tier
  server.get(
    '/:merchantId/customers/tier-breakdown',
    async (request: FastifyRequest<{ Params: { merchantId: string } }>, reply: FastifyReply) => {
      enforceMerchantAccess(request);
      const { merchantId } = request.params;

      const container = getContainer();
      const result = await container.customerRepository.findByMerchant(merchantId, { limit: 500 });

      const breakdown: Record<string, number> = {
        BRONZE: 0,
        GOLD: 0,
        PLATINUM: 0,
        DIAMOND: 0,
      };

      for (const customer of result.items) {
        const tier = customer.getCurrentTier().getLevel();
        const current = breakdown[tier];
        if (current !== undefined) {
          breakdown[tier] = current + 1;
        }
      }

      return reply.send({
        success: true,
        data: {
          ...breakdown,
          total: result.items.length,
        },
      });
    },
  );

  // POST /:merchantId/register-customer — Find-or-create customer + enroll + grant consent atomically
  server.post(
    '/:merchantId/register-customer',
    async (
      request: FastifyRequest<{
        Params: { merchantId: string };
        Body: { phone: string; name?: string };
      }>,
      reply: FastifyReply,
    ) => {
      enforceMerchantAccess(request);
      const { merchantId } = request.params;

      const registerSchema = z.object({
        phone: z.string().min(1),
        name: z.string().optional(),
      });
      const body = registerSchema.parse(request.body);

      const { registerCustomerForMerchantUseCase } = getContainer();
      const result = await registerCustomerForMerchantUseCase.execute({
        merchantId,
        phone: body.phone,
        name: body.name,
      });

      return reply
        .status(result.newlyCreated ? 201 : 200)
        .send({ success: true, data: result.customer });
    },
  );

  // POST /:merchantId/enroll-customer — Enroll a customer with this merchant (merchant-auth only)
  server.post(
    '/:merchantId/enroll-customer',
    async (
      request: FastifyRequest<{
        Params: { merchantId: string };
        Body: { customerId: string };
      }>,
      reply: FastifyReply,
    ) => {
      enforceMerchantAccess(request);
      const { merchantId } = request.params;

      const enrollSchema = z.object({
        customerId: z.string().min(1),
      });
      const body = enrollSchema.parse(request.body);

      const container = getContainer();
      const result = await container.enrollCustomerUseCase.execute({
        customerId: body.customerId,
        merchantId,
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

  // POST /:merchantId/gift-points — Gift merchant-scoped points to an enrolled customer
  server.post(
    '/:merchantId/gift-points',
    async (
      request: FastifyRequest<{
        Params: { merchantId: string };
      }>,
      reply: FastifyReply,
    ) => {
      enforceMerchantAccess(request);
      const { merchantId } = request.params;

      const giftSchema = z.object({
        customerId: z.string().min(1),
        points: z.number().int().positive(),
        idempotencyKey: z.string().min(1),
        note: z.string().max(200).optional(),
      });

      const parsed = giftSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.status(400).send({ success: false, error: parsed.error.issues[0]?.message });
      }

      const container = getContainer();
      const result = await container.merchantGiftPointsUseCase.execute({
        merchantId,
        customerId: parsed.data.customerId,
        points: parsed.data.points,
        idempotencyKey: parsed.data.idempotencyKey,
        note: parsed.data.note,
      });

      return reply.send({ success: true, data: result });
    },
  );

  // POST /:merchantId/verify-qr — Verify customer QR code
  server.post(
    '/:merchantId/verify-qr',
    async (
      request: FastifyRequest<{
        Params: { merchantId: string };
        Body: { nonce: string };
      }>,
      reply: FastifyReply,
    ) => {
      enforceMerchantAccess(request);
      const { merchantId } = request.params;

      const verifySchema = z.object({
        nonce: z.string().min(1),
      });
      const body = verifySchema.parse(request.body);

      const container = getContainer();
      const result = await container.generateQRCodeUseCase.verify({
        nonce: body.nonce,
        merchantId,
      });

      return reply.send({ success: true, data: result });
    },
  );
}
