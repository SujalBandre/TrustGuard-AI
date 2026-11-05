"""
TrustGuard-AI | Full Model Evaluation Script
Generates all output plots + metrics for both:
  - NLP fake-review ensemble (LR + SGD + NB)
  - YOLOv8 damage detector

Usage:
    python evaluate_all.py
    (from the project root: e:\\Coding\\Final Project\\TrustGuard-AI)

Outputs → ./evaluation_outputs/
"""

import os
import sys
import json
import shutil
import warnings
import logging
import re
from pathlib import Path

warnings.filterwarnings("ignore")
logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)s | %(message)s")
log = logging.getLogger("evaluate_all")

# ── Paths ────────────────────────────────────────────────────────────────────
ROOT         = Path(__file__).parent
BACKEND      = ROOT / "backend"
OUTPUT_DIR   = ROOT / "evaluation_outputs"
OUTPUT_DIR.mkdir(exist_ok=True)

MODEL_PATH   = BACKEND / "models" / "lr_pipeline.joblib"
METRICS_PATH = BACKEND / "models" / "metrics.json"
DATA_DIR     = BACKEND / "data"
DATASET_1    = DATA_DIR / "fake_reviews_dataset.csv"
DATASET_2    = DATA_DIR / "final_labeled_fake_reviews.csv"

YOLO_BEST_PT    = BACKEND / "damage_detector" / "saved_models" / "damage_detector_best_v2.pt"
DATASET_YAML    = ROOT / "dataset" / "data.yaml"
RUNS_DIR        = ROOT / "runs" / "detect"
TRAIN_RUN_DIR   = RUNS_DIR / "damage_detector"  # has results.csv + pngs

# ─────────────────────────────────────────────────────────────────────────────
#  PART 0 — matplotlib / numpy / sklearn imports
# ─────────────────────────────────────────────────────────────────────────────
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.gridspec as gridspec
from matplotlib.colors import LinearSegmentedColormap
import matplotlib.patches as mpatches

# sklearn imports needed for evaluation (not training)
from sklearn.metrics import (
    confusion_matrix, ConfusionMatrixDisplay,
    roc_curve, auc, precision_recall_curve,
    accuracy_score, precision_score, recall_score,
    f1_score, roc_auc_score,
)
import joblib

STYLE = {
    "dpi": 300,
    "fig_bg": "#0f1117",
    "axes_bg": "#1a1d27",
    "text": "#e8eaf0",
    "grid": "#2e3147",
    "accent1": "#6c63ff",
    "accent2": "#ff6584",
    "accent3": "#43e97b",
    "accent4": "#f9a825",
    "cmap_fp": "RdPu",
}

def apply_dark_style(fig, ax_list=None):
    fig.patch.set_facecolor(STYLE["fig_bg"])
    if ax_list is None:
        ax_list = fig.get_axes()
    for ax in ax_list:
        ax.set_facecolor(STYLE["axes_bg"])
        ax.tick_params(colors=STYLE["text"])
        ax.xaxis.label.set_color(STYLE["text"])
        ax.yaxis.label.set_color(STYLE["text"])
        ax.title.set_color(STYLE["text"])
        for spine in ax.spines.values():
            spine.set_edgecolor(STYLE["grid"])
        ax.grid(color=STYLE["grid"], linestyle="--", linewidth=0.5, alpha=0.7)

def save_fig(fig, name):
    path = OUTPUT_DIR / name
    fig.savefig(path, dpi=STYLE["dpi"], bbox_inches="tight",
                facecolor=fig.get_facecolor())
    plt.close(fig)
    log.info(f"  ✅ Saved → {path}")
    return path


# ══════════════════════════════════════════════════════════════════════════════
#  PART 1 — NLP FAKE-REVIEW ENSEMBLE
# ══════════════════════════════════════════════════════════════════════════════

