import { z } from 'zod';

const envSchema = z.object({
  // Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  ENVIRONMENT: z.string().default('dev'),

  // AWS Region
  AWS_REGION: z.string().default('me-south-1'),

  // DynamoDB Tables
  USER_LEDGER_TABLE: z.string(),
  TRANSACTION_TABLE: z.string(),
  IDEMPOTENCY_TABLE: z.string(),
  QR_NONCE_TABLE: z.string(),
  PENDING_CONSENTS_TABLE: z.string().optional(),
  SMS_QUOTA_TABLE: z.string(),
  WALLET_PASSES_TABLE: z.string().optional(),

  // SQS
  SMS_QUEUE_URL: z.string(),

  // API Configuration
  API_PORT: z.string().default('3000').transform(Number),
  API_HOST: z.string().default('0.0.0.0'),

  // JWT Configuration
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default('24h'),

  // Cognito
  MERCHANT_USER_POOL_ID: z.string().optional(),
  MERCHANT_USER_POOL_CLIENT_ID: z.string().optional(),
  CUSTOMER_USER_POOL_ID: z.string().optional(),
  CUSTOMER_USER_POOL_CLIENT_ID: z.string().optional(),

  // Local Development
  DYNAMODB_ENDPOINT: z.string().optional(),

  // AWS SDK
  AWS_NODEJS_CONNECTION_REUSE_ENABLED: z.string().optional(),
});

export type Environment = z.infer<typeof envSchema>;

let instance: Environment;

function load(): Environment {
  if (!instance) {
    try {
      instance = envSchema.parse(process.env);
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Environment validation failed:');
        console.error(error.errors);
        throw new Error('Invalid environment configuration');
      }
      throw error;
    }
  }
  return instance;
}

function get(): Environment {
  if (!instance) {
    return load();
  }
  return instance;
}

function isProduction(): boolean {
  return get().NODE_ENV === 'production';
}

function isDevelopment(): boolean {
  return get().NODE_ENV === 'development';
}

function isTest(): boolean {
  return get().NODE_ENV === 'test';
}

function isLocal(): boolean {
  return !!get().DYNAMODB_ENDPOINT;
}

const EnvironmentConfig = {
  load,
  get,
  isProduction,
  isDevelopment,
  isTest,
  isLocal,
};

export default EnvironmentConfig;
