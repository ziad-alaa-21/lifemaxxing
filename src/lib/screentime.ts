/**
 * Screen Time Telemetry (Stage 7c)
 * Manual daily entry, category ratio breakdown, and friction metrics
 */

export interface ScreenTimeLog {
  id?: string;
  user_id?: string;
  logged_date: string;
  total_minutes: number;
  productive_minutes: number;
  entertainment_minutes: number;
  pickups_count?: number | null;
  notes?: string | null;
  created_at?: string;
  deleted_at?: string | null;
}

export interface ScreenTimeBreakdown {
  totalMinutes: number;
  totalFormatted: string;
  productiveMinutes: number;
  productivePct: number;
  entertainmentMinutes: number;
  entertainmentPct: number;
  neutralMinutes: number;
  neutralPct: number;
  pickupsCount: number | null;
  ratioLabel: string;
}

/**
 * Format minutes into readable "2h 30m" format
 */
export function formatMinutesToHours(minutes: number): string {
  if (minutes < 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Calculate ratio breakdown of screen time categories
 */
export function calculateScreenTimeBreakdown(log: ScreenTimeLog): ScreenTimeBreakdown {
  const total = Math.max(0, log.total_minutes || 0);
  const prod = Math.min(total, Math.max(0, log.productive_minutes || 0));
  const ent = Math.min(total - prod, Math.max(0, log.entertainment_minutes || 0));
  const neutral = Math.max(0, total - prod - ent);

  const prodPct = total > 0 ? Math.round((prod / total) * 100) : 0;
  const entPct = total > 0 ? Math.round((ent / total) * 100) : 0;
  const neutralPct = total > 0 ? Math.max(0, 100 - prodPct - entPct) : 0;

  let ratioLabel = "Balanced";
  if (total === 0) {
    ratioLabel = "No Screen Time";
  } else if (prodPct >= 60) {
    ratioLabel = "High Productivity";
  } else if (entPct >= 60) {
    ratioLabel = "Heavy Distraction";
  }

  return {
    totalMinutes: total,
    totalFormatted: formatMinutesToHours(total),
    productiveMinutes: prod,
    productivePct: prodPct,
    entertainmentMinutes: ent,
    entertainmentPct: entPct,
    neutralMinutes: neutral,
    neutralPct: neutralPct,
    pickupsCount: log.pickups_count ?? null,
    ratioLabel,
  };
}

/**
 * Validation guard for manual screen time submission
 */
export function validateScreenTimeInput(
  totalMinutes: number,
  productiveMinutes: number,
  entertainmentMinutes: number,
  pickupsCount?: number | null
): { valid: boolean; error?: string } {
  if (totalMinutes < 0) {
    return { valid: false, error: "Total screen time cannot be negative." };
  }
  if (totalMinutes > 1440) {
    return { valid: false, error: "Total screen time cannot exceed 24 hours (1440 minutes)." };
  }
  if (productiveMinutes < 0 || entertainmentMinutes < 0) {
    return { valid: false, error: "Category minutes cannot be negative." };
  }
  if (productiveMinutes + entertainmentMinutes > totalMinutes) {
    return {
      valid: false,
      error: `Category sum (${productiveMinutes + entertainmentMinutes}m) exceeds total screen time (${totalMinutes}m).`,
    };
  }
  if (pickupsCount !== undefined && pickupsCount !== null && pickupsCount < 0) {
    return { valid: false, error: "Pickups count cannot be negative." };
  }
  return { valid: true };
}
