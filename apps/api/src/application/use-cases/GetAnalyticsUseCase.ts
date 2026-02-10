import { NotFoundError, ValidationError } from '../../domain';
import type { IMerchantRepository } from '../repositories/IMerchantRepository';
import type {
  AnalyticsData,
  AnalyticsQuery,
  ITransactionRepository,
} from '../repositories/ITransactionRepository';

export interface GetAnalyticsRequest {
  merchantId: string;
  locationId?: string;
  startDate?: string;
  endDate?: string;
  groupBy?: 'day' | 'week' | 'month';
}

export class GetAnalyticsUseCase {
  private static readonly MAX_RANGE_DAYS: Record<string, number> = {
    day: 90,
    week: 365,
    month: 730,
  };

  constructor(
    private merchantRepository: IMerchantRepository,
    private transactionRepository: ITransactionRepository,
  ) {}

  async execute(request: GetAnalyticsRequest): Promise<AnalyticsData> {
    const merchant = await this.merchantRepository.findById(request.merchantId);
    if (!merchant) {
      throw new NotFoundError('Merchant', request.merchantId);
    }

    if (request.locationId) {
      const locations = merchant.getLocations();
      const location = locations.find((l) => l.locationId === request.locationId);
      if (!location) {
        throw new NotFoundError('Location', request.locationId);
      }
    }

    const groupBy = request.groupBy || 'day';
    const now = new Date();
    const endDate = request.endDate || now.toISOString();
    const defaultStart = new Date(now.getTime() - 30 * 86400000);
    const startDate = request.startDate || defaultStart.toISOString();

    const diffDays = (new Date(endDate).getTime() - new Date(startDate).getTime()) / 86400000;
    const maxDays = GetAnalyticsUseCase.MAX_RANGE_DAYS[groupBy] ?? 90;
    if (diffDays > maxDays) {
      throw new ValidationError(
        `Date range exceeds maximum of ${maxDays} days for groupBy=${groupBy}`,
      );
    }

    const query: AnalyticsQuery = { startDate, endDate, groupBy };

    if (request.locationId) {
      return this.transactionRepository.getLocationAnalytics(
        request.merchantId,
        request.locationId,
        query,
      );
    }

    return this.transactionRepository.getMerchantAnalytics(request.merchantId, query);
  }
}
