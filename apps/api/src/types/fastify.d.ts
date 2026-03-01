import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    merchantId: string;
    customerId: string;
    cognitoSub: string;
    cognitoPhone: string;
  }
}
