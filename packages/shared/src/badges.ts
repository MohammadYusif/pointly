/**
 * Transaction type and status badge configuration
 *
 * Single source of truth for how transaction types and statuses
 * are displayed across merchant-dashboard and customer-portal.
 */

export interface BadgeConfig {
  label: string;
  className: string;
}

const TRANSACTION_TYPE_BADGES: Record<string, BadgeConfig> = {
  EARN: { label: 'Earn', className: 'bg-green-100 text-green-800' },
  REDEEM: { label: 'Redeem', className: 'bg-orange-100 text-orange-800' },
  ADJUSTMENT: { label: 'Adjust', className: 'bg-blue-100 text-blue-800' },
  EXPIRATION: { label: 'Expired', className: 'bg-red-100 text-red-800' },
};

const TRANSACTION_STATUS_BADGES: Record<string, BadgeConfig> = {
  COMPLETED: { label: 'Completed', className: 'bg-green-100 text-green-800' },
  PENDING: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800' },
  FAILED: { label: 'Failed', className: 'bg-red-100 text-red-800' },
};

const DEFAULT_BADGE: BadgeConfig = { label: '', className: 'bg-gray-100 text-gray-800' };

export function getTypeBadge(type: string): BadgeConfig {
  return TRANSACTION_TYPE_BADGES[type] ?? { ...DEFAULT_BADGE, label: type };
}

export function getStatusBadge(status: string): BadgeConfig {
  return TRANSACTION_STATUS_BADGES[status] ?? { ...DEFAULT_BADGE, label: status };
}
