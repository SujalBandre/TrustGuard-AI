"""
TrustGuard-AI | Damage Detector — Inference Engine
====================================================
Provides a singleton DamageDetector that:
  1. Loads damage_detector_best.pt ONCE on backend startup (or on first call)
  2. Runs YOLOv8 inference and maps results → structured prediction dict
  3. Returns a clear 503-compatible flag when the model hasn't been trained yet

Classes
-------
  fake_damage (0) — Fraudulent damage photo submitted as part of a false claim
  real_damage (1) — Genuine damage photo
  normal      (n/a) — No detectable damage class meets the confidence threshold

IMPORTANT: This module NEVER retrains the model. Training is a separate, manual
           step triggered by running backend/damage_detector/train.py explicitly.
"""

import io
import logging
import tempfile
from pathlib import Path
from typing import Union

log = logging.getLogger(__name__)

# ── Paths ─────────────────────────────────────────────────────────────────────
_THIS_DIR     = Path(__file__).parent.resolve()
_MODEL_PATH   = _THIS_DIR / "saved_models" / "damage_detector_best.pt"

# ── Class configuration ───────────────────────────────────────────────────────
# Maps YOLO class index → human-readable name (must match data.yaml order)
_CLASS_NAMES = {0: "fake_damage", 1: "real_damage"}

# Minimum confidence to report a detection (below this → "normal")
_CONFIDENCE_THRESHOLD = 0.25


class DamageDetector:
    """
    Singleton-pattern YOLOv8 inference engine for damage claim classification.

    Usage
    -----
    The module-level `detector` instance is the canonical singleton.
    Call `detector.load_model()` once at startup (FastAPI lifespan).
    Then call `detector.predict(image_source)` per request.
    """

    def __init__(self):
        self._model = None
        self._model_ready: bool = False
        self._load_error: str | None = None

    # ── Model Loading ─────────────────────────────────────────────────────────

    def load_model(self) -> bool:
        """
        Load the YOLOv8 model from saved_models/damage_detector_best.pt.
        Safe to call multiple times — loads only once (singleton).

        Returns True if loaded successfully, False if model file is missing.
        Raises on unexpected errors to surface them at startup.
        """
        if self._model_ready:
            return True

        if not _MODEL_PATH.exists():
            self._load_error = (
                f"Model file not found: {_MODEL_PATH}. "
                "Run 'python -m backend.damage_detector.train' first to train the model."
            )
            log.warning(
                f"[DamageDetector] ⚠️  Model NOT loaded — {self._load_error}"
            )
            return False

        try:
            from ultralytics import YOLO
            log.info(f"[DamageDetector] Loading model from: {_MODEL_PATH}")
            self._model = YOLO(str(_MODEL_PATH))
            self._model_ready = True
            self._load_error = None
            log.info(
                f"[DamageDetector] ✅ Model loaded successfully from "
                f"saved_models/{_MODEL_PATH.name}"
            )
            return True
        except Exception as exc:
            self._model_ready = False
            self._load_error = str(exc)
            log.error(f"[DamageDetector] ❌ Model load failed: {exc}")
            raise

    @property
    def is_ready(self) -> bool:
        """True if the model is loaded and ready to infer."""
        return self._model_ready

    @property
    def not_ready_reason(self) -> str:
        """Human-readable reason why the model is not ready (for error responses)."""
        return self._load_error or "Model not loaded."

    # ── Prediction ────────────────────────────────────────────────────────────

    def predict(self, image_source: Union[str, bytes, "PIL.Image.Image"]) -> dict:
        """
        Run YOLOv8 inference on the provided image.

        Parameters
        ----------
        image_source : str | bytes | PIL.Image
            - str   → absolute or relative file path
            - bytes → raw image bytes (will be written to a temp file)
            - PIL.Image → passed directly to YOLO

        Returns
        -------
        dict with keys:
            prediction : str   — "fake_damage" | "real_damage" | "normal"
            confidence : float — 0.0–1.0 (highest-confidence detection)
            details    : dict  — raw detections, class counts, bboxes

        Raises
        ------
        RuntimeError — if model is not loaded (caller should check is_ready first)
        """
        if not self._model_ready:
            raise RuntimeError(self.not_ready_reason)

        # ── Normalise input to a path or PIL Image YOLO can consume ──────────
        _tmp_path = None
        try:
            if isinstance(image_source, bytes):
                # Write bytes to a temp file so YOLO can open it
                tmp = tempfile.NamedTemporaryFile(
                    suffix=".jpg", delete=False, prefix="tg_dd_"
                )
                tmp.write(image_source)
                tmp.flush()
                tmp.close()
                _tmp_path = Path(tmp.name)
                yolo_input = str(_tmp_path)
            else:
                # str path or PIL Image — pass directly
                yolo_input = image_source

            # ── Run inference (verbose=False keeps logs clean per request) ───
            results = self._model(yolo_input, verbose=False)

            return self._parse_results(results)

        finally:
            # Clean up temp file if we created one
            if _tmp_path and _tmp_path.exists():
                try:
                    _tmp_path.unlink()
                except OSError:
                    pass

    # ── Result Parsing ────────────────────────────────────────────────────────

    def _parse_results(self, results: list) -> dict:
        """
        Parse YOLO Results objects into a clean, structured prediction dict.

        YOLO returns a list of Results (one per image; we always send one image).
        Each Result has .boxes with detected objects' xyxy coords, conf, cls.
        """
        all_detections = []
        best_prediction = "normal"
        best_confidence = 0.0

        for result in results:
            boxes = result.boxes
            if boxes is None or len(boxes) == 0:
                continue

            for box in boxes:
                cls_idx    = int(box.cls[0].item())
                conf       = float(box.conf[0].item())
                class_name = _CLASS_NAMES.get(cls_idx, f"class_{cls_idx}")
                xyxy       = box.xyxy[0].tolist()   # [x1, y1, x2, y2]

                detection = {
                    "class":      class_name,
                    "class_id":   cls_idx,
                    "confidence": round(conf, 4),
                    "bbox": {
                        "x1": round(xyxy[0], 1),
                        "y1": round(xyxy[1], 1),
                        "x2": round(xyxy[2], 1),
                        "y2": round(xyxy[3], 1),
                        "width":  round(xyxy[2] - xyxy[0], 1),
                        "height": round(xyxy[3] - xyxy[1], 1),
                    },
                }
                all_detections.append(detection)

                # Track the highest-confidence detection above threshold
                if conf >= _CONFIDENCE_THRESHOLD and conf > best_confidence:
                    best_confidence = conf
                    best_prediction = class_name

        # Build class-level summary counts
        class_counts = {}
        for det in all_detections:
            name = det["class"]
            if name not in class_counts:
                class_counts[name] = {"count": 0, "max_confidence": 0.0}
            class_counts[name]["count"] += 1
            class_counts[name]["max_confidence"] = max(
                class_counts[name]["max_confidence"], det["confidence"]
            )

        log.debug(
            f"[DamageDetector] Prediction: {best_prediction} "
            f"({best_confidence:.2%}), detections: {len(all_detections)}"
        )

        return {
            "prediction":  best_prediction,
            "confidence":  round(best_confidence, 4),
            "details": {
                "total_detections": len(all_detections),
                "class_summary":    class_counts,
                "detections":       all_detections,
                "model_path":       str(_MODEL_PATH),
                "confidence_threshold": _CONFIDENCE_THRESHOLD,
            },
        }


# ── Module-level singleton ────────────────────────────────────────────────────
# Import this instance in routes.py and main.py:
#   from backend.damage_detector.inference import detector
detector = DamageDetector()
