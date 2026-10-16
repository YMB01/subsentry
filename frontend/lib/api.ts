/**
 * SubSentry API Client & Types
 * Connects to the FastAPI backend (default: http://localhost:8000)
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Subscription {
  id: number;
  merchant: string;
  name?: string | null;
  amount: number | null;
  current_amount?: number | null;
  currency: string | null;
  frequency: string | null;
  billing_cycle?: string | null;
  next_renewal: string | null;
  last_charge_date?: string | null;
  category: string | null;
  status: string | null;
  forgotten_score: number | null;
  is_trial?: number | null;
}

export interface AlertData {
  cancel_guide?: string;
  old_amount?: number;
  new_amount?: number;
  pct?: number;
  billing_count?: number;
  engagement_count?: number;
  forgotten_score?: number;
  category?: string;
  merchant_1?: string;
  merchant_2?: string;
  monthly_cost_1?: number;
  monthly_cost_2?: number;
  combined_monthly_cost?: number;
  days_left?: number;
  next_renewal?: string;
  amount?: number;
  [key: string]: unknown;
}

export interface AlertItem {
  id: number;
  type: "price_increase" | "possibly_forgotten" | "duplicate" | "renewal_soon" | string;
  subscription_name: string;
  message: string;
  data: AlertData;
  is_read: boolean;
  created_at: string;
  cancel_guide?: string;
}

export interface PipelineRunResult {
  ingested: number;
  extracted?: {
    processed?: number;
    subscriptions?: number;
    via_gemini?: number;
    via_fallback?: number;
    [key: string]: unknown;
  };
  alerts_created: number;
  telegram_sent: number;
  [key: string]: unknown;
}

export interface EmailCountResult {
  count: number;
}

export interface MarkAlertReadResult {
  id: number;
  is_read: boolean;
  message: string;
}

/**
 * Standard fetch helper with error handling and json parsing
 */
