import type { ScheduledEvent } from 'aws-lambda';
import { ProcessPointsDecayUseCase } from './application/use-cases/ProcessPointsDecayUseCase';
import EnvironmentConfig from './infrastructure/config/Environment';
import DynamoDBClientFactory from './infrastructure/database/DynamoDBClient';
import {
  CustomerRepository,
  DecayCalculatorService,
  SmsPublisherService,
  TransactionRepository,
  TransactionalWriter,
} from './infrastructure/repositories';
import { logger } from './lib/logger';

export const handler = async (_event: ScheduledEvent) => {
  const env = EnvironmentConfig.get();
  const dbClient = DynamoDBClientFactory.getDocumentClient();

  const customerRepository = new CustomerRepository(dbClient, env.USER_LEDGER_TABLE);
  const transactionRepository = new TransactionRepository(dbClient, env.TRANSACTION_TABLE);
  const decayCalculatorService = new DecayCalculatorService();
  const transactionalWriter = new TransactionalWriter(dbClient);
  const smsPublisherService = new SmsPublisherService(env.SMS_QUEUE_URL, env.AWS_REGION);

  const useCase = new ProcessPointsDecayUseCase(
    customerRepository,
    transactionRepository,
    decayCalculatorService,
    (items) => transactionalWriter.writeAll(items),
    smsPublisherService,
  );

  logger.info('Starting points decay processing');
  const result = await useCase.execute();
  logger.info('Decay complete', { result });

  if (result.errors.length > 0) {
    logger.error('Decay job failed', { error: String(result.errors) });
  }

  return result;
};
