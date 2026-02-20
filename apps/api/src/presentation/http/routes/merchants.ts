import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { Customer, PhoneNumber, ValidationError } from '../../../domain';
import { ForbiddenError } from '../../../domain/errors/DomainError';
import { getContainer } from '../container';

interface CustomerEnrollmentJSON {
  merchantId: string;
  enrolledAt: string;
  consentStatus: string;
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

  // Get pending consents for merchant
  server.get(
    '/:merchantId/pending-consents',
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

      const result = await customerRepository.findPendingConsents(merchantId, {
        limit: query.limit,
        ...(query.nextToken && { nextToken: query.nextToken }),
      });

      return reply.send({
        success: true,
        data: {
          customers: result.items.map((c) => c.toJSON()),
          count: result.count,
          nextToken: result.nextToken,
        },
      });
    },
  );

  // Get merchant analytics
  server.get(
    '/:merchantId/analytics',
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

  // PATCH /:merchantId/pending-consents/:customerId — Approve/deny consent
  server.patch(
    '/:merchantId/pending-consents/:customerId',
    async (
      request: FastifyRequest<{
        Params: { merchantId: string; customerId: string };
        Body: { action: string };
      }>,
      reply: FastifyReply,
    ) => {
      enforceMerchantAccess(request);
      const { merchantId, customerId } = request.params;

      const actionSchema = z.object({
        action: z.enum(['approve', 'deny']),
      });
      const body = actionSchema.parse(request.body);

      const container = getContainer();
      const { customerRepository } = container;

      const customer = await customerRepository.findById(customerId);
      if (!customer) {
        return reply.status(404).send({ success: false, error: 'Customer not found' });
      }

      if (body.action === 'approve') {
        customer.grantConsent(merchantId);
      } else {
        customer.revokeConsent(merchantId);
      }

      await customerRepository.save(customer);

      return reply.send({
        success: true,
        data: {
          customerId,
          merchantId,
          consentStatus: customer.getEnrollment(merchantId)?.consentStatus,
        },
      });
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
        type: z.enum(['EARLY_ACCESS', 'EXCLUSIVE_PRODUCT', 'EVENT']),
        title: z.string().min(1).max(100),
        description: z.string().min(1).max(500),
        requiredTier: z.enum(['BRONZE', 'GOLD', 'PLATINUM', 'DIAMOND']),
        capacityLimit: z.number().int().positive().optional(),
      });
      const body = perkSchema.parse(request.body);

      const { merchantRepository } = getContainer();
      const merchant = await merchantRepository.findById(merchantId);
      if (!merchant) {
        return reply.status(404).send({ success: false, error: 'Merchant not found' });
      }

      const perk = merchant.addPerk({
        type: body.type,
        title: body.title,
        description: body.description,
        requiredTier: body.requiredTier,
        ...(body.capacityLimit !== undefined && { capacityLimit: body.capacityLimit }),
      });
      await merchantRepository.save(merchant);

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

      const { merchantRepository } = getContainer();
      const merchant = await merchantRepository.findById(merchantId);
      if (!merchant) {
        return reply.status(404).send({ success: false, error: 'Merchant not found' });
      }

      merchant.updatePerk(perkId, {
        ...(body.title !== undefined && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.requiredTier !== undefined && { requiredTier: body.requiredTier }),
        ...(body.capacityLimit !== undefined && { capacityLimit: body.capacityLimit }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      });
      await merchantRepository.save(merchant);

      const updated = merchant.getPerks().find((p) => p.id === perkId);
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

      const { merchantRepository } = getContainer();
      const merchant = await merchantRepository.findById(merchantId);
      if (!merchant) {
        return reply.status(404).send({ success: false, error: 'Merchant not found' });
      }

      merchant.removePerk(perkId);
      await merchantRepository.save(merchant);

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
      // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: composite find-or-create + enroll + consent flow
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

      // Enroll and grant consent if needed
      const enrollment = customer.getEnrollment(merchantId);
      let customerChanged = newlyCreated;

      if (!enrollment) {
        customer.enrollWithMerchant(merchantId);
        customer.grantConsent(merchantId);
        merchant.incrementCustomerCount();
        customerChanged = true;
      } else if (enrollment.consentStatus !== 'GRANTED') {
        customer.grantConsent(merchantId);
        customerChanged = true;
      }

      if (customerChanged) {
        await container.transactionalWriter.writeAll([
          ...customerRepository.toPersistenceItem(customer),
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
        Body: { customerId: string; grantConsent?: boolean };
      }>,
      reply: FastifyReply,
    ) => {
      enforceMerchantAccess(request);
      const { merchantId } = request.params;

      const enrollSchema = z.object({
        customerId: z.string().min(1),
        grantConsent: z.boolean().optional().default(false),
      });
      const body = enrollSchema.parse(request.body);

      const container = getContainer();
      const { customerRepository, merchantRepository } = container;

      const customer = await customerRepository.findById(body.customerId);
      if (!customer) {
        return reply.status(404).send({ success: false, error: 'Customer not found' });
      }

      const merchant = await merchantRepository.findById(merchantId);
      if (!merchant) {
        return reply.status(404).send({ success: false, error: 'Merchant not found' });
      }

      if (!merchant.isVerified()) {
        throw new ValidationError('Merchant is not verified');
      }

      customer.enrollWithMerchant(merchantId);
      if (body.grantConsent) {
        customer.grantConsent(merchantId);
      }
      merchant.incrementCustomerCount();

      await container.transactionalWriter.writeAll([
        ...customerRepository.toPersistenceItem(customer),
        ...merchantRepository.toPersistenceItem(merchant),
      ]);

      return reply.status(201).send({
        success: true,
        data: {
          customerId: body.customerId,
          merchantId,
          enrollment: customer.getEnrollment(merchantId),
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