def nlp_load_data():
    """Re-load and merge the datasets exactly as train_model.py does."""
    import nltk
    for corpus in ['stopwords', 'wordnet']:
        try:
            nltk.data.find(f'corpora/{corpus}')
        except LookupError:
            nltk.download(corpus, quiet=True)

    from nltk.corpus import stopwords
    from nltk.stem import WordNetLemmatizer
    _lemmatizer = WordNetLemmatizer()
    _NEGATION_WORDS = {
        'not', 'no', 'nor', 'never', 'none', 'nobody', 'nothing',
        'neither', 'nowhere', 'hardly', 'barely', 'scarcely',
        'cannot', "can't", "won't", "don't", "didn't", "isn't",
        "wasn't", "aren't", "weren't", "hasn't", "haven't", "hadn't"
    }
    _stop_words = set(stopwords.words('english')) - _NEGATION_WORDS

    def preprocess(text):
        if not isinstance(text, str):
            return ""
        text = text.lower()
        text = re.sub(r'[^a-z\s]', ' ', text)
        tokens = text.split()
        tokens = [_lemmatizer.lemmatize(t) for t in tokens
                  if t not in _stop_words and len(t) > 1]
        return ' '.join(tokens)

    dfs = []
    if DATASET_1.exists():
        df1 = pd.read_csv(DATASET_1, encoding='utf-8', on_bad_lines='skip',
                          engine='python')
        if 'text_' in df1.columns:
            df1 = df1.rename(columns={'text_': 'text'})
        if 'text' in df1.columns and 'label' in df1.columns:
            df1['binary_label'] = df1['label'].apply(
                lambda x: 1 if str(x).strip().upper() in ['CG', 'FAKE', '1'] else 0)
            subset = df1[['text', 'binary_label']].sample(
                min(len(df1), 25000), random_state=42)
            dfs.append(subset.copy())

    if DATASET_2.exists():
        df2 = pd.read_csv(DATASET_2, encoding='utf-8', on_bad_lines='skip',
                          engine='python')
        if 'label' in df2.columns:
            df2['binary_label'] = df2['label'].apply(
                lambda x: 1 if str(x).strip().upper() in ['CG', 'FAKE', '1', 'TRUE'] else 0)
        elif 'is_fake' in df2.columns:
            df2['binary_label'] = df2['is_fake'].astype(int)
        text_col = 'text' if 'text' in df2.columns else None
        if text_col:
            subset2 = df2[[text_col, 'binary_label']].rename(
                columns={text_col: 'text'}).sample(
                min(len(df2), 25000), random_state=42)
            dfs.append(subset2.copy())

    combined = pd.concat(dfs, ignore_index=True)
    combined = combined.drop_duplicates(subset=['text'])
    combined = combined.dropna(subset=['text', 'binary_label'])
    combined['text'] = combined['text'].astype(str)
    combined['binary_label'] = combined['binary_label'].astype(int)
    combined = combined[combined['text'].str.strip() != ''].reset_index(drop=True)
    return combined, preprocess


