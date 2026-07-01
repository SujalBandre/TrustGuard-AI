"""
TrustGuard-AI | Damage Detector — Training Script
==================================================
Trains a YOLOv8 object-detection model on the /dataset folder to classify
product damage images into two classes:
  0 → fake_damage
  1 → real_damage

Usage
-----
  # From project root:
  python -m backend.damage_detector.train

  # With custom options:
  python -m backend.damage_detector.train --epochs 100 --base-model yolov8s.pt --imgsz 640

After training completes, the best-performing weights are automatically copied to:
  backend/damage_detector/saved_models/damage_detector_best.pt

This file is what the inference engine loads at backend startup. Re-running this
script will overwrite the above file (YOLO's own timestamped run folder is kept
as a backup in runs/detect/<run_name>/).

NOTE: Training is a MANUAL, EXPLICIT step — it is never triggered automatically
      by the backend server or any import. Run this script yourself when you have
      a prepared dataset.
"""

import argparse
import logging
import shutil
from pathlib import Path

log = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)

# ── Paths ─────────────────────────────────────────────────────────────────────
# Resolve relative to this file so the script works from any working directory
_THIS_DIR    = Path(__file__).parent.resolve()
_PROJECT_ROOT = _THIS_DIR.parent.parent                     # TrustGuard-AI/
_DATASET_YAML = _PROJECT_ROOT / "dataset" / "data.yaml"
_SAVED_MODELS = _THIS_DIR / "saved_models"


def train(
    base_model: str = "yolov8n.pt",
    epochs: int = 50,
    imgsz: int = 640,
    batch: int = 16,
    patience: int = 15,
    project_name: str = "runs/detect",
    run_name: str = "damage_detector",
    output_name: str = "damage_detector_best.pt",   # canonical output filename
    resume: bool = False,
) -> Path:
    """
    Train a YOLOv8 detection model and save best weights to saved_models/.

    Parameters
    ----------
    base_model : str
        Pretrained YOLO weights to start from (e.g. 'yolov8n.pt', 'yolov8s.pt').
        Will be downloaded automatically by ultralytics on first use.
    epochs : int
        Number of training epochs (default 50).
    imgsz : int
        Input image size in pixels (default 640).
    batch : int
        Training batch size (default 16, lower on GPU-limited machines).
    patience : int
        Early-stopping patience — stops if val/mAP50 doesn't improve for N epochs.
    project_name : str
        YOLO project folder (relative to project root).
    run_name : str
        Sub-folder name for this training run inside project_name.

    Returns
    -------
    Path
        Path to the saved canonical weights file (damage_detector_best.pt).
    """
    try:
        from ultralytics import YOLO
    except ImportError:
        raise ImportError(
            "ultralytics package not found. Install it with:\n"
            "  pip install ultralytics"
        )

    if not _DATASET_YAML.exists():
        raise FileNotFoundError(
            f"data.yaml not found at: {_DATASET_YAML}\n"
            "Make sure the /dataset folder is set up correctly."
        )

    _SAVED_MODELS.mkdir(parents=True, exist_ok=True)

    log.info("=" * 60)
    log.info("[DamageDetector] Starting YOLOv8 training")
    log.info(f"  Base model  : {base_model}")
    log.info(f"  Output name : {output_name}")
    log.info(f"  Dataset YAML: {_DATASET_YAML}")
    log.info(f"  Epochs      : {epochs}")
    log.info(f"  Image size  : {imgsz}px")
    log.info(f"  Batch size  : {batch}")
    log.info(f"  Early stop  : patience={patience}")
    log.info(f"  Resume      : {resume}")
    log.info("=" * 60)

    # Load the pretrained base model
    model = YOLO(base_model)

    # Run training — YOLO saves its own timestamped results under project/name/
    if resume:
        log.info(f"[DamageDetector] Resuming training from {base_model}...")
        results = model.train(resume=True)
    else:
        results = model.train(
            data=str(_DATASET_YAML),
            epochs=epochs,
            imgsz=imgsz,
            batch=batch,
            patience=patience,
            project=str(_PROJECT_ROOT / project_name),
            name=run_name,
            exist_ok=True,        # overwrite same run name if re-training
            verbose=True,
            workers=0,            # Fix for Windows torch.save I/O operation on closed file
        )

    # ── Locate YOLO's best.pt in the auto-created run folder ─────────────────
    # YOLO saves to: <project>/<name>/weights/best.pt
    # With exist_ok=True it may append a number, so we search for the newest.
    run_dir   = Path(results.save_dir) if hasattr(results, "save_dir") else None
    best_src  = None

    if run_dir and (run_dir / "weights" / "best.pt").exists():
        best_src = run_dir / "weights" / "best.pt"
    else:
        # Fallback: find the most recently modified best.pt under project_name
        candidates = sorted(
            (_PROJECT_ROOT / project_name).glob(f"{run_name}*/weights/best.pt"),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if candidates:
            best_src = candidates[0]

    if best_src is None or not best_src.exists():
        raise FileNotFoundError(
            "Training completed but best.pt was not found in the run directory.\n"
            f"Looked in: {_PROJECT_ROOT / project_name}"
        )

    # ── Copy to canonical output path ─────────────────────────────────────────
    dest = _SAVED_MODELS / output_name
    shutil.copy2(best_src, dest)

    log.info("=" * 60)
    log.info("[DamageDetector] ✅ Training complete!")
    log.info(f"  YOLO run folder : {best_src.parent.parent}")
    log.info(f"  Output file     : {dest}")
    log.info("Restart the backend to load the new model.")
    log.info("=" * 60)

    return dest


# ── CLI entry point ───────────────────────────────────────────────────────────
def _parse_args():
    p = argparse.ArgumentParser(
        description="Train the TrustGuard-AI Damage Detector (YOLOv8)",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    p.add_argument(
        "--base-model", default="yolov8n.pt",
        help="Pretrained YOLO weights to start from (e.g. yolov8n.pt, yolov8s.pt, yolov8m.pt)"
    )
    p.add_argument(
        "--epochs", type=int, default=50,
        help="Number of training epochs"
    )
    p.add_argument(
        "--imgsz", type=int, default=640,
        help="Input image resolution (square)"
    )
    p.add_argument(
        "--batch", type=int, default=16,
        help="Training batch size"
    )
    p.add_argument(
        "--patience", type=int, default=15,
        help="Early-stopping patience (epochs without improvement)"
    )
    p.add_argument(
        "--run-name", default="damage_detector",
        help="Name for the YOLO run sub-folder"
    )
    p.add_argument(
        "--output-name", default="damage_detector_best.pt",
        help="Filename to save the best weights under in saved_models/ (e.g. damage_detector_best_v2.pt)"
    )
    p.add_argument(
        "--resume", action="store_true",
        help="Resume training from the weights provided in --base-model"
    )
    return p.parse_args()


if __name__ == "__main__":
    args = _parse_args()
    train(
        base_model=args.base_model,
        epochs=args.epochs,
        imgsz=args.imgsz,
        batch=args.batch,
        patience=args.patience,
        run_name=args.run_name,
        output_name=args.output_name,
        resume=args.resume,
    )
