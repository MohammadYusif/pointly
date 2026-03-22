import type { ICampaignRepository } from '../../application/repositories/ICampaignRepository';
import type { ICustomerRepository } from '../../application/repositories/ICustomerRepository';
import type { IMerchantRepository } from '../../application/repositories/IMerchantRepository';
import type { IPushSubscriptionRepository } from '../../application/repositories/IPushSubscriptionRepository';
import type { IQRNonceRepository } from '../../application/repositories/IQRNonceRepository';
import type { ITransactionRepository } from '../../application/repositories/ITransactionRepository';
import type { IWebhookConfigRepository } from '../../application/repositories/IWebhookConfigRepository';
import type { IDecayCalculatorService } from '../../application/services/IDecayCalculatorService';
import type { IIdempotencyService } from '../../application/services/IIdempotencyService';
import type { IOutgoingWebhookService } from '../../application/services/IOutgoingWebhookService';
import type { IPushNotificationService } from '../../application/services/IPushNotificationService';
import type { ISmsPublisherService } from '../../application/services/ISmsPublisherService';
import { AddMerchantLocationUseCase } from '../../application/use-cases/AddMerchantLocationUseCase';
import { CheckChallengeEligibilityUseCase } from '../../application/use-cases/CheckChallengeEligibilityUseCase';
import { CreateCustomerUseCase } from '../../application/use-cases/CreateCustomerUseCase';
import { DeleteCustomerAccountUseCase } from '../../application/use-cases/DeleteCustomerAccountUseCase';
import { EnrollCustomerUseCase } from '../../application/use-cases/EnrollCustomerUseCase';
import { GenerateQRCodeUseCase } from '../../application/use-cases/GenerateQRCodeUseCase';
import { GetAnalyticsUseCase } from '../../application/use-cases/GetAnalyticsUseCase';
import { GetCustomerInsightsUseCase } from '../../application/use-cases/GetCustomerInsightsUseCase';
import { GetCustomerPerksUseCase } from '../../application/use-cases/GetCustomerPerksUseCase';
import { GiftPointsUseCase } from '../../application/use-cases/GiftPointsUseCase';
import { ManageCampaignUseCase } from '../../application/use-cases/ManageCampaignUseCase';
import { ManagePerkUseCase } from '../../application/use-cases/ManagePerkUseCase';
import { ManagePushSubscriptionUseCase } from '../../application/use-cases/ManagePushSubscriptionUseCase';
import { ManageWalletPassUseCase } from '../../application/use-cases/ManageWalletPassUseCase';
import { MerchantGiftPointsUseCase } from '../../application/use-cases/MerchantGiftPointsUseCase';
import { ProcessMonthlyTierResetUseCase } from '../../application/use-cases/ProcessMonthlyTierResetUseCase';
import { ProcessPointsDecayUseCase } from '../../application/use-cases/ProcessPointsDecayUseCase';
import { RecordPurchaseUseCase } from '../../application/use-cases/RecordPurchaseUseCase';
import { RedeemPointsUseCase } from '../../application/use-cases/RedeemPointsUseCase';
import { RegisterCustomerForMerchantUseCase } from '../../application/use-cases/RegisterCustomerForMerchantUseCase';
import { SetupCustomerAccountUseCase } from '../../application/use-cases/SetupCustomerAccountUseCase';
import { UpdateCustomerProfileUseCase } from '../../application/use-cases/UpdateCustomerProfileUseCase';
import { UpdateMerchantProfileUseCase } from '../../application/use-cases/UpdateMerchantProfileUseCase';
import EnvironmentConfig from '../../infrastructure/config/Environment';
import DynamoDBClientFactory from '../../infrastructure/database/DynamoDBClient';
import {
  CampaignRepository,
  CustomerRepository,
  DecayCalculatorService,
  IdempotencyService,
  MerchantRepository,
  OutgoingWebhookService,
  SmsPublisherService,
  TransactionRepository,
  TransactionalWriter,
  WebhookConfigRepository,
} from '../../infrastructure/repositories';
import { PushSubscriptionRepository } from '../../infrastructure/repositories/PushSubscriptionRepository';
import { QRNonceRepository } from '../../infrastructure/repositories/QRNonceRepository';
import { CognitoUserService } from '../../infrastructure/services/CognitoUserService';
import { WebPushService } from '../../infrastructure/services/WebPushService';

