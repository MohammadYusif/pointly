// Use Cases
export {
  EnrollCustomerUseCase,
  type EnrollCustomerRequest,
  type EnrollCustomerResponse,
} from './use-cases/EnrollCustomerUseCase';
export {
  RecordPurchaseUseCase,
  type RecordPurchaseRequest,
  type RecordPurchaseResponse,
} from './use-cases/RecordPurchaseUseCase';
export {
  RedeemPointsUseCase,
  type RedeemPointsRequest,
  type RedeemPointsResponse,
} from './use-cases/RedeemPointsUseCase';
export {
  ProcessPointsDecayUseCase,
  type DecayProcessingResult,
} from './use-cases/ProcessPointsDecayUseCase';
export {
  ProcessMonthlyTierResetUseCase,
  type TierResetResult,
} from './use-cases/ProcessMonthlyTierResetUseCase';

// Repository Interfaces
export type { ICustomerRepository } from './repositories/ICustomerRepository';
export type { IMerchantRepository } from './repositories/IMerchantRepository';
export type {
  ITransactionRepository,
  TransactionStats,
} from './repositories/ITransactionRepository';

// Service Interfaces
export type { IIdempotencyService } from './services/IIdempotencyService';
export type {
  IDecayCalculatorService,
  DecayWarning,
} from './services/IDecayCalculatorService';

// Shared Interfaces
export type {
  BaseRepository,
  QueryOptions,
  QueryResult,
} from './shared/interfaces/BaseRepository';
