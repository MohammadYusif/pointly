import type { Customer } from '../../domain';
import type {
  BaseRepository,
  PersistenceItem,
  QueryOptions,
  QueryResult,
} from '../shared/interfaces/BaseRepository';

export interface ICustomerRepository extends BaseRepository<Customer> {
  findByPhone(phone: string): Promise<Customer | null>;
  findByMerchant(merchantId: string, options?: QueryOptions): Promise<QueryResult<Customer>>;
  findPendingConsents(merchantId: string, options?: QueryOptions): Promise<QueryResult<Customer>>;
  findAll(options?: QueryOptions): Promise<QueryResult<Customer>>;
  isEnrolled(customerId: string, merchantId: string): Promise<boolean>;
  /** Return the GSI2 adjacency-list index item for a single merchant enrollment.
   *  Returns null if the enrollment is missing or consent is not GRANTED.
   *  Use this (not toPersistenceItem) to write the index item during enrollment. */
  toMerchantIndexItem(entity: Customer, merchantId: string): PersistenceItem | null;
}
