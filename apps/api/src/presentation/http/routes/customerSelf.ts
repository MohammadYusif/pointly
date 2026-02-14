import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ValidationError } from '../../../domain/errors/DomainError';
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
      const { customerRepository, merchantRepository } = container;

      const customer = await customerRepository.findById(customerId);
      if (!customer) {
        return reply.status(404).send({ success: false, error: 'Customer not found' });
      }

      const merchant = await merchantRepository.findById(body.merchantId);
      if (!merchant) {
        return reply.status(404).send({ success: false, error: 'Merchant not found' });
      }

      if (!merchant.isVerified()) {
        throw new ValidationError('Merchant is not verified');
      }

      customer.enrollWithMerchant(body.merchantId);
      await customerRepository.save(customer);

      return reply.status(201).send({
        success: true,
        data: {
          customerId,
          merchantId: body.merchantId,
          enrollment: customer.getEnrollment(body.merchantId),
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
      const { customerRepository } = container;

      const customer = await customerRepository.findById(customerId);
      if (!customer) {
        return reply.status(404).send({ success: false, error: 'Customer not found' });
      }

      if (body.action === 'grant') {
        customer.grantConsent(body.merchantId);
      } else {
        customer.revokeConsent(body.merchantId);
      }

      await customerRepository.save(customer);

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
}
