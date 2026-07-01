# Damage Claim Verifier — Backend Module

Part of **TrustGuard AI** — the Fake Review Intelligence Platform.

---

## Overview

The Damage Claim Verifier uses a custom-trained **YOLOv8** object detection model to classify
product damage images uploaded as part of return/refund claims or reviews.

| Class | ID | Meaning |
|---|---|---|
| `fake_damage` | 0 | Digitally fabricated / manipulated defect image |
| `real_damage` | 1 | Genuine, authentic product damage |
| `normal` | — | No detectable class above confidence threshold |

---

## 1. Adding Your Dataset

Place your images and YOLO-format `.txt` label files in the corresponding split folders:

```
dataset/
  train/
    images/   ← your training images (.jpg / .png)
    labels/   ← matching .txt files (YOLO format: class cx cy w h)
  valid/
    images/   ← validation images
    labels/   ← matching .txt files
  test/
    images/   ← test images
    labels/   ← matching .txt files (optional)
```

**YOLO label format** (one row per bounding box in each `.txt` file):

```
<class_id> <cx> <cy> <width> <height>
```

Where all values are normalized to [0, 1] and `class_id` is:
- `0` → `fake_damage`
- `1` → `real_damage`

The `dataset/data.yaml` is already configured and should not need changes.

---

## 2. Training the Model

Run training manually from the project root:

```bash
# Default: yolov8n (nano), 50 epochs, 640px
python -m backend.damage_detector.train

# Custom options:
python -m backend.damage_detector.train \
    --base-model yolov8s.pt \
    --epochs 100 \
    --imgsz 640 \
    --batch 16 \
    --patience 20
```

### CLI Arguments

| Argument | Default | Description |
|---|---|---|
| `--base-model` | `yolov8n.pt` | Pretrained weights (nano/small/medium/large) |
| `--epochs` | `50` | Training epochs |
| `--imgsz` | `640` | Input image size (square) |
| `--batch` | `16` | Batch size (reduce if VRAM limited) |
| `--patience` | `15` | Early-stop patience epochs |
| `--run-name` | `damage_detector` | YOLO run folder sub-name |

### What happens during training

1. YOLOv8 downloads the base weights on first run (internet required once)
2. Training runs and saves checkpoints under `runs/detect/damage_detector/`
3. On completion, `best.pt` is **automatically copied** to:
   ```
   backend/damage_detector/saved_models/damage_detector_best.pt
   ```
4. The YOLO run folder is kept as a backup/history with metrics and plots

> **⚠️ Important**: Training is **never** triggered automatically. It is always an explicit, manual step.

---

## 3. Saved Model Location

The canonical model file the backend loads is:

```
backend/damage_detector/saved_models/damage_detector_best.pt
```

- **Before training**: this file does not exist — the backend starts normally but logs a warning and the `/predict` endpoint returns HTTP 503
- **After training**: restart the backend — it will load the model at startup and log a success message
- **Retraining**: re-running `train.py` overwrites this file; the YOLO run folder backup is preserved

---

## 4. Starting the Backend

```bash
# From the project root:
uvicorn backend.api.main:app --host 0.0.0.0 --port 8001 --reload
```

On startup you'll see one of:

```
# Model found:
[DamageDetector] ✅ Model loaded successfully from saved_models/damage_detector_best.pt

# Model missing (run training first):
[DamageDetector] ⚠️  Model NOT loaded — Model file not found: ...
```

---

## 5. API Contract

### `POST /api/damage-detector/predict`

Classify a damage claim image.

**Request** — multipart/form-data:

| Field | Type | Description |
|---|---|---|
| `file` | image file | JPG / PNG / WEBP / BMP, max 20 MB |

**Response 200 — OK**:

```json
{
  "prediction": "fake_damage",
  "confidence": 0.872,
  "details": {
    "total_detections": 2,
    "class_summary": {
      "fake_damage": { "count": 2, "max_confidence": 0.872 }
    },
    "detections": [
      {
        "class": "fake_damage",
        "class_id": 0,
        "confidence": 0.872,
        "bbox": { "x1": 120.5, "y1": 44.2, "x2": 390.1, "y2": 310.7, "width": 269.6, "height": 266.5 }
      }
    ],
    "model_path": "...saved_models/damage_detector_best.pt",
    "confidence_threshold": 0.25
  }
}
```

**Response 503 — Model Not Trained**:

```json
{
  "detail": "[DamageDetector] Model not ready. Train the model first by running: python -m backend.damage_detector.train"
}
```

**Response 400** — Non-image file uploaded  
**Response 413** — File exceeds 20 MB  
**Response 500** — Unexpected inference error

---

### `GET /api/damage-detector/status`

Check whether the model is loaded.

```json
{
  "module": "Damage Claim Verifier",
  "model_ready": true,
  "model_file": "damage_detector_best.pt",
  "status": "online",
  "message": "Model loaded and ready for inference."
}
```

---

## 6. Full Quickstart (ordered commands)

```bash
# 1. Install new dependencies
pip install ultralytics>=8.0.0 opencv-python>=4.8.0

# 2. Place your dataset
#    Copy images → dataset/train/images/, dataset/valid/images/
#    Copy labels → dataset/train/labels/, dataset/valid/labels/

# 3. Train the model
python -m backend.damage_detector.train --epochs 50

# 4. Start the backend (model auto-loads)
uvicorn backend.api.main:app --host 0.0.0.0 --port 8001 --reload
```
