import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getContainer } from '../container';

const getCustomerParamsSchema = z.object({
  customerId: z.string().min(1),
});

const getCustomerTransactionsQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  nextToken: z.string().optional(),
});

export async function customerRoutes(server: FastifyInstance): Promise<void> {
  // Get customer by ID
  server.get(
    '/:customerId',
    async (request: FastifyRequest<{ Params: { customerId: string } }>, reply: FastifyReply) => {
      const { customerId } = getCustomerParamsSchema.parse(request.params);

      const container = getContainer();
      const customerRepository = container.customerRepository;

      const customer = await customerRepository.findById(customerId);

      if (!customer) {
        return reply.status(404).send({
          success: false,
          error: 'Customer not found',
        });
      }

      return reply.send({
        success: true,
        data: customer.toJSON(),
      });
    },
  );

  // Get customer by phone
  server.get(
    '/phone/:phone',
    async (request: FastifyRequest<{ Params: { phone: string } }>, reply: FastifyReply) => {
      const { phone } = request.params;

      const container = getContainer();
      const customerRepository = container.customerRepository;

      const customer = await customerRepository.findByPhone(phone);

      if (!customer) {
        return reply.status(404).send({
          success: false,
          error: 'Customer not found',
        });
      }

      return reply.send({
        success: true,
        data: customer.toJSON(),
      });
    },
  );

  // Get customer transactions
  server.get(
    '/:customerId/transactions',
    async (
      request: FastifyRequest<{
        Params: { customerId: string };
        Querystring: { limit?: string; nextToken?: string };
      }>,
      reply: FastifyReply,
    ) => {
      const { customerId } = request.params;
      const query = getCustomerTransactionsQuerySchema.parse(request.query);

      const container = getContainer();
      const transactionRepository = container.transactionRepository;

      const result = await transactionRepository.findByCustomer(customerId, {
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
