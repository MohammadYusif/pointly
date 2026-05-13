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
import type { PlanType } from '../../../domain/config/PlanPrices';
import { getContainer } from '../container';

const createMerchantSchema = z.object({
  businessName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().min(1),
  contactName: z.string().min(1),
  tier: z.enum(['BASIC', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
});

type CreateMerchantBody = z.infer<typeof createMerchantSchema>;

const ALLOWED_CALLBACK_ORIGINS = [
  'https://pointly.sa',
  'https://merchant.pointly.sa',
  'https://app.pointly.sa',
];

const initiateSignupSchema = z.object({
  businessName: z.string().min(2).max(100),
  contactName: z.string().min(1).max(100),
  email: z.string().email(),
  phone: z.string().min(1),
  plan: z.enum(['BASIC', 'PROFESSIONAL', 'ENTERPRISE']),
  callbackUrl: z
    .string()
    .url()
    .refine(
      (url) => {
        try {
          const parsed = new URL(url);
          return ALLOWED_CALLBACK_ORIGINS.some((origin) => parsed.origin === origin);
        } catch {
          return false;
        }
      },
      { message: 'callbackUrl must be a valid Pointly domain' },
    ),
});

type InitiateSignupBody = z.infer<typeof initiateSignupSchema>;

export async function merchantPublicRoutes(server: FastifyInstance): Promise<void> {
  // GET /v1/merchants — List all verified merchants (PUBLIC, for customer discovery)
  server.get('/', async (_request: FastifyRequest, reply: FastifyReply) => {
    const container = getContainer();
    const result = await container.merchantRepository.findVerified({ limit: 100 });
    const merchants = result.items.map((m) => {
      const json = m.toJSON();
      return {
        merchantId: json.merchantId,
        businessName: json.businessName,
        loyaltyConfig: {
          pointsPerSAR: json.loyaltyConfig.pointsPerSAR,
          welcomeBonus: json.loyaltyConfig.welcomeBonus,
          redemptionRate: json.loyaltyConfig.redemptionRate,
        },
        locations: json.locations
          .filter((l) => l.isActive)
          .map((l) => ({ name: l.name, city: l.city })),
        totalCustomers: json.totalCustomers,
        activePerks: json.activePerks
          .filter((p) => p.isActive)
          .map((p) => ({ title: p.title, type: p.type, requiredTier: p.requiredTier })),
      };
    });
    return reply.send({ success: true, data: merchants });
  });

  // GET /v1/merchants/info/:id — Get single merchant detail (PUBLIC)
  // Uses /info/:id to avoid collision with merchant-auth GET /:merchantId
  server.get(
    '/info/:id',
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      const { id } = request.params;
      const container = getContainer();
      const merchant = await container.merchantRepository.findById(id);

      if (!merchant || merchant.toJSON().status !== 'ACTIVE') {
        return reply.status(404).send({ success: false, error: 'Merchant not found' });
      }

      const json = merchant.toJSON();
      return reply.send({
        success: true,
        data: {
          merchantId: json.merchantId,
          businessName: json.businessName,
          loyaltyConfig: {
            pointsPerSAR: json.loyaltyConfig.pointsPerSAR,
            welcomeBonus: json.loyaltyConfig.welcomeBonus,
            redemptionRate: json.loyaltyConfig.redemptionRate,
          },
          locations: json.locations
            .filter((l) => l.isActive)
            .map((l) => ({
              locationId: l.locationId,
              name: l.name,
              address: l.address,
              city: l.city,
            })),
          totalCustomers: json.totalCustomers,
          activePerks: json.activePerks
            .filter((p) => p.isActive)
            .map((p) => ({
              id: p.id,
              type: p.type,
              title: p.title,
              description: p.description,
              requiredTier: p.requiredTier,
              capacityLimit: p.capacityLimit,
              isActive: p.isActive,
              createdAt: p.createdAt,
            })),
        },
      });
    },
  );

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

  // POST /v1/merchants/initiate-signup — Start Moyasar-gated merchant signup (PUBLIC)
  server.post(
    '/initiate-signup',
    async (request: FastifyRequest<{ Body: InitiateSignupBody }>, reply: FastifyReply) => {
      const body = initiateSignupSchema.parse(request.body);
      const container = getContainer();

      if (!container.initiateMerchantSignupUseCase) {
        return reply.status(503).send({ success: false, error: 'Payment service not configured' });
      }

      const result = await container.initiateMerchantSignupUseCase.execute({
        businessName: body.businessName,
        contactName: body.contactName,
        email: body.email,
        phone: body.phone,
        plan: body.plan as PlanType,
        callbackUrl: body.callbackUrl,
      });

      return reply.status(201).send({ success: true, data: result });
    },
  );

  // GET /v1/merchants/signup-status?paymentId=xxx — Poll signup status (PUBLIC)
  server.get(
    '/signup-status',
    async (
      request: FastifyRequest<{ Querystring: { paymentId?: string } }>,
      reply: FastifyReply,
    ) => {
      const { paymentId } = request.query;

      if (!paymentId) {
        return reply.status(400).send({ success: false, error: 'paymentId is required' });
      }

      const container = getContainer();

      if (!container.getSignupStatusUseCase) {
        return reply.status(503).send({ success: false, error: 'Payment service not configured' });
      }

      const result = await container.getSignupStatusUseCase.execute(paymentId);
      return reply.send({ success: true, data: result });
    },
  );
}