export interface Container {
  // Repositories
  customerRepository: ICustomerRepository;
  merchantRepository: IMerchantRepository;
  transactionRepository: ITransactionRepository;
  qrNonceRepository: IQRNonceRepository;
  campaignRepository: ICampaignRepository;
  webhookConfigRepository: IWebhookConfigRepository;
  pushSubscriptionRepository: IPushSubscriptionRepository;

  // Services
  idempotencyService: IIdempotencyService;
  decayCalculatorService: IDecayCalculatorService;
  smsPublisherService: ISmsPublisherService;
  outgoingWebhookService: IOutgoingWebhookService;
  webPushService: IPushNotificationService;

  // Use Cases
  createCustomerUseCase: CreateCustomerUseCase;
  updateCustomerProfileUseCase: UpdateCustomerProfileUseCase;
  setupCustomerAccountUseCase: SetupCustomerAccountUseCase;
  deleteCustomerAccountUseCase: DeleteCustomerAccountUseCase;
  updateMerchantProfileUseCase: UpdateMerchantProfileUseCase;
  addMerchantLocationUseCase: AddMerchantLocationUseCase;
  registerCustomerForMerchantUseCase: RegisterCustomerForMerchantUseCase;
  enrollCustomerUseCase: EnrollCustomerUseCase;
  managePerkUseCase: ManagePerkUseCase;
  manageCampaignUseCase: ManageCampaignUseCase;
  checkChallengeEligibilityUseCase: CheckChallengeEligibilityUseCase;
  recordPurchaseUseCase: RecordPurchaseUseCase;
  redeemPointsUseCase: RedeemPointsUseCase;
  processPointsDecayUseCase: ProcessPointsDecayUseCase;
  processMonthlyTierResetUseCase: ProcessMonthlyTierResetUseCase;
  getAnalyticsUseCase: GetAnalyticsUseCase;
  generateQRCodeUseCase: GenerateQRCodeUseCase;
  managePushSubscriptionUseCase: ManagePushSubscriptionUseCase;
  manageWalletPassUseCase: ManageWalletPassUseCase;
  getCustomerPerksUseCase: GetCustomerPerksUseCase;
  getCustomerInsightsUseCase: GetCustomerInsightsUseCase;
  giftPointsUseCase: GiftPointsUseCase;
  merchantGiftPointsUseCase: MerchantGiftPointsUseCase;
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
  const campaignRepository = new CampaignRepository(dbClient, env.USER_LEDGER_TABLE);
  const webhookConfigRepository = new WebhookConfigRepository(dbClient, env.USER_LEDGER_TABLE);
  const pushSubscriptionRepository = new PushSubscriptionRepository(
    dbClient,
    env.WALLET_PASSES_TABLE ?? 'pointly-wallet-passes',
  );

  // Create services
  const idempotencyService = new IdempotencyService(dbClient, env.IDEMPOTENCY_TABLE);
  const decayCalculatorService = new DecayCalculatorService();
  const smsPublisherService = new SmsPublisherService(env.SMS_QUEUE_URL, env.AWS_REGION);
  const outgoingWebhookService = new OutgoingWebhookService();
  const transactionalWriter = new TransactionalWriter(dbClient);
  const webPushService = new WebPushService(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  );

  // Create use cases
  const enrollCustomerUseCase = new EnrollCustomerUseCase(
    customerRepository,
    merchantRepository,
    (items) => transactionalWriter.writeAll(items),
  );

  const checkChallengeEligibilityUseCase = new CheckChallengeEligibilityUseCase(
    customerRepository,
    transactionRepository,
    (items) => transactionalWriter.writeAll(items),
  );

  const manageCampaignUseCase = new ManageCampaignUseCase(
    merchantRepository,
    campaignRepository,
    (items) => transactionalWriter.writeAll(items),
    customerRepository,
    smsPublisherService,
    pushSubscriptionRepository,
    webPushService,
  );

  const recordPurchaseUseCase = new RecordPurchaseUseCase(
    customerRepository,
    merchantRepository,
    transactionRepository,
    idempotencyService,
    (items) => transactionalWriter.writeAll(items),
    smsPublisherService,
    campaignRepository,
    checkChallengeEligibilityUseCase,
  );