def run_nlp_evaluation():
    log.info("=" * 70)
    log.info("PART 1 — NLP Fake-Review Ensemble Evaluation")
    log.info("=" * 70)

    # ── Load model bundle ────────────────────────────────────────────────────
    log.info(f"Loading model bundle from {MODEL_PATH}...")
    bundle = joblib.load(MODEL_PATH)
    lr          = bundle["lr"]
    sgd         = bundle["sgd"]
    nb          = bundle["nb"]
    extractor   = bundle["extractor"]
    word_tfidf_nb = bundle["word_tfidf_nb"]

    # ── Load data & reproduce test split ────────────────────────────────────
    log.info("Loading and preprocessing datasets...")
    df, preprocess = nlp_load_data()
    df['clean_text'] = df['text'].apply(preprocess)
    df = df[df['clean_text'].str.strip() != '']

    from sklearn.model_selection import train_test_split
    X_raw = df['text'].to_numpy(dtype=str)
    y     = df['binary_label'].to_numpy(dtype=int)

    X_train_raw, X_test_raw, y_train, y_test = train_test_split(
        X_raw, y, test_size=0.2, random_state=42, stratify=y)

    X_test_clean = np.array([preprocess(t) for t in X_test_raw])

    log.info(f"  Train size : {len(X_train_raw):,}")
    log.info(f"  Test size  : {len(X_test_raw):,}")
    log.info(f"  Total      : {len(df):,}")
    log.info(f"  Fake (1)   : {y.sum():,}  ({y.mean():.1%})")
    log.info(f"  Real (0)   : {(y==0).sum():,}  ({(y==0).mean():.1%})")

    # ── Generate predictions ─────────────────────────────────────────────────
    log.info("Generating predictions on test set...")
    X_test_feat = extractor.transform(X_test_raw)
    X_test_nb   = word_tfidf_nb.transform(X_test_clean)

    lr_prob  = lr.predict_proba(X_test_feat)[:, 1]
    sgd_prob = sgd.predict_proba(X_test_feat)[:, 1]
    nb_prob  = nb.predict_proba(X_test_nb)[:, 1]
    y_prob   = (4 * lr_prob + 2 * sgd_prob + 1 * nb_prob) / 7
    y_pred   = (y_prob > 0.5).astype(int)

    # ── Compute metrics ─────────────────────────────────────────────────────
    cm      = confusion_matrix(y_test, y_pred)
    acc     = accuracy_score(y_test, y_pred)
    prec    = precision_score(y_test, y_pred, zero_division=0)
    rec     = recall_score(y_test, y_pred, zero_division=0)
    f1      = f1_score(y_test, y_pred, zero_division=0)
    roc_auc = roc_auc_score(y_test, y_prob)

    tn, fp, fn, tp = cm.ravel()
    log.info(f"  Accuracy : {acc:.4f}")
    log.info(f"  Precision: {prec:.4f}")
    log.info(f"  Recall   : {rec:.4f}")
    log.info(f"  F1-Score : {f1:.4f}")
    log.info(f"  ROC-AUC  : {roc_auc:.4f}")
    log.info(f"  CM → TN={tn} FP={fp} FN={fn} TP={tp}")

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # 1a. Confusion Matrix
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    log.info("Generating nlp_confusion_matrix.png ...")
    fig, ax = plt.subplots(figsize=(7, 6))
    cmap = LinearSegmentedColormap.from_list(
        "tg", [STYLE["axes_bg"], STYLE["accent1"]], N=256)
    disp = ConfusionMatrixDisplay(confusion_matrix=cm,
                                  display_labels=["Genuine", "Fake"])
    disp.plot(ax=ax, colorbar=False, cmap=cmap, values_format="d")
    # style text
    for text in disp.text_.ravel():
        text.set_color(STYLE["text"])
        text.set_fontsize(16)
        text.set_fontweight("bold")
    ax.set_title("NLP Ensemble — Confusion Matrix\n(Test Set)", fontsize=14,
                 color=STYLE["text"], pad=14)
    ax.set_xlabel("Predicted Label", fontsize=12, color=STYLE["text"])
    ax.set_ylabel("True Label", fontsize=12, color=STYLE["text"])
    ax.tick_params(colors=STYLE["text"])
    for spine in ax.spines.values():
        spine.set_edgecolor(STYLE["grid"])
    fig.patch.set_facecolor(STYLE["fig_bg"])
    ax.set_facecolor(STYLE["axes_bg"])
    # Add annotation
    fig.text(0.5, 0.01, f"TN={tn:,}  FP={fp:,}  FN={fn:,}  TP={tp:,}",
             ha='center', fontsize=10, color=STYLE["text"])
    save_fig(fig, "nlp_confusion_matrix.png")

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # 1b. ROC Curve
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    log.info("Generating nlp_roc_curve.png ...")
    fpr, tpr, _ = roc_curve(y_test, y_prob)
    fig, ax = plt.subplots(figsize=(7, 6))
    apply_dark_style(fig, [ax])
    ax.plot(fpr, tpr, color=STYLE["accent1"], lw=2.5,
            label=f"Ensemble ROC (AUC = {roc_auc:.4f})")
    ax.plot([0, 1], [0, 1], color=STYLE["grid"], lw=1.5, linestyle="--",
            label="Random Classifier")
    ax.fill_between(fpr, tpr, alpha=0.15, color=STYLE["accent1"])
    ax.set_xlim([0.0, 1.0])
    ax.set_ylim([0.0, 1.05])
    ax.set_xlabel("False Positive Rate", fontsize=12)
    ax.set_ylabel("True Positive Rate", fontsize=12)
    ax.set_title("NLP Ensemble — ROC Curve", fontsize=14)
    legend = ax.legend(loc="lower right", fontsize=11,
                       facecolor=STYLE["axes_bg"], edgecolor=STYLE["grid"])
    for text in legend.get_texts():
        text.set_color(STYLE["text"])
    save_fig(fig, "nlp_roc_curve.png")

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # 1c. Precision-Recall Curve
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    log.info("Generating nlp_pr_curve.png ...")
    prec_curve, rec_curve, _ = precision_recall_curve(y_test, y_prob)
    pr_auc = auc(rec_curve, prec_curve)
    baseline = y_test.sum() / len(y_test)
    fig, ax = plt.subplots(figsize=(7, 6))
    apply_dark_style(fig, [ax])
    ax.plot(rec_curve, prec_curve, color=STYLE["accent2"], lw=2.5,
            label=f"PR Curve (AUC = {pr_auc:.4f})")
    ax.axhline(baseline, color=STYLE["grid"], linestyle="--", lw=1.5,
               label=f"Baseline (prevalence = {baseline:.3f})")
    ax.fill_between(rec_curve, prec_curve, alpha=0.15, color=STYLE["accent2"])
    ax.set_xlim([0.0, 1.0])
    ax.set_ylim([0.0, 1.05])
    ax.set_xlabel("Recall", fontsize=12)
    ax.set_ylabel("Precision", fontsize=12)
    ax.set_title("NLP Ensemble — Precision-Recall Curve", fontsize=14)
    legend = ax.legend(loc="upper right", fontsize=11,
                       facecolor=STYLE["axes_bg"], edgecolor=STYLE["grid"])
    for text in legend.get_texts():
        text.set_color(STYLE["text"])
    save_fig(fig, "nlp_pr_curve.png")

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # 1d. Metrics Bar Chart
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    log.info("Generating nlp_metrics_bar.png ...")
    metric_names  = ["Accuracy", "Precision", "Recall", "F1-Score", "ROC-AUC"]
    metric_values = [acc, prec, rec, f1, roc_auc]
    colors = [STYLE["accent1"], STYLE["accent2"], STYLE["accent3"],
              STYLE["accent4"], "#42a5f5"]

    fig, ax = plt.subplots(figsize=(9, 6))
    apply_dark_style(fig, [ax])
    bars = ax.bar(metric_names, metric_values, color=colors,
                  width=0.55, edgecolor=STYLE["fig_bg"], linewidth=1.5,
                  zorder=3)
    for bar, val in zip(bars, metric_values):
        ax.text(bar.get_x() + bar.get_width() / 2,
                bar.get_height() + 0.008,
                f"{val:.4f}", ha='center', va='bottom',
                fontsize=13, fontweight='bold', color=STYLE["text"])
    ax.set_ylim(0, 1.12)
    ax.set_ylabel("Score", fontsize=12)
    ax.set_title("NLP Ensemble — Performance Metrics (Test Set)", fontsize=14)
    ax.tick_params(axis='x', labelsize=12)
    save_fig(fig, "nlp_metrics_bar.png")

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # 1e. Top TF-IDF Features from Logistic Regression
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    log.info("Generating nlp_top_features.png ...")
    try:
        word_tfidf  = extractor.word_tfidf
        word_names  = np.array(word_tfidf.get_feature_names_out())
        char_names  = np.array(extractor.char_tfidf.get_feature_names_out())
        # numeric feature names
        numeric_names = np.array([
            "excl_ratio", "caps_ratio", "word_count", "lex_diversity",
            "avg_word_len", "url_count", "repeated_ratio", "allcaps_ratio"
        ])
        all_names = np.concatenate([word_names, char_names, numeric_names])

        coef = lr.coef_[0]  # shape: (n_features,)
        n = min(len(coef), len(all_names))
        coef = coef[:n]
        names_trimmed = all_names[:n]

        top20_fake_idx    = np.argsort(coef)[-20:][::-1]
        top20_genuine_idx = np.argsort(coef)[:20]

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(16, 8))
        apply_dark_style(fig, [ax1, ax2])

        # Top 20 → FAKE
        top_fake_names  = names_trimmed[top20_fake_idx]
        top_fake_coefs  = coef[top20_fake_idx]
        ax1.barh(range(20), top_fake_coefs[::-1], color=STYLE["accent2"],
                 alpha=0.85, edgecolor=STYLE["fig_bg"])
        ax1.set_yticks(range(20))
        ax1.set_yticklabels([f'"{n}"' for n in top_fake_names[::-1]],
                            fontsize=9, color=STYLE["text"])
        ax1.set_xlabel("LR Coefficient (→ Fake)", fontsize=11)
        ax1.set_title("Top 20 Words → FAKE", fontsize=13,
                      color=STYLE["accent2"])
        ax1.invert_yaxis()

        # Top 20 → GENUINE
        top_gen_names = names_trimmed[top20_genuine_idx]
        top_gen_coefs = coef[top20_genuine_idx]
        ax2.barh(range(20), np.abs(top_gen_coefs[::-1]), color=STYLE["accent3"],
                 alpha=0.85, edgecolor=STYLE["fig_bg"])
        ax2.set_yticks(range(20))
        ax2.set_yticklabels([f'"{n}"' for n in top_gen_names[::-1]],
                            fontsize=9, color=STYLE["text"])
        ax2.set_xlabel("|LR Coefficient| (→ Genuine)", fontsize=11)
        ax2.set_title("Top 20 Words → GENUINE", fontsize=13,
                      color=STYLE["accent3"])
        ax2.invert_yaxis()

        fig.suptitle("Logistic Regression — Top TF-IDF Feature Weights",
                     fontsize=15, color=STYLE["text"], y=1.01)
        plt.tight_layout()
        save_fig(fig, "nlp_top_features.png")
    except Exception as e:
        log.warning(f"  ⚠ Feature importance plot skipped: {e}")

    # ── Save metrics.json ────────────────────────────────────────────────────
    nlp_metrics = {
        "accuracy":         round(float(acc),  4),
        "precision":        round(float(prec), 4),
        "recall":           round(float(rec),  4),
        "f1":               round(float(f1),   4),
        "roc_auc":          round(float(roc_auc), 4),
        "pr_auc":           round(float(pr_auc),  4),
        "confusion_matrix": {
            "TN": int(tn), "FP": int(fp),
            "FN": int(fn), "TP": int(tp),
            "raw": cm.tolist(),
        },
        "train_size":    int(len(X_train_raw)),
        "test_size":     int(len(X_test_raw)),
        "total_samples": int(len(df)),
        "fake_count":    int(y.sum()),
        "real_count":    int((y == 0).sum()),
        "fake_pct":      round(float(y.mean() * 100), 2),
        "model_type":    "HybridEnsemble (LR 4x + SGD 2x + NB 1x) + WordTFIDF + CharTFIDF + NumericFeatures",
    }

    # update the backend metrics.json too
    with open(METRICS_PATH, 'w') as f:
        json.dump(nlp_metrics, f, indent=2)
    log.info(f"  ✅ Updated {METRICS_PATH}")

    log.info("PART 1 — NLP Evaluation COMPLETE")
    return nlp_metrics


