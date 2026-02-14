import { SQSClient, SendMessageBatchCommand, SendMessageCommand } from '@aws-sdk/client-sqs';
import type {
  ISmsPublisherService,
  SmsMessage,
} from '../../application/services/ISmsPublisherService';

export class SmsPublisherService implements ISmsPublisherService {
  private sqs: SQSClient;

  constructor(
    private queueUrl: string,
    region: string,
  ) {
    this.sqs = new SQSClient({ region });
  }

  async publish(message: SmsMessage): Promise<void> {
    try {
      await this.sqs.send(
        new SendMessageCommand({
          QueueUrl: this.queueUrl,
          MessageBody: JSON.stringify(message),
          MessageGroupId: message.merchantId,
          MessageDeduplicationId: `${message.merchantId}-${message.phone}-${Date.now()}`,
        }),
      );
    } catch (error) {
      // Fire-and-forget: log but never throw
      console.error('[SmsPublisher] Failed to publish SMS:', error);
    }
  }

  async publishBatch(messages: SmsMessage[]): Promise<void> {
    if (messages.length === 0) return;

    // SQS batch limit is 10
    const chunks: SmsMessage[][] = [];
    for (let i = 0; i < messages.length; i += 10) {
      chunks.push(messages.slice(i, i + 10));
    }

    for (const chunk of chunks) {
      try {
        await this.sqs.send(
          new SendMessageBatchCommand({
            QueueUrl: this.queueUrl,
            Entries: chunk.map((msg, idx) => ({
              Id: String(idx),
              MessageBody: JSON.stringify(msg),
              MessageGroupId: msg.merchantId,
              MessageDeduplicationId: `${msg.merchantId}-${msg.phone}-${Date.now()}-${idx}`,
            })),
          }),
        );
      } catch (error) {
        console.error('[SmsPublisher] Failed to publish SMS batch:', error);
      }
    }
  }
}
