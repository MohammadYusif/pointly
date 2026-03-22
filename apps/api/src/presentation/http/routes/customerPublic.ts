import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getContainer } from '../container';

const createCustomerSchema = z.object({
  phone: z.string().min(1),
  name: z.string().optional(),
});

type CreateCustomerBody = z.infer<typeof createCustomerSchema>;

export async function customerPublicRoutes(server: FastifyInstance): Promise<void> {
  // POST /v1/customers — Create customer account (PUBLIC)
  server.post(
    '/',
    async (request: FastifyRequest<{ Body: CreateCustomerBody }>, reply: FastifyReply) => {
      const body = createCustomerSchema.parse(request.body);
      const { createCustomerUseCase } = getContainer();
      const customer = await createCustomerUseCase.execute({ phone: body.phone, name: body.name });
      return reply.status(201).send({ success: true, data: customer });
    },
  );
}