# ══════════════════════════════════════════════════════════════════════════════
#  PART 2 — YOLOv8 DAMAGE DETECTOR
# ══════════════════════════════════════════════════════════════════════════════

def run_yolo_evaluation():
    log.info("=" * 70)
    log.info("PART 2 — YOLOv8 Damage Detector Evaluation")
    log.info("=" * 70)

    from ultralytics import YOLO
    import cv2

    CLASS_NAMES = ["fake_damage", "real_damage"]

    # ── Load model ─────────────────────────────────────────────────────────
    log.info(f"Loading YOLO model from {YOLO_BEST_PT}...")
    model = YOLO(str(YOLO_BEST_PT))

    # ── Run validation on test split ────────────────────────────────────────
    val_save_dir = ROOT / "evaluation_outputs" / "yolo_val_run"
    log.info("Running model.val() on test split — this may take a few minutes...")
    results = model.val(
        data=str(DATASET_YAML),
        split="test",
        imgsz=640,
        batch=8,
        conf=0.25,
        iou=0.5,
        device="cpu",
        project=str(val_save_dir.parent),
        name=val_save_dir.name,
        exist_ok=True,
        save_json=False,
        plots=True,
        verbose=True,
    )

    log.info("Validation complete. Collecting metrics...")

    # Extract metrics from results object
    try:
        mp   = float(results.box.mp)
        mr   = float(results.box.mr)
        map50    = float(results.box.map50)
        map5095  = float(results.box.map)
        # per-class
        ap_per   = results.box.ap_class_index
        maps     = results.box.maps      # per-class map50-95
        ap50_arr = results.box.ap50      # per-class ap50
        p_arr    = results.box.p
        r_arr    = results.box.r

        log.info(f"  Overall mAP50    : {map50:.4f}")
        log.info(f"  Overall mAP50-95 : {map5095:.4f}")
        log.info(f"  Mean Precision   : {mp:.4f}")
        log.info(f"  Mean Recall      : {mr:.4f}")

        yolo_metrics_per_class = {}
        for i, cls_idx in enumerate(ap_per):
            name = CLASS_NAMES[cls_idx] if cls_idx < len(CLASS_NAMES) else str(cls_idx)
            f1_cls = (2 * p_arr[i] * r_arr[i]) / max(p_arr[i] + r_arr[i], 1e-9)
            yolo_metrics_per_class[name] = {
                "precision": round(float(p_arr[i]), 4),
                "recall":    round(float(r_arr[i]), 4),
                "f1":        round(float(f1_cls), 4),
                "ap50":      round(float(ap50_arr[i]), 4),
                "map5095":   round(float(maps[i]), 4),
            }
            log.info(f"  [{name}] P={p_arr[i]:.4f} R={r_arr[i]:.4f} F1={f1_cls:.4f} "
                     f"AP50={ap50_arr[i]:.4f} mAP50-95={maps[i]:.4f}")

        mean_f1 = (2 * mp * mr) / max(mp + mr, 1e-9)
        yolo_metrics = {
            "overall": {
                "mAP50":       round(map50,   4),
                "mAP50_95":    round(map5095, 4),
                "precision":   round(mp,      4),
                "recall":      round(mr,      4),
                "f1":          round(float(mean_f1), 4),
            },
            "per_class": yolo_metrics_per_class,
        }
    except Exception as e:
        log.warning(f"  ⚠ Could not extract structured metrics: {e}")
        yolo_metrics = {"error": str(e)}

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # 2a-2d: Copy YOLO's built-in plots
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    copy_map = {
        "confusion_matrix.png":            "yolo_confusion_matrix.png",
        "BoxPR_curve.png":                 "yolo_pr_curve.png",
        "BoxF1_curve.png":                 "yolo_f1_curve.png",
        "PR_curve.png":                    "yolo_pr_curve.png",
        "F1_curve.png":                    "yolo_f1_curve.png",
    }

    for src_name, dst_name in copy_map.items():
        src = val_save_dir / src_name
        if src.exists():
            shutil.copy2(src, OUTPUT_DIR / dst_name)
            log.info(f"  ✅ Copied {src_name} → {dst_name}")

    # 2d: Training loss/mAP curves from the original training run
    log.info("Looking for training results.png ...")
    training_curve_src = None
    for run_candidate in [TRAIN_RUN_DIR,
                           RUNS_DIR / "damage_detector_v2",
                           RUNS_DIR / "damage_detector_v3",
                           RUNS_DIR / "damage_detector_v4"]:
        candidate = run_candidate / "results.png"
        if candidate.exists():
            training_curve_src = candidate
            log.info(f"  Found training curves: {candidate}")
            break

    if training_curve_src:
        shutil.copy2(training_curve_src, OUTPUT_DIR / "yolo_training_curves.png")
        log.info(f"  ✅ Copied results.png → yolo_training_curves.png")
    else:
        log.warning("  ⚠ No training results.png found in any run directory")
        # Try to generate from results.csv
        results_csv = None
        for run_candidate in [TRAIN_RUN_DIR,
                               RUNS_DIR / "damage_detector_v2",
                               RUNS_DIR / "damage_detector_v3",
                               RUNS_DIR / "damage_detector_v4"]:
            candidate = run_candidate / "results.csv"
            if candidate.exists():
                results_csv = candidate
                break
        if results_csv:
            _generate_training_curves_from_csv(results_csv)

    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    # 2e: Sample predictions grid
    # ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    log.info("Generating yolo_sample_predictions.png ...")
    _generate_sample_predictions_grid(model, CLASS_NAMES)

    log.info("PART 2 — YOLO Evaluation COMPLETE")
    return yolo_metrics


