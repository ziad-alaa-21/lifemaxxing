/**
 * Time formatting helpers for 12-hour clock system
 */

export interface FormatTimeOptions {
  locale?: string;
  padZero?: boolean;
}

/**
 * Formats a "HH:MM" or "HH:MM:SS" 24-hour string into a 12-hour format string (e.g. "9:00 AM", "2:30 PM", "11:00 م").
 */
export function formatTimeTo12h(
  timeStr: string | null | undefined,
  options?: FormatTimeOptions
): string {
  if (!timeStr) return "";
  const trimmed = timeStr.trim();
  if (!trimmed) return "";

  // If already formatted with AM/PM or ص/م, return as-is
  if (/[a-zA-Z\u0621-\u064A]/.test(trimmed)) {
    return trimmed;
  }

  const parts = trimmed.split(":");
  if (parts.length < 2) return trimmed;

  const rawH = parseInt(parts[0], 10);
  const m = parts[1].slice(0, 2).padStart(2, "0");

  if (isNaN(rawH)) return trimmed;

  const normalizedH = rawH % 24;
  const isAr = options?.locale === "ar";
  const period = normalizedH >= 12 ? (isAr ? "م" : "PM") : (isAr ? "ص" : "AM");

  let h = normalizedH % 12;
  if (h === 0) h = 12;

  const hStr = options?.padZero ? String(h).padStart(2, "0") : String(h);
  return `${hStr}:${m} ${period}`;
}

/**
 * Formats a Date object or ISO timestamp into 12-hour clock format.
 */
export function formatDateTo12h(
  dateOrIso: Date | string | number | null | undefined,
  options?: { locale?: string; timeZone?: string }
): string {
  if (!dateOrIso) return "";
  const date = typeof dateOrIso === "object" ? dateOrIso : new Date(dateOrIso);
  if (isNaN(date.getTime())) return "";

  const isAr = options?.locale === "ar";
  try {
    return date.toLocaleTimeString(isAr ? "ar-EG" : "en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: options?.timeZone,
    });
  } catch {
    const rawH = date.getHours();
    const m = String(date.getMinutes()).padStart(2, "0");
    const period = rawH >= 12 ? (isAr ? "م" : "PM") : (isAr ? "ص" : "AM");
    let h = rawH % 12;
    if (h === 0) h = 12;
    return `${h}:${m} ${period}`;
  }
}

/**
 * Formats a time range (start and end) into 12-hour format: "7:00 AM – 10:00 AM" or "٧:٠٠ ص – ١٠:٠٠ ص"
 */
export function formatTimeRange12h(
  startTime: string | null | undefined,
  endTime: string | null | undefined,
  options?: FormatTimeOptions
): string {
  const start = formatTimeTo12h(startTime, options);
  const end = formatTimeTo12h(endTime, options);
  if (!start && !end) return "";
  if (!start) return end;
  if (!end) return start;
  return `${start} – ${end}`;
}
