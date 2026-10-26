/**
 * Pure 12-hour / 24-hour time conversion and formatting utilities for Aayojan Ace.
 * Fully deterministic and locale-independent.
 */

export type AmPm = 'AM' | 'PM';

export interface TimeParts12h {
  hour: string; // "1" to "12"
  minute: string; // "00" to "59"
  period: AmPm; // "AM" | "PM"
}

/**
 * Parses a 24-hour "HH:mm" time string into 12-hour parts (hour 1-12, minute 00-59, AM/PM).
 * Returns null if the input is empty or invalid.
 *
 * Edge cases:
 * - "00:xx" -> hour: "12", period: "AM" (Midnight)
 * - "12:xx" -> hour: "12", period: "PM" (Noon)
 * - "13:xx" -> hour: "1", period: "PM"
 * - "23:xx" -> hour: "11", period: "PM"
 */
export function parse24hTo12h(time24?: string | null): TimeParts12h | null {
  if (!time24 || typeof time24 !== 'string') return null;
  const trimmed = time24.trim();
  const match = trimmed.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;

  const hours24 = parseInt(match[1], 10);
  const minute = match[2];

  const period: AmPm = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;

  return {
    hour: String(hours12),
    minute,
    period,
  };
}

/**
 * Converts 12-hour hour (1-12), minute (00-59), and period ("AM" | "PM")
 * into a standard 24-hour "HH:mm" storage string.
 *
 * Edge cases:
 * - 12 AM -> "00:xx"
 * - 12 PM -> "12:xx"
 * - 1 AM -> "01:xx"
 * - 11 PM -> "23:xx"
 */
export function format12hTo24h(
  hour: string | number,
  minute: string | number,
  period: AmPm
): string {
  const hNum = typeof hour === 'string' ? parseInt(hour.trim(), 10) : hour;
  const mNum = typeof minute === 'string' ? parseInt(minute.trim(), 10) : minute;

  if (isNaN(hNum) || hNum < 1 || hNum > 12) return '';
  const validMinute = isNaN(mNum) || mNum < 0 || mNum > 59 ? 0 : mNum;

  let h24: number;
  if (period === 'AM') {
    h24 = hNum === 12 ? 0 : hNum;
  } else {
    h24 = hNum === 12 ? 12 : hNum + 12;
  }

  const padH = String(h24).padStart(2, '0');
  const padM = String(validMinute).padStart(2, '0');

  return `${padH}:${padM}`;
}

/**
 * Formats a 24-hour "HH:mm" time string into a clean 12-hour display string "h:mm AM/PM".
 * Locale-independent and deterministic.
 *
 * Examples:
 * - "00:00" -> "12:00 AM"
 * - "01:30" -> "1:30 AM"
 * - "10:30" -> "10:30 AM"
 * - "12:00" -> "12:00 PM"
 * - "14:15" -> "2:15 PM"
 * - "23:45" -> "11:45 PM"
 */
export function formatTime12h(time?: string | null): string {
  if (!time || typeof time !== 'string') return '';
  const trimmed = time.trim();
  if (!trimmed) return '';

  // Handle already formatted 12-hour strings
  const twelveHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (twelveHourMatch) {
    const h = parseInt(twelveHourMatch[1], 10);
    const m = twelveHourMatch[2];
    const p = twelveHourMatch[3].toUpperCase();
    if (h >= 1 && h <= 12) {
      return `${h}:${m} ${p}`;
    }
  }

  const parts = parse24hTo12h(trimmed);
  if (!parts) return trimmed;

  return `${parts.hour}:${parts.minute} ${parts.period}`;
}
