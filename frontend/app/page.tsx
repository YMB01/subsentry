"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Subscription,
  AlertItem,
  PipelineRunResult,
  getSubscriptions,
  getAlerts,
  markAlertRead,
  runPipeline,
  getEmailCount,
  computeMonthlyBurn,
  computeNextRenewal,
  isRenewingWithin7Days,
  isSubscriptionActive,
  getEffectiveAmount,
  formatCurrency,
  formatDateDisplay,
  getAlertBadge,
} from "../lib/api";

export default function DashboardPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [emailCount, setEmailCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedGuides, setExpandedGuides] = useState<Record<number, boolean>>({});
  const [markingIds, setMarkingIds] = useState<Record<number, boolean>>({});
  const [, startTransition] = useTransition();

  // Load all initial data
  const loadDashboardData = async () => {
    try {
      setError(null);
      const [subsData, alertsData, emailsData] = await Promise.all([
        getSubscriptions(),
        getAlerts(),
        getEmailCount().catch(() => ({ count: 0 })),
      ]);

      startTransition(() => {
        setSubscriptions(subsData);
        setAlerts(alertsData);
        setEmailCount(emailsData.count);
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load dashboard data";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // Handle "Scan now" button click
  const handleScanNow = async () => {
    if (isScanning) return;
    setIsScanning(true);
    setError(null);
    try {
      const result: PipelineRunResult = await runPipeline();
      const sentCount = result.telegram_sent ?? 0;
      if (sentCount > 0) {
        const plural = sentCount === 1 ? "alert" : "alerts";
        toast.success(`Scan complete — ${sentCount} new ${plural} sent to Telegram`);
      } else {
        toast("Scan complete — nothing new");
      }

      // Refresh data
      await loadDashboardData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Pipeline scan failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsScanning(false);
    }
  };

  // Handle marking an alert as read
  const handleMarkRead = async (alertId: number) => {
    if (markingIds[alertId]) return;
    setMarkingIds((prev) => ({ ...prev, [alertId]: true }));

    // Optimistically update UI
    setAlerts((prev) =>
      prev.map((a) => (a.id === alertId ? { ...a, is_read: true } : a))
    );

    try {
      await markAlertRead(alertId);
      toast("Marked as read");
    } catch (err: unknown) {
      // Revert if API call fails
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, is_read: false } : a))
      );
      const msg = err instanceof Error ? err.message : "Failed to mark alert as read";
      setError(msg);
      toast.error(msg);
    } finally {
      setMarkingIds((prev) => ({ ...prev, [alertId]: false }));
    }
  };

  // Toggle cancellation guide
  const toggleGuide = (alertId: number) => {
    setExpandedGuides((prev) => ({
      ...prev,
      [alertId]: !prev[alertId],
    }));
  };

  // Stat metrics calculations
  const monthlyBurn = computeMonthlyBurn(subscriptions);
  const activeSubsCount = subscriptions.filter(isSubscriptionActive).length;
  const unreadAlertsCount = alerts.filter((a) => !a.is_read).length;
  const renewalsIn7DaysCount = subscriptions.filter((s) => isRenewingWithin7Days(s)).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 bg-white text-black">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-black sm:text-4xl">
            SubSentry
          </h1>
          <p className="mt-1.5 text-sm text-gray-600">
            Autonomous subscription audit, receipt invoice parsing, and proactive Telegram alerts.
          </p>
        </div>

        {/* Scan Actions & Status */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {emailCount !== null && (
            <div className="text-xs font-mono text-gray-600 bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
              <span>{emailCount} emails indexed</span>
            </div>
          )}

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              id="scan-now-button"
              type="button"
              onClick={handleScanNow}
              disabled={isScanning}
              className={`inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-colors ${
                isScanning
                  ? "bg-gray-400 text-gray-100 cursor-not-allowed"
                  : "bg-black hover:bg-gray-800 text-white cursor-pointer"
              }`}
            >
              {isScanning ? (
                <>
                  <svg
                    className="animate-spin -ml-0.5 mr-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    ></path>
                  </svg>
                  <span>Scanning...</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-3.5 h-3.5 mr-1.5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  <span>Scan now</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Error alert if any */}
      {error && (
        <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-300 text-black text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold">[ERROR]</span>
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-gray-600 hover:text-black text-xs px-2 py-0.5 border border-gray-300 rounded bg-white transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Monthly burn */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-gray-400">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Monthly Burn</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
              Run-rate
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span
              id="stat-monthly-burn"
              className="text-3xl font-extrabold tracking-tight text-black font-mono"
            >
              {isLoading ? "..." : formatCurrency(monthlyBurn)}
            </span>
            <span className="text-xs text-gray-500 font-medium">/mo</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Sum of monthly-equivalent active services
          </p>
        </div>

        {/* Card 2: Active subscriptions */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-gray-400">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Active Subscriptions</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 border border-gray-200">
              Discovered
            </span>
          </div>
          <div className="mt-3 flex items-baseline">
            <span
              id="stat-active-subs"
              className="text-3xl font-extrabold tracking-tight text-black font-mono"
            >
              {isLoading ? "..." : activeSubsCount}
            </span>
            <span className="ml-1 text-xs text-gray-500 font-medium">services</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Tracked recurring merchants in database
          </p>
        </div>

        {/* Card 3: Unread alerts */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-gray-400">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Unread Alerts</span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                unreadAlertsCount > 0
                  ? "bg-black text-white border-black font-medium"
                  : "bg-gray-100 text-gray-600 border-gray-200"
              }`}
            >
              {unreadAlertsCount > 0 ? "Action Required" : "All Clear"}
            </span>
          </div>
          <div className="mt-3 flex items-baseline">
            <span
              id="stat-unread-alerts"
              className="text-3xl font-extrabold tracking-tight text-black font-mono"
            >
              {isLoading ? "..." : unreadAlertsCount}
            </span>
            <span className="ml-1 text-xs text-gray-500 font-medium">pending</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Price increases, duplicates, and inactive risks
          </p>
        </div>

        {/* Card 4: Renewals in next 7 days */}
        <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 transition-colors hover:border-gray-400">
          <div className="flex items-center justify-between text-xs text-gray-500 font-medium">
            <span>Renewals in Next 7 Days</span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                renewalsIn7DaysCount > 0
                  ? "bg-black text-white border-black font-medium"
                  : "bg-gray-100 text-gray-600 border-gray-200"
              }`}
            >
              Within 7d
            </span>
          </div>
          <div className="mt-3 flex items-baseline">
            <span
              id="stat-renewals-7d"
              className="text-3xl font-extrabold tracking-tight text-black font-mono"
            >
              {isLoading ? "..." : renewalsIn7DaysCount}
            </span>
            <span className="ml-1 text-xs text-gray-500 font-medium">approaching</span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Imminent billing renewals to monitor
          </p>
        </div>
      </div>

      {/* Main Grid: Alerts Feed & Subscriptions Section */}
      <div className="space-y-8">
        {/* Alerts Feed Section */}
        <section id="alerts-section" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-black">
                Intelligence Alerts
              </h2>
              <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-200">
                {alerts.length} total &bull; {unreadAlertsCount} unread
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white divide-y divide-gray-200 overflow-hidden shadow-none">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-gray-500 font-mono">
                Loading intelligence alerts...
              </div>
            ) : alerts.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                No alerts detected. Trigger a scan to analyze recurring billing patterns.
              </div>
            ) : (
              alerts.map((alert) => {
                const badge = getAlertBadge(alert.type);
                const isMarking = markingIds[alert.id] || false;
                const cancelGuideText =
                  alert.data?.cancel_guide || alert.cancel_guide;
                const isExpanded = expandedGuides[alert.id] || false;

                return (
                  <div
                    key={alert.id}
                    id={`alert-card-${alert.id}`}
                    className={`p-4 sm:p-5 transition-all ${
                      alert.is_read
                        ? "opacity-60 bg-gray-50/50"
                        : "bg-white hover:bg-gray-50/80"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-sm text-black truncate">
                            {alert.subscription_name || "Subscription Alert"}
                          </span>
                          <span
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${badge.badgeClass}`}
                          >
                            {badge.label}
                          </span>
                          {alert.is_read && (
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-gray-100 text-gray-500 border border-gray-200">
                              Read
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 leading-relaxed break-words">
                          {alert.message}
                        </p>

                        {/* Cancellation guide collapsible */}
                        {cancelGuideText && (
                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={() => toggleGuide(alert.id)}
                              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-black hover:underline transition-colors"
                            >
                              <span>{isExpanded ? "▾ Hide Cancel Guide" : "▸ How to Cancel"}</span>
                            </button>

                            {isExpanded && (
                              <div className="mt-2 p-3 rounded-lg bg-gray-50 border border-gray-200 text-xs text-gray-700 font-sans leading-relaxed">
                                <div className="text-[10px] font-mono uppercase tracking-wider text-black font-semibold mb-1 flex items-center gap-1">
                                  <span>[ CANCELLATION INSTRUCTIONS ]</span>
                                </div>
                                <p className="text-gray-700">{cancelGuideText}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Right: Date + Mark Read Action */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 flex-shrink-0 self-stretch sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-200">
                        <span className="text-[11px] font-mono text-gray-500">
                          {formatDateDisplay(alert.created_at)}
                        </span>
                        {!alert.is_read ? (
                          <button
                            id={`mark-read-btn-${alert.id}`}
                            type="button"
                            onClick={() => handleMarkRead(alert.id)}
                            disabled={isMarking}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium text-white bg-black hover:bg-gray-800 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {isMarking ? "Saving..." : "Mark read"}
                          </button>
                        ) : (
                          <span className="text-[11px] font-mono text-gray-500 flex items-center gap-1">
                            ✓ Read
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Subscriptions Table Section */}
        <section id="subscriptions" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-black">
                Active & Tracked Subscriptions
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Continuously monitored recurring services parsed from payment receipts.
              </p>
            </div>
            <Link
              href="/subscriptions"
              className="inline-flex items-center gap-1 text-xs text-black font-semibold hover:underline"
            >
              <span>Full subscriptions directory</span>
              <span>→</span>
            </Link>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase font-mono text-gray-600">
                  <tr>
                    <th scope="col" className="px-6 py-3.5">
                      Merchant
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Cycle
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Last charge
                    </th>
                    <th scope="col" className="px-6 py-3.5">
                      Next renewal
                    </th>
                    <th scope="col" className="px-6 py-3.5 text-right">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 font-sans">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500 font-mono">
                        Loading subscriptions...
                      </td>
                    </tr>
                  ) : subscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-gray-500">
                        No subscriptions found. Click &quot;Scan now&quot; to parse inbox receipts.
                      </td>
                    </tr>
                  ) : (
                    subscriptions.map((sub) => {
                      const amount = getEffectiveAmount(sub);
                      const cycle = (sub.billing_cycle || sub.frequency || "monthly").toLowerCase();
                      const nextRenewal = computeNextRenewal(sub);
                      const isSoon = isRenewingWithin7Days(sub);
                      const active = isSubscriptionActive(sub);

                      return (
                        <tr
                          key={sub.id}
                          id={`subscription-row-${sub.id}`}
                          className="hover:bg-gray-50/80 transition-colors"
                        >
                          {/* Merchant */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="font-semibold text-black text-sm">
                                {sub.merchant}
                              </div>
                              {sub.category && (
                                <div className="text-[11px] text-gray-500 capitalize">
                                  {sub.category}
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-mono font-semibold text-black text-sm">
                              {formatCurrency(amount, sub.currency)}
                            </div>
                            <div className="text-[11px] text-gray-500 font-mono">
                              {cycle.includes("annual") || cycle.includes("year")
                                ? `${formatCurrency(amount / 12)}/mo equiv`
                                : `${formatCurrency(amount)}/mo`}
                            </div>
                          </td>

                          {/* Cycle */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-xs font-mono capitalize px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                              {cycle}
                            </span>
                          </td>

                          {/* Last charge */}
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-600">
                            {formatDateDisplay(sub.last_charge_date)}
                          </td>

                          {/* Next renewal */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-gray-800">
                                {formatDateDisplay(nextRenewal)}
                              </span>
                              {isSoon && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-black text-white font-medium">
                                  Renews Soon
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {active ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-black border border-gray-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-black"></span>
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-gray-500 border border-gray-200">
                                Inactive
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

