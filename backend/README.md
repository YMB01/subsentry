# SubSentry Backend

FastAPI backend service powering SubSentry subscription tracking, receipt ingestion, AI extraction, insight detection, and proactive Telegram alerting.

## Setup & Running

### 1. Prerequisites
- Python 3.10+
- Activated virtual environment

```bash
cd subsentry/backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate
pip install -r requirements.txt
```

### 2. Configuration
Copy `.env.example` to `.env` and fill in:
- `GEMINI_API_KEY`: API key for Gemini structured receipt extraction
- `TELEGRAM_BOT_TOKEN`: Telegram bot token from @BotFather
- `TELEGRAM_CHAT_ID`: Recipient Telegram chat ID for alert notifications

### 3. Run Server
```bash
uvicorn app.main:app --reload --port 8000
```

Interactive API documentation available at:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## Daily scheduler (cron-job.org)

To automate the proactive pipeline daily:

1. **Create Account**: Register for a free account at [cron-job.org](https://cron-job.org).
2. **Create New Cronjob**:
   - **Title**: `SubSentry Daily Pipeline`
   - **URL**: `https://<your-deployed-backend>/api/jobs/run`
   - **Request Method**: `POST`
   - **Schedule**: Daily at `08:00` (select your local timezone)
3. **Execution**: The scheduler sends a POST request to `/api/jobs/run`, triggering receipt ingestion, Gemini extraction, detector evaluation, and Telegram notifications for newly detected alerts.

> [!NOTE]
> **Publicly Reachable URL Required**: `cron-job.org` requires a publicly accessible URL (e.g., hosted on Render, Railway, Fly.io, or exposed locally via ngrok). For local development and demonstration, trigger `POST /api/jobs/run` manually (or via curl / PowerShell):
>
> ```bash
> # Linux / macOS / Git Bash
> curl -X POST http://localhost:8000/api/jobs/run
>
> # Windows PowerShell
> Invoke-RestMethod -Uri http://localhost:8000/api/jobs/run -Method Post
> ```
