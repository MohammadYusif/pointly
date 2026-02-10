import type { ICustomerRepository } from '../../application/repositories/ICustomerRepository';
import type { IMerchantRepository } from '../../application/repositories/IMerchantRepository';
import type { ITransactionRepository } from '../../application/repositories/ITransactionRepository';
import type { IIdempotencyService } from '../../application/services/IIdempotencyService';
import { GetAnalyticsUseCase } from '../../application/use-cases/GetAnalyticsUseCase';
import { RecordPurchaseUseCase } from '../../application/use-cases/RecordPurchaseUseCase';
import EnvironmentConfig from '../../infrastructure/config/Environment';
import DynamoDBClientFactory from '../../infrastructure/database/DynamoDBClient';
import {
  CustomerRepository,
  IdempotencyService,
  MerchantRepository,
  TransactionRepository,
} from '../../infrastructure/repositories';

export interface Container {
  // Repositories
  customerRepository: ICustomerRepository;
  merchantRepository: IMerchantRepository;
  transactionRepository: ITransactionRepository;

  // Services
  idempotencyService: IIdempotencyService;

  // Use Cases
  recordPurchaseUseCase: RecordPurchaseUseCase;
  getAnalyticsUseCase: GetAnalyticsUseCase;
}

let container: Container | null = null;

export function createContainer(): Container {
  const env = EnvironmentConfig.get();
  const dbClient = DynamoDBClientFactory.getDocumentClient();

  // Create repositories
  const customerRepository = new CustomerRepository(dbClient, env.USER_LEDGER_TABLE);
  const merchantRepository = new MerchantRepository(dbClient, env.USER_LEDGER_TABLE);
  const transactionRepository = new TransactionRepository(dbClient, env.TRANSACTION_TABLE);

  // Create services
  const idempotencyService = new IdempotencyService(dbClient, env.IDEMPOTENCY_TABLE);

  // Create use cases
  const recordPurchaseUseCase = new RecordPurchaseUseCase(
    customerRepository,
    merchantRepository,
    transactionRepository,
    idempotencyService,
  );

  // Create analytics use case
  const getAnalyticsUseCase = new GetAnalyticsUseCase(merchantRepository, transactionRepository);

  return {
    customerRepository,
    merchantRepository,
    transactionRepository,
    idempotencyService,
    recordPurchaseUseCase,
    getAnalyticsUseCase,
  };
}

export function getContainer(): Container {
  if (!container) {
    container = createContainer();
  }
  return container;
}

export function resetContainer(): void {
  container = null;
}