def _generate_training_curves_from_csv(results_csv: Path):
    """Re-generate training loss/mAP curves from results.csv."""
    log.info(f"  Generating training curves from {results_csv} ...")
    try:
        df = pd.read_csv(results_csv)
        df.columns = [c.strip() for c in df.columns]

        fig, axes = plt.subplots(2, 3, figsize=(18, 10))
        apply_dark_style(fig, axes.ravel())

        # Try different column name patterns
        col_map = {}
        for col in df.columns:
            cl = col.lower().strip()
            col_map[cl] = col

        epochs = df.iloc[:, 0] if df.shape[1] > 0 else range(len(df))

        plot_pairs = [
            ("train/box_loss",      axes[0, 0], "Train Box Loss",     STYLE["accent2"]),
            ("train/cls_loss",      axes[0, 1], "Train Class Loss",   STYLE["accent4"]),
            ("train/dfl_loss",      axes[0, 2], "Train DFL Loss",     "#42a5f5"),
            ("metrics/mAP50(B)",    axes[1, 0], "Val mAP@0.5",        STYLE["accent1"]),
            ("metrics/mAP50-95(B)", axes[1, 1], "Val mAP@0.5:0.95",   STYLE["accent3"]),
            ("metrics/precision(B)",axes[1, 2], "Val Precision",      "#f48fb1"),
        ]

        for col_key, ax, title, color in plot_pairs:
            matched = None
            for c in df.columns:
                if col_key.lower().replace(" ", "") in c.lower().replace(" ", ""):
                    matched = c
                    break
            if matched:
                ax.plot(df[matched].values, color=color, lw=2, label=title)
                ax.set_title(title, fontsize=12)
                ax.set_xlabel("Epoch", fontsize=10)
                legend = ax.legend(fontsize=9, facecolor=STYLE["axes_bg"],
                                   edgecolor=STYLE["grid"])
                for t in legend.get_texts():
                    t.set_color(STYLE["text"])
            else:
                ax.text(0.5, 0.5, f"Column\n'{col_key}'\nnot found",
                        ha='center', va='center', transform=ax.transAxes,
                        color=STYLE["text"], fontsize=10)
                ax.set_title(title, fontsize=12)

        fig.suptitle("YOLOv8 Training Curves (Reconstructed from results.csv)",
                     fontsize=15, color=STYLE["text"], y=1.01)
        plt.tight_layout()
        save_fig(fig, "yolo_training_curves.png")
    except Exception as e:
        log.warning(f"  ⚠ Could not generate training curves: {e}")


