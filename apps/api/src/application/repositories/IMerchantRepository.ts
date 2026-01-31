import type { Merchant, MerchantTier } from '../../domain';
import type {
  BaseRepository,
  QueryOptions,
  QueryResult,
} from '../shared/interfaces/BaseRepository';

export interface IMerchantRepository extends BaseRepository<Merchant> {
  findByEmail(email: string): Promise<Merchant | null>;
  findByPhone(phone: string): Promise<Merchant | null>;
  findVerified(options?: QueryOptions): Promise<QueryResult<Merchant>>;
  findPendingVerification(options?: QueryOptions): Promise<QueryResult<Merchant>>;
  findByTier(tier: MerchantTier, options?: QueryOptions): Promise<QueryResult<Merchant>>;
}
