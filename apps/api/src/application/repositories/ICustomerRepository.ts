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

  /**
   * Returns persistence items for an enrollment write where consent is being granted.
   * Always returns [profile, merchantIndex] as a unit — callers never need to know
   * that two items are required, and can never forget to include the index.
   *
   * Use toPersistenceItem() (profile-only) for all other writes
   * (purchase, redemption, decay) that must stay within the
   * DynamoDB 25-item TransactWriteItems budget.
   */
  toEnrollmentItems(entity: Customer, merchantId: string): PersistenceItem[];
}
