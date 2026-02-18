import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getContainer } from '../container';

const getCustomerParamsSchema = z.object({
  customerId: z.string().min(1),
});

const getCustomerTransactionsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  nextToken: z.string().optional(),
  sortOrder: z.enum(['ASC', 'DESC']).optional().default('DESC'),
});

export async function customerRoutes(server: FastifyInstance): Promise<void> {
  // Get customer by ID (scoped to calling merchant)
  server.get(
    '/:customerId',
    async (request: FastifyRequest<{ Params: { customerId: string } }>, reply: FastifyReply) => {
      const { customerId } = getCustomerParamsSchema.parse(request.params);
      const callerMerchantId = request.merchantId;

      const container = getContainer();
      const customerRepository = container.customerRepository;

      const customer = await customerRepository.findById(customerId);

      if (!customer) {
        return reply.status(404).send({
          success: false,
          error: 'Customer not found',
        });
      }

      const json = customer.toJSON();

      // Privacy: strip internal fields and other merchants' data when called by a merchant
      // Keep globalPointsBalance visible — merchants need it for redemption
      if (callerMerchantId) {
        const { globalLifetimePoints, monthlyProgress, globalPointsDecayPhase, decayStartDate, lastDecayAppliedAt, lastNetworkActivity, ...safe } = json;
        return reply.send({
          success: true,
          data: {
            ...safe,
            enrollments: json.enrollments.filter(
              (e: { merchantId: string }) => e.merchantId === callerMerchantId,
            ),
          },
        });
      }

      return reply.send({
        success: true,
        data: json,
      });
    },
  );

  // Get customer by phone (scoped to calling merchant)
  server.get(
    '/phone/:phone',
    async (request: FastifyRequest<{ Params: { phone: string } }>, reply: FastifyReply) => {
      const { phone } = request.params;
      const callerMerchantId = request.merchantId;

      const container = getContainer();
      const customerRepository = container.customerRepository;

      const customer = await customerRepository.findByPhone(phone);

      if (!customer) {
        return reply.status(404).send({
          success: false,
          error: 'Customer not found',
        });
      }

      const json = customer.toJSON();

      if (callerMerchantId) {
        const { globalLifetimePoints, monthlyProgress, globalPointsDecayPhase, decayStartDate, lastDecayAppliedAt, lastNetworkActivity, ...safe } = json;
        return reply.send({
          success: true,
          data: {
            ...safe,
            enrollments: json.enrollments.filter(
              (e: { merchantId: string }) => e.merchantId === callerMerchantId,
            ),
          },
        });
      }

      return reply.send({
        success: true,
        data: json,
      });
    },
  );

  // Get customer transactions (scoped to calling merchant)
  server.get(
    '/:customerId/transactions',
    async (
      request: FastifyRequest<{
        Params: { customerId: string };
        Querystring: { limit?: string; nextToken?: string; sortOrder?: 'ASC' | 'DESC' };
      }>,
      reply: FastifyReply,
    ) => {
      const { customerId } = request.params;
      const query = getCustomerTransactionsQuerySchema.parse(request.query);
      const callerMerchantId = request.merchantId;

      const container = getContainer();
      const transactionRepository = container.transactionRepository;

      const result = await transactionRepository.findByCustomer(customerId, {
        limit: query.limit,
        sortOrder: query.sortOrder,
        ...(query.nextToken && { nextToken: query.nextToken }),
      });

      // Privacy: only return transactions belonging to the calling merchant
      const filtered = callerMerchantId
        ? result.items.filter((t) => t.getMerchantId() === callerMerchantId)
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

  // Get customer stats
  server.get(
    '/:customerId/stats',
    async (request: FastifyRequest<{ Params: { customerId: string } }>, reply: FastifyReply) => {
      const { customerId } = request.params;

      const container = getContainer();
      const transactionRepository = container.transactionRepository;

      const stats = await transactionRepository.getCustomerStats(customerId);

      return reply.send({
        success: true,
        data: stats,
      });
    },
  );
}
