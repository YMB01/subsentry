# 🛡️ SubSentry — AI Subscription Sentinel

[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016%20%7C%20App%20Router-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/Language-TypeScript-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind%20CSS-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%20%7C%20Python%203.11%2B-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![SQLite](https://img.shields.io/badge/Database-SQLite%203-003B57?logo=sqlite)](https://www.sqlite.org/)
[![Gemini](https://img.shields.io/badge/AI-Gemini%202.5%20Flash-4285F4?logo=google)](https://aistudio.google.com/)
[![Telegram](https://img.shields.io/badge/Alerts-Telegram%20Bot%20API-26A5E4?logo=telegram)](https://core.telegram.org/bots/api)

**SubSentry** is an autonomous subscription intelligence sentinel that shields your finances from creeping recurring charges. By ingesting billing receipts directly from Gmail or a demo inbox, SubSentry employs **Gemini 2.5 Flash** structured outputs to normalize merchant charges, tracks price histories in an audit trail, pinpoints forgotten or zombie services through email engagement scoring, identifies redundant cross-service subscriptions, and delivers actionable, one-click cancellation guides directly to your phone via Telegram and a clean web dashboard before renewal deadlines strike.

---

## ⚡ Key Features

- **4-Pillar Intelligence Detection Engine**:
  - 🔺 **Price Hike Detector (`price_increase`)**: Continuously monitors price audit histories to flag stealthy billing increases (e.g., Netflix jumping from $12.99 to $15.49, a +19.25% hike).
  - 😴 **Forgotten Subscription Detector (`possibly_forgotten`)**: Analyzes ratio of billing cycles against genuine service engagement emails, highlighting dormant services you pay for but never use (e.g., FitZone Gym, SecureVPN, Hulu, GitHub Copilot).
  - 👯 **Category Overlap Detector (`duplicate`)**: Identifies redundant, substitutable subscriptions competing within the same vertical (e.g., simultaneous Netflix & Hulu streaming subscriptions, or Spotify & Apple Music overlaps).
  - ⏰ **Renewal Countdown Detector (`renewal_soon`)**: Warns users of auto-renewals approaching within 7 days (e.g., Namecheap domain renewals or Adobe annual cycles), giving you a window to cancel before payment commits.
- **Proactive Telegram Alerting**: Dispatches concise, rich HTML notifications with emoji indicators, bold merchant headers, fee deltas, and step-by-step cancel guides. Idempotent dispatch ensures zero spam on consecutive runs.
- **Modern Responsive Dashboard**: Built with Next.js (App Router) and Tailwind CSS, providing monthly spend KPIs, subscription inventory tables with status indicators, real-time alert drawers, and mark-as-read toggles.
- **1-Click Merchant Cancellation Guides**: Integrated cancel instructions for top providers (Netflix, Spotify, Adobe, Apple/iCloud+, Namecheap, Notion, FitZone Gym, SecureVPN, Hulu, GitHub Copilot) embedded directly in alerts.

---

## 🏗️ Architecture

```
+-----------------------------------------------------------------------------------+
|                                 DAILY SCHEDULER                                   |
|                (Automated daily cron via cron-job.org / curl / CI)                |
+-----------------------------------------------------------------------------------+
                                          |
                                POST /api/jobs/run
                                          v
      +------------------------+                     +------------------------+
      |       Gmail API        |         or          |     Demo Seed Inbox    |
      |   OAuth2 Receipt Fetch |                     | (38 Realistic Emails)  |
      +------------------------+                     +------------------------+
                  \                                              /
                   \                                            /
                    v                                          v
      +-----------------------------------------------------------------------------+
      |                          1. INGESTION SERVICE                               |
      |              Deduplicates raw email records by message_id                   |
      +-----------------------------------------------------------------------------+
                                          |
                                          v
      +-----------------------------------------------------------------------------+
      |                          2. EXTRACTION SERVICE                              |
      |         Google Gemini 2.5 Flash JSON Output (Deterministic Fallback)         |
      |     Parses: Merchant, Amount, Currency, Billing Cycle, Date, Category       |
      +-----------------------------------------------------------------------------+
                                          |
                                          v
      +-----------------------------------------------------------------------------+
      |                           3. SQLite DATABASE                                |
      |   Tables: emails | subscriptions | price_history | alerts (with audit logs)  |
      +-----------------------------------------------------------------------------+
                                          |
                                          v
      +-----------------------------------------------------------------------------+
      |                         4. INTELLIGENCE DETECTORS                           |
      |       - Price Hike Detector          - Forgotten / Dormant Detector         |
      |       - Overlapping Duplicate Detector - Approaching Renewal Detector       |
      +-----------------------------------------------------------------------------+
                       /                                             \
                      /                                               \
                     v                                                 v
+------------------------------------------+     +------------------------------------------+
|           5. TELEGRAM BOT API            |     |           6. NEXT.JS DASHBOARD           |
|  Proactive mobile alerts with direct     |     |  Interactive UI: Monthly burn rate,      |
|  merchant cancellation instructions      |     |  subscription table, alert inbox & actions|
+------------------------------------------+     +------------------------------------------+
```

---

## 🛠️ Setup & Installation

### Prerequisites

- **Python 3.11+** (tested on Python 3.11, 3.12, and 3.13)
- **Node.js 18+** (tested on Node v20+) & `npm`

---

### Backend Setup

1. **Navigate to the backend directory**:
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment**:
   ```bash
   python -m venv .venv

   # On Windows (PowerShell):
   .venv\Scripts\Activate.ps1

   # On Windows (cmd):
   .venv\Scripts\activate.bat

   # On macOS / Linux:
   source .venv/bin/activate
   ```

3. **Install Python dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables**:
   ```bash
   # On Windows (PowerShell):
   Copy-Item .env.example .env

   # On macOS / Linux:
   cp .env.example .env
   ```
   *Edit `backend/.env` with your API keys (see [Environment Variables](#-environment-variables) below).*

5. **Seed the demo inbox** (loads 38 realistic emails covering 11 subscriptions and engagement signals):
   ```bash
   python -m app.seed
   ```

6. **Start the FastAPI backend server**:
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```
   *The backend will be available at `http://localhost:8000` (OpenAPI Swagger docs at `http://localhost:8000/docs`).*

---

### Frontend Setup

1. **Navigate to the frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install Node dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables** (optional, defaults to `http://localhost:8000`):
   ```bash
   # On Windows (PowerShell):
   Copy-Item .env.local.example .env.local

   # On macOS / Linux:
   cp .env.local.example .env.local
   ```

4. **Start the Next.js development server**:
   ```bash
   npm run dev
   ```
   *The frontend dashboard will be available at `http://localhost:3000`.*

---

## 🔐 Environment Variables

| Variable | Scope | Required? | Default | Description & Where to Get It |
|---|---|---|---|---|
| `GEMINI_API_KEY` | Backend | **Optional** (Recommended) | `""` | Google Gemini API key for structured invoice extraction. Get free at [Google AI Studio](https://aistudio.google.com/). When omitted, the built-in deterministic rule-based fallback extracts demo receipts automatically. |
| `GEMINI_MODEL` | Backend | No | `gemini-2.5-flash` | Gemini model variant used for structured JSON extraction. |
| `TELEGRAM_BOT_TOKEN` | Backend | **Optional** | `""` | Telegram Bot token for sending real-time smartphone alerts. Create a bot in 30 seconds via [@BotFather](https://t.me/botfather). When omitted, Telegram delivery is skipped gracefully without errors. |
| `TELEGRAM_CHAT_ID` | Backend | **Optional** | `""` | Your Telegram user or chat ID to receive notifications. Retrieve yours via [@userinfobot](https://t.me/userinfobot) or the Telegram API. |
| `GMAIL_CREDENTIALS_PATH` | Backend | No | `gmail_credentials.json` | Path to Google Cloud OAuth 2.0 client credentials JSON for real Gmail syncing. Obtain from [Google Cloud Console](https://console.cloud.google.com/) with Gmail API enabled. |
| `GMAIL_TOKEN_PATH` | Backend | No | `token.json` | Path to persisted OAuth authorization token. Generated automatically on first interactive Google OAuth prompt. |
| `DATABASE_PATH` | Backend | No | `subsentry.db` | Local SQLite database file path. Automatically initialized on first launch. |
| `NEXT_PUBLIC_API_URL` | Frontend | No | `http://localhost:8000` | Base URL used by Next.js client to communicate with the FastAPI backend. |

---

## 📡 API Reference

All backend endpoints are served under `/api` (except `/health`):

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check endpoint returning backend operational status `{"status": "ok"}`. |
| `GET` | `/api/subscriptions` | Retrieve all tracked subscriptions from SQLite sorted alphabetically by merchant. |
| `GET` | `/api/dashboard` | Retrieve aggregated dashboard metrics (monthly spend, active count, alert summaries). |
| `GET` | `/api/emails/count` | Retrieve total count of raw emails currently stored in the SQLite database. |
| `GET` | `/api/alerts` | Retrieve all detected alerts ordered newest first, including cancel guides and metadata. |
| `PATCH` | `/api/alerts/{alert_id}/read` | Mark an alert as read by ID. |
| `POST` | `/api/jobs/run` | Execute complete proactive pipeline: `ingest` -> `extract` -> `detect` -> `notify`. Idempotent. |
| `POST` | `/api/jobs/extract` | Trigger structured extraction across all unprocessed emails (Gemini / fallback). |
| `POST` | `/api/jobs/detect` | Trigger intelligence detection (price hikes, forgotten scores, duplicates, renewals). |
| `POST` | `/api/jobs/scan` | Trigger email ingestion and extraction pipeline scan. |
| `POST` | `/api/jobs/renewal-check` | Check for subscriptions renewing within the next 3 days. |

---

## ⏰ Daily Scheduler Setup

SubSentry is designed for hands-free daily monitoring. You can set up automated execution using the free tier of [cron-job.org](https://cron-job.org):

1. **Sign Up**: Create a free account on [cron-job.org](https://cron-job.org).
2. **Create New Cron Job**:
   - **Title**: `SubSentry Daily Sentinel`
   - **URL**: `https://<your-backend-host>/api/jobs/run`
   - **Method**: `POST`
   - **Schedule**: Every day at `08:00` (select your local timezone).
3. **Execution**: The scheduler triggers receipt ingestion, Gemini extraction, detector evaluation, and sends Telegram alerts for newly discovered issues.

> For complete scheduler configuration instructions and deployment notes, refer to [backend/README.md](file:///f:/Personal%20Projects/Brain%203/subsentry/backend/README.md).
>
> **Local Testing**: You can trigger the complete automated pipeline at any time via curl or PowerShell:
> ```bash
> # Linux / macOS
> curl -X POST http://localhost:8000/api/jobs/run
>
> # Windows PowerShell
> Invoke-RestMethod -Uri http://localhost:8000/api/jobs/run -Method Post
> ```

---

## 💡 Notes & Demo Guide

- **Seeded Demo Inbox**: The included seed script (`python -m app.seed`) injects **38 realistic emails** representing **11 distinct merchants** across 3 monthly billing cycles (August, September, October 2026), complete with newsletter and marketing engagement signals to test dormant score calculations.
- **Production Gmail Connector**: SubSentry includes a production-ready Gmail API connector (`app/services/gmail_client.py`) using OAuth 2.0 with minimal `gmail.readonly` scopes. If credentials are not supplied, the pipeline gracefully falls back to the local database without crashes.
- **100% Free / Zero Cloud Cost**: Every component in SubSentry runs on free tiers:
  - Google Gemini API free tier (no credit card required)
  - Telegram Bot API (100% free forever)
  - SQLite (serverless, local file)
  - cron-job.org free tier
- **Deterministic AI Fallback**: If `GEMINI_API_KEY` is not configured, the extraction service automatically switches to regex and rule-based extraction so you can explore and verify all features offline without dependencies.

---

## 🧰 Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/) (App Router), [React](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/)
- **Backend**: [FastAPI](https://fastapi.tiangolo.com/), [Pydantic v2](https://docs.pydantic.dev/), [Uvicorn](https://www.uvicorn.org/)
- **Database**: [SQLite 3](https://www.sqlite.org/) (standard library `sqlite3` with ACID transactions)
- **AI Extraction**: [Gemini 2.5 Flash](https://aistudio.google.com/) via `google-genai` structured outputs SDK
- **Alert Delivery**: [Telegram Bot API](https://core.telegram.org/bots/api) via `requests`
