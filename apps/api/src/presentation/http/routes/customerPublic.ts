import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ConflictError, Customer, PhoneNumber, ValidationError } from '../../../domain';
import { getContainer } from '../container';

const createCustomerSchema = z.object({
  phone: z.string().min(1),
  name: z.string().optional(),
});

type CreateCustomerBody = z.infer<typeof createCustomerSchema>;

const enrollCustomerSchema = z.object({
  merchantId: z.string().min(1),
});

type EnrollCustomerBody = z.infer<typeof enrollCustomerSchema>;

const consentSchema = z.object({
  merchantId: z.string().min(1),
  action: z.enum(['grant', 'revoke']),
});

type ConsentBody = z.infer<typeof consentSchema>;

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

  // POST /v1/customers/:customerId/enroll — Enroll at merchant
  server.post(
    '/:customerId/enroll',
    async (
      request: FastifyRequest<{ Params: { customerId: string }; Body: EnrollCustomerBody }>,
      reply: FastifyReply,
    ) => {
      const { customerId } = request.params;
      const body = enrollCustomerSchema.parse(request.body);

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
      merchant.incrementCustomerCount();

      await customerRepository.save(customer);
      await merchantRepository.save(merchant);

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

  // POST /v1/customers/:customerId/consent — Grant/revoke consent
  server.post(
    '/:customerId/consent',
    async (
      request: FastifyRequest<{ Params: { customerId: string }; Body: ConsentBody }>,
      reply: FastifyReply,
    ) => {
      const { customerId } = request.params;
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
