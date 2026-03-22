import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import type { ICustomerQueueService } from '../../application/services/ICustomerQueueService';

/**
 * CustomerQueueService
 *
 * Enqueues customer ID batches to SQS for fan-out processing by the
 * scheduled-decay-processor / scheduled-tier-reset-processor Lambda.
 *
 * Used by the orchestrator Lambda (scheduled-decay.ts / scheduled-tier-reset.ts)
 * so it can paginate customers quickly and hand off work to worker Lambdas,
 * preventing a single Lambda invocation from hitting the 15-minute timeout
 * when processing large customer populations.
 */
export class CustomerQueueService implements ICustomerQueueService {
  private sqs: SQSClient;

  constructor(
    private queueUrl: string,
    region: string,
  ) {
    this.sqs = new SQSClient({ region });
  }

  async enqueueCustomerBatch(customerIds: string[]): Promise<void> {
    await this.sqs.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify({ customerIds }),
      }),
    );
  }
}
