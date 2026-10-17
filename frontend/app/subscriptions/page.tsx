"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
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
        toast.error(msg);
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 bg-white text-black">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
            <Link href="/" className="hover:text-black transition-colors">
              Dashboard
            </Link>
            <span className="text-gray-400">/</span>
            <span className="text-black font-medium">Subscriptions</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-black sm:text-3xl">
            Tracked Subscriptions
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            All recurring charges discovered from Gmail receipts and managed in SQLite.
          </p>
        </div>

        {/* Action Controls & Summary */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-xl text-xs font-mono bg-gray-50 border border-gray-200 text-gray-600">
            Monthly Run-rate: <span className="text-black font-bold">{formatCurrency(totalBurn)}</span>
          </div>
          <Link
            href="/"
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-black bg-white hover:bg-gray-50 border border-gray-300 transition-colors"
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
            className="w-full px-3.5 py-2 rounded-xl text-xs bg-white border border-gray-300 text-black placeholder-gray-400 focus:outline-none focus:border-black transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            type="button"
            onClick={() => setFilterCategory("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              filterCategory === "all"
                ? "bg-black text-white"
                : "bg-white text-gray-600 hover:text-black border border-gray-300 hover:bg-gray-50"
            }`}
          >
            All ({subscriptions.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors cursor-pointer ${
                filterCategory.toLowerCase() === cat.toLowerCase()
                  ? "bg-black text-white"
                  : "bg-white text-gray-600 hover:text-black border border-gray-300 hover:bg-gray-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

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

      {/* Table Container */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-none">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 text-xs uppercase font-mono text-gray-600">
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
            <tbody className="divide-y divide-gray-200 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500 font-mono">
                    Loading subscriptions...
                  </td>
                </tr>
              ) : filteredSubs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-sm text-gray-500">
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
                      className="hover:bg-gray-50/80 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-400">
                        #{sub.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-semibold text-black text-sm">
                          {sub.merchant}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-mono font-semibold text-black text-sm">
                          {formatCurrency(amount, sub.currency)}
                        </div>
                        <div className="text-[11px] text-gray-500 font-mono">
                          {cycle.includes("annual") || cycle.includes("year")
                            ? `${formatCurrency(amount / 12)}/mo`
                            : `${formatCurrency(amount)}/mo`}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-mono capitalize px-2 py-0.5 rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                          {cycle}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-xs text-gray-600">
                        {formatDateDisplay(sub.last_charge_date)}
                      </td>
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
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs font-mono capitalize text-gray-600">
                          {sub.category || "—"}
                        </span>
                      </td>
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
    </div>
  );
}

