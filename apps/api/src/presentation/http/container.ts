import type { ICustomerRepository } from '../../application/repositories/ICustomerRepository';
import type { IMerchantRepository } from '../../application/repositories/IMerchantRepository';
import type { IQRNonceRepository } from '../../application/repositories/IQRNonceRepository';
import type { ITransactionRepository } from '../../application/repositories/ITransactionRepository';
import type { IDecayCalculatorService } from '../../application/services/IDecayCalculatorService';
import type { IIdempotencyService } from '../../application/services/IIdempotencyService';
import type { ISmsPublisherService } from '../../application/services/ISmsPublisherService';
import { GenerateQRCodeUseCase } from '../../application/use-cases/GenerateQRCodeUseCase';
import { GetAnalyticsUseCase } from '../../application/use-cases/GetAnalyticsUseCase';
import { ProcessPointsDecayUseCase } from '../../application/use-cases/ProcessPointsDecayUseCase';
import { RecordPurchaseUseCase } from '../../application/use-cases/RecordPurchaseUseCase';
import { RedeemPointsUseCase } from '../../application/use-cases/RedeemPointsUseCase';
import EnvironmentConfig from '../../infrastructure/config/Environment';
import DynamoDBClientFactory from '../../infrastructure/database/DynamoDBClient';
import {
  CustomerRepository,
  DecayCalculatorService,
  IdempotencyService,
  MerchantRepository,
  SmsPublisherService,
  TransactionRepository,
  TransactionalWriter,
} from '../../infrastructure/repositories';
import { QRNonceRepository } from '../../infrastructure/repositories/QRNonceRepository';

export interface Container {
  // Repositories
  customerRepository: ICustomerRepository;
  merchantRepository: IMerchantRepository;
  transactionRepository: ITransactionRepository;
  qrNonceRepository: IQRNonceRepository;

  // Services
  idempotencyService: IIdempotencyService;
  decayCalculatorService: IDecayCalculatorService;
  smsPublisherService: ISmsPublisherService;

  // Use Cases
  recordPurchaseUseCase: RecordPurchaseUseCase;
  redeemPointsUseCase: RedeemPointsUseCase;
  processPointsDecayUseCase: ProcessPointsDecayUseCase;
  getAnalyticsUseCase: GetAnalyticsUseCase;
  generateQRCodeUseCase: GenerateQRCodeUseCase;
}

let container: Container | null = null;

export function createContainer(): Container {
  const env = EnvironmentConfig.get();
  const dbClient = DynamoDBClientFactory.getDocumentClient();

  // Create repositories
  const customerRepository = new CustomerRepository(dbClient, env.USER_LEDGER_TABLE);
  const merchantRepository = new MerchantRepository(dbClient, env.USER_LEDGER_TABLE);
  const transactionRepository = new TransactionRepository(dbClient, env.TRANSACTION_TABLE);
  const qrNonceRepository = new QRNonceRepository(dbClient, env.QR_NONCE_TABLE);

  // Create services
  const idempotencyService = new IdempotencyService(dbClient, env.IDEMPOTENCY_TABLE);
  const decayCalculatorService = new DecayCalculatorService();
  const smsPublisherService = new SmsPublisherService(env.SMS_QUEUE_URL, env.AWS_REGION);
  const transactionalWriter = new TransactionalWriter(dbClient);

  // Create use cases
  const recordPurchaseUseCase = new RecordPurchaseUseCase(
    customerRepository,
    merchantRepository,
    transactionRepository,
    idempotencyService,
    smsPublisherService,
    (items) => transactionalWriter.writeAll(items),
  );

  const redeemPointsUseCase = new RedeemPointsUseCase(
    customerRepository,
    merchantRepository,
    transactionRepository,
    idempotencyService,
  );

  const processPointsDecayUseCase = new ProcessPointsDecayUseCase(
    customerRepository,
    transactionRepository,
    decayCalculatorService,
  );

  // Create analytics use case
  const getAnalyticsUseCase = new GetAnalyticsUseCase(merchantRepository, transactionRepository);

  // Create QR code use case
  const generateQRCodeUseCase = new GenerateQRCodeUseCase(customerRepository, qrNonceRepository);

  return {
    customerRepository,
    merchantRepository,
    transactionRepository,
    qrNonceRepository,
    idempotencyService,
    decayCalculatorService,
    smsPublisherService,
    recordPurchaseUseCase,
    redeemPointsUseCase,
    processPointsDecayUseCase,
    getAnalyticsUseCase,
    generateQRCodeUseCase,
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
