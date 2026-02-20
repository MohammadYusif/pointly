import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ConflictError, Customer, PhoneNumber, ValidationError } from '../../../domain';
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

      let phone: PhoneNumber;
      try {
        phone = new PhoneNumber(body.phone);
      } catch {
        throw new ValidationError(
          'Invalid Saudi phone number format. Use 05XXXXXXXX or +9665XXXXXXXX',
        );
      }

      const container = getContainer();
      const { customerRepository } = container;

      // Check if customer already exists
      const existing = await customerRepository.findByPhone(phone.toE164());
      if (existing) {
        throw new ConflictError(
          `Customer with phone ${body.phone} already exists (ID: ${existing.getCustomerId()})`,
        );
      }

      const customer = Customer.create(phone, body.name);
      await customerRepository.save(customer);

      return reply.status(201).send({
        success: true,
        data: customer.toJSON(),
      });
    },
  );
}
