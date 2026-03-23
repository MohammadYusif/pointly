import type { ScheduledEvent } from 'aws-lambda';
import { ProcessMonthlyTierResetUseCase } from './application/use-cases/ProcessMonthlyTierResetUseCase';
import EnvironmentConfig from './infrastructure/config/Environment';
import DynamoDBClientFactory from './infrastructure/database/DynamoDBClient';
import { CustomerRepository } from './infrastructure/repositories';
import { logger } from './lib/logger';

export const handler = async (_event: ScheduledEvent) => {
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
};
