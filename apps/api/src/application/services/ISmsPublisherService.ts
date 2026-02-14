export interface SmsMessage {
  phone: string;
  body: string;
  merchantId: string;
  type: 'POINTS_EARNED' | 'POINTS_REDEEMED' | 'DECAY_WARNING' | 'TIER_CHANGE' | 'WELCOME';
}

export interface ISmsPublisherService {
  /** Queue an SMS for async delivery via SQS. Fire-and-forget — never throws. */
  publish(message: SmsMessage): Promise<void>;

  /** Queue multiple SMS messages. Fire-and-forget — never throws. */
  publishBatch(messages: SmsMessage[]): Promise<void>;
}
