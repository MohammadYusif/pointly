export interface PaymentIntent {
  paymentId: string;
  paymentUrl: string;
}

export interface CreatePaymentParams {
  /** Amount in halalas (1 SAR = 100 halalas) */
  amount: number;
  currency: 'SAR';
  description: string;
  callbackUrl: string;
  metadata: Record<string, string>;
}

export type PaymentStatus = 'initiated' | 'paid' | 'failed';

export interface IPaymentService {
  createPayment(params: CreatePaymentParams): Promise<PaymentIntent>;
  verifyWebhookSignature(rawBody: string, signature: string): boolean;
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
}
