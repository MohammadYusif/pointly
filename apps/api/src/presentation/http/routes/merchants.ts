import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type {
  CreatePerkRequest,
  UpdatePerkRequest,
} from '../../../application/use-cases/ManagePerkUseCase';
import { Customer, type CustomerTierLevel, PhoneNumber, ValidationError } from '../../../domain';
import { ForbiddenError } from '../../../domain/errors/DomainError';
import { getContainer } from '../container';

interface CustomerEnrollmentJSON {
  merchantId: string;
  enrolledAt: string;
  merchantPointsBalance: number;
  merchantLifetimePoints: number;
  transactionCount: number;
  lastTransactionAt: string | undefined;
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
        Body: { businessName?: string; contactName?: string; phone?: string };
      }>,
      reply: FastifyReply,
    ) => {
      enforceMerchantAccess(request);
      const { merchantId } = request.params;

      const updateSchema = z.object({
        businessName: z.string().min(2).max(100).optional(),
        contactName: z.string().min(1).optional(),
        phone: z.string().optional(),
      });
      const body = updateSchema.parse(request.body);

      const container = getContainer();
      const { merchantRepository } = container;

      const merchant = await merchantRepository.findById(merchantId);
      if (!merchant) {
        return reply.status(404).send({ success: false, error: 'Merchant not found' });
      }

      const updates: { businessName?: string; contactName?: string; phone?: PhoneNumber } = {};
      if (body.businessName) updates.businessName = body.businessName;
      if (body.contactName) updates.contactName = body.contactName;
      if (body.phone) {
        try {
          updates.phone = new PhoneNumber(body.phone);
        } catch {
          throw new ValidationError('Invalid Saudi phone number format');
        }
      }

      merchant.updateBusinessInfo(updates);
      await merchantRepository.save(merchant);

      return reply.send({ success: true, data: merchant.toJSON() });
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

      const container = getContainer();
      const { merchantRepository } = container;

      const merchant = await merchantRepository.findById(merchantId);
      if (!merchant) {
        return reply.status(404).send({ success: false, error: 'Merchant not found' });
      }

      const location = merchant.addLocation(body.name, body.address, body.city);
      await merchantRepository.save(merchant);

      return reply.status(201).send({ success: true, data: location });
    },
  );

  // GET /:merchantId/perks — List active perks
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

  // GET /:merchantId/perk-insights — Perk targeting insights
  server.get(
    '/:merchantId/perk-insights',
    async (request: FastifyRequest<{ Params: { merchantId: string } }>, reply: FastifyReply) => {
      enforceMerchantAccess(request);
      const { merchantId } = request.params;

      const container = getContainer();
      const { customerRepository } = container;

      const result = await customerRepository.findByMerchant(merchantId, { limit: 500 });
      const customers = result.items;
      const now = new Date();
      const currentMonth = now.getMonth();
      const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      let birthdayCount = 0;
      let winBackCount = 0;
      let welcomeOfferCount = 0;

      for (const customer of customers) {
        const json = customer.toJSON();

        // Birthday reward: customers with birthday this month
        if (json.dateOfBirth) {
          const birthMonth = new Date(json.dateOfBirth).getMonth();
          if (birthMonth === currentMonth) {
            birthdayCount++;
          }
        }

        // Win-back: customers inactive for 60+ days at this merchant
        const enrollment = json.enrollments?.find(
          (e: { merchantId: string }) => e.merchantId === merchantId,
        );
        if (enrollment) {
          const lastTx = enrollment.lastTransactionAt
            ? new Date(enrollment.lastTransactionAt)
            : null;
          if (!lastTx || lastTx < sixtyDaysAgo) {
            winBackCount++;
          }

          // Welcome offer: enrolled in last 30 days
          const enrolledAt = new Date(enrollment.enrolledAt);
          if (enrolledAt > thirtyDaysAgo) {
            welcomeOfferCount++;
          }
        }
      }

      return reply.send({
        success: true,
        data: {
          birthdayReward: { count: birthdayCount },
          winBack: { count: winBackCount },
          welcomeOffer: { count: welcomeOfferCount },
          totalCustomers: customers.length,
        },
      });
    },
  );

  // POST /:merchantId/perks — Create perk
  server.post(
    '/:merchantId/perks',
    async (
      request: FastifyRequest<{
        Params: { merchantId: string };
        Body: {
          type: string;
          title: string;
          description: string;
          requiredTier: string;
          capacityLimit?: number;
        };
      }>,
      reply: FastifyReply,
    ) => {
      enforceMerchantAccess(request);
      const { merchantId } = request.params;

      const perkSchema = z.object({
        type: z.enum([
          'EARLY_ACCESS',
          'EXCLUSIVE_PRODUCT',
          'EVENT',
          'BIRTHDAY_REWARD',
          'SPEND_BONUS',
          'REFERRAL_BONUS',
          'HAPPY_HOUR',
          'WIN_BACK',
          'WELCOME_OFFER',
        ]),
        title: z.string().min(1).max(100),
        description: z.string().min(1).max(500),
        requiredTier: z.enum(['BRONZE', 'GOLD', 'PLATINUM', 'DIAMOND']),
        capacityLimit: z.number().int().positive().optional(),
      });
      const body = perkSchema.parse(request.body);

      const data: CreatePerkRequest = {
        type: body.type as CreatePerkRequest['type'],
        title: body.title,
        description: body.description,
        requiredTier: body.requiredTier as CustomerTierLevel,
        ...(body.capacityLimit !== undefined && { capacityLimit: body.capacityLimit }),
      };

      const perk = await getContainer().managePerkUseCase.createPerk(merchantId, data);
      return reply.status(201).send({ success: true, data: perk });
    },
  );

  // PATCH /:merchantId/perks/:perkId — Update perk
  server.patch(
    '/:merchantId/perks/:perkId',
    async (
      request: FastifyRequest<{
        Params: { merchantId: string; perkId: string };
        Body: {
          title?: string;
          description?: string;
          requiredTier?: string;
          capacityLimit?: number;
          isActive?: boolean;
        };
      }>,
      reply: FastifyReply,
    ) => {
      enforceMerchantAccess(request);
      const { merchantId, perkId } = request.params;

      const updateSchema = z.object({
        title: z.string().min(1).max(100).optional(),
        description: z.string().min(1).max(500).optional(),
        requiredTier: z.enum(['BRONZE', 'GOLD', 'PLATINUM', 'DIAMOND']).optional(),
        capacityLimit: z.number().int().positive().optional(),
        isActive: z.boolean().optional(),
      });
      const body = updateSchema.parse(request.body);

      const data: UpdatePerkRequest = {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.requiredTier !== undefined && {
          requiredTier: body.requiredTier as CustomerTierLevel,
        }),
        ...(body.capacityLimit !== undefined && { capacityLimit: body.capacityLimit }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      };

      const updated = await getContainer().managePerkUseCase.updatePerk(merchantId, perkId, data);
      return reply.send({ success: true, data: updated });
    },
  );

  // DELETE /:merchantId/perks/:perkId — Soft-delete perk
  server.delete(
    '/:merchantId/perks/:perkId',
    async (
      request: FastifyRequest<{ Params: { merchantId: string; perkId: string } }>,
      reply: FastifyReply,
    ) => {
      enforceMerchantAccess(request);
      const { merchantId, perkId } = request.params;

      await getContainer().managePerkUseCase.deletePerk(merchantId, perkId);
      return reply.send({ success: true });
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

      let normalizedPhone: PhoneNumber;
      try {
        normalizedPhone = new PhoneNumber(body.phone);
      } catch {
        throw new ValidationError(
          'Invalid Saudi phone number format. Use 05XXXXXXXX or +9665XXXXXXXX',
        );
      }

      const container = getContainer();
      const { customerRepository, merchantRepository } = container;

      const merchant = await merchantRepository.findById(merchantId);
      if (!merchant) {
        return reply.status(404).send({ success: false, error: 'Merchant not found' });
      }

      if (!merchant.isVerified()) {
        throw new ValidationError('Merchant is not verified');
      }

      // Find or create customer
      let customer = await customerRepository.findByPhone(normalizedPhone.toE164());
      let newlyCreated = false;

      if (!customer) {
        customer = Customer.create(normalizedPhone, body.name);
        newlyCreated = true;
      }

      // Enroll if not already enrolled (consent is auto-granted)
      const enrollment = customer.getEnrollment(merchantId);
      let customerChanged = newlyCreated;

      if (!enrollment) {
        customer.enrollWithMerchant(merchantId);
        merchant.incrementCustomerCount();
        customerChanged = true;
      }

      if (customerChanged) {
        await container.transactionalWriter.writeAll([
          ...customerRepository.toEnrollmentItems(customer, merchantId),
          ...merchantRepository.toPersistenceItem(merchant),
        ]);
      }

      const scopedView = customer.toMerchantScopedView(merchantId);
      return reply.status(newlyCreated ? 201 : 200).send({ success: true, data: scopedView });
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
