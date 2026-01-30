/**
 * Idempotency Service Interface
 *
 * Prevents duplicate transaction processing by storing and retrieving
 * results based on unique idempotency keys.
 *
 * Critical for financial operations where duplicate requests
 * (network retries, user double-clicks) must return the same result.
 */
export interface IIdempotencyService {
  /**
   * Get a previously stored result for the given key
   * @param key - Unique idempotency key
   * @returns The stored result or null if not found
   */
  getResult<T>(key: string): Promise<T | null>;

  /**
   * Store a result for the given key
   * @param key - Unique idempotency key
   * @param result - The result to store
   * @param ttlSeconds - Time-to-live in seconds
   */
  storeResult<T>(key: string, result: T, ttlSeconds: number): Promise<void>;

  /**
   * Delete a stored result
   * @param key - Unique idempotency key
   */
  delete(key: string): Promise<void>;
}
