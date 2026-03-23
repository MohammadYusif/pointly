import { describe, expect, it } from 'vitest';
import { normalizePhone } from '../phone';

describe('normalizePhone', () => {
  it('returns null for Bahraini number', () => {
    expect(normalizePhone('+97312345678')).toBeNull();
  });

  it('returns null for US number', () => {
    expect(normalizePhone('+12125551234')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(normalizePhone('')).toBeNull();
  });

  it('normalizes valid Saudi mobile number', () => {
    expect(normalizePhone('+966501234567')).toBe('+966501234567');
  });

  it('normalizes 05XXXXXXXX format', () => {
    expect(normalizePhone('0501234567')).toBe('+966501234567');
  });
});
