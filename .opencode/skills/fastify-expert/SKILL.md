---
name: fastify-expert
description: Fastify 5 routes, plugins, request lifecycle, validation, serialization, and error handling for the Pointly API. Load when working with API routes, middleware, or request processing.
---

# Fastify Expert — Pointly API Framework Context

## Environment

- **Framework**: Fastify 5.x
- **Runtime**: Node.js 22.x on AWS Lambda
- **Adapter**: `fastify-aws-lambda` for Lambda integration
- **Architecture**: Clean/DDD — routes → use cases → repositories

## Project Structure

```
apps/api/src/presentation/http/
  server.ts           # Fastify instance creation
  lambda.ts           # Lambda handler wrapper
  routes/             # Route definitions
    index.ts          # Route registration
    merchants.ts      # Merchant endpoints
    customers.ts      # Customer endpoints
    customerSelf.ts   # Customer self-service
    ...
  plugins/            # Fastify plugins
    cognitoAuth.ts    # Merchant JWT auth
    cognitoCustomerAuth.ts  # Customer JWT auth
    errorHandler.ts   # Global error handler
    ...
```

## Server Configuration

```typescript
const server = Fastify({
  logger: { level: 'info', transport: { target: 'pino-pretty' } },
  requestIdHeader: 'x-request-id',
  requestIdLogLabel: 'requestId',
});
```

### Registered Plugins (in order)
1. `@fastify/helmet` — Security headers
2. `@fastify/cors` — CORS configuration
3. `@fastify/rate-limit` — Rate limiting (100 req/min)
4. `cognitoAuthPlugin` — Merchant JWT verification
5. `cognitoCustomerAuthPlugin` — Customer JWT verification
6. `errorHandler` — Global error handler

## Request Lifecycle

```
Request → CORS → Rate Limit → Auth Plugin → Route Handler → Response
                                    ↓
                              onError Hook
                                    ↓
                              Error Handler
```

### Key Hooks
- `onRequest` — Auth verification (via plugins)
- `preHandler` — Request validation
- `onResponse` — Structured audit logging
- `onError` — Error transformation

## Route Definition Pattern

```typescript
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

const schema = {
  params: z.object({ merchantId: z.string() }),
  body: z.object({ phone: z.string() }),
  response: {
    200: z.object({ customerId: z.string(), points: z.number() }),
  },
};

export async function registerRoutes(fastify: FastifyInstance) {
  fastify.post('/:merchantId/customers', {
    schema,
    preHandler: [fastify.authenticate],
    handler: async (request, reply) => {
      const { merchantId } = request.params;
      const { phone } = request.body;
      // ... use case execution
      return reply.send(result);
    },
  });
}
```

## Validation

Fastify uses Zod schemas for request/response validation:

- **params** — URL parameters
- **query** — Query string parameters
- **body** — Request body
- **headers** — Request headers
- **response** — Response shape (per status code)

Validation errors return `400 Bad Request` automatically.

## Error Handling

### Domain Errors
All business logic errors extend `DomainError`:

```typescript
class NotFoundError extends DomainError {
  constructor(message: string) {
    super(message, 404);
  }
}

class UnauthorizedError extends DomainError {
  constructor(message: string) {
    super(message, 401);
  }
}

class ForbiddenError extends DomainError {
  constructor(message: string) {
    super(message, 403);
  }
}
```

### Global Error Handler
Located in `plugins/errorHandler.ts`:
- Catches all unhandled errors
- Transforms `DomainError` to HTTP response
- Logs errors with request context
- Returns generic message for unknown errors (security)

## Authentication Plugins

### Merchant Auth (`cognitoAuth.ts`)
- Verifies JWT from Cognito merchant pool
- Extracts `custom:merchantId` from token
- Decorates request with `request.merchantId`
- Returns 401 for invalid/expired tokens

### Customer Auth (`cognitoCustomerAuth.ts`)
- Verifies JWT from Cognito customer pool
- Extracts `custom:customerId` from token
- Decorates request with `request.customerId`
- Returns 401 for invalid/expired tokens

## Request Decoration

Fastify request object is extended with:

```typescript
interface FastifyRequest {
  merchantId: string;      // From merchant JWT
  customerId: string;      // From customer JWT
  cognitoSub: string;      // Cognito user ID
  cognitoPhone: string;    // Phone from token
  user: DecodedToken;      // Full JWT payload
  customer: DecodedToken;  // Customer JWT payload
}
```

## Serialization

Fastify uses schema-based serialization:
- Response schemas defined in route options
- Automatic serialization based on schema
- Type-safe responses with Zod inference

## Best Practices

1. **Keep routes thin** — delegate to use cases
2. **Validate all inputs** — use Zod schemas
3. **Use domain errors** — not generic Error
4. **Decorate requests** — not global state
5. **Log structured data** — JSON with request IDs
6. **Handle errors globally** — not per-route
7. **Use plugins for cross-cutting concerns** — auth, CORS, rate limiting

## Common Gotchas

1. **Plugin registration order matters** — auth must be before routes
2. **Schema validation is synchronous** — async validation needs preHandler
3. **Reply.send() can only be called once** — use return statement
4. **Lambda cold starts** — initialize outside handler
5. **Request body parsing** — Fastify parses JSON automatically
6. **TypeScript types** — use `FastifyRequest` and `FastifyReply` generics
