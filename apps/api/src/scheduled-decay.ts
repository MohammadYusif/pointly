import type { ScheduledEvent } from 'aws-lambda';
import { ProcessPointsDecayUseCase } from './application/use-cases/ProcessPointsDecayUseCase';
import EnvironmentConfig from './infrastructure/config/Environment';
import DynamoDBClientFactory from './infrastructure/database/DynamoDBClient';
import {
  CustomerRepository,
  DecayCalculatorService,
  TransactionRepository,
} from './infrastructure/repositories';

export const handler = async (_event: ScheduledEvent) => {
  const env = EnvironmentConfig.get();
  const dbClient = DynamoDBClientFactory.getDocumentClient();

  const customerRepository = new CustomerRepository(dbClient, env.USER_LEDGER_TABLE);
  const transactionRepository = new TransactionRepository(dbClient, env.TRANSACTION_TABLE);
  const decayCalculatorService = new DecayCalculatorService();

  const useCase = new ProcessPointsDecayUseCase(
    customerRepository,
    transactionRepository,
    decayCalculatorService,
  );

  console.log('Starting points decay processing...');
  const result = await useCase.execute();
  console.log('Decay processing complete:', JSON.stringify(result));

  if (result.errors.length > 0) {
    console.error('Decay processing errors:', result.errors);
  }

  return result;
};
