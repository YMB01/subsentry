import Link from "next/link";

export default function SubscriptionsPage() {
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

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-800 hover:bg-slate-800 transition-all"
          >
            Filter by Category (TODO)
          </button>
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-md shadow-indigo-600/20"
          >
            + Add Manual Subscription (TODO)
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden backdrop-blur">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase font-mono text-slate-400">
              <tr>
                <th scope="col" className="px-6 py-4">ID</th>
                <th scope="col" className="px-6 py-4">Merchant</th>
                <th scope="col" className="px-6 py-4">Amount</th>
                <th scope="col" className="px-6 py-4">Frequency</th>
                <th scope="col" className="px-6 py-4">Next Renewal</th>
                <th scope="col" className="px-6 py-4">Category</th>
                <th scope="col" className="px-6 py-4">Status</th>
                <th scope="col" className="px-6 py-4">Forgotten Score</th>
                <th scope="col" className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {/* Empty placeholder row */}
              <tr>
                <td colSpan={9} className="px-6 py-16 text-center">
                  <div className="max-w-md mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400 text-lg">
                      📋
                    </div>
                    <div className="text-sm font-semibold text-white">
                      No Subscriptions In Database
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      This table connects to <code className="text-indigo-400 font-mono">GET /api/subscriptions</code>.
                      When <code className="text-slate-300 font-mono">run_pipeline()</code> parses invoices from Gmail,
                      records from the <code className="text-indigo-400 font-mono">subscriptions</code> table will display here.
                    </p>
                    <div className="pt-2">
                      <span className="inline-flex items-center text-[11px] font-mono px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                        Status: Endpoint stubbed (empty data)
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Schema reference callout */}
      <div className="p-4 rounded-xl border border-slate-800/60 bg-slate-900/20 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <span className="font-semibold text-slate-300">SQLite Schema Reference:</span>{" "}
          <code className="text-indigo-300 font-mono">
            subscriptions(id, merchant, amount, currency, frequency, next_renewal, category, status, forgotten_score)
          </code>
        </div>
        <div className="text-slate-500 font-mono">
          backend/app/db.py
        </div>
      </div>
    </div>
  );
}
