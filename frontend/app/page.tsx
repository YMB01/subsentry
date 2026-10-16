"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
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
  getAlertEmoji,
  getAlertBadge,
} from "../lib/api";

export default function DashboardPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [emailCount, setEmailCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanResultLine, setScanResultLine] = useState<string | null>(null);
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
      // Formulate result line matching user requirement
      const sentCount = result.telegram_sent ?? 0;
      const plural = sentCount === 1 ? "alert" : "alerts";
      setScanResultLine(`${sentCount} new ${plural} sent to Telegram`);

      // Refresh data
      await loadDashboardData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Pipeline scan failed";
      setError(msg);
      setScanResultLine(null);
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
    } catch (err: unknown) {
      // Revert if API call fails
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, is_read: false } : a))
      );
      const msg = err instanceof Error ? err.message : "Failed to mark alert as read";
      setError(msg);
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              SubSentry
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Live Sentinel
            </span>
          </div>
          <p className="mt-1.5 text-sm text-slate-400">
            Autonomous subscription audit, receipt invoice parsing, and proactive Telegram alerts.
          </p>
        </div>

        {/* Scan Actions & Status */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {emailCount !== null && (
            <div className="text-xs font-mono text-slate-400 bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-lg flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              <span>{emailCount} emails indexed</span>
            </div>
          )}

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              id="scan-now-button"
              type="button"
              onClick={handleScanNow}
              disabled={isScanning}
              className={`inline-flex items-center justify-center px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all shadow-lg ${
                isScanning
                  ? "bg-indigo-600/60 text-indigo-200 cursor-not-allowed border border-indigo-500/30"
                  : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30 active:scale-95 cursor-pointer"
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
                    className="w-3.5 h-3.5 mr-1.5"
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

      {/* Result line notification */}
      {scanResultLine && (
        <div
          id="scan-result-line"
          className="flex items-center justify-between p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 text-indigo-300 text-xs font-medium animate-fadeIn"
        >
          <div className="flex items-center gap-2.5">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span>{scanResultLine}</span>
          </div>
          <button
            onClick={() => setScanResultLine(null)}
            className="text-slate-400 hover:text-slate-200 text-xs px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error alert if any */}
      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-rose-400 hover:text-rose-200 text-xs px-2 py-0.5"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Monthly burn */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur transition-all hover:border-slate-700/80">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Monthly Burn</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              Run-rate
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-1">
            <span
              id="stat-monthly-burn"
              className="text-3xl font-extrabold tracking-tight text-white font-mono"
            >
              {isLoading ? "..." : formatCurrency(monthlyBurn)}
            </span>
            <span className="text-xs text-slate-400 font-medium">/mo</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Sum of monthly-equivalent active services
          </p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Card 2: Active subscriptions */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur transition-all hover:border-slate-700/80">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Active Subscriptions</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Discovered
            </span>
          </div>
          <div className="mt-3 flex items-baseline">
            <span
              id="stat-active-subs"
              className="text-3xl font-extrabold tracking-tight text-white font-mono"
            >
              {isLoading ? "..." : activeSubsCount}
            </span>
            <span className="ml-1 text-xs text-slate-400 font-medium">services</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Tracked recurring merchants in database
          </p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Card 3: Unread alerts */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur transition-all hover:border-slate-700/80">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Unread Alerts</span>
            <span
              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                unreadAlertsCount > 0
                  ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
            >
              {unreadAlertsCount > 0 ? "Action Required" : "All Clear"}
            </span>
          </div>
          <div className="mt-3 flex items-baseline">
            <span
              id="stat-unread-alerts"
              className="text-3xl font-extrabold tracking-tight text-white font-mono"
            >
              {isLoading ? "..." : unreadAlertsCount}
            </span>
            <span className="ml-1 text-xs text-slate-400 font-medium">pending</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Price increases, duplicates, and inactive risks
          </p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Card 4: Renewals in next 7 days */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur transition-all hover:border-slate-700/80">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Renewals in Next 7 Days</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
              Within 7d
            </span>
          </div>
          <div className="mt-3 flex items-baseline">
            <span
              id="stat-renewals-7d"
              className="text-3xl font-extrabold tracking-tight text-white font-mono"
            >
              {isLoading ? "..." : renewalsIn7DaysCount}
            </span>
            <span className="ml-1 text-xs text-slate-400 font-medium">approaching</span>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Imminent billing renewals to monitor
          </p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-sky-500/10 rounded-full blur-2xl pointer-events-none" />
        </div>
      </div>

      {/* Main Grid: Alerts Feed & Subscriptions Section */}
      <div className="space-y-8">
        {/* Alerts Feed Section */}
        <section id="alerts-section" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight text-white">
                Intelligence Alerts
              </h2>
              <span className="text-xs font-mono text-slate-400 bg-slate-900 px-2.5 py-0.5 rounded-full border border-slate-800">
                {alerts.length} total &bull; {unreadAlertsCount} unread
              </span>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 divide-y divide-slate-800/60 overflow-hidden backdrop-blur">
            {isLoading ? (
              <div className="p-8 text-center text-sm text-slate-400 font-mono">
                Loading intelligence alerts...
              </div>
            ) : alerts.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">
                No alerts detected. Trigger a scan to analyze recurring billing patterns.
              </div>
            ) : (
              alerts.map((alert) => {
                const badge = getAlertBadge(alert.type);
                const emoji = getAlertEmoji(alert.type);
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
                        ? "opacity-50 bg-slate-950/30"
                        : "bg-slate-900/60 hover:bg-slate-900/80"
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      {/* Left: Emoji + Header + Message */}
                      <div className="flex items-start gap-3.5 flex-1 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-slate-800/90 border border-slate-700 flex items-center justify-center text-base flex-shrink-0 shadow-inner">
                          {emoji}
                        </div>
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-sm text-white truncate">
                              {alert.subscription_name || "Subscription Alert"}
                            </span>
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${badge.badgeClass}`}
                            >
                              {badge.label}
                            </span>
                            {alert.is_read && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                                Read
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 leading-relaxed break-words">
                            {alert.message}
                          </p>

                          {/* Cancellation guide collapsible */}
                          {cancelGuideText && (
                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={() => toggleGuide(alert.id)}
                                className="inline-flex items-center gap-1.5 text-[11px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                              >
                                <span>{isExpanded ? "▾ Hide Cancel Guide" : "▸ How to Cancel"}</span>
                              </button>

                              {isExpanded && (
                                <div className="mt-2 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800/90 text-xs text-slate-300 font-sans leading-relaxed animate-fadeIn">
                                  <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                                    <span>🛑 Cancellation Instructions</span>
                                  </div>
                                  <p className="text-slate-300">{cancelGuideText}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Right: Date + Mark Read Action */}
                      <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 flex-shrink-0 self-stretch sm:self-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                        <span className="text-[11px] font-mono text-slate-400">
                          {formatDateDisplay(alert.created_at)}
                        </span>
                        {!alert.is_read ? (
                          <button
                            id={`mark-read-btn-${alert.id}`}
                            type="button"
                            onClick={() => handleMarkRead(alert.id)}
                            disabled={isMarking}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {isMarking ? "Saving..." : "Mark read"}
                          </button>
                        ) : (
                          <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
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
              <h2 className="text-xl font-bold tracking-tight text-white">
                Active & Tracked Subscriptions
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Continuously monitored recurring services parsed from payment receipts.
              </p>
            </div>
            <Link
              href="/subscriptions"
              className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              <span>Full subscriptions directory</span>
              <span>→</span>
            </Link>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden backdrop-blur">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] uppercase font-mono text-slate-400">
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
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400 font-mono">
                        Loading subscriptions...
                      </td>
                    </tr>
                  ) : subscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-400">
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
                          className="hover:bg-slate-900/70 transition-colors"
                        >
                          {/* Merchant */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-750 flex items-center justify-center font-bold text-xs text-indigo-400 uppercase flex-shrink-0">
                                {sub.merchant ? sub.merchant.slice(0, 2) : "??"}
                              </div>
                              <div>
                                <div className="font-semibold text-white text-sm">
                                  {sub.merchant}
                                </div>
                                {sub.category && (
                                  <div className="text-[11px] text-slate-400 capitalize">
                                    {sub.category}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-mono font-semibold text-white text-sm">
                              {formatCurrency(amount, sub.currency)}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {cycle.includes("annual") || cycle.includes("year")
                                ? `${formatCurrency(amount / 12)}/mo equiv`
                                : `${formatCurrency(amount)}/mo`}
                            </div>
                          </td>

                          {/* Cycle */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-xs font-mono capitalize px-2 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/60">
                              {cycle}
                            </span>
                          </td>

                          {/* Last charge */}
                          <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-300">
                            {formatDateDisplay(sub.last_charge_date)}
                          </td>

                          {/* Next renewal */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs text-slate-200">
                                {formatDateDisplay(nextRenewal)}
                              </span>
                              {isSoon && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                  Renews Soon
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="px-6 py-4 whitespace-nowrap text-right">
                            {active ? (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
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
