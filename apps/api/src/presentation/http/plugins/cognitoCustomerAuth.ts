import type { Secret } from '@fastify/jwt';
import fastifyJwt from '@fastify/jwt';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import fp from 'fastify-plugin';
import jwksRsa from 'jwks-rsa';
import { ForbiddenError, UnauthorizedError } from '../../../domain/errors/DomainError';
import EnvironmentConfig from '../../../infrastructure/config/Environment';
import type { DecodedToken } from '../../../types/fastify';

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

export const cognitoCustomerAuthPlugin = fp(async function cognitoCustomerAuthPlugin(
  server: FastifyInstance,
): Promise<void> {
  const env = EnvironmentConfig.get();
  const region = env.AWS_REGION;
  const userPoolId = env.CUSTOMER_USER_POOL_ID;

  // Always decorate before registering the JWT plugin so the property exists
  // on every request regardless of whether Cognito is configured.
  server.decorateRequest('customerUser', null);
  server.decorateRequest('customerId', '');
  server.decorateRequest('cognitoPhone', '');

  if (!userPoolId) {
    if (env.NODE_ENV === 'production') {
      throw new Error('CUSTOMER_USER_POOL_ID is required in production');
    }
    server.log.warn('CUSTOMER_USER_POOL_ID not set — Customer Cognito auth disabled');
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

  const verifyOptions: { allowedIss: string; allowedAud?: string } = {
    allowedIss: issuer,
  };
  if (env.CUSTOMER_USER_POOL_CLIENT_ID) {
    verifyOptions.allowedAud = env.CUSTOMER_USER_POOL_CLIENT_ID;
  }

  await server.register(fastifyJwt, {
    secret,
    decode: { complete: true },
    verify: verifyOptions,
    namespace: 'customer',
    // Explicitly name the request decorator so the decoded token lands on
    // request.customerUser (not the default request.user which the merchant
    // plugin already owns).
    decoratorName: 'customerUser',
  });
});

export async function verifyCustomerToken(request: FastifyRequest): Promise<void> {
  const env = EnvironmentConfig.get();

  // Skip auth in development when Cognito is not configured
  if (!env.CUSTOMER_USER_POOL_ID) {
    return;
  }

  try {
    await request.customerJwtVerify();
  } catch {
    throw new UnauthorizedError('Invalid or expired customer token');
  }

  const rawUser = request.customerUser;
  const payload = rawUser?.payload ?? (rawUser as unknown as DecodedToken);

  // biome-ignore lint/complexity/useLiteralKeys: DecodedToken index signature requires bracket notation
  if (!payload || payload['token_use'] !== 'id') {
    throw new UnauthorizedError('Invalid token type');
  }

  // biome-ignore lint/complexity/useLiteralKeys: DecodedToken index signature requires bracket notation
  const customerId = payload['custom:customerId'] || payload['sub'];
  if (!customerId) {
    throw new ForbiddenError('No customer ID associated with this account');
  }

  request.customerId = customerId as string;
  // biome-ignore lint/complexity/useLiteralKeys: DecodedToken index signature requires bracket notation
  request.cognitoSub = payload['sub'] as string;
  // biome-ignore lint/complexity/useLiteralKeys: DecodedToken index signature requires bracket notation
  request.cognitoPhone = (payload['phone_number'] as string) || '';
}
