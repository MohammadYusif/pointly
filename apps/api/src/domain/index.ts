// Tier Configuration (single source of truth)
export {
  CustomerTierLevel,
  TIER_CONFIG,
  TIER_ORDER,
  VALID_TIER_LEVELS,
  DEFAULT_TIER,
  MAX_TIER,
} from './config/TierConfig';
export type { TierThresholds } from './config/TierConfig';

// Value Objects
export { PhoneNumber } from './value-objects/PhoneNumber';
export { Email } from './value-objects/Email';
export { Money } from './value-objects/Money';
export { Points } from './value-objects/Points';
export { CustomerTier } from './value-objects/CustomerTier';

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
  PerkType,
  WalletConfig,
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

export { Campaign } from './entities/Campaign';
export type { CampaignProps } from './entities/Campaign';

export { WebhookConfig, SUPPORTED_WEBHOOK_EVENTS } from './entities/WebhookConfig';
export type { WebhookConfigProps, WebhookEventType } from './entities/WebhookConfig';

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
