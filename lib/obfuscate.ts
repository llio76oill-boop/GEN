/**
 * obfuscate.ts — Subscriber Privacy Utilities
 *
 * Obfuscates Arabic full names for public display.
 * "أحمد محمد الدليمي" → "أ. م. الدلي..."
 *
 * Rules:
 *  - 1-word name  : first char + '.'
 *  - 2-word name  : 1st initial + '. ' + first 4 chars of 2nd + '...'
 *  - 3+ word name : 1st initial + '. ' + 2nd initial + '. ' + first 5 chars of 3rd + '...'
 *    (keeps "ال" prefix intact: الدليمي → الدلي...)
 */
export function obfuscateArabicName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return `${parts[0].slice(0, 1)}.`;
  if (parts.length === 2) {
    return `${parts[0].slice(0, 1)}. ${parts[1].slice(0, 4)}...`;
  }
  // 3+ words: "أ. م. الدلي..."
  const first  = `${parts[0].slice(0, 1)}.`;
  const second = `${parts[1].slice(0, 1)}.`;
  const third  = `${parts[2].slice(0, 5)}...`;
  return `${first} ${second} ${third}`;
}

/**
 * Calculate monthly bill total using the standard formula.
 * Total = (subscriber_amps × price_per_amp) + commission
 */
export function calcBillTotal(amps: number, pricePerAmp: number, commission = 500): number {
  return Math.round(amps * pricePerAmp) + commission;
}

/** Format IQD amount with Arabic locale, e.g. 50,500 د.ع. */
export function formatIQD(amount: number): string {
  return `${amount.toLocaleString('en-US')} د.ع.`;
}

/** Returns Tailwind-compatible status color and Arabic label for a bill status */
export function billStatusMeta(
  status: 'pending' | 'paid' | 'overdue'
): { color: string; bg: string; label: string } {
  switch (status) {
    case 'paid':    return { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  label: 'مدفوع'     };
    case 'overdue': return { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   label: 'متأخر'     };
    default:        return { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  label: 'بانتظار الدفع' };
  }
}
