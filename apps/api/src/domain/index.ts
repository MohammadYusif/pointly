// Value Objects
export { PhoneNumber } from './value-objects/PhoneNumber';
export { Email } from './value-objects/Email';
export { Money } from './value-objects/Money';
export { Points } from './value-objects/Points';
export { CustomerTier, CustomerTierLevel } from './value-objects/CustomerTier'; // NEW
export type { TierThresholds } from './value-objects/CustomerTier'; // NEW

// Entities
export { Customer, CustomerStatus, ConsentStatus } from './entities/Customer';
export type { CustomerProps, CustomerEnrollment } from './entities/Customer';

export { Merchant, MerchantStatus, MerchantTier } from './entities/Merchant';
export type {
  MerchantProps,
  LoyaltyConfiguration,
  SMSQuota,
  LocationInfo,
  PointsCalculation,
} from './entities/Merchant';

export {
  Transaction,
  TransactionType,
  TransactionStatus,
} from './entities/Transaction';
export type {
  TransactionProps,
  TransactionMetadata,
} from './entities/Transaction';

// Errors
export {
  DomainError,
  ValidationError,
  NotFoundError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  InsufficientPointsError,
} from './errors/DomainError';
