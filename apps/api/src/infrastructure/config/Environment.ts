import { z } from "zod";

const envSchema = z.object({
  // Environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  ENVIRONMENT: z.string().default("dev"),

  // AWS Region
  AWS_REGION: z.string().default("me-south-1"),

  // DynamoDB Tables
  USER_LEDGER_TABLE: z.string(),
  TRANSACTION_TABLE: z.string(),
  IDEMPOTENCY_TABLE: z.string(),
  QR_NONCE_TABLE: z.string(),
  PENDING_CONSENTS_TABLE: z.string(),
  SMS_QUOTA_TABLE: z.string(),
  WALLET_PASSES_TABLE: z.string().optional(),

  // SQS
  SMS_QUEUE_URL: z.string(),

  // API Configuration
  API_PORT: z.string().default("3000").transform(Number),
  API_HOST: z.string().default("0.0.0.0"),

  // JWT Configuration
  JWT_SECRET: z.string().optional(),
  JWT_EXPIRES_IN: z.string().default("24h"),

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

class EnvironmentConfig {
  private static instance: Environment;

  static load(): Environment {
    if (!this.instance) {
      try {
        this.instance = envSchema.parse(process.env);
      } catch (error) {
        if (error instanceof z.ZodError) {
          console.error("Environment validation failed:");
          console.error(error.errors);
          throw new Error("Invalid environment configuration");
        }
        throw error;
      }
    }
    return this.instance;
  }

  static get(): Environment {
    if (!this.instance) {
      return this.load();
    }
    return this.instance;
  }

  static isProduction(): boolean {
    return this.get().NODE_ENV === "production";
  }

  static isDevelopment(): boolean {
    return this.get().NODE_ENV === "development";
  }

  static isTest(): boolean {
    return this.get().NODE_ENV === "test";
  }

  static isLocal(): boolean {
    return !!this.get().DYNAMODB_ENDPOINT;
  }
}

export default EnvironmentConfig;
