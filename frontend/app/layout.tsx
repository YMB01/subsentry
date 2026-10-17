import type { Metadata } from "next";
import Link from "next/link";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "SubSentry | AI Subscription Sentinel",
  description: "Automated subscription discovery, price-hike intelligence, and renewal guardian.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-white text-black antialiased selection:bg-black selection:text-white">
        <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/90 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center group">
                <div className="flex flex-col">
                  <span className="font-bold text-lg tracking-tight text-black">
                    SubSentry
                  </span>
                  <span className="text-[11px] text-gray-500">Subscription Intelligence</span>
                </div>
              </Link>

              <nav className="hidden md:flex items-center space-x-1">
                <Link
                  href="/"
                  className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-black hover:bg-gray-100 transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  href="/subscriptions"
                  className="px-3.5 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-black hover:bg-gray-100 transition-colors"
                >
                  Subscriptions
                </Link>
              </nav>
            </div>
          </div>
        </header>

        <main className="flex-1 bg-white">{children}</main>

        <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-500 bg-white">
          <div className="max-w-7xl mx-auto px-4">
            SubSentry &bull; 2026
          </div>
        </footer>

        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#000000",
              color: "#ffffff",
              border: "1px solid #374151",
            },
            className: "border-gray-700 bg-black text-white font-sans",
          }}
          icons={{
            success: (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            ),
            error: (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ),
            info: (
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <path strokeLinecap="round" strokeWidth="2" d="M12 16v-4m0-4h.01" />
              </svg>
            ),
          }}
        />
      </body>
    </html>
  );
}

