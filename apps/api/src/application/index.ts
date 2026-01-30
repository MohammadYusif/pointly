// Use Cases
export {
  RecordPurchaseUseCase,
  RecordPurchaseRequest,
  RecordPurchaseResponse,
} from "./use-cases/RecordPurchaseUseCase";
export {
  ProcessPointsDecayUseCase,
  DecayProcessingResult,
} from "./use-cases/ProcessPointsDecayUseCase";

// Repository Interfaces
export { ICustomerRepository } from "./repositories/ICustomerRepository";
export { IMerchantRepository } from "./repositories/IMerchantRepository";
export {
  ITransactionRepository,
  TransactionStats,
} from "./repositories/ITransactionRepository";

// Service Interfaces
export { IIdempotencyService } from "./services/IIdempotencyService";
export {
  IDecayCalculatorService,
  DecayWarning,
} from "./services/IDecayCalculatorService";

// Shared Interfaces
export {
  BaseRepository,
  QueryOptions,
  QueryResult,
} from "./shared/interfaces/BaseRepository";
