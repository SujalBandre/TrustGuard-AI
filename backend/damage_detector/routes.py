"""
TrustGuard-AI | Damage Detector — FastAPI Routes
=================================================
Endpoint: POST /api/damage-detector/predict

Accepts a multipart image upload, runs YOLOv8 inference via the singleton
DamageDetector, and returns a structured JSON verdict.

Response schema:
  {
    "prediction":  "fake_damage" | "real_damage" | "normal",
    "confidence":  0.0 – 1.0,
    "details": {
        "total_detections": int,
        "class_summary":    { className: { count, max_confidence } },
        "detections":       [ { class, class_id, confidence, bbox: {x1,y1,x2,y2,width,height} } ],
        "model_path":       str,
        "confidence_threshold": float
    }
  }

Error responses:
  503  — Model not trained yet (damage_detector_best.pt missing)
  400  — Non-image file uploaded
  413  — Image exceeds 20 MB
  500  — Unexpected inference error
"""

import logging
import uuid
import tempfile
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import JSONResponse

from backend.damage_detector.inference import detector

router = APIRouter(tags=["Damage Detector"])
log    = logging.getLogger(__name__)

# Maximum upload size: 20 MB
_MAX_BYTES = 20 * 1024 * 1024

_ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp"}
_ALLOWED_MIME_TYPES  = {
    "image/jpeg", "image/jpg", "image/png",
    "image/webp", "image/gif", "image/bmp",
}


@router.post("/predict")
async def predict_damage(file: UploadFile = File(...)):
    """
    Classify an uploaded product image as fake_damage, real_damage, or normal.

    - Accepts: multipart/form-data with field name `file`
    - Returns: JSON prediction with confidence and bounding box details
    - Returns 503 if model hasn't been trained yet (run train.py first)
    """
    # ── 1. Check model availability ───────────────────────────────────────────
    if not detector.is_ready:
        raise HTTPException(
            status_code=503,
            detail=(
                "[DamageDetector] Model not ready. "
                "Train the model first by running: "
                "python -m backend.damage_detector.train — "
                f"Reason: {detector.not_ready_reason}"
            ),
        )

    # ── 2. Validate file type ─────────────────────────────────────────────────
    content_type = (file.content_type or "").lower()
    ext = Path(file.filename or "").suffix.lower()

    if content_type not in _ALLOWED_MIME_TYPES and ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Only image files are accepted (JPG, PNG, WEBP, BMP). Got: {content_type or ext}",
        )

    # ── 3. Read & size-check ──────────────────────────────────────────────────
    contents = await file.read()
    if len(contents) > _MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Image too large. Maximum size is 20 MB.",
        )

    # ── 4. Run inference ──────────────────────────────────────────────────────
    try:
        log.info(
            f"[DamageDetector] Running inference on: "
            f"{file.filename!r} ({len(contents) / 1024:.1f} KB)"
        )
        result = detector.predict(contents)
        log.info(
            f"[DamageDetector] Result: {result['prediction']} "
            f"({result['confidence']:.2%} confidence)"
        )
        return JSONResponse(content=result)

    except RuntimeError as exc:
        # Model not ready (race condition between startup and first request)
        raise HTTPException(status_code=503, detail=str(exc))
    except Exception as exc:
        log.error(f"[DamageDetector] Inference error: {exc}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Damage detection failed: {str(exc)}",
        )


@router.get("/status")
def damage_detector_status():
    """
    Health check for the Damage Detector module.
    Returns whether the model is loaded and ready for inference.
    """
    return {
        "module":      "Damage Claim Verifier",
        "model_ready": detector.is_ready,
        "model_file":  "damage_detector_best.pt",
        "status":      "online" if detector.is_ready else "model_not_trained",
        "message": (
            "Model loaded and ready for inference."
            if detector.is_ready
            else detector.not_ready_reason
        ),
    }
