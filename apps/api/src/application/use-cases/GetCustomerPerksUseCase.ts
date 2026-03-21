import { TIER_ORDER } from '../../domain/config/TierConfig.js';
import type { CampaignEligibilityContext } from '../../domain/entities/Campaign.js';
import type { ICampaignRepository } from '../repositories/ICampaignRepository.js';
import type { IMerchantRepository } from '../repositories/IMerchantRepository.js';
import type { ITransactionRepository } from '../repositories/ITransactionRepository.js';

export interface GetCustomerPerksRequest {
  customerId: string;
  customerTierLevel: string;
  customerTierRank: number;
  enrolledMerchantIds: string[];
  customerJSON: {
    dateOfBirth?: string;
    enrollments: Array<{
      merchantId: string;
      enrolledAt: string;
      lastTransactionAt?: string;
    }>;
  };
}

export interface PerkView {
  perkId: string;
  type: string;
  title: string;
  description: string;
  requiredTier: string;
  capacityLimit?: number;
  isUnlocked: boolean;
  merchantId: string;
  merchantName: string;
  campaignId?: string;
  campaignMessage?: string;
  campaignMultiplier?: number;
  campaignEndDate?: string;
  campaignMinPurchaseAmount?: number;
  campaignMaxUsesPerCustomer?: number;
  campaignUsesRemaining?: number;
  campaignTerms?: string;
  isExhausted?: boolean;
}

function isPerkEligibleForCustomer(
  perkType: string,
  customerJSON: GetCustomerPerksRequest['customerJSON'],
  merchantId: string,
): boolean {
  const now = new Date();

  if (perkType === 'BIRTHDAY_REWARD') {
    const dob = customerJSON.dateOfBirth;
    if (!dob) return false;
    return new Date(dob).getMonth() === now.getMonth();
  }

  if (perkType === 'WIN_BACK') {
    const enrollment = customerJSON.enrollments.find((e) => e.merchantId === merchantId);
    const lastTx = enrollment?.lastTransactionAt;
    if (!lastTx) return true;
    const daysSince = (now.getTime() - new Date(lastTx).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince >= 60;
  }

  if (perkType === 'WELCOME_OFFER') {
    const enrollment = customerJSON.enrollments.find((e) => e.merchantId === merchantId);
    const enrolledAt = enrollment?.enrolledAt;
    if (!enrolledAt) return false;
    const daysSince = (now.getTime() - new Date(enrolledAt).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince <= 30;
  }

  return true;
}

/**
 * Builds the domain eligibility context for a customer at a specific merchant.
 * Used to delegate eligibility decisions to the Campaign entity (DDD: entity owns rules).
 */
function buildEligibilityContext(
  customerJSON: GetCustomerPerksRequest['customerJSON'],
  merchantId: string,
  customerTier: string,
): CampaignEligibilityContext {
  const enrollment = customerJSON.enrollments.find((e) => e.merchantId === merchantId);
  return {
    ...(customerJSON.dateOfBirth !== undefined && { dateOfBirth: customerJSON.dateOfBirth }),
    enrolledAt: enrollment ? new Date(enrollment.enrolledAt) : new Date(0),
    ...(enrollment?.lastTransactionAt !== undefined && {
      lastTransactionAt: new Date(enrollment.lastTransactionAt),
    }),
    customerTier,
  };
}

export class GetCustomerPerksUseCase {
  constructor(
    private merchantRepository: IMerchantRepository,
    private campaignRepository: ICampaignRepository,
    private transactionRepository: ITransactionRepository,
  ) {}

  async execute(request: GetCustomerPerksRequest): Promise<PerkView[]> {
    const { customerId, customerTierRank, enrolledMerchantIds, customerJSON } = request;

    const perksView: PerkView[] = [];

    for (const merchantId of enrolledMerchantIds) {
      const merchant = await this.merchantRepository.findById(merchantId);
      if (!merchant) continue;

      const campaignsResult = await this.campaignRepository.findByMerchant(merchantId);
      const campaignByPerkId = new Map<string, (typeof campaignsResult.items)[number]>();
      for (const c of campaignsResult.items) {
        const perkId = c.getLinkedPerkId();
        if (perkId) campaignByPerkId.set(perkId, c);
      }

      const useCounts = new Map<string, number>();
      if (campaignByPerkId.size > 0) {
        let txNextToken: string | undefined;
        do {
          const txOpts = txNextToken ? { limit: 200, nextToken: txNextToken } : { limit: 200 };
          const txResult = await this.transactionRepository.findByCustomerAndMerchant(
            customerId,
            merchantId,
            txOpts,
          );
          for (const tx of txResult.items) {
            const meta = tx.getMetadata();
            // biome-ignore lint/complexity/useLiteralKeys: TS noPropertyAccessFromIndexSignature requires bracket notation
            const cId = meta['campaignId'];
            if (typeof cId === 'string') {
              useCounts.set(cId, (useCounts.get(cId) ?? 0) + 1);
            }
          }
          txNextToken = txResult.nextToken;
        } while (txNextToken);
      }

      const activePerks = merchant.getPerks().filter((p) => p.isActive);
      for (const perk of activePerks) {
        const linkedCampaign = campaignByPerkId.get(perk.id);

        if (linkedCampaign && (linkedCampaign.isExpired() || !linkedCampaign.getIsActive())) {
          continue;
        }

        // Eligibility: campaign-linked perks delegate to the entity (which owns the rules
        // and reads its own configurable winBackDays/welcomeDays). Standalone perks fall
        // back to the type-based helper with default thresholds.
        if (linkedCampaign) {
          const ctx = buildEligibilityContext(customerJSON, merchantId, request.customerTierLevel);
          if (!linkedCampaign.isEligibleForCustomer(ctx)) continue;
        } else {
          if (!isPerkEligibleForCustomer(perk.type, customerJSON, merchantId)) continue;
        }

        const requiredRank = TIER_ORDER.indexOf(perk.requiredTier);

        let campaignFields: Partial<PerkView> = {};
        if (linkedCampaign) {
          const campaignId = linkedCampaign.getCampaignId();
          const maxUses = linkedCampaign.getMaxUsesPerCustomer();
          const used = useCounts.get(campaignId) ?? 0;
          const isExhausted = maxUses != null && maxUses > 0 && used >= maxUses;

          const message = linkedCampaign.getMessage();
          const minPurchaseAmount = linkedCampaign.getMinPurchaseAmount();
          const termsMessage = linkedCampaign.getTermsMessage();

          campaignFields = {
            campaignId,
            ...(message && { campaignMessage: message }),
            campaignMultiplier: linkedCampaign.getMultiplier(),
            campaignEndDate: linkedCampaign.getEndDate().toISOString(),
            ...(minPurchaseAmount != null && {
              campaignMinPurchaseAmount: minPurchaseAmount,
            }),
            ...(maxUses != null &&
              maxUses > 0 && {
                campaignMaxUsesPerCustomer: maxUses,
                campaignUsesRemaining: Math.max(0, maxUses - used),
              }),
            ...(termsMessage && {
              campaignTerms: termsMessage,
            }),
            isExhausted,
          };
        }

        perksView.push({
          perkId: perk.id,
          type: perk.type,
          title: perk.title,
          description: perk.description,
          requiredTier: perk.requiredTier,
          ...(perk.capacityLimit !== undefined && { capacityLimit: perk.capacityLimit }),
          isUnlocked: customerTierRank >= requiredRank,
          merchantId,
          merchantName: merchant.toJSON().businessName,
          ...campaignFields,
        });
      }
    }

    return perksView;
  }
}
