"""TrustGuard-AI | FastAPI Application Entry Point"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.api.routes import router
from backend.damage_detector.routes import router as damage_detector_router
from backend.damage_detector.inference import detector as damage_detector

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)

log = logging.getLogger(__name__)


# ── Lifespan: runs once at startup and once at shutdown ──────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan handler.
    Loads the YOLOv8 Damage Detector model ONCE at server startup.
    If the model file is missing (not yet trained), logs a clear warning
    and continues — the rest of the app starts normally.
    """
    log.info("[Startup] TrustGuard AI starting up…")

    # Load Damage Detector model (non-fatal if model hasn't been trained yet)
    try:
        damage_detector.load_model()
    except Exception as exc:
        log.error(f"[Startup] Damage Detector model load raised an error: {exc}")

    yield  # ← Application runs here

    log.info("[Shutdown] TrustGuard AI shutting down.")


app = FastAPI(
    title="TrustGuard AI — Reputation & Manipulation Detection API",
    description=(
        "Production-ready AI system detecting fake reviews, opinion manipulation, "
        "review bombing, and reputation hijacking for e-commerce platforms."
    ),
    version="2.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Existing routes ───────────────────────────────────────────────────────────
app.include_router(router)

# ── Damage Claim Verifier routes ─────────────────────────────────────────────
app.include_router(damage_detector_router, prefix="/api/damage-detector")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.api.main:app", host="0.0.0.0", port=8001, reload=True)
