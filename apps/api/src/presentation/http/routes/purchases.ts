import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ForbiddenError } from '../../../domain/errors/DomainError';
import { getContainer } from '../container';

const transactionMetadataSchema = z
  .object({
    receiptNumber: z.string().optional(),
    cashierName: z.string().optional(),
    terminalId: z.string().optional(),
    notes: z.string().optional(),
  })
  .optional();

type TransactionMetadata = z.infer<typeof transactionMetadataSchema>;

/** Strip undefined values so only provided metadata fields are passed downstream. */
function cleanMetadata(metadata: TransactionMetadata) {
  if (!metadata) return undefined;
  return {
    ...(metadata.receiptNumber && { receiptNumber: metadata.receiptNumber }),
    ...(metadata.cashierName && { cashierName: metadata.cashierName }),
    ...(metadata.terminalId && { terminalId: metadata.terminalId }),
    ...(metadata.notes && { notes: metadata.notes }),
  };
}

const redeemPointsSchema = z.object({
  merchantId: z.string().min(1),
  customerId: z.string().min(1),
  pointsToRedeem: z.number().int().positive(),
  idempotencyKey: z.string().min(1),
  locationId: z.string().optional(),
  metadata: transactionMetadataSchema,
});

type RedeemPointsBody = z.infer<typeof redeemPointsSchema>;

const recordPurchaseSchema = z.object({
  merchantId: z.string().min(1),
  customerId: z.string().min(1),
  amount: z.number().positive(),
  idempotencyKey: z.string().min(1),
  locationId: z.string().optional(),
  metadata: transactionMetadataSchema,
});

type RecordPurchaseBody = z.infer<typeof recordPurchaseSchema>;

export async function purchaseRoutes(server: FastifyInstance): Promise<void> {
  server.post(
    '/',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request: FastifyRequest<{ Body: RecordPurchaseBody }>, reply: FastifyReply) => {
      const body = recordPurchaseSchema.parse(request.body);

      // Enforce that merchants can only record purchases for themselves
      if (request.merchantId && body.merchantId !== request.merchantId) {
        throw new ForbiddenError('Cannot record purchases for another merchant');
      }

      const container = getContainer();
      const recordPurchaseUseCase = container.recordPurchaseUseCase;

      const metadata = cleanMetadata(body.metadata);
      const result = await recordPurchaseUseCase.execute({
        merchantId: body.merchantId,
        customerId: body.customerId,
        amountSAR: body.amount,
        idempotencyKey: body.idempotencyKey,
        ...(body.locationId && { locationId: body.locationId }),
        ...(metadata && { metadata }),
      });

      return reply.status(201).send({
        success: true,
        data: result,
      });
    },
  );

  server.post(
    '/redeem',
    { config: { rateLimit: { max: 30, timeWindow: '1 minute' } } },
    async (request: FastifyRequest<{ Body: RedeemPointsBody }>, reply: FastifyReply) => {
      const body = redeemPointsSchema.parse(request.body);

      if (request.merchantId && body.merchantId !== request.merchantId) {
        throw new ForbiddenError('Cannot process redemptions for another merchant');
      }

      const container = getContainer();
      const metadata = cleanMetadata(body.metadata);
      const result = await container.redeemPointsUseCase.execute({
        merchantId: body.merchantId,
        customerId: body.customerId,
        pointsToRedeem: body.pointsToRedeem,
        idempotencyKey: body.idempotencyKey,
        ...(body.locationId && { locationId: body.locationId }),
        ...(metadata && { metadata }),
      });

      return reply.status(201).send({
        success: true,
        data: result,
      });
    },
  );

  server.get(
    '/:transactionId',
    async (request: FastifyRequest<{ Params: { transactionId: string } }>, reply: FastifyReply) => {
      const { transactionId } = request.params;

      const container = getContainer();
      const transactionRepository = container.transactionRepository;

      const transaction = await transactionRepository.findById(transactionId);

      if (!transaction) {
        return reply.status(404).send({
          success: false,
          error: 'Transaction not found',
        });
      }

      return reply.send({
        success: true,
        data: transaction.toJSON(),
      });
    },
  );
}
