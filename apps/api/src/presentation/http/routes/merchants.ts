import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ForbiddenError } from '../../../domain/errors/DomainError';
import { getContainer } from '../container';

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
          customers: result.items.map((c) => c.toJSON()),
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
        Querystring: { limit?: string; nextToken?: string };
      }>,
      reply: FastifyReply,
    ) => {
      enforceMerchantAccess(request);
      const { merchantId } = request.params;
      const query = getMerchantCustomersQuerySchema.parse(request.query);

      const container = getContainer();
      const transactionRepository = container.transactionRepository;

      const result = await transactionRepository.findByMerchant(merchantId, {
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
}