def _generate_sample_predictions_grid(model, class_names):
    """Use YOLO's already-saved val_batch prediction images to build the grid.
    
    Falls back to loading the val_batch_pred.jpg images directly from
    the yolo_val_run directory — which were saved by model.val() — so we
    don't need to call model.predict() at all (which has a CUDA device bug).
    """
    import cv2

    # First preference: val_batch prediction images from the fresh val run
    val_dir = OUTPUT_DIR / "yolo_val_run"
    pred_images = sorted(val_dir.glob("val_batch*_pred.jpg"))

    if pred_images:
        log.info(f"  Using {len(pred_images)} val_batch prediction images from YOLO val run")
        n = min(len(pred_images), 3)  # typically 3 batches
        fig, axes = plt.subplots(1, n, figsize=(n * 8, 8))
        if n == 1:
            axes = [axes]
        apply_dark_style(fig, axes)

        for i, pred_img_path in enumerate(pred_images[:n]):
            img_bgr = cv2.imread(str(pred_img_path))
            if img_bgr is None:
                axes[i].axis("off")
                continue
            img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
            axes[i].imshow(img_rgb)
            axes[i].set_title(f"Validation Batch {i} — Predictions\n(YOLO val output)",
                              fontsize=10, color=STYLE["text"], pad=5)
            axes[i].axis("off")

        # legend
        legend_patches = [
            mpatches.Patch(color=(1.0, 0.39, 0.39), label="fake_damage"),
            mpatches.Patch(color=(0.39, 1.0, 0.59), label="real_damage"),
        ]
        fig.legend(handles=legend_patches, loc="lower center", ncol=2,
                   fontsize=13, facecolor=STYLE["axes_bg"],
                   edgecolor=STYLE["grid"],
                   labelcolor=STYLE["text"],
                   bbox_to_anchor=(0.5, -0.04))

        fig.suptitle("YOLOv8 Damage Detector — Sample Validation Predictions\n"
                     "(val_batch images with bounding boxes drawn by YOLO)",
                     fontsize=14, color=STYLE["text"], y=1.02)
        plt.tight_layout()
        save_fig(fig, "yolo_sample_predictions.png")
        return

    # Fallback: raw test images with bounding boxes drawn via torch directly
    log.info("  No val_batch images found — trying test images with direct torch inference")
    test_img_dir = ROOT / "dataset" / "test" / "images"
    img_files = sorted(list(test_img_dir.glob("*.jpg")) +
                       list(test_img_dir.glob("*.png")))

    # sample 8 images spread across the list
    if len(img_files) > 8:
        step = len(img_files) // 8
        img_files = img_files[::step][:8]
    else:
        img_files = img_files[:8]

    if not img_files:
        log.warning("  ⚠ No test images found for sample predictions grid")
        return

    CLASS_COLORS = {
        0: (255, 100, 100),   # fake_damage — red-ish
        1: (100, 255, 150),   # real_damage — green-ish
    }

    n = len(img_files)
    cols = 4
    rows = (n + cols - 1) // cols
    fig, axes = plt.subplots(rows, cols, figsize=(cols * 4, rows * 4))
    apply_dark_style(fig, np.array(axes).ravel())

    for idx, img_path in enumerate(img_files):
        r, c = divmod(idx, cols)
        ax = axes[r][c] if rows > 1 else (axes[c] if cols > 1 else axes)

        # run inference on CPU explicitly
        try:
            preds = model.predict(str(img_path), conf=0.25, iou=0.5,
                                  device='cpu', verbose=False)
        except Exception as pred_err:
            log.warning(f"  ⚠ predict failed for {img_path.name}: {pred_err}")
            ax.axis("off")
            continue
        img_bgr = cv2.imread(str(img_path))
        if img_bgr is None:
            ax.axis("off")
            continue
        img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
        h, w = img_rgb.shape[:2]

        # draw bounding boxes
        result = preds[0]
        if result.boxes is not None and len(result.boxes) > 0:
            boxes = result.boxes.xyxy.cpu().numpy().astype(int)
            confs = result.boxes.conf.cpu().numpy()
            clss  = result.boxes.cls.cpu().numpy().astype(int)
            for box, conf, cls_id in zip(boxes, confs, clss):
                x1, y1, x2, y2 = box
                color_bgr = CLASS_COLORS.get(cls_id, (200, 200, 200))
                color_rgb = (color_bgr[2], color_bgr[1], color_bgr[0])
                cv2.rectangle(img_rgb, (x1, y1), (x2, y2), color_rgb, 3)
                label = f"{class_names[cls_id]} {conf:.2f}"
                cv2.putText(img_rgb, label, (x1, max(y1 - 8, 12)),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.55, color_rgb, 2)

        ax.imshow(img_rgb)
        n_det = len(result.boxes) if result.boxes is not None else 0
        ax.set_title(f"{img_path.stem[:20]}\n({n_det} det.)",
                     fontsize=7, color=STYLE["text"], pad=3)
        ax.axis("off")

    # turn off unused axes
    total_axes = rows * cols
    for idx in range(n, total_axes):
        r, c = divmod(idx, cols)
        ax = axes[r][c] if rows > 1 else (axes[c] if cols > 1 else axes)
        ax.axis("off")

    # legend
    legend_patches = [
        mpatches.Patch(color=(1.0, 0.39, 0.39), label="fake_damage"),
        mpatches.Patch(color=(0.39, 1.0, 0.59), label="real_damage"),
    ]
    fig.legend(handles=legend_patches, loc="lower center", ncol=2,
               fontsize=12, facecolor=STYLE["axes_bg"],
               edgecolor=STYLE["grid"],
               labelcolor=STYLE["text"],
               bbox_to_anchor=(0.5, -0.02))

    fig.suptitle("YOLOv8 Damage Detector — Sample Test Predictions",
                 fontsize=15, color=STYLE["text"], y=1.01)
    plt.tight_layout()
    save_fig(fig, "yolo_sample_predictions.png")


