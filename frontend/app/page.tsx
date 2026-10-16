import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner / Heading */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
              SubSentry
            </h1>
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
              Dashboard Overview
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">
            Intelligent subscription monitoring, automated Gmail invoice parsing, and renewal alerting.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-700/70 hover:bg-slate-800 hover:text-white transition-all shadow-sm"
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 mr-2"></span>
            Trigger Scan (TODO: POST /api/jobs/scan)
          </button>
          <button
            type="button"
            className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-600/30"
          >
            Check Renewals (TODO: POST /api/jobs/renewal-check)
          </button>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1 */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Monthly Run-rate</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              TODO
            </span>
          </div>
          <div className="mt-3 text-3xl font-bold tracking-tight text-white">$0.00</div>
          <p className="mt-1 text-xs text-slate-500">
            Sum of active subscriptions normalized to monthly
          </p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Metric 2 */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Active Subscriptions</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              TODO
            </span>
          </div>
          <div className="mt-3 text-3xl font-bold tracking-tight text-white">0</div>
          <p className="mt-1 text-xs text-slate-500">
            Total recurring services detected from receipts
          </p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Metric 3 */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Price Hikes Detected</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              TODO
            </span>
          </div>
          <div className="mt-3 text-3xl font-bold tracking-tight text-white">0</div>
          <p className="mt-1 text-xs text-slate-500">
            Flagged billing changes via price_history table
          </p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-rose-500/10 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Metric 4 */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Forgotten Score Alerts</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
              TODO
            </span>
          </div>
          <div className="mt-3 text-3xl font-bold tracking-tight text-white">0</div>
          <p className="mt-1 text-xs text-slate-500">
            Inactive or unreviewed subscriptions with high risk
          </p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
        </div>
      </div>

      {/* Architecture & Pipeline Status Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <div>
            <h2 className="text-base font-semibold text-white">Pipeline Architecture & Stubs</h2>
            <p className="text-xs text-slate-400">
              Three-tier pipeline orchestrated by <code className="text-indigo-400 font-mono">services/pipeline.py</code>
            </p>
          </div>
          <span className="px-2 py-0.5 text-[11px] font-medium rounded-md bg-amber-400/10 text-amber-400 border border-amber-400/20">
            Scaffold Mode
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {/* Step 1 */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-indigo-400">STEP 1: INGEST</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">Stub</span>
            </div>
            <h3 className="text-sm font-semibold text-white">Gmail API Receipt Fetcher</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Queries Gmail for invoices and populates the <code className="font-mono text-slate-300">emails</code> SQLite table.
            </p>
            <div className="pt-2 text-[11px] text-slate-500 font-mono">
              TODO: services/gmail_client.py
            </div>
          </div>

          {/* Step 2 */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-purple-400">STEP 2: EXTRACT</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">Stub</span>
            </div>
            <h3 className="text-sm font-semibold text-white">Gemini Structured Extractor</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Extracts merchant, price, currency, renewal frequency into <code className="font-mono text-slate-300">subscriptions</code> table.
            </p>
            <div className="pt-2 text-[11px] text-slate-500 font-mono">
              TODO: services/extractor.py
            </div>
          </div>

          {/* Step 3 */}
          <div className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-semibold text-emerald-400">STEP 3: DETECT</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">Stub</span>
            </div>
            <h3 className="text-sm font-semibold text-white">Intelligence & Telegram Alerts</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Detects price hikes, duplicate tools, calculates forgotten score, and notifies Telegram bot.
            </p>
            <div className="pt-2 text-[11px] text-slate-500 font-mono">
              TODO: services/detector.py & notifier.py
            </div>
          </div>
        </div>
      </div>

      {/* Lower Split Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section A: Subscriptions Table Placeholder */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-white">Tracked Subscriptions (GET /api/subscriptions)</h2>
              <Link
                href="/subscriptions"
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
              >
                View all &rarr;
              </Link>
            </div>

            <div className="mt-8 text-center py-8">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500 text-lg font-bold">
                0
              </div>
              <h3 className="mt-3 text-sm font-medium text-slate-300">No subscriptions loaded yet</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Once the ingestion pipeline is executed, recurring subscriptions identified by Gemini will appear here.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
            <span>Status: Endpoint stubbed with empty list</span>
            <code className="font-mono text-slate-400">routers/subscriptions.py</code>
          </div>
        </div>

        {/* Section B: Alerts & Notifications Feed Placeholder */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 backdrop-blur flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-sm font-semibold text-white">Sentinel Alert Stream</h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                TODO: alerts table
              </span>
            </div>

            <div className="mt-8 text-center py-8">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                🔔
              </div>
              <h3 className="mt-3 text-sm font-medium text-slate-300">No active alerts</h3>
              <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
                Price hikes and upcoming renewals flagged by the sentinel detector will show here and route to Telegram.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
            <span>Telegram Bot: TELEGRAM_CHAT_ID</span>
            <code className="font-mono text-slate-400">services/notifier.py</code>
          </div>
        </div>
      </div>
    </div>
  );
}
