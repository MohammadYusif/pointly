import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    merchantId: string;
    cognitoSub: string;
  }
}
