import type { ScheduledEvent } from 'aws-lambda';
import { ProcessMonthlyTierResetUseCase } from './application/use-cases/ProcessMonthlyTierResetUseCase';
import EnvironmentConfig from './infrastructure/config/Environment';
import DynamoDBClientFactory from './infrastructure/database/DynamoDBClient';
import { CustomerRepository, TransactionalWriter } from './infrastructure/repositories';

export const handler = async (_event: ScheduledEvent) => {
  const env = EnvironmentConfig.get();
  const dbClient = DynamoDBClientFactory.getDocumentClient();

  const customerRepository = new CustomerRepository(dbClient, env.USER_LEDGER_TABLE);
  const transactionalWriter = new TransactionalWriter(dbClient);

  const useCase = new ProcessMonthlyTierResetUseCase(customerRepository, (items) =>
    transactionalWriter.writeAll(items),
  );

  console.log('Starting monthly tier reset processing...');
  const result = await useCase.execute();
  console.log('Tier reset complete:', JSON.stringify(result));

  if (result.errors.length > 0) {
    console.error('Tier reset errors:', result.errors);
  }

  return result;
};
