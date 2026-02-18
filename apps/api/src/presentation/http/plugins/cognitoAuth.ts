import type { Secret } from '@fastify/jwt';
import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import jwksRsa from 'jwks-rsa';
import { ForbiddenError, UnauthorizedError } from '../../../domain/errors/DomainError';
import EnvironmentConfig from '../../../infrastructure/config/Environment';

let jwksClient: jwksRsa.JwksClient | null = null;

function getJwksClient(region: string, userPoolId: string): jwksRsa.JwksClient {
  if (!jwksClient) {
    jwksClient = jwksRsa({
      jwksUri: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`,
      cache: true,
      cacheMaxAge: 600000, // 10 minutes
      rateLimit: true,
    });
  }
  return jwksClient;
}

export const cognitoAuthPlugin = fp(async function cognitoAuthPlugin(server: FastifyInstance): Promise<void> {
  const env = EnvironmentConfig.get();
  const region = env.AWS_REGION;
  const userPoolId = env.MERCHANT_USER_POOL_ID;

  if (!userPoolId) {
    if (env.NODE_ENV === 'production') {
      throw new Error('MERCHANT_USER_POOL_ID is required in production');
    }
    server.log.warn('MERCHANT_USER_POOL_ID not set — Cognito auth disabled');
    server.decorateRequest('merchantId', '');
    server.decorateRequest('cognitoSub', '');
    return;
  }

  const client = getJwksClient(region, userPoolId);
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
    decode: { complete: true },
    verify: {
      allowedIss: issuer,
    },
  });

  server.decorateRequest('merchantId', '');
  server.decorateRequest('cognitoSub', '');
});

export async function verifyMerchantToken(request: FastifyRequest): Promise<void> {
  const env = EnvironmentConfig.get();

  // Skip auth in development when Cognito is not configured
  if (!env.MERCHANT_USER_POOL_ID) {
    return;
  }

  try {
    await request.jwtVerify();
  } catch (err) {
    request.log.error({ err }, 'JWT verification failed');
    throw new UnauthorizedError('Invalid or expired token');
  }

  // biome-ignore lint/suspicious/noExplicitAny: JWT payload shape varies
  const payload = (request as any).user;

  if (payload.token_use !== 'id') {
    throw new UnauthorizedError('Invalid token type — expected ID token');
  }

  const merchantId = payload['custom:merchantId'];
  if (!merchantId) {
    throw new ForbiddenError('No merchant ID associated with this account');
  }

  request.merchantId = merchantId;
  request.cognitoSub = payload.sub;
}
