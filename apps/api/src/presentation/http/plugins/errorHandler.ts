import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import { DomainError } from '../../../domain';

interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  code?: string;
  details?: unknown;
}

export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply,
): void {
  request.log.error(error);

  let response: ErrorResponse;

  // Handle Zod validation errors
  if (error instanceof ZodError) {
    response = {
      statusCode: 400,
      error: 'Validation Error',
      message: 'Invalid request data',
      code: 'VALIDATION_ERROR',
      details: error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    };
    reply.status(400).send(response);
    return;
  }

  // Handle all domain errors via base class properties — no subclass switch needed.
  // Each DomainError subclass sets its own statusCode, code, and name in its constructor,
  // so new error types are handled automatically without modifying this file.
  if (error instanceof DomainError) {
    response = {
      statusCode: error.statusCode,
      error: error.name,
      message: error.message,
      code: error.code,
    };
    reply.status(error.statusCode).send(response);
    return;
  }

  // Handle Fastify errors
  if (error.statusCode) {
    response = {
      statusCode: error.statusCode,
      error: error.name || 'Error',
      message: error.message,
    };
    reply.status(error.statusCode).send(response);
    return;
  }

  // Handle unknown errors — never leak internals in production
  // biome-ignore lint/complexity/useLiteralKeys: Index signature requires bracket notation
  const isProduction = process.env['NODE_ENV'] === 'production';

  if (isProduction) {
    reply.status(500).send({ success: false, error: 'Internal server error' });
    return;
  }

  reply.status(500).send({
    statusCode: 500,
    error: 'Internal Server Error',
    message: error.message,
    stack: error.stack,
  });
}
