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
  const digits = raw.replace(/\D/g, '');
  // 9 digits starting with 5: subscriber number only (e.g. 512345678)
  if (/^5\d{8}$/.test(digits)) return `+966${digits}`;
  // 10 digits starting with 05: local format (e.g. 0512345678)
  if (/^05\d{8}$/.test(digits)) return `+966${digits.slice(1)}`;
  // 12 digits with country code (e.g. 966512345678)
  if (/^9665\d{8}$/.test(digits)) return `+${digits}`;
  // Already E.164 (+966512345678)
  if (/^\+9665\d{8}$/.test(raw.trim())) return raw.trim();
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
