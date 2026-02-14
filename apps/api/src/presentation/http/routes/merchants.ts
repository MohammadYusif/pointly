import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { PhoneNumber, ValidationError } from '../../../domain';
import { ForbiddenError } from '../../../domain/errors/DomainError';
import { getContainer } from '../container';

/** Return only merchant-scoped customer data — strips global points, tiers, and decay info */
function toMerchantCustomerView(customer: ReturnType<typeof Object>, merchantId: string) {
  // biome-ignore lint/suspicious/noExplicitAny: toJSON returns untyped object
  const json = customer as any;
  // biome-ignore lint/suspicious/noExplicitAny: enrollment shape is untyped
  const enrollment = json.enrollments?.find((e: any) => e.merchantId === merchantId);
  return {
    customerId: json.customerId,
    phone: json.phone,
    name: json.name,
    status: json.status,
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
