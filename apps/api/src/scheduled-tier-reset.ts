import * as Sentry from '@sentry/aws-serverless';
import type { ScheduledEvent } from 'aws-lambda';

Sentry.init({
  // biome-ignore lint/complexity/useLiteralKeys: TS noPropertyAccessFromIndexSignature
  dsn: process.env['SENTRY_DSN'],
  // biome-ignore lint/complexity/useLiteralKeys: TS noPropertyAccessFromIndexSignature
  environment: process.env['ENVIRONMENT'] ?? 'dev',
  tracesSampleRate: 0,
});
import { ProcessMonthlyTierResetUseCase } from './application/use-cases/ProcessMonthlyTierResetUseCase';
import EnvironmentConfig from './infrastructure/config/Environment';
import DynamoDBClientFactory from './infrastructure/database/DynamoDBClient';
import { CustomerRepository } from './infrastructure/repositories';
import { logger } from './lib/logger';

export const handler = Sentry.wrapHandler(async (_event: ScheduledEvent) => {
  const env = EnvironmentConfig.get();
  const dbClient = DynamoDBClientFactory.getDocumentClient();

  const customerRepository = new CustomerRepository(dbClient, env.USER_LEDGER_TABLE);

  const useCase = new ProcessMonthlyTierResetUseCase(customerRepository);

  logger.info('Starting monthly tier reset processing');
  const result = await useCase.execute();
  logger.info('Tier reset complete', { result });

  if (result.errors.length > 0) {
    logger.error('Tier reset job failed', { error: String(result.errors) });
  }

  return result;
});
