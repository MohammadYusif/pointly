import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import {
  ConflictError,
  DomainError,
  ForbiddenError,
  InsufficientPointsError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../../domain';

interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  code?: string;
  details?: unknown;
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Error handling requires conditional checks
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

  // Handle domain errors
  if (error instanceof DomainError) {
    if (error instanceof ValidationError) {
      response = {
        statusCode: 400,
        error: 'Validation Error',
        message: error.message,
        code: error.code,
      };
    } else if (error instanceof NotFoundError) {
      response = {
        statusCode: 404,
        error: 'Not Found',
        message: error.message,
        code: error.code,
      };
    } else if (error instanceof ConflictError) {
      response = {
        statusCode: 409,
        error: 'Conflict',
        message: error.message,
        code: error.code,
      };
    } else if (error instanceof UnauthorizedError) {
      response = {
        statusCode: 401,
        error: 'Unauthorized',
        message: error.message,
        code: error.code,
      };
    } else if (error instanceof ForbiddenError) {
      response = {
        statusCode: 403,
        error: 'Forbidden',
        message: error.message,
        code: error.code,
      };
    } else if (error instanceof InsufficientPointsError) {
      response = {
        statusCode: 400,
        error: 'Insufficient Points',
        message: error.message,
        code: error.code,
      };
    } else {
      response = {
        statusCode: error.statusCode || 500,
        error: 'Domain Error',
        message: error.message,
        code: error.code,
      };
    }

    reply.status(response.statusCode).send(response);
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
