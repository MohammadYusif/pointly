import type { SQSEvent } from 'aws-lambda';
import type { SmsMessage } from './application/services/ISmsPublisherService';
import { logger } from './lib/logger';

export const handler = async (event: SQSEvent): Promise<void> => {
  for (const record of event.Records) {
    let message: SmsMessage;
    try {
      message = JSON.parse(record.body) as SmsMessage;
    } catch {
      logger.error('Failed to parse SQS message body', {
        body: record.body,
        messageId: record.messageId,
      });
      // Re-throw so SQS retries and eventually dead-letters
      throw new Error(`Invalid SQS message body: ${record.messageId}`);
    }

    // TODO: Integrate with KSA SMS provider (Unifonic / Taqnyat / Msegat)
    // For now: emit structured log so messages are observable in CloudWatch
    logger.info('sms_dispatch_pending', {
      phone: message.phone,
      type: message.type,
      merchantId: message.merchantId,
      messageId: record.messageId,
    });
  }
};
