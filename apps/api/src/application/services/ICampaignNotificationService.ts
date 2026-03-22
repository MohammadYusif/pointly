import type { Campaign } from '../../domain/entities/Campaign';

/**
 * ICampaignNotificationService
 *
 * Abstracts the fan-out notification delivery triggered when a new campaign is
 * created. Decouples campaign persistence (CreateCampaignUseCase) from SMS and
 * push-notification delivery — keeping each concern independently testable.
 */
export interface ICampaignNotificationService {
  /**
   * Send SMS and push notifications to enrolled merchant customers.
   * This is best-effort — implementations must not throw on partial failure.
   */
  notifyCustomers(
    merchantId: string,
    businessName: string,
    campaign: Campaign,
    platformFilter?: 'ios' | 'android' | 'web' | undefined,
  ): Promise<void>;
}
