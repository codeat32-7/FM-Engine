/** Strip to digits only for storage and comparison. */
export function digitsOnly(phone: string | null | undefined): string {
  return (phone || '').replace(/\D/g, '');
}

/** Last 10 digits — matches existing profile lookup pattern. */
export function phoneSuffix(phone: string | null | undefined): string {
  const d = digitsOnly(phone);
  return d.length >= 10 ? d.slice(-10) : d;
}

/** Match Twilio `whatsapp:+1…`, plain digits, or mixed formatting. */
export function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = digitsOnly(a);
  const db = digitsOnly(b);
  if (!da || !db) return false;
  if (da === db) return true;
  if (da.length >= 10 && db.length >= 10 && da.slice(-10) === db.slice(-10)) return true;
  return false;
}

/** Display-friendly (leading + when we have digits). */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  const d = digitsOnly(phone);
  if (!d) return '—';
  return d.length <= 12 ? `+${d}` : `+${d}`;
}

/** Twilio REST `To` for WhatsApp. */
export function toWhatsAppAddress(phone: string | null | undefined): string {
  const raw = (phone || '').trim();
  if (raw.startsWith('whatsapp:')) return raw;
  const d = digitsOnly(raw);
  if (!d) return raw;
  return `whatsapp:+${d}`;
}
