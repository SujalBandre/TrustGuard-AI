"""
Label Quality Spot-Check Script
================================
Picks 15 random fake_damage and 15 random real_damage images from train/,
overlays their YOLO bounding boxes, and saves annotated images to a review folder.

YOLO label format (per line in .txt): class_id x_center y_center width height
All values normalized 0.0–1.0.
"""

import random
import sys
from pathlib import Path

try:
    import cv2
    import numpy as np
except ImportError:
    sys.exit("OpenCV not found. Run: pip install opencv-python")

# ── Paths ────────────────────────────────────────────────────────────────────
SCRIPT_DIR   = Path(__file__).parent.resolve()
PROJECT_ROOT = SCRIPT_DIR.parent.parent.parent          # TrustGuard-AI/
TRAIN_IMAGES = PROJECT_ROOT / "dataset" / "train" / "images"
TRAIN_LABELS = PROJECT_ROOT / "dataset" / "train" / "labels"
OUT_DIR      = PROJECT_ROOT / "label_check"

CLASS_NAMES  = {0: "fake_damage", 1: "real_damage"}
CLASS_COLORS = {0: (0, 80, 255),   # blue-ish for fake
                1: (0, 200, 60)}   # green for real
SAMPLES_PER_CLASS = 15

SEED = 42
random.seed(SEED)


def draw_boxes(img_path: Path, label_path: Path, out_path: Path):
    """Draw all YOLO boxes from label_path onto img_path and save to out_path."""
    img = cv2.imread(str(img_path))
    if img is None:
        print(f"  [WARN] Cannot read image: {img_path.name}")
        return

    h, w = img.shape[:2]

    if not label_path.exists():
        print(f"  [WARN] No label file for: {img_path.name}")
        # Still save the image so the absence of boxes is visible
        cv2.imwrite(str(out_path), img)
        return

    with open(label_path) as f:
        lines = [l.strip() for l in f if l.strip()]

    if not lines:
        print(f"  [WARN] Empty label file: {label_path.name}")
        cv2.imwrite(str(out_path), img)
        return

    for line in lines:
        parts = line.split()
        if len(parts) != 5:
            continue
        cls_id, xc, yc, bw, bh = int(parts[0]), float(parts[1]), float(parts[2]), float(parts[3]), float(parts[4])

        # Convert normalized → pixel coordinates
        x1 = int((xc - bw / 2) * w)
        y1 = int((yc - bh / 2) * h)
        x2 = int((xc + bw / 2) * w)
        y2 = int((yc + bh / 2) * h)

        color = CLASS_COLORS.get(cls_id, (128, 128, 128))
        label = CLASS_NAMES.get(cls_id, f"cls{cls_id}")

        # Draw box
        cv2.rectangle(img, (x1, y1), (x2, y2), color, 2)

        # Draw label background + text
        (tw, th), baseline = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.55, 1)
        tag_y1 = max(y1 - th - baseline - 4, 0)
        cv2.rectangle(img, (x1, tag_y1), (x1 + tw + 4, y1), color, -1)
        cv2.putText(img, label, (x1 + 2, y1 - baseline - 2),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 1, cv2.LINE_AA)

    cv2.imwrite(str(out_path), img)


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    # ── Gather images by class (by filename prefix) ──────────────────────────
    all_images = [p for p in TRAIN_IMAGES.glob("*.jpg") if p.name != ".gitkeep"]
    all_images += [p for p in TRAIN_IMAGES.glob("*.png") if p.name != ".gitkeep"]

    fake_imgs = [p for p in all_images if "fake_damage" in p.name.lower()]
    real_imgs = [p for p in all_images if p not in fake_imgs and "no_damage" not in p.name.lower()]

    print(f"Found {len(fake_imgs)} fake_damage candidates, {len(real_imgs)} real_damage candidates in train/")

    # Fallback: if real_damage candidates are few, also try by checking label files
    if len(real_imgs) < SAMPLES_PER_CLASS:
        print("  Falling back to label-file scan for real_damage images...")
        real_imgs = []
        for img in all_images:
            label_path = TRAIN_LABELS / (img.stem + ".txt")
            if label_path.exists():
                with open(label_path) as f:
                    ids = [int(l.split()[0]) for l in f if l.strip() and len(l.split()) == 5]
                if 1 in ids and 0 not in ids:  # only real_damage labels
                    real_imgs.append(img)
        print(f"  Found {len(real_imgs)} real_damage-only images via label scan")

    # Sample
    fake_sample = random.sample(fake_imgs, min(SAMPLES_PER_CLASS, len(fake_imgs)))
    real_sample = random.sample(real_imgs, min(SAMPLES_PER_CLASS, len(real_imgs)))

    print(f"\nProcessing {len(fake_sample)} fake_damage + {len(real_sample)} real_damage images...")

    # ── Process fake_damage ───────────────────────────────────────────────────
    fake_out = OUT_DIR / "fake_damage"
    fake_out.mkdir(exist_ok=True)
    for img_path in fake_sample:
        label_path = TRAIN_LABELS / (img_path.stem + ".txt")
        out_path   = fake_out / img_path.name
        draw_boxes(img_path, label_path, out_path)
        print(f"  [fake] {img_path.name}")

    # ── Process real_damage ───────────────────────────────────────────────────
    real_out = OUT_DIR / "real_damage"
    real_out.mkdir(exist_ok=True)
    for img_path in real_sample:
        label_path = TRAIN_LABELS / (img_path.stem + ".txt")
        out_path   = real_out / img_path.name
        draw_boxes(img_path, label_path, out_path)
        print(f"  [real] {img_path.name}")

    total = len(list(fake_out.glob("*.jpg"))) + len(list(real_out.glob("*.jpg")))
    print(f"\n✅ Done! {total} annotated images saved to:")
    print(f"   fake_damage → {fake_out}")
    print(f"   real_damage → {real_out}")


if __name__ == "__main__":
    main()
