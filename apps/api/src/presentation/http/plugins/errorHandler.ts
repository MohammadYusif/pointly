import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { DomainError } from '../../../domain';

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  request.log.error(error);

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    const details = error.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
    reply.status(400).send({
      success: false,
      error: `Invalid request data: ${details.map((d) => d.message).join(', ')}`,
    });
    return;
  }

  // Handle all domain errors via base class properties — no subclass switch needed.
  // Each DomainError subclass sets its own statusCode, code, and name in its constructor,
  // so new error types are handled automatically without modifying this file.
  if (error instanceof DomainError) {
    reply.status(error.statusCode).send({
      success: false,
      error: error.message,
    });
    return;
  }

  // Handle Fastify errors
  if (error.statusCode) {
    reply.status(error.statusCode).send({
      success: false,
      error: error.message,
    });
    return;
  }

  // Handle unknown errors — never leak internals in production
  // biome-ignore lint/complexity/useLiteralKeys: Index signature requires bracket notation
  const isProduction = process.env['NODE_ENV'] === 'production';

  reply.status(500).send({
    success: false,
    error: isProduction ? 'Internal server error' : error.message,
  });
}
