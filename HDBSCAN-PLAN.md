# Practical HDBSCAN integration for Disbunk

The first bounded server-worker implementation is now in `worker/`; see
`worker/README.md` for operation, limits and rollback. This document retains the
broader design and evaluation goals. Nearest-neighbor retrieval, partial-overlap
reconciliation and split/link review are future work, not implemented features.

## Recommended first version

Use a small scheduled Python worker alongside Supabase. Generate multilingual
embeddings for claim titles/descriptions, store them with pgvector, and run
scikit-learn HDBSCAN periodically. Display proposed narrative groups to admins
for review before creating or changing campaigns. Keep this work out of browser
page loads and Supabase request handlers.

The existing VPS may host the worker if CPU/RAM allow; check capacity before
installing a model beside the website. Otherwise use a separate worker. A local
model avoids sending investigation text to a separate embedding API provider.

1. Pilot `intfloat/multilingual-e5-small`, whose model card includes Albanian,
   Serbian and English. Pin a model revision. Its listed language support is not
   a guarantee of regional accuracy: evaluate actual newsroom examples.
2. Embed a normalized title and description, keeping the original text intact.
   Follow the model's task-prefix instructions; use consistent encoding for
   clustering rather than mixing query/document conventions. Cache by content
   hash, model version and preprocessing version. Regenerate only on changes.
   Handle long descriptions explicitly rather than silently losing key passages.
3. Store vectors in an access-controlled table keyed to claim ID. Supabase already
   supports pgvector; check its production installation and the chosen model's
   dimension before migrating. Never compare vectors from different models.
4. First deliver nearest-neighbor suggestions. This helps even when only two
   related claims exist and gives reviewers a useful baseline for clustering.
5. Cluster a bounded recent window, initially 90 days, separately for each access
   scope/team. L2-normalized vectors with Euclidean distance are a reasonable
   baseline. Experiment with `min_cluster_size=5` and `min_samples=3`; these are
   starting parameters, not validated production settings. Evaluate whether PCA
   improves high-dimensional clustering before adding UMAP or more infrastructure.
6. Start with an admin-triggered batch, then consider nightly runs after measuring
   duration and costs. Run in Python, not the React client or a page request.
   Cap batch size, use a job lock, and make retries idempotent.
7. Save run metadata, group memberships and membership strengths. Unclustered
   claims remain ungrouped. A membership strength is not a truth probability or
   proof of coordination. Do not force every claim into a campaign.
8. Show sample claims, shared topics, dates and source links. Admins accept,
   reject, split or link suggestions to an existing campaign. Preserve decisions
   across runs: numeric cluster labels are not stable identifiers. Start with
   claim-set overlap for reconciliation and keep a reviewed campaign independent
   of subsequent algorithm labels.

## Minimal storage

- `claim_embeddings`: claim ID, model/dimension/version, source hash, vector,
  access scope, generated time.
- `cluster_runs`: scope, time window, model, preprocessing, parameters, status,
  start/finish time and counts. Do not log private text.
- `narrative_suggestions` and `narrative_suggestion_claims`: persistent suggestion
  IDs, run ID, claim IDs, membership strengths and review status.
- Review audit: reviewer, decision, timestamp, resulting campaign ID. Accepting
  a suggestion is an authenticated, authorized database transaction.

Restrict settings and suggestion review to approved admins initially. The worker
must not make claims visible outside their existing permissions. Keep server
credentials out of browser bundles and logs; use scoped worker access where
practical. Redact or exclude sensitive content before any external API processing.

## Acceptance criteria

Use a small hand-reviewed Albanian/Serbian/English dataset with known related and
unrelated narratives, paraphrases, recurring topics and near-duplicates. Compare
against the existing word-overlap baseline and nearest-neighbor retrieval.
Measure reviewed-group usefulness, false grouping rate, unclustered proportion,
cross-language performance, runtime and update cost. Include bilingual reviewers.
Do not deploy a fixed similarity threshold copied from another model.

HDBSCAN groups similar material; it does not detect deliberate deception or
establish coordinated behavior. Keep fact-check verdicts and C5 intent analysis
with human reviewers. No automatic public posting or account sanctions.

Primary documentation:
- [HDBSCAN in scikit-learn](https://scikit-learn.org/stable/modules/generated/sklearn.cluster.HDBSCAN.html)
- [Supabase semantic search](https://supabase.com/docs/guides/ai/semantic-search)
- [Multilingual E5 small model card](https://huggingface.co/intfloat/multilingual-e5-small)
