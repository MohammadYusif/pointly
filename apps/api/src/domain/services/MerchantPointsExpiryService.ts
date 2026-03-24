import type { Customer } from '../entities/Customer';

/**
 * MerchantPointsExpiryService
 *
 * Evaluates per-merchant configurable point expiry windows and applies
 * expiry to enrolled customer balances.
 *
 * KSA Ministry of Commerce compliance: merchantPointsExpiryDays must be >= 365.
 * The minimum is enforced at the Merchant domain level (setMerchantPointsExpiry).
 * This service only applies expiry when the merchant has explicitly opted in
 * (expiryDays is set on the loyalty config). `undefined` = no expiry (always legal).
 *
 * This is SEPARATE from the global 12/18-month inactivity decay (CustomerDecayService).
 * - Global decay: operates on globalPointsBalance (inactivity across the whole network)
 * - This service: operates on per-merchant merchantPointsBalance per CustomerEnrollment
 */
export class MerchantPointsExpiryService {
  /**
   * Return the list of merchantIds whose enrollment points should be expired for this customer.
   *
   * @param customer        The customer aggregate to inspect
   * @param merchantExpiryMap  Map from merchantId → expiryDays (only merchants that opted in)
   */
  getExpiredMerchantIds(customer: Customer, merchantExpiryMap: Map<string, number>): string[] {
    if (merchantExpiryMap.size === 0) return [];

    const expired: string[] = [];
    const json = customer.toJSON();

    for (const enrollment of json.enrollments) {
      const expiryDays = merchantExpiryMap.get(enrollment.merchantId);
      if (!expiryDays) continue; // Merchant not opted in

      // Reference date: lastTransactionAt if set, otherwise enrolledAt (conservative)
      const refDateStr = enrollment.lastTransactionAt ?? enrollment.enrolledAt;
      const refDate = new Date(refDateStr);
      if (Number.isNaN(refDate.getTime())) continue;

      const ageMs = Date.now() - refDate.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);

      if (ageDays > expiryDays) {
        expired.push(enrollment.merchantId);
      }
    }

    return expired;
  }

  /**
   * Apply expiry to the customer by zeroing the merchant points balance
   * for each merchantId in the expired list.
   */
  applyExpiry(customer: Customer, expiredMerchantIds: string[]): void {
    for (const merchantId of expiredMerchantIds) {
      customer.expireMerchantPoints(merchantId);
    }
  }
}
