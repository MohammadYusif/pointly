/**
 * ICustomerQueueService
 *
 * Abstracts the fan-out queue used by the scheduled decay/tier-reset orchestrators.
 * The orchestrator scans customers page by page and enqueues each page as a single
 * SQS message; a separate processor Lambda dequeues and processes each batch.
 *
 * This interface lives in the application layer so the orchestrator use cases have
 * no direct dependency on SQS or any AWS SDK.
 */
export interface ICustomerQueueService {
  /**
   * Enqueues a batch of customer IDs for asynchronous processing.
   * Each call maps to one SQS message.
   * @param customerIds - Array of customer IDs to process (recommended batch: 100)
   */
  enqueueCustomerBatch(customerIds: string[]): Promise<void>;
}