  const redeemPointsUseCase = new RedeemPointsUseCase(
    customerRepository,
    merchantRepository,
    transactionRepository,
    idempotencyService,
    (items) => transactionalWriter.writeAll(items),
    webhookConfigRepository,
    outgoingWebhookService,
  );

  const processPointsDecayUseCase = new ProcessPointsDecayUseCase(
    customerRepository,
    transactionRepository,
    decayCalculatorService,
    (items) => transactionalWriter.writeAll(items),
    smsPublisherService,
  );

  const managePerkUseCase = new ManagePerkUseCase(merchantRepository, (items) =>
    transactionalWriter.writeAll(items),
  );

  const processMonthlyTierResetUseCase = new ProcessMonthlyTierResetUseCase(customerRepository);

  const createCustomerUseCase = new CreateCustomerUseCase(customerRepository);
  const updateCustomerProfileUseCase = new UpdateCustomerProfileUseCase(customerRepository);
  const setupCustomerAccountUseCase = new SetupCustomerAccountUseCase(customerRepository);

  const cognitoUserService = env.CUSTOMER_USER_POOL_ID
    ? new CognitoUserService(env.CUSTOMER_USER_POOL_ID, env.AWS_REGION ?? 'me-south-1')
    : null;
  const deleteCustomerAccountUseCase = new DeleteCustomerAccountUseCase(
    customerRepository,
    cognitoUserService,
  );

  const updateMerchantProfileUseCase = new UpdateMerchantProfileUseCase(merchantRepository);
  const addMerchantLocationUseCase = new AddMerchantLocationUseCase(merchantRepository);
  const registerCustomerForMerchantUseCase = new RegisterCustomerForMerchantUseCase(
    customerRepository,
    merchantRepository,
    (items) => transactionalWriter.writeAll(items),
  );

  // Create analytics use case
  const getAnalyticsUseCase = new GetAnalyticsUseCase(merchantRepository, transactionRepository);

  // Create QR code use case
  const generateQRCodeUseCase = new GenerateQRCodeUseCase(customerRepository, qrNonceRepository);

  const managePushSubscriptionUseCase = new ManagePushSubscriptionUseCase(
    pushSubscriptionRepository,
    env.VAPID_PUBLIC_KEY,
    customerRepository,
    (items) => transactionalWriter.writeAll(items),
  );

  const manageWalletPassUseCase = new ManageWalletPassUseCase(
    customerRepository,
    merchantRepository,
    env,
  );

  const getCustomerPerksUseCase = new GetCustomerPerksUseCase(
    merchantRepository,
    campaignRepository,
    transactionRepository,
  );

  const getCustomerInsightsUseCase = new GetCustomerInsightsUseCase(customerRepository);

  const giftPointsUseCase = new GiftPointsUseCase(
    customerRepository,
    transactionRepository,
    idempotencyService,
    (items) => transactionalWriter.writeAll(items),
  );

  const merchantGiftPointsUseCase = new MerchantGiftPointsUseCase(
    customerRepository,
    transactionRepository,
    idempotencyService,
    (items) => transactionalWriter.writeAll(items),
  );

  return {
    customerRepository,
    merchantRepository,
    transactionRepository,
    qrNonceRepository,
    campaignRepository,
    webhookConfigRepository,
    pushSubscriptionRepository,
    idempotencyService,
    decayCalculatorService,
    smsPublisherService,
    outgoingWebhookService,
    webPushService,
    createCustomerUseCase,
    updateCustomerProfileUseCase,
    setupCustomerAccountUseCase,
    deleteCustomerAccountUseCase,
    updateMerchantProfileUseCase,
    addMerchantLocationUseCase,
    registerCustomerForMerchantUseCase,
    enrollCustomerUseCase,
    managePerkUseCase,
    manageCampaignUseCase,
    checkChallengeEligibilityUseCase,
    recordPurchaseUseCase,
    redeemPointsUseCase,
    processPointsDecayUseCase,
    processMonthlyTierResetUseCase,
    getAnalyticsUseCase,
    generateQRCodeUseCase,
    managePushSubscriptionUseCase,
    manageWalletPassUseCase,
    getCustomerPerksUseCase,
    getCustomerInsightsUseCase,
    giftPointsUseCase,
    merchantGiftPointsUseCase,
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
