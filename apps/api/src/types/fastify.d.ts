import 'fastify';

export interface DecodedToken {
  sub: string;
  'cognito:username': string;
  'custom:merchantId'?: string;
  'custom:customerId'?: string;
  'custom:businessName'?: string;
  'custom:phone'?: string;
  email?: string;
  name?: string;
  phone_number?: string;
  token_use?: string;
  [key: string]: unknown;
}

export interface JwtTokenWrapper {
  header: Record<string, unknown>;
  payload: DecodedToken;
  signature: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    merchantId: string;
    customerId: string;
    cognitoSub: string;
    cognitoPhone: string;
    user: DecodedToken;
    customer: DecodedToken;
    customerUser: JwtTokenWrapper | null;
    customerJwtVerify(): Promise<void>;
  }
}
