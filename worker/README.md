# Disbunk narrative worker

Runs locally on the existing ARM64 VPS, outside website requests. No paid
embedding API is used. CPU-only PyTorch and multilingual E5 generate cached
384-dimensional embeddings; scikit-learn HDBSCAN groups claims separately by
team (including a separate unassigned scope). Claim text never goes to the
model registry: Hugging Face supplies model files only.

## Limits and behavior

- Up to 500 newest claims from the past 90 days per batch. Older claims outside
  this window/cap are not analyzed. Groups require at least five claims.
- `min_cluster_size=5`, `min_samples=3`, normalized vectors, Euclidean distance.
  These experimental defaults require newsroom evaluation, especially across
  Albanian/Serbian/English. Similarity does not prove coordination or truth.
- `query:` prefix as prescribed for symmetric clustering by E5. Token chunks
  of 440 are averaged and normalized. Claims over 4,000 tokens or empty are
  explicitly skipped and counted, rather than silently truncated.
- Content/scope/model hashes cache unchanged embeddings. Exact membership and
  content fingerprints preserve accepted/rejected decisions across reruns.
  Changed memberships are new proposals requiring another review. This first
  version does not reconcile partially overlapping groups automatically.
- A session advisory lock prevents overlapping batches. Each run has a bounded
  duration and records counts/status without claim text in logs. Interrupted
  runs are marked failed at the next start. Results publish transactionally.
- Only approved admins see suggestions and can accept/dismiss them. Accepting
  atomically creates a team-scoped campaign with all member claims and an audit
  entry. Moved/edited/deleted members invalidate acceptance. No automated verdicts,
  campaign publication or account actions.

## Installation

1. Apply `supabase/migrations/202610230002_narrative_clustering.sql` and
   `202610230003_narrative_versions.sql` once, in order.
2. The database owner runs `provision-login.sql` once and securely transfers its
   generated password to the server. The login inherits `disbunk_cluster_worker`:
   selected claim columns and analysis tables only, no account or claim edits.
3. Create `/home/disbunk2/clustering`, mode 700. Use a Python 3.12 virtual
   environment. Install CPU-only `torch==2.6.0` from
   `https://download.pytorch.org/whl/cpu`, then `requirements.txt`. `uv` can create
   a virtual environment on hosts without the OS `python3-venv` package.
4. Store `DISBUNK_WORKER_DATABASE_URL=postgresql://...` in `.env`, mode 600.
   Use the dedicated login with Supabase's **direct or session pooler** endpoint,
   not transaction pooling (the worker uses a session advisory lock).
   TLS and hostname/CA verification are required. Download the database's CA
   certificate from Supabase Database Settings into `supabase-ca.crt` beside
   `run.py`. Never commit the environment file or paste its value into chat.
5. Install the `.service` / `.timer` into the user's `~/.config/systemd/user`.
   Run `loginctl enable-linger` for persistent user services. Reload the user
   daemon; verify `CPUQuotaPerSecUSec=1s`, `MemoryMax=2147483648`, swap cap 0.
6. Run `warm_model.py` inside a capped transient systemd unit, then
   `systemctl --user start disbunk-clustering.service`. Check the first real run,
   website responses and memory before enabling `disbunk-clustering.timer`.

The user service is capped at one CPU and 2 GiB, low priority, no swap, 30 minutes.
The nightly timer runs at 03:30 UTC plus up to ten minutes jitter. It does not
catch up missed overnight runs during daytime. The model is pinned to revision
`fd1525a9fd15316a2d503bf26ab031a61d056e98`; inference must work before activation.
Production model loading is offline-only after the initial warm-up.

## Operations and rollback

`systemctl --user status disbunk-clustering.timer` shows the next run.
`journalctl --user -u disbunk-clustering.service` shows sanitized counts/errors.
`cluster_runs` provides the admin-facing run history. Full stored versions can
be captured with `uv pip freeze --python .venv/bin/python`; top-level dependencies
are pinned in requirements. Run `python -m unittest -v test_core` for grouping
tests, plus the application's narrative migration/UI tests.

Stop scheduling with `systemctl --user disable --now disbunk-clustering.timer`.
Stop an active batch with `systemctl --user stop disbunk-clustering.service`.
Existing campaigns/review decisions remain intact; no destructive rollback is
needed. Revoke the dedicated database login to disable further database access.
Nearest-neighbor suggestions, splitting/linking to existing campaigns and a
browser-triggered job queue are follow-up features, not included in this pilot.

Primary references:
- https://scikit-learn.org/stable/modules/generated/sklearn.cluster.HDBSCAN.html
- https://huggingface.co/intfloat/multilingual-e5-small
- https://www.freedesktop.org/software/systemd/man/latest/systemd.resource-control.html
