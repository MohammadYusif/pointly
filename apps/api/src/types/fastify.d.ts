import 'fastify';

interface DecodedToken {
  sub: string;
  'cognito:username': string;
  'custom:merchantId'?: string;
  'custom:customerId'?: string;
  'custom:businessName'?: string;
  'custom:phone'?: string;
  email?: string;
  name?: string;
  phone_number?: string;
  [key: string]: unknown;
}

declare module 'fastify' {
  interface FastifyRequest {
    merchantId: string;
    customerId: string;
    cognitoSub: string;
    cognitoPhone: string;
    user: DecodedToken;
    customer: DecodedToken;
  }
}
