import type { Customer } from '../../domain';
import type {
  BaseRepository,
  QueryOptions,
  QueryResult,
} from '../shared/interfaces/BaseRepository';

export interface ICustomerRepository extends BaseRepository<Customer> {
  findByPhone(phone: string): Promise<Customer | null>;
  findByMerchant(merchantId: string, options?: QueryOptions): Promise<QueryResult<Customer>>;
  findPendingConsents(merchantId: string, options?: QueryOptions): Promise<QueryResult<Customer>>;
  findAll(options?: QueryOptions): Promise<QueryResult<Customer>>;
  isEnrolled(customerId: string, merchantId: string): Promise<boolean>;
}
