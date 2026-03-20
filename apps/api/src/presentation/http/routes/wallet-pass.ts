import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { NotFoundError, ValidationError } from '../../../domain/errors/DomainError';
import { getContainer } from '../container';

export async function walletPassRoutes(server: FastifyInstance): Promise<void> {
  server.get(
    '/apple-pass',
    async (
      request: FastifyRequest<{ Querystring: { merchantId?: string } }>,
      reply: FastifyReply,
    ) => {
      const { customerId } = request;
      if (!customerId) {
        throw new ValidationError('Customer ID not found in token');
      }

      const { merchantId } = request.query;
      if (!merchantId) {
        return reply.status(400).send({ success: false, error: 'merchantId is required' });
      }

      const container = getContainer();
      try {
        const result = await container.manageWalletPassUseCase.generateApplePass(
          customerId,
          merchantId,
        );

        if ('status' in result) {
          return reply.status(501).send({ success: false, error: 'Apple Wallet not configured' });
        }

        return reply
          .status(200)
          .header('Content-Type', 'application/vnd.apple.pkpass')
          .header('Content-Disposition', 'attachment; filename="pointly.pkpass"')
          .send(result.buffer);
      } catch (err) {
        if (err instanceof NotFoundError) {
          return reply.status(404).send({ success: false, error: err.message });
        }
        throw err;
      }
    },
  );

  server.get(
    '/google-link',
    async (
      request: FastifyRequest<{ Querystring: { merchantId?: string } }>,
      reply: FastifyReply,
    ) => {
      const { customerId } = request;
      if (!customerId) {
        throw new ValidationError('Customer ID not found in token');
      }

      const { merchantId } = request.query;
      if (!merchantId) {
        return reply.status(400).send({ success: false, error: 'merchantId is required' });
      }

      const container = getContainer();
      try {
        const result = await container.manageWalletPassUseCase.generateGoogleLink(
          customerId,
          merchantId,
        );

        if ('status' in result) {
          return reply.status(501).send({ success: false, error: 'Google Wallet not configured' });
        }

        return reply.redirect(result.url, 302);
      } catch (err) {
        if (err instanceof NotFoundError) {
          return reply.status(404).send({ success: false, error: err.message });
        }
        throw err;
      }
    },
  );
}