# ══════════════════════════════════════════════════════════════════════════════
#  MAIN
# ══════════════════════════════════════════════════════════════════════════════

def main():
    log.info("╔══════════════════════════════════════════════════════════╗")
    log.info("║        TrustGuard-AI  Full Model Evaluation Run         ║")
    log.info("╚══════════════════════════════════════════════════════════╝")
    log.info(f"Output directory: {OUTPUT_DIR}")

    # ── PART 1 ───────────────────────────────────────────────────────────────
    nlp_metrics = run_nlp_evaluation()

    # ── PART 2 ───────────────────────────────────────────────────────────────
    yolo_metrics = run_yolo_evaluation()

    # ── Save combined summary ────────────────────────────────────────────────
    summary = {
        "nlp_fake_review_ensemble": nlp_metrics,
        "yolo_damage_detector": yolo_metrics,
    }
    summary_path = OUTPUT_DIR / "all_metrics_summary.json"
    with open(summary_path, 'w') as f:
        json.dump(summary, f, indent=2)
    log.info(f"✅ Saved combined summary → {summary_path}")

    # ── Print file manifest ──────────────────────────────────────────────────
    log.info("")
    log.info("=" * 70)
    log.info("  GENERATED FILES")
    log.info("=" * 70)
    generated = sorted(OUTPUT_DIR.rglob("*"))
    for p in generated:
        if p.is_file():
            size_kb = p.stat().st_size / 1024
            log.info(f"  📄 {p}  [{size_kb:.1f} KB]")

    log.info("")
    log.info("✅  All evaluation artifacts saved to:")
    log.info(f"   {OUTPUT_DIR.resolve()}")
    log.info("")


if __name__ == "__main__":
    # Ensure the project root is on PYTHONPATH so backend.engine imports work
    sys.path.insert(0, str(ROOT))
    main()
