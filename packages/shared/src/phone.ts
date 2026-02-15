/**
 * Saudi phone number utilities
 *
 * Centralizes all phone normalization and formatting logic.
 * Used by both merchant-dashboard and customer-portal.
 */

/**
 * Normalize a Saudi phone number to E.164 format (+966XXXXXXXXX).
 * Handles: 9 digits, 05XXXXXXXX, 966XXXXXXXXX, and already-prefixed numbers.
 */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\s+/g, '');
  if (/^\d{9}$/.test(digits)) return `+966${digits}`;
  if (/^0\d{9}$/.test(digits)) return `+966${digits.slice(1)}`;
  if (/^966\d{9}$/.test(digits)) return `+${digits}`;
  return digits;
}

/**
 * Format phone for display: 966501111111 → +966 50 111 1111
 */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('966') && digits.length === 12) {
    return `+${digits.slice(0, 3)} ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return phone;
}
