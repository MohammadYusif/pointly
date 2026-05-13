import * as Sentry from '@sentry/aws-serverless';
import type { SQSBatchResponse, SQSEvent } from 'aws-lambda';
import type { SmsMessage } from './application/services/ISmsPublisherService';
import { logger } from './lib/logger';

Sentry.init({
  // biome-ignore lint/complexity/useLiteralKeys: TS noPropertyAccessFromIndexSignature
  dsn: process.env['SENTRY_DSN'],
  // biome-ignore lint/complexity/useLiteralKeys: TS noPropertyAccessFromIndexSignature
  environment: process.env['ENVIRONMENT'] ?? 'dev',
  tracesSampleRate: 0,
});

const TAQNYAT_URL = 'https://api.taqnyat.sa/v1/messages';

async function sendSms(message: SmsMessage, apiKey: string, senderId: string): Promise<void> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(TAQNYAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        recipients: [message.phone],
        body: message.body,
        sender: senderId,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => 'unknown');
      throw new Error(`Taqnyat HTTP ${res.status}: ${text}`);
    }
  } finally {
    clearTimeout(timeoutId);
  }
}

export const handler = Sentry.wrapHandler(async (event: SQSEvent): Promise<SQSBatchResponse> => {
  // biome-ignore lint/complexity/useLiteralKeys: TS noPropertyAccessFromIndexSignature requires bracket notation for process.env
  const apiKey = process.env['SMS_PROVIDER_API_KEY'] ?? '';
  // biome-ignore lint/complexity/useLiteralKeys: TS noPropertyAccessFromIndexSignature requires bracket notation for process.env
  const senderId = process.env['SMS_SENDER_ID'] ?? 'POINTLY';
  const failures: SQSBatchResponse['batchItemFailures'] = [];

  for (const record of event.Records) {
    let message: SmsMessage;

    try {
      message = JSON.parse(record.body) as SmsMessage;
    } catch {
      logger.error('Failed to parse SQS message body', {
        body: record.body,
        messageId: record.messageId,
      });
      // Unparseable messages are not retryable — skip so they eventually DLQ via maxReceiveCount
      continue;
    }

    if (!apiKey) {
      // No provider configured — log for observability (dev/staging without Taqnyat)
      logger.info('sms_dispatch_skipped', {
        phone: message.phone,
        type: message.type,
        merchantId: message.merchantId,
        messageId: record.messageId,
        reason: 'SMS_PROVIDER_API_KEY not set',
      });
      continue;
    }

    try {
      await sendSms(message, apiKey, senderId);
      logger.info('sms_dispatched', {
        phone: message.phone,
        type: message.type,
        merchantId: message.merchantId,
        messageId: record.messageId,
      });
    } catch (err) {
      logger.error('sms_dispatch_failed', {
        messageId: record.messageId,
        phone: message.phone,
        type: message.type,
        error: err instanceof Error ? err.message : String(err),
      });
      failures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures: failures };
});
