import type { ScheduledEvent } from 'aws-lambda';
import { ProcessMerchantPointsExpiryUseCase } from './application/use-cases/ProcessMerchantPointsExpiryUseCase';
import { ProcessPointsDecayUseCase } from './application/use-cases/ProcessPointsDecayUseCase';
import EnvironmentConfig from './infrastructure/config/Environment';
import DynamoDBClientFactory from './infrastructure/database/DynamoDBClient';
import {
  CustomerRepository,
  DecayCalculatorService,
  MerchantRepository,
  SmsPublisherService,
  TransactionRepository,
  TransactionalWriter,
} from './infrastructure/repositories';
import { logger } from './lib/logger';

export const handler = async (_event: ScheduledEvent) => {
  const env = EnvironmentConfig.get();
  const dbClient = DynamoDBClientFactory.getDocumentClient();

  const customerRepository = new CustomerRepository(dbClient, env.USER_LEDGER_TABLE);
  const merchantRepository = new MerchantRepository(dbClient, env.USER_LEDGER_TABLE);
  const transactionRepository = new TransactionRepository(dbClient, env.TRANSACTION_TABLE);
  const decayCalculatorService = new DecayCalculatorService();
  const transactionalWriter = new TransactionalWriter(dbClient);
  const smsPublisherService = new SmsPublisherService(env.SMS_QUEUE_URL, env.AWS_REGION);

  const decayUseCase = new ProcessPointsDecayUseCase(
    customerRepository,
    transactionRepository,
    decayCalculatorService,
    (items) => transactionalWriter.writeAll(items),
    smsPublisherService,
  );

  const expiryUseCase = new ProcessMerchantPointsExpiryUseCase(
    customerRepository,
    merchantRepository,
  );

  logger.info('Starting points decay processing');
  const decayResult = await decayUseCase.execute();
  logger.info('Decay complete', { result: decayResult });

  if (decayResult.errors.length > 0) {
    logger.error('Decay job failed', { error: String(decayResult.errors) });
  }

  logger.info('Starting per-merchant points expiry processing');
  const expiryResult = await expiryUseCase.execute();
  logger.info('Expiry complete', { result: expiryResult });

  if (expiryResult.errors.length > 0) {
    logger.error('Expiry job had errors', { error: String(expiryResult.errors) });
  }

  return { decay: decayResult, expiry: expiryResult };
};
