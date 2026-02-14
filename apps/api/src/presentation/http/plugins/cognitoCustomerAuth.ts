import type { Secret } from '@fastify/jwt';
import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import jwksRsa from 'jwks-rsa';
import { ForbiddenError, UnauthorizedError } from '../../../domain/errors/DomainError';
import EnvironmentConfig from '../../../infrastructure/config/Environment';

let customerJwksClient: jwksRsa.JwksClient | null = null;

function getCustomerJwksClient(region: string, userPoolId: string): jwksRsa.JwksClient {
  if (!customerJwksClient) {
    customerJwksClient = jwksRsa({
      jwksUri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
      cache: true,
      cacheMaxAge: 600000,
      rateLimit: true,
    });
  }
  return customerJwksClient;
}

export async function cognitoCustomerAuthPlugin(server: FastifyInstance): Promise<void> {
  const env = EnvironmentConfig.get();
  const region = env.AWS_REGION;
  const userPoolId = env.CUSTOMER_USER_POOL_ID;

  if (!userPoolId) {
    server.log.warn('CUSTOMER_USER_POOL_ID not set — Customer Cognito auth disabled');
    server.decorateRequest('customerId', '');
    return;
  }

  const client = getCustomerJwksClient(region, userPoolId);
  const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

  const secret = (async (_request: FastifyRequest, tokenOrHeader: Record<string, unknown>) => {
    // biome-ignore lint/complexity/useLiteralKeys: TS noPropertyAccessFromIndexSignature requires bracket notation
    const header = tokenOrHeader['header'] as { kid?: string } | undefined;
    const kid = header ? header.kid : (tokenOrHeader as { kid?: string }).kid;
    if (!kid) {
      throw new UnauthorizedError('Missing kid in token header');
    }
    const key = await client.getSigningKey(kid);
    return key.getPublicKey();
  }) as Secret;

  await server.register(fastifyJwt, {
    secret,
    verify: {
      allowedIss: issuer,
    },
    namespace: 'customer',
  });

  server.decorateRequest('customerId', '');
}

export async function verifyCustomerToken(request: FastifyRequest): Promise<void> {
  const env = EnvironmentConfig.get();

  // Skip auth in development when Cognito is not configured
  if (!env.CUSTOMER_USER_POOL_ID) {
    return;
  }

  try {
    // biome-ignore lint/suspicious/noExplicitAny: namespace-based JWT verification
    await (request as any).customerJwtVerify();
  } catch {
    throw new UnauthorizedError('Invalid or expired customer token');
  }

  // biome-ignore lint/suspicious/noExplicitAny: JWT payload shape varies
  const payload = (request as any).customerUser;

  if (payload.token_use !== 'access') {
    throw new UnauthorizedError('Invalid token type');
  }

  const customerId = payload['custom:customerId'] || payload.sub;
  if (!customerId) {
    throw new ForbiddenError('No customer ID associated with this account');
  }

  request.customerId = customerId;
  request.cognitoSub = payload.sub;
}
