"""
TrustGuard-AI | HybridFeatureExtractor
Defined as an importable module so joblib can pickle/unpickle correctly
when the class is used from both train_model.py and detection.py.

IMPORTANT: This must remain importable as backend.engine.feature_extractor
so that joblib deserialization works in both train and inference contexts.
"""
import re
import numpy as np
from scipy.sparse import hstack, csr_matrix
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import MaxAbsScaler


def extract_numeric_features(texts):
    """
    Returns a (n_samples, 8) dense array of handcrafted features:
    exclamation_count, caps_ratio, word_count, lexical_diversity,
    avg_word_len, url_count, repeated_word_ratio, all_caps_word_count
    """
    features = []
    for text in texts:
        if not isinstance(text, str) or not text.strip():
            features.append([0.0] * 8)
            continue

        words = text.split()
        word_count = max(len(words), 1)
        excl_count = text.count('!')
        caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
        unique_words = len(set(w.lower() for w in words))
        lex_diversity = unique_words / word_count
        avg_word_len = sum(len(w) for w in words) / word_count
        url_count = len(re.findall(r'http[s]?://', text))
        word_counts = {}
        for w in words:
            wl = w.lower()
            word_counts[wl] = word_counts.get(wl, 0) + 1
        repeated_ratio = sum(1 for c in word_counts.values() if c > 1) / word_count
        all_caps_count = sum(1 for w in words if w.isupper() and len(w) > 1) / word_count

        features.append([
            min(excl_count / word_count, 1.0),
            caps_ratio,
            min(word_count / 200, 1.0),
            lex_diversity,
            min(avg_word_len / 15, 1.0),
            min(url_count, 3) / 3,
            repeated_ratio,
            all_caps_count,
        ])
    return np.array(features, dtype=np.float32)


class HybridFeatureExtractor:
    """
    Combines:
      1. Word TF-IDF (unigrams + trigrams)
      2. Character TF-IDF (2-4 char n-grams for typo/spam detection)
      3. Handcrafted numeric features

    Defined here (not in train_model.py) so that joblib pickle/unpickle
    always resolves the class as backend.engine.feature_extractor.HybridFeatureExtractor.
    """
    def __init__(self, max_word_features=15000, max_char_features=8000):
        self.word_tfidf = TfidfVectorizer(
            max_features=max_word_features,
            ngram_range=(1, 3),
            sublinear_tf=True,
            min_df=2,
            strip_accents='unicode',
            analyzer='word',
        )
        self.char_tfidf = TfidfVectorizer(
            max_features=max_char_features,
            ngram_range=(2, 4),
            sublinear_tf=True,
            min_df=3,
            strip_accents='unicode',
            analyzer='char_wb',
        )
        self.scaler = MaxAbsScaler()
        self._fitted = False

    def fit(self, texts, y=None):
        self.word_tfidf.fit(texts)
        self.char_tfidf.fit(texts)
        numeric = extract_numeric_features(texts)
        self.scaler.fit(numeric)
        self._fitted = True
        return self

    def transform(self, texts):
        word_mat = self.word_tfidf.transform(texts)
        char_mat = self.char_tfidf.transform(texts)
        numeric  = csr_matrix(self.scaler.transform(extract_numeric_features(texts)))
        return hstack([word_mat, char_mat, numeric])

    def fit_transform(self, texts, y=None):
        self.fit(texts)
        return self.transform(texts)
