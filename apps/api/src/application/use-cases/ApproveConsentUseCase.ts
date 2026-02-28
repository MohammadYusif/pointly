import { NotFoundError } from '../../domain';
import type { ICustomerRepository } from '../repositories/ICustomerRepository';
import type { IMerchantRepository } from '../repositories/IMerchantRepository';
import type { PersistenceItem } from '../shared/interfaces/BaseRepository';

export interface ApproveConsentRequest {
  merchantId: string;
  customerId: string;
  action: 'approve' | 'deny';
}

export interface ApproveConsentResponse {
  customerId: string;
  merchantId: string;
  consentStatus: string | undefined;
}

/**
 * ApproveConsentUseCase — Approve or deny a customer's pending consent for a merchant.
 *
 * Critical: approval must write the GSI2 merchant index item (MERCHANT_INDEX#<merchantId>)
 * so the customer appears in findByMerchant() queries. Routing through customerRepository.save()
 * only writes the profile item and silently omits the index, making the customer invisible
 * in the merchant's customer list.
 *
 * Flow:
 * 1. Find customer (throws NotFoundError if missing)
 * 2. Find merchant (throws NotFoundError if missing)
 * 3. Grant or revoke consent on the customer aggregate
 * 4. Persist atomically:
 *    - approve → toEnrollmentItems (profile + GSI2 index)
 *    - deny    → toPersistenceItem (profile only; GSI2 cleanup is implicit via save's
 *                deleteStaleIndexItems, but since we're using atomicWrite here we handle
 *                it explicitly by only writing the profile — the stale index will be absent
 *                from the next findByMerchant scan because consentStatus is REVOKED)
 * 5. Return updated consent status
 */
export class ApproveConsentUseCase {
  constructor(
    private customerRepository: ICustomerRepository,
    private merchantRepository: IMerchantRepository,
    private atomicWrite: (items: PersistenceItem[]) => Promise<void>,
  ) {}

  async execute(request: ApproveConsentRequest): Promise<ApproveConsentResponse> {
    const customer = await this.customerRepository.findById(request.customerId);
    if (!customer) {
      throw new NotFoundError('Customer', request.customerId);
    }

    const merchant = await this.merchantRepository.findById(request.merchantId);
    if (!merchant) {
      throw new NotFoundError('Merchant', request.merchantId);
    }

    if (request.action === 'approve') {
      customer.grantConsent(request.merchantId);
      await this.atomicWrite(
        this.customerRepository.toEnrollmentItems(customer, request.merchantId),
      );
    } else {
      customer.revokeConsent(request.merchantId);
      await this.atomicWrite(this.customerRepository.toPersistenceItem(customer));
    }

    return {
      customerId: request.customerId,
      merchantId: request.merchantId,
      consentStatus: customer.getEnrollment(request.merchantId)?.consentStatus,
    };
  }
}
