import type { ICustomerRepository } from '../../application/repositories/ICustomerRepository';
import type { IPushSubscriptionRepository } from '../../application/repositories/IPushSubscriptionRepository';
import type { ICampaignNotificationService } from '../../application/services/ICampaignNotificationService';
import type { IPushNotificationService } from '../../application/services/IPushNotificationService';
import type {
  ISmsPublisherService,
  SmsMessage,
} from '../../application/services/ISmsPublisherService';
import type { Campaign } from '../../domain/entities/Campaign';

/**
 * CampaignNotificationService
 *
 * Infrastructure implementation of ICampaignNotificationService.
 * Sends SMS and push notifications to enrolled merchant customers when a new
 * campaign is created. All failures are caught internally — this is best-effort.
 */
export class CampaignNotificationService implements ICampaignNotificationService {
  constructor(
    private customerRepository: ICustomerRepository,
    private smsPublisherService: ISmsPublisherService,
    private pushSubscriptionRepository: IPushSubscriptionRepository,
    private pushNotificationService: IPushNotificationService,
  ) {}

  async notifyCustomers(
    merchantId: string,
    businessName: string,
    campaign: Campaign,
    platformFilter?: 'ios' | 'android' | 'web' | undefined,
  ): Promise<void> {
    const endDate = campaign.getEndDate().toLocaleDateString('en-SA');
    const customMessage = campaign.getMessage();
    const defaultBody = `${businessName}: ${campaign.getName()} — earn ${campaign.getMultiplier()}x points! Valid until ${endDate}`;

    // SMS fan-out — only to customers who opted in to marketing SMS (CITC / PDPL compliance)
    const result = await this.customerRepository.findByMerchant(merchantId, { limit: 200 });
    const optedIn = result.items.filter((c) => c.getSmsMarketingOptIn());
    if (optedIn.length > 0) {
      const messages: SmsMessage[] = optedIn.map((customer) => ({
        phone: customer.getPhone().toE164(),
        body: customMessage ? `${businessName}: ${customMessage}` : defaultBody,
        merchantId,
        type: 'CAMPAIGN_NOTIFICATION' as const,
      }));
      await this.smsPublisherService.publishBatch(messages);
    }

    // Push notification fan-out
    const subscriptions = await this.pushSubscriptionRepository.findAll(platformFilter);
    if (subscriptions.length > 0) {
      await this.pushNotificationService.sendBatch(subscriptions, {
        title: campaign.getName(),
        body: customMessage ?? defaultBody,
      });
    }
  }
}
