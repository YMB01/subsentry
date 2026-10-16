"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Subscription,
  getSubscriptions,
  computeMonthlyBurn,
  computeNextRenewal,
  isRenewingWithin7Days,
  isSubscriptionActive,
  formatCurrency,
  formatDateDisplay,
  getEffectiveAmount,
} from "../../lib/api";

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  useEffect(() => {
    async function loadData() {
      try {
        setError(null);
        const data = await getSubscriptions();
        setSubscriptions(data);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to load subscriptions";
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Filter subscriptions
  const categories = Array.from(
    new Set(subscriptions.map((s) => s.category).filter(Boolean))
  ) as string[];

  const filteredSubs = subscriptions.filter((sub) => {
    const matchesCat =
      filterCategory === "all" ||
      (sub.category || "").toLowerCase() === filterCategory.toLowerCase();
    const matchesQuery =
      searchQuery.trim() === "" ||
      sub.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sub.category || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const totalBurn = computeMonthlyBurn(subscriptions);
  const activeCount = subscriptions.filter(isSubscriptionActive).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
            <Link href="/" className="hover:text-slate-200 transition-colors">
              Dashboard
            </Link>
            <span>/</span>
            <span className="text-slate-200">Subscriptions</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Tracked Subscriptions
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            All recurring charges discovered from Gmail receipts and managed in SQLite.
          </p>
        </div>

        {/* Action Controls & Summary */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl text-xs font-mono bg-slate-900 border border-slate-800 text-slate-300">
            Monthly Run-rate: <span className="text-white font-bold">{formatCurrency(totalBurn)}</span>
          </div>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-72">
          <input
            type="text"
            placeholder="Search subscriptions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-900 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterCategory("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filterCategory === "all"
                ? "bg-indigo-600 text-white"
                : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            All ({subscriptions.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
                filterCategory.toLowerCase() === cat.toLowerCase()
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
          ⚠️ {error}
        </div>
      )}

      {/* Table Container */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden backdrop-blur">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-xs uppercase font-mono text-slate-400">
              <tr>
                <th scope="col" className="px-6 py-4">ID</th>
                <th scope="col" className="px-6 py-4">Merchant</th>
                <th scope="col" className="px-6 py-4">Amount</th>
                <th scope="col" className="px-6 py-4">Cycle</th>
                <th scope="col" className="px-6 py-4">Last Charge</th>
                <th scope="col" className="px-6 py-4">Next Renewal</th>
                <th scope="col" className="px-6 py-4">Category</th>
                <th scope="col" className="px-6 py-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-400 font-mono">
                    Loading subscriptions...
                  </td>
                </tr>
              ) : filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-slate-400">
                    No matching subscriptions found.
                  </td>
                </tr>
              ) : (
                filteredSubs.map((sub) => {
                  const amount = getEffectiveAmount(sub);
                  const cycle = (sub.billing_cycle || sub.frequency || "monthly").toLowerCase();
                  const nextRenewal = computeNextRenewal(sub);
                  const isSoon = isRenewingWithin7Days(sub);
                  const active = isSubscriptionActive(sub);

                  return (
                    <tr
                      key={sub.id}
                      className="hover:bg-slate-900/70 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-500">
                        #{sub.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-slate-800 to-slate-700 border border-slate-700 flex items-center justify-center font-bold text-xs text-indigo-400 uppercase">
                            {sub.merchant.slice(0, 2)}
                          </div>
                          <span className="font-semibold text-white text-sm">
                            {sub.merchant}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-mono font-semibold text-white text-sm">
                          {formatCurrency(amount, sub.currency)}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {cycle.includes("annual") || cycle.includes("year")
                            ? `${formatCurrency(amount / 12)}/mo`
                            : `${formatCurrency(amount)}/mo`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-mono capitalize px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
                          {cycle}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-slate-300">
                        {formatDateDisplay(sub.last_charge_date)}
                      </td>
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-mono capitalize text-slate-400">
                          {sub.category || "—"}
                        </span>
                      </td>
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
    </div>
  );
}
