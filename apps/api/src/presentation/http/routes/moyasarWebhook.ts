import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { CompleteMerchantSignupUseCase } from '../../../application/use-cases/CompleteMerchantSignupUseCase';
import { logger } from '../../../lib/logger';
import { getContainer } from '../container';

type MoyasarPayload = { type?: string; data?: { id?: string } };

async function handleInvoicePaid(
  paymentId: string,
  completeMerchantSignupUseCase: CompleteMerchantSignupUseCase,
): Promise<void> {
  try {
    await completeMerchantSignupUseCase.execute({ paymentId });
    logger.info('moyasar_webhook_processed', { paymentId });
  } catch (err) {
    // Log but don't throw — always return 200 so Moyasar doesn't retry
    logger.error('moyasar_webhook_processing_failed', { paymentId, err });
  }
}

function parsePayload(rawBody: string): MoyasarPayload | null {
  try {
    return JSON.parse(rawBody) as MoyasarPayload;
  } catch {
    logger.error('moyasar_webhook_invalid_json');
    return null;
  }
}

/**
 * Moyasar webhook endpoint.
 *
 * Moyasar POSTs JSON to this endpoint when a payment status changes.
 * We capture the raw body as a string so we can verify the HMAC-SHA256
 * signature before processing.
 *
 * Always returns 200 to prevent Moyasar from retrying on transient errors.
 * Real processing errors are logged and the idempotency layer prevents
 * double-processing on legitimate retries.
 */
export async function moyasarWebhookRoutes(server: FastifyInstance): Promise<void> {
  // Capture raw body as string for HMAC verification before JSON parsing
  server.addContentTypeParser('application/json', { parseAs: 'string' }, (_req, body, done) => {
    done(null, body);
  });

  // POST /v1/webhooks/moyasar
  server.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const rawBody = request.body as string;
    const signature = request.headers['x-moyasar-signature'];

    const { paymentService, completeMerchantSignupUseCase } = getContainer();

    if (!paymentService || !completeMerchantSignupUseCase) {
      logger.warn('moyasar_webhook_received_but_service_not_configured');
      return reply.status(200).send({ received: true });
    }

    if (
      typeof signature !== 'string' ||
      !paymentService.verifyWebhookSignature(rawBody, signature)
    ) {
      logger.warn('moyasar_webhook_invalid_signature', { hasSignature: !!signature });
      return reply.status(200).send({ received: true });
    }

    const payload = parsePayload(rawBody);
    if (!payload) return reply.status(200).send({ received: true });

    logger.info('moyasar_webhook_received', { type: payload.type });

    if (payload.type === 'invoice.paid') {
      const paymentId = payload.data?.id;
      if (!paymentId) {
        logger.error('moyasar_webhook_missing_payment_id');
        return reply.status(200).send({ received: true });
      }
      await handleInvoicePaid(paymentId, completeMerchantSignupUseCase);
    }

    return reply.status(200).send({ received: true });
  });
}
