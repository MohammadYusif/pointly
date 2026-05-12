import { createHmac } from 'node:crypto';
import type {
  CreatePaymentParams,
  IPaymentService,
  PaymentIntent,
  PaymentStatus,
} from '../../application/services/IPaymentService';
import { logger } from '../../lib/logger';

const MOYASAR_API_BASE = 'https://api.moyasar.com/v1';

export class MoyasarPaymentService implements IPaymentService {
  private readonly authHeader: string;

  constructor(
    secretKey: string,
    private readonly webhookSecret: string,
  ) {
    this.authHeader = `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`;
  }

  async createPayment(params: CreatePaymentParams): Promise<PaymentIntent> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${MOYASAR_API_BASE}/invoices`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: this.authHeader,
        },
        body: JSON.stringify({
          amount: params.amount,
          currency: params.currency,
          description: params.description,
          callback_url: params.callbackUrl,
          metadata: params.metadata,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => 'unknown');
        throw new Error(`Moyasar API error: ${res.status} ${text}`);
      }

      const data = (await res.json()) as { id: string; url: string };

      return {
        paymentId: data.id,
        paymentUrl: data.url,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  verifyWebhookSignature(rawBody: string, signature: string): boolean {
    if (!this.webhookSecret || !signature) return false;

    const expected = createHmac('sha256', this.webhookSecret).update(rawBody).digest('hex');
    // Constant-time comparison
    if (expected.length !== signature.length) return false;

    let mismatch = 0;
    for (let i = 0; i < expected.length; i++) {
      // biome-ignore lint/style/noNonNullAssertion: index is within bounds
      mismatch |= expected.charCodeAt(i) ^ signature!.charCodeAt(i);
    }
    return mismatch === 0;
  }

  async getPaymentStatus(paymentId: string): Promise<PaymentStatus> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const res = await fetch(`${MOYASAR_API_BASE}/invoices/${paymentId}`, {
        method: 'GET',
        headers: { Authorization: this.authHeader },
        signal: controller.signal,
      });

      if (!res.ok) {
        logger.error('Moyasar status check failed', { paymentId, status: res.status });
        return 'failed';
      }

      const data = (await res.json()) as { status: string };

      if (data.status === 'paid') return 'paid';
      if (data.status === 'initiated' || data.status === 'created') return 'initiated';
      return 'failed';
    } finally {
      clearTimeout(timeoutId);
    }
  }
}
