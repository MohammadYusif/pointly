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

export interface ITransactionRepository extends BaseRepository<Transaction> {
  findByIdempotencyKey(idempotencyKey: string): Promise<Transaction | null>;
  findByCustomer(customerId: string, options?: QueryOptions): Promise<QueryResult<Transaction>>;
  findByMerchant(merchantId: string, options?: QueryOptions): Promise<QueryResult<Transaction>>;
  findByCustomerAndMerchant(
    customerId: string,
    merchantId: string,
    options?: QueryOptions,
  ): Promise<QueryResult<Transaction>>;
  getMerchantStats(merchantId: string): Promise<TransactionStats>;
  getCustomerStats(customerId: string): Promise<TransactionStats>;
}
