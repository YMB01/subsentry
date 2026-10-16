# SubSentry

SubSentry is an intelligent subscription sentinel and management monorepo designed to automatically ingest receipts from Gmail, extract recurring subscription details via Gemini structured outputs, monitor price hikes, compute forgotten subscription risk scores, and deliver alerts via Telegram.

> **Note:** This project is currently in the **scaffolding phase**. Core architecture, database tables, API routes, service signatures, and frontend UI templates are fully structured with `TODO` stubs ready for business logic implementation.

---

## Project Structure

```
subsentry/
  backend/
    app/
      main.py                  # FastAPI app with CORS and /health check
      config.py                # pydantic-settings config (Gemini, Telegram, Gmail, SQLite)
      db.py                    # sqlite3 schema init (emails, subscriptions, price_history, alerts)
      routers/
        subscriptions.py       # GET /api/subscriptions, GET /api/dashboard
        jobs.py                # POST /api/jobs/scan, POST /api/jobs/renewal-check
      services/
        pipeline.py            # run_pipeline() orchestrating Step 1 ingest, Step 2 extract, Step 3 detect
        gmail_client.py        # Gmail API client (fetch_receipts)
        extractor.py           # Gemini structured JSON extraction
        detector.py            # Price hikes, forgotten scores, duplicates
        notifier.py            # Telegram Bot API alert dispatcher
    requirements.txt           # Python dependencies
    .env.example               # Configuration template
    gmail_credentials.json     # OAuth2 credentials placeholder
  frontend/                    # Next.js 15+ (App Router), TypeScript, Tailwind CSS
    app/
      page.tsx                 # Dashboard view with metric cards and TODO modules
      subscriptions/page.tsx   # Subscription management list view
      layout.tsx               # Root layout & navigation shell
      globals.css              # Design system styling & tokens
    lib/
      api.ts                   # Typed API client pointing at http://localhost:8000
    package.json
    tsconfig.json
  README.md                    # Project documentation & run guides
  .gitignore                   # Git ignore rules (.env, *.db, node_modules, etc.)
```

---

## Prerequisites

- **Python**: 3.10+ (tested with Python 3.13)
- **Node.js**: v18+ (tested with Node v20+) and `npm`

---

## Backend Setup & Execution

### 1. Navigate to the backend directory

```bash
cd subsentry/backend
```

### 2. Set up Python virtual environment (recommended)

```bash
python -m venv .venv

# On Windows:
.venv\Scripts\activate

# On macOS/Linux:
source .venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Populate the values as you configure external services:
- `GEMINI_API_KEY`: API key from Google AI Studio
- `TELEGRAM_BOT_TOKEN`: Token from @BotFather
- `TELEGRAM_CHAT_ID`: Telegram chat/user ID for alert notifications
- `GMAIL_CREDENTIALS_PATH`: Path to OAuth credentials (defaults to `gmail_credentials.json`)
- `DATABASE_PATH`: SQLite database filename (defaults to `subsentry.db`)

### 5. Run the Backend API Server

```bash
uvicorn app.main:app --reload --port 8000
```

The backend API will start on **`http://localhost:8000`**.

- **Health check**: `http://localhost:8000/health`
- **Interactive OpenAPI Docs**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

---

## Frontend Setup & Execution

### 1. Navigate to the frontend directory

```bash
cd subsentry/frontend
```

### 2. Install dependencies (if not already installed)

```bash
npm install
```

### 3. Run the development server

```bash
npm run dev
```

The frontend application will start on **`http://localhost:3000`**.

- **Dashboard**: `http://localhost:3000`
- **Subscriptions List**: `http://localhost:3000/subscriptions`

---

## API Endpoints Overview

| Method | Endpoint | Description | Status |
|---|---|---|---|
| `GET` | `/health` | Service health status | Active (`200 OK`) |
| `GET` | `/api/subscriptions` | List tracked subscriptions | Stubbed (empty list) |
| `GET` | `/api/dashboard` | Dashboard metrics & overview | Stubbed (empty metrics) |
| `POST` | `/api/jobs/scan` | Trigger email ingest & extraction pipeline | Stubbed |
| `POST` | `/api/jobs/renewal-check` | Check approaching renewal dates | Stubbed |

---

## Database Tables

SubSentry automatically initializes an SQLite database with four tables upon startup:

1. **`emails`**: Raw emails ingested from Gmail (`id`, `message_id`, `from_addr`, `subject`, `date`, `snippet`).
2. **`subscriptions`**: Normalised subscriptions parsed by Gemini (`id`, `merchant`, `amount`, `currency`, `frequency`, `next_renewal`, `category`, `status`, `forgotten_score`).
3. **`price_history`**: Audit trail of price changes per subscription (`id`, `subscription_id`, `amount`, `observed_at`).
4. **`alerts`**: Recorded notifications sent across channels (`id`, `type`, `subscription_id`, `message`, `sent_at`, `channel`).
