import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  ConflictError,
  Email,
  Merchant,
  MerchantTier,
  PhoneNumber,
  ValidationError,
} from '../../../domain';
import { getContainer } from '../container';

const createMerchantSchema = z.object({
  businessName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(1),
  contactName: z.string().min(1),
  tier: z.enum(['BASIC', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
});

type CreateMerchantBody = z.infer<typeof createMerchantSchema>;

export async function merchantPublicRoutes(server: FastifyInstance): Promise<void> {
  // POST /v1/merchants — Create merchant account (PUBLIC)
  server.post(
    '/',
    async (request: FastifyRequest<{ Body: CreateMerchantBody }>, reply: FastifyReply) => {
      const body = createMerchantSchema.parse(request.body);

      let email: Email;
      let phone: PhoneNumber;

      try {
        email = new Email(body.email);
      } catch {
        throw new ValidationError('Invalid email format');
      }

      try {
        phone = new PhoneNumber(body.phone);
      } catch {
        throw new ValidationError(
          'Invalid Saudi phone number format. Use 05XXXXXXXX or +9665XXXXXXXX',
        );
      }

      const container = getContainer();
      const { merchantRepository } = container;

      // Validate email uniqueness
      const existingByEmail = await merchantRepository.findByEmail(body.email);
      if (existingByEmail) {
        throw new ConflictError(`Merchant with email ${body.email} already exists`);
      }

      // Validate phone uniqueness
      const existingByPhone = await merchantRepository.findByPhone(phone.toE164());
      if (existingByPhone) {
        throw new ConflictError(`Merchant with phone ${body.phone} already exists`);
      }

      const tier = body.tier ? MerchantTier[body.tier] : MerchantTier.BASIC;

      const merchant = Merchant.create(body.businessName, email, phone, body.contactName, tier);

      await merchantRepository.save(merchant);

      return reply.status(201).send({
        success: true,
        data: merchant.toJSON(),
      });
    },
  );
}
