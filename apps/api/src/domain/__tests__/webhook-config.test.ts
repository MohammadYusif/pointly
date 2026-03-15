import { describe, expect, it } from 'vitest';
import { ValidationError, WebhookConfig } from '../index';

describe('WebhookConfig Entity', () => {
  const validSecret = 'a-secret-key-that-is-long-enough';

  it('should create a valid webhook config', () => {
    const config = WebhookConfig.create('merchant-1', 'https://example.com/webhook', validSecret, [
      'REDEMPTION',
    ]);

    expect(config.getWebhookId()).toBeTruthy();
    expect(config.getMerchantId()).toBe('merchant-1');
    expect(config.getUrl()).toBe('https://example.com/webhook');
    expect(config.getSecretKey()).toBe(validSecret);
    expect(config.getEvents()).toEqual(['REDEMPTION']);
    expect(config.getIsActive()).toBe(true);
  });

  it('should reject empty URL', () => {
    expect(() => WebhookConfig.create('merchant-1', '', validSecret, ['REDEMPTION'])).toThrow(
      ValidationError,
    );
  });

  it('should reject non-HTTPS URL', () => {
    expect(() =>
      WebhookConfig.create('merchant-1', 'http://example.com/webhook', validSecret, ['REDEMPTION']),
    ).toThrow(ValidationError);
  });

  it('should reject invalid URL', () => {
    expect(() =>
      WebhookConfig.create('merchant-1', 'not-a-url', validSecret, ['REDEMPTION']),
    ).toThrow(ValidationError);
  });

  it('should reject short secret key', () => {
    expect(() =>
      WebhookConfig.create('merchant-1', 'https://example.com/webhook', 'short', ['REDEMPTION']),
    ).toThrow(ValidationError);
  });

  it('should reject empty events array', () => {
    expect(() =>
      WebhookConfig.create('merchant-1', 'https://example.com/webhook', validSecret, []),
    ).toThrow(ValidationError);
  });

  it('should check event support', () => {
    const config = WebhookConfig.create('merchant-1', 'https://example.com/webhook', validSecret, [
      'REDEMPTION',
    ]);

    expect(config.supportsEvent('REDEMPTION')).toBe(true);
  });

  it('should not support events when deactivated', () => {
    const config = WebhookConfig.create('merchant-1', 'https://example.com/webhook', validSecret, [
      'REDEMPTION',
    ]);

    config.deactivate();
    expect(config.supportsEvent('REDEMPTION')).toBe(false);
    expect(config.getIsActive()).toBe(false);
  });

  it('should serialize to JSON without secret key', () => {
    const config = WebhookConfig.create('merchant-1', 'https://example.com/webhook', validSecret, [
      'REDEMPTION',
    ]);
    const json = config.toJSON();

    expect(json.webhookId).toBeTruthy();
    expect(json.url).toBe('https://example.com/webhook');
    expect(json.events).toEqual(['REDEMPTION']);
    // Secret key should NOT be in JSON serialization
    expect((json as Record<string, unknown>).secretKey).toBeUndefined();
  });
});
