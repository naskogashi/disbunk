"""Pure grouping helpers; no credentials or model downloads at import time."""
import hashlib
import json
import re
import numpy as np
from sklearn.cluster import HDBSCAN

MODEL = 'intfloat/multilingual-e5-small'
REVISION = 'fd1525a9fd15316a2d503bf26ab031a61d056e98'
MODEL_KEY = f'{MODEL}@{REVISION}:query:chunks-v1'


def claim_text(claim):
    return re.sub(r'\s+', ' ', f"{claim['title'] or ''}\n{claim.get('description') or ''}").strip()


def source_hash(claim):
    # Include scope so moved claims cannot reuse a reviewed suggestion silently.
    text = json.dumps([str(claim.get('team_id')), claim_text(claim), MODEL_KEY], ensure_ascii=False)
    return hashlib.sha256(text.encode()).hexdigest()


def fingerprint(claims):
    members = sorted((str(c['id']), source_hash(c)) for c in claims)
    return hashlib.sha256(json.dumps(members).encode()).hexdigest()


def group_vectors(vectors):
    if len(vectors) < 5:
        return np.full(len(vectors), -1), np.zeros(len(vectors))
    values = np.asarray(vectors, dtype=np.float32)
    if not np.isfinite(values).all():
        raise ValueError('Non-finite embedding')
    norms = np.linalg.norm(values, axis=1, keepdims=True)
    if (norms == 0).any():
        raise ValueError('Zero embedding')
    estimator = HDBSCAN(min_cluster_size=5, min_samples=3, metric='euclidean', n_jobs=1)
    estimator.fit(values / norms)
    return estimator.labels_, estimator.probabilities_


def embed_claim(model, claim):
    # Chunk by model tokens, retaining all content up to the explicit 4k-token cap.
    tokens = model.tokenizer.encode(claim_text(claim), add_special_tokens=False, truncation=False, verbose=False)
    if len(tokens) > 4000:
        return None  # Never silently truncate investigation content.
    chunks = ['query: ' + model.tokenizer.decode(tokens[i:i+440]) for i in range(0, len(tokens), 440)]
    if not chunks:
        return None
    embeddings = model.encode(chunks, batch_size=4, normalize_embeddings=True, show_progress_bar=False)
    vector = np.mean(embeddings, axis=0)
    norm = np.linalg.norm(vector)
    return (vector / norm).tolist() if norm > 0 else None
