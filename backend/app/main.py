"""SubSentry FastAPI main application."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db import init_db
from app.routers import subscriptions, jobs


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager to initialize resources on startup."""
    # Ensure database tables exist
    init_db()
    yield


app = FastAPI(
    title="SubSentry API",
    description="Subscription discovery, intelligence, and alert system",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuration: Allow frontend requests from http://localhost:3000
origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers under /api
app.include_router(subscriptions.router, prefix="/api")
app.include_router(jobs.router, prefix="/api")


@app.get("/health")
def health_check():
    """Health check endpoint to verify backend service status."""
    return {"status": "ok"}
