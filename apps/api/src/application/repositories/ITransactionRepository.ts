import type { Transaction } from '../../domain';
import type {
  BaseRepository,
  QueryOptions,
  QueryResult,
} from '../shared/interfaces/BaseRepository';

export interface TransactionStats {
  totalTransactions: number;
  totalPointsEarned: number;
  totalPointsRedeemed: number;
  averageTransactionValue: number;
}

export interface AnalyticsQuery {
  startDate: string;
  endDate: string;
  groupBy?: 'day' | 'week' | 'month';
}

export interface AnalyticsDataPoint {
  period: string;
  transactionCount: number;
  earnCount: number;
  redeemCount: number;
  revenue: number;
  pointsEarned: number;
  pointsRedeemed: number;
  uniqueCustomers: number;
}

export interface AnalyticsData {
  summary: {
    totalTransactions: number;
    totalRevenue: number;
    totalPointsEarned: number;
    totalPointsRedeemed: number;
    uniqueCustomers: number;
    averageTransactionValue: number;
  };
  trends: AnalyticsDataPoint[];
}

export interface ITransactionRepository extends BaseRepository<Transaction> {
  findByIdempotencyKey(idempotencyKey: string): Promise<Transaction | null>;
  findByCustomer(customerId: string, options?: QueryOptions): Promise<QueryResult<Transaction>>;
  findByMerchant(merchantId: string, options?: QueryOptions): Promise<QueryResult<Transaction>>;
  findByMerchantAndLocation(
    merchantId: string,
    locationId: string,
    options?: QueryOptions,
  ): Promise<QueryResult<Transaction>>;
  findByCustomerAndMerchant(
    customerId: string,
    merchantId: string,
    options?: QueryOptions,
  ): Promise<QueryResult<Transaction>>;
  getMerchantStats(merchantId: string): Promise<TransactionStats>;
  getCustomerStats(customerId: string, merchantId?: string): Promise<TransactionStats>;
  getMerchantAnalytics(merchantId: string, query: AnalyticsQuery): Promise<AnalyticsData>;
  getLocationAnalytics(
    merchantId: string,
    locationId: string,
    query: AnalyticsQuery,
  ): Promise<AnalyticsData>;
}