async function fetchJson<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
      ...options,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      let errorMessage = `API error ${response.status}: ${response.statusText}`;
      try {
        const parsed = JSON.parse(errorText);
        if (parsed.detail) {
          errorMessage = typeof parsed.detail === "string" ? parsed.detail : JSON.stringify(parsed.detail);
        } else if (parsed.message) {
          errorMessage = parsed.message;
        }
      } catch {
        if (errorText) errorMessage += ` - ${errorText}`;
      }
      throw new Error(errorMessage);
    }

    return (await response.json()) as T;
  } catch (error: unknown) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Network error while requesting ${endpoint}`);
  }
}

/**
 * Retrieve all tracked subscriptions from backend SQLite
 */
export async function getSubscriptions(): Promise<Subscription[]> {
  return fetchJson<Subscription[]>("/api/subscriptions");
}

/**
 * Retrieve all alerts ordered newest-first
 */
export async function getAlerts(): Promise<AlertItem[]> {
  return fetchJson<AlertItem[]>("/api/alerts");
}

/**
 * Mark a single alert as read by ID
 */
export async function markAlertRead(id: number): Promise<MarkAlertReadResult> {
  return fetchJson<MarkAlertReadResult>(`/api/alerts/${id}/read`, {
    method: "PATCH",
  });
}

/**
 * Run proactive detection & ingestion pipeline
 */
export async function runPipeline(): Promise<PipelineRunResult> {
  return fetchJson<PipelineRunResult>("/api/jobs/run", {
    method: "POST",
  });
}

/**
 * Retrieve count of ingested emails
 */
export async function getEmailCount(): Promise<EmailCountResult> {
  return fetchJson<EmailCountResult>("/api/emails/count");
}

/* =========================================================================
   Client-side subscription intelligence & utility helpers
   ========================================================================= */

/**
 * Check if subscription is in an active state
 */
export function isSubscriptionActive(sub: Subscription): boolean {
  const status = (sub.status || "").toLowerCase().trim();
  return status !== "cancelled" && status !== "canceled" && status !== "inactive";
}

/**
 * Get effective numeric amount
 */
export function getEffectiveAmount(sub: Subscription): number {
  const val = sub.current_amount ?? sub.amount ?? 0;
  return typeof val === "number" ? val : parseFloat(String(val)) || 0;
}

/**
 * Calculate client-side next renewal date:
 * Returns explicit next_renewal if provided, otherwise calculates last_charge + 30d/365d
 */
export function computeNextRenewal(sub: Subscription): string | null {
  if (sub.next_renewal && sub.next_renewal.trim()) {
    return sub.next_renewal.trim().split("T")[0];
  }
  if (!sub.last_charge_date || !sub.last_charge_date.trim()) {
    return null;
  }

  const parts = sub.last_charge_date.trim().split("-");
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  const date = new Date(Date.UTC(year, month, day));
  if (isNaN(date.getTime())) return null;

  const cycle = (sub.billing_cycle || sub.frequency || "monthly").toLowerCase();
  const daysToAdd = cycle.includes("annual") || cycle.includes("year") ? 365 : 30;
  date.setUTCDate(date.getUTCDate() + daysToAdd);

  return date.toISOString().split("T")[0];
}

/**
 * Determine if subscription renews within the next 7 days (0 <= days <= 7)
 */
export function isRenewingWithin7Days(
  sub: Subscription,
  referenceDate: Date = new Date()
): boolean {
  if (!isSubscriptionActive(sub)) return false;

  const renewalStr = computeNextRenewal(sub);
  if (!renewalStr) return false;

  const parts = renewalStr.split("-");
  if (parts.length !== 3) return false;
  const targetDate = new Date(
    Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10))
  );

  const refUTC = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate()
    )
  );

  const diffMs = targetDate.getTime() - refUTC.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  return diffDays >= 0 && diffDays <= 7;
}

/**
 * Compute monthly burn: sum of monthly-equivalent amounts for active subscriptions
 */
export function computeMonthlyBurn(subscriptions: Subscription[]): number {
  return subscriptions
    .filter(isSubscriptionActive)
    .reduce((total, sub) => {
      const amount = getEffectiveAmount(sub);
      const cycle = (sub.billing_cycle || sub.frequency || "monthly").toLowerCase().trim();
      if (cycle.includes("annual") || cycle.includes("year")) {
        return total + amount / 12;
      }
      if (cycle.includes("week")) {
        return total + (amount * 52) / 12;
      }
      return total + amount;
    }, 0);
}

/**
 * Format currency amount
 */
export function formatCurrency(
  amount: number,
  currency: string | null = "USD"
): string {
  const sym = currency === "EUR" ? "€" : currency === "GBP" ? "£" : "$";
  return `${sym}${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format date nicely for display (e.g., 'Oct 20, 2026')
 */
export function formatDateDisplay(dateStr?: string | null): string {
  if (!dateStr) return "—";
  try {
    const cleanStr = dateStr.split("T")[0];
    const parts = cleanStr.split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const date = new Date(Date.UTC(year, month, day));
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        });
      }
    }
  } catch {
    // fallback
  }
  return dateStr;
}

/**
 * Map alert type to display emoji
 */
export function getAlertEmoji(type: string): string {
  switch (type) {
    case "price_increase":
      return "📈";
    case "possibly_forgotten":
      return "👻";
    case "duplicate":
      return "👥";
    case "renewal_soon":
      return "⏰";
    default:
      return "🔔";
  }
}

/**
 * Map alert type to badge styling
 */
export function getAlertBadge(type: string): {
  label: string;
  badgeClass: string;
} {
  switch (type) {
    case "price_increase":
      return {
        label: "Price Hike",
        badgeClass: "bg-rose-500/10 text-rose-400 border-rose-500/30",
      };
    case "possibly_forgotten":
      return {
        label: "Possibly Forgotten",
        badgeClass: "bg-amber-500/10 text-amber-400 border-amber-500/30",
      };
    case "duplicate":
      return {
        label: "Overlap / Duplicate",
        badgeClass: "bg-purple-500/10 text-purple-400 border-purple-500/30",
      };
    case "renewal_soon":
      return {
        label: "Renewal Soon",
        badgeClass: "bg-sky-500/10 text-sky-400 border-sky-500/30",
      };
    default:
      return {
        label: "Alert",
        badgeClass: "bg-slate-500/10 text-slate-400 border-slate-500/30",
      };
  }
}
