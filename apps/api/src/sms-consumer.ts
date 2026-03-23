import type { SQSEvent } from 'aws-lambda';
import type { SmsMessage } from './application/services/ISmsPublisherService';

export const handler = async (event: SQSEvent): Promise<void> => {
  for (const record of event.Records) {
    let message: SmsMessage;
    try {
      message = JSON.parse(record.body) as SmsMessage;
    } catch {
      console.error(
        JSON.stringify({
          level: 'error',
          msg: 'Failed to parse SQS message body',
          body: record.body,
          messageId: record.messageId,
        }),
      );
      // Re-throw so SQS retries and eventually dead-letters
      throw new Error(`Invalid SQS message body: ${record.messageId}`);
    }

    // TODO: Integrate with KSA SMS provider (Unifonic / Taqnyat / Msegat)
    // For now: emit structured log so messages are observable in CloudWatch
    console.log(
      JSON.stringify({
        level: 'info',
        msg: 'sms_dispatch_pending',
        phone: message.phone,
        type: message.type,
        merchantId: message.merchantId,
        messageId: record.messageId,
        timestamp: new Date().toISOString(),
      }),
    );
  }
};
